/**
 * Monitoring Service
 * Provides application monitoring, metrics collection, and alerting
 */

const os = require('os');
const mongoose = require('mongoose');
const { isRedisConnected } = require('../config/redis');

class MonitoringService {
  constructor() {
    this.metrics = {
      requests: { total: 0, errors: 0 },
      responseTime: [],
      activeConnections: 0,
    };
    this.alerts = [];
    this.startTime = Date.now();
  }

  /**
   * Record API request metrics
   */
  recordRequest(method, path, statusCode, duration) {
    this.metrics.requests.total++;
    this.metrics.responseTime.push(duration);

    if (statusCode >= 400) {
      this.metrics.requests.errors++;
    }

    // Keep only last 1000 response times
    if (this.metrics.responseTime.length > 1000) {
      this.metrics.responseTime.shift();
    }
  }

  /**
   * Get current system metrics
   */
  getSystemMetrics() {
    const usedMemory = process.memoryUsage();
    
    return {
      memory: {
        used: Math.round(usedMemory.heapUsed / 1024 / 1024),
        total: Math.round(usedMemory.heapTotal / 1024 / 1024),
        rss: Math.round(usedMemory.rss / 1024 / 1024),
        external: Math.round(usedMemory.external / 1024 / 1024),
      },
      cpu: process.cpuUsage(),
      uptime: process.uptime(),
      loadAverage: os.loadavg(),
      freeMemory: Math.round(os.freemem() / 1024 / 1024),
      totalMemory: Math.round(os.totalmem() / 1024 / 1024),
    };
  }

  /**
   * Get database metrics
   */
  async getDatabaseMetrics() {
    try {
      const dbStats = await mongoose.connection.db.stats();
      
      return {
        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        host: mongoose.connection.host,
        database: mongoose.connection.name,
        collections: dbStats.collections,
        documents: dbStats.objects,
        dataSize: Math.round(dbStats.dataSize / 1024 / 1024),
        indexSize: Math.round(dbStats.indexSize / 1024 / 1024),
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
      };
    }
  }

  /**
   * Get API metrics
   */
  getAPIMetrics() {
    const responseTimes = this.metrics.responseTime;
    const sorted = [...responseTimes].sort((a, b) => a - b);
    
    return {
      requests: this.metrics.requests,
      responseTime: {
        avg: responseTimes.length > 0 
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
          : 0,
        min: sorted[0] || 0,
        max: sorted[sorted.length - 1] || 0,
        p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
        p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
        p99: sorted[Math.floor(sorted.length * 0.99)] || 0,
      },
      errorRate: this.metrics.requests.total > 0
        ? (this.metrics.requests.errors / this.metrics.requests.total) * 100
        : 0,
    };
  }

  /**
   * Get all metrics
   */
  async getAllMetrics() {
    return {
      timestamp: new Date().toISOString(),
      system: this.getSystemMetrics(),
      database: await this.getDatabaseMetrics(),
      redis: {
        status: isRedisConnected() ? 'connected' : 'disconnected',
      },
      api: this.getAPIMetrics(),
    };
  }

  /**
   * Check health status
   */
  async checkHealth() {
    const checks = {
      database: mongoose.connection.readyState === 1,
      redis: isRedisConnected(),
      memory: process.memoryUsage().heapUsed / os.totalmem() < 0.9,
    };

    const isHealthy = Object.values(checks).every(check => check === true);

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Add alert
   */
  addAlert(level, message, details = {}) {
    const alert = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      level, // 'info', 'warning', 'critical'
      message,
      details,
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };

    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }

    // Log alert
    console[level === 'critical' ? 'error' : 'warn']('[ALERT]', level, message, details);

    return alert;
  }

  /**
   * Get alerts
   */
  getAlerts(options = {}) {
    let alerts = this.alerts;

    if (options.level) {
      alerts = alerts.filter(a => a.level === options.level);
    }

    if (options.acknowledged !== undefined) {
      alerts = alerts.filter(a => a.acknowledged === options.acknowledged);
    }

    if (options.limit) {
      alerts = alerts.slice(-options.limit);
    }

    return alerts;
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date().toISOString();
    }
    return alert;
  }

  /**
   * Monitor thresholds and trigger alerts
   */
  async monitorThresholds() {
    const metrics = await this.getAllMetrics();
    const alerts = [];

    // Memory threshold
    const memoryUsagePercent = (metrics.system.memory.used / metrics.system.memory.total) * 100;
    if (memoryUsagePercent > 90) {
      alerts.push(this.addAlert('critical', 'High memory usage', {
        usage: memoryUsagePercent + '%',
      }));
    } else if (memoryUsagePercent > 75) {
      alerts.push(this.addAlert('warning', 'Elevated memory usage', {
        usage: memoryUsagePercent + '%',
      }));
    }

    // Error rate threshold
    if (metrics.api.errorRate > 5) {
      alerts.push(this.addAlert('critical', 'High error rate', {
        errorRate: metrics.api.errorRate.toFixed(2) + '%',
      }));
    } else if (metrics.api.errorRate > 2) {
      alerts.push(this.addAlert('warning', 'Elevated error rate', {
        errorRate: metrics.api.errorRate.toFixed(2) + '%',
      }));
    }

    // Response time threshold
    if (metrics.api.responseTime.p95 > 1000) {
      alerts.push(this.addAlert('warning', 'High response time', {
        p95: metrics.api.responseTime.p95 + 'ms',
      }));
    }

    // Database connection
    if (metrics.database.status !== 'connected') {
      alerts.push(this.addAlert('critical', 'Database connection issue', {
        status: metrics.database.status,
      }));
    }

    return alerts;
  }
}

// Singleton instance
const monitoringService = new MonitoringService();

module.exports = monitoringService;
