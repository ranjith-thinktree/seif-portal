import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { MainLayout } from "../../components/layout";
import EnhancedDataTable, {
  StatusBadge,
} from "../../components/common/EnhancedDataTable";
import AdvancedSearchBar from "../../components/common/AdvancedSearchBar";
import Breadcrumb from "../../components/common/Breadcrumb";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { ArrowLeftIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import BulkDeleteButton from "../../components/common/BulkDeleteButton";
import ConfirmationModal from "../../components/common/ConfirmationModal";
import {
  getStudents,
  bulkDeleteStudents,
  exportStudents,
  downloadFile,
  getStudentFilterOptions,
} from "../../services/data.service";
import { toast } from "react-toastify";
import { useAuth } from "../../hooks";

const StudentsPage = ({ embedded = false }) => {
  const navigate = useNavigate();
  const { centerId, batchId } = useParams();
  const location = useLocation();
  const { role } = useAuth();

  const canExport = ["ADMIN", "SUPER_ADMIN", "ESSCI", "PARTNER"].includes(role);

  const [students, setStudents] = useState([]);
  const [table, setTable] = useState(null);
  const [centerName, setCenterName] = useState(
    location.state?.centerName || "",
  );
  const [batchNumber, setBatchNumber] = useState(
    location.state?.batchNumber || "",
  );
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState({
    partner_id: [],
    center_id: [], // Keep empty - centerId from route is handled separately
    batch_id: [], // Keep empty - batchId from route is handled separately
    gender: "",
    city: "",
    state: "",
    course_name: "",
    batch_year: "",
  });
  const [filterOptions, setFilterOptions] = useState({
    partners: [],
    centers: [],
    batches: [],
    genders: [],
    cities: [],
    states: [],
    courses: [],
    years: [],
    trainings: [],
  });
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  // Bulk delete states
  const [selectedRows, setSelectedRows] = useState([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [bulkDeleteResults, setBulkDeleteResults] = useState(null);

  // Fetch filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const params = {};
        if (centerId) params.center_id = centerId;
        if (batchId) params.batch_id = batchId;

        const response = await getStudentFilterOptions(params);
        setFilterOptions(response.data);
      } catch (error) {
        console.error("Error fetching filter options:", error);
      }
    };
    fetchFilterOptions();
  }, [centerId, batchId]);

  // Fetch students
  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        sort_by: sortBy,
        sort_order: sortOrder,
        ...activeFilters, // Spread all active filters
      };

      // Override with route params if they exist (takes precedence)
      if (centerId) params.center_id = centerId;
      if (batchId) params.batch_id = batchId;

      // Remove empty filters (including empty arrays)
      Object.keys(params).forEach(
        (key) =>
          (params[key] === "" ||
            params[key] === null ||
            (Array.isArray(params[key]) && params[key].length === 0)) &&
          delete params[key],
      );

      const response = await getStudents(params);
      setStudents(response.data.data);
      setPagination(response.data.pagination);

      // Set center name from first student record if available
      if (
        centerId &&
        response.data.data.length > 0 &&
        response.data.data[0].center_name
      ) {
        setCenterName(response.data.data[0].center_name);
      }

      // Set batch number from first student record if available
      if (
        batchId &&
        response.data.data.length > 0 &&
        response.data.data[0].batch_number
      ) {
        setBatchNumber(response.data.data[0].batch_number);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error("Failed to load students");
    } finally {
      setIsLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    searchTerm,
    centerId,
    batchId,
    activeFilters,
    sortBy,
    sortOrder,
  ]);

  // Handle bulk delete
  const handleBulkDelete = async () => {
    setBulkDeleteLoading(true);
    try {
      const response = await bulkDeleteStudents(selectedRows);
      setBulkDeleteResults(response.data);

      // Show success toast if any deletions succeeded
      if (response.data.summary.successful > 0) {
        toast.success(
          `Successfully deleted ${response.data.summary.successful} student(s)`,
        );
        fetchStudents(); // Refresh table
        setSelectedRows([]); // Clear selection
      }

      // Show error toast if all failed
      if (response.data.summary.successful === 0) {
        toast.error("Failed to delete any students");
      }
    } catch (error) {
      console.error("Error bulk deleting students:", error);
      toast.error(error.response?.data?.message || "Failed to delete students");
      setBulkDeleteResults(null);
      setShowBulkDeleteModal(false);
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  // Fetch students when dependencies change (removed fetchStudents from deps to prevent loop)
  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pagination.page,
    pagination.limit,
    centerId,
    batchId,
    activeFilters,
    sortBy,
    sortOrder,
  ]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page === 1) {
        fetchStudents();
      } else {
        setPagination((prev) => ({ ...prev, page: 1 }));
      }
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setActiveFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page
  };

  // Clear filters
  const handleClearFilters = () => {
    setActiveFilters({
      partner_id: [],
      center_id: [], // Keep empty - centerId from route is handled separately
      batch_id: [], // Keep empty - batchId from route is handled separately
      gender: "",
      city: "",
      state: "",
      course_name: "",
      batch_year: "",
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Handle sort change
  const handleSortChange = (field, order) => {
    setSortBy(field);
    setSortOrder(order);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  // Handle page size change
  const handlePageSizeChange = (newPageSize) => {
    setPagination((prev) => ({ ...prev, limit: newPageSize, page: 1 }));
  };

  // Handle export
  const handleExport = async (format = "csv") => {
    try {
      const params = {
        search: searchTerm,
        ...activeFilters,
        format,
      };

      if (centerId) params.center_id = centerId;
      if (batchId) params.batch_id = batchId;

      // Remove empty filters
      Object.keys(params).forEach(
        (key) =>
          (params[key] === "" || params[key] === null) && delete params[key],
      );

      const blob = await exportStudents(params);
      const extension = format === "excel" ? "xlsx" : format;
      const yearSuffix = activeFilters.batch_year ? `_${activeFilters.batch_year}` : "";
      downloadFile(blob, `students${yearSuffix}_${new Date().getTime()}.${extension}`);
      toast.success(`Students exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Error exporting students:", error);
      toast.error("Failed to export students");
    }
  };

  // Handle back navigation
  const handleBack = () => {
    navigate(-1);
  };

  // Breadcrumb items - Dynamic based on role
  const breadcrumbItems =
    role === "PARTNER"
      ? [{ label: "Centers", path: "/my-centers" }, { label: "Students" }]
      : [
          { label: "Partners", path: "/data/partners" },
          { label: "Centers", onClick: () => navigate(-1) },
          { label: "Students" },
        ];

  // Table columns - Show ALL student data
  const columns = [
    {
      id: "student_id",
      accessorKey: "student_id",
      header: "Student ID",
      cell: ({ row }) => (
        <div className="font-medium">{row.original.student_id}</div>
      ),
      size: 130,
      enableHiding: false,
    },
    {
      id: "student_name",
      accessorKey: "student_name",
      header: "Student Name",
      cell: ({ row }) => (
        <div className="font-medium">{row.original.student_name}</div>
      ),
      size: 180,
    },
    {
      id: "date_of_birth",
      accessorKey: "date_of_birth",
      header: "DOB",
      cell: ({ row }) =>
        row.original.date_of_birth
          ? new Date(row.original.date_of_birth).toLocaleDateString()
          : "-",
      size: 110,
    },
    {
      id: "gender",
      accessorKey: "gender",
      header: "Gender",
      cell: ({ row }) => row.original.gender || "-",
      size: 90,
    },
    {
      id: "mobile_number",
      accessorKey: "mobile_number",
      header: "Mobile",
      cell: ({ row }) => row.original.mobile_number || "-",
      size: 130,
    },
    {
      id: "email",
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => row.original.email || "-",
      size: 200,
    },
    {
      id: "address",
      accessorKey: "address",
      header: "Address",
      cell: ({ row }) => (
        <div className="truncate max-w-xs" title={row.original.address}>
          {row.original.address || "-"}
        </div>
      ),
      size: 200,
    },
    {
      id: "city",
      accessorKey: "city",
      header: "City",
      cell: ({ row }) => row.original.city || "-",
      size: 120,
    },
    {
      id: "state",
      accessorKey: "state",
      header: "State",
      cell: ({ row }) => row.original.state || "-",
      size: 120,
    },
    {
      id: "center_name",
      accessorKey: "center_name",
      header: "Center",
      cell: ({ row }) => row.original.center_name || "-",
      size: 180,
    },
    {
      id: "batch_number",
      accessorKey: "batch_number",
      header: "Batch",
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs">
          {row.original.batch_number || "-"}
        </Badge>
      ),
      size: 140,
    },
    {
      id: "course_name",
      accessorKey: "course_name",
      header: "Course",
      cell: ({ row }) => row.original.course_name || "-",
      size: 180,
    },
    {
      id: "course_duration",
      accessorKey: "course_duration",
      header: "Duration",
      cell: ({ row }) => row.original.course_duration || "-",
      size: 100,
    },
    {
      id: "enrollment_date",
      accessorKey: "enrollment_date",
      header: "Enrollment Date",
      cell: ({ row }) =>
        row.original.enrollment_date
          ? new Date(row.original.enrollment_date).toLocaleDateString()
          : "-",
      size: 140,
    },
  ];

  const content = (
    <>
      <div className="space-y-6">
        {/* Breadcrumb with Back Button */}
        {(centerId || batchId) && (
          <div className="flex items-center justify-between">
            <Breadcrumb items={breadcrumbItems} />
            <Button variant="outline" onClick={handleBack} className="gap-2">
              <ArrowLeftIcon className="h-4 w-4" />
              {batchId
                ? "Back to Batches"
                : role === "PARTNER"
                  ? "Back to Centers"
                  : "Back to Centers"}
            </Button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {batchNumber
                ? `${batchNumber} - Students`
                : centerName
                  ? `${centerName} - Students`
                  : centerId
                    ? "Center Students"
                    : batchId
                      ? "Batch Students"
                      : "Students"}
            </h1>
            <p className="text-gray-600 mt-1">
              {batchId
                ? "View all students enrolled in this batch"
                : centerId
                  ? "View all students enrolled in this center"
                  : "View all enrolled students across centers"}
            </p>
          </div>
        </div>

        {/* Search with Filters and Export */}
        <div className="space-y-4">
          {/* Bulk Delete Button */}
          {canExport && selectedRows.length > 0 && (
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
                placeholder="Search by name, student ID, email, mobile..."
                table={table}
                storageKey="students"
                filterGroups={[
                  ...(!centerId && !batchId && filterOptions.partners.length > 0
                    ? [
                        {
                          label: "Partner",
                          key: "partner_id",
                          options: filterOptions.partners,
                          multi: true,
                        },
                      ]
                    : []),
                  ...(!centerId && !batchId && filterOptions.centers.length > 0
                    ? [
                        {
                          label: "Center",
                          key: "center_id",
                          options: filterOptions.centers,
                          multi: true,
                        },
                      ]
                    : []),
                  ...(!batchId && filterOptions.batches.length > 0
                    ? [
                        {
                          label: "Batch",
                          key: "batch_id",
                          options: filterOptions.batches,
                          multi: true,
                        },
                      ]
                    : []),
                  {
                    label: "Gender",
                    key: "gender",
                    options: filterOptions.genders,
                  },
                  {
                    label: "City",
                    key: "city",
                    options: filterOptions.cities,
                  },
                  {
                    label: "State",
                    key: "state",
                    options: filterOptions.states,
                  },
                  {
                    label: "Course",
                    key: "course_name",
                    options: filterOptions.courses,
                  },
                  ...(filterOptions.years.length > 0
                    ? [
                        {
                          label: "Year",
                          key: "batch_year",
                          options: filterOptions.years,
                        },
                      ]
                    : []),
                ]}
                activeFilters={
                  centerId || batchId
                    ? // Hide center_id/batch_id from filter badge when viewing specific center/batch
                      (() => {
                        const {
                          center_id: _center_id,
                          batch_id: _batch_id,
                          ...rest
                        } = activeFilters;
                        return rest;
                      })()
                    : activeFilters
                }
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                sortOptions={[
                  { label: "Student Name", value: "student_name" },
                  { label: "Student ID", value: "student_id" },
                  { label: "Gender", value: "gender" },
                  { label: "City", value: "city" },
                  { label: "Course", value: "course_name" },
                  { label: "Created Date", value: "created_at" },
                ]}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={handleSortChange}
              />
            </div>
            {canExport && (
              <div className="flex items-center gap-2 whitespace-nowrap">
                <Button
                  onClick={() => handleExport("csv")}
                  variant="outline"
                  size="default"
                  className="gap-2"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  CSV
                </Button>
                <Button
                  onClick={() => handleExport("excel")}
                  variant="outline"
                  size="default"
                >
                  Excel
                </Button>
                <Button
                  onClick={() => handleExport("pdf")}
                  variant="outline"
                  size="default"
                >
                  PDF
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <EnhancedDataTable
          columns={columns}
          data={students}
          pagination={pagination}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          isLoading={isLoading}
          emptyMessage="No students found"
          showSerialNumber={true}
          storageKey="students"
          onTableReady={setTable}
          enableRowSelection={canExport}
          selectedRows={selectedRows}
          onSelectionChange={setSelectedRows}
          getRowId={(row) => row.id}
        />
      </div>

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmationModal
        open={showBulkDeleteModal}
        onClose={() => {
          setShowBulkDeleteModal(false);
          setBulkDeleteResults(null);
        }}
        onConfirm={handleBulkDelete}
        title="Delete Students"
        message={`Are you sure you want to delete ${selectedRows.length} student(s)?`}
        itemCount={selectedRows.length}
        items={students.filter((s) => selectedRows.includes(s.id))}
        loading={bulkDeleteLoading}
        results={bulkDeleteResults}
        itemType="students"
      />
    </>
  );

  return embedded ? content : <MainLayout>{content}</MainLayout>;
};

export default StudentsPage;
