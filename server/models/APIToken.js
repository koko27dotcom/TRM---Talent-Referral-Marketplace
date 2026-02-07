/**
 * APIToken Model
 * Manages API access tokens for partners
 * Handles rate limiting, usage tracking, and token lifecycle
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Usage record schema for detailed tracking (embedded)
const UsageRecordSchema = new Schema({
  timestamp: {
    type: Date,
    default: Date.now,
  },
  endpoint: {
    type: String,
    required: true,
  },
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    required: true,
  },
  statusCode: {
    type: Number,
  },
  responseTime: {
    type: Number, // in milliseconds
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  requestSize: {
    type: Number, // in bytes
  },
  responseSize: {
    type: Number, // in bytes
  },
}, { _id: true });

// Rate limit window schema (embedded)
const RateLimitWindowSchema = new Schema({
  window: {
    type: String,
    enum: ['minute', 'hour', 'day', 'month'],
    required: true,
  },
  limit: {
    type: Number,
    required: true,
  },
  used: {
    type: Number,
    default: 0,
  },
  resetAt: {
    type: Date,
    required: true,
  },
}, { _id: true });

// Main APIToken schema
const APITokenSchema = new Schema({
  tokenId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  partnerId: {
    type: Schema.Types.ObjectId,
    ref: 'Partner',
    required: true,
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  // Token details
  name: {
    type: String,
    required: [true, 'Token name is required'],
    trim: true,
    maxlength: [100, 'Token name cannot exceed 100 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  // Token hashes (for verification)
  tokenHash: {
    type: String,
    required: true,
    select: false, // Don't include in queries by default
  },
  tokenPrefix: {
    type: String,
    required: true,
  },
  // Scopes/permissions
  scopes: [{
    type: String,
    enum: [
      'read',
      'write',
      'delete',
      'admin',
      'jobs:read',
      'jobs:write',
      'referrals:read',
      'referrals:write',
      'companies:read',
      'companies:write',
      'users:read',
      'users:write',
      'analytics:read',
      'billing:read',
      'billing:write',
      'webhooks:read',
      'webhooks:write',
    ],
  }],
  // Rate limiting
  rateLimit: {
    requestsPerMinute: {
      type: Number,
      default: 60,
      min: 1,
      max: 10000,
    },
    requestsPerHour: {
      type: Number,
      default: 1000,
      min: 1,
      max: 100000,
    },
    requestsPerDay: {
      type: Number,
      default: 10000,
      min: 1,
      max: 1000000,
    },
    requestsPerMonth: {
      type: Number,
      default: 100000,
      min: 1,
      max: 10000000,
    },
  },
  rateLimitWindows: [RateLimitWindowSchema],
  // Usage tracking
  usageCount: {
    total: {
      type: Number,
      default: 0,
    },
    last24Hours: {
      type: Number,
      default: 0,
    },
    last7Days: {
      type: Number,
      default: 0,
    },
    last30Days: {
      type: Number,
      default: 0,
    },
  },
  usageHistory: [UsageRecordSchema],
  // Track last usage
  lastUsedAt: {
    type: Date,
  },
  lastUsedEndpoint: {
    type: String,
  },
  lastUsedIp: {
    type: String,
  },
  // Expiration
  expiresAt: {
    type: Date,
  },
  // Status
  status: {
    type: String,
    enum: ['active', 'suspended', 'expired', 'revoked'],
    default: 'active',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Revocation
  revokedAt: {
    type: Date,
  },
  revokedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  revokeReason: {
    type: String,
    trim: true,
  },
  // IP restrictions
  ipWhitelist: [{
    type: String,
  }],
  ipBlacklist: [{
    type: String,
  }],
  // Environment
  environment: {
    type: String,
    enum: ['production', 'sandbox', 'development'],
    default: 'production',
  },
  // Webhook URL (if applicable)
  webhookUrl: {
    type: String,
    trim: true,
  },
  webhookSecret: {
    type: String,
    select: false,
  },
  webhookEvents: [{
    type: String,
  }],
  // Metadata
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: { createdAt: true, updatedAt: true },
});

// Indexes
APITokenSchema.index({ partnerId: 1, status: 1 });
APITokenSchema.index({ tokenHash: 1 }, { select: false });
APITokenSchema.index({ 'usageCount.total': -1 });
APITokenSchema.index({ lastUsedAt: -1 });
APITokenSchema.index({ expiresAt: 1 });

// Virtual for days until expiry
APITokenSchema.virtual('daysUntilExpiry').get(function() {
  if (!this.expiresAt) return null;
  const diff = this.expiresAt.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Virtual for is expired
APITokenSchema.virtual('isExpired').get(function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// Method to record usage
APITokenSchema.methods.recordUsage = async function(usageData) {
  // Add to usage history (keep only last 1000 records)
  this.usageHistory.push(usageData);
  if (this.usageHistory.length > 1000) {
    this.usageHistory = this.usageHistory.slice(-1000);
  }
  
  // Update counts
  this.usageCount.total += 1;
  this.usageCount.last24Hours += 1;
  this.usageCount.last7Days += 1;
  this.usageCount.last30Days += 1;
  
  // Update last used
  this.lastUsedAt = new Date();
  this.lastUsedEndpoint = usageData.endpoint;
  this.lastUsedIp = usageData.ipAddress;
  
  return this.save();
};

// Method to check rate limit
APITokenSchema.methods.checkRateLimit = function() {
  const now = new Date();
  const windows = ['minute', 'hour', 'day', 'month'];
  const limits = {
    minute: this.rateLimit.requestsPerMinute,
    hour: this.rateLimit.requestsPerHour,
    day: this.rateLimit.requestsPerDay,
    month: this.rateLimit.requestsPerMonth,
  };
  
  const results = {
    allowed: true,
    limits: {},
  };
  
  for (const window of windows) {
    const windowData = this.rateLimitWindows.find(w => w.window === window);
    const limit = limits[window];
    
    if (windowData && windowData.resetAt > now) {
      // Window is still active
      if (windowData.used >= limit) {
        results.allowed = false;
        results.limits[window] = {
          limit,
          used: windowData.used,
          remaining: 0,
          resetAt: windowData.resetAt,
        };
      } else {
        results.limits[window] = {
          limit,
          used: windowData.used,
          remaining: limit - windowData.used,
          resetAt: windowData.resetAt,
        };
      }
    } else {
      // Window needs reset
      const resetAt = new Date(now);
      switch (window) {
        case 'minute':
          resetAt.setMinutes(resetAt.getMinutes() + 1);
          break;
        case 'hour':
          resetAt.setHours(resetAt.getHours() + 1);
          break;
        case 'day':
          resetAt.setDate(resetAt.getDate() + 1);
          break;
        case 'month':
          resetAt.setMonth(resetAt.getMonth() + 1);
          break;
      }
      
      results.limits[window] = {
        limit,
        used: 0,
        remaining: limit,
        resetAt,
      };
    }
  }
  
  return results;
};

// Method to increment rate limit usage
APITokenSchema.methods.incrementRateLimit = async function() {
  const now = new Date();
  const windows = ['minute', 'hour', 'day', 'month'];
  
  for (const window of windows) {
    let windowData = this.rateLimitWindows.find(w => w.window === window);
    
    if (!windowData || windowData.resetAt <= now) {
      // Create or reset window
      const resetAt = new Date(now);
      switch (window) {
        case 'minute':
          resetAt.setMinutes(resetAt.getMinutes() + 1);
          break;
        case 'hour':
          resetAt.setHours(resetAt.getHours() + 1);
          break;
        case 'day':
          resetAt.setDate(resetAt.getDate() + 1);
          break;
        case 'month':
          resetAt.setMonth(resetAt.getMonth() + 1);
          break;
      }
      
      if (windowData) {
        windowData.used = 1;
        windowData.resetAt = resetAt;
      } else {
        this.rateLimitWindows.push({
          window,
          limit: this.rateLimit[`requestsPer${window.charAt(0).toUpperCase() + window.slice(1)}`],
          used: 1,
          resetAt,
        });
      }
    } else {
      windowData.used += 1;
    }
  }
  
  return this.save();
};

// Method to revoke token
APITokenSchema.methods.revoke = async function(userId, reason) {
  this.status = 'revoked';
  this.isActive = false;
  this.revokedAt = new Date();
  this.revokedBy = userId;
  this.revokeReason = reason;
  
  return this.save();
};

// Method to check if IP is allowed
APITokenSchema.methods.isIpAllowed = function(ipAddress) {
  if (this.ipBlacklist.includes(ipAddress)) {
    return false;
  }
  
  if (this.ipWhitelist.length > 0 && !this.ipWhitelist.includes(ipAddress)) {
    return false;
  }
  
  return true;
};

// Method to validate token
APITokenSchema.methods.validateToken = function() {
  if (this.status !== 'active') {
    return { valid: false, reason: `Token is ${this.status}` };
  }
  
  if (!this.isActive) {
    return { valid: false, reason: 'Token is inactive' };
  }
  
  if (this.expiresAt && new Date() > this.expiresAt) {
    this.status = 'expired';
    return { valid: false, reason: 'Token has expired' };
  }
  
  return { valid: true };
};

// Static method to find by token hash
APITokenSchema.statics.findByTokenHash = function(hash) {
  return this.findOne({ tokenHash: hash }).select('+tokenHash');
};

// Static method to get partner tokens
APITokenSchema.statics.getPartnerTokens = function(partnerId, filters = {}) {
  return this.find({ partnerId, ...filters })
    .sort({ createdAt: -1 });
};

// Static method to get usage stats
APITokenSchema.statics.getUsageStats = async function(partnerId, dateRange = {}) {
  const matchStage = { partnerId: new mongoose.Types.ObjectId(partnerId) };
  
  if (dateRange.startDate || dateRange.endDate) {
    matchStage.createdAt = {};
    if (dateRange.startDate) matchStage.createdAt.$gte = new Date(dateRange.startDate);
    if (dateRange.endDate) matchStage.createdAt.$lte = new Date(dateRange.endDate);
  }
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalTokens: { $sum: 1 },
        activeTokens: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
        },
        totalUsage: { $sum: '$usageCount.total' },
        avgUsagePerToken: { $avg: '$usageCount.total' },
      },
    },
  ]);
  
  return stats[0] || {
    totalTokens: 0,
    activeTokens: 0,
    totalUsage: 0,
    avgUsagePerToken: 0,
  };
};

// Pre-save middleware to check expiration
APITokenSchema.pre('save', function(next) {
  if (this.expiresAt && new Date() > this.expiresAt && this.status === 'active') {
    this.status = 'expired';
  }
  next();
});

const APIToken = mongoose.model('APIToken', APITokenSchema);

module.exports = APIToken;
