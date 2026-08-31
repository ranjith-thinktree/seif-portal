import { useState, useEffect, useCallback, useMemo } from "react";
import { flushSync } from "react-dom";
import MainLayout from "../../components/layout/MainLayout";
import EnhancedDataTable from "../../components/common/EnhancedDataTable";
import AdvancedSearchBar from "../../components/common/AdvancedSearchBar";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Download,
  Edit,
  Eye,
  Plus,
  Trash2,
  MapPin,
  Mail,
  Phone,
  Building2,
  BookOpen,
  Users,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { toast } from "react-toastify";
import { useAuth } from "../../hooks/useAuth";
import ConfirmationModal from "../../components/common/ConfirmationModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import CenterForm from "../../components/forms/CenterForm";
import {
  createCenter,
  getCenterById,
  getCenters,
  deleteCenter,
  updateCenter,
} from "../../services/data.service";

/**
 * Organization Centers Page
 * Shows approved centers with detailed contact and address information
 * Different from Data Centers Page which shows pending approvals
 */
const getApiErrorMessage = (error, fallback) => {
  const data = error.response?.data;
  const fieldErrors = data?.errors;
  if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
    return fieldErrors
      .map((item) => item.message || item.msg)
      .filter(Boolean)
      .join(". ");
  }
  return data?.message || error.message || fallback;
};

const OrganizationCentersPage = ({ embedded = false }) => {
  const { role } = useAuth();
  const isPartner = role === "PARTNER";
  // State Management
  const [centers, setCenters] = useState([]);
  const [table, setTable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState({
    partner: [],
    region: [],
    center_type: [],
    city: [],
    state: [],
    status: [],
  });
  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [editingCenter, setEditingCenter] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingCenterDetails, setLoadingCenterDetails] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch Centers
  const fetchCenters = useCallback(async () => {
    try {
      setLoading(true);
      // Request all centers with a large limit for client-side pagination
      const params = { limit: 1000 };
      if (!isPartner) {
        params.approval_status = "approved";
      }

      const response = await getCenters(params);

      if (response.success) {
        const visibleCenters = (response.data || []).filter((center) => {
          if (isPartner) {
            return center.approval_status !== "rejected";
          }
          return center.status === "active" || center.status === "inactive";
        });
        setCenters(visibleCenters);
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error("Error fetching centers:", error);
      toast.error(
        error.message || "Failed to fetch centers. Please try again.",
      );
      setCenters([]);
    } finally {
      setLoading(false);
    }
  }, [isPartner]);

  useEffect(() => {
    fetchCenters();
  }, [fetchCenters]);

  // Handle Delete
  const handleDelete = async () => {
    if (!selectedCenter) return;

    try {
      setDeleting(true);
      const response = await deleteCenter(selectedCenter.id);

      if (response.success) {
        toast.success("Center deleted successfully");
        fetchCenters();
        setShowDeleteDialog(false);
        setSelectedCenter(null);
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error("Error deleting center:", error);
      toast.error(
        error.message || "Failed to delete center. Please try again.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const fetchCenterDetails = useCallback(async (centerId) => {
    const response = await getCenterById(centerId);
    if (!response.success) {
      throw new Error(response.message || "Failed to fetch center details");
    }
    return response.data;
  }, []);

  const handleCreateCenter = async (formData) => {
    try {
      setIsSubmitting(true);
      const response = await createCenter(formData);
      if (!response.success) {
        throw new Error(response.message || "Failed to create center");
      }
      toast.success(
        isPartner
          ? "Center created successfully and is awaiting admin approval."
          : "Center created successfully",
      );
      setShowForm(false);
      setEditingCenter(null);
      fetchCenters();
    } catch (error) {
      console.error("Error creating center:", error);
      toast.error(getApiErrorMessage(error, "Failed to create center"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCenter = async (formData) => {
    if (!editingCenter?.id) return;

    try {
      setIsSubmitting(true);
      const response = await updateCenter(editingCenter.id, formData);
      if (!response.success) {
        throw new Error(response.message || "Failed to update center");
      }
      toast.success("Center updated successfully");
      setShowForm(false);
      setEditingCenter(null);
      fetchCenters();
    } catch (error) {
      console.error("Error updating center:", error);
      toast.error(getApiErrorMessage(error, "Failed to update center"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Export
  const handleExport = useCallback(() => {
    try {
      if (filteredAndSortedCenters.length === 0) {
        toast.warn("No data to export.");
        return;
      }

      const escapeCsvValue = (value) => {
        const normalized =
          value === null || value === undefined ? "" : String(value);
        const escaped = normalized.replace(/"/g, '""');
        return `"${escaped}"`;
      };

      // Prepare CSV data
      const csvData = filteredAndSortedCenters.map((center) => ({
        "Center Name": center.center_name,
        "Partner Name": center.partner_name || "",
        "Center Type": center.center_type || "",
        Region: center.region || "",
        "Center Head": center.center_head || "",
        "Mobile Number": center.mobile_number || "",
        Email: center.email || "",
        Address: center.address || "",
        City: center.city || "",
        State: center.state || "",
        "Courses Offered": center.courses_offered?.join(", ") || "",
        "Year of Establishment": center.year_of_establishment || "",
        "Total Students": center.total_students || 0,
        Status: center.status,
      }));

      // Convert to CSV
      const headers = Object.keys(csvData[0]).map(escapeCsvValue).join(",");
      const rows = csvData.map((row) =>
        Object.values(row).map(escapeCsvValue).join(","),
      );
      const csv = [headers, ...rows].join("\n");

      // Create blob and download
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `centers_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${csvData.length} centers to CSV`);
    } catch (error) {
      console.error("Error exporting:", error);
      toast.error("Failed to export data. Please try again.");
    }
  }, [centers, searchTerm, activeFilters, sortBy, sortOrder]);

  // Table Columns Definition
  const handleCreate = useCallback(() => {
    setEditingCenter(null);
    setShowForm(true);
  }, []);

  const handleViewDetails = useCallback((center) => {
    setSelectedCenter(center);
    setShowViewDialog(true);
  }, []);

  const handleEdit = useCallback(
    async (center) => {
      try {
        setLoadingCenterDetails(true);
        const detailedCenter = await fetchCenterDetails(center.id);
        setEditingCenter(detailedCenter);
        setShowForm(true);
      } catch (error) {
        console.error("Error fetching center for edit:", error);
        toast.error(error.message || "Failed to load center for editing");
      } finally {
        setLoadingCenterDetails(false);
      }
    },
    [fetchCenterDetails],
  );

  const columns = useMemo(
    () => [
      {
        accessorKey: "center_name",
        header: "Center Name",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.center_name}</span>
            <span className="text-xs text-gray-500">
              {row.original.partner_name || "N/A"}
            </span>
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "center_type",
        header: "Type & Region",
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <Badge variant="outline">{row.original.center_type}</Badge>
            <span className="text-xs text-gray-500">{row.original.region}</span>
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "center_head",
        header: "Center Head",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">
              {row.original.center_head || "-"}
            </span>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
              <Mail className="w-3 h-3" />
              <span>{row.original.email || "-"}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Phone className="w-3 h-3" />
              <span>{row.original.mobile_number || "-"}</span>
            </div>
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "address",
        header: "Location",
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <div className="flex items-start gap-1 text-sm">
              <MapPin className="w-3 h-3 mt-1 text-gray-500" />
              <span className="line-clamp-2">
                {row.original.address || "-"}
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {row.original.city}, {row.original.state}
            </span>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "courses_offered",
        header: "Courses",
        cell: ({ row }) => {
          const courses = row.original.courses_offered || [];
          return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <BookOpen className="w-4 h-4 text-gray-500" />
                <span className="font-medium">{courses.length}</span>
              </div>
              {courses.length > 0 && (
                <span className="text-xs text-gray-500 line-clamp-2">
                  {courses.join(", ")}
                </span>
              )}
            </div>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: "total_students",
        header: "Students",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="font-medium">
              {row.original.total_students || 0}
            </span>
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <Badge
              variant={
                row.original.status === "active" ? "success" : "secondary"
              }
            >
              {row.original.status}
            </Badge>
            {row.original.approval_status &&
              row.original.approval_status !== "approved" && (
                <Badge variant="outline">
                  {row.original.approval_status}
                </Badge>
              )}
          </div>
        ),
        enableSorting: true,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setSelectedCenter(row.original);
                setShowViewDialog(true);
              }}
              className="h-8 w-8 p-0 inline-flex items-center justify-center rounded hover:bg-gray-100"
              title="View Details"
            >
              <Eye className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => handleEdit(row.original)}
              className="h-8 w-8 p-0 inline-flex items-center justify-center rounded hover:bg-gray-100"
              title="Edit"
            >
              <Edit className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => {
                setSelectedCenter(row.original);
                setShowDeleteDialog(true);
              }}
              className="h-8 w-8 p-0 inline-flex items-center justify-center rounded hover:bg-gray-100"
              title="Delete"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          </div>
        ),
      },
    ],
    [handleEdit],
  );

  const filterGroups = useMemo(
    () => [
      {
        key: "partner",
        label: "Partner",
        multi: true,
        options: [
          ...new Set(
            centers.map((center) => center.partner_name).filter(Boolean),
          ),
        ].map((partner) => ({ value: partner, label: partner })),
      },
      {
        key: "region",
        label: "Region",
        multi: true,
        options: [
          ...new Set(centers.map((center) => center.region).filter(Boolean)),
        ].map((region) => ({ value: region, label: region })),
      },
      {
        key: "center_type",
        label: "Center Type",
        multi: true,
        options: [
          ...new Set(
            centers.map((center) => center.center_type).filter(Boolean),
          ),
        ].map((type) => ({ value: type, label: type })),
      },
      {
        key: "city",
        label: "City",
        multi: true,
        options: [
          ...new Set(centers.map((center) => center.city).filter(Boolean)),
        ].map((city) => ({ value: city, label: city })),
      },
      {
        key: "state",
        label: "State",
        multi: true,
        options: [
          ...new Set(centers.map((center) => center.state).filter(Boolean)),
        ].map((state) => ({ value: state, label: state })),
      },
      {
        key: "status",
        label: "Status",
        multi: true,
        options: [
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ],
      },
    ],
    [centers],
  );

  const sortOptions = useMemo(
    () => [
      { label: "Center Name", value: "center_name" },
      { label: "Partner", value: "partner_name" },
      { label: "Center Type", value: "center_type" },
      { label: "Region", value: "region" },
      { label: "City", value: "city" },
      { label: "State", value: "state" },
      { label: "Total Students", value: "total_students" },
      { label: "Status", value: "status" },
      { label: "Year of Establishment", value: "year_of_establishment" },
    ],
    [],
  );

  const filteredAndSortedCenters = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    const filtered = centers.filter((center) => {
      const matchesSearch =
        !normalizedSearchTerm ||
        [
          center.center_name,
          center.partner_name,
          center.center_type,
          center.region,
          center.city,
          center.state,
          center.center_head,
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedSearchTerm));

      const matchesPartner =
        activeFilters.partner.length === 0 ||
        activeFilters.partner.includes(center.partner_name);
      const matchesRegion =
        activeFilters.region.length === 0 ||
        activeFilters.region.includes(center.region);
      const matchesCenterType =
        activeFilters.center_type.length === 0 ||
        activeFilters.center_type.includes(center.center_type);
      const matchesCity =
        activeFilters.city.length === 0 ||
        activeFilters.city.includes(center.city);
      const matchesState =
        activeFilters.state.length === 0 ||
        activeFilters.state.includes(center.state);
      const matchesStatus =
        activeFilters.status.length === 0 ||
        activeFilters.status.includes(center.status);

      return (
        matchesSearch &&
        matchesPartner &&
        matchesRegion &&
        matchesCenterType &&
        matchesCity &&
        matchesState &&
        matchesStatus
      );
    });

    if (!sortBy) return filtered;

    return [...filtered].sort((a, b) => {
      const aValue = a?.[sortBy];
      const bValue = b?.[sortBy];

      const aStr = String(aValue ?? "").toLowerCase();
      const bStr = String(bValue ?? "").toLowerCase();

      if (aStr < bStr) return sortOrder === "asc" ? -1 : 1;
      if (aStr > bStr) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [centers, searchTerm, activeFilters, sortBy, sortOrder]);

  const handleFilterChange = (key, value) => {
    setActiveFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setActiveFilters({
      partner: [],
      region: [],
      center_type: [],
      city: [],
      state: [],
      status: [],
    });
    setCurrentPage(1);
  };

  const handleSortChange = (field, order) => {
    setSortBy(field);
    setSortOrder(order);
    setCurrentPage(1);
  };

  // Paginated Data - slice data for current page
  const paginatedCenters = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAndSortedCenters.slice(startIndex, endIndex);
  }, [filteredAndSortedCenters, currentPage, pageSize]);

  // Pagination Object
  const paginationConfig = useMemo(() => {
    const totalPages = Math.ceil(filteredAndSortedCenters.length / pageSize);
    return {
      page: currentPage,
      limit: pageSize,
      total: filteredAndSortedCenters.length,
      totalPages: totalPages || 1,
    };
  }, [filteredAndSortedCenters.length, currentPage, pageSize]);

  // Render Content
  const content = (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Centers</h1>
          <p className="text-gray-600 mt-1">
            Manage training centers and their contact information
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleExport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Add Center
          </Button>
        </div>
      </div>

      {showForm && (
        <CenterForm
          center={editingCenter}
          onSubmit={editingCenter ? handleUpdateCenter : handleCreateCenter}
          onCancel={() => {
            setShowForm(false);
            setEditingCenter(null);
          }}
          isLoading={isSubmitting}
          preselectedPartnerId={editingCenter?.partner_id || null}
        />
      )}

      {!showForm && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-600">Total Centers</div>
              <div className="text-2xl font-bold">{centers.length}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-600">Active Centers</div>
              <div className="text-2xl font-bold text-green-600">
                {centers.filter((c) => c.status === "active").length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-600">Total Students</div>
              <div className="text-2xl font-bold">
                {centers.reduce((sum, c) => sum + (c.total_students || 0), 0)}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-600">Regions</div>
              <div className="text-2xl font-bold">
                {new Set(centers.map((c) => c.region).filter(Boolean)).size}
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <AdvancedSearchBar
            value={searchTerm}
            onChange={(value) => {
              setSearchTerm(value);
              setCurrentPage(1);
            }}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            filterGroups={filterGroups}
            sortOptions={sortOptions}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={handleSortChange}
            table={table}
            storageKey="organization-centers"
            placeholder="Search centers by name, partner, region, city..."
          />

          {/* Data Table */}
          <EnhancedDataTable
            columns={columns}
            data={paginatedCenters}
            pagination={paginationConfig}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            isLoading={loading}
            emptyMessage="No centers found"
            storageKey="organization-centers-table"
            onTableReady={setTable}
          />
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationModal
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Center"
        message={`Are you sure you want to delete center "${selectedCenter?.center_name}"? This action cannot be undone and will also delete all associated batches and student data.`}
        itemCount={1}
        items={selectedCenter ? [selectedCenter] : []}
        loading={deleting}
        itemType="centers"
      />

      {/* View Center Details Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Center Details
            </DialogTitle>
            <DialogDescription>
              Full information for {selectedCenter?.center_name}
            </DialogDescription>
          </DialogHeader>

          {loadingCenterDetails && (
            <div className="py-8 text-center text-sm text-gray-500">
              Loading center details...
            </div>
          )}

          {!loadingCenterDetails && selectedCenter && (
            <div className="space-y-4 py-2">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Center ID
                  </p>
                  <p className="text-gray-700">
                    {selectedCenter.center_id || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Center Name
                  </p>
                  <p className="font-semibold text-gray-900">
                    {selectedCenter.center_name}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Partner
                  </p>
                  <p className="text-gray-700">
                    {selectedCenter.partner_name || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Partner Contact Person
                  </p>
                  <p className="text-gray-700">
                    {selectedCenter.partner_contact_person || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Partner Contact Email
                  </p>
                  <p className="text-gray-700">
                    {selectedCenter.partner_contact_email || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Center Type
                  </p>
                  <Badge variant="outline">
                    {selectedCenter.center_type || "—"}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Region
                  </p>
                  <p className="text-gray-700">
                    {selectedCenter.region || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Country
                  </p>
                  <p className="text-gray-700">
                    {selectedCenter.country || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Status
                  </p>
                  <Badge
                    variant={
                      selectedCenter.status === "active"
                        ? "success"
                        : "secondary"
                    }
                  >
                    {selectedCenter.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Year of Establishment
                  </p>
                  <p className="text-gray-700">
                    {selectedCenter.year_of_establishment || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Approval Status
                  </p>
                  <p className="text-gray-700">
                    {selectedCenter.approval_status || "—"}
                  </p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="border-t pt-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  Contact Information
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Center Head
                    </p>
                    <p className="text-gray-700">
                      {selectedCenter.center_head || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Email
                    </p>
                    <div className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-gray-400" />
                      <p className="text-gray-700 text-sm">
                        {selectedCenter.email || "—"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Mobile Number
                    </p>
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-gray-400" />
                      <p className="text-gray-700 text-sm">
                        {selectedCenter.mobile_number || "—"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Total Students
                    </p>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-gray-500" />
                      <p className="font-semibold text-blue-600 text-lg">
                        {selectedCenter.total_students ??
                          selectedCenter.batches?.reduce(
                            (sum, batch) =>
                              sum + (batch.enrolled_students || 0),
                            0,
                          ) ??
                          0}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Total Batches
                    </p>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-gray-500" />
                      <p className="font-semibold text-blue-600 text-lg">
                        {selectedCenter.batches?.length ?? 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="border-t pt-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  Address
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Street Address
                    </p>
                    <div className="flex items-start gap-1">
                      <MapPin className="w-3 h-3 text-gray-400 mt-1" />
                      <p className="text-gray-700 text-sm">
                        {selectedCenter.address || "—"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Country
                    </p>
                    <p className="text-gray-700">
                      {selectedCenter.country || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      City
                    </p>
                    <p className="text-gray-700">
                      {selectedCenter.city || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      State
                    </p>
                    <p className="text-gray-700">
                      {selectedCenter.state || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Courses */}
              {((selectedCenter.courses && selectedCenter.courses.length > 0) ||
                (selectedCenter.courses_offered &&
                  selectedCenter.courses_offered.length > 0)) && (
                <div className="border-t pt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">
                    <BookOpen className="w-4 h-4 inline mr-1" />
                    Courses Offered (
                    {selectedCenter.courses?.length ||
                      selectedCenter.courses_offered?.length ||
                      0}
                    )
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(selectedCenter.courses?.length
                      ? selectedCenter.courses.map(
                          (course) => course.course_name,
                        )
                      : selectedCenter.courses_offered || []
                    ).map((course, idx) => (
                      <Badge
                        key={`${course}-${idx}`}
                        variant="outline"
                        className="text-xs"
                      >
                        {course}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  Metadata
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Created At
                    </p>
                    <p className="text-gray-700">
                      {selectedCenter.created_at
                        ? new Date(selectedCenter.created_at).toLocaleString(
                            "en-GB",
                          )
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Last Updated
                    </p>
                    <p className="text-gray-700">
                      {selectedCenter.updated_at
                        ? new Date(selectedCenter.updated_at).toLocaleString(
                            "en-GB",
                          )
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <button
              onClick={() => setShowViewDialog(false)}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  // Return with or without MainLayout based on embedded prop
  if (embedded) {
    return content;
  }

  return <MainLayout>{content}</MainLayout>;
};

export default OrganizationCentersPage;
