/**
 * Notification Model
 * Handles in-app and email notifications for users
 * Supports multiple notification types and delivery channels
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Notification type constants
const NOTIFICATION_TYPES = {
  // Referral-related
  REFERRAL_SUBMITTED: 'referral_submitted',
  REFERRAL_STATUS_CHANGED: 'referral_status_changed',
  REFERRAL_HIRED: 'referral_hired',
  REFERRAL_PAID: 'referral_paid',
  
  // Payout-related
  PAYOUT_REQUESTED: 'payout_requested',
  PAYOUT_APPROVED: 'payout_approved',
  PAYOUT_PROCESSING: 'payout_processing',
  PAYOUT_PAID: 'payout_paid',
  PAYOUT_REJECTED: 'payout_rejected',
  PAYOUT_CANCELLED: 'payout_cancelled',
  
  // Subscription-related
  SUBSCRIPTION_CREATED: 'subscription_created',
  SUBSCRIPTION_RENEWED: 'subscription_renewed',
  SUBSCRIPTION_EXPIRING: 'subscription_expiring',
  SUBSCRIPTION_EXPIRED: 'subscription_expired',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  
  // Billing-related
  PAYMENT_RECEIVED: 'payment_received',
  PAYMENT_FAILED: 'payment_failed',
  INVOICE_GENERATED: 'invoice_generated',
  
  // Job-related
  JOB_POSTED: 'job_posted',
  JOB_EXPIRED: 'job_expired',
  JOB_APPLICATION_RECEIVED: 'job_application_received',
  
  // System
  WELCOME: 'welcome',
  KYC_VERIFIED: 'kyc_verified',
  KYC_REJECTED: 'kyc_rejected',
  PASSWORD_CHANGED: 'password_changed',
  ACCOUNT_SUSPENDED: 'account_suspended',
  SYSTEM_MAINTENANCE: 'system_maintenance',
  
  // Admin
  NEW_COMPANY_REGISTERED: 'new_company_registered',
  NEW_PAYOUT_REQUEST: 'new_payout_request',
  HIGH_VALUE_REFERRAL: 'high_value_referral',
};

// Notification priority levels
const NOTIFICATION_PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
};

// Notification channels
const NOTIFICATION_CHANNELS = {
  IN_APP: 'in_app',
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push',
};

// Action button schema for interactive notifications
const ActionButtonSchema = new Schema({
  label: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    required: true,
  },
  url: {
    type: String,
  },
  style: {
    type: String,
    enum: ['primary', 'secondary', 'danger'],
    default: 'primary',
  },
}, { _id: false });

// Main Notification Schema
const NotificationSchema = new Schema({
  // Recipient
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true,
  },
  
  // Notification details
  type: {
    type: String,
    enum: Object.values(NOTIFICATION_TYPES),
    required: [true, 'Notification type is required'],
    index: true,
  },
  
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters'],
  },
  
  // Priority
  priority: {
    type: String,
    enum: Object.values(NOTIFICATION_PRIORITY),
    default: NOTIFICATION_PRIORITY.NORMAL,
  },
  
  // Read status
  isRead: {
    type: Boolean,
    default: false,
    index: true,
  },
  
  readAt: {
    type: Date,
  },
  
  // Related entities (for linking)
  relatedEntity: {
    type: {
      type: String,
      enum: ['referral', 'payout', 'job', 'company', 'subscription', 'user', 'billing'],
    },
    id: {
      type: Schema.Types.ObjectId,
    },
  },
  
  // Action buttons
  actions: [ActionButtonSchema],
  
  // Deep link for mobile apps
  deepLink: {
    type: String,
    trim: true,
  },
  
  // Delivery tracking
  deliveryStatus: {
    inApp: {
      delivered: { type: Boolean, default: true },
      deliveredAt: { type: Date, default: Date.now },
    },
    email: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date },
      delivered: { type: Boolean, default: false },
      deliveredAt: { type: Date },
      opened: { type: Boolean, default: false },
      openedAt: { type: Date },
    },
    sms: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date },
      delivered: { type: Boolean, default: false },
      deliveredAt: { type: Date },
    },
    push: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date },
      delivered: { type: Boolean, default: false },
      deliveredAt: { type: Date },
    },
  },
  
  // Channels to use
  channels: [{
    type: String,
    enum: Object.values(NOTIFICATION_CHANNELS),
    default: [NOTIFICATION_CHANNELS.IN_APP],
  }],
  
  // Expiry date
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  },
  
  // Metadata
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
  
  // For batch notifications
  batchId: {
    type: String,
    index: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ==================== INDEXES ====================

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, priority: 1, createdAt: -1 });
NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// ==================== VIRTUALS ====================

// Virtual for time since notification
NotificationSchema.virtual('timeSince').get(function() {
  const diff = Date.now() - this.createdAt.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
});

// Virtual for is expired
NotificationSchema.virtual('isExpired').get(function() {
  return this.expiresAt < new Date();
});

// ==================== INSTANCE METHODS ====================

/**
 * Mark notification as read
 * @returns {Promise<void>}
 */
NotificationSchema.methods.markAsRead = async function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    await this.save();
  }
};

/**
 * Mark notification as unread
 * @returns {Promise<void>}
 */
NotificationSchema.methods.markAsUnread = async function() {
  if (this.isRead) {
    this.isRead = false;
    this.readAt = null;
    await this.save();
  }
};

/**
 * Update email delivery status
 * @param {string} status - Delivery status
 * @returns {Promise<void>}
 */
NotificationSchema.methods.updateEmailStatus = async function(status) {
  const now = new Date();
  switch (status) {
    case 'sent':
      this.deliveryStatus.email.sent = true;
      this.deliveryStatus.email.sentAt = now;
      break;
    case 'delivered':
      this.deliveryStatus.email.delivered = true;
      this.deliveryStatus.email.deliveredAt = now;
      break;
    case 'opened':
      this.deliveryStatus.email.opened = true;
      this.deliveryStatus.email.openedAt = now;
      break;
  }
  await this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Create notification
 * @param {Object} data - Notification data
 * @returns {Promise<Document>}
 */
NotificationSchema.statics.createNotification = async function(data) {
  const notification = await this.create({
    ...data,
    channels: data.channels || [NOTIFICATION_CHANNELS.IN_APP],
  });
  return notification;
};

/**
 * Get unread notifications for user
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
NotificationSchema.statics.getUnread = function(userId, options = {}) {
  const query = { userId, isRead: false };
  
  if (options.types) {
    query.type = { $in: options.types };
  }
  
  return this.find(query)
    .sort({ priority: -1, createdAt: -1 })
    .limit(options.limit || 50);
};

/**
 * Get notifications for user
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
NotificationSchema.statics.getForUser = function(userId, options = {}) {
  const query = { userId };
  
  if (options.isRead !== undefined) {
    query.isRead = options.isRead;
  }
  
  if (options.types) {
    query.type = { $in: options.types };
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

/**
 * Get notification count for user
 * @param {string} userId - User ID
 * @param {Object} filters - Additional filters
 * @returns {Promise<Object>}
 */
NotificationSchema.statics.getCount = async function(userId, filters = {}) {
  const query = { userId };
  
  if (filters.types) {
    query.type = { $in: filters.types };
  }
  
  const [total, unread] = await Promise.all([
    this.countDocuments(query),
    this.countDocuments({ ...query, isRead: false }),
  ]);
  
  return { total, unread };
};

/**
 * Mark all notifications as read for user
 * @param {string} userId - User ID
 * @param {Object} filters - Optional filters
 * @returns {Promise<Object>}
 */
NotificationSchema.statics.markAllAsRead = async function(userId, filters = {}) {
  const query = { userId, isRead: false };
  
  if (filters.types) {
    query.type = { $in: filters.types };
  }
  
  const result = await this.updateMany(
    query,
    { $set: { isRead: true, readAt: new Date() } }
  );
  
  return { modified: result.modifiedCount };
};

/**
 * Delete old read notifications
 * @param {number} days - Days to keep
 * @returns {Promise<Object>}
 */
NotificationSchema.statics.cleanup = async function(days = 30) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const result = await this.deleteMany({
    isRead: true,
    readAt: { $lt: cutoff },
  });
  
  return { deleted: result.deletedCount };
};

/**
 * Get notifications by type
 * @param {string} type - Notification type
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
NotificationSchema.statics.getByType = function(type, options = {}) {
  return this.find({ type })
    .sort({ createdAt: -1 })
    .limit(options.limit || 100);
};

// Create and export the model
const Notification = mongoose.model('Notification', NotificationSchema);

module.exports = Notification;
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
module.exports.NOTIFICATION_PRIORITY = NOTIFICATION_PRIORITY;
module.exports.NOTIFICATION_CHANNELS = NOTIFICATION_CHANNELS;
