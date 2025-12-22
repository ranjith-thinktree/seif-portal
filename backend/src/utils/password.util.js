/**
 * Password Validation Utility
 * Provides password strength validation and checking
 */

/**
 * Password requirements configuration
 */
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

/**
 * Validate password against security requirements
 * @param {String} password - Password to validate
 * @returns {Object} { isValid: boolean, errors: string[], strength: string }
 */
const validatePassword = (password) => {
  const errors = [];
  let strength = 0;

  // Check if password is provided
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      errors: ['Password is required'],
      strength: 'none',
      score: 0,
    };
  }

  // Check minimum length
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`);
  } else {
    strength += 1;
  }

  // Check maximum length
  if (password.length > PASSWORD_REQUIREMENTS.maxLength) {
    errors.push(`Password must not exceed ${PASSWORD_REQUIREMENTS.maxLength} characters`);
  }

  // Check for uppercase letter
  if (PASSWORD_REQUIREMENTS.requireUppercase) {
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    } else {
      strength += 1;
    }
  }

  // Check for lowercase letter
  if (PASSWORD_REQUIREMENTS.requireLowercase) {
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    } else {
      strength += 1;
    }
  }

  // Check for number
  if (PASSWORD_REQUIREMENTS.requireNumber) {
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    } else {
      strength += 1;
    }
  }

  // Check for special character
  if (PASSWORD_REQUIREMENTS.requireSpecialChar) {
    const specialChars = PASSWORD_REQUIREMENTS.specialChars;
    const hasSpecialChar = specialChars.split('').some((char) => password.includes(char));
    if (!hasSpecialChar) {
      errors.push(`Password must contain at least one special character (${specialChars})`);
    } else {
      strength += 1;
    }
  }

  // Calculate strength level
  let strengthLevel = 'weak';
  if (strength >= 5 && password.length >= 12) {
    strengthLevel = 'strong';
  } else if (strength >= 4 && password.length >= 10) {
    strengthLevel = 'medium';
  } else if (strength >= 3 && password.length >= 8) {
    strengthLevel = 'fair';
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength: strengthLevel,
    score: strength,
  };
};

/**
 * Calculate password strength score (0-100)
 * @param {String} password - Password to check
 * @returns {Number} Strength score from 0 to 100
 */
const calculatePasswordStrength = (password) => {
  if (!password) return 0;

  let score = 0;
  const length = password.length;

  // Length score (max 30 points)
  if (length >= 8) score += 10;
  if (length >= 12) score += 10;
  if (length >= 16) score += 10;

  // Character variety (max 40 points)
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[^a-zA-Z0-9]/.test(password)) score += 10;

  // Complexity bonus (max 30 points)
  if (/[a-z].*[A-Z]|[A-Z].*[a-z]/.test(password)) score += 10; // Mixed case
  if (/[a-zA-Z].*[0-9]|[0-9].*[a-zA-Z]/.test(password)) score += 10; // Letters and numbers
  if (length >= 10 && /[^a-zA-Z0-9]/.test(password)) score += 10; // Long with special chars

  return Math.min(score, 100);
};

/**
 * Get password strength label
 * @param {Number} score - Strength score (0-100)
 * @returns {String} Strength label (weak, fair, medium, strong)
 */
const getPasswordStrengthLabel = (score) => {
  if (score >= 80) return 'strong';
  if (score >= 60) return 'medium';
  if (score >= 40) return 'fair';
  return 'weak';
};

/**
 * Get password strength color
 * @param {String} strength - Strength label
 * @returns {String} Color code
 */
const getPasswordStrengthColor = (strength) => {
  const colors = {
    weak: '#ef4444', // red
    fair: '#f97316', // orange
    medium: '#eab308', // yellow
    strong: '#22c55e', // green
  };
  return colors[strength] || colors.weak;
};

/**
 * Check if password meets minimum requirements
 * @param {String} password - Password to check
 * @returns {Boolean} True if meets all requirements
 */
const meetsMinimumRequirements = (password) => {
  const validation = validatePassword(password);
  return validation.isValid;
};

/**
 * Generate password requirements text for UI
 * @returns {Array} Array of requirement strings
 */
const getPasswordRequirementsText = () => {
  return [
    `At least ${PASSWORD_REQUIREMENTS.minLength} characters`,
    'One uppercase letter (A-Z)',
    'One lowercase letter (a-z)',
    'One number (0-9)',
    `One special character (${PASSWORD_REQUIREMENTS.specialChars})`,
  ];
};

module.exports = {
  validatePassword,
  calculatePasswordStrength,
  getPasswordStrengthLabel,
  getPasswordStrengthColor,
  meetsMinimumRequirements,
  getPasswordRequirementsText,
  PASSWORD_REQUIREMENTS,
};
