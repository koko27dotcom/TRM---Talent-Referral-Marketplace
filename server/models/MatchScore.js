/**
 * MatchScore Model
 * Stores compatibility ratings between jobs and candidates
 * Used for AI-powered job-candidate matching algorithm
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Individual scoring factor breakdown
const FactorScoreSchema = new Schema({
  skillsMatch: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  experienceMatch: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  locationMatch: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  salaryMatch: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  candidateQuality: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  referrerNetworkQuality: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
}, { _id: false });

// Match score status constants
const MATCH_SCORE_STATUS = {
  CALCULATED: 'calculated',
  VIEWED: 'viewed',
  REFERRED: 'referred',
  APPLIED: 'applied',
  HIRED: 'hired',
  EXPIRED: 'expired',
};

// Main MatchScore Schema
const MatchScoreSchema = new Schema({
  // Relationships
  jobId: {
    type: Schema.Types.ObjectId,
    ref: 'Job',
    required: [true, 'Job ID is required'],
    index: true,
  },
  candidateId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Candidate ID is required'],
    index: true,
  },
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company ID is required'],
    index: true,
  },

  // Overall match score (0-100)
  overallScore: {
    type: Number,
    required: [true, 'Overall score is required'],
    min: 0,
    max: 100,
    index: true,
  },

  // Is this a perfect match (score > 90)
  isPerfectMatch: {
    type: Boolean,
    default: false,
    index: true,
  },

  // Individual factor scores
  factorScores: {
    type: FactorScoreSchema,
    required: true,
  },

  // Score weights used for calculation
  weights: {
    skillsWeight: { type: Number, default: 0.30 },
    experienceWeight: { type: Number, default: 0.25 },
    locationWeight: { type: Number, default: 0.15 },
    salaryWeight: { type: Number, default: 0.15 },
    candidateQualityWeight: { type: Number, default: 0.10 },
    referrerNetworkWeight: { type: Number, default: 0.05 },
  },

  // Matching details
  matchedSkills: [{
    type: String,
    trim: true,
  }],
  missingSkills: [{
    type: String,
    trim: true,
  }],
  skillMatchPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },

  // Candidate quality snapshot at time of scoring
  candidateQualitySnapshot: {
    profileCompleteness: { type: Number, min: 0, max: 100, default: 0 },
    pastSuccessRate: { type: Number, min: 0, max: 100, default: 0 },
    totalReferrals: { type: Number, default: 0 },
    successfulHires: { type: Number, default: 0 },
    referrerTier: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum'], default: 'bronze' },
    networkSize: { type: Number, default: 0 },
  },

  // Job requirements snapshot
  jobRequirementsSnapshot: {
    requiredSkills: [{
      type: String,
      trim: true,
    }],
    experienceLevel: {
      type: String,
      enum: ['entry', 'mid', 'senior', 'lead', 'executive'],
    },
    locationType: {
      type: String,
      enum: ['onsite', 'remote', 'hybrid'],
    },
    salaryMin: { type: Number },
    salaryMax: { type: Number },
  },

  // Status tracking
  status: {
    type: String,
    enum: Object.values(MATCH_SCORE_STATUS),
    default: MATCH_SCORE_STATUS.CALCULATED,
    index: true,
  },

  // Referral tracking
  referralId: {
    type: Schema.Types.ObjectId,
    ref: 'Referral',
  },
  referredBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },

  // Application tracking
  applicationId: {
    type: Schema.Types.ObjectId,
    ref: 'Application',
  },

  // Notification tracking
  notificationsSent: [{
    type: {
      type: String,
      enum: ['instant_match_alert', 'suggestion_to_referrer', 'job_alert'],
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    referrerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  }],

  // View tracking
  viewedBy: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    viewedAt: {
      type: Date,
      default: Date.now,
    },
  }],

  // Algorithm version
  algorithmVersion: {
    type: String,
    default: '1.0.0',
  },

  // Calculation metadata
  calculatedAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    index: true,
  },

  // AI/ML metadata
  aiMetadata: {
    modelVersion: { type: String },
    confidenceScore: { type: Number, min: 0, max: 100 },
    featureImportance: {
      type: Map,
      of: Number,
    },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ==================== INDEXES ====================

// Compound indexes for common queries
MatchScoreSchema.index({ jobId: 1, overallScore: -1 });
MatchScoreSchema.index({ candidateId: 1, overallScore: -1 });
MatchScoreSchema.index({ jobId: 1, candidateId: 1 }, { unique: true });
MatchScoreSchema.index({ companyId: 1, status: 1 });
MatchScoreSchema.index({ isPerfectMatch: 1, status: 1 });
MatchScoreSchema.index({ status: 1, calculatedAt: -1 });
MatchScoreSchema.index({ 'candidateQualitySnapshot.referrerTier': 1, overallScore: -1 });

// TTL index for expired match scores
MatchScoreSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $exists: true } } });

// ==================== VIRTUALS ====================

// Virtual for match quality label
MatchScoreSchema.virtual('matchQuality').get(function() {
  if (this.overallScore >= 90) return 'perfect';
  if (this.overallScore >= 75) return 'excellent';
  if (this.overallScore >= 60) return 'good';
  if (this.overallScore >= 40) return 'fair';
  return 'poor';
});

// Virtual for days since calculated
MatchScoreSchema.virtual('daysSinceCalculated').get(function() {
  const diffTime = Math.abs(new Date() - this.calculatedAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// ==================== MIDDLEWARE ====================

// Pre-save middleware to set isPerfectMatch and expiresAt
MatchScoreSchema.pre('save', function(next) {
  // Set isPerfectMatch flag
  this.isPerfectMatch = this.overallScore >= 90;

  // Set expiration date (30 days from calculation)
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }

  next();
});

// ==================== INSTANCE METHODS ====================

/**
 * Mark match score as viewed
 * @param {string} userId - User who viewed
 * @returns {Promise<void>}
 */
MatchScoreSchema.methods.markAsViewed = async function(userId) {
  const alreadyViewed = this.viewedBy.some(v => v.userId.toString() === userId.toString());

  if (!alreadyViewed) {
    this.viewedBy.push({ userId, viewedAt: new Date() });
  }

  if (this.status === MATCH_SCORE_STATUS.CALCULATED) {
    this.status = MATCH_SCORE_STATUS.VIEWED;
  }

  await this.save();
};

/**
 * Mark match score as referred
 * @param {string} referralId - Referral ID
 * @param {string} referrerId - Referrer ID
 * @returns {Promise<void>}
 */
MatchScoreSchema.methods.markAsReferred = async function(referralId, referrerId) {
  this.status = MATCH_SCORE_STATUS.REFERRED;
  this.referralId = referralId;
  this.referredBy = referrerId;
  await this.save();
};

/**
 * Mark match score as applied
 * @param {string} applicationId - Application ID
 * @returns {Promise<void>}
 */
MatchScoreSchema.methods.markAsApplied = async function(applicationId) {
  this.status = MATCH_SCORE_STATUS.APPLIED;
  this.applicationId = applicationId;
  await this.save();
};

/**
 * Mark match score as hired
 * @returns {Promise<void>}
 */
MatchScoreSchema.methods.markAsHired = async function() {
  this.status = MATCH_SCORE_STATUS.HIRED;
  await this.save();
};

/**
 * Add notification record
 * @param {string} type - Notification type
 * @param {string} referrerId - Referrer ID (optional)
 * @returns {Promise<void>}
 */
MatchScoreSchema.methods.addNotification = async function(type, referrerId = null) {
  this.notificationsSent.push({
    type,
    sentAt: new Date(),
    referrerId,
  });
  await this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Find top matching candidates for a job
 * @param {string} jobId - Job ID
 * @param {number} limit - Number of results
 * @param {number} minScore - Minimum match score
 * @returns {Promise<Array>}
 */
MatchScoreSchema.statics.findTopCandidatesForJob = function(jobId, limit = 5, minScore = 0) {
  return this.find({
    jobId,
    overallScore: { $gte: minScore },
    status: { $in: [MATCH_SCORE_STATUS.CALCULATED, MATCH_SCORE_STATUS.VIEWED] },
  })
    .populate('candidateId', 'name email avatar jobseekerProfile referrerProfile')
    .sort({ overallScore: -1 })
    .limit(limit);
};

/**
 * Find top matching jobs for a candidate
 * @param {string} candidateId - Candidate ID
 * @param {number} limit - Number of results
 * @param {number} minScore - Minimum match score
 * @returns {Promise<Array>}
 */
MatchScoreSchema.statics.findTopJobsForCandidate = function(candidateId, limit = 10, minScore = 0) {
  return this.find({
    candidateId,
    overallScore: { $gte: minScore },
    status: { $in: [MATCH_SCORE_STATUS.CALCULATED, MATCH_SCORE_STATUS.VIEWED] },
  })
    .populate('jobId', 'title companyId location type salary experienceLevel')
    .populate('companyId', 'name slug logo')
    .sort({ overallScore: -1 })
    .limit(limit);
};

/**
 * Find perfect matches (score > 90) that haven't been notified
 * @param {string} jobId - Job ID (optional)
 * @returns {Promise<Array>}
 */
MatchScoreSchema.statics.findUnnotifiedPerfectMatches = function(jobId = null) {
  const query = {
    isPerfectMatch: true,
    status: MATCH_SCORE_STATUS.CALCULATED,
    'notificationsSent.type': { $ne: 'instant_match_alert' },
  };

  if (jobId) {
    query.jobId = jobId;
  }

  return this.find(query)
    .populate('candidateId', 'name email avatar')
    .populate('jobId', 'title companyId location')
    .populate('companyId', 'name slug');
};

/**
 * Find suggestions for a referrer
 * @param {string} referrerId - Referrer ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
MatchScoreSchema.statics.findSuggestionsForReferrer = async function(referrerId, options = {}) {
  const { limit = 5, minScore = 60, jobId = null } = options;

  const query = {
    overallScore: { $gte: minScore },
    status: { $in: [MATCH_SCORE_STATUS.CALCULATED, MATCH_SCORE_STATUS.VIEWED] },
    $or: [
      { 'notificationsSent.referrerId': { $ne: referrerId } },
      { notificationsSent: { $size: 0 } },
    ],
  };

  if (jobId) {
    query.jobId = jobId;
  }

  return this.find(query)
    .populate('candidateId', 'name email avatar jobseekerProfile referrerProfile')
    .populate('jobId', 'title companyId location type salary referralBonus')
    .populate('companyId', 'name slug logo')
    .sort({ overallScore: -1, 'candidateQualitySnapshot.pastSuccessRate': -1 })
    .limit(limit);
};

/**
 * Get or create match score
 * @param {string} jobId - Job ID
 * @param {string} candidateId - Candidate ID
 * @param {Object} scoreData - Score data
 * @returns {Promise<Document>}
 */
MatchScoreSchema.statics.getOrCreate = async function(jobId, candidateId, scoreData) {
  let matchScore = await this.findOne({ jobId, candidateId });

  if (matchScore) {
    // Update existing score
    Object.assign(matchScore, scoreData);
    matchScore.calculatedAt = new Date();
    await matchScore.save();
  } else {
    // Create new score
    matchScore = await this.create({
      jobId,
      candidateId,
      ...scoreData,
    });
  }

  return matchScore;
};

/**
 * Get match statistics for a job
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>}
 */
MatchScoreSchema.statics.getJobMatchStats = async function(jobId) {
  const stats = await this.aggregate([
    { $match: { jobId: new mongoose.Types.ObjectId(jobId) } },
    {
      $group: {
        _id: null,
        totalMatches: { $sum: 1 },
        averageScore: { $avg: '$overallScore' },
        perfectMatches: { $sum: { $cond: ['$isPerfectMatch', 1, 0] } },
        highMatches: { $sum: { $cond: [{ $gte: ['$overallScore', 75] }, 1, 0] } },
        goodMatches: { $sum: { $cond: [{ $gte: ['$overallScore', 60] }, 1, 0] } },
        referredCount: { $sum: { $cond: [{ $eq: ['$status', 'referred'] }, 1, 0] } },
        hiredCount: { $sum: { $cond: [{ $eq: ['$status', 'hired'] }, 1, 0] } },
      },
    },
  ]);

  return stats[0] || {
    totalMatches: 0,
    averageScore: 0,
    perfectMatches: 0,
    highMatches: 0,
    goodMatches: 0,
    referredCount: 0,
    hiredCount: 0,
  };
};

/**
 * Get candidate's match statistics
 * @param {string} candidateId - Candidate ID
 * @returns {Promise<Object>}
 */
MatchScoreSchema.statics.getCandidateMatchStats = async function(candidateId) {
  const stats = await this.aggregate([
    { $match: { candidateId: new mongoose.Types.ObjectId(candidateId) } },
    {
      $group: {
        _id: null,
        totalMatches: { $sum: 1 },
        averageScore: { $avg: '$overallScore' },
        perfectMatches: { $sum: { $cond: ['$isPerfectMatch', 1, 0] } },
        highestScore: { $max: '$overallScore' },
        jobsReferred: { $sum: { $cond: [{ $eq: ['$status', 'referred'] }, 1, 0] } },
        jobsApplied: { $sum: { $cond: [{ $eq: ['$status', 'applied'] }, 1, 0] } },
        jobsHired: { $sum: { $cond: [{ $eq: ['$status', 'hired'] }, 1, 0] } },
      },
    },
  ]);

  return stats[0] || {
    totalMatches: 0,
    averageScore: 0,
    perfectMatches: 0,
    highestScore: 0,
    jobsReferred: 0,
    jobsApplied: 0,
    jobsHired: 0,
  };
};

/**
 * Delete expired match scores
 * @returns {Promise<Object>}
 */
MatchScoreSchema.statics.cleanupExpired = async function() {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() },
    status: { $in: [MATCH_SCORE_STATUS.CALCULATED, MATCH_SCORE_STATUS.VIEWED, MATCH_SCORE_STATUS.EXPIRED] },
  });

  return result;
};

// Create and export the model
const MatchScore = mongoose.model('MatchScore', MatchScoreSchema);

module.exports = MatchScore;
