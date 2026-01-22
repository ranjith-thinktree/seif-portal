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
  Key,
} from "lucide-react";
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
import { getPartners, deletePartner } from "../../services/data.service";
import { resetUserPassword } from "../../services/user.service";

/**
 * Organization Partners Page
 * Shows approved partners with detailed contact and address information
 * Different from Data Partners Page which shows pending approvals
 */
const OrganizationPartnersPage = ({ embedded = false }) => {
  // State Management
  const [partners, setPartners] = useState([]);
  const [filteredPartners, setFilteredPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch Partners
  const fetchPartners = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getPartners();

      if (response.success) {
        // Filter only approved partners (status = 'active' or 'inactive')
        const approvedPartners = response.data.filter(
          (partner) =>
            partner.status === "active" || partner.status === "inactive"
        );
        setPartners(approvedPartners);
        setFilteredPartners(approvedPartners);
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error("Error fetching partners:", error);
      toast.error(
        error.message || "Failed to fetch partners. Please try again."
      );
      setPartners([]);
      setFilteredPartners([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  // Handle Delete
  const handleDelete = async () => {
    if (!selectedPartner) return;

    try {
      setDeleting(true);
      const response = await deletePartner(selectedPartner.id);

      if (response.success) {
        toast.success("Partner deleted successfully");
        fetchPartners();
        setShowDeleteDialog(false);
        setSelectedPartner(null);
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error("Error deleting partner:", error);
      toast.error(
        error.message || "Failed to delete partner. Please try again."
      );
    } finally {
      setDeleting(false);
    }
  };

  // Handle Reset Password
  const handleResetPassword = async () => {
    if (!selectedPartner) return;

    try {
      setResettingPassword(true);
      const response = await resetUserPassword(selectedPartner.id);

      if (response.success) {
        toast.success(
          "Password reset link sent to partner's email successfully"
        );
        setShowResetPasswordDialog(false);
        setSelectedPartner(null);
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error(
        error.message || "Failed to send password reset link. Please try again."
      );
    } finally {
      setResettingPassword(false);
    }
  };

  // Handle Export
  const handleExport = useCallback(() => {
    try {
      // Prepare CSV data
      const csvData = filteredPartners.map((partner) => ({
        "Partner Name": partner.name,
        "Partner ID": partner.partner_id || "",
        "Organization Type": partner.organization_type || "",
        "Contact Person": partner.contact_person || "",
        "Contact Email": partner.contact_email || "",
        "Contact Phone": partner.contact_phone || "",
        Address: partner.address_line1 || "",
        "Address Line 2": partner.address_line2 || "",
        City: partner.city || "",
        State: partner.state || "",
        "Postal Code": partner.postal_code || "",
        "Total Centers": partner.total_centers || 0,
        Status: partner.status,
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
        `partners_${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${csvData.length} partners to CSV`);
    } catch (error) {
      console.error("Error exporting:", error);
      toast.error("Failed to export data. Please try again.");
    }
  }, [filteredPartners]);

  // Table Columns Definition
  const columns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Partner Name",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.name}</span>
            {row.original.partner_id && (
              <span className="text-xs text-gray-500">
                ID: {row.original.partner_id}
              </span>
            )}
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "organization_type",
        header: "Type",
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.organization_type}</Badge>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "contact_person",
        header: "Incharge",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">
              {row.original.contact_person || "-"}
            </span>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
              <Mail className="w-3 h-3" />
              <span>{row.original.contact_email || "-"}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Phone className="w-3 h-3" />
              <span>{row.original.contact_phone || "-"}</span>
            </div>
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "address",
        header: "Address",
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <div className="flex items-start gap-1 text-sm">
              <MapPin className="w-3 h-3 mt-1 text-gray-500" />
              <span>
                {row.original.address_line1 || "-"}
                {row.original.address_line2 &&
                  `, ${row.original.address_line2}`}
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {row.original.city}, {row.original.state}{" "}
              {row.original.postal_code}
            </span>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "total_centers",
        header: "Centers",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Building2 className="w-4 h-4 text-gray-500" />
            <span className="font-medium">
              {row.original.total_centers || 0}
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
              onClick={() => handleViewCenters(row.original)}
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
                setSelectedPartner(row.original);
                setShowResetPasswordDialog(true);
              }}
            >
              <Key className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedPartner(row.original);
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
      searchableFields: ["name", "partner_id", "organization_type"],
      filterGroups: [
        {
          id: "type",
          label: "Organization Type",
          options: [
            ...new Set(
              partners.map((p) => p.organization_type).filter(Boolean)
            ),
          ].map((type) => ({
            value: type,
            label: type,
          })),
          filterFn: (partner, selectedValues) =>
            selectedValues.length === 0 ||
            selectedValues.includes(partner.organization_type),
        },
        {
          id: "city",
          label: "City",
          options: [
            ...new Set(partners.map((p) => p.city).filter(Boolean)),
          ].map((city) => ({
            value: city,
            label: city,
          })),
          filterFn: (partner, selectedValues) =>
            selectedValues.length === 0 ||
            selectedValues.includes(partner.city),
        },
        {
          id: "state",
          label: "State",
          options: [
            ...new Set(partners.map((p) => p.state).filter(Boolean)),
          ].map((state) => ({
            value: state,
            label: state,
          })),
          filterFn: (partner, selectedValues) =>
            selectedValues.length === 0 ||
            selectedValues.includes(partner.state),
        },
        {
          id: "status",
          label: "Status",
          options: [
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ],
          filterFn: (partner, selectedValues) =>
            selectedValues.length === 0 ||
            selectedValues.includes(partner.status),
        },
      ],
    }),
    [partners]
  );

  // Handle Search
  const handleSearch = useCallback((searchResults) => {
    setFilteredPartners(searchResults);
    setCurrentPage(1);
  }, []);

  // Handle View Centers
  const handleViewCenters = (partner) => {
    // Navigate to centers page filtered by this partner
    // TODO: Implement navigation
    console.log("View centers for partner:", partner.id);
  };

  // Handle Edit
  const handleEdit = (partner) => {
    // Navigate to edit page
    // TODO: Implement navigation
    console.log("Edit partner:", partner.id);
  };

  // Render Content
  const content = (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Partners</h1>
          <p className="text-gray-600 mt-1">
            Manage partner organizations and their contact information
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleExport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => console.log("Add Partner")}>
            <Plus className="w-4 h-4 mr-2" />
            Add Partner
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-sm text-gray-600">Total Partners</div>
          <div className="text-2xl font-bold">{partners.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-sm text-gray-600">Active Partners</div>
          <div className="text-2xl font-bold text-green-600">
            {partners.filter((p) => p.status === "active").length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-sm text-gray-600">Total Centers</div>
          <div className="text-2xl font-bold">
            {partners.reduce((sum, p) => sum + (p.total_centers || 0), 0)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-sm text-gray-600">Organization Types</div>
          <div className="text-2xl font-bold">
            {
              new Set(partners.map((p) => p.organization_type).filter(Boolean))
                .size
            }
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <AdvancedSearchBar
        data={partners}
        searchConfig={searchConfig}
        onSearch={handleSearch}
        placeholder="Search partners by name, ID, or type..."
      />

      {/* Data Table */}
      <EnhancedDataTable
        columns={columns}
        data={filteredPartners}
        loading={loading}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        emptyMessage="No partners found"
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationModal
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Partner"
        message={`Are you sure you want to delete partner "${selectedPartner?.name}"? This action cannot be undone and will also delete all associated centers and data.`}
        itemCount={1}
        items={selectedPartner ? [selectedPartner] : []}
        loading={deleting}
        itemType="partners"
      />

      {/* Reset Password Dialog */}
      <Dialog
        open={showResetPasswordDialog}
        onOpenChange={setShowResetPasswordDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Send password reset link to{" "}
              <span className="font-semibold">{selectedPartner?.name}</span>?
              <br />
              <span className="text-xs text-gray-500 mt-2 block">
                Email will be sent to: {selectedPartner?.contact_email}
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowResetPasswordDialog(false)}
              disabled={resettingPassword}
            >
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={resettingPassword}>
              {resettingPassword ? "Sending..." : "Send Reset Link"}
            </Button>
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

export default OrganizationPartnersPage;
