import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { MainLayout } from "../../components/layout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  PasswordInput,
  PasswordStrengthMeter,
} from "../../components/common";
import { logout } from "../../store/slices/authSlice";
import { authService } from "../../services";
import { ROUTES } from "../../constants";
import {
  KeyIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

/**
 * ChangePasswordPage Component
 * Allows users to change their password with validation and strength meter
 */
const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user types
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = "Current password is required";
    }

    if (!formData.newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your new password";
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (
      formData.currentPassword &&
      formData.newPassword &&
      formData.currentPassword === formData.newPassword
    ) {
      newErrors.newPassword =
        "New password must be different from current password";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const _response = await authService.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      });

      // Show success state
      setShowSuccess(true);

      // Wait 2 seconds before logout
      setTimeout(async () => {
        try {
          // Logout user
          await dispatch(logout()).unwrap();

          // Show success message
          toast.success(
            "Password changed successfully! Please login with your new password.",
          );

          // Redirect to login
          navigate(ROUTES.LOGIN, { replace: true });
        } catch (error) {
          console.error("Logout error:", error);
          // Force navigation even if logout fails
          window.location.href = "/login";
        }
      }, 2000);
    } catch (error) {
      console.error("Password change error:", error);

      // Handle different error types
      if (error.response?.data?.errors) {
        // Validation errors from backend
        const backendErrors = {};
        const errorsData = error.response.data.errors;

        // Handle both array and object error structures
        const errorList = Array.isArray(errorsData)
          ? errorsData
          : errorsData.errors || errorsData.requirements || [];

        errorList.forEach((err) => {
          // Handle both string errors and object errors with message property
          const errMsg =
            typeof err === "string" ? err : err.message || JSON.stringify(err);

          if (errMsg.toLowerCase().includes("current password")) {
            backendErrors.currentPassword = errMsg;
          } else if (errMsg.toLowerCase().includes("new password")) {
            backendErrors.newPassword = errMsg;
          } else if (
            errMsg.toLowerCase().includes("confirm") ||
            errMsg.toLowerCase().includes("match")
          ) {
            backendErrors.confirmPassword = errMsg;
          } else if (
            errMsg.toLowerCase().includes("reuse") ||
            errMsg.toLowerCase().includes("last 3")
          ) {
            backendErrors.newPassword = errMsg;
          }
        });

        setErrors(backendErrors);
        toast.error(error.response.data.message || "Failed to change password");
      } else if (error.response?.data?.message) {
        // General error message
        toast.error(error.response.data.message);

        // Set appropriate error field
        if (
          error.response.data.message.toLowerCase().includes("current password")
        ) {
          setErrors({ currentPassword: error.response.data.message });
        } else if (
          error.response.data.message.toLowerCase().includes("reuse")
        ) {
          setErrors({ newPassword: error.response.data.message });
        } else {
          setErrors({ general: error.response.data.message });
        }
      } else {
        toast.error("Failed to change password. Please try again.");
      }

      setLoading(false);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    navigate(ROUTES.PROFILE);
  };

  // Success screen
  if (showSuccess) {
    return (
      <MainLayout>
        <div className="p-6 max-w-2xl mx-auto">
          <div className="min-h-[400px] flex items-center justify-center">
            <Card className="w-full">
              <CardContent className="py-12">
                <div className="text-center space-y-6">
                  <div className="flex justify-center">
                    <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircleIcon className="h-12 w-12 text-green-600" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-foreground">
                      Password Changed Successfully!
                    </h2>
                    <p className="text-muted-foreground">
                      Your password has been updated. You will be logged out in
                      a moment.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Please login again with your new password.
                    </p>
                  </div>
                  <div className="animate-pulse">
                    <div className="inline-flex items-center gap-2 text-primary-600 font-medium">
                      <div className="h-2 w-2 bg-primary-600 rounded-full animate-bounce" />
                      <span>Logging out...</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 max-w-2xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <button
            onClick={handleBack}
            className="
              inline-flex items-center gap-2 mb-4
              text-muted-foreground hover:text-foreground
              transition-colors duration-200
            "
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span>Back to Profile</span>
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <KeyIcon className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Change Password
              </h1>
              <p className="text-muted-foreground">
                Update your password to keep your account secure
              </p>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">Security Notice</p>
            <p>
              After changing your password, you will be automatically logged out
              and need to login again with your new password.
            </p>
          </div>
        </div>

        {/* Change Password Form */}
        <Card>
          <CardHeader>
            <CardTitle>Enter Your Passwords</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* General Error */}
              {errors.general && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{errors.general}</p>
                </div>
              )}

              {/* Current Password */}
              <div className="space-y-2">
                <label
                  htmlFor="currentPassword"
                  className="block text-sm font-medium text-foreground"
                >
                  Current Password *
                </label>
                <PasswordInput
                  id="currentPassword"
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  placeholder="Enter your current password"
                  required
                  autoComplete="current-password"
                  error={errors.currentPassword}
                  disabled={loading}
                />
              </div>

              <div className="border-t border-border my-6" />

              {/* New Password */}
              <div className="space-y-2">
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium text-foreground"
                >
                  New Password *
                </label>
                <PasswordInput
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="Enter your new password"
                  required
                  autoComplete="new-password"
                  error={errors.newPassword}
                  disabled={loading}
                />

                {/* Password Strength Meter */}
                {formData.newPassword && (
                  <div className="mt-3">
                    <PasswordStrengthMeter
                      password={formData.newPassword}
                      showRequirements={true}
                    />
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-foreground"
                >
                  Confirm New Password *
                </label>
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter your new password"
                  required
                  autoComplete="new-password"
                  error={errors.confirmPassword}
                  disabled={loading}
                />

                {/* Match Indicator */}
                {formData.newPassword && formData.confirmPassword && (
                  <div className="flex items-center gap-2 mt-2">
                    {formData.newPassword === formData.confirmPassword ? (
                      <>
                        <CheckCircleIcon className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-700 font-medium">
                          Passwords match
                        </span>
                      </>
                    ) : (
                      <>
                        <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
                        <span className="text-sm text-red-700 font-medium">
                          Passwords do not match
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={loading}
                  className="
                    flex-1 px-6 py-3
                    border border-border rounded-lg
                    text-foreground font-semibold
                    hover:bg-accent
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all duration-200
                  "
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="
                    flex-1 px-6 py-3
                    bg-primary-500 hover:bg-primary-600
                    text-white font-semibold rounded-lg
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                  "
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Changing Password...</span>
                    </span>
                  ) : (
                    "Change Password"
                  )}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Tips for a strong password:</strong> Use a mix of uppercase
            and lowercase letters, numbers, and special characters. Avoid using
            personal information or common words.
          </p>
        </div>
      </div>
    </MainLayout>
  );
};

export default ChangePasswordPage;
