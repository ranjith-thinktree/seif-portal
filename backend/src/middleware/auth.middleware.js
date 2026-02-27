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
  console.log('[AUTH_MIDDLEWARE] authenticate called - URL:', req.url, 'Method:', req.method);
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    console.log('[AUTH_MIDDLEWARE] authHeader present:', !!authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[AUTH_MIDDLEWARE] No Bearer token found');
      throw new AuthenticationError(ERROR_MESSAGES.UNAUTHORIZED);
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log('[AUTH_MIDDLEWARE] Token extracted, length:', token.length);

    if (!token) {
      throw new AuthenticationError(ERROR_MESSAGES.UNAUTHORIZED);
    }

    // Verify token
    console.log('[AUTH_MIDDLEWARE] About to verify token');
    const decoded = AuthService.verifyToken(token, 'access');
    console.log('[AUTH_MIDDLEWARE] Token verified, user ID:', decoded.id);

    // Get user from database
    console.log('[AUTH_MIDDLEWARE] Looking up user in database');
    const user = await UserModel.findById(decoded.id);
    console.log('[AUTH_MIDDLEWARE] User found:', !!user);

    if (!user) {
      throw new AuthenticationError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Check if user is active
    console.log('[AUTH_MIDDLEWARE] User status:', user.status);
    if (user.status !== 'active') {
      throw new AuthenticationError(ERROR_MESSAGES.USER_INACTIVE);
    }

    // Attach user to request object (without password hash)
    delete user.password_hash;
    req.user = user;

    console.log('[AUTH_MIDDLEWARE] Auth successful, calling next()');
    next();
  } catch (error) {
    console.log('[AUTH_MIDDLEWARE] Error caught:', error.message);
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
