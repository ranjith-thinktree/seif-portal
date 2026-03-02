import React, { useMemo, useState } from "react";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  PhotoIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import EnhancedDataTable from "../../common/EnhancedDataTable";
import AdvancedSearchBar from "../../common/AdvancedSearchBar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../ui/dialog";
import { Checkbox } from "../../ui/checkbox";

/**
 * PackagesTab Component
 * Displays refurbishment packages with CRUD operations
 */
const PackagesTab = ({
  table,
  upgradationTable = null,
  loading = false,
  onExport,
  // CRUD handlers
  onCreatePackage,
  onEditPackage,
  onDeletePackage,
  // Course options
  courseOptions = [],
}) => {
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingPackage, setViewingPackage] = useState(null);
  const [editingPackage, setEditingPackage] = useState(null);
  const [packageFormData, setPackageFormData] = useState({
    name: "",
    description: "",
    courses: [],
    category: "refurbishment",
  });

  // Sub-tab: which category is active in the packages tab
  const [activeCategory, setActiveCategory] = useState("refurbishment");

  // TanStack table instance for column visibility toggle
  const [tableInstance, setTableInstance] = useState(null);

  // Image upload state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);
  const [existingImages, setExistingImages] = useState([]);

  // Handle create button click
  const handleCreateClick = () => {
    setEditingPackage(null);
    setPackageFormData({
      name: "",
      description: "",
      courses: [],
      category: activeCategory,
    });
    setSelectedFiles([]);
    setImagePreviewUrls([]);
    setExistingImages([]);
    setShowPackageModal(true);
  };

  // Handle edit button click
  const handleEditClick = (pkg) => {
    setEditingPackage(pkg);
    setPackageFormData({
      name: pkg.name || "",
      description: pkg.description || "",
      courses: pkg.courseIds ? pkg.courseIds : [],
      category: pkg.category || "refurbishment",
    });
    setSelectedFiles([]);
    setImagePreviewUrls([]);
    setExistingImages(pkg.images ? JSON.parse(pkg.images) : []);
    setShowPackageModal(true);
  };

  // Handle view button click
  const handleViewClick = (pkg) => {
    setViewingPackage(pkg);
    setShowViewModal(true);
  };

  // Handle form submit
  const handleSubmit = (e) => {
    e.preventDefault();

    // Create FormData to send files
    const formData = new FormData();
    formData.append("name", packageFormData.name);
    formData.append("description", packageFormData.description);
    formData.append("courses", JSON.stringify(packageFormData.courses));
    formData.append("category", packageFormData.category || activeCategory);

    // Add new image files
    selectedFiles.forEach((file) => {
      formData.append("images", file);
    });

    // Add existing images for edit mode
    if (editingPackage && existingImages.length > 0) {
      formData.append("existingImages", JSON.stringify(existingImages));
    }

    if (editingPackage) {
      onEditPackage(editingPackage.id, formData);
    } else {
      onCreatePackage(formData);
    }

    setShowPackageModal(false);
  };

  // Handle image file selection
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);

    // Check total images (existing + new) don't exceed 10
    const totalImages =
      existingImages.length + selectedFiles.length + files.length;
    if (totalImages > 10) {
      alert("Maximum 10 images allowed per package");
      return;
    }

    // Validate file types and size
    const validFiles = files.filter((file) => {
      const isImage = file.type.startsWith("image/");
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB

      if (!isImage) {
        alert(`${file.name} is not an image file`);
        return false;
      }
      if (!isValidSize) {
        alert(`${file.name} exceeds 5MB size limit`);
        return false;
      }
      return true;
    });

    // Create preview URLs
    const newPreviewUrls = validFiles.map((file) => URL.createObjectURL(file));

    setSelectedFiles((prev) => [...prev, ...validFiles]);
    setImagePreviewUrls((prev) => [...prev, ...newPreviewUrls]);
  };

  // Remove newly selected image
  const handleRemoveNewImage = (index) => {
    URL.revokeObjectURL(imagePreviewUrls[index]); // Clean up memory
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  // Remove existing image
  const handleRemoveExistingImage = (index) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle course selection
  const handleCourseToggle = (courseId) => {
    setPackageFormData((prev) => ({
      ...prev,
      courses: prev.courses.includes(courseId)
        ? prev.courses.filter((id) => id !== courseId)
        : [...prev.courses, courseId],
    }));
  };

  // Column definitions
  const columns = useMemo(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Package Name",
        cell: ({ row }) => (
          <span className="font-medium text-gray-900">{row.original.name}</span>
        ),
        size: 200,
        enableHiding: false,
        enableResizing: true,
      },
      {
        id: "description",
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">
            {row.original.description || "-"}
          </span>
        ),
        size: 300,
        enableHiding: true,
        enableResizing: true,
      },
      {
        id: "courses_names",
        accessorKey: "course_names",
        header: "Labs",
        cell: ({ row }) => {
          const courseNames = row.original.course_names || "";
          return (
            <span className="text-sm text-gray-700">
              {courseNames || (
                <span className="text-gray-400 italic">No labs assigned</span>
              )}
            </span>
          );
        },
        size: 250,
        enableHiding: true,
        enableResizing: true,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewClick(row.original)}
              disabled={loading}
              title="View Package"
              className="text-blue-600 hover:text-blue-700"
            >
              <EyeIcon className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditClick(row.original)}
              disabled={loading}
              title="Edit Package"
            >
              <PencilIcon className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDeletePackage(row.original)}
              disabled={loading}
              title="Delete Package"
              className="text-red-500 hover:text-red-700"
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>
        ),
        size: 100,
        enableHiding: false,
        enableResizing: false,
      },
    ],
    [loading, onDeletePackage],
  );

  // Filter groups
  const filterGroups = useMemo(
    () => [
      {
        label: "Labs",
        key: "courses",
        options: courseOptions.map((course) => ({
          value: course.id,
          label: course.name,
        })),
        isMulti: true,
      },
    ],
    [courseOptions],
  );

  // Sort options
  const sortOptions = useMemo(
    () => [
      { label: "Name (A-Z)", value: "name" },
      { label: "Date Created", value: "created_at" },
    ],
    [],
  );

  // Active table based on selected category sub-tab
  const activeTable =
    activeCategory === "upgradation" && upgradationTable
      ? upgradationTable
      : table;

  // Pagination info
  const paginationInfo = {
    page: activeTable.currentPage,
    limit: activeTable.pageSize,
    total: activeTable.total,
    totalPages: activeTable.totalPages,
  };

  // Actions for AdvancedSearchBar
  const actions = [
    {
      label: "Export CSV",
      onClick: onExport,
      icon: ArrowDownTrayIcon,
      variant: "outline",
      disabled: loading || activeTable.total === 0,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Category Sub-Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-3">
        <button
          onClick={() => setActiveCategory("refurbishment")}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
            activeCategory === "refurbishment"
              ? "bg-blue-100 text-blue-800 border border-blue-200"
              : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
          }`}
        >
          Refurbishment Packages
          {table.total > 0 && (
            <span className="ml-2 bg-blue-200 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">
              {table.total}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveCategory("upgradation")}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
            activeCategory === "upgradation"
              ? "bg-purple-100 text-purple-800 border border-purple-200"
              : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
          }`}
        >
          Upgradation Packages
          {upgradationTable && upgradationTable.total > 0 && (
            <span className="ml-2 bg-purple-200 text-purple-800 text-xs font-bold px-2 py-0.5 rounded-full">
              {upgradationTable.total}
            </span>
          )}
        </button>
      </div>

      {/* Header with Create Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {activeCategory === "upgradation"
              ? "Upgradation Packages"
              : "Refurbishment Packages"}
          </h3>
          <p className="text-sm text-gray-600">
            {activeCategory === "upgradation"
              ? "Manage room-level upgradation package templates (course-linked)"
              : "Manage package templates for refurbishment requests"}
          </p>
        </div>
        <Button
          onClick={handleCreateClick}
          disabled={loading}
          className={`flex items-center text-white focus:ring-primary-400 ${
            activeCategory === "upgradation"
              ? "bg-purple-600 hover:bg-purple-700"
              : "bg-primary-500 hover:bg-primary-600"
          }`}
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          {activeCategory === "upgradation"
            ? "Create Upgradation Package"
            : "Create Package"}
        </Button>
      </div>

      {/* Advanced Search Bar */}
      <AdvancedSearchBar
        searchTerm={activeTable.searchTerm}
        onSearchChange={activeTable.setSearchTerm}
        filterGroups={filterGroups}
        activeFilters={activeTable.activeFilters}
        onFiltersChange={activeTable.setActiveFilters}
        sortOptions={sortOptions}
        sortBy={activeTable.sortBy}
        sortOrder={activeTable.sortOrder}
        onSortChange={activeTable.setSortBy}
        onSortOrderChange={activeTable.setSortOrder}
        loading={loading}
        actions={actions}
        placeholder={`Search ${activeCategory} packages by name or description...`}
        table={tableInstance}
        storageKey={`refurbishment-packages-${activeCategory}`}
      />

      {/* Data Table */}
      <EnhancedDataTable
        data={activeTable.data}
        columns={columns}
        pagination={paginationInfo}
        onPageChange={activeTable.goToPage}
        onPageSizeChange={activeTable.setPageSize}
        isLoading={loading}
        storageKey={`refurbishment-packages-${activeCategory}`}
        onTableReady={(t) => setTableInstance(t)}
        emptyMessage={
          activeCategory === "upgradation"
            ? "No upgradation packages found. Create your first upgradation package to get started."
            : "No packages found. Create your first package to get started."
        }
      />

      {/* Create/Edit Package Modal */}
      <Dialog open={showPackageModal} onOpenChange={setShowPackageModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {editingPackage
                ? "Edit Package"
                : `Create New ${packageFormData.category === "upgradation" ? "Upgradation" : "Refurbishment"} Package`}
            </DialogTitle>
            <DialogDescription>
              {editingPackage
                ? "Update the package details below"
                : packageFormData.category === "upgradation"
                  ? "Create a new upgradation package template (room-level, course-linked)"
                  : "Create a new refurbishment package template"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Package Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Package Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={packageFormData.name}
                onChange={(e) =>
                  setPackageFormData((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Basic Furniture Package"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={packageFormData.description}
                onChange={(e) =>
                  setPackageFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description of the package contents"
                rows={3}
              />
            </div>

            {/* Labs Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Applicable Labs <span className="text-red-500">*</span>
              </label>
              <div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                {courseOptions.length > 0 ? (
                  courseOptions.map((course) => (
                    <div
                      key={course.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`course-${course.id}`}
                        checked={packageFormData.courses.includes(course.id)}
                        onCheckedChange={() => handleCourseToggle(course.id)}
                      />
                      <label
                        htmlFor={`course-${course.id}`}
                        className="text-sm text-gray-700 cursor-pointer"
                      >
                        {course.name}
                      </label>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No labs available</p>
                )}
              </div>
              {packageFormData.courses.length === 0 && (
                <p className="text-xs text-red-500 mt-1">
                  Select at least one lab
                </p>
              )}
            </div>

            {/* Package Images */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Package Images
                <span className="text-gray-500 text-xs ml-2">
                  (Max 10 images, 5MB each)
                </span>
              </label>

              {/* Existing Images (Edit Mode) */}
              {existingImages.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-700 mb-2">
                    Existing Images ({existingImages.length}):
                  </p>
                  <div className="grid grid-cols-4 gap-3">
                    {existingImages.map((imagePath, index) => {
                      // Handle both full URLs (http/https) and relative paths
                      const imageUrl = imagePath.startsWith("http")
                        ? imagePath
                        : `${imagePath.startsWith("/") ? "" : "/"}${imagePath}`;

                      return (
                        <div key={index} className="relative group">
                          <img
                            src={imageUrl}
                            alt={`Existing ${index + 1}`}
                            className="w-full h-28 object-cover rounded-lg border-2 border-gray-300 cursor-pointer hover:border-blue-500 transition-all"
                            onClick={() => window.open(imageUrl, "_blank")}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveExistingImage(index)}
                            className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                            title="Remove image"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-all flex items-center justify-center">
                            <EyeIcon className="w-5 h-5 text-white opacity-0 group-hover:opacity-80 transition-opacity" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* New Image Previews */}
              {imagePreviewUrls.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-700 mb-2">
                    New Images ({imagePreviewUrls.length}):
                  </p>
                  <div className="grid grid-cols-4 gap-3">
                    {imagePreviewUrls.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-28 object-cover rounded-lg border-2 border-gray-300 border-dashed hover:border-green-500 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveNewImage(index)}
                          className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                          title="Remove image"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                        <div className="absolute top-1 left-1 bg-green-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                          NEW
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Zone */}
              {existingImages.length + selectedFiles.length < 10 && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors bg-gray-50 hover:bg-blue-50">
                  <PhotoIcon className="w-14 h-14 mx-auto text-gray-400 mb-3" />
                  <label
                    htmlFor="package-images"
                    className="cursor-pointer block"
                  >
                    <span className="text-sm text-blue-600 hover:text-blue-700 font-semibold">
                      Click to upload
                    </span>
                    <span className="text-sm text-gray-600">
                      {" "}
                      or drag and drop
                    </span>
                    <input
                      id="package-images"
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-2">
                    PNG, JPG, GIF, WEBP up to 5MB each
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-600">
                  Total images:{" "}
                  <span className="font-semibold">
                    {existingImages.length + selectedFiles.length}
                  </span>{" "}
                  / 10
                </p>
                {existingImages.length + selectedFiles.length >= 10 && (
                  <p className="text-xs text-amber-600 font-medium">
                    Maximum limit reached
                  </p>
                )}
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPackageModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  loading ||
                  !packageFormData.name.trim() ||
                  packageFormData.courses.length === 0
                }
              >
                {editingPackage ? "Update Package" : "Create Package"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Package Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Package Details
            </DialogTitle>
            <DialogDescription>
              Complete information about this refurbishment package
            </DialogDescription>
          </DialogHeader>

          {viewingPackage && (
            <div className="space-y-6 py-4">
              {/* Package Header with Status */}
              <div
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  viewingPackage.category === "upgradation"
                    ? "bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200"
                    : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${viewingPackage.category === "upgradation" ? "bg-purple-600" : "bg-blue-600"}`}
                  >
                    <PhotoIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {viewingPackage.name}
                    </h3>
                    <p
                      className={`text-sm mt-0.5 ${viewingPackage.category === "upgradation" ? "text-purple-600" : "text-gray-600"}`}
                    >
                      {viewingPackage.category === "upgradation"
                        ? "Upgradation Package"
                        : "Refurbishment Package"}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={viewingPackage.isActive ? "success" : "secondary"}
                  className="text-sm px-4 py-1.5"
                >
                  {viewingPackage.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>

              {/* Package Images - TOP SECTION */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 border-b pb-2 flex items-center gap-2">
                  <PhotoIcon className="h-5 w-5 text-blue-600" />
                  Package Images
                </h4>
                {viewingPackage.images ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {JSON.parse(viewingPackage.images).map(
                      (imageUrl, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-w-16 aspect-h-9 rounded-xl overflow-hidden border-2 border-gray-200 shadow-md hover:shadow-xl transition-all duration-300">
                            <img
                              src={imageUrl}
                              alt={`${viewingPackage.name} - Image ${index + 1}`}
                              className="w-full h-48 object-cover cursor-pointer group-hover:scale-105 transition-transform duration-300"
                              onClick={() => window.open(imageUrl, "_blank")}
                              onError={(e) => {
                                e.target.src =
                                  "https://via.placeholder.com/400x300?text=Image+Not+Found";
                              }}
                            />
                          </div>
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-xl transition-all flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-3 shadow-lg">
                              <EyeIcon className="w-6 h-6 text-blue-600" />
                            </div>
                          </div>
                          <div className="absolute top-2 right-2 bg-gray-900 bg-opacity-75 text-white text-xs font-medium px-2 py-1 rounded-full">
                            {index + 1} /{" "}
                            {JSON.parse(viewingPackage.images).length}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
                    <PhotoIcon className="w-16 h-16 mx-auto text-gray-400 mb-3" />
                    <p className="text-sm font-medium text-gray-600">
                      No images available
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Images will be displayed here once uploaded
                    </p>
                  </div>
                )}
              </div>

              {/* Package Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 border-b pb-2">
                    Package Information
                  </h4>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {viewingPackage.description || (
                          <span className="italic text-gray-400">
                            No description provided
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 border-b pb-2">
                    Applicable Labs
                  </h4>

                  {/* Labs */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Training Labs
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {viewingPackage.course_names ? (
                        viewingPackage.course_names
                          .split(", ")
                          .map((courseName, index) => (
                            <Badge
                              key={index}
                              className="px-3 py-1.5 bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200 transition-colors"
                            >
                              {courseName}
                            </Badge>
                          ))
                      ) : (
                        <div className="w-full text-center py-4 bg-gray-50 rounded-lg border border-gray-200">
                          <span className="text-sm text-gray-400 italic">
                            No labs assigned
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Metadata - Bottom Section */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Created At
                  </label>
                  <p className="text-sm font-medium text-gray-900">
                    {viewingPackage.createdAt
                      ? new Date(viewingPackage.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )
                      : "-"}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Last Updated
                  </label>
                  <p className="text-sm font-medium text-gray-900">
                    {viewingPackage.updated_at
                      ? new Date(viewingPackage.updated_at).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )
                      : "-"}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowViewModal(false)}
                  className="px-6"
                >
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowViewModal(false);
                    setTimeout(() => handleEditClick(viewingPackage), 100);
                  }}
                  className="bg-blue-600 text-white hover:bg-blue-700 px-6"
                >
                  <PencilIcon className="w-4 h-4 mr-2" />
                  Edit Package
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PackagesTab;
