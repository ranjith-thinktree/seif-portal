/**
 * Application Constants
 * Centralized place for all constant values
 */

// User Roles
const USER_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  PARTNER: 'PARTNER',
  SEIF_READONLY: 'SEIF_READONLY',
  ESSCI: 'ESSCI',
};

// User Status
const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
};

// Partner Status
const PARTNER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
};

// Center Types
const CENTER_TYPES = {
  SHORT_TERM: 'Short Term',
  LONG_TERM: 'Long Term',
  ITI: 'ITI',
  POLYTECHNIC: 'Polytechnic',
};

// Center Status
const CENTER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  UNDER_MAINTENANCE: 'under_maintenance',
};

// Regions
const REGIONS = {
  NORTH: 'North',
  SOUTH: 'South',
  EAST: 'East',
  WEST: 'West',
  CENTRAL: 'Central',
};

// Batch Status
const BATCH_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// Data Upload Status
const UPLOAD_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PARTIAL: 'partial',
};

// Approval Status
const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

// Request Types
const REQUEST_TYPES = {
  UPLOAD_REQUEST: 'upload_request',
  REFURBISHMENT: 'refurbishment',
  UPGRADATION: 'upgradation',
  DATA_CORRECTION: 'data_correction',
  SUPPORT: 'support',
};

// Request Status
const REQUEST_STATUS = {
  PENDING: 'pending',
  PARTNER_SUBMITTED: 'partner_submitted',
  IN_REVIEW: 'in_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
};

// Request Priority
const REQUEST_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

// Refurbishment Types
const REFURBISHMENT_TYPES = {
  REFURBISHMENT: 'refurbishment',
  UPGRADATION: 'upgradation',
  BOTH: 'both',
};

// Package Categories
const PACKAGE_CATEGORIES = {
  ELECTRICAL: 'electrical',
  FURNITURE: 'furniture',
  EQUIPMENT: 'equipment',
  INFRASTRUCTURE: 'infrastructure',
};

// Notification Types
const NOTIFICATION_TYPES = {
  UPLOAD: 'upload',
  APPROVAL: 'approval',
  REJECTION: 'rejection',
  REQUEST: 'request',
  ALERT: 'alert',
};

// Alert Types
const ALERT_TYPES = {
  REFURBISHMENT: 'refurbishment',
  DATA_APPROVAL: 'data_approval',
  DATA_REJECT: 'data_reject',
  UPLOAD_REQUEST: 'upload_request',
  SYSTEM_ALERT: 'system_alert',
};

// Training Status
const TRAINING_STATUS = {
  ENROLLED: 'enrolled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  DROPPED: 'dropped',
};

// Gender
const GENDER = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other',
};

// Password Reset Status
const PASSWORD_RESET_STATUS = {
  PENDING: 'pending',
  PROCESSED: 'processed',
  DECLINED: 'declined',
};

// Audit Actions
const AUDIT_ACTIONS = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  APPROVE: 'approve',
  REJECT: 'reject',
  UPLOAD: 'upload',
  DOWNLOAD: 'download',
};

// Entity Types (for audit logs, notifications, etc.)
const ENTITY_TYPES = {
  USER: 'user',
  PARTNER: 'partner',
  CENTER: 'center',
  BATCH: 'batch',
  REQUEST: 'request',
  DATA_UPLOAD: 'data_upload',
};

// Upload Types
const UPLOAD_TYPES = {
  CENTER: 'center',
  BATCH: 'batch',
  STUDENT: 'student',
};

// File Types
const FILE_TYPES = {
  IMAGE: ['image/jpeg', 'image/jpg', 'image/png'],
  CSV: ['text/csv', 'application/vnd.ms-excel'],
  DOCUMENT: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
};

// Recurrence Types (for scheduled requests)
const RECURRENCE_TYPES = {
  IMMEDIATE: 'immediate',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  SEMI_ANNUAL: 'semi_annual',
  ANNUAL: 'annual',
  CUSTOM: 'custom',
};

// Error Messages
const ERROR_MESSAGES = {
  // Authentication
  INVALID_CREDENTIALS: 'Invalid email or password',
  UNAUTHORIZED: 'You are not authorized to access this resource',
  TOKEN_EXPIRED: 'Your session has expired. Please login again',
  TOKEN_INVALID: 'Invalid token provided',

  // User
  USER_NOT_FOUND: 'User not found',
  USER_ALREADY_EXISTS: 'User with this email already exists',
  USER_INACTIVE: 'Your account is inactive. Please contact administrator',
  USER_SUSPENDED: 'Your account has been suspended',

  // Partner
  PARTNER_NOT_FOUND: 'Partner not found',
  PARTNER_INACTIVE: 'Partner account is inactive',

  // Center
  CENTER_NOT_FOUND: 'Center not found',
  CENTER_ALREADY_EXISTS: 'Center already exists for this partner',

  // File Upload
  FILE_TOO_LARGE: 'File size exceeds maximum limit',
  INVALID_FILE_TYPE: 'Invalid file type',
  FILE_UPLOAD_FAILED: 'File upload failed',
  NO_FILE_UPLOADED: 'No file was uploaded',

  // Database
  DATABASE_ERROR: 'Database operation failed',
  QUERY_FAILED: 'Database query failed',

  // Validation
  VALIDATION_FAILED: 'Validation failed',
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Invalid email format',
  INVALID_PHONE: 'Invalid phone number format',
  INVALID_DATE: 'Invalid date format',

  // General
  SERVER_ERROR: 'Internal server error',
  NOT_FOUND: 'Resource not found',
  BAD_REQUEST: 'Bad request',
  FORBIDDEN: 'Access forbidden',
};

// Success Messages
const SUCCESS_MESSAGES = {
  // Authentication
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  PASSWORD_RESET_SENT: 'Password reset link sent to your email',
  PASSWORD_RESET_SUCCESS: 'Password reset successful',

  // User
  USER_CREATED: 'User created successfully',
  USER_UPDATED: 'User updated successfully',
  USER_DELETED: 'User deleted successfully',

  // Partner
  PARTNER_CREATED: 'Partner created successfully',
  PARTNER_UPDATED: 'Partner updated successfully',
  PARTNER_DELETED: 'Partner deleted successfully',

  // Center
  CENTER_CREATED: 'Center created successfully',
  CENTER_UPDATED: 'Center updated successfully',
  CENTER_DELETED: 'Center deleted successfully',

  // Data Upload
  UPLOAD_SUCCESS: 'File uploaded successfully',
  DATA_APPROVED: 'Data approved successfully',
  DATA_REJECTED: 'Data rejected successfully',

  // Request
  REQUEST_CREATED: 'Request created successfully',
  REQUEST_UPDATED: 'Request updated successfully',
  REQUEST_APPROVED: 'Request approved successfully',
  REQUEST_REJECTED: 'Request rejected successfully',

  // General
  OPERATION_SUCCESS: 'Operation completed successfully',
  FETCH_SUCCESS: 'Data fetched successfully',
};

// Pagination Defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};

module.exports = {
  USER_ROLES,
  USER_STATUS,
  PARTNER_STATUS,
  CENTER_TYPES,
  CENTER_STATUS,
  REGIONS,
  BATCH_STATUS,
  UPLOAD_STATUS,
  APPROVAL_STATUS,
  REQUEST_TYPES,
  REQUEST_STATUS,
  REQUEST_PRIORITY,
  REFURBISHMENT_TYPES,
  PACKAGE_CATEGORIES,
  NOTIFICATION_TYPES,
  ALERT_TYPES,
  TRAINING_STATUS,
  GENDER,
  PASSWORD_RESET_STATUS,
  AUDIT_ACTIONS,
  ENTITY_TYPES,
  UPLOAD_TYPES,
  FILE_TYPES,
  RECURRENCE_TYPES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  PAGINATION,
};
