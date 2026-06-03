import React, { useState, useEffect, useCallback } from "react";
import EnhancedDataTable from "../../../components/common/EnhancedDataTable";
import AdvancedSearchBar from "../../../components/common/AdvancedSearchBar";
import { ActionDropdown } from "../../../components/common";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import {
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import ConfirmationModal from "../../../components/common/ConfirmationModal";
import {
  getApprovedEmploymentRecords,
  addEmploymentRecord,
  updateEmploymentRecord,
  deleteEmploymentRecord,
} from "../../../services/employment.service";
import { getStudents } from "../../../services/data.service";
import { toast } from "react-toastify";
import { useAuth } from "../../../hooks";

const VALID_STATUSES = [
  "Employed",
  "Self-Employed",
  "Entrepreneur",
  "Higher Study",
  "Further Education",
  "NA",
];
const STATUS_COLOR = {
  Employed: "bg-green-100 text-green-700",
  "Self-Employed": "bg-blue-100 text-blue-700",
  Entrepreneur: "bg-purple-100 text-purple-700",
  "Higher Study": "bg-indigo-100 text-indigo-700",
  "Further Education": "bg-cyan-100 text-cyan-700",
  NA: "bg-gray-100 text-gray-500",
};

const EMPTY_FORM = {
  partnerStudentId: "",
  employmentStatus: "Employed",
  companyName: "",
  companyLocation: "",
  dateOfJoining: "",
  designation: "",
  salaryPerMonth: "",
  industry: "",
};

const EmploymentListTab = () => {
  const { role } = useAuth();
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(role);
  const canAdd = ["ADMIN", "SUPER_ADMIN", "PARTNER"].includes(role);

  const [records, setRecords] = useState([]);
  const [table, setTable] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);

  // Search & filters
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState({
    employmentStatus: "",
    center_id: [],
  });
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [form, setForm] = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [studentOptions, setStudentOptions] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const mapRecordToForm = (record) => ({
    partnerStudentId: record.partner_student_id || "",
    employmentStatus: record.employment_status || "Employed",
    companyName: record.company_name || "",
    companyLocation: record.company_location || "",
    dateOfJoining: record.date_of_joining
      ? String(record.date_of_joining).slice(0, 10)
      : "",
    designation: record.designation || "",
    salaryPerMonth: record.salary_per_month || "",
    industry: record.industry || "",
  });

  const mapFormToPayload = (currentForm) => ({
    partnerStudentId: currentForm.partnerStudentId,
    employmentStatus: currentForm.employmentStatus,
    companyName: currentForm.companyName,
    companyLocation: currentForm.companyLocation,
    dateOfJoining: currentForm.dateOfJoining,
    designation: currentForm.designation,
    salaryPerMonth: currentForm.salaryPerMonth,
    industry: currentForm.industry,
  });

  // ── Fetch records ────────────────────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      if (searchTerm) params.search = searchTerm;
      if (activeFilters.employmentStatus)
        params.employmentStatus = activeFilters.employmentStatus;
      if (activeFilters.center_id?.length)
        params.centerId = activeFilters.center_id[0];

      const res = await getApprovedEmploymentRecords(params);
      setRecords(res.data || []);
      setPagination((prev) => ({
        ...prev,
        total: res.pagination?.total || 0,
        totalPages: res.pagination?.totalPages || 0,
      }));
    } catch {
      toast.error("Failed to load employment records");
    } finally {
      setLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    sortBy,
    sortOrder,
    searchTerm,
    activeFilters,
  ]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      if (pagination.page === 1) fetchRecords();
      else setPagination((p) => ({ ...p, page: 1 }));
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // ── Load students for add modal (partner's own students) ─────────────────
  useEffect(() => {
    if (!showAddModal) return;
    const params = { limit: 100 };
    if (studentSearch?.trim()) {
      params.search = studentSearch.trim();
    }

    getStudents(params)
      .then((res) => setStudentOptions(res?.data?.data || []))
      .catch(() => {});
  }, [showAddModal, studentSearch]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleFilterChange = (key, value) => {
    setActiveFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleClearFilters = () => {
    setActiveFilters({ employmentStatus: "", center_id: [] });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSortChange = (field, order) => {
    setSortBy(field);
    setSortOrder(order);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (formMode === "edit" && selectedRecord) {
        await updateEmploymentRecord(selectedRecord.id, {
          employment_status: form.employmentStatus,
          company_name: form.companyName,
          company_location: form.companyLocation,
          designation: form.designation,
          date_of_joining: form.dateOfJoining || null,
          salary_per_month: form.salaryPerMonth || null,
        });
        toast.success("Employment record updated successfully");
      } else {
        await addEmploymentRecord(mapFormToPayload(form));
        toast.success("Employment record added successfully");
      }
      setShowAddModal(false);
      setForm(EMPTY_FORM);
      setSelectedRecord(null);
      fetchRecords();
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to save employment record",
      );
    } finally {
      setFormLoading(false);
    }
  };

  const openCreateModal = () => {
    setFormMode("create");
    setSelectedRecord(null);
    setForm(EMPTY_FORM);
    setShowAddModal(true);
  };

  const openViewOrEditModal = (record, mode) => {
    setFormMode(mode);
    setSelectedRecord(record);
    setForm(mapRecordToForm(record));
    setShowAddModal(true);
  };

  const handleDeleteRecord = (record) => {
    setSelectedRecord(record);
    setShowDeleteModal(true);
  };

  const confirmDeleteRecord = async () => {
    if (!selectedRecord) return;
    setFormLoading(true);
    try {
      await deleteEmploymentRecord(selectedRecord.id);
      toast.success("Employment record deleted successfully");
      setShowDeleteModal(false);
      setSelectedRecord(null);
      fetchRecords();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to delete employment record",
      );
    } finally {
      setFormLoading(false);
    }
  };

  // ── Column definitions ────────────────────────────────────────────────────
  const columns = [
    {
      id: "partner_student_id",
      accessorKey: "partner_student_id",
      header: "Student ID",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-gray-500">
          {row.original.partner_student_id || "—"}
        </span>
      ),
      size: 130,
    },
    {
      id: "student_name",
      accessorKey: "student_name",
      header: "Student Name",
      cell: ({ row }) => (
        <span className="font-medium text-gray-900">
          {row.original.student_name || "—"}
        </span>
      ),
      size: 180,
    },
    {
      id: "center_name",
      accessorKey: "center_name",
      header: "Center",
      cell: ({ row }) => (
        <span className="text-gray-600">{row.original.center_name || "—"}</span>
      ),
      size: 180,
    },
    ...(isAdmin
      ? [
          {
            id: "partner_name",
            accessorKey: "partner_name",
            header: "Partner",
            cell: ({ row }) => (
              <span className="text-gray-500 text-sm">
                {row.original.partner_name || "—"}
              </span>
            ),
            size: 160,
          },
        ]
      : []),
    {
      id: "employment_status",
      accessorKey: "employment_status",
      header: "Status",
      cell: ({ row }) => {
        const s = row.original.employment_status;
        return (
          <span
            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[s] || "bg-gray-100 text-gray-500"}`}
          >
            {s || "—"}
          </span>
        );
      },
      size: 150,
    },
    {
      id: "company_name",
      accessorKey: "company_name",
      header: "Company",
      cell: ({ row }) => (
        <span className="text-gray-700">
          {row.original.company_name || "—"}
        </span>
      ),
      size: 180,
    },
    {
      id: "company_location",
      accessorKey: "company_location",
      header: "Location",
      cell: ({ row }) => (
        <span className="text-gray-500 text-sm">
          {row.original.company_location || "—"}
        </span>
      ),
      size: 140,
    },
    {
      id: "designation",
      accessorKey: "designation",
      header: "Designation",
      cell: ({ row }) => (
        <span className="text-gray-700">{row.original.designation || "—"}</span>
      ),
      size: 160,
    },
    {
      id: "date_of_joining",
      accessorKey: "date_of_joining",
      header: "Date of Joining",
      cell: ({ row }) => {
        const d = row.original.date_of_joining;
        if (!d) return <span className="text-gray-400">—</span>;
        return (
          <span className="text-gray-600 text-sm">
            {new Date(d).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        );
      },
      size: 150,
    },
    {
      id: "salary_per_month",
      accessorKey: "salary_per_month",
      header: "Salary (₹/month)",
      cell: ({ row }) => {
        const v = row.original.salary_per_month;
        return (
          <span className="font-medium text-gray-900 text-right block">
            {v ? `₹${Number(v).toLocaleString("en-IN")}` : "—"}
          </span>
        );
      },
      size: 140,
    },
    {
      id: "is_verified",
      accessorKey: "is_verified",
      header: "Verified",
      cell: ({ row }) =>
        row.original.is_verified ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
            Verified
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            Pending
          </span>
        ),
      size: 100,
    },
    {
      id: "created_at",
      accessorKey: "created_at",
      header: "Created Date",
      cell: ({ row }) => {
        const d = row.original.created_at;
        if (!d) return <span className="text-gray-400">—</span>;
        return (
          <span className="text-gray-500 text-sm">
            {new Date(d).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        );
      },
      size: 130,
    },
    ...(isAdmin
      ? [
          {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => {
              const record = row.original;
              const actions = [
                {
                  label: "View",
                  icon: EyeIcon,
                  onClick: () => openViewOrEditModal(record, "view"),
                  show: true,
                },
                {
                  label: "Edit",
                  icon: PencilIcon,
                  onClick: () => openViewOrEditModal(record, "edit"),
                  show: true,
                },
                {
                  label: "Delete",
                  icon: TrashIcon,
                  onClick: () => handleDeleteRecord(record),
                  variant: "danger",
                  show: true,
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
            size: 160,
          },
        ]
      : []),
  ];

  const filterGroups = [
    {
      label: "Employment Status",
      key: "employmentStatus",
      options: VALID_STATUSES.map((s) => ({ label: s, value: s })),
    },
  ];

  const sortOptions = [
    { label: "Student Name", value: "student_name" },
    { label: "Company", value: "company_name" },
    { label: "Date of Joining", value: "date_of_joining" },
    { label: "Salary", value: "salary_per_month" },
    { label: "Created Date", value: "created_at" },
  ];

  const isNA = form.employmentStatus === "NA";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employment</h1>
          <p className="text-gray-600 mt-1">
            Approved employment records across all partners
          </p>
        </div>
        {canAdd && (
          <Button
            onClick={openCreateModal}
            className="gap-2 bg-primary-500 hover:bg-primary-600 text-white"
          >
            <PlusIcon className="h-4 w-4" />
            Add Employment
          </Button>
        )}
      </div>

      {/* Search + Filters */}
      <AdvancedSearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Search student, company, designation..."
        table={table}
        storageKey="employment"
        filterGroups={filterGroups}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        sortOptions={sortOptions}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
      />

      {/* Table */}
      <EnhancedDataTable
        columns={columns}
        data={records}
        pagination={pagination}
        onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
        onPageSizeChange={(limit) =>
          setPagination((p) => ({ ...p, limit, page: 1 }))
        }
        isLoading={loading}
        emptyMessage="No approved employment records found"
        showSerialNumber={true}
        storageKey="employment"
        onTableReady={setTable}
      />

      {/* Add Employment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">
                {formMode === "edit"
                  ? "Edit Employment Record"
                  : formMode === "view"
                    ? "View Employment Record"
                    : "Add Employment Record"}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setForm(EMPTY_FORM);
                  setSelectedRecord(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="px-6 py-5 space-y-4">
              {/* Student ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={formMode === "view"}
                  value={form.partnerStudentId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, partnerStudentId: e.target.value }))
                  }
                  placeholder="Enter partner student ID exactly as registered"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>

              {/* Employment Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employment Status <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  disabled={formMode === "view"}
                  value={form.employmentStatus}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      employmentStatus: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
                >
                  {VALID_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Company Name + Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name{" "}
                    {!isNA && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    required={!isNA}
                    disabled={isNA || formMode === "view"}
                    value={form.companyName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, companyName: e.target.value }))
                    }
                    placeholder="e.g. Infosys Ltd."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Location
                  </label>
                  <input
                    type="text"
                    disabled={isNA || formMode === "view"}
                    value={form.companyLocation}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        companyLocation: e.target.value,
                      }))
                    }
                    placeholder="e.g. Bengaluru, Karnataka"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:bg-gray-50"
                  />
                </div>
              </div>

              {/* Designation + Industry */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    disabled={isNA || formMode === "view"}
                    value={form.designation}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, designation: e.target.value }))
                    }
                    placeholder="e.g. Software Engineer"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Industry
                  </label>
                  <input
                    type="text"
                    disabled={isNA || formMode === "view"}
                    value={form.industry}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, industry: e.target.value }))
                    }
                    placeholder="e.g. Information Technology"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:bg-gray-50"
                  />
                </div>
              </div>

              {/* Date of Joining + Salary */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Joining
                  </label>
                  <input
                    type="date"
                    disabled={isNA || formMode === "view"}
                    value={form.dateOfJoining}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, dateOfJoining: e.target.value }))
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Salary per Month (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    disabled={isNA || formMode === "view"}
                    value={form.salaryPerMonth}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, salaryPerMonth: e.target.value }))
                    }
                    placeholder="e.g. 25000"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:bg-gray-50"
                  />
                </div>
              </div>

              {!isAdmin && formMode === "create" && (
                <p className="text-xs text-yellow-600 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2">
                  This record will be added as unverified and will require admin
                  verification.
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    setForm(EMPTY_FORM);
                  }}
                  disabled={formLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={formLoading || formMode === "view"}
                  className="bg-primary-500 hover:bg-primary-600 text-white min-w-[120px]"
                >
                  {formLoading
                    ? "Saving..."
                    : formMode === "edit"
                      ? "Update Record"
                      : formMode === "view"
                        ? "Close"
                        : "Add Record"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        open={showDeleteModal}
        onClose={() => {
          if (!formLoading) {
            setShowDeleteModal(false);
            setSelectedRecord(null);
          }
        }}
        onConfirm={confirmDeleteRecord}
        title={`Delete Employment Record${selectedRecord?.student_name ? `: ${selectedRecord.student_name}` : ""}`}
        message="Are you sure you want to delete this employment record? This action cannot be undone."
        itemCount={1}
        items={selectedRecord ? [selectedRecord] : []}
        loading={formLoading}
        itemType="employment records"
      />
    </div>
  );
};

export default EmploymentListTab;
