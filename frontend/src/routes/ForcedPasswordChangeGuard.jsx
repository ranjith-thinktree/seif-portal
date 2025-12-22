import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks";
import { ROUTES } from "../constants";
import { PageLoader } from "../components/common";
import { MainLayout } from "../components/layout";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

/**
 * ForcedPasswordChangeGuard
 * Checks if user must change password and enforces it
 * Blocks access to all routes except change-password if flag is set
 */
const ForcedPasswordChangeGuard = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isAuthenticated && user) {
      const mustChangePassword =
        user.must_change_password === 1 || user.must_change_password === true;
      const isOnChangePasswordPage =
        location.pathname === ROUTES.CHANGE_PASSWORD;
      const isOnLoginPage = location.pathname === ROUTES.LOGIN;

      // If user must change password and they're not on the change password page
      if (mustChangePassword && !isOnChangePasswordPage && !isOnLoginPage) {
        // Redirect to change password page
        navigate(ROUTES.CHANGE_PASSWORD, { replace: true });
      }

      setChecking(false);
    } else if (isAuthenticated === false) {
      setChecking(false);
    }
  }, [user, isAuthenticated, location.pathname, navigate]);

  // Show loader while checking
  if (checking && isAuthenticated) {
    return <PageLoader />;
  }

  // Show forced password change banner if on change password page and flag is set
  const mustChangePassword =
    user?.must_change_password === 1 || user?.must_change_password === true;
  const isOnChangePasswordPage = location.pathname === ROUTES.CHANGE_PASSWORD;

  if (mustChangePassword && isOnChangePasswordPage) {
    return (
      <>
        {/* Warning Banner */}
        <div className="bg-orange-50 border-b-2 border-orange-200">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-orange-900 mb-1">
                  Password Change Required
                </h3>
                <p className="text-sm text-orange-800">
                  You must change your password before accessing the system.
                  This is required for security purposes.
                </p>
                {user?.first_login && (
                  <p className="text-xs text-orange-700 mt-1">
                    This is your first login. Please create a new secure
                    password.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        {children}
      </>
    );
  }

  return children;
};

export default ForcedPasswordChangeGuard;
