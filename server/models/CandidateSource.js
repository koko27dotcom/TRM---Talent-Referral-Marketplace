/**
 * CandidateSource Model
 * Tracks sourcing campaigns and scraping configurations
 * Manages rate limiting, proxy settings, and scraping parameters
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Proxy configuration schema
const ProxyConfigSchema = new Schema({
  host: {
    type: String,
    required: true,
  },
  port: {
    type: Number,
    required: true,
  },
  protocol: {
    type: String,
    enum: ['http', 'https', 'socks4', 'socks5'],
    default: 'http',
  },
  username: String,
  password: String,
  isActive: {
    type: Boolean,
    default: true,
  },
  lastUsed: Date,
  successCount: {
    type: Number,
    default: 0,
  },
  failureCount: {
    type: Number,
    default: 0,
  },
  averageResponseTime: Number,
}, { _id: true });

// Rate limit configuration schema
const RateLimitConfigSchema = new Schema({
  maxRequestsPerMinute: {
    type: Number,
    default: 10,
  },
  maxRequestsPerHour: {
    type: Number,
    default: 100,
  },
  maxRequestsPerDay: {
    type: Number,
    default: 500,
  },
  delayBetweenRequests: {
    type: Number,
    default: 6000, // 6 seconds
  },
  randomizeDelay: {
    type: Boolean,
    default: true,
  },
  delayVariance: {
    type: Number,
    default: 2000, // +/- 2 seconds
  },
}, { _id: false });

// Scraping configuration schema
const ScrapingConfigSchema = new Schema({
  // Search parameters
  searchKeywords: [String],
  locations: [String],
  industries: [String],
  jobTitles: [String],
  experienceLevels: [String],
  
  // Filter parameters
  minExperience: Number,
  maxExperience: Number,
  skills: [String],
  excludeCompanies: [String],
  
  // Pagination
  maxPages: {
    type: Number,
    default: 10,
  },
  resultsPerPage: {
    type: Number,
    default: 25,
  },
  
  // Advanced options
  includePrivateProfiles: {
    type: Boolean,
    default: false,
  },
  onlyOpenToWork: {
    type: Boolean,
    default: false,
  },
  
  // Selectors (for custom scraping)
  customSelectors: {
    profileCard: String,
    name: String,
    title: String,
    company: String,
    location: String,
    skills: String,
    profileUrl: String,
  },
}, { _id: false });

// Run history schema
const RunHistorySchema = new Schema({
  startedAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: Date,
  status: {
    type: String,
    enum: ['running', 'completed', 'failed', 'stopped'],
    default: 'running',
  },
  candidatesFound: {
    type: Number,
    default: 0,
  },
  candidatesAdded: {
    type: Number,
    default: 0,
  },
  duplicatesSkipped: {
    type: Number,
    default: 0,
  },
  errors: [{
    message: String,
    timestamp: Date,
    url: String,
  }],
  pagesScraped: Number,
  averageTimePerPage: Number,
  proxyUsed: String,
  triggeredBy: {
    type: String,
    enum: ['manual', 'scheduled', 'api'],
    default: 'manual',
  },
  triggeredByUser: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, { _id: true });

// Schedule configuration schema
const ScheduleConfigSchema = new Schema({
  isEnabled: {
    type: Boolean,
    default: false,
  },
  frequency: {
    type: String,
    enum: ['hourly', 'daily', 'weekly', 'monthly'],
  },
  dayOfWeek: Number, // 0-6 for weekly
  dayOfMonth: Number, // 1-31 for monthly
  hour: Number, // 0-23
  minute: Number, // 0-59
  timezone: {
    type: String,
    default: 'Asia/Yangon',
  },
  nextRunAt: Date,
}, { _id: false });

// Candidate Source Schema
const CandidateSourceSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Source name is required'],
    trim: true,
    index: true,
  },
  description: {
    type: String,
    trim: true,
  },
  
  // Source Type
  type: {
    type: String,
    enum: ['scraper', 'api', 'manual', 'import', 'integration'],
    required: true,
    index: true,
  },
  platform: {
    type: String,
    enum: ['linkedin', 'facebook', 'job.com.mm', 'github', 'stackoverflow', 'indeed', 'other'],
    required: true,
    index: true,
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'paused', 'error', 'maintenance', 'deprecated'],
    default: 'active',
    index: true,
  },
  
  // Configuration
  config: ScrapingConfigSchema,
  
  // Rate Limiting
  rateLimitConfig: {
    type: RateLimitConfigSchema,
    default: () => ({}),
  },
  
  // Proxy Settings
  proxySettings: {
    rotationEnabled: {
      type: Boolean,
      default: true,
    },
    proxies: [ProxyConfigSchema],
    currentProxyIndex: {
      type: Number,
      default: 0,
    },
  },
  
  // API Configuration (for API sources)
  apiConfig: {
    baseUrl: String,
    apiKey: String,
    apiSecret: String,
    headers: Schema.Types.Mixed,
    endpoints: {
      search: String,
      profile: String,
    },
  },
  
  // Authentication (for scrapers)
  authConfig: {
    username: String,
    password: String,
    sessionCookie: String,
    sessionExpiry: Date,
    twoFactorSecret: String,
  },
  
  // Scheduling
  schedule: ScheduleConfigSchema,
  
  // Statistics
  stats: {
    totalRuns: {
      type: Number,
      default: 0,
    },
    totalCandidatesFound: {
      type: Number,
      default: 0,
    },
    totalCandidatesAdded: {
      type: Number,
      default: 0,
    },
    successRate: {
      type: Number,
      default: 0,
    },
    lastRunAt: Date,
    lastSuccessAt: Date,
    lastErrorAt: Date,
    lastErrorMessage: String,
  },
  
  // Run History
  runHistory: [RunHistorySchema],
  
  // Metadata
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  tags: [{
    type: String,
    trim: true,
  }],
}, {
  timestamps: true,
});

// Indexes
CandidateSourceSchema.index({ platform: 1, status: 1 });
CandidateSourceSchema.index({ type: 1, status: 1 });
CandidateSourceSchema.index({ 'schedule.nextRunAt': 1 });
CandidateSourceSchema.index({ createdAt: -1 });

// Virtual for last run
CandidateSourceSchema.virtual('lastRun').get(function() {
  if (!this.runHistory || this.runHistory.length === 0) return null;
  return this.runHistory[this.runHistory.length - 1];
});

// Virtual for isScheduled
CandidateSourceSchema.virtual('isScheduled').get(function() {
  return this.schedule?.isEnabled && this.schedule?.nextRunAt;
});

// Pre-save middleware
CandidateSourceSchema.pre('save', function(next) {
  // Calculate success rate
  if (this.stats.totalRuns > 0) {
    const successfulRuns = this.runHistory.filter(r => r.status === 'completed').length;
    this.stats.successRate = Math.round((successfulRuns / this.stats.totalRuns) * 100);
  }
  next();
});

// Static methods
CandidateSourceSchema.statics.findActive = function() {
  return this.find({ status: 'active' });
};

CandidateSourceSchema.statics.findScheduled = function() {
  return this.find({
    'schedule.isEnabled': true,
    'schedule.nextRunAt': { $lte: new Date() },
    status: 'active',
  });
};

CandidateSourceSchema.statics.getPlatformStats = async function() {
  return this.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: '$platform',
        count: { $sum: 1 },
        totalCandidates: { $sum: '$stats.totalCandidatesAdded' },
        avgSuccessRate: { $avg: '$stats.successRate' },
      },
    },
    { $sort: { totalCandidates: -1 } },
  ]);
};

// Instance methods
CandidateSourceSchema.methods.getNextProxy = function() {
  if (!this.proxySettings?.rotationEnabled || !this.proxySettings?.proxies?.length) {
    return null;
  }
  
  const activeProxies = this.proxySettings.proxies.filter(p => p.isActive);
  if (activeProxies.length === 0) return null;
  
  // Round-robin selection
  const proxy = activeProxies[this.proxySettings.currentProxyIndex % activeProxies.length];
  this.proxySettings.currentProxyIndex = (this.proxySettings.currentProxyIndex + 1) % activeProxies.length;
  
  return proxy;
};

CandidateSourceSchema.methods.addRunHistory = function(runData) {
  this.runHistory.push(runData);
  
  // Update stats
  this.stats.totalRuns += 1;
  this.stats.totalCandidatesFound += runData.candidatesFound || 0;
  this.stats.totalCandidatesAdded += runData.candidatesAdded || 0;
  this.stats.lastRunAt = runData.startedAt || new Date();
  
  if (runData.status === 'completed') {
    this.stats.lastSuccessAt = runData.completedAt || new Date();
  } else if (runData.status === 'failed') {
    this.stats.lastErrorAt = new Date();
    this.stats.lastErrorMessage = runData.errors?.[0]?.message;
  }
  
  // Keep only last 50 runs
  if (this.runHistory.length > 50) {
    this.runHistory = this.runHistory.slice(-50);
  }
  
  return this.save();
};

CandidateSourceSchema.methods.calculateNextRun = function() {
  if (!this.schedule?.isEnabled) return null;
  
  const now = new Date();
  let nextRun = new Date(now);
  
  switch (this.schedule.frequency) {
    case 'hourly':
      nextRun.setHours(nextRun.getHours() + 1);
      break;
    case 'daily':
      nextRun.setDate(nextRun.getDate() + 1);
      nextRun.setHours(this.schedule.hour || 0);
      nextRun.setMinutes(this.schedule.minute || 0);
      break;
    case 'weekly':
      nextRun.setDate(nextRun.getDate() + 7);
      nextRun.setHours(this.schedule.hour || 0);
      nextRun.setMinutes(this.schedule.minute || 0);
      break;
    case 'monthly':
      nextRun.setMonth(nextRun.getMonth() + 1);
      nextRun.setDate(this.schedule.dayOfMonth || 1);
      nextRun.setHours(this.schedule.hour || 0);
      nextRun.setMinutes(this.schedule.minute || 0);
      break;
  }
  
  this.schedule.nextRunAt = nextRun;
  return nextRun;
};

const CandidateSource = mongoose.model('CandidateSource', CandidateSourceSchema);

module.exports = CandidateSource;
