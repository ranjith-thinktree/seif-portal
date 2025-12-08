import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { getUploads } from "../../services/upload.service";
import { MainLayout } from "../../components/layout";

/**
 * Upload History Page
 * Shows partner's past uploads with status
 */
const UploadHistoryPage = () => {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  /**
   * Fetch uploads
   */
  const fetchUploads = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);

      try {
        const result = await getUploads(page, pagination.limit);
        setUploads(result.data);
        setPagination(result.pagination);
      } catch (err) {
        console.error("Failed to fetch uploads:", err);
        setError("Failed to load upload history. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit]
  );

  useEffect(() => {
    fetchUploads();
  }, [fetchUploads]);

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
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            New Upload
          </Link>
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
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted">
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        File Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Version
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
                          <div className="text-sm font-medium text-foreground">
                            {upload.file_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-muted-foreground">
                            v{upload.version}
                          </span>
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
                          <button className="text-primary-600 hover:text-primary-700 font-medium">
                            View
                          </button>
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
                      onClick={() => fetchUploads(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="px-3 py-1 border border-border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-background-secondary"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => fetchUploads(pagination.page + 1)}
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
      </div>
    </MainLayout>
  );
};

export default UploadHistoryPage;
