import React from "react";
import { DocumentTextIcon, ClockIcon } from "@heroicons/react/24/outline";

/**
 * Notification Card Component
 * Individual upload notification in the list
 */
const NotificationCard = ({ upload, isSelected, onClick, onReviewClick }) => {
  /**
   * Format date
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} ${diffMins === 1 ? "minute" : "minutes"} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
    } else {
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
  };

  return (
    <div
      onClick={onClick}
      className={`
        p-4 cursor-pointer transition-colors
        ${
          isSelected
            ? "bg-primary-50 border-l-4 border-l-primary-500"
            : "hover:bg-background-secondary border-l-4 border-l-transparent"
        }
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`
          flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
          ${
            upload.status === "pending"
              ? "bg-secondary-100"
              : upload.status === "approved"
              ? "bg-primary-100"
              : "bg-destructive/10"
          }
        `}
        >
          <DocumentTextIcon
            className={`h-5 w-5 ${
              upload.status === "pending"
                ? "text-secondary-600"
                : upload.status === "approved"
                ? "text-primary-600"
                : "text-destructive"
            }`}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate">
                New Data Upload
              </h3>
              {upload.status === "pending" && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-secondary-500 text-white rounded mt-1">
                  New
                </span>
              )}
            </div>
            <span
              className={`
              flex-shrink-0 inline-flex px-2 py-0.5 text-xs font-medium rounded-full
              ${
                upload.status === "pending"
                  ? "bg-secondary-100 text-secondary-700"
                  : upload.status === "approved"
                  ? "bg-primary-100 text-primary-700"
                  : "bg-destructive/10 text-destructive"
              }
            `}
            >
              {upload.status.charAt(0).toUpperCase() + upload.status.slice(1)}
            </span>
          </div>

          <p className="text-sm text-foreground mt-2">
            <span className="font-medium">{upload.partner_name}</span> uploaded
            data file
          </p>

          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <ClockIcon className="h-3.5 w-3.5" />
              {formatDate(upload.created_at)}
            </span>
            <span>{upload.total_records} records</span>
            <span>v{upload.version}</span>
          </div>

          {upload.status === "pending" && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReviewClick();
                }}
                className="px-3 py-1.5 bg-primary-500 text-white text-xs font-medium rounded hover:bg-primary-600 transition-colors"
              >
                Review
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationCard;
