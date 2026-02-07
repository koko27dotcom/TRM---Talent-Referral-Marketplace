/**
 * Achievement Model
 * Defines trackable achievements with progress tracking and rewards
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Achievement categories
const ACHIEVEMENT_CATEGORIES = {
  REFERRAL: 'referral',
  HIRING: 'hiring',
  NETWORKING: 'networking',
  EARNING: 'earning',
  STREAK: 'streak',
  PROFILE: 'profile',
  COMMUNITY: 'community',
  EXPLORATION: 'exploration',
  MASTERY: 'mastery',
};

// Criteria operators
const CRITERIA_OPERATORS = {
  EQUALS: 'eq',
  GREATER_THAN: 'gt',
  GREATER_THAN_EQUAL: 'gte',
  LESS_THAN: 'lt',
  LESS_THAN_EQUAL: 'lte',
  IN: 'in',
  CONTAINS: 'contains',
};

// Predefined achievements
const PREDEFINED_ACHIEVEMENTS = [
  // Profile Achievements
  {
    achievementId: 'complete_profile',
    name: 'Complete Profile',
    description: 'Fill out all required profile fields',
    category: ACHIEVEMENT_CATEGORIES.PROFILE,
    criteria: {
      field: 'profileCompletion',
      operator: CRITERIA_OPERATORS.GREATER_THAN_EQUAL,
      value: 100,
    },
    rewardPoints: 50,
    rewardBadgeId: 'first_steps',
    isRepeatable: false,
  },
  {
    achievementId: 'add_profile_photo',
    name: 'Add Profile Photo',
    description: 'Upload a profile picture',
    category: ACHIEVEMENT_CATEGORIES.PROFILE,
    criteria: {
      field: 'hasProfilePhoto',
      operator: CRITERIA_OPERATORS.EQUALS,
      value: true,
    },
    rewardPoints: 25,
    rewardBadgeId: 'photo_ready',
    isRepeatable: false,
  },
  
  // Referral Achievements
  {
    achievementId: 'first_referral_submitted',
    name: 'First Referral',
    description: 'Submit your first candidate referral',
    category: ACHIEVEMENT_CATEGORIES.REFERRAL,
    criteria: {
      field: 'referralCount',
      operator: CRITERIA_OPERATORS.GREATER_THAN_EQUAL,
      value: 1,
    },
    rewardPoints: 100,
    rewardBadgeId: 'first_referral',
    isRepeatable: false,
  },
  {
    achievementId: 'referral_milestone_5',
    name: '5 Referrals Milestone',
    description: 'Submit 5 referrals',
    category: ACHIEVEMENT_CATEGORIES.REFERRAL,
    criteria: {
      field: 'referralCount',
      operator: CRITERIA_OPERATORS.GREATER_THAN_EQUAL,
      value: 5,
    },
    rewardPoints: 150,
    rewardBadgeId: 'referral_rookie',
    isRepeatable: false,
  },
  {
    achievementId: 'referral_milestone_10',
    name: '10 Referrals Milestone',
    description: 'Submit 10 referrals',
    category: ACHIEVEMENT_CATEGORIES.REFERRAL,
    criteria: {
      field: 'referralCount',
      operator: CRITERIA_OPERATORS.GREATER_THAN_EQUAL,
      value: 10,
    },
    rewardPoints: 300,
    rewardBadgeId: 'referral_machine',
    isRepeatable: false,
  },
  {
    achievementId: 'referral_milestone_25',
    name: '25 Referrals Milestone',
    description: 'Submit 25 referrals',
    category: ACHIEVEMENT_CATEGORIES.REFERRAL,
    criteria: {
      field: 'referralCount',
      operator: CRITERIA_OPERATORS.GREATER_THAN_EQUAL,
      value: 25,
    },
    rewardPoints: 750,
    rewardBadgeId: 'referral_master',
    isRepeatable: false,
  },
  {
    achievementId: 'referral_milestone_50',
    name: '50 Referrals Milestone',
    description: 'Submit 50 referrals',
    category: ACHIEVEMENT_CATEGORIES.REFERRAL,
    criteria: {
      field: 'referralCount',
      operator: CRITERIA_OPERATORS.GREATER_THAN_EQUAL,
      value: 50,
    },
    rewardPoints: 1500,
    rewardBadgeId: 'referral_legend',
    isRepeatable: false,
  },
  
  // Hiring Achievements
  {
    achievementId: 'first_hire',
    name: 'First Successful Hire',
    description: 'Get your first referral hired',
    category: ACHIEVEMENT_CATEGORIES.HIRING,
    criteria: {
      field: 'hireCount',
      operator: CRITERIA_OPERATORS.GREATER_THAN_EQUAL,
      value: 1,
    },
    rewardPoints: 500,
    rewardBadgeId: 'hiring_hero',
    isRepeatable: false,
  },
  {
    achievementId: 'hiring_milestone_5',
    name: '5 Hires Milestone',
    description: 'Get 5 referrals hired',
    category: ACHIEVEMENT_CATEGORIES.HIRING,
    criteria: {
      field: 'hireCount',
      operator: CRITERIA_OPERATORS.GREATER_THAN_EQUAL,
      value: 5,
    },
    rewardPoints: 1500,
    rewardBadgeId: 'talent_scout',
    isRepeatable: false,
  },
  {
    achievementId: 'hiring_milestone_50',
    name: '50 Hires Milestone',
    description: 'Get 50 referrals hired',
    category: ACHIEVEMENT_CATEGORIES.HIRING,
    criteria: {
      field: 'hireCount',
      operator: CRITERIA_OPERATORS.GREATER_THAN_EQUAL,
      value: 50,
    },
    rewardPoints: 5000,
    rewardBadgeId: 'legendary_recruiter',
    isRepeatable: false,
  },
  
  // Networking Achievements
  {
    achievementId: 'share_jobs_10',
    name: 'Share 10 Jobs',
    description: 'Share 10 jobs on social media',
    category: ACHIEVEMENT_CATEGORIES.NETWORKING,
    criteria: {
      field: 'shareCount',
      operator: CRITERIA_OPERATORS.GREATER_THAN_EQUAL,
      value: 10,
    },
    rewardPoints: 100,
    rewardBadgeId: 'networking_pro',
    isRepeatable: false,
  },
  {
    achievementId: 'share_jobs_50',
    name: 'Share 50 Jobs',
    description: 'Share 50 jobs on social media',
    category: ACHIEVEMENT_CATEGORIES.NETWORKING,
    criteria: {
      field: 'shareCount',
      operator: CRITERIA_OPERATORS.GREATER_THAN_EQUAL,
      value: 50,
    },
    rewardPoints: 300,
    rewardBadgeId: 'social_butterfly',
    isRepeatable: false,
  },
  {
    achievementId: 'share_jobs_100',
    name: 'Share 100 Jobs',
    description: 'Share 100 jobs on social media',
    category: ACHIEVEMENT_CATEGORIES.NETWORKING,
    criteria: {
      field: 'shareCount',
      operator: CRITERIA_OPERATORS.GREATER_THAN_EQUAL,
      value: 100,
    },
    rewardPoints: 600,
    rewardBadgeId: 'viral_sensation',
    isRepeatable: false,
  },
  
  // Earning Achievements
  {
    achievementId: 'earn_100k',
    name: 'Earn 100,000 MMK',
    description: 'Accumulate 100,000 MMK in earnings',
    category: ACHIEVEMENT_CATEGORIES.EARNING,
    criteria: {
      field: 'totalEarnings',
      operator: CRITERIA_OPERATORS.GREATER_THAN_EQUAL,
      value: 100000,
    },
    rewardPoints: 500,
    rewardBadgeId: 'top_earner',
    isRepeatable: false,
  },
  {
    achievementId: 'earn_500k',
    name: 'Earn 500,000 MMK',
    description: 'Accumulate 500,000 MMK in earnings',
    category: ACHIEVEMENT_CATEGORIES.EARNING,
    criteria: {
      field: 'totalEarnings',
      operator: CRITERIA_OPERATORS.GREATER_THAN_EQUAL,
      value: 500000,
    },
    rewardPoints: 1500,
    rewardBadgeId: 'wealth_builder',
    isRepeatable: false,
  },
  {
    achievementId: 'earn_1m',
    name: 'Earn 1,000,000 MMK',
    description: 'Accumulate 1,000,000 MMK in earnings',
    category: ACHIEVEMENT_CATEGORIES.EARNING,
    criteria: {
      field: 'totalEarnings',
      operator: CRITERIA_OPERATORS.GREATER_THAN_EQUAL,
      value: 1000000,
    },
    rewardPoints: 3000,
    rewardBadgeId: 'millionaire_club',
    isRepeatable: false,
  },
  
  // Streak Achievements
  {
    achievementId: 'streak_3_days',
    name: '3-Day Streak',
    description: 'Login for 3 consecutive days',
    category: ACHIEVEMENT_CATEGORIES.STREAK,
    criteria: {
      field: 'currentStreak',
      operator: CRITERIA_OPERATORS.GREATER_THAN_EQUAL,
      value: 3,
    },
    rewardPoints: 50,
    rewardBadgeId: 'streak_starter',
    isRepeatable: false,
  },
  {
    achievementId: 'streak_7_days',
    name: '7-Day Streak',
    description: 'Login for 7 consecutive days',
    category: ACHIEVEMENT_CATEGORIES.STREAK,
    criteria: {
      field: 'currentStreak',
      operator: CRITERIA_OPERATORS.GREATER_THAN_EQUAL,
      value: 7,
    },
    rewardPoints: 200,
    rewardBadgeId: 'streak_master',
    isRepeatable: false,
  },
  {
    achievementId: 'streak_30_days',
    name: '30-Day Streak',
    description: 'Login for 30 consecutive days',
    category: ACHIEVEMENT_CATEGORIES.STREAK,
    criteria: {
      field: 'currentStreak',
      operator: CRITERIA_OPERATORS.GREATER_THAN_EQUAL,
      value: 30,
    },
    rewardPoints: 1000,
    rewardBadgeId: 'streak_champion',
    isRepeatable: false,
  },
  {
    achievementId: 'streak_100_days',
    name: '100-Day Streak',
    description: 'Login for 100 consecutive days',
    category: ACHIEVEMENT_CATEGORIES.STREAK,
    criteria: {
      field: 'currentStreak',
      operator: CRITERIA_OPERATORS.GREATER_THAN_EQUAL,
      value: 100,
    },
    rewardPoints: 3000,
    rewardBadgeId: 'unstoppable',
    isRepeatable: false,
  },
  
  // Community Achievements
  {
    achievementId: 'invite_5_friends',
    name: 'Invite 5 Friends',
    description: 'Refer 5 friends to join the platform',
    category: ACHIEVEMENT_CATEGORIES.COMMUNITY,
    criteria: {
      field: 'referralCount',
      operator: CRITERIA_OPERATORS.GREATER_THAN_EQUAL,
      value: 5,
    },
    rewardPoints: 400,
    rewardBadgeId: 'community_champion',
    isRepeatable: false,
  },
  {
    achievementId: 'invite_10_friends',
    name: 'Invite 10 Friends',
    description: 'Refer 10 friends to join the platform',
    category: ACHIEVEMENT_CATEGORIES.COMMUNITY,
    criteria: {
      field: 'referralCount',
      operator: CRITERIA_OPERATORS.GREATER_THAN_EQUAL,
      value: 10,
    },
    rewardPoints: 800,
    rewardBadgeId: 'influencer',
    isRepeatable: false,
  },
  
  // Exploration Achievements
  {
    achievementId: 'explore_platform',
    name: 'Platform Explorer',
    description: 'Visit all major sections of the platform',
    category: ACHIEVEMENT_CATEGORIES.EXPLORATION,
    criteria: {
      field: 'sectionsVisited',
      operator: CRITERIA_OPERATORS.GREATER_THAN_EQUAL,
      value: 5,
    },
    rewardPoints: 100,
    isRepeatable: false,
  },
  {
    achievementId: 'first_payout',
    name: 'First Payout',
    description: 'Request your first payout',
    category: ACHIEVEMENT_CATEGORIES.EXPLORATION,
    criteria: {
      field: 'payoutCount',
      operator: CRITERIA_OPERATORS.GREATER_THAN_EQUAL,
      value: 1,
    },
    rewardPoints: 200,
    rewardBadgeId: 'first_earnings',
    isRepeatable: false,
  },
  
  // Mastery Achievements (Repeatable)
  {
    achievementId: 'daily_login',
    name: 'Daily Login',
    description: 'Login to the platform today',
    category: ACHIEVEMENT_CATEGORIES.MASTERY,
    criteria: {
      field: 'dailyLogin',
      operator: CRITERIA_OPERATORS.EQUALS,
      value: true,
    },
    rewardPoints: 5,
    isRepeatable: true,
    maxRepeats: 365,
    resetPeriod: 'daily',
  },
  {
    achievementId: 'weekly_referral_goal',
    name: 'Weekly Referral Goal',
    description: 'Submit 3 referrals in a week',
    category: ACHIEVEMENT_CATEGORIES.MASTERY,
    criteria: {
      field: 'weeklyReferrals',
      operator: CRITERIA_OPERATORS.GREATER_THAN_EQUAL,
      value: 3,
    },
    rewardPoints: 100,
    isRepeatable: true,
    maxRepeats: 52,
    resetPeriod: 'weekly',
  },
];

// Criteria Schema
const CriteriaSchema = new Schema({
  field: {
    type: String,
    required: true,
  },
  operator: {
    type: String,
    enum: Object.values(CRITERIA_OPERATORS),
    required: true,
  },
  value: {
    type: Schema.Types.Mixed,
    required: true,
  },
  secondaryField: {
    type: String,
    default: null,
  },
}, { _id: false });

// Achievement Schema
const AchievementSchema = new Schema({
  achievementId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    enum: Object.values(ACHIEVEMENT_CATEGORIES),
    required: true,
    index: true,
  },
  criteria: {
    type: CriteriaSchema,
    required: true,
  },
  progressTracking: {
    type: Boolean,
    default: true,
  },
  rewardPoints: {
    type: Number,
    default: 0,
    min: 0,
  },
  rewardBadgeId: {
    type: String,
    default: null,
  },
  rewardUnlocksFeature: {
    type: String,
    default: null,
  },
  isRepeatable: {
    type: Boolean,
    default: false,
  },
  maxRepeats: {
    type: Number,
    default: 1,
    min: 1,
  },
  resetPeriod: {
    type: String,
    enum: ['none', 'daily', 'weekly', 'monthly'],
    default: 'none',
  },
  isSecret: {
    type: Boolean,
    default: false,
  },
  hiddenDescription: {
    type: String,
    default: '???',
  },
  prerequisites: [{
    type: String,
  }],
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'expert'],
    default: 'easy',
  },
  expiresAt: {
    type: Date,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes
AchievementSchema.index({ category: 1, difficulty: 1 });
AchievementSchema.index({ rewardPoints: -1 });
AchievementSchema.index({ isActive: 1, expiresAt: 1 });

// Instance Methods

// Check if criteria is met
AchievementSchema.methods.checkCriteria = function(userStats) {
  const { field, operator, value } = this.criteria;
  const userValue = userStats[field];
  
  switch (operator) {
    case CRITERIA_OPERATORS.EQUALS:
      return userValue === value;
    case CRITERIA_OPERATORS.GREATER_THAN:
      return userValue > value;
    case CRITERIA_OPERATORS.GREATER_THAN_EQUAL:
      return userValue >= value;
    case CRITERIA_OPERATORS.LESS_THAN:
      return userValue < value;
    case CRITERIA_OPERATORS.LESS_THAN_EQUAL:
      return userValue <= value;
    case CRITERIA_OPERATORS.IN:
      return Array.isArray(value) && value.includes(userValue);
    case CRITERIA_OPERATORS.CONTAINS:
      return Array.isArray(userValue) && userValue.includes(value);
    default:
      return false;
  }
};

// Get progress percentage
AchievementSchema.methods.getProgress = function(userStats) {
  if (!this.progressTracking) return null;
  
  const { field, value } = this.criteria;
  const userValue = userStats[field] || 0;
  
  if (typeof value === 'number' && value > 0) {
    return Math.min(100, Math.max(0, (userValue / value) * 100));
  }
  
  return userValue >= value ? 100 : 0;
};

// Check if achievement is available
AchievementSchema.methods.isAvailable = function() {
  if (!this.isActive) return false;
  if (this.expiresAt && new Date() > this.expiresAt) return false;
  return true;
};

// Static Methods

// Get achievements by category
AchievementSchema.statics.getByCategory = function(category, includeInactive = false) {
  const query = { category };
  if (!includeInactive) {
    query.isActive = true;
    query.$or = [
      { expiresAt: { $gt: new Date() } },
      { expiresAt: null },
    ];
  }
  return this.find(query).sort({ rewardPoints: 1 });
};

// Get all active achievements
AchievementSchema.statics.getActive = function() {
  return this.find({
    isActive: true,
    $or: [
      { expiresAt: { $gt: new Date() } },
      { expiresAt: null },
    ],
  });
};

// Initialize predefined achievements
AchievementSchema.statics.initializeAchievements = async function() {
  const operations = PREDEFINED_ACHIEVEMENTS.map(achievement => ({
    updateOne: {
      filter: { achievementId: achievement.achievementId },
      update: { $setOnInsert: achievement },
      upsert: true,
    },
  }));
  
  if (operations.length > 0) {
    await this.bulkWrite(operations);
  }
  
  return this.countDocuments();
};

// Get achievements for user progress check
AchievementSchema.statics.getCheckableAchievements = async function(userProfile) {
  const allAchievements = await this.getActive();
  
  return allAchievements.filter(achievement => {
    // Check if already completed and not repeatable
    const userAchievement = userProfile.achievements.find(
      a => a.achievementId === achievement.achievementId
    );
    
    if (userAchievement) {
      if (!achievement.isRepeatable) return false;
      if (userAchievement.timesCompleted >= achievement.maxRepeats) return false;
    }
    
    // Check prerequisites
    if (achievement.prerequisites && achievement.prerequisites.length > 0) {
      const hasAllPrereqs = achievement.prerequisites.every(prereq => 
        userProfile.achievements.some(a => a.achievementId === prereq && a.unlockedAt)
      );
      if (!hasAllPrereqs) return false;
    }
    
    return true;
  });
};

const Achievement = mongoose.model('Achievement', AchievementSchema);

module.exports = Achievement;
