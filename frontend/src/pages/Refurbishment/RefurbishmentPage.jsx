import React, { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { MainLayout } from "../../components/layout";
import useRefurbishmentData from "../../hooks/refurbishment/useRefurbishmentData";

import OverviewTab from "../../components/refurbishment/tabs/OverviewTab";
import AlertsTab from "../../components/refurbishment/tabs/AlertsTab";
import ActiveRequestsTab from "../../components/refurbishment/tabs/ActiveRequestsTab";
import PastRequestsTab from "../../components/refurbishment/tabs/PastRequestsTab";
import PackagesTab from "../../components/refurbishment/tabs/PackagesTab";
import SettingsTab from "../../components/refurbishment/tabs/SettingsTab";
import CreateRequestModal from "../../components/refurbishment/modals/CreateRequestModal";
import ScheduleNotificationModal from "../../components/refurbishment/modals/ScheduleNotificationModal";
import NotificationTypeSelector from "../../components/refurbishment/modals/NotificationTypeSelector";
import AdminRefurbishmentReviewModal from "../../components/refurbishment/modals/AdminRefurbishmentReviewModal";
import AdminStatusChangeModal from "../../components/refurbishment/modals/AdminStatusChangeModal";
import NotificationHistoryModal from "../../components/refurbishment/modals/NotificationHistoryModal";

import { formatRefurbishmentDate as formatDate } from "../../utils/refurbishmentUtils";
import useOverviewTab from "../../hooks/refurbishment/useOverviewTab";
import useAlertsTab from "../../hooks/refurbishment/useAlertsTab";
import useRequestsTab from "../../hooks/refurbishment/useRequestsTab";
import usePastRequestsTab from "../../hooks/refurbishment/usePastRequestsTab";
import usePackagesTab from "../../hooks/refurbishment/usePackagesTab";
import useSettingsTab from "../../hooks/refurbishment/useSettingsTab";
import useNotificationHandlers from "../../hooks/refurbishment/useNotificationHandlers";
import useCreateRequestModal from "../../hooks/refurbishment/useCreateRequestModal";
import { useNotifications } from "../../hooks/useNotifications";

const RefurbishmentPage = () => {
  const { user } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const {
    data: refurbishmentData,
    loading: _refurbishmentLoading,
    refresh: refurbishmentRefresh,
  } = useRefurbishmentData(selectedYear);

  const { socket } = useNotifications();

  const safeRefurbishmentData = useMemo(
    () => ({
      eligibleCenters: Array.isArray(refurbishmentData?.eligibleCenters)
        ? refurbishmentData.eligibleCenters
        : [],
      eligibleTotalCount: refurbishmentData?.eligibleTotalCount ?? 0,
      lastRefurbishedData: Array.isArray(refurbishmentData?.lastRefurbishedData)
        ? refurbishmentData.lastRefurbishedData
        : [],
      allCentersData: Array.isArray(refurbishmentData?.allCentersData)
        ? refurbishmentData.allCentersData
        : [],
      alerts: Array.isArray(refurbishmentData?.alerts)
        ? refurbishmentData.alerts
        : [],
      activeRequests: Array.isArray(refurbishmentData?.activeRequests)
        ? refurbishmentData.activeRequests
        : [],
      pastRequests: Array.isArray(refurbishmentData?.pastRequests)
        ? refurbishmentData.pastRequests
        : [],
      pastRequestsReadyToCompleteCount:
        refurbishmentData?.pastRequestsReadyToCompleteCount ?? 0,
      packages: Array.isArray(refurbishmentData?.packages)
        ? refurbishmentData.packages
        : [],
    }),
    [refurbishmentData],
  );

  const eligibleCenters = safeRefurbishmentData.eligibleCenters;
  const lastRefurbishedData = safeRefurbishmentData.lastRefurbishedData;
  const allCentersData = safeRefurbishmentData.allCentersData;
  const alerts = safeRefurbishmentData.alerts;
  const activeRequests = safeRefurbishmentData.activeRequests;
  const pastRequests = safeRefurbishmentData.pastRequests;
  const pastRequestsReadyCount =
    safeRefurbishmentData.pastRequestsReadyToCompleteCount;
  const packages = safeRefurbishmentData.packages;

  const alertsUnreadCount = useMemo(
    () => alerts.filter((a) => !a.is_read).length,
    [alerts],
  );

  useEffect(() => {
    console.log("[DEBUG] Active Requests in Dashboard:", {
      count: activeRequests.length,
      requests: activeRequests,
    });
  }, [activeRequests]);

  useEffect(() => {
    console.log("[DEBUG] Packages loaded:", {
      count: packages.length,
      packages: packages,
      samplePackage: packages[0],
    });
  }, [packages]);

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  // Real-time: refresh refurbishment alerts when partner submits (or other refurb events)
  useEffect(() => {
    if (!socket || !isAdmin) return;

    const handleNewNotification = (data) => {
      const alertType = data?.alert_type || "";
      if (!alertType.startsWith("refurbishment")) return;

      refurbishmentRefresh.alerts();
      if (
        alertType === "refurbishment_response" ||
        alertType === "refurbishment_partner_acknowledgment"
      ) {
        refurbishmentRefresh.pastRequests();
      }
    };

    socket.on("notification:new", handleNewNotification);
    return () => {
      socket.off("notification:new", handleNewNotification);
    };
  }, [
    socket,
    isAdmin,
    refurbishmentRefresh.alerts,
    refurbishmentRefresh.pastRequests,
  ]);

  const {
    refurbishmentSettings,
    settingsSaving,
    handleSaveSettings,
  } = useSettingsTab({ refurbishmentRefresh });

  const {
    refurbishmentPackages,
    upgradationPackages,
    packagesTable,
    upgradationPackagesTable,
    courseOptions,
    handleCreatePackage,
    handleEditPackage,
    handleDeletePackage,
    handleExportPackages,
  } = usePackagesTab({ packages, setLoading, refurbishmentRefresh });

  const {
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
  } = useNotificationHandlers({
    allCentersData,
    packages,
    refurbishmentPackages,
    upgradationPackages,
    refurbishmentSettings,
    setLoading,
    refurbishmentRefresh,
  });

  const {
    selectedOverviewCard,
    setSelectedOverviewCard,
    allCentersTable,
    allCentersFilterOptions,
    eligibleTable,
    eligibleFilterOptions,
    lastRefurbishedTable,
    lastRefurbishedFilterOptions,
    handleExportEligibleOverview,
    handleExportLastRefurbishedOverview,
    handleExportAllCentersOverview,
  } = useOverviewTab({
    allCentersData,
    eligibleCenters,
    lastRefurbishedData,
    refurbishmentSettings,
    setLoading,
  });

  const { alertsTable, alertsFilterOptions } = useAlertsTab({ alerts });

  const {
    activeRequestsTable,
    requestsFilterOptions,
    handleCreateManualRequest,
    handleToggleAutoSend,
    handleEditScheduled,
    handleCancelScheduled,
    handleViewHistory,
    handleExportActiveRequests,
  } = useRequestsTab({
    activeRequests,
    setLoading,
    refurbishmentRefresh,
    setNotificationFormData,
    setShowNotificationModal,
    setPendingNotifyItem,
    setShowTypeSelectorModal,
  });

  const {
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
  } = usePastRequestsTab({ pastRequests, setLoading });

  const {
    showCreateModal,
    setShowCreateModal,
    createFormData,
    setCreateFormData,
    handleCreateRequest,
    handleCreatePackagesChange,
  } = useCreateRequestModal({ setActiveTab, refurbishmentRefresh });

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600">
              Only administrators can access this page.
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Refurbishment</h1>
          <p className="text-gray-600 mt-1">
            Central hub for all updates, alerts, and requests.
          </p>
        </div>

        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-1" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("overview")}
              className={`
                px-6 py-3 text-sm font-medium transition-colors duration-200
                border-b-2 whitespace-nowrap
                ${
                  activeTab === "overview"
                    ? "border-green-600 text-green-600"
                    : "border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300"
                }
              `}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("alerts")}
              className={`
                px-6 py-3 text-sm font-medium transition-colors duration-200
                border-b-2 whitespace-nowrap
                ${
                  activeTab === "alerts"
                    ? "border-green-600 text-green-600"
                    : "border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300"
                }
              `}
            >
              <span className="inline-flex items-center gap-2">
                Alerts
                {alertsUnreadCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#fe5c73] text-white text-xs font-semibold">
                    {alertsUnreadCount > 99 ? "99+" : alertsUnreadCount}
                  </span>
                )}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("requests")}
              className={`
                px-6 py-3 text-sm font-medium transition-colors duration-200
                border-b-2 whitespace-nowrap
                ${
                  activeTab === "requests"
                    ? "border-green-600 text-green-600"
                    : "border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300"
                }
              `}
            >
              Requests
            </button>
            <button
              onClick={() => {
                setActiveTab("past-requests");
                refurbishmentRefresh.pastRequests();
              }}
              className={`
                px-6 py-3 text-sm font-medium transition-colors duration-200
                border-b-2 whitespace-nowrap
                ${
                  activeTab === "past-requests"
                    ? "border-green-600 text-green-600"
                    : "border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300"
                }
              `}
            >
              <span className="inline-flex items-center gap-2">
                Past Requests
                {pastRequestsReadyCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#fe5c73] text-white text-xs font-semibold">
                    {pastRequestsReadyCount > 99 ? "99+" : pastRequestsReadyCount}
                  </span>
                )}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("packages")}
              className={`
                px-6 py-3 text-sm font-medium transition-colors duration-200
                border-b-2 whitespace-nowrap
                ${
                  activeTab === "packages"
                    ? "border-green-600 text-green-600"
                    : "border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300"
                }
              `}
            >
              Packages
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`
                px-6 py-3 text-sm font-medium transition-colors duration-200
                border-b-2 whitespace-nowrap
                ${
                  activeTab === "settings"
                    ? "border-green-600 text-green-600"
                    : "border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300"
                }
              `}
            >
              Settings
            </button>
          </nav>
        </div>

        {activeTab === "overview" && (
          <OverviewTab
            selectedCard={selectedOverviewCard}
            onCardClick={setSelectedOverviewCard}
            eligibleCount={
              selectedOverviewCard === "eligible"
                ? eligibleTable.total
                : safeRefurbishmentData.eligibleTotalCount ||
                  eligibleCenters.length
            }
            lastRefurbishedCount={
              selectedOverviewCard === "lastRefurbished"
                ? lastRefurbishedTable.total
                : lastRefurbishedData.length
            }
            allCentersCount={
              selectedOverviewCard === "allCenters"
                ? allCentersTable.total
                : allCentersData.length
            }
            loading={loading}
            eligibleTable={eligibleTable}
            eligibleFilterOptions={eligibleFilterOptions}
            onCreateRequestEligible={(center) => {
              const allPackageIds = packages.map((pkg) => pkg.id);
              setCreateFormData({
                ...createFormData,
                centerId: center.id,
                partnerId: center.partner_id,
                packages: allPackageIds,
              });
              setShowCreateModal(true);
            }}
            onNotifyEligible={handleNotifyPartner}
            onExportEligible={handleExportEligibleOverview}
            formatDate={formatDate}
            lastRefurbishedTable={lastRefurbishedTable}
            lastRefurbishedFilterOptions={lastRefurbishedFilterOptions}
            onViewLastRefurbished={(center) => {
              if (center.latest_request_id) {
                setStatusChangeRequest({
                  id: center.latest_request_id,
                  status: "completed",
                  center_name: center.center_name,
                });
              } else {
                setStatusChangeRequest({
                  isHistoricalRecord: true,
                  status: "completed",
                  center_name: center.center_name,
                  partner_name: center.partner_name,
                  last_refurbishment_date: center.last_refurbishment_date,
                  months_since_last_refurbishment:
                    center.months_since_last_refurbishment,
                  refurbishment_frequency_months:
                    center.refurbishment_frequency_months,
                  year_of_establishment: center.year_of_establishment,
                  city: center.city,
                  state: center.state,
                  region: center.region,
                  center_type: center.center_type,
                });
              }
            }}
            onExportLastRefurbished={handleExportLastRefurbishedOverview}
            allCentersTable={allCentersTable}
            allCentersFilterOptions={allCentersFilterOptions}
            onNotifyAllCenters={handleNotifyPartner}
            onExportAllCenters={handleExportAllCentersOverview}
            onShowHistory={setHistoryCenter}
          />
        )}

        {activeTab === "alerts" && (
          <AlertsTab
            table={alertsTable}
            loading={_refurbishmentLoading.alerts}
            formatDate={formatDate}
            filterOptions={alertsFilterOptions}
            onRefresh={() => {
              refurbishmentRefresh.all();
            }}
          />
        )}

        {activeTab === "requests" && (
          <ActiveRequestsTab
            table={activeRequestsTable}
            loading={loading}
            formatDate={formatDate}
            filterOptions={requestsFilterOptions}
            onNotifyPartner={handleNotifyPartner}
            onExport={handleExportActiveRequests}
            onToggleAutoSend={handleToggleAutoSend}
            onEditScheduled={handleEditScheduled}
            onCancelScheduled={handleCancelScheduled}
            onViewHistory={handleViewHistory}
            onViewRequest={openPastReview}
            onCreateManualRequest={handleCreateManualRequest}
            selectedYear={selectedYear}
            onYearChange={(year) => setSelectedYear(year)}
          />
        )}

        {activeTab === "past-requests" && (
          <PastRequestsTab
            table={pastRequestsTable}
            loading={_refurbishmentLoading.pastRequests || loading}
            selectedYear={selectedYear}
            onYearChange={(year) => setSelectedYear(year)}
            formatDate={formatDate}
            filterOptions={pastRequestsFilterOptions}
            onViewRequest={openPastReview}
            onStatusChange={(request) => setStatusChangeRequest(request)}
            onCreateRequest={handleCreateManualRequest}
            onExport={handleExportPastRequests}
          />
        )}

        {activeTab === "packages" && (
          <PackagesTab
            table={packagesTable}
            upgradationTable={upgradationPackagesTable}
            loading={loading}
            onExport={handleExportPackages}
            onCreatePackage={handleCreatePackage}
            onEditPackage={handleEditPackage}
            onDeletePackage={handleDeletePackage}
            courseOptions={courseOptions}
          />
        )}

        {activeTab === "settings" && (
          <SettingsTab
            settings={refurbishmentSettings}
            loading={loading}
            saving={settingsSaving}
            onSave={handleSaveSettings}
          />
        )}

        <CreateRequestModal
          isOpen={showCreateModal}
          onClose={setShowCreateModal}
          onSubmit={handleCreateRequest}
          formData={createFormData}
          onFormChange={setCreateFormData}
          onPackagesChange={handleCreatePackagesChange}
          packages={packages}
          loading={loading}
        />

        <NotificationTypeSelector
          isOpen={showTypeSelectorModal}
          onClose={() => {
            setShowTypeSelectorModal(false);
            setPendingNotifyItem(null);
          }}
          onSelectInstant={handleSelectInstant}
          onSelectSchedule={handleSelectSchedule}
          defaultMessage={refurbishmentSettings.defaultCustomMessage}
        />

        <ScheduleNotificationModal
          isOpen={showNotificationModal}
          onClose={setShowNotificationModal}
          onSubmit={handleSendNotification}
          initialData={notificationFormData}
          uniquePartners={uniquePartnersForNotif}
          allCenters={allCentersData}
          packages={refurbishmentPackages}
          loading={loading}
        />

        {pastReviewOpen && pastReviewRequestId && (
          <AdminRefurbishmentReviewModal
            open={pastReviewOpen}
            onOpenChange={(open) => {
              setPastReviewOpen(open);
              if (!open) setPastReviewRequestId(null);
            }}
            requestId={pastReviewRequestId}
            onActionComplete={() => {
              refurbishmentRefresh.all();
              setPastReviewOpen(false);
              setPastReviewRequestId(null);
            }}
          />
        )}

        {statusChangeRequest && (
          <AdminStatusChangeModal
            request={statusChangeRequest}
            onClose={() => setStatusChangeRequest(null)}
            onSuccess={() => {
              setStatusChangeRequest(null);
              refurbishmentRefresh.all();
            }}
            onRefresh={async () => {
              const requests = await refurbishmentRefresh.pastRequests();
              if (!Array.isArray(requests) || !statusChangeRequest) return;
              const requestId =
                statusChangeRequest.id || statusChangeRequest.request_id;
              const fresh = requests.find((row) => row.id === requestId);
              if (fresh) setStatusChangeRequest(fresh);
            }}
          />
        )}

        {historyCenter && (
          <NotificationHistoryModal
            center={historyCenter}
            onClose={() => setHistoryCenter(null)}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default RefurbishmentPage;
