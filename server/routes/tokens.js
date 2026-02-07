/**
 * Token Routes
 * TRM token management, staking, and transactions
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const tokenService = require('../services/tokenService');
const logger = require('../utils/logger');

/**
 * @route GET /api/tokens/balance
 * @desc Get user's TRM token balance
 * @access Private
 */
router.get('/balance', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { includeOnChain, network } = req.query;

    const balance = await tokenService.getBalance(userId, {
      includeOnChain: includeOnChain === 'true',
      network
    });

    res.json({
      success: true,
      data: balance
    });
  } catch (error) {
    logger.error('Failed to get token balance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/tokens/transactions
 * @desc Get token transaction history
 * @access Private
 */
router.get('/transactions', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, purpose, status, limit } = req.query;

    const transactions = await tokenService.getTransactionHistory(userId, {
      type,
      purpose,
      status,
      limit: parseInt(limit) || 50
    });

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    logger.error('Failed to get transaction history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/tokens/earn
 * @desc Earn tokens (admin or system only)
 * @access Private
 */
router.post('/earn', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, purpose, metadata } = req.body;

    if (!amount || !purpose) {
      return res.status(400).json({
        success: false,
        error: 'Amount and purpose are required'
      });
    }

    const result = await tokenService.earnTokens(userId, amount, purpose, metadata);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Token earning failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/tokens/spend
 * @desc Spend tokens
 * @access Private
 */
router.post('/spend', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, purpose, metadata } = req.body;

    if (!amount || !purpose) {
      return res.status(400).json({
        success: false,
        error: 'Amount and purpose are required'
      });
    }

    const result = await tokenService.spendTokens(userId, amount, purpose, metadata);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Token spending failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/tokens/transfer
 * @desc Transfer tokens to another user
 * @access Private
 */
router.post('/transfer', authenticate, async (req, res) => {
  try {
    const fromUserId = req.user.id;
    const { toUserId, amount, metadata } = req.body;

    if (!toUserId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'toUserId and amount are required'
      });
    }

    const result = await tokenService.transferTokens(fromUserId, toUserId, amount, metadata);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Token transfer failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/tokens/stake
 * @desc Stake tokens
 * @access Private
 */
router.post('/stake', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, tier } = req.body;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Amount is required'
      });
    }

    const result = await tokenService.stakeTokens(userId, amount, tier);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Token staking failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/tokens/unstake
 * @desc Unstake tokens
 * @access Private
 */
router.post('/unstake', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { stakeId } = req.body;

    if (!stakeId) {
      return res.status(400).json({
        success: false,
        error: 'stakeId is required'
      });
    }

    const result = await tokenService.unstakeTokens(userId, stakeId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Token unstaking failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/tokens/claim
 * @desc Claim staking rewards
 * @access Private
 */
router.post('/claim', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { stakeId } = req.body;

    if (!stakeId) {
      return res.status(400).json({
        success: false,
        error: 'stakeId is required'
      });
    }

    const result = await tokenService.claimRewards(userId, stakeId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Reward claim failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/tokens/staking
 * @desc Get staking positions
 * @access Private
 */
router.get('/staking', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const result = await tokenService.getStakingPositions(userId, status);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to get staking positions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/tokens/staking/tiers
 * @desc Get staking tier information
 * @access Public
 */
router.get('/staking/tiers', async (req, res) => {
  try {
    const tiers = tokenService.getStakingTiers();

    res.json({
      success: true,
      data: tiers
    });
  } catch (error) {
    logger.error('Failed to get staking tiers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/tokens/fee-discount
 * @desc Calculate fee discount based on token holdings
 * @access Private
 */
router.get('/fee-discount', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await tokenService.calculateFeeDiscount(userId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to calculate fee discount:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/tokens/stats
 * @desc Get token statistics
 * @access Public
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await tokenService.getTokenStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Failed to get token stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/tokens/withdraw
 * @desc Withdraw tokens to external wallet
 * @access Private
 */
router.post('/withdraw', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, walletAddress, network } = req.body;

    if (!amount || !walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Amount and walletAddress are required'
      });
    }

    const result = await tokenService.withdrawToWallet(
      userId,
      amount,
      walletAddress,
      network
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Token withdrawal failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
