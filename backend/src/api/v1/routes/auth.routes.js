const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { validate } = require('../../../middleware/validate.middleware');
const {
  loginValidator,
  registerValidator,
  refreshTokenValidator,
  changePasswordValidator,
  updateProfileValidator,
} = require('../validators/auth.validator');

/**
 * Auth Routes
 * Base path: /api/v1/auth
 */

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', loginValidator, validate, AuthController.login);

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register new user
 * @access  Public (or can be protected for admin-only registration)
 */
router.post('/register', registerValidator, validate, AuthController.register);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', refreshTokenValidator, validate, AuthController.refreshToken);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Protected
 */
router.post('/logout', authenticate, AuthController.logout);

/**
 * @route   GET /api/v1/auth/profile
 * @desc    Get current user profile
 * @access  Protected
 */
router.get('/profile', authenticate, AuthController.getProfile);

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    Update current user profile
 * @access  Protected
 */
router.put(
  '/profile',
  authenticate,
  updateProfileValidator,
  validate,
  AuthController.updateProfile
);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change user password
 * @access  Protected
 */
router.post(
  '/change-password',
  authenticate,
  changePasswordValidator,
  validate,
  AuthController.changePassword
);

/**
 * @route   GET /api/v1/auth/verify
 * @desc    Verify token (for testing)
 * @access  Protected
 */
router.get('/verify', authenticate, AuthController.verifyToken);

module.exports = router;
