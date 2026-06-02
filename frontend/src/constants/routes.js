// Application Routes
export const ROUTES = {
  // Public Routes
  LOGIN: "/login",

  // Protected Routes
  DASHBOARD: "/dashboard",
  PROFILE: "/profile",
  CHANGE_PASSWORD: "/change-password",

  // Admin Routes
  USERS: "/users",
  USER_MANAGEMENT: "/user-management",
  ORGANIZATION_MANAGEMENT: "/organization-management",
  COURSES_MANAGEMENT: "/courses-management",
  ORGANIZATION_PARTNERS: "/organization/partners",
  ORGANIZATION_CENTERS: "/organization/centers",
  DATA_MANAGEMENT: "/data-management",
  PARTNERS: "/data/partners",
  PARTNER_CENTERS: "/data/partners/:partnerId/centers",
  CENTER_STUDENTS: "/data/centers/:centerId/students",
  BATCH_STUDENTS: "/data/batches/:batchId/students",
  CENTER_DETAILS: "/data/centers/:id",
  DATA_UPLOADS: "/data-uploads",
  REQUESTS: "/requests",
  INBOX: "/inbox",
  DATABASE_MANAGEMENT: "/admin/database-management",
  ADMIN_TERMINAL: "/admin/terminal",
  REFURBISHMENT: "/admin/refurbishment",
  REVIEW: "/review/:id",
  REVIEW_UPLOAD: "/review-centers/:uploadId",
  REVIEW_STUDENTS: "/review-centers/:uploadId/students/:centerId",
  REVIEW_PENDING_CENTERS: "/review/pending-centers",
  REJECTED_UPLOAD: "/rejected/:uploadId",
  REVIEW_TOT_UPLOAD: "/review/tot-uploads/:uploadId",

  // Partner Routes
  MY_CENTERS: "/my-centers",
  MY_DATA: "/my-data",
  MY_REQUESTS: "/my-requests",
  PARTNER_ORGANIZATION_MANAGEMENT: "/partner/organization-management",
  UPLOAD_DATA: "/upload",
  UPLOAD_HISTORY: "/upload/history",
  EMPLOYMENT_UPLOAD: "/employment/upload",
  EMPLOYMENT_REVIEW: "/admin/employment/review",
  EMPLOYMENT_REVIEW_CENTERS: "/admin/employment/review/:uploadId",
  EMPLOYMENT_REVIEW_RECORDS:
    "/admin/employment/review/:uploadId/centers/:centerId",
  PARTNER_REVIEW_EDIT: "/my-data/review/:uploadId",
  PARTNER_REJECTED_UPLOADS: "/partner/rejected-uploads",
  PARTNER_REJECTED_CENTERS: "/partner/uploads/:uploadId/centers",
  PARTNER_REVIEW_STUDENTS:
    "/partner/uploads/:uploadId/centers/:centerId/students",

  // Partner: Employment Edit & Resubmit
  PARTNER_REJECTED_EMPLOYMENT_UPLOADS: "/partner/employment/rejected-uploads",
  PARTNER_REJECTED_EMPLOYMENT_CENTERS:
    "/partner/employment/uploads/:uploadId/centers",
  PARTNER_REVIEW_EMPLOYMENT:
    "/partner/employment/uploads/:uploadId/centers/:centerId/records",

  // SEIF/ESSCI Routes
  REPORTS: "/reports",
  ANALYTICS: "/analytics",
  DOWNLOADS: "/downloads",
  ESSCI_DATA: "/essci/data",
  ESSCI_DATA_DETAIL: "/essci/data/:uploadId",
  ESSCI_UPLOAD: "/essci/upload",

  // Partner Certification Routes
  PARTNER_CERTIFICATES: "/certificates",

  // Common Routes
  NOTIFICATIONS: "/notifications",
  SETTINGS: "/settings",
  HELP: "/help",

  // Error Routes
  NOT_FOUND: "/404",
  UNAUTHORIZED: "/401",
};
