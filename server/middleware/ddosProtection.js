/**
 * DDoS Protection Middleware
 * Implements request size limits, connection limits, Slowloris protection,
 * geographic blocking, and challenge-response mechanisms
 */

const { ddos } = require('../config/security.js');
const SecurityAudit = require('../models/SecurityAudit.js');

// Connection tracking
const connectionTracker = new Map();
const challengeStore = new Map();

/**
 * Clean up old connection records
 */
const cleanupConnections = () => {
  const now = Date.now();
  const windowMs = ddos.connections.windowMs;

  for (const [ip, data] of connectionTracker.entries()) {
    data.requests = data.requests.filter(time => now - time < windowMs);

    if (data.requests.length === 0 && data.connections === 0) {
      connectionTracker.delete(ip);
    }
  }
};

// Run cleanup every minute
setInterval(cleanupConnections, 60000);

/**
 * Request size limit middleware
 * Enforces maximum body and header sizes
 * @returns {Function} Express middleware
 */
const requestSizeLimit = () => {
  return (req, res, next) => {
    // Check URL length
    if (req.originalUrl.length > ddos.requestSize.maxUrlLength) {
      return res.status(414).json({
        error: {
          code: 'url_too_long',
          message: 'Request URL is too long',
        },
      });
    }

    // Check headers size
    const headersSize = JSON.stringify(req.headers).length;
    if (headersSize > ddos.requestSize.maxHeaderSize) {
      return res.status(431).json({
        error: {
          code: 'headers_too_large',
          message: 'Request headers are too large',
        },
      });
    }

    // Check content length
    const contentLength = parseInt(req.headers['content-length'], 10);
    if (contentLength && contentLength > ddos.requestSize.maxBodySize) {
      return res.status(413).json({
        error: {
          code: 'payload_too_large',
          message: 'Request body is too large',
          max_size: ddos.requestSize.maxBodySize,
        },
      });
    }

    next();
  };
};

/**
 * Connection limit middleware
 * Limits concurrent connections and requests per IP
 * @returns {Function} Express middleware
 */
const connectionLimit = () => {
  return (req, res, next) => {
    const clientIp = req.ip || req.connection?.remoteAddress;

    if (!connectionTracker.has(clientIp)) {
      connectionTracker.set(clientIp, {
        requests: [],
        connections: 0,
        blocked: false,
        blockedUntil: null,
      });
    }

    const data = connectionTracker.get(clientIp);

    // Check if IP is blocked
    if (data.blocked) {
      if (Date.now() < data.blockedUntil) {
        return res.status(429).json({
          error: {
            code: 'ip_blocked',
            message: 'IP address temporarily blocked due to excessive requests',
            retry_after: Math.ceil((data.blockedUntil - Date.now()) / 1000),
          },
        });
      } else {
        // Unblock
        data.blocked = false;
        data.blockedUntil = null;
      }
    }

    // Check concurrent connections
    if (data.connections >= ddos.connections.maxConcurrent) {
      return res.status(503).json({
        error: {
          code: 'too_many_connections',
          message: 'Too many concurrent connections from this IP',
        },
      });
    }

    // Check request rate
    const now = Date.now();
    const windowStart = now - ddos.connections.windowMs;
    const recentRequests = data.requests.filter(time => time > windowStart);

    if (recentRequests.length >= ddos.connections.maxPerIp) {
      // Block IP temporarily
      data.blocked = true;
      data.blockedUntil = now + (5 * 60 * 1000); // 5 minute block

      // Log security event
      SecurityAudit.logEvent({
        eventType: 'ip_blocked',
        category: 'network',
        severity: 'high',
        request: {
          ipAddress: clientIp,
          userAgent: req.headers['user-agent'],
        },
        description: `IP blocked due to excessive requests: ${recentRequests.length} in ${ddos.connections.windowMs}ms`,
        details: { requestCount: recentRequests.length },
      });

      return res.status(429).json({
        error: {
          code: 'rate_limit_exceeded',
          message: 'Too many requests from this IP',
          retry_after: 300,
        },
      });
    }

    // Track connection
    data.connections++;
    data.requests.push(now);

    // Decrement on response finish
    res.on('finish', () => {
      data.connections = Math.max(0, data.connections - 1);
    });

    // Decrement on close
    res.on('close', () => {
      data.connections = Math.max(0, data.connections - 1);
    });

    next();
  };
};

/**
 * Slowloris protection middleware
 * Protects against slow HTTP attacks
 * @returns {Function} Express middleware
 */
const slowlorisProtection = () => {
  return (req, res, next) => {
    if (!ddos.slowloris.enabled) {
      return next();
    }

    const timeout = ddos.slowloris.timeout;
    let dataReceived = false;
    let timer = null;

    // Set up timeout
    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (!dataReceived) {
          req.destroy();
        }
      }, timeout);
    };

    // Monitor data reception
    req.on('data', () => {
      dataReceived = true;
      if (timer) clearTimeout(timer);
    });

    req.on('end', () => {
      if (timer) clearTimeout(timer);
    });

    // Check header count
    const headerCount = Object.keys(req.headers).length;
    if (headerCount > ddos.slowloris.maxHeaders) {
      return res.status(431).json({
        error: {
          code: 'too_many_headers',
          message: 'Too many headers in request',
        },
      });
    }

    // Check header lengths
    for (const [key, value] of Object.entries(req.headers)) {
      const headerLength = `${key}: ${value}`.length;
      if (headerLength > ddos.slowloris.maxHeaderLength) {
        return res.status(431).json({
          error: {
            code: 'header_too_long',
            message: `Header too long: ${key}`,
          },
        });
      }
    }

    resetTimer();
    next();
  };
};

/**
 * Geographic blocking middleware
 * Blocks or allows requests based on country
 * Note: Requires GeoIP database or service
 * @returns {Function} Express middleware
 */
const geographicBlock = () => {
  return async (req, res, next) => {
    if (!ddos.geoBlocking.enabled) {
      return next();
    }

    try {
      // Get country from request (would use GeoIP in production)
      // For now, check X-Country header for testing
      const country = req.headers['x-country'] || req.geo?.country;

      if (!country) {
        // Can't determine country, allow through
        return next();
      }

      // Check blocked countries
      if (ddos.geoBlocking.blockedCountries.includes(country)) {
        await SecurityAudit.logEvent({
          eventType: 'access_denied',
          category: 'network',
          severity: 'medium',
          request: {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          },
          description: `Request blocked from country: ${country}`,
          details: { country },
        });

        return res.status(403).json({
          error: {
            code: 'geo_blocked',
            message: 'Access denied from your location',
          },
        });
      }

      // Check allowed countries (if whitelist exists)
      if (ddos.geoBlocking.allowedCountries.length > 0) {
        if (!ddos.geoBlocking.allowedCountries.includes(country)) {
          return res.status(403).json({
            error: {
              code: 'geo_not_allowed',
              message: 'Access not allowed from your location',
            },
          });
        }
      }

      next();
    } catch (error) {
      console.error('Geographic blocking error:', error);
      next();
    }
  };
};

/**
 * Generate proof-of-work challenge
 * @returns {Object} Challenge data
 */
const generateChallenge = () => {
  const difficulty = ddos.challenge.difficulty;
  const challenge = require('crypto').randomBytes(16).toString('hex');
  const timestamp = Date.now();

  return {
    challenge,
    difficulty,
    timestamp,
  };
};

/**
 * Verify proof-of-work solution
 * @param {string} challenge - Original challenge
 * @param {string} nonce - Solution nonce
 * @param {number} difficulty - Difficulty level
 * @returns {boolean} Valid solution
 */
const verifySolution = (challenge, nonce, difficulty) => {
  const hash = require('crypto')
    .createHash('sha256')
    .update(challenge + nonce)
    .digest('hex');

  const prefix = '0'.repeat(difficulty);
  return hash.startsWith(prefix);
};

/**
 * Challenge-response middleware
 * Requires proof-of-work for suspicious traffic
 * @returns {Function} Express middleware
 */
const challengeResponse = () => {
  return async (req, res, next) => {
    if (!ddos.challenge.enabled) {
      return next();
    }

    const clientIp = req.ip || req.connection?.remoteAddress;

    // Get request rate for this IP
    const data = connectionTracker.get(clientIp);
    const requestCount = data ? data.requests.length : 0;

    // Check if challenge is required
    if (requestCount < ddos.challenge.threshold) {
      return next();
    }

    // Check for existing valid challenge
    const challengeCookie = req.cookies?.['ddos-challenge'];
    const storedChallenge = challengeStore.get(clientIp);

    if (challengeCookie && storedChallenge) {
      try {
        const { challenge, nonce } = JSON.parse(Buffer.from(challengeCookie, 'base64').toString());

        if (verifySolution(storedChallenge.challenge, nonce, storedChallenge.difficulty)) {
          // Valid solution, allow through
          return next();
        }
      } catch (error) {
        // Invalid cookie format
      }
    }

    // Issue new challenge
    const challenge = generateChallenge();
    challengeStore.set(clientIp, challenge);

    // Set expiration
    setTimeout(() => {
      challengeStore.delete(clientIp);
    }, ddos.challenge.duration);

    // Return challenge to client
    return res.status(429).json({
      error: {
        code: 'challenge_required',
        message: 'Proof-of-work challenge required',
        challenge: challenge.challenge,
        difficulty: challenge.difficulty,
        instructions: 'Find a nonce such that SHA256(challenge + nonce) starts with difficulty zeros',
      },
    });
  };
};

/**
 * Verify challenge solution endpoint handler
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const verifyChallenge = (req, res) => {
  const clientIp = req.ip || req.connection?.remoteAddress;
  const { challenge, nonce } = req.body;

  const storedChallenge = challengeStore.get(clientIp);

  if (!storedChallenge || storedChallenge.challenge !== challenge) {
    return res.status(400).json({
      error: {
        code: 'invalid_challenge',
        message: 'Invalid or expired challenge',
      },
    });
  }

  if (verifySolution(challenge, nonce, storedChallenge.difficulty)) {
    // Set cookie with solution
    const cookieValue = Buffer.from(JSON.stringify({ challenge, nonce })).toString('base64');
    res.cookie('ddos-challenge', cookieValue, {
      maxAge: ddos.challenge.duration,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    // Remove challenge
    challengeStore.delete(clientIp);

    return res.json({
      success: true,
      message: 'Challenge solved successfully',
    });
  }

  return res.status(400).json({
    error: {
      code: 'invalid_solution',
      message: 'Invalid solution',
    },
  });
};

/**
 * Combined DDoS protection middleware
 * Applies all DDoS protection measures
 * @returns {Function} Express middleware
 */
const ddosProtection = () => {
  return (req, res, next) => {
    if (!ddos.enabled) {
      return next();
    }

    // Apply protections in sequence
    requestSizeLimit()(req, res, (err) => {
      if (err) return next(err);

      connectionLimit()(req, res, (err) => {
        if (err) return next(err);

        slowlorisProtection()(req, res, (err) => {
          if (err) return next(err);

          geographicBlock()(req, res, (err) => {
            if (err) return next(err);

            challengeResponse()(req, res, next);
          });
        });
      });
    });
  };
};

module.exports = {
  requestSizeLimit,
  connectionLimit,
  slowlorisProtection,
  geographicBlock,
  challengeResponse,
  verifyChallenge,
  ddosProtection,
  generateChallenge,
  verifySolution,
};
