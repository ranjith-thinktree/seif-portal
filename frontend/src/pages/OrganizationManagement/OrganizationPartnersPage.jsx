import { useState, useEffect, useCallback, useMemo } from "react";
import { flushSync } from "react-dom";
import { useSelector } from "react-redux";
import MainLayout from "../../components/layout/MainLayout";
import EnhancedDataTable from "../../components/common/EnhancedDataTable";
import AdvancedSearchBar from "../../components/common/AdvancedSearchBar";
import PartnerForm from "../../components/forms/PartnerForm";
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
import {
  getPartners,
  getPartnerById,
  createPartner,
  updatePartner,
  deletePartner,
} from "../../services/data.service";

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

const OrganizationPartnersPage = ({ embedded = false }) => {
  const { user } = useSelector((state) => state.auth);
  const isReadOnly = ["SEIF_READONLY", "SEIF_READONLY_DOWNLOAD"].includes(
    user?.role,
  );
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState({
    type: [],
    city: [],
    state: [],
    status: [],
  });
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingPartnerDetails, setLoadingPartnerDetails] = useState(false);
  const [showBlockedDeleteDialog, setShowBlockedDeleteDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [table, setTable] = useState(null);
  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchPartners = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getPartners({
        limit: 1000,
        approval_status: "approved",
      });

      if (!response.success) {
        throw new Error(response.message);
      }

      const approvedPartners = (Array.isArray(response.data)
        ? response.data
        : []
      ).filter(
        (partner) =>
          partner.status === "active" || partner.status === "inactive",
      );

      setPartners(approvedPartners);
    } catch (error) {
      console.error("Error fetching partners:", error);
      toast.error(
        error.message || "Failed to fetch partners. Please try again.",
      );
      setPartners([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const handleCreatePartner = async (formData) => {
    try {
      setSubmitting(true);
      await createPartner(formData);
      toast.success("Partner created successfully");
      setShowForm(false);
      setEditingPartner(null);
      fetchPartners();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to create partner"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePartner = async (formData) => {
    if (!editingPartner?.id) return;

    try {
      setSubmitting(true);
      await updatePartner(editingPartner.id, formData);
      toast.success("Partner updated successfully");
      setShowForm(false);
      setEditingPartner(null);
      fetchPartners();
    } catch (error) {
      console.error("Error updating partner:", error);
      toast.error(getApiErrorMessage(error, "Failed to update partner"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPartner) return;

    try {
      setDeleting(true);
      const response = await deletePartner(selectedPartner.id);

      if (!response.success) {
        throw new Error(response.message);
      }

      toast.success("Partner deleted successfully");
      setShowDeleteDialog(false);
      setSelectedPartner(null);
      fetchPartners();
    } catch (error) {
      console.error("Error deleting partner:", error);
      toast.error(
        error.message || "Failed to delete partner. Please try again.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = useCallback(() => {
    try {
      if (filteredAndSortedPartners.length === 0) {
        toast.warn("No data to export.");
        return;
      }

      const escapeCsvValue = (value) => {
        const normalized =
          value === null || value === undefined ? "" : String(value);
        const escaped = normalized.replace(/"/g, '""');
        return `"${escaped}"`;
      };

      const csvData = filteredAndSortedPartners.map((partner) => ({
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

      const headers = Object.keys(csvData[0]).map(escapeCsvValue).join(",");
      const rows = csvData.map((row) =>
        Object.values(row).map(escapeCsvValue).join(","),
      );
      const csv = [headers, ...rows].join("\n");

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
  }, [partners, searchTerm, activeFilters, sortBy, sortOrder]);

  const filteredAndSortedPartners = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    const filtered = partners.filter((partner) => {
      const matchesSearch =
        !normalizedSearchTerm ||
        [partner.name, partner.partner_id, partner.organization_type]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedSearchTerm));

      const matchesType =
        activeFilters.type.length === 0 ||
        activeFilters.type.includes(partner.organization_type);
      const matchesCity =
        activeFilters.city.length === 0 ||
        activeFilters.city.includes(partner.city);
      const matchesState =
        activeFilters.state.length === 0 ||
        activeFilters.state.includes(partner.state);
      const matchesStatus =
        activeFilters.status.length === 0 ||
        activeFilters.status.includes(partner.status);

      return (
        matchesSearch &&
        matchesType &&
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
  }, [partners, searchTerm, activeFilters, sortBy, sortOrder]);

  const handleSortChange = (field, order) => {
    setSortBy(field);
    setSortOrder(order);
    setCurrentPage(1);
  };

  const paginatedPartners = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAndSortedPartners.slice(startIndex, endIndex);
  }, [filteredAndSortedPartners, currentPage, pageSize]);

  const paginationConfig = useMemo(() => {
    const totalPages = Math.ceil(filteredAndSortedPartners.length / pageSize);
    return {
      page: currentPage,
      limit: pageSize,
      total: filteredAndSortedPartners.length,
      totalPages: totalPages || 1,
    };
  }, [filteredAndSortedPartners.length, currentPage, pageSize]);

  const handleViewPartner = useCallback((partner) => {
    flushSync(() => {
      setSelectedPartner(partner);
      setShowViewDialog(true);
    });
  }, []);

  const handleEdit = useCallback(async (partner) => {
    try {
      setLoadingPartnerDetails(true);
      const response = await getPartnerById(partner.id);
      setEditingPartner(response.data);
      setShowForm(true);
    } catch (error) {
      console.error("Error loading partner details:", error);
      toast.error(error.response?.data?.message || "Failed to load partner");
    } finally {
      setLoadingPartnerDetails(false);
    }
  }, []);

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
                onClick={() => {
                  setSelectedPartner(row.original);
                  setShowViewDialog(true);
                }}
              >
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </DropdownMenuItem>
              {!isReadOnly && (
                <DropdownMenuItem onClick={() => handleEdit(row.original)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {!isReadOnly && <DropdownMenuSeparator />}
              {!isReadOnly && (
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
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [handleEdit],
  );

  const filterGroups = useMemo(
    () => [
      {
        key: "type",
        label: "Organization Type",
        multi: true,
        options: [
          ...new Set(
            partners
              .map((partner) => partner.organization_type)
              .filter(Boolean),
          ),
        ].map((type) => ({ value: type, label: type })),
      },
      {
        key: "city",
        label: "City",
        multi: true,
        options: [
          ...new Set(partners.map((partner) => partner.city).filter(Boolean)),
        ].map((city) => ({ value: city, label: city })),
      },
      {
        key: "state",
        label: "State",
        multi: true,
        options: [
          ...new Set(partners.map((partner) => partner.state).filter(Boolean)),
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
    [partners],
  );

  const sortOptions = useMemo(
    () => [
      { label: "Partner Name", value: "name" },
      { label: "Partner ID", value: "partner_id" },
      { label: "Organization Type", value: "organization_type" },
      { label: "City", value: "city" },
      { label: "State", value: "state" },
      { label: "Status", value: "status" },
      { label: "Total Centers", value: "total_centers" },
    ],
    [],
  );

  const content = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Partners</h1>
          <p className="text-gray-600 mt-1">
            Manage approved partner organizations and their master data
          </p>
        </div>
        {!showForm && (
          <div className="flex items-center gap-2">
            <Button onClick={handleExport} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            {!isReadOnly && (
              <Button
                onClick={() => {
                  setEditingPartner(null);
                  setShowForm(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Partner
              </Button>
            )}
          </div>
        )}
      </div>

      {showForm ? (
        <PartnerForm
          partner={editingPartner}
          onSubmit={editingPartner ? handleUpdatePartner : handleCreatePartner}
          onCancel={() => {
            setShowForm(false);
            setEditingPartner(null);
          }}
          isLoading={submitting || loadingPartnerDetails}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-600">Total Partners</div>
              <div className="text-2xl font-bold">{partners.length}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-600">Active Partners</div>
              <div className="text-2xl font-bold text-green-600">
                {
                  partners.filter((partner) => partner.status === "active")
                    .length
                }
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-600">Total Centers</div>
              <div className="text-2xl font-bold">
                {partners.reduce(
                  (sum, partner) => sum + (partner.total_centers || 0),
                  0,
                )}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-600">Organization Types</div>
              <div className="text-2xl font-bold">
                {
                  new Set(
                    partners
                      .map((partner) => partner.organization_type)
                      .filter(Boolean),
                  ).size
                }
              </div>
            </div>
          </div>

          <AdvancedSearchBar
            value={searchTerm}
            onChange={(value) => {
              setSearchTerm(value);
              setCurrentPage(1);
            }}
            activeFilters={activeFilters}
            onFilterChange={(key, value) => {
              setActiveFilters((prev) => ({ ...prev, [key]: value }));
              setCurrentPage(1);
            }}
            onClearFilters={() => {
              setActiveFilters({
                type: [],
                city: [],
                state: [],
                status: [],
              });
              setCurrentPage(1);
            }}
            filterGroups={filterGroups}
            sortOptions={sortOptions}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={handleSortChange}
            table={table}
            storageKey="organization-partners"
            placeholder="Search partners by name, ID, or type..."
          />

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
            onTableReady={setTable}
          />
        </>
      )}

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
            <DialogDescription>
              This partner still has linked centers and must be cleaned up
              before deletion.
            </DialogDescription>
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
                <li>Delete all centers belonging to {selectedPartner?.name}</li>
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
                    {selectedPartner.partner_id || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Organization Type
                  </p>
                  <p className="text-gray-700">
                    {selectedPartner.organization_type || "-"}
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
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Account Access
                  </p>
                  <p className="text-gray-700">
                    {selectedPartner.user_id
                      ? "Linked partner account exists"
                      : "No linked account found"}
                  </p>
                </div>
              </div>

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
                      {selectedPartner.contact_person || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Email
                    </p>
                    <div className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-gray-400" />
                      <p className="text-gray-700 text-sm">
                        {selectedPartner.contact_email || "-"}
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
                        {selectedPartner.contact_phone || "-"}
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
                          .join(", ") || "-"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      City
                    </p>
                    <p className="text-gray-700">
                      {selectedPartner.city || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      State
                    </p>
                    <p className="text-gray-700">
                      {selectedPartner.state || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Postal Code
                    </p>
                    <p className="text-gray-700">
                      {selectedPartner.postal_code || "-"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3">
                  Login credentials for partner users are managed from User
                  Management.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowViewDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (embedded) {
    return content;
  }

  return <MainLayout>{content}</MainLayout>;
};

export default OrganizationPartnersPage;
