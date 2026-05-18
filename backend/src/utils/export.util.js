const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const EXPORT_FORMATS = {
  CSV: 'csv',
  EXCEL: 'excel',
  PDF: 'pdf',
};

const normalizeFormat = (format = 'csv') => {
  const value = String(format).toLowerCase();

  if (value === 'xlsx' || value === 'excel') return EXPORT_FORMATS.EXCEL;
  if (value === 'pdf') return EXPORT_FORMATS.PDF;
  return EXPORT_FORMATS.CSV;
};

const getFileExtension = (format) => {
  if (format === EXPORT_FORMATS.EXCEL) return 'xlsx';
  return format;
};

const getContentType = (format) => {
  switch (format) {
    case EXPORT_FORMATS.EXCEL:
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case EXPORT_FORMATS.PDF:
      return 'application/pdf';
    case EXPORT_FORMATS.CSV:
    default:
      return 'text/csv';
  }
};

const buildCsvContent = (rows) => {
  const parser = new Parser();
  return parser.parse(rows);
};

const buildExcelBuffer = async (rows, sheetName) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  const headers = Object.keys(rows[0] || {});

  worksheet.columns = headers.map((header) => ({
    header,
    key: header,
    width: Math.min(Math.max(header.length + 4, 18), 32),
  }));

  rows.forEach((row) => worksheet.addRow(row));

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'top', wrapText: true };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

const buildPdfBuffer = (rows, title) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text(title, { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#555555').text(`Generated: ${new Date().toLocaleString()}`);
    doc.text(`Total records: ${rows.length}`);
    doc.moveDown();
    doc.fillColor('#000000');

    rows.forEach((row, index) => {
      if (index > 0) {
        doc.moveDown(0.6);
      }

      doc.fontSize(12).text(`Record ${index + 1}`, { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10);

      Object.entries(row).forEach(([key, value]) => {
        const safeValue =
          value === null || value === undefined || value === '' ? '—' : String(value);
        doc.text(`${key}: ${safeValue}`);

        if (doc.y > doc.page.height - 60) {
          doc.addPage();
        }
      });

      if (doc.y > doc.page.height - 80) {
        doc.addPage();
      }
    });

    doc.end();
  });

const buildExportPayload = async (rows, { format = 'csv', baseFileName, title, sheetName }) => {
  const normalizedFormat = normalizeFormat(format);
  const extension = getFileExtension(normalizedFormat);
  const filename = `${baseFileName}_${Date.now()}.${extension}`;
  const contentType = getContentType(normalizedFormat);

  let body;
  if (normalizedFormat === EXPORT_FORMATS.EXCEL) {
    body = await buildExcelBuffer(rows, sheetName || title || baseFileName);
  } else if (normalizedFormat === EXPORT_FORMATS.PDF) {
    body = await buildPdfBuffer(rows, title || baseFileName);
  } else {
    body = buildCsvContent(rows);
  }

  return { body, contentType, filename };
};

const sendExportResponse = async (res, rows, options) => {
  const payload = await buildExportPayload(rows, options);
  res.setHeader('Content-Type', payload.contentType);
  res.setHeader('Content-Disposition', `attachment; filename=${payload.filename}`);
  return res.send(payload.body);
};

module.exports = {
  EXPORT_FORMATS,
  normalizeFormat,
  buildExportPayload,
  sendExportResponse,
};
