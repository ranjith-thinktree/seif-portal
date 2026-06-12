import React, { useEffect, useState, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { STORAGE_KEYS } from "../constants";
import { toast } from "react-toastify";
import { NotificationContext } from "./NotificationContextDefinition.js";
import {
  getGroupedNotifications,
  getUnreadCount,
} from "../services/notification.service";

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
      reconnection: false, // Disable auto-reconnect, we handle it manually on token refresh
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

      Promise.all([
        getGroupedNotifications({
          page: 1,
          limit: 10,
          sortBy: "newest",
        }),
        getUnreadCount(),
      ])
        .then(([notificationsResponse, countResponse]) => {
          if (notificationsResponse?.data) {
            setNotifications(notificationsResponse.data);
          }

          if (countResponse?.count !== undefined) {
            setUnreadCount(countResponse.count);
          }
        })
        .catch((error) => {
          if (error?.response?.status === 401) {
            return;
          }
          console.error(
            "❌ Failed to refresh notifications after socket event:",
            error,
          );
        });

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
          notif.id === data.notificationId
            ? { ...notif, is_read: true }
            : notif,
        ),
      );

      // Decrement unread count
      setUnreadCount((prev) => Math.max(0, prev - 1));
    });

    newSocket.on("connect_error", (error) => {
      setIsConnected(false);

      // If authentication error, don't retry - wait for token refresh
      if (error.message.includes("Authentication")) {
        // Don't log expired token errors - they're expected
        if (!error.message.includes("expired")) {
          console.error("Socket authentication error:", error.message);
        }
        newSocket.disconnect();
      } else {
        console.error("Socket connection error:", error.message);
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
        notif.id === notificationId ? { ...notif, is_read: true } : notif,
      ),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  /**
   * Mark notification as unread locally
   */
  const markNotificationAsUnread = useCallback((notificationId) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, is_read: false } : notif,
      ),
    );
    setUnreadCount((prev) => prev + 1);
  }, []);

  /**
   * Mark all notifications as read locally
   */
  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((notif) => ({ ...notif, is_read: true })),
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
   * Fetch initial notifications from API
   */
  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (!token) return;

      console.log("📥 Fetching initial notifications...");

      // Fetch grouped notifications (includes both center and upload notifications)
      const response = await getGroupedNotifications({
        page: 1,
        limit: 10, // Get first 10 for dashboard display
        sortBy: "newest",
      });

      if (response.data) {
        console.log("✅ Fetched notifications:", response.data.length);
        setNotifications(response.data);
      }

      // Fetch unread count
      const countResponse = await getUnreadCount();
      if (countResponse.count !== undefined) {
        setUnreadCount(countResponse.count);
      }
    } catch (error) {
      if (error?.response?.status === 401) {
        return;
      }
      console.error("❌ Failed to fetch notifications:", error);
    }
  }, []);

  /**
   * Initialize connection and fetch notifications on mount
   */
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

    if (token) {
      // Fetch initial notifications first
      fetchNotifications();

      // Then connect socket for real-time updates
      const timer = setTimeout(() => {
        connectSocket();
      }, 500);

      return () => {
        clearTimeout(timer);
        disconnectSocket();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    markNotificationAsUnread,
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
