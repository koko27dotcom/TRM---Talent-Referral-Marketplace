/**
 * PromotionalCode Model
 * Manages promotional codes, discounts, and coupon campaigns
 * Supports percentage and fixed amount discounts with usage limits
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Usage record schema for tracking individual uses
const UsageRecordSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
  },
  usedAt: {
    type: Date,
    default: Date.now,
  },
  context: {
    type: {
      type: String,
      enum: ['job_posting', 'subscription', 'featured_listing', 'other'],
      required: true,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      // Reference to Job, Subscription, etc.
    },
    originalAmount: {
      type: Number,
      required: true,
    },
    discountAmount: {
      type: Number,
      required: true,
    },
    finalAmount: {
      type: Number,
      required: true,
    },
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
}, { _id: true });

// Applicability rules schema
const ApplicabilityRulesSchema = new Schema({
  // Which services this code applies to
  services: {
    jobPostings: {
      type: Boolean,
      default: true,
    },
    subscriptions: {
      type: Boolean,
      default: false,
    },
    featuredListings: {
      type: Boolean,
      default: false,
    },
    upgrades: {
      type: Boolean,
      default: false,
    },
  },
  
  // Minimum order value to apply code
  minimumOrderValue: {
    type: Number,
    default: 0,
    min: 0,
  },
  
  // Maximum discount cap (for percentage discounts)
  maximumDiscount: {
    type: Number,
    min: 0,
  },
  
  // Specific categories this code applies to
  applicableCategories: [{
    type: String,
    trim: true,
  }],
  
  // Specific subscription plans this code applies to
  applicablePlans: [{
    type: Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
  }],
  
  // User segments eligible for this code
  eligibleUserSegments: [{
    type: String,
    trim: true,
  }],
  
  // New users only
  newUsersOnly: {
    type: Boolean,
    default: false,
  },
  
  // First purchase only
  firstPurchaseOnly: {
    type: Boolean,
    default: false,
  },
  
  // Exclude discounted items
  excludeDiscountedItems: {
    type: Boolean,
    default: false,
  },
}, { _id: false });

// Main PromotionalCode Schema
const PromotionalCodeSchema = new Schema({
  // Basic Information
  code: {
    type: String,
    required: [true, 'Promotional code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    minlength: [3, 'Code must be at least 3 characters'],
    maxlength: [50, 'Code cannot exceed 50 characters'],
    // Validation: alphanumeric and hyphens only
    match: [/^[A-Z0-9_-]+$/, 'Code can only contain letters, numbers, hyphens, and underscores'],
  },
  name: {
    type: String,
    required: [true, 'Promotional code name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  
  // Campaign reference
  campaignId: {
    type: String,
    trim: true,
    // For grouping codes by marketing campaign
  },
  
  // Discount Configuration
  discountType: {
    type: String,
    required: [true, 'Discount type is required'],
    enum: [
      'percentage',    // Percentage off (e.g., 20%)
      'fixed_amount',  // Fixed amount off (e.g., $50)
      'free_service',  // Free service (100% off)
      'credit',        // Account credit
    ],
  },
  discountValue: {
    type: Number,
    required: [true, 'Discount value is required'],
    min: [0, 'Discount value cannot be negative'],
    validate: {
      validator: function(value) {
        // Percentage discounts cannot exceed 100%
        if (this.discountType === 'percentage' && value > 100) {
          return false;
        }
        return true;
      },
      message: 'Percentage discount cannot exceed 100%',
    },
  },
  
  // Currency (for fixed amount discounts)
  currency: {
    type: String,
    default: 'MMK',
    trim: true,
  },
  
  // Applicability Rules
  applicability: {
    type: ApplicabilityRulesSchema,
    default: () => ({}),
  },
  
  // Usage Limits
  usageLimits: {
    total: {
      type: Number,
      default: 0,
      min: 0,
      // 0 = unlimited
    },
    perUser: {
      type: Number,
      default: 1,
      min: 0,
      // 0 = unlimited
    },
    perCompany: {
      type: Number,
      default: 0,
      min: 0,
      // 0 = unlimited
    },
  },
  
  // Usage Tracking
  usageCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  usageRecords: [UsageRecordSchema],
  
  // Unique user and company tracking
  uniqueUsersUsed: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  uniqueCompaniesUsed: [{
    type: Schema.Types.ObjectId,
    ref: 'Company',
  }],
  
  // Validity Period
  validFrom: {
    type: Date,
    default: Date.now,
  },
  validUntil: {
    type: Date,
    // Null means no expiration
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'expired', 'depleted', 'scheduled'],
    default: 'active',
  },
  
  // Display Settings
  displaySettings: {
    showOnWebsite: {
      type: Boolean,
      default: false,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    bannerText: {
      type: String,
      trim: true,
    },
    termsAndConditions: {
      type: String,
      trim: true,
    },
  },
  
  // Metadata
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for efficient querying
PromotionalCodeSchema.index({ code: 1 });
PromotionalCodeSchema.index({ isActive: 1, status: 1 });
PromotionalCodeSchema.index({ validFrom: 1, validUntil: 1 });
PromotionalCodeSchema.index({ campaignId: 1 });
PromotionalCodeSchema.index({ 'applicability.services.jobPostings': 1 });
PromotionalCodeSchema.index({ 'applicability.services.subscriptions': 1 });

// Virtual for checking if code is currently valid
PromotionalCodeSchema.virtual('isCurrentlyValid').get(function() {
  if (!this.isActive) return false;
  if (this.status !== 'active') return false;
  
  const now = new Date();
  if (now < this.validFrom) return false;
  if (this.validUntil && now > this.validUntil) return false;
  
  // Check total usage limit
  if (this.usageLimits.total > 0 && this.usageCount >= this.usageLimits.total) {
    return false;
  }
  
  return true;
});

// Virtual for remaining uses
PromotionalCodeSchema.virtual('remainingUses').get(function() {
  if (this.usageLimits.total === 0) return null; // Unlimited
  return Math.max(0, this.usageLimits.total - this.usageCount);
});

// Method to calculate discount amount
PromotionalCodeSchema.methods.calculateDiscount = function(originalAmount) {
  if (!this.isCurrentlyValid) {
    return {
      valid: false,
      error: 'Promotional code is not valid',
      discountAmount: 0,
      finalAmount: originalAmount,
    };
  }
  
  // Check minimum order value
  if (originalAmount < this.applicability.minimumOrderValue) {
    return {
      valid: false,
      error: `Minimum order value of ${this.applicability.minimumOrderValue} ${this.currency} required`,
      discountAmount: 0,
      finalAmount: originalAmount,
    };
  }
  
  let discountAmount = 0;
  
  switch (this.discountType) {
    case 'percentage':
    case 'free_service':
      const percentage = this.discountType === 'free_service' ? 100 : this.discountValue;
      discountAmount = originalAmount * (percentage / 100);
      
      // Apply maximum discount cap if set
      if (this.applicability.maximumDiscount && discountAmount > this.applicability.maximumDiscount) {
        discountAmount = this.applicability.maximumDiscount;
      }
      break;
      
    case 'fixed_amount':
      discountAmount = Math.min(this.discountValue, originalAmount);
      break;
      
    case 'credit':
      discountAmount = Math.min(this.discountValue, originalAmount);
      break;
      
    default:
      discountAmount = 0;
  }
  
  // Ensure discount doesn't exceed original amount
  discountAmount = Math.min(discountAmount, originalAmount);
  
  return {
    valid: true,
    discountType: this.discountType,
    discountValue: this.discountValue,
    discountAmount: Math.round(discountAmount * 100) / 100,
    finalAmount: Math.round((originalAmount - discountAmount) * 100) / 100,
    currency: this.currency,
    code: this.code,
    codeId: this._id,
  };
};

// Method to validate if code can be used by a specific user
PromotionalCodeSchema.methods.validateForUser = async function(userId, companyId = null, context = {}) {
  const errors = [];
  
  // Check if code is valid
  if (!this.isCurrentlyValid) {
    errors.push('Promotional code is not valid or has expired');
    return { valid: false, errors };
  }
  
  // Check per-user limit
  if (this.usageLimits.perUser > 0) {
    const userUsageCount = this.usageRecords.filter(
      record => record.userId.toString() === userId.toString()
    ).length;
    
    if (userUsageCount >= this.usageLimits.perUser) {
      errors.push(`You have already used this code ${userUsageCount} time(s)`);
    }
  }
  
  // Check per-company limit
  if (companyId && this.usageLimits.perCompany > 0) {
    const companyUsageCount = this.usageRecords.filter(
      record => record.companyId && record.companyId.toString() === companyId.toString()
    ).length;
    
    if (companyUsageCount >= this.usageLimits.perCompany) {
      errors.push(`Your company has already used this code ${companyUsageCount} time(s)`);
    }
  }
  
  // Check service applicability
  const serviceType = context.serviceType || 'job_posting';
  if (serviceType === 'job_posting' && !this.applicability.services.jobPostings) {
    errors.push('This code is not valid for job postings');
  }
  if (serviceType === 'subscription' && !this.applicability.services.subscriptions) {
    errors.push('This code is not valid for subscriptions');
  }
  if (serviceType === 'featured_listing' && !this.applicability.services.featuredListings) {
    errors.push('This code is not valid for featured listings');
  }
  
  // Check category applicability
  if (this.applicability.applicableCategories && this.applicability.applicableCategories.length > 0) {
    if (!context.category || !this.applicability.applicableCategories.includes(context.category)) {
      errors.push('This code is not valid for this category');
    }
  }
  
  // Check new users only
  if (this.applicability.newUsersOnly && !context.isNewUser) {
    errors.push('This code is only valid for new users');
  }
  
  // Check first purchase only
  if (this.applicability.firstPurchaseOnly && !context.isFirstPurchase) {
    errors.push('This code is only valid for your first purchase');
  }
  
  // Check minimum order value
  if (context.amount && context.amount < this.applicability.minimumOrderValue) {
    errors.push(`Minimum order value of ${this.applicability.minimumOrderValue} ${this.currency} required`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    code: this.code,
    discountType: this.discountType,
    discountValue: this.discountValue,
  };
};

// Method to record usage
PromotionalCodeSchema.methods.recordUsage = async function(userId, usageData) {
  const { companyId, context, ipAddress, userAgent } = usageData;
  
  // Add usage record
  this.usageRecords.push({
    userId,
    companyId,
    usedAt: new Date(),
    context,
    ipAddress,
    userAgent,
  });
  
  // Increment usage count
  this.usageCount += 1;
  
  // Track unique users
  if (!this.uniqueUsersUsed.includes(userId)) {
    this.uniqueUsersUsed.push(userId);
  }
  
  // Track unique companies
  if (companyId && !this.uniqueCompaniesUsed.includes(companyId)) {
    this.uniqueCompaniesUsed.push(companyId);
  }
  
  // Update status if depleted
  if (this.usageLimits.total > 0 && this.usageCount >= this.usageLimits.total) {
    this.status = 'depleted';
  }
  
  await this.save();
  
  return this;
};

// Static method to find by code (case-insensitive)
PromotionalCodeSchema.statics.findByCode = async function(code) {
  return this.findOne({
    code: code.toUpperCase().trim(),
    isActive: true,
  });
};

// Static method to get active codes
PromotionalCodeSchema.statics.getActiveCodes = async function(options = {}) {
  const { serviceType, limit = 10 } = options;
  
  const now = new Date();
  const query = {
    isActive: true,
    status: 'active',
    validFrom: { $lte: now },
    $or: [
      { validUntil: { $exists: false } },
      { validUntil: null },
      { validUntil: { $gte: now } },
    ],
  };
  
  // Filter by service type if specified
  if (serviceType) {
    query[`applicability.services.${serviceType}`] = true;
  }
  
  return this.find(query)
    .sort({ 'displaySettings.displayOrder': 1, createdAt: -1 })
    .limit(limit)
    .select('-usageRecords -uniqueUsersUsed -uniqueCompaniesUsed');
};

// Pre-save middleware to update status
PromotionalCodeSchema.pre('save', function(next) {
  const now = new Date();
  
  // Update status based on validity
  if (!this.isActive) {
    this.status = 'inactive';
  } else if (this.validFrom > now) {
    this.status = 'scheduled';
  } else if (this.validUntil && this.validUntil < now) {
    this.status = 'expired';
  } else if (this.usageLimits.total > 0 && this.usageCount >= this.usageLimits.total) {
    this.status = 'depleted';
  } else {
    this.status = 'active';
  }
  
  next();
});

const PromotionalCode = mongoose.model('PromotionalCode', PromotionalCodeSchema);

module.exports = PromotionalCode;
