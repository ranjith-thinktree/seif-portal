'use strict';

const fileArchiveService = require('../services/certificationFileArchive.service');

function parseFilters(query = {}, body = {}) {
  const source = { ...query, ...body };
  return {
    page: source.page,
    limit: source.limit,
    dateTypes: source.dateTypes,
    months: source.months,
    year: source.year,
    years: source.years,
    fromDate: source.fromDate,
    toDate: source.toDate,
    traineeMetrics: source.traineeMetrics,
    assessmentMonth: source.assessmentMonth,
    assessmentYear: source.assessmentYear,
    requestMonth: source.requestMonth,
    requestYear: source.requestYear,
    batchStartMonth: source.batchStartMonth,
    batchStartYear: source.batchStartYear,
    batchEndMonth: source.batchEndMonth,
    batchEndYear: source.batchEndYear,
    registered: source.registered,
    attended: source.attended,
    passed: source.passed,
    failed: source.failed,
    fileIds: source.fileIds,
  };
}

function getExportFileSuffix() {
  return new Date().toISOString().slice(0, 10);
}

exports.listArchivedFiles = async (req, res) => {
  try {
    const result = await fileArchiveService.listArchivedCertificationRecords(parseFilters(req.query));
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[certFileArchive] list error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.downloadArchivedFile = async (req, res) => {
  try {
    const file = await fileArchiveService.getArchivedFileById(req.params.fileId);
    if (!file || file.pdf_status !== 'approved') {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const role = req.user?.role;
    const isStaff = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'ESSCI';
    if (role === 'PARTNER') {
      const partnerId = req.user.partner_id || req.user.id;
      if (!file.partner_id || String(file.partner_id) !== String(partnerId)) {
        return res.status(403).json({
          success: false,
          message: 'You can only download files for your own certification requests',
        });
      }
    } else if (!isStaff) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const abs = fileArchiveService.resolveArchiveAbsolutePath(file.archive_path);
    if (!abs || !require('fs').existsSync(abs)) {
      return res.status(404).json({ success: false, message: 'File missing on disk' });
    }

    res.download(abs, file.original_name);
  } catch (error) {
    console.error('[certFileArchive] download error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.exportMonthlyZip = async (req, res) => {
  try {
    await fileArchiveService.streamCertificateZip(parseFilters(req.query, req.body), res);
  } catch (error) {
    console.error('[certFileArchive] zip error:', error);
    const status = error.statusCode || 500;
    if (!res.headersSent) {
      res.status(status).json({ success: false, message: error.message });
    }
  }
};

exports.exportMergedExcel = async (req, res) => {
  try {
    const workbook = await fileArchiveService.buildMergedResultExcel(parseFilters(req.query, req.body));
    const fileName = `certification_results_${getExportFileSuffix()}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('[certFileArchive] excel error:', error);
    const status = error.statusCode || 500;
    if (!res.headersSent) {
      res.status(status).json({ success: false, message: error.message });
    }
  }
};
