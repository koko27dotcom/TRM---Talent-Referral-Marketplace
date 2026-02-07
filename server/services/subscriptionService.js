/**
 * SubscriptionService
 * Core service for managing subscriptions, tier upgrades/downgrades, and billing
 * Supports both referrer and company subscription tiers
 */

const {
  Subscription,
  SubscriptionPlan,
  BillingRecord,
  Company,
  User,
  TierBenefits,
} = require('../models/index.js');
const mongoose = require('mongoose');

class SubscriptionService {
  constructor() {
    this.ANNUAL_DISCOUNT_PERCENTAGE = 20;
  }

  // ==================== SUBSCRIPTION MANAGEMENT ====================

  /**
   * Create a new subscription
   * @param {Object} data - Subscription data
   * @returns {Promise<Object>} Created subscription
   */
  async createSubscription(data) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const {
        subscriberId,
        subscriberType,
        tierId,
        billingCycle = 'monthly',
        paymentMethod,
        isTrial = false,
        trialDays = 0,
        promoCode = null,
      } = data;

      // Get tier details
      const tier = await this.getTierDetails(tierId, subscriberType);
      if (!tier) {
        throw new Error('Subscription tier not found');
      }

      // Calculate price
      let price = tier.price;
      let discountApplied = 0;

      if (billingCycle === 'yearly') {
        const yearlyBase = tier.price * 12;
        discountApplied = yearlyBase * (this.ANNUAL_DISCOUNT_PERCENTAGE / 100);
        price = Math.round(yearlyBase - discountApplied);
      }

      // Apply promo code if provided
      if (promoCode) {
        const promoDiscount = await this.applyPromoCode(promoCode, price);
        price -= promoDiscount;
        discountApplied += promoDiscount;
      }

      // Calculate period dates
      const now = new Date();
      const { currentPeriodStart, currentPeriodEnd } = this.calculatePeriodDates(
        now,
        billingCycle,
        isTrial,
        trialDays
      );

      // Create subscription
      const subscription = await Subscription.create(
        [
          {
            companyId: subscriberType === 'company' ? subscriberId : null,
            userId: subscriberType === 'user' ? subscriberId : null,
            planId: tier._id,
            status: isTrial ? 'trialing' : 'active',
            currentPeriodStart,
            currentPeriodEnd,
            price,
            currency: tier.currency || 'MMK',
            billingCycle,
            discountApplied,
            autoRenew: true,
            paymentMethod,
            isTrial,
            trialEndsAt: isTrial ? currentPeriodEnd : null,
            metadata: {
              subscriberType,
              promoCode,
            },
          },
        ],
        { session }
      );

      // Update subscriber's subscription reference
      if (subscriberType === 'company') {
        await Company.findByIdAndUpdate(
          subscriberId,
          {
            currentSubscription: {
              planId: tier._id,
              status: isTrial ? 'trialing' : 'active',
              startedAt: currentPeriodStart,
              expiresAt: currentPeriodEnd,
              autoRenew: true,
            },
          },
          { session }
        );
      }

      await session.commitTransaction();

      return {
        subscription: subscription[0],
        tier,
        price,
        discountApplied,
        billingCycle,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Upgrade subscription to a higher tier
   * @param {string} subscriptionId - Current subscription ID
   * @param {string} newTierId - New tier ID
   * @param {Object} options - Upgrade options
   * @returns {Promise<Object>} Upgrade result
   */
  async upgradeSubscription(subscriptionId, newTierId, options = {}) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const subscription = await Subscription.findById(subscriptionId).session(session);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      const currentTier = await SubscriptionPlan.findById(subscription.planId).session(session);
      const newTier = await SubscriptionPlan.findById(newTierId).session(session);

      if (!newTier) {
        throw new Error('New tier not found');
      }

      if (newTier.price <= currentTier.price) {
        throw new Error('New tier must be higher priced for upgrade');
      }

      // Calculate proration
      const now = new Date();
      const prorationAmount = this.calculateProration(
        subscription,
        currentTier,
        newTier,
        now
      );

      // Update subscription
      subscription.previousSubscriptionId = subscription._id;
      subscription.planId = newTierId;
      subscription.price = newTier.price;
      subscription.upgradeDowngradeDate = now;
      subscription.prorationApplied = true;
      subscription.prorationAmount = prorationAmount;
      subscription.status = 'active';

      await subscription.save({ session });

      // Create billing record for upgrade
      const billingRecord = await BillingRecord.create(
        [
          {
            companyId: subscription.companyId,
            subscriptionId: subscription._id,
            invoiceNumber: await this.generateInvoiceNumber(),
            invoiceType: 'subscription',
            items: [
              {
                description: `Upgrade to ${newTier.name} Plan`,
                type: 'upgrade',
                quantity: 1,
                unitPrice: prorationAmount,
                amount: prorationAmount,
              },
            ],
            subtotal: prorationAmount,
            total: prorationAmount,
            currency: newTier.currency || 'MMK',
            dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            status: 'pending',
          },
        ],
        { session }
      );

      await session.commitTransaction();

      return {
        subscription,
        billingRecord: billingRecord[0],
        prorationAmount,
        message: `Successfully upgraded to ${newTier.name} plan`,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Downgrade subscription to a lower tier
   * @param {string} subscriptionId - Current subscription ID
   * @param {string} newTierId - New tier ID
   * @returns {Promise<Object>} Downgrade result
   */
  async downgradeSubscription(subscriptionId, newTierId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const subscription = await Subscription.findById(subscriptionId).session(session);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      const currentTier = await SubscriptionPlan.findById(subscription.planId).session(session);
      const newTier = await SubscriptionPlan.findById(newTierId).session(session);

      if (!newTier) {
        throw new Error('New tier not found');
      }

      if (newTier.price >= currentTier.price) {
        throw new Error('New tier must be lower priced for downgrade');
      }

      // Schedule downgrade for end of period
      subscription.pendingPlanId = newTierId;
      subscription.pendingDowngradeDate = subscription.currentPeriodEnd;

      await subscription.save({ session });

      await session.commitTransaction();

      return {
        subscription,
        message: `Downgrade to ${newTier.name} scheduled for ${subscription.currentPeriodEnd.toLocaleDateString()}`,
        effectiveDate: subscription.currentPeriodEnd,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Cancel subscription
   * @param {string} subscriptionId - Subscription ID
   * @param {Object} options - Cancellation options
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelSubscription(subscriptionId, options = {}) {
    const { reason, atPeriodEnd = true } = options;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    subscription.cancelAtPeriodEnd = atPeriodEnd;
    subscription.cancellationReason = reason;
    subscription.cancelledAt = new Date();

    if (!atPeriodEnd) {
      subscription.status = 'cancelled';
    }

    await subscription.save();

    return {
      subscription,
      message: atPeriodEnd
        ? 'Subscription will be cancelled at the end of the current billing period'
        : 'Subscription cancelled immediately',
      effectiveDate: atPeriodEnd ? subscription.currentPeriodEnd : new Date(),
    };
  }

  /**
   * Reactivate a cancelled subscription
   * @param {string} subscriptionId - Subscription ID
   * @returns {Promise<Object>} Reactivation result
   */
  async reactivateSubscription(subscriptionId) {
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.status !== 'cancelled' && !subscription.cancelAtPeriodEnd) {
      throw new Error('Subscription is not cancelled');
    }

    subscription.cancelAtPeriodEnd = false;
    subscription.cancellationReason = null;
    subscription.cancelledAt = null;

    if (subscription.isExpired) {
      // Extend period if expired
      const now = new Date();
      subscription.currentPeriodStart = now;
      subscription.currentPeriodEnd = this.calculatePeriodEnd(now, subscription.billingCycle);
      subscription.status = 'active';
    }

    await subscription.save();

    return {
      subscription,
      message: 'Subscription reactivated successfully',
    };
  }

  /**
   * Change billing cycle (monthly/yearly)
   * @param {string} subscriptionId - Subscription ID
   * @param {string} newCycle - New billing cycle
   * @returns {Promise<Object>} Change result
   */
  async changeBillingCycle(subscriptionId, newCycle) {
    const subscription = await Subscription.findById(subscriptionId).populate('planId');
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (!['monthly', 'yearly'].includes(newCycle)) {
      throw new Error('Invalid billing cycle');
    }

    if (subscription.billingCycle === newCycle) {
      throw new Error('New billing cycle must be different from current');
    }

    const plan = subscription.planId;
    let newPrice = plan.price;

    if (newCycle === 'yearly') {
      const yearlyBase = plan.price * 12;
      const discount = yearlyBase * (this.ANNUAL_DISCOUNT_PERCENTAGE / 100);
      newPrice = Math.round(yearlyBase - discount);
    }

    subscription.billingCycle = newCycle;
    subscription.price = newPrice;

    await subscription.save();

    return {
      subscription,
      newPrice,
      message: `Billing cycle changed to ${newCycle}`,
    };
  }

  // ==================== TIER MANAGEMENT ====================

  /**
   * Get tier details
   * @param {string} tierId - Tier ID
   * @param {string} subscriberType - 'user' or 'company'
   * @returns {Promise<Object>} Tier details
   */
  async getTierDetails(tierId, subscriberType) {
    if (subscriberType === 'company') {
      return await SubscriptionPlan.findById(tierId);
    } else {
      return await TierBenefits.findById(tierId);
    }
  }

  /**
   * Get available tiers for subscriber type
   * @param {string} subscriberType - 'user' or 'company'
   * @returns {Promise<Array>} Available tiers
   */
  async getAvailableTiers(subscriberType) {
    if (subscriberType === 'company') {
      return await SubscriptionPlan.find({ isActive: true }).sort({ price: 1 });
    } else {
      return await TierBenefits.find({ isActive: true }).sort({ level: 1 });
    }
  }

  /**
   * Get current subscription for subscriber
   * @param {string} subscriberId - Subscriber ID
   * @param {string} subscriberType - 'user' or 'company'
   * @returns {Promise<Object>} Current subscription
   */
  async getCurrentSubscription(subscriberId, subscriberType) {
    const query = {
      status: { $in: ['active', 'trialing', 'past_due', 'paused'] },
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

  // ==================== FEATURE ACCESS ====================

  /**
   * Check if subscriber has access to a feature
   * @param {string} subscriberId - Subscriber ID
   * @param {string} subscriberType - 'user' or 'company'
   * @param {string} feature - Feature name
   * @returns {Promise<Object>} Feature access info
   */
  async checkFeatureAccess(subscriberId, subscriberType, feature) {
    const subscription = await this.getCurrentSubscription(subscriberId, subscriberType);

    if (!subscription) {
      return {
        hasAccess: false,
        reason: 'NO_SUBSCRIPTION',
      };
    }

    const plan = subscription.planId;
    let hasAccess = false;
    let limit = null;
    let currentUsage = 0;

    // Check feature access based on plan features
    if (subscriberType === 'company') {
      switch (feature) {
        case 'jobPosting':
          hasAccess = true;
          limit = plan.features?.jobPostingLimit || 0;
          currentUsage = subscription.usage?.jobsPosted || 0;
          if (limit > 0 && currentUsage >= limit) {
            hasAccess = false;
          }
          break;
        case 'apiAccess':
          hasAccess = plan.features?.apiAccess || false;
          break;
        case 'prioritySupport':
          hasAccess = plan.features?.prioritySupport || false;
          break;
        case 'customBranding':
          hasAccess = plan.features?.customBranding || false;
          break;
        case 'whiteLabel':
          hasAccess = plan.features?.whiteLabel || false;
          break;
        case 'advancedAnalytics':
          hasAccess = plan.features?.advancedAnalytics || false;
          break;
        case 'dedicatedManager':
          hasAccess = plan.features?.dedicatedManager || false;
          break;
        case 'bulkImport':
          hasAccess = plan.features?.bulkImport || false;
          break;
        case 'customIntegrations':
          hasAccess = plan.features?.customIntegrations || false;
          break;
      }
    } else {
      // Referrer tier features
      const tier = await TierBenefits.findOne({ tier: plan.tier });
      if (tier) {
        const benefit = tier.benefits.find(b => b.type === feature);
        hasAccess = !!benefit && benefit.isActive;
      }
    }

    return {
      hasAccess,
      feature,
      planName: plan.name,
      limit,
      currentUsage,
      remaining: limit > 0 ? Math.max(0, limit - currentUsage) : 'Unlimited',
    };
  }

  /**
   * Get all limits and usage for subscriber
   * @param {string} subscriberId - Subscriber ID
   * @param {string} subscriberType - 'user' or 'company'
   * @returns {Promise<Object>} Limits and usage
   */
  async getSubscriberLimits(subscriberId, subscriberType) {
    const subscription = await this.getCurrentSubscription(subscriberId, subscriberType);

    if (!subscription) {
      return {
        hasSubscription: false,
        limits: {},
      };
    }

    const plan = subscription.planId;
    const usage = subscription.usage || {};

    return {
      hasSubscription: true,
      planName: plan.name,
      planSlug: plan.slug,
      limits: {
        jobs: {
          limit: plan.features?.jobPostingLimit || 0,
          used: usage.jobsPosted || 0,
          remaining: plan.features?.jobPostingLimit > 0
            ? Math.max(0, plan.features.jobPostingLimit - (usage.jobsPosted || 0))
            : 'Unlimited',
        },
        users: {
          limit: plan.features?.userLimit || 0,
          used: 0, // Would need to query actual count
          remaining: plan.features?.userLimit > 0
            ? Math.max(0, plan.features.userLimit - 0)
            : 'Unlimited',
        },
        storage: {
          limit: plan.features?.storageLimit || 0,
          used: usage.storageUsed || 0,
          remaining: plan.features?.storageLimit > 0
            ? Math.max(0, plan.features.storageLimit - (usage.storageUsed || 0))
            : 'Unlimited',
        },
      },
      features: {
        apiAccess: plan.features?.apiAccess || false,
        prioritySupport: plan.features?.prioritySupport || false,
        customBranding: plan.features?.customBranding || false,
        whiteLabel: plan.features?.whiteLabel || false,
        advancedAnalytics: plan.features?.advancedAnalytics || false,
        dedicatedManager: plan.features?.dedicatedManager || false,
        bulkImport: plan.features?.bulkImport || false,
        customIntegrations: plan.features?.customIntegrations || false,
      },
    };
  }

  // ==================== HELPER METHODS ====================

  /**
   * Calculate period dates
   */
  calculatePeriodDates(startDate, billingCycle, isTrial = false, trialDays = 0) {
    const currentPeriodStart = new Date(startDate);
    let currentPeriodEnd;

    if (isTrial && trialDays > 0) {
      currentPeriodEnd = new Date(startDate);
      currentPeriodEnd.setDate(currentPeriodEnd.getDate() + trialDays);
    } else {
      currentPeriodEnd = this.calculatePeriodEnd(startDate, billingCycle);
    }

    return { currentPeriodStart, currentPeriodEnd };
  }

  /**
   * Calculate period end date
   */
  calculatePeriodEnd(startDate, billingCycle) {
    const endDate = new Date(startDate);

    switch (billingCycle) {
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'quarterly':
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case 'yearly':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      default:
        endDate.setMonth(endDate.getMonth() + 1);
    }

    return endDate;
  }

  /**
   * Calculate proration amount for upgrade
   */
  calculateProration(subscription, currentTier, newTier, effectiveDate) {
    const daysRemaining = Math.ceil(
      (subscription.currentPeriodEnd - effectiveDate) / (1000 * 60 * 60 * 24)
    );
    const daysInPeriod = Math.ceil(
      (subscription.currentPeriodEnd - subscription.currentPeriodStart) / (1000 * 60 * 60 * 24)
    );

    const unusedAmount = (subscription.price / daysInPeriod) * daysRemaining;
    const newTierProrated = (newTier.price / daysInPeriod) * daysRemaining;

    return Math.max(0, Math.round(newTierProrated - unusedAmount));
  }

  /**
   * Apply promo code
   */
  async applyPromoCode(code, amount) {
    // This would integrate with a promo code service
    // For now, return 0 discount
    return 0;
  }

  /**
   * Generate unique invoice number
   */
  async generateInvoiceNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const count = await BillingRecord.countDocuments({
      createdAt: {
        $gte: new Date(year, now.getMonth(), 1),
        $lt: new Date(year, now.getMonth() + 1, 1),
      },
    });
    const sequence = String(count + 1).padStart(4, '0');
    return `INV-${year}${month}-${sequence}`;
  }

  // ==================== CRON JOB HELPERS ====================

  /**
   * Process expired subscriptions
   * @returns {Promise<number>} Number of subscriptions processed
   */
  async processExpiredSubscriptions() {
    const expiredSubscriptions = await Subscription.find({
      status: { $in: ['active', 'trialing'] },
      currentPeriodEnd: { $lt: new Date() },
    });

    let processedCount = 0;

    for (const subscription of expiredSubscriptions) {
      if (subscription.autoRenew && !subscription.cancelAtPeriodEnd) {
        // Renew subscription
        await this.renewSubscription(subscription);
      } else {
        // Expire subscription
        subscription.status = 'expired';
        await subscription.save();

        // Update company subscription status
        if (subscription.companyId) {
          await Company.findByIdAndUpdate(subscription.companyId, {
            'currentSubscription.status': 'expired',
          });
        }
      }
      processedCount++;
    }

    return processedCount;
  }

  /**
   * Renew a subscription
   */
  async renewSubscription(subscription) {
    const now = new Date();
    const newPeriodEnd = this.calculatePeriodEnd(now, subscription.billingCycle);

    subscription.currentPeriodStart = subscription.currentPeriodEnd;
    subscription.currentPeriodEnd = newPeriodEnd;
    subscription.status = 'active';

    // Reset usage counters
    subscription.usage = {
      jobsPosted: 0,
      storageUsed: 0,
      apiCalls: 0,
    };

    await subscription.save();

    // Create billing record for renewal
    await BillingRecord.create({
      companyId: subscription.companyId,
      subscriptionId: subscription._id,
      invoiceNumber: await this.generateInvoiceNumber(),
      invoiceType: 'subscription',
      billingPeriodStart: subscription.currentPeriodStart,
      billingPeriodEnd: subscription.currentPeriodEnd,
      items: [
        {
          description: `Subscription Renewal - ${subscription.billingCycle}`,
          type: 'subscription',
          quantity: 1,
          unitPrice: subscription.price,
          amount: subscription.price,
        },
      ],
      subtotal: subscription.price,
      total: subscription.price,
      currency: subscription.currency,
      dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      status: 'pending',
    });

    return subscription;
  }

  /**
   * Get subscriptions expiring soon
   * @param {number} days - Days until expiration
   * @returns {Promise<Array>} Expiring subscriptions
   */
  async getExpiringSubscriptions(days = 7) {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + days);

    return await Subscription.find({
      status: { $in: ['active', 'trialing'] },
      currentPeriodEnd: { $lte: expirationDate, $gt: new Date() },
      autoRenew: true,
    }).populate('companyId', 'name email');
  }
}

// Export singleton instance
const subscriptionService = new SubscriptionService();
module.exports = SubscriptionService;
