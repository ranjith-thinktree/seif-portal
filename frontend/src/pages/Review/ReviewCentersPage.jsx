import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { MainLayout } from "../../components/layout";
import reviewService from "../../services/review.service";
import Breadcrumb from "../../components/common/Breadcrumb";
import SearchBar from "../../components/common/SearchBar";
import Pagination from "../../components/common/Pagination";
import SuccessModal from "../../components/common/SuccessModal";
import RejectionModal from "../../components/common/RejectionModal";
import { showToast } from "../../utils/toast.util";
import { ROUTES } from "../../constants/routes";
import {
  BuildingOffice2Icon,
  ChevronRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

/**
 * ReviewCentersPage Component
 * Admin view to review uploaded centers (center-wise approval)
 */
const ReviewCentersPage = () => {
  const { uploadId } = useParams();
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);
  const { user } = useSelector((state) => state.auth);
  const isReadOnly = ["SEIF_READONLY", "SEIF_READONLY_DOWNLOAD"].includes(
    user?.role,
  );

  const [upload, setUpload] = useState(null);
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState([
    { label: "Pending", value: "pending", checked: false },
    { label: "Approved", value: "approved", checked: false },
    { label: "Rejected", value: "rejected", checked: false },
  ]);
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [selectedCenterIds, setSelectedCenterIds] = useState([]);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [duplicateConflicts, setDuplicateConflicts] = useState(null);
  const itemsPerPage = 10;

  // Breadcrumb items
  const breadcrumbItems = [
    { label: "Inbox", path: ROUTES.INBOX },
    { label: "Review Upload", path: "#" },
  ];

  const fetchUploadDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await reviewService.getUploadForReview(uploadId);
      setUpload(response.data);
    } catch (error) {
      console.error("Error fetching upload details:", error);
      showToast.error("Failed to load upload details");
      navigate(ROUTES.INBOX);
    } finally {
      setLoading(false);
    }
  }, [uploadId, navigate]);

  const fetchCenters = useCallback(async () => {
    try {
      setLoading(true);
      const response = await reviewService.getPendingCenters(uploadId, {
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
      });

      const nextCenters = response.data.data || [];
      setCenters(nextCenters);
      setTotalPages(response.data.pagination?.totalPages || 1);
      setSelectedCenterIds((prev) =>
        prev.filter((id) =>
          nextCenters.some(
            (center) => center.id === id && center.review_status === "pending",
          ),
        ),
      );
    } catch (error) {
      console.error("Error fetching centers:", error);
      showToast.error("Failed to load centers");
    } finally {
      setLoading(false);
    }
  }, [uploadId, currentPage, searchTerm]);

  // Fetch upload details
  useEffect(() => {
    fetchUploadDetails();
  }, [fetchUploadDetails]);

  // Fetch centers
  useEffect(() => {
    fetchCenters();
  }, [fetchCenters]);

  // Handle search
  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Handle filter change
  const handleFilterChange = (value, checked) => {
    setFilters((prev) =>
      prev.map((f) => (f.value === value ? { ...f, checked } : f)),
    );
    setCurrentPage(1);
  };

  // Handle sort change
  const handleSortChange = (sortByValue, sortOrderValue) => {
    setSortBy(sortByValue);
    setSortOrder(sortOrderValue);
  };

  // Apply filters and sorting to centers
  const getFilteredAndSortedCenters = () => {
    let filtered = [...centers];

    // Apply status filters
    const activeFilters = filters.filter((f) => f.checked).map((f) => f.value);
    if (activeFilters.length > 0) {
      filtered = filtered.filter((center) =>
        activeFilters.includes(center.review_status),
      );
    }

    // Apply sorting
    if (sortBy) {
      filtered.sort((a, b) => {
        let aValue, bValue;

        switch (sortBy) {
          case "name":
            aValue = a.center_name?.toLowerCase() || "";
            bValue = b.center_name?.toLowerCase() || "";
            break;
          case "city":
            aValue = a.city?.toLowerCase() || "";
            bValue = b.city?.toLowerCase() || "";
            break;
          case "state":
            aValue = a.state?.toLowerCase() || "";
            bValue = b.state?.toLowerCase() || "";
            break;
          case "students":
            aValue = a.student_count || 0;
            bValue = b.student_count || 0;
            break;
          case "status":
            aValue = a.review_status?.toLowerCase() || "";
            bValue = b.review_status?.toLowerCase() || "";
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
        if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  };

  const displayCenters = getFilteredAndSortedCenters();

  const selectableCenterIds = useMemo(
    () =>
      displayCenters
        .filter((center) => center.review_status === "pending")
        .map((center) => center.id),
    [displayCenters],
  );

  const allSelectableChecked =
    selectableCenterIds.length > 0 &&
    selectableCenterIds.every((id) => selectedCenterIds.includes(id));

  const selectedCenters = useMemo(
    () =>
      displayCenters.filter((center) => selectedCenterIds.includes(center.id)),
    [displayCenters, selectedCenterIds],
  );

  // Drag-to-scroll functionality
  useEffect(() => {
    const ele = scrollContainerRef.current;
    if (!ele) return;

    let pos = { top: 0, left: 0, x: 0, y: 0 };
    let isDragging = false;

    const mouseDownHandler = function (e) {
      if (e.target.closest("button, a, input, select, textarea")) return;

      isDragging = false;
      ele.style.cursor = "grabbing";
      ele.style.userSelect = "none";

      pos = {
        left: ele.scrollLeft,
        top: ele.scrollTop,
        x: e.clientX,
        y: e.clientY,
      };

      document.addEventListener("mousemove", mouseMoveHandler);
      document.addEventListener("mouseup", mouseUpHandler);
    };

    const mouseMoveHandler = function (e) {
      const dx = e.clientX - pos.x;
      const dy = e.clientY - pos.y;

      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        isDragging = true;
      }

      if (isDragging) {
        ele.scrollTop = pos.top - dy;
        ele.scrollLeft = pos.left - dx;
      }
    };

    const mouseUpHandler = function () {
      ele.style.cursor = "grab";
      ele.style.userSelect = "";

      document.removeEventListener("mousemove", mouseMoveHandler);
      document.removeEventListener("mouseup", mouseUpHandler);

      if (isDragging) {
        setTimeout(() => {
          isDragging = false;
        }, 10);
      }
    };

    ele.style.cursor = "grab";
    ele.addEventListener("mousedown", mouseDownHandler);

    return () => {
      ele.removeEventListener("mousedown", mouseDownHandler);
      document.removeEventListener("mousemove", mouseMoveHandler);
      document.removeEventListener("mouseup", mouseUpHandler);
    };
  }, []);

  // Handle center click
  const handleCenterClick = (center) => {
    const path = ROUTES.REVIEW_STUDENTS.replace(":uploadId", uploadId).replace(
      ":centerId",
      center.id,
    );
    navigate(path);
  };

  const handleCenterCheckboxChange = (centerId, checked) => {
    setSelectedCenterIds((prev) => {
      if (checked) {
        return prev.includes(centerId) ? prev : [...prev, centerId];
      }

      return prev.filter((id) => id !== centerId);
    });
  };

  const handleSelectAllChange = (checked) => {
    if (checked) {
      setSelectedCenterIds(selectableCenterIds);
      return;
    }

    setSelectedCenterIds([]);
  };

  const resetBulkActionState = () => {
    setShowApproveModal(false);
    setShowRejectModal(false);
    setIsProcessing(false);
  };

  const refreshReviewData = async () => {
    await Promise.all([fetchUploadDetails(), fetchCenters()]);
  };

  const handleBulkApprove = async () => {
    if (selectedCenterIds.length === 0) {
      return;
    }

    setIsProcessing(true);
    setDuplicateConflicts(null);

    // Process sequentially to avoid race condition in syncUploadLifecycle
    let successful = 0;
    let failed = 0;
    let blockedByDuplicates = null;
    for (const centerId of selectedCenterIds) {
      try {
        await reviewService.approveCenter(uploadId, centerId);
        successful++;
      } catch (error) {
        const data = error?.response?.data;
        if (data?.code === "DUPLICATE_STUDENTS") {
          blockedByDuplicates = data;
        } else {
          failed++;
        }
      }
    }

    if (blockedByDuplicates) {
      setDuplicateConflicts(blockedByDuplicates);
    }

    if (successful > 0) {
      showToast.success(
        `${successful} center${successful > 1 ? "s" : ""} approved successfully`,
      );
    }

    if (failed > 0) {
      showToast.error(
        `${failed} center${failed > 1 ? "s" : ""} could not be approved`,
      );
    }

    setSelectedCenterIds([]);
    resetBulkActionState();
    await refreshReviewData();
  };

  const handleBulkReject = async ({ reason, remarks }) => {
    if (selectedCenterIds.length === 0) {
      return;
    }

    setIsProcessing(true);

    // Process sequentially to avoid race condition in syncUploadLifecycle
    let successful = 0;
    let failed = 0;
    for (const centerId of selectedCenterIds) {
      try {
        await reviewService.rejectCenter(uploadId, centerId, reason, remarks);
        successful++;
      } catch {
        failed++;
      }
    }

    if (successful > 0) {
      showToast.success(
        `${successful} center${successful > 1 ? "s" : ""} rejected successfully`,
      );
    }

    if (failed > 0) {
      showToast.error(
        `${failed} center${failed > 1 ? "s" : ""} could not be rejected`,
      );
    }

    setSelectedCenterIds([]);
    resetBulkActionState();
    await refreshReviewData();
  };

  // Get status badge color
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "pending":
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  if (loading && !upload) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading upload details...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbItems} />

        {/* Duplicate Students Conflict Panel */}
        {duplicateConflicts && (
          <div className="bg-red-50 border border-red-300 rounded-xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-base font-semibold text-red-800">
                  Approval Blocked — Duplicate Students Detected
                </h2>
                <p className="text-sm text-red-700 mt-1">
                  The following {duplicateConflicts.conflicts.length} student
                  record(s) already exist in the system. Ask the partner to
                  remove these rows and resubmit.
                </p>
              </div>
              <button
                onClick={() => setDuplicateConflicts(null)}
                className="ml-4 text-red-400 hover:text-red-600 text-lg font-bold leading-none"
                aria-label="Dismiss"
              >
                &times;
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-red-900 border border-red-200 rounded-lg overflow-hidden">
                <thead className="bg-red-100">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">#</th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Student Name
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Father Name
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Date of Birth
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Course
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Center
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Existing ID
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Existing Batch
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-100">
                  {duplicateConflicts.conflicts.map((c, i) => (
                    <tr key={i} className="bg-white even:bg-red-50">
                      <td className="px-3 py-2">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">
                        {c.student_name}
                      </td>
                      <td className="px-3 py-2">{c.father_name}</td>
                      <td className="px-3 py-2">{c.date_of_birth}</td>
                      <td className="px-3 py-2">{c.course_name}</td>
                      <td className="px-3 py-2">{c.center_id}</td>
                      <td className="px-3 py-2 font-mono">
                        {c.existing_student_id}
                      </td>
                      <td className="px-3 py-2">{c.existing_batch || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className="p-2.5 bg-blue-50 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">
                Review Upload
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {upload?.partner_name}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                Uploaded By
              </p>
              <p className="text-sm font-medium text-gray-900">
                {upload?.uploaded_by_name || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                Upload Date
              </p>
              <p className="text-sm font-medium text-gray-900">
                {upload?.uploaded_at
                  ? new Date(upload.uploaded_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                File
              </p>
              <p className="text-sm font-medium text-gray-900 truncate">
                {upload?.file_name || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                Total Students
              </p>
              <p className="text-sm font-medium text-gray-900">
                {upload?.total_students || "-"}
              </p>
            </div>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <BuildingOffice2Icon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {upload?.review_stats?.total_centers ?? 0}
              </p>
              <p className="text-xs text-gray-500">Total Centers</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <ClockIcon className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-700">
                {upload?.review_stats?.pending_centers ?? 0}
              </p>
              <p className="text-xs text-gray-500">Pending Review</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">
                {upload?.review_stats?.approved_centers ?? 0}
              </p>
              <p className="text-xs text-gray-500">Approved</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <XCircleIcon className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700">
                {upload?.review_stats?.rejected_centers ?? 0}
              </p>
              <p className="text-xs text-gray-500">Rejected</p>
            </div>
          </div>
        </div>

        {/* Search Bar with Filter and Sort */}
        <SearchBar
          value={searchTerm}
          onChange={handleSearch}
          placeholder="Search centers by name, city, or state..."
          filters={filters}
          onFilterChange={handleFilterChange}
          sortOptions={[
            { label: "Name (A-Z)", value: "name" },
            { label: "City (A-Z)", value: "city" },
            { label: "State (A-Z)", value: "state" },
            { label: "Student Count", value: "students" },
            { label: "Status", value: "status" },
          ]}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
        />

        {!isReadOnly && selectableCenterIds.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">
                {selectedCenterIds.length}
              </span>{" "}
              center{selectedCenterIds.length === 1 ? "" : "s"} selected on this
              page
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowApproveModal(true)}
                disabled={selectedCenterIds.length === 0 || isProcessing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircleIcon className="h-4 w-4" />
                Approve Selected
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={selectedCenterIds.length === 0 || isProcessing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircleIcon className="h-4 w-4" />
                Reject Selected
              </button>
            </div>
          </div>
        )}

        {/* Centers Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading centers...</div>
            </div>
          ) : displayCenters.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">
                {searchTerm
                  ? "No centers found matching your search"
                  : filters.some((f) => f.checked)
                    ? "No centers found matching selected filters"
                    : "No centers to review"}
              </div>
            </div>
          ) : (
            <>
              <div
                ref={scrollContainerRef}
                className="overflow-x-auto custom-scrollbar"
              >
                <table className="min-w-full divide-y divide-gray-200 table-fixed">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-12 px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={allSelectableChecked}
                          onChange={(event) =>
                            handleSelectAllChange(event.target.checked)
                          }
                          disabled={selectableCenterIds.length === 0}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 disabled:opacity-50"
                          aria-label="Select all pending centers on this page"
                        />
                      </th>
                      <th className="w-16 px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        S.NO
                      </th>
                      <th className="w-[26%] min-w-[220px] px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Center Name
                      </th>
                      <th className="w-[16%] min-w-[120px] px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        City
                      </th>
                      <th className="w-[16%] min-w-[140px] px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        State
                      </th>
                      <th className="w-[10%] min-w-[88px] px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Students
                      </th>
                      <th className="w-[12%] min-w-[110px] px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="w-[14%] min-w-[112px] px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {displayCenters.map((center, index) => (
                      <tr
                        key={center.id}
                        onClick={() =>
                          center.review_status === "pending" &&
                          handleCenterClick(center)
                        }
                        className={[
                          center.review_status === "pending"
                            ? "hover:bg-blue-50 cursor-pointer transition-colors group"
                            : "opacity-70 bg-gray-50/50",
                        ].join(" ")}
                      >
                        <td
                          className="px-4 py-4 whitespace-nowrap"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedCenterIds.includes(center.id)}
                            onChange={(event) =>
                              handleCenterCheckboxChange(
                                center.id,
                                event.target.checked,
                              )
                            }
                            disabled={center.review_status !== "pending"}
                            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 disabled:opacity-50"
                            aria-label={`Select ${center.center_name}`}
                          />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm font-medium text-gray-900">
                          <div className="flex items-center gap-2 truncate">
                            <span className="truncate">
                              {center.center_name}
                            </span>
                            {center.review_status === "pending" && (
                              <ChevronRightIcon className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600 truncate">
                          {center.city}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600 truncate">
                          {center.state}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {center.student_count}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(
                              center.review_status,
                            )}`}
                          >
                            {center.review_status === "pending" && "Pending"}
                            {center.review_status === "approved" && "Approved"}
                            {center.review_status === "rejected" && "Rejected"}
                          </span>
                        </td>
                        <td
                          className="px-4 py-4 whitespace-nowrap"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedCenterIds([center.id]);
                                setShowApproveModal(true);
                              }}
                              disabled={center.review_status !== "pending"}
                              title={`Approve ${center.center_name}`}
                              aria-label={`Approve ${center.center_name}`}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <CheckCircleIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCenterIds([center.id]);
                                setShowRejectModal(true);
                              }}
                              disabled={center.review_status !== "pending"}
                              title={`Reject ${center.center_name}`}
                              aria-label={`Reject ${center.center_name}`}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <XCircleIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                totalItems={upload?.review_stats?.total_centers || 0}
                currentItemsCount={displayCenters.length}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>

        <SuccessModal
          isOpen={showApproveModal}
          onClose={() => setShowApproveModal(false)}
          title={
            selectedCenterIds.length === 1
              ? "Approve Center"
              : "Approve Selected Centers"
          }
          description={
            selectedCenterIds.length === 1
              ? "This action will move all data from this center to the main system. Do you want to proceed?"
              : `This action will approve ${selectedCenterIds.length} selected centers and move their data to the main system. Do you want to proceed?`
          }
          partnerName={
            selectedCenters.length === 1
              ? selectedCenters[0]?.partner_name || ""
              : ""
          }
          centerName={
            selectedCenters.length === 1
              ? selectedCenters[0]?.center_name || ""
              : `${selectedCenterIds.length} centers selected`
          }
          onConfirm={handleBulkApprove}
          isLoading={isProcessing}
          showCancel={true}
          buttonText={
            selectedCenterIds.length === 1
              ? "Confirm Approval"
              : "Confirm Bulk Approval"
          }
        />

        <RejectionModal
          isOpen={showRejectModal}
          onClose={() => setShowRejectModal(false)}
          title={
            selectedCenterIds.length === 1
              ? `Reject Center: ${selectedCenters[0]?.center_name || ""}`
              : `Reject ${selectedCenterIds.length} Selected Centers`
          }
          description={
            selectedCenterIds.length === 1
              ? "Please provide a reason for rejecting this center. This will be sent to the partner for review."
              : "Please provide a reason for rejecting the selected centers. This same rejection reason will be applied to all selected centers and sent to the partner for review."
          }
          onSubmit={handleBulkReject}
          isLoading={isProcessing}
          reasonLabel="Reason for Rejection"
          remarksLabel="Remarks"
          reasonPlaceholder="Enter reason for rejection (minimum 10 characters)"
          remarksPlaceholder="Enter additional remarks or comments"
          minReasonLength={10}
        />
      </div>
    </MainLayout>
  );
};

export default ReviewCentersPage;
