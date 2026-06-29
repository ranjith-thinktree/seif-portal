import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import useTableSearch from "./useTableSearch";
import refurbishmentService from "../../services/refurbishment.service";
import { FY_OPTIONS } from "../../constants/refurbishment";
import {
  getFinancialYear,
  getYearFilterOptions,
  filterOverviewLastRefurbishedCenters,
  filterOverviewEligibleCenters,
  filterOverviewAllCenters,
  getCenterPartnerName,
} from "../../utils/refurbishmentUtils";

export default function useOverviewTab({
  allCentersData,
  eligibleCenters,
  lastRefurbishedData,
  refurbishmentSettings,
  setLoading,
}) {
  const [selectedOverviewCard, setSelectedOverviewCard] = useState("eligible");
  const yearFilterOptions = useMemo(() => getYearFilterOptions(), []);

  const eligibilityCycleSettings = useMemo(
    () => ({
      firstCycleYears: refurbishmentSettings?.firstCycleYears ?? 5,
      repeatCycleYears: refurbishmentSettings?.repeatCycleYears ?? 3,
    }),
    [
      refurbishmentSettings?.firstCycleYears,
      refurbishmentSettings?.repeatCycleYears,
    ],
  );

  const eligibleCentersTableData = useMemo(() => {
    const notifyById = new Map(
      (Array.isArray(eligibleCenters) ? eligibleCenters : []).map((center) => [
        center.id,
        center,
      ]),
    );

    return (Array.isArray(allCentersData) ? allCentersData : []).map((center) => {
      const currentEligible = notifyById.get(center.id);
      return {
        ...center,
        partner_name: getCenterPartnerName(center),
        last_notified_at:
          currentEligible?.last_notified_at ?? center.last_notified_at,
        total_send_count:
          currentEligible?.total_send_count ?? center.total_send_count,
      };
    });
  }, [allCentersData, eligibleCenters]);

  const allCentersCustomFilters = useCallback((items, filters) => {
    return filterOverviewAllCenters(items, filters);
  }, []);

  const allCentersTable = useTableSearch(allCentersData, {
    searchFields: [
      "center_name",
      "partner_name",
      "organization_name",
      "city",
      "state",
      "eligibility_status",
    ],
    initialFilters: {
      eligibility: "",
      age: "",
      partner: [],
      state: [],
      region: [],
      status: [],
      financialYear: "",
      year: "",
    },
    initialSortBy: "center_name",
    initialSortOrder: "asc",
    customFilters: allCentersCustomFilters,
    pageSize: 10,
  });

  const [allCentersFilterOptions, setAllCentersFilterOptions] = useState({
    eligibilityStatuses: [
      { value: "Eligible", label: "Eligible" },
      { value: "Not Eligible", label: "Not Eligible" },
    ],
    ageRanges: [
      { value: "0-2", label: "0-2 years" },
      { value: "3-5", label: "3-5 years" },
      { value: "6+", label: "6+ years" },
    ],
    partners: [],
    states: [],
    regions: [],
    statuses: [
      { value: "Eligible", label: "Eligible" },
      { value: "Not Eligible", label: "Not Eligible" },
    ],
    financialYears: [],
    years: yearFilterOptions,
  });

  const eligibleCentersCustomFilters = useCallback(
    (items, filters) => {
      return filterOverviewEligibleCenters(
        items,
        filters,
        eligibilityCycleSettings,
      );
    },
    [eligibilityCycleSettings],
  );

  const eligibleTable = useTableSearch(eligibleCentersTableData, {
    searchFields: ["center_name", "partner_name", "city", "state"],
    initialFilters: {
      partner: [],
      state: [],
      region: [],
      lastNotified: "",
      financialYear: "",
      year: "",
    },
    initialSortBy: "center_name",
    initialSortOrder: "asc",
    customFilters: eligibleCentersCustomFilters,
    pageSize: 10,
  });

  const [eligibleFilterOptions, setEligibleFilterOptions] = useState({
    partners: [],
    states: [],
    regions: [],
    financialYears: [],
    years: yearFilterOptions,
  });

  const lastRefurbishedCustomFilters = useCallback((items, filters) => {
    return filterOverviewLastRefurbishedCenters(items, filters);
  }, []);

  const lastRefurbishedTable = useTableSearch(lastRefurbishedData, {
    searchFields: ["center_name", "partner_name", "city", "state"],
    initialFilters: {
      partner: [],
      state: [],
      region: [],
      recency: "",
      financialYear: "",
      year: "",
    },
    initialSortBy: "last_refurbishment_date",
    initialSortOrder: "desc",
    customFilters: lastRefurbishedCustomFilters,
    pageSize: 10,
  });

  const [lastRefurbishedFilterOptions, setLastRefurbishedFilterOptions] =
    useState({
      partners: [],
      states: [],
      regions: [],
      financialYears: [],
      years: yearFilterOptions,
    });

  const eligibilityTabCustomFilters = useCallback((items, filters) => {
    if (!Array.isArray(items)) return [];
    let filtered = [...items];

    if (filters.partner?.length > 0) {
      filtered = filtered.filter((c) =>
        filters.partner.includes(c.partner_name),
      );
    }

    if (filters.state?.length > 0) {
      filtered = filtered.filter((c) => filters.state.includes(c.state));
    }

    if (filters.region?.length > 0) {
      filtered = filtered.filter((c) => filters.region.includes(c.region));
    }

    if (filters.financialYear) {
      const selectedFY = filters.financialYear;
      filtered = filtered.filter((c) => {
        if (!c.last_refurbishment_date) return false;
        const itemFY = getFinancialYear(c.last_refurbishment_date);
        return itemFY === selectedFY;
      });
    }

    return filtered;
  }, []);

  const eligibilityTabTable = useTableSearch(eligibleCenters, {
    searchFields: ["center_name", "partner_name", "city", "state"],
    initialFilters: {
      partner: [],
      state: [],
      region: [],
      financialYear: "",
    },
    initialSortBy: "center_name",
    initialSortOrder: "asc",
    customFilters: eligibilityTabCustomFilters,
    pageSize: 10,
  });

  const [_eligibilityTabFilterOptions, setEligibilityTabFilterOptions] =
    useState({
      partners: [],
      states: [],
      regions: [],
      financialYears: [],
    });

  useEffect(() => {
    if (Array.isArray(allCentersData) && allCentersData.length > 0) {
      const uniquePartners = [
        ...new Set(allCentersData.map((c) => getCenterPartnerName(c)).filter(Boolean)),
      ];
      const uniqueStates = [
        ...new Set(allCentersData.map((c) => c.state).filter(Boolean)),
      ];
      const uniqueRegions = [
        ...new Set(allCentersData.map((c) => c.region).filter(Boolean)),
      ];

      setAllCentersFilterOptions((prev) => ({
        ...prev,
        partners: uniquePartners.sort().map((p) => ({ value: p, label: p })),
        states: uniqueStates.sort().map((s) => ({ value: s, label: s })),
        regions: uniqueRegions.sort().map((r) => ({ value: r, label: r })),
        financialYears: FY_OPTIONS,
        years: yearFilterOptions,
      }));
    }
  }, [allCentersData, yearFilterOptions]);

  useEffect(() => {
    if (Array.isArray(allCentersData) && allCentersData.length > 0) {
      const uniquePartners = [
        ...new Set(
          allCentersData.map((c) => getCenterPartnerName(c)).filter(Boolean),
        ),
      ];
      const uniqueStates = [
        ...new Set(allCentersData.map((c) => c.state).filter(Boolean)),
      ];
      const uniqueRegions = [
        ...new Set(allCentersData.map((c) => c.region).filter(Boolean)),
      ];

      setEligibleFilterOptions({
        partners: uniquePartners.sort().map((p) => ({ value: p, label: p })),
        states: uniqueStates.sort().map((s) => ({ value: s, label: s })),
        regions: uniqueRegions.sort().map((r) => ({ value: r, label: r })),
        financialYears: FY_OPTIONS,
        years: yearFilterOptions,
      });
    }
  }, [allCentersData, yearFilterOptions]);

  useEffect(() => {
    if (Array.isArray(lastRefurbishedData) && lastRefurbishedData.length > 0) {
      const uniquePartners = [
        ...new Set(
          lastRefurbishedData.map((c) => c.partner_name).filter(Boolean),
        ),
      ];
      const uniqueStates = [
        ...new Set(lastRefurbishedData.map((c) => c.state).filter(Boolean)),
      ];
      const uniqueRegions = [
        ...new Set(lastRefurbishedData.map((c) => c.region).filter(Boolean)),
      ];

      setLastRefurbishedFilterOptions({
        partners: uniquePartners.sort().map((p) => ({ value: p, label: p })),
        states: uniqueStates.sort().map((s) => ({ value: s, label: s })),
        regions: uniqueRegions.sort().map((r) => ({ value: r, label: r })),
        financialYears: FY_OPTIONS,
        years: yearFilterOptions,
      });
    }
  }, [lastRefurbishedData, yearFilterOptions]);

  useEffect(() => {
    if (Array.isArray(eligibleCenters) && eligibleCenters.length > 0) {
      const uniquePartners = [
        ...new Set(eligibleCenters.map((c) => c.partner_name).filter(Boolean)),
      ];
      const uniqueStates = [
        ...new Set(eligibleCenters.map((c) => c.state).filter(Boolean)),
      ];
      const uniqueRegions = [
        ...new Set(eligibleCenters.map((c) => c.region).filter(Boolean)),
      ];

      setEligibilityTabFilterOptions({
        partners: uniquePartners.sort().map((p) => ({ value: p, label: p })),
        states: uniqueStates.sort().map((s) => ({ value: s, label: s })),
        regions: uniqueRegions.sort().map((r) => ({ value: r, label: r })),
        financialYears: FY_OPTIONS,
      });
    }
  }, [eligibleCenters]);

  const _handleExportEligible = async () => {
    try {
      setLoading(true);

      const params = {
        searchTerm: eligibilityTabTable.searchTerm,
        ...eligibilityTabTable.activeFilters,
        sortBy: eligibilityTabTable.sortBy,
        sortOrder: eligibilityTabTable.sortOrder,
      };

      const blob = await refurbishmentService.exportEligibleCenters(params);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `eligible-centers-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Eligible centers exported successfully");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export eligible centers");
    } finally {
      setLoading(false);
    }
  };

  const handleExportEligibleOverview = async () => {
    try {
      setLoading(true);

      const params = {
        searchTerm: eligibleTable.searchTerm,
        ...eligibleTable.activeFilters,
        sortBy: eligibleTable.sortBy,
        sortOrder: eligibleTable.sortOrder,
      };

      const blob = await refurbishmentService.exportEligibleCenters(params);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `eligible-centers-overview-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Eligible centers exported successfully");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export eligible centers");
    } finally {
      setLoading(false);
    }
  };

  const handleExportLastRefurbishedOverview = async () => {
    try {
      setLoading(true);

      const params = {
        searchTerm: lastRefurbishedTable.searchTerm,
        ...lastRefurbishedTable.activeFilters,
        sortBy: lastRefurbishedTable.sortBy,
        sortOrder: lastRefurbishedTable.sortOrder,
      };

      const blob = await refurbishmentService.exportEligibleCenters(params);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `last-refurbished-overview-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Refurbished centers exported successfully");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export Refurbished centers");
    } finally {
      setLoading(false);
    }
  };

  const handleExportAllCentersOverview = async () => {
    try {
      setLoading(true);

      const params = {
        searchTerm: allCentersTable.searchTerm,
        ...allCentersTable.activeFilters,
        sortBy: allCentersTable.sortBy,
        sortOrder: allCentersTable.sortOrder,
      };

      const blob = await refurbishmentService.exportEligibleCenters(params);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `all-centers-overview-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("All centers exported successfully");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export all centers");
    } finally {
      setLoading(false);
    }
  };

  return {
    selectedOverviewCard,
    setSelectedOverviewCard,
    allCentersTable,
    allCentersFilterOptions,
    eligibleTable,
    eligibleFilterOptions,
    lastRefurbishedTable,
    lastRefurbishedFilterOptions,
    eligibilityTabTable,
    _eligibilityTabFilterOptions,
    _handleExportEligible,
    handleExportEligibleOverview,
    handleExportLastRefurbishedOverview,
    handleExportAllCentersOverview,
  };
}
