import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import useTableSearch from "../refurbishment/useTableSearch";
import {
  CERTIFICATION_DERIVED_STATUS_OPTIONS,
  formatCertificationDate,
  formatCertificationRequestId,
} from "../../utils/certificationUtils";
import { getFinancialYear } from "../../utils/refurbishmentUtils";
import { FY_OPTIONS } from "../../constants/refurbishment";

/**
 * Shared certification requests table state for ESSCI, Partner, and Admin views.
 */
export default function useCertificationRequestsTab({
  fetchRequests: fetchRequestsApi,
  storageKey = "certification-requests",
  exportFilePrefix = "certification-requests",
  showPartnerFilter = true,
}) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [detailUploadId, setDetailUploadId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchRequestsApi();
      const payload = res?.data || res;
      setRequests(payload?.rows || []);
    } catch (error) {
      console.error("Failed to load certification requests:", error);
      toast.error("Failed to load certification requests.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [fetchRequestsApi]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const yearFilteredRequests = useMemo(() => {
    if (!selectedYear) return requests;
    return requests.filter((row) => {
      const date = row.updated_at || row.reviewed_at || row.created_at;
      if (!date) return false;
      return new Date(date).getFullYear() === selectedYear;
    });
  }, [requests, selectedYear]);

  const customFilters = useCallback(
    (items, filters) => {
      if (!Array.isArray(items)) return [];
      let filtered = [...items];

      if (selectedYear) {
        filtered = filtered.filter((r) => {
          const date = r.created_at;
          return date && new Date(date).getFullYear() === selectedYear;
        });
      }

      if (filters.status?.length > 0) {
        filtered = filtered.filter((r) =>
          filters.status.includes(r.derived_status),
        );
      }

      if (showPartnerFilter && filters.partner?.length > 0) {
        filtered = filtered.filter((r) =>
          filters.partner.includes(r.partner_name),
        );
      }

      if (filters.center?.length > 0) {
        filtered = filtered.filter((r) =>
          filters.center.includes(r.center_name),
        );
      }

      if (filters.financialYear) {
        filtered = filtered.filter((r) => {
          const dateToCheck = r.updated_at || r.reviewed_at || r.created_at;
          if (!dateToCheck) return false;
          return getFinancialYear(dateToCheck) === filters.financialYear;
        });
      }

      return filtered;
    },
    [selectedYear, showPartnerFilter],
  );

  const table = useTableSearch(yearFilteredRequests, {
    searchFields: [
      "partner_name",
      "center_name",
      "batch_number",
      "other_batch_number",
      "derived_status",
    ],
    initialFilters: {
      status: [],
      partner: [],
      center: [],
      financialYear: "",
    },
    initialSortBy: "updated_at",
    initialSortOrder: "desc",
    customFilters,
    pageSize: 10,
  });

  const [filterOptions, setFilterOptions] = useState({
    statuses: CERTIFICATION_DERIVED_STATUS_OPTIONS,
    partners: [],
    centers: [],
    financialYears: FY_OPTIONS,
  });

  useEffect(() => {
    if (!Array.isArray(requests) || requests.length === 0) return;
    const partners = [
      ...new Set(requests.map((r) => r.partner_name).filter(Boolean)),
    ];
    const centers = [
      ...new Set(requests.map((r) => r.center_name).filter(Boolean)),
    ];
    setFilterOptions((prev) => ({
      ...prev,
      partners: partners.sort().map((p) => ({ value: p, label: p })),
      centers: centers.sort().map((c) => ({ value: c, label: c })),
    }));
  }, [requests]);

  const openDetail = useCallback((row) => {
    setDetailUploadId(row?.id);
    setDetailOpen(true);
  }, []);

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
    setDetailUploadId(null);
  }, []);

  const openDetailById = useCallback(
    (uploadId) => {
      const row = requests.find((r) => r.id === uploadId);
      if (row) {
        openDetail(row);
      } else {
        setDetailUploadId(uploadId);
        setDetailOpen(true);
      }
    },
    [requests, openDetail],
  );

  const handleExport = () => {
    if (!table.data?.length) {
      toast.info("No data to export.");
      return;
    }
    const headers = [
      "Request ID",
      "Partner",
      "Center",
      "Batch",
      "Status",
      "Submitted",
      "Request Received On",
    ];
    const lines = table.data.map((row, idx) =>
      [
        formatCertificationRequestId(row, idx),
        row.partner_name,
        row.center_name,
        row.batch_number || row.other_batch_number,
        row.derived_status,
        formatCertificationDate(row.created_at),
        formatCertificationDate(
          row.created_at || row.updated_at || row.reviewed_at,
        ),
      ]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportFilePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Requests exported.");
  };

  return {
    table,
    loading,
    selectedYear,
    setSelectedYear,
    filterOptions,
    detailUploadId,
    detailOpen,
    openDetail,
    closeDetail,
    openDetailById,
    handleExport,
    refreshRequests: fetchRequests,
    storageKey,
    showPartnerFilter,
  };
}
