import { useState, useMemo } from "react";
import { toast } from "react-toastify";
import refurbishmentService from "../../services/refurbishment.service";
import { REQUEST_TYPE_LABELS } from "../../utils/refurbishmentUtils";

export default function useNotificationHandlers({
  allCentersData,
  packages,
  refurbishmentPackages,
  upgradationPackages,
  refurbishmentSettings,
  setLoading,
  refurbishmentRefresh,
}) {
  const [historyCenter, setHistoryCenter] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showTypeSelectorModal, setShowTypeSelectorModal] = useState(false);
  const [pendingNotifyItem, setPendingNotifyItem] = useState(null);

  const [notificationFormData, setNotificationFormData] = useState({
    requestId: "",
    partnerId: "",
    partnerName: "",
    centerId: "",
    centerName: "",
    reminderDate: "",
    reminderTime: "",
    frequency: "instant",
    message: "",
    packages: [],
    organization_name: "",
  });

  const uniquePartnersForNotif = useMemo(() => {
    const partnersMap = new Map();
    allCentersData.forEach((center) => {
      const partnerName = center.organization_name || center.partner_name;
      if (center.partner_id && partnerName) {
        partnersMap.set(center.partner_id, partnerName);
      }
    });
    return Array.from(partnersMap.entries())
      .map(([id, name]) => ({
        value: id,
        label: name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [allCentersData]);

  const handleNotifyPartner = (item) => {
    setPendingNotifyItem(item);
    setShowTypeSelectorModal(true);
  };

  const handleSelectInstant = async (customMessage) => {
    const item = pendingNotifyItem;
    if (!item) return;

    setShowTypeSelectorModal(false);

    const messageText =
      (typeof customMessage === "string" && customMessage.trim()) ||
      refurbishmentSettings.defaultCustomMessage ||
      "";

    if (item.isManualRequest) {
      const allPackageIds = refurbishmentPackages.map((pkg) => pkg.id);
      const now = new Date();
      const instantDateTime = now.toISOString().split("T")[0];
      const instantTime = now.toTimeString().slice(0, 5);

      setNotificationFormData({
        requestId: "",
        partnerId: "",
        partnerName: "",
        centerId: "",
        centerName: "",
        reminderDate: instantDateTime,
        reminderTime: instantTime,
        frequency: "instant",
        message: messageText,
        packages: allPackageIds,
        isInstantMode: true,
        requestType: REQUEST_TYPE_LABELS.INSTANT,
      });
      setShowNotificationModal(true);
      setPendingNotifyItem(null);
      return;
    }

    try {
      setLoading(true);

      const isCenter = !item.request_id;

      const allPackageIds = refurbishmentPackages.map((pkg) => pkg.id);

      const transformedPackages = allPackageIds.map((packageId) => ({
        packageId,
        quantity: 1,
        notes: null,
      }));

      const transformedUpgradationPackages = upgradationPackages.map((pkg) => ({
        packageId: pkg.id,
        quantity: 1,
        notes: null,
      }));

      const now = new Date();
      const instantDateTime = now.toISOString();

      const createData = {
        centerId: isCenter ? item.id : item.center_id,
        partnerId: item.partner_id,
        scheduledAt: instantDateTime,
        frequency: "instant",
        message: messageText,
        packages: transformedPackages,
        upgradation_packages: transformedUpgradationPackages,
        autoSend: true,
        sendImmediately: true,
        isManualRequest: false,
        requestType: REQUEST_TYPE_LABELS.INSTANT,
      };

      console.log("[DEBUG] Sending instant notification:", createData);

      const response =
        await refurbishmentService.createScheduledNotification(createData);

      if (response.success) {
        toast.success("Instant notification sent successfully!");
        refurbishmentRefresh.activeRequests();
        refurbishmentRefresh.eligibleCenters();
        refurbishmentRefresh.allCentersData();
        refurbishmentRefresh.alerts();
      } else {
        toast.error(response.message || "Failed to send instant notification");
      }
    } catch (error) {
      console.error("Error sending instant notification:", error);
      toast.error("Failed to send instant notification. Please try again.");
    } finally {
      setLoading(false);
      setPendingNotifyItem(null);
    }
  };

  const handleSelectSchedule = () => {
    const item = pendingNotifyItem;
    if (!item) return;

    setShowTypeSelectorModal(false);

    const allPackageIds = packages.map((pkg) => pkg.id);

    const now = new Date();
    now.setHours(now.getHours() + 1);
    const defaultDate = now.toISOString().split("T")[0];
    const defaultTime = now.toTimeString().slice(0, 5);

    const isCenter = !item.request_id;
    const isManualRequest = item.isManualRequest || false;

    setNotificationFormData({
      requestId: isCenter ? "" : item.id,
      partnerId: isManualRequest ? "" : item.partner_id || "",
      partnerName: isManualRequest
        ? ""
        : item.partner_name || item.organization_name || "",
      centerId: isManualRequest
        ? ""
        : isCenter
          ? item.id
          : item.center_id || "",
      centerName: isManualRequest ? "" : item.center_name || "",
      reminderDate: defaultDate,
      reminderTime: defaultTime,
      frequency: "instant",
      customIntervalDays: 1,
      maxOccurrences: null,
      message: refurbishmentSettings.defaultCustomMessage,
      packages: allPackageIds,
      requestType: REQUEST_TYPE_LABELS.SCHEDULED,
    });
    setShowNotificationModal(true);
    setPendingNotifyItem(null);
  };

  const handleSendNotification = async (formData) => {
    if (!formData.partnerId) {
      toast.error("Please select a partner");
      return;
    }
    if (!formData.centerId) {
      toast.error("Please select a center");
      return;
    }
    if (!formData.packages || formData.packages.length === 0) {
      toast.error("Please select at least one package");
      return;
    }
    if (formData.frequency === "custom") {
      if (!formData.customIntervalDays || formData.customIntervalDays < 1) {
        toast.error(
          "Please enter a valid interval (1-365 days) for custom frequency",
        );
        return;
      }
    }

    try {
      setLoading(true);

      const reminderDateTime = `${formData.reminderDate}T${formData.reminderTime}`;

      const transformedPackages = formData.packages.map((packageId) => ({
        packageId,
        quantity: 1,
        notes: null,
      }));

      const transformedUpgradationPackages = Array.isArray(
        formData.upgradation_packages,
      )
        ? formData.upgradation_packages.map((packageId) => ({
            packageId,
            quantity: 1,
            notes: null,
          }))
        : [];

      console.log("[DEBUG] Sending notification with data:", {
        partnerId: formData.partnerId,
        centerId: formData.centerId,
        scheduledAt: reminderDateTime,
        frequency: formData.frequency,
        packages: transformedPackages,
        packagesCount: transformedPackages.length,
        isManualRequest: formData.isManualRequest,
      });

      let response;

      if (formData.id) {
        const updateData = {
          scheduled_at: reminderDateTime,
          frequency: formData.frequency,
          message: formData.message,
          packages: transformedPackages,
          upgradation_packages: transformedUpgradationPackages,
        };

        if (formData.frequency === "custom") {
          updateData.custom_interval_days = formData.customIntervalDays || 1;
        }
        if (formData.maxOccurrences) {
          updateData.max_occurrences = parseInt(formData.maxOccurrences);
        }

        if (formData.frequency !== "instant") {
          const scheduledDate = new Date(reminderDateTime);
          updateData.custom_day =
            formData.frequency === "weekly"
              ? scheduledDate.getDay()
              : scheduledDate.getDate();
          updateData.custom_time = formData.reminderTime;
        }

        response = await refurbishmentService.updateScheduledNotification(
          formData.id,
          updateData,
        );
      } else {
        const createData = {
          centerId: formData.centerId,
          partnerId: formData.partnerId,
          scheduledAt: reminderDateTime,
          frequency: formData.frequency,
          customDay:
            formData.frequency !== "instant"
              ? formData.frequency === "weekly"
                ? new Date(reminderDateTime).getDay()
                : new Date(reminderDateTime).getDate()
              : undefined,
          customTime:
            formData.frequency !== "instant"
              ? formData.reminderTime
              : undefined,
          message: formData.message,
          upgradation_packages: transformedUpgradationPackages,
          packages: transformedPackages,
          autoSend: formData.isInstantMode
            ? true
            : formData.isManualRequest
              ? false
              : true,
          sendImmediately: formData.isInstantMode === true,
          isManualRequest: formData.isManualRequest || false,
          requestType:
            formData.requestType ||
            (formData.isInstantMode
              ? REQUEST_TYPE_LABELS.INSTANT
              : REQUEST_TYPE_LABELS.SCHEDULED),
        };

        if (formData.frequency === "custom") {
          createData.customIntervalDays = formData.customIntervalDays || 1;
        }

        if (formData.maxOccurrences) {
          createData.maxOccurrences = parseInt(formData.maxOccurrences);
        }

        response =
          await refurbishmentService.createScheduledNotification(createData);
      }

      if (response.success) {
        const successMessage = formData.id
          ? "Scheduled notification updated"
          : formData.isInstantMode
            ? "Instant notification sent successfully!"
            : formData.isManualRequest
              ? "Manual request created successfully"
              : "Notification scheduled successfully";

        toast.success(successMessage);

        refurbishmentRefresh.activeRequests();
        if (formData.frequency === "instant") {
          refurbishmentRefresh.eligibleCenters();
          refurbishmentRefresh.allCentersData();
          refurbishmentRefresh.alerts();
        }

        setShowNotificationModal(false);
        setNotificationFormData({
          id: "",
          requestId: "",
          partnerId: "",
          partnerName: "",
          centerId: "",
          centerName: "",
          reminderDate: "",
          reminderTime: "",
          frequency: "instant",
          customIntervalDays: 1,
          maxOccurrences: null,
          upgradation_packages: [],
          message: refurbishmentSettings.defaultCustomMessage,
          packages: [],
        });
      } else {
        toast.error(response.message || "Failed to schedule notification");
      }
    } catch (error) {
      console.error("Error scheduling notification:", error);
      toast.error("Failed to schedule notification. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return {
    historyCenter,
    setHistoryCenter,
    showNotificationModal,
    setShowNotificationModal,
    showTypeSelectorModal,
    setShowTypeSelectorModal,
    pendingNotifyItem,
    setPendingNotifyItem,
    notificationFormData,
    setNotificationFormData,
    uniquePartnersForNotif,
    handleNotifyPartner,
    handleSelectInstant,
    handleSelectSchedule,
    handleSendNotification,
  };
}
