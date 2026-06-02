import apiClient from "../api/client";
import { API_BASE_URL } from "../constants/api";

const BASE = "/tot";

const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, "/");

/**
 * Download TOT Excel (.xlsx) template
 * @param {string|null} partnerId — optional, pre-populates center list sheet
 */
export const downloadTotTemplate = async (partnerId = null) => {
  const response = await apiClient.get(`${BASE}/template`, {
    responseType: "blob",
    params: partnerId ? { partnerId } : {},
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "TOT_Upload_Template.xlsx");
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  return { success: true };
};

/**
 * Upload TOT CSV file
 * @param {File} file
 * @param {string|null} targetPartnerId - For admin uploads on behalf of partner
 */
export const uploadTotCSV = async (file, targetPartnerId = null) => {
  const formData = new FormData();
  formData.append("file", file);
  if (targetPartnerId) formData.append("targetPartnerId", targetPartnerId);
  const response = await apiClient.post(`${BASE}/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

/**
 * Get partner's TOT upload history
 */
export const getTotUploads = async (page = 1, limit = 10) => {
  const response = await apiClient.get(`${BASE}/uploads`, {
    params: { page, limit },
  });
  return response.data;
};

/**
 * Get TOT upload detail with rows
 */
export const getTotUploadDetails = async (uploadId) => {
  const response = await apiClient.get(`${BASE}/uploads/${uploadId}`);
  return response.data;
};

export const getTotTrainers = async (params = {}) => {
  const response = await apiClient.get(`${BASE}/trainers`, { params });
  return response.data;
};

export const getTotTrainerFilterOptions = async () => {
  const response = await apiClient.get(`${BASE}/trainers/filter-options`);
  return response.data;
};

export const getTotTrainerById = async (id) => {
  const response = await apiClient.get(`${BASE}/trainers/${id}`);
  return response.data;
};

export const createTotTrainer = async (payload) => {
  const response = await apiClient.post(`${BASE}/trainers`, payload);
  return response.data;
};

export const updateTotTrainer = async (id, payload) => {
  const response = await apiClient.put(`${BASE}/trainers/${id}`, payload);
  return response.data;
};

export const deleteTotTrainer = async (id) => {
  const response = await apiClient.delete(`${BASE}/trainers/${id}`);
  return response.data;
};

export const uploadTotTrainerDocuments = async (uploadId, trainerId, files) => {
  const formData = new FormData();

  if (files.resume) formData.append("resume", files.resume);
  if (files.qualificationCertificate) {
    formData.append("qualificationCertificate", files.qualificationCertificate);
  }
  if (files.idProof) formData.append("idProof", files.idProof);

  const response = await apiClient.post(
    `${BASE}/uploads/${uploadId}/trainers/${trainerId}/documents`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );

  return response.data;
};

export const getTotDocumentUrl = (fileUrl) => {
  if (!fileUrl) return null;
  return new URL(fileUrl.replace(/^\//, ""), API_ORIGIN).toString();
};

/**
 * Admin: Get all pending TOT uploads
 */
export const getTotPendingUploads = async ({
  page = 1,
  limit = 10,
  status = "pending",
} = {}) => {
  const response = await apiClient.get(`${BASE}/admin/uploads`, {
    params: { page, limit, status },
  });
  return response.data;
};

/**
 * Admin: Approve a TOT upload
 */
export const approveTotUpload = async (uploadId, remarks = "") => {
  const response = await apiClient.post(
    `${BASE}/admin/uploads/${uploadId}/approve`,
    { remarks },
  );
  return response.data;
};

/**
 * Admin: Reject a TOT upload
 */
export const rejectTotUpload = async (uploadId, remarks = "") => {
  const response = await apiClient.post(
    `${BASE}/admin/uploads/${uploadId}/reject`,
    { remarks },
  );
  return response.data;
};

/**
 * Admin: save edits to uploaded_tots rows before approval
 */
export const saveTotAdminEdits = async (uploadId, rows, changes = []) => {
  const response = await apiClient.post(
    `${BASE}/admin/uploads/${uploadId}/save-edits`,
    { rows, changes },
  );
  return response.data;
};
