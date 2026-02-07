/**
 * Subscription Model
 * Represents an active or past subscription for a company
 * Tracks billing period, status, and renewal information
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Payment history schema
const PaymentHistorySchema = new Schema({
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'MMK',
  },
  paymentMethod: {
    type: String,
    enum: ['kbzpay', 'wavepay', 'bank_transfer', 'card', 'other'],
    required: true,
  },
  transactionId: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending',
  },
  paidAt: {
    type: Date,
  },
  receiptUrl: {
    type: String,
    trim: true,
  },
  failureReason: {
    type: String,
    trim: true,
  },
}, { _id: true });

// Main Subscription Schema
const SubscriptionSchema = new Schema({
  // Relationships
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company is required'],
    index: true,
  },
  planId: {
    type: Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    required: [true, 'Plan is required'],
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired', 'past_due', 'trialing', 'paused'],
    default: 'trialing',
    index: true,
  },
  
  // Billing period
  currentPeriodStart: {
    type: Date,
    required: true,
  },
  currentPeriodEnd: {
    type: Date,
    required: true,
  },
  
  // Pricing at time of subscription
  price: {
    type: Number,
    required: [true, 'Price is required'],
  },
  currency: {
    type: String,
    default: 'MMK',
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly', 'quarterly'],
    default: 'monthly',
  },
  
  // Payment method
  paymentMethod: {
    type: String,
    enum: ['kbzpay', 'wavepay', 'bank_transfer', 'card'],
  },
  paymentMethodDetails: {
    type: Schema.Types.Mixed,
  },
  
  // Payment history
  paymentHistory: [PaymentHistorySchema],
  
  // Renewal settings
  autoRenew: {
    type: Boolean,
    default: true,
  },
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false,
  },
  
  // Cancellation
  cancelledAt: {
    type: Date,
  },
  cancellationReason: {
    type: String,
    trim: true,
  },
  cancelledBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  
  // Trial
  isTrial: {
    type: Boolean,
    default: false,
  },
  trialEndsAt: {
    type: Date,
  },
  
  // Upgrade/Downgrade
  previousSubscriptionId: {
    type: Schema.Types.ObjectId,
    ref: 'Subscription',
  },
  upgradeDowngradeDate: {
    type: Date,
  },
  prorationApplied: {
    type: Boolean,
    default: false,
  },
  prorationAmount: {
    type: Number,
    default: 0,
  },
  
  // Usage tracking
  usage: {
    jobsPosted: {
      type: Number,
      default: 0,
    },
    storageUsed: {
      type: Number,
      default: 0, // In MB
    },
    apiCalls: {
      type: Number,
      default: 0,
    },
    aiCreditsUsed: {
      type: Number,
      default: 0,
    },
    bonusAiCredits: {
      type: Number,
      default: 0,
    },
  },
  
  // Invoice settings
  invoiceSettings: {
    sendEmail: {
      type: Boolean,
      default: true,
    },
    emailAddress: {
      type: String,
      trim: true,
    },
    billingAddress: {
      type: String,
      trim: true,
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

SubscriptionSchema.index({ companyId: 1, status: 1 });
SubscriptionSchema.index({ currentPeriodEnd: 1, status: 1 });
SubscriptionSchema.index({ status: 1, autoRenew: 1 });

// ==================== VIRTUALS ====================

// Virtual for is active
SubscriptionSchema.virtual('isActive').get(function() {
  return ['active', 'trialing'].includes(this.status);
});

// Virtual for days until expiration
SubscriptionSchema.virtual('daysUntilExpiration').get(function() {
  if (!this.currentPeriodEnd) return null;
  const diffTime = this.currentPeriodEnd - new Date();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for is expired
SubscriptionSchema.virtual('isExpired').get(function() {
  return this.currentPeriodEnd && this.currentPeriodEnd < new Date();
});

// Virtual for is in trial
SubscriptionSchema.virtual('isTrialing').get(function() {
  return this.isTrial && this.trialEndsAt && this.trialEndsAt > new Date();
});

// Virtual for formatted price
SubscriptionSchema.virtual('formattedPrice').get(function() {
  return `${this.price.toLocaleString()} ${this.currency}`;
});

// Virtual for total paid
SubscriptionSchema.virtual('totalPaid').get(function() {
  return this.paymentHistory
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);
});

// ==================== MIDDLEWARE ====================

// Pre-save middleware to update company subscription info
SubscriptionSchema.pre('save', async function(next) {
  if (this.isModified('status') && ['active', 'trialing'].includes(this.status)) {
    // Update company's current subscription
    const Company = mongoose.model('Company');
    await Company.findByIdAndUpdate(this.companyId, {
      currentSubscription: {
        planId: this.planId,
        status: this.status,
        startedAt: this.currentPeriodStart,
        expiresAt: this.currentPeriodEnd,
        autoRenew: this.autoRenew,
      },
    });
  }
  
  // Handle expiration
  if (this.isModified('status') && this.status === 'expired') {
    const Company = mongoose.model('Company');
    await Company.findByIdAndUpdate(this.companyId, {
      'currentSubscription.status': 'expired',
    });
  }
  
  next();
});

// ==================== INSTANCE METHODS ====================

/**
 * Check if subscription is valid for a specific date
 * @param {Date} date - Date to check
 * @returns {boolean}
 */
SubscriptionSchema.methods.isValidForDate = function(date = new Date()) {
  return date >= this.currentPeriodStart && date <= this.currentPeriodEnd;
};

/**
 * Record a payment
 * @param {Object} payment - Payment details
 * @returns {Promise<void>}
 */
SubscriptionSchema.methods.recordPayment = async function(payment) {
  this.paymentHistory.push({
    ...payment,
    paidAt: payment.status === 'completed' ? new Date() : undefined,
  });
  
  if (payment.status === 'completed') {
    this.status = 'active';
  }
  
  await this.save();
};

/**
 * Cancel subscription
 * @param {Object} options - Cancellation options
 * @returns {Promise<void>}
 */
SubscriptionSchema.methods.cancel = async function(options = {}) {
  const { reason, cancelledBy, atPeriodEnd = true } = options;
  
  this.cancelAtPeriodEnd = atPeriodEnd;
  this.cancellationReason = reason;
  this.cancelledBy = cancelledBy;
  this.cancelledAt = new Date();
  
  if (!atPeriodEnd) {
    this.status = 'cancelled';
  }
  
  await this.save();
};

/**
 * Reactivate cancelled subscription
 * @returns {Promise<void>}
 */
SubscriptionSchema.methods.reactivate = async function() {
  if (this.status !== 'cancelled' && !this.cancelAtPeriodEnd) {
    throw new Error('Subscription is not cancelled');
  }
  
  this.cancelAtPeriodEnd = false;
  this.cancellationReason = undefined;
  this.cancelledBy = undefined;
  this.cancelledAt = undefined;
  
  if (this.isExpired) {
    // Extend period if expired
    const now = new Date();
    this.currentPeriodStart = now;
    this.currentPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days
    this.status = 'active';
  }
  
  await this.save();
};

/**
 * Renew subscription for next period
 * @returns {Promise<void>}
 */
SubscriptionSchema.methods.renew = async function() {
  const periodDays = this.billingCycle === 'yearly' ? 365 : 30;
  this.currentPeriodStart = this.currentPeriodEnd;
  this.currentPeriodEnd = new Date(this.currentPeriodEnd.getTime() + periodDays * 24 * 60 * 60 * 1000);
  this.status = 'active';
  this.cancelAtPeriodEnd = false;
  
  // Reset usage counters
  this.usage.jobsPosted = 0;
  this.usage.apiCalls = 0;
  
  await this.save();
};

/**
 * Upgrade/downgrade plan
 * @param {string} newPlanId - New plan ID
 * @param {Object} options - Upgrade options
 * @returns {Promise<void>}
 */
SubscriptionSchema.methods.changePlan = async function(newPlanId, options = {}) {
  const { prorationAmount = 0, effectiveDate = new Date() } = options;
  
  this.previousSubscriptionId = this._id;
  this.planId = newPlanId;
  this.upgradeDowngradeDate = effectiveDate;
  this.prorationApplied = prorationAmount !== 0;
  this.prorationAmount = prorationAmount;
  
  await this.save();
};

/**
 * Increment usage counter
 * @param {string} metric - Metric name
 * @param {number} amount - Amount to increment
 * @returns {Promise<void>}
 */
SubscriptionSchema.methods.incrementUsage = async function(metric, amount = 1) {
  if (this.usage[metric] !== undefined) {
    this.usage[metric] += amount;
    await this.save();
  }
};

// ==================== STATIC METHODS ====================

/**
 * Find active subscription for company
 * @param {string} companyId - Company ID
 * @returns {Promise<Document|null>}
 */
SubscriptionSchema.statics.findActiveByCompany = function(companyId) {
  return this.findOne({
    companyId,
    status: { $in: ['active', 'trialing'] },
    currentPeriodEnd: { $gt: new Date() },
  }).populate('planId');
};

/**
 * Find subscriptions expiring soon
 * @param {number} days - Days until expiration
 * @returns {Promise<Array>}
 */
SubscriptionSchema.statics.findExpiringSoon = function(days = 7) {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + days);
  
  return this.find({
    status: { $in: ['active', 'trialing'] },
    currentPeriodEnd: { $lte: expirationDate, $gt: new Date() },
    autoRenew: true,
  }).populate('companyId', 'name email');
};

/**
 * Find expired subscriptions that need processing
 * @returns {Promise<Array>}
 */
SubscriptionSchema.statics.findExpired = function() {
  return this.find({
    status: { $in: ['active', 'trialing'] },
    currentPeriodEnd: { $lte: new Date() },
  });
};

/**
 * Get subscription statistics
 * @returns {Promise<Object>}
 */
SubscriptionSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRevenue: {
          $sum: {
            $cond: [{ $eq: ['$status', 'active'] }, '$price', 0],
          },
        },
      },
    },
  ]);
  
  const result = {
    total: 0,
    active: 0,
    trialing: 0,
    cancelled: 0,
    expired: 0,
    pastDue: 0,
    monthlyRecurringRevenue: 0,
  };
  
  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
    if (stat._id === 'active') {
      result.monthlyRecurringRevenue = stat.totalRevenue;
    }
  });
  
  return result;
};

/**
 * Create new subscription
 * @param {Object} data - Subscription data
 * @returns {Promise<Document>}
 */
SubscriptionSchema.statics.createSubscription = async function(data) {
  const { companyId, planId, billingCycle = 'monthly', isTrial = false, trialDays = 0 } = data;
  
  // Get plan details
  const SubscriptionPlan = mongoose.model('SubscriptionPlan');
  const plan = await SubscriptionPlan.findById(planId);
  
  if (!plan) {
    throw new Error('Subscription plan not found');
  }
  
  // Calculate period
  const now = new Date();
  const periodDays = billingCycle === 'yearly' ? 365 : 30;
  
  let currentPeriodStart = now;
  let currentPeriodEnd = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);
  let status = 'active';
  let trialEndsAt;
  
  if (isTrial && trialDays > 0) {
    status = 'trialing';
    trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
    currentPeriodEnd = trialEndsAt;
  }
  
  // Calculate price
  const price = billingCycle === 'yearly' 
    ? plan.getPriceForPeriod('yearly')
    : plan.price;
  
  const subscription = await this.create({
    companyId,
    planId,
    status,
    currentPeriodStart,
    currentPeriodEnd,
    price,
    currency: plan.currency,
    billingCycle,
    isTrial,
    trialEndsAt,
    ...data,
  });
  
  return subscription;
};

// Create and export the model
const Subscription = mongoose.model('Subscription', SubscriptionSchema);

module.exports = Subscription;
