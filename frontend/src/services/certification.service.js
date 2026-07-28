import apiClient from "../api/client";

const BASE = "/certification";

// ─────────────────────────────────────────────────────────────────────────────
// PARTNER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upload certification data (form-based).
 * @param {Object} payload
 * @param {string} payload.centerId
 * @param {string} [payload.centerName]
 * @param {string} [payload.batchId]
 * @param {string} [payload.otherBatchNumber]
 * @param {string} [payload.batchStartDate]
 * @param {string} [payload.batchEndDate]
 * @param {string} [payload.assessmentDate]
 * @param {string} [payload.spokeName]
 * @param {string} [payload.spokeEmail]
 * @param {string} [payload.spokeMobile]
 * @param {string|null} [payload.targetPartnerId]
 */
export const uploadCertificationData = async ({
  centerId,
  centerName,
  batchId,
  otherBatchNumber,
  batchStartDate,
  batchEndDate,
  assessmentDate,
  spokeName,
  spokeEmail,
  spokeMobile,
  targetPartnerId = null,
}) => {
  const response = await apiClient.post(`${BASE}/upload`, {
    centerId,
    centerName,
    batchId: batchId || undefined,
    otherBatchNumber: otherBatchNumber || undefined,
    batchStartDate: batchStartDate || undefined,
    batchEndDate: batchEndDate || undefined,
    assessmentDate: assessmentDate || undefined,
    spokeName: spokeName || undefined,
    spokeEmail: spokeEmail || undefined,
    spokeMobile: spokeMobile || undefined,
    targetPartnerId: targetPartnerId || undefined,
  });
  return response.data;
};

/** Partner resubmits a rejected certification request (same upload id). */
export const resubmitCertificationData = async (
  uploadId,
  {
    centerId,
    centerName,
    batchId,
    otherBatchNumber,
    batchStartDate,
    batchEndDate,
    assessmentDate,
    spokeName,
    spokeEmail,
    spokeMobile,
  },
) => {
  const response = await apiClient.put(`${BASE}/uploads/${uploadId}/resubmit`, {
    centerId,
    centerName,
    batchId: batchId || undefined,
    otherBatchNumber: otherBatchNumber || undefined,
    batchStartDate: batchStartDate || undefined,
    batchEndDate: batchEndDate || undefined,
    assessmentDate: assessmentDate || undefined,
    spokeName: spokeName || undefined,
    spokeEmail: spokeEmail || undefined,
    spokeMobile: spokeMobile || undefined,
  });
  return response.data;
};

/** Partner upload history */
export const getMyCertificationUploads = async (page = 1, limit = 10) => {
  const response = await apiClient.get(`${BASE}/uploads`, {
    params: { page, limit },
  });
  return response.data;
};

/** Upload detail with student rows */
export const getCertificationUploadDetails = async (uploadId) => {
  const response = await apiClient.get(`${BASE}/uploads/${uploadId}`);
  return response.data;
};

/** Approved certificate PDFs available for partner to download */
export const getPartnerCertificates = async (page = 1, limit = 20) => {
  const response = await apiClient.get(`${BASE}/certificates`, {
    params: { page, limit },
  });
  return response.data;
};

/** Partner certification requests with derived status */
export const getPartnerCertificationRequests = async (page = 1, limit = 1000) => {
  const response = await apiClient.get(`${BASE}/requests`, {
    params: { page, limit },
  });
  return response.data;
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────────────────────────

export const adminGetCertificationUploads = async ({
  status,
  page = 1,
  limit = 20,
  search,
} = {}) => {
  const response = await apiClient.get(`${BASE}/admin/uploads`, {
    params: { status, page, limit, search },
  });
  return response.data;
};

export const adminApproveCertificationUpload = async (uploadId, remarks) => {
  const response = await apiClient.put(
    `${BASE}/admin/uploads/${uploadId}/approve`,
    { remarks },
  );
  return response.data;
};

export const adminRejectCertificationUpload = async (
  uploadId,
  rejectionReason,
  remarks,
) => {
  const response = await apiClient.put(
    `${BASE}/admin/uploads/${uploadId}/reject`,
    { rejectionReason, remarks },
  );
  return response.data;
};

export const adminGetCertificatePDFs = async ({
  status,
  page = 1,
  limit = 20,
} = {}) => {
  const response = await apiClient.get(`${BASE}/admin/pdfs`, {
    params: { status, page, limit },
  });
  return response.data;
};

/** Admin certification requests with derived status */
export const adminGetCertificationRequests = async (page = 1, limit = 1000) => {
  const response = await apiClient.get(`${BASE}/admin/requests`, {
    params: { page, limit },
  });
  return response.data;
};

export const adminApproveCertificatePDF = async (pdfId, remarks) => {
  const response = await apiClient.put(`${BASE}/admin/pdfs/${pdfId}/approve`, {
    remarks,
  });
  return response.data;
};

export const adminRejectCertificatePDF = async (
  pdfId,
  rejectionReason,
  remarks,
) => {
  const response = await apiClient.put(`${BASE}/admin/pdfs/${pdfId}/reject`, {
    rejectionReason,
    remarks,
  });
  return response.data;
};

// ─────────────────────────────────────────────────────────────────────────────
// ESSCI
// ─────────────────────────────────────────────────────────────────────────────

export const essciGetData = async ({
  page = 1,
  limit = 20,
  search,
  filter,
} = {}) => {
  const response = await apiClient.get(`${BASE}/essci/data`, {
    params: { page, limit, search, filter },
  });
  return response.data;
};

export const essciGetBatchDetail = async (uploadId) => {
  const response = await apiClient.get(`${BASE}/essci/data/${uploadId}`);
  return response.data;
};

export const essciGetPartners = async () => {
  const response = await apiClient.get(`${BASE}/essci/partners`);
  return response.data;
};

export const essciGetCenters = async (partnerId) => {
  const response = await apiClient.get(`${BASE}/essci/centers`, {
    params: { partnerId },
  });
  return response.data;
};

export const essciGetBatches = async (centerId, partnerId) => {
  const response = await apiClient.get(`${BASE}/essci/batches`, {
    params: { centerId, partnerId },
  });
  return response.data;
};

export const essciUploadCertificatePDF = async (
  partnerId,
  centerId,
  batchId,
  certificationUploadId,
  traineesRegistered,
  traineesAttended,
  traineesPassed,
  traineesFailed,
  certificateFiles,
  studentListFile,
  assessmentDate,
  traineesAbsent = 0,
) => {
  const formData = new FormData();
  formData.append("partnerId", partnerId);
  formData.append("centerId", centerId);
  formData.append("batchId", batchId);
  formData.append("certificationUploadId", certificationUploadId);
  formData.append("traineesRegistered", traineesRegistered);
  formData.append("traineesAttended", traineesAttended);
  formData.append("traineesPassed", traineesPassed);
  formData.append("traineesFailed", traineesFailed);
  formData.append("assessmentDate", assessmentDate);
  formData.append("traineesAbsent", traineesAbsent);
  (certificateFiles || []).forEach((file) => {
    formData.append("certificateFiles", file);
  });
  if (studentListFile) {
    formData.append("studentListDoc", studentListFile);
  }

  const response = await apiClient.post(`${BASE}/essci/upload-pdf`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN + ESSCI: File archive & reports
// ─────────────────────────────────────────────────────────────────────────────

export const listCertificationFileArchive = async (params = {}) => {
  const response = await apiClient.get(`${BASE}/files/archive`, { params });
  return response.data;
};

export const downloadCertificationArchivedFile = async (fileId) => {
  const response = await apiClient.get(`${BASE}/files/archive/${fileId}/download`, {
    responseType: "blob",
  });
  return response.data;
};

export const exportCertificationArchiveZip = async (payload = {}) => {
  const response = await apiClient.post(`${BASE}/files/archive/export/zip`, payload, {
    responseType: "blob",
  });
  return response.data;
};

export const exportCertificationArchiveExcel = async (payload = {}) => {
  const response = await apiClient.post(`${BASE}/files/archive/export/excel`, payload, {
    responseType: "blob",
  });
  return response.data;
};

/** @deprecated Use exportCertificationArchiveZip */
export const exportCertificationMonthlyZip = exportCertificationArchiveZip;

/** @deprecated Use exportCertificationArchiveExcel */
export const exportCertificationMergedExcel = exportCertificationArchiveExcel;

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS (Admin)
// ─────────────────────────────────────────────────────────────────────────────

export const getPortalSettings = async () => {
  const response = await apiClient.get("/settings");
  return response.data;
};

export const updateInstruction = async (key, value) => {
  const response = await apiClient.put(`/settings/${key}/instruction`, {
    value,
  });
  return response.data;
};

export const updateTemplate = async (key, file) => {
  const formData = new FormData();
  formData.append("templateFile", file);
  const response = await apiClient.put(`/settings/${key}/template`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const getDashboardData = async () => {
  const response = await apiClient.get("/settings/dashboard-data");
  return response.data;
};

export const updateDashboardData = async (data) => {
  const response = await apiClient.put("/settings/dashboard-data", data);
  return response.data;
};
