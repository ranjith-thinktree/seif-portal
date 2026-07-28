import React, { useState } from "react";
import { ArrowPathIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { toast } from "react-toastify";
import {
  adminApproveCertificationUpload,
  adminRejectCertificationUpload,
} from "../../services/certification.service";

/**
 * Admin-only review actions for pending certification requests.
 * Approve runs immediately; reject asks for a reason in a popup.
 */
export default function AdminCertificationReviewPanel({
  uploadId,
  status,
  onSuccess,
}) {
  const [submitting, setSubmitting] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  if (status !== "pending") return null;

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      const res = await adminApproveCertificationUpload(uploadId);
      if (res.success) {
        toast.success(res.message || "Request approved.");
        onSuccess?.();
      } else {
        toast.error(res.message || "Approval failed.");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Approval failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectReason.trim()) {
      toast.error("Rejection reason is required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await adminRejectCertificationUpload(
        uploadId,
        rejectReason.trim(),
      );
      if (res.success) {
        toast.success(res.message || "Request rejected.");
        setRejectOpen(false);
        setRejectReason("");
        onSuccess?.();
      } else {
        toast.error(res.message || "Rejection failed.");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Rejection failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="mx-6 mt-5 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-amber-900">
            Admin review required
          </p>
          <p className="text-xs text-amber-800 mt-1">
            Review the partner-submitted details below, then approve or reject
            this request.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleApprove}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#009530] text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60"
          >
            {submitting && !rejectOpen ? (
              <>
                <ArrowPathIcon className="w-4 h-4 animate-spin" /> Processing…
              </>
            ) : (
              "Approve Request"
            )}
          </button>
          <button
            type="button"
            onClick={() => setRejectOpen(true)}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-red-300 text-red-700 text-sm font-semibold hover:bg-red-50 disabled:opacity-60"
          >
            Reject Request
          </button>
        </div>
      </div>

      {rejectOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40"
          onClick={() => {
            if (!submitting) {
              setRejectOpen(false);
              setRejectReason("");
            }
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Reject certification request
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Provide a clear reason so the partner can correct and resubmit.
                </p>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setRejectOpen(false);
                  setRejectReason("");
                }}
                className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Rejection reason *
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                disabled={submitting}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Explain what the partner should correct"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setRejectOpen(false);
                  setRejectReason("");
                }}
                className="px-4 py-2 rounded-full text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                disabled={submitting || !rejectReason.trim()}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />{" "}
                    Rejecting…
                  </>
                ) : (
                  "Confirm Reject"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
