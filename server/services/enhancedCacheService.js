/**
 * Enhanced Cache Service
 * Multi-layer caching (L1: In-memory, L2: Redis) with advanced features
 * Features: Circuit breaker, tagged invalidation, statistics, warming strategies
 */

const { EventEmitter } = require('events');
const { redisManager, keyHelpers, luaScripts } = require('../config/redis.js');
const performanceConfig = require('../config/performance.js');

const { cache: config } = performanceConfig;

/**
 * Circuit Breaker for Redis operations
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || config.circuitBreaker.failureThreshold;
    this.resetTimeoutMs = options.resetTimeoutMs || config.circuitBreaker.resetTimeoutMs;
    this.halfOpenMaxCalls = options.halfOpenMaxCalls || config.circuitBreaker.halfOpenMaxCalls;
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.halfOpenCalls = 0;
  }
  
  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        this.halfOpenCalls = 0;
        this.successCount = 0;
        console.log('[CircuitBreaker] Transitioning to HALF_OPEN state');
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    if (this.state === 'HALF_OPEN' && this.halfOpenCalls >= this.halfOpenMaxCalls) {
      throw new Error('Circuit breaker HALF_OPEN call limit reached');
    }
    
    if (this.state === 'HALF_OPEN') {
      this.halfOpenCalls++;
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.halfOpenMaxCalls) {
        this.state = 'CLOSED';
        this.halfOpenCalls = 0;
        console.log('[CircuitBreaker] Transitioning to CLOSED state');
      }
    }
  }
  
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      console.log(`[CircuitBreaker] Transitioning to OPEN state after ${this.failureCount} failures`);
    }
  }
  
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

/**
 * L1 Cache Entry
 */
class L1CacheEntry {
  constructor(value, ttlSeconds, tags = []) {
    this.value = value;
    this.createdAt = Date.now();
    this.expiresAt = this.createdAt + (ttlSeconds * 1000);
    this.tags = new Set(tags);
    this.accessCount = 0;
    this.lastAccessed = this.createdAt;
    this.size = this.calculateSize(value);
  }
  
  calculateSize(value) {
    try {
      return Buffer.byteLength(JSON.stringify(value), 'utf8');
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
 * L1 In-Memory Cache
 * LRU eviction with size and memory limits
 */
class L1Cache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || config.l1.maxSize;
    this.maxMemoryBytes = (options.maxMemoryMB || config.l1.maxMemoryMB) * 1024 * 1024;
    this.defaultTTL = options.defaultTTL || config.l1.ttlSeconds;
    
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
   * Get value from cache
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
   * Set value in cache
   */
  set(key, value, ttlSeconds = this.defaultTTL, tags = []) {
    // Check if we need to evict
    while (this.cache.size >= this.maxSize || this.stats.totalSize >= this.maxMemoryBytes) {
      this.evictLRU();
    }
    
    const entry = new L1CacheEntry(value, ttlSeconds, tags);
    
    // Update total size
    const existingEntry = this.cache.get(key);
    if (existingEntry) {
      this.stats.totalSize -= existingEntry.size;
    }
    
    this.cache.set(key, entry);
    this.stats.totalSize += entry.size;
    this.stats.sets++;
    
    // Update tag index
    for (const tag of tags) {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, new Set());
      }
      this.tags.get(tag).add(key);
    }
    
    return true;
  }
  
  /**
   * Delete value from cache
   */
  delete(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Remove from tag index
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
   * Delete by tag
   */
  deleteByTag(tag) {
    const keys = this.tags.get(tag);
    if (!keys) return 0;
    
    let count = 0;
    for (const key of keys) {
      if (this.delete(key)) {
        count++;
      }
    }
    this.tags.delete(tag);
    return count;
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
   * Clear all entries
   */
  clear() {
    this.cache.clear();
    this.tags.clear();
    this.stats.totalSize = 0;
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
      : 0;
    
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: hitRate.toFixed(2) + '%',
      memoryUsageMB: (this.stats.totalSize / 1024 / 1024).toFixed(2),
    };
  }
  
  /**
   * Start cleanup interval
   */
  startCleanupInterval() {
    setInterval(() => {
      this.cleanup();
    }, config.l1.checkIntervalMs);
  }
  
  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt < now) {
        this.delete(key);
      }
    }
  }
}

/**
 * Enhanced Cache Service
 */
class EnhancedCacheService extends EventEmitter {
  constructor() {
    super();
    
    this.l1 = new L1Cache();
    this.l2 = null;
    this.circuitBreaker = new CircuitBreaker();
    this.initialized = false;
    
    this.stats = {
      l1Hits: 0,
      l1Misses: 0,
      l2Hits: 0,
      l2Misses: 0,
      totalSets: 0,
      totalDeletes: 0,
      circuitBreakerOpens: 0,
    };
  }
  
  /**
   * Initialize cache service
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      await redisManager.connect();
      this.l2 = redisManager.getClient();
      
      // Load Lua scripts
      for (const [name, script] of Object.entries(luaScripts)) {
        await this.l2.defineCommand(name, {
          numberOfKeys: 1,
          lua: script,
        });
      }
      
      this.initialized = true;
      console.log('[EnhancedCacheService] Initialized successfully');
    } catch (error) {
      console.error('[EnhancedCacheService] Initialization failed:', error.message);
      // Continue with L1 cache only
      this.initialized = true;
    }
  }
  
  /**
   * Generate cache key
   */
  generateKey(type, ...parts) {
    return keyHelpers.create(config.keyPrefix[type] || 'trm:', ...parts);
  }
  
  /**
   * Get value from cache (L1 -> L2)
   */
  async get(key) {
    // Try L1 first
    const l1Value = this.l1.get(key);
    if (l1Value !== null) {
      this.stats.l1Hits++;
      this.emit('hit', { layer: 'L1', key });
      return l1Value;
    }
    this.stats.l1Misses++;
    
    // Try L2 if available
    if (this.l2 && config.l2.enabled) {
      try {
        const l2Value = await this.circuitBreaker.execute(async () => {
          const value = await this.l2.get(key);
          return value ? JSON.parse(value) : null;
        });
        
        if (l2Value !== null) {
          this.stats.l2Hits++;
          // Promote to L1
          this.l1.set(key, l2Value);
          this.emit('hit', { layer: 'L2', key });
          return l2Value;
        }
      } catch (error) {
        if (error.message === 'Circuit breaker is OPEN') {
          this.stats.circuitBreakerOpens++;
        }
        console.error('[EnhancedCacheService] L2 get error:', error.message);
      }
    }
    
    this.stats.l2Misses++;
    this.emit('miss', { key });
    return null;
  }
  
  /**
   * Set value in cache
   */
  async set(key, value, options = {}) {
    const {
      ttl = config.l2.ttlSeconds.default,
      tags = [],
      l1 = true,
      l2 = true,
    } = options;
    
    // Set in L1
    if (l1 && config.l1.enabled) {
      this.l1.set(key, value, Math.min(ttl, config.l1.ttlSeconds), tags);
    }
    
    // Set in L2
    if (l2 && this.l2 && config.l2.enabled) {
      try {
        await this.circuitBreaker.execute(async () => {
          const pipeline = this.l2.pipeline();
          pipeline.setex(key, ttl, JSON.stringify(value));
          
          // Add to tag sets
          for (const tag of tags) {
            const tagKey = keyHelpers.tag(tag);
            pipeline.sadd(tagKey, key);
            pipeline.expire(tagKey, ttl);
          }
          
          await pipeline.exec();
        });
      } catch (error) {
        console.error('[EnhancedCacheService] L2 set error:', error.message);
      }
    }
    
    this.stats.totalSets++;
    this.emit('set', { key, ttl, tags });
    return true;
  }
  
  /**
   * Delete value from cache
   */
  async delete(key) {
    // Delete from L1
    this.l1.delete(key);
    
    // Delete from L2
    if (this.l2 && config.l2.enabled) {
      try {
        await this.circuitBreaker.execute(async () => {
          await this.l2.del(key);
        });
      } catch (error) {
        console.error('[EnhancedCacheService] L2 delete error:', error.message);
      }
    }
    
    this.stats.totalDeletes++;
    this.emit('delete', { key });
    return true;
  }
  
  /**
   * Delete by pattern (L2 only)
   */
  async deleteByPattern(pattern) {
    if (!this.l2 || !config.l2.enabled) return 0;
    
    try {
      return await this.circuitBreaker.execute(async () => {
        const keys = await this.l2.keys(pattern);
        if (keys.length > 0) {
          await this.l2.del(...keys);
        }
        return keys.length;
      });
    } catch (error) {
      console.error('[EnhancedCacheService] Pattern delete error:', error.message);
      return 0;
    }
  }
  
  /**
   * Delete by tag
   */
  async deleteByTag(tag) {
    // Delete from L1
    this.l1.deleteByTag(tag);
    
    // Delete from L2
    if (this.l2 && config.l2.enabled) {
      try {
        return await this.circuitBreaker.execute(async () => {
          const tagKey = keyHelpers.tag(tag);
          const keys = await this.l2.smembers(tagKey);
          
          if (keys.length > 0) {
            const pipeline = this.l2.pipeline();
            pipeline.del(...keys);
            pipeline.del(tagKey);
            await pipeline.exec();
          }
          
          return keys.length;
        });
      } catch (error) {
        console.error('[EnhancedCacheService] Tag delete error:', error.message);
        return 0;
      }
    }
    
    return 0;
  }
  
  /**
   * Get or set (cache-aside pattern)
   */
  async getOrSet(key, factory, options = {}) {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }
    
    const value = await factory();
    if (value !== null && value !== undefined) {
      await this.set(key, value, options);
    }
    
    return value;
  }
  
  /**
   * Write-through cache
   */
  async writeThrough(key, value, writeFn, options = {}) {
    // Write to database first
    const result = await writeFn(value);
    
    // Then update cache
    await this.set(key, result, options);
    
    return result;
  }
  
  /**
   * Write-behind cache (queue for async write)
   */
  async writeBehind(key, value, queueFn, options = {}) {
    // Update cache immediately
    await this.set(key, value, options);
    
    // Queue for async write
    await queueFn(key, value);
    
    return value;
  }
  
  /**
   * Acquire distributed lock
   */
  async acquireLock(resource, ttlSeconds = 30) {
    if (!this.l2 || !config.l2.enabled) {
      return null;
    }
    
    try {
      const token = `${Date.now()}-${Math.random()}`;
      const lockKey = keyHelpers.lock(resource);
      
      const acquired = await this.circuitBreaker.execute(async () => {
        return await this.l2.acquireLock(lockKey, token, ttlSeconds);
      });
      
      if (acquired) {
        return {
          token,
          release: async () => {
            await this.circuitBreaker.execute(async () => {
              await this.l2.releaseLock(lockKey, token);
            });
          },
        };
      }
      
      return null;
    } catch (error) {
      console.error('[EnhancedCacheService] Lock acquisition error:', error.message);
      return null;
    }
  }
  
  /**
   * Execute with lock
   */
  async withLock(resource, fn, ttlSeconds = 30) {
    const lock = await this.acquireLock(resource, ttlSeconds);
    
    if (!lock) {
      throw new Error(`Could not acquire lock for resource: ${resource}`);
    }
    
    try {
      return await fn();
    } finally {
      await lock.release();
    }
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    const l1Stats = this.l1.getStats();
    const totalHits = this.stats.l1Hits + this.stats.l2Hits;
    const totalMisses = this.stats.l1Misses + this.stats.l2Misses;
    const totalRequests = totalHits + totalMisses;
    
    return {
      l1: l1Stats,
      l2: {
        isConnected: this.l2 ? redisManager.isHealthy() : false,
        hits: this.stats.l2Hits,
        misses: this.stats.l2Misses,
      },
      overall: {
        totalHits,
        totalMisses,
        hitRate: totalRequests > 0 ? ((totalHits / totalRequests) * 100).toFixed(2) + '%' : '0%',
        totalSets: this.stats.totalSets,
        totalDeletes: this.stats.totalDeletes,
      },
      circuitBreaker: this.circuitBreaker.getState(),
    };
  }
  
  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      l1Hits: 0,
      l1Misses: 0,
      l2Hits: 0,
      l2Misses: 0,
      totalSets: 0,
      totalDeletes: 0,
      circuitBreakerOpens: 0,
    };
    
    // Reset L1 stats
    this.l1.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      totalSize: 0,
    };
  }
  
  /**
   * Clear all caches
   */
  async clear() {
    this.l1.clear();
    
    if (this.l2 && config.l2.enabled) {
      try {
        await this.circuitBreaker.execute(async () => {
          await this.l2.flushdb();
        });
      } catch (error) {
        console.error('[EnhancedCacheService] Clear error:', error.message);
      }
    }
    
    this.emit('clear');
  }
  
  /**
   * Health check
   */
  async healthCheck() {
    const health = {
      l1: {
        status: 'healthy',
        size: this.l1.cache.size,
        memoryUsageMB: (this.l1.stats.totalSize / 1024 / 1024).toFixed(2),
      },
      l2: {
        status: 'unknown',
        connected: false,
      },
      circuitBreaker: this.circuitBreaker.getState(),
    };
    
    if (this.l2 && config.l2.enabled) {
      try {
        await this.circuitBreaker.execute(async () => {
          await this.l2.ping();
        });
        health.l2.status = 'healthy';
        health.l2.connected = true;
      } catch (error) {
        health.l2.status = 'unhealthy';
        health.l2.error = error.message;
      }
    } else {
      health.l2.status = 'disabled';
    }
    
    return health;
  }
}

// Create singleton instance
const enhancedCacheService = new EnhancedCacheService();

module.exports = enhancedCacheService;