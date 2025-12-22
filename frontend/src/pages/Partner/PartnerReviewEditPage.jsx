import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { MainLayout } from "../../components/layout";
import Breadcrumb from "../../components/common/Breadcrumb";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import EditableStudentGrid from "../../components/EditableStudentGrid";
import reviewService from "../../services/review.service";
import partnerService from "../../services/partner.service";
import { showToast } from "../../utils/toast.util";
import { ROUTES } from "../../constants/routes";

/**
 * PartnerReviewEditPage Component
 * Partner view to review upload data and edit rejected centers before resubmission
 */
const PartnerReviewEditPage = () => {
  const { uploadId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [students, setStudents] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Breadcrumb items
  const breadcrumbItems = [
    { label: "Inbox", path: ROUTES.INBOX },
    { label: "Review & Edit Upload", path: "#" },
  ];

  // Status colors
  const statusColors = {
    approved: {
      bg: "bg-green-100",
      text: "text-green-700",
      border: "border-green-200",
    },
    rejected: {
      bg: "bg-red-100",
      text: "text-red-700",
      border: "border-red-200",
    },
    pending: {
      bg: "bg-orange-100",
      text: "text-orange-700",
      border: "border-orange-200",
    },
    partial_approved: {
      bg: "bg-amber-100",
      text: "text-amber-700",
      border: "border-amber-200",
    },
  };

  // Fetch upload data with all centers
  useEffect(() => {
    const fetchUploadData = async () => {
      try {
        setLoading(true);
        const response = await reviewService.getUploadForPartnerReview(
          uploadId
        );
        setData(response.data);

        // Auto-select first rejected center if exists
        if (response.data.centers && response.data.centers.length > 0) {
          const firstRejected = response.data.centers.find(
            (c) => c.review_status === "rejected"
          );
          const firstCenter = firstRejected || response.data.centers[0];
          setSelectedCenter(firstCenter);
        }
      } catch (error) {
        console.error("Error fetching upload data:", error);
        showToast.error("Failed to load upload data");
        navigate(ROUTES.INBOX);
      } finally {
        setLoading(false);
      }
    };

    fetchUploadData();
  }, [uploadId, navigate]);

  // Fetch students when center is selected
  useEffect(() => {
    if (!selectedCenter) return;

    const fetchStudents = async () => {
      try {
        const response = await reviewService.getCenterStudents(
          uploadId,
          selectedCenter.id
        );
        setStudents(response.data.students || []);
      } catch (error) {
        console.error("Error fetching students:", error);
        showToast.error("Failed to load students");
      }
    };

    fetchStudents();
  }, [uploadId, selectedCenter]);

  // Handle save changes from EditableStudentGrid
  const handleSaveChanges = async (updatedStudents, changes) => {
    try {
      // Save edited data to backend
      await partnerService.saveEditedStudents(uploadId, selectedCenter.id, {
        students: updatedStudents,
        changes: changes,
      });

      showToast.success("Changes saved successfully");

      // Refresh students data
      const response = await reviewService.getCenterStudents(
        uploadId,
        selectedCenter.id
      );
      setStudents(response.data.students || []);
    } catch (error) {
      console.error("Error saving changes:", error);
      throw error; // Let EditableStudentGrid handle the error toast
    }
  };

  // Handle resubmit from EditableStudentGrid
  const handleResubmit = async () => {
    setSubmitting(true);
    try {
      await partnerService.resubmitUpload(uploadId);
      showToast.success("Data resubmitted successfully! New version created.");
      navigate(ROUTES.UPLOAD_HISTORY);
    } catch (error) {
      console.error("Error resubmitting data:", error);
      showToast.error(
        error.response?.data?.message || "Failed to resubmit data"
      );
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading upload data...</div>
        </div>
      </MainLayout>
    );
  }

  if (!data) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-4">
              Upload not found or unauthorized
            </p>
            <Button onClick={() => navigate(ROUTES.INBOX)}>
              Back to Inbox
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const rejectedCenters =
    data.centers?.filter((c) => c.review_status === "rejected") || [];
  const hasRejections = rejectedCenters.length > 0;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbItems} />

        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Review & Edit Upload Data
              </h1>
              <div className="text-sm text-gray-600 space-y-1">
                <div>
                  <span className="font-medium">File:</span>{" "}
                  {data.upload.file_name}
                </div>
                <div>
                  <span className="font-medium">Upload Date:</span>{" "}
                  {new Date(data.upload.uploaded_at).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Total Centers:</span>{" "}
                  {data.centers?.length || 0}
                </div>
              </div>
            </div>
            {hasRejections && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-red-700">
                  <ExclamationTriangleIcon className="h-5 w-5" />
                  <span className="font-semibold">
                    {rejectedCenters.length} Rejected Centers
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Centers List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Centers</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.centers?.map((center) => {
                const status = center.review_status || "pending";
                const colors = statusColors[status] || statusColors.pending;
                const isSelected = selectedCenter?.id === center.id;
                const isRejected = status === "rejected";

                return (
                  <button
                    key={center.id}
                    onClick={() => setSelectedCenter(center)}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : isRejected
                        ? "border-red-300 bg-red-50 hover:bg-red-100"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 flex-1">
                        {center.center_name}
                      </h3>
                      <Badge
                        variant="outline"
                        className={`${colors.bg} ${colors.text} ${colors.border} text-xs ml-2`}
                      >
                        {status.toUpperCase().replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      {center.city}, {center.state}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {center.student_count || 0} students
                    </p>
                    {isRejected && center.rejection_reason && (
                      <div className="mt-2 pt-2 border-t border-red-200">
                        <p className="text-xs text-red-700 line-clamp-2">
                          <span className="font-semibold">Reason:</span>{" "}
                          {center.rejection_reason}
                        </p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Students Table */}
        {selectedCenter && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Students - {selectedCenter.center_name}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {students.length} students • Edit data and click "Save Changes"
                or "Resubmit"
              </p>
              {selectedCenter.review_status === "rejected" &&
                selectedCenter.rejection_reason && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-sm text-red-700">
                      <strong>Rejection Reason:</strong>{" "}
                      {selectedCenter.rejection_reason}
                    </p>
                  </div>
                )}
            </div>
            <div className="p-4">
              <EditableStudentGrid
                students={students}
                onSave={handleSaveChanges}
                onResubmit={handleResubmit}
                readOnly={false}
                showResubmit={data?.centers?.some(
                  (c) => c.review_status === "rejected"
                )}
                uploadId={uploadId}
              />
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className="flex justify-start">
          <Button variant="outline" onClick={() => navigate(ROUTES.INBOX)}>
            ← Back to Inbox
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default PartnerReviewEditPage;
