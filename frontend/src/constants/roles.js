// User Roles - Must match backend constants
export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  PARTNER: "PARTNER",
  SEIF_READONLY: "SEIF_READONLY",
  ESSCI: "ESSCI",
};

// Role Display Names
export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: "Super Admin",
  [ROLES.ADMIN]: "Admin",
  [ROLES.PARTNER]: "Partner",
  [ROLES.SEIF_READONLY]: "SEIF Read-Only",
  [ROLES.ESSCI]: "ESSCI",
};

// User Status
export const USER_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  SUSPENDED: "suspended",
};
