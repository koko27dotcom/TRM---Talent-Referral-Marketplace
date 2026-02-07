/**
 * FailedAttempt Model
 * Tracks failed authentication attempts for brute force detection
 * Supports account lockout and progressive delays
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Failed attempt schema
const FailedAttemptSchema = new Schema({
  // Identifier for the attempt (email, username, or IP)
  identifier: {
    type: String,
    required: true,
    index: true,
  },

  // Type of identifier
  identifierType: {
    type: String,
    enum: ['email', 'username', 'ip', 'phone'],
    required: true,
  },

  // User ID if authenticated user
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },

  // Attempt details
  attempts: [{
    timestamp: {
      type: Date,
      default: Date.now,
    },
    ipAddress: String,
    userAgent: String,
    reason: String, // e.g., 'invalid_password', 'account_locked', 'mfa_failed'
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  }],

  // Lockout status
  locked: {
    type: Boolean,
    default: false,
  },
  lockedAt: Date,
  lockedUntil: Date,
  lockoutReason: String,

  // Progressive delay tracking
  consecutiveFailures: {
    type: Number,
    default: 0,
  },

  // Account status
  accountStatus: {
    type: String,
    enum: ['active', 'locked', 'suspended', 'banned'],
    default: 'active',
  },

  // Last successful login (for comparison)
  lastSuccessfulLogin: Date,

  // Geographic data
  geoLocation: {
    country: String,
    countryCode: String,
    city: String,
    latitude: Number,
    longitude: Number,
  },

  // Device fingerprint
  deviceFingerprint: String,

  // Suspicious activity flag
  isSuspicious: {
    type: Boolean,
    default: false,
  },
  suspiciousReasons: [String],

  // Auto-expire after retention period
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 },
  },
}, {
  timestamps: true,
});

// Indexes
FailedAttemptSchema.index({ identifier: 1, identifierType: 1 });
FailedAttemptSchema.index({ userId: 1, createdAt: -1 });
FailedAttemptSchema.index({ locked: 1, lockedUntil: 1 });
FailedAttemptSchema.index({ isSuspicious: 1, createdAt: -1 });

/**
 * Record a failed attempt
 * @param {Object} data - Attempt data
 * @returns {Promise<Document>}
 */
FailedAttemptSchema.statics.recordAttempt = async function(data) {
  const {
    identifier,
    identifierType,
    userId,
    ipAddress,
    userAgent,
    reason,
    metadata = {},
  } = data;

  // Find or create record
  let record = await this.findOne({ identifier, identifierType });

  if (!record) {
    record = new this({
      identifier,
      identifierType,
      userId,
      attempts: [],
    });
  }

  // Add attempt
  record.attempts.push({
    timestamp: new Date(),
    ipAddress,
    userAgent,
    reason,
    metadata,
  });

  // Increment consecutive failures
  record.consecutiveFailures += 1;

  // Check for suspicious patterns
  await record.detectSuspiciousPatterns();

  // Update expiration
  const retentionDays = 365; // 1 year retention
  record.expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);

  await record.save();

  return record;
};

/**
 * Detect suspicious patterns in failed attempts
 */
FailedAttemptSchema.methods.detectSuspiciousPatterns = async function() {
  const suspiciousReasons = [];

  // Check for rapid successive attempts
  const recentAttempts = this.attempts.filter(
    a => Date.now() - a.timestamp < 15 * 60 * 1000 // 15 minutes
  );

  if (recentAttempts.length >= 5) {
    suspiciousReasons.push('rapid_attempts');
  }

  // Check for multiple IPs
  const uniqueIps = new Set(this.attempts.map(a => a.ipAddress)).size;
  if (uniqueIps >= 3) {
    suspiciousReasons.push('multiple_ips');
  }

  // Check for distributed attack (many attempts from different locations)
  if (this.attempts.length >= 10) {
    suspiciousReasons.push('high_volume');
  }

  if (suspiciousReasons.length > 0) {
    this.isSuspicious = true;
    this.suspiciousReasons = [...new Set([...this.suspiciousReasons, ...suspiciousReasons])];
  }
};

/**
 * Check if account should be locked
 * @param {number} maxAttempts - Maximum allowed attempts
 * @returns {boolean}
 */
FailedAttemptSchema.methods.shouldLock = function(maxAttempts = 5) {
  const recentAttempts = this.attempts.filter(
    a => Date.now() - a.timestamp < 15 * 60 * 1000 // 15 minutes
  );

  return recentAttempts.length >= maxAttempts;
};

/**
 * Lock the account
 * @param {number} duration - Lock duration in milliseconds
 * @param {string} reason - Lock reason
 */
FailedAttemptSchema.methods.lock = async function(duration = 15 * 60 * 1000, reason = 'too_many_attempts') {
  this.locked = true;
  this.lockedAt = new Date();
  this.lockedUntil = new Date(Date.now() + duration);
  this.lockoutReason = reason;
  this.accountStatus = 'locked';

  await this.save();
};

/**
 * Unlock the account
 */
FailedAttemptSchema.methods.unlock = async function() {
  this.locked = false;
  this.lockedAt = null;
  this.lockedUntil = null;
  this.lockoutReason = null;
  this.accountStatus = 'active';
  this.consecutiveFailures = 0;

  await this.save();
};

/**
 * Check if account is currently locked
 * @returns {Object} Lock status
 */
FailedAttemptSchema.methods.isLocked = function() {
  if (!this.locked) {
    return { locked: false };
  }

  const now = new Date();

  if (this.lockedUntil && now > this.lockedUntil) {
    // Lock has expired
    return { locked: false, expired: true };
  }

  return {
    locked: true,
    lockedUntil: this.lockedUntil,
    reason: this.lockoutReason,
    remainingTime: this.lockedUntil ? this.lockedUntil - now : 0,
  };
};

/**
 * Clear failed attempts (after successful login)
 */
FailedAttemptSchema.methods.clear = async function() {
  this.attempts = [];
  this.consecutiveFailures = 0;
  this.isSuspicious = false;
  this.suspiciousReasons = [];
  this.lastSuccessfulLogin = new Date();

  // Unlock if locked
  if (this.locked) {
    this.locked = false;
    this.lockedAt = null;
    this.lockedUntil = null;
    this.lockoutReason = null;
    this.accountStatus = 'active';
  }

  await this.save();
};

/**
 * Get attempt statistics
 * @returns {Object} Statistics
 */
FailedAttemptSchema.methods.getStats = function() {
  const now = Date.now();

  return {
    totalAttempts: this.attempts.length,
    recentAttempts: this.attempts.filter(a => now - a.timestamp < 24 * 60 * 60 * 1000).length,
    consecutiveFailures: this.consecutiveFailures,
    isLocked: this.locked,
    lockedUntil: this.lockedUntil,
    isSuspicious: this.isSuspicious,
    suspiciousReasons: this.suspiciousReasons,
    uniqueIps: new Set(this.attempts.map(a => a.ipAddress)).size,
  };
};

/**
 * Find suspicious accounts
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
FailedAttemptSchema.statics.findSuspicious = function(options = {}) {
  const { limit = 50 } = options;

  return this.find({ isSuspicious: true })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .populate('userId', 'name email');
};

/**
 * Find locked accounts
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
FailedAttemptSchema.statics.findLocked = function(options = {}) {
  const { limit = 50 } = options;

  return this.find({ locked: true })
    .sort({ lockedAt: -1 })
    .limit(limit)
    .populate('userId', 'name email');
};

/**
 * Get statistics for dashboard
 * @returns {Promise<Object>}
 */
FailedAttemptSchema.statics.getDashboardStats = async function() {
  const now = new Date();
  const last24h = new Date(now - 24 * 60 * 60 * 1000);

  const [
    totalFailedAttempts,
    lockedAccounts,
    suspiciousAccounts,
    recentAttempts,
  ] = await Promise.all([
    this.countDocuments(),
    this.countDocuments({ locked: true }),
    this.countDocuments({ isSuspicious: true }),
    this.countDocuments({ updatedAt: { $gte: last24h } }),
  ]);

  return {
    totalFailedAttempts,
    lockedAccounts,
    suspiciousAccounts,
    recentAttempts,
  };
};

// Create and export the model
const FailedAttempt = mongoose.model('FailedAttempt', FailedAttemptSchema);

module.exports = FailedAttempt;
