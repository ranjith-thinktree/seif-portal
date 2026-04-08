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
 * @param {string|null} targetPartnerId - admin only: generate template for this partner
 */
export const downloadDynamicTemplate = async (targetPartnerId = null) => {
  const params = targetPartnerId ? { partnerId: targetPartnerId } : {};
  const response = await apiClient.get("/uploads/download-template", {
    responseType: "blob",
    params,
  });

  // Derive filename from Content-Disposition header if available
  const disposition = response.headers?.["content-disposition"] || "";
  const match = disposition.match(/filename="?([^";\n]+)"?/);
  const fileName = match ? match[1] : "SEIF_Data_Upload_Template.xlsx";

  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);

  return { success: true };
};

/**
 * Upload CSV file for validation and preview
 */
export const uploadCSV = async (file, targetPartnerId = null) => {
  const formData = new FormData();
  formData.append("file", file);
  if (targetPartnerId) formData.append("targetPartnerId", targetPartnerId);

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
export const confirmUpload = async (
  filePath,
  fileName,
  targetPartnerId = null,
) => {
  const response = await apiClient.post("/uploads/confirm", {
    filePath,
    fileName,
    ...(targetPartnerId ? { targetPartnerId } : {}),
  });

  return response.data;
};

/**
 * Get partner's upload history
 */
export const getUploads = async (page = 1, limit = 10, filters = {}) => {
  const params = { page, limit };
  if (filters.status) params.status = filters.status;
  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;

  const response = await apiClient.get("/uploads", { params });

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
  limit = 10,
  filters = {},
) => {
  const params = { page, limit };
  if (status) params.status = status;
  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;
  if (filters.partnerId) params.partnerId = filters.partnerId;

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
  remarks = null,
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
 * Download the original uploaded file (B10)
 * Handles both S3 presigned URL redirect and direct file stream
 */
export const downloadUploadFile = async (uploadId, fileName) => {
  const response = await apiClient.get(`/uploads/${uploadId}/download`, {
    responseType: "blob",
  });

  // If backend returned JSON (S3 presigned URL case), parse it and open
  const contentType = response.headers["content-type"] || "";
  if (contentType.includes("application/json")) {
    const text = await response.data.text();
    const json = JSON.parse(text);
    if (json.data?.downloadUrl) {
      window.open(json.data.downloadUrl, "_blank");
    }
    return;
  }

  // Direct blob download (local file case)
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", fileName || "upload.csv");
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
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
  downloadUploadFile,
};
