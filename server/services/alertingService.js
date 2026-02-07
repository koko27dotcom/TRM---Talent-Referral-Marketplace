/**
 * AlertingService
 * Multi-channel alerting with rules engine, aggregation, and escalation for TRM
 * Features: Alert rules, severity levels, channel support, alert history, escalation
 */

const { EventEmitter } = require('events');
const performanceMonitor = require('./performanceMonitor.js');

// Configuration
const CONFIG = {
  // Alert aggregation
  AGGREGATION_WINDOW_MS: parseInt(process.env.ALERT_AGGREGATION_WINDOW, 10) || 300000, // 5 minutes
  MAX_ALERTS_PER_WINDOW: parseInt(process.env.MAX_ALERTS_PER_WINDOW, 10) || 10,
  
  // Escalation
  ESCALATION_CHECK_INTERVAL: parseInt(process.env.ESCALATION_CHECK_INTERVAL, 10) || 60000, // 1 minute
  ACKNOWLEDGE_TIMEOUT_MS: parseInt(process.env.ACKNOWLEDGE_TIMEOUT, 10) || 900000, // 15 minutes
  MAX_ESCALATION_LEVELS: 3,
  
  // Alert retention
  MAX_ACTIVE_ALERTS: parseInt(process.env.MAX_ACTIVE_ALERTS, 10) || 1000,
  ALERT_HISTORY_LIMIT: parseInt(process.env.ALERT_HISTORY_LIMIT, 10) || 10000,
  
  // Service identification
  SERVICE_NAME: process.env.SERVICE_NAME || 'trm-api',
  ENVIRONMENT: process.env.NODE_ENV || 'development',
};

/**
 * Alert severity levels
 */
const SEVERITY = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  INFO: 'info',
};

/**
 * Alert status
 */
const ALERT_STATUS = {
  ACTIVE: 'active',
  ACKNOWLEDGED: 'acknowledged',
  RESOLVED: 'resolved',
  SILENCED: 'silenced',
};

/**
 * Alert rule class
 */
class AlertRule {
  constructor(config) {
    this.id = config.id || `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.name = config.name;
    this.description = config.description || '';
    this.condition = config.condition; // Function or object
    this.severity = config.severity || SEVERITY.INFO;
    this.channels = config.channels || []; // Channel IDs to notify
    this.enabled = config.enabled !== false;
    this.cooldownPeriod = config.cooldownPeriod || 300000; // 5 minutes
    this.autoResolve = config.autoResolve !== false;
    this.aggregationKey = config.aggregationKey || null;
    this.threshold = config.threshold || null;
    this.duration = config.duration || 0; // Minimum duration in ms
    
    // State
    this.lastTriggered = null;
    this.triggerCount = 0;
    this.createdAt = new Date().toISOString();
  }

  /**
   * Check if rule can trigger (respects cooldown)
   * @returns {boolean}
   */
  canTrigger() {
    if (!this.enabled) return false;
    if (!this.lastTriggered) return true;
    
    const timeSinceLast = Date.now() - new Date(this.lastTriggered).getTime();
    return timeSinceLast >= this.cooldownPeriod;
  }

  /**
   * Record trigger
   */
  recordTrigger() {
    this.lastTriggered = new Date().toISOString();
    this.triggerCount++;
  }

  /**
   * Evaluate condition against metrics
   * @param {Object} metrics - Metrics to evaluate
   * @returns {boolean} Condition result
   */
  evaluate(metrics) {
    if (typeof this.condition === 'function') {
      return this.condition(metrics);
    }

    // Object-based condition: { metric: 'cpu', operator: 'gt', value: 80 }
    if (typeof this.condition === 'object') {
      const { metric, operator, value } = this.condition;
      const metricValue = this.getMetricValue(metrics, metric);
      
      switch (operator) {
        case 'gt':
        case '>':
          return metricValue > value;
        case 'gte':
        case '>=':
          return metricValue >= value;
        case 'lt':
        case '<':
          return metricValue < value;
        case 'lte':
        case '<=':
          return metricValue <= value;
        case 'eq':
        case '==':
        case '===':
          return metricValue === value;
        case 'neq':
        case '!=':
        case '!==':
          return metricValue !== value;
        default:
          return false;
      }
    }

    return false;
  }

  /**
   * Get nested metric value
   * @param {Object} metrics - Metrics object
   * @param {string} path - Dot-notation path
   * @returns {*} Metric value
   */
  getMetricValue(metrics, path) {
    const keys = path.split('.');
    let value = metrics;
    for (const key of keys) {
      if (value === null || value === undefined) return undefined;
      value = value[key];
    }
    return value;
  }

  /**
   * Get rule summary
   * @returns {Object} Rule summary
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      severity: this.severity,
      channels: this.channels,
      enabled: this.enabled,
      cooldownPeriod: this.cooldownPeriod,
      lastTriggered: this.lastTriggered,
      triggerCount: this.triggerCount,
      createdAt: this.createdAt,
    };
  }
}

/**
 * Alert channel class
 */
class AlertChannel {
  constructor(config) {
    this.id = config.id || `channel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.name = config.name;
    this.type = config.type; // email, slack, webhook, pagerduty
    this.config = config.config || {}; // Type-specific configuration
    this.enabled = config.enabled !== false;
    this.createdAt = new Date().toISOString();
    this.lastTest = null;
    this.testResult = null;
  }

  /**
   * Send alert through this channel
   * @param {Object} alert - Alert object
   * @returns {Promise<Object>} Send result
   */
  async send(alert) {
    if (!this.enabled) {
      return { success: false, error: 'Channel disabled' };
    }

    try {
      switch (this.type) {
        case 'email':
          return await this.sendEmail(alert);
        case 'slack':
          return await this.sendSlack(alert);
        case 'webhook':
          return await this.sendWebhook(alert);
        case 'pagerduty':
          return await this.sendPagerDuty(alert);
        default:
          throw new Error(`Unknown channel type: ${this.type}`);
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Send email alert
   * @param {Object} alert - Alert object
   * @returns {Promise<Object>} Send result
   */
  async sendEmail(alert) {
    // Implementation would integrate with email service
    // For now, just log
    console.log(`[ALERT EMAIL] To: ${this.config.recipients?.join(', ')}`);
    console.log(`Subject: [${alert.severity.toUpperCase()}] ${alert.title}`);
    console.log(`Body: ${alert.message}`);
    
    return { 
      success: true, 
      channel: this.id,
      type: 'email',
      recipients: this.config.recipients,
    };
  }

  /**
   * Send Slack alert
   * @param {Object} alert - Alert object
   * @returns {Promise<Object>} Send result
   */
  async sendSlack(alert) {
    const colorMap = {
      critical: '#FF0000',
      warning: '#FFA500',
      info: '#36A64F',
    };

    const payload = {
      text: `[${alert.severity.toUpperCase()}] ${alert.title}`,
      attachments: [{
        color: colorMap[alert.severity] || '#808080',
        fields: [
          { title: 'Service', value: alert.service, short: true },
          { title: 'Environment', value: alert.environment, short: true },
          { title: 'Message', value: alert.message, short: false },
        ],
        footer: CONFIG.SERVICE_NAME,
        ts: Math.floor(Date.now() / 1000),
      }],
    };

    try {
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status}`);
      }

      return { success: true, channel: this.id, type: 'slack' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Send webhook alert
   * @param {Object} alert - Alert object
   * @returns {Promise<Object>} Send result
   */
  async sendWebhook(alert) {
    const payload = {
      alert: {
        id: alert.id,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        service: alert.service,
        environment: alert.environment,
        timestamp: alert.timestamp,
        metadata: alert.metadata,
      },
    };

    try {
      const response = await fetch(this.config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Webhook error: ${response.status}`);
      }

      return { success: true, channel: this.id, type: 'webhook' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Send PagerDuty alert
   * @param {Object} alert - Alert object
   * @returns {Promise<Object>} Send result
   */
  async sendPagerDuty(alert) {
    const payload = {
      routing_key: this.config.integrationKey,
      event_action: 'trigger',
      dedup_key: alert.id,
      payload: {
        summary: `[${alert.severity.toUpperCase()}] ${alert.title}: ${alert.message}`,
        severity: alert.severity === SEVERITY.CRITICAL ? 'critical' : 'warning',
        source: alert.service,
        component: alert.metadata?.component || 'unknown',
        class: alert.metadata?.class || 'alert',
        custom_details: {
          ...alert.metadata,
          environment: alert.environment,
        },
      },
    };

    try {
      const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`PagerDuty API error: ${response.status}`);
      }

      return { success: true, channel: this.id, type: 'pagerduty' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test channel
   * @returns {Promise<Object>} Test result
   */
  async test() {
    const testAlert = {
      id: `test_${Date.now()}`,
      severity: SEVERITY.INFO,
      title: 'Test Alert',
      message: 'This is a test alert from the alerting system.',
      service: CONFIG.SERVICE_NAME,
      environment: CONFIG.ENVIRONMENT,
      timestamp: new Date().toISOString(),
      metadata: { test: true },
    };

    const result = await this.send(testAlert);
    this.lastTest = new Date().toISOString();
    this.testResult = result;

    return result;
  }

  /**
   * Get channel summary
   * @returns {Object} Channel summary
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      enabled: this.enabled,
      createdAt: this.createdAt,
      lastTest: this.lastTest,
      testResult: this.testResult,
    };
  }
}

/**
 * Alert aggregator to prevent spam
 */
class AlertAggregator {
  constructor(windowMs = CONFIG.AGGREGATION_WINDOW_MS) {
    this.windowMs = windowMs;
    this.alerts = new Map(); // aggregationKey -> { alerts: [], firstSeen, lastSeen }
  }

  /**
   * Add alert to aggregation
   * @param {Object} alert - Alert object
   * @returns {Object|null} Aggregated alert or null if should be suppressed
   */
  aggregate(alert) {
    const key = alert.aggregationKey || alert.title;
    const now = Date.now();

    this.cleanup();

    if (this.alerts.has(key)) {
      const aggregate = this.alerts.get(key);
      
      // Check if window has passed
      if (now - aggregate.firstSeen > this.windowMs) {
        // Reset window
        aggregate.alerts = [alert];
        aggregate.firstSeen = now;
        aggregate.lastSeen = now;
      } else {
        // Add to existing window
        aggregate.alerts.push(alert);
        aggregate.lastSeen = now;
        
        // Check if we've hit the max alerts threshold
        if (aggregate.alerts.length >= CONFIG.MAX_ALERTS_PER_WINDOW) {
          // Convert to aggregated alert
          return {
            ...alert,
            aggregated: true,
            alertCount: aggregate.alerts.length,
            aggregatedAlerts: aggregate.alerts,
            message: `${aggregate.alerts.length} similar alerts: ${alert.message}`,
          };
        }

        // Suppress this alert (already have one in window)
        return null;
      }
    } else {
      // New aggregation window
      this.alerts.set(key, {
        alerts: [alert],
        firstSeen: now,
        lastSeen: now,
      });
    }

    return alert;
  }

  /**
   * Cleanup old aggregation windows
   */
  cleanup() {
    const now = Date.now();
    for (const [key, aggregate] of this.alerts) {
      if (now - aggregate.firstSeen > this.windowMs) {
        this.alerts.delete(key);
      }
    }
  }
}

/**
 * AlertingService
 * Main service for managing alerts and notifications
 */
class AlertingService extends EventEmitter {
  constructor() {
    super();
    
    // State
    this.rules = new Map();
    this.channels = new Map();
    this.activeAlerts = new Map();
    this.alertHistory = [];
    this.aggregator = new AlertAggregator();
    
    // Escalation tracking
    this.escalationInterval = null;
    
    // Rule evaluation
    this.evaluationInterval = null;
  }

  // ==================== Initialization ====================

  /**
   * Initialize alerting service
   * @param {Object} options - Configuration options
   */
  initialize(options = {}) {
    // Create default channels if specified
    if (options.channels) {
      for (const channelConfig of options.channels) {
        this.addChannel(channelConfig);
      }
    }

    // Create default rules if specified
    if (options.rules) {
      for (const ruleConfig of options.rules) {
        this.createAlertRule(ruleConfig);
      }
    }

    // Start escalation checks
    this.startEscalationChecks();

    // Start metrics-based rule evaluation
    if (options.evaluateMetrics !== false) {
      this.startMetricsEvaluation();
    }

    this.emit('initialized');
    console.log('Alerting service initialized');
    return this;
  }

  /**
   * Start escalation checks
   */
  startEscalationChecks() {
    this.escalationInterval = setInterval(() => {
      this.checkEscalations();
    }, CONFIG.ESCALATION_CHECK_INTERVAL);
  }

  /**
   * Start metrics-based rule evaluation
   */
  startMetricsEvaluation() {
    // Evaluate rules when metrics snapshot is taken
    performanceMonitor.on('metricsSnapshot', (metrics) => {
      this.evaluateAllRules(metrics);
    });
  }

  // ==================== Alert Rules ====================

  /**
   * Create new alert rule
   * @param {Object} ruleConfig - Rule configuration
   * @returns {AlertRule} Created rule
   */
  createAlertRule(ruleConfig) {
    const rule = new AlertRule(ruleConfig);
    this.rules.set(rule.id, rule);
    
    this.emit('ruleCreated', rule);
    console.log(`Alert rule created: ${rule.name}`);
    
    return rule;
  }

  /**
   * Get alert rule
   * @param {string} ruleId - Rule ID
   * @returns {AlertRule|null}
   */
  getAlertRule(ruleId) {
    return this.rules.get(ruleId) || null;
  }

  /**
   * Delete alert rule
   * @param {string} ruleId - Rule ID
   * @returns {boolean}
   */
  deleteAlertRule(ruleId) {
    const deleted = this.rules.delete(ruleId);
    if (deleted) {
      this.emit('ruleDeleted', { ruleId });
    }
    return deleted;
  }

  /**
   * Enable/disable rule
   * @param {string} ruleId - Rule ID
   * @param {boolean} enabled - Enabled state
   * @returns {boolean}
   */
  setRuleEnabled(ruleId, enabled) {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
      this.emit('ruleUpdated', rule);
      return true;
    }
    return false;
  }

  /**
   * Get all rules
   * @returns {Array} All rules
   */
  getAllRules() {
    return Array.from(this.rules.values()).map(r => r.toJSON());
  }

  // ==================== Rule Evaluation ====================

  /**
   * Evaluate all rules against metrics
   * @param {Object} metrics - Metrics to evaluate
   */
  evaluateAllRules(metrics) {
    for (const rule of this.rules.values()) {
      if (rule.canTrigger()) {
        const shouldAlert = rule.evaluate(metrics);
        if (shouldAlert) {
          this.triggerRule(rule, metrics);
        }
      }
    }
  }

  /**
   * Evaluate single rule
   * @param {AlertRule} rule - Rule to evaluate
   * @param {Object} metrics - Metrics to evaluate
   * @returns {Object} Evaluation result
   */
  evaluateAlert(rule, metrics) {
    const triggered = rule.evaluate(metrics);
    
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      triggered,
      canTrigger: rule.canTrigger(),
      severity: rule.severity,
    };
  }

  /**
   * Trigger an alert from a rule
   * @param {AlertRule} rule - Triggered rule
   * @param {Object} metrics - Metrics context
   */
  triggerRule(rule, metrics) {
    rule.recordTrigger();
    
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      severity: rule.severity,
      title: rule.name,
      message: rule.description || `Alert triggered: ${rule.name}`,
      service: CONFIG.SERVICE_NAME,
      environment: CONFIG.ENVIRONMENT,
      timestamp: new Date().toISOString(),
      status: ALERT_STATUS.ACTIVE,
      metadata: {
        condition: rule.condition,
        metrics,
      },
      aggregationKey: rule.aggregationKey,
      channels: rule.channels,
    };

    this.sendAlert(alert);
  }

  // ==================== Alert Management ====================

  /**
   * Send an alert through configured channels
   * @param {Object} alert - Alert object
   * @returns {Object} Alert with delivery results
   */
  async sendAlert(alert) {
    // Apply aggregation
    const aggregatedAlert = this.aggregator.aggregate(alert);
    if (!aggregatedAlert) {
      return null; // Alert suppressed by aggregation
    }

    // Store alert
    this.activeAlerts.set(alert.id, aggregatedAlert);
    this.addToHistory(aggregatedAlert);

    // Send through channels
    const deliveryResults = [];
    const channelIds = alert.channels || Array.from(this.channels.keys());

    for (const channelId of channelIds) {
      const channel = this.channels.get(channelId);
      if (channel) {
        const result = await channel.send(aggregatedAlert);
        deliveryResults.push(result);
      }
    }

    aggregatedAlert.deliveryResults = deliveryResults;
    aggregatedAlert.sentAt = new Date().toISOString();

    this.emit('alertSent', aggregatedAlert);
    
    return aggregatedAlert;
  }

  /**
   * Acknowledge an alert
   * @param {string} alertId - Alert ID
   * @param {string} userId - User acknowledging
   * @returns {Object|null} Updated alert or null
   */
  acknowledgeAlert(alertId, userId) {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return null;

    alert.status = ALERT_STATUS.ACKNOWLEDGED;
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date().toISOString();

    this.emit('alertAcknowledged', alert);
    return alert;
  }

  /**
   * Resolve an alert
   * @param {string} alertId - Alert ID
   * @returns {Object|null} Updated alert or null
   */
  resolveAlert(alertId) {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return null;

    alert.status = ALERT_STATUS.RESOLVED;
    alert.resolvedAt = new Date().toISOString();

    // Move to history
    this.activeAlerts.delete(alertId);
    this.updateHistory(alert);

    // Send resolution notification if rule requires it
    const rule = this.rules.get(alert.ruleId);
    if (rule && rule.autoResolve) {
      this.sendResolutionNotification(alert);
    }

    this.emit('alertResolved', alert);
    return alert;
  }

  /**
   * Send resolution notification
   * @param {Object} alert - Resolved alert
   */
  async sendResolutionNotification(alert) {
    const resolutionAlert = {
      ...alert,
      title: `[RESOLVED] ${alert.title}`,
      message: `Alert resolved: ${alert.message}`,
      severity: SEVERITY.INFO,
      timestamp: new Date().toISOString(),
    };

    for (const channelId of alert.channels || []) {
      const channel = this.channels.get(channelId);
      if (channel) {
        await channel.send(resolutionAlert);
      }
    }
  }

  /**
   * Silence an alert
   * @param {string} alertId - Alert ID
   * @param {number} durationMs - Silence duration
   * @returns {Object|null} Updated alert or null
   */
  silenceAlert(alertId, durationMs = 3600000) {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return null;

    alert.status = ALERT_STATUS.SILENCED;
    alert.silencedUntil = new Date(Date.now() + durationMs).toISOString();

    setTimeout(() => {
      if (alert.status === ALERT_STATUS.SILENCED) {
        alert.status = ALERT_STATUS.ACTIVE;
        this.emit('alertUnsilenced', alert);
      }
    }, durationMs);

    this.emit('alertSilenced', alert);
    return alert;
  }

  /**
   * Get all active alerts
   * @param {Object} filters - Optional filters
   * @returns {Array} Active alerts
   */
  getActiveAlerts(filters = {}) {
    let alerts = Array.from(this.activeAlerts.values());

    if (filters.severity) {
      alerts = alerts.filter(a => a.severity === filters.severity);
    }

    if (filters.status) {
      alerts = alerts.filter(a => a.status === filters.status);
    }

    if (filters.ruleId) {
      alerts = alerts.filter(a => a.ruleId === filters.ruleId);
    }

    return alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Get alert history
   * @param {Object} filters - Optional filters
   * @returns {Array} Alert history
   */
  getAlertHistory(filters = {}) {
    let history = [...this.alertHistory];

    if (filters.severity) {
      history = history.filter(a => a.severity === filters.severity);
    }

    if (filters.status) {
      history = history.filter(a => a.status === filters.status);
    }

    if (filters.startDate) {
      history = history.filter(a => new Date(a.timestamp) >= new Date(filters.startDate));
    }

    if (filters.endDate) {
      history = history.filter(a => new Date(a.timestamp) <= new Date(filters.endDate));
    }

    if (filters.limit) {
      history = history.slice(0, filters.limit);
    }

    return history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Add alert to history
   * @param {Object} alert - Alert to add
   */
  addToHistory(alert) {
    this.alertHistory.push(alert);
    
    // Trim history if needed
    if (this.alertHistory.length > CONFIG.ALERT_HISTORY_LIMIT) {
      this.alertHistory = this.alertHistory.slice(-CONFIG.ALERT_HISTORY_LIMIT);
    }
  }

  /**
   * Update alert in history
   * @param {Object} alert - Alert to update
   */
  updateHistory(alert) {
    const index = this.alertHistory.findIndex(a => a.id === alert.id);
    if (index !== -1) {
      this.alertHistory[index] = alert;
    }
  }

  // ==================== Escalation ====================

  /**
   * Check for alerts that need escalation
   */
  checkEscalations() {
    const now = Date.now();

    for (const alert of this.activeAlerts.values()) {
      if (alert.status === ALERT_STATUS.ACTIVE) {
        const alertAge = now - new Date(alert.timestamp).getTime();
        
        if (alertAge > CONFIG.ACKNOWLEDGE_TIMEOUT_MS) {
          this.escalateAlert(alert);
        }
      }
    }
  }

  /**
   * Escalate an unacknowledged alert
   * @param {Object} alert - Alert to escalate
   */
  escalateAlert(alert) {
    alert.escalationLevel = (alert.escalationLevel || 0) + 1;
    alert.lastEscalation = new Date().toISOString();

    if (alert.escalationLevel > CONFIG.MAX_ESCALATION_LEVELS) {
      // Max escalation reached - notify admin
      this.notifyAdmin(alert);
    } else {
      // Escalate to next level
      this.emit('alertEscalated', alert);
      
      // Send escalation notification
      const escalationAlert = {
        ...alert,
        title: `[ESCALATED L${alert.escalationLevel}] ${alert.title}`,
        message: `Alert escalated to level ${alert.escalationLevel}: ${alert.message}`,
        severity: alert.severity === SEVERITY.WARNING ? SEVERITY.CRITICAL : alert.severity,
        timestamp: new Date().toISOString(),
      };

      // Send to escalation channels (typically higher priority)
      for (const channel of this.channels.values()) {
        if (channel.type === 'pagerduty' || channel.type === 'email') {
          channel.send(escalationAlert);
        }
      }
    }
  }

  /**
   * Notify admin about max escalation
   * @param {Object} alert - Alert that maxed out escalation
   */
  notifyAdmin(alert) {
    console.error(`Alert ${alert.id} has reached max escalation level`);
    this.emit('maxEscalationReached', alert);
  }

  // ==================== Channels ====================

  /**
   * Add alert channel
   * @param {Object} channelConfig - Channel configuration
   * @returns {AlertChannel} Created channel
   */
  addChannel(channelConfig) {
    const channel = new AlertChannel(channelConfig);
    this.channels.set(channel.id, channel);
    
    this.emit('channelAdded', channel);
    console.log(`Alert channel added: ${channel.name} (${channel.type})`);
    
    return channel;
  }

  /**
   * Remove alert channel
   * @param {string} channelId - Channel ID
   * @returns {boolean}
   */
  removeChannel(channelId) {
    const deleted = this.channels.delete(channelId);
    if (deleted) {
      this.emit('channelRemoved', { channelId });
    }
    return deleted;
  }

  /**
   * Test alert channel
   * @param {string} channelId - Channel ID
   * @returns {Promise<Object>} Test result
   */
  async testChannel(channelId) {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return { success: false, error: 'Channel not found' };
    }

    return await channel.test();
  }

  /**
   * Get all channels
   * @returns {Array} All channels
   */
  getAllChannels() {
    return Array.from(this.channels.values()).map(c => c.toJSON());
  }

  /**
   * Get channel by ID
   * @param {string} channelId - Channel ID
   * @returns {AlertChannel|null}
   */
  getChannel(channelId) {
    return this.channels.get(channelId) || null;
  }

  // ==================== Cleanup ====================

  /**
   * Stop escalation checks
   */
  stopEscalationChecks() {
    if (this.escalationInterval) {
      clearInterval(this.escalationInterval);
      this.escalationInterval = null;
    }
  }

  /**
   * Get service status
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      rulesCount: this.rules.size,
      channelsCount: this.channels.size,
      activeAlertsCount: this.activeAlerts.size,
      historyCount: this.alertHistory.length,
    };
  }
}

// Export singleton instance and classes
const alertingService = new AlertingService();
module.exports = alertingService;
  AlertingService, 
  AlertRule, 
  AlertChannel, 
  AlertAggregator,
  SEVERITY,
  ALERT_STATUS,
};