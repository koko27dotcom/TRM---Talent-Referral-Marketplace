/**
 * Real-Time Analytics Service
 * WebSocket-based real-time analytics for the TRM Referral Platform
 * Supports live metrics, event streaming, and anomaly detection
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { redisManager, keyHelpers } = require('../config/redis.js');
const { AnalyticsEvent, AnalyticsSession, User, Referral, Job, PaymentTransaction } = require('../models/index.js');

// Configuration
const CONFIG = {
  // WebSocket settings
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Throttling settings
  broadcastThrottleMs: 1000, // Minimum time between broadcasts
  metricsCacheTTL: 30, // Cache metrics for 30 seconds
  // Anomaly detection
  anomalyThresholds: {
    trafficSpike: 2.0, // 2x normal traffic
    errorRate: 0.1, // 10% error rate
    conversionDrop: 0.5, // 50% drop in conversion
    revenueSpike: 3.0, // 3x normal revenue
  },
  // Alert levels
  alertLevels: {
    INFO: 'info',
    WARNING: 'warning',
    CRITICAL: 'critical',
  },
  // Room types
  rooms: {
    ADMIN: 'admin',
    COMPANY: 'company',
    REFERRER: 'referrer',
    PUBLIC: 'public',
  },
};

// JWT configuration
const JWT_CONFIG = {
  accessTokenSecret: process.env.JWT_ACCESS_SECRET || 'your-access-secret-key-change-in-production',
};

/**
 * Real-Time Analytics Service
 * Manages WebSocket connections, broadcasts metrics, and handles real-time events
 */
class RealtimeAnalyticsService {
  constructor() {
    this.io = null;
    this.redis = null;
    this.connectedClients = new Map(); // socketId -> clientInfo
    this.roomSubscriptions = new Map(); // room -> Set(socketIds)
    this.metricsCache = new Map(); // metricType -> { data, timestamp }
    this.lastBroadcastTime = 0;
    this.anomalyHistory = []; // Recent anomaly detections
    this.eventStreamBuffer = []; // Buffered events for streaming
    this.isInitialized = false;
    this.metricsInterval = null;
    this.anomalyInterval = null;
  }

  /**
   * Initialize WebSocket server
   * @param {http.Server} server - HTTP server instance
   * @returns {Promise<void>}
   */
  async initialize(server) {
    if (this.isInitialized) {
      console.log('[RealtimeAnalytics] Already initialized');
      return;
    }

    try {
      // Initialize Redis connection
      this.redis = await redisManager.connect();
      console.log('[RealtimeAnalytics] Redis connected');

      // Initialize Socket.io
      this.io = new Server(server, {
        cors: CONFIG.cors,
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000,
      });

      // Set up connection handler
      this.io.on('connection', (socket) => this.handleConnection(socket));

      // Start background tasks
      this.startBackgroundTasks();

      this.isInitialized = true;
      console.log('[RealtimeAnalytics] WebSocket server initialized');
    } catch (error) {
      console.error('[RealtimeAnalytics] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Handle new WebSocket connection
   * @param {Socket} socket - Socket.io socket instance
   */
  async handleConnection(socket) {
    console.log(`[RealtimeAnalytics] New connection: ${socket.id}`);

    // Initialize client info
    const clientInfo = {
      socketId: socket.id,
      userId: null,
      role: null,
      companyId: null,
      rooms: new Set(),
      connectedAt: new Date(),
      lastActivity: new Date(),
      isAuthenticated: false,
    };

    this.connectedClients.set(socket.id, clientInfo);

    // Set up socket event handlers
    socket.on('authenticate', (data) => this.handleAuthenticate(socket, data));
    socket.on('subscribe', (data) => this.handleSubscribe(socket, data));
    socket.on('unsubscribe', (data) => this.handleUnsubscribe(socket, data));
    socket.on('get_metrics', () => this.handleGetMetrics(socket));
    socket.on('get_live_metrics', () => this.handleGetLiveMetrics(socket));
    socket.on('ping', () => this.handlePing(socket));
    socket.on('disconnect', () => this.handleDisconnect(socket));

    // Send initial connection acknowledgment
    socket.emit('connected', {
      socketId: socket.id,
      timestamp: new Date().toISOString(),
      message: 'Connected to real-time analytics',
    });

    // Auto-subscribe to public room
    this.subscribe(socket, CONFIG.rooms.PUBLIC);
  }

  /**
   * Handle authentication
   * @param {Socket} socket - Socket instance
   * @param {Object} data - Authentication data
   */
  async handleAuthenticate(socket, data) {
    try {
      const { token } = data;

      if (!token) {
        socket.emit('auth_error', { message: 'Token required' });
        return;
      }

      // Verify JWT token
      const decoded = jwt.verify(token, JWT_CONFIG.accessTokenSecret);
      const clientInfo = this.connectedClients.get(socket.id);

      if (!clientInfo) {
        socket.emit('auth_error', { message: 'Client not found' });
        return;
      }

      // Update client info
      clientInfo.userId = decoded.sub;
      clientInfo.role = decoded.role;
      clientInfo.companyId = decoded.companyId || null;
      clientInfo.isAuthenticated = true;
      clientInfo.lastActivity = new Date();

      // Store in Redis for tracking active users
      await this.trackActiveUser(decoded.sub, socket.id);

      // Auto-subscribe to role-based room
      if (decoded.role === 'admin') {
        this.subscribe(socket, CONFIG.rooms.ADMIN);
      } else if (decoded.role === 'company') {
        this.subscribe(socket, `${CONFIG.rooms.COMPANY}:${decoded.companyId}`);
      } else if (decoded.role === 'referrer') {
        this.subscribe(socket, `${CONFIG.rooms.REFERRER}:${decoded.sub}`);
      }

      socket.emit('authenticated', {
        success: true,
        userId: decoded.sub,
        role: decoded.role,
      });

      console.log(`[RealtimeAnalytics] Client ${socket.id} authenticated as ${decoded.role}`);
    } catch (error) {
      console.error('[RealtimeAnalytics] Authentication error:', error);
      socket.emit('auth_error', { message: 'Invalid token', error: error.message });
    }
  }

  /**
   * Handle subscription request
   * @param {Socket} socket - Socket instance
   * @param {Object} data - Subscription data
   */
  handleSubscribe(socket, data) {
    const { room } = data;
    const clientInfo = this.connectedClients.get(socket.id);

    if (!clientInfo) {
      socket.emit('subscribe_error', { message: 'Client not found' });
      return;
    }

    // Check permissions for private rooms
    if (room.startsWith(CONFIG.rooms.ADMIN) && clientInfo.role !== 'admin') {
      socket.emit('subscribe_error', { message: 'Admin access required' });
      return;
    }

    if (room.startsWith(CONFIG.rooms.COMPANY)) {
      const companyId = room.split(':')[1];
      if (clientInfo.role !== 'admin' && clientInfo.companyId !== companyId) {
        socket.emit('subscribe_error', { message: 'Company access required' });
        return;
      }
    }

    this.subscribe(socket, room);
    socket.emit('subscribed', { room });
  }

  /**
   * Handle unsubscription request
   * @param {Socket} socket - Socket instance
   * @param {Object} data - Unsubscription data
   */
  handleUnsubscribe(socket, data) {
    const { room } = data;
    this.unsubscribe(socket, room);
    socket.emit('unsubscribed', { room });
  }

  /**
   * Handle metrics request
   * @param {Socket} socket - Socket instance
   */
  async handleGetMetrics(socket) {
    try {
      const metrics = await this.getLiveMetrics();
      socket.emit('metrics', metrics);
    } catch (error) {
      console.error('[RealtimeAnalytics] Error getting metrics:', error);
      socket.emit('metrics_error', { message: 'Failed to get metrics' });
    }
  }

  /**
   * Handle live metrics request
   * @param {Socket} socket - Socket instance
   */
  async handleGetLiveMetrics(socket) {
    try {
      const metrics = await this.getLiveMetrics();
      socket.emit('live_metrics', metrics);
    } catch (error) {
      console.error('[RealtimeAnalytics] Error getting live metrics:', error);
      socket.emit('metrics_error', { message: 'Failed to get live metrics' });
    }
  }

  /**
   * Handle ping
   * @param {Socket} socket - Socket instance
   */
  async handlePing(socket) {
    const clientInfo = this.connectedClients.get(socket.id);
    if (clientInfo) {
      clientInfo.lastActivity = new Date();
    }
    socket.emit('pong', { timestamp: new Date().toISOString() });
  }

  /**
   * Handle disconnection
   * @param {Socket} socket - Socket instance
   */
  async handleDisconnect(socket) {
    console.log(`[RealtimeAnalytics] Disconnected: ${socket.id}`);
    await this.disconnect(socket);
  }

  /**
   * Subscribe socket to a room
   * @param {Socket} socket - Socket instance
   * @param {string} room - Room name
   */
  subscribe(socket, room) {
    socket.join(room);

    // Update room subscriptions
    if (!this.roomSubscriptions.has(room)) {
      this.roomSubscriptions.set(room, new Set());
    }
    this.roomSubscriptions.get(room).add(socket.id);

    // Update client info
    const clientInfo = this.connectedClients.get(socket.id);
    if (clientInfo) {
      clientInfo.rooms.add(room);
    }

    console.log(`[RealtimeAnalytics] Socket ${socket.id} subscribed to ${room}`);
  }

  /**
   * Unsubscribe socket from a room
   * @param {Socket} socket - Socket instance
   * @param {string} room - Room name
   */
  unsubscribe(socket, room) {
    socket.leave(room);

    // Update room subscriptions
    const roomSet = this.roomSubscriptions.get(room);
    if (roomSet) {
      roomSet.delete(socket.id);
      if (roomSet.size === 0) {
        this.roomSubscriptions.delete(room);
      }
    }

    // Update client info
    const clientInfo = this.connectedClients.get(socket.id);
    if (clientInfo) {
      clientInfo.rooms.delete(room);
    }

    console.log(`[RealtimeAnalytics] Socket ${socket.id} unsubscribed from ${room}`);
  }

  /**
   * Broadcast event to specific room
   * @param {string} event - Event name
   * @param {Object} data - Event data
   * @param {string} room - Target room (optional, broadcasts to all if not specified)
   */
  broadcast(event, data, room = null) {
    if (!this.io) {
      console.warn('[RealtimeAnalytics] Cannot broadcast: server not initialized');
      return;
    }

    const payload = {
      ...data,
      timestamp: new Date().toISOString(),
    };

    if (room) {
      this.io.to(room).emit(event, payload);
    } else {
      this.io.emit(event, payload);
    }
  }

  /**
   * Broadcast metrics to all connected clients (throttled)
   */
  async broadcastMetrics() {
    const now = Date.now();

    // Check throttle
    if (now - this.lastBroadcastTime < CONFIG.broadcastThrottleMs) {
      return;
    }

    try {
      const metrics = await this.getLiveMetrics();

      // Broadcast to different rooms with appropriate data
      this.broadcast('metrics_update', metrics, CONFIG.rooms.PUBLIC);

      // Admin gets full metrics
      this.broadcast('metrics_update', {
        ...metrics,
        detailed: true,
        internalMetrics: await this.getInternalMetrics(),
      }, CONFIG.rooms.ADMIN);

      this.lastBroadcastTime = now;
    } catch (error) {
      console.error('[RealtimeAnalytics] Error broadcasting metrics:', error);
    }
  }

  /**
   * Get current live metrics
   * @returns {Promise<Object>} Live metrics
   */
  async getLiveMetrics() {
    const cacheKey = 'live_metrics';
    const cached = this.metricsCache.get(cacheKey);

    // Return cached metrics if still valid
    if (cached && (Date.now() - cached.timestamp) < CONFIG.metricsCacheTTL * 1000) {
      return cached.data;
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get metrics in parallel
      const [
        activeUsers,
        todaysRevenue,
        todaysReferrals,
        todaysJobs,
        conversionRates,
        geographicDistribution,
        onlineUsers,
      ] = await Promise.all([
        this.getActiveUsers(),
        this.getTodaysRevenue(),
        this.getTodaysReferrals(),
        this.getTodaysJobs(),
        this.getConversionRates(),
        this.getGeographicDistribution(),
        this.getOnlineUsers(),
      ]);

      const metrics = {
        activeUsers,
        todaysRevenue,
        todaysReferrals,
        todaysJobs,
        conversionRates,
        geographicDistribution,
        onlineUsers: onlineUsers.length,
        onlineUserIds: onlineUsers,
        timestamp: new Date().toISOString(),
      };

      // Cache metrics
      this.metricsCache.set(cacheKey, {
        data: metrics,
        timestamp: Date.now(),
      });

      // Also cache in Redis for persistence
      await this.cacheMetricsInRedis(metrics);

      return metrics;
    } catch (error) {
      console.error('[RealtimeAnalytics] Error getting live metrics:', error);

      // Return cached metrics even if expired, or empty metrics
      return cached?.data || this.getEmptyMetrics();
    }
  }

  /**
   * Get empty metrics structure
   * @returns {Object} Empty metrics
   */
  getEmptyMetrics() {
    return {
      activeUsers: 0,
      todaysRevenue: 0,
      todaysReferrals: 0,
      todaysJobs: 0,
      conversionRates: {},
      geographicDistribution: [],
      onlineUsers: 0,
      onlineUserIds: [],
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get internal metrics for admin
   * @returns {Promise<Object>} Internal metrics
   */
  async getInternalMetrics() {
    return {
      connectedClients: this.connectedClients.size,
      roomSubscriptions: Array.from(this.roomSubscriptions.entries()).map(([room, sockets]) => ({
        room,
        subscriberCount: sockets.size,
      })),
      redisConnected: redisManager.isHealthy(),
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
    };
  }

  /**
   * Get count of active users (currently online)
   * @returns {Promise<number>} Active user count
   */
  async getActiveUsers() {
    try {
      // Count from Redis active users set
      const activeUsersKey = keyHelpers.stats('active_users');
      const count = await this.redis.scard(activeUsersKey);
      return count;
    } catch (error) {
      console.error('[RealtimeAnalytics] Error getting active users:', error);
      return this.connectedClients.size;
    }
  }

  /**
   * Get list of online user IDs
   * @returns {Promise<Array<string>>} Online user IDs
   */
  async getOnlineUsers() {
    try {
      const activeUsersKey = keyHelpers.stats('active_users');
      const users = await this.redis.smembers(activeUsersKey);
      return users;
    } catch (error) {
      console.error('[RealtimeAnalytics] Error getting online users:', error);
      return Array.from(this.connectedClients.values())
        .filter(c => c.userId)
        .map(c => c.userId);
    }
  }

  /**
   * Get today's revenue
   * @returns {Promise<number>} Today's revenue
   */
  async getTodaysRevenue() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Try cache first
      const cacheKey = keyHelpers.stats('revenue', 'today');
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        return parseFloat(cached);
      }

      // Calculate from database
      const result = await PaymentTransaction.aggregate([
        {
          $match: {
            status: 'completed',
            createdAt: { $gte: today },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ]);

      const revenue = result[0]?.total || 0;

      // Cache for 5 minutes
      await this.redis.setex(cacheKey, 300, revenue.toString());

      return revenue;
    } catch (error) {
      console.error('[RealtimeAnalytics] Error getting today\'s revenue:', error);
      return 0;
    }
  }

  /**
   * Get today's referrals
   * @returns {Promise<number>} Today's referral count
   */
  async getTodaysReferrals() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const cacheKey = keyHelpers.stats('referrals', 'today');
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        return parseInt(cached, 10);
      }

      const count = await Referral.countDocuments({
        createdAt: { $gte: today },
      });

      // Cache for 5 minutes
      await this.redis.setex(cacheKey, 300, count.toString());

      return count;
    } catch (error) {
      console.error('[RealtimeAnalytics] Error getting today\'s referrals:', error);
      return 0;
    }
  }

  /**
   * Get today's job postings
   * @returns {Promise<number>} Today's job count
   */
  async getTodaysJobs() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const cacheKey = keyHelpers.stats('jobs', 'today');
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        return parseInt(cached, 10);
      }

      const count = await Job.countDocuments({
        createdAt: { $gte: today },
      });

      // Cache for 5 minutes
      await this.redis.setex(cacheKey, 300, count.toString());

      return count;
    } catch (error) {
      console.error('[RealtimeAnalytics] Error getting today\'s jobs:', error);
      return 0;
    }
  }

  /**
   * Get conversion rates
   * @returns {Promise<Object>} Conversion rates
   */
  async getConversionRates() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const cacheKey = keyHelpers.stats('conversion_rates', 'today');
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      // Get conversion events
      const conversions = await AnalyticsEvent.countDocuments({
        eventType: 'conversion',
        timestamp: { $gte: today },
      });

      const pageViews = await AnalyticsEvent.countDocuments({
        eventType: 'page_view',
        timestamp: { $gte: today },
      });

      const clicks = await AnalyticsEvent.countDocuments({
        eventType: 'click',
        timestamp: { $gte: today },
      });

      const rates = {
        clickToConversion: clicks > 0 ? (conversions / clicks) * 100 : 0,
        viewToConversion: pageViews > 0 ? (conversions / pageViews) * 100 : 0,
        clickToView: pageViews > 0 ? (clicks / pageViews) * 100 : 0,
        totalConversions: conversions,
        totalClicks: clicks,
        totalPageViews: pageViews,
      };

      // Cache for 5 minutes
      await this.redis.setex(cacheKey, 300, JSON.stringify(rates));

      return rates;
    } catch (error) {
      console.error('[RealtimeAnalytics] Error getting conversion rates:', error);
      return {
        clickToConversion: 0,
        viewToConversion: 0,
        clickToView: 0,
        totalConversions: 0,
        totalClicks: 0,
        totalPageViews: 0,
      };
    }
  }

  /**
   * Get geographic distribution of users
   * @returns {Promise<Array>} Geographic distribution
   */
  async getGeographicDistribution() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const cacheKey = keyHelpers.stats('geo_distribution', 'today');
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      const distribution = await AnalyticsSession.aggregate([
        {
          $match: {
            startedAt: { $gte: today },
            'location.country': { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: '$location.country',
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            country: '$_id',
            count: 1,
            _id: 0,
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);

      // Cache for 10 minutes
      await this.redis.setex(cacheKey, 600, JSON.stringify(distribution));

      return distribution;
    } catch (error) {
      console.error('[RealtimeAnalytics] Error getting geographic distribution:', error);
      return [];
    }
  }

  /**
   * Stream a live event to connected clients
   * @param {Object} eventData - Event data
   */
  async streamEvent(eventData) {
    const event = {
      id: this.generateEventId(),
      type: eventData.type || 'generic',
      severity: eventData.severity || CONFIG.alertLevels.INFO,
      message: eventData.message,
      data: eventData.data || {},
      timestamp: new Date().toISOString(),
    };

    // Add to buffer
    this.eventStreamBuffer.push(event);

    // Trim buffer if too large
    if (this.eventStreamBuffer.length > 1000) {
      this.eventStreamBuffer = this.eventStreamBuffer.slice(-500);
    }

    // Broadcast to appropriate rooms
    if (eventData.room) {
      this.broadcast('live_event', event, eventData.room);
    } else {
      // Admin gets all events
      this.broadcast('live_event', event, CONFIG.rooms.ADMIN);

      // Public gets non-sensitive events
      if (event.severity === CONFIG.alertLevels.INFO) {
        this.broadcast('live_event', event, CONFIG.rooms.PUBLIC);
      }
    }

    // Store in Redis for persistence
    await this.persistEvent(event);
  }

  /**
   * Check for anomalies and send alerts
   */
  async checkAnomalies() {
    try {
      const now = new Date();
      const fiveMinutesAgo = new Date(now - 5 * 60 * 1000);

      // Check traffic spike
      const recentEvents = await AnalyticsEvent.countDocuments({
        timestamp: { $gte: fiveMinutesAgo },
      });

      const normalTraffic = await this.getNormalTrafficBaseline();

      if (recentEvents > normalTraffic * CONFIG.anomalyThresholds.trafficSpike) {
        await this.sendAlert({
          type: 'traffic_spike',
          severity: CONFIG.alertLevels.WARNING,
          message: `Traffic spike detected: ${recentEvents} events in last 5 minutes`,
          data: { recentEvents, baseline: normalTraffic },
        });
      }

      // Check error rate
      const recentErrors = await AnalyticsEvent.countDocuments({
        timestamp: { $gte: fiveMinutesAgo },
        eventType: 'error',
      });

      const errorRate = recentEvents > 0 ? recentErrors / recentEvents : 0;

      if (errorRate > CONFIG.anomalyThresholds.errorRate) {
        await this.sendAlert({
          type: 'high_error_rate',
          severity: CONFIG.alertLevels.CRITICAL,
          message: `High error rate detected: ${(errorRate * 100).toFixed(2)}%`,
          data: { errorRate, errorCount: recentErrors, totalEvents: recentEvents },
        });
      }

      // Check conversion drop
      const conversionRates = await this.getConversionRates();
      const normalConversion = await this.getNormalConversionBaseline();

      if (conversionRates.clickToConversion < normalConversion * CONFIG.anomalyThresholds.conversionDrop) {
        await this.sendAlert({
          type: 'conversion_drop',
          severity: CONFIG.alertLevels.WARNING,
          message: `Conversion rate dropped significantly: ${conversionRates.clickToConversion.toFixed(2)}%`,
          data: { currentRate: conversionRates.clickToConversion, baseline: normalConversion },
        });
      }

      // Check revenue spike
      const todaysRevenue = await this.getTodaysRevenue();
      const normalRevenue = await this.getNormalRevenueBaseline();

      if (todaysRevenue > normalRevenue * CONFIG.anomalyThresholds.revenueSpike) {
        await this.sendAlert({
          type: 'revenue_spike',
          severity: CONFIG.alertLevels.INFO,
          message: `Revenue spike detected: MMK ${todaysRevenue.toLocaleString()}`,
          data: { todaysRevenue, baseline: normalRevenue },
        });
      }
    } catch (error) {
      console.error('[RealtimeAnalytics] Error checking anomalies:', error);
    }
  }

  /**
   * Send alert to admin room
   * @param {Object} alertData - Alert data
   */
  async sendAlert(alertData) {
    const alert = {
      id: this.generateEventId(),
      type: alertData.type,
      severity: alertData.severity,
      message: alertData.message,
      data: alertData.data,
      timestamp: new Date().toISOString(),
    };

    // Add to anomaly history
    this.anomalyHistory.push(alert);

    // Trim history
    if (this.anomalyHistory.length > 100) {
      this.anomalyHistory = this.anomalyHistory.slice(-50);
    }

    // Broadcast to admin room
    this.broadcast('alert', alert, CONFIG.rooms.ADMIN);

    // Store in Redis
    await this.persistAlert(alert);

    console.log(`[RealtimeAnalytics] Alert sent: ${alert.type} (${alert.severity})`);
  }

  /**
   * Track active user in Redis
   * @param {string} userId - User ID
   * @param {string} socketId - Socket ID
   */
  async trackActiveUser(userId, socketId) {
    try {
      const activeUsersKey = keyHelpers.stats('active_users');
      const userSocketKey = keyHelpers.user(userId, 'socket');

      // Add to active users set
      await this.redis.sadd(activeUsersKey, userId);

      // Set expiration on active users set (will be refreshed by periodic updates)
      await this.redis.expire(activeUsersKey, 3600);

      // Track socket mapping
      await this.redis.hset(userSocketKey, socketId, Date.now().toString());
      await this.redis.expire(userSocketKey, 3600);
    } catch (error) {
      console.error('[RealtimeAnalytics] Error tracking active user:', error);
    }
  }

  /**
   * Remove active user tracking
   * @param {string} userId - User ID
   * @param {string} socketId - Socket ID
   */
  async untrackActiveUser(userId, socketId) {
    try {
      const activeUsersKey = keyHelpers.stats('active_users');
      const userSocketKey = keyHelpers.user(userId, 'socket');

      // Remove socket mapping
      await this.redis.hdel(userSocketKey, socketId);

      // Check if user has other active sockets
      const socketCount = await this.redis.hlen(userSocketKey);

      if (socketCount === 0) {
        // Remove from active users
        await this.redis.srem(activeUsersKey, userId);
      }
    } catch (error) {
      console.error('[RealtimeAnalytics] Error untracking active user:', error);
    }
  }

  /**
   * Handle disconnection cleanup
   * @param {Socket} socket - Socket instance
   */
  async disconnect(socket) {
    const clientInfo = this.connectedClients.get(socket.id);

    if (clientInfo) {
      // Remove from room subscriptions
      for (const room of clientInfo.rooms) {
        const roomSet = this.roomSubscriptions.get(room);
        if (roomSet) {
          roomSet.delete(socket.id);
          if (roomSet.size === 0) {
            this.roomSubscriptions.delete(room);
          }
        }
      }

      // Untrack active user
      if (clientInfo.userId) {
        await this.untrackActiveUser(clientInfo.userId, socket.id);
      }

      // Remove from connected clients
      this.connectedClients.delete(socket.id);
    }

    console.log(`[RealtimeAnalytics] Cleanup completed for ${socket.id}`);
  }

  /**
   * Cache metrics in Redis
   * @param {Object} metrics - Metrics data
   */
  async cacheMetricsInRedis(metrics) {
    try {
      const key = keyHelpers.stats('live_metrics');
      await this.redis.setex(key, CONFIG.metricsCacheTTL, JSON.stringify(metrics));
    } catch (error) {
      console.error('[RealtimeAnalytics] Error caching metrics:', error);
    }
  }

  /**
   * Persist event to Redis
   * @param {Object} event - Event data
   */
  async persistEvent(event) {
    try {
      const key = keyHelpers.stats('events', 'recent');
      await this.redis.lpush(key, JSON.stringify(event));
      await this.redis.ltrim(key, 0, 999); // Keep last 1000 events
      await this.redis.expire(key, 86400); // Expire after 24 hours
    } catch (error) {
      console.error('[RealtimeAnalytics] Error persisting event:', error);
    }
  }

  /**
   * Persist alert to Redis
   * @param {Object} alert - Alert data
   */
  async persistAlert(alert) {
    try {
      const key = keyHelpers.stats('alerts', 'recent');
      await this.redis.lpush(key, JSON.stringify(alert));
      await this.redis.ltrim(key, 0, 499); // Keep last 500 alerts
      await this.redis.expire(key, 604800); // Expire after 7 days
    } catch (error) {
      console.error('[RealtimeAnalytics] Error persisting alert:', error);
    }
  }

  /**
   * Get normal traffic baseline
   * @returns {Promise<number>} Baseline traffic
   */
  async getNormalTrafficBaseline() {
    try {
      const key = keyHelpers.stats('baseline', 'traffic');
      const cached = await this.redis.get(key);

      if (cached) {
        return parseInt(cached, 10);
      }

      // Calculate from historical data (last 7 days average)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const avgEvents = await AnalyticsEvent.aggregate([
        {
          $match: {
            timestamp: { $gte: sevenDaysAgo },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$timestamp' },
            },
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: null,
            avgCount: { $avg: '$count' },
          },
        },
      ]);

      const baseline = Math.round((avgEvents[0]?.avgCount || 1000) / 288); // Per 5-minute period

      // Cache for 1 hour
      await this.redis.setex(key, 3600, baseline.toString());

      return baseline;
    } catch (error) {
      console.error('[RealtimeAnalytics] Error getting traffic baseline:', error);
      return 100; // Default baseline
    }
  }

  /**
   * Get normal conversion baseline
   * @returns {Promise<number>} Baseline conversion rate
   */
  async getNormalConversionBaseline() {
    try {
      const key = keyHelpers.stats('baseline', 'conversion');
      const cached = await this.redis.get(key);

      if (cached) {
        return parseFloat(cached);
      }

      // Default baseline
      const baseline = 2.5; // 2.5%

      // Cache for 1 hour
      await this.redis.setex(key, 3600, baseline.toString());

      return baseline;
    } catch (error) {
      console.error('[RealtimeAnalytics] Error getting conversion baseline:', error);
      return 2.5;
    }
  }

  /**
   * Get normal revenue baseline
   * @returns {Promise<number>} Baseline revenue
   */
  async getNormalRevenueBaseline() {
    try {
      const key = keyHelpers.stats('baseline', 'revenue');
      const cached = await this.redis.get(key);

      if (cached) {
        return parseFloat(cached);
      }

      // Calculate from historical data
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const avgRevenue = await PaymentTransaction.aggregate([
        {
          $match: {
            status: 'completed',
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            total: { $sum: '$amount' },
          },
        },
        {
          $group: {
            _id: null,
            avgRevenue: { $avg: '$total' },
          },
        },
      ]);

      const baseline = avgRevenue[0]?.avgRevenue || 50000;

      // Cache for 1 hour
      await this.redis.setex(key, 3600, baseline.toString());

      return baseline;
    } catch (error) {
      console.error('[RealtimeAnalytics] Error getting revenue baseline:', error);
      return 50000;
    }
  }

  /**
   * Start background tasks
   */
  startBackgroundTasks() {
    // Broadcast metrics every 10 seconds
    this.metricsInterval = setInterval(() => {
      this.broadcastMetrics();
    }, 10000);

    // Check anomalies every minute
    this.anomalyInterval = setInterval(() => {
      this.checkAnomalies();
    }, 60000);

    console.log('[RealtimeAnalytics] Background tasks started');
  }

  /**
   * Stop background tasks
   */
  stopBackgroundTasks() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    if (this.anomalyInterval) {
      clearInterval(this.anomalyInterval);
      this.anomalyInterval = null;
    }

    console.log('[RealtimeAnalytics] Background tasks stopped');
  }

  /**
   * Generate unique event ID
   * @returns {string} Event ID
   */
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get recent events from buffer
   * @param {number} limit - Number of events to return
   * @returns {Array} Recent events
   */
  getRecentEvents(limit = 50) {
    return this.eventStreamBuffer.slice(-limit);
  }

  /**
   * Get anomaly history
   * @param {number} limit - Number of anomalies to return
   * @returns {Array} Anomaly history
   */
  getAnomalyHistory(limit = 50) {
    return this.anomalyHistory.slice(-limit);
  }

  /**
   * Get service status
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      connectedClients: this.connectedClients.size,
      roomCount: this.roomSubscriptions.size,
      redisConnected: redisManager.isHealthy(),
      metricsCacheSize: this.metricsCache.size,
      eventBufferSize: this.eventStreamBuffer.length,
      anomalyHistorySize: this.anomalyHistory.length,
    };
  }

  /**
   * Shutdown the service
   */
  async shutdown() {
    console.log('[RealtimeAnalytics] Shutting down...');

    this.stopBackgroundTasks();

    if (this.io) {
      this.io.close();
      this.io = null;
    }

    this.connectedClients.clear();
    this.roomSubscriptions.clear();
    this.metricsCache.clear();
    this.eventStreamBuffer = [];
    this.anomalyHistory = [];

    this.isInitialized = false;

    console.log('[RealtimeAnalytics] Shutdown complete');
  }
}

// Create singleton instance
const realtimeAnalyticsService = new RealtimeAnalyticsService();

module.exports = realtimeAnalyticsService;
module.exports.RealtimeAnalyticsService = RealtimeAnalyticsService;
module.exports.CONFIG = CONFIG;
