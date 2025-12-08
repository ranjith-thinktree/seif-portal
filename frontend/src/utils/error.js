/**
 * Format error message from API response
 * @param {Error} error - Error object
 * @returns {string} Formatted error message
 */
export const formatErrorMessage = (error) => {
  if (error.response) {
    // Server responded with error
    return error.response.data?.message || "An error occurred";
  } else if (error.request) {
    // Request made but no response
    return "No response from server. Please check your connection.";
  } else {
    // Error in request setup
    return error.message || "An unexpected error occurred";
  }
};

/**
 * Check if error is authentication error
 * @param {Error} error - Error object
 * @returns {boolean} True if auth error
 */
export const isAuthError = (error) => {
  return error.response?.status === 401;
};

/**
 * Check if error is validation error
 * @param {Error} error - Error object
 * @returns {boolean} True if validation error
 */
export const isValidationError = (error) => {
  return error.response?.status === 400 || error.response?.status === 422;
};

/**
 * Get validation errors from response
 * @param {Error} error - Error object
 * @returns {Object} Validation errors object
 */
export const getValidationErrors = (error) => {
  return error.response?.data?.errors || {};
};
