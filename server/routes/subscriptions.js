/**
 * Subscription Routes
 * API routes for managing subscriptions, tiers, and features
 */

const express = require('express');
const { authenticate } = require('../middleware/auth.js');
const { requireRole } = require('../middleware/rbac.js');
const { subscriptionService } = require('../services/subscriptionService.js');
const { featureGateService } = require('../services/featureGateService.js');
const { paymentGatewayService } = require('../services/paymentGatewayService.js');
const { Subscription, SubscriptionPlan, TierBenefits } = require('../models/index.js');

const router = express.Router();

// ==================== TIER ROUTES ====================

/**
 * @route GET /api/subscriptions/tiers
 * @desc Get all available subscription tiers
 * @access Public
 */
router.get('/tiers', async (req, res) => {
  try {
    const { type = 'company' } = req.query;

    const tiers = await subscriptionService.getAvailableTiers(type);

    res.json({
      success: true,
      data: tiers,
    });
  } catch (error) {
    console.error('Get Tiers Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription tiers',
    });
  }
});

/**
 * @route GET /api/subscriptions/tiers/:tierId
 * @desc Get tier details
 * @access Public
 */
router.get('/tiers/:tierId', async (req, res) => {
  try {
    const { tierId } = req.params;
    const { type = 'company' } = req.query;

    const tier = await subscriptionService.getTierDetails(tierId, type);

    if (!tier) {
      return res.status(404).json({
        success: false,
        error: 'Tier not found',
      });
    }

    res.json({
      success: true,
      data: tier,
    });
  } catch (error) {
    console.error('Get Tier Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tier details',
    });
  }
});

// ==================== SUBSCRIPTION ROUTES ====================

/**
 * @route GET /api/subscriptions/my-subscription
 * @desc Get current user's subscription
 * @access Private
 */
router.get('/my-subscription', authenticate, async (req, res) => {
  try {
    const subscriberId = req.user.companyId || req.user._id;
    const subscriberType = req.user.companyId ? 'company' : 'user';

    const subscription = await subscriptionService.getCurrentSubscription(
      subscriberId,
      subscriberType
    );

    if (!subscription) {
      return res.json({
        success: true,
        data: null,
        message: 'No active subscription found',
      });
    }

    res.json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    console.error('Get Subscription Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription',
    });
  }
});

/**
 * @route POST /api/subscriptions/subscribe
 * @desc Create a new subscription
 * @access Private
 */
router.post('/subscribe', authenticate, async (req, res) => {
  try {
    const {
      tierId,
      billingCycle = 'monthly',
      paymentMethod,
      isTrial = false,
      promoCode,
    } = req.body;

    const subscriberId = req.user.companyId || req.user._id;
    const subscriberType = req.user.companyId ? 'company' : 'user';

    // Check if already has active subscription
    const existingSub = await subscriptionService.getCurrentSubscription(
      subscriberId,
      subscriberType
    );

    if (existingSub) {
      return res.status(400).json({
        success: false,
        error: 'Already has an active subscription. Use upgrade instead.',
      });
    }

    const result = await subscriptionService.createSubscription({
      subscriberId,
      subscriberType,
      tierId,
      billingCycle,
      paymentMethod,
      isTrial,
      promoCode,
    });

    res.json({
      success: true,
      data: result,
      message: 'Subscription created successfully',
    });
  } catch (error) {
    console.error('Create Subscription Error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create subscription',
    });
  }
});

/**
 * @route PUT /api/subscriptions/upgrade
 * @desc Upgrade subscription to higher tier
 * @access Private
 */
router.put('/upgrade', authenticate, async (req, res) => {
  try {
    const { newTierId } = req.body;
    const subscriberId = req.user.companyId || req.user._id;
    const subscriberType = req.user.companyId ? 'company' : 'user';

    const subscription = await subscriptionService.getCurrentSubscription(
      subscriberId,
      subscriberType
    );

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No active subscription found',
      });
    }

    const result = await subscriptionService.upgradeSubscription(
      subscription._id,
      newTierId
    );

    res.json({
      success: true,
      data: result,
      message: 'Subscription upgraded successfully',
    });
  } catch (error) {
    console.error('Upgrade Subscription Error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to upgrade subscription',
    });
  }
});

/**
 * @route PUT /api/subscriptions/downgrade
 * @desc Downgrade subscription to lower tier
 * @access Private
 */
router.put('/downgrade', authenticate, async (req, res) => {
  try {
    const { newTierId } = req.body;
    const subscriberId = req.user.companyId || req.user._id;
    const subscriberType = req.user.companyId ? 'company' : 'user';

    const subscription = await subscriptionService.getCurrentSubscription(
      subscriberId,
      subscriberType
    );

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No active subscription found',
      });
    }

    const result = await subscriptionService.downgradeSubscription(
      subscription._id,
      newTierId
    );

    res.json({
      success: true,
      data: result,
      message: 'Subscription downgrade scheduled',
    });
  } catch (error) {
    console.error('Downgrade Subscription Error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to downgrade subscription',
    });
  }
});

/**
 * @route PUT /api/subscriptions/cancel
 * @desc Cancel subscription
 * @access Private
 */
router.put('/cancel', authenticate, async (req, res) => {
  try {
    const { reason, atPeriodEnd = true } = req.body;
    const subscriberId = req.user.companyId || req.user._id;
    const subscriberType = req.user.companyId ? 'company' : 'user';

    const subscription = await subscriptionService.getCurrentSubscription(
      subscriberId,
      subscriberType
    );

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No active subscription found',
      });
    }

    const result = await subscriptionService.cancelSubscription(subscription._id, {
      reason,
      atPeriodEnd,
    });

    res.json({
      success: true,
      data: result,
      message: 'Subscription cancelled successfully',
    });
  } catch (error) {
    console.error('Cancel Subscription Error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to cancel subscription',
    });
  }
});

/**
 * @route PUT /api/subscriptions/resume
 * @desc Resume cancelled subscription
 * @access Private
 */
router.put('/resume', authenticate, async (req, res) => {
  try {
    const subscriberId = req.user.companyId || req.user._id;
    const subscriberType = req.user.companyId ? 'company' : 'user';

    const subscription = await subscriptionService.getCurrentSubscription(
      subscriberId,
      subscriberType
    );

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No subscription found',
      });
    }

    const result = await subscriptionService.reactivateSubscription(subscription._id);

    res.json({
      success: true,
      data: result,
      message: 'Subscription resumed successfully',
    });
  } catch (error) {
    console.error('Resume Subscription Error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to resume subscription',
    });
  }
});

/**
 * @route POST /api/subscriptions/change-cycle
 * @desc Change billing cycle (monthly/yearly)
 * @access Private
 */
router.post('/change-cycle', authenticate, async (req, res) => {
  try {
    const { billingCycle } = req.body;
    const subscriberId = req.user.companyId || req.user._id;
    const subscriberType = req.user.companyId ? 'company' : 'user';

    const subscription = await subscriptionService.getCurrentSubscription(
      subscriberId,
      subscriberType
    );

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No active subscription found',
      });
    }

    const result = await subscriptionService.changeBillingCycle(
      subscription._id,
      billingCycle
    );

    res.json({
      success: true,
      data: result,
      message: 'Billing cycle changed successfully',
    });
  } catch (error) {
    console.error('Change Cycle Error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to change billing cycle',
    });
  }
});

// ==================== FEATURE ROUTES ====================

/**
 * @route GET /api/subscriptions/features
 * @desc Get available features for current subscription
 * @access Private
 */
router.get('/features', authenticate, async (req, res) => {
  try {
    const subscriberId = req.user.companyId || req.user._id;
    const subscriberType = req.user.companyId ? 'company' : 'referrer';

    const features = await featureGateService.getAllFeatures(
      subscriberId,
      subscriberType
    );

    res.json({
      success: true,
      data: features,
    });
  } catch (error) {
    console.error('Get Features Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch features',
    });
  }
});

/**
 * @route GET /api/subscriptions/features/:featureKey
 * @desc Check access to specific feature
 * @access Private
 */
router.get('/features/:featureKey', authenticate, async (req, res) => {
  try {
    const { featureKey } = req.params;
    const subscriberId = req.user.companyId || req.user._id;
    const subscriberType = req.user.companyId ? 'company' : 'referrer';

    const access = await featureGateService.checkFeatureAccess(
      subscriberId,
      subscriberType,
      featureKey
    );

    res.json({
      success: true,
      data: access,
    });
  } catch (error) {
    console.error('Check Feature Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check feature access',
    });
  }
});

/**
 * @route GET /api/subscriptions/limits
 * @desc Get current usage limits
 * @access Private
 */
router.get('/limits', authenticate, async (req, res) => {
  try {
    const subscriberId = req.user.companyId || req.user._id;
    const subscriberType = req.user.companyId ? 'company' : 'referrer';

    const limits = await featureGateService.getLimits(subscriberId, subscriberType);

    res.json({
      success: true,
      data: limits,
    });
  } catch (error) {
    console.error('Get Limits Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch limits',
    });
  }
});

/**
 * @route GET /api/subscriptions/upgrade-suggestions
 * @desc Get upgrade suggestions based on current usage
 * @access Private
 */
router.get('/upgrade-suggestions', authenticate, async (req, res) => {
  try {
    const subscriberId = req.user.companyId || req.user._id;
    const subscriberType = req.user.companyId ? 'company' : 'referrer';

    const suggestions = await featureGateService.getUpgradeSuggestions(
      subscriberId,
      subscriberType
    );

    res.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    console.error('Get Suggestions Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch upgrade suggestions',
    });
  }
});

// ==================== PAYMENT METHOD ROUTES ====================

/**
 * @route GET /api/subscriptions/payment-methods
 * @desc Get available payment methods for user's region
 * @access Private
 */
router.get('/payment-methods', authenticate, async (req, res) => {
  try {
    const countryCode = req.user.country || 'MM';
    const methods = paymentGatewayService.getAvailablePaymentMethods(countryCode);

    res.json({
      success: true,
      data: methods,
    });
  } catch (error) {
    console.error('Get Payment Methods Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment methods',
    });
  }
});

/**
 * @route POST /api/subscriptions/preview-upgrade
 * @desc Preview upgrade cost before committing
 * @access Private
 */
router.post('/preview-upgrade', authenticate, async (req, res) => {
  try {
    const { newTierId } = req.body;
    const subscriberId = req.user.companyId || req.user._id;
    const subscriberType = req.user.companyId ? 'company' : 'user';

    const subscription = await subscriptionService.getCurrentSubscription(
      subscriberId,
      subscriberType
    );

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No active subscription found',
      });
    }

    const currentTier = await SubscriptionPlan.findById(subscription.planId);
    const newTier = await SubscriptionPlan.findById(newTierId);

    if (!newTier) {
      return res.status(404).json({
        success: false,
        error: 'New tier not found',
      });
    }

    // Calculate proration
    const now = new Date();
    const prorationAmount = subscriptionService.calculateProration(
      subscription,
      currentTier,
      newTier,
      now
    );

    res.json({
      success: true,
      data: {
        currentTier: {
          name: currentTier.name,
          price: currentTier.price,
        },
        newTier: {
          name: newTier.name,
          price: newTier.price,
        },
        prorationAmount,
        effectiveDate: now,
        nextBillingDate: subscription.currentPeriodEnd,
      },
    });
  } catch (error) {
    console.error('Preview Upgrade Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to preview upgrade',
    });
  }
});

// ==================== ADMIN ROUTES ====================

/**
 * @route GET /api/subscriptions/admin/all
 * @desc Get all subscriptions (admin only)
 * @access Admin
 */
router.get('/admin/all', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;

    const query = {};
    if (status) query.status = status;

    const subscriptions = await Subscription.find(query)
      .populate('companyId', 'name email')
      .populate('userId', 'name email')
      .populate('planId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Subscription.countDocuments(query);

    res.json({
      success: true,
      data: subscriptions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get All Subscriptions Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscriptions',
    });
  }
});

/**
 * @route POST /api/subscriptions/admin/tiers
 * @desc Create new subscription tier (admin only)
 * @access Admin
 */
router.post('/admin/tiers', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const tierData = req.body;

    const tier = await SubscriptionPlan.create(tierData);

    res.json({
      success: true,
      data: tier,
      message: 'Tier created successfully',
    });
  } catch (error) {
    console.error('Create Tier Error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create tier',
    });
  }
});

/**
 * @route PUT /api/subscriptions/admin/tiers/:tierId
 * @desc Update subscription tier (admin only)
 * @access Admin
 */
router.put('/admin/tiers/:tierId', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { tierId } = req.params;
    const updateData = req.body;

    const tier = await SubscriptionPlan.findByIdAndUpdate(
      tierId,
      updateData,
      { new: true }
    );

    if (!tier) {
      return res.status(404).json({
        success: false,
        error: 'Tier not found',
      });
    }

    res.json({
      success: true,
      data: tier,
      message: 'Tier updated successfully',
    });
  } catch (error) {
    console.error('Update Tier Error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update tier',
    });
  }
});

module.exports = router;
