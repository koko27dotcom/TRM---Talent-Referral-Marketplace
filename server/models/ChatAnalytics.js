/**
 * ChatAnalytics Model
 * Represents chat metrics and analytics data
 * Tracks conversation metrics, user satisfaction, and bot performance
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Intent usage schema
const IntentUsageSchema = new Schema({
  intentId: {
    type: String,
    required: true,
  },
  intentName: String,
  count: {
    type: Number,
    default: 1,
  },
  avgConfidence: Number,
  lastUsedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

// Entity extraction schema
const EntityExtractionSchema = new Schema({
  entityId: String,
  entityName: String,
  value: Schema.Types.Mixed,
  confidence: Number,
  extractedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

// Response time schema
const ResponseTimeSchema = new Schema({
  messageId: String,
  userMessageTime: Date,
  botResponseTime: Date,
  duration: Number, // in milliseconds
}, { _id: false });

// User feedback schema
const UserFeedbackSchema = new Schema({
  rating: {
    type: Number,
    min: 1,
    max: 5,
  },
  comment: String,
  category: {
    type: String,
    enum: ['helpful', 'not_helpful', 'confusing', 'technical_issue', 'other'],
  },
  providedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

// Resolution details schema
const ResolutionDetailsSchema = new Schema({
  status: {
    type: String,
    enum: ['resolved', 'escalated', 'abandoned', 'timeout', 'in_progress'],
    required: true,
  },
  resolvedAt: Date,
  resolutionTime: Number, // in milliseconds
  resolutionMethod: {
    type: String,
    enum: ['bot', 'human', 'self_service', 'unresolved'],
  },
  followUpRequired: {
    type: Boolean,
    default: false,
  },
}, { _id: false });

// Main ChatAnalytics schema
const ChatAnalyticsSchema = new Schema({
  analyticsId: {
    type: String,
    required: [true, 'Analytics ID is required'],
    unique: true,
    index: true,
  },
  sessionId: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    sparse: true,
  },
  userType: {
    type: String,
    enum: ['candidate', 'referrer', 'company', 'admin', 'guest'],
    required: true,
    index: true,
  },
  botType: {
    type: String,
    enum: ['recruiter', 'referrer', 'candidate', 'admin', 'general'],
    required: true,
    index: true,
  },
  
  // Message metrics
  messageCount: {
    user: {
      type: Number,
      default: 0,
    },
    bot: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      default: 0,
    },
  },
  
  // Response time metrics
  responseTime: {
    avg: Number,
    min: Number,
    max: Number,
    times: [ResponseTimeSchema],
  },
  
  // Intent usage
  intentsUsed: {
    type: [IntentUsageSchema],
    default: [],
  },
  
  // Entity extraction
  entitiesExtracted: {
    type: [EntityExtractionSchema],
    default: [],
  },
  
  // Resolution status
  resolution: {
    type: ResolutionDetailsSchema,
  },
  
  // User feedback
  feedback: {
    type: UserFeedbackSchema,
  },
  
  // Sentiment analysis
  sentiment: {
    overall: {
      type: String,
      enum: ['positive', 'negative', 'neutral', 'mixed'],
    },
    avgScore: Number,
    positiveCount: {
      type: Number,
      default: 0,
    },
    negativeCount: {
      type: Number,
      default: 0,
    },
    neutralCount: {
      type: Number,
      default: 0,
    },
  },
  
  // Fallback metrics
  fallbackMetrics: {
    fallbackCount: {
      type: Number,
      default: 0,
    },
    fallbackRate: Number,
    fallbackIntents: [String],
  },
  
  // Escalation metrics
  escalationMetrics: {
    escalated: {
      type: Boolean,
      default: false,
    },
    escalationReason: String,
    escalationTime: Number,
    humanAgentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  
  // Session metrics
  sessionMetrics: {
    startedAt: Date,
    endedAt: Date,
    duration: Number, // in milliseconds
    messageDensity: Number, // messages per minute
    peakActivityTime: Date,
  },
  
  // Source/channel
  source: {
    type: String,
    enum: ['web', 'mobile', 'whatsapp', 'api', 'widget'],
    default: 'web',
  },
  
  // Device info
  deviceInfo: {
    type: String,
    browser: String,
    os: String,
  },
  
  // Geographic info
  location: {
    country: String,
    city: String,
    timezone: String,
  },
  
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
ChatAnalyticsSchema.index({ userId: 1, createdAt: -1 });
ChatAnalyticsSchema.index({ botType: 1, createdAt: -1 });
ChatAnalyticsSchema.index({ userType: 1, createdAt: -1 });
ChatAnalyticsSchema.index({ source: 1, createdAt: -1 });
ChatAnalyticsSchema.index({ 'resolution.status': 1, createdAt: -1 });
ChatAnalyticsSchema.index({ 'feedback.rating': 1, createdAt: -1 });

// Virtual for satisfaction score
ChatAnalyticsSchema.virtual('satisfactionScore').get(function() {
  return this.feedback?.rating || 0;
});

// Virtual for isResolved
ChatAnalyticsSchema.virtual('isResolved').get(function() {
  return this.resolution?.status === 'resolved';
});

// Pre-save middleware
ChatAnalyticsSchema.pre('save', function(next) {
  if (!this.analyticsId) {
    this.analyticsId = `analytics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Calculate total messages
  this.messageCount.total = this.messageCount.user + this.messageCount.bot;
  
  // Calculate session duration
  if (this.sessionMetrics.startedAt && this.sessionMetrics.endedAt) {
    this.sessionMetrics.duration = this.sessionMetrics.endedAt - this.sessionMetrics.startedAt;
  }
  
  // Calculate message density
  if (this.sessionMetrics.duration > 0) {
    this.sessionMetrics.messageDensity = (this.messageCount.total / (this.sessionMetrics.duration / 60000));
  }
  
  // Calculate fallback rate
  if (this.messageCount.total > 0) {
    this.fallbackMetrics.fallbackRate = this.fallbackMetrics.fallbackCount / this.messageCount.total;
  }
  
  // Calculate average response time
  if (this.responseTime.times.length > 0) {
    const sum = this.responseTime.times.reduce((acc, rt) => acc + rt.duration, 0);
    this.responseTime.avg = sum / this.responseTime.times.length;
    this.responseTime.min = Math.min(...this.responseTime.times.map(rt => rt.duration));
    this.responseTime.max = Math.max(...this.responseTime.times.map(rt => rt.duration));
  }
  
  next();
});

// Method to record intent usage
ChatAnalyticsSchema.methods.recordIntent = function(intentId, intentName, confidence) {
  const existing = this.intentsUsed.find(i => i.intentId === intentId);
  if (existing) {
    existing.count += 1;
    existing.avgConfidence = ((existing.avgConfidence * (existing.count - 1)) + confidence) / existing.count;
    existing.lastUsedAt = new Date();
  } else {
    this.intentsUsed.push({
      intentId,
      intentName,
      count: 1,
      avgConfidence: confidence,
      lastUsedAt: new Date(),
    });
  }
  return this.save();
};

// Method to record entity extraction
ChatAnalyticsSchema.methods.recordEntity = function(entityId, entityName, value, confidence) {
  this.entitiesExtracted.push({
    entityId,
    entityName,
    value,
    confidence,
    extractedAt: new Date(),
  });
  return this.save();
};

// Method to record response time
ChatAnalyticsSchema.methods.recordResponseTime = function(messageId, userMessageTime, botResponseTime) {
  const duration = botResponseTime - userMessageTime;
  this.responseTime.times.push({
    messageId,
    userMessageTime,
    botResponseTime,
    duration,
  });
  return this.save();
};

// Method to record sentiment
ChatAnalyticsSchema.methods.recordSentiment = function(label, score) {
  this.sentiment.positiveCount += label === 'positive' ? 1 : 0;
  this.sentiment.negativeCount += label === 'negative' ? 1 : 0;
  this.sentiment.neutralCount += label === 'neutral' ? 1 : 0;
  
  const total = this.sentiment.positiveCount + this.sentiment.negativeCount + this.sentiment.neutralCount;
  
  // Calculate weighted average
  const weightedSum = (this.sentiment.positiveCount * 1) + 
                      (this.sentiment.negativeCount * -1) + 
                      (this.sentiment.neutralCount * 0);
  this.sentiment.avgScore = weightedSum / total;
  
  // Determine overall sentiment
  if (this.sentiment.positiveCount > this.sentiment.negativeCount && 
      this.sentiment.positiveCount > this.sentiment.neutralCount) {
    this.sentiment.overall = 'positive';
  } else if (this.sentiment.negativeCount > this.sentiment.positiveCount && 
             this.sentiment.negativeCount > this.sentiment.neutralCount) {
    this.sentiment.overall = 'negative';
  } else if (this.sentiment.positiveCount === this.sentiment.negativeCount) {
    this.sentiment.overall = 'mixed';
  } else {
    this.sentiment.overall = 'neutral';
  }
  
  return this.save();
};

// Method to record fallback
ChatAnalyticsSchema.methods.recordFallback = function(intentName) {
  this.fallbackMetrics.fallbackCount += 1;
  if (intentName && !this.fallbackMetrics.fallbackIntents.includes(intentName)) {
    this.fallbackMetrics.fallbackIntents.push(intentName);
  }
  return this.save();
};

// Method to add feedback
ChatAnalyticsSchema.methods.addFeedback = function(rating, comment, category) {
  this.feedback = {
    rating,
    comment,
    category,
    providedAt: new Date(),
  };
  return this.save();
};

// Method to mark resolution
ChatAnalyticsSchema.methods.markResolution = function(status, method, followUpRequired = false) {
  const now = new Date();
  this.resolution = {
    status,
    resolvedAt: now,
    resolutionTime: this.sessionMetrics.startedAt ? now - this.sessionMetrics.startedAt : 0,
    resolutionMethod: method,
    followUpRequired,
  };
  this.sessionMetrics.endedAt = now;
  return this.save();
};

// Static method to get dashboard stats
ChatAnalyticsSchema.statics.getDashboardStats = async function(startDate, endDate) {
  const matchStage = {
    createdAt: { $gte: startDate, $lte: endDate },
  };
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalConversations: { $sum: 1 },
        totalMessages: { $sum: '$messageCount.total' },
        avgMessagesPerConversation: { $avg: '$messageCount.total' },
        avgResponseTime: { $avg: '$responseTime.avg' },
        avgSatisfaction: { $avg: '$feedback.rating' },
        resolvedCount: {
          $sum: { $cond: [{ $eq: ['$resolution.status', 'resolved'] }, 1, 0] },
        },
        escalatedCount: {
          $sum: { $cond: [{ $eq: ['$escalationMetrics.escalated', true] }, 1, 0] },
        },
        avgFallbackRate: { $avg: '$fallbackMetrics.fallbackRate' },
        avgSessionDuration: { $avg: '$sessionMetrics.duration' },
      },
    },
  ]);
  
  return stats[0] || {};
};

// Static method to get bot performance
ChatAnalyticsSchema.statics.getBotPerformance = async function(startDate, endDate) {
  return this.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: '$botType',
        conversations: { $sum: 1 },
        messages: { $sum: '$messageCount.total' },
        avgResponseTime: { $avg: '$responseTime.avg' },
        avgSatisfaction: { $avg: '$feedback.rating' },
        resolutionRate: {
          $avg: { $cond: [{ $eq: ['$resolution.status', 'resolved'] }, 1, 0] },
        },
        escalationRate: {
          $avg: { $cond: [{ $eq: ['$escalationMetrics.escalated', true] }, 1, 0] },
        },
        fallbackRate: { $avg: '$fallbackMetrics.fallbackRate' },
      },
    },
    { $sort: { conversations: -1 } },
  ]);
};

// Static method to get intent analytics
ChatAnalyticsSchema.statics.getIntentAnalytics = async function(startDate, endDate) {
  return this.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
    { $unwind: '$intentsUsed' },
    {
      $group: {
        _id: '$intentsUsed.intentId',
        intentName: { $first: '$intentsUsed.intentName' },
        totalUsage: { $sum: '$intentsUsed.count' },
        avgConfidence: { $avg: '$intentsUsed.avgConfidence' },
        uniqueSessions: { $addToSet: '$sessionId' },
      },
    },
    {
      $project: {
        intentId: '$_id',
        intentName: 1,
        totalUsage: 1,
        avgConfidence: 1,
        uniqueSessions: { $size: '$uniqueSessions' },
      },
    },
    { $sort: { totalUsage: -1 } },
  ]);
};

// Static method to get hourly distribution
ChatAnalyticsSchema.statics.getHourlyDistribution = async function(startDate, endDate) {
  return this.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: { $hour: '$createdAt' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

// Static method to get daily trends
ChatAnalyticsSchema.statics.getDailyTrends = async function(startDate, endDate) {
  return this.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        conversations: { $sum: 1 },
        messages: { $sum: '$messageCount.total' },
        avgSatisfaction: { $avg: '$feedback.rating' },
        resolved: {
          $sum: { $cond: [{ $eq: ['$resolution.status', 'resolved'] }, 1, 0] },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

// Static method to get user type distribution
ChatAnalyticsSchema.statics.getUserTypeDistribution = async function(startDate, endDate) {
  return this.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: '$userType',
        conversations: { $sum: 1 },
        avgSatisfaction: { $avg: '$feedback.rating' },
      },
    },
    { $sort: { conversations: -1 } },
  ]);
};

// Static method to get source distribution
ChatAnalyticsSchema.statics.getSourceDistribution = async function(startDate, endDate) {
  return this.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: '$source',
        conversations: { $sum: 1 },
        avgSatisfaction: { $avg: '$feedback.rating' },
      },
    },
    { $sort: { conversations: -1 } },
  ]);
};

const ChatAnalytics = mongoose.model('ChatAnalytics', ChatAnalyticsSchema);

module.exports = ChatAnalytics;
