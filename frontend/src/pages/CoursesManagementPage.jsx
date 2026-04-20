import { useCallback, useEffect, useMemo, useState } from "react";
import MainLayout from "../components/layout/MainLayout";
import EnhancedDataTable from "../components/common/EnhancedDataTable";
import AdvancedSearchBar from "../components/common/AdvancedSearchBar";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { toast } from "react-toastify";
import {
  createCourseCatalog,
  getCoursesCatalog,
  updateCourseCatalog,
} from "../services/data.service";
import {
  BookOpen,
  Building2,
  Clock3,
  Download,
  Edit,
  Eye,
  MoreHorizontal,
  Package,
  Plus,
  Power,
} from "lucide-react";

const INITIAL_FORM_DATA = {
  course_name: "",
  course_code: "",
  duration_months: "",
  description: "",
  is_active: true,
};

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

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

const CoursesManagementPage = () => {
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState({
    status: [],
    duration: [],
  });
  const [sortBy, setSortBy] = useState("course_name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [table, setTable] = useState(null);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [statusTargetCourse, setStatusTargetCourse] = useState(null);

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getCoursesCatalog({
        limit: 1000,
        sort_by: "course_name",
        sort_order: "asc",
      });

      if (!response.success) {
        throw new Error(response.message || "Failed to fetch courses");
      }

      setCourses(response.data || []);
      setFilteredCourses(response.data || []);
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast.error(
        error.message || "Failed to fetch courses. Please try again.",
      );
      setCourses([]);
      setFilteredCourses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const nextCourses = [...courses]
      .filter((course) => {
        const matchesSearch =
          !normalizedSearch ||
          [course.course_name, course.course_code, course.description]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(normalizedSearch));

        const statusValue = course.is_active ? "active" : "inactive";
        const durationValue = String(course.duration_months ?? "");

        const matchesStatus =
          activeFilters.status.length === 0 ||
          activeFilters.status.includes(statusValue);
        const matchesDuration =
          activeFilters.duration.length === 0 ||
          activeFilters.duration.includes(durationValue);

        return matchesSearch && matchesStatus && matchesDuration;
      })
      .sort((leftCourse, rightCourse) => {
        const leftValue =
          sortBy === "duration_months"
            ? Number(leftCourse.duration_months || 0)
            : sortBy === "is_active"
              ? Number(leftCourse.is_active)
              : String(leftCourse[sortBy] || "").toLowerCase();
        const rightValue =
          sortBy === "duration_months"
            ? Number(rightCourse.duration_months || 0)
            : sortBy === "is_active"
              ? Number(rightCourse.is_active)
              : String(rightCourse[sortBy] || "").toLowerCase();

        if (leftValue < rightValue) {
          return sortOrder === "asc" ? -1 : 1;
        }

        if (leftValue > rightValue) {
          return sortOrder === "asc" ? 1 : -1;
        }

        return 0;
      });

    setFilteredCourses(nextCourses);
  }, [courses, searchTerm, activeFilters, sortBy, sortOrder]);

  const paginatedCourses = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredCourses.slice(startIndex, startIndex + pageSize);
  }, [filteredCourses, currentPage, pageSize]);

  const paginationConfig = useMemo(() => {
    const totalPages = Math.ceil(filteredCourses.length / pageSize);
    return {
      page: currentPage,
      limit: pageSize,
      total: filteredCourses.length,
      totalPages: totalPages || 1,
    };
  }, [filteredCourses.length, currentPage, pageSize]);

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
            courses.map((course) => course.duration_months).filter(Boolean),
          ),
        ]
          .sort((leftValue, rightValue) => leftValue - rightValue)
          .map((duration) => ({
            label: `${duration} month${duration === 1 ? "" : "s"}`,
            value: String(duration),
          })),
      },
    ],
    [courses],
  );

  const suggestions = useMemo(
    () =>
      courses.flatMap((course) => {
        const nextSuggestions = [
          {
            value: course.course_name,
            label: course.course_name,
            type: "course",
          },
        ];

        if (course.course_code) {
          nextSuggestions.push({
            value: course.course_code,
            label: course.course_code,
            type: "code",
          });
        }

        return nextSuggestions;
      }),
    [courses],
  );

  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
    setEditingCourse(null);
  }, []);

  const openCreateDialog = useCallback(() => {
    resetForm();
    setShowFormDialog(true);
  }, [resetForm]);

  const openEditDialog = useCallback((course) => {
    setEditingCourse(course);
    setFormData({
      course_name: course.course_name || "",
      course_code: course.course_code || "",
      duration_months:
        course.duration_months === null || course.duration_months === undefined
          ? ""
          : String(course.duration_months),
      description: course.description || "",
      is_active: Boolean(course.is_active),
    });
    setShowFormDialog(true);
  }, []);

  const openViewDialog = useCallback((course) => {
    setSelectedCourse(course);
    setShowViewDialog(true);
  }, []);

  const openStatusDialog = useCallback((course) => {
    setStatusTargetCourse(course);
    setShowStatusDialog(true);
  }, []);

  const handleExport = useCallback(() => {
    try {
      if (filteredCourses.length === 0) {
        toast.warn("No data to export.");
        return;
      }

      const headers = [
        "Course Name",
        "Course Code",
        "Duration (Months)",
        "Description",
        "Status",
        "Linked Centers",
        "Linked Packages",
      ];

      const rows = filteredCourses.map((course) => [
        course.course_name,
        course.course_code || "",
        course.duration_months || "",
        course.description || "",
        course.is_active ? "Active" : "Inactive",
        course.centers_count || 0,
        course.packages_count || 0,
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
        `courses_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${filteredCourses.length} courses to CSV`);
    } catch (error) {
      console.error("Error exporting courses:", error);
      toast.error("Failed to export courses. Please try again.");
    }
  }, [filteredCourses]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.course_name.trim()) {
      toast.error("Course name is required");
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
      course_name: formData.course_name.trim(),
      course_code: formData.course_code.trim() || null,
      duration_months: formData.duration_months
        ? Number(formData.duration_months)
        : null,
      description: formData.description.trim() || null,
      is_active: formData.is_active,
    };

    try {
      setSubmitting(true);

      const response = editingCourse
        ? await updateCourseCatalog(editingCourse.id, payload)
        : await createCourseCatalog(payload);

      if (!response.success) {
        throw new Error(response.message || "Unable to save course");
      }

      toast.success(
        editingCourse
          ? "Course updated successfully"
          : "Course created successfully",
      );
      setShowFormDialog(false);
      resetForm();
      await fetchCourses();
    } catch (error) {
      console.error("Error saving course:", error);
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to save course",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!statusTargetCourse) {
      return;
    }

    try {
      setSubmitting(true);
      const response = await updateCourseCatalog(statusTargetCourse.id, {
        is_active: !statusTargetCourse.is_active,
      });

      if (!response.success) {
        throw new Error(response.message || "Unable to update course status");
      }

      toast.success(
        statusTargetCourse.is_active
          ? "Course deactivated successfully"
          : "Course activated successfully",
      );
      setShowStatusDialog(false);
      setStatusTargetCourse(null);
      await fetchCourses();
    } catch (error) {
      console.error("Error updating course status:", error);
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to update course status",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: "course_name",
        header: "Course",
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <span className="font-medium text-gray-900">
              {row.original.course_name}
            </span>
            <span className="text-xs text-gray-500">
              {row.original.course_code || "No code"}
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
        id: "usage",
        header: "Usage",
        cell: ({ row }) => (
          <div className="space-y-1 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-400" />
              <span>{row.original.centers_count || 0} centers</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-gray-400" />
              <span>{row.original.packages_count || 0} packages</span>
            </div>
          </div>
        ),
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
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [openEditDialog, openStatusDialog, openViewDialog],
  );

  const totalCourses = courses.length;
  const activeCourses = courses.filter((course) => course.is_active).length;
  const inactiveCourses = totalCourses - activeCourses;
  const uniqueDurations = new Set(
    courses.map((course) => course.duration_months).filter(Boolean),
  ).size;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Courses Management
          </h1>
          <p className="mt-2 text-gray-600">
            Manage the course master data used across centers, uploads, and
            refurbishment workflows.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-sm text-gray-600">Total Courses</div>
            <div className="text-2xl font-bold">{totalCourses}</div>
          </div>
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-sm text-gray-600">Active Courses</div>
            <div className="text-2xl font-bold text-green-700">
              {activeCourses}
            </div>
          </div>
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-sm text-gray-600">Inactive Courses</div>
            <div className="text-2xl font-bold text-gray-700">
              {inactiveCourses}
            </div>
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
          placeholder="Search courses by name, code, or description..."
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
            { label: "Course Name", value: "course_name" },
            { label: "Course Code", value: "course_code" },
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
              label: "Add Course",
              onClick: openCreateDialog,
              icon: Plus,
            },
          ]}
          table={table}
          storageKey="courses-management-table"
          suggestions={suggestions}
        />

        <EnhancedDataTable
          columns={columns}
          data={paginatedCourses}
          pagination={paginationConfig}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newPageSize) => {
            setPageSize(newPageSize);
            setCurrentPage(1);
          }}
          isLoading={loading}
          emptyMessage="No courses found"
          storageKey="courses-management-table"
          onTableReady={setTable}
        />

        <Dialog
          open={showFormDialog}
          onOpenChange={(open) => {
            setShowFormDialog(open);
            if (!open) {
              resetForm();
            }
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingCourse ? "Edit Course" : "Add Course"}
              </DialogTitle>
              <DialogDescription>
                {editingCourse
                  ? "Update the course fields used throughout the portal."
                  : "Create a new course available for administrative workflows."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="course_name">Course Name</Label>
                  <Input
                    id="course_name"
                    value={formData.course_name}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        course_name: event.target.value,
                      }))
                    }
                    placeholder="Enter course name"
                    maxLength={255}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="course_code">Course Code</Label>
                  <Input
                    id="course_code"
                    value={formData.course_code}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        course_code: event.target.value,
                      }))
                    }
                    placeholder="Enter course code"
                    maxLength={50}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration_months">Duration (Months)</Label>
                  <Input
                    id="duration_months"
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
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Enter course description"
                    rows={5}
                    maxLength={2000}
                  />
                </div>

                <div className="flex items-center gap-3 md:col-span-2">
                  <Checkbox
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        is_active: Boolean(checked),
                      }))
                    }
                  />
                  <Label htmlFor="is_active" className="cursor-pointer">
                    Course is active and available in the system
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
                    ? editingCourse
                      ? "Saving..."
                      : "Creating..."
                    : editingCourse
                      ? "Save Changes"
                      : "Create Course"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                Course Details
              </DialogTitle>
              <DialogDescription>
                Full configuration for{" "}
                {selectedCourse?.course_name || "the selected course"}
              </DialogDescription>
            </DialogHeader>

            {selectedCourse && (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                      Course Name
                    </p>
                    <p className="font-semibold text-gray-900">
                      {selectedCourse.course_name}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                      Course Code
                    </p>
                    <p className="text-gray-700">
                      {selectedCourse.course_code || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                      Duration
                    </p>
                    <p className="text-gray-700">
                      {selectedCourse.duration_months
                        ? `${selectedCourse.duration_months} month${selectedCourse.duration_months === 1 ? "" : "s"}`
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
                        selectedCourse.is_active
                          ? "border-green-200 bg-green-50 text-green-700"
                          : "border-gray-200 bg-gray-100 text-gray-700"
                      }
                    >
                      {selectedCourse.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>

                <div className="rounded-lg border bg-gray-50 p-4">
                  <p className="mb-2 text-sm font-semibold text-gray-700">
                    Description
                  </p>
                  <p className="text-sm leading-6 text-gray-600">
                    {selectedCourse.description || "No description provided"}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <p className="mb-1 text-sm font-semibold text-gray-700">
                      Linked Centers
                    </p>
                    <p className="text-2xl font-bold text-blue-700">
                      {selectedCourse.centers_count || 0}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="mb-1 text-sm font-semibold text-gray-700">
                      Linked Packages
                    </p>
                    <p className="text-2xl font-bold text-purple-700">
                      {selectedCourse.packages_count || 0}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                      Created At
                    </p>
                    <p className="text-gray-700">
                      {formatDateTime(selectedCourse.created_at)}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                      Updated At
                    </p>
                    <p className="text-gray-700">
                      {formatDateTime(selectedCourse.updated_at)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowViewDialog(false)}
              >
                Close
              </Button>
              {selectedCourse && (
                <Button
                  onClick={() => {
                    setShowViewDialog(false);
                    openEditDialog(selectedCourse);
                  }}
                >
                  Edit Course
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showStatusDialog}
          onOpenChange={(open) => {
            setShowStatusDialog(open);
            if (!open) {
              setStatusTargetCourse(null);
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {statusTargetCourse?.is_active
                  ? "Deactivate Course"
                  : "Activate Course"}
              </DialogTitle>
              <DialogDescription>
                {statusTargetCourse?.is_active
                  ? "The course will no longer appear in active course selections, but existing linked data will remain intact."
                  : "The course will become available again across the system."}
              </DialogDescription>
            </DialogHeader>

            {statusTargetCourse && (
              <div className="space-y-3 py-2 text-sm text-gray-700">
                <p>
                  <span className="font-semibold">Course:</span>{" "}
                  {statusTargetCourse.course_name}
                </p>
                <p>
                  <span className="font-semibold">Linked centers:</span>{" "}
                  {statusTargetCourse.centers_count || 0}
                </p>
                <p>
                  <span className="font-semibold">Linked packages:</span>{" "}
                  {statusTargetCourse.packages_count || 0}
                </p>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowStatusDialog(false);
                  setStatusTargetCourse(null);
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmStatusChange} disabled={submitting}>
                {submitting
                  ? statusTargetCourse?.is_active
                    ? "Deactivating..."
                    : "Activating..."
                  : statusTargetCourse?.is_active
                    ? "Confirm Deactivate"
                    : "Confirm Activate"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default CoursesManagementPage;
