/**
 * AuditLog Model
 * Tracks all significant actions in the system for compliance and debugging
 * Includes user actions, system events, and data changes
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Change details schema
const ChangeSchema = new Schema({
  field: {
    type: String,
    required: true,
  },
  oldValue: {
    type: Schema.Types.Mixed,
  },
  newValue: {
    type: Schema.Types.Mixed,
  },
}, { _id: false });

// Action constants
const AUDIT_ACTIONS = {
  // Authentication
  LOGIN: 'login',
  LOGOUT: 'logout',
  LOGIN_FAILED: 'login_failed',
  PASSWORD_CHANGED: 'password_changed',
  PASSWORD_RESET: 'password_reset',
  
  // User management
  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  USER_DELETED: 'user_deleted',
  USER_SUSPENDED: 'user_suspended',
  USER_ACTIVATED: 'user_activated',
  
  // Company management
  COMPANY_CREATED: 'company_created',
  COMPANY_UPDATED: 'company_updated',
  COMPANY_DELETED: 'company_deleted',
  COMPANY_VERIFIED: 'company_verified',
  COMPANY_REJECTED: 'company_rejected',
  
  // Team management
  MEMBER_INVITED: 'member_invited',
  MEMBER_ACCEPTED: 'member_accepted',
  MEMBER_DECLINED: 'member_declined',
  MEMBER_REMOVED: 'member_removed',
  ROLE_CHANGED: 'role_changed',
  
  // Job management
  JOB_CREATED: 'job_created',
  JOB_UPDATED: 'job_updated',
  JOB_DELETED: 'job_deleted',
  JOB_PUBLISHED: 'job_published',
  JOB_CLOSED: 'job_closed',
  JOB_FILLED: 'job_filled',
  
  // Referrals
  REFERRAL_SUBMITTED: 'referral_submitted',
  REFERRAL_UPDATED: 'referral_updated',
  REFERRAL_STATUS_CHANGED: 'referral_status_changed',
  REFERRAL_WITHDRAWN: 'referral_withdrawn',
  REFERRAL_REJECTED: 'referral_rejected',
  REFERRAL_HIRED: 'referral_hired',
  
  // Applications
  APPLICATION_SUBMITTED: 'application_submitted',
  APPLICATION_UPDATED: 'application_updated',
  APPLICATION_STATUS_CHANGED: 'application_status_changed',
  
  // Billing
  SUBSCRIPTION_CREATED: 'subscription_created',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  SUBSCRIPTION_RENEWED: 'subscription_renewed',
  INVOICE_CREATED: 'invoice_created',
  INVOICE_PAID: 'invoice_paid',
  INVOICE_FAILED: 'invoice_failed',
  
  // Payouts
  PAYOUT_REQUESTED: 'payout_requested',
  PAYOUT_APPROVED: 'payout_approved',
  PAYOUT_REJECTED: 'payout_rejected',
  PAYOUT_PAID: 'payout_paid',
  
  // System
  SETTINGS_UPDATED: 'settings_updated',
  EXPORT_GENERATED: 'export_generated',
  BULK_ACTION: 'bulk_action',
  
  // Security
  PERMISSION_DENIED: 'permission_denied',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
};

// Entity type constants
const ENTITY_TYPES = {
  USER: 'user',
  COMPANY: 'company',
  COMPANY_USER: 'company_user',
  JOB: 'job',
  REFERRAL: 'referral',
  APPLICATION: 'application',
  SUBSCRIPTION: 'subscription',
  SUBSCRIPTION_PLAN: 'subscription_plan',
  BILLING_RECORD: 'billing_record',
  PAYOUT_REQUEST: 'payout_request',
  SYSTEM: 'system',
};

// Main AuditLog Schema
const AuditLogSchema = new Schema({
  // Who performed the action
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  userType: {
    type: String,
    enum: ['platform_admin', 'corporate_admin', 'corporate_recruiter', 'corporate_viewer', 'referrer', 'job_seeker', 'system', 'anonymous'],
    default: 'anonymous',
  },
  userEmail: {
    type: String,
    trim: true,
  },
  userName: {
    type: String,
    trim: true,
  },
  
  // What action was performed
  action: {
    type: String,
    enum: Object.values(AUDIT_ACTIONS),
    required: [true, 'Action is required'],
    index: true,
  },
  actionCategory: {
    type: String,
    enum: ['auth', 'user', 'company', 'job', 'referral', 'application', 'billing', 'payout', 'system', 'security'],
    required: true,
  },
  
  // What entity was affected
  entityType: {
    type: String,
    enum: Object.values(ENTITY_TYPES),
    required: [true, 'Entity type is required'],
    index: true,
  },
  entityId: {
    type: Schema.Types.ObjectId,
    index: true,
  },
  entityName: {
    type: String,
    trim: true,
  },
  
  // Change details
  changes: [ChangeSchema],
  description: {
    type: String,
    trim: true,
  },
  
  // Context
  ipAddress: {
    type: String,
    trim: true,
    index: true,
  },
  userAgent: {
    type: String,
    trim: true,
  },
  requestId: {
    type: String,
    trim: true,
    index: true,
  },
  sessionId: {
    type: String,
    trim: true,
  },
  
  // Additional metadata
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
  
  // Severity level
  severity: {
    type: String,
    enum: ['info', 'warning', 'error', 'critical'],
    default: 'info',
  },
  
  // Company context (for multi-tenant filtering)
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    index: true,
  },
  
  // Timestamp
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: false, // We only need createdAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ==================== INDEXES ====================

// Primary indexes for querying
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ companyId: 1, createdAt: -1 });
AuditLogSchema.index({ severity: 1, createdAt: -1 });

// TTL index for automatic cleanup (30 days)
AuditLogSchema.index({ createdAt: -1 }, { expireAfterSeconds: 2592000 });

// Compound indexes for common queries
AuditLogSchema.index({ entityType: 1, action: 1, createdAt: -1 });
AuditLogSchema.index({ userId: 1, action: 1, createdAt: -1 });

// ==================== VIRTUALS ====================

// Virtual for formatted timestamp
AuditLogSchema.virtual('formattedTimestamp').get(function() {
  return this.createdAt.toISOString();
});

// Virtual for action display name
AuditLogSchema.virtual('actionDisplay').get(function() {
  return this.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
});

// ==================== STATIC METHODS ====================

/**
 * Log an action
 * @param {Object} logData - Log entry data
 * @returns {Promise<Document>}
 */
AuditLogSchema.statics.log = async function(logData) {
  const logEntry = await this.create(logData);
  return logEntry;
};

/**
 * Log user action
 * @param {Object} options - Logging options
 * @returns {Promise<Document>}
 */
AuditLogSchema.statics.logUserAction = async function(options) {
  const {
    user,
    action,
    entityType,
    entityId,
    entityName,
    changes,
    description,
    req,
    companyId,
    severity = 'info',
  } = options;
  
  const logData = {
    userId: user?._id,
    userType: user?.role || 'anonymous',
    userEmail: user?.email,
    userName: user?.name,
    action,
    actionCategory: getActionCategory(action),
    entityType,
    entityId,
    entityName,
    changes,
    description,
    ipAddress: req?.ip || req?.headers?.['x-forwarded-for'],
    userAgent: req?.headers?.['user-agent'],
    requestId: req?.requestId,
    companyId,
    severity,
  };
  
  return this.log(logData);
};

/**
 * Find logs by user
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
AuditLogSchema.statics.findByUser = function(userId, options = {}) {
  const query = { userId };
  
  if (options.action) {
    query.action = options.action;
  }
  
  if (options.entityType) {
    query.entityType = options.entityType;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 100)
    .skip(options.skip || 0);
};

/**
 * Find logs by entity
 * @param {string} entityType - Entity type
 * @param {string} entityId - Entity ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
AuditLogSchema.statics.findByEntity = function(entityType, entityId, options = {}) {
  return this.find({ entityType, entityId })
    .sort({ createdAt: -1 })
    .limit(options.limit || 100);
};

/**
 * Find logs by company
 * @param {string} companyId - Company ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
AuditLogSchema.statics.findByCompany = function(companyId, options = {}) {
  const query = { companyId };
  
  if (options.action) {
    query.action = options.action;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 100)
    .skip(options.skip || 0);
};

/**
 * Find recent security events
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
AuditLogSchema.statics.findSecurityEvents = function(options = {}) {
  const query = {
    $or: [
      { severity: { $in: ['error', 'critical'] } },
      { action: { $in: [AUDIT_ACTIONS.LOGIN_FAILED, AUDIT_ACTIONS.PERMISSION_DENIED, AUDIT_ACTIONS.SUSPICIOUS_ACTIVITY] } },
    ],
  };
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

/**
 * Get activity statistics
 * @param {Object} filters - Date filters
 * @returns {Promise<Object>}
 */
AuditLogSchema.statics.getStats = async function(filters = {}) {
  const matchStage = {};
  
  if (filters.startDate || filters.endDate) {
    matchStage.createdAt = {};
    if (filters.startDate) matchStage.createdAt.$gte = filters.startDate;
    if (filters.endDate) matchStage.createdAt.$lte = filters.endDate;
  }
  
  const [actionStats, categoryStats, severityStats] = await Promise.all([
    this.aggregate([
      { $match: matchStage },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    this.aggregate([
      { $match: matchStage },
      { $group: { _id: '$actionCategory', count: { $sum: 1 } } },
    ]),
    this.aggregate([
      { $match: matchStage },
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]),
  ]);
  
  return {
    topActions: actionStats,
    byCategory: categoryStats,
    bySeverity: severityStats,
  };
};

/**
 * Get user activity summary
 * @param {string} userId - User ID
 * @param {Object} filters - Date filters
 * @returns {Promise<Object>}
 */
AuditLogSchema.statics.getUserActivitySummary = async function(userId, filters = {}) {
  const matchStage = { userId: new mongoose.Types.ObjectId(userId) };
  
  if (filters.startDate || filters.endDate) {
    matchStage.createdAt = {};
    if (filters.startDate) matchStage.createdAt.$gte = filters.startDate;
    if (filters.endDate) matchStage.createdAt.$lte = filters.endDate;
  }
  
  const summary = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalActions: { $sum: 1 },
        byCategory: {
          $push: '$actionCategory',
        },
        lastActive: { $max: '$createdAt' },
      },
    },
  ]);
  
  if (!summary[0]) {
    return { totalActions: 0, byCategory: {}, lastActive: null };
  }
  
  const categoryCounts = summary[0].byCategory.reduce((acc, cat) => {
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});
  
  return {
    totalActions: summary[0].totalActions,
    byCategory: categoryCounts,
    lastActive: summary[0].lastActive,
  };
};

/**
 * Search logs
 * @param {string} searchTerm - Search term
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
AuditLogSchema.statics.search = function(searchTerm, options = {}) {
  const query = {
    $or: [
      { action: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { entityName: { $regex: searchTerm, $options: 'i' } },
      { userEmail: { $regex: searchTerm, $options: 'i' } },
    ],
  };
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Get action category from action name
 * @param {string} action - Action name
 * @returns {string}
 */
function getActionCategory(action) {
  if (action.includes('login') || action.includes('logout') || action.includes('password')) {
    return 'auth';
  }
  if (action.includes('user')) {
    return 'user';
  }
  if (action.includes('company') || action.includes('member')) {
    return 'company';
  }
  if (action.includes('job')) {
    return 'job';
  }
  if (action.includes('referral')) {
    return 'referral';
  }
  if (action.includes('application')) {
    return 'application';
  }
  if (action.includes('subscription') || action.includes('invoice')) {
    return 'billing';
  }
  if (action.includes('payout')) {
    return 'payout';
  }
  if (action.includes('permission') || action.includes('suspicious') || action.includes('rate')) {
    return 'security';
  }
  return 'system';
}

// Create and export the model
const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

module.exports = AuditLog;
