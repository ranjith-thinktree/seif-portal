'use strict';

const { KpiService } = require('../services/kpi.service');
const ApiResponse = require('../../../utils/response.util');

/**
 * GET /api/v1/kpi/settings?year=all
 * Returns all KPI settings merged for the requested year.
 */
exports.getSettings = async (req, res) => {
  try {
    const year = req.query.year || 'all';
    const settings = await KpiService.getSettings(year);
    return ApiResponse.success(res, settings, 'KPI settings retrieved');
  } catch (error) {
    console.error('[kpiController] getSettings error:', error);
    return ApiResponse.error(res, error.message, 500);
  }
};

/**
 * PUT /api/v1/kpi/settings/:key
 * Body: { year, customValue, isVisible }
 * Admin only.
 */
exports.updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { year = 'all', customValue, isVisible } = req.body;

    if (customValue === undefined && isVisible === undefined) {
      return ApiResponse.error(res, 'Provide customValue or isVisible to update', 400);
    }

    await KpiService.upsertSetting(key, year, customValue, isVisible, req.user.id);
    return ApiResponse.success(res, null, 'KPI setting updated');
  } catch (error) {
    console.error('[kpiController] updateSetting error:', error);
    return ApiResponse.error(res, error.message, 500);
  }
};

/**
 * GET /api/v1/kpi/live-values
 * Returns actual DB counts for each KPI key (no custom value offset).
 * Admin / Super Admin only — used in the Settings panel.
 */
exports.getLiveValues = async (req, res) => {
  try {
    const values = await KpiService.getLiveValues();
    return ApiResponse.success(res, values, 'KPI live values retrieved');
  } catch (error) {
    console.error('[kpiController] getLiveValues error:', error);
    return ApiResponse.error(res, error.message, 500);
  }
};

/**
 * PUT /api/v1/kpi/settings/reorder
 * Body: { orderedKeys: string[] }
 * Admin / Super Admin only.
 */
exports.reorderSettings = async (req, res) => {
  try {
    const { orderedKeys } = req.body;
    if (!Array.isArray(orderedKeys) || orderedKeys.length === 0) {
      return ApiResponse.error(res, 'orderedKeys must be a non-empty array', 400);
    }
    await KpiService.reorderSettings(orderedKeys);
    return ApiResponse.success(res, null, 'KPI order updated');
  } catch (error) {
    console.error('[kpiController] reorderSettings error:', error);
    return ApiResponse.error(res, error.message, 500);
  }
};
