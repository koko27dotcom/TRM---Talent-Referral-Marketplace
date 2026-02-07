/**
 * LeaderboardEntry Model
 * Stores leaderboard rankings for different periods and categories
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Leaderboard periods
const LEADERBOARD_PERIODS = {
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  ALL_TIME: 'all-time',
};

// Leaderboard categories
const LEADERBOARD_CATEGORIES = {
  REFERRER: 'referrer',
  COMPANY: 'company',
  JOBS: 'jobs',
  EARNINGS: 'earnings',
  STREAK: 'streak',
  NETWORK: 'network',
};

// Rank change directions
const RANK_CHANGE = {
  UP: 'up',
  DOWN: 'down',
  SAME: 'same',
  NEW: 'new',
};

// LeaderboardEntry Schema
const LeaderboardEntrySchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // Period and Category
  period: {
    type: String,
    enum: Object.values(LEADERBOARD_PERIODS),
    required: true,
    index: true,
  },
  category: {
    type: String,
    enum: Object.values(LEADERBOARD_CATEGORIES),
    required: true,
    index: true,
  },
  
  // Score and Rank
  score: {
    type: Number,
    required: true,
    default: 0,
    index: true,
  },
  rank: {
    type: Number,
    required: true,
    default: 0,
    index: true,
  },
  
  // Rank tracking
  previousRank: {
    type: Number,
    default: null,
  },
  changeDirection: {
    type: String,
    enum: Object.values(RANK_CHANGE),
    default: RANK_CHANGE.NEW,
  },
  rankChange: {
    type: Number,
    default: 0,
  },
  
  // Period dates
  periodStart: {
    type: Date,
    required: true,
  },
  periodEnd: {
    type: Date,
    required: true,
  },
  
  // Detailed stats
  stats: {
    referralCount: {
      type: Number,
      default: 0,
    },
    hireCount: {
      type: Number,
      default: 0,
    },
    shareCount: {
      type: Number,
      default: 0,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
    currentStreak: {
      type: Number,
      default: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
    badgeCount: {
      type: Number,
      default: 0,
    },
    achievementCount: {
      type: Number,
      default: 0,
    },
    networkSize: {
      type: Number,
      default: 0,
    },
    jobsPosted: {
      type: Number,
      default: 0,
    },
    successfulHires: {
      type: Number,
      default: 0,
    },
  },
  
  // Rewards for top performers
  rewards: {
    points: {
      type: Number,
      default: 0,
    },
    badgeId: {
      type: String,
      default: null,
    },
    boostType: {
      type: String,
      default: null,
    },
    boostMultiplier: {
      type: Number,
      default: 1.0,
    },
    claimed: {
      type: Boolean,
      default: false,
    },
    claimedAt: {
      type: Date,
      default: null,
    },
  },
  
  // Metadata
  isActive: {
    type: Boolean,
    default: true,
  },
  
}, {
  timestamps: true,
});

// Compound indexes for efficient queries
LeaderboardEntrySchema.index({ period: 1, category: 1, rank: 1 });
LeaderboardEntrySchema.index({ period: 1, category: 1, score: -1 });
LeaderboardEntrySchema.index({ userId: 1, period: 1, category: 1 }, { unique: true });
LeaderboardEntrySchema.index({ periodStart: 1, periodEnd: 1 });

// Instance Methods

// Calculate rank change
LeaderboardEntrySchema.methods.calculateRankChange = function() {
  if (this.previousRank === null) {
    this.changeDirection = RANK_CHANGE.NEW;
    this.rankChange = 0;
  } else if (this.rank < this.previousRank) {
    this.changeDirection = RANK_CHANGE.UP;
    this.rankChange = this.previousRank - this.rank;
  } else if (this.rank > this.previousRank) {
    this.changeDirection = RANK_CHANGE.DOWN;
    this.rankChange = this.rank - this.previousRank;
  } else {
    this.changeDirection = RANK_CHANGE.SAME;
    this.rankChange = 0;
  }
};

// Claim reward
LeaderboardEntrySchema.methods.claimReward = function() {
  if (this.rewards.claimed) return false;
  
  this.rewards.claimed = true;
  this.rewards.claimedAt = new Date();
  return true;
};

// Static Methods

// Get leaderboard for period and category
LeaderboardEntrySchema.statics.getLeaderboard = async function(period, category, options = {}) {
  const { limit = 100, skip = 0, includeStats = true } = options;
  
  const query = { period, category, isActive: true };
  
  const entries = await this.find(query)
    .sort({ rank: 1 })
    .skip(skip)
    .limit(limit)
    .populate('userId', 'displayName name avatar email')
    .lean();
  
  if (!includeStats) {
    entries.forEach(entry => delete entry.stats);
  }
  
  return entries;
};

// Get top performers
LeaderboardEntrySchema.statics.getTopPerformers = async function(period, category, topN = 10) {
  return this.getLeaderboard(period, category, { limit: topN });
};

// Get user's rank
LeaderboardEntrySchema.statics.getUserRank = async function(userId, period, category) {
  const entry = await this.findOne({
    userId,
    period,
    category,
    isActive: true,
  }).populate('userId', 'displayName name avatar');
  
  if (!entry) return null;
  
  // Get total participants
  const totalParticipants = await this.countDocuments({
    period,
    category,
    isActive: true,
  });
  
  return {
    rank: entry.rank,
    score: entry.score,
    totalParticipants,
    changeDirection: entry.changeDirection,
    rankChange: entry.rankChange,
    percentile: Math.round(((totalParticipants - entry.rank) / totalParticipants) * 100),
  };
};

// Get user's surrounding ranks (for context)
LeaderboardEntrySchema.statics.getUserRankContext = async function(userId, period, category, contextSize = 2) {
  const userEntry = await this.findOne({
    userId,
    period,
    category,
    isActive: true,
  });
  
  if (!userEntry) return null;
  
  const userRank = userEntry.rank;
  const startRank = Math.max(1, userRank - contextSize);
  const endRank = userRank + contextSize;
  
  const entries = await this.find({
    period,
    category,
    isActive: true,
    rank: { $gte: startRank, $lte: endRank },
  })
    .sort({ rank: 1 })
    .populate('userId', 'displayName name avatar');
  
  return entries.map(entry => ({
    ...entry.toObject(),
    isCurrentUser: entry.userId._id.toString() === userId.toString(),
  }));
};

// Update or create entry
LeaderboardEntrySchema.statics.updateEntry = async function(userId, period, category, data) {
  const { score, stats, periodStart, periodEnd } = data;
  
  // Get existing entry to track rank change
  const existingEntry = await this.findOne({ userId, period, category });
  const previousRank = existingEntry ? existingEntry.rank : null;
  
  // Update entry
  const entry = await this.findOneAndUpdate(
    { userId, period, category },
    {
      $set: {
        score,
        stats,
        periodStart,
        periodEnd,
        previousRank,
        isActive: true,
      },
    },
    { upsert: true, new: true }
  );
  
  return entry;
};

// Recalculate ranks for a leaderboard
LeaderboardEntrySchema.statics.recalculateRanks = async function(period, category) {
  const entries = await this.find({ period, category, isActive: true })
    .sort({ score: -1 });
  
  const bulkOps = entries.map((entry, index) => ({
    updateOne: {
      filter: { _id: entry._id },
      update: {
        $set: {
          rank: index + 1,
          previousRank: entry.rank,
        },
      },
    },
  }));
  
  if (bulkOps.length > 0) {
    await this.bulkWrite(bulkOps);
  }
  
  // Calculate rank changes
  const updatedEntries = await this.find({ period, category, isActive: true });
  for (const entry of updatedEntries) {
    entry.calculateRankChange();
    await entry.save();
  }
  
  return entries.length;
};

// Assign rewards to top performers
LeaderboardEntrySchema.statics.assignRewards = async function(period, category) {
  const rewardTiers = [
    { rank: 1, points: 1000, badgeId: 'champion', boostMultiplier: 2.0 },
    { rank: 2, points: 750, badgeId: 'runner_up', boostMultiplier: 1.75 },
    { rank: 3, points: 500, badgeId: 'third_place', boostMultiplier: 1.5 },
    { rankRange: [4, 10], points: 250, boostMultiplier: 1.25 },
    { rankRange: [11, 50], points: 100, boostMultiplier: 1.1 },
    { rankRange: [51, 100], points: 50 },
  ];
  
  const bulkOps = [];
  
  for (const tier of rewardTiers) {
    let query = { period, category };
    
    if (tier.rank) {
      query.rank = tier.rank;
    } else if (tier.rankRange) {
      query.rank = { $gte: tier.rankRange[0], $lte: tier.rankRange[1] };
    }
    
    const update = {
      $set: {
        'rewards.points': tier.points,
        'rewards.badgeId': tier.badgeId || null,
        'rewards.boostMultiplier': tier.boostMultiplier || 1.0,
      },
    };
    
    bulkOps.push({
      updateMany: {
        filter: query,
        update,
      },
    });
  }
  
  if (bulkOps.length > 0) {
    await this.bulkWrite(bulkOps);
  }
  
  return true;
};

// Archive old leaderboards
LeaderboardEntrySchema.statics.archiveOldEntries = async function(keepDays = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - keepDays);
  
  const result = await this.updateMany(
    {
      periodEnd: { $lt: cutoffDate },
      isActive: true,
    },
    { $set: { isActive: false } }
  );
  
  return result.modifiedCount;
};

// Get leaderboard statistics
LeaderboardEntrySchema.statics.getStatistics = async function(period, category) {
  const stats = await this.aggregate([
    { $match: { period, category, isActive: true } },
    {
      $group: {
        _id: null,
        totalParticipants: { $sum: 1 },
        averageScore: { $avg: '$score' },
        highestScore: { $max: '$score' },
        lowestScore: { $min: '$score' },
        totalPointsAwarded: { $sum: '$rewards.points' },
      },
    },
  ]);
  
  return stats[0] || {
    totalParticipants: 0,
    averageScore: 0,
    highestScore: 0,
    lowestScore: 0,
    totalPointsAwarded: 0,
  };
};

// Get period date range
LeaderboardEntrySchema.statics.getPeriodDates = function(period) {
  const now = new Date();
  let periodStart, periodEnd;
  
  switch (period) {
    case LEADERBOARD_PERIODS.WEEKLY:
      // Start of week (Sunday)
      periodStart = new Date(now);
      periodStart.setDate(now.getDate() - now.getDay());
      periodStart.setHours(0, 0, 0, 0);
      
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 6);
      periodEnd.setHours(23, 59, 59, 999);
      break;
      
    case LEADERBOARD_PERIODS.MONTHLY:
      // Start of month
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      periodEnd.setHours(23, 59, 59, 999);
      break;
      
    case LEADERBOARD_PERIODS.ALL_TIME:
    default:
      periodStart = new Date('2000-01-01');
      periodEnd = new Date('2099-12-31');
      break;
  }
  
  return { periodStart, periodEnd };
};

const LeaderboardEntry = mongoose.model('LeaderboardEntry', LeaderboardEntrySchema);

module.exports = LeaderboardEntry;
