import React, { useState, useEffect } from "react";
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/outline";

/**
 * Strict Confirmation Modal for Deleting Centers (Master Data)
 * Requires typing "DELETE" to confirm deletion
 * Shows impact report with blocking reasons
 */
const ConfirmDeleteCenterModal = ({
  isOpen,
  onClose,
  onConfirm,
  centerName,
  impact,
  isLoading = false,
}) => {
  const [confirmText, setConfirmText] = useState("");
  const [isConfirmValid, setIsConfirmValid] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setConfirmText("");
      setIsConfirmValid(false);
    }
  }, [isOpen]);

  useEffect(() => {
    setIsConfirmValid(confirmText === "DELETE");
  }, [confirmText]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (isConfirmValid && !isLoading) {
      onConfirm();
    }
  };

  const canDelete = impact?.canDelete ?? true;
  const hasWarnings = impact?.warnings && impact.warnings.length > 0;
  const hasBlockingReasons =
    impact?.blockingReasons && impact.blockingReasons.length > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={!isLoading ? onClose : undefined}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-full ${
                  canDelete ? "bg-red-100" : "bg-yellow-100"
                }`}
              >
                {canDelete ? (
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                ) : (
                  <ShieldExclamationIcon className="h-6 w-6 text-yellow-600" />
                )}
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                {canDelete ? "Confirm Center Deletion" : "Cannot Delete Center"}
              </h3>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-4 space-y-4">
            {/* Center Name */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">Center to be deleted:</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {centerName}
              </p>
            </div>

            {/* Blocking Reasons (if cannot delete) */}
            {hasBlockingReasons && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <ShieldExclamationIcon className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-red-900 mb-2">
                      Cannot Delete - Blocking Issues Found
                    </h4>
                    <ul className="space-y-1">
                      {impact.blockingReasons.map((reason, index) => (
                        <li
                          key={index}
                          className="text-sm text-red-800 flex items-start gap-2"
                        >
                          <span className="text-red-600 mt-0.5">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 pt-3 border-t border-red-200">
                      <p className="text-sm font-medium text-red-900">
                        Required Actions:
                      </p>
                      <ul className="mt-1 space-y-1 text-sm text-red-800">
                        {impact.counts?.batches > 0 && (
                          <li>
                            1. Delete all {impact.counts.batches} batch
                            {impact.counts.batches > 1 ? "es" : ""} from this
                            center
                          </li>
                        )}
                        {impact.counts?.students > 0 && (
                          <li>
                            2. Delete all {impact.counts.students} student
                            {impact.counts.students > 1 ? "s" : ""} from this
                            center
                          </li>
                        )}
                        {impact.counts?.uploadedBatches > 0 && (
                          <li>
                            3. Review or reject {impact.counts.uploadedBatches}{" "}
                            pending batch upload
                            {impact.counts.uploadedBatches > 1 ? "s" : ""}
                          </li>
                        )}
                        {impact.counts?.uploadedStudents > 0 && (
                          <li>
                            4. Review or reject {impact.counts.uploadedStudents}{" "}
                            pending student upload
                            {impact.counts.uploadedStudents > 1 ? "s" : ""}
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Warnings (things that will be deleted) */}
            {canDelete && hasWarnings && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-yellow-900 mb-2">
                      This action will also remove:
                    </h4>
                    <ul className="space-y-1">
                      {impact.warnings.map((warning, index) => (
                        <li
                          key={index}
                          className="text-sm text-yellow-800 flex items-start gap-2"
                        >
                          <span className="text-yellow-600 mt-0.5">•</span>
                          <span>{warning}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Safe to delete message */}
            {canDelete && !hasWarnings && !hasBlockingReasons && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="h-5 w-5 text-green-600 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm text-green-800">
                      This center has no associated data. It is safe to delete.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Confirmation Section (only if can delete) */}
            {canDelete && (
              <>
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-bold text-red-900 mb-2 text-lg">
                        ⚠️ This action cannot be undone!
                      </h4>
                      <p className="text-sm text-red-800 mb-4">
                        You are about to permanently delete this center from the
                        master database. All associated data will be removed
                        forever.
                      </p>
                      <div className="space-y-2">
                        <label className="block">
                          <span className="text-sm font-semibold text-red-900">
                            Type{" "}
                            <span className="bg-red-200 px-2 py-0.5 rounded font-mono">
                              DELETE
                            </span>{" "}
                            to confirm:
                          </span>
                          <input
                            type="text"
                            value={confirmText}
                            onChange={(e) =>
                              setConfirmText(e.target.value.toUpperCase())
                            }
                            placeholder="Type DELETE here"
                            disabled={isLoading}
                            className="mt-2 w-full px-4 py-2 border-2 border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed font-mono text-lg"
                            autoComplete="off"
                          />
                        </label>
                        {confirmText && !isConfirmValid && (
                          <p className="text-sm text-red-600">
                            Please type exactly "DELETE" (without quotes)
                          </p>
                        )}
                        {isConfirmValid && (
                          <p className="text-sm text-green-600 font-medium">
                            ✓ Confirmation text is correct
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {canDelete ? "Cancel" : "Close"}
            </button>

            {canDelete && (
              <button
                onClick={handleConfirm}
                disabled={!isConfirmValid || isLoading}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center gap-2"
              >
                {isLoading ? (
                  <>
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
                    Deleting...
                  </>
                ) : (
                  <>
                    <ExclamationTriangleIcon className="h-5 w-5" />
                    Permanently Delete Center
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteCenterModal;
