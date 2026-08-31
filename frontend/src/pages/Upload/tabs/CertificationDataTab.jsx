import React from "react";
import { Link } from "react-router-dom";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import RefurbishmentDatePicker from "../../../components/refurbishment/RefurbishmentDatePicker";
import { ROUTES } from "../../../constants/routes";

function parseLocalDate(iso) {
  if (!iso) return null;
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function addDays(date, days) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function isAfter(a, b) {
  return a.getTime() > b.getTime();
}

const CertificationDataTab = ({
  certNoteOpen,
  setCertNoteOpen,
  certSuccess,
  certError,
  certCenters,
  certBatches,
  certCenterId,
  certBatchId,
  setCertBatchId,
  certOtherBatchNumber,
  setCertOtherBatchNumber,
  certCentersLoading,
  certBatchesLoading,
  certBatchStartDate,
  setCertBatchStartDate,
  certBatchEndDate,
  setCertBatchEndDate,
  certAssessmentDate,
  setCertAssessmentDate,
  certSpokeName,
  setCertSpokeName,
  certSpokeEmail,
  setCertSpokeEmail,
  certSpokeMobile,
  setCertSpokeMobile,
  certUploading,
  certResubmitId = "",
  certResubmitLoading = false,
  certResubmitRejectionReason = "",
  handleCertCenterChange,
  handleCertUpload,
}) => {
  const canSubmit =
    certCenterId &&
    (certBatchId || certOtherBatchNumber.trim().length > 0) &&
    Boolean(certBatchStartDate) &&
    Boolean(certBatchEndDate) &&
    Boolean(certAssessmentDate) &&
    certSpokeName.trim().length > 0 &&
    certSpokeEmail.trim().length > 0 &&
    certSpokeMobile.trim().length > 0;
  const isResubmit = Boolean(certResubmitId);

  const today = startOfToday();
  const endDateObj = parseLocalDate(certBatchEndDate);
  const assessmentMaxDate = endDateObj ? addDays(endDateObj, 30) : undefined;

  const handleStartDateChange = (iso) => {
    setCertBatchStartDate(iso);
    // End Date has no limits relative to Start — do not clear it.
    const currentEnd = parseLocalDate(certBatchEndDate);
    const currentAssessment = parseLocalDate(certAssessmentDate);
    if (
      currentAssessment &&
      currentEnd &&
      isAfter(currentAssessment, addDays(currentEnd, 30))
    ) {
      setCertAssessmentDate("");
    }
  };

  const handleEndDateChange = (iso) => {
    setCertBatchEndDate(iso);
    const nextEnd = parseLocalDate(iso);
    if (!nextEnd) {
      setCertAssessmentDate("");
      return;
    }
    const currentAssessment = parseLocalDate(certAssessmentDate);
    if (currentAssessment && isAfter(currentAssessment, addDays(nextEnd, 30))) {
      setCertAssessmentDate("");
    }
  };

  return (
    <div>
      {isResubmit && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-4">
          <h3 className="font-semibold text-red-800 text-sm">
            Resubmitting rejected request
          </h3>
          <p className="text-red-700 text-sm mt-1">
            Update the details below and resubmit. The same request ID will be
            used and sent back to admin for review.
          </p>
          {certResubmitRejectionReason && (
            <p className="text-red-800 text-sm mt-2">
              <span className="font-semibold">Rejection reason:</span>{" "}
              {certResubmitRejectionReason}
            </p>
          )}
          {certResubmitLoading && (
            <p className="text-red-600 text-sm mt-2">Loading request details…</p>
          )}
        </div>
      )}

      {/* Collapsible Note */}
      <div className="mb-6 border-l-4 border-amber-500 rounded-r-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setCertNoteOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-3 bg-amber-50 px-4 py-3 text-left hover:bg-amber-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-amber-500 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="font-semibold text-amber-800 text-sm">
              Note ! &nbsp;Batch Must Be Approved Before Submitting
            </span>
          </div>
          <svg
            className={`h-4 w-4 text-amber-600 flex-shrink-0 transition-transform duration-200 ${certNoteOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {certNoteOpen && (
          <div className="bg-amber-50 px-4 pb-4 pt-1 border-t border-amber-200">
            <p className="text-amber-700 text-sm">
              You can only submit certification data for{" "}
              <strong>approved centers</strong>. Select a batch from the list or
              enter an other batch number if it is not listed. Submitted data is
              sent for admin review before ESSCI certificate processing.
            </p>
          </div>
        )}
      </div>

      {certSuccess && (
        <div className="mb-6 bg-primary-50 border border-primary-500 rounded-lg p-4 flex items-start gap-3">
          <CheckCircleIcon className="h-6 w-6 text-primary-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-primary-700">
              Upload Submitted!
            </h3>
            <p className="text-primary-600 text-sm mt-0.5">{certSuccess}</p>
          </div>
        </div>
      )}

      {certError && (
        <div className="mb-6 bg-destructive/10 border border-destructive rounded-lg p-4">
          <div className="flex items-start gap-3">
            <XCircleIcon className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-destructive">
                Submission Error
              </h3>
              <p className="text-destructive/90 text-sm mt-1">{certError}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 border border-[#A5A5A5] p-6 bg-white rounded-2xl">
        <div className="border-r border-[#A5A5A5] pr-6">
          <div className="space-y-5">
            {/* Center */}
            <div>
              <h2 className="font-semibold text-gray-800 mb-3">
                Center Details
              </h2>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Center <span className="text-red-500">*</span>
                </label>
                <select
                  value={certCenterId}
                  onChange={(e) => handleCertCenterChange(e.target.value)}
                  disabled={certCentersLoading}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:bg-gray-50"
                >
                  <option value="">
                    {certCentersLoading
                      ? "Loading centers…"
                      : certCenters.length === 0
                        ? "No approved centers found"
                        : "-- Select center --"}
                  </option>
                  {certCenters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.center_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Batch */}
            <div>
              <h2 className="font-semibold text-gray-800 mb-3">
                Batch Details <span className="text-red-500">*</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Batch Number
                  </label>
                  <select
                    value={certBatchId}
                    onChange={(e) => {
                      setCertBatchId(e.target.value);
                      if (e.target.value) setCertOtherBatchNumber("");
                    }}
                    disabled={!certCenterId || certBatchesLoading}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:bg-gray-50"
                  >
                    <option value="">
                      {certBatchesLoading
                        ? "Loading batches…"
                        : !certCenterId
                          ? "-- Select center first --"
                          : certBatches.length === 0
                            ? "No batches found"
                            : "-- Select batch --"}
                    </option>
                    {certBatches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.batch_number || b.name || b.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Other Batch Number
                  </label>
                  <input
                    type="text"
                    value={certOtherBatchNumber}
                    onChange={(e) => {
                      setCertOtherBatchNumber(e.target.value);
                      if (e.target.value.trim()) setCertBatchId("");
                    }}
                    disabled={!certCenterId}
                    placeholder="Enter if not in the list above"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:bg-gray-50"
                  />
                </div>
              </div>
            </div>

            {/* Dates */}
            <div>
              <h2 className="font-semibold text-gray-800 mb-3">
                Batch &amp; Assessment Dates
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Batch Start Date <span className="text-red-500">*</span>
                  </label>
                  <RefurbishmentDatePicker
                    value={certBatchStartDate}
                    onChange={handleStartDateChange}
                    placeholder="Pick start date"
                    maxDate={today}
                    className="max-w-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Batch End Date <span className="text-red-500">*</span>
                  </label>
                  <RefurbishmentDatePicker
                    value={certBatchEndDate}
                    onChange={handleEndDateChange}
                    placeholder="Pick end date"
                    className="max-w-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Assessment Date <span className="text-red-500">*</span>
                  </label>
                  <RefurbishmentDatePicker
                    value={certAssessmentDate}
                    onChange={setCertAssessmentDate}
                    placeholder="Pick assessment date"
                    maxDate={assessmentMaxDate}
                    className="max-w-none"
                  />
                </div>
              </div>
            </div>

            {/* Center Spoke */}
            <div>
              <h2 className="font-semibold text-gray-800 mb-3">
                Center Spoc Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={certSpokeName}
                    onChange={(e) => setCertSpokeName(e.target.value)}
                    placeholder="Spoc contact name"
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={certSpokeEmail}
                    onChange={(e) => setCertSpokeEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={certSpokeMobile}
                    onChange={(e) => setCertSpokeMobile(e.target.value)}
                    placeholder="10-digit Indian mobile"
                    inputMode="numeric"
                    maxLength={14}
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleCertUpload}
                disabled={certUploading || certResubmitLoading || !canSubmit}
                className={`px-12 py-4 rounded-full text-lg font-semibold transition-all w-full ${
                  certUploading || !canSubmit
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary-500 text-white hover:bg-primary-600 shadow-lg hover:shadow-xl"
                }`}
              >
                {certUploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Submitting…
                  </span>
                ) : isResubmit ? (
                  "Resubmit Certification Data"
                ) : (
                  "Submit Certification Data"
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="pl-6">
          <div className="bg-white rounded-lg h-full">
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-foreground">
                How to submit certification data
              </h3>
              <p className="mt-2 text-primary-600 text-sm font-medium">
                ✨ No file needed — fill the form and submit
              </p>
            </div>
            <div className="space-y-5">
              <div className="flex items-start gap-3 border border-[#E7E7E7] py-3 px-5 rounded-2xl">
                <span className="h-10 w-10 text-lg font-bold text-foreground bg-[#e6f4ea] p-2 rounded-full flex items-center justify-center flex-shrink-0">
                  1.
                </span>
                <div className="pt-1.5">
                  <p className="text-base font-semibold text-foreground">
                    Select Center
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose an approved center from the list.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 border border-[#E7E7E7] py-3 px-5 rounded-2xl">
                <span className="h-10 w-10 text-lg font-bold text-foreground bg-[#e6f4ea] p-2 rounded-full flex items-center justify-center flex-shrink-0">
                  2.
                </span>
                <div className="pt-1.5">
                  <p className="text-base font-semibold text-foreground">
                    Enter Batch &amp; Dates
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select a batch number from the list or type an other batch
                    number. Add batch and assessment dates and spoc contact
                    details.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 border border-[#E7E7E7] py-3 px-5 rounded-2xl">
                <span className="h-10 w-10 text-lg font-bold text-foreground bg-[#e6f4ea] p-2 rounded-full flex items-center justify-center flex-shrink-0">
                  3.
                </span>
                <div className="pt-1.5">
                  <p className="text-base font-semibold text-foreground">
                    Submit for Admin Review
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your submission is reviewed by admin before ESSCI certificate
                    processing.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 border border-[#E7E7E7] py-3 px-5 rounded-2xl">
                <span className="h-10 w-10 text-lg font-bold text-foreground bg-[#e6f4ea] p-2 rounded-full flex items-center justify-center flex-shrink-0">
                  4.
                </span>
                <div className="pt-1.5">
                  <p className="text-base font-semibold text-foreground">
                    Need ESSCI Spoc help?
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    If you have queries, open{" "}
                    <Link
                      to={`${ROUTES.HELP}?tab=support&focus=essci-spoc`}
                      className="text-[#009530] font-medium underline underline-offset-2 hover:text-[#007a28]"
                    >
                      Support &amp; Contacts
                    </Link>{" "}
                    for ESSCI Spoc details.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificationDataTab;
