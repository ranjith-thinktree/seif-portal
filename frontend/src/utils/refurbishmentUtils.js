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

export const formatRefurbishmentDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/** Labels stored in request_type when admin creates a request. */
export const REQUEST_TYPE_LABELS = {
  INSTANT: "Instant Request",
  SCHEDULED: "Scheduled Request",
};

/** Resolve partner upload URLs (relative paths or API host mismatches). */
export const resolvePartnerFileUrl = (fileUrl) => {
  if (!fileUrl) return "";
  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
    return fileUrl;
  }

  const apiBaseUrl =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:5000/api/v1";
  const backendBaseUrl = apiBaseUrl.replace(/\/api\/v1\/?$/, "");

  if (!backendBaseUrl) return fileUrl;
  return `${backendBaseUrl}${fileUrl.startsWith("/") ? "" : "/"}${fileUrl}`;
};
