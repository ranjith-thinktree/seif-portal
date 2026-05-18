import apiClient from "../api/client";

const BASE = "/reports";

export const getReportMetadata = async () => {
  const response = await apiClient.get(`${BASE}/metadata`);
  return response.data?.data || [];
};

export const getReportDefinitions = async () => {
  const response = await apiClient.get(`${BASE}/definitions`);
  return response.data?.data || [];
};

export const createReportDefinition = async (payload) => {
  const response = await apiClient.post(`${BASE}/definitions`, payload);
  return response.data?.data;
};

export const updateReportDefinition = async (id, payload) => {
  const response = await apiClient.put(`${BASE}/definitions/${id}`, payload);
  return response.data?.data;
};

export const deleteReportDefinition = async (id) => {
  const response = await apiClient.delete(`${BASE}/definitions/${id}`);
  return response.data?.data;
};

export const runReportDefinition = async (id) => {
  const response = await apiClient.post(`${BASE}/definitions/${id}/run`);
  return response.data?.data;
};

export const exportReportDefinition = async (id, format = "csv") => {
  const response = await apiClient.get(`${BASE}/definitions/${id}/export`, {
    params: { format },
    responseType: "blob",
  });
  return response.data;
};

export const emailReportDefinition = async (id, toEmail, format = "csv") => {
  const response = await apiClient.post(`${BASE}/definitions/${id}/email`, {
    toEmail,
    format,
  });
  return response.data?.data;
};

// ─── Analytics (Impact & Performance Dashboard) ──────────────────────────────

export const getAnalyticsKpi = async (year = "all") => {
  const params = year !== "all" ? { year } : {};
  const res = await apiClient.get(`${BASE}/analytics/kpi`, { params });
  return res.data?.data;
};

export const getAnalyticsGender = async (year = "all") => {
  const params = year !== "all" ? { year } : {};
  const res = await apiClient.get(`${BASE}/analytics/gender`, { params });
  return res.data?.data || [];
};

export const getAnalyticsState = async (year = "all") => {
  const params = year !== "all" ? { year } : {};
  const res = await apiClient.get(`${BASE}/analytics/state`, { params });
  return res.data?.data || [];
};

export const getAnalyticsPerformance = async (year = "all") => {
  const params = year !== "all" ? { year } : {};
  const res = await apiClient.get(`${BASE}/analytics/performance`, { params });
  return res.data?.data || [];
};

export const getAnalyticsCourses = async (year = "all") => {
  const params = year !== "all" ? { year } : {};
  const res = await apiClient.get(`${BASE}/analytics/courses`, { params });
  return res.data?.data || [];
};

export const getAnalyticsPartners = async (year = "all") => {
  const params = year !== "all" ? { year } : {};
  const res = await apiClient.get(`${BASE}/analytics/partners`, { params });
  return res.data?.data || [];
};

export const getAnalyticsTrend = async () => {
  const res = await apiClient.get(`${BASE}/analytics/trend`);
  return res.data?.data || [];
};

export const getReportLayout = async () => {
  const res = await apiClient.get(`${BASE}/layout`);
  return res.data?.data || null;
};

export const saveReportLayout = async (order) => {
  const res = await apiClient.put(`${BASE}/layout`, { order });
  return res.data?.data || order;
};

export const getReportPreferences = async () => {
  const res = await apiClient.get(`${BASE}/preferences`);
  return res.data?.data || null;
};

export const saveReportPreferences = async (prefs) => {
  await apiClient.put(`${BASE}/preferences`, prefs);
};

export const getAnalyticsCentersState = async (year = "all") => {
  const params = year !== "all" ? { year } : {};
  const res = await apiClient.get(`${BASE}/analytics/centers/state`, {
    params,
  });
  return res.data?.data || [];
};

export const getAnalyticsCentersTrend = async () => {
  const res = await apiClient.get(`${BASE}/analytics/centers/trend`);
  return res.data?.data || [];
};

export const getAnalyticsCentersType = async (year = "all") => {
  const params = year !== "all" ? { year } : {};
  const res = await apiClient.get(`${BASE}/analytics/centers/type`, { params });
  return res.data?.data || [];
};

export const getAnalyticsCentersRegion = async (year = "all") => {
  const params = year !== "all" ? { year } : {};
  const res = await apiClient.get(`${BASE}/analytics/centers/region`, {
    params,
  });
  return res.data?.data || [];
};

export const getAnalyticsCentersPerformance = async (year = "all") => {
  const params = year !== "all" ? { year } : {};
  const res = await apiClient.get(`${BASE}/analytics/centers/performance`, {
    params,
  });
  return res.data?.data || [];
};

const reportService = {
  getReportMetadata,
  getReportDefinitions,
  createReportDefinition,
  updateReportDefinition,
  deleteReportDefinition,
  runReportDefinition,
  exportReportDefinition,
  emailReportDefinition,
  getAnalyticsKpi,
  getAnalyticsGender,
  getAnalyticsState,
  getAnalyticsPerformance,
  getAnalyticsCourses,
  getAnalyticsPartners,
  getAnalyticsTrend,
  getAnalyticsCentersState,
  getAnalyticsCentersTrend,
  getAnalyticsCentersType,
  getAnalyticsCentersRegion,
  getAnalyticsCentersPerformance,
  getReportLayout,
  saveReportLayout,
  getReportPreferences,
  saveReportPreferences,
};

export default reportService;
