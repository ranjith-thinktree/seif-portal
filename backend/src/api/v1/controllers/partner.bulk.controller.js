const partnerBulkService = require('../services/partner.bulk.service');
const { successResponse, errorResponse } = require('../../../utils/response.util');

/**
 * Partner Bulk Operations Controller
 * Handles CSV bulk upload for partner creation
 */
class PartnerBulkController {
  /**
   * Upload CSV and create multiple partners
   * @route POST /api/v1/partners/bulk-upload
   * @access Admin, SUPER_ADMIN
   */
  async bulkUploadPartners(req, res) {
    try {
      if (!req.file) {
        return errorResponse(res, 'CSV file is required', 400);
      }

      // Pass user role to service for approval logic
      const userRole = req.user.role;
      const result = await partnerBulkService.processBulkUpload(req.file, userRole);

      return successResponse(
        res,
        'Bulk partner upload completed',
        {
          total: result.total,
          successful: result.successful,
          failed: result.failed,
          results: result.results,
          errors: result.errors,
        },
        result.failed > 0 ? 207 : 201 // 207 Multi-Status if some failed
      );
    } catch (error) {
      console.error('Error in bulkUploadPartners:', error);
      return errorResponse(res, error.message || 'Failed to process bulk upload', 500);
    }
  }

  /**
   * Download CSV template for bulk partner upload
   * @route GET /api/v1/partners/bulk-template
   * @access Admin, SUPER_ADMIN
   */
  async downloadTemplate(req, res) {
    try {
      const csvContent = partnerBulkService.generateCSVTemplate();

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=partner_bulk_upload_template.csv');

      return res.send(csvContent);
    } catch (error) {
      console.error('Error in downloadTemplate:', error);
      return errorResponse(res, 'Failed to generate template', 500);
    }
  }
}

module.exports = new PartnerBulkController();
