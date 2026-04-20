import apiClient from "../api/client";

/**
 * User Service
 * API calls for user management
 */

/**
 * Get all users with pagination and filters
 */
export const getUsers = async (params = {}) => {
  const response = await apiClient.get("/users", { params });
  return response.data;
};

/**
 * Get filter options for users
 */
export const getUserFilterOptions = async () => {
  const response = await apiClient.get("/users/filter-options");
  return response.data;
};

/**
 * Get user by ID
 */
export const getUserById = async (id) => {
  const response = await apiClient.get(`/users/${id}`);
  return response.data;
};

/**
 * Get users by role
 */
export const getUsersByRole = async (role) => {
  const response = await apiClient.get(`/users/role/${role}`);
  return response.data;
};

/**
 * Get user statistics
 */
export const getUserStats = async () => {
  const response = await apiClient.get("/users/stats");
  return response.data;
};

/**
 * Create new user
 */
export const createUser = async (userData) => {
  const response = await apiClient.post("/users", userData);
  return response.data;
};

/**
 * Update user
 */
export const updateUser = async (id, userData) => {
  const response = await apiClient.put(`/users/${id}`, userData);
  return response.data;
};

/**
 * Delete user (soft delete by default)
 */
export const deleteUser = async (id, hard = false) => {
  const params = hard ? { hard: "true" } : {};
  const response = await apiClient.delete(`/users/${id}`, { params });
  return response.data;
};

/**
 * Update user status (activate/deactivate/suspend)
 */
export const updateUserStatus = async (id, status) => {
  const response = await apiClient.patch(`/users/${id}/status`, { status });
  return response.data;
};

/**
 * Reset user password
 */
export const resetUserPassword = async (id) => {
  const response = await apiClient.post(`/users/${id}/reset-password`);
  return response.data;
};

/**
 * Generate a new temporary password and email it to a partner user.
 */
export const resendUserCredentials = async (id) => {
  const response = await apiClient.post(`/users/${id}/resend-credentials`);
  return response.data;
};

/**
 * Export users as CSV
 */
export const exportUsers = async (params = {}) => {
  const response = await apiClient.get("/users", {
    params: { ...params, format: "csv" },
    responseType: "blob",
  });
  return response.data;
};

/**
 * Download CSV blob
 */
export const downloadCSV = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
