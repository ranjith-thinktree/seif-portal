import apiClient from "../api/client";

const BASE = "/kpi";

/**
 * Fetch KPI settings (custom values, visibility, sort order, and custom titles)
 * for a given financial year.
 * @param {string} year - 'all' or 'YYYY-YY'
 * @returns {Object} Map of kpiKey → { customValue, isVisible, sortOrder, customLabel }
 */
export const getKpiSettings = async (year = "all") => {
  const response = await apiClient.get(`${BASE}/settings`, {
    params: { year },
  });
  return response.data?.data ?? response.data ?? {};
};

/**
 * Update a single KPI setting (admin only).
 * @param {string} key - KPI key (e.g. 'youth_trained')
 * @param {Object} payload - { year, customValue, isVisible, customLabel }
 */
export const updateKpiSetting = async (key, payload) => {
  const response = await apiClient.put(`${BASE}/settings/${key}`, payload);
  return response.data;
};

export const resolveKpiCardTitle = (definition, setting = {}) => {
  const customLabel = setting.customLabel?.trim();
  return customLabel || definition.label;
};

/**
 * Fetch live DB counts for each KPI key (admin only).
 * Returns a map of kpiKey → count directly from the database.
 */
export const getKpiLiveValues = async () => {
  const response = await apiClient.get(`${BASE}/live-values`);
  return response.data?.data ?? {};
};

/**
 * Persist a new KPI card order to the database (admin only).
 * @param {string[]} orderedKeys - Keys in the desired display order
 */
export const reorderKpiSettings = async (orderedKeys) => {
  const response = await apiClient.put(`${BASE}/settings/reorder`, {
    orderedKeys,
  });
  return response.data;
};

/**
 * Human-readable labels and order for each KPI card.
 * Keep this in sync with VALID_KPI_KEYS in kpi.service.js (backend).
 */
export const KPI_CARD_DEFINITIONS = [
  {
    key: "youth_trained",
    label: "Youth Trained",
    analyticsField: "totalStudents",
    subFields: [
      { key: "male", label: "Male" },
      { key: "female", label: "Female" },
    ],
  },
  {
    key: "trainers_trained",
    label: "Trainers Trained (TOT)",
    analyticsField: null, // custom value only
  },
  {
    key: "edp",
    label: "EDP",
    analyticsField: null, // Dashboard Data + KPI custom only
  },
  {
    key: "youth_employed",
    label: "Youth Employed",
    analyticsField: "totalEmployments",
  },
  {
    key: "partners",
    label: "Partners",
    analyticsField: "totalPartners",
  },
  {
    key: "centers",
    label: "Centers",
    analyticsField: "totalCenters",
  },
  {
    key: "states_uts",
    label: "States & UTs",
    analyticsField: "totalStates",
  },
  {
    key: "greater_india",
    label: "Greater India",
    analyticsField: null, // custom value only
  },
  {
    key: "nsi",
    label: "NSI",
    analyticsField: null, // custom value only
  },
  {
    key: "alumni",
    label: "Alumni",
    analyticsField: null, // custom value only
  },
];
