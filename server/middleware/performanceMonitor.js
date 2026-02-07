/**
 * Performance Monitor Middleware
 * Request timing and metrics collection middleware for TRM API
 * Features: Request timing, metrics recording, slow request detection, endpoint tracking
 */

const performanceMonitorService = require('../services/performanceMonitor.js');

// Configuration
const CONFIG = {
  // Slow request threshold (ms)
  SLOW_REQUEST_THRESHOLD: parseInt(process.env.SLOW_REQUEST_THRESHOLD, 10) || 1000,
  
  // Very slow request threshold (ms) - for critical alerts
  VERY_SLOW_REQUEST_THRESHOLD: parseInt(process.env.VERY_SLOW_REQUEST_THRESHOLD, 10) || 5000,
  
  // Header name for response time
  RESPONSE_TIME_HEADER: 'X-Response-Time',
  
  // Enable detailed endpoint tracking
  ENABLE_ENDPOINT_TRACKING: process.env.ENABLE_ENDPOINT_TRACKING !== 'false',
  
  // Skip monitoring for these paths
  SKIP_PATHS: [
    '/health',
    '/healthz',
    '/ping',
    '/metrics',
    '/favicon.ico',
    '/robots.txt',
  ],
  
  // Skip monitoring for these extensions
  SKIP_EXTENSIONS: [
    '.js',
    '.css',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.svg',
    '.ico',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
  ],
};

/**
 * Add response time header to response
 * @param {Object} res - Express response object
 * @param {number} duration - Request duration in milliseconds
 */
const addResponseTimeHeader = (res, duration) => {
  // Round to 2 decimal places for cleaner output
  const formattedDuration = Math.round(duration * 100) / 100;
  res.setHeader(CONFIG.RESPONSE_TIME_HEADER, `${formattedDuration}ms`);
};

/**
 * Log slow requests
 * @param {Object} req - Express request object
 * @param {number} duration - Request duration in milliseconds
 * @param {number} statusCode - HTTP status code
 */
const logSlowRequest = (req, duration, statusCode = 200) => {
  const isVerySlow = duration >= CONFIG.VERY_SLOW_REQUEST_THRESHOLD;
  const level = isVerySlow ? 'error' : 'warn';
  
  const logData = {
    type: 'slow_request',
    method: req.method,
    url: req.originalUrl || req.url,
    path: req.path,
    duration: `${duration.toFixed(2)}ms`,
    statusCode,
    userAgent: req.get('user-agent'),
    ip: req.ip || req.connection.remoteAddress,
    userId: req.user?._id || req.user?.id || null,
    timestamp: new Date().toISOString(),
    severity: isVerySlow ? 'critical' : 'warning',
  };
  
  // Log to console
  console[level](`[SLOW REQUEST] ${req.method} ${req.originalUrl} - ${duration.toFixed(2)}ms`, logData);
  
  // Record to performance monitor as error if very slow
  if (isVerySlow) {
    const error = new Error(`Very slow request: ${duration.toFixed(2)}ms`);
    error.name = 'SlowRequestError';
    performanceMonitorService.recordError(error, {
      endpoint: req.originalUrl,
      method: req.method,
      duration,
      statusCode,
    });
  }
};

/**
 * Track request metrics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {number} duration - Request duration in milliseconds
 */
const trackRequest = (req, res, duration) => {
  const statusCode = res.statusCode || 200;
  const endpoint = req.route?.path || req.path || req.originalUrl;
  const method = req.method;
  
  // Record to performance monitor service
  performanceMonitorService.recordRequest(duration, statusCode, endpoint, method);
  
  // Track additional metrics
  if (CONFIG.ENABLE_ENDPOINT_TRACKING) {
    // Track request size if available
    const requestSize = parseInt(req.get('content-length'), 10);
    if (requestSize > 0) {
      performanceMonitorService.recordGauge('request_size', requestSize, {
        endpoint,
        method,
      });
    }
    
    // Track response size if available
    const responseSize = parseInt(res.get('content-length'), 10);
    if (responseSize > 0) {
      performanceMonitorService.recordGauge('response_size', responseSize, {
        endpoint,
        method,
      });
    }
  }
};

/**
 * Check if request should be monitored
 * @param {Object} req - Express request object
 * @returns {boolean} Whether to monitor
 */
const shouldMonitor = (req) => {
  const url = req.originalUrl || req.url;
  
  // Skip health check endpoints
  if (CONFIG.SKIP_PATHS.some(path => url.startsWith(path))) {
    return false;
  }
  
  // Skip static file requests
  if (CONFIG.SKIP_EXTENSIONS.some(ext => url.toLowerCase().endsWith(ext))) {
    return false;
  }
  
  return true;
};

/**
 * Main performance monitor middleware
 * Tracks request timing and records metrics
 * @returns {Function} Express middleware
 */
const performanceMonitor = () => {
  return (req, res, next) => {
    // Skip monitoring if not applicable
    if (!shouldMonitor(req)) {
      return next();
    }
    
    // Record start time using high-resolution timer
    const startTime = process.hrtime.bigint();
    
    // Store start time on request for potential nested tracking
    req._performanceStartTime = startTime;
    
    // Track if response has finished
    let finished = false;
    
    // Function to calculate duration
    const getDuration = () => {
      const endTime = process.hrtime.bigint();
      return Number(endTime - startTime) / 1000000; // Convert to milliseconds
    };
    
    // Function to handle response finish
    const onFinish = () => {
      if (finished) return;
      finished = true;
      
      const duration = getDuration();
      const statusCode = res.statusCode || 200;
      
      // Add response time header
      addResponseTimeHeader(res, duration);
      
      // Track request metrics
      trackRequest(req, res, duration);
      
      // Log slow requests
      if (duration >= CONFIG.SLOW_REQUEST_THRESHOLD) {
        logSlowRequest(req, duration, statusCode);
      }
      
      // Clean up listeners
      res.removeListener('finish', onFinish);
      res.removeListener('close', onFinish);
      res.removeListener('error', onError);
    };
    
    // Handle errors
    const onError = (error) => {
      if (finished) return;
      finished = true;
      
      const duration = getDuration();
      
      // Record error
      performanceMonitorService.recordError(error, {
        endpoint: req.originalUrl,
        method: req.method,
        duration,
        statusCode: res.statusCode || 500,
      });
      
      // Clean up listeners
      res.removeListener('finish', onFinish);
      res.removeListener('close', onFinish);
      res.removeListener('error', onError);
    };
    
    // Attach listeners
    res.on('finish', onFinish);
    res.on('close', onFinish);
    res.on('error', onError);
    
    next();
  };
};

/**
 * Middleware to track database query performance
 * Use this to wrap database calls for detailed tracking
 * @param {string} operation - Operation name
 * @param {string} collection - Collection/table name
 * @returns {Function} Middleware function
 */
const trackDatabaseOperation = (operation, collection) => {
  return async (req, res, next) => {
    const startTime = process.hrtime.bigint();
    
    // Store original methods to wrap
    const originalNext = next;
    
    // Override next to capture timing
    res.on('finish', () => {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;
      
      performanceMonitorService.recordDatabaseQuery(duration, collection, operation);
    });
    
    originalNext();
  };
};

/**
 * Middleware to add performance headers
 * Adds various performance-related headers to responses
 * @returns {Function} Express middleware
 */
const performanceHeaders = () => {
  return (req, res, next) => {
    // Add server timing header support
    res.setHeader('Timing-Allow-Origin', '*');
    
    // Add performance server header
    res.setHeader('X-Performance-Monitoring', 'enabled');
    
    next();
  };
};

/**
 * Middleware to track memory usage per request
 * Useful for detecting memory leaks
 * @returns {Function} Express middleware
 */
const memoryTracker = () => {
  return (req, res, next) => {
    const startMemory = process.memoryUsage();
    
    res.on('finish', () => {
      const endMemory = process.memoryUsage();
      const heapDiff = endMemory.heapUsed - startMemory.heapUsed;
      
      // Log if significant memory increase
      if (heapDiff > 10 * 1024 * 1024) { // 10MB threshold
        console.warn('[MEMORY] Significant heap increase detected', {
          url: req.originalUrl,
          method: req.method,
          heapIncrease: `${(heapDiff / 1024 / 1024).toFixed(2)}MB`,
          timestamp: new Date().toISOString(),
        });
      }
    });
    
    next();
  };
};

/**
 * Create a timer for manual tracking within route handlers
 * @param {string} name - Timer name
 * @returns {Object} Timer object with start/end methods
 */
const createTimer = (name) => {
  return {
    start: () => {
      performanceMonitorService.startTimer(name);
    },
    end: (tags = {}) => {
      return performanceMonitorService.endTimer(name, tags);
    },
  };
};

/**
 * Middleware factory for tracking specific operations
 * @param {string} operationName - Name of the operation
 * @returns {Function} Express middleware
 */
const trackOperation = (operationName) => {
  return (req, res, next) => {
    const timer = createTimer(operationName);
    timer.start();
    
    res.on('finish', () => {
      timer.end({
        endpoint: req.originalUrl,
        method: req.method,
        statusCode: res.statusCode,
      });
    });
    
    next();
  };
};

// Default export with all middleware functions
module.exports = {
  performanceMonitor,
  trackRequest,
  addResponseTimeHeader,
  logSlowRequest,
  trackDatabaseOperation,
  performanceHeaders,
  memoryTracker,
  createTimer,
  trackOperation,
};
