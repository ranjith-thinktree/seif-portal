import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  BellIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import EnhancedDataTable from "@/components/common/EnhancedDataTable";
import AdvancedSearchBar from "@/components/common/AdvancedSearchBar";

/**
 * AllCentersCard Component
 * Displays all centers table with EnhancedDataTable
 */
const AllCentersCard = ({
  table,
  loading = false,
  onNotify,
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
  // Filter groups configuration for AdvancedSearchBar (includes status filter)
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
        label: "Status",
        key: "status",
        options: filterOptions?.statuses || [],
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
    { label: "Partner", value: "organization_name" },
    { label: "Region", value: "region" },
    { label: "City", value: "city" },
    { label: "Status", value: "status" },
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
        size: 250,
        enableHiding: true,
        enableResizing: true,
      },
      {
        id: "organization_name",
        accessorKey: "organization_name",
        header: "Partner",
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">
            {row.original.organization_name}
          </span>
        ),
        size: 200,
        enableHiding: true,
        enableResizing: true,
      },
      {
        id: "region",
        accessorKey: "region",
        header: "Region",
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">{row.original.region}</span>
        ),
        size: 120,
        enableHiding: true,
        enableResizing: true,
      },
      {
        id: "city",
        accessorKey: "city",
        header: "City",
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">{row.original.city}</span>
        ),
        size: 150,
        enableHiding: true,
        enableResizing: true,
      },
      {
        id: "last_refurbishment_date",
        accessorKey: "last_refurbishment_date",
        header: "Last Refurbished",
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
        id: "actions",
        header: "Notify",
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNotify(row.original)}
            disabled={loading}
          >
            <BellIcon className="w-4 h-4" />
          </Button>
        ),
        size: 100,
        enableHiding: false,
        enableResizing: false,
      },
    ];
  }, [formatDate, loading, onNotify]);

  return (
    <div className="space-y-4">
      <AdvancedSearchBar
        value={table.searchTerm}
        onChange={table.setSearchTerm}
        placeholder="Search all centers..."
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
        storageKey="refurbishment-all-centers-overview"
      />

      <EnhancedDataTable
        columns={columns}
        data={paginatedData}
        pagination={paginationInfo}
        onPageChange={(page) => table.goToPage(page)}
        isLoading={loading}
        emptyMessage="No centers found"
        showSerialNumber={true}
        storageKey="refurbishment-all-centers-overview"
        onTableReady={(t) => setTableInstance(t)}
      />
    </div>
  );
};

export default AllCentersCard;
