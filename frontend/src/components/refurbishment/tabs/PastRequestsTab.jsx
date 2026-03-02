import React, { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import EnhancedDataTable from "../../common/EnhancedDataTable";
import AdvancedSearchBar from "../../common/AdvancedSearchBar";

/**
 * PastRequestsTab Component
 * Displays past refurbishment requests — layout matches Figma design.
 */
const PastRequestsTab = ({
  table,
  loading = false,
  onViewRequest,
  onStatusChange,
  onCreateRequest,
  formatDate,
  selectedYear,
  onYearChange,
  filterOptions = {},
  onExport,
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

  // Status display config — matches Figma labels & badge styles
  // "In-review" = yellow filled  |  "Completed" = green outlined  |  "Resolved" = grey outlined
  const STATUS_MAP = {
    submitted: {
      label: "In-review",
      cls: "bg-yellow-50 border border-yellow-400 text-yellow-700",
    },
    approved: {
      label: "In-review",
      cls: "bg-yellow-50 border border-yellow-400 text-yellow-700",
    },
    material_procurement: {
      label: "In-review",
      cls: "bg-yellow-50 border border-yellow-400 text-yellow-700",
    },
    installation_in_progress: {
      label: "In-review",
      cls: "bg-yellow-50 border border-yellow-400 text-yellow-700",
    },
    refurbishment_started: {
      label: "In-review",
      cls: "bg-yellow-50 border border-yellow-400 text-yellow-700",
    },
    completed: {
      label: "Completed",
      cls: "border border-green-500 text-green-600 bg-white",
    },
    rejected: {
      label: "Resolved",
      cls: "border border-gray-400 text-gray-500 bg-white",
    },
  };

  // Statuses that can be advanced by the admin (clicking badge opens change modal)
  const CHANGEABLE_STATUSES = [
    "approved",
    "material_procurement",
    "installation_in_progress",
    "refurbishment_started",
  ];

  // Column definitions
  const columns = useMemo(
    () => [
      {
        id: "request_id",
        accessorKey: "request_id",
        header: "Request ID",
        cell: ({ row }) => {
          const year = new Date(row.original.created_at).getFullYear();
          const sequence = String(row.index + 1).padStart(3, "0");
          return (
            <span className="font-medium text-sm">{`REQ-${year}-${sequence}`}</span>
          );
        },
        size: 150,
        enableHiding: true,
        enableResizing: true,
      },
      {
        id: "type",
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">
            {row.original.refurbishment_type ||
              row.original.type ||
              "Refurbishment"}
          </span>
        ),
        size: 130,
        enableHiding: true,
        enableResizing: true,
      },
      {
        id: "center_name",
        accessorKey: "center_name",
        header: "Center Name",
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">
            {row.original.center_name}
          </span>
        ),
        size: 260,
        enableHiding: true,
        enableResizing: true,
      },
      {
        id: "updated_at",
        accessorKey: "updated_at",
        header: "Last Updated",
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">
            {formatDate(
              row.original.reviewed_at ||
                row.original.completed_at ||
                row.original.updated_at,
            )}
          </span>
        ),
        size: 140,
        enableHiding: true,
        enableResizing: true,
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const req = row.original;
          const status = req.status;
          const cfg = STATUS_MAP[status] || {
            label: status || "Unknown",
            cls: "border border-gray-300 text-gray-500 bg-white",
          };
          const isChangeable = CHANGEABLE_STATUSES.includes(status);

          if (isChangeable && onStatusChange) {
            return (
              <button
                onClick={() => onStatusChange(req)}
                disabled={loading}
                title="Click to update status"
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold cursor-pointer hover:opacity-75 transition-opacity ${cfg.cls}`}
              >
                {cfg.label}
              </button>
            );
          }

          return (
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${cfg.cls}`}
            >
              {cfg.label}
            </span>
          );
        },
        size: 150,
        enableHiding: true,
        enableResizing: true,
      },
      {
        id: "actions",
        header: "Action",
        cell: ({ row }) => (
          <button
            onClick={() => onViewRequest(row.original)}
            disabled={loading}
            className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            View
          </button>
        ),
        size: 80,
        enableHiding: false,
        enableResizing: false,
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
    ],
    [formatDate, loading, onViewRequest, onStatusChange],
  );

  // Filter groups for AdvancedSearchBar
  const filterGroups = useMemo(
    () => [
      {
        label: "Type",
        key: "type",
        options: filterOptions.types || [],
        isMulti: true,
      },
      {
        label: "Status",
        key: "status",
        options: filterOptions.statuses || [],
        isMulti: true,
      },
      {
        label: "Center",
        key: "center",
        options: filterOptions.centers || [],
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

  // Sort options
  const sortOptions = [
    { label: "Last Update", value: "updated_at" },
    { label: "Request ID", value: "request_id" },
    { label: "Partner Name", value: "organization_name" },
    { label: "Center Name", value: "center_name" },
    { label: "Reason", value: "reason" },
    { label: "Status", value: "status" },
  ];

  // Actions (Export button)
  const actions = [
    {
      label: "Export CSV",
      onClick: onExport,
      icon: ArrowDownTrayIcon,
      variant: "outline",
      disabled: loading || table.total === 0,
    },
  ];

  // Generate year options (current year and 4 years back)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }, []);

  return (
    <div className="space-y-4">
      {/* Figma header row: New request (left) + FY dropdown (right) */}
      <div className="flex items-center justify-between">
        {onCreateRequest && (
          <button
            onClick={onCreateRequest}
            className="px-5 py-2 rounded-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors"
          >
            New request
          </button>
        )}
        <div className="ml-auto">
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => onYearChange(parseInt(value))}
          >
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((year) => {
                const shortYear = year.toString().slice(-2);
                return (
                  <SelectItem key={year} value={year.toString()}>
                    FY{shortYear} (Jan to June)
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Search / filter / sort / export bar */}
      <AdvancedSearchBar
        value={table.searchTerm}
        onChange={table.setSearchTerm}
        placeholder="Search past requests by partner, center, or reason..."
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
        storageKey="refurbishment-past-requests"
      />

      {/* Data table */}
      <EnhancedDataTable
        columns={columns}
        data={paginatedData}
        pagination={paginationInfo}
        onPageChange={(page) => table.goToPage(page)}
        isLoading={loading}
        emptyMessage="No past requests found"
        showSerialNumber={true}
        storageKey="refurbishment-past-requests"
        onTableReady={(t) => setTableInstance(t)}
      />
    </div>
  );
};

export default PastRequestsTab;
