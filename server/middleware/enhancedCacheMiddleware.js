/**
 * Enhanced Cache Middleware
 * Advanced response caching with ETag support, conditional requests, and cache invalidation
 */

const crypto = require('crypto');
const enhancedCacheService = require('../services/enhancedCacheService.js');
const { keyHelpers } = require('../config/redis.js');
const performanceConfig = require('../config/performance.js');

const { cache: config } = performanceConfig;

// Configuration
const CACHE_CONFIG = {
  SHORT_CACHE: 60,      // 1 minute
  MEDIUM_CACHE: 300,    // 5 minutes
  LONG_CACHE: 3600,     // 1 hour
  STATIC_CACHE: 86400,  // 24 hours
  
  SKIP_METHODS: ['POST', 'PUT', 'PATCH', 'DELETE'],
  CACHEABLE_METHODS: ['GET', 'HEAD'],
  
  SKIP_STATUS_CODES: [201, 204, 400, 401, 403, 404, 500, 502, 503, 504],
  CACHEABLE_STATUS_CODES: [200, 203, 300, 301, 302, 307, 308, 410],
  
  MIN_RESPONSE_SIZE: 100,
  MAX_RESPONSE_SIZE: 10 * 1024 * 1024, // 10MB
  
  VARY_HEADERS: ['Accept', 'Accept-Encoding', 'Accept-Language', 'Authorization'],
};

/**
 * Generate cache key from request
 */
const generateCacheKey = (req, options = {}) => {
  const parts = [
    config.keyPrefix.api,
    req.method,
    req.originalUrl || req.url,
  ];
  
  // Include user ID if authenticated and user-specific caching enabled
  if (options.userSpecific && req.user && req.user._id) {
    parts.push(`user:${req.user._id}`);
  }
  
  // Include role for role-based caching
  if (options.roleBased && req.user && req.user.role) {
    parts.push(`role:${req.user.role}`);
  }
  
  // Include API key if present
  if (req.apiKey && req.apiKey.key) {
    parts.push(`api:${req.apiKey.key}`);
  }
  
  // Hash query parameters
  if (Object.keys(req.query).length > 0) {
    const queryHash = crypto
      .createHash('md5')
      .update(JSON.stringify(req.query))
      .digest('hex')
      .substring(0, 8);
    parts.push(`q:${queryHash}`);
  }
  
  return parts.join(':');
};

/**
 * Generate ETag for response
 */
const generateETag = (body) => {
  return crypto.createHash('md5').update(body).digest('hex');
};

/**
 * Check if request should be cached
 */
const shouldCache = (req, res, options = {}) => {
  // Skip if caching disabled
  if (options.enabled === false) {
    return false;
  }
  
  // Check method
  if (!CACHE_CONFIG.CACHEABLE_METHODS.includes(req.method)) {
    return false;
  }
  
  // Check cache-control headers
  const cacheControl = req.headers['cache-control'];
  if (cacheControl) {
    if (cacheControl.includes('no-cache') || 
        cacheControl.includes('no-store') ||
        cacheControl.includes('max-age=0')) {
      return false;
    }
  }
  
  // Check Pragma header
  if (req.headers.pragma === 'no-cache') {
    return false;
  }
  
  // Skip authenticated requests unless explicitly enabled
  if (req.user && !options.cacheAuthenticated) {
    return false;
  }
  
  return true;
};

/**
 * Check if response should be cached
 */
const shouldCacheResponse = (res, body) => {
  // Check status code
  if (CACHE_CONFIG.SKIP_STATUS_CODES.includes(res.statusCode)) {
    return false;
  }
  
  if (!CACHE_CONFIG.CACHEABLE_STATUS_CODES.includes(res.statusCode)) {
    return false;
  }
  
  // Check response size
  const size = Buffer.byteLength(body);
  if (size < CACHE_CONFIG.MIN_RESPONSE_SIZE || size > CACHE_CONFIG.MAX_RESPONSE_SIZE) {
    return false;
  }
  
  // Check content type
  const contentType = res.getHeader('content-type');
  if (contentType) {
    // Skip caching for certain content types
    if (contentType.includes('multipart') || 
        contentType.includes('application/octet-stream')) {
      return false;
    }
  }
  
  return true;
};

/**
 * Check conditional request (If-None-Match, If-Modified-Since)
 */
const checkConditionalRequest = (req, cachedData) => {
  // Check ETag
  const ifNoneMatch = req.headers['if-none-match'];
  if (ifNoneMatch && cachedData.etag === ifNoneMatch) {
    return true;
  }
  
  // Check Last-Modified
  const ifModifiedSince = req.headers['if-modified-since'];
  if (ifModifiedSince && cachedData.lastModified) {
    const modifiedSince = new Date(ifModifiedSince);
    const lastModified = new Date(cachedData.lastModified);
    if (lastModified <= modifiedSince) {
      return true;
    }
  }
  
  return false;
};

/**
 * Enhanced cache middleware
 */
const enhancedCacheMiddleware = (options = {}) => {
  const {
    ttl = CACHE_CONFIG.MEDIUM_CACHE,
    tags = [],
    userSpecific = false,
    roleBased = false,
    cacheAuthenticated = false,
    vary = [],
  } = options;
  
  return async (req, res, next) => {
    // Skip if should not cache
    if (!shouldCache(req, res, options)) {
      return next();
    }
    
    const cacheKey = generateCacheKey(req, { userSpecific, roleBased });
    
    try {
      // Try to get cached response
      const cached = await enhancedCacheService.get(cacheKey);
      
      if (cached) {
        // Check conditional request
        if (checkConditionalRequest(req, cached)) {
          res.statusCode = 304;
          res.setHeader('ETag', cached.etag);
          return res.end();
        }
        
        // Set cache headers
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('ETag', cached.etag);
        res.setHeader('Last-Modified', cached.lastModified);
        res.setHeader('Cache-Control', `public, max-age=${ttl}`);
        
        // Set Vary header
        const varyHeaders = [...CACHE_CONFIG.VARY_HEADERS, ...vary];
        res.setHeader('Vary', varyHeaders.join(', '));
        
        // Return cached response
        res.setHeader('Content-Type', cached.contentType);
        return res.send(cached.body);
      }
      
      // Cache miss - capture response
      res.setHeader('X-Cache', 'MISS');
      
      const originalSend = res.send.bind(res);
      const originalJson = res.json.bind(res);
      
      // Override res.send
      res.send = function(body) {
        // Restore original send
        res.send = originalSend;
        
        // Check if should cache response
        if (shouldCacheResponse(res, body)) {
          const etag = generateETag(body);
          const cacheData = {
            body,
            etag,
            contentType: res.getHeader('content-type') || 'application/json',
            lastModified: new Date().toUTCString(),
            statusCode: res.statusCode,
          };
          
          // Store in cache
          enhancedCacheService.set(cacheKey, cacheData, {
            ttl,
            tags: [...tags, 'api:response'],
          }).catch(err => {
            console.error('[EnhancedCacheMiddleware] Cache store error:', err.message);
          });
          
          // Set ETag header
          res.setHeader('ETag', etag);
          res.setHeader('Cache-Control', `public, max-age=${ttl}`);
        }
        
        return originalSend(body);
      };
      
      // Override res.json
      res.json = function(obj) {
        res.json = originalJson;
        return res.send(JSON.stringify(obj));
      };
      
      next();
    } catch (error) {
      console.error('[EnhancedCacheMiddleware] Error:', error.message);
      next();
    }
  };
};

/**
 * Cache invalidation middleware
 * Automatically invalidates cache on modifying requests
 */
const cacheInvalidationMiddleware = (invalidationRules = []) => {
  return async (req, res, next) => {
    // Only process modifying requests
    if (!CACHE_CONFIG.SKIP_METHODS.includes(req.method)) {
      return next();
    }
    
    const originalSend = res.send.bind(res);
    
    res.send = function(body) {
      res.send = originalSend;
      
      // Check if request was successful
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Process invalidation rules
        for (const rule of invalidationRules) {
          if (rule.pattern.test(req.path)) {
            // Invalidate cache tags
            if (rule.tags) {
              for (const tag of rule.tags) {
                enhancedCacheService.deleteByTag(tag).catch(err => {
                  console.error('[CacheInvalidation] Error:', err.message);
                });
              }
            }
            
            // Invalidate specific keys
            if (rule.keys) {
              for (const key of rule.keys) {
                enhancedCacheService.delete(key).catch(err => {
                  console.error('[CacheInvalidation] Error:', err.message);
                });
              }
            }
            
            // Generate dynamic keys
            if (rule.keyGenerator) {
              const keys = rule.keyGenerator(req);
              for (const key of keys) {
                enhancedCacheService.delete(key).catch(err => {
                  console.error('[CacheInvalidation] Error:', err.message);
                });
              }
            }
          }
        }
      }
      
      return originalSend(body);
    };
    
    next();
  };
};

/**
 * Route-specific cache configuration
 */
const routeCache = {
  // Public routes - long cache
  public: enhancedCacheMiddleware({
    ttl: CACHE_CONFIG.LONG_CACHE,
    tags: ['public'],
  }),
  
  // Job listings - medium cache
  jobs: enhancedCacheMiddleware({
    ttl: CACHE_CONFIG.MEDIUM_CACHE,
    tags: ['jobs', 'job:list'],
  }),
  
  // Job details - medium cache
  jobDetail: enhancedCacheMiddleware({
    ttl: CACHE_CONFIG.MEDIUM_CACHE,
    tags: ['jobs', 'job:detail'],
  }),
  
  // User profile - short cache, user-specific
  userProfile: enhancedCacheMiddleware({
    ttl: CACHE_CONFIG.SHORT_CACHE,
    userSpecific: true,
    tags: ['users', 'user:profile'],
  }),
  
  // Referral data - short cache, user-specific
  referrals: enhancedCacheMiddleware({
    ttl: CACHE_CONFIG.SHORT_CACHE,
    userSpecific: true,
    tags: ['referrals'],
  }),
  
  // Market data - long cache
  marketData: enhancedCacheMiddleware({
    ttl: CACHE_CONFIG.LONG_CACHE,
    tags: ['market'],
  }),
  
  // Static data - very long cache
  static: enhancedCacheMiddleware({
    ttl: CACHE_CONFIG.STATIC_CACHE,
    tags: ['static'],
  }),
  
  // No cache
  none: (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  },
};

/**
 * Predefined invalidation rules
 */
const invalidationRules = {
  // Job mutations
  jobs: [
    {
      pattern: /\/api\/jobs/,
      tags: ['jobs', 'job:list'],
    },
    {
      pattern: /\/api\/jobs\/([^/]+)$/,
      tags: ['jobs', 'job:detail'],
      keyGenerator: (req) => [
        keyHelpers.create(config.keyPrefix.api, 'GET', `/api/jobs/${req.params.id}`),
      ],
    },
  ],
  
  // Referral mutations
  referrals: [
    {
      pattern: /\/api\/referrals/,
      tags: ['referrals'],
    },
  ],
  
  // User mutations
  users: [
    {
      pattern: /\/api\/users\/me/,
      tags: ['users', 'user:profile'],
    },
  ],
};

module.exports = {
  enhancedCacheMiddleware,
  cacheInvalidationMiddleware,
  routeCache,
  invalidationRules,
  generateCacheKey,
  generateETag,
  shouldCache,
  shouldCacheResponse,
  checkConditionalRequest,
};