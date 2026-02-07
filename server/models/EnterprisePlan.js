/**
 * EnterprisePlan Model
 * Defines enterprise-tier subscription plans with advanced B2B features
 * Supports tiered pricing (Starter, Growth, Enterprise) with feature differentiation
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Enterprise Features Schema
const EnterpriseFeaturesSchema = new Schema({
  // API & Integration
  apiAccess: {
    type: Boolean,
    default: false,
  },
  apiRateLimit: {
    type: Number,
    default: 1000, // requests per hour
    min: 0,
  },
  webhookSupport: {
    type: Boolean,
    default: false,
  },
  ssoEnabled: {
    type: Boolean,
    default: false,
  },
  samlSupport: {
    type: Boolean,
    default: false,
  },
  customIntegrations: {
    type: Boolean,
    default: false,
  },

  // Job Posting & Management
  bulkJobPosting: {
    type: Boolean,
    default: false,
  },
  bulkImportLimit: {
    type: Number,
    default: 0, // 0 means not available
    min: 0,
  },
  autoJobDistribution: {
    type: Boolean,
    default: false,
  },
  advancedJobTemplates: {
    type: Boolean,
    default: false,
  },

  // Branding & Customization
  customBranding: {
    type: Boolean,
    default: false,
  },
  whiteLabel: {
    type: Boolean,
    default: false,
  },
  customDomain: {
    type: Boolean,
    default: false,
  },
  customCareerPage: {
    type: Boolean,
    default: false,
  },

  // Analytics & Reporting
  advancedAnalytics: {
    type: Boolean,
    default: false,
  },
  customReports: {
    type: Boolean,
    default: false,
  },
  dataExport: {
    type: Boolean,
    default: false,
  },
  competitorInsights: {
    type: Boolean,
    default: false,
  },

  // Support & Service
  prioritySupport: {
    type: Boolean,
    default: false,
  },
  dedicatedManager: {
    type: Boolean,
    default: false,
  },
  slaGuarantee: {
    type: Boolean,
    default: false,
  },
  trainingSessions: {
    type: Number,
    default: 0,
    min: 0,
  },

  // Team & Collaboration
  teamManagement: {
    type: Boolean,
    default: false,
  },
  roleBasedAccess: {
    type: Boolean,
    default: false,
  },
  approvalWorkflows: {
    type: Boolean,
    default: false,
  },

  // Security & Compliance
  auditLogs: {
    type: Boolean,
    default: false,
  },
  dataRetentionDays: {
    type: Number,
    default: 90,
    min: 30,
  },
  gdprCompliance: {
    type: Boolean,
    default: false,
  },
  soc2Compliance: {
    type: Boolean,
    default: false,
  },
}, { _id: false });

// Pricing Schema
const PricingSchema = new Schema({
  monthly: {
    type: Number,
    required: [true, 'Monthly price is required'],
    min: [0, 'Price cannot be negative'],
  },
  yearly: {
    type: Number,
    required: [true, 'Yearly price is required'],
    min: [0, 'Price cannot be negative'],
  },
  currency: {
    type: String,
    default: 'MMK',
    trim: true,
  },
  discountPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
}, { _id: false });

// User Limits Schema
const UserLimitsSchema = new Schema({
  maxUsers: {
    type: Number,
    required: true,
    min: -1, // -1 means unlimited
  },
  maxAdmins: {
    type: Number,
    default: 1,
    min: 1,
  },
  maxRecruiters: {
    type: Number,
    default: 3,
    min: 0,
  },
  maxHiringManagers: {
    type: Number,
    default: 5,
    min: 0,
  },
}, { _id: false });

// Job Limits Schema
const JobLimitsSchema = new Schema({
  maxActiveJobs: {
    type: Number,
    required: true,
    min: -1,
  },
  maxTotalJobs: {
    type: Number,
    default: -1,
    min: -1,
  },
  featuredJobsPerMonth: {
    type: Number,
    default: 0,
    min: 0,
  },
}, { _id: false });

// Support Level Schema
const SupportLevelSchema = new Schema({
  level: {
    type: String,
    enum: ['standard', 'priority', 'dedicated'],
    default: 'standard',
  },
  responseTimeHours: {
    type: Number,
    default: 48,
    min: 1,
  },
  supportChannels: [{
    type: String,
    enum: ['email', 'chat', 'phone', 'video', 'dedicated_line'],
  }],
  availability: {
    type: String,
    enum: ['business_hours', 'extended', '24_7'],
    default: 'business_hours',
  },
  dedicatedManager: {
    type: Boolean,
    default: false,
  },
}, { _id: false });

// Main EnterprisePlan Schema
const EnterprisePlanSchema = new Schema({
  // Plan Identification
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
    enum: ['starter', 'growth', 'enterprise'],
  },
  tier: {
    type: String,
    enum: ['Starter', 'Growth', 'Enterprise'],
    required: true,
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
  pricing: {
    type: PricingSchema,
    required: true,
  },

  // Limits
  userLimits: {
    type: UserLimitsSchema,
    required: true,
  },
  jobLimits: {
    type: JobLimitsSchema,
    required: true,
  },
  storageLimitGB: {
    type: Number,
    default: 10,
    min: 0,
  },

  // Features
  features: {
    type: EnterpriseFeaturesSchema,
    default: () => ({}),
  },

  // Support
  support: {
    type: SupportLevelSchema,
    default: () => ({}),
  },

  // Plan Status
  isActive: {
    type: Boolean,
    default: true,
  },
  isPublic: {
    type: Boolean,
    default: true,
  },
  displayOrder: {
    type: Number,
    default: 0,
  },
  popular: {
    type: Boolean,
    default: false,
  },

  // Plan Metadata
  trialDays: {
    type: Number,
    default: 14,
    min: 0,
  },
  setupFee: {
    type: Number,
    default: 0,
    min: 0,
  },
  minimumCommitmentMonths: {
    type: Number,
    default: 1,
    min: 1,
  },

  // Custom configuration for Enterprise tier
  customConfiguration: {
    available: {
      type: Boolean,
      default: false,
    },
    contactSales: {
      type: Boolean,
      default: false,
    },
    customPricing: {
      type: Boolean,
      default: false,
    },
  },

  // Plan highlights for marketing
  highlights: [{
    type: String,
    trim: true,
  }],

  // Comparison features for plan comparison table
  comparisonFeatures: [{
    feature: {
      type: String,
      required: true,
    },
    included: {
      type: Boolean,
      default: false,
    },
    limit: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
  }],

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
EnterprisePlanSchema.index({ slug: 1 });
EnterprisePlanSchema.index({ tier: 1 });
EnterprisePlanSchema.index({ isActive: 1, isPublic: 1 });
EnterprisePlanSchema.index({ displayOrder: 1 });

// Virtual for formatted price
EnterprisePlanSchema.virtual('formattedMonthlyPrice').get(function() {
  return `${this.pricing.currency} ${this.pricing.monthly.toLocaleString()}`;
});

EnterprisePlanSchema.virtual('formattedYearlyPrice').get(function() {
  return `${this.pricing.currency} ${this.pricing.yearly.toLocaleString()}`;
});

// Virtual for yearly savings
EnterprisePlanSchema.virtual('yearlySavings').get(function() {
  const monthlyCost = this.pricing.monthly * 12;
  const yearlyCost = this.pricing.yearly;
  const savings = monthlyCost - yearlyCost;
  const percentage = monthlyCost > 0 ? Math.round((savings / monthlyCost) * 100) : 0;
  return {
    amount: savings,
    percentage,
  };
});

// Static method to get default plans
EnterprisePlanSchema.statics.getDefaultPlans = async function() {
  return [
    {
      name: 'Starter',
      slug: 'starter',
      tier: 'Starter',
      description: 'Perfect for small teams getting started with recruitment automation',
      shortDescription: 'Up to 10 users, basic API access',
      pricing: {
        monthly: 299000,
        yearly: 2990000,
        currency: 'MMK',
        discountPercentage: 16,
      },
      userLimits: {
        maxUsers: 10,
        maxAdmins: 2,
        maxRecruiters: 5,
        maxHiringManagers: 10,
      },
      jobLimits: {
        maxActiveJobs: 20,
        maxTotalJobs: 100,
        featuredJobsPerMonth: 2,
      },
      storageLimitGB: 25,
      features: {
        apiAccess: true,
        apiRateLimit: 1000,
        webhookSupport: true,
        ssoEnabled: false,
        samlSupport: false,
        customIntegrations: false,
        bulkJobPosting: true,
        bulkImportLimit: 50,
        autoJobDistribution: false,
        advancedJobTemplates: false,
        customBranding: true,
        whiteLabel: false,
        customDomain: false,
        customCareerPage: false,
        advancedAnalytics: true,
        customReports: false,
        dataExport: true,
        competitorInsights: false,
        prioritySupport: false,
        dedicatedManager: false,
        slaGuarantee: false,
        trainingSessions: 1,
        teamManagement: true,
        roleBasedAccess: true,
        approvalWorkflows: false,
        auditLogs: true,
        dataRetentionDays: 90,
        gdprCompliance: true,
        soc2Compliance: false,
      },
      support: {
        level: 'standard',
        responseTimeHours: 24,
        supportChannels: ['email', 'chat'],
        availability: 'business_hours',
        dedicatedManager: false,
      },
      trialDays: 14,
      setupFee: 0,
      minimumCommitmentMonths: 1,
      customConfiguration: {
        available: false,
        contactSales: false,
        customPricing: false,
      },
      highlights: [
        'Up to 10 team members',
        '20 active job postings',
        'Basic API access (1,000 req/hour)',
        'Standard support',
        'Custom branding',
      ],
      displayOrder: 1,
      popular: false,
    },
    {
      name: 'Growth',
      slug: 'growth',
      tier: 'Growth',
      description: 'For growing companies that need advanced features and scalability',
      shortDescription: 'Up to 50 users, advanced API, priority support',
      pricing: {
        monthly: 799000,
        yearly: 7990000,
        currency: 'MMK',
        discountPercentage: 16,
      },
      userLimits: {
        maxUsers: 50,
        maxAdmins: 5,
        maxRecruiters: 20,
        maxHiringManagers: 50,
      },
      jobLimits: {
        maxActiveJobs: 100,
        maxTotalJobs: 500,
        featuredJobsPerMonth: 10,
      },
      storageLimitGB: 100,
      features: {
        apiAccess: true,
        apiRateLimit: 5000,
        webhookSupport: true,
        ssoEnabled: true,
        samlSupport: false,
        customIntegrations: false,
        bulkJobPosting: true,
        bulkImportLimit: 200,
        autoJobDistribution: true,
        advancedJobTemplates: true,
        customBranding: true,
        whiteLabel: false,
        customDomain: true,
        customCareerPage: true,
        advancedAnalytics: true,
        customReports: true,
        dataExport: true,
        competitorInsights: true,
        prioritySupport: true,
        dedicatedManager: false,
        slaGuarantee: false,
        trainingSessions: 3,
        teamManagement: true,
        roleBasedAccess: true,
        approvalWorkflows: true,
        auditLogs: true,
        dataRetentionDays: 180,
        gdprCompliance: true,
        soc2Compliance: true,
      },
      support: {
        level: 'priority',
        responseTimeHours: 8,
        supportChannels: ['email', 'chat', 'phone'],
        availability: 'extended',
        dedicatedManager: false,
      },
      trialDays: 14,
      setupFee: 0,
      minimumCommitmentMonths: 1,
      customConfiguration: {
        available: false,
        contactSales: false,
        customPricing: false,
      },
      highlights: [
        'Up to 50 team members',
        '100 active job postings',
        'Advanced API (5,000 req/hour)',
        'Priority support (8h response)',
        'Custom domain & career page',
        'SSO integration',
      ],
      displayOrder: 2,
      popular: true,
    },
    {
      name: 'Enterprise',
      slug: 'enterprise',
      tier: 'Enterprise',
      description: 'Full-featured solution for large organizations with custom needs',
      shortDescription: 'Unlimited users, full API access, dedicated support',
      pricing: {
        monthly: 0,
        yearly: 0,
        currency: 'MMK',
        discountPercentage: 0,
      },
      userLimits: {
        maxUsers: -1,
        maxAdmins: -1,
        maxRecruiters: -1,
        maxHiringManagers: -1,
      },
      jobLimits: {
        maxActiveJobs: -1,
        maxTotalJobs: -1,
        featuredJobsPerMonth: -1,
      },
      storageLimitGB: -1,
      features: {
        apiAccess: true,
        apiRateLimit: -1,
        webhookSupport: true,
        ssoEnabled: true,
        samlSupport: true,
        customIntegrations: true,
        bulkJobPosting: true,
        bulkImportLimit: -1,
        autoJobDistribution: true,
        advancedJobTemplates: true,
        customBranding: true,
        whiteLabel: true,
        customDomain: true,
        customCareerPage: true,
        advancedAnalytics: true,
        customReports: true,
        dataExport: true,
        competitorInsights: true,
        prioritySupport: true,
        dedicatedManager: true,
        slaGuarantee: true,
        trainingSessions: -1,
        teamManagement: true,
        roleBasedAccess: true,
        approvalWorkflows: true,
        auditLogs: true,
        dataRetentionDays: 365,
        gdprCompliance: true,
        soc2Compliance: true,
      },
      support: {
        level: 'dedicated',
        responseTimeHours: 2,
        supportChannels: ['email', 'chat', 'phone', 'video', 'dedicated_line'],
        availability: '24_7',
        dedicatedManager: true,
      },
      trialDays: 30,
      setupFee: 0,
      minimumCommitmentMonths: 12,
      customConfiguration: {
        available: true,
        contactSales: true,
        customPricing: true,
      },
      highlights: [
        'Unlimited team members',
        'Unlimited job postings',
        'Unlimited API access',
        'Dedicated account manager',
        '24/7 priority support',
        'White-label solution',
        'Custom integrations',
        'SLA guarantee',
      ],
      displayOrder: 3,
      popular: false,
    },
  ];
};

// Static method to seed default plans
EnterprisePlanSchema.statics.seedDefaultPlans = async function() {
  const plans = await this.getDefaultPlans();
  
  for (const planData of plans) {
    await this.findOneAndUpdate(
      { slug: planData.slug },
      planData,
      { upsert: true, new: true }
    );
  }
  
  console.log('✅ Enterprise plans seeded successfully');
};

// Instance method to check if feature is available
EnterprisePlanSchema.methods.hasFeature = function(featureName) {
  return this.features[featureName] === true;
};

// Instance method to get effective user limit
EnterprisePlanSchema.methods.getUserLimit = function(role) {
  const limits = {
    admin: this.userLimits.maxAdmins,
    recruiter: this.userLimits.maxRecruiters,
    hiring_manager: this.userLimits.maxHiringManagers,
  };
  return limits[role] || this.userLimits.maxUsers;
};

const EnterprisePlan = mongoose.model('EnterprisePlan', EnterprisePlanSchema);

module.exports = EnterprisePlan;