import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { MainLayout } from "../../components/layout";
import reviewService from "../../services/review.service";
import apiClient from "../../api/client";
import Breadcrumb from "../../components/common/Breadcrumb";
import SearchBar from "../../components/common/SearchBar";
import Pagination from "../../components/common/Pagination";
import SuccessModal from "../../components/common/SuccessModal";
import RejectionModal from "../../components/common/RejectionModal";
import { Badge } from "../../components/ui/badge";
import { showToast } from "../../utils/toast.util";
import { ROUTES } from "../../constants/routes";

/**
 * ReviewStudentsPage Component
 * Shows students for a specific center with approve/reject buttons
 */
const ReviewStudentsPage = () => {
  const { uploadId, centerId } = useParams();
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);

  const [center, setCenter] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isApproving, setIsApproving] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionRemarks, setRejectionRemarks] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [isReviewed, setIsReviewed] = useState(false);
  const [filters, setFilters] = useState([
    { label: "Male", value: "Male", checked: false },
    { label: "Female", value: "Female", checked: false },
    { label: "Active", value: "active", checked: false },
    { label: "Inactive", value: "inactive", checked: false },
  ]);
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [uploadChanges, setUploadChanges] = useState([]);
  const [uploadVersion, setUploadVersion] = useState(1);
  const itemsPerPage = 10;

  // Breadcrumb items
  const breadcrumbItems = [
    { label: "Inbox", path: ROUTES.INBOX },
    {
      label: "Review Upload",
      path: ROUTES.REVIEW_UPLOAD.replace(":uploadId", uploadId),
    },
    { label: "Students", path: "#" },
  ];

  // Fetch students
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const response = await reviewService.getCenterStudents(
          uploadId,
          centerId,
          {
            page: currentPage,
            limit: itemsPerPage,
            search: searchTerm,
          }
        );

        setCenter(response.data.center);
        setStudents(response.data.students || []);
        setTotalPages(response.data.pagination?.totalPages || 1);

        // Store upload version from center data
        if (response.data.center?.data_upload_version) {
          setUploadVersion(response.data.center.data_upload_version);
        }

        // Check if center is already reviewed
        if (response.data.center.review_status !== "pending") {
          setIsReviewed(true);
        }
      } catch (error) {
        console.error("Error fetching students:", error);
        showToast.error("Failed to load students");
        navigate(ROUTES.REVIEW_UPLOAD.replace(":uploadId", uploadId));
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [uploadId, centerId, currentPage, searchTerm, navigate]);

  // Fetch upload changes if version > 1
  useEffect(() => {
    const fetchUploadChanges = async () => {
      if (uploadVersion <= 1) return;

      try {
        const response = await apiClient.get(
          `/partners/uploads/${uploadId}/changes`
        );
        setUploadChanges(response.data.data || []);
      } catch (error) {
        console.error("Error fetching upload changes:", error);
        // Non-critical error, don't show toast
      }
    };

    fetchUploadChanges();
  }, [uploadId, uploadVersion]);

  // Handle search
  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Handle filter change
  const handleFilterChange = (value, checked) => {
    setFilters((prev) =>
      prev.map((f) => (f.value === value ? { ...f, checked } : f))
    );
    setCurrentPage(1);
  };

  // Handle sort change
  const handleSortChange = (sortByValue, sortOrderValue) => {
    setSortBy(sortByValue);
    setSortOrder(sortOrderValue);
  };

  // Apply filters and sorting
  const getFilteredAndSortedStudents = () => {
    let filtered = [...students];

    // Apply gender filters
    const genderFilters = filters
      .filter((f) => f.checked && (f.value === "Male" || f.value === "Female"))
      .map((f) => f.value);
    if (genderFilters.length > 0) {
      filtered = filtered.filter((s) => genderFilters.includes(s.gender));
    }

    // Apply status filters
    const statusFilters = filters
      .filter(
        (f) => f.checked && (f.value === "active" || f.value === "inactive")
      )
      .map((f) => f.value);
    if (statusFilters.length > 0) {
      filtered = filtered.filter((s) => statusFilters.includes(s.status));
    }

    // Apply sorting
    if (sortBy) {
      filtered.sort((a, b) => {
        let aValue, bValue;

        switch (sortBy) {
          case "name":
            aValue = (
              a.student_name || `${a.first_name || ""} ${a.last_name || ""}`
            ).toLowerCase();
            bValue = (
              b.student_name || `${b.first_name || ""} ${b.last_name || ""}`
            ).toLowerCase();
            break;
          case "enrollment":
            aValue = (a.enrollment_id || a.student_id || "").toLowerCase();
            bValue = (b.enrollment_id || b.student_id || "").toLowerCase();
            break;
          case "course":
            aValue = (a.course_name || "").toLowerCase();
            bValue = (b.course_name || "").toLowerCase();
            break;
          case "batch":
            aValue = a.batch_number || "";
            bValue = b.batch_number || "";
            break;
          case "gender":
            aValue = (a.gender || "").toLowerCase();
            bValue = (b.gender || "").toLowerCase();
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

  const displayStudents = getFilteredAndSortedStudents();

  // Check if student has been edited
  const isStudentEdited = (studentId) => {
    return uploadChanges.some((change) => change.student_id === studentId);
  };

  // Get edited student count
  const getEditedStudentCount = () => {
    if (!uploadChanges || uploadChanges.length === 0) return 0;
    const uniqueStudents = new Set(uploadChanges.map((c) => c.student_id));
    return uniqueStudents.size;
  };

  // Handle approve center
  const handleApproveClick = () => {
    setShowApproveModal(true);
  };

  const handleApproveConfirm = async () => {
    try {
      setIsApproving(true);
      setShowApproveModal(false);
      const response = await reviewService.approveCenter(uploadId, centerId);

      showToast.success(
        response?.data?.message ||
          response?.message ||
          "Center approved successfully"
      );

      // Check if all centers are reviewed
      const allReviewed =
        response?.data?.allReviewed || response?.allReviewed || false;

      if (allReviewed) {
        showToast.success("All centers reviewed! Returning to inbox.");
        setTimeout(() => {
          navigate(ROUTES.INBOX);
        }, 2000);
      } else {
        // Return to centers list
        setTimeout(() => {
          navigate(ROUTES.REVIEW_UPLOAD.replace(":uploadId", uploadId));
        }, 1500);
      }
    } catch (error) {
      console.error("Error approving center:", error);
      showToast.error(
        error.response?.data?.message || "Failed to approve center"
      );
    } finally {
      setIsApproving(false);
    }
  };

  // Handle reject click to open modal
  const handleRejectClick = () => {
    setShowRejectModal(true);
  };

  // Handle reject center
  const handleRejectConfirm = async () => {
    if (!rejectionReason.trim() || rejectionReason.trim().length < 10) {
      showToast.error("Rejection reason must be at least 10 characters");
      return;
    }

    try {
      setIsRejecting(true);
      await reviewService.rejectCenter(
        uploadId,
        centerId,
        rejectionReason,
        rejectionRemarks
      );

      showToast.success("Center rejected successfully");
      setShowRejectModal(false);

      // Return to centers list
      setTimeout(() => {
        navigate(ROUTES.REVIEW_UPLOAD.replace(":uploadId", uploadId));
      }, 1500);
    } catch (error) {
      console.error("Error rejecting center:", error);
      showToast.error(
        error.response?.data?.message || "Failed to reject center"
      );
    } finally {
      setIsRejecting(false);
    }
  };

  // Handle back to centers
  const handleBack = () => {
    navigate(ROUTES.REVIEW_UPLOAD.replace(":uploadId", uploadId));
  };

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

  if (loading && !center) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading students...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb and Back Button */}
        <div className="flex items-center justify-between">
          <Breadcrumb items={breadcrumbItems} />
          <button
            onClick={handleBack}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ← Back to Centers
          </button>
        </div>
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  {center?.center_name}
                </h1>
                {uploadVersion > 1 && (
                  <Badge variant="secondary" className="text-sm">
                    Version {uploadVersion}
                  </Badge>
                )}
              </div>
              <div className="flex gap-6 text-sm text-gray-600">
                <div>
                  <span className="font-medium">City:</span> {center?.city}
                </div>
                <div>
                  <span className="font-medium">State:</span> {center?.state}
                </div>
                <div>
                  <span className="font-medium">Total Students:</span>{" "}
                  {center?.student_count}
                </div>
              </div>
            </div>
          </div>

          {uploadVersion > 1 && getEditedStudentCount() > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
              📝 This is a resubmission. {getEditedStudentCount()}{" "}
              {getEditedStudentCount() === 1 ? "student has" : "students have"}{" "}
              been edited by the partner. Edited rows are highlighted in yellow.
            </div>
          )}

          {isReviewed && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
              This center has already been {center?.review_status}. You cannot
              modify the review status.
            </div>
          )}
        </div>
        {/* Search Bar with Filter, Sort, and Action Buttons */}
        <SearchBar
          value={searchTerm}
          onChange={handleSearch}
          placeholder="Search students by enrollment ID, name, or email..."
          filters={filters}
          onFilterChange={handleFilterChange}
          sortOptions={[
            { label: "Name (A-Z)", value: "name" },
            { label: "Enrollment ID", value: "enrollment" },
            { label: "Course", value: "course" },
            { label: "Batch", value: "batch" },
            { label: "Gender", value: "gender" },
          ]}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          actions={
            !isReviewed
              ? [
                  {
                    label: "Reject",
                    onClick: handleRejectClick,
                    variant: "reject",
                    icon: <XCircleIcon />,
                    disabled: isApproving || isRejecting,
                  },
                  {
                    label: "Approve",
                    onClick: handleApproveClick,
                    variant: "approve",
                    icon: <CheckCircleIcon />,
                    disabled: isApproving || isRejecting,
                  },
                ]
              : []
          }
        />{" "}
        {/* Students Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading students...</div>
            </div>
          ) : displayStudents.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">
                {searchTerm
                  ? "No students found matching your search"
                  : filters.some((f) => f.checked)
                  ? "No students found matching selected filters"
                  : "No students in this center"}
              </div>
            </div>
          ) : (
            <>
              <div
                ref={scrollContainerRef}
                className="overflow-x-auto custom-scrollbar"
              >
                <table className="min-w-full divide-y divide-gray-200">
                  <thead style={{ backgroundColor: "#EFEFEF" }}>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        S.NO
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Enrollment ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Student Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Gender
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Course
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Batch
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Contact
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {displayStudents.map((student, index) => {
                      const isEdited = isStudentEdited(student.id);
                      return (
                        <tr
                          key={student.id}
                          className={`hover:bg-gray-50 ${
                            isEdited ? "bg-yellow-50" : ""
                          }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 flex items-center gap-2">
                              {(currentPage - 1) * itemsPerPage + index + 1}
                              {isEdited && (
                                <span className="text-yellow-600 text-xs">
                                  ✏️
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {student.enrollment_id || student.student_id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {student.student_name ||
                              `${student.first_name || ""} ${
                                student.last_name || ""
                              }`.trim() ||
                              "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {student.gender}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {student.course_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {student.batch_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              {student.training_status || "enrolled"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {student.email || student.mobile_number || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                totalItems={center?.student_count || 0}
                currentItemsCount={displayStudents.length}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>
        {/* Approve Modal */}
        <SuccessModal
          isOpen={showApproveModal}
          onClose={() => setShowApproveModal(false)}
          title="Approve Center"
          description="This action will move all data from this center to the main system. Do you want to proceed?"
          partnerName={center?.partner_name || ""}
          centerName={center?.center_name || ""}
          onConfirm={handleApproveConfirm}
          isLoading={isApproving}
          showCancel={true}
          buttonText="Confirm Approval"
        />
        {/* Reject Modal */}
        <RejectionModal
          isOpen={showRejectModal}
          onClose={() => {
            setShowRejectModal(false);
            setRejectionReason("");
            setRejectionRemarks("");
          }}
          title={`Reject Center: ${center?.center_name}`}
          description="Please provide a reason for rejecting this center. This will be sent to the partner for review."
          onSubmit={async ({ reason, remarks }) => {
            try {
              setIsRejecting(true);
              await reviewService.rejectCenter(
                uploadId,
                centerId,
                reason,
                remarks
              );
              showToast.success("Center rejected successfully");
              setShowRejectModal(false);
              setRejectionReason("");
              setRejectionRemarks("");
              setTimeout(() => {
                navigate(ROUTES.REVIEW_UPLOAD.replace(":uploadId", uploadId));
              }, 1500);
            } catch (error) {
              console.error("Error rejecting center:", error);
              showToast.error(
                error.response?.data?.message || "Failed to reject center"
              );
            } finally {
              setIsRejecting(false);
            }
          }}
          isLoading={isRejecting}
          reasonLabel="Reason for Rejection"
          remarksLabel="Additional Remarks"
          reasonPlaceholder="Enter the reason for rejection (minimum 10 characters)"
          remarksPlaceholder="Enter any additional remarks or comments"
          minReasonLength={10}
        />
      </div>
    </MainLayout>
  );
};

export default ReviewStudentsPage;
