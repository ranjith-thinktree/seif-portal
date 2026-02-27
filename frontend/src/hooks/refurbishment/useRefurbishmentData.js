import { useState, useEffect, useCallback } from "react";
import refurbishmentService from "../../services/refurbishment.service";

/**
 * Custom hook to manage refurbishment dashboard data
 * Consolidates all data fetching logic and state management
 *
 * @param {number} selectedYear - Year filter for data fetching
 * @returns {Object} { data, loading, refresh }
 */
export const useRefurbishmentData = (selectedYear) => {
  // Consolidated data state
  const [data, setData] = useState({
    eligibleCenters: [],
    lastRefurbishedData: [],
    allCentersData: [],
    alerts: [],
    activeRequests: [],
    pastRequests: [],
    packages: [],
  });

  // Consolidated loading state
  const [loading, setLoading] = useState({
    eligibleCenters: false,
    lastRefurbishedData: false,
    allCentersData: false,
    alerts: false,
    activeRequests: false,
    pastRequests: false,
    packages: false,
  });

  // Helper to update loading state
  const setLoadingState = (key, value) => {
    setLoading((prev) => ({ ...prev, [key]: value }));
  };

  // Helper to update data state
  const setDataState = (key, value) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  // Load eligible centers
  const loadEligibleCenters = useCallback(async () => {
    setLoadingState("eligibleCenters", true);
    try {
      const response = await refurbishmentService.getEligibleCenters({
        limit: 100,
        offset: 0,
      });

      if (response.success) {
        // Extract array from response - check if data.centers exists or if data is already an array
        const centers = Array.isArray(response.data)
          ? response.data
          : response.data?.centers || [];
        setDataState("eligibleCenters", centers);
      } else {
        setDataState("eligibleCenters", []);
      }
    } catch (error) {
      console.error("Error loading eligible centers:", error);
      setDataState("eligibleCenters", []);
    } finally {
      setLoadingState("eligibleCenters", false);
    }
  }, []);

  // Load last refurbished data
  const loadLastRefurbished = useCallback(async () => {
    setLoadingState("lastRefurbishedData", true);
    try {
      const response = await refurbishmentService.getLastRefurbished({
        limit: 100,
        offset: 0,
      });
      if (response.success) {
        // getLastRefurbished returns { success: true, data: [...] } - data is already an array
        const centers = Array.isArray(response.data) ? response.data : [];
        setDataState("lastRefurbishedData", centers);
      }
    } catch (error) {
      console.error("Error loading last refurbished data:", error);
      setDataState("lastRefurbishedData", []);
    } finally {
      setLoadingState("lastRefurbishedData", false);
    }
  }, []);

  // Load all centers data
  const loadAllCenters = useCallback(async () => {
    setLoadingState("allCentersData", true);
    try {
      const response = await refurbishmentService.getAllCenters({
        limit: 100,
        offset: 0,
      });
      if (response.success) {
        // getAllCenters returns { success: true, data: { centers: [...], totalCount: 123 } }
        const centers = response.data?.centers || [];
        setDataState("allCentersData", centers);
      }
    } catch (error) {
      console.error("Error loading all centers:", error);
      setDataState("allCentersData", []);
    } finally {
      setLoadingState("allCentersData", false);
    }
  }, []);

  // Load alerts
  const loadAlerts = useCallback(async () => {
    setLoadingState("alerts", true);
    try {
      const response = await refurbishmentService.getAlerts({
        limit: 100,
        offset: 0,
      });
      if (response.success) {
        // Extract array from response - check if data.alerts exists or if data is already an array
        const alerts = Array.isArray(response.data)
          ? response.data
          : response.data?.alerts || [];
        setDataState("alerts", alerts);
      }
    } catch (error) {
      console.error("Error loading alerts:", error);
      setDataState("alerts", []);
    } finally {
      setLoadingState("alerts", false);
    }
  }, []);

  // Load active requests (manual + scheduled)
  const loadActiveRequests = useCallback(async () => {
    setLoadingState("activeRequests", true);
    try {
      // Fetch from unified table (contains both manual and scheduled)
      const scheduledResponse =
        await refurbishmentService.getScheduledNotifications({
          status: "pending,active",
          limit: 100,
          offset: 0,
        });

      console.log("[DEBUG] Active Requests from unified table:", {
        scheduledResponse,
      });

      if (scheduledResponse?.success) {
        const notifications = Array.isArray(scheduledResponse.data)
          ? scheduledResponse.data
          : scheduledResponse.data?.notifications || [];

        console.log("[DEBUG] Notifications fetched:", {
          total: notifications.length,
          items: notifications,
        });

        // Map all items - use is_scheduled from backend to determine type
        const mappedRequests = notifications.map((notif) => ({
          ...notif,
          // is_scheduled comes from backend: IF(is_manual_request = 1, 0, 1)
          // Manual requests have is_scheduled=0, Scheduled have is_scheduled=1
          request_type: notif.is_scheduled ? "scheduled" : "manual",
          // Map scheduled notification fields to request fields for UI compatibility
          organization_name: notif.partner_name,
          reason: notif.message,
        }));

        console.log("[DEBUG] Mapped active requests:", {
          totalCount: mappedRequests.length,
          manualCount: mappedRequests.filter((r) => r.request_type === "manual")
            .length,
          scheduledCount: mappedRequests.filter(
            (r) => r.request_type === "scheduled",
          ).length,
          firstItem: mappedRequests[0],
        });

        setDataState("activeRequests", mappedRequests);
      } else {
        console.warn(
          "[DEBUG] scheduledResponse not successful:",
          scheduledResponse,
        );
        setDataState("activeRequests", []);
      }
    } catch (error) {
      console.error("Error loading active requests:", error);
      setDataState("activeRequests", []);
    } finally {
      setLoadingState("activeRequests", false);
    }
  }, []);

  // Load past requests
  const loadPastRequests = useCallback(async () => {
    setLoadingState("pastRequests", true);
    try {
      const response = await refurbishmentService.getPastRequests({
        year: selectedYear,
        limit: 100,
        offset: 0,
      });
      if (response.success) {
        // Extract array from response - check if data.requests exists or if data is already an array
        const requests = Array.isArray(response.data)
          ? response.data
          : response.data?.requests || [];
        setDataState("pastRequests", requests);
      }
    } catch (error) {
      console.error("Error loading past requests:", error);
      setDataState("pastRequests", []);
    } finally {
      setLoadingState("pastRequests", false);
    }
  }, [selectedYear]);

  // Load packages (no category filter – dashboard splits by category via useMemo)
  const loadPackages = useCallback(async () => {
    setLoadingState("packages", true);
    try {
      const response = await refurbishmentService.getPackages();
      if (response.success) {
        // Backend returns { success: true, data: { packages: [...], totalCount: 5 } }
        const packages = Array.isArray(response.data?.packages)
          ? response.data.packages
          : Array.isArray(response.data)
            ? response.data
            : [];
        setDataState("packages", packages);
      }
    } catch (error) {
      console.error("Error loading packages:", error);
      setDataState("packages", []);
    } finally {
      setLoadingState("packages", false);
    }
  }, []);

  // Refresh functions exposed to component
  const refresh = {
    eligibleCenters: loadEligibleCenters,
    lastRefurbishedData: loadLastRefurbished,
    allCentersData: loadAllCenters,
    alerts: loadAlerts,
    activeRequests: loadActiveRequests,
    pastRequests: loadPastRequests,
    packages: loadPackages,
    all: useCallback(() => {
      loadEligibleCenters();
      loadLastRefurbished();
      loadAllCenters();
      loadAlerts();
      loadActiveRequests();
      loadPastRequests();
      loadPackages();
    }, [
      loadEligibleCenters,
      loadLastRefurbished,
      loadAllCenters,
      loadAlerts,
      loadActiveRequests,
      loadPastRequests,
      loadPackages,
    ]),
  };

  // Auto-load data on mount and when selectedYear changes
  useEffect(() => {
    refresh.all();
  }, [selectedYear]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    data,
    loading,
    refresh,
  };
};

export default useRefurbishmentData;
