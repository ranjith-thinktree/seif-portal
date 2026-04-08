import React from "react";

/**
 * Logo Component
 * Schneider Electric Foundation India logo
 */
const Logo = ({ className = "", size = "default" }) => {
  const heights = {
    sm: "h-8",
    default: "h-10",
    lg: "h-14",
  };

  return (
    <div className={`flex items-center ${className}`}>
      <img
        src="/seif-logo.png"
        alt="Schneider Electric Foundation India"
        className={`${heights[size]} w-auto object-contain`}
      />
    </div>
  );
};

export default Logo;
