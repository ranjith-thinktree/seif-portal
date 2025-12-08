const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../../config');
const UserModel = require('../../../models/User.model');
const { generateUUID } = require('../../../utils/uuid.util');
const { AuthenticationError, ConflictError, NotFoundError } = require('../../../utils/error.util');
const { ERROR_MESSAGES, USER_STATUS } = require('../../../constants');

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
    // Find user by email
    const user = await UserModel.findByEmail(email);

    if (!user) {
      throw new AuthenticationError(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    // Check if user is active
    if (user.status === USER_STATUS.INACTIVE) {
      throw new AuthenticationError(ERROR_MESSAGES.USER_INACTIVE);
    }

    if (user.status === USER_STATUS.SUSPENDED) {
      throw new AuthenticationError(ERROR_MESSAGES.USER_SUSPENDED);
    }

    // Verify password
    const isPasswordValid = await this.comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      throw new AuthenticationError(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    // Update last login
    await UserModel.updateLastLogin(user.id);

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Remove password hash from response
    delete user.password_hash;

    return {
      user,
      accessToken,
      refreshToken,
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
   * @returns {Object} New access token
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

    return {
      accessToken: newAccessToken,
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
   * Change password
   * @param {String} userId - User ID
   * @param {String} oldPassword - Current password
   * @param {String} newPassword - New password
   */
  static async changePassword(userId, oldPassword, newPassword) {
    const user = await UserModel.findById(userId);

    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Verify old password
    const isPasswordValid = await this.comparePassword(oldPassword, user.password_hash);

    if (!isPasswordValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await this.hashPassword(newPassword);

    // Update password
    await UserModel.update(userId, { password_hash: newPasswordHash });
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
