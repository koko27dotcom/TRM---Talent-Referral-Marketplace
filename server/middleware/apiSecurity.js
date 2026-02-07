/**
 * API Security Middleware
 * Handles API key validation, request signing, replay protection,
 * IP filtering, and CORS configuration
 */

const crypto = require('crypto');
const { api } = require('../config/security.js');
const APIKey = require('../models/APIKey.js');
const SecurityAudit = require('../models/SecurityAudit.js');

// Request signature cache for replay protection
const signatureCache = new Map();

/**
 * Clean up old signatures from cache
 */
const cleanupSignatures = () => {
  const now = Date.now();
  const maxAge = api.requestSigning.maxAge * 1000;

  for (const [signature, timestamp] of signatureCache.entries()) {
    if (now - timestamp > maxAge) {
      signatureCache.delete(signature);
    }
  }
};

// Run cleanup every 5 minutes
setInterval(cleanupSignatures, 5 * 60 * 1000);

/**
 * API Key authentication middleware
 * Validates API keys and checks scopes
 * @param {Array<string>} requiredScopes - Required scopes for access
 * @returns {Function} Express middleware
 */
const requireApiKey = (requiredScopes = []) => {
  return async (req, res, next) => {
    try {
      const apiKey = req.headers['x-api-key'];

      if (!apiKey) {
        return res.status(401).json({
          error: {
            code: 'missing_api_key',
            message: 'API key is required',
          },
        });
      }

      // Validate API key format
      const isTestKey = apiKey.startsWith(api.apiKey.testPrefix);
      const isLiveKey = apiKey.startsWith(api.apiKey.prefix);

      if (!isTestKey && !isLiveKey) {
        await logInvalidApiKey(req, apiKey, 'invalid_format');
        return res.status(401).json({
          error: {
            code: 'invalid_api_key',
            message: 'Invalid API key format',
          },
        });
      }

      // Find API key in database
      const keyRecord = await APIKey.findOne({
        key: apiKey,
        revoked: { $ne: true },
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } },
        ],
      }).populate('userId', 'name email role companyId');

      if (!keyRecord) {
        await logInvalidApiKey(req, apiKey, 'not_found_or_revoked');
        return res.status(401).json({
          error: {
            code: 'invalid_api_key',
            message: 'Invalid or revoked API key',
          },
        });
      }

      // Check scopes
      if (requiredScopes.length > 0) {
        const hasRequiredScope = requiredScopes.some(scope =>
          keyRecord.scopes.includes(scope) || keyRecord.scopes.includes('admin')
        );

        if (!hasRequiredScope) {
          await SecurityAudit.logEvent({
            eventType: 'access_denied',
            category: 'authorization',
            severity: 'medium',
            actor: {
              userId: keyRecord.userId?._id,
              email: keyRecord.userId?.email,
            },
            request: {
              ipAddress: req.ip,
              userAgent: req.headers['user-agent'],
              path: req.originalUrl,
            },
            description: 'API key lacks required scopes',
            details: { requiredScopes, availableScopes: keyRecord.scopes },
          });

          return res.status(403).json({
            error: {
              code: 'insufficient_scope',
              message: 'API key does not have required permissions',
              required: requiredScopes,
            },
          });
        }
      }

      // Update last used
      keyRecord.lastUsedAt = new Date();
      keyRecord.usageCount = (keyRecord.usageCount || 0) + 1;
      await keyRecord.save();

      // Attach API key info to request
      req.apiKey = {
        id: keyRecord._id,
        key: apiKey,
        scopes: keyRecord.scopes,
        user: keyRecord.userId,
        isTest: isTestKey,
      };

      next();
    } catch (error) {
      console.error('API key validation error:', error);
      return res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Failed to validate API key',
        },
      });
    }
  };
};

/**
 * Log invalid API key attempt
 * @param {Object} req - Express request
 * @param {string} apiKey - API key used
 * @param {string} reason - Reason for failure
 */
const logInvalidApiKey = async (req, apiKey, reason) => {
  await SecurityAudit.logEvent({
    eventType: 'invalid_api_key',
    category: 'api',
    severity: 'medium',
    request: {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      path: req.originalUrl,
    },
    description: `Invalid API key attempt: ${reason}`,
    details: { keyPrefix: apiKey.substring(0, 10), reason },
  });
};

/**
 * Request signing middleware
 * Validates HMAC signatures on requests
 * @returns {Function} Express middleware
 */
const validateRequestSignature = () => {
  return async (req, res, next) => {
    try {
      if (!api.requestSigning.enabled) {
        return next();
      }

      const signature = req.headers[api.requestSigning.header.toLowerCase()];
      const timestamp = req.headers[api.requestSigning.timestampHeader.toLowerCase()];

      if (!signature || !timestamp) {
        return res.status(401).json({
          error: {
            code: 'missing_signature',
            message: 'Request signature and timestamp are required',
          },
        });
      }

      // Check timestamp for replay protection
      const requestTime = parseInt(timestamp, 10);
      const now = Math.floor(Date.now() / 1000);
      const age = now - requestTime;

      if (Math.abs(age) > api.requestSigning.maxAge) {
        return res.status(401).json({
          error: {
            code: 'stale_request',
            message: 'Request timestamp is too old',
          },
        });
      }

      // Check for replay
      if (signatureCache.has(signature)) {
        return res.status(401).json({
          error: {
            code: 'replay_detected',
            message: 'Request signature has already been used',
          },
        });
      }

      // Get API key for signature validation
      const apiKey = req.apiKey;
      if (!apiKey) {
        return res.status(401).json({
          error: {
            code: 'missing_api_key',
            message: 'API key required for signed requests',
          },
        });
      }

      // Validate signature
      const payload = buildSignaturePayload(req, timestamp);
      const expectedSignature = crypto
        .createHmac(api.requestSigning.algorithm, apiKey.key)
        .update(payload)
        .digest('hex');

      if (!crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      )) {
        await SecurityAudit.logEvent({
          eventType: 'access_denied',
          category: 'api',
          severity: 'high',
          actor: {
            userId: apiKey.user?._id,
            email: apiKey.user?.email,
          },
          request: {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            path: req.originalUrl,
          },
          description: 'Invalid request signature',
        });

        return res.status(401).json({
          error: {
            code: 'invalid_signature',
            message: 'Request signature is invalid',
          },
        });
      }

      // Cache signature for replay protection
      signatureCache.set(signature, Date.now());

      next();
    } catch (error) {
      console.error('Signature validation error:', error);
      return res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Failed to validate request signature',
        },
      });
    }
  };
};

/**
 * Build signature payload from request
 * @param {Object} req - Express request
 * @param {string} timestamp - Request timestamp
 * @returns {string} Payload string
 */
const buildSignaturePayload = (req, timestamp) => {
  const parts = [
    req.method.toUpperCase(),
    req.originalUrl,
    timestamp,
    JSON.stringify(req.body) || '',
  ];

  return parts.join('|');
};

/**
 * Webhook signature validation middleware
 * Validates webhook signatures from external services
 * @param {string} secret - Webhook secret
 * @returns {Function} Express middleware
 */
const validateWebhookSignature = (secret) => {
  return async (req, res, next) => {
    try {
      const signature = req.headers[api.webhook.signatureHeader.toLowerCase()];
      const timestamp = req.headers[api.webhook.timestampHeader.toLowerCase()];

      if (!signature) {
        return res.status(401).json({
          error: {
            code: 'missing_signature',
            message: 'Webhook signature is required',
          },
        });
      }

      // Verify timestamp if present
      if (timestamp) {
        const requestTime = parseInt(timestamp, 10);
        const now = Math.floor(Date.now() / 1000);

        if (Math.abs(now - requestTime) > 300) { // 5 minute tolerance
          return res.status(401).json({
            error: {
              code: 'stale_webhook',
              message: 'Webhook timestamp is too old',
            },
          });
        }
      }

      // Compute expected signature
      const payload = req.body;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      // Compare signatures
      if (!crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      )) {
        await SecurityAudit.logEvent({
          eventType: 'access_denied',
          category: 'api',
          severity: 'high',
          request: {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            path: req.originalUrl,
          },
          description: 'Invalid webhook signature',
        });

        return res.status(401).json({
          error: {
            code: 'invalid_signature',
            message: 'Webhook signature is invalid',
          },
        });
      }

      next();
    } catch (error) {
      console.error('Webhook signature validation error:', error);
      return res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Failed to validate webhook signature',
        },
      });
    }
  };
};

/**
 * IP filter middleware
 * Whitelist/blacklist IP addresses
 * @returns {Function} Express middleware
 */
const ipFilter = () => {
  return async (req, res, next) => {
    try {
      const clientIp = req.ip || req.connection?.remoteAddress;

      // Check blacklist
      if (api.ipFilter.blacklist.includes(clientIp)) {
        await SecurityAudit.logEvent({
          eventType: 'access_denied',
          category: 'network',
          severity: 'high',
          request: {
            ipAddress: clientIp,
            userAgent: req.headers['user-agent'],
            path: req.originalUrl,
          },
          description: 'Request from blacklisted IP',
        });

        return res.status(403).json({
          error: {
            code: 'ip_blocked',
            message: 'Access denied from this IP address',
          },
        });
      }

      // Check whitelist (if whitelist is not empty, only allow whitelisted IPs)
      if (api.ipFilter.whitelist.length > 0 && !api.ipFilter.whitelist.includes(clientIp)) {
        return res.status(403).json({
          error: {
            code: 'ip_not_allowed',
            message: 'IP address not in whitelist',
          },
        });
      }

      next();
    } catch (error) {
      console.error('IP filter error:', error);
      next();
    }
  };
};

/**
 * API versioning middleware
 * Handles API version routing and deprecation warnings
 * @returns {Function} Express middleware
 */
const apiVersioning = () => {
  return (req, res, next) => {
    // Extract version from URL path
    const versionMatch = req.path.match(/\/api\/(v\d+)\//);
    const requestedVersion = versionMatch ? versionMatch[1] : api.versioning.current;

    // Check if version is supported
    if (!api.versioning.supported.includes(requestedVersion)) {
      return res.status(400).json({
        error: {
          code: 'unsupported_version',
          message: `API version ${requestedVersion} is not supported`,
          supportedVersions: api.versioning.supported,
        },
      });
    }

    // Check if version is deprecated
    if (api.versioning.deprecated.includes(requestedVersion)) {
      res.setHeader('Deprecation', 'true');
      res.setHeader('Sunset', new Date(Date.now() + api.versioning.sunsetDays * 24 * 60 * 60 * 1000).toISOString());
    }

    // Attach version to request
    req.apiVersion = requestedVersion;

    next();
  };
};

/**
 * Generate API key
 * @param {Object} options - Key generation options
 * @returns {Object} Generated key info
 */
const generateApiKey = (options = {}) => {
  const { test = false, userId, scopes = ['read'] } = options;

  const prefix = test ? api.apiKey.testPrefix : api.apiKey.prefix;
  const randomPart = crypto.randomBytes(api.apiKey.length / 2).toString('hex');
  const key = `${prefix}${randomPart}`;

  return {
    key,
    prefix,
    hashedKey: crypto.createHash('sha256').update(key).digest('hex'),
    userId,
    scopes,
    createdAt: new Date(),
  };
};

/**
 * CORS configuration
 * Returns CORS middleware configuration
 * @returns {Object} CORS configuration
 */
const getCorsConfig = () => {
  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      if (api.cors.origin.includes(origin) || api.cors.origin.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: api.cors.credentials,
    methods: api.cors.methods,
    allowedHeaders: api.cors.allowedHeaders,
    exposedHeaders: api.cors.exposedHeaders,
    maxAge: api.cors.maxAge,
  };
};

module.exports = {
  requireApiKey,
  validateRequestSignature,
  validateWebhookSignature,
  ipFilter,
  apiVersioning,
  generateApiKey,
  getCorsConfig,
};
