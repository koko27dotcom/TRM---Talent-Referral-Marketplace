/**
 * Partner Model
 * Represents partner organizations in the TRM partner ecosystem
 * Supports agencies, consultants, technology partners, and influencers
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// API Key schema (embedded)
const APIKeySchema = new Schema({
  keyId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  keyHash: {
    type: String,
    required: true,
  },
  scopes: [{
    type: String,
    enum: ['read', 'write', 'admin', 'jobs', 'referrals', 'analytics', 'billing'],
  }],
  rateLimit: {
    requestsPerMinute: {
      type: Number,
      default: 60,
    },
    requestsPerHour: {
      type: Number,
      default: 1000,
    },
    requestsPerDay: {
      type: Number,
      default: 10000,
    },
  },
  usageCount: {
    type: Number,
    default: 0,
  },
  lastUsedAt: {
    type: Date,
  },
  expiresAt: {
    type: Date,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: true });

// Contact info schema (embedded)
const ContactInfoSchema = new Schema({
  primaryContact: {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    position: {
      type: String,
      trim: true,
    },
  },
  technicalContact: {
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
  },
  billingContact: {
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
  },
}, { _id: false });

// Company details schema (embedded)
const CompanyDetailsSchema = new Schema({
  legalName: {
    type: String,
    required: true,
    trim: true,
  },
  registrationNumber: {
    type: String,
    trim: true,
  },
  taxId: {
    type: String,
    trim: true,
  },
  website: {
    type: String,
    trim: true,
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: {
      type: String,
      default: 'Myanmar',
    },
    postalCode: String,
  },
  industry: {
    type: String,
    trim: true,
  },
  companySize: {
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'],
  },
  description: {
    type: String,
    trim: true,
  },
  logo: {
    type: String,
  },
}, { _id: false });

// Bank account schema for payouts (embedded)
const BankAccountSchema = new Schema({
  accountName: {
    type: String,
    required: true,
    trim: true,
  },
  accountNumber: {
    type: String,
    required: true,
    trim: true,
  },
  bankName: {
    type: String,
    required: true,
    trim: true,
  },
  branchCode: {
    type: String,
    trim: true,
  },
  swiftCode: {
    type: String,
    trim: true,
  },
  currency: {
    type: String,
    default: 'MMK',
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
}, { _id: true });

// Main Partner schema
const PartnerSchema = new Schema({
  partnerId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Partner name is required'],
    trim: true,
    maxlength: [100, 'Partner name cannot exceed 100 characters'],
  },
  type: {
    type: String,
    enum: ['agency', 'consultant', 'technology', 'influencer', 'enterprise', 'reseller'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'under_review', 'active', 'suspended', 'terminated'],
    default: 'pending',
  },
  tier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze',
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  contactInfo: {
    type: ContactInfoSchema,
    required: true,
  },
  companyDetails: {
    type: CompanyDetailsSchema,
    required: true,
  },
  commissionRate: {
    type: Number,
    default: 10, // Percentage
    min: 0,
    max: 50,
  },
  revenueSharePercent: {
    type: Number,
    default: 10,
    min: 0,
    max: 100,
  },
  totalRevenue: {
    type: Number,
    default: 0,
  },
  totalPayout: {
    type: Number,
    default: 0,
  },
  pendingPayout: {
    type: Number,
    default: 0,
  },
  apiKeys: [APIKeySchema],
  bankAccounts: [BankAccountSchema],
  whiteLabelConfig: {
    type: Schema.Types.ObjectId,
    ref: 'WhiteLabelConfig',
  },
  // Referral tracking
  referralCount: {
    type: Number,
    default: 0,
  },
  conversionCount: {
    type: Number,
    default: 0,
  },
  // Application details
  applicationDetails: {
    howDidYouHear: String,
    expectedReferrals: Number,
    targetIndustries: [String],
    valueProposition: String,
    experience: String,
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: Date,
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: String,
    rejectionReason: String,
  },
  // Agreement
  agreementAccepted: {
    type: Boolean,
    default: false,
  },
  agreementAcceptedAt: Date,
  agreementVersion: String,
  // Marketing
  affiliateCode: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },
  customLandingPage: {
    type: String,
    trim: true,
  },
  // Performance metrics
  metrics: {
    last30DaysRevenue: {
      type: Number,
      default: 0,
    },
    last90DaysRevenue: {
      type: Number,
      default: 0,
    },
    last12MonthsRevenue: {
      type: Number,
      default: 0,
    },
    averageCommission: {
      type: Number,
      default: 0,
    },
    conversionRate: {
      type: Number,
      default: 0,
    },
  },
  // Notifications
  notificationPreferences: {
    emailOnNewReferral: {
      type: Boolean,
      default: true,
    },
    emailOnCommission: {
      type: Boolean,
      default: true,
    },
    emailOnPayout: {
      type: Boolean,
      default: true,
    },
    emailOnTierChange: {
      type: Boolean,
      default: true,
    },
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  activatedAt: Date,
  lastActivityAt: Date,
}, {
  timestamps: { createdAt: true, updatedAt: true },
});

// Indexes
PartnerSchema.index({ status: 1, tier: 1 });
PartnerSchema.index({ type: 1, status: 1 });
PartnerSchema.index({ 'metrics.last30DaysRevenue': -1 });
PartnerSchema.index({ totalRevenue: -1 });
PartnerSchema.index({ createdAt: -1 });

// Virtual for available balance
PartnerSchema.virtual('availableBalance').get(function() {
  return this.totalRevenue - this.totalPayout;
});

// Virtual for active API keys count
PartnerSchema.virtual('activeApiKeysCount').get(function() {
  return this.apiKeys?.filter(key => key.isActive).length || 0;
});

// Method to check if partner can upgrade tier
PartnerSchema.methods.canUpgradeTier = function(targetTier) {
  const tierRequirements = {
    bronze: { minReferrals: 0, minRevenue: 0 },
    silver: { minReferrals: 25, minRevenue: 500000 },
    gold: { minReferrals: 100, minRevenue: 5000000 },
    platinum: { minReferrals: 500, minRevenue: 50000000 },
  };

  const requirements = tierRequirements[targetTier];
  if (!requirements) return false;

  return (
    this.referralCount >= requirements.minReferrals &&
    this.totalRevenue >= requirements.minRevenue
  );
};

// Method to add revenue
PartnerSchema.methods.addRevenue = async function(amount) {
  this.totalRevenue += amount;
  this.pendingPayout += amount * (this.commissionRate / 100);
  this.metrics.last30DaysRevenue += amount;
  this.metrics.last90DaysRevenue += amount;
  this.metrics.last12MonthsRevenue += amount;
  this.lastActivityAt = new Date();
  return this.save();
};

// Method to record payout
PartnerSchema.methods.recordPayout = async function(amount) {
  this.totalPayout += amount;
  this.pendingPayout = Math.max(0, this.pendingPayout - amount);
  return this.save();
};

// Static method to find active partners
PartnerSchema.statics.findActive = function(filters = {}) {
  return this.find({ status: 'active', ...filters });
};

// Static method to get leaderboard
PartnerSchema.statics.getLeaderboard = async function(limit = 10) {
  return this.find({ status: 'active' })
    .sort({ totalRevenue: -1 })
    .limit(limit)
    .select('partnerId name companyDetails.logo totalRevenue referralCount tier')
    .lean();
};

// Pre-save middleware
PartnerSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'active' && !this.activatedAt) {
    this.activatedAt = new Date();
  }
  next();
});

const Partner = mongoose.model('Partner', PartnerSchema);

module.exports = Partner;
