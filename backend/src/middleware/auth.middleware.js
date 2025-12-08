const AuthService = require('../api/v1/services/auth.service');
const UserModel = require('../models/User.model');
const ApiResponse = require('../utils/response.util');
const { AuthenticationError } = require('../utils/error.util');
const { ERROR_MESSAGES } = require('../constants');
const { checkRole } = require('./role.middleware');

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request object
 */

const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError(ERROR_MESSAGES.UNAUTHORIZED);
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      throw new AuthenticationError(ERROR_MESSAGES.UNAUTHORIZED);
    }

    // Verify token
    const decoded = AuthService.verifyToken(token, 'access');

    // Get user from database
    const user = await UserModel.findById(decoded.id);

    if (!user) {
      throw new AuthenticationError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Check if user is active
    if (user.status !== 'active') {
      throw new AuthenticationError(ERROR_MESSAGES.USER_INACTIVE);
    }

    // Attach user to request object (without password hash)
    delete user.password_hash;
    req.user = user;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return ApiResponse.unauthorized(res, ERROR_MESSAGES.TOKEN_INVALID);
    }
    if (error.name === 'TokenExpiredError') {
      return ApiResponse.unauthorized(res, ERROR_MESSAGES.TOKEN_EXPIRED);
    }
    next(error);
  }
};

/**
 * Optional Authentication Middleware
 * Attaches user if token is valid, but doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = AuthService.verifyToken(token, 'access');
      const user = await UserModel.findById(decoded.id);

      if (user && user.status === 'active') {
        delete user.password_hash;
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Ignore errors for optional auth
    next();
  }
};

/**
 * Authorization Middleware
 * Alias for checkRole to maintain consistent naming
 */
const authorize = checkRole;

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
};
