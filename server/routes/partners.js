/**
 * Partner Routes
 * API endpoints for partner management
 */

const express = require('express');
const partnerService = require('../services/partnerService.js');
const whiteLabelService = require('../services/whiteLabelService.js');
const apiService = require('../services/apiService.js');
const { authenticate, requireAuth } = require('../middleware/auth.js');
const { partnerAuth } = require('../middleware/partnerAuth.js');

const router = express.Router();

/**
 * @route POST /api/partners/apply
 * @desc Apply to become a partner
 * @access Private
 */
router.post('/apply', requireAuth, async (req, res, next) => {
  try {
    const result = await partnerService.apply(req.user._id, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/partners/my-partnership
 * @desc Get current user's partner status
 * @access Private
 */
router.get('/my-partnership', requireAuth, async (req, res, next) => {
  try {
    const partner = await partnerService.getDashboard(req.user.partnerId);
    res.json(partner);
  } catch (error) {
    // If no partner found, return null
    if (error.message === 'Partner not found') {
      return res.json({ success: true, hasPartnership: false });
    }
    next(error);
  }
});

/**
 * @route GET /api/partners/dashboard
 * @desc Get partner dashboard data
 * @access Private (Partner only)
 */
router.get('/dashboard', requireAuth, partnerAuth, async (req, res, next) => {
  try {
    const result = await partnerService.getDashboard(req.partner.partnerId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/partners/referrals
 * @desc Get partner referral history
 * @access Private (Partner only)
 */
router.get('/referrals', requireAuth, partnerAuth, async (req, res, next) => {
  try {
    const result = await partnerService.getReferrals(
      req.partner.partnerId,
      req.query
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/partners/earnings
 * @desc Get partner earnings report
 * @access Private (Partner only)
 */
router.get('/earnings', requireAuth, partnerAuth, async (req, res, next) => {
  try {
    const result = await partnerService.getEarningsReport(
      req.partner.partnerId,
      req.query
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/partners/api-keys
 * @desc Get partner API keys
 * @access Private (Partner only)
 */
router.get('/api-keys', requireAuth, partnerAuth, async (req, res, next) => {
  try {
    const result = await apiService.getTokens(req.partner.partnerId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/partners/api-keys
 * @desc Generate new API key
 * @access Private (Partner only)
 */
router.post('/api-keys', requireAuth, partnerAuth, async (req, res, next) => {
  try {
    const result = await apiService.createToken(req.partner.partnerId, {
      ...req.body,
      userId: req.user._id,
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/partners/api-keys/:id
 * @desc Revoke API key
 * @access Private (Partner only)
 */
router.delete('/api-keys/:id', requireAuth, partnerAuth, async (req, res, next) => {
  try {
    const result = await apiService.revokeToken(
      req.partner.partnerId,
      req.params.id,
      req.user._id,
      req.body.reason || 'User requested'
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/partners/white-label
 * @desc Get white-label configuration
 * @access Private (Partner only)
 */
router.get('/white-label', requireAuth, partnerAuth, async (req, res, next) => {
  try {
    const result = await whiteLabelService.getConfig(req.partner.partnerId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/partners/white-label
 * @desc Create white-label configuration
 * @access Private (Partner only)
 */
router.post('/white-label', requireAuth, partnerAuth, async (req, res, next) => {
  try {
    const result = await whiteLabelService.createConfig(
      req.partner.partnerId,
      {
        ...req.body,
        userId: req.user._id,
      }
    );
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/partners/white-label
 * @desc Update white-label configuration
 * @access Private (Partner only)
 */
router.put('/white-label', requireAuth, partnerAuth, async (req, res, next) => {
  try {
    const result = await whiteLabelService.updateConfig(
      req.partner.partnerId,
      req.body
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/partners/white-label/deploy
 * @desc Deploy white-label configuration
 * @access Private (Partner only)
 */
router.post('/white-label/deploy', requireAuth, partnerAuth, async (req, res, next) => {
  try {
    const result = await whiteLabelService.deploy(
      req.partner.partnerId,
      req.user._id
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/partners/white-label/preview
 * @desc Get white-label preview
 * @access Private (Partner only)
 */
router.get('/white-label/preview', requireAuth, partnerAuth, async (req, res, next) => {
  try {
    const result = await whiteLabelService.preview(req.partner.partnerId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/partners/white-label/pages
 * @desc Add custom page
 * @access Private (Partner only)
 */
router.post('/white-label/pages', requireAuth, partnerAuth, async (req, res, next) => {
  try {
    const result = await whiteLabelService.addCustomPage(
      req.partner.partnerId,
      req.body
    );
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/partners/white-label/pages/:pageId
 * @desc Update custom page
 * @access Private (Partner only)
 */
router.put('/white-label/pages/:pageId', requireAuth, partnerAuth, async (req, res, next) => {
  try {
    const result = await whiteLabelService.updateCustomPage(
      req.partner.partnerId,
      req.params.pageId,
      req.body
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/partners/white-label/pages/:pageId
 * @desc Delete custom page
 * @access Private (Partner only)
 */
router.delete('/white-label/pages/:pageId', requireAuth, partnerAuth, async (req, res, next) => {
  try {
    const result = await whiteLabelService.deleteCustomPage(
      req.partner.partnerId,
      req.params.pageId
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/partners/white-label/domain
 * @desc Configure custom domain
 * @access Private (Partner only)
 */
router.post('/white-label/domain', requireAuth, partnerAuth, async (req, res, next) => {
  try {
    const result = await whiteLabelService.configureCustomDomain(
      req.partner.partnerId,
      req.body.domain
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/partners/white-label/domain/verify
 * @desc Verify custom domain
 * @access Private (Partner only)
 */
router.post('/white-label/domain/verify', requireAuth, partnerAuth, async (req, res, next) => {
  try {
    const result = await whiteLabelService.verifyDomain(req.partner.partnerId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/partners/white-label/features/:feature
 * @desc Toggle feature
 * @access Private (Partner only)
 */
router.put('/white-label/features/:feature', requireAuth, partnerAuth, async (req, res, next) => {
  try {
    const result = await whiteLabelService.toggleFeature(
      req.partner.partnerId,
      req.params.feature,
      req.body.enabled
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/partners/referrals
 * @desc Create referral tracking link
 * @access Private (Partner only)
 */
router.post('/referrals', requireAuth, partnerAuth, async (req, res, next) => {
  try {
    const result = await partnerService.createReferral(
      req.partner.partnerId,
      req.body
    );
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/partners/payouts
 * @desc Request payout
 * @access Private (Partner only)
 */
router.post('/payouts', requireAuth, partnerAuth, async (req, res, next) => {
  try {
    const result = await partnerService.processPayout(
      req.partner.partnerId,
      req.body
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/partners/profile
 * @desc Update partner profile
 * @access Private (Partner only)
 */
router.put('/profile', requireAuth, partnerAuth, async (req, res, next) => {
  try {
    const result = await partnerService.updateProfile(
      req.partner.partnerId,
      req.body
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/partners/programs
 * @desc Get partner programs/tiers
 * @access Public
 */
router.get('/programs', async (req, res, next) => {
  try {
    const result = await partnerService.getPartnerPrograms();
    res.json({ success: true, programs: result });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/partners/leaderboard
 * @desc Get partner leaderboard
 * @access Public
 */
router.get('/leaderboard', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const result = await partnerService.getLeaderboard(limit);
    res.json({ success: true, leaderboard: result });
  } catch (error) {
    next(error);
  }
});

// Admin routes

/**
 * @route GET /api/partners/admin/applications
 * @desc Get pending partner applications
 * @access Private (Admin only)
 */
router.get('/admin/applications', requireAuth, async (req, res, next) => {
  try {
    // Check admin role
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const Partner = (await import('../models/Partner.js')).default;
    const applications = await Partner.find({
      status: { $in: ['pending', 'under_review'] },
    }).sort({ createdAt: -1 });

    res.json({ success: true, applications });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/partners/admin/:partnerId/review
 * @desc Review partner application
 * @access Private (Admin only)
 */
router.post('/admin/:partnerId/review', requireAuth, async (req, res, next) => {
  try {
    // Check admin role
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { decision, ...reviewData } = req.body;
    const result = await partnerService.reviewApplication(
      req.params.partnerId,
      req.user._id,
      decision,
      reviewData
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/partners/admin/:partnerId/suspend
 * @desc Suspend partner account
 * @access Private (Admin only)
 */
router.post('/admin/:partnerId/suspend', requireAuth, async (req, res, next) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await partnerService.suspendPartner(
      req.params.partnerId,
      req.body.reason
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/partners/admin/:partnerId/reactivate
 * @desc Reactivate partner account
 * @access Private (Admin only)
 */
router.post('/admin/:partnerId/reactivate', requireAuth, async (req, res, next) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await partnerService.reactivatePartner(req.params.partnerId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
