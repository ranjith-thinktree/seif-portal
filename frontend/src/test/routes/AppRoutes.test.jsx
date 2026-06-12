import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../../hooks", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../components/common", () => ({
  PageLoader: () => <div>Loading...</div>,
}));

vi.mock("../../components/layout", () => ({
  MainLayout: ({ children }) => <div>{children}</div>,
}));

vi.mock("../../routes/ForcedPasswordChangeGuard", () => ({
  default: ({ children }) => <>{children}</>,
}));

vi.mock("../../pages/Login", () => ({
  LoginPage: () => <div>Login Page</div>,
}));

vi.mock("../../pages/Dashboard", () => ({
  DashboardPage: () => <div>Dashboard Page</div>,
}));

vi.mock("../../pages/NotFound", () => ({
  NotFoundPage: () => <div>Not Found Page</div>,
}));

vi.mock("../../pages/Upload", () => ({
  UploadPage: () => <div>Upload Page</div>,
}));

vi.mock("../../pages/Upload/UploadHistoryPage", () => ({
  default: () => <div>Upload History Page</div>,
}));

vi.mock("../../pages/Inbox", () => ({
  InboxPage: () => <div>Inbox Page</div>,
}));

vi.mock("../../pages/Review", () => ({
  ReviewPage: () => <div>Review Page</div>,
  ReviewCentersPage: () => <div>Review Centers Page</div>,
  ReviewStudentsPage: () => <div>Review Students Page</div>,
  RejectedUploadsPage: () => <div>Rejected Uploads Page</div>,
}));

vi.mock("../../pages/Review/PendingCentersReviewPage", () => ({
  default: () => <div>Pending Centers Review Page</div>,
}));

vi.mock("../../pages/Profile", () => ({
  ProfilePage: () => <div>Profile Page</div>,
  ChangePasswordPage: () => <div>Change Password Page</div>,
}));

vi.mock("../../pages/Data/PartnersPage", () => ({
  default: () => <div>Partners Page</div>,
}));

vi.mock("../../pages/Partner/PartnerReviewEditPage", () => ({
  default: () => <div>Partner Review Edit Page</div>,
}));

vi.mock("../../pages/Partner/RejectedUploadsPage", () => ({
  default: () => <div>Partner Rejected Uploads Page</div>,
}));

vi.mock("../../pages/Partner/PartnerRejectedCentersPage", () => ({
  default: () => <div>Partner Rejected Centers Page</div>,
}));

vi.mock("../../pages/Partner/PartnerReviewStudentsPage", () => ({
  default: () => <div>Partner Review Students Page</div>,
}));

vi.mock("../../pages/Data/CentersPage", () => ({
  default: () => <div>Centers Page</div>,
}));

vi.mock("../../pages/Data/MyCentersPage", () => ({
  default: () => <div>My Centers Page</div>,
}));

vi.mock("../../pages/Data/CenterDetailsPage", () => ({
  default: () => <div>Center Details Page</div>,
}));

vi.mock("../../pages/Data/StudentsPage", () => ({
  default: () => <div>Students Page</div>,
}));

vi.mock("../../pages/Data/DataManagementPage", () => ({
  default: () => <div>Data Management Page</div>,
}));

vi.mock("../../pages/Admin/DatabaseManagement", () => ({
  default: () => <div>Database Management Page</div>,
}));

vi.mock("../../pages/Admin/AdminTerminalPageV2", () => ({
  default: () => <div>Admin Terminal Page</div>,
}));

vi.mock("../../pages/Refurbishment", () => ({
  default: () => <div>Refurbishment Dashboard</div>,
}));

vi.mock("../../pages/UserManagement/UserManagementPage", () => ({
  default: () => <div>User Management Page</div>,
}));

vi.mock("../../pages/OrganizationManagementPage", () => ({
  default: () => <div>Organization Management Page</div>,
}));

vi.mock("../../pages/CoursesManagementPage", () => ({
  default: () => <div>Courses Management Page</div>,
}));

vi.mock("../../pages/EmploymentUploadPage", () => ({
  default: () => <div>Employment Upload Page</div>,
}));

vi.mock("../../pages/Admin/EmploymentManagementPage", () => ({
  default: () => <div>Employment Management Page</div>,
}));

vi.mock("../../pages/Partner/MyDataPage", () => ({
  default: () => <div>My Data Page</div>,
}));

vi.mock("../../pages/Partner/MyRequestsPage", () => ({
  default: () => <div>My Requests Page</div>,
}));

vi.mock("../../pages/Partner/CertificatesPage", () => ({
  default: () => <div>Certificates Page</div>,
}));

vi.mock("../../pages/ESSCI/ESSCIDataPage", () => ({
  default: () => <div>ESSCI Data Page</div>,
}));

vi.mock("../../pages/ESSCI/ESSCIBatchDetailPage", () => ({
  default: () => <div>ESSCI Batch Detail Page</div>,
}));

vi.mock("../../pages/Settings/SettingsPage", () => ({
  default: () => <div>Settings Page</div>,
}));

vi.mock("../../pages/Help/HelpPage", () => ({
  default: () => <div>Help Page</div>,
}));

import { useAuth } from "../../hooks";
import AppRoutes from "../../routes/AppRoutes";
import { ROLES } from "../../constants/roles";
import { ROUTES } from "../../constants/routes";

const renderRoute = (path, authOverrides = {}) => {
  window.history.pushState({}, "", path);

  useAuth.mockReturnValue({
    isAuthenticated: true,
    isLoading: false,
    role: ROLES.ADMIN,
    user: null,
    ...authOverrides,
  });

  return render(<AppRoutes />);
};

describe("AppRoutes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders admin-only routes for admin users", () => {
    renderRoute(ROUTES.COURSES_MANAGEMENT, { role: ROLES.ADMIN });

    expect(screen.getByText("Courses Management Page")).toBeInTheDocument();
  });

  it("renders upload history for admin users", () => {
    renderRoute(ROUTES.DATA_UPLOADS, { role: ROLES.ADMIN });

    expect(screen.getByText("Upload History Page")).toBeInTheDocument();
  });

  it("redirects partner users away from admin-only routes", () => {
    renderRoute(ROUTES.COURSES_MANAGEMENT, { role: ROLES.PARTNER });

    expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
    expect(
      screen.queryByText("Courses Management Page"),
    ).not.toBeInTheDocument();
  });

  it("redirects partner users away from upload history", () => {
    renderRoute(ROUTES.DATA_UPLOADS, { role: ROLES.PARTNER });

    expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
    expect(screen.queryByText("Upload History Page")).not.toBeInTheDocument();
  });

  it("redirects admin users away from super-admin-only routes", () => {
    renderRoute(ROUTES.ADMIN_TERMINAL, { role: ROLES.ADMIN });

    expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
    expect(screen.queryByText("Admin Terminal Page")).not.toBeInTheDocument();
  });

  it("preserves allowed partner access for non-admin routes", () => {
    renderRoute(ROUTES.MY_DATA, { role: ROLES.PARTNER });

    expect(screen.getByText("My Data Page")).toBeInTheDocument();
  });
});
