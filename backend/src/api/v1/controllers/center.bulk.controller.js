const centerBulkService = require('../services/center.bulk.service');

/**
 * Center Bulk Controller
 * Handles HTTP requests for bulk center operations
 */
class CenterBulkController {
  /**
   * Bulk upload centers from CSV
   * POST /api/v1/centers/bulk-upload
   */
  async bulkUploadCenters(req, res) {
    try {
      console.log('📤 Bulk center upload request received');

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
      }

      const createdByRole = req.user.role;
      console.log(`👤 User role: ${createdByRole}`);

      // Process the CSV file
      const result = await centerBulkService.processBulkUpload(req.file.buffer, createdByRole);

      // Return 207 Multi-Status if there are partial failures
      const statusCode = result.failed > 0 ? 207 : 200;

      return res.status(statusCode).json({
        success: true,
        message: `Bulk upload completed: ${result.successful} successful, ${result.failed} failed`,
        data: result,
      });
    } catch (error) {
      console.error('❌ Error in bulkUploadCenters:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to process bulk upload',
      });
    }
  }

  /**
   * Download CSV template
   * GET /api/v1/centers/bulk-template
   */
  async downloadTemplate(req, res) {
    try {
      const template = centerBulkService.generateCSVTemplate();

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=center_bulk_upload_template.csv');

      return res.send(template);
    } catch (error) {
      console.error('❌ Error in downloadTemplate:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate template',
      });
    }
  }
}

module.exports = new CenterBulkController();
