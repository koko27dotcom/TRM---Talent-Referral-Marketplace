/**
 * Comprehensive Health Check Endpoint
 * Following Google SRE and AWS best practices for health monitoring
 * Provides deep health checks for all dependencies
 */

const express = require('express');
const mongoose = require('mongoose');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

// Health check configuration
const HEALTH_CONFIG = {
  // Timeouts for dependency checks (ms)
  timeouts: {
    database: 5000,
    redis: 3000,
    disk: 2000,
    memory: 1000,
  },
  // Thresholds
  thresholds: {
    diskUsagePercent: 90,
    memoryUsagePercent: 90,
    maxResponseTimeMs: 1000,
  }
};

/**
 * Check database connectivity
 */
async function checkDatabase() {
  const startTime = Date.now();
  
  try {
    // Check MongoDB connection state
    const state = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    if (state !== 1) {
      return {
        status: 'unhealthy',
        component: 'database',
        message: `MongoDB is ${states[state]}`,
        responseTime: Date.now() - startTime,
      };
    }

    // Perform a simple query to verify functionality
    const adminDb = mongoose.connection.db.admin();
    const pingResult = await adminDb.ping();
    
    // Get server status for detailed info
    const serverStatus = await adminDb.serverStatus();
    
    return {
      status: 'healthy',
      component: 'database',
      message: 'MongoDB is operational',
      responseTime: Date.now() - startTime,
      details: {
        version: serverStatus.version,
        uptime: serverStatus.uptime,
        connections: serverStatus.connections,
        memory: {
          resident: serverStatus.mem?.resident,
          virtual: serverStatus.mem?.virtual,
        },
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      component: 'database',
      message: error.message,
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * Check Redis connectivity
 */
async function checkRedis() {
  const startTime = Date.now();
  
  try {
    // Dynamic import to avoid issues if Redis is not configured
    const redis = require('../config/redis.js');
    
    if (!redis || typeof redis.ping !== 'function') {
      return {
        status: 'unknown',
        component: 'redis',
        message: 'Redis not configured',
        responseTime: Date.now() - startTime,
      };
    }

    const pingResult = await redis.ping();
    
    if (pingResult !== 'PONG') {
      return {
        status: 'unhealthy',
        component: 'redis',
        message: 'Redis ping failed',
        responseTime: Date.now() - startTime,
      };
    }

    // Get Redis info
    const info = await redis.info('server');
    const version = info.match(/redis_version:(.+)/)?.[1]?.trim();

    return {
      status: 'healthy',
      component: 'redis',
      message: 'Redis is operational',
      responseTime: Date.now() - startTime,
      details: {
        version,
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      component: 'redis',
      message: error.message,
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * Check disk space
 */
async function checkDiskSpace() {
  const startTime = Date.now();
  
  try {
    const stats = await fs.statfs(process.cwd());
    const total = stats.blocks * stats.bsize;
    const free = stats.bfree * stats.bsize;
    const used = total - free;
    const usagePercent = (used / total) * 100;

    const status = usagePercent > HEALTH_CONFIG.thresholds.diskUsagePercent 
      ? 'unhealthy' 
      : 'healthy';

    return {
      status,
      component: 'disk',
      message: status === 'healthy' ? 'Disk space is adequate' : 'Disk space is critically low',
      responseTime: Date.now() - startTime,
      details: {
        total: formatBytes(total),
        free: formatBytes(free),
        used: formatBytes(used),
        usagePercent: usagePercent.toFixed(2),
      },
    };
  } catch (error) {
    return {
      status: 'unknown',
      component: 'disk',
      message: error.message,
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * Check memory usage
 */
async function checkMemory() {
  const startTime = Date.now();
  
  try {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const usagePercent = (usedMemory / totalMemory) * 100;
    const processMemory = process.memoryUsage();

    const status = usagePercent > HEALTH_CONFIG.thresholds.memoryUsagePercent 
      ? 'unhealthy' 
      : 'healthy';

    return {
      status,
      component: 'memory',
      message: status === 'healthy' ? 'Memory usage is normal' : 'Memory usage is critically high',
      responseTime: Date.now() - startTime,
      details: {
        system: {
          total: formatBytes(totalMemory),
          free: formatBytes(freeMemory),
          used: formatBytes(usedMemory),
          usagePercent: usagePercent.toFixed(2),
        },
        process: {
          rss: formatBytes(processMemory.rss),
          heapTotal: formatBytes(processMemory.heapTotal),
          heapUsed: formatBytes(processMemory.heapUsed),
          external: formatBytes(processMemory.external),
        },
      },
    };
  } catch (error) {
    return {
      status: 'unknown',
      component: 'memory',
      message: error.message,
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * Check application-specific metrics
 */
async function checkApplication() {
  const startTime = Date.now();
  
  try {
    // Get package info
    const packageJson = require('../../package.json');
    
    // Calculate uptime
    const uptime = process.uptime();
    
    // Get Node.js version
    const nodeVersion = process.version;
    
    return {
      status: 'healthy',
      component: 'application',
      message: 'Application is running',
      responseTime: Date.now() - startTime,
      details: {
        name: packageJson.name,
        version: packageJson.version,
        nodeVersion,
        uptime: formatUptime(uptime),
        environment: process.env.NODE_ENV || 'development',
        pid: process.pid,
        platform: os.platform(),
        arch: os.arch(),
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      component: 'application',
      message: error.message,
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format uptime to human readable
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);
  
  return parts.join(' ');
}

/**
 * Basic health check (for load balancers)
 * GET /health
 */
router.get('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Quick check - just verify app is running
    const appCheck = await checkApplication();
    
    if (appCheck.status === 'healthy') {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        error: appCheck.message,
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * Deep health check (for monitoring systems)
 * GET /health/deep
 */
router.get('/deep', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Run all health checks in parallel
    const [
      appCheck,
      dbCheck,
      redisCheck,
      diskCheck,
      memoryCheck,
    ] = await Promise.all([
      checkApplication(),
      checkDatabase(),
      checkRedis(),
      checkDiskSpace(),
      checkMemory(),
    ]);

    const checks = [appCheck, dbCheck, redisCheck, diskCheck, memoryCheck];
    
    // Determine overall status
    const hasUnhealthy = checks.some(check => check.status === 'unhealthy');
    const hasUnknown = checks.some(check => check.status === 'unknown');
    
    let overallStatus = 'healthy';
    if (hasUnhealthy) overallStatus = 'unhealthy';
    else if (hasUnknown) overallStatus = 'degraded';

    const responseTime = Date.now() - startTime;
    
    // Check if response time is acceptable
    if (responseTime > HEALTH_CONFIG.thresholds.maxResponseTimeMs) {
      overallStatus = 'degraded';
    }

    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime,
      checks: {
        application: appCheck,
        database: dbCheck,
        redis: redisCheck,
        disk: diskCheck,
        memory: memoryCheck,
      },
    };

    const statusCode = overallStatus === 'healthy' ? 200 : 
                       overallStatus === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(response);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * Readiness probe (for Kubernetes)
 * GET /health/ready
 */
router.get('/ready', async (req, res) => {
  try {
    // Check critical dependencies
    const [dbCheck, redisCheck] = await Promise.all([
      checkDatabase(),
      checkRedis(),
    ]);

    const isReady = dbCheck.status === 'healthy' && 
                    (redisCheck.status === 'healthy' || redisCheck.status === 'unknown');

    if (isReady) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: dbCheck.status,
          redis: redisCheck.status,
        },
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: dbCheck.status,
          redis: redisCheck.status,
        },
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * Liveness probe (for Kubernetes)
 * GET /health/live
 */
router.get('/live', async (req, res) => {
  try {
    const appCheck = await checkApplication();
    
    if (appCheck.status === 'healthy') {
      res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: 'not alive',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Metrics endpoint for Prometheus
 * GET /health/metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const [
      appCheck,
      dbCheck,
      redisCheck,
      memoryCheck,
    ] = await Promise.all([
      checkApplication(),
      checkDatabase(),
      checkRedis(),
      checkMemory(),
    ]);

    const metrics = [
      '# HELP trm_health_status Health status (1=healthy, 0=unhealthy)',
      '# TYPE trm_health_status gauge',
      `trm_health_status{component="application"} ${appCheck.status === 'healthy' ? 1 : 0}`,
      `trm_health_status{component="database"} ${dbCheck.status === 'healthy' ? 1 : 0}`,
      `trm_health_status{component="redis"} ${redisCheck.status === 'healthy' ? 1 : 0}`,
      '',
      '# HELP trm_health_response_time Response time in milliseconds',
      '# TYPE trm_health_response_time gauge',
      `trm_health_response_time{component="application"} ${appCheck.responseTime}`,
      `trm_health_response_time{component="database"} ${dbCheck.responseTime}`,
      `trm_health_response_time{component="redis"} ${redisCheck.responseTime}`,
      '',
      '# HELP trm_memory_usage_bytes Memory usage in bytes',
      '# TYPE trm_memory_usage_bytes gauge',
      `trm_memory_usage_bytes{type="rss"} ${process.memoryUsage().rss}`,
      `trm_memory_usage_bytes{type="heap_used"} ${process.memoryUsage().heapUsed}`,
      `trm_memory_usage_bytes{type="heap_total"} ${process.memoryUsage().heapTotal}`,
      '',
      '# HELP trm_uptime_seconds Process uptime in seconds',
      '# TYPE trm_uptime_seconds counter',
      `trm_uptime_seconds ${process.uptime()}`,
    ];

    res.set('Content-Type', 'text/plain');
    res.send(metrics.join('\n'));
  } catch (error) {
    res.status(500).send(`# ERROR: ${error.message}`);
  }
});

module.exports = router;
