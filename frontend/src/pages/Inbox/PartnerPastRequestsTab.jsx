import React, { useState, useEffect, useCallback } from "react";
import refurbishmentService from "../../services/refurbishment.service";
import PartnerRefurbishmentViewModal from "../../components/refurbishment/modals/PartnerRefurbishmentViewModal";
import PartnerCompletionModal from "../../components/refurbishment/modals/PartnerCompletionModal";

// ── Status badge config ─────────────────────────────────────────────────────
const STATUS_CONFIG = {
  submitted: {
    label: "Submitted",
    cls: "bg-blue-50 text-blue-700 border border-blue-200",
  },
  approved: {
    label: "Approved",
    cls: "bg-green-50 text-green-700 border border-green-200",
  },
  material_procurement: {
    label: "Material Procurement",
    cls: "bg-teal-50 text-teal-700 border border-teal-200",
  },
  installation_in_progress: {
    label: "Installation In Progress",
    cls: "bg-purple-50 text-purple-700 border border-purple-200",
  },
  refurbishment_started: {
    label: "In Progress",
    cls: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  },
  completed: {
    label: "Completed",
    cls: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  rejected: {
    label: "Rejected",
    cls: "bg-red-50 text-red-700 border border-red-200",
  },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || {
    label: status,
    cls: "bg-gray-50 text-gray-700 border border-gray-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}

function fmt(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const LIMIT = 20;

export default function PartnerPastRequestsTab() {
  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // View modal
  const [viewRequest, setViewRequest] = useState(null);
  // Completion modal
  const [completionRequest, setCompletionRequest] = useState(null);

  const fetchRequests = useCallback(async (pageNum = 1) => {
    setLoading(true);
    setError(null);
    try {
      const offset = (pageNum - 1) * LIMIT;
      const data = await refurbishmentService.getPartnerPastRequests({
        limit: LIMIT,
        offset,
      });
      const list = data?.data?.requests || data?.requests || [];
      const count = data?.data?.total ?? data?.total ?? 0;
      setRequests(list);
      setTotal(count);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load past requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests(page);
  }, [fetchRequests, page]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
          </div>
        ) : error ? (
          <div className="py-12 text-center text-red-500 text-sm">{error}</div>
        ) : requests.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-500 text-sm">No past requests found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {[
                  "Request ID",
                  "Type",
                  "Center Name",
                  "Last Updated",
                  "Status",
                  "Action",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => {
                const showCompletion =
                  req.completion_notified_at &&
                  req.status !== "completed" &&
                  req.status !== "rejected" &&
                  !req.partner_completed_at;

                return (
                  <tr
                    key={req.request_id}
                    className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors"
                  >
                    <td className="px-5 py-4 font-mono text-xs text-gray-700">
                      {req.requestId || req.request_id?.slice(0, 8)}
                    </td>
                    <td className="px-5 py-4 text-gray-700 capitalize">
                      {req.type?.replace(/_/g, " ") || "—"}
                    </td>
                    <td className="px-5 py-4 text-gray-900 font-medium">
                      {req.center_name || "—"}
                    </td>
                    <td className="px-5 py-4 text-gray-500">
                      {fmt(req.updated_at)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setViewRequest(req)}
                          className="text-xs text-green-700 font-semibold hover:text-green-900 transition-colors"
                        >
                          View
                        </button>
                        {showCompletion && (
                          <button
                            onClick={() => setCompletionRequest(req)}
                            className="text-xs text-purple-700 font-semibold hover:text-purple-900 transition-colors"
                          >
                            Submit Completion
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500 px-1">
          <span>
            {total} total request{total !== 1 ? "s" : ""}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors text-xs"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 text-xs">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors text-xs"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewRequest && (
        <PartnerRefurbishmentViewModal
          request={viewRequest}
          onClose={() => setViewRequest(null)}
          onSubmitCompletion={(req) => {
            setViewRequest(null);
            setCompletionRequest(req);
          }}
        />
      )}

      {/* Completion Modal */}
      {completionRequest && (
        <PartnerCompletionModal
          request={completionRequest}
          onClose={() => setCompletionRequest(null)}
          onSuccess={() => {
            setCompletionRequest(null);
            fetchRequests(page);
          }}
        />
      )}
    </div>
  );
}
