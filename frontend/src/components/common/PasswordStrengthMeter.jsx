import React, { useMemo } from "react";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";

/**
 * Calculate password strength score
 * @param {String} password - Password to evaluate
 * @returns {Object} { score: 0-100, level: 'weak'|'fair'|'medium'|'strong' }
 */
const calculatePasswordStrength = (password) => {
  if (!password) return { score: 0, level: "weak" };

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
  if (/[a-z].*[A-Z]|[A-Z].*[a-z]/.test(password)) score += 10;
  if (/[a-zA-Z].*[0-9]|[0-9].*[a-zA-Z]/.test(password)) score += 10;
  if (length >= 10 && /[^a-zA-Z0-9]/.test(password)) score += 10;

  score = Math.min(score, 100);

  // Determine level
  let level = "weak";
  if (score >= 80) level = "strong";
  else if (score >= 60) level = "medium";
  else if (score >= 40) level = "fair";

  return { score, level };
};

/**
 * Check password requirements
 * @param {String} password - Password to check
 * @returns {Object} Requirements with boolean values
 */
const checkRequirements = (password) => {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/u.test(password),
  };
};

/**
 * PasswordStrengthMeter Component
 * Displays password strength and requirements
 *
 * @param {Object} props
 * @param {String} props.password - Password to evaluate
 * @param {Boolean} props.showRequirements - Show requirements checklist (default: true)
 * @param {String} props.className - Additional CSS classes
 */
const PasswordStrengthMeter = ({
  password,
  showRequirements = true,
  className = "",
}) => {
  const strength = useMemo(
    () => calculatePasswordStrength(password),
    [password]
  );
  const requirements = useMemo(() => checkRequirements(password), [password]);

  // Colors for strength levels
  const strengthColors = {
    weak: { bg: "bg-red-500", text: "text-red-600", label: "Weak" },
    fair: { bg: "bg-orange-500", text: "text-orange-600", label: "Fair" },
    medium: { bg: "bg-yellow-500", text: "text-yellow-600", label: "Medium" },
    strong: { bg: "bg-green-500", text: "text-green-600", label: "Strong" },
  };

  const currentStrength = strengthColors[strength.level];

  // Calculate width percentage for progress bar
  const progressWidth = password ? strength.score : 0;

  // Don't show meter if no password
  if (!password) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Strength Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium">
            Password Strength
          </span>
          <span className={`font-semibold ${currentStrength.text}`}>
            {currentStrength.label}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${currentStrength.bg} transition-all duration-300 ease-out`}
            style={{ width: `${progressWidth}%` }}
          />
        </div>
      </div>

      {/* Requirements Checklist */}
      {showRequirements && (
        <div className="space-y-2 pt-1">
          <p className="text-xs font-medium text-muted-foreground">
            Password must contain:
          </p>
          <div className="space-y-1.5">
            <RequirementItem
              met={requirements.minLength}
              label="At least 8 characters"
            />
            <RequirementItem
              met={requirements.hasUppercase}
              label="One uppercase letter (A-Z)"
            />
            <RequirementItem
              met={requirements.hasLowercase}
              label="One lowercase letter (a-z)"
            />
            <RequirementItem
              met={requirements.hasNumber}
              label="One number (0-9)"
            />
            <RequirementItem
              met={requirements.hasSpecialChar}
              label="One special character (!@#$%^&*...)"
            />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * RequirementItem Component
 * Individual requirement check item
 */
const RequirementItem = ({ met, label }) => {
  return (
    <div className="flex items-center gap-2 text-xs">
      {met ? (
        <CheckCircleIcon className="h-4 w-4 text-green-600 flex-shrink-0" />
      ) : (
        <XCircleIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
      )}
      <span
        className={met ? "text-green-700 font-medium" : "text-muted-foreground"}
      >
        {label}
      </span>
    </div>
  );
};

export default PasswordStrengthMeter;
