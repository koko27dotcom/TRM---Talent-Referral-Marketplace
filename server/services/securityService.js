/**
 * Security Service
 * Core security functions for enterprise-grade security
 * Includes threat detection, IP blocking, security monitoring, and incident response
 */

const crypto = require('crypto');
const { SecurityAudit, SECURITY_EVENT_TYPES, SEVERITY_LEVELS } = require('../models/SecurityAudit.js');
const { User } = require('../models/index.js');

// In-memory cache for blocked IPs (use Redis in production)
const blockedIPs = new Map();
const suspiciousIPs = new Map();
const rateLimitCache = new Map();

// Security configuration
const SECURITY_CONFIG = {
  // Brute force protection
  bruteForce: {
    maxAttempts: 5,
    windowMinutes: 15,
    blockDurationMinutes: 60,
  },
  // Rate limiting
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    blockDurationMs: 15 * 60 * 1000, // 15 minutes
  },
  // Suspicious activity detection
  suspiciousActivity: {
    maxFailedLogins: 3,
    maxRequestsPerSecond: 10,
    geoAnomalyThreshold: 500, // km
  },
};

/**
 * Generate secure random token
 * @param {number} length - Token length
 * @returns {string}
 */
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash sensitive data
 * @param {string} data - Data to hash
 * @returns {string}
 */
const hashData = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Generate HMAC signature
 * @param {string} data - Data to sign
 * @param {string} secret - Secret key
 * @returns {string}
 */
const generateHMAC = (data, secret) => {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
};

/**
 * Verify HMAC signature
 * @param {string} data - Data to verify
 * @param {string} signature - Signature to verify
 * @param {string} secret - Secret key
 * @returns {boolean}
 */
const verifyHMAC = (data, signature, secret) => {
  const expectedSignature = generateHMAC(data, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};

/**
 * Sanitize user input
 * @param {string} input - Input to sanitize
 * @returns {string}
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

/**
 * Detect SQL injection patterns
 * @param {string} input - Input to check
 * @returns {boolean}
 */
const detectSQLInjection = (input) => {
  if (typeof input !== 'string') return false;
  
  const sqlPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
    /((\%27)|(\'))union/i,
    /exec(\s|\+)+(s|x)p\w+/i,
    /UNION\s+SELECT/i,
    /INSERT\s+INTO/i,
    /DELETE\s+FROM/i,
    /DROP\s+TABLE/i,
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
};

/**
 * Detect XSS patterns
 * @param {string} input - Input to check
 * @returns {boolean}
 */
const detectXSS = (input) => {
  if (typeof input !== 'string') return false;
  
  const xssPatterns = [
    /<script[^>]*>[\s\S]*?<\/script>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /eval\s*\(/i,
    /expression\s*\(/i,
  ];
  
  return xssPatterns.some(pattern => pattern.test(input));
};

/**
 * Get client IP address
 * @param {Object} req - Express request object
 * @returns {string}
 */
const getClientIP = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded 
    ? forwarded.split(',')[0].trim() 
    : req.ip || req.connection.remoteAddress;
  return ip;
};

/**
 * Check if IP is blocked
 * @param {string} ipAddress - IP address to check
 * @returns {boolean}
 */
const isIPBlocked = (ipAddress) => {
  const blocked = blockedIPs.get(ipAddress);
  if (!blocked) return false;
  
  if (blocked.expiresAt < Date.now()) {
    blockedIPs.delete(ipAddress);
    return false;
  }
  
  return true;
};

/**
 * Block an IP address
 * @param {string} ipAddress - IP address to block
 * @param {string} reason - Block reason
 * @param {number} durationMinutes - Block duration in minutes
 */
const blockIP = (ipAddress, reason, durationMinutes = 60) => {
  blockedIPs.set(ipAddress, {
    reason,
    blockedAt: Date.now(),
    expiresAt: Date.now() + (durationMinutes * 60 * 1000),
  });
  
  // Log the block
  SecurityAudit.logEvent({
    eventType: SECURITY_EVENT_TYPES.IP_BLOCKED,
    category: 'network',
    severity: SEVERITY_LEVELS.HIGH,
    description: `IP ${ipAddress} blocked: ${reason}`,
    request: { ipAddress },
    details: { durationMinutes, reason },
  });
};

/**
 * Unblock an IP address
 * @param {string} ipAddress - IP address to unblock
 */
const unblockIP = (ipAddress) => {
  blockedIPs.delete(ipAddress);
  
  // Log the unblock
  SecurityAudit.logEvent({
    eventType: SECURITY_EVENT_TYPES.IP_UNBLOCKED,
    category: 'network',
    severity: SEVERITY_LEVELS.INFO,
    description: `IP ${ipAddress} unblocked`,
    request: { ipAddress },
  });
};

/**
 * Check rate limit for IP
 * @param {string} ipAddress - IP address
 * @param {string} endpoint - API endpoint
 * @returns {Object} Rate limit status
 */
const checkRateLimit = (ipAddress, endpoint = 'default') => {
  const key = `${ipAddress}:${endpoint}`;
  const now = Date.now();
  const windowStart = now - SECURITY_CONFIG.rateLimit.windowMs;
  
  let entry = rateLimitCache.get(key);
  
  if (!entry) {
    entry = {
      requests: [],
      blocked: false,
      blockedUntil: null,
    };
  }
  
  // Clean old requests
  entry.requests = entry.requests.filter(time => time > windowStart);
  
  // Check if currently blocked
  if (entry.blocked && entry.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(entry.blockedUntil),
      limit: SECURITY_CONFIG.rateLimit.maxRequests,
    };
  }
  
  // Reset block if expired
  if (entry.blocked && entry.blockedUntil <= now) {
    entry.blocked = false;
    entry.blockedUntil = null;
    entry.requests = [];
  }
  
  // Check if limit exceeded
  if (entry.requests.length >= SECURITY_CONFIG.rateLimit.maxRequests) {
    entry.blocked = true;
    entry.blockedUntil = now + SECURITY_CONFIG.rateLimit.blockDurationMs;
    rateLimitCache.set(key, entry);
    
    // Log rate limit exceeded
    SecurityAudit.logEvent({
      eventType: SECURITY_EVENT_TYPES.API_RATE_LIMIT_EXCEEDED,
      category: 'api',
      severity: SEVERITY_LEVELS.MEDIUM,
      description: `Rate limit exceeded for IP ${ipAddress}`,
      request: { ipAddress },
      details: { endpoint, requestCount: entry.requests.length },
    });
    
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(entry.blockedUntil),
      limit: SECURITY_CONFIG.rateLimit.maxRequests,
    };
  }
  
  // Record request
  entry.requests.push(now);
  rateLimitCache.set(key, entry);
  
  return {
    allowed: true,
    remaining: SECURITY_CONFIG.rateLimit.maxRequests - entry.requests.length,
    resetAt: new Date(now + SECURITY_CONFIG.rateLimit.windowMs),
    limit: SECURITY_CONFIG.rateLimit.maxRequests,
  };
};

/**
 * Detect brute force attempt
 * @param {string} ipAddress - IP address
 * @param {string} username - Username
 * @returns {Promise<boolean>}
 */
const detectBruteForce = async (ipAddress, username = null) => {
  const windowStart = new Date(
    Date.now() - SECURITY_CONFIG.bruteForce.windowMinutes * 60 * 1000
  );
  
  // Check failed attempts from IP
  const ipAttempts = await SecurityAudit.countDocuments({
    'request.ipAddress': ipAddress,
    eventType: { $in: [SECURITY_EVENT_TYPES.LOGIN_FAILED, SECURITY_EVENT_TYPES.MFA_FAILED] },
    createdAt: { $gte: windowStart },
  });
  
  if (ipAttempts >= SECURITY_CONFIG.bruteForce.maxAttempts) {
    // Block the IP
    blockIP(
      ipAddress,
      'Brute force attack detected',
      SECURITY_CONFIG.bruteForce.blockDurationMinutes
    );
    
    // Log the detection
    await SecurityAudit.logEvent({
      eventType: SECURITY_EVENT_TYPES.BRUTE_FORCE_ATTEMPT,
      category: 'threat',
      severity: SEVERITY_LEVELS.HIGH,
      description: `Brute force attack detected from IP ${ipAddress}`,
      request: { ipAddress },
      details: { attempts: ipAttempts, username },
    });
    
    return true;
  }
  
  // Check failed attempts for specific user
  if (username) {
    const userAttempts = await SecurityAudit.countDocuments({
      'actor.email': username,
      eventType: { $in: [SECURITY_EVENT_TYPES.LOGIN_FAILED, SECURITY_EVENT_TYPES.MFA_FAILED] },
      createdAt: { $gte: windowStart },
    });
    
    if (userAttempts >= SECURITY_CONFIG.bruteForce.maxAttempts) {
      await SecurityAudit.logEvent({
        eventType: SECURITY_EVENT_TYPES.BRUTE_FORCE_ATTEMPT,
        category: 'threat',
        severity: SEVERITY_LEVELS.HIGH,
        description: `Brute force attack detected on account ${username}`,
        request: { ipAddress },
        details: { attempts: userAttempts, username },
      });
      
      return true;
    }
  }
  
  return false;
};

/**
 * Analyze request for anomalies
 * @param {Object} req - Express request object
 * @param {Object} user - User object
 * @returns {Promise<Object>} Anomaly analysis
 */
const analyzeRequest = async (req, user = null) => {
  const ipAddress = getClientIP(req);
  const userAgent = req.headers['user-agent'];
  const analysis = {
    isAnomaly: false,
    riskScore: 0,
    factors: [],
  };
  
  // Check if IP is blocked
  if (isIPBlocked(ipAddress)) {
    analysis.isAnomaly = true;
    analysis.riskScore = 100;
    analysis.factors.push('ip_blocked');
    return analysis;
  }
  
  // Check for suspicious user agent
  if (!userAgent || userAgent.length < 10) {
    analysis.riskScore += 20;
    analysis.factors.push('suspicious_user_agent');
  }
  
  // Check for bot patterns
  const botPatterns = [/bot/i, /crawler/i, /spider/i, /scrape/i];
  if (botPatterns.some(pattern => pattern.test(userAgent))) {
    analysis.riskScore += 10;
    analysis.factors.push('potential_bot');
  }
  
  // Check request rate
  const rateLimit = checkRateLimit(ipAddress);
  if (!rateLimit.allowed) {
    analysis.isAnomaly = true;
    analysis.riskScore = Math.min(100, analysis.riskScore + 50);
    analysis.factors.push('rate_limit_exceeded');
  }
  
  // Check for SQL injection
  const queryParams = JSON.stringify(req.query);
  const bodyParams = JSON.stringify(req.body);
  if (detectSQLInjection(queryParams) || detectSQLInjection(bodyParams)) {
    analysis.isAnomaly = true;
    analysis.riskScore = 100;
    analysis.factors.push('sql_injection_attempt');
    
    // Log the attempt
    await SecurityAudit.logEvent({
      eventType: SECURITY_EVENT_TYPES.SQL_INJECTION_ATTEMPT,
      category: 'threat',
      severity: SEVERITY_LEVELS.CRITICAL,
      description: 'SQL injection attempt detected',
      actor: user ? { userId: user._id, email: user.email } : undefined,
      request: { ipAddress, userAgent, path: req.path },
      details: { query: req.query, body: req.body },
    });
  }
  
  // Check for XSS attempts
  if (detectXSS(queryParams) || detectXSS(bodyParams)) {
    analysis.isAnomaly = true;
    analysis.riskScore = 100;
    analysis.factors.push('xss_attempt');
    
    // Log the attempt
    await SecurityAudit.logEvent({
      eventType: SECURITY_EVENT_TYPES.XSS_ATTEMPT,
      category: 'threat',
      severity: SEVERITY_LEVELS.CRITICAL,
      description: 'XSS attempt detected',
      actor: user ? { userId: user._id, email: user.email } : undefined,
      request: { ipAddress, userAgent, path: req.path },
      details: { query: req.query, body: req.body },
    });
  }
  
  // Determine if anomaly
  analysis.isAnomaly = analysis.riskScore >= 70 || analysis.factors.length >= 3;
  
  return analysis;
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result
 */
const validatePasswordStrength = (password) => {
  const result = {
    valid: false,
    score: 0,
    feedback: [],
  };
  
  if (!password || password.length < 8) {
    result.feedback.push('Password must be at least 8 characters long');
    return result;
  }
  
  // Calculate score
  let score = 0;
  
  // Length
  if (password.length >= 12) score += 2;
  else if (password.length >= 8) score += 1;
  
  // Complexity
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 2;
  
  // Check for common patterns
  const commonPatterns = [
    /password/i,
    /123456/,
    /qwerty/i,
    /abc123/i,
  ];
  
  if (commonPatterns.some(pattern => pattern.test(password))) {
    score -= 2;
    result.feedback.push('Password contains common patterns');
  }
  
  // Check for repeated characters
  if (/(.)\1{2,}/.test(password)) {
    score -= 1;
    result.feedback.push('Password contains repeated characters');
  }
  
  result.score = Math.max(0, Math.min(10, score));
  result.valid = result.score >= 5;
  
  if (!result.valid) {
    result.feedback.push('Password is too weak');
  }
  
  return result;
};

/**
 * Create security headers object
 * @returns {Object} Security headers
 */
const getSecurityHeaders = () => {
  return {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  };
};

/**
 * Get security statistics
 * @param {Object} filters - Date filters
 * @returns {Promise<Object>}
 */
const getSecurityStats = async (filters = {}) => {
  const now = new Date();
  const defaultStart = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours
  
  const startDate = filters.startDate || defaultStart;
  const endDate = filters.endDate || now;
  
  const [
    totalEvents,
    criticalEvents,
    blockedIPs,
    failedLogins,
    threatEvents,
  ] = await Promise.all([
    SecurityAudit.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
    }),
    SecurityAudit.countDocuments({
      severity: SEVERITY_LEVELS.CRITICAL,
      createdAt: { $gte: startDate, $lte: endDate },
    }),
    SecurityAudit.countDocuments({
      eventType: SECURITY_EVENT_TYPES.IP_BLOCKED,
      createdAt: { $gte: startDate, $lte: endDate },
    }),
    SecurityAudit.countDocuments({
      eventType: SECURITY_EVENT_TYPES.LOGIN_FAILED,
      createdAt: { $gte: startDate, $lte: endDate },
    }),
    SecurityAudit.countDocuments({
      category: 'threat',
      createdAt: { $gte: startDate, $lte: endDate },
    }),
  ]);
  
  return {
    totalEvents,
    criticalEvents,
    blockedIPs,
    failedLogins,
    threatEvents,
    timeRange: { startDate, endDate },
  };
};

/**
 * Clean up expired blocks and caches
 */
const cleanupSecurityCache = () => {
  const now = Date.now();
  
  // Clean blocked IPs
  for (const [ip, data] of blockedIPs.entries()) {
    if (data.expiresAt < now) {
      blockedIPs.delete(ip);
    }
  }
  
  // Clean rate limit cache
  for (const [key, data] of rateLimitCache.entries()) {
    const windowStart = now - SECURITY_CONFIG.rateLimit.windowMs;
    data.requests = data.requests.filter(time => time > windowStart);
    
    if (data.requests.length === 0 && !data.blocked) {
      rateLimitCache.delete(key);
    }
  }
};

// Run cleanup every 5 minutes
setInterval(cleanupSecurityCache, 5 * 60 * 1000);

module.exports = {
  generateSecureToken,
  hashData,
  generateHMAC,
  verifyHMAC,
  sanitizeInput,
  detectSQLInjection,
  detectXSS,
  getClientIP,
  isIPBlocked,
  blockIP,
  unblockIP,
  checkRateLimit,
  detectBruteForce,
  analyzeRequest,
  validatePasswordStrength,
  getSecurityHeaders,
  getSecurityStats,
  cleanupSecurityCache,
};
