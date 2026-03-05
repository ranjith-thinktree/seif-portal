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
 * EligibleCentersCard Component
 * Displays eligible centers table with EnhancedDataTable
 */
const EligibleCentersCard = ({
  table,
  loading = false,
  onCreateRequest,
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
    { label: "Partner", value: "partner_name" },
    { label: "Region", value: "region" },
    { label: "City", value: "city" },
    { label: "Last Refurbished", value: "last_refurbishment_date" },
    { label: "Last Notified", value: "last_notified_at" },
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
        id: "partner_name",
        accessorKey: "partner_name",
        header: "Partner",
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">
            {row.original.partner_name}
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
        id: "last_notified_at",
        accessorKey: "last_notified_at",
        header: "Last Notified",
        cell: ({ row }) => {
          const d = row.original.last_notified_at;
          if (!d) return <span className="text-gray-400 text-xs">Never</span>;
          return <span className="text-xs text-blue-600 font-medium">{formatDate(d)}</span>;
        },
        size: 150,
        enableHiding: true,
        enableResizing: true,
      },
      {
        id: "actions",
        header: "Action",
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
        size: 140,
        enableHiding: false,
        enableResizing: false,
      },
    ];
  }, [formatDate, loading, onCreateRequest, onNotify]);

  return (
    <div className="space-y-4">
      <AdvancedSearchBar
        value={table.searchTerm}
        onChange={table.setSearchTerm}
        placeholder="Search eligible centers..."
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
        storageKey="refurbishment-eligible-centers-overview"
      />

      <EnhancedDataTable
        columns={columns}
        data={paginatedData}
        pagination={paginationInfo}
        onPageChange={(page) => table.goToPage(page)}
        isLoading={loading}
        emptyMessage="No eligible centers found"
        showSerialNumber={true}
        storageKey="refurbishment-eligible-centers-overview"
        onTableReady={(t) => setTableInstance(t)}
      />
    </div>
  );
};

export default EligibleCentersCard;
