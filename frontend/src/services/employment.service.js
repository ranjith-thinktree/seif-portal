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
 * @param {string|null} targetPartnerId - For admin downloads on behalf of partner
 * @param {{ fromYear: number, fromMonth: number, toYear: number, toMonth: number }|null} period
 * @returns {Promise}
 */
export const downloadEmploymentTemplate = async (
  targetPartnerId = null,
  period = null,
) => {
  try {
    const params = {};
    if (targetPartnerId) params.targetPartnerId = targetPartnerId;
    if (period) {
      params.fromYear = period.fromYear;
      params.fromMonth = period.fromMonth;
      params.toYear = period.toYear;
      params.toMonth = period.toMonth;
    }

    const response = await apiClient.get("/employment/template", {
      responseType: "blob",
      params,
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
    // When responseType is 'blob', error response data is also a Blob.
    // Parse it back to JSON so callers can read error.response.data.message.
    if (error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const json = JSON.parse(text);
        error.response.data = json;
      } catch {
        // Blob wasn't valid JSON — leave as-is
      }
    }
    console.error("Employment template download error:", error);
    throw error;
  }
};

/**
 * Get available years + months that have approved student data for a partner
 * @param {string|null} targetPartnerId - For admin calls
 * @returns {Promise<{ periods: Array<{ year: number, months: number[] }> }>}
 */
export const fetchAvailablePeriods = async (targetPartnerId = null) => {
  const params = {};
  if (targetPartnerId) params.targetPartnerId = targetPartnerId;
  const response = await apiClient.get("/employment/template/periods", {
    params,
  });
  return response.data;
};

/**
 * Get employment upload history
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise}
 */
export const getEmploymentUploads = async (
  page = 1,
  limit = 10,
  targetPartnerId = null,
) => {
  const params = { page, limit };
  if (targetPartnerId) params.targetPartnerId = targetPartnerId;

  const response = await apiClient.get("/employment/uploads", {
    params,
  });

  return response.data;
};

/**
 * Get employment upload details with error log
 * @param {string} uploadId - Upload ID
 * @returns {Promise}
 */
export const getEmploymentUploadDetails = async (
  uploadId,
  targetPartnerId = null,
) => {
  const params = targetPartnerId ? { targetPartnerId } : {};
  const response = await apiClient.get(`/employment/uploads/${uploadId}`, {
    params,
  });
  return response.data;
};

/**
 * Get attachment list for an employment upload
 * @param {string} uploadId - Upload ID
 */
export const getEmploymentUploadAttachments = async (uploadId) => {
  const response = await apiClient.get(
    `/employment/uploads/${uploadId}/attachments`,
  );
  return response.data;
};

/**
 * Download one attachment for an employment upload
 * @param {string} uploadId - Upload ID
 * @param {number} attachmentIndex - Attachment index in the upload record
 * @param {string} fileName - Suggested file name
 */
export const downloadEmploymentAttachment = async (
  uploadId,
  attachmentIndex,
  fileName,
) => {
  const response = await apiClient.get(
    `/employment/uploads/${uploadId}/attachments/${attachmentIndex}/download`,
    {
      responseType: "blob",
    },
  );
  const contentType = response.headers?.["content-type"] || "";
  if (contentType.includes("application/json")) {
    const text = await response.data.text();
    const json = JSON.parse(text);
    if (json?.data?.downloadUrl) {
      window.open(json.data.downloadUrl, "_blank");
      return;
    }
  }
  const url = window.URL.createObjectURL(response.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName || "attachment";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

/**
 * Download the original employment data file
 * @param {string} uploadId - Upload ID
 * @param {string} fileName - Original file name (used for saving)
 */
export const downloadEmploymentFile = async (uploadId, fileName) => {
  const response = await apiClient.get(
    `/employment/uploads/${uploadId}/download`,
    {
      responseType: "blob",
    },
  );
  // If backend returned JSON (presigned URL), handle that case
  const contentType = response.headers?.["content-type"] || "";
  if (contentType.includes("application/json")) {
    const text = await response.data.text();
    const json = JSON.parse(text);
    if (json?.data?.downloadUrl) {
      window.open(json.data.downloadUrl, "_blank");
      return;
    }
  }
  const url = window.URL.createObjectURL(response.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName || "employment_data";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

/**
 * Check if partner has approved students
 * @returns {Promise<{hasApprovedStudents: boolean, approvedCount: number}>}
 */
export const checkApprovedStudents = async (targetPartnerId = null) => {
  const params = targetPartnerId ? { targetPartnerId } : {};
  const response = await apiClient.get("/employment/check-approved-students", {
    params,
  });
  return response.data;
};

// ═══════════════════════════════════════════
// Admin: Employment Review Flow APIs
// ═══════════════════════════════════════════

export const getAdminReviewUploads = async (params = {}) => {
  const response = await apiClient.get("/employment/admin/review-uploads", {
    params,
  });
  return response.data;
};

export const getUploadCenterSummary = async (uploadId) => {
  const response = await apiClient.get(
    `/employment/admin/review-uploads/${uploadId}/centers`,
  );
  return response.data;
};

export const getCenterEmploymentRecords = async (uploadId, centerId) => {
  const response = await apiClient.get(
    `/employment/admin/review-uploads/${uploadId}/centers/${centerId}`,
  );
  return response.data;
};

export const updateEmploymentRecord = async (id, data) => {
  const response = await apiClient.put(`/employment/admin/records/${id}`, data);
  return response.data;
};

export const deleteEmploymentRecord = async (id) => {
  const response = await apiClient.delete(`/employment/admin/records/${id}`);
  return response.data;
};

export const approveEmploymentUpload = async (uploadId, remarks = "") => {
  const response = await apiClient.post(
    `/employment/admin/review-uploads/${uploadId}/approve`,
    { remarks },
  );
  return response.data;
};

export const rejectEmploymentUpload = async (
  uploadId,
  reason,
  remarks = "",
) => {
  const response = await apiClient.post(
    `/employment/admin/review-uploads/${uploadId}/reject`,
    { reason, remarks },
  );
  return response.data;
};

export const getApprovedEmploymentRecords = async (params = {}) => {
  const response = await apiClient.get("/employment/admin/records", { params });
  return response.data;
};

export const addEmploymentRecord = async (data) => {
  const response = await apiClient.post("/employment/add", data);
  return response.data;
};
