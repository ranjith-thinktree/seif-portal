import { useState, useRef, useEffect } from "react";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  XMarkIcon,
  CheckIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import ColumnVisibilityToggle from "./ColumnVisibilityToggle";

/**
 * Advanced SearchBar Component with Hierarchical Filters
 *
 * @param {string} value - Search input value
 * @param {function} onChange - Search change handler
 * @param {string} placeholder - Search input placeholder
 * @param {array} filterGroups - Array of filter group objects: { label, key, options: [{value, label}], multi: true/false }
 * @param {object} activeFilters - Object with active filters: { region: 'value', city: ['value1', 'value2'], ... }
 * @param {function} onFilterChange - Filter change handler (key, value)
 * @param {function} onClearFilters - Clear all filters handler
 * @param {array} sortOptions - Array of sort objects: { label, value }
 * @param {string} sortBy - Current sort field value
 * @param {string} sortOrder - Current sort order: 'asc' or 'desc'
 * @param {function} onSortChange - Sort change handler (sortBy, sortOrder)
 * @param {array} actions - Array of action button objects: { label, onClick, variant, icon, disabled }
 * @param {object} table - TanStack table instance (optional, for column visibility)
 * @param {string} storageKey - Storage key for column visibility (optional)
 */
const AdvancedSearchBar = ({
  value,
  onChange,
  placeholder = "Search...",
  filterGroups = [],
  activeFilters = {},
  onFilterChange,
  onClearFilters,
  sortOptions = [],
  sortBy,
  sortOrder = "asc",
  onSortChange,
  actions = [],
  table,
  storageKey,
}) => {
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [filterSearchTerms, setFilterSearchTerms] = useState({});
  const filterRef = useRef(null);
  const sortRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
        setExpandedGroup(null);
        setFilterSearchTerms({});
      }
      if (sortRef.current && !sortRef.current.contains(event.target)) {
        setShowSortDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Count active filters
  const activeFiltersCount = Object.values(activeFilters).filter((value) => {
    if (value === "" || value === null || value === undefined) return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  }).length;

  // Get count of selected items for a filter
  const getFilterCount = (key) => {
    const value = activeFilters[key];
    if (Array.isArray(value)) {
      return value.length;
    }
    return value && value !== "" ? 1 : 0;
  };

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

  const handleFilterSelect = (key, value, isMulti) => {
    if (isMulti) {
      // Multi-select logic
      const currentValues = activeFilters[key] || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];
      onFilterChange(key, newValues);
    } else {
      // Single-select logic
      if (activeFilters[key] === value) {
        onFilterChange(key, "");
      } else {
        onFilterChange(key, value);
      }
    }
  };

  const handleClearFilter = (key) => {
    const group = filterGroups.find((g) => g.key === key);
    onFilterChange(key, group?.multi ? [] : "");
  };

  const handleClearAllFilters = () => {
    if (onClearFilters) {
      onClearFilters();
    }
    setExpandedGroup(null);
    setFilterSearchTerms({});
  };

  const handleFilterSearch = (key, searchTerm) => {
    setFilterSearchTerms((prev) => ({
      ...prev,
      [key]: searchTerm,
    }));
  };

  const getFilteredOptions = (group) => {
    const searchTerm = filterSearchTerms[group.key]?.toLowerCase() || "";
    if (!group.options || !Array.isArray(group.options)) return [];
    if (!searchTerm) return group.options;

    return group.options.filter((option) =>
      option.label.toLowerCase().includes(searchTerm)
    );
  };

  const isOptionSelected = (key, optionValue, isMulti) => {
    if (isMulti) {
      const values = activeFilters[key] || [];
      return values.includes(optionValue);
    }
    return activeFilters[key] === optionValue;
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

      {/* Advanced Filter Dropdown */}
      {filterGroups.length > 0 && (
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="h-10 px-4 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors flex items-center gap-2 relative"
          >
            <FunnelIcon className="h-5 w-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filters</span>
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {showFilterDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
              <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">
                  Filter By
                </span>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={handleClearAllFilters}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {filterGroups.map((group) => {
                  const filteredOptions = getFilteredOptions(group);
                  const filterCount = getFilterCount(group.key);

                  return (
                    <div
                      key={group.key}
                      className="border-b border-gray-100 last:border-0"
                    >
                      {/* Filter Group Header */}
                      <div className="flex items-center justify-between p-3 hover:bg-gray-50">
                        <button
                          onClick={() =>
                            setExpandedGroup(
                              expandedGroup === group.key ? null : group.key
                            )
                          }
                          className="flex-1 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">
                              {group.label}
                            </span>
                            {filterCount > 0 && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                {filterCount}
                              </span>
                            )}
                          </div>
                          <ChevronDownIcon
                            className={`h-4 w-4 text-gray-500 transition-transform ${
                              expandedGroup === group.key ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                        {filterCount > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClearFilter(group.key);
                            }}
                            className="ml-2 p-1 hover:bg-gray-200 rounded transition-colors"
                            title="Clear filter"
                          >
                            <XMarkIcon className="h-4 w-4 text-gray-500" />
                          </button>
                        )}
                      </div>

                      {/* Filter Options */}
                      {expandedGroup === group.key && (
                        <div className="px-3 pb-3 space-y-2">
                          {/* Search Input for Multi-Select or Large Lists */}
                          {(group.multi ||
                            (group.options && group.options.length > 5)) && (
                            <div className="relative">
                              <MagnifyingGlassIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <input
                                type="text"
                                value={filterSearchTerms[group.key] || ""}
                                onChange={(e) =>
                                  handleFilterSearch(group.key, e.target.value)
                                }
                                placeholder={`Search ${group.label.toLowerCase()}...`}
                                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          )}

                          {/* Options List */}
                          <div className="max-h-48 overflow-y-auto space-y-1">
                            {filteredOptions && filteredOptions.length > 0 ? (
                              filteredOptions.map((option) => (
                                <label
                                  key={option.value}
                                  className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isOptionSelected(
                                      group.key,
                                      option.value,
                                      group.multi
                                    )}
                                    onChange={() =>
                                      handleFilterSelect(
                                        group.key,
                                        option.value,
                                        group.multi
                                      )
                                    }
                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">
                                    {option.label}
                                  </span>
                                </label>
                              ))
                            ) : filterSearchTerms[group.key] ? (
                              <p className="text-sm text-gray-500 p-2">
                                No matches found
                              </p>
                            ) : (
                              <p className="text-sm text-gray-500 p-2">
                                No options available
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Column Visibility Toggle */}
      {table && storageKey && (
        <ColumnVisibilityToggle table={table} storageKey={storageKey} />
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
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
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
        actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            disabled={action.disabled}
            className={getActionButtonStyles(action.variant)}
          >
            {action.icon && <span className="h-5 w-5">{action.icon}</span>}
            {action.label}
          </button>
        ))}
    </div>
  );
};

export default AdvancedSearchBar;
