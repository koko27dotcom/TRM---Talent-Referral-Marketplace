/**
 * WhatsApp Session Model
 * Manages WhatsApp conversation sessions between users and the platform
 * Tracks conversation state for two-way communication
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Session status
const SESSION_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  EXPIRED: 'expired',
  CLOSED: 'closed',
  BLOCKED: 'blocked',
};

// Conversation context types
const CONTEXT_TYPE = {
  GENERAL: 'general',
  REFERRAL_INQUIRY: 'referral_inquiry',
  REFERRAL_STATUS: 'referral_status',
  JOB_ALERT: 'job_alert',
  PAYOUT_INQUIRY: 'payout_inquiry',
  COMPANY_APPROVAL: 'company_approval',
  ONBOARDING: 'onboarding',
  SUPPORT: 'support',
  OPT_IN: 'opt_in',
  OPT_OUT: 'opt_out',
  VERIFICATION: 'verification',
};

// User type in conversation
const USER_TYPE = {
  REFERRER: 'referrer',
  COMPANY_ADMIN: 'company_admin',
  COMPANY_RECRUITER: 'company_recruiter',
  JOB_SEEKER: 'job_seeker',
  ADMIN: 'admin',
  UNKNOWN: 'unknown',
};

// Session metadata schema
const SessionMetadataSchema = new Schema({
  // Current referral being discussed
  currentReferralId: {
    type: Schema.Types.ObjectId,
    ref: 'Referral',
  },
  
  // Current job being discussed
  currentJobId: {
    type: Schema.Types.ObjectId,
    ref: 'Job',
  },
  
  // Current company being discussed
  currentCompanyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
  },
  
  // Last action taken
  lastAction: {
    type: String,
    trim: true,
  },
  
  // Pending action waiting for user response
  pendingAction: {
    type: String,
    trim: true,
  },
  
  // Quick reply options currently shown
  quickReplies: [{
    type: String,
    trim: true,
  }],
  
  // Session tags
  tags: [{
    type: String,
    trim: true,
  }],
}, { _id: false });

// Main WhatsApp Session Schema
const WhatsAppSessionSchema = new Schema({
  // Phone number (unique identifier for WhatsApp)
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    index: true,
    match: [/^\+[1-9]\d{1,14}$/, 'Please enter a valid phone number with country code (e.g., +959123456789)'],
  },
  
  // WhatsApp Business API contact ID
  wabaContactId: {
    type: String,
    trim: true,
    index: true,
    sparse: true,
  },
  
  // Associated user (if registered)
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    sparse: true,
  },
  
  // User type
  userType: {
    type: String,
    enum: Object.values(USER_TYPE),
    default: USER_TYPE.UNKNOWN,
  },
  
  // Session status
  status: {
    type: String,
    enum: Object.values(SESSION_STATUS),
    default: SESSION_STATUS.ACTIVE,
    index: true,
  },
  
  // Current conversation context
  context: {
    type: {
      type: String,
      enum: Object.values(CONTEXT_TYPE),
      default: CONTEXT_TYPE.GENERAL,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  
  // Session metadata
  metadata: {
    type: SessionMetadataSchema,
    default: () => ({}),
  },
  
  // Conversation statistics
  stats: {
    messageCount: {
      type: Number,
      default: 0,
    },
    inboundCount: {
      type: Number,
      default: 0,
    },
    outboundCount: {
      type: Number,
      default: 0,
    },
    templateCount: {
      type: Number,
      default: 0,
    },
    firstContactAt: {
      type: Date,
    },
    lastContactAt: {
      type: Date,
    },
    lastInboundAt: {
      type: Date,
    },
    lastOutboundAt: {
      type: Date,
    },
  },
  
  // Session timing
  startedAt: {
    type: Date,
    default: Date.now,
  },
  
  expiresAt: {
    type: Date,
    default: function() {
      // Default 24-hour session expiry
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    },
  },
  
  closedAt: {
    type: Date,
  },
  
  closedReason: {
    type: String,
    trim: true,
  },
  
  // Opt-in status
  optIn: {
    status: {
      type: Boolean,
      default: false,
    },
    optedInAt: {
      type: Date,
    },
    optedOutAt: {
      type: Date,
    },
    source: {
      type: String,
      enum: ['web', 'whatsapp', 'api', 'admin'],
    },
  },
  
  // Language preference
  language: {
    type: String,
    enum: ['en', 'my', 'auto'],
    default: 'auto',
  },
  
  // Rate limiting
  rateLimit: {
    messageCount: {
      type: Number,
      default: 0,
    },
    windowStart: {
      type: Date,
      default: Date.now,
    },
    isThrottled: {
      type: Boolean,
      default: false,
    },
  },
  
  // Device/Client info
  deviceInfo: {
    platform: {
      type: String,
      trim: true,
    },
    lastSeenAt: {
      type: Date,
    },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ==================== INDEXES ====================

WhatsAppSessionSchema.index({ phoneNumber: 1 }, { unique: true });
WhatsAppSessionSchema.index({ userId: 1 }, { sparse: true });
WhatsAppSessionSchema.index({ wabaContactId: 1 }, { sparse: true });
WhatsAppSessionSchema.index({ status: 1, expiresAt: 1 });
WhatsAppSessionSchema.index({ 'optIn.status': 1 });
WhatsAppSessionSchema.index({ 'stats.lastContactAt': -1 });

// ==================== VIRTUALS ====================

// Virtual for session duration in minutes
WhatsAppSessionSchema.virtual('durationMinutes').get(function() {
  const end = this.closedAt || new Date();
  return Math.floor((end - this.startedAt) / (1000 * 60));
});

// Virtual for is expired
WhatsAppSessionSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Virtual for is active
WhatsAppSessionSchema.virtual('isActive').get(function() {
  return this.status === SESSION_STATUS.ACTIVE && !this.isExpired;
});

// Virtual for time since last contact
WhatsAppSessionSchema.virtual('idleMinutes').get(function() {
  if (!this.stats.lastContactAt) return null;
  return Math.floor((new Date() - this.stats.lastContactAt) / (1000 * 60));
});

// ==================== MIDDLEWARE ====================

// Pre-save middleware to update timestamps
WhatsAppSessionSchema.pre('save', function(next) {
  if (this.isNew) {
    this.stats.firstContactAt = new Date();
  }
  next();
});

// ==================== INSTANCE METHODS ====================

/**
 * Update last contact timestamp
 * @param {string} direction - 'inbound' or 'outbound'
 */
WhatsAppSessionSchema.methods.updateLastContact = async function(direction) {
  const now = new Date();
  const update = {
    'stats.lastContactAt': now,
    'stats.messageCount': this.stats.messageCount + 1,
  };
  
  if (direction === 'inbound') {
    update['stats.inboundCount'] = this.stats.inboundCount + 1;
    update['stats.lastInboundAt'] = now;
  } else {
    update['stats.outboundCount'] = this.stats.outboundCount + 1;
    update['stats.lastOutboundAt'] = now;
  }
  
  await this.updateOne(update);
};

/**
 * Set conversation context
 * @param {string} contextType - Context type
 * @param {Object} data - Context data
 */
WhatsAppSessionSchema.methods.setContext = async function(contextType, data = {}) {
  this.context.type = contextType;
  this.context.data = { ...this.context.data, ...data };
  await this.save();
};

/**
 * Clear conversation context
 */
WhatsAppSessionSchema.methods.clearContext = async function() {
  this.context.type = CONTEXT_TYPE.GENERAL;
  this.context.data = {};
  this.metadata.pendingAction = null;
  this.metadata.quickReplies = [];
  await this.save();
};

/**
 * Opt in user
 * @param {string} source - Opt-in source
 */
WhatsAppSessionSchema.methods.optInUser = async function(source = 'whatsapp') {
  this.optIn.status = true;
  this.optIn.optedInAt = new Date();
  this.optIn.source = source;
  await this.save();
};

/**
 * Opt out user
 */
WhatsAppSessionSchema.methods.optOutUser = async function() {
  this.optIn.status = false;
  this.optIn.optedOutAt = new Date();
  await this.save();
};

/**
 * Close session
 * @param {string} reason - Close reason
 */
WhatsAppSessionSchema.methods.close = async function(reason = 'user_initiated') {
  this.status = SESSION_STATUS.CLOSED;
  this.closedAt = new Date();
  this.closedReason = reason;
  await this.save();
};

/**
 * Extend session expiry
 * @param {number} hours - Hours to extend
 */
WhatsAppSessionSchema.methods.extendExpiry = async function(hours = 24) {
  this.expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  await this.save();
};

/**
 * Check if user is rate limited
 * @returns {boolean}
 */
WhatsAppSessionSchema.methods.isRateLimited = function() {
  const windowMs = 60 * 1000; // 1 minute window
  const maxMessages = 30; // Max 30 messages per minute
  
  // Reset window if expired
  if (new Date() - this.rateLimit.windowStart > windowMs) {
    this.rateLimit.messageCount = 0;
    this.rateLimit.windowStart = new Date();
    this.rateLimit.isThrottled = false;
    return false;
  }
  
  return this.rateLimit.messageCount >= maxMessages || this.rateLimit.isThrottled;
};

/**
 * Increment rate limit counter
 */
WhatsAppSessionSchema.methods.incrementRateLimit = async function() {
  await this.updateOne({
    $inc: { 'rateLimit.messageCount': 1 },
  });
};

/**
 * Link to user account
 * @param {string} userId - User ID
 * @param {string} userType - User type
 */
WhatsAppSessionSchema.methods.linkToUser = async function(userId, userType) {
  this.userId = userId;
  this.userType = userType;
  await this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Find or create session by phone number
 * @param {string} phoneNumber - Phone number
 * @returns {Promise<Document>}
 */
WhatsAppSessionSchema.statics.findOrCreate = async function(phoneNumber) {
  let session = await this.findOne({ phoneNumber });
  
  if (!session) {
    session = await this.create({ phoneNumber });
  }
  
  return session;
};

/**
 * Find session by phone number
 * @param {string} phoneNumber - Phone number
 * @returns {Promise<Document|null>}
 */
WhatsAppSessionSchema.statics.findByPhone = function(phoneNumber) {
  return this.findOne({ phoneNumber });
};

/**
 * Find active sessions
 * @returns {Promise<Array>}
 */
WhatsAppSessionSchema.statics.findActive = function() {
  return this.find({
    status: SESSION_STATUS.ACTIVE,
    expiresAt: { $gt: new Date() },
  }).sort({ 'stats.lastContactAt': -1 });
};

/**
 * Find expired sessions
 * @returns {Promise<Array>}
 */
WhatsAppSessionSchema.statics.findExpired = function() {
  return this.find({
    status: SESSION_STATUS.ACTIVE,
    expiresAt: { $lte: new Date() },
  });
};

/**
 * Get session statistics
 * @returns {Promise<Object>}
 */
WhatsAppSessionSchema.statics.getStats = async function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        activeSessions: {
          $sum: {
            $cond: [{ $eq: ['$status', SESSION_STATUS.ACTIVE] }, 1, 0],
          },
        },
        optedInUsers: {
          $sum: {
            $cond: [{ $eq: ['$optIn.status', true] }, 1, 0],
          },
        },
        totalMessages: { $sum: '$stats.messageCount' },
        avgMessagesPerSession: { $avg: '$stats.messageCount' },
      },
    },
  ]);
};

/**
 * Clean up expired sessions
 * @returns {Promise<Object>}
 */
WhatsAppSessionSchema.statics.cleanupExpired = async function() {
  const result = await this.updateMany(
    {
      status: SESSION_STATUS.ACTIVE,
      expiresAt: { $lte: new Date() },
    },
    {
      $set: {
        status: SESSION_STATUS.EXPIRED,
        closedAt: new Date(),
        closedReason: 'session_expired',
      },
    }
  );
  
  return result;
};

// Create and export the model
const WhatsAppSession = mongoose.model('WhatsAppSession', WhatsAppSessionSchema);

module.exports = WhatsAppSession;
module.exports.SESSION_STATUS = SESSION_STATUS;
module.exports.CONTEXT_TYPE = CONTEXT_TYPE;
module.exports.USER_TYPE = USER_TYPE;

