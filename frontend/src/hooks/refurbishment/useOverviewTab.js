import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import useTableSearch from "./useTableSearch";
import refurbishmentService from "../../services/refurbishment.service";
import { FY_OPTIONS, YEAR_OPTIONS } from "../../constants/refurbishment";
import { getFinancialYear } from "../../utils/refurbishmentUtils";

export default function useOverviewTab({
  allCentersData,
  eligibleCenters,
  lastRefurbishedData,
  setLoading,
}) {
  const [selectedOverviewCard, setSelectedOverviewCard] = useState("eligible");

  const allCentersCustomFilters = useCallback((items, filters) => {
    if (!Array.isArray(items)) return [];
    let filtered = [...items];

    if (filters.eligibility) {
      filtered = filtered.filter(
        (c) => c.eligibility_status === filters.eligibility,
      );
    }

    if (filters.age) {
      const ageRange = filters.age;
      if (ageRange === "0-2") {
        filtered = filtered.filter(
          (c) => parseInt(c.age) >= 0 && parseInt(c.age) <= 2,
        );
      } else if (ageRange === "3-5") {
        filtered = filtered.filter(
          (c) => parseInt(c.age) >= 3 && parseInt(c.age) <= 5,
        );
      } else if (ageRange === "6+") {
        filtered = filtered.filter((c) => parseInt(c.age) >= 6);
      }
    }

    if (filters.partner?.length > 0) {
      filtered = filtered.filter((c) =>
        filters.partner.includes(c.partner_name),
      );
    }

    if (filters.state?.length > 0) {
      filtered = filtered.filter((c) => filters.state.includes(c.state));
    }

    if (filters.financialYear) {
      filtered = filtered.filter(
        (c) => c.financial_year === filters.financialYear,
      );
    }

    return filtered;
  }, []);

  const allCentersTable = useTableSearch(allCentersData, {
    searchFields: [
      "center_name",
      "partner_name",
      "city",
      "state",
      "eligibility_status",
    ],
    initialFilters: {
      eligibility: "",
      age: "",
      partner: [],
      state: [],
      financialYear: "",
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
    financialYears: [],
    years: YEAR_OPTIONS,
  });

  const eligibleCentersCustomFilters = useCallback((items, filters) => {
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

    if (filters.lastNotified) {
      const now = new Date();
      const notifiedFilter = filters.lastNotified;

      filtered = filtered.filter((c) => {
        if (!c.last_notified_date) return false;
        const notifiedDate = new Date(c.last_notified_date);
        const daysDiff = Math.floor(
          (now - notifiedDate) / (1000 * 60 * 60 * 24),
        );

        if (notifiedFilter === "last-7-days") return daysDiff <= 7;
        if (notifiedFilter === "last-30-days") return daysDiff <= 30;
        if (notifiedFilter === "over-30-days") return daysDiff > 30;
        return true;
      });
    }

    if (filters.financialYear) {
      filtered = filtered.filter(
        (c) => c.financial_year === filters.financialYear,
      );
    }

    return filtered;
  }, []);

  const eligibleTable = useTableSearch(eligibleCenters, {
    searchFields: ["center_name", "partner_name", "city", "state"],
    initialFilters: {
      partner: [],
      state: [],
      lastNotified: "",
      financialYear: "",
    },
    initialSortBy: "center_name",
    initialSortOrder: "asc",
    customFilters: eligibleCentersCustomFilters,
    pageSize: 10,
  });

  const [eligibleFilterOptions, setEligibleFilterOptions] = useState({
    partners: [],
    states: [],
    financialYears: [],
    years: YEAR_OPTIONS,
  });

  const lastRefurbishedCustomFilters = useCallback((items, filters) => {
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

    if (filters.recency) {
      const now = new Date();
      const recencyFilter = filters.recency;

      filtered = filtered.filter((c) => {
        if (!c.last_refurbishment_date) return false;
        const refurbDate = new Date(c.last_refurbishment_date);
        const monthsDiff = Math.floor(
          (now - refurbDate) / (1000 * 60 * 60 * 24 * 30),
        );

        if (recencyFilter === "last-6-months") return monthsDiff <= 6;
        if (recencyFilter === "6-12-months")
          return monthsDiff > 6 && monthsDiff <= 12;
        if (recencyFilter === "over-1-year") return monthsDiff > 12;
        return true;
      });
    }

    if (filters.financialYear) {
      filtered = filtered.filter(
        (c) => c.financial_year === filters.financialYear,
      );
    }

    return filtered;
  }, []);

  const lastRefurbishedTable = useTableSearch(lastRefurbishedData, {
    searchFields: ["center_name", "partner_name", "city", "state"],
    initialFilters: {
      partner: [],
      state: [],
      recency: "",
      financialYear: "",
    },
    initialSortBy: "last_refurbished",
    initialSortOrder: "desc",
    customFilters: lastRefurbishedCustomFilters,
    pageSize: 10,
  });

  const [lastRefurbishedFilterOptions, setLastRefurbishedFilterOptions] =
    useState({
      partners: [],
      states: [],
      financialYears: [],
      years: YEAR_OPTIONS,
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
        ...new Set(allCentersData.map((c) => c.partner_name).filter(Boolean)),
      ];
      const uniqueStates = [
        ...new Set(allCentersData.map((c) => c.state).filter(Boolean)),
      ];

      setAllCentersFilterOptions((prev) => ({
        ...prev,
        partners: uniquePartners.sort().map((p) => ({ value: p, label: p })),
        states: uniqueStates.sort().map((s) => ({ value: s, label: s })),
        financialYears: FY_OPTIONS,
        years: YEAR_OPTIONS,
      }));
    }
  }, [allCentersData]);

  useEffect(() => {
    if (Array.isArray(eligibleCenters) && eligibleCenters.length > 0) {
      const uniquePartners = [
        ...new Set(eligibleCenters.map((c) => c.partner_name).filter(Boolean)),
      ];
      const uniqueStates = [
        ...new Set(eligibleCenters.map((c) => c.state).filter(Boolean)),
      ];

      setEligibleFilterOptions({
        partners: uniquePartners.sort().map((p) => ({ value: p, label: p })),
        states: uniqueStates.sort().map((s) => ({ value: s, label: s })),
        financialYears: FY_OPTIONS,
        years: YEAR_OPTIONS,
      });
    }
  }, [eligibleCenters]);

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

      setLastRefurbishedFilterOptions({
        partners: uniquePartners.sort().map((p) => ({ value: p, label: p })),
        states: uniqueStates.sort().map((s) => ({ value: s, label: s })),
        financialYears: FY_OPTIONS,
        years: YEAR_OPTIONS,
      });
    }
  }, [lastRefurbishedData]);

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
