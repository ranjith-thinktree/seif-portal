import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { XCircleIcon } from "@heroicons/react/24/outline";
import reviewService from "../../services/review.service";
import Breadcrumb from "../../components/common/Breadcrumb";
import { showToast } from "../../utils/toast.util";
import { ROUTES } from "../../constants/routes";
import { MainLayout } from "../../components/layout";

/**
 * RejectedUploadsPage Component
 * Partner view to see rejected centers and reasons
 */
const RejectedUploadsPage = () => {
  const { uploadId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Breadcrumb items
  const breadcrumbItems = [
    { label: "Inbox", path: ROUTES.INBOX },
    { label: "Rejected Upload", path: "#" },
  ];

  // Fetch rejected centers
  useEffect(() => {
    const fetchRejectedCenters = async () => {
      try {
        setLoading(true);
        const response = await reviewService.getRejectedCenters(uploadId);
        setData(response.data);
      } catch (error) {
        console.error("Error fetching rejected centers:", error);
        showToast.error("Failed to load rejected centers");
        navigate(ROUTES.INBOX);
      } finally {
        setLoading(false);
      }
    };

    fetchRejectedCenters();
  }, [uploadId, navigate]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading rejected centers...</div>
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
            <button
              onClick={() => navigate(ROUTES.INBOX)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Inbox
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbItems} />

        {/* Header */}
        <div className="bg-red-50 border border-red-200 rounded-lg shadow p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <XCircleIcon className="h-10 w-10 text-red-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-red-900 mb-2">
                Upload Rejected
              </h1>
              <div className="text-sm text-red-800 space-y-1">
                <div>
                  <span className="font-medium">File:</span>{" "}
                  {data.upload.file_name}
                </div>
                <div>
                  <span className="font-medium">Upload Date:</span>{" "}
                  {new Date(data.upload.uploaded_at).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Rejected Centers:</span>{" "}
                  {data.rejected_centers.length}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rejected Centers */}
        {data.rejected_centers.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">No rejected centers in this upload.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.rejected_centers.map((center) => (
              <div
                key={center.id}
                className="bg-white rounded-lg shadow overflow-hidden"
              >
                {/* Center Header */}
                <div className="bg-red-50 border-b border-red-200 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {center.center_name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {center.city}, {center.state} • {center.student_count}{" "}
                        students
                      </p>
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Reviewed by:</span>{" "}
                        {center.reviewed_by_name}
                      </div>
                      <div>
                        <span className="font-medium">Date:</span>{" "}
                        {new Date(center.reviewed_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rejection Details */}
                <div className="p-6 space-y-4">
                  {/* Rejection Reason */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rejection Reason
                    </label>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-gray-900 whitespace-pre-wrap">
                        {center.rejection_reason}
                      </p>
                    </div>
                  </div>

                  {/* Additional Remarks */}
                  {center.rejection_remarks && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Additional Remarks
                      </label>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {center.rejection_remarks}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Action Required Notice */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-900">
                      <span className="font-semibold">Action Required:</span>{" "}
                      Please review the rejection reason and correct the data
                      for this center before re-uploading.
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigate(ROUTES.INBOX)}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ← Back to Inbox
          </button>
          <button
            onClick={() =>
              navigate(
                ROUTES.PARTNER_REVIEW_EDIT.replace(":uploadId", uploadId)
              )
            }
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Review & Edit Data
          </button>
        </div>
      </div>
    </MainLayout>
  );
};

export default RejectedUploadsPage;
