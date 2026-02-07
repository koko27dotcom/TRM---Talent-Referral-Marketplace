/**
 * GamificationProfile Model
 * Stores user's gamification data including points, levels, streaks, and achievements
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Badge earned schema
const EarnedBadgeSchema = new Schema({
  badgeId: {
    type: String,
    required: true,
  },
  earnedAt: {
    type: Date,
    default: Date.now,
  },
  viewed: {
    type: Boolean,
    default: false,
  },
}, { _id: true });

// Challenge progress schema
const ChallengeProgressSchema = new Schema({
  challengeId: {
    type: Schema.Types.ObjectId,
    ref: 'Challenge',
    required: true,
  },
  currentProgress: {
    type: Number,
    default: 0,
  },
  targetCount: {
    type: Number,
    required: true,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  rewardClaimed: {
    type: Boolean,
    default: false,
  },
  rewardClaimedAt: {
    type: Date,
    default: null,
  },
}, { _id: true });

// Achievement progress schema
const AchievementProgressSchema = new Schema({
  achievementId: {
    type: String,
    required: true,
  },
  currentProgress: {
    type: Number,
    default: 0,
  },
  targetValue: {
    type: Number,
    required: true,
  },
  unlockedAt: {
    type: Date,
    default: null,
  },
  timesCompleted: {
    type: Number,
    default: 0,
  },
}, { _id: true });

// Loot box history schema
const LootBoxHistorySchema = new Schema({
  openedAt: {
    type: Date,
    default: Date.now,
  },
  rewards: [{
    type: {
      type: String,
      enum: ['points', 'badge', 'boost'],
      required: true,
    },
    value: {
      type: Number,
      required: true,
    },
    badgeId: {
      type: String,
      default: null,
    },
  }],
}, { _id: true });

// Level history schema
const LevelHistorySchema = new Schema({
  level: {
    type: Number,
    required: true,
  },
  achievedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: true });

// Main GamificationProfile Schema
const GamificationProfileSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  
  // Points and Level
  totalPoints: {
    type: Number,
    default: 0,
    min: 0,
  },
  currentLevel: {
    type: Number,
    default: 1,
    min: 1,
  },
  tier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
    default: 'bronze',
  },
  pointsToNextLevel: {
    type: Number,
    default: 1000,
  },
  
  // Streaks
  currentStreak: {
    type: Number,
    default: 0,
    min: 0,
  },
  longestStreak: {
    type: Number,
    default: 0,
    min: 0,
  },
  lastActiveDate: {
    type: Date,
    default: null,
  },
  streakLastUpdated: {
    type: Date,
    default: null,
  },
  
  // Activity Counts
  referralCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  hireCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  shareCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  profileCompletion: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  
  // Collections
  badges: [EarnedBadgeSchema],
  achievements: [AchievementProgressSchema],
  activeChallenges: [ChallengeProgressSchema],
  completedChallenges: [ChallengeProgressSchema],
  lootBoxHistory: [LootBoxHistorySchema],
  levelHistory: [LevelHistorySchema],
  
  // Loot boxes
  lootBoxesAvailable: {
    type: Number,
    default: 0,
    min: 0,
  },
  lootBoxesOpened: {
    type: Number,
    default: 0,
    min: 0,
  },
  
  // Stats
  totalPointsEarned: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalPointsSpent: {
    type: Number,
    default: 0,
    min: 0,
  },
  
  // Boosts and Multipliers
  activeBoosts: [{
    type: {
      type: String,
      enum: ['points', 'xp', 'referral'],
    },
    multiplier: {
      type: Number,
      default: 1.0,
    },
    expiresAt: {
      type: Date,
    },
  }],
  
  // Preferences
  preferences: {
    showAnimations: {
      type: Boolean,
      default: true,
    },
    showNotifications: {
      type: Boolean,
      default: true,
    },
    publicProfile: {
      type: Boolean,
      default: true,
    },
  },
  
}, {
  timestamps: true,
});

// Indexes for performance
GamificationProfileSchema.index({ totalPoints: -1 });
GamificationProfileSchema.index({ currentLevel: -1 });
GamificationProfileSchema.index({ tier: 1, totalPoints: -1 });
GamificationProfileSchema.index({ 'badges.badgeId': 1 });

// Instance Methods

// Check if user has badge
GamificationProfileSchema.methods.hasBadge = function(badgeId) {
  return this.badges.some(badge => badge.badgeId === badgeId);
};

// Add badge to user
GamificationProfileSchema.methods.addBadge = function(badgeId) {
  if (!this.hasBadge(badgeId)) {
    this.badges.push({ badgeId, earnedAt: new Date(), viewed: false });
    return true;
  }
  return false;
};

// Mark badge as viewed
GamificationProfileSchema.methods.markBadgeViewed = function(badgeId) {
  const badge = this.badges.find(b => b.badgeId === badgeId);
  if (badge) {
    badge.viewed = true;
    return true;
  }
  return false;
};

// Get unviewed badges
GamificationProfileSchema.methods.getUnviewedBadges = function() {
  return this.badges.filter(badge => !badge.viewed);
};

// Add points with level checking
GamificationProfileSchema.methods.addPoints = function(points, source = 'general') {
  const multiplier = this.getActiveMultiplier('points');
  const finalPoints = Math.floor(points * multiplier);
  
  this.totalPoints += finalPoints;
  this.totalPointsEarned += finalPoints;
  
  // Check for level up
  const oldLevel = this.currentLevel;
  this.updateLevel();
  
  return {
    points: finalPoints,
    source,
    leveledUp: this.currentLevel > oldLevel,
    oldLevel,
    newLevel: this.currentLevel,
  };
};

// Update level based on points
GamificationProfileSchema.methods.updateLevel = function() {
  const points = this.totalPoints;
  let newLevel = 1;
  let tier = 'bronze';
  
  // Level calculation
  if (points >= 50001) {
    newLevel = Math.min(21 + Math.floor((points - 50001) / 10000), 100);
    tier = 'diamond';
  } else if (points >= 15001) {
    newLevel = 16 + Math.floor((points - 15001) / 7000);
    tier = 'platinum';
  } else if (points >= 5001) {
    newLevel = 11 + Math.floor((points - 5001) / 2000);
    tier = 'gold';
  } else if (points >= 1001) {
    newLevel = 6 + Math.floor((points - 1001) / 800);
    tier = 'silver';
  } else {
    newLevel = 1 + Math.floor(points / 200);
    tier = 'bronze';
  }
  
  // Record level up
  if (newLevel > this.currentLevel) {
    for (let i = this.currentLevel + 1; i <= newLevel; i++) {
      this.levelHistory.push({ level: i, achievedAt: new Date() });
    }
    // Award loot box for level up
    this.lootBoxesAvailable += (newLevel - this.currentLevel);
  }
  
  this.currentLevel = newLevel;
  this.tier = tier;
  
  // Calculate points to next level
  this.pointsToNextLevel = this.calculatePointsToNextLevel();
};

// Calculate points needed for next level
GamificationProfileSchema.methods.calculatePointsToNextLevel = function() {
  const level = this.currentLevel;
  let nextLevelPoints;
  
  if (level >= 21) {
    nextLevelPoints = 50001 + ((level - 20) * 10000);
  } else if (level >= 16) {
    nextLevelPoints = 15001 + ((level - 15) * 7000);
  } else if (level >= 11) {
    nextLevelPoints = 5001 + ((level - 10) * 2000);
  } else if (level >= 6) {
    nextLevelPoints = 1001 + ((level - 5) * 800);
  } else {
    nextLevelPoints = level * 200;
  }
  
  return Math.max(0, nextLevelPoints - this.totalPoints);
};

// Update streak
GamificationProfileSchema.methods.updateStreak = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (!this.lastActiveDate) {
    this.currentStreak = 1;
    this.lastActiveDate = today;
    this.streakLastUpdated = new Date();
    return { streak: 1, bonus: false };
  }
  
  const lastActive = new Date(this.lastActiveDate);
  lastActive.setHours(0, 0, 0, 0);
  
  const diffTime = today - lastActive;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  let bonus = false;
  
  if (diffDays === 1) {
    // Consecutive day
    this.currentStreak += 1;
    if (this.currentStreak > this.longestStreak) {
      this.longestStreak = this.currentStreak;
    }
    // 7-day streak bonus
    if (this.currentStreak % 7 === 0) {
      bonus = true;
    }
  } else if (diffDays > 1) {
    // Streak broken
    this.currentStreak = 1;
  }
  // diffDays === 0 means same day, no change
  
  this.lastActiveDate = today;
  this.streakLastUpdated = new Date();
  
  return { streak: this.currentStreak, bonus };
};

// Get active multiplier
GamificationProfileSchema.methods.getActiveMultiplier = function(type) {
  const now = new Date();
  const activeBoost = this.activeBoosts.find(
    boost => boost.type === type && boost.expiresAt > now
  );
  return activeBoost ? activeBoost.multiplier : 1.0;
};

// Add boost
GamificationProfileSchema.methods.addBoost = function(type, multiplier, durationHours) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + durationHours);
  
  // Remove existing boost of same type
  this.activeBoosts = this.activeBoosts.filter(b => b.type !== type);
  
  this.activeBoosts.push({
    type,
    multiplier,
    expiresAt,
  });
};

// Open loot box
GamificationProfileSchema.methods.openLootBox = function() {
  if (this.lootBoxesAvailable <= 0) {
    return null;
  }
  
  this.lootBoxesAvailable -= 1;
  this.lootBoxesOpened += 1;
  
  // Generate random rewards
  const rewards = this.generateLootBoxRewards();
  
  this.lootBoxHistory.push({
    openedAt: new Date(),
    rewards,
  });
  
  // Apply rewards
  rewards.forEach(reward => {
    if (reward.type === 'points') {
      this.totalPoints += reward.value;
      this.totalPointsEarned += reward.value;
    }
  });
  
  this.updateLevel();
  
  return rewards;
};

// Generate loot box rewards
GamificationProfileSchema.methods.generateLootBoxRewards = function() {
  const rewards = [];
  const roll = Math.random();
  
  // Points reward (always given)
  let points = 50;
  if (roll > 0.9) points = 500; // 10% chance
  else if (roll > 0.7) points = 200; // 20% chance
  else if (roll > 0.4) points = 100; // 30% chance
  
  rewards.push({ type: 'points', value: points });
  
  // Bonus reward chance
  if (roll > 0.8) {
    rewards.push({ type: 'boost', value: 1.5, duration: 24 });
  }
  
  return rewards;
};

// Get progress to next level (percentage)
GamificationProfileSchema.methods.getLevelProgress = function() {
  const currentLevelPoints = this.getPointsForLevel(this.currentLevel);
  const nextLevelPoints = this.getPointsForLevel(this.currentLevel + 1);
  const progress = this.totalPoints - currentLevelPoints;
  const total = nextLevelPoints - currentLevelPoints;
  return Math.min(100, Math.max(0, (progress / total) * 100));
};

// Get points required for a specific level
GamificationProfileSchema.methods.getPointsForLevel = function(level) {
  if (level <= 1) return 0;
  if (level >= 22) return 50001 + ((level - 21) * 10000);
  if (level >= 17) return 15001 + ((level - 16) * 7000);
  if (level >= 12) return 5001 + ((level - 11) * 2000);
  if (level >= 7) return 1001 + ((level - 6) * 800);
  return (level - 1) * 200;
};

// Static Methods

// Get leaderboard
GamificationProfileSchema.statics.getLeaderboard = async function(period = 'all-time', category = 'points', limit = 100) {
  const sortField = category === 'referrals' ? 'referralCount' : 
                    category === 'hires' ? 'hireCount' : 'totalPoints';
  
  const pipeline = [
    { $sort: { [sortField]: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $project: {
        rank: { $add: [{ $indexOfArray: [[]] }, 1] },
        userId: 1,
        displayName: { $ifNull: ['$user.displayName', '$user.name'] },
        avatar: '$user.avatar',
        totalPoints: 1,
        currentLevel: 1,
        tier: 1,
        referralCount: 1,
        hireCount: 1,
        badgeCount: { $size: '$badges' },
      },
    },
  ];
  
  const results = await this.aggregate(pipeline);
  
  // Add rank
  results.forEach((entry, index) => {
    entry.rank = index + 1;
  });
  
  return results;
};

// Get user's rank
GamificationProfileSchema.statics.getUserRank = async function(userId, category = 'points') {
  const sortField = category === 'referrals' ? 'referralCount' : 
                    category === 'hires' ? 'hireCount' : 'totalPoints';
  
  const userProfile = await this.findOne({ userId });
  if (!userProfile) return null;
  
  const rank = await this.countDocuments({
    [sortField]: { $gt: userProfile[sortField] }
  });
  
  return {
    rank: rank + 1,
    score: userProfile[sortField],
    totalParticipants: await this.countDocuments(),
  };
};

// Create or update profile
GamificationProfileSchema.statics.createOrUpdateProfile = async function(userId, updates = {}) {
  return this.findOneAndUpdate(
    { userId },
    { $set: updates },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const GamificationProfile = mongoose.model('GamificationProfile', GamificationProfileSchema);

module.exports = GamificationProfile;
