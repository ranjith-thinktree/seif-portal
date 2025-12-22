/**
 * Comment Routes - API endpoints for student comments and notes
 */

const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { authenticate } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

// Get all comments for a student
router.get('/student/:studentId', commentController.getStudentComments);

// Get all comments for a center
router.get('/center/:centerId', commentController.getCenterComments);

// Get comment by ID
router.get('/:id', commentController.getCommentById);

// Create new comment
router.post('/', commentController.createComment);

// Update comment
router.put('/:id', commentController.updateComment);

// Delete comment
router.delete('/:id', commentController.deleteComment);

module.exports = router;
