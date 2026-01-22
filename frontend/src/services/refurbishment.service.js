import api from "../api/apiClient";

/**
 * Refurbishment Service
 * Handles all refurbishment-related API calls for admin dashboard
 */
const refurbishmentService = {
  /**
   * Get all centers eligible for refurbishment
   * @param {Object} params - Query parameters { limit, offset }
   * @returns {Promise<Object>} - { success, data: { centers, pagination, totalCount } }
   */
  getEligibleCenters: async (params = {}) => {
    try {
      const { limit = 10, offset = 0 } = params;
      const response = await api.get("/admin/refurbishment/eligible-centers", {
        params: { limit, offset },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching eligible centers:", error);
      throw error;
    }
  },

  /**
   * Get all active centers with eligibility status
   * @param {Object} params - Query parameters { limit, offset, region }
   * @returns {Promise<Object>} - { success, data: { centers, pagination, totalCount } }
   */
  getAllCenters: async (params = {}) => {
    try {
      const { limit = 10, offset = 0, region } = params;
      const queryParams = { limit, offset };
      if (region) queryParams.region = region;

      const response = await api.get("/admin/refurbishment/all-centers", {
        params: queryParams,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching all centers:", error);
      throw error;
    }
  },

  /**
   * Get recently refurbished centers
   * @param {Object} params - Query parameters { limit, offset, within }
   * @returns {Promise<Object>} - { success, data: { centers, pagination, totalCount } }
   */
  getRecentlyRefurbished: async (params = {}) => {
    try {
      const { limit = 10, offset = 0, within = 12 } = params;
      const response = await api.get(
        "/admin/refurbishment/recently-refurbished",
        {
          params: { limit, offset, within },
        },
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching recently refurbished centers:", error);
      throw error;
    }
  },

  /**
   * Get dashboard summary with aggregated statistics
   * @param {Object} params - Query parameters { recentlyRefurbishedWithin }
   * @returns {Promise<Object>} - { success, data: { summary, eligibleCenters, recentlyRefurbished } }
   */
  getDashboardSummary: async (params = {}) => {
    try {
      const { recentlyRefurbishedWithin = 12 } = params;
      const response = await api.get("/admin/refurbishment/dashboard", {
        params: { recentlyRefurbishedWithin },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching dashboard summary:", error);
      throw error;
    }
  },

  /**
   * Get eligibility details for a specific center
   * @param {string} centerId - Center UUID
   * @returns {Promise<Object>} - { success, data: { centerDetails, eligibilityDetails } }
   */
  getCenterEligibility: async (centerId) => {
    try {
      const response = await api.get(
        `/admin/refurbishment/centers/${centerId}/eligibility`,
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching center eligibility:", error);
      throw error;
    }
  },
};

export default refurbishmentService;
