const mongoose = require('mongoose');

const APILogSchema = new mongoose.Schema({
  // Request identification
  requestId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // API Key information
  apiKey: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'APIKey',
    index: true
  },
  apiKeyIdentifier: {
    type: String,
    index: true
  },
  
  // User information
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  
  // Request details
  method: {
    type: String,
    required: true,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    index: true
  },
  path: {
    type: String,
    required: true,
    index: true
  },
  fullUrl: {
    type: String,
    required: true
  },
  query: {
    type: Map,
    of: String
  },
  headers: {
    type: Map,
    of: String
  },
  body: {
    type: mongoose.Schema.Types.Mixed
  },
  bodySize: {
    type: Number,
    default: 0
  },
  
  // Response details
  statusCode: {
    type: Number,
    index: true
  },
  responseBody: {
    type: mongoose.Schema.Types.Mixed
  },
  responseSize: {
    type: Number,
    default: 0
  },
  responseTime: {
    type: Number, // in milliseconds
    index: true
  },
  
  // Client information
  ipAddress: {
    type: String,
    index: true
  },
  userAgent: {
    type: String
  },
  referrer: {
    type: String
  },
  country: {
    type: String
  },
  city: {
    type: String
  },
  
  // Rate limiting
  rateLimitInfo: {
    limit: Number,
    remaining: Number,
    resetAt: Date
  },
  
  // Error information
  error: {
    message: String,
    stack: String,
    code: String
  },
  
  // Caching
  cacheHit: {
    type: Boolean,
    default: false
  },
  cacheKey: {
    type: String
  },
  
  // Performance metrics
  timing: {
    dnsLookup: Number,
    tcpConnection: Number,
    tlsHandshake: Number,
    firstByte: Number,
    download: Number
  },
  
  // Webhook information (if this was a webhook delivery)
  webhook: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Webhook'
  },
  webhookEvent: {
    type: String
  },
  
  // Metadata
  environment: {
    type: String,
    enum: ['development', 'staging', 'production'],
    default: 'production'
  },
  version: {
    type: String,
    default: 'v1'
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
APILogSchema.index({ apiKey: 1, createdAt: -1 });
APILogSchema.index({ user: 1, createdAt: -1 });
APILogSchema.index({ company: 1, createdAt: -1 });
APILogSchema.index({ method: 1, path: 1, createdAt: -1 });
APILogSchema.index({ statusCode: 1, createdAt: -1 });
APILogSchema.index({ createdAt: -1 });

// TTL index to auto-delete old logs (90 days)
APILogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

// Static method to log API request
APILogSchema.statics.logRequest = async function(data) {
  const crypto = require('crypto');
  const requestId = crypto.randomUUID();
  
  const log = new this({
    requestId,
    ...data
  });
  
  await log.save();
  return log;
};

// Static method to update log with response
APILogSchema.statics.logResponse = async function(requestId, responseData) {
  return this.findOneAndUpdate(
    { requestId },
    { $set: responseData },
    { new: true }
  );
};

// Static method to get usage statistics
APILogSchema.statics.getUsageStats = async function(apiKeyId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        apiKey: new mongoose.Types.ObjectId(apiKeyId),
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        avgResponseTime: { $avg: '$responseTime' },
        errorCount: {
          $sum: {
            $cond: [{ $gte: ['$statusCode', 400] }, 1, 0]
          }
        },
        uniqueEndpoints: { $addToSet: '$path' }
      }
    }
  ]);
};

// Static method to get endpoint popularity
APILogSchema.statics.getEndpointStats = async function(startDate, endDate, limit = 10) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: { method: '$method', path: '$path' },
        count: { $sum: 1 },
        avgResponseTime: { $avg: '$responseTime' },
        errorRate: {
          $avg: {
            $cond: [{ $gte: ['$statusCode', 400] }, 1, 0]
          }
        }
      }
    },
    { $sort: { count: -1 } },
    { $limit: limit }
  ]);
};

// Static method to get error summary
APILogSchema.statics.getErrorSummary = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        statusCode: { $gte: 400 }
      }
    },
    {
      $group: {
        _id: '$statusCode',
        count: { $sum: 1 },
        endpoints: { $addToSet: '$path' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

module.exports = mongoose.model('APILog', APILogSchema);
