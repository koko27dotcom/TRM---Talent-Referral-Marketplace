/**
 * FeatureGateService
 * Service for enforcing subscription tier limits and feature access
 * Provides middleware and utility functions for feature gating
 */

const {
  Subscription,
  SubscriptionPlan,
  TierBenefits,
  Company,
  User,
  Job,
  Referral,
} = require('../models/index.js');

class FeatureGateService {
  constructor() {
    // Feature definitions by subscriber type
    this.features = {
      company: {
        jobPosting: {
          name: 'Job Posting',
          description: 'Post job listings',
          limitField: 'jobPostingLimit',
          usageField: 'jobsPosted',
        },
        userManagement: {
          name: 'User Management',
          description: 'Manage company users',
          limitField: 'userLimit',
          usageField: 'users',
        },
        storage: {
          name: 'Storage',
          description: 'File storage space',
          limitField: 'storageLimit',
          usageField: 'storageUsed',
        },
        apiAccess: {
          name: 'API Access',
          description: 'Access to API endpoints',
          boolean: true,
        },
        prioritySupport: {
          name: 'Priority Support',
          description: 'Priority customer support',
          boolean: true,
        },
        customBranding: {
          name: 'Custom Branding',
          description: 'Custom company branding',
          boolean: true,
        },
        whiteLabel: {
          name: 'White Label',
          description: 'White-label options',
          boolean: true,
        },
        advancedAnalytics: {
          name: 'Advanced Analytics',
          description: 'Advanced analytics dashboard',
          boolean: true,
        },
        dedicatedManager: {
          name: 'Dedicated Manager',
          description: 'Dedicated account manager',
          boolean: true,
        },
        bulkImport: {
          name: 'Bulk Import',
          description: 'Bulk import candidates',
          boolean: true,
        },
        customIntegrations: {
          name: 'Custom Integrations',
          description: 'Custom third-party integrations',
          boolean: true,
        },
        featuredJobs: {
          name: 'Featured Jobs',
          description: 'Featured job placements',
          boolean: true,
        },
        resumeDatabase: {
          name: 'Resume Database',
          description: 'Access to resume database',
          boolean: true,
        },
        talentPool: {
          name: 'Talent Pool',
          description: 'Access to talent pool',
          boolean: true,
        },
      },
      referrer: {
        basicReferral: {
          name: 'Basic Referral',
          description: 'Submit basic referrals',
          tier: ['free', 'pro', 'elite'],
        },
        priorityMatching: {
          name: 'Priority Matching',
          description: 'Priority job matching',
          tier: ['pro', 'elite'],
        },
        advancedAnalytics: {
          name: 'Advanced Analytics',
          description: 'Advanced analytics dashboard',
          tier: ['pro', 'elite'],
        },
        earlyAccess: {
          name: 'Early Access',
          description: 'Early access to premium jobs',
          tier: ['pro', 'elite'],
        },
        instantPayout: {
          name: 'Instant Payout',
          description: 'Instant commission payouts',
          tier: ['elite'],
        },
        dedicatedSupport: {
          name: 'Dedicated Support',
          description: 'Dedicated support channel',
          tier: ['elite'],
        },
        apiAccess: {
          name: 'API Access',
          description: 'API access for integrations',
          tier: ['elite'],
        },
        customLinks: {
          name: 'Custom Links',
          description: 'Custom referral links',
          tier: ['elite'],
        },
        whiteLabel: {
          name: 'White Label',
          description: 'White-label options',
          tier: ['elite'],
        },
        exclusiveJobs: {
          name: 'Exclusive Jobs',
          description: 'Access to exclusive jobs',
          tier: ['elite'],
        },
        aiResumeOptimization: {
          name: 'AI Resume Optimization',
          description: 'AI-powered resume optimization',
          limitField: 'aiCreditsLimit',
          usageField: 'aiCreditsUsed',
        },
      },
    };

    // Commission rates by referrer tier
    this.commissionRates = {
      free: 50,
      pro: 70,
      elite: 85,
    };

    // Payout thresholds by tier (MMK)
    this.payoutThresholds = {
      free: 100000,
      pro: 50000,
      elite: 10000,
    };
  }

  // ==================== FEATURE ACCESS CHECKS ====================

  /**
   * Check if subscriber has access to a feature
   * @param {string} subscriberId - Subscriber ID
   * @param {string} subscriberType - 'user' or 'company'
   * @param {string} featureKey - Feature key
   * @returns {Promise<Object>} Feature access result
   */
  async checkFeatureAccess(subscriberId, subscriberType, featureKey) {
    const subscription = await this.getSubscription(subscriberId, subscriberType);

    if (!subscription) {
      return {
        hasAccess: false,
        reason: 'NO_SUBSCRIPTION',
        message: 'No active subscription found',
      };
    }

    const feature = this.features[subscriberType]?.[featureKey];
    if (!feature) {
      return {
        hasAccess: false,
        reason: 'FEATURE_NOT_FOUND',
        message: 'Feature not found',
      };
    }

    // Check boolean features
    if (feature.boolean) {
      const plan = subscription.planId;
      const hasAccess = plan.features?.[featureKey] || false;

      return {
        hasAccess,
        feature: featureKey,
        featureName: feature.name,
        planName: plan.name,
        reason: hasAccess ? null : 'PLAN_LIMITATION',
        message: hasAccess ? null : `Upgrade to access ${feature.name}`,
      };
    }

    // Check tier-based features for referrers
    if (subscriberType === 'referrer' && feature.tier) {
      const tier = subscription.tier || 'free';
      const hasAccess = feature.tier.includes(tier);

      return {
        hasAccess,
        feature: featureKey,
        featureName: feature.name,
        tier,
        requiredTiers: feature.tier,
        reason: hasAccess ? null : 'TIER_LIMITATION',
        message: hasAccess ? null : `Upgrade to ${feature.tier[0]} to access ${feature.name}`,
      };
    }

    // Check limit-based features
    if (feature.limitField) {
      const plan = subscription.planId;
      const baseLimit = plan.features?.[feature.limitField] || 0;
      const usage = await this.getUsage(subscriberId, subscriberType, feature.usageField);
      
      // Include bonus credits for AI resume optimization
      let bonusCredits = 0;
      if (featureKey === 'aiResumeOptimization') {
        bonusCredits = subscription.usage?.bonusAiCredits || 0;
      }
      
      const totalLimit = baseLimit === -1 ? -1 : baseLimit + bonusCredits;
      const hasAccess = totalLimit === -1 || usage < totalLimit;

      return {
        hasAccess,
        feature: featureKey,
        featureName: feature.name,
        limit: baseLimit,
        totalLimit: totalLimit === -1 ? 'Unlimited' : totalLimit,
        usage,
        bonusCredits: featureKey === 'aiResumeOptimization' ? bonusCredits : 0,
        remaining: totalLimit === -1 ? 'Unlimited' : Math.max(0, totalLimit - usage),
        planName: plan.name,
        reason: hasAccess ? null : 'LIMIT_REACHED',
        message: hasAccess ? null : `You have reached your ${feature.name} limit. Refer candidates to earn bonus credits or upgrade to continue.`,
      };
    }

    return {
      hasAccess: false,
      reason: 'UNKNOWN',
      message: 'Unable to determine feature access',
    };
  }

  /**
   * Check multiple features at once
   * @param {string} subscriberId - Subscriber ID
   * @param {string} subscriberType - 'user' or 'company'
   * @param {Array<string>} featureKeys - Feature keys
   * @returns {Promise<Object>} Features access results
   */
  async checkMultipleFeatures(subscriberId, subscriberType, featureKeys) {
    const results = {};

    for (const featureKey of featureKeys) {
      results[featureKey] = await this.checkFeatureAccess(
        subscriberId,
        subscriberType,
        featureKey
      );
    }

    return results;
  }

  /**
   * Get all features and their access status
   * @param {string} subscriberId - Subscriber ID
   * @param {string} subscriberType - 'user' or 'company'
   * @returns {Promise<Object>} All features access
   */
  async getAllFeatures(subscriberId, subscriberType) {
    const subscription = await this.getSubscription(subscriberId, subscriberType);
    const features = this.features[subscriberType] || {};
    const results = {};

    for (const [key, feature] of Object.entries(features)) {
      results[key] = await this.checkFeatureAccess(subscriberId, subscriberType, key);
    }

    return {
      subscription: subscription
        ? {
            planName: subscription.planId?.name || subscription.tier,
            status: subscription.status,
            expiresAt: subscription.currentPeriodEnd,
          }
        : null,
      features: results,
    };
  }

  // ==================== USAGE TRACKING ====================

  /**
   * Get current usage for a feature
   * @param {string} subscriberId - Subscriber ID
   * @param {string} subscriberType - 'user' or 'company'
   * @param {string} usageField - Usage field name
   * @returns {Promise<number>} Current usage
   */
  async getUsage(subscriberId, subscriberType, usageField) {
    switch (usageField) {
      case 'jobsPosted':
        return await Job.countDocuments({
          companyId: subscriberId,
          status: { $in: ['active', 'paused'] },
        });

      case 'users':
        // Would need to query company users collection
        return 0;

      case 'storageUsed':
        // Would need to calculate from file storage
        return 0;

      case 'referrals':
        return await Referral.countDocuments({
          referrerId: subscriberId,
          createdAt: {
            $gte: new Date(new Date().setDate(1)), // Current month
          },
        });

      case 'aiCreditsUsed': {
        const subscription = await this.getSubscription(subscriberId, subscriberType);
        return subscription?.usage?.aiCreditsUsed || 0;
      }

      default:
        return 0;
    }
  }

  /**
   * Increment usage for a feature
   * @param {string} subscriberId - Subscriber ID
   * @param {string} subscriberType - 'user' or 'company'
   * @param {string} usageField - Usage field name
   * @returns {Promise<Object>} Updated usage
   */
  async incrementUsage(subscriberId, subscriberType, usageField) {
    const subscription = await this.getSubscription(subscriberId, subscriberType);

    if (!subscription) {
      throw new Error('No active subscription found');
    }

    if (!subscription.usage) {
      subscription.usage = {};
    }

    subscription.usage[usageField] = (subscription.usage[usageField] || 0) + 1;
    await subscription.save();

    return {
      usageField,
      currentUsage: subscription.usage[usageField],
    };
  }

  /**
   * Reset usage counters (called on subscription renewal)
   * @param {string} subscriptionId - Subscription ID
   * @returns {Promise<Object>} Reset result
   */
  async resetUsage(subscriptionId) {
    const subscription = await Subscription.findById(subscriptionId);

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    subscription.usage = {
      jobsPosted: 0,
      storageUsed: 0,
      apiCalls: 0,
      referrals: 0,
      aiCreditsUsed: 0,
      // Note: bonusAiCredits persists across billing periods
    };

    await subscription.save();

    return {
      subscriptionId,
      usage: subscription.usage,
      resetAt: new Date(),
    };
  }

  // ==================== LIMITS ====================

  /**
   * Get all limits for subscriber
   * @param {string} subscriberId - Subscriber ID
   * @param {string} subscriberType - 'user' or 'company'
   * @returns {Promise<Object>} All limits
   */
  async getLimits(subscriberId, subscriberType) {
    const subscription = await this.getSubscription(subscriberId, subscriberType);

    if (!subscription) {
      return {
        hasSubscription: false,
        limits: {},
      };
    }

    const plan = subscription.planId;
    const features = this.features[subscriberType] || {};
    const limits = {};

    for (const [key, feature] of Object.entries(features)) {
      if (feature.limitField) {
        const baseLimit = plan.features?.[feature.limitField] || 0;
        const usage = await this.getUsage(subscriberId, subscriberType, feature.usageField);
        
        // Include bonus credits for AI resume optimization
        let bonusCredits = 0;
        if (key === 'aiResumeOptimization') {
          bonusCredits = subscription.usage?.bonusAiCredits || 0;
        }
        
        const totalLimit = baseLimit === -1 ? -1 : baseLimit + bonusCredits;

        limits[key] = {
          name: feature.name,
          limit: baseLimit,
          totalLimit: totalLimit === -1 ? 'Unlimited' : totalLimit,
          usage,
          bonusCredits: key === 'aiResumeOptimization' ? bonusCredits : 0,
          remaining: totalLimit === -1 ? 'Unlimited' : Math.max(0, totalLimit - usage),
          percentageUsed: totalLimit > 0 && totalLimit !== -1 ? Math.round((usage / totalLimit) * 100) : 0,
        };
      }
    }

    return {
      hasSubscription: true,
      planName: plan.name,
      planSlug: plan.slug,
      limits,
    };
  }

  /**
   * Check if limit is reached
   * @param {string} subscriberId - Subscriber ID
   * @param {string} subscriberType - 'user' or 'company'
   * @param {string} featureKey - Feature key
   * @returns {Promise<Object>} Limit status
   */
  async checkLimit(subscriberId, subscriberType, featureKey) {
    const feature = this.features[subscriberType]?.[featureKey];

    if (!feature || !feature.limitField) {
      return {
        hasLimit: false,
      };
    }

    const subscription = await this.getSubscription(subscriberId, subscriberType);

    if (!subscription) {
      return {
        hasLimit: true,
        limit: 0,
        usage: 0,
        isReached: true,
      };
    }

    const plan = subscription.planId;
    const baseLimit = plan.features?.[feature.limitField] || 0;
    const usage = await this.getUsage(subscriberId, subscriberType, feature.usageField);
    
    // Include bonus credits for AI resume optimization
    let bonusCredits = 0;
    if (featureKey === 'aiResumeOptimization') {
      bonusCredits = subscription.usage?.bonusAiCredits || 0;
    }
    
    const totalLimit = baseLimit === -1 ? -1 : baseLimit + bonusCredits;

    return {
      hasLimit: true,
      limit: baseLimit,
      totalLimit: totalLimit === -1 ? 'Unlimited' : totalLimit,
      usage,
      bonusCredits: featureKey === 'aiResumeOptimization' ? bonusCredits : 0,
      remaining: totalLimit === -1 ? 'Unlimited' : Math.max(0, totalLimit - usage),
      isReached: totalLimit !== -1 && usage >= totalLimit,
      percentageUsed: totalLimit > 0 && totalLimit !== -1 ? Math.round((usage / totalLimit) * 100) : 0,
    };
  }

  // ==================== COMMISSION & PAYOUTS ====================

  /**
   * Get commission rate for referrer
   * @param {string} userId - User ID
   * @returns {Promise<number>} Commission rate percentage
   */
  async getCommissionRate(userId) {
    const subscription = await Subscription.findOne({
      userId,
      status: { $in: ['active', 'trialing'] },
    });

    const tier = subscription?.tier || 'free';
    return this.commissionRates[tier] || this.commissionRates.free;
  }

  /**
   * Get payout threshold for referrer
   * @param {string} userId - User ID
   * @returns {Promise<number>} Payout threshold in MMK
   */
  async getPayoutThreshold(userId) {
    const subscription = await Subscription.findOne({
      userId,
      status: { $in: ['active', 'trialing'] },
    });

    const tier = subscription?.tier || 'free';
    return this.payoutThresholds[tier] || this.payoutThresholds.free;
  }

  /**
   * Calculate referrer earnings
   * @param {string} userId - User ID
   * @param {number} baseAmount - Base commission amount
   * @returns {Promise<Object>} Earnings calculation
   */
  async calculateEarnings(userId, baseAmount) {
    const rate = await this.getCommissionRate(userId);
    const earnings = Math.round(baseAmount * (rate / 100));

    return {
      baseAmount,
      rate,
      earnings,
      platformFee: baseAmount - earnings,
    };
  }

  // ==================== MIDDLEWARE ====================

  /**
   * Express middleware to check feature access
   * @param {string} featureKey - Feature key
   * @param {Object} options - Middleware options
   * @returns {Function} Express middleware
   */
  middleware(featureKey, options = {}) {
    return async (req, res, next) => {
      try {
        const subscriberId = req.user?.companyId || req.user?._id;
        const subscriberType = req.user?.companyId ? 'company' : 'referrer';

        if (!subscriberId) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'User not authenticated',
          });
        }

        const access = await this.checkFeatureAccess(
          subscriberId,
          subscriberType,
          featureKey
        );

        if (!access.hasAccess) {
          return res.status(403).json({
            error: 'Feature Not Available',
            message: access.message,
            feature: featureKey,
            reason: access.reason,
            upgradeRequired: true,
          });
        }

        // Attach feature info to request
        req.featureAccess = access;
        next();
      } catch (error) {
        console.error('Feature Gate Middleware Error:', error);
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to check feature access',
        });
      }
    };
  }

  /**
   * Express middleware to check and increment usage
   * @param {string} featureKey - Feature key
   * @returns {Function} Express middleware
   */
  usageMiddleware(featureKey) {
    return async (req, res, next) => {
      try {
        const subscriberId = req.user?.companyId || req.user?._id;
        const subscriberType = req.user?.companyId ? 'company' : 'referrer';

        if (!subscriberId) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'User not authenticated',
          });
        }

        // Check access first
        const access = await this.checkFeatureAccess(
          subscriberId,
          subscriberType,
          featureKey
        );

        if (!access.hasAccess) {
          return res.status(403).json({
            error: 'Feature Not Available',
            message: access.message,
            feature: featureKey,
            reason: access.reason,
            upgradeRequired: true,
          });
        }

        // Increment usage after successful action
        const originalJson = res.json;
        res.json = function(data) {
          // Only increment if response is successful
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const feature = this.features[subscriberType]?.[featureKey];
            if (feature?.usageField) {
              this.incrementUsage(subscriberId, subscriberType, feature.usageField)
                .catch(err => console.error('Failed to increment usage:', err));
            }
          }
          originalJson.call(this, data);
        }.bind(this);

        req.featureAccess = access;
        next();
      } catch (error) {
        console.error('Usage Middleware Error:', error);
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to check feature access',
        });
      }
    };
  }

  // ==================== HELPER METHODS ====================

  /**
   * Get subscription for subscriber
   * @param {string} subscriberId - Subscriber ID
   * @param {string} subscriberType - 'user' or 'company'
   * @returns {Promise<Object>} Subscription
   */
  async getSubscription(subscriberId, subscriberType) {
    const query = {
      status: { $in: ['active', 'trialing'] },
    };

    if (subscriberType === 'company') {
      query.companyId = subscriberId;
    } else {
      query.userId = subscriberId;
    }

    return await Subscription.findOne(query)
      .populate('planId')
      .sort({ createdAt: -1 });
  }

  /**
   * Get upgrade suggestions
   * @param {string} subscriberId - Subscriber ID
   * @param {string} subscriberType - 'user' or 'company'
   * @returns {Promise<Array>} Upgrade suggestions
   */
  async getUpgradeSuggestions(subscriberId, subscriberType) {
    const currentFeatures = await this.getAllFeatures(subscriberId, subscriberType);
    const unavailableFeatures = Object.entries(currentFeatures.features)
      .filter(([, access]) => !access.hasAccess)
      .map(([key]) => key);

    if (unavailableFeatures.length === 0) {
      return [];
    }

    // Get next tier
    const subscription = await this.getSubscription(subscriberId, subscriberType);
    const currentTier = subscription?.tier || 'free';

    const tiers = subscriberType === 'company'
      ? await SubscriptionPlan.find({ isActive: true }).sort({ price: 1 })
      : await TierBenefits.find({ isActive: true }).sort({ level: 1 });

    const currentIndex = tiers.findIndex(t =>
      subscriberType === 'company' ? t.slug === currentTier : t.tier === currentTier
    );

    const nextTier = tiers[currentIndex + 1];

    if (!nextTier) {
      return [];
    }

    return unavailableFeatures.map(featureKey => ({
      feature: featureKey,
      featureName: this.features[subscriberType]?.[featureKey]?.name,
      currentTier,
      nextTier: subscriberType === 'company' ? nextTier.name : nextTier.tier,
      nextTierPrice: nextTier.price,
    }));
  }
}

// Export singleton instance
const featureGateService = new FeatureGateService();
module.exports = FeatureGateService;
