import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Package,
  ChevronRight,
} from "lucide-react";
import refurbishmentService from "../../services/refurbishment.service";
import PartnerPastRequestDetailModal from "../../components/refurbishment/modals/PartnerPastRequestDetailModal";
import PartnerCompletionModal from "../../components/refurbishment/modals/PartnerCompletionModal";
import { getPartnerRefurbishmentDisplayStatus } from "../../utils/refurbishmentUtils";

const STATUS = {
  submitted: {
    label: "Submitted",
    Icon: Clock,
    cls: "bg-blue-50 text-blue-700 border-blue-200",
    dotCls: "bg-blue-500",
  },
  approved: {
    label: "Approved",
    Icon: CheckCircle2,
    cls: "bg-green-50 text-green-700 border-green-200",
    dotCls: "bg-green-500",
  },
  rejected: {
    label: "Rejected",
    Icon: XCircle,
    cls: "bg-red-50 text-red-700 border-red-200",
    dotCls: "bg-red-500",
  },
  material_procurement: {
    label: "Material Procurement Completed",
    Icon: CheckCircle2,
    cls: "bg-teal-50 text-teal-700 border-teal-200",
    dotCls: "bg-teal-500",
  },
  installation_in_progress: {
    label: "Installation In Progress",
    Icon: CheckCircle2,
    cls: "bg-purple-50 text-purple-700 border-purple-200",
    dotCls: "bg-purple-500",
  },
  refurbishment_started: {
    label: "In Progress",
    Icon: Clock,
    cls: "bg-yellow-50 text-yellow-700 border-yellow-200",
    dotCls: "bg-yellow-400",
  },
  sent_back: {
    label: "Sent Back",
    Icon: AlertCircle,
    cls: "bg-amber-50 text-amber-800 border-amber-200",
    dotCls: "bg-amber-500",
  },
  completed: {
    label: "Completed",
    Icon: CheckCircle2,
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotCls: "bg-emerald-500",
  },
  acknowledgement_pending: {
    label: "Acknowledgement Pending",
    Icon: Clock,
    cls: "bg-purple-50 text-purple-700 border-purple-200",
    dotCls: "bg-purple-500",
  },
  completion_pending: {
    label: "Completion Pending",
    Icon: Clock,
    cls: "bg-sky-50 text-sky-800 border-sky-200",
    dotCls: "bg-sky-500",
  },
};

function StatusBadge({ status }) {
  const cfg = STATUS[status] || {
    label: status,
    Icon: AlertCircle,
    cls: "bg-gray-50 text-gray-700 border-gray-200",
    dotCls: "bg-gray-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotCls}`} />
      {cfg.label}
    </span>
  );
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const LIMIT = 20;

// ── Main Tab ─────────────────────────────────────────────────────────────────
export default function PartnerPastRequestsTab() {
  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [completionRequest, setCompletionRequest] = useState(null);

  const fetchRequests = useCallback(async (pageNum = 1) => {
    setLoading(true);
    setError(null);
    try {
      const offset = (pageNum - 1) * LIMIT;
      const res = await refurbishmentService.getPartnerPastRequests({
        limit: LIMIT,
        offset,
      });
      if (res?.success && res.data) {
        setRequests(res.data.requests || []);
        setTotal(res.data.total ?? 0);
      } else {
        setRequests([]);
        setTotal(0);
        if (res && res.success === false) {
          setError(res.message || "Failed to load past requests");
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load past requests");
      setRequests([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests(page);
  }, [fetchRequests, page]);

  const totalPages = Math.ceil(total / LIMIT);

  const displayRequests = requests.filter((req) => {
    const matchSearch =
      !searchTerm ||
      req.center_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.request_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.requestId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus =      statusFilter === "All" ||
      req.status === statusFilter.toLowerCase().replace(/ /g, "_");
    return matchSearch && matchStatus;
  });

  const handleSelectRequest = (req) => setSelectedRequest(req);

  const handleSubmitCompletion = (req) => {
    setSelectedRequest(null);
    setCompletionRequest(req);
  };

  return (
    <div className="flex flex-col gap-4 min-h-[520px]">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Past Requests</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Track submitted refurbishment requests and open full details when
          needed.
        </p>      </div>

      <div className="flex flex-col gap-3 w-full">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <svg              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
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
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by center or request ID…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-3 pr-7 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-400 cursor-pointer"
          >
            {["All", "Submitted", "Sent Back", "Approved", "Rejected", "Completed"].map(
              (o) => (
                <option key={o}>{o}</option>
              ),
            )}
          </select>
        </div>

        {/* Request cards */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-green-600" />
            </div>
          ) : error ? (
            <div className="py-10 text-center text-red-500 text-sm">
              {error}
            </div>
          ) : displayRequests.length === 0 ? (
            <div className="py-14 text-center">
              <Package className="w-9 h-9 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">
                {searchTerm || statusFilter !== "All"
                  ? "No past requests match your search or filter."
                  : "No past requests found."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {displayRequests.map((req) => {
                const isSelected =
                  selectedRequest?.request_id === req.request_id;
                const showCompletion =
                  req.completion_notified_at &&
                  req.status !== "completed" &&
                  req.status !== "rejected" &&
                  !req.partner_completed_at;
                const requestIdLabel =
                  req.requestId ||
                  (req.request_id
                    ? `REQ-${new Date(req.created_at).getFullYear()}-${req.request_id.slice(0, 8).toUpperCase()}`
                    : "—");

                return (
                  <button
                    key={req.request_id}
                    onClick={() => handleSelectRequest(req)}
                    className={`w-full text-left px-5 py-3.5 transition-colors ${isSelected ? "bg-green-50 border-l-2 border-l-green-500" : "hover:bg-gray-50/80 border-l-2 border-l-transparent"}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {req.center_name || "—"}
                        </p>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-mono text-gray-400 truncate min-w-0">
                            {requestIdLabel}
                          </p>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {fmtDate(req.updated_at)}
                            </span>
                            <StatusBadge
                              status={
                                getPartnerRefurbishmentDisplayStatus(req).badgeKey
                              }
                            />
                            {showCompletion && (
                              <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                                Acknowledgment Needed
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 shrink-0 mt-0.5 transition-colors ${isSelected ? "text-green-600" : "text-gray-300"}`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-gray-500 px-1">
            <span>
              {total} request{total !== 1 ? "s" : ""}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <span className="px-2 py-1.5">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedRequest && (
        <PartnerPastRequestDetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onSubmitCompletion={handleSubmitCompletion}
        />
      )}

      {completionRequest && (
        <PartnerCompletionModal
          request={completionRequest}          onClose={() => setCompletionRequest(null)}
          onSuccess={() => {
            setCompletionRequest(null);
            setSelectedRequest(null);
            fetchRequests(page);
          }}
        />
      )}
    </div>
  );
}
