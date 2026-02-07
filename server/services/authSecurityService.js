/**
 * Authentication Security Service
 * Handles brute force protection, suspicious login detection,
 * session management, and device fingerprinting
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Redis = require('ioredis');
const { auth, dataProtection } = require('../config/security.js');
const SecurityAudit = require('../models/SecurityAudit.js');

// Initialize Redis for session and attempt tracking
let redis = null;
let redisAvailable = false;

if (process.env.REDIS_URL) {
  try {
    redis = new Redis(process.env.REDIS_URL, {
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: 3,
    });

    redis.on('connect', () => {
      redisAvailable = true;
    });

    redis.on('error', () => {
      redisAvailable = false;
    });
  } catch (error) {
    console.warn('Redis not available for auth security:', error.message);
  }
}

// In-memory fallback
const memoryStore = {
  attempts: new Map(),
  sessions: new Map(),
  devices: new Map(),
};

/**
 * Hash data using bcrypt with configured rounds
 * @param {string} data - Data to hash
 * @returns {Promise<string>} Hashed data
 */
const hashData = async (data) => {
  const saltRounds = auth.bcrypt.rounds;
  const pepper = auth.bcrypt.pepper || '';
  return bcrypt.hash(data + pepper, saltRounds);
};

/**
 * Compare data with hash
 * @param {string} data - Plain data
 * @param {string} hash - Hashed data
 * @returns {Promise<boolean>} Match result
 */
const compareHash = async (data, hash) => {
  const pepper = auth.bcrypt.pepper || '';
  return bcrypt.compare(data + pepper, hash);
};

/**
 * Record failed login attempt
 * @param {string} identifier - User identifier (email, username, or IP)
 * @param {Object} context - Request context
 * @returns {Promise<Object>} Attempt info
 */
const recordFailedAttempt = async (identifier, context) => {
  const key = `failed_attempts:${identifier}`;
  const now = Date.now();
  const windowMs = auth.bruteForce.lockoutDuration;

  let attempts;

  if (redisAvailable && redis) {
    // Use Redis sorted set for sliding window
    const multi = redis.multi();
    multi.zremrangebyscore(key, 0, now - windowMs);
    multi.zadd(key, now, `${now}-${Math.random()}`);
    multi.zcard(key);
    multi.pexpire(key, windowMs);

    const results = await multi.exec();
    attempts = results[2][1];
  } else {
    // Memory fallback
    let entry = memoryStore.attempts.get(key);
    if (!entry) {
      entry = { timestamps: [], lastAttempt: now };
      memoryStore.attempts.set(key, entry);
    }

    // Remove old attempts
    entry.timestamps = entry.timestamps.filter(ts => ts > now - windowMs);
    entry.timestamps.push(now);
    entry.lastAttempt = now;

    attempts = entry.timestamps.length;

    // Cleanup old entries periodically
    if (attempts === 1) {
      setTimeout(() => memoryStore.attempts.delete(key), windowMs);
    }
  }

  // Log security event
  await SecurityAudit.logEvent({
    eventType: 'login_failed',
    category: 'authentication',
    severity: attempts >= auth.bruteForce.maxAttempts ? 'high' : 'medium',
    actor: {
      email: identifier.includes('@') ? identifier : null,
    },
    request: {
      ipAddress: context.ip,
      userAgent: context.userAgent,
      method: context.method,
      path: context.path,
    },
    description: `Failed login attempt ${attempts} for ${identifier}`,
    details: { attempts, identifier },
  });

  return {
    attempts,
    locked: attempts >= auth.bruteForce.maxAttempts,
    remainingAttempts: Math.max(0, auth.bruteForce.maxAttempts - attempts),
  };
};

/**
 * Check if account is locked
 * @param {string} identifier - User identifier
 * @returns {Promise<Object>} Lock status
 */
const checkAccountLock = async (identifier) => {
  const key = `failed_attempts:${identifier}`;
  const windowMs = auth.bruteForce.lockoutDuration;
  const now = Date.now();

  let attempts = 0;

  if (redisAvailable && redis) {
    const count = await redis.zcount(key, now - windowMs, now);
    attempts = count;
  } else {
    const entry = memoryStore.attempts.get(key);
    if (entry) {
      attempts = entry.timestamps.filter(ts => ts > now - windowMs).length;
    }
  }

  const locked = attempts >= auth.bruteForce.maxAttempts;

  return {
    locked,
    attempts,
    remainingAttempts: Math.max(0, auth.bruteForce.maxAttempts - attempts),
    unlockTime: locked ? now + windowMs : null,
  };
};

/**
 * Clear failed attempts for identifier
 * @param {string} identifier - User identifier
 */
const clearFailedAttempts = async (identifier) => {
  const key = `failed_attempts:${identifier}`;

  if (redisAvailable && redis) {
    await redis.del(key);
  } else {
    memoryStore.attempts.delete(key);
  }
};

/**
 * Generate device fingerprint
 * @param {Object} req - Express request object
 * @returns {string} Device fingerprint
 */
const generateDeviceFingerprint = (req) => {
  const factors = [];

  if (auth.deviceFingerprint.factors.includes('userAgent')) {
    factors.push(req.headers['user-agent'] || '');
  }

  if (auth.deviceFingerprint.factors.includes('screenResolution')) {
    factors.push(req.headers['x-screen-resolution'] || '');
  }

  if (auth.deviceFingerprint.factors.includes('timezone')) {
    factors.push(req.headers['x-timezone'] || '');
  }

  if (auth.deviceFingerprint.factors.includes('language')) {
    factors.push(req.headers['accept-language'] || '');
  }

  // Add IP as part of fingerprint
  factors.push(req.ip || req.connection?.remoteAddress || '');

  const fingerprintData = factors.join('|');
  return crypto.createHash('sha256').update(fingerprintData).digest('hex');
};

/**
 * Parse user agent for device info
 * @param {string} userAgent - User agent string
 * @returns {Object} Device info
 */
const parseUserAgent = (userAgent) => {
  if (!userAgent) {
    return { browser: 'unknown', os: 'unknown', device: 'unknown', deviceType: 'unknown' };
  }

  const ua = userAgent.toLowerCase();

  // Browser detection
  let browser = 'unknown';
  let browserVersion = '';

  if (ua.includes('chrome')) {
    browser = 'Chrome';
    const match = ua.match(/chrome\/(\d+\.\d+)/);
    browserVersion = match ? match[1] : '';
  } else if (ua.includes('firefox')) {
    browser = 'Firefox';
    const match = ua.match(/firefox\/(\d+\.\d+)/);
    browserVersion = match ? match[1] : '';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browser = 'Safari';
    const match = ua.match(/version\/(\d+\.\d+)/);
    browserVersion = match ? match[1] : '';
  } else if (ua.includes('edge')) {
    browser = 'Edge';
    const match = ua.match(/edge\/(\d+\.\d+)/);
    browserVersion = match ? match[1] : '';
  }

  // OS detection
  let os = 'unknown';
  let osVersion = '';

  if (ua.includes('windows')) {
    os = 'Windows';
    const match = ua.match(/windows nt (\d+\.\d+)/);
    osVersion = match ? match[1] : '';
  } else if (ua.includes('macintosh') || ua.includes('mac os')) {
    os = 'macOS';
    const match = ua.match(/mac os x (\d+[._]\d+)/);
    osVersion = match ? match[1].replace('_', '.') : '';
  } else if (ua.includes('linux')) {
    os = 'Linux';
  } else if (ua.includes('android')) {
    os = 'Android';
    const match = ua.match(/android (\d+\.\d+)/);
    osVersion = match ? match[1] : '';
  } else if (ua.includes('iphone') || ua.includes('ipad')) {
    os = 'iOS';
    const match = ua.match(/os (\d+[._]\d+)/);
    osVersion = match ? match[1].replace('_', '.') : '';
  }

  // Device type detection
  let deviceType = 'desktop';
  if (ua.includes('mobile')) {
    deviceType = 'mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    deviceType = 'tablet';
  }

  return {
    browser,
    browserVersion,
    os,
    osVersion,
    device: 'unknown',
    deviceType,
    userAgent,
  };
};

/**
 * Check if device is known/trusted
 * @param {string} userId - User ID
 * @param {string} fingerprint - Device fingerprint
 * @returns {Promise<boolean>}
 */
const isKnownDevice = async (userId, fingerprint) => {
  const key = `devices:${userId}`;

  if (redisAvailable && redis) {
    const exists = await redis.sismember(key, fingerprint);
    return exists === 1;
  }

  const devices = memoryStore.devices.get(userId);
  return devices ? devices.has(fingerprint) : false;
};

/**
 * Register device as known
 * @param {string} userId - User ID
 * @param {string} fingerprint - Device fingerprint
 */
const registerDevice = async (userId, fingerprint) => {
  const key = `devices:${userId}`;
  const trustDuration = auth.deviceFingerprint.trustDuration;

  if (redisAvailable && redis) {
    await redis.sadd(key, fingerprint);
    await redis.pexpire(key, trustDuration);
  } else {
    if (!memoryStore.devices.has(userId)) {
      memoryStore.devices.set(userId, new Set());
    }
    memoryStore.devices.get(userId).add(fingerprint);

    // Auto-expire
    setTimeout(() => {
      const devices = memoryStore.devices.get(userId);
      if (devices) {
        devices.delete(fingerprint);
      }
    }, trustDuration);
  }
};

/**
 * Detect suspicious login
 * @param {Object} user - User object
 * @param {Object} context - Login context
 * @returns {Promise<Object>} Suspicion assessment
 */
const detectSuspiciousLogin = async (user, context) => {
  const factors = [];
  let riskScore = 0;

  // Check for new device
  const fingerprint = generateDeviceFingerprint(context.req);
  const knownDevice = await isKnownDevice(user._id.toString(), fingerprint);

  if (!knownDevice) {
    factors.push('new_device');
    riskScore += 30;
  }

  // Check for geo anomaly (simplified - would use GeoIP in production)
  if (context.geoLocation) {
    const lastLocation = user.lastLoginLocation;
    if (lastLocation && context.geoLocation.country !== lastLocation.country) {
      factors.push('geo_anomaly');
      riskScore += 40;
    }
  }

  // Check for time anomaly
  const hour = new Date().getHours();
  if (hour < 6 || hour > 23) {
    factors.push('unusual_time');
    riskScore += 10;
  }

  // Check login velocity
  const recentLogins = await getRecentLoginCount(user._id.toString(), 60); // 1 hour
  if (recentLogins > auth.suspiciousLogin.velocityThreshold) {
    factors.push('velocity_anomaly');
    riskScore += 20;
  }

  // Check for impossible travel
  if (context.geoLocation && user.lastLoginLocation) {
    const distance = calculateDistance(
      user.lastLoginLocation,
      context.geoLocation
    );
    const timeDiff = (Date.now() - user.lastLoginAt) / 1000 / 60 / 60; // hours
    const speed = distance / timeDiff;

    if (speed > auth.suspiciousLogin.impossibleTravelThreshold) {
      factors.push('impossible_travel');
      riskScore += 50;
    }
  }

  const isSuspicious = riskScore >= 50 || factors.length >= 2;

  if (isSuspicious) {
    await SecurityAudit.logEvent({
      eventType: 'anomaly_detected',
      category: 'authentication',
      severity: 'high',
      actor: {
        userId: user._id,
        email: user.email,
      },
      request: {
        ipAddress: context.ip,
        userAgent: context.userAgent,
      },
      description: 'Suspicious login detected',
      details: { factors, riskScore },
      risk: {
        score: riskScore,
        factors,
        isAnomaly: true,
      },
    });
  }

  return {
    isSuspicious,
    riskScore,
    factors,
    requiresChallenge: riskScore >= 70,
  };
};

/**
 * Get recent login count
 * @param {string} userId - User ID
 * @param {number} minutes - Time window in minutes
 * @returns {Promise<number>}
 */
const getRecentLoginCount = async (userId, minutes) => {
  const windowStart = new Date(Date.now() - minutes * 60 * 1000);

  const count = await SecurityAudit.countDocuments({
    'actor.userId': userId,
    eventType: 'login_success',
    createdAt: { $gte: windowStart },
  });

  return count;
};

/**
 * Calculate distance between two points
 * @param {Object} loc1 - Location 1 {latitude, longitude}
 * @param {Object} loc2 - Location 2 {latitude, longitude}
 * @returns {number} Distance in km
 */
const calculateDistance = (loc1, loc2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (loc2.latitude - loc1.latitude) * Math.PI / 180;
  const dLon = (loc2.longitude - loc1.longitude) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(loc1.latitude * Math.PI / 180) *
    Math.cos(loc2.latitude * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Generate JWT tokens
 * @param {Object} payload - Token payload
 * @returns {Object} Tokens and metadata
 */
const generateTokens = (payload) => {
  const accessToken = jwt.sign(payload, auth.jwt.accessTokenSecret, {
    expiresIn: auth.jwt.accessTokenExpiry,
    issuer: auth.jwt.issuer,
    audience: auth.jwt.audience,
  });

  const refreshToken = jwt.sign(
    { sub: payload.sub, type: 'refresh' },
    auth.jwt.refreshTokenSecret,
    {
      expiresIn: auth.jwt.refreshTokenExpiry,
      issuer: auth.jwt.issuer,
      audience: auth.jwt.audience,
    }
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: 900, // 15 minutes
  };
};

/**
 * Verify access token
 * @param {string} token - JWT token
 * @returns {Object} Decoded payload
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, auth.jwt.accessTokenSecret, {
    issuer: auth.jwt.issuer,
    audience: auth.jwt.audience,
  });
};

/**
 * Verify refresh token
 * @param {string} token - Refresh token
 * @returns {Object} Decoded payload
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, auth.jwt.refreshTokenSecret, {
    issuer: auth.jwt.issuer,
    audience: auth.jwt.audience,
  });
};

/**
 * Rotate refresh token
 * @param {string} oldToken - Old refresh token
 * @param {Object} payload - New payload
 * @returns {Object} New tokens
 */
const rotateRefreshToken = (oldToken, payload) => {
  // In production, you would blacklist the old token
  return generateTokens(payload);
};

/**
 * Create session
 * @param {string} userId - User ID
 * @param {Object} context - Session context
 * @returns {Promise<Object>} Session info
 */
const createSession = async (userId, context) => {
  const sessionId = crypto.randomUUID();
  const fingerprint = generateDeviceFingerprint(context.req);
  const deviceInfo = parseUserAgent(context.req.headers['user-agent']);

  const session = {
    id: sessionId,
    userId,
    fingerprint,
    deviceInfo,
    ipAddress: context.ip,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
  };

  const key = `sessions:${userId}`;

  if (redisAvailable && redis) {
    // Get existing sessions
    const sessions = await redis.get(key);
    let sessionList = sessions ? JSON.parse(sessions) : [];

    // Enforce max concurrent sessions
    if (sessionList.length >= auth.session.maxConcurrent) {
      sessionList.shift(); // Remove oldest
    }

    sessionList.push(session);

    await redis.setex(
      key,
      auth.session.absoluteTimeout / 1000,
      JSON.stringify(sessionList)
    );
  } else {
    let sessionList = memoryStore.sessions.get(userId) || [];

    if (sessionList.length >= auth.session.maxConcurrent) {
      sessionList.shift();
    }

    sessionList.push(session);
    memoryStore.sessions.set(userId, sessionList);
  }

  return session;
};

/**
 * Validate session
 * @param {string} userId - User ID
 * @param {string} sessionId - Session ID
 * @param {Object} context - Request context
 * @returns {Promise<boolean>}
 */
const validateSession = async (userId, sessionId, context) => {
  const key = `sessions:${userId}`;

  let sessionList = [];

  if (redisAvailable && redis) {
    const sessions = await redis.get(key);
    sessionList = sessions ? JSON.parse(sessions) : [];
  } else {
    sessionList = memoryStore.sessions.get(userId) || [];
  }

  const session = sessionList.find(s => s.id === sessionId);

  if (!session) {
    return false;
  }

  // Check absolute timeout
  if (Date.now() - session.createdAt > auth.session.absoluteTimeout) {
    await terminateSession(userId, sessionId);
    return false;
  }

  // Check idle timeout
  if (Date.now() - session.lastActiveAt > auth.session.idleTimeout) {
    await terminateSession(userId, sessionId);
    return false;
  }

  // Check IP binding
  if (auth.session.bindToIp && session.ipAddress !== context.ip) {
    return false;
  }

  // Check device binding
  if (auth.session.bindToDevice) {
    const fingerprint = generateDeviceFingerprint(context.req);
    if (session.fingerprint !== fingerprint) {
      return false;
    }
  }

  // Update last active
  session.lastActiveAt = Date.now();

  if (redisAvailable && redis) {
    await redis.setex(
      key,
      auth.session.absoluteTimeout / 1000,
      JSON.stringify(sessionList)
    );
  }

  return true;
};

/**
 * Terminate session
 * @param {string} userId - User ID
 * @param {string} sessionId - Session ID
 */
const terminateSession = async (userId, sessionId) => {
  const key = `sessions:${userId}`;

  if (redisAvailable && redis) {
    const sessions = await redis.get(key);
    if (sessions) {
      const sessionList = JSON.parse(sessions).filter(s => s.id !== sessionId);
      await redis.setex(
        key,
        auth.session.absoluteTimeout / 1000,
        JSON.stringify(sessionList)
      );
    }
  } else {
    const sessionList = memoryStore.sessions.get(userId) || [];
    memoryStore.sessions.set(
      userId,
      sessionList.filter(s => s.id !== sessionId)
    );
  }
};

/**
 * Get active sessions for user
 * @param {string} userId - User ID
 * @returns {Promise<Array>}
 */
const getActiveSessions = async (userId) => {
  const key = `sessions:${userId}`;

  if (redisAvailable && redis) {
    const sessions = await redis.get(key);
    return sessions ? JSON.parse(sessions) : [];
  }

  return memoryStore.sessions.get(userId) || [];
};

module.exports = {
  hashData,
  compareHash,
  recordFailedAttempt,
  checkAccountLock,
  clearFailedAttempts,
  generateDeviceFingerprint,
  parseUserAgent,
  isKnownDevice,
  registerDevice,
  detectSuspiciousLogin,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  rotateRefreshToken,
  createSession,
  validateSession,
  terminateSession,
  getActiveSessions,
};
