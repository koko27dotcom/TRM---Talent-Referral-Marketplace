/**
 * Challenge Routes
 * API endpoints for challenge features
 */

const express = require('express');
const { authenticate } = require('../middleware/auth.js');
const { requireRole } = require('../middleware/rbac.js');
const challengeEngine = require('../services/challengeEngine.js');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route GET /api/challenges
 * @desc Get active challenges for user
 * @access Private
 */
router.get('/', async (req, res) => {
  try {
    const { type, difficulty } = req.query;
    
    const challenges = await challengeEngine.getActiveChallenges(
      req.user._id,
      { type, difficulty }
    );
    
    res.json({
      success: true,
      data: challenges,
    });
  } catch (error) {
    console.error('Error getting challenges:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get challenges',
    });
  }
});

/**
 * @route GET /api/challenges/:id
 * @desc Get challenge details
 * @access Private
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const challenge = await challengeEngine.getChallenge(id, req.user._id);
    
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found',
      });
    }
    
    res.json({
      success: true,
      data: challenge,
    });
  } catch (error) {
    console.error('Error getting challenge:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get challenge',
    });
  }
});

/**
 * @route POST /api/challenges/:id/join
 * @desc Join a challenge
 * @access Private
 */
router.post('/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await challengeEngine.joinChallenge(req.user._id, id);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }
    
    res.json({
      success: true,
      message: 'Successfully joined challenge',
    });
  } catch (error) {
    console.error('Error joining challenge:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join challenge',
    });
  }
});

/**
 * @route GET /api/challenges/my-progress
 * @desc Get user's challenge progress
 * @access Private
 */
router.get('/my-progress', async (req, res) => {
  try {
    const progress = await challengeEngine.getUserProgress(req.user._id);
    
    res.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    console.error('Error getting challenge progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get challenge progress',
    });
  }
});

/**
 * @route POST /api/challenges/:id/claim
 * @desc Claim challenge reward
 * @access Private
 */
router.post('/:id/claim', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await challengeEngine.claimReward(req.user._id, id);
    
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
    console.error('Error claiming challenge reward:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to claim reward',
    });
  }
});

/**
 * @route GET /api/challenges/recommendations
 * @desc Get challenge recommendations for user
 * @access Private
 */
router.get('/recommendations', async (req, res) => {
  try {
    const { limit = 3 } = req.query;
    
    const recommendations = await challengeEngine.getRecommendations(
      req.user._id,
      parseInt(limit)
    );
    
    res.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recommendations',
    });
  }
});

// Admin routes

/**
 * @route POST /api/challenges
 * @desc Create a new challenge (admin only)
 * @access Admin
 */
router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const challengeData = req.body;
    
    const challenge = await challengeEngine.createChallenge(challengeData);
    
    res.status(201).json({
      success: true,
      data: challenge,
    });
  } catch (error) {
    console.error('Error creating challenge:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create challenge',
    });
  }
});

/**
 * @route PUT /api/challenges/:id
 * @desc Update a challenge (admin only)
 * @access Admin
 */
router.put('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const challenge = await challengeEngine.updateChallenge(id, updates);
    
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found',
      });
    }
    
    res.json({
      success: true,
      data: challenge,
    });
  } catch (error) {
    console.error('Error updating challenge:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update challenge',
    });
  }
});

/**
 * @route DELETE /api/challenges/:id
 * @desc Delete a challenge (admin only)
 * @access Admin
 */
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await challengeEngine.deleteChallenge(id);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found',
      });
    }
    
    res.json({
      success: true,
      message: 'Challenge deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting challenge:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete challenge',
    });
  }
});

/**
 * @route POST /api/challenges/initialize
 * @desc Initialize challenges (admin only)
 * @access Admin
 */
router.post('/initialize', requireRole('admin'), async (req, res) => {
  try {
    await challengeEngine.initialize();
    
    res.json({
      success: true,
      message: 'Challenges initialized successfully',
    });
  } catch (error) {
    console.error('Error initializing challenges:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize challenges',
    });
  }
});

/**
 * @route POST /api/challenges/create-daily
 * @desc Create daily challenges (admin only)
 * @access Admin
 */
router.post('/create-daily', requireRole('admin'), async (req, res) => {
  try {
    const challenges = await challengeEngine.createDailyChallenges();
    
    res.json({
      success: true,
      data: challenges,
    });
  } catch (error) {
    console.error('Error creating daily challenges:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create daily challenges',
    });
  }
});

/**
 * @route POST /api/challenges/create-weekly
 * @desc Create weekly challenges (admin only)
 * @access Admin
 */
router.post('/create-weekly', requireRole('admin'), async (req, res) => {
  try {
    const challenges = await challengeEngine.createWeeklyChallenges();
    
    res.json({
      success: true,
      data: challenges,
    });
  } catch (error) {
    console.error('Error creating weekly challenges:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create weekly challenges',
    });
  }
});

/**
 * @route GET /api/challenges/admin/stats
 * @desc Get challenge statistics (admin only)
 * @access Admin
 */
router.get('/admin/stats', requireRole('admin'), async (req, res) => {
  try {
    const stats = await challengeEngine.getStatistics();
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error getting challenge stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get challenge statistics',
    });
  }
});

/**
 * @route POST /api/challenges/cleanup
 * @desc Clean up expired challenges (admin only)
 * @access Admin
 */
router.post('/cleanup', requireRole('admin'), async (req, res) => {
  try {
    const deactivated = await challengeEngine.cleanupExpired();
    
    res.json({
      success: true,
      data: { deactivated },
    });
  } catch (error) {
    console.error('Error cleaning up challenges:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clean up challenges',
    });
  }
});

module.exports = router;
