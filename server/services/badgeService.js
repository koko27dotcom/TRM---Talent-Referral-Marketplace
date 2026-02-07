/**
 * Badge Service
 * Manages badge definitions, eligibility checking, and awarding
 */

const Badge = require('../models/Badge.js');
const { PREDEFINED_BADGES, BADGE_RARITY, BADGE_CATEGORIES } = require('../models/Badge.js');
const GamificationProfile = require('../models/GamificationProfile.js');
const UserActivity = require('../models/UserActivity.js');
const Notification = require('../models/Notification.js');

class BadgeService {
  constructor() {
    this.badgeCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Initialize badges in the database
   */
  async initializeBadges() {
    try {
      const count = await Badge.initializeBadges();
      console.log(`Initialized ${count} badges`);
      return count;
    } catch (error) {
      console.error('Error initializing badges:', error);
      throw error;
    }
  }

  /**
   * Get all badges with optional filtering
   */
  async getAllBadges(options = {}) {
    try {
      const { category, rarity, includeInactive = false } = options;
      
      let query = {};
      if (!includeInactive) {
        query.$or = [
          { expiresAt: { $gt: new Date() } },
          { expiresAt: null },
        ];
      }
      if (category) query.category = category;
      if (rarity) query.rarity = rarity;
      
      const badges = await Badge.find(query)
        .sort({ category: 1, rarity: 1, pointsAwarded: -1 });
      
      return badges;
    } catch (error) {
      console.error('Error getting badges:', error);
      throw error;
    }
  }

  /**
   * Get a single badge by ID
   */
  async getBadge(badgeId) {
    try {
      // Check cache first
      const cached = this.badgeCache.get(badgeId);
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.badge;
      }
      
      const badge = await Badge.findOne({ badgeId });
      
      if (badge) {
        this.badgeCache.set(badgeId, {
          badge,
          timestamp: Date.now(),
        });
      }
      
      return badge;
    } catch (error) {
      console.error('Error getting badge:', error);
      throw error;
    }
  }

  /**
   * Get user's earned badges
   */
  async getUserBadges(userId) {
    try {
      const profile = await GamificationProfile.findOne({ userId });
      
      if (!profile || !profile.badges.length) {
        return [];
      }
      
      // Get full badge details
      const badgeIds = profile.badges.map(b => b.badgeId);
      const badges = await Badge.find({ badgeId: { $in: badgeIds } });
      
      // Map with earned date
      const userBadges = profile.badges.map(userBadge => {
        const badgeDetails = badges.find(b => b.badgeId === userBadge.badgeId);
        return {
          ...badgeDetails?.toObject(),
          earnedAt: userBadge.earnedAt,
          viewed: userBadge.viewed,
        };
      }).filter(b => b.badgeId); // Remove any nulls
      
      return userBadges;
    } catch (error) {
      console.error('Error getting user badges:', error);
      throw error;
    }
  }

  /**
   * Get user's badge collection (earned + available)
   */
  async getUserBadgeCollection(userId) {
    try {
      const profile = await GamificationProfile.findOne({ userId });
      const allBadges = await this.getAllBadges();
      
      const earnedBadgeIds = new Set(profile?.badges.map(b => b.badgeId) || []);
      
      const collection = allBadges.map(badge => {
        const isEarned = earnedBadgeIds.has(badge.badgeId);
        const userBadge = profile?.badges.find(b => b.badgeId === badge.badgeId);
        
        return {
          ...badge.toObject(),
          isEarned,
          earnedAt: userBadge?.earnedAt || null,
          viewed: userBadge?.viewed || false,
          progress: isEarned ? 100 : this.calculateProgress(profile, badge),
        };
      });
      
      // Group by category
      const grouped = this.groupByCategory(collection);
      
      return {
        total: allBadges.length,
        earned: earnedBadgeIds.size,
        byCategory: grouped,
        recent: collection
          .filter(b => b.isEarned)
          .sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt))
          .slice(0, 5),
        unviewed: collection.filter(b => b.isEarned && !b.viewed),
      };
    } catch (error) {
      console.error('Error getting badge collection:', error);
      throw error;
    }
  }

  /**
   * Calculate progress towards a badge
   */
  calculateProgress(profile, badge) {
    if (!profile) return 0;
    
    let current = 0;
    let target = badge.requirementValue;
    
    switch (badge.requirementType) {
      case 'count':
        if (badge.category === 'referral') {
          current = profile.referralCount;
        } else if (badge.category === 'hiring') {
          current = profile.hireCount;
        } else if (badge.category === 'networking') {
          current = profile.shareCount;
        } else if (badge.category === 'community') {
          current = profile.referralCount; // For invite-based badges
        }
        break;
        
      case 'streak':
        current = Math.max(profile.currentStreak, profile.longestStreak);
        break;
        
      case 'one_time':
        if (badge.badgeId === 'first_steps') {
          current = profile.profileCompletion;
          target = 100;
        } else if (badge.badgeId === 'photo_ready') {
          current = profile.profileCompletion >= 75 ? 1 : 0;
          target = 1;
        }
        break;
        
      case 'milestone':
        if (badge.category === 'earning') {
          current = profile.totalEarnings || 0;
        }
        break;
    }
    
    return Math.min(100, Math.round((current / target) * 100));
  }

  /**
   * Group badges by category
   */
  groupByCategory(badges) {
    const grouped = {};
    
    Object.values(BADGE_CATEGORIES).forEach(category => {
      grouped[category] = badges.filter(b => b.category === category);
    });
    
    return grouped;
  }

  /**
   * Check and award badges to a user
   */
  async checkAndAwardBadges(userId) {
    try {
      const profile = await GamificationProfile.findOne({ userId });
      if (!profile) return [];
      
      const newBadges = [];
      const badges = await Badge.getAvailable();
      
      for (const badge of badges) {
        // Skip if already earned
        if (profile.hasBadge(badge.badgeId)) continue;
        
        // Check prerequisites
        if (badge.prerequisites && badge.prerequisites.length > 0) {
          const hasPrereqs = badge.prerequisites.every(prereq => 
            profile.hasBadge(prereq)
          );
          if (!hasPrereqs) continue;
        }
        
        // Check eligibility
        if (this.isEligibleForBadge(profile, badge)) {
          // Award badge
          const awarded = await this.awardBadge(userId, badge.badgeId);
          if (awarded) {
            newBadges.push({
              badgeId: badge.badgeId,
              name: badge.name,
              icon: badge.icon,
              rarity: badge.rarity,
              points: badge.pointsAwarded,
            });
          }
        }
      }
      
      return newBadges;
    } catch (error) {
      console.error('Error checking badges:', error);
      return [];
    }
  }

  /**
   * Check if user is eligible for a badge
   */
  isEligibleForBadge(profile, badge) {
    // Check if badge is still available
    if (!badge.isAvailable()) return false;
    
    switch (badge.requirementType) {
      case 'count':
        return this.checkCountRequirement(profile, badge);
        
      case 'streak':
        return this.checkStreakRequirement(profile, badge);
        
      case 'achievement':
        return this.checkAchievementRequirement(profile, badge);
        
      case 'one_time':
        return this.checkOneTimeRequirement(profile, badge);
        
      case 'milestone':
        return this.checkMilestoneRequirement(profile, badge);
        
      default:
        return false;
    }
  }

  /**
   * Check count-based requirement
   */
  checkCountRequirement(profile, badge) {
    let count = 0;
    
    switch (badge.category) {
      case 'referral':
        count = profile.referralCount;
        break;
      case 'hiring':
        count = profile.hireCount;
        break;
      case 'networking':
        count = profile.shareCount;
        break;
      case 'community':
        count = profile.referralCount;
        break;
    }
    
    return count >= badge.requirementValue;
  }

  /**
   * Check streak-based requirement
   */
  checkStreakRequirement(profile, badge) {
    return profile.currentStreak >= badge.requirementValue ||
           profile.longestStreak >= badge.requirementValue;
  }

  /**
   * Check achievement-based requirement
   */
  checkAchievementRequirement(profile, badge) {
    if (badge.badgeId === 'profile_perfectionist') {
      return profile.profileCompletion >= 100;
    }
    return false;
  }

  /**
   * Check one-time requirement
   */
  checkOneTimeRequirement(profile, badge) {
    switch (badge.badgeId) {
      case 'first_steps':
        return profile.profileCompletion >= 50;
      case 'photo_ready':
        return profile.profileCompletion >= 75;
      case 'first_referral':
        return profile.referralCount >= 1;
      case 'hiring_hero':
        return profile.hireCount >= 1;
      case 'first_earnings':
        return profile.totalEarnings > 0;
      default:
        return false;
    }
  }

  /**
   * Check milestone requirement
   */
  checkMilestoneRequirement(profile, badge) {
    if (badge.category === 'earning') {
      return (profile.totalEarnings || 0) >= badge.requirementValue;
    }
    if (badge.badgeId === 'speed_demon') {
      // Check if first hire was within 30 days of joining
      // This would need join date tracking
      return false;
    }
    return false;
  }

  /**
   * Award a badge to a user
   */
  async awardBadge(userId, badgeId) {
    try {
      const profile = await GamificationProfile.findOne({ userId });
      if (!profile) return false;
      
      // Check if already has badge
      if (profile.hasBadge(badgeId)) return false;
      
      const badge = await this.getBadge(badgeId);
      if (!badge) return false;
      
      // Add badge to profile
      profile.addBadge(badgeId);
      
      // Award points
      if (badge.pointsAwarded > 0) {
        profile.addPoints(badge.pointsAwarded, 'badge_earned');
      }
      
      await profile.save();
      
      // Increment badge earner count
      badge.incrementEarners();
      await badge.save();
      
      // Log activity
      await UserActivity.log({
        userId,
        actionType: 'badge_earned',
        actionCategory: 'reward',
        actionDetails: { badgeId, badgeName: badge.name },
        pointsEarned: badge.pointsAwarded,
        badgeEarned: badgeId,
      });
      
      // Send notification
      await this.sendBadgeNotification(userId, badge);
      
      return true;
    } catch (error) {
      console.error('Error awarding badge:', error);
      return false;
    }
  }

  /**
   * Mark badge as viewed
   */
  async markBadgeViewed(userId, badgeId) {
    try {
      const profile = await GamificationProfile.findOne({ userId });
      if (!profile) return false;
      
      const result = profile.markBadgeViewed(badgeId);
      if (result) {
        await profile.save();
      }
      
      return result;
    } catch (error) {
      console.error('Error marking badge viewed:', error);
      return false;
    }
  }

  /**
   * Get badge statistics
   */
  async getBadgeStatistics() {
    try {
      const stats = await Badge.getStatistics();
      
      // Get total earners per badge
      const badgeStats = await GamificationProfile.aggregate([
        { $unwind: '$badges' },
        {
          $group: {
            _id: '$badges.badgeId',
            earnerCount: { $sum: 1 },
            avgEarnTime: { $avg: { $subtract: ['$badges.earnedAt', '$createdAt'] } },
          },
        },
      ]);
      
      return {
        byCategory: stats,
        byBadge: badgeStats,
      };
    } catch (error) {
      console.error('Error getting badge statistics:', error);
      throw error;
    }
  }

  /**
   * Create a custom badge (admin only)
   */
  async createBadge(badgeData) {
    try {
      const badge = new Badge(badgeData);
      await badge.save();
      
      // Clear cache
      this.badgeCache.clear();
      
      return badge;
    } catch (error) {
      console.error('Error creating badge:', error);
      throw error;
    }
  }

  /**
   * Update a badge (admin only)
   */
  async updateBadge(badgeId, updates) {
    try {
      const badge = await Badge.findOneAndUpdate(
        { badgeId },
        { $set: updates },
        { new: true }
      );
      
      // Clear cache
      this.badgeCache.delete(badgeId);
      
      return badge;
    } catch (error) {
      console.error('Error updating badge:', error);
      throw error;
    }
  }

  /**
   * Send badge notification
   */
  async sendBadgeNotification(userId, badge) {
    try {
      const rarityEmojis = {
        [BADGE_RARITY.COMMON]: '🥉',
        [BADGE_RARITY.RARE]: '🥈',
        [BADGE_RARITY.EPIC]: '🥇',
        [BADGE_RARITY.LEGENDARY]: '👑',
      };
      
      await Notification.create({
        userId,
        type: 'BADGE_EARNED',
        title: `New Badge Unlocked! ${rarityEmojis[badge.rarity] || '🏅'}`,
        message: `You've earned the "${badge.name}" badge!`,
        data: {
          badgeId: badge.badgeId,
          badgeName: badge.name,
          badgeIcon: badge.icon,
          rarity: badge.rarity,
          points: badge.pointsAwarded,
          description: badge.description,
        },
      });
    } catch (error) {
      console.error('Error sending badge notification:', error);
    }
  }

  /**
   * Get badge rarity color
   */
  getRarityColor(rarity) {
    const colors = {
      [BADGE_RARITY.COMMON]: '#9CA3AF', // Gray
      [BADGE_RARITY.RARE]: '#3B82F6',   // Blue
      [BADGE_RARITY.EPIC]: '#A855F7',   // Purple
      [BADGE_RARITY.LEGENDARY]: '#F59E0B', // Gold
    };
    
    return colors[rarity] || colors[BADGE_RARITY.COMMON];
  }

  /**
   * Get badge rarity label
   */
  getRarityLabel(rarity) {
    const labels = {
      [BADGE_RARITY.COMMON]: 'Common',
      [BADGE_RARITY.RARE]: 'Rare',
      [BADGE_RARITY.EPIC]: 'Epic',
      [BADGE_RARITY.LEGENDARY]: 'Legendary',
    };
    
    return labels[rarity] || 'Common';
  }
}

// Export singleton instance
const badgeService = new BadgeService();
module.exports = badgeService;
