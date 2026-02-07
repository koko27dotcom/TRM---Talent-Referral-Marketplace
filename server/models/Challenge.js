/**
 * Challenge Model
 * Defines dynamic challenges for users to complete
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Challenge types
const CHALLENGE_TYPES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  SPECIAL: 'special',
  SEASONAL: 'seasonal',
  MILESTONE: 'milestone',
};

// Target actions
const TARGET_ACTIONS = {
  SUBMIT_REFERRAL: 'submit_referral',
  GET_HIRE: 'get_hire',
  SHARE_JOB: 'share_job',
  COMPLETE_PROFILE: 'complete_profile',
  LOGIN: 'login',
  INVITE_FRIEND: 'invite_friend',
  EARN_PAYOUT: 'earn_payout',
  VISIT_PAGE: 'visit_page',
  STREAK_MAINTAIN: 'streak_maintain',
  NETWORK_GROW: 'network_grow',
};

// Challenge difficulty
const CHALLENGE_DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
  EXPERT: 'expert',
};

// Predefined challenges
const PREDEFINED_CHALLENGES = [
  // Daily Challenges
  {
    challengeId: 'daily_login',
    title: 'Daily Login',
    description: 'Login to the platform today',
    type: CHALLENGE_TYPES.DAILY,
    targetAction: TARGET_ACTIONS.LOGIN,
    targetCount: 1,
    rewardPoints: 10,
    difficulty: CHALLENGE_DIFFICULTY.EASY,
  },
  {
    challengeId: 'daily_share',
    title: 'Daily Sharer',
    description: 'Share 2 jobs today',
    type: CHALLENGE_TYPES.DAILY,
    targetAction: TARGET_ACTIONS.SHARE_JOB,
    targetCount: 2,
    rewardPoints: 20,
    difficulty: CHALLENGE_DIFFICULTY.EASY,
  },
  {
    challengeId: 'daily_referral',
    title: 'Daily Referrer',
    description: 'Submit 1 referral today',
    type: CHALLENGE_TYPES.DAILY,
    targetAction: TARGET_ACTIONS.SUBMIT_REFERRAL,
    targetCount: 1,
    rewardPoints: 50,
    difficulty: CHALLENGE_DIFFICULTY.MEDIUM,
  },
  
  // Weekly Challenges
  {
    challengeId: 'weekly_referrals',
    title: 'Weekly Referral Sprint',
    description: 'Submit 5 referrals this week',
    type: CHALLENGE_TYPES.WEEKLY,
    targetAction: TARGET_ACTIONS.SUBMIT_REFERRAL,
    targetCount: 5,
    rewardPoints: 200,
    rewardBadgeId: 'weekly_warrior',
    difficulty: CHALLENGE_DIFFICULTY.MEDIUM,
  },
  {
    challengeId: 'weekly_shares',
    title: 'Social Butterfly',
    description: 'Share 10 jobs this week',
    type: CHALLENGE_TYPES.WEEKLY,
    targetAction: TARGET_ACTIONS.SHARE_JOB,
    targetCount: 10,
    rewardPoints: 100,
    difficulty: CHALLENGE_DIFFICULTY.EASY,
  },
  {
    challengeId: 'weekly_streak',
    title: 'Streak Keeper',
    description: 'Maintain a 7-day login streak',
    type: CHALLENGE_TYPES.WEEKLY,
    targetAction: TARGET_ACTIONS.STREAK_MAINTAIN,
    targetCount: 7,
    rewardPoints: 150,
    difficulty: CHALLENGE_DIFFICULTY.MEDIUM,
  },
  {
    challengeId: 'weekly_hire_goal',
    title: 'Hiring Hero',
    description: 'Get 1 successful hire this week',
    type: CHALLENGE_TYPES.WEEKLY,
    targetAction: TARGET_ACTIONS.GET_HIRE,
    targetCount: 1,
    rewardPoints: 500,
    difficulty: CHALLENGE_DIFFICULTY.HARD,
  },
  
  // Special Challenges
  {
    challengeId: 'profile_completion',
    title: 'Complete Your Profile',
    description: 'Fill out 100% of your profile',
    type: CHALLENGE_TYPES.SPECIAL,
    targetAction: TARGET_ACTIONS.COMPLETE_PROFILE,
    targetCount: 100,
    rewardPoints: 100,
    rewardBadgeId: 'profile_perfectionist',
    difficulty: CHALLENGE_DIFFICULTY.EASY,
  },
  {
    challengeId: 'network_builder',
    title: 'Network Builder',
    description: 'Invite 3 friends to join',
    type: CHALLENGE_TYPES.SPECIAL,
    targetAction: TARGET_ACTIONS.INVITE_FRIEND,
    targetCount: 3,
    rewardPoints: 300,
    difficulty: CHALLENGE_DIFFICULTY.MEDIUM,
  },
  {
    challengeId: 'first_payout',
    title: 'First Earnings',
    description: 'Request your first payout',
    type: CHALLENGE_TYPES.SPECIAL,
    targetAction: TARGET_ACTIONS.EARN_PAYOUT,
    targetCount: 1,
    rewardPoints: 200,
    rewardBadgeId: 'first_earnings',
    difficulty: CHALLENGE_DIFFICULTY.EASY,
  },
  {
    challengeId: 'exploration',
    title: 'Platform Explorer',
    description: 'Visit all main sections of the platform',
    type: CHALLENGE_TYPES.SPECIAL,
    targetAction: TARGET_ACTIONS.VISIT_PAGE,
    targetCount: 5,
    rewardPoints: 75,
    difficulty: CHALLENGE_DIFFICULTY.EASY,
  },
  
  // Milestone Challenges
  {
    challengeId: 'milestone_10_referrals',
    title: '10 Referrals Milestone',
    description: 'Submit 10 referrals total',
    type: CHALLENGE_TYPES.MILESTONE,
    targetAction: TARGET_ACTIONS.SUBMIT_REFERRAL,
    targetCount: 10,
    rewardPoints: 500,
    rewardBadgeId: 'referral_machine',
    difficulty: CHALLENGE_DIFFICULTY.MEDIUM,
  },
  {
    challengeId: 'milestone_50k_earnings',
    title: '50K Earner',
    description: 'Earn 50,000 MMK total',
    type: CHALLENGE_TYPES.MILESTONE,
    targetAction: TARGET_ACTIONS.EARN_PAYOUT,
    targetCount: 50000,
    rewardPoints: 300,
    difficulty: CHALLENGE_DIFFICULTY.MEDIUM,
  },
  {
    challengeId: 'milestone_network_10',
    title: 'Network of 10',
    description: 'Build a network of 10 referred users',
    type: CHALLENGE_TYPES.MILESTONE,
    targetAction: TARGET_ACTIONS.NETWORK_GROW,
    targetCount: 10,
    rewardPoints: 400,
    difficulty: CHALLENGE_DIFFICULTY.MEDIUM,
  },
];

// Participant schema
const ParticipantSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  currentProgress: {
    type: Number,
    default: 0,
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

// Completion schema
const CompletionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  completedAt: {
    type: Date,
    default: Date.now,
  },
  completionTime: {
    type: Number, // in hours
    default: 0,
  },
}, { _id: true });

// Challenge Schema
const ChallengeSchema = new Schema({
  challengeId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: Object.values(CHALLENGE_TYPES),
    required: true,
    index: true,
  },
  targetAction: {
    type: String,
    enum: Object.values(TARGET_ACTIONS),
    required: true,
  },
  targetCount: {
    type: Number,
    required: true,
    min: 1,
  },
  difficulty: {
    type: String,
    enum: Object.values(CHALLENGE_DIFFICULTY),
    default: CHALLENGE_DIFFICULTY.EASY,
  },
  
  // Rewards
  rewardPoints: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  rewardBadgeId: {
    type: String,
    default: null,
  },
  rewardLootBox: {
    type: Boolean,
    default: false,
  },
  rewardBoost: {
    type: {
      type: String,
      enum: ['points', 'xp', 'referral'],
      default: null,
    },
    multiplier: {
      type: Number,
      default: 1.0,
    },
    duration: {
      type: Number, // in hours
      default: 24,
    },
  },
  
  // Time constraints
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  
  // Participants and completions
  participants: [ParticipantSchema],
  completions: [CompletionSchema],
  
  // Limits
  maxParticipants: {
    type: Number,
    default: null,
  },
  maxCompletions: {
    type: Number,
    default: null,
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  
  // Visual
  icon: {
    type: String,
    default: '🎯',
  },
  color: {
    type: String,
    default: '#3B82F6',
  },
  bannerImage: {
    type: String,
    default: null,
  },
  
  // Metadata
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  tags: [{
    type: String,
  }],
  
}, {
  timestamps: true,
});

// Indexes
ChallengeSchema.index({ type: 1, isActive: 1 });
ChallengeSchema.index({ startDate: 1, endDate: 1 });
ChallengeSchema.index({ isFeatured: 1, isActive: 1 });
ChallengeSchema.index({ 'participants.userId': 1 });
ChallengeSchema.index({ 'completions.userId': 1 });

// Virtual for participant count
ChallengeSchema.virtual('participantCount').get(function() {
  return this.participants.length;
});

// Virtual for completion count
ChallengeSchema.virtual('completionCount').get(function() {
  return this.completions.length;
});

// Virtual for time remaining
ChallengeSchema.virtual('timeRemaining').get(function() {
  const now = new Date();
  if (now > this.endDate) return 0;
  return this.endDate - now;
});

// Virtual for is expired
ChallengeSchema.virtual('isExpired').get(function() {
  return new Date() > this.endDate;
});

// Instance Methods

// Check if user is participating
ChallengeSchema.methods.isUserParticipating = function(userId) {
  return this.participants.some(p => p.userId.toString() === userId.toString());
};

// Check if user has completed
ChallengeSchema.methods.hasUserCompleted = function(userId) {
  return this.completions.some(c => c.userId.toString() === userId.toString());
};

// Get user's progress
ChallengeSchema.methods.getUserProgress = function(userId) {
  const participant = this.participants.find(
    p => p.userId.toString() === userId.toString()
  );
  
  if (!participant) return { progress: 0, percentage: 0 };
  
  return {
    progress: participant.currentProgress,
    target: this.targetCount,
    percentage: Math.min(100, (participant.currentProgress / this.targetCount) * 100),
    completed: participant.completedAt !== null,
    rewardClaimed: participant.rewardClaimed,
  };
};

// Join challenge
ChallengeSchema.methods.join = function(userId) {
  if (this.isUserParticipating(userId)) {
    return { success: false, message: 'Already participating' };
  }
  
  if (this.maxParticipants && this.participants.length >= this.maxParticipants) {
    return { success: false, message: 'Challenge is full' };
  }
  
  if (this.isExpired) {
    return { success: false, message: 'Challenge has expired' };
  }
  
  this.participants.push({
    userId,
    joinedAt: new Date(),
    currentProgress: 0,
  });
  
  return { success: true };
};

// Update progress
ChallengeSchema.methods.updateProgress = function(userId, increment = 1) {
  const participant = this.participants.find(
    p => p.userId.toString() === userId.toString()
  );
  
  if (!participant) {
    return { success: false, message: 'Not participating in this challenge' };
  }
  
  if (participant.completedAt) {
    return { success: false, message: 'Challenge already completed' };
  }
  
  participant.currentProgress = Math.min(
    this.targetCount,
    participant.currentProgress + increment
  );
  
  // Check for completion
  if (participant.currentProgress >= this.targetCount) {
    participant.completedAt = new Date();
    
    const joinedAt = participant.joinedAt;
    const completedAt = participant.completedAt;
    const completionTime = (completedAt - joinedAt) / (1000 * 60 * 60); // in hours
    
    this.completions.push({
      userId,
      completedAt,
      completionTime,
    });
    
    return {
      success: true,
      completed: true,
      completionTime,
    };
  }
  
  return {
    success: true,
    completed: false,
    progress: participant.currentProgress,
    percentage: (participant.currentProgress / this.targetCount) * 100,
  };
};

// Claim reward
ChallengeSchema.methods.claimReward = function(userId) {
  const participant = this.participants.find(
    p => p.userId.toString() === userId.toString()
  );
  
  if (!participant) {
    return { success: false, message: 'Not participating' };
  }
  
  if (!participant.completedAt) {
    return { success: false, message: 'Challenge not completed' };
  }
  
  if (participant.rewardClaimed) {
    return { success: false, message: 'Reward already claimed' };
  }
  
  participant.rewardClaimed = true;
  participant.rewardClaimedAt = new Date();
  
  return {
    success: true,
    rewards: {
      points: this.rewardPoints,
      badgeId: this.rewardBadgeId,
      lootBox: this.rewardLootBox,
      boost: this.rewardBoost,
    },
  };
};

// Static Methods

// Get active challenges
ChallengeSchema.statics.getActive = function(options = {}) {
  const now = new Date();
  const query = {
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  };
  
  if (options.type) query.type = options.type;
  if (options.difficulty) query.difficulty = options.difficulty;
  if (options.featured) query.isFeatured = true;
  
  return this.find(query).sort({ isFeatured: -1, endDate: 1 });
};

// Get challenges for user
ChallengeSchema.statics.getForUser = async function(userId, options = {}) {
  const challenges = await this.getActive(options);
  
  return challenges.map(challenge => {
    const progress = challenge.getUserProgress(userId);
    return {
      ...challenge.toObject(),
      userProgress: progress,
      isParticipating: challenge.isUserParticipating(userId),
      hasCompleted: challenge.hasUserCompleted(userId),
    };
  });
};

// Get user's active challenges
ChallengeSchema.statics.getUserActiveChallenges = async function(userId) {
  const now = new Date();
  
  return this.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
    'participants.userId': userId,
    'participants.completedAt': null,
  });
};

// Get user's completed challenges
ChallengeSchema.statics.getUserCompletedChallenges = async function(userId) {
  return this.find({
    'completions.userId': userId,
  }).sort({ 'completions.completedAt': -1 });
};

// Create daily challenges
ChallengeSchema.statics.createDailyChallenges = async function() {
  const dailyChallenges = PREDEFINED_CHALLENGES.filter(c => c.type === CHALLENGE_TYPES.DAILY);
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  
  const created = [];
  
  for (const template of dailyChallenges) {
    const exists = await this.findOne({
      challengeId: template.challengeId,
      startDate: { $lte: now },
      endDate: { $gte: now },
    });
    
    if (!exists) {
      const challenge = await this.create({
        ...template,
        startDate: now,
        endDate: endOfDay,
        isActive: true,
      });
      created.push(challenge);
    }
  }
  
  return created;
};

// Create weekly challenges
ChallengeSchema.statics.createWeeklyChallenges = async function() {
  const weeklyChallenges = PREDEFINED_CHALLENGES.filter(c => c.type === CHALLENGE_TYPES.WEEKLY);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  const created = [];
  
  for (const template of weeklyChallenges) {
    const exists = await this.findOne({
      challengeId: template.challengeId,
      startDate: startOfWeek,
      endDate: endOfWeek,
    });
    
    if (!exists) {
      const challenge = await this.create({
        ...template,
        startDate: startOfWeek,
        endDate: endOfWeek,
        isActive: true,
      });
      created.push(challenge);
    }
  }
  
  return created;
};

// Initialize special challenges
ChallengeSchema.statics.initializeSpecialChallenges = async function() {
  const specialChallenges = PREDEFINED_CHALLENGES.filter(
    c => c.type === CHALLENGE_TYPES.SPECIAL || c.type === CHALLENGE_TYPES.MILESTONE
  );
  
  const created = [];
  
  for (const template of specialChallenges) {
    const exists = await this.findOne({ challengeId: template.challengeId });
    
    if (!exists) {
      const challenge = await this.create({
        ...template,
        startDate: new Date('2000-01-01'),
        endDate: new Date('2099-12-31'),
        isActive: true,
      });
      created.push(challenge);
    }
  }
  
  return created;
};

// Get challenge statistics
ChallengeSchema.statics.getStatistics = async function() {
  return this.aggregate([
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalParticipants: { $sum: { $size: '$participants' } },
        totalCompletions: { $sum: { $size: '$completions' } },
        avgCompletionRate: {
          $avg: {
            $cond: [
              { $gt: [{ $size: '$participants' }, 0] },
              { $divide: [{ $size: '$completions' }, { $size: '$participants' }] },
              0,
            ],
          },
        },
      },
    },
  ]);
};

// Clean up expired challenges
ChallengeSchema.statics.deactivateExpired = async function() {
  const now = new Date();
  
  const result = await this.updateMany(
    {
      endDate: { $lt: now },
      isActive: true,
    },
    { $set: { isActive: false } }
  );
  
  return result.modifiedCount;
};

const Challenge = mongoose.model('Challenge', ChallengeSchema);

module.exports = Challenge;
