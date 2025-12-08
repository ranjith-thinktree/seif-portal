import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { login, clearError } from "../../store/slices/authSlice";
import { useAuth } from "../../hooks";
import { isValidEmail } from "../../utils";
import { ROUTES } from "../../constants";
import {
  Button,
  Input,
  Card,
  CardContent,
  Logo,
} from "../../components/common";

/**
 * Login Page Component
 */
const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, error } = useAuth();

  // Debug logging
  useEffect(() => {
    console.log("Auth state:", { isAuthenticated, isLoading, error });
  }, [isAuthenticated, isLoading, error]);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [formErrors, setFormErrors] = useState({
    email: "",
    password: "",
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(ROUTES.DASHBOARD);
    }
  }, [isAuthenticated, navigate]);

  /**
   * Handle input change
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear field error when user starts typing
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
    // Clear global error
    if (error) {
      dispatch(clearError());
    }
  };

  /**
   * Validate form
   */
  const validateForm = () => {
    const errors = {};

    // Validate email
    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!isValidEmail(formData.email)) {
      errors.email = "Please enter a valid email";
    }

    // Validate password
    if (!formData.password) {
      errors.password = "Password is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form first
    if (!validateForm()) {
      return;
    }

    // Dispatch login action - don't clear errors manually, let Redux handle it
    try {
      await dispatch(login(formData)).unwrap();
      // Navigate to dashboard on success (will be handled by useEffect)
    } catch (err) {
      // Error is now in Redux state (error variable from useAuth)
      console.error("Login failed:", err);
      // Don't need to do anything else, the error will display automatically
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-secondary px-4">
      <div className="w-full max-w-[350px]">
        {/* Login Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="mb-6">
              <h1 className="text-3xl font text-foreground mb-2">Sign in</h1>
            </div>

            {/* Global Error */}
            {error && (
              <div className="mb-6 p-4 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="user name"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                error={formErrors.email}
                required
                autoComplete="email"
                autoFocus
              />

              <Input
                label="Password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                error={formErrors.password}
                required
                autoComplete="current-password"
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                size="default"
                isLoading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                <button className="text-primary-500 hover:underline font-medium">
                  Forgot Password?
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
