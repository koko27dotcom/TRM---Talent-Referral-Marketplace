/**
 * Security Middleware Index
 * Central export point for all security middleware
 * Provides easy integration with Express applications
 */

// Rate limiting
const {
  createRateLimiter,
  rateLimiters,
  dynamicRateLimiter,
  getRateLimitStatus,
  resetRateLimit,
} = require('./enhancedRateLimiter.js');

// Security headers
const {
  enhancedSecurityHeaders,
  cspReportOnly,
  apiSecurityHeaders,
  staticSecurityHeaders,
} = require('./enhancedSecurityHeaders.js');

// Input validation
const {
  validateRequest,
  validateQuery,
  sanitizeRequestBody,
  detectSQLInjection,
  detectXSS,
  detectNoSQLInjection,
} = require('./inputValidation.js');

// API security
const {
  requireApiKey,
  validateRequestSignature,
  validateWebhookSignature,
  ipFilter,
  apiVersioning,
} = require('./apiSecurity.js');

// DDoS protection
const {
  requestSizeLimit,
  connectionLimit,
  slowlorisProtection,
  geographicBlock,
  challengeResponse,
  ddosProtection,
} = require('./ddosProtection.js');

// Legacy rate limiter (for backward compatibility)
const { standardRateLimiter } = require('./rateLimiter.js');

// Legacy security headers (for backward compatibility)
const securityHeaders = require('./securityHeaders.js');

/**
 * Apply all security middleware to Express app
 * @param {Object} app - Express application
 * @param {Object} options - Configuration options
 */
const applySecurityMiddleware = (app, options = {}) => {
  const {
    enableDDoS = true,
    enableRateLimit = true,
    enableHeaders = true,
    enableValidation = true,
    enableApiSecurity = true,
  } = options;

  // 1. DDoS Protection (first line of defense)
  if (enableDDoS) {
    app.use(ddosProtection());
  }

  // 2. Request size limits
  app.use(requestSizeLimit());

  // 3. Security headers
  if (enableHeaders) {
    app.use(enhancedSecurityHeaders());
  }

  // 4. Input sanitization
  if (enableValidation) {
    app.use(sanitizeRequestBody());
  }

  // 5. API versioning
  if (enableApiSecurity) {
    app.use(apiVersioning());
  }

  // 6. IP filtering
  if (enableApiSecurity) {
    app.use(ipFilter());
  }

  // 7. Rate limiting (applied per-route)
  // Note: Apply specific rate limiters to routes as needed

  console.log('Security middleware applied');
};

/**
 * Create security middleware stack for specific routes
 * @param {Object} options - Middleware options
 * @returns {Array} Array of middleware functions
 */
const createSecurityStack = (options = {}) => {
  const {
    rateLimit: rateLimitConfig = null,
    requireAuth = false,
    requireApiKey: apiKeyConfig = null,
    validateSignature = false,
  } = options;

  const stack = [
    requestSizeLimit(),
    sanitizeRequestBody(),
  ];

  if (rateLimitConfig) {
    if (typeof rateLimitConfig === 'string') {
      // Use predefined rate limiter
      stack.push(rateLimiters[rateLimitConfig] || dynamicRateLimiter);
    } else {
      // Create custom rate limiter
      stack.push(createRateLimiter(rateLimitConfig));
    }
  }

  if (apiKeyConfig) {
    const scopes = Array.isArray(apiKeyConfig) ? apiKeyConfig : [];
    stack.push(requireApiKey(scopes));
  }

  if (validateSignature) {
    stack.push(validateRequestSignature());
  }

  return stack;
};

module.exports = {
  // Rate limiting
  createRateLimiter,
  rateLimiters,
  dynamicRateLimiter,
  getRateLimitStatus,
  resetRateLimit,

  // Security headers
  enhancedSecurityHeaders,
  cspReportOnly,
  apiSecurityHeaders,
  staticSecurityHeaders,

  // Input validation
  validateRequest,
  validateQuery,
  sanitizeRequestBody,
  detectSQLInjection,
  detectXSS,
  detectNoSQLInjection,

  // API security
  requireApiKey,
  validateRequestSignature,
  validateWebhookSignature,
  ipFilter,
  apiVersioning,

  // DDoS protection
  requestSizeLimit,
  connectionLimit,
  slowlorisProtection,
  geographicBlock,
  challengeResponse,
  ddosProtection,

  // Legacy exports
  standardRateLimiter,
  securityHeaders,

  // Utilities
  applySecurityMiddleware,
  createSecurityStack,
};
