import { toast } from "react-toastify";

/**
 * Toast utility wrapper for react-toastify
 * Provides consistent toast notifications across the application
 */

export const showToast = {
  /**
   * Show success toast
   * @param {string} message - Success message to display
   * @param {object} options - Additional toast options
   */
  success: (message, options = {}) => {
    toast.success(message, {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options,
    });
  },

  /**
   * Show error toast
   * @param {string} message - Error message to display
   * @param {object} options - Additional toast options
   */
  error: (message, options = {}) => {
    toast.error(message, {
      position: "top-right",
      autoClose: 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options,
    });
  },

  /**
   * Show info toast
   * @param {string} message - Info message to display
   * @param {object} options - Additional toast options
   */
  info: (message, options = {}) => {
    toast.info(message, {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options,
    });
  },

  /**
   * Show warning toast
   * @param {string} message - Warning message to display
   * @param {object} options - Additional toast options
   */
  warning: (message, options = {}) => {
    toast.warning(message, {
      position: "top-right",
      autoClose: 3500,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options,
    });
  },

  /**
   * Dismiss all active toasts
   */
  dismiss: () => {
    toast.dismiss();
  },
};

export default showToast;
