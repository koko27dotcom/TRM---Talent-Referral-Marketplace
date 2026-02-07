const mongoose = require('mongoose');

const APIKeySchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    index: true
  },
  permissions: [{
    type: String,
    enum: [
      'jobs:read',
      'jobs:write',
      'referrals:read',
      'referrals:write',
      'companies:read',
      'companies:write',
      'users:read',
      'users:write',
      'webhooks:read',
      'webhooks:write',
      'admin:full'
    ]
  }],
  scopes: {
    type: [String],
    default: ['public']
  },
  rateLimit: {
    requestsPerMinute: {
      type: Number,
      default: 60
    },
    requestsPerHour: {
      type: Number,
      default: 1000
    },
    requestsPerDay: {
      type: Number,
      default: 10000
    }
  },
  usage: {
    totalRequests: {
      type: Number,
      default: 0
    },
    requestsThisMonth: {
      type: Number,
      default: 0
    },
    lastUsedAt: {
      type: Date
    }
  },
  ipWhitelist: [{
    type: String
  }],
  referrerWhitelist: [{
    type: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isRevoked: {
    type: Boolean,
    default: false
  },
  revokedAt: {
    type: Date
  },
  revokedReason: {
    type: String
  },
  expiresAt: {
    type: Date
  },
  lastRotatedAt: {
    type: Date,
    default: Date.now
  },
  environment: {
    type: String,
    enum: ['development', 'staging', 'production'],
    default: 'development'
  },
  metadata: {
    userAgent: String,
    createdFromIP: String,
    applicationName: String,
    applicationUrl: String
  }
}, {
  timestamps: true
});

// Indexes for common queries
APIKeySchema.index({ user: 1, isActive: 1 });
APIKeySchema.index({ company: 1, isActive: 1 });
APIKeySchema.index({ createdAt: -1 });
APIKeySchema.index({ expiresAt: 1 });

// Virtual for checking if key is expired
APIKeySchema.virtual('isExpired').get(function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// Method to check if key has permission
APIKeySchema.methods.hasPermission = function(permission) {
  if (this.permissions.includes('admin:full')) return true;
  return this.permissions.includes(permission);
};

// Method to check if key has any of the given permissions
APIKeySchema.methods.hasAnyPermission = function(permissions) {
  if (this.permissions.includes('admin:full')) return true;
  return permissions.some(p => this.permissions.includes(p));
};

// Method to increment usage
APIKeySchema.methods.incrementUsage = async function() {
  this.usage.totalRequests += 1;
  this.usage.requestsThisMonth += 1;
  this.usage.lastUsedAt = new Date();
  await this.save();
};

// Method to rotate key
APIKeySchema.methods.rotate = async function() {
  const crypto = require('crypto');
  this.key = `trm_live_${crypto.randomBytes(32).toString('hex')}`;
  this.lastRotatedAt = new Date();
  await this.save();
  return this.key;
};

// Method to revoke key
APIKeySchema.methods.revoke = async function(reason) {
  this.isRevoked = true;
  this.isActive = false;
  this.revokedAt = new Date();
  this.revokedReason = reason;
  await this.save();
};

// Static method to generate new key
APIKeySchema.statics.generateKey = function() {
  const crypto = require('crypto');
  return `trm_live_${crypto.randomBytes(32).toString('hex')}`;
};

// Static method to find by key (with caching consideration)
APIKeySchema.statics.findByKey = async function(key) {
  return this.findOne({ 
    key, 
    isActive: true, 
    isRevoked: false,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  });
};

module.exports = mongoose.model('APIKey', APIKeySchema);
