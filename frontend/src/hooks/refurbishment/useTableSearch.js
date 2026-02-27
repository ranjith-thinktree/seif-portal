import { useState, useCallback, useMemo } from "react";

/**
 * Custom hook for managing table search, filter, sort, and pagination
 * Provides a flexible, reusable solution for all dashboard tables
 *
 * @param {Array} data - The data array to filter/sort
 * @param {Object} config - Configuration object
 * @param {Array} config.searchFields - Fields to search across (e.g., ['center_name', 'partner_name'])
 * @param {Object} config.initialFilters - Initial filter values
 * @param {string} config.initialSortBy - Initial sort field
 * @param {string} config.initialSortOrder - Initial sort order ('asc' or 'desc')
 * @param {Function} config.customFilters - Custom filter function for table-specific logic
 * @param {number} config.pageSize - Items per page (default: 10)
 *
 * @returns {Object} Search/filter/sort state and handlers
 */
export const useTableSearch = (data = [], config = {}) => {
  const {
    searchFields = [],
    initialFilters = {},
    initialSortBy = "id",
    initialSortOrder = "asc",
    customFilters = null,
    pageSize: initialPageSize = 10,
  } = config;

  // Search term state
  const [searchTerm, setSearchTerm] = useState("");

  // Active filters state
  const [activeFilters, setActiveFilters] = useState(initialFilters);

  // Sort state
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState(initialSortOrder);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  /**
   * Apply search filtering
   */
  const applySearch = useCallback(
    (items) => {
      if (!Array.isArray(items)) return [];
      if (!searchTerm.trim()) return items;

      const search = searchTerm.toLowerCase();
      return items.filter((item) =>
        searchFields.some((field) => {
          const value = item[field];
          return value?.toString().toLowerCase().includes(search);
        }),
      );
    },
    [searchTerm, searchFields],
  );

  /**
   * Apply custom filters (table-specific logic)
   */
  const applyFilters = useCallback(
    (items) => {
      if (!Array.isArray(items)) return [];
      if (!customFilters) return items;
      return customFilters(items, activeFilters);
    },
    [activeFilters, customFilters],
  );

  /**
   * Apply sorting
   */
  const applySorting = useCallback(
    (items) => {
      if (!Array.isArray(items)) return [];
      return [...items].sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];

        // Handle null/undefined
        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        // Compare values
        let comparison;
        if (typeof aVal === "string") {
          comparison = aVal.localeCompare(bVal);
        } else if (aVal instanceof Date && bVal instanceof Date) {
          comparison = aVal.getTime() - bVal.getTime();
        } else {
          comparison = aVal < bVal ? -1 : 1;
        }

        return sortOrder === "asc" ? comparison : -comparison;
      });
    },
    [sortBy, sortOrder],
  );

  /**
   * Apply pagination
   */
  const applyPagination = useCallback(
    (items) => {
      if (!Array.isArray(items)) return [];
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      return items.slice(startIndex, endIndex);
    },
    [currentPage, pageSize],
  );

  /**
   * Get filtered, sorted, and paginated data
   */
  const processedData = useMemo(() => {
    // Ensure data is an array before processing
    if (!Array.isArray(data)) {
      return {
        data: [],
        total: 0,
        totalPages: 0,
        currentPage: 1,
        pageSize,
      };
    }

    let result = [...data];

    // Apply filters in sequence
    result = applySearch(result);
    result = applyFilters(result);
    result = applySorting(result);

    // Calculate total before pagination
    const total = result.length;

    // Apply pagination
    const paginated = applyPagination(result);

    return {
      data: paginated,
      total,
      totalPages: Math.ceil(total / pageSize),
      currentPage,
      pageSize,
    };
  }, [
    data,
    applySearch,
    applyFilters,
    applySorting,
    applyPagination,
    currentPage,
    pageSize,
  ]);

  /**
   * Handler: Update search term
   */
  const handleSearch = useCallback((value) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page on search
  }, []);

  /**
   * Handler: Update a single filter
   */
  const handleFilterChange = useCallback((filterKey, value) => {
    setActiveFilters((prev) => ({
      ...prev,
      [filterKey]: value,
    }));
    setCurrentPage(1); // Reset to first page on filter change
  }, []);

  /**
   * Handler: Update multiple filters at once
   */
  const handleFiltersChange = useCallback((newFilters) => {
    setActiveFilters((prev) => ({
      ...prev,
      ...newFilters,
    }));
    setCurrentPage(1);
  }, []);

  /**
   * Handler: Clear all filters
   */
  const handleClearFilters = useCallback(() => {
    setActiveFilters(initialFilters);
    setSearchTerm("");
    setCurrentPage(1);
  }, [initialFilters]);

  /**
   * Handler: Update sort
   */
  const handleSort = useCallback((field) => {
    setSortBy((prevSortBy) => {
      // If clicking same field, toggle order
      if (prevSortBy === field) {
        setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        // New field, default to ascending
        setSortOrder("asc");
      }
      return field;
    });
  }, []);

  /**
   * Handler: Change page
   */
  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  /**
   * Handler: Go to next page
   */
  const handleNextPage = useCallback(() => {
    setCurrentPage((prev) =>
      prev < processedData.totalPages ? prev + 1 : prev,
    );
  }, [processedData.totalPages]);

  /**
   * Handler: Go to previous page
   */
  const handlePrevPage = useCallback(() => {
    setCurrentPage((prev) => (prev > 1 ? prev - 1 : prev));
  }, []);

  /**
   * Handler: Change page size
   */
  const handlePageSizeChange = useCallback((newSize) => {
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page when page size changes
  }, []);

  /**
   * Get active filter count (excludes empty arrays and empty strings)
   */
  const activeFilterCount = useMemo(() => {
    return Object.values(activeFilters).filter((value) => {
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === "string") return value.trim() !== "";
      return value !== null && value !== undefined;
    }).length;
  }, [activeFilters]);

  return {
    // Data
    ...processedData,

    // Search state
    searchTerm,
    setSearchTerm: handleSearch,

    // Filter state
    activeFilters,
    setActiveFilters: handleFiltersChange,
    setFilter: handleFilterChange,
    clearFilters: handleClearFilters,
    activeFilterCount,

    // Sort state
    sortBy,
    sortOrder,
    handleSort,
    setSortBy,
    setSortOrder,

    // Pagination state
    currentPage,
    pageSize,

    // Pagination handlers
    goToPage: handlePageChange,
    nextPage: handleNextPage,
    prevPage: handlePrevPage,
    setPageSize: handlePageSizeChange,

    // Utility
    hasFilters: activeFilterCount > 0 || searchTerm.trim() !== "",
  };
};

export default useTableSearch;
