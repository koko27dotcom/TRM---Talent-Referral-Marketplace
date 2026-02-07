/**
 * AnalyticsInsight Model
 * Stores AI-generated insights and predictions for the TRM platform
 * Tracks prediction accuracy and provides historical insight data
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Prediction factors schema - stores what factors influenced the prediction
const PredictionFactorsSchema = new Schema({
  factor: {
    type: String,
    required: true,
  },
  weight: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
  },
  value: {
    type: Schema.Types.Mixed,
  },
  impact: {
    type: String,
    enum: ['positive', 'negative', 'neutral'],
    default: 'neutral',
  },
}, { _id: false });

// Accuracy tracking schema
const AccuracyTrackingSchema = new Schema({
  actualOutcome: {
    type: Schema.Types.Mixed,
  },
  accuracyScore: {
    type: Number,
    min: 0,
    max: 100,
  },
  validatedAt: {
    type: Date,
  },
  validatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  notes: {
    type: String,
  },
}, { _id: false });

// Main AnalyticsInsight Schema
const AnalyticsInsightSchema = new Schema({
  // Insight classification
  type: {
    type: String,
    enum: [
      'candidate_hire_prediction',
      'salary_benchmark',
      'hiring_velocity',
      'referrer_success_prediction',
      'company_churn_prediction',
      'market_trend',
      'job_performance_prediction',
      'skill_gap_analysis',
      'retention_prediction',
    ],
    required: true,
    index: true,
  },
  
  // Target entity
  targetType: {
    type: String,
    enum: ['candidate', 'job', 'company', 'referrer', 'market', 'skill'],
    required: true,
  },
  targetId: {
    type: Schema.Types.ObjectId,
    index: true,
  },
  
  // Prediction details
  prediction: {
    value: {
      type: Schema.Types.Mixed,
      required: true,
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    probability: {
      type: Number,
      min: 0,
      max: 100,
    },
    factors: [PredictionFactorsSchema],
  },
  
  // Context data used for prediction
  context: {
    timeframe: {
      type: String,
      enum: ['immediate', 'short_term', 'medium_term', 'long_term'],
      default: 'short_term',
    },
    location: {
      type: String,
    },
    industry: {
      type: String,
    },
    experienceLevel: {
      type: String,
      enum: ['entry', 'junior', 'mid', 'senior', 'executive'],
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  
  // Insight details
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  recommendation: {
    type: String,
    trim: true,
  },
  
  // Risk assessment (for predictions)
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
  },
  riskFactors: [{
    type: String,
    trim: true,
  }],
  
  // Accuracy tracking
  accuracy: {
    type: AccuracyTrackingSchema,
    default: () => ({}),
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'validated', 'expired', 'archived'],
    default: 'active',
    index: true,
  },
  
  // Expiration
  expiresAt: {
    type: Date,
    index: true,
  },
  
  // Model version for tracking improvements
  modelVersion: {
    type: String,
    default: '1.0.0',
  },
  
  // Generation metadata
  generatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  generatedAt: {
    type: Date,
    default: Date.now,
  },
  
  // View tracking
  viewCount: {
    type: Number,
    default: 0,
  },
  lastViewedAt: {
    type: Date,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ==================== INDEXES ====================

AnalyticsInsightSchema.index({ type: 1, targetType: 1, status: 1 });
AnalyticsInsightSchema.index({ targetId: 1, type: 1 });
AnalyticsInsightSchema.index({ 'prediction.confidence': -1 });
AnalyticsInsightSchema.index({ generatedAt: -1 });
AnalyticsInsightSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { status: 'expired' } });
AnalyticsInsightSchema.index({ type: 1, 'context.location': 1, 'context.industry': 1 });

// ==================== VIRTUALS ====================

// Virtual for is expired
AnalyticsInsightSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Virtual for days until expiration
AnalyticsInsightSchema.virtual('daysUntilExpiration').get(function() {
  if (!this.expiresAt) return null;
  const diff = this.expiresAt - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Virtual for prediction accuracy status
AnalyticsInsightSchema.virtual('accuracyStatus').get(function() {
  if (!this.accuracy || !this.accuracy.accuracyScore) return 'pending';
  if (this.accuracy.accuracyScore >= 80) return 'high';
  if (this.accuracy.accuracyScore >= 60) return 'medium';
  return 'low';
});

// ==================== INSTANCE METHODS ====================

/**
 * Validate prediction accuracy
 * @param {Object} validationData - Validation data
 * @returns {Promise<void>}
 */
AnalyticsInsightSchema.methods.validateAccuracy = async function(validationData) {
  const { actualOutcome, validatedBy, notes } = validationData;
  
  this.accuracy.actualOutcome = actualOutcome;
  this.accuracy.validatedAt = new Date();
  this.accuracy.validatedBy = validatedBy;
  this.accuracy.notes = notes;
  
  // Calculate accuracy score based on prediction type
  this.accuracy.accuracyScore = this.calculateAccuracyScore(actualOutcome);
  
  this.status = 'validated';
  await this.save();
};

/**
 * Calculate accuracy score
 * @param {*} actualOutcome - Actual outcome
 * @returns {number} Accuracy score (0-100)
 */
AnalyticsInsightSchema.methods.calculateAccuracyScore = function(actualOutcome) {
  const predicted = this.prediction.value;
  
  switch (this.type) {
    case 'candidate_hire_prediction':
    case 'referrer_success_prediction':
    case 'company_churn_prediction':
      // Binary predictions - exact match
      return predicted === actualOutcome ? 100 : 0;
    
    case 'salary_benchmark':
    case 'hiring_velocity':
      // Numeric predictions - percentage error
      if (typeof predicted === 'number' && typeof actualOutcome === 'number') {
        const error = Math.abs(predicted - actualOutcome) / actualOutcome;
        return Math.max(0, 100 - (error * 100));
      }
      return 0;
    
    default:
      return 50; // Default neutral score
  }
};

/**
 * Increment view count
 * @returns {Promise<void>}
 */
AnalyticsInsightSchema.methods.incrementViews = async function() {
  this.viewCount += 1;
  this.lastViewedAt = new Date();
  await this.save();
};

/**
 * Archive insight
 * @returns {Promise<void>}
 */
AnalyticsInsightSchema.methods.archive = async function() {
  this.status = 'archived';
  await this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Find insights by type
 * @param {string} type - Insight type
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
AnalyticsInsightSchema.statics.findByType = function(type, options = {}) {
  const query = { type, status: { $in: ['active', 'validated'] } };
  
  return this.find(query)
    .sort(options.sort || { generatedAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

/**
 * Find insights for target
 * @param {string} targetId - Target ID
 * @param {string} targetType - Target type
 * @returns {Promise<Array>}
 */
AnalyticsInsightSchema.statics.findForTarget = function(targetId, targetType) {
  return this.find({
    targetId,
    targetType,
    status: { $in: ['active', 'validated'] },
  }).sort({ generatedAt: -1 });
};

/**
 * Get high confidence insights
 * @param {number} minConfidence - Minimum confidence level
 * @returns {Promise<Array>}
 */
AnalyticsInsightSchema.statics.findHighConfidence = function(minConfidence = 80) {
  return this.find({
    'prediction.confidence': { $gte: minConfidence },
    status: 'active',
  }).sort({ 'prediction.confidence': -1 });
};

/**
 * Get insights by location and industry
 * @param {string} location - Location
 * @param {string} industry - Industry
 * @returns {Promise<Array>}
 */
AnalyticsInsightSchema.statics.findByContext = function(location, industry) {
  const query = { status: 'active' };
  
  if (location) query['context.location'] = location;
  if (industry) query['context.industry'] = industry;
  
  return this.find(query).sort({ generatedAt: -1 });
};

/**
 * Get model accuracy statistics
 * @param {string} type - Insight type
 * @returns {Promise<Object>}
 */
AnalyticsInsightSchema.statics.getAccuracyStats = async function(type) {
  const matchStage = { status: 'validated' };
  if (type) matchStage.type = type;
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalValidated: { $sum: 1 },
        avgAccuracy: { $avg: '$accuracy.accuracyScore' },
        highAccuracy: {
          $sum: { $cond: [{ $gte: ['$accuracy.accuracyScore', 80] }, 1, 0] },
        },
        mediumAccuracy: {
          $sum: { $cond: [{ $and: [{ $gte: ['$accuracy.accuracyScore', 60] }, { $lt: ['$accuracy.accuracyScore', 80] }] }, 1, 0] },
        },
        lowAccuracy: {
          $sum: { $cond: [{ $lt: ['$accuracy.accuracyScore', 60] }, 1, 0] },
        },
      },
    },
  ]);
  
  return stats[0] || {
    totalValidated: 0,
    avgAccuracy: 0,
    highAccuracy: 0,
    mediumAccuracy: 0,
    lowAccuracy: 0,
  };
};

/**
 * Clean up expired insights
 * @returns {Promise<number>} Number of insights expired
 */
AnalyticsInsightSchema.statics.cleanupExpired = async function() {
  const result = await this.updateMany(
    {
      expiresAt: { $lt: new Date() },
      status: 'active',
    },
    {
      $set: { status: 'expired' },
    }
  );
  
  return result.modifiedCount;
};

const AnalyticsInsight = mongoose.model('AnalyticsInsight', AnalyticsInsightSchema);

module.exports = AnalyticsInsight;
