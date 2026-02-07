/**
 * Token Service
 * TRM token management, distribution, staking mechanics, and rewards
 * Token economics implementation
 */

const { ethers } = require('ethers');
const TokenTransaction = require('../models/TokenTransaction');
const TokenStaking = require('../models/TokenStaking');
const SmartContract = require('../models/SmartContract');
const User = require('../models/User');
const GamificationProfile = require('../models/GamificationProfile');
const BlockchainTransaction = require('../models/BlockchainTransaction');
const blockchainService = require('./blockchainService');
const smartContractService = require('./smartContractService');
const logger = require('../utils/logger');

// Token economics configuration
const TOKEN_CONFIG = {
  name: 'TRM Token',
  symbol: 'TRM',
  decimals: 18,
  totalSupply: '1000000000', // 1 billion TRM
  
  // Distribution
  distribution: {
    referralReward: 100,      // 100 TRM per referral
    hireReward: 500,          // 500 TRM per hire
    stakingReward: 0,         // Dynamic based on APY
    communityRewards: 0,      // Dynamic
    teamAndAdvisors: 150000000,  // 15%
    ecosystemFund: 200000000,    // 20%
    liquidityPool: 100000000,    // 10%
    stakingReserve: 300000000,   // 30%
    publicSale: 250000000        // 25%
  },

  // Staking tiers
  stakingTiers: {
    bronze: {
      name: 'Bronze',
      minAmount: 1000,
      apy: 10,
      lockPeriod: 30, // days
      multiplier: 1
    },
    silver: {
      name: 'Silver',
      minAmount: 10000,
      apy: 12,
      lockPeriod: 60,
      multiplier: 1.5
    },
    gold: {
      name: 'Gold',
      minAmount: 100000,
      apy: 15,
      lockPeriod: 90,
      multiplier: 2
    },
    platinum: {
      name: 'Platinum',
      minAmount: 1000000,
      apy: 20,
      lockPeriod: 180,
      multiplier: 3
    }
  }
};

// Token utility benefits
const TOKEN_BENEFITS = {
  feeDiscount: {
    enabled: true,
    tiers: {
      holder: { minTokens: 100, discount: 5 },
      silver: { minTokens: 1000, discount: 10 },
      gold: { minTokens: 10000, discount: 15 },
      platinum: { minTokens: 100000, discount: 25 }
    }
  },
  premiumFeatures: {
    enabled: true,
    requirements: {
      advancedAnalytics: 1000,
      prioritySupport: 5000,
      customIntegrations: 50000
    }
  }
};

class TokenService {
  constructor() {
    this.tokenContract = null;
    this.stakingContract = null;
  }

  /**
   * Generate unique transaction ID
   */
  generateTxId() {
    return `TKN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Generate unique stake ID
   */
  generateStakeId() {
    return `STK-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Initialize token contracts
   */
  async initialize() {
    try {
      // Load TRM token contract
      const tokenContract = await SmartContract.findOne({
        type: 'token',
        status: 'active'
      });

      if (tokenContract) {
        this.tokenContract = await smartContractService.loadContract(
          tokenContract.contractId,
          'polygon',
          false
        );
        logger.info('Token contract initialized');
      }

      logger.info('Token service initialized');
    } catch (error) {
      logger.error('Token service initialization failed:', error);
    }
  }

  /**
   * Get token balance for a user
   */
  async getBalance(userId, options = {}) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      // Get on-chain balance if wallet is connected
      let onChainBalance = '0';
      if (user.walletAddress && options.includeOnChain) {
        const network = options.network || 'polygon';
        const tokenContract = await SmartContract.findOne({
          type: 'token',
          network,
          status: 'active'
        });

        if (tokenContract) {
          const balance = await blockchainService.getBalance(
            network,
            user.walletAddress,
            tokenContract.contractAddress
          );
          onChainBalance = balance.formatted;
        }
      }

      // Get platform balance from gamification profile
      const profile = await GamificationProfile.findOne({ userId });
      const platformBalance = profile?.tokens || 0;

      // Get staking positions
      const stakingPositions = await TokenStaking.find({
        userId,
        status: 'active'
      });

      const stakedAmount = stakingPositions.reduce(
        (sum, pos) => sum + parseFloat(pos.amount),
        0
      );

      return {
        userId,
        platformBalance,
        onChainBalance,
        stakedAmount,
        totalBalance: platformBalance + parseFloat(onChainBalance) + stakedAmount,
        stakingPositions: stakingPositions.length
      };
    } catch (error) {
      logger.error('Failed to get token balance:', error);
      throw error;
    }
  }

  /**
   * Award tokens to user (earn)
   */
  async earnTokens(userId, amount, purpose, metadata = {}) {
    try {
      const txId = this.generateTxId();

      // Create transaction record
      const transaction = new TokenTransaction({
        txId,
        type: 'earn',
        fromUserId: null, // Platform
        toUserId: userId,
        amount,
        tokenType: 'trm',
        purpose,
        status: 'completed',
        metadata: {
          ...metadata,
          timestamp: new Date()
        },
        createdAt: new Date()
      });

      await transaction.save();

      // Update user's gamification profile
      await GamificationProfile.findOneAndUpdate(
        { userId },
        {
          $inc: { tokens: amount },
          $push: {
            tokenHistory: {
              txId,
              type: 'earn',
              amount,
              purpose,
              timestamp: new Date()
            }
          }
        },
        { upsert: true }
      );

      logger.info(`Awarded ${amount} TRM to user ${userId} for ${purpose}`);

      return {
        txId,
        userId,
        amount,
        purpose,
        newBalance: await this.getBalance(userId)
      };
    } catch (error) {
      logger.error('Token earning failed:', error);
      throw error;
    }
  }

  /**
   * Spend tokens
   */
  async spendTokens(userId, amount, purpose, metadata = {}) {
    try {
      // Check balance
      const balance = await this.getBalance(userId);
      
      if (balance.platformBalance < amount) {
        throw new Error('Insufficient token balance');
      }

      const txId = this.generateTxId();

      // Create transaction record
      const transaction = new TokenTransaction({
        txId,
        type: 'spend',
        fromUserId: userId,
        toUserId: null, // Platform
        amount,
        tokenType: 'trm',
        purpose,
        status: 'completed',
        metadata,
        createdAt: new Date()
      });

      await transaction.save();

      // Update user's gamification profile
      await GamificationProfile.findOneAndUpdate(
        { userId },
        {
          $inc: { tokens: -amount },
          $push: {
            tokenHistory: {
              txId,
              type: 'spend',
              amount,
              purpose,
              timestamp: new Date()
            }
          }
        }
      );

      logger.info(`User ${userId} spent ${amount} TRM for ${purpose}`);

      return {
        txId,
        userId,
        amount,
        purpose,
        newBalance: await this.getBalance(userId)
      };
    } catch (error) {
      logger.error('Token spending failed:', error);
      throw error;
    }
  }

  /**
   * Transfer tokens between users
   */
  async transferTokens(fromUserId, toUserId, amount, metadata = {}) {
    try {
      // Check sender balance
      const balance = await this.getBalance(fromUserId);
      
      if (balance.platformBalance < amount) {
        throw new Error('Insufficient token balance');
      }

      const txId = this.generateTxId();

      // Create transaction record
      const transaction = new TokenTransaction({
        txId,
        type: 'transfer',
        fromUserId,
        toUserId,
        amount,
        tokenType: 'trm',
        purpose: 'user-transfer',
        status: 'completed',
        metadata,
        createdAt: new Date()
      });

      await transaction.save();

      // Deduct from sender
      await GamificationProfile.findOneAndUpdate(
        { userId: fromUserId },
        {
          $inc: { tokens: -amount },
          $push: {
            tokenHistory: {
              txId,
              type: 'transfer-out',
              amount,
              toUserId,
              timestamp: new Date()
            }
          }
        }
      );

      // Add to recipient
      await GamificationProfile.findOneAndUpdate(
        { userId: toUserId },
        {
          $inc: { tokens: amount },
          $push: {
            tokenHistory: {
              txId,
              type: 'transfer-in',
              amount,
              fromUserId,
              timestamp: new Date()
            }
          }
        },
        { upsert: true }
      );

      logger.info(`Transferred ${amount} TRM from ${fromUserId} to ${toUserId}`);

      return {
        txId,
        fromUserId,
        toUserId,
        amount,
        senderBalance: await this.getBalance(fromUserId),
        recipientBalance: await this.getBalance(toUserId)
      };
    } catch (error) {
      logger.error('Token transfer failed:', error);
      throw error;
    }
  }

  /**
   * Stake tokens
   */
  async stakeTokens(userId, amount, tier = 'bronze') {
    try {
      const tierConfig = TOKEN_CONFIG.stakingTiers[tier];
      
      if (!tierConfig) {
        throw new Error(`Invalid staking tier: ${tier}`);
      }

      if (amount < tierConfig.minAmount) {
        throw new Error(`Minimum stake for ${tier} tier is ${tierConfig.minAmount} TRM`);
      }

      // Check balance
      const balance = await this.getBalance(userId);
      
      if (balance.platformBalance < amount) {
        throw new Error('Insufficient token balance');
      }

      const stakeId = this.generateStakeId();
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + tierConfig.lockPeriod * 24 * 60 * 60 * 1000);

      // Create staking position
      const staking = new TokenStaking({
        stakeId,
        userId,
        amount,
        startDate,
        endDate,
        lockPeriod: tierConfig.lockPeriod,
        apy: tierConfig.apy,
        rewardsEarned: 0,
        status: 'active',
        tier,
        createdAt: new Date()
      });

      await staking.save();

      // Deduct tokens from user
      await GamificationProfile.findOneAndUpdate(
        { userId },
        {
          $inc: { tokens: -amount },
          $push: {
            stakingPositions: stakeId
          }
        }
      );

      logger.info(`User ${userId} staked ${amount} TRM in ${tier} tier`);

      return {
        stakeId,
        userId,
        amount,
        tier,
        apy: tierConfig.apy,
        lockPeriod: tierConfig.lockPeriod,
        startDate,
        endDate,
        estimatedRewards: this.calculateRewards(amount, tierConfig.apy, tierConfig.lockPeriod)
      };
    } catch (error) {
      logger.error('Token staking failed:', error);
      throw error;
    }
  }

  /**
   * Unstake tokens
   */
  async unstakeTokens(userId, stakeId) {
    try {
      const staking = await TokenStaking.findOne({ stakeId, userId });
      
      if (!staking) {
        throw new Error('Staking position not found');
      }

      if (staking.status !== 'active') {
        throw new Error('Staking position is not active');
      }

      // Check if lock period has passed
      const now = new Date();
      const canUnstake = now >= staking.endDate;

      if (!canUnstake) {
        const daysRemaining = Math.ceil((staking.endDate - now) / (1000 * 60 * 60 * 24));
        throw new Error(`Cannot unstake yet. ${daysRemaining} days remaining in lock period`);
      }

      // Calculate final rewards
      const rewards = this.calculateRewards(
        staking.amount,
        staking.apy,
        staking.lockPeriod
      );

      const totalReturn = staking.amount + rewards;

      // Update staking position
      staking.status = 'completed';
      staking.rewardsEarned = rewards;
      staking.unstakedAt = new Date();
      await staking.save();

      // Return tokens + rewards to user
      await GamificationProfile.findOneAndUpdate(
        { userId },
        {
          $inc: { tokens: totalReturn },
          $pull: { stakingPositions: stakeId }
        }
      );

      // Record transaction
      await TokenTransaction.create({
        txId: this.generateTxId(),
        type: 'unstake',
        fromUserId: null,
        toUserId: userId,
        amount: totalReturn,
        tokenType: 'trm',
        purpose: 'staking-return',
        status: 'completed',
        metadata: {
          stakeId,
          principal: staking.amount,
          rewards
        }
      });

      logger.info(`User ${userId} unstaked ${staking.amount} TRM with ${rewards} rewards`);

      return {
        stakeId,
        principal: staking.amount,
        rewards,
        totalReturn,
        newBalance: await this.getBalance(userId)
      };
    } catch (error) {
      logger.error('Token unstaking failed:', error);
      throw error;
    }
  }

  /**
   * Claim staking rewards (without unstaking)
   */
  async claimRewards(userId, stakeId) {
    try {
      const staking = await TokenStaking.findOne({ stakeId, userId });
      
      if (!staking || staking.status !== 'active') {
        throw new Error('Staking position not found or not active');
      }

      // Calculate rewards since last claim
      const now = new Date();
      const daysStaked = Math.floor((now - (staking.lastClaimDate || staking.startDate)) / (1000 * 60 * 60 * 24));
      
      if (daysStaked < 1) {
        throw new Error('No rewards available to claim yet');
      }

      const dailyReward = (staking.amount * (staking.apy / 100)) / 365;
      const claimableRewards = dailyReward * daysStaked;

      // Update staking position
      staking.rewardsEarned += claimableRewards;
      staking.lastClaimDate = now;
      await staking.save();

      // Add rewards to user balance
      await GamificationProfile.findOneAndUpdate(
        { userId },
        {
          $inc: { tokens: claimableRewards }
        }
      );

      // Record transaction
      await TokenTransaction.create({
        txId: this.generateTxId(),
        type: 'earn',
        fromUserId: null,
        toUserId: userId,
        amount: claimableRewards,
        tokenType: 'trm',
        purpose: 'staking-reward',
        status: 'completed',
        metadata: { stakeId, daysStaked }
      });

      logger.info(`User ${userId} claimed ${claimableRewards} TRM rewards from stake ${stakeId}`);

      return {
        stakeId,
        claimedAmount: claimableRewards,
        daysStaked,
        newBalance: await this.getBalance(userId)
      };
    } catch (error) {
      logger.error('Reward claim failed:', error);
      throw error;
    }
  }

  /**
   * Calculate staking rewards
   */
  calculateRewards(amount, apy, lockPeriodDays) {
    const annualReward = amount * (apy / 100);
    const dailyReward = annualReward / 365;
    return dailyReward * lockPeriodDays;
  }

  /**
   * Get staking positions for user
   */
  async getStakingPositions(userId, status = null) {
    try {
      const query = { userId };
      if (status) query.status = status;

      const positions = await TokenStaking.find(query)
        .sort({ createdAt: -1 });

      // Calculate current values
      const enrichedPositions = positions.map(pos => {
        const now = new Date();
        const daysStaked = Math.floor((now - pos.startDate) / (1000 * 60 * 60 * 24));
        const accruedRewards = this.calculateRewards(pos.amount, pos.apy, daysStaked);
        const canUnstake = now >= pos.endDate;
        const daysRemaining = canUnstake ? 0 : Math.ceil((pos.endDate - now) / (1000 * 60 * 60 * 24));

        return {
          ...pos.toObject(),
          daysStaked,
          accruedRewards,
          canUnstake,
          daysRemaining,
          totalValue: pos.amount + accruedRewards
        };
      });

      const stats = {
        totalStaked: enrichedPositions
          .filter(p => p.status === 'active')
          .reduce((sum, p) => sum + p.amount, 0),
        totalRewards: enrichedPositions
          .reduce((sum, p) => sum + p.accruedRewards, 0),
        activePositions: enrichedPositions.filter(p => p.status === 'active').length,
        completedPositions: enrichedPositions.filter(p => p.status === 'completed').length
      };

      return {
        positions: enrichedPositions,
        stats
      };
    } catch (error) {
      logger.error('Failed to get staking positions:', error);
      throw error;
    }
  }

  /**
   * Get token transaction history
   */
  async getTransactionHistory(userId, filters = {}) {
    try {
      const query = {
        $or: [{ fromUserId: userId }, { toUserId: userId }]
      };

      if (filters.type) query.type = filters.type;
      if (filters.purpose) query.purpose = filters.purpose;
      if (filters.status) query.status = filters.status;

      const transactions = await TokenTransaction.find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit || 50)
        .select('-__v');

      return transactions;
    } catch (error) {
      logger.error('Failed to get transaction history:', error);
      throw error;
    }
  }

  /**
   * Get staking tiers
   */
  getStakingTiers() {
    return {
      tiers: TOKEN_CONFIG.stakingTiers,
      benefits: TOKEN_BENEFITS
    };
  }

  /**
   * Calculate fee discount based on token holdings
   */
  async calculateFeeDiscount(userId) {
    try {
      const balance = await this.getBalance(userId);
      const totalTokens = balance.totalBalance;

      let discount = 0;
      let tier = 'none';

      const tiers = TOKEN_BENEFITS.feeDiscount.tiers;
      
      if (totalTokens >= tiers.platinum.minTokens) {
        discount = tiers.platinum.discount;
        tier = 'platinum';
      } else if (totalTokens >= tiers.gold.minTokens) {
        discount = tiers.gold.discount;
        tier = 'gold';
      } else if (totalTokens >= tiers.silver.minTokens) {
        discount = tiers.silver.discount;
        tier = 'silver';
      } else if (totalTokens >= tiers.holder.minTokens) {
        discount = tiers.holder.discount;
        tier = 'holder';
      }

      return {
        userId,
        totalTokens,
        discount,
        tier,
        discountPercentage: `${discount}%`
      };
    } catch (error) {
      logger.error('Failed to calculate fee discount:', error);
      throw error;
    }
  }

  /**
   * Process referral reward
   */
  async processReferralReward(referrerId, referredId) {
    try {
      const reward = TOKEN_CONFIG.distribution.referralReward;
      
      const result = await this.earnTokens(
        referrerId,
        reward,
        'referral',
        { referredUserId: referredId }
      );

      logger.info(`Referral reward processed: ${referrerId} earned ${reward} TRM`);

      return result;
    } catch (error) {
      logger.error('Referral reward processing failed:', error);
      throw error;
    }
  }

  /**
   * Process hire reward
   */
  async processHireReward(recruiterId, hireId) {
    try {
      const reward = TOKEN_CONFIG.distribution.hireReward;
      
      const result = await this.earnTokens(
        recruiterId,
        reward,
        'hire',
        { hireId }
      );

      logger.info(`Hire reward processed: ${recruiterId} earned ${reward} TRM`);

      return result;
    } catch (error) {
      logger.error('Hire reward processing failed:', error);
      throw error;
    }
  }

  /**
   * Get token statistics
   */
  async getTokenStats() {
    try {
      const stats = await TokenTransaction.aggregate([
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: 1 },
            totalEarned: {
              $sum: {
                $cond: [{ $eq: ['$type', 'earn'] }, '$amount', 0]
              }
            },
            totalSpent: {
              $sum: {
                $cond: [{ $eq: ['$type', 'spend'] }, '$amount', 0]
              }
            },
            totalTransferred: {
              $sum: {
                $cond: [{ $eq: ['$type', 'transfer'] }, '$amount', 0]
              }
            }
          }
        }
      ]);

      const stakingStats = await TokenStaking.aggregate([
        {
          $group: {
            _id: null,
            totalStaked: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, '$amount', 0] }
            },
            totalRewardsPaid: { $sum: '$rewardsEarned' },
            activeStakers: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            }
          }
        }
      ]);

      return {
        transactions: stats[0] || {},
        staking: stakingStats[0] || {},
        config: {
          totalSupply: TOKEN_CONFIG.totalSupply,
          distribution: TOKEN_CONFIG.distribution
        }
      };
    } catch (error) {
      logger.error('Failed to get token stats:', error);
      throw error;
    }
  }

  /**
   * Withdraw tokens to wallet (on-chain)
   */
  async withdrawToWallet(userId, amount, walletAddress, network = 'polygon') {
    try {
      // Check balance
      const balance = await this.getBalance(userId);
      
      if (balance.platformBalance < amount) {
        throw new Error('Insufficient token balance');
      }

      // Get token contract
      const tokenContract = await SmartContract.findOne({
        type: 'token',
        network,
        status: 'active'
      });

      if (!tokenContract) {
        throw new Error('Token contract not found');
      }

      // Execute transfer on-chain
      const contractInstance = await smartContractService.loadContract(
        tokenContract.contractId,
        network,
        true
      );

      const tx = await contractInstance.transfer(
        walletAddress,
        ethers.parseUnits(amount.toString(), 18)
      );

      const receipt = await tx.wait();

      // Deduct from platform balance
      await GamificationProfile.findOneAndUpdate(
        { userId },
        { $inc: { tokens: -amount } }
      );

      // Record transaction
      const txId = this.generateTxId();
      await TokenTransaction.create({
        txId,
        type: 'transfer',
        fromUserId: userId,
        toUserId: null,
        amount,
        tokenType: 'trm',
        purpose: 'withdrawal',
        txHash: tx.hash,
        status: 'confirmed',
        metadata: {
          walletAddress,
          network
        }
      });

      logger.info(`User ${userId} withdrew ${amount} TRM to ${walletAddress}`);

      return {
        txId,
        txHash: tx.hash,
        amount,
        walletAddress,
        network,
        newBalance: await this.getBalance(userId)
      };
    } catch (error) {
      logger.error('Token withdrawal failed:', error);
      throw error;
    }
  }
}

module.exports = new TokenService();
