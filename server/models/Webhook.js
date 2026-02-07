const mongoose = require('mongoose');

const WebhookSchema = new mongoose.Schema({
  // Identification
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  
  // Ownership
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
  apiKey: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'APIKey',
    index: true
  },
  
  // Endpoint configuration
  url: {
    type: String,
    required: true,
    trim: true
  },
  method: {
    type: String,
    enum: ['POST', 'PUT', 'PATCH'],
    default: 'POST'
  },
  headers: {
    type: Map,
    of: String,
    default: {}
  },
  
  // Event subscriptions
  events: [{
    type: String,
    enum: [
      // Referral events
      'referral.created',
      'referral.updated',
      'referral.status_changed',
      'referral.submitted',
      'referral.screened',
      'referral.interview_scheduled',
      'referral.interview_completed',
      'referral.offered',
      'referral.hired',
      'referral.rejected',
      
      // Job events
      'job.published',
      'job.updated',
      'job.closed',
      'job.expired',
      'job.featured',
      
      // Company events
      'company.updated',
      'company.verified',
      
      // User events
      'user.verified',
      'user.profile_updated',
      
      // Payout events
      'payout.requested',
      'payout.approved',
      'payout.completed',
      'payout.failed',
      
      // Application events
      'application.received',
      'application.status_changed',
      
      // Network events
      'network.member_joined',
      'network.referral_made',
      
      // System events
      'system.test',
      'system.maintenance',
      'system.rate_limit_warning'
    ]
  }],
  
  // Event filtering
  eventFilters: {
    jobs: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    }],
    companies: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company'
    }],
    statuses: [String]
  },
  
  // Security
  secret: {
    type: String,
    required: true
  },
  signatureHeader: {
    type: String,
    default: 'X-TRM-Signature'
  },
  signatureVersion: {
    type: String,
    default: 'v1'
  },
  
  // SSL/TLS verification
  verifySSL: {
    type: Boolean,
    default: true
  },
  
  // Retry configuration
  retryConfig: {
    maxRetries: {
      type: Number,
      default: 5
    },
    initialDelay: {
      type: Number,
      default: 1000 // milliseconds
    },
    maxDelay: {
      type: Number,
      default: 3600000 // 1 hour
    },
    backoffMultiplier: {
      type: Number,
      default: 2
    },
    retryOnTimeout: {
      type: Boolean,
      default: true
    },
    retryOnStatusCodes: [{
      type: Number,
      default: [408, 409, 429, 500, 502, 503, 504]
    }]
  },
  
  // Timeout configuration
  timeout: {
    type: Number,
    default: 30000 // 30 seconds
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'paused', 'disabled', 'error'],
    default: 'active',
    index: true
  },
  
  // Health tracking
  health: {
    lastDeliveryAt: {
      type: Date
    },
    lastSuccessAt: {
      type: Date
    },
    lastFailureAt: {
      type: Date
    },
    consecutiveFailures: {
      type: Number,
      default: 0
    },
    consecutiveSuccesses: {
      type: Number,
      default: 0
    },
    totalDeliveries: {
      type: Number,
      default: 0
    },
    successfulDeliveries: {
      type: Number,
      default: 0
    },
    failedDeliveries: {
      type: Number,
      default: 0
    },
    averageResponseTime: {
      type: Number,
      default: 0
    }
  },
  
  // Error tracking
  lastError: {
    message: String,
    code: String,
    statusCode: Number,
    occurredAt: Date
  },
  
  // Alert configuration
  alerts: {
    enabled: {
      type: Boolean,
      default: true
    },
    onFailure: {
      type: Boolean,
      default: true
    },
    onDisabled: {
      type: Boolean,
      default: true
    },
    failureThreshold: {
      type: Number,
      default: 5
    },
    email: String
  },
  
  // Metadata
  environment: {
    type: String,
    enum: ['development', 'staging', 'production'],
    default: 'production'
  },
  ipAddress: {
    type: String
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes
WebhookSchema.index({ user: 1, status: 1 });
WebhookSchema.index({ company: 1, status: 1 });
WebhookSchema.index({ events: 1, status: 1 });
WebhookSchema.index({ 'health.lastFailureAt': -1 });
WebhookSchema.index({ createdAt: -1 });

// Virtual for success rate
WebhookSchema.virtual('successRate').get(function() {
  if (this.health.totalDeliveries === 0) return 100;
  return Math.round((this.health.successfulDeliveries / this.health.totalDeliveries) * 100);
});

// Method to check if webhook should be disabled
WebhookSchema.methods.checkHealth = function() {
  if (this.health.consecutiveFailures >= this.retryConfig.maxRetries) {
    this.status = 'disabled';
    return false;
  }
  return true;
};

// Method to record successful delivery
WebhookSchema.methods.recordSuccess = async function(responseTime) {
  this.health.lastDeliveryAt = new Date();
  this.health.lastSuccessAt = new Date();
  this.health.consecutiveFailures = 0;
  this.health.consecutiveSuccesses += 1;
  this.health.totalDeliveries += 1;
  this.health.successfulDeliveries += 1;
  
  // Update average response time
  const total = this.health.averageResponseTime * (this.health.totalDeliveries - 1);
  this.health.averageResponseTime = (total + responseTime) / this.health.totalDeliveries;
  
  if (this.status === 'error') {
    this.status = 'active';
  }
  
  await this.save();
};

// Method to record failed delivery
WebhookSchema.methods.recordFailure = async function(error, statusCode) {
  this.health.lastDeliveryAt = new Date();
  this.health.lastFailureAt = new Date();
  this.health.consecutiveFailures += 1;
  this.health.consecutiveSuccesses = 0;
  this.health.totalDeliveries += 1;
  this.health.failedDeliveries += 1;
  
  this.lastError = {
    message: error.message,
    code: error.code,
    statusCode: statusCode,
    occurredAt: new Date()
  };
  
  // Check if should disable
  if (this.health.consecutiveFailures >= this.alerts.failureThreshold) {
    this.status = 'error';
  }
  
  await this.save();
};

// Method to generate signature
WebhookSchema.methods.generateSignature = function(payload) {
  const crypto = require('crypto');
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;
  const signature = crypto
    .createHmac('sha256', this.secret)
    .update(signedPayload)
    .digest('hex');
  
  return {
    timestamp,
    signature: `${this.signatureVersion}=${signature}`
  };
};

// Method to verify signature
WebhookSchema.methods.verifySignature = function(payload, signature, timestamp) {
  const crypto = require('crypto');
  const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;
  const expectedSignature = crypto
    .createHmac('sha256', this.secret)
    .update(signedPayload)
    .digest('hex');
  
  const providedSig = signature.replace(`${this.signatureVersion}=`, '');
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(providedSig, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (e) {
    return false;
  }
};

// Static method to generate secret
WebhookSchema.statics.generateSecret = function() {
  const crypto = require('crypto');
  return `whsec_${crypto.randomBytes(32).toString('hex')}`;
};

// Static method to find active webhooks for event
WebhookSchema.statics.findForEvent = async function(eventName, filters = {}) {
  const query = {
    events: { $in: [eventName, '*'] },
    status: 'active',
    ...filters
  };
  
  return this.find(query);
};

module.exports = mongoose.model('Webhook', WebhookSchema);
