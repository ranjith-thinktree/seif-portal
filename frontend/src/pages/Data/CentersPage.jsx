import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MainLayout } from "../../components/layout";
import DataTable, { StatusBadge } from "../../components/common/DataTable";
import CenterForm from "../../components/forms/CenterForm";
import { SuccessModal, RejectionModal } from "../../components/common";
import Breadcrumb from "../../components/common/Breadcrumb";
import SearchBar from "../../components/common/SearchBar";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import {
  getCenters,
  createCenter,
  updateCenter,
  deleteCenter,
  approveCenter,
  rejectCenter,
  exportCenters,
  downloadCSV,
} from "../../services/data.service";

import { toast } from "react-toastify";
import { isAdminRole } from "../../utils/role";

const CentersPage = () => {
  const navigate = useNavigate();
  const { partnerId } = useParams();

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = isAdminRole(user.role);
  const canExport = ["ADMIN", "SUPER_ADMIN", "ESSCI", "PARTNER"].includes(
    user.role
  );
  const canCreate = ["ADMIN", "SUPER_ADMIN", "PARTNER"].includes(user.role);

  const [centers, setCenters] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState([
    { label: "Active", value: "active", checked: false },
    { label: "Inactive", value: "inactive", checked: false },
    ...(isAdmin
      ? [
          { label: "Pending Approval", value: "pending", checked: false },
          { label: "Approved", value: "approved", checked: false },
          { label: "Rejected", value: "rejected", checked: false },
        ]
      : []),
  ]);
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showForm, setShowForm] = useState(false);
  const [editingCenter, setEditingCenter] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch centers
  const fetchCenters = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        ...(partnerId && { partner_id: partnerId }),
      };

      const response = await getCenters(params);
      setCenters(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error("Error fetching centers:", error);
      toast.error("Failed to load centers");
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, searchTerm, partnerId]);

  useEffect(() => {
    fetchCenters();
  }, [fetchCenters]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page === 1) {
        fetchCenters();
      } else {
        setPagination((prev) => ({ ...prev, page: 1 }));
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, fetchCenters, pagination.page]);

  // Handle page change
  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  // Handle create center
  const handleCreateCenter = async (formData) => {
    setIsSubmitting(true);
    try {
      await createCenter(formData);
      toast.success("Center created successfully");
      setShowForm(false);
      fetchCenters();
    } catch (error) {
      console.error("Error creating center:", error);
      toast.error(error.response?.data?.message || "Failed to create center");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update center
  const handleUpdateCenter = async (formData) => {
    setIsSubmitting(true);
    try {
      await updateCenter(editingCenter.id, formData);
      toast.success("Center updated successfully");
      setShowForm(false);
      setEditingCenter(null);
      fetchCenters();
    } catch (error) {
      console.error("Error updating center:", error);
      toast.error(error.response?.data?.message || "Failed to update center");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete center
  const handleDeleteCenter = (centerId) => {
    const center = centers.find((c) => c.id === centerId);
    setSelectedCenter(center);
    setShowDeleteModal(true);
  };

  const confirmDeleteCenter = async () => {
    if (!selectedCenter) return;

    setIsProcessing(true);
    try {
      await deleteCenter(selectedCenter.id);
      toast.success("Center deleted successfully");
      setShowDeleteModal(false);
      setSelectedCenter(null);
      fetchCenters();
    } catch (error) {
      console.error("Error deleting center:", error);
      toast.error(error.response?.data?.message || "Failed to delete center");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle approve center
  const handleApproveCenter = (centerId) => {
    const center = centers.find((c) => c.id === centerId);
    setSelectedCenter(center);
    setShowApproveModal(true);
  };

  const confirmApproveCenter = async () => {
    if (!selectedCenter) return;

    setIsProcessing(true);
    try {
      await approveCenter(selectedCenter.id);
      toast.success("Center approved successfully");
      setShowApproveModal(false);
      setSelectedCenter(null);
      fetchCenters();
    } catch (error) {
      console.error("Error approving center:", error);
      toast.error(error.response?.data?.message || "Failed to approve center");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle reject center
  const handleRejectCenter = (centerId) => {
    const center = centers.find((c) => c.id === centerId);
    setSelectedCenter(center);
    setShowRejectModal(true);
  };

  const confirmRejectCenter = async ({ reason, remarks }) => {
    if (!selectedCenter) return;

    setIsProcessing(true);
    try {
      await rejectCenter(selectedCenter.id, reason);
      toast.success("Center rejected successfully");
      setShowRejectModal(false);
      setSelectedCenter(null);
      fetchCenters();
    } catch (error) {
      console.error("Error rejecting center:", error);
      toast.error(error.response?.data?.message || "Failed to reject center");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle filter change
  const handleFilterChange = (value, checked) => {
    setFilters((prev) =>
      prev.map((f) => (f.value === value ? { ...f, checked } : f))
    );
  };

  // Handle sort change
  const handleSortChange = (sortByValue, sortOrderValue) => {
    setSortBy(sortByValue);
    setSortOrder(sortOrderValue);
  };

  // Handle export
  const handleExport = async () => {
    try {
      const blob = await exportCenters({
        search: searchTerm,
        ...(partnerId && { partner_id: partnerId }),
      });
      downloadCSV(blob, `centers_${new Date().getTime()}.csv`);
      toast.success("Centers exported successfully");
    } catch (error) {
      console.error("Error exporting centers:", error);
      toast.error("Failed to export centers");
    }
  };

  // Handle row click - navigate to center's students
  const handleRowClick = (center) => {
    navigate(`/data/centers/${center.id}/students`);
  };

  // Handle back navigation
  const handleBack = () => {
    navigate("/data/partners");
  };

  // Breadcrumb items
  const breadcrumbItems = [
    { label: "Partners", path: "/data/partners" },
    { label: "Centers" },
  ];

  // Handle edit click
  const handleEditClick = (e, center) => {
    e.stopPropagation();
    setEditingCenter(center);
    setShowForm(true);
  };

  // Table columns
  const columns = [
    {
      header: "Center Name",
      accessor: "center_name",
      width: "20%",
    },
    {
      header: "Type",
      accessor: "center_type",
      render: (row) => (
        <Badge variant="outline" className="text-xs">
          {row.center_type}
        </Badge>
      ),
    },
    {
      header: "Batches",
      accessor: "total_batches",
      render: (row) => (
        <Badge variant="outline">{row.total_batches || 0}</Badge>
      ),
    },
    {
      header: "Total Students",
      accessor: "total_students",
      render: (row) => (
        <Badge variant="outline">{row.total_students || 0}</Badge>
      ),
    },
    {
      header: "Male",
      accessor: "total_male_students",
      render: (row) => (
        <Badge variant="outline">{row.total_male_students || 0}</Badge>
      ),
    },
    {
      header: "Female",
      accessor: "total_female_students",
      render: (row) => (
        <Badge variant="outline">{row.total_female_students || 0}</Badge>
      ),
    },
    {
      header: "Status",
      accessor: "status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    ...(isAdmin
      ? [
          {
            header: "Approval",
            accessor: "approval_status",
            render: (row) => <StatusBadge status={row.approval_status} />,
          },
        ]
      : []),
    {
      header: "Actions",
      accessor: "actions",
      width: "12%",
      render: (row) => (
        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {isAdmin && row.approval_status === "pending" && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleApproveCenter(row.id);
                }}
                className="text-green-600 hover:text-green-800"
                title="Approve"
              >
                <CheckIcon className="h-5 w-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRejectCenter(row.id);
                }}
                className="text-red-600 hover:text-red-800"
                title="Reject"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </>
          )}
          {(isAdmin || user.role === "PARTNER") && (
            <button
              onClick={(e) => handleEditClick(e, row)}
              className="text-blue-600 hover:text-blue-800"
              title="Edit"
            >
              <PencilIcon className="h-5 w-5" />
            </button>
          )}
          {isAdmin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteCenter(row.id);
              }}
              className="text-red-600 hover:text-red-800"
              title="Delete"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb with Back Button */}
        {partnerId && (
          <div className="flex items-center justify-between">
            <Breadcrumb items={breadcrumbItems} />
            <Button variant="outline" onClick={handleBack} className="gap-2">
              <ArrowLeftIcon className="h-4 w-4" />
              Back to Partners
            </Button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {partnerId ? "Partner Centers" : "Centers"}
            </h1>
            <p className="text-gray-600 mt-1">
              {partnerId
                ? "View and manage centers for this partner"
                : "Manage and view all training centers"}
            </p>
          </div>{" "}
          {canCreate && !showForm && (
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <PlusIcon className="h-5 w-5" />
              Create Center
            </Button>
          )}
        </div>

        {/* Form */}
        {showForm && (
          <CenterForm
            center={editingCenter}
            onSubmit={editingCenter ? handleUpdateCenter : handleCreateCenter}
            onCancel={() => {
              setShowForm(false);
              setEditingCenter(null);
            }}
            isLoading={isSubmitting}
            preselectedPartnerId={partnerId}
          />
        )}

        {/* Search with Filters and Sort */}
        {!showForm && (
          <div>
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search centers by name, city, state..."
              filters={filters}
              onFilterChange={handleFilterChange}
              sortOptions={[
                { label: "Center Name (A-Z)", value: "name" },
                { label: "Partner Name", value: "partner" },
                { label: "City (A-Z)", value: "city" },
                { label: "State (A-Z)", value: "state" },
                { label: "Total Batches", value: "batches" },
                { label: "Status", value: "status" },
              ]}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={handleSortChange}
            />
          </div>
        )}

        {/* Table */}
        {!showForm && (
          <DataTable
            columns={columns}
            data={centers}
            pagination={pagination}
            onPageChange={handlePageChange}
            onExport={canExport ? handleExport : null}
            onRowClick={handleRowClick}
            isLoading={isLoading}
            emptyMessage="No centers found"
            showExport={canExport}
          />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <RejectionModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedCenter(null);
        }}
        title={`Delete Center: ${selectedCenter?.center_name || ""}`}
        description="Are you sure you want to delete this center? This action cannot be undone."
        onSubmit={async () => {
          await confirmDeleteCenter();
        }}
        isLoading={isProcessing}
        reasonLabel="Reason for Deletion"
        remarksLabel="Additional Notes"
        reasonPlaceholder="Please provide a reason for deleting this center..."
        remarksPlaceholder="Any additional notes..."
        minReasonLength={10}
      />

      {/* Approve Confirmation Modal */}
      <SuccessModal
        isOpen={showApproveModal}
        onClose={() => {
          setShowApproveModal(false);
          setSelectedCenter(null);
        }}
        title="Approve Center"
        description="Are you sure you want to approve this center? It will be activated in the system."
        partnerName={selectedCenter?.partner_name || ""}
        centerName={selectedCenter?.center_name || ""}
        onConfirm={confirmApproveCenter}
        isLoading={isProcessing}
        showCancel={true}
        buttonText="Confirm Approval"
      />

      {/* Reject Modal */}
      <RejectionModal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setSelectedCenter(null);
        }}
        title={`Reject Center: ${selectedCenter?.center_name || ""}`}
        description="Please provide a reason for rejecting this center. This will be sent to the partner for review."
        onSubmit={confirmRejectCenter}
        isLoading={isProcessing}
        reasonLabel="Reason for Rejection"
        remarksLabel="Additional Remarks"
        reasonPlaceholder="Enter the reason for rejection (10-500 characters)"
        remarksPlaceholder="Any additional comments..."
        minReasonLength={10}
      />
    </MainLayout>
  );
};

export default CentersPage;
