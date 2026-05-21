import apiClient from "../api/client";

/**
 * Partner Service - API calls for partner operations
 */
const partnerService = {
  /**
   * Save edited students data
   */
  saveEditedStudents: async (uploadId, centerId, data) => {
    const response = await apiClient.post(
      `/partners/uploads/${uploadId}/centers/${centerId}/save-edits`,
      data,
    );
    return response.data;
  },

  /**
   * Resubmit upload after editing
   */
  resubmitUpload: async (uploadId) => {
    const response = await apiClient.post(
      `/partners/uploads/${uploadId}/resubmit`,
    );
    return response.data;
  },

  /**
   * Get upload changes/edit history
   */
  getUploadChanges: async (uploadId) => {
    const response = await apiClient.get(
      `/partners/uploads/${uploadId}/changes`,
    );
    return response.data;
  },

  /**
   * Get rejected uploads for partner
   */
  getRejectedUploads: async (params) => {
    const response = await apiClient.get("/partners/rejected-uploads", {
      params,
    });
    return response.data;
  },

  /**
   * Get rejected centers for an upload
   */
  getRejectedCenters: async (uploadId) => {
    const response = await apiClient.get(
      `/partners/uploads/${uploadId}/rejected-centers`,
    );
    return response.data;
  },

  /**
   * Get simple list of approved partners for admin dropdowns
   * @returns {Promise<Array>} Array of {id, name}
   */
  getSimpleList: async () => {
    const response = await apiClient.get("/partners/simple-list");
    return response.data;
  },
};

export default partnerService;
