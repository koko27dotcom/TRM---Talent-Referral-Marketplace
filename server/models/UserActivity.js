/**
 * UserActivity Model
 * Tracks all user activities for gamification and analytics
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Action types
const ACTION_TYPES = {
  REFERRAL_SUBMITTED: 'referral_submitted',
  REFERRAL_HIRED: 'referral_hired',
  REFERRAL_REJECTED: 'referral_rejected',
  SHARE_JOB: 'share_job',
  SHARE_PLATFORM: 'share_platform',
  PROFILE_COMPLETE: 'profile_complete',
  PROFILE_UPDATE: 'profile_update',
  LOGIN: 'login',
  LOGOUT: 'logout',
  INVITE_SENT: 'invite_sent',
  INVITE_ACCEPTED: 'invite_accepted',
  PAYOUT_REQUESTED: 'payout_requested',
  PAYOUT_RECEIVED: 'payout_received',
  BADGE_EARNED: 'badge_earned',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  CHALLENGE_COMPLETED: 'challenge_completed',
  CHALLENGE_JOINED: 'challenge_joined',
  LEVEL_UP: 'level_up',
  POINTS_EARNED: 'points_earned',
  POINTS_SPENT: 'points_spent',
  LOOTBOX_OPENED: 'lootbox_opened',
  BOOST_ACTIVATED: 'boost_activated',
  STREAK_UPDATED: 'streak_updated',
  JOB_VIEWED: 'job_viewed',
  JOB_APPLIED: 'job_applied',
  NETWORK_EXPANDED: 'network_expanded',
};

// Action categories
const ACTION_CATEGORIES = {
  REFERRAL: 'referral',
  HIRING: 'hiring',
  NETWORKING: 'networking',
  PROFILE: 'profile',
  ENGAGEMENT: 'engagement',
  REWARD: 'reward',
  FINANCIAL: 'financial',
};

// Platform types
const PLATFORMS = {
  WEB: 'web',
  MOBILE: 'mobile',
  API: 'api',
  WIDGET: 'widget',
};

// Activity Schema
const UserActivitySchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // Action details
  actionType: {
    type: String,
    enum: Object.values(ACTION_TYPES),
    required: true,
    index: true,
  },
  actionCategory: {
    type: String,
    enum: Object.values(ACTION_CATEGORIES),
    required: true,
    index: true,
  },
  
  // Action metadata
  actionDetails: {
    type: Schema.Types.Mixed,
    default: {},
  },
  
  // Related entities
  relatedEntities: {
    referralId: {
      type: Schema.Types.ObjectId,
      ref: 'Referral',
      default: null,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      default: null,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
    },
    challengeId: {
      type: Schema.Types.ObjectId,
      ref: 'Challenge',
      default: null,
    },
    achievementId: {
      type: String,
      default: null,
    },
    badgeId: {
      type: String,
      default: null,
    },
  },
  
  // Gamification rewards
  pointsEarned: {
    type: Number,
    default: 0,
  },
  badgeEarned: {
    type: String,
    default: null,
  },
  levelUp: {
    type: Boolean,
    default: false,
  },
  newLevel: {
    type: Number,
    default: null,
  },
  
  // Context
  platform: {
    type: String,
    enum: Object.values(PLATFORMS),
    default: PLATFORMS.WEB,
  },
  ipAddress: {
    type: String,
    default: null,
  },
  userAgent: {
    type: String,
    default: null,
  },
  
  // Location (if available)
  location: {
    country: {
      type: String,
      default: null,
    },
    city: {
      type: String,
      default: null,
    },
    coordinates: {
      lat: Number,
      lng: Number,
    },
  },
  
  // Session info
  sessionId: {
    type: String,
    default: null,
  },
  
  // Metadata for extensibility
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
  
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  
}, {
  timestamps: true,
});

// Compound indexes for common queries
UserActivitySchema.index({ userId: 1, timestamp: -1 });
UserActivitySchema.index({ userId: 1, actionType: 1, timestamp: -1 });
UserActivitySchema.index({ actionType: 1, timestamp: -1 });
UserActivitySchema.index({ actionCategory: 1, timestamp: -1 });
UserActivitySchema.index({ 'relatedEntities.referralId': 1 });
UserActivitySchema.index({ 'relatedEntities.jobId': 1 });
UserActivitySchema.index({ timestamp: -1 });

// TTL index to auto-delete old activities (keep for 2 years)
UserActivitySchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 });

// Instance Methods

// Get activity summary
UserActivitySchema.methods.getSummary = function() {
  return {
    id: this._id,
    actionType: this.actionType,
    actionCategory: this.actionCategory,
    pointsEarned: this.pointsEarned,
    badgeEarned: this.badgeEarned,
    levelUp: this.levelUp,
    timestamp: this.timestamp,
  };
};

// Static Methods

// Log activity
UserActivitySchema.statics.log = async function(data) {
  const activity = new this(data);
  await activity.save();
  return activity;
};

// Get user activity feed
UserActivitySchema.statics.getUserFeed = async function(userId, options = {}) {
  const { limit = 50, skip = 0, actionTypes = null } = options;
  
  const query = { userId };
  if (actionTypes && actionTypes.length > 0) {
    query.actionType = { $in: actionTypes };
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .populate('relatedEntities.referralId', 'status candidateName')
    .populate('relatedEntities.jobId', 'title company')
    .lean();
};

// Get user activity stats
UserActivitySchema.statics.getUserStats = async function(userId, period = null) {
  const matchStage = { userId: new mongoose.Types.ObjectId(userId) };
  
  if (period) {
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'day':
        startDate = new Date(now.setDate(now.getDate() - 1));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      default:
        startDate = new Date('2000-01-01');
    }
    
    matchStage.timestamp = { $gte: startDate };
  }
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$actionType',
        count: { $sum: 1 },
        totalPoints: { $sum: '$pointsEarned' },
        lastActivity: { $max: '$timestamp' },
      },
    },
    { $sort: { count: -1 } },
  ]);
  
  return stats;
};

// Get activity by category
UserActivitySchema.statics.getByCategory = async function(userId, category, options = {}) {
  const { limit = 50, skip = 0 } = options;
  
  return this.find({ userId, actionCategory: category })
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

// Get recent activities for multiple users (for feed)
UserActivitySchema.statics.getRecentActivities = async function(options = {}) {
  const { limit = 50, userIds = null, actionTypes = null } = options;
  
  const query = {};
  if (userIds) query.userId = { $in: userIds };
  if (actionTypes) query.actionType = { $in: actionTypes };
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'displayName name avatar')
    .lean();
};

// Get activity count by date range
UserActivitySchema.statics.getActivityCountByDate = async function(userId, startDate, endDate, actionType = null) {
  const query = {
    userId,
    timestamp: { $gte: startDate, $lte: endDate },
  };
  
  if (actionType) query.actionType = actionType;
  
  return this.countDocuments(query);
};

// Get daily activity summary
UserActivitySchema.statics.getDailySummary = async function(userId, days = 30) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const summary = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        timestamp: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' },
        },
        activityCount: { $sum: 1 },
        pointsEarned: { $sum: '$pointsEarned' },
        actions: { $push: '$actionType' },
      },
    },
    { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
  ]);
  
  return summary.map(day => ({
    date: new Date(day._id.year, day._id.month - 1, day._id.day),
    activityCount: day.activityCount,
    pointsEarned: day.pointsEarned,
    actions: day.actions,
  }));
};

// Get streak data
UserActivitySchema.statics.getStreakData = async function(userId, actionType, days = 30) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const activities = await this.find({
    userId,
    actionType,
    timestamp: { $gte: startDate, $lte: endDate },
  })
    .sort({ timestamp: 1 })
    .select('timestamp')
    .lean();
  
  // Group by date
  const dateMap = new Map();
  activities.forEach(activity => {
    const date = activity.timestamp.toISOString().split('T')[0];
    dateMap.set(date, true);
  });
  
  // Calculate streak
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  
  const dates = Array.from(dateMap.keys()).sort();
  
  for (let i = 0; i < dates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prevDate = new Date(dates[i - 1]);
      const currDate = new Date(dates[i]);
      const diffDays = (currDate - prevDate) / (1000 * 60 * 60 * 24);
      
      if (diffDays === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
  }
  
  longestStreak = Math.max(longestStreak, tempStreak);
  
  // Check if streak is current (last activity was today or yesterday)
  if (dates.length > 0) {
    const lastDate = new Date(dates[dates.length - 1]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (lastDate >= yesterday) {
      currentStreak = tempStreak;
    }
  }
  
  return {
    currentStreak,
    longestStreak,
    activeDates: dates,
  };
};

// Get activity heatmap data
UserActivitySchema.statics.getHeatmapData = async function(userId, days = 365) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const activities = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        timestamp: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$timestamp' },
        },
        count: { $sum: 1 },
        points: { $sum: '$pointsEarned' },
      },
    },
  ]);
  
  return activities.map(day => ({
    date: day._id,
    count: day.count,
    points: day.points,
    level: day.count >= 5 ? 4 : day.count >= 3 ? 3 : day.count >= 2 ? 2 : 1,
  }));
};

// Get total points earned in period
UserActivitySchema.statics.getTotalPointsInPeriod = async function(userId, startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        timestamp: { $gte: startDate, $lte: endDate },
        pointsEarned: { $gt: 0 },
      },
    },
    {
      $group: {
        _id: null,
        totalPoints: { $sum: '$pointsEarned' },
        activities: { $sum: 1 },
      },
    },
  ]);
  
  return result[0] || { totalPoints: 0, activities: 0 };
};

// Clean up old activities (manual cleanup if needed)
UserActivitySchema.statics.cleanupOldActivities = async function(olderThanDays = 730) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  
  const result = await this.deleteMany({
    timestamp: { $lt: cutoffDate },
  });
  
  return result.deletedCount;
};

// Get activity analytics
UserActivitySchema.statics.getAnalytics = async function(startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$actionType',
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        totalPoints: { $sum: '$pointsEarned' },
      },
    },
    {
      $project: {
        actionType: '$_id',
        count: 1,
        uniqueUserCount: { $size: '$uniqueUsers' },
        totalPoints: 1,
      },
    },
    { $sort: { count: -1 } },
  ]);
  
  return result;
};

const UserActivity = mongoose.model('UserActivity', UserActivitySchema);

module.exports = UserActivity;
