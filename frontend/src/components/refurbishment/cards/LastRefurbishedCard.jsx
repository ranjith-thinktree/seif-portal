import React, { useMemo, useState } from "react";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import EnhancedDataTable from "@/components/common/EnhancedDataTable";
import AdvancedSearchBar from "@/components/common/AdvancedSearchBar";

/**
 * LastRefurbishedCard Component
 * Displays last refurbished centers table with EnhancedDataTable
 */
const LastRefurbishedCard = ({
  table,
  loading = false,
  onViewRequest,
  formatDate,
  filterOptions = {},
  onExport,
}) => {
  // Use pre-processed data from parent's useTableSearch hook
  const paginatedData = table.data;

  // tableInstance for column visibility toggle
  const [tableInstance, setTableInstance] = useState(null);

  // Pagination info from table object
  const paginationInfo = {
    page: table.currentPage,
    limit: table.pageSize,
    total: table.total,
    totalPages: table.totalPages,
  };
  // Filter groups configuration for AdvancedSearchBar
  const filterGroups = useMemo(
    () => [
      {
        label: "Partner",
        key: "partner",
        options: filterOptions?.partners || [],
        isMulti: true,
      },
      {
        label: "State",
        key: "state",
        options: filterOptions?.states || [],
        isMulti: true,
      },
      {
        label: "Region",
        key: "region",
        options: filterOptions?.regions || [],
        isMulti: true,
      },
      {
        label: "Year",
        key: "year",
        options: filterOptions?.years || [],
        isMulti: false,
      },
    ],
    [filterOptions],
  );

  // Sort options for AdvancedSearchBar
  const sortOptions = [
    { label: "Center Name", value: "center_name" },
    { label: "Refurbished Date", value: "last_refurbishment_date" },
    { label: "Partner", value: "partner_name" },
    { label: "City", value: "city" },
    { label: "Region", value: "region" },
  ];

  // Actions for AdvancedSearchBar
  const actions = [
    {
      label: "Export CSV",
      onClick: onExport,
      icon: ArrowDownTrayIcon,
      variant: "outline",
      disabled: loading || table.total === 0,
    },
  ];
  const columns = useMemo(() => {
    return [
      {
        id: "center_name",
        accessorKey: "center_name",
        header: "Center Name",
        cell: ({ row }) => (
          <div className="font-medium">{row.original.center_name}</div>
        ),
        size: 220,
        enableHiding: true,
        enableResizing: true,
      },
      {
        id: "last_refurbishment_date",
        accessorKey: "last_refurbishment_date",
        header: "Refurbished Date",
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">
            {formatDate(row.original.last_refurbishment_date)}
          </span>
        ),
        size: 150,
        enableHiding: true,
        enableResizing: true,
      },
      {
        id: "partner_name",
        accessorKey: "partner_name",
        header: "Partner",
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">
            {row.original.partner_name || "-"}
          </span>
        ),
        size: 200,
        enableHiding: true,
        enableResizing: true,
      },
      {
        id: "city",
        accessorKey: "city",
        header: "City",
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">
            {row.original.city || "-"}
          </span>
        ),
        size: 140,
        enableHiding: true,
        enableResizing: true,
      },
      {
        id: "region",
        accessorKey: "region",
        header: "Region",
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">
            {row.original.region || "-"}
          </span>
        ),
        size: 120,
        enableHiding: true,
        enableResizing: true,
      },
      {
        id: "actions",
        header: "Action",
        cell: ({ row }) => (
          <button
            onClick={() => onViewRequest?.(row.original)}
            disabled={loading}
            title="View refurbishment details"
            className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            View
          </button>
        ),
        size: 80,
        enableHiding: false,
        enableResizing: false,
      },
    ];
  }, [formatDate, loading, onViewRequest]);

  return (
    <div className="space-y-4">
      <AdvancedSearchBar
        value={table.searchTerm}
        onChange={table.setSearchTerm}
        placeholder="Search last refurbished centers..."
        filterGroups={filterGroups}
        activeFilters={table.activeFilters}
        onFilterChange={table.setFilter}
        onClearFilters={table.clearFilters}
        sortOptions={sortOptions}
        sortBy={table.sortBy}
        sortOrder={table.sortOrder}
        onSortChange={table.handleSort}
        actions={actions}
        table={tableInstance}
        storageKey="refurbishment-last-refurbished-overview"
      />

      <EnhancedDataTable
        columns={columns}
        data={paginatedData}
        pagination={paginationInfo}
        onPageChange={(page) => table.goToPage(page)}
        isLoading={loading}
        emptyMessage="No recently refurbished centers found"
        showSerialNumber={true}
        storageKey="refurbishment-last-refurbished-overview"
        onTableReady={(t) => setTableInstance(t)}
      />
    </div>
  );
};

export default LastRefurbishedCard;
