import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import EnhancedDataTable, {
  StatusBadge,
} from "../../../components/common/EnhancedDataTable";
import { ActionDropdown } from "../../../components/common";
import BatchForm from "../../../components/forms/BatchForm";
import AdvancedSearchBar from "../../../components/common/AdvancedSearchBar";
import BulkDeleteButton from "../../../components/common/BulkDeleteButton";
import ConfirmationModal from "../../../components/common/ConfirmationModal";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import {
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import {
  getBatches,
  getBatchFilterOptions,
  exportBatches,
  downloadFile,
  updateBatch,
  deleteBatch,
  bulkDeleteBatches,
} from "../../../services/data.service";
import { toast } from "react-toastify";
import { useAuth } from "../../../hooks";

/**
 * Batch List Tab for Data Management
 * Full CRUD with 11 columns: Batch Number, Center, Partner, Dates, Certified, Students, Status, Actions
 */
const BatchListTab = () => {
  const navigate = useNavigate();
  const { role } = useAuth();

  const canEdit = ["ADMIN", "SUPER_ADMIN"].includes(role);
  const canDelete = ["ADMIN", "SUPER_ADMIN"].includes(role);

  const [batches, setBatches] = useState([]);
  const [table, setTable] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Bulk delete states
  const [selectedRows, setSelectedRows] = useState([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [bulkDeleteResults, setBulkDeleteResults] = useState(null);

  // Single delete states
  const [showSingleDeleteModal, setShowSingleDeleteModal] = useState(false);
  const [singleDeleteBatch, setSingleDeleteBatch] = useState(null);
  const [singleDeleteLoading, setSingleDeleteLoading] = useState(false);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [batchSaving, setBatchSaving] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState({
    status: "",
    center_id: [],
    partner_id: [],
  });
  const [filterOptions, setFilterOptions] = useState({
    partners: [],
    centers: [],
    statuses: [],
  });
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  const fetchFilterOptions = useCallback(async () => {
    try {
      const response = await getBatchFilterOptions();
      setFilterOptions(response.data);
    } catch (error) {
      console.error("Error fetching filter options:", error);
      toast.error("Failed to load filter options");
    }
  }, []);

  const fetchBatches = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getBatches({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        status: activeFilters.status,
        center_id: activeFilters.center_id,
        partner_id: activeFilters.partner_id,
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      setBatches(response.data.data || []);
      setPagination((prev) => ({
        ...prev,
        total: response.data.pagination?.total || 0,
        totalPages: response.data.pagination?.totalPages || 0,
      }));
    } catch (error) {
      console.error("Error fetching batches:", error);
      toast.error("Failed to load batches");
    } finally {
      setLoading(false);
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
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  // Fetch batches when dependencies change (removed fetchBatches from deps to prevent loop)
  useEffect(() => {
    fetchBatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit, activeFilters, sortBy, sortOrder]);

  // Handle bulk delete
  const handleBulkDelete = async () => {
    setBulkDeleteLoading(true);
    try {
      const response = await bulkDeleteBatches(selectedRows);
      setBulkDeleteResults(response.data);

      // Show success toast if any deletions succeeded
      if (response.data.summary.successful > 0) {
        toast.success(
          `Successfully deleted ${response.data.summary.successful} batch(es)`,
        );
        fetchBatches(); // Refresh table
        setSelectedRows([]); // Clear selection
      }

      // Show error toast if all failed
      if (response.data.summary.successful === 0) {
        toast.error("Failed to delete any batches");
      }
    } catch (error) {
      console.error("Error bulk deleting batches:", error);
      toast.error(error.response?.data?.message || "Failed to delete batches");
      setBulkDeleteResults(null);
      setShowBulkDeleteModal(false);
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page === 1) {
        fetchBatches();
      } else {
        setPagination((prev) => ({ ...prev, page: 1 }));
      }
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const handleFilterChange = (key, value) => {
    setActiveFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleClearFilters = () => {
    setActiveFilters({
      status: "",
      center_id: [],
      partner_id: [],
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSortChange = (field, order) => {
    setSortBy(field);
    setSortOrder(order);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handlePageSizeChange = (newPageSize) => {
    setPagination((prev) => ({ ...prev, limit: newPageSize, page: 1 }));
  };

  const handleExport = async (format = "csv") => {
    try {
      setExporting(true);
      const blob = await exportBatches({
        search: searchTerm,
        status: activeFilters.status,
        center_id: activeFilters.center_id,
        partner_id: activeFilters.partner_id,
        format,
      });

      const extension = format === "excel" ? "xlsx" : format;
      downloadFile(
        blob,
        `batches_export_${new Date().toISOString().split("T")[0]}.${extension}`,
      );

      toast.success(`Batches exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Error exporting batches:", error);
      toast.error("Failed to export batches");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = (id) => {
    const batch = batches.find((b) => b.id === id);
    setSingleDeleteBatch(batch);
    setShowSingleDeleteModal(true);
  };

  const handleView = (batch) => {
    navigate(`/data/batches/${batch.id}/students`, {
      state: { batchNumber: batch.batch_number },
    });
  };

  const handleEdit = (batch) => {
    setEditingBatch(batch);
    setShowBatchForm(true);
  };

  const handleBatchSubmit = async (formData) => {
    if (!editingBatch) return;
    setBatchSaving(true);
    try {
      await updateBatch(editingBatch.id, formData);
      toast.success("Batch updated successfully");
      setShowBatchForm(false);
      setEditingBatch(null);
      fetchBatches();
    } catch (error) {
      console.error("Error updating batch:", error);
      toast.error(error.response?.data?.message || "Failed to update batch");
    } finally {
      setBatchSaving(false);
    }
  };

  const confirmSingleDelete = async () => {
    if (!singleDeleteBatch) return;
    setSingleDeleteLoading(true);
    try {
      await deleteBatch(singleDeleteBatch.id);
      toast.success("Batch deleted successfully");
      setShowSingleDeleteModal(false);
      setSingleDeleteBatch(null);
      fetchBatches();
    } catch (error) {
      console.error("Error deleting batch:", error);
      toast.error(error.response?.data?.message || "Failed to delete batch");
    } finally {
      setSingleDeleteLoading(false);
    }
  };

  // Filter groups for AdvancedSearchBar
  const filterGroups = [
    {
      label: "Partner",
      key: "partner_id",
      options: filterOptions.partners,
      multi: true,
    },
    {
      label: "Center",
      key: "center_id",
      options: filterOptions.centers,
      multi: true,
    },
    {
      label: "Status",
      key: "status",
      options: filterOptions.statuses,
    },
  ];

  // Sort options for AdvancedSearchBar
  const sortOptions = [
    { label: "Batch Number", value: "batch_number" },
    { label: "Center Name", value: "center_name" },
    { label: "Partner Name", value: "partner_name" },
    { label: "Start Date", value: "batch_start_date" },
    { label: "End Date", value: "batch_complete_date" },
    { label: "Status", value: "status" },
    { label: "Created Date", value: "created_at" },
  ];

  // Table columns config (11 columns as per requirements)
  const columns = [
    {
      id: "batch_number",
      accessorKey: "batch_number",
      header: "Batch Number",
      cell: ({ row }) => (
        <div className="font-medium">{row.original.batch_number}</div>
      ),
      size: 200,
      enableHiding: false,
    },
    {
      id: "center_name",
      accessorKey: "center_name",
      header: "Center Name",
      cell: ({ row }) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/centers/${row.original.center_id}`);
          }}
          className="text-blue-600 hover:text-blue-800 hover:underline"
        >
          {row.original.center_name || "N/A"}
        </button>
      ),
      size: 200,
    },
    {
      id: "partner_name",
      accessorKey: "partner_name",
      header: "Partner Name",
      cell: ({ row }) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/data/partners/${row.original.partner_id}`);
          }}
          className="text-blue-600 hover:text-blue-800 hover:underline"
        >
          {row.original.partner_name || "N/A"}
        </button>
      ),
      size: 200,
    },
    {
      id: "batch_start_date",
      accessorKey: "batch_start_date",
      header: "Start Date",
      cell: ({ row }) =>
        row.original.batch_start_date
          ? new Date(row.original.batch_start_date).toLocaleDateString()
          : "N/A",
      size: 120,
    },
    {
      id: "batch_complete_date",
      accessorKey: "batch_complete_date",
      header: "End Date",
      cell: ({ row }) =>
        row.original.batch_complete_date
          ? new Date(row.original.batch_complete_date).toLocaleDateString()
          : "N/A",
      size: 120,
    },
    {
      id: "certified",
      accessorKey: "status",
      header: "Certified",
      cell: ({ row }) => {
        const isDone = row.original.status === "completed";
        return (
          <Badge variant={isDone ? "success" : "warning"}>
            {isDone ? "Done" : "In Progress"}
          </Badge>
        );
      },
      size: 130,
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
      id: "male_students",
      accessorKey: "male_students",
      header: "Total Male",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.male_students || 0}</Badge>
      ),
      size: 120,
    },
    {
      id: "female_students",
      accessorKey: "female_students",
      header: "Total Female",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.female_students || 0}</Badge>
      ),
      size: 120,
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
      size: 120,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const batch = row.original;

        const actions = [
          {
            label: "View Students",
            icon: EyeIcon,
            onClick: () => handleView(batch),
            variant: "default",
            show: canEdit,
          },
          // Edit action
          {
            label: "Edit Batch",
            icon: PencilIcon,
            onClick: () => handleEdit(batch),
            variant: "default",
            show: canEdit,
            divider: true,
          },
          // Delete action
          {
            label: "Delete Batch",
            icon: TrashIcon,
            onClick: () => handleDelete(batch.id),
            variant: "danger",
            show: canDelete,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Batches</h1>
          <p className="text-gray-600 mt-1">
            View and manage all training batches across centers
          </p>
        </div>
      </div>

      {/* Search with Filters and Export */}
      <div className="space-y-4">
        {/* Bulk Delete Button */}
        {canDelete && selectedRows.length > 0 && (
          <div className="flex justify-end">
            <BulkDeleteButton
              selectedCount={selectedRows.length}
              onDelete={() => setShowBulkDeleteModal(true)}
              loading={bulkDeleteLoading}
            />
          </div>
        )}

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <AdvancedSearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search batches by number, center, partner..."
              table={table}
              storageKey="batches"
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
          <div className="flex items-center gap-2 whitespace-nowrap">
            <Button
              onClick={() => handleExport("csv")}
              disabled={exporting}
              variant="outline"
              size="default"
              className="gap-2"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              {exporting ? "Exporting..." : "CSV"}
            </Button>
            <Button
              onClick={() => handleExport("excel")}
              disabled={exporting}
              variant="outline"
              size="default"
            >
              Excel
            </Button>
            <Button
              onClick={() => handleExport("pdf")}
              disabled={exporting}
              variant="outline"
              size="default"
            >
              PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <EnhancedDataTable
        columns={columns}
        data={batches}
        pagination={pagination}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onRowClick={(row) =>
          navigate(`/data/batches/${row.id}/students`, {
            state: { batchNumber: row.batch_number },
          })
        }
        isLoading={loading}
        emptyMessage="No batches found"
        showSerialNumber={true}
        storageKey="batches"
        onTableReady={setTable}
        enableRowSelection={canDelete}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        getRowId={(row) => row.id}
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmationModal
        open={showBulkDeleteModal}
        onClose={() => {
          setShowBulkDeleteModal(false);
          setBulkDeleteResults(null);
        }}
        onConfirm={handleBulkDelete}
        title="Delete Batches"
        message={(() => {
          const selectedBatches = batches.filter((b) =>
            selectedRows.includes(b.id),
          );
          const totalStudents = selectedBatches.reduce(
            (sum, b) => sum + (b.total_students || 0),
            0,
          );
          const baseMsg = `Are you sure you want to delete ${selectedRows.length} batch(es)?`;
          return totalStudents > 0
            ? `${baseMsg} This will also permanently delete ${totalStudents} student(s) and their employment records.`
            : baseMsg;
        })()}
        itemCount={selectedRows.length}
        items={batches.filter((b) => selectedRows.includes(b.id))}
        loading={bulkDeleteLoading}
        results={bulkDeleteResults}
        itemType="batches"
      />

      {/* Single Delete Confirmation Modal */}
      <ConfirmationModal
        open={showSingleDeleteModal}
        onClose={() => {
          if (!singleDeleteLoading) {
            setShowSingleDeleteModal(false);
            setSingleDeleteBatch(null);
          }
        }}
        onConfirm={confirmSingleDelete}
        title={`Delete Batch: ${singleDeleteBatch?.batch_number || ""}`}
        message={(() => {
          const count = singleDeleteBatch?.total_students || 0;
          const base =
            "Are you sure you want to delete this batch? This action cannot be undone.";
          return count > 0
            ? `${base} This will also permanently delete ${count} student(s) and their employment records.`
            : base;
        })()}
        itemCount={1}
        items={singleDeleteBatch ? [singleDeleteBatch] : []}
        loading={singleDeleteLoading}
        itemType="batches"
      />

      {showBatchForm && editingBatch && (
        <BatchForm
          batch={editingBatch}
          onSubmit={handleBatchSubmit}
          onCancel={() => {
            setShowBatchForm(false);
            setEditingBatch(null);
          }}
          isLoading={batchSaving}
          centerId={editingBatch.center_id}
          partnerId={editingBatch.partner_id}
        />
      )}
    </div>
  );
};

export default BatchListTab;
