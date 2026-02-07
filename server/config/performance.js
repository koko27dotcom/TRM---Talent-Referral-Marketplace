/**
 * Performance Configuration
 * Centralized performance settings for TRM Referral Platform
 * Includes caching, database, Redis, and monitoring configurations
 */

const os = require('os');

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Database Performance Configuration
 */
const databaseConfig = {
  // Connection pooling
  poolSize: parseInt(process.env.DB_POOL_SIZE, 10) || (isProduction ? 50 : 10),
  minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE, 10) || (isProduction ? 10 : 2),
  maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE, 10) || (isProduction ? 100 : 20),
  
  // Timeouts
  connectTimeoutMS: parseInt(process.env.DB_CONNECT_TIMEOUT_MS, 10) || 10000,
  socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT_MS, 10) || 45000,
  serverSelectionTimeoutMS: parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT_MS, 10) || 5000,
  heartbeatFrequencyMS: parseInt(process.env.DB_HEARTBEAT_FREQUENCY_MS, 10) || 10000,
  
  // Retry configuration
  retryWrites: true,
  retryReads: true,
  maxIdleTimeMS: parseInt(process.env.DB_MAX_IDLE_TIME_MS, 10) || 60000,
  
  // Read preferences for replica sets
  readPreference: process.env.DB_READ_PREFERENCE || (isProduction ? 'secondaryPreferred' : 'primary'),
  
  // Write concern
  w: process.env.DB_WRITE_CONCERN || 'majority',
  journal: true,
  
  // Query optimization
  maxTimeMS: parseInt(process.env.DB_MAX_TIME_MS, 10) || 30000, // Max query execution time
  
  // Monitoring
  monitorCommands: true,
  
  // Compression
  compressors: process.env.DB_COMPRESSORS || 'zstd,zlib,snappy',
};

/**
 * Redis Configuration
 */
const redisConfig = {
  // Connection settings
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB, 10) || 0,
  
  // Connection pooling
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,
  
  // Retry strategy
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  
  // Reconnect on error
  reconnectOnError: (err) => {
    const targetErrors = ['READONLY', 'ECONNREFUSED', 'ETIMEDOUT'];
    return targetErrors.some(e => err.message.includes(e));
  },
  
  // Cluster configuration (for production)
  cluster: {
    enabled: process.env.REDIS_CLUSTER_ENABLED === 'true',
    nodes: process.env.REDIS_CLUSTER_NODES 
      ? process.env.REDIS_CLUSTER_NODES.split(',').map(node => {
          const [host, port] = node.split(':');
          return { host, port: parseInt(port, 10) || 6379 };
        })
      : [],
    options: {
      maxRedirections: 16,
      retryDelayOnFailover: 100,
      retryDelayOnClusterDown: 300,
      enableReadyCheck: true,
      scaleReads: 'slave',
    },
  },
  
  // Sentinel configuration
  sentinel: {
    enabled: process.env.REDIS_SENTINEL_ENABLED === 'true',
    masterName: process.env.REDIS_SENTINEL_MASTER_NAME || 'mymaster',
    sentinels: process.env.REDIS_SENTINEL_NODES
      ? process.env.REDIS_SENTINEL_NODES.split(',').map(node => {
          const [host, port] = node.split(':');
          return { host, port: parseInt(port, 10) || 26379 };
        })
      : [],
  },
};

/**
 * Cache Configuration
 */
const cacheConfig = {
  // L1 (In-memory) cache settings
  l1: {
    enabled: process.env.CACHE_L1_ENABLED !== 'false',
    maxSize: parseInt(process.env.CACHE_L1_MAX_SIZE, 10) || 10000, // Max keys
    maxMemoryMB: parseInt(process.env.CACHE_L1_MAX_MEMORY_MB, 10) || 64,
    ttlSeconds: parseInt(process.env.CACHE_L1_TTL_SECONDS, 10) || 60,
    checkIntervalMs: parseInt(process.env.CACHE_L1_CHECK_INTERVAL_MS, 10) || 30000,
  },
  
  // L2 (Redis) cache settings
  l2: {
    enabled: process.env.CACHE_L2_ENABLED !== 'false',
    ttlSeconds: {
      default: parseInt(process.env.CACHE_L2_TTL_DEFAULT, 10) || 300, // 5 minutes
      short: parseInt(process.env.CACHE_L2_TTL_SHORT, 10) || 60,      // 1 minute
      medium: parseInt(process.env.CACHE_L2_TTL_MEDIUM, 10) || 300,   // 5 minutes
      long: parseInt(process.env.CACHE_L2_TTL_LONG, 10) || 3600,      // 1 hour
      session: parseInt(process.env.CACHE_L2_TTL_SESSION, 10) || 7200, // 2 hours
      user: parseInt(process.env.CACHE_L2_TTL_USER, 10) || 1800,      // 30 minutes
      job: parseInt(process.env.CACHE_L2_TTL_JOB, 10) || 600,         // 10 minutes
      referral: parseInt(process.env.CACHE_L2_TTL_REFERRAL, 10) || 300, // 5 minutes
      market: parseInt(process.env.CACHE_L2_TTL_MARKET, 10) || 3600,  // 1 hour
      static: parseInt(process.env.CACHE_L2_TTL_STATIC, 10) || 86400, // 24 hours
    },
  },
  
  // Circuit breaker settings
  circuitBreaker: {
    enabled: process.env.CACHE_CIRCUIT_BREAKER_ENABLED !== 'false',
    failureThreshold: parseInt(process.env.CACHE_CB_FAILURE_THRESHOLD, 10) || 5,
    resetTimeoutMs: parseInt(process.env.CACHE_CB_RESET_TIMEOUT_MS, 10) || 30000,
    halfOpenMaxCalls: parseInt(process.env.CACHE_CB_HALF_OPEN_MAX_CALLS, 10) || 3,
  },
  
  // Key naming conventions
  keyPrefix: {
    api: 'trm:api:',
    user: 'trm:user:',
    job: 'trm:job:',
    referral: 'trm:referral:',
    session: 'trm:session:',
    market: 'trm:market:',
    stats: 'trm:stats:',
    lock: 'trm:lock:',
    temp: 'trm:temp:',
  },
  
  // Cache warming
  warming: {
    enabled: process.env.CACHE_WARMING_ENABLED === 'true',
    batchSize: parseInt(process.env.CACHE_WARMING_BATCH_SIZE, 10) || 100,
    intervalMs: parseInt(process.env.CACHE_WARMING_INTERVAL_MS, 10) || 300000, // 5 minutes
    maxConcurrent: parseInt(process.env.CACHE_WARMING_MAX_CONCURRENT, 10) || 5,
  },
};

/**
 * Query Optimization Configuration
 */
const queryConfig = {
  // Pagination
  pagination: {
    defaultPageSize: parseInt(process.env.PAGINATION_DEFAULT_SIZE, 10) || 20,
    maxPageSize: parseInt(process.env.PAGINATION_MAX_SIZE, 10) || 100,
    cursorPageSize: parseInt(process.env.PAGINATION_CURSOR_SIZE, 10) || 50,
  },
  
  // Performance thresholds
  thresholds: {
    slowQueryMs: parseInt(process.env.SLOW_QUERY_THRESHOLD_MS, 10) || 100,
    verySlowQueryMs: parseInt(process.env.VERY_SLOW_QUERY_THRESHOLD_MS, 10) || 500,
    slowRequestMs: parseInt(process.env.SLOW_REQUEST_THRESHOLD_MS, 10) || 1000,
    verySlowRequestMs: parseInt(process.env.VERY_SLOW_REQUEST_THRESHOLD_MS, 10) || 5000,
  },
  
  // Query limits
  limits: {
    maxLimit: parseInt(process.env.QUERY_MAX_LIMIT, 10) || 1000,
    maxSkip: parseInt(process.env.QUERY_MAX_SKIP, 10) || 10000,
    defaultTimeoutMs: parseInt(process.env.QUERY_DEFAULT_TIMEOUT_MS, 10) || 30000,
  },
  
  // Index hints
  useIndexHints: process.env.QUERY_USE_INDEX_HINTS !== 'false',
  explainSlowQueries: process.env.QUERY_EXPLAIN_SLOW === 'true',
};

/**
 * Compression Configuration
 */
const compressionConfig = {
  enabled: process.env.COMPRESSION_ENABLED !== 'false',
  
  // Thresholds
  minSizeBytes: parseInt(process.env.COMPRESSION_MIN_SIZE, 10) || 1024,
  maxSizeBytes: parseInt(process.env.COMPRESSION_MAX_SIZE, 10) || 100 * 1024 * 1024,
  
  // Algorithms
  level: {
    gzip: parseInt(process.env.GZIP_LEVEL, 10) || 6,
    brotli: parseInt(process.env.BROTLI_LEVEL, 10) || 4,
    deflate: parseInt(process.env.DEFLATE_LEVEL, 10) || 6,
  },
  
  // Content types to compress
  mimeTypes: [
    'text/',
    'application/json',
    'application/javascript',
    'application/xml',
    'application/rss+xml',
    'application/atom+xml',
    'application/vnd.api+json',
    'application/hal+json',
    'application/ld+json',
    'image/svg+xml',
  ],
  
  // Content types to skip
  skipTypes: [
    'image/',
    'video/',
    'audio/',
    'application/pdf',
    'application/zip',
    'application/gzip',
    'application/x-gzip',
    'application/x-brotli',
    'application/octet-stream',
  ],
};

/**
 * Monitoring Configuration
 */
const monitoringConfig = {
  // APM Integration
  apm: {
    enabled: process.env.APM_ENABLED === 'true',
    provider: process.env.APM_PROVIDER || 'datadog', // datadog, newrelic, dynatrace
    serviceName: process.env.APM_SERVICE_NAME || 'trm-api',
    environment: process.env.NODE_ENV || 'development',
    hostname: os.hostname(),
    sampleRate: parseFloat(process.env.APM_SAMPLE_RATE) || 1.0,
  },
  
  // Metrics collection
  metrics: {
    enabled: process.env.METRICS_ENABLED !== 'false',
    flushIntervalMs: parseInt(process.env.METRICS_FLUSH_INTERVAL_MS, 10) || 60000,
    retentionHours: parseInt(process.env.METRICS_RETENTION_HOURS, 10) || 24,
    maxDataPoints: parseInt(process.env.METRICS_MAX_DATA_POINTS, 10) || 1440,
  },
  
  // Profiling
  profiling: {
    enabled: process.env.PROFILING_ENABLED === 'true',
    heapSnapshotIntervalMs: parseInt(process.env.HEAP_SNAPSHOT_INTERVAL_MS, 10) || 3600000,
    cpuProfileDurationMs: parseInt(process.env.CPU_PROFILE_DURATION_MS, 10) || 30000,
  },
  
  // Alerting thresholds
  alerting: {
    errorRateThreshold: parseFloat(process.env.ALERT_ERROR_RATE_THRESHOLD) || 0.05,
    latencyP95ThresholdMs: parseInt(process.env.ALERT_LATENCY_P95_THRESHOLD_MS, 10) || 1000,
    latencyP99ThresholdMs: parseInt(process.env.ALERT_LATENCY_P99_THRESHOLD_MS, 10) || 2000,
    cpuThresholdPercent: parseInt(process.env.ALERT_CPU_THRESHOLD_PERCENT, 10) || 80,
    memoryThresholdPercent: parseInt(process.env.ALERT_MEMORY_THRESHOLD_PERCENT, 10) || 85,
  },
};

/**
 * CDN Configuration
 */
const cdnConfig = {
  enabled: process.env.CDN_ENABLED === 'true',
  provider: process.env.CDN_PROVIDER || 'cloudflare',
  
  // Asset caching
  assetCaching: {
    staticMaxAge: parseInt(process.env.CDN_STATIC_MAX_AGE, 10) || 31536000, // 1 year
    imageMaxAge: parseInt(process.env.CDN_IMAGE_MAX_AGE, 10) || 2592000,    // 30 days
    jsCssMaxAge: parseInt(process.env.CDN_JS_CSS_MAX_AGE, 10) || 86400,     // 1 day
    apiMaxAge: parseInt(process.env.CDN_API_MAX_AGE, 10) || 0,              // No cache for API
  },
  
  // Asset versioning
  versioning: {
    enabled: process.env.CDN_VERSIONING_ENABLED !== 'false',
    hashLength: parseInt(process.env.CDN_HASH_LENGTH, 10) || 8,
  },
};

/**
 * Background Job Configuration
 */
const queueConfig = {
  // Bull queue settings
  bull: {
    prefix: process.env.BULL_PREFIX || 'bull',
    defaultJobOptions: {
      attempts: parseInt(process.env.BULL_DEFAULT_ATTEMPTS, 10) || 3,
      backoff: {
        type: 'exponential',
        delay: parseInt(process.env.BULL_BACKOFF_DELAY, 10) || 2000,
      },
      removeOnComplete: parseInt(process.env.BULL_REMOVE_ON_COMPLETE, 10) || 100,
      removeOnFail: parseInt(process.env.BULL_REMOVE_ON_FAIL, 10) || 50,
    },
    limiter: {
      max: parseInt(process.env.BULL_LIMITER_MAX, 10) || 100,
      duration: parseInt(process.env.BULL_LIMITER_DURATION, 10) || 1000,
    },
  },
  
  // Worker scaling
  workers: {
    min: parseInt(process.env.WORKER_MIN, 10) || 1,
    max: parseInt(process.env.WORKER_MAX, 10) || 10,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY, 10) || 5,
  },
  
  // Job priorities
  priorities: {
    critical: 1,
    high: 2,
    normal: 3,
    low: 4,
    background: 5,
  },
};

/**
 * Rate Limiting Configuration
 */
const rateLimitConfig = {
  // Window settings
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000, // 1 minute
  
  // Limits by tier
  limits: {
    anonymous: parseInt(process.env.RATE_LIMIT_ANONYMOUS, 10) || 30,
    authenticated: parseInt(process.env.RATE_LIMIT_AUTHENTICATED, 10) || 100,
    premium: parseInt(process.env.RATE_LIMIT_PREMIUM, 10) || 300,
    enterprise: parseInt(process.env.RATE_LIMIT_ENTERPRISE, 10) || 1000,
    internal: parseInt(process.env.RATE_LIMIT_INTERNAL, 10) || 5000,
  },
  
  // Store configuration
  store: {
    type: process.env.RATE_LIMIT_STORE || 'redis', // memory, redis
    prefix: 'ratelimit:',
  },
};

/**
 * Export all configurations
 */
module.exports = {
  database: databaseConfig,
  redis: redisConfig,
  cache: cacheConfig,
  query: queryConfig,
  compression: compressionConfig,
  monitoring: monitoringConfig,
  cdn: cdnConfig,
  queue: queueConfig,
  rateLimit: rateLimitConfig,
  
  // Environment helpers
  isProduction,
  isDevelopment,
  
  // Feature flags
  features: {
    enableQueryCache: process.env.ENABLE_QUERY_CACHE !== 'false',
    enableResponseCache: process.env.ENABLE_RESPONSE_CACHE !== 'false',
    enableCompression: process.env.ENABLE_COMPRESSION !== 'false',
    enableRateLimiting: process.env.ENABLE_RATE_LIMITING !== 'false',
    enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING === 'true',
    enablePerformanceMonitoring: process.env.ENABLE_PERFORMANCE_MONITORING !== 'false',
  },
};