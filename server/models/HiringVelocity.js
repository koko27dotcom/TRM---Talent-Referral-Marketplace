/**
 * HiringVelocity Model
 * Stores time-to-fill predictions and hiring velocity metrics
 * Enables AI-powered hiring timeline predictions for jobs
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Velocity factor schema
const VelocityFactorSchema = new Schema({
  factor: {
    type: String,
    required: true,
    trim: true,
  },
  impact: {
    type: String,
    enum: ['positive', 'negative', 'neutral'],
    required: true,
  },
  weight: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
  },
  daysImpact: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    trim: true,
  },
}, { _id: false });

// Historical velocity data schema
const HistoricalVelocitySchema = new Schema({
  date: {
    type: Date,
    required: true,
  },
  actualDays: {
    type: Number,
    required: true,
  },
  predictedDays: {
    type: Number,
    required: true,
  },
  jobId: {
    type: Schema.Types.ObjectId,
    ref: 'Job',
  },
  accuracy: {
    type: Number,
    min: 0,
    max: 100,
  },
}, { _id: false });

// Benchmark data schema
const BenchmarkDataSchema = new Schema({
  category: {
    type: String,
    required: true,
  },
  avgDays: {
    type: Number,
    required: true,
  },
  minDays: {
    type: Number,
  },
  maxDays: {
    type: Number,
  },
  medianDays: {
    type: Number,
  },
  sampleSize: {
    type: Number,
    default: 0,
  },
}, { _id: false });

// Main HiringVelocity Schema
const HiringVelocitySchema = new Schema({
  // Job reference
  jobId: {
    type: Schema.Types.ObjectId,
    ref: 'Job',
    index: true,
  },
  
  // Company reference
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    index: true,
  },
  
  // Job characteristics (for predictions without job ID)
  jobCharacteristics: {
    title: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
    experienceLevel: {
      type: String,
      enum: ['entry', 'junior', 'mid', 'senior', 'executive'],
    },
    location: {
      city: {
        type: String,
        trim: true,
      },
      state: {
        type: String,
        trim: true,
      },
    },
    salaryRange: {
      min: Number,
      max: Number,
    },
    skills: [{
      type: String,
      trim: true,
    }],
  },
  
  // Prediction details
  prediction: {
    estimatedDays: {
      type: Number,
      required: true,
      min: 0,
    },
    minDays: {
      type: Number,
      required: true,
      min: 0,
    },
    maxDays: {
      type: Number,
      required: true,
      min: 0,
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    factors: [VelocityFactorSchema],
  },
  
  // Timeline breakdown
  timeline: {
    sourcingDays: {
      type: Number,
      default: 0,
    },
    screeningDays: {
      type: Number,
      default: 0,
    },
    interviewDays: {
      type: Number,
      default: 0,
    },
    decisionDays: {
      type: Number,
      default: 0,
    },
    offerDays: {
      type: Number,
      default: 0,
    },
  },
  
  // Market context
  marketContext: {
    location: {
      type: String,
      trim: true,
    },
    industry: {
      type: String,
      trim: true,
    },
    marketConditions: {
      type: String,
      enum: ['favorable', 'neutral', 'challenging'],
      default: 'neutral',
    },
    candidateSupply: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    competitionLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
  },
  
  // Benchmarks
  benchmarks: {
    industry: BenchmarkDataSchema,
    company: BenchmarkDataSchema,
    location: BenchmarkDataSchema,
  },
  
  // Actual outcome (filled in when job is filled)
  actualOutcome: {
    actualDays: {
      type: Number,
    },
    filledAt: {
      type: Date,
    },
    accuracy: {
      type: Number,
      min: 0,
      max: 100,
    },
    variance: {
      type: Number,
    },
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'fulfilled', 'expired', 'cancelled'],
    default: 'active',
    index: true,
  },
  
  // Prediction metadata
  predictionDate: {
    type: Date,
    default: Date.now,
  },
  expectedFillDate: {
    type: Date,
  },
  expiresAt: {
    type: Date,
  },
  
  // Model info
  modelVersion: {
    type: String,
    default: '1.0.0',
  },
  isAIGenerated: {
    type: Boolean,
    default: true,
  },
  
  // Historical data for this job/company
  historicalData: [HistoricalVelocitySchema],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ==================== INDEXES ====================

HiringVelocitySchema.index({ jobId: 1, status: 1 });
HiringVelocitySchema.index({ companyId: 1, status: 1 });
HiringVelocitySchema.index({ predictionDate: -1 });
HiringVelocitySchema.index({ expectedFillDate: 1 });
HiringVelocitySchema.index({ status: 1, expiresAt: 1 });
HiringVelocitySchema.index({ 'jobCharacteristics.category': 1, 'jobCharacteristics.experienceLevel': 1 });

// ==================== VIRTUALS ====================

// Virtual for is overdue
HiringVelocitySchema.virtual('isOverdue').get(function() {
  if (!this.expectedFillDate || this.status === 'fulfilled') return false;
  return this.expectedFillDate < new Date();
});

// Virtual for days remaining
HiringVelocitySchema.virtual('daysRemaining').get(function() {
  if (!this.expectedFillDate) return null;
  const diff = this.expectedFillDate - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Virtual for prediction accuracy status
HiringVelocitySchema.virtual('accuracyStatus').get(function() {
  if (!this.actualOutcome || !this.actualOutcome.accuracy) return 'pending';
  if (this.actualOutcome.accuracy >= 80) return 'excellent';
  if (this.actualOutcome.accuracy >= 60) return 'good';
  if (this.actualOutcome.accuracy >= 40) return 'fair';
  return 'poor';
});

// Virtual for velocity score (0-100, higher is faster)
HiringVelocitySchema.virtual('velocityScore').get(function() {
  const estimated = this.prediction.estimatedDays;
  if (estimated <= 14) return 100;
  if (estimated <= 21) return 80;
  if (estimated <= 30) return 60;
  if (estimated <= 45) return 40;
  if (estimated <= 60) return 20;
  return 0;
});

// ==================== INSTANCE METHODS ====================

/**
 * Calculate expected fill date
 * @returns {Date} Expected fill date
 */
HiringVelocitySchema.methods.calculateExpectedFillDate = function() {
  const date = new Date(this.predictionDate);
  date.setDate(date.getDate() + this.prediction.estimatedDays);
  return date;
};

/**
 * Record actual outcome
 * @param {Object} outcome - Outcome data
 * @returns {Promise<void>}
 */
HiringVelocitySchema.methods.recordOutcome = async function(outcome) {
  const { actualDays, filledAt } = outcome;
  
  this.actualOutcome = {
    actualDays,
    filledAt: filledAt || new Date(),
    accuracy: this.calculateAccuracy(actualDays),
    variance: actualDays - this.prediction.estimatedDays,
  };
  
  this.status = 'fulfilled';
  await this.save();
};

/**
 * Calculate prediction accuracy
 * @param {number} actualDays - Actual days to fill
 * @returns {number} Accuracy score (0-100)
 */
HiringVelocitySchema.methods.calculateAccuracy = function(actualDays) {
  const predicted = this.prediction.estimatedDays;
  const variance = Math.abs(actualDays - predicted);
  const tolerance = predicted * 0.2; // 20% tolerance
  
  if (variance <= tolerance) {
    return 100 - ((variance / tolerance) * 20); // 80-100% within tolerance
  }
  
  return Math.max(0, 80 - ((variance - tolerance) / predicted) * 80);
};

/**
 * Update prediction based on new data
 * @param {Object} newPrediction - New prediction data
 * @returns {Promise<void>}
 */
HiringVelocitySchema.methods.updatePrediction = async function(newPrediction) {
  // Store old prediction in historical data
  this.historicalData.push({
    date: this.predictionDate,
    predictedDays: this.prediction.estimatedDays,
    actualDays: this.actualOutcome?.actualDays || 0,
    accuracy: this.actualOutcome?.accuracy || 0,
    jobId: this.jobId,
  });
  
  // Update prediction
  this.prediction = newPrediction.prediction;
  this.timeline = newPrediction.timeline;
  this.predictionDate = new Date();
  this.expectedFillDate = this.calculateExpectedFillDate();
  
  await this.save();
};

/**
 * Get risk assessment
 * @returns {Object} Risk assessment
 */
HiringVelocitySchema.methods.getRiskAssessment = function() {
  const risks = [];
  const factors = this.prediction.factors;
  
  // Identify negative factors
  const negativeFactors = factors.filter(f => f.impact === 'negative');
  const totalNegativeImpact = negativeFactors.reduce((sum, f) => sum + Math.abs(f.daysImpact), 0);
  
  if (totalNegativeImpact > 15) {
    risks.push({ level: 'high', message: 'Multiple factors may significantly delay hiring' });
  } else if (totalNegativeImpact > 7) {
    risks.push({ level: 'medium', message: 'Some factors may cause delays' });
  }
  
  if (this.prediction.confidence < 50) {
    risks.push({ level: 'medium', message: 'Low confidence in prediction due to limited data' });
  }
  
  if (this.marketContext.candidateSupply === 'low') {
    risks.push({ level: 'high', message: 'Limited candidate supply in market' });
  }
  
  return {
    riskLevel: risks.length > 1 ? 'high' : risks.length > 0 ? 'medium' : 'low',
    risks,
    recommendations: this.generateRecommendations(),
  };
};

/**
 * Generate recommendations
 * @returns {Array} Recommendations
 */
HiringVelocitySchema.methods.generateRecommendations = function() {
  const recommendations = [];
  const factors = this.prediction.factors;
  
  // Check for specific factors and provide recommendations
  const hasSalaryIssue = factors.some(f => f.factor === 'salary_competitiveness' && f.impact === 'negative');
  const hasSkillsIssue = factors.some(f => f.factor === 'skill_rarity' && f.impact === 'negative');
  const hasLocationIssue = factors.some(f => f.factor === 'location_constraint' && f.impact === 'negative');
  
  if (hasSalaryIssue) {
    recommendations.push('Consider adjusting salary range to be more competitive');
  }
  
  if (hasSkillsIssue) {
    recommendations.push('Consider relaxing specific skill requirements or offering training');
  }
  
  if (hasLocationIssue) {
    recommendations.push('Consider offering remote work options or relocation assistance');
  }
  
  if (this.prediction.estimatedDays > 45) {
    recommendations.push('Consider engaging recruitment agencies for hard-to-fill roles');
  }
  
  return recommendations;
};

// ==================== STATIC METHODS ====================

/**
 * Find velocity prediction for job
 * @param {string} jobId - Job ID
 * @returns {Promise<Object|null>}
 */
HiringVelocitySchema.statics.findForJob = function(jobId) {
  return this.findOne({
    jobId,
    status: { $in: ['active', 'fulfilled'] },
  }).sort({ predictionDate: -1 });
};

/**
 * Get company average velocity
 * @param {string} companyId - Company ID
 * @returns {Promise<Object>}
 */
HiringVelocitySchema.statics.getCompanyAverage = async function(companyId) {
  const velocities = await this.find({
    companyId,
    status: 'fulfilled',
    'actualOutcome.actualDays': { $exists: true },
  });
  
  if (!velocities.length) {
    return { avgDays: 0, sampleSize: 0 };
  }
  
  const totalDays = velocities.reduce((sum, v) => sum + v.actualOutcome.actualDays, 0);
  
  return {
    avgDays: Math.round(totalDays / velocities.length),
    sampleSize: velocities.length,
    avgAccuracy: velocities.reduce((sum, v) => sum + (v.actualOutcome.accuracy || 0), 0) / velocities.length,
  };
};

/**
 * Get benchmark by category
 * @param {string} category - Job category
 * @param {string} experienceLevel - Experience level
 * @returns {Promise<Object|null>}
 */
HiringVelocitySchema.statics.getBenchmark = async function(category, experienceLevel) {
  const fulfilled = await this.find({
    'jobCharacteristics.category': category,
    'jobCharacteristics.experienceLevel': experienceLevel,
    status: 'fulfilled',
    'actualOutcome.actualDays': { $exists: true },
  });
  
  if (!fulfilled.length) return null;
  
  const days = fulfilled.map(f => f.actualOutcome.actualDays).sort((a, b) => a - b);
  
  return {
    avgDays: Math.round(days.reduce((a, b) => a + b, 0) / days.length),
    minDays: days[0],
    maxDays: days[days.length - 1],
    medianDays: days[Math.floor(days.length / 2)],
    sampleSize: days.length,
  };
};

/**
 * Get velocity trends
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>}
 */
HiringVelocitySchema.statics.getTrends = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        predictionDate: { $gte: startDate, $lte: endDate },
        status: 'fulfilled',
      },
    },
    {
      $group: {
        _id: {
          month: { $month: '$predictionDate' },
          year: { $year: '$predictionDate' },
        },
        avgActualDays: { $avg: '$actualOutcome.actualDays' },
        avgPredictedDays: { $avg: '$prediction.estimatedDays' },
        avgAccuracy: { $avg: '$actualOutcome.accuracy' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);
};

/**
 * Get overdue predictions
 * @returns {Promise<Array>}
 */
HiringVelocitySchema.statics.getOverdue = function() {
  return this.find({
    status: 'active',
    expectedFillDate: { $lt: new Date() },
  }).populate('jobId', 'title companyId status');
};

/**
 * Get upcoming fills
 * @param {number} days - Days ahead
 * @returns {Promise<Array>}
 */
HiringVelocitySchema.statics.getUpcomingFills = function(days = 7) {
  const future = new Date();
  future.setDate(future.getDate() + days);
  
  return this.find({
    status: 'active',
    expectedFillDate: { $gte: new Date(), $lte: future },
  }).populate('jobId', 'title companyId status');
};

/**
 * Get prediction accuracy statistics
 * @returns {Promise<Object>}
 */
HiringVelocitySchema.statics.getAccuracyStats = async function() {
  const stats = await this.aggregate([
    {
      $match: {
        status: 'fulfilled',
        'actualOutcome.accuracy': { $exists: true },
      },
    },
    {
      $group: {
        _id: null,
        totalPredictions: { $sum: 1 },
        avgAccuracy: { $avg: '$actualOutcome.accuracy' },
        avgVariance: { $avg: '$actualOutcome.variance' },
        excellent: { $sum: { $cond: [{ $gte: ['$actualOutcome.accuracy', 80] }, 1, 0] } },
        good: { $sum: { $cond: [{ $and: [{ $gte: ['$actualOutcome.accuracy', 60] }, { $lt: ['$actualOutcome.accuracy', 80] }] }, 1, 0] } },
        fair: { $sum: { $cond: [{ $and: [{ $gte: ['$actualOutcome.accuracy', 40] }, { $lt: ['$actualOutcome.accuracy', 60] }] }, 1, 0] } },
        poor: { $sum: { $cond: [{ $lt: ['$actualOutcome.accuracy', 40] }, 1, 0] } },
      },
    },
  ]);
  
  return stats[0] || {
    totalPredictions: 0,
    avgAccuracy: 0,
    avgVariance: 0,
    excellent: 0,
    good: 0,
    fair: 0,
    poor: 0,
  };
};

const HiringVelocity = mongoose.model('HiringVelocity', HiringVelocitySchema);

module.exports = HiringVelocity;
