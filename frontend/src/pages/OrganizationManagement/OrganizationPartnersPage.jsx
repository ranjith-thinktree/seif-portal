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
  AlertCircle,
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
  const [showBlockedDeleteDialog, setShowBlockedDeleteDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch Partners
  const fetchPartners = useCallback(async () => {
    try {
      setLoading(true);
      // Request all partners with a large limit for client-side pagination
      const response = await getPartners({
        limit: 1000,
        approval_status: "approved",
      });

      if (response.success) {
        // Filter only approved partners (status = 'active' or 'inactive')
        const approvedPartners = response.data.filter(
          (partner) =>
            partner.status === "active" || partner.status === "inactive",
        );
        setPartners(approvedPartners);
        setFilteredPartners(approvedPartners);
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error("Error fetching partners:", error);
      toast.error(
        error.message || "Failed to fetch partners. Please try again.",
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
        error.message || "Failed to delete partner. Please try again.",
      );
    } finally {
      setDeleting(false);
    }
  };

  // Handle Reset Password
  const handleResetPassword = async () => {
    if (!selectedPartner) return;

    // Use the linked user_id (not the partner table id)
    const targetUserId = selectedPartner.user_id;
    if (!targetUserId) {
      toast.error(
        "No user account linked to this partner. Cannot reset password.",
      );
      setShowResetPasswordDialog(false);
      setSelectedPartner(null);
      return;
    }

    try {
      setResettingPassword(true);
      const response = await resetUserPassword(targetUserId);

      if (response.success) {
        toast.success(
          "Password reset link sent to partner's email successfully",
        );
        setShowResetPasswordDialog(false);
        setSelectedPartner(null);
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error(
        error.message ||
          "Failed to send password reset link. Please try again.",
      );
    } finally {
      setResettingPassword(false);
    }
  };

  // Handle Export
  const handleExport = useCallback(() => {
    try {
      if (filteredPartners.length === 0) {
        toast.warn("No data to export.");
        return;
      }
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
        `partners_${new Date().toISOString().split("T")[0]}.csv`,
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
                onClick={() => handleViewCenters(row.original)}
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
              <DropdownMenuItem
                onClick={() => {
                  setSelectedPartner(row.original);
                  setShowResetPasswordDialog(true);
                }}
              >
                <Key className="w-4 h-4 mr-2" />
                Reset Password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={() => {
                  setSelectedPartner(row.original);
                  if (row.original.total_centers > 0) {
                    setShowBlockedDeleteDialog(true);
                  } else {
                    setShowDeleteDialog(true);
                  }
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
      searchableFields: ["name", "partner_id", "organization_type"],
      filterGroups: [
        {
          id: "type",
          label: "Organization Type",
          options: [
            ...new Set(
              partners.map((p) => p.organization_type).filter(Boolean),
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
    [partners],
  );

  // Handle Search
  const handleSearch = useCallback((searchResults) => {
    setFilteredPartners(searchResults);
    setCurrentPage(1);
  }, []);

  // Paginated Data - slice data for current page
  const paginatedPartners = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredPartners.slice(startIndex, endIndex);
  }, [filteredPartners, currentPage, pageSize]);

  // Pagination Object
  const paginationConfig = useMemo(() => {
    const totalPages = Math.ceil(filteredPartners.length / pageSize);
    return {
      page: currentPage,
      limit: pageSize,
      total: filteredPartners.length,
      totalPages: totalPages || 1,
    };
  }, [filteredPartners.length, currentPage, pageSize]);

  // Handle View Partner Details
  const handleViewCenters = (partner) => {
    setSelectedPartner(partner);
    setShowViewDialog(true);
  };

  // Handle Edit
  const handleEdit = (partner) => {
    toast.info("Edit functionality coming soon.");
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
        data={paginatedPartners}
        pagination={paginationConfig}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
        isLoading={loading}
        emptyMessage="No partners found"
        storageKey="organization-partners-table"
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

      {/* Blocked Delete Dialog — shown when partner still has centers */}
      <Dialog
        open={showBlockedDeleteDialog}
        onOpenChange={setShowBlockedDeleteDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              Cannot Delete Partner
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">{selectedPartner?.name}</span>{" "}
              cannot be deleted because it has{" "}
              <span className="font-bold text-amber-600">
                {selectedPartner?.total_centers}{" "}
                {selectedPartner?.total_centers === 1 ? "center" : "centers"}
              </span>{" "}
              associated with it.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm font-medium text-amber-800 mb-2">
                To delete this partner, follow these steps:
              </p>
              <ol className="list-decimal list-inside text-sm text-amber-700 space-y-1">
                <li>Go to the Centers section</li>
                <li>
                  Delete all centers belonging to{" "}
                  <span className="font-medium">{selectedPartner?.name}</span>
                </li>
                <li>Return here and delete the partner</li>
              </ol>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowBlockedDeleteDialog(false)}>
              Got It
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Partner Details Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Partner Details
            </DialogTitle>
            <DialogDescription>
              Full information for {selectedPartner?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedPartner && (
            <div className="space-y-4 py-2">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Partner Name
                  </p>
                  <p className="font-semibold text-gray-900">
                    {selectedPartner.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Partner ID
                  </p>
                  <p className="text-gray-700">
                    {selectedPartner.partner_id || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Organization Type
                  </p>
                  <p className="text-gray-700">
                    {selectedPartner.organization_type || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Status
                  </p>
                  <Badge
                    variant={
                      selectedPartner.status === "active"
                        ? "success"
                        : "secondary"
                    }
                  >
                    {selectedPartner.status}
                  </Badge>
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
                      Contact Person
                    </p>
                    <p className="text-gray-700">
                      {selectedPartner.contact_person || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Email
                    </p>
                    <div className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-gray-400" />
                      <p className="text-gray-700 text-sm">
                        {selectedPartner.contact_email || "—"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Phone
                    </p>
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-gray-400" />
                      <p className="text-gray-700 text-sm">
                        {selectedPartner.contact_phone || "—"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Total Centers
                    </p>
                    <p className="font-semibold text-blue-600 text-lg">
                      {selectedPartner.total_centers ?? 0}
                    </p>
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
                        {[
                          selectedPartner.address_line1,
                          selectedPartner.address_line2,
                        ]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      City
                    </p>
                    <p className="text-gray-700">
                      {selectedPartner.city || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      State
                    </p>
                    <p className="text-gray-700">
                      {selectedPartner.state || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Postal Code
                    </p>
                    <p className="text-gray-700">
                      {selectedPartner.postal_code || "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowViewDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
