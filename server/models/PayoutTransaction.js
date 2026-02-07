/**
 * PayoutTransaction Model
 * Tracks individual payout transactions with providers
 * Used for reconciliation, audit trails, and retry logic
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Transaction status constants
const TRANSACTION_STATUS = {
  PENDING: 'pending',
  INITIATED: 'initiated',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  DISPUTED: 'disputed',
};

// Transaction type constants
const TRANSACTION_TYPE = {
  PAYOUT: 'payout',
  REFUND: 'refund',
  ADJUSTMENT: 'adjustment',
  FEE: 'fee',
};

// Provider response schema
const ProviderResponseSchema = new Schema({
  request: {
    type: Schema.Types.Mixed,
  },
  response: {
    type: Schema.Types.Mixed,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  duration: {
    type: Number, // in milliseconds
  },
}, { _id: true });

// Retry attempt schema
const RetryAttemptSchema = new Schema({
  attemptNumber: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: Object.values(TRANSACTION_STATUS),
    required: true,
  },
  errorMessage: {
    type: String,
  },
  providerResponse: {
    type: ProviderResponseSchema,
  },
}, { _id: true });

// Main PayoutTransaction Schema
const PayoutTransactionSchema = new Schema({
  // Transaction identifier
  transactionNumber: {
    type: String,
    required: [true, 'Transaction number is required'],
    unique: true,
    trim: true,
    uppercase: true,
  },

  // Related entities
  payoutRequestId: {
    type: Schema.Types.ObjectId,
    ref: 'PayoutRequest',
    required: true,
    index: true,
  },
  payoutBatchId: {
    type: Schema.Types.ObjectId,
    ref: 'PayoutBatch',
    index: true,
  },
  referrerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  // Provider information
  providerId: {
    type: Schema.Types.ObjectId,
    ref: 'PayoutProvider',
    required: true,
  },
  providerCode: {
    type: String,
    required: true,
  },

  // Transaction details
  type: {
    type: String,
    enum: Object.values(TRANSACTION_TYPE),
    default: TRANSACTION_TYPE.PAYOUT,
  },
  status: {
    type: String,
    enum: Object.values(TRANSACTION_STATUS),
    default: TRANSACTION_STATUS.PENDING,
    index: true,
  },

  // Amounts
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    default: 'MMK',
  },
  fee: {
    type: Number,
    default: 0,
  },
  netAmount: {
    type: Number,
    required: true,
  },

  // Payment details
  paymentDetails: {
    type: {
      type: String,
      enum: ['kbzpay', 'wavepay', 'cbpay', 'bank_transfer'],
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    accountNumber: {
      type: String,
      trim: true,
    },
    accountName: {
      type: String,
      trim: true,
    },
    bankName: {
      type: String,
      trim: true,
    },
    bankBranch: {
      type: String,
      trim: true,
    },
  },

  // Provider transaction reference
  providerTransactionId: {
    type: String,
    trim: true,
    index: true,
  },
  providerReference: {
    type: String,
    trim: true,
  },

  // Timestamps
  initiatedAt: {
    type: Date,
  },
  processedAt: {
    type: Date,
  },
  completedAt: {
    type: Date,
  },
  failedAt: {
    type: Date,
  },

  // Retry logic
  retryCount: {
    type: Number,
    default: 0,
  },
  maxRetries: {
    type: Number,
    default: 3,
  },
  nextRetryAt: {
    type: Date,
    index: true,
  },
  retryAttempts: [RetryAttemptSchema],

  // Provider communication log
  providerResponses: [ProviderResponseSchema],

  // Error handling
  errorCode: {
    type: String,
  },
  errorMessage: {
    type: String,
  },
  failureReason: {
    type: String,
  },

  // Webhook data
  webhookData: {
    type: Schema.Types.Mixed,
  },
  webhookReceivedAt: {
    type: Date,
  },

  // Reconciliation
  reconciled: {
    type: Boolean,
    default: false,
  },
  reconciledAt: {
    type: Date,
  },
  reconciliationNotes: {
    type: String,
  },

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

PayoutTransactionSchema.index({ transactionNumber: 1 }, { unique: true });
PayoutTransactionSchema.index({ payoutRequestId: 1 });
PayoutTransactionSchema.index({ payoutBatchId: 1 });
PayoutTransactionSchema.index({ referrerId: 1, status: 1 });
PayoutTransactionSchema.index({ providerId: 1, status: 1 });
PayoutTransactionSchema.index({ status: 1, nextRetryAt: 1 });
PayoutTransactionSchema.index({ status: 1, createdAt: -1 });
PayoutTransactionSchema.index({ providerTransactionId: 1 });
PayoutTransactionSchema.index({ reconciled: 1, status: 1 });

// ==================== VIRTUALS ====================

// Virtual for is pending
PayoutTransactionSchema.virtual('isPending').get(function() {
  return this.status === TRANSACTION_STATUS.PENDING;
});

// Virtual for is completed
PayoutTransactionSchema.virtual('isCompleted').get(function() {
  return this.status === TRANSACTION_STATUS.COMPLETED;
});

// Virtual for is failed
PayoutTransactionSchema.virtual('isFailed').get(function() {
  return this.status === TRANSACTION_STATUS.FAILED;
});

// Virtual for can retry
PayoutTransactionSchema.virtual('canRetry').get(function() {
  return this.status === TRANSACTION_STATUS.FAILED &&
    this.retryCount < this.maxRetries;
});

// Virtual for processing duration
PayoutTransactionSchema.virtual('processingDuration').get(function() {
  if (!this.initiatedAt) return null;
  const end = this.completedAt || this.failedAt || new Date();
  return end - this.initiatedAt;
});

// Virtual for formatted amount
PayoutTransactionSchema.virtual('formattedAmount').get(function() {
  return `${this.amount.toLocaleString()} ${this.currency}`;
});

// ==================== MIDDLEWARE ====================

// Pre-save middleware to set net amount
PayoutTransactionSchema.pre('save', function(next) {
  if (this.isModified('amount') || this.isModified('fee')) {
    this.netAmount = this.amount - this.fee;
  }
  next();
});

// ==================== INSTANCE METHODS ====================

/**
 * Initiate transaction
 * @returns {Promise<void>}
 */
PayoutTransactionSchema.methods.initiate = async function() {
  this.status = TRANSACTION_STATUS.INITIATED;
  this.initiatedAt = new Date();
  await this.save();
};

/**
 * Mark as processing
 * @returns {Promise<void>}
 */
PayoutTransactionSchema.methods.markProcessing = async function() {
  this.status = TRANSACTION_STATUS.PROCESSING;
  this.processedAt = new Date();
  await this.save();
};

/**
 * Mark as completed
 * @param {string} providerTransactionId - Provider transaction ID
 * @returns {Promise<void>}
 */
PayoutTransactionSchema.methods.markCompleted = async function(providerTransactionId) {
  this.status = TRANSACTION_STATUS.COMPLETED;
  this.completedAt = new Date();
  if (providerTransactionId) {
    this.providerTransactionId = providerTransactionId;
  }
  await this.save();
};

/**
 * Mark as failed
 * @param {string} errorCode - Error code
 * @param {string} errorMessage - Error message
 * @param {boolean} scheduleRetry - Whether to schedule retry
 * @returns {Promise<void>}
 */
PayoutTransactionSchema.methods.markFailed = async function(errorCode, errorMessage, scheduleRetry = true) {
  this.status = TRANSACTION_STATUS.FAILED;
  this.failedAt = new Date();
  this.errorCode = errorCode;
  this.errorMessage = errorMessage;

  // Add retry attempt
  this.retryAttempts.push({
    attemptNumber: this.retryCount + 1,
    status: TRANSACTION_STATUS.FAILED,
    errorMessage,
  });

  // Schedule retry if allowed
  if (scheduleRetry && this.retryCount < this.maxRetries) {
    this.retryCount++;
    // Exponential backoff: 1hr, 4hr, 12hr
    const delays = [60 * 60 * 1000, 4 * 60 * 60 * 1000, 12 * 60 * 60 * 1000];
    const delay = delays[this.retryCount - 1] || delays[delays.length - 1];
    this.nextRetryAt = new Date(Date.now() + delay);
  }

  await this.save();
};

/**
 * Mark as cancelled
 * @param {string} reason - Cancellation reason
 * @returns {Promise<void>}
 */
PayoutTransactionSchema.methods.markCancelled = async function(reason) {
  this.status = TRANSACTION_STATUS.CANCELLED;
  this.failureReason = reason;
  await this.save();
};

/**
 * Mark as refunded
 * @param {string} reason - Refund reason
 * @returns {Promise<void>}
 */
PayoutTransactionSchema.methods.markRefunded = async function(reason) {
  this.status = TRANSACTION_STATUS.REFUNDED;
  this.notes = reason;
  await this.save();
};

/**
 * Add provider response
 * @param {Object} request - Request data
 * @param {Object} response - Response data
 * @param {number} duration - Request duration in ms
 * @returns {Promise<void>}
 */
PayoutTransactionSchema.methods.addProviderResponse = async function(request, response, duration) {
  this.providerResponses.push({
    request,
    response,
    duration,
  });
  await this.save();
};

/**
 * Update from webhook
 * @param {Object} webhookData - Webhook payload
 * @returns {Promise<void>}
 */
PayoutTransactionSchema.methods.updateFromWebhook = async function(webhookData) {
  this.webhookData = webhookData;
  this.webhookReceivedAt = new Date();

  // Update status based on webhook
  if (webhookData.status) {
    const statusMap = {
      'success': TRANSACTION_STATUS.COMPLETED,
      'completed': TRANSACTION_STATUS.COMPLETED,
      'failed': TRANSACTION_STATUS.FAILED,
      'cancelled': TRANSACTION_STATUS.CANCELLED,
      'pending': TRANSACTION_STATUS.PROCESSING,
    };

    const newStatus = statusMap[webhookData.status.toLowerCase()];
    if (newStatus) {
      this.status = newStatus;
      if (newStatus === TRANSACTION_STATUS.COMPLETED) {
        this.completedAt = new Date();
      } else if (newStatus === TRANSACTION_STATUS.FAILED) {
        this.failedAt = new Date();
      }
    }
  }

  // Update provider transaction ID
  if (webhookData.transactionId) {
    this.providerTransactionId = webhookData.transactionId;
  }

  await this.save();
};

/**
 * Mark as reconciled
 * @param {string} notes - Reconciliation notes
 * @returns {Promise<void>}
 */
PayoutTransactionSchema.methods.markReconciled = async function(notes) {
  this.reconciled = true;
  this.reconciledAt = new Date();
  this.reconciliationNotes = notes;
  await this.save();
};

/**
 * Retry transaction
 * @returns {Promise<void>}
 */
PayoutTransactionSchema.methods.retry = async function() {
  if (this.retryCount >= this.maxRetries) {
    throw new Error('Maximum retry attempts reached');
  }

  this.status = TRANSACTION_STATUS.PENDING;
  this.errorCode = null;
  this.errorMessage = null;
  this.nextRetryAt = null;
  await this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Generate unique transaction number
 * @returns {string}
 */
PayoutTransactionSchema.statics.generateTransactionNumber = async function() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  // Count transactions in current minute
  const count = await this.countDocuments({
    createdAt: {
      $gte: new Date(year, now.getMonth(), now.getDate(), now.getHours(), now.getMinutes()),
      $lt: new Date(year, now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() + 1),
    },
  });

  const sequence = String(count + 1).padStart(4, '0');
  return `TXN-${year}${month}${day}-${hours}${minutes}-${sequence}`;
};

/**
 * Create transaction
 * @param {Object} data - Transaction data
 * @returns {Promise<Document>}
 */
PayoutTransactionSchema.statics.createTransaction = async function(data) {
  const transactionNumber = await this.generateTransactionNumber();

  const transaction = await this.create({
    transactionNumber,
    ...data,
  });

  return transaction;
};

/**
 * Find pending transactions ready for retry
 * @returns {Promise<Array>}
 */
PayoutTransactionSchema.statics.findReadyForRetry = function() {
  return this.find({
    status: TRANSACTION_STATUS.FAILED,
    retryCount: { $lt: { $ref: '$maxRetries' } },
    nextRetryAt: { $lte: new Date() },
  }).sort({ nextRetryAt: 1 });
};

/**
 * Find transactions by payout request
 * @param {string} payoutRequestId - Payout request ID
 * @returns {Promise<Array>}
 */
PayoutTransactionSchema.statics.findByPayoutRequest = function(payoutRequestId) {
  return this.find({ payoutRequestId })
    .sort({ createdAt: -1 });
};

/**
 * Find transactions by batch
 * @param {string} batchId - Batch ID
 * @returns {Promise<Array>}
 */
PayoutTransactionSchema.statics.findByBatch = function(batchId) {
  return this.find({ payoutBatchId: batchId })
    .sort({ createdAt: 1 });
};

/**
 * Find transactions by status
 * @param {string} status - Transaction status
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
PayoutTransactionSchema.statics.findByStatus = function(status, options = {}) {
  return this.find({ status })
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 100)
    .skip(options.skip || 0);
};

/**
 * Find unreconciled transactions
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
PayoutTransactionSchema.statics.findUnreconciled = function(options = {}) {
  return this.find({
    reconciled: false,
    status: { $in: [TRANSACTION_STATUS.COMPLETED, TRANSACTION_STATUS.FAILED] },
  })
    .sort({ createdAt: -1 })
    .limit(options.limit || 100);
};

/**
 * Get transaction statistics
 * @param {Object} filters - Date filters
 * @returns {Promise<Object>}
 */
PayoutTransactionSchema.statics.getStats = async function(filters = {}) {
  const matchStage = {};

  if (filters.startDate || filters.endDate) {
    matchStage.createdAt = {};
    if (filters.startDate) matchStage.createdAt.$gte = filters.startDate;
    if (filters.endDate) matchStage.createdAt.$lte = filters.endDate;
  }

  if (filters.providerId) {
    matchStage.providerId = new mongoose.Types.ObjectId(filters.providerId);
  }

  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        totalFees: { $sum: '$fee' },
      },
    },
  ]);

  const result = {
    total: 0,
    pending: { count: 0, amount: 0, fees: 0 },
    initiated: { count: 0, amount: 0, fees: 0 },
    processing: { count: 0, amount: 0, fees: 0 },
    completed: { count: 0, amount: 0, fees: 0 },
    failed: { count: 0, amount: 0, fees: 0 },
    cancelled: { count: 0, amount: 0, fees: 0 },
    refunded: { count: 0, amount: 0, fees: 0 },
    disputed: { count: 0, amount: 0, fees: 0 },
  };

  let totalAmount = 0;
  let totalFees = 0;

  stats.forEach(stat => {
    result[stat._id] = { count: stat.count, amount: stat.totalAmount, fees: stat.totalFees };
    result.total += stat.count;
    totalAmount += stat.totalAmount;
    totalFees += stat.totalFees;
  });

  result.totalAmount = totalAmount;
  result.totalFees = totalFees;
  result.netAmount = totalAmount - totalFees;

  return result;
};

/**
 * Get provider statistics
 * @param {Object} filters - Date filters
 * @returns {Promise<Array>}
 */
PayoutTransactionSchema.statics.getProviderStats = async function(filters = {}) {
  const matchStage = {
    status: TRANSACTION_STATUS.COMPLETED,
  };

  if (filters.startDate || filters.endDate) {
    matchStage.createdAt = {};
    if (filters.startDate) matchStage.createdAt.$gte = filters.startDate;
    if (filters.endDate) matchStage.createdAt.$lte = filters.endDate;
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$providerId',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        totalFees: { $sum: '$fee' },
        avgAmount: { $avg: '$amount' },
      },
    },
    {
      $lookup: {
        from: 'payoutproviders',
        localField: '_id',
        foreignField: '_id',
        as: 'provider',
      },
    },
    { $unwind: '$provider' },
    {
      $project: {
        providerId: '$_id',
        providerName: '$provider.name',
        providerCode: '$provider.code',
        count: 1,
        totalAmount: 1,
        totalFees: 1,
        avgAmount: 1,
      },
    },
    { $sort: { totalAmount: -1 } },
  ]);
};

// Create and export the model
const PayoutTransaction = mongoose.model('PayoutTransaction', PayoutTransactionSchema);

module.exports = PayoutTransaction;
