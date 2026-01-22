const UserService = require('../services/user.service');
const ApiResponse = require('../../../utils/response.util');
const { ValidationError } = require('../../../utils/error.util');

/**
 * User Controller
 * Handles HTTP requests for user management
 */
class UserController {
  /**
   * Get all users with pagination and filters
   * GET /api/v1/users
   */
  static async getAll(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const requesterRole = req.user?.role; // Get requester's role from JWT

      const filters = {
        role: req.query.role,
        status: req.query.status,
        partner_id: req.query.partner_id,
        search: req.query.search,
      };

      // Remove undefined filters
      Object.keys(filters).forEach((key) => filters[key] === undefined && delete filters[key]);

      const result = await UserService.getUsersWithPartners(page, limit, filters, requesterRole);

      return ApiResponse.success(res, 'Users retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get filter options for users
   * GET /api/v1/users/filter-options
   */
  static async getFilterOptions(req, res, next) {
    try {
      const requesterRole = req.user?.role; // Get requester's role from JWT
      const options = await UserService.getFilterOptions(requesterRole);
      return ApiResponse.success(res, 'Filter options retrieved successfully', options);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user by ID
   * GET /api/v1/users/:id
   */
  static async getById(req, res, next) {
    try {
      const user = await UserService.getById(req.params.id);
      return ApiResponse.success(res, 'User retrieved successfully', user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get users by role
   * GET /api/v1/users/role/:role
   */
  static async getByRole(req, res, next) {
    try {
      const requesterRole = req.user?.role; // Get requester's role from JWT
      const users = await UserService.getByRole(req.params.role, requesterRole);
      return ApiResponse.success(res, `${req.params.role} users retrieved successfully`, users);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new user
   * POST /api/v1/users
   */
  static async create(req, res, next) {
    try {
      const { email, password, full_name, mobile_number, role, partner_id, status } = req.body;

      // Validate required fields
      if (!email || !password || !full_name || !role) {
        throw new ValidationError('Email, password, full name, and role are required');
      }

      // Validate role
      const validRoles = ['SUPER_ADMIN', 'ADMIN', 'PARTNER', 'ESSCI', 'SEIF_READONLY'];
      if (!validRoles.includes(role)) {
        throw new ValidationError('Invalid role');
      }

      // If role is PARTNER, partner_id is required
      if (role === 'PARTNER' && !partner_id) {
        throw new ValidationError('Partner ID is required for PARTNER role');
      }

      const userData = {
        email,
        password,
        full_name,
        mobile_number,
        role,
        partner_id: role === 'PARTNER' ? partner_id : null,
        status: status || 'active',
      };

      const user = await UserService.create(userData);

      return ApiResponse.created(res, 'User created successfully', user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user
   * PUT /api/v1/users/:id
   */
  static async update(req, res, next) {
    try {
      const { email, full_name, mobile_number, role, partner_id, status } = req.body;

      const updateData = {};
      if (email) updateData.email = email;
      if (full_name) updateData.full_name = full_name;
      if (mobile_number) updateData.mobile_number = mobile_number;
      if (role) {
        const validRoles = ['SUPER_ADMIN', 'ADMIN', 'PARTNER', 'ESSCI', 'SEIF_READONLY'];
        if (!validRoles.includes(role)) {
          throw new ValidationError('Invalid role');
        }
        updateData.role = role;
      }
      if (partner_id !== undefined) updateData.partner_id = partner_id;
      if (status) updateData.status = status;

      const user = await UserService.update(req.params.id, updateData);

      return ApiResponse.success(res, 'User updated successfully', user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete user (soft delete)
   * DELETE /api/v1/users/:id
   */
  static async delete(req, res, next) {
    try {
      // Check if hard delete is requested
      const hardDelete = req.query.hard === 'true';

      let result;
      if (hardDelete) {
        result = await UserService.hardDelete(req.params.id);
      } else {
        result = await UserService.softDelete(req.params.id);
      }

      return ApiResponse.success(res, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user status
   * PATCH /api/v1/users/:id/status
   */
  static async updateStatus(req, res, next) {
    try {
      const { status } = req.body;

      if (!status) {
        throw new ValidationError('Status is required');
      }

      const user = await UserService.updateStatus(req.params.id, status);

      return ApiResponse.success(res, 'User status updated successfully', user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset user password
   * POST /api/v1/users/:id/reset-password
   */
  static async resetPassword(req, res, next) {
    try {
      // Generate temporary password
      const tempPassword = UserService.generateTempPassword();

      // Reset password
      await UserService.resetPassword(req.params.id, tempPassword, req.user.id);

      // In production, you would send this via email
      // For now, return it in response (remove this in production!)
      return ApiResponse.success(res, 'Password reset successfully', {
        message: 'User must change password on next login',
        temporaryPassword: tempPassword, // Remove this in production!
        note: 'In production, this password should be sent via email',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user statistics
   * GET /api/v1/users/stats
   */
  static async getStats(req, res, next) {
    try {
      const allUsers = await UserService.getAll(1, 1000, {});

      const stats = {
        total: allUsers.total,
        by_role: {},
        by_status: {},
        recent_logins: 0,
      };

      // Count by role
      allUsers.users.forEach((user) => {
        stats.by_role[user.role] = (stats.by_role[user.role] || 0) + 1;
        stats.by_status[user.status] = (stats.by_status[user.status] || 0) + 1;

        // Count users who logged in within last 7 days
        if (user.last_login_at) {
          const lastLogin = new Date(user.last_login_at);
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          if (lastLogin > sevenDaysAgo) {
            stats.recent_logins++;
          }
        }
      });

      return ApiResponse.success(res, 'User statistics retrieved successfully', stats);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UserController;
