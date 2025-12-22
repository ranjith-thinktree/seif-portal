const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');
const Sentry = require('@sentry/node');

// Create Express app
const app = express();

// Sentry request handler - must be first middleware
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

// ===================================
// SECURITY MIDDLEWARE
// ===================================

// Helmet - Security headers
app.use(helmet());

// CORS - Cross-Origin Resource Sharing
app.use(cors(config.cors));

// Rate Limiting - Smart rate limiting for authenticated vs unauthenticated users
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message,
      error: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(windowMs / 1000 / 60),
      limit: max,
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for authenticated users (they have a valid JWT)
    skip: (req) => {
      // If user has valid Authorization header, skip rate limiting
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        return true; // Skip rate limiting for authenticated requests
      }
      return false;
    },
    handler: (req, res) => {
      const retryAfterMinutes = Math.ceil(windowMs / 1000 / 60);
      res.status(429).json({
        success: false,
        message,
        error: 'RATE_LIMIT_EXCEEDED',
        retryAfter: retryAfterMinutes,
        limit: max,
        windowMinutes: retryAfterMinutes,
      });
    },
  });
};

// Strict rate limit for unauthenticated users only
const authRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  20, // 20 requests for login/register endpoints (prevent brute force)
  'Too many authentication attempts, please try again later'
);

// General rate limit for unauthenticated API calls (authenticated users bypass this)
const generalRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests for unauthenticated users
  'Too many requests, please try again later or login to remove limits'
);

// Apply strict rate limiting to auth endpoints
app.use('/api/v1/auth/login', authRateLimiter);
app.use('/api/v1/auth/register', authRateLimiter);
app.use('/api/v1/auth/forgot-password', authRateLimiter);

// Apply general rate limiting to all API routes (authenticated users bypass)
app.use('/api/', generalRateLimiter);

// ===================================
// BODY PARSING MIDDLEWARE
// ===================================

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===================================
// LOGGING MIDDLEWARE
// ===================================

// HTTP request logger
if (config.server.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ===================================
// COMPRESSION MIDDLEWARE
// ===================================

// Compress responses
app.use(compression());

// ===================================
// HEALTH CHECK
// ===================================

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'SEIF Portal API is running',
    timestamp: new Date().toISOString(),
    environment: config.server.env,
    version: config.server.apiVersion,
  });
});

// ===================================
// API ROUTES
// ===================================

// API v1 routes
const v1Routes = require('./api/v1/routes');
app.use('/api/v1', v1Routes);

// Test route (for health check during development)
app.get('/api/v1/test', (req, res) => {
  res.json({
    success: true,
    message: 'API v1 is working!',
    timestamp: new Date().toISOString(),
  });
});

// ===================================
// ERROR HANDLING
// ===================================

// 404 Handler - Must be after all routes
app.use(notFoundHandler);

// Sentry error handler - must be before other error handlers
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

// Global Error Handler - Must be last
app.use(errorHandler);

module.exports = app;
