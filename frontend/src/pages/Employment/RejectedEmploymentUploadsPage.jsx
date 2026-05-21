import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "../../components/layout";
import Breadcrumb from "../../components/common/Breadcrumb";
import Pagination from "../../components/common/Pagination";
import { Badge } from "../../components/ui/badge";
import {
  PencilIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import apiClient from "../../api/client";
import { toast } from "react-toastify";
import { ROUTES } from "../../constants/routes";

const RejectedEmploymentUploadsPage = () => {
  const navigate = useNavigate();

  const [uploads, setUploads] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const breadcrumbItems = [
    { label: "Inbox", path: ROUTES.INBOX },
    { label: "Rejected Employment Uploads", path: "#" },
  ];

  const fetchRejectedUploads = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
      };
      const response = await apiClient.get(
        "/employment/partner/rejected-uploads",
        { params },
      );
      setUploads(response.data.data.data || []);
      setPagination((prev) => ({ ...prev, ...response.data.data.pagination }));
    } catch (error) {
      toast.error("Failed to load rejected employment uploads");
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, searchTerm]);

  useEffect(() => {
    fetchRejectedUploads();
  }, [fetchRejectedUploads]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (pagination.page === 1) fetchRejectedUploads();
      else setPagination((p) => ({ ...p, page: 1 }));
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const handleRowClick = (upload) => {
    navigate(
      ROUTES.PARTNER_REJECTED_EMPLOYMENT_CENTERS.replace(
        ":uploadId",
        upload.id,
      ),
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <Breadcrumb items={breadcrumbItems} />

        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-2">
            <ExclamationTriangleIcon className="h-7 w-7 text-red-500" />
            Rejected Employment Uploads
          </h1>
          <p className="text-gray-600">
            Review and edit rejected employment data to resubmit for approval
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex gap-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold">Action Required</p>
              <p className="mt-1">
                These employment uploads have been rejected by admin. Click on
                any row to review the rejection reason, correct the data, and
                resubmit for approval.
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow p-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by upload ID or file name..."
            className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              Loading rejected uploads...
            </div>
          ) : uploads.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              {searchTerm
                ? "No uploads found matching your search"
                : "No rejected employment uploads found"}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead style={{ backgroundColor: "#EFEFEF" }}>
                    <tr>
                      {[
                        "S.NO",
                        "Upload ID",
                        "File Name",
                        "Upload Date",
                        "Records",
                        "Rejection Reason",
                        "Version",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {uploads.map((upload, index) => (
                      <tr
                        key={upload.id}
                        onClick={() => handleRowClick(upload)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(pagination.page - 1) * pagination.limit + index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-600">
                          {upload.id.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {upload.file_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(upload.created_at).toLocaleDateString(
                            "en-US",
                            { year: "numeric", month: "short", day: "numeric" },
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className="bg-red-100 text-red-800 font-semibold">
                            {upload.total_records || 0}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-red-600 max-w-xs">
                          <p
                            className="truncate"
                            title={upload.rejection_reason}
                          >
                            {upload.rejection_reason || "—"}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            variant={
                              upload.version > 1 ? "secondary" : "outline"
                            }
                          >
                            V{upload.version || 1}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(upload);
                            }}
                            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
                          >
                            <PencilIcon className="h-4 w-4" />
                            Edit & Resubmit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                itemsPerPage={pagination.limit}
                totalItems={pagination.total}
                currentItemsCount={uploads.length}
                onPageChange={(p) =>
                  setPagination((prev) => ({ ...prev, page: p }))
                }
              />
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default RejectedEmploymentUploadsPage;
