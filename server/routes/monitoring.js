/**
 * Monitoring Routes
 * Health checks, metrics, status, logs, and uptime endpoints for TRM
 * Features: Health monitoring, metrics export, service status, log aggregation
 */

const express = require('express');
const monitoringService = require('../services/monitoringService.js');
const performanceMonitor = require('../services/performanceMonitor.js');
const { asyncHandler } = require('../middleware/errorHandler.js');
const { authenticate } = require('../middleware/auth.js');
const { requireAdmin } = require('../middleware/rbac.js');

const router = express.Router();

// Public routes - no authentication required
/**
 * @route   GET /api/health
 * @desc    Basic health check
 * @access  Public
 */
router.get('/health', asyncHandler(async (req, res) => {
  const health = await monitoringService.checkHealth();
  
  // Return 503 if service is critical
  const statusCode = health.status === 'critical' ? 503 : 200;
  
  res.status(statusCode).json({
    success: health.status !== 'critical',
    status: health.status,
    timestamp: health.timestamp,
    uptime: health.service.uptime,
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
}));

/**
 * @route   GET /api/health/detailed
 * @desc    Detailed health check with all services
 * @access  Public (for load balancers and monitoring systems)
 */
router.get('/health/detailed', asyncHandler(async (req, res) => {
  const health = await monitoringService.checkHealth();
  
  // Return 503 if service is critical
  const statusCode = health.status === 'critical' ? 503 : 200;
  
  res.status(statusCode).json({
    success: health.status !== 'critical',
    status: health.status,
    timestamp: health.timestamp,
    responseTime: health.responseTime,
    service: health.service,
    checks: {
      application: {
        status: health.checks.application.status,
        memory: health.checks.application.memory,
        uptime: health.checks.application.uptime,
        issues: health.checks.application.issues,
      },
      database: {
        status: health.checks.database.status,
        state: health.checks.database.state,
        responseTime: health.checks.database.responseTime,
        pool: health.checks.database.pool,
      },
      cache: {
        status: health.checks.cache.status,
        responseTime: health.checks.cache.responseTime,
      },
      performance: {
        status: health.checks.performance.status,
        checks: health.checks.performance.checks,
      },
      external: health.checks.external,
    },
  });
}));

/**
 * @route   GET /api/status
 * @desc    Service status overview
 * @access  Public
 */
router.get('/status', asyncHandler(async (req, res) => {
  const status = monitoringService.getServiceStatus();
  
  res.json({
    success: true,
    data: {
      service: status.service,
      health: {
        status: status.health.status,
        lastCheck: status.health.timestamp,
      },
      performance: status.performance,
      uptime: status.uptime,
    },
  });
}));

// Protected routes - require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

/**
 * @route   GET /api/metrics
 * @desc    Get all metrics in JSON format
 * @access  Admin only
 */
router.get('/metrics', asyncHandler(async (req, res) => {
  const metrics = performanceMonitor.getMetrics();
  
  res.json({
    success: true,
    data: metrics,
  });
}));

/**
 * @route   GET /api/metrics/datadog
 * @desc    Export metrics in DataDog format
 * @access  Admin only
 */
router.get('/metrics/datadog', asyncHandler(async (req, res) => {
  const metrics = performanceMonitor.exportForDataDog();
  
  res.json({
    success: true,
    data: {
      series: metrics,
      timestamp: Math.floor(Date.now() / 1000),
    },
  });
}));

/**
 * @route   GET /api/metrics/newrelic
 * @desc    Export metrics in New Relic format
 * @access  Admin only
 */
router.get('/metrics/newrelic', asyncHandler(async (req, res) => {
  const metrics = performanceMonitor.exportForNewRelic();
  
  res.json({
    success: true,
    data: metrics,
  });
}));

/**
 * @route   GET /api/status/services
 * @desc    Individual service statuses
 * @access  Admin only
 */
router.get('/status/services', asyncHandler(async (req, res) => {
  const status = monitoringService.getServiceStatus();
  const health = await monitoringService.checkHealth();
  
  res.json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      overall: status.health.status,
      services: {
        api: {
          status: 'healthy',
          version: process.env.npm_package_version || '1.0.0',
          uptime: process.uptime(),
          uptimeFormatted: status.service.uptimeFormatted,
        },
        database: {
          status: health.checks.database.status,
          state: health.checks.database.state,
          responseTime: health.checks.database.responseTime,
          connections: health.checks.database.pool,
        },
        cache: {
          status: health.checks.cache.status,
          responseTime: health.checks.cache.responseTime,
          l1: health.checks.cache.l1,
          l2: health.checks.cache.l2,
        },
        performance: {
          status: health.checks.performance.status,
          checks: health.checks.performance.checks,
          metrics: health.checks.performance.metrics,
        },
        external: Object.entries(health.checks.external || {}).reduce((acc, [name, data]) => {
          acc[name] = {
            status: data.status,
            lastCheck: data.lastCheck,
            responseTime: data.responseTime,
            uptime: data.uptime,
          };
          return acc;
        }, {}),
      },
    },
  });
}));

/**
 * @route   GET /api/logs
 * @desc    Get logs with filters (admin only)
 * @access  Admin only
 */
router.get('/logs', asyncHandler(async (req, res) => {
  const { 
    level, 
    limit = 100,
    from,
    to,
    search,
  } = req.query;
  
  const limitNum = Math.min(1000, Math.max(1, parseInt(limit, 10)));
  
  let logs = monitoringService.getRecentLogs(level || null, limitNum);
  
  // Filter by time range
  if (from) {
    const fromDate = new Date(from).getTime();
    logs = logs.filter(log => new Date(log.timestamp).getTime() >= fromDate);
  }
  
  if (to) {
    const toDate = new Date(to).getTime();
    logs = logs.filter(log => new Date(log.timestamp).getTime() <= toDate);
  }
  
  // Search in message and metadata
  if (search) {
    const searchLower = search.toLowerCase();
    logs = logs.filter(log => 
      log.message.toLowerCase().includes(searchLower) ||
      JSON.stringify(log.metadata).toLowerCase().includes(searchLower)
    );
  }
  
  // Count by level
  const levelCounts = logs.reduce((acc, log) => {
    acc[log.level] = (acc[log.level] || 0) + 1;
    return acc;
  }, {});
  
  res.json({
    success: true,
    data: {
      logs,
      meta: {
        total: logs.length,
        limit: limitNum,
        levelCounts,
        filters: {
          level: level || null,
          from: from || null,
          to: to || null,
          search: search || null,
        },
      },
    },
  });
}));

/**
 * @route   GET /api/logs/recent
 * @desc    Get recent logs (admin only)
 * @access  Admin only
 */
router.get('/logs/recent', asyncHandler(async (req, res) => {
  const { limit = 50, level } = req.query;
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  
  const logs = monitoringService.getRecentLogs(level || null, limitNum);
  
  res.json({
    success: true,
    data: {
      logs,
      count: logs.length,
      timestamp: new Date().toISOString(),
    },
  });
}));

/**
 * @route   GET /api/uptime
 * @desc    Get uptime information
 * @access  Admin only
 */
router.get('/uptime', asyncHandler(async (req, res) => {
  const uptime = monitoringService.getUptimeStats();
  const status = monitoringService.getServiceStatus();
  
  res.json({
    success: true,
    data: {
      service: status.service,
      uptime: {
        percentage: (uptime.uptimePercentage * 100).toFixed(2) + '%',
        percentageRaw: uptime.uptimePercentage,
        totalDowntimeMinutes: uptime.totalDowntimeMinutes,
        serviceStartTime: uptime.serviceStartTime,
        totalChecks: uptime.totalChecks,
        checkFrequency: uptime.checkFrequency,
      },
      currentDowntime: uptime.periods.length > 0 && !uptime.periods[uptime.periods.length - 1].end
        ? uptime.periods[uptime.periods.length - 1]
        : null,
    },
  });
}));

/**
 * @route   GET /api/uptime/stats
 * @desc    Get detailed uptime statistics
 * @access  Admin only
 */
router.get('/uptime/stats', asyncHandler(async (req, res) => {
  const { hours = 24 } = req.query;
  const hoursNum = Math.min(168, Math.max(1, parseInt(hours, 10)));
  
  const uptime = monitoringService.getUptimeStats(hoursNum);
  
  res.json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      period: {
        hours: hoursNum,
        start: new Date(Date.now() - hoursNum * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
      },
      summary: {
        uptimePercentage: (uptime.uptimePercentage * 100).toFixed(2) + '%',
        uptimePercentageRaw: uptime.uptimePercentage,
        totalDowntimeMs: uptime.totalDowntime,
        totalDowntimeMinutes: uptime.totalDowntimeMinutes,
        totalDowntimeFormatted: formatDuration(uptime.totalDowntime),
        periodCount: uptime.periods.length,
      },
      periods: uptime.periods,
    },
  });
}));

/**
 * Format duration in milliseconds to readable string
 * @param {number} ms - Milliseconds
 * @returns {string} Formatted duration
 */
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60 * 1000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 60 * 60 * 1000) return `${(ms / 60 / 1000).toFixed(1)}m`;
  return `${(ms / 60 / 60 / 1000).toFixed(1)}h`;
}

module.exports = router;
