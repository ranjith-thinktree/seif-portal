const { successResponse, errorResponse } = require('../../../utils/response.util');
const fs = require('fs').promises;
const path = require('path');

/**
 * Admin Logs Controller
 * Handles fetching application logs for debugging
 */
class AdminLogsController {
  /**
   * Get PM2 logs (both error and output logs)
   * @route GET /api/v1/admin/logs
   * @access SUPER_ADMIN only
   */
  async getLogs(req, res) {
    try {
      const { lines = 100, type = 'all' } = req.query;
      const maxLines = Math.min(parseInt(lines), 1000); // Max 1000 lines

      const logsDir = path.join(__dirname, '../../../../logs');
      const errorLogPath = path.join(logsDir, 'error.log');
      const outLogPath = path.join(logsDir, 'out.log');
      const combinedLogPath = path.join(logsDir, 'combined.log');

      let logs = {
        error: [],
        output: [],
        combined: [],
        timestamp: new Date().toISOString(),
      };

      // Read error logs
      if (type === 'error' || type === 'all') {
        try {
          const errorContent = await fs.readFile(errorLogPath, 'utf-8');
          const errorLines = errorContent.split('\n').filter((line) => line.trim());
          logs.error = errorLines.slice(-maxLines);
        } catch (err) {
          logs.error = ['No error logs found'];
        }
      }

      // Read output logs
      if (type === 'output' || type === 'all') {
        try {
          const outContent = await fs.readFile(outLogPath, 'utf-8');
          const outLines = outContent.split('\n').filter((line) => line.trim());
          logs.output = outLines.slice(-maxLines);
        } catch (err) {
          logs.output = ['No output logs found'];
        }
      }

      // Read combined logs
      if (type === 'combined' || type === 'all') {
        try {
          const combinedContent = await fs.readFile(combinedLogPath, 'utf-8');
          const combinedLines = combinedContent.split('\n').filter((line) => line.trim());
          logs.combined = combinedLines.slice(-maxLines);
        } catch (err) {
          logs.combined = ['No combined logs found'];
        }
      }

      return successResponse(res, 'Logs fetched successfully', logs);
    } catch (error) {
      console.error('Error fetching logs:', error);
      return errorResponse(res, 'Failed to fetch logs', 500);
    }
  }

  /**
   * Get system information
   * @route GET /api/v1/admin/system-info
   * @access SUPER_ADMIN only
   */
  async getSystemInfo(req, res) {
    try {
      const os = require('os');

      const systemInfo = {
        node_version: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          used: os.totalmem() - os.freemem(),
          usagePercent: (((os.totalmem() - os.freemem()) / os.totalmem()) * 100).toFixed(2),
        },
        cpu: {
          model: os.cpus()[0].model,
          cores: os.cpus().length,
          loadAverage: os.loadavg(),
        },
        environment: process.env.NODE_ENV,
        pid: process.pid,
        timestamp: new Date().toISOString(),
      };

      return successResponse(res, 'System info fetched successfully', systemInfo);
    } catch (error) {
      console.error('Error fetching system info:', error);
      return errorResponse(res, 'Failed to fetch system info', 500);
    }
  }

  /**
   * Clear logs
   * @route POST /api/v1/admin/logs/clear
   * @access SUPER_ADMIN only
   */
  async clearLogs(req, res) {
    try {
      const logsDir = path.join(__dirname, '../../../../logs');
      const errorLogPath = path.join(logsDir, 'error.log');
      const outLogPath = path.join(logsDir, 'out.log');
      const combinedLogPath = path.join(logsDir, 'combined.log');

      // Clear log files
      await fs.writeFile(errorLogPath, '');
      await fs.writeFile(outLogPath, '');
      await fs.writeFile(combinedLogPath, '');

      return successResponse(res, 'Logs cleared successfully');
    } catch (error) {
      console.error('Error clearing logs:', error);
      return errorResponse(res, 'Failed to clear logs', 500);
    }
  }

  /**
   * Get comprehensive system diagnostics
   * @route GET /api/v1/admin/diagnostics
   * @access SUPER_ADMIN only
   */
  async getDiagnostics(req, res) {
    try {
      const os = require('os');
      const crypto = require('crypto');
      const db = require('../../../database/connection');
      const { exec } = require('child_process');
      const util = require('util');
      const execPromise = util.promisify(exec);

      const diagnostics = {
        timestamp: new Date().toISOString(),
        deployment: {},
        database: {},
        api: {},
        files: {},
        pm2: {},
        tests: [],
        criticalIssues: [],
      };

      // Deployment Info
      try {
        const packageJson = require('../../../../package.json');
        diagnostics.deployment = {
          version: packageJson.version || 'unknown',
          name: packageJson.name || 'SEIF Backend',
          nodeVersion: process.version,
          environment: process.env.NODE_ENV || 'development',
          timestamp: new Date().toISOString(),
        };
      } catch (err) {
        diagnostics.deployment = {
          version: 'unknown',
          error: 'Failed to read package.json',
        };
      }

      // Database Connection Test
      try {
        const dbStart = Date.now();
        const [rows] = await db.query('SELECT 1 as test');
        const dbResponseTime = Date.now() - dbStart;

        // Get counts
        const [partnerCountResult] = await db.query(
          'SELECT COUNT(*) as count FROM partners WHERE status = "active"'
        );
        const [centerCountResult] = await db.query(
          'SELECT COUNT(*) as count FROM centers WHERE status = "active"'
        );
        const [studentCountResult] = await db.query('SELECT COUNT(*) as count FROM students');

        diagnostics.database = {
          connected: true,
          responseTime: dbResponseTime,
          host: process.env.DB_HOST || 'localhost',
          database: process.env.DB_NAME || 'seif_db',
          counts: {
            partners: partnerCountResult[0]?.count || 0,
            centers: centerCountResult[0]?.count || 0,
            students: studentCountResult[0]?.count || 0,
          },
        };
      } catch (err) {
        diagnostics.database = {
          connected: false,
          error: err.message,
        };
        diagnostics.criticalIssues.push({
          title: 'Database Connection Failed',
          description: err.message,
          solution: 'Check database credentials and ensure MySQL is running',
        });
      }

      // File Hash Verification
      try {
        const analyticsServicePath = path.join(__dirname, '../services/analytics.service.js');
        const content = await fs.readFile(analyticsServicePath, 'utf-8');
        const hash = crypto.createHash('md5').update(content).digest('hex');

        diagnostics.files = {
          'analytics.service.js': hash,
        };

        // Check if file has expected code
        if (!content.includes('FROM dual')) {
          diagnostics.criticalIssues.push({
            title: 'Analytics Service Outdated',
            description: 'analytics.service.js does not contain expected FROM dual query',
            solution: 'Redeploy the latest code or check if old cached version is running',
          });
        }
      } catch (err) {
        diagnostics.files = {
          error: 'Failed to verify files',
        };
      }

      // PM2 Status (if available)
      try {
        const { stdout } = await execPromise('pm2 jlist');
        const pm2List = JSON.parse(stdout);
        const seifBackend = pm2List.find((p) => p.name === 'seif-backend');

        if (seifBackend) {
          diagnostics.pm2 = {
            name: seifBackend.name,
            status: seifBackend.pm2_env.status,
            uptime: Math.floor((Date.now() - seifBackend.pm2_env.pm_uptime) / 1000),
            restarts: seifBackend.pm2_env.restart_time,
            memory: `${Math.round(seifBackend.monit.memory / 1024 / 1024)}MB`,
            cpu: `${seifBackend.monit.cpu}%`,
          };
        }
      } catch (err) {
        diagnostics.pm2 = {
          status: 'unavailable',
          message: 'PM2 info not available (may not be running under PM2)',
        };
      }

      // API Health Tests
      try {
        const testStart = Date.now();
        const [healthCheckResult] = await db.query('SELECT COUNT(*) as count FROM partners LIMIT 1');
        const healthTime = Date.now() - testStart;

        diagnostics.tests.push({
          endpoint: 'Database Query Test',
          passed: healthCheckResult && healthCheckResult.length > 0,
          responseTime: healthTime,
        });
      } catch (err) {
        diagnostics.tests.push({
          endpoint: 'Database Query Test',
          passed: false,
          responseTime: 0,
          error: err.message,
        });
      }

      // Check for common issues
      if (!diagnostics.database.connected) {
        diagnostics.api.healthy = false;
        diagnostics.api.endpoint = 'Database connection required';
      } else {
        diagnostics.api.healthy = true;
        diagnostics.api.endpoint = 'All systems operational';
      }

      return successResponse(res, 'Diagnostics fetched successfully', diagnostics);
    } catch (error) {
      console.error('Error fetching diagnostics:', error);
      return errorResponse(res, 'Failed to fetch diagnostics: ' + error.message, 500);
    }
  }
}

module.exports = new AdminLogsController();
