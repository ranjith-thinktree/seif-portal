const { successResponse, errorResponse } = require('../../../utils/response.util');
const { sendExportResponse } = require('../../../utils/export.util');
const {
  ReportService: reportService,
  AnalyticsService,
  PreferenceService,
} = require('../services/report.service');
const emailService = require('../../../utils/email.util');

class ReportController {
  async getMetadata(req, res) {
    try {
      const data = reportService.getDatasetMetadata();
      return successResponse(res, 'Report metadata fetched successfully', data);
    } catch (error) {
      return errorResponse(res, error.message || 'Failed to fetch report metadata', 500);
    }
  }

  async listDefinitions(req, res) {
    try {
      const data = await reportService.listDefinitions(req.user);
      return successResponse(res, 'Reports fetched successfully', data);
    } catch (error) {
      return errorResponse(res, error.message || 'Failed to fetch reports', 500);
    }
  }

  async createDefinition(req, res) {
    try {
      const data = await reportService.createDefinition(req.body, req.user);
      return successResponse(res, 'Report created successfully', data, 201);
    } catch (error) {
      return errorResponse(res, error.message || 'Failed to create report', 400);
    }
  }

  async updateDefinition(req, res) {
    try {
      const data = await reportService.updateDefinition(req.params.id, req.body, req.user);
      return successResponse(res, 'Report updated successfully', data);
    } catch (error) {
      return errorResponse(res, error.message || 'Failed to update report', 400);
    }
  }

  async deleteDefinition(req, res) {
    try {
      const deleted = await reportService.deleteDefinition(req.params.id);
      if (!deleted) {
        return errorResponse(res, 'Report not found', 404);
      }
      return successResponse(res, 'Report deleted successfully', { id: req.params.id });
    } catch (error) {
      return errorResponse(res, error.message || 'Failed to delete report', 400);
    }
  }

  async runDefinition(req, res) {
    try {
      const data = await reportService.runDefinition(req.params.id, req.user);
      return successResponse(res, 'Report preview generated successfully', data);
    } catch (error) {
      const status = error.message === 'Access denied' ? 403 : 400;
      return errorResponse(res, error.message || 'Failed to run report', status);
    }
  }

  async exportDefinition(req, res) {
    try {
      const { format = 'csv' } = req.query;
      const { definition, rows } = await reportService.exportDefinition(req.params.id, req.user);

      if (!rows.length) {
        return errorResponse(res, 'No data found for export', 404);
      }

      return sendExportResponse(res, rows, {
        format,
        baseFileName: `report_${definition.name.replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase()}`,
        title: definition.name,
        sheetName: 'Report',
      });
    } catch (error) {
      const status = error.message === 'Export not allowed for this role' ? 403 : 400;
      return errorResponse(res, error.message || 'Failed to export report', status);
    }
  }

  async emailDefinition(req, res) {
    try {
      const { toEmail } = req.body;
      if (!toEmail) {
        return errorResponse(res, 'toEmail is required', 400);
      }

      const { buildExportPayload } = require('../../../utils/export.util');
      const { definition, rows } = await reportService.exportDefinition(req.params.id, req.user);

      if (!rows.length) {
        return errorResponse(res, 'No data found for email export', 404);
      }

      const payload = await buildExportPayload(rows, {
        format: req.body.format || definition.default_format || 'csv',
        baseFileName: `report_${definition.name.replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase()}`,
        title: definition.name,
        sheetName: 'Report',
      });

      await emailService.sendReportExportEmail({
        toEmail,
        recipientName: req.user.full_name || req.user.email || 'User',
        reportName: definition.name,
        attachment: {
          filename: payload.filename,
          content: payload.body,
          contentType: payload.contentType,
        },
      });

      return successResponse(res, 'Report emailed successfully', { toEmail });
    } catch (error) {
      const status = error.message === 'Export not allowed for this role' ? 403 : 400;
      return errorResponse(res, error.message || 'Failed to email report', status);
    }
  }

  // ─── Analytics ───────────────────────────────────────────────────────────

  async getAnalyticsKpi(req, res) {
    try {
      const data = await AnalyticsService.getKpiSummary(req.query.year);
      return successResponse(res, 'KPI summary fetched', data);
    } catch (error) {
      return errorResponse(res, error.message || 'Failed to fetch KPI summary', 500);
    }
  }

  async getAnalyticsGender(req, res) {
    try {
      const data = await AnalyticsService.getGenderBreakdown(req.query.year);
      return successResponse(res, 'Gender breakdown fetched', data);
    } catch (error) {
      return errorResponse(res, error.message || 'Failed to fetch gender breakdown', 500);
    }
  }

  async getAnalyticsState(req, res) {
    try {
      const data = await AnalyticsService.getStateDistribution(req.query.year);
      return successResponse(res, 'State distribution fetched', data);
    } catch (error) {
      return errorResponse(res, error.message || 'Failed to fetch state distribution', 500);
    }
  }

  async getAnalyticsPerformance(req, res) {
    try {
      const data = await AnalyticsService.getEmploymentDistribution(req.query.year);
      return successResponse(res, 'Performance distribution fetched', data);
    } catch (error) {
      return errorResponse(res, error.message || 'Failed to fetch performance distribution', 500);
    }
  }

  async getAnalyticsCourses(req, res) {
    try {
      const data = await AnalyticsService.getCoursePerformance(req.query.year);
      return successResponse(res, 'Course performance fetched', data);
    } catch (error) {
      return errorResponse(res, error.message || 'Failed to fetch course performance', 500);
    }
  }

  async getAnalyticsPartners(req, res) {
    try {
      const data = await AnalyticsService.getPartnerPerformance(req.query.year);
      return successResponse(res, 'Partner performance fetched', data);
    } catch (error) {
      return errorResponse(res, error.message || 'Failed to fetch partner performance', 500);
    }
  }

  async getAnalyticsTrend(req, res) {
    try {
      const data = await AnalyticsService.getAnalyticsTrend();
      return successResponse(res, 'Analytics trend fetched', data);
    } catch (error) {
      return errorResponse(res, error.message || 'Failed to fetch analytics trend', 500);
    }
  }

  async getReportLayout(req, res) {
    try {
      const layout = await PreferenceService.getLayout(req.user.id);
      return successResponse(res, 'Report layout fetched', layout);
    } catch (error) {
      return errorResponse(res, error.message || 'Failed to fetch report layout', 500);
    }
  }

  async saveReportLayout(req, res) {
    try {
      const { order } = req.body;
      if (!Array.isArray(order)) {
        return errorResponse(res, 'order must be an array', 400);
      }
      const saved = await PreferenceService.saveLayout(req.user.id, order);
      return successResponse(res, 'Report layout saved', saved);
    } catch (error) {
      return errorResponse(res, error.message || 'Failed to save report layout', 500);
    }
  }

  async getReportPreferences(req, res) {
    try {
      const prefs = await PreferenceService.getPreferences(req.user.id);
      return successResponse(res, 'Report preferences fetched', prefs);
    } catch (error) {
      return errorResponse(res, error.message || 'Failed to fetch report preferences', 500);
    }
  }

  async saveReportPreferences(req, res) {
    try {
      const { layoutRows, config, kpiOrder } = req.body;
      await PreferenceService.savePreferences(req.user.id, { layoutRows, config, kpiOrder });
      return successResponse(res, 'Report preferences saved', null);
    } catch (error) {
      return errorResponse(res, error.message || 'Failed to save report preferences', 500);
    }
  }

  // ─── Centers Analytics ───────────────────────────────────────────────────

  async getAnalyticsCentersState(req, res) {
    try {
      const data = await AnalyticsService.getCentersByState(req.query.year);
      return successResponse(res, 'Centers by state fetched', data);
    } catch (error) {
      return errorResponse(res, error.message || 'Failed to fetch centers by state', 500);
    }
  }

  async getAnalyticsCentersTrend(req, res) {
    try {
      const data = await AnalyticsService.getCenterGrowthTrend();
      return successResponse(res, 'Centers growth trend fetched', data);
    } catch (error) {
      return errorResponse(res, error.message || 'Failed to fetch centers growth trend', 500);
    }
  }

  async getAnalyticsCentersType(req, res) {
    try {
      const data = await AnalyticsService.getCentersByType(req.query.year);
      return successResponse(res, 'Centers by type fetched', data);
    } catch (error) {
      return errorResponse(res, error.message || 'Failed to fetch centers by type', 500);
    }
  }

  async getAnalyticsCentersRegion(req, res) {
    try {
      const data = await AnalyticsService.getCentersByRegion(req.query.year);
      return successResponse(res, 'Centers by region fetched', data);
    } catch (error) {
      return errorResponse(res, error.message || 'Failed to fetch centers by region', 500);
    }
  }

  async getAnalyticsCentersPerformance(req, res) {
    try {
      const data = await AnalyticsService.getCenterPerformance(req.query.year);
      return successResponse(res, 'Centers performance fetched', data);
    } catch (error) {
      return errorResponse(res, error.message || 'Failed to fetch centers performance', 500);
    }
  }
}

module.exports = new ReportController();
