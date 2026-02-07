/**
 * PerformanceMonitorService
 * Application performance metrics collection for TRM
 * Tracks response times, throughput, error rates, resource usage for DataDog/New Relic integration
 */

const { EventEmitter } = require('events');
const os = require('os');
const cacheService = require('./cacheService.js');
const connectionPoolService = require('./connectionPool.js');

// Configuration
const CONFIG = {
  // Collection intervals
  METRICS_FLUSH_INTERVAL: parseInt(process.env.METRICS_FLUSH_INTERVAL, 10) || 60000, // 1 minute
  RESOURCE_CHECK_INTERVAL: parseInt(process.env.RESOURCE_CHECK_INTERVAL, 10) || 30000, // 30 seconds
  
  // Percentile calculation window
  PERCENTILE_WINDOW_SIZE: parseInt(process.env.PERCENTILE_WINDOW_SIZE, 10) || 10000,
  
  // Metric retention (number of data points)
  MAX_METRICS_HISTORY: parseInt(process.env.MAX_METRICS_HISTORY, 10) || 1440, // 24 hours at 1 min intervals
  
  // Error sampling rate
  ERROR_SAMPLE_RATE: parseFloat(process.env.ERROR_SAMPLE_RATE) || 1.0,
  
  // Service identification
  SERVICE_NAME: process.env.SERVICE_NAME || 'trm-api',
  ENVIRONMENT: process.env.NODE_ENV || 'development',
  HOSTNAME: os.hostname(),
};

/**
 * Circular buffer for efficient metric storage
 */
class CircularBuffer {
  constructor(size) {
    this.size = size;
    this.buffer = new Array(size);
    this.index = 0;
    this.count = 0;
  }

  push(value) {
    this.buffer[this.index] = value;
    this.index = (this.index + 1) % this.size;
    if (this.count < this.size) {
      this.count++;
    }
  }

  getAll() {
    if (this.count < this.size) {
      return this.buffer.slice(0, this.count);
    }
    return this.buffer.slice(this.index).concat(this.buffer.slice(0, this.index));
  }

  clear() {
    this.buffer = new Array(this.size);
    this.index = 0;
    this.count = 0;
  }

  getCount() {
    return this.count;
  }
}

/**
 * Histogram for percentile calculations
 */
class Histogram {
  constructor(maxSize = 10000) {
    this.values = new CircularBuffer(maxSize);
    this.maxSize = maxSize;
  }

  record(value) {
    this.values.push(value);
  }

  getPercentile(p) {
    const sorted = this.values.getAll().sort((a, b) => a - b);
    if (sorted.length === 0) return 0;
    
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  getMean() {
    const values = this.values.getAll();
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  getMin() {
    const values = this.values.getAll();
    if (values.length === 0) return 0;
    return Math.min(...values);
  }

  getMax() {
    const values = this.values.getAll();
    if (values.length === 0) return 0;
    return Math.max(...values);
  }

  getCount() {
    return this.values.getCount();
  }

  clear() {
    this.values.clear();
  }
}

/**
 * Counter metric type
 */
class Counter {
  constructor() {
    this.value = 0;
    this.history = new CircularBuffer(CONFIG.MAX_METRICS_HISTORY);
  }

  increment(amount = 1) {
    this.value += amount;
  }

  get() {
    return this.value;
  }

  snapshot() {
    const snapshot = this.value;
    this.history.push({ timestamp: Date.now(), value: snapshot });
    return snapshot;
  }

  getRate(timeWindowMs = 60000) {
    const history = this.history.getAll();
    if (history.length < 2) return 0;
    
    const now = Date.now();
    const recent = history.filter(h => now - h.timestamp <= timeWindowMs);
    if (recent.length < 2) return 0;
    
    const first = recent[0];
    const last = recent[recent.length - 1];
    const timeDiff = last.timestamp - first.timestamp;
    
    if (timeDiff === 0) return 0;
    return (last.value - first.value) / (timeDiff / 1000);
  }

  reset() {
    this.value = 0;
    this.history.clear();
  }
}

/**
 * Gauge metric type
 */
class Gauge {
  constructor() {
    this.value = 0;
    this.history = new CircularBuffer(CONFIG.MAX_METRICS_HISTORY);
  }

  set(value) {
    this.value = value;
    this.history.push({ timestamp: Date.now(), value });
  }

  get() {
    return this.value;
  }

  getHistory(timeWindowMs = 60000) {
    const now = Date.now();
    return this.history.getAll().filter(h => now - h.timestamp <= timeWindowMs);
  }

  getAverage(timeWindowMs = 60000) {
    const history = this.getHistory(timeWindowMs);
    if (history.length === 0) return 0;
    return history.reduce((sum, h) => sum + h.value, 0) / history.length;
  }

  reset() {
    this.value = 0;
    this.history.clear();
  }
}

/**
 * Timer for measuring durations
 */
class Timer {
  constructor() {
    this.startTimes = new Map();
    this.histogram = new Histogram(CONFIG.PERCENTILE_WINDOW_SIZE);
  }

  start(name) {
    this.startTimes.set(name, process.hrtime.bigint());
  }

  end(name) {
    const startTime = this.startTimes.get(name);
    if (!startTime) return null;
    
    const duration = Number(process.hrtime.bigint() - startTime) / 1000000; // Convert to ms
    this.startTimes.delete(name);
    this.histogram.record(duration);
    return duration;
  }

  record(duration) {
    this.histogram.record(duration);
  }

  getPercentile(p) {
    return this.histogram.getPercentile(p);
  }

  getMean() {
    return this.histogram.getMean();
  }

  getMin() {
    return this.histogram.getMin();
  }

  getMax() {
    return this.histogram.getMax();
  }

  getCount() {
    return this.histogram.getCount();
  }

  reset() {
    this.startTimes.clear();
    this.histogram.clear();
  }
}

/**
 * PerformanceMonitorService
 * Main service for collecting and managing performance metrics
 */
class PerformanceMonitorService extends EventEmitter {
  constructor() {
    super();
    
    // HTTP metrics
    this.httpRequests = new Counter();
    this.httpErrors = new Counter();
    this.httpDurations = new Timer();
    this.endpointMetrics = new Map(); // endpoint -> { counter, timer }
    
    // Database metrics
    this.dbQueries = new Counter();
    this.dbErrors = new Counter();
    this.dbDurations = new Timer();
    
    // Cache metrics
    this.cacheHits = new Counter();
    this.cacheMisses = new Counter();
    
    // System metrics
    this.cpuUsage = new Gauge();
    this.memoryUsage = new Gauge();
    this.eventLoopLag = new Gauge();
    
    // Custom metrics
    this.counters = new Map();
    this.gauges = new Map();
    this.timers = new Map();
    
    // Error tracking
    this.errors = new CircularBuffer(1000);
    
    // Collection state
    this.isCollecting = false;
    this.collectionInterval = null;
    this.resourceInterval = null;
    
    // Throughput tracking
    this.requestTimestamps = new CircularBuffer(10000);
    
    // Bind methods
    this.collectResourceMetrics = this.collectResourceMetrics.bind(this);
  }

  // ==================== HTTP Request Metrics ====================

  /**
   * Record HTTP request metrics
   * @param {number} duration - Request duration in milliseconds
   * @param {number} statusCode - HTTP status code
   * @param {string} endpoint - Request endpoint/path
   * @param {string} method - HTTP method
   */
  recordRequest(duration, statusCode, endpoint, method) {
    // Record total requests
    this.httpRequests.increment();
    this.requestTimestamps.push(Date.now());
    
    // Record duration
    this.httpDurations.record(duration);
    
    // Record errors (4xx and 5xx)
    if (statusCode >= 400) {
      this.httpErrors.increment();
    }
    
    // Record endpoint-specific metrics
    const key = `${method}:${endpoint}`;
    if (!this.endpointMetrics.has(key)) {
      this.endpointMetrics.set(key, {
        counter: new Counter(),
        timer: new Timer(),
        errors: new Counter(),
      });
    }
    
    const metrics = this.endpointMetrics.get(key);
    metrics.counter.increment();
    metrics.timer.record(duration);
    
    if (statusCode >= 400) {
      metrics.errors.increment();
    }
    
    this.emit('requestRecorded', {
      duration,
      statusCode,
      endpoint,
      method,
      timestamp: new Date().toISOString(),
    });
  }

  // ==================== Database Metrics ====================

  /**
   * Record database query metrics
   * @param {number} duration - Query duration in milliseconds
   * @param {string} collection - Collection/table name
   * @param {string} operation - Operation type (find, insert, update, delete, aggregate)
   */
  recordDatabaseQuery(duration, collection, operation) {
    this.dbQueries.increment();
    this.dbDurations.record(duration);
    
    this.emit('dbQueryRecorded', {
      duration,
      collection,
      operation,
      timestamp: new Date().toISOString(),
    });
  }

  // ==================== Cache Metrics ====================

  /**
   * Record cache operation metrics
   * @param {string} operation - Operation type (get, set, delete)
   * @param {boolean} hit - Whether it was a cache hit
   */
  recordCacheOperation(operation, hit) {
    if (hit) {
      this.cacheHits.increment();
    } else {
      this.cacheMisses.increment();
    }
    
    this.emit('cacheOperationRecorded', {
      operation,
      hit,
      timestamp: new Date().toISOString(),
    });
  }

  // ==================== Error Tracking ====================

  /**
   * Record error with context
   * @param {Error} error - Error object
   * @param {Object} context - Error context (endpoint, operation, etc.)
   */
  recordError(error, context = {}) {
    // Sample errors if sampling rate is less than 1
    if (Math.random() > CONFIG.ERROR_SAMPLE_RATE) {
      return;
    }
    
    const errorRecord = {
      message: error.message,
      stack: error.stack,
      type: error.name,
      context,
      timestamp: new Date().toISOString(),
    };
    
    this.errors.push(errorRecord);
    
    this.emit('errorRecorded', errorRecord);
  }

  // ==================== Custom Metrics ====================

  /**
   * Start a timer for custom metrics
   * @param {string} name - Timer name
   */
  startTimer(name) {
    if (!this.timers.has(name)) {
      this.timers.set(name, new Timer());
    }
    this.timers.get(name).start(name);
  }

  /**
   * End timer and record duration
   * @param {string} name - Timer name
   * @param {Object} tags - Optional tags
   * @returns {number|null} Duration in milliseconds
   */
  endTimer(name, tags = {}) {
    const timer = this.timers.get(name);
    if (!timer) return null;
    
    const duration = timer.end(name);
    
    this.emit('timerEnded', { name, duration, tags });
    
    return duration;
  }

  /**
   * Increment a counter
   * @param {string} name - Counter name
   * @param {number} value - Amount to increment (default: 1)
   * @param {Object} tags - Optional tags
   */
  incrementCounter(name, value = 1, tags = {}) {
    if (!this.counters.has(name)) {
      this.counters.set(name, new Counter());
    }
    
    this.counters.get(name).increment(value);
    
    this.emit('counterIncremented', { name, value, tags });
  }

  /**
   * Record a gauge value
   * @param {string} name - Gauge name
   * @param {number} value - Value to record
   * @param {Object} tags - Optional tags
   */
  recordGauge(name, value, tags = {}) {
    if (!this.gauges.has(name)) {
      this.gauges.set(name, new Gauge());
    }
    
    this.gauges.get(name).set(value);
    
    this.emit('gaugeRecorded', { name, value, tags });
  }

  // ==================== Resource Monitoring ====================

  /**
   * Collect system resource metrics
   */
  collectResourceMetrics() {
    // CPU usage
    const cpuUsage = process.cpuUsage();
    const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
    this.cpuUsage.set(cpuPercent);
    
    // Memory usage
    const memUsage = process.memoryUsage();
    this.memoryUsage.set(memUsage.heapUsed);
    
    // Event loop lag
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to ms
      this.eventLoopLag.set(lag);
    });
    
    this.emit('resourceMetricsCollected', {
      cpu: cpuPercent,
      memory: memUsage,
      timestamp: new Date().toISOString(),
    });
  }

  // ==================== Metric Retrieval ====================

  /**
   * Get all collected metrics
   * @returns {Object} Complete metrics snapshot
   */
  getMetrics() {
    const cacheStats = cacheService.getStats();
    const poolStats = connectionPoolService.getPoolStats();
    
    const totalCacheRequests = this.cacheHits.get() + this.cacheMisses.get();
    const cacheHitRate = totalCacheRequests > 0 
      ? (this.cacheHits.get() / totalCacheRequests) 
      : 0;
    
    return {
      timestamp: new Date().toISOString(),
      service: {
        name: CONFIG.SERVICE_NAME,
        environment: CONFIG.ENVIRONMENT,
        hostname: CONFIG.HOSTNAME,
        pid: process.pid,
        uptime: process.uptime(),
      },
      http: {
        requests: {
          total: this.httpRequests.get(),
          rate: this.getRequestsPerSecond(),
        },
        errors: {
          total: this.httpErrors.get(),
          rate: this.httpRequests.get() > 0 
            ? (this.httpErrors.get() / this.httpRequests.get()) 
            : 0,
        },
        duration: {
          p50: this.httpDurations.getPercentile(50),
          p95: this.httpDurations.getPercentile(95),
          p99: this.httpDurations.getPercentile(99),
          mean: this.httpDurations.getMean(),
          min: this.httpDurations.getMin(),
          max: this.httpDurations.getMax(),
        },
      },
      database: {
        queries: {
          total: this.dbQueries.get(),
        },
        duration: {
          p50: this.dbDurations.getPercentile(50),
          p95: this.dbDurations.getPercentile(95),
          p99: this.dbDurations.getPercentile(99),
          mean: this.dbDurations.getMean(),
        },
        connectionPool: poolStats,
      },
      cache: {
        hits: this.cacheHits.get(),
        misses: this.cacheMisses.get(),
        hitRate: cacheHitRate,
        stats: cacheStats,
      },
      system: {
        cpu: {
          usage: this.cpuUsage.get(),
          loadAvg: os.loadavg(),
        },
        memory: {
          used: this.memoryUsage.get(),
          total: os.totalmem(),
          free: os.freemem(),
          percentUsed: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2),
        },
        eventLoop: {
          lag: this.eventLoopLag.get(),
        },
      },
      endpoints: this.getEndpointMetrics(),
      custom: {
        counters: this.getCustomCounters(),
        gauges: this.getCustomGauges(),
      },
    };
  }

  /**
   * Get health check metrics
   * @returns {Object} Health status
   */
  getHealthMetrics() {
    const metrics = this.getMetrics();
    const cacheHealth = cacheService.getHealth();
    const poolHealth = connectionPoolService.getHealth();
    
    // Determine overall health
    let status = 'healthy';
    const checks = [];
    
    // Check error rate
    const errorRate = metrics.http.errors.rate;
    if (errorRate > 0.1) {
      status = 'critical';
      checks.push({ check: 'error_rate', status: 'critical', value: errorRate });
    } else if (errorRate > 0.05) {
      status = status === 'healthy' ? 'degraded' : status;
      checks.push({ check: 'error_rate', status: 'warning', value: errorRate });
    }
    
    // Check response time
    const p95Latency = metrics.http.duration.p95;
    if (p95Latency > 5000) {
      status = 'critical';
      checks.push({ check: 'latency_p95', status: 'critical', value: p95Latency });
    } else if (p95Latency > 1000) {
      status = status === 'healthy' ? 'degraded' : status;
      checks.push({ check: 'latency_p95', status: 'warning', value: p95Latency });
    }
    
    // Check memory
    const memPercent = parseFloat(metrics.system.memory.percentUsed);
    if (memPercent > 90) {
      status = 'critical';
      checks.push({ check: 'memory', status: 'critical', value: memPercent });
    } else if (memPercent > 80) {
      status = status === 'healthy' ? 'degraded' : status;
      checks.push({ check: 'memory', status: 'warning', value: memPercent });
    }
    
    // Check event loop lag
    const lag = metrics.system.eventLoop.lag;
    if (lag > 100) {
      status = 'critical';
      checks.push({ check: 'event_loop_lag', status: 'critical', value: lag });
    } else if (lag > 50) {
      status = status === 'healthy' ? 'degraded' : status;
      checks.push({ check: 'event_loop_lag', status: 'warning', value: lag });
    }
    
    // Check cache
    if (cacheHealth.status === 'degraded') {
      status = status === 'healthy' ? 'degraded' : status;
      checks.push({ check: 'cache', status: 'warning', details: cacheHealth });
    }
    
    // Check connection pool
    if (poolHealth.status !== 'healthy') {
      status = poolHealth.status === 'critical' ? 'critical' : 
               (status === 'healthy' ? 'degraded' : status);
      checks.push({ check: 'connection_pool', status: poolHealth.status, details: poolHealth });
    }
    
    return {
      status,
      timestamp: new Date().toISOString(),
      service: metrics.service,
      checks: checks.length > 0 ? checks : [{ check: 'all', status: 'healthy' }],
      metrics: {
        errorRate,
        p95Latency,
        memoryPercent: memPercent,
        eventLoopLag: lag,
      },
    };
  }

  /**
   * Get requests per second
   * @param {number} windowSeconds - Time window in seconds
   * @returns {number} Requests per second
   */
  getRequestsPerSecond(windowSeconds = 60) {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const timestamps = this.requestTimestamps.getAll();
    const recent = timestamps.filter(t => now - t <= windowMs);
    
    return recent.length / windowSeconds;
  }

  /**
   * Get endpoint-specific metrics
   * @returns {Object} Endpoint metrics
   */
  getEndpointMetrics() {
    const endpoints = {};
    
    for (const [key, metrics] of this.endpointMetrics) {
      const [method, ...pathParts] = key.split(':');
      const path = pathParts.join(':');
      
      const total = metrics.counter.get();
      const errors = metrics.errors.get();
      
      endpoints[key] = {
        method,
        path,
        requests: total,
        errors: errors,
        errorRate: total > 0 ? (errors / total) : 0,
        duration: {
          p50: metrics.timer.getPercentile(50),
          p95: metrics.timer.getPercentile(95),
          p99: metrics.timer.getPercentile(99),
          mean: metrics.timer.getMean(),
        },
      };
    }
    
    return endpoints;
  }

  /**
   * Get custom counter metrics
   * @returns {Object} Counter values
   */
  getCustomCounters() {
    const counters = {};
    for (const [name, counter] of this.counters) {
      counters[name] = {
        value: counter.get(),
        rate: counter.getRate(),
      };
    }
    return counters;
  }

  /**
   * Get custom gauge metrics
   * @returns {Object} Gauge values
   */
  getCustomGauges() {
    const gauges = {};
    for (const [name, gauge] of this.gauges) {
      gauges[name] = {
        current: gauge.get(),
        average: gauge.getAverage(),
      };
    }
    return gauges;
  }

  // ==================== DataDog Export ====================

  /**
   * Export metrics in DataDog format
   * @returns {Array} DataDog-formatted metrics
   */
  exportForDataDog() {
    const metrics = this.getMetrics();
    const timestamp = Math.floor(Date.now() / 1000);
    const tags = [
      `service:${CONFIG.SERVICE_NAME}`,
      `environment:${CONFIG.ENVIRONMENT}`,
      `hostname:${CONFIG.HOSTNAME}`,
    ];
    
    const ddMetrics = [];
    
    // HTTP metrics
    ddMetrics.push({
      metric: 'trm.http.requests.total',
      points: [[timestamp, metrics.http.requests.total]],
      type: 'count',
      tags,
    });
    
    ddMetrics.push({
      metric: 'trm.http.requests.per_second',
      points: [[timestamp, metrics.http.requests.rate]],
      type: 'gauge',
      tags,
    });
    
    ddMetrics.push({
      metric: 'trm.http.errors.total',
      points: [[timestamp, metrics.http.errors.total]],
      type: 'count',
      tags,
    });
    
    ddMetrics.push({
      metric: 'trm.http.errors.rate',
      points: [[timestamp, metrics.http.errors.rate]],
      type: 'gauge',
      tags,
    });
    
    // Latency percentiles
    ['p50', 'p95', 'p99'].forEach(p => {
      ddMetrics.push({
        metric: `trm.http.duration.${p}`,
        points: [[timestamp, metrics.http.duration[p]]],
        type: 'gauge',
        tags,
      });
    });
    
    // Database metrics
    ddMetrics.push({
      metric: 'trm.db.queries.total',
      points: [[timestamp, metrics.database.queries.total]],
      type: 'count',
      tags,
    });
    
    ['p50', 'p95', 'p99'].forEach(p => {
      ddMetrics.push({
        metric: `trm.db.duration.${p}`,
        points: [[timestamp, metrics.database.duration[p]]],
        type: 'gauge',
        tags,
      });
    });
    
    // Cache metrics
    ddMetrics.push({
      metric: 'trm.cache.hits',
      points: [[timestamp, metrics.cache.hits]],
      type: 'count',
      tags,
    });
    
    ddMetrics.push({
      metric: 'trm.cache.misses',
      points: [[timestamp, metrics.cache.misses]],
      type: 'count',
      tags,
    });
    
    ddMetrics.push({
      metric: 'trm.cache.hit_rate',
      points: [[timestamp, metrics.cache.hitRate]],
      type: 'gauge',
      tags,
    });
    
    // System metrics
    ddMetrics.push({
      metric: 'trm.system.cpu.usage',
      points: [[timestamp, metrics.system.cpu.usage]],
      type: 'gauge',
      tags,
    });
    
    ddMetrics.push({
      metric: 'trm.system.memory.usage',
      points: [[timestamp, metrics.system.memory.used]],
      type: 'gauge',
      tags,
    });
    
    ddMetrics.push({
      metric: 'trm.system.memory.percent',
      points: [[timestamp, parseFloat(metrics.system.memory.percentUsed)]],
      type: 'gauge',
      tags,
    });
    
    ddMetrics.push({
      metric: 'trm.system.event_loop.lag',
      points: [[timestamp, metrics.system.eventLoop.lag]],
      type: 'gauge',
      tags,
    });
    
    // Endpoint metrics
    for (const [key, endpoint] of Object.entries(metrics.endpoints)) {
      const endpointTags = [...tags, `endpoint:${key}`, `method:${endpoint.method}`];
      
      ddMetrics.push({
        metric: 'trm.endpoint.requests',
        points: [[timestamp, endpoint.requests]],
        type: 'count',
        tags: endpointTags,
      });
      
      ddMetrics.push({
        metric: 'trm.endpoint.errors',
        points: [[timestamp, endpoint.errors]],
        type: 'count',
        tags: endpointTags,
      });
      
      ddMetrics.push({
        metric: 'trm.endpoint.duration.p95',
        points: [[timestamp, endpoint.duration.p95]],
        type: 'gauge',
        tags: endpointTags,
      });
    }
    
    return ddMetrics;
  }

  // ==================== New Relic Export ====================

  /**
   * Export metrics in New Relic format
   * @returns {Object} New Relic-formatted metrics
   */
  exportForNewRelic() {
    const metrics = this.getMetrics();
    const timestamp = Date.now();
    
    return {
      name: CONFIG.SERVICE_NAME,
      hostname: CONFIG.HOSTNAME,
      environment: CONFIG.ENVIRONMENT,
      pid: process.pid,
      timestamp,
      metrics: {
        // HTTP metrics
        'HttpDispatcher': {
          count: metrics.http.requests.total,
        },
        'HttpError': {
          count: metrics.http.errors.total,
        },
        'WebTransactionTotalTime': {
          total: metrics.http.duration.mean * metrics.http.requests.total,
          count: metrics.http.requests.total,
          min: metrics.http.duration.min,
          max: metrics.http.duration.max,
          sumOfSquares: Math.pow(metrics.http.duration.mean, 2) * metrics.http.requests.total,
        },
        'WebTransaction': {
          total: metrics.http.duration.mean * metrics.http.requests.total,
          count: metrics.http.requests.total,
          min: metrics.http.duration.min,
          max: metrics.http.duration.max,
          sumOfSquares: Math.pow(metrics.http.duration.mean, 2) * metrics.http.requests.total,
        },
        // Database metrics
        'Database/all': {
          total: metrics.database.duration.mean * metrics.database.queries.total,
          count: metrics.database.queries.total,
        },
        // Memory
        'Memory/Heap/Used': {
          value: metrics.system.memory.used,
        },
        'Memory/Physical': {
          value: metrics.system.memory.total - metrics.system.memory.free,
        },
        // CPU
        'CPU/User Time': {
          value: metrics.system.cpu.usage,
        },
        // Custom metrics
        'Custom/trm/cache/hit_rate': {
          value: metrics.cache.hitRate,
        },
        'Custom/trm/cache/hits': {
          count: metrics.cache.hits,
        },
        'Custom/trm/cache/misses': {
          count: metrics.cache.misses,
        },
        'Custom/trm/event_loop_lag': {
          value: metrics.system.eventLoop.lag,
        },
        'Custom/trm/requests_per_second': {
          value: metrics.http.requests.rate,
        },
      },
      // Transaction traces for endpoints
      transaction_traces: Object.entries(metrics.endpoints).map(([key, endpoint]) => ({
        name: key,
        duration: endpoint.duration.mean,
        throughput: endpoint.requests,
        error_rate: endpoint.errorRate,
        apdex: this.calculateApdex(endpoint.duration.p95),
      })),
    };
  }

  /**
   * Calculate Apdex score
   * @param {number} p95Latency - 95th percentile latency
   * @returns {number} Apdex score (0-1)
   */
  calculateApdex(p95Latency) {
    // Simplified Apdex: satisfied if < 500ms, tolerating if < 2000ms
    const T = 500; // Threshold in ms
    if (p95Latency <= T) return 1.0;
    if (p95Latency <= 4 * T) return 0.5;
    return 0.0;
  }

  // ==================== Lifecycle Methods ====================

  /**
   * Start automatic metric collection
   */
  startCollection() {
    if (this.isCollecting) {
      return;
    }
    
    this.isCollecting = true;
    
    // Start resource metrics collection
    this.collectResourceMetrics();
    this.resourceInterval = setInterval(
      this.collectResourceMetrics,
      CONFIG.RESOURCE_CHECK_INTERVAL
    );
    
    // Start periodic snapshots
    this.collectionInterval = setInterval(() => {
      this.httpRequests.snapshot();
      this.httpErrors.snapshot();
      this.dbQueries.snapshot();
      this.cacheHits.snapshot();
      this.cacheMisses.snapshot();
      
      this.emit('metricsSnapshot', this.getMetrics());
    }, CONFIG.METRICS_FLUSH_INTERVAL);
    
    this.emit('collectionStarted');
    console.log('Performance monitoring started');
  }

  /**
   * Stop automatic collection
   */
  stopCollection() {
    if (!this.isCollecting) {
      return;
    }
    
    this.isCollecting = false;
    
    if (this.resourceInterval) {
      clearInterval(this.resourceInterval);
      this.resourceInterval = null;
    }
    
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
    
    this.emit('collectionStopped');
    console.log('Performance monitoring stopped');
  }

  /**
   * Reset all metrics (useful for testing)
   */
  resetMetrics() {
    // Reset HTTP metrics
    this.httpRequests.reset();
    this.httpErrors.reset();
    this.httpDurations.reset();
    this.endpointMetrics.clear();
    
    // Reset DB metrics
    this.dbQueries.reset();
    this.dbErrors.reset();
    this.dbDurations.reset();
    
    // Reset cache metrics
    this.cacheHits.reset();
    this.cacheMisses.reset();
    
    // Reset system metrics
    this.cpuUsage.reset();
    this.memoryUsage.reset();
    this.eventLoopLag.reset();
    
    // Reset custom metrics
    this.counters.clear();
    this.gauges.clear();
    this.timers.clear();
    
    // Reset error tracking
    this.errors.clear();
    this.requestTimestamps.clear();
    
    this.emit('metricsReset');
  }
}

// Export singleton instance
const performanceMonitorService = new PerformanceMonitorService();
module.exports = performanceMonitorService;
  PerformanceMonitorService, 
  CircularBuffer, 
  Histogram, 
  Counter, 
  Gauge, 
  Timer,
};