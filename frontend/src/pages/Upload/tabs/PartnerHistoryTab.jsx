import React from "react";
import {
  ArrowPathIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  BriefcaseIcon,
  DocumentArrowDownIcon,
} from "@heroicons/react/24/outline";

/**
 * Parse attachment URLs from an employment file_url field.
 * The file_url may be a JSON array of attachment objects or a plain URL string.
 */
function getEmploymentAttachmentsFromFileUrl(fileUrl) {
  if (!fileUrl) return [];
  try {
    const parsed = JSON.parse(fileUrl);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

const PartnerHistoryTab = ({
  uploads,
  loading,
  historyError,
  pagination,
  setPagination,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  showFilters,
  setShowFilters,
  uploadToDelete,
  deleteLoading,
  deleteError,
  handleDownloadUpload,
  handleDeleteClick,
  handleDeleteConfirm,
  handleDeleteCancel,
  handleDownloadEmploymentFile,
  handleViewEmploymentErrors,
  handleViewEmploymentAttachments,
  handleTabChange,
  fetchUploads,
}) => {
  return (
    /* Upload History Tab */
    <div className="space-y-6">
      {/* Search, Filter, Sort Bar */}
      <div className="bg-white p-4 rounded-lg shadow-card">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by file name, uploader, or reviewer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
              showFilters || statusFilter
                ? "bg-primary-50 border-primary-500 text-primary-700"
                : "border-border hover:bg-background-secondary"
            }`}
          >
            <FunnelIcon className="h-5 w-5" />
            Filters
            {statusFilter && (
              <span className="ml-1 px-2 py-0.5 bg-primary-500 text-white text-xs rounded-full">
                1
              </span>
            )}
          </button>

          {/* Sort Dropdown */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split("-");
              setSortBy(field);
              setSortOrder(order);
            }}
            className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="created_at-desc">Newest First</option>
            <option value="created_at-asc">Oldest First</option>
            <option value="file_name-asc">File Name (A-Z)</option>
            <option value="file_name-desc">File Name (Z-A)</option>
            <option value="status-asc">Status (A-Z)</option>
            <option value="status-desc">Status (Z-A)</option>
          </select>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="partial">Partial</option>
                </select>
              </div>
            </div>

            {/* Clear Filters */}
            {statusFilter && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Active filters:
                </span>
                <button
                  onClick={() => setStatusFilter("")}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full hover:bg-primary-200"
                >
                  Status: {statusFilter}
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload History Table */}
      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <ArrowPathIcon className="h-8 w-8 text-primary-500 animate-spin" />
          </div>
        ) : historyError ? (
          <div className="text-center py-12">
            <p className="text-destructive">{historyError}</p>
            <button
              onClick={fetchUploads}
              className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            >
              Try Again
            </button>
          </div>
        ) : uploads.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No uploads yet</p>
            <button
              onClick={() => handleTabChange("upload")}
              className="inline-block mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            >
              Upload Your First File
            </button>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted">
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      File Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Version
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Records
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Uploaded
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Reviewed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {uploads.map((upload) => (
                    <tr
                      key={`${upload.upload_type}-${upload.id}`}
                      className="hover:bg-background-secondary"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-foreground">
                          {upload.file_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${
                            upload.upload_type === "student"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {upload.upload_type === "student" ? (
                            <svg
                              className="h-3.5 w-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                              />
                            </svg>
                          ) : (
                            <BriefcaseIcon className="h-3.5 w-3.5" />
                          )}
                          {upload.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-muted-foreground">
                          {upload.version ? `v${upload.version}` : "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-foreground">
                          {upload.total_records || 0}
                          {upload.upload_type === "employment" &&
                            upload.records_processed && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({upload.records_processed} processed)
                              </span>
                            )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                            upload.status === "pending"
                              ? "bg-secondary-100 text-secondary-700"
                              : upload.status === "approved"
                                ? "bg-primary-100 text-primary-700"
                                : upload.status === "rejected"
                                  ? "bg-destructive/10 text-destructive"
                                  : upload.status === "partial"
                                    ? "bg-blue-100 text-blue-700"
                                    : upload.status === "completed"
                                      ? "bg-green-100 text-green-700"
                                      : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {upload.status?.charAt(0).toUpperCase() +
                            upload.status?.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-muted-foreground">
                          {new Date(upload.created_at).toLocaleDateString(
                            "en-GB",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          by {upload.uploaded_by_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {upload.reviewed_at ? (
                          <>
                            <div className="text-sm text-muted-foreground">
                              {new Date(upload.reviewed_at).toLocaleDateString(
                                "en-GB",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              by {upload.reviewed_by_name}
                            </div>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            -
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-3">
                          {upload.upload_type === "employment" ? (
                            // Employment uploads: Download + Attachments (if any) + View Errors (if any)
                            <>
                              <button
                                onClick={() =>
                                  handleDownloadEmploymentFile(upload)
                                }
                                className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium text-sm"
                                title="Download original file"
                              >
                                <DocumentArrowDownIcon className="h-4 w-4" />
                                Download
                              </button>
                              {getEmploymentAttachmentsFromFileUrl(
                                upload.file_url,
                              ).length > 0 && (
                                <button
                                  onClick={() =>
                                    handleViewEmploymentAttachments(upload)
                                  }
                                  className="text-primary-600 hover:text-primary-700 font-medium"
                                >
                                  Attachments
                                </button>
                              )}
                              {upload.records_failed &&
                              upload.records_failed > 0 ? (
                                <button
                                  onClick={() =>
                                    handleViewEmploymentErrors(upload)
                                  }
                                  className="text-destructive hover:text-destructive/80 font-medium"
                                >
                                  View Errors ({upload.records_failed})
                                </button>
                              ) : null}
                            </>
                          ) : (
                            // Student uploads: Show Download and Delete buttons
                            <>
                              <button
                                onClick={() => handleDownloadUpload(upload)}
                                className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium text-sm"
                                title="Download original file"
                              >
                                <DocumentArrowDownIcon className="h-4 w-4" />
                                Download
                              </button>
                              {(upload.status === "pending" ||
                                upload.status === "rejected") && (
                                <button
                                  onClick={() => handleDeleteClick(upload)}
                                  className="text-destructive hover:text-destructive/80 font-medium"
                                  title="Delete upload"
                                >
                                  <TrashIcon className="h-5 w-5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total,
                  )}{" "}
                  of {pagination.total} results
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: prev.page - 1,
                      }))
                    }
                    disabled={pagination.page === 1}
                    className="px-3 py-1 border border-border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-background-secondary"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: prev.page + 1,
                      }))
                    }
                    disabled={pagination.page === pagination.totalPages}
                    className="px-3 py-1 border border-border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-background-secondary"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {uploadToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Confirm Deletion
            </h3>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete the upload "
              <span className="font-medium text-foreground">
                {uploadToDelete.file_name}
              </span>
              "? This action cannot be undone.
            </p>

            {deleteError && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{deleteError}</p>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={handleDeleteCancel}
                disabled={deleteLoading}
                className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-background-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="px-4 py-2 bg-destructive text-white rounded-lg hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {deleteLoading && (
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerHistoryTab;
