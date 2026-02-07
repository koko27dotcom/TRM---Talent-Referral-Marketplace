/**
 * Gamification Routes
 * API endpoints for gamification features
 */

const express = require('express');
const { authenticate } = require('../middleware/auth.js');
const { requireRole } = require('../middleware/rbac.js');
const gamificationService = require('../services/gamificationService.js');
const badgeService = require('../services/badgeService.js');
const achievementService = require('../services/achievementService.js');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route GET /api/gamification/profile
 * @desc Get user's gamification profile
 * @access Private
 */
router.get('/profile', async (req, res) => {
  try {
    const profile = await gamificationService.getProfile(req.user._id);
    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error('Error getting gamification profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get gamification profile',
    });
  }
});

/**
 * @route GET /api/gamification/points-history
 * @desc Get user's points transaction history
 * @access Private
 */
router.get('/points-history', async (req, res) => {
  try {
    const { limit = 50, skip = 0, startDate, endDate } = req.query;
    
    const history = await gamificationService.getPointsHistory(req.user._id, {
      limit: parseInt(limit),
      skip: parseInt(skip),
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    });
    
    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error('Error getting points history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get points history',
    });
  }
});

/**
 * @route GET /api/gamification/badges
 * @desc Get all available badges
 * @access Private
 */
router.get('/badges', async (req, res) => {
  try {
    const { category, rarity } = req.query;
    
    const badges = await badgeService.getAllBadges({
      category,
      rarity,
    });
    
    res.json({
      success: true,
      data: badges,
    });
  } catch (error) {
    console.error('Error getting badges:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get badges',
    });
  }
});

/**
 * @route GET /api/gamification/my-badges
 * @desc Get user's earned badges
 * @access Private
 */
router.get('/my-badges', async (req, res) => {
  try {
    const badges = await badgeService.getUserBadges(req.user._id);
    
    res.json({
      success: true,
      data: badges,
    });
  } catch (error) {
    console.error('Error getting user badges:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user badges',
    });
  }
});

/**
 * @route GET /api/gamification/badge-collection
 * @desc Get user's complete badge collection (earned + available)
 * @access Private
 */
router.get('/badge-collection', async (req, res) => {
  try {
    const collection = await badgeService.getUserBadgeCollection(req.user._id);
    
    res.json({
      success: true,
      data: collection,
    });
  } catch (error) {
    console.error('Error getting badge collection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get badge collection',
    });
  }
});

/**
 * @route POST /api/gamification/badges/:badgeId/view
 * @desc Mark a badge as viewed
 * @access Private
 */
router.post('/badges/:badgeId/view', async (req, res) => {
  try {
    const { badgeId } = req.params;
    
    const result = await badgeService.markBadgeViewed(req.user._id, badgeId);
    
    res.json({
      success: result,
      message: result ? 'Badge marked as viewed' : 'Badge not found',
    });
  } catch (error) {
    console.error('Error marking badge viewed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark badge as viewed',
    });
  }
});

/**
 * @route GET /api/gamification/achievements
 * @desc Get all achievements
 * @access Private
 */
router.get('/achievements', async (req, res) => {
  try {
    const { category } = req.query;
    
    const achievements = await achievementService.getAllAchievements({
      category,
    });
    
    res.json({
      success: true,
      data: achievements,
    });
  } catch (error) {
    console.error('Error getting achievements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get achievements',
    });
  }
});

/**
 * @route GET /api/gamification/my-achievements
 * @desc Get user's achievements
 * @access Private
 */
router.get('/my-achievements', async (req, res) => {
  try {
    const achievements = await achievementService.getUserAchievements(req.user._id);
    
    res.json({
      success: true,
      data: achievements,
    });
  } catch (error) {
    console.error('Error getting user achievements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user achievements',
    });
  }
});

/**
 * @route POST /api/gamification/claim-lootbox
 * @desc Claim a milestone reward (loot box)
 * @access Private
 */
router.post('/claim-lootbox', async (req, res) => {
  try {
    const result = await gamificationService.openLootBox(req.user._id);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error claiming loot box:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to claim loot box',
    });
  }
});

/**
 * @route GET /api/gamification/levels
 * @desc Get level requirements
 * @access Private
 */
router.get('/levels', async (req, res) => {
  try {
    const levels = gamificationService.getLevelRequirements();
    
    res.json({
      success: true,
      data: levels,
    });
  } catch (error) {
    console.error('Error getting level requirements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get level requirements',
    });
  }
});

/**
 * @route GET /api/gamification/stats
 * @desc Get user gamification stats
 * @access Private
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await gamificationService.getUserStats(req.user._id);
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user stats',
    });
  }
});

/**
 * @route GET /api/gamification/activity
 * @desc Get user activity feed
 * @access Private
 */
router.get('/activity', async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;
    
    const UserActivity = (await import('../models/UserActivity.js')).default;
    const activity = await UserActivity.getUserFeed(req.user._id, {
      limit: parseInt(limit),
      skip: parseInt(skip),
    });
    
    res.json({
      success: true,
      data: activity,
    });
  } catch (error) {
    console.error('Error getting activity feed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get activity feed',
    });
  }
});

/**
 * @route GET /api/gamification/heatmap
 * @desc Get user activity heatmap data
 * @access Private
 */
router.get('/heatmap', async (req, res) => {
  try {
    const { days = 365 } = req.query;
    
    const UserActivity = (await import('../models/UserActivity.js')).default;
    const heatmap = await UserActivity.getHeatmapData(
      req.user._id,
      parseInt(days)
    );
    
    res.json({
      success: true,
      data: heatmap,
    });
  } catch (error) {
    console.error('Error getting heatmap data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get heatmap data',
    });
  }
});

/**
 * @route GET /api/gamification/streak
 * @desc Get user's streak data
 * @access Private
 */
router.get('/streak', async (req, res) => {
  try {
    const UserActivity = (await import('../models/UserActivity.js')).default;
    const streakData = await UserActivity.getStreakData(
      req.user._id,
      'login',
      365
    );
    
    res.json({
      success: true,
      data: streakData,
    });
  } catch (error) {
    console.error('Error getting streak data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get streak data',
    });
  }
});

// Admin routes

/**
 * @route POST /api/gamification/award-points
 * @desc Award points to a user (admin only)
 * @access Admin
 */
router.post('/award-points', requireRole('admin'), async (req, res) => {
  try {
    const { userId, points, reason } = req.body;
    
    if (!userId || !points || points <= 0) {
      return res.status(400).json({
        success: false,
        message: 'User ID and positive points value required',
      });
    }
    
    const result = await gamificationService.adminAwardPoints(
      userId,
      parseInt(points),
      reason,
      req.user._id
    );
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error awarding points:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to award points',
    });
  }
});

/**
 * @route POST /api/gamification/initialize
 * @desc Initialize gamification system (admin only)
 * @access Admin
 */
router.post('/initialize', requireRole('admin'), async (req, res) => {
  try {
    // Initialize badges
    const badgeCount = await badgeService.initializeBadges();
    
    // Initialize achievements
    const achievementCount = await achievementService.initializeAchievements();
    
    res.json({
      success: true,
      data: {
        badgesInitialized: badgeCount,
        achievementsInitialized: achievementCount,
      },
    });
  } catch (error) {
    console.error('Error initializing gamification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize gamification',
    });
  }
});

/**
 * @route GET /api/gamification/admin/stats
 * @desc Get gamification system statistics (admin only)
 * @access Admin
 */
router.get('/admin/stats', requireRole('admin'), async (req, res) => {
  try {
    const GamificationProfile = (await import('../models/GamificationProfile.js')).default;
    
    // Get overall stats
    const totalProfiles = await GamificationProfile.countDocuments();
    const totalPoints = await GamificationProfile.aggregate([
      { $group: { _id: null, total: { $sum: '$totalPoints' } } },
    ]);
    
    const tierDistribution = await GamificationProfile.aggregate([
      { $group: { _id: '$tier', count: { $sum: 1 } } },
    ]);
    
    const levelDistribution = await GamificationProfile.aggregate([
      { $group: { _id: '$currentLevel', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $limit: 25 },
    ]);
    
    res.json({
      success: true,
      data: {
        totalProfiles,
        totalPoints: totalPoints[0]?.total || 0,
        tierDistribution,
        levelDistribution,
      },
    });
  } catch (error) {
    console.error('Error getting admin stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get admin stats',
    });
  }
});

module.exports = router;
