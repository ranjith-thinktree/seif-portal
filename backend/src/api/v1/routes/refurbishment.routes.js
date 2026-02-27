const express = require('express');
const RefurbishmentController = require('../controllers/refurbishment.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { checkRole } = require('../../../middleware/role.middleware');
const {
  uploadPackageImages,
  uploadCompletionImages,
  handleImageUploadError,
} = require('../../../middleware/imageUpload.middleware');

const router = express.Router();

/**
 * Refurbishment Routes
 * All routes require authentication and ADMIN or SUPER_ADMIN role
 * Base path: /api/v1/admin/refurbishment
 */

// Apply authentication to all routes
router.use(authenticate);

// Apply role-based authorization (ADMIN or SUPER_ADMIN only)
router.use(checkRole(['ADMIN', 'SUPER_ADMIN']));

/**
 * GET /api/v1/admin/refurbishment/eligible-centers
 * Get centers eligible for refurbishment (Tab 1)
 * Query params: limit, offset
 */
router.get('/eligible-centers', RefurbishmentController.getEligibleCenters);

/**
 * GET /api/v1/admin/refurbishment/all-centers
 * Get all active centers with eligibility status (Tab 3)
 * Query params: limit, offset
 */
router.get('/all-centers', RefurbishmentController.getAllCentersWithStatus);

/**
 * GET /api/v1/admin/refurbishment/recently-refurbished
 * Get recently refurbished centers (Tab 2)
 * Query params: within (months), limit, offset
 */
router.get('/recently-refurbished', RefurbishmentController.getRecentlyRefurbishedCenters);

/**
 * GET /api/v1/admin/refurbishment/centers/:centerId/eligibility
 * Check eligibility of a specific center
 * Path params: centerId (UUID)
 */
router.get('/centers/:centerId/eligibility', RefurbishmentController.checkCenterEligibility);

/**
 * GET /api/v1/admin/refurbishment/dashboard
 * Get aggregated dashboard summary for all 3 tabs
 * Query params: recentlyRefurbishedWithin (months)
 */
router.get('/dashboard', RefurbishmentController.getDashboardSummary);

/**
 * GET /api/v1/admin/refurbishment/stats/year/:year
 * Get refurbishment statistics for a specific year
 * Path params: year (integer)
 */
router.get('/stats/year/:year', RefurbishmentController.getYearStats);

/**
 * GET /api/v1/admin/refurbishment/packages
 * Get all available refurbishment packages
 * Query params: courseId (optional UUID filter)
 */
router.get('/packages', RefurbishmentController.getPackages);

/**
 * GET /api/v1/admin/refurbishment/alerts
 * Get refurbishment alerts (partner responses) - Tab 3
 * Query params: limit, offset, status (read/unread)
 */
router.get('/alerts', RefurbishmentController.getAlerts);

/**
 * GET /api/v1/admin/refurbishment/requests
 * Get active refurbishment requests - Tab 4
 * Query params: limit, offset
 */
router.get('/requests', RefurbishmentController.getRequests);

/**
 * GET /api/v1/admin/refurbishment/past-requests
 * Get past refurbishment requests - Tab 5
 * Query params: limit, offset, year (optional filter)
 */
router.get('/past-requests', RefurbishmentController.getPastRequests);

/**
 * POST /api/v1/admin/refurbishment/notify
 * Send refurbishment notification to partner
 * Body: { centerId, partnerId, message (optional) }
 */
router.post('/notify', RefurbishmentController.notifyPartner);

/**
 * POST /api/v1/admin/refurbishment/create-request
 * Create new refurbishment request with packages
 * Body: { partnerId, centerId, reason, description, packages[], fileUrl, autoNotify }
 */
router.post('/create-request', RefurbishmentController.createRequest);
/**
 * POST /api/v1/admin/refurbishment/schedule-notification
 * Create scheduled refurbishment notification with auto-send
 * Body: { partnerId, centerId, scheduledAt, frequency, customDay, customTime, message, packages[], autoSend }
 */
router.post('/schedule-notification', RefurbishmentController.scheduleNotification);

/**
 * GET /api/v1/admin/refurbishment/scheduled-notifications
 * Get all scheduled notifications with filters
 * Query params: partnerId, centerId, status, autoSend, limit, offset
 */
router.get('/scheduled-notifications', RefurbishmentController.getScheduledNotifications);

/**
 * GET /api/v1/admin/refurbishment/scheduled-notifications/:id
 * Get a single scheduled notification by ID
 * Path params: id (UUID)
 */
router.get('/scheduled-notifications/:id', RefurbishmentController.getScheduledNotificationById);

/**
 * PATCH /api/v1/admin/refurbishment/scheduled-notifications/:id
 * Update scheduled notification
 * Body: { scheduledAt, frequency, customDay, customTime, message, packages, autoSend }
 */
router.patch('/scheduled-notifications/:id', RefurbishmentController.updateScheduledNotification);

/**
 * PATCH /api/v1/admin/refurbishment/scheduled-notifications/:id/toggle
 * Toggle auto-send ON/OFF
 * Body: { enabled: true/false }
 */
router.patch('/scheduled-notifications/:id/toggle', RefurbishmentController.toggleAutoSend);

/**
 * DELETE /api/v1/admin/refurbishment/scheduled-notifications/:id
 * Cancel or delete scheduled notification
 * Query params: hardDelete=true (to permanently delete)
 */
router.delete('/scheduled-notifications/:id', RefurbishmentController.cancelScheduledNotification);

/**
 * GET /api/v1/admin/refurbishment/scheduled-notifications/:id/history
 * Get execution history for a scheduled notification
 * Path params: id (UUID)
 * Query params: limit (default: 50)
 */
router.get('/scheduled-notifications/:id/history', RefurbishmentController.getExecutionHistory);

/**
 * POST /api/v1/admin/refurbishment/packages
 * Create a new refurbishment package
 * Body: { name, description, courses[], images[] }
 */
router.post(
  '/packages',
  uploadPackageImages,
  handleImageUploadError,
  RefurbishmentController.createPackage
);

/**
 * PATCH/PUT /api/v1/admin/refurbishment/packages/:id
 * Update an existing package
 * Body: { name, description, courses[], images[] }
 */
router.patch(
  '/packages/:id',
  uploadPackageImages,
  handleImageUploadError,
  RefurbishmentController.updatePackage
);
router.put(
  '/packages/:id',
  uploadPackageImages,
  handleImageUploadError,
  RefurbishmentController.updatePackage
);

/**
 * DELETE /api/v1/admin/refurbishment/packages/:id
 * Delete a package (soft delete by default)
 * Query params: hardDelete=true (to permanently delete)
 */
router.delete('/packages/:id', RefurbishmentController.deletePackage);

/* ==================== ADMIN WORKFLOW ROUTES ==================== */

/**
 * GET /api/v1/admin/refurbishment/requests/pending-review
 * Get all refurbishment requests pending admin review (for badge count)
 * Query params: status (default: 'submitted'), limit, offset
 */
router.get('/requests/pending-review', RefurbishmentController.getPendingReviewRequests);

/**
 * GET /api/v1/admin/refurbishment/requests/:id/review
 * Get refurbishment request details for admin review
 * Path params: id (refurbishment request UUID)
 */
router.get('/requests/:id/review', RefurbishmentController.getRefurbishmentRequestForReview);

/**
 * POST /api/v1/admin/refurbishment/requests/:id/admin-packages
 * Admin adds additional packages to refurbishment request
 * Path params: id (refurbishment request UUID)
 * Body: { selectedPackages: [{course_id, package_id, quantity}] }
 */
router.post('/requests/:id/admin-packages', RefurbishmentController.addAdminPackages);

/**
 * GET /api/v1/admin/refurbishment/requests/:id/upgradation-packages
 * Get available upgradation packages for a request's center (course-filtered)
 * and current admin selections
 */
router.get(
  '/requests/:id/upgradation-packages',
  RefurbishmentController.getUpgradationPackagesForRequest
);

/**
 * POST /api/v1/admin/refurbishment/requests/:id/upgradation-packages
 * Save admin's upgradation package selections for a request
 * Body: { packageIds: ["uuid1", "uuid2"], notes: { "uuid1": "note" } }
 */
router.post(
  '/requests/:id/upgradation-packages',
  RefurbishmentController.saveAdminUpgradationPackages
);

/**
 * PUT /api/v1/admin/refurbishment/requests/:id/approve
 * Admin approves refurbishment request
 * Path params: id (refurbishment request UUID)
 * Body: { adminRemarks: "Optional remarks" }
 */
router.put('/requests/:id/approve', RefurbishmentController.approveRefurbishmentRequest);

/**
 * PUT /api/v1/admin/refurbishment/requests/:id/reject
 * Admin rejects refurbishment request
 * Path params: id (refurbishment request UUID)
 * Body: { rejectionReason: "Reason for rejection (REQUIRED)" }
 */
router.put('/requests/:id/reject', RefurbishmentController.rejectRefurbishmentRequest);

/**
 * PUT /api/v1/admin/refurbishment/requests/:id/start
 * Admin starts refurbishment work
 * Path params: id (refurbishment request UUID)
 */
router.put('/requests/:id/start', RefurbishmentController.startRefurbishment);

/**
 * POST /api/v1/admin/refurbishment/requests/:id/upload-completion-images
 * Upload completion images to S3 before completing refurbishment
 * Path params: id (refurbishment request UUID)
 * Body: multipart/form-data with 'images' field (max 10 images, JPG/PNG, 5MB each)
 * Returns: Array of uploaded image URLs from S3
 */
router.post(
  '/requests/:id/upload-completion-images',
  uploadCompletionImages,
  handleImageUploadError,
  RefurbishmentController.uploadCompletionImages
);

/**
 * PUT /api/v1/admin/refurbishment/requests/:id/complete
 * Admin marks refurbishment as completed
 * Path params: id (refurbishment request UUID)
 * Body: { completion_statement: "...", completion_date: "2024-01-15", completion_images: [...] }
 */
router.put('/requests/:id/complete', RefurbishmentController.completeRefurbishment);

/**
 * PATCH /api/v1/admin/refurbishment/requests/:id/status
 * Admin advances refurbishment lifecycle status (approved→material_procurement→installation_in_progress)
 */
router.patch('/requests/:id/status', RefurbishmentController.updateStatus);

module.exports = router;
