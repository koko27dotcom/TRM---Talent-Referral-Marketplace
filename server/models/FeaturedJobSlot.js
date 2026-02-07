/**
 * FeaturedJobSlot Model
 * Represents premium featured job slots on the platform
 * Supports auction-style bidding for top placement spots
 * Tracks performance metrics and manages slot availability
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Performance metrics schema
const PerformanceMetricsSchema = new Schema({
  views: {
    type: Number,
    default: 0,
    min: 0,
  },
  uniqueViews: {
    type: Number,
    default: 0,
    min: 0,
  },
  clicks: {
    type: Number,
    default: 0,
    min: 0,
  },
  applications: {
    type: Number,
    default: 0,
    min: 0,
  },
  referrals: {
    type: Number,
    default: 0,
    min: 0,
  },
  hires: {
    type: Number,
    default: 0,
    min: 0,
  },
  ctr: { // Click-through rate
    type: Number,
    default: 0,
  },
  conversionRate: { // Application rate
    type: Number,
    default: 0,
  },
}, { _id: false });

// Bid history schema for auction tracking
const BidHistorySchema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  jobId: {
    type: Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
  },
  bidAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  bidAt: {
    type: Date,
    default: Date.now,
  },
  isWinning: {
    type: Boolean,
    default: false,
  },
}, { _id: true });

// Main FeaturedJobSlot Schema
const FeaturedJobSlotSchema = new Schema({
  // Slot identification
  slotPosition: {
    type: Number,
    required: [true, 'Slot position is required'],
    min: 1,
    max: 10,
    index: true,
  },
  slotName: {
    type: String,
    trim: true,
    default: function() {
      return `Position ${this.slotPosition}`;
    },
  },
  
  // Relationships
  jobId: {
    type: Schema.Types.ObjectId,
    ref: 'Job',
    index: true,
  },
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company is required'],
    index: true,
  },
  
  // Auction/Bidding
  bidAmount: {
    type: Number,
    required: [true, 'Bid amount is required'],
    min: 0,
  },
  minimumBid: {
    type: Number,
    default: 25000, // MMK - minimum bid for featured slot
  },
  bidHistory: [BidHistorySchema],
  
  // Duration
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    index: true,
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    index: true,
  },
  durationDays: {
    type: Number,
    default: 7,
    min: 1,
    max: 30,
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'active', 'expired', 'cancelled', 'rejected'],
    default: 'pending',
    index: true,
  },
  
  // Approval workflow
  isApproved: {
    type: Boolean,
    default: false,
  },
  approvedAt: {
    type: Date,
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  rejectionReason: {
    type: String,
    trim: true,
  },
  
  // Payment
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded', 'waived'],
    default: 'pending',
  },
  billingRecordId: {
    type: Schema.Types.ObjectId,
    ref: 'BillingRecord',
  },
  paidAt: {
    type: Date,
  },
  
  // Performance metrics
  metrics: {
    type: PerformanceMetricsSchema,
    default: () => ({}),
  },
  
  // Rotation settings
  isAutoRotate: {
    type: Boolean,
    default: false,
  },
  rotationPriority: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  
  // Slot type
  slotType: {
    type: String,
    enum: ['carousel', 'sidebar', 'banner', 'homepage_hero'],
    default: 'carousel',
  },
  
  // Priority boost (for auction winners)
  priorityBoost: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  
  // Metadata
  notes: {
    type: String,
    trim: true,
  },
  cancelledAt: {
    type: Date,
  },
  cancelledBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  cancellationReason: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ==================== INDEXES ====================

FeaturedJobSlotSchema.index({ status: 1, slotPosition: 1, endDate: 1 });
FeaturedJobSlotSchema.index({ companyId: 1, status: 1, createdAt: -1 });
FeaturedJobSlotSchema.index({ jobId: 1, status: 1 });
FeaturedJobSlotSchema.index({ slotPosition: 1, bidAmount: -1 });
FeaturedJobSlotSchema.index({ endDate: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { status: 'active' } });

// ==================== VIRTUALS ====================

// Virtual for days remaining
FeaturedJobSlotSchema.virtual('daysRemaining').get(function() {
  if (!this.endDate || this.status !== 'active') return 0;
  const diffTime = this.endDate - new Date();
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
});

// Virtual for is expired
FeaturedJobSlotSchema.virtual('isExpired').get(function() {
  return this.endDate && this.endDate < new Date();
});

// Virtual for total bid count
FeaturedJobSlotSchema.virtual('totalBids').get(function() {
  return this.bidHistory?.length || 0;
});

// Virtual for highest bid
FeaturedJobSlotSchema.virtual('highestBid').get(function() {
  if (!this.bidHistory || this.bidHistory.length === 0) return this.bidAmount;
  return Math.max(...this.bidHistory.map(b => b.bidAmount), this.bidAmount);
});

// ==================== MIDDLEWARE ====================

// Pre-save middleware to calculate duration
FeaturedJobSlotSchema.pre('save', function(next) {
  if (this.isModified('startDate') || this.isModified('endDate')) {
    const diffTime = this.endDate - this.startDate;
    this.durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  // Auto-approve if bid is above threshold and no manual approval required
  if (this.isNew && this.bidAmount >= this.minimumBid * 2 && !this.isApproved) {
    this.isApproved = true;
    this.approvedAt = new Date();
  }
  
  next();
});

// ==================== INSTANCE METHODS ====================

/**
 * Increment view count
 * @param {boolean} isUnique - Whether this is a unique view
 * @returns {Promise<void>}
 */
FeaturedJobSlotSchema.methods.incrementViews = async function(isUnique = false) {
  this.metrics.views += 1;
  if (isUnique) {
    this.metrics.uniqueViews += 1;
  }
  this.metrics.ctr = this.metrics.views > 0 
    ? (this.metrics.clicks / this.metrics.views) * 100 
    : 0;
  await this.save();
};

/**
 * Increment click count
 * @returns {Promise<void>}
 */
FeaturedJobSlotSchema.methods.incrementClicks = async function() {
  this.metrics.clicks += 1;
  this.metrics.ctr = this.metrics.views > 0 
    ? (this.metrics.clicks / this.metrics.views) * 100 
    : 0;
  await this.save();
};

/**
 * Increment application count
 * @returns {Promise<void>}
 */
FeaturedJobSlotSchema.methods.incrementApplications = async function() {
  this.metrics.applications += 1;
  this.metrics.conversionRate = this.metrics.views > 0 
    ? (this.metrics.applications / this.metrics.views) * 100 
    : 0;
  await this.save();
};

/**
 * Increment referral count
 * @returns {Promise<void>}
 */
FeaturedJobSlotSchema.methods.incrementReferrals = async function() {
  this.metrics.referrals += 1;
  await this.save();
};

/**
 * Mark as hired
 * @returns {Promise<void>}
 */
FeaturedJobSlotSchema.methods.markAsHired = async function() {
  this.metrics.hires += 1;
  await this.save();
};

/**
 * Approve featured slot
 * @param {string} userId - Admin user ID
 * @returns {Promise<void>}
 */
FeaturedJobSlotSchema.methods.approve = async function(userId) {
  this.isApproved = true;
  this.approvedAt = new Date();
  this.approvedBy = userId;
  this.status = 'active';
  await this.save();
};

/**
 * Reject featured slot
 * @param {string} reason - Rejection reason
 * @returns {Promise<void>}
 */
FeaturedJobSlotSchema.methods.reject = async function(reason) {
  this.status = 'rejected';
  this.rejectionReason = reason;
  await this.save();
};

/**
 * Cancel featured slot
 * @param {string} userId - User cancelling
 * @param {string} reason - Cancellation reason
 * @returns {Promise<void>}
 */
FeaturedJobSlotSchema.methods.cancel = async function(userId, reason) {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancelledBy = userId;
  this.cancellationReason = reason;
  await this.save();
};

/**
 * Record payment
 * @param {string} billingRecordId - Billing record ID
 * @returns {Promise<void>}
 */
FeaturedJobSlotSchema.methods.recordPayment = async function(billingRecordId) {
  this.paymentStatus = 'paid';
  this.billingRecordId = billingRecordId;
  this.paidAt = new Date();
  await this.save();
};

/**
 * Place bid on slot
 * @param {string} companyId - Company ID
 * @param {string} jobId - Job ID
 * @param {number} bidAmount - Bid amount
 * @returns {Promise<boolean>} - Whether bid was successful
 */
FeaturedJobSlotSchema.methods.placeBid = async function(companyId, jobId, bidAmount) {
  // Check if bid is higher than current
  if (bidAmount <= this.highestBid) {
    return false;
  }
  
  // Add to bid history
  this.bidHistory.push({
    companyId,
    jobId,
    bidAmount,
    bidAt: new Date(),
    isWinning: true,
  });
  
  // Mark previous bids as not winning
  this.bidHistory.forEach(bid => {
    if (bid.companyId.toString() !== companyId.toString()) {
      bid.isWinning = false;
    }
  });
  
  // Update current bid
  this.bidAmount = bidAmount;
  this.companyId = companyId;
  this.jobId = jobId;
  
  await this.save();
  return true;
};

// ==================== STATIC METHODS ====================

/**
 * Get active featured slots
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
FeaturedJobSlotSchema.statics.getActiveSlots = function(options = {}) {
  const query = {
    status: 'active',
    endDate: { $gt: new Date() },
  };
  
  if (options.slotType) {
    query.slotType = options.slotType;
  }
  
  if (options.slotPosition) {
    query.slotPosition = options.slotPosition;
  }
  
  return this.find(query)
    .populate('jobId', 'title companyId location type salary category')
    .populate('companyId', 'name slug logo')
    .sort(options.sort || { slotPosition: 1, bidAmount: -1 })
    .limit(options.limit || 10);
};

/**
 * Get available slots for bidding
 * @returns {Promise<Array>}
 */
FeaturedJobSlotSchema.statics.getAvailableSlots = async function() {
  const activeSlots = await this.find({
    status: { $in: ['active', 'pending'] },
    endDate: { $gt: new Date() },
  }).select('slotPosition');
  
  const occupiedPositions = activeSlots.map(s => s.slotPosition);
  const allPositions = Array.from({ length: 10 }, (_, i) => i + 1);
  
  return allPositions.filter(pos => !occupiedPositions.includes(pos));
};

/**
 * Get slots by company
 * @param {string} companyId - Company ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
FeaturedJobSlotSchema.statics.getByCompany = function(companyId, options = {}) {
  const query = { companyId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .populate('jobId', 'title status')
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 50);
};

/**
 * Get slot performance analytics
 * @param {string} slotId - Slot ID
 * @returns {Promise<Object>}
 */
FeaturedJobSlotSchema.statics.getPerformanceAnalytics = async function(slotId) {
  const slot = await this.findById(slotId);
  if (!slot) return null;
  
  return {
    slotId: slot._id,
    slotPosition: slot.slotPosition,
    metrics: slot.metrics,
    bidAmount: slot.bidAmount,
    durationDays: slot.durationDays,
    daysRemaining: slot.daysRemaining,
    roi: slot.bidAmount > 0 
      ? ((slot.metrics.applications * 50000) / slot.bidAmount * 100).toFixed(2)
      : 0,
  };
};

/**
 * Expire old slots
 * @returns {Promise<number>} - Number of slots expired
 */
FeaturedJobSlotSchema.statics.expireOldSlots = async function() {
  const result = await this.updateMany(
    {
      status: 'active',
      endDate: { $lte: new Date() },
    },
    {
      $set: { status: 'expired' },
    }
  );
  
  return result.modifiedCount;
};

/**
 * Get auction leaderboard
 * @param {number} slotPosition - Slot position
 * @returns {Promise<Array>}
 */
FeaturedJobSlotSchema.statics.getAuctionLeaderboard = async function(slotPosition) {
  return this.find({
    slotPosition,
    status: { $in: ['pending', 'active'] },
  })
    .populate('companyId', 'name logo')
    .populate('jobId', 'title')
    .sort({ bidAmount: -1, createdAt: 1 })
    .limit(5);
};

// Create and export the model
const FeaturedJobSlot = mongoose.model('FeaturedJobSlot', FeaturedJobSlotSchema);

module.exports = FeaturedJobSlot;
