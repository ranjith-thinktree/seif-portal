// Application Routes
export const ROUTES = {
  // Public Routes
  LOGIN: "/login",

  // Protected Routes
  DASHBOARD: "/dashboard",
  PROFILE: "/profile",

  // Admin Routes
  USERS: "/users",
  PARTNERS: "/data/partners",
  PARTNER_CENTERS: "/data/partners/:partnerId/centers",
  CENTER_STUDENTS: "/data/centers/:centerId/students",
  CENTER_DETAILS: "/data/centers/:id",
  DATA_UPLOADS: "/data-uploads",
  REQUESTS: "/requests",
  INBOX: "/inbox",
  DATABASE_MANAGEMENT: "/admin/database-management",
  REVIEW: "/review/:id",
  REVIEW_UPLOAD: "/review-centers/:uploadId",
  REVIEW_STUDENTS: "/review-centers/:uploadId/students/:centerId",
  REJECTED_UPLOAD: "/rejected/:uploadId",

  // Partner Routes
  MY_CENTERS: "/my-centers",
  MY_DATA: "/my-data",
  MY_REQUESTS: "/my-requests",
  UPLOAD_DATA: "/upload",
  UPLOAD_HISTORY: "/upload/history",
  PARTNER_REVIEW_EDIT: "/my-data/review/:uploadId",
  PARTNER_REJECTED_UPLOADS: "/partner/rejected-uploads",
  PARTNER_REJECTED_CENTERS: "/partner/uploads/:uploadId/centers",
  PARTNER_REVIEW_STUDENTS:
    "/partner/uploads/:uploadId/centers/:centerId/students",

  // SEIF/ESSCI Routes
  REPORTS: "/reports",
  ANALYTICS: "/analytics",
  DOWNLOADS: "/downloads",

  // Common Routes
  NOTIFICATIONS: "/notifications",
  SETTINGS: "/settings",

  // Error Routes
  NOT_FOUND: "/404",
  UNAUTHORIZED: "/401",
};
