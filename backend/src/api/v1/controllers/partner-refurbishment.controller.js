const RefurbishmentService = require('../services/refurbishment.service');
const { ApiError } = require('../../../utils/error.util');
const ApiResponse = require('../../../utils/response.util');

/**
 * Partner Refurbishment Controller
 * Handles partner-specific refurbishment request operations
 */

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

    return ApiResponse.success(res, 'Request details retrieved successfully', requestDetails);
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

    return ApiResponse.success(res, 'Refurbishment request submitted successfully', result, 201);
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

    return ApiResponse.success(res, 'Refurbishment requests retrieved successfully', requests);
  } catch (error) {
    console.error('Error getting partner requests:', error);
    next(error);
  }
};

/**
 * Get partner's past (actioned) refurbishment requests.
 * Returns requests that have progressed beyond 'submitted'.
 * @route GET /api/v1/partner/refurbishment/past-requests
 */
const getPartnerPastRequests = async (req, res, next) => {
  try {
    const partnerId = req.user.partner_id;
    const { limit = 20, offset = 0 } = req.query;

    if (!partnerId) {
      return ApiResponse.error(res, 'User is not associated with a partner', 403);
    }

    // Reuse getPartnerRefurbishmentRequests but exclude 'submitted' draft requests
    const data = await RefurbishmentService.getPartnerRefurbishmentRequests({
      partnerId,
      limit: parseInt(limit),
      offset: parseInt(offset),
      excludeStatus: 'submitted',
    });

    return ApiResponse.success(res, 'Past requests retrieved successfully', data);
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

    const result = await RefurbishmentService.submitPartnerCompletion(requestId, partnerId, {
      description,
      fileUrls: fileUrls || [],
      userId: req.user.id,
    });

    return ApiResponse.success(res, result, 'Completion report submitted successfully', 201);
  } catch (error) {
    console.error('Error submitting partner completion:', error);
    next(error);
  }
};

module.exports = {
  getRequestDetails,
  submitRefurbishmentRequest,
  getMyRequests,
  getPartnerPastRequests,
  submitPartnerCompletion,
};
