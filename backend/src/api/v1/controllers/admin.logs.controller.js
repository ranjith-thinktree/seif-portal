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
          const errorLines = errorContent.split('\n').filter(line => line.trim());
          logs.error = errorLines.slice(-maxLines);
        } catch (err) {
          logs.error = ['No error logs found'];
        }
      }

      // Read output logs
      if (type === 'output' || type === 'all') {
        try {
          const outContent = await fs.readFile(outLogPath, 'utf-8');
          const outLines = outContent.split('\n').filter(line => line.trim());
          logs.output = outLines.slice(-maxLines);
        } catch (err) {
          logs.output = ['No output logs found'];
        }
      }

      // Read combined logs
      if (type === 'combined' || type === 'all') {
        try {
          const combinedContent = await fs.readFile(combinedLogPath, 'utf-8');
          const combinedLines = combinedContent.split('\n').filter(line => line.trim());
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
          usagePercent: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2)
        },
        cpu: {
          model: os.cpus()[0].model,
          cores: os.cpus().length,
          loadAverage: os.loadavg()
        },
        environment: process.env.NODE_ENV,
        pid: process.pid,
        timestamp: new Date().toISOString()
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
}

module.exports = new AdminLogsController();
