/**
 * PackageSelector - 100% native HTML, zero Radix UI dependencies.
 *
 * All interactive elements are plain HTML + Tailwind classes.
 * This avoids the @radix-ui/react-compose-refs + React 19
 * "Maximum update depth exceeded" issue.
 *
 * Stable callback pattern (useRef + empty-dep useCallback) ensures
 * onSelectionChange never causes unnecessary re-renders.
 */
import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  PhotoIcon,
  BeakerIcon,
} from "@heroicons/react/24/outline";
import { getCourses } from "../../services/data.service";

// ---------------------------------------------------------------------------
// Custom Checkbox - pure SVG + HTML, no Radix
// ---------------------------------------------------------------------------
function NativeCheckbox({ checked, className = "" }) {
  return (
    <div
      role="checkbox"
      aria-checked={checked}
      className={`
        flex-shrink-0 w-5 h-5 rounded-md border-2 pointer-events-none
        flex items-center justify-center transition-colors duration-150
        ${
          checked ? "bg-green-600 border-green-600" : "bg-white border-gray-300"
        } ${className}
      `}
    >
      {checked && (
        <svg
          className="w-3 h-3 text-white"
          fill="none"
          viewBox="0 0 12 10"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <polyline points="1,5 4.5,8.5 11,1" />
        </svg>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PackageSelector
// ---------------------------------------------------------------------------
const PackageSelector = React.memo(function PackageSelector({
  packages = [],
  selectedPackages = [],
  onSelectionChange,
  loading = false,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [imageErrors, setImageErrors] = useState(new Set());

  // Stable refs - updated every render but never cause re-renders
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;
  const selectedPackagesRef = useRef(selectedPackages);
  selectedPackagesRef.current = selectedPackages;

  // Fetch lab/course filter options once
  useEffect(() => {
    let cancelled = false;
    const fetchCourses = async () => {
      setCoursesLoading(true);
      try {
        const response = await getCourses();
        if (!cancelled && response.success && Array.isArray(response.data)) {
          setCourses(response.data);
        }
      } catch {
        // silently ignore
      } finally {
        if (!cancelled) setCoursesLoading(false);
      }
    };
    fetchCourses();
    return () => {
      cancelled = true;
    };
  }, []);

  // Filtered package list
  const filteredPackages = useMemo(() => {
    let result = packages;
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      result = result.filter(
        (pkg) =>
          pkg.package_name?.toLowerCase().includes(s) ||
          pkg.description?.toLowerCase().includes(s),
      );
    }
    if (selectedCourse !== "all") {
      result = result.filter(
        (pkg) =>
          pkg.courseIds &&
          String(pkg.courseIds)
            .split(",")
            .map((id) => id.trim())
            .includes(String(selectedCourse)),
      );
    }
    return result;
  }, [packages, searchTerm, selectedCourse]);

  const hasActiveFilters = Boolean(
    searchTerm.trim() || selectedCourse !== "all",
  );

  const allVisibleSelected = useMemo(() => {
    if (filteredPackages.length === 0) return false;
    return filteredPackages.every((pkg) =>
      selectedPackagesRef.current.includes(pkg.id),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredPackages, selectedPackages]);

  // Stable callbacks
  const handleTogglePackage = useCallback((packageId) => {
    const current = selectedPackagesRef.current;
    const next = current.includes(packageId)
      ? current.filter((id) => id !== packageId)
      : [...current, packageId];
    onSelectionChangeRef.current(next);
  }, []);

  const handleDeselectAll = useCallback(() => {
    onSelectionChangeRef.current([]);
  }, []);

  const handleSelectAllVisible = useCallback(() => {
    onSelectionChangeRef.current(filteredPackages.map((pkg) => pkg.id));
  }, [filteredPackages]);

  const handleImageError = useCallback((url) => {
    setImageErrors((prev) => new Set([...prev, url]));
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchTerm("");
    setSelectedCourse("all");
  }, []);

  return (
    <div className="space-y-3">
      {/* Toolbar: search + count + select-all */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search packages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        <span
          className={`shrink-0 text-xs font-semibold px-3 py-2 rounded-xl border ${
            selectedPackages.length > 0
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-gray-50 text-gray-500 border-gray-200"
          }`}
        >
          {selectedPackages.length} / {packages.length} selected
        </span>

        {filteredPackages.length > 0 && (
          <button
            type="button"
            onClick={
              allVisibleSelected ? handleDeselectAll : handleSelectAllVisible
            }
            className={`shrink-0 text-xs font-semibold px-3 py-2 rounded-xl border transition-colors ${
              allVisibleSelected
                ? "border-red-200 text-red-600 bg-red-50 hover:bg-red-100"
                : "border-green-200 text-green-700 bg-green-50 hover:bg-green-100"
            }`}
          >
            {allVisibleSelected ? "Deselect All" : "Select All"}
          </button>
        )}
      </div>

      {/* Lab filter chips */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <button
          type="button"
          onClick={() => setSelectedCourse("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            selectedCourse === "all"
              ? "bg-green-600 text-white shadow-sm"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All Labs
        </button>

        {coursesLoading ? (
          <span className="text-xs text-gray-400 ml-1">Loading...</span>
        ) : (
          courses.map((course) => (
            <button
              type="button"
              key={course.id}
              onClick={() => setSelectedCourse(course.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                selectedCourse === course.id
                  ? "bg-green-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {course.course_name}
            </button>
          ))
        )}

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="ml-auto text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            <XMarkIcon className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Package list */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <div className="animate-spin rounded-full h-9 w-9 border-2 border-gray-100 border-t-green-600" />
            <span className="text-sm text-gray-400">Loading packages...</span>
          </div>
        ) : filteredPackages.length > 0 ? (
          <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {filteredPackages.map((pkg) => {
              const isSelected = selectedPackages.includes(pkg.id);

              // Parse images array
              let firstImage = null;
              if (pkg.images) {
                try {
                  const imgs = JSON.parse(pkg.images);
                  firstImage = Array.isArray(imgs) ? (imgs[0] ?? null) : null;
                } catch {
                  firstImage = null;
                }
              }

              // Parse lab tags (course_names is comma-separated)
              const labs = pkg.course_names
                ? pkg.course_names
                    .split(",")
                    .map((l) => l.trim())
                    .filter(Boolean)
                : [];

              const hasImageError = firstImage && imageErrors.has(firstImage);
              const displayName =
                pkg.package_name || pkg.name || "Unnamed Package";

              return (
                <div
                  key={pkg.id}
                  onClick={() => handleTogglePackage(pkg.id)}
                  className={`px-4 py-3.5 cursor-pointer select-none transition-all duration-100 ${
                    isSelected
                      ? "bg-green-50 border-l-4 border-l-green-500"
                      : "bg-white hover:bg-gray-50 border-l-4 border-l-transparent"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <NativeCheckbox checked={isSelected} className="mt-0.5" />

                    {/* Thumbnail */}
                    <div className="flex-shrink-0">
                      {firstImage && !hasImageError ? (
                        <img
                          src={firstImage}
                          alt={displayName}
                          className="w-14 h-14 object-cover rounded-xl border border-gray-200"
                          onError={() => handleImageError(firstImage)}
                        />
                      ) : (
                        <div
                          className={`w-14 h-14 rounded-xl border-2 border-dashed flex items-center justify-center ${
                            isSelected
                              ? "border-green-200 bg-green-50"
                              : "border-gray-200 bg-gray-50"
                          }`}
                        >
                          <PhotoIcon
                            className={`w-6 h-6 ${
                              isSelected ? "text-green-400" : "text-gray-300"
                            }`}
                          />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        {/* Use span NOT label - avoids htmlFor click forwarding to checkbox */}
                        <span
                          className={`text-sm font-semibold leading-snug ${
                            isSelected ? "text-green-800" : "text-gray-900"
                          }`}
                        >
                          {displayName}
                        </span>
                        {isSelected && (
                          <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded-full whitespace-nowrap">
                            Selected
                          </span>
                        )}
                      </div>

                      {pkg.description && (
                        <p className="text-xs text-gray-500 leading-relaxed mt-0.5 line-clamp-2">
                          {pkg.description}
                        </p>
                      )}

                      {/* Lab tags */}
                      {labs.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {labs.map((lab, idx) => (
                            <span
                              key={idx}
                              className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${
                                isSelected
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : "bg-gray-50 text-gray-600 border-gray-200"
                              }`}
                            >
                              <BeakerIcon className="w-2.5 h-2.5 shrink-0" />
                              {lab}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <MagnifyingGlassIcon className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">
              No packages found
            </p>
            <p className="text-xs text-gray-400 mb-4">
              {hasActiveFilters
                ? "Try adjusting your filters or search term"
                : "No packages available at the moment"}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="flex items-center gap-1.5 text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white hover:bg-gray-50"
              >
                <XMarkIcon className="h-3.5 w-3.5" />
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default PackageSelector;
