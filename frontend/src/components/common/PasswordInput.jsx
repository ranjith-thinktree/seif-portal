import React, { useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

/**
 * PasswordInput Component
 * Reusable password input with show/hide toggle
 *
 * @param {Object} props
 * @param {String} props.id - Input ID
 * @param {String} props.name - Input name
 * @param {String} props.value - Input value
 * @param {Function} props.onChange - Change handler
 * @param {String} props.placeholder - Placeholder text
 * @param {Boolean} props.required - Required field
 * @param {Boolean} props.autoComplete - Auto complete attribute
 * @param {String} props.error - Error message
 * @param {String} props.className - Additional CSS classes
 * @param {Boolean} props.disabled - Disabled state
 */
const PasswordInput = ({
  id,
  name,
  value,
  onChange,
  placeholder = "Enter password",
  required = false,
  autoComplete = "current-password",
  error,
  className = "",
  disabled = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="relative">
      <input
        type={showPassword ? "text" : "password"}
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        disabled={disabled}
        className={`
          w-full px-4 py-3 pr-12 
          border rounded-lg 
          text-sm text-foreground
          placeholder:text-muted-foreground
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
          disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500
          transition-all duration-200
          ${error ? "border-red-500 focus:ring-red-500" : "border-border"}
          ${className}
        `}
      />

      {/* Show/Hide Toggle Button */}
      <button
        type="button"
        onClick={togglePasswordVisibility}
        disabled={disabled}
        className="
          absolute right-3 top-1/2 -translate-y-1/2
          p-1.5 rounded-md
          text-muted-foreground hover:text-foreground hover:bg-accent
          focus:outline-none focus:ring-2 focus:ring-primary-500
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200
        "
        title={showPassword ? "Hide password" : "Show password"}
        aria-label={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? (
          <EyeSlashIcon className="h-5 w-5" />
        ) : (
          <EyeIcon className="h-5 w-5" />
        )}
      </button>

      {/* Error Message */}
      {error && (
        <p className="mt-1.5 text-sm text-red-600 flex items-start gap-1">
          <span className="text-red-600 font-bold">!</span>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};

export default PasswordInput;
