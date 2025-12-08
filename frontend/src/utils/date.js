/**
 * Format date to readable string
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  if (!date) return "";

  const d = new Date(date);
  const options = { year: "numeric", month: "short", day: "numeric" };
  return d.toLocaleDateString("en-US", options);
};

/**
 * Format datetime to readable string
 * @param {string|Date} date - Datetime to format
 * @returns {string} Formatted datetime string
 */
export const formatDateTime = (date) => {
  if (!date) return "";

  const d = new Date(date);
  const dateOptions = { year: "numeric", month: "short", day: "numeric" };
  const timeOptions = { hour: "2-digit", minute: "2-digit" };

  return `${d.toLocaleDateString("en-US", dateOptions)} ${d.toLocaleTimeString(
    "en-US",
    timeOptions
  )}`;
};

/**
 * Get time ago string (e.g., "2 hours ago")
 * @param {string|Date} date - Date to compare
 * @returns {string} Time ago string
 */
export const timeAgo = (date) => {
  if (!date) return "";

  const seconds = Math.floor((new Date() - new Date(date)) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";

  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";

  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";

  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";

  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";

  return Math.floor(seconds) + " seconds ago";
};
