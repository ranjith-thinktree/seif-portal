const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

/**
 * WebSocket Server for Real-time Notifications
 */

let io;
const userSockets = new Map(); // Map of userId -> Set of socket IDs

/**
 * Initialize Socket.IO server
 */
const initializeWebSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5174',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/socket.io/',
  });

  // Authentication middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach user info to socket
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      socket.userName = decoded.full_name;
      socket.tokenExp = decoded.exp; // Store token expiration

      next();
    } catch (error) {
      // Provide specific error message for expired tokens
      if (error.name === 'TokenExpiredError') {
        // Don't log - this is expected when tokens expire
        return next(new Error('Authentication error: Token expired'));
      }

      // Only log unexpected authentication errors
      if (error.name !== 'JsonWebTokenError') {
        console.error('Socket authentication error:', error.message);
      }

      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Handle connections
  io.on('connection', (socket) => {
    const userId = socket.userId;
    const userRole = socket.userRole;

    console.log(`✅ User connected: ${socket.userName} (${userRole}) - Socket ID: ${socket.id}`);

    // Store user socket mapping
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);

    // Join role-specific room (for broadcasting to all admins/partners)
    socket.join(`role:${userRole}`);

    // Join user-specific room
    socket.join(`user:${userId}`);

    // Send connection acknowledgment
    socket.emit('connected', {
      message: 'Connected to notification server',
      userId,
      userRole,
    });

    // Set up token expiration warning
    const tokenExp = socket.tokenExp * 1000; // Convert to milliseconds
    const now = Date.now();
    const timeUntilExp = tokenExp - now;

    // Warn 2 minutes before token expiration
    if (timeUntilExp > 120000) {
      // More than 2 minutes
      const warnTime = timeUntilExp - 120000;
      setTimeout(() => {
        if (socket.connected) {
          socket.emit('token:expiring-soon', {
            message: 'Your session will expire in 2 minutes',
            expiresAt: tokenExp,
          });
          console.log(`⚠️ Token expiring warning sent to user ${userId}`);
        }
      }, warnTime);
    }

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.userName} - Socket ID: ${socket.id}`);

      // Remove socket from user's socket set
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
        }
      }
    });

    // Handle mark as read event
    socket.on('notification:read', (data) => {
      console.log(`📖 Notification marked as read: ${data.notificationId} by user ${userId}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${userId}:`, error);
    });
  });

  console.log('🔌 WebSocket server initialized');

  return io;
};

/**
 * Emit notification to specific user
 */
const emitToUser = (userId, event, data) => {
  if (!io) {
    console.error('Socket.IO not initialized');
    return;
  }

  io.to(`user:${userId}`).emit(event, data);
  console.log(`📤 Emitted "${event}" to user ${userId}`);
};

/**
 * Emit notification to all users with specific role
 */
const emitToRole = (role, event, data) => {
  if (!io) {
    console.error('Socket.IO not initialized');
    return;
  }

  const normalized = String(role || '').trim().toUpperCase();
  const rooms = new Set();
  if (normalized) {
    rooms.add(normalized);
  }
  if (role) {
    rooms.add(String(role));
  }
  if (normalized === 'ADMIN' || normalized === 'SUPER_ADMIN') {
    rooms.add('ADMIN');
    rooms.add('SUPER_ADMIN');
  }
  if (normalized === 'PARTNER') {
    rooms.add('partner');
  }

  rooms.forEach((roomRole) => {
    io.to(`role:${roomRole}`).emit(event, data);
  });
  console.log(`📤 Emitted "${event}" to role ${normalized || role}`);
};

/**
 * Emit notification to multiple users
 */
const emitToUsers = (userIds, event, data) => {
  if (!io) {
    console.error('Socket.IO not initialized');
    return;
  }

  userIds.forEach((userId) => {
    emitToUser(userId, event, data);
  });
};

/**
 * Broadcast to all connected users
 */
const broadcast = (event, data) => {
  if (!io) {
    console.error('Socket.IO not initialized');
    return;
  }

  io.emit(event, data);
  console.log(`📣 Broadcasted "${event}" to all users`);
};

/**
 * Get online users count
 */
const getOnlineUsersCount = () => {
  return userSockets.size;
};

/**
 * Check if user is online
 */
const isUserOnline = (userId) => {
  return userSockets.has(userId);
};

/**
 * Get all online user IDs
 */
const getOnlineUserIds = () => {
  return Array.from(userSockets.keys());
};

module.exports = {
  initializeWebSocket,
  emitToUser,
  emitToRole,
  emitToUsers,
  broadcast,
  getOnlineUsersCount,
  isUserOnline,
  getOnlineUserIds,
};
