const RefurbishmentService = require('../services/refurbishment.service');
const { ApiError } = require('../../../utils/error.util');
const ApiResponse = require('../../../utils/response.util');
const { generatePutPresignedUrl, isS3Configured } = require('../../../utils/s3.util');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Local storage for refurbishment uploads (S3 fallback)
const localUploadDir = path.join(__dirname, '../../../../../uploads/refurbishment');
if (!fs.existsSync(localUploadDir)) fs.mkdirSync(localUploadDir, { recursive: true });

const localRefurbishmentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, localUploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}_${uuidv4()}${ext}`);
  },
});

const localRefurbishmentUpload = multer({
  storage: localRefurbishmentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/jpg', 'image/png',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    cb(null, allowed.includes(file.mimetype));
  },
}).single('file');

/**
 * Get refurbishment request details for partner
 * Includes center details, courses, and admin-selected packages
 * @route GET /api/v1/partner/refurbishment/requests/:requestId/details
 */
const getRequestDetails = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const partnerId = req.user.partner_id;

    if (!partnerId) {
      return ApiResponse.error(res, 'User is not associated with a partner', 403);
    }

    // Get request details with security check (ensure partner owns this request)
    const requestDetails = await RefurbishmentService.getPartnerRequestDetails(
      requestId,
      partnerId
    );

    if (!requestDetails) {
      return ApiResponse.error(res, 'Request not found or access denied', 404);
    }

    return ApiResponse.success(res, requestDetails, 'Request details retrieved successfully');
  } catch (error) {
    console.error('Error getting request details:', error);
    next(error);
  }
};

/**
 * Submit partner's selections for refurbishment request
 * Includes package selections per course, justifications, and optional room upgradation
 * @route POST /api/v1/partner/refurbishment/requests/:requestId/submit
 */
const submitRefurbishmentRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const partnerId = req.user.partner_id;
    const userId = req.user.id;
    const submissionData = req.body;

    if (!partnerId) {
      return ApiResponse.error(res, 'User is not associated with a partner', 403);
    }

    // Validate submission data
    if (!submissionData.courses || !Array.isArray(submissionData.courses)) {
      return ApiResponse.error(res, 'Invalid submission data: courses array required', 400);
    }

    // Submit refurbishment request with partner selections
    const result = await RefurbishmentService.submitPartnerRefurbishmentSelections({
      requestId,
      partnerId,
      userId,
      courses: submissionData.courses,
      upgradation: submissionData.upgradation || null,
    });

    return ApiResponse.success(res, result, 'Refurbishment request submitted successfully', 201);
  } catch (error) {
    console.error('Error submitting refurbishment request:', error);
    next(error);
  }
};

/**
 * Get partner's refurbishment requests
 * Returns list of all refurbishment requests for this partner
 * @route GET /api/v1/partner/refurbishment/requests
 */
const getMyRequests = async (req, res, next) => {
  try {
    const partnerId = req.user.partner_id;
    const { limit = 10, offset = 0, status } = req.query;

    if (!partnerId) {
      return ApiResponse.error(res, 'User is not associated with a partner', 403);
    }

    const requests = await RefurbishmentService.getPartnerRefurbishmentRequests({
      partnerId,
      limit: parseInt(limit),
      offset: parseInt(offset),
      status,
    });

    return ApiResponse.success(res, requests, 'Refurbishment requests retrieved successfully');
  } catch (error) {
    console.error('Error getting partner requests:', error);
    next(error);
  }
};

/**
 * Get partner's past refurbishment requests.
 * Includes submitted and actioned requests.
 * @route GET /api/v1/partner/refurbishment/past-requests
 */
const getPartnerPastRequests = async (req, res, next) => {
  try {
    const partnerId = req.user.partner_id;
    const { limit = 20, offset = 0 } = req.query;

    if (!partnerId) {
      return ApiResponse.error(res, 'User is not associated with a partner', 403);
    }

    // Reuse getPartnerRefurbishmentRequests including submitted and actioned requests
    const data = await RefurbishmentService.getPartnerRefurbishmentRequests({
      partnerId,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    return ApiResponse.success(res, data, 'Past requests retrieved successfully');
  } catch (error) {
    console.error('Error getting partner past requests:', error);
    next(error);
  }
};

/**
 * Partner submits their completion evidence after the 2-month notification.
 * @route POST /api/v1/partner/refurbishment/requests/:requestId/partner-completion
 */
const submitPartnerCompletion = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const partnerId = req.user.partner_id;
    const { description, fileUrls } = req.body;

    if (!partnerId) {
      return ApiResponse.error(res, 'User is not associated with a partner', 403);
    }

    if (!description || !String(description).trim()) {
      return ApiResponse.error(res, 'Acknowledgment statement is required', 400);
    }

    if (!Array.isArray(fileUrls) || fileUrls.length === 0) {
      return ApiResponse.error(res, 'At least one file is required', 400);
    }

    if (!req.body.consent) {
      return ApiResponse.error(res, 'Acknowledgment consent is required', 400);
    }

    if (!req.body.consentText || !String(req.body.consentText).trim()) {
      return ApiResponse.error(res, 'Acknowledgment consent text is required', 400);
    }

    const result = await RefurbishmentService.submitPartnerCompletion(requestId, partnerId, {
      description,
      fileUrls: fileUrls || [],
      consent: Boolean(req.body.consent),
      consentText: req.body.consentText,
      userId: req.user.id,
    });

    return ApiResponse.success(res, result, 'Acknowledgment submitted successfully', 201);
  } catch (error) {
    console.error('Error submitting partner completion:', error);
    next(error);
  }
};

/**
 * Generate a presigned PUT URL (S3) or a local upload endpoint URL when S3 is not configured.
 * @route POST /api/v1/partner/refurbishment/upload-url
 * Body: { fileName: string, fileType: string, folder?: string }
 * Returns: { storageType: 's3'|'local', uploadUrl, fileUrl, key }
 */
const generateUploadUrl = async (req, res, next) => {
  try {
    const { fileName, fileType, folder } = req.body;

    if (!fileName || !fileType) {
      return ApiResponse.error(res, 'fileName and fileType are required', 400);
    }

    // Validate allowed types
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedTypes.includes(fileType)) {
      return ApiResponse.error(res, `File type not allowed`, 400);
    }

    const ext = fileName.split('.').pop().toLowerCase();
    const safeFolder = (folder || 'refurbishment/uploads').replace(/[^a-zA-Z0-9/_-]/g, '');
    const key = `${safeFolder}/${Date.now()}_${uuidv4()}.${ext}`;

    if (!isS3Configured()) {
      // S3 not available — tell the client to POST the file directly to our local endpoint
      const backendBase = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
      return ApiResponse.success(
        res,
        {
          storageType: 'local',
          uploadUrl: `${backendBase}/api/v1/partner/refurbishment/upload-local`,
          fileUrl: null, // resolved after actual upload
          key,
        },
        'Local upload endpoint (S3 not configured)'
      );
    }

    const { uploadUrl, fileUrl } = await generatePutPresignedUrl(key, fileType, 300);
    return ApiResponse.success(res, { storageType: 's3', uploadUrl, fileUrl, key }, 'Upload URL generated');
  } catch (error) {
    console.error('Error generating upload URL:', error);
    next(error);
  }
};

/**
 * Accept a multipart file upload and save it to local disk (S3 fallback).
 * @route POST /api/v1/partner/refurbishment/upload-local
 * Body: multipart/form-data with field 'file'
 * Returns: { fileUrl, key }
 */
const uploadLocalFile = (req, res, next) => {
  localRefurbishmentUpload(req, res, (err) => {
    if (err) {
      console.error('Local upload error:', err);
      return ApiResponse.error(res, err.message || 'File upload failed', 400);
    }
    if (!req.file) {
      return ApiResponse.error(res, 'No file received', 400);
    }
    const fileUrl = `/uploads/refurbishment/${req.file.filename}`;
    const key = `refurbishment/${req.file.filename}`;
    return ApiResponse.success(res, { fileUrl, key }, 'File uploaded locally');
  });
};

module.exports = {
  getRequestDetails,
  submitRefurbishmentRequest,
  getMyRequests,
  getPartnerPastRequests,
  submitPartnerCompletion,
  generateUploadUrl,
  uploadLocalFile,
};
