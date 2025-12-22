import authApi from "../api/auth.api";

/**
 * Auth Service
 * High-level authentication service that wraps the API calls
 */
export const authService = {
  /**
   * Change user password
   * @param {Object} passwordData - Password data
   * @param {String} passwordData.currentPassword - Current password
   * @param {String} passwordData.newPassword - New password
   * @param {String} passwordData.confirmPassword - Confirm password
   * @returns {Promise} API response
   */
  changePassword: async (passwordData) => {
    return await authApi.changePassword(passwordData);
  },

  /**
   * Get user profile
   * @returns {Promise} API response with user data
   */
  getProfile: async () => {
    return await authApi.getProfile();
  },

  /**
   * Update user profile
   * @param {Object} profileData - Profile update data
   * @returns {Promise} API response
   */
  updateProfile: async (profileData) => {
    return await authApi.updateProfile(profileData);
  },
};

export default authService;
