import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { MainLayout } from "../../components/layout";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Checkbox } from "../../components/ui/checkbox";
import { Label } from "../../components/ui/label";
import refurbishmentService from "../../services/refurbishment.service";
import { getCourses } from "../../services/data.service";
import { toast } from "react-toastify";
import useRefurbishmentData from "../../hooks/refurbishment/useRefurbishmentData";
import useTableSearch from "../../hooks/refurbishment/useTableSearch";

// Tab components
import OverviewTab from "../../components/refurbishment/tabs/OverviewTab";
import EligibilityTab from "../../components/refurbishment/tabs/EligibilityTab";
import AlertsTab from "../../components/refurbishment/tabs/AlertsTab";
import ActiveRequestsTab from "../../components/refurbishment/tabs/ActiveRequestsTab";
import PastRequestsTab from "../../components/refurbishment/tabs/PastRequestsTab";
import PackagesTab from "../../components/refurbishment/tabs/PackagesTab";
import PackageSelector from "../../components/refurbishment/PackageSelector";
import CreateRequestModal from "../../components/refurbishment/modals/CreateRequestModal";
import ScheduleNotificationModal from "../../components/refurbishment/modals/ScheduleNotificationModal";
import NotificationTypeSelector from "../../components/refurbishment/modals/NotificationTypeSelector";
import AdminRefurbishmentReviewModal from "../../components/refurbishment/modals/AdminRefurbishmentReviewModal";
import AdminStatusChangeModal from "../../components/refurbishment/modals/AdminStatusChangeModal";

// Reusable financial years options constant
const FY_OPTIONS = [
  { value: "2025-26", label: "FY 2025-26" },
  { value: "2026-27", label: "FY 2026-27" },
  { value: "2027-28", label: "FY 2027-28" },
  { value: "2028-29", label: "FY 2028-29" },
];

// Year options for filtering (calendar years)
const YEAR_OPTIONS = [
  { value: "2025", label: "2025" },
  { value: "2024", label: "2024" },
  { value: "2023", label: "2023" },
  { value: "2022", label: "2022" },
  { value: "2021", label: "2021" },
];

const RefurbishmentDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);

  // Year selection for summary cards
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Pending review count for badge
  // (kept for potential future use; alertsUnreadCount is used for the Alerts tab badge)

  // Use custom hook for data management (replaces 7 useState declarations)
  const {
    data: refurbishmentData,
    loading: _refurbishmentLoading,
    refresh: refurbishmentRefresh,
  } = useRefurbishmentData(selectedYear);

  // Ensure refurbishmentData is always an object with array properties
  const safeRefurbishmentData = useMemo(
    () => ({
      eligibleCenters: Array.isArray(refurbishmentData?.eligibleCenters)
        ? refurbishmentData.eligibleCenters
        : [],
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
      packages: Array.isArray(refurbishmentData?.packages)
        ? refurbishmentData.packages
        : [],
    }),
    [refurbishmentData],
  );

  // Destructure data from safe object
  const eligibleCenters = safeRefurbishmentData.eligibleCenters;
  const lastRefurbishedData = safeRefurbishmentData.lastRefurbishedData;
  const allCentersData = safeRefurbishmentData.allCentersData;
  const alerts = safeRefurbishmentData.alerts;
  const activeRequests = safeRefurbishmentData.activeRequests;
  const pastRequests = safeRefurbishmentData.pastRequests;
  const packages = safeRefurbishmentData.packages;

  // Count unread alerts for the Alerts tab badge
  const alertsUnreadCount = useMemo(
    () => alerts.filter((a) => !a.is_read).length,
    [alerts],
  );

  // Debug: Log active requests when they change
  useEffect(() => {
    console.log("[DEBUG] Active Requests in Dashboard:", {
      count: activeRequests.length,
      requests: activeRequests,
    });
  }, [activeRequests]);

  // Debug: Log packages when they change
  useEffect(() => {
    console.log("[DEBUG] Packages loaded:", {
      count: packages.length,
      packages: packages,
      samplePackage: packages[0],
    });
  }, [packages]);

  // Data loaded - log once on mount for debugging if needed
  // useEffect(() => {
  //   console.log("[RefurbishmentDashboard] Data loaded:", {
  //     eligibleCenters: eligibleCenters.length,
  //     lastRefurbishedData: lastRefurbishedData.length,
  //     allCentersData: allCentersData.length,
  //     alerts: alerts.length,
  //     activeRequests: activeRequests.length,
  //     pastRequests: pastRequests.length,
  //     packages: packages.length,
  //   });
  // }, []);

  // Load course options on mount
  useEffect(() => {
    const loadCourses = async () => {
      try {
        // Fetch courses from database API
        const response = await getCourses();
        const courses = response.data || [];

        // Map courses to expected format for dropdown
        const mappedCourses = courses.map((course) => ({
          id: course.id,
          name: course.course_name, // Will be displayed as "Lab" in UI
          code: course.course_code,
          description: course.description,
          duration: course.duration_months,
        }));

        setCourseOptions(mappedCourses);
      } catch (error) {
        console.error("Error loading courses:", error);
        toast.error("Failed to load lab options");
      }
    };

    loadCourses();
  }, []);

  const [selectedOverviewCard, setSelectedOverviewCard] = useState("eligible");

  // Past requests — view modal (using AdminRefurbishmentReviewModal)
  const [pastReviewRequestId, setPastReviewRequestId] = useState(null);
  const [pastReviewOpen, setPastReviewOpen] = useState(false);

  // Past requests — status change modal
  const [statusChangeRequest, setStatusChangeRequest] = useState(null);

  // Create request modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    partnerId: "",
    centerId: "",
    reason: "",
    description: "",
    packages: [], // Array of package IDs (no quantity)
  });

  // Notification reminder modal
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  // Notification type selector modal (Instant vs Schedule)
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
    frequency: "one-time", // one-time, daily, weekly, monthly
    message: "",
    packages: [], // Array of package IDs (no quantity)
    organization_name: "",
  });
  // Custom filter function for AllCenters table
  const allCentersCustomFilters = useCallback((items, filters) => {
    if (!Array.isArray(items)) return [];
    let filtered = [...items];

    // Eligibility filter
    if (filters.eligibility) {
      filtered = filtered.filter(
        (c) => c.eligibility_status === filters.eligibility,
      );
    }

    // Age filter
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

    // Partner filter (multi-select)
    if (filters.partner?.length > 0) {
      filtered = filtered.filter((c) =>
        filters.partner.includes(c.partner_name),
      );
    }

    // State filter (multi-select)
    if (filters.state?.length > 0) {
      filtered = filtered.filter((c) => filters.state.includes(c.state));
    }

    // Financial year filter
    if (filters.financialYear) {
      filtered = filtered.filter(
        (c) => c.financial_year === filters.financialYear,
      );
    }

    return filtered;
  }, []);

  // Use table search hook for AllCenters (replaces allCentersSearch state + getFilteredAndSortedAllCenters function)
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

  // Filter options for AllCentersTable
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

  // Custom filter function for EligibleCenters table
  const eligibleCentersCustomFilters = useCallback((items, filters) => {
    if (!Array.isArray(items)) return [];
    let filtered = [...items];

    // Partner filter
    if (filters.partner?.length > 0) {
      filtered = filtered.filter((c) =>
        filters.partner.includes(c.partner_name),
      );
    }

    // State filter
    if (filters.state?.length > 0) {
      filtered = filtered.filter((c) => filters.state.includes(c.state));
    }

    // Last Notified filter
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

    // Financial year filter
    if (filters.financialYear) {
      filtered = filtered.filter(
        (c) => c.financial_year === filters.financialYear,
      );
    }

    return filtered;
  }, []);

  // Use table search hook for EligibleCenters
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

  // Filter options for EligibleCentersTable
  const [eligibleFilterOptions, setEligibleFilterOptions] = useState({
    partners: [],
    states: [],
    financialYears: [],
    years: YEAR_OPTIONS,
  });

  // Custom filter function for LastRefurbished table
  const lastRefurbishedCustomFilters = useCallback((items, filters) => {
    if (!Array.isArray(items)) return [];
    let filtered = [...items];

    // Partner filter
    if (filters.partner?.length > 0) {
      filtered = filtered.filter((c) =>
        filters.partner.includes(c.partner_name),
      );
    }

    // State filter
    if (filters.state?.length > 0) {
      filtered = filtered.filter((c) => filters.state.includes(c.state));
    }

    // Refurbishment Recency filter
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

    // Financial year filter
    if (filters.financialYear) {
      filtered = filtered.filter(
        (c) => c.financial_year === filters.financialYear,
      );
    }

    return filtered;
  }, []);

  // Use table search hook for LastRefurbished
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

  // Filter options for LastRefurbishedTable
  const [lastRefurbishedFilterOptions, setLastRefurbishedFilterOptions] =
    useState({
      partners: [],
      states: [],
      financialYears: [],
      years: YEAR_OPTIONS,
    });

  // Custom filter function for Eligibility Tab
  const eligibilityTabCustomFilters = useCallback((items, filters) => {
    if (!Array.isArray(items)) return [];
    let filtered = [...items];

    // Partner filter
    if (filters.partner?.length > 0) {
      filtered = filtered.filter((c) =>
        filters.partner.includes(c.partner_name),
      );
    }

    // State filter
    if (filters.state?.length > 0) {
      filtered = filtered.filter((c) => filters.state.includes(c.state));
    }

    // Region filter
    if (filters.region?.length > 0) {
      filtered = filtered.filter((c) => filters.region.includes(c.region));
    }

    // Financial year filter
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

  // Use table search hook for Eligibility Tab
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

  // Filter options for Eligibility tab
  const [eligibilityTabFilterOptions, setEligibilityTabFilterOptions] =
    useState({
      partners: [],
      states: [],
      regions: [],
      financialYears: [],
    });

  // Custom filter function for Alerts Tab
  const alertsCustomFilters = useCallback((items, filters) => {
    if (!Array.isArray(items)) return [];
    let filtered = [...items];

    // Type filter
    if (filters.type?.length > 0) {
      filtered = filtered.filter((a) =>
        filters.type.includes(a.alert_type || "General"),
      );
    }

    // Status filter
    if (filters.status?.length > 0) {
      filtered = filtered.filter((alert) =>
        filters.status.includes(alert.priority || alert.status || "MEDIUM"),
      );
    }

    // Financial Year filter
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

  // Use table search hook for Alerts Tab
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

  // Filter options for Alerts tab
  const [alertsFilterOptions, setAlertsFilterOptions] = useState({
    types: [],
    statuses: [],
    financialYears: [],
  });

  // Custom filter function for Active Requests Tab
  const activeRequestsCustomFilters = useCallback((items, filters) => {
    if (!Array.isArray(items)) return [];
    let filtered = [...items];

    // Partner filter
    if (filters.partner?.length > 0) {
      filtered = filtered.filter((r) =>
        filters.partner.includes(r.organization_name),
      );
    }

    // Frequency filter
    if (filters.frequency?.length > 0) {
      filtered = filtered.filter((r) =>
        filters.frequency.includes(r.frequency || "Monthly"),
      );
    }

    // Financial Year filter
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

  // Use table search hook for Active Requests Tab (replaces requestsSearch)
  const activeRequestsTable = useTableSearch(activeRequests, {
    searchFields: ["organization_name", "reason", "frequency"],
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

  // Filter options for Requests tab
  const [requestsFilterOptions, setRequestsFilterOptions] = useState({
    partners: [],
    frequencies: [],
    financialYears: [],
  });

  // Custom filter function for Past Requests Tab
  const pastRequestsCustomFilters = useCallback((items, filters) => {
    if (!Array.isArray(items)) return [];
    let filtered = [...items];

    // Type filter
    if (filters.type?.length > 0) {
      filtered = filtered.filter((r) =>
        filters.type.includes(r.refurbishment_type || r.type || "Standard"),
      );
    }

    // Status filter
    if (filters.status?.length > 0) {
      filtered = filtered.filter((r) => {
        const displayStatus =
          r.status === "completed"
            ? "Completed"
            : r.status === "rejected"
              ? "Resolved"
              : "In-review";
        return filters.status.includes(displayStatus);
      });
    }

    // Center filter
    if (filters.center?.length > 0) {
      filtered = filtered.filter((r) => filters.center.includes(r.center_name));
    }

    // Financial Year filter
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

  // Use table search hook for Past Requests Tab
  const pastRequestsTable = useTableSearch(pastRequests, {
    searchFields: ["center_name", "type", "refurbishment_type"],
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

  // Filter options for Past Requests tab
  const [pastRequestsFilterOptions, setPastRequestsFilterOptions] = useState({
    types: [],
    statuses: [],
    centers: [],
    financialYears: [],
  });

  // Split packages by category for sub-tabs
  const refurbishmentPackages = useMemo(
    () => packages.filter((p) => !p.category || p.category === "refurbishment"),
    [packages],
  );
  const upgradationPackages = useMemo(
    () => packages.filter((p) => p.category === "upgradation"),
    [packages],
  );

  // Use table search hook for Packages Tab – Refurbishment category
  const packagesTable = useTableSearch(refurbishmentPackages, {
    searchFields: ["name", "description"],
    initialFilters: {
      courses: [],
    },
    initialSortBy: "name",
    initialSortOrder: "asc",
    pageSize: 10,
  });

  // Use table search hook for Packages Tab – Upgradation category
  const upgradationPackagesTable = useTableSearch(upgradationPackages, {
    searchFields: ["name", "description"],
    initialFilters: {
      courses: [],
    },
    initialSortBy: "name",
    initialSortOrder: "asc",
    pageSize: 10,
  });

  // Course options for package creation/editing
  const [courseOptions, setCourseOptions] = useState([]);

  // Check if user is admin
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  // Generate unique partners list for notification modal
  const uniquePartnersForNotif = useMemo(() => {
    const partnersMap = new Map();
    allCentersData.forEach((center) => {
      // Handle both organization_name (from getAllCenters API) and partner_name (legacy)
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

  // All data loading functions replaced by useRefurbishmentData hook
  // (Removed 7 load functions: loadDashboardData, loadEligibleCenters, loadLastRefurbishedData,
  // loadAllCentersData, loadAlerts, loadActiveRequests, loadPastRequests, loadPackages)

  // Request management functions

  // Helper: Convert date string to Financial Year format (FY YYYY-YY)
  const getFinancialYear = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const month = date.getMonth(); // 0-11
    const year = date.getFullYear();

    // FY starts April (month 3), ends March (month 2)
    if (month >= 3) {
      // April to December: current year to next year
      return `${year}-${(year + 1).toString().slice(2)}`;
    } else {
      // January to March: previous year to current year
      return `${year - 1}-${year.toString().slice(2)}`;
    }
  };

  // Handle notify partner (bell icon) - Open notification type selector
  const handleNotifyPartner = (item) => {
    // Store the item for later use when type is selected
    setPendingNotifyItem(item);
    setShowTypeSelectorModal(true);
  };

  // Handle instant notification selection
  const handleSelectInstant = async () => {
    const item = pendingNotifyItem;
    if (!item) return;

    setShowTypeSelectorModal(false);

    // If manual request (no partner/center), need to select them first
    if (item.isManualRequest) {
      // Open modal with instant frequency but partner/center selection required
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
        message: "Refurbishment notification for your center.",
        packages: allPackageIds,
        // Do NOT pre-fill upgradation_packages here — the modal auto-selects all on mount
        isInstantMode: true, // FLAG: Instant mode with partner/center selection
      });
      setShowNotificationModal(true);
      setPendingNotifyItem(null);
      return;
    }

    // If from bell icon (pre-filled partner/center), send immediately
    try {
      setLoading(true);

      const isCenter = !item.request_id; // If no request_id, it's a center object

      // Get refurbishment-only package IDs
      const allPackageIds = refurbishmentPackages.map((pkg) => pkg.id);

      // Transform to backend format
      const transformedPackages = allPackageIds.map((packageId) => ({
        packageId,
        quantity: 1,
        notes: null,
      }));

      // Include all upgradation packages so partner is shown the upgradation prompt
      const transformedUpgradationPackages = upgradationPackages.map((pkg) => ({
        packageId: pkg.id,
        quantity: 1,
        notes: null,
      }));

      // Prepare instant notification data
      const now = new Date();
      const instantDateTime = now.toISOString();

      const createData = {
        centerId: isCenter ? item.id : item.center_id,
        partnerId: item.partner_id,
        scheduledAt: instantDateTime,
        frequency: "instant",
        message: `Refurbishment notification for ${item.center_name || "your center"}.`,
        packages: transformedPackages,
        upgradation_packages: transformedUpgradationPackages,
        autoSend: true, // Send immediately
        isManualRequest: false,
      };

      console.log("[DEBUG] Sending instant notification:", createData);

      const response =
        await refurbishmentService.createScheduledNotification(createData);

      if (response.success) {
        toast.success("Instant notification sent successfully!");
        refurbishmentRefresh.activeRequests();
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

  // Handle schedule notification selection
  const handleSelectSchedule = () => {
    const item = pendingNotifyItem;
    if (!item) return;

    setShowTypeSelectorModal(false);

    // Pre-select all packages
    const allPackageIds = packages.map((pkg) => pkg.id);

    // Set default date and time (now + 1 hour)
    const now = new Date();
    now.setHours(now.getHours() + 1);
    const defaultDate = now.toISOString().split("T")[0];
    const defaultTime = now.toTimeString().slice(0, 5);

    // If manual request, leave partner/center empty
    // If bell icon, pre-fill partner/center from clicked row
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
      message: `Reminder: Please review the refurbishment request for your center.`,
      packages: allPackageIds,
    });
    setShowNotificationModal(true);
    setPendingNotifyItem(null);
  };

  // Submit notification reminder - receives formData directly from the self-contained modal
  const handleSendNotification = async (notificationFormData) => {
    // Validation
    if (!notificationFormData.partnerId) {
      toast.error("Please select a partner");
      return;
    }
    if (!notificationFormData.centerId) {
      toast.error("Please select a center");
      return;
    }
    if (
      !notificationFormData.packages ||
      notificationFormData.packages.length === 0
    ) {
      toast.error("Please select at least one package");
      return;
    }
    // Validate custom frequency
    if (notificationFormData.frequency === "custom") {
      if (
        !notificationFormData.customIntervalDays ||
        notificationFormData.customIntervalDays < 1
      ) {
        toast.error(
          "Please enter a valid interval (1-365 days) for custom frequency",
        );
        return;
      }
    }

    try {
      setLoading(true);

      // Combine date and time
      const reminderDateTime = `${notificationFormData.reminderDate}T${notificationFormData.reminderTime}`;

      // Transform packages array from simple IDs to backend format
      const transformedPackages = notificationFormData.packages.map(
        (packageId) => ({
          packageId,
          quantity: 1, // Default quantity
          notes: null,
        }),
      );

      // Transform upgradation packages array
      const transformedUpgradationPackages = Array.isArray(
        notificationFormData.upgradation_packages,
      )
        ? notificationFormData.upgradation_packages.map((packageId) => ({
            packageId,
            quantity: 1,
            notes: null,
          }))
        : [];

      console.log("[DEBUG] Sending notification with data:", {
        partnerId: notificationFormData.partnerId,
        centerId: notificationFormData.centerId,
        scheduledAt: reminderDateTime,
        frequency: notificationFormData.frequency,
        packages: transformedPackages,
        packagesCount: transformedPackages.length,
        isManualRequest: notificationFormData.isManualRequest,
      });

      let response;

      // Check if editing existing scheduled notification
      if (notificationFormData.id) {
        // EDIT MODE: Update existing scheduled notification
        const updateData = {
          scheduled_at: reminderDateTime,
          frequency: notificationFormData.frequency,
          message: notificationFormData.message,
          packages: transformedPackages,
          upgradation_packages: transformedUpgradationPackages,
        };

        // Add custom_interval_days and max_occurrences
        if (notificationFormData.frequency === "custom") {
          updateData.custom_interval_days =
            notificationFormData.customIntervalDays || 1;
        }
        if (notificationFormData.maxOccurrences) {
          updateData.max_occurrences = parseInt(
            notificationFormData.maxOccurrences,
          );
        }

        // Add custom_day and custom_time if not instant
        if (notificationFormData.frequency !== "instant") {
          const scheduledDate = new Date(reminderDateTime);
          updateData.custom_day =
            notificationFormData.frequency === "weekly"
              ? scheduledDate.getDay()
              : scheduledDate.getDate();
          updateData.custom_time = notificationFormData.reminderTime;
        }

        response = await refurbishmentService.updateScheduledNotification(
          notificationFormData.id,
          updateData,
        );
      } else {
        // CREATE MODE: Create new scheduled notification or manual request
        const createData = {
          centerId: notificationFormData.centerId,
          partnerId: notificationFormData.partnerId,
          scheduledAt: reminderDateTime,
          frequency: notificationFormData.frequency,
          customDay:
            notificationFormData.frequency !== "instant"
              ? notificationFormData.frequency === "weekly"
                ? new Date(reminderDateTime).getDay()
                : new Date(reminderDateTime).getDate()
              : undefined,
          customTime:
            notificationFormData.frequency !== "instant"
              ? notificationFormData.reminderTime
              : undefined,
          message: notificationFormData.message,
          upgradation_packages: transformedUpgradationPackages,
          packages: transformedPackages,
          autoSend: notificationFormData.isInstantMode
            ? true
            : notificationFormData.isManualRequest
              ? false
              : true, // Instant mode: auto_send = true, Manual requests: auto_send = false
          isManualRequest: notificationFormData.isManualRequest || false,
        };

        // Add custom_interval_days for custom frequency
        if (notificationFormData.frequency === "custom") {
          createData.customIntervalDays =
            notificationFormData.customIntervalDays || 1;
        }

        // Add max_occurrences if specified
        if (notificationFormData.maxOccurrences) {
          createData.maxOccurrences = parseInt(
            notificationFormData.maxOccurrences,
          );
        }

        response =
          await refurbishmentService.createScheduledNotification(createData);
      }

      if (response.success) {
        const successMessage = notificationFormData.id
          ? "Scheduled notification updated"
          : notificationFormData.isInstantMode
            ? "Instant notification sent successfully!"
            : notificationFormData.isManualRequest
              ? "Manual request created successfully"
              : "Notification scheduled successfully";

        toast.success(successMessage);

        // Refresh active requests to show the new/updated notification
        refurbishmentRefresh.activeRequests();

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
          message: "",
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

  // ===== SCHEDULED NOTIFICATIONS HANDLERS =====

  /**
   * Handle create manual request button click
   * Opens the notification type selector (same as bell icon)
   */
  const handleCreateManualRequest = () => {
    // Store an empty item (no pre-filled partner/center)
    setPendingNotifyItem({
      id: null,
      partner_id: "",
      partner_name: "",
      center_name: "",
      request_id: null,
      isManualRequest: true, // FLAG: This is from manual request button
    });
    setShowTypeSelectorModal(true);
  };

  // Toggle auto-send ON/OFF for scheduled notification
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
        refurbishmentRefresh.activeRequests(); // Refresh table
      }
    } catch (err) {
      console.error("Error toggling auto-send:", err);
      toast.error(err.response?.data?.message || "Failed to toggle auto-send");
    } finally {
      setLoading(false);
    }
  };

  // Edit scheduled notification (open modal with pre-filled data)
  const handleEditScheduled = (notification) => {
    setNotificationFormData({
      id: notification.id, // Add ID for editing
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

  // Cancel scheduled notification
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

  // View execution history
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

  // ===== END SCHEDULED HANDLERS =====

  // ===== PACKAGES MANAGEMENT HANDLERS =====

  // Create new package
  const handleCreatePackage = async (packageData) => {
    try {
      setLoading(true);
      const response = await refurbishmentService.createPackage(packageData);

      if (response.success) {
        toast.success("Package created successfully");
        refurbishmentRefresh.packages(); // Refresh packages list
      }
    } catch (err) {
      console.error("Error creating package:", err);
      toast.error(err.response?.data?.message || "Failed to create package");
    } finally {
      setLoading(false);
    }
  };

  // Edit existing package
  const handleEditPackage = async (packageId, updates) => {
    try {
      setLoading(true);
      const response = await refurbishmentService.updatePackage(
        packageId,
        updates,
      );

      if (response.success) {
        toast.success("Package updated successfully");
        refurbishmentRefresh.packages(); // Refresh packages list
      }
    } catch (err) {
      console.error("Error updating package:", err);
      toast.error(err.response?.data?.message || "Failed to update package");
    } finally {
      setLoading(false);
    }
  };

  // Delete package
  const handleDeletePackage = async (pkg) => {
    if (
      !window.confirm(
        `Delete package "${pkg.name}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const response = await refurbishmentService.deletePackage(pkg.id);

      if (response.success) {
        toast.success("Package deleted successfully");
        refurbishmentRefresh.packages(); // Refresh packages list
      }
    } catch (err) {
      console.error("Error deleting package:", err);
      toast.error(err.response?.data?.message || "Failed to delete package");
    } finally {
      setLoading(false);
    }
  };

  // Export packages to Excel
  const handleExportPackages = async () => {
    try {
      setLoading(true);
      // For now, just show a message
      toast.info("Export functionality coming soon");
      // TODO: Implement CSV/Excel export
    } catch (err) {
      console.error("Error exporting packages:", err);
      toast.error("Failed to export packages");
    } finally {
      setLoading(false);
    }
  };

  // ===== END PACKAGES HANDLERS =====

  // Handle export eligible centers
  const handleExportEligible = async () => {
    try {
      setLoading(true);

      // Prepare params from current search/filter/sort state
      const params = {
        searchTerm: eligibilityTabTable.searchTerm,
        ...eligibilityTabTable.activeFilters, // partner, state, region arrays
        sortBy: eligibilityTabTable.sortBy,
        sortOrder: eligibilityTabTable.sortOrder,
      };

      // Call export service
      const blob = await refurbishmentService.exportEligibleCenters(params);

      // Create download link
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

  // Handle export active requests
  const handleExportActiveRequests = async () => {
    try {
      setLoading(true);

      // Prepare params from current search/filter/sort state
      const params = {
        searchTerm: activeRequestsTable.searchTerm,
        ...activeRequestsTable.activeFilters, // partner, frequency arrays
        sortBy: activeRequestsTable.sortBy,
        sortOrder: activeRequestsTable.sortOrder,
      };

      // Call export service
      const blob = await refurbishmentService.exportActiveRequests(params);

      // Create download link
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

  // Handle export past requests
  const handleExportPastRequests = async () => {
    try {
      setLoading(true);

      // Prepare params from current search/filter/sort state
      const params = {
        searchTerm: pastRequestsTable.searchTerm,
        ...pastRequestsTable.activeFilters, // type, status, center arrays
        sortBy: pastRequestsTable.sortBy,
        sortOrder: pastRequestsTable.sortOrder,
      };

      // Call export service
      const blob = await refurbishmentService.exportPastRequests(params);

      // Create download link
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

  // Handle export eligible centers (Overview tab)
  const handleExportEligibleOverview = async () => {
    try {
      setLoading(true);

      // Prepare params from current search/filter/sort state
      const params = {
        searchTerm: eligibleTable.searchTerm,
        ...eligibleTable.activeFilters, // partner, state, region, year arrays
        sortBy: eligibleTable.sortBy,
        sortOrder: eligibleTable.sortOrder,
      };

      // Call export service
      const blob = await refurbishmentService.exportEligibleCenters(params);

      // Create download link
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

  // Handle export last refurbished centers (Overview tab)
  const handleExportLastRefurbishedOverview = async () => {
    try {
      setLoading(true);

      // Prepare params from current search/filter/sort state
      const params = {
        searchTerm: lastRefurbishedTable.searchTerm,
        ...lastRefurbishedTable.activeFilters, // partner, state, region, year arrays
        sortBy: lastRefurbishedTable.sortBy,
        sortOrder: lastRefurbishedTable.sortOrder,
      };

      // Call export service (reusing eligible centers endpoint)
      const blob = await refurbishmentService.exportEligibleCenters(params);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `last-refurbished-overview-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Last refurbished centers exported successfully");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export last refurbished centers");
    } finally {
      setLoading(false);
    }
  };

  // Handle export all centers (Overview tab)
  const handleExportAllCentersOverview = async () => {
    try {
      setLoading(true);

      // Prepare params from current search/filter/sort state
      const params = {
        searchTerm: allCentersTable.searchTerm,
        ...allCentersTable.activeFilters, // partner, state, region, status, year arrays
        sortBy: allCentersTable.sortBy,
        sortOrder: allCentersTable.sortOrder,
      };

      // Call export service (reusing eligible centers endpoint)
      const blob = await refurbishmentService.exportEligibleCenters(params);

      // Create download link
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

  // Handle create request
  const handleCreateRequest = async (e) => {
    e.preventDefault();

    // Validation
    if (!createFormData.partnerId || !createFormData.centerId) {
      toast.error("Please select partner and center");
      return;
    }
    if (!createFormData.reason.trim()) {
      toast.error("Please enter a reason");
      return;
    }
    if (createFormData.packages.length === 0) {
      toast.error("Please select at least one package");
      return;
    }

    try {
      // Transform packages array from simple IDs to backend format
      const transformedData = {
        ...createFormData,
        packages: createFormData.packages.map((packageId) => ({
          packageId,
          quantity: 1, // Default quantity
          notes: null,
        })),
      };

      const response =
        await refurbishmentService.createRequest(transformedData);
      if (response.success) {
        toast.success("Request created successfully!");
        setShowCreateModal(false);
        // Reset form
        setCreateFormData({
          partnerId: "",
          centerId: "",
          reason: "",
          description: "",
          packages: [],
        });
        // Reload active requests
        refurbishmentRefresh.activeRequests();
        // Switch to requests tab
        setActiveTab("requests");
      }
    } catch (error) {
      console.error("Error creating request:", error);
      toast.error("Failed to create request");
    }
  };

  // Handle package selection for create modal (simple ID array)
  const handleCreatePackagesChange = useCallback((packageIds) => {
    setCreateFormData((prev) => ({
      ...prev,
      packages: packageIds,
    }));
  }, []);

  // Extract filter options from allCentersData
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

  // Extract filter options from eligibleCenters
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

  // Extract filter options from lastRefurbishedData
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

  // Extract filter options for Eligibility tab
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

  // Extract filter options for Alerts tab
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

  // Extract filter options for Requests tab
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

  // Extract filter options for Past Requests tab
  useEffect(() => {
    if (Array.isArray(pastRequests) && pastRequests.length > 0) {
      const uniqueTypes = [
        ...new Set(
          pastRequests
            .map((r) => r.refurbishment_type || r.type || "Standard")
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
          { value: "Resolved", label: "Resolved" },
        ],
        centers: uniqueCenters.sort().map((c) => ({ value: c, label: c })),
        financialYears: FY_OPTIONS,
      });
    }
  }, [pastRequests]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

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
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Refurbishment</h1>
          <p className="text-gray-600 mt-1">
            Central hub for all updates, alerts, and requests.
          </p>
        </div>

        {/* Tabs - 5 tabs */}
        {/* Tab Navigation */}
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
              onClick={() => setActiveTab("eligibility")}
              className={`
                px-6 py-3 text-sm font-medium transition-colors duration-200
                border-b-2 whitespace-nowrap
                ${
                  activeTab === "eligibility"
                    ? "border-green-600 text-green-600"
                    : "border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300"
                }
              `}
            >
              Eligibility
            </button>
            <button
              onClick={() => setActiveTab("alerts")}
              className={`
                px-6 py-3 text-sm font-medium transition-colors duration-200
                border-b-2 whitespace-nowrap relative
                ${
                  activeTab === "alerts"
                    ? "border-green-600 text-green-600"
                    : "border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300"
                }
              `}
            >
              Alerts
              {alertsUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                  {alertsUnreadCount}
                </span>
              )}
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
              onClick={() => setActiveTab("past-requests")}
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
              Past Requests
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
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <OverviewTab
            selectedCard={selectedOverviewCard}
            onCardClick={setSelectedOverviewCard}
            eligibleCount={eligibleCenters.length}
            lastRefurbishedCount={lastRefurbishedData.length}
            allCentersCount={allCentersData.length}
            loading={loading}
            eligibleTable={eligibleTable}
            eligibleFilterOptions={eligibleFilterOptions}
            onCreateRequestEligible={(center) => {
              // Pre-select all packages to avoid timing issues
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
            onCreateRequestLastRefurbished={(center) => {
              // Pre-select all packages to avoid timing issues
              const allPackageIds = packages.map((pkg) => pkg.id);
              setCreateFormData({
                ...createFormData,
                centerId: center.id,
                partnerId: center.partner_id,
                packages: allPackageIds,
              });
              setShowCreateModal(true);
            }}
            onExportLastRefurbished={handleExportLastRefurbishedOverview}
            allCentersTable={allCentersTable}
            allCentersFilterOptions={allCentersFilterOptions}
            onNotifyAllCenters={handleNotifyPartner}
            onExportAllCenters={handleExportAllCentersOverview}
          />
        )}

        {activeTab === "eligibility" && (
          <EligibilityTab
            table={eligibilityTabTable}
            loading={loading}
            formatDate={formatDate}
            filterOptions={eligibilityTabFilterOptions}
            onNotifyPartner={handleNotifyPartner}
            onExport={handleExportEligible}
          />
        )}

        {activeTab === "alerts" && (
          <AlertsTab
            table={alertsTable}
            loading={_refurbishmentLoading.alerts}
            formatDate={formatDate}
            filterOptions={alertsFilterOptions}
            onRefresh={() => {
              refurbishmentRefresh.all(); // Refresh all data
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
            onCreateManualRequest={handleCreateManualRequest}
            selectedYear={selectedYear}
            onYearChange={(year) => setSelectedYear(year)}
          />
        )}

        {activeTab === "past-requests" && (
          <PastRequestsTab
            table={pastRequestsTable}
            loading={loading}
            selectedYear={selectedYear}
            onYearChange={(year) => setSelectedYear(year)}
            formatDate={formatDate}
            filterOptions={pastRequestsFilterOptions}
            onViewRequest={(request) => {
              setPastReviewRequestId(request.id || request.request_id);
              setPastReviewOpen(true);
            }}
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

        {/* Create Request Modal */}
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

        {/* Notification Type Selector (Instant vs Schedule) */}
        <NotificationTypeSelector
          isOpen={showTypeSelectorModal}
          onClose={() => {
            setShowTypeSelectorModal(false);
            setPendingNotifyItem(null);
          }}
          onSelectInstant={handleSelectInstant}
          onSelectSchedule={handleSelectSchedule}
        />

        {/* Schedule Notification Modal - self-contained, seeded once on open */}
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

        {/* Past Requests — View Modal */}
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

        {/* Past Requests — Status Change Modal */}
        {statusChangeRequest && (
          <AdminStatusChangeModal
            request={statusChangeRequest}
            onClose={() => setStatusChangeRequest(null)}
            onSuccess={() => {
              setStatusChangeRequest(null);
              refurbishmentRefresh.all();
            }}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default RefurbishmentDashboard;
