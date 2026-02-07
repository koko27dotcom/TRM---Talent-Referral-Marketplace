/**
 * Enhanced Rate Limiter Middleware
 * Tiered rate limiting with Redis-backed sliding window
 * Supports anonymous, authenticated, premium, and admin tiers
 * Includes endpoint-specific limits and custom headers
 */

const Redis = require('ioredis');
const { rateLimit } = require('../config/security.js');

// Initialize Redis client
let redis = null;
let redisAvailable = false;

if (rateLimit.redis.enabled && rateLimit.redis.url) {
  try {
    redis = new Redis(rateLimit.redis.url, {
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: 3,
    });

    redis.on('connect', () => {
      console.log('Rate limiter connected to Redis');
      redisAvailable = true;
    });

    redis.on('error', (err) => {
      console.warn('Redis connection error, falling back to memory store:', err.message);
      redisAvailable = false;
    });
  } catch (error) {
    console.warn('Failed to initialize Redis:', error.message);
  }
}

// In-memory store fallback
const memoryStore = new Map();

/**
 * Clean up expired entries from memory store
 */
const cleanupMemoryStore = () => {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (entry.resetTime < now) {
      memoryStore.delete(key);
    }
  }
};

// Run cleanup every minute
setInterval(cleanupMemoryStore, 60000);

/**
 * Get user tier based on authentication and role
 * @param {Object} req - Express request object
 * @returns {string} User tier
 */
const getUserTier = (req) => {
  // Check for internal service bypass
  if (req.headers['x-internal-service'] === process.env.INTERNAL_SERVICE_KEY) {
    return 'internal';
  }

  // Check for admin bypass
  if (req.user?.role === 'platform_admin' && req.headers['x-admin-bypass'] === 'true') {
    return 'internal';
  }

  // Check if user is authenticated
  if (!req.user) {
    return 'anonymous';
  }

  // Check user role for tier assignment
  if (req.user.role === 'platform_admin') {
    return 'admin';
  }

  // Check subscription tier
  if (req.user.subscription?.tier === 'premium' || req.user.subscription?.tier === 'enterprise') {
    return 'premium';
  }

  return 'authenticated';
};

/**
 * Generate rate limit key
 * @param {Object} req - Express request object
 * @param {string} tier - User tier
 * @param {string} endpointType - Endpoint type
 * @returns {string} Rate limit key
 */
const generateKey = (req, tier, endpointType = 'default') => {
  const identifier = req.user?._id?.toString() ||
    req.apiKey?.key ||
    req.ip ||
    req.connection?.remoteAddress ||
    'unknown';

  const path = req.route?.path || req.path || 'unknown';

  return `${rateLimit.redis.keyPrefix}${tier}:${endpointType}:${identifier}:${path}`;
};

/**
 * Check if request should skip rate limiting
 * @param {Object} req - Express request object
 * @returns {boolean}
 */
const shouldSkip = (req) => {
  // Skip for health checks
  if (req.path === '/health' || req.path === '/api/v1/health') {
    return true;
  }

  // Skip for specific user agents
  const userAgent = req.headers['user-agent'] || '';
  if (rateLimit.skip.userAgents.some(ua => userAgent.toLowerCase().includes(ua))) {
    return true;
  }

  // Skip for whitelisted IPs
  const clientIp = req.ip || req.connection?.remoteAddress;
  if (rateLimit.skip.internalIPs.includes(clientIp)) {
    return true;
  }

  // Skip for whitelisted API keys
  const apiKey = req.headers['x-api-key'];
  if (apiKey && rateLimit.skip.apiKeys.includes(apiKey)) {
    return true;
  }

  return false;
};

/**
 * Redis-based sliding window rate limit check
 * @param {string} key - Rate limit key
 * @param {number} limit - Request limit
 * @param {number} windowMs - Window duration in milliseconds
 * @returns {Promise<Object>} Rate limit info
 */
const checkRedisLimit = async (key, limit, windowMs) => {
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    // Use Redis sorted set for sliding window
    const multi = redis.multi();

    // Remove old entries outside the window
    multi.zremrangebyscore(key, 0, windowStart);

    // Count current entries
    multi.zcard(key);

    // Add current request
    multi.zadd(key, now, `${now}-${Math.random()}`);

    // Set expiration on the key
    multi.pexpire(key, windowMs);

    const results = await multi.exec();
    const currentCount = results[1][1];

    const remaining = Math.max(0, limit - currentCount - 1);
    const resetTime = now + windowMs;

    return {
      allowed: currentCount < limit,
      limit,
      remaining,
      resetTime,
      current: currentCount + 1,
    };
  } catch (error) {
    console.error('Redis rate limit error:', error);
    // Fallback to allowing the request
    return { allowed: true, limit, remaining: limit - 1, resetTime: now + windowMs, current: 1 };
  }
};

/**
 * Memory-based sliding window rate limit check
 * @param {string} key - Rate limit key
 * @param {number} limit - Request limit
 * @param {number} windowMs - Window duration in milliseconds
 * @returns {Object} Rate limit info
 */
const checkMemoryLimit = (key, limit, windowMs) => {
  const now = Date.now();
  const windowStart = now - windowMs;

  let entry = memoryStore.get(key);

  if (!entry) {
    entry = {
      requests: [],
      resetTime: now + windowMs,
    };
    memoryStore.set(key, entry);
  }

  // Remove old requests outside the window
  entry.requests = entry.requests.filter(timestamp => timestamp > windowStart);

  // Update reset time if window has passed
  if (now > entry.resetTime) {
    entry.resetTime = now + windowMs;
    entry.requests = [];
  }

  const currentCount = entry.requests.length;
  const allowed = currentCount < limit;

  if (allowed) {
    entry.requests.push(now);
  }

  return {
    allowed,
    limit,
    remaining: Math.max(0, limit - currentCount - (allowed ? 1 : 0)),
    resetTime: entry.resetTime,
    current: currentCount + (allowed ? 1 : 0),
  };
};

/**
 * Get endpoint-specific rate limit configuration
 * @param {string} path - Request path
 * @param {string} method - HTTP method
 * @returns {Object} Rate limit config
 */
const getEndpointConfig = (path, method) => {
  // Authentication endpoints
  if (path.includes('/auth/login')) {
    return rateLimit.endpoints.auth.login;
  }
  if (path.includes('/auth/register')) {
    return rateLimit.endpoints.auth.register;
  }
  if (path.includes('/auth/forgot-password')) {
    return rateLimit.endpoints.auth.forgotPassword;
  }
  if (path.includes('/auth/reset-password')) {
    return rateLimit.endpoints.auth.resetPassword;
  }
  if (path.includes('/auth/verify')) {
    return rateLimit.endpoints.auth.verifyEmail;
  }
  if (path.includes('/auth/refresh')) {
    return rateLimit.endpoints.auth.refreshToken;
  }

  // Payment endpoints
  if (path.includes('/payments') || path.includes('/billing')) {
    if (method === 'POST') {
      return rateLimit.endpoints.payments.create;
    }
    return rateLimit.endpoints.payments.confirm;
  }

  // Webhook endpoints
  if (path.includes('/webhooks')) {
    return rateLimit.endpoints.webhooks.default;
  }

  // Scraping endpoints
  if (path.includes('/scraping') || path.includes('/cv')) {
    return rateLimit.endpoints.scraping.default;
  }

  // Search endpoints
  if (path.includes('/search')) {
    return rateLimit.endpoints.api.search;
  }

  // Export endpoints
  if (path.includes('/export')) {
    return rateLimit.endpoints.api.export;
  }

  // Bulk endpoints
  if (path.includes('/bulk')) {
    return rateLimit.endpoints.api.bulk;
  }

  return rateLimit.endpoints.api.default;
};

/**
 * Enhanced rate limiter middleware factory
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware
 */
const createRateLimiter = (options = {}) => {
  const {
    tier: forcedTier = null,
    endpointType = null,
    customLimit = null,
    customWindow = null,
    skipSuccessfulRequests = false,
    keyGenerator = null,
    handler = null,
  } = options;

  return async (req, res, next) => {
    try {
      // Check if we should skip rate limiting
      if (shouldSkip(req)) {
        return next();
      }

      // Determine user tier
      const tier = forcedTier || getUserTier(req);
      const tierConfig = rateLimit.tiers[tier];

      // Check if tier should skip rate limiting
      if (tierConfig.skipLimit) {
        return next();
      }

      // Get endpoint-specific limits
      let limit = customLimit || tierConfig.maxRequests;
      let windowMs = customWindow || tierConfig.windowMs;

      if (endpointType) {
        const endpointConfig = getEndpointConfig(req.path, req.method);
        if (endpointConfig) {
          limit = endpointConfig.maxRequests;
          windowMs = endpointConfig.windowMs;
        }
      }

      // Generate rate limit key
      const key = keyGenerator ? keyGenerator(req) : generateKey(req, tier, endpointType);

      // Check rate limit
      let result;
      if (redisAvailable && redis) {
        result = await checkRedisLimit(key, limit, windowMs);
      } else {
        result = checkMemoryLimit(key, limit, windowMs);
      }

      // Set rate limit headers
      res.setHeader(rateLimit.headers.limit, result.limit);
      res.setHeader(rateLimit.headers.remaining, result.remaining);
      res.setHeader(rateLimit.headers.reset, Math.ceil(result.resetTime / 1000));
      res.setHeader(rateLimit.headers.tier, tier);

      // Attach rate limit info to request
      req.rateLimit = result;

      if (!result.allowed) {
        // Log rate limit exceeded
        console.warn(`Rate limit exceeded: ${key} (${tier})`);

        // Set retry-after header
        const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
        res.setHeader(rateLimit.headers.retryAfter, retryAfter);

        // Custom handler or default response
        if (handler) {
          return handler(req, res, next, { limit, windowMs, retryAfter });
        }

        return res.status(429).json({
          error: {
            code: 'rate_limit_exceeded',
            message: 'Too many requests, please try again later.',
            type: 'rate_limit_error',
            retry_after: retryAfter,
            limit: result.limit,
            tier,
          },
        });
      }

      // Track successful requests if needed
      if (!skipSuccessfulRequests) {
        res.on('finish', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            // Request was successful, already counted
          }
        });
      }

      next();
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Allow request on error to prevent blocking legitimate traffic
      next();
    }
  };
};

/**
 * Pre-configured rate limiters for common use cases
 */
const rateLimiters = {
  // Anonymous users
  anonymous: createRateLimiter({ tier: 'anonymous' }),

  // Authenticated users
  authenticated: createRateLimiter({ tier: 'authenticated' }),

  // Premium users
  premium: createRateLimiter({ tier: 'premium' }),

  // Admin users
  admin: createRateLimiter({ tier: 'admin' }),

  // Authentication endpoints (strict)
  auth: createRateLimiter({
    endpointType: 'auth',
    handler: (req, res, next, options) => {
      res.status(429).json({
        error: {
          code: 'auth_rate_limit_exceeded',
          message: 'Too many authentication attempts. Please try again later.',
          type: 'rate_limit_error',
          retry_after: options.retryAfter,
        },
      });
    },
  }),

  // API endpoints
  api: createRateLimiter({ tier: 'authenticated' }),

  // Payment endpoints (strict)
  payment: createRateLimiter({
    endpointType: 'payment',
    customLimit: 5,
    customWindow: 60000,
  }),

  // Webhook endpoints (generous)
  webhook: createRateLimiter({
    endpointType: 'webhook',
    customLimit: 1000,
    customWindow: 60000,
  }),

  // Scraping endpoints (strict)
  scraping: createRateLimiter({
    endpointType: 'scraping',
    customLimit: 10,
    customWindow: 60000,
  }),
};

/**
 * Dynamic rate limiter based on user tier
 * Automatically applies appropriate limits based on authentication
 */
const dynamicRateLimiter = async (req, res, next) => {
  const tier = getUserTier(req);

  switch (tier) {
    case 'internal':
      return next();
    case 'admin':
      return rateLimiters.admin(req, res, next);
    case 'premium':
      return rateLimiters.premium(req, res, next);
    case 'authenticated':
      return rateLimiters.authenticated(req, res, next);
    default:
      return rateLimiters.anonymous(req, res, next);
  }
};

/**
 * Get current rate limit status for a key
 * @param {string} key - Rate limit key
 * @returns {Promise<Object>} Rate limit status
 */
const getRateLimitStatus = async (key) => {
  const fullKey = `${rateLimit.redis.keyPrefix}${key}`;

  if (redisAvailable && redis) {
    try {
      const count = await redis.zcard(fullKey);
      const ttl = await redis.pttl(fullKey);

      return {
        current: count,
        resetTime: Date.now() + ttl,
      };
    } catch (error) {
      console.error('Error getting rate limit status:', error);
    }
  }

  // Memory fallback
  const entry = memoryStore.get(fullKey);
  if (entry) {
    return {
      current: entry.requests.length,
      resetTime: entry.resetTime,
    };
  }

  return { current: 0, resetTime: Date.now() };
};

/**
 * Reset rate limit for a key
 * @param {string} key - Rate limit key
 * @returns {Promise<boolean>}
 */
const resetRateLimit = async (key) => {
  const fullKey = `${rateLimit.redis.keyPrefix}${key}`;

  if (redisAvailable && redis) {
    try {
      await redis.del(fullKey);
      return true;
    } catch (error) {
      console.error('Error resetting rate limit:', error);
    }
  }

  memoryStore.delete(fullKey);
  return true;
};

module.exports = {
  createRateLimiter,
  rateLimiters,
  dynamicRateLimiter,
  getRateLimitStatus,
  resetRateLimit,
  getUserTier,
  generateKey,
};
</parameter name="new_string">
</invoke>
