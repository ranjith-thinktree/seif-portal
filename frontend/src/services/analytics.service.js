import apiClient from "../api/client";

const API_BASE = "/analytics";

/**
 * Get consolidated student analytics with filters
 * @param {Object} filters - Financial year, partner, center, gender filters
 * @returns {Promise} Analytics data
 */
export const getConsolidatedAnalytics = async (filters = {}) => {
  const params = {};

  // Only send non-empty and non-'all' values
  if (filters.financialYear && filters.financialYear !== "all") {
    params.financialYear = filters.financialYear;
  }
  if (filters.partnerId && filters.partnerId !== "all") {
    params.partnerId = filters.partnerId;
  }
  if (filters.centerId && filters.centerId !== "all") {
    params.centerId = filters.centerId;
  }
  if (filters.gender && filters.gender !== "all") {
    params.gender = filters.gender;
  }

  const response = await apiClient.get(`${API_BASE}/consolidated`, { params });
  return response.data;
};

/**
 * Get filter options (partners, centers)
 * @returns {Promise} Filter options
 */
export const getFilterOptions = async () => {
  const response = await apiClient.get(`${API_BASE}/filter-options`);
  return response.data;
};

const analyticsService = {
  getConsolidatedAnalytics,
  getFilterOptions,
};

export default analyticsService;
