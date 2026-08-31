require('./config/loadEnv');

// Initialize Sentry for error tracking (must be first)
const Sentry = require('@sentry/node');

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: `seif-portal@${require('../package.json').version}`,

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Filter sensitive data
    beforeSend(event, hint) {
      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
        }
      }
      return event;
    },
  });

  console.log('✅ Sentry error tracking initialized');
}

const http = require('http');
const app = require('./app');
const config = require('./config');
const { testConnection, closePool } = require('./database/connection');
const { initializeWebSocket } = require('./websocket/socket');
const cronService = require('./services/cron.service');

const PORT = config.server.port;
// CI/CD Test - Automated deployment active

// Test database connection before starting server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Server not started.');
      process.exit(1);
    }

    // Create HTTP server
    const server = http.createServer(app);

    // Initialize WebSocket server
    initializeWebSocket(server);

    // Start server
    server.listen(PORT, () => {
      console.log('================================================');
      console.log(`🚀 SEIF Portal API Server Started`);
      console.log(`📍 Environment: ${config.server.env}`);
      console.log(`🌐 Server running on: http://localhost:${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`📡 API Base URL: http://localhost:${PORT}/api/${config.server.apiVersion}`);
      console.log('================================================');

      // Start cron jobs for scheduled notifications
      cronService.start();
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);

      // Stop cron jobs first
      cronService.stop();

      // Stop accepting new connections
      server.close(async () => {
        console.log('✅ HTTP server closed');

        // Close database connection pool
        await closePool();

        console.log('✅ All connections closed. Exiting...');
        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        console.error('⚠️  Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    // Handle termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
