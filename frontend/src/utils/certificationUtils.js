import { ROUTES } from "../constants/routes";

export const CERTIFICATION_REQUEST_JOURNEY_STEPS = [
  {
    key: "received",
    short: "Request Received",
  },
  {
    key: "accepted",
    short: "Request Accepted by Admin & Sent to ESSCI",
  },
  {
    key: "uploaded",
    short: "Certificate Uploaded by ESSCI",
  },
];

export function getCertificationSubmittedByLabel(details) {
  const role = String(details?.uploaded_by_role || "").toUpperCase();
  if (role === "ADMIN" || role === "SUPER_ADMIN") return "Admin";
  if (role === "PARTNER") return "Partner";
  if (details?.uploaded_by_name) return details.uploaded_by_name;
  return "—";
}

export function hasDownloadableCertificationFiles(details) {
  const pdf = details?.pdf;
  if (!pdf) return false;
  const archivedCerts = (pdf.archived_files || []).filter(
    (file) => file.file_type === "certificate",
  );
  if (archivedCerts.length > 0) return true;
  if (Array.isArray(pdf.certification_files) && pdf.certification_files.length > 0) {
    return true;
  }
  return Boolean(pdf.zip_file_url);
}

export const CERTIFICATION_ESSCI_WORKFLOW_STEPS = [
  {
    key: "certificates",
    step: 1,
    label: "Assessment & Certificates",
    shortLabel: "Certificates",
    description:
      "Confirm the assessment date, enter assessment numbers, upload certificate files (ZIP/PDF), and upload the student result Excel sheet.",
  },
];

export function getCertificationWorkflowIndex(details) {
  if (!details) return 0;
  if (details.status !== "approved") return 0;
  const pdf = details.pdf;
  if (pdf?.status === "approved") return 0;
  return 0;
}

export function isCertificationWorkflowComplete(details) {
  return details?.pdf?.status === "approved";
}

// Certification uploads require admin approval before ESSCI processing.
export const CERTIFICATION_DERIVED_STATUS_OPTIONS = [
  { value: "Pending Admin Review", label: "Pending Admin Review" },
  { value: "Rejected", label: "Rejected" },
  { value: "Ongoing", label: "Ongoing" },
  { value: "Under review", label: "Under review" },
  { value: "Done", label: "Done" },
];

export const CERTIFICATION_DERIVED_STATUS_STYLES = {
  "Pending Admin Review":
    "bg-orange-100 text-orange-800 border border-orange-200",
  Rejected: "bg-red-100 text-red-800 border border-red-200",
  Ongoing: "bg-blue-100 text-blue-800 border border-blue-200",
  "Under review": "bg-yellow-100 text-yellow-800 border border-yellow-200",
  Done: "bg-green-100 text-green-800 border border-green-200",
};

export function getCertificationDerivedStatusLabel(row) {
  return row?.derived_status || "Ongoing";
}

export function getCertificationStatusBadgeClass(row) {
  const label = getCertificationDerivedStatusLabel(row);
  return (
    CERTIFICATION_DERIVED_STATUS_STYLES[label] ||
    "bg-gray-100 text-gray-700 border border-gray-200"
  );
}

export function formatCertificationRequestId(row, index = 0) {
  const year = row?.created_at
    ? new Date(row.created_at).getFullYear()
    : new Date().getFullYear();
  const sequence = String((index ?? 0) + 1).padStart(3, "0");
  return `CERT-${year}-${sequence}`;
}

export function formatCertificationDate(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

/** Normalize API/DB date values to YYYY-MM-DD for date inputs. */
export function toCertificationDateInput(value) {
  if (!value) return "";
  const str = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  const parsed = new Date(str);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

/**
 * Resolve navigation target for certification-related notifications.
 * @returns {{ path: string, state?: object } | null}
 */
export function getCertificationNotificationNavigation(notification, userRole) {
  if (!notification) return null;

  const type = notification.type || notification.notification_type;
  const entityType = notification.related_entity_type;
  const uploadId = notification.related_entity_id;

  const isCertification =
    entityType === "certification_upload" ||
    entityType === "certification_pdf" ||
    type === "certification_upload" ||
    type === "certification_submitted" ||
    type === "certification_approved" ||
    type === "certification_rejected" ||
    type === "certification_pdf_uploaded" ||
    type === "certification_essci_step1" ||
    type === "certificate_ready" ||
    type === "certificate_pdf_rejected";

  if (!isCertification) return null;

  if (userRole === "ESSCI") {
    const path = uploadId
      ? `${ROUTES.REQUESTS}?uploadId=${encodeURIComponent(uploadId)}`
      : ROUTES.REQUESTS;
    return { path };
  }

  if (userRole === "PARTNER") {
    if (type === "certification_rejected" && uploadId) {
      return {
        path: `${ROUTES.UPLOAD_DATA}?tab=certification&certResubmit=${encodeURIComponent(uploadId)}`,
      };
    }
    const path = uploadId
      ? `${ROUTES.PARTNER_CERTIFICATES}?uploadId=${encodeURIComponent(uploadId)}`
      : ROUTES.PARTNER_CERTIFICATES;
    return { path };
  }

  if (userRole === "ADMIN" || userRole === "SUPER_ADMIN") {
    const path = uploadId
      ? `${ROUTES.ADMIN_CERTIFICATES}?uploadId=${encodeURIComponent(uploadId)}`
      : ROUTES.ADMIN_CERTIFICATES;
    return { path };
  }

  return null;
}
