import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ROUTES } from "../constants";
import ProtectedRoute from "./ProtectedRoute";
import { MainLayout } from "../components/layout";

// Pages
import { LoginPage } from "../pages/Login";
import { DashboardPage } from "../pages/Dashboard";
import { NotFoundPage } from "../pages/NotFound";
import { UploadPage } from "../pages/Upload";
import UploadHistoryPage from "../pages/Upload/UploadHistoryPage";
import { InboxPage } from "../pages/Inbox";
import {
  ReviewPage,
  ReviewCentersPage,
  ReviewStudentsPage,
  RejectedUploadsPage as ReviewRejectedUploadsPage,
} from "../pages/Review";
import PendingCentersReviewPage from "../pages/Review/PendingCentersReviewPage";
import { ProfilePage, ChangePasswordPage } from "../pages/Profile";
import PartnersPage from "../pages/Data/PartnersPage";
import PartnerReviewEditPage from "../pages/Partner/PartnerReviewEditPage";
import PartnerRejectedUploadsPage from "../pages/Partner/RejectedUploadsPage";
import PartnerRejectedCentersPage from "../pages/Partner/PartnerRejectedCentersPage";
import PartnerReviewStudentsPage from "../pages/Partner/PartnerReviewStudentsPage";
import CentersPage from "../pages/Data/CentersPage";
import MyCentersPage from "../pages/Data/MyCentersPage";
import CenterDetailsPage from "../pages/Data/CenterDetailsPage";
import StudentsPage from "../pages/Data/StudentsPage";
import DataManagementPage from "../pages/Data/DataManagementPage";
import DatabaseManagement from "../pages/Admin/DatabaseManagement";
import AdminTerminalPageV2 from "../pages/Admin/AdminTerminalPageV2";
import RefurbishmentDashboard from "../pages/Admin/RefurbishmentDashboard";
import ForcedPasswordChangeGuard from "./ForcedPasswordChangeGuard";
import UserManagementPage from "../pages/UserManagement/UserManagementPage";
import OrganizationManagementPage from "../pages/OrganizationManagementPage";
import EmploymentUploadPage from "../pages/EmploymentUploadPage";
import EmploymentManagementPage from "../pages/Admin/EmploymentManagementPage";
import MyDataPage from "../pages/Partner/MyDataPage";
import MyRequestsPage from "../pages/Partner/MyRequestsPage";
import CertificatesPage from "../pages/Partner/CertificatesPage";
import ESSCIDataPage from "../pages/ESSCI/ESSCIDataPage";
import ESSCIBatchDetailPage from "../pages/ESSCI/ESSCIBatchDetailPage";
import SettingsPage from "../pages/Settings/SettingsPage";
import HelpPage from "../pages/Help/HelpPage";

/**
 * Placeholder page wrapper with MainLayout
 */
const PlaceholderPage = ({ title }) => (
  <MainLayout>
    <div className="p-6">
      <h1 className="text-2xl font-bold text-foreground mb-4">{title}</h1>
      <p className="text-muted-foreground">
        This page is under development and will be available soon.
      </p>
    </div>
  </MainLayout>
);

/**
 * App Routes Configuration
 */
const AppRoutes = () => {
  return (
    <BrowserRouter>
      <ForcedPasswordChangeGuard>
        <Routes>
          {/* Redirect root to dashboard */}
          <Route
            path="/"
            element={<Navigate to={ROUTES.DASHBOARD} replace />}
          />

          {/* Public Routes */}
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />

          {/* Protected Routes */}
          <Route
            path={ROUTES.DASHBOARD}
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Placeholder routes for future pages */}
          <Route
            path={ROUTES.PROFILE}
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.CHANGE_PASSWORD}
            element={
              <ProtectedRoute>
                <ChangePasswordPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.USER_MANAGEMENT}
            element={
              <ProtectedRoute>
                <UserManagementPage />
              </ProtectedRoute>
            }
          />

          {/* Organization Management - Tabbed Interface */}
          <Route
            path={ROUTES.ORGANIZATION_MANAGEMENT}
            element={
              <ProtectedRoute>
                <OrganizationManagementPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ORGANIZATION_PARTNERS}
            element={
              <ProtectedRoute>
                <PlaceholderPage title="Organization Partners" />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ORGANIZATION_CENTERS}
            element={
              <ProtectedRoute>
                <PlaceholderPage title="Organization Centers" />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.USERS}
            element={
              <ProtectedRoute>
                <PlaceholderPage title="User Management" />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.DATA_MANAGEMENT}
            element={
              <ProtectedRoute>
                <DataManagementPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.PARTNERS}
            element={
              <ProtectedRoute>
                <PartnersPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.PARTNER_CENTERS}
            element={
              <ProtectedRoute>
                <CentersPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.CENTER_STUDENTS}
            element={
              <ProtectedRoute>
                <StudentsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.BATCH_STUDENTS}
            element={
              <ProtectedRoute>
                <StudentsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.CENTER_DETAILS}
            element={
              <ProtectedRoute>
                <CenterDetailsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.MY_CENTERS}
            element={
              <ProtectedRoute>
                <MyCentersPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.DATA_UPLOADS}
            element={
              <ProtectedRoute>
                <PlaceholderPage title="Data Uploads" />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.REQUESTS}
            element={
              <ProtectedRoute>
                <PlaceholderPage title="Requests" />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.MY_DATA}
            element={
              <ProtectedRoute>
                <MyDataPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.MY_REQUESTS}
            element={
              <ProtectedRoute>
                <MyRequestsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.UPLOAD_DATA}
            element={
              <ProtectedRoute>
                <UploadPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.UPLOAD_HISTORY}
            element={
              <ProtectedRoute>
                <UploadHistoryPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.EMPLOYMENT_UPLOAD}
            element={
              <ProtectedRoute>
                <EmploymentUploadPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.EMPLOYMENT_MANAGEMENT}
            element={
              <ProtectedRoute>
                <EmploymentManagementPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.INBOX}
            element={
              <ProtectedRoute>
                <InboxPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.REVIEW}
            element={
              <ProtectedRoute>
                <ReviewPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.REVIEW_UPLOAD}
            element={
              <ProtectedRoute>
                <ReviewCentersPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.REVIEW_STUDENTS}
            element={
              <ProtectedRoute>
                <ReviewStudentsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.REVIEW_PENDING_CENTERS}
            element={
              <ProtectedRoute>
                <PendingCentersReviewPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.REJECTED_UPLOAD}
            element={
              <ProtectedRoute>
                <ReviewRejectedUploadsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.PARTNER_REVIEW_EDIT}
            element={
              <ProtectedRoute>
                <PartnerReviewEditPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.PARTNER_REJECTED_UPLOADS}
            element={
              <ProtectedRoute>
                <PartnerRejectedUploadsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.PARTNER_REJECTED_CENTERS}
            element={
              <ProtectedRoute>
                <PartnerRejectedCentersPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.PARTNER_REVIEW_STUDENTS}
            element={
              <ProtectedRoute>
                <PartnerReviewStudentsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.REPORTS}
            element={
              <ProtectedRoute>
                <PlaceholderPage title="Reports" />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.DOWNLOADS}
            element={
              <ProtectedRoute>
                <PlaceholderPage title="Downloads" />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.NOTIFICATIONS}
            element={
              <ProtectedRoute>
                <PlaceholderPage title="Notifications" />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.SETTINGS}
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.DATABASE_MANAGEMENT}
            element={
              <ProtectedRoute>
                <DatabaseManagement />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ADMIN_TERMINAL}
            element={
              <ProtectedRoute>
                <AdminTerminalPageV2 />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.REFURBISHMENT}
            element={
              <ProtectedRoute>
                <RefurbishmentDashboard />
              </ProtectedRoute>
            }
          />

          {/* Partner Certification */}
          <Route
            path={ROUTES.PARTNER_CERTIFICATES}
            element={
              <ProtectedRoute>
                <CertificatesPage />
              </ProtectedRoute>
            }
          />

          {/* ESSCI Certification */}
          <Route
            path={ROUTES.ESSCI_DATA}
            element={
              <ProtectedRoute>
                <ESSCIDataPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.ESSCI_DATA_DETAIL}
            element={
              <ProtectedRoute>
                <ESSCIBatchDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.HELP}
            element={
              <ProtectedRoute>
                <HelpPage />
              </ProtectedRoute>
            }
          />

          {/* 404 Not Found */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </ForcedPasswordChangeGuard>
    </BrowserRouter>
  );
};

export default AppRoutes;
