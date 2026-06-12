import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import useTableSearch from "./useTableSearch";
import refurbishmentService from "../../services/refurbishment.service";
import { FY_OPTIONS } from "../../constants/refurbishment";
import { getFinancialYear } from "../../utils/refurbishmentUtils";

export default function useRequestsTab({
  activeRequests,
  setLoading,
  refurbishmentRefresh,
  setNotificationFormData,
  setShowNotificationModal,
  setPendingNotifyItem,
  setShowTypeSelectorModal,
}) {
  const activeRequestsCustomFilters = useCallback((items, filters) => {
    if (!Array.isArray(items)) return [];
    let filtered = [...items];

    if (filters.partner?.length > 0) {
      filtered = filtered.filter((r) =>
        filters.partner.includes(r.organization_name),
      );
    }

    if (filters.frequency?.length > 0) {
      filtered = filtered.filter((r) =>
        filters.frequency.includes(r.frequency || "Monthly"),
      );
    }

    if (filters.financialYear) {
      const selectedFY = filters.financialYear;
      filtered = filtered.filter((r) => {
        if (!r.created_at) return false;
        const itemFY = getFinancialYear(r.created_at);
        return itemFY === selectedFY;
      });
    }

    return filtered;
  }, []);

  const activeRequestsTable = useTableSearch(activeRequests, {
    searchFields: ["organization_name", "reason", "frequency", "request_type"],
    initialFilters: {
      partner: [],
      frequency: [],
      financialYear: "",
    },
    initialSortBy: "updated_at",
    initialSortOrder: "desc",
    customFilters: activeRequestsCustomFilters,
    pageSize: 10,
  });

  const [requestsFilterOptions, setRequestsFilterOptions] = useState({
    partners: [],
    frequencies: [],
    financialYears: [],
  });

  useEffect(() => {
    if (Array.isArray(activeRequests) && activeRequests.length > 0) {
      const uniquePartners = [
        ...new Set(
          activeRequests.map((r) => r.organization_name).filter(Boolean),
        ),
      ];
      const uniqueFrequencies = [
        ...new Set(
          activeRequests.map((r) => r.frequency || "Monthly").filter(Boolean),
        ),
      ];

      setRequestsFilterOptions({
        partners: uniquePartners.sort().map((p) => ({ value: p, label: p })),
        frequencies: uniqueFrequencies
          .sort()
          .map((f) => ({ value: f, label: f })),
        financialYears: FY_OPTIONS,
      });
    }
  }, [activeRequests]);

  const handleCreateManualRequest = () => {
    setPendingNotifyItem({
      id: null,
      partner_id: "",
      partner_name: "",
      center_name: "",
      request_id: null,
      isManualRequest: true,
    });
    setShowTypeSelectorModal(true);
  };

  const handleToggleAutoSend = async (notificationId, enabled) => {
    try {
      setLoading(true);
      const response = await refurbishmentService.toggleAutoSend(
        notificationId,
        enabled,
      );

      if (response.success) {
        toast.success(
          `Auto-send ${enabled ? "enabled" : "paused"} successfully`,
        );
        refurbishmentRefresh.activeRequests();
      }
    } catch (err) {
      console.error("Error toggling auto-send:", err);
      toast.error(err.response?.data?.message || "Failed to toggle auto-send");
    } finally {
      setLoading(false);
    }
  };

  const handleEditScheduled = (notification) => {
    setNotificationFormData({
      id: notification.id,
      requestId: "",
      partnerId: notification.partner_id,
      partnerName: notification.partner_name,
      centerId: notification.center_id,
      centerName: notification.center_name,
      reminderDate: notification.scheduled_at
        ? new Date(notification.scheduled_at).toISOString().split("T")[0]
        : "",
      reminderTime: notification.custom_time || "",
      frequency: notification.frequency || "one-time",
      message: notification.message || "",
      packages: notification.packages || [],
    });
    setShowNotificationModal(true);
  };

  const handleCancelScheduled = async (notification) => {
    if (
      !window.confirm(
        `Cancel scheduled notification for ${notification.partner_name}?`,
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const response = await refurbishmentService.cancelScheduledNotification(
        notification.id,
        false,
      );

      if (response.success) {
        toast.success("Scheduled notification cancelled");
        refurbishmentRefresh.activeRequests();
      }
    } catch (err) {
      console.error("Error cancelling:", err);
      toast.error(err.response?.data?.message || "Failed to cancel");
    } finally {
      setLoading(false);
    }
  };

  const handleViewHistory = async (notification) => {
    try {
      setLoading(true);
      const response = await refurbishmentService.getExecutionHistory(
        notification.id,
        50,
      );

      if (response.success) {
        const history = response.data?.history || [];

        if (history.length === 0) {
          toast.info("No execution history yet");
        } else {
          const historyText = history
            .map(
              (h, i) =>
                `${i + 1}. ${h.status.toUpperCase()} - ${new Date(h.executed_at).toLocaleString()}`,
            )
            .join("\n");

          alert(
            `Execution History:\n\n${historyText}\n\nTotal: ${notification.send_count || 0}`,
          );
        }
      }
    } catch (err) {
      console.error("Error loading history:", err);
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  const handleExportActiveRequests = async () => {
    try {
      setLoading(true);

      const params = {
        searchTerm: activeRequestsTable.searchTerm,
        ...activeRequestsTable.activeFilters,
        sortBy: activeRequestsTable.sortBy,
        sortOrder: activeRequestsTable.sortOrder,
      };

      const blob = await refurbishmentService.exportActiveRequests(params);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `active-requests-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Active requests exported successfully");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export active requests");
    } finally {
      setLoading(false);
    }
  };

  return {
    activeRequestsTable,
    requestsFilterOptions,
    handleCreateManualRequest,
    handleToggleAutoSend,
    handleEditScheduled,
    handleCancelScheduled,
    handleViewHistory,
    handleExportActiveRequests,
  };
}
