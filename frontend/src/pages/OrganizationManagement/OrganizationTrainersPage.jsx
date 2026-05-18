import { useState, useEffect, useCallback, useMemo } from "react";
import EnhancedDataTable from "../../components/common/EnhancedDataTable";
import AdvancedSearchBar from "../../components/common/AdvancedSearchBar";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Eye,
  Edit,
  Plus,
  Trash2,
  Mail,
  Phone,
  Users,
  MoreHorizontal,
  Download,
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
  getTrainers,
  deleteTrainer,
  getTrainerFilterOptions,
} from "../../services/trainer.service";
import TrainerFormModal from "../../components/dialogs/TrainerFormModal";

/**
 * Organization Trainers Page
 * Shows trainers with filters for partner-wise and center-wise viewing
 */
const OrganizationTrainersPage = ({ embedded = false }) => {
  // State Management
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState("create"); // 'create' or 'edit'
  const [table, setTable] = useState(null);

  // Search, filters and sort
  const [filterOptions, setFilterOptions] = useState({
    partners: [],
    centers: [],
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState({
    partner_id: [],
    center_id: [],
    status: [],
  });
  const [sortBy, setSortBy] = useState("trainer_name");
  const [sortOrder, setSortOrder] = useState("asc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch Filter Options
  const fetchFilterOptions = useCallback(async () => {
    try {
      const response = await getTrainerFilterOptions();
      if (response.success) {
        setFilterOptions(response.data);
      }
    } catch (error) {
      console.error("Error fetching filter options:", error);
    }
  }, []);

  // Fetch Trainers
  const fetchTrainers = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        limit: 1000,
        search: debouncedSearchQuery || "",
      };

      const response = await getTrainers(params);

      if (response.success) {
        setTrainers(response.data);
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error("Error fetching trainers:", error);
      toast.error(
        error.message || "Failed to fetch trainers. Please try again.",
      );
      setTrainers([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchQuery]);

  // Debounce search to match Data pages behavior
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  useEffect(() => {
    fetchTrainers();
  }, [fetchTrainers]);

  // Auto-clear center filter when selected partner filter changes
  useEffect(() => {
    const selectedPartners = activeFilters.partner_id || [];
    if (!selectedPartners.length) return;

    const allowedCenterIds = new Set(
      filterOptions.centers
        .filter((c) => selectedPartners.includes(c.partner_id))
        .map((c) => c.id),
    );

    const currentCenterIds = activeFilters.center_id || [];
    const validCenterIds = currentCenterIds.filter((id) =>
      allowedCenterIds.has(id),
    );

    if (validCenterIds.length !== currentCenterIds.length) {
      setActiveFilters((prev) => ({ ...prev, center_id: validCenterIds }));
    }
  }, [
    activeFilters.partner_id,
    activeFilters.center_id,
    filterOptions.centers,
  ]);

  // Handle Delete
  const handleDelete = async () => {
    if (!selectedTrainer) return;

    try {
      setDeleting(true);
      const response = await deleteTrainer(selectedTrainer.id);

      if (response.success) {
        toast.success("Trainer deleted successfully");
        fetchTrainers();
        setShowDeleteDialog(false);
        setSelectedTrainer(null);
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error("Error deleting trainer:", error);
      toast.error(
        error.message || "Failed to delete trainer. Please try again.",
      );
    } finally {
      setDeleting(false);
    }
  };

  // Handle Create/Edit
  const handleFormSubmit = async () => {
    fetchTrainers();
    setShowFormModal(false);
  };

  // Handle Edit Button
  const handleEdit = useCallback((trainer) => {
    setSelectedTrainer(trainer);
    setFormMode("edit");
    setShowFormModal(true);
  }, []);

  const handleView = useCallback((trainer) => {
    setSelectedTrainer(trainer);
    setFormMode("view");
    setShowFormModal(true);
  }, []);

  // Handle Create Button
  const handleCreate = () => {
    setSelectedTrainer(null);
    setFormMode("create");
    setShowFormModal(true);
  };

  // Filtered center options (cascade from selected partner filters)
  const filteredCenterOptions = useMemo(() => {
    const selectedPartners = activeFilters.partner_id || [];
    if (!selectedPartners.length) {
      return filterOptions.centers;
    }
    return filterOptions.centers.filter((center) =>
      selectedPartners.includes(center.partner_id),
    );
  }, [activeFilters.partner_id, filterOptions.centers]);

  const handleFilterChange = (key, value) => {
    setActiveFilters((prev) => {
      if (key === "partner_id") {
        return {
          ...prev,
          partner_id: value,
          center_id: [],
        };
      }

      return {
        ...prev,
        [key]: value,
      };
    });
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setActiveFilters({
      partner_id: [],
      center_id: [],
      status: [],
    });
    setCurrentPage(1);
  };

  const handleSortChange = (field, order) => {
    setSortBy(field);
    setSortOrder(order);
    setCurrentPage(1);
  };

  const getDocumentCompleteness = useCallback((trainer) => {
    const availableCount = [
      trainer.resume_file_url,
      trainer.qualification_certificate_url,
      trainer.id_proof_file_url,
    ].filter(Boolean).length;

    if (availableCount === 3) return "complete";
    if (availableCount === 0) return "missing";
    return "partial";
  }, []);

  // Columns for data table
  const columns = useMemo(
    () => [
      {
        accessorKey: "trainer_name",
        header: "Trainer Name",
        cell: ({ row }) => (
          <div className="font-medium">{row.original.trainer_name}</div>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-sm">
            <Mail size={16} className="text-gray-400" />
            <a
              href={`mailto:${row.original.email}`}
              className="text-blue-600 hover:underline"
            >
              {row.original.email}
            </a>
          </div>
        ),
      },
      {
        accessorKey: "mobile_no",
        header: "Mobile",
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-sm">
            <Phone size={16} className="text-gray-400" />
            {row.original.mobile_no}
          </div>
        ),
      },
      {
        accessorKey: "course_name",
        header: "Course",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.course_name || "-"}</span>
        ),
      },
      {
        accessorKey: "qualification",
        header: "Qualification",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.qualification || "-"}</span>
        ),
      },
      {
        accessorKey: "document_status",
        header: "Documents",
        cell: ({ row }) => {
          const status = getDocumentCompleteness(row.original);
          const statusClasses =
            status === "complete"
              ? "bg-green-100 text-green-800"
              : status === "partial"
                ? "bg-amber-100 text-amber-800"
                : "bg-gray-100 text-gray-700";

          return (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusClasses}`}
            >
              {status}
            </span>
          );
        },
      },
      {
        accessorKey: "date_of_joining",
        header: "Date of Joining",
        cell: ({ row }) => {
          const dateValue = row.original.date_of_joining;
          if (!dateValue) return <span className="text-sm">-</span>;

          const parsedDate = new Date(dateValue);
          if (Number.isNaN(parsedDate.getTime())) {
            return <span className="text-sm">-</span>;
          }

          return (
            <span className="text-sm">
              {parsedDate.toLocaleDateString("en-GB")}
            </span>
          );
        },
      },
      {
        accessorKey: "partner_name",
        header: "Partner",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.partner_name}</span>
        ),
      },
      {
        accessorKey: "center_name",
        header: "Center",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.center_name}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.status === "active"
                ? "default"
                : row.original.status === "inactive"
                  ? "secondary"
                  : "destructive"
            }
            className="capitalize"
          >
            {row.original.status}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleView(row.original)}
                className="cursor-pointer"
              >
                <Eye size={16} className="mr-2" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleEdit(row.original)}
                className="cursor-pointer"
              >
                <Edit size={16} className="mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedTrainer(row.original);
                  setShowDeleteDialog(true);
                }}
                className="cursor-pointer text-red-600"
              >
                <Trash2 size={16} className="mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [getDocumentCompleteness, handleEdit, handleView],
  );

  const filterGroups = useMemo(
    () => [
      {
        label: "Partner",
        key: "partner_id",
        multi: true,
        options: (filterOptions.partners || []).map((partner) => ({
          label: partner.name,
          value: partner.id,
        })),
      },
      {
        label: "Center",
        key: "center_id",
        multi: true,
        options: filteredCenterOptions.map((center) => ({
          label: center.name,
          value: center.id,
        })),
      },
      {
        label: "Status",
        key: "status",
        multi: true,
        options: [
          { label: "Active", value: "active" },
          { label: "Inactive", value: "inactive" },
          { label: "Deleted", value: "deleted" },
        ],
      },
    ],
    [filterOptions.partners, filteredCenterOptions],
  );

  const sortOptions = useMemo(
    () => [
      { label: "Trainer Name", value: "trainer_name" },
      { label: "Email", value: "email" },
      { label: "Mobile", value: "mobile_no" },
      { label: "Course", value: "course_name" },
      { label: "Qualification", value: "qualification" },
      { label: "Partner", value: "partner_name" },
      { label: "Center", value: "center_name" },
      { label: "Status", value: "status" },
      { label: "Date of Joining", value: "date_of_joining" },
    ],
    [],
  );

  const filteredAndSortedTrainers = useMemo(() => {
    const selectedPartners = activeFilters.partner_id || [];
    const selectedCenters = activeFilters.center_id || [];
    const selectedStatuses = activeFilters.status || [];

    const filtered = (trainers || []).filter((trainer) => {
      if (
        selectedPartners.length &&
        !selectedPartners.includes(trainer.partner_id)
      ) {
        return false;
      }

      if (
        selectedCenters.length &&
        !selectedCenters.includes(trainer.center_id)
      ) {
        return false;
      }

      if (
        selectedStatuses.length &&
        !selectedStatuses.includes(trainer.status)
      ) {
        return false;
      }

      return true;
    });

    if (!sortBy) return filtered;

    return [...filtered].sort((a, b) => {
      const aValue = a?.[sortBy];
      const bValue = b?.[sortBy];

      const isDateSort = sortBy === "date_of_joining";

      if (isDateSort) {
        const aDate = aValue ? new Date(aValue).getTime() : 0;
        const bDate = bValue ? new Date(bValue).getTime() : 0;
        return sortOrder === "asc" ? aDate - bDate : bDate - aDate;
      }

      const aStr = String(aValue ?? "").toLowerCase();
      const bStr = String(bValue ?? "").toLowerCase();

      if (aStr < bStr) return sortOrder === "asc" ? -1 : 1;
      if (aStr > bStr) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [trainers, activeFilters, sortBy, sortOrder]);

  const handleExport = useCallback(() => {
    const rows = filteredAndSortedTrainers;
    if (!rows.length) {
      toast.info("No data to export");
      return;
    }
    const headers = [
      "Trainer Name",
      "Email",
      "Mobile",
      "Course Name",
      "Qualification",
      "Document Status",
      "Date of Joining",
      "Partner Name",
      "Center Name",
      "Status",
    ];
    const csvRows = rows.map((t) => [
      t.trainer_name ?? "",
      t.email ?? "",
      t.mobile_no ?? "",
      t.course_name ?? "",
      t.qualification ?? "",
      getDocumentCompleteness(t),
      t.date_of_joining
        ? new Date(t.date_of_joining).toLocaleDateString("en-GB")
        : "",
      t.partner_name ?? "",
      t.center_name ?? "",
      t.status ?? "",
    ]);
    const csvContent = [headers, ...csvRows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "trainers.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredAndSortedTrainers, getDocumentCompleteness]);

  // Paginated data
  const paginatedTrainers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedTrainers.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedTrainers, currentPage, pageSize]);

  const pagination = useMemo(() => {
    const totalItems = filteredAndSortedTrainers.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    return {
      page: currentPage,
      limit: pageSize,
      total: totalItems,
      totalPages,
    };
  }, [filteredAndSortedTrainers.length, currentPage, pageSize]);

  return (
    <div className={!embedded ? "p-6" : ""}>
      {/* Page Header */}
      {!embedded && (
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Trainer Management
            </h1>
            <p className="text-gray-600 mt-2">
              Manage trainers and their profile information
            </p>
          </div>
          <Button onClick={handleExport} variant="outline" className="shrink-0">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      )}

      <div className="mb-6 flex items-center gap-3">
        <div className="flex-1">
          <AdvancedSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by trainer name, email, mobile, course..."
            table={table}
            storageKey="organization-trainers"
            filterGroups={filterGroups}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            sortOptions={sortOptions}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={handleSortChange}
          />
        </div>
        <Button
          onClick={handleCreate}
          className="gap-2 bg-primary-500 hover:bg-primary-600 shrink-0"
        >
          <Plus size={16} />
          Add Trainer
        </Button>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <EnhancedDataTable
          columns={columns}
          data={paginatedTrainers}
          pagination={pagination}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newPageSize) => {
            setPageSize(newPageSize);
            setCurrentPage(1);
          }}
          isLoading={loading}
          emptyMessage="No trainers found. Create one to get started."
          storageKey="organization-trainers"
          onTableReady={setTable}
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationModal
        open={showDeleteDialog}
        title="Delete Trainer"
        message="Are you sure you want to delete this trainer? This action cannot be undone."
        itemCount={1}
        itemType="trainer"
        onConfirm={handleDelete}
        onClose={() => {
          setShowDeleteDialog(false);
          setSelectedTrainer(null);
        }}
        loading={deleting}
      />

      {/* Trainer Form Modal */}
      <TrainerFormModal
        isOpen={showFormModal}
        mode={formMode}
        trainer={selectedTrainer}
        filterOptions={filterOptions}
        availableCenters={
          selectedTrainer
            ? filterOptions.centers.filter(
                (c) => c.partner_id === selectedTrainer.partner_id,
              )
            : filteredCenterOptions
        }
        onClose={() => setShowFormModal(false)}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
};

export default OrganizationTrainersPage;
