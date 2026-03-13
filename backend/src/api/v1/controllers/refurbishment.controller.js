const RefurbishmentService = require('../services/refurbishment.service');
const ScheduledNotificationService = require('../services/scheduledNotification.service');
const ApiResponse = require('../../../utils/response.util');
const { ValidationError } = require('../../../utils/error.util');

/**
 * Refurbishment Controller
 * Handles admin dashboard endpoints for refurbishment management
 */

class RefurbishmentController {
  /**
   * GET /api/v1/admin/refurbishment/eligible-centers
   * Returns centers eligible for refurbishment (Tab 1: Eligible Centers)
   *
   * Query params:
   * - limit: number of records per page (default: 50)
   * - offset: pagination offset (default: 0)
   *
   * Response:
   * - centers: array of eligible center objects
   * - totalCount: total number of eligible centers
   * - pagination: { limit, offset, hasMore }
   */
  static async getEligibleCenters(req, res, next) {
    try {
      // Parse and validate query parameters
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      // Validate pagination parameters
      if (limit < 1 || limit > 100) {
        throw new ValidationError('Limit must be between 1 and 100');
      }
      if (offset < 0) {
        throw new ValidationError('Offset must be non-negative');
      }

      // Call service method
      const result = await RefurbishmentService.getEligibleCenters(limit, offset);

      // Add pagination metadata
      const response = {
        ...result,
        pagination: {
          limit,
          offset,
          hasMore: offset + limit < result.totalCount,
        },
      };

      return ApiResponse.success(res, response, 'Eligible centers retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/refurbishment/all-centers
   * Returns all active centers with eligibility status (Tab 3: All Centers)
   *
   * Query params:
   * - limit: number of records per page (default: 50)
   * - offset: pagination offset (default: 0)
   *
   * Response:
   * - centers: array of all center objects with eligibility status
   * - totalCount: total number of centers
   * - eligibleCount: number of eligible centers
   * - ineligibleCount: number of ineligible centers
   * - pagination: { limit, offset, hasMore }
   */
  static async getAllCentersWithStatus(req, res, next) {
    try {
      // Parse and validate query parameters
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      // Validate pagination parameters
      if (limit < 1 || limit > 100) {
        throw new ValidationError('Limit must be between 1 and 100');
      }
      if (offset < 0) {
        throw new ValidationError('Offset must be non-negative');
      }

      // Call service method
      const result = await RefurbishmentService.getAllCentersWithStatus(limit, offset);

      // Add pagination metadata
      const response = {
        ...result,
        pagination: {
          limit,
          offset,
          hasMore: offset + limit < result.totalCount,
        },
      };

      return ApiResponse.success(res, response, 'All centers retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/refurbishment/recently-refurbished
   * Returns centers refurbished within specified timeframe (Tab 2: Recently Refurbished)
   *
   * Query params:
   * - within: number of months (default: 12)
   * - limit: number of records per page (default: 50)
   * - offset: pagination offset (default: 0)
   *
   * Response:
   * - centers: array of recently refurbished center objects
   * - totalCount: total number of centers in timeframe
   * - withinMonths: timeframe parameter used
   * - pagination: { limit, offset, hasMore }
   */
  static async getRecentlyRefurbishedCenters(req, res, next) {
    try {
      // Parse and validate query parameters
      const withinMonths = parseInt(req.query.within) || 12;
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      // Validate parameters
      if (withinMonths < 1 || withinMonths > 120) {
        throw new ValidationError('Within months must be between 1 and 120 (10 years)');
      }
      if (limit < 1 || limit > 100) {
        throw new ValidationError('Limit must be between 1 and 100');
      }
      if (offset < 0) {
        throw new ValidationError('Offset must be non-negative');
      }

      // Call service method
      const result = await RefurbishmentService.getRecentlyRefurbishedCenters(
        withinMonths,
        limit,
        offset
      );

      // Add pagination metadata
      const response = {
        ...result,
        pagination: {
          limit,
          offset,
          hasMore: offset + limit < result.totalCount,
        },
      };

      return ApiResponse.success(
        res,
        response,
        `Recently refurbished centers (within ${withinMonths} months) retrieved successfully`
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/refurbishment/centers/:centerId/eligibility
   * Check eligibility status of a specific center
   *
   * Path params:
   * - centerId: UUID of the center
   *
   * Response:
   * - center: center object with eligibility details
   *   OR null if center not found
   */
  static async checkCenterEligibility(req, res, next) {
    try {
      const { centerId } = req.params;

      // Validate centerId format (UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(centerId)) {
        throw new ValidationError('Invalid center ID format. Must be a valid UUID.');
      }

      // Call service method
      const center = await RefurbishmentService.checkCenterEligibility(centerId);

      if (!center) {
        return ApiResponse.notFound(res, 'Center not found');
      }

      return ApiResponse.success(res, { center }, 'Center eligibility checked successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/refurbishment/dashboard
   * Aggregated dashboard data for all 3 tabs
   *
   * Query params:
   * - recentlyRefurbishedWithin: months for recently refurbished filter (default: 12)
   *
   * Response:
   * - eligibleCenters: { centers (top 10), totalCount }
   * - recentlyRefurbished: { centers (top 10), totalCount, withinMonths }
   * - allCentersSummary: { totalCount, eligibleCount, ineligibleCount }
   */
  static async getDashboardSummary(req, res, next) {
    try {
      const withinMonths = parseInt(req.query.recentlyRefurbishedWithin) || 12;

      // Validate parameter
      if (withinMonths < 1 || withinMonths > 120) {
        throw new ValidationError('Within months must be between 1 and 120 (10 years)');
      }

      // Fetch data for all 3 tabs (top 10 only for performance)
      const [eligible, recentlyRefurbished, allCenters] = await Promise.all([
        RefurbishmentService.getEligibleCenters(10, 0),
        RefurbishmentService.getRecentlyRefurbishedCenters(withinMonths, 10, 0),
        RefurbishmentService.getAllCentersWithStatus(10, 0),
      ]);

      const response = {
        eligibleCenters: {
          centers: eligible.centers,
          totalCount: eligible.totalCount,
        },
        recentlyRefurbished: {
          centers: recentlyRefurbished.centers,
          totalCount: recentlyRefurbished.totalCount,
          withinMonths: recentlyRefurbished.withinMonths,
        },
        allCentersSummary: {
          totalCount: allCenters.totalCount,
          eligibleCount: allCenters.eligibleCount,
          ineligibleCount: allCenters.ineligibleCount,
        },
      };

      return ApiResponse.success(res, response, 'Dashboard summary retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/refurbishment/stats/year/:year
   * Get refurbishment statistics for a specific year
   */
  static async getYearStats(req, res, next) {
    try {
      const year = parseInt(req.params.year);

      // Validation
      if (isNaN(year) || year < 2000 || year > 2100) {
        throw new ValidationError('Invalid year. Must be a valid year between 2000 and 2100.');
      }

      const result = await RefurbishmentService.getRefurbishmentStatsByYear(year);

      return ApiResponse.success(res, result, `Year ${year} statistics retrieved successfully`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/refurbishment/packages
   * Get all available refurbishment packages
   */
  static async getPackages(req, res, next) {
    try {
      const courseId = req.query.courseId || null;
      const category = req.query.category || null;

      const result = await RefurbishmentService.getRefurbishmentPackages(courseId, category);

      return ApiResponse.success(res, result, 'Packages retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/refurbishment/alerts
   * Get refurbishment alerts (partner responses)
   */
  static async getAlerts(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      const status = req.query.status || null; // 'read' or 'unread'

      if (limit < 1 || limit > 100) {
        throw new ValidationError('Limit must be between 1 and 100');
      }
      if (offset < 0) {
        throw new ValidationError('Offset must be non-negative');
      }

      const result = await RefurbishmentService.getRefurbishmentAlerts(limit, offset, status);

      const response = {
        ...result,
        pagination: {
          limit,
          offset,
          hasMore: offset + limit < result.totalCount,
        },
      };

      return ApiResponse.success(res, response, 'Alerts retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/refurbishment/requests
   * Get active refurbishment requests
   */
  static async getRequests(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      if (limit < 1 || limit > 100) {
        throw new ValidationError('Limit must be between 1 and 100');
      }
      if (offset < 0) {
        throw new ValidationError('Offset must be non-negative');
      }

      const result = await RefurbishmentService.getActiveRefurbishmentRequests(limit, offset);

      const response = {
        ...result,
        pagination: {
          limit,
          offset,
          hasMore: offset + limit < result.totalCount,
        },
      };

      return ApiResponse.success(res, response, 'Active requests retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/refurbishment/past-requests
   * Get past refurbishment requests
   */
  static async getPastRequests(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      const year = req.query.year ? parseInt(req.query.year) : null;

      if (limit < 1 || limit > 100) {
        throw new ValidationError('Limit must be between 1 and 100');
      }
      if (offset < 0) {
        throw new ValidationError('Offset must be non-negative');
      }
      if (year && (year < 2000 || year > 2100)) {
        throw new ValidationError('Invalid year');
      }

      const result = await RefurbishmentService.getPastRefurbishmentRequests(limit, offset, year);

      const response = {
        ...result,
        pagination: {
          limit,
          offset,
          hasMore: offset + limit < result.totalCount,
        },
      };

      return ApiResponse.success(res, response, 'Past requests retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/refurbishment/notify
   * Send refurbishment notification to partner
   */
  static async notifyPartner(req, res, next) {
    try {
      const { centerId, partnerId, message } = req.body;

      if (!centerId || !partnerId) {
        throw new ValidationError('centerId and partnerId are required');
      }

      const result = await RefurbishmentService.sendRefurbishmentNotification(
        centerId,
        partnerId,
        message
      );

      return ApiResponse.success(res, result, 'Notification sent successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/refurbishment/create-request
   * Create new refurbishment request with packages
   */
  static async createRequest(req, res, next) {
    try {
      const { partnerId, centerId, reason, description, packages, fileUrl, autoNotify } = req.body;

      if (!partnerId || !centerId || !reason) {
        throw new ValidationError('partnerId, centerId, and reason are required');
      }

      if (packages && !Array.isArray(packages)) {
        throw new ValidationError('packages must be an array');
      }

      const result = await RefurbishmentService.createRefurbishmentRequestWithPackages({
        partnerId,
        centerId,
        reason,
        description,
        packages,
        fileUrl,
        autoNotify,
      });

      return ApiResponse.success(res, result, 'Refurbishment request created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/refurbishment/schedule-notification
   * Create a scheduled refurbishment notification
   */
  static async scheduleNotification(req, res, next) {
    try {
      const {
        partnerId,
        centerId,
        scheduledAt,
        frequency,
        customDay,
        customTime,
        customIntervalDays,
        maxOccurrences,
        message,
        packages,
        upgradation_packages,
        autoSend,
        isManualRequest, // NEW: Accept manual request flag
      } = req.body;

      // Validation
      if (!partnerId || !centerId || !scheduledAt) {
        throw new ValidationError('partnerId, centerId, and scheduledAt are required');
      }

      if (frequency && !['instant', 'daily', 'weekly', 'monthly', 'custom'].includes(frequency)) {
        throw new ValidationError('Invalid frequency value');
      }

      // Validate custom frequency has interval days
      if (
        frequency === 'custom' &&
        (!customIntervalDays || customIntervalDays < 1 || customIntervalDays > 365)
      ) {
        throw new ValidationError(
          'customIntervalDays must be between 1 and 365 for custom frequency'
        );
      }

      // Validate max occurrences if provided
      if (maxOccurrences !== undefined && maxOccurrences !== null) {
        const maxOccurrencesInt = parseInt(maxOccurrences);
        if (isNaN(maxOccurrencesInt) || maxOccurrencesInt < 1 || maxOccurrencesInt > 100) {
          throw new ValidationError('maxOccurrences must be between 1 and 100');
        }
      }

      if (!Array.isArray(packages) || packages.length === 0) {
        throw new ValidationError('At least one package must be selected');
      }

      const effectiveAutoSend = autoSend !== undefined ? autoSend : true;
      const effectiveFrequency = frequency || 'instant';

      const result = await ScheduledNotificationService.createScheduledNotification({
        partnerId,
        centerId,
        scheduledAt,
        frequency: effectiveFrequency,
        customDay,
        customTime,
        customIntervalDays: frequency === 'custom' ? parseInt(customIntervalDays) : null,
        maxOccurrences: maxOccurrences ? parseInt(maxOccurrences) : null,
        message,
        packages,
        upgradation_packages: Array.isArray(upgradation_packages) ? upgradation_packages : [],
        autoSend: effectiveAutoSend,
        createdBy: req.user.id,
        isManualRequest: isManualRequest || false,
      });

      // For instant notifications with autoSend=true, send immediately to the partner
      // rather than waiting for the MySQL Event + cron (which may take up to 5+ minutes).
      if (effectiveAutoSend && effectiveFrequency === 'instant') {
        try {
          await RefurbishmentService.sendRefurbishmentNotification(centerId, partnerId, message);
          await ScheduledNotificationService.markImmediatelySent(result.id);
          console.log(
            `[RefurbishmentController] Instant notification sent immediately to partner ${partnerId} for center ${centerId}`
          );
        } catch (sendError) {
          // Log but don't fail the request — notification record is already created
          console.error(
            '[RefurbishmentController] Failed to send instant notification immediately:',
            sendError.message
          );
        }
      }

      const successMessage = isManualRequest
        ? 'Manual refurbishment request created successfully'
        : 'Scheduled notification created successfully';

      return ApiResponse.success(res, result, successMessage, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/refurbishment/scheduled-notifications
   * Get all scheduled notifications with filters
   */
  static async getScheduledNotifications(req, res, next) {
    try {
      const { partnerId, centerId, status, autoSend, limit = 50, offset = 0 } = req.query;

      const filters = {
        partnerId: partnerId || null,
        centerId: centerId || null,
        status: status || null,
        autoSend: autoSend !== undefined ? autoSend === 'true' : null,
        limit: parseInt(limit),
        offset: parseInt(offset),
      };

      const notifications = await ScheduledNotificationService.getScheduledNotifications(filters);

      return ApiResponse.success(res, { notifications, count: notifications.length });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/refurbishment/scheduled-notifications/:id
   * Get a single scheduled notification by ID
   */
  static async getScheduledNotificationById(req, res, next) {
    try {
      const { id } = req.params;

      const notification = await ScheduledNotificationService.getScheduledNotificationById(id);

      return ApiResponse.success(res, notification);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/admin/refurbishment/scheduled-notifications/:id
   * Update a scheduled notification
   */
  static async updateScheduledNotification(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Validate frequency if provided
      if (
        updates.frequency &&
        !['instant', 'daily', 'weekly', 'monthly', 'custom'].includes(updates.frequency)
      ) {
        throw new ValidationError('Invalid frequency value');
      }

      // Validate custom frequency has interval days
      if (
        updates.frequency === 'custom' &&
        (!updates.custom_interval_days ||
          updates.custom_interval_days < 1 ||
          updates.custom_interval_days > 365)
      ) {
        throw new ValidationError(
          'custom_interval_days must be between 1 and 365 for custom frequency'
        );
      }

      // Validate max occurrences if provided
      if (updates.max_occurrences !== undefined && updates.max_occurrences !== null) {
        const maxOccurrencesInt = parseInt(updates.max_occurrences);
        if (isNaN(maxOccurrencesInt) || maxOccurrencesInt < 1 || maxOccurrencesInt > 100) {
          throw new ValidationError('max_occurrences must be between 1 and 100');
        }
      }

      const notification = await ScheduledNotificationService.updateScheduledNotification(
        id,
        updates
      );

      return ApiResponse.success(res, notification, 'Scheduled notification updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/admin/refurbishment/scheduled-notifications/:id/toggle
   * Toggle auto-send ON/OFF for a scheduled notification
   */
  static async toggleAutoSend(req, res, next) {
    try {
      const { id } = req.params;
      const { enabled } = req.body;

      if (enabled === undefined) {
        throw new ValidationError('enabled field is required (true or false)');
      }

      const notification = await ScheduledNotificationService.toggleAutoSend(id, enabled);

      return ApiResponse.success(
        res,
        notification,
        `Auto-send ${enabled ? 'enabled' : 'paused'} successfully`
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/admin/refurbishment/scheduled-notifications/:id
   * Cancel (or delete) a scheduled notification
   */
  static async cancelScheduledNotification(req, res, next) {
    try {
      const { id } = req.params;
      const { hardDelete } = req.query;

      if (hardDelete === 'true') {
        // Actually delete from database
        await ScheduledNotificationService.deleteScheduledNotification(id);
        return ApiResponse.success(res, null, 'Scheduled notification deleted successfully');
      } else {
        // Just cancel (soft delete)
        const notification = await ScheduledNotificationService.cancelScheduledNotification(id);
        return ApiResponse.success(
          res,
          notification,
          'Scheduled notification cancelled successfully'
        );
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/refurbishment/scheduled-notifications/:id/history
   * Get execution history for a scheduled notification
   */
  static async getExecutionHistory(req, res, next) {
    try {
      const { id } = req.params;
      const { limit = 50 } = req.query;

      const history = await ScheduledNotificationService.getExecutionHistory(id, parseInt(limit));

      return ApiResponse.success(res, { history, count: history.length });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/refurbishment/packages
   * Create a new refurbishment package
   */
  static async createPackage(req, res, next) {
    try {
      const { name, description, courses, category } = req.body;

      // Validation
      if (!name || name.trim().length === 0) {
        throw new ValidationError('Package name is required');
      }

      // Parse courses if it's a string (from FormData)
      let parsedCourses = courses;
      if (typeof courses === 'string') {
        try {
          parsedCourses = JSON.parse(courses);
        } catch (e) {
          parsedCourses = [courses];
        }
      }

      if (!parsedCourses || !Array.isArray(parsedCourses) || parsedCourses.length === 0) {
        throw new ValidationError('At least one course must be selected');
      }

      // Handle uploaded images
      const imagePaths = req.files
        ? req.files.map((file) => `uploads/packages/${file.filename}`)
        : [];

      const result = await RefurbishmentService.createPackage({
        name: name.trim(),
        description: description?.trim() || null,
        courses: parsedCourses,
        images: imagePaths.length > 0 ? imagePaths : null,
        category: category || 'refurbishment',
      });

      return ApiResponse.success(res, result, 'Package created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/admin/refurbishment/packages/:id
   * Update an existing package
   */
  static async updatePackage(req, res, next) {
    try {
      const { id } = req.params;
      const { name, description, courses, existingImages, category } = req.body;

      const updates = {};
      if (name !== undefined) updates.name = name.trim();
      if (description !== undefined) updates.description = description?.trim() || null;
      if (category !== undefined) updates.category = category;

      // Parse courses if it's a string (from FormData)
      if (courses !== undefined) {
        let parsedCourses = courses;
        if (typeof courses === 'string') {
          try {
            parsedCourses = JSON.parse(courses);
          } catch (e) {
            parsedCourses = [courses];
          }
        }

        if (!Array.isArray(parsedCourses) || parsedCourses.length === 0) {
          throw new ValidationError('At least one course must be selected');
        }
        updates.courses = parsedCourses;
      }

      // Handle uploaded images
      const newImagePaths = req.files
        ? req.files.map((file) => `uploads/packages/${file.filename}`)
        : [];

      // If there are new images or existing images specified
      if (newImagePaths.length > 0 || existingImages) {
        const existingImagesArray = existingImages
          ? typeof existingImages === 'string'
            ? JSON.parse(existingImages)
            : existingImages
          : [];
        updates.images = [...existingImagesArray, ...newImagePaths];
      }

      const result = await RefurbishmentService.updatePackage(id, updates);

      return ApiResponse.success(res, result, 'Package updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/admin/refurbishment/packages/:id
   * Delete a package (soft delete)
   */
  static async deletePackage(req, res, next) {
    try {
      const { id } = req.params;
      const { hardDelete = false } = req.query;

      const result = await RefurbishmentService.deletePackage(id, hardDelete === 'true');

      return ApiResponse.success(res, result, 'Package deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /* ==================== ADMIN WORKFLOW ENDPOINTS ==================== */

  /**
   * GET /api/v1/admin/refurbishment/requests/:id/review
   * Get refurbishment request details for admin review
   */
  static async getRefurbishmentRequestForReview(req, res, next) {
    try {
      const { id } = req.params;
      const adminUserId = req.user.id;

      const result = await RefurbishmentService.getRefurbishmentRequestForReview(id, adminUserId);

      return ApiResponse.success(
        res,
        result,
        'Refurbishment request details retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/refurbishment/requests/pending-review
   * Get all refurbishment requests pending admin review (for badge count)
   */
  static async getPendingReviewRequests(req, res, next) {
    try {
      const { status = 'submitted', limit = 50, offset = 0 } = req.query;

      const result = await RefurbishmentService.getPendingReviewRequests({
        status,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      return ApiResponse.success(res, result, 'Pending review requests retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/refurbishment/requests/:id/admin-packages
   * Admin adds additional packages to refurbishment request
   *
   * Body:
   * {
   *   "selectedPackages": [
   *     {"course_id": "...", "package_id": "...", "quantity": 1},
   *     ...
   *   ]
   * }
   */
  static async addAdminPackages(req, res, next) {
    try {
      const { id } = req.params;
      const adminUserId = req.user.id;
      const { selectedPackages } = req.body;

      if (!Array.isArray(selectedPackages) || selectedPackages.length === 0) {
        throw new ValidationError('selectedPackages must be a non-empty array');
      }

      // Validate each package has required fields
      for (const pkg of selectedPackages) {
        if (!pkg.course_id || !pkg.package_id) {
          throw new ValidationError('Each package must have course_id and package_id');
        }
      }

      const result = await RefurbishmentService.addAdminPackages(id, adminUserId, selectedPackages);

      return ApiResponse.success(res, result, 'Admin packages added successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/refurbishment/requests/:id/upgradation-packages
   * Get all available upgradation packages for a request's center (course-filtered)
   * plus the current admin selections.
   */
  static async getUpgradationPackagesForRequest(req, res, next) {
    try {
      const { id } = req.params;
      const result = await RefurbishmentService.getUpgradationPackagesForRequest(id);
      return ApiResponse.success(res, result, 'Upgradation packages retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/refurbishment/requests/:id/upgradation-packages
   * Save admin's selected upgradation packages for a request (replaces existing).
   *
   * Body: { packageIds: ["uuid1", "uuid2"], notes: { "uuid1": "optional note" } }
   */
  static async saveAdminUpgradationPackages(req, res, next) {
    try {
      const { id } = req.params;
      const adminUserId = req.user.id;
      const { packageIds = [], notes = {} } = req.body;

      if (!Array.isArray(packageIds)) {
        throw new ValidationError('packageIds must be an array');
      }

      const result = await RefurbishmentService.saveAdminUpgradationPackages(
        id,
        adminUserId,
        packageIds,
        notes
      );
      return ApiResponse.success(res, result, 'Upgradation packages saved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/admin/refurbishment/requests/:id/approve
   * Admin approves refurbishment request
   *
   * Body:
   * {
   *   "adminRemarks": "Optional remarks"
   * }
   */
  static async approveRefurbishmentRequest(req, res, next) {
    try {
      const { id } = req.params;
      const adminUserId = req.user.id;
      const { adminRemarks, adminAddedPackages = [], removedPackageIds = [] } = req.body;

      const result = await RefurbishmentService.approveRefurbishmentRequest(
        id,
        adminUserId,
        adminRemarks,
        removedPackageIds,
        adminAddedPackages
      );

      return ApiResponse.success(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/admin/refurbishment/requests/:id/reject
   * Admin rejects refurbishment request
   *
   * Body:
   * {
   *   "rejectionReason": "Reason for rejection (REQUIRED)"
   * }
   */
  static async rejectRefurbishmentRequest(req, res, next) {
    try {
      const { id } = req.params;
      const adminUserId = req.user.id;
      const { rejectionReason } = req.body;

      if (!rejectionReason || rejectionReason.trim() === '') {
        throw new ValidationError('Rejection reason is required');
      }

      const result = await RefurbishmentService.rejectRefurbishmentRequest(
        id,
        adminUserId,
        rejectionReason
      );

      return ApiResponse.success(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/admin/refurbishment/requests/:id/start
   * Admin starts refurbishment work
   */
  static async startRefurbishment(req, res, next) {
    try {
      const { id } = req.params;
      const adminUserId = req.user.id;

      const result = await RefurbishmentService.startRefurbishment(id, adminUserId);

      return ApiResponse.success(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/admin/refurbishment/requests/:id/complete
   * Admin marks refurbishment as completed
   *
   * Body:
   * {
   *   "completion_statement": "Completion statement (REQUIRED)",
   *   "completion_date": "2024-01-15",
   *   "completion_images": [
   *     {"url": "s3-url", "name": "photo.jpg", "size": 123456, "type": "image/jpeg"},
   *     ...
   *   ]
   * }
   */
  static async completeRefurbishment(req, res, next) {
    try {
      const { id } = req.params;
      const adminUserId = req.user.id;
      const completionData = req.body;

      if (
        !completionData.completion_statement ||
        completionData.completion_statement.trim() === ''
      ) {
        throw new ValidationError('Completion statement is required');
      }

      const result = await RefurbishmentService.completeRefurbishment(
        id,
        adminUserId,
        completionData
      );

      return ApiResponse.success(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/refurbishment/requests/:id/upload-completion-images
   * Upload completion images to S3
   * Accepts multipart/form-data with image files
   *
   * @param {Array<File>} images - Image files (max 10, JPG/PNG, 5MB each)
   * @returns {Array<Object>} Array of uploaded image objects with S3 URLs
   */
  static async uploadCompletionImages(req, res, next) {
    try {
      const { id: requestId } = req.params;
      const adminUserId = req.user.id;

      // Validate request ID
      if (!requestId) {
        throw new ValidationError('Request ID is required');
      }

      // Check if files were uploaded
      if (!req.files || req.files.length === 0) {
        throw new ValidationError('No images uploaded. Please select at least one image.');
      }

      // Validate file count (max 10 images)
      if (req.files.length > 10) {
        throw new ValidationError('Maximum 10 images allowed per upload');
      }

      // Import S3 utility
      const s3Util = require('../../../utils/s3.util');

      // Upload each image to S3
      const uploadedImages = [];

      for (const file of req.files) {
        // Validate file type
        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
          throw new ValidationError(`Invalid file type: ${file.mimetype}. Allowed: JPG, PNG`);
        }

        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
          throw new ValidationError(`File ${file.originalname} exceeds 5MB limit`);
        }

        // Upload to S3
        const s3Url = await s3Util.uploadImageToS3(
          file.buffer,
          file.originalname,
          file.mimetype,
          requestId,
          'admin-completion',
          null // No courseId for completion images
        );

        uploadedImages.push({
          url: s3Url,
          name: file.originalname,
          size: file.size,
          type: file.mimetype,
        });
      }

      console.log(
        `[RefurbishmentController] Uploaded ${uploadedImages.length} completion images for request ${requestId}`
      );

      return ApiResponse.success(
        res,
        {
          images: uploadedImages,
          count: uploadedImages.length,
        },
        `Successfully uploaded ${uploadedImages.length} image(s) to S3`,
        201
      );
    } catch (error) {
      console.error('[RefurbishmentController] Error uploading completion images:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }

  /**
   * Advance request to next lifecycle status (approved → material_procurement → installation_in_progress).
   * Completing (→ completed) must go through completeRefurbishment.
   * @route PATCH /api/v1/admin/refurbishment/requests/:id/status
   */
  static async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const adminUserId = req.user.id;

      if (!status) {
        return ApiResponse.error(res, 'status is required', 400);
      }

      const result = await RefurbishmentService.updateRefurbishmentStatus(id, adminUserId, status);
      return ApiResponse.success(res, result, 'Status updated successfully');
    } catch (error) {
      console.error('[RefurbishmentController] Error updating status:', error);
      return ApiResponse.error(res, error.message, 400);
    }
  }

  static async getNotificationHistory(req, res) {
    try {
      const { centerId } = req.params;
      const result = await RefurbishmentService.getNotificationHistoryForCenter(centerId);
      return ApiResponse.success(res, result, 'Notification history retrieved');
    } catch (error) {
      console.error('[RefurbishmentController] Error fetching notification history:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
}

module.exports = RefurbishmentController;
