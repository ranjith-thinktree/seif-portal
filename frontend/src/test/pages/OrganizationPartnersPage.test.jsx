import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// --- Mocks ---
vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));
vi.mock("../../services/data.service", () => ({
  getPartners: vi.fn(),
  deletePartner: vi.fn(),
}));
vi.mock("../../services/user.service", () => ({
  resetUserPassword: vi.fn(),
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

import { getPartners, deletePartner } from "../../services/data.service";
import { resetUserPassword } from "../../services/user.service";
import OrganizationPartnersPage from "../../pages/OrganizationManagement/OrganizationPartnersPage";

const mockPartners = [
  {
    id: "partner-1",
    user_id: "user-1",
    name: "TechSkills Academy",
    partner_id: "TECH001",
    organization_type: "NGO",
    status: "active",
    contact_person: "Ravi Kumar",
    contact_email: "ravi@techskills.org",
    contact_phone: "+91-9876543210",
    address_line1: "123 Main Street",
    address_line2: "",
    city: "Mumbai",
    state: "Maharashtra",
    postal_code: "400001",
    total_centers: 3,
  },
  {
    id: "partner-2",
    user_id: "user-2",
    name: "Digital Foundation",
    partner_id: "DIG002",
    organization_type: "Trust",
    status: "inactive",
    contact_person: "Sita Devi",
    contact_email: "sita@digitalfound.org",
    contact_phone: "+91-8765432109",
    address_line1: "456 Park Avenue",
    address_line2: null,
    city: "Delhi",
    state: "Delhi",
    postal_code: "110001",
    total_centers: 0,
  },
];

describe("OrganizationPartnersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPartners.mockResolvedValue({ success: true, data: mockPartners });
  });

  it("renders loading state initially", async () => {
    getPartners.mockReturnValue(new Promise(() => {})); // never resolves
    render(<OrganizationPartnersPage />);
    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });

  it("renders partner data after fetch", async () => {
    render(<OrganizationPartnersPage />);
    await waitFor(() => expect(getPartners).toHaveBeenCalledOnce());
    expect(screen.getByTestId("data-table")).toBeInTheDocument();
  });

  it("calls getPartners with approval_status=approved", async () => {
    render(<OrganizationPartnersPage />);
    await waitFor(() =>
      expect(getPartners).toHaveBeenCalledWith(
        expect.objectContaining({ approval_status: "approved" }),
      ),
    );
  });

  describe("View Partner Details dialog", () => {
    it("opens view dialog when Eye button clicked", async () => {
      render(<OrganizationPartnersPage />);
      await waitFor(() => expect(getPartners).toHaveBeenCalled());

      // Click the first Eye button (actions-0)
      const actionCell = screen.getByTestId("actions-0");
      const buttons = actionCell.querySelectorAll("button");
      fireEvent.click(buttons[0]); // Eye button is first

      await waitFor(() => {
        expect(screen.getByText("Partner Details")).toBeInTheDocument();
        expect(screen.getByText("TechSkills Academy")).toBeInTheDocument();
        expect(screen.getByText("TECH001")).toBeInTheDocument();
        expect(screen.getByText("NGO")).toBeInTheDocument();
        expect(screen.getByText("Ravi Kumar")).toBeInTheDocument();
        expect(screen.getByText("ravi@techskills.org")).toBeInTheDocument();
      });
    });

    it("displays total_centers count in view dialog", async () => {
      render(<OrganizationPartnersPage />);
      await waitFor(() => expect(getPartners).toHaveBeenCalled());

      const actionCell = screen.getByTestId("actions-0");
      const buttons = actionCell.querySelectorAll("button");
      fireEvent.click(buttons[0]);

      await waitFor(() => {
        expect(screen.getByText("Partner Details")).toBeInTheDocument();
        const dialog = screen.getByRole("dialog");
        const d = within(dialog);
        // 3 centers shown in the detail
        expect(d.getByText("3")).toBeInTheDocument();
      });
    });

    it("closes view dialog on Close button click", async () => {
      render(<OrganizationPartnersPage />);
      await waitFor(() => expect(getPartners).toHaveBeenCalled());

      const actionCell = screen.getByTestId("actions-0");
      fireEvent.click(actionCell.querySelectorAll("button")[0]);

      await waitFor(() =>
        expect(screen.getByText("Partner Details")).toBeInTheDocument(),
      );

      const dialog = screen.getByRole("dialog");
      // The dialog footer has a Close button; X icon also has aria-label Close
      const closeBtns = within(dialog).getAllByRole("button", {
        name: /close/i,
      });
      fireEvent.click(closeBtns[closeBtns.length - 1]); // Click the footer Close button

      await waitFor(() =>
        expect(screen.queryByText("Partner Details")).not.toBeInTheDocument(),
      );
    });
  });

  describe("Delete dialog", () => {
    it("shows blocked delete dialog when partner has centers", async () => {
      render(<OrganizationPartnersPage />);
      await waitFor(() => expect(getPartners).toHaveBeenCalled());

      // partner-1 has total_centers=3 → blocked dialog
      const actionCell = screen.getByTestId("actions-0");
      const trashBtn = actionCell.querySelectorAll("button")[3]; // trash is 4th button
      fireEvent.click(trashBtn);

      await waitFor(() => {
        expect(screen.getByText("Cannot Delete Partner")).toBeInTheDocument();
      });
    });

    it("shows normal delete dialog when partner has no centers", async () => {
      render(<OrganizationPartnersPage />);
      await waitFor(() => expect(getPartners).toHaveBeenCalled());

      // partner-2 has total_centers=0 → normal delete
      const actionCell = screen.getByTestId("actions-1");
      const trashBtn = actionCell.querySelectorAll("button")[3];
      fireEvent.click(trashBtn);

      await waitFor(() => {
        expect(screen.getByTestId("confirmation-modal")).toBeInTheDocument();
        expect(screen.getByText("Delete Partner")).toBeInTheDocument();
      });
    });

    it("calls deletePartner and refreshes on confirm", async () => {
      deletePartner.mockResolvedValue({ success: true });
      render(<OrganizationPartnersPage />);
      await waitFor(() => expect(getPartners).toHaveBeenCalled());

      const actionCell = screen.getByTestId("actions-1"); // partner with 0 centers
      const trashBtn = actionCell.querySelectorAll("button")[3];
      fireEvent.click(trashBtn);

      await waitFor(() =>
        expect(screen.getByTestId("confirmation-modal")).toBeInTheDocument(),
      );

      fireEvent.click(screen.getByTestId("confirm-btn"));
      await waitFor(() =>
        expect(deletePartner).toHaveBeenCalledWith("partner-2"),
      );
      expect(getPartners).toHaveBeenCalledTimes(2); // initial + refresh
    });
  });

  describe("Reset Password", () => {
    it("calls resetUserPassword with user_id (not partner.id)", async () => {
      resetUserPassword.mockResolvedValue({ success: true });
      render(<OrganizationPartnersPage />);
      await waitFor(() => expect(getPartners).toHaveBeenCalled());

      const actionCell = screen.getByTestId("actions-0");
      const keyBtn = actionCell.querySelectorAll("button")[2]; // Key is 3rd button
      fireEvent.click(keyBtn);

      await waitFor(() =>
        expect(screen.getByText("Reset Password")).toBeInTheDocument(),
      );

      const sendBtn = screen.getByRole("button", { name: /send reset link/i });
      fireEvent.click(sendBtn);

      await waitFor(
        () => expect(resetUserPassword).toHaveBeenCalledWith("user-1"), // user_id, not "partner-1"
      );
    });
  });

  describe("Export CSV", () => {
    it("shows warning toast when no data", async () => {
      const { toast } = await import("react-toastify");
      getPartners.mockResolvedValue({ success: true, data: [] });
      render(<OrganizationPartnersPage />);
      await waitFor(() => expect(getPartners).toHaveBeenCalled());

      const exportBtn = screen.getByRole("button", { name: /export csv/i });
      fireEvent.click(exportBtn);

      expect(toast.warn).toHaveBeenCalled();
    });
  });
});
