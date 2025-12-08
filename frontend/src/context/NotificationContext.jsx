import React, { useEffect, useState, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { STORAGE_KEYS } from "../constants";
import { toast } from "react-toastify";
import { NotificationContext } from "./NotificationContextDefinition";

const SOCKET_URL =
  import.meta.env.VITE_API_URL?.replace("/api/v1", "") ||
  "http://localhost:5000";

/**
 * Notification Provider
 * Manages WebSocket connection and notification state
 */
export const NotificationProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const reconnectTimeoutRef = useRef(null);
  const socketRef = useRef(null);

  /**
   * Initialize Socket connection
   */
  const connectSocket = useCallback(() => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

    if (!token) {
      console.log("No auth token, skipping socket connection");
      return;
    }

    // Disconnect existing socket before creating new one
    if (socketRef.current) {
      console.log("Disconnecting existing socket before reconnection");
      socketRef.current.disconnect();
    }

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    newSocket.on("connect", () => {
      console.log("✅ WebSocket connected");
      setIsConnected(true);
    });

    newSocket.on("connected", (data) => {
      console.log("📡 Connected to notification server:", data);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("❌ WebSocket disconnected:", reason);
      setIsConnected(false);

      // Attempt to reconnect after 3 seconds
      if (reason === "io server disconnect") {
        // Server disconnected the socket, try to reconnect
        reconnectTimeoutRef.current = setTimeout(() => {
          newSocket.connect();
        }, 3000);
      }
    });

    newSocket.on("notification:new", (data) => {
      console.log("🔔 New notification received:", data);

      // Add to notifications list
      setNotifications((prev) => [data, ...prev]);

      // Increment unread count
      setUnreadCount((prev) => prev + 1);

      // Show toast notification
      toast.info(data.title, {
        position: "top-right",
        autoClose: 5000,
      });
    });

    newSocket.on("notification:read", (data) => {
      console.log("📖 Notification marked as read:", data);

      // Update notification in list
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === data.notificationId ? { ...notif, is_read: true } : notif
        )
      );

      // Decrement unread count
      setUnreadCount((prev) => Math.max(0, prev - 1));
    });

    newSocket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
      setIsConnected(false);

      // If authentication error, don't retry - wait for token refresh
      if (error.message.includes("Authentication")) {
        console.log(
          "Socket authentication failed, will retry on token refresh"
        );
        newSocket.disconnect();
      }
    });

    setSocket(newSocket);
    socketRef.current = newSocket;

    return newSocket;
  }, []);

  /**
   * Disconnect Socket
   */
  const disconnectSocket = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  }, [socket]);

  /**
   * Update unread count
   */
  const updateUnreadCount = useCallback((count) => {
    setUnreadCount(count);
  }, []);

  /**
   * Add notification to local state
   */
  const addNotification = useCallback((notification) => {
    setNotifications((prev) => [notification, ...prev]);
    setUnreadCount((prev) => prev + 1);
  }, []);

  /**
   * Mark notification as read locally
   */
  const markNotificationAsRead = useCallback((notificationId) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, is_read: true } : notif
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  /**
   * Mark all notifications as read locally
   */
  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((notif) => ({ ...notif, is_read: true }))
    );
    setUnreadCount(0);
  }, []);

  /**
   * Remove notification from local state
   */
  const removeNotification = useCallback((notificationId) => {
    setNotifications((prev) => {
      const notif = prev.find((n) => n.id === notificationId);
      if (notif && !notif.is_read) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }
      return prev.filter((n) => n.id !== notificationId);
    });
  }, []);

  /**
   * Initialize connection on mount (only if token exists)
   */
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

    if (token) {
      // Delay socket connection to ensure app is fully initialized
      const timer = setTimeout(() => {
        connectSocket();
      }, 500);

      return () => {
        clearTimeout(timer);
        disconnectSocket();
      };
    }
  }, []);

  /**
   * Listen for token refresh and logout events
   */
  useEffect(() => {
    const handleTokenRefresh = () => {
      console.log("🔄 Token refreshed, reconnecting socket...");
      const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (token) {
        // Reconnect with new token
        disconnectSocket();
        setTimeout(() => {
          connectSocket();
        }, 100);
      }
    };

    const handleLogout = () => {
      console.log("🚪 Logout event received, disconnecting socket...");
      disconnectSocket();
    };

    // Listen for token refresh and logout events
    window.addEventListener("token-refreshed", handleTokenRefresh);
    window.addEventListener("auth-logout", handleLogout);

    return () => {
      window.removeEventListener("token-refreshed", handleTokenRefresh);
      window.removeEventListener("auth-logout", handleLogout);
    };
  }, [connectSocket, disconnectSocket]);

  const value = {
    socket,
    isConnected,
    unreadCount,
    notifications,
    updateUnreadCount,
    addNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    removeNotification,
    connectSocket,
    disconnectSocket,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
