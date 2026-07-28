import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X, AlertCircle } from "lucide-react";
import ESSCICertificationWorkflowPanel from "./ESSCICertificationWorkflowPanel";
import AdminCertificationReviewPanel from "./AdminCertificationReviewPanel";
import { essciGetBatchDetail } from "../../services/certification.service";
import { ROUTES } from "../../constants/routes";
import {
  formatCertificationDate,
  formatCertificationRequestId,
  getCertificationDerivedStatusLabel,
  getCertificationStatusBadgeClass,
} from "../../utils/certificationUtils";

/**
 * Certification request detail modal — layout aligned with PartnerPastRequestDetailModal.
 */
export default function ESSCICertificationRequestDetailModal({
  uploadId,
  open,
  onClose,
  onRefresh,
  listIndex = 0,
  fetchDetail,
  readOnly = false,
  allowAdminReview = false,
}) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadDetail = fetchDetail || essciGetBatchDetail;

  const reloadDetails = async () => {
    if (!uploadId) return;
    const res = await loadDetail(uploadId);
    setDetails(res?.data || res);
  };

  useEffect(() => {
    if (!open || !uploadId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await loadDetail(uploadId);
        const data = res?.data || res;
        if (!cancelled) setDetails(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              "Failed to load request details.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, uploadId, loadDetail]);

  if (!open) return null;

  const derivedLabel = getCertificationDerivedStatusLabel(details);
  const badgeCls = getCertificationStatusBadgeClass(details);

  const handleWorkflowSuccess = () => {
    onRefresh?.();
    reloadDetails();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between px-7 py-5 border-b border-gray-100 shrink-0">
            <div className="flex-1 min-w-0">
              <p className="text-xl font-bold text-gray-900 truncate">
                {details?.center_name || "Certification Request"}
              </p>
              <div className="flex items-center justify-between gap-3 mt-1.5">
                <p className="text-xs text-gray-400 truncate min-w-0">
                  {details
                    ? formatCertificationRequestId(details, listIndex)
                    : "—"}
                  {details?.created_at
                    ? ` · Received ${formatCertificationDate(details.created_at)}`
                    : ""}
                </p>
                {details && (
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shrink-0 ${badgeCls}`}
                  >
                    {derivedLabel}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ml-4 shrink-0 p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
              </div>
            ) : error ? (
              <div className="py-16 text-center">
                <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                <p className="text-red-500 text-sm">{error}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-4 text-sm text-gray-600 underline"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="flex flex-col">
                {(details?.rejection_reason ||
                  details?.remarks ||
                  details?.pdf_rejection_reason) && (
                  <div
                    className={`mx-6 mt-5 px-5 py-3.5 rounded-2xl border text-sm ${
                      details?.pdf_status === "rejected" ||
                      details?.status === "rejected"
                        ? "bg-red-50 border-red-200 text-red-800"
                        : "bg-amber-50 border-amber-200 text-amber-800"
                    }`}
                  >
                    <span className="font-semibold">Remarks: </span>
                    {details.pdf_rejection_reason ||
                      details.rejection_reason ||
                      details.remarks}
                  </div>
                )}

                {allowAdminReview && details?.status === "pending" && (
                  <AdminCertificationReviewPanel
                    uploadId={details.id}
                    status={details.status}
                    onSuccess={handleWorkflowSuccess}
                  />
                )}

                {details?.status === "rejected" && !allowAdminReview && (
                  <div className="mx-6 mt-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
                    <p className="font-semibold">This request was rejected by admin.</p>
                    <p className="mt-1">
                      {details.rejection_reason || details.remarks || "Please review the remarks and resubmit corrected details for the same request."}
                    </p>
                    <Link
                      to={`${ROUTES.UPLOAD_DATA}?tab=certification&certResubmit=${encodeURIComponent(details.id)}`}
                      className="inline-flex mt-3 text-sm font-semibold text-red-700 underline hover:text-red-900"
                      onClick={onClose}
                    >
                      Correct &amp; resubmit this request
                    </Link>
                  </div>
                )}

                {details && (
                  <ESSCICertificationWorkflowPanel
                    details={details}
                    onSuccess={handleWorkflowSuccess}
                    readOnly={
                      readOnly ||
                      allowAdminReview ||
                      details.status !== "approved"
                    }
                    initialStep={
                      allowAdminReview && details.status === "pending" ? 0 : undefined
                    }
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
