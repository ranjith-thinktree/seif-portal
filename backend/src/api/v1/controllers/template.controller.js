const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const ApiResponse = require('../../../utils/response.util');

const TEMPLATES_DIR = path.join(__dirname, '../../../../templates');

const ALLOWED_TEMPLATES = {
  refurbishment: {
    filename: 'refurbishment_template.csv',
    downloadName: 'SEIF_Refurbishment_Template.xlsx',
    label: 'Refurbishment Template',
  },
  upgradation: {
    filename: 'upgradation_template.csv',
    downloadName: 'SEIF_Upgradation_Template.xlsx',
    label: 'Upgradation Template',
  },
};

const parseCsvLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
};

const csvToRows = (csvText) =>
  csvText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseCsvLine);

const buildXlsxBufferFromCsv = async (csvPath) => {
  const csvText = fs.readFileSync(csvPath, 'utf8');
  const rows = csvToRows(csvText);
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Template');

  rows.forEach((row, rowIndex) => {
    const excelRow = worksheet.addRow(row);
    if (rowIndex === 0) {
      excelRow.font = { bold: true };
    }
  });

  worksheet.columns.forEach((column) => {
    let maxLength = 12;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const value = cell.value == null ? '' : String(cell.value);
      maxLength = Math.max(maxLength, Math.min(value.length + 2, 40));
    });
    column.width = maxLength;
  });

  return workbook.xlsx.writeBuffer();
};

/**
 * GET /api/v1/templates/:name
 * Download a template file as Excel (.xlsx)
 */
const downloadTemplate = async (req, res) => {
  const { name } = req.params;
  const template = ALLOWED_TEMPLATES[name];

  if (!template) {
    return res.status(404).json({ success: false, message: 'Template not found' });
  }

  const filePath = path.join(TEMPLATES_DIR, template.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'Template file not found on server' });
  }

  try {
    const buffer = await buildXlsxBufferFromCsv(filePath);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${template.downloadName}"`
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    return res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Error generating Excel template:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate Excel template',
    });
  }
};

/**
 * POST /api/v1/admin/templates/:name
 * Replace a template file (admin only)
 * Expects multipart/form-data with field "template" (.xlsx or .csv)
 */
const replaceTemplate = async (req, res) => {
  const { name } = req.params;
  const template = ALLOWED_TEMPLATES[name];

  if (!template) {
    return ApiResponse.error(res, 'Template not found', 404);
  }

  if (!req.file) {
    return ApiResponse.error(res, 'No file uploaded', 400);
  }

  const originalName = (req.file.originalname || '').toLowerCase();
  const isCsv = originalName.endsWith('.csv') || req.file.mimetype === 'text/csv';
  const isXlsx =
    originalName.endsWith('.xlsx') ||
    originalName.endsWith('.xls') ||
    req.file.mimetype ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    req.file.mimetype === 'application/vnd.ms-excel';

  if (!isCsv && !isXlsx) {
    try {
      fs.unlinkSync(req.file.path);
    } catch {
      // ignore cleanup errors
    }
    return ApiResponse.error(res, 'Only .xlsx or .csv files are allowed', 400);
  }

  const destPath = path.join(TEMPLATES_DIR, template.filename);

  try {
    if (!fs.existsSync(TEMPLATES_DIR)) {
      fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
    }

    if (isCsv) {
      fs.renameSync(req.file.path, destPath);
    } else {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(req.file.path);
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        return ApiResponse.error(res, 'Uploaded Excel file has no worksheets', 400);
      }

      const lines = [];
      worksheet.eachRow({ includeEmpty: false }, (row) => {
        const values = [];
        for (let i = 1; i <= row.cellCount; i += 1) {
          const cell = row.getCell(i);
          const raw = cell.value == null ? '' : cell.value;
          const text =
            typeof raw === 'object' && raw.text != null
              ? String(raw.text)
              : String(raw);
          const needsQuotes = /[",\n]/.test(text);
          values.push(needsQuotes ? `"${text.replace(/"/g, '""')}"` : text);
        }
        lines.push(values.join(','));
      });

      fs.writeFileSync(destPath, `${lines.join('\n')}\n`, 'utf8');
      try {
        fs.unlinkSync(req.file.path);
      } catch {
        // ignore cleanup errors
      }
    }

    return ApiResponse.success(
      res,
      { name, filename: template.downloadName },
      `${template.label} replaced successfully`
    );
  } catch (error) {
    console.error('Error replacing template:', error);
    try {
      fs.unlinkSync(req.file.path);
    } catch {
      // ignore cleanup errors
    }
    return ApiResponse.error(res, 'Failed to save template file', 500);
  }
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
