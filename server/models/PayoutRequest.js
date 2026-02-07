/**
 * PayoutRequest Model
 * Represents payout requests from referrers
 * Tracks request status, payment processing, and related referrals
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Referral item in payout
const ReferralItemSchema = new Schema({
  referralId: {
    type: Schema.Types.ObjectId,
    ref: 'Referral',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  jobTitle: {
    type: String,
    trim: true,
  },
  hiredAt: {
    type: Date,
  },
}, { _id: true });

// Payment details schema
const PaymentDetailsSchema = new Schema({
  type: {
    type: String,
    enum: ['kbzpay', 'wavepay', 'bank_transfer'],
    required: true,
  },
  // KBZPay / WavePay specific
  phoneNumber: {
    type: String,
    trim: true,
  },
  accountName: {
    type: String,
    trim: true,
  },
  // Bank transfer specific
  bankName: {
    type: String,
    trim: true,
  },
  bankBranch: {
    type: String,
    trim: true,
  },
  accountNumber: {
    type: String,
    trim: true,
  },
  accountHolderName: {
    type: String,
    trim: true,
  },
  swiftCode: {
    type: String,
    trim: true,
  },
}, { _id: false });

// Processing history schema
const ProcessingHistorySchema = new Schema({
  status: {
    type: String,
    required: true,
  },
  changedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
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

// Payout status constants
const PAYOUT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  PROCESSING: 'processing',
  PAID: 'paid',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
};

// Main PayoutRequest Schema
const PayoutRequestSchema = new Schema({
  // Request identifier
  requestNumber: {
    type: String,
    required: [true, 'Request number is required'],
    unique: true,
    trim: true,
    uppercase: true,
  },
  
  // Referrer
  referrerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Referrer is required'],
    index: true,
  },
  
  // Financial details
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [1000, 'Minimum payout amount is 1,000 MMK'],
  },
  currency: {
    type: String,
    default: 'MMK',
  },
  
  // Referrals included in this payout
  referrals: [ReferralItemSchema],
  
  // Payment method
  paymentMethod: {
    type: PaymentDetailsSchema,
    required: [true, 'Payment method is required'],
  },
  
  // Status
  status: {
    type: String,
    enum: Object.values(PAYOUT_STATUS),
    default: PAYOUT_STATUS.PENDING,
    index: true,
  },
  
  // Processing history
  processingHistory: [ProcessingHistorySchema],
  
  // Request timestamp
  requestedAt: {
    type: Date,
    default: Date.now,
  },
  
  // Approval
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: {
    type: Date,
  },
  
  // Processing
  processedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  processedAt: {
    type: Date,
  },
  
  // Payment
  paidAt: {
    type: Date,
  },
  transactionId: {
    type: String,
    trim: true,
  },
  receiptUrl: {
    type: String,
    trim: true,
  },
  
  // Rejection
  rejectionReason: {
    type: String,
    trim: true,
  },
  rejectedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  rejectedAt: {
    type: Date,
  },
  
  // Notes
  notes: {
    type: String,
    trim: true,
  },
  adminNotes: {
    type: String,
    trim: true,
  },
  
  // Fees
  platformFee: {
    type: Number,
    default: 0,
  },
  processingFee: {
    type: Number,
    default: 0,
  },
  netAmount: {
    type: Number,
    default: function() {
      return this.amount - (this.platformFee || 0) - (this.processingFee || 0);
    },
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

PayoutRequestSchema.index({ requestNumber: 1 }, { unique: true });
PayoutRequestSchema.index({ referrerId: 1, status: 1 });
PayoutRequestSchema.index({ status: 1, requestedAt: -1 });
PayoutRequestSchema.index({ requestedAt: -1 });

// ==================== VIRTUALS ====================

// Virtual for days since request
PayoutRequestSchema.virtual('daysSinceRequest').get(function() {
  const diffTime = Math.abs(new Date() - this.requestedAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for processing time
PayoutRequestSchema.virtual('processingTime').get(function() {
  if (!this.paidAt || !this.requestedAt) return null;
  return this.paidAt - this.requestedAt;
});

// Virtual for is pending
PayoutRequestSchema.virtual('isPending').get(function() {
  return this.status === PAYOUT_STATUS.PENDING;
});

// Virtual for is completed
PayoutRequestSchema.virtual('isCompleted').get(function() {
  return this.status === PAYOUT_STATUS.PAID;
});

// Virtual for formatted amount
PayoutRequestSchema.virtual('formattedAmount').get(function() {
  return `${this.amount.toLocaleString()} ${this.currency}`;
});

// Virtual for total fees
PayoutRequestSchema.virtual('totalFees').get(function() {
  return (this.platformFee || 0) + (this.processingFee || 0);
});

// ==================== MIDDLEWARE ====================

// Pre-save middleware to initialize processing history
PayoutRequestSchema.pre('save', function(next) {
  if (this.isNew) {
    this.processingHistory.push({
      status: this.status,
      changedAt: this.requestedAt,
      notes: 'Payout requested',
    });
  }
  next();
});

// ==================== INSTANCE METHODS ====================

/**
 * Approve payout request
 * @param {string} adminId - Admin user ID
 * @param {Object} options - Approval options
 * @returns {Promise<void>}
 */
PayoutRequestSchema.methods.approve = async function(adminId, options = {}) {
  if (this.status !== PAYOUT_STATUS.PENDING) {
    throw new Error('Can only approve pending requests');
  }
  
  this.status = PAYOUT_STATUS.APPROVED;
  this.approvedBy = adminId;
  this.approvedAt = new Date();
  
  if (options.notes) {
    this.adminNotes = options.notes;
  }
  
  this.processingHistory.push({
    status: PAYOUT_STATUS.APPROVED,
    changedBy: adminId,
    changedAt: new Date(),
    notes: options.notes || 'Request approved',
  });
  
  await this.save();
};

/**
 * Start processing payout
 * @param {string} adminId - Admin user ID
 * @returns {Promise<void>}
 */
PayoutRequestSchema.methods.startProcessing = async function(adminId) {
  if (this.status !== PAYOUT_STATUS.APPROVED) {
    throw new Error('Request must be approved before processing');
  }
  
  this.status = PAYOUT_STATUS.PROCESSING;
  this.processedBy = adminId;
  this.processedAt = new Date();
  
  this.processingHistory.push({
    status: PAYOUT_STATUS.PROCESSING,
    changedBy: adminId,
    changedAt: new Date(),
    notes: 'Payment processing started',
  });
  
  await this.save();
};

/**
 * Mark as paid
 * @param {Object} paymentInfo - Payment information
 * @returns {Promise<void>}
 */
PayoutRequestSchema.methods.markAsPaid = async function(paymentInfo) {
  const { transactionId, receiptUrl, notes } = paymentInfo;
  
  if (this.status !== PAYOUT_STATUS.PROCESSING) {
    throw new Error('Request must be processing before marking as paid');
  }
  
  this.status = PAYOUT_STATUS.PAID;
  this.paidAt = new Date();
  this.transactionId = transactionId;
  this.receiptUrl = receiptUrl;
  
  this.processingHistory.push({
    status: PAYOUT_STATUS.PAID,
    changedBy: this.processedBy,
    changedAt: new Date(),
    notes: notes || `Payment completed: ${transactionId}`,
  });
  
  await this.save();
};

/**
 * Reject payout request
 * @param {string} adminId - Admin user ID
 * @param {string} reason - Rejection reason
 * @returns {Promise<void>}
 */
PayoutRequestSchema.methods.reject = async function(adminId, reason) {
  if (![PAYOUT_STATUS.PENDING, PAYOUT_STATUS.APPROVED].includes(this.status)) {
    throw new Error('Cannot reject request in current status');
  }
  
  this.status = PAYOUT_STATUS.REJECTED;
  this.rejectedBy = adminId;
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  
  this.processingHistory.push({
    status: PAYOUT_STATUS.REJECTED,
    changedBy: adminId,
    changedAt: new Date(),
    notes: reason,
  });
  
  await this.save();
};

/**
 * Cancel payout request (by referrer)
 * @param {string} reason - Cancellation reason
 * @returns {Promise<void>}
 */
PayoutRequestSchema.methods.cancel = async function(reason) {
  if (this.status !== PAYOUT_STATUS.PENDING) {
    throw new Error('Can only cancel pending requests');
  }
  
  this.status = PAYOUT_STATUS.CANCELLED;
  
  this.processingHistory.push({
    status: PAYOUT_STATUS.CANCELLED,
    changedAt: new Date(),
    notes: reason || 'Cancelled by referrer',
  });
  
  await this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Generate unique request number
 * @returns {string}
 */
PayoutRequestSchema.statics.generateRequestNumber = async function() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  // Count requests for this month
  const count = await this.countDocuments({
    createdAt: {
      $gte: new Date(year, now.getMonth(), 1),
      $lt: new Date(year, now.getMonth() + 1, 1),
    },
  });
  
  const sequence = String(count + 1).padStart(4, '0');
  return `PYO-${year}${month}-${sequence}`;
};

/**
 * Find payouts by referrer
 * @param {string} referrerId - Referrer user ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
PayoutRequestSchema.statics.findByReferrer = function(referrerId, options = {}) {
  const query = { referrerId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .sort(options.sort || { requestedAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

/**
 * Find pending payouts
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
PayoutRequestSchema.statics.findPending = function(options = {}) {
  return this.find({ status: PAYOUT_STATUS.PENDING })
    .populate('referrerId', 'name email phone referrerProfile')
    .sort({ requestedAt: 1 })
    .limit(options.limit || 100);
};

/**
 * Find payouts requiring action
 * @returns {Promise<Array>}
 */
PayoutRequestSchema.statics.findRequiringAction = function() {
  return this.find({
    status: { $in: [PAYOUT_STATUS.PENDING, PAYOUT_STATUS.APPROVED] },
  })
    .populate('referrerId', 'name email phone')
    .sort({ requestedAt: 1 });
};

/**
 * Get payout statistics
 * @param {Object} filters - Date filters
 * @returns {Promise<Object>}
 */
PayoutRequestSchema.statics.getStats = async function(filters = {}) {
  const matchStage = {};
  
  if (filters.startDate || filters.endDate) {
    matchStage.requestedAt = {};
    if (filters.startDate) matchStage.requestedAt.$gte = filters.startDate;
    if (filters.endDate) matchStage.requestedAt.$lte = filters.endDate;
  }
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
      },
    },
  ]);
  
  const result = {
    total: 0,
    pending: { count: 0, amount: 0 },
    approved: { count: 0, amount: 0 },
    processing: { count: 0, amount: 0 },
    paid: { count: 0, amount: 0 },
    rejected: { count: 0, amount: 0 },
    cancelled: { count: 0, amount: 0 },
  };
  
  stats.forEach(stat => {
    result[stat._id] = { count: stat.count, amount: stat.totalAmount };
    result.total += stat.count;
  });
  
  return result;
};

/**
 * Get referrer payout statistics
 * @param {string} referrerId - Referrer user ID
 * @returns {Promise<Object>}
 */
PayoutRequestSchema.statics.getReferrerStats = async function(referrerId) {
  const stats = await this.aggregate([
    { $match: { referrerId: new mongoose.Types.ObjectId(referrerId) } },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        totalPaid: {
          $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] },
        },
        totalPending: {
          $sum: {
            $cond: [{ $in: ['$status', ['pending', 'approved', 'processing']] }, '$amount', 0],
          },
        },
        paidCount: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
        pendingCount: {
          $sum: { $cond: [{ $in: ['$status', ['pending', 'approved', 'processing']] }, 1, 0] },
        },
      },
    },
  ]);
  
  return stats[0] || {
    totalRequests: 0,
    totalPaid: 0,
    totalPending: 0,
    paidCount: 0,
    pendingCount: 0,
  };
};

/**
 * Create payout request
 * @param {Object} data - Payout data
 * @returns {Promise<Document>}
 */
PayoutRequestSchema.statics.createRequest = async function(data) {
  const requestNumber = await this.generateRequestNumber();
  
  const payout = await this.create({
    requestNumber,
    ...data,
  });
  
  return payout;
};

// Create and export the model
const PayoutRequest = mongoose.model('PayoutRequest', PayoutRequestSchema);

module.exports = PayoutRequest;
