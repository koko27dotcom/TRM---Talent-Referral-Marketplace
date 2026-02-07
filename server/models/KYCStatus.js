/**
 * KYC Status Model
 * Tracks Know Your Customer verification levels and status for users
 * Supports 4-tier verification system for Myanmar market
 *
 * Cache bust: 2026-02-03T16:46:00Z - Force Railway rebuild
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// KYC Level requirements
const KYC_LEVELS = {
  LEVEL_0: 0, // No verification
  LEVEL_1: 1, // Phone + Email verification
  LEVEL_2: 2, // NRC + Selfie verification
  LEVEL_3: 3, // Address + Bank account verification
  LEVEL_4: 4, // Business registration + TIN (for companies)
};

// KYC Status states
const KYC_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  PENDING_REVIEW: 'pending_review',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  SUSPENDED: 'suspended',
};

// Verification step schema
const VerificationStepSchema = new Schema({
  stepName: {
    type: String,
    required: true,
    enum: [
      'phone_verification',
      'email_verification',
      'nrc_upload',
      'nrc_ocr',
      'selfie_upload',
      'selfie_matching',
      'address_verification',
      'bank_verification',
      'business_registration',
      'tin_verification',
    ],
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed', 'skipped'],
    default: 'pending',
  },
  completedAt: {
    type: Date,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, { _id: false });

// Rejection reason schema
const RejectionReasonSchema = new Schema({
  code: {
    type: String,
    required: true,
    enum: [
      'document_unclear',
      'document_expired',
      'document_mismatch',
      'selfie_mismatch',
      'nrc_invalid',
      'phone_unverified',
      'email_unverified',
      'address_unverified',
      'bank_account_invalid',
      'business_not_registered',
      'tin_invalid',
      'suspicious_activity',
      'fraud_detected',
      'information_incomplete',
      'other',
    ],
  },
  message: {
    type: String,
    required: true,
  },
  field: {
    type: String,
  },
  rejectedAt: {
    type: Date,
    default: Date.now,
  },
  rejectedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, { _id: false });

// Main KYC Status Schema
const KYCStatusSchema = new Schema({
  // User reference
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    unique: true,
    index: true,
  },

  // Current verification level (0-4)
  currentLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 4,
    index: true,
  },

  // Target level user is trying to achieve
  targetLevel: {
    type: Number,
    default: 1,
    min: 1,
    max: 4,
  },

  // Overall KYC status
  status: {
    type: String,
    enum: Object.values(KYC_STATUS),
    default: KYC_STATUS.NOT_STARTED,
    index: true,
  },

  // Verification steps completed
  completedSteps: [VerificationStepSchema],

  // Level-specific status
  levelStatus: {
    level1: {
      status: {
        type: String,
        enum: Object.values(KYC_STATUS),
        default: KYC_STATUS.NOT_STARTED,
      },
      completedAt: Date,
      phoneVerified: {
        type: Boolean,
        default: false,
      },
      phoneVerifiedAt: Date,
      emailVerified: {
        type: Boolean,
        default: false,
      },
      emailVerifiedAt: Date,
    },
    level2: {
      status: {
        type: String,
        enum: Object.values(KYC_STATUS),
        default: KYC_STATUS.NOT_STARTED,
      },
      completedAt: Date,
      nrcVerified: {
        type: Boolean,
        default: false,
      },
      nrcVerifiedAt: Date,
      nrcNumber: {
        type: String,
        trim: true,
      },
      nrcStateRegion: {
        type: String,
        trim: true,
      },
      selfieVerified: {
        type: Boolean,
        default: false,
      },
      selfieVerifiedAt: Date,
      selfieMatchScore: {
        type: Number,
        min: 0,
        max: 100,
      },
    },
    level3: {
      status: {
        type: String,
        enum: Object.values(KYC_STATUS),
        default: KYC_STATUS.NOT_STARTED,
      },
      completedAt: Date,
      addressVerified: {
        type: Boolean,
        default: false,
      },
      addressVerifiedAt: Date,
      addressDetails: {
        street: String,
        township: String,
        city: String,
        state: String,
        postalCode: String,
        country: { type: String, default: 'Myanmar' },
      },
      bankVerified: {
        type: Boolean,
        default: false,
      },
      bankVerifiedAt: Date,
      bankDetails: {
        bankName: String,
        accountNumber: String,
        accountHolderName: String,
        branch: String,
      },
    },
    level4: {
      status: {
        type: String,
        enum: Object.values(KYC_STATUS),
        default: KYC_STATUS.NOT_STARTED,
      },
      completedAt: Date,
      businessType: {
        type: String,
        enum: ['sole_proprietorship', 'partnership', 'private_limited', 'public_limited', null],
        default: null,
      },
      businessRegistrationVerified: {
        type: Boolean,
        default: false,
      },
      businessRegistrationVerifiedAt: Date,
      businessRegistrationNumber: {
        type: String,
        trim: true,
      },
      companyName: {
        type: String,
        trim: true,
      },
      tinVerified: {
        type: Boolean,
        default: false,
      },
      tinVerifiedAt: Date,
      tinNumber: {
        type: String,
        trim: true,
      },
    },
  },

  // Rejection history
  rejectionHistory: [RejectionReasonSchema],

  // Current rejection (if status is rejected)
  currentRejection: {
    type: RejectionReasonSchema,
    default: null,
  },

  // Review information
  reviewInfo: {
    submittedAt: Date,
    reviewedAt: Date,
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewNotes: String,
    reviewDuration: Number, // in minutes
  },

  // Document references
  documents: [{
    type: Schema.Types.ObjectId,
    ref: 'KYCDocument',
  }],

  // Risk assessment
  riskScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  riskFactors: [{
    factor: String,
    score: Number,
    description: String,
  }],

  // Metadata
  metadata: {
    ipAddress: String,
    userAgent: String,
    deviceId: String,
    source: {
      type: String,
      enum: ['web', 'mobile_app', 'api', 'admin'],
      default: 'web',
    },
  },

  // Expiry (for periodic re-verification)
  expiresAt: {
    type: Date,
    index: true,
  },

  // Timestamps
  lastActivityAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Indexes for common queries
KYCStatusSchema.index({ status: 1, currentLevel: 1 });
KYCStatusSchema.index({ 'levelStatus.level2.status': 1 });
KYCStatusSchema.index({ 'levelStatus.level3.status': 1 });
KYCStatusSchema.index({ 'levelStatus.level4.status': 1 });
KYCStatusSchema.index({ riskScore: 1 });
KYCStatusSchema.index({ expiresAt: 1 });

// Instance methods

/**
 * Check if user has completed a specific level
 * @param {number} level - Level to check (1-4)
 * @returns {boolean}
 */
KYCStatusSchema.methods.hasCompletedLevel = function(level) {
  return this.currentLevel >= level;
};

/**
 * Get progress percentage for current target level
 * @returns {number}
 */
KYCStatusSchema.methods.getProgressPercentage = function() {
  const levelKey = `level${this.targetLevel}`;
  const levelData = this.levelStatus[levelKey];
  
  if (!levelData) return 0;
  
  const steps = this.completedSteps.filter(
    step => step.stepName.startsWith(`level${this.targetLevel}_`) || 
            (this.targetLevel === 1 && ['phone_verification', 'email_verification'].includes(step.stepName)) ||
            (this.targetLevel === 2 && ['nrc_upload', 'nrc_ocr', 'selfie_upload', 'selfie_matching'].includes(step.stepName))
  );
  
  const totalSteps = this.getTotalStepsForLevel(this.targetLevel);
  const completedSteps = steps.filter(s => s.status === 'completed').length;
  
  return Math.round((completedSteps / totalSteps) * 100);
};

/**
 * Get total steps required for a level
 * @param {number} level - Level number
 * @returns {number}
 */
KYCStatusSchema.methods.getTotalStepsForLevel = function(level) {
  const stepsMap = {
    1: 2, // phone + email
    2: 4, // nrc upload + ocr + selfie upload + matching
    3: 2, // address + bank
    4: 2, // business reg + tin
  };
  return stepsMap[level] || 0;
};

/**
 * Update step status
 * @param {string} stepName - Name of the step
 * @param {string} status - New status
 * @param {Object} metadata - Additional metadata
 */
KYCStatusSchema.methods.updateStep = async function(stepName, status, metadata = {}) {
  const stepIndex = this.completedSteps.findIndex(s => s.stepName === stepName);
  
  if (stepIndex >= 0) {
    this.completedSteps[stepIndex].status = status;
    if (status === 'completed') {
      this.completedSteps[stepIndex].completedAt = new Date();
    }
    this.completedSteps[stepIndex].metadata = { ...this.completedSteps[stepIndex].metadata, ...metadata };
  } else {
    this.completedSteps.push({
      stepName,
      status,
      completedAt: status === 'completed' ? new Date() : undefined,
      metadata,
    });
  }
  
  this.lastActivityAt = new Date();
  return this.save();
};

/**
 * Submit for review
 */
KYCStatusSchema.methods.submitForReview = async function() {
  this.status = KYC_STATUS.PENDING_REVIEW;
  this.reviewInfo.submittedAt = new Date();
  this.lastActivityAt = new Date();
  
  // Update level-specific status
  const levelKey = `level${this.targetLevel}`;
  if (this.levelStatus[levelKey]) {
    this.levelStatus[levelKey].status = KYC_STATUS.PENDING_REVIEW;
  }
  
  return this.save();
};

/**
 * Approve verification
 * @param {string} reviewerId - Admin user ID
 * @param {string} notes - Review notes
 */
KYCStatusSchema.methods.approve = async function(reviewerId, notes = '') {
  this.currentLevel = this.targetLevel;
  this.status = KYC_STATUS.VERIFIED;
  
  const levelKey = `level${this.targetLevel}`;
  if (this.levelStatus[levelKey]) {
    this.levelStatus[levelKey].status = KYC_STATUS.VERIFIED;
    this.levelStatus[levelKey].completedAt = new Date();
  }
  
  this.reviewInfo.reviewedAt = new Date();
  this.reviewInfo.reviewedBy = reviewerId;
  this.reviewInfo.reviewNotes = notes;
  
  if (this.reviewInfo.submittedAt) {
    this.reviewInfo.reviewDuration = Math.round(
      (new Date() - this.reviewInfo.submittedAt) / (1000 * 60)
    );
  }
  
  // Clear current rejection
  this.currentRejection = null;
  
  // Set expiry for re-verification (1 year)
  this.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  
  this.lastActivityAt = new Date();
  return this.save();
};

/**
 * Reject verification
 * @param {Object} reason - Rejection reason
 * @param {string} reviewerId - Admin user ID
 */
KYCStatusSchema.methods.reject = async function(reason, reviewerId) {
  this.status = KYC_STATUS.REJECTED;
  
  const rejectionData = {
    ...reason,
    rejectedAt: new Date(),
    rejectedBy: reviewerId,
  };
  
  this.currentRejection = rejectionData;
  this.rejectionHistory.push(rejectionData);
  
  const levelKey = `level${this.targetLevel}`;
  if (this.levelStatus[levelKey]) {
    this.levelStatus[levelKey].status = KYC_STATUS.REJECTED;
  }
  
  this.reviewInfo.reviewedAt = new Date();
  this.reviewInfo.reviewedBy = reviewerId;
  
  this.lastActivityAt = new Date();
  return this.save();
};

// Static methods

/**
 * Find pending reviews
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
KYCStatusSchema.statics.findPendingReviews = function(options = {}) {
  const { limit = 50, skip = 0, level } = options;
  
  const query = { status: KYC_STATUS.PENDING_REVIEW };
  if (level) {
    query.targetLevel = level;
  }
  
  return this.find(query)
    .populate('userId', 'name email phone')
    .sort({ 'reviewInfo.submittedAt': 1 })
    .skip(skip)
    .limit(limit);
};

/**
 * Find users requiring re-verification
 * @returns {Promise<Array>}
 */
KYCStatusSchema.statics.findExpiringSoon = function(days = 30) {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + days);
  
  return this.find({
    expiresAt: { $lte: threshold, $gt: new Date() },
    status: KYC_STATUS.VERIFIED,
  }).populate('userId', 'name email');
};

/**
 * Get KYC statistics
 * @returns {Promise<Object>}
 */
KYCStatusSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        byStatus: {
          $push: {
            kyc: {
              status: '$status',
              level: '$currentLevel',
            },
          },
        },
        avgLevel: { $avg: '$currentLevel' },
        level0: { $sum: { $cond: [{ $eq: ['$currentLevel', 0] }, 1, 0] } },
        level1: { $sum: { $cond: [{ $eq: ['$currentLevel', 1] }, 1, 0] } },
        level2: { $sum: { $cond: [{ $eq: ['$currentLevel', 2] }, 1, 0] } },
        level3: { $sum: { $cond: [{ $eq: ['$currentLevel', 3] }, 1, 0] } },
        level4: { $sum: { $cond: [{ $eq: ['$currentLevel', 4] }, 1, 0] } },
        pendingReview: { $sum: { $cond: [{ $eq: ['$status', KYC_STATUS.PENDING_REVIEW] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ['$status', KYC_STATUS.REJECTED] }, 1, 0] } },
      },
    },
  ]);
  
  return stats[0] || {
    total: 0,
    avgLevel: 0,
    level0: 0,
    level1: 0,
    level2: 0,
    level3: 0,
    level4: 0,
    pendingReview: 0,
    rejected: 0,
  };
};

// Pre-save middleware
KYCStatusSchema.pre('save', function(next) {
  this.lastActivityAt = new Date();
  next();
});

const KYCStatus = mongoose.model('KYCStatus', KYCStatusSchema);

module.exports = KYCStatus;
