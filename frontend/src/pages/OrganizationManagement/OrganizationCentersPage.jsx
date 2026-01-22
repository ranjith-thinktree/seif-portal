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
} from "lucide-react";
import { toast } from "react-toastify";
import ConfirmationModal from "../../components/common/ConfirmationModal";
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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch Centers
  const fetchCenters = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getCenters();

      if (response.success) {
        // Filter only approved centers (status = 'active' or 'inactive')
        const approvedCenters = response.data.filter(
          (center) => center.status === "active" || center.status === "inactive"
        );
        setCenters(approvedCenters);
        setFilteredCenters(approvedCenters);
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error("Error fetching centers:", error);
      toast.error(
        error.message || "Failed to fetch centers. Please try again."
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
        error.message || "Failed to delete center. Please try again."
      );
    } finally {
      setDeleting(false);
    }
  };

  // Handle Export
  const handleExport = useCallback(() => {
    try {
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
        `centers_${new Date().toISOString().split("T")[0]}.csv`
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
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewDetails(row.original)}
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(row.original)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedCenter(row.original);
                setShowDeleteDialog(true);
              }}
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </Button>
          </div>
        ),
      },
    ],
    []
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
            })
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
    [centers]
  );

  // Handle Search
  const handleSearch = useCallback((searchResults) => {
    setFilteredCenters(searchResults);
    setCurrentPage(1);
  }, []);

  // Handle View Details
  const handleViewDetails = (center) => {
    // Navigate to center details page
    // TODO: Implement navigation
    console.log("View details for center:", center.id);
  };

  // Handle Edit
  const handleEdit = (center) => {
    // Navigate to edit page
    // TODO: Implement navigation
    console.log("Edit center:", center.id);
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
        data={filteredCenters}
        loading={loading}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        emptyMessage="No centers found"
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
    </div>
  );

  // Return with or without MainLayout based on embedded prop
  if (embedded) {
    return content;
  }

  return <MainLayout>{content}</MainLayout>;
};

export default OrganizationCentersPage;
