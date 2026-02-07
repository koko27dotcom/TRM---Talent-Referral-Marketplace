/**
 * NFT Routes
 * NFT badges, collections, and marketplace
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const nftService = require('../services/nftService');
const logger = require('../utils/logger');

/**
 * @route GET /api/nfts/my-nfts
 * @desc Get current user's NFT badges
 * @access Private
 */
router.get('/my-nfts', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { rarity, category, network } = req.query;

    // Get user's wallet address
    const User = require('../models/User');
    const user = await User.findById(userId);

    if (!user || !user.walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'No wallet connected'
      });
    }

    const result = await nftService.getUserBadges(user.walletAddress, {
      rarity,
      category,
      network
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to get user NFTs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/nfts/:id
 * @desc Get NFT details
 * @access Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const badge = await nftService.getBadgeDetails(id);

    res.json({
      success: true,
      data: badge
    });
  } catch (error) {
    logger.error('Failed to get NFT details:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/nfts/mint
 * @desc Mint a new NFT badge (Admin only)
 * @access Admin
 */
router.post('/mint', authenticate, requireAdmin, async (req, res) => {
  try {
    const {
      userId,
      ownerAddress,
      name,
      description,
      imageUrl,
      rarity,
      category,
      transferable,
      attributes,
      network
    } = req.body;

    // Validate required fields
    if (!userId || !ownerAddress || !name || !description) {
      return res.status(400).json({
        success: false,
        error: 'userId, ownerAddress, name, and description are required'
      });
    }

    const result = await nftService.mintBadge({
      userId,
      ownerAddress,
      name,
      description,
      imageUrl,
      rarity,
      category,
      transferable,
      attributes,
      network
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('NFT minting failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/nfts/award
 * @desc Award an NFT badge to a user (Admin only)
 * @access Admin
 */
router.post('/award', authenticate, requireAdmin, async (req, res) => {
  try {
    const { userId, badgeType, metadata } = req.body;

    if (!userId || !badgeType) {
      return res.status(400).json({
        success: false,
        error: 'userId and badgeType are required'
      });
    }

    const result = await nftService.awardBadge(userId, badgeType, metadata);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Badge award failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/nfts/transfer
 * @desc Transfer an NFT
 * @access Private
 */
router.post('/transfer', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { badgeId, toAddress } = req.body;

    if (!badgeId || !toAddress) {
      return res.status(400).json({
        success: false,
        error: 'badgeId and toAddress are required'
      });
    }

    // Get user's wallet address
    const User = require('../models/User');
    const user = await User.findById(userId);

    if (!user || !user.walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'No wallet connected'
      });
    }

    const result = await nftService.transferBadge(
      badgeId,
      user.walletAddress,
      toAddress
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('NFT transfer failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/nfts/:id/burn
 * @desc Burn an NFT
 * @access Private
 */
router.post('/:id/burn', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Get user's wallet address
    const User = require('../models/User');
    const user = await User.findById(userId);

    if (!user || !user.walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'No wallet connected'
      });
    }

    const result = await nftService.burnBadge(id, user.walletAddress);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('NFT burn failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/nfts/collections
 * @desc List NFT collections
 * @access Public
 */
router.get('/collections', async (req, res) => {
  try {
    const collections = await nftService.listCollections();

    res.json({
      success: true,
      data: collections
    });
  } catch (error) {
    logger.error('Failed to list collections:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/nfts/collections/:contractId/stats
 * @desc Get collection statistics
 * @access Public
 */
router.get('/collections/:contractId/stats', async (req, res) => {
  try {
    const { contractId } = req.params;
    
    const stats = await nftService.getCollectionStats(contractId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Failed to get collection stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/nfts/user/:address
 * @desc Get NFTs for a specific address
 * @access Public
 */
router.get('/user/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const { rarity, category, network } = req.query;

    const result = await nftService.getUserBadges(address, {
      rarity,
      category,
      network
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to get user NFTs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/nfts/:id/verify
 * @desc Verify NFT authenticity
 * @access Public
 */
router.get('/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await nftService.verifyBadge(id);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('NFT verification failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/nfts/leaderboard
 * @desc Get NFT badge leaderboard
 * @access Public
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    
    const leaderboard = await nftService.getLeaderboard(parseInt(limit));

    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    logger.error('Failed to get leaderboard:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
