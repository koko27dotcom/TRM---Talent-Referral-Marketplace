/**
 * Session Cache Service
 * Specialized caching for user sessions and authentication state
 * Optimized for high-frequency session validation
 */

const enhancedCacheService = require('./enhancedCacheService.js');
const { keyHelpers } = require('../config/redis.js');
const performanceConfig = require('../config/performance.js');

const { cache: config } = performanceConfig;

/**
 * Session Cache Service
 */
class SessionCacheService {
  constructor() {
    this.SESSION_TTL = config.l2.ttlSeconds.session;
    this.SHORT_TTL = config.l2.ttlSeconds.short;
    
    this.TAGS = {
      SESSION: 'session',
      SESSION_USER: 'session:user',
      SESSION_DEVICE: 'session:device',
      AUTH_TOKEN: 'auth:token',
      AUTH_REFRESH: 'auth:refresh',
      AUTH_BLACKLIST: 'auth:blacklist',
      RATE_LIMIT: 'ratelimit',
      CSRF: 'csrf',
    };
  }
  
  /**
   * Generate cache key for session
   */
  _getSessionKey(sessionId) {
    return keyHelpers.session(sessionId);
  }
  
  /**
   * Generate cache key for user sessions
   */
  _getUserSessionsKey(userId) {
    return keyHelpers.create(config.keyPrefix.session, 'user', userId);
  }
  
  /**
   * Generate cache key for auth token
   */
  _getAuthTokenKey(token) {
    const tokenHash = this._hashToken(token);
    return keyHelpers.create(config.keyPrefix.session, 'token', tokenHash);
  }
  
  /**
   * Generate cache key for refresh token
   */
  _getRefreshTokenKey(token) {
    const tokenHash = this._hashToken(token);
    return keyHelpers.create(config.keyPrefix.session, 'refresh', tokenHash);
  }
  
  /**
   * Generate cache key for blacklisted token
   */
  _getBlacklistKey(token) {
    const tokenHash = this._hashToken(token);
    return keyHelpers.create(config.keyPrefix.session, 'blacklist', tokenHash);
  }
  
  /**
   * Generate cache key for rate limit
   */
  _getRateLimitKey(identifier, action) {
    return keyHelpers.rateLimit(`${identifier}:${action}`);
  }
  
  /**
   * Generate cache key for CSRF token
   */
  _getCSRFKey(sessionId) {
    return keyHelpers.create(config.keyPrefix.session, 'csrf', sessionId);
  }
  
  /**
   * Hash token for cache key
   */
  _hashToken(token) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex').substring(0, 16);
  }
  
  /**
   * Get session data
   */
  async getSession(sessionId) {
    const key = this._getSessionKey(sessionId);
    return enhancedCacheService.get(key);
  }
  
  /**
   * Create session
   */
  async createSession(sessionId, sessionData) {
    const key = this._getSessionKey(sessionId);
    const data = {
      ...sessionData,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };
    
    // Store session
    await enhancedCacheService.set(key, data, {
      ttl: this.SESSION_TTL,
      tags: [this.TAGS.SESSION, `${this.TAGS.SESSION_USER}:${sessionData.userId}`],
    });
    
    // Add to user's session list
    await this._addUserSession(sessionData.userId, sessionId);
    
    return data;
  }
  
  /**
   * Update session activity
   */
  async updateSessionActivity(sessionId) {
    const key = this._getSessionKey(sessionId);
    const session = await this.getSession(sessionId);
    
    if (session) {
      session.lastActivity = Date.now();
      await enhancedCacheService.set(key, session, {
        ttl: this.SESSION_TTL,
        tags: [this.TAGS.SESSION, `${this.TAGS.SESSION_USER}:${session.userId}`],
      });
    }
    
    return session;
  }
  
  /**
   * Delete session
   */
  async deleteSession(sessionId) {
    const session = await this.getSession(sessionId);
    
    if (session) {
      // Remove from user's session list
      await this._removeUserSession(session.userId, sessionId);
    }
    
    const key = this._getSessionKey(sessionId);
    await enhancedCacheService.delete(key);
  }
  
  /**
   * Get all sessions for user
   */
  async getUserSessions(userId) {
    const key = this._getUserSessionsKey(userId);
    
    try {
      const client = enhancedCacheService.l2;
      if (!client) return [];
      
      const sessionIds = await client.smembers(key);
      const sessions = [];
      
      for (const sessionId of sessionIds) {
        const session = await this.getSession(sessionId);
        if (session) {
          sessions.push(session);
        }
      }
      
      return sessions;
    } catch (error) {
      return [];
    }
  }
  
  /**
   * Add session to user's session list
   */
  async _addUserSession(userId, sessionId) {
    const key = this._getUserSessionsKey(userId);
    
    try {
      const client = enhancedCacheService.l2;
      if (!client) return;
      
      await client.sadd(key, sessionId);
      await client.expire(key, this.SESSION_TTL);
    } catch (error) {
      // Silent fail
    }
  }
  
  /**
   * Remove session from user's session list
   */
  async _removeUserSession(userId, sessionId) {
    const key = this._getUserSessionsKey(userId);
    
    try {
      const client = enhancedCacheService.l2;
      if (!client) return;
      
      await client.srem(key, sessionId);
    } catch (error) {
      // Silent fail
    }
  }
  
  /**
   * Invalidate all user sessions
   */
  async invalidateUserSessions(userId) {
    const sessions = await this.getUserSessions(userId);
    
    for (const session of sessions) {
      await this.deleteSession(session.sessionId);
    }
  }
  
  /**
   * Store auth token
   */
  async storeAuthToken(token, tokenData) {
    const key = this._getAuthTokenKey(token);
    
    return enhancedCacheService.set(key, tokenData, {
      ttl: tokenData.expiresIn || this.SHORT_TTL,
      tags: [this.TAGS.AUTH_TOKEN, `${this.TAGS.SESSION_USER}:${tokenData.userId}`],
    });
  }
  
  /**
   * Get auth token data
   */
  async getAuthToken(token) {
    const key = this._getAuthTokenKey(token);
    return enhancedCacheService.get(key);
  }
  
  /**
   * Store refresh token
   */
  async storeRefreshToken(token, tokenData) {
    const key = this._getRefreshTokenKey(token);
    
    return enhancedCacheService.set(key, tokenData, {
      ttl: tokenData.expiresIn || this.SESSION_TTL,
      tags: [this.TAGS.AUTH_REFRESH, `${this.TAGS.SESSION_USER}:${tokenData.userId}`],
    });
  }
  
  /**
   * Get refresh token data
   */
  async getRefreshToken(token) {
    const key = this._getRefreshTokenKey(token);
    return enhancedCacheService.get(key);
  }
  
  /**
   * Blacklist token
   */
  async blacklistToken(token, expiresIn) {
    const key = this._getBlacklistKey(token);
    
    return enhancedCacheService.set(key, {
      blacklistedAt: Date.now(),
      expiresAt: Date.now() + (expiresIn * 1000),
    }, {
      ttl: expiresIn,
      tags: [this.TAGS.AUTH_BLACKLIST],
    });
  }
  
  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(token) {
    const key = this._getBlacklistKey(token);
    const blacklisted = await enhancedCacheService.get(key);
    return blacklisted !== null;
  }
  
  /**
   * Check rate limit
   */
  async checkRateLimit(identifier, action, limit, windowSeconds) {
    const key = this._getRateLimitKey(identifier, action);
    
    try {
      const client = enhancedCacheService.l2;
      if (!client) return { allowed: true, remaining: limit };
      
      const current = await client.get(key);
      const count = parseInt(current, 10) || 0;
      
      if (count >= limit) {
        const ttl = await client.ttl(key);
        return {
          allowed: false,
          remaining: 0,
          resetTime: Date.now() + (ttl * 1000),
        };
      }
      
      // Increment counter
      const pipeline = client.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, windowSeconds);
      await pipeline.exec();
      
      return {
        allowed: true,
        remaining: limit - count - 1,
      };
    } catch (error) {
      // Allow request on error
      return { allowed: true, remaining: limit };
    }
  }
  
  /**
   * Store CSRF token
   */
  async storeCSRFToken(sessionId, csrfToken) {
    const key = this._getCSRFKey(sessionId);
    
    return enhancedCacheService.set(key, {
      token: csrfToken,
      createdAt: Date.now(),
    }, {
      ttl: this.SESSION_TTL,
      tags: [this.TAGS.CSRF],
    });
  }
  
  /**
   * Validate CSRF token
   */
  async validateCSRFToken(sessionId, csrfToken) {
    const key = this._getCSRFKey(sessionId);
    const stored = await enhancedCacheService.get(key);
    
    if (!stored || stored.token !== csrfToken) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Get session count
   */
  async getSessionCount() {
    try {
      const client = enhancedCacheService.l2;
      if (!client) return 0;
      
      const pattern = keyHelpers.create(config.keyPrefix.session, '*');
      const keys = await client.keys(pattern);
      return keys.length;
    } catch (error) {
      return 0;
    }
  }
  
  /**
   * Get active user count
   */
  async getActiveUserCount(timeWindowSeconds = 300) {
    try {
      const client = enhancedCacheService.l2;
      if (!client) return 0;
      
      const pattern = keyHelpers.create(config.keyPrefix.session, '*');
      const keys = await client.keys(pattern);
      
      let activeCount = 0;
      const cutoff = Date.now() - (timeWindowSeconds * 1000);
      
      for (const key of keys) {
        const session = await enhancedCacheService.get(key);
        if (session && session.lastActivity > cutoff) {
          activeCount++;
        }
      }
      
      return activeCount;
    } catch (error) {
      return 0;
    }
  }
  
  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions() {
    try {
      const client = enhancedCacheService.l2;
      if (!client) return 0;
      
      const pattern = keyHelpers.create(config.keyPrefix.session, '*');
      const keys = await client.keys(pattern);
      let cleaned = 0;
      
      for (const key of keys) {
        const ttl = await client.ttl(key);
        if (ttl <= 0) {
          await client.del(key);
          cleaned++;
        }
      }
      
      return cleaned;
    } catch (error) {
      return 0;
    }
  }
  
  /**
   * Extend session TTL
   */
  async extendSession(sessionId, additionalSeconds) {
    const key = this._getSessionKey(sessionId);
    const session = await this.getSession(sessionId);
    
    if (session) {
      await enhancedCacheService.set(key, session, {
        ttl: additionalSeconds,
        tags: [this.TAGS.SESSION, `${this.TAGS.SESSION_USER}:${session.userId}`],
      });
      return true;
    }
    
    return false;
  }
  
  /**
   * Get session info for admin
   */
  async getSessionInfo(sessionId) {
    const session = await this.getSession(sessionId);
    if (!session) return null;
    
    return {
      sessionId,
      userId: session.userId,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      device: session.device,
      ip: session.ip,
    };
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    return enhancedCacheService.getStats();
  }
}

// Create singleton instance
const sessionCacheService = new SessionCacheService();

module.exports = sessionCacheService;