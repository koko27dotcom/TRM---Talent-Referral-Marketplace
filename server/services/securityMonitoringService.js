/**
 * Security Monitoring Service
 * Handles security event logging, alerting, and anomaly detection
 * Integrates with Slack, email, and webhook notifications
 */

const axios = require('axios');
const { monitoring } = require('../config/security.js');
const SecurityAudit = require('../models/SecurityAudit.js');

// Alert throttling
const alertHistory = new Map();

/**
 * Log security event
 * @param {Object} event - Security event data
 * @returns {Promise<Object>} Logged event
 */
const logSecurityEvent = async (event) => {
  try {
    const loggedEvent = await SecurityAudit.logEvent(event);

    // Check if alert should be triggered
    if (shouldTriggerAlert(event)) {
      await sendAlert(event);
    }

    return loggedEvent;
  } catch (error) {
    console.error('Failed to log security event:', error);
    return null;
  }
};

/**
 * Determine if alert should be triggered
 * @param {Object} event - Security event
 * @returns {boolean}
 */
const shouldTriggerAlert = (event) => {
  if (!monitoring.alerting.enabled) return false;

  const { severity } = event;

  // Check if severity level should trigger alert
  for (const [channel, config] of Object.entries(monitoring.alerting.channels)) {
    if (config.enabled && config.severity.includes(severity)) {
      return true;
    }
  }

  return false;
};

/**
 * Check alert throttling
 * @param {string} alertKey - Alert identifier
 * @returns {boolean} True if alert can be sent
 */
const canSendAlert = (alertKey) => {
  const now = Date.now();
  const windowMs = monitoring.alerting.throttle.windowMs;
  const maxAlerts = monitoring.alerting.throttle.maxAlerts;

  const history = alertHistory.get(alertKey) || [];

  // Remove old entries
  const recentHistory = history.filter(timestamp => now - timestamp < windowMs);

  if (recentHistory.length >= maxAlerts) {
    return false;
  }

  recentHistory.push(now);
  alertHistory.set(alertKey, recentHistory);

  return true;
};

/**
 * Send security alert through all configured channels
 * @param {Object} event - Security event
 */
const sendAlert = async (event) => {
  const alertKey = `${event.eventType}:${event.severity}`;

  if (!canSendAlert(alertKey)) {
    console.log(`Alert throttled: ${alertKey}`);
    return;
  }

  const promises = [];

  // Email alerts
  if (monitoring.alerting.channels.email.enabled) {
    promises.push(sendEmailAlert(event));
  }

  // Slack alerts
  if (monitoring.alerting.channels.slack.enabled) {
    promises.push(sendSlackAlert(event));
  }

  // Webhook alerts
  if (monitoring.alerting.channels.webhook.enabled) {
    promises.push(sendWebhookAlert(event));
  }

  try {
    await Promise.all(promises);
  } catch (error) {
    console.error('Failed to send security alerts:', error);
  }
};

/**
 * Send email alert
 * @param {Object} event - Security event
 */
const sendEmailAlert = async (event) => {
  try {
    // This would integrate with your email service
    // For now, just log it
    console.log(`[EMAIL ALERT] ${event.severity.toUpperCase()}: ${event.eventType}`);

    // Example integration with SendGrid:
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send({
    //   to: monitoring.alerting.channels.email.recipients,
    //   from: 'security@trm-platform.com',
    //   subject: `[SECURITY ALERT] ${event.severity.toUpperCase()}: ${event.eventType}`,
    //   html: generateEmailTemplate(event),
    // });
  } catch (error) {
    console.error('Failed to send email alert:', error);
  }
};

/**
 * Send Slack alert
 * @param {Object} event - Security event
 */
const sendSlackAlert = async (event) => {
  try {
    const webhook = monitoring.alerting.channels.slack.webhook;
    if (!webhook) return;

    const colorMap = {
      critical: '#FF0000',
      high: '#FF8C00',
      medium: '#FFD700',
      low: '#1E90FF',
      info: '#808080',
    };

    const payload = {
      attachments: [{
        color: colorMap[event.severity] || '#808080',
        title: `Security Alert: ${event.eventType}`,
        fields: [
          { title: 'Severity', value: event.severity.toUpperCase(), short: true },
          { title: 'Category', value: event.category, short: true },
          { title: 'Description', value: event.description, short: false },
          { title: 'User', value: event.actor?.email || 'Anonymous', short: true },
          { title: 'IP Address', value: event.request?.ipAddress || 'Unknown', short: true },
          { title: 'Time', value: new Date().toISOString(), short: true },
        ],
        footer: 'TRM Security Monitoring',
        ts: Math.floor(Date.now() / 1000),
      }],
    };

    await axios.post(webhook, payload);
  } catch (error) {
    console.error('Failed to send Slack alert:', error.message);
  }
};

/**
 * Send webhook alert
 * @param {Object} event - Security event
 */
const sendWebhookAlert = async (event) => {
  try {
    const url = monitoring.alerting.channels.webhook.url;
    if (!url) return;

    await axios.post(url, {
      type: 'security_alert',
      timestamp: new Date().toISOString(),
      event: {
        type: event.eventType,
        severity: event.severity,
        category: event.category,
        description: event.description,
        actor: event.actor,
        request: event.request,
      },
    });
  } catch (error) {
    console.error('Failed to send webhook alert:', error.message);
  }
};

/**
 * Generate email template for alerts
 * @param {Object} event - Security event
 * @returns {string} HTML email content
 */
const generateEmailTemplate = (event) => {
  return `
    <h2>Security Alert: ${event.eventType}</h2>
    <p><strong>Severity:</strong> ${event.severity.toUpperCase()}</p>
    <p><strong>Category:</strong> ${event.category}</p>
    <p><strong>Description:</strong> ${event.description}</p>
    <p><strong>Time:</strong> ${new Date().toISOString()}</p>
    <hr>
    <h3>Actor Information</h3>
    <p>User: ${event.actor?.email || 'Anonymous'}</p>
    <p>Role: ${event.actor?.role || 'N/A'}</p>
    <h3>Request Information</h3>
    <p>IP Address: ${event.request?.ipAddress || 'Unknown'}</p>
    <p>User Agent: ${event.request?.userAgent || 'Unknown'}</p>
    <p>Path: ${event.request?.path || 'Unknown'}</p>
  `;
};

/**
 * Detect anomalies in security events
 * Uses statistical analysis to identify unusual patterns
 * @returns {Promise<Array>} Detected anomalies
 */
const detectAnomalies = async () => {
  try {
    const anomalies = [];
    const now = new Date();
    const baselineWindow = new Date(now - monitoring.anomalyDetection.baselineWindow);

    // Check for spike in failed logins
    const failedLogins = await SecurityAudit.countDocuments({
      eventType: 'login_failed',
      createdAt: { $gte: baselineWindow },
    });

    const baselineFailedLogins = await SecurityAudit.countDocuments({
      eventType: 'login_failed',
      createdAt: {
        $gte: new Date(baselineWindow - monitoring.anomalyDetection.baselineWindow),
        $lt: baselineWindow,
      },
    });

    if (baselineFailedLogins > 0) {
      const ratio = failedLogins / baselineFailedLogins;
      if (ratio > monitoring.anomalyDetection.sensitivity) {
        anomalies.push({
          type: 'failed_login_spike',
          severity: 'high',
          current: failedLogins,
          baseline: baselineFailedLogins,
          ratio,
        });
      }
    }

    // Check for unusual access patterns
    const uniqueIps = await SecurityAudit.distinct('request.ipAddress', {
      createdAt: { $gte: new Date(now - 24 * 60 * 60 * 1000) },
    });

    // If more than 1000 unique IPs in 24 hours, flag as anomaly
    if (uniqueIps.length > 1000) {
      anomalies.push({
        type: 'high_ip_diversity',
        severity: 'medium',
        uniqueIps: uniqueIps.length,
      });
    }

    // Log anomalies
    for (const anomaly of anomalies) {
      await logSecurityEvent({
        eventType: 'anomaly_detected',
        category: 'system',
        severity: anomaly.severity,
        description: `Anomaly detected: ${anomaly.type}`,
        details: anomaly,
      });
    }

    return anomalies;
  } catch (error) {
    console.error('Anomaly detection error:', error);
    return [];
  }
};

/**
 * Get security statistics
 * @param {Object} filters - Date filters
 * @returns {Promise<Object>} Security statistics
 */
const getSecurityStats = async (filters = {}) => {
  try {
    const stats = await SecurityAudit.getStats(filters);
    return stats;
  } catch (error) {
    console.error('Failed to get security stats:', error);
    return null;
  }
};

/**
 * Get recent security events
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Security events
 */
const getRecentEvents = async (options = {}) => {
  try {
    const {
      limit = 100,
      severity = null,
      eventType = null,
      startDate = null,
      endDate = null,
    } = options;

    const query = {};

    if (severity) query.severity = severity;
    if (eventType) query.eventType = eventType;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    const events = await SecurityAudit.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    return events;
  } catch (error) {
    console.error('Failed to get recent events:', error);
    return [];
  }
};

/**
 * Track failed login attempts and alert if threshold exceeded
 * @param {string} identifier - User identifier (IP or email)
 * @param {Object} context - Request context
 */
const trackFailedLogin = async (identifier, context) => {
  try {
    const windowStart = new Date(Date.now() - monitoring.failedLoginTracking.windowMs);

    const count = await SecurityAudit.countDocuments({
      eventType: 'login_failed',
      $or: [
        { 'request.ipAddress': identifier },
        { 'actor.email': identifier },
      ],
      createdAt: { $gte: windowStart },
    });

    // Alert if threshold exceeded
    if (count >= monitoring.failedLoginTracking.alertThreshold) {
      await logSecurityEvent({
        eventType: 'brute_force_attempt',
        category: 'threat',
        severity: 'high',
        description: `Multiple failed login attempts detected for ${identifier}`,
        request: {
          ipAddress: context.ip,
          userAgent: context.userAgent,
        },
        details: { failedAttempts: count, identifier },
      });
    }

    // Block if block threshold exceeded
    if (count >= monitoring.failedLoginTracking.blockThreshold) {
      // Trigger IP block or account lock
      await logSecurityEvent({
        eventType: 'ip_blocked',
        category: 'network',
        severity: 'critical',
        description: `IP/Account blocked due to excessive failed attempts: ${identifier}`,
        request: {
          ipAddress: context.ip,
        },
        details: { failedAttempts: count, identifier },
      });
    }

    return count;
  } catch (error) {
    console.error('Failed to track failed login:', error);
    return 0;
  }
};

/**
 * Initialize security monitoring
 * Sets up periodic tasks
 */
const initializeMonitoring = () => {
  // Run anomaly detection periodically
  if (monitoring.anomalyDetection.enabled) {
    setInterval(detectAnomalies, monitoring.anomalyDetection.checkInterval);
  }

  console.log('Security monitoring initialized');
};

module.exports = {
  logSecurityEvent,
  sendAlert,
  detectAnomalies,
  getSecurityStats,
  getRecentEvents,
  trackFailedLogin,
  initializeMonitoring,
};
