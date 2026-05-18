const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { checkRole } = require('../../../middleware/role.middleware');

const REPORTING_ROLES = ['SUPER_ADMIN', 'ADMIN', 'SEIF_READONLY', 'SEIF_READONLY_DOWNLOAD'];

const MANAGE_ROLES = ['SUPER_ADMIN', 'ADMIN'];
const EXPORT_ROLES = ['SUPER_ADMIN', 'ADMIN', 'SEIF_READONLY_DOWNLOAD'];

// ─── Analytics (Impact & Performance Dashboard) ───────────────────────────
router.get(
  '/analytics/kpi',
  authenticate,
  checkRole(REPORTING_ROLES),
  reportController.getAnalyticsKpi.bind(reportController)
);
router.get(
  '/analytics/gender',
  authenticate,
  checkRole(REPORTING_ROLES),
  reportController.getAnalyticsGender.bind(reportController)
);
router.get(
  '/analytics/state',
  authenticate,
  checkRole(REPORTING_ROLES),
  reportController.getAnalyticsState.bind(reportController)
);
router.get(
  '/analytics/performance',
  authenticate,
  checkRole(REPORTING_ROLES),
  reportController.getAnalyticsPerformance.bind(reportController)
);
router.get(
  '/analytics/courses',
  authenticate,
  checkRole(REPORTING_ROLES),
  reportController.getAnalyticsCourses.bind(reportController)
);
router.get(
  '/analytics/partners',
  authenticate,
  checkRole(REPORTING_ROLES),
  reportController.getAnalyticsPartners.bind(reportController)
);
router.get(
  '/analytics/trend',
  authenticate,
  checkRole(REPORTING_ROLES),
  reportController.getAnalyticsTrend.bind(reportController)
);
router.get(
  '/analytics/centers/state',
  authenticate,
  checkRole(REPORTING_ROLES),
  reportController.getAnalyticsCentersState.bind(reportController)
);
router.get(
  '/analytics/centers/trend',
  authenticate,
  checkRole(REPORTING_ROLES),
  reportController.getAnalyticsCentersTrend.bind(reportController)
);
router.get(
  '/analytics/centers/type',
  authenticate,
  checkRole(REPORTING_ROLES),
  reportController.getAnalyticsCentersType.bind(reportController)
);
router.get(
  '/analytics/centers/region',
  authenticate,
  checkRole(REPORTING_ROLES),
  reportController.getAnalyticsCentersRegion.bind(reportController)
);
router.get(
  '/analytics/centers/performance',
  authenticate,
  checkRole(REPORTING_ROLES),
  reportController.getAnalyticsCentersPerformance.bind(reportController)
);
router.get(
  '/layout',
  authenticate,
  checkRole(REPORTING_ROLES),
  reportController.getReportLayout.bind(reportController)
);
router.put(
  '/layout',
  authenticate,
  checkRole(MANAGE_ROLES),
  reportController.saveReportLayout.bind(reportController)
);
router.get(
  '/preferences',
  authenticate,
  checkRole(REPORTING_ROLES),
  reportController.getReportPreferences.bind(reportController)
);
router.put(
  '/preferences',
  authenticate,
  checkRole(REPORTING_ROLES),
  reportController.saveReportPreferences.bind(reportController)
);

// ─── Report definitions ───────────────────────────────────────────────────
router.get(
  '/metadata',
  authenticate,
  checkRole(REPORTING_ROLES),
  reportController.getMetadata.bind(reportController)
);
router.get(
  '/definitions',
  authenticate,
  checkRole(REPORTING_ROLES),
  reportController.listDefinitions.bind(reportController)
);
router.post(
  '/definitions',
  authenticate,
  checkRole(MANAGE_ROLES),
  reportController.createDefinition.bind(reportController)
);
router.put(
  '/definitions/:id',
  authenticate,
  checkRole(MANAGE_ROLES),
  reportController.updateDefinition.bind(reportController)
);
router.delete(
  '/definitions/:id',
  authenticate,
  checkRole(MANAGE_ROLES),
  reportController.deleteDefinition.bind(reportController)
);
router.post(
  '/definitions/:id/run',
  authenticate,
  checkRole(REPORTING_ROLES),
  reportController.runDefinition.bind(reportController)
);
router.get(
  '/definitions/:id/export',
  authenticate,
  checkRole(EXPORT_ROLES),
  reportController.exportDefinition.bind(reportController)
);
router.post(
  '/definitions/:id/email',
  authenticate,
  checkRole(EXPORT_ROLES),
  reportController.emailDefinition.bind(reportController)
);

module.exports = router;
