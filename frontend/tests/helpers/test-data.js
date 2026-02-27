/**
 * Test Data Helpers
 * Senior Full-Stack Developer Test Utilities
 */

export const VALID_TIERS = [
  "Not eligible",
  "1st Refurbishment",
  "2nd Refurbishment",
  "3rd Refurbishment",
  "4th Refurbishment",
];

export function calculateExpectedTier(yearEstablished) {
  const currentYear = new Date().getFullYear();
  const yearsSince = currentYear - yearEstablished;

  if (yearsSince >= 14) return "4th Refurbishment";
  if (yearsSince >= 11) return "3rd Refurbishment";
  if (yearsSince >= 8) return "2nd Refurbishment";
  if (yearsSince >= 5) return "1st Refurbishment";
  return "Not eligible";
}

export function validateTierColor(tier) {
  const tierColors = {
    "4th Refurbishment": "purple",
    "3rd Refurbishment": "blue",
    "2nd Refurbishment": "yellow",
    "1st Refurbishment": "orange",
    "Not eligible": "gray",
  };
  return tierColors[tier] || "gray";
}

export const ADMIN_CREDENTIALS = {
  email: "admin@seif.org",
  password: "Admin@123",
};

export const PARTNER_CREDENTIALS = {
  email: "partner@example.com",
  password: "Partner@123",
};
