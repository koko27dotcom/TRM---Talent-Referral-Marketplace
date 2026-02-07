/**
 * Immutable Review Service
 * Blockchain-verified reviews with on-chain storage and reward distribution
 */

const crypto = require('crypto');
const { ethers } = require('ethers');
const ImmutableReview = require('../models/ImmutableReview');
const SmartContract = require('../models/SmartContract');
const BlockchainTransaction = require('../models/BlockchainTransaction');
const User = require('../models/User');
const Company = require('../models/Company');
const blockchainService = require('./blockchainService');
const smartContractService = require('./smartContractService');
const tokenService = require('./tokenService');
const logger = require('../utils/logger');

// Review types
const REVIEW_TYPES = {
  candidate: 'candidate',
  company: 'company',
  job: 'job',
  referrer: 'referrer'
};

// Review status
const REVIEW_STATUS = {
  pending: 'pending',
  confirmed: 'confirmed',
  disputed: 'disputed',
  resolved: 'resolved'
};

// Reward configuration
const REWARD_CONFIG = {
  baseReward: 10, // TRM tokens for submitting a review
  qualityMultiplier: {
    detailed: 1.5,  // Reviews with >100 chars
    withEvidence: 2.0,  // Reviews with proof
    verified: 3.0   // Reviews from verified users
  }
};

class ImmutableReviewService {
  constructor() {
    this.reviewCache = new Map();
  }

  /**
   * Generate unique review ID
   */
  generateReviewId() {
    return `REV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Hash review content
   */
  hashReviewContent(content) {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(content))
      .digest('hex');
  }

  /**
   * Submit review to blockchain
   */
  async submitReview(reviewData) {
    try {
      const {
        reviewerId,
        reviewerAddress,
        revieweeId,
        revieweeType,
        revieweeAddress,
        rating,
        content,
        metadata = {},
        network = 'polygon'
      } = reviewData;

      // Validate inputs
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      if (!content || content.length < 10) {
        throw new Error('Review content must be at least 10 characters');
      }

      // Check for duplicate review
      const existingReview = await ImmutableReview.findOne({
        reviewerAddress: reviewerAddress.toLowerCase(),
        revieweeAddress: revieweeAddress.toLowerCase()
      });

      if (existingReview) {
        throw new Error('You have already reviewed this entity');
      }

      const reviewId = this.generateReviewId();

      // Hash the review content
      const contentHash = this.hashReviewContent({
        reviewerAddress,
        revieweeAddress,
        rating,
        content,
        timestamp: Date.now()
      });

      // Get review registry contract
      const contract = await SmartContract.findOne({
        type: 'review',
        network,
        status: 'active'
      });

      let txHash = null;
      let blockNumber = null;

      // If contract exists, submit to blockchain
      if (contract) {
        const contractInstance = await smartContractService.loadContract(
          contract.contractId,
          network,
          true
        );

        // Submit review to contract
        const tx = await contractInstance.submitReview(
          revieweeAddress,
          rating,
          contentHash,
          revieweeType
        );

        const receipt = await tx.wait();
        txHash = tx.hash;
        blockNumber = receipt.blockNumber;

        logger.info(`Review ${reviewId} submitted to blockchain: ${txHash}`);
      }

      // Create review record
      const review = new ImmutableReview({
        reviewId,
        reviewerAddress: reviewerAddress.toLowerCase(),
        revieweeAddress: revieweeAddress.toLowerCase(),
        revieweeType,
        rating,
        contentHash,
        content, // Store content for display (encrypted in production)
        txHash,
        blockNumber,
        timestamp: new Date(),
        helpfulVotes: 0,
        status: txHash ? REVIEW_STATUS.confirmed : REVIEW_STATUS.pending,
        metadata: {
          ...metadata,
          reviewerId,
          revieweeId,
          network
        },
        createdAt: new Date()
      });

      await review.save();

      // Record blockchain transaction
      if (txHash) {
        await BlockchainTransaction.create({
          txId: `TX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          txHash,
          contractId: contract?.contractId,
          network,
          fromAddress: reviewerAddress,
          toAddress: contract?.contractAddress,
          value: '0',
          status: 'confirmed',
          blockNumber,
          purpose: 'review-submission',
          relatedId: reviewId,
          metadata: {
            rating,
            contentHash,
            revieweeType
          }
        });
      }

      // Calculate and distribute rewards
      const reward = await this.calculateAndDistributeReward(
        reviewerId,
        review,
        metadata
      );

      // Update reviewee's review stats
      await this.updateRevieweeStats(revieweeId, revieweeType, rating);

      logger.info(`Review ${reviewId} submitted successfully`);

      return {
        reviewId,
        txHash,
        blockNumber,
        contentHash,
        status: review.status,
        reward
      };
    } catch (error) {
      logger.error('Review submission failed:', error);
      throw error;
    }
  }

  /**
   * Calculate and distribute review rewards
   */
  async calculateAndDistributeReward(reviewerId, review, metadata) {
    try {
      let reward = REWARD_CONFIG.baseReward;
      let multipliers = [];

      // Quality multiplier for detailed reviews
      if (review.content.length > 100) {
        reward *= REWARD_CONFIG.qualityMultiplier.detailed;
        multipliers.push('detailed');
      }

      // Evidence multiplier
      if (metadata.evidence && metadata.evidence.length > 0) {
        reward *= REWARD_CONFIG.qualityMultiplier.withEvidence;
        multipliers.push('withEvidence');
      }

      // Verified user multiplier
      const reviewer = await User.findById(reviewerId);
      if (reviewer?.isVerified) {
        reward *= REWARD_CONFIG.qualityMultiplier.verified;
        multipliers.push('verified');
      }

      reward = Math.floor(reward);

      // Award tokens
      await tokenService.earnTokens(reviewerId, reward, 'review-reward', {
        reviewId: review.reviewId,
        multipliers
      });

      return {
        amount: reward,
        multipliers,
        baseAmount: REWARD_CONFIG.baseReward
      };
    } catch (error) {
      logger.error('Reward distribution failed:', error);
      // Don't throw - review is still valid even if reward fails
      return null;
    }
  }

  /**
   * Update reviewee statistics
   */
  async updateRevieweeStats(revieweeId, revieweeType, rating) {
    try {
      if (revieweeType === REVIEW_TYPES.company) {
        await Company.findByIdAndUpdate(revieweeId, {
          $inc: {
            'reviews.count': 1,
            'reviews.totalRating': rating
          },
          $set: {
            'reviews.averageRating': {
              $divide: [
                { $add: ['$reviews.totalRating', rating] },
                { $add: ['$reviews.count', 1] }
              ]
            }
          }
        });
      } else if (revieweeType === REVIEW_TYPES.candidate) {
        await User.findByIdAndUpdate(revieweeId, {
          $inc: {
            'reviews.received': 1,
            'reviews.totalRating': rating
          }
        });
      }
    } catch (error) {
      logger.error('Failed to update reviewee stats:', error);
    }
  }

  /**
   * Verify review authenticity
   */
  async verifyReview(reviewId) {
    try {
      const review = await ImmutableReview.findOne({ reviewId });
      
      if (!review) {
        throw new Error('Review not found');
      }

      if (!review.txHash) {
        return {
          reviewId,
          isValid: false,
          reason: 'Review not stored on blockchain'
        };
      }

      // Get transaction receipt
      const receipt = await blockchainService.getTransactionReceipt(
        review.metadata?.network || 'polygon',
        review.txHash
      );

      if (!receipt) {
        return {
          reviewId,
          isValid: false,
          reason: 'Transaction not found on blockchain'
        };
      }

      // Verify content hash matches
      const recalculatedHash = this.hashReviewContent({
        reviewerAddress: review.reviewerAddress,
        revieweeAddress: review.revieweeAddress,
        rating: review.rating,
        content: review.content,
        timestamp: new Date(review.timestamp).getTime()
      });

      const hashMatches = recalculatedHash === review.contentHash;

      // Get contract for additional verification
      const contract = await SmartContract.findOne({
        type: 'review',
        network: review.metadata?.network
      });

      return {
        reviewId,
        isValid: receipt.status === 'success' && hashMatches,
        onChain: {
          txHash: review.txHash,
          blockNumber: review.blockNumber,
          status: receipt.status,
          confirmations: receipt.confirmations
        },
        verification: {
          hashMatches,
          contentHash: review.contentHash,
          recalculatedHash
        },
        explorerUrl: blockchainService.getExplorerUrl(
          review.metadata?.network || 'polygon',
          review.txHash,
          'tx'
        )
      };
    } catch (error) {
      logger.error('Review verification failed:', error);
      throw error;
    }
  }

  /**
   * Get review details
   */
  async getReview(reviewId) {
    try {
      const review = await ImmutableReview.findOne({ reviewId });
      
      if (!review) {
        throw new Error('Review not found');
      }

      // Get reviewer and reviewee details
      const reviewer = await User.findOne({
        walletAddress: review.reviewerAddress
      }).select('name avatar');

      let reviewee = null;
      if (review.revieweeType === REVIEW_TYPES.company) {
        reviewee = await Company.findById(review.metadata?.revieweeId)
          .select('name logo');
      } else {
        reviewee = await User.findById(review.metadata?.revieweeId)
          .select('name avatar');
      }

      // Check if user can edit (within 24 hours)
      const canEdit = new Date() - review.createdAt < 24 * 60 * 60 * 1000;

      return {
        ...review.toObject(),
        reviewer: reviewer ? {
          name: reviewer.name,
          avatar: reviewer.avatar,
          address: review.reviewerAddress
        } : null,
        reviewee: reviewee ? {
          name: reviewee.name,
          avatar: reviewee.logo || reviewee.avatar,
          type: review.revieweeType
        } : null,
        canEdit,
        age: this.calculateAge(review.createdAt)
      };
    } catch (error) {
      logger.error('Failed to get review:', error);
      throw error;
    }
  }

  /**
   * Get reviews for an address
   */
  async getReviewsForAddress(address, options = {}) {
    try {
      const query = {
        revieweeAddress: address.toLowerCase()
      };

      if (options.type) query.revieweeType = options.type;
      if (options.status) query.status = options.status;

      const reviews = await ImmutableReview.find(query)
        .sort(options.sort || { createdAt: -1 })
        .limit(options.limit || 50);

      // Calculate statistics
      const stats = await ImmutableReview.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            averageRating: { $avg: '$rating' },
            ratingDistribution: {
              $push: '$rating'
            }
          }
        }
      ]);

      const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
        rating,
        count: reviews.filter(r => r.rating === rating).length
      }));

      return {
        reviews,
        stats: stats[0] ? {
          ...stats[0],
          ratingDistribution
        } : null
      };
    } catch (error) {
      logger.error('Failed to get reviews:', error);
      throw error;
    }
  }

  /**
   * Get reviews by reviewer
   */
  async getReviewsByReviewer(address, options = {}) {
    try {
      const query = {
        reviewerAddress: address.toLowerCase()
      };

      if (options.type) query.revieweeType = options.type;

      const reviews = await ImmutableReview.find(query)
        .sort({ createdAt: -1 })
        .limit(options.limit || 50);

      return reviews;
    } catch (error) {
      logger.error('Failed to get reviewer reviews:', error);
      throw error;
    }
  }

  /**
   * Vote review as helpful
   */
  async voteHelpful(reviewId, voterAddress) {
    try {
      const review = await ImmutableReview.findOne({ reviewId });
      
      if (!review) {
        throw new Error('Review not found');
      }

      // Check if already voted
      const hasVoted = review.voters?.some(
        v => v.address.toLowerCase() === voterAddress.toLowerCase()
      );

      if (hasVoted) {
        throw new Error('You have already voted on this review');
      }

      // Add vote
      review.helpfulVotes += 1;
      review.voters = review.voters || [];
      review.voters.push({
        address: voterAddress.toLowerCase(),
        votedAt: new Date()
      });

      await review.save();

      logger.info(`Helpful vote added to review ${reviewId}`);

      return {
        reviewId,
        helpfulVotes: review.helpfulVotes
      };
    } catch (error) {
      logger.error('Failed to vote helpful:', error);
      throw error;
    }
  }

  /**
   * Dispute review
   */
  async disputeReview(reviewId, disputeData) {
    try {
      const { reason, evidence, disputerAddress } = disputeData;

      const review = await ImmutableReview.findOne({ reviewId });
      
      if (!review) {
        throw new Error('Review not found');
      }

      if (review.status === REVIEW_STATUS.disputed) {
        throw new Error('Review is already under dispute');
      }

      review.status = REVIEW_STATUS.disputed;
      review.dispute = {
        reason,
        evidence,
        disputerAddress: disputerAddress.toLowerCase(),
        createdAt: new Date(),
        status: 'pending'
      };

      await review.save();

      logger.info(`Review ${reviewId} disputed by ${disputerAddress}`);

      return {
        reviewId,
        status: review.status,
        dispute: review.dispute
      };
    } catch (error) {
      logger.error('Review dispute failed:', error);
      throw error;
    }
  }

  /**
   * Resolve dispute
   */
  async resolveDispute(reviewId, resolution) {
    try {
      const { decision, moderatorId, notes } = resolution;

      const review = await ImmutableReview.findOne({ reviewId });
      
      if (!review) {
        throw new Error('Review not found');
      }

      if (review.status !== REVIEW_STATUS.disputed) {
        throw new Error('Review is not under dispute');
      }

      review.status = decision === 'upheld' 
        ? REVIEW_STATUS.confirmed 
        : REVIEW_STATUS.resolved;
      
      review.dispute.resolvedAt = new Date();
      review.dispute.resolvedBy = moderatorId;
      review.dispute.decision = decision;
      review.dispute.notes = notes;

      await review.save();

      logger.info(`Dispute for review ${reviewId} resolved: ${decision}`);

      return {
        reviewId,
        status: review.status,
        decision
      };
    } catch (error) {
      logger.error('Dispute resolution failed:', error);
      throw error;
    }
  }

  /**
   * Edit review (only within 24 hours)
   */
  async editReview(reviewId, editorAddress, updates) {
    try {
      const review = await ImmutableReview.findOne({ reviewId });
      
      if (!review) {
        throw new Error('Review not found');
      }

      // Verify ownership
      if (review.reviewerAddress.toLowerCase() !== editorAddress.toLowerCase()) {
        throw new Error('Only the reviewer can edit this review');
      }

      // Check time limit
      const age = Date.now() - review.createdAt.getTime();
      if (age > 24 * 60 * 60 * 1000) {
        throw new Error('Review can only be edited within 24 hours');
      }

      // Update content
      if (updates.content) {
        review.content = updates.content;
        review.editedAt = new Date();
        review.isEdited = true;
      }

      if (updates.rating) {
        review.rating = updates.rating;
        review.editedAt = new Date();
        review.isEdited = true;
      }

      // Recalculate hash
      review.contentHash = this.hashReviewContent({
        reviewerAddress: review.reviewerAddress,
        revieweeAddress: review.revieweeAddress,
        rating: review.rating,
        content: review.content,
        timestamp: review.createdAt.getTime()
      });

      await review.save();

      logger.info(`Review ${reviewId} edited`);

      return {
        reviewId,
        isEdited: true,
        editedAt: review.editedAt
      };
    } catch (error) {
      logger.error('Review edit failed:', error);
      throw error;
    }
  }

  /**
   * Get review statistics
   */
  async getReviewStats(options = {}) {
    try {
      const matchStage = {};
      
      if (options.network) matchStage['metadata.network'] = options.network;
      if (options.revieweeType) matchStage.revieweeType = options.revieweeType;

      const stats = await ImmutableReview.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            averageRating: { $avg: '$rating' },
            totalHelpfulVotes: { $sum: '$helpfulVotes' },
            onChainReviews: {
              $sum: { $cond: [{ $ne: ['$txHash', null] }, 1, 0] }
            },
            disputedReviews: {
              $sum: { $cond: [{ $eq: ['$status', 'disputed'] }, 1, 0] }
            }
          }
        }
      ]);

      const ratingDistribution = await ImmutableReview.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$rating',
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      const recentReviews = await ImmutableReview.find(matchStage)
        .sort({ createdAt: -1 })
        .limit(10)
        .select('reviewId rating reviewerAddress createdAt');

      return {
        summary: stats[0] || {},
        ratingDistribution: ratingDistribution.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        recentReviews
      };
    } catch (error) {
      logger.error('Failed to get review stats:', error);
      throw error;
    }
  }

  /**
   * Calculate age string
   */
  calculateAge(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
      }
    }
    
    return 'Just now';
  }

  /**
   * Batch verify reviews
   */
  async batchVerifyReviews(reviewIds) {
    try {
      const results = await Promise.all(
        reviewIds.map(id => this.verifyReview(id).catch(err => ({
          reviewId: id,
          isValid: false,
          error: err.message
        })))
      );

      return {
        total: reviewIds.length,
        valid: results.filter(r => r.isValid).length,
        invalid: results.filter(r => !r.isValid).length,
        results
      };
    } catch (error) {
      logger.error('Batch verification failed:', error);
      throw error;
    }
  }

  /**
   * Sync reviews from blockchain
   */
  async syncFromBlockchain(network = 'polygon', fromBlock = null) {
    try {
      const contract = await SmartContract.findOne({
        type: 'review',
        network,
        status: 'active'
      });

      if (!contract) {
        throw new Error('Review contract not found');
      }

      // Get events from contract
      const provider = blockchainService.getProvider(network);
      const contractInstance = new ethers.Contract(
        contract.contractAddress,
        contract.abi,
        provider
      );

      const startBlock = fromBlock || contract.deploymentBlock || 0;
      const currentBlock = await provider.getBlockNumber();

      // Query ReviewSubmitted events
      const filter = contractInstance.filters.ReviewSubmitted();
      const events = await contractInstance.queryFilter(filter, startBlock, currentBlock);

      const syncedReviews = [];

      for (const event of events) {
        const { reviewer, reviewee, rating, contentHash, reviewType } = event.args;

        // Check if review already exists
        const existing = await ImmutableReview.findOne({
          contentHash,
          reviewerAddress: reviewer.toLowerCase()
        });

        if (!existing) {
          // Create new review from blockchain data
          const review = new ImmutableReview({
            reviewId: this.generateReviewId(),
            reviewerAddress: reviewer.toLowerCase(),
            revieweeAddress: reviewee.toLowerCase(),
            revieweeType: reviewType,
            rating: rating.toNumber(),
            contentHash,
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            timestamp: new Date(),
            status: REVIEW_STATUS.confirmed,
            metadata: {
              network,
              syncedFromBlockchain: true
            }
          });

          await review.save();
          syncedReviews.push(review.reviewId);
        }
      }

      logger.info(`Synced ${syncedReviews.length} reviews from blockchain`);

      return {
        synced: syncedReviews.length,
        fromBlock: startBlock,
        toBlock: currentBlock,
        reviewIds: syncedReviews
      };
    } catch (error) {
      logger.error('Blockchain sync failed:', error);
      throw error;
    }
  }
}

module.exports = new ImmutableReviewService();
