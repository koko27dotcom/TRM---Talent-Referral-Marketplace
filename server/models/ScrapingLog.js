/**
 * ScrapingLog Model
 * Detailed logs of each scraping operation for debugging and auditing
 * Supports high-volume logging with efficient indexing
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Request details schema
const RequestDetailsSchema = new Schema({
  url: {
    type: String,
    required: true,
  },
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'],
    default: 'GET',
  },
  headers: {
    type: Map,
    of: String,
  },
  body: String,
  query: {
    type: Map,
    of: Schema.Types.Mixed,
  },
}, { _id: false });

// Response details schema
const ResponseDetailsSchema = new Schema({
  statusCode: Number,
  statusText: String,
  headers: {
    type: Map,
    of: String,
  },
  body: String,
  contentType: String,
  contentLength: Number,
}, { _id: false });

// Error details schema
const ErrorDetailsSchema = new Schema({
  message: {
    type: String,
    required: true,
  },
  stack: String,
  code: String,
  type: String,
  isRetryable: {
    type: Boolean,
    default: false,
  },
  suggestedAction: String,
}, { _id: false });

// Data extraction schema
const DataExtractionSchema = new Schema({
  field: {
    type: String,
    required: true,
  },
  selector: String,
  rawValue: String,
  extractedValue: Schema.Types.Mixed,
  confidence: {
    type: Number,
    min: 0,
    max: 1,
  },
  validationStatus: {
    type: String,
    enum: ['valid', 'invalid', 'uncertain', 'empty'],
    default: 'valid',
  },
  validationErrors: [String],
}, { _id: true });

// Performance metrics schema
const PerformanceMetricsSchema = new Schema({
  totalDuration: Number, // milliseconds
  dnsLookupTime: Number,
  connectionTime: Number,
  tlsHandshakeTime: Number,
  timeToFirstByte: Number,
  downloadTime: Number,
  parsingTime: Number,
  extractionTime: Number,
  memoryUsage: {
    before: Number,
    after: Number,
    peak: Number,
  },
}, { _id: false });

// Scraping Log Schema
const ScrapingLogSchema = new Schema({
  // Reference Information
  jobId: {
    type: Schema.Types.ObjectId,
    ref: 'ScrapingJob',
    required: true,
    index: true,
  },
  sourceId: {
    type: Schema.Types.ObjectId,
    ref: 'ScrapingSource',
    required: true,
    index: true,
  },
  queueJobId: String, // Bull queue job ID
  
  // Log Type and Level
  type: {
    type: String,
    enum: [
      'request',
      'response',
      'error',
      'warning',
      'info',
      'retry',
      'success',
      'skip',
      'duplicate',
      'validation',
      'parse',
      'extract',
    ],
    required: true,
    index: true,
  },
  level: {
    type: String,
    enum: ['debug', 'info', 'warn', 'error', 'fatal'],
    default: 'info',
    index: true,
  },
  
  // Operation Details
  operation: {
    type: String,
    enum: [
      'fetch_page',
      'parse_page',
      'extract_profile',
      'extract_list',
      'navigate',
      'login',
      'search',
      'filter',
      'transform',
      'validate',
      'save',
      'retry',
      'rate_limit',
      'proxy_switch',
    ],
    required: true,
    index: true,
  },
  
  // Target Information
  target: {
    url: String,
    externalId: String, // ID from source website
    profileName: String,
    pageNumber: Number,
    totalPages: Number,
  },
  
  // Request/Response Details
  request: RequestDetailsSchema,
  response: ResponseDetailsSchema,
  
  // Error Details
  error: ErrorDetailsSchema,
  
  // Data Extraction
  extraction: {
    success: Boolean,
    fields: [DataExtractionSchema],
    rawData: Schema.Types.Mixed,
    processedData: Schema.Types.Mixed,
  },
  
  // Validation Results
  validation: {
    passed: Boolean,
    score: {
      type: Number,
      min: 0,
      max: 100,
    },
    checks: [{
      name: String,
      passed: Boolean,
      message: String,
      severity: {
        type: String,
        enum: ['info', 'warning', 'error', 'critical'],
      },
    }],
  },
  
  // Performance Metrics
  performance: PerformanceMetricsSchema,
  
  // Retry Information
  retry: {
    attempt: {
      type: Number,
      default: 0,
    },
    maxAttempts: Number,
    willRetry: Boolean,
    nextRetryAt: Date,
    previousErrors: [ErrorDetailsSchema],
  },
  
  // Context Information
  context: {
    proxy: {
      host: String,
      port: Number,
      protocol: String,
    },
    userAgent: String,
    ipAddress: String,
    sessionId: String,
    workerId: String,
  },
  
  // Metadata
  message: {
    type: String,
    required: true,
  },
  details: {
    type: Map,
    of: Schema.Types.Mixed,
  },
  tags: [String],
  
  // Timestamps
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 2592000, // Auto-delete after 30 days
  },
  
}, {
  timestamps: { createdAt: true, updatedAt: false },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Compound indexes for efficient querying
ScrapingLogSchema.index({ jobId: 1, timestamp: -1 });
ScrapingLogSchema.index({ sourceId: 1, timestamp: -1 });
ScrapingLogSchema.index({ type: 1, level: 1, timestamp: -1 });
ScrapingLogSchema.index({ operation: 1, timestamp: -1 });
ScrapingLogSchema.index({ 'target.url': 1 });
ScrapingLogSchema.index({ 'target.externalId': 1 });
ScrapingLogSchema.index({ tags: 1 });
ScrapingLogSchema.index({ level: 1, timestamp: -1 });

// TTL index for automatic cleanup (30 days)
ScrapingLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

// Static method to log a request
ScrapingLogSchema.statics.logRequest = async function(data) {
  return this.create({
    ...data,
    type: 'request',
    level: 'debug',
    timestamp: new Date(),
  });
};

// Static method to log a response
ScrapingLogSchema.statics.logResponse = async function(data) {
  return this.create({
    ...data,
    type: 'response',
    level: 'debug',
    timestamp: new Date(),
  });
};

// Static method to log an error
ScrapingLogSchema.statics.logError = async function(data) {
  return this.create({
    ...data,
    type: 'error',
    level: 'error',
    timestamp: new Date(),
  });
};

// Static method to log extraction
ScrapingLogSchema.statics.logExtraction = async function(data) {
  return this.create({
    ...data,
    type: 'extract',
    level: 'info',
    timestamp: new Date(),
  });
};

// Static method to get logs by job
ScrapingLogSchema.statics.getByJob = function(jobId, options = {}) {
  const query = { jobId };
  
  if (options.type) query.type = options.type;
  if (options.level) query.level = options.level;
  if (options.operation) query.operation = options.operation;
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(options.limit || 100)
    .skip(options.skip || 0);
};

// Static method to get error summary
ScrapingLogSchema.statics.getErrorSummary = async function(jobId) {
  return this.aggregate([
    { $match: { jobId: new mongoose.Types.ObjectId(jobId), level: { $in: ['error', 'fatal'] } } },
    {
      $group: {
        _id: '$error.type',
        count: { $sum: 1 },
        lastOccurred: { $max: '$timestamp' },
        samples: { $push: { message: '$error.message', url: '$target.url' } },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

// Static method to get performance stats
ScrapingLogSchema.statics.getPerformanceStats = async function(jobId) {
  return this.aggregate([
    { $match: { jobId: new mongoose.Types.ObjectId(jobId), 'performance.totalDuration': { $exists: true } } },
    {
      $group: {
        _id: '$operation',
        avgDuration: { $avg: '$performance.totalDuration' },
        minDuration: { $min: '$performance.totalDuration' },
        maxDuration: { $max: '$performance.totalDuration' },
        count: { $sum: 1 },
      },
    },
  ]);
};

// Static method to search logs
ScrapingLogSchema.statics.search = async function(query, options = {}) {
  const searchQuery = {};
  
  if (query.jobId) searchQuery.jobId = query.jobId;
  if (query.sourceId) searchQuery.sourceId = query.sourceId;
  if (query.type) searchQuery.type = query.type;
  if (query.level) searchQuery.level = query.level;
  if (query.operation) searchQuery.operation = query.operation;
  if (query.tags) searchQuery.tags = { $in: query.tags };
  
  if (query.searchText) {
    searchQuery.$or = [
      { message: { $regex: query.searchText, $options: 'i' } },
      { 'error.message': { $regex: query.searchText, $options: 'i' } },
      { 'target.profileName': { $regex: query.searchText, $options: 'i' } },
    ];
  }
  
  if (query.dateRange) {
    searchQuery.timestamp = {};
    if (query.dateRange.from) searchQuery.timestamp.$gte = new Date(query.dateRange.from);
    if (query.dateRange.to) searchQuery.timestamp.$lte = new Date(query.dateRange.to);
  }
  
  return this.find(searchQuery)
    .sort({ timestamp: -1 })
    .limit(options.limit || 100)
    .skip(options.skip || 0);
};

// Static method to get log statistics
ScrapingLogSchema.statics.getStatistics = async function(dateRange = {}) {
  const matchStage = {};
  if (dateRange.from || dateRange.to) {
    matchStage.timestamp = {};
    if (dateRange.from) matchStage.timestamp.$gte = new Date(dateRange.from);
    if (dateRange.to) matchStage.timestamp.$lte = new Date(dateRange.to);
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          type: '$type',
          level: '$level',
        },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: '$_id.type',
        levels: {
          $push: {
            level: '$_id.level',
            count: '$count',
          },
        },
        total: { $sum: '$count' },
      },
    },
  ]);
};

// Static method to cleanup old logs
ScrapingLogSchema.statics.cleanup = async function(olderThanDays = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  
  const result = await this.deleteMany({
    timestamp: { $lt: cutoffDate },
    level: { $in: ['debug', 'info'] }, // Keep errors and warnings longer
  });
  
  return result.deletedCount;
};

const ScrapingLog = mongoose.model('ScrapingLog', ScrapingLogSchema);

module.exports = ScrapingLog;