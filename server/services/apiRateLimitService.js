const Redis = require('ioredis');

// Initialize Redis client if available
let redis = null;
try {
  if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL);
  }
} catch (error) {
  console.warn('Redis not available for rate limiting, using in-memory store');
}

// In-memory store fallback
const memoryStore = new Map();

/**
 * API Rate Limit Service
 * Handles rate limiting for API keys with multiple time windows
 */
class APIRateLimitService {
  constructor() {
    this.windows = {
      minute: 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000
    };
  }

  /**
   * Check rate limit for an API key
   */
  async checkLimit(apiKey) {
    const keyId = apiKey._id.toString();
    const limits = apiKey.rateLimit || {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      requestsPerDay: 10000
    };

    const results = {
      allowed: true,
      limit: limits.requestsPerMinute,
      remaining: limits.requestsPerMinute,
      resetAt: new Date(Date.now() + this.windows.minute),
      window: 'minute'
    };

    // Check all windows
    const checks = [
      { window: 'minute', limit: limits.requestsPerMinute, windowMs: this.windows.minute },
      { window: 'hour', limit: limits.requestsPerHour, windowMs: this.windows.hour },
      { window: 'day', limit: limits.requestsPerDay, windowMs: this.windows.day }
    ];

    for (const check of checks) {
      const windowResult = await this.checkWindow(keyId, check.window, check.limit, check.windowMs);
      
      if (!windowResult.allowed) {
        return {
          allowed: false,
          limit: check.limit,
          remaining: 0,
          resetAt: windowResult.resetAt,
          window: check.window,
          message: `Rate limit exceeded: ${check.limit} requests per ${check.window}`
        };
      }

      // Use the most restrictive window for headers (typically minute)
      if (check.window === 'minute') {
        results.remaining = windowResult.remaining;
        results.resetAt = windowResult.resetAt;
      }
    }

    // Increment all windows
    for (const check of checks) {
      await this.increment(keyId, check.window, check.windowMs);
    }

    // Update API key usage stats
    await apiKey.incrementUsage();

    return results;
  }

  /**
   * Check a specific time window
   */
  async checkWindow(keyId, window, limit, windowMs) {
    const storeKey = `ratelimit:${keyId}:${window}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    if (redis) {
      return this.checkWindowRedis(storeKey, limit, windowMs, windowStart);
    } else {
      return this.checkWindowMemory(storeKey, limit, windowMs, windowStart);
    }
  }

  /**
   * Check window using Redis
   */
  async checkWindowRedis(storeKey, limit, windowMs, windowStart) {
    // Use Redis sorted set for sliding window
    const pipeline = redis.pipeline();
    
    // Remove old entries
    pipeline.zremrangebyscore(storeKey, 0, windowStart);
    
    // Count current entries
    pipeline.zcard(storeKey);
    
    // Get the oldest entry for reset time calculation
    pipeline.zrange(storeKey, 0, 0, 'WITHSCORES');
    
    const results = await pipeline.exec();
    const currentCount = results[1][1];
    const oldestEntry = results[2][1];
    
    const allowed = currentCount < limit;
    const remaining = Math.max(0, limit - currentCount - (allowed ? 1 : 0));
    
    // Calculate reset time based on oldest entry or window duration
    let resetAt;
    if (oldestEntry && oldestEntry.length >= 2) {
      resetAt = new Date(parseInt(oldestEntry[1]) + windowMs);
    } else {
      resetAt = new Date(Date.now() + windowMs);
    }

    return { allowed, remaining, resetAt, current: currentCount };
  }

  /**
   * Check window using in-memory store
   */
  checkWindowMemory(storeKey, limit, windowMs, windowStart) {
    let entry = memoryStore.get(storeKey);
    const now = Date.now();

    if (!entry) {
      entry = {
        requests: [],
        resetAt: new Date(now + windowMs)
      };
      memoryStore.set(storeKey, entry);
    }

    // Remove old requests
    entry.requests = entry.requests.filter(timestamp => timestamp > windowStart);

    const currentCount = entry.requests.length;
    const allowed = currentCount < limit;
    const remaining = Math.max(0, limit - currentCount - (allowed ? 1 : 0));

    // Update reset time
    if (entry.requests.length > 0) {
      entry.resetAt = new Date(Math.min(...entry.requests) + windowMs);
    } else {
      entry.resetAt = new Date(now + windowMs);
    }

    return { allowed, remaining, resetAt: entry.resetAt, current: currentCount };
  }

  /**
   * Increment request count
   */
  async increment(keyId, window, windowMs) {
    const storeKey = `ratelimit:${keyId}:${window}`;
    const now = Date.now();

    if (redis) {
      const pipeline = redis.pipeline();
      pipeline.zadd(storeKey, now, `${now}-${Math.random()}`);
      pipeline.pexpire(storeKey, windowMs);
      await pipeline.exec();
    } else {
      let entry = memoryStore.get(storeKey);
      if (!entry) {
        entry = {
          requests: [],
          resetAt: new Date(now + windowMs)
        };
        memoryStore.set(storeKey, entry);
      }
      entry.requests.push(now);
    }
  }

  /**
   * Get current usage for an API key
   */
  async getUsage(keyId) {
    const windows = ['minute', 'hour', 'day'];
    const usage = {};

    for (const window of windows) {
      const storeKey = `ratelimit:${keyId}:${window}`;
      
      if (redis) {
        const count = await redis.zcard(storeKey);
        usage[window] = count;
      } else {
        const entry = memoryStore.get(storeKey);
        usage[window] = entry ? entry.requests.length : 0;
      }
    }

    return usage;
  }

  /**
   * Reset rate limit for an API key
   */
  async resetLimit(keyId) {
    const windows = ['minute', 'hour', 'day'];

    for (const window of windows) {
      const storeKey = `ratelimit:${keyId}:${window}`;
      
      if (redis) {
        await redis.del(storeKey);
      } else {
        memoryStore.delete(storeKey);
      }
    }

    return { reset: true };
  }

  /**
   * Get rate limit status for response headers
   */
  async getLimitStatus(apiKey) {
    const keyId = apiKey._id.toString();
    const limits = apiKey.rateLimit || {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      requestsPerDay: 10000
    };

    const usage = await this.getUsage(keyId);

    return {
      'X-RateLimit-Limit-Minute': limits.requestsPerMinute,
      'X-RateLimit-Remaining-Minute': Math.max(0, limits.requestsPerMinute - usage.minute),
      'X-RateLimit-Limit-Hour': limits.requestsPerHour,
      'X-RateLimit-Remaining-Hour': Math.max(0, limits.requestsPerHour - usage.hour),
      'X-RateLimit-Limit-Day': limits.requestsPerDay,
      'X-RateLimit-Remaining-Day': Math.max(0, limits.requestsPerDay - usage.day)
    };
  }

  /**
   * Cleanup old entries (call periodically)
   */
  async cleanup() {
    if (!redis) {
      const now = Date.now();
      for (const [key, entry] of memoryStore.entries()) {
        if (entry.resetAt.getTime() < now) {
          memoryStore.delete(key);
        }
      }
    }
    // Redis entries auto-expire via TTL
  }

  /**
   * Get rate limit statistics
   */
  async getStats() {
    if (redis) {
      const keys = await redis.keys('ratelimit:*');
      return {
        totalTrackedKeys: keys.length,
        storage: 'redis'
      };
    } else {
      return {
        totalTrackedKeys: memoryStore.size,
        storage: 'memory'
      };
    }
  }
}

module.exports = new APIRateLimitService();
