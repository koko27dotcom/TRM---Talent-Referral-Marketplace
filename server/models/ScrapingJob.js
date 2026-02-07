/**
 * ScrapingJob Model
 * Tracks scraping campaigns and their execution status
 * Manages job lifecycle from creation to completion
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Job statistics schema
const JobStatisticsSchema = new Schema({
  totalProcessed: {
    type: Number,
    default: 0,
  },
  successful: {
    type: Number,
    default: 0,
  },
  failed: {
    type: Number,
    default: 0,
  },
  skipped: {
    type: Number,
    default: 0,
  },
  duplicates: {
    type: Number,
    default: 0,
  },
  rateLimited: {
    type: Number,
    default: 0,
  },
  pagesScraped: {
    type: Number,
    default: 0,
  },
  avgResponseTime: {
    type: Number,
    default: 0,
  },
  dataQualityScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
}, { _id: false });

// Progress tracking schema
const ProgressSchema = new Schema({
  currentPage: {
    type: Number,
    default: 0,
  },
  totalPages: {
    type: Number,
    default: 0,
  },
  percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  estimatedTimeRemaining: {
    type: Number, // in seconds
    default: 0,
  },
  currentSource: String,
  lastActivity: Date,
}, { _id: false });

// Error tracking schema
const ErrorSummarySchema = new Schema({
  errorType: {
    type: String,
    required: true,
  },
  count: {
    type: Number,
    default: 1,
  },
  lastOccurred: {
    type: Date,
    default: Date.now,
  },
  sampleMessage: String,
}, { _id: true });

// Scraping Job Schema
const ScrapingJobSchema = new Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Job name is required'],
    trim: true,
    maxlength: [200, 'Job name cannot exceed 200 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
  },
  
  // Job Type and Priority
  type: {
    type: String,
    enum: ['full', 'incremental', 'targeted', 'repair', 'validation'],
    default: 'full',
    required: true,
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'critical'],
    default: 'normal',
  },
  
  // Status Management
  status: {
    type: String,
    enum: ['pending', 'queued', 'running', 'paused', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    index: true,
  },
  previousStatus: {
    type: String,
    enum: ['pending', 'queued', 'running', 'paused', 'completed', 'failed', 'cancelled'],
  },
  
  // Source Configuration
  sources: [{
    sourceId: {
      type: Schema.Types.ObjectId,
      ref: 'ScrapingSource',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'skipped'],
      default: 'pending',
    },
    priority: {
      type: Number,
      default: 0,
    },
    config: {
      type: Schema.Types.Mixed,
      default: {},
    },
    startedAt: Date,
    completedAt: Date,
    statistics: JobStatisticsSchema,
  }],
  
  // Scheduling
  schedule: {
    isScheduled: {
      type: Boolean,
      default: false,
    },
    cronExpression: String,
    timezone: {
      type: String,
      default: 'Asia/Yangon',
    },
    nextRunAt: Date,
    lastRunAt: Date,
    recurrence: {
      type: String,
      enum: ['once', 'hourly', 'daily', 'weekly', 'monthly'],
      default: 'once',
    },
  },
  
  // Configuration
  config: {
    maxPages: {
      type: Number,
      default: 0, // 0 means unlimited
    },
    maxResults: {
      type: Number,
      default: 0, // 0 means unlimited
    },
    timeout: {
      type: Number,
      default: 3600, // 1 hour in seconds
    },
    retryAttempts: {
      type: Number,
      default: 3,
    },
    retryDelay: {
      type: Number,
      default: 5000, // 5 seconds
    },
    concurrency: {
      type: Number,
      default: 5,
    },
    useProxy: {
      type: Boolean,
      default: true,
    },
    respectRobotsTxt: {
      type: Boolean,
      default: true,
    },
    delayBetweenRequests: {
      type: Number,
      default: 2000, // 2 seconds
    },
    userAgent: String,
    customHeaders: {
      type: Map,
      of: String,
    },
  },
  
  // Filters and Criteria
  filters: {
    keywords: [String],
    locations: [String],
    industries: [String],
    jobTitles: [String],
    experienceLevels: [String],
    minExperience: Number,
    maxExperience: Number,
    skills: [String],
    excludeCompanies: [String],
    dateRange: {
      from: Date,
      to: Date,
    },
  },
  
  // Statistics
  statistics: {
    type: JobStatisticsSchema,
    default: () => ({}),
  },
  
  // Progress Tracking
  progress: {
    type: ProgressSchema,
    default: () => ({}),
  },
  
  // Error Summary
  errors: [ErrorSummarySchema],
  
  // Timing
  startedAt: Date,
  completedAt: Date,
  pausedAt: Date,
  resumedAt: Date,
  cancelledAt: Date,
  estimatedDuration: Number, // in seconds
  actualDuration: Number, // in seconds
  
  // Queue Information
  queue: {
    jobId: String,
    queueName: {
      type: String,
      default: 'cv-scraping',
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
  },
  
  // User Information
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  startedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  cancelledBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  
  // Metadata
  tags: [String],
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
  },
  
  // Notifications
  notifications: {
    onStart: {
      type: Boolean,
      default: false,
    },
    onComplete: {
      type: Boolean,
      default: true,
    },
    onError: {
      type: Boolean,
      default: true,
    },
    emailRecipients: [String],
  },
  
  // Related Jobs
  parentJob: {
    type: Schema.Types.ObjectId,
    ref: 'ScrapingJob',
  },
  childJobs: [{
    type: Schema.Types.ObjectId,
    ref: 'ScrapingJob',
  }],
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for efficient querying
ScrapingJobSchema.index({ status: 1, createdAt: -1 });
ScrapingJobSchema.index({ type: 1, status: 1 });
ScrapingJobSchema.index({ 'schedule.nextRunAt': 1 });
ScrapingJobSchema.index({ createdBy: 1 });
ScrapingJobSchema.index({ tags: 1 });
ScrapingJobSchema.index({ 'sources.sourceId': 1 });
ScrapingJobSchema.index({ startedAt: -1 });

// Virtual for success rate
ScrapingJobSchema.virtual('successRate').get(function() {
  const total = this.statistics?.totalProcessed || 0;
  const successful = this.statistics?.successful || 0;
  return total > 0 ? Math.round((successful / total) * 100) : 0;
});

// Virtual for failure rate
ScrapingJobSchema.virtual('failureRate').get(function() {
  const total = this.statistics?.totalProcessed || 0;
  const failed = this.statistics?.failed || 0;
  return total > 0 ? Math.round((failed / total) * 100) : 0;
});

// Virtual for duration
ScrapingJobSchema.virtual('duration').get(function() {
  if (this.completedAt && this.startedAt) {
    return Math.round((this.completedAt - this.startedAt) / 1000);
  }
  if (this.startedAt) {
    return Math.round((Date.now() - this.startedAt) / 1000);
  }
  return 0;
});

// Method to pause job
ScrapingJobSchema.methods.pause = async function(userId) {
  if (this.status !== 'running') {
    throw new Error('Only running jobs can be paused');
  }
  this.previousStatus = this.status;
  this.status = 'paused';
  this.pausedAt = new Date();
  return this.save();
};

// Method to resume job
ScrapingJobSchema.methods.resume = async function(userId) {
  if (this.status !== 'paused') {
    throw new Error('Only paused jobs can be resumed');
  }
  this.status = this.previousStatus || 'running';
  this.previousStatus = undefined;
  this.resumedAt = new Date();
  return this.save();
};

// Method to cancel job
ScrapingJobSchema.methods.cancel = async function(userId) {
  if (['completed', 'failed', 'cancelled'].includes(this.status)) {
    throw new Error('Cannot cancel a completed, failed, or already cancelled job');
  }
  this.previousStatus = this.status;
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancelledBy = userId;
  return this.save();
};

// Method to update progress
ScrapingJobSchema.methods.updateProgress = async function(progressData) {
  this.progress = { ...this.progress, ...progressData };
  this.progress.lastActivity = new Date();
  return this.save();
};

// Method to add error
ScrapingJobSchema.methods.addError = async function(errorType, message) {
  const existingError = this.errors.find(e => e.errorType === errorType);
  if (existingError) {
    existingError.count += 1;
    existingError.lastOccurred = new Date();
  } else {
    this.errors.push({
      errorType,
      sampleMessage: message,
      lastOccurred: new Date(),
    });
  }
  return this.save();
};

// Static method to get active jobs
ScrapingJobSchema.statics.getActiveJobs = function() {
  return this.find({
    status: { $in: ['running', 'paused', 'queued'] },
  }).sort({ createdAt: -1 });
};

// Static method to get scheduled jobs
ScrapingJobSchema.statics.getScheduledJobs = function() {
  return this.find({
    'schedule.isScheduled': true,
    'schedule.nextRunAt': { $gte: new Date() },
  }).sort({ 'schedule.nextRunAt': 1 });
};

// Static method to get statistics
ScrapingJobSchema.statics.getStatistics = async function(dateRange = {}) {
  const matchStage = {};
  if (dateRange.from || dateRange.to) {
    matchStage.createdAt = {};
    if (dateRange.from) matchStage.createdAt.$gte = new Date(dateRange.from);
    if (dateRange.to) matchStage.createdAt.$lte = new Date(dateRange.to);
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalProcessed: { $sum: '$statistics.totalProcessed' },
        successful: { $sum: '$statistics.successful' },
        failed: { $sum: '$statistics.failed' },
      },
    },
  ]);
};

// Pre-save middleware to calculate estimated duration
ScrapingJobSchema.pre('save', function(next) {
  if (this.isModified('config.maxPages') || this.isModified('config.maxResults')) {
    // Rough estimation: 3 seconds per page, 2 seconds per result
    const pageTime = this.config.maxPages * 3;
    const resultTime = this.config.maxResults * 2;
    this.estimatedDuration = Math.max(pageTime, resultTime);
  }
  next();
});

const ScrapingJob = mongoose.model('ScrapingJob', ScrapingJobSchema);

module.exports = ScrapingJob;