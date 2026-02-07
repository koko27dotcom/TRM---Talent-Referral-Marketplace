/**
 * Challenge Engine Service
 * Manages dynamic challenges, progress tracking, and rewards
 */

const {
  Challenge,
  CHALLENGE_TYPES, 
  TARGET_ACTIONS,
  CHALLENGE_DIFFICULTY,
  PREDEFINED_CHALLENGES 
} = require('../models/Challenge.js');
const GamificationProfile = require('../models/GamificationProfile.js');
const UserActivity = require('../models/UserActivity.js');
const Notification = require('../models/Notification.js');

class ChallengeEngine {
  constructor() {
    this.activeChallenges = new Map();
  }

  /**
   * Initialize challenges
   */
  async initialize() {
    try {
      // Create special/milestone challenges
      await Challenge.initializeSpecialChallenges();
      
      // Create daily challenges
      await this.createDailyChallenges();
      
      // Create weekly challenges
      await this.createWeeklyChallenges();
      
      console.log('Challenge engine initialized');
    } catch (error) {
      console.error('Error initializing challenge engine:', error);
      throw error;
    }
  }

  /**
   * Create daily challenges
   */
  async createDailyChallenges() {
    try {
      const created = await Challenge.createDailyChallenges();
      
      // Notify users about new daily challenges
      if (created.length > 0) {
        // This could be batched or done via push notification
        console.log(`Created ${created.length} daily challenges`);
      }
      
      return created;
    } catch (error) {
      console.error('Error creating daily challenges:', error);
      return [];
    }
  }

  /**
   * Create weekly challenges
   */
  async createWeeklyChallenges() {
    try {
      const created = await Challenge.createWeeklyChallenges();
      
      if (created.length > 0) {
        console.log(`Created ${created.length} weekly challenges`);
      }
      
      return created;
    } catch (error) {
      console.error('Error creating weekly challenges:', error);
      return [];
    }
  }

  /**
   * Get active challenges for a user
   */
  async getActiveChallenges(userId, options = {}) {
    try {
      const { type, difficulty } = options;
      
      const challenges = await Challenge.getForUser(userId, { type, difficulty });
      
      // Sort: featured first, then by time remaining
      return challenges.sort((a, b) => {
        if (a.isFeatured !== b.isFeatured) return b.isFeatured ? 1 : -1;
        return a.timeRemaining - b.timeRemaining;
      });
    } catch (error) {
      console.error('Error getting active challenges:', error);
      throw error;
    }
  }

  /**
   * Get challenge details
   */
  async getChallenge(challengeId, userId = null) {
    try {
      const challenge = await Challenge.findById(challengeId);
      
      if (!challenge) return null;
      
      const result = challenge.toObject();
      
      if (userId) {
        result.userProgress = challenge.getUserProgress(userId);
        result.isParticipating = challenge.isUserParticipating(userId);
        result.hasCompleted = challenge.hasUserCompleted(userId);
      }
      
      return result;
    } catch (error) {
      console.error('Error getting challenge:', error);
      throw error;
    }
  }

  /**
   * Join a challenge
   */
  async joinChallenge(userId, challengeId) {
    try {
      const challenge = await Challenge.findById(challengeId);
      
      if (!challenge) {
        return { success: false, message: 'Challenge not found' };
      }
      
      const result = challenge.join(userId);
      
      if (result.success) {
        await challenge.save();
        
        // Log activity
        await UserActivity.log({
          userId,
          actionType: 'challenge_joined',
          actionCategory: 'engagement',
          actionDetails: { challengeId: challenge._id },
          relatedEntities: { challengeId: challenge._id },
        });
        
        // Send notification
        await Notification.create({
          userId,
          type: 'CHALLENGE_JOINED',
          title: 'Challenge Joined! 🎯',
          message: `You've joined the "${challenge.title}" challenge!`,
          data: {
            challengeId: challenge._id,
            title: challenge.title,
            targetCount: challenge.targetCount,
          },
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error joining challenge:', error);
      throw error;
    }
  }

  /**
   * Update challenge progress
   */
  async updateProgress(userId, actionType, metadata = {}) {
    try {
      const updatedChallenges = [];
      
      // Get user's active challenges
      const challenges = await Challenge.getUserActiveChallenges(userId);
      
      // Map action type to challenge target action
      const actionMap = {
        'referral_submitted': TARGET_ACTIONS.SUBMIT_REFERRAL,
        'referral_hired': TARGET_ACTIONS.GET_HIRE,
        'share_job': TARGET_ACTIONS.SHARE_JOB,
        'profile_complete': TARGET_ACTIONS.COMPLETE_PROFILE,
        'login': TARGET_ACTIONS.LOGIN,
        'invite_sent': TARGET_ACTIONS.INVITE_FRIEND,
        'payout_received': TARGET_ACTIONS.EARN_PAYOUT,
      };
      
      const targetAction = actionMap[actionType];
      if (!targetAction) return updatedChallenges;
      
      for (const challenge of challenges) {
        if (challenge.targetAction === targetAction) {
          const progress = challenge.updateProgress(userId, metadata.count || 1);
          
          if (progress.success) {
            await challenge.save();
            
            const userProgress = challenge.getUserProgress(userId);
            
            updatedChallenges.push({
              challengeId: challenge._id,
              title: challenge.title,
              completed: progress.completed,
              progress: userProgress,
            });
            
            // Handle completion
            if (progress.completed) {
              await this.handleChallengeCompletion(userId, challenge, progress);
            }
          }
        }
      }
      
      return updatedChallenges;
    } catch (error) {
      console.error('Error updating challenge progress:', error);
      return [];
    }
  }

  /**
   * Handle challenge completion
   */
  async handleChallengeCompletion(userId, challenge, progress) {
    try {
      // Log activity
      await UserActivity.log({
        userId,
        actionType: 'challenge_completed',
        actionCategory: 'reward',
        actionDetails: {
          challengeId: challenge._id,
          completionTime: progress.completionTime,
        },
        relatedEntities: { challengeId: challenge._id },
      });
      
      // Send notification
      await Notification.create({
        userId,
        type: 'CHALLENGE_COMPLETED',
        title: 'Challenge Completed! 🎉',
        message: `You've completed the "${challenge.title}" challenge!`,
        data: {
          challengeId: challenge._id,
          title: challenge.title,
          rewardPoints: challenge.rewardPoints,
          rewardBadgeId: challenge.rewardBadgeId,
        },
      });
    } catch (error) {
      console.error('Error handling challenge completion:', error);
    }
  }

  /**
   * Claim challenge reward
   */
  async claimReward(userId, challengeId) {
    try {
      const challenge = await Challenge.findById(challengeId);
      
      if (!challenge) {
        return { success: false, message: 'Challenge not found' };
      }
      
      const result = challenge.claimReward(userId);
      
      if (!result.success) {
        return result;
      }
      
      await challenge.save();
      
      // Apply rewards
      const profile = await GamificationProfile.findOne({ userId });
      if (profile) {
        // Award points
        if (result.rewards.points > 0) {
          profile.addPoints(result.rewards.points, 'challenge_reward');
        }
        
        // Award loot box
        if (result.rewards.lootBox) {
          profile.lootBoxesAvailable += 1;
        }
        
        // Apply boost
        if (result.rewards.boost && result.rewards.boost.type) {
          profile.addBoost(
            result.rewards.boost.type,
            result.rewards.boost.multiplier,
            result.rewards.boost.duration
          );
        }
        
        await profile.save();
      }
      
      // Log activity
      await UserActivity.log({
        userId,
        actionType: 'points_earned',
        actionCategory: 'reward',
        actionDetails: {
          source: 'challenge',
          challengeId: challenge._id,
        },
        pointsEarned: result.rewards.points,
      });
      
      return {
        success: true,
        rewards: result.rewards,
      };
    } catch (error) {
      console.error('Error claiming challenge reward:', error);
      throw error;
    }
  }

  /**
   * Get user's challenge progress
   */
  async getUserProgress(userId) {
    try {
      // Get active challenges
      const activeChallenges = await Challenge.getUserActiveChallenges(userId);
      
      // Get completed challenges
      const completedChallenges = await Challenge.getUserCompletedChallenges(userId);
      
      // Calculate stats
      const totalJoined = await Challenge.countDocuments({
        'participants.userId': userId,
      });
      
      const totalCompleted = completedChallenges.length;
      
      const totalPointsEarned = completedChallenges.reduce((sum, c) => {
        const participant = c.participants.find(
          p => p.userId.toString() === userId.toString()
        );
        if (participant && participant.rewardClaimed) {
          return sum + c.rewardPoints;
        }
        return sum;
      }, 0);
      
      return {
        active: activeChallenges.map(c => ({
          ...c.toObject(),
          userProgress: c.getUserProgress(userId),
        })),
        completed: totalCompleted,
        totalJoined,
        completionRate: totalJoined > 0 ? (totalCompleted / totalJoined) * 100 : 0,
        totalPointsEarned,
      };
    } catch (error) {
      console.error('Error getting user challenge progress:', error);
      throw error;
    }
  }

  /**
   * Create a custom challenge (admin only)
   */
  async createChallenge(challengeData) {
    try {
      const challenge = new Challenge(challengeData);
      await challenge.save();
      
      return challenge;
    } catch (error) {
      console.error('Error creating challenge:', error);
      throw error;
    }
  }

  /**
   * Update a challenge (admin only)
   */
  async updateChallenge(challengeId, updates) {
    try {
      const challenge = await Challenge.findByIdAndUpdate(
        challengeId,
        { $set: updates },
        { new: true }
      );
      
      return challenge;
    } catch (error) {
      console.error('Error updating challenge:', error);
      throw error;
    }
  }

  /**
   * Delete a challenge (admin only)
   */
  async deleteChallenge(challengeId) {
    try {
      const result = await Challenge.findByIdAndDelete(challengeId);
      return !!result;
    } catch (error) {
      console.error('Error deleting challenge:', error);
      throw error;
    }
  }

  /**
   * Get challenge statistics
   */
  async getStatistics() {
    try {
      const stats = await Challenge.getStatistics();
      
      // Get additional metrics
      const totalActive = await Challenge.countDocuments({
        isActive: true,
        endDate: { $gte: new Date() },
      });
      
      const featuredChallenges = await Challenge.find({
        isFeatured: true,
        isActive: true,
      });
      
      return {
        byType: stats,
        totalActive,
        featuredCount: featuredChallenges.length,
      };
    } catch (error) {
      console.error('Error getting challenge statistics:', error);
      throw error;
    }
  }

  /**
   * Clean up expired challenges
   */
  async cleanupExpired() {
    try {
      const deactivated = await Challenge.deactivateExpired();
      console.log(`Deactivated ${deactivated} expired challenges`);
      return deactivated;
    } catch (error) {
      console.error('Error cleaning up expired challenges:', error);
      return 0;
    }
  }

  /**
   * Auto-join users to challenges
   */
  async autoJoinChallenges(userId, challengeTypes = [CHALLENGE_TYPES.SPECIAL, CHALLENGE_TYPES.MILESTONE]) {
    try {
      const challenges = await Challenge.find({
        type: { $in: challengeTypes },
        isActive: true,
        endDate: { $gte: new Date() },
      });
      
      const joined = [];
      
      for (const challenge of challenges) {
        if (!challenge.isUserParticipating(userId)) {
          const result = challenge.join(userId);
          if (result.success) {
            await challenge.save();
            joined.push(challenge._id);
          }
        }
      }
      
      return joined;
    } catch (error) {
      console.error('Error auto-joining challenges:', error);
      return [];
    }
  }

  /**
   * Get challenge recommendations for user
   */
  async getRecommendations(userId, limit = 3) {
    try {
      const profile = await GamificationProfile.findOne({ userId });
      
      if (!profile) return [];
      
      // Get challenges user hasn't joined
      const availableChallenges = await Challenge.find({
        isActive: true,
        endDate: { $gte: new Date() },
        'participants.userId': { $ne: userId },
      });
      
      // Score challenges based on user profile
      const scoredChallenges = availableChallenges.map(challenge => {
        let score = 0;
        
        // Prefer challenges matching user's strengths
        if (challenge.targetAction === 'submit_referral' && profile.referralCount > 0) {
          score += 10;
        }
        if (challenge.targetAction === 'share_job' && profile.shareCount > 0) {
          score += 10;
        }
        
        // Prefer easier challenges for new users
        if (profile.currentLevel < 5 && challenge.difficulty === 'easy') {
          score += 5;
        }
        
        // Prefer challenges with better rewards
        score += challenge.rewardPoints / 100;
        
        // Prefer featured challenges
        if (challenge.isFeatured) score += 3;
        
        return { challenge, score };
      });
      
      // Sort by score and return top recommendations
      return scoredChallenges
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => item.challenge);
    } catch (error) {
      console.error('Error getting challenge recommendations:', error);
      return [];
    }
  }

  /**
   * Get difficulty label
   */
  getDifficultyLabel(difficulty) {
    const labels = {
      [CHALLENGE_DIFFICULTY.EASY]: 'Easy',
      [CHALLENGE_DIFFICULTY.MEDIUM]: 'Medium',
      [CHALLENGE_DIFFICULTY.HARD]: 'Hard',
      [CHALLENGE_DIFFICULTY.EXPERT]: 'Expert',
    };
    return labels[difficulty] || difficulty;
  }

  /**
   * Get difficulty color
   */
  getDifficultyColor(difficulty) {
    const colors = {
      [CHALLENGE_DIFFICULTY.EASY]: '#10B981',
      [CHALLENGE_DIFFICULTY.MEDIUM]: '#F59E0B',
      [CHALLENGE_DIFFICULTY.HARD]: '#EF4444',
      [CHALLENGE_DIFFICULTY.EXPERT]: '#8B5CF6',
    };
    return colors[difficulty] || '#9CA3AF';
  }

  /**
   * Get type label
   */
  getTypeLabel(type) {
    const labels = {
      [CHALLENGE_TYPES.DAILY]: 'Daily',
      [CHALLENGE_TYPES.WEEKLY]: 'Weekly',
      [CHALLENGE_TYPES.SPECIAL]: 'Special',
      [CHALLENGE_TYPES.SEASONAL]: 'Seasonal',
      [CHALLENGE_TYPES.MILESTONE]: 'Milestone',
    };
    return labels[type] || type;
  }
}

const challengeEngine = new ChallengeEngine();
module.exports = challengeEngine;
