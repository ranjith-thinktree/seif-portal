import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  BuildingOffice2Icon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import reviewService from "../../services/review.service";
import {
  getTotPendingUploads,
  approveTotUpload,
  rejectTotUpload,
} from "../../services/tot.service";
import { MainLayout } from "../../components/layout";
import SuccessModal from "../../components/common/SuccessModal";
import RejectionModal from "../../components/common/RejectionModal";
import Breadcrumb from "../../components/common/Breadcrumb";
import { showToast } from "../../utils/toast.util";

/**
 * Review Page - Two Tab System
 * Tab 1: Pending Centers (from centers table - center approval)
 * Tab 2: Pending Data Uploads (from uploaded_batches/students - data approval)
 */
const ReviewPage = () => {
  const navigate = useNavigate();

  // Breadcrumb items
  const breadcrumbItems = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Review & Approval", path: "#" },
  ];

  // Tab state
  const [activeTab, setActiveTab] = useState("centers");

  // Tab 1: Pending Centers state
  const [centers, setCenters] = useState([]);
  const [centersLoading, setCentersLoading] = useState(false);
  const [centersError, setCentersError] = useState(null);
  const [centersPagination, setCentersPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [centersSearch, setCentersSearch] = useState("");

  // Tab 2: Pending Uploads state
  const [uploads, setUploads] = useState([]);
  const [uploadsLoading, setUploadsLoading] = useState(false);
  const [uploadsError, setUploadsError] = useState(null);
  const [uploadsPagination, setUploadsPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [uploadsSearch, setUploadsSearch] = useState("");

  // Tab 3: Pending TOT Uploads state
  const [totUploads, setTotUploads] = useState([]);
  const [totLoading, setTotLoading] = useState(false);
  const [totError, setTotError] = useState(null);
  const [totPagination, setTotPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [totSearch, setTotSearch] = useState("");

  // Modal state
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalType, setModalType] = useState(""); // "center" or "upload"
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Fetch pending centers (Tab 1)
   */
  const fetchPendingCenters = useCallback(async () => {
    setCentersLoading(true);
    setCentersError(null);

    try {
      const result = await reviewService.getPendingCentersForApproval({
        page: centersPagination.page,
        limit: centersPagination.limit,
        search: centersSearch,
      });

      setCenters(result.data || []);
      setCentersPagination(result.pagination);
    } catch (err) {
      console.error("Failed to fetch pending centers:", err);
      setCentersError("Failed to load pending centers. Please try again.");
    } finally {
      setCentersLoading(false);
    }
  }, [centersPagination.page, centersPagination.limit, centersSearch]);

  /**
   * Fetch pending data uploads (Tab 2)
   */
  const fetchPendingUploads = useCallback(async () => {
    setUploadsLoading(true);
    setUploadsError(null);

    try {
      const result = await reviewService.getPendingDataUploads({
        page: uploadsPagination.page,
        limit: uploadsPagination.limit,
        search: uploadsSearch,
      });

      setUploads(result.data || []);
      setUploadsPagination(result.pagination);
    } catch (err) {
      console.error("Failed to fetch pending uploads:", err);
      setUploadsError("Failed to load pending uploads. Please try again.");
    } finally {
      setUploadsLoading(false);
    }
  }, [uploadsPagination.page, uploadsPagination.limit, uploadsSearch]);

  /**
   * Fetch pending TOT uploads (Tab 3)
   */
  const fetchPendingTotUploads = useCallback(async () => {
    setTotLoading(true);
    setTotError(null);

    try {
      const result = await getTotPendingUploads({
        page: totPagination.page,
        limit: totPagination.limit,
        status: "pending",
      });

      setTotUploads(
        result.data?.uploads || result.uploads || result.data || [],
      );
      const pagination = result.data?.pagination || result.pagination || {};
      setTotPagination((prev) => ({
        ...prev,
        total: pagination.total || 0,
        totalPages: pagination.totalPages || 0,
      }));
    } catch (err) {
      console.error("Failed to fetch pending TOT uploads:", err);
      setTotError("Failed to load pending TOT uploads. Please try again.");
    } finally {
      setTotLoading(false);
    }
  }, [totPagination.page, totPagination.limit]);

  // Client-side filter TOT uploads by search term
  const filteredTotUploads = useMemo(() => {
    if (!totSearch.trim()) return totUploads;
    const s = totSearch.toLowerCase();
    return totUploads.filter(
      (u) =>
        u.file_name?.toLowerCase().includes(s) ||
        u.partner_name?.toLowerCase().includes(s) ||
        u.uploaded_by_name?.toLowerCase().includes(s),
    );
  }, [totUploads, totSearch]);

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === "centers") {
      fetchPendingCenters();
    } else if (activeTab === "uploads") {
      fetchPendingUploads();
    } else if (activeTab === "tot") {
      fetchPendingTotUploads();
    }
  }, [
    activeTab,
    fetchPendingCenters,
    fetchPendingUploads,
    fetchPendingTotUploads,
  ]);

  /**
   * Handle approve center (Tab 1)
   */
  const handleApproveCenter = async () => {
    if (!selectedItem) return;

    setIsProcessing(true);
    try {
      await reviewService.approveCenterDirect(selectedItem.id);
      setShowApproveModal(false);
      setSelectedItem(null);
      fetchPendingCenters();
    } catch (err) {
      console.error("Failed to approve center:", err);
      showToast.error(
        err.response?.data?.message || "Failed to approve center",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle reject center (Tab 1)
   */
  const handleRejectCenter = async (reason, remarks) => {
    if (!selectedItem) return;

    setIsProcessing(true);
    try {
      await reviewService.rejectCenterDirect(selectedItem.id, reason, remarks);
      setShowRejectModal(false);
      setSelectedItem(null);
      fetchPendingCenters();
    } catch (err) {
      console.error("Failed to reject center:", err);
      showToast.error(err.response?.data?.message || "Failed to reject center");
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle approve upload (Tab 2)
   */
  const handleViewUploadDetails = (uploadId) => {
    navigate(`/review-centers/${uploadId}`);
  };

  /**
   * Handle approve TOT upload (Tab 3)
   */
  const handleApproveTot = async () => {
    if (!selectedItem) return;

    setIsProcessing(true);
    try {
      await approveTotUpload(selectedItem.id, "");
      showToast.success("TOT upload approved successfully");
      setShowApproveModal(false);
      setSelectedItem(null);
      fetchPendingTotUploads();
    } catch (err) {
      console.error("Failed to approve TOT upload:", err);
      showToast.error(
        err.response?.data?.message || "Failed to approve TOT upload",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle reject TOT upload (Tab 3)
   */
  const handleRejectTot = async (reason, remarks) => {
    if (!selectedItem) return;

    setIsProcessing(true);
    try {
      await rejectTotUpload(selectedItem.id, remarks || reason);
      showToast.success("TOT upload rejected");
      setShowRejectModal(false);
      setSelectedItem(null);
      fetchPendingTotUploads();
    } catch (err) {
      console.error("Failed to reject TOT upload:", err);
      showToast.error(
        err.response?.data?.message || "Failed to reject TOT upload",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Get status badge
   */
  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      partial: "bg-blue-100 text-blue-800",
    };

    return (
      <span
        className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
          styles[status] || "bg-muted text-muted-foreground"
        }`}
      >
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  /**
   * Format date
   */
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

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
            <ClipboardDocumentListIcon className="h-8 w-8 text-primary-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Review & Approval
            </h1>
            <p className="text-gray-500 mt-1">
              Review and approve pending centers and data uploads
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-border">
          <button
            onClick={() => setActiveTab("centers")}
            className={`pb-3 px-2 font-medium transition-colors relative flex items-center gap-2 ${
              activeTab === "centers"
                ? "text-primary-600 border-b-2 border-primary-600"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BuildingOffice2Icon className="h-4 w-4" />
            Pending Centers
            {centersPagination.total > 0 && (
              <span
                className={`ml-1 px-2 py-0.5 text-xs rounded-full font-semibold ${
                  activeTab === "centers"
                    ? "bg-primary-500 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {centersPagination.total}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("uploads")}
            className={`pb-3 px-2 font-medium transition-colors relative flex items-center gap-2 ${
              activeTab === "uploads"
                ? "text-primary-600 border-b-2 border-primary-600"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ClipboardDocumentListIcon className="h-4 w-4" />
            Pending Data Uploads
            {uploadsPagination.total > 0 && (
              <span
                className={`ml-1 px-2 py-0.5 text-xs rounded-full font-semibold ${
                  activeTab === "uploads"
                    ? "bg-primary-500 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {uploadsPagination.total}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("tot")}
            className={`pb-3 px-2 font-medium transition-colors relative flex items-center gap-2 ${
              activeTab === "tot"
                ? "text-primary-600 border-b-2 border-primary-600"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <UserGroupIcon className="h-4 w-4" />
            Pending TOT Uploads
            {totPagination.total > 0 && (
              <span
                className={`ml-1 px-2 py-0.5 text-xs rounded-full font-semibold ${
                  activeTab === "tot"
                    ? "bg-primary-500 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {totPagination.total}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "centers" ? (
          /* Tab 1: Pending Centers */
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by center name, city, or state..."
                  value={centersSearch}
                  onChange={(e) => setCentersSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Centers Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {centersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <ArrowPathIcon className="h-8 w-8 text-primary-500 animate-spin" />
                </div>
              ) : centersError ? (
                <div className="text-center py-12">
                  <p className="text-destructive">{centersError}</p>
                  <button
                    onClick={fetchPendingCenters}
                    className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                  >
                    Try Again
                  </button>
                </div>
              ) : centers.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    No pending centers to review
                  </p>
                </div>
              ) : (
                <>
                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted">
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Center Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Partner
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Location
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Created
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {centers.map((center) => (
                          <tr
                            key={center.id}
                            className="hover:bg-background-secondary"
                          >
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-foreground">
                                {center.center_name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {center.center_id || "ID pending"}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-foreground">
                                {center.partner_name}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-foreground">
                                {center.city}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {center.state}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-foreground">
                                {center.center_type}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-muted-foreground">
                                {formatDate(center.created_at)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedItem(center);
                                    setModalType("center");
                                    setShowApproveModal(true);
                                  }}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                                >
                                  <CheckCircleIcon className="h-4 w-4" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedItem(center);
                                    setModalType("center");
                                    setShowRejectModal(true);
                                  }}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                                >
                                  <XCircleIcon className="h-4 w-4" />
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {centersPagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
                      <div className="text-sm text-gray-500">
                        Showing{" "}
                        <span className="font-medium text-gray-700">
                          {(centersPagination.page - 1) *
                            centersPagination.limit +
                            1}
                        </span>{" "}
                        to{" "}
                        <span className="font-medium text-gray-700">
                          {Math.min(
                            centersPagination.page * centersPagination.limit,
                            centersPagination.total,
                          )}
                        </span>{" "}
                        of{" "}
                        <span className="font-medium text-gray-700">
                          {centersPagination.total}
                        </span>{" "}
                        results
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setCentersPagination((prev) => ({
                              ...prev,
                              page: prev.page - 1,
                            }))
                          }
                          disabled={centersPagination.page === 1}
                          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white hover:border-gray-300 transition-colors"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() =>
                            setCentersPagination((prev) => ({
                              ...prev,
                              page: prev.page + 1,
                            }))
                          }
                          disabled={
                            centersPagination.page ===
                            centersPagination.totalPages
                          }
                          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white hover:border-gray-300 transition-colors"
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
        ) : activeTab === "uploads" ? (
          /* Tab 2: Pending Data Uploads */
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by file name or partner..."
                  value={uploadsSearch}
                  onChange={(e) => setUploadsSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Uploads Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {uploadsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <ArrowPathIcon className="h-8 w-8 text-primary-500 animate-spin" />
                </div>
              ) : uploadsError ? (
                <div className="text-center py-12">
                  <p className="text-destructive">{uploadsError}</p>
                  <button
                    onClick={fetchPendingUploads}
                    className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                  >
                    Try Again
                  </button>
                </div>
              ) : uploads.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    No pending data uploads to review
                  </p>
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
                            Partner
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Batches
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Students
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
                        {uploads.map((upload) => (
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
                                {upload.total_batches_uploaded || 0}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-medium text-foreground">
                                {upload.total_students_uploaded || 0}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-muted-foreground">
                                {formatDate(upload.created_at)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                by {upload.uploaded_by_name}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {getStatusBadge(upload.status)}
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() =>
                                  handleViewUploadDetails(upload.id)
                                }
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

                  {/* Pagination */}
                  {uploadsPagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
                      <div className="text-sm text-gray-500">
                        Showing{" "}
                        <span className="font-medium text-gray-700">
                          {(uploadsPagination.page - 1) *
                            uploadsPagination.limit +
                            1}
                        </span>{" "}
                        to{" "}
                        <span className="font-medium text-gray-700">
                          {Math.min(
                            uploadsPagination.page * uploadsPagination.limit,
                            uploadsPagination.total,
                          )}
                        </span>{" "}
                        of{" "}
                        <span className="font-medium text-gray-700">
                          {uploadsPagination.total}
                        </span>{" "}
                        results
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setUploadsPagination((prev) => ({
                              ...prev,
                              page: prev.page - 1,
                            }))
                          }
                          disabled={uploadsPagination.page === 1}
                          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white hover:border-gray-300 transition-colors"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() =>
                            setUploadsPagination((prev) => ({
                              ...prev,
                              page: prev.page + 1,
                            }))
                          }
                          disabled={
                            uploadsPagination.page ===
                            uploadsPagination.totalPages
                          }
                          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white hover:border-gray-300 transition-colors"
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
        ) : (
          /* Tab 3: Pending TOT Uploads */
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by file name or partner..."
                  value={totSearch}
                  onChange={(e) => setTotSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* TOT Uploads Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {totLoading ? (
                <div className="flex items-center justify-center py-12">
                  <ArrowPathIcon className="h-8 w-8 text-primary-500 animate-spin" />
                </div>
              ) : totError ? (
                <div className="text-center py-12">
                  <p className="text-destructive">{totError}</p>
                  <button
                    onClick={fetchPendingTotUploads}
                    className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                  >
                    Try Again
                  </button>
                </div>
              ) : filteredTotUploads.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    No pending TOT uploads to review
                  </p>
                </div>
              ) : (
                <>
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
                            Total Records
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
                        {filteredTotUploads.map((upload) => (
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
                                {upload.total_records || 0}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-muted-foreground">
                                {formatDate(upload.created_at)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                by {upload.uploaded_by_name || "—"}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {getStatusBadge(upload.status)}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedItem(upload);
                                    setModalType("tot");
                                    setShowApproveModal(true);
                                  }}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                                >
                                  <CheckCircleIcon className="h-4 w-4" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedItem(upload);
                                    setModalType("tot");
                                    setShowRejectModal(true);
                                  }}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                                >
                                  <XCircleIcon className="h-4 w-4" />
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totPagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
                      <div className="text-sm text-gray-500">
                        Showing{" "}
                        <span className="font-medium text-gray-700">
                          {(totPagination.page - 1) * totPagination.limit + 1}
                        </span>{" "}
                        to{" "}
                        <span className="font-medium text-gray-700">
                          {Math.min(
                            totPagination.page * totPagination.limit,
                            totPagination.total,
                          )}
                        </span>{" "}
                        of{" "}
                        <span className="font-medium text-gray-700">
                          {totPagination.total}
                        </span>{" "}
                        results
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setTotPagination((prev) => ({
                              ...prev,
                              page: prev.page - 1,
                            }))
                          }
                          disabled={totPagination.page === 1}
                          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white hover:border-gray-300 transition-colors"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() =>
                            setTotPagination((prev) => ({
                              ...prev,
                              page: prev.page + 1,
                            }))
                          }
                          disabled={
                            totPagination.page === totPagination.totalPages
                          }
                          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white hover:border-gray-300 transition-colors"
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
        )}

        {/* Approve Modal */}
        <SuccessModal
          isOpen={showApproveModal}
          onClose={() => {
            setShowApproveModal(false);
            setSelectedItem(null);
          }}
          title={
            modalType === "center"
              ? "Approve Center"
              : modalType === "tot"
                ? "Approve TOT Upload"
                : "Approve Data Upload"
          }
          description={
            modalType === "center"
              ? `Are you sure you want to approve "${selectedItem?.center_name}"? This center will become active and partners can upload student data for it.`
              : modalType === "tot"
                ? `Are you sure you want to approve this TOT upload? All ${selectedItem?.total_records || 0} trainer records will be moved to production.`
                : `Are you sure you want to approve this data upload? Students and batches will be moved to production.`
          }
          partnerName={selectedItem?.partner_name || ""}
          centerName={
            selectedItem?.center_name || selectedItem?.file_name || ""
          }
          onConfirm={
            modalType === "center"
              ? handleApproveCenter
              : modalType === "tot"
                ? handleApproveTot
                : () => {} // Upload approval goes to detail page
          }
          isLoading={isProcessing}
          showCancel={true}
          buttonText="Confirm Approval"
        />

        {/* Reject Modal */}
        <RejectionModal
          isOpen={showRejectModal}
          onClose={() => {
            setShowRejectModal(false);
            setSelectedItem(null);
          }}
          title={
            modalType === "center"
              ? `Reject Center: ${selectedItem?.center_name || ""}`
              : `Reject Upload: ${selectedItem?.file_name || ""}`
          }
          description={
            modalType === "center"
              ? "Please provide a reason for rejecting this center. This will be sent to the partner for review."
              : modalType === "tot"
                ? "Please provide a reason for rejecting this TOT upload."
                : "Please provide a reason for rejecting this data upload."
          }
          onSubmit={
            modalType === "center"
              ? (data) => handleRejectCenter(data.reason, data.remarks)
              : modalType === "tot"
                ? (data) => handleRejectTot(data.reason, data.remarks)
                : () => {} // Upload rejection goes to detail page
          }
          isLoading={isProcessing}
          reasonLabel="Reason for Rejection"
          remarksLabel="Additional Remarks"
          reasonPlaceholder="Enter the reason for rejection (10-500 characters)"
          remarksPlaceholder="Any additional comments..."
          minReasonLength={10}
        />
      </div>
    </MainLayout>
  );
};

export default ReviewPage;
