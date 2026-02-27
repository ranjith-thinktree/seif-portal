const AuthService = require('../services/auth.service');
const ApiResponse = require('../../../utils/response.util');
const { SUCCESS_MESSAGES } = require('../../../constants');

/**
 * Auth Controller
 * Handles authentication-related HTTP requests
 */

class AuthController {
  /**
   * Login user
   * POST /api/v1/auth/login
   */
  static async login(req, res, next) {
    try {
      console.log('🟢 Controller login called:', req.body.email);
      const { email, password } = req.body;

      const result = await AuthService.login(email, password);

      return ApiResponse.success(res, result, SUCCESS_MESSAGES.LOGIN_SUCCESS, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Register new user
   * POST /api/v1/auth/register
   */
  static async register(req, res, next) {
    try {
      const userData = {
        email: req.body.email,
        password: req.body.password,
        full_name: req.body.full_name,
        mobile_number: req.body.mobile_number,
        role: req.body.role,
        partner_id: req.body.partner_id,
      };

      const result = await AuthService.register(userData);

      return ApiResponse.created(res, result, SUCCESS_MESSAGES.USER_CREATED);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh
   */
  static async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;

      const result = await AuthService.refreshAccessToken(refreshToken);

      return ApiResponse.success(res, result, 'Token refreshed successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout user
   * POST /api/v1/auth/logout
   */
  static async logout(req, res, next) {
    try {
      // In a stateless JWT system, logout is handled client-side by removing the token
      // If using refresh token blacklist (future enhancement), add logic here

      return ApiResponse.success(res, null, SUCCESS_MESSAGES.LOGOUT_SUCCESS, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user profile
   * GET /api/v1/auth/profile
   */
  static async getProfile(req, res, next) {
    try {
      const userId = req.user.id;

      const user = await AuthService.getProfile(userId);

      return ApiResponse.success(res, user, SUCCESS_MESSAGES.FETCH_SUCCESS, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update current user profile
   * PUT /api/v1/auth/profile
   */
  static async updateProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const updateData = {
        full_name: req.body.full_name,
        mobile_number: req.body.mobile_number,
        email: req.body.email,
      };

      // Remove undefined fields
      Object.keys(updateData).forEach(
        (key) => updateData[key] === undefined && delete updateData[key]
      );

      const user = await AuthService.updateProfile(userId, updateData);

      return ApiResponse.success(res, user, SUCCESS_MESSAGES.USER_UPDATED, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password
   * POST /api/v1/auth/change-password
   */
  static async changePassword(req, res, next) {
    try {
      console.log('[AUTH_CONTROLLER] changePassword called');
      const userId = req.user.id;
      const { currentPassword, newPassword, confirmPassword } = req.body;
      console.log('[AUTH_CONTROLLER] userId:', userId);

      // Validate required fields
      if (!currentPassword || !newPassword || !confirmPassword) {
        console.log('[AUTH_CONTROLLER] Missing required fields');
        return ApiResponse.error(
          res,
          'Current password, new password, and confirm password are required',
          400
        );
      }
      console.log('[AUTH_CONTROLLER] All fields present');

      // Check if new password and confirm password match
      if (newPassword !== confirmPassword) {
        console.log('[AUTH_CONTROLLER] Passwords do not match');
        return ApiResponse.error(res, 'New password and confirm password do not match', 400);
      }
      console.log('[AUTH_CONTROLLER] Passwords match, calling service');

      // Change password
      const result = await AuthService.changePassword(userId, currentPassword, newPassword);
      console.log('[AUTH_CONTROLLER] Service call completed, result:', result);

      return ApiResponse.success(res, result, result.message, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify token (for testing)
   * GET /api/v1/auth/verify
   */
  static async verifyToken(req, res, next) {
    try {
      // If middleware passes, token is valid
      return ApiResponse.success(res, { valid: true, user: req.user }, 'Token is valid', 200);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
