import React from "react";
import { Card } from "../../components/ui/card";
import { XMarkIcon } from "@heroicons/react/24/outline";

/**
 * RefurbishmentStatusCard
 *
 * Shown in the partner inbox when they click on a refurbishment status
 * notification: approved, rejected, completed, or request-submitted.
 *
 * Uses data already present in the notification object — no API call required.
 *
 * @param {Object} notification - The notification object from the inbox
 * @param {Function} onDismiss  - Callback when the dismiss / close button is clicked
 */
const RefurbishmentStatusCard = ({ notification, onDismiss }) => {
  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : "—";

  // Derive display config from alert_type
  const getConfig = (alertType) => {
    switch (alertType) {
      case "refurbishment_approved":
        return {
          label: "Approved",
          badgeCls: "bg-blue-100 text-blue-700 border border-blue-200",
          iconCls: "text-blue-500",
          icon: (
            <svg
              className="h-10 w-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ),
        };
      case "refurbishment_rejected":
        return {
          label: "Rejected",
          badgeCls: "bg-red-100 text-red-700 border border-red-200",
          iconCls: "text-red-400",
          icon: (
            <svg
              className="h-10 w-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ),
        };
      case "refurbishment_completed":
        return {
          label: "Completed",
          badgeCls: "bg-green-100 text-green-700 border border-green-200",
          iconCls: "text-green-500",
          icon: (
            <svg
              className="h-10 w-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          ),
        };
      case "refurbishment_request":
        return {
          label: "Submitted",
          badgeCls: "bg-yellow-100 text-yellow-700 border border-yellow-200",
          iconCls: "text-yellow-500",
          icon: (
            <svg
              className="h-10 w-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          ),
        };
      default:
        return {
          label: "Notification",
          badgeCls: "bg-gray-100 text-gray-600 border border-gray-200",
          iconCls: "text-gray-400",
          icon: (
            <svg
              className="h-10 w-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          ),
        };
    }
  };

  const { label, badgeCls, iconCls, icon } = getConfig(notification.alert_type);

  return (
    <Card className="h-full flex flex-col bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <span className={`flex-shrink-0 ${iconCls}`}>{icon}</span>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-bold text-gray-900 leading-snug">
                {notification.title || "Refurbishment Update"}
              </h2>
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${badgeCls}`}
              >
                {label}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              {fmtDate(notification.created_at)}
            </p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 mt-0.5"
          aria-label="Close"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 px-6 py-5 space-y-4 overflow-y-auto">
        {/* Message */}
        <div>
          <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1.5">
            Details
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
            <p className="text-sm text-gray-700 leading-relaxed">
              {notification.message || "No additional details available."}
            </p>
          </div>
        </div>

        {/* Remark (if any) */}
        {notification.remark && (
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1.5">
              Remark
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
              <p className="text-sm text-gray-700 leading-relaxed italic">
                {notification.remark}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
        <button
          onClick={onDismiss}
          className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </Card>
  );
};

export default RefurbishmentStatusCard;
