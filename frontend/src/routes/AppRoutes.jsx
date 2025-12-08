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
import PartnersPage from "../pages/Data/PartnersPage";
import PartnerReviewEditPage from "../pages/Partner/PartnerReviewEditPage";
import PartnerRejectedUploadsPage from "../pages/Partner/RejectedUploadsPage";
import PartnerRejectedCentersPage from "../pages/Partner/PartnerRejectedCentersPage";
import PartnerReviewStudentsPage from "../pages/Partner/PartnerReviewStudentsPage";
import CentersPage from "../pages/Data/CentersPage";
import MyCentersPage from "../pages/Data/MyCentersPage";
import CenterDetailsPage from "../pages/Data/CenterDetailsPage";
import StudentsPage from "../pages/Data/StudentsPage";
import DatabaseManagement from "../pages/Admin/DatabaseManagement";

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
      <Routes>
        {/* Redirect root to dashboard */}
        <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />

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
              <PlaceholderPage title="Profile" />
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
              <PlaceholderPage title="My Data" />
            </ProtectedRoute>
          }
        />

        <Route
          path={ROUTES.MY_REQUESTS}
          element={
            <ProtectedRoute>
              <PlaceholderPage title="My Requests" />
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
          path={ROUTES.ANALYTICS}
          element={
            <ProtectedRoute>
              <PlaceholderPage title="Analytics" />
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
              <PlaceholderPage title="Settings" />
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

        {/* 404 Not Found */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
