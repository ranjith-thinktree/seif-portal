import React, { useState, useRef, useEffect } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { cn } from "../../utils/cn";

/**
 * ActionDropdown Component
 * Reusable dropdown menu for table row actions
 *
 * @param {Array} actions - Array of action objects with:
 *   - label: string (display text)
 *   - icon: React component (icon to display)
 *   - onClick: function (action handler)
 *   - disabled: boolean (whether action is disabled)
 *   - variant: 'default' | 'danger' | 'success' | 'warning' (color scheme)
 *   - show: boolean (whether to show this action, defaults to true)
 *   - divider: boolean (show divider after this item)
 */
const ActionDropdown = ({ actions = [], align = "right", size = "sm" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Filter out actions that shouldn't be shown
  const visibleActions = actions.filter((action) => action.show !== false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  const handleActionClick = (action) => {
    if (!action.disabled && action.onClick) {
      action.onClick();
      setIsOpen(false);
    }
  };

  const getVariantClasses = (variant, disabled) => {
    if (disabled) {
      return "text-gray-400 cursor-not-allowed";
    }

    switch (variant) {
      case "danger":
        return "text-red-600 hover:bg-red-50 hover:text-red-700";
      case "success":
        return "text-green-600 hover:bg-green-50 hover:text-green-700";
      case "warning":
        return "text-orange-600 hover:bg-orange-50 hover:text-orange-700";
      default:
        return "text-gray-700 hover:bg-gray-50 hover:text-gray-900";
    }
  };

  const buttonSizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-5 py-2.5 text-lg",
  };

  const alignClasses = {
    left: "left-0",
    right: "right-0",
  };

  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={cn(
          "inline-flex items-center justify-center gap-1 rounded-md border border-gray-300 bg-white font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors",
          buttonSizeClasses[size]
        )}
      >
        Actions
        <ChevronDownIcon
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute z-[9999] mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none",
            alignClasses[align]
          )}
        >
          <div className="py-1">
            {visibleActions.map((action, index) => (
              <React.Fragment key={index}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleActionClick(action);
                  }}
                  disabled={action.disabled}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors",
                    getVariantClasses(action.variant, action.disabled)
                  )}
                  title={action.disabled ? action.disabledReason : action.label}
                >
                  {action.icon && (
                    <action.icon className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span className="flex-1 text-left">{action.label}</span>
                </button>
                {action.divider && index < visibleActions.length - 1 && (
                  <div className="my-1 border-t border-gray-100" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionDropdown;
