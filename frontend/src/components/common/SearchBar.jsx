import { useState, useRef, useEffect } from "react";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  XMarkIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

/**
 * Enhanced SearchBar Component
 * Search input with filter and sort functionality
 *
 * @param {string} value - Search input value
 * @param {function} onChange - Search change handler
 * @param {string} placeholder - Search input placeholder
 * @param {array} filters - Array of filter objects: { label, value, checked }
 * @param {function} onFilterChange - Filter change handler (value, checked)
 * @param {array} sortOptions - Array of sort objects: { label, value }
 * @param {string} sortBy - Current sort value
 * @param {string} sortOrder - Current sort order: 'asc' or 'desc'
 * @param {function} onSortChange - Sort change handler (sortBy, sortOrder)
 * @param {array} actions - Array of action button objects: { label, onClick, variant, icon, disabled }
 */
const SearchBar = ({
  value,
  onChange,
  placeholder = "Search...",
  filters = [],
  onFilterChange,
  sortOptions = [],
  sortBy,
  sortOrder = "asc",
  onSortChange,
  actions = [],
}) => {
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const filterRef = useRef(null);
  const sortRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
      if (sortRef.current && !sortRef.current.contains(event.target)) {
        setShowSortDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Count active filters
  const activeFiltersCount = filters.filter((f) => f.checked).length;

  // Get current sort label
  const currentSortLabel =
    sortOptions.find((opt) => opt.value === sortBy)?.label || "Sort";

  const handleSortSelect = (value) => {
    if (value === sortBy) {
      // Toggle order if same field
      onSortChange(value, sortOrder === "asc" ? "desc" : "asc");
    } else {
      // New field, default to ascending
      onSortChange(value, "asc");
    }
  };

  const clearAllFilters = () => {
    filters.forEach((filter) => {
      if (filter.checked) {
        onFilterChange(filter.value, false);
      }
    });
  };

  const getActionButtonStyles = (variant) => {
    const baseStyles =
      "h-10 px-4 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm";

    switch (variant) {
      case "approve":
        return `${baseStyles} text-[#009530] bg-[#009530]/10 hover:bg-[#009530]/20`;
      case "reject":
        return `${baseStyles} text-[#FF4B4A] bg-[#FF4B4A]/10 hover:bg-[#FF4B4A]/20`;
      default:
        return `${baseStyles} text-gray-700 bg-gray-100 hover:bg-gray-200`;
    }
  };

  return (
    <div className="flex gap-3">
      {/* Search Input */}
      <div className="relative flex-1">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-10 pl-10 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Filter Dropdown */}
      {filters.length > 0 && (
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="h-10 px-4 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors flex items-center gap-2 relative"
          >
            <FunnelIcon className="h-5 w-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filter</span>
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {showFilterDropdown && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">
                  Filters
                </span>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto p-2">
                {filters.map((filter) => (
                  <label
                    key={filter.value}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filter.checked || false}
                      onChange={(e) =>
                        onFilterChange(filter.value, e.target.checked)
                      }
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      {filter.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sort Dropdown */}
      {sortOptions.length > 0 && (
        <div className="relative" ref={sortRef}>
          <button
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className="h-10 px-4 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <ArrowsUpDownIcon className="h-5 w-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              {sortBy ? currentSortLabel : "Sort"}
            </span>
            {sortBy && (
              <span className="text-xs text-gray-500">
                {sortOrder === "asc" ? "↑" : "↓"}
              </span>
            )}
          </button>

          {showSortDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              <div className="p-3 border-b border-gray-200">
                <span className="text-sm font-semibold text-gray-700">
                  Sort By
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto p-2">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      handleSortSelect(option.value);
                      setShowSortDropdown(false);
                    }}
                    className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded text-left"
                  >
                    <span className="text-sm text-gray-700">
                      {option.label}
                    </span>
                    {sortBy === option.value && (
                      <div className="flex items-center gap-1">
                        <CheckIcon className="h-4 w-4 text-blue-600" />
                        <span className="text-sm text-blue-600">
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {actions.length > 0 &&
        actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={index}
              onClick={action.onClick}
              disabled={action.disabled}
              className={getActionButtonStyles(action.variant)}
            >
              {Icon && <Icon className="h-5 w-5" />}
              {action.label}
            </button>
          );
        })}
    </div>
  );
};

export default SearchBar;
