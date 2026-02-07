/**
 * Database Connection Pool Configuration
 * Advanced connection pooling with monitoring and auto-scaling
 */

const mongoose = require('mongoose');
const { EventEmitter } = require('events');
const performanceConfig = require('./performance.js');

const { database: config } = performanceConfig;

/**
 * Database Pool Manager
 * Manages MongoDB connection pool with health monitoring
 */
class DatabasePoolManager extends EventEmitter {
  constructor() {
    super();
    
    this.connection = null;
    this.isConnected = false;
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingConnections: 0,
      totalQueries: 0,
      slowQueries: 0,
      failedQueries: 0,
    };
    this.healthCheckInterval = null;
    this.metricsInterval = null;
  }
  
  /**
   * Initialize database connection with pooling
   */
  async connect(uri, options = {}) {
    if (this.isConnected && this.connection) {
      return this.connection;
    }
    
    const connectionOptions = {
      // Pool settings
      minPoolSize: options.minPoolSize || config.minPoolSize,
      maxPoolSize: options.maxPoolSize || config.maxPoolSize,
      maxIdleTimeMS: options.maxIdleTimeMS || config.maxIdleTimeMS,
      waitQueueTimeoutMS: options.waitQueueTimeoutMS || config.queueTimeout,
      
      // Timeout settings
      connectTimeoutMS: options.connectTimeoutMS || config.connectTimeoutMS,
      socketTimeoutMS: options.socketTimeoutMS || config.socketTimeoutMS,
      serverSelectionTimeoutMS: options.serverSelectionTimeoutMS || config.serverSelectionTimeoutMS,
      heartbeatFrequencyMS: options.heartbeatFrequencyMS || config.heartbeatFrequencyMS,
      
      // Retry settings
      retryWrites: options.retryWrites !== false,
      retryReads: options.retryReads !== false,
      
      // Read preferences
      readPreference: options.readPreference || config.readPreference,
      
      // Write concern
      w: options.w || config.w,
      journal: options.journal !== false,
      
      // Monitoring
      monitorCommands: options.monitorCommands !== false,
      
      // Compression
      compressors: options.compressors || config.compressors,
    };
    
    try {
      // Setup connection event handlers before connecting
      mongoose.connection.on('connecting', () => {
        console.log('[DatabasePool] Connecting...');
        this.emit('connecting');
      });
      
      mongoose.connection.on('connected', () => {
        console.log('[DatabasePool] Connected');
        this.isConnected = true;
        this.emit('connected');
      });
      
      mongoose.connection.on('open', () => {
        console.log('[DatabasePool] Connection opened');
        this.emit('open');
      });
      
      mongoose.connection.on('disconnected', () => {
        console.log('[DatabasePool] Disconnected');
        this.isConnected = false;
        this.emit('disconnected');
      });
      
      mongoose.connection.on('reconnected', () => {
        console.log('[DatabasePool] Reconnected');
        this.isConnected = true;
        this.emit('reconnected');
      });
      
      mongoose.connection.on('error', (err) => {
        console.error('[DatabasePool] Error:', err.message);
        this.emit('error', err);
      });
      
      // Monitor commands for performance tracking
      mongoose.connection.on('commandStarted', (event) => {
        this.emit('commandStarted', event);
      });
      
      mongoose.connection.on('commandSucceeded', (event) => {
        this.stats.totalQueries++;
        
        if (event.duration > config.maxTimeMS) {
          this.stats.slowQueries++;
          this.emit('slowQuery', event);
        }
        
        this.emit('commandSucceeded', event);
      });
      
      mongoose.connection.on('commandFailed', (event) => {
        this.stats.failedQueries++;
        this.emit('commandFailed', event);
      });
      
      // Connect to MongoDB
      await mongoose.connect(uri, connectionOptions);
      
      this.connection = mongoose.connection;
      this.isConnected = true;
      
      // Start monitoring
      this.startHealthCheck();
      this.startMetricsCollection();
      
      console.log('[DatabasePool] Connection established with pooling');
      console.log(`[DatabasePool] Pool size: ${connectionOptions.minPoolSize}-${connectionOptions.maxPoolSize}`);
      
      return this.connection;
    } catch (error) {
      console.error('[DatabasePool] Connection failed:', error.message);
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
        if (this.connection) {
          // Check connection health with ping
          await this.connection.db.admin().ping();
          
          // Update connection stats
          const serverStatus = await this.connection.db.admin().serverStatus();
          
          if (serverStatus.connections) {
            this.stats.totalConnections = serverStatus.connections.current;
            this.stats.activeConnections = serverStatus.connections.active || 0;
            this.stats.idleConnections = serverStatus.connections.available || 0;
            this.stats.waitingConnections = serverStatus.connections.totalCreated || 0;
          }
          
          this.emit('healthCheck', { healthy: true, stats: this.stats });
        }
      } catch (error) {
        console.error('[DatabasePool] Health check failed:', error.message);
        this.emit('healthCheck', { healthy: false, error: error.message });
      }
    }, config.heartbeatFrequencyMS);
  }
  
  /**
   * Start metrics collection
   */
  startMetricsCollection() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    
    this.metricsInterval = setInterval(() => {
      this.emit('metrics', { ...this.stats });
    }, 60000); // Every minute
  }
  
  /**
   * Get connection pool status
   */
  getPoolStatus() {
    if (!this.connection) {
      return { connected: false };
    }
    
    return {
      connected: this.isConnected,
      readyState: this.connection.readyState,
      poolSize: this.connection.poolSize,
      host: this.connection.host,
      port: this.connection.port,
      name: this.connection.name,
      stats: { ...this.stats },
    };
  }
  
  /**
   * Get current operations
   */
  async getCurrentOperations() {
    if (!this.connection) {
      return null;
    }
    
    try {
      const result = await this.connection.db.admin().command({
        currentOp: true,
        $or: [
          { 'secs_running': { $gt: 0 } },
          { 'waitForLock': true },
        ],
      });
      
      return result.inprog || [];
    } catch (error) {
      console.error('[DatabasePool] Failed to get current operations:', error.message);
      return null;
    }
  }
  
  /**
   * Kill long-running operations
   */
  async killLongRunningOperations(maxSeconds = 60) {
    const operations = await this.getCurrentOperations();
    
    if (!operations) return [];
    
    const killed = [];
    
    for (const op of operations) {
      if (op.secs_running > maxSeconds) {
        try {
          await this.connection.db.admin().command({ killOp: 1, op: op.opid });
          killed.push({
            opid: op.opid,
            secsRunning: op.secs_running,
            ns: op.ns,
            query: op.command,
          });
        } catch (error) {
          console.error(`[DatabasePool] Failed to kill operation ${op.opid}:`, error.message);
        }
      }
    }
    
    return killed;
  }
  
  /**
   * Get server status
   */
  async getServerStatus() {
    if (!this.connection) {
      return null;
    }
    
    try {
      const status = await this.connection.db.admin().serverStatus();
      
      return {
        host: status.host,
        version: status.version,
        process: status.process,
        uptime: status.uptime,
        connections: status.connections,
        memory: status.mem,
        network: status.network,
        opcounters: status.opcounters,
        globalLock: status.globalLock,
        wiredTiger: status.wiredTiger ? {
          cache: status.wiredTiger.cache,
          concurrentTransactions: status.wiredTiger['concurrentTransactions'],
        } : null,
      };
    } catch (error) {
      console.error('[DatabasePool] Failed to get server status:', error.message);
      return null;
    }
  }
  
  /**
   * Get database statistics
   */
  async getDatabaseStats() {
    if (!this.connection) {
      return null;
    }
    
    try {
      const stats = await this.connection.db.stats();
      return {
        db: stats.db,
        collections: stats.collections,
        objects: stats.objects,
        avgObjSize: stats.avgObjSize,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize,
        totalSize: stats.totalSize,
      };
    } catch (error) {
      console.error('[DatabasePool] Failed to get database stats:', error.message);
      return null;
    }
  }
  
  /**
   * Check if replica set
   */
  async isReplicaSet() {
    if (!this.connection) {
      return false;
    }
    
    try {
      const status = await this.connection.db.admin().replSetGetStatus();
      return status.ok === 1;
    } catch {
      return false;
    }
  }
  
  /**
   * Get replica set status
   */
  async getReplicaSetStatus() {
    if (!this.connection) {
      return null;
    }
    
    try {
      const status = await this.connection.db.admin().replSetGetStatus();
      
      return {
        set: status.set,
        myState: status.myState,
        members: status.members.map(m => ({
          name: m.name,
          state: m.state,
          stateStr: m.stateStr,
          health: m.health,
          uptime: m.uptime,
          optimeDate: m.optimeDate,
          lastHeartbeat: m.lastHeartbeat,
          pingMs: m.pingMs,
        })),
      };
    } catch (error) {
      console.error('[DatabasePool] Failed to get replica set status:', error.message);
      return null;
    }
  }
  
  /**
   * Set read preference
   */
  async setReadPreference(readPreference) {
    if (!this.connection) {
      throw new Error('Not connected');
    }
    
    // Update connection options
    this.connection.setClient({
      readPreference,
    });
    
    return { success: true, readPreference };
  }
  
  /**
   * Reset connection pool
   */
  async resetPool() {
    if (!this.connection) {
      return { success: false, error: 'Not connected' };
    }
    
    try {
      // Close existing connections
      await mongoose.disconnect();
      
      // Clear stats
      this.stats = {
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0,
        waitingConnections: 0,
        totalQueries: 0,
        slowQueries: 0,
        failedQueries: 0,
      };
      
      // Reconnect
      await this.connect(process.env.MONGODB_URI);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Disconnect from database
   */
  async disconnect() {
    // Stop intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
    
    // Disconnect
    if (this.connection) {
      await mongoose.disconnect();
      this.connection = null;
      this.isConnected = false;
    }
    
    console.log('[DatabasePool] Disconnected');
  }
  
  /**
   * Create a session for transactions
   */
  startSession() {
    if (!this.connection) {
      throw new Error('Not connected');
    }
    
    return this.connection.startSession();
  }
  
  /**
   * Execute with transaction
   */
  async withTransaction(operations) {
    const session = this.startSession();
    
    try {
      session.startTransaction();
      
      const result = await operations(session);
      
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

// Create singleton instance
const databasePoolManager = new DatabasePoolManager();

module.exports = {
  DatabasePoolManager,
  databasePoolManager,
};