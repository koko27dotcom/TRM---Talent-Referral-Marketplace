/**
 * MarketTrend Model
 * Stores job market trend data for Myanmar
 * Tracks industry trends, skill demands, and market indicators
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Trend data point schema
const TrendDataPointSchema = new Schema({
  date: {
    type: Date,
    required: true,
  },
  value: {
    type: Number,
    required: true,
  },
  volume: {
    type: Number,
    default: 0,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, { _id: false });

// Skill demand schema
const SkillDemandSchema = new Schema({
  skill: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    trim: true,
  },
  demandScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  growthRate: {
    type: Number,
    default: 0,
  },
  jobCount: {
    type: Number,
    default: 0,
  },
  avgSalary: {
    type: Number,
  },
  trend: {
    type: String,
    enum: ['rising', 'falling', 'stable'],
    default: 'stable',
  },
}, { _id: false });

// Industry metrics schema
const IndustryMetricsSchema = new Schema({
  industry: {
    type: String,
    required: true,
    trim: true,
  },
  jobPostings: {
    type: Number,
    default: 0,
  },
  activeJobs: {
    type: Number,
    default: 0,
  },
  filledJobs: {
    type: Number,
    default: 0,
  },
  avgTimeToFill: {
    type: Number,
    default: 0,
  },
  avgSalary: {
    type: Number,
  },
  growthRate: {
    type: Number,
    default: 0,
  },
  topSkills: [{
    type: String,
    trim: true,
  }],
}, { _id: false });

// Location metrics schema
const LocationMetricsSchema = new Schema({
  city: {
    type: String,
    required: true,
    trim: true,
  },
  state: {
    type: String,
    trim: true,
  },
  jobPostings: {
    type: Number,
    default: 0,
  },
  activeJobs: {
    type: Number,
    default: 0,
  },
  avgSalary: {
    type: Number,
  },
  topIndustries: [{
    type: String,
    trim: true,
  }],
  growthRate: {
    type: Number,
    default: 0,
  },
}, { _id: false });

// Main MarketTrend Schema
const MarketTrendSchema = new Schema({
  // Trend classification
  type: {
    type: String,
    enum: [
      'job_volume',
      'salary_trend',
      'skill_demand',
      'industry_growth',
      'location_trend',
      'hiring_velocity',
      'candidate_supply',
      'market_sentiment',
    ],
    required: true,
    index: true,
  },
  
  // Time period
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    required: true,
    index: true,
  },
  periodStart: {
    type: Date,
    required: true,
  },
  periodEnd: {
    type: Date,
    required: true,
  },
  
  // Location context (Myanmar-specific)
  location: {
    city: {
      type: String,
      trim: true,
      index: true,
    },
    state: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      default: 'Myanmar',
    },
    region: {
      type: String,
      enum: ['yangon_region', 'mandalay_region', 'naypyitaw_region', 'other'],
    },
  },
  
  // Industry context
  industry: {
    type: String,
    trim: true,
    index: true,
  },
  
  // Trend metrics
  metrics: {
    totalJobs: {
      type: Number,
      default: 0,
    },
    newJobs: {
      type: Number,
      default: 0,
    },
    filledJobs: {
      type: Number,
      default: 0,
    },
    activeJobs: {
      type: Number,
      default: 0,
    },
    totalApplications: {
      type: Number,
      default: 0,
    },
    totalReferrals: {
      type: Number,
      default: 0,
    },
    avgTimeToFill: {
      type: Number,
      default: 0,
    },
    avgSalary: {
      type: Number,
    },
    salaryGrowth: {
      type: Number,
      default: 0,
    },
  },
  
  // Historical data points
  dataPoints: [TrendDataPointSchema],
  
  // Skill demands
  skillDemands: [SkillDemandSchema],
  
  // Industry metrics
  industryMetrics: [IndustryMetricsSchema],
  
  // Location metrics
  locationMetrics: [LocationMetricsSchema],
  
  // Trend analysis
  analysis: {
    trend: {
      type: String,
      enum: ['strong_growth', 'growth', 'stable', 'decline', 'strong_decline'],
      default: 'stable',
    },
    growthRate: {
      type: Number,
      default: 0,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 50,
    },
    factors: [{
      type: String,
      trim: true,
    }],
    summary: {
      type: String,
      trim: true,
    },
  },
  
  // Predictions
  predictions: {
    nextPeriodGrowth: {
      type: Number,
      default: 0,
    },
    predictedJobs: {
      type: Number,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
    },
  },
  
  // Metadata
  dataSource: {
    type: String,
    enum: ['platform_data', 'external_api', 'survey', 'aggregated'],
    default: 'platform_data',
  },
  isAIGenerated: {
    type: Boolean,
    default: false,
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'archived', 'draft'],
    default: 'active',
  },
  
  // Generation metadata
  generatedAt: {
    type: Date,
    default: Date.now,
  },
  generatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ==================== INDEXES ====================

MarketTrendSchema.index({ type: 1, period: 1, periodStart: -1 });
MarketTrendSchema.index({ 'location.city': 1, type: 1, periodStart: -1 });
MarketTrendSchema.index({ industry: 1, type: 1, periodStart: -1 });
MarketTrendSchema.index({ periodStart: -1, periodEnd: -1 });
MarketTrendSchema.index({ status: 1, generatedAt: -1 });

// ==================== VIRTUALS ====================

// Virtual for is current period
MarketTrendSchema.virtual('isCurrent').get(function() {
  const now = new Date();
  return this.periodStart <= now && this.periodEnd >= now;
});

// Virtual for days covered
MarketTrendSchema.virtual('daysCovered').get(function() {
  return Math.ceil((this.periodEnd - this.periodStart) / (1000 * 60 * 60 * 24));
});

// Virtual for job fill rate
MarketTrendSchema.virtual('fillRate').get(function() {
  if (this.metrics.totalJobs === 0) return 0;
  return (this.metrics.filledJobs / this.metrics.totalJobs) * 100;
});

// Virtual for application rate
MarketTrendSchema.virtual('applicationRate').get(function() {
  if (this.metrics.activeJobs === 0) return 0;
  return this.metrics.totalApplications / this.metrics.activeJobs;
});

// ==================== INSTANCE METHODS ====================

/**
 * Add data point
 * @param {Object} dataPoint - Data point
 * @returns {Promise<void>}
 */
MarketTrendSchema.methods.addDataPoint = async function(dataPoint) {
  this.dataPoints.push(dataPoint);
  await this.save();
};

/**
 * Update skill demand
 * @param {Object} skillData - Skill data
 * @returns {Promise<void>}
 */
MarketTrendSchema.methods.updateSkillDemand = async function(skillData) {
  const existingIndex = this.skillDemands.findIndex(
    s => s.skill.toLowerCase() === skillData.skill.toLowerCase()
  );
  
  if (existingIndex >= 0) {
    this.skillDemands[existingIndex] = { ...this.skillDemands[existingIndex], ...skillData };
  } else {
    this.skillDemands.push(skillData);
  }
  
  await this.save();
};

/**
 * Calculate growth rate
 * @returns {number} Growth rate
 */
MarketTrendSchema.methods.calculateGrowthRate = function() {
  if (this.dataPoints.length < 2) return 0;
  
  const sorted = this.dataPoints.sort((a, b) => a.date - b.date);
  const first = sorted[0].value;
  const last = sorted[sorted.length - 1].value;
  
  if (first === 0) return 0;
  return ((last - first) / first) * 100;
};

// ==================== STATIC METHODS ====================

/**
 * Get latest trend
 * @param {string} type - Trend type
 * @param {Object} filters - Additional filters
 * @returns {Promise<Object|null>}
 */
MarketTrendSchema.statics.getLatest = async function(type, filters = {}) {
  const query = { type, status: 'active', ...filters };
  
  return this.findOne(query)
    .sort({ periodStart: -1 });
};

/**
 * Get trends over time
 * @param {string} type - Trend type
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>}
 */
MarketTrendSchema.statics.getTrendsOverTime = function(type, startDate, endDate) {
  return this.find({
    type,
    status: 'active',
    periodStart: { $gte: startDate, $lte: endDate },
  }).sort({ periodStart: 1 });
};

/**
 * Get top skills in demand
 * @param {string} location - Location filter
 * @param {string} industry - Industry filter
 * @param {number} limit - Number of results
 * @returns {Promise<Array>}
 */
MarketTrendSchema.statics.getTopSkills = async function(location, industry, limit = 10) {
  const query = { type: 'skill_demand', status: 'active' };
  
  if (location) query['location.city'] = location;
  if (industry) query.industry = industry;
  
  const trends = await this.find(query)
    .sort({ periodStart: -1 })
    .limit(1);
  
  if (!trends.length || !trends[0].skillDemands) return [];
  
  return trends[0].skillDemands
    .sort((a, b) => b.demandScore - a.demandScore)
    .slice(0, limit);
};

/**
 * Get industry comparison
 * @param {Array<string>} industries - Industries to compare
 * @returns {Promise<Array>}
 */
MarketTrendSchema.statics.getIndustryComparison = async function(industries) {
  const latest = await this.findOne({
    type: 'industry_growth',
    status: 'active',
  }).sort({ periodStart: -1 });
  
  if (!latest || !latest.industryMetrics) return [];
  
  return latest.industryMetrics
    .filter(i => industries.includes(i.industry))
    .sort((a, b) => b.growthRate - a.growthRate);
};

/**
 * Get location comparison
 * @param {Array<string>} locations - Locations to compare
 * @returns {Promise<Array>}
 */
MarketTrendSchema.statics.getLocationComparison = async function(locations) {
  const latest = await this.findOne({
    type: 'location_trend',
    status: 'active',
  }).sort({ periodStart: -1 });
  
  if (!latest || !latest.locationMetrics) return [];
  
  return latest.locationMetrics
    .filter(l => locations.includes(l.city))
    .sort((a, b) => b.jobPostings - a.jobPostings);
};

/**
 * Get market summary
 * @param {string} location - Location filter
 * @returns {Promise<Object>}
 */
MarketTrendSchema.statics.getMarketSummary = async function(location) {
  const query = { status: 'active' };
  if (location) query['location.city'] = location;
  
  const latestTrends = await this.find(query)
    .sort({ periodStart: -1 })
    .limit(5);
  
  if (!latestTrends.length) return null;
  
  const jobVolume = latestTrends.find(t => t.type === 'job_volume');
  const salaryTrend = latestTrends.find(t => t.type === 'salary_trend');
  const skillTrend = latestTrends.find(t => t.type === 'skill_demand');
  
  return {
    period: jobVolume?.period,
    periodStart: jobVolume?.periodStart,
    periodEnd: jobVolume?.periodEnd,
    jobMetrics: jobVolume?.metrics,
    salaryMetrics: salaryTrend?.metrics,
    topSkills: skillTrend?.skillDemands?.slice(0, 10) || [],
    overallTrend: jobVolume?.analysis?.trend || 'stable',
    growthRate: jobVolume?.analysis?.growthRate || 0,
  };
};

/**
 * Generate trend snapshot
 * @param {string} period - Period type
 * @param {Date} date - Date
 * @returns {Promise<Object>}
 */
MarketTrendSchema.statics.generateSnapshot = async function(period, date) {
  const { Job, Application, Referral, Company } = await import('./index.js');
  
  const periodStart = new Date(date);
  const periodEnd = new Date(date);
  
  switch (period) {
    case 'daily':
      periodEnd.setDate(periodEnd.getDate() + 1);
      break;
    case 'weekly':
      periodEnd.setDate(periodEnd.getDate() + 7);
      break;
    case 'monthly':
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      break;
    case 'quarterly':
      periodEnd.setMonth(periodEnd.getMonth() + 3);
      break;
    default:
      periodEnd.setMonth(periodEnd.getMonth() + 1);
  }
  
  // Aggregate job data
  const jobMetrics = await Job.aggregate([
    {
      $match: {
        createdAt: { $gte: periodStart, $lte: periodEnd },
      },
    },
    {
      $group: {
        _id: null,
        totalJobs: { $sum: 1 },
        activeJobs: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        filledJobs: { $sum: { $cond: [{ $eq: ['$status', 'filled'] }, 1, 0] } },
        avgSalary: { $avg: '$salary.max' },
      },
    },
  ]);
  
  // Aggregate application data
  const applicationMetrics = await Application.aggregate([
    {
      $match: {
        createdAt: { $gte: periodStart, $lte: periodEnd },
      },
    },
    {
      $group: {
        _id: null,
        totalApplications: { $sum: 1 },
      },
    },
  ]);
  
  // Aggregate referral data
  const referralMetrics = await Referral.aggregate([
    {
      $match: {
        createdAt: { $gte: periodStart, $lte: periodEnd },
      },
    },
    {
      $group: {
        _id: null,
        totalReferrals: { $sum: 1 },
      },
    },
  ]);
  
  const snapshot = {
    type: 'job_volume',
    period,
    periodStart,
    periodEnd,
    metrics: {
      totalJobs: jobMetrics[0]?.totalJobs || 0,
      activeJobs: jobMetrics[0]?.activeJobs || 0,
      filledJobs: jobMetrics[0]?.filledJobs || 0,
      totalApplications: applicationMetrics[0]?.totalApplications || 0,
      totalReferrals: referralMetrics[0]?.totalReferrals || 0,
      avgSalary: jobMetrics[0]?.avgSalary || 0,
    },
    generatedAt: new Date(),
  };
  
  return this.create(snapshot);
};

const MarketTrend = mongoose.model('MarketTrend', MarketTrendSchema);

module.exports = MarketTrend;
