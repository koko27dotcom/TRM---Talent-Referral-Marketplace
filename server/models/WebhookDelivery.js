const mongoose = require('mongoose');

const WebhookDeliverySchema = new mongoose.Schema({
  // Identification
  deliveryId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Relationships
  webhook: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Webhook',
    required: true,
    index: true
  },
  apiKey: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'APIKey',
    index: true
  },
  
  // Event details
  event: {
    type: String,
    required: true,
    index: true
  },
  eventId: {
    type: String,
    required: true,
    index: true
  },
  
  // Payload
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  payloadSize: {
    type: Number,
    default: 0
  },
  
  // Delivery attempts
  attempts: [{
    attemptNumber: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'success', 'failed'],
      required: true
    },
    startedAt: {
      type: Date,
      required: true
    },
    completedAt: {
      type: Date
    },
    duration: {
      type: Number // milliseconds
    },
    request: {
      method: String,
      url: String,
      headers: mongoose.Schema.Types.Mixed,
      body: mongoose.Schema.Types.Mixed
    },
    response: {
      statusCode: Number,
      headers: mongoose.Schema.Types.Mixed,
      body: mongoose.Schema.Types.Mixed,
      size: Number
    },
    error: {
      message: String,
      code: String,
      type: String
    },
    willRetry: {
      type: Boolean,
      default: false
    },
    nextRetryAt: {
      type: Date
    }
  }],
  
  // Current status
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'success', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  // Retry tracking
  currentAttempt: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 5
  },
  nextRetryAt: {
    type: Date,
    index: true
  },
  
  // Timing
  scheduledAt: {
    type: Date,
    required: true
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  
  // Final result
  result: {
    success: {
      type: Boolean
    },
    httpStatusCode: {
      type: Number
    },
    responseBody: {
      type: mongoose.Schema.Types.Mixed
    },
    errorMessage: {
      type: String
    }
  },
  
  // Metadata
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  signature: {
    type: String
  },
  signatureVersion: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes
WebhookDeliverySchema.index({ webhook: 1, createdAt: -1 });
WebhookDeliverySchema.index({ event: 1, status: 1 });
WebhookDeliverySchema.index({ status: 1, nextRetryAt: 1 });
WebhookDeliverySchema.index({ scheduledAt: 1 });
WebhookDeliverySchema.index({ 'attempts.startedAt': -1 });

// TTL index for old deliveries (30 days)
WebhookDeliverySchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

// Virtual for total duration
WebhookDeliverySchema.virtual('totalDuration').get(function() {
  if (!this.startedAt || !this.completedAt) return null;
  return this.completedAt - this.startedAt;
});

// Virtual for latest attempt
WebhookDeliverySchema.virtual('latestAttempt').get(function() {
  if (!this.attempts || this.attempts.length === 0) return null;
  return this.attempts[this.attempts.length - 1];
});

// Method to add attempt
WebhookDeliverySchema.methods.addAttempt = async function(attemptData) {
  this.currentAttempt += 1;
  this.attempts.push({
    attemptNumber: this.currentAttempt,
    ...attemptData
  });
  await this.save();
};

// Method to schedule retry
WebhookDeliverySchema.methods.scheduleRetry = async function(delayMs) {
  const nextRetryAt = new Date(Date.now() + delayMs);
  this.nextRetryAt = nextRetryAt;
  this.status = 'pending';
  
  // Update last attempt
  if (this.attempts.length > 0) {
    const lastAttempt = this.attempts[this.attempts.length - 1];
    lastAttempt.willRetry = true;
    lastAttempt.nextRetryAt = nextRetryAt;
  }
  
  await this.save();
};

// Method to mark as success
WebhookDeliverySchema.methods.markSuccess = async function(responseData) {
  this.status = 'success';
  this.completedAt = new Date();
  this.result = {
    success: true,
    httpStatusCode: responseData.statusCode,
    responseBody: responseData.body
  };
  
  // Update last attempt
  if (this.attempts.length > 0) {
    const lastAttempt = this.attempts[this.attempts.length - 1];
    lastAttempt.status = 'success';
    lastAttempt.completedAt = new Date();
    lastAttempt.duration = Date.now() - lastAttempt.startedAt.getTime();
    lastAttempt.response = responseData;
  }
  
  await this.save();
};

// Method to mark as failed
WebhookDeliverySchema.methods.markFailed = async function(errorData) {
  this.status = 'failed';
  this.completedAt = new Date();
  this.result = {
    success: false,
    errorMessage: errorData.message,
    httpStatusCode: errorData.statusCode
  };
  
  // Update last attempt
  if (this.attempts.length > 0) {
    const lastAttempt = this.attempts[this.attempts.length - 1];
    lastAttempt.status = 'failed';
    lastAttempt.completedAt = new Date();
    lastAttempt.duration = Date.now() - lastAttempt.startedAt.getTime();
    lastAttempt.error = errorData;
  }
  
  await this.save();
};

// Static method to create delivery
WebhookDeliverySchema.statics.createDelivery = async function(webhook, event, payload) {
  const crypto = require('crypto');
  const deliveryId = `del_${crypto.randomBytes(16).toString('hex')}`;
  const eventId = `evt_${crypto.randomBytes(16).toString('hex')}`;
  
  const delivery = new this({
    deliveryId,
    webhook: webhook._id,
    apiKey: webhook.apiKey,
    event,
    eventId,
    payload,
    payloadSize: JSON.stringify(payload).length,
    maxAttempts: webhook.retryConfig.maxRetries,
    scheduledAt: new Date()
  });
  
  await delivery.save();
  return delivery;
};

// Static method to get pending deliveries
WebhookDeliverySchema.statics.getPendingDeliveries = async function(limit = 100) {
  return this.find({
    status: { $in: ['pending', 'failed'] },
    nextRetryAt: { $lte: new Date() },
    currentAttempt: { $lt: '$maxAttempts' }
  })
  .sort({ scheduledAt: 1 })
  .limit(limit)
  .populate('webhook');
};

// Static method to get delivery stats
WebhookDeliverySchema.statics.getStats = async function(webhookId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        webhook: new mongoose.Types.ObjectId(webhookId),
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgAttempts: { $avg: '$currentAttempt' },
        avgDuration: {
          $avg: {
            $subtract: ['$completedAt', '$startedAt']
          }
        }
      }
    }
  ]);
};

// Static method to get recent failures
WebhookDeliverySchema.statics.getRecentFailures = async function(webhookId, hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  return this.find({
    webhook: webhookId,
    status: 'failed',
    createdAt: { $gte: since }
  })
  .sort({ createdAt: -1 })
  .limit(50);
};

module.exports = mongoose.model('WebhookDelivery', WebhookDeliverySchema);
