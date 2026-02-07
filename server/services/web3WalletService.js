/**
 * Web3 Wallet Service
 * Handles wallet connections, signature verification, multi-chain support
 * Supports MetaMask, WalletConnect, and Coinbase Wallet
 */

const { ethers } = require('ethers');
const Web3Wallet = require('../models/Web3Wallet');
const User = require('../models/User');
const BlockchainTransaction = require('../models/BlockchainTransaction');
const blockchainService = require('./blockchainService');
const logger = require('../utils/logger');

// Supported wallet types
const WALLET_TYPES = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
  phantom: 'Phantom',
  brave: 'Brave Wallet',
  trust: 'Trust Wallet'
};

// Supported chains
const SUPPORTED_CHAINS = {
  // Mainnets
  1: { name: 'Ethereum Mainnet', network: 'ethereum', currency: 'ETH' },
  137: { name: 'Polygon Mainnet', network: 'polygon', currency: 'MATIC' },
  56: { name: 'Binance Smart Chain', network: 'bsc', currency: 'BNB' },
  43114: { name: 'Avalanche C-Chain', network: 'avalanche', currency: 'AVAX' },
  42161: { name: 'Arbitrum One', network: 'arbitrum', currency: 'ETH' },
  10: { name: 'Optimism', network: 'optimism', currency: 'ETH' },
  
  // Testnets
  11155111: { name: 'Sepolia Testnet', network: 'sepolia', currency: 'ETH' },
  80001: { name: 'Mumbai Testnet', network: 'mumbai', currency: 'MATIC' },
  97: { name: 'BSC Testnet', network: 'bscTestnet', currency: 'tBNB' }
};

// Message templates for signing
const MESSAGE_TEMPLATES = {
  connect: (nonce) => `TRM Platform Connection\n\nNonce: ${nonce}\n\nSign this message to connect your wallet to TRM.`,
  verify: (nonce) => `TRM Wallet Verification\n\nNonce: ${nonce}\n\nSign this message to verify wallet ownership.`,
  transaction: (txId, amount) => `TRM Transaction Authorization\n\nTransaction ID: ${txId}\nAmount: ${amount} TRM\n\nSign to authorize this transaction.`,
  withdrawal: (amount, address) => `TRM Withdrawal Request\n\nAmount: ${amount} TRM\nTo: ${address}\n\nSign to confirm this withdrawal.`
};

class Web3WalletService {
  constructor() {
    this.activeSessions = new Map();
    this.nonceCache = new Map();
  }

  /**
   * Generate unique wallet ID
   */
  generateWalletId() {
    return `WAL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Generate nonce for signing
   */
  generateNonce() {
    return Math.floor(Math.random() * 1000000).toString();
  }

  /**
   * Generate connection nonce
   */
  async generateConnectionNonce(userId, walletAddress) {
    const nonce = this.generateNonce();
    const key = `${userId}:${walletAddress.toLowerCase()}`;
    
    this.nonceCache.set(key, {
      nonce,
      timestamp: Date.now(),
      attempts: 0
    });

    // Clean up after 5 minutes
    setTimeout(() => {
      this.nonceCache.delete(key);
    }, 300000);

    return nonce;
  }

  /**
   * Validate wallet address
   */
  validateAddress(address) {
    try {
      return ethers.isAddress(address);
    } catch (error) {
      return false;
    }
  }

  /**
   * Normalize address
   */
  normalizeAddress(address) {
    return address.toLowerCase();
  }

  /**
   * Connect wallet
   */
  async connectWallet(userId, connectionData) {
    try {
      const {
        walletType,
        address,
        chainId,
        signature,
        message
      } = connectionData;

      // Validate wallet type
      if (!WALLET_TYPES[walletType]) {
        throw new Error(`Unsupported wallet type: ${walletType}`);
      }

      // Validate address
      if (!this.validateAddress(address)) {
        throw new Error('Invalid wallet address');
      }

      const normalizedAddress = this.normalizeAddress(address);

      // Check if wallet is already connected to another user
      const existingWallet = await Web3Wallet.findOne({
        address: normalizedAddress,
        userId: { $ne: userId }
      });

      if (existingWallet) {
        throw new Error('This wallet is already connected to another account');
      }

      // Verify signature if provided
      if (signature && message) {
        const recoveredAddress = await this.verifySignature(message, signature);
        
        if (recoveredAddress?.toLowerCase() !== normalizedAddress) {
          throw new Error('Signature verification failed');
        }
      }

      // Check for existing wallet connection
      let wallet = await Web3Wallet.findOne({
        userId,
        address: normalizedAddress
      });

      const walletId = wallet?.walletId || this.generateWalletId();
      const sessionToken = this.generateSessionToken();

      if (wallet) {
        // Update existing connection
        wallet.walletType = walletType;
        wallet.chainId = chainId;
        wallet.isConnected = true;
        wallet.lastConnectedAt = new Date();
        wallet.sessionToken = sessionToken;
        wallet.sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        
        if (signature) {
          wallet.isVerified = true;
          wallet.signature = signature;
        }

        await wallet.save();
      } else {
        // Create new connection
        wallet = new Web3Wallet({
          walletId,
          userId,
          walletType,
          address: normalizedAddress,
          chainId,
          isConnected: true,
          isVerified: !!signature,
          lastConnectedAt: new Date(),
          signature,
          sessionToken,
          sessionExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });

        await wallet.save();
      }

      // Update user's wallet address
      await User.findByIdAndUpdate(userId, {
        walletAddress: normalizedAddress,
        walletType
      });

      // Store active session
      this.activeSessions.set(sessionToken, {
        userId,
        walletId,
        address: normalizedAddress,
        chainId,
        connectedAt: new Date()
      });

      logger.info(`Wallet connected: ${normalizedAddress} for user ${userId}`);

      return {
        walletId,
        address: normalizedAddress,
        walletType,
        chainId,
        isVerified: wallet.isVerified,
        sessionToken,
        network: SUPPORTED_CHAINS[chainId]?.name || 'Unknown Network'
      };
    } catch (error) {
      logger.error('Wallet connection failed:', error);
      throw error;
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnectWallet(userId, walletId) {
    try {
      const wallet = await Web3Wallet.findOne({ walletId, userId });
      
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      wallet.isConnected = false;
      wallet.sessionToken = null;
      wallet.sessionExpiresAt = null;
      wallet.disconnectedAt = new Date();
      await wallet.save();

      // Remove from active sessions
      for (const [token, session] of this.activeSessions) {
        if (session.walletId === walletId) {
          this.activeSessions.delete(token);
          break;
        }
      }

      // Clear user's wallet address if this was the primary wallet
      await User.findByIdAndUpdate(userId, {
        $unset: { walletAddress: 1, walletType: 1 }
      });

      logger.info(`Wallet disconnected: ${wallet.address}`);

      return { success: true, walletId };
    } catch (error) {
      logger.error('Wallet disconnection failed:', error);
      throw error;
    }
  }

  /**
   * Verify wallet ownership
   */
  async verifyWallet(userId, walletId, signature) {
    try {
      const wallet = await Web3Wallet.findOne({ walletId, userId });
      
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const nonce = wallet.nonce || this.generateNonce();
      const message = MESSAGE_TEMPLATES.verify(nonce);

      const recoveredAddress = await this.verifySignature(message, signature);

      if (recoveredAddress?.toLowerCase() !== wallet.address) {
        throw new Error('Signature verification failed');
      }

      wallet.isVerified = true;
      wallet.signature = signature;
      wallet.verifiedAt = new Date();
      await wallet.save();

      logger.info(`Wallet verified: ${wallet.address}`);

      return {
        walletId,
        address: wallet.address,
        isVerified: true,
        verifiedAt: wallet.verifiedAt
      };
    } catch (error) {
      logger.error('Wallet verification failed:', error);
      throw error;
    }
  }

  /**
   * Get wallet balances
   */
  async getWalletBalances(address, chainId = 137) {
    try {
      const network = SUPPORTED_CHAINS[chainId]?.network || 'polygon';
      
      // Get native currency balance
      const nativeBalance = await blockchainService.getBalance(network, address);

      // Get TRM token balance (if contract exists)
      let trmBalance = { balance: '0', formatted: '0' };
      
      // This would query the TRM token contract
      // For now, return mock data

      return {
        address,
        chainId,
        network: SUPPORTED_CHAINS[chainId]?.name,
        native: {
          symbol: nativeBalance.symbol,
          balance: nativeBalance.formatted,
          raw: nativeBalance.balance
        },
        trm: {
          symbol: 'TRM',
          balance: trmBalance.formatted,
          raw: trmBalance.balance
        }
      };
    } catch (error) {
      logger.error('Failed to get wallet balances:', error);
      throw error;
    }
  }

  /**
   * Sign message
   */
  async signMessage(userId, walletId, message) {
    try {
      const wallet = await Web3Wallet.findOne({ walletId, userId });
      
      if (!wallet || !wallet.isConnected) {
        throw new Error('Wallet not connected');
      }

      if (!wallet.isVerified) {
        throw new Error('Wallet not verified');
      }

      // In a real implementation, this would trigger the wallet to sign
      // For now, return the message to be signed by the client
      return {
        walletId,
        address: wallet.address,
        message,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Message signing failed:', error);
      throw error;
    }
  }

  /**
   * Verify signature
   */
  async verifySignature(message, signature) {
    try {
      const recoveredAddress = await blockchainService.verifyMessage(message, signature);
      return recoveredAddress;
    } catch (error) {
      logger.error('Signature verification failed:', error);
      return null;
    }
  }

  /**
   * Verify typed data signature (EIP-712)
   */
  async verifyTypedData(domain, types, value, signature) {
    try {
      const recoveredAddress = await blockchainService.verifyTypedData(
        domain,
        types,
        value,
        signature
      );
      return recoveredAddress;
    } catch (error) {
      logger.error('Typed data verification failed:', error);
      return null;
    }
  }

  /**
   * Switch network
   */
  async switchNetwork(userId, walletId, newChainId) {
    try {
      const wallet = await Web3Wallet.findOne({ walletId, userId });
      
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      if (!SUPPORTED_CHAINS[newChainId]) {
        throw new Error('Unsupported chain ID');
      }

      wallet.chainId = newChainId;
      wallet.updatedAt = new Date();
      await wallet.save();

      // Update session
      for (const [token, session] of this.activeSessions) {
        if (session.walletId === walletId) {
          session.chainId = newChainId;
          break;
        }
      }

      logger.info(`Network switched to ${newChainId} for wallet ${wallet.address}`);

      return {
        walletId,
        chainId: newChainId,
        network: SUPPORTED_CHAINS[newChainId].name
      };
    } catch (error) {
      logger.error('Network switch failed:', error);
      throw error;
    }
  }

  /**
   * Get user's wallets
   */
  async getUserWallets(userId) {
    try {
      const wallets = await Web3Wallet.find({ userId })
        .sort({ lastConnectedAt: -1 })
        .select('-__v -signature');

      // Get balances for connected wallets
      const walletsWithBalances = await Promise.all(
        wallets.map(async (wallet) => {
          let balances = null;
          
          if (wallet.isConnected) {
            try {
              balances = await this.getWalletBalances(
                wallet.address,
                wallet.chainId
              );
            } catch (e) {
              logger.warn(`Failed to get balance for ${wallet.address}`);
            }
          }

          return {
            ...wallet.toObject(),
            balances
          };
        })
      );

      return walletsWithBalances;
    } catch (error) {
      logger.error('Failed to get user wallets:', error);
      throw error;
    }
  }

  /**
   * Get wallet by address
   */
  async getWalletByAddress(address) {
    try {
      const normalizedAddress = this.normalizeAddress(address);
      
      const wallet = await Web3Wallet.findOne({
        address: normalizedAddress,
        isConnected: true
      });

      return wallet;
    } catch (error) {
      logger.error('Failed to get wallet by address:', error);
      throw error;
    }
  }

  /**
   * Validate session
   */
  async validateSession(sessionToken) {
    try {
      const session = this.activeSessions.get(sessionToken);
      
      if (!session) {
        // Check database for session
        const wallet = await Web3Wallet.findOne({ sessionToken });
        
        if (!wallet || !wallet.isConnected) {
          return null;
        }

        if (wallet.sessionExpiresAt < new Date()) {
          return null;
        }

        return {
          userId: wallet.userId,
          walletId: wallet.walletId,
          address: wallet.address,
          chainId: wallet.chainId
        };
      }

      return session;
    } catch (error) {
      logger.error('Session validation failed:', error);
      return null;
    }
  }

  /**
   * Refresh session
   */
  async refreshSession(sessionToken) {
    try {
      const wallet = await Web3Wallet.findOne({ sessionToken });
      
      if (!wallet || !wallet.isConnected) {
        throw new Error('Invalid session');
      }

      const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      wallet.sessionExpiresAt = newExpiresAt;
      await wallet.save();

      // Update in-memory session
      const session = this.activeSessions.get(sessionToken);
      if (session) {
        session.expiresAt = newExpiresAt;
      }

      return {
        sessionToken,
        expiresAt: newExpiresAt
      };
    } catch (error) {
      logger.error('Session refresh failed:', error);
      throw error;
    }
  }

  /**
   * Get supported networks
   */
  getSupportedNetworks() {
    return {
      mainnets: Object.entries(SUPPORTED_CHAINS)
        .filter(([id, chain]) => !chain.network.includes('Testnet'))
        .map(([id, chain]) => ({
          chainId: parseInt(id),
          ...chain
        })),
      testnets: Object.entries(SUPPORTED_CHAINS)
        .filter(([id, chain]) => chain.network.includes('Testnet'))
        .map(([id, chain]) => ({
          chainId: parseInt(id),
          ...chain
        }))
    };
  }

  /**
   * Get supported wallet types
   */
  getSupportedWallets() {
    return Object.entries(WALLET_TYPES).map(([type, name]) => ({
      type,
      name,
      icon: `/assets/wallets/${type}.svg`
    }));
  }

  /**
   * Generate session token
   */
  generateSessionToken() {
    return `SES-${Date.now()}-${Math.random().toString(36).substr(2, 16)}`;
  }

  /**
   * Get wallet transaction history
   */
  async getWalletTransactions(address, options = {}) {
    try {
      const query = {
        $or: [
          { fromAddress: address.toLowerCase() },
          { toAddress: address.toLowerCase() }
        ]
      };

      if (options.network) query.network = options.network;
      if (options.purpose) query.purpose = options.purpose;

      const transactions = await BlockchainTransaction.find(query)
        .sort({ createdAt: -1 })
        .limit(options.limit || 50);

      return transactions;
    } catch (error) {
      logger.error('Failed to get wallet transactions:', error);
      throw error;
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupSessions() {
    try {
      const expiredWallets = await Web3Wallet.find({
        sessionExpiresAt: { $lt: new Date() },
        isConnected: true
      });

      for (const wallet of expiredWallets) {
        wallet.isConnected = false;
        wallet.sessionToken = null;
        await wallet.save();

        // Remove from active sessions
        for (const [token, session] of this.activeSessions) {
          if (session.walletId === wallet.walletId) {
            this.activeSessions.delete(token);
            break;
          }
        }
      }

      logger.info(`Cleaned up ${expiredWallets.length} expired sessions`);
      return expiredWallets.length;
    } catch (error) {
      logger.error('Session cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Set primary wallet
   */
  async setPrimaryWallet(userId, walletId) {
    try {
      const wallet = await Web3Wallet.findOne({ walletId, userId });
      
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Update user with primary wallet
      await User.findByIdAndUpdate(userId, {
        walletAddress: wallet.address,
        walletType: wallet.walletType
      });

      // Mark as primary in wallet collection
      await Web3Wallet.updateMany(
        { userId },
        { isPrimary: false }
      );

      wallet.isPrimary = true;
      await wallet.save();

      return {
        walletId,
        address: wallet.address,
        isPrimary: true
      };
    } catch (error) {
      logger.error('Failed to set primary wallet:', error);
      throw error;
    }
  }
}

module.exports = new Web3WalletService();
