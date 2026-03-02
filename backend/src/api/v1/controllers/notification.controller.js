const notificationService = require('../services/notification.service');

/**
 * Notification Controller
 * Handles HTTP requests for notifications
 */

/**
 * Get all notifications for current user
 * GET /api/v1/notifications
 */
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      type: req.query.type,
      isRead: req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined,
      search: req.query.search,
      days: parseInt(req.query.days) || 180,
    };

    const result = await notificationService.getUserNotifications(userId, role, filters);

    res.status(200).json({
      success: true,
      data: result.notifications,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get unread notification count
 * GET /api/v1/notifications/unread-count
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    const count = await notificationService.getUnreadCount(userId, role);

    res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get notification by ID
 * GET /api/v1/notifications/:id
 */
const getNotificationById = async (req, res, next) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;
    const role = req.user.role;

    const notification = await notificationService.getNotificationById(
      notificationId,
      userId,
      role
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark notification as read
 * PATCH /api/v1/notifications/:id/read
 */
const markAsRead = async (req, res, next) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;
    const role = req.user.role;

    const success = await notificationService.markAsRead(notificationId, userId, role);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all notifications as read
 * POST /api/v1/notifications/mark-all-read
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    const count = await notificationService.markAllAsRead(userId, role);

    res.status(200).json({
      success: true,
      message: `${count} notification(s) marked as read`,
      count,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete notification
 * DELETE /api/v1/notifications/:id
 */
const deleteNotification = async (req, res, next) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;
    const role = req.user.role;

    const success = await notificationService.deleteNotification(notificationId, userId, role);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get grouped notifications
 * GET /api/v1/notifications/grouped
 */
const getGroupedNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      search: req.query.search,
      status: req.query.status,
      sortBy: req.query.sortBy || 'newest',
      days: parseInt(req.query.days) || 180,
    };

    const result = await notificationService.getGroupedNotifications(userId, role, filters);

    res.status(200).json({
      success: true,
      data: result.notifications,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get upload center details
 * GET /api/v1/notifications/upload/:uploadId/centers
 */
const getUploadCenterDetails = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const uploadId = req.params.uploadId;

    const result = await notificationService.getUploadCenterDetails(uploadId, userId, role);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get refurbishment notification details
 * GET /api/v1/notifications/:notificationId/refurbishment-details
 */
const getRefurbishmentDetails = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const partnerId = req.user.partner_id;
    const notificationId = req.params.notificationId;

    // Partners and admins can view refurbishment notification details.
    // Admins view all; partners are restricted to their own notifications (enforced in service).
    if (role !== 'PARTNER' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only partners and admins can view refurbishment details.',
      });
    }
    // Admins don't have a partnerId — pass null so service handles it correctly
    const effectivePartnerId = role === 'ADMIN' || role === 'SUPER_ADMIN' ? null : partnerId;

    let result;
    try {
      result = await notificationService.getRefurbishmentDetails(
        notificationId,
        userId,
        effectivePartnerId
      );
    } catch (err) {
      if (err.message && err.message.includes('not found')) {
        return res.status(404).json({ success: false, message: err.message });
      }
      throw err;
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit partner refurbishment response
 * POST /api/v1/notifications/:notificationId/refurbishment-response
 */
const submitRefurbishmentResponse = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const partnerId = req.user.partner_id;
    const notificationId = req.params.notificationId;
    const { selected_packages, upgradation = null } = req.body;

    // Only partners can submit responses
    if (role !== 'PARTNER' || !partnerId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only partners can submit refurbishment responses.',
      });
    }

    // Validate input
    if (!selected_packages || !Array.isArray(selected_packages) || selected_packages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request. selected_packages array is required.',
      });
    }

    const result = await notificationService.submitRefurbishmentResponse(
      notificationId,
      userId,
      partnerId,
      selected_packages,
      upgradation
    );

    res.status(200).json({
      success: true,
      message: 'Refurbishment response submitted successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getGroupedNotifications,
  getUploadCenterDetails,
  getRefurbishmentDetails,
  submitRefurbishmentResponse,
};
