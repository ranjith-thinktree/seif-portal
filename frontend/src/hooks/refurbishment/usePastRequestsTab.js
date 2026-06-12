import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import useTableSearch from "./useTableSearch";
import refurbishmentService from "../../services/refurbishment.service";
import { getDisplayRequestType, getFinancialYear } from "../../utils/refurbishmentUtils";
import { FY_OPTIONS } from "../../constants/refurbishment";

export default function usePastRequestsTab({ pastRequests, setLoading }) {
  const [pastReviewRequestId, setPastReviewRequestId] = useState(null);
  const [pastReviewOpen, setPastReviewOpen] = useState(false);
  const [statusChangeRequest, setStatusChangeRequest] = useState(null);

  const pastRequestsCustomFilters = useCallback((items, filters) => {
    if (!Array.isArray(items)) return [];
    let filtered = [...items];

    if (filters.type?.length > 0) {
      filtered = filtered.filter((r) => {
        const displayType = getDisplayRequestType(r);
        return displayType && filters.type.includes(displayType);
      });
    }

    if (filters.status?.length > 0) {
      filtered = filtered.filter((r) => {
        const displayStatus =
          r.status === "completed"
            ? "Completed"
            : r.status === "rejected"
              ? "Resolved"
              : r.status === "sent_back"
                ? "Sent back"
                : "In-review";
        return filters.status.includes(displayStatus);
      });
    }

    if (filters.center?.length > 0) {
      filtered = filtered.filter((r) => filters.center.includes(r.center_name));
    }

    if (filters.financialYear) {
      const selectedFY = filters.financialYear;
      filtered = filtered.filter((r) => {
        if (!r.updated_at && !r.created_at) return false;
        const dateToCheck = r.updated_at || r.created_at;
        const itemFY = getFinancialYear(dateToCheck);
        return itemFY === selectedFY;
      });
    }

    return filtered;
  }, []);

  const pastRequestsTable = useTableSearch(pastRequests, {
    searchFields: ["center_name", "request_type", "type", "refurbishment_type"],
    initialFilters: {
      type: [],
      status: [],
      center: [],
      financialYear: "",
    },
    initialSortBy: "updated_at",
    initialSortOrder: "desc",
    customFilters: pastRequestsCustomFilters,
    pageSize: 10,
  });

  const [pastRequestsFilterOptions, setPastRequestsFilterOptions] = useState({
    types: [],
    statuses: [],
    centers: [],
    financialYears: [],
  });

  useEffect(() => {
    if (Array.isArray(pastRequests) && pastRequests.length > 0) {
      const uniqueTypes = [
        ...new Set(
          pastRequests
            .map((r) => getDisplayRequestType(r))
            .filter(Boolean),
        ),
      ];
      const uniqueCenters = [
        ...new Set(pastRequests.map((r) => r.center_name).filter(Boolean)),
      ];

      setPastRequestsFilterOptions({
        types: uniqueTypes.sort().map((t) => ({ value: t, label: t })),
        statuses: [
          { value: "Completed", label: "Completed" },
          { value: "In-review", label: "In-review" },
          { value: "Sent back", label: "Sent back" },
          { value: "Resolved", label: "Resolved" },
        ],
        centers: uniqueCenters.sort().map((c) => ({ value: c, label: c })),
        financialYears: FY_OPTIONS,
      });
    }
  }, [pastRequests]);

  const handleExportPastRequests = async () => {
    try {
      setLoading(true);

      const params = {
        searchTerm: pastRequestsTable.searchTerm,
        ...pastRequestsTable.activeFilters,
        sortBy: pastRequestsTable.sortBy,
        sortOrder: pastRequestsTable.sortOrder,
      };

      const blob = await refurbishmentService.exportPastRequests(params);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `past-requests-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Past requests exported successfully");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export past requests");
    } finally {
      setLoading(false);
    }
  };

  const openPastReview = (request) => {
    setPastReviewRequestId(request.id || request.request_id);
    setPastReviewOpen(true);
  };

  return {
    pastRequestsTable,
    pastRequestsFilterOptions,
    handleExportPastRequests,
    pastReviewRequestId,
    setPastReviewRequestId,
    pastReviewOpen,
    setPastReviewOpen,
    statusChangeRequest,
    setStatusChangeRequest,
    openPastReview,
  };
}
