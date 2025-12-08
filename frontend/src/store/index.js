import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";

/**
 * Redux store configuration
 */
const store = configureStore({
  reducer: {
    auth: authReducer,
    // Add more reducers here as the app grows
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Disable for complex objects if needed
    }),
  devTools: import.meta.env.MODE !== "production", // Enable Redux DevTools in development
});

export default store;
