import { useState, useEffect, useCallback } from "react";
import useTableSearch from "./useTableSearch";
import { FY_OPTIONS } from "../../constants/refurbishment";
import { getFinancialYear } from "../../utils/refurbishmentUtils";

export default function useAlertsTab({ alerts }) {
  const alertsCustomFilters = useCallback((items, filters) => {
    if (!Array.isArray(items)) return [];
    let filtered = [...items];

    if (filters.type?.length > 0) {
      filtered = filtered.filter((a) =>
        filters.type.includes(a.alert_type || "General"),
      );
    }

    if (filters.status?.length > 0) {
      filtered = filtered.filter((alert) =>
        filters.status.includes(alert.priority || alert.status || "MEDIUM"),
      );
    }

    if (filters.financialYear) {
      const selectedFY = filters.financialYear;
      filtered = filtered.filter((alert) => {
        if (!alert.created_at) return false;
        const itemFY = getFinancialYear(alert.created_at);
        return itemFY === selectedFY;
      });
    }

    return filtered;
  }, []);

  const alertsTable = useTableSearch(alerts, {
    searchFields: ["message", "title", "center_name"],
    initialFilters: {
      type: [],
      status: [],
      financialYear: "",
    },
    initialSortBy: "created_at",
    initialSortOrder: "desc",
    customFilters: alertsCustomFilters,
    pageSize: 10,
  });

  const [alertsFilterOptions, setAlertsFilterOptions] = useState({
    types: [],
    statuses: [],
    financialYears: [],
  });

  useEffect(() => {
    if (Array.isArray(alerts) && alerts.length > 0) {
      const uniqueTypes = [
        ...new Set(
          alerts.map((a) => a.alert_type || "General").filter(Boolean),
        ),
      ];

      setAlertsFilterOptions({
        types: uniqueTypes.sort().map((t) => ({ value: t, label: t })),
        statuses: [{ value: "HIGH", label: "High" }],
        financialYears: FY_OPTIONS,
      });
    }
  }, [alerts]);

  return {
    alertsTable,
    alertsFilterOptions,
  };
}
