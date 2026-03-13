const path = require('path');
const fs = require('fs');
const ApiResponse = require('../../../utils/response.util');

const TEMPLATES_DIR = path.join(__dirname, '../../../../templates');

const ALLOWED_TEMPLATES = {
  refurbishment: {
    filename: 'refurbishment_template.csv',
    downloadName: 'SEIF_Refurbishment_Template.csv',
    label: 'Refurbishment Template',
  },
  upgradation: {
    filename: 'upgradation_template.csv',
    downloadName: 'SEIF_Upgradation_Template.csv',
    label: 'Upgradation Template',
  },
};

/**
 * GET /api/v1/templates/:name
 * Download a template file (public — no auth required)
 */
const downloadTemplate = (req, res) => {
  const { name } = req.params;
  const template = ALLOWED_TEMPLATES[name];

  if (!template) {
    return res.status(404).json({ success: false, message: 'Template not found' });
  }

  const filePath = path.join(TEMPLATES_DIR, template.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'Template file not found on server' });
  }

  res.setHeader('Content-Disposition', `attachment; filename="${template.downloadName}"`);
  res.setHeader('Content-Type', 'text/csv');
  res.sendFile(filePath);
};

/**
 * POST /api/v1/admin/templates/:name
 * Replace a template file (admin only)
 * Expects multipart/form-data with field "template"
 */
const replaceTemplate = (req, res) => {
  const { name } = req.params;
  const template = ALLOWED_TEMPLATES[name];

  if (!template) {
    return ApiResponse.error(res, 'Template not found', 404);
  }

  if (!req.file) {
    return ApiResponse.error(res, 'No file uploaded', 400);
  }

  const destPath = path.join(TEMPLATES_DIR, template.filename);

  // Ensure templates directory exists
  if (!fs.existsSync(TEMPLATES_DIR)) {
    fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
  }

  // Move uploaded file to templates directory
  fs.rename(req.file.path, destPath, (err) => {
    if (err) {
      console.error('Error replacing template:', err);
      return ApiResponse.error(res, 'Failed to save template file', 500);
    }
    return ApiResponse.success(
      res,
      { name, filename: template.downloadName },
      `${template.label} replaced successfully`
    );
  });
};

/**
 * GET /api/v1/admin/templates
 * List available templates and their last-modified dates
 */
const listTemplates = (req, res) => {
  const result = Object.entries(ALLOWED_TEMPLATES).map(([key, tmpl]) => {
    const filePath = path.join(TEMPLATES_DIR, tmpl.filename);
    let lastModified = null;
    let exists = false;
    try {
      const stat = fs.statSync(filePath);
      lastModified = stat.mtime;
      exists = true;
    } catch {
      // file doesn't exist yet
    }
    return { key, label: tmpl.label, downloadName: tmpl.downloadName, exists, lastModified };
  });

  return ApiResponse.success(res, result, 'Templates listed');
};

module.exports = { downloadTemplate, replaceTemplate, listTemplates };
