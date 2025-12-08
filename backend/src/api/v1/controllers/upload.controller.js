const fs = require('fs');
const path = require('path');
const uploadService = require('../services/upload.service');
const notificationService = require('../services/notification.service');
const csvParser = require('../../../utils/csvParser');
const { emitToRole } = require('../../../websocket/socket');

/**
 * Upload Controller
 * Handles HTTP requests for data uploads
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
 * Download CSV template with dynamic partner name
 * GET /api/v1/uploads/download-template
 */
const downloadDynamicTemplate = async (req, res, next) => {
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

    // Read the template file
    const templateContent = fs.readFileSync(templatePath, 'utf8');

    // If user is authenticated, replace partner name
    let finalContent = templateContent;
    if (req.user && req.user.partner_id) {
      const partnerData = await uploadService.getPartnerById(req.user.partner_id);
      if (partnerData && partnerData.name) {
        // Replace all instances of default partner name with actual partner name
        finalContent = templateContent.replace(/Don Bosco Tech Society/g, partnerData.name);
      }
    }

    // Send the modified content as download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="SEIF_Data_Upload_Template.csv"');
    res.send(finalContent);
  } catch (error) {
    next(error);
  }
};

/**
 * Upload and validate CSV file
 * POST /api/v1/uploads
 */
const uploadCSV = async (req, res, next) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select a CSV file.',
      });
    }

    const partnerId = req.user.partner_id;
    const userId = req.user.id;
    const filePath = req.file.path;
    const fileName = req.file.originalname;

    // Step 1: Parse CSV file
    const { rows, totalRows } = await csvParser.parseCSVFile(filePath);

    if (totalRows === 0) {
      // Clean up uploaded file
      fs.unlinkSync(filePath);

      return res.status(400).json({
        success: false,
        message: 'CSV file is empty. Please upload a file with data.',
      });
    }

    // Step 2: Get available courses for validation
    const availableCourses = await uploadService.getAllCourses();

    // Step 3: Validate each row
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
        message: 'CSV validation failed. Please fix the errors and re-upload.',
        errors: validationErrors.slice(0, 50), // Return first 50 errors
        totalErrors: validationErrors.length,
      });
    }

    // Step 4: Group data by center and batch
    const centerMap = csvParser.groupRowsByCenter(validatedRows);

    // Step 5: Generate preview summary with gender breakdown
    const centersArray = Array.from(centerMap.entries());

    // Use partner name from authenticated user
    const partnerName = partnerData ? partnerData.name : 'Unknown Partner';

    const summary = {
      fileName,
      totalRows,
      centersCount: centersArray.length,
      batchesCount: 0,
      studentsCount: totalRows,
      partnerName,
      centers: centersArray.map(([centerId, centerData]) => {
        const batchesArray = Array.from(centerData.batches.entries());
        const batchesCount = batchesArray.length;

        return {
          centerId,
          centerName: centerId, // Will be resolved from database during save
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

    // Step 7: Return preview (don't save yet)
    res.status(200).json({
      success: true,
      message: 'CSV validation successful. Review the preview before confirming upload.',
      preview: summary,
      validation: {
        isValid: true,
        totalRows,
        errorsCount: 0,
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

    const partnerId = req.user.partner_id;
    const userId = req.user.id;

    // Re-parse and validate CSV
    const { rows, totalRows } = await csvParser.parseCSVFile(filePath);
    const availableCourses = await uploadService.getAllCourses();

    const validatedRows = [];
    for (const row of rows) {
      const validation = csvParser.validateRow(row, row.rowNumber, availableCourses);
      if (validation.isValid) {
        validatedRows.push(validation.row);
      }
    }

    const centerMap = csvParser.groupRowsByCenter(validatedRows);

    // Create data upload record
    const dataUploadId = await uploadService.createDataUpload({
      partnerId,
      fileName,
      fileUrl: filePath,
      totalRecords: totalRows,
      uploadedBy: userId,
    });

    // Save parsed data to staging tables
    await uploadService.saveUploadedData(dataUploadId, partnerId, centerMap);

    // Create notifications for all admins
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
        message: `${partnerName} has uploaded a new data file: ${fileName}`,
        uploadId: dataUploadId,
        totalRecords: totalRows,
        timestamp: new Date().toISOString(),
      });
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
    // Clean up uploaded file if it exists
    if (req.body.filePath && fs.existsSync(req.body.filePath)) {
      fs.unlinkSync(req.body.filePath);
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

    if (!partnerId) {
      return res.status(400).json({
        success: false,
        message: 'Partner ID not found. Please ensure you are logged in as a partner user.',
      });
    }

    const result = await uploadService.getPartnerUploads(partnerId, page, limit);

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

    const result = await uploadService.getAllUploadsForAdmin(status, page, limit);

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
};
