import React, { useState, useRef, useEffect } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../../store/slices/authSlice";
import { useAuth } from "../../hooks";
import { useNotifications } from "../../hooks/useNotifications";
import { getUnreadCount } from "../../services/notification.service";
import { ROUTES } from "../../constants";
import {
  BellIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";

/**
 * Header Component
 * Top header with notifications and user menu
 */
const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { role, userName, userEmail } = useAuth();
  const { unreadCount, updateUnreadCount } = useNotifications();
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const settingsMenuRef = useRef(null);

  // Fetch initial unread count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await getUnreadCount();
        updateUnreadCount(response.count);
      } catch (error) {
        console.error("Failed to fetch unread count:", error);
      }
    };

    fetchUnreadCount();
  }, [updateUnreadCount]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        settingsMenuRef.current &&
        !settingsMenuRef.current.contains(event.target)
      ) {
        setIsSettingsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="bg-white border-b border-border sticky top-0 z-30">
      <div className="flex items-center justify-end h-16 px-6">
        {/* Right side - Notifications and User Menu */}
        <div className="flex items-center gap-4">
          {/* Upload Button - only displayed for partner roles */}
          {role === "PARTNER" && (
            <button
              onClick={() => navigate(ROUTES.UPLOAD_DATA)}
              className="flex items-center gap-2 px-8 py-2 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-all"
              title="Upload Data"
            >
              <ArrowUpTrayIcon className="h-5 w-5" />
              <span className="font-semibold">Upload Data</span>
            </button>
          )}

          {/* Settings */}
          <div className="relative" ref={settingsMenuRef}>
            <button
              onClick={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)}
              className="p-2 text-muted-foreground bg-[#F5F7FA] hover:text-foreground hover:bg-accent rounded-full transition-colors"
              title="Settings"
            >
              <Cog6ToothIcon className="h-6 w-6 text-[#718ebf]" />
            </button>

            {/* Settings Dropdown */}
            {isSettingsMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-border py-2 z-50">
                {/* User Info Section */}
                <div className="px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-primary-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {userName?.charAt(0)?.toUpperCase() || "U"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {userName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {userEmail}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  {/* Profile */}
                  <button
                    onClick={() => {
                      navigate(ROUTES.PROFILE);
                      setIsSettingsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                  >
                    <UserCircleIcon className="h-5 w-5 text-muted-foreground" />
                    <span>Profile</span>
                  </button>

                  {/* Settings */}
                  <button
                    onClick={() => {
                      navigate(ROUTES.SETTINGS);
                      setIsSettingsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                  >
                    <Cog6ToothIcon className="h-5 w-5 text-muted-foreground" />
                    <span>Settings</span>
                  </button>
                </div>

                {/* Logout */}
                <div className="border-t border-border pt-2">
                  <button
                    onClick={async () => {
                      setIsSettingsMenuOpen(false);
                      try {
                        await dispatch(logout()).unwrap();
                      } catch (error) {
                        console.error("Logout error:", error);
                      } finally {
                        // Force navigation and page reload to clear all state
                        window.location.href = "/login";
                      }
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Notifications */}
          <button
            onClick={() => navigate(ROUTES.INBOX)}
            className="relative p-2 bg-[#F5F7FA] text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors"
            title="Notifications"
          >
            <BellIcon className="h-6 w-6 text-[#fe5c73]" />
            {/* Notification Badge */}
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 flex items-center justify-center h-5 w-5 bg-[#fe5c73] text-white text-xs font-semibold rounded-full">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
