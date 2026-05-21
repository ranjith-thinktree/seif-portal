import { useCallback, useEffect, useMemo, useState } from "react";
import EnhancedDataTable from "../common/EnhancedDataTable";
import AdvancedSearchBar from "../common/AdvancedSearchBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Checkbox } from "../ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { toast } from "react-toastify";
import {
  getTrainerModules,
  createTrainerModule,
  updateTrainerModule,
  deleteTrainerModule,
} from "../../services/data.service";
import {
  BookOpen,
  Clock3,
  Download,
  Edit,
  Eye,
  MoreHorizontal,
  Plus,
  Power,
  Trash2,
} from "lucide-react";

const INITIAL_MODULE_FORM_DATA = {
  module_name: "",
  module_code: "",
  duration_months: "",
  description: "",
  is_active: true,
};

const formatDateTime = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const escapeCsvValue = (value) => {
  const normalizedValue =
    value === null || value === undefined ? "" : String(value);
  return `"${normalizedValue.replace(/"/g, '""')}"`;
};

const TrainerModulesTab = () => {
  const [modules, setModules] = useState([]);
  const [filteredModules, setFilteredModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState({
    status: [],
    duration: [],
  });
  const [sortBy, setSortBy] = useState("module_name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [table, setTable] = useState(null);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [formData, setFormData] = useState(INITIAL_MODULE_FORM_DATA);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [statusTargetModule, setStatusTargetModule] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTargetModule, setDeleteTargetModule] = useState(null);

  const fetchModules = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getTrainerModules({
        limit: 1000,
        sort_by: "module_name",
        sort_order: "asc",
      });

      if (!response.success) {
        throw new Error(response.message || "Failed to fetch trainer modules");
      }

      setModules(response.data || []);
      setFilteredModules(response.data || []);
    } catch (error) {
      console.error("Error fetching trainer modules:", error);
      toast.error(
        error.message || "Failed to fetch trainer modules. Please try again.",
      );
      setModules([]);
      setFilteredModules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  useEffect(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const nextModules = [...modules]
      .filter((mod) => {
        const matchesSearch =
          !normalizedSearch ||
          [mod.module_name, mod.module_code, mod.description]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(normalizedSearch));

        const statusValue = mod.is_active ? "active" : "inactive";
        const durationValue = String(mod.duration_months ?? "");

        const matchesStatus =
          activeFilters.status.length === 0 ||
          activeFilters.status.includes(statusValue);
        const matchesDuration =
          activeFilters.duration.length === 0 ||
          activeFilters.duration.includes(durationValue);

        return matchesSearch && matchesStatus && matchesDuration;
      })
      .sort((leftMod, rightMod) => {
        const leftValue =
          sortBy === "duration_months"
            ? Number(leftMod.duration_months || 0)
            : sortBy === "is_active"
              ? Number(leftMod.is_active)
              : String(leftMod[sortBy] || "").toLowerCase();
        const rightValue =
          sortBy === "duration_months"
            ? Number(rightMod.duration_months || 0)
            : sortBy === "is_active"
              ? Number(rightMod.is_active)
              : String(rightMod[sortBy] || "").toLowerCase();

        if (leftValue < rightValue) return sortOrder === "asc" ? -1 : 1;
        if (leftValue > rightValue) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });

    setFilteredModules(nextModules);
  }, [modules, searchTerm, activeFilters, sortBy, sortOrder]);

  const paginatedModules = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredModules.slice(startIndex, startIndex + pageSize);
  }, [filteredModules, currentPage, pageSize]);

  const paginationConfig = useMemo(() => {
    const totalPages = Math.ceil(filteredModules.length / pageSize);
    return {
      page: currentPage,
      limit: pageSize,
      total: filteredModules.length,
      totalPages: totalPages || 1,
    };
  }, [filteredModules.length, currentPage, pageSize]);

  const filterGroups = useMemo(
    () => [
      {
        label: "Status",
        key: "status",
        multi: true,
        options: [
          { label: "Active", value: "active" },
          { label: "Inactive", value: "inactive" },
        ],
      },
      {
        label: "Duration",
        key: "duration",
        multi: true,
        options: [
          ...new Set(
            modules.map((mod) => mod.duration_months).filter(Boolean),
          ),
        ]
          .sort((a, b) => a - b)
          .map((duration) => ({
            label: `${duration} month${duration === 1 ? "" : "s"}`,
            value: String(duration),
          })),
      },
    ],
    [modules],
  );

  const suggestions = useMemo(
    () =>
      modules.flatMap((mod) => {
        const nextSuggestions = [
          { value: mod.module_name, label: mod.module_name, type: "module" },
        ];
        if (mod.module_code) {
          nextSuggestions.push({
            value: mod.module_code,
            label: mod.module_code,
            type: "code",
          });
        }
        return nextSuggestions;
      }),
    [modules],
  );

  const resetForm = useCallback(() => {
    setFormData(INITIAL_MODULE_FORM_DATA);
    setEditingModule(null);
  }, []);

  const openCreateDialog = useCallback(() => {
    resetForm();
    setShowFormDialog(true);
  }, [resetForm]);

  const openEditDialog = useCallback((mod) => {
    setEditingModule(mod);
    setFormData({
      module_name: mod.module_name || "",
      module_code: mod.module_code || "",
      duration_months:
        mod.duration_months === null || mod.duration_months === undefined
          ? ""
          : String(mod.duration_months),
      description: mod.description || "",
      is_active: Boolean(mod.is_active),
    });
    setShowFormDialog(true);
  }, []);

  const openViewDialog = useCallback((mod) => {
    setSelectedModule(mod);
    setShowViewDialog(true);
  }, []);

  const openStatusDialog = useCallback((mod) => {
    setStatusTargetModule(mod);
    setShowStatusDialog(true);
  }, []);

  const openDeleteDialog = useCallback((mod) => {
    setDeleteTargetModule(mod);
    setShowDeleteDialog(true);
  }, []);

  const handleExport = useCallback(() => {
    try {
      if (filteredModules.length === 0) {
        toast.warn("No data to export.");
        return;
      }

      const headers = [
        "Module Name",
        "Module Code",
        "Duration (Months)",
        "Description",
        "Status",
      ];

      const rows = filteredModules.map((mod) => [
        mod.module_name,
        mod.module_code || "",
        mod.duration_months || "",
        mod.description || "",
        mod.is_active ? "Active" : "Inactive",
      ]);

      const csv = [headers, ...rows]
        .map((row) => row.map(escapeCsvValue).join(","))
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `trainer_modules_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${filteredModules.length} trainer modules to CSV`);
    } catch (error) {
      console.error("Error exporting trainer modules:", error);
      toast.error("Failed to export trainer modules. Please try again.");
    }
  }, [filteredModules]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.module_name.trim()) {
      toast.error("Module name is required");
      return;
    }

    if (
      formData.duration_months &&
      (!Number.isInteger(Number(formData.duration_months)) ||
        Number(formData.duration_months) < 1)
    ) {
      toast.error("Duration must be a whole number greater than 0");
      return;
    }

    const payload = {
      module_name: formData.module_name.trim(),
      module_code: formData.module_code.trim() || null,
      duration_months: formData.duration_months
        ? Number(formData.duration_months)
        : null,
      description: formData.description.trim() || null,
      is_active: formData.is_active,
    };

    try {
      setSubmitting(true);

      const response = editingModule
        ? await updateTrainerModule(editingModule.id, payload)
        : await createTrainerModule(payload);

      if (!response.success) {
        throw new Error(response.message || "Unable to save trainer module");
      }

      toast.success(
        editingModule
          ? "Trainer module updated successfully"
          : "Trainer module created successfully",
      );
      setShowFormDialog(false);
      resetForm();
      await fetchModules();
    } catch (error) {
      console.error("Error saving trainer module:", error);
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to save trainer module",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetModule) return;

    try {
      setSubmitting(true);
      const response = await deleteTrainerModule(deleteTargetModule.id);

      if (!response.success) {
        throw new Error(response.message || "Unable to delete trainer module");
      }

      toast.success("Trainer module deleted successfully");
      setShowDeleteDialog(false);
      setDeleteTargetModule(null);
      await fetchModules();
    } catch (error) {
      console.error("Error deleting trainer module:", error);
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to delete trainer module",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!statusTargetModule) return;

    try {
      setSubmitting(true);
      const response = await updateTrainerModule(statusTargetModule.id, {
        is_active: !statusTargetModule.is_active,
      });

      if (!response.success) {
        throw new Error(response.message || "Unable to update trainer module status");
      }

      toast.success(
        statusTargetModule.is_active
          ? "Trainer module deactivated successfully"
          : "Trainer module activated successfully",
      );
      setShowStatusDialog(false);
      setStatusTargetModule(null);
      await fetchModules();
    } catch (error) {
      console.error("Error updating trainer module status:", error);
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to update trainer module status",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: "module_name",
        header: "Module",
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <span className="font-medium text-gray-900">
              {row.original.module_name}
            </span>
            <span className="text-xs text-gray-500">
              {row.original.module_code || "No code"}
            </span>
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "duration_months",
        header: "Duration",
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Clock3 className="h-4 w-4 text-gray-400" />
            <span>
              {row.original.duration_months
                ? `${row.original.duration_months} month${row.original.duration_months === 1 ? "" : "s"}`
                : "-"}
            </span>
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => (
          <div className="max-w-md text-sm text-gray-600 line-clamp-3">
            {row.original.description || "-"}
          </div>
        ),
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={
              row.original.is_active
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-gray-200 bg-gray-100 text-gray-700"
            }
          >
            {row.original.is_active ? "Active" : "Inactive"}
          </Badge>
        ),
        enableSorting: true,
      },
      {
        id: "actions",
        header: "Actions",
        enableHiding: false,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openViewDialog(row.original)}>
                <Eye className="mr-2 h-4 w-4" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEditDialog(row.original)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openStatusDialog(row.original)}>
                <Power className="mr-2 h-4 w-4" />
                {row.original.is_active ? "Deactivate" : "Activate"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => openDeleteDialog(row.original)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [openDeleteDialog, openEditDialog, openStatusDialog, openViewDialog],
  );

  const totalModules = modules.length;
  const activeModules = modules.filter((mod) => mod.is_active).length;
  const inactiveModules = totalModules - activeModules;
  const uniqueDurations = new Set(
    modules.map((mod) => mod.duration_months).filter(Boolean),
  ).size;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-600">Total Modules</div>
          <div className="text-2xl font-bold">{totalModules}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-600">Active Modules</div>
          <div className="text-2xl font-bold text-green-700">{activeModules}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-600">Inactive Modules</div>
          <div className="text-2xl font-bold text-gray-700">{inactiveModules}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-600">Duration Variants</div>
          <div className="text-2xl font-bold">{uniqueDurations}</div>
        </div>
      </div>

      <AdvancedSearchBar
        value={searchTerm}
        onChange={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }}
        placeholder="Search modules by name, code, or description..."
        filterGroups={filterGroups}
        activeFilters={activeFilters}
        onFilterChange={(key, value) => {
          setActiveFilters((prev) => ({ ...prev, [key]: value }));
          setCurrentPage(1);
        }}
        onClearFilters={() => {
          setActiveFilters({ status: [], duration: [] });
          setCurrentPage(1);
        }}
        sortOptions={[
          { label: "Module Name", value: "module_name" },
          { label: "Module Code", value: "module_code" },
          { label: "Duration", value: "duration_months" },
          { label: "Status", value: "is_active" },
        ]}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={(nextSortBy, nextSortOrder) => {
          setSortBy(nextSortBy);
          setSortOrder(nextSortOrder);
          setCurrentPage(1);
        }}
        actions={[
          {
            label: "Export",
            onClick: handleExport,
            icon: Download,
          },
          {
            label: "Add Module",
            onClick: openCreateDialog,
            icon: Plus,
          },
        ]}
        table={table}
        storageKey="trainer-modules-management-table"
        suggestions={suggestions}
      />

      <EnhancedDataTable
        columns={columns}
        data={paginatedModules}
        pagination={paginationConfig}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newPageSize) => {
          setPageSize(newPageSize);
          setCurrentPage(1);
        }}
        isLoading={loading}
        emptyMessage="No trainer modules found"
        storageKey="trainer-modules-management-table"
        onTableReady={setTable}
      />

      {/* Form Dialog */}
      <Dialog
        open={showFormDialog}
        onOpenChange={(open) => {
          setShowFormDialog(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingModule ? "Edit Trainer Module" : "Add Trainer Module"}
            </DialogTitle>
            <DialogDescription>
              {editingModule
                ? "Update the trainer module details."
                : "Create a new trainer module available in the system."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="tm_module_name">
                  Module Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="tm_module_name"
                  value={formData.module_name}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      module_name: event.target.value,
                    }))
                  }
                  placeholder="Enter module name"
                  maxLength={255}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tm_module_code">
                  Module Code{" "}
                  <span className="text-gray-400 text-xs font-normal">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="tm_module_code"
                  value={formData.module_code}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      module_code: event.target.value,
                    }))
                  }
                  placeholder="Enter module code"
                  maxLength={50}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tm_duration_months">
                  Duration (Months){" "}
                  <span className="text-gray-400 text-xs font-normal">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="tm_duration_months"
                  type="number"
                  min="1"
                  max="120"
                  value={formData.duration_months}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      duration_months: event.target.value,
                    }))
                  }
                  placeholder="e.g. 6"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="tm_description">
                  Description{" "}
                  <span className="text-gray-400 text-xs font-normal">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  id="tm_description"
                  value={formData.description}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Enter module description"
                  rows={5}
                  maxLength={2000}
                />
              </div>

              <div className="flex items-center gap-3 md:col-span-2">
                <Checkbox
                  id="tm_is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      is_active: Boolean(checked),
                    }))
                  }
                />
                <Label htmlFor="tm_is_active" className="cursor-pointer">
                  Module is active and available in the system
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowFormDialog(false);
                  resetForm();
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? editingModule
                    ? "Saving..."
                    : "Creating..."
                  : editingModule
                    ? "Save Changes"
                    : "Create Module"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              Trainer Module Details
            </DialogTitle>
            <DialogDescription>
              Full details for{" "}
              {selectedModule?.module_name || "the selected module"}
            </DialogDescription>
          </DialogHeader>

          {selectedModule && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Module Name
                  </p>
                  <p className="font-semibold text-gray-900">
                    {selectedModule.module_name}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Module Code
                  </p>
                  <p className="text-gray-700">
                    {selectedModule.module_code || "-"}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Duration
                  </p>
                  <p className="text-gray-700">
                    {selectedModule.duration_months
                      ? `${selectedModule.duration_months} month${selectedModule.duration_months === 1 ? "" : "s"}`
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Status
                  </p>
                  <Badge
                    variant="outline"
                    className={
                      selectedModule.is_active
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-gray-200 bg-gray-100 text-gray-700"
                    }
                  >
                    {selectedModule.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>

              <div className="rounded-lg border bg-gray-50 p-4">
                <p className="mb-2 text-sm font-semibold text-gray-700">
                  Description
                </p>
                <p className="text-sm leading-6 text-gray-600">
                  {selectedModule.description || "No description provided"}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Created At
                  </p>
                  <p className="text-gray-700">
                    {formatDateTime(selectedModule.created_at)}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Updated At
                  </p>
                  <p className="text-gray-700">
                    {formatDateTime(selectedModule.updated_at)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
            {selectedModule && (
              <Button
                onClick={() => {
                  setShowViewDialog(false);
                  openEditDialog(selectedModule);
                }}
              >
                Edit Module
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Dialog */}
      <Dialog
        open={showStatusDialog}
        onOpenChange={(open) => {
          setShowStatusDialog(open);
          if (!open) setStatusTargetModule(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {statusTargetModule?.is_active
                ? "Deactivate Trainer Module"
                : "Activate Trainer Module"}
            </DialogTitle>
            <DialogDescription>
              {statusTargetModule?.is_active
                ? "The module will no longer appear in active selections."
                : "The module will become available again across the system."}
            </DialogDescription>
          </DialogHeader>

          {statusTargetModule && (
            <div className="space-y-3 py-2 text-sm text-gray-700">
              <p>
                <span className="font-semibold">Module:</span>{" "}
                {statusTargetModule.module_name}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowStatusDialog(false);
                setStatusTargetModule(null);
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmStatusChange} disabled={submitting}>
              {submitting
                ? statusTargetModule?.is_active
                  ? "Deactivating..."
                  : "Activating..."
                : statusTargetModule?.is_active
                  ? "Confirm Deactivate"
                  : "Confirm Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          setShowDeleteDialog(open);
          if (!open) setDeleteTargetModule(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Trainer Module</DialogTitle>
            <DialogDescription>
              This action is permanent and cannot be undone. The module will be
              removed from the system entirely.
            </DialogDescription>
          </DialogHeader>

          {deleteTargetModule && (
            <div className="space-y-3 py-2 text-sm text-gray-700">
              <p>
                <span className="font-semibold">Module:</span>{" "}
                {deleteTargetModule.module_name}
              </p>
              {deleteTargetModule.module_code && (
                <p>
                  <span className="font-semibold">Code:</span>{" "}
                  {deleteTargetModule.module_code}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setDeleteTargetModule(null);
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={submitting}
            >
              {submitting ? "Deleting..." : "Delete Module"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrainerModulesTab;
