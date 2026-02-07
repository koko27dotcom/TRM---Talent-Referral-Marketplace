const APIKey = require('../models/APIKey');
const apiRateLimitService = require('../services/apiRateLimitService');

/**
 * Extract API key from request headers
 * Supports: X-API-Key header, Authorization: Bearer <key>, or query parameter
 */
const extractAPIKey = (req) => {
  // Check X-API-Key header
  const apiKeyHeader = req.headers['x-api-key'];
  if (apiKeyHeader) {
    return apiKeyHeader;
  }

  // Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check query parameter
  if (req.query.api_key) {
    return req.query.api_key;
  }

  return null;
};

/**
 * Validate API key format
 */
const isValidAPIKeyFormat = (key) => {
  // TRM API keys start with 'trm_live_' or 'trm_test_'
  const validPrefixes = ['trm_live_', 'trm_test_'];
  return validPrefixes.some(prefix => key && key.startsWith(prefix));
};

/**
 * Main API authentication middleware
 */
const apiAuth = async (req, res, next) => {
  try {
    const key = extractAPIKey(req);

    if (!key) {
      return res.status(401).json({
        error: {
          code: 'unauthorized',
          message: 'API key is required. Include it in the X-API-Key header or Authorization: Bearer header.',
          type: 'authentication_error'
        }
      });
    }

    // Validate key format
    if (!isValidAPIKeyFormat(key)) {
      return res.status(401).json({
        error: {
          code: 'invalid_key_format',
          message: 'Invalid API key format. Keys must start with "trm_live_" or "trm_test_".',
          type: 'authentication_error'
        }
      });
    }

    // Find and validate API key
    const apiKey = await APIKey.findByKey(key).populate('user company');

    if (!apiKey) {
      return res.status(401).json({
        error: {
          code: 'invalid_api_key',
          message: 'The provided API key is invalid, revoked, or has expired.',
          type: 'authentication_error'
        }
      });
    }

    // Check if key is expired
    if (apiKey.isExpired) {
      return res.status(401).json({
        error: {
          code: 'key_expired',
          message: 'API key has expired. Please generate a new key.',
          type: 'authentication_error'
        }
      });
    }

    // Check IP whitelist if configured
    if (apiKey.ipWhitelist && apiKey.ipWhitelist.length > 0) {
      const clientIP = req.ip || req.connection.remoteAddress || 
                       req.headers['x-forwarded-for']?.split(',')[0]?.trim();
      
      if (!apiKey.ipWhitelist.includes(clientIP)) {
        return res.status(403).json({
          error: {
            code: 'ip_not_allowed',
            message: 'Access denied from this IP address.',
            type: 'authorization_error'
          }
        });
      }
    }

    // Check referrer whitelist if configured
    if (apiKey.referrerWhitelist && apiKey.referrerWhitelist.length > 0) {
      const referrer = req.headers.referer || req.headers.origin;
      
      if (!referrer || !apiKey.referrerWhitelist.some(allowed => referrer.includes(allowed))) {
        return res.status(403).json({
          error: {
            code: 'referrer_not_allowed',
            message: 'Access denied from this referrer.',
            type: 'authorization_error'
          }
        });
      }
    }

    // Check rate limits
    const rateLimitCheck = await apiRateLimitService.checkLimit(apiKey);
    
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({
        error: {
          code: 'rate_limit_exceeded',
          message: `Rate limit exceeded. ${rateLimitCheck.message}`,
          type: 'rate_limit_error',
          retry_after: rateLimitCheck.retryAfter
        }
      });
    }

    // Attach API key info to request
    req.apiKey = apiKey;
    req.apiUser = apiKey.user;
    req.apiCompany = apiKey.company;
    req.rateLimitInfo = rateLimitCheck;

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', rateLimitCheck.limit);
    res.setHeader('X-RateLimit-Remaining', rateLimitCheck.remaining);
    res.setHeader('X-RateLimit-Reset', Math.floor(rateLimitCheck.resetAt.getTime() / 1000));

    next();
  } catch (error) {
    console.error('API Auth Error:', error);
    return res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'An error occurred during authentication.',
        type: 'api_error'
      }
    });
  }
};

/**
 * Optional API authentication - doesn't require key but attaches if present
 */
const optionalApiAuth = async (req, res, next) => {
  try {
    const key = extractAPIKey(req);

    if (key && isValidAPIKeyFormat(key)) {
      const apiKey = await APIKey.findByKey(key).populate('user company');
      
      if (apiKey && !apiKey.isExpired) {
        req.apiKey = apiKey;
        req.apiUser = apiKey.user;
        req.apiCompany = apiKey.company;
      }
    }

    next();
  } catch (error) {
    // Continue without auth on error
    next();
  }
};

/**
 * Require specific permissions
 */
const requirePermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.apiKey) {
      return res.status(401).json({
        error: {
          code: 'unauthorized',
          message: 'Authentication required.',
          type: 'authentication_error'
        }
      });
    }

    if (!req.apiKey.hasAnyPermission(permissions)) {
      return res.status(403).json({
        error: {
          code: 'insufficient_permissions',
          message: `This API key does not have the required permissions: ${permissions.join(', ')}`,
          type: 'authorization_error',
          required_permissions: permissions
        }
      });
    }

    next();
  };
};

/**
 * Require specific scope
 */
const requireScope = (scope) => {
  return (req, res, next) => {
    if (!req.apiKey) {
      return res.status(401).json({
        error: {
          code: 'unauthorized',
          message: 'Authentication required.',
          type: 'authentication_error'
        }
      });
    }

    if (!req.apiKey.scopes.includes(scope) && !req.apiKey.scopes.includes('admin')) {
      return res.status(403).json({
        error: {
          code: 'invalid_scope',
          message: `This API key does not have the required scope: ${scope}`,
          type: 'authorization_error',
          required_scope: scope
        }
      });
    }

    next();
  };
};

/**
 * Check if request is from test environment
 */
const isTestEnvironment = (req, res, next) => {
  const key = extractAPIKey(req);
  req.isTestMode = key && key.startsWith('trm_test_');
  next();
};

module.exports = {
  apiAuth,
  optionalApiAuth,
  requirePermission,
  requireScope,
  isTestEnvironment,
  extractAPIKey
};
