const express = require('express');
const router = express.Router();
const partnerController = require('../controllers/partner.controller');
const partnerBulkController = require('../controllers/partner.bulk.controller');
const { authenticate, authorize } = require('../../../middleware/auth.middleware');
const { checkRole } = require('../../../middleware/role.middleware');
const { validate } = require('../../../middleware/validate.middleware');
const multer = require('multer');
const {
  createPartnerValidator,
  updatePartnerValidator,
  partnerIdValidator,
  listPartnersValidator,
  approvePartnerValidator,
  rejectPartnerValidator,
} = require('../validators/partner.validator');

// Configure multer for CSV upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

/**
 * @route   GET /api/v1/partners
 * @desc    Get all partners with pagination
 * @access  Private (Admin, SUPER_ADMIN, ESSCI, SEIF_READONLY)
 */
router.get(
  '/',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN', 'ESSCI', 'SEIF_READONLY']),
  listPartnersValidator,
  validate(),
  partnerController.getAllPartners
);

/**
 * @route   GET /api/v1/partners/filter-options
 * @desc    Get filter options for partners
 * @access  Private (Admin, SUPER_ADMIN, ESSCI, SEIF_READONLY)
 */
router.get(
  '/filter-options',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN', 'ESSCI', 'SEIF_READONLY']),
  partnerController.getFilterOptions
);

/**
 * @route   POST /api/v1/partners/bulk-upload
 * @desc    Bulk upload partners from CSV
 * @access  Private (ADMIN, SUPER_ADMIN)
 */
router.post(
  '/bulk-upload',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  upload.single('file'),
  partnerBulkController.bulkUploadPartners
);

/**
 * @route   GET /api/v1/partners/bulk-template
 * @desc    Download CSV template for bulk partner upload
 * @access  Private (ADMIN, SUPER_ADMIN)
 */
router.get(
  '/bulk-template',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  partnerBulkController.downloadTemplate
);

/**
 * @route   GET /api/v1/partners/export
 * @desc    Export partners as CSV
 * @access  Private (Admin, SUPER_ADMIN, ESSCI)
 */
router.get(
  '/export',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN', 'ESSCI']),
  partnerController.exportPartners
);

/**
 * @route   GET /api/v1/partners/rejected-uploads
 * @desc    Get rejected uploads for logged-in partner
 * @access  Private (PARTNER)
 */
router.get(
  '/rejected-uploads',
  authenticate,
  checkRole(['PARTNER']),
  partnerController.getRejectedUploads
);

/**
 * @route   GET /api/v1/partners/:id
 * @desc    Get partner by ID
 * @access  Private (Admin, SUPER_ADMIN, ESSCI, SEIF_READONLY)
 */
router.get(
  '/:id',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN', 'ESSCI', 'SEIF_READONLY']),
  partnerIdValidator,
  validate(),
  partnerController.getPartnerById
);

/**
 * @route   POST /api/v1/partners
 * @desc    Create new partner
 * @access  Private (Admin, SUPER_ADMIN)
 */
router.post(
  '/',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  createPartnerValidator,
  validate(),
  partnerController.createPartner
);

/**
 * @route   PUT /api/v1/partners/:id
 * @desc    Update partner
 * @access  Private (Admin, SUPER_ADMIN)
 */
router.put(
  '/:id',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  updatePartnerValidator,
  validate(),
  partnerController.updatePartner
);

/**
 * @route   DELETE /api/v1/partners/:id
 * @desc    Delete partner
 * @access  Private (Admin, SUPER_ADMIN)
 */
router.delete(
  '/:id',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  partnerIdValidator,
  validate(),
  partnerController.deletePartner
);

/**
 * @route   POST /api/v1/partners/bulk-delete
 * @desc    Bulk delete partners
 * @access  Private (Admin, SUPER_ADMIN)
 */
router.post(
  '/bulk-delete',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  partnerController.bulkDeletePartners
);

/**
 * @route   PATCH /api/v1/partners/:id/approve
 * @desc    Approve partner
 * @access  Private (Admin, SUPER_ADMIN)
 */
router.patch(
  '/:id/approve',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  approvePartnerValidator,
  validate(),
  partnerController.approvePartner
);

/**
 * @route   PATCH /api/v1/partners/:id/reject
 * @desc    Reject partner
 * @access  Private (Admin, SUPER_ADMIN)
 */
router.patch(
  '/:id/reject',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  rejectPartnerValidator,
  validate(),
  partnerController.rejectPartner
);

/**
 * @route   POST /api/v1/partners/:id/resend-email
 * @desc    Resend welcome email to partner
 * @access  Private (Admin, SUPER_ADMIN)
 */
router.post(
  '/:id/resend-email',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  partnerIdValidator,
  validate(),
  partnerController.resendWelcomeEmail
);

/**
 * @route   GET /api/v1/partners/uploads/:uploadId/rejected-centers
 * @desc    Get rejected centers for a specific upload
 * @access  Private (PARTNER)
 */
router.get(
  '/uploads/:uploadId/rejected-centers',
  authenticate,
  checkRole(['PARTNER']),
  partnerController.getRejectedCenters
);

/**
 * @route   GET /api/v1/partners/uploads/:uploadId/centers/:centerId/students
 * @desc    Get students for editing (partner only sees rejected centers)
 * @access  Private (PARTNER)
 */
router.get(
  '/uploads/:uploadId/centers/:centerId/students',
  authenticate,
  checkRole(['PARTNER']),
  partnerController.getCenterStudentsForEdit
);

/**
 * @route   GET /api/v1/partners/centers/:centerId/batches
 * @desc    Get available batches for a center (for autocomplete)
 * @access  Private (PARTNER)
 */
router.get(
  '/centers/:centerId/batches',
  authenticate,
  checkRole(['PARTNER']),
  partnerController.getCenterBatches
);

/**
 * @route   POST /api/v1/partners/uploads/:uploadId/centers/:centerId/save-edits
 * @desc    Save student edits temporarily
 * @access  Private (PARTNER)
 */
router.post(
  '/uploads/:uploadId/centers/:centerId/save-edits',
  authenticate,
  checkRole(['PARTNER']),
  partnerController.saveStudentEdits
);

/**
 * @route   POST /api/v1/partners/uploads/:uploadId/centers/:centerId/upload-csv
 * @desc    Upload CSV and perform smart merge
 * @access  Private (PARTNER)
 */
router.post(
  '/uploads/:uploadId/centers/:centerId/upload-csv',
  authenticate,
  checkRole(['PARTNER']),
  partnerController.uploadCsvSmartMerge
);

/**
 * @route   POST /api/v1/partners/uploads/:uploadId/resubmit
 * @desc    Resubmit upload (create Version 2)
 * @access  Private (PARTNER)
 */
router.post(
  '/uploads/:uploadId/resubmit',
  authenticate,
  checkRole(['PARTNER']),
  partnerController.resubmitUpload
);

/**
 * @route   GET /api/v1/partners/uploads/:uploadId/changes
 * @desc    Get edit logs for highlighting (Admin view)
 * @access  Private (ADMIN, SUPER_ADMIN)
 */
router.get(
  '/uploads/:uploadId/changes',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  partnerController.getUploadChanges
);

// =====================================================
// Reference Data Routes for Partner Onboarding
// =====================================================

/**
 * @route   GET /api/v1/partners/reference/countries
 * @desc    Get all countries
 * @access  Private
 */
router.get('/reference/countries', authenticate, partnerController.getCountries);

/**
 * @route   GET /api/v1/partners/reference/states/:countryId
 * @desc    Get states by country ID
 * @access  Private
 */
router.get('/reference/states/:countryId', authenticate, partnerController.getStatesByCountry);

/**
 * @route   GET /api/v1/partners/reference/cities
 * @desc    Get cities by state and country (query params: stateId, countryId)
 * @access  Private
 */
router.get('/reference/cities', authenticate, partnerController.getCitiesByStateAndCountry);

/**
 * @route   GET /api/v1/partners/reference/regions
 * @desc    Get all regions
 * @access  Private
 */
router.get('/reference/regions', authenticate, partnerController.getRegions);

/**
 * @route   GET /api/v1/partners/reference/registered-as
 * @desc    Get registered_as options
 * @access  Private
 */
router.get('/reference/registered-as', authenticate, partnerController.getRegisteredAsOptions);

/**
 * @route   GET /api/v1/partners/reference/organization-types
 * @desc    Get organization type options
 * @access  Private
 */
router.get(
  '/reference/organization-types',
  authenticate,
  partnerController.getOrganizationTypeOptions
);

module.exports = router;
