import React, { useEffect, useState } from "react";
import { XMarkIcon, ClockIcon, BellIcon } from "@heroicons/react/24/outline";
import apiClient from "../../../api/client";

const FREQUENCY_LABELS = {
  instant: "Instant",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  custom: "Custom",
};

const STATUS_COLORS = {
  active: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
};

const formatDateTime = (isoString) => {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const NotificationHistoryModal = ({ center, onClose }) => {
  const [history, setHistory] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!center?.center_id && !center?.id) return;
    const centerId = center.center_id || center.id;

    const fetchHistory = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get(
          `/admin/refurbishment/centers/${centerId}/notification-history`,
        );
        const data = res.data.data;
        setHistory(data.history || []);
        setTotal(data.total || 0);
      } catch {
        setError("Failed to load notification history.");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [center]);

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BellIcon className="h-5 w-5 text-green-600" />
              <h2 className="text-base font-bold text-gray-900">
                Notification History
              </h2>
            </div>
            <p className="text-sm text-gray-500">
              {center?.center_name || "Center"}
              {total > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                  {total} notification{total !== 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="text-center py-10 text-gray-400 text-sm">
              Loading history…
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-10 text-red-500 text-sm">
              {error}
            </div>
          )}

          {!loading && !error && history.length === 0 && (
            <div className="text-center py-10">
              <ClockIcon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">
                No notifications sent yet for this center.
              </p>
            </div>
          )}

          {!loading && !error && history.length > 0 && (
            <div className="space-y-3">
              {history.map((item, idx) => (
                <div
                  key={item.id}
                  className="border border-gray-200 rounded-xl p-4 bg-gray-50/40 hover:bg-gray-50 transition-colors"
                >
                  {/* Row 1: date + frequency + status */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        #{idx + 1}
                      </span>
                      {item.request_number && (
                        <span className="text-xs font-mono text-gray-400">
                          {item.request_number}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {item.frequency && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                          {FREQUENCY_LABELS[item.frequency] || item.frequency}
                        </span>
                      )}
                      {item.status && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[item.status] || "bg-gray-100 text-gray-600"}`}
                        >
                          {item.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Message */}
                  {item.message && (
                    <p className="text-sm text-gray-700 mb-3 line-clamp-3 bg-white rounded-lg border border-gray-100 px-3 py-2">
                      {item.message}
                    </p>
                  )}

                  {/* Row 3: Metadata grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        Sent On
                      </p>
                      <p className="text-xs text-gray-700 font-medium">
                        {formatDateTime(item.last_sent_at || item.created_at)}
                      </p>
                    </div>
                    {item.send_count > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                          Times Sent
                        </p>
                        <p className="text-xs text-gray-700 font-medium">
                          {item.send_count}
                        </p>
                      </div>
                    )}
                    {item.created_by_name && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                          Sent By
                        </p>
                        <p className="text-xs text-gray-700 font-medium">
                          {item.created_by_name}
                        </p>
                      </div>
                    )}
                    {item.partner_responded && item.response_received_at && (
                      <div className="col-span-2 sm:col-span-3">
                        <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wider">
                          Partner Responded
                        </p>
                        <p className="text-xs text-green-700 font-medium">
                          {formatDateTime(item.response_received_at)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationHistoryModal;
