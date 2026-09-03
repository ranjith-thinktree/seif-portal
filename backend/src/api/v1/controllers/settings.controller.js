'use strict';

const settingsService = require('../services/settings.service');
const ApiResponse = require('../../../utils/response.util');
const path = require('path');
const {
  YEAR_TOTAL_FIELDS,
  MONTH_FIELDS,
  MONTHS,
  readDashboardDataFile,
  writeDashboardDataFile,
} = require('../../../utils/dashboardData.util');

const VALID_YEAR_KEYS = (key) => key === 'all' || /^\d{4}$/.test(key);

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

exports.getPerformanceRatingSettings = async (req, res) => {
  try {
    const settings = await settingsService.getPerformanceRatingSettings();
    return ApiResponse.success(res, settings, 'Performance rating settings retrieved');
  } catch (error) {
    console.error('[settingsController] getPerformanceRatingSettings error:', error);
    return ApiResponse.error(res, error.message, 500);
  }
};

exports.createPerformanceRatingSetting = async (req, res) => {
  try {
    const setting = await settingsService.createPerformanceRatingSetting(req.body, req.user.id);
    return ApiResponse.success(res, setting, 'Performance rating setting created', 201);
  } catch (error) {
    console.error('[settingsController] createPerformanceRatingSetting error:', error);
    return ApiResponse.error(res, error.message, 400);
  }
};

exports.updatePerformanceRatingSetting = async (req, res) => {
  try {
    const setting = await settingsService.updatePerformanceRatingSetting(
      req.params.id,
      req.body,
      req.user.id
    );
    return ApiResponse.success(res, setting, 'Performance rating setting updated');
  } catch (error) {
    console.error('[settingsController] updatePerformanceRatingSetting error:', error);
    return ApiResponse.error(res, error.message, 400);
  }
};

exports.deletePerformanceRatingSetting = async (req, res) => {
  try {
    await settingsService.deletePerformanceRatingSetting(req.params.id);
    return ApiResponse.success(res, null, 'Performance rating setting deleted');
  } catch (error) {
    console.error('[settingsController] deletePerformanceRatingSetting error:', error);
    return ApiResponse.error(res, error.message, 400);
  }
};

/**
 * GET /settings/dashboard-data
 * Returns the full dashboardData.json content
 */
exports.getDashboardData = async (req, res) => {
  try {
    const data = await readDashboardDataFile();
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

    const saved = await writeDashboardDataFile(data);

    console.log(`[settingsController] Dashboard data updated by user ${req.user.id}`);
    return ApiResponse.success(res, saved, 'Dashboard data saved successfully');
  } catch (error) {
    console.error('[settingsController] updateDashboardData error:', error);
    return ApiResponse.error(res, 'Failed to save dashboard data', 500);
  }
};

exports.listEmailTemplates = async (req, res) => {
  try {
    const emailTemplateService = require('../../../services/emailTemplate.service');
    const data = await emailTemplateService.listTemplates();
    return ApiResponse.success(res, data, 'Email templates fetched');
  } catch (error) {
    console.error('[settingsController] listEmailTemplates error:', error);
    return ApiResponse.error(res, 'Failed to load email templates', 500);
  }
};

exports.updateEmailTemplate = async (req, res) => {
  try {
    const { key } = req.params;
    const { subject, body } = req.body || {};
    if (!subject || !body) {
      return ApiResponse.error(res, 'Subject and body are required', 400);
    }
    const emailTemplateService = require('../../../services/emailTemplate.service');
    const data = await emailTemplateService.saveTemplate(key, { subject, body });
    return ApiResponse.success(res, data, 'Email template saved');
  } catch (error) {
    console.error('[settingsController] updateEmailTemplate error:', error);
    return ApiResponse.error(res, error.message || 'Failed to save email template', 400);
  }
};

exports.resetEmailTemplate = async (req, res) => {
  try {
    const emailTemplateService = require('../../../services/emailTemplate.service');
    const data = await emailTemplateService.resetTemplate(req.params.key);
    return ApiResponse.success(res, data, 'Email template restored to default draft');
  } catch (error) {
    console.error('[settingsController] resetEmailTemplate error:', error);
    return ApiResponse.error(res, error.message || 'Failed to reset email template', 400);
  }
};

exports.testEmailTemplate = async (req, res) => {
  try {
    const { key } = req.params;
    const toEmail = req.body?.toEmail || req.user?.email;
    if (!toEmail) {
      return ApiResponse.error(res, 'A destination email is required', 400);
    }
    const emailDispatch = require('../../../services/emailDispatch.service');
    const emailTemplateService = require('../../../services/emailTemplate.service');
    const template = await emailTemplateService.getTemplate(key);
    const sampleVars = {
      partnerName: 'Think Tree',
      centerName: 'Sample Center',
      year: '2026-27',
      dueDate: '15 September 2026',
      date: new Date().toLocaleDateString('en-IN'),
      adminName: req.user?.full_name || 'Admin',
      packageName: 'Package 1',
      batchNumber: 'BATCH-SAMPLE',
      assessmentDate: '15 September 2026',
      location: 'Bengaluru',
      workStatus: 'Completed',
      supportRequired: 'Nil',
      yourName: process.env.SMTP_FROM_NAME || 'SEIF Portal',
    };
    let result;
    if (template?.audience === 'admin') {
      result = await emailDispatch.sendByAudience(key, sampleVars, {
        audience: 'admin',
        extraEmails: [toEmail],
      });
    } else {
      result = await emailDispatch.sendToRecipients(key, sampleVars, [
        { email: toEmail, name: req.user?.full_name || 'Tester' },
      ]);
    }
    const sentTo = result.recipients?.join(', ') || toEmail;
    return ApiResponse.success(res, result, `Test email sent to ${sentTo}`);
  } catch (error) {
    console.error('[settingsController] testEmailTemplate error:', error);
    return ApiResponse.error(res, error.message || 'Failed to send test email', 500);
  }
};
