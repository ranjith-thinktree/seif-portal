import apiClient from "../api/client";

/**
 * Employment Service
 * Handles employment data uploads and management for partners
 */

/**
 * Upload employment CSV file
 * @param {File} file - Employment CSV file
 * @param {string|null} targetPartnerId - For admin uploads on behalf of partner
 * @returns {Promise}
 */
export const uploadEmploymentCSV = async (file, targetPartnerId = null) => {
  const formData = new FormData();
  formData.append("file", file);
  if (targetPartnerId) formData.append("targetPartnerId", targetPartnerId);

  const response = await apiClient.post("/employment/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

/**
 * Download employment template
 * @returns {Promise}
 */
export const downloadEmploymentTemplate = async () => {
  try {
    const response = await apiClient.get("/employment/template", {
      responseType: "blob",
    });

    // Check if response is actually a blob
    if (!response.data || response.data.size === 0) {
      throw new Error("Received empty file from server");
    }

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `Employment_Data_Template_${Date.now()}.xlsx`,
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    console.error("Employment template download error:", error);
    console.error("Error response:", error.response?.data);
    console.error("Error status:", error.response?.status);
    throw error;
  }
};

/**
 * Get employment upload history
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise}
 */
export const getEmploymentUploads = async (page = 1, limit = 10) => {
  const response = await apiClient.get("/employment/uploads", {
    params: { page, limit },
  });

  return response.data;
};

/**
 * Get employment upload details with error log
 * @param {string} uploadId - Upload ID
 * @returns {Promise}
 */
export const getEmploymentUploadDetails = async (uploadId) => {
  const response = await apiClient.get(`/employment/uploads/${uploadId}`);
  return response.data;
};

/**
 * Check if partner has approved students
 * @returns {Promise<{hasApprovedStudents: boolean, approvedCount: number}>}
 */
export const checkApprovedStudents = async () => {
  const response = await apiClient.get("/employment/check-approved-students");
  return response.data;
};
