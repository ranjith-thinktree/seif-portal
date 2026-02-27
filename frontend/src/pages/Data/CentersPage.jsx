import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MainLayout } from "../../components/layout";
import EnhancedDataTable, {
  StatusBadge,
} from "../../components/common/EnhancedDataTable";
import CenterForm from "../../components/forms/CenterForm";
import BulkCenterUpload from "../../components/forms/BulkCenterUpload";
import {
  SuccessModal,
  RejectionModal,
  ActionDropdown,
} from "../../components/common";
import ConfirmDeleteCenterModal from "../../components/common/ConfirmDeleteCenterModal";
import Breadcrumb from "../../components/common/Breadcrumb";
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
  ArrowLeftIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";
import {
  getCenters,
  createCenter,
  updateCenter,
  deleteCenter,
  bulkDeleteCenters,
  getCenterDeletionImpact,
  approveCenter,
  rejectCenter,
  exportCenters,
  downloadCSV,
  getCenterFilterOptions,
  getPartnerById,
} from "../../services/data.service";

import { toast } from "react-toastify";
import { useAuth } from "../../hooks";

const CentersPage = ({ embedded = false }) => {
  const navigate = useNavigate();
  const { partnerId } = useParams();
  const { role } = useAuth();

  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(role);
  const isSuperAdmin = role === "SUPER_ADMIN";
  const canExport = ["ADMIN", "SUPER_ADMIN", "ESSCI", "PARTNER"].includes(role);
  const canCreate = ["ADMIN", "SUPER_ADMIN", "PARTNER"].includes(role);

  const [centers, setCenters] = useState([]);
  const [partnerName, setPartnerName] = useState("");
  const [table, setTable] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState({
    partner_id: [], // Keep empty - partnerId from route is handled separately
    region: "",
    city: "",
    state: "",
    center_type: "",
    year_of_establishment: "",
    status: "",
    approval_status: "",
  });
  const [filterOptions, setFilterOptions] = useState({
    partners: [],
    regions: [],
    cities: [],
    states: [],
    centerTypes: [],
    years: [],
    statuses: [],
    approvalStatuses: [],
  });
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showForm, setShowForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [editingCenter, setEditingCenter] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletionImpact, setDeletionImpact] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Bulk delete states
  const [selectedRows, setSelectedRows] = useState([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [bulkDeleteResults, setBulkDeleteResults] = useState(null);

  // Fetch partner details if partnerId exists
  useEffect(() => {
    const fetchPartnerDetails = async () => {
      if (partnerId) {
        try {
          const response = await getPartnerById(partnerId);
          const partnerData = response?.data || response;
          if (partnerData?.name) {
            setPartnerName(partnerData.name);
          }
        } catch (error) {
          console.error("Error fetching partner details:", error);
        }
      }
    };
    fetchPartnerDetails();
  }, [partnerId]);

  // Fetch filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const response = await getCenterFilterOptions();
        setFilterOptions(response.data);
      } catch (error) {
        console.error("Error fetching filter options:", error);
      }
    };
    fetchFilterOptions();
  }, []);

  // Fetch centers
  const fetchCenters = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        sort_by: sortBy,
        sort_order: sortOrder,
        ...activeFilters,
        ...(partnerId && { partner_id: partnerId }), // Override activeFilters.partner_id if partnerId exists
      };

      // Remove empty filters (including empty arrays)
      Object.keys(params).forEach(
        (key) =>
          (params[key] === "" ||
            params[key] === null ||
            (Array.isArray(params[key]) && params[key].length === 0)) &&
          delete params[key],
      );

      const response = await getCenters(params);
      setCenters(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error("Error fetching centers:", error);
      toast.error("Failed to load centers");
    } finally {
      setIsLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    searchTerm,
    partnerId,
    activeFilters,
    sortBy,
    sortOrder,
  ]);

  // Fetch centers when dependencies change (removed fetchCenters from deps to prevent loop)
  useEffect(() => {
    fetchCenters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pagination.page,
    pagination.limit,
    partnerId,
    activeFilters,
    sortBy,
    sortOrder,
  ]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // Handle page change
  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  // Handle page size change
  const handlePageSizeChange = (newPageSize) => {
    setPagination((prev) => ({ ...prev, limit: newPageSize, page: 1 }));
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
  const handleDeleteCenter = async (centerId) => {
    const center = centers.find((c) => c.id === centerId);
    setSelectedCenter(center);

    // Fetch deletion impact
    try {
      const result = await getCenterDeletionImpact(centerId);
      setDeletionImpact(result.data);
      setShowDeleteModal(true);
    } catch (error) {
      console.error("Error fetching deletion impact:", error);
      toast.error("Failed to check center deletion impact");
    }
  };

  const confirmDeleteCenter = async () => {
    if (!selectedCenter) return;

    setIsProcessing(true);
    try {
      await deleteCenter(selectedCenter.id);
      toast.success("Center deleted successfully");
      setShowDeleteModal(false);
      setSelectedCenter(null);
      setDeletionImpact(null);
      fetchCenters();
    } catch (error) {
      console.error("Error deleting center:", error);
      toast.error(error.response?.data?.message || "Failed to delete center");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    setBulkDeleteLoading(true);
    try {
      const response = await bulkDeleteCenters(selectedRows);
      setBulkDeleteResults(response.data);

      // Show success toast if any deletions succeeded
      if (response.data.summary.successful > 0) {
        toast.success(
          `Successfully deleted ${response.data.summary.successful} center(s)`,
        );
        fetchCenters(); // Refresh table
        setSelectedRows([]); // Clear selection
      }

      // Show error toast if all failed
      if (response.data.summary.successful === 0) {
        toast.error("Failed to delete any centers");
      }
    } catch (error) {
      console.error("Error bulk deleting centers:", error);
      toast.error(error.response?.data?.message || "Failed to delete centers");
      setBulkDeleteResults(null);
      setShowBulkDeleteModal(false);
    } finally {
      setBulkDeleteLoading(false);
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

  const confirmRejectCenter = async ({ reason }) => {
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
      partner_id: [], // Keep empty - partnerId from route is handled separately
      region: "",
      city: "",
      state: "",
      center_type: "",
      year_of_establishment: "",
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
    navigate(`/data/centers/${center.id}/students`, {
      state: { centerName: center.center_name },
    });
  };

  // Handle back navigation
  const handleBack = () => {
    navigate("/data-management", { state: { activeTab: "partners" } });
  };

  // Breadcrumb items
  const breadcrumbItems = [
    { label: "Data Management", path: "/data-management" },
    { label: partnerName || "Centers" },
  ];

  // Handle edit click
  const handleEditClick = (e, center) => {
    e?.stopPropagation();
    setEditingCenter(center);
    setShowForm(true);
  };

  // Table columns
  const columns = [
    {
      id: "center_name",
      accessorKey: "center_name",
      header: "Center Name",
      cell: ({ row }) => (
        <div className="font-medium cursor-pointer hover:text-blue-600">
          {row.original.center_name}
        </div>
      ),
      size: 250,
      enableHiding: false,
    },
    {
      id: "center_type",
      accessorKey: "center_type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs">
          {row.original.center_type}
        </Badge>
      ),
      size: 150,
    },
    {
      id: "total_batches",
      accessorKey: "total_batches",
      header: "Batches",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.total_batches || 0}</Badge>
      ),
      size: 100,
    },
    {
      id: "total_students",
      accessorKey: "total_students",
      header: "Total Students",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.total_students || 0}</Badge>
      ),
      size: 140,
    },
    {
      id: "total_male_students",
      accessorKey: "total_male_students",
      header: "Male",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.total_male_students || 0}</Badge>
      ),
      size: 100,
    },
    {
      id: "total_female_students",
      accessorKey: "total_female_students",
      header: "Female",
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.total_female_students || 0}
        </Badge>
      ),
      size: 100,
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
      size: 120,
    },
    ...(isAdmin
      ? [
          {
            id: "approval_status",
            accessorKey: "approval_status",
            header: "Approval",
            cell: ({ row }) => (
              <StatusBadge status={row.original.approval_status} />
            ),
            size: 120,
          },
        ]
      : []),
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const center = row.original;
        const isPending = center.approval_status === "pending";

        const actions = [
          // Approve action
          {
            label: "Approve Center",
            icon: CheckIcon,
            onClick: () => handleApproveCenter(center.id),
            variant: "success",
            show: isAdmin && isPending,
            divider: isPending,
          },
          // Reject action
          {
            label: "Reject Center",
            icon: XMarkIcon,
            onClick: () => handleRejectCenter(center.id),
            variant: "danger",
            show: isAdmin && isPending,
            divider: true,
          },
          // Edit action
          {
            label: "Edit Center",
            icon: PencilIcon,
            onClick: (e) => handleEditClick(e, center),
            variant: "default",
            show: isAdmin || role === "PARTNER",
            divider: true,
          },
          // Delete action
          {
            label: "Delete Center",
            icon: TrashIcon,
            onClick: () => handleDeleteCenter(center.id),
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
              {partnerId && partnerName
                ? `${partnerName} - Centers`
                : "Centers"}
            </h1>
            <p className="text-gray-600 mt-1">
              {partnerId
                ? `View and manage centers for ${partnerName || "this partner"}`
                : "Manage and view all training centers"}
            </p>
          </div>
          {canCreate && !showForm && !embedded && (
            <div className="flex items-center gap-3">
              {isAdmin && (
                <button
                  onClick={() => setShowBulkUpload(true)}
                  className="px-6 py-3 bg-secondary-500 text-white rounded-full font-semibold hover:bg-secondary-600 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  <ArrowUpTrayIcon className="h-5 w-5" />
                  Bulk Upload
                </button>
              )}
              <button
                onClick={() => setShowForm(true)}
                className="px-8 py-3 bg-primary-500 text-white rounded-full font-semibold hover:bg-primary-600 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <PlusIcon className="h-5 w-5" />
                Create Center
              </button>
            </div>
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
          <div className="space-y-4">
            {/* Bulk Delete Button */}
            {canCreate && selectedRows.length > 0 && (
              <div className="flex justify-end">
                <BulkDeleteButton
                  selectedCount={selectedRows.length}
                  onDelete={() => setShowBulkDeleteModal(true)}
                  loading={bulkDeleteLoading}
                />
              </div>
            )}

            <div className="flex items-start gap-3">
              <div className="flex-1">
                <AdvancedSearchBar
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search centers by name, city, state..."
                  table={table}
                  storageKey="centers"
                  filterGroups={[
                    ...(embedded &&
                    !partnerId &&
                    filterOptions.partners.length > 0
                      ? [
                          {
                            label: "Partner",
                            key: "partner_id",
                            options: filterOptions.partners,
                            multi: true,
                          },
                        ]
                      : []),
                    {
                      label: "Region",
                      key: "region",
                      options: filterOptions.regions,
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
                      label: "Center Type",
                      key: "center_type",
                      options: filterOptions.centerTypes,
                    },
                    {
                      label: "Establishment Year",
                      key: "year_of_establishment",
                      options: filterOptions.years,
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
                  activeFilters={
                    partnerId
                      ? // Hide partner_id from filter badge when viewing specific partner
                        (() => {
                          const { partner_id: _partner_id, ...rest } =
                            activeFilters;
                          return rest;
                        })()
                      : activeFilters
                  }
                  onFilterChange={handleFilterChange}
                  onClearFilters={handleClearFilters}
                  sortOptions={[
                    { label: "Center Name", value: "center_name" },
                    { label: "City", value: "city" },
                    { label: "Region", value: "region" },
                    {
                      label: "Establishment Year",
                      value: "year_of_establishment",
                    },
                    { label: "Status", value: "status" },
                    { label: "Created Date", value: "created_at" },
                  ]}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSortChange={handleSortChange}
                />
              </div>
              {canExport && (
                <Button
                  onClick={handleExport}
                  variant="outline"
                  className="whitespace-nowrap"
                >
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
            data={centers}
            pagination={pagination}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onRowClick={handleRowClick}
            isLoading={isLoading}
            emptyMessage="No centers found"
            showSerialNumber={true}
            storageKey="centers"
            onTableReady={setTable}
            enableRowSelection={canCreate}
            selectedRows={selectedRows}
            onSelectionChange={setSelectedRows}
            getRowId={(row) => row.id}
          />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteCenterModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedCenter(null);
          setDeletionImpact(null);
        }}
        centerName={selectedCenter?.center_name || ""}
        impact={deletionImpact}
        onConfirm={confirmDeleteCenter}
        isLoading={isProcessing}
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

      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <BulkCenterUpload
          onClose={() => setShowBulkUpload(false)}
          onSuccess={() => {
            fetchCenters();
            toast.success("Centers uploaded successfully");
          }}
        />
      )}

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmationModal
        open={showBulkDeleteModal}
        onClose={() => {
          setShowBulkDeleteModal(false);
          setBulkDeleteResults(null);
        }}
        onConfirm={handleBulkDelete}
        title="Delete Centers"
        message={`Are you sure you want to delete ${selectedRows.length} center(s)?`}
        itemCount={selectedRows.length}
        items={centers.filter((c) => selectedRows.includes(c.id))}
        loading={bulkDeleteLoading}
        results={bulkDeleteResults}
        itemType="centers"
      />
    </>
  );

  return embedded ? content : <MainLayout>{content}</MainLayout>;
};

export default CentersPage;
