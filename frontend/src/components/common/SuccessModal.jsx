import React from "react";
import { CheckIcon } from "@heroicons/react/24/solid";
import { useNavigate } from "react-router-dom";

/**
 * Success/Approval Modal Component
 * Displays success message with nonagon icon, title, description, and details
 *
 * @param {boolean} isOpen - Controls modal visibility
 * @param {function} onClose - Callback when modal should close
 * @param {string} title - Modal title (e.g., "Batch Details Approved")
 * @param {string} description - Description text below title
 * @param {string} partnerName - Partner name to display
 * @param {string} centerName - Center name to display
 * @param {string} returnRoute - Route to navigate on button click (optional)
 * @param {string} buttonText - Custom button text (default: "Return to Dashboard")
 * @param {function} onConfirm - Callback for confirmation action (if provided, modal acts as confirmation)
 * @param {boolean} isLoading - Loading state for confirmation button
 * @param {boolean} showCancel - Show cancel button for confirmation mode
 */
const SuccessModal = ({
  isOpen,
  onClose,
  title = "Success",
  description = "",
  partnerName = "",
  centerName = "",
  returnRoute = null,
  buttonText = "Return to Dashboard",
  onConfirm = null,
  isLoading = false,
  showCancel = false,
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleReturn = () => {
    if (onConfirm) {
      onConfirm();
    } else if (returnRoute) {
      navigate(returnRoute);
    } else {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="success-modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Overlay */}
      <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity"></div>

      {/* Modal Container */}
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div className="relative transform overflow-hidden rounded-2xl bg-white text-center shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md p-8">
          {/* Nonagon Icon with Check Mark */}
          <div className="flex justify-center mb-6">
            <div
              className="relative w-24 h-24 bg-green-500 flex items-center justify-center"
              style={{
                clipPath:
                  "polygon(50% 0%, 83% 12%, 100% 43%, 94% 78%, 68% 100%, 32% 100%, 6% 78%, 0% 43%, 17% 12%)",
              }}
            >
              <CheckIcon className="h-12 w-12 text-white" />
            </div>
          </div>

          {/* Title */}
          <h2
            id="success-modal-title"
            className="text-2xl font-bold text-gray-900 mb-3"
          >
            {title}
          </h2>

          {/* Description */}
          {description && (
            <p className="text-gray-600 mb-6 text-sm">{description}</p>
          )}

          {/* Partner and Center Details */}
          {(partnerName || centerName) && (
            <div className="bg-gray-100 rounded-lg p-4 mb-6 space-y-2">
              {partnerName && (
                <div className="text-sm">
                  <span className="font-semibold text-gray-700">Partner: </span>
                  <span className="text-gray-900">{partnerName}</span>
                </div>
              )}
              {centerName && (
                <div className="text-sm">
                  <span className="font-semibold text-gray-700">Center: </span>
                  <span className="text-gray-900">{centerName}</span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {onConfirm && showCancel ? (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-full font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleReturn}
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-green-500 text-white rounded-full font-semibold hover:bg-green-600 transition-colors shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
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
                    Processing...
                  </span>
                ) : (
                  buttonText
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={handleReturn}
              disabled={isLoading}
              className="w-full px-6 py-3 bg-green-500 text-white rounded-full font-semibold hover:bg-green-600 transition-colors shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
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
                  Processing...
                </span>
              ) : (
                buttonText
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;
