/**
 * Referral Network Routes
 * API endpoints for viral referral system
 * Handles network management, invites, tiers, and leaderboard
 */

const express = require('express');
const { User, ReferralNetwork, TierBenefits } = require('../models/index.js');
const { authenticate, optionalAuth } = require('../middleware/auth.js');
const { asyncHandler, ValidationError, NotFoundError, AuthorizationError } = require('../middleware/errorHandler.js');
const { requireReferrer, requireAdmin } = require('../middleware/rbac.js');
const referralNetworkService = require('../services/referralNetworkService.js');

const router = express.Router();

/**
 * @route   GET /api/referrals/network
 * @desc    Get current user's network info and stats
 * @access  Private (Referrer)
 */
router.get('/network', authenticate, requireReferrer, asyncHandler(async (req, res) => {
  const networkInfo = await referralNetworkService.getNetworkInfo(req.user._id);
  
  res.json({
    success: true,
    data: networkInfo,
  });
}));

/**
 * @route   GET /api/referrals/network/tree
 * @desc    Get network tree for visualization
 * @access  Private (Referrer)
 */
router.get('/network/tree', authenticate, requireReferrer, asyncHandler(async (req, res) => {
  const { depth = 3 } = req.query;
  
  const tree = await referralNetworkService.getNetworkTree(
    req.user._id, 
    parseInt(depth)
  );
  
  res.json({
    success: true,
    data: { tree },
  });
}));

/**
 * @route   GET /api/referrals/network/children
 * @desc    Get direct children (downline) of current user
 * @access  Private (Referrer)
 */
router.get('/network/children', authenticate, requireReferrer, asyncHandler(async (req, res) => {
  const children = await ReferralNetwork.getDirectChildren(req.user._id);
  
  res.json({
    success: true,
    data: {
      children: children.map(child => ({
        id: child._id,
        name: child.name,
        email: child.email,
        avatar: child.avatar,
        tierLevel: child.referrerProfile?.tierLevel || 'bronze',
        networkSize: child.referrerProfile?.networkSize || 0,
        joinedAt: child.createdAt,
      })),
      count: children.length,
    },
  });
}));

/**
 * @route   GET /api/referrals/invite
 * @desc    Get invite link and sharing options
 * @access  Private (Referrer)
 */
router.get('/invite', authenticate, requireReferrer, asyncHandler(async (req, res) => {
  const baseUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
  
  const inviteData = await referralNetworkService.generateInviteLink(
    req.user._id,
    baseUrl
  );
  
  res.json({
    success: true,
    data: inviteData,
  });
}));

/**
 * @route   POST /api/referrals/invite/validate
 * @desc    Validate an invite code (public endpoint)
 * @access  Public
 */
router.post('/invite/validate', asyncHandler(async (req, res) => {
  const { inviteCode } = req.body;
  
  if (!inviteCode) {
    throw new ValidationError('Invite code is required');
  }
  
  const result = await referralNetworkService.validateInviteCode(inviteCode);
  
  res.json({
    success: true,
    data: result,
  });
}));

/**
 * @route   GET /api/referrals/tiers
 * @desc    Get all tiers with benefits
 * @access  Public
 */
router.get('/tiers', asyncHandler(async (req, res) => {
  const tiers = await referralNetworkService.getAllTiers();
  
  res.json({
    success: true,
    data: { tiers },
  });
}));

/**
 * @route   GET /api/referrals/tiers/my-tier
 * @desc    Get current user's tier info and progress
 * @access  Private (Referrer)
 */
router.get('/tiers/my-tier', authenticate, requireReferrer, asyncHandler(async (req, res) => {
  const tierInfo = await referralNetworkService.getTierInfo(req.user._id);
  
  res.json({
    success: true,
    data: tierInfo,
  });
}));

/**
 * @route   POST /api/referrals/tiers/check-upgrade
 * @desc    Check and update user's tier if eligible
 * @access  Private (Referrer)
 */
router.post('/tiers/check-upgrade', authenticate, requireReferrer, asyncHandler(async (req, res) => {
  const result = await referralNetworkService.checkAndUpdateTier(req.user._id);
  
  res.json({
    success: true,
    data: result,
  });
}));

/**
 * @route   GET /api/referrals/leaderboard
 * @desc    Get top referrers leaderboard
 * @access  Public
 */
router.get('/leaderboard', asyncHandler(async (req, res) => {
  const { sortBy = 'networkSize', limit = 20 } = req.query;
  
  const leaderboard = await referralNetworkService.getLeaderboard(
    sortBy,
    parseInt(limit)
  );
  
  // If user is authenticated, mark their position
  if (req.user && req.user.role === 'referrer') {
    const userEntry = leaderboard.find(entry => entry.id.toString() === req.user._id.toString());
    if (userEntry) {
      userEntry.isCurrentUser = true;
    }
  }
  
  res.json({
    success: true,
    data: {
      leaderboard,
      sortBy,
      total: leaderboard.length,
    },
  });
}));

/**
 * @route   GET /api/referrals/leaderboard/my-rank
 * @desc    Get current user's rank on leaderboard
 * @access  Private (Referrer)
 */
router.get('/leaderboard/my-rank', authenticate, requireReferrer, asyncHandler(async (req, res) => {
  const { sortBy = 'networkSize' } = req.query;
  
  const sortFieldMap = {
    networkSize: 'referrerProfile.networkSize',
    earnings: 'referrerProfile.totalEarnings',
    referrals: 'referrerProfile.successfulHires',
  };
  
  const sortField = sortFieldMap[sortBy] || sortFieldMap.networkSize;
  
  // Get user's value for sorting
  const user = await User.findById(req.user._id).select(sortField);
  const userValue = user?.referrerProfile?.[sortBy] || 0;
  
  // Count users with higher values
  const rank = await User.countDocuments({
    role: 'referrer',
    status: 'active',
    [sortField]: { $gt: userValue },
  });
  
  // Count users with same value (for tie handling)
  const sameValue = await User.countDocuments({
    role: 'referrer',
    status: 'active',
    [sortField]: userValue,
    _id: { $ne: req.user._id },
  });
  
  res.json({
    success: true,
    data: {
      rank: rank + 1,
      tiedWith: sameValue,
      value: userValue,
      sortBy,
    },
  });
}));

/**
 * @route   GET /api/referrals/stats
 * @desc    Get referral system-wide stats
 * @access  Public
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const stats = await Promise.all([
    // Total referrers
    User.countDocuments({ role: 'referrer', status: 'active' }),
    
    // Total network size (sum of all direct referrals)
    User.aggregate([
      { $match: { role: 'referrer', status: 'active' } },
      { $group: { _id: null, total: { $sum: '$referrerProfile.directReferrals' } } },
    ]),
    
    // Total earnings paid
    User.aggregate([
      { $match: { role: 'referrer' } },
      { $group: { _id: null, total: { $sum: '$referrerProfile.totalEarnings' } } },
    ]),
    
    // Tier distribution
    User.aggregate([
      { $match: { role: 'referrer', status: 'active' } },
      { $group: { _id: '$referrerProfile.tierLevel', count: { $sum: 1 } } },
    ]),
  ]);
  
  res.json({
    success: true,
    data: {
      totalReferrers: stats[0],
      totalNetworkSize: stats[1][0]?.total || 0,
      totalEarnings: stats[2][0]?.total || 0,
      tierDistribution: stats[3].reduce((acc, item) => {
        acc[item._id || 'bronze'] = item.count;
        return acc;
      }, {}),
    },
  });
}));

// ==================== ADMIN ROUTES ====================

/**
 * @route   POST /api/referrals/admin/initialize-tiers
 * @desc    Initialize default tier benefits (admin only)
 * @access  Private (Admin)
 */
router.post('/admin/initialize-tiers', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  await referralNetworkService.initializeTiers();
  
  res.json({
    success: true,
    message: 'Tier benefits initialized successfully',
  });
}));

/**
 * @route   PUT /api/referrals/admin/tiers/:tier
 * @desc    Update tier configuration (admin only)
 * @access  Private (Admin)
 */
router.put('/admin/tiers/:tier', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { tier } = req.params;
  const updateData = req.body;
  
  const updatedTier = await TierBenefits.findOneAndUpdate(
    { tier: tier.toLowerCase() },
    { $set: updateData },
    { new: true, runValidators: true }
  );
  
  if (!updatedTier) {
    throw new NotFoundError('Tier');
  }
  
  res.json({
    success: true,
    data: { tier: updatedTier },
  });
}));

/**
 * @route   GET /api/referrals/admin/network/:userId
 * @desc    Get network info for any user (admin only)
 * @access  Private (Admin)
 */
router.get('/admin/network/:userId', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  const networkInfo = await referralNetworkService.getNetworkInfo(userId);
  
  res.json({
    success: true,
    data: networkInfo,
  });
}));

/**
 * @route   POST /api/referrals/admin/recalculate-tiers
 * @desc    Recalculate tiers for all referrers (admin only)
 * @access  Private (Admin)
 */
router.post('/admin/recalculate-tiers', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const referrers = await User.find({ role: 'referrer', status: 'active' });
  
  const results = {
    processed: 0,
    upgraded: 0,
    errors: [],
  };
  
  for (const referrer of referrers) {
    try {
      const result = await referralNetworkService.checkAndUpdateTier(referrer._id);
      results.processed++;
      if (result.upgraded) {
        results.upgraded++;
      }
    } catch (error) {
      results.errors.push({
        userId: referrer._id,
        error: error.message,
      });
    }
  }
  
  res.json({
    success: true,
    data: results,
  });
}));

module.exports = router;
