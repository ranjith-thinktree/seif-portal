import React from "react";
import { APP_NAME } from "../../constants";

/**
 * Logo Component
 * SEIF Portal logo
 */
const Logo = ({ className = "", size = "default" }) => {
  const sizes = {
    sm: "h-8",
    default: "h-10",
    lg: "h-12",
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`${sizes[size]} aspect-square bg-primary-500 rounded-lg flex items-center justify-center`}
      >
        <span className="text-white font-bold text-xl">S</span>
      </div>
      <span className="text-lg font-semibold text-foreground">{APP_NAME}</span>
    </div>
  );
};

export default Logo;
