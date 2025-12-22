import apiClient from "../api/client";

/**
 * Data Management Service
 * Handles API calls for partners, centers, batches, and students
 */

// ==================== DATA MANAGEMENT ====================

/**
 * Get overview statistics for data management page
 */
export const getOverviewStats = async () => {
  const response = await apiClient.get("/data/overview-stats");
  return response.data;
};

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
 * Bulk upload partners from CSV
 */
export const bulkUploadPartners = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return apiClient.post("/partners/bulk-upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

/**
 * Download partner bulk upload template
 */
export const downloadPartnerTemplate = async () => {
  return apiClient.get("/partners/bulk-template", {
    responseType: "blob",
  });
};

/**
 * Bulk upload centers from CSV
 */
export const bulkUploadCenters = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return apiClient.post("/centers/bulk-upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

/**
 * Download center bulk upload template
 */
export const downloadCenterTemplate = async () => {
  return apiClient.get("/centers/bulk-template", {
    responseType: "blob",
  });
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
 * Bulk delete partners
 */
export const bulkDeletePartners = async (ids) => {
  const response = await apiClient.post("/partners/bulk-delete", { ids });
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
 * Resend welcome email to partner
 */
export const resendPartnerWelcomeEmail = async (id) => {
  const response = await apiClient.post(`/partners/${id}/resend-email`);
  return response.data;
};

/**
 * Reset partner password (Admin only)
 */
export const resetPartnerPassword = async (partnerId, sendEmail = true) => {
  const response = await apiClient.post(
    `/admin/partners/${partnerId}/reset-password`,
    {
      sendEmail,
    }
  );
  return response.data;
};

/**
 * Get partner login details (Admin only)
 */
export const getPartnerLoginDetails = async (partnerId) => {
  const response = await apiClient.get(
    `/admin/partners/${partnerId}/login-details`
  );
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

/**
 * Get filter options for partners
 */
export const getPartnerFilterOptions = async () => {
  const response = await apiClient.get("/partners/filter-options");
  return response.data;
};

// ==================== PARTNER REFERENCE DATA ====================

/**
 * Get all countries
 */
export const getCountries = async () => {
  const response = await apiClient.get("/partners/reference/countries");
  return response.data;
};

/**
 * Get states by country ID
 */
export const getStatesByCountry = async (countryId) => {
  const response = await apiClient.get(
    `/partners/reference/states/${countryId}`
  );
  return response.data;
};

/**
 * Get cities by state and country
 */
export const getCitiesByStateAndCountry = async (stateId, countryId) => {
  const response = await apiClient.get("/partners/reference/cities", {
    params: { stateId, countryId },
  });
  return response.data;
};

/**
 * Get all regions
 */
export const getRegions = async () => {
  const response = await apiClient.get("/partners/reference/regions");
  return response.data;
};

/**
 * Get registered_as options
 */
export const getRegisteredAsOptions = async () => {
  const response = await apiClient.get("/partners/reference/registered-as");
  return response.data;
};

/**
 * Get organization type options
 */
export const getOrganizationTypeOptions = async () => {
  const response = await apiClient.get(
    "/partners/reference/organization-types"
  );
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
 * Get all active courses
 */
export const getCourses = async () => {
  const response = await apiClient.get("/centers/courses");
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
 * Get center deletion impact
 */
export const getCenterDeletionImpact = async (id) => {
  const response = await apiClient.get(`/centers/${id}/deletion-impact`);
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
 * Bulk delete centers
 */
export const bulkDeleteCenters = async (ids) => {
  const response = await apiClient.post("/centers/bulk-delete", { ids });
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

/**
 * Bulk delete batches
 */
export const bulkDeleteBatches = async (ids) => {
  const response = await apiClient.post("/batches/bulk-delete", { ids });
  return response.data;
};

/**
 * Get batch filter options (partners, centers, statuses)
 */
export const getBatchFilterOptions = async () => {
  const response = await apiClient.get("/batches/filter-options");
  return response.data;
};

/**
 * Export batches to CSV
 */
export const exportBatches = async (params = {}) => {
  const response = await apiClient.get("/batches/export", {
    params,
    responseType: "blob",
  });
  return response;
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
 * Bulk delete students
 */
export const bulkDeleteStudents = async (ids) => {
  const response = await apiClient.post("/students/bulk-delete", { ids });
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

// Default export for convenient importing
const dataService = {
  // Data Management
  getOverviewStats,
  // Partners
  getPartners,
  getPartnerById,
  createPartner,
  updatePartner,
  deletePartner,
  approvePartner,
  rejectPartner,
  resendPartnerWelcomeEmail,
  resetPartnerPassword,
  getPartnerLoginDetails,
  exportPartners,
  getPartnerFilterOptions,
  getCountries,
  getStatesByCountry,
  getCitiesByStateAndCountry,
  getRegions,
  getRegisteredAsOptions,
  getOrganizationTypeOptions,
  bulkUploadPartners,
  downloadPartnerTemplate,
  // Centers
  getCenters,
  getMyCenters,
  getCenterById,
  createCenter,
  updateCenter,
  deleteCenter,
  approveCenter,
  rejectCenter,
  getCenterDeletionImpact,
  exportCenters,
  getCenterFilterOptions,
  getCourses,
  bulkUploadCenters,
  downloadCenterTemplate,
  // Batches
  getBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch,
  getBatchesByCenter,
  getBatchFilterOptions,
  exportBatches,
  // Students
  getStudents,
  getStudentById,
  getStudentsByBatch,
  getStudentFilterOptions,
  exportStudents,
  // Utilities
  downloadCSV,
};

export default dataService;
