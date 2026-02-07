/**
 * Blockchain Routes
 * Smart contracts, transactions, and on-chain data
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const blockchainService = require('../services/blockchainService');
const smartContractService = require('../services/smartContractService');
const logger = require('../utils/logger');

/**
 * @route GET /api/blockchain/contracts
 * @desc List all smart contracts
 * @access Private
 */
router.get('/contracts', authenticate, async (req, res) => {
  try {
    const { type, network, status } = req.query;
    
    const contracts = await smartContractService.listContracts({
      type,
      network,
      status
    });

    res.json({
      success: true,
      data: contracts
    });
  } catch (error) {
    logger.error('Failed to list contracts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/blockchain/contracts
 * @desc Deploy a new smart contract (Admin only)
 * @access Admin
 */
router.post('/contracts', authenticate, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      type,
      network,
      bytecode,
      abi,
      constructorArgs,
      deployerAddress,
      upgradeable
    } = req.body;

    // Validate required fields
    if (!name || !type || !network || !bytecode || !abi) {
      return res.status(400).json({
        success: false,
        error: 'Name, type, network, bytecode, and ABI are required'
      });
    }

    const result = await smartContractService.deployContract({
      name,
      type,
      network,
      bytecode,
      abi,
      constructorArgs,
      deployerAddress,
      upgradeable
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Contract deployment failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/blockchain/contracts/:id
 * @desc Get contract details
 * @access Private
 */
router.get('/contracts/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const contract = await smartContractService.getContractDetails(id);

    res.json({
      success: true,
      data: contract
    });
  } catch (error) {
    logger.error('Failed to get contract details:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/blockchain/contracts/:id/abi
 * @desc Get contract ABI
 * @access Private
 */
router.get('/contracts/:id/abi', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const abi = await smartContractService.getContractAbi(id);

    res.json({
      success: true,
      data: abi
    });
  } catch (error) {
    logger.error('Failed to get contract ABI:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/blockchain/contracts/:id/call
 * @desc Call a read-only contract function
 * @access Private
 */
router.post('/contracts/:id/call', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { functionName, args, network } = req.body;

    if (!functionName) {
      return res.status(400).json({
        success: false,
        error: 'Function name is required'
      });
    }

    const result = await smartContractService.callContractFunction(
      id,
      functionName,
      args || [],
      network
    );

    res.json({
      success: true,
      data: {
        functionName,
        result
      }
    });
  } catch (error) {
    logger.error('Contract call failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/blockchain/contracts/:id/execute
 * @desc Execute a write contract function
 * @access Private
 */
router.post('/contracts/:id/execute', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { functionName, args, network, value, priority } = req.body;

    if (!functionName) {
      return res.status(400).json({
        success: false,
        error: 'Function name is required'
      });
    }

    const result = await smartContractService.executeContractFunction(
      id,
      functionName,
      args || [],
      { network, value, priority }
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Contract execution failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/blockchain/contracts/:id/upgrade
 * @desc Upgrade a contract (Admin only)
 * @access Admin
 */
router.post('/contracts/:id/upgrade', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { newBytecode, newAbi } = req.body;

    if (!newBytecode || !newAbi) {
      return res.status(400).json({
        success: false,
        error: 'New bytecode and ABI are required'
      });
    }

    const result = await smartContractService.upgradeContract(id, newBytecode, newAbi);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Contract upgrade failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/blockchain/contracts/:id/pause
 * @desc Pause a contract (Admin only)
 * @access Admin
 */
router.post('/contracts/:id/pause', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await smartContractService.pauseContract(id);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Contract pause failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/blockchain/contracts/:id/unpause
 * @desc Unpause a contract (Admin only)
 * @access Admin
 */
router.post('/contracts/:id/unpause', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await smartContractService.unpauseContract(id);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Contract unpause failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/blockchain/contracts/:id/verify
 * @desc Verify contract on block explorer (Admin only)
 * @access Admin
 */
router.post('/contracts/:id/verify', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { sourceCode } = req.body;

    if (!sourceCode) {
      return res.status(400).json({
        success: false,
        error: 'Source code is required'
      });
    }

    const result = await smartContractService.verifyContract(id, sourceCode);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Contract verification failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/blockchain/contracts/:id/security
 * @desc Run security checks on contract
 * @access Admin
 */
router.get('/contracts/:id/security', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await smartContractService.runSecurityChecks(id);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Security check failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/blockchain/transactions
 * @desc List blockchain transactions
 * @access Private
 */
router.get('/transactions', authenticate, async (req, res) => {
  try {
    const { network, purpose, status, limit = 50, page = 1 } = req.query;
    
    const query = {};
    if (network) query.network = network;
    if (purpose) query.purpose = purpose;
    if (status) query.status = status;

    const BlockchainTransaction = require('../models/BlockchainTransaction');
    
    const transactions = await BlockchainTransaction.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await BlockchainTransaction.countDocuments(query);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Failed to list transactions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/blockchain/transactions/:id
 * @desc Get transaction details
 * @access Private
 */
router.get('/transactions/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const BlockchainTransaction = require('../models/BlockchainTransaction');
    const transaction = await BlockchainTransaction.findOne({ txId: id });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // Get on-chain receipt if available
    let receipt = null;
    if (transaction.txHash && transaction.network) {
      receipt = await blockchainService.getTransactionReceipt(
        transaction.network,
        transaction.txHash
      );
    }

    res.json({
      success: true,
      data: {
        ...transaction.toObject(),
        receipt,
        explorerUrl: transaction.txHash 
          ? blockchainService.getExplorerUrl(transaction.network, transaction.txHash, 'tx')
          : null
      }
    });
  } catch (error) {
    logger.error('Failed to get transaction:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/blockchain/verify
 * @desc Verify on-chain data
 * @access Private
 */
router.post('/verify', authenticate, async (req, res) => {
  try {
    const { network, txHash, data } = req.body;

    if (!network || !txHash) {
      return res.status(400).json({
        success: false,
        error: 'Network and transaction hash are required'
      });
    }

    const receipt = await blockchainService.getTransactionReceipt(network, txHash);

    if (!receipt) {
      return res.json({
        success: true,
        data: {
          verified: false,
          reason: 'Transaction not found on blockchain'
        }
      });
    }

    // Additional verification logic can be added here
    const isVerified = receipt.status === 'success';

    res.json({
      success: true,
      data: {
        verified: isVerified,
        receipt,
        explorerUrl: blockchainService.getExplorerUrl(network, txHash, 'tx')
      }
    });
  } catch (error) {
    logger.error('Verification failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/blockchain/balance/:address
 * @desc Get balance for an address
 * @access Public
 */
router.get('/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const { network = 'polygon', tokenAddress } = req.query;

    const balance = await blockchainService.getBalance(
      network,
      address,
      tokenAddress
    );

    res.json({
      success: true,
      data: balance
    });
  } catch (error) {
    logger.error('Failed to get balance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/blockchain/block/:network/:number
 * @desc Get block information
 * @access Public
 */
router.get('/block/:network/:number', async (req, res) => {
  try {
    const { network, number } = req.params;
    
    const block = await blockchainService.getBlock(network, parseInt(number));

    res.json({
      success: true,
      data: block
    });
  } catch (error) {
    logger.error('Failed to get block:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/blockchain/block-number/:network
 * @desc Get current block number
 * @access Public
 */
router.get('/block-number/:network', async (req, res) => {
  try {
    const { network } = req.params;
    
    const blockNumber = await blockchainService.getBlockNumber(network);

    res.json({
      success: true,
      data: { blockNumber }
    });
  } catch (error) {
    logger.error('Failed to get block number:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
