import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "../../components/layout";
import EnhancedDataTable, {
  StatusBadge,
} from "../../components/common/EnhancedDataTable";
import { SuccessModal, RejectionModal } from "../../components/common";
import Breadcrumb from "../../components/common/Breadcrumb";
import AdvancedSearchBar from "../../components/common/AdvancedSearchBar";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  CheckIcon,
  XMarkIcon,
  EyeIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import {
  getCenters,
  approveCenter,
  rejectCenter,
  getCenterFilterOptions,
} from "../../services/data.service";
import { toast } from "react-toastify";
import CenterDetailsModal from "../../components/modals/CenterDetailsModal";

/**
 * Pending Centers Review Page
 * Admin page to review and approve/reject newly created centers by partners
 */
const PendingCentersReviewPage = () => {
  const navigate = useNavigate();

  const [centers, setCenters] = useState([]);
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
    partner_id: [],
    region: "",
    city: "",
    state: "",
    center_type: "",
    year_of_establishment: "",
    approval_status: "pending", // Default to pending
  });
  const [filterOptions, setFilterOptions] = useState({
    partners: [],
    regions: [],
    cities: [],
    states: [],
    centerTypes: [],
    years: [],
    approvalStatuses: [],
  });
  const [sortBy] = useState("created_at");
  const [sortOrder] = useState("desc");
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Breadcrumb
  const breadcrumbItems = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Review Pending Centers", path: "/review/pending-centers" },
  ];

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

  // Fetch pending centers
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
      };

      // Remove empty filters
      Object.keys(params).forEach(
        (key) =>
          (params[key] === "" ||
            params[key] === null ||
            (Array.isArray(params[key]) && params[key].length === 0)) &&
          delete params[key]
      );

      const response = await getCenters(params);
      setCenters(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error("Error fetching centers:", error);
      toast.error("Failed to load pending centers");
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

  // Handle view details
  const handleViewDetails = (center) => {
    setSelectedCenter(center);
    setShowDetailsModal(true);
  };

  // Handle approve
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

  // Handle reject
  const handleRejectCenter = (centerId) => {
    const center = centers.find((c) => c.id === centerId);
    setSelectedCenter(center);
    setShowRejectModal(true);
  };

  const confirmRejectCenter = async (data) => {
    if (!selectedCenter) return;

    const { reason, remarks } = data;

    setIsProcessing(true);
    try {
      await rejectCenter(selectedCenter.id, { reason, remarks });
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

  // Table columns
  const columns = [
    {
      id: "partner_name",
      accessorKey: "partner_name",
      header: "Partner",
      size: 200,
    },
    {
      id: "center_name",
      accessorKey: "center_name",
      header: "Center Name",
      size: 250,
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
      size: 120,
    },
    {
      id: "city",
      accessorKey: "city",
      header: "City",
      size: 150,
    },
    {
      id: "state",
      accessorKey: "state",
      header: "State",
      size: 150,
    },
    {
      id: "created_at",
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) =>
        new Date(row.original.created_at).toLocaleDateString("en-GB"),
      size: 120,
    },
    {
      id: "approval_status",
      accessorKey: "approval_status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.approval_status} />,
      size: 120,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.approval_status === "pending" && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleApproveCenter(row.original.id);
                }}
                className="text-green-600 hover:text-green-800"
                title="Approve"
              >
                <CheckIcon className="h-5 w-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRejectCenter(row.original.id);
                }}
                className="text-red-600 hover:text-red-800"
                title="Reject"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleViewDetails(row.original);
            }}
            className="text-blue-600 hover:text-blue-800"
            title="View Details"
          >
            <EyeIcon className="h-5 w-5" />
          </button>
        </div>
      ),
      size: 150,
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbItems} />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Review Pending Centers
            </h1>
            <p className="text-gray-600 mt-1">
              Review and approve centers created by partners
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back
          </Button>
        </div>

        {/* Search with Filters */}
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <AdvancedSearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search centers by name, city, state..."
              table={table}
              storageKey="pending_centers_review"
              filterGroups={[
                {
                  label: "Partner",
                  key: "partner_id",
                  options: filterOptions.partners,
                  multi: true,
                },
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
                  label: "Status",
                  key: "approval_status",
                  options: [
                    { value: "pending", label: "Pending" },
                    { value: "approved", label: "Approved" },
                    { value: "rejected", label: "Rejected" },
                  ],
                },
              ]}
              activeFilters={activeFilters}
              onFilterChange={(key, value) =>
                setActiveFilters((prev) => ({ ...prev, [key]: value }))
              }
              onClearFilters={() =>
                setActiveFilters({
                  partner_id: [],
                  region: "",
                  city: "",
                  state: "",
                  center_type: "",
                  year_of_establishment: "",
                  approval_status: "pending",
                })
              }
            />
          </div>
        </div>

        {/* Table */}
        <EnhancedDataTable
          columns={columns}
          data={centers}
          pagination={pagination}
          onPageChange={handlePageChange}
          isLoading={isLoading}
          emptyMessage="No pending centers found"
          showSerialNumber={true}
          storageKey="pending_centers_review"
          onTableReady={setTable}
        />
      </div>

      {/* Center Details Modal */}
      {showDetailsModal && selectedCenter && (
        <CenterDetailsModal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedCenter(null);
          }}
          center={selectedCenter}
          onApprove={() => {
            setShowDetailsModal(false);
            handleApproveCenter(selectedCenter.id);
          }}
          onReject={() => {
            setShowDetailsModal(false);
            handleRejectCenter(selectedCenter.id);
          }}
        />
      )}

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

export default PendingCentersReviewPage;
