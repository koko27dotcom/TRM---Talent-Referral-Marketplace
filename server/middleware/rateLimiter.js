const Redis = require('ioredis');

// Initialize Redis client if available
let redis = null;
try {
  if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL);
  }
} catch (error) {
  console.warn('Redis not available, using in-memory rate limiting');
}

// In-memory store for rate limiting (fallback when Redis is not available)
const memoryStore = new Map();

/**
 * Rate limiter configuration
 */
const defaultConfig = {
  // Default limits
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60,
  
  // Key generator function
  keyGenerator: (req) => {
    return req.apiKey?.key || req.ip;
  },
  
  // Skip successful requests from counting
  skipSuccessfulRequests: false,
  
  // Custom handler when rate limit is exceeded
  handler: (req, res, next, options) => {
    res.status(429).json({
      error: {
        code: 'rate_limit_exceeded',
        message: 'Too many requests, please try again later.',
        type: 'rate_limit_error',
        retry_after: Math.ceil(options.windowMs / 1000)
      }
    });
  },
  
  // Custom key prefix
  keyPrefix: 'ratelimit:'
};

/**
 * In-memory rate limiter
 */
class MemoryRateLimiter {
  constructor(config) {
    this.config = { ...defaultConfig, ...config };
    this.store = memoryStore;
    
    // Cleanup old entries periodically
    setInterval(() => this.cleanup(), this.config.windowMs);
  }
  
  async check(key) {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const storeKey = `${this.config.keyPrefix}${key}`;
    
    let entry = this.store.get(storeKey);
    
    if (!entry) {
      entry = {
        requests: [],
        resetAt: new Date(now + this.config.windowMs)
      };
      this.store.set(storeKey, entry);
    }
    
    // Remove old requests outside the window
    entry.requests = entry.requests.filter(timestamp => timestamp > windowStart);
    
    const currentRequests = entry.requests.length;
    const allowed = currentRequests < this.config.maxRequests;
    
    if (allowed) {
      entry.requests.push(now);
    }
    
    return {
      allowed,
      limit: this.config.maxRequests,
      remaining: Math.max(0, this.config.maxRequests - currentRequests - (allowed ? 1 : 0)),
      resetAt: entry.resetAt,
      current: currentRequests + (allowed ? 1 : 0)
    };
  }
  
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetAt.getTime() < now) {
        this.store.delete(key);
      }
    }
  }
}

/**
 * Redis-based rate limiter
 */
class RedisRateLimiter {
  constructor(config) {
    this.config = { ...defaultConfig, ...config };
    this.redis = redis;
  }
  
  async check(key) {
    const storeKey = `${this.config.keyPrefix}${key}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    
    // Use Redis sorted set for sliding window
    const pipeline = this.redis.pipeline();
    
    // Remove old entries
    pipeline.zremrangebyscore(storeKey, 0, windowStart);
    
    // Count current entries
    pipeline.zcard(storeKey);
    
    // Add current request
    pipeline.zadd(storeKey, now, `${now}-${Math.random()}`);
    
    // Set expiry on the key
    pipeline.pexpire(storeKey, this.config.windowMs);
    
    const results = await pipeline.exec();
    const currentRequests = results[1][1];
    
    const allowed = currentRequests <= this.config.maxRequests;
    const resetAt = new Date(now + this.config.windowMs);
    
    return {
      allowed,
      limit: this.config.maxRequests,
      remaining: Math.max(0, this.config.maxRequests - currentRequests),
      resetAt,
      current: currentRequests
    };
  }
}

/**
 * Create rate limiter instance
 */
const createRateLimiter = (config = {}) => {
  if (redis) {
    return new RedisRateLimiter(config);
  }
  return new MemoryRateLimiter(config);
};

/**
 * Express middleware for rate limiting
 */
const rateLimiter = (config = {}) => {
  const limiter = createRateLimiter(config);
  
  return async (req, res, next) => {
    try {
      const key = config.keyGenerator ? config.keyGenerator(req) : defaultConfig.keyGenerator(req);
      const result = await limiter.check(key);
      
      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', result.limit);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', Math.floor(result.resetAt.getTime() / 1000));
      
      if (!result.allowed) {
        return config.handler 
          ? config.handler(req, res, next, config)
          : defaultConfig.handler(req, res, next, config);
      }
      
      // Store rate limit info on request
      req.rateLimitInfo = result;
      
      next();
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Fail open - allow request if rate limiter fails
      next();
    }
  };
};

/**
 * Predefined rate limiters for different use cases
 */
const rateLimiters = {
  // Strict limiter for authentication endpoints
  strict: rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    keyPrefix: 'ratelimit:strict:'
  }),
  
  // Standard API rate limiter
  standard: rateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
    keyPrefix: 'ratelimit:standard:'
  }),
  
  // Generous limiter for authenticated users
  generous: rateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 120,
    keyPrefix: 'ratelimit:generous:'
  }),
  
  // Webhook limiter
  webhook: rateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    keyPrefix: 'ratelimit:webhook:'
  }),
  
  // Burst limiter for high-traffic scenarios
  burst: rateLimiter({
    windowMs: 1000, // 1 second
    maxRequests: 10,
    keyPrefix: 'ratelimit:burst:'
  })
};

/**
 * Dynamic rate limiter based on API key configuration
 */
const dynamicRateLimiter = async (req, res, next) => {
  try {
    const apiKey = req.apiKey;
    
    if (!apiKey) {
      // No API key, use default strict limits
      return rateLimiters.standard(req, res, next);
    }
    
    // Use API key specific limits
    const config = {
      windowMs: 60 * 1000, // 1 minute window
      maxRequests: apiKey.rateLimit?.requestsPerMinute || 60,
      keyGenerator: () => `apikey:${apiKey.key}`,
      keyPrefix: 'ratelimit:apikey:'
    };
    
    const limiter = createRateLimiter(config);
    const key = config.keyGenerator();
    const result = await limiter.check(key);
    
    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', result.limit);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', Math.floor(result.resetAt.getTime() / 1000));
    
    if (!result.allowed) {
      return res.status(429).json({
        error: {
          code: 'rate_limit_exceeded',
          message: `Rate limit exceeded. Limit: ${result.limit} requests per minute.`,
          type: 'rate_limit_error',
          retry_after: Math.ceil(config.windowMs / 1000)
        }
      });
    }
    
    req.rateLimitInfo = result;
    next();
  } catch (error) {
    console.error('Dynamic rate limiter error:', error);
    next();
  }
};

/**
 * Skip rate limiting for certain conditions
 */
const skipRateLimit = (conditions) => {
  return (req, res, next) => {
    for (const condition of conditions) {
      if (condition(req)) {
        return next();
      }
    }
    // Continue to rate limiter
    next('route');
  };
};

module.exports = {
  rateLimiter,
  rateLimiters,
  dynamicRateLimiter,
  createRateLimiter,
  MemoryRateLimiter,
  RedisRateLimiter,
  skipRateLimit
};
