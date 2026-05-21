import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { MainLayout } from "../../components/layout";
import Breadcrumb from "../../components/common/Breadcrumb";
import SearchBar from "../../components/common/SearchBar";
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
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import {
  getUploadCenterSummary,
  approveEmploymentUpload,
  rejectEmploymentUpload,
} from "../../services/employment.service";

const AdminEmploymentCentersPage = () => {
  const { uploadId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const upload = location.state?.upload || null;

  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");

  const breadcrumbItems = [
    { label: "Dashboard", path: ROUTES.DASHBOARD },
    { label: "Employment Review", path: ROUTES.EMPLOYMENT_REVIEW },
    { label: upload?.partner_name || "Upload Details", path: "#" },
  ];

  const loadCenters = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getUploadCenterSummary(uploadId);
      setCenters(res.data || []);
    } catch {
      showToast.error("Failed to load centers");
    } finally {
      setLoading(false);
    }
  }, [uploadId]);

  useEffect(() => {
    loadCenters();
  }, [loadCenters]);

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

  const handleApprove = async () => {
    setProcessing(true);
    try {
      await approveEmploymentUpload(uploadId);
      showToast.success("Employment upload approved successfully");
      setShowApproveModal(false);
      navigate(ROUTES.EMPLOYMENT_REVIEW);
    } catch (err) {
      showToast.error(
        err?.response?.data?.message || "Failed to approve upload",
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async ({ reason, remarks }) => {
    setProcessing(true);
    try {
      await rejectEmploymentUpload(uploadId, reason, remarks);
      showToast.success("Employment upload rejected");
      setShowRejectModal(false);
      navigate(ROUTES.EMPLOYMENT_REVIEW);
    } catch (err) {
      showToast.error(
        err?.response?.data?.message || "Failed to reject upload",
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleCenterClick = (center) => {
    navigate(
      ROUTES.EMPLOYMENT_REVIEW_RECORDS.replace(":uploadId", uploadId).replace(
        ":centerId",
        center.center_id,
      ),
      { state: { upload, center } },
    );
  };

  // Aggregate stats from centers
  const totalRecords = centers.reduce(
    (sum, c) => sum + (c.record_count || 0),
    0,
  );
  const totalEmployed = centers.reduce(
    (sum, c) => sum + (c.employed_count || 0),
    0,
  );

  const filteredCenters = centers
    .filter((c) => {
      if (!searchTerm) return true;
      return c.center_name?.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => {
      if (!sortBy) return 0;
      let aVal, bVal;
      if (sortBy === "name") {
        aVal = a.center_name?.toLowerCase() || "";
        bVal = b.center_name?.toLowerCase() || "";
      } else if (sortBy === "records") {
        aVal = a.record_count || 0;
        bVal = b.record_count || 0;
      } else if (sortBy === "employed") {
        aVal = a.employed_count || 0;
        bVal = b.employed_count || 0;
      }
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

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

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbItems} />

        {/* Header Card - matches ReviewCentersPage style */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className="p-2.5 bg-blue-50 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Review Employment Upload
                  </h1>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {upload?.partner_name}
                  </p>
                </div>
                {upload?.review_status === "pending_review" && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setShowApproveModal(true)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                      Approve Upload
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                    >
                      <XCircleIcon className="h-4 w-4" />
                      Reject Upload
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                Uploaded By
              </p>
              <p className="text-sm font-medium text-gray-900">
                {upload?.uploaded_by_name || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                Upload Date
              </p>
              <p className="text-sm font-medium text-gray-900">
                {formatDate(upload?.created_at)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                File
              </p>
              <p className="text-sm font-medium text-gray-900 truncate">
                {upload?.file_name || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                Status
              </p>
              {getStatusBadge(upload?.review_status)}
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
                {centers.length}
              </p>
              <p className="text-xs text-gray-500">Total Centers</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
            <div className="p-2 bg-gray-50 rounded-lg">
              <UserGroupIcon className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalRecords}</p>
              <p className="text-xs text-gray-500">Total Records</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">
                {totalEmployed}
              </p>
              <p className="text-xs text-gray-500">Employed</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <ClockIcon className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-700">
                {totalRecords - totalEmployed}
              </p>
              <p className="text-xs text-gray-500">Other Status</p>
            </div>
          </div>
        </div>

        {/* Search Bar - matches ReviewCentersPage */}
        <SearchBar
          value={searchTerm}
          onChange={(val) => setSearchTerm(val)}
          placeholder="Search centers by name..."
          filters={[]}
          sortOptions={[
            { label: "Name (A-Z)", value: "name" },
            { label: "Record Count", value: "records" },
            { label: "Employed Count", value: "employed" },
          ]}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={(by, order) => {
            setSortBy(by);
            setSortOrder(order);
          }}
        />

        {/* Centers Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading centers...</div>
            </div>
          ) : filteredCenters.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">
                {searchTerm
                  ? "No centers found matching your search"
                  : "No centers found in this upload"}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-16 px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      S.NO
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Center Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Total Records
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Employed
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCenters.map((center, index) => (
                    <tr
                      key={center.center_id}
                      onClick={() => handleCenterClick(center)}
                      className="hover:bg-blue-50 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <span>{center.center_name || "Unknown Center"}</span>
                          <ChevronRightIcon className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {center.record_count || 0}
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {center.employed_count || 0} employed
                        </span>
                      </td>
                      <td
                        className="px-4 py-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleCenterClick(center)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-50 text-primary-700 text-sm font-medium rounded-lg hover:bg-primary-100 border border-primary-200 transition-colors"
                        >
                          View Records
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

        {/* Approve modal */}
        <SuccessModal
          isOpen={showApproveModal}
          onClose={() => setShowApproveModal(false)}
          title="Approve Employment Upload"
          description={`Approve all ${totalRecords} employment records from ${upload?.partner_name}? Records will become visible in the Employment Data tab.`}
          onConfirm={handleApprove}
          isLoading={processing}
          buttonText="Approve Upload"
          showCancel
        />

        {/* Reject modal */}
        <RejectionModal
          isOpen={showRejectModal}
          onClose={() => setShowRejectModal(false)}
          title="Reject Employment Upload"
          description={`Reject the employment upload from ${upload?.partner_name}? The partner will be notified with your reason.`}
          onSubmit={handleReject}
          isLoading={processing}
          reasonLabel="Reason for Rejection"
          remarksLabel="Additional Remarks (optional)"
          reasonPlaceholder="Explain why this upload is being rejected..."
        />
      </div>
    </MainLayout>
  );
};

export default AdminEmploymentCentersPage;
