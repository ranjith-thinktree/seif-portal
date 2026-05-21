'use strict';

const settingsService = require('../services/settings.service');
const ApiResponse = require('../../../utils/response.util');
const path = require('path');
const fs = require('fs').promises;

// Path to the dashboard data file (stored within backend/data)
const DASHBOARD_DATA_PATH = path.resolve(__dirname, '../../../../data/dashboardData.json');

const VALID_YEAR_KEYS = (key) => key === 'all' || /^\d{4}$/.test(key);
const YEAR_TOTAL_FIELDS = [
  'total_students',
  'india',
  'greater_india',
  'nsi',
  'female',
  'male',
  'tot',
  'employment',
];
const MONTH_FIELDS = [
  'total',
  'india',
  'greater_india',
  'nsi',
  'female',
  'male',
  'tot',
  'employment',
];
const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

const toFileUrl = (filePath) => {
  if (!filePath) return null;
  const uploadsRelative = path.relative(path.join(__dirname, '../../../../uploads'), filePath);
  return `/uploads/${uploadsRelative.replace(/\\/g, '/')}`;
};

/**
 * GET /settings
 * Returns all settings as { key: { value, file_url, file_name, updated_at } }
 */
exports.getSettings = async (req, res) => {
  try {
    const settings = await settingsService.getSettings();
    return ApiResponse.success(res, settings, 'Settings retrieved');
  } catch (error) {
    console.error('[settingsController] getSettings error:', error);
    return ApiResponse.error(res, error.message, 500);
  }
};

/**
 * PUT /settings/:key/instruction
 * Body: { value: string }
 */
exports.updateInstruction = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    if (!value || typeof value !== 'string') {
      return ApiResponse.error(res, 'value (string) is required', 400);
    }
    await settingsService.updateInstruction(key, value, req.user.id);
    return ApiResponse.success(res, null, 'Instruction updated');
  } catch (error) {
    console.error('[settingsController] updateInstruction error:', error);
    return ApiResponse.error(res, error.message, 500);
  }
};

/**
 * PUT /settings/:key/template
 * Multipart: templateFile (.xlsx)
 */
exports.updateTemplate = async (req, res) => {
  try {
    const { key } = req.params;
    if (!req.file) {
      return ApiResponse.error(res, 'Template file (.xlsx) is required', 400);
    }
    const fileUrl = toFileUrl(req.file.path);
    await settingsService.updateTemplateFile(key, fileUrl, req.file.originalname, req.user.id);
    return ApiResponse.success(
      res,
      { file_url: fileUrl, file_name: req.file.originalname },
      'Template updated'
    );
  } catch (error) {
    console.error('[settingsController] updateTemplate error:', error);
    return ApiResponse.error(res, error.message, 500);
  }
};

/**
 * GET /settings/dashboard-data
 * Returns the full dashboardData.json content
 */
exports.getDashboardData = async (req, res) => {
  try {
    let raw = await fs.readFile(DASHBOARD_DATA_PATH, 'utf-8');
    // Strip UTF-8 BOM if present (files saved by Excel/Notepad may include it)
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    const data = JSON.parse(raw);
    return ApiResponse.success(res, data, 'Dashboard data retrieved');
  } catch (error) {
    console.error('[settingsController] getDashboardData error:', error);
    return ApiResponse.error(res, 'Failed to read dashboard data file', 500);
  }
};

/**
 * PUT /settings/dashboard-data
 * Body: full dashboardData JSON object
 * Validates structure and writes to dashboardData.json
 */
exports.updateDashboardData = async (req, res) => {
  try {
    const data = req.body;

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return ApiResponse.error(res, 'Request body must be a JSON object', 400);
    }

    // Validate each year key and its values
    for (const [yearKey, yearVal] of Object.entries(data)) {
      if (!VALID_YEAR_KEYS(yearKey)) {
        return ApiResponse.error(
          res,
          `Invalid year key: "${yearKey}". Must be "all" or a 4-digit year.`,
          400
        );
      }
      if (!yearVal || typeof yearVal !== 'object') {
        return ApiResponse.error(res, `Year "${yearKey}" must be an object`, 400);
      }

      // Validate year totals
      for (const field of YEAR_TOTAL_FIELDS) {
        const val = yearVal[field];
        if (val !== undefined && (typeof val !== 'number' || val < 0 || !Number.isFinite(val))) {
          return ApiResponse.error(
            res,
            `Year "${yearKey}", field "${field}" must be a non-negative number`,
            400
          );
        }
      }

      // Validate monthly data if present
      if (yearVal.monthly) {
        if (typeof yearVal.monthly !== 'object') {
          return ApiResponse.error(res, `Year "${yearKey}".monthly must be an object`, 400);
        }
        for (const [monthKey, monthVal] of Object.entries(yearVal.monthly)) {
          if (!MONTHS.includes(monthKey)) {
            return ApiResponse.error(
              res,
              `Invalid month key: "${monthKey}" in year "${yearKey}"`,
              400
            );
          }
          for (const field of MONTH_FIELDS) {
            const val = monthVal[field];
            if (
              val !== undefined &&
              (typeof val !== 'number' || val < 0 || !Number.isFinite(val))
            ) {
              return ApiResponse.error(
                res,
                `Year "${yearKey}", month "${monthKey}", field "${field}" must be a non-negative number`,
                400
              );
            }
          }
        }
      }
    }

    // Write to file with pretty formatting
    const json = JSON.stringify(data, null, 2);
    await fs.writeFile(DASHBOARD_DATA_PATH, json, 'utf-8');

    console.log(`[settingsController] Dashboard data updated by user ${req.user.id}`);
    return ApiResponse.success(res, null, 'Dashboard data saved successfully');
  } catch (error) {
    console.error('[settingsController] updateDashboardData error:', error);
    return ApiResponse.error(res, 'Failed to save dashboard data', 500);
  }
};
