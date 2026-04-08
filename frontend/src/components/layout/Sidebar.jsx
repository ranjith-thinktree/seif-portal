import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks";
import { getMenuItemsByRole } from "../../constants";
import refurbishmentService from "../../services/refurbishment.service";
import { Logo } from "../common";
import { cn } from "../../utils/cn";
import {
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";

/**
 * Sidebar Component
 * Navigation sidebar with role-based menu items and dynamic width
 */
const Sidebar = () => {
  const location = useLocation();
  const { role, userName } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});

  // Get menu items based on user role
  const menuItems = getMenuItemsByRole(role);

  // Unread refurbishment alert count for sidebar badge
  const [refurbishmentBadgeCount, setRefurbishmentBadgeCount] = useState(0);

  useEffect(() => {
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") return;
    let active = true;
    const fetchCount = async () => {
      const count = await refurbishmentService.getAlertsUnreadCount();
      if (active) setRefurbishmentBadgeCount(count);
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000); // refresh every 30s
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [role]);

  /**
   * Check if route is active
   */
  const isActive = (path) => {
    return location.pathname === path;
  };

  /**
   * Check if any submenu is active
   */
  const isSubmenuActive = (submenu) => {
    return submenu?.some((item) => location.pathname === item.path);
  };

  /**
   * Toggle submenu expansion
   */
  const toggleSubmenu = (itemPath) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [itemPath]: !prev[itemPath],
    }));
  };

  /**
   * Toggle mobile menu
   */
  const toggleMobile = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggleMobile}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-sidebar text-white"
      >
        {isMobileOpen ? (
          <XMarkIcon className="h-6 w-6" />
        ) : (
          <Bars3Icon className="h-6 w-6" />
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          "h-full bg-white text-white z-40 border border-r-[#E1E1E1]",
          "flex flex-col",
          // Desktop - Dynamic width
          "hidden lg:flex w-fit min-w-[200px] max-w-[280px]",
          // Mobile
          "lg:static lg:translate-x-0",
          "fixed top-0 left-0",
          isMobileOpen ? "translate-x-0 w-54" : "-translate-x-full w-54",
        )}
      >
        {/* Sidebar Header */}
        <div className="px-4 py-3 border-b border-b-[#E1E1E1] flex items-center justify-center">
          <Logo size="default" />
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              const hasSubmenu = item.submenu && item.submenu.length > 0;
              const isExpanded = expandedMenus[item.path];
              const submenuHasActive =
                hasSubmenu && isSubmenuActive(item.submenu);

              return (
                <li key={item.path}>
                  {hasSubmenu ? (
                    <>
                      {/* Parent item with submenu */}
                      <button
                        onClick={() => toggleSubmenu(item.path)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 transition-colors border-r-2 border-r-transparent",
                          "hover:border-r-2 hover:border-r-gray-300",
                          submenuHasActive && "border-r-2 border-[#000000]",
                        )}
                      >
                        <Icon className="p-2 h-9 w-9 flex-shrink-0 text-black bg-[#D9D9D9] rounded-full" />
                        <span className="text-sm text-black flex-1 text-left">
                          {item.name}
                        </span>
                        {isExpanded ? (
                          <ChevronUpIcon className="h-4 w-4 text-black" />
                        ) : (
                          <ChevronDownIcon className="h-4 w-4 text-black" />
                        )}
                      </button>

                      {/* Submenu items */}
                      {isExpanded && (
                        <ul className="ml-12 mt-1 space-y-1">
                          {item.submenu.map((subItem) => {
                            const subActive = isActive(subItem.path);
                            return (
                              <li key={subItem.path}>
                                <Link
                                  to={subItem.path}
                                  onClick={() => setIsMobileOpen(false)}
                                  className={cn(
                                    "block px-3 py-2 text-sm text-black rounded-md transition-colors",
                                    "hover:bg-[#F3F4F6]",
                                    subActive && "bg-[#E5E7EB] font-medium",
                                  )}
                                >
                                  {subItem.name}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </>
                  ) : (
                    // Regular menu item
                    <Link
                      to={item.path}
                      onClick={() => setIsMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 transition-colors border-r-2 border-r-transparent",
                        "hover:border-r-2 hover:border-r-gray-300",
                        active &&
                          "border-r-2 border-[#000000] bg-[#3DCD58]/10 text-[#009530]",
                      )}
                    >
                      <Icon
                        className={cn(
                          "p-2 h-9 w-9 flex-shrink-0 bg-[#D9D9D9] rounded-full",
                          active
                            ? "text-[#009530] bg-transparent"
                            : "text-black",
                        )}
                      />
                      <span
                        className={cn(
                          "text-sm flex-1",
                          active ? "text-[#009530]" : "text-black",
                        )}
                      >
                        {item.name}
                      </span>
                      {item.name === "Refurbishment" &&
                        refurbishmentBadgeCount > 0 && (
                          <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                            {refurbishmentBadgeCount > 99
                              ? "99+"
                              : refurbishmentBadgeCount}
                          </span>
                        )}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={toggleMobile}
        />
      )}
    </>
  );
};

export default Sidebar;
