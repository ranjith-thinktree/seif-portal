import apiClient from "../api/client";

/**
 * Upload Service
 * Handles all API calls related to data uploads
 */

/**
 * Download CSV template (public - generic)
 */
export const downloadTemplate = async () => {
  const response = await apiClient.get("/uploads/template", {
    responseType: "blob",
  });

  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "SEIF_Data_Upload_Template.csv");
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);

  return { success: true };
};

/**
 * Download CSV template with dynamic partner name (authenticated)
 */
export const downloadDynamicTemplate = async () => {
  const response = await apiClient.get("/uploads/download-template", {
    responseType: "blob",
  });

  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "SEIF_Data_Upload_Template.csv");
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);

  return { success: true };
};

/**
 * Upload CSV file for validation and preview
 */
export const uploadCSV = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post("/uploads", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

/**
 * Confirm upload after preview
 */
export const confirmUpload = async (filePath, fileName) => {
  const response = await apiClient.post("/uploads/confirm", {
    filePath,
    fileName,
  });

  return response.data;
};

/**
 * Get partner's upload history
 */
export const getUploads = async (page = 1, limit = 10) => {
  const response = await apiClient.get("/uploads", {
    params: { page, limit },
  });

  return response.data;
};

/**
 * Get upload details
 */
export const getUploadDetails = async (uploadId) => {
  const response = await apiClient.get(`/uploads/${uploadId}`);
  return response.data;
};

/**
 * Get all uploads for admin review
 */
export const getAllUploadsForAdmin = async (
  status = null,
  page = 1,
  limit = 10
) => {
  const params = { page, limit };
  if (status) params.status = status;

  const response = await apiClient.get("/uploads/admin/all", { params });
  return response.data;
};

/**
 * Get upload details for admin review
 */
export const getUploadDetailsForAdmin = async (uploadId) => {
  const response = await apiClient.get(`/uploads/admin/${uploadId}`);
  return response.data;
};

/**
 * Approve upload
 */
export const approveUpload = async (uploadId, remarks = null) => {
  const response = await apiClient.post(`/uploads/${uploadId}/approve`, {
    remarks,
  });
  return response.data;
};

/**
 * Reject upload
 */
export const rejectUpload = async (
  uploadId,
  rejectionReason,
  remarks = null
) => {
  const response = await apiClient.post(`/uploads/${uploadId}/reject`, {
    rejectionReason,
    remarks,
  });
  return response.data;
};

/**
 * Get students for a specific batch (paginated)
 */
export const getBatchStudents = async (batchId, page = 1, limit = 50) => {
  const response = await apiClient.get(`/uploads/batches/${batchId}/students`, {
    params: { page, limit },
  });
  return response.data;
};

/**
 * Delete upload
 */
export const deleteUpload = async (uploadId) => {
  const response = await apiClient.delete(`/uploads/${uploadId}`);
  return response.data;
};

/**
 * Bulk delete uploads
 */
export const bulkDeleteUploads = async (ids) => {
  const response = await apiClient.post("/uploads/bulk-delete", { ids });
  return response.data;
};

export default {
  downloadTemplate,
  downloadDynamicTemplate,
  uploadCSV,
  confirmUpload,
  getUploads,
  getUploadDetails,
  getAllUploadsForAdmin,
  getUploadDetailsForAdmin,
  getBatchStudents,
  approveUpload,
  rejectUpload,
  deleteUpload,
  bulkDeleteUploads,
};
