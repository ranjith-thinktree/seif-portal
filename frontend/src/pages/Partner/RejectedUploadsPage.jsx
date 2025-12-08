import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "../../components/layout";
import Breadcrumb from "../../components/common/Breadcrumb";
import SearchBar from "../../components/common/SearchBar";
import Pagination from "../../components/common/Pagination";
import { Badge } from "../../components/ui/badge";
import {
  PencilIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import apiClient from "../../api/client";
import { toast } from "react-toastify";
import { ROUTES } from "../../constants/routes";

/**
 * RejectedUploadsPage
 * Shows uploads with rejected centers that partner can edit and resubmit
 */
const RejectedUploadsPage = () => {
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);

  const [uploads, setUploads] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState([]);
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");

  // Breadcrumb items
  const breadcrumbItems = [
    { label: "Inbox", path: ROUTES.INBOX },
    { label: "Rejected Uploads", path: "#" },
  ];

  // Fetch rejected uploads
  const fetchRejectedUploads = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
      };

      const response = await apiClient.get("/partners/rejected-uploads", {
        params,
      });
      setUploads(response.data.data.data);
      setPagination(response.data.data.pagination);
    } catch (error) {
      console.error("Error fetching rejected uploads:", error);
      toast.error("Failed to load rejected uploads");
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, searchTerm]);

  useEffect(() => {
    fetchRejectedUploads();
  }, [fetchRejectedUploads]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page === 1) {
        fetchRejectedUploads();
      } else {
        setPagination((prev) => ({ ...prev, page: 1 }));
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, fetchRejectedUploads, pagination.page]);

  // Handle search
  const handleSearch = (value) => {
    setSearchTerm(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Handle filter change
  const handleFilterChange = (value, checked) => {
    setFilters((prev) =>
      prev.map((f) => (f.value === value ? { ...f, checked } : f))
    );
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Handle sort change
  const handleSortChange = (sortByValue, sortOrderValue) => {
    setSortBy(sortByValue);
    setSortOrder(sortOrderValue);
  };

  // Apply sorting to uploads
  const getFilteredAndSortedUploads = () => {
    let sorted = [...uploads];

    if (sortBy) {
      sorted.sort((a, b) => {
        let aValue, bValue;

        switch (sortBy) {
          case "date":
            aValue = new Date(a.created_at);
            bValue = new Date(b.created_at);
            break;
          case "file":
            aValue = a.file_name?.toLowerCase() || "";
            bValue = b.file_name?.toLowerCase() || "";
            break;
          case "centers":
            aValue = a.rejected_centers_count || 0;
            bValue = b.rejected_centers_count || 0;
            break;
          case "students":
            aValue = a.rejected_students_count || 0;
            bValue = b.rejected_students_count || 0;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
        if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return sorted;
  };

  const displayUploads = getFilteredAndSortedUploads();

  // Handle row click - navigate to centers page
  const handleRowClick = (upload) => {
    navigate(ROUTES.PARTNER_REJECTED_CENTERS.replace(":uploadId", upload.id));
  };

  // Drag-to-scroll functionality
  useEffect(() => {
    const ele = scrollContainerRef.current;
    if (!ele) return;

    let pos = { top: 0, left: 0, x: 0, y: 0 };
    let isDragging = false;

    const mouseDownHandler = function (e) {
      if (e.target.closest("button, a, input, select, textarea")) return;

      isDragging = false;
      ele.style.cursor = "grabbing";
      ele.style.userSelect = "none";

      pos = {
        left: ele.scrollLeft,
        top: ele.scrollTop,
        x: e.clientX,
        y: e.clientY,
      };

      document.addEventListener("mousemove", mouseMoveHandler);
      document.addEventListener("mouseup", mouseUpHandler);
    };

    const mouseMoveHandler = function (e) {
      const dx = e.clientX - pos.x;
      const dy = e.clientY - pos.y;

      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        isDragging = true;
      }

      if (isDragging) {
        ele.scrollTop = pos.top - dy;
        ele.scrollLeft = pos.left - dx;
      }
    };

    const mouseUpHandler = function () {
      ele.style.cursor = "grab";
      ele.style.userSelect = "";

      document.removeEventListener("mousemove", mouseMoveHandler);
      document.removeEventListener("mouseup", mouseUpHandler);

      if (isDragging) {
        setTimeout(() => {
          isDragging = false;
        }, 10);
      }
    };

    ele.style.cursor = "grab";
    ele.addEventListener("mousedown", mouseDownHandler);

    return () => {
      ele.removeEventListener("mousedown", mouseDownHandler);
      document.removeEventListener("mousemove", mouseMoveHandler);
      document.removeEventListener("mouseup", mouseUpHandler);
    };
  }, []);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbItems} />

        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-2">
            <ExclamationTriangleIcon className="h-7 w-7 text-red-500" />
            Rejected Uploads
          </h1>
          <p className="text-gray-600">
            Review and edit rejected data to resubmit for approval
          </p>
        </div>

        {/* Info Banner */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex gap-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold">Action Required</p>
              <p className="mt-1">
                These uploads contain rejected centers. Click on any row to
                review the data, make corrections, and resubmit for approval.
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <SearchBar
          value={searchTerm}
          onChange={handleSearch}
          placeholder="Search by upload ID or file name..."
          filters={filters}
          onFilterChange={handleFilterChange}
          sortOptions={[
            { label: "Upload Date", value: "date" },
            { label: "File Name", value: "file" },
            { label: "Rejected Centers", value: "centers" },
            { label: "Rejected Students", value: "students" },
          ]}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
        />

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading rejected uploads...</div>
            </div>
          ) : displayUploads.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">
                {searchTerm
                  ? "No uploads found matching your search"
                  : "No rejected uploads found"}
              </div>
            </div>
          ) : (
            <>
              <div
                ref={scrollContainerRef}
                className="overflow-x-auto custom-scrollbar"
              >
                <table className="min-w-full divide-y divide-gray-200">
                  <thead style={{ backgroundColor: "#EFEFEF" }}>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        S.NO
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Upload ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        File Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Upload Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Rejected Centers
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Rejected Students
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Version
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {displayUploads.map((upload, index) => (
                      <tr
                        key={upload.id}
                        onClick={() => handleRowClick(upload)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {(pagination.page - 1) * pagination.limit +
                              index +
                              1}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-mono text-xs text-gray-600">
                            {upload.id.substring(0, 8)}...
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {upload.file_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(upload.created_at).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className="bg-red-100 text-red-800 font-semibold">
                            {upload.rejected_centers_count}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className="text-red-600 border-red-300"
                          >
                            {upload.rejected_students_count}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            variant={
                              upload.version > 1 ? "secondary" : "outline"
                            }
                          >
                            V{upload.version || 1}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(upload);
                            }}
                            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
                          >
                            <PencilIcon className="h-4 w-4" />
                            Edit & Resubmit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                itemsPerPage={pagination.limit}
                totalItems={pagination.total}
                currentItemsCount={displayUploads.length}
                onPageChange={(newPage) =>
                  setPagination((prev) => ({ ...prev, page: newPage }))
                }
              />
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default RejectedUploadsPage;
