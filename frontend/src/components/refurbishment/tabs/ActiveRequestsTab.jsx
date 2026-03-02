import React, { useMemo, useState } from "react";
import { Button } from "../../ui/button";
import { Switch } from "../../ui/switch";
import { BellIcon, PlusIcon } from "@heroicons/react/24/outline";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import EnhancedDataTable from "../../common/EnhancedDataTable";
import ColumnVisibilityToggle from "../../common/ColumnVisibilityToggle";

const YEAR_OPTIONS = [
  { value: "2026", label: "2026" },
  { value: "2025", label: "2025" },
  { value: "2024", label: "2024" },
  { value: "2023", label: "2023" },
  { value: "2022", label: "2022" },
];

/**
 * Format frequency value â†’ "3 Months", "Monthly", etc.
 */
const formatFrequency = (value) => {
  if (!value && value !== 0) return "-";
  if (typeof value === "number")
    return `${value} Month${value !== 1 ? "s" : ""}`;
  const n = Number(value);
  if (!isNaN(n) && String(value).trim() !== "")
    return `${n} Month${n !== 1 ? "s" : ""}`;
  const MAP = {
    instant: "One-time",
    "one-time": "One-time",
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    custom: "Custom",
  };
  return MAP[value] || value;
};

/**
 * Format last-sent timestamp â†’ "Last alert sent on DD/MM/YYYY HH:MM"
 */
const formatLastAlert = (row) => {
  const ts =
    row.original.last_sent_at ||
    row.original.updated_at ||
    row.original.created_at;
  if (!ts) return "-";
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `Sent on ${dd}/${mm}/${yyyy} ${hh}:${min}`;
};

/**
 * ActiveRequestsTab Component
 * Displays active refurbishment requests â€” Figma design.
 * Columns: AUTO NOTIF | PARTNER NAME | REASON | FREQUENCY | LAST UPDATE | ACTION
 */
const ActiveRequestsTab = ({
  table,
  loading = false,
  onNotifyPartner,
  onToggleAutoSend,
  onCreateManualRequest,
  selectedYear,
  onYearChange,
  // formatDate, filterOptions, onExport, onEditScheduled, onCancelScheduled, onViewHistory
  // are accepted by the parent but not used in this implementation
}) => {
  const paginatedData = table.data;

  const [tableInstance, setTableInstance] = useState(null);

  const paginationInfo = {
    page: table.currentPage,
    limit: table.pageSize,
    total: table.total,
    totalPages: table.totalPages,
  };

  const columns = useMemo(
    () => [
      {
        id: "auto_send",
        accessorKey: "auto_send",
        header: "AUTO NOTIF",
        cell: ({ row }) => {
          const isOn = row.original.auto_send || false;
          return (
            <Switch
              checked={isOn}
              onCheckedChange={(checked) =>
                onToggleAutoSend && onToggleAutoSend(row.original.id, checked)
              }
              disabled={loading}
              className={isOn ? "data-[state=checked]:bg-green-500" : ""}
            />
          );
        },
        size: 120,
        enableResizing: false,
        enableHiding: false,
      },
      {
        id: "organization_name",
        accessorKey: "organization_name",
        header: "PARTNER NAME",
        cell: ({ row }) => {
          const name =
            row.original.organization_name || row.original.partner_name || "-";
          const initial = name.charAt(0).toUpperCase();
          return (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">{initial}</span>
              </div>
              <span className="font-semibold text-gray-900 text-sm">
                {name}
              </span>
            </div>
          );
        },
        size: 220,
        enableResizing: true,
        enableHiding: false,
      },
      {
        id: "reason",
        accessorKey: "reason",
        header: "REASON",
        cell: ({ row }) => {
          const text =
            row.original.reason || row.original.message || "Refurbishment";
          return <span className="text-sm text-gray-700">{text}</span>;
        },
        size: 180,
        enableResizing: true,
        enableHiding: true,
      },
      {
        id: "frequency",
        accessorKey: "frequency",
        header: "FREQUENCY",
        cell: ({ row }) => (
          <span className="text-sm text-gray-700">
            {formatFrequency(
              row.original.frequency_months ?? row.original.frequency,
            )}
          </span>
        ),
        size: 130,
        enableResizing: true,
        enableHiding: true,
      },
      {
        id: "last_update",
        accessorKey: "updated_at",
        header: "LAST UPDATE",
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">{formatLastAlert(row)}</span>
        ),
        size: 260,
        enableResizing: true,
        enableHiding: true,
      },
      {
        id: "action",
        header: "ACTION",
        cell: ({ row }) => {
          const isAutoOn = row.original.auto_send || false;
          return (
            <button
              onClick={() => onNotifyPartner && onNotifyPartner(row.original)}
              disabled={loading}
              title={isAutoOn ? "Auto-send enabled" : "Send Notification"}
              className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${
                isAutoOn
                  ? "border-gray-300 text-gray-400 hover:bg-gray-50"
                  : "border-green-500 text-green-600 hover:bg-green-50"
              }`}
            >
              <BellIcon className="w-4 h-4" />
            </button>
          );
        },
        size: 80,
        enableResizing: false,
        enableHiding: false,
      },
    ],
    [loading, onNotifyPartner, onToggleAutoSend],
  );

  const currentYear = selectedYear
    ? String(selectedYear)
    : String(new Date().getFullYear());

  return (
    <div className="space-y-4">
      {/* Header: Create button (left) + Columns toggle + Year dropdown (right) */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={onCreateManualRequest}
          disabled={loading}
          className="rounded-full border-green-500 text-green-600 hover:bg-green-50 px-5"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Create new request
        </Button>

        <div className="flex items-center gap-3">
          {tableInstance && (
            <ColumnVisibilityToggle
              table={tableInstance}
              storageKey="refurbishment-active-requests"
            />
          )}
          <Select
            value={currentYear}
            onValueChange={(val) => onYearChange && onYearChange(Number(val))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEAR_OPTIONS.map((y) => (
                <SelectItem key={y.value} value={y.value}>
                  {y.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Data Table */}
      <EnhancedDataTable
        data={paginatedData}
        columns={columns}
        paginationInfo={paginationInfo}
        onPageChange={table.setCurrentPage}
        onPageSizeChange={table.setPageSize}
        loading={loading}
        emptyMessage="No active refurbishment requests found"
        storageKey="refurbishment-active-requests"
        onTableReady={(t) => setTableInstance(t)}
      />
    </div>
  );
};

export default ActiveRequestsTab;
