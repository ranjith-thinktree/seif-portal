import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MainLayout } from "../../components/layout";
import DataTable, { StatusBadge } from "../../components/common/DataTable";
import AdvancedSearchBar from "../../components/common/AdvancedSearchBar";
import Breadcrumb from "../../components/common/Breadcrumb";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import {
  getStudents,
  exportStudents,
  downloadCSV,
  getStudentFilterOptions,
} from "../../services/data.service";
import { toast } from "react-toastify";
import { useAuth } from "../../hooks";

const StudentsPage = () => {
  const navigate = useNavigate();
  const { centerId } = useParams();
  const { role } = useAuth();

  const canExport = ["ADMIN", "SUPER_ADMIN", "ESSCI", "PARTNER"].includes(role);

  const [students, setStudents] = useState([]);
  const [centerName, setCenterName] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState({
    gender: "",
    city: "",
    state: "",
    course_name: "",
    batch_id: "",
    placement_status: "",
  });
  const [filterOptions, setFilterOptions] = useState({
    genders: [],
    cities: [],
    states: [],
    courses: [],
    batches: [],
    placements: [],
  });
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  // Fetch filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const params = centerId ? { center_id: centerId } : {};
        const response = await getStudentFilterOptions(params);
        setFilterOptions(response.data);
      } catch (error) {
        console.error("Error fetching filter options:", error);
      }
    };
    fetchFilterOptions();
  }, [centerId]);

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
        ...(centerId && { center_id: centerId }),
        ...activeFilters, // Spread all active filters
      };

      // Remove empty filters
      Object.keys(params).forEach(
        (key) =>
          (params[key] === "" || params[key] === null) && delete params[key]
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
    activeFilters,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

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
  }, [searchTerm, fetchStudents, pagination.page]);

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setActiveFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page
  };

  // Handle clear all filters
  const handleClearFilters = () => {
    setActiveFilters({
      gender: "",
      city: "",
      state: "",
      course_name: "",
      batch_id: "",
      placement_status: "",
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

  // Handle export
  const handleExport = async () => {
    try {
      const params = {
        search: searchTerm,
        ...(centerId && { center_id: centerId }),
        ...activeFilters,
      };

      // Remove empty filters
      Object.keys(params).forEach(
        (key) =>
          (params[key] === "" || params[key] === null) && delete params[key]
      );

      const blob = await exportStudents(params);
      downloadCSV(blob, `students_${new Date().getTime()}.csv`);
      toast.success("Students exported successfully");
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
      header: "S.NO",
      accessor: "id",
      width: "5%",
      render: (row, index) =>
        (pagination.page - 1) * pagination.limit + index + 1,
    },
    {
      header: "Student ID",
      accessor: "student_id",
      width: "10%",
    },
    {
      header: "Student Name",
      accessor: "student_name",
      width: "12%",
    },
    {
      header: "DOB",
      accessor: "date_of_birth",
      render: (row) =>
        row.date_of_birth
          ? new Date(row.date_of_birth).toLocaleDateString()
          : "-",
    },
    {
      header: "Gender",
      accessor: "gender",
      render: (row) => row.gender || "-",
    },
    {
      header: "Mobile",
      accessor: "mobile_number",
      render: (row) => row.mobile_number || "-",
    },
    {
      header: "Email",
      accessor: "email",
      render: (row) => row.email || "-",
    },
    {
      header: "Address",
      accessor: "address",
      render: (row) => row.address || "-",
    },
    {
      header: "City",
      accessor: "city",
      render: (row) => row.city || "-",
    },
    {
      header: "State",
      accessor: "state",
      render: (row) => row.state || "-",
    },
    {
      header: "Center",
      accessor: "center_name",
      width: "12%",
      render: (row) => row.center_name || "-",
    },
    {
      header: "Batch",
      accessor: "batch_number",
      render: (row) => (
        <Badge variant="outline" className="text-xs">
          {row.batch_number || "-"}
        </Badge>
      ),
    },
    {
      header: "Course",
      accessor: "course_name",
      render: (row) => row.course_name || "-",
    },
    {
      header: "Duration",
      accessor: "course_duration",
      render: (row) => row.course_duration || "-",
    },
    {
      header: "Enrollment Date",
      accessor: "enrollment_date",
      render: (row) =>
        row.enrollment_date
          ? new Date(row.enrollment_date).toLocaleDateString()
          : "-",
    },
    {
      header: "Training Status",
      accessor: "training_status",
      render: (row) => row.training_status || "-",
    },
    {
      header: "Placement",
      accessor: "placement_status",
      render: (row) =>
        row.placement_status ? (
          <Badge
            variant="outline"
            className={
              row.placement_status === "Placed"
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }
          >
            {row.placement_status}
          </Badge>
        ) : (
          "-"
        ),
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb with Back Button */}
        {centerId && (
          <div className="flex items-center justify-between">
            <Breadcrumb items={breadcrumbItems} />
            <Button variant="outline" onClick={handleBack} className="gap-2">
              <ArrowLeftIcon className="h-4 w-4" />
              {role === "PARTNER" ? "Back to Centers" : "Back to Centers"}
            </Button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {centerId && centerName
                ? `${centerName} - Students`
                : centerId
                ? "Center Students"
                : "Students"}
            </h1>
            <p className="text-gray-600 mt-1">
              {centerId
                ? "View all students enrolled in this center"
                : "View all enrolled students across centers"}
            </p>
          </div>
        </div>

        {/* Search with Filters */}
        <div>
          <AdvancedSearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by name, student ID, email, mobile..."
            filterGroups={[
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
              ...(centerId && filterOptions.batches.length > 0
                ? [
                    {
                      label: "Batch",
                      key: "batch_id",
                      options: filterOptions.batches,
                    },
                  ]
                : []),
              {
                label: "Placement Status",
                key: "placement_status",
                options: filterOptions.placements,
              },
            ]}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            sortOptions={[
              { label: "Student Name", value: "student_name" },
              { label: "Enrollment ID", value: "enrollment_id" },
              { label: "Gender", value: "gender" },
              { label: "City", value: "city" },
              { label: "Course", value: "course_name" },
              { label: "Placement Status", value: "placement_status" },
              { label: "Enrollment Date", value: "created_at" },
            ]}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={handleSortChange}
          />
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={students}
          pagination={pagination}
          onPageChange={handlePageChange}
          onExport={canExport ? handleExport : null}
          isLoading={isLoading}
          emptyMessage="No students found"
          showExport={canExport}
        />
      </div>
    </MainLayout>
  );
};

export default StudentsPage;
