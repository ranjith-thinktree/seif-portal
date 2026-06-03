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

// ==================== DASHBOARD ====================

/**
 * Get consolidated analytics for dashboard
 * @param {string} year - Year filter ('all' or 'YYYY-YY' format)
 * @returns {Promise} Analytics data with stats, trends, and breakdowns
 */
export const getConsolidatedAnalytics = async (year = "all") => {
  const params = year !== "all" ? { year } : {};
  const response = await apiClient.get("/dashboard/analytics", { params });
  return response.data;
};

/**
 * Get centers grouped by year of establishment
 * @param {string} year - Year filter ('all' or specific year)
 * @returns {Promise} Centers data grouped by establishment year
 */
export const getCentersByEstablishment = async (year = "all") => {
  const params = year !== "all" ? { year } : {};
  const response = await apiClient.get("/dashboard/centers-by-establishment", {
    params,
  });
  return response.data?.data || response.data;
};

/**
 * Get state-wise statistics for India Map
 * @param {string} year - Year filter ('all' or specific year)
 * @returns {Promise} State statistics with state code as key
 */
export const getStateStats = async (year = "all") => {
  const params = year !== "all" ? { year } : {};
  const response = await apiClient.get("/dashboard/state-stats", { params });
  return response.data?.data || response.data;
};

export const getStateDetail = async (stateName, year = "all") => {
  const params = { state: stateName };
  if (year && year !== "all") params.year = year;
  const response = await apiClient.get("/dashboard/state-detail", { params });
  return response.data?.data || response.data;
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
    },
  );
  return response.data;
};

/**
 * Get partner login details (Admin only)
 */
export const getPartnerLoginDetails = async (partnerId) => {
  const response = await apiClient.get(
    `/admin/partners/${partnerId}/login-details`,
  );
  return response.data;
};

/**
 * Export partners
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
    `/partners/reference/states/${countryId}`,
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
    "/partners/reference/organization-types",
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
 * Get all courses for admin management
 */
export const getCoursesCatalog = async (params = {}) => {
  const response = await apiClient.get("/courses", { params });
  return response.data;
};

/**
 * Get course by ID for admin management
 */
export const getCourseCatalogById = async (id) => {
  const response = await apiClient.get(`/courses/${id}`);
  return response.data;
};

/**
 * Create a new course in the admin catalog
 */
export const createCourseCatalog = async (data) => {
  const response = await apiClient.post("/courses", data);
  return response.data;
};

/**
 * Update an existing course in the admin catalog
 */
export const updateCourseCatalog = async (id, data) => {
  const response = await apiClient.put(`/courses/${id}`, data);
  return response.data;
};

/**
 * Delete a course from the admin catalog
 */
export const deleteCourseCatalog = async (id) => {
  const response = await apiClient.delete(`/courses/${id}`);
  return response.data;
};

/**
 * Get all trainer modules
 */
export const getTrainerModules = async (params = {}) => {
  const response = await apiClient.get("/trainer-modules", { params });
  return response.data;
};

/**
 * Get trainer module by ID
 */
export const getTrainerModuleById = async (id) => {
  const response = await apiClient.get(`/trainer-modules/${id}`);
  return response.data;
};

/**
 * Create a new trainer module
 */
export const createTrainerModule = async (data) => {
  const response = await apiClient.post("/trainer-modules", data);
  return response.data;
};

/**
 * Update an existing trainer module
 */
export const updateTrainerModule = async (id, data) => {
  const response = await apiClient.put(`/trainer-modules/${id}`, data);
  return response.data;
};

/**
 * Delete a trainer module
 */
export const deleteTrainerModule = async (id) => {
  const response = await apiClient.delete(`/trainer-modules/${id}`);
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
 * Export centers
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
 * Export batches
 */
export const exportBatches = async (params = {}) => {
  const response = await apiClient.get("/batches/export", {
    params,
    responseType: "blob",
  });
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
 * Bulk delete students
 */
export const bulkDeleteStudents = async (ids) => {
  const response = await apiClient.post("/students/bulk-delete", { ids });
  return response.data;
};

/**
 * Update a student
 */
export const updateStudent = async (id, data) => {
  const payload = {
    student_name: data.student_name,
    gender: data.gender,
    mobile_number: data.mobile_number,
    email: data.email,
    address: data.address,
    city: data.city,
    state: data.state,
    course_name: data.course_name,
  };
  const response = await apiClient.put(`/students/${id}`, payload);
  return response.data;
};

/**
 * Delete a student
 */
export const deleteStudent = async (id) => {
  const response = await apiClient.delete(`/students/${id}`);
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
 * Export students
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
 * Download blob file helper
 */
export const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(new Blob([blob]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const downloadCSV = downloadFile;

// Default export for convenient importing
const dataService = {
  // Data Management
  getOverviewStats,
  getConsolidatedAnalytics,
  // Dashboard
  getCentersByEstablishment,
  getStateStats,
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
  updateStudent,
  deleteStudent,
  getStudentById,
  getStudentsByBatch,
  getStudentFilterOptions,
  exportStudents,
  // Utilities
  downloadFile,
  downloadCSV,
};

export default dataService;
