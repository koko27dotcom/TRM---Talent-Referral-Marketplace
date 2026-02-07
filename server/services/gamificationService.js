/**
 * Gamification Service
 * Core service for managing user gamification including points, levels, streaks, and rewards
 */

const GamificationProfile = require('../models/GamificationProfile.js');
const UserActivity = require('../models/UserActivity.js');
const Badge = require('../models/Badge.js');
const Achievement = require('../models/Achievement.js');
const Challenge = require('../models/Challenge.js');
const Notification = require('../models/Notification.js');

// Points configuration
const POINTS_CONFIG = {
  // Action points
  REFERRAL_SUBMITTED: 100,
  REFERRAL_HIRED: 500,
  JOB_SHARED: 10,
  PROFILE_COMPLETED: 50,
  PROFILE_PHOTO_ADDED: 25,
  DAILY_LOGIN: 5,
  INVITE_SENT: 20,
  INVITE_ACCEPTED: 100,
  PAYOUT_REQUESTED: 10,
  PAYOUT_RECEIVED: 50,
  
  // Bonus points
  FIRST_REFERRAL_BONUS: 200,
  STREAK_7_DAY_BONUS: 50,
  STREAK_30_DAY_BONUS: 200,
  LEVEL_UP_BONUS: 100,
  
  // Multipliers
  STREAK_MULTIPLIER_BASE: 1.0,
  STREAK_MULTIPLIER_INCREMENT: 0.1,
  MAX_STREAK_MULTIPLIER: 2.0,
};

// Level configuration
const LEVEL_CONFIG = {
  TIERS: {
    BRONZE: { min: 1, max: 5, name: 'Bronze', color: '#CD7F32' },
    SILVER: { min: 6, max: 10, name: 'Silver', color: '#C0C0C0' },
    GOLD: { min: 11, max: 15, name: 'Gold', color: '#FFD700' },
    PLATINUM: { min: 16, max: 20, name: 'Platinum', color: '#E5E4E2' },
    DIAMOND: { min: 21, max: 100, name: 'Diamond', color: '#B9F2FF' },
  },
};

class GamificationService {
  constructor() {
    this.pointsConfig = POINTS_CONFIG;
  }

  /**
   * Initialize gamification profile for a new user
   */
  async initializeProfile(userId) {
    try {
      let profile = await GamificationProfile.findOne({ userId });
      
      if (!profile) {
        profile = new GamificationProfile({
          userId,
          totalPoints: 0,
          currentLevel: 1,
          tier: 'bronze',
          currentStreak: 0,
          longestStreak: 0,
          badges: [],
          achievements: [],
          activeChallenges: [],
          lootBoxesAvailable: 0,
        });
        
        await profile.save();
        
        // Log activity
        await UserActivity.log({
          userId,
          actionType: 'profile_created',
          actionCategory: 'profile',
          actionDetails: { source: 'initialization' },
        });
      }
      
      return profile;
    } catch (error) {
      console.error('Error initializing gamification profile:', error);
      throw error;
    }
  }

  /**
   * Get user's gamification profile
   */
  async getProfile(userId) {
    try {
      let profile = await GamificationProfile.findOne({ userId })
        .populate('userId', 'displayName name avatar email');
      
      if (!profile) {
        profile = await this.initializeProfile(userId);
      }
      
      // Get level progress
      const levelProgress = profile.getLevelProgress();
      
      // Get unviewed badges count
      const unviewedBadges = profile.getUnviewedBadges();
      
      // Get recent activity
      const recentActivity = await UserActivity.getUserFeed(userId, { limit: 10 });
      
      return {
        profile,
        levelProgress,
        unviewedBadgesCount: unviewedBadges.length,
        recentActivity,
        nextLevelPoints: profile.pointsToNextLevel,
      };
    } catch (error) {
      console.error('Error getting gamification profile:', error);
      throw error;
    }
  }

  /**
   * Award points for an action
   */
  async awardPoints(userId, actionType, metadata = {}) {
    try {
      const profile = await this.initializeProfile(userId);
      
      // Calculate base points
      let points = this.calculateBasePoints(actionType, metadata);
      
      // Apply multipliers
      points = this.applyMultipliers(profile, points, actionType);
      
      // Add points to profile
      const result = profile.addPoints(points, actionType);
      
      // Update activity counts
      this.updateActivityCount(profile, actionType, metadata);
      
      await profile.save();
      
      // Log activity
      const activity = await UserActivity.log({
        userId,
        actionType,
        actionCategory: this.getActionCategory(actionType),
        actionDetails: metadata,
        pointsEarned: points,
        levelUp: result.leveledUp,
        newLevel: result.leveledUp ? result.newLevel : null,
        relatedEntities: metadata.relatedEntities || {},
      });
      
      // Check for achievements
      const achievements = await this.checkAchievements(userId, profile);
      
      // Check for badges
      const badges = await this.checkBadges(userId, profile);
      
      // Update challenges
      const challenges = await this.updateChallenges(userId, actionType, metadata);
      
      // Send notifications if level up
      if (result.leveledUp) {
        await this.sendLevelUpNotification(userId, result.newLevel, result.oldLevel);
      }
      
      return {
        success: true,
        points,
        totalPoints: profile.totalPoints,
        levelUp: result.leveledUp,
        oldLevel: result.oldLevel,
        newLevel: result.newLevel,
        achievements,
        badges,
        challenges,
        lootBoxesAvailable: profile.lootBoxesAvailable,
      };
    } catch (error) {
      console.error('Error awarding points:', error);
      throw error;
    }
  }

  /**
   * Calculate base points for an action
   */
  calculateBasePoints(actionType, metadata = {}) {
    const pointsMap = {
      'referral_submitted': this.pointsConfig.REFERRAL_SUBMITTED,
      'referral_hired': this.pointsConfig.REFERRAL_HIRED,
      'share_job': this.pointsConfig.JOB_SHARED,
      'profile_complete': this.pointsConfig.PROFILE_COMPLETED,
      'profile_photo_added': this.pointsConfig.PROFILE_PHOTO_ADDED,
      'login': this.pointsConfig.DAILY_LOGIN,
      'invite_sent': this.pointsConfig.INVITE_SENT,
      'invite_accepted': this.pointsConfig.INVITE_ACCEPTED,
      'payout_requested': this.pointsConfig.PAYOUT_REQUESTED,
      'payout_received': this.pointsConfig.PAYOUT_RECEIVED,
    };
    
    let points = pointsMap[actionType] || 0;
    
    // Apply first referral bonus
    if (actionType === 'referral_submitted' && metadata.isFirstReferral) {
      points += this.pointsConfig.FIRST_REFERRAL_BONUS;
    }
    
    return points;
  }

  /**
   * Apply multipliers to points
   */
  applyMultipliers(profile, points, actionType) {
    let multiplier = profile.getActiveMultiplier('points');
    
    // Streak multiplier for daily logins
    if (actionType === 'login' && profile.currentStreak > 1) {
      const streakMultiplier = Math.min(
        this.pointsConfig.MAX_STREAK_MULTIPLIER,
        this.pointsConfig.STREAK_MULTIPLIER_BASE + 
          (profile.currentStreak * this.pointsConfig.STREAK_MULTIPLIER_INCREMENT)
      );
      multiplier *= streakMultiplier;
    }
    
    return Math.floor(points * multiplier);
  }

  /**
   * Update activity counts in profile
   */
  updateActivityCount(profile, actionType, metadata) {
    switch (actionType) {
      case 'referral_submitted':
        profile.referralCount += 1;
        break;
      case 'referral_hired':
        profile.hireCount += 1;
        break;
      case 'share_job':
        profile.shareCount += (metadata.shareCount || 1);
        break;
      case 'profile_complete':
        profile.profileCompletion = metadata.completion || 100;
        break;
    }
  }

  /**
   * Get action category
   */
  getActionCategory(actionType) {
    const categoryMap = {
      'referral_submitted': 'referral',
      'referral_hired': 'hiring',
      'referral_rejected': 'referral',
      'share_job': 'networking',
      'profile_complete': 'profile',
      'profile_update': 'profile',
      'login': 'engagement',
      'invite_sent': 'networking',
      'invite_accepted': 'networking',
      'payout_requested': 'financial',
      'payout_received': 'financial',
    };
    
    return categoryMap[actionType] || 'engagement';
  }

  /**
   * Update user's login streak
   */
  async updateStreak(userId) {
    try {
      const profile = await this.initializeProfile(userId);
      const streakResult = profile.updateStreak();
      
      await profile.save();
      
      // Award streak bonus if applicable
      if (streakResult.bonus) {
        const bonusPoints = streakResult.streak >= 30 
          ? this.pointsConfig.STREAK_30_DAY_BONUS 
          : this.pointsConfig.STREAK_7_DAY_BONUS;
        
        profile.addPoints(bonusPoints, 'streak_bonus');
        await profile.save();
        
        // Log activity
        await UserActivity.log({
          userId,
          actionType: 'streak_updated',
          actionCategory: 'engagement',
          actionDetails: { streak: streakResult.streak, bonus: true },
          pointsEarned: bonusPoints,
        });
      }
      
      return {
        currentStreak: profile.currentStreak,
        longestStreak: profile.longestStreak,
        bonus: streakResult.bonus,
      };
    } catch (error) {
      console.error('Error updating streak:', error);
      throw error;
    }
  }

  /**
   * Check for achievements
   */
  async checkAchievements(userId, profile) {
    try {
      const unlockedAchievements = [];
      
      // Get checkable achievements
      const achievements = await Achievement.getCheckableAchievements(profile);
      
      // Prepare user stats
      const userStats = {
        referralCount: profile.referralCount,
        hireCount: profile.hireCount,
        shareCount: profile.shareCount,
        currentStreak: profile.currentStreak,
        profileCompletion: profile.profileCompletion,
        totalEarnings: profile.totalEarnings || 0,
      };
      
      for (const achievement of achievements) {
        if (achievement.checkCriteria(userStats)) {
          // Add achievement to profile
          const existingIndex = profile.achievements.findIndex(
            a => a.achievementId === achievement.achievementId
          );
          
          if (existingIndex >= 0) {
            // Update existing
            profile.achievements[existingIndex].timesCompleted += 1;
            profile.achievements[existingIndex].currentProgress = achievement.criteria.targetValue;
          } else {
            // Add new
            profile.achievements.push({
              achievementId: achievement.achievementId,
              currentProgress: achievement.criteria.targetValue,
              targetValue: achievement.criteria.targetValue,
              unlockedAt: new Date(),
              timesCompleted: 1,
            });
          }
          
          // Award points
          if (achievement.rewardPoints > 0) {
            profile.addPoints(achievement.rewardPoints, 'achievement_unlocked');
          }
          
          unlockedAchievements.push({
            achievementId: achievement.achievementId,
            name: achievement.name,
            points: achievement.rewardPoints,
          });
          
          // Log activity
          await UserActivity.log({
            userId,
            actionType: 'achievement_unlocked',
            actionCategory: 'reward',
            actionDetails: { achievementId: achievement.achievementId },
            pointsEarned: achievement.rewardPoints,
          });
        }
      }
      
      if (unlockedAchievements.length > 0) {
        await profile.save();
      }
      
      return unlockedAchievements;
    } catch (error) {
      console.error('Error checking achievements:', error);
      return [];
    }
  }

  /**
   * Check for badges
   */
  async checkBadges(userId, profile) {
    try {
      const earnedBadges = [];
      
      // Get all badges
      const badges = await Badge.getAvailable();
      
      for (const badge of badges) {
        if (profile.hasBadge(badge.badgeId)) continue;
        
        // Check eligibility based on badge type
        let eligible = false;
        
        switch (badge.requirementType) {
          case 'count':
            if (badge.category === 'referral') {
              eligible = profile.referralCount >= badge.requirementValue;
            } else if (badge.category === 'hiring') {
              eligible = profile.hireCount >= badge.requirementValue;
            } else if (badge.category === 'networking') {
              eligible = profile.shareCount >= badge.requirementValue;
            }
            break;
            
          case 'streak':
            eligible = profile.currentStreak >= badge.requirementValue ||
                       profile.longestStreak >= badge.requirementValue;
            break;
            
          case 'one_time':
            if (badge.badgeId === 'first_steps') {
              eligible = profile.profileCompletion >= 50;
            } else if (badge.badgeId === 'photo_ready') {
              eligible = profile.profileCompletion >= 75;
            }
            break;
        }
        
        if (eligible) {
          profile.addBadge(badge.badgeId);
          
          // Award points
          if (badge.pointsAwarded > 0) {
            profile.addPoints(badge.pointsAwarded, 'badge_earned');
          }
          
          earnedBadges.push({
            badgeId: badge.badgeId,
            name: badge.name,
            icon: badge.icon,
            rarity: badge.rarity,
            points: badge.pointsAwarded,
          });
          
          // Increment badge earner count
          badge.incrementEarners();
          await badge.save();
          
          // Log activity
          await UserActivity.log({
            userId,
            actionType: 'badge_earned',
            actionCategory: 'reward',
            actionDetails: { badgeId: badge.badgeId },
            pointsEarned: badge.pointsAwarded,
            badgeEarned: badge.badgeId,
          });
          
          // Send notification
          await this.sendBadgeNotification(userId, badge);
        }
      }
      
      if (earnedBadges.length > 0) {
        await profile.save();
      }
      
      return earnedBadges;
    } catch (error) {
      console.error('Error checking badges:', error);
      return [];
    }
  }

  /**
   * Update challenge progress
   */
  async updateChallenges(userId, actionType, metadata) {
    try {
      const updatedChallenges = [];
      
      // Get user's active challenges
      const challenges = await Challenge.getUserActiveChallenges(userId);
      
      for (const challenge of challenges) {
        // Map action type to challenge target action
        const actionMap = {
          'referral_submitted': 'submit_referral',
          'referral_hired': 'get_hire',
          'share_job': 'share_job',
          'profile_complete': 'complete_profile',
          'login': 'login',
          'invite_sent': 'invite_friend',
          'payout_received': 'earn_payout',
        };
        
        if (actionMap[actionType] === challenge.targetAction) {
          const progress = challenge.updateProgress(userId, metadata.count || 1);
          
          if (progress.success) {
            await challenge.save();
            
            updatedChallenges.push({
              challengeId: challenge.challengeId,
              title: challenge.title,
              completed: progress.completed,
              progress: challenge.getUserProgress(userId),
            });
            
            // Log completion
            if (progress.completed) {
              await UserActivity.log({
                userId,
                actionType: 'challenge_completed',
                actionCategory: 'reward',
                actionDetails: { 
                  challengeId: challenge.challengeId,
                  completionTime: progress.completionTime,
                },
              });
            }
          }
        }
      }
      
      return updatedChallenges;
    } catch (error) {
      console.error('Error updating challenges:', error);
      return [];
    }
  }

  /**
   * Open a loot box
   */
  async openLootBox(userId) {
    try {
      const profile = await GamificationProfile.findOne({ userId });
      
      if (!profile || profile.lootBoxesAvailable <= 0) {
        return { success: false, message: 'No loot boxes available' };
      }
      
      const rewards = profile.openLootBox();
      await profile.save();
      
      // Log activity
      await UserActivity.log({
        userId,
        actionType: 'lootbox_opened',
        actionCategory: 'reward',
        actionDetails: { rewards },
        pointsEarned: rewards.reduce((sum, r) => r.type === 'points' ? sum + r.value : sum, 0),
      });
      
      return {
        success: true,
        rewards,
        remainingBoxes: profile.lootBoxesAvailable,
      };
    } catch (error) {
      console.error('Error opening loot box:', error);
      throw error;
    }
  }

  /**
   * Get points history
   */
  async getPointsHistory(userId, options = {}) {
    try {
      const { limit = 50, skip = 0, startDate, endDate } = options;
      
      const query = { 
        userId,
        pointsEarned: { $gt: 0 },
      };
      
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = startDate;
        if (endDate) query.timestamp.$lte = endDate;
      }
      
      const activities = await UserActivity.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      
      return activities.map(activity => ({
        id: activity._id,
        actionType: activity.actionType,
        points: activity.pointsEarned,
        timestamp: activity.timestamp,
        details: activity.actionDetails,
      }));
    } catch (error) {
      console.error('Error getting points history:', error);
      throw error;
    }
  }

  /**
   * Get user stats
   */
  async getUserStats(userId) {
    try {
      const profile = await this.initializeProfile(userId);
      
      // Get activity stats
      const activityStats = await UserActivity.getUserStats(userId);
      
      // Get streak data
      const streakData = await UserActivity.getStreakData(userId, 'login', 365);
      
      // Get heatmap data
      const heatmapData = await UserActivity.getHeatmapData(userId, 365);
      
      return {
        profile: {
          totalPoints: profile.totalPoints,
          currentLevel: profile.currentLevel,
          tier: profile.tier,
          currentStreak: profile.currentStreak,
          longestStreak: profile.longestStreak,
          referralCount: profile.referralCount,
          hireCount: profile.hireCount,
          shareCount: profile.shareCount,
          badgeCount: profile.badges.length,
          achievementCount: profile.achievements.filter(a => a.unlockedAt).length,
          lootBoxesAvailable: profile.lootBoxesAvailable,
        },
        activityStats,
        streakData,
        heatmapData,
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }

  /**
   * Send level up notification
   */
  async sendLevelUpNotification(userId, newLevel, oldLevel) {
    try {
      await Notification.create({
        userId,
        type: 'LEVEL_UP',
        title: 'Level Up! 🎉',
        message: `Congratulations! You've reached Level ${newLevel}!`,
        data: {
          oldLevel,
          newLevel,
          lootBoxesAwarded: newLevel - oldLevel,
        },
      });
    } catch (error) {
      console.error('Error sending level up notification:', error);
    }
  }

  /**
   * Send badge notification
   */
  async sendBadgeNotification(userId, badge) {
    try {
      await Notification.create({
        userId,
        type: 'BADGE_EARNED',
        title: `New Badge: ${badge.name}! 🏅`,
        message: badge.description,
        data: {
          badgeId: badge.badgeId,
          badgeName: badge.name,
          badgeIcon: badge.icon,
          rarity: badge.rarity,
          points: badge.pointsAwarded,
        },
      });
    } catch (error) {
      console.error('Error sending badge notification:', error);
    }
  }

  /**
   * Admin: Award points manually
   */
  async adminAwardPoints(userId, points, reason, adminId) {
    try {
      const profile = await this.initializeProfile(userId);
      
      const result = profile.addPoints(points, 'admin_award');
      await profile.save();
      
      // Log activity
      await UserActivity.log({
        userId,
        actionType: 'points_earned',
        actionCategory: 'reward',
        actionDetails: { 
          source: 'admin',
          adminId,
          reason,
        },
        pointsEarned: points,
        levelUp: result.leveledUp,
        newLevel: result.leveledUp ? result.newLevel : null,
      });
      
      return {
        success: true,
        points,
        totalPoints: profile.totalPoints,
        levelUp: result.leveledUp,
        newLevel: result.newLevel,
      };
    } catch (error) {
      console.error('Error awarding points:', error);
      throw error;
    }
  }

  /**
   * Get level requirements
   */
  getLevelRequirements() {
    const requirements = [];
    
    for (let level = 1; level <= 25; level++) {
      let pointsRequired;
      let tier;
      
      if (level >= 21) {
        pointsRequired = 50001 + ((level - 21) * 10000);
        tier = 'diamond';
      } else if (level >= 16) {
        pointsRequired = 15001 + ((level - 16) * 7000);
        tier = 'platinum';
      } else if (level >= 11) {
        pointsRequired = 5001 + ((level - 11) * 2000);
        tier = 'gold';
      } else if (level >= 6) {
        pointsRequired = 1001 + ((level - 6) * 800);
        tier = 'silver';
      } else {
        pointsRequired = (level - 1) * 200;
        tier = 'bronze';
      }
      
      requirements.push({
        level,
        tier,
        pointsRequired,
      });
    }
    
    return requirements;
  }
}

// Export singleton instance
const gamificationService = new GamificationService();
module.exports = gamificationService;
