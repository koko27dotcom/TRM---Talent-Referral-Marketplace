/**
 * ScrapingSource Model
 * Manages job portal sources and their configurations
 * Handles rate limiting, proxy settings, and scraping parameters per source
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
  currentStatus: {
    type: String,
    enum: ['active', 'cooling', 'banned', 'error'],
    default: 'active',
  },
  cooldownUntil: Date,
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
  burstLimit: {
    type: Number,
    default: 3,
  },
  cooldownPeriod: {
    type: Number,
    default: 300, // 5 minutes
  },
}, { _id: false });

// Authentication schema
const AuthConfigSchema = new Schema({
  type: {
    type: String,
    enum: ['none', 'api_key', 'oauth2', 'basic', 'cookie', 'custom'],
    default: 'none',
  },
  apiKey: {
    key: String,
    value: String,
    headerName: String,
  },
  oauth2: {
    clientId: String,
    clientSecret: String,
    tokenUrl: String,
    scope: String,
    accessToken: String,
    refreshToken: String,
    expiresAt: Date,
  },
  basic: {
    username: String,
    password: String,
  },
  cookies: [{
    name: String,
    value: String,
    domain: String,
    path: String,
    expires: Date,
  }],
  customHeaders: {
    type: Map,
    of: String,
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
  includeContactInfo: {
    type: Boolean,
    default: true,
  },
  
  // Selectors for scraping (CSS/XPath)
  selectors: {
    profileList: String,
    profileLink: String,
    name: String,
    title: String,
    company: String,
    location: String,
    experience: String,
    education: String,
    skills: String,
    contactInfo: String,
    nextPage: String,
  },
  
  // JavaScript execution
  executeJavaScript: {
    type: Boolean,
    default: true,
  },
  waitForSelector: String,
  scrollToBottom: {
    type: Boolean,
    default: false,
  },
  
  // Data extraction rules
  extractionRules: [{
    field: String,
    selector: String,
    attribute: String,
    transform: String,
    required: Boolean,
  }],
}, { _id: false });

// Health check schema
const HealthCheckSchema = new Schema({
  lastChecked: Date,
  status: {
    type: String,
    enum: ['healthy', 'degraded', 'unhealthy', 'unknown'],
    default: 'unknown',
  },
  responseTime: Number,
  errorMessage: String,
  consecutiveFailures: {
    type: Number,
    default: 0,
  },
  consecutiveSuccesses: {
    type: Number,
    default: 0,
  },
}, { _id: false });

// Scraping Source Schema
const ScrapingSourceSchema = new Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Source name is required'],
    trim: true,
    maxlength: [100, 'Source name cannot exceed 100 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  
  // Source Type and URL
  type: {
    type: String,
    enum: ['job_portal', 'social_media', 'company_career', 'aggregator', 'api', 'custom'],
    required: true,
  },
  baseUrl: {
    type: String,
    required: [true, 'Base URL is required'],
    trim: true,
  },
  searchUrl: {
    type: String,
    trim: true,
  },
  profileUrlPattern: {
    type: String,
    trim: true,
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  isEnabled: {
    type: Boolean,
    default: true,
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'error', 'maintenance', 'deprecated'],
    default: 'active',
    index: true,
  },
  
  // Priority and Weight
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  weight: {
    type: Number,
    default: 1,
    min: 0.1,
    max: 10,
  },
  
  // Rate Limiting
  rateLimit: {
    type: RateLimitConfigSchema,
    default: () => ({}),
  },
  
  // Authentication
  auth: {
    type: AuthConfigSchema,
    default: () => ({}),
  },
  
  // Scraping Configuration
  config: {
    type: ScrapingConfigSchema,
    default: () => ({}),
  },
  
  // Proxy Configuration
  proxies: [ProxyConfigSchema],
  proxyRotation: {
    type: String,
    enum: ['none', 'round_robin', 'random', 'least_used', 'performance_based'],
    default: 'round_robin',
  },
  currentProxyIndex: {
    type: Number,
    default: 0,
  },
  
  // Statistics
  statistics: {
    totalScraped: {
      type: Number,
      default: 0,
    },
    successfulScrapes: {
      type: Number,
      default: 0,
    },
    failedScrapes: {
      type: Number,
      default: 0,
    },
    lastScrapedAt: Date,
    lastSuccessAt: Date,
    lastFailureAt: Date,
    averageResponseTime: {
      type: Number,
      default: 0,
    },
    successRate: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    totalPagesScraped: {
      type: Number,
      default: 0,
    },
    dataQualityScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  
  // Health Check
  health: {
    type: HealthCheckSchema,
    default: () => ({}),
  },
  
  // Maintenance
  maintenance: {
    isUnderMaintenance: {
      type: Boolean,
      default: false,
    },
    maintenanceStart: Date,
    maintenanceEnd: Date,
    maintenanceReason: String,
  },
  
  // Scheduling
  schedule: {
    enabled: {
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
  },
  
  // Metadata
  country: {
    type: String,
    default: 'Myanmar',
    trim: true,
  },
  language: {
    type: String,
    default: 'my',
    trim: true,
  },
  category: {
    type: String,
    enum: ['general', 'tech', 'executive', 'freelance', 'government', 'ngo', 'startup'],
    default: 'general',
  },
  tags: [String],
  
  // Versioning
  version: {
    type: String,
    default: '1.0.0',
  },
  schemaVersion: {
    type: Number,
    default: 1,
  },
  
  // Notes
  notes: {
    type: String,
    trim: true,
  },
  
  // User tracking
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
ScrapingSourceSchema.index({ status: 1, isActive: 1 });
ScrapingSourceSchema.index({ type: 1, category: 1 });
ScrapingSourceSchema.index({ priority: -1 });
ScrapingSourceSchema.index({ tags: 1 });
ScrapingSourceSchema.index({ country: 1, language: 1 });
ScrapingSourceSchema.index({ 'statistics.successRate': -1 });

// Virtual for isAvailable
ScrapingSourceSchema.virtual('isAvailable').get(function() {
  if (!this.isActive || !this.isEnabled) return false;
  if (this.status !== 'active') return false;
  if (this.maintenance.isUnderMaintenance) {
    const now = new Date();
    if (now >= this.maintenance.maintenanceStart && now <= this.maintenance.maintenanceEnd) {
      return false;
    }
  }
  return true;
});

// Virtual for hasAvailableProxy
ScrapingSourceSchema.virtual('hasAvailableProxy').get(function() {
  if (!this.proxies || this.proxies.length === 0) return true; // Direct connection
  return this.proxies.some(p => p.isActive && p.currentStatus === 'active');
});

// Method to get next proxy
ScrapingSourceSchema.methods.getNextProxy = function() {
  if (!this.proxies || this.proxies.length === 0) return null;
  
  const activeProxies = this.proxies.filter(p => p.isActive && p.currentStatus === 'active');
  if (activeProxies.length === 0) return null;
  
  let selectedProxy;
  
  switch (this.proxyRotation) {
    case 'round_robin':
      selectedProxy = activeProxies[this.currentProxyIndex % activeProxies.length];
      this.currentProxyIndex = (this.currentProxyIndex + 1) % activeProxies.length;
      break;
    case 'random':
      selectedProxy = activeProxies[Math.floor(Math.random() * activeProxies.length)];
      break;
    case 'least_used':
      selectedProxy = activeProxies.reduce((min, p) => 
        (p.successCount + p.failureCount) < (min.successCount + min.failureCount) ? p : min
      );
      break;
    case 'performance_based':
      selectedProxy = activeProxies.reduce((best, p) => {
        const bestScore = (best.successCount / (best.successCount + best.failureCount || 1)) / (best.averageResponseTime || 1000);
        const pScore = (p.successCount / (p.successCount + p.failureCount || 1)) / (p.averageResponseTime || 1000);
        return pScore > bestScore ? p : best;
      });
      break;
    default:
      selectedProxy = activeProxies[0];
  }
  
  return selectedProxy;
};

// Method to update statistics
ScrapingSourceSchema.methods.updateStatistics = async function(success, responseTime) {
  this.statistics.totalScraped += 1;
  this.statistics.lastScrapedAt = new Date();
  
  if (success) {
    this.statistics.successfulScrapes += 1;
    this.statistics.lastSuccessAt = new Date();
    this.health.consecutiveSuccesses += 1;
    this.health.consecutiveFailures = 0;
  } else {
    this.statistics.failedScrapes += 1;
    this.statistics.lastFailureAt = new Date();
    this.health.consecutiveFailures += 1;
    this.health.consecutiveSuccesses = 0;
  }
  
  // Update average response time
  const total = this.statistics.successfulScrapes + this.statistics.failedScrapes;
  this.statistics.averageResponseTime = 
    ((this.statistics.averageResponseTime * (total - 1)) + responseTime) / total;
  
  // Update success rate
  this.statistics.successRate = 
    Math.round((this.statistics.successfulScrapes / this.statistics.totalScraped) * 100);
  
  // Update health status
  if (this.health.consecutiveFailures >= 5) {
    this.health.status = 'unhealthy';
    this.status = 'error';
  } else if (this.health.consecutiveSuccesses >= 3 && this.health.status === 'unhealthy') {
    this.health.status = 'healthy';
    this.status = 'active';
  }
  
  this.health.lastChecked = new Date();
  this.health.responseTime = responseTime;
  
  return this.save();
};

// Method to enable/disable source
ScrapingSourceSchema.methods.setEnabled = async function(enabled) {
  this.isEnabled = enabled;
  this.status = enabled ? 'active' : 'paused';
  return this.save();
};

// Method to add proxy
ScrapingSourceSchema.methods.addProxy = async function(proxyConfig) {
  this.proxies.push(proxyConfig);
  return this.save();
};

// Method to remove proxy
ScrapingSourceSchema.methods.removeProxy = async function(proxyId) {
  this.proxies = this.proxies.filter(p => p._id.toString() !== proxyId);
  return this.save();
};

// Static method to get active sources
ScrapingSourceSchema.statics.getActiveSources = function() {
  return this.find({
    isActive: true,
    isEnabled: true,
    status: 'active',
    $or: [
      { 'maintenance.isUnderMaintenance': false },
      { 'maintenance.maintenanceEnd': { $lt: new Date() } },
    ],
  }).sort({ priority: -1 });
};

// Static method to get sources by category
ScrapingSourceSchema.statics.getByCategory = function(category) {
  return this.find({
    category,
    isActive: true,
    isEnabled: true,
  }).sort({ priority: -1 });
};

// Static method to get statistics
ScrapingSourceSchema.statics.getOverallStatistics = async function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalSources: { $sum: 1 },
        activeSources: {
          $sum: { $cond: [{ $and: ['$isActive', '$isEnabled', { $eq: ['$status', 'active'] }] }, 1, 0] },
        },
        totalScraped: { $sum: '$statistics.totalScraped' },
        totalSuccessful: { $sum: '$statistics.successfulScrapes' },
        avgSuccessRate: { $avg: '$statistics.successRate' },
        avgDataQuality: { $avg: '$statistics.dataQualityScore' },
      },
    },
  ]);
};

const ScrapingSource = mongoose.model('ScrapingSource', ScrapingSourceSchema);

module.exports = ScrapingSource;