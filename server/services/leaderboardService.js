/**
 * Leaderboard Service
 * Manages leaderboard rankings, calculations, and rewards
 */

const {
  LeaderboardEntry,
  LEADERBOARD_PERIODS, 
  LEADERBOARD_CATEGORIES,
  RANK_CHANGE 
} = require('../models/LeaderboardEntry.js');
const GamificationProfile = require('../models/GamificationProfile.js');
const User = require('../models/User.js');
const Notification = require('../models/Notification.js');

class LeaderboardService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get leaderboard for a period and category
   */
  async getLeaderboard(period, category, options = {}) {
    try {
      const cacheKey = `leaderboard:${period}:${category}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }
      
      const { limit = 100, skip = 0 } = options;
      
      // Get entries with user details
      const entries = await LeaderboardEntry.find({
        period,
        category,
        isActive: true,
      })
        .sort({ rank: 1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'displayName name avatar email')
        .lean();
      
      // Format entries
      const formattedEntries = entries.map(entry => ({
        rank: entry.rank,
        userId: entry.userId?._id || entry.userId,
        displayName: entry.userId?.displayName || entry.userId?.name || 'Anonymous',
        avatar: entry.userId?.avatar,
        score: entry.score,
        stats: entry.stats,
        changeDirection: entry.changeDirection,
        rankChange: entry.rankChange,
        rewards: entry.rewards,
      }));
      
      const result = {
        period,
        category,
        entries: formattedEntries,
        total: await LeaderboardEntry.countDocuments({ period, category, isActive: true }),
      };
      
      // Cache result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });
      
      return result;
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get top performers
   */
  async getTopPerformers(period, category, topN = 10) {
    try {
      const leaderboard = await this.getLeaderboard(period, category, { limit: topN });
      return leaderboard.entries;
    } catch (error) {
      console.error('Error getting top performers:', error);
      throw error;
    }
  }

  /**
   * Get user's rank
   */
  async getUserRank(userId, period, category) {
    try {
      const entry = await LeaderboardEntry.findOne({
        userId,
        period,
        category,
        isActive: true,
      }).populate('userId', 'displayName name avatar');
      
      if (!entry) {
        return {
          rank: null,
          score: 0,
          totalParticipants: await LeaderboardEntry.countDocuments({
            period,
            category,
            isActive: true,
          }),
        };
      }
      
      const totalParticipants = await LeaderboardEntry.countDocuments({
        period,
        category,
        isActive: true,
      });
      
      return {
        rank: entry.rank,
        score: entry.score,
        totalParticipants,
        percentile: Math.round(((totalParticipants - entry.rank) / totalParticipants) * 100),
        changeDirection: entry.changeDirection,
        rankChange: entry.rankChange,
        rewards: entry.rewards,
      };
    } catch (error) {
      console.error('Error getting user rank:', error);
      throw error;
    }
  }

  /**
   * Get user's rank context (surrounding ranks)
   */
  async getUserRankContext(userId, period, category, contextSize = 2) {
    try {
      const userEntry = await LeaderboardEntry.findOne({
        userId,
        period,
        category,
        isActive: true,
      });
      
      if (!userEntry) return null;
      
      const userRank = userEntry.rank;
      const startRank = Math.max(1, userRank - contextSize);
      const endRank = userRank + contextSize;
      
      const entries = await LeaderboardEntry.find({
        period,
        category,
        isActive: true,
        rank: { $gte: startRank, $lte: endRank },
      })
        .sort({ rank: 1 })
        .populate('userId', 'displayName name avatar');
      
      return entries.map(entry => ({
        rank: entry.rank,
        userId: entry.userId?._id?.toString() || entry.userId.toString(),
        displayName: entry.userId?.displayName || entry.userId?.name || 'Anonymous',
        avatar: entry.userId?.avatar,
        score: entry.score,
        isCurrentUser: entry.userId?._id?.toString() === userId.toString() ||
                       entry.userId.toString() === userId.toString(),
      }));
    } catch (error) {
      console.error('Error getting user rank context:', error);
      throw error;
    }
  }

  /**
   * Update leaderboard rankings
   */
  async updateRankings(period, category) {
    try {
      const { periodStart, periodEnd } = LeaderboardEntry.getPeriodDates(period);
      
      // Get all gamification profiles sorted by relevant metric
      let sortField;
      switch (category) {
        case LEADERBOARD_CATEGORIES.REFERRER:
          sortField = 'referralCount';
          break;
        case LEADERBOARD_CATEGORIES.HIRING:
          sortField = 'hireCount';
          break;
        case LEADERBOARD_CATEGORIES.NETWORK:
          sortField = 'shareCount';
          break;
        case LEADERBOARD_CATEGORIES.STREAK:
          sortField = 'currentStreak';
          break;
        default:
          sortField = 'totalPoints';
      }
      
      const profiles = await GamificationProfile.find()
        .sort({ [sortField]: -1 })
        .populate('userId', 'displayName name avatar');
      
      // Update or create entries
      const bulkOps = [];
      
      for (let i = 0; i < profiles.length; i++) {
        const profile = profiles[i];
        const newRank = i + 1;
        
        // Get existing entry to track rank change
        const existingEntry = await LeaderboardEntry.findOne({
          userId: profile.userId._id || profile.userId,
          period,
          category,
        });
        
        const previousRank = existingEntry ? existingEntry.rank : null;
        
        // Calculate rank change
        let changeDirection = RANK_CHANGE.NEW;
        let rankChange = 0;
        
        if (previousRank !== null) {
          if (newRank < previousRank) {
            changeDirection = RANK_CHANGE.UP;
            rankChange = previousRank - newRank;
          } else if (newRank > previousRank) {
            changeDirection = RANK_CHANGE.DOWN;
            rankChange = newRank - previousRank;
          } else {
            changeDirection = RANK_CHANGE.SAME;
          }
        }
        
        bulkOps.push({
          updateOne: {
            filter: {
              userId: profile.userId._id || profile.userId,
              period,
              category,
            },
            update: {
              $set: {
                score: profile[sortField],
                rank: newRank,
                previousRank,
                changeDirection,
                rankChange,
                periodStart,
                periodEnd,
                isActive: true,
                stats: {
                  referralCount: profile.referralCount,
                  hireCount: profile.hireCount,
                  shareCount: profile.shareCount,
                  badgeCount: profile.badges.length,
                  achievementCount: profile.achievements.filter(a => a.unlockedAt).length,
                },
              },
            },
            upsert: true,
          },
        });
      }
      
      if (bulkOps.length > 0) {
        await LeaderboardEntry.bulkWrite(bulkOps);
      }
      
      // Assign rewards to top performers
      await this.assignRewards(period, category);
      
      // Clear cache
      this.clearCache();
      
      return {
        success: true,
        updated: profiles.length,
      };
    } catch (error) {
      console.error('Error updating rankings:', error);
      throw error;
    }
  }

  /**
   * Assign rewards to top performers
   */
  async assignRewards(period, category) {
    try {
      const rewardTiers = [
        { rank: 1, points: 1000, badgeId: 'champion', boostMultiplier: 2.0 },
        { rank: 2, points: 750, badgeId: 'runner_up', boostMultiplier: 1.75 },
        { rank: 3, points: 500, badgeId: 'third_place', boostMultiplier: 1.5 },
        { rankRange: [4, 10], points: 250, boostMultiplier: 1.25 },
        { rankRange: [11, 50], points: 100, boostMultiplier: 1.1 },
        { rankRange: [51, 100], points: 50 },
      ];
      
      for (const tier of rewardTiers) {
        let query = { period, category };
        
        if (tier.rank) {
          query.rank = tier.rank;
        } else if (tier.rankRange) {
          query.rank = { $gte: tier.rankRange[0], $lte: tier.rankRange[1] };
        }
        
        await LeaderboardEntry.updateMany(query, {
          $set: {
            'rewards.points': tier.points,
            'rewards.badgeId': tier.badgeId || null,
            'rewards.boostMultiplier': tier.boostMultiplier || 1.0,
          },
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error assigning rewards:', error);
      throw error;
    }
  }

  /**
   * Claim leaderboard rewards
   */
  async claimRewards(userId, period, category) {
    try {
      const entry = await LeaderboardEntry.findOne({
        userId,
        period,
        category,
        isActive: true,
      });
      
      if (!entry) {
        return { success: false, message: 'No leaderboard entry found' };
      }
      
      if (entry.rewards.claimed) {
        return { success: false, message: 'Rewards already claimed' };
      }
      
      if (entry.rewards.points === 0 && !entry.rewards.badgeId) {
        return { success: false, message: 'No rewards available' };
      }
      
      // Claim rewards
      entry.claimReward();
      await entry.save();
      
      // Apply rewards to user profile
      const profile = await GamificationProfile.findOne({ userId });
      if (profile) {
        if (entry.rewards.points > 0) {
          profile.addPoints(entry.rewards.points, 'leaderboard_reward');
        }
        if (entry.rewards.boostMultiplier > 1.0) {
          profile.addBoost('points', entry.rewards.boostMultiplier, 168); // 1 week
        }
        await profile.save();
      }
      
      // Award badge if applicable
      if (entry.rewards.badgeId) {
        // This would integrate with badgeService
      }
      
      // Send notification
      await Notification.create({
        userId,
        type: 'LEADERBOARD_REWARD',
        title: 'Leaderboard Rewards Claimed! 🏆',
        message: `You've claimed ${entry.rewards.points} points for ranking #${entry.rank} on the ${category} leaderboard!`,
        data: {
          period,
          category,
          rank: entry.rank,
          points: entry.rewards.points,
          badgeId: entry.rewards.badgeId,
        },
      });
      
      return {
        success: true,
        rewards: entry.rewards,
      };
    } catch (error) {
      console.error('Error claiming rewards:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard statistics
   */
  async getStatistics(period, category) {
    try {
      const stats = await LeaderboardEntry.getStatistics(period, category);
      
      // Get additional stats
      const rankDistribution = await LeaderboardEntry.aggregate([
        { $match: { period, category, isActive: true } },
        {
          $bucket: {
            groupBy: '$rank',
            boundaries: [1, 4, 11, 51, 101, 501, 1001],
            default: 'Other',
            output: {
              count: { $sum: 1 },
              avgScore: { $avg: '$score' },
            },
          },
        },
      ]);
      
      return {
        ...stats,
        rankDistribution,
      };
    } catch (error) {
      console.error('Error getting leaderboard statistics:', error);
      throw error;
    }
  }

  /**
   * Get all leaderboards summary
   */
  async getAllLeaderboardsSummary(userId) {
    try {
      const periods = Object.values(LEADERBOARD_PERIODS);
      const categories = Object.values(LEADERBOARD_CATEGORIES);
      
      const summary = {};
      
      for (const period of periods) {
        summary[period] = {};
        for (const category of categories) {
          const leaderboard = await this.getLeaderboard(period, category, { limit: 10 });
          const userRank = await this.getUserRank(userId, period, category);
          
          summary[period][category] = {
            topEntries: leaderboard.entries.slice(0, 3),
            userRank,
            totalParticipants: leaderboard.total,
          };
        }
      }
      
      return summary;
    } catch (error) {
      console.error('Error getting leaderboards summary:', error);
      throw error;
    }
  }

  /**
   * Archive old leaderboards
   */
  async archiveOldLeaderboards(keepDays = 90) {
    try {
      const archived = await LeaderboardEntry.archiveOldEntries(keepDays);
      return { archived };
    } catch (error) {
      console.error('Error archiving old leaderboards:', error);
      throw error;
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get period label
   */
  getPeriodLabel(period) {
    const labels = {
      [LEADERBOARD_PERIODS.WEEKLY]: 'This Week',
      [LEADERBOARD_PERIODS.MONTHLY]: 'This Month',
      [LEADERBOARD_PERIODS.ALL_TIME]: 'All Time',
    };
    return labels[period] || period;
  }

  /**
   * Get category label
   */
  getCategoryLabel(category) {
    const labels = {
      [LEADERBOARD_CATEGORIES.REFERRER]: 'Top Referrers',
      [LEADERBOARD_CATEGORIES.COMPANY]: 'Top Companies',
      [LEADERBOARD_CATEGORIES.JOBS]: 'Most Jobs',
      [LEADERBOARD_CATEGORIES.EARNINGS]: 'Top Earners',
      [LEADERBOARD_CATEGORIES.STREAK]: 'Longest Streaks',
      [LEADERBOARD_CATEGORIES.NETWORK]: 'Biggest Networks',
    };
    return labels[category] || category;
  }

  /**
   * Get rank change icon
   */
  getRankChangeIcon(changeDirection) {
    const icons = {
      [RANK_CHANGE.UP]: '↑',
      [RANK_CHANGE.DOWN]: '↓',
      [RANK_CHANGE.SAME]: '→',
      [RANK_CHANGE.NEW]: '★',
    };
    return icons[changeDirection] || '→';
  }

  /**
   * Get rank change color
   */
  getRankChangeColor(changeDirection) {
    const colors = {
      [RANK_CHANGE.UP]: '#10B981',
      [RANK_CHANGE.DOWN]: '#EF4444',
      [RANK_CHANGE.SAME]: '#9CA3AF',
      [RANK_CHANGE.NEW]: '#F59E0B',
    };
    return colors[changeDirection] || '#9CA3AF';
  }
}

const leaderboardService = new LeaderboardService();
module.exports = leaderboardService;
