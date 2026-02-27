/**
 * Unit Tests: RefurbishmentResponseModal Component
 * Tests cover the complete partner response flow including:
 *  - Course package selection steps
 *  - Upgradation prompt screen UI (Figma-accurate)
 *  - Room dimension form (2-column layout, no room_name)
 *  - Upgradation package selection
 *  - Package preview with Upgradation tab
 *  - Submit payload (no room_name sent to backend)
 *  - Success screen ("Request submitted successfully!")
 */

import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import RefurbishmentResponseModal from "../../pages/Inbox/RefurbishmentResponseModal";
import apiClient from "../../api/client";
import { toast } from "react-toastify";

/* ─── Mocks ─────────────────────────────────────────────────── */
vi.mock("../../api/client", () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock("react-toastify", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

/* ─── Fixtures ───────────────────────────────────────────────── */
const makeDetails = (opts = {}) => ({
  notification_id: "notif-001",
  center_name: "Mysuru Electrical Lab",
  description: "Need refurbishment for training lab",
  courses: [
    {
      course_id: "crs-1",
      course_name: "Electrical",
      packages: [
        {
          package_id: "pkg-e-1",
          package_name: "Electrical Wiring & Equipment Upgrade",
          description: "Replace old wiring, MCBs, panels.",
          images: '["https://img.unsplash.com/photo-1581092160562?w=200"]',
          justification: null,
        },
        {
          package_id: "pkg-e-2",
          package_name: "Furniture Replacement",
          description: "New tables, chairs, and storage units.",
          images: "[]",
          justification: null,
        },
      ],
    },
  ],
  files: [],
  has_upgradation_packages: opts.hasUpgradation ?? true,
  upgradation_packages:
    opts.hasUpgradation === false
      ? []
      : [
          {
            id: "pkg-upgr-001",
            package_id: "pkg-upgr-001",
            package_name: "Electrical Wiring & Equipment Upgrade",
            description: "Replace old wiring, MCBs, distribution panels.",
            images: '["https://img.unsplash.com/photo-1581092160562?w=200"]',
          },
          {
            id: "pkg-upgr-002",
            package_id: "pkg-upgr-002",
            package_name: "Furniture Replacement",
            description: "New lab benches, ergonomic chairs.",
            images: "[]",
          },
        ],
});

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  notificationId: "notif-001",
  details: makeDetails(),
};

/* ─── Helpers ────────────────────────────────────────────────── */
const renderModal = (props = {}) =>
  render(<RefurbishmentResponseModal {...defaultProps} {...props} />);

/** Custom text matcher for counter text split across text nodes e.g. "1 OF 2 SELECTED" */
const byNormText = (expected) => (_, el) =>
  el ? (el.textContent || "").replace(/\s+/g, " ").trim() === expected : false;

/** Select the first package by clicking its parent card div directly.
 *  Clicking the checkbox itself triggers BOTH the card onClick AND checkbox onChange
 *  (double-toggle), so we click the card container instead. */
const selectFirstPackage = () => {
  const checkbox = screen.getAllByRole("checkbox")[0];
  // parentElement is the package card div with the onClick handler
  fireEvent.click(checkbox.parentElement);
};

/** Click the footer CTA on the course selection step.
 *  On the last (or only) course step, the button reads "Package preview". */
const clickLastCourseContinue = () => {
  const btn = screen.getByRole("button", { name: /package preview/i });
  fireEvent.click(btn);
};

/* ─── Tests ──────────────────────────────────────────────────── */

describe("RefurbishmentResponseModal — Course Selection Step", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.post.mockResolvedValue({ data: { success: true } });
  });

  test("renders the stepper with correct course labels", () => {
    renderModal();
    expect(screen.getByText("Electrical")).toBeInTheDocument();
    // Upgradation step label shows in stepper
    expect(screen.getAllByText("Upgradation").length).toBeGreaterThanOrEqual(1);
    // Package preview appears in stepper span and/or footer button
    expect(
      screen.getAllByText("Package preview").length,
    ).toBeGreaterThanOrEqual(1);
  });

  test("renders available packages for the current course", () => {
    renderModal();
    expect(
      screen.getByText("Electrical Wiring & Equipment Upgrade"),
    ).toBeInTheDocument();
    expect(screen.getByText("Furniture Replacement")).toBeInTheDocument();
  });

  test("toggling a package updates selection count in footer", () => {
    renderModal();
    expect(screen.getByText(/^0\s+OF\s+2\s+SELECTED$/)).toBeInTheDocument();
    selectFirstPackage();
    expect(screen.getByText(/^1\s+OF\s+2\s+SELECTED$/)).toBeInTheDocument();
  });

  test("clicking the footer CTA (Package preview) navigates from course step", () => {
    renderModal();
    selectFirstPackage();
    // On a single-course setup the CTA reads "Package preview"
    clickLastCourseContinue();
    // New flow: goes to non-final refurbishment preview first
    expect(screen.getByText("Refurbishment preview")).toBeInTheDocument();
  });
});

describe("RefurbishmentResponseModal — Upgradation Prompt Screen", () => {
  beforeEach(() => vi.clearAllMocks());

  const advanceToUpgradationPrompt = () => {
    renderModal();
    selectFirstPackage();
    clickLastCourseContinue(); // → non-final preview
    fireEvent.click(
      screen.getByRole("button", { name: /Continue to Upgradation/i }),
    ); // → prompt
  };

  test("shows 'Do you need upgradation?' heading after last course", () => {
    advanceToUpgradationPrompt();
    expect(screen.getByText("Do you need upgradation?")).toBeInTheDocument();
  });

  test("shows subtitle text matching Figma", () => {
    advanceToUpgradationPrompt();
    expect(
      screen.getByText(/you'll be notified once it's reviewed by the admin/i),
    ).toBeInTheDocument();
  });

  test("renders 'No, Thanks.' button (exact Figma text)", () => {
    advanceToUpgradationPrompt();
    expect(
      screen.getByRole("button", { name: "No, Thanks." }),
    ).toBeInTheDocument();
  });

  test("renders 'Yes' button (exact Figma text)", () => {
    advanceToUpgradationPrompt();
    expect(screen.getByRole("button", { name: "Yes" })).toBeInTheDocument();
  });

  test("'No, Thanks.' skips upgradation and goes to package preview", () => {
    advanceToUpgradationPrompt();
    fireEvent.click(screen.getByRole("button", { name: "No, Thanks." }));
    // Should now be on final preview step (isFinalPreview=true)
    expect(screen.getByText("Confirm & submit")).toBeInTheDocument();
  });

  test("skipping upgradation does NOT show Upgradation pill tab in preview", () => {
    advanceToUpgradationPrompt();
    fireEvent.click(screen.getByRole("button", { name: "No, Thanks." }));
    // When upgradationRequested=false, no Upgradation pill button is rendered in preview
    const allBtns = screen.getAllByRole("button");
    const upgradationBtns = allBtns.filter(
      (b) => b.textContent.trim() === "Upgradation",
    );
    expect(upgradationBtns.length).toBe(0);
  });

  test("skips prompt when no upgradation packages available", () => {
    renderModal({ details: makeDetails({ hasUpgradation: false }) });
    selectFirstPackage();
    clickLastCourseContinue();
    // Goes to non-final preview (no upgradation pkgs → no Continue to Upgradation button → Submit shown)
    expect(screen.getByText("Refurbishment preview")).toBeInTheDocument();
    expect(
      screen.queryByText("Do you need upgradation?"),
    ).not.toBeInTheDocument();
  });
});

describe("RefurbishmentResponseModal — Room Dimension Step", () => {
  beforeEach(() => vi.clearAllMocks());

  const advanceToRoomStep = () => {
    renderModal();
    selectFirstPackage();
    clickLastCourseContinue(); // → non-final preview
    fireEvent.click(
      screen.getByRole("button", { name: /Continue to Upgradation/i }),
    ); // → prompt
    fireEvent.click(screen.getByRole("button", { name: "Yes" })); // → room
  };

  test("shows ROOM DIMENSION (IN FEET) label in uppercase", () => {
    advanceToRoomStep();
    expect(screen.getByText("ROOM DIMENSION (IN FEET)")).toBeInTheDocument();
  });

  test("shows LENGHT, BREADTH, HEIGHT placeholder inputs", () => {
    advanceToRoomStep();
    expect(screen.getByPlaceholderText("LENGHT")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("BREADTH")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("HEIGHT")).toBeInTheDocument();
  });

  test("shows JUSTIFICATION label and WRITE HERE placeholder", () => {
    advanceToRoomStep();
    expect(screen.getByText("JUSTIFICATION")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("WRITE HERE")).toBeInTheDocument();
  });

  test("shows UPLOAD ROOM PICTURES section", () => {
    advanceToRoomStep();
    expect(screen.getByText("UPLOAD ROOM PICTURES")).toBeInTheDocument();
    expect(screen.getByText("Attach file")).toBeInTheDocument();
  });

  test("does NOT have a Room Name input field", () => {
    advanceToRoomStep();
    expect(screen.queryByPlaceholderText(/room name/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/room name/i)).not.toBeInTheDocument();
  });

  test("shows validation error when dimensions are empty", () => {
    advanceToRoomStep();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringMatching(/room dimensions/i),
    );
  });

  test("advances to packages step when all dimensions are filled", async () => {
    advanceToRoomStep();
    fireEvent.change(screen.getByPlaceholderText("LENGHT"), {
      target: { value: "30" },
    });
    fireEvent.change(screen.getByPlaceholderText("BREADTH"), {
      target: { value: "20" },
    });
    fireEvent.change(screen.getByPlaceholderText("HEIGHT"), {
      target: { value: "10" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => {
      expect(screen.getByText("Upgradation Packages")).toBeInTheDocument();
    });
  });
});

describe("RefurbishmentResponseModal — Upgradation Packages Step", () => {
  beforeEach(() => vi.clearAllMocks());

  const advanceToPackagesStep = () => {
    renderModal();
    selectFirstPackage();
    clickLastCourseContinue(); // → non-final preview
    fireEvent.click(
      screen.getByRole("button", { name: /Continue to Upgradation/i }),
    ); // → prompt
    fireEvent.click(screen.getByRole("button", { name: "Yes" })); // → room
    fireEvent.change(screen.getByPlaceholderText("LENGHT"), {
      target: { value: "30" },
    });
    fireEvent.change(screen.getByPlaceholderText("BREADTH"), {
      target: { value: "20" },
    });
    fireEvent.change(screen.getByPlaceholderText("HEIGHT"), {
      target: { value: "10" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i })); // → packages
  };

  test("shows 'Upgradation Packages' title", async () => {
    advanceToPackagesStep();
    await waitFor(() => {
      expect(screen.getByText("Upgradation Packages")).toBeInTheDocument();
    });
  });

  test("lists all available upgradation packages", async () => {
    advanceToPackagesStep();
    await waitFor(() => {
      expect(
        screen.getByText("Electrical Wiring & Equipment Upgrade"),
      ).toBeInTheDocument();
      expect(screen.getByText("Furniture Replacement")).toBeInTheDocument();
    });
  });

  test("shows 0 OF 2 SELECTED count in footer", async () => {
    advanceToPackagesStep();
    await waitFor(() => {
      expect(screen.getByText(/^0\s+OF\s+2\s+SELECTED$/)).toBeInTheDocument();
    });
  });

  test("selecting an upgradation package updates the count", async () => {
    advanceToPackagesStep();
    await waitFor(() => screen.getByText("Upgradation Packages"));
    const checkboxes = screen.getAllByRole("checkbox");
    // Click parent card div (not checkbox) to avoid double-toggle
    fireEvent.click(checkboxes[0].parentElement);
    await waitFor(() => {
      expect(screen.getByText(/^1\s+OF\s+2\s+SELECTED$/)).toBeInTheDocument();
    });
  });
});

describe("RefurbishmentResponseModal — Package Preview Step", () => {
  beforeEach(() => vi.clearAllMocks());

  const advanceToPreviewWithUpgradation = async () => {
    renderModal();
    selectFirstPackage();
    clickLastCourseContinue(); // → non-final preview
    fireEvent.click(
      screen.getByRole("button", { name: /Continue to Upgradation/i }),
    ); // → prompt
    fireEvent.click(screen.getByRole("button", { name: "Yes" })); // → room
    fireEvent.change(screen.getByPlaceholderText("LENGHT"), {
      target: { value: "30" },
    });
    fireEvent.change(screen.getByPlaceholderText("BREADTH"), {
      target: { value: "20" },
    });
    fireEvent.change(screen.getByPlaceholderText("HEIGHT"), {
      target: { value: "10" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i })); // room → packages
    await waitFor(() => screen.getByText("Upgradation Packages"));
    // Click "Package preview" in the packages step footer
    fireEvent.click(screen.getByRole("button", { name: /package preview/i }));
    await waitFor(() => screen.getByText("Confirm & submit"));
  };

  test("shows final combined preview heading", async () => {
    await advanceToPreviewWithUpgradation();
    expect(screen.getByText("Confirm & submit")).toBeInTheDocument();
  });

  test("shows course pill tab for the selected course", async () => {
    await advanceToPreviewWithUpgradation();
    // Find the "Electrical" pill tab button by text content
    const allBtns = screen.getAllByRole("button");
    const electricalBtn = allBtns.find(
      (b) => b.textContent.trim() === "Electrical",
    );
    expect(electricalBtn).toBeTruthy();
  });

  test("shows 'Upgradation' pill tab when upgradation was requested", async () => {
    await advanceToPreviewWithUpgradation();
    const allBtns = screen.getAllByRole("button");
    const upgradationBtn = allBtns.find(
      (b) => b.textContent.trim() === "Upgradation",
    );
    expect(upgradationBtn).toBeTruthy();
  });

  test("shows Submit button in preview footer", async () => {
    await advanceToPreviewWithUpgradation();
    expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument();
  });
});

describe("RefurbishmentResponseModal — Submit & Success Screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.post.mockResolvedValue({ data: { success: true } });
  });

  /** Navigate to preview (skipping upgradation) and return the submit button */
  const navigateToPreview = async () => {
    renderModal();
    selectFirstPackage();
    clickLastCourseContinue(); // → non-final preview
    fireEvent.click(
      screen.getByRole("button", { name: /Continue to Upgradation/i }),
    ); // → prompt
    fireEvent.click(screen.getByRole("button", { name: "No, Thanks." })); // → final preview
    await waitFor(() => screen.getByText("Confirm & submit"));
    return screen.getByRole("button", { name: /^submit$/i });
  };

  test("submit sends payload without room_name field", async () => {
    const submitBtn = await navigateToPreview();
    await act(async () => {
      fireEvent.click(submitBtn);
    });
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1), {
      timeout: 3000,
    });
    const [, payload] = apiClient.post.mock.calls[0];
    expect(payload.upgradation).toBeNull();
    expect(Array.isArray(payload.selected_packages)).toBe(true);
    expect(JSON.stringify(payload)).not.toContain("room_name");
  });

  test("shows 'Request submitted successfully!' on success", async () => {
    const submitBtn = await navigateToPreview();
    await act(async () => {
      fireEvent.click(submitBtn);
    });
    await waitFor(() => screen.getByText("Request submitted successfully!"), {
      timeout: 3000,
    });
  });

  test("shows 'Return to Dashboard' button on success screen", async () => {
    const submitBtn = await navigateToPreview();
    await act(async () => {
      fireEvent.click(submitBtn);
    });
    await waitFor(
      () => screen.getByRole("button", { name: /return to dashboard/i }),
      { timeout: 3000 },
    );
  });

  test("shows toast error when API call fails", async () => {
    apiClient.post.mockRejectedValueOnce({
      response: { data: { message: "Server error" } },
    });
    const submitBtn = await navigateToPreview();
    await act(async () => {
      fireEvent.click(submitBtn);
    });
    await waitFor(
      () => expect(toast.error).toHaveBeenCalledWith("Server error"),
      { timeout: 3000 },
    );
  });
});
