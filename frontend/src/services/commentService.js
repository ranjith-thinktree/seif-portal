import apiClient from "../api/client";

/**
 * Comment Service - API calls for comments and notes
 */

const commentService = {
  /**
   * Get all comments for a specific student
   */
  getStudentComments: async (studentId) => {
    const response = await apiClient.get(`/comments/student/${studentId}`);
    return response.data;
  },

  /**
   * Get all comments for students in a center
   */
  getCenterComments: async (centerId) => {
    const response = await apiClient.get(`/comments/center/${centerId}`);
    return response.data;
  },

  /**
   * Create a new comment or note
   */
  createComment: async (data) => {
    const response = await apiClient.post("/comments", data);
    return response.data;
  },

  /**
   * Update an existing comment or note
   */
  updateComment: async (commentId, content) => {
    const response = await apiClient.put(`/comments/${commentId}`, { content });
    return response.data;
  },

  /**
   * Delete a comment or note
   */
  deleteComment: async (commentId) => {
    const response = await apiClient.delete(`/comments/${commentId}`);
    return response.data;
  },

  /**
   * Get comment by ID
   */
  getCommentById: async (commentId) => {
    const response = await apiClient.get(`/comments/${commentId}`);
    return response.data;
  },
};

export default commentService;
