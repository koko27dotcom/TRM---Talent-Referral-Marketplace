/**
 * PartnerProgram Model
 * Defines partner program tiers and their requirements/benefits
 * Manages tier progression and associated benefits
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Benefit schema (embedded)
const BenefitSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  type: {
    type: String,
    enum: ['commission', 'support', 'feature', 'marketing', 'development', 'api'],
    required: true,
  },
  value: {
    type: Schema.Types.Mixed,
  },
  icon: {
    type: String,
    trim: true,
  },
}, { _id: true });

// Requirement schema (embedded)
const RequirementSchema = new Schema({
  type: {
    type: String,
    enum: ['referrals', 'revenue', 'time', 'performance', 'verification'],
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  value: {
    type: Schema.Types.Mixed,
    required: true,
  },
  unit: {
    type: String,
    trim: true,
  },
  isMandatory: {
    type: Boolean,
    default: true,
  },
}, { _id: true });

// API access schema (embedded)
const APIAccessSchema = new Schema({
  level: {
    type: String,
    enum: ['basic', 'advanced', 'full', 'unlimited'],
    required: true,
  },
  rateLimitPerMinute: {
    type: Number,
    default: 60,
  },
  rateLimitPerHour: {
    type: Number,
    default: 1000,
  },
  rateLimitPerDay: {
    type: Number,
    default: 10000,
  },
  availableEndpoints: [{
    type: String,
  }],
  webhooks: {
    enabled: {
      type: Boolean,
      default: false,
    },
    maxEndpoints: {
      type: Number,
      default: 1,
    },
  },
}, { _id: false });

// Support level schema (embedded)
const SupportLevelSchema = new Schema({
  type: {
    type: String,
    enum: ['standard', 'priority', 'dedicated', 'account_manager'],
    required: true,
  },
  responseTimeHours: {
    type: Number,
    default: 48,
  },
  channels: [{
    type: String,
    enum: ['email', 'chat', 'phone', 'slack', 'dedicated'],
  }],
  hours: {
    type: String,
    default: 'business',
  },
  dedicatedManager: {
    type: Boolean,
    default: false,
  },
}, { _id: false });

// Main PartnerProgram schema
const PartnerProgramSchema = new Schema({
  programId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Program name is required'],
    trim: true,
    maxlength: [100, 'Program name cannot exceed 100 characters'],
  },
  tier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    required: true,
    unique: true,
  },
  displayOrder: {
    type: Number,
    required: true,
    default: 0,
  },
  description: {
    type: String,
    trim: true,
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: 200,
  },
  // Requirements to achieve this tier
  requirements: {
    minReferrals: {
      type: Number,
      default: 0,
    },
    minRevenue: {
      type: Number,
      default: 0,
    },
    minTimeAsPartner: {
      type: Number,
      default: 0, // In days
    },
    minPerformanceScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    requiresVerification: {
      type: Boolean,
      default: false,
    },
    customRequirements: [RequirementSchema],
  },
  // Commission structure
  commissionRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  commissionStructure: {
    type: {
      type: String,
      enum: ['flat', 'tiered', 'performance_based'],
      default: 'flat',
    },
    tiers: [{
      minAmount: Number,
      maxAmount: Number,
      rate: Number,
    }],
    bonuses: [{
      threshold: Number,
      bonusAmount: Number,
      description: String,
    }],
  },
  // Benefits
  benefits: [BenefitSchema],
  // API access level
  apiAccess: {
    type: APIAccessSchema,
    default: () => ({}),
  },
  // Support level
  supportLevel: {
    type: SupportLevelSchema,
    default: () => ({}),
  },
  // Features enabled for this tier
  enabledFeatures: {
    whiteLabel: {
      type: Boolean,
      default: false,
    },
    customIntegrations: {
      type: Boolean,
      default: false,
    },
    advancedAnalytics: {
      type: Boolean,
      default: false,
    },
    coMarketing: {
      type: Boolean,
      default: false,
    },
    prioritySupport: {
      type: Boolean,
      default: false,
    },
    customDevelopment: {
      type: Boolean,
      default: false,
    },
    revenueShareOnMarketplace: {
      type: Boolean,
      default: false,
    },
    strategicPartnership: {
      type: Boolean,
      default: false,
    },
  },
  // Revenue share for marketplace plugins
  marketplaceRevenueShare: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  // Marketing materials
  marketingMaterials: [{
    name: String,
    type: {
      type: String,
      enum: ['banner', 'email_template', 'landing_page', 'social_media', 'video', 'document'],
    },
    url: String,
    downloadUrl: String,
    dimensions: String,
    format: String,
  }],
  // Branding
  tierBadge: {
    type: String,
  },
  tierColor: {
    type: String,
    default: '#CD7F32', // Bronze default
  },
  // Status
  isActive: {
    type: Boolean,
    default: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  // Upgrade/downgrade rules
  autoUpgrade: {
    type: Boolean,
    default: true,
  },
  autoDowngrade: {
    type: Boolean,
    default: false,
  },
  gracePeriodDays: {
    type: Number,
    default: 30,
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: { createdAt: true, updatedAt: true },
});

// Indexes
PartnerProgramSchema.index({ tier: 1, isActive: 1 });
PartnerProgramSchema.index({ displayOrder: 1 });

// Static method to get tier by name
PartnerProgramSchema.statics.getByTier = function(tierName) {
  return this.findOne({ tier: tierName, isActive: true });
};

// Static method to get all active tiers ordered
PartnerProgramSchema.statics.getAllTiers = function() {
  return this.find({ isActive: true }).sort({ displayOrder: 1 });
};

// Method to check if partner meets requirements
PartnerProgramSchema.methods.checkRequirements = function(partner) {
  const results = {
    met: true,
    requirements: [],
  };

  // Check minimum referrals
  if (partner.referralCount < this.requirements.minReferrals) {
    results.met = false;
    results.requirements.push({
      type: 'referrals',
      name: 'Minimum Referrals',
      required: this.requirements.minReferrals,
      current: partner.referralCount,
      met: false,
    });
  }

  // Check minimum revenue
  if (partner.totalRevenue < this.requirements.minRevenue) {
    results.met = false;
    results.requirements.push({
      type: 'revenue',
      name: 'Minimum Revenue',
      required: this.requirements.minRevenue,
      current: partner.totalRevenue,
      met: false,
    });
  }

  // Check time as partner
  if (this.requirements.minTimeAsPartner > 0 && partner.activatedAt) {
    const daysAsPartner = Math.floor(
      (Date.now() - partner.activatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysAsPartner < this.requirements.minTimeAsPartner) {
      results.met = false;
      results.requirements.push({
        type: 'time',
        name: 'Time as Partner',
        required: this.requirements.minTimeAsPartner,
        current: daysAsPartner,
        met: false,
      });
    }
  }

  // Check custom requirements
  this.requirements.customRequirements.forEach(req => {
    if (req.isMandatory) {
      // Custom requirement checking logic would go here
      // For now, we'll assume they're met
    }
  });

  return results;
};

// Method to calculate commission for an amount
PartnerProgramSchema.methods.calculateCommission = function(amount, partnerMetrics = {}) {
  if (this.commissionStructure.type === 'flat') {
    return amount * (this.commissionRate / 100);
  }

  if (this.commissionStructure.type === 'tiered') {
    let commission = 0;
    for (const tier of this.commissionStructure.tiers) {
      if (amount >= tier.minAmount) {
        const tierAmount = tier.maxAmount 
          ? Math.min(amount, tier.maxAmount) - tier.minAmount
          : amount - tier.minAmount;
        commission += tierAmount * (tier.rate / 100);
      }
    }
    return commission;
  }

  // Performance-based calculation
  if (this.commissionStructure.type === 'performance_based') {
    // Adjust rate based on performance metrics
    let adjustedRate = this.commissionRate;
    if (partnerMetrics.conversionRate > 0.2) {
      adjustedRate += 2; // Bonus for high conversion
    }
    return amount * (adjustedRate / 100);
  }

  return amount * (this.commissionRate / 100);
};

const PartnerProgram = mongoose.model('PartnerProgram', PartnerProgramSchema);

module.exports = PartnerProgram;
