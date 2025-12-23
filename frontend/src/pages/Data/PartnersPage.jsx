import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "../../components/layout";
import EnhancedDataTable, {
  StatusBadge,
} from "../../components/common/EnhancedDataTable";
import PartnerForm from "../../components/forms/PartnerForm";
import BulkPartnerUpload from "../../components/forms/BulkPartnerUpload";
import {
  SuccessModal,
  RejectionModal,
  ActionDropdown,
} from "../../components/common";
import ResetPartnerPasswordModal from "../../components/modals/ResetPartnerPasswordModal";
import AdvancedSearchBar from "../../components/common/AdvancedSearchBar";
import BulkDeleteButton from "../../components/common/BulkDeleteButton";
import ConfirmationModal from "../../components/common/ConfirmationModal";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  PlusIcon,
  CheckIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  EnvelopeIcon,
  KeyIcon,
} from "@heroicons/react/24/outline";
import {
  getPartners,
  createPartner,
  updatePartner,
  deletePartner,
  bulkDeletePartners,
  approvePartner,
  rejectPartner,
  resendPartnerWelcomeEmail,
  exportPartners,
  downloadCSV,
  getPartnerFilterOptions,
} from "../../services/data.service";
import { toast } from "react-toastify";
import { useAuth } from "../../hooks";

const PartnersPage = ({ embedded = false }) => {
  const navigate = useNavigate();
  const { role } = useAuth();

  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(role);
  const isSuperAdmin = role === "SUPER_ADMIN";
  const canExport = ["ADMIN", "SUPER_ADMIN", "ESSCI"].includes(role);

  const [partners, setPartners] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState({
    type: "",
    city: "",
    state: "",
    status: "",
    approval_status: "",
  });
  const [filterOptions, setFilterOptions] = useState({
    types: [],
    cities: [],
    states: [],
    statuses: [],
    approvalStatuses: [],
  });
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [columnVisibility, setColumnVisibility] = useState({});
  const [table, setTable] = useState(null); // Store table instance from EnhancedDataTable
  const [showForm, setShowForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Bulk delete states
  const [selectedRows, setSelectedRows] = useState([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [bulkDeleteResults, setBulkDeleteResults] = useState(null);

  // Fetch filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const response = await getPartnerFilterOptions();
        setFilterOptions(response.data);
      } catch (error) {
        console.error("Error fetching filter options:", error);
      }
    };
    fetchFilterOptions();
  }, []);

  // Fetch partners
  const fetchPartners = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        sort_by: sortBy,
        sort_order: sortOrder,
        ...activeFilters,
      };

      // Remove empty filters
      Object.keys(params).forEach(
        (key) =>
          (params[key] === "" || params[key] === null) && delete params[key]
      );

      const response = await getPartners(params);
      setPartners(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error("Error fetching partners:", error);
      toast.error("Failed to load partners");
    } finally {
      setIsLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    searchTerm,
    activeFilters,
    sortBy,
    sortOrder,
  ]);

  // Fetch partners when dependencies change (removed fetchPartners from deps to prevent loop)
  useEffect(() => {
    fetchPartners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit, activeFilters, sortBy, sortOrder]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

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

  // Handle bulk delete
  const handleBulkDelete = async () => {
    setBulkDeleteLoading(true);
    try {
      const response = await bulkDeletePartners(selectedRows);
      setBulkDeleteResults(response.data);

      // Show success toast if any deletions succeeded
      if (response.data.summary.successful > 0) {
        toast.success(
          `Successfully deleted ${response.data.summary.successful} partner(s)`
        );
        fetchPartners(); // Refresh table
        setSelectedRows([]); // Clear selection
      }

      // Show error toast if all failed
      if (response.data.summary.successful === 0) {
        toast.error("Failed to delete any partners");
      }
    } catch (error) {
      console.error("Error bulk deleting partners:", error);
      toast.error(error.response?.data?.message || "Failed to delete partners");
      setBulkDeleteResults(null);
      setShowBulkDeleteModal(false);
    } finally {
      setBulkDeleteLoading(false);
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

  // Handle resend welcome email
  const handleResendWelcomeEmail = async (partnerId) => {
    try {
      await resendPartnerWelcomeEmail(partnerId);
      toast.success("Welcome email sent successfully with new credentials");
    } catch (error) {
      console.error("Error resending welcome email:", error);
      toast.error(
        error.response?.data?.message || "Failed to send welcome email"
      );
    }
  };

  // Handle reset password
  const handleResetPassword = (partner) => {
    setSelectedPartner(partner);
    setShowResetPasswordModal(true);
  };

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setActiveFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page
  };

  // Handle clear all filters
  const handleClearFilters = () => {
    setActiveFilters({
      type: "",
      city: "",
      state: "",
      status: "",
      approval_status: "",
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Handle sort change
  const handleSortChange = (field, order) => {
    setSortBy(field);
    setSortOrder(order);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Handle export
  const handleExport = async () => {
    try {
      const params = {
        search: searchTerm,
        ...activeFilters,
      };

      // Remove empty filters
      Object.keys(params).forEach(
        (key) =>
          (params[key] === "" || params[key] === null) && delete params[key]
      );

      const blob = await exportPartners(params);
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
  const handleEditClick = (partner) => {
    setEditingPartner(partner);
    setShowForm(true);
  };

  // Table columns - TanStack Table format
  const columns = [
    {
      id: "name",
      accessorKey: "name",
      header: "Partner Name",
      cell: ({ row }) => (
        <div
          onClick={() => handleRowClick(row.original)}
          className="font-medium cursor-pointer hover:text-blue-600 truncate"
        >
          {row.getValue("name")}
        </div>
      ),
      size: 200,
      minSize: 150,
      maxSize: 400,
      enableHiding: false,
    },
    {
      id: "partner_id",
      accessorKey: "partner_id",
      header: "Partner ID",
      cell: ({ row }) => (
        <div className="truncate">{row.getValue("partner_id")}</div>
      ),
      size: 150,
      minSize: 100,
      maxSize: 250,
      enableHiding: true,
    },
    {
      id: "organization_type",
      accessorKey: "organization_type",
      header: "Partner Type",
      cell: ({ row }) => (
        <div className="truncate">{row.getValue("organization_type")}</div>
      ),
      size: 180,
      minSize: 120,
      maxSize: 300,
      enableHiding: true,
    },
    {
      id: "total_centers",
      accessorKey: "total_centers",
      header: "Number of Centers",
      cell: ({ row }) => (
        <Badge variant="outline" className="truncate">
          {row.getValue("total_centers") || 0}
        </Badge>
      ),
      size: 140,
      minSize: 100,
      maxSize: 200,
      enableHiding: true,
    },
    {
      id: "total_students",
      accessorKey: "total_students",
      header: "Number of Students",
      cell: ({ row }) => (
        <Badge variant="outline" className="truncate">
          {row.getValue("total_students") || 0}
        </Badge>
      ),
      size: 140,
      minSize: 100,
      maxSize: 200,
      enableHiding: true,
    },
    {
      id: "city",
      accessorKey: "city",
      header: "City",
      cell: ({ row }) => (
        <div className="truncate">{row.getValue("city") || "-"}</div>
      ),
      size: 120,
      minSize: 80,
      maxSize: 200,
      enableHiding: true,
    },
    {
      id: "state",
      accessorKey: "state",
      header: "State",
      cell: ({ row }) => (
        <div className="truncate">{row.getValue("state") || "-"}</div>
      ),
      size: 120,
      minSize: 80,
      maxSize: 200,
      enableHiding: true,
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
      size: 120,
      minSize: 100,
      maxSize: 150,
      enableHiding: true,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const partner = row.original;
        const isPending = partner.approval_status === "pending";

        const actions = [
          // Approve action
          {
            label: "Approve Partner",
            icon: CheckIcon,
            onClick: () => handleApprovePartner(partner.id),
            variant: "success",
            show: isAdmin && isPending,
            divider: isPending,
          },
          // Reject action
          {
            label: "Reject Partner",
            icon: XMarkIcon,
            onClick: () => handleRejectPartner(partner.id),
            variant: "danger",
            show: isAdmin && isPending,
            divider: true,
          },
          // Edit action
          {
            label: "Edit Partner",
            icon: PencilIcon,
            onClick: () => handleEditClick(partner),
            variant: "default",
            show: isAdmin,
          },
          // Reset Password action
          {
            label: "Reset Password",
            icon: KeyIcon,
            onClick: () => handleResetPassword(partner),
            variant: "warning",
            show: isAdmin,
          },
          // Resend Welcome Email action
          {
            label: "Resend Welcome Email",
            icon: EnvelopeIcon,
            onClick: () => handleResendWelcomeEmail(partner.id),
            variant: "default",
            show: isAdmin,
            divider: true,
          },
          // Delete action
          {
            label: "Delete Partner",
            icon: TrashIcon,
            onClick: () => handleDeletePartner(partner.id),
            variant: "danger",
            show: isAdmin,
          },
        ];

        return (
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex justify-center"
          >
            <ActionDropdown actions={actions} align="right" size="sm" />
          </div>
        );
      },
      size: 180,
      minSize: 150,
      maxSize: 250,
      enableHiding: false,
      enableResizing: false,
    },
  ];

  const content = (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Partners</h1>
            <p className="text-gray-600 mt-1">
              Manage and view all partner organizations
            </p>
          </div>
          {isAdmin && !showForm && !showBulkUpload && (
            <div className="flex gap-3">
              {isSuperAdmin && (
                <button
                  onClick={() => setShowBulkUpload(true)}
                  className="px-6 py-3 bg-blue-500 text-white rounded-full font-semibold hover:bg-blue-600 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                  <span>📤 Bulk Upload</span>
                </button>
              )}
              <button
                onClick={() => setShowForm(true)}
                className="px-8 py-3 bg-primary-500 text-white rounded-full font-semibold hover:bg-primary-600 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <PlusIcon className="h-5 w-5" />
                Create Partner
              </button>
            </div>
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

        {/* Bulk Upload */}
        {showBulkUpload && (
          <BulkPartnerUpload
            onSuccess={() => {
              setShowBulkUpload(false);
              fetchPartners();
            }}
            onCancel={() => setShowBulkUpload(false)}
          />
        )}

        {/* Search with Filters and Export */}
        {!showForm && !showBulkUpload && (
          <div className="space-y-4">
            {/* Bulk Delete Button */}
            {isAdmin && selectedRows.length > 0 && (
              <div className="flex justify-end">
                <BulkDeleteButton
                  selectedCount={selectedRows.length}
                  onDelete={() => setShowBulkDeleteModal(true)}
                  loading={bulkDeleteLoading}
                />
              </div>
            )}

            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <AdvancedSearchBar
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search partners by name, ID, or type..."
                  filterGroups={[
                    {
                      label: "Partner Type",
                      key: "type",
                      options: filterOptions.types,
                    },
                    {
                      label: "City",
                      key: "city",
                      options: filterOptions.cities,
                    },
                    {
                      label: "State",
                      key: "state",
                      options: filterOptions.states,
                    },
                    {
                      label: "Status",
                      key: "status",
                      options: filterOptions.statuses,
                    },
                    ...(isAdmin && filterOptions.approvalStatuses.length > 0
                      ? [
                          {
                            label: "Approval Status",
                            key: "approval_status",
                            options: filterOptions.approvalStatuses,
                          },
                        ]
                      : []),
                  ]}
                  activeFilters={activeFilters}
                  onFilterChange={handleFilterChange}
                  onClearFilters={handleClearFilters}
                  sortOptions={[
                    { label: "Partner Name", value: "name" },
                    { label: "Partner ID", value: "partner_id" },
                    { label: "Partner Type", value: "organization_type" },
                    { label: "City", value: "city" },
                    { label: "State", value: "state" },
                    { label: "Status", value: "status" },
                    { label: "Created Date", value: "created_at" },
                  ]}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSortChange={handleSortChange}
                  table={table}
                  storageKey="partners"
                />
              </div>
              {canExport && (
                <Button
                  onClick={handleExport}
                  variant="outline"
                  size="default"
                  className="gap-2 whitespace-nowrap"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Export CSV
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Table */}
        {!showForm && (
          <EnhancedDataTable
            columns={columns}
            data={partners}
            pagination={pagination}
            onPageChange={handlePageChange}
            isLoading={isLoading}
            emptyMessage="No partners found"
            showSerialNumber={true}
            storageKey="partners"
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
            onTableReady={setTable}
            enableRowSelection={isAdmin}
            selectedRows={selectedRows}
            onSelectionChange={setSelectedRows}
            getRowId={(row) => row.id}
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

      {/* Reset Password Modal */}
      <ResetPartnerPasswordModal
        isOpen={showResetPasswordModal}
        onClose={() => {
          setShowResetPasswordModal(false);
          setSelectedPartner(null);
        }}
        partner={selectedPartner}
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmationModal
        open={showBulkDeleteModal}
        onClose={() => {
          setShowBulkDeleteModal(false);
          setBulkDeleteResults(null);
        }}
        onConfirm={handleBulkDelete}
        title="Delete Partners"
        message={`Are you sure you want to delete ${selectedRows.length} partner(s)?`}
        itemCount={selectedRows.length}
        items={partners.filter((p) => selectedRows.includes(p.id))}
        loading={bulkDeleteLoading}
        results={bulkDeleteResults}
        itemType="partners"
      />
    </>
  );

  return embedded ? content : <MainLayout>{content}</MainLayout>;
};

export default PartnersPage;
