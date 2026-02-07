/**
 * PricingRule Model
 * Defines dynamic pricing rules for job postings and other platform services
 * Supports surge pricing, volume discounts, category-based pricing, and time-based rules
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Condition schema for pricing rules
const ConditionSchema = new Schema({
  type: {
    type: String,
    required: [true, 'Condition type is required'],
    enum: [
      'urgency',           // Job needs to be filled urgently
      'time_of_week',      // Weekend/holiday postings
      'time_of_day',       // Specific hours
      'category',          // Job category
      'volume',            // Number of jobs posted
      'featured',          // Featured listing
      'company_size',      // Size of the company
      'subscription_tier', // User's subscription tier
      'location',          // Specific location
      'salary_range',      // Job salary range
      'custom'             // Custom condition
    ],
  },
  operator: {
    type: String,
    required: [true, 'Operator is required'],
    enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'between', 'in', 'not_in', 'contains'],
    default: 'equals',
  },
  value: {
    type: Schema.Types.Mixed,
    required: [true, 'Condition value is required'],
  },
  value2: {
    type: Schema.Types.Mixed,
    // Used for 'between' operator (range end)
  },
}, { _id: true });

// Time window schema for time-based rules
const TimeWindowSchema = new Schema({
  daysOfWeek: [{
    type: Number,
    min: 0,
    max: 6, // 0 = Sunday, 6 = Saturday
  }],
  startTime: {
    type: String,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, // HH:MM format
  },
  endTime: {
    type: String,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, // HH:MM format
  },
  timezone: {
    type: String,
    default: 'Asia/Yangon', // Myanmar timezone
  },
  holidays: [{
    type: Date,
  }],
}, { _id: false });

// Main PricingRule Schema
const PricingRuleSchema = new Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Rule name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  code: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true,
    // Internal code for referencing the rule
  },

  // Rule Type
  ruleType: {
    type: String,
    required: [true, 'Rule type is required'],
    enum: [
      'surge_pricing',     // Dynamic pricing based on demand/time
      'volume_discount',   // Discounts for bulk postings
      'category_pricing',  // Different pricing per category
      'time_based',        // Pricing based on time of posting
      'loyalty_discount',  // Discounts for loyal customers
      'featured_pricing',  // Pricing for featured listings
      'custom'             // Custom rule type
    ],
  },

  // Conditions that must be met for this rule to apply
  conditions: [ConditionSchema],

  // Time window when this rule is active (optional)
  timeWindow: {
    type: TimeWindowSchema,
    default: null,
  },

  // Pricing Adjustment
  adjustmentType: {
    type: String,
    required: [true, 'Adjustment type is required'],
    enum: [
      'multiplier',        // Multiply base price (e.g., 2.0 for 2x)
      'fixed_amount',      // Add/subtract fixed amount
      'percentage',        // Add/subtract percentage
      'fixed_price',       // Override to fixed price
      'tiered'             // Tiered pricing structure
    ],
  },
  adjustmentValue: {
    type: Number,
    required: [true, 'Adjustment value is required'],
  },

  // For tiered pricing
  tiers: [{
    minQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    maxQuantity: {
      type: Number,
      min: 0,
    },
    adjustmentValue: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
  }],

  // Applicability
  appliesTo: {
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
    other: [{
      type: String,
    }],
  },

  // Priority and Stacking
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
    // Higher priority rules are applied first
  },
  stackable: {
    type: Boolean,
    default: false,
    // Whether this rule can be combined with other rules
  },
  exclusiveWith: [{
    type: Schema.Types.ObjectId,
    ref: 'PricingRule',
    // Rules that cannot be applied together with this rule
  }],

  // Limits
  usageLimits: {
    total: {
      type: Number,
      min: 0,
      // Maximum total times this rule can be applied (0 = unlimited)
    },
    perUser: {
      type: Number,
      min: 0,
      // Maximum times per user (0 = unlimited)
    },
    perCompany: {
      type: Number,
      min: 0,
      // Maximum times per company (0 = unlimited)
    },
  },
  currentUsage: {
    type: Number,
    default: 0,
    min: 0,
  },

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
PricingRuleSchema.index({ ruleType: 1, isActive: 1 });
PricingRuleSchema.index({ priority: -1 }); // Higher priority first
PricingRuleSchema.index({ validFrom: 1, validUntil: 1 });
PricingRuleSchema.index({ code: 1 });
PricingRuleSchema.index({ 'appliesTo.jobPostings': 1, isActive: 1 });

// Virtual for checking if rule is currently valid
PricingRuleSchema.virtual('isCurrentlyValid').get(function() {
  if (!this.isActive) return false;
  
  const now = new Date();
  if (now < this.validFrom) return false;
  if (this.validUntil && now > this.validUntil) return false;
  
  // Check usage limits
  if (this.usageLimits.total && this.currentUsage >= this.usageLimits.total) {
    return false;
  }
  
  return true;
});

// Method to check if rule applies to given context
PricingRuleSchema.methods.appliesToContext = function(context) {
  // Check if rule is currently valid
  if (!this.isCurrentlyValid) return false;
  
  // Check applicability
  if (context.type === 'job_posting' && !this.appliesTo.jobPostings) return false;
  if (context.type === 'subscription' && !this.appliesTo.subscriptions) return false;
  if (context.type === 'featured_listing' && !this.appliesTo.featuredListings) return false;
  
  // Check conditions
  for (const condition of this.conditions) {
    if (!this.evaluateCondition(condition, context)) {
      return false;
    }
  }
  
  // Check time window if specified
  if (this.timeWindow) {
    if (!this.isWithinTimeWindow(this.timeWindow)) {
      return false;
    }
  }
  
  return true;
};

// Helper method to evaluate a single condition
PricingRuleSchema.methods.evaluateCondition = function(condition, context) {
  const { type, operator, value, value2 } = condition;
  
  // Get the actual value from context based on condition type
  let contextValue;
  switch (type) {
    case 'urgency':
      contextValue = context.urgency || context.isUrgent;
      break;
    case 'time_of_week':
      contextValue = context.isWeekend || context.isHoliday;
      break;
    case 'category':
      contextValue = context.category;
      break;
    case 'volume':
      contextValue = context.jobCount || context.volume;
      break;
    case 'featured':
      contextValue = context.isFeatured;
      break;
    case 'company_size':
      contextValue = context.companySize;
      break;
    case 'subscription_tier':
      contextValue = context.subscriptionTier;
      break;
    case 'location':
      contextValue = context.location;
      break;
    case 'salary_range':
      contextValue = context.salaryRange;
      break;
    default:
      contextValue = context[type];
  }
  
  // Evaluate based on operator
  switch (operator) {
    case 'equals':
      return contextValue === value;
    case 'not_equals':
      return contextValue !== value;
    case 'greater_than':
      return contextValue > value;
    case 'less_than':
      return contextValue < value;
    case 'between':
      return contextValue >= value && contextValue <= value2;
    case 'in':
      return Array.isArray(value) && value.includes(contextValue);
    case 'not_in':
      return Array.isArray(value) && !value.includes(contextValue);
    case 'contains':
      if (Array.isArray(contextValue)) {
        return contextValue.includes(value);
      }
      if (typeof contextValue === 'string') {
        return contextValue.includes(value);
      }
      return false;
    default:
      return false;
  }
};

// Helper method to check if current time is within the time window
PricingRuleSchema.methods.isWithinTimeWindow = function(timeWindow) {
  const now = new Date();
  const timezone = timeWindow.timezone || 'Asia/Yangon';
  
  // Convert to Myanmar timezone
  const options = { timeZone: timezone, weekday: 'numeric', hour: '2-digit', minute: '2-digit' };
  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(now);
  
  const currentDay = parseInt(parts.find(p => p.type === 'weekday').value, 10) % 7;
  const currentTime = parts.find(p => p.type === 'hour').value + ':' + parts.find(p => p.type === 'minute').value;
  
  // Check day of week
  if (timeWindow.daysOfWeek && timeWindow.daysOfWeek.length > 0) {
    if (!timeWindow.daysOfWeek.includes(currentDay)) {
      return false;
    }
  }
  
  // Check time range
  if (timeWindow.startTime && timeWindow.endTime) {
    if (currentTime < timeWindow.startTime || currentTime > timeWindow.endTime) {
      return false;
    }
  }
  
  // Check holidays
  if (timeWindow.holidays && timeWindow.holidays.length > 0) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const isHoliday = timeWindow.holidays.some(holiday => {
      const h = new Date(holiday);
      return h.getFullYear() === today.getFullYear() &&
             h.getMonth() === today.getMonth() &&
             h.getDate() === today.getDate();
    });
    if (isHoliday) return true; // Holidays are included in the time window
  }
  
  return true;
};

// Method to calculate price adjustment
PricingRuleSchema.methods.calculateAdjustment = function(basePrice, context = {}) {
  const { adjustmentType, adjustmentValue, tiers } = this;
  
  switch (adjustmentType) {
    case 'multiplier':
      return {
        type: 'multiplier',
        value: adjustmentValue,
        amount: basePrice * (adjustmentValue - 1),
        finalPrice: basePrice * adjustmentValue,
      };
      
    case 'fixed_amount':
      return {
        type: 'fixed_amount',
        value: adjustmentValue,
        amount: adjustmentValue,
        finalPrice: basePrice + adjustmentValue,
      };
      
    case 'percentage':
      const percentageAmount = basePrice * (adjustmentValue / 100);
      return {
        type: 'percentage',
        value: adjustmentValue,
        amount: percentageAmount,
        finalPrice: basePrice + percentageAmount,
      };
      
    case 'fixed_price':
      return {
        type: 'fixed_price',
        value: adjustmentValue,
        amount: adjustmentValue - basePrice,
        finalPrice: adjustmentValue,
      };
      
    case 'tiered':
      if (tiers && tiers.length > 0) {
        const quantity = context.quantity || context.jobCount || 1;
        const applicableTier = tiers.find(tier => 
          quantity >= tier.minQuantity && 
          (!tier.maxQuantity || quantity <= tier.maxQuantity)
        );
        
        if (applicableTier) {
          return {
            type: 'tiered',
            tier: applicableTier,
            value: applicableTier.adjustmentValue,
            amount: basePrice * (applicableTier.adjustmentValue - 1),
            finalPrice: basePrice * applicableTier.adjustmentValue,
          };
        }
      }
      return {
        type: 'tiered',
        value: 1,
        amount: 0,
        finalPrice: basePrice,
      };
      
    default:
      return {
        type: 'none',
        value: 1,
        amount: 0,
        finalPrice: basePrice,
      };
  }
};

// Static method to find applicable rules for a context
PricingRuleSchema.statics.findApplicableRules = async function(context) {
  const rules = await this.find({ isActive: true })
    .sort({ priority: -1 })
    .lean();
  
  return rules.filter(rule => {
    const ruleInstance = new this(rule);
    return ruleInstance.appliesToContext(context);
  });
};

// Pre-save middleware to validate tiers for tiered pricing
PricingRuleSchema.pre('save', function(next) {
  if (this.adjustmentType === 'tiered') {
    if (!this.tiers || this.tiers.length === 0) {
      return next(new Error('Tiered pricing requires at least one tier'));
    }
    
    // Sort tiers by minQuantity
    this.tiers.sort((a, b) => a.minQuantity - b.minQuantity);
    
    // Validate tier ranges don't overlap
    for (let i = 0; i < this.tiers.length - 1; i++) {
      if (this.tiers[i].maxQuantity && this.tiers[i].maxQuantity >= this.tiers[i + 1].minQuantity) {
        return next(new Error(`Tier ranges overlap between tier ${i} and tier ${i + 1}`));
      }
    }
  }
  
  next();
});

const PricingRule = mongoose.model('PricingRule', PricingRuleSchema);

module.exports = PricingRule;
