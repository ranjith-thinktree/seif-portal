import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowPathIcon,
  TrashIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  getUploads,
  deleteUpload,
  bulkDeleteUploads,
} from "../../services/upload.service";
import { MainLayout } from "../../components/layout";
import DataTable from "../../components/common/DataTable";
import BulkDeleteButton from "../../components/common/BulkDeleteButton";
import ConfirmationModal from "../../components/common/ConfirmationModal";

/**
 * Upload History Page
 * Shows partner's past uploads with status
 */
const UploadHistoryPage = () => {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [uploadToDelete, setUploadToDelete] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showFilters, setShowFilters] = useState(false);

  // Bulk delete states
  const [selectedRows, setSelectedRows] = useState([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [bulkDeleteResults, setBulkDeleteResults] = useState(null);

  /**
   * Fetch uploads
   */
  const fetchUploads = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getUploads(pagination.page, pagination.limit);

      // Apply client-side filtering and sorting
      let filteredData = result.data || [];

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        filteredData = filteredData.filter(
          (upload) =>
            upload.file_name?.toLowerCase().includes(search) ||
            upload.uploaded_by_name?.toLowerCase().includes(search) ||
            upload.reviewed_by_name?.toLowerCase().includes(search)
        );
      }

      // Status filter
      if (statusFilter) {
        filteredData = filteredData.filter(
          (upload) => upload.status === statusFilter
        );
      }

      // Sorting
      filteredData.sort((a, b) => {
        let aVal = a[sortBy];
        let bVal = b[sortBy];

        // Handle dates
        if (sortBy === "created_at" || sortBy === "reviewed_at") {
          aVal = new Date(aVal || 0);
          bVal = new Date(bVal || 0);
        }

        if (sortOrder === "asc") {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });

      setUploads(filteredData);
      setPagination((prev) => ({
        ...prev,
        total: filteredData.length,
        totalPages: Math.ceil(filteredData.length / prev.limit),
      }));
    } catch (err) {
      console.error("Failed to fetch uploads:", err);
      setError("Failed to load upload history. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    searchTerm,
    statusFilter,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    fetchUploads();
  }, [fetchUploads]);

  /**
   * Handle bulk delete
   */
  const handleBulkDelete = async () => {
    setBulkDeleteLoading(true);
    try {
      const response = await bulkDeleteUploads(selectedRows);
      setBulkDeleteResults(response.data);

      // Show success toast if any deletions succeeded
      if (response.data.summary.successful > 0) {
        console.log(
          `Successfully deleted ${response.data.summary.successful} upload(s)`
        );
        fetchUploads(); // Refresh table
        setSelectedRows([]); // Clear selection
      }

      // Show error toast if all failed
      if (response.data.summary.successful === 0) {
        console.error("Failed to delete any uploads");
      }
    } catch (error) {
      console.error("Error bulk deleting uploads:", error);
      setBulkDeleteResults(null);
      setShowBulkDeleteModal(false);
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  /**
   * Format date
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /**
   * Handle delete upload
   */
  const handleDeleteUpload = async () => {
    if (!uploadToDelete) return;

    setDeleteLoading(true);
    setDeleteError(null);

    try {
      await deleteUpload(uploadToDelete.id);
      setUploadToDelete(null);
      setDeleteError(null);
      // Refresh uploads list
      await fetchUploads();
    } catch (err) {
      console.error("Failed to delete upload:", err);
      const errorMessage =
        err.response?.data?.message ||
        "Failed to delete upload. Please try again.";
      setDeleteError(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  /**
   * Get status badge
   */
  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-secondary-100 text-secondary-700",
      approved: "bg-primary-100 text-primary-700",
      rejected: "bg-destructive/10 text-destructive",
    };

    return (
      <span
        className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
          styles[status] || "bg-muted text-muted-foreground"
        }`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Upload History
            </h1>
            <p className="text-muted-foreground mt-1">
              View your past data uploads and their status
            </p>
          </div>
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            New Upload
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-border p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Bar */}
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
                  {statusFilter && (
                    <button
                      onClick={() => setStatusFilter("")}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full hover:bg-primary-200"
                    >
                      Status: {statusFilter}
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <ArrowPathIcon className="h-8 w-8 text-primary-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-destructive">{error}</p>
              <button
                onClick={() => fetchUploads()}
                className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
              >
                Retry
              </button>
            </div>
          ) : uploads.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No uploads yet</p>
              <Link
                to="/upload"
                className="inline-block mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
              >
                Upload Your First File
              </Link>
            </div>
          ) : (
            <>
              {/* Bulk Delete Button */}
              {selectedRows.length > 0 && (
                <div className="flex justify-end mb-4">
                  <BulkDeleteButton
                    selectedCount={selectedRows.length}
                    onDelete={() => setShowBulkDeleteModal(true)}
                    loading={bulkDeleteLoading}
                  />
                </div>
              )}

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted">
                      <th className="px-6 py-3 text-left w-12">
                        <input
                          type="checkbox"
                          checked={
                            selectedRows.length === uploads.length &&
                            uploads.length > 0
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRows(uploads.map((u) => u.id));
                            } else {
                              setSelectedRows([]);
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        File Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Students
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
                        key={upload.id}
                        className="hover:bg-background-secondary"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(upload.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRows([...selectedRows, upload.id]);
                              } else {
                                setSelectedRows(
                                  selectedRows.filter((id) => id !== upload.id)
                                );
                              }
                            }}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-foreground">
                            {upload.file_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-foreground">
                            {upload.total_records}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(upload.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-muted-foreground">
                            {formatDate(upload.created_at)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            by {upload.uploaded_by_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {upload.reviewed_at ? (
                            <>
                              <div className="text-sm text-muted-foreground">
                                {formatDate(upload.reviewed_at)}
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
                            <button className="text-primary-600 hover:text-primary-700 font-medium">
                              View
                            </button>
                            {(upload.status === "pending" ||
                              upload.status === "rejected") && (
                              <button
                                onClick={() => setUploadToDelete(upload)}
                                className="text-destructive hover:text-destructive/80 font-medium"
                                title="Delete upload"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
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
                      pagination.total
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
              <h3 className="text-lg font-bold text-foreground mb-4">
                Delete Upload?
              </h3>
              <p className="text-muted-foreground mb-6">
                Are you sure you want to delete "{uploadToDelete.file_name}"?
                This action cannot be undone.
              </p>

              {deleteError && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{deleteError}</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setUploadToDelete(null);
                    setDeleteError(null);
                  }}
                  disabled={deleteLoading}
                  className="px-4 py-2 border border-border rounded-lg text-foreground hover:bg-background-secondary transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUpload}
                  disabled={deleteLoading}
                  className="px-4 py-2 bg-destructive text-white rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {deleteLoading ? (
                    <>
                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <TrashIcon className="h-5 w-5" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Delete Confirmation Modal */}
        <ConfirmationModal
          open={showBulkDeleteModal}
          onClose={() => {
            setShowBulkDeleteModal(false);
            setBulkDeleteResults(null);
          }}
          onConfirm={handleBulkDelete}
          title="Delete Uploads"
          message={`Are you sure you want to delete ${selectedRows.length} upload(s)?`}
          itemCount={selectedRows.length}
          items={uploads.filter((u) => selectedRows.includes(u.id))}
          loading={bulkDeleteLoading}
          results={bulkDeleteResults}
          itemType="uploads"
        />
      </div>
    </MainLayout>
  );
};

export default UploadHistoryPage;
