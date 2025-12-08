import React, { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/solid";

/**
 * Rejection/Failure Modal Component
 * Displays rejection form with nonagon X icon, title, description, and input fields
 *
 * @param {boolean} isOpen - Controls modal visibility
 * @param {function} onClose - Callback when modal should close
 * @param {string} title - Modal title (e.g., "Batch Details Rejected")
 * @param {string} description - Description text below title
 * @param {function} onSubmit - Callback when form is submitted: ({ reason, remarks }) => void
 * @param {boolean} isLoading - Loading state for submit button
 * @param {string} reasonLabel - Custom label for reason field (default: "Reason for Rejection")
 * @param {string} remarksLabel - Custom label for remarks field (default: "Remarks")
 * @param {string} reasonPlaceholder - Placeholder for reason input
 * @param {string} remarksPlaceholder - Placeholder for remarks input
 * @param {number} minReasonLength - Minimum character length for reason (default: 10)
 */
const RejectionModal = ({
  isOpen,
  onClose,
  title = "Rejected",
  description = "",
  onSubmit,
  isLoading = false,
  reasonLabel = "Reason for Rejection",
  remarksLabel = "Remarks",
  reasonPlaceholder = "Enter reason for rejection (minimum 10 characters)",
  remarksPlaceholder = "Enter additional remarks or comments",
  minReasonLength = 10,
}) => {
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors = {};

    if (!reason.trim()) {
      newErrors.reason = "Reason is required";
    } else if (reason.trim().length < minReasonLength) {
      newErrors.reason = `Reason must be at least ${minReasonLength} characters`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit({ reason: reason.trim(), remarks: remarks.trim() });
      // Reset form after submission
      setReason("");
      setRemarks("");
      setErrors({});
    }
  };

  const handleClose = () => {
    setReason("");
    setRemarks("");
    setErrors({});
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="rejection-modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Overlay */}
      <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity"></div>

      {/* Modal Container */}
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div className="relative transform overflow-hidden rounded-2xl bg-white text-center shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md p-8">
          {/* Nonagon Icon with X Mark */}
          <div className="flex justify-center mb-6">
            <div
              className="relative w-24 h-24 bg-red-500 flex items-center justify-center"
              style={{
                clipPath:
                  "polygon(50% 0%, 83% 12%, 100% 43%, 94% 78%, 68% 100%, 32% 100%, 6% 78%, 0% 43%, 17% 12%)",
              }}
            >
              <XMarkIcon className="h-12 w-12 text-white" />
            </div>
          </div>

          {/* Title */}
          <h2
            id="rejection-modal-title"
            className="text-2xl font-bold text-gray-900 mb-3"
          >
            {title}
          </h2>

          {/* Description */}
          {description && (
            <p className="text-gray-600 mb-6 text-sm">{description}</p>
          )}

          {/* Form */}
          <div className="space-y-4 mb-6 text-left">
            {/* Reason Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {reasonLabel} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (errors.reason) {
                    setErrors((prev) => ({ ...prev, reason: "" }));
                  }
                }}
                className={`w-full px-4 py-2 border ${
                  errors.reason ? "border-red-500" : "border-gray-300"
                } rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent`}
                placeholder={reasonPlaceholder}
                disabled={isLoading}
              />
              {errors.reason && (
                <p className="text-red-500 text-xs mt-1">{errors.reason}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {reason.length}/{minReasonLength} characters minimum
              </p>
            </div>

            {/* Remarks Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {remarksLabel}
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                placeholder={remarksPlaceholder}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-full font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                isLoading ||
                !reason.trim() ||
                reason.trim().length < minReasonLength
              }
              className="flex-1 px-6 py-3 bg-red-500 text-white rounded-full font-semibold hover:bg-red-600 transition-colors shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Submitting...
                </span>
              ) : (
                "Submit"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RejectionModal;
