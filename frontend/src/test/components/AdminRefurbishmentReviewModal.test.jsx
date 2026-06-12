/**
 * Unit Tests: AdminRefurbishmentReviewModal Component
 * Tests for frontend/src/components/refurbishment/modals/AdminRefurbishmentReviewModal.jsx
 *
 * Actual component structure:
 *  - Header with partner name
 *  - Course pill tabs (one per course in partner_packages_by_course) + optional Upgradation pill
 *  - Left panel: partner-selected packages + admin-added packages + "Add other package" panel
 *  - Right panel: request info (center name, partner name, status, description)
 *  - Footer: Approve / Reject buttons (only when status === "submitted")
 *  - Reject modal: reason dropdown (select) + remark textarea + Submit button
 */

import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, test, expect, vi, beforeEach } from "vitest";
import AdminRefurbishmentReviewModal from "../../components/refurbishment/modals/AdminRefurbishmentReviewModal";
import refurbishmentService from "../../services/refurbishment.service";
import { toast } from "react-toastify";

// Mock dependencies
vi.mock("../../services/refurbishment.service");
vi.mock("react-toastify", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// ─── Shared fixtures ────────────────────────────────────────────────────────

const mockRequestDetails = {
  request: {
    id: "req-123",
    request_number: 1,
    center_name: "Test Center",
    partner_name: "Test Partner",
    status: "submitted",
    is_upgradation_requested: false,
    admin_remarks: null,
    rejection_reason: null,
  },
  partner_packages_by_course: [
    {
      course_id: "course-1",
      course_name: "Course 1",
      packages: [
        {
          package_id: "pkg-1",
          package_name: "Package 1",
          description: "Test package 1",
          images: '["http://image1.jpg"]',
          justification: "We need this package",
        },
        {
          package_id: "pkg-2",
          package_name: "Package 2",
          description: "Test package 2",
          images: "[]",
          justification: "",
        },
      ],
    },
    {
      course_id: "course-2",
      course_name: "Course 2",
      packages: [
        {
          package_id: "pkg-4",
          package_name: "Package 4",
          description: "Test package 4",
          images: "[]",
          justification: "Needed for course 2",
        },
      ],
    },
  ],
  available_courses: [
    { course_id: "course-1", course_name: "Course 1" },
    { course_id: "course-2", course_name: "Course 2" },
  ],
  images_by_package: {},
  partner_images: [],
  admin_packages_by_course: [],
  completion_images: [],
  upgradation: {
    is_requested: false,
    rooms: [],
    selected_packages: [],
  },
};

const mockAllPackages = [
  {
    id: "pkg-1",
    name: "Package 1",
    description: "Test package 1",
    images: '["http://image1.jpg"]',
    courseIds: ["course-1"],
    course_names: "Course 1",
  },
  {
    id: "pkg-2",
    name: "Package 2",
    description: "Test package 2",
    images: "[]",
    courseIds: ["course-1"],
    course_names: "Course 1",
  },
  {
    id: "pkg-3",
    name: "Package 3",
    description: "Test package 3",
    images: "[]",
    courseIds: ["course-1", "course-2"],
    course_names: "Course 1, Course 2",
  },
];

const mockOnActionComplete = vi.fn();
const mockOnOpenChange = vi.fn();

// ─── Helper: render and wait for data to load ────────────────────────────────
const renderAndWait = async (props = {}) => {
  render(
    <AdminRefurbishmentReviewModal
      open={true}
      onOpenChange={mockOnOpenChange}
      requestId="req-123"
      onActionComplete={mockOnActionComplete}
      {...props}
    />,
  );
  await waitFor(() => {
    expect(screen.getByText("Test Center")).toBeInTheDocument();
  });
};

describe("AdminRefurbishmentReviewModal Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refurbishmentService.getRefurbishmentRequestForReview.mockResolvedValue({
      data: mockRequestDetails,
    });
    refurbishmentService.getPackages.mockResolvedValue({
      data: { packages: mockAllPackages },
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // Rendering
  // ───────────────────────────────────────────────────────────────────────

  describe("Rendering", () => {
    test("renders modal and shows center / partner name after loading", async () => {
      await renderAndWait();
      expect(screen.getByText("Test Center")).toBeInTheDocument();
      // Partner name appears in multiple elements; confirm at least one exists
      const partnerEls = screen.getAllByText(/Test Partner/i);
      expect(partnerEls.length).toBeGreaterThanOrEqual(1);
    });

    test("shows course pill tabs with correct course names", async () => {
      await renderAndWait();
      expect(
        screen.getByRole("button", { name: "Course 1" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Course 2" }),
      ).toBeInTheDocument();
    });

    test("shows partner-selected packages with Partner Selected badge", async () => {
      await renderAndWait();
      expect(screen.getByText("Package 1")).toBeInTheDocument();
      expect(screen.getByText("Package 2")).toBeInTheDocument();
      const badges = screen.getAllByText("Partner Selected");
      expect(badges.length).toBeGreaterThanOrEqual(2);
    });

    test("shows Approve and Reject buttons when status is submitted", async () => {
      await renderAndWait();
      expect(
        screen.getByRole("button", { name: /^Approve$/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /^Reject$/i }),
      ).toBeInTheDocument();
    });

    test("hides Approve/Reject and shows status message when already processed", async () => {
      refurbishmentService.getRefurbishmentRequestForReview.mockResolvedValue({
        data: {
          ...mockRequestDetails,
          request: { ...mockRequestDetails.request, status: "approved" },
        },
      });

      render(
        <AdminRefurbishmentReviewModal
          open={true}
          onOpenChange={mockOnOpenChange}
          requestId="req-123"
          onActionComplete={mockOnActionComplete}
        />,
      );
      await waitFor(() =>
        expect(screen.getByText("Test Center")).toBeInTheDocument(),
      );

      expect(
        screen.queryByRole("button", { name: /^Approve$/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /^Reject$/i }),
      ).not.toBeInTheDocument();
      expect(screen.getByText(/already been approved/i)).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Add other package/i }),
      ).not.toBeInTheDocument();
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // Course pill navigation
  // ───────────────────────────────────────────────────────────────────────

  describe("Course pill navigation", () => {
    test("switching course pills changes displayed packages", async () => {
      await renderAndWait();
      expect(screen.getByText("Package 1")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Course 2" }));

      await waitFor(() => {
        expect(screen.getByText("Package 4")).toBeInTheDocument();
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // Add-other-package panel
  // ───────────────────────────────────────────────────────────────────────

  describe("Add other package panel", () => {
    test("'Add other package' button expands the add panel", async () => {
      await renderAndWait();
      fireEvent.click(
        screen.getByRole("button", { name: /Add other package/i }),
      );
      await waitFor(() =>
        expect(screen.getByText("Available to Add")).toBeInTheDocument(),
      );
    });

    test("clicking a package in the add panel marks it as Admin Added", async () => {
      await renderAndWait();
      fireEvent.click(
        screen.getByRole("button", { name: /Add other package/i }),
      );
      await waitFor(() => screen.getByText("Package 3"));

      const pkg3Btn = screen.getByText("Package 3").closest("button");
      fireEvent.click(pkg3Btn);

      await waitFor(() =>
        expect(screen.getByText("Admin Added")).toBeInTheDocument(),
      );
    });

    test("clicking Remove removes the admin-added package", async () => {
      await renderAndWait();
      fireEvent.click(
        screen.getByRole("button", { name: /Add other package/i }),
      );
      await waitFor(() => screen.getByText("Package 3"));

      fireEvent.click(screen.getByText("Package 3").closest("button")); // add
      await waitFor(() => screen.getByText("Admin Added"));

      fireEvent.click(screen.getByRole("button", { name: /^Remove$/i }));
      await waitFor(() =>
        expect(screen.queryByText("Admin Added")).not.toBeInTheDocument(),
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // Approve flow
  // ───────────────────────────────────────────────────────────────────────

  describe("Approve flow", () => {
    test("clicking Approve calls approveRefurbishmentRequest", async () => {
      refurbishmentService.approveRefurbishmentRequest.mockResolvedValue({
        success: true,
      });
      await renderAndWait();

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /^Approve$/i }));
      });

      await waitFor(() => {
        expect(
          refurbishmentService.approveRefurbishmentRequest,
        ).toHaveBeenCalledWith("req-123", expect.anything());
      });
    });

    test("shows success screen after approve", async () => {
      refurbishmentService.approveRefurbishmentRequest.mockResolvedValue({
        success: true,
      });
      await renderAndWait();

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /^Approve$/i }));
      });

      await waitFor(() =>
        expect(screen.getByText(/Request Approved/i)).toBeInTheDocument(),
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // Reject flow
  // ───────────────────────────────────────────────────────────────────────

  describe("Reject flow", () => {
    test("clicking Reject opens the reject modal", async () => {
      await renderAndWait();
      fireEvent.click(screen.getByRole("button", { name: /^Reject$/i }));
      // Wait for reject modal's select dropdown (combobox) to appear
      await waitFor(() =>
        expect(screen.getByRole("combobox")).toBeInTheDocument(),
      );
    });

    test("reject modal has a reason dropdown and remark textarea", async () => {
      await renderAndWait();
      fireEvent.click(screen.getByRole("button", { name: /^Reject$/i }));
      await waitFor(() => {
        expect(screen.getByRole("combobox")).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Remark/i)).toBeInTheDocument();
      });
    });

    test("Submit button is disabled when no reason is selected", async () => {
      await renderAndWait();
      fireEvent.click(screen.getByRole("button", { name: /^Reject$/i }));
      await waitFor(() => screen.getByRole("combobox"));
      expect(screen.getByRole("button", { name: /^Submit$/i })).toBeDisabled();
    });

    test("submitting with a reason calls rejectRefurbishmentRequest", async () => {
      refurbishmentService.rejectRefurbishmentRequest.mockResolvedValue({
        success: true,
      });
      await renderAndWait();

      fireEvent.click(screen.getByRole("button", { name: /^Reject$/i }));
      await waitFor(() => screen.getByRole("combobox"));

      const select = screen.getByRole("combobox");
      // Select the first real option (index 1 skips the disabled placeholder)
      const firstRealOption = select.options[1];
      if (firstRealOption) {
        fireEvent.change(select, { target: { value: firstRealOption.value } });
      }

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /^Submit$/i }));
      });

      await waitFor(() => {
        expect(
          refurbishmentService.rejectRefurbishmentRequest,
        ).toHaveBeenCalledWith("req-123", expect.any(String));
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // Data fetching
  // ───────────────────────────────────────────────────────────────────────

  describe("Data fetching", () => {
    test("calls getRefurbishmentRequestForReview and getPackages on open", async () => {
      await renderAndWait();
      expect(
        refurbishmentService.getRefurbishmentRequestForReview,
      ).toHaveBeenCalledWith("req-123");
      expect(refurbishmentService.getPackages).toHaveBeenCalled();
    });

    test("shows toast error when API call fails", async () => {
      refurbishmentService.getRefurbishmentRequestForReview.mockRejectedValue({
        response: { data: { message: "Failed to load" } },
      });

      render(
        <AdminRefurbishmentReviewModal
          open={true}
          onOpenChange={mockOnOpenChange}
          requestId="req-123"
          onActionComplete={mockOnActionComplete}
        />,
      );

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining("Failed"),
        );
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // Upgradation Tab
  // ───────────────────────────────────────────────────────────────────────

  describe("Upgradation Tab", () => {
    const mockRequestWithUpgradation = {
      ...mockRequestDetails,
      request: {
        ...mockRequestDetails.request,
        is_upgradation_requested: true,
      },
      upgradation: {
        is_requested: true,
        rooms: [
          {
            id: "room-001",
            length_feet: 30,
            breadth_feet: 20,
            height_feet: 10,
            justification: "Lab needs electrical upgradation urgently.",
            photos: [
              {
                id: "photo-1",
                file_url: "https://s3.amazonaws.com/photo1.jpg",
                file_name: "room_photo.jpg",
              },
            ],
          },
        ],
        selected_packages: [
          {
            package_id: "pkg-upgr-001",
            package_name: "Electrical Wiring & Equipment Upgrade",
            description: "Replace old wiring, MCBs, panels.",
            images: '["https://img.unsplash.com/photo?w=200"]',
          },
        ],
      },
    };

    beforeEach(() => {
      vi.clearAllMocks();
      refurbishmentService.getRefurbishmentRequestForReview.mockResolvedValue({
        data: mockRequestWithUpgradation,
      });
      refurbishmentService.getPackages.mockResolvedValue({
        data: { packages: mockAllPackages },
      });
      refurbishmentService.getUpgradationPackagesForRequest.mockResolvedValue({
        data: {
          available_packages: [
            {
              id: "pkg-upgr-002",
              name: "Furniture Replacement",
              description: "New lab benches.",
              images: "[]",
            },
          ],
          admin_selected_ids: [],
        },
      });
    });

    test("shows Upgradation pill when partner requested upgradation", async () => {
      render(
        <AdminRefurbishmentReviewModal
          open={true}
          onOpenChange={mockOnOpenChange}
          requestId="req-123"
          onActionComplete={mockOnActionComplete}
        />,
      );

      await waitFor(() => screen.getByText("Test Center"));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /upgradation/i }),
        ).toBeInTheDocument();
      });
    });

    test("clicking Upgradation pill shows room dimension values", async () => {
      render(
        <AdminRefurbishmentReviewModal
          open={true}
          onOpenChange={mockOnOpenChange}
          requestId="req-123"
          onActionComplete={mockOnActionComplete}
        />,
      );

      await waitFor(() => screen.getByText("Test Center"));
      fireEvent.click(screen.getByRole("button", { name: /upgradation/i }));

      await waitFor(() => {
        expect(screen.getByText("30")).toBeInTheDocument();
        expect(screen.getByText("20")).toBeInTheDocument();
        expect(screen.getByText("600")).toBeInTheDocument();
      });
    });

    test("Upgradation tab shows selected package names", async () => {
      render(
        <AdminRefurbishmentReviewModal
          open={true}
          onOpenChange={mockOnOpenChange}
          requestId="req-123"
          onActionComplete={mockOnActionComplete}
        />,
      );

      await waitFor(() => screen.getByText("Test Center"));
      fireEvent.click(screen.getByRole("button", { name: /upgradation/i }));

      await waitFor(() => {
        expect(
          screen.getByText("Electrical Wiring & Equipment Upgrade"),
        ).toBeInTheDocument();
      });
    });

    test("does NOT show Upgradation pill when partner did not request upgradation", async () => {
      refurbishmentService.getRefurbishmentRequestForReview.mockResolvedValue({
        data: {
          ...mockRequestDetails,
          upgradation: {
            is_requested: false,
            rooms: [],
            selected_packages: [],
          },
        },
      });

      render(
        <AdminRefurbishmentReviewModal
          open={true}
          onOpenChange={mockOnOpenChange}
          requestId="req-123"
          onActionComplete={mockOnActionComplete}
        />,
      );

      await waitFor(() => screen.getByText("Test Center"));
      expect(
        screen.queryByRole("button", { name: /^Upgradation$/i }),
      ).not.toBeInTheDocument();
    });
  });
});
