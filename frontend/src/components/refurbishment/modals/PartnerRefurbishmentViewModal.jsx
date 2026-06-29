import React from "react";
import { Dialog, DialogContent, DialogTitle } from "../../ui/dialog";
import { XMarkIcon, PaperClipIcon } from "@heroicons/react/24/outline";

const STATUS_CONFIG = {
  submitted: { label: "Submitted", cls: "bg-blue-50 text-blue-700" },
  approved: { label: "Approved", cls: "bg-green-50 text-green-700" },
  material_procurement: {
    label: "Material Procurement Completed",
    cls: "bg-teal-50 text-teal-700",
  },
  installation_in_progress: {
    label: "Installation In Progress",
    cls: "bg-purple-50 text-purple-700",
  },
  refurbishment_started: {
    label: "In Progress",
    cls: "bg-yellow-50 text-yellow-700",
  },
  completed: { label: "Completed", cls: "bg-emerald-50 text-emerald-700" },
  rejected: { label: "Rejected", cls: "bg-red-50 text-red-700" },
};

function fmt(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * PartnerRefurbishmentViewModal
 * Read-only view of a past refurbishment request for the partner.
 *
 * @param {{ request: object, onClose: () => void, onSubmitCompletion: (req) => void }} props
 */
export default function PartnerRefurbishmentViewModal({
  request,
  onClose,
  onSubmitCompletion,
}) {
  if (!request) return null;

  const statusCfg = STATUS_CONFIG[request.status] || {
    label: request.status,
    cls: "bg-gray-50 text-gray-700",
  };

  const showCompletionBtn =
    request.completion_notified_at &&
    request.status !== "completed" &&
    request.status !== "rejected" &&
    !request.partner_completed_at;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />

      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-7 pt-7 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Refurbishment Request
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {request.center_name || "—"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-7 py-6 space-y-5">
            {/* Status row */}
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusCfg.cls}`}
              >
                {statusCfg.label}
              </span>
              {request.approved_at && (
                <span className="text-xs text-gray-400">
                  Approved on {fmt(request.approved_at)}
                </span>
              )}
              {request.completed_at && (
                <span className="text-xs text-gray-400">
                  · Completed on {fmt(request.completed_at)}
                </span>
              )}
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-4">
              <InfoRow
                label="Request ID"
                value={request.requestId || request.request_id?.slice(0, 8)}
              />
              <InfoRow
                label="Type"
                value={request.type?.replace(/_/g, " ") || "—"}
                capitalize
              />
              <InfoRow label="Center Name" value={request.center_name} />
              <InfoRow label="Date Submitted" value={fmt(request.created_at)} />
              <InfoRow label="Last Updated" value={fmt(request.updated_at)} />
              {request.center_address && (
                <InfoRow
                  label="Center Address"
                  value={request.center_address}
                  className="col-span-2"
                />
              )}
            </div>

            {/* Admin remarks */}
            {request.admin_remarks && (
              <div className="bg-blue-50 rounded-xl px-5 py-4">
                <p className="text-xs font-semibold text-blue-700 mb-1">
                  Admin Remarks
                </p>
                <p className="text-sm text-blue-900">{request.admin_remarks}</p>
              </div>
            )}

            {/* Rejection reason */}
            {request.rejection_reason && (
              <div className="bg-red-50 rounded-xl px-5 py-4">
                <p className="text-xs font-semibold text-red-700 mb-1">
                  Rejection Reason
                </p>
                <p className="text-sm text-red-900">
                  {request.rejection_reason}
                </p>
              </div>
            )}

            {/* Completion statement from admin */}
            {request.completion_statement && (
              <div className="bg-emerald-50 rounded-xl px-5 py-4">
                <p className="text-xs font-semibold text-emerald-700 mb-1">
                  Completion Statement
                </p>
                <p className="text-sm text-emerald-900">
                  {request.completion_statement}
                </p>
              </div>
            )}

            {/* Partner completion evidence already submitted */}
            {request.partner_completed_at && (
              <div className="bg-purple-50 rounded-xl px-5 py-4">
                <p className="text-xs font-semibold text-purple-700 mb-1">
                  Your Completion Report · {fmt(request.partner_completed_at)}
                </p>
                {request.partner_completion_description && (
                  <p className="text-sm text-purple-900 mt-1">
                    {request.partner_completion_description}
                  </p>
                )}
              </div>
            )}

            {/* 2-month completion notification banner */}
            {showCompletionBtn && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-start gap-3">
                <span className="text-amber-500 text-lg">⚠️</span>
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    Action Required: Submit Completion Evidence
                  </p>
                  <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                    Your refurbishment was approved over 2 months ago. Please
                    upload photos, documents, and a description to mark it as
                    complete.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-7 pb-7 pt-2 border-t border-gray-100">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-full border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            {showCompletionBtn && (
              <button
                onClick={() => onSubmitCompletion(request)}
                className="px-7 py-2.5 rounded-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors"
              >
                Submit Completion
              </button>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

function InfoRow({ label, value, capitalize = false, className = "" }) {
  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <span className="text-xs text-gray-400 font-medium">{label}</span>
      <span
        className={`text-sm text-gray-900 ${capitalize ? "capitalize" : ""}`}
      >
        {value || "—"}
      </span>
    </div>
  );
}
