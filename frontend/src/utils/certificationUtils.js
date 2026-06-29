import { ROUTES } from "../constants/routes";

export const CERTIFICATION_ESSCI_WORKFLOW_STEPS = [
  {
    key: "step1",
    step: 1,
    label: "Initial Response",
    shortLabel: "Initial Response",
    description:
      "Upload the QR code and share assessment link, ID, and password with the center spoke person.",
  },
  {
    key: "step2",
    step: 2,
    label: "Assessment & Certificates",
    shortLabel: "Certificates",
    description:
      "Enter student registration and assessment numbers, then upload final certification documents.",
  },
];

export function getCertificationWorkflowIndex(details) {
  if (!details) return 0;
  const pdf = details.pdf;
  if (pdf?.status === "approved") return 1;
  if (details.essci_step1_at && (!pdf || pdf.status === "rejected")) return 1;
  return 0;
}

export function isCertificationWorkflowComplete(details) {
  return details?.pdf?.status === "approved";
}

// Certification uploads are auto-approved on submit (no admin review step),
// so the only derived statuses are Ongoing → Under review → Done.
export const CERTIFICATION_DERIVED_STATUS_OPTIONS = [
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
    type === "certification_pdf_uploaded" ||
    type === "certification_essci_step1" ||
    type === "certificate_pdf_rejected";

  if (!isCertification) return null;

  if (userRole === "ESSCI") {
    const path = uploadId
      ? `${ROUTES.REQUESTS}?uploadId=${encodeURIComponent(uploadId)}`
      : ROUTES.REQUESTS;
    return { path };
  }

  if (userRole === "PARTNER") {
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
