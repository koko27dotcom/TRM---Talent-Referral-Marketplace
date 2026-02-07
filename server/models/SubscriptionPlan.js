/**
 * SubscriptionPlan Model
 * Defines the available subscription tiers for corporate clients
 * Includes pricing, features, and limits for each plan
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Features schema
const FeaturesSchema = new Schema({
  jobPostingLimit: {
    type: Number,
    required: [true, 'Job posting limit is required'],
    default: 5,
    min: -1, // -1 means unlimited
  },
  userLimit: {
    type: Number,
    default: 3,
    min: -1,
  },
  storageLimit: {
    type: Number,
    default: 100, // In MB
    min: 0,
  },
  apiAccess: {
    type: Boolean,
    default: false,
  },
  prioritySupport: {
    type: Boolean,
    default: false,
  },
  customBranding: {
    type: Boolean,
    default: false,
  },
  whiteLabel: {
    type: Boolean,
    default: false,
  },
  advancedAnalytics: {
    type: Boolean,
    default: false,
  },
  dedicatedManager: {
    type: Boolean,
    default: false,
  },
  bulkImport: {
    type: Boolean,
    default: false,
  },
  customIntegrations: {
    type: Boolean,
    default: false,
  },
}, { _id: false });

// Main SubscriptionPlan Schema
const SubscriptionPlanSchema = new Schema({
  // Plan details
  name: {
    type: String,
    required: [true, 'Plan name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  slug: {
    type: String,
    required: [true, 'Plan slug is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: [200, 'Short description cannot exceed 200 characters'],
  },
  
  // Pricing
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
  },
  currency: {
    type: String,
    default: 'MMK',
    trim: true,
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly', 'quarterly'],
    default: 'monthly',
  },
  yearlyDiscount: {
    type: Number,
    default: 0, // Percentage discount for yearly billing
    min: 0,
    max: 100,
  },
  
  // Features and limits
  features: {
    type: FeaturesSchema,
    default: () => ({}),
  },
  
  // Included features list (for display)
  includedFeatures: [{
    type: String,
    trim: true,
  }],
  
  // Not included features (for comparison)
  notIncludedFeatures: [{
    type: String,
    trim: true,
  }],
  
  // Display settings
  isPopular: {
    type: Boolean,
    default: false,
  },
  displayOrder: {
    type: Number,
    default: 0,
  },
  highlightColor: {
    type: String,
    trim: true,
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color'],
  },
  
  // Plan icon/image
  icon: {
    type: String,
    trim: true,
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  
  // Trial settings
  trialDays: {
    type: Number,
    default: 0,
    min: 0,
  },
  
  // Plan type
  planType: {
    type: String,
    enum: ['starter', 'growth', 'enterprise', 'custom'],
    default: 'starter',
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

SubscriptionPlanSchema.index({ slug: 1 }, { unique: true });
SubscriptionPlanSchema.index({ isActive: 1, displayOrder: 1 });
SubscriptionPlanSchema.index({ planType: 1 });

// ==================== VIRTUALS ====================

// Virtual for yearly price
SubscriptionPlanSchema.virtual('yearlyPrice').get(function() {
  if (this.billingCycle === 'yearly') {
    return this.price;
  }
  const yearlyBase = this.price * 12;
  const discount = yearlyBase * (this.yearlyDiscount / 100);
  return Math.round(yearlyBase - discount);
});

// Virtual for monthly equivalent of yearly price
SubscriptionPlanSchema.virtual('monthlyEquivalent').get(function() {
  if (this.billingCycle === 'yearly') {
    return Math.round(this.yearlyPrice / 12);
  }
  return this.price;
});

// Virtual for savings with yearly billing
SubscriptionPlanSchema.virtual('yearlySavings').get(function() {
  if (this.billingCycle === 'yearly') {
    return 0;
  }
  const monthlyTotal = this.price * 12;
  return monthlyTotal - this.yearlyPrice;
});

// Virtual for formatted price
SubscriptionPlanSchema.virtual('formattedPrice').get(function() {
  return `${this.price.toLocaleString()} ${this.currency}`;
});

// Virtual for has unlimited jobs
SubscriptionPlanSchema.virtual('hasUnlimitedJobs').get(function() {
  return this.features.jobPostingLimit === -1;
});

// Virtual for has unlimited users
SubscriptionPlanSchema.virtual('hasUnlimitedUsers').get(function() {
  return this.features.userLimit === -1;
});

// ==================== MIDDLEWARE ====================

// Pre-save middleware to ensure only one plan is marked as popular
SubscriptionPlanSchema.pre('save', async function(next) {
  if (this.isModified('isPopular') && this.isPopular) {
    // Unmark other plans as popular
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { $set: { isPopular: false } }
    );
  }
  next();
});

// ==================== INSTANCE METHODS ====================

/**
 * Check if plan allows specific feature
 * @param {string} feature - Feature name
 * @returns {boolean}
 */
SubscriptionPlanSchema.methods.hasFeature = function(feature) {
  return !!this.features[feature];
};

/**
 * Check if job posting limit is reached
 * @param {number} currentCount - Current job count
 * @returns {boolean}
 */
SubscriptionPlanSchema.methods.isJobLimitReached = function(currentCount) {
  if (this.features.jobPostingLimit === -1) return false;
  return currentCount >= this.features.jobPostingLimit;
};

/**
 * Get remaining job slots
 * @param {number} currentCount - Current job count
 * @returns {number}
 */
SubscriptionPlanSchema.methods.getRemainingJobSlots = function(currentCount) {
  if (this.features.jobPostingLimit === -1) return Infinity;
  return Math.max(0, this.features.jobPostingLimit - currentCount);
};

/**
 * Calculate price for billing period
 * @param {string} period - 'monthly' or 'yearly'
 * @returns {number}
 */
SubscriptionPlanSchema.methods.getPriceForPeriod = function(period) {
  if (period === 'yearly') {
    return this.yearlyPrice;
  }
  return this.price;
};

// ==================== STATIC METHODS ====================

/**
 * Find plan by slug
 * @param {string} slug - Plan slug
 * @returns {Promise<Document|null>}
 */
SubscriptionPlanSchema.statics.findBySlug = function(slug) {
  return this.findOne({ slug: slug.toLowerCase(), isActive: true });
};

/**
 * Get all active plans ordered by display order
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
SubscriptionPlanSchema.statics.getActivePlans = function(options = {}) {
  return this.find({ isActive: true })
    .sort(options.sort || { displayOrder: 1 });
};

/**
 * Get plan comparison data
 * @returns {Promise<Array>}
 */
SubscriptionPlanSchema.statics.getComparisonData = async function() {
  const plans = await this.find({ isActive: true })
    .sort({ displayOrder: 1 })
    .select('-metadata');
  
  return plans.map(plan => ({
    id: plan._id,
    name: plan.name,
    slug: plan.slug,
    price: plan.price,
    yearlyPrice: plan.yearlyPrice,
    monthlyEquivalent: plan.monthlyEquivalent,
    features: plan.features,
    includedFeatures: plan.includedFeatures,
    isPopular: plan.isPopular,
    highlightColor: plan.highlightColor,
  }));
};

/**
 * Get recommended plan based on requirements
 * @param {Object} requirements - Company requirements
 * @returns {Promise<Document|null>}
 */
SubscriptionPlanSchema.statics.getRecommendedPlan = async function(requirements = {}) {
  const { jobCount = 5, teamSize = 3, needsApi = false, needsWhiteLabel = false } = requirements;
  
  const plans = await this.find({ isActive: true }).sort({ price: 1 });
  
  for (const plan of plans) {
    const jobLimitOk = plan.features.jobPostingLimit === -1 || plan.features.jobPostingLimit >= jobCount;
    const userLimitOk = plan.features.userLimit === -1 || plan.features.userLimit >= teamSize;
    const apiOk = !needsApi || plan.features.apiAccess;
    const whiteLabelOk = !needsWhiteLabel || plan.features.whiteLabel;
    
    if (jobLimitOk && userLimitOk && apiOk && whiteLabelOk) {
      return plan;
    }
  }
  
  return null;
};

/**
 * Seed default plans
 * @returns {Promise<void>}
 */
SubscriptionPlanSchema.statics.seedDefaultPlans = async function() {
  const defaultPlans = [
    {
      name: 'Starter',
      slug: 'starter',
      description: 'Perfect for small businesses just getting started with referrals.',
      shortDescription: 'Up to 5 active jobs',
      price: 99000,
      planType: 'starter',
      features: {
        jobPostingLimit: 5,
        userLimit: 3,
        storageLimit: 100,
        apiAccess: false,
        prioritySupport: false,
        customBranding: false,
        whiteLabel: false,
        advancedAnalytics: false,
        dedicatedManager: false,
        bulkImport: false,
        customIntegrations: false,
      },
      includedFeatures: [
        '5 active job postings',
        '3 team members',
        'Basic analytics',
        'Email support',
        'Resume storage (100MB)',
      ],
      displayOrder: 1,
    },
    {
      name: 'Growth',
      slug: 'growth',
      description: 'Ideal for growing companies with active hiring needs.',
      shortDescription: 'Up to 20 active jobs',
      price: 299000,
      planType: 'growth',
      isPopular: true,
      yearlyDiscount: 15,
      features: {
        jobPostingLimit: 20,
        userLimit: 10,
        storageLimit: 500,
        apiAccess: false,
        prioritySupport: true,
        customBranding: true,
        whiteLabel: false,
        advancedAnalytics: true,
        dedicatedManager: false,
        bulkImport: true,
        customIntegrations: false,
      },
      includedFeatures: [
        '20 active job postings',
        '10 team members',
        'Advanced analytics',
        'Priority support',
        'Featured job listings',
        'Custom branding',
        'Resume storage (500MB)',
        'Bulk candidate import',
      ],
      highlightColor: '#3B82F6',
      displayOrder: 2,
    },
    {
      name: 'Enterprise',
      slug: 'enterprise',
      description: 'Full-featured solution for large organizations.',
      shortDescription: 'Unlimited jobs & users',
      price: 999000,
      planType: 'enterprise',
      yearlyDiscount: 20,
      features: {
        jobPostingLimit: -1,
        userLimit: -1,
        storageLimit: 5000,
        apiAccess: true,
        prioritySupport: true,
        customBranding: true,
        whiteLabel: true,
        advancedAnalytics: true,
        dedicatedManager: true,
        bulkImport: true,
        customIntegrations: true,
      },
      includedFeatures: [
        'Unlimited job postings',
        'Unlimited team members',
        'API access',
        'White-label options',
        'Dedicated account manager',
        'Custom integrations',
        'Advanced security',
        'SLA guarantee',
        'Resume storage (5GB)',
      ],
      highlightColor: '#8B5CF6',
      displayOrder: 3,
    },
  ];
  
  for (const planData of defaultPlans) {
    await this.findOneAndUpdate(
      { slug: planData.slug },
      planData,
      { upsert: true, new: true }
    );
  }
  
  console.log('Default subscription plans seeded successfully');
};

// Create and export the model
const SubscriptionPlan = mongoose.model('SubscriptionPlan', SubscriptionPlanSchema);

module.exports = SubscriptionPlan;
