/**
 * Affiliate Routes
 * API endpoints for affiliate marketing
 */

const express = require('express');
const affiliateService = require('../services/affiliateService.js');
const partnerService = require('../services/partnerService.js');
const { requireAuth } = require('../middleware/auth.js');
const { partnerAuth } = require('../middleware/partnerAuth.js');

const router = express.Router();

/**
 * @route GET /api/affiliates/links
 * @desc Get affiliate links
 * @access Private (Partner only)
 */
router.get('/links', requireAuth, partnerAuth, async (req, res, next) => {
  try {
    const result = await affiliateService.getLinks(
      req.partner.partnerId,
      req.query
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/affiliates/links
 * @desc Create affiliate link
 * @access Private (Partner only)
 */
router.post('/links', requireAuth, partnerAuth, async (req, res, next) => {
  try {
    const result = await affiliateService.createLink(
      req.partner.partnerId,
      req.body
    );
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/affiliates/links/:id
 * @desc Get specific affiliate link
 * @access Private (Partner only)
 */
router.get('/links/:id', requireAuth, partnerAuth, async (req, res, next) => {
  try {
    const PartnerReferral = (await import('../models/PartnerReferral.js')).default;
    const link = await PartnerReferral.findOne({
      referralId: req.params.id,
      partnerId: req.partner._id,
    });

    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }

    res.json({ success: true, link });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/affiliates/stats
 * @desc Get affiliate statistics
 * @access Private (Partner only)
 */
router.get('/stats', requireAuth, partnerAuth, async (req, res, next) => {
  try {
    const result = await affiliateService.getStats(
      req.partner.partnerId,
      req.query
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/affiliates/conversions
 * @desc Get conversion history
 * @access Private (Partner only)
 */
router.get('/conversions', requireAuth, partnerAuth, async (req, res, next) => {
  try {
    const result = await affiliateService.getConversions(
      req.partner.partnerId,
      req.query
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/affiliates/commission
 * @desc Get commission report
 * @access Private (Partner only)
 */
router.get('/commission', requireAuth, partnerAuth, async (req, res, next) => {
  try {
    const result = await affiliateService.getCommissionReport(
      req.partner.partnerId,
      req.query
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/affiliates/marketing-materials
 * @desc Get marketing materials
 * @access Private (Partner only)
 */
router.get('/marketing-materials', requireAuth, partnerAuth, async (req, res, next) => {
  try {
    const result = await affiliateService.getMarketingMaterials(
      req.partner.partnerId
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/affiliates/track-click
 * @desc Track affiliate link click (Public endpoint)
 * @access Public
 */
router.post('/track-click', async (req, res, next) => {
  try {
    const { trackingCode } = req.body;
    const clickData = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      device: req.body.device,
      source: req.body.source,
    };

    const result = await affiliateService.trackClick(trackingCode, clickData);
    
    if (result.success && result.cookieData) {
      // Set attribution cookie
      res.cookie('trm_affiliate', JSON.stringify(result.cookieData), {
        maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/affiliates/track-conversion
 * @desc Track conversion (Internal use)
 * @access Private
 */
router.post('/track-conversion', requireAuth, async (req, res, next) => {
  try {
    const { trackingCode, value, referredDetails } = req.body;
    
    const result = await affiliateService.trackConversion(trackingCode, {
      value,
      referredDetails,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/affiliates/cookie/validate
 * @desc Validate affiliate cookie
 * @access Public
 */
router.get('/cookie/validate', async (req, res, next) => {
  try {
    const cookieData = req.cookies?.trm_affiliate;
    
    if (!cookieData) {
      return res.json({ valid: false, reason: 'no_cookie' });
    }

    const parsed = JSON.parse(cookieData);
    const result = await affiliateService.validateCookie(parsed.cookieId || parsed.trackingCode);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/affiliates/multi-level
 * @desc Create multi-level affiliate link
 * @access Private (Partner only)
 */
router.post('/multi-level', requireAuth, partnerAuth, async (req, res, next) => {
  try {
    const { parentReferralId, ...linkData } = req.body;
    const result = await affiliateService.createMultiLevelLink(
      req.partner.partnerId,
      parentReferralId,
      linkData
    );
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/affiliates/dashboard
 * @desc Get affiliate dashboard summary
 * @access Private (Partner only)
 */
router.get('/dashboard', requireAuth, partnerAuth, async (req, res, next) => {
  try {
    const [stats, recentConversions, links] = await Promise.all([
      affiliateService.getStats(req.partner.partnerId, { days: 30 }),
      affiliateService.getConversions(req.partner.partnerId, { limit: 5 }),
      affiliateService.getLinks(req.partner.partnerId, { limit: 5 }),
    ]);

    res.json({
      success: true,
      summary: {
        totalClicks: stats.summary?.totalClicks || 0,
        totalConversions: stats.summary?.converted || 0,
        conversionRate: stats.summary?.conversionRate || 0,
        totalCommission: stats.summary?.totalCommission || 0,
        pendingCommission: stats.summary?.pendingCommission || 0,
      },
      recentConversions: recentConversions.conversions || [],
      recentLinks: links.links || [],
      dailyStats: stats.dailyStats || [],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/affiliates/performance
 * @desc Get performance metrics
 * @access Private (Partner only)
 */
router.get('/performance', requireAuth, partnerAuth, async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const PartnerReferral = (await import('../models/PartnerReferral.js')).default;
    
    // Aggregate performance data
    const performance = await PartnerReferral.aggregate([
      {
        $match: {
          partnerId: req.partner._id,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          totalReferrals: { $sum: 1 },
          totalClicks: { $sum: '$clickCount' },
          conversions: {
            $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] },
          },
          totalCommission: { $sum: '$commissionAmount' },
          avgTimeToConversion: {
            $avg: {
              $cond: [
                { $eq: ['$status', 'converted'] },
                { $subtract: ['$convertedAt', '$createdAt'] },
                null,
              ],
            },
          },
        },
      },
    ]);

    // Top performing campaigns
    const topCampaigns = await PartnerReferral.aggregate([
      {
        $match: {
          partnerId: req.partner._id,
          createdAt: { $gte: startDate },
          campaignId: { $exists: true },
        },
      },
      {
        $group: {
          _id: '$campaignId',
          campaignName: { $first: '$campaignName' },
          clicks: { $sum: '$clickCount' },
          conversions: {
            $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] },
          },
          commission: { $sum: '$commissionAmount' },
        },
      },
      { $sort: { commission: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      success: true,
      performance: performance[0] || {
        totalReferrals: 0,
        totalClicks: 0,
        conversions: 0,
        totalCommission: 0,
        avgTimeToConversion: 0,
      },
      topCampaigns,
      period: { days, startDate },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
