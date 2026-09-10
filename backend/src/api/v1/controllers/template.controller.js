const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const ApiResponse = require('../../../utils/response.util');
const { pool } = require('../../../database/connection');

const TEMPLATES_DIR = path.join(__dirname, '../../../../templates');

const ALLOWED_TEMPLATES = {
  refurbishment: {
    filename: 'refurbishment_template.csv',
    downloadName: 'SEIF_Refurbishment_Template.xlsx',
    label: 'Refurbishment Template',
    typeLabel: 'Refurbishment',
  },
  upgradation: {
    filename: 'upgradation_template.csv',
    downloadName: 'SEIF_Upgradation_Template.xlsx',
    label: 'Upgradation Template',
    typeLabel: 'Upgradation',
  },
};

/** Columns after the locked type column that partners fill manually */
const MANUAL_HEADERS = [
  'Space availability',
  'No of students trained 2021-22',
  'No of students trained 2022-23',
  'No of students trained 2023-24',
  'tentative no of students to be trained 2025',
  'tentative no of students to be trained 2026',
  'tentative no of students to be trained 2027',
];

const LOCKED_FILL_BG = 'FFF3F4F6';
const HEADER_FILL = 'FF15803D';
const HEADER_FONT = 'FFFFFFFF';

/** Practical blank capacity — partners fill as many labs/rows as needed */
const MAX_DATA_ROWS = 500;

/** Columns B–G: must match the single prefilled centre / type values */
const RESTRICTED_COL_META = [
  { col: 2, key: 'centerName', label: 'Training Centre name' },
  { col: 3, key: 'location', label: 'Location' },
  { col: 4, key: 'state', label: 'State' },
  { col: 5, key: 'typeLabel', label: 'Request type' },
  { col: 6, key: 'instituteType', label: 'Institute type' },
  { col: 7, key: 'yearEstablished', label: 'Year of establish' },
];

const buildHeaders = (typeLabel) => [
  'Sl.no',
  'Training Centre name',
  'Location',
  'State',
  typeLabel,
  'Institute type',
  'Year of establish',
  'Labs',
  ...MANUAL_HEADERS,
];

/**
 * Load center details for template prefilling.
 * Partners may only access their own centers.
 */
const loadCenterForTemplate = async (centerId, user) => {
  if (!centerId) return null;

  const params = [centerId];
  let partnerFilter = '';
  const role = user?.role || user?.user_role;
  if (role === 'PARTNER' && user.partner_id) {
    partnerFilter = ' AND c.partner_id = ?';
    params.push(user.partner_id);
  }

  const [centers] = await pool.query(
    `SELECT
      c.id,
      c.center_name,
      c.city,
      c.state,
      c.address,
      c.center_type,
      c.year_of_establishment,
      c.partner_id
    FROM centers c
    WHERE c.id = ?${partnerFilter}
    LIMIT 1`,
    params
  );

  if (!centers.length) {
    const err = new Error('Center not found or access denied');
    err.statusCode = 404;
    throw err;
  }

  return centers[0];
};

const applyHeaderStyle = (row) => {
  row.font = { bold: true, color: { argb: HEADER_FONT }, size: 11 };
  row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: HEADER_FILL },
  };
  row.alignment = { vertical: 'middle', wrapText: true, horizontal: 'center' };
  row.height = 32;
};

const lockCell = (cell) => {
  cell.protection = { locked: true };
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: LOCKED_FILL_BG },
  };
};

const unlockCell = (cell) => {
  cell.protection = { locked: false };
};

const colLetter = (colNumber) => {
  let n = colNumber;
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

/**
 * Build Format.xlsx-style workbook:
 * - Row 2: centre fields + type prefilled (Labs blank)
 * - Extra rows: Labs / space / students free; restricted cols only accept the prefilled values
 */
const buildPrefillWorkbook = async (typeLabel, center) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SEIF Portal';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Template', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  const headers = buildHeaders(typeLabel);
  const headerRow = worksheet.addRow(headers);
  applyHeaderStyle(headerRow);

  const allowed = {
    centerName: center?.center_name || '',
    location: center?.city || center?.address || '',
    state: center?.state || '',
    typeLabel,
    instituteType: center?.center_type || '',
    yearEstablished:
      center?.year_of_establishment != null && center?.year_of_establishment !== ''
        ? String(center.year_of_establishment)
        : '',
  };

  // Hidden sheet holds allowed values (safe for commas / special chars in lists)
  const meta = workbook.addWorksheet('_allowed_values');
  meta.state = 'hidden';
  RESTRICTED_COL_META.forEach((item, idx) => {
    meta.getCell(1, idx + 1).value = allowed[item.key];
  });

  const blankManual = MANUAL_HEADERS.map(() => '');

  // --- First data row: prefilled centre / type; Labs empty ---
  const firstRow = worksheet.addRow([
    1,
    allowed.centerName,
    allowed.location,
    allowed.state,
    allowed.typeLabel,
    allowed.instituteType,
    allowed.yearEstablished,
    '', // Labs — partner fills per lab row
    ...blankManual,
  ]);

  for (let col = 1; col <= headers.length; col += 1) {
    const cell = firstRow.getCell(col);
    if (col >= 2 && col <= 7) {
      lockCell(cell);
    } else {
      unlockCell(cell);
    }
  }

  // --- Remaining rows: empty Labs; restricted cols validated to prefilled values only ---
  for (let i = 2; i <= MAX_DATA_ROWS; i += 1) {
    const excelRow = worksheet.addRow([
      i,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      ...blankManual,
    ]);

    for (let col = 1; col <= headers.length; col += 1) {
      unlockCell(excelRow.getCell(col));
    }
  }

  const lastRow = MAX_DATA_ROWS + 1; // header is row 1; data rows 2..(MAX+1)
  RESTRICTED_COL_META.forEach((item, idx) => {
    const letter = colLetter(item.col);
    const metaCol = colLetter(idx + 1);
    const value = allowed[item.key];
    const hasValue = value !== '';

    worksheet.dataValidations.add(`${letter}2:${letter}${lastRow}`, {
      type: 'list',
      allowBlank: true,
      formulae: [`_allowed_values!$${metaCol}$1`],
      showErrorMessage: true,
      errorStyle: 'stop',
      errorTitle: 'Invalid value',
      error: hasValue
        ? `Only "${value}" is allowed for ${item.label}.`
        : `No ${item.label} is configured for this centre. Contact SEIF admin.`,
      showInputMessage: true,
      promptTitle: item.label,
      prompt: hasValue
        ? `Use the same value as the first row: ${value}`
        : `Leave blank or ask admin to update centre details.`,
    });
  });

  headers.forEach((header, idx) => {
    const col = worksheet.getColumn(idx + 1);
    col.width = Math.min(Math.max(header.length + 2, 14), 36);
  });
  worksheet.getColumn(2).width = 32;
  worksheet.getColumn(8).width = 28;

  // Unlockable cells remain editable; locked prefilled cells stay fixed.
  // insertRows allowed so partners can extend past the prepared range if needed.
  await worksheet.protect('', {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertColumns: false,
    insertRows: true,
    deleteColumns: false,
    deleteRows: true,
    sort: false,
    autoFilter: false,
    pivotTables: false,
  });

  return workbook.xlsx.writeBuffer();
};

/**
 * GET /api/v1/templates/:name?centerId=...
 * Download a prefilled Excel template for the requested center.
 */
const downloadTemplate = async (req, res) => {
  const { name } = req.params;
  const template = ALLOWED_TEMPLATES[name];

  if (!template) {
    return res.status(404).json({ success: false, message: 'Template not found' });
  }

  try {
    const centerId = req.query.centerId || req.query.center_id || null;
    const center = await loadCenterForTemplate(centerId, req.user);
    const buffer = await buildPrefillWorkbook(template.typeLabel, center);

    const safeCenter = (center?.center_name || 'Template')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '_');
    const downloadName = center
      ? `SEIF_${template.typeLabel}_Template_${safeCenter}.xlsx`
      : template.downloadName;

    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    return res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Error generating Excel template:', error);
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to generate Excel template',
    });
  }
};

/**
 * POST /api/v1/admin/templates/:name
 * Replace a template schema file (admin only) — kept for compatibility.
 * Prefill generation no longer depends on this CSV content for headers.
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

module.exports = {
  downloadTemplate,
  replaceTemplate,
  listTemplates,
  buildHeaders,
  buildPrefillWorkbook,
};
