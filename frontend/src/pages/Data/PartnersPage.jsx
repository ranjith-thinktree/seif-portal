import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "../../components/layout";
import DataTable, { StatusBadge } from "../../components/common/DataTable";
import PartnerForm from "../../components/forms/PartnerForm";
import { SuccessModal, RejectionModal } from "../../components/common";
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
} from "@heroicons/react/24/outline";
import {
  getPartners,
  createPartner,
  updatePartner,
  deletePartner,
  approvePartner,
  rejectPartner,
  exportPartners,
  downloadCSV,
} from "../../services/data.service";
import { toast } from "react-toastify";
import { isAdminRole } from "../../utils/role";

const PartnersPage = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = isAdminRole(user.role);
  const canExport = ["ADMIN", "SUPER_ADMIN", "ESSCI"].includes(user.role);

  const [partners, setPartners] = useState([]);
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
  const [editingPartner, setEditingPartner] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch partners
  const fetchPartners = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
      };

      const response = await getPartners(params);
      setPartners(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error("Error fetching partners:", error);
      toast.error("Failed to load partners");
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, searchTerm]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page === 1) {
        fetchPartners();
      } else {
        setPagination((prev) => ({ ...prev, page: 1 }));
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, fetchPartners, pagination.page]);

  // Handle page change
  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  // Handle create partner
  const handleCreatePartner = async (formData) => {
    setIsSubmitting(true);
    try {
      await createPartner(formData);
      toast.success("Partner created successfully");
      setShowForm(false);
      fetchPartners();
    } catch (error) {
      console.error("Error creating partner:", error);
      toast.error(error.response?.data?.message || "Failed to create partner");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update partner
  const handleUpdatePartner = async (formData) => {
    setIsSubmitting(true);
    try {
      await updatePartner(editingPartner.id, formData);
      toast.success("Partner updated successfully");
      setShowForm(false);
      setEditingPartner(null);
      fetchPartners();
    } catch (error) {
      console.error("Error updating partner:", error);
      toast.error(error.response?.data?.message || "Failed to update partner");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete partner
  const handleDeletePartner = (partnerId) => {
    const partner = partners.find((p) => p.id === partnerId);
    setSelectedPartner(partner);
    setShowDeleteModal(true);
  };

  const confirmDeletePartner = async () => {
    if (!selectedPartner) return;

    setIsProcessing(true);
    try {
      await deletePartner(selectedPartner.id);
      toast.success("Partner deleted successfully");
      setShowDeleteModal(false);
      setSelectedPartner(null);
      fetchPartners();
    } catch (error) {
      console.error("Error deleting partner:", error);
      toast.error(error.response?.data?.message || "Failed to delete partner");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle approve partner
  const handleApprovePartner = (partnerId) => {
    const partner = partners.find((p) => p.id === partnerId);
    setSelectedPartner(partner);
    setShowApproveModal(true);
  };

  const confirmApprovePartner = async () => {
    if (!selectedPartner) return;

    setIsProcessing(true);
    try {
      await approvePartner(selectedPartner.id);
      toast.success("Partner approved successfully");
      setShowApproveModal(false);
      setSelectedPartner(null);
      fetchPartners();
    } catch (error) {
      console.error("Error approving partner:", error);
      toast.error(error.response?.data?.message || "Failed to approve partner");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle reject partner
  const handleRejectPartner = (partnerId) => {
    const partner = partners.find((p) => p.id === partnerId);
    setSelectedPartner(partner);
    setShowRejectModal(true);
  };

  const confirmRejectPartner = async ({ reason }) => {
    if (!selectedPartner) return;

    setIsProcessing(true);
    try {
      await rejectPartner(selectedPartner.id, reason);
      toast.success("Partner rejected successfully");
      setShowRejectModal(false);
      setSelectedPartner(null);
      fetchPartners();
    } catch (error) {
      console.error("Error rejecting partner:", error);
      toast.error(error.response?.data?.message || "Failed to reject partner");
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
      const blob = await exportPartners({
        search: searchTerm,
      });
      downloadCSV(blob, `partners_${new Date().getTime()}.csv`);
      toast.success("Partners exported successfully");
    } catch (error) {
      console.error("Error exporting partners:", error);
      toast.error("Failed to export partners");
    }
  };

  // Handle row click - navigate to partner's centers
  const handleRowClick = (partner) => {
    navigate(`/data/partners/${partner.id}/centers`);
  };

  // Handle edit click
  const handleEditClick = (e, partner) => {
    e.stopPropagation();
    setEditingPartner(partner);
    setShowForm(true);
  };

  // Table columns
  const columns = [
    {
      header: "Partner Name",
      accessor: "name",
      width: "20%",
    },
    {
      header: "Centers",
      accessor: "total_centers",
      render: (row) => (
        <Badge variant="outline">{row.total_centers || 0}</Badge>
      ),
    },
    {
      header: "Students",
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
    ...(isAdmin
      ? [
          {
            header: "Actions",
            accessor: "actions",
            width: "15%",
            render: (row) => (
              <div
                className="flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                {row.approval_status === "pending" && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApprovePartner(row.id);
                      }}
                      className="text-green-600 hover:text-green-800"
                      title="Approve"
                    >
                      <CheckIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRejectPartner(row.id);
                      }}
                      className="text-red-600 hover:text-red-800"
                      title="Reject"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </>
                )}
                <button
                  onClick={(e) => handleEditClick(e, row)}
                  className="text-blue-600 hover:text-blue-800"
                  title="Edit"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePartner(row.id);
                  }}
                  className="text-red-600 hover:text-red-800"
                  title="Delete"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Partners</h1>
            <p className="text-gray-600 mt-1">
              Manage and view all partner organizations
            </p>
          </div>
          {isAdmin && !showForm && (
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <PlusIcon className="h-5 w-5" />
              Create Partner
            </Button>
          )}
        </div>

        {/* Form */}
        {showForm && (
          <PartnerForm
            partner={editingPartner}
            onSubmit={
              editingPartner ? handleUpdatePartner : handleCreatePartner
            }
            onCancel={() => {
              setShowForm(false);
              setEditingPartner(null);
            }}
            isLoading={isSubmitting}
          />
        )}

        {/* Search with Filters and Sort */}
        {!showForm && (
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search partners by name, email, or phone..."
            filters={filters}
            onFilterChange={handleFilterChange}
            sortOptions={[
              { label: "Partner Name (A-Z)", value: "name" },
              { label: "Email", value: "email" },
              { label: "Phone", value: "phone" },
              { label: "Total Centers", value: "centers" },
              { label: "Status", value: "status" },
            ]}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={handleSortChange}
          />
        )}

        {/* Table */}
        {!showForm && (
          <DataTable
            columns={columns}
            data={partners}
            pagination={pagination}
            onPageChange={handlePageChange}
            onExport={canExport ? handleExport : null}
            onRowClick={handleRowClick}
            isLoading={isLoading}
            emptyMessage="No partners found"
            showExport={canExport}
          />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <RejectionModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedPartner(null);
        }}
        title={`Delete Partner: ${selectedPartner?.partner_name || ""}`}
        description="Are you sure you want to delete this partner? This action cannot be undone."
        onSubmit={async () => {
          await confirmDeletePartner();
        }}
        isLoading={isProcessing}
        reasonLabel="Reason for Deletion"
        remarksLabel="Additional Notes"
        reasonPlaceholder="Please provide a reason for deleting this partner..."
        remarksPlaceholder="Any additional notes..."
        minReasonLength={10}
      />

      {/* Approve Confirmation Modal */}
      <SuccessModal
        isOpen={showApproveModal}
        onClose={() => {
          setShowApproveModal(false);
          setSelectedPartner(null);
        }}
        title="Approve Partner"
        description="Are you sure you want to approve this partner? They will gain access to the system."
        partnerName={selectedPartner?.partner_name || ""}
        centerName={selectedPartner?.email || ""}
        onConfirm={confirmApprovePartner}
        isLoading={isProcessing}
        showCancel={true}
        buttonText="Confirm Approval"
      />

      {/* Reject Modal */}
      <RejectionModal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setSelectedPartner(null);
        }}
        title={`Reject Partner: ${selectedPartner?.partner_name || ""}`}
        description="Please provide a reason for rejecting this partner. This will be sent to them for review."
        onSubmit={confirmRejectPartner}
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

export default PartnersPage;
