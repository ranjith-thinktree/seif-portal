const UserModel = require('../../../models/User.model');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { ValidationError, NotFoundError } = require('../../../utils/error.util');
const db = require('../../../database/connection');

/**
 * User Service
 * Handles business logic for user management
 */
class UserService {
  /**
   * Get all users with pagination and filters
   */
  static async getAll(page = 1, limit = 10, filters = {}) {
    const result = await UserModel.getAll(page, limit, filters);
    return result;
  }

  /**
   * Get user by ID
   */
  static async getById(id) {
    const user = await UserModel.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  /**
   * Get users by role
   * @param {string} role - Role to filter by
   * @param {string} requesterRole - Role of the user making the request
   */
  static async getByRole(role, requesterRole = null) {
    // CRITICAL SECURITY: Prevent non-Super Admins from querying Super Admin users
    if (role === 'SUPER_ADMIN' && requesterRole !== 'SUPER_ADMIN') {
      return []; // Return empty array instead of actual Super Admin users
    }

    const users = await UserModel.findByRole(role);

    // CRITICAL SECURITY: Filter out Super Admins from results for non-Super Admin requesters
    if (requesterRole !== 'SUPER_ADMIN') {
      return users.filter((user) => user.role !== 'SUPER_ADMIN');
    }

    return users;
  }

  /**
   * Create new user
   */
  static async create(userData) {
    // Check if email already exists
    const emailExists = await UserModel.emailExists(userData.email);
    if (emailExists) {
      throw new ValidationError('Email already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(userData.password, salt);

    // Create user
    const newUser = await UserModel.create({
      ...userData,
      password_hash: passwordHash,
      status: userData.status || 'active',
      must_change_password:
        userData.must_change_password !== undefined ? userData.must_change_password : true,
      first_login: true,
    });

    // Return user without password
    delete newUser.password_hash;
    return newUser;
  }

  /**
   * Update user
   */
  static async update(id, updateData) {
    // Check if user exists
    const user = await UserModel.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // If updating email, check if it's already taken
    if (updateData.email && updateData.email !== user.email) {
      const emailExists = await UserModel.emailExists(updateData.email, id);
      if (emailExists) {
        throw new ValidationError('Email already exists');
      }
    }

    // If updating password, hash it
    if (updateData.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password_hash = await bcrypt.hash(updateData.password, salt);
      delete updateData.password;
    }

    // Update user
    const updatedUser = await UserModel.update(id, updateData);

    // Return user without password
    delete updatedUser.password_hash;
    return updatedUser;
  }

  /**
   * Delete user (soft delete)
   */
  static async softDelete(id) {
    // Check if user exists
    const user = await UserModel.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    await UserModel.softDelete(id);
    return { message: 'User deleted successfully' };
  }

  /**
   * Hard delete user
   */
  static async hardDelete(id) {
    // Check if user exists
    const user = await UserModel.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    await UserModel.hardDelete(id);
    return { message: 'User permanently deleted' };
  }

  /**
   * Update user status
   */
  static async updateStatus(id, status) {
    // Check if user exists
    const user = await UserModel.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Validate status
    const validStatuses = ['active', 'inactive', 'suspended'];
    if (!validStatuses.includes(status)) {
      throw new ValidationError('Invalid status');
    }

    const updatedUser = await UserModel.update(id, { status });
    delete updatedUser.password_hash;
    return updatedUser;
  }

  /**
   * Reset user password
   */
  static async resetPassword(id, newPassword, adminId) {
    // Check if user exists
    const user = await UserModel.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update password
    await UserModel.updatePassword(id, passwordHash);

    // Set must change password flag
    await UserModel.setMustChangePassword(id, true);

    return { message: 'Password reset successfully. User must change password on next login.' };
  }

  /**
   * Generate temporary password
   */
  static generateTempPassword() {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';

    // Ensure at least one of each type
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)];

    // Fill the rest
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Shuffle
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }

  /**
   * Get filter options for users
   * Returns available roles, statuses, partners for filter dropdowns
   * @param {string} requesterRole - Role of the user making the request
   */
  static async getFilterOptions(requesterRole = null) {
    try {
      // Get distinct roles - CRITICAL SECURITY: Hide SUPER_ADMIN from non-Super Admins
      let roleQuery = `
        SELECT DISTINCT role 
        FROM users 
        WHERE role IS NOT NULL
      `;

      // Exclude SUPER_ADMIN role for non-Super Admin users
      if (requesterRole !== 'SUPER_ADMIN') {
        roleQuery += " AND role != 'SUPER_ADMIN'";
      }

      roleQuery += ' ORDER BY role';

      const [roles] = await db.query(roleQuery);

      // Get distinct statuses
      const [statuses] = await db.query(`
        SELECT DISTINCT status 
        FROM users 
        WHERE status IS NOT NULL 
        ORDER BY status
      `);

      // Get partners (for filtering by partner)
      const [partners] = await db.query(`
        SELECT DISTINCT p.id, p.name 
        FROM partners p
        INNER JOIN users u ON u.partner_id = p.id
        WHERE p.status = 'active'
        ORDER BY p.name
      `);

      return {
        roles: roles.map((r) => r.role),
        statuses: statuses.map((s) => s.status),
        partners: partners.map((p) => ({
          id: p.id,
          name: p.name,
        })),
      };
    } catch (error) {
      console.error('Error fetching user filter options:', error);
      throw error;
    }
  }

  /**
   * Get users with partner details (for table display)
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @param {object} filters - Filter criteria
   * @param {string} requesterRole - Role of the user making the request
   */
  static async getUsersWithPartners(page = 1, limit = 10, filters = {}, requesterRole = null) {
    const offset = (page - 1) * limit;
    const whereClauses = [];
    const params = [];

    // CRITICAL SECURITY: Hide Super Admins from non-Super Admin users
    if (requesterRole !== 'SUPER_ADMIN') {
      whereClauses.push("u.role != 'SUPER_ADMIN'");
    }

    // Build WHERE clause based on filters
    if (filters.role) {
      whereClauses.push('u.role = ?');
      params.push(filters.role);
    }
    if (filters.status) {
      whereClauses.push('u.status = ?');
      params.push(filters.status);
    }
    if (filters.partner_id) {
      whereClauses.push('u.partner_id = ?');
      params.push(filters.partner_id);
    }
    if (filters.search) {
      whereClauses.push('(u.full_name LIKE ? OR u.email LIKE ?)');
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Get total count
    const countSQL = `SELECT COUNT(*) as total FROM users u ${whereSQL}`;
    const [countResult] = await db.query(countSQL, params);
    const total = countResult[0].total;

    // Get paginated data with partner details
    const dataSQL = `
      SELECT 
        u.id, 
        u.email, 
        u.full_name, 
        u.mobile_number, 
        u.role, 
        u.partner_id,
        p.name as partner_name,
        u.status, 
        u.last_login_at, 
        u.created_at, 
        u.updated_at
      FROM users u
      LEFT JOIN partners p ON u.partner_id = p.id
      ${whereSQL}
      ORDER BY u.created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `;
    const [users] = await db.query(dataSQL, params);

    return { users, total, page, limit };
  }
}

module.exports = UserService;
