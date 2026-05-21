import React from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ROUTES } from "../../constants/routes";

/**
 * NotificationDetailCard Component
 * Displays detailed information about a selected notification
 * Includes partner info, data type, submission datetime, and CSV preview
 *
 * @param {Object} notification - The selected notification object
 * @param {Array} csvData - Parsed CSV data as 2D array
 * @param {Function} onReview - Callback when "Review data" button is clicked
 * @param {Function} onDismiss - Callback when "Dismiss" is clicked
 */
const NotificationDetailCard = ({
  notification,
  csvData,
  centerDetails,
  employmentAttachments = [],
  onReview,
  onDismiss,
}) => {
  const navigate = useNavigate();

  // Parse payload if it's a string
  let payload = notification.payload;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch (e) {
      console.error("Failed to parse payload:", e);
      payload = {};
    }
  }

  // Extract partner name from notification payload or message
  const partnerName =
    payload?.partner_name || payload?.partnerName || "Partner";

  // Extract data type from notification payload
  // const dataType = payload?.data_type || payload?.recurrence_type || "N/A";

  // Format submission date and time combined
  const submissionDateTime = new Date(notification.created_at).toLocaleString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  );

  // Status badge styling - use aggregated_status from notification
  const getStatusBadgeClass = () => {
    const status =
      notification.aggregated_status || notification.alert_type || "pending";
    switch (status.toLowerCase()) {
      case "approved":
        return "bg-green-100 text-green-700 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-700 border-red-200";
      case "partial_approved":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "pending":
      default:
        return "text-[#E47F00] border-[#E47F00]";
    }
  };

  const getStatusBadgeStyle = () => {
    const status =
      notification.aggregated_status || notification.alert_type || "pending";
    if (status.toLowerCase() === "pending") {
      return { backgroundColor: "rgba(228, 127, 0, 0.1)" };
    }
    return {};
  };

  // Get display text for status badge
  const getStatusText = () => {
    const status =
      notification.aggregated_status || notification.alert_type || "pending";
    switch (status.toLowerCase()) {
      case "approved":
        return "APPROVED";
      case "rejected":
        return "REJECTED";
      case "partial_approved":
        return "PARTIALLY APPROVED";
      case "pending":
      default:
        return "PENDING";
    }
  };

  const user = useSelector((state) => state.auth.user);

  const handleReviewClick = () => {
    if (notification.related_entity_id) {
      // Employment upload notification — route by role
      if (
        notification.related_entity_type === "employment_upload" ||
        notification.type === "employment_upload"
      ) {
        if (user?.role === "PARTNER") {
          // Partner sees their rejected employment uploads
          navigate(ROUTES.PARTNER_REJECTED_EMPLOYMENT_UPLOADS);
        } else {
          // Admin/SuperAdmin goes to review page
          navigate(ROUTES.EMPLOYMENT_REVIEW);
        }
        // Check related entity type
      } else if (notification.related_entity_type === "center") {
        // Navigate to pending centers review page
        navigate(ROUTES.REVIEW_PENDING_CENTERS);
      } else if (user?.role === "PARTNER") {
        // Partners navigate directly to centers page (same flow as admin)
        navigate(
          ROUTES.PARTNER_REJECTED_CENTERS.replace(
            ":uploadId",
            notification.related_entity_id,
          ),
        );
      } else if (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") {
        // Admins navigate to review page
        navigate(
          ROUTES.REVIEW_UPLOAD.replace(
            ":uploadId",
            notification.related_entity_id,
          ),
        );
      }
    } else if (onReview) {
      onReview();
    }
  };

  const isEmploymentNotification =
    notification.related_entity_type === "employment_upload" ||
    notification.notification_type === "employment" ||
    notification.type === "employment_upload";

  return (
    <Card className="h-full flex flex-col bg-white border border-gray-200 shadow-sm rounded-[16px]">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900">
            {notification.related_entity_type === "center"
              ? `New Center Created: ${
                  payload?.centerName || "Review Required"
                }`
              : `New Data uploaded: ${partnerName}`}
          </h2>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={`${getStatusBadgeClass()} text-xs px-3 py-1 rounded-[40px]`}
              style={getStatusBadgeStyle()}
            >
              {getStatusText()}
            </Badge>
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-600">
          {notification.message ||
            "Review the uploaded data and take appropriate action"}
        </p>
      </div>

      {/* Content - Two columns */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column - Form inputs (read-only) */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Partner Name
              </label>
              <Input
                value={partnerName}
                readOnly
                className="bg-gray-50 cursor-not-allowed rounded-[16px]"
              />
            </div>

            {/* <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Type
              </label>
              <Input
                value={dataType}
                readOnly
                className="bg-gray-50 cursor-not-allowed rounded-[16px]"
              />
            </div> */}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Submission Date & Time
              </label>
              <Input
                value={submissionDateTime}
                readOnly
                className="bg-gray-50 cursor-not-allowed rounded-[16px]"
              />
            </div>
          </div>

          {/* Right Column - Center List, Employment Info, or CSV Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isEmploymentNotification
                ? "Employment Upload Details"
                : centerDetails
                  ? "Centers Summary"
                  : "CSV Preview"}
            </label>
            <div className="border border-gray-200 rounded-[16px] overflow-auto max-h-[400px] bg-white">
              {isEmploymentNotification ? (
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-purple-700 font-semibold">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-purple-400" />
                    Employment Data Upload
                  </div>
                  <p className="text-sm text-gray-600">
                    {notification.message ||
                      "An employment data file has been uploaded and is awaiting review."}
                  </p>
                  {payload?.totalRecords != null && (
                    <p className="text-sm text-gray-500">
                      <span className="font-medium text-gray-700">
                        Records:
                      </span>{" "}
                      {payload.totalRecords}
                    </p>
                  )}
                  {notification.remark && (
                    <p className="text-sm text-gray-500">
                      <span className="font-medium text-gray-700">Remark:</span>{" "}
                      {notification.remark}
                    </p>
                  )}
                  {/* Supporting documents */}
                  {employmentAttachments.length > 0 && (
                    <div className="pt-2 border-t border-purple-100">
                      <p className="text-xs font-semibold text-purple-700 mb-2">
                        Supporting Documents ({employmentAttachments.length})
                      </p>
                      <ul className="space-y-1">
                        {employmentAttachments.map((att, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <span className="text-purple-400 text-xs">📎</span>
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline truncate"
                              title={att.name}
                            >
                              {att.name}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {employmentAttachments.length === 0 && (
                    <p className="text-xs text-gray-400 pt-1">
                      No supporting documents attached.
                    </p>
                  )}
                </div>
              ) : centerDetails && centerDetails.centers ? (
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-700 border-b border-gray-200">
                        Center Name
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700 border-b border-gray-200">
                        City
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700 border-b border-gray-200">
                        State
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700 border-b border-gray-200">
                        Status
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-gray-700 border-b border-gray-200">
                        Students
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {centerDetails.centers.map((center, idx) => (
                      <tr
                        key={center.id || idx}
                        className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td
                          className={`px-3 py-2 border-b border-gray-100 ${
                            center.review_status === "rejected"
                              ? "font-semibold text-red-700"
                              : "text-gray-600"
                          }`}
                        >
                          {center.center_name}
                        </td>
                        <td className="px-3 py-2 text-gray-600 border-b border-gray-100">
                          {center.city}
                        </td>
                        <td className="px-3 py-2 text-gray-600 border-b border-gray-100">
                          {center.state}
                        </td>
                        <td className="px-3 py-2 border-b border-gray-100">
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-2 py-0 h-5 rounded-full ${
                              center.review_status === "approved"
                                ? "bg-green-100 text-green-700 border-green-200"
                                : center.review_status === "rejected"
                                  ? "bg-red-100 text-red-700 border-red-200"
                                  : "text-[#E47F00] border-[#E47F00]"
                            }`}
                            style={
                              center.review_status === "pending"
                                ? { backgroundColor: "rgba(228, 127, 0, 0.1)" }
                                : {}
                            }
                          >
                            {(center.review_status || "pending").toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-gray-600 border-b border-gray-100 text-right">
                          {center.student_count || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : csvData && csvData.length > 0 ? (
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      {csvData[0].map((header, idx) => (
                        <th
                          key={idx}
                          className="px-3 py-2 text-left font-medium text-gray-700 border-b border-gray-200"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.slice(1, 11).map((row, rowIdx) => (
                      <tr
                        key={rowIdx}
                        className={rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        {row.map((cell, cellIdx) => (
                          <td
                            key={cellIdx}
                            className="px-3 py-2 text-gray-600 border-b border-gray-100"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No CSV data available
                </div>
              )}
              {centerDetails &&
                centerDetails.centers &&
                centerDetails.centers.length > 10 && (
                  <div className="p-2 text-center text-xs text-gray-500 bg-gray-50 border-t border-gray-200">
                    Showing first 10 of {centerDetails.centers.length} centers
                  </div>
                )}
              {!centerDetails && csvData && csvData.length > 11 && (
                <div className="p-2 text-center text-xs text-gray-500 bg-gray-50 border-t border-gray-200">
                  Showing 10 of {csvData.length - 1} rows
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Action buttons */}
      <div className="p-4 flex items-center justify-end gap-6">
        <Button
          onClick={handleReviewClick}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-[40px]"
        >
          Review data
        </Button>

        <button
          onClick={onDismiss}
          className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </Card>
  );
};

export default NotificationDetailCard;
