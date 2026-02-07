/**
 * PayoutBatch Model
 * Represents batches of payouts for bulk processing
 * Tracks batch status, processing details, and reconciliation
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Batch status constants
const BATCH_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  PARTIAL: 'partial',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

// Batch type constants
const BATCH_TYPE = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  MANUAL: 'manual',
  SCHEDULED: 'scheduled',
};

// Payout item in batch
const PayoutItemSchema = new Schema({
  payoutRequestId: {
    type: Schema.Types.ObjectId,
    ref: 'PayoutRequest',
    required: true,
  },
  referrerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'skipped'],
    default: 'pending',
  },
  processedAt: {
    type: Date,
  },
  transactionId: {
    type: String,
    trim: true,
  },
  errorMessage: {
    type: String,
    trim: true,
  },
  retryCount: {
    type: Number,
    default: 0,
  },
}, { _id: true });

// Processing summary schema
const ProcessingSummarySchema = new Schema({
  total: {
    type: Number,
    default: 0,
  },
  completed: {
    type: Number,
    default: 0,
  },
  failed: {
    type: Number,
    default: 0,
  },
  skipped: {
    type: Number,
    default: 0,
  },
  pending: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    default: 0,
  },
  completedAmount: {
    type: Number,
    default: 0,
  },
  failedAmount: {
    type: Number,
    default: 0,
  },
}, { _id: false });

// Main PayoutBatch Schema
const PayoutBatchSchema = new Schema({
  // Batch identifier
  batchNumber: {
    type: String,
    required: [true, 'Batch number is required'],
    unique: true,
    trim: true,
    uppercase: true,
  },

  // Batch type
  type: {
    type: String,
    enum: Object.values(BATCH_TYPE),
    required: true,
  },

  // Batch status
  status: {
    type: String,
    enum: Object.values(BATCH_STATUS),
    default: BATCH_STATUS.PENDING,
    index: true,
  },

  // Payout items
  payouts: [PayoutItemSchema],

  // Processing summary
  summary: {
    type: ProcessingSummarySchema,
    default: () => ({}),
  },

  // Provider used for this batch
  providerId: {
    type: Schema.Types.ObjectId,
    ref: 'PayoutProvider',
  },

  // Scheduled time
  scheduledAt: {
    type: Date,
  },

  // Processing time
  startedAt: {
    type: Date,
  },
  completedAt: {
    type: Date,
  },

  // Created by
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },

  // Processing configuration
  config: {
    maxRetries: {
      type: Number,
      default: 3,
    },
    retryDelayMinutes: {
      type: Number,
      default: 60,
    },
    parallelProcessing: {
      type: Boolean,
      default: true,
    },
    batchSize: {
      type: Number,
      default: 100,
    },
  },

  // Error log
  errors: [{
    payoutRequestId: {
      type: Schema.Types.ObjectId,
      ref: 'PayoutRequest',
    },
    error: {
      type: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  }],

  // Metadata
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },

  // Notes
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ==================== INDEXES ====================

PayoutBatchSchema.index({ batchNumber: 1 }, { unique: true });
PayoutBatchSchema.index({ status: 1, scheduledAt: 1 });
PayoutBatchSchema.index({ status: 1, type: 1 });
PayoutBatchSchema.index({ createdAt: -1 });
PayoutBatchSchema.index({ 'payouts.payoutRequestId': 1 });
PayoutBatchSchema.index({ 'payouts.referrerId': 1 });

// ==================== VIRTUALS ====================

// Virtual for progress percentage
PayoutBatchSchema.virtual('progress').get(function() {
  if (!this.summary || this.summary.total === 0) return 0;
  const processed = this.summary.completed + this.summary.failed + this.summary.skipped;
  return Math.round((processed / this.summary.total) * 100);
});

// Virtual for is processing
PayoutBatchSchema.virtual('isProcessing').get(function() {
  return this.status === BATCH_STATUS.PROCESSING;
});

// Virtual for is completed
PayoutBatchSchema.virtual('isCompleted').get(function() {
  return this.status === BATCH_STATUS.COMPLETED;
});

// Virtual for duration
PayoutBatchSchema.virtual('duration').get(function() {
  if (!this.startedAt) return null;
  const end = this.completedAt || new Date();
  return end - this.startedAt;
});

// ==================== MIDDLEWARE ====================

// Pre-save middleware to update summary
PayoutBatchSchema.pre('save', function(next) {
  if (this.isModified('payouts')) {
    const summary = {
      total: this.payouts.length,
      completed: 0,
      failed: 0,
      skipped: 0,
      pending: 0,
      totalAmount: 0,
      completedAmount: 0,
      failedAmount: 0,
    };

    this.payouts.forEach(payout => {
      summary.totalAmount += payout.amount;
      switch (payout.status) {
        case 'completed':
          summary.completed++;
          summary.completedAmount += payout.amount;
          break;
        case 'failed':
          summary.failed++;
          summary.failedAmount += payout.amount;
          break;
        case 'skipped':
          summary.skipped++;
          break;
        case 'pending':
        default:
          summary.pending++;
          break;
      }
    });

    this.summary = summary;

    // Update batch status based on payouts
    if (summary.pending === 0) {
      if (summary.failed === 0) {
        this.status = BATCH_STATUS.COMPLETED;
        if (!this.completedAt) this.completedAt = new Date();
      } else if (summary.completed > 0) {
        this.status = BATCH_STATUS.PARTIAL;
        if (!this.completedAt) this.completedAt = new Date();
      } else {
        this.status = BATCH_STATUS.FAILED;
        if (!this.completedAt) this.completedAt = new Date();
      }
    }
  }
  next();
});

// ==================== INSTANCE METHODS ====================

/**
 * Start processing batch
 * @returns {Promise<void>}
 */
PayoutBatchSchema.methods.startProcessing = async function() {
  this.status = BATCH_STATUS.PROCESSING;
  this.startedAt = new Date();
  await this.save();
};

/**
 * Complete batch
 * @returns {Promise<void>}
 */
PayoutBatchSchema.methods.complete = async function() {
  this.status = BATCH_STATUS.COMPLETED;
  this.completedAt = new Date();
  await this.save();
};

/**
 * Mark batch as partial
 * @returns {Promise<void>}
 */
PayoutBatchSchema.methods.markPartial = async function() {
  this.status = BATCH_STATUS.PARTIAL;
  this.completedAt = new Date();
  await this.save();
};

/**
 * Fail batch
 * @param {string} reason - Failure reason
 * @returns {Promise<void>}
 */
PayoutBatchSchema.methods.fail = async function(reason) {
  this.status = BATCH_STATUS.FAILED;
  this.completedAt = new Date();
  this.notes = reason;
  await this.save();
};

/**
 * Cancel batch
 * @param {string} reason - Cancellation reason
 * @returns {Promise<void>}
 */
PayoutBatchSchema.methods.cancel = async function(reason) {
  if (this.status === BATCH_STATUS.PROCESSING) {
    throw new Error('Cannot cancel batch that is currently processing');
  }
  this.status = BATCH_STATUS.CANCELLED;
  this.notes = reason;
  await this.save();
};

/**
 * Update payout item status
 * @param {string} payoutRequestId - Payout request ID
 * @param {string} status - New status
 * @param {Object} details - Additional details
 * @returns {Promise<void>}
 */
PayoutBatchSchema.methods.updatePayoutStatus = async function(payoutRequestId, status, details = {}) {
  const payout = this.payouts.find(p => p.payoutRequestId.toString() === payoutRequestId.toString());
  if (!payout) {
    throw new Error('Payout not found in batch');
  }

  payout.status = status;
  if (details.transactionId) payout.transactionId = details.transactionId;
  if (details.errorMessage) payout.errorMessage = details.errorMessage;
  if (status === 'processing') {
    payout.processedAt = new Date();
  }
  if (details.retryCount !== undefined) payout.retryCount = details.retryCount;

  await this.save();
};

/**
 * Add error to batch
 * @param {string} payoutRequestId - Payout request ID
 * @param {string} error - Error message
 * @returns {Promise<void>}
 */
PayoutBatchSchema.methods.addError = async function(payoutRequestId, error) {
  this.errors.push({
    payoutRequestId,
    error,
    timestamp: new Date(),
  });
  await this.save();
};

/**
 * Get failed payouts
 * @returns {Array}
 */
PayoutBatchSchema.methods.getFailedPayouts = function() {
  return this.payouts.filter(p => p.status === 'failed');
};

/**
 * Get pending payouts
 * @returns {Array}
 */
PayoutBatchSchema.methods.getPendingPayouts = function() {
  return this.payouts.filter(p => p.status === 'pending');
};

// ==================== STATIC METHODS ====================

/**
 * Generate unique batch number
 * @param {string} type - Batch type
 * @returns {string}
 */
PayoutBatchSchema.statics.generateBatchNumber = async function(type) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  // Count batches for today
  const count = await this.countDocuments({
    createdAt: {
      $gte: new Date(year, now.getMonth(), now.getDate()),
      $lt: new Date(year, now.getMonth(), now.getDate() + 1),
    },
  });

  const typePrefix = type.substring(0, 3).toUpperCase();
  const sequence = String(count + 1).padStart(4, '0');
  return `BAT-${typePrefix}-${year}${month}${day}-${sequence}`;
};

/**
 * Create batch from payout requests
 * @param {Array} payoutRequests - Array of payout request IDs
 * @param {Object} options - Batch options
 * @returns {Promise<Document>}
 */
PayoutBatchSchema.statics.createBatch = async function(payoutRequests, options = {}) {
  const batchNumber = await this.generateBatchNumber(options.type || BATCH_TYPE.MANUAL);

  const payouts = payoutRequests.map(pr => ({
    payoutRequestId: pr._id || pr,
    referrerId: pr.referrerId,
    amount: pr.amount,
    status: 'pending',
  }));

  const batch = await this.create({
    batchNumber,
    type: options.type || BATCH_TYPE.MANUAL,
    payouts,
    providerId: options.providerId,
    scheduledAt: options.scheduledAt,
    createdBy: options.createdBy,
    config: {
      ...options.config,
    },
    notes: options.notes,
  });

  return batch;
};

/**
 * Find pending batches
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
PayoutBatchSchema.statics.findPending = function(options = {}) {
  return this.find({ status: BATCH_STATUS.PENDING })
    .sort({ scheduledAt: 1 })
    .limit(options.limit || 100);
};

/**
 * Find batches ready for processing
 * @returns {Promise<Array>}
 */
PayoutBatchSchema.statics.findReadyForProcessing = function() {
  return this.find({
    status: BATCH_STATUS.PENDING,
    $or: [
      { scheduledAt: { $lte: new Date() } },
      { scheduledAt: { $exists: false } },
    ],
  }).sort({ scheduledAt: 1 });
};

/**
 * Find batches by status
 * @param {string} status - Batch status
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
PayoutBatchSchema.statics.findByStatus = function(status, options = {}) {
  return this.find({ status })
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

/**
 * Get batch statistics
 * @param {Object} filters - Date filters
 * @returns {Promise<Object>}
 */
PayoutBatchSchema.statics.getStats = async function(filters = {}) {
  const matchStage = {};

  if (filters.startDate || filters.endDate) {
    matchStage.createdAt = {};
    if (filters.startDate) matchStage.createdAt.$gte = filters.startDate;
    if (filters.endDate) matchStage.createdAt.$lte = filters.endDate;
  }

  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$summary.totalAmount' },
        completedAmount: { $sum: '$summary.completedAmount' },
      },
    },
  ]);

  const result = {
    total: 0,
    pending: { count: 0, amount: 0 },
    processing: { count: 0, amount: 0 },
    completed: { count: 0, amount: 0 },
    partial: { count: 0, amount: 0 },
    failed: { count: 0, amount: 0 },
    cancelled: { count: 0, amount: 0 },
  };

  stats.forEach(stat => {
    result[stat._id] = { count: stat.count, amount: stat.totalAmount };
    result.total += stat.count;
  });

  return result;
};

/**
 * Get recent batches
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
PayoutBatchSchema.statics.getRecent = function(options = {}) {
  return this.find()
    .populate('createdBy', 'name email')
    .populate('providerId', 'name')
    .sort({ createdAt: -1 })
    .limit(options.limit || 20);
};

// Create and export the model
const PayoutBatch = mongoose.model('PayoutBatch', PayoutBatchSchema);

module.exports = PayoutBatch;
