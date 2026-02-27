/**
 * PackageSelector � 100% native HTML, zero Radix UI dependencies.
 *
 * All interactive elements are plain HTML + Tailwind classes.
 * This completely avoids the @radix-ui/react-compose-refs + React 19
 * "Maximum update depth exceeded" issue that plagued the previous version.
 *
 * Stable callback pattern (useRef + empty-dep useCallback) is kept so
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
} from "@heroicons/react/24/outline";
import { getCourses } from "../../services/data.service";

// --- Custom Checkbox -----------------------------------------------------------
// No Radix, no compose-refs � pure SVG + HTML.
function NativeCheckbox({ id, checked, onChange, onClick, className = "" }) {
  return (
    <div
      id={id}
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) =>
        (e.key === " " || e.key === "Enter") && onChange?.(!checked)
      }
      className={`
        flex-shrink-0 w-5 h-5 rounded border-2 cursor-pointer
        flex items-center justify-center transition-colors duration-150
        ${
          checked
            ? "bg-blue-600 border-blue-600"
            : "bg-white border-gray-300 hover:border-blue-400"
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

// --- PackageSelector ----------------------------------------------------------
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

  // -- Stable refs: update on every render, never cause re-renders -------------
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;

  const selectedPackagesRef = useRef(selectedPackages);
  selectedPackagesRef.current = selectedPackages;

  // -- Fetch courses ------------------------------------------------------------
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

  // -- Filtering ----------------------------------------------------------------
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
        (pkg) => pkg.courseIds && pkg.courseIds.includes(selectedCourse),
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

  // -- Callbacks � all use refs so they are always stable (empty deps) ---------
  const handleTogglePackage = useCallback((packageId) => {
    const current = selectedPackagesRef.current;
    const next = current.includes(packageId)
      ? current.filter((id) => id !== packageId)
      : [...current, packageId];
    onSelectionChangeRef.current(next);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeselectAll = useCallback(() => {
    onSelectionChangeRef.current([]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    <div className="space-y-4">
      {/* -- Search ------------------------------------------------------------- */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search packages by name or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-10 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* -- Lab Filter Chips --------------------------------------------------- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Filter by Lab:
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <button
            type="button"
            onClick={() => setSelectedCourse("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedCourse === "all"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All Labs
          </button>

          {coursesLoading ? (
            <span className="text-sm text-gray-500">Loading labs...</span>
          ) : (
            courses.map((course) => (
              <button
                type="button"
                key={course.id}
                onClick={() => setSelectedCourse(course.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCourse === course.id
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {course.course_name}
              </button>
            ))
          )}

          {/* Selection count + toggle button */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm font-medium text-blue-900 py-2 px-4 bg-blue-50 rounded-lg border border-blue-200">
              {selectedPackages.length} / {filteredPackages.length} selected
            </span>
            {filteredPackages.length > 0 && (
              <button
                type="button"
                onClick={
                  allVisibleSelected
                    ? handleDeselectAll
                    : handleSelectAllVisible
                }
                className="text-xs font-medium px-3 py-1.5 border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 transition-colors duration-150"
              >
                {allVisibleSelected ? "Deselect All" : "Select All Visible"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* -- Package List ------------------------------------------------------- */}
      <div className="border rounded-lg max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            <span className="text-sm text-gray-500">Loading packages...</span>
          </div>
        ) : filteredPackages.length > 0 ? (
          <div className="divide-y">
            {filteredPackages.map((pkg) => {
              const isSelected = selectedPackages.includes(pkg.id);
              const images = pkg.images
                ? (() => {
                    try {
                      return JSON.parse(pkg.images);
                    } catch {
                      return [];
                    }
                  })()
                : [];
              const firstImage = images[0] ?? null;
              const labs = pkg.course_names
                ? pkg.course_names.split(", ").filter(Boolean)
                : [];
              const hasImageError = firstImage && imageErrors.has(firstImage);

              return (
                <div
                  key={pkg.id}
                  className={`p-4 cursor-pointer transition-all duration-150 hover:shadow-md ${
                    isSelected
                      ? "bg-blue-50 border-l-4 border-blue-600"
                      : "hover:bg-gray-50 border-l-4 border-transparent"
                  }`}
                  onClick={() => handleTogglePackage(pkg.id)}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox � native, no Radix */}
                    <NativeCheckbox
                      id={`pkg-chk-${pkg.id}`}
                      checked={isSelected}
                      onChange={() => handleTogglePackage(pkg.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1"
                    />

                    {/* Thumbnail */}
                    <div className="flex-shrink-0">
                      {firstImage && !hasImageError ? (
                        <img
                          src={firstImage}
                          alt={pkg.package_name}
                          className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200 shadow-sm"
                          onError={() => handleImageError(firstImage)}
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                          <PhotoIcon className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <label
                        htmlFor={`pkg-chk-${pkg.id}`}
                        className="text-base font-semibold text-gray-900 cursor-pointer"
                      >
                        {pkg.package_name}
                      </label>

                      {pkg.description && (
                        <p className="text-sm text-gray-600 leading-relaxed mt-1 mb-2 line-clamp-2">
                          {pkg.description}
                        </p>
                      )}

                      {/* Lab tags � plain spans, no Radix */}
                      {labs.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {labs.map((lab, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full"
                            >
                              ??? {lab}
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
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <MagnifyingGlassIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              No packages found
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {hasActiveFilters
                ? "Try adjusting your filters or search term"
                : "No packages available at the moment"}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="flex items-center gap-2 text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white hover:bg-gray-50"
              >
                <XMarkIcon className="h-4 w-4" />
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* -- Footer ------------------------------------------------------------- */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          Click on a package card or checkbox to select. Multiple selections
          allowed.
        </span>
        <span className="font-medium">
          {selectedPackages.length} of {packages.length} total packages selected
        </span>
      </div>
    </div>
  );
});

export default PackageSelector;
