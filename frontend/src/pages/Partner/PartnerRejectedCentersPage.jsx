import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "../../components/layout";
import Breadcrumb from "../../components/common/Breadcrumb";
import SearchBar from "../../components/common/SearchBar";
import Pagination from "../../components/common/Pagination";
import { Badge } from "../../components/ui/badge";
import { PencilIcon } from "@heroicons/react/24/outline";
import apiClient from "../../api/client";
import { toast } from "react-toastify";
import { ROUTES } from "../../constants/routes";

/**
 * PartnerRejectedCentersPage
 * Shows rejected centers for a specific upload
 */
const PartnerRejectedCentersPage = () => {
  const { uploadId } = useParams();
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);

  const [upload, setUpload] = useState(null);
  const [centers, setCenters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState([]);
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const itemsPerPage = 10;

  // Breadcrumb items
  const breadcrumbItems = [
    { label: "Inbox", path: ROUTES.INBOX },
    { label: "Centers", path: "#" },
  ];

  // Fetch rejected centers
  useEffect(() => {
    const fetchRejectedCenters = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get(
          `/partners/uploads/${uploadId}/rejected-centers`
        );
        setUpload(response.data.data.upload);
        setCenters(response.data.data.centers || []);
      } catch (error) {
        console.error("Error fetching rejected centers:", error);
        toast.error("Failed to load rejected centers");
        navigate(ROUTES.INBOX);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRejectedCenters();
  }, [uploadId, navigate]);

  // Handle search
  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Handle filter change
  const handleFilterChange = (value, checked) => {
    setFilters((prev) =>
      prev.map((f) => (f.value === value ? { ...f, checked } : f))
    );
    setCurrentPage(1);
  };

  // Handle sort change
  const handleSortChange = (sortByValue, sortOrderValue) => {
    setSortBy(sortByValue);
    setSortOrder(sortOrderValue);
  };

  // Apply filters and sorting
  const getFilteredAndSortedCenters = () => {
    let filtered = [...centers];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (center) =>
          center.center_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          center.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          center.state?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    if (sortBy) {
      filtered.sort((a, b) => {
        let aValue, bValue;

        switch (sortBy) {
          case "name":
            aValue = a.center_name?.toLowerCase() || "";
            bValue = b.center_name?.toLowerCase() || "";
            break;
          case "city":
            aValue = a.city?.toLowerCase() || "";
            bValue = b.city?.toLowerCase() || "";
            break;
          case "state":
            aValue = a.state?.toLowerCase() || "";
            bValue = b.state?.toLowerCase() || "";
            break;
          case "students":
            aValue = a.student_count || 0;
            bValue = b.student_count || 0;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
        if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  };

  const displayCenters = getFilteredAndSortedCenters();

  // Pagination
  const totalPages = Math.ceil(displayCenters.length / itemsPerPage);
  const paginatedCenters = displayCenters.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handle center click
  const handleCenterClick = (center) => {
    navigate(
      ROUTES.PARTNER_REVIEW_STUDENTS.replace(":uploadId", uploadId).replace(
        ":centerId",
        center.id
      )
    );
  };

  // Handle back
  const handleBack = () => {
    navigate(ROUTES.INBOX);
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

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading rejected centers...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb and Back Button */}
        <div className="flex items-center justify-between">
          <Breadcrumb items={breadcrumbItems} />
          <button
            onClick={handleBack}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ← Back to Inbox
          </button>
        </div>

        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Review Upload - {upload?.file_name}
              </h1>
              <div className="flex gap-6 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Uploaded by:</span>{" "}
                  {upload?.uploaded_by_name}
                </div>
                <div>
                  <span className="font-medium">Upload Date:</span>{" "}
                  {upload?.created_at &&
                    new Date(upload.created_at).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Total Centers:</span>{" "}
                  {upload?.centers_total}
                </div>
                <div>
                  <span className="font-medium">Approved:</span>{" "}
                  <span className="text-green-600 font-semibold">
                    {upload?.centers_approved}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Rejected:</span>{" "}
                  <span className="text-red-600 font-semibold">
                    {upload?.centers_rejected}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            ℹ️ Only rejected centers can be edited. Pending centers are awaiting
            admin review. Click on a rejected center to review and edit student
            data before resubmitting.
          </p>
        </div>

        {/* Search Bar */}
        <SearchBar
          value={searchTerm}
          onChange={handleSearch}
          placeholder="Search centers by name, city, or state..."
          filters={filters}
          onFilterChange={handleFilterChange}
          sortOptions={[
            { label: "Name (A-Z)", value: "name" },
            { label: "City (A-Z)", value: "city" },
            { label: "State (A-Z)", value: "state" },
            { label: "Student Count", value: "students" },
          ]}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
        />

        {/* Centers Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {displayCenters.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">
                {searchTerm
                  ? "No centers found matching your search"
                  : "No rejected centers found"}
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
                        Center Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        City
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        State
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Students
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Reviewed By
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedCenters.map((center, index) => {
                      const isEditable = center.review_status === "rejected";
                      const getStatusBadgeColor = (status) => {
                        switch (status) {
                          case "approved":
                            return "bg-green-100 text-green-800";
                          case "rejected":
                            return "bg-red-100 text-red-800";
                          case "pending":
                          default:
                            return "bg-yellow-100 text-yellow-800";
                        }
                      };

                      return (
                        <tr
                          key={center.id}
                          onClick={() =>
                            isEditable && handleCenterClick(center)
                          }
                          className={
                            isEditable
                              ? "hover:bg-gray-50 cursor-pointer transition-colors"
                              : "opacity-60"
                          }
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {(currentPage - 1) * itemsPerPage + index + 1}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {center.center_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {center.city}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {center.state}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {center.student_count || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(
                                center.review_status
                              )}`}
                            >
                              {center.review_status === "pending" &&
                                "Pending Approval"}
                              {center.review_status === "approved" &&
                                "Approved"}
                              {center.review_status === "rejected" &&
                                "Rejected"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {center.reviewed_by_name || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                totalItems={displayCenters.length}
                currentItemsCount={paginatedCenters.length}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default PartnerRejectedCentersPage;
