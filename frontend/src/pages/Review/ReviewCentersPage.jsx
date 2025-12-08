import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "../../components/layout";
import reviewService from "../../services/review.service";
import Breadcrumb from "../../components/common/Breadcrumb";
import SearchBar from "../../components/common/SearchBar";
import Pagination from "../../components/common/Pagination";
import { showToast } from "../../utils/toast.util";
import { ROUTES } from "../../constants/routes";

/**
 * ReviewCentersPage Component
 * Admin view to review uploaded centers (center-wise approval)
 */
const ReviewCentersPage = () => {
  const { uploadId } = useParams();
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);

  const [upload, setUpload] = useState(null);
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState([
    { label: "Pending", value: "pending", checked: false },
    { label: "Approved", value: "approved", checked: false },
    { label: "Rejected", value: "rejected", checked: false },
  ]);
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const itemsPerPage = 10;

  // Breadcrumb items
  const breadcrumbItems = [
    { label: "Inbox", path: ROUTES.INBOX },
    { label: "Review Upload", path: "#" },
  ];

  // Fetch upload details
  useEffect(() => {
    const fetchUploadDetails = async () => {
      try {
        setLoading(true);
        const response = await reviewService.getUploadForReview(uploadId);
        setUpload(response.data);
      } catch (error) {
        console.error("Error fetching upload details:", error);
        showToast.error("Failed to load upload details");
        navigate(ROUTES.INBOX);
      } finally {
        setLoading(false);
      }
    };

    fetchUploadDetails();
  }, [uploadId, navigate]);

  // Fetch centers
  useEffect(() => {
    const fetchCenters = async () => {
      try {
        setLoading(true);
        const response = await reviewService.getPendingCenters(uploadId, {
          page: currentPage,
          limit: itemsPerPage,
          search: searchTerm,
        });

        setCenters(response.data.data || []);
        setTotalPages(response.data.pagination?.totalPages || 1);
      } catch (error) {
        console.error("Error fetching centers:", error);
        showToast.error("Failed to load centers");
      } finally {
        setLoading(false);
      }
    };

    fetchCenters();
  }, [uploadId, currentPage, searchTerm]);

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

  // Apply filters and sorting to centers
  const getFilteredAndSortedCenters = () => {
    let filtered = [...centers];

    // Apply status filters
    const activeFilters = filters.filter((f) => f.checked).map((f) => f.value);
    if (activeFilters.length > 0) {
      filtered = filtered.filter((center) =>
        activeFilters.includes(center.review_status)
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
          case "status":
            aValue = a.review_status?.toLowerCase() || "";
            bValue = b.review_status?.toLowerCase() || "";
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

  // Handle center click
  const handleCenterClick = (center) => {
    const path = ROUTES.REVIEW_STUDENTS.replace(":uploadId", uploadId).replace(
      ":centerId",
      center.id
    );
    navigate(path);
  };

  // Get status badge color
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

  if (loading && !upload) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading upload details...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbItems} />

        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Review Upload - {upload?.partner_name}
          </h1>
          <div className="flex gap-6 text-sm text-gray-600">
            <div>
              <span className="font-medium">Uploaded by:</span>{" "}
              {upload?.uploaded_by_name}
            </div>
            <div>
              <span className="font-medium">Upload Date:</span>{" "}
              {new Date(upload?.uploaded_at).toLocaleDateString()}
            </div>
            <div>
              <span className="font-medium">Total Centers:</span>{" "}
              {upload?.centers_total}
            </div>
            <div>
              <span className="font-medium">Reviewed:</span>{" "}
              {upload?.centers_reviewed}
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

        {/* Search Bar with Filter and Sort */}
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
            { label: "Status", value: "status" },
          ]}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
        />

        {/* Centers Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading centers...</div>
            </div>
          ) : displayCenters.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">
                {searchTerm
                  ? "No centers found matching your search"
                  : filters.some((f) => f.checked)
                  ? "No centers found matching selected filters"
                  : "No centers to review"}
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
                    {displayCenters.map((center, index) => (
                      <tr
                        key={center.id}
                        onClick={() =>
                          center.review_status === "pending" &&
                          handleCenterClick(center)
                        }
                        className={
                          center.review_status === "pending"
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
                          {center.student_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(
                              center.review_status
                            )}`}
                          >
                            {center.review_status === "pending" &&
                              "Pending Approval"}
                            {center.review_status === "approved" && "Approved"}
                            {center.review_status === "rejected" && "Rejected"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {center.reviewed_by_name || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                totalItems={upload?.centers_total || 0}
                currentItemsCount={displayCenters.length}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default ReviewCentersPage;
