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
vi.mock("../../services/user.service", () => ({
  getUsers: vi.fn(),
  getUserFilterOptions: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  updateUserStatus: vi.fn(),
  resetUserPassword: vi.fn(),
}));
vi.mock("../../hooks", () => ({
  useAuth: vi.fn(),
}));
vi.mock("../../components/layout", () => ({
  MainLayout: ({ children }) => <div data-testid="main-layout">{children}</div>,
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
  default: ({ onSearchChange }) => (
    <input
      data-testid="search-input"
      onChange={(e) => onSearchChange(e.target.value)}
    />
  ),
}));
vi.mock("../../components/common/ConfirmationModal", () => ({
  default: ({ isOpen, onClose, onConfirm, title, isLoading }) =>
    isOpen ? (
      <div data-testid="confirmation-modal">
        <span data-testid="modal-title">{title}</span>
        <button
          onClick={onConfirm}
          disabled={isLoading}
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

import {
  getUsers,
  getUserFilterOptions,
  createUser,
  updateUser,
  deleteUser,
  updateUserStatus,
  resetUserPassword,
} from "../../services/user.service";
import { useAuth } from "../../hooks";
import UserManagementPage from "../../pages/UserManagement/UserManagementPage";

const mockUsers = [
  {
    id: "user-1",
    email: "admin@seif.org",
    full_name: "Admin User",
    mobile_number: "+91-9000000001",
    role: "ADMIN",
    partner_id: null,
    partner_name: null,
    status: "active",
    last_login_at: "2025-01-01T10:00:00Z",
    created_at: "2024-01-15T08:00:00Z",
  },
  {
    id: "user-2",
    email: "partner@techskills.org",
    full_name: "Partner User",
    mobile_number: "+91-9000000002",
    role: "PARTNER",
    partner_id: "partner-1",
    partner_name: "TechSkills Academy",
    status: "active",
    last_login_at: null,
    created_at: "2024-03-10T09:00:00Z",
  },
  {
    id: "user-3",
    email: "readonly@seif.org",
    full_name: "Readonly User",
    mobile_number: null,
    role: "SEIF_READONLY",
    partner_id: null,
    partner_name: null,
    status: "inactive",
    last_login_at: null,
    created_at: "2024-06-20T11:00:00Z",
  },
];

const mockUserResponse = {
  success: true,
  data: {
    users: mockUsers,
    total: 3,
    page: 1,
    limit: 10,
  },
};

const mockFilterOptions = {
  success: true,
  data: {
    roles: ["ADMIN", "PARTNER", "ESSCI", "SEIF_READONLY"],
    statuses: ["active", "inactive", "suspended"],
    partners: [{ id: "partner-1", name: "TechSkills Academy" }],
  },
};

describe("UserManagementPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ role: "ADMIN", userId: "current-admin-id" });
    getUsers.mockResolvedValue(mockUserResponse);
    getUserFilterOptions.mockResolvedValue(mockFilterOptions);
  });

  it("renders page header", async () => {
    render(<UserManagementPage />);
    await waitFor(() => expect(getUsers).toHaveBeenCalled());
    expect(screen.getByText("User Management")).toBeInTheDocument();
  });

  it("shows Create User button for ADMIN", async () => {
    render(<UserManagementPage />);
    await waitFor(() => expect(getUsers).toHaveBeenCalled());
    expect(
      screen.getByRole("button", { name: /create user/i }),
    ).toBeInTheDocument();
  });

  it("does not show Create User button for non-admin roles", async () => {
    useAuth.mockReturnValue({ role: "SEIF_READONLY", userId: "readonly-id" });
    render(<UserManagementPage />);
    await waitFor(() => expect(getUsers).toHaveBeenCalled());
    expect(
      screen.queryByRole("button", { name: /create user/i }),
    ).not.toBeInTheDocument();
  });

  it("calls getUsers on mount", async () => {
    render(<UserManagementPage />);
    await waitFor(() => expect(getUsers).toHaveBeenCalledOnce());
  });

  it("calls getUserFilterOptions on mount", async () => {
    render(<UserManagementPage />);
    await waitFor(() => expect(getUserFilterOptions).toHaveBeenCalledOnce());
  });

  it("renders data table after fetch", async () => {
    render(<UserManagementPage />);
    await waitFor(() => expect(getUsers).toHaveBeenCalled());
    expect(screen.getByTestId("data-table")).toBeInTheDocument();
  });

  describe("View User modal", () => {
    it("opens view modal when Eye button clicked", async () => {
      render(<UserManagementPage />);
      await waitFor(() => expect(getUsers).toHaveBeenCalled());

      const actionCell = screen.getByTestId("actions-0");
      const eyeBtn = actionCell.querySelector("button");
      fireEvent.click(eyeBtn);

      await waitFor(() => {
        expect(screen.getByText("User Details")).toBeInTheDocument();
        expect(screen.getByText("Admin User")).toBeInTheDocument();
        expect(screen.getByText("admin@seif.org")).toBeInTheDocument();
        expect(screen.getByText("+91-9000000001")).toBeInTheDocument();
        expect(screen.getByText("ADMIN")).toBeInTheDocument();
      });
    });

    it("shows 'Never' for users who never logged in", async () => {
      render(<UserManagementPage />);
      await waitFor(() => expect(getUsers).toHaveBeenCalled());

      // Open view for user-2 (partner user, never logged in)
      const actionCell = screen.getByTestId("actions-1");
      const eyeBtn = actionCell.querySelector("button");
      fireEvent.click(eyeBtn);

      await waitFor(() => {
        expect(screen.getByText("User Details")).toBeInTheDocument();
        expect(screen.getByText("Never")).toBeInTheDocument();
      });
    });

    it("shows partner name for PARTNER role users", async () => {
      render(<UserManagementPage />);
      await waitFor(() => expect(getUsers).toHaveBeenCalled());

      const actionCell = screen.getByTestId("actions-1");
      const eyeBtn = actionCell.querySelector("button");
      fireEvent.click(eyeBtn);

      await waitFor(() => {
        expect(screen.getByText("TechSkills Academy")).toBeInTheDocument();
      });
    });

    it("shows dash when no partner", async () => {
      render(<UserManagementPage />);
      await waitFor(() => expect(getUsers).toHaveBeenCalled());

      const actionCell = screen.getByTestId("actions-0"); // admin user, no partner
      const eyeBtn = actionCell.querySelector("button");
      fireEvent.click(eyeBtn);

      await waitFor(() => {
        expect(screen.getByText("User Details")).toBeInTheDocument();
        // "-" for partner field
        const dashes = screen.getAllByText("-");
        expect(dashes.length).toBeGreaterThan(0);
      });
    });

    it("closes view modal on Close button", async () => {
      render(<UserManagementPage />);
      await waitFor(() => expect(getUsers).toHaveBeenCalled());

      const actionCell = screen.getByTestId("actions-0");
      fireEvent.click(actionCell.querySelector("button"));

      await waitFor(() =>
        expect(screen.getByText("User Details")).toBeInTheDocument(),
      );

      const dialog = screen.getByRole("dialog");
      // The dialog footer has a Close button; X icon also has aria-label Close
      const closeBtns = within(dialog).getAllByRole("button", {
        name: /close/i,
      });
      fireEvent.click(closeBtns[closeBtns.length - 1]); // Click the footer Close button

      await waitFor(() =>
        expect(screen.queryByText("User Details")).not.toBeInTheDocument(),
      );
    });
  });

  describe("Delete User modal", () => {
    it("does not show Delete button for non-super-admin", async () => {
      useAuth.mockReturnValue({ role: "ADMIN", userId: "current-admin-id" });
      render(<UserManagementPage />);
      await waitFor(() => expect(getUsers).toHaveBeenCalled());

      // ADMIN cannot delete — no trash button visible
      const actionCell = screen.getByTestId("actions-1"); // non-self user
      const buttons = actionCell.querySelectorAll("button");
      // TrashIcon button should NOT be rendered for ADMIN
      const trashTitles = Array.from(buttons).map(
        (b) => b.getAttribute("title") || "",
      );
      expect(trashTitles).not.toContain("Delete User");
    });

    it("shows Delete button for SUPER_ADMIN", async () => {
      useAuth.mockReturnValue({ role: "SUPER_ADMIN", userId: "sa-id" });
      render(<UserManagementPage />);
      await waitFor(() => expect(getUsers).toHaveBeenCalled());

      const actionCell = screen.getByTestId("actions-0");
      const buttons = actionCell.querySelectorAll("button");
      const titles = Array.from(buttons).map(
        (b) => b.getAttribute("title") || "",
      );
      expect(titles).toContain("Delete User");
    });

    it("calls deleteUser on confirmation", async () => {
      useAuth.mockReturnValue({ role: "SUPER_ADMIN", userId: "sa-id" });
      deleteUser.mockResolvedValue({ success: true });
      render(<UserManagementPage />);
      await waitFor(() => expect(getUsers).toHaveBeenCalled());

      // Click Delete User for first user (user-1)
      const actionCell = screen.getByTestId("actions-0");
      const deleteBtn = Array.from(actionCell.querySelectorAll("button")).find(
        (b) => b.getAttribute("title") === "Delete User",
      );
      fireEvent.click(deleteBtn);

      await waitFor(() =>
        expect(screen.getByTestId("modal-title")).toHaveTextContent(
          "Delete User",
        ),
      );

      fireEvent.click(screen.getByTestId("confirm-btn"));
      await waitFor(() => expect(deleteUser).toHaveBeenCalledWith("user-1"));
    });
  });

  describe("Reset Password", () => {
    it("opens reset password confirmation modal", async () => {
      render(<UserManagementPage />);
      await waitFor(() => expect(getUsers).toHaveBeenCalled());

      const actionCell = screen.getByTestId("actions-0");
      const keyBtn = Array.from(actionCell.querySelectorAll("button")).find(
        (b) => b.getAttribute("title") === "Reset Password",
      );
      fireEvent.click(keyBtn);

      await waitFor(() =>
        expect(screen.getByTestId("modal-title")).toHaveTextContent(
          "Reset Password",
        ),
      );
    });

    it("calls resetUserPassword with correct user ID", async () => {
      resetUserPassword.mockResolvedValue({ success: true, data: {} });
      render(<UserManagementPage />);
      await waitFor(() => expect(getUsers).toHaveBeenCalled());

      const actionCell = screen.getByTestId("actions-0");
      const keyBtn = Array.from(actionCell.querySelectorAll("button")).find(
        (b) => b.getAttribute("title") === "Reset Password",
      );
      fireEvent.click(keyBtn);

      await waitFor(() =>
        expect(screen.getByTestId("confirmation-modal")).toBeInTheDocument(),
      );

      fireEvent.click(screen.getByTestId("confirm-btn"));
      await waitFor(() =>
        expect(resetUserPassword).toHaveBeenCalledWith("user-1"),
      );
    });
  });

  describe("Create User modal", () => {
    it("opens create user dialog when Create User button clicked", async () => {
      render(<UserManagementPage />);
      await waitFor(() => expect(getUsers).toHaveBeenCalled());

      const createBtn = screen.getByRole("button", { name: /create user/i });
      fireEvent.click(createBtn);

      await waitFor(() =>
        expect(screen.getByText("Create New User")).toBeInTheDocument(),
      );
    });
  });

  describe("Tab filtering (SUPER_ADMIN security)", () => {
    it("does not show SUPER_ADMIN tab for ADMIN role", async () => {
      useAuth.mockReturnValue({ role: "ADMIN", userId: "admin-id" });
      render(<UserManagementPage />);
      await waitFor(() => expect(getUsers).toHaveBeenCalled());

      // SUPER_ADMIN tab should not be visible
      const nav = document.querySelector("nav");
      if (nav) {
        expect(within(nav).queryByText(/super admin/i)).not.toBeInTheDocument();
      } else {
        expect(
          screen.queryByRole("button", { name: /^super admin$/i }),
        ).not.toBeInTheDocument();
      }
    });

    it("shows SUPER_ADMIN tab for SUPER_ADMIN role", async () => {
      useAuth.mockReturnValue({ role: "SUPER_ADMIN", userId: "sa-id" });
      render(<UserManagementPage />);
      await waitFor(() => expect(getUsers).toHaveBeenCalled());

      const nav = document.querySelector("nav");
      if (nav) {
        expect(within(nav).getByText(/super admin/i)).toBeInTheDocument();
      } else {
        expect(
          screen.getByRole("button", { name: /^super admin$/i }),
        ).toBeInTheDocument();
      }
    });
  });
});
