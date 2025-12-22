/**
 * Comment Controller - Handles student comments and notes
 * Provides CRUD operations for cell-level annotations
 */

const { pool } = require('../database/connection');

/**
 * Get all comments and notes for a specific student
 * GET /api/comments/student/:studentId
 */
const getStudentComments = async (req, res) => {
  try {
    const { studentId } = req.params;

    const [comments] = await pool.execute(
      `SELECT 
        id,
        student_id,
        field_name,
        type,
        content,
        created_at,
        updated_at
      FROM student_comments 
      WHERE student_id = ?
      ORDER BY created_at DESC`,
      [studentId]
    );

    res.json({
      success: true,
      data: comments,
    });
  } catch (error) {
    console.error('Error fetching student comments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comments',
      error: error.message,
    });
  }
};

/**
 * Get all comments for students in a center
 * GET /api/comments/center/:centerId
 */
const getCenterComments = async (req, res) => {
  try {
    const { centerId } = req.params;

    const [comments] = await pool.execute(
      `SELECT 
        sc.id,
        sc.student_id,
        sc.field_name,
        sc.type,
        sc.content,
        sc.created_at,
        sc.updated_at,
        us.student_name,
        us.partner_student_id as student_identifier
      FROM student_comments sc
      INNER JOIN uploaded_students us ON sc.student_id = us.id
      WHERE us.uploaded_center_id = ?
      ORDER BY sc.created_at DESC`,
      [centerId]
    );

    res.json({
      success: true,
      data: comments,
    });
  } catch (error) {
    console.error('Error fetching center comments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comments',
      error: error.message,
    });
  }
};

/**
 * Create a new comment or note
 * POST /api/comments
 * Body: { studentId, fieldName, type, content }
 */
const createComment = async (req, res) => {
  try {
    const { studentId, fieldName, type, content } = req.body;

    // Validation
    if (!studentId || !fieldName || !type || !content) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: studentId, fieldName, type, content',
      });
    }

    if (!['comment', 'note'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid type. Must be "comment" or "note"',
      });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Content cannot be empty',
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO student_comments (student_id, field_name, type, content)
       VALUES (?, ?, ?, ?)`,
      [studentId, fieldName, type, content.trim()]
    );

    // Fetch the created comment
    const [created] = await pool.execute(`SELECT * FROM student_comments WHERE id = ?`, [
      result.insertId,
    ]);

    res.status(201).json({
      success: true,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} created successfully`,
      data: created[0],
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create comment',
      error: error.message,
    });
  }
};

/**
 * Update an existing comment or note
 * PUT /api/comments/:id
 * Body: { content }
 */
const updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Content cannot be empty',
      });
    }

    // Check if comment exists
    const [existing] = await pool.execute('SELECT * FROM student_comments WHERE id = ?', [id]);

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
    }

    await pool.execute(
      `UPDATE student_comments 
       SET content = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [content.trim(), id]
    );

    // Fetch updated comment
    const [updated] = await pool.execute('SELECT * FROM student_comments WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Comment updated successfully',
      data: updated[0],
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update comment',
      error: error.message,
    });
  }
};

/**
 * Delete a comment or note
 * DELETE /api/comments/:id
 */
const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if comment exists
    const [existing] = await pool.execute('SELECT * FROM student_comments WHERE id = ?', [id]);

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
    }

    await pool.execute('DELETE FROM student_comments WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete comment',
      error: error.message,
    });
  }
};

/**
 * Get comment by ID
 * GET /api/comments/:id
 */
const getCommentById = async (req, res) => {
  try {
    const { id } = req.params;

    const [comments] = await pool.execute('SELECT * FROM student_comments WHERE id = ?', [id]);

    if (comments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
    }

    res.json({
      success: true,
      data: comments[0],
    });
  } catch (error) {
    console.error('Error fetching comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comment',
      error: error.message,
    });
  }
};

module.exports = {
  getStudentComments,
  getCenterComments,
  createComment,
  updateComment,
  deleteComment,
  getCommentById,
};
