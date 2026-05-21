const ApiResponse = require('../utils/response.util');
const { USER_ROLES, ERROR_MESSAGES } = require('../constants');

/**
 * Role-Based Access Control Middleware
 * Checks if user has required role(s)
 */

/**
 * Check if user has one of the allowed roles
 * @param {Array|String} allowedRoles - Single role or array of roles
 * @returns {Function} Middleware function
 */
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        return ApiResponse.unauthorized(res, ERROR_MESSAGES.UNAUTHORIZED);
      }

      // Convert single role to array
      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

      // Check if user's role is in allowed roles
      if (!roles.includes(req.user.role)) {
        return ApiResponse.forbidden(res, 'You do not have permission to access this resource');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if user is Super Admin
 */
const isSuperAdmin = checkRole(USER_ROLES.SUPER_ADMIN);

/**
 * Check if user is Admin or Super Admin
 */
const isAdmin = checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]);

/**
 * Check if user is Partner
 */
const isPartner = checkRole(USER_ROLES.PARTNER);

/**
 * Check if user is SEIF Read-Only
 */
const isSeifReadOnly = checkRole([USER_ROLES.SEIF_READONLY, USER_ROLES.SEIF_READONLY_DOWNLOAD]);

/**
 * Check if user is ESSCI
 */
const isESSCI = checkRole(USER_ROLES.ESSCI);

/**
 * Check if user is Admin, Super Admin, or SEIF Read-Only
 */
const isAdminOrSeif = checkRole([
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.ADMIN,
  USER_ROLES.SEIF_READONLY,
  USER_ROLES.SEIF_READONLY_DOWNLOAD,
]);

/**
 * Check if user is accessing their own resource
 * @param {String} paramName - Name of the parameter containing user ID (default: 'id')
 */
const isSelfOrAdmin = (paramName = 'id') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return ApiResponse.unauthorized(res, ERROR_MESSAGES.UNAUTHORIZED);
      }

      const resourceUserId = req.params[paramName];

      // Allow if user is accessing their own resource
      if (req.user.id === resourceUserId) {
        return next();
      }

      // Allow if user is admin or super admin
      if ([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN].includes(req.user.role)) {
        return next();
      }

      return ApiResponse.forbidden(res, 'You can only access your own resources');
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if partner user is accessing their own partner's resources
 */
const isOwnPartner = (req, res, next) => {
  try {
    if (!req.user) {
      return ApiResponse.unauthorized(res, ERROR_MESSAGES.UNAUTHORIZED);
    }

    const resourcePartnerId = req.params.partnerId || req.body.partner_id;

    // Allow if admin or super admin
    if ([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN].includes(req.user.role)) {
      return next();
    }

    // For partner users, check if accessing their own partner's resources
    if (req.user.role === USER_ROLES.PARTNER) {
      if (req.user.partner_id === resourcePartnerId) {
        return next();
      }
      return ApiResponse.forbidden(res, 'You can only access your own partner resources');
    }

    return ApiResponse.forbidden(res, ERROR_MESSAGES.FORBIDDEN);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkRole,
  isSuperAdmin,
  isAdmin,
  isPartner,
  isSeifReadOnly,
  isESSCI,
  isAdminOrSeif,
  isSelfOrAdmin,
  isOwnPartner,
};
