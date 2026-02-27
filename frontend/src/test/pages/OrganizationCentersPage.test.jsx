import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";

// --- Mocks ---
vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));
vi.mock("../../services/data.service", () => ({
  getCenters: vi.fn(),
  deleteCenter: vi.fn(),
}));
vi.mock("../../components/layout/MainLayout", () => ({
  default: ({ children }) => <div data-testid="main-layout">{children}</div>,
}));
vi.mock("../../components/common/EnhancedDataTable", () => ({
  default: ({ columns, data, isLoading }) => (
    <div data-testid="data-table">
      {isLoading && <div data-testid="loading">Loading...</div>}
      {data.map((row, idx) => (
        <div key={idx} data-testid={`row-${idx}`}>
          {columns.map((col) => {
            if (col.id === "actions" && col.cell) {
              return (
                <div key={col.id} data-testid={`actions-${idx}`}>
                  {col.cell({ row: { original: row } })}
                </div>
              );
            }
            return null;
          })}
        </div>
      ))}
    </div>
  ),
  StatusBadge: ({ label }) => <span>{label}</span>,
}));
vi.mock("../../components/common/AdvancedSearchBar", () => ({
  default: ({ onSearch, data }) => (
    <div data-testid="search-bar">
      <button data-testid="trigger-search" onClick={() => onSearch(data)}>
        Search
      </button>
    </div>
  ),
}));
vi.mock("../../components/common/ConfirmationModal", () => ({
  default: ({ open, onClose, onConfirm, title, loading }) =>
    open ? (
      <div data-testid="confirmation-modal">
        <span>{title}</span>
        <button
          onClick={onConfirm}
          disabled={loading}
          data-testid="confirm-btn"
        >
          Confirm
        </button>
        <button onClick={onClose} data-testid="cancel-btn">
          Cancel
        </button>
      </div>
    ) : null,
}));

import { getCenters, deleteCenter } from "../../services/data.service";
import OrganizationCentersPage from "../../pages/OrganizationManagement/OrganizationCentersPage";

const mockCenters = [
  {
    id: "center-1",
    center_name: "Mumbai Training Hub",
    partner_name: "TechSkills Academy",
    center_type: "Urban",
    region: "West",
    center_head: "Anjali Singh",
    email: "hub@techskills.org",
    mobile_number: "+91-9812345678",
    address: "12 Industrial Zone",
    city: "Mumbai",
    state: "Maharashtra",
    courses_offered: ["Plumbing", "Electrical"],
    year_of_establishment: 2019,
    total_students: 145,
    status: "active",
  },
  {
    id: "center-2",
    center_name: "Delhi Skill Center",
    partner_name: "Digital Foundation",
    center_type: "Rural",
    region: "North",
    center_head: null,
    email: null,
    mobile_number: null,
    address: "45 Village Road",
    city: "Delhi",
    state: "Delhi",
    courses_offered: [],
    year_of_establishment: null,
    total_students: 0,
    status: "inactive",
  },
];

describe("OrganizationCentersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCenters.mockResolvedValue({ success: true, data: mockCenters });
  });

  it("renders loading state initially", async () => {
    getCenters.mockReturnValue(new Promise(() => {}));
    render(<OrganizationCentersPage />);
    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });

  it("renders center data after fetch", async () => {
    render(<OrganizationCentersPage />);
    await waitFor(() => expect(getCenters).toHaveBeenCalledOnce());
    expect(screen.getByTestId("data-table")).toBeInTheDocument();
  });

  it("calls getCenters with approval_status=approved", async () => {
    render(<OrganizationCentersPage />);
    await waitFor(() =>
      expect(getCenters).toHaveBeenCalledWith(
        expect.objectContaining({ approval_status: "approved" }),
      ),
    );
  });

  describe("View Center Details dialog", () => {
    it("opens view dialog when Eye button clicked", async () => {
      render(<OrganizationCentersPage />);
      await waitFor(() => expect(getCenters).toHaveBeenCalled());

      const actionCell = screen.getByTestId("actions-0");
      const eyeBtn = actionCell.querySelectorAll("button")[0];
      fireEvent.click(eyeBtn);

      await waitFor(() => {
        expect(screen.getByText("Center Details")).toBeInTheDocument();
        expect(screen.getByText("Mumbai Training Hub")).toBeInTheDocument();
        expect(screen.getByText("TechSkills Academy")).toBeInTheDocument();
        expect(screen.getByText("Urban")).toBeInTheDocument();
        expect(screen.getByText("Anjali Singh")).toBeInTheDocument();
        expect(screen.getByText("hub@techskills.org")).toBeInTheDocument();
      });
    });

    it("shows courses as badges in view dialog", async () => {
      render(<OrganizationCentersPage />);
      await waitFor(() => expect(getCenters).toHaveBeenCalled());

      const actionCell = screen.getByTestId("actions-0");
      fireEvent.click(actionCell.querySelectorAll("button")[0]);

      await waitFor(() => {
        expect(screen.getByText("Plumbing")).toBeInTheDocument();
        expect(screen.getByText("Electrical")).toBeInTheDocument();
      });
    });

    it("shows total_students count in view dialog", async () => {
      render(<OrganizationCentersPage />);
      await waitFor(() => expect(getCenters).toHaveBeenCalled());

      const actionCell = screen.getByTestId("actions-0");
      fireEvent.click(actionCell.querySelectorAll("button")[0]);

      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        expect(within(dialog).getByText("145")).toBeInTheDocument();
      });
    });

    it("handles null/empty center fields gracefully", async () => {
      render(<OrganizationCentersPage />);
      await waitFor(() => expect(getCenters).toHaveBeenCalled());

      // Open view for center-2 which has many null fields
      const actionCell = screen.getByTestId("actions-1");
      fireEvent.click(actionCell.querySelectorAll("button")[0]);

      await waitFor(() => {
        expect(screen.getByText("Center Details")).toBeInTheDocument();
        expect(screen.getByText("Delhi Skill Center")).toBeInTheDocument();
        // Null fields show dash
        const dashes = screen.getAllByText("—");
        expect(dashes.length).toBeGreaterThan(0);
      });
    });

    it("closes view dialog on Close button click", async () => {
      render(<OrganizationCentersPage />);
      await waitFor(() => expect(getCenters).toHaveBeenCalled());

      const actionCell = screen.getByTestId("actions-0");
      fireEvent.click(actionCell.querySelectorAll("button")[0]);

      await waitFor(() =>
        expect(screen.getByText("Center Details")).toBeInTheDocument(),
      );

      const dialog = screen.getByRole("dialog");
      // The dialog footer has a Close button; X icon also has aria-label Close
      const closeBtns = within(dialog).getAllByRole("button");
      // Click last button which is the footer Close button
      const lastBtn = closeBtns[closeBtns.length - 1];
      fireEvent.click(lastBtn);

      await waitFor(() =>
        expect(screen.queryByText("Center Details")).not.toBeInTheDocument(),
      );
    });
  });

  describe("Delete Center", () => {
    it("opens delete confirmation when trash button clicked", async () => {
      render(<OrganizationCentersPage />);
      await waitFor(() => expect(getCenters).toHaveBeenCalled());

      const actionCell = screen.getByTestId("actions-0");
      const trashBtn = actionCell.querySelectorAll("button")[2]; // Trash is 3rd button
      fireEvent.click(trashBtn);

      await waitFor(() => {
        expect(screen.getByTestId("confirmation-modal")).toBeInTheDocument();
        expect(screen.getByText("Delete Center")).toBeInTheDocument();
      });
    });

    it("calls deleteCenter and refreshes on confirm", async () => {
      deleteCenter.mockResolvedValue({ success: true });
      render(<OrganizationCentersPage />);
      await waitFor(() => expect(getCenters).toHaveBeenCalled());

      const actionCell = screen.getByTestId("actions-0");
      fireEvent.click(actionCell.querySelectorAll("button")[2]);

      await waitFor(() =>
        expect(screen.getByTestId("confirmation-modal")).toBeInTheDocument(),
      );

      fireEvent.click(screen.getByTestId("confirm-btn"));
      await waitFor(() =>
        expect(deleteCenter).toHaveBeenCalledWith("center-1"),
      );
      expect(getCenters).toHaveBeenCalledTimes(2);
    });
  });

  describe("Export CSV", () => {
    it("shows warning when no data to export", async () => {
      const { toast } = await import("react-toastify");
      getCenters.mockResolvedValue({ success: true, data: [] });
      render(<OrganizationCentersPage />);
      await waitFor(() => expect(getCenters).toHaveBeenCalled());

      const exportBtn = screen.getByRole("button", { name: /export csv/i });
      fireEvent.click(exportBtn);

      expect(toast.warn).toHaveBeenCalled();
    });
  });
});
