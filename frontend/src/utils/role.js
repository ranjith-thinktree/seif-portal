/**
 * Role Utility Functions
 * Helper functions for role-based access control and permissions
 */

/**
 * Check if a user has admin-level access
 * Both ADMIN and SUPER_ADMIN roles have full administrative privileges
 *
 * @param {string} role - User role (ADMIN, SUPER_ADMIN, PARTNER, etc.)
 * @returns {boolean} True if role is ADMIN or SUPER_ADMIN
 */
export const isAdminRole = (role) => {
  return role === "ADMIN" || role === "SUPER_ADMIN";
};

/**
 * Alias for isAdminRole for clarity in some contexts
 */
export const hasAdminAccess = isAdminRole;
