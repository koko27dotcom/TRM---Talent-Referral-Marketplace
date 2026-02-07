/**
 * Achievement Service
 * Manages achievement tracking, unlocking, and rewards
 */

const {
  Achievement,
  PREDEFINED_ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORIES,
  CRITERIA_OPERATORS 
} = require('../models/Achievement.js');
const GamificationProfile = require('../models/GamificationProfile.js');
const UserActivity = require('../models/UserActivity.js');
const Notification = require('../models/Notification.js');

class AchievementService {
  constructor() {
    this.achievementCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Initialize achievements in the database
   */
  async initializeAchievements() {
    try {
      const count = await Achievement.initializeAchievements();
      console.log(`Initialized ${count} achievements`);
      return count;
    } catch (error) {
      console.error('Error initializing achievements:', error);
      throw error;
    }
  }

  /**
   * Get all achievements
   */
  async getAllAchievements(options = {}) {
    try {
      const { category, includeInactive = false } = options;
      
      let query = {};
      if (!includeInactive) query.isActive = true;
      if (category) query.category = category;
      
      const achievements = await Achievement.find(query)
        .sort({ category: 1, difficulty: 1, rewardPoints: -1 });
      
      return achievements;
    } catch (error) {
      console.error('Error getting achievements:', error);
      throw error;
    }
  }

  /**
   * Get a single achievement
   */
  async getAchievement(achievementId) {
    try {
      // Check cache first
      const cached = this.achievementCache.get(achievementId);
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.achievement;
      }
      
      const achievement = await Achievement.findOne({ achievementId });
      
      if (achievement) {
        this.achievementCache.set(achievementId, {
          achievement,
          timestamp: Date.now(),
        });
      }
      
      return achievement;
    } catch (error) {
      console.error('Error getting achievement:', error);
      throw error;
    }
  }

  /**
   * Get user's achievements
   */
  async getUserAchievements(userId) {
    try {
      const profile = await GamificationProfile.findOne({ userId });
      
      if (!profile) {
        return {
          unlocked: [],
          inProgress: [],
          totalUnlocked: 0,
          totalAvailable: await Achievement.countDocuments({ isActive: true }),
        };
      }
      
      // Get all achievements
      const allAchievements = await this.getAllAchievements();
      
      // Separate unlocked and in-progress
      const unlocked = [];
      const inProgress = [];
      
      for (const achievement of allAchievements) {
        const userAchievement = profile.achievements.find(
          a => a.achievementId === achievement.achievementId
        );
        
        if (userAchievement && userAchievement.unlockedAt) {
          unlocked.push({
            ...achievement.toObject(),
            unlockedAt: userAchievement.unlockedAt,
            timesCompleted: userAchievement.timesCompleted,
          });
        } else {
          // Calculate progress
          const progress = this.calculateProgress(profile, achievement);
          
          inProgress.push({
            ...achievement.toObject(),
            progress,
            currentValue: this.getCurrentValue(profile, achievement),
            targetValue: achievement.criteria.value,
          });
        }
      }
      
      return {
        unlocked,
        inProgress: inProgress.sort((a, b) => b.progress - a.progress),
        totalUnlocked: unlocked.length,
        totalAvailable: allAchievements.length,
        completionPercentage: allAchievements.length > 0 
          ? (unlocked.length / allAchievements.length) * 100 
          : 0,
      };
    } catch (error) {
      console.error('Error getting user achievements:', error);
      throw error;
    }
  }

  /**
   * Calculate progress towards an achievement
   */
  calculateProgress(profile, achievement) {
    if (!profile || !achievement.progressTracking) return 0;
    
    const currentValue = this.getCurrentValue(profile, achievement);
    const targetValue = achievement.criteria.value;
    
    if (typeof targetValue === 'number' && targetValue > 0) {
      return Math.min(100, Math.round((currentValue / targetValue) * 100));
    }
    
    return currentValue >= targetValue ? 100 : 0;
  }

  /**
   * Get current value for achievement criteria
   */
  getCurrentValue(profile, achievement) {
    const field = achievement.criteria.field;
    
    const fieldMap = {
      'referralCount': profile.referralCount,
      'hireCount': profile.hireCount,
      'shareCount': profile.shareCount,
      'currentStreak': profile.currentStreak,
      'longestStreak': profile.longestStreak,
      'profileCompletion': profile.profileCompletion,
      'totalEarnings': profile.totalEarnings || 0,
      'badgeCount': profile.badges.length,
      'achievementCount': profile.achievements.filter(a => a.unlockedAt).length,
    };
    
    return fieldMap[field] || 0;
  }

  /**
   * Check and unlock achievements for a user
   */
  async checkAchievements(userId) {
    try {
      const profile = await GamificationProfile.findOne({ userId });
      if (!profile) return [];
      
      const unlockedAchievements = [];
      
      // Get checkable achievements
      const achievements = await Achievement.getCheckableAchievements(profile);
      
      // Prepare user stats
      const userStats = {
        referralCount: profile.referralCount,
        hireCount: profile.hireCount,
        shareCount: profile.shareCount,
        currentStreak: profile.currentStreak,
        longestStreak: profile.longestStreak,
        profileCompletion: profile.profileCompletion,
        totalEarnings: profile.totalEarnings || 0,
        badgeCount: profile.badges.length,
        achievementCount: profile.achievements.filter(a => a.unlockedAt).length,
      };
      
      for (const achievement of achievements) {
        if (achievement.checkCriteria(userStats)) {
          const unlocked = await this.unlockAchievement(userId, achievement.achievementId);
          if (unlocked) {
            unlockedAchievements.push({
              achievementId: achievement.achievementId,
              name: achievement.name,
              points: achievement.rewardPoints,
              badgeId: achievement.rewardBadgeId,
            });
          }
        }
      }
      
      return unlockedAchievements;
    } catch (error) {
      console.error('Error checking achievements:', error);
      return [];
    }
  }

  /**
   * Unlock an achievement for a user
   */
  async unlockAchievement(userId, achievementId) {
    try {
      const profile = await GamificationProfile.findOne({ userId });
      if (!profile) return false;
      
      const achievement = await this.getAchievement(achievementId);
      if (!achievement) return false;
      
      // Check if already unlocked
      const existingIndex = profile.achievements.findIndex(
        a => a.achievementId === achievementId
      );
      
      if (existingIndex >= 0) {
        const existing = profile.achievements[existingIndex];
        
        // Check if repeatable
        if (!achievement.isRepeatable) return false;
        if (existing.timesCompleted >= achievement.maxRepeats) return false;
        
        // Update existing
        existing.timesCompleted += 1;
        existing.currentProgress = achievement.criteria.targetValue || achievement.criteria.value;
      } else {
        // Add new
        profile.achievements.push({
          achievementId,
          currentProgress: achievement.criteria.targetValue || achievement.criteria.value,
          targetValue: achievement.criteria.targetValue || achievement.criteria.value,
          unlockedAt: new Date(),
          timesCompleted: 1,
        });
      }
      
      // Award points
      if (achievement.rewardPoints > 0) {
        profile.addPoints(achievement.rewardPoints, 'achievement_unlocked');
      }
      
      await profile.save();
      
      // Log activity
      await UserActivity.log({
        userId,
        actionType: 'achievement_unlocked',
        actionCategory: 'reward',
        actionDetails: { achievementId, achievementName: achievement.name },
        pointsEarned: achievement.rewardPoints,
      });
      
      // Send notification
      await this.sendAchievementNotification(userId, achievement);
      
      return true;
    } catch (error) {
      console.error('Error unlocking achievement:', error);
      return false;
    }
  }

  /**
   * Send achievement notification
   */
  async sendAchievementNotification(userId, achievement) {
    try {
      await Notification.create({
        userId,
        type: 'ACHIEVEMENT_UNLOCKED',
        title: 'Achievement Unlocked! 🏆',
        message: `You've unlocked "${achievement.name}"!`,
        data: {
          achievementId: achievement.achievementId,
          achievementName: achievement.name,
          description: achievement.description,
          points: achievement.rewardPoints,
          badgeId: achievement.rewardBadgeId,
        },
      });
    } catch (error) {
      console.error('Error sending achievement notification:', error);
    }
  }

  /**
   * Update achievement progress (for progress-tracking achievements)
   */
  async updateProgress(userId, achievementId, progress) {
    try {
      const profile = await GamificationProfile.findOne({ userId });
      if (!profile) return false;
      
      const achievementIndex = profile.achievements.findIndex(
        a => a.achievementId === achievementId
      );
      
      if (achievementIndex >= 0) {
        profile.achievements[achievementIndex].currentProgress = progress;
        await profile.save();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error updating achievement progress:', error);
      return false;
    }
  }

  /**
   * Get achievement statistics
   */
  async getStatistics() {
    try {
      // Get achievement completion stats
      const completionStats = await GamificationProfile.aggregate([
        { $unwind: '$achievements' },
        {
          $group: {
            _id: '$achievements.achievementId',
            unlockCount: { $sum: 1 },
            avgUnlockTime: { $avg: { $subtract: ['$achievements.unlockedAt', '$createdAt'] } },
            totalCompletions: { $sum: '$achievements.timesCompleted' },
          },
        },
      ]);
      
      // Get category stats
      const categoryStats = await Achievement.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            totalPoints: { $sum: '$rewardPoints' },
          },
        },
      ]);
      
      return {
        byAchievement: completionStats,
        byCategory: categoryStats,
      };
    } catch (error) {
      console.error('Error getting achievement statistics:', error);
      throw error;
    }
  }

  /**
   * Create a custom achievement (admin only)
   */
  async createAchievement(achievementData) {
    try {
      const achievement = new Achievement(achievementData);
      await achievement.save();
      
      // Clear cache
      this.achievementCache.clear();
      
      return achievement;
    } catch (error) {
      console.error('Error creating achievement:', error);
      throw error;
    }
  }

  /**
   * Update an achievement (admin only)
   */
  async updateAchievement(achievementId, updates) {
    try {
      const achievement = await Achievement.findOneAndUpdate(
        { achievementId },
        { $set: updates },
        { new: true }
      );
      
      // Clear cache
      this.achievementCache.delete(achievementId);
      
      return achievement;
    } catch (error) {
      console.error('Error updating achievement:', error);
      throw error;
    }
  }

  /**
   * Delete an achievement (admin only)
   */
  async deleteAchievement(achievementId) {
    try {
      const result = await Achievement.findOneAndDelete({ achievementId });
      
      // Clear cache
      this.achievementCache.delete(achievementId);
      
      return !!result;
    } catch (error) {
      console.error('Error deleting achievement:', error);
      throw error;
    }
  }

  /**
   * Get category label
   */
  getCategoryLabel(category) {
    const labels = {
      [ACHIEVEMENT_CATEGORIES.REFERRAL]: 'Referrals',
      [ACHIEVEMENT_CATEGORIES.HIRING]: 'Hiring',
      [ACHIEVEMENT_CATEGORIES.NETWORKING]: 'Networking',
      [ACHIEVEMENT_CATEGORIES.EARNING]: 'Earnings',
      [ACHIEVEMENT_CATEGORIES.STREAK]: 'Streaks',
      [ACHIEVEMENT_CATEGORIES.PROFILE]: 'Profile',
      [ACHIEVEMENT_CATEGORIES.COMMUNITY]: 'Community',
      [ACHIEVEMENT_CATEGORIES.EXPLORATION]: 'Exploration',
      [ACHIEVEMENT_CATEGORIES.MASTERY]: 'Mastery',
    };
    return labels[category] || category;
  }

  /**
   * Get difficulty label
   */
  getDifficultyLabel(difficulty) {
    const labels = {
      easy: 'Easy',
      medium: 'Medium',
      hard: 'Hard',
      expert: 'Expert',
    };
    return labels[difficulty] || difficulty;
  }

  /**
   * Get difficulty color
   */
  getDifficultyColor(difficulty) {
    const colors = {
      easy: '#10B981',
      medium: '#F59E0B',
      hard: '#EF4444',
      expert: '#8B5CF6',
    };
    return colors[difficulty] || '#9CA3AF';
  }
}

const achievementService = new AchievementService();
module.exports = achievementService;
