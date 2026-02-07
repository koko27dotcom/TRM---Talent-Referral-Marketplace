/**
 * CacheService
 * Multi-layer caching strategy (L1: In-memory, L2: Redis) for TRM performance & scalability
 * Features: Circuit breaker, graceful degradation, tagged invalidation, statistics tracking
 */

const { EventEmitter } = require('events');
const Redis = require('ioredis');

// Environment configuration with defaults
const CONFIG = {
  // Redis configuration
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT, 10) || 6379,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,
  REDIS_DB: parseInt(process.env.REDIS_DB, 10) || 0,

  // TTL configurations (in seconds)
  CACHE_L1_TTL: parseInt(process.env.CACHE_L1_TTL, 10) || 60,        // 1 minute for hot data
  CACHE_L2_TTL: parseInt(process.env.CACHE_L2_TTL, 10) || 300,       // 5 minutes default for warm data
  CACHE_SESSION_TTL: parseInt(process.env.CACHE_SESSION_TTL, 10) || 3600,  // 1 hour
  CACHE_USER_TTL: parseInt(process.env.CACHE_USER_TTL, 10) || 1800,  // 30 minutes
  CACHE_JOBS_TTL: parseInt(process.env.CACHE_JOBS_TTL, 10) || 600,   // 10 minutes

  // Circuit breaker configuration
  CIRCUIT_BREAKER_FAILURE_THRESHOLD: 5,
  CIRCUIT_BREAKER_RESET_TIMEOUT: 30000, // 30 seconds
  CIRCUIT_BREAKER_HALF_OPEN_REQUESTS: 3,

  // Memory limits
  L1_MAX_KEYS: 10000,
  L1_MAX_SIZE_BYTES: 50 * 1024 * 1024, // 50MB
};

/**
 * Cache entry with metadata
 */
class CacheEntry {
  constructor(value, ttl, tags = []) {
    this.value = value;
    this.createdAt = Date.now();
    this.expiresAt = this.createdAt + (ttl * 1000);
    this.tags = new Set(tags);
    this.size = this.calculateSize(value);
    this.accessCount = 0;
    this.lastAccessed = this.createdAt;
  }

  calculateSize(value) {
    try {
      return JSON.stringify(value).length;
    } catch {
      return 0;
    }
  }

  isExpired() {
    return Date.now() > this.expiresAt;
  }

  touch() {
    this.accessCount++;
    this.lastAccessed = Date.now();
  }
}

/**
 * L1 Cache - In-memory cache for hot data
 * Fast access with LRU eviction
 */
class L1Cache {
  constructor() {
    this.cache = new Map();
    this.tags = new Map(); // tag -> Set of keys
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      totalSize: 0,
    };
    this.startCleanupInterval();
  }

  /**
   * Get value from L1 cache
   * @param {string} key - Cache key
   * @returns {Object|null} Cache entry or null
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (entry.isExpired()) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    entry.touch();
    this.stats.hits++;
    return entry.value;
  }

  /**
   * Set value in L1 cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - TTL in seconds
   * @param {Array<string>} tags - Tags for invalidation
   */
  set(key, value, ttl = CONFIG.CACHE_L1_TTL, tags = []) {
    // Check memory limits and evict if necessary
    this.ensureSpace(key);

    const entry = new CacheEntry(value, ttl, tags);

    // Remove old entry size if updating
    if (this.cache.has(key)) {
      this.stats.totalSize -= this.cache.get(key).size;
    }

    this.cache.set(key, entry);
    this.stats.totalSize += entry.size;
    this.stats.sets++;

    // Index by tags
    for (const tag of tags) {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, new Set());
      }
      this.tags.get(tag).add(key);
    }
  }

  /**
   * Delete value from L1 cache
   * @param {string} key - Cache key
   * @returns {boolean} Success status
   */
  delete(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Remove from tag indexes
    for (const tag of entry.tags) {
      const tagSet = this.tags.get(tag);
      if (tagSet) {
        tagSet.delete(key);
        if (tagSet.size === 0) {
          this.tags.delete(tag);
        }
      }
    }

    this.stats.totalSize -= entry.size;
    this.cache.delete(key);
    this.stats.deletes++;
    return true;
  }

  /**
   * Ensure there's space for new entry using LRU eviction
   * @param {string} newKey - Key being added
   */
  ensureSpace(newKey) {
    // Check key count limit
    while (this.cache.size >= CONFIG.L1_MAX_KEYS && !this.cache.has(newKey)) {
      this.evictLRU();
    }

    // Check memory limit
    while (this.stats.totalSize >= CONFIG.L1_MAX_SIZE_BYTES && !this.cache.has(newKey)) {
      this.evictLRU();
    }
  }

  /**
   * Evict least recently used entry
   */
  evictLRU() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Invalidate entries by tag
   * @param {string} tag - Tag to invalidate
   * @returns {number} Number of entries invalidated
   */
  invalidateByTag(tag) {
    const keys = this.tags.get(tag);
    if (!keys) return 0;

    let count = 0;
    for (const key of keys) {
      if (this.delete(key)) count++;
    }
    this.tags.delete(tag);
    return count;
  }

  /**
   * Invalidate entries by pattern
   * @param {string} pattern - Pattern to match (supports * wildcard)
   @returns {number} Number of entries invalidated
   */
  invalidateByPattern(pattern) {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    let count = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        if (this.delete(key)) count++;
      }
    }
    return count;
  }

  /**
   * Clear all entries
   */
  flush() {
    this.cache.clear();
    this.tags.clear();
    this.stats.totalSize = 0;
  }

  /**
   * Get cache statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      keyCount: this.cache.size,
      hitRate: total > 0 ? (this.stats.hits / total) : 0,
      missRate: total > 0 ? (this.stats.misses / total) : 0,
    };
  }

  /**
   * Start cleanup interval for expired entries
   */
  startCleanupInterval() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache) {
        if (entry.expiresAt < now) {
          this.delete(key);
        }
      }
    }, 60000); // Clean up every minute
  }
}

/**
 * Circuit Breaker for Redis connection
 * Prevents cascading failures when Redis is unavailable
 */
class CacheCircuitBreaker {
  constructor() {
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.halfOpenRequests = 0;
  }

  /**
   * Check if request is allowed
   * @returns {boolean}
   */
  canExecute() {
    if (this.state === 'CLOSED') return true;

    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= CONFIG.CIRCUIT_BREAKER_RESET_TIMEOUT) {
        this.state = 'HALF_OPEN';
        this.halfOpenRequests = 0;
        this.successCount = 0;
        return true;
      }
      return false;
    }

    if (this.state === 'HALF_OPEN') {
      if (this.halfOpenRequests < CONFIG.CIRCUIT_BREAKER_HALF_OPEN_REQUESTS) {
        this.halfOpenRequests++;
        return true;
      }
      return false;
    }

    return false;
  }

  /**
   * Record successful execution
   */
  recordSuccess() {
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= CONFIG.CIRCUIT_BREAKER_HALF_OPEN_REQUESTS) {
        this.state = 'CLOSED';
        this.halfOpenRequests = 0;
      }
    }
  }

  /**
   * Record failed execution
   */
  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN' || this.failureCount >= CONFIG.CIRCUIT_BREAKER_FAILURE_THRESHOLD) {
      this.state = 'OPEN';
    }
  }

  /**
   * Get current state
   * @returns {Object} Circuit breaker state
   */
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
    };
  }
}

/**
 * L2 Cache - Redis cache for warm data
 * Distributed cache with persistence
 */
class L2Cache {
  constructor() {
    this.client = null;
    this.connected = false;
    this.circuitBreaker = new CacheCircuitBreaker();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
    };

    this.initialize();
  }

  /**
   * Initialize Redis connection
   */
  async initialize() {
    try {
      this.client = new Redis({
        host: CONFIG.REDIS_HOST,
        port: CONFIG.REDIS_PORT,
        password: CONFIG.REDIS_PASSWORD,
        db: CONFIG.REDIS_DB,
        retryStrategy: (times) => {
          if (times > 3) {
            console.warn('Redis connection failed after 3 retries, using L1 only');
            return null;
          }
          return Math.min(times * 100, 3000);
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
      });

      this.client.on('connect', () => {
        console.log('L2 Cache (Redis) connected');
        this.connected = true;
        this.circuitBreaker.recordSuccess();
      });

      this.client.on('error', (err) => {
        console.error('L2 Cache (Redis) error:', err.message);
        this.connected = false;
        this.circuitBreaker.recordFailure();
        this.stats.errors++;
      });

      this.client.on('close', () => {
        console.warn('L2 Cache (Redis) connection closed');
        this.connected = false;
      });
    } catch (error) {
      console.error('Failed to initialize L2 Cache:', error.message);
      this.connected = false;
    }
  }

  /**
   * Check if Redis is available
   * @returns {boolean}
   */
  isAvailable() {
    return this.connected && this.circuitBreaker.canExecute();
  }

  /**
   * Get value from L2 cache
   * @param {string} key - Cache key
   * @returns {Promise<*>} Cached value or null
   */
  async get(key) {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      this.circuitBreaker.recordSuccess();

      if (value === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return JSON.parse(value);
    } catch (error) {
      this.circuitBreaker.recordFailure();
      this.stats.errors++;
      return null;
    }
  }

  /**
   * Set value in L2 cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - TTL in seconds
   * @returns {Promise<boolean>}
   */
  async set(key, value, ttl = CONFIG.CACHE_L2_TTL) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      await this.client.setex(key, ttl, serialized);
      this.circuitBreaker.recordSuccess();
      this.stats.sets++;
      return true;
    } catch (error) {
      this.circuitBreaker.recordFailure();
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Delete value from L2 cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  async delete(key) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.client.del(key);
      this.circuitBreaker.recordSuccess();
      this.stats.deletes++;
      return true;
    } catch (error) {
      this.circuitBreaker.recordFailure();
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Invalidate entries by pattern
   * @param {string} pattern - Pattern to match
   * @returns {Promise<number>}
   */
  async invalidateByPattern(pattern) {
    if (!this.isAvailable()) {
      return 0;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return 0;

      await this.client.del(...keys);
      this.circuitBreaker.recordSuccess();
      return keys.length;
    } catch (error) {
      this.circuitBreaker.recordFailure();
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Clear all entries
   * @returns {Promise<boolean>}
   */
  async flush() {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.client.flushdb();
      this.circuitBreaker.recordSuccess();
      return true;
    } catch (error) {
      this.circuitBreaker.recordFailure();
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns {Object}
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      connected: this.connected,
      circuitBreaker: this.circuitBreaker.getState(),
      hitRate: total > 0 ? (this.stats.hits / total) : 0,
      missRate: total > 0 ? (this.stats.misses / total) : 0,
    };
  }

  /**
   * Get Redis info
   * @returns {Promise<Object>}
   */
  async getInfo() {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const info = await this.client.info();
      return info;
    } catch (error) {
      return null;
    }
  }
}

/**
 * CacheService - Main caching service with multi-layer strategy
 * Combines L1 (in-memory) and L2 (Redis) caches
 */
class CacheService extends EventEmitter {
  constructor() {
    super();
    this.l1 = new L1Cache();
    this.l2 = new L2Cache();
    this.stats = {
      totalHits: 0,
      totalMisses: 0,
      l1Hits: 0,
      l2Hits: 0,
      totalSets: 0,
      totalDeletes: 0,
    };
  }

  // ==================== Key Generation ====================

  /**
   * Generate cache key
   * @param {string} type - Key type (user, jobs, referrals, session, api)
   * @param {string} identifier - Unique identifier
   * @returns {string} Cache key
   */
  generateKey(type, identifier) {
    const validTypes = ['user', 'jobs', 'referrals', 'session', 'api'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid cache key type: ${type}`);
    }
    return `${type}:${identifier}`;
  }

  /**
   * Generate user cache key
   * @param {string} userId - User ID
   * @returns {string}
   */
  generateUserKey(userId) {
    return this.generateKey('user', userId);
  }

  /**
   * Generate jobs list cache key
   * @param {string} filter - Filter identifier
   * @returns {string}
   */
  generateJobsKey(filter = 'default') {
    return this.generateKey('jobs', filter);
  }

  /**
   * Generate referrals cache key
   * @param {string} userId - User ID
   * @returns {string}
   */
  generateReferralsKey(userId) {
    return this.generateKey('referrals', userId);
  }

  /**
   * Generate session cache key
   * @param {string} sessionId - Session ID
   * @returns {string}
   */
  generateSessionKey(sessionId) {
    return this.generateKey('session', sessionId);
  }

  /**
   * Generate API response cache key
   * @param {string} url - API URL
   * @returns {string}
   */
  generateApiKey(url) {
    // Normalize URL by removing query params for consistent keys
    const normalizedUrl = url.split('?')[0];
    return this.generateKey('api', normalizedUrl);
  }

  // ==================== Core Operations ====================

  /**
   * Get value from cache (L1 -> L2)
   * @param {string} key - Cache key
   * @param {Object} options - Options
   * @returns {Promise<*>} Cached value or undefined
   */
  async get(key, options = {}) {
    // Try L1 first
    const l1Value = this.l1.get(key);
    if (l1Value !== null) {
      this.stats.l1Hits++;
      this.stats.totalHits++;
      this.emit('hit', { key, layer: 'L1' });
      return l1Value;
    }

    // Try L2
    const l2Value = await this.l2.get(key);
    if (l2Value !== null) {
      // Promote to L1
      const ttl = options.l1Ttl || CONFIG.CACHE_L1_TTL;
      const tags = options.tags || [];
      this.l1.set(key, l2Value, ttl, tags);

      this.stats.l2Hits++;
      this.stats.totalHits++;
      this.emit('hit', { key, layer: 'L2' });
      return l2Value;
    }

    this.stats.totalMisses++;
    this.emit('miss', { key });
    return undefined;
  }

  /**
   * Set value in cache (both layers)
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {Object} options - Options
   * @returns {Promise<boolean>}
   */
  async set(key, value, options = {}) {
    const l1Ttl = options.l1Ttl || CONFIG.CACHE_L1_TTL;
    const l2Ttl = options.l2Ttl || CONFIG.CACHE_L2_TTL;
    const tags = options.tags || [];

    // Set in L1
    this.l1.set(key, value, l1Ttl, tags);

    // Set in L2
    await this.l2.set(key, value, l2Ttl);

    this.stats.totalSets++;
    this.emit('set', { key, tags });
    return true;
  }

  /**
   * Delete value from cache (both layers)
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  async delete(key) {
    const l1Deleted = this.l1.delete(key);
    const l2Deleted = await this.l2.delete(key);

    this.stats.totalDeletes++;
    this.emit('delete', { key });
    return l1Deleted || l2Deleted;
  }

  /**
   * Get or set cache value (cache-aside pattern)
   * @param {string} key - Cache key
   * @param {Function} factory - Factory function to generate value
   * @param {Object} options - Options
   * @returns {Promise<*>} Cached or generated value
   */
  async getOrSet(key, factory, options = {}) {
    // Try to get from cache
    const cached = await this.get(key, options);
    if (cached !== undefined) {
      return cached;
    }

    // Generate value
    try {
      const value = await factory();

      // Cache the result
      if (value !== undefined && value !== null) {
        await this.set(key, value, options);
      }

      return value;
    } catch (error) {
      this.emit('error', { key, error });
      throw error;
    }
  }

  // ==================== Convenience Methods ====================

  /**
   * Cache user data
   * @param {string} userId - User ID
   * @param {*} data - User data
   * @param {Object} options - Options
   * @returns {Promise<boolean>}
   */
  async cacheUser(userId, data, options = {}) {
    const key = this.generateUserKey(userId);
    const ttl = options.ttl || CONFIG.CACHE_USER_TTL;
    return this.set(key, data, {
      l1Ttl: Math.min(ttl, CONFIG.CACHE_L1_TTL),
      l2Ttl: ttl,
      tags: ['user', `user:${userId}`],
      ...options,
    });
  }

  /**
   * Get cached user data
   * @param {string} userId - User ID
   * @returns {Promise<*>}
   */
  async getUser(userId) {
    const key = this.generateUserKey(userId);
    return this.get(key, { tags: ['user', `user:${userId}`] });
  }

  /**
   * Invalidate user cache
   * @param {string} userId - User ID
   * @returns {Promise<boolean>}
   */
  async invalidateUser(userId) {
    const key = this.generateUserKey(userId);
    return this.delete(key);
  }

  /**
   * Cache session data
   * @param {string} sessionId - Session ID
   * @param {*} data - Session data
   * @param {Object} options - Options
   * @returns {Promise<boolean>}
   */
  async cacheSession(sessionId, data, options = {}) {
    const key = this.generateSessionKey(sessionId);
    const ttl = options.ttl || CONFIG.CACHE_SESSION_TTL;
    return this.set(key, data, {
      l1Ttl: Math.min(ttl, CONFIG.CACHE_L1_TTL),
      l2Ttl: ttl,
      tags: ['session', `session:${sessionId}`],
      ...options,
    });
  }

  /**
   * Get cached session data
   * @param {string} sessionId - Session ID
   * @returns {Promise<*>}
   */
  async getSession(sessionId) {
    const key = this.generateSessionKey(sessionId);
    return this.get(key, { tags: ['session', `session:${sessionId}`] });
  }

  /**
   * Cache jobs list
   * @param {string} filter - Filter identifier
   * @param {*} data - Jobs data
   * @param {Object} options - Options
   * @returns {Promise<boolean>}
   */
  async cacheJobs(filter, data, options = {}) {
    const key = this.generateJobsKey(filter);
    const ttl = options.ttl || CONFIG.CACHE_JOBS_TTL;
    return this.set(key, data, {
      l1Ttl: Math.min(ttl, CONFIG.CACHE_L1_TTL),
      l2Ttl: ttl,
      tags: ['jobs', `jobs:${filter}`],
      ...options,
    });
  }

  /**
   * Get cached jobs list
   * @param {string} filter - Filter identifier
   * @returns {Promise<*>}
   */
  async getJobs(filter = 'default') {
    const key = this.generateJobsKey(filter);
    return this.get(key, { tags: ['jobs', `jobs:${filter}`] });
  }

  /**
   * Cache referrals data
   * @param {string} userId - User ID
   * @param {*} data - Referrals data
   * @param {Object} options - Options
   * @returns {Promise<boolean>}
   */
  async cacheReferrals(userId, data, options = {}) {
    const key = this.generateReferralsKey(userId);
    const ttl = options.ttl || CONFIG.CACHE_L2_TTL;
    return this.set(key, data, {
      l1Ttl: Math.min(ttl, CONFIG.CACHE_L1_TTL),
      l2Ttl: ttl,
      tags: ['referrals', `referrals:${userId}`, `user:${userId}`],
      ...options,
    });
  }

  /**
   * Get cached referrals data
   * @param {string} userId - User ID
   * @returns {Promise<*>}
   */
  async getReferrals(userId) {
    const key = this.generateReferralsKey(userId);
    return this.get(key, { tags: ['referrals', `referrals:${userId}`] });
  }

  // ==================== Invalidation Methods ====================

  /**
   * Invalidate cache entries by tag
   * @param {string} tag - Tag to invalidate
   * @returns {Promise<Object>} Number of entries invalidated
   */
  async invalidateByTag(tag) {
    const l1Count = this.l1.invalidateByTag(tag);
    // L2 doesn't support tags natively, so we skip it

    this.emit('invalidate', { tag, l1Count });
    return { l1: l1Count, l2: 0 };
  }

  /**
   * Invalidate cache entries by pattern
   * @param {string} pattern - Pattern to match
   * @returns {Promise<Object>} Number of entries invalidated
   */
  async invalidateByPattern(pattern) {
    const l1Count = this.l1.invalidateByPattern(pattern);
    const l2Count = await this.l2.invalidateByPattern(pattern);

    this.emit('invalidate', { pattern, l1Count, l2Count });
    return { l1: l1Count, l2: l2Count };
  }

  /**
   * Clear all caches
   * @returns {Promise<boolean>}
   */
  async flush() {
    this.l1.flush();
    await this.l2.flush();

    this.emit('flush');
    return true;
  }

  // ==================== Statistics & Health ====================

  /**
   * Get cache statistics
   * @returns {Object} Combined statistics
   */
  getStats() {
    const l1Stats = this.l1.getStats();
    const l2Stats = this.l2.getStats();
    const total = this.stats.totalHits + this.stats.totalMisses;

    return {
      overall: {
        totalHits: this.stats.totalHits,
        totalMisses: this.stats.totalMisses,
        totalSets: this.stats.totalSets,
        totalDeletes: this.stats.totalDeletes,
        hitRate: total > 0 ? (this.stats.totalHits / total) : 0,
        missRate: total > 0 ? (this.stats.totalMisses / total) : 0,
        l1HitRate: this.stats.totalHits > 0 ? (this.stats.l1Hits / this.stats.totalHits) : 0,
        l2HitRate: this.stats.totalHits > 0 ? (this.stats.l2Hits / this.stats.totalHits) : 0,
      },
      l1: l1Stats,
      l2: l2Stats,
    };
  }

  /**
   * Get health status
   * @returns {Object} Health status
   */
  getHealth() {
    const l2Stats = this.l2.getStats();

    return {
      status: l2Stats.connected ? 'healthy' : 'degraded',
      l1: {
        status: 'healthy',
        keyCount: this.l1.cache.size,
        memoryUsage: this.l1.stats.totalSize,
      },
      l2: {
        status: l2Stats.connected ? 'connected' : 'disconnected',
        connected: l2Stats.connected,
        circuitBreaker: l2Stats.circuitBreaker,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalHits: 0,
      totalMisses: 0,
      l1Hits: 0,
      l2Hits: 0,
      totalSets: 0,
      totalDeletes: 0,
    };
  }
}

// Export singleton instance
const cacheService = new CacheService();
module.exports = cacheService;
