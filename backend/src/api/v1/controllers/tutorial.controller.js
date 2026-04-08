const tutorialService = require('../services/tutorial.service');
const ApiResponse = require('../../../utils/response.util');

/**
 * Tutorial Controller — User Manual Video Management
 */

/**
 * GET /api/v1/tutorials
 * Get all tutorial videos (filtered by caller's role)
 */
const getAll = async (req, res, next) => {
  try {
    const role = req.user?.role;
    const tutorials = await tutorialService.getAllTutorials(role);
    return ApiResponse.success(res, tutorials, 'Tutorials retrieved successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/tutorials/:id
 */
const getOne = async (req, res, next) => {
  try {
    const tutorial = await tutorialService.getTutorialById(req.params.id);
    if (!tutorial) return res.status(404).json({ success: false, message: 'Tutorial not found' });
    return ApiResponse.success(res, tutorial, 'Tutorial retrieved successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/tutorials/upload-url
 * Admin: Get presigned PUT URL for video upload
 */
const getUploadUrl = async (req, res, next) => {
  try {
    const { fileName, contentType } = req.body;
    if (!fileName || !contentType) {
      return res
        .status(400)
        .json({ success: false, message: 'fileName and contentType are required' });
    }
    const result = await tutorialService.getUploadUrl(fileName, contentType);
    return ApiResponse.success(res, result, 'Upload URL generated');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/tutorials
 * Admin: Create tutorial record after video upload
 */
const create = async (req, res, next) => {
  try {
    const { title, description, video_url, s3_key, section, role_audience, order_index } = req.body;
    if (!title || !video_url) {
      return res.status(400).json({ success: false, message: 'title and video_url are required' });
    }
    const tutorial = await tutorialService.createTutorial(
      { title, description, video_url, s3_key, section, role_audience, order_index },
      req.user.id
    );
    return ApiResponse.success(res, tutorial, 'Tutorial created successfully', 201);
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/v1/tutorials/:id
 * Admin: Update tutorial metadata
 */
const update = async (req, res, next) => {
  try {
    const tutorial = await tutorialService.updateTutorial(req.params.id, req.body);
    if (!tutorial) return res.status(404).json({ success: false, message: 'Tutorial not found' });
    return ApiResponse.success(res, tutorial, 'Tutorial updated successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/v1/tutorials/:id
 * Admin: Delete tutorial
 */
const remove = async (req, res, next) => {
  try {
    await tutorialService.deleteTutorial(req.params.id);
    return ApiResponse.success(res, null, 'Tutorial deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getOne, getUploadUrl, create, update, remove };
