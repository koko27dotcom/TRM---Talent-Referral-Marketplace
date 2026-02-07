/**
 * ReferrerQuality Model
 * Tracks referrer performance metrics and quality scores
 * Used for lead scoring and network optimization
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Performance metrics schema
const PerformanceMetricsSchema = new Schema({
  // Referral metrics
  totalReferrals: {
    type: Number,
    default: 0,
    min: 0,
  },
  successfulReferrals: {
    type: Number,
    default: 0,
    min: 0,
  },
  rejectedReferrals: {
    type: Number,
    default: 0,
    min: 0,
  },
  pendingReferrals: {
    type: Number,
    default: 0,
    min: 0,
  },
  
  // Conversion metrics
  interviewsScheduled: {
    type: Number,
    default: 0,
    min: 0,
  },
  offersExtended: {
    type: Number,
    default: 0,
    min: 0,
  },
  hiresMade: {
    type: Number,
    default: 0,
    min: 0,
  },
  
  // Financial metrics
  totalEarnings: {
    type: Number,
    default: 0,
    min: 0,
  },
  avgBonusPerHire: {
    type: Number,
    default: 0,
    min: 0,
  },
  
  // Quality metrics
  avgTimeToHire: {
    type: Number,
    default: 0,
    min: 0,
  }, // Days
  responseRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  candidateQualityScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
}, { _id: false });

// Monthly performance snapshot
const MonthlySnapshotSchema = new Schema({
  month: {
    type: String,
    required: true,
    match: [/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'],
  },
  referralsSubmitted: {
    type: Number,
    default: 0,
  },
  successfulHires: {
    type: Number,
    default: 0,
  },
  earnings: {
    type: Number,
    default: 0,
  },
  qualityScore: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: true });

// Company interaction tracking
const CompanyInteractionSchema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  referralsCount: {
    type: Number,
    default: 0,
  },
  successfulHires: {
    type: Number,
    default: 0,
  },
  lastReferralAt: {
    type: Date,
  },
  relationshipStrength: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
}, { _id: true });

// Quality rating history
const QualityRatingHistorySchema = new Schema({
  rating: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  ratedAt: {
    type: Date,
    default: Date.now,
  },
  ratedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  reason: {
    type: String,
    trim: true,
  },
}, { _id: true });

// Main ReferrerQuality Schema
const ReferrerQualitySchema = new Schema({
  // Reference to user
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  
  // Overall quality score (0-100)
  qualityScore: {
    type: Number,
    default: 50,
    min: 0,
    max: 100,
    index: true,
  },
  
  // Quality tier
  tier: {
    type: String,
    enum: ['elite', 'high', 'standard', 'low', 'unproven'],
    default: 'unproven',
    index: true,
  },
  
  // Performance metrics
  metrics: {
    type: PerformanceMetricsSchema,
    default: () => ({}),
  },
  
  // Success rate percentage
  successRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  
  // Reliability score (based on consistency, response time, etc.)
  reliabilityScore: {
    type: Number,
    default: 50,
    min: 0,
    max: 100,
  },
  
  // Engagement score (activity level)
  engagementScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  
  // Monthly performance history
  monthlyHistory: [MonthlySnapshotSchema],
  
  // Company relationships
  companyInteractions: [CompanyInteractionSchema],
  
  // Quality rating history
  ratingHistory: [QualityRatingHistorySchema],
  
  // Flags
  flags: {
    isVip: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isBlacklisted: {
      type: Boolean,
      default: false,
    },
    blacklistReason: {
      type: String,
      trim: true,
    },
  },
  
  // Last activity
  lastReferralAt: {
    type: Date,
  },
  lastActiveAt: {
    type: Date,
  },
  
  // Calculation timestamps
  lastCalculatedAt: {
    type: Date,
    default: Date.now,
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

ReferrerQualitySchema.index({ userId: 1 }, { unique: true });
ReferrerQualitySchema.index({ qualityScore: -1 });
ReferrerQualitySchema.index({ tier: 1, qualityScore: -1 });
ReferrerQualitySchema.index({ successRate: -1 });
ReferrerQualitySchema.index({ 'metrics.totalReferrals': -1 });
ReferrerQualitySchema.index({ 'metrics.hiresMade': -1 });
ReferrerQualitySchema.index({ 'flags.isVip': 1, qualityScore: -1 });
ReferrerQualitySchema.index({ lastActiveAt: -1 });
ReferrerQualitySchema.index({ createdAt: -1 });

// ==================== VIRTUALS ====================

// Virtual for conversion rate
ReferrerQualitySchema.virtual('conversionRate').get(function() {
  if (this.metrics.totalReferrals === 0) return 0;
  return (this.metrics.hiresMade / this.metrics.totalReferrals) * 100;
});

// Virtual for is active
ReferrerQualitySchema.virtual('isActive').get(function() {
  if (!this.lastActiveAt) return false;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return this.lastActiveAt > thirtyDaysAgo;
});

// Virtual for referrals this month
ReferrerQualitySchema.virtual('referralsThisMonth').get(function() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const snapshot = this.monthlyHistory.find(m => m.month === currentMonth);
  return snapshot ? snapshot.referralsSubmitted : 0;
});

// ==================== INSTANCE METHODS ====================

/**
 * Update performance metrics
 * @param {Object} updates - Metric updates
 * @returns {Promise<void>}
 */
ReferrerQualitySchema.methods.updateMetrics = async function(updates) {
  Object.keys(updates).forEach(key => {
    if (this.metrics[key] !== undefined) {
      this.metrics[key] = updates[key];
    }
  });
  
  // Recalculate success rate
  if (this.metrics.totalReferrals > 0) {
    this.successRate = (this.metrics.successfulReferrals / this.metrics.totalReferrals) * 100;
  }
  
  this.lastCalculatedAt = new Date();
  await this.save();
};

/**
 * Increment referral count
 * @param {boolean} wasSuccessful - Whether referral was successful
 * @returns {Promise<void>}
 */
ReferrerQualitySchema.methods.incrementReferral = async function(wasSuccessful = false) {
  this.metrics.totalReferrals += 1;
  
  if (wasSuccessful) {
    this.metrics.successfulReferrals += 1;
    this.metrics.hiresMade += 1;
  }
  
  this.lastReferralAt = new Date();
  this.lastActiveAt = new Date();
  
  // Update monthly snapshot
  const currentMonth = new Date().toISOString().slice(0, 7);
  let snapshot = this.monthlyHistory.find(m => m.month === currentMonth);
  
  if (!snapshot) {
    snapshot = { month: currentMonth, referralsSubmitted: 0, successfulHires: 0, earnings: 0, qualityScore: 0 };
    this.monthlyHistory.push(snapshot);
  }
  
  snapshot.referralsSubmitted += 1;
  if (wasSuccessful) {
    snapshot.successfulHires += 1;
  }
  
  // Recalculate success rate
  if (this.metrics.totalReferrals > 0) {
    this.successRate = (this.metrics.successfulReferrals / this.metrics.totalReferrals) * 100;
  }
  
  await this.save();
};

/**
 * Update company interaction
 * @param {string} companyId - Company ID
 * @param {boolean} wasSuccessful - Whether referral was successful
 * @returns {Promise<void>}
 */
ReferrerQualitySchema.methods.updateCompanyInteraction = async function(companyId, wasSuccessful = false) {
  let interaction = this.companyInteractions.find(
    ci => ci.companyId.toString() === companyId.toString()
  );
  
  if (!interaction) {
    interaction = { companyId, referralsCount: 0, successfulHires: 0, relationshipStrength: 0 };
    this.companyInteractions.push(interaction);
  }
  
  interaction.referralsCount += 1;
  interaction.lastReferralAt = new Date();
  
  if (wasSuccessful) {
    interaction.successfulHires += 1;
  }
  
  // Update relationship strength based on activity
  interaction.relationshipStrength = Math.min(100, 
    20 + (interaction.referralsCount * 5) + (interaction.successfulHires * 15)
  );
  
  await this.save();
};

/**
 * Calculate quality score
 * @returns {Promise<number>}
 */
ReferrerQualitySchema.methods.calculateQualityScore = async function() {
  // Base score
  let score = 50;
  
  // Success rate contribution (max 30 points)
  score += (this.successRate / 100) * 30;
  
  // Volume contribution (max 15 points)
  const volumeScore = Math.min(this.metrics.totalReferrals / 10, 1) * 15;
  score += volumeScore;
  
  // Reliability contribution (max 20 points)
  score += (this.reliabilityScore / 100) * 20;
  
  // Engagement contribution (max 15 points)
  score += (this.engagementScore / 100) * 15;
  
  // VIP bonus
  if (this.flags.isVip) score += 10;
  
  // Verification bonus
  if (this.flags.isVerified) score += 5;
  
  // Blacklist penalty
  if (this.flags.isBlacklisted) score = 0;
  
  // Cap at 100
  this.qualityScore = Math.min(100, Math.max(0, score));
  
  // Update tier based on score
  if (this.qualityScore >= 90) this.tier = 'elite';
  else if (this.qualityScore >= 75) this.tier = 'high';
  else if (this.qualityScore >= 50) this.tier = 'standard';
  else if (this.qualityScore >= 25) this.tier = 'low';
  else this.tier = 'unproven';
  
  this.lastCalculatedAt = new Date();
  await this.save();
  
  return this.qualityScore;
};

// ==================== STATIC METHODS ====================

/**
 * Find or create referrer quality record
 * @param {string} userId - User ID
 * @returns {Promise<Document>}
 */
ReferrerQualitySchema.statics.findOrCreate = async function(userId) {
  let quality = await this.findOne({ userId });
  
  if (!quality) {
    quality = await this.create({ userId });
  }
  
  return quality;
};

/**
 * Get top referrers by quality score
 * @param {number} limit - Number of results
 * @returns {Promise<Array>}
 */
ReferrerQualitySchema.statics.getTopReferrers = async function(limit = 10) {
  return this.find({ 'flags.isBlacklisted': false })
    .sort({ qualityScore: -1 })
    .limit(limit)
    .populate('userId', 'name email avatar')
    .lean();
};

/**
 * Get referrers by tier
 * @param {string} tier - Tier level
 * @returns {Promise<Array>}
 */
ReferrerQualitySchema.statics.getByTier = async function(tier) {
  return this.find({ tier, 'flags.isBlacklisted': false })
    .sort({ qualityScore: -1 })
    .populate('userId', 'name email avatar')
    .lean();
};

/**
 * Get quality metrics for a company
 * @param {string} companyId - Company ID
 * @returns {Promise<Object>}
 */
ReferrerQualitySchema.statics.getCompanyMetrics = async function(companyId) {
  const referrers = await this.find({
    'companyInteractions.companyId': companyId,
  });
  
  const totalReferrers = referrers.length;
  const totalReferrals = referrers.reduce((sum, r) => {
    const interaction = r.companyInteractions.find(
      ci => ci.companyId.toString() === companyId.toString()
    );
    return sum + (interaction ? interaction.referralsCount : 0);
  }, 0);
  
  const totalHires = referrers.reduce((sum, r) => {
    const interaction = r.companyInteractions.find(
      ci => ci.companyId.toString() === companyId.toString()
    );
    return sum + (interaction ? interaction.successfulHires : 0);
  }, 0);
  
  return {
    totalReferrers,
    totalReferrals,
    totalHires,
    conversionRate: totalReferrals > 0 ? (totalHires / totalReferrals) * 100 : 0,
    avgQualityScore: totalReferrers > 0 
      ? referrers.reduce((sum, r) => sum + r.qualityScore, 0) / totalReferrers 
      : 0,
  };
};

// Create and export the model
const ReferrerQuality = mongoose.model('ReferrerQuality', ReferrerQualitySchema);

module.exports = ReferrerQuality;
