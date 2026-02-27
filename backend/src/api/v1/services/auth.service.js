const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../../config');
const UserModel = require('../../../models/User.model');
const { generateUUID } = require('../../../utils/uuid.util');
const {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} = require('../../../utils/error.util');
const { ERROR_MESSAGES, USER_STATUS } = require('../../../constants');
const { validatePassword } = require('../../../utils/password.util');

/**
 * Authentication Service
 * Handles login, registration, token generation, password hashing
 */

class AuthService {
  /**
   * Hash password using bcrypt
   * @param {String} password - Plain text password
   * @returns {String} Hashed password
   */
  static async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  }

  /**
   * Compare password with hash
   * @param {String} password - Plain text password
   * @param {String} hash - Hashed password
   * @returns {Boolean} True if match, false otherwise
   */
  static async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT access token
   * @param {Object} user - User object
   * @returns {String} JWT token
   */
  static generateAccessToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      partner_id: user.partner_id,
      full_name: user.full_name,
      type: 'access',
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.accessTokenExpiry,
    });
  }

  /**
   * Generate JWT refresh token
   * @param {Object} user - User object
   * @returns {String} JWT refresh token
   */
  static generateRefreshToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      type: 'refresh',
    };

    return jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshTokenExpiry,
    });
  }

  /**
   * Verify JWT token
   * @param {String} token - JWT token
   * @param {String} type - Token type ('access' or 'refresh')
   * @returns {Object} Decoded token payload
   */
  static verifyToken(token, type = 'access') {
    try {
      const secret = type === 'refresh' ? config.jwt.refreshSecret : config.jwt.secret;
      return jwt.verify(token, secret);
    } catch (error) {
      throw new AuthenticationError(ERROR_MESSAGES.TOKEN_INVALID);
    }
  }

  /**
   * Login user
   * @param {String} email - User email
   * @param {String} password - User password
   * @returns {Object} User object with tokens
   */
  static async login(email, password) {
    console.log('🟡 Service login called:', email);

    // Find user by email
    console.log('🟡 Finding user...');
    const user = await UserModel.findByEmail(email);
    console.log('🟡 User found:', !!user);

    if (!user) {
      // More specific error for non-existent email
      throw new AuthenticationError(
        'No account found with this email address. Please check your email or contact your administrator.'
      );
    }

    // Check if user is active
    if (user.status === USER_STATUS.INACTIVE) {
      throw new AuthenticationError(
        'Your account is inactive. Please contact your administrator to activate your account.'
      );
    }

    if (user.status === USER_STATUS.SUSPENDED) {
      throw new AuthenticationError(
        'Your account has been suspended. Please contact your administrator for assistance.'
      );
    }

    // Verify password
    console.log('🟡 Comparing passwords...');
    const isPasswordValid = await this.comparePassword(password, user.password_hash);
    console.log('🟡 Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      // More helpful error for wrong password
      throw new AuthenticationError(
        'Incorrect password. If you recently received new credentials, please use the temporary password from your email. Contact your administrator if you need a password reset.'
      );
    }

    // Update last login (but not first_login yet - that happens after password change)
    await UserModel.updateLastLogin(user.id);

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Check if user must change password
    const mustChangePassword =
      user.must_change_password === 1 || user.must_change_password === true;

    // Remove password hash from response
    delete user.password_hash;

    return {
      user: {
        ...user,
        must_change_password: mustChangePassword,
      },
      accessToken,
      refreshToken,
      mustChangePassword, // Also send at root level for easy access
    };
  }

  /**
   * Register new user
   * @param {Object} userData - User registration data
   * @returns {Object} Created user with tokens
   */
  static async register(userData) {
    // Check if email already exists
    const existingUser = await UserModel.findByEmail(userData.email);

    if (existingUser) {
      throw new ConflictError(ERROR_MESSAGES.USER_ALREADY_EXISTS);
    }

    // Hash password
    const passwordHash = await this.hashPassword(userData.password);

    // Create user
    const newUser = await UserModel.create({
      id: generateUUID(),
      email: userData.email,
      password_hash: passwordHash,
      full_name: userData.full_name,
      mobile_number: userData.mobile_number || null,
      role: userData.role,
      partner_id: userData.partner_id || null,
      status: USER_STATUS.ACTIVE,
    });

    // Generate tokens
    const accessToken = this.generateAccessToken(newUser);
    const refreshToken = this.generateRefreshToken(newUser);

    // Remove password hash from response
    delete newUser.password_hash;

    return {
      user: newUser,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token
   * @param {String} refreshToken - Refresh token
   * @returns {Object} New access token and user data
   */
  static async refreshAccessToken(refreshToken) {
    // Verify refresh token
    const decoded = this.verifyToken(refreshToken, 'refresh');

    // Get user from database
    const user = await UserModel.findById(decoded.id);

    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Check if user is active
    if (user.status !== USER_STATUS.ACTIVE) {
      throw new AuthenticationError(ERROR_MESSAGES.USER_INACTIVE);
    }

    // Generate new access token
    const newAccessToken = this.generateAccessToken(user);

    // Remove password hash from response
    delete user.password_hash;

    return {
      accessToken: newAccessToken,
      user, // Include user data for frontend to update
    };
  }

  /**
   * Get user profile
   * @param {String} userId - User ID
   * @returns {Object} User profile
   */
  static async getProfile(userId) {
    const user = await UserModel.findById(userId);

    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Remove password hash
    delete user.password_hash;

    return user;
  }

  /**
   * Change password with validation and history tracking
   * @param {String} userId - User ID
   * @param {String} currentPassword - Current password
   * @param {String} newPassword - New password
   * @returns {Object} Success message
   */
  static async changePassword(userId, currentPassword, newPassword) {
    console.log('[AUTH_SERVICE] changePassword called for userId:', userId);
    // Get user with password hash
    const user = await UserModel.findById(userId);
    console.log('[AUTH_SERVICE] User found:', user ? 'YES' : 'NO');

    if (!user) {
      console.log('[AUTH_SERVICE] User not found, throwing error');
      throw new NotFoundError('User not found');
    }

    // ESSCI users cannot change their own password
    if (user.role === 'ESSCI') {
      throw new AuthenticationError(
        'ESSCI users cannot change their password. Please contact your administrator for assistance.'
      );
    }

    // Verify current password
    console.log('[AUTH_SERVICE] Verifying current password');
    const isPasswordValid = await this.comparePassword(currentPassword, user.password_hash);
    console.log('[AUTH_SERVICE] Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('[AUTH_SERVICE] Current password incorrect');
      throw new AuthenticationError('Current password is incorrect. Please try again.');
    }

    // Validate new password strength
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      throw new ValidationError('Password does not meet security requirements', {
        errors: validation.errors,
        requirements: validation.errors,
      });
    }

    // Check if new password is same as current password
    const isSamePassword = await this.comparePassword(newPassword, user.password_hash);
    if (isSamePassword) {
      throw new ValidationError('New password must be different from your current password');
    }

    // Get password history (last 3 passwords)
    console.log('[AUTH_SERVICE] Getting password history');
    const passwordHistory = await UserModel.getPasswordHistory(userId, 3);
    console.log('[AUTH_SERVICE] Password history entries:', passwordHistory.length);

    // Check if new password matches any recent passwords
    for (const historyEntry of passwordHistory) {
      const matchesOldPassword = await this.comparePassword(
        newPassword,
        historyEntry.password_hash
      );
      if (matchesOldPassword) {
        throw new ValidationError(
          'You cannot reuse any of your last 3 passwords. Please choose a different password.'
        );
      }
    }

    // Hash new password
    console.log('[AUTH_SERVICE] Hashing new password');
    const newPasswordHash = await this.hashPassword(newPassword);
    console.log('[AUTH_SERVICE] Password hashed successfully');

    // Add current password to history before updating
    console.log('[AUTH_SERVICE] Adding password to history');
    await UserModel.addPasswordToHistory(userId, user.password_hash);
    console.log('[AUTH_SERVICE] Password added to history');

    // Update password and related fields
    console.log('[AUTH_SERVICE] Updating password in database');
    await UserModel.updatePassword(userId, newPasswordHash);
    console.log('[AUTH_SERVICE] Password updated successfully');

    return {
      message: 'Password changed successfully. Please login again with your new password.',
    };
  }

  /**
   * Update user profile
   * @param {String} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated user
   */
  static async updateProfile(userId, updateData) {
    const user = await UserModel.findById(userId);

    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Check if email is being changed and already exists
    if (updateData.email && updateData.email !== user.email) {
      const emailExists = await UserModel.emailExists(updateData.email, userId);
      if (emailExists) {
        throw new ConflictError(ERROR_MESSAGES.USER_ALREADY_EXISTS);
      }
    }

    // Update user
    const updatedUser = await UserModel.update(userId, updateData);

    // Remove password hash
    delete updatedUser.password_hash;

    return updatedUser;
  }
}

module.exports = AuthService;
