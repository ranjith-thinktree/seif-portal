/**
 * Unit Tests: ScheduleNotificationModal Component
 *
 * Critical regression test for "Maximum update depth exceeded" infinite loop
 * in Radix Dialog + PackageSelector interaction.
 *
 * Scenario:  Bell icon → type selector → Schedule modal → click "Deselect All"
 * Bug:       inline onSelectionChange arrow function → new ref every render →
 *            N Radix Checkboxes simultaneously update → react-remove-scroll
 *            setRef loop → app crash.
 * Fix:       useCallback with empty deps (stable ref) + React.memo on PackageSelector.
 */

import React from "react";
import { render, screen, waitFor, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, test, expect, vi, beforeEach } from "vitest";
import ScheduleNotificationModal from "../../components/refurbishment/modals/ScheduleNotificationModal";

// ─── Mocks ────────────────────────────────────────────────────────────────────
//
// ALL @/components/ui/* are Radix-based. In jsdom + React 19 they trigger an
// infinite loop via useComposedRefs + getElementRef(child).props.ref cycling
// (known @radix-ui/react-presence v1.1.5 + React 19 incompatibility).
// We replace them all with plain HTML so we test OUR logic, not Radix internals.

vi.mock("@/components/ui/dialog", async () => {
  const { default: R } = await import("react");
  const slot =
    (tag, tid) =>
    ({ children, className }) =>
      R.createElement(tag, { "data-testid": tid, className }, children);
  return {
    Dialog: ({ open, children }) =>
      open
        ? R.createElement(
            "div",
            { role: "dialog", "data-state": "open" },
            children,
          )
        : null,
    DialogContent: slot("div", "dialog-content"),
    DialogHeader: slot("div", "dialog-header"),
    DialogTitle: slot("h2", "dialog-title"),
    DialogDescription: slot("p", "dialog-description"),
    DialogFooter: slot("div", "dialog-footer"),
  };
});

vi.mock("@/components/ui/button", async () => {
  const { default: R } = await import("react");
  return {
    Button: ({
      children,
      onClick,
      type,
      disabled,
      className,
      variant,
      size,
      asChild,
      ...rest
    }) =>
      R.createElement(
        "button",
        { onClick, type: type || "button", disabled, className, ...rest },
        children,
      ),
  };
});

vi.mock("@/components/ui/input", async () => {
  const { default: R } = await import("react");
  return {
    Input: (props) => R.createElement("input", props),
  };
});

vi.mock("@/components/ui/label", async () => {
  const { default: R } = await import("react");
  return {
    Label: ({ children, htmlFor, className }) =>
      R.createElement("label", { htmlFor, className }, children),
  };
});

vi.mock("@/components/ui/textarea", async () => {
  const { default: R } = await import("react");
  return {
    Textarea: (props) => R.createElement("textarea", props),
  };
});

// Select mock: minimal controlled component
vi.mock("@/components/ui/select", async () => {
  const { default: R } = await import("react");
  const SelectCtx = R.createContext({ value: "", onValueChange: () => {} });

  return {
    Select: ({ value, defaultValue, onValueChange, children }) => {
      const [localVal, setLocalVal] = R.useState(value ?? defaultValue ?? "");
      const current = value !== undefined ? value : localVal;
      const handleChange = (v) => {
        setLocalVal(v);
        onValueChange?.(v);
      };
      return R.createElement(
        SelectCtx.Provider,
        { value: { value: current, onValueChange: handleChange } },
        children,
      );
    },
    SelectTrigger: ({ children, className }) =>
      R.createElement(
        "div",
        { className, "data-testid": "select-trigger" },
        children,
      ),
    SelectValue: ({ placeholder }) => {
      const { value } = R.useContext(SelectCtx);
      return R.createElement(
        "span",
        { "data-testid": "select-value" },
        value || placeholder,
      );
    },
    SelectContent: ({ children }) =>
      R.createElement("div", { "data-testid": "select-content" }, children),
    SelectItem: ({ value, children }) => {
      const { onValueChange } = R.useContext(SelectCtx);
      return R.createElement(
        "button",
        {
          type: "button",
          "data-value": value,
          onClick: () => onValueChange(value),
        },
        children,
      );
    },
  };
});

// Popover mock: renders content always visible (open controlled externally)
vi.mock("@/components/ui/popover", async () => {
  const { default: R } = await import("react");
  const PopCtx = R.createContext({ open: false, onOpenChange: () => {} });

  return {
    Popover: ({ open, onOpenChange, children }) =>
      R.createElement(
        PopCtx.Provider,
        { value: { open, onOpenChange } },
        children,
      ),
    PopoverTrigger: ({ children, asChild }) => {
      const { onOpenChange } = R.useContext(PopCtx);
      const child = R.Children.only(children);
      return R.cloneElement(child, {
        onClick: (...args) => {
          child.props.onClick?.(...args);
          onOpenChange?.((o) => !o);
        },
      });
    },
    PopoverContent: ({ children, className }) => {
      const { open } = R.useContext(PopCtx);
      return open
        ? R.createElement(
            "div",
            { "data-testid": "popover-content", className },
            children,
          )
        : null;
    },
  };
});

// Command mock: simple search list
vi.mock("@/components/ui/command", async () => {
  const { default: R } = await import("react");
  const CmdCtx = R.createContext({ search: "", onSearchChange: () => {} });

  return {
    Command: ({ children, className }) => {
      const [search, setSearch] = R.useState("");
      return R.createElement(
        CmdCtx.Provider,
        { value: { search, onSearchChange: setSearch } },
        R.createElement(
          "div",
          { className, "data-testid": "command" },
          children,
        ),
      );
    },
    CommandInput: ({ placeholder, value, onValueChange }) => {
      const { onSearchChange } = R.useContext(CmdCtx);
      return R.createElement("input", {
        placeholder,
        value,
        "data-testid": "command-input",
        onChange: (e) => {
          onValueChange?.(e.target.value);
          onSearchChange(e.target.value);
        },
      });
    },
    CommandList: ({ children }) =>
      R.createElement("div", { "data-testid": "command-list" }, children),
    CommandEmpty: ({ children }) =>
      R.createElement("div", { "data-testid": "command-empty" }, children),
    CommandGroup: ({ children }) =>
      R.createElement("div", { "data-testid": "command-group" }, children),
    CommandItem: ({ children, onSelect, value }) =>
      R.createElement(
        "div",
        {
          "data-testid": "command-item",
          "data-value": value,
          role: "option",
          onClick: () => onSelect?.(value),
        },
        children,
      ),
  };
});

vi.mock("lucide-react", () => ({
  Check: () => null,
  ChevronsUpDown: () => null,
  Package: () => null,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes) => classes.filter(Boolean).join(" "),
}));

// Checkbox is @radix-ui/react-checkbox – the ORIGINAL source of the loop.
// Replace with a plain <input type="checkbox"> so our selection logic works.
vi.mock("@/components/ui/checkbox", async () => {
  const { default: R } = await import("react");
  return {
    Checkbox: ({ checked, onCheckedChange, id, className, disabled }) =>
      R.createElement("input", {
        type: "checkbox",
        id,
        className,
        disabled,
        checked: checked === true,
        onChange: (e) => onCheckedChange?.(e.target.checked),
      }),
  };
});

vi.mock("@/components/ui/badge", async () => {
  const { default: R } = await import("react");
  return {
    Badge: ({ children, className, variant }) =>
      R.createElement("span", { className, "data-variant": variant }, children),
  };
});

// getCourses called inside PackageSelector
vi.mock("../../services/data.service", () => ({
  getCourses: vi.fn().mockResolvedValue({
    success: true,
    data: [
      { id: "course-1", course_name: "Electronics Lab" },
      { id: "course-2", course_name: "Plumbing Lab" },
    ],
  }),
}));

// ─── Test Data ────────────────────────────────────────────────────────────────

const MOCK_PACKAGES = [
  {
    id: "pkg-1",
    package_name: "Basic Electronics Kit",
    description: "Soldering station",
    images: null,
    courseIds: ["course-1"],
    course_names: "Electronics Lab",
  },
  {
    id: "pkg-2",
    package_name: "Plumbing Toolkit",
    description: "Pipes and fittings",
    images: null,
    courseIds: ["course-2"],
    course_names: "Plumbing Lab",
  },
  {
    id: "pkg-3",
    package_name: "General Workshop Set",
    description: "Multi-purpose tools",
    images: null,
    courseIds: [],
    course_names: "",
  },
];

const MOCK_PARTNERS = [
  { value: "partner-1", label: "Acme Corp" },
  { value: "partner-2", label: "Beta Labs" },
];

const MOCK_CENTERS = [
  {
    id: "center-1",
    center_name: "Acme Center North",
    partner_id: "partner-1",
  },
  {
    id: "center-2",
    center_name: "Acme Center South",
    partner_id: "partner-1",
  },
];

const DEFAULT_INITIAL_DATA = {
  id: "",
  requestId: "",
  partnerId: "partner-1",
  partnerName: "Acme Corp",
  centerId: "center-1",
  centerName: "Acme Center North",
  reminderDate: "2026-03-01",
  reminderTime: "10:00",
  frequency: "instant",
  customIntervalDays: 1,
  maxOccurrences: null,
  message: "Please review the refurbishment request.",
  packages: ["pkg-1", "pkg-2", "pkg-3"],
  isManualRequest: false,
  isInstantMode: false,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Render the modal in open state with default props */
function renderModal(overrides = {}) {
  const onSubmit = vi.fn();
  const onClose = vi.fn();

  const props = {
    isOpen: true,
    onClose,
    onSubmit,
    initialData: DEFAULT_INITIAL_DATA,
    uniquePartners: MOCK_PARTNERS,
    allCenters: MOCK_CENTERS,
    packages: MOCK_PACKAGES,
    loading: false,
    ...overrides,
  };

  const result = render(<ScheduleNotificationModal {...props} />);

  return { ...result, onSubmit, onClose };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ScheduleNotificationModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Basic Rendering ────────────────────────────────────────────────────

  describe("Rendering", () => {
    test("does not render when isOpen=false", () => {
      render(
        <ScheduleNotificationModal
          isOpen={false}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          initialData={DEFAULT_INITIAL_DATA}
          packages={MOCK_PACKAGES}
          uniquePartners={MOCK_PARTNERS}
          allCenters={MOCK_CENTERS}
        />,
      );

      expect(
        screen.queryByText("Schedule Notification Reminder"),
      ).not.toBeInTheDocument();
    });

    test("renders modal title when isOpen=true", async () => {
      renderModal();

      await waitFor(() => {
        expect(
          screen.getByText("Schedule Notification Reminder"),
        ).toBeInTheDocument();
      });
    });

    test("shows pre-filled partner and center as read-only when both provided", async () => {
      renderModal();

      await waitFor(() => {
        expect(screen.getByText("Acme Corp")).toBeInTheDocument();
        expect(screen.getByText("Acme Center North")).toBeInTheDocument();
      });
    });

    test("renders PackageSelector with the packages list", async () => {
      renderModal();

      await waitFor(() => {
        expect(screen.getByText("Basic Electronics Kit")).toBeInTheDocument();
        expect(screen.getByText("Plumbing Toolkit")).toBeInTheDocument();
        expect(screen.getByText("General Workshop Set")).toBeInTheDocument();
      });
    });

    test("shows 'Instant' mode title when isInstantMode=true", async () => {
      renderModal({
        initialData: { ...DEFAULT_INITIAL_DATA, isInstantMode: true },
      });

      await waitFor(() => {
        expect(
          screen.getByText("Send Instant Refurbishment Notification"),
        ).toBeInTheDocument();
      });
    });

    test("shows 'Manual Request' title when isManualRequest=true", async () => {
      renderModal({
        initialData: { ...DEFAULT_INITIAL_DATA, isManualRequest: true },
      });

      await waitFor(() => {
        expect(
          screen.getByText("Create Manual Refurbishment Request"),
        ).toBeInTheDocument();
      });
    });

    test("shows 'Edit' title when initialData.id is set", async () => {
      renderModal({
        initialData: { ...DEFAULT_INITIAL_DATA, id: "notif-99" },
      });

      await waitFor(() => {
        expect(
          screen.getByText("Edit Scheduled Notification"),
        ).toBeInTheDocument();
      });
    });
  });

  // ─── Package Selection ───────────────────────────────────────────────────

  describe("Package Selection (infinite loop regression)", () => {
    test("CRITICAL: clicking Deselect All does not throw 'Maximum update depth exceeded'", async () => {
      /**
       * This is the primary regression test.
       * Before the fix, clicking "Deselect All" caused:
       *   setFormData → modal re-render → new onSelectionChange inline ref →
       *   PackageSelector re-renders → handleDeselectAll recreated →
       *   N Radix Checkboxes update simultaneously → react-remove-scroll setRef loop.
       *
       * After the fix (useCallback + React.memo + ref pattern):
       *   setFormData → modal re-render → but onSelectionChange ref is STABLE →
       *   PackageSelector does NOT re-render (React.memo) → no cascade.
       */
      const consoleSpy = vi.spyOn(console, "error");

      renderModal();

      await waitFor(() =>
        expect(screen.getByText("Deselect All")).toBeInTheDocument(),
      );

      await act(async () => {
        await userEvent.click(screen.getByText("Deselect All"));
      });

      // Allow any pending effects to flush
      await new Promise((r) => setTimeout(r, 50));

      // No "Maximum update depth" error should have been logged
      const updateDepthErrors = consoleSpy.mock.calls.filter(
        (call) =>
          typeof call[0] === "string" &&
          call[0].includes("Maximum update depth exceeded"),
      );
      expect(updateDepthErrors).toHaveLength(0);

      consoleSpy.mockRestore();
    });

    test("Deselect All removes all packages from selection", async () => {
      const { onSubmit } = renderModal();

      await waitFor(() =>
        expect(screen.getByText("Deselect All")).toBeInTheDocument(),
      );

      await act(async () => {
        await userEvent.click(screen.getByText("Deselect All"));
      });

      await waitFor(() => {
        // After deselect, the warning should appear
        expect(
          screen.getByText("At least one package must be selected"),
        ).toBeInTheDocument();
      });
    });

    test("package selection is internal to modal - parent state not notified until submit", async () => {
      const onSubmitMock = vi.fn();
      renderModal({ onSubmit: onSubmitMock });

      await waitFor(() =>
        expect(screen.getByText("Deselect All")).toBeInTheDocument(),
      );

      // Deselect all - parent onSubmit should NOT be called
      await act(async () => {
        await userEvent.click(screen.getByText("Deselect All"));
      });

      expect(onSubmitMock).not.toHaveBeenCalled();
    });

    test("Select All Visible re-selects packages after Deselect All", async () => {
      renderModal();

      await waitFor(() =>
        expect(screen.getByText("Deselect All")).toBeInTheDocument(),
      );

      // Deselect all first
      await act(async () => {
        await userEvent.click(screen.getByText("Deselect All"));
      });

      // Warning should appear
      await waitFor(() =>
        expect(
          screen.getByText("At least one package must be selected"),
        ).toBeInTheDocument(),
      );

      // Now select all back
      await act(async () => {
        await userEvent.click(screen.getByText("Select All Visible"));
      });

      // Warning should disappear
      await waitFor(() =>
        expect(
          screen.queryByText("At least one package must be selected"),
        ).not.toBeInTheDocument(),
      );
    });
  });

  // ─── Form Submit ─────────────────────────────────────────────────────────

  describe("Form Submission", () => {
    test("calls onSubmit with current form data when submit button clicked", async () => {
      const { onSubmit } = renderModal();

      // Submit button is linked via form id
      const submitBtn = screen.getByRole("button", {
        name: /schedule reminder/i,
      });

      await act(async () => {
        await userEvent.click(submitBtn);
      });

      expect(onSubmit).toHaveBeenCalledTimes(1);
      const submittedData = onSubmit.mock.calls[0][0];
      expect(submittedData.partnerId).toBe("partner-1");
      expect(submittedData.centerId).toBe("center-1");
      expect(Array.isArray(submittedData.packages)).toBe(true);
    });

    test("onSubmit receives empty packages array when all deselected", async () => {
      const { onSubmit } = renderModal();

      await waitFor(() =>
        expect(screen.getByText("Deselect All")).toBeInTheDocument(),
      );

      await act(async () => {
        await userEvent.click(screen.getByText("Deselect All"));
      });

      const submitBtn = screen.getByRole("button", {
        name: /schedule reminder/i,
      });
      await act(async () => {
        await userEvent.click(submitBtn);
      });

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit.mock.calls[0][0].packages).toEqual([]);
    });
  });

  // ─── Close behaviour ─────────────────────────────────────────────────────

  describe("Close behaviour", () => {
    test("calls onClose(false) when Cancel button clicked", async () => {
      const { onClose } = renderModal();

      const cancelBtn = screen.getByRole("button", { name: /cancel/i });
      await userEvent.click(cancelBtn);

      expect(onClose).toHaveBeenCalledWith(false);
    });
  });

  // ─── State isolation ─────────────────────────────────────────────────────

  describe("Internal state isolation", () => {
    test("re-seeding initialData on re-open resets packages to new value", async () => {
      const { rerender } = renderModal();

      await waitFor(() =>
        expect(screen.getByText("Deselect All")).toBeInTheDocument(),
      );

      // Deselect all
      await act(async () => {
        await userEvent.click(screen.getByText("Deselect All"));
      });

      // Close the modal
      rerender(
        <ScheduleNotificationModal
          isOpen={false}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          initialData={DEFAULT_INITIAL_DATA}
          packages={MOCK_PACKAGES}
          uniquePartners={MOCK_PARTNERS}
          allCenters={MOCK_CENTERS}
        />,
      );

      // Re-open - initialData has packages again
      rerender(
        <ScheduleNotificationModal
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          initialData={DEFAULT_INITIAL_DATA}
          packages={MOCK_PACKAGES}
          uniquePartners={MOCK_PARTNERS}
          allCenters={MOCK_CENTERS}
        />,
      );

      // After re-open, packages should be restored from initialData
      await waitFor(() =>
        expect(screen.getByText("Deselect All")).toBeInTheDocument(),
      );
    });

    test("parent re-renders with new initialData do NOT reset internal state while modal is open", async () => {
      /**
       * This verifies the key architecture: initialData is read ONCE on open,
       * not on every parent re-render. So parent updates don't disrupt the user's
       * in-progress edits.
       */
      const ParentSimulator = () => {
        const [tick, setTick] = React.useState(0);

        // initialData changes each tick (simulates parent re-rendering with "new" data)
        const initialData = React.useMemo(
          () => ({ ...DEFAULT_INITIAL_DATA, message: `tick-${tick}` }),
          [tick],
        );

        return (
          <div>
            <button onClick={() => setTick((t) => t + 1)}>Tick</button>
            <ScheduleNotificationModal
              isOpen={true}
              onClose={vi.fn()}
              onSubmit={vi.fn()}
              initialData={initialData}
              packages={MOCK_PACKAGES}
              uniquePartners={MOCK_PARTNERS}
              allCenters={MOCK_CENTERS}
            />
          </div>
        );
      };

      render(<ParentSimulator />);

      await waitFor(() =>
        expect(screen.getByText("Deselect All")).toBeInTheDocument(),
      );

      // Deselect all
      await act(async () => {
        await userEvent.click(screen.getByText("Deselect All"));
      });

      // Warning should appear
      await waitFor(() =>
        expect(
          screen.getByText("At least one package must be selected"),
        ).toBeInTheDocument(),
      );

      // Parent re-renders (tick changes initialData)
      await userEvent.click(screen.getByText("Tick"));
      await userEvent.click(screen.getByText("Tick"));

      // The warning should STILL be visible - internal state was NOT reset by parent
      expect(
        screen.getByText("At least one package must be selected"),
      ).toBeInTheDocument();
    });
  });
});
