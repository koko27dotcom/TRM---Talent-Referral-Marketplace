/**
 * Referral Model
 * Represents a referral submission from a referrer to a job
 * Tracks the full referral lifecycle from submission to payment
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Status history entry schema
const StatusHistorySchema = new Schema({
  status: {
    type: String,
    required: true,
  },
  changedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  changedByType: {
    type: String,
    enum: ['system', 'referrer', 'recruiter', 'admin'],
    default: 'system',
  },
  changedAt: {
    type: Date,
    default: Date.now,
  },
  notes: {
    type: String,
    trim: true,
  },
}, { _id: true });

// Referred person schema
const ReferredPersonSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Candidate name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Candidate email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
  },
  phone: {
    type: String,
    trim: true,
  },
  resumeUrl: {
    type: String,
    trim: true,
  },
  linkedInUrl: {
    type: String,
    trim: true,
  },
  currentCompany: {
    type: String,
    trim: true,
  },
  currentTitle: {
    type: String,
    trim: true,
  },
  yearsOfExperience: {
    type: Number,
    min: 0,
  },
}, { _id: false });

// Source tracking schema
const SourceSchema = new Schema({
  channel: {
    type: String,
    enum: ['direct', 'facebook', 'linkedin', 'whatsapp', 'email', 'telegram', 'other'],
    default: 'direct',
  },
  ipAddress: {
    type: String,
    trim: true,
  },
  userAgent: {
    type: String,
    trim: true,
  },
  referrerUrl: {
    type: String,
    trim: true,
  },
  utmSource: {
    type: String,
    trim: true,
  },
  utmMedium: {
    type: String,
    trim: true,
  },
  utmCampaign: {
    type: String,
    trim: true,
  },
}, { _id: false });

// Payout schema
const PayoutSchema = new Schema({
  status: {
    type: String,
    enum: ['pending', 'approved', 'processing', 'paid', 'rejected', 'not_applicable'],
    default: 'not_applicable',
  },
  requestedAt: {
    type: Date,
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: {
    type: Date,
  },
  processedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  processedAt: {
    type: Date,
  },
  paidAt: {
    type: Date,
  },
  paymentMethod: {
    type: String,
    enum: ['kbzpay', 'wavepay', 'bank_transfer'],
  },
  paymentDetails: {
    type: Schema.Types.Mixed,
  },
  transactionId: {
    type: String,
    trim: true,
  },
  receiptUrl: {
    type: String,
    trim: true,
  },
  rejectionReason: {
    type: String,
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
  },
}, { _id: false });

// Referral status constants
const REFERRAL_STATUS = {
  DRAFT: 'draft', // Draft status for Refer to Unlock gamification
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  SHORTLISTED: 'shortlisted',
  INTERVIEW_SCHEDULED: 'interview_scheduled',
  INTERVIEW_COMPLETED: 'interview_completed',
  OFFER_EXTENDED: 'offer_extended',
  HIRED: 'hired',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
  PAYMENT_PENDING: 'payment_pending',
  PAID: 'paid',
};

// Status flow - defines valid status transitions
const STATUS_FLOW = {
  [REFERRAL_STATUS.DRAFT]: [REFERRAL_STATUS.SUBMITTED, REFERRAL_STATUS.WITHDRAWN], // Draft can be submitted or withdrawn
  [REFERRAL_STATUS.SUBMITTED]: [REFERRAL_STATUS.UNDER_REVIEW, REFERRAL_STATUS.REJECTED, REFERRAL_STATUS.WITHDRAWN],
  [REFERRAL_STATUS.UNDER_REVIEW]: [REFERRAL_STATUS.SHORTLISTED, REFERRAL_STATUS.REJECTED, REFERRAL_STATUS.WITHDRAWN],
  [REFERRAL_STATUS.SHORTLISTED]: [REFERRAL_STATUS.INTERVIEW_SCHEDULED, REFERRAL_STATUS.REJECTED, REFERRAL_STATUS.WITHDRAWN],
  [REFERRAL_STATUS.INTERVIEW_SCHEDULED]: [REFERRAL_STATUS.INTERVIEW_COMPLETED, REFERRAL_STATUS.REJECTED, REFERRAL_STATUS.WITHDRAWN],
  [REFERRAL_STATUS.INTERVIEW_COMPLETED]: [REFERRAL_STATUS.OFFER_EXTENDED, REFERRAL_STATUS.REJECTED, REFERRAL_STATUS.WITHDRAWN],
  [REFERRAL_STATUS.OFFER_EXTENDED]: [REFERRAL_STATUS.HIRED, REFERRAL_STATUS.REJECTED, REFERRAL_STATUS.WITHDRAWN],
  [REFERRAL_STATUS.HIRED]: [REFERRAL_STATUS.PAYMENT_PENDING],
  [REFERRAL_STATUS.PAYMENT_PENDING]: [REFERRAL_STATUS.PAID],
  [REFERRAL_STATUS.REJECTED]: [],
  [REFERRAL_STATUS.WITHDRAWN]: [],
  [REFERRAL_STATUS.PAID]: [],
};

// Main Referral Schema
const ReferralSchema = new Schema({
  // Unique referral code
  code: {
    type: String,
    required: [true, 'Referral code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  },
  
  // Relationships
  jobId: {
    type: Schema.Types.ObjectId,
    ref: 'Job',
    required: [true, 'Job is required'],
    index: true,
  },
  referrerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Referrer is required'],
    index: true,
  },
  referredUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  
  // Referred person details
  referredPerson: {
    type: ReferredPersonSchema,
    required: [true, 'Referred person details are required'],
  },
  
  // Source tracking
  source: {
    type: SourceSchema,
    default: () => ({}),
  },
  
  // Status
  status: {
    type: String,
    enum: Object.values(REFERRAL_STATUS),
    default: REFERRAL_STATUS.SUBMITTED,
    index: true,
  },
  
  // Status history
  statusHistory: [StatusHistorySchema],
  
  // Financial details
  referralBonus: {
    type: Number,
    required: [true, 'Referral bonus is required'],
    min: 0,
  },
  platformCommission: {
    type: Number,
    default: function() {
      return this.referralBonus * 0.15; // 15% commission
    },
  },
  referrerPayout: {
    type: Number,
    default: function() {
      return this.referralBonus * 0.85; // 85% to referrer
    },
  },
  perHireFee: {
    type: Number,
    default: 50000, // 50,000 MMK per-hire fee
  },
  currency: {
    type: String,
    default: 'MMK',
  },
  
  // Payout information
  payout: {
    type: PayoutSchema,
    default: () => ({}),
  },
  
  // Notes
  internalNotes: {
    type: String,
    trim: true,
  },
  referrerNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters'],
  },
  
  // Important dates
  submittedAt: {
    type: Date,
    default: Date.now,
  },
  reviewedAt: {
    type: Date,
  },
  shortlistedAt: {
    type: Date,
  },
  interviewScheduledAt: {
    type: Date,
  },
  interviewCompletedAt: {
    type: Date,
  },
  offerExtendedAt: {
    type: Date,
  },
  hiredAt: {
    type: Date,
  },
  rejectedAt: {
    type: Date,
  },
  withdrawnAt: {
    type: Date,
  },
  paidAt: {
    type: Date,
  },
  
  // Withdrawal
  withdrawnBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  withdrawalReason: {
    type: String,
    trim: true,
  },
  
  // Rejection
  rejectedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  rejectionReason: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ==================== INDEXES ====================

ReferralSchema.index({ code: 1 }, { unique: true });
ReferralSchema.index({ referrerId: 1, status: 1 });
ReferralSchema.index({ jobId: 1, status: 1 });
ReferralSchema.index({ status: 1, 'payout.status': 1 });
ReferralSchema.index({ 'referredPerson.email': 1 });
ReferralSchema.index({ submittedAt: -1 });
ReferralSchema.index({ hiredAt: -1 });

// ==================== VIRTUALS ====================

// Virtual for days since submission
ReferralSchema.virtual('daysSinceSubmitted').get(function() {
  const diffTime = Math.abs(new Date() - this.submittedAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for current stage in pipeline
ReferralSchema.virtual('pipelineStage').get(function() {
  const stages = [
    REFERRAL_STATUS.SUBMITTED,
    REFERRAL_STATUS.UNDER_REVIEW,
    REFERRAL_STATUS.SHORTLISTED,
    REFERRAL_STATUS.INTERVIEW_SCHEDULED,
    REFERRAL_STATUS.INTERVIEW_COMPLETED,
    REFERRAL_STATUS.OFFER_EXTENDED,
    REFERRAL_STATUS.HIRED,
    REFERRAL_STATUS.PAID,
  ];
  return stages.indexOf(this.status);
});

// Virtual for is active (not rejected, withdrawn, or paid)
ReferralSchema.virtual('isActive').get(function() {
  return !['rejected', 'withdrawn', 'paid'].includes(this.status);
});

// Virtual for is hired
ReferralSchema.virtual('isHired').get(function() {
  return ['hired', 'payment_pending', 'paid'].includes(this.status);
});

// Virtual for is payable
ReferralSchema.virtual('isPayable').get(function() {
  return this.status === 'hired' || this.status === 'payment_pending';
});

// ==================== MIDDLEWARE ====================

// Pre-save middleware to initialize status history
ReferralSchema.pre('save', function(next) {
  if (this.isNew) {
    this.statusHistory.push({
      status: this.status,
      changedAt: this.submittedAt,
      notes: 'Referral submitted',
    });
  }
  next();
});

// ==================== INSTANCE METHODS ====================

/**
 * Update referral status
 * @param {string} newStatus - New status
 * @param {Object} options - Update options
 * @returns {Promise<void>}
 */
ReferralSchema.methods.updateStatus = async function(newStatus, options = {}) {
  const { changedBy, changedByType = 'system', notes } = options;
  
  // Validate status transition
  const validTransitions = STATUS_FLOW[this.status] || [];
  if (!validTransitions.includes(newStatus) && this.status !== newStatus) {
    throw new Error(`Invalid status transition from ${this.status} to ${newStatus}`);
  }
  
  const oldStatus = this.status;
  this.status = newStatus;
  
  // Add to status history
  this.statusHistory.push({
    status: newStatus,
    changedBy,
    changedByType,
    changedAt: new Date(),
    notes,
  });
  
  // Update timestamp fields
  const timestampField = `${newStatus}At`;
  if (this[timestampField] !== undefined) {
    this[timestampField] = new Date();
  }
  
  // Special handling for hired status
  if (newStatus === REFERRAL_STATUS.HIRED) {
    this.payout.status = 'pending';
  }
  
  await this.save();
  
  return {
    oldStatus,
    newStatus,
    changedAt: new Date(),
  };
};

/**
 * Withdraw referral
 * @param {string} userId - User withdrawing
 * @param {string} reason - Withdrawal reason
 * @returns {Promise<void>}
 */
ReferralSchema.methods.withdraw = async function(userId, reason) {
  this.withdrawnBy = userId;
  this.withdrawalReason = reason;
  await this.updateStatus(REFERRAL_STATUS.WITHDRAWN, {
    changedBy: userId,
    changedByType: 'referrer',
    notes: reason,
  });
};

/**
 * Reject referral
 * @param {string} userId - User rejecting
 * @param {string} reason - Rejection reason
 * @returns {Promise<void>}
 */
ReferralSchema.methods.reject = async function(userId, reason) {
  this.rejectedBy = userId;
  this.rejectionReason = reason;
  await this.updateStatus(REFERRAL_STATUS.REJECTED, {
    changedBy: userId,
    changedByType: 'recruiter',
    notes: reason,
  });
};

/**
 * Request payout
 * @returns {Promise<void>}
 */
ReferralSchema.methods.requestPayout = async function() {
  if (this.status !== REFERRAL_STATUS.HIRED) {
    throw new Error('Cannot request payout: referral is not hired');
  }
  
  this.payout.status = 'pending';
  this.payout.requestedAt = new Date();
  await this.updateStatus(REFERRAL_STATUS.PAYMENT_PENDING, {
    changedByType: 'system',
    notes: 'Payout requested',
  });
};

/**
 * Mark as paid
 * @param {Object} paymentDetails - Payment information
 * @returns {Promise<void>}
 */
ReferralSchema.methods.markAsPaid = async function(paymentDetails) {
  const { processedBy, transactionId, receiptUrl, paymentMethod, paymentDetails: details } = paymentDetails;
  
  this.payout.status = 'paid';
  this.payout.processedBy = processedBy;
  this.payout.processedAt = new Date();
  this.payout.paidAt = new Date();
  this.payout.transactionId = transactionId;
  this.payout.receiptUrl = receiptUrl;
  this.payout.paymentMethod = paymentMethod;
  this.payout.paymentDetails = details;
  
  await this.updateStatus(REFERRAL_STATUS.PAID, {
    changedBy: processedBy,
    changedByType: 'admin',
    notes: `Payment processed: ${transactionId}`,
  });
};

// ==================== STATIC METHODS ====================

/**
 * Find referral by code
 * @param {string} code - Referral code
 * @returns {Promise<Document|null>}
 */
ReferralSchema.statics.findByCode = function(code) {
  return this.findOne({ code: code.toUpperCase() });
};

/**
 * Find referrals by referrer
 * @param {string} referrerId - Referrer user ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
ReferralSchema.statics.findByReferrer = function(referrerId, options = {}) {
  const query = { referrerId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .populate('jobId', 'title companyId slug')
    .populate('jobId.companyId', 'name slug logo')
    .sort(options.sort || { submittedAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

/**
 * Find referrals by job
 * @param {string} jobId - Job ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
ReferralSchema.statics.findByJob = function(jobId, options = {}) {
  const query = { jobId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .populate('referrerId', 'name email avatar')
    .sort(options.sort || { submittedAt: -1 });
};

/**
 * Get referrer statistics
 * @param {string} referrerId - Referrer user ID
 * @returns {Promise<Object>}
 */
ReferralSchema.statics.getReferrerStats = async function(referrerId) {
  const stats = await this.aggregate([
    { $match: { referrerId: new mongoose.Types.ObjectId(referrerId) } },
    {
      $group: {
        _id: null,
        totalReferrals: { $sum: 1 },
        hired: {
          $sum: {
            $cond: [{ $in: ['$status', ['hired', 'payment_pending', 'paid']] }, 1, 0],
          },
        },
        pending: {
          $sum: {
            $cond: [{ $in: ['$status', ['submitted', 'under_review', 'shortlisted', 'interview_scheduled', 'interview_completed', 'offer_extended']] }, 1, 0],
          },
        },
        rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
        withdrawn: { $sum: { $cond: [{ $eq: ['$status', 'withdrawn'] }, 1, 0] } },
        totalEarnings: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$referrerPayout', 0] } },
        pendingEarnings: { $sum: { $cond: [{ $eq: ['$status', 'payment_pending'] }, '$referrerPayout', 0] } },
      },
    },
  ]);
  
  return stats[0] || {
    totalReferrals: 0,
    hired: 0,
    pending: 0,
    rejected: 0,
    withdrawn: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
  };
};

/**
 * Get company referral statistics
 * @param {string} companyId - Company ID
 * @returns {Promise<Object>}
 */
ReferralSchema.statics.getCompanyStats = async function(companyId) {
  // First get all jobs for this company
  const Job = mongoose.model('Job');
  const jobs = await Job.find({ companyId }).select('_id');
  const jobIds = jobs.map(job => job._id);
  
  const stats = await this.aggregate([
    { $match: { jobId: { $in: jobIds } } },
    {
      $group: {
        _id: null,
        totalReferrals: { $sum: 1 },
        hired: { $sum: { $cond: [{ $in: ['$status', ['hired', 'payment_pending', 'paid']] }, 1, 0] } },
        pending: {
          $sum: {
            $cond: [{ $in: ['$status', ['submitted', 'under_review', 'shortlisted', 'interview_scheduled', 'interview_completed', 'offer_extended']] }, 1, 0],
          },
        },
        rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
        totalSpent: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$referralBonus', 0] } },
        pendingSpend: { $sum: { $cond: [{ $in: ['$status', ['hired', 'payment_pending']] }, '$referralBonus', 0] } },
      },
    },
  ]);
  
  return stats[0] || {
    totalReferrals: 0,
    hired: 0,
    pending: 0,
    rejected: 0,
    totalSpent: 0,
    pendingSpend: 0,
  };
};

/**
 * Generate unique referral code
 * @returns {string}
 */
ReferralSchema.statics.generateCode = function() {
  const prefix = 'REF';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${code}`;
};

// Create and export the model
const Referral = mongoose.model('Referral', ReferralSchema);

module.exports = Referral;
