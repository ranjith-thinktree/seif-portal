import apiClient from "./client";
import { API_ENDPOINTS, STORAGE_KEYS } from "../constants";

/**
 * Auth API Service
 * All authentication-related API calls
 */
const authApi = {
  /**
   * Login user
   * @param {Object} credentials - User credentials
   * @param {string} credentials.email - User email
   * @param {string} credentials.password - User password
   * @returns {Promise} Response with tokens and user data
   */
  login: async (credentials) => {
    const response = await apiClient.post(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );
    return response.data;
  },

  /**
   * Register new user
   * @param {Object} userData - User registration data
   * @returns {Promise} Response with tokens and user data
   */
  register: async (userData) => {
    const response = await apiClient.post(
      API_ENDPOINTS.AUTH.REGISTER,
      userData
    );
    return response.data;
  },

  /**
   * Logout user
   * @returns {Promise} Response confirming logout
   */
  logout: async () => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    return response.data;
  },

  /**
   * Refresh access token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise} Response with new access token
   */
  refreshToken: async (refreshToken) => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.REFRESH, {
      refreshToken,
    });
    return response.data;
  },

  /**
   * Get current user profile
   * @returns {Promise} Response with user profile data
   */
  getProfile: async () => {
    const response = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
    return response.data;
  },

  /**
   * Update user profile
   * @param {Object} profileData - Profile data to update
   * @returns {Promise} Response with updated user data
   */
  updateProfile: async (profileData) => {
    const response = await apiClient.put(
      API_ENDPOINTS.AUTH.UPDATE_PROFILE,
      profileData
    );
    return response.data;
  },

  /**
   * Change user password
   * @param {Object} passwordData - Password change data
   * @param {string} passwordData.currentPassword - Current password
   * @param {string} passwordData.newPassword - New password
   * @returns {Promise} Response confirming password change
   */
  changePassword: async (passwordData) => {
    const response = await apiClient.post(
      API_ENDPOINTS.AUTH.CHANGE_PASSWORD,
      passwordData
    );
    return response.data;
  },

  /**
   * Verify JWT token
   * @returns {Promise} Response with token validity
   */
  verifyToken: async () => {
    const response = await apiClient.get(API_ENDPOINTS.AUTH.VERIFY_TOKEN);
    return response.data;
  },

  /**
   * Store authentication tokens
   * @param {string} accessToken - JWT access token
   * @param {string} refreshToken - JWT refresh token
   */
  storeTokens: (accessToken, refreshToken) => {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  },

  /**
   * Store user data
   * @param {Object} user - User object
   */
  storeUser: (user) => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  },

  /**
   * Clear all authentication data
   */
  clearAuth: () => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  },

  /**
   * Get stored user data
   * @returns {Object|null} User object or null
   */
  getStoredUser: () => {
    try {
      const user = localStorage.getItem(STORAGE_KEYS.USER);
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error("Error parsing stored user data:", error);
      // Clear corrupted data
      localStorage.removeItem(STORAGE_KEYS.USER);
      return null;
    }
  },

  /**
   * Get stored access token
   * @returns {string|null} Access token or null
   */
  getStoredAccessToken: () => {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  },

  /**
   * Get stored refresh token
   * @returns {string|null} Refresh token or null
   */
  getStoredRefreshToken: () => {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  },
};

export default authApi;
