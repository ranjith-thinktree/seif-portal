import apiClient from "../api/client";

const BASE = "/certification";

// ─────────────────────────────────────────────────────────────────────────────
// PARTNER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upload certification data (form-based, no CSV).
 * @param {string} centerId
 * @param {string} batchId
 * @param {string} batchStartDate  - ISO date string
 * @param {string} batchEndDate    - ISO date string
 * @param {string} assessmentDate  - ISO date string
 * @param {File|null} supportDoc   - PDF/image/Word/CSV/XLSX (optional)
 */
export const uploadCertificationData = async (
  centerId,
  batchId,
  batchStartDate,
  batchEndDate,
  assessmentDate,
  supportDoc,
  targetPartnerId = null,
) => {
  const formData = new FormData();
  formData.append("centerId", centerId);
  formData.append("batchId", batchId);
  if (batchStartDate) formData.append("batchStartDate", batchStartDate);
  if (batchEndDate) formData.append("batchEndDate", batchEndDate);
  if (assessmentDate) formData.append("assessmentDate", assessmentDate);
  if (supportDoc) formData.append("supportDoc", supportDoc);
  if (targetPartnerId) formData.append("targetPartnerId", targetPartnerId);

  const response = await apiClient.post(`${BASE}/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
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

/**
 * ESSCI uploads attendance data + files for a batch.
 * @param {string} partnerId
 * @param {string} centerId
 * @param {string} batchId
 * @param {string|null} certificationUploadId
 * @param {number} traineesAttended
 * @param {number} traineesPassed
 * @param {number} traineesFailed
 * @param {number} traineesAbsent
 * @param {File} zipFile           - ZIP archive (required)
 * @param {File} studentListDoc    - Student list document (required)
 */
export const essciUploadCertificatePDF = async (
  partnerId,
  centerId,
  batchId,
  certificationUploadId = null,
  traineesAttended,
  traineesPassed,
  traineesFailed,
  traineesAbsent,
  zipFile,
  studentListDoc,
) => {
  const formData = new FormData();
  formData.append("partnerId", partnerId);
  formData.append("centerId", centerId);
  formData.append("batchId", batchId);
  if (certificationUploadId)
    formData.append("certificationUploadId", certificationUploadId);
  formData.append("traineesAttended", traineesAttended);
  formData.append("traineesPassed", traineesPassed);
  formData.append("traineesFailed", traineesFailed);
  formData.append("traineesAbsent", traineesAbsent);
  formData.append("zipFile", zipFile);
  formData.append("studentListDoc", studentListDoc);

  const response = await apiClient.post(`${BASE}/essci/upload-pdf`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};
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
