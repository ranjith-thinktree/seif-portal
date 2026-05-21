import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "../../components/layout";
import Breadcrumb from "../../components/common/Breadcrumb";
import { Badge } from "../../components/ui/badge";
import {
  PencilIcon,
  BuildingOfficeIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import apiClient from "../../api/client";
import { toast } from "react-toastify";
import { ROUTES } from "../../constants/routes";

const PartnerRejectedEmploymentCentersPage = () => {
  const { uploadId } = useParams();
  const navigate = useNavigate();

  const [upload, setUpload] = useState(null);
  const [centers, setCenters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const breadcrumbItems = [
    { label: "Inbox", path: ROUTES.INBOX },
    {
      label: "Rejected Employment Uploads",
      path: ROUTES.PARTNER_REJECTED_EMPLOYMENT_UPLOADS,
    },
    { label: "Centers", path: "#" },
  ];

  useEffect(() => {
    const fetchCenters = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get(
          `/employment/partner/uploads/${uploadId}/centers`,
        );
        setUpload(response.data.data.upload);
        setCenters(response.data.data.centers || []);
      } catch (error) {
        toast.error("Failed to load employment centers");
        navigate(ROUTES.PARTNER_REJECTED_EMPLOYMENT_UPLOADS);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCenters();
  }, [uploadId, navigate]);

  const filteredCenters = centers.filter(
    (c) =>
      !searchTerm ||
      c.center_name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleCenterClick = (center) => {
    navigate(
      ROUTES.PARTNER_REVIEW_EMPLOYMENT.replace(":uploadId", uploadId).replace(
        ":centerId",
        center.center_id,
      ),
    );
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64 text-gray-500">
          Loading centers...
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Breadcrumb items={breadcrumbItems} />
          <button
            onClick={() => navigate(ROUTES.PARTNER_REJECTED_EMPLOYMENT_UPLOADS)}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            ← Back
          </button>
        </div>

        {/* Upload info header */}
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-xl font-bold text-gray-900 mb-3">
            Review Upload — {upload?.file_name}
          </h1>
          <div className="flex flex-wrap gap-6 text-sm text-gray-600">
            <div>
              <span className="font-medium">Upload Date:</span>{" "}
              {upload?.created_at &&
                new Date(upload.created_at).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
            </div>
            <div>
              <span className="font-medium">Total Records:</span>{" "}
              {upload?.total_records || 0}
            </div>
            <div>
              <span className="font-medium">Version:</span>{" "}
              <Badge variant={upload?.version > 1 ? "secondary" : "outline"}>
                V{upload?.version || 1}
              </Badge>
            </div>
          </div>
          {upload?.rejection_reason && (
            <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">
                  Rejection Reason
                </p>
                <p className="text-sm text-red-600 mt-0.5">
                  {upload.rejection_reason}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          ℹ️ Click on a center to view and edit the employment records for that
          center. Once you've corrected all issues, go back and resubmit the
          upload.
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow p-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search centers by name..."
            className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>

        {/* Centers grid */}
        {filteredCenters.length === 0 ? (
          <div className="bg-white rounded-lg shadow flex items-center justify-center h-48 text-gray-500">
            {searchTerm ? "No centers match your search" : "No centers found"}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCenters.map((center) => (
              <div
                key={center.center_id}
                onClick={() => handleCenterClick(center)}
                className="bg-white rounded-xl shadow hover:shadow-md border border-gray-100 hover:border-primary-300 p-5 cursor-pointer transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BuildingOfficeIcon className="h-5 w-5 text-primary-500" />
                    <h3 className="font-semibold text-gray-900 text-sm">
                      {center.center_name}
                    </h3>
                  </div>
                  <PencilIcon className="h-4 w-4 text-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>
                    <span className="font-medium">Total Records:</span>{" "}
                    {center.record_count}
                  </div>
                  <div>
                    <span className="font-medium">Employed:</span>{" "}
                    <span className="text-green-600">
                      {center.employed_count}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">NA:</span>{" "}
                    <span className="text-gray-500">{center.na_count}</span>
                  </div>
                  {center.edited_count > 0 && (
                    <div>
                      <span className="font-medium">Edited:</span>{" "}
                      <span className="text-blue-600">
                        {center.edited_count}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default PartnerRejectedEmploymentCentersPage;
