/**
 * Immutable Review Routes
 * Blockchain-verified reviews
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const immutableReviewService = require('../services/immutableReviewService');
const logger = require('../utils/logger');

/**
 * @route POST /api/reviews/blockchain
 * @desc Submit a blockchain review
 * @access Private
 */
router.post('/blockchain', authenticate, async (req, res) => {
  try {
    const reviewerId = req.user.id;
    const {
      reviewerAddress,
      revieweeId,
      revieweeType,
      revieweeAddress,
      rating,
      content,
      metadata,
      network
    } = req.body;

    // Validate required fields
    if (!reviewerAddress || !revieweeAddress || !revieweeType || !rating || !content) {
      return res.status(400).json({
        success: false,
        error: 'reviewerAddress, revieweeAddress, revieweeType, rating, and content are required'
      });
    }

    const result = await immutableReviewService.submitReview({
      reviewerId,
      reviewerAddress,
      revieweeId,
      revieweeType,
      revieweeAddress,
      rating,
      content,
      metadata,
      network
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Review submission failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/reviews/blockchain/:id
 * @desc Get blockchain review details
 * @access Public
 */
router.get('/blockchain/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const review = await immutableReviewService.getReview(id);

    res.json({
      success: true,
      data: review
    });
  } catch (error) {
    logger.error('Failed to get review:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/reviews/blockchain/address/:address
 * @desc Get reviews for an address
 * @access Public
 */
router.get('/blockchain/address/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const { type, status, limit } = req.query;

    const result = await immutableReviewService.getReviewsForAddress(address, {
      type,
      status,
      limit: parseInt(limit) || 50
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to get reviews:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/reviews/blockchain/reviewer/:address
 * @desc Get reviews by reviewer
 * @access Public
 */
router.get('/blockchain/reviewer/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const { type, limit } = req.query;

    const reviews = await immutableReviewService.getReviewsByReviewer(address, {
      type,
      limit: parseInt(limit) || 50
    });

    res.json({
      success: true,
      data: reviews
    });
  } catch (error) {
    logger.error('Failed to get reviewer reviews:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/reviews/blockchain/:id/verify
 * @desc Verify review authenticity
 * @access Public
 */
router.get('/blockchain/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await immutableReviewService.verifyReview(id);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Review verification failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/reviews/blockchain/:id/helpful
 * @desc Vote review as helpful
 * @access Private
 */
router.post('/blockchain/:id/helpful', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { voterAddress } = req.body;

    if (!voterAddress) {
      return res.status(400).json({
        success: false,
        error: 'voterAddress is required'
      });
    }

    const result = await immutableReviewService.voteHelpful(id, voterAddress);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Helpful vote failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/reviews/blockchain/:id/dispute
 * @desc Dispute a review
 * @access Private
 */
router.post('/blockchain/:id/dispute', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, evidence, disputerAddress } = req.body;

    if (!reason || !disputerAddress) {
      return res.status(400).json({
        success: false,
        error: 'reason and disputerAddress are required'
      });
    }

    const result = await immutableReviewService.disputeReview(id, {
      reason,
      evidence,
      disputerAddress
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Review dispute failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/reviews/blockchain/:id/resolve
 * @desc Resolve a dispute (Admin only)
 * @access Admin
 */
router.post('/blockchain/:id/resolve', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, notes } = req.body;

    if (!decision) {
      return res.status(400).json({
        success: false,
        error: 'decision is required'
      });
    }

    const result = await immutableReviewService.resolveDispute(id, {
      decision,
      moderatorId: req.user.id,
      notes
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Dispute resolution failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route PUT /api/reviews/blockchain/:id
 * @desc Edit a review (within 24 hours)
 * @access Private
 */
router.put('/blockchain/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, rating, editorAddress } = req.body;

    if (!editorAddress) {
      return res.status(400).json({
        success: false,
        error: 'editorAddress is required'
      });
    }

    const result = await immutableReviewService.editReview(id, editorAddress, {
      content,
      rating
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Review edit failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/reviews/blockchain/stats
 * @desc Get review statistics
 * @access Public
 */
router.get('/blockchain/stats', async (req, res) => {
  try {
    const { network, revieweeType } = req.query;

    const stats = await immutableReviewService.getReviewStats({
      network,
      revieweeType
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Failed to get review stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/reviews/blockchain/verify-batch
 * @desc Batch verify reviews
 * @access Private
 */
router.post('/blockchain/verify-batch', authenticate, async (req, res) => {
  try {
    const { reviewIds } = req.body;

    if (!Array.isArray(reviewIds) || reviewIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'reviewIds array is required'
      });
    }

    const result = await immutableReviewService.batchVerifyReviews(reviewIds);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Batch verification failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/reviews/blockchain/sync
 * @desc Sync reviews from blockchain (Admin only)
 * @access Admin
 */
router.post('/blockchain/sync', authenticate, requireAdmin, async (req, res) => {
  try {
    const { network, fromBlock } = req.body;

    const result = await immutableReviewService.syncFromBlockchain(
      network || 'polygon',
      fromBlock
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Blockchain sync failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
