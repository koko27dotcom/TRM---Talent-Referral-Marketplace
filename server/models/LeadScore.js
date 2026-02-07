/**
 * LeadScore Model
 * Stores lead scoring data for candidates and companies
 * Tracks score history and conversion predictions
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Score factors breakdown schema
const ScoreFactorsSchema = new Schema({
  // Candidate scoring factors (0-100 total)
  profileCompleteness: {
    type: Number,
    default: 0,
    min: 0,
    max: 20,
  },
  experienceMatch: {
    type: Number,
    default: 0,
    min: 0,
    max: 25,
  },
  skillsMatch: {
    type: Number,
    default: 0,
    min: 0,
    max: 25,
  },
  referrerQuality: {
    type: Number,
    default: 0,
    min: 0,
    max: 15,
  },
  pastSuccessRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 15,
  },
  
  // Company scoring factors (0-100 total)
  jobPostingFrequency: {
    type: Number,
    default: 0,
    min: 0,
    max: 20,
  },
  referralBonusSize: {
    type: Number,
    default: 0,
    min: 0,
    max: 20,
  },
  responseTime: {
    type: Number,
    default: 0,
    min: 0,
    max: 20,
  },
  payoutHistory: {
    type: Number,
    default: 0,
    min: 0,
    max: 20,
  },
  subscriptionTier: {
    type: Number,
    default: 0,
    min: 0,
    max: 20,
  },
  
  // Additional factors
  engagementScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 20,
  },
  whatsappEngagement: {
    type: Number,
    default: 0,
    min: 0,
    max: 10,
  },
}, { _id: false });

// Score history entry schema
const ScoreHistorySchema = new Schema({
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  factors: {
    type: ScoreFactorsSchema,
    default: () => ({}),
  },
  calculatedAt: {
    type: Date,
    default: Date.now,
  },
  calculatedBy: {
    type: String,
    enum: ['system', 'manual', 'api'],
    default: 'system',
  },
  reason: {
    type: String,
    trim: true,
  },
}, { _id: true });

// Alert schema for high-value leads
const AlertSchema = new Schema({
  type: {
    type: String,
    enum: ['high_value_company', 'high_value_candidate', 'hot_lead', 'follow_up', 'conversion_ready'],
    required: true,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  triggeredAt: {
    type: Date,
    default: Date.now,
  },
  acknowledgedAt: {
    type: Date,
  },
  acknowledgedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  dismissedAt: {
    type: Date,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, { _id: true });

// Main LeadScore Schema
const LeadScoreSchema = new Schema({
  // Entity reference (polymorphic - can be candidate or company)
  entityType: {
    type: String,
    enum: ['candidate', 'company'],
    required: true,
    index: true,
  },
  entityId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  
  // Current score (0-100)
  totalScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
    index: true,
  },
  
  // Score grade (A, B, C, D, F)
  grade: {
    type: String,
    enum: ['A', 'B', 'C', 'D', 'F'],
    default: 'F',
    index: true,
  },
  
  // Score category
  category: {
    type: String,
    enum: ['hot', 'warm', 'cold', 'dead'],
    default: 'cold',
    index: true,
  },
  
  // Score breakdown
  factors: {
    type: ScoreFactorsSchema,
    default: () => ({}),
  },
  
  // Conversion prediction
  conversionProbability: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  predictedValue: {
    type: Number,
    default: 0,
    min: 0,
  },
  
  // Score history
  history: [ScoreHistorySchema],
  
  // Alerts
  alerts: [AlertSchema],
  
  // Last calculation
  lastCalculatedAt: {
    type: Date,
    default: Date.now,
  },
  nextCalculationAt: {
    type: Date,
  },
  
  // Caching
  cacheExpiresAt: {
    type: Date,
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'converted', 'lost'],
    default: 'active',
    index: true,
  },
  
  // Metadata
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ==================== INDEXES ====================

// Compound index for entity lookup
LeadScoreSchema.index({ entityType: 1, entityId: 1 }, { unique: true });

// Score-based indexes for querying
LeadScoreSchema.index({ totalScore: -1, entityType: 1 });
LeadScoreSchema.index({ category: 1, totalScore: -1 });
LeadScoreSchema.index({ grade: 1, entityType: 1 });
LeadScoreSchema.index({ conversionProbability: -1 });
LeadScoreSchema.index({ status: 1, totalScore: -1 });

// Time-based indexes
LeadScoreSchema.index({ lastCalculatedAt: -1 });
LeadScoreSchema.index({ cacheExpiresAt: 1 });
LeadScoreSchema.index({ createdAt: -1 });

// ==================== VIRTUALS ====================

// Virtual for score color
LeadScoreSchema.virtual('scoreColor').get(function() {
  if (this.totalScore >= 80) return 'green';
  if (this.totalScore >= 60) return 'blue';
  if (this.totalScore >= 40) return 'yellow';
  if (this.totalScore >= 20) return 'orange';
  return 'red';
});

// Virtual for is hot lead
LeadScoreSchema.virtual('isHotLead').get(function() {
  return this.totalScore >= 80 && this.entityType === 'company';
});

// Virtual for active alerts count
LeadScoreSchema.virtual('activeAlertsCount').get(function() {
  return this.alerts.filter(alert => !alert.dismissedAt && !alert.acknowledgedAt).length;
});

// ==================== INSTANCE METHODS ====================

/**
 * Update score with new calculation
 * @param {number} newScore - New total score
 * @param {Object} factors - Score breakdown
 * @param {string} reason - Reason for update
 * @returns {Promise<void>}
 */
LeadScoreSchema.methods.updateScore = async function(newScore, factors = {}, reason = 'Automatic calculation') {
  // Add to history
  this.history.push({
    score: this.totalScore,
    factors: this.factors,
    calculatedAt: this.lastCalculatedAt,
    reason: 'Previous score archived',
  });
  
  // Update current score
  this.totalScore = Math.min(100, Math.max(0, newScore));
  this.factors = factors;
  this.lastCalculatedAt = new Date();
  this.cacheExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour cache
  
  // Update grade
  if (this.totalScore >= 90) this.grade = 'A';
  else if (this.totalScore >= 80) this.grade = 'B';
  else if (this.totalScore >= 60) this.grade = 'C';
  else if (this.totalScore >= 40) this.grade = 'D';
  else this.grade = 'F';
  
  // Update category
  if (this.totalScore >= 80) this.category = 'hot';
  else if (this.totalScore >= 50) this.category = 'warm';
  else if (this.totalScore >= 20) this.category = 'cold';
  else this.category = 'dead';
  
  await this.save();
};

/**
 * Add a new alert
 * @param {Object} alertData - Alert data
 * @returns {Promise<void>}
 */
LeadScoreSchema.methods.addAlert = async function(alertData) {
  this.alerts.push(alertData);
  await this.save();
};

/**
 * Acknowledge an alert
 * @param {string} alertId - Alert ID
 * @param {string} userId - User acknowledging
 * @returns {Promise<boolean>}
 */
LeadScoreSchema.methods.acknowledgeAlert = async function(alertId, userId) {
  const alert = this.alerts.id(alertId);
  if (!alert || alert.acknowledgedAt || alert.dismissedAt) {
    return false;
  }
  
  alert.acknowledgedAt = new Date();
  alert.acknowledgedBy = userId;
  await this.save();
  return true;
};

/**
 * Dismiss an alert
 * @param {string} alertId - Alert ID
 * @returns {Promise<boolean>}
 */
LeadScoreSchema.methods.dismissAlert = async function(alertId) {
  const alert = this.alerts.id(alertId);
  if (!alert || alert.dismissedAt) {
    return false;
  }
  
  alert.dismissedAt = new Date();
  await this.save();
  return true;
};

/**
 * Check if score cache is valid
 * @returns {boolean}
 */
LeadScoreSchema.methods.isCacheValid = function() {
  return this.cacheExpiresAt && this.cacheExpiresAt > new Date();
};

// ==================== STATIC METHODS ====================

/**
 * Find or create lead score for an entity
 * @param {string} entityType - 'candidate' or 'company'
 * @param {string} entityId - Entity ID
 * @returns {Promise<Document>}
 */
LeadScoreSchema.statics.findOrCreate = async function(entityType, entityId) {
  let leadScore = await this.findOne({ entityType, entityId });
  
  if (!leadScore) {
    leadScore = await this.create({
      entityType,
      entityId,
      totalScore: 0,
      status: 'active',
    });
  }
  
  return leadScore;
};

/**
 * Get top scored entities
 * @param {string} entityType - 'candidate' or 'company'
 * @param {number} limit - Number of results
 * @returns {Promise<Array>}
 */
LeadScoreSchema.statics.getTopScored = async function(entityType, limit = 10) {
  return this.find({ entityType, status: 'active' })
    .sort({ totalScore: -1 })
    .limit(limit)
    .lean();
};

/**
 * Get hot leads (score >= 80)
 * @param {string} entityType - 'candidate' or 'company'
 * @returns {Promise<Array>}
 */
LeadScoreSchema.statics.getHotLeads = async function(entityType) {
  return this.find({
    entityType,
    totalScore: { $gte: 80 },
    status: 'active',
  })
    .sort({ totalScore: -1 })
    .lean();
};

/**
 * Get entities needing score recalculation
 * @param {number} limit - Number of results
 * @returns {Promise<Array>}
 */
LeadScoreSchema.statics.getNeedsRecalculation = async function(limit = 100) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  return this.find({
    $or: [
      { cacheExpiresAt: { $lt: new Date() } },
      { cacheExpiresAt: { $exists: false } },
      { lastCalculatedAt: { $lt: oneHourAgo } },
    ],
    status: 'active',
  })
    .limit(limit)
    .lean();
};

// Create and export the model
const LeadScore = mongoose.model('LeadScore', LeadScoreSchema);

module.exports = LeadScore;
