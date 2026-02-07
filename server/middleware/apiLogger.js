const APILog = require('../models/APILog');
const crypto = require('crypto');

/**
 * Generate unique request ID
 */
const generateRequestId = () => {
  return crypto.randomUUID();
};

/**
 * Extract relevant headers for logging
 */
const extractHeaders = (headers) => {
  const relevantHeaders = [
    'user-agent',
    'referer',
    'origin',
    'content-type',
    'accept',
    'accept-language',
    'x-forwarded-for',
    'x-forwarded-proto',
    'x-request-id'
  ];
  
  const extracted = {};
  for (const header of relevantHeaders) {
    if (headers[header]) {
      extracted[header] = headers[header];
    }
  }
  return extracted;
};

/**
 * Sanitize request body to remove sensitive data
 */
const sanitizeBody = (body) => {
  if (!body || typeof body !== 'object') return body;
  
  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'api_key',
    'apiKey',
    'credit_card',
    'creditCard',
    'cvv',
    'ssn',
    'authorization'
  ];
  
  const sanitized = { ...body };
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  // Handle nested objects
  for (const key of Object.keys(sanitized)) {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeBody(sanitized[key]);
    }
  }
  
  return sanitized;
};

/**
 * Get client IP address
 */
const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         req.ip;
};

/**
 * API Logger middleware
 * Logs all API requests and responses
 */
const apiLogger = async (req, res, next) => {
  // Only log API routes
  if (!req.path.startsWith('/api/')) {
    return next();
  }
  
  const requestId = generateRequestId();
  req.requestId = requestId;
  
  // Store original end function
  const originalEnd = res.end;
  const chunks = [];
  
  // Override res.end to capture response
  res.end = function(chunk, encoding) {
    if (chunk) {
      chunks.push(Buffer.from(chunk, encoding));
    }
    
    // Restore original end
    res.end = originalEnd;
    res.end(chunk, encoding);
    
    // Log the response after it's sent
    logResponse(req, res, requestId, Buffer.concat(chunks));
  };
  
  // Capture request start time
  req._startTime = Date.now();
  
  // Prepare request log data
  const requestLogData = {
    requestId,
    apiKey: req.apiKey?._id,
    apiKeyIdentifier: req.apiKey ? req.apiKey.key.substring(0, 16) + '...' : null,
    user: req.apiUser?._id || req.user?._id,
    company: req.apiCompany?._id || req.company?._id,
    method: req.method,
    path: req.path,
    fullUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
    query: req.query,
    headers: extractHeaders(req.headers),
    body: sanitizeBody(req.body),
    bodySize: req.headers['content-length'] ? parseInt(req.headers['content-length']) : 0,
    ipAddress: getClientIP(req),
    userAgent: req.headers['user-agent'],
    referrer: req.headers.referer || req.headers.origin,
    rateLimitInfo: req.rateLimitInfo ? {
      limit: req.rateLimitInfo.limit,
      remaining: req.rateLimitInfo.remaining,
      resetAt: req.rateLimitInfo.resetAt
    } : null,
    environment: process.env.NODE_ENV || 'production',
    version: req.path.match(/\/api\/(v\d+)\//)?.[1] || 'v1'
  };
  
  // Store for response logging
  req._logData = requestLogData;
  
  // Log request asynchronously (don't wait)
  APILog.logRequest(requestLogData).catch(err => {
    console.error('Failed to log API request:', err);
  });
  
  next();
};

/**
 * Log response after it's sent
 */
const logResponse = async (req, res, requestId, responseBody) => {
  if (!req._logData) return;
  
  const responseTime = Date.now() - req._startTime;
  
  // Try to parse JSON response
  let parsedBody = null;
  try {
    parsedBody = JSON.parse(responseBody.toString());
  } catch (e) {
    // Not JSON, store as string if small enough
    if (responseBody.length < 10000) {
      parsedBody = responseBody.toString();
    } else {
      parsedBody = '[Response too large]';
    }
  }
  
  const responseLogData = {
    statusCode: res.statusCode,
    responseBody: sanitizeBody(parsedBody),
    responseSize: responseBody.length,
    responseTime
  };
  
  // Update log with response
  APILog.logResponse(requestId, responseLogData).catch(err => {
    console.error('Failed to log API response:', err);
  });
};

/**
 * Error logger middleware
 * Logs API errors with additional context
 */
const errorLogger = (err, req, res, next) => {
  // Only log API routes
  if (!req.path.startsWith('/api/')) {
    return next(err);
  }
  
  const errorLog = {
    requestId: req.requestId,
    error: {
      message: err.message,
      stack: err.stack,
      code: err.code || err.statusCode
    }
  };
  
  // Update existing log if available
  if (req.requestId) {
    APILog.logResponse(req.requestId, {
      statusCode: err.statusCode || 500,
      error: errorLog.error
    }).catch(console.error);
  }
  
  next(err);
};

/**
 * Performance logger
 * Logs slow requests for monitoring
 */
const performanceLogger = (thresholdMs = 1000) => {
  return async (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      
      if (duration > thresholdMs) {
        console.warn(`Slow API request: ${req.method} ${req.path} took ${duration}ms`, {
          requestId: req.requestId,
          duration,
          apiKey: req.apiKey?._id,
          user: req.apiUser?._id
        });
      }
    });
    
    next();
  };
};

module.exports = {
  apiLogger,
  errorLogger,
  performanceLogger,
  generateRequestId,
  sanitizeBody
};
