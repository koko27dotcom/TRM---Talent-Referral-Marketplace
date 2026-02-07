/**
 * User Cache Service
 * Specialized caching for user profiles and authentication data
 * Optimized for high-frequency user data access
 */

const enhancedCacheService = require('./enhancedCacheService.js');
const { keyHelpers } = require('../config/redis.js');
const performanceConfig = require('../config/performance.js');

const { cache: config } = performanceConfig;

/**
 * User Cache Service
 */
class UserCacheService {
  constructor() {
    this.TTL = config.l2.ttlSeconds.user;
    this.SESSION_TTL = config.l2.ttlSeconds.session;
    
    this.TAGS = {
      USER: 'user',
      USER_PROFILE: 'user:profile',
      USER_AUTH: 'user:auth',
      USER_PERMISSIONS: 'user:permissions',
      USER_PREFERENCES: 'user:preferences',
      USER_STATS: 'user:stats',
      USER_ACTIVITY: 'user:activity',
      USER_REFERRER: 'user:referrer',
      SESSION: 'session',
      REFERRER_PROFILE: 'referrer:profile',
      COMPANY_USERS: 'company:users',
    };
  }
  
  /**
   * Generate cache key for user
   */
  _getUserKey(userId) {
    return keyHelpers.user(userId);
  }
  
  /**
   * Generate cache key for user profile
   */
  _getUserProfileKey(userId) {
    return keyHelpers.user(userId, 'profile');
  }
  
  /**
   * Generate cache key for user auth data
   */
  _getUserAuthKey(userId) {
    return keyHelpers.user(userId, 'auth');
  }
  
  /**
   * Generate cache key for user permissions
   */
  _getUserPermissionsKey(userId) {
    return keyHelpers.user(userId, 'permissions');
  }
  
  /**
   * Generate cache key for user preferences
   */
  _getUserPreferencesKey(userId) {
    return keyHelpers.user(userId, 'preferences');
  }
  
  /**
   * Generate cache key for user stats
   */
  _getUserStatsKey(userId) {
    return keyHelpers.user(userId, 'stats');
  }
  
  /**
   * Generate cache key for user activity
   */
  _getUserActivityKey(userId) {
    return keyHelpers.user(userId, 'activity');
  }
  
  /**
   * Generate cache key for referrer profile
   */
  _getReferrerProfileKey(userId) {
    return keyHelpers.create(config.keyPrefix.user, 'referrer', userId);
  }
  
  /**
   * Generate cache key for session
   */
  _getSessionKey(sessionId) {
    return keyHelpers.session(sessionId);
  }
  
  /**
   * Generate cache key for company users
   */
  _getCompanyUsersKey(companyId) {
    return keyHelpers.create(config.keyPrefix.user, 'company', companyId);
  }
  
  /**
   * Get user by ID
   */
  async getUser(userId) {
    const key = this._getUserKey(userId);
    return enhancedCacheService.get(key);
  }
  
  /**
   * Cache user
   */
  async setUser(userId, userData) {
    const key = this._getUserKey(userId);
    
    // Sanitize sensitive data before caching
    const sanitizedData = this._sanitizeUserData(userData);
    
    return enhancedCacheService.set(key, sanitizedData, {
      ttl: this.TTL,
      tags: [this.TAGS.USER, `${this.TAGS.USER}:${userId}`],
    });
  }
  
  /**
   * Delete user from cache
   */
  async deleteUser(userId) {
    const key = this._getUserKey(userId);
    await enhancedCacheService.delete(key);
    
    // Invalidate all user-related caches
    await this.invalidateUserRelated(userId);
  }
  
  /**
   * Get user profile
   */
  async getUserProfile(userId) {
    const key = this._getUserProfileKey(userId);
    return enhancedCacheService.get(key);
  }
  
  /**
   * Cache user profile
   */
  async setUserProfile(userId, profileData) {
    const key = this._getUserProfileKey(userId);
    return enhancedCacheService.set(key, profileData, {
      ttl: this.TTL,
      tags: [this.TAGS.USER_PROFILE, `${this.TAGS.USER}:${userId}`],
    });
  }
  
  /**
   * Get user auth data
   */
  async getUserAuth(userId) {
    const key = this._getUserAuthKey(userId);
    return enhancedCacheService.get(key);
  }
  
  /**
   * Cache user auth data
   */
  async setUserAuth(userId, authData) {
    const key = this._getUserAuthKey(userId);
    return enhancedCacheService.set(key, authData, {
      ttl: this.TTL,
      tags: [this.TAGS.USER_AUTH, `${this.TAGS.USER}:${userId}`],
    });
  }
  
  /**
   * Get user permissions
   */
  async getUserPermissions(userId) {
    const key = this._getUserPermissionsKey(userId);
    return enhancedCacheService.get(key);
  }
  
  /**
   * Cache user permissions
   */
  async setUserPermissions(userId, permissions) {
    const key = this._getUserPermissionsKey(userId);
    return enhancedCacheService.set(key, permissions, {
      ttl: this.TTL,
      tags: [this.TAGS.USER_PERMISSIONS, `${this.TAGS.USER}:${userId}`],
    });
  }
  
  /**
   * Get user preferences
   */
  async getUserPreferences(userId) {
    const key = this._getUserPreferencesKey(userId);
    return enhancedCacheService.get(key);
  }
  
  /**
   * Cache user preferences
   */
  async setUserPreferences(userId, preferences) {
    const key = this._getUserPreferencesKey(userId);
    return enhancedCacheService.set(key, preferences, {
      ttl: this.TTL,
      tags: [this.TAGS.USER_PREFERENCES, `${this.TAGS.USER}:${userId}`],
    });
  }
  
  /**
   * Get user stats
   */
  async getUserStats(userId) {
    const key = this._getUserStatsKey(userId);
    return enhancedCacheService.get(key);
  }
  
  /**
   * Cache user stats
   */
  async setUserStats(userId, stats) {
    const key = this._getUserStatsKey(userId);
    return enhancedCacheService.set(key, stats, {
      ttl: config.l2.ttlSeconds.short,
      tags: [this.TAGS.USER_STATS, `${this.TAGS.USER}:${userId}`],
    });
  }
  
  /**
   * Get referrer profile
   */
  async getReferrerProfile(userId) {
    const key = this._getReferrerProfileKey(userId);
    return enhancedCacheService.get(key);
  }
  
  /**
   * Cache referrer profile
   */
  async setReferrerProfile(userId, profileData) {
    const key = this._getReferrerProfileKey(userId);
    return enhancedCacheService.set(key, profileData, {
      ttl: this.TTL,
      tags: [this.TAGS.REFERRER_PROFILE, `${this.TAGS.USER}:${userId}`],
    });
  }
  
  /**
   * Get session data
   */
  async getSession(sessionId) {
    const key = this._getSessionKey(sessionId);
    return enhancedCacheService.get(key);
  }
  
  /**
   * Cache session data
   */
  async setSession(sessionId, sessionData) {
    const key = this._getSessionKey(sessionId);
    return enhancedCacheService.set(key, sessionData, {
      ttl: this.SESSION_TTL,
      tags: [this.TAGS.SESSION, `${this.TAGS.USER}:${sessionData.userId}`],
    });
  }
  
  /**
   * Delete session
   */
  async deleteSession(sessionId) {
    const key = this._getSessionKey(sessionId);
    return enhancedCacheService.delete(key);
  }
  
  /**
   * Get company users
   */
  async getCompanyUsers(companyId) {
    const key = this._getCompanyUsersKey(companyId);
    return enhancedCacheService.get(key);
  }
  
  /**
   * Cache company users
   */
  async setCompanyUsers(companyId, users) {
    const key = this._getCompanyUsersKey(companyId);
    return enhancedCacheService.set(key, users, {
      ttl: this.TTL,
      tags: [this.TAGS.COMPANY_USERS, `${this.TAGS.COMPANY_USERS}:${companyId}`],
    });
  }
  
  /**
   * Get or fetch user (cache-aside)
   */
  async getOrFetchUser(userId, fetchFn) {
    const cached = await this.getUser(userId);
    if (cached) return cached;
    
    const user = await fetchFn();
    if (user) {
      await this.setUser(userId, user);
    }
    return user;
  }
  
  /**
   * Get or fetch user profile (cache-aside)
   */
  async getOrFetchUserProfile(userId, fetchFn) {
    const cached = await this.getUserProfile(userId);
    if (cached) return cached;
    
    const profile = await fetchFn();
    if (profile) {
      await this.setUserProfile(userId, profile);
    }
    return profile;
  }
  
  /**
   * Get or fetch referrer profile (cache-aside)
   */
  async getOrFetchReferrerProfile(userId, fetchFn) {
    const cached = await this.getReferrerProfile(userId);
    if (cached) return cached;
    
    const profile = await fetchFn();
    if (profile) {
      await this.setReferrerProfile(userId, profile);
    }
    return profile;
  }
  
  /**
   * Invalidate user cache
   */
  async invalidateUser(userId) {
    await enhancedCacheService.deleteByTag(`${this.TAGS.USER}:${userId}`);
  }
  
  /**
   * Invalidate user-related caches
   */
  async invalidateUserRelated(userId) {
    const tagsToInvalidate = [
      `${this.TAGS.USER}:${userId}`,
      this.TAGS.USER_PROFILE,
      this.TAGS.USER_AUTH,
      this.TAGS.USER_PERMISSIONS,
      this.TAGS.USER_PREFERENCES,
      this.TAGS.USER_STATS,
      this.TAGS.REFERRER_PROFILE,
    ];
    
    for (const tag of tagsToInvalidate) {
      await enhancedCacheService.deleteByTag(tag);
    }
  }
  
  /**
   * Invalidate all user caches
   */
  async invalidateAllUsers() {
    await enhancedCacheService.deleteByTag(this.TAGS.USER);
  }
  
  /**
   * Invalidate company users
   */
  async invalidateCompanyUsers(companyId) {
    await enhancedCacheService.deleteByTag(`${this.TAGS.COMPANY_USERS}:${companyId}`);
  }
  
  /**
   * Sanitize user data before caching
   */
  _sanitizeUserData(userData) {
    if (!userData) return null;
    
    const sanitized = { ...userData };
    
    // Remove sensitive fields
    delete sanitized.password;
    delete sanitized.passwordResetToken;
    delete sanitized.passwordResetExpires;
    delete sanitized.emailVerificationToken;
    delete sanitized.twoFactorSecret;
    delete sanitized.apiKeys;
    
    return sanitized;
  }
  
  /**
   * Batch get users
   */
  async getUsersBatch(userIds) {
    const results = await Promise.allSettled(
      userIds.map(id => this.getUser(id))
    );
    
    return userIds.map((id, i) => ({
      userId: id,
      data: results[i].status === 'fulfilled' ? results[i].value : null,
      found: results[i].status === 'fulfilled' && results[i].value !== null,
    }));
  }
  
  /**
   * Batch cache users
   */
  async setUsersBatch(users) {
    await Promise.all(
      users.map(({ userId, data }) => this.setUser(userId, data))
    );
  }
  
  /**
   * Track user activity
   */
  async trackActivity(userId, activity) {
    const key = this._getUserActivityKey(userId);
    
    try {
      const client = enhancedCacheService.l2;
      if (!client) return;
      
      const activityData = {
        ...activity,
        timestamp: Date.now(),
      };
      
      // Add to sorted set with timestamp as score
      await client.zadd(key, Date.now(), JSON.stringify(activityData));
      
      // Keep only last 100 activities
      await client.zremrangebyrank(key, 0, -101);
      
      // Set expiry
      await client.expire(key, 86400); // 24 hours
    } catch (error) {
      // Silent fail for activity tracking
    }
  }
  
  /**
   * Get user activity
   */
  async getUserActivity(userId, limit = 20) {
    const key = this._getUserActivityKey(userId);
    
    try {
      const client = enhancedCacheService.l2;
      if (!client) return [];
      
      const activities = await client.zrevrange(key, 0, limit - 1);
      return activities.map(a => JSON.parse(a));
    } catch (error) {
      return [];
    }
  }
  
  /**
   * Update user field (partial update)
   */
  async updateUserField(userId, field, value) {
    const key = this._getUserKey(userId);
    
    try {
      const client = enhancedCacheService.l2;
      if (!client) return false;
      
      // Get current data
      const current = await this.getUser(userId);
      if (!current) return false;
      
      // Update field
      const updated = { ...current, [field]: value };
      await this.setUser(userId, updated);
      
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Get online users count
   */
  async getOnlineUsersCount() {
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
   * Warm cache with active users
   */
  async warmCache(activeUsersFetcher, options = {}) {
    const { limit = 100 } = options;
    
    try {
      const users = await activeUsersFetcher(limit);
      
      for (const user of users) {
        await this.setUser(user._id || user.id, user);
        
        // Cache profile if referrer
        if (user.role === 'referrer' && user.referrerProfile) {
          await this.setReferrerProfile(user._id || user.id, user.referrerProfile);
        }
      }
      
      console.log(`[UserCacheService] Warming complete: ${users.length} users cached`);
      return users.length;
    } catch (error) {
      console.error('[UserCacheService] Cache warming failed:', error.message);
      return 0;
    }
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    return enhancedCacheService.getStats();
  }
}

// Create singleton instance
const userCacheService = new UserCacheService();

module.exports = userCacheService;