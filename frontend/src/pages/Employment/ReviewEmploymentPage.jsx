import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "../../components/layout";
import Breadcrumb from "../../components/common/Breadcrumb";
import Pagination from "../../components/common/Pagination";
import { showToast } from "../../utils/toast.util";
import { ROUTES } from "../../constants/routes";
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronRightIcon,
  BriefcaseIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";
import { getAdminReviewUploads } from "../../services/employment.service";

const getStatusBadge = (status) => {
  const styles = {
    pending_review: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };
  const labels = {
    pending_review: "Pending Review",
    approved: "Approved",
    rejected: "Rejected",
  };
  return (
    <span
      className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${styles[status] || "bg-muted text-muted-foreground"}`}
    >
      {labels[status] || status}
    </span>
  );
};

/**
 * ReviewEmploymentPage
 * Upload list only — clicking an upload navigates to the centers page.
 */
const ReviewEmploymentPage = () => {
  const navigate = useNavigate();

  const breadcrumbItems = [
    { label: "Dashboard", path: ROUTES.DASHBOARD },
    { label: "Employment Review", path: "#" },
  ];

  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("pending_review");
  const [searchTerm, setSearchTerm] = useState("");

  const loadUploads = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: currentPage, limit: 10 };
      if (statusFilter !== "all") params.status = statusFilter;
      const res = await getAdminReviewUploads(params);
      setUploads(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch {
      showToast.error("Failed to load employment uploads");
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter]);

  useEffect(() => {
    loadUploads();
  }, [loadUploads]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleSelectUpload = (upload) => {
    navigate(ROUTES.EMPLOYMENT_REVIEW_CENTERS.replace(":uploadId", upload.id), {
      state: { upload },
    });
  };

  const filteredUploads = uploads.filter((u) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      u.file_name?.toLowerCase().includes(q) ||
      u.partner_name?.toLowerCase().includes(q)
    );
  });

  const TABS = [
    { key: "pending_review", label: "Pending Review", icon: ClockIcon },
    { key: "approved", label: "Approved", icon: CheckCircleIcon },
    { key: "rejected", label: "Rejected", icon: XCircleIcon },
    { key: "all", label: "All Uploads", icon: ClipboardDocumentListIcon },
  ];

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Breadcrumb items={breadcrumbItems} />
        </div>

        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <div className="p-3 bg-primary-50 rounded-xl">
            <BriefcaseIcon className="h-8 w-8 text-primary-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Employment Review
            </h1>
            <p className="text-gray-500 mt-1">
              Review and approve partner employment data uploads
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-border">
          {TABS.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setStatusFilter(tab.key);
                  setCurrentPage(1);
                }}
                className={`pb-3 px-2 font-medium transition-colors relative flex items-center gap-2 ${
                  statusFilter === tab.key
                    ? "text-primary-600 border-b-2 border-primary-600"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <TabIcon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by file name or partner..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Uploads Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <ArrowPathIcon className="h-8 w-8 text-primary-500 animate-spin" />
              </div>
            ) : filteredUploads.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {statusFilter === "pending_review"
                    ? "No pending employment uploads to review"
                    : "No uploads match the selected filter"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted">
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        File Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Partner
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Centers
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Records
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Uploaded
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredUploads.map((upload) => (
                      <tr
                        key={upload.id}
                        className="hover:bg-background-secondary"
                      >
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-foreground">
                            {upload.file_name}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-foreground">
                            {upload.partner_name}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-foreground">
                            {upload.center_count || upload.total_centers || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-foreground">
                            {upload.record_count || upload.total_records || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-muted-foreground">
                            {formatDate(upload.created_at)}
                          </div>
                          {upload.uploaded_by_name && (
                            <div className="text-xs text-muted-foreground">
                              by {upload.uploaded_by_name}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(upload.review_status)}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleSelectUpload(upload)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-50 text-primary-700 text-sm font-medium rounded-lg hover:bg-primary-100 border border-primary-200 transition-colors"
                          >
                            Review Details
                            <ChevronRightIcon className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default ReviewEmploymentPage;
