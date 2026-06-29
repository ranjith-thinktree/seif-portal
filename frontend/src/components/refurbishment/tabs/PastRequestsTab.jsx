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
import { getDisplayRequestType, getRefurbishmentStatusLabel, getRefurbishmentStatusBadgeClass, getRefurbishmentDisplayStatus } from "../../../utils/refurbishmentUtils";

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

  // Statuses that open the workflow modal (update or view history)
  const STATUS_MODAL_STATUSES = [
    "approved",
    "material_procurement",
    "installation_in_progress",
    "refurbishment_started",
    "completed",
    "rejected",
  ];

  const renderStatusBadge = (req, asButton = false) => {
    const label = getRefurbishmentStatusLabel(req);
    const cls = getRefurbishmentStatusBadgeClass(req);
    const opensModal = STATUS_MODAL_STATUSES.includes(req.status);
    const isViewOnly = req.status === "completed" || req.status === "rejected";
    const displayStatus = getRefurbishmentDisplayStatus(req);
    const showReadyIndicator = displayStatus.key === "ready_to_complete";

    if (asButton && opensModal && onStatusChange) {
      return (
        <button
          onClick={() => onStatusChange(req)}
          disabled={loading}
          title={
            req.status === "completed"
              ? "View complete status history"
              : req.status === "rejected"
                ? "View rejection details"
                : "Click to update status"
          }
          className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer hover:brightness-95 transition-all ${cls}`}
        >
          {showReadyIndicator && (
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
          )}
          {label}
        </button>
      );
    }

    return (
      <span
        className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${cls}`}
      >
        {showReadyIndicator && (
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
        )}
        {label}
      </span>
    );
  };

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
        id: "request_type",
        accessorKey: "request_type",
        header: "Request Type",
        cell: ({ row }) => {
          const type = getDisplayRequestType(row.original);
          return (
            <span className="text-sm text-gray-600">{type || "-"}</span>
          );
        },
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
        cell: ({ row }) => renderStatusBadge(row.original, true),
        size: 220,
        minSize: 160,
        enableHiding: true,
        enableResizing: true,
        meta: { noTruncate: true },
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
        label: "Request Type",
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

  const hasActiveTableFilters = (filters = {}) =>
    Object.values(filters).some((value) => {
      if (Array.isArray(value)) return value.length > 0;
      return Boolean(value);
    });

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
        emptyMessage={
          table.total === 0 && !table.searchTerm && !hasActiveTableFilters(table.activeFilters)
            ? `No past requests found for ${selectedYear}. Try selecting FY${String(selectedYear).slice(-2)} (current year) or another year from the dropdown above.`
            : "No past requests match your search or filters. Try clearing filters."
        }
        showSerialNumber={true}
        storageKey="refurbishment-past-requests"
        onTableReady={(t) => setTableInstance(t)}
      />
    </div>
  );
};

export default PastRequestsTab;
