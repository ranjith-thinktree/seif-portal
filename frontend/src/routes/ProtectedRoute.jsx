import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks";
import { ROUTES } from "../constants";
import { PageLoader } from "../components/common";

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loader while checking authentication
  if (isLoading) {
    return <PageLoader />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // Render children if authenticated
  return children;
};

export default ProtectedRoute;
