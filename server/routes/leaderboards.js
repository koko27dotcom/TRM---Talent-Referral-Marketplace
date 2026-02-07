/**
 * Leaderboard Routes
 * API endpoints for leaderboard features
 */

const express = require('express');
const { authenticate } = require('../middleware/auth.js');
const { requireRole } = require('../middleware/rbac.js');
const leaderboardService = require('../services/leaderboardService.js');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route GET /api/leaderboards/:period/:category
 * @desc Get leaderboard for a period and category
 * @access Private
 */
router.get('/:period/:category', async (req, res) => {
  try {
    const { period, category } = req.params;
    const { limit = 100, skip = 0 } = req.query;
    
    const leaderboard = await leaderboardService.getLeaderboard(
      period,
      category,
      {
        limit: parseInt(limit),
        skip: parseInt(skip),
      }
    );
    
    res.json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get leaderboard',
    });
  }
});

/**
 * @route GET /api/leaderboards/top
 * @desc Get top performers across all categories
 * @access Private
 */
router.get('/top', async (req, res) => {
  try {
    const { period = 'all-time', top = 10 } = req.query;
    
    const categories = ['referrer', 'hiring', 'network', 'earnings'];
    const topPerformers = {};
    
    for (const category of categories) {
      topPerformers[category] = await leaderboardService.getTopPerformers(
        period,
        category,
        parseInt(top)
      );
    }
    
    res.json({
      success: true,
      data: topPerformers,
    });
  } catch (error) {
    console.error('Error getting top performers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get top performers',
    });
  }
});

/**
 * @route GET /api/leaderboards/my-rank
 * @desc Get user's current rank across all categories
 * @access Private
 */
router.get('/my-rank', async (req, res) => {
  try {
    const { period = 'all-time' } = req.query;
    
    const categories = ['referrer', 'hiring', 'network', 'earnings', 'streak'];
    const ranks = {};
    
    for (const category of categories) {
      ranks[category] = await leaderboardService.getUserRank(
        req.user._id,
        period,
        category
      );
    }
    
    res.json({
      success: true,
      data: ranks,
    });
  } catch (error) {
    console.error('Error getting user rank:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user rank',
    });
  }
});

/**
 * @route GET /api/leaderboards/my-rank/:period/:category
 * @desc Get user's rank context for a specific leaderboard
 * @access Private
 */
router.get('/my-rank/:period/:category', async (req, res) => {
  try {
    const { period, category } = req.params;
    const { context = 2 } = req.query;
    
    const rankContext = await leaderboardService.getUserRankContext(
      req.user._id,
      period,
      category,
      parseInt(context)
    );
    
    res.json({
      success: true,
      data: rankContext,
    });
  } catch (error) {
    console.error('Error getting user rank context:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user rank context',
    });
  }
});

/**
 * @route POST /api/leaderboards/claim-reward
 * @desc Claim leaderboard rewards
 * @access Private
 */
router.post('/claim-reward', async (req, res) => {
  try {
    const { period, category } = req.body;
    
    if (!period || !category) {
      return res.status(400).json({
        success: false,
        message: 'Period and category are required',
      });
    }
    
    const result = await leaderboardService.claimRewards(
      req.user._id,
      period,
      category
    );
    
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
    console.error('Error claiming leaderboard rewards:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to claim rewards',
    });
  }
});

/**
 * @route GET /api/leaderboards/summary
 * @desc Get summary of all leaderboards
 * @access Private
 */
router.get('/summary', async (req, res) => {
  try {
    const summary = await leaderboardService.getAllLeaderboardsSummary(
      req.user._id
    );
    
    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Error getting leaderboards summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get leaderboards summary',
    });
  }
});

// Admin routes

/**
 * @route POST /api/leaderboards/update
 * @desc Update leaderboard rankings (admin only)
 * @access Admin
 */
router.post('/update', requireRole('admin'), async (req, res) => {
  try {
    const { period, category } = req.body;
    
    if (!period || !category) {
      return res.status(400).json({
        success: false,
        message: 'Period and category are required',
      });
    }
    
    const result = await leaderboardService.updateRankings(period, category);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error updating leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update leaderboard',
    });
  }
});

/**
 * @route POST /api/leaderboards/update-all
 * @desc Update all leaderboard rankings (admin only)
 * @access Admin
 */
router.post('/update-all', requireRole('admin'), async (req, res) => {
  try {
    const periods = ['weekly', 'monthly', 'all-time'];
    const categories = ['referrer', 'hiring', 'network', 'earnings', 'streak'];
    
    const results = [];
    
    for (const period of periods) {
      for (const category of categories) {
        const result = await leaderboardService.updateRankings(period, category);
        results.push({ period, category, ...result });
      }
    }
    
    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error updating all leaderboards:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update leaderboards',
    });
  }
});

/**
 * @route GET /api/leaderboards/stats/:period/:category
 * @desc Get leaderboard statistics (admin only)
 * @access Admin
 */
router.get('/stats/:period/:category', requireRole('admin'), async (req, res) => {
  try {
    const { period, category } = req.params;
    
    const stats = await leaderboardService.getStatistics(period, category);
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error getting leaderboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get leaderboard statistics',
    });
  }
});

/**
 * @route POST /api/leaderboards/archive
 * @desc Archive old leaderboard entries (admin only)
 * @access Admin
 */
router.post('/archive', requireRole('admin'), async (req, res) => {
  try {
    const { keepDays = 90 } = req.body;
    
    const result = await leaderboardService.archiveOldLeaderboards(keepDays);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error archiving leaderboards:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive leaderboards',
    });
  }
});

module.exports = router;
