import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { XCircleIcon, DocumentTextIcon, CalendarIcon, BuildingOffice2Icon, ChevronRightIcon } from "@heroicons/react/24/outline";
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
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-50 rounded-xl flex-shrink-0">
              <XCircleIcon className="h-7 w-7 text-red-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  Upload Rejected
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                  Action Required
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">File Name</p>
                  <div className="flex items-center gap-1.5">
                    <DocumentTextIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <p className="text-sm font-medium text-gray-900 truncate">{data.upload.file_name}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Upload Date</p>
                  <div className="flex items-center gap-1.5">
                    <CalendarIcon className="h-4 w-4 text-gray-400" />
                    <p className="text-sm font-medium text-gray-900">{new Date(data.upload.uploaded_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Rejected Centers</p>
                  <div className="flex items-center gap-1.5">
                    <BuildingOffice2Icon className="h-4 w-4 text-gray-400" />
                    <p className="text-sm font-medium text-red-700">{data.rejected_centers.length} {data.rejected_centers.length === 1 ? "center" : "centers"}</p>
                  </div>
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
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
              >
                {/* Center Header */}
                <div className="border-b border-gray-100 px-6 py-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-50 rounded-lg">
                        <BuildingOffice2Icon className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">
                          {center.center_name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {center.city}, {center.state} &bull; {center.student_count} students
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <div className="font-medium text-gray-600">{center.reviewed_by_name}</div>
                      <div>{new Date(center.reviewed_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
                    </div>
                  </div>
                </div>

                {/* Rejection Details */}
                <div className="p-6 space-y-4">
                  {/* Rejection Reason */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Rejection Reason
                    </label>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">
                        {center.rejection_reason}
                      </p>
                    </div>
                  </div>

                  {/* Additional Remarks */}
                  {center.rejection_remarks && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Additional Remarks
                      </label>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">
                          {center.rejection_remarks}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Action Required Notice */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-2">
                    <span className="text-amber-600 font-bold text-sm flex-shrink-0">⚠️</span>
                    <p className="text-sm text-amber-800">
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
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
          >
            ← Back to Inbox
          </button>
          <button
            onClick={() =>
              navigate(
                ROUTES.PARTNER_REVIEW_EDIT.replace(":uploadId", uploadId)
              )
            }
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
          >
            Review & Edit Data
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </MainLayout>
  );
};

export default RejectedUploadsPage;
