import React, { useState, useCallback } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import AdminRefurbishmentReviewModal from "../modals/AdminRefurbishmentReviewModal";
import refurbishmentService from "../../../services/refurbishment.service";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { Checkbox } from "../../ui/checkbox";

// Columns that can be shown/hidden (Action is always visible)
const ALERT_COLUMNS = [
  { id: "date", label: "Date" },
  { id: "type", label: "Type" },
  { id: "title", label: "Title" },
  { id: "remark", label: "Remark" },
  { id: "status", label: "Status" },
];

/**
 * AlertsTab
 * Inbox-style split layout:
 *   Left  — searchable alert table
 *   Right — detail panel that opens inline when a row is clicked
 *
 * For refurbishment_response alerts the detail panel fetches full request data,
 * shows it in the Figma card layout, and offers a "Review" button that opens
 * AdminRefurbishmentReviewModal.
 */
const AlertsTab = ({
  table,
  loading = false,
  formatDate,
  filterOptions = {},
  onRefresh,
}) => {
  const [selectedRow, setSelectedRow] = useState(null);
  const [requestDetails, setRequestDetails] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(table.searchTerm || "");
  const [statusFilter, setStatusFilter] = useState("All");

  // Column visibility (persisted in localStorage)
  const [visibleCols, setVisibleCols] = useState(() => {
    try {
      const saved = localStorage.getItem(
        "columnVisibility_refurbishment-alerts",
      );
      if (saved) return JSON.parse(saved);
    } catch {}
    return { date: true, type: true, title: true, remark: true, status: true };
  });

  const toggleCol = (id) => {
    setVisibleCols((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(
        "columnVisibility_refurbishment-alerts",
        JSON.stringify(next),
      );
      return next;
    });
  };

  const hiddenColCount = ALERT_COLUMNS.filter((c) => !visibleCols[c.id]).length;
  const visibleColSpan =
    ALERT_COLUMNS.filter((c) => visibleCols[c.id]).length + 1; // +1 for Action

  const paginatedData = table.data || [];

  // ── Local status filter ───────────────────────────────────────────────────
  const visibleRows =
    statusFilter === "All"
      ? paginatedData
      : paginatedData.filter((row) =>
          statusFilter === "New" ? !row.is_read : !!row.is_read,
        );

  // ── Fetch refurbishment request details when a refurb row is selected ─────
  const fetchDetails = useCallback(async (requestId) => {
    if (!requestId) return;
    setDetailLoading(true);
    setRequestDetails(null);
    try {
      const res =
        await refurbishmentService.getRefurbishmentRequestForReview(requestId);
      setRequestDetails(res.data || res);
    } catch (err) {
      console.error("Error loading refurbishment request:", err);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const isRefurbishmentRow = (row) =>
    row.alert_type === "refurbishment_response" ||
    row.related_entity_type === "refurbishment_request";

  const handleRowClick = (row) => {
    setSelectedRow(row);
    if (isRefurbishmentRow(row) && row.related_entity_id) {
      fetchDetails(row.related_entity_id);
    } else {
      setRequestDetails(null);
    }
  };

  const handleDismiss = () => {
    setSelectedRow(null);
    setRequestDetails(null);
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    table.setSearchTerm(value);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const fmtShortDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  const fmtRQ = (n) => `RQ-${String(n || 0).padStart(6, "0")}`;

  const getFileNames = (details) => {
    if (!details) return [];
    const files = [];
    Object.values(details.images_by_package || {}).forEach((arr) =>
      arr.forEach((img) => files.push(img.file_name || img.name || "file")),
    );
    return files;
  };

  const { currentPage, totalPages, goToPage } = table;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex gap-5 min-h-0">
      {/* ── Left — Alert table ────────────────────────────────────────────── */}
      <div
        className={`flex flex-col gap-4 transition-all duration-300 ${
          selectedRow ? "w-[52%]" : "w-full"
        }`}
      >
        {/* Search + filter bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
              />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <span className="text-sm text-gray-500 font-medium whitespace-nowrap">
            Filters:
          </span>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-4 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-400 cursor-pointer"
            >
              {["All", "New", "Read"].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>

          <button className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50">
            <svg
              className="h-4 w-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7h18M6 12h12M9 17h6"
              />
            </svg>
          </button>

          {/* Column visibility toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white hover:bg-gray-50 transition-colors whitespace-nowrap">
                <svg
                  className="h-4 w-4 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h8m-8 6h16"
                  />
                </svg>
                Columns
                {hiddenColCount > 0 && (
                  <span className="ml-0.5 rounded-full bg-gray-200 px-1.5 py-0.5 text-xs font-medium">
                    {hiddenColCount} hidden
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {ALERT_COLUMNS.map((col) => (
                <DropdownMenuItem
                  key={col.id}
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                  onSelect={(e) => {
                    e.preventDefault();
                    toggleCol(col.id);
                  }}
                >
                  <Checkbox
                    checked={visibleCols[col.id]}
                    onCheckedChange={() => toggleCol(col.id)}
                    className="pointer-events-none"
                  />
                  <span className="text-sm">{col.label}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-xs text-center text-gray-500 cursor-pointer px-3 py-2"
                onSelect={(e) => {
                  e.preventDefault();
                  const all = Object.fromEntries(
                    ALERT_COLUMNS.map((c) => [c.id, true]),
                  );
                  setVisibleCols(all);
                  localStorage.setItem(
                    "columnVisibility_refurbishment-alerts",
                    JSON.stringify(all),
                  );
                }}
              >
                Reset to default
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Table */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {ALERT_COLUMNS.filter((c) => visibleCols[c.id]).map((c) => (
                  <th
                    key={c.id}
                    className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3"
                  >
                    {c.label}
                  </th>
                ))}
                <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={visibleColSpan} className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-green-500" />
                  </td>
                </tr>
              )}

              {!loading && visibleRows.length === 0 && (
                <tr>
                  <td
                    colSpan={visibleColSpan}
                    className="text-center py-12 text-sm text-gray-400"
                  >
                    No alerts found
                  </td>
                </tr>
              )}

              {!loading &&
                visibleRows.map((row, i) => {
                  const isNew = !row.is_read;
                  const isRefurb = isRefurbishmentRow(row);
                  const isActive = selectedRow?.id === row.id;

                  return (
                    <tr
                      key={row.id || i}
                      onClick={() => handleRowClick(row)}
                      className={`border-b border-gray-50 cursor-pointer transition-colors ${
                        isActive ? "bg-green-50" : "hover:bg-gray-50"
                      }`}
                    >
                      {visibleCols.date && (
                        <td className="px-4 py-4 text-xs text-gray-500 whitespace-nowrap">
                          {fmtShortDate(row.created_at)}
                        </td>
                      )}
                      {visibleCols.type && (
                        <td className="px-4 py-4 text-xs text-gray-700">
                          {isRefurb
                            ? row.center_name || "Refurbishment"
                            : row.alert_type || row.type || "General"}
                        </td>
                      )}
                      {visibleCols.title && (
                        <td className="px-4 py-4 font-medium text-gray-900 text-sm">
                          {row.title || row.message || "—"}
                        </td>
                      )}
                      {visibleCols.remark && (
                        <td className="px-4 py-4 text-xs text-gray-500 max-w-[180px]">
                          <span className="line-clamp-2">
                            {row.message
                              ? `"${row.message}"`
                              : row.remark || "—"}
                          </span>
                        </td>
                      )}
                      {visibleCols.status && (
                        <td className="px-4 py-4">
                          {(() => {
                            const s = row.request_status;
                            if (s === "completed")
                              return (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                                  Completed
                                </span>
                              );
                            if (
                              s === "approved" ||
                              s === "material_procurement" ||
                              s === "installation_in_progress" ||
                              s === "refurbishment_started"
                            )
                              return (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                                  {s === "approved"
                                    ? "Approved"
                                    : s === "refurbishment_started"
                                      ? "In Progress"
                                      : s === "material_procurement"
                                        ? "Procurement"
                                        : "Installation"}
                                </span>
                              );
                            if (s === "rejected")
                              return (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                                  Rejected
                                </span>
                              );
                            if (isNew)
                              return (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-red-500 text-white">
                                  New
                                </span>
                              );
                            return (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                                Read
                              </span>
                            );
                          })()}
                        </td>
                      )}
                      <td className="px-4 py-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(row);
                          }}
                          className="text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                        >
                          {isRefurb ? "View Request" : "View error report"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="px-3 py-1 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                >
                  ‹
                </button>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right — Detail panel ──────────────────────────────────────────── */}
      {selectedRow && (
        <div className="flex-1 min-w-0">
          {isRefurbishmentRow(selectedRow) ? (
            /* ── Refurbishment request card ─── */
            <div className="border border-gray-200 rounded-2xl bg-white p-7 flex flex-col gap-5 max-h-[75vh] overflow-y-auto scrollbar-subtle">
              {detailLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-2/3" />
                  <div className="grid grid-cols-3 gap-4">
                    <div className="h-10 bg-gray-100 rounded" />
                    <div className="h-10 bg-gray-100 rounded" />
                    <div className="h-10 bg-gray-100 rounded" />
                  </div>
                  <div className="h-4 bg-gray-100 rounded w-1/4" />
                  <div className="h-20 bg-gray-100 rounded" />
                  <div className="h-4 bg-gray-100 rounded w-1/4" />
                  <div className="flex gap-2">
                    <div className="h-8 bg-gray-100 rounded w-28" />
                    <div className="h-8 bg-gray-100 rounded w-28" />
                  </div>
                </div>
              ) : (
                <>
                  {/* Title */}
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-bold text-gray-900 leading-snug">
                      Refurbishment Request{" "}
                      {requestDetails?.request?.request_number
                        ? `(${fmtRQ(requestDetails.request.request_number)})`
                        : ""}
                    </h2>
                    <button
                      onClick={handleDismiss}
                      className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Partner / Subject / Center */}
                  <div className="grid grid-cols-3 gap-x-6 gap-y-3">
                    <div>
                      <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1">
                        Partner Name
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        {requestDetails?.request?.partner_name ||
                          selectedRow.partner_name ||
                          "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1">
                        Subject
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        Request for Lab Refurbishment
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1">
                        Center Name
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        {requestDetails?.request?.center_name ||
                          selectedRow.center_name ||
                          "—"}
                      </p>
                    </div>
                  </div>

                  {/* Date */}
                  <div>
                    <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1">
                      Date Submitted
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {fmtShortDate(
                        requestDetails?.request?.created_at ||
                          selectedRow.created_at,
                      )}
                    </p>
                  </div>

                  {/* Description */}
                  <div>
                    <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-2">
                      Description:
                    </p>
                    <div className="border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 min-h-[64px]">
                      <p className="text-sm text-gray-700 leading-relaxed italic">
                        {requestDetails?.request?.justification ||
                          selectedRow.message ||
                          selectedRow.remark ||
                          "No description available."}
                      </p>
                    </div>
                  </div>

                  {/* Files */}
                  {getFileNames(requestDetails).length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-2">
                        Files Uploaded:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {getFileNames(requestDetails).map((name, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-xs text-gray-700 font-medium"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
                    <button
                      onClick={handleDismiss}
                      className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => setReviewModalOpen(true)}
                      className="px-7 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-full transition-colors"
                    >
                      Review
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* ── Generic alert detail card ─── */
            <div className="border border-gray-200 rounded-2xl bg-white p-7 flex flex-col gap-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-bold text-gray-900">
                  {selectedRow.title || "Alert Details"}
                </h2>
                <button
                  onClick={handleDismiss}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1">
                    Type
                  </p>
                  <p className="text-sm text-gray-900">
                    {selectedRow.alert_type || selectedRow.type || "General"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1">
                    Date
                  </p>
                  <p className="text-sm text-gray-900">
                    {fmtShortDate(selectedRow.created_at)}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-2">
                  Remark
                </p>
                <div className="border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 min-h-[60px]">
                  <p className="text-sm text-gray-700">
                    {selectedRow.message || selectedRow.remark || "No remark."}
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-gray-100">
                <button
                  onClick={handleDismiss}
                  className="text-sm font-medium text-gray-500 hover:text-gray-800"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Admin Review Modal ─────────────────────────────────────────────── */}
      <AdminRefurbishmentReviewModal
        open={reviewModalOpen}
        onOpenChange={setReviewModalOpen}
        requestId={selectedRow?.related_entity_id}
        onActionComplete={() => {
          onRefresh?.();
          setSelectedRow(null);
          setRequestDetails(null);
        }}
      />
    </div>
  );
};

export default AlertsTab;
