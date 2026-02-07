/**
 * PaymentTransaction Model
 * Comprehensive transaction tracking for all payment operations
 * Supports deposits, withdrawals, refunds, and reconciliation
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
  PARTIALLY_REFUNDED: 'partially_refunded',
  DISPUTED: 'disputed',
  ON_HOLD: 'on_hold',
  EXPIRED: 'expired'
};

// Transaction type constants
const TRANSACTION_TYPE = {
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
  REFUND: 'refund',
  FEE: 'fee',
  ADJUSTMENT: 'adjustment',
  TRANSFER: 'transfer',
  REVERSAL: 'reversal'
};

// Payment provider constants
const PAYMENT_PROVIDER = {
  KBZPAY: 'kbzpay',
  WAVEPAY: 'wavepay',
  AYAPAY: 'ayapay',
  MPU: 'mpu',
  STRIPE: 'stripe',
  TWOC2P: 'twoc2p',
  BANK_TRANSFER: 'bank_transfer',
  CASH: 'cash'
};

// Provider response schema for audit trail
const ProviderResponseSchema = new Schema({
  request: {
    type: Schema.Types.Mixed,
    default: null
  },
  response: {
    type: Schema.Types.Mixed,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  duration: {
    type: Number, // in milliseconds
    default: 0
  },
  httpStatus: {
    type: Number,
    default: null
  }
}, { _id: true });

// Retry attempt schema
const RetryAttemptSchema = new Schema({
  attemptNumber: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: Object.values(TRANSACTION_STATUS),
    required: true
  },
  errorMessage: {
    type: String,
    default: null
  },
  errorCode: {
    type: String,
    default: null
  },
  providerResponse: {
    type: ProviderResponseSchema,
    default: null
  }
}, { _id: true });

// Refund record schema
const RefundRecordSchema = new Schema({
  refundId: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: Object.values(TRANSACTION_STATUS),
    default: TRANSACTION_STATUS.PENDING
  },
  processedAt: {
    type: Date,
    default: null
  },
  processedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  providerRefundId: {
    type: String,
    default: null
  }
}, { _id: true });

// Fee breakdown schema
const FeeBreakdownSchema = new Schema({
  type: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    default: null
  },
  description: {
    type: String,
    default: null
  }
}, { _id: true });

// Main PaymentTransaction Schema
const PaymentTransactionSchema = new Schema({
  // Transaction identifiers
  transactionNumber: {
    type: String,
    required: [true, 'Transaction number is required'],
    unique: true,
    trim: true,
    uppercase: true,
    index: true
  },
  
  orderId: {
    type: String,
    required: [true, 'Order ID is required'],
    trim: true,
    index: true
  },
  
  providerTransactionId: {
    type: String,
    default: null,
    trim: true,
    index: true
  },
  
  providerOrderId: {
    type: String,
    default: null,
    trim: true
  },

  // Transaction type and status
  type: {
    type: String,
    enum: Object.values(TRANSACTION_TYPE),
    required: true,
    index: true
  },
  
  status: {
    type: String,
    enum: Object.values(TRANSACTION_STATUS),
    default: TRANSACTION_STATUS.PENDING,
    index: true
  },
  
  previousStatus: {
    type: String,
    enum: Object.values(TRANSACTION_STATUS),
    default: null
  },

  // Amount information
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: 0
  },
  
  currency: {
    type: String,
    required: true,
    default: 'MMK',
    uppercase: true,
    trim: true
  },
  
  fees: {
    type: Number,
    default: 0,
    min: 0
  },
  
  feeBreakdown: [FeeBreakdownSchema],
  
  netAmount: {
    type: Number,
    default: function() {
      return this.amount - (this.fees || 0);
    }
  },
  
  refundedAmount: {
    type: Number,
    default: 0,
    min: 0
  },

  // Payment provider information
  provider: {
    type: String,
    enum: Object.values(PAYMENT_PROVIDER),
    required: true,
    index: true
  },
  
  paymentMethod: {
    type: String,
    default: null,
    trim: true
  },

  // User information
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  userEmail: {
    type: String,
    default: null,
    lowercase: true,
    trim: true
  },
  
  userPhone: {
    type: String,
    default: null,
    trim: true
  },

  // Recipient information (for withdrawals)
  recipientInfo: {
    phone: {
      type: String,
      default: null,
      trim: true
    },
    name: {
      type: String,
      default: null,
      trim: true
    },
    accountNumber: {
      type: String,
      default: null,
      trim: true
    },
    bankName: {
      type: String,
      default: null,
      trim: true
    },
    bankCode: {
      type: String,
      default: null,
      trim: true
    }
  },

  // Description and metadata
  description: {
    type: String,
    default: null,
    trim: true
  },
  
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },

  // QR code information
  qrCode: {
    data: {
      type: String,
      default: null
    },
    imageUrl: {
      type: String,
      default: null
    },
    expiryTime: {
      type: Date,
      default: null
    }
  },

  // URLs and redirects
  callbackUrl: {
    type: String,
    default: null,
    trim: true
  },
  
  successUrl: {
    type: String,
    default: null,
    trim: true
  },
  
  failureUrl: {
    type: String,
    default: null,
    trim: true
  },

  // Idempotency
  idempotencyKey: {
    type: String,
    default: null,
    index: true
  },

  // Timestamps
  initiatedAt: {
    type: Date,
    default: Date.now
  },
  
  completedAt: {
    type: Date,
    default: null
  },
  
  failedAt: {
    type: Date,
    default: null
  },
  
  expiresAt: {
    type: Date,
    default: null
  },

  // Provider interactions
  providerRequests: [ProviderResponseSchema],
  
  retryAttempts: [RetryAttemptSchema],
  
  retryCount: {
    type: Number,
    default: 0
  },

  // Refunds
  refunds: [RefundRecordSchema],

  // Error information
  errorMessage: {
    type: String,
    default: null
  },
  
  errorCode: {
    type: String,
    default: null
  },
  
  errorDetails: {
    type: Schema.Types.Mixed,
    default: null
  },

  // Reconciliation
  reconciledAt: {
    type: Date,
    default: null
  },
  
  reconciliationStatus: {
    type: String,
    enum: ['pending', 'matched', 'mismatched', 'disputed'],
    default: 'pending'
  },
  
  reconciliationNotes: {
    type: String,
    default: null
  },

  // Related entities
  relatedTransactions: [{
    type: Schema.Types.ObjectId,
    ref: 'PaymentTransaction'
  }],
  
  parentTransactionId: {
    type: Schema.Types.ObjectId,
    ref: 'PaymentTransaction',
    default: null
  },

  // Audit fields
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  ipAddress: {
    type: String,
    default: null
  },
  
  userAgent: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  collection: 'payment_transactions'
});

// Indexes for common queries
PaymentTransactionSchema.index({ userId: 1, status: 1, createdAt: -1 });
PaymentTransactionSchema.index({ provider: 1, status: 1 });
PaymentTransactionSchema.index({ type: 1, status: 1, createdAt: -1 });
PaymentTransactionSchema.index({ orderId: 1, provider: 1 });
PaymentTransactionSchema.index({ providerTransactionId: 1 });
PaymentTransactionSchema.index({ 'recipientInfo.phone': 1 });
PaymentTransactionSchema.index({ createdAt: -1 });
PaymentTransactionSchema.index({ reconciledAt: 1 });

// Virtual for isRefundable
PaymentTransactionSchema.virtual('isRefundable').get(function() {
  return ['completed'].includes(this.status) && 
         this.refundedAmount < this.amount &&
         ['deposit'].includes(this.type);
});

// Virtual for remaining refundable amount
PaymentTransactionSchema.virtual('remainingRefundableAmount').get(function() {
  if (!this.isRefundable) return 0;
  return this.amount - this.refundedAmount;
});

// Pre-save middleware to calculate net amount
PaymentTransactionSchema.pre('save', function(next) {
  if (this.isModified('amount') || this.isModified('fees')) {
    this.netAmount = this.amount - (this.fees || 0);
  }
  next();
});

// Instance methods

/**
 * Update transaction status with audit trail
 */
PaymentTransactionSchema.methods.updateStatus = async function(newStatus, options = {}) {
  this.previousStatus = this.status;
  this.status = newStatus;

  if (newStatus === 'completed') {
    this.completedAt = new Date();
  } else if (newStatus === 'failed') {
    this.failedAt = new Date();
    this.errorMessage = options.errorMessage || null;
    this.errorCode = options.errorCode || null;
    this.errorDetails = options.errorDetails || null;
  }

  if (options.updatedBy) {
    this.updatedBy = options.updatedBy;
  }

  return this.save();
};

/**
 * Add provider response to audit trail
 */
PaymentTransactionSchema.methods.addProviderResponse = function(request, response, duration, httpStatus) {
  this.providerRequests.push({
    request: this.sanitizeForStorage(request),
    response: this.sanitizeForStorage(response),
    timestamp: new Date(),
    duration,
    httpStatus
  });
  return this.save();
};

/**
 * Record retry attempt
 */
PaymentTransactionSchema.methods.recordRetry = function(attemptNumber, status, errorMessage, errorCode) {
  this.retryAttempts.push({
    attemptNumber,
    status,
    errorMessage,
    errorCode,
    timestamp: new Date()
  });
  this.retryCount = attemptNumber;
  return this.save();
};

/**
 * Add refund record
 */
PaymentTransactionSchema.methods.addRefund = function(refundData) {
  this.refunds.push(refundData);
  this.refundedAmount += refundData.amount;
  
  if (this.refundedAmount >= this.amount) {
    this.status = TRANSACTION_STATUS.REFUNDED;
  } else if (this.refundedAmount > 0) {
    this.status = TRANSACTION_STATUS.PARTIALLY_REFUNDED;
  }
  
  return this.save();
};

/**
 * Sanitize data for storage (remove sensitive fields)
 */
PaymentTransactionSchema.methods.sanitizeForStorage = function(data) {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveFields = ['password', 'pin', 'cvv', 'cardNumber', 'secret', 'apiKey'];
  const sanitized = { ...data };
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  });
  
  return sanitized;
};

// Static methods

/**
 * Find transactions by user
 */
PaymentTransactionSchema.statics.findByUser = function(userId, options = {}) {
  const query = { userId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.type) {
    query.type = options.type;
  }
  
  if (options.provider) {
    query.provider = options.provider;
  }
  
  return this.find(query)
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

/**
 * Find pending transactions for reconciliation
 */
PaymentTransactionSchema.statics.findPendingForReconciliation = function(options = {}) {
  const query = {
    status: { $in: ['pending', 'processing', 'initiated'] },
    reconciledAt: null
  };
  
  if (options.before) {
    query.createdAt = { $lt: options.before };
  }
  
  return this.find(query).sort({ createdAt: 1 });
};

/**
 * Get transaction statistics
 */
PaymentTransactionSchema.statics.getStatistics = async function(options = {}) {
  const matchStage = {};
  
  if (options.startDate && options.endDate) {
    matchStage.createdAt = {
      $gte: new Date(options.startDate),
      $lte: new Date(options.endDate)
    };
  }
  
  if (options.provider) {
    matchStage.provider = options.provider;
  }
  
  if (options.type) {
    matchStage.type = options.type;
  }

  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        totalFees: { $sum: '$fees' },
        totalNetAmount: { $sum: '$netAmount' }
      }
    }
  ]);

  return stats;
};

/**
 * Generate unique transaction number
 */
PaymentTransactionSchema.statics.generateTransactionNumber = function() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TXN${timestamp}${random}`;
};

// Create and export model
const PaymentTransaction = mongoose.model('PaymentTransaction', PaymentTransactionSchema);

module.exports = PaymentTransaction;
module.exports.TRANSACTION_STATUS = TRANSACTION_STATUS;
module.exports.TRANSACTION_TYPE = TRANSACTION_TYPE;
module.exports.PAYMENT_PROVIDER = PAYMENT_PROVIDER;
