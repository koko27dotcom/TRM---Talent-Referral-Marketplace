/**
 * TierBenefits Model
 * Defines the tier system and associated benefits for referrers
 * Supports dynamic tier configuration and benefit management
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * Benefit configuration schema
 * Defines individual benefits within a tier
 */
const BenefitSchema = new Schema({
  // Benefit type/category
  type: {
    type: String,
    required: true,
    enum: [
      'commission_boost',      // Higher commission percentage
      'payout_speed',          // Faster payout processing
      'exclusive_jobs',        // Access to exclusive job listings
      'bonus_amount',          // Fixed bonus amount
      'priority_support',      // Priority customer support
      'early_access',          // Early access to new features
      'network_bonus',         // Bonus from network activity
      'referral_fee_discount', // Discount on referral fees
      'custom_branding',       // Custom profile branding
      'dedicated_manager',     // Dedicated account manager
    ],
  },
  
  // Human-readable benefit name
  name: {
    type: String,
    required: true,
    trim: true,
  },
  
  // Detailed description
  description: {
    type: String,
    required: true,
    trim: true,
  },
  
  // Icon identifier for UI
  icon: {
    type: String,
    default: 'gift',
  },
  
  // Benefit value (interpretation depends on type)
  value: {
    type: Schema.Types.Mixed,
    default: null,
  },
  
  // For commission_boost: percentage increase
  // For payout_speed: days to process
  // For bonus_amount: MMK amount
  // etc.
  numericValue: {
    type: Number,
    default: 0,
  },
  
  // Whether this benefit is active
  isActive: {
    type: Boolean,
    default: true,
  },
}, { _id: true });

/**
 * TierBenefits Schema
 * Defines a complete tier with its requirements and benefits
 */
const TierBenefitsSchema = new Schema({
  // Tier identifier (bronze, silver, gold, platinum)
  tier: {
    type: String,
    required: true,
    unique: true,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    index: true,
  },
  
  // Display name
  name: {
    type: String,
    required: true,
    trim: true,
  },
  
  // Tier level (for ordering)
  level: {
    type: Number,
    required: true,
    min: 1,
    max: 4,
  },
  
  // Tier color for UI
  color: {
    type: String,
    default: '#CD7F32', // Bronze default
  },
  
  // Gradient colors for UI
  gradient: {
    from: { type: String, default: '#CD7F32' },
    to: { type: String, default: '#B87333' },
  },
  
  // Icon identifier
  icon: {
    type: String,
    default: 'medal',
  },
  
  // Requirements to reach this tier
  requirements: {
    // Minimum direct referrals required
    minDirectReferrals: {
      type: Number,
      default: 0,
    },
    
    // Minimum network size (total downline)
    minNetworkSize: {
      type: Number,
      default: 0,
    },
    
    // Minimum total earnings
    minEarnings: {
      type: Number,
      default: 0,
    },
    
    // Minimum successful hires
    minSuccessfulHires: {
      type: Number,
      default: 0,
    },
    
    // Minimum account age in days
    minAccountAgeDays: {
      type: Number,
      default: 0,
    },
  },
  
  // Benefits for this tier
  benefits: [BenefitSchema],
  
  // Commission structure
  commission: {
    // Base commission percentage on referrals
    basePercent: {
      type: Number,
      default: 85, // 85% of referral bonus
    },
    
    // Network commission percentages by level
    networkPercent: {
      level1: { type: Number, default: 5 },
      level2: { type: Number, default: 3 },
      level3: { type: Number, default: 2 },
      level4Plus: { type: Number, default: 1 },
    },
  },
  
  // Payout settings
  payout: {
    // Minimum amount for payout request
    minPayoutAmount: {
      type: Number,
      default: 50000, // 50,000 MMK
    },
    
    // Processing time in days
    processingDays: {
      type: Number,
      default: 7,
    },
    
    // Maximum payout per request
    maxPayoutAmount: {
      type: Number,
      default: 1000000, // 1,000,000 MMK
    },
  },
  
  // Whether this tier is active
  isActive: {
    type: Boolean,
    default: true,
  },
  
  // Tier metadata
  metadata: {
    displayOrder: {
      type: Number,
      default: 0,
    },
    badgeUrl: {
      type: String,
      trim: true,
    },
    cardBackground: {
      type: String,
      trim: true,
    },
  },
}, {
  timestamps: true,
});

// ==================== INDEXES ====================

TierBenefitsSchema.index({ tier: 1 }, { unique: true });
TierBenefitsSchema.index({ level: 1 });
TierBenefitsSchema.index({ isActive: 1 });

// ==================== STATIC METHODS ====================

/**
 * Get all active tiers ordered by level
 * @returns {Promise<Array>} Array of tier documents
 */
TierBenefitsSchema.statics.getAllTiers = function() {
  return this.find({ isActive: true }).sort({ level: 1 });
};

/**
 * Get tier by identifier
 * @param {string} tier - Tier identifier (bronze, silver, gold, platinum)
 * @returns {Promise<Document|null>} Tier document
 */
TierBenefitsSchema.statics.getTier = function(tier) {
  return this.findOne({ tier: tier.toLowerCase(), isActive: true });
};

/**
 * Get next tier for a given tier level
 * @param {string} currentTier - Current tier identifier
 * @returns {Promise<Document|null>} Next tier document or null if max tier
 */
TierBenefitsSchema.statics.getNextTier = async function(currentTier) {
  const current = await this.getTier(currentTier);
  if (!current) return null;
  
  return this.findOne({ 
    level: { $gt: current.level },
    isActive: true 
  }).sort({ level: 1 });
};

/**
 * Get tier progression for a user
 * @param {Object} userStats - User's referral statistics
 * @returns {Promise<Object>} Tier progression info
 */
TierBenefitsSchema.statics.getTierProgress = async function(userStats) {
  const tiers = await this.getAllTiers();
  
  // Find current tier
  let currentTier = tiers[0]; // Default to bronze
  let nextTier = null;
  let progress = 0;
  
  for (let i = tiers.length - 1; i >= 0; i--) {
    const tier = tiers[i];
    const reqs = tier.requirements;
    
    if (userStats.directReferrals >= reqs.minDirectReferrals &&
        userStats.networkSize >= reqs.minNetworkSize &&
        userStats.totalEarnings >= reqs.minEarnings &&
        userStats.successfulHires >= reqs.minSuccessfulHires) {
      currentTier = tier;
      nextTier = tiers[i + 1] || null;
      break;
    }
  }
  
  // Calculate progress to next tier
  if (nextTier) {
    const reqs = nextTier.requirements;
    const metrics = [
      { current: userStats.directReferrals, required: reqs.minDirectReferrals },
      { current: userStats.networkSize, required: reqs.minNetworkSize },
      { current: userStats.totalEarnings, required: reqs.minEarnings },
      { current: userStats.successfulHires, required: reqs.minSuccessfulHires },
    ].filter(m => m.required > 0);
    
    if (metrics.length > 0) {
      const totalProgress = metrics.reduce((sum, m) => {
        return sum + Math.min(m.current / m.required, 1);
      }, 0);
      progress = Math.round((totalProgress / metrics.length) * 100);
    }
  } else {
    progress = 100; // Max tier reached
  }
  
  return {
    currentTier: currentTier.tier,
    currentTierName: currentTier.name,
    currentTierLevel: currentTier.level,
    nextTier: nextTier?.tier || null,
    nextTierName: nextTier?.name || null,
    progress,
    requirements: nextTier?.requirements || null,
  };
};

/**
 * Determine tier based on user stats
 * @param {Object} stats - User statistics
 * @returns {Promise<string>} Tier identifier
 */
TierBenefitsSchema.statics.calculateTier = async function(stats) {
  const tiers = await this.getAllTiers();
  
  // Check from highest tier to lowest
  for (let i = tiers.length - 1; i >= 0; i--) {
    const tier = tiers[i];
    const reqs = tier.requirements;
    
    if (stats.directReferrals >= reqs.minDirectReferrals &&
        stats.networkSize >= reqs.minNetworkSize &&
        stats.totalEarnings >= reqs.minEarnings &&
        stats.successfulHires >= reqs.minSuccessfulHires) {
      return tier.tier;
    }
  }
  
  return 'bronze';
};

/**
 * Get default tier configuration
 * Creates standard tier setup if none exists
 */
TierBenefitsSchema.statics.initializeDefaultTiers = async function() {
  const defaultTiers = [
    {
      tier: 'bronze',
      name: 'Bronze Referrer',
      level: 1,
      color: '#CD7F32',
      gradient: { from: '#CD7F32', to: '#B87333' },
      icon: 'medal',
      requirements: {
        minDirectReferrals: 0,
        minNetworkSize: 0,
        minEarnings: 0,
        minSuccessfulHires: 0,
      },
      benefits: [
        {
          type: 'commission_boost',
          name: 'Base Commission',
          description: 'Earn 85% of referral bonus on successful hires',
          icon: 'percent',
          numericValue: 85,
        },
        {
          type: 'payout_speed',
          name: 'Standard Payout',
          description: 'Payouts processed within 7 business days',
          icon: 'clock',
          numericValue: 7,
        },
      ],
      commission: {
        basePercent: 85,
        networkPercent: { level1: 5, level2: 3, level3: 2, level4Plus: 1 },
      },
      payout: {
        minPayoutAmount: 50000,
        processingDays: 7,
        maxPayoutAmount: 500000,
      },
    },
    {
      tier: 'silver',
      name: 'Silver Referrer',
      level: 2,
      color: '#C0C0C0',
      gradient: { from: '#C0C0C0', to: '#A8A8A8' },
      icon: 'award',
      requirements: {
        minDirectReferrals: 6,
        minNetworkSize: 10,
        minEarnings: 100000,
        minSuccessfulHires: 2,
      },
      benefits: [
        {
          type: 'commission_boost',
          name: 'Enhanced Commission',
          description: 'Earn 90% of referral bonus on successful hires',
          icon: 'percent',
          numericValue: 90,
        },
        {
          type: 'payout_speed',
          name: 'Fast Payout',
          description: 'Payouts processed within 5 business days',
          icon: 'zap',
          numericValue: 5,
        },
        {
          type: 'bonus_amount',
          name: 'Silver Bonus',
          description: 'Receive 10,000 MMK bonus when you reach Silver',
          icon: 'gift',
          numericValue: 10000,
        },
      ],
      commission: {
        basePercent: 90,
        networkPercent: { level1: 5, level2: 3, level3: 2, level4Plus: 1 },
      },
      payout: {
        minPayoutAmount: 30000,
        processingDays: 5,
        maxPayoutAmount: 1000000,
      },
    },
    {
      tier: 'gold',
      name: 'Gold Referrer',
      level: 3,
      color: '#FFD700',
      gradient: { from: '#FFD700', to: '#DAA520' },
      icon: 'crown',
      requirements: {
        minDirectReferrals: 21,
        minNetworkSize: 50,
        minEarnings: 500000,
        minSuccessfulHires: 5,
      },
      benefits: [
        {
          type: 'commission_boost',
          name: 'Premium Commission',
          description: 'Earn 95% of referral bonus on successful hires',
          icon: 'percent',
          numericValue: 95,
        },
        {
          type: 'payout_speed',
          name: 'Express Payout',
          description: 'Payouts processed within 3 business days',
          icon: 'zap',
          numericValue: 3,
        },
        {
          type: 'exclusive_jobs',
          name: 'Exclusive Jobs',
          description: 'Access to high-value exclusive job listings',
          icon: 'star',
        },
        {
          type: 'bonus_amount',
          name: 'Gold Bonus',
          description: 'Receive 50,000 MMK bonus when you reach Gold',
          icon: 'gift',
          numericValue: 50000,
        },
        {
          type: 'priority_support',
          name: 'Priority Support',
          description: 'Get priority customer support response',
          icon: 'headphones',
        },
      ],
      commission: {
        basePercent: 95,
        networkPercent: { level1: 5, level2: 3, level3: 2, level4Plus: 1 },
      },
      payout: {
        minPayoutAmount: 20000,
        processingDays: 3,
        maxPayoutAmount: 2000000,
      },
    },
    {
      tier: 'platinum',
      name: 'Platinum Referrer',
      level: 4,
      color: '#E5E4E2',
      gradient: { from: '#E5E4E2', to: '#B0B0B0' },
      icon: 'gem',
      requirements: {
        minDirectReferrals: 51,
        minNetworkSize: 150,
        minEarnings: 2000000,
        minSuccessfulHires: 15,
      },
      benefits: [
        {
          type: 'commission_boost',
          name: 'Maximum Commission',
          description: 'Earn 100% of referral bonus on successful hires',
          icon: 'percent',
          numericValue: 100,
        },
        {
          type: 'payout_speed',
          name: 'Instant Payout',
          description: 'Payouts processed within 24 hours',
          icon: 'zap',
          numericValue: 1,
        },
        {
          type: 'exclusive_jobs',
          name: 'VIP Jobs',
          description: 'First access to premium job listings',
          icon: 'star',
        },
        {
          type: 'bonus_amount',
          name: 'Platinum Bonus',
          description: 'Receive 200,000 MMK bonus when you reach Platinum',
          icon: 'gift',
          numericValue: 200000,
        },
        {
          type: 'dedicated_manager',
          name: 'Account Manager',
          description: 'Dedicated account manager for personalized support',
          icon: 'user',
        },
        {
          type: 'custom_branding',
          name: 'Custom Profile',
          description: 'Custom profile badge and branding',
          icon: 'palette',
        },
        {
          type: 'early_access',
          name: 'Early Access',
          description: 'Early access to new features and job listings',
          icon: 'rocket',
        },
      ],
      commission: {
        basePercent: 100,
        networkPercent: { level1: 5, level2: 3, level3: 2, level4Plus: 1 },
      },
      payout: {
        minPayoutAmount: 10000,
        processingDays: 1,
        maxPayoutAmount: 5000000,
      },
    },
  ];
  
  for (const tierData of defaultTiers) {
    await this.findOneAndUpdate(
      { tier: tierData.tier },
      tierData,
      { upsert: true, new: true }
    );
  }
  
  console.log('✅ Default tier benefits initialized');
};

// Create and export the model
const TierBenefits = mongoose.model('TierBenefits', TierBenefitsSchema);

module.exports = TierBenefits;
