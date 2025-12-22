import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks";
import { MainLayout } from "../../components/layout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/common";
import { ROUTES } from "../../constants";
import {
  UserCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  ShieldCheckIcon,
  KeyIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";

/**
 * ProfilePage Component
 * Displays user profile information and provides access to change password
 */
const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, role, userName, userEmail } = useAuth();
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    setLoading(false);
  }, []);

  const handleChangePassword = () => {
    navigate(ROUTES.CHANGE_PASSWORD);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Format datetime
  const formatDateTime = (dateString) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get role badge color
  const getRoleBadgeColor = (role) => {
    const colors = {
      SUPER_ADMIN: "bg-purple-100 text-purple-800 border-purple-300",
      ADMIN: "bg-blue-100 text-blue-800 border-blue-300",
      PARTNER: "bg-green-100 text-green-800 border-green-300",
      SEIF_READONLY: "bg-gray-100 text-gray-800 border-gray-300",
      ESSCI: "bg-orange-100 text-orange-800 border-orange-300",
    };
    return colors[role] || "bg-gray-100 text-gray-800 border-gray-300";
  };

  return (
    <MainLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            My Profile
          </h1>
          <p className="text-muted-foreground">
            View and manage your account information
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Info Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture & Name */}
              <div className="flex items-center gap-6 pb-6 border-b border-border">
                <div className="h-24 w-24 bg-primary-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-3xl">
                    {userName?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-foreground mb-1">
                    {userName}
                  </h2>
                  <p className="text-muted-foreground">{userEmail}</p>
                </div>
              </div>

              {/* User Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <UserCircleIcon className="h-5 w-5" />
                    <span className="text-sm font-medium">Full Name</span>
                  </div>
                  <p className="text-foreground font-medium pl-7">
                    {user?.full_name || userName || "N/A"}
                  </p>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <EnvelopeIcon className="h-5 w-5" />
                    <span className="text-sm font-medium">Email Address</span>
                  </div>
                  <p className="text-foreground font-medium pl-7">
                    {user?.email || userEmail || "N/A"}
                  </p>
                </div>

                {/* Mobile Number */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <PhoneIcon className="h-5 w-5" />
                    <span className="text-sm font-medium">Mobile Number</span>
                  </div>
                  <p className="text-foreground font-medium pl-7">
                    {user?.mobile_number || "Not provided"}
                  </p>
                </div>

                {/* Role */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ShieldCheckIcon className="h-5 w-5" />
                    <span className="text-sm font-medium">Role</span>
                  </div>
                  <div className="pl-7">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${getRoleBadgeColor(
                        role
                      )}`}
                    >
                      {role?.replace("_", " ") || "N/A"}
                    </span>
                  </div>
                </div>

                {/* Account Created */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarIcon className="h-5 w-5" />
                    <span className="text-sm font-medium">Member Since</span>
                  </div>
                  <p className="text-foreground font-medium pl-7">
                    {formatDate(user?.created_at)}
                  </p>
                </div>

                {/* Last Login */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarIcon className="h-5 w-5" />
                    <span className="text-sm font-medium">Last Login</span>
                  </div>
                  <p className="text-foreground font-medium pl-7">
                    {formatDateTime(user?.last_login_at)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions Card */}
          <div className="space-y-6">
            {/* Security Card */}
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {role !== "ESSCI" ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Keep your account secure by updating your password
                      regularly.
                    </p>
                    <button
                      onClick={handleChangePassword}
                      className="
                        w-full flex items-center justify-center gap-2
                        px-4 py-3
                        bg-primary-500 hover:bg-primary-600
                        text-white font-semibold rounded-lg
                        transition-all duration-200
                        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                      "
                    >
                      <KeyIcon className="h-5 w-5" />
                      <span>Change Password</span>
                    </button>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground space-y-3">
                    <p className="flex items-start gap-2">
                      <span className="text-orange-500 font-bold">ℹ️</span>
                      <span>
                        ESSCI users cannot change their password directly.
                      </span>
                    </p>
                    <p className="pl-6 text-xs">
                      Please contact your system administrator if you need to
                      reset your password.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Account Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>Account Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-foreground">
                    Active
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Your account is in good standing
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ProfilePage;
