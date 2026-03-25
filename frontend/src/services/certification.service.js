import apiClient from "../api/client";

const BASE = "/certification";

// ─────────────────────────────────────────────────────────────────────────────
// PARTNER
// ─────────────────────────────────────────────────────────────────────────────

/** Download CSV template */
export const downloadCertificationTemplate = async () => {
  const response = await apiClient.get(`${BASE}/template`, {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "Certification_Data_Template.xlsx");
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  return { success: true };
};

/**
 * Upload certification CSV + optional validation doc.
 * @param {File} dataFile   - CSV/Excel
 * @param {File|null} validationDoc - PDF/image (optional)
 * @param {string} centerId
 * @param {string} batchId
 */
export const uploadCertificationData = async (
  dataFile,
  validationDoc,
  centerId,
  batchId,
) => {
  const formData = new FormData();
  formData.append("dataFile", dataFile);
  if (validationDoc) formData.append("validationDoc", validationDoc);
  formData.append("centerId", centerId);
  formData.append("batchId", batchId);

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
 * ESSCI uploads a certificate PDF for a batch.
 * @param {File} pdfFile
 * @param {string} partnerId
 * @param {string} centerId
 * @param {string} batchId
 * @param {string|null} certificationUploadId
 */
export const essciUploadCertificatePDF = async (
  pdfFile,
  partnerId,
  centerId,
  batchId,
  certificationUploadId = null,
) => {
  const formData = new FormData();
  formData.append("file", pdfFile);
  formData.append("partnerId", partnerId);
  formData.append("centerId", centerId);
  formData.append("batchId", batchId);
  if (certificationUploadId)
    formData.append("certificationUploadId", certificationUploadId);

  const response = await apiClient.post(`${BASE}/essci/upload-pdf`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};
