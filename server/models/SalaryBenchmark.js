/**
 * SalaryBenchmark Model
 * Stores salary data by role, location, and experience level for Myanmar job market
 * Enables AI-powered salary recommendations and market analysis
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Salary range schema
const SalaryRangeSchema = new Schema({
  min: {
    type: Number,
    required: true,
    min: 0,
  },
  max: {
    type: Number,
    required: true,
    min: 0,
  },
  median: {
    type: Number,
    required: true,
    min: 0,
  },
  average: {
    type: Number,
    required: true,
    min: 0,
  },
  percentile25: {
    type: Number,
    min: 0,
  },
  percentile75: {
    type: Number,
    min: 0,
  },
  percentile90: {
    type: Number,
    min: 0,
  },
}, { _id: false });

// Historical data point schema
const HistoricalDataSchema = new Schema({
  date: {
    type: Date,
    required: true,
  },
  average: {
    type: Number,
    required: true,
  },
  median: {
    type: Number,
    required: true,
  },
  sampleSize: {
    type: Number,
    default: 0,
  },
}, { _id: false });

// Skills premium schema
const SkillsPremiumSchema = new Schema({
  skill: {
    type: String,
    required: true,
    trim: true,
  },
  premiumPercentage: {
    type: Number,
    required: true,
    min: 0,
  },
  premiumAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  demandLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'very_high'],
    default: 'medium',
  },
}, { _id: false });

// Company size adjustment schema
const CompanySizeAdjustmentSchema = new Schema({
  size: {
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'],
    required: true,
  },
  adjustmentPercentage: {
    type: Number,
    required: true,
  },
}, { _id: false });

// Main SalaryBenchmark Schema
const SalaryBenchmarkSchema = new Schema({
  // Job classification
  jobTitle: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  jobCategory: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  jobFunction: {
    type: String,
    trim: true,
    index: true,
  },
  
  // Experience level
  experienceLevel: {
    type: String,
    enum: ['entry', 'junior', 'mid', 'senior', 'executive'],
    required: true,
    index: true,
  },
  yearsOfExperience: {
    min: {
      type: Number,
      default: 0,
    },
    max: {
      type: Number,
    },
  },
  
  // Location (Myanmar-specific)
  location: {
    city: {
      type: String,
      required: true,
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
      trim: true,
    },
    region: {
      type: String,
      enum: ['yangon_region', 'mandalay_region', 'naypyitaw_region', 'other'],
      default: 'other',
    },
  },
  
  // Industry
  industry: {
    type: String,
    trim: true,
    index: true,
  },
  
  // Salary data
  salary: {
    type: SalaryRangeSchema,
    required: true,
  },
  
  // Currency
  currency: {
    type: String,
    default: 'MMK',
    trim: true,
  },
  
  // Period (monthly, yearly)
  period: {
    type: String,
    enum: ['monthly', 'yearly', 'hourly', 'daily'],
    default: 'monthly',
  },
  
  // Sample size
  sampleSize: {
    type: Number,
    default: 0,
    min: 0,
  },
  
  // Data quality score
  dataQuality: {
    type: Number,
    min: 0,
    max: 100,
    default: 50,
  },
  
  // Confidence level
  confidenceLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  
  // Skills premiums
  skillsPremiums: [SkillsPremiumSchema],
  
  // Company size adjustments
  companySizeAdjustments: [CompanySizeAdjustmentSchema],
  
  // Historical trend
  historicalData: [HistoricalDataSchema],
  
  // Market trend
  trend: {
    direction: {
      type: String,
      enum: ['increasing', 'decreasing', 'stable'],
      default: 'stable',
    },
    percentageChange: {
      type: Number,
      default: 0,
    },
    period: {
      type: String,
      default: '12_months',
    },
  },
  
  // Benefits value (estimated monetary value)
  benefitsValue: {
    type: Number,
    default: 0,
    min: 0,
  },
  
  // Total compensation (salary + benefits)
  totalCompensation: {
    min: {
      type: Number,
      min: 0,
    },
    max: {
      type: Number,
      min: 0,
    },
    median: {
      type: Number,
      min: 0,
    },
  },
  
  // Metadata
  dataSource: {
    type: String,
    enum: ['platform_data', 'survey', 'market_research', 'government', 'aggregated'],
    default: 'platform_data',
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  validUntil: {
    type: Date,
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'deprecated', 'draft'],
    default: 'active',
    index: true,
  },
  
  // AI-generated flag
  isAIGenerated: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ==================== INDEXES ====================

SalaryBenchmarkSchema.index({ jobTitle: 1, experienceLevel: 1, 'location.city': 1 });
SalaryBenchmarkSchema.index({ jobCategory: 1, experienceLevel: 1 });
SalaryBenchmarkSchema.index({ industry: 1, experienceLevel: 1 });
SalaryBenchmarkSchema.index({ 'location.city': 1, 'salary.median': -1 });
SalaryBenchmarkSchema.index({ lastUpdated: -1 });
SalaryBenchmarkSchema.index({ status: 1, validUntil: 1 });

// ==================== VIRTUALS ====================

// Virtual for formatted salary range
SalaryBenchmarkSchema.virtual('formattedSalaryRange').get(function() {
  const { min, max } = this.salary;
  const currency = this.currency;
  const period = this.period;
  
  return `${min.toLocaleString()} - ${max.toLocaleString()} ${currency}/${period}`;
});

// Virtual for is current
SalaryBenchmarkSchema.virtual('isCurrent').get(function() {
  if (!this.validUntil) return true;
  return this.validUntil > new Date();
});

// Virtual for market competitiveness score (0-100)
SalaryBenchmarkSchema.virtual('marketCompetitiveness').get(function() {
  // Based on sample size and data quality
  const sampleScore = Math.min(this.sampleSize / 10, 50); // Max 50 points
  const qualityScore = this.dataQuality / 2; // Max 50 points
  return Math.round(sampleScore + qualityScore);
});

// ==================== INSTANCE METHODS ====================

/**
 * Calculate adjusted salary for specific skills
 * @param {Array<string>} skills - Array of skills
 * @returns {Object} Adjusted salary
 */
SalaryBenchmarkSchema.methods.calculateAdjustedSalary = function(skills = []) {
  let adjustment = 0;
  
  skills.forEach(skill => {
    const premium = this.skillsPremiums.find(p => 
      p.skill.toLowerCase() === skill.toLowerCase()
    );
    if (premium) {
      adjustment += premium.premiumAmount;
    }
  });
  
  return {
    baseMin: this.salary.min,
    baseMax: this.salary.max,
    baseMedian: this.salary.median,
    adjustment,
    adjustedMin: this.salary.min + adjustment,
    adjustedMax: this.salary.max + adjustment,
    adjustedMedian: this.salary.median + adjustment,
  };
};

/**
 * Get salary for company size
 * @param {string} companySize - Company size
 * @returns {Object} Adjusted salary
 */
SalaryBenchmarkSchema.methods.getSalaryForCompanySize = function(companySize) {
  const adjustment = this.companySizeAdjustments.find(a => a.size === companySize);
  const percentage = adjustment ? adjustment.adjustmentPercentage : 0;
  
  const multiplier = 1 + (percentage / 100);
  
  return {
    min: Math.round(this.salary.min * multiplier),
    max: Math.round(this.salary.max * multiplier),
    median: Math.round(this.salary.median * multiplier),
    adjustmentPercentage: percentage,
  };
};

/**
 * Add historical data point
 * @param {Object} dataPoint - Historical data
 * @returns {Promise<void>}
 */
SalaryBenchmarkSchema.methods.addHistoricalData = async function(dataPoint) {
  this.historicalData.push(dataPoint);
  
  // Keep only last 24 data points
  if (this.historicalData.length > 24) {
    this.historicalData = this.historicalData.slice(-24);
  }
  
  this.lastUpdated = new Date();
  await this.save();
};

/**
 * Calculate trend
 * @returns {Object} Trend data
 */
SalaryBenchmarkSchema.methods.calculateTrend = function() {
  if (this.historicalData.length < 2) {
    return { direction: 'stable', percentageChange: 0 };
  }
  
  const sorted = this.historicalData.sort((a, b) => a.date - b.date);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  
  const change = ((last.average - first.average) / first.average) * 100;
  
  let direction = 'stable';
  if (change > 5) direction = 'increasing';
  else if (change < -5) direction = 'decreasing';
  
  return {
    direction,
    percentageChange: change,
    period: `${Math.round((last.date - first.date) / (1000 * 60 * 60 * 24 * 30))} months`,
  };
};

// ==================== STATIC METHODS ====================

/**
 * Find salary benchmark
 * @param {Object} criteria - Search criteria
 * @returns {Promise<Object|null>}
 */
SalaryBenchmarkSchema.statics.findBenchmark = async function(criteria) {
  const { jobTitle, experienceLevel, location, industry } = criteria;
  
  let query = { status: 'active' };
  
  if (jobTitle) {
    query.$or = [
      { jobTitle: { $regex: jobTitle, $options: 'i' } },
      { jobCategory: { $regex: jobTitle, $options: 'i' } },
    ];
  }
  
  if (experienceLevel) query.experienceLevel = experienceLevel;
  if (location) query['location.city'] = { $regex: location, $options: 'i' };
  if (industry) query.industry = industry;
  
  return this.findOne(query).sort({ dataQuality: -1, sampleSize: -1 });
};

/**
 * Get salary range for job
 * @param {string} jobTitle - Job title
 * @param {string} experienceLevel - Experience level
 * @param {string} location - Location
 * @returns {Promise<Object>}
 */
SalaryBenchmarkSchema.statics.getSalaryRange = async function(jobTitle, experienceLevel, location) {
  const benchmark = await this.findBenchmark({ jobTitle, experienceLevel, location });
  
  if (!benchmark) {
    return null;
  }
  
  return {
    min: benchmark.salary.min,
    max: benchmark.salary.max,
    median: benchmark.salary.median,
    average: benchmark.salary.average,
    currency: benchmark.currency,
    period: benchmark.period,
    confidence: benchmark.confidenceLevel,
    sampleSize: benchmark.sampleSize,
  };
};

/**
 * Compare salaries across locations
 * @param {string} jobTitle - Job title
 * @param {string} experienceLevel - Experience level
 * @param {Array<string>} locations - Locations to compare
 * @returns {Promise<Array>}
 */
SalaryBenchmarkSchema.statics.compareLocations = async function(jobTitle, experienceLevel, locations) {
  const results = await Promise.all(
    locations.map(async (location) => {
      const benchmark = await this.findBenchmark({ jobTitle, experienceLevel, location });
      return {
        location,
        benchmark: benchmark ? {
          median: benchmark.salary.median,
          min: benchmark.salary.min,
          max: benchmark.salary.max,
          trend: benchmark.trend,
        } : null,
      };
    })
  );
  
  return results;
};

/**
 * Get top paying jobs
 * @param {string} location - Location filter
 * @param {number} limit - Number of results
 * @returns {Promise<Array>}
 */
SalaryBenchmarkSchema.statics.getTopPayingJobs = async function(location, limit = 10) {
  const query = { status: 'active' };
  if (location) query['location.city'] = location;
  
  return this.find(query)
    .sort({ 'salary.median': -1 })
    .limit(limit)
    .select('jobTitle jobCategory experienceLevel location salary trend');
};

/**
 * Get salary by experience progression
 * @param {string} jobTitle - Job title
 * @param {string} location - Location
 * @returns {Promise<Array>}
 */
SalaryBenchmarkSchema.statics.getExperienceProgression = async function(jobTitle, location) {
  const experienceLevels = ['entry', 'junior', 'mid', 'senior', 'executive'];
  
  const results = await Promise.all(
    experienceLevels.map(async (level) => {
      const benchmark = await this.findOne({
        jobTitle: { $regex: jobTitle, $options: 'i' },
        experienceLevel: level,
        'location.city': { $regex: location || '', $options: 'i' },
        status: 'active',
      });
      
      return {
        experienceLevel: level,
        benchmark: benchmark ? {
          median: benchmark.salary.median,
          min: benchmark.salary.min,
          max: benchmark.salary.max,
        } : null,
      };
    })
  );
  
  return results;
};

/**
 * Update or create benchmark
 * @param {Object} data - Benchmark data
 * @returns {Promise<Object>}
 */
SalaryBenchmarkSchema.statics.upsertBenchmark = async function(data) {
  const { jobTitle, experienceLevel, location } = data;
  
  const existing = await this.findOne({
    jobTitle,
    experienceLevel,
    'location.city': location.city,
  });
  
  if (existing) {
    Object.assign(existing, data);
    existing.lastUpdated = new Date();
    await existing.save();
    return existing;
  }
  
  return this.create(data);
};

/**
 * Get market overview
 * @param {string} location - Location filter
 * @returns {Promise<Object>}
 */
SalaryBenchmarkSchema.statics.getMarketOverview = async function(location) {
  const query = { status: 'active' };
  if (location) query['location.city'] = location;
  
  const stats = await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalBenchmarks: { $sum: 1 },
        avgMedianSalary: { $avg: '$salary.median' },
        highestMedian: { $max: '$salary.median' },
        lowestMedian: { $min: '$salary.median' },
        totalSampleSize: { $sum: '$sampleSize' },
      },
    },
  ]);
  
  const byExperience = await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$experienceLevel',
        avgMedian: { $avg: '$salary.median' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  
  return {
    overall: stats[0] || {},
    byExperience: byExperience.reduce((acc, item) => {
      acc[item._id] = { avgMedian: item.avgMedian, count: item.count };
      return acc;
    }, {}),
  };
};

const SalaryBenchmark = mongoose.model('SalaryBenchmark', SalaryBenchmarkSchema);

module.exports = SalaryBenchmark;
