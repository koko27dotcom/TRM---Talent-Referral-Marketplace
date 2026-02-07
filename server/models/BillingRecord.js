/**
 * BillingRecord Model
 * Represents invoices and billing records for companies
 * Tracks subscription charges, per-hire fees, and other charges
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Invoice item schema
const InvoiceItemSchema = new Schema({
  description: {
    type: String,
    required: [true, 'Item description is required'],
    trim: true,
  },
  type: {
    type: String,
    enum: ['subscription', 'per_hire_fee', 'overage', 'upgrade', 'proration', 'refund', 'other'],
    required: true,
  },
  quantity: {
    type: Number,
    default: 1,
    min: 0,
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: 0,
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: 0,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, { _id: true });

// Payment details schema
const PaymentDetailsSchema = new Schema({
  method: {
    type: String,
    enum: ['kbzpay', 'wavepay', 'bank_transfer', 'card', 'cash'],
  },
  transactionId: {
    type: String,
    trim: true,
  },
  paidAt: {
    type: Date,
  },
  paidBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  receiptUrl: {
    type: String,
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  // For bank transfers
  bankName: {
    type: String,
    trim: true,
  },
  accountNumber: {
    type: String,
    trim: true,
  },
  referenceNumber: {
    type: String,
    trim: true,
  },
}, { _id: false });

// Main BillingRecord Schema
const BillingRecordSchema = new Schema({
  // Relationships
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company is required'],
    index: true,
  },
  subscriptionId: {
    type: Schema.Types.ObjectId,
    ref: 'Subscription',
  },
  
  // Invoice details
  invoiceNumber: {
    type: String,
    required: [true, 'Invoice number is required'],
    unique: true,
    trim: true,
    uppercase: true,
  },
  invoiceType: {
    type: String,
    enum: ['subscription', 'one_time', 'consolidated'],
    default: 'subscription',
  },
  
  // Billing period (for subscription invoices)
  billingPeriodStart: {
    type: Date,
  },
  billingPeriodEnd: {
    type: Date,
  },
  
  // Invoice items
  items: [InvoiceItemSchema],
  
  // Financial summary
  subtotal: {
    type: Number,
    required: [true, 'Subtotal is required'],
    min: 0,
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
  },
  discountCode: {
    type: String,
    trim: true,
  },
  tax: {
    type: Number,
    default: 0,
    min: 0,
  },
  taxRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  total: {
    type: Number,
    required: [true, 'Total is required'],
    min: 0,
  },
  currency: {
    type: String,
    default: 'MMK',
    trim: true,
  },
  
  // Amounts
  amountPaid: {
    type: Number,
    default: 0,
    min: 0,
  },
  amountDue: {
    type: Number,
    default: function() {
      return this.total;
    },
  },
  balance: {
    type: Number,
    default: function() {
      return this.total;
    },
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'pending', 'sent', 'paid', 'partial', 'overdue', 'failed', 'refunded', 'cancelled'],
    default: 'draft',
    index: true,
  },
  
  // Payment details
  payment: {
    type: PaymentDetailsSchema,
    default: () => ({}),
  },
  
  // Due date
  dueDate: {
    type: Date,
    required: [true, 'Due date is required'],
  },
  
  // Dates
  sentAt: {
    type: Date,
  },
  paidAt: {
    type: Date,
  },
  
  // Overdue tracking
  isOverdue: {
    type: Boolean,
    default: false,
  },
  overdueNotifiedAt: {
    type: Date,
  },
  
  // Refund information
  refundAmount: {
    type: Number,
    default: 0,
  },
  refundReason: {
    type: String,
    trim: true,
  },
  refundedAt: {
    type: Date,
  },
  refundedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  
  // Notes
  notes: {
    type: String,
    trim: true,
  },
  internalNotes: {
    type: String,
    trim: true,
  },
  
  // PDF/Document
  documentUrl: {
    type: String,
    trim: true,
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

BillingRecordSchema.index({ invoiceNumber: 1 }, { unique: true });
BillingRecordSchema.index({ companyId: 1, status: 1 });
BillingRecordSchema.index({ status: 1, dueDate: 1 });
BillingRecordSchema.index({ dueDate: 1 });
BillingRecordSchema.index({ createdAt: -1 });

// ==================== VIRTUALS ====================

// Virtual for is paid
BillingRecordSchema.virtual('isPaid').get(function() {
  return this.status === 'paid' || this.amountPaid >= this.total;
});

// Virtual for check if overdue (calculated)
BillingRecordSchema.virtual('isOverdueStatus').get(function() {
  if (this.status === 'paid' || this.status === 'cancelled') return false;
  return this.dueDate && this.dueDate < new Date();
});

// Virtual for days overdue
BillingRecordSchema.virtual('daysOverdue').get(function() {
  if (!this.isOverdue) return 0;
  const diffTime = new Date() - this.dueDate;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for remaining balance
BillingRecordSchema.virtual('remainingBalance').get(function() {
  return Math.max(0, this.total - this.amountPaid);
});

// Virtual for formatted total
BillingRecordSchema.virtual('formattedTotal').get(function() {
  return `${this.total.toLocaleString()} ${this.currency}`;
});

// ==================== MIDDLEWARE ====================

// Pre-save middleware to calculate totals
BillingRecordSchema.pre('save', function(next) {
  // Calculate subtotal from items
  if (this.isModified('items')) {
    this.subtotal = this.items.reduce((sum, item) => sum + item.amount, 0);
  }
  
  // Calculate total
  if (this.isModified('subtotal') || this.isModified('tax') || this.isModified('discount')) {
    this.total = this.subtotal + this.tax - this.discount;
  }
  
  // Calculate balance
  if (this.isModified('total') || this.isModified('amountPaid')) {
    this.balance = Math.max(0, this.total - this.amountPaid);
    this.amountDue = this.balance;
  }
  
  // Update status based on payment
  if (this.isModified('amountPaid')) {
    if (this.amountPaid >= this.total) {
      this.status = 'paid';
      this.paidAt = new Date();
    } else if (this.amountPaid > 0) {
      this.status = 'partial';
    }
  }
  
  // Check overdue status
  if (this.dueDate && this.dueDate < new Date() && !['paid', 'cancelled', 'refunded'].includes(this.status)) {
    this.isOverdue = true;
  }
  
  next();
});

// ==================== INSTANCE METHODS ====================

/**
 * Record a payment
 * @param {Object} payment - Payment details
 * @returns {Promise<void>}
 */
BillingRecordSchema.methods.recordPayment = async function(payment) {
  const { amount, method, transactionId, paidBy, receiptUrl, notes } = payment;
  
  this.amountPaid += amount;
  
  // Update payment details
  this.payment = {
    method,
    transactionId,
    paidAt: new Date(),
    paidBy,
    receiptUrl,
    notes,
  };
  
  await this.save();
};

/**
 * Mark as sent
 * @returns {Promise<void>}
 */
BillingRecordSchema.methods.markAsSent = async function() {
  this.status = 'sent';
  this.sentAt = new Date();
  await this.save();
};

/**
 * Process refund
 * @param {Object} refund - Refund details
 * @returns {Promise<void>}
 */
BillingRecordSchema.methods.processRefund = async function(refund) {
  const { amount, reason, refundedBy } = refund;
  
  if (amount > this.amountPaid) {
    throw new Error('Refund amount cannot exceed amount paid');
  }
  
  this.refundAmount = amount;
  this.refundReason = reason;
  this.refundedAt = new Date();
  this.refundedBy = refundedBy;
  this.status = 'refunded';
  
  await this.save();
};

/**
 * Cancel invoice
 * @param {string} reason - Cancellation reason
 * @returns {Promise<void>}
 */
BillingRecordSchema.methods.cancel = async function(reason) {
  this.status = 'cancelled';
  this.internalNotes = reason;
  await this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Generate unique invoice number
 * @returns {string}
 */
BillingRecordSchema.statics.generateInvoiceNumber = async function() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  // Count invoices for this month
  const count = await this.countDocuments({
    createdAt: {
      $gte: new Date(year, now.getMonth(), 1),
      $lt: new Date(year, now.getMonth() + 1, 1),
    },
  });
  
  const sequence = String(count + 1).padStart(4, '0');
  return `INV-${year}${month}-${sequence}`;
};

/**
 * Find invoices by company
 * @param {string} companyId - Company ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
BillingRecordSchema.statics.findByCompany = function(companyId, options = {}) {
  const query = { companyId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

/**
 * Find overdue invoices
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
BillingRecordSchema.statics.findOverdue = function(options = {}) {
  return this.find({
    status: { $nin: ['paid', 'cancelled', 'refunded'] },
    dueDate: { $lt: new Date() },
  })
    .populate('companyId', 'name email')
    .sort({ dueDate: 1 })
    .limit(options.limit || 100);
};

/**
 * Get billing statistics
 * @param {Object} filters - Date filters
 * @returns {Promise<Object>}
 */
BillingRecordSchema.statics.getStats = async function(filters = {}) {
  const matchStage = { status: { $in: ['paid', 'partial'] } };
  
  if (filters.startDate || filters.endDate) {
    matchStage.createdAt = {};
    if (filters.startDate) matchStage.createdAt.$gte = filters.startDate;
    if (filters.endDate) matchStage.createdAt.$lte = filters.endDate;
  }
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amountPaid' },
        totalInvoices: { $sum: 1 },
        averageInvoice: { $avg: '$total' },
        byStatus: {
          $push: '$status',
        },
      },
    },
  ]);
  
  return stats[0] || {
    totalRevenue: 0,
    totalInvoices: 0,
    averageInvoice: 0,
  };
};

/**
 * Get company billing summary
 * @param {string} companyId - Company ID
 * @returns {Promise<Object>}
 */
BillingRecordSchema.statics.getCompanySummary = async function(companyId) {
  const summary = await this.aggregate([
    { $match: { companyId: new mongoose.Types.ObjectId(companyId) } },
    {
      $group: {
        _id: null,
        totalSpent: { $sum: '$amountPaid' },
        totalInvoices: { $sum: 1 },
        paidInvoices: {
          $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] },
        },
        pendingInvoices: {
          $sum: { $cond: [{ $in: ['$status', ['pending', 'sent', 'partial']] }, 1, 0] },
        },
        overdueInvoices: {
          $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] },
        },
        outstandingAmount: {
          $sum: {
            $cond: [{ $in: ['$status', ['pending', 'sent', 'partial', 'overdue']] }, '$balance', 0],
          },
        },
      },
    },
  ]);
  
  return summary[0] || {
    totalSpent: 0,
    totalInvoices: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
    overdueInvoices: 0,
    outstandingAmount: 0,
  };
};

/**
 * Create subscription invoice
 * @param {Object} data - Invoice data
 * @returns {Promise<Document>}
 */
BillingRecordSchema.statics.createSubscriptionInvoice = async function(data) {
  const invoiceNumber = await this.generateInvoiceNumber();
  
  const invoice = await this.create({
    invoiceNumber,
    invoiceType: 'subscription',
    ...data,
  });
  
  return invoice;
};

// Create and export the model
const BillingRecord = mongoose.model('BillingRecord', BillingRecordSchema);

module.exports = BillingRecord;
