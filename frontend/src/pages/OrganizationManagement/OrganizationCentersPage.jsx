import { useState, useEffect, useCallback, useMemo } from "react";
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
import ConfirmationModal from "../../components/common/ConfirmationModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { getCenters, deleteCenter } from "../../services/data.service";

/**
 * Organization Centers Page
 * Shows approved centers with detailed contact and address information
 * Different from Data Centers Page which shows pending approvals
 */
const OrganizationCentersPage = ({ embedded = false }) => {
  // State Management
  const [centers, setCenters] = useState([]);
  const [filteredCenters, setFilteredCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch Centers
  const fetchCenters = useCallback(async () => {
    try {
      setLoading(true);
      // Request all centers with a large limit for client-side pagination
      const response = await getCenters({
        limit: 1000,
        approval_status: "approved",
      });

      if (response.success) {
        // Filter only approved centers (status = 'active' or 'inactive')
        const approvedCenters = response.data.filter(
          (center) =>
            center.status === "active" || center.status === "inactive",
        );
        setCenters(approvedCenters);
        setFilteredCenters(approvedCenters);
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error("Error fetching centers:", error);
      toast.error(
        error.message || "Failed to fetch centers. Please try again.",
      );
      setCenters([]);
      setFilteredCenters([]);
    } finally {
      setLoading(false);
    }
  }, []);

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

  // Handle Export
  const handleExport = useCallback(() => {
    try {
      if (filteredCenters.length === 0) {
        toast.warn("No data to export.");
        return;
      }
      // Prepare CSV data
      const csvData = filteredCenters.map((center) => ({
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
      const headers = Object.keys(csvData[0]).join(",");
      const rows = csvData.map((row) => Object.values(row).join(","));
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
  }, [filteredCenters]);

  // Table Columns Definition
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
          <Badge
            variant={row.original.status === "active" ? "success" : "secondary"}
          >
            {row.original.status}
          </Badge>
        ),
        enableSorting: true,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => handleViewDetails(row.original)}
              >
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleEdit(row.original)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={() => {
                  setSelectedCenter(row.original);
                  setShowDeleteDialog(true);
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [],
  );

  // Search Configuration
  const searchConfig = useMemo(
    () => ({
      searchableFields: ["center_name", "partner_name"],
      filterGroups: [
        {
          id: "partner",
          label: "Partner",
          options: [
            ...new Set(centers.map((c) => c.partner_name).filter(Boolean)),
          ].map((partner) => ({
            value: partner,
            label: partner,
          })),
          filterFn: (center, selectedValues) =>
            selectedValues.length === 0 ||
            selectedValues.includes(center.partner_name),
        },
        {
          id: "region",
          label: "Region",
          options: [
            ...new Set(centers.map((c) => c.region).filter(Boolean)),
          ].map((region) => ({
            value: region,
            label: region,
          })),
          filterFn: (center, selectedValues) =>
            selectedValues.length === 0 ||
            selectedValues.includes(center.region),
        },
        {
          id: "center_type",
          label: "Center Type",
          options: [
            ...new Set(centers.map((c) => c.center_type).filter(Boolean)),
          ].map((type) => ({
            value: type,
            label: type,
          })),
          filterFn: (center, selectedValues) =>
            selectedValues.length === 0 ||
            selectedValues.includes(center.center_type),
        },
        {
          id: "city",
          label: "City",
          options: [...new Set(centers.map((c) => c.city).filter(Boolean))].map(
            (city) => ({
              value: city,
              label: city,
            }),
          ),
          filterFn: (center, selectedValues) =>
            selectedValues.length === 0 || selectedValues.includes(center.city),
        },
        {
          id: "state",
          label: "State",
          options: [
            ...new Set(centers.map((c) => c.state).filter(Boolean)),
          ].map((state) => ({
            value: state,
            label: state,
          })),
          filterFn: (center, selectedValues) =>
            selectedValues.length === 0 ||
            selectedValues.includes(center.state),
        },
        {
          id: "status",
          label: "Status",
          options: [
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ],
          filterFn: (center, selectedValues) =>
            selectedValues.length === 0 ||
            selectedValues.includes(center.status),
        },
      ],
    }),
    [centers],
  );

  // Handle Search
  const handleSearch = useCallback((searchResults) => {
    setFilteredCenters(searchResults);
    setCurrentPage(1);
  }, []);

  // Paginated Data - slice data for current page
  const paginatedCenters = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredCenters.slice(startIndex, endIndex);
  }, [filteredCenters, currentPage, pageSize]);

  // Pagination Object
  const paginationConfig = useMemo(() => {
    const totalPages = Math.ceil(filteredCenters.length / pageSize);
    return {
      page: currentPage,
      limit: pageSize,
      total: filteredCenters.length,
      totalPages: totalPages || 1,
    };
  }, [filteredCenters.length, currentPage, pageSize]);

  // Handle View Details
  const handleViewDetails = (center) => {
    setSelectedCenter(center);
    setShowViewDialog(true);
  };

  // Handle Edit
  const handleEdit = (center) => {
    toast.info("Edit functionality coming soon.");
  };

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
          <Button onClick={() => console.log("Add Center")}>
            <Plus className="w-4 h-4 mr-2" />
            Add Center
          </Button>
        </div>
      </div>

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
        data={centers}
        searchConfig={searchConfig}
        onSearch={handleSearch}
        placeholder="Search centers by name or partner..."
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
      />

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

          {selectedCenter && (
            <div className="space-y-4 py-2">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
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
                        {selectedCenter.total_students ?? 0}
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
              {selectedCenter.courses_offered?.length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">
                    <BookOpen className="w-4 h-4 inline mr-1" />
                    Courses Offered ({selectedCenter.courses_offered.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedCenter.courses_offered.map((course, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {course}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
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
