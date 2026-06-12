import { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import useTableSearch from "./useTableSearch";
import refurbishmentService from "../../services/refurbishment.service";
import { getCourses } from "../../services/data.service";

export default function usePackagesTab({ packages, setLoading, refurbishmentRefresh }) {
  const refurbishmentPackages = useMemo(
    () => packages.filter((p) => !p.category || p.category === "refurbishment"),
    [packages],
  );
  const upgradationPackages = useMemo(
    () => packages.filter((p) => p.category === "upgradation"),
    [packages],
  );

  const packagesTable = useTableSearch(refurbishmentPackages, {
    searchFields: ["name", "description"],
    initialFilters: {
      courses: [],
    },
    initialSortBy: "name",
    initialSortOrder: "asc",
    pageSize: 10,
  });

  const upgradationPackagesTable = useTableSearch(upgradationPackages, {
    searchFields: ["name", "description"],
    initialFilters: {
      courses: [],
    },
    initialSortBy: "name",
    initialSortOrder: "asc",
    pageSize: 10,
  });

  const [courseOptions, setCourseOptions] = useState([]);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const response = await getCourses();
        const courses = response.data || [];

        const mappedCourses = courses.map((course) => ({
          id: course.id,
          name: course.course_name,
          code: course.course_code,
          description: course.description,
          duration: course.duration_months,
        }));

        setCourseOptions(mappedCourses);
      } catch (error) {
        console.error("Error loading courses:", error);
        toast.error("Failed to load lab options");
      }
    };

    loadCourses();
  }, []);

  const handleCreatePackage = async (packageData) => {
    try {
      setLoading(true);
      const response = await refurbishmentService.createPackage(packageData);

      if (response.success) {
        toast.success("Package created successfully");
        refurbishmentRefresh.packages();
      }
    } catch (err) {
      console.error("Error creating package:", err);
      toast.error(err.response?.data?.message || "Failed to create package");
    } finally {
      setLoading(false);
    }
  };

  const handleEditPackage = async (packageId, updates) => {
    try {
      setLoading(true);
      const response = await refurbishmentService.updatePackage(
        packageId,
        updates,
      );

      if (response.success) {
        toast.success("Package updated successfully");
        refurbishmentRefresh.packages();
      }
    } catch (err) {
      console.error("Error updating package:", err);
      toast.error(err.response?.data?.message || "Failed to update package");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePackage = async (pkg) => {
    if (
      !window.confirm(
        `Delete package "${pkg.name}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const response = await refurbishmentService.deletePackage(pkg.id);

      if (response.success) {
        toast.success("Package deleted successfully");
        refurbishmentRefresh.packages();
      }
    } catch (err) {
      console.error("Error deleting package:", err);
      toast.error(err.response?.data?.message || "Failed to delete package");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPackages = async () => {
    try {
      setLoading(true);
      toast.info("Export functionality coming soon");
    } catch (err) {
      console.error("Error exporting packages:", err);
      toast.error("Failed to export packages");
    } finally {
      setLoading(false);
    }
  };

  return {
    refurbishmentPackages,
    upgradationPackages,
    packagesTable,
    upgradationPackagesTable,
    courseOptions,
    handleCreatePackage,
    handleEditPackage,
    handleDeletePackage,
    handleExportPackages,
  };
}
