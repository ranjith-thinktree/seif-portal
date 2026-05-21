const fs = require('fs');
const path = require('path');
const uploadService = require('../services/upload.service');
const notificationService = require('../services/notification.service');
const csvParser = require('../../../utils/csvParser'); // Keep for backward compatibility
const excelHandler = require('../../../utils/excelHandler'); // NEW: ExcelJS handler
const { emitToRole } = require('../../../websocket/socket');
const { uploadFileToS3 } = require('../../../utils/s3.util');

/**
 * Upload Controller
 * Handles HTTP requests for data uploads
 * Updated to support multiple formats (CSV, XLSX, XLS, XLSM) using ExcelJS
 */

/**
 * Download CSV template
 * GET /api/v1/uploads/template
 */
const downloadTemplate = async (req, res, next) => {
  try {
    const templatePath = path.join(
      __dirname,
      '../../../../templates/SEIF_Data_Upload_Template.csv'
    );

    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({
        success: false,
        message: 'Template file not found',
      });
    }

    res.download(templatePath, 'SEIF_Data_Upload_Template.csv', (err) => {
      if (err) {
        console.error('Error downloading template:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to download template',
        });
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Download Excel template with dynamic partner centers
 * GET /api/v1/uploads/download-template
 * Generates Excel template (.xlsx) with partner's active centers and sample data
 * Updated to use ExcelJS for richer formatting
 */
const downloadDynamicTemplate = async (req, res, next) => {
  try {
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role);

    // Determine partnerId: admin can pass ?partnerId=, partners use their own
    let partnerId;
    if (isAdmin && req.query.partnerId) {
      partnerId = req.query.partnerId;
    } else if (req.user?.partner_id) {
      partnerId = req.user.partner_id;
    } else {
      return res.status(403).json({
        success: false,
        message: 'Partner ID required. Please select a partner or log in as a partner user.',
      });
    }

    // Get partner info
    const partnerData = await uploadService.getPartnerById(partnerId);
    if (!partnerData) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found',
      });
    }

    // Get partner's active centers
    const partnerCenters = await uploadService.getPartnerActiveCenters(partnerId);

    if (!partnerCenters || partnerCenters.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active centers found. Please add centers before uploading data.',
      });
    }

    // Get available courses for dropdown validation
    const availableCourses = await uploadService.getAllCourses();

    // Generate Excel template using ExcelJS
    const workbook = await excelHandler.generateDynamicTemplate(
      partnerCenters,
      partnerData.name,
      availableCourses
    );

    // Set response headers for Excel download
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="SEIF_Data_Upload_Template_${partnerData.name.replace(/\s+/g, '_')}.xlsx"`
    );

    // Write workbook to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generating dynamic template:', error);
    next(error);
  }
};

/**
 * Upload and validate file (CSV, XLSX, XLS, XLSM)
 * POST /api/v1/uploads
 * Updated to support multiple Excel formats using ExcelJS
 */
const uploadCSV = async (req, res, next) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select a file (CSV, XLSX, XLS, or XLSM).',
      });
    }

    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
    const targetPartnerId = req.body.targetPartnerId || null;
    let partnerId = req.user.partner_id;

    if (isAdmin && targetPartnerId) {
      // Admin uploading on behalf of a partner
      partnerId = targetPartnerId;
    } else if (!partnerId) {
      return res.status(403).json({
        success: false,
        message:
          'Partner ID not found. Please ensure you are logged in as a partner user or select a partner.',
      });
    }

    const userId = req.user.id;
    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const fileMimeType = req.file.mimetype;

    // Validate file format before processing
    const fileValidation = excelHandler.validateFile(filePath, fileMimeType, fileName);
    if (!fileValidation.isValid) {
      // Clean up uploaded file
      fs.unlinkSync(filePath);

      return res.status(400).json({
        success: false,
        message: fileValidation.error,
        supportedFormats: fileValidation.supportedFormats,
      });
    }

    // Get partner data from authenticated user
    const partnerData = await uploadService.getPartnerById(partnerId);
    if (!partnerData) {
      // Clean up uploaded file
      fs.unlinkSync(filePath);

      return res.status(404).json({
        success: false,
        message: 'Partner not found. Please contact administrator.',
      });
    }

    // Step 1: Parse file using ExcelJS (supports CSV, XLSX, XLS, XLSM)
    console.log(`📁 Parsing ${fileValidation.format.toUpperCase()} file: ${fileName}`);
    const { rows, totalRows, fileFormat, worksheetName } = await excelHandler.parseExcelFile(
      filePath,
      fileName
    );

    if (totalRows === 0) {
      // Clean up uploaded file
      fs.unlinkSync(filePath);

      return res.status(400).json({
        success: false,
        message: 'File is empty. Please upload a file with data.',
      });
    }

    console.log(`✅ Successfully parsed ${totalRows} rows from ${fileFormat} file`);

    // Step 2: Get partner's active centers for validation
    const partnerCenters = await uploadService.getPartnerActiveCenters(partnerId);

    if (!partnerCenters || partnerCenters.length === 0) {
      // Clean up uploaded file
      fs.unlinkSync(filePath);

      return res.status(400).json({
        success: false,
        message:
          'No active centers found for your account. Please add centers before uploading data.',
      });
    }

    // Create a map of valid center IDs for quick lookup
    const validCenterIds = new Set(partnerCenters.map((c) => c.center_id));
    const invalidCenterIds = new Set();
    const invalidCenterErrors = [];

    // Step 3: Validate center IDs in file
    for (const row of rows) {
      const centerId = row.data['Center ID']?.trim();
      if (centerId && !validCenterIds.has(centerId)) {
        invalidCenterIds.add(centerId);
        invalidCenterErrors.push(
          `Row ${row.rowNumber}, Column: Center ID — center "${centerId}" does not exist or is not active for your account`
        );
      }
    }

    // If any center IDs are invalid, reject entire upload
    if (invalidCenterIds.size > 0) {
      // Clean up uploaded file
      fs.unlinkSync(filePath);

      const invalidCenters = Array.from(invalidCenterIds).join(', ');
      const validCenters = partnerCenters.map((c) => c.center_id).join(', ');

      return res.status(400).json({
        success: false,
        message: `Invalid Center IDs found in upload. The following centers do not exist or are not active: ${invalidCenters}`,
        errors: invalidCenterErrors,
        totalErrors: invalidCenterErrors.length,
        validCenterIds: Array.from(validCenterIds),
        invalidCenterIds: Array.from(invalidCenterIds),
        helpText: `Valid Center IDs for your account: ${validCenters}`,
      });
    }

    // Step 4: Get available courses for validation
    const availableCourses = await uploadService.getAllCourses();

    // Step 5: Validate each row
    const validationErrors = [];
    const validatedRows = [];

    for (const row of rows) {
      const validation = csvParser.validateRow(row, row.rowNumber, availableCourses);

      if (!validation.isValid) {
        validationErrors.push(...validation.errors);
      } else {
        validatedRows.push(validation.row);
      }
    }

    // If there are validation errors, reject entire upload
    if (validationErrors.length > 0) {
      // Clean up uploaded file
      fs.unlinkSync(filePath);

      return res.status(400).json({
        success: false,
        message: `File validation failed (${fileFormat.toUpperCase()} format). Please fix the errors and re-upload.`,
        errors: validationErrors.slice(0, 50), // Return first 50 errors
        totalErrors: validationErrors.length,
      });
    }

    // Step 6: Group data by center and batch
    const centerMap = csvParser.groupRowsByCenter(validatedRows);

    // Step 7: Check for duplicate batches (same batch number for same center)
    const duplicateBatchErrors = await uploadService.checkDuplicateBatches(partnerId, centerMap);

    if (duplicateBatchErrors.length > 0) {
      // Clean up uploaded file
      fs.unlinkSync(filePath);

      return res.status(400).json({
        success: false,
        message:
          'Duplicate batch data detected. The following batches already exist in the system:',
        errors: duplicateBatchErrors,
        totalErrors: duplicateBatchErrors.length,
        helpText: 'Please use different batch numbers or check existing data before uploading.',
      });
    }

    const duplicateUpload = await uploadService.findDuplicateUpload(partnerId, fileName, centerMap);

    if (duplicateUpload) {
      fs.unlinkSync(filePath);

      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_UPLOAD',
        message: duplicateUpload.message,
        helpText: duplicateUpload.helpText,
        duplicateUpload: {
          id: duplicateUpload.id,
          status: duplicateUpload.status,
          fileName: duplicateUpload.fileName,
          createdAt: duplicateUpload.createdAt,
          reviewedAt: duplicateUpload.reviewedAt,
        },
      });
    }

    // Step 8: Generate preview summary with gender breakdown
    const centersArray = Array.from(centerMap.entries());

    // Use partner name from authenticated user
    const partnerName = partnerData.name;

    const summary = {
      fileName,
      fileFormat: fileFormat.toUpperCase(), // Show format to user (CSV, XLSX, XLS)
      worksheetName: worksheetName || 'Sheet1',
      totalRows,
      centersCount: centersArray.length,
      batchesCount: 0,
      studentsCount: totalRows,
      partnerName,
      centers: centersArray.map(([centerId, centerData]) => {
        const batchesArray = Array.from(centerData.batches.entries());
        const batchesCount = batchesArray.length;

        // Find the actual center name from partnerCenters
        const centerInfo = partnerCenters.find((c) => c.center_id === centerId);
        const centerName = centerInfo ? centerInfo.center_name : centerId;

        return {
          centerId,
          centerName,
          city: centerInfo?.city || '',
          state: centerInfo?.state || '',
          batchesCount,
          batches: batchesArray.map(([batchNumber, batchData]) => {
            // Calculate gender breakdown from students array
            const maleCount = batchData.students.filter(
              (s) => s.gender && s.gender.toLowerCase() === 'male'
            ).length;
            const femaleCount = batchData.students.filter(
              (s) => s.gender && s.gender.toLowerCase() === 'female'
            ).length;

            return {
              batchNumber,
              studentsCount: batchData.students.length,
              maleStudents: maleCount,
              femaleStudents: femaleCount,
              startDate: batchData.batchData.batch_start_date,
              completeDate: batchData.batchData.batch_complete_date,
            };
          }),
        };
      }),
    };

    // Calculate total batches
    summary.batchesCount = summary.centers.reduce(
      (total, center) => total + center.batchesCount,
      0
    );

    // Step 9: Return preview (don't save yet)
    res.status(200).json({
      success: true,
      message: `${fileFormat.toUpperCase()} file validation successful! Review the preview before confirming upload. ✅ We accept all formats - no rejections!`,
      preview: summary,
      validation: {
        isValid: true,
        totalRows,
        errorsCount: 0,
        fileFormat: fileFormat.toUpperCase(),
      },
      uploadData: {
        fileName,
        filePath,
        totalRecords: totalRows,
      },
    });
  } catch (error) {
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    console.error('Upload processing error:', error);
    next(error);
  }
};

/**
 * Confirm upload after preview
 * POST /api/v1/uploads/confirm
 */
const confirmUpload = async (req, res, next) => {
  try {
    const { filePath, fileName } = req.body;

    if (!filePath || !fileName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: filePath, fileName',
      });
    }

    // Verify file still exists
    if (!fs.existsSync(filePath)) {
      return res.status(400).json({
        success: false,
        message: 'Upload session expired. Please re-upload the file.',
      });
    }

    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
    const targetPartnerId = req.body.targetPartnerId || null;
    let partnerId = req.user.partner_id;

    if (isAdmin && targetPartnerId) {
      partnerId = targetPartnerId;
    } else if (!partnerId) {
      return res.status(403).json({
        success: false,
        message: 'Partner ID not found.',
      });
    }

    const userId = req.user.id;
    const { rows, totalRows, fileFormat } = await excelHandler.parseExcelFile(filePath, fileName);
    const availableCourses = await uploadService.getAllCourses();

    const validatedRows = [];
    for (const row of rows) {
      const validation = csvParser.validateRow(row, row.rowNumber, availableCourses);
      if (validation.isValid) {
        validatedRows.push(validation.row);
      }
    }

    const centerMap = csvParser.groupRowsByCenter(validatedRows);

    const duplicateUpload = await uploadService.findDuplicateUpload(partnerId, fileName, centerMap);

    if (duplicateUpload) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_UPLOAD',
        message: duplicateUpload.message,
        helpText: duplicateUpload.helpText,
        duplicateUpload: {
          id: duplicateUpload.id,
          status: duplicateUpload.status,
          fileName: duplicateUpload.fileName,
          createdAt: duplicateUpload.createdAt,
          reviewedAt: duplicateUpload.reviewedAt,
        },
      });
    }

    // Create data upload record (initially with local disk path)
    const dataUploadId = await uploadService.createDataUpload({
      partnerId,
      fileName,
      fileUrl: filePath,
      totalRecords: totalRows,
      uploadedBy: userId,
    });

    // Save parsed data to staging tables
    await uploadService.saveUploadedData(dataUploadId, partnerId, centerMap);

    // ── Back up the uploaded file to S3 (non-critical) ───────────────
    // This ensures downloads work even after server restarts / redeployments.
    try {
      const ext = path.extname(fileName).toLowerCase().replace('.', '');
      const mimeMap = {
        csv: 'text/csv',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        xls: 'application/vnd.ms-excel',
        xlsm: 'application/vnd.ms-excel.sheet.macroEnabled.12',
      };
      const contentType = mimeMap[ext] || 'application/octet-stream';
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const s3Key = `uploads/${partnerId}/${Date.now()}_${safeName}`;
      const fileBuffer = fs.readFileSync(filePath);
      const s3Url = await uploadFileToS3(fileBuffer, s3Key, contentType);
      if (s3Url) {
        // Update file_url with the durable S3 URL
        const db = require('../../../database/connection');
        await db.pool.query('UPDATE data_uploads SET file_url = ? WHERE id = ?', [
          s3Url,
          dataUploadId,
        ]);
        console.log(`✅ Upload file backed up to S3: ${s3Key}`);
      }
    } catch (s3Err) {
      console.warn('Non-critical: S3 backup failed, local path retained:', s3Err.message);
    }
    // ─────────────────────────────────────────────────────────────────

    // Create notifications for all admins (non-critical - don't fail the upload)
    try {
      const partnerName = req.user.full_name || req.user.userName || 'Partner';
      const notifications = await notificationService.createUploadNotification({
        uploadId: dataUploadId,
        partnerId,
        partnerName,
        fileName,
        totalRecords: totalRows,
      });

      // Emit real-time notification to all admin users via WebSocket
      if (notifications && notifications.length > 0) {
        emitToRole('admin', 'notification:new', {
          type: 'upload',
          title: 'New Data Upload',
          message: `${req.user.full_name || req.user.userName || 'Partner'} has uploaded a new data file: ${fileName}`,
          uploadId: dataUploadId,
          totalRecords: totalRows,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (notifError) {
      console.error('Non-critical: upload notification creation failed:', notifError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Data uploaded successfully. Awaiting admin approval.',
      data: {
        uploadId: dataUploadId,
        status: 'pending',
        totalRecords: totalRows,
      },
    });
  } catch (error) {
    console.error('CONFIRM_UPLOAD_ERROR:', error.message);
    // Clean up uploaded file if it exists
    if (req.body.filePath && fs.existsSync(req.body.filePath)) {
      fs.unlinkSync(req.body.filePath);
    }

    // Validation errors from saveUploadedData (duplicate students, invalid data) should
    // come back as 400 with the individual error messages, not a generic 500.
    if (error.code === 'UPLOAD_VALIDATION_ERRORS') {
      return res.status(400).json({
        success: false,
        message: 'Upload validation failed. Please fix the errors and re-upload.',
        errors: error.errors || [],
        totalErrors: (error.errors || []).length,
      });
    }

    next(error);
  }
};

/**
 * Get all uploads for partner
 * GET /api/v1/uploads
 */
const getUploads = async (req, res, next) => {
  try {
    const partnerId = req.user.partner_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { status, dateFrom, dateTo } = req.query;
    const filters = {};
    if (status) filters.status = status;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    if (!partnerId) {
      return res.status(400).json({
        success: false,
        message: 'Partner ID not found. Please ensure you are logged in as a partner user.',
      });
    }

    const result = await uploadService.getPartnerUploads(partnerId, page, limit, filters);

    res.status(200).json({
      success: true,
      data: result.uploads,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get upload details
 * GET /api/v1/uploads/:id
 */
const getUploadDetails = async (req, res, next) => {
  try {
    const uploadId = req.params.id;
    const partnerId = req.user.partner_id;

    const upload = await uploadService.getUploadDetails(uploadId, partnerId);

    if (!upload) {
      return res.status(404).json({
        success: false,
        message: 'Upload not found',
      });
    }

    res.status(200).json({
      success: true,
      data: upload,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all uploads for admin review
 * GET /api/v1/uploads/admin/all
 */
const getAllUploadsForAdmin = async (req, res, next) => {
  try {
    const status = req.query.status || null;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { dateFrom, dateTo, partnerId: filterPartnerId } = req.query;
    const filters = {};
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;
    if (filterPartnerId) filters.partnerId = filterPartnerId;

    const result = await uploadService.getAllUploadsForAdmin(status, page, limit, filters);

    res.status(200).json({
      success: true,
      data: result.uploads,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get upload details for admin review
 * GET /api/v1/uploads/admin/:id
 */
const getUploadDetailsForAdmin = async (req, res, next) => {
  try {
    const uploadId = req.params.id;

    const upload = await uploadService.getUploadDetailsForAdmin(uploadId);

    if (!upload) {
      return res.status(404).json({
        success: false,
        message: 'Upload not found',
      });
    }

    res.status(200).json({
      success: true,
      data: upload,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve upload
 * POST /api/v1/uploads/:id/approve
 */
const approveUpload = async (req, res, next) => {
  try {
    const uploadId = req.params.id;
    const reviewedBy = req.user.id;
    const { remarks } = req.body;

    await uploadService.approveUpload(uploadId, reviewedBy, remarks);

    res.status(200).json({
      success: true,
      message: 'Upload approved successfully. Data moved to production.',
    });
  } catch (error) {
    if (error.code === 'DUPLICATE_STUDENTS') {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_STUDENTS',
        message: error.message,
        conflicts: error.conflicts,
      });
    }
    next(error);
  }
};

/**
 * Reject upload
 * POST /api/v1/uploads/:id/reject
 */
const rejectUpload = async (req, res, next) => {
  try {
    const uploadId = req.params.id;
    const reviewedBy = req.user.id;
    const { rejectionReason, remarks } = req.body;

    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required',
      });
    }

    await uploadService.rejectUpload(uploadId, reviewedBy, rejectionReason, remarks);

    res.status(200).json({
      success: true,
      message: 'Upload rejected successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get students for a specific batch (paginated)
 * Used for on-demand loading when batch is expanded
 */
const getBatchStudents = async (req, res, next) => {
  try {
    const { batchId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const result = await uploadService.getBatchStudents(batchId, page, limit);

    res.status(200).json({
      success: true,
      message: 'Students fetched successfully',
      data: result.students,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resubmit edited data (creates version 2)
 * POST /api/v1/uploads/:uploadId/resubmit
 */
const resubmitUpload = async (req, res, next) => {
  try {
    const { uploadId } = req.params;
    const { editedStudents } = req.body; // Array of edited student records
    const userId = req.user.id;
    const partnerId = req.user.partner_id;

    // Validate request
    if (!editedStudents || !Array.isArray(editedStudents) || editedStudents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No edited student data provided',
      });
    }

    // Call service to create new version with edits
    const result = await uploadService.resubmitWithEdits(
      uploadId,
      editedStudents,
      userId,
      partnerId
    );

    // Emit real-time notification to admins about resubmission
    emitToRole('admin', 'notification', {
      type: 'upload_resubmission',
      message: `Partner has resubmitted upload with corrections (Version ${result.version})`,
      uploadId: result.newUploadId,
    });

    res.status(200).json({
      success: true,
      message: 'Data resubmitted successfully. Version 2 created.',
      data: result,
    });
  } catch (error) {
    console.error('Error in resubmitUpload:', error);
    next(error);
  }
};

/**
 * DELETE /api/v1/uploads/:id
 * Delete an upload (partner or admin)
 */
const deleteUpload = async (req, res, next) => {
  try {
    const uploadId = req.params.id;
    const userId = req.user.partner_id || req.user.id;
    const userRole = req.user.role;

    const result = await uploadService.deleteUpload(uploadId, userId, userRole);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('Delete upload error:', error);
    next(error);
  }
};

/**
 * Bulk delete uploads
 * @route POST /api/v1/uploads/bulk-delete
 * @access ADMIN, SUPER_ADMIN, PARTNER
 */
const bulkDeleteUploads = async (req, res) => {
  try {
    const { ids } = req.body;
    const userId = req.user.partner_id || req.user.id;
    const userRole = req.user.role;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of upload IDs to delete',
        timestamp: new Date().toISOString(),
      });
    }

    const results = await uploadService.bulkDeleteUploads(ids, userId, userRole);

    // Return appropriate status code
    if (results.summary.failed === 0) {
      return res.status(200).json({
        success: true,
        message: `Successfully deleted ${results.summary.successful} upload(s)`,
        data: results,
        timestamp: new Date().toISOString(),
      });
    } else if (results.summary.successful === 0) {
      return res.status(400).json({
        success: false,
        message: 'Failed to delete any uploads',
        data: results,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Partial success
      return res.status(207).json({
        success: true,
        message: `Deleted ${results.summary.successful} upload(s), ${results.summary.failed} failed`,
        data: results,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error in bulkDeleteUploads:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete uploads',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Download the original uploaded file (B10)
 * GET /api/v1/uploads/:id/download
 * Partners can download their own, admins can download any
 */
const downloadUploadFile = async (req, res, next) => {
  try {
    const uploadId = req.params.id;
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
    const partnerId = req.user.partner_id;

    // Fetch upload record
    const db = require('../../../database/connection');
    const [rows] = await db.pool.query(
      `SELECT id, file_name, file_url, partner_id FROM data_uploads WHERE id = ? AND deleted_at IS NULL`,
      [uploadId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Upload not found' });
    }

    const upload = rows[0];

    // Partners can only download their own uploads
    if (!isAdmin && upload.partner_id !== partnerId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const fileUrl = upload.file_url;
    if (!fileUrl) {
      return res.status(404).json({
        success: false,
        message:
          'No file stored for this upload. The file may have been uploaded before download tracking was enabled.',
      });
    }

    // S3 file: generate presigned URL (valid 15 min)
    if (fileUrl.startsWith('http') || fileUrl.includes('.amazonaws.com')) {
      const { generatePresignedUrl } = require('../../../utils/s3.util');
      // Extract S3 key from full URL
      let s3Key = fileUrl;
      if (fileUrl.startsWith('http')) {
        try {
          const u = new URL(fileUrl);
          s3Key = u.pathname.replace(/^\//, '');
        } catch (_) {}
      }
      const presignedUrl = await generatePresignedUrl(s3Key, 900); // 15 min
      return res.json({
        success: true,
        data: { downloadUrl: presignedUrl, fileName: upload.file_name },
      });
    }

    // Local file: stream it
    const absPath = path.isAbsolute(fileUrl)
      ? fileUrl
      : path.join(__dirname, '../../../../', fileUrl);

    if (!fs.existsSync(absPath)) {
      return res.status(404).json({
        success: false,
        message:
          'The original file is no longer available on this server. Files are only retained until the next server restart. Please re-upload if needed.',
      });
    }

    res.download(absPath, upload.file_name);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  downloadTemplate,
  downloadDynamicTemplate,
  uploadCSV,
  confirmUpload,
  getUploads,
  getUploadDetails,
  getAllUploadsForAdmin,
  getUploadDetailsForAdmin,
  getBatchStudents,
  approveUpload,
  rejectUpload,
  resubmitUpload,
  deleteUpload,
  bulkDeleteUploads,
  downloadUploadFile,
};
