const { query } = require('../database/connection');

/**
 * User Model
 * Database operations for users table
 */

class UserModel {
  /**
   * Find user by email
   * @param {String} email - User email
   * @returns {Object|null} User object or null
   */
  static async findByEmail(email) {
    const sql = `
      SELECT 
        id, email, password_hash, full_name, mobile_number, 
        role, partner_id, status, last_login_at, 
        must_change_password, first_login, password_changed_at,
        created_at, updated_at
      FROM users 
      WHERE email = ?
    `;
    const [results] = await query(sql, [email]);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Find user by ID
   * @param {String} id - User UUID
   * @returns {Object|null} User object or null
   */
  static async findById(id) {
    const sql = `
      SELECT 
        id, email, password_hash, full_name, mobile_number, 
        role, partner_id, status, last_login_at, 
        must_change_password, first_login, password_changed_at,
        created_at, updated_at
      FROM users 
      WHERE id = ?
    `;
    const [results] = await query(sql, [id]);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Create new user
   * @param {Object} userData - User data
   * @returns {Object} Created user object
   */
  static async create(userData) {
    const sql = `
      INSERT INTO users (
        id, email, password_hash, full_name, mobile_number, 
        role, partner_id, status, must_change_password, first_login, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const params = [
      userData.id,
      userData.email,
      userData.password_hash,
      userData.full_name,
      userData.mobile_number || null,
      userData.role,
      userData.partner_id || null,
      userData.status || 'active',
      userData.must_change_password !== undefined ? userData.must_change_password : true,
      userData.first_login !== undefined ? userData.first_login : true,
    ];

    await query(sql, params);
    return this.findById(userData.id);
  }

  /**
   * Update user
   * @param {String} id - User UUID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated user object
   */
  static async update(id, updateData) {
    const fields = [];
    const params = [];

    // Dynamically build update query based on provided fields
    if (updateData.full_name !== undefined) {
      fields.push('full_name = ?');
      params.push(updateData.full_name);
    }
    if (updateData.mobile_number !== undefined) {
      fields.push('mobile_number = ?');
      params.push(updateData.mobile_number);
    }
    if (updateData.email !== undefined) {
      fields.push('email = ?');
      params.push(updateData.email);
    }
    if (updateData.password_hash !== undefined) {
      fields.push('password_hash = ?');
      params.push(updateData.password_hash);
    }
    if (updateData.status !== undefined) {
      fields.push('status = ?');
      params.push(updateData.status);
    }
    if (updateData.role !== undefined) {
      fields.push('role = ?');
      params.push(updateData.role);
    }
    if (updateData.partner_id !== undefined) {
      fields.push('partner_id = ?');
      params.push(updateData.partner_id);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push('updated_at = NOW()');
    params.push(id);

    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    await query(sql, params);

    return this.findById(id);
  }

  /**
   * Update last login timestamp
   * @param {String} id - User UUID
   */
  static async updateLastLogin(id) {
    const sql = 'UPDATE users SET last_login_at = NOW() WHERE id = ?';
    await query(sql, [id]);
  }

  /**
   * Delete user (soft delete by setting status to inactive)
   * @param {String} id - User UUID
   */
  static async softDelete(id) {
    const sql = 'UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?';
    await query(sql, ['inactive', id]);
  }

  /**
   * Hard delete user (permanent)
   * @param {String} id - User UUID
   */
  static async hardDelete(id) {
    // Delete notifications for this user first (no FK cascade on notifications table)
    await query('DELETE FROM notifications WHERE recipient_id = ?', [id]);
    await query('DELETE FROM users WHERE id = ?', [id]);
  }

  /**
   * Get all users with pagination
   * @param {Number} page - Page number
   * @param {Number} limit - Items per page
   * @param {Object} filters - Filter options
   * @returns {Object} Users array and total count
   */
  static async getAll(page = 1, limit = 10, filters = {}) {
    const offset = (page - 1) * limit;
    const whereClauses = [];
    const params = [];

    // Build WHERE clause based on filters
    if (filters.role) {
      whereClauses.push('role = ?');
      params.push(filters.role);
    }
    if (filters.status) {
      whereClauses.push('status = ?');
      params.push(filters.status);
    }
    if (filters.partner_id) {
      whereClauses.push('partner_id = ?');
      params.push(filters.partner_id);
    }
    if (filters.search) {
      whereClauses.push('(full_name LIKE ? OR email LIKE ?)');
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Get total count
    const countSQL = `SELECT COUNT(*) as total FROM users ${whereSQL}`;
    const [countResult] = await query(countSQL, params);
    const total = countResult[0].total;

    // Get paginated data
    const dataSQL = `
      SELECT 
        id, email, full_name, mobile_number, role, partner_id, 
        status, last_login_at, created_at, updated_at
      FROM users 
      ${whereSQL}
      ORDER BY created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `;
    const [users] = await query(dataSQL, params);

    return { users, total };
  }

  /**
   * Check if email exists
   * @param {String} email - Email to check
   * @param {String} excludeId - User ID to exclude (for update operations)
   * @returns {Boolean} True if exists, false otherwise
   */
  static async emailExists(email, excludeId = null) {
    let sql = 'SELECT id FROM users WHERE email = ?';
    const params = [email];

    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }

    const [results] = await query(sql, params);
    return results.length > 0;
  }

  /**
   * Get users by role
   * @param {String} role - User role
   * @returns {Array} Array of users
   */
  static async findByRole(role) {
    const sql = `
      SELECT 
        id, email, full_name, mobile_number, role, partner_id, 
        status, last_login_at, created_at, updated_at
      FROM users 
      WHERE role = ?
      ORDER BY full_name ASC
    `;
    const [results] = await query(sql, [role]);
    return results;
  }

  /**
   * Get users by partner
   * @param {String} partnerId - Partner UUID
   * @returns {Array} Array of users
   */
  static async findByPartner(partnerId) {
    const sql = `
      SELECT 
        id, email, full_name, mobile_number, role, partner_id, 
        status, last_login_at, created_at, updated_at
      FROM users 
      WHERE partner_id = ?
      ORDER BY full_name ASC
    `;
    const [results] = await query(sql, [partnerId]);
    return results;
  }

  /**
   * Update password and related fields
   * @param {String} userId - User UUID
   * @param {String} newPasswordHash - New hashed password
   */
  static async updatePassword(userId, newPasswordHash) {
    const sql = `
      UPDATE users 
      SET 
        password_hash = ?,
        password_changed_at = NOW(),
        must_change_password = FALSE,
        first_login = FALSE,
        updated_at = NOW()
      WHERE id = ?
    `;
    await query(sql, [newPasswordHash, userId]);
  }

  /**
   * Add password to history
   * @param {String} userId - User UUID
   * @param {String} passwordHash - Password hash to store
   */
  static async addPasswordToHistory(userId, passwordHash) {
    const { v4: uuidv4 } = require('uuid');
    const sql = `
      INSERT INTO password_history (id, user_id, password_hash, created_at)
      VALUES (?, ?, ?, NOW())
    `;
    await query(sql, [uuidv4(), userId, passwordHash]);
  }

  /**
   * Get password history for user
   * @param {String} userId - User UUID
   * @param {Number} limit - Number of recent passwords to fetch
   * @returns {Array} Array of password history records
   */
  static async getPasswordHistory(userId, limit = 3) {
    // MySQL has issues with parameterized LIMIT in some versions
    // Using string interpolation for LIMIT after validating it's a number
    const safeLimit = parseInt(limit) || 3;
    const sql = `
      SELECT password_hash, created_at
      FROM password_history
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ${safeLimit}
    `;
    const [results] = await query(sql, [userId]);
    return results;
  }

  /**
   * Set must change password flag
   * @param {String} userId - User UUID
   * @param {Boolean} value - True to force password change
   */
  static async setMustChangePassword(userId, value = true) {
    const sql = `
      UPDATE users 
      SET must_change_password = ?, updated_at = NOW()
      WHERE id = ?
    `;
    await query(sql, [value, userId]);
  }

  /**
   * Mark first login as complete
   * @param {String} userId - User UUID
   */
  static async markFirstLoginComplete(userId) {
    const sql = `
      UPDATE users 
      SET first_login = FALSE, updated_at = NOW()
      WHERE id = ?
    `;
    await query(sql, [userId]);
  }
}

module.exports = UserModel;
