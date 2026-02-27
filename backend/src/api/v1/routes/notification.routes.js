const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../../../middleware/auth.middleware');

/**
 * Notification Routes
 * All routes require authentication
 */

// Get all notifications for current user
router.get('/', authenticate, notificationController.getNotifications);

// Get grouped notifications
router.get('/grouped', authenticate, notificationController.getGroupedNotifications);

// Get unread notification count
router.get('/unread-count', authenticate, notificationController.getUnreadCount);

// Get upload center details
router.get(
  '/upload/:uploadId/centers',
  authenticate,
  notificationController.getUploadCenterDetails
);

// Get refurbishment notification details
router.get(
  '/:notificationId/refurbishment-details',
  authenticate,
  notificationController.getRefurbishmentDetails
);

// Submit refurbishment response
router.post(
  '/:notificationId/refurbishment-response',
  authenticate,
  notificationController.submitRefurbishmentResponse
);

// Get notification by ID
router.get('/:id', authenticate, notificationController.getNotificationById);

// Mark notification as read
router.patch('/:id/read', authenticate, notificationController.markAsRead);

// Mark all notifications as read
router.post('/mark-all-read', authenticate, notificationController.markAllAsRead);

// Delete notification
router.delete('/:id', authenticate, notificationController.deleteNotification);

module.exports = router;
