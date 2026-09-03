import React, { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import EnhancedDataTable from "../common/EnhancedDataTable";
import AdvancedSearchBar from "../common/AdvancedSearchBar";
import {
  formatCertificationDate,
  formatCertificationRequestId,
  getCertificationDerivedStatusLabel,
  getCertificationStatusBadgeClass,
} from "../../utils/certificationUtils";

/**
 * ESSCI certification requests table — layout aligned with Refurbishment Past Requests tab.
 */
const ESSCIRequestsTab = ({
  table,
  loading = false,
  onViewRequest,
  formatDate = formatCertificationDate,
  selectedYear,
  onYearChange,
  filterOptions = {},
  onExport,
  title = "Certification Requests",
  subtitle = "Partner certification submissions for ESSCI processing",
  showPartnerColumn = true,
  storageKey = "essci-certification-requests",
  emptyMessage,
}) => {
  const [tableInstance, setTableInstance] = useState(null);

  const paginatedData = table.data;
  const paginationInfo = {
    page: table.currentPage,
    limit: table.pageSize,
    total: table.total,
    totalPages: table.totalPages,
  };

  const renderStatusBadge = (row) => {
    const label = getCertificationDerivedStatusLabel(row);
    const cls = getCertificationStatusBadgeClass(row);
    return (
      <span
        className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${cls}`}
      >
        {label}
      </span>
    );
  };

  const columns = useMemo(
    () => [
      {
        id: "request_id",
        accessorKey: "id",
        header: "Request ID",
        cell: ({ row }) => (
          <span className="font-medium text-sm">
            {formatCertificationRequestId(row.original, row.index)}
          </span>
        ),
        size: 150,
        enableHiding: true,
        enableResizing: true,
      },
      ...(showPartnerColumn
        ? [
            {
              id: "partner_name",
              accessorKey: "partner_name",
              header: "Partner",
              cell: ({ row }) => (
                <span className="text-sm text-gray-600">
                  {row.original.partner_name || "—"}
                </span>
              ),
              size: 180,
              enableHiding: true,
              enableResizing: true,
            },
          ]
        : []),
      {
        id: "center_name",
        accessorKey: "center_name",
        header: "Center Name",
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">
            {row.original.center_name || "—"}
          </span>
        ),
        size: 240,
        enableHiding: true,
        enableResizing: true,
      },
      {
        id: "batch_number",
        accessorKey: "batch_number",
        header: "Batch",
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">
            {row.original.batch_number || row.original.other_batch_number || "—"}
          </span>
        ),
        size: 130,
        enableHiding: true,
        enableResizing: true,
      },
      {
        id: "updated_at",
        accessorKey: "updated_at",
        header: "Request Received On",
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">
            {formatDate(
              row.original.created_at ||
                row.original.updated_at ||
                row.original.reviewed_at,
            )}
          </span>
        ),
        size: 140,
        enableHiding: true,
        enableResizing: true,
      },
      {
        id: "status",
        accessorKey: "derived_status",
        header: "Status",
        cell: ({ row }) => renderStatusBadge(row.original),
        size: 160,
        minSize: 140,
        enableHiding: true,
        enableResizing: true,
        meta: { noTruncate: true },
      },
      {
        id: "actions",
        header: "Action",
        cell: ({ row }) => (
          <button
            type="button"
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
    ],
    [formatDate, loading, onViewRequest, showPartnerColumn],
  );

  const filterGroups = useMemo(
    () => [
      {
        label: "Status",
        key: "status",
        options: filterOptions.statuses || [],
        isMulti: true,
      },
      ...(showPartnerColumn
        ? [
            {
              label: "Partner",
              key: "partner",
              options: filterOptions.partners || [],
              isMulti: true,
            },
          ]
        : []),
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
    [filterOptions, showPartnerColumn],
  );

  const sortOptions = [
    { label: "Last Update", value: "updated_at" },
    { label: "Partner Name", value: "partner_name" },
    { label: "Center Name", value: "center_name" },
    { label: "Batch", value: "batch_number" },
    { label: "Status", value: "derived_status" },
  ];

  const actions = [
    {
      label: "Export CSV",
      onClick: onExport,
      icon: ArrowDownTrayIcon,
      variant: "outline",
      disabled: loading || table.total === 0,
    },
  ];

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
        </div>
        <div className="ml-auto">
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => onYearChange(parseInt(value, 10))}
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

      <AdvancedSearchBar
        value={table.searchTerm}
        onChange={table.setSearchTerm}
        placeholder="Search by partner, center, or batch..."
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
        storageKey={storageKey}
      />

      <EnhancedDataTable
        columns={columns}
        data={paginatedData}
        pagination={paginationInfo}
        onPageChange={(page) => table.goToPage(page)}
        isLoading={loading}
        emptyMessage={
          emptyMessage ||
          (table.total === 0 &&
          !table.searchTerm &&
          !hasActiveTableFilters(table.activeFilters)
            ? "No certification requests found."
            : "No requests match your search or filters. Try clearing filters.")
        }
        showSerialNumber={true}
        storageKey={storageKey}
        onTableReady={(t) => setTableInstance(t)}
      />
    </div>
  );
};

export default ESSCIRequestsTab;
