// API Base URL
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "/api/v1" : "http://localhost:5000/api/v1");

// App Configuration
export const APP_NAME = import.meta.env.VITE_APP_NAME || "SEIF Portal";
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";

// Local Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: "seif_access_token",
  REFRESH_TOKEN: "seif_refresh_token",
  USER: "seif_user",
};

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    LOGOUT: "/auth/logout",
    REFRESH: "/auth/refresh",
    PROFILE: "/auth/profile",
    UPDATE_PROFILE: "/auth/profile",
    CHANGE_PASSWORD: "/auth/change-password",
    VERIFY_TOKEN: "/auth/verify",
  },
  USERS: {
    LIST: "/users",
    GET: (id) => `/users/${id}`,
    CREATE: "/users",
    UPDATE: (id) => `/users/${id}`,
    DELETE: (id) => `/users/${id}`,
  },
  // Future endpoints
  PARTNERS: {
    LIST: "/partners",
  },
  CENTERS: {
    LIST: "/centers",
  },
  REQUESTS: {
    LIST: "/requests",
  },
};
