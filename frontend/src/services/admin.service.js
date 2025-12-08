import apiClient from "../api/client";

/**
 * Get database statistics
 * @returns {Promise} Database statistics
 */
export const getDatabaseStats = async () => {
  try {
    const response = await apiClient.get("/admin/database-stats");
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Reset database (SUPER_ADMIN only)
 * @returns {Promise} Reset results
 */
export const resetDatabase = async () => {
  try {
    const response = await apiClient.post("/admin/reset-database");
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export default {
  getDatabaseStats,
  resetDatabase,
};
