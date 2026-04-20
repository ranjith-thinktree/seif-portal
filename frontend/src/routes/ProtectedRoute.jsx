import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks";
import { ROUTES } from "../constants";
import { PageLoader } from "../components/common";

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, role } = useAuth();

  // Show loader while checking authentication
  if (isLoading) {
    return <PageLoader />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (allowedRoles?.length && (!role || !allowedRoles.includes(role))) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  // Render children if authenticated
  return children;
};

export default ProtectedRoute;
