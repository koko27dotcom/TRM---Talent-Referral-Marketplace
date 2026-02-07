/**
 * Badge Model
 * Defines all achievement badges that users can earn
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Badge rarity levels
const BADGE_RARITY = {
  COMMON: 'common',
  RARE: 'rare',
  EPIC: 'epic',
  LEGENDARY: 'legendary',
};

// Badge categories
const BADGE_CATEGORIES = {
  REFERRAL: 'referral',
  HIRING: 'hiring',
  NETWORKING: 'networking',
  EARNING: 'earning',
  STREAK: 'streak',
  PROFILE: 'profile',
  COMMUNITY: 'community',
  SPECIAL: 'special',
};

// Requirement types
const REQUIREMENT_TYPES = {
  COUNT: 'count',
  STREAK: 'streak',
  ACHIEVEMENT: 'achievement',
  MILESTONE: 'milestone',
  ONE_TIME: 'one_time',
};

// Predefined badges
const PREDEFINED_BADGES = [
  // Profile Badges
  {
    badgeId: 'first_steps',
    name: 'First Steps',
    description: 'Complete your profile to get started',
    icon: '👣',
    category: BADGE_CATEGORIES.PROFILE,
    requirementType: REQUIREMENT_TYPES.ONE_TIME,
    requirementValue: 1,
    pointsAwarded: 50,
    rarity: BADGE_RARITY.COMMON,
  },
  {
    badgeId: 'profile_perfectionist',
    name: 'Profile Perfectionist',
    description: 'Complete 100% of your profile',
    icon: '✨',
    category: BADGE_CATEGORIES.PROFILE,
    requirementType: REQUIREMENT_TYPES.ACHIEVEMENT,
    requirementValue: 100,
    pointsAwarded: 100,
    rarity: BADGE_RARITY.COMMON,
  },
  {
    badgeId: 'photo_ready',
    name: 'Photo Ready',
    description: 'Add a profile photo',
    icon: '📸',
    category: BADGE_CATEGORIES.PROFILE,
    requirementType: REQUIREMENT_TYPES.ONE_TIME,
    requirementValue: 1,
    pointsAwarded: 25,
    rarity: BADGE_RARITY.COMMON,
  },
  
  // Referral Badges
  {
    badgeId: 'first_referral',
    name: 'First Referral',
    description: 'Submit your first referral',
    icon: '🎯',
    category: BADGE_CATEGORIES.REFERRAL,
    requirementType: REQUIREMENT_TYPES.COUNT,
    requirementValue: 1,
    pointsAwarded: 100,
    rarity: BADGE_RARITY.COMMON,
  },
  {
    badgeId: 'referral_rookie',
    name: 'Referral Rookie',
    description: 'Submit 5 referrals',
    icon: '🌱',
    category: BADGE_CATEGORIES.REFERRAL,
    requirementType: REQUIREMENT_TYPES.COUNT,
    requirementValue: 5,
    pointsAwarded: 150,
    rarity: BADGE_RARITY.COMMON,
  },
  {
    badgeId: 'referral_machine',
    name: 'Referral Machine',
    description: 'Submit 10 referrals',
    icon: '⚙️',
    category: BADGE_CATEGORIES.REFERRAL,
    requirementType: REQUIREMENT_TYPES.COUNT,
    requirementValue: 10,
    pointsAwarded: 300,
    rarity: BADGE_RARITY.RARE,
  },
  {
    badgeId: 'referral_master',
    name: 'Referral Master',
    description: 'Submit 25 referrals',
    icon: '🏆',
    category: BADGE_CATEGORIES.REFERRAL,
    requirementType: REQUIREMENT_TYPES.COUNT,
    requirementValue: 25,
    pointsAwarded: 750,
    rarity: BADGE_RARITY.EPIC,
  },
  {
    badgeId: 'referral_legend',
    name: 'Referral Legend',
    description: 'Submit 50 referrals',
    icon: '👑',
    category: BADGE_CATEGORIES.REFERRAL,
    requirementType: REQUIREMENT_TYPES.COUNT,
    requirementValue: 50,
    pointsAwarded: 1500,
    rarity: BADGE_RARITY.LEGENDARY,
  },
  
  // Hiring Badges
  {
    badgeId: 'hiring_hero',
    name: 'Hiring Hero',
    description: 'Get your first successful hire',
    icon: '🦸',
    category: BADGE_CATEGORIES.HIRING,
    requirementType: REQUIREMENT_TYPES.COUNT,
    requirementValue: 1,
    pointsAwarded: 500,
    rarity: BADGE_RARITY.RARE,
  },
  {
    badgeId: 'talent_scout',
    name: 'Talent Scout',
    description: 'Get 5 successful hires',
    icon: '🔍',
    category: BADGE_CATEGORIES.HIRING,
    requirementType: REQUIREMENT_TYPES.COUNT,
    requirementValue: 5,
    pointsAwarded: 1500,
    rarity: BADGE_RARITY.EPIC,
  },
  {
    badgeId: 'legendary_recruiter',
    name: 'Legendary Recruiter',
    description: 'Get 50 successful hires',
    icon: '🌟',
    category: BADGE_CATEGORIES.HIRING,
    requirementType: REQUIREMENT_TYPES.COUNT,
    requirementValue: 50,
    pointsAwarded: 5000,
    rarity: BADGE_RARITY.LEGENDARY,
  },
  {
    badgeId: 'speed_demon',
    name: 'Speed Demon',
    description: 'Get your first hire within 30 days of joining',
    icon: '⚡',
    category: BADGE_CATEGORIES.HIRING,
    requirementType: REQUIREMENT_TYPES.MILESTONE,
    requirementValue: 30,
    pointsAwarded: 1000,
    rarity: BADGE_RARITY.EPIC,
  },
  
  // Networking Badges
  {
    badgeId: 'networking_pro',
    name: 'Networking Pro',
    description: 'Share 10 jobs',
    icon: '🌐',
    category: BADGE_CATEGORIES.NETWORKING,
    requirementType: REQUIREMENT_TYPES.COUNT,
    requirementValue: 10,
    pointsAwarded: 100,
    rarity: BADGE_RARITY.COMMON,
  },
  {
    badgeId: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Share 50 jobs',
    icon: '🦋',
    category: BADGE_CATEGORIES.NETWORKING,
    requirementType: REQUIREMENT_TYPES.COUNT,
    requirementValue: 50,
    pointsAwarded: 300,
    rarity: BADGE_RARITY.RARE,
  },
  {
    badgeId: 'viral_sensation',
    name: 'Viral Sensation',
    description: 'Share 100 jobs',
    icon: '🚀',
    category: BADGE_CATEGORIES.NETWORKING,
    requirementType: REQUIREMENT_TYPES.COUNT,
    requirementValue: 100,
    pointsAwarded: 600,
    rarity: BADGE_RARITY.EPIC,
  },
  
  // Earning Badges
  {
    badgeId: 'first_earnings',
    name: 'First Earnings',
    description: 'Earn your first payout',
    icon: '💰',
    category: BADGE_CATEGORIES.EARNING,
    requirementType: REQUIREMENT_TYPES.ONE_TIME,
    requirementValue: 1,
    pointsAwarded: 200,
    rarity: BADGE_RARITY.COMMON,
  },
  {
    badgeId: 'top_earner',
    name: 'Top Earner',
    description: 'Earn 100,000 MMK total',
    icon: '💎',
    category: BADGE_CATEGORIES.EARNING,
    requirementType: REQUIREMENT_TYPES.MILESTONE,
    requirementValue: 100000,
    pointsAwarded: 500,
    rarity: BADGE_RARITY.RARE,
  },
  {
    badgeId: 'wealth_builder',
    name: 'Wealth Builder',
    description: 'Earn 500,000 MMK total',
    icon: '🏦',
    category: BADGE_CATEGORIES.EARNING,
    requirementType: REQUIREMENT_TYPES.MILESTONE,
    requirementValue: 500000,
    pointsAwarded: 1500,
    rarity: BADGE_RARITY.EPIC,
  },
  {
    badgeId: 'millionaire_club',
    name: 'Millionaire Club',
    description: 'Earn 1,000,000 MMK total',
    icon: '🤑',
    category: BADGE_CATEGORIES.EARNING,
    requirementType: REQUIREMENT_TYPES.MILESTONE,
    requirementValue: 1000000,
    pointsAwarded: 3000,
    rarity: BADGE_RARITY.LEGENDARY,
  },
  
  // Streak Badges
  {
    badgeId: 'streak_starter',
    name: 'Streak Starter',
    description: '3-day login streak',
    icon: '🔥',
    category: BADGE_CATEGORIES.STREAK,
    requirementType: REQUIREMENT_TYPES.STREAK,
    requirementValue: 3,
    pointsAwarded: 50,
    rarity: BADGE_RARITY.COMMON,
  },
  {
    badgeId: 'streak_master',
    name: 'Streak Master',
    description: '7-day login streak',
    icon: '🔥🔥',
    category: BADGE_CATEGORIES.STREAK,
    requirementType: REQUIREMENT_TYPES.STREAK,
    requirementValue: 7,
    pointsAwarded: 200,
    rarity: BADGE_RARITY.RARE,
  },
  {
    badgeId: 'streak_champion',
    name: 'Streak Champion',
    description: '30-day login streak',
    icon: '🔥🔥🔥',
    category: BADGE_CATEGORIES.STREAK,
    requirementType: REQUIREMENT_TYPES.STREAK,
    requirementValue: 30,
    pointsAwarded: 1000,
    rarity: BADGE_RARITY.EPIC,
  },
  {
    badgeId: 'unstoppable',
    name: 'Unstoppable',
    description: '100-day login streak',
    icon: '♾️',
    category: BADGE_CATEGORIES.STREAK,
    requirementType: REQUIREMENT_TYPES.STREAK,
    requirementValue: 100,
    pointsAwarded: 3000,
    rarity: BADGE_RARITY.LEGENDARY,
  },
  
  // Community Badges
  {
    badgeId: 'community_champion',
    name: 'Community Champion',
    description: 'Refer 5 friends to the platform',
    icon: '🤝',
    category: BADGE_CATEGORIES.COMMUNITY,
    requirementType: REQUIREMENT_TYPES.COUNT,
    requirementValue: 5,
    pointsAwarded: 400,
    rarity: BADGE_RARITY.RARE,
  },
  {
    badgeId: 'influencer',
    name: 'Influencer',
    description: 'Refer 10 friends to the platform',
    icon: '📢',
    category: BADGE_CATEGORIES.COMMUNITY,
    requirementType: REQUIREMENT_TYPES.COUNT,
    requirementValue: 10,
    pointsAwarded: 800,
    rarity: BADGE_RARITY.EPIC,
  },
  
  // Special Badges
  {
    badgeId: 'early_adopter',
    name: 'Early Adopter',
    description: 'Joined during the platform launch period',
    icon: '🚀',
    category: BADGE_CATEGORIES.SPECIAL,
    requirementType: REQUIREMENT_TYPES.ONE_TIME,
    requirementValue: 1,
    pointsAwarded: 500,
    rarity: BADGE_RARITY.LEGENDARY,
  },
  {
    badgeId: 'beta_tester',
    name: 'Beta Tester',
    description: 'Helped test the platform during beta',
    icon: '🧪',
    category: BADGE_CATEGORIES.SPECIAL,
    requirementType: REQUIREMENT_TYPES.ONE_TIME,
    requirementValue: 1,
    pointsAwarded: 300,
    rarity: BADGE_RARITY.EPIC,
  },
  {
    badgeId: 'bug_hunter',
    name: 'Bug Hunter',
    description: 'Reported a critical bug',
    icon: '🐛',
    category: BADGE_CATEGORIES.SPECIAL,
    requirementType: REQUIREMENT_TYPES.ONE_TIME,
    requirementValue: 1,
    pointsAwarded: 200,
    rarity: BADGE_RARITY.RARE,
  },
  {
    badgeId: 'feedback_provider',
    name: 'Feedback Provider',
    description: 'Provided valuable feedback',
    icon: '💬',
    category: BADGE_CATEGORIES.SPECIAL,
    requirementType: REQUIREMENT_TYPES.ONE_TIME,
    requirementValue: 1,
    pointsAwarded: 100,
    rarity: BADGE_RARITY.COMMON,
  },
];

// Badge Schema
const BadgeSchema = new Schema({
  badgeId: {
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
  icon: {
    type: String,
    required: true,
    default: '🏅',
  },
  category: {
    type: String,
    enum: Object.values(BADGE_CATEGORIES),
    required: true,
    index: true,
  },
  requirementType: {
    type: String,
    enum: Object.values(REQUIREMENT_TYPES),
    required: true,
  },
  requirementValue: {
    type: Number,
    required: true,
    default: 1,
  },
  pointsAwarded: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  rarity: {
    type: String,
    enum: Object.values(BADGE_RARITY),
    required: true,
    default: BADGE_RARITY.COMMON,
    index: true,
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
  expiresAt: {
    type: Date,
    default: null,
  },
  maxEarners: {
    type: Number,
    default: null,
  },
  currentEarners: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Indexes
BadgeSchema.index({ category: 1, rarity: 1 });
BadgeSchema.index({ pointsAwarded: -1 });

// Instance Methods

// Check if badge is available
BadgeSchema.methods.isAvailable = function() {
  if (this.expiresAt && new Date() > this.expiresAt) {
    return false;
  }
  if (this.maxEarners && this.currentEarners >= this.maxEarners) {
    return false;
  }
  return true;
};

// Get display description (hidden for secret badges)
BadgeSchema.methods.getDisplayDescription = function(userHasBadge = false) {
  if (this.isSecret && !userHasBadge) {
    return this.hiddenDescription;
  }
  return this.description;
};

// Increment earner count
BadgeSchema.methods.incrementEarners = function() {
  this.currentEarners += 1;
};

// Static Methods

// Get badges by category
BadgeSchema.statics.getByCategory = function(category) {
  return this.find({ category }).sort({ pointsAwarded: 1 });
};

// Get badges by rarity
BadgeSchema.statics.getByRarity = function(rarity) {
  return this.find({ rarity }).sort({ pointsAwarded: 1 });
};

// Get all available badges
BadgeSchema.statics.getAvailable = function() {
  return this.find({
    $or: [
      { expiresAt: { $gt: new Date() } },
      { expiresAt: null },
    ],
    $or: [
      { maxEarners: null },
      { $expr: { $lt: ['$currentEarners', '$maxEarners'] } },
    ],
  });
};

// Initialize predefined badges
BadgeSchema.statics.initializeBadges = async function() {
  const operations = PREDEFINED_BADGES.map(badge => ({
    updateOne: {
      filter: { badgeId: badge.badgeId },
      update: { $setOnInsert: badge },
      upsert: true,
    },
  }));
  
  if (operations.length > 0) {
    await this.bulkWrite(operations);
  }
  
  return this.countDocuments();
};

// Get badge statistics
BadgeSchema.statics.getStatistics = async function() {
  return this.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalPoints: { $sum: '$pointsAwarded' },
        badges: { $push: '$badgeId' },
      },
    },
  ]);
};

const Badge = mongoose.model('Badge', BadgeSchema);

module.exports = Badge;
