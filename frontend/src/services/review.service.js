import apiClient from "../api/client";

/**
 * Review Service
 * Handles upload review and approval operations
 */
const reviewService = {
  /**
   * Get upload details for review
   * @param {string} uploadId - The upload ID
   * @returns {Promise<Object>} Upload details with review statistics
   */
  getUploadForReview: async (uploadId) => {
    const response = await apiClient.get(`/review/${uploadId}`);
    return response.data;
  },

  /**
   * Get pending centers for an upload
   * @param {string} uploadId - The upload ID
   * @param {Object} params - Query parameters (page, limit, search)
   * @returns {Promise<Object>} Centers data with pagination
   */
  getPendingCenters: async (uploadId, params = {}) => {
    const { page = 1, limit = 10, search = "" } = params;
    const response = await apiClient.get(`/review/${uploadId}/centers`, {
      params: { page, limit, search },
    });
    return response.data;
  },

  /**
   * Get students for a center in upload
   * @param {string} uploadId - The upload ID
   * @param {string} centerId - The center ID
   * @param {Object} params - Query parameters (page, limit, search)
   * @returns {Promise<Object>} Students data with center details and pagination
   */
  getCenterStudents: async (uploadId, centerId, params = {}) => {
    const { page = 1, limit = 10, search = "" } = params;
    const response = await apiClient.get(
      `/review/${uploadId}/centers/${centerId}/students`,
      {
        params: { page, limit, search },
      }
    );
    return response.data;
  },

  /**
   * Approve a center
   * @param {string} uploadId - The upload ID
   * @param {string} centerId - The center ID
   * @returns {Promise<Object>} Approval result
   */
  approveCenter: async (uploadId, centerId) => {
    const response = await apiClient.post(
      `/review/${uploadId}/centers/${centerId}/approve`
    );
    return response.data;
  },

  /**
   * Save admin edits to students (during initial review)
   * Saves to uploaded_students + logs in data_edit_logs with admin user ID
   * @param {string} uploadId - The upload ID
   * @param {string} centerId - The center ID
   * @param {Object} data - { students: [], changes: [] }
   * @returns {Promise<Object>} Save result
   */
  saveAdminEdits: async (uploadId, centerId, data) => {
    const response = await apiClient.put(
      `/review/${uploadId}/centers/${centerId}/save-edits`,
      data
    );
    return response.data;
  },

  /**
   * Reject a center
   * @param {string} uploadId - The upload ID
   * @param {string} centerId - The center ID
   * @param {string} reason - Rejection reason (required, min 10 chars)
   * @param {string} remarks - Optional rejection remarks
   * @returns {Promise<Object>} Rejection result
   */
  rejectCenter: async (uploadId, centerId, reason, remarks = "") => {
    const response = await apiClient.post(
      `/review/${uploadId}/centers/${centerId}/reject`,
      { reason, remarks }
    );
    return response.data;
  },

  /**
   * Get rejected centers for partner
   * @param {string} uploadId - The upload ID
   * @returns {Promise<Object>} Rejected centers data
   */
  getRejectedCenters: async (uploadId) => {
    const response = await apiClient.get(`/review/${uploadId}/rejected`);
    return response.data;
  },

  /**
   * Get upload details for partner review/edit
   * @param {string} uploadId - The upload ID
   * @returns {Promise<Object>} Upload details with all centers
   */
  getUploadForPartnerReview: async (uploadId) => {
    const response = await apiClient.get(`/review/${uploadId}/partner-review`);
    return response.data;
  },

  /**
   * Resubmit edited data (creates version 2)
   * @param {string} uploadId - The original upload ID
   * @param {Array} editedStudents - Array of edited student records
   * @returns {Promise<Object>} Resubmission result
   */
  resubmitUpload: async (uploadId, editedStudents) => {
    const response = await apiClient.post(`/uploads/${uploadId}/resubmit`, {
      editedStudents,
    });
    return response.data;
  },

  // ========== NEW TWO-TAB SYSTEM ==========

  /**
   * Tab 1: Get pending centers for approval (from centers table)
   * @param {Object} params - Query parameters (page, limit, search, partner_id)
   * @returns {Promise<Object>} Centers data with pagination
   */
  getPendingCentersForApproval: async (params = {}) => {
    const { page = 1, limit = 10, search = "", partner_id = "" } = params;
    const response = await apiClient.get("/review/pending-centers", {
      params: { page, limit, search, partner_id },
    });
    return response.data;
  },

  /**
   * Tab 1: Approve center directly (from centers table)
   * @param {string} centerId - The center ID
   * @returns {Promise<Object>} Approval result
   */
  approveCenterDirect: async (centerId) => {
    const response = await apiClient.post(
      `/review/centers/${centerId}/approve`
    );
    return response.data;
  },

  /**
   * Tab 1: Reject center directly (from centers table)
   * @param {string} centerId - The center ID
   * @param {string} reason - Rejection reason (required)
   * @param {string} remarks - Optional remarks
   * @returns {Promise<Object>} Rejection result
   */
  rejectCenterDirect: async (centerId, reason, remarks = "") => {
    const response = await apiClient.post(
      `/review/centers/${centerId}/reject`,
      {
        reason,
        remarks,
      }
    );
    return response.data;
  },

  /**
   * Tab 2: Get pending data uploads (batches/students)
   * @param {Object} params - Query parameters (page, limit, search, partner_id)
   * @returns {Promise<Object>} Uploads data with pagination
   */
  getPendingDataUploads: async (params = {}) => {
    const { page = 1, limit = 10, search = "", partner_id = "" } = params;
    const response = await apiClient.get("/review/pending-uploads", {
      params: { page, limit, search, partner_id },
    });
    return response.data;
  },
};

export default reviewService;
