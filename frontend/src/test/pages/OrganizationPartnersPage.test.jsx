import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";

// --- Mocks ---
vi.mock("react-redux", () => ({
  useSelector: vi.fn((selector) =>
    selector({ auth: { user: { role: "ADMIN" } } }),
  ),
}));
vi.mock("../../components/ui/dialog", () => ({
  Dialog: ({ open, onOpenChange, children }) =>
    open ? (
      <div role="dialog" aria-modal="true">
        {children}
      </div>
    ) : null,
  DialogContent: ({ children, className }) => (
    <div className={className}>{children}</div>
  ),
  DialogHeader: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children }) => <h2>{children}</h2>,
  DialogDescription: ({ children }) => <p>{children}</p>,
  DialogFooter: ({ children }) => <div>{children}</div>,
}));
vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));
vi.mock("../../services/data.service", () => ({
  getPartners: vi.fn(),
  getPartnerById: vi.fn(),
  createPartner: vi.fn(),
  updatePartner: vi.fn(),
  deletePartner: vi.fn(),
}));
vi.mock("../../components/forms/PartnerForm", () => ({
  default: ({ partner, onCancel }) => (
    <div data-testid="partner-form">
      <span>{partner ? "Edit Partner" : "Create New Partner"}</span>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));
vi.mock("../../components/layout/MainLayout", () => ({
  default: ({ children }) => <div data-testid="main-layout">{children}</div>,
}));
vi.mock("../../components/ui/dropdown-menu", () => {
  const DropdownContext = React.createContext(null);

  return {
    DropdownMenu: ({ children }) => {
      const [open, setOpen] = React.useState(false);
      return (
        <DropdownContext.Provider value={{ open, setOpen }}>
          <div>{children}</div>
        </DropdownContext.Provider>
      );
    },
    DropdownMenuTrigger: ({ children, asChild }) => {
      const context = React.useContext(DropdownContext);
      const handleClick = () => context.setOpen((value) => !value);

      if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children, {
          onClick: handleClick,
        });
      }

      return <button onClick={handleClick}>{children}</button>;
    },
    DropdownMenuContent: ({ children }) => {
      const context = React.useContext(DropdownContext);
      return context.open ? <div>{children}</div> : null;
    },
    DropdownMenuItem: ({ children, onClick, className }) => (
      <button onClick={onClick} className={className} type="button">
        {children}
      </button>
    ),
    DropdownMenuLabel: ({ children }) => <div>{children}</div>,
    DropdownMenuSeparator: () => <hr />,
  };
});
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
import OrganizationPartnersPage from "../../pages/OrganizationManagement/OrganizationPartnersPage";

const openRowMenu = async (rowIndex) => {
  const actionCell = screen.getByTestId(`actions-${rowIndex}`);
  const menuButton = within(actionCell).getByRole("button", {
    name: /open menu/i,
  });
  fireEvent.click(menuButton);
  return actionCell;
};

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

      const actionCell = await openRowMenu(0);
      fireEvent.click(within(actionCell).getByText("View Details"));

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

      const actionCell = await openRowMenu(0);
      fireEvent.click(within(actionCell).getByText("View Details"));

      await waitFor(() => {
        expect(screen.getByText("Partner Details")).toBeInTheDocument();
        const dialog = screen.getByRole("dialog");
        const d = within(dialog);
        expect(d.getByText("3")).toBeInTheDocument();
      });
    });

    it("closes view dialog on Close button click", async () => {
      render(<OrganizationPartnersPage />);
      await waitFor(() => expect(getPartners).toHaveBeenCalled());

      const actionCell = await openRowMenu(0);
      fireEvent.click(within(actionCell).getByText("View Details"));

      await waitFor(() =>
        expect(screen.getByText("Partner Details")).toBeInTheDocument(),
      );

      const dialog = screen.getByRole("dialog");
      const closeButtons = within(dialog).getAllByRole("button", {
        name: /^close$/i,
      });
      fireEvent.click(closeButtons[0]);

      await waitFor(() =>
        expect(screen.queryByText("Partner Details")).not.toBeInTheDocument(),
      );
    });
  });

  describe("Delete dialog", () => {
    it("shows blocked delete dialog when partner has centers", async () => {
      render(<OrganizationPartnersPage />);
      await waitFor(() => expect(getPartners).toHaveBeenCalled());

      const actionCell = await openRowMenu(0);
      fireEvent.click(within(actionCell).getByText("Delete"));

      await waitFor(() => {
        expect(screen.getByText("Cannot Delete Partner")).toBeInTheDocument();
      });
    });

    it("shows normal delete dialog when partner has no centers", async () => {
      render(<OrganizationPartnersPage />);
      await waitFor(() => expect(getPartners).toHaveBeenCalled());

      const actionCell = await openRowMenu(1);
      fireEvent.click(within(actionCell).getByText("Delete"));

      await waitFor(() => {
        expect(screen.getByTestId("confirmation-modal")).toBeInTheDocument();
        expect(screen.getByText("Delete Partner")).toBeInTheDocument();
      });
    });

    it("calls deletePartner and refreshes on confirm", async () => {
      deletePartner.mockResolvedValue({ success: true });
      render(<OrganizationPartnersPage />);
      await waitFor(() => expect(getPartners).toHaveBeenCalled());

      const actionCell = await openRowMenu(1);
      fireEvent.click(within(actionCell).getByText("Delete"));

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

  describe("Ownership flow", () => {
    it("shows only view, edit, and delete in the partner row actions", async () => {
      render(<OrganizationPartnersPage />);
      await waitFor(() => expect(getPartners).toHaveBeenCalled());

      const actionCell = await openRowMenu(0);

      expect(within(actionCell).getByText("View Details")).toBeInTheDocument();
      expect(within(actionCell).getByText("Edit")).toBeInTheDocument();
      expect(within(actionCell).getByText("Delete")).toBeInTheDocument();
      expect(
        within(actionCell).queryByText("Reset Password"),
      ).not.toBeInTheDocument();
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
