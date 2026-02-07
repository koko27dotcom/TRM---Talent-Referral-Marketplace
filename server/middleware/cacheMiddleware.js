/**
 * Cache Middleware
 * Response caching middleware for TRM API
 * Features: Route-based caching, cache invalidation, conditional caching, cache headers
 */

const cacheService = require('../services/cacheService.js');
const crypto = require('crypto');

// Configuration
const CONFIG = {
  // Default cache durations (in seconds)
  SHORT_CACHE: 60,      // 1 minute
  MEDIUM_CACHE: 300,    // 5 minutes
  LONG_CACHE: 3600,     // 1 hour
  
  // Cache key prefix
  CACHE_KEY_PREFIX: 'api:',
  
  // Skip caching for these content types
  SKIP_CONTENT_TYPES: [
    'application/octet-stream',
    'multipart/form-data',
  ],
  
  // Skip caching for these status codes
  SKIP_STATUS_CODES: [201, 204, 400, 401, 403, 404, 500, 502, 503, 504],
  
  // Methods that trigger cache invalidation
  INVALIDATING_METHODS: ['POST', 'PUT', 'PATCH', 'DELETE'],
  
  // Minimum response size to cache (bytes)
  MIN_RESPONSE_SIZE: 100,
  
  // Maximum response size to cache (bytes) - 10MB
  MAX_RESPONSE_SIZE: 10 * 1024 * 1024,
};

/**
 * Generate cache key from request
 * @param {Object} req - Express request object
 * @returns {string} Cache key
 */
const generateCacheKey = (req) => {
  const parts = [
    CONFIG.CACHE_KEY_PREFIX,
    req.method,
    req.originalUrl || req.url,
  ];
  
  // Include user ID if authenticated (for user-specific caching)
  if (req.user && req.user._id) {
    parts.push(`user:${req.user._id}`);
  }
  
  // Include API key if present
  if (req.apiKey && req.apiKey.key) {
    parts.push(`api:${req.apiKey.key}`);
  }
  
  // Create hash for query params consistency
  const queryString = JSON.stringify(req.query);
  if (queryString !== '{}') {
    const queryHash = crypto
      .createHash('md5')
      .update(queryString)
      .digest('hex')
      .substring(0, 8);
    parts.push(`q:${queryHash}`);
  }
  
  return parts.join(':');
};

/**
 * Determine if request should be cached
 * @param {Object} req - Express request object
 * @param {Object} options - Cache options
 * @returns {boolean} Whether to cache
 */
const shouldCache = (req, options = {}) => {
  // Skip if caching disabled
  if (options.enabled === false) {
    return false;
  }
  
  // Only cache GET requests by default
  if (req.method !== 'GET') {
    return false;
  }
  
  // Skip if no-cache header present
  const cacheControl = req.headers['cache-control'];
  if (cacheControl && (cacheControl.includes('no-cache') || cacheControl.includes('no-store'))) {
    return false;
  }
  
  // Skip if Pragma: no-cache
  if (req.headers.pragma === 'no-cache') {
    return false;
  }
  
  // Skip authenticated requests unless explicitly allowed
  if (req.user && !options.cacheAuthenticated) {
    return false;
  }
  
  // Skip private routes
  if (options.skipPrivate !== false && isPrivateRoute(req)) {
    return false;
  }
  
  // Skip if custom skip function returns true
  if (options.skip && options.skip(req)) {
    return false;
  }
  
  return true;
};

/**
 * Check if route is private/sensitive
 * @param {Object} req - Express request object
 * @returns {boolean} Whether route is private
 */
const isPrivateRoute = (req) => {
  const privatePatterns = [
    /\/auth\//,
    /\/admin\//,
    /\/api\/v\d+\/auth/,
    /\/api\/v\d+\/admin/,
    /\/api\/v\d+\/users\/me/,
    /\/api\/v\d+\/payouts/,
    /\/api\/v\d+\/billing/,
    /\/api\/v\d+\/kyc/,
    /\/api\/v\d+\/settings/,
  ];
  
  const url = req.originalUrl || req.url;
  return privatePatterns.some(pattern => pattern.test(url));
};

/**
 * Invalidate cache by pattern
 * @param {string} pattern - Pattern to match (supports * wildcard)
 * @returns {Promise<Object>} Number of entries invalidated
 */
const invalidateCache = async (pattern) => {
  const fullPattern = `${CONFIG.CACHE_KEY_PREFIX}${pattern}`;
  return await cacheService.invalidateByPattern(fullPattern);
};

/**
 * Set cache control headers
 * @param {Object} res - Express response object
 * @param {number} duration - Cache duration in seconds
 * @param {Object} options - Additional options
 */
const setCacheHeaders = (res, duration, options = {}) => {
  if (options.noCache) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return;
  }
  
  const directives = [];
  
  if (options.private) {
    directives.push('private');
  } else {
    directives.push('public');
  }
  
  directives.push(`max-age=${duration}`);
  
  if (options.staleWhileRevalidate) {
    directives.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
  }
  
  if (options.immutable) {
    directives.push('immutable');
  }
  
  res.setHeader('Cache-Control', directives.join(', '));
  
  // Set Expires header
  const expires = new Date(Date.now() + duration * 1000);
  res.setHeader('Expires', expires.toUTCString());
  
  // Set Vary header to indicate what affects caching
  const varyHeaders = ['Accept-Encoding'];
  if (options.vary) {
    varyHeaders.push(...options.vary);
  }
  res.setHeader('Vary', varyHeaders.join(', '));
};

/**
 * Cache middleware factory
 * @param {number} duration - Cache duration in seconds
 * @param {Object} options - Cache options
 * @returns {Function} Express middleware
 */
const cache = (duration = CONFIG.MEDIUM_CACHE, options = {}) => {
  return async (req, res, next) => {
    // Check if request should be cached
    if (!shouldCache(req, options)) {
      // Set no-cache headers for uncacheable requests
      setCacheHeaders(res, 0, { noCache: true });
      return next();
    }
    
    const cacheKey = generateCacheKey(req);
    
    try {
      // Try to get cached response
      const cached = await cacheService.get(cacheKey);
      
      if (cached && cached.body && !options.skipCache) {
        // Set cache headers indicating cache hit
        setCacheHeaders(res, duration, options);
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);
        
        // Restore cached headers
        if (cached.headers) {
          Object.entries(cached.headers).forEach(([key, value]) => {
            if (key !== 'x-cache' && key !== 'x-cache-key') {
              res.setHeader(key, value);
            }
          });
        }
        
        // Send cached response
        return res.status(cached.statusCode || 200).send(cached.body);
      }
      
      // Set cache headers for cache miss
      setCacheHeaders(res, duration, options);
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('X-Cache-Key', cacheKey);
      
      // Store original methods
      const originalSend = res.send.bind(res);
      const originalJson = res.json.bind(res);
      const originalStatus = res.status.bind(res);
      
      let statusCode = 200;
      let responseBody = null;
      let responseHeaders = {};
      
      // Override status method
      res.status = (code) => {
        statusCode = code;
        return originalStatus(code);
      };
      
      // Capture headers
      const captureHeaders = () => {
        const headers = res.getHeaders();
        responseHeaders = {};
        Object.entries(headers).forEach(([key, value]) => {
          responseHeaders[key] = value;
        });
      };
      
      // Override send method
      res.send = (body) => {
        responseBody = body;
        captureHeaders();
        
        // Cache the response if appropriate
        if (shouldCacheResponse(statusCode, body, options)) {
          const cacheData = {
            body,
            statusCode,
            headers: responseHeaders,
            timestamp: Date.now(),
          };
          
          cacheService.set(cacheKey, cacheData, {
            l1Ttl: Math.min(duration, 60),
            l2Ttl: duration,
            tags: options.tags || ['api', 'response'],
          }).catch(err => {
            console.error('Cache set error:', err);
          });
        }
        
        return originalSend(body);
      };
      
      // Override json method
      res.json = (body) => {
        responseBody = body;
        captureHeaders();
        
        // Cache the response if appropriate
        if (shouldCacheResponse(statusCode, body, options)) {
          const cacheData = {
            body,
            statusCode,
            headers: responseHeaders,
            timestamp: Date.now(),
          };
          
          cacheService.set(cacheKey, cacheData, {
            l1Ttl: Math.min(duration, 60),
            l2Ttl: duration,
            tags: options.tags || ['api', 'response'],
          }).catch(err => {
            console.error('Cache set error:', err);
          });
        }
        
        return originalJson(body);
      };
      
      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      // Continue without caching on error
      next();
    }
  };
};

/**
 * Determine if response should be cached
 * @param {number} statusCode - HTTP status code
 * @param {*} body - Response body
 * @param {Object} options - Cache options
 * @returns {boolean} Whether to cache
 */
const shouldCacheResponse = (statusCode, body, options) => {
  // Skip excluded status codes
  if (CONFIG.SKIP_STATUS_CODES.includes(statusCode)) {
    return false;
  }
  
  // Only cache successful responses
  if (statusCode < 200 || statusCode >= 300) {
    return false;
  }
  
  // Skip if no body
  if (!body) {
    return false;
  }
  
  // Check response size
  const bodySize = Buffer.isBuffer(body) 
    ? body.length 
    : JSON.stringify(body).length;
  
  if (bodySize < CONFIG.MIN_RESPONSE_SIZE || bodySize > CONFIG.MAX_RESPONSE_SIZE) {
    return false;
  }
  
  // Custom validation
  if (options.validate && !options.validate(body)) {
    return false;
  }
  
  return true;
};

/**
 * Cache invalidation middleware
 * Invalidates cache on modifying requests
 * @param {Object} options - Invalidation options
 * @returns {Function} Express middleware
 */
const cacheInvalidator = (options = {}) => {
  const patterns = options.patterns || [];
  const tags = options.tags || [];
  
  return async (req, res, next) => {
    // Only run on modifying methods
    if (!CONFIG.INVALIDATING_METHODS.includes(req.method)) {
      return next();
    }
    
    // Store original end method
    const originalEnd = res.end.bind(res);
    
    res.end = async (...args) => {
      // Only invalidate on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          // Invalidate by patterns
          for (const pattern of patterns) {
            await invalidateCache(pattern);
          }
          
          // Invalidate by tags
          for (const tag of tags) {
            await cacheService.invalidateByTag(tag);
          }
          
          // Invalidate by URL pattern if specified
          if (options.invalidateUrl) {
            const urlPattern = req.originalUrl || req.url;
            await invalidateCache(`*${urlPattern}*`);
          }
          
          if (options.onInvalidate) {
            options.onInvalidate(req, res);
          }
        } catch (error) {
          console.error('Cache invalidation error:', error);
        }
      }
      
      return originalEnd(...args);
    };
    
    next();
  };
};

// Predefined cache middleware instances
const cacheMiddleware = {
  /**
   * Short cache (1 minute) - for frequently changing data
   */
  short: (options = {}) => cache(CONFIG.SHORT_CACHE, options),
  
  /**
   * Medium cache (5 minutes) - for semi-static data
   */
  medium: (options = {}) => cache(CONFIG.MEDIUM_CACHE, options),
  
  /**
   * Long cache (1 hour) - for static data
   */
  long: (options = {}) => cache(CONFIG.LONG_CACHE, options),
  
  /**
   * Custom duration cache
   */
  custom: (duration, options = {}) => cache(duration, options),
  
  /**
   * No cache - explicitly disable caching
   */
  none: () => (req, res, next) => {
    setCacheHeaders(res, 0, { noCache: true });
    next();
  },
};

// Default export
module.exports = {
  cache,
  generateCacheKey,
  shouldCache,
  invalidateCache,
  cacheInvalidator,
  cacheMiddleware,
};
