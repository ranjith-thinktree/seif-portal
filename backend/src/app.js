const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');

// Create Express app
const app = express();

// ===================================
// SECURITY MIDDLEWARE
// ===================================

// Helmet - Security headers
app.use(helmet());

// CORS - Cross-Origin Resource Sharing
app.use(cors(config.cors));

// Rate Limiting - Prevent abuse
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

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

// Global Error Handler - Must be last
app.use(errorHandler);

module.exports = app;
