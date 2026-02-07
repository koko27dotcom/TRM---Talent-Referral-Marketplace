/**
 * ConnectionPoolService
 * MongoDB connection pooling and management for enterprise-scale performance
 * Features: Connection pooling, health monitoring, auto-scaling, failover, metrics tracking
 */

const { EventEmitter } = require('events');
const mongoose = require('mongoose');

// Configuration with environment variable defaults
const CONFIG = {
  // Pool size configuration
  POOL_MIN_SIZE: parseInt(process.env.DB_POOL_MIN_SIZE, 10) || 5,
  POOL_MAX_SIZE: parseInt(process.env.DB_POOL_MAX_SIZE, 10) || 50,
  
  // Timeout configuration (in milliseconds)
  CONNECTION_TIMEOUT: parseInt(process.env.DB_CONNECTION_TIMEOUT, 10) || 5000,
  IDLE_TIMEOUT: parseInt(process.env.DB_IDLE_TIMEOUT, 10) || 300000, // 5 minutes
  QUEUE_TIMEOUT: parseInt(process.env.DB_QUEUE_TIMEOUT, 10) || 10000, // 10 seconds
  
  // Auto-scaling configuration
  SCALE_UP_THRESHOLD: 0.8, // Scale up when pool utilization > 80%
  SCALE_DOWN_THRESHOLD: 0.3, // Scale down when pool utilization < 30%
  SCALE_UP_INCREMENT: 5, // Add 5 connections when scaling up
  SCALE_DOWN_DECREMENT: 3, // Remove 3 connections when scaling down
  SCALE_CHECK_INTERVAL: 30000, // Check every 30 seconds
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_BASE_DELAY: 100, // Base retry delay in ms
  
  // Health monitoring
  HEALTH_CHECK_INTERVAL: 60000, // Check every minute
  CONNECTION_MAX_AGE: 3600000, // Maximum connection age 1 hour
};

/**
 * Connection wrapper with metadata
 */
class PooledConnection {
  constructor(connection, id) {
    this.connection = connection;
    this.id = id;
    this.createdAt = Date.now();
    this.lastUsedAt = Date.now();
    this.acquiredAt = null;
    this.isAcquired = false;
    this.useCount = 0;
    this.errorCount = 0;
    this.lastError = null;
  }

  /**
   * Check if connection is idle
   * @returns {boolean}
   */
  isIdle() {
    return !this.isAcquired;
  }

  /**
   * Check if connection has expired
   * @returns {boolean}
   */
  isExpired() {
    const idleTime = Date.now() - this.lastUsedAt;
    const age = Date.now() - this.createdAt;
    return idleTime > CONFIG.IDLE_TIMEOUT || age > CONFIG.CONNECTION_MAX_AGE;
  }

  /**
   * Check if connection is healthy
   * @returns {boolean}
   */
  isHealthy() {
    if (!this.connection) return false;
    // Check mongoose connection state (1 = connected)
    return this.connection.readyState === 1 && this.errorCount < 3;
  }

  /**
   * Acquire the connection
   * @returns {mongoose.Connection}
   */
  acquire() {
    this.isAcquired = true;
    this.acquiredAt = Date.now();
    this.useCount++;
    this.lastUsedAt = Date.now();
    return this.connection;
  }

  /**
   * Release the connection back to pool
   */
  release() {
    this.isAcquired = false;
    this.acquiredAt = null;
    this.lastUsedAt = Date.now();
  }

  /**
   * Record an error on this connection
   * @param {Error} error
   */
  recordError(error) {
    this.errorCount++;
    this.lastError = error;
  }

  /**
   * Get connection statistics
   * @returns {Object}
   */
  getStats() {
    return {
      id: this.id,
      createdAt: this.createdAt,
      lastUsedAt: this.lastUsedAt,
      isAcquired: this.isAcquired,
      useCount: this.useCount,
      errorCount: this.errorCount,
      age: Date.now() - this.createdAt,
      idleTime: Date.now() - this.lastUsedAt,
    };
  }
}

/**
 * ConnectionPoolService
 * Manages MongoDB connection pools with enterprise features
 */
class ConnectionPoolService extends EventEmitter {
  constructor() {
    super();
    this.pool = new Map(); // Map of connectionId -> PooledConnection
    this.waitingQueue = []; // Array of { resolve, reject, timeout }
    this.isInitialized = false;
    this.isDraining = false;
    this.mongoUri = null;
    
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      queuedRequests: 0,
      queueTimeouts: 0,
      scaleUpEvents: 0,
      scaleDownEvents: 0,
      connectionErrors: 0,
      avgAcquisitionTime: 0,
      acquisitionTimes: [],
    };
    
    this.monitoringInterval = null;
    this.scalingInterval = null;
    this.cleanupInterval = null;
  }

  /**
   * Initialize the connection pool
   * @param {Object} options - Configuration options
   * @returns {Promise<void>}
   */
  async initialize(options = {}) {
    if (this.isInitialized) {
      throw new Error('Connection pool already initialized');
    }

    // Merge configuration
    if (options.minPoolSize) CONFIG.POOL_MIN_SIZE = options.minPoolSize;
    if (options.maxPoolSize) CONFIG.POOL_MAX_SIZE = options.maxPoolSize;
    if (options.connectionTimeout) CONFIG.CONNECTION_TIMEOUT = options.connectionTimeout;
    if (options.idleTimeout) CONFIG.IDLE_TIMEOUT = options.idleTimeout;
    if (options.queueTimeout) CONFIG.QUEUE_TIMEOUT = options.queueTimeout;
    if (options.mongoUri) this.mongoUri = options.mongoUri;

    this.isDraining = false;
    
    // Create initial connections up to min pool size
    const initialConnections = Math.max(CONFIG.POOL_MIN_SIZE, 2);
    for (let i = 0; i < initialConnections; i++) {
      try {
        await this.createConnection();
      } catch (error) {
        console.error('Failed to create initial connection:', error.message);
        throw error;
      }
    }

    this.isInitialized = true;
    
    // Start background tasks
    this.startMonitoring();
    this.startAutoScaling();
    this.startCleanup();
    
    this.emit('initialized', {
      poolSize: this.pool.size,
      minSize: CONFIG.POOL_MIN_SIZE,
      maxSize: CONFIG.POOL_MAX_SIZE,
    });
    
    console.log(`Connection pool initialized with ${this.pool.size} connections`);
  }

  /**
   * Create a new database connection
   * @returns {Promise<PooledConnection>}
   */
  async createConnection() {
    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const mongoUri = this.mongoUri || process.env.MONGODB_URI || 'mongodb://localhost:27017/saramart-referral';
      
      // Create new mongoose connection
      const connection = mongoose.createConnection(mongoUri, {
        maxPoolSize: 1, // Each connection manages its own internal pool of 1
        serverSelectionTimeoutMS: CONFIG.CONNECTION_TIMEOUT,
        socketTimeoutMS: 45000,
        family: 4,
      });

      // Wait for connection to be ready
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, CONFIG.CONNECTION_TIMEOUT);

        connection.once('connected', () => {
          clearTimeout(timeout);
          resolve();
        });

        connection.once('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      const pooledConn = new PooledConnection(connection, connectionId);
      this.pool.set(connectionId, pooledConn);
      
      // Set up connection event handlers
      connection.on('error', (err) => {
        console.error(`Connection ${connectionId} error:`, err.message);
        pooledConn.recordError(err);
        this.stats.connectionErrors++;
        this.emit('connectionError', { connectionId, error: err });
      });

      connection.on('disconnected', () => {
        console.warn(`Connection ${connectionId} disconnected`);
        this.pool.delete(connectionId);
        this.emit('connectionLost', { connectionId });
      });

      this.stats.totalConnections = this.pool.size;
      this.emit('connectionCreated', { connectionId });
      
      return pooledConn;
    } catch (error) {
      console.error(`Failed to create connection ${connectionId}:`, error.message);
      this.stats.connectionErrors++;
      throw error;
    }
  }

  /**
   * Get a connection from the pool
   * @returns {Promise<mongoose.Connection>}
   */
  async getConnection() {
    if (!this.isInitialized) {
      throw new Error('Connection pool not initialized');
    }

    if (this.isDraining) {
      throw new Error('Connection pool is draining');
    }

    this.stats.totalRequests++;
    const startTime = Date.now();

    // Try to get an available connection
    const availableConn = this.getAvailableConnection();
    if (availableConn) {
      const conn = availableConn.acquire();
      this.updateActiveCount();
      this.recordAcquisitionTime(Date.now() - startTime);
      this.stats.successfulRequests++;
      this.emit('connectionAcquired', { connectionId: availableConn.id });
      return conn;
    }

    // Pool is saturated, scale up if possible
    if (this.pool.size < CONFIG.POOL_MAX_SIZE) {
      try {
        await this.scalePool('up');
        const newConn = this.getAvailableConnection();
        if (newConn) {
          const conn = newConn.acquire();
          this.updateActiveCount();
          this.recordAcquisitionTime(Date.now() - startTime);
          this.stats.successfulRequests++;
          this.emit('connectionAcquired', { connectionId: newConn.id });
          return conn;
        }
      } catch (error) {
        console.warn('Failed to scale up pool:', error.message);
      }
    }

    // Wait for a connection to become available
    this.stats.queuedRequests++;
    return this.waitForConnection(CONFIG.QUEUE_TIMEOUT);
  }

  /**
   * Get an available (idle and healthy) connection
   * @returns {PooledConnection|null}
   */
  getAvailableConnection() {
    for (const [_, pooledConn] of this.pool) {
      if (pooledConn.isIdle() && pooledConn.isHealthy()) {
        return pooledConn;
      }
    }
    return null;
  }

  /**
   * Release a connection back to the pool
   * @param {mongoose.Connection} connection - Connection to release
   */
  releaseConnection(connection) {
    if (!connection) return;
    
    for (const [id, pooledConn] of this.pool) {
      if (pooledConn.connection === connection && pooledConn.isAcquired) {
        pooledConn.release();
        this.updateActiveCount();
        this.emit('connectionReleased', { connectionId: id });
        
        // Check if there are waiting requests
        this.processWaitingQueue();
        return;
      }
    }
  }

  /**
   * Wait for an available connection
   * @param {number} timeout - Maximum wait time in milliseconds
   * @returns {Promise<mongoose.Connection>}
   */
  async waitForConnection(timeout = CONFIG.QUEUE_TIMEOUT) {
    return new Promise((resolve, reject) => {
      const queueTimeout = setTimeout(() => {
        // Remove from waiting queue
        const index = this.waitingQueue.findIndex(item => item.reject === reject);
        if (index > -1) {
          this.waitingQueue.splice(index, 1);
        }
        this.stats.queueTimeouts++;
        this.stats.failedRequests++;
        reject(new Error('Connection queue timeout'));
      }, timeout);

      this.waitingQueue.push({
        resolve,
        reject,
        timeout: queueTimeout,
        enqueuedAt: Date.now(),
      });

      this.emit('requestQueued', { queueSize: this.waitingQueue.length });
    });
  }

  /**
   * Process waiting queue when connections become available
   */
  processWaitingQueue() {
    while (this.waitingQueue.length > 0) {
      const availableConn = this.getAvailableConnection();
      if (!availableConn) break;

      const waiting = this.waitingQueue.shift();
      clearTimeout(waiting.timeout);

      const conn = availableConn.acquire();
      this.updateActiveCount();
      this.emit('connectionAcquired', { connectionId: availableConn.id });
      waiting.resolve(conn);
    }
  }

  /**
   * Scale the pool size up or down
   * @param {string} direction - 'up' or 'down'
   * @returns {Promise<Object>}
   */
  async scalePool(direction) {
    if (direction === 'up') {
      const currentSize = this.pool.size;
      if (currentSize >= CONFIG.POOL_MAX_SIZE) {
        return { scaled: false, reason: 'max_size_reached' };
      }

      const newSize = Math.min(
        currentSize + CONFIG.SCALE_UP_INCREMENT,
        CONFIG.POOL_MAX_SIZE
      );
      const toAdd = newSize - currentSize;

      const created = [];
      for (let i = 0; i < toAdd; i++) {
        try {
          await this.createConnection();
          created.push(i);
        } catch (error) {
          console.warn(`Failed to create connection during scale up:`, error.message);
          break;
        }
      }

      this.stats.scaleUpEvents++;
      this.emit('poolScaledUp', { 
        previousSize: currentSize, 
        newSize: this.pool.size,
        added: created.length,
      });

      return { 
        scaled: true, 
        direction: 'up', 
        added: created.length,
        newSize: this.pool.size,
      };
    } else if (direction === 'down') {
      const currentSize = this.pool.size;
      if (currentSize <= CONFIG.POOL_MIN_SIZE) {
        return { scaled: false, reason: 'min_size_reached' };
      }

      const candidates = [];
      for (const [id, conn] of this.pool) {
        if (conn.isIdle() && conn.isHealthy()) {
          candidates.push(id);
        }
      }

      const toRemove = Math.min(
        candidates.length,
        CONFIG.SCALE_DOWN_DECREMENT,
        currentSize - CONFIG.POOL_MIN_SIZE
      );

      const removed = [];
      for (let i = 0; i < toRemove; i++) {
        const connId = candidates[i];
        const pooledConn = this.pool.get(connId);
        if (pooledConn) {
          await this.closeConnection(connId);
          removed.push(connId);
        }
      }

      this.stats.scaleDownEvents++;
      this.emit('poolScaledDown', { 
        previousSize: currentSize, 
        newSize: this.pool.size,
        removed: removed.length,
      });

      return { 
        scaled: true, 
        direction: 'down', 
        removed: removed.length,
        newSize: this.pool.size,
      };
    }

    return { scaled: false, reason: 'invalid_direction' };
  }

  /**
   * Close a specific connection
   * @param {string} connectionId - Connection ID to close
   */
  async closeConnection(connectionId) {
    const pooledConn = this.pool.get(connectionId);
    if (!pooledConn) return;

    try {
      await pooledConn.connection.close();
    } catch (error) {
      console.warn(`Error closing connection ${connectionId}:`, error.message);
    }

    this.pool.delete(connectionId);
    this.stats.totalConnections = this.pool.size;
    this.emit('connectionClosed', { connectionId });
  }

  /**
   * Configure pool settings dynamically
   * @param {Object} options - New configuration options
   */
  configurePool(options) {
    if (options.minPoolSize !== undefined) {
      CONFIG.POOL_MIN_SIZE = Math.max(1, options.minPoolSize);
    }
    if (options.maxPoolSize !== undefined) {
      CONFIG.POOL_MAX_SIZE = Math.max(CONFIG.POOL_MIN_SIZE, options.maxPoolSize);
    }
    if (options.connectionTimeout !== undefined) {
      CONFIG.CONNECTION_TIMEOUT = options.connectionTimeout;
    }
    if (options.idleTimeout !== undefined) {
      CONFIG.IDLE_TIMEOUT = options.idleTimeout;
    }
    if (options.queueTimeout !== undefined) {
      CONFIG.QUEUE_TIMEOUT = options.queueTimeout;
    }

    this.emit('configurationUpdated', {
      minSize: CONFIG.POOL_MIN_SIZE,
      maxSize: CONFIG.POOL_MAX_SIZE,
      connectionTimeout: CONFIG.CONNECTION_TIMEOUT,
    });

    return {
      minSize: CONFIG.POOL_MIN_SIZE,
      maxSize: CONFIG.POOL_MAX_SIZE,
      connectionTimeout: CONFIG.CONNECTION_TIMEOUT,
      idleTimeout: CONFIG.IDLE_TIMEOUT,
      queueTimeout: CONFIG.QUEUE_TIMEOUT,
    };
  }

  /**
   * Get pool statistics
   * @returns {Object}
   */
  getPoolStats() {
    const connections = [];
    for (const [id, conn] of this.pool) {
      connections.push(conn.getStats());
    }

    const utilization = this.pool.size > 0 
      ? (this.stats.activeConnections / this.pool.size) 
      : 0;

    const totalRequests = this.stats.totalRequests;
    const successRate = totalRequests > 0 
      ? (this.stats.successfulRequests / totalRequests) 
      : 1;

    return {
      pool: {
        size: this.pool.size,
        minSize: CONFIG.POOL_MIN_SIZE,
        maxSize: CONFIG.POOL_MAX_SIZE,
        utilization: utilization.toFixed(4),
      },
      connections: {
        total: this.stats.totalConnections,
        active: this.stats.activeConnections,
        idle: this.stats.idleConnections,
        details: connections,
      },
      requests: {
        total: this.stats.totalRequests,
        successful: this.stats.successfulRequests,
        failed: this.stats.failedRequests,
        successRate: successRate.toFixed(4),
      },
      queue: {
        waiting: this.waitingQueue.length,
        totalQueued: this.stats.queuedRequests,
        timeouts: this.stats.queueTimeouts,
      },
      scaling: {
        scaleUpEvents: this.stats.scaleUpEvents,
        scaleDownEvents: this.stats.scaleDownEvents,
      },
      performance: {
        avgAcquisitionTime: this.stats.avgAcquisitionTime.toFixed(2),
        connectionErrors: this.stats.connectionErrors,
      },
      initialized: this.isInitialized,
      draining: this.isDraining,
    };
  }

  /**
   * Get count of active connections
   * @returns {number}
   */
  getActiveConnections() {
    return this.stats.activeConnections;
  }

  /**
   * Get count of idle connections
   * @returns {number}
   */
  getIdleConnections() {
    return this.stats.idleConnections;
  }

  /**
   * Monitor and report connection health
   * @returns {Object}
   */
  monitorConnections() {
    const health = {
      healthy: 0,
      unhealthy: 0,
      expired: 0,
      details: [],
    };

    for (const [id, conn] of this.pool) {
      const connHealth = {
        id,
        healthy: conn.isHealthy(),
        expired: conn.isExpired(),
        acquired: conn.isAcquired,
        errorCount: conn.errorCount,
      };

      if (conn.isExpired()) {
        health.expired++;
      } else if (conn.isHealthy()) {
        health.healthy++;
      } else {
        health.unhealthy++;
      }

      health.details.push(connHealth);
    }

    this.emit('healthCheck', health);
    return health;
  }

  /**
   * Get overall connection health status
   * @returns {Object}
   */
  getHealth() {
    const monitored = this.monitorConnections();
    const total = this.pool.size;
    
    const healthyRatio = total > 0 ? (monitored.healthy / total) : 1;
    
    let status = 'healthy';
    if (healthyRatio < 0.5) {
      status = 'critical';
    } else if (healthyRatio < 0.8) {
      status = 'degraded';
    }

    return {
      status,
      healthyRatio: healthyRatio.toFixed(4),
      totalConnections: total,
      healthy: monitored.healthy,
      unhealthy: monitored.unhealthy,
      expired: monitored.expired,
      queueSize: this.waitingQueue.length,
      isDraining: this.isDraining,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Gracefully drain the pool
   * @returns {Promise<void>}
   */
  async drain() {
    console.log('Draining connection pool...');
    this.isDraining = true;

    // Stop monitoring and scaling
    this.stopBackgroundTasks();

    // Wait for all connections to be released
    const drainStart = Date.now();
    const maxWaitTime = 30000; // 30 seconds

    while (this.stats.activeConnections > 0) {
      if (Date.now() - drainStart > maxWaitTime) {
        console.warn('Drain timeout, forcing close of active connections');
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Reject all waiting queue requests
    while (this.waitingQueue.length > 0) {
      const waiting = this.waitingQueue.shift();
      clearTimeout(waiting.timeout);
      waiting.reject(new Error('Connection pool is draining'));
    }

    this.emit('drainComplete');
    console.log('Connection pool drained');
  }

  /**
   * Close all connections gracefully
   * @returns {Promise<void>}
   */
  async closeAll() {
    await this.drain();

    console.log('Closing all connections...');
    const closePromises = [];
    
    for (const [id, pooledConn] of this.pool) {
      closePromises.push(
        pooledConn.connection.close().catch(err => {
          console.warn(`Error closing connection ${id}:`, err.message);
        })
      );
    }

    await Promise.all(closePromises);
    this.pool.clear();
    
    this.stats.totalConnections = 0;
    this.stats.activeConnections = 0;
    this.stats.idleConnections = 0;
    this.isInitialized = false;
    
    this.emit('poolClosed');
    console.log('All connections closed');
  }

  // ==================== Private Methods ====================

  /**
   * Update active/idle connection counts
   */
  updateActiveCount() {
    let active = 0;
    let idle = 0;
    
    for (const [_, conn] of this.pool) {
      if (conn.isAcquired) {
        active++;
      } else {
        idle++;
      }
    }
    
    this.stats.activeConnections = active;
    this.stats.idleConnections = idle;
  }

  /**
   * Record connection acquisition time
   * @param {number} time - Time in milliseconds
   */
  recordAcquisitionTime(time) {
    this.stats.acquisitionTimes.push(time);
    
    // Keep only last 100 measurements
    if (this.stats.acquisitionTimes.length > 100) {
      this.stats.acquisitionTimes.shift();
    }
    
    // Calculate average
    const sum = this.stats.acquisitionTimes.reduce((a, b) => a + b, 0);
    this.stats.avgAcquisitionTime = sum / this.stats.acquisitionTimes.length;
  }

  /**
   * Start health monitoring
   */
  startMonitoring() {
    this.monitoringInterval = setInterval(() => {
      const health = this.monitorConnections();
      
      // Log warnings for unhealthy connections
      if (health.unhealthy > 0) {
        console.warn(`Unhealthy connections detected: ${health.unhealthy}`);
      }
      
      // Close expired connections
      if (health.expired > 0) {
        this.closeExpiredConnections();
      }
    }, CONFIG.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Start auto-scaling
   */
  startAutoScaling() {
    this.scalingInterval = setInterval(() => {
      if (this.isDraining) return;
      
      const utilization = this.pool.size > 0 
        ? (this.stats.activeConnections / this.pool.size) 
        : 0;

      if (utilization > CONFIG.SCALE_UP_THRESHOLD) {
        this.scalePool('up').catch(err => {
          console.warn('Auto-scale up failed:', err.message);
        });
      } else if (utilization < CONFIG.SCALE_DOWN_THRESHOLD && this.pool.size > CONFIG.POOL_MIN_SIZE) {
        this.scalePool('down').catch(err => {
          console.warn('Auto-scale down failed:', err.message);
        });
      }
    }, CONFIG.SCALE_CHECK_INTERVAL);
  }

  /**
   * Start cleanup routine
   */
  startCleanup() {
    this.cleanupInterval = setInterval(() => {
      this.closeExpiredConnections();
    }, CONFIG.IDLE_TIMEOUT / 2);
  }

  /**
   * Close expired connections
   */
  async closeExpiredConnections() {
    const expiredIds = [];
    
    for (const [id, conn] of this.pool) {
      if (conn.isExpired() && conn.isIdle()) {
        expiredIds.push(id);
      }
    }

    for (const id of expiredIds) {
      await this.closeConnection(id);
    }

    if (expiredIds.length > 0) {
      this.emit('connectionsExpired', { count: expiredIds.length });
    }
  }

  /**
   * Stop all background tasks
   */
  stopBackgroundTasks() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    if (this.scalingInterval) {
      clearInterval(this.scalingInterval);
      this.scalingInterval = null;
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Export singleton instance
const connectionPoolService = new ConnectionPoolService();

module.exports = connectionPoolService;
