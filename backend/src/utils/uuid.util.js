const { v4: uuidv4 } = require('uuid');

/**
 * UUID Utility Functions
 * Generates UUIDs for database records (MySQL CHAR(36) compatible)
 */

/**
 * Generate a new UUID v4
 * @returns {String} UUID string (e.g., '550e8400-e29b-41d4-a716-446655440000')
 */
const generateUUID = () => {
  return uuidv4();
};

/**
 * Validate if a string is a valid UUID
 * @param {String} uuid - UUID string to validate
 * @returns {Boolean} True if valid UUID, false otherwise
 */
const isValidUUID = (uuid) => {
  // Accept both strict UUID v4 and legacy UUID formats (for backward compatibility)
  const strictUuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const legacyUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return strictUuidRegex.test(uuid) || legacyUuidRegex.test(uuid);
};

/**
 * Generate multiple UUIDs
 * @param {Number} count - Number of UUIDs to generate
 * @returns {Array} Array of UUID strings
 */
const generateMultipleUUIDs = (count) => {
  return Array.from({ length: count }, () => uuidv4());
};

/**
 * Convert a UUID string to proper format for MySQL
 * @param {String} uuid - UUID string to convert
 * @returns {String} Formatted UUID string
 * @throws {Error} If UUID is invalid
 */
const convertToUUID = (uuid) => {
  if (!uuid || typeof uuid !== 'string') {
    throw new Error('Invalid UUID: UUID must be a non-empty string');
  }

  const trimmedUuid = uuid.trim();

  if (!isValidUUID(trimmedUuid)) {
    throw new Error(`Invalid UUID format: ${trimmedUuid}`);
  }

  return trimmedUuid.toLowerCase();
};

module.exports = {
  generateUUID,
  isValidUUID,
  generateMultipleUUIDs,
  convertToUUID,
};
