import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { authApi } from "../../api";

/**
 * Initial state for auth slice
 */
const getInitialState = () => {
  const storedToken = authApi.getStoredAccessToken();
  const storedUser = authApi.getStoredUser();

  return {
    user: storedUser,
    accessToken: storedToken,
    refreshToken: authApi.getStoredRefreshToken(),
    // If we have tokens, we need to verify them first (isLoading = true)
    // If no tokens, user is definitely not authenticated (isLoading = false)
    isAuthenticated: false, // Will be set to true after verification
    isLoading: !!storedToken, // Loading if we need to verify token
    error: null,
  };
};

const initialState = getInitialState();

/**
 * Async thunk for login
 */
export const login = createAsyncThunk(
  "auth/login",
  async (credentials, { rejectWithValue: _rejectWithValue }) => {
    try {
      const response = await authApi.login(credentials);

      console.log("Login response:", response);

      // The API returns { success, message, data: { user, accessToken, refreshToken } }
      // authApi.login already returns response.data, so we have the outer wrapper
      const loginData = response.data || response;

      // Store tokens and user in localStorage
      authApi.storeTokens(loginData.accessToken, loginData.refreshToken);
      authApi.storeUser(loginData.user);

      return loginData;
    } catch (error) {
      console.error("Login error caught:", error);
      console.error("Error response:", error.response);
      console.error("Error response data:", error.response?.data);

      const message = error.response?.data?.message || "Login failed";
      console.log("Returning error message:", message);

      return rejectWithValue(message);
    }
  },
);

/**
 * Async thunk for logout
 */
export const logout = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      // Call logout API
      await authApi.logout();
    } catch (error) {
      // Continue even if API call fails
      console.error("Logout API error:", error);
    } finally {
      // Always clear auth data on logout
      authApi.clearAuth();
    }
    return null;
  },
);

/**
 * Async thunk for verifying token on app mount
 */
export const verifyTokenOnMount = createAsyncThunk(
  "auth/verifyTokenOnMount",
  async (_, { rejectWithValue }) => {
    try {
      const accessToken = authApi.getStoredAccessToken();
      const refreshToken = authApi.getStoredRefreshToken();

      // If no tokens, user is not authenticated
      if (!accessToken || !refreshToken) {
        authApi.clearAuth();
        return rejectWithValue("No authentication tokens found");
      }

      // Verify token with backend
      const response = await authApi.verifyToken();

      // Token is valid, update user data if needed
      if (response.data?.user) {
        authApi.storeUser(response.data.user);
        return response.data.user;
      }

      return authApi.getStoredUser();
    } catch (error) {
      // Token verification failed, clear auth
      authApi.clearAuth();
      return rejectWithValue("Token verification failed");
    }
  },
);

/**
 * Async thunk for fetching user profile
 */
export const fetchUserProfile = createAsyncThunk(
  "auth/fetchUserProfile",
  async (_, { rejectWithValue }) => {
    try {
      const response = await authApi.getProfile();
      // API returns { success, message, data: user }
      const userData = response.data || response;
      authApi.storeUser(userData);
      return userData;
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to fetch profile";
      return rejectWithValue(message);
    }
  },
);

/**
 * Async thunk for updating user profile
 */
export const updateUserProfile = createAsyncThunk(
  "auth/updateUserProfile",
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await authApi.updateProfile(profileData);
      // API returns { success, message, data: user }
      const userData = response.data || response;
      authApi.storeUser(userData);
      return userData;
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to update profile";
      return rejectWithValue(message);
    }
  },
);

/**
 * Auth slice
 */
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
    // Set user (for manual updates)
    setUser: (state, action) => {
      state.user = action.payload;
      authApi.storeUser(action.payload);
    },
    // Update user data (e.g., after token refresh with new fields)
    updateUser: (state, action) => {
      state.user = action.payload;
    },
    // Clear auth state (manual logout)
    clearAuth: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.error = null;
      authApi.clearAuth();
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(login.pending, (state) => {
        console.log("Redux: login.pending");
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        console.log("Redux: login.fulfilled", action.payload);
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        console.log("Redux: login.rejected", action.payload);
        state.isLoading = false;
        state.isAuthenticated = false;
        state.error = action.payload;
      });

    // Logout
    builder
      .addCase(logout.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.error = null;
      })
      .addCase(logout.rejected, (state) => {
        // Even on error, clear auth state
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.error = null;
      });

    // Verify token on mount
    builder
      .addCase(verifyTokenOnMount.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(verifyTokenOnMount.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(verifyTokenOnMount.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.error = null;
      });

    // Fetch user profile
    builder
      .addCase(fetchUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    // Update user profile
    builder
      .addCase(updateUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, setUser, updateUser, clearAuth } = authSlice.actions;

export default authSlice.reducer;
