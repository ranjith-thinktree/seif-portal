import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowPathIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { getAllUploadsForAdmin } from "../../services/upload.service";
import { MainLayout } from "../../components/layout";
import NotificationCard from "./NotificationCard";

/**
 * Admin Inbox Page
 * Shows pending uploads requiring admin review
 */
const InboxPage = () => {
  const navigate = useNavigate();
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUpload, setSelectedUpload] = useState(null);
  const [filterStatus, setFilterStatus] = useState("pending");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  /**
   * Fetch uploads
   */
  const fetchUploads = useCallback(
    async (page = 1, status = filterStatus) => {
      setLoading(true);
      setError(null);

      try {
        const result = await getAllUploadsForAdmin(
          status,
          page,
          pagination.limit
        );
        setUploads(result.data);
        setPagination(result.pagination);

        // Auto-select first upload
        if (result.data.length > 0 && !selectedUpload) {
          setSelectedUpload(result.data[0]);
        }
      } catch (err) {
        console.error("Failed to fetch uploads:", err);
        setError("Failed to load notifications. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [filterStatus, pagination.limit, selectedUpload]
  );

  useEffect(() => {
    fetchUploads();
  }, [fetchUploads]);

  /**
   * Handle review click
   */
  const handleReviewClick = (upload) => {
    navigate(`/review/${upload.id}`);
  };

  /**
   * Get pending count
   */
  const pendingCount = uploads.filter((u) => u.status === "pending").length;

  return (
    <MainLayout>
      <div className="h-[calc(100vh-8rem)]">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="bg-white border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                  Inbox
                  {pendingCount > 0 && (
                    <span className="inline-flex items-center justify-center px-3 py-1 text-xs font-bold text-white bg-secondary-500 rounded-full">
                      {pendingCount} New
                    </span>
                  )}
                </h1>
                <p className="text-muted-foreground mt-1">
                  Review pending data uploads
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilterStatus("pending")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === "pending"
                      ? "bg-primary-500 text-white"
                      : "bg-white border border-border text-foreground hover:bg-background-secondary"
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setFilterStatus("approved")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === "approved"
                      ? "bg-primary-500 text-white"
                      : "bg-white border border-border text-foreground hover:bg-background-secondary"
                  }`}
                >
                  Approved
                </button>
                <button
                  onClick={() => setFilterStatus("rejected")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === "rejected"
                      ? "bg-primary-500 text-white"
                      : "bg-white border border-border text-foreground hover:bg-background-secondary"
                  }`}
                >
                  Rejected
                </button>
                <button
                  onClick={() => setFilterStatus(null)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === null
                      ? "bg-primary-500 text-white"
                      : "bg-white border border-border text-foreground hover:bg-background-secondary"
                  }`}
                >
                  All
                </button>
              </div>
            </div>
          </div>

          {/* Content Area - Two Panel Layout */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Panel - Notification List */}
            <div className="w-full lg:w-2/5 border-r border-border bg-white overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <ArrowPathIcon className="h-8 w-8 text-primary-500 animate-spin" />
                </div>
              ) : error ? (
                <div className="text-center py-12 px-4">
                  <p className="text-destructive">{error}</p>
                  <button
                    onClick={() => fetchUploads()}
                    className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                  >
                    Retry
                  </button>
                </div>
              ) : uploads.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <p className="text-muted-foreground">
                    {filterStatus === "pending"
                      ? "No pending uploads"
                      : `No ${filterStatus} uploads`}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {uploads.map((upload) => (
                    <NotificationCard
                      key={upload.id}
                      upload={upload}
                      isSelected={selectedUpload?.id === upload.id}
                      onClick={() => setSelectedUpload(upload)}
                      onReviewClick={() => handleReviewClick(upload)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right Panel - Notification Details */}
            <div className="hidden lg:block flex-1 overflow-y-auto p-6">
              {selectedUpload ? (
                <div>
                  <div className="bg-white rounded-lg shadow-card p-6">
                    <h2 className="text-xl font-bold text-foreground mb-4">
                      Upload Details
                    </h2>

                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Partner
                        </label>
                        <p className="text-foreground font-medium mt-1">
                          {selectedUpload.partner_name}
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          File Name
                        </label>
                        <p className="text-foreground mt-1">
                          {selectedUpload.file_name}
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Total Records
                        </label>
                        <p className="text-foreground font-medium mt-1">
                          {selectedUpload.total_records} students
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Version
                        </label>
                        <p className="text-foreground mt-1">
                          v{selectedUpload.version}
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Status
                        </label>
                        <div className="mt-1">
                          <span
                            className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                              selectedUpload.status === "pending"
                                ? "bg-secondary-100 text-secondary-700"
                                : selectedUpload.status === "approved"
                                ? "bg-primary-100 text-primary-700"
                                : "bg-destructive/10 text-destructive"
                            }`}
                          >
                            {selectedUpload.status.charAt(0).toUpperCase() +
                              selectedUpload.status.slice(1)}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Submitted
                        </label>
                        <p className="text-foreground mt-1">
                          {new Date(selectedUpload.created_at).toLocaleString(
                            "en-GB",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          by {selectedUpload.uploaded_by_name}
                        </p>
                      </div>
                    </div>

                    {selectedUpload.status === "pending" && (
                      <div className="mt-6 pt-6 border-t border-border">
                        <button
                          onClick={() => handleReviewClick(selectedUpload)}
                          className="w-full px-4 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 font-medium transition-colors"
                        >
                          Review Data
                        </button>
                      </div>
                    )}

                    {selectedUpload.status === "rejected" &&
                      selectedUpload.rejection_reason && (
                        <div className="mt-6 pt-6 border-t border-border">
                          <label className="text-sm font-medium text-muted-foreground">
                            Rejection Reason
                          </label>
                          <p className="text-destructive mt-1">
                            {selectedUpload.rejection_reason}
                          </p>
                        </div>
                      )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground">
                    Select a notification to view details
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default InboxPage;
