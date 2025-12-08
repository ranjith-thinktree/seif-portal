import apiClient from "../api/client";

const API_BASE = "/notifications";

/**
 * Notification Service
 * Handles API calls for notifications
 */

/**
 * Get all notifications
 */
export const getNotifications = async (params = {}) => {
  const response = await apiClient.get(API_BASE, { params });
  return response.data;
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async () => {
  const response = await apiClient.get(`${API_BASE}/unread-count`);
  return response.data;
};

/**
 * Get notification by ID
 */
export const getNotificationById = async (id) => {
  const response = await apiClient.get(`${API_BASE}/${id}`);
  return response.data;
};

/**
 * Mark notification as read
 */
export const markAsRead = async (id) => {
  const response = await apiClient.patch(`${API_BASE}/${id}/read`);
  return response.data;
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async () => {
  const response = await apiClient.post(`${API_BASE}/mark-all-read`);
  return response.data;
};

/**
 * Delete notification
 */
export const deleteNotification = async (id) => {
  const response = await apiClient.delete(`${API_BASE}/${id}`);
  return response.data;
};

/**
 * Get grouped notifications
 */
export const getGroupedNotifications = async (params = {}) => {
  const response = await apiClient.get(`${API_BASE}/grouped`, { params });
  return response.data;
};

/**
 * Get upload center details
 */
export const getUploadCenterDetails = async (uploadId) => {
  const response = await apiClient.get(
    `${API_BASE}/upload/${uploadId}/centers`
  );
  return response.data;
};
