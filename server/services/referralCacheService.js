/**
 * Referral Cache Service
 * Specialized caching for referral data and statistics
 * Optimized for high-volume referral operations
 */

const enhancedCacheService = require('./enhancedCacheService.js');
const { keyHelpers } = require('../config/redis.js');
const performanceConfig = require('../config/performance.js');

const { cache: config } = performanceConfig;

/**
 * Referral Cache Service
 */
class ReferralCacheService {
  constructor() {
    this.TTL = config.l2.ttlSeconds.referral;
    
    this.TAGS = {
      REFERRAL: 'referral',
      REFERRAL_USER: 'referral:user',
      REFERRAL_JOB: 'referral:job',
      REFERRAL_COMPANY: 'referral:company',
      REFERRAL_STATS: 'referral:stats',
      REFERRAL_LEADERBOARD: 'referral:leaderboard',
      REFERRAL_NETWORK: 'referral:network',
      REFERRAL_PAYOUT: 'referral:payout',
    };
  }
  
  /**
   * Generate cache key for referral
   */
  _getReferralKey(referralId) {
    return keyHelpers.referral(referralId);
  }
  
  /**
   * Generate cache key for user referrals
   */
  _getUserReferralsKey(userId, filters = {}) {
    const filterHash = this._hashFilters(filters);
    return keyHelpers.create(config.keyPrefix.referral, 'user', userId, filterHash);
  }
  
  /**
   * Generate cache key for job referrals
   */
  _getJobReferralsKey(jobId, filters = {}) {
    const filterHash = this._hashFilters(filters);
    return keyHelpers.create(config.keyPrefix.referral, 'job', jobId, filterHash);
  }
  
  /**
   * Generate cache key for company referrals
   */
  _getCompanyReferralsKey(companyId, filters = {}) {
    const filterHash = this._hashFilters(filters);
    return keyHelpers.create(config.keyPrefix.referral, 'company', companyId, filterHash);
  }
  
  /**
   * Generate cache key for referral stats
   */
  _getReferralStatsKey(entityType, entityId) {
    return keyHelpers.create(config.keyPrefix.referral, 'stats', entityType, entityId);
  }
  
  /**
   * Generate cache key for leaderboard
   */
  _getLeaderboardKey(period = 'all', category = 'earnings') {
    return keyHelpers.create(config.keyPrefix.referral, 'leaderboard', period, category);
  }
  
  /**
   * Generate cache key for referral network
   */
  _getNetworkKey(userId) {
    return keyHelpers.create(config.keyPrefix.referral, 'network', userId);
  }
  
  /**
   * Generate cache key for payout summary
   */
  _getPayoutSummaryKey(userId) {
    return keyHelpers.create(config.keyPrefix.referral, 'payout', userId);
  }
  
  /**
   * Hash filters for cache key
   */
  _hashFilters(filters) {
    const sorted = Object.keys(filters)
      .sort()
      .reduce((acc, key) => {
        acc[key] = filters[key];
        return acc;
      }, {});
    
    return Buffer.from(JSON.stringify(sorted)).toString('base64').substring(0, 16);
  }
  
  /**
   * Get referral by ID
   */
  async getReferral(referralId) {
    const key = this._getReferralKey(referralId);
    return enhancedCacheService.get(key);
  }
  
  /**
   * Cache referral
   */
  async setReferral(referralId, referralData) {
    const key = this._getReferralKey(referralId);
    return enhancedCacheService.set(key, referralData, {
      ttl: this.TTL,
      tags: [
        this.TAGS.REFERRAL,
        `${this.TAGS.REFERRAL}:${referralId}`,
        `${this.TAGS.REFERRAL_USER}:${referralData.referrerId}`,
        `${this.TAGS.REFERRAL_JOB}:${referralData.jobId}`,
      ],
    });
  }
  
  /**
   * Delete referral from cache
   */
  async deleteReferral(referralId) {
    const key = this._getReferralKey(referralId);
    await enhancedCacheService.delete(key);
    await this.invalidateReferralRelated(referralId);
  }
  
  /**
   * Get user referrals
   */
  async getUserReferrals(userId, filters = {}) {
    const key = this._getUserReferralsKey(userId, filters);
    return enhancedCacheService.get(key);
  }
  
  /**
   * Cache user referrals
   */
  async setUserReferrals(userId, filters, referrals, pagination) {
    const key = this._getUserReferralsKey(userId, filters);
    const data = { referrals, pagination, cachedAt: Date.now() };
    
    return enhancedCacheService.set(key, data, {
      ttl: this.TTL,
      tags: [this.TAGS.REFERRAL_USER, `${this.TAGS.REFERRAL_USER}:${userId}`],
    });
  }
  
  /**
   * Get job referrals
   */
  async getJobReferrals(jobId, filters = {}) {
    const key = this._getJobReferralsKey(jobId, filters);
    return enhancedCacheService.get(key);
  }
  
  /**
   * Cache job referrals
   */
  async setJobReferrals(jobId, filters, referrals, pagination) {
    const key = this._getJobReferralsKey(jobId, filters);
    const data = { referrals, pagination, cachedAt: Date.now() };
    
    return enhancedCacheService.set(key, data, {
      ttl: this.TTL,
      tags: [this.TAGS.REFERRAL_JOB, `${this.TAGS.REFERRAL_JOB}:${jobId}`],
    });
  }
  
  /**
   * Get company referrals
   */
  async getCompanyReferrals(companyId, filters = {}) {
    const key = this._getCompanyReferralsKey(companyId, filters);
    return enhancedCacheService.get(key);
  }
  
  /**
   * Cache company referrals
   */
  async setCompanyReferrals(companyId, filters, referrals, pagination) {
    const key = this._getCompanyReferralsKey(companyId, filters);
    const data = { referrals, pagination, cachedAt: Date.now() };
    
    return enhancedCacheService.set(key, data, {
      ttl: this.TTL,
      tags: [this.TAGS.REFERRAL_COMPANY, `${this.TAGS.REFERRAL_COMPANY}:${companyId}`],
    });
  }
  
  /**
   * Get referral stats
   */
  async getReferralStats(entityType, entityId) {
    const key = this._getReferralStatsKey(entityType, entityId);
    return enhancedCacheService.get(key);
  }
  
  /**
   * Cache referral stats
   */
  async setReferralStats(entityType, entityId, stats) {
    const key = this._getReferralStatsKey(entityType, entityId);
    return enhancedCacheService.set(key, stats, {
      ttl: config.l2.ttlSeconds.short,
      tags: [this.TAGS.REFERRAL_STATS, `${this.TAGS.REFERRAL_STATS}:${entityType}:${entityId}`],
    });
  }
  
  /**
   * Get leaderboard
   */
  async getLeaderboard(period = 'all', category = 'earnings') {
    const key = this._getLeaderboardKey(period, category);
    return enhancedCacheService.get(key);
  }
  
  /**
   * Cache leaderboard
   */
  async setLeaderboard(period, category, leaderboard) {
    const key = this._getLeaderboardKey(period, category);
    const data = { leaderboard, cachedAt: Date.now() };
    
    return enhancedCacheService.set(key, data, {
      ttl: config.l2.ttlSeconds.medium,
      tags: [this.TAGS.REFERRAL_LEADERBOARD],
    });
  }
  
  /**
   * Get referral network
   */
  async getReferralNetwork(userId) {
    const key = this._getNetworkKey(userId);
    return enhancedCacheService.get(key);
  }
  
  /**
   * Cache referral network
   */
  async setReferralNetwork(userId, network) {
    const key = this._getNetworkKey(userId);
    return enhancedCacheService.set(key, network, {
      ttl: this.TTL,
      tags: [this.TAGS.REFERRAL_NETWORK, `${this.TAGS.REFERRAL_NETWORK}:${userId}`],
    });
  }
  
  /**
   * Get payout summary
   */
  async getPayoutSummary(userId) {
    const key = this._getPayoutSummaryKey(userId);
    return enhancedCacheService.get(key);
  }
  
  /**
   * Cache payout summary
   */
  async setPayoutSummary(userId, summary) {
    const key = this._getPayoutSummaryKey(userId);
    return enhancedCacheService.set(key, summary, {
      ttl: config.l2.ttlSeconds.short,
      tags: [this.TAGS.REFERRAL_PAYOUT, `${this.TAGS.REFERRAL_PAYOUT}:${userId}`],
    });
  }
  
  /**
   * Get or fetch referral (cache-aside)
   */
  async getOrFetchReferral(referralId, fetchFn) {
    const cached = await this.getReferral(referralId);
    if (cached) return cached;
    
    const referral = await fetchFn();
    if (referral) {
      await this.setReferral(referralId, referral);
    }
    return referral;
  }
  
  /**
   * Get or fetch user referrals (cache-aside)
   */
  async getOrFetchUserReferrals(userId, filters, fetchFn) {
    const cached = await this.getUserReferrals(userId, filters);
    if (cached) return cached;
    
    const result = await fetchFn();
    if (result) {
      await this.setUserReferrals(userId, filters, result.referrals, result.pagination);
    }
    return result;
  }
  
  /**
   * Invalidate referral cache
   */
  async invalidateReferral(referralId) {
    await enhancedCacheService.deleteByTag(`${this.TAGS.REFERRAL}:${referralId}`);
  }
  
  /**
   * Invalidate referral-related caches
   */
  async invalidateReferralRelated(referralId) {
    const referral = await this.getReferral(referralId);
    
    const tagsToInvalidate = [
      this.TAGS.REFERRAL_STATS,
      this.TAGS.REFERRAL_LEADERBOARD,
    ];
    
    if (referral) {
      tagsToInvalidate.push(`${this.TAGS.REFERRAL_USER}:${referral.referrerId}`);
      tagsToInvalidate.push(`${this.TAGS.REFERRAL_JOB}:${referral.jobId}`);
      if (referral.companyId) {
        tagsToInvalidate.push(`${this.TAGS.REFERRAL_COMPANY}:${referral.companyId}`);
      }
    }
    
    for (const tag of tagsToInvalidate) {
      await enhancedCacheService.deleteByTag(tag);
    }
  }
  
  /**
   * Invalidate user referrals
   */
  async invalidateUserReferrals(userId) {
    await enhancedCacheService.deleteByTag(`${this.TAGS.REFERRAL_USER}:${userId}`);
    await enhancedCacheService.deleteByTag(`${this.TAGS.REFERRAL_STATS}:user:${userId}`);
    await enhancedCacheService.deleteByTag(`${this.TAGS.REFERRAL_PAYOUT}:${userId}`);
  }
  
  /**
   * Invalidate job referrals
   */
  async invalidateJobReferrals(jobId) {
    await enhancedCacheService.deleteByTag(`${this.TAGS.REFERRAL_JOB}:${jobId}`);
    await enhancedCacheService.deleteByTag(`${this.TAGS.REFERRAL_STATS}:job:${jobId}`);
  }
  
  /**
   * Invalidate company referrals
   */
  async invalidateCompanyReferrals(companyId) {
    await enhancedCacheService.deleteByTag(`${this.TAGS.REFERRAL_COMPANY}:${companyId}`);
    await enhancedCacheService.deleteByTag(`${this.TAGS.REFERRAL_STATS}:company:${companyId}`);
  }
  
  /**
   * Invalidate all referral caches
   */
  async invalidateAllReferrals() {
    await enhancedCacheService.deleteByTag(this.TAGS.REFERRAL);
  }
  
  /**
   * Increment referral stat counter
   */
  async incrementStatCounter(entityType, entityId, statName, increment = 1) {
    const key = keyHelpers.create(config.keyPrefix.stats, 'referral', entityType, entityId, statName);
    
    try {
      const client = enhancedCacheService.l2;
      if (!client) return;
      
      await client.incrby(key, increment);
      await client.expire(key, 86400); // 24 hours
    } catch (error) {
      // Silent fail for stats
    }
  }
  
  /**
   * Get referral stat counter
   */
  async getStatCounter(entityType, entityId, statName) {
    const key = keyHelpers.create(config.keyPrefix.stats, 'referral', entityType, entityId, statName);
    
    try {
      const client = enhancedCacheService.l2;
      if (!client) return 0;
      
      const value = await client.get(key);
      return parseInt(value, 10) || 0;
    } catch (error) {
      return 0;
    }
  }
  
  /**
   * Track referral status change
   */
  async trackStatusChange(referralId, oldStatus, newStatus) {
    const key = keyHelpers.create(config.keyPrefix.stats, 'referral', 'transitions', referralId);
    
    try {
      const client = enhancedCacheService.l2;
      if (!client) return;
      
      const transition = {
        from: oldStatus,
        to: newStatus,
        timestamp: Date.now(),
      };
      
      await client.lpush(key, JSON.stringify(transition));
      await client.ltrim(key, 0, 99); // Keep last 100
      await client.expire(key, 604800); // 7 days
    } catch (error) {
      // Silent fail
    }
  }
  
  /**
   * Get referral status history
   */
  async getStatusHistory(referralId) {
    const key = keyHelpers.create(config.keyPrefix.stats, 'referral', 'transitions', referralId);
    
    try {
      const client = enhancedCacheService.l2;
      if (!client) return [];
      
      const history = await client.lrange(key, 0, -1);
      return history.map(h => JSON.parse(h));
    } catch (error) {
      return [];
    }
  }
  
  /**
   * Batch get referrals
   */
  async getReferralsBatch(referralIds) {
    const results = await Promise.allSettled(
      referralIds.map(id => this.getReferral(id))
    );
    
    return referralIds.map((id, i) => ({
      referralId: id,
      data: results[i].status === 'fulfilled' ? results[i].value : null,
      found: results[i].status === 'fulfilled' && results[i].value !== null,
    }));
  }
  
  /**
   * Warm cache with active referrals
   */
  async warmCache(activeReferralsFetcher, options = {}) {
    const { limit = 100 } = options;
    
    try {
      const referrals = await activeReferralsFetcher(limit);
      
      for (const referral of referrals) {
        await this.setReferral(referral._id || referral.id, referral);
      }
      
      console.log(`[ReferralCacheService] Warming complete: ${referrals.length} referrals cached`);
      return referrals.length;
    } catch (error) {
      console.error('[ReferralCacheService] Cache warming failed:', error.message);
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
const referralCacheService = new ReferralCacheService();

module.exports = referralCacheService;