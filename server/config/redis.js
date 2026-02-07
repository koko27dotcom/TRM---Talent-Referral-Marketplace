/**
 * Redis Configuration
 * Redis connection and cluster configuration for TRM platform
 * Supports standalone, cluster, and sentinel modes
 */

const Redis = require('ioredis');
const performanceConfig = require('./performance.js');

const { redis: config } = performanceConfig;

/**
 * Create Redis client based on configuration
 * @returns {Redis} Redis client instance
 */
const createRedisClient = () => {
  // Cluster mode
  if (config.cluster.enabled && config.cluster.nodes.length > 0) {
    return new Redis.Cluster(config.cluster.nodes, {
      redisOptions: {
        password: config.password,
        maxRetriesPerRequest: config.maxRetriesPerRequest,
        enableReadyCheck: config.enableReadyCheck,
        enableOfflineQueue: config.enableOfflineQueue,
      },
      ...config.cluster.options,
    });
  }
  
  // Sentinel mode
  if (config.sentinel.enabled && config.sentinel.sentinels.length > 0) {
    return new Redis({
      sentinels: config.sentinel.sentinels,
      name: config.sentinel.masterName,
      password: config.password,
      maxRetriesPerRequest: config.maxRetriesPerRequest,
      enableReadyCheck: config.enableReadyCheck,
      enableOfflineQueue: config.enableOfflineQueue,
    });
  }
  
  // Standalone mode
  return new Redis({
    host: config.host,
    port: config.port,
    password: config.password,
    db: config.db,
    maxRetriesPerRequest: config.maxRetriesPerRequest,
    enableReadyCheck: config.enableReadyCheck,
    enableOfflineQueue: config.enableOfflineQueue,
    retryStrategy: config.retryStrategy,
    reconnectOnError: config.reconnectOnError,
  });
};

/**
 * Redis Client Manager
 * Manages Redis connections and provides health monitoring
 */
class RedisClientManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 10;
    this.healthCheckInterval = null;
    this.metrics = {
      commandsExecuted: 0,
      commandsFailed: 0,
      connectionErrors: 0,
      reconnections: 0,
    };
  }
  
  /**
   * Initialize Redis connection
   * @returns {Promise<Redis>} Redis client
   */
  async connect() {
    if (this.client && this.isConnected) {
      return this.client;
    }
    
    try {
      this.client = createRedisClient();
      
      // Set up event handlers
      this.client.on('connect', () => {
        console.log('[Redis] Connected successfully');
        this.isConnected = true;
        this.connectionAttempts = 0;
      });
      
      this.client.on('ready', () => {
        console.log('[Redis] Client ready');
        this.isConnected = true;
      });
      
      this.client.on('error', (err) => {
        console.error('[Redis] Error:', err.message);
        this.metrics.connectionErrors++;
        this.isConnected = false;
      });
      
      this.client.on('close', () => {
        console.log('[Redis] Connection closed');
        this.isConnected = false;
      });
      
      this.client.on('reconnecting', () => {
        console.log('[Redis] Reconnecting...');
        this.metrics.reconnections++;
        this.connectionAttempts++;
      });
      
      this.client.on('end', () => {
        console.log('[Redis] Connection ended');
        this.isConnected = false;
      });
      
      // Wait for connection
      await this.client.ping();
      
      // Start health check
      this.startHealthCheck();
      
      return this.client;
    } catch (error) {
      console.error('[Redis] Connection failed:', error.message);
      this.connectionAttempts++;
      
      if (this.connectionAttempts < this.maxConnectionAttempts) {
        const delay = Math.min(1000 * Math.pow(2, this.connectionAttempts), 30000);
        console.log(`[Redis] Retrying connection in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.connect();
      }
      
      throw error;
    }
  }
  
  /**
   * Start health check interval
   */
  startHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        if (this.client) {
          await this.client.ping();
          this.isConnected = true;
        }
      } catch (error) {
        console.error('[Redis] Health check failed:', error.message);
        this.isConnected = false;
      }
    }, 30000); // Check every 30 seconds
  }
  
  /**
   * Get Redis client
   * @returns {Redis} Redis client
   */
  getClient() {
    if (!this.client) {
      throw new Error('Redis client not initialized. Call connect() first.');
    }
    return this.client;
  }
  
  /**
   * Check if Redis is healthy
   * @returns {boolean} Health status
   */
  isHealthy() {
    return this.isConnected && this.client !== null;
  }
  
  /**
   * Get Redis metrics
   * @returns {Object} Metrics object
   */
  getMetrics() {
    return {
      ...this.metrics,
      isConnected: this.isConnected,
      connectionAttempts: this.connectionAttempts,
    };
  }
  
  /**
   * Get Redis info
   * @returns {Promise<Object>} Redis info
   */
  async getInfo() {
    if (!this.isHealthy()) {
      return null;
    }
    
    try {
      const info = await this.client.info();
      return this.parseInfo(info);
    } catch (error) {
      console.error('[Redis] Failed to get info:', error.message);
      return null;
    }
  }
  
  /**
   * Parse Redis INFO output
   * @param {string} info - INFO output
   * @returns {Object} Parsed info
   */
  parseInfo(info) {
    const result = {};
    const sections = info.split('\r\n\r\n');
    
    for (const section of sections) {
      const lines = section.split('\r\n');
      let currentSection = null;
      
      for (const line of lines) {
        if (line.startsWith('# ')) {
          currentSection = line.substring(2).toLowerCase();
          result[currentSection] = {};
        } else if (line.includes(':') && currentSection) {
          const [key, value] = line.split(':');
          result[currentSection][key] = value;
        }
      }
    }
    
    return result;
  }
  
  /**
   * Disconnect from Redis
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
    }
  }
  
  /**
   * Execute pipeline of commands
   * @param {Function} pipelineFn - Pipeline function
   * @returns {Promise<Array>} Pipeline results
   */
  async pipeline(pipelineFn) {
    if (!this.isHealthy()) {
      throw new Error('Redis not connected');
    }
    
    const pipeline = this.client.pipeline();
    pipelineFn(pipeline);
    return pipeline.exec();
  }
  
  /**
   * Execute transaction
   * @param {Function} transactionFn - Transaction function
   * @returns {Promise<Array>} Transaction results
   */
  async transaction(transactionFn) {
    if (!this.isHealthy()) {
      throw new Error('Redis not connected');
    }
    
    const multi = this.client.multi();
    transactionFn(multi);
    return multi.exec();
  }
}

// Create singleton instance
const redisManager = new RedisClientManager();

/**
 * Redis Key Helpers
 */
const keyHelpers = {
  /**
   * Create prefixed key
   * @param {string} prefix - Key prefix
   * @param {...string} parts - Key parts
   * @returns {string} Prefixed key
   */
  create(prefix, ...parts) {
    return `${prefix}${parts.join(':')}`;
  },
  
  /**
   * Create user key
   * @param {string} userId - User ID
   * @param {string} suffix - Optional suffix
   * @returns {string} User key
   */
  user(userId, suffix = '') {
    return suffix 
      ? `trm:user:${userId}:${suffix}`
      : `trm:user:${userId}`;
  },
  
  /**
   * Create job key
   * @param {string} jobId - Job ID
   * @param {string} suffix - Optional suffix
   * @returns {string} Job key
   */
  job(jobId, suffix = '') {
    return suffix
      ? `trm:job:${jobId}:${suffix}`
      : `trm:job:${jobId}`;
  },
  
  /**
   * Create referral key
   * @param {string} referralId - Referral ID
   * @param {string} suffix - Optional suffix
   * @returns {string} Referral key
   */
  referral(referralId, suffix = '') {
    return suffix
      ? `trm:referral:${referralId}:${suffix}`
      : `trm:referral:${referralId}`;
  },
  
  /**
   * Create session key
   * @param {string} sessionId - Session ID
   * @returns {string} Session key
   */
  session(sessionId) {
    return `trm:session:${sessionId}`;
  },
  
  /**
   * Create API response key
   * @param {string} route - Route path
   * @param {string} queryHash - Query hash
   * @returns {string} API key
   */
  apiResponse(route, queryHash = '') {
    return queryHash
      ? `trm:api:${route}:${queryHash}`
      : `trm:api:${route}`;
  },
  
  /**
   * Create market data key
   * @param {string} dataType - Data type
   * @param {string} identifier - Identifier
   * @returns {string} Market data key
   */
  marketData(dataType, identifier = '') {
    return identifier
      ? `trm:market:${dataType}:${identifier}`
      : `trm:market:${dataType}`;
  },
  
  /**
   * Create stats key
   * @param {string} statType - Statistics type
   * @param {string} identifier - Identifier
   * @returns {string} Stats key
   */
  stats(statType, identifier = '') {
    return identifier
      ? `trm:stats:${statType}:${identifier}`
      : `trm:stats:${statType}`;
  },
  
  /**
   * Create lock key
   * @param {string} resource - Resource name
   * @returns {string} Lock key
   */
  lock(resource) {
    return `trm:lock:${resource}`;
  },
  
  /**
   * Create rate limit key
   * @param {string} identifier - Rate limit identifier
   * @returns {string} Rate limit key
   */
  rateLimit(identifier) {
    return `trm:ratelimit:${identifier}`;
  },
  
  /**
   * Create cache tag key
   * @param {string} tag - Tag name
   * @returns {string} Tag key
   */
  tag(tag) {
    return `trm:tag:${tag}`;
  },
  
  /**
   * Create search index key
   * @param {string} index - Index name
   * @param {string} term - Search term
   * @returns {string} Search key
   */
  search(index, term) {
    return `trm:search:${index}:${term}`;
  },
  
  /**
   * Parse key parts
   * @param {string} key - Redis key
   * @returns {Object} Parsed key parts
   */
  parse(key) {
    const parts = key.split(':');
    return {
      namespace: parts[0],
      type: parts[1],
      id: parts[2],
      suffix: parts.slice(3).join(':'),
    };
  },
};

/**
 * Redis Lua Scripts
 */
const luaScripts = {
  // Atomic increment with expiry
  incrementExpire: `
    local current = redis.call('GET', KEYS[1])
    if current == false then
      current = 0
    else
      current = tonumber(current)
    end
    local new = current + tonumber(ARGV[1])
    redis.call('SET', KEYS[1], new, 'EX', ARGV[2])
    return new
  `,
  
  // Acquire lock with expiry
  acquireLock: `
    local key = KEYS[1]
    local token = ARGV[1]
    local expiry = ARGV[2]
    local acquired = redis.call('SET', key, token, 'NX', 'EX', expiry)
    if acquired then
      return 1
    else
      return 0
    end
  `,
  
  // Release lock only if token matches
  releaseLock: `
    local key = KEYS[1]
    local token = ARGV[1]
    local current = redis.call('GET', key)
    if current == token then
      redis.call('DEL', key)
      return 1
    else
      return 0
    end
  `,
  
  // Sliding window rate limit
  slidingWindowRateLimit: `
    local key = KEYS[1]
    local window = tonumber(ARGV[1])
    local limit = tonumber(ARGV[2])
    local now = tonumber(ARGV[3])
    local member = ARGV[4]
    
    redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
    local current = redis.call('ZCARD', key)
    
    if current < limit then
      redis.call('ZADD', key, now, member)
      redis.call('EXPIRE', key, window)
      return {1, limit - current - 1}
    else
      local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
      local retryAfter = math.ceil((oldest[2] + window - now) / 1000)
      return {0, retryAfter}
    end
  `,
  
  // Get and delete (for atomic pop)
  getAndDelete: `
    local key = KEYS[1]
    local value = redis.call('GET', key)
    if value ~= false then
      redis.call('DEL', key)
    end
    return value
  `,
  
  // Update hash if exists
  updateHashIfExists: `
    local key = KEYS[1]
    local field = ARGV[1]
    local value = ARGV[2]
    local exists = redis.call('EXISTS', key)
    if exists == 1 then
      redis.call('HSET', key, field, value)
      return 1
    else
      return 0
    end
  `,
};

module.exports = {
  RedisClientManager,
  redisManager,
  keyHelpers,
  luaScripts,
  createRedisClient,
  config,
};