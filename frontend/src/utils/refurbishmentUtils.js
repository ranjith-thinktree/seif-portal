/**
 * Legacy SQL fallback values (lowercase) — map to admin-facing labels.
 */
const LEGACY_REQUEST_TYPE_LABELS = {
  "instant request": "Instant Request",
  "schedule request": "Scheduled Request",
};

/**
 * Returns the request_type for display in the Requests / Past Requests tables.
 */
export const getDisplayRequestType = (record) => {
  const value = record?.request_type?.trim();
  if (value) {
    const legacyLabel = LEGACY_REQUEST_TYPE_LABELS[value.toLowerCase()];
    if (legacyLabel) return legacyLabel;
    return value;
  }

  // Notifications created before request_type was stored
  if (record?.frequency === "instant") {
    return REQUEST_TYPE_LABELS.INSTANT;
  }
  if (record?.frequency) {
    return REQUEST_TYPE_LABELS.SCHEDULED;
  }

  return null;
};

export const getFinancialYear = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  const month = date.getMonth();
  const year = date.getFullYear();

  if (month >= 3) {
    return `${year}-${(year + 1).toString().slice(2)}`;
  }

  return `${year - 1}-${year.toString().slice(2)}`;
};

/** Calendar year from a date string, for overview Year filters */
export const getCalendarYear = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  return date.getFullYear();
};

export const matchesCalendarYearFilter = (dateString, yearFilter) => {
  if (!yearFilter) return true;
  const selectedYear = parseInt(String(yearFilter), 10);
  if (Number.isNaN(selectedYear)) return true;
  const itemYear = getCalendarYear(dateString);
  return itemYear === selectedYear;
};

export const matchesEstablishmentYearFilter = (establishmentYear, yearFilter) => {
  if (!yearFilter) return true;
  const selectedYear = parseInt(String(yearFilter), 10);
  if (Number.isNaN(selectedYear)) return true;
  const itemYear = parseInt(String(establishmentYear), 10);
  if (Number.isNaN(itemYear)) return false;
  return itemYear === selectedYear;
};

export const getCenterPartnerName = (center) =>
  center?.partner_name || center?.organization_name || "";

export const getCenterNotificationDate = (center) =>
  center?.last_notified_at || center?.last_notified_date || null;

/** Month difference aligned with backend TIMESTAMPDIFF(MONTH, ...). */
export const monthsBetweenDates = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return (
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth())
  );
};

const DEFAULT_ELIGIBILITY_CYCLE = {
  firstCycleYears: 5,
  repeatCycleYears: 3,
};

/**
 * Whether a center was eligible during a calendar year (evaluated at year-end),
 * using the same establishment + repeat refurbishment cycle as the backend.
 */
export const wasCenterEligibleDuringYear = (
  center,
  yearFilter,
  cycleSettings = DEFAULT_ELIGIBILITY_CYCLE,
) => {
  if (!yearFilter || center?.year_of_establishment == null) return false;

  const selectedYear = parseInt(String(yearFilter), 10);
  if (Number.isNaN(selectedYear)) return false;

  const firstCycleYears =
    cycleSettings.firstCycleYears ?? DEFAULT_ELIGIBILITY_CYCLE.firstCycleYears;
  const repeatCycleYears =
    cycleSettings.repeatCycleYears ?? DEFAULT_ELIGIBILITY_CYCLE.repeatCycleYears;

  const yearEnd = new Date(selectedYear, 11, 31);
  const establishmentYear = parseInt(String(center.year_of_establishment), 10);
  if (Number.isNaN(establishmentYear)) return false;

  const estDate = new Date(establishmentYear, 0, 1);
  if (estDate > yearEnd) return false;

  const firstCycleMonths = firstCycleYears * 12;
  const repeatCycleMonths = repeatCycleYears * 12;

  let effectiveRefurbDate = null;
  if (center.last_refurbishment_date) {
    const refurbDate = new Date(center.last_refurbishment_date);
    if (!Number.isNaN(refurbDate.getTime()) && refurbDate <= yearEnd) {
      effectiveRefurbDate = refurbDate;
    }
  }

  if (effectiveRefurbDate) {
    return (
      monthsBetweenDates(effectiveRefurbDate, yearEnd) >= repeatCycleMonths
    );
  }

  return monthsBetweenDates(estDate, yearEnd) >= firstCycleMonths;
};

/** @deprecated Use wasCenterEligibleDuringYear for eligible overview year filter. */
export const matchesEligibleCenterYearFilter = (center, yearFilter) => {
  if (!yearFilter) return true;
  const currentYear = new Date().getFullYear();
  const selectedYear = parseInt(String(yearFilter), 10);
  if (selectedYear === currentYear) return center?.is_eligible === 1;
  return wasCenterEligibleDuringYear(center, yearFilter);
};

/** All-centers overview: year matches establishment or last refurbishment. */
export const matchesAllCentersYearFilter = (center, yearFilter) => {
  if (!yearFilter) return true;
  if (
    matchesEstablishmentYearFilter(center?.year_of_establishment, yearFilter)
  ) {
    return true;
  }
  return matchesCalendarYearFilter(center?.last_refurbishment_date, yearFilter);
};

/** Rolling calendar-year options for overview table filters */
export const getYearFilterOptions = (yearsBack = 6) => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: yearsBack }, (_, index) => {
    const year = String(currentYear - index);
    return { value: year, label: year };
  });
};

/** Shared last-refurbished overview table filtering (used by useOverviewTab). */
export const filterOverviewLastRefurbishedCenters = (items, filters = {}) => {
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

  if (filters.recency) {
    const now = new Date();
    filtered = filtered.filter((c) => {
      if (!c.last_refurbishment_date) return false;
      const refurbDate = new Date(c.last_refurbishment_date);
      const monthsDiff = Math.floor(
        (now - refurbDate) / (1000 * 60 * 60 * 24 * 30),
      );

      if (filters.recency === "last-6-months") return monthsDiff <= 6;
      if (filters.recency === "6-12-months")
        return monthsDiff > 6 && monthsDiff <= 12;
      if (filters.recency === "over-1-year") return monthsDiff > 12;
      return true;
    });
  }

  if (filters.financialYear) {
    filtered = filtered.filter(
      (c) => c.financial_year === filters.financialYear,
    );
  }

  if (filters.year) {
    filtered = filtered.filter((c) =>
      matchesCalendarYearFilter(c.last_refurbishment_date, filters.year),
    );
  }

  return filtered;
};

/** Shared eligible-centers overview table filtering (used by useOverviewTab). */
export const filterOverviewEligibleCenters = (
  items,
  filters = {},
  cycleSettings = DEFAULT_ELIGIBILITY_CYCLE,
) => {
  if (!Array.isArray(items)) return [];
  let filtered = [...items];

  const currentYear = new Date().getFullYear();

  if (!filters.year) {
    filtered = filtered.filter((c) => c.is_eligible === 1);
  } else {
    const selectedYear = parseInt(String(filters.year), 10);
    if (selectedYear === currentYear) {
      filtered = filtered.filter((c) => c.is_eligible === 1);
    } else {
      filtered = filtered.filter((c) =>
        wasCenterEligibleDuringYear(c, filters.year, cycleSettings),
      );
    }
  }

  if (filters.partner?.length > 0) {
    filtered = filtered.filter((c) =>
      filters.partner.includes(getCenterPartnerName(c)),
    );
  }

  if (filters.state?.length > 0) {
    filtered = filtered.filter((c) => filters.state.includes(c.state));
  }

  if (filters.region?.length > 0) {
    filtered = filtered.filter((c) => filters.region.includes(c.region));
  }

  if (filters.lastNotified) {
    const now = new Date();
    filtered = filtered.filter((c) => {
      const notifiedAt = getCenterNotificationDate(c);
      if (!notifiedAt) return false;
      const notifiedDate = new Date(notifiedAt);
      const daysDiff = Math.floor(
        (now - notifiedDate) / (1000 * 60 * 60 * 24),
      );

      if (filters.lastNotified === "last-7-days") return daysDiff <= 7;
      if (filters.lastNotified === "last-30-days") return daysDiff <= 30;
      if (filters.lastNotified === "over-30-days") return daysDiff > 30;
      return true;
    });
  }

  if (filters.financialYear) {
    filtered = filtered.filter(
      (c) => c.financial_year === filters.financialYear,
    );
  }

  return filtered;
};

/** Shared all-centers overview table filtering (used by useOverviewTab). */
export const filterOverviewAllCenters = (items, filters = {}) => {
  if (!Array.isArray(items)) return [];
  let filtered = [...items];

  if (filters.status?.length > 0) {
    filtered = filtered.filter((c) => {
      const eligibilityLabel =
        c.is_eligible === 1 ? "Eligible" : "Not Eligible";
      return filters.status.includes(eligibilityLabel);
    });
  }

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
      filters.partner.includes(getCenterPartnerName(c)),
    );
  }

  if (filters.state?.length > 0) {
    filtered = filtered.filter((c) => filters.state.includes(c.state));
  }

  if (filters.region?.length > 0) {
    filtered = filtered.filter((c) => filters.region.includes(c.region));
  }

  if (filters.financialYear) {
    filtered = filtered.filter(
      (c) => c.financial_year === filters.financialYear,
    );
  }

  if (filters.year) {
    filtered = filtered.filter((c) =>
      matchesAllCentersYearFilter(c, filters.year),
    );
  }

  return filtered;
};

export const formatRefurbishmentDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/** Calendar months and remaining days between a refurbishment date and today. */
export const getTimeSinceRefurbishment = (dateString) => {
  if (!dateString) return null;

  const start = new Date(dateString);
  if (Number.isNaN(start.getTime())) return null;

  const end = new Date();
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  let months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    days += new Date(end.getFullYear(), end.getMonth(), 0).getDate();
  }

  return { months, days };
};

/** e.g. "2 months 15 days", "1 month", "5 days" */
export const formatTimeSinceRefurbishment = (
  dateString,
  fallbackMonths = null,
) => {
  const parts = getTimeSinceRefurbishment(dateString);
  if (parts) {
    const { months, days } = parts;
    const monthPart =
      months > 0 ? `${months} month${months === 1 ? "" : "s"}` : "";
    const dayPart = days > 0 ? `${days} day${days === 1 ? "" : "s"}` : "";

    if (monthPart && dayPart) return `${monthPart} ${dayPart}`;
    if (monthPart) return monthPart;
    if (dayPart) return dayPart;
    return "0 days";
  }

  if (fallbackMonths === null || fallbackMonths === undefined) return "-";
  return `${fallbackMonths} month${fallbackMonths === 1 ? "" : "s"}`;
};

/** Labels stored in request_type when admin creates a request. */
export const REQUEST_TYPE_LABELS = {
  INSTANT: "Instant Request",
  SCHEDULED: "Scheduled Request",
};

/** Human-readable refurbishment lifecycle status labels. */
export const REFURBISHMENT_STATUS_LABELS = {
  submitted: "Submitted",
  sent_back: "Sent Back",
  approved: "Approved",
  material_procurement: "Material Procurement Completed",
  installation_in_progress: "Installation In Progress",
  refurbishment_started: "In Progress",
  completed: "Completed",
  rejected: "Rejected",
  acknowledgement_pending: "Acknowledgement Pending",
  ready_to_complete: "Ready to Complete",
};

/** Badge styles for admin past-requests table. */
export const REFURBISHMENT_STATUS_BADGE_CLASSES = {
  submitted: "bg-blue-100 border border-blue-400 text-blue-800",
  sent_back: "bg-amber-100 border border-amber-500 text-amber-900",
  approved: "bg-green-100 border border-green-500 text-green-800",
  material_procurement: "bg-teal-100 border border-teal-500 text-teal-900",
  installation_in_progress: "bg-purple-100 border border-purple-500 text-purple-900",
  refurbishment_started: "bg-yellow-100 border border-yellow-500 text-yellow-900",
  completed: "bg-green-100 border border-green-600 text-green-800",
  rejected: "bg-red-100 border border-red-400 text-red-800",
  acknowledgement_pending: "bg-purple-100 border border-purple-400 text-purple-900",
  ready_to_complete: "bg-emerald-100 border border-emerald-500 text-emerald-900",
};

export const getRefurbishmentDisplayStatus = (request = {}) => {
  if (request.display_status && request.display_status_label) {
    return {
      key: request.display_status,
      label: request.display_status_label,
      badgeKey: request.display_status,
    };
  }

  if (request.status === "completed") {
    return { key: "completed", label: REFURBISHMENT_STATUS_LABELS.completed, badgeKey: "completed" };
  }
  if (request.status === "rejected") {
    return { key: "rejected", label: REFURBISHMENT_STATUS_LABELS.rejected, badgeKey: "rejected" };
  }
  if (request.partner_completed_at) {
    return {
      key: "ready_to_complete",
      label: REFURBISHMENT_STATUS_LABELS.ready_to_complete,
      badgeKey: "ready_to_complete",
    };
  }
  if (request.completion_notified_at) {
    return {
      key: "acknowledgement_pending",
      label: REFURBISHMENT_STATUS_LABELS.acknowledgement_pending,
      badgeKey: "acknowledgement_pending",
    };
  }

  const status = request.status;
  return {
    key: status,
    label: REFURBISHMENT_STATUS_LABELS[status] || status,
    badgeKey: status,
  };
};

/** Partner-facing status labels (e.g. Completion Pending after acknowledgment). */
export const PARTNER_REFURBISHMENT_STATUS_LABELS = {
  ...REFURBISHMENT_STATUS_LABELS,
  acknowledgement_pending: "Acknowledgement Pending",
  completion_pending: "Completion Pending",
};

/**
 * Resolve partner-visible status for list/detail views.
 * Overrides raw workflow status when acknowledgment is due or submitted.
 */
export const getPartnerRefurbishmentDisplayStatus = (request = {}) => {
  if (request.status === "completed") {
    return {
      key: "completed",
      label: PARTNER_REFURBISHMENT_STATUS_LABELS.completed,
      badgeKey: "completed",
    };
  }
  if (request.status === "rejected") {
    return {
      key: "rejected",
      label: PARTNER_REFURBISHMENT_STATUS_LABELS.rejected,
      badgeKey: "rejected",
    };
  }
  if (request.partner_completed_at) {
    return {
      key: "completion_pending",
      label: PARTNER_REFURBISHMENT_STATUS_LABELS.completion_pending,
      badgeKey: "completion_pending",
    };
  }
  if (request.completion_notified_at) {
    return {
      key: "acknowledgement_pending",
      label: PARTNER_REFURBISHMENT_STATUS_LABELS.acknowledgement_pending,
      badgeKey: "acknowledgement_pending",
    };
  }

  const status = request.status;
  return {
    key: status,
    label:
      PARTNER_REFURBISHMENT_STATUS_LABELS[status] ||
      REFURBISHMENT_STATUS_LABELS[status] ||
      status,
    badgeKey: status,
  };
};

export const getRefurbishmentStatusLabel = (statusOrRequest) => {
  if (statusOrRequest && typeof statusOrRequest === "object") {
    return getRefurbishmentDisplayStatus(statusOrRequest).label;
  }
  return (
    REFURBISHMENT_STATUS_LABELS[statusOrRequest] ||
    (statusOrRequest ? String(statusOrRequest).replace(/_/g, " ") : "Unknown")
  );
};

export const getRefurbishmentStatusBadgeClass = (statusOrRequest) => {
  if (statusOrRequest && typeof statusOrRequest === "object") {
    return (
      REFURBISHMENT_STATUS_BADGE_CLASSES[
        getRefurbishmentDisplayStatus(statusOrRequest).badgeKey
      ] || "border border-gray-300 text-gray-500 bg-white"
    );
  }
  return (
    REFURBISHMENT_STATUS_BADGE_CLASSES[statusOrRequest] ||
    "border border-gray-300 text-gray-500 bg-white"
  );
};

export const buildPartnerAcknowledgmentConsentText = (includeUpgradation = false) => {
  const upgradationClause = includeUpgradation
    ? " and all upgradation work requested as part of this application"
    : "";
  return (
    `I hereby acknowledge that all refurbishment work${upgradationClause} for this center ` +
    "has been completed as per the approved scope, and the information and documents I am " +
    "submitting are true and accurate."
  );
};

export const REFURBISHMENT_PAST_REQUEST_STATUSES = [
  ...Object.entries(REFURBISHMENT_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
];

/** DB column mapping for admin workflow status completion dates. */
export const REFURBISHMENT_STATUS_DATE_FIELDS = {
  approved: "approved_at",
  material_procurement: "material_procurement_at",
  installation_in_progress: "installation_in_progress_at",
  completed: "completed_at",
};

export const toDateInputValue = (value) => {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
};

export const todayDateInputValue = () =>
  new Date().toISOString().split("T")[0];

/** Admin post-approval workflow steps shown in status update modal. */
export const REFURBISHMENT_WORKFLOW_STEPS = [
  {
    key: "approved",
    step: 1,
    label: "Approved",
    description: "Admin approved the partner's refurbishment request.",
  },
  {
    key: "material_procurement",
    step: 2,
    label: "Material Procurement Completed",
    description: "Materials required for refurbishment are being procured.",
  },
  {
    key: "installation_in_progress",
    step: 3,
    label: "Installation In Progress",
    description: "Installation and setup work is underway at the center.",
  },
  {
    key: "partner_acknowledgment",
    step: 4,
    label: "Partner Acknowledgement",
    pendingLabel: "Partner Acknowledgement Pending",
    description:
      "Request partner acknowledgment with statement, files, and consent before final completion.",
  },
];

export const PARTNER_ACK_STEP_IDX = REFURBISHMENT_WORKFLOW_STEPS.findIndex(
  (step) => step.key === "partner_acknowledgment",
);

export const INSTALLATION_STEP_IDX = REFURBISHMENT_WORKFLOW_STEPS.findIndex(
  (step) => step.key === "installation_in_progress",
);

export const normalizeWorkflowStatus = (status) =>
  status === "refurbishment_started" ? "installation_in_progress" : status;

/** Resolve partner upload URLs (relative paths or API host mismatches). */
export const resolvePartnerFileUrl = (fileUrl) => {
  if (!fileUrl) return "";

  const toProxiedUploadPath = (pathname, search = "", hash = "") => {
    if (!pathname.startsWith("/uploads/")) return null;
    return `${pathname}${search}${hash}`;
  };

  // Absolute URLs — prefer same-origin /uploads paths so Vite/nginx proxy serves files.
  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
    try {
      const parsed = new URL(fileUrl);
      const proxied = toProxiedUploadPath(
        parsed.pathname,
        parsed.search,
        parsed.hash,
      );
      if (proxied) return proxied;
    } catch {
      // fall through to raw URL
    }
    return fileUrl;
  }

  if (fileUrl.startsWith("/uploads/")) {
    return fileUrl;
  }

  const apiBaseUrl =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/api/v1`
      : "http://localhost:5000/api/v1");
  const backendBaseUrl =
    apiBaseUrl.replace(/\/api\/v1\/?$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:5000");

  if (!backendBaseUrl) return fileUrl;
  return `${backendBaseUrl}${fileUrl.startsWith("/") ? "" : "/"}${fileUrl}`;
};

const IMAGE_FILE_PATTERN = /\.(jpe?g|png|gif|webp|bmp|svg)(\?|#|$)/i;

/** True when a partner upload should render as an image thumbnail. */
export const isPartnerImageFile = (file) => {
  if (!file) return false;
  const mime = (file.type || file.file_mime_type || "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  const name = file.name || file.file_name || "";
  const url = file.url || file.file_url || "";
  return IMAGE_FILE_PATTERN.test(name) || IMAGE_FILE_PATTERN.test(url);
};
