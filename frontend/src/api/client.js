import axios from "axios";
import { API_BASE_URL, STORAGE_KEYS } from "../constants";

/**
 * Axios instance for API calls
 * Configured with base URL and interceptors for JWT token handling
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 seconds
});

/**
 * Request Interceptor
 * Attaches JWT access token to every request
 */
apiClient.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * Handles token refresh and error responses
 */
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    // Return successful response
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh token yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If token refresh is already in progress, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        // Try to refresh the access token
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken } = response.data.data;

        // Store new access token
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);

        // Dispatch event for socket reconnection
        window.dispatchEvent(new CustomEvent("token-refreshed"));
        console.log("✅ Token refreshed successfully");

        // Update the failed request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        // Process queued requests
        processQueue(null, accessToken);

        // Retry the original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh token failed - clear storage and redirect to login
        processQueue(refreshError, null);

        console.log("❌ Token refresh failed, logging out...");

        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);

        // Dispatch logout event for socket cleanup
        window.dispatchEvent(new CustomEvent("auth-logout"));

        // Only redirect if not already on login/auth pages
        const authPages = [
          "/login",
          "/signin",
          "/signup",
          "/register",
          "/forgot-password",
        ];
        const isOnAuthPage = authPages.some((page) =>
          window.location.pathname.includes(page)
        );

        if (!isOnAuthPage) {
          console.log("Redirecting to login page...");
          window.location.href = "/login";
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Return error for handling in the calling component
    return Promise.reject(error);
  }
);

export default apiClient;
