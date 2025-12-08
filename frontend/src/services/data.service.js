import apiClient from "../api/client";

/**
 * Data Management Service
 * Handles API calls for partners, centers, batches, and students
 */

// ==================== PARTNERS ====================

/**
 * Get all partners
 */
export const getPartners = async (params = {}) => {
  const response = await apiClient.get("/partners", { params });
  return response.data;
};

/**
 * Get partner by ID
 */
export const getPartnerById = async (id) => {
  const response = await apiClient.get(`/partners/${id}`);
  return response.data;
};

/**
 * Create new partner
 */
export const createPartner = async (data) => {
  const response = await apiClient.post("/partners", data);
  return response.data;
};

/**
 * Update partner
 */
export const updatePartner = async (id, data) => {
  const response = await apiClient.put(`/partners/${id}`, data);
  return response.data;
};

/**
 * Delete partner
 */
export const deletePartner = async (id) => {
  const response = await apiClient.delete(`/partners/${id}`);
  return response.data;
};

/**
 * Approve partner
 */
export const approvePartner = async (id) => {
  const response = await apiClient.patch(`/partners/${id}/approve`);
  return response.data;
};

/**
 * Reject partner
 */
export const rejectPartner = async (id, rejectionReason) => {
  const response = await apiClient.patch(`/partners/${id}/reject`, {
    rejection_reason: rejectionReason,
  });
  return response.data;
};

/**
 * Export partners to CSV
 */
export const exportPartners = async (params = {}) => {
  const response = await apiClient.get("/partners/export", {
    params,
    responseType: "blob",
  });
  return response.data;
};

// ==================== CENTERS ====================

/**
 * Get all centers
 */
export const getCenters = async (params = {}) => {
  const response = await apiClient.get("/centers", { params });
  return response.data;
};

/**
 * Get my centers (for PARTNER role)
 */
export const getMyCenters = async (params = {}) => {
  const response = await apiClient.get("/centers/my-centers", { params });
  return response.data;
};

/**
 * Get filter options for centers
 */
export const getCenterFilterOptions = async () => {
  const response = await apiClient.get("/centers/filter-options");
  return response.data;
};

/**
 * Get center by ID
 */
export const getCenterById = async (id) => {
  const response = await apiClient.get(`/centers/${id}`);
  return response.data;
};

/**
 * Create new center
 */
export const createCenter = async (data) => {
  const response = await apiClient.post("/centers", data);
  return response.data;
};

/**
 * Update center
 */
export const updateCenter = async (id, data) => {
  const response = await apiClient.put(`/centers/${id}`, data);
  return response.data;
};

/**
 * Delete center
 */
export const deleteCenter = async (id) => {
  const response = await apiClient.delete(`/centers/${id}`);
  return response.data;
};

/**
 * Approve center
 */
export const approveCenter = async (id) => {
  const response = await apiClient.patch(`/centers/${id}/approve`);
  return response.data;
};

/**
 * Reject center
 */
export const rejectCenter = async (id, rejectionReason) => {
  const response = await apiClient.patch(`/centers/${id}/reject`, {
    rejection_reason: rejectionReason,
  });
  return response.data;
};

/**
 * Export centers to CSV
 */
export const exportCenters = async (params = {}) => {
  const response = await apiClient.get("/centers/export", {
    params,
    responseType: "blob",
  });
  return response.data;
};

// ==================== BATCHES ====================

/**
 * Get all batches
 */
export const getBatches = async (params = {}) => {
  const response = await apiClient.get("/batches", { params });
  return response.data;
};

/**
 * Get batches by center
 */
export const getBatchesByCenter = async (centerId) => {
  const response = await apiClient.get(`/batches/by-center/${centerId}`);
  return response.data;
};

/**
 * Get batch by ID
 */
export const getBatchById = async (id) => {
  const response = await apiClient.get(`/batches/${id}`);
  return response.data;
};

/**
 * Create new batch
 */
export const createBatch = async (data) => {
  const response = await apiClient.post("/batches", data);
  return response.data;
};

/**
 * Update batch
 */
export const updateBatch = async (id, data) => {
  const response = await apiClient.put(`/batches/${id}`, data);
  return response.data;
};

/**
 * Delete batch
 */
export const deleteBatch = async (id) => {
  const response = await apiClient.delete(`/batches/${id}`);
  return response.data;
};

// ==================== STUDENTS ====================

/**
 * Get all students
 */
export const getStudents = async (params = {}) => {
  const response = await apiClient.get("/students", { params });
  return response.data;
};

/**
 * Get students by batch
 */
export const getStudentsByBatch = async (batchId) => {
  const response = await apiClient.get(`/students/by-batch/${batchId}`);
  return response.data;
};

/**
 * Get filter options for students
 */
export const getStudentFilterOptions = async (params = {}) => {
  const response = await apiClient.get("/students/filter-options", { params });
  return response.data;
};

/**
 * Get student by ID
 */
export const getStudentById = async (id) => {
  const response = await apiClient.get(`/students/${id}`);
  return response.data;
};

/**
 * Export students to CSV
 */
export const exportStudents = async (params = {}) => {
  const response = await apiClient.get("/students/export", {
    params,
    responseType: "blob",
  });
  return response.data;
};

// ==================== UTILITIES ====================

/**
 * Download CSV file helper
 */
export const downloadCSV = (blob, filename) => {
  const url = window.URL.createObjectURL(new Blob([blob]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(url);
};
