/**
 * Web3 Routes
 * Wallet connection, network management, and Web3 interactions
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const web3WalletService = require('../services/web3WalletService');
const blockchainService = require('../services/blockchainService');
const logger = require('../utils/logger');

/**
 * @route GET /api/web3/networks
 * @desc Get list of supported blockchain networks
 * @access Public
 */
router.get('/networks', async (req, res) => {
  try {
    const networks = web3WalletService.getSupportedNetworks();
    
    res.json({
      success: true,
      data: networks
    });
  } catch (error) {
    logger.error('Failed to get networks:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/web3/wallets/supported
 * @desc Get list of supported wallet types
 * @access Public
 */
router.get('/wallets/supported', async (req, res) => {
  try {
    const wallets = web3WalletService.getSupportedWallets();
    
    res.json({
      success: true,
      data: wallets
    });
  } catch (error) {
    logger.error('Failed to get supported wallets:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/web3/wallet/connect
 * @desc Connect a Web3 wallet
 * @access Private
 */
router.post('/wallet/connect', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      walletType,
      address,
      chainId,
      signature,
      message
    } = req.body;

    // Validate required fields
    if (!walletType || !address || !chainId) {
      return res.status(400).json({
        success: false,
        error: 'Wallet type, address, and chainId are required'
      });
    }

    const result = await web3WalletService.connectWallet(userId, {
      walletType,
      address,
      chainId,
      signature,
      message
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Wallet connection failed:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/web3/wallet/disconnect
 * @desc Disconnect a Web3 wallet
 * @access Private
 */
router.post('/wallet/disconnect', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { walletId } = req.body;

    if (!walletId) {
      return res.status(400).json({
        success: false,
        error: 'Wallet ID is required'
      });
    }

    const result = await web3WalletService.disconnectWallet(userId, walletId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Wallet disconnection failed:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/web3/wallet/verify
 * @desc Verify wallet ownership with signature
 * @access Private
 */
router.post('/wallet/verify', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { walletId, signature } = req.body;

    if (!walletId || !signature) {
      return res.status(400).json({
        success: false,
        error: 'Wallet ID and signature are required'
      });
    }

    const result = await web3WalletService.verifyWallet(userId, walletId, signature);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Wallet verification failed:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/web3/wallet/balance
 * @desc Get wallet token balances
 * @access Private
 */
router.get('/wallet/balance', authenticate, async (req, res) => {
  try {
    const { address, chainId = 137 } = req.query;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    const balances = await web3WalletService.getWalletBalances(address, parseInt(chainId));

    res.json({
      success: true,
      data: balances
    });
  } catch (error) {
    logger.error('Failed to get wallet balances:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/web3/wallet/sign
 * @desc Request a message signature
 * @access Private
 */
router.post('/wallet/sign', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { walletId, message } = req.body;

    if (!walletId || !message) {
      return res.status(400).json({
        success: false,
        error: 'Wallet ID and message are required'
      });
    }

    const result = await web3WalletService.signMessage(userId, walletId, message);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Message signing failed:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/web3/wallet/switch-network
 * @desc Switch wallet network
 * @access Private
 */
router.post('/wallet/switch-network', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { walletId, chainId } = req.body;

    if (!walletId || !chainId) {
      return res.status(400).json({
        success: false,
        error: 'Wallet ID and chainId are required'
      });
    }

    const result = await web3WalletService.switchNetwork(userId, walletId, chainId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Network switch failed:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/web3/wallets
 * @desc Get user's connected wallets
 * @access Private
 */
router.get('/wallets', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const wallets = await web3WalletService.getUserWallets(userId);

    res.json({
      success: true,
      data: wallets
    });
  } catch (error) {
    logger.error('Failed to get user wallets:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/web3/wallet/primary
 * @desc Set primary wallet
 * @access Private
 */
router.post('/wallet/primary', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { walletId } = req.body;

    if (!walletId) {
      return res.status(400).json({
        success: false,
        error: 'Wallet ID is required'
      });
    }

    const result = await web3WalletService.setPrimaryWallet(userId, walletId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to set primary wallet:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/web3/gas-price
 * @desc Get current gas prices for a network
 * @access Public
 */
router.get('/gas-price', async (req, res) => {
  try {
    const { network = 'polygon' } = req.query;
    
    const gasPrice = await blockchainService.getGasPrice(network);

    res.json({
      success: true,
      data: gasPrice
    });
  } catch (error) {
    logger.error('Failed to get gas price:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/web3/verify-signature
 * @desc Verify a message signature
 * @access Public
 */
router.post('/verify-signature', async (req, res) => {
  try {
    const { message, signature } = req.body;

    if (!message || !signature) {
      return res.status(400).json({
        success: false,
        error: 'Message and signature are required'
      });
    }

    const recoveredAddress = await web3WalletService.verifySignature(message, signature);

    res.json({
      success: true,
      data: {
        isValid: !!recoveredAddress,
        recoveredAddress
      }
    });
  } catch (error) {
    logger.error('Signature verification failed:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/web3/transactions/:address
 * @desc Get transaction history for an address
 * @access Public
 */
router.get('/transactions/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const { network, limit = 50 } = req.query;

    const transactions = await web3WalletService.getWalletTransactions(address, {
      network,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    logger.error('Failed to get wallet transactions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/web3/nonce
 * @desc Generate a nonce for wallet verification
 * @access Private
 */
router.get('/nonce', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    const nonce = await web3WalletService.generateConnectionNonce(userId, address);

    res.json({
      success: true,
      data: {
        nonce,
        message: `TRM Platform Connection\n\nNonce: ${nonce}\n\nSign this message to connect your wallet to TRM.`
      }
    });
  } catch (error) {
    logger.error('Failed to generate nonce:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
