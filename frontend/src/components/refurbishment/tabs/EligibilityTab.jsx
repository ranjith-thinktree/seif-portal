import React, { useMemo, useState } from "react";
import { Button } from "../../ui/button";
import { BellIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import EnhancedDataTable from "../../common/EnhancedDataTable";
import AdvancedSearchBar from "../../common/AdvancedSearchBar";

/**
 * EligibilityTab Component
 * Displays centers eligible for refurbishment with EnhancedSearchBar and export functionality
 */
const EligibilityTab = ({
  // Table object from useTableSearch hook (contains pre-processed data)
  table,
  loading = false,
  onNotifyPartner,
  formatDate,
  filterOptions = {},
  // Export handler
  onExport,
  // History modal callback
  onShowHistory,
}) => {
  const [tableInstance, setTableInstance] = useState(null);

  // Use pre-processed data from parent's useTableSearch hook
  const paginatedData = table.data;

  // Pagination info from table object
  const paginationInfo = {
    page: table.currentPage,
    limit: table.pageSize,
    total: table.total,
    totalPages: table.totalPages,
  };

  // Define columns for EnhancedDataTable
  const columns = useMemo(
    () => [
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
        size: 200,
        enableHiding: true,
        enableResizing: true,
      },
      {
        id: "region",
        accessorKey: "region",
        header: "Region",
        size: 120,
        enableHiding: true,
        enableResizing: true,
      },
      {
        id: "city",
        accessorKey: "city",
        header: "City",
        size: 150,
        enableHiding: true,
        enableResizing: true,
      },
      {
        id: "last_refurbishment_date",
        accessorKey: "last_refurbishment_date",
        header: "Last Refurbished",
        cell: ({ row }) => formatDate(row.original.last_refurbishment_date),
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
          const count = row.original.total_send_count ?? 1;
          return (
            <button
              onClick={() => onShowHistory && onShowHistory(row.original)}
              className="text-xs text-blue-600 font-medium underline underline-offset-2 hover:text-blue-800 transition-colors text-left"
            >
              <span className="block">{formatDate(d)}</span>
              <span className="block text-[10px] text-blue-400 no-underline">
                Sent {count}×
              </span>
            </button>
          );
        },
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
            onClick={() => onNotifyPartner(row.original)}
            disabled={loading}
          >
            <BellIcon className="w-4 h-4" />
          </Button>
        ),
        size: 100,
        enableHiding: false,
        enableResizing: false,
      },
    ],
    [formatDate, loading, onNotifyPartner],
  );

  // Filter groups for AdvancedSearchBar
  const filterGroups = useMemo(
    () => [
      {
        label: "Partner",
        key: "partner",
        options: filterOptions.partners || [],
        isMulti: true,
      },
      {
        label: "State",
        key: "state",
        options: filterOptions.states || [],
        isMulti: true,
      },
      {
        label: "Region",
        key: "region",
        options: filterOptions.regions || [],
        isMulti: true,
      },
      {
        label: "Financial Year",
        key: "financialYear",
        options: filterOptions.financialYears || [],
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

  return (
    <div className="space-y-4">
      <AdvancedSearchBar
        value={table.searchTerm}
        onChange={table.setSearchTerm}
        placeholder="Search centers by name, partner, city, or region..."
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
        storageKey="refurbishment-eligibility"
      />
      <EnhancedDataTable
        columns={columns}
        data={paginatedData}
        pagination={paginationInfo}
        onPageChange={(page) => table.goToPage(page)}
        isLoading={loading}
        emptyMessage="No eligible centers found"
        showSerialNumber={true}
        storageKey="refurbishment-eligibility"
        onTableReady={(t) => setTableInstance(t)}
      />
    </div>
  );
};

export default EligibilityTab;
