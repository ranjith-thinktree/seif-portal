const express = require('express');
const router = express.Router();
const UserController = require('../controllers/user.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { checkRole } = require('../../../middleware/role.middleware');
const { USER_ROLES } = require('../../../constants');

/**
 * User Management Routes
 * All routes require SUPER_ADMIN or ADMIN role
 */

// Apply authentication and role check to all routes
router.use(authenticate);
router.use(checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]));

/**
 * @route   GET /api/v1/users/filter-options
 * @desc    Get filter options for users (roles, statuses, partners)
 * @access  Admin, Super Admin
 */
router.get('/filter-options', UserController.getFilterOptions);

/**
 * @route   GET /api/v1/users/stats
 * @desc    Get user statistics
 * @access  Admin, Super Admin
 */
router.get('/stats', UserController.getStats);

/**
 * @route   GET /api/v1/users/role/:role
 * @desc    Get users by role
 * @access  Admin, Super Admin
 */
router.get('/role/:role', UserController.getByRole);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID
 * @access  Admin, Super Admin
 */
router.get('/:id', UserController.getById);

/**
 * @route   GET /api/v1/users
 * @desc    Get all users with pagination and filters
 * @access  Admin, Super Admin
 */
router.get('/', UserController.getAll);

/**
 * @route   POST /api/v1/users
 * @desc    Create new user
 * @access  Admin, Super Admin
 */
router.post('/', UserController.create);

/**
 * @route   PUT /api/v1/users/:id
 * @desc    Update user
 * @access  Admin, Super Admin
 */
router.put('/:id', UserController.update);

/**
 * @route   PATCH /api/v1/users/:id/status
 * @desc    Update user status
 * @access  Admin, Super Admin
 */
router.patch('/:id/status', UserController.updateStatus);

/**
 * @route   POST /api/v1/users/:id/reset-password
 * @desc    Reset user password
 * @access  Admin, Super Admin
 */
router.post('/:id/reset-password', UserController.resetPassword);

/**
 * @route   POST /api/v1/users/:id/resend-credentials
 * @desc    Generate a new temporary password and email it to a partner user
 * @access  Admin, Super Admin
 */
router.post('/:id/resend-credentials', UserController.resendCredentials);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Delete user (soft delete by default, hard delete if ?hard=true)
 * @access  Admin, Super Admin
 */
router.delete('/:id', UserController.delete);

module.exports = router;
