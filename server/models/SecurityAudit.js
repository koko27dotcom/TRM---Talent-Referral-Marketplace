/**
 * SecurityAudit Model
 * Tracks security events for enterprise-grade security monitoring
 * Includes authentication events, access violations, suspicious activities, and system security events
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Security event types
const SECURITY_EVENT_TYPES = {
  // Authentication events
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  PASSWORD_CHANGED: 'password_changed',
  PASSWORD_RESET_REQUESTED: 'password_reset_requested',
  PASSWORD_RESET_COMPLETED: 'password_reset_completed',
  MFA_ENABLED: 'mfa_enabled',
  MFA_DISABLED: 'mfa_disabled',
  MFA_CHALLENGE: 'mfa_challenge',
  MFA_FAILED: 'mfa_failed',
  SESSION_CREATED: 'session_created',
  SESSION_TERMINATED: 'session_terminated',
  SESSION_EXPIRED: 'session_expired',
  
  // Authorization events
  ACCESS_DENIED: 'access_denied',
  PERMISSION_VIOLATION: 'permission_violation',
  PRIVILEGE_ESCALATION_ATTEMPT: 'privilege_escalation_attempt',
  
  // Data access events
  DATA_EXPORT: 'data_export',
  DATA_DELETION: 'data_deletion',
  DATA_ACCESS: 'data_access',
  BULK_DATA_ACCESS: 'bulk_data_access',
  SENSITIVE_DATA_ACCESS: 'sensitive_data_access',
  
  // API security events
  API_KEY_CREATED: 'api_key_created',
  API_KEY_REVOKED: 'api_key_revoked',
  API_KEY_USED: 'api_key_used',
  API_RATE_LIMIT_EXCEEDED: 'api_rate_limit_exceeded',
  INVALID_API_KEY: 'invalid_api_key',
  
  // Network security events
  SUSPICIOUS_IP: 'suspicious_ip',
  IP_BLOCKED: 'ip_blocked',
  IP_UNBLOCKED: 'ip_unblocked',
  GEO_ANOMALY: 'geo_anomaly',
  TOR_EXIT_NODE: 'tor_exit_node',
  VPN_DETECTED: 'vpn_detected',
  
  // System security events
  CONFIGURATION_CHANGED: 'configuration_changed',
  SECURITY_SETTING_CHANGED: 'security_setting_changed',
  ENCRYPTION_KEY_ROTATED: 'encryption_key_rotated',
  BACKUP_CREATED: 'backup_created',
  BACKUP_RESTORED: 'backup_restored',
  
  // Compliance events
  COMPLIANCE_EXPORT: 'compliance_export',
  DATA_RETENTION_POLICY_APPLIED: 'data_retention_policy_applied',
  GDPR_DELETION_REQUEST: 'gdpr_deletion_request',
  GDPR_EXPORT_REQUEST: 'gdpr_export_request',
  
  // Threat detection
  BRUTE_FORCE_ATTEMPT: 'brute_force_attempt',
  SQL_INJECTION_ATTEMPT: 'sql_injection_attempt',
  XSS_ATTEMPT: 'xss_attempt',
  CSRF_ATTEMPT: 'csrf_attempt',
  ANOMALY_DETECTED: 'anomaly_detected',
};

// Severity levels
const SEVERITY_LEVELS = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info',
};

// Status values
const EVENT_STATUS = {
  NEW: 'new',
  INVESTIGATING: 'investigating',
  RESOLVED: 'resolved',
  FALSE_POSITIVE: 'false_positive',
  ESCALATED: 'escalated',
};

// Geo location schema
const GeoLocationSchema = new Schema({
  country: { type: String },
  countryCode: { type: String },
  region: { type: String },
  city: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
  timezone: { type: String },
  isp: { type: String },
}, { _id: false });

// Device fingerprint schema
const DeviceFingerprintSchema = new Schema({
  userAgent: { type: String },
  browser: { type: String },
  browserVersion: { type: String },
  os: { type: String },
  osVersion: { type: String },
  device: { type: String },
  deviceType: { type: String, enum: ['desktop', 'mobile', 'tablet', 'unknown'] },
  screenResolution: { type: String },
  timezone: { type: String },
  language: { type: String },
  fingerprint: { type: String },
  isKnown: { type: Boolean, default: false },
}, { _id: false });

// Main SecurityAudit Schema
const SecurityAuditSchema = new Schema({
  // Event classification
  eventType: {
    type: String,
    enum: Object.values(SECURITY_EVENT_TYPES),
    required: [true, 'Event type is required'],
    index: true,
  },
  category: {
    type: String,
    enum: ['authentication', 'authorization', 'data_access', 'api', 'network', 'system', 'compliance', 'threat'],
    required: true,
    index: true,
  },
  severity: {
    type: String,
    enum: Object.values(SEVERITY_LEVELS),
    default: SEVERITY_LEVELS.INFO,
    index: true,
  },
  status: {
    type: String,
    enum: Object.values(EVENT_STATUS),
    default: EVENT_STATUS.NEW,
    index: true,
  },
  
  // Actor information
  actor: {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    userType: {
      type: String,
      enum: ['platform_admin', 'corporate_admin', 'corporate_recruiter', 'corporate_viewer', 'referrer', 'job_seeker', 'system', 'anonymous', 'api'],
      default: 'anonymous',
    },
    email: { type: String },
    name: { type: String },
    role: { type: String },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
    },
  },
  
  // Target information
  target: {
    entityType: {
      type: String,
      enum: ['user', 'company', 'job', 'referral', 'application', 'api_key', 'system', 'data'],
    },
    entityId: { type: Schema.Types.ObjectId },
    entityName: { type: String },
    dataClassification: {
      type: String,
      enum: ['public', 'internal', 'confidential', 'restricted'],
    },
  },
  
  // Request context
  request: {
    ipAddress: { type: String, index: true },
    ipVersion: { type: Number, enum: [4, 6] },
    userAgent: { type: String },
    method: { type: String },
    path: { type: String },
    query: { type: Schema.Types.Mixed },
    headers: { type: Schema.Types.Mixed },
    requestId: { type: String, index: true },
    sessionId: { type: String, index: true },
    apiKeyId: { type: Schema.Types.ObjectId },
  },
  
  // Geolocation
  geoLocation: {
    type: GeoLocationSchema,
    default: undefined,
  },
  
  // Device information
  device: {
    type: DeviceFingerprintSchema,
    default: undefined,
  },
  
  // Event details
  description: { type: String, required: true },
  details: { type: Schema.Types.Mixed, default: {} },
  
  // Risk assessment
  risk: {
    score: { type: Number, min: 0, max: 100 },
    factors: [{ type: String }],
    previousOccurrences: { type: Number, default: 0 },
    isAnomaly: { type: Boolean, default: false },
  },
  
  // Response actions
  actions: [{
    type: { type: String, enum: ['blocked', 'challenged', 'logged', 'alerted', 'rate_limited'] },
    timestamp: { type: Date, default: Date.now },
    reason: { type: String },
  }],
  
  // Investigation
  investigation: {
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
    resolution: { type: String },
    resolvedAt: { type: Date },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  
  // Related events
  relatedEvents: [{
    type: Schema.Types.ObjectId,
    ref: 'SecurityAudit',
  }],
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  expiresAt: {
    type: Date,
    index: true,
  },
}, {
  timestamps: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ==================== INDEXES ====================

// Primary indexes for querying
SecurityAuditSchema.index({ eventType: 1, createdAt: -1 });
SecurityAuditSchema.index({ 'actor.userId': 1, createdAt: -1 });
SecurityAuditSchema.index({ 'request.ipAddress': 1, createdAt: -1 });
SecurityAuditSchema.index({ severity: 1, status: 1, createdAt: -1 });
SecurityAuditSchema.index({ category: 1, createdAt: -1 });

// Compound indexes for security analysis
SecurityAuditSchema.index({ eventType: 1, 'request.ipAddress': 1, createdAt: -1 });
SecurityAuditSchema.index({ 'actor.userId': 1, eventType: 1, createdAt: -1 });
SecurityAuditSchema.index({ 'actor.companyId': 1, createdAt: -1 });

// Geospatial index for location-based analysis
SecurityAuditSchema.index({ 'geoLocation.latitude': 1, 'geoLocation.longitude': 1 });

// TTL index for automatic cleanup (7 years for compliance, configurable)
SecurityAuditSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ==================== VIRTUALS ====================

SecurityAuditSchema.virtual('isHighRisk').get(function() {
  return this.severity === SEVERITY_LEVELS.CRITICAL || 
         this.severity === SEVERITY_LEVELS.HIGH ||
         (this.risk && this.risk.score >= 70);
});

SecurityAuditSchema.virtual('timeSince').get(function() {
  return Date.now() - this.createdAt.getTime();
});

// ==================== STATIC METHODS ====================

/**
 * Log a security event
 * @param {Object} eventData - Security event data
 * @returns {Promise<Document>}
 */
SecurityAuditSchema.statics.logEvent = async function(eventData) {
  // Calculate expiration date based on severity
  const retentionDays = {
    [SEVERITY_LEVELS.CRITICAL]: 2555, // 7 years
    [SEVERITY_LEVELS.HIGH]: 2555,
    [SEVERITY_LEVELS.MEDIUM]: 1095,   // 3 years
    [SEVERITY_LEVELS.LOW]: 365,       // 1 year
    [SEVERITY_LEVELS.INFO]: 90,       // 90 days
  };
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (retentionDays[eventData.severity] || 365));
  
  const event = await this.create({
    ...eventData,
    expiresAt,
  });
  
  // Trigger alerts for high-severity events
  if (event.severity === SEVERITY_LEVELS.CRITICAL || event.severity === SEVERITY_LEVELS.HIGH) {
    await event.triggerAlert();
  }
  
  return event;
};

/**
 * Log authentication event
 * @param {Object} options - Authentication event options
 * @returns {Promise<Document>}
 */
SecurityAuditSchema.statics.logAuth = async function(options) {
  const {
    eventType,
    user,
    req,
    success,
    failureReason,
    metadata = {},
  } = options;
  
  return this.logEvent({
    eventType,
    category: 'authentication',
    severity: success ? SEVERITY_LEVELS.INFO : SEVERITY_LEVELS.MEDIUM,
    actor: {
      userId: user?._id,
      userType: user?.role || 'anonymous',
      email: user?.email,
      name: user?.name,
      role: user?.role,
      companyId: user?.companyId,
    },
    request: {
      ipAddress: req?.ip || req?.headers?.['x-forwarded-for'],
      userAgent: req?.headers?.['user-agent'],
      method: req?.method,
      path: req?.originalUrl,
      requestId: req?.requestId,
      sessionId: req?.sessionId,
    },
    description: success ? `Authentication ${eventType}` : `Authentication ${eventType} failed: ${failureReason}`,
    details: {
      success,
      failureReason,
      ...metadata,
    },
  });
};

/**
 * Log access control event
 * @param {Object} options - Access control event options
 * @returns {Promise<Document>}
 */
SecurityAuditSchema.statics.logAccess = async function(options) {
  const {
    eventType,
    user,
    resource,
    req,
    denied = false,
    reason,
  } = options;
  
  return this.logEvent({
    eventType,
    category: 'authorization',
    severity: denied ? SEVERITY_LEVELS.HIGH : SEVERITY_LEVELS.INFO,
    actor: {
      userId: user?._id,
      userType: user?.role || 'anonymous',
      email: user?.email,
      name: user?.name,
      role: user?.role,
      companyId: user?.companyId,
    },
    target: resource,
    request: {
      ipAddress: req?.ip || req?.headers?.['x-forwarded-for'],
      userAgent: req?.headers?.['user-agent'],
      method: req?.method,
      path: req?.originalUrl,
      requestId: req?.requestId,
    },
    description: denied 
      ? `Access denied to ${resource?.entityType}: ${reason}` 
      : `Access granted to ${resource?.entityType}`,
    details: { denied, reason },
  });
};

/**
 * Find security events by user
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
SecurityAuditSchema.statics.findByUser = function(userId, options = {}) {
  const query = { 'actor.userId': userId };
  
  if (options.eventType) query.eventType = options.eventType;
  if (options.severity) query.severity = options.severity;
  if (options.startDate || options.endDate) {
    query.createdAt = {};
    if (options.startDate) query.createdAt.$gte = options.startDate;
    if (options.endDate) query.createdAt.$lte = options.endDate;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 100)
    .skip(options.skip || 0);
};

/**
 * Find security events by IP address
 * @param {string} ipAddress - IP address
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
SecurityAuditSchema.statics.findByIp = function(ipAddress, options = {}) {
  const query = { 'request.ipAddress': ipAddress };
  
  if (options.eventType) query.eventType = options.eventType;
  if (options.startDate || options.endDate) {
    query.createdAt = {};
    if (options.startDate) query.createdAt.$gte = options.startDate;
    if (options.endDate) query.createdAt.$lte = options.endDate;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 100);
};

/**
 * Find suspicious activities
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
SecurityAuditSchema.statics.findSuspicious = function(options = {}) {
  const query = {
    $or: [
      { severity: { $in: [SEVERITY_LEVELS.HIGH, SEVERITY_LEVELS.CRITICAL] } },
      { eventType: { $in: [
        SECURITY_EVENT_TYPES.BRUTE_FORCE_ATTEMPT,
        SECURITY_EVENT_TYPES.SQL_INJECTION_ATTEMPT,
        SECURITY_EVENT_TYPES.XSS_ATTEMPT,
        SECURITY_EVENT_TYPES.PRIVILEGE_ESCALATION_ATTEMPT,
        SECURITY_EVENT_TYPES.SUSPICIOUS_IP,
      ]}},
      { 'risk.isAnomaly': true },
    ],
    status: { $in: [EVENT_STATUS.NEW, EVENT_STATUS.INVESTIGATING, EVENT_STATUS.ESCALATED] },
  };
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

/**
 * Get security statistics
 * @param {Object} filters - Date filters
 * @returns {Promise<Object>}
 */
SecurityAuditSchema.statics.getStats = async function(filters = {}) {
  const matchStage = {};
  
  if (filters.startDate || filters.endDate) {
    matchStage.createdAt = {};
    if (filters.startDate) matchStage.createdAt.$gte = filters.startDate;
    if (filters.endDate) matchStage.createdAt.$lte = filters.endDate;
  }
  
  const [eventStats, severityStats, categoryStats, dailyStats] = await Promise.all([
    this.aggregate([
      { $match: matchStage },
      { $group: { _id: '$eventType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]),
    this.aggregate([
      { $match: matchStage },
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]),
    this.aggregate([
      { $match: matchStage },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
    this.aggregate([
      { $match: matchStage },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
      { $limit: 30 },
    ]),
  ]);
  
  return {
    byEventType: eventStats,
    bySeverity: severityStats,
    byCategory: categoryStats,
    dailyTrend: dailyStats,
  };
};

/**
 * Detect brute force attempts
 * @param {string} ipAddress - IP address to check
 * @param {number} threshold - Number of failed attempts threshold
 * @param {number} windowMinutes - Time window in minutes
 * @returns {Promise<boolean>}
 */
SecurityAuditSchema.statics.detectBruteForce = async function(ipAddress, threshold = 5, windowMinutes = 15) {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
  
  const count = await this.countDocuments({
    'request.ipAddress': ipAddress,
    eventType: { $in: [SECURITY_EVENT_TYPES.LOGIN_FAILED, SECURITY_EVENT_TYPES.MFA_FAILED] },
    createdAt: { $gte: windowStart },
  });
  
  return count >= threshold;
};

// ==================== INSTANCE METHODS ====================

/**
 * Trigger alert for high-severity event
 */
SecurityAuditSchema.methods.triggerAlert = async function() {
  // This would integrate with notification service
  console.log(`[SECURITY ALERT] ${this.severity.toUpperCase()}: ${this.eventType} - ${this.description}`);
  
  // Add alert action
  this.actions.push({
    type: 'alerted',
    timestamp: new Date(),
    reason: `Automatic alert triggered for ${this.severity} severity event`,
  });
  
  await this.save();
};

/**
 * Mark event as investigated
 * @param {string} userId - Investigator user ID
 * @param {string} notes - Investigation notes
 */
SecurityAuditSchema.methods.markInvestigating = async function(userId, notes = '') {
  this.status = EVENT_STATUS.INVESTIGATING;
  this.investigation.assignedTo = userId;
  this.investigation.notes = notes;
  await this.save();
};

/**
 * Resolve security event
 * @param {string} userId - Resolver user ID
 * @param {string} resolution - Resolution notes
 */
SecurityAuditSchema.methods.resolve = async function(userId, resolution) {
  this.status = EVENT_STATUS.RESOLVED;
  this.investigation.resolvedAt = new Date();
  this.investigation.resolvedBy = userId;
  this.investigation.resolution = resolution;
  await this.save();
};

// Create and export the model
const SecurityAudit = mongoose.model('SecurityAudit', SecurityAuditSchema);

module.exports = SecurityAudit;
