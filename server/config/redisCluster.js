/**
 * Redis Cluster Configuration
 * High availability Redis setup with cluster and sentinel support
 */

const Redis = require('ioredis');
const performanceConfig = require('./performance.js');

const { redis: config } = performanceConfig;

/**
 * Redis Cluster Manager
 * Manages Redis connections in cluster, sentinel, or standalone mode
 */
class RedisClusterManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.mode = 'standalone';
    this.healthCheckInterval = null;
    this.metrics = {
      commandsExecuted: 0,
      commandsFailed: 0,
      connectionErrors: 0,
      reconnections: 0,
      clusterSlots: {},
    };
  }
  
  /**
   * Initialize Redis connection based on configuration
   */
  async connect() {
    if (this.client && this.isConnected) {
      return this.client;
    }
    
    try {
      if (config.cluster.enabled && config.cluster.nodes.length > 0) {
        this.client = await this.createClusterClient();
        this.mode = 'cluster';
      } else if (config.sentinel.enabled && config.sentinel.sentinels.length > 0) {
        this.client = await this.createSentinelClient();
        this.mode = 'sentinel';
      } else {
        this.client = await this.createStandaloneClient();
        this.mode = 'standalone';
      }
      
      this.setupEventHandlers();
      this.startHealthCheck();
      
      console.log(`[RedisClusterManager] Connected in ${this.mode} mode`);
      return this.client;
    } catch (error) {
      console.error('[RedisClusterManager] Connection failed:', error.message);
      throw error;
    }
  }
  
  /**
   * Create Redis Cluster client
   */
  async createClusterClient() {
    const cluster = new Redis.Cluster(config.cluster.nodes, {
      redisOptions: {
        password: config.password,
        maxRetriesPerRequest: config.maxRetriesPerRequest,
        enableReadyCheck: config.enableReadyCheck,
        enableOfflineQueue: config.enableOfflineQueue,
        retryStrategy: config.retryStrategy,
        reconnectOnError: config.reconnectOnError,
      },
      slotsRefreshTimeout: 2000,
      slotsRefreshInterval: 5000,
      natMap: {},
      ...config.cluster.options,
    });
    
    // Wait for cluster to be ready
    await new Promise((resolve, reject) => {
      cluster.once('ready', resolve);
      cluster.once('error', reject);
      setTimeout(() => reject(new Error('Cluster connection timeout')), 10000);
    });
    
    return cluster;
  }
  
  /**
   * Create Redis Sentinel client
   */
  async createSentinelClient() {
    const sentinel = new Redis({
      sentinels: config.sentinel.sentinels,
      name: config.sentinel.masterName,
      password: config.password,
      maxRetriesPerRequest: config.maxRetriesPerRequest,
      enableReadyCheck: config.enableReadyCheck,
      enableOfflineQueue: config.enableOfflineQueue,
      retryStrategy: config.retryStrategy,
      reconnectOnError: config.reconnectOnError,
      sentinelRetryStrategy: (times) => {
        const delay = Math.min(times * 100, 3000);
        return delay;
      },
    });
    
    // Wait for connection
    await sentinel.ping();
    
    return sentinel;
  }
  
  /**
   * Create standalone Redis client
   */
  async createStandaloneClient() {
    const client = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
      maxRetriesPerRequest: config.maxRetriesPerRequest,
      enableReadyCheck: config.enableReadyCheck,
      enableOfflineQueue: config.enableOfflineQueue,
      retryStrategy: config.retryStrategy,
      reconnectOnError: config.reconnectOnError,
      lazyConnect: true,
    });
    
    await client.connect();
    return client;
  }
  
  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    this.client.on('connect', () => {
      console.log('[RedisClusterManager] Connected');
      this.isConnected = true;
    });
    
    this.client.on('ready', () => {
      console.log('[RedisClusterManager] Ready');
      this.isConnected = true;
    });
    
    this.client.on('error', (err) => {
      console.error('[RedisClusterManager] Error:', err.message);
      this.metrics.connectionErrors++;
      this.isConnected = false;
    });
    
    this.client.on('close', () => {
      console.log('[RedisClusterManager] Connection closed');
      this.isConnected = false;
    });
    
    this.client.on('reconnecting', () => {
      console.log('[RedisClusterManager] Reconnecting...');
      this.metrics.reconnections++;
    });
    
    this.client.on('end', () => {
      console.log('[RedisClusterManager] Connection ended');
      this.isConnected = false;
    });
    
    // Cluster-specific events
    if (this.mode === 'cluster') {
      this.client.on('node error', (err, node) => {
        console.error(`[RedisClusterManager] Node error (${node}):`, err.message);
      });
      
      this.client.on('+node', (node) => {
        console.log('[RedisClusterManager] Node added:', node);
      });
      
      this.client.on('-node', (node) => {
        console.log('[RedisClusterManager] Node removed:', node);
      });
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
        if (this.mode === 'cluster') {
          // Get cluster slots info
          const slots = await this.client.cluster('slots');
          this.metrics.clusterSlots = this.parseClusterSlots(slots);
        }
        
        // Test connectivity
        await this.client.ping();
        this.isConnected = true;
      } catch (error) {
        console.error('[RedisClusterManager] Health check failed:', error.message);
        this.isConnected = false;
      }
    }, 30000); // Every 30 seconds
  }
  
  /**
   * Parse cluster slots information
   */
  parseClusterSlots(slots) {
    const info = {};
    
    for (const slot of slots) {
      const [start, end, ...nodes] = slot;
      info[`${start}-${end}`] = nodes.map(node => ({
        host: node[0],
        port: node[1],
        nodeId: node[2],
      }));
    }
    
    return info;
  }
  
  /**
   * Get Redis client
   */
  getClient() {
    if (!this.client) {
      throw new Error('Redis client not initialized. Call connect() first.');
    }
    return this.client;
  }
  
  /**
   * Check if Redis is healthy
   */
  async isHealthy() {
    if (!this.client) return false;
    
    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Get cluster information
   */
  async getClusterInfo() {
    if (this.mode !== 'cluster') {
      return { mode: this.mode, message: 'Not in cluster mode' };
    }
    
    try {
      const [nodes, slots] = await Promise.all([
        this.client.cluster('nodes'),
        this.client.cluster('slots'),
      ]);
      
      return {
        mode: this.mode,
        nodes: this.parseClusterNodes(nodes),
        slots: this.parseClusterSlots(slots),
        slotCount: slots.length,
      };
    } catch (error) {
      return { mode: this.mode, error: error.message };
    }
  }
  
  /**
   * Parse cluster nodes output
   */
  parseClusterNodes(nodesOutput) {
    const nodes = [];
    const lines = nodesOutput.split('\n');
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const parts = line.split(' ');
      const [nodeId, address, flags, masterId, pingSent, pongRecv, configEpoch, linkState, ...slotRanges] = parts;
      
      nodes.push({
        nodeId,
        address,
        flags: flags.split(','),
        masterId: masterId === '-' ? null : masterId,
        pingSent: parseInt(pingSent, 10),
        pongRecv: parseInt(pongRecv, 10),
        configEpoch: parseInt(configEpoch, 10),
        linkState,
        slotRanges,
      });
    }
    
    return nodes;
  }
  
  /**
   * Get Redis info
   */
  async getInfo(section = 'all') {
    if (!this.client) return null;
    
    try {
      let info;
      if (this.mode === 'cluster') {
        // Get info from all nodes
        const nodes = this.client.nodes('master');
        info = await Promise.all(nodes.map(node => node.info(section)));
      } else {
        info = await this.client.info(section);
      }
      
      return this.parseInfo(info);
    } catch (error) {
      console.error('[RedisClusterManager] Failed to get info:', error.message);
      return null;
    }
  }
  
  /**
   * Parse Redis INFO output
   */
  parseInfo(info) {
    if (Array.isArray(info)) {
      return info.map(i => this.parseSingleInfo(i));
    }
    return this.parseSingleInfo(info);
  }
  
  parseSingleInfo(info) {
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
   * Execute command on specific node (cluster mode)
   */
  async executeOnNode(nodeAddress, command, ...args) {
    if (this.mode !== 'cluster') {
      throw new Error('Only available in cluster mode');
    }
    
    const nodes = this.client.nodes('all');
    const targetNode = nodes.find(node => {
      const options = node.options;
      return `${options.host}:${options.port}` === nodeAddress;
    });
    
    if (!targetNode) {
      throw new Error(`Node ${nodeAddress} not found`);
    }
    
    return targetNode[command](...args);
  }
  
  /**
   * Perform failover (sentinel mode)
   */
  async failover() {
    if (this.mode !== 'sentinel') {
      throw new Error('Only available in sentinel mode');
    }
    
    try {
      await this.client.sentinel('failover', config.sentinel.masterName);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      isConnected: this.isConnected,
      mode: this.mode,
    };
  }
  
  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      commandsExecuted: 0,
      commandsFailed: 0,
      connectionErrors: 0,
      reconnections: 0,
      clusterSlots: {},
    };
  }
  
  /**
   * Disconnect from Redis
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
   * Execute pipeline
   */
  async pipeline(operations) {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    
    const pipeline = this.client.pipeline();
    operations(pipeline);
    return pipeline.exec();
  }
  
  /**
   * Execute transaction
   */
  async transaction(operations) {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    
    const multi = this.client.multi();
    operations(multi);
    return multi.exec();
  }
}

// Create singleton instance
const redisClusterManager = new RedisClusterManager();

module.exports = {
  RedisClusterManager,
  redisClusterManager,
};