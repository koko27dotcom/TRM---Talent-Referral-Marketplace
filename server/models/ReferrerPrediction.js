/**
 * ReferrerPrediction Model
 * Stores referrer success predictions and performance analytics
 * Identifies top performers and predicts referral success probability
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Performance factor schema
const PerformanceFactorSchema = new Schema({
  factor: {
    type: String,
    required: true,
    trim: true,
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  weight: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
  },
  impact: {
    type: String,
    enum: ['positive', 'negative', 'neutral'],
    default: 'neutral',
  },
  description: {
    type: String,
    trim: true,
  },
}, { _id: false });

// Historical performance schema
const HistoricalPerformanceSchema = new Schema({
  period: {
    type: String,
    required: true,
  },
  periodStart: {
    type: Date,
    required: true,
  },
  periodEnd: {
    type: Date,
    required: true,
  },
  totalReferrals: {
    type: Number,
    default: 0,
  },
  successfulReferrals: {
    type: Number,
    default: 0,
  },
  conversionRate: {
    type: Number,
    default: 0,
  },
  earnings: {
    type: Number,
    default: 0,
  },
  networkGrowth: {
    type: Number,
    default: 0,
  },
}, { _id: false });

// Prediction outcome schema
const PredictionOutcomeSchema = new Schema({
  predictionId: {
    type: Schema.Types.ObjectId,
  },
  predictedAt: {
    type: Date,
  },
  actualOutcome: {
    type: Schema.Types.Mixed,
  },
  accuracy: {
    type: Number,
    min: 0,
    max: 100,
  },
  validatedAt: {
    type: Date,
  },
}, { _id: false });

// Main ReferrerPrediction Schema
const ReferrerPredictionSchema = new Schema({
  // Referrer reference
  referrerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // Prediction type
  type: {
    type: String,
    enum: [
      'success_prediction',
      'tier_progression',
      'earnings_forecast',
      'network_growth',
      'performance_trend',
    ],
    required: true,
    index: true,
  },
  
  // Prediction details
  prediction: {
    score: {
      type: Number,
      min: 0,
      max: 100,
    },
    probability: {
      type: Number,
      min: 0,
      max: 100,
    },
    predictedValue: {
      type: Schema.Types.Mixed,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
    },
    factors: [PerformanceFactorSchema],
  },
  
  // Performance metrics used for prediction
  metrics: {
    totalReferrals: {
      type: Number,
      default: 0,
    },
    successfulReferrals: {
      type: Number,
      default: 0,
    },
    conversionRate: {
      type: Number,
      default: 0,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
    networkSize: {
      type: Number,
      default: 0,
    },
    directReferrals: {
      type: Number,
      default: 0,
    },
    tierLevel: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum'],
    },
    avgReferralQuality: {
      type: Number,
      min: 0,
      max: 100,
    },
    responseTime: {
      type: Number,
      default: 0,
    },
    activityScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    engagementRate: {
      type: Number,
      min: 0,
      max: 100,
    },
  },
  
  // Performance classification
  classification: {
    type: String,
    enum: ['top_performer', 'high_performer', 'average', 'below_average', 'at_risk'],
  },
  
  // Predictions
  forecasts: {
    nextMonthReferrals: {
      type: Number,
    },
    nextMonthEarnings: {
      type: Number,
    },
    tierProgressionDate: {
      type: Date,
    },
    projectedNetworkSize: {
      type: Number,
    },
  },
  
  // Historical performance
  historicalPerformance: [HistoricalPerformanceSchema],
  
  // Recommendations
  recommendations: [{
    type: String,
    trim: true,
  }],
  
  // Risk assessment
  riskAssessment: {
    level: {
      type: String,
      enum: ['low', 'medium', 'high'],
    },
    factors: [{
      type: String,
      trim: true,
    }],
    churnRisk: {
      type: Number,
      min: 0,
      max: 100,
    },
  },
  
  // Outcome tracking
  outcome: PredictionOutcomeSchema,
  
  // Status
  status: {
    type: String,
    enum: ['active', 'validated', 'expired', 'archived'],
    default: 'active',
    index: true,
  },
  
  // Time period
  predictionPeriod: {
    start: {
      type: Date,
    },
    end: {
      type: Date,
    },
  },
  
  // Metadata
  modelVersion: {
    type: String,
    default: '1.0.0',
  },
  isAIGenerated: {
    type: Boolean,
    default: true,
  },
  generatedAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ==================== INDEXES ====================

ReferrerPredictionSchema.index({ referrerId: 1, type: 1, status: 1 });
ReferrerPredictionSchema.index({ type: 1, 'prediction.score': -1 });
ReferrerPredictionSchema.index({ classification: 1, 'prediction.score': -1 });
ReferrerPredictionSchema.index({ generatedAt: -1 });
ReferrerPredictionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { status: 'expired' } });

// ==================== VIRTUALS ====================

// Virtual for is expired
ReferrerPredictionSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Virtual for performance tier
ReferrerPredictionSchema.virtual('performanceTier').get(function() {
  const score = this.prediction?.score || 0;
  if (score >= 90) return 'exceptional';
  if (score >= 75) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'average';
  return 'needs_improvement';
});

// Virtual for predicted vs actual variance
ReferrerPredictionSchema.virtual('predictionVariance').get(function() {
  if (!this.outcome || !this.outcome.actualOutcome) return null;
  
  const predicted = this.prediction?.predictedValue;
  const actual = this.outcome.actualOutcome;
  
  if (typeof predicted === 'number' && typeof actual === 'number') {
    return actual - predicted;
  }
  
  return null;
});

// ==================== INSTANCE METHODS ====================

/**
 * Validate prediction
 * @param {Object} outcomeData - Outcome data
 * @returns {Promise<void>}
 */
ReferrerPredictionSchema.methods.validatePrediction = async function(outcomeData) {
  const { actualOutcome, validatedAt } = outcomeData;
  
  this.outcome = {
    ...this.outcome,
    actualOutcome,
    validatedAt: validatedAt || new Date(),
    accuracy: this.calculateAccuracy(actualOutcome),
  };
  
  this.status = 'validated';
  await this.save();
};

/**
 * Calculate prediction accuracy
 * @param {*} actualOutcome - Actual outcome
 * @returns {number} Accuracy score
 */
ReferrerPredictionSchema.methods.calculateAccuracy = function(actualOutcome) {
  const predicted = this.prediction?.predictedValue;
  
  if (typeof predicted === 'number' && typeof actualOutcome === 'number') {
    const error = Math.abs(predicted - actualOutcome) / actualOutcome;
    return Math.max(0, 100 - (error * 100));
  }
  
  if (typeof predicted === 'boolean' && typeof actualOutcome === 'boolean') {
    return predicted === actualOutcome ? 100 : 0;
  }
  
  return 50; // Default for non-numeric predictions
};

/**
 * Add historical performance
 * @param {Object} performance - Performance data
 * @returns {Promise<void>}
 */
ReferrerPredictionSchema.methods.addHistoricalPerformance = async function(performance) {
  this.historicalPerformance.push(performance);
  
  // Keep only last 12 periods
  if (this.historicalPerformance.length > 12) {
    this.historicalPerformance = this.historicalPerformance.slice(-12);
  }
  
  await this.save();
};

/**
 * Get performance trend
 * @returns {Object} Trend data
 */
ReferrerPredictionSchema.methods.getPerformanceTrend = function() {
  if (this.historicalPerformance.length < 2) {
    return { direction: 'stable', change: 0 };
  }
  
  const sorted = this.historicalPerformance.sort((a, b) => a.periodStart - b.periodStart);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  
  const conversionChange = last.conversionRate - first.conversionRate;
  
  let direction = 'stable';
  if (conversionChange > 5) direction = 'improving';
  else if (conversionChange < -5) direction = 'declining';
  
  return {
    direction,
    change: conversionChange,
    periods: sorted.length,
  };
};

/**
 * Generate recommendations
 * @returns {Array} Recommendations
 */
ReferrerPredictionSchema.methods.generateRecommendations = function() {
  const recommendations = [];
  const metrics = this.metrics;
  
  if (metrics.conversionRate < 20) {
    recommendations.push('Focus on quality over quantity - target candidates who closely match job requirements');
  }
  
  if (metrics.networkSize < 10) {
    recommendations.push('Expand your network by inviting more professionals to join');
  }
  
  if (metrics.activityScore < 50) {
    recommendations.push('Increase activity by checking for new job postings regularly');
  }
  
  if (metrics.engagementRate < 30) {
    recommendations.push('Engage with your referrals by following up on their application status');
  }
  
  if (metrics.responseTime > 48) {
    recommendations.push('Respond faster to referral opportunities to increase success rate');
  }
  
  return recommendations;
};

// ==================== STATIC METHODS ====================

/**
 * Find predictions for referrer
 * @param {string} referrerId - Referrer ID
 * @param {string} type - Prediction type
 * @returns {Promise<Array>}
 */
ReferrerPredictionSchema.statics.findForReferrer = function(referrerId, type) {
  const query = { referrerId, status: { $in: ['active', 'validated'] } };
  if (type) query.type = type;
  
  return this.find(query).sort({ generatedAt: -1 });
};

/**
 * Get top performers
 * @param {number} limit - Number of results
 * @returns {Promise<Array>}
 */
ReferrerPredictionSchema.statics.getTopPerformers = function(limit = 20) {
  return this.find({
    type: 'success_prediction',
    status: 'active',
    'prediction.score': { $gte: 75 },
  })
    .sort({ 'prediction.score': -1 })
    .limit(limit)
    .populate('referrerId', 'name avatar referrerProfile.tierLevel');
};

/**
 * Get at-risk referrers
 * @returns {Promise<Array>}
 */
ReferrerPredictionSchema.statics.getAtRiskReferrers = function() {
  return this.find({
    type: 'success_prediction',
    status: 'active',
    $or: [
      { classification: 'at_risk' },
      { 'riskAssessment.churnRisk': { $gte: 70 } },
    ],
  }).populate('referrerId', 'name email referrerProfile');
};

/**
 * Get referrer rankings
 * @param {string} period - Time period
 * @param {number} limit - Number of results
 * @returns {Promise<Array>}
 */
ReferrerPredictionSchema.statics.getRankings = async function(period = 'monthly', limit = 50) {
  return this.aggregate([
    {
      $match: {
        type: 'success_prediction',
        status: 'active',
      },
    },
    {
      $sort: { 'prediction.score': -1 },
    },
    {
      $limit: limit,
    },
    {
      $lookup: {
        from: 'users',
        localField: 'referrerId',
        foreignField: '_id',
        as: 'referrer',
      },
    },
    {
      $unwind: '$referrer',
    },
    {
      $project: {
        referrerId: 1,
        name: '$referrer.name',
        avatar: '$referrer.avatar',
        tierLevel: '$referrer.referrerProfile.tierLevel',
        score: '$prediction.score',
        classification: 1,
        metrics: 1,
      },
    },
  ]);
};

/**
 * Get prediction accuracy stats
 * @returns {Promise<Object>}
 */
ReferrerPredictionSchema.statics.getAccuracyStats = async function() {
  const stats = await this.aggregate([
    {
      $match: {
        status: 'validated',
        'outcome.accuracy': { $exists: true },
      },
    },
    {
      $group: {
        _id: '$type',
        total: { $sum: 1 },
        avgAccuracy: { $avg: '$outcome.accuracy' },
      },
    },
  ]);
  
  return stats.reduce((acc, stat) => {
    acc[stat._id] = { total: stat.total, avgAccuracy: stat.avgAccuracy };
    return acc;
  }, {});
};

/**
 * Get tier progression predictions
 * @returns {Promise<Array>}
 */
ReferrerPredictionSchema.statics.getTierProgressions = function() {
  return this.find({
    type: 'tier_progression',
    status: 'active',
    'forecasts.tierProgressionDate': { $exists: true },
  })
    .populate('referrerId', 'name avatar referrerProfile.tierLevel')
    .sort({ 'forecasts.tierProgressionDate': 1 });
};

/**
 * Get earnings forecast leaderboard
 * @param {number} limit - Number of results
 * @returns {Promise<Array>}
 */
ReferrerPredictionSchema.statics.getEarningsForecastLeaderboard = function(limit = 20) {
  return this.find({
    type: 'earnings_forecast',
    status: 'active',
    'forecasts.nextMonthEarnings': { $exists: true },
  })
    .sort({ 'forecasts.nextMonthEarnings': -1 })
    .limit(limit)
    .populate('referrerId', 'name avatar referrerProfile.tierLevel');
};

/**
 * Create or update prediction
 * @param {string} referrerId - Referrer ID
 * @param {string} type - Prediction type
 * @param {Object} predictionData - Prediction data
 * @returns {Promise<Object>}
 */
ReferrerPredictionSchema.statics.upsertPrediction = async function(referrerId, type, predictionData) {
  const existing = await this.findOne({
    referrerId,
    type,
    status: 'active',
  });
  
  if (existing) {
    // Archive existing prediction
    existing.status = 'archived';
    await existing.save();
  }
  
  // Create new prediction
  return this.create({
    referrerId,
    type,
    ...predictionData,
    generatedAt: new Date(),
  });
};

const ReferrerPrediction = mongoose.model('ReferrerPrediction', ReferrerPredictionSchema);

module.exports = ReferrerPrediction;
