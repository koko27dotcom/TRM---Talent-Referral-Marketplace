/**
 * Health Check Routes
 * Provides health check endpoints for monitoring and load balancers
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { isRedisConnected } = require('../config/redis');
const os = require('os');

/**
 * Basic health check - Liveness probe
 * Returns 200 if the application is running
 */
router.get('/', async (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * Detailed health check - Readiness probe
 * Checks database, Redis, and other critical services
 */
router.get('/ready', async (req, res) => {
  const checks = {
    database: false,
    redis: false,
    memory: false,
  };

  let statusCode = 200;
  const details = {};

  // Check database connection
  try {
    checks.database = mongoose.connection.readyState === 1;
    details.database = {
      status: checks.database ? 'connected' : 'disconnected',
      host: mongoose.connection.host,
      name: mongoose.connection.name,
    };
  } catch (error) {
    details.database = { status: 'error', message: error.message };
    statusCode = 503;
  }

  // Check Redis connection
  try {
    checks.redis = isRedisConnected();
    details.redis = {
      status: checks.redis ? 'connected' : 'disconnected',
    };
  } catch (error) {
    details.redis = { status: 'error', message: error.message };
    statusCode = 503;
  }

  // Check memory usage
  const usedMemory = process.memoryUsage();
  const totalMemory = os.totalmem();
  const memoryUsagePercent = (usedMemory.heapUsed / totalMemory) * 100;
  
  checks.memory = memoryUsagePercent < 90;
  details.memory = {
    status: checks.memory ? 'ok' : 'critical',
    used: Math.round(usedMemory.heapUsed / 1024 / 1024) + 'MB',
    total: Math.round(totalMemory / 1024 / 1024) + 'MB',
    percentage: memoryUsagePercent.toFixed(2) + '%',
  };

  if (!checks.memory) {
    statusCode = 503;
  }

  const allHealthy = Object.values(checks).every(check => check === true);

  res.status(statusCode).json({
    success: allHealthy,
    status: allHealthy ? 'ready' : 'not ready',
    timestamp: new Date().toISOString(),
    checks,
    details,
  });
});

/**
 * Liveness probe for Kubernetes
 */
router.get('/live', async (req, res) => {
  res.status(200).json({
    success: true,
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Startup probe for Kubernetes
 */
router.get('/startup', async (req, res) => {
  const checks = {
    server: true,
    database: mongoose.connection.readyState === 1,
  };

  const allStarted = Object.values(checks).every(check => check === true);

  res.status(allStarted ? 200 : 503).json({
    success: allStarted,
    status: allStarted ? 'started' : 'starting',
    timestamp: new Date().toISOString(),
    checks,
  });
});

/**
 * Deep health check with performance metrics
 */
router.get('/deep', async (req, res) => {
  const startTime = Date.now();
  const checks = {};
  const metrics = {
    responseTime: 0,
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    uptime: process.uptime(),
  };

  // Database check with query
  try {
    const dbStart = Date.now();
    await mongoose.connection.db.admin().ping();
    checks.database = {
      status: 'healthy',
      responseTime: Date.now() - dbStart,
    };
  } catch (error) {
    checks.database = { status: 'unhealthy', error: error.message };
  }

  // Redis check
  try {
    checks.redis = {
      status: isRedisConnected() ? 'healthy' : 'unhealthy',
    };
  } catch (error) {
    checks.redis = { status: 'unhealthy', error: error.message };
  }

  metrics.responseTime = Date.now() - startTime;

  const allHealthy = Object.values(checks).every(
    check => check.status === 'healthy'
  );

  res.status(allHealthy ? 200 : 503).json({
    success: allHealthy,
    status: allHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks,
    metrics,
  });
});

module.exports = router;
