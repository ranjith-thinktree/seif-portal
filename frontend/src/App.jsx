import React, { useEffect, useState } from "react";
import { Provider, useDispatch, useSelector } from "react-redux";
import store from "./store";
import { AppRoutes } from "./routes";
import { NotificationProvider } from "./context/NotificationContext";
import { verifyTokenOnMount, updateUser } from "./store/slices/authSlice";
import { PageLoader } from "./components/common";

// CI/CD Automated Deployment Active

/**
 * App Initializer - Verifies auth on mount
 */
const AppInitializer = ({ children }) => {
  const dispatch = useDispatch();
  const { isLoading } = useSelector((state) => state.auth);
  const [initComplete, setInitComplete] = useState(false);

  useEffect(() => {
    // Verify token when app loads
    const initAuth = async () => {
      try {
        console.log("🔐 Initializing authentication...");
        await dispatch(verifyTokenOnMount()).unwrap();
        console.log("✅ Authentication initialized successfully");
      } catch (error) {
        console.log("ℹ️ No valid session found");
        // Error is handled by authSlice, continue loading app
      } finally {
        setInitComplete(true);
      }
    };

    initAuth();
  }, [dispatch]);

  useEffect(() => {
    // Listen for user updates from token refresh
    const handleUserUpdate = (event) => {
      const { user } = event.detail;
      if (user) {
        console.log("👤 User data updated from token refresh");
        dispatch(updateUser(user));
      }
    };

    window.addEventListener("user-updated", handleUserUpdate);

    return () => {
      window.removeEventListener("user-updated", handleUserUpdate);
    };
  }, [dispatch]);

  // Show loader while auth is being verified
  if (!initComplete || isLoading) {
    return <PageLoader />;
  }

  return children;
};

/**
 * Main App Component
 */
function App() {
  return (
    <Provider store={store}>
      <AppInitializer>
        <NotificationProvider>
          <AppRoutes />
        </NotificationProvider>
      </AppInitializer>
    </Provider>
  );
}

export default App;
