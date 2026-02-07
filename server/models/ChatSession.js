/**
 * ChatSession Model
 * Represents chat conversations between users and AI bots
 * Tracks session lifecycle, context, and metadata
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Context item schema for conversation context
const ContextItemSchema = new Schema({
  key: {
    type: String,
    required: true,
    trim: true,
  },
  value: {
    type: Schema.Types.Mixed,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

// Metadata schema for session metadata
const SessionMetadataSchema = new Schema({
  source: {
    type: String,
    enum: ['web', 'mobile', 'whatsapp', 'api', 'widget'],
    default: 'web',
  },
  deviceInfo: {
    type: String,
    trim: true,
  },
  browserInfo: {
    type: String,
    trim: true,
  },
  ipAddress: {
    type: String,
    trim: true,
  },
  userAgent: {
    type: String,
    trim: true,
  },
  referrer: {
    type: String,
    trim: true,
  },
  pageUrl: {
    type: String,
    trim: true,
  },
  customData: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, { _id: false });

// Main ChatSession schema
const ChatSessionSchema = new Schema({
  sessionId: {
    type: String,
    required: [true, 'Session ID is required'],
    unique: true,
    index: true,
    trim: true,
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
    required: [true, 'User type is required'],
    index: true,
  },
  botType: {
    type: String,
    enum: ['recruiter', 'referrer', 'candidate', 'admin', 'general'],
    required: [true, 'Bot type is required'],
    index: true,
  },
  status: {
    type: String,
    enum: ['active', 'closed', 'escalated', 'idle'],
    default: 'active',
    index: true,
  },
  context: {
    type: [ContextItemSchema],
    default: [],
  },
  metadata: {
    type: SessionMetadataSchema,
    default: () => ({}),
  },
  language: {
    type: String,
    enum: ['en', 'my', 'auto'],
    default: 'auto',
  },
  escalationInfo: {
    escalatedAt: Date,
    escalatedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    escalationReason: String,
    resolvedAt: Date,
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  satisfactionRating: {
    type: Number,
    min: 1,
    max: 5,
  },
  feedback: {
    type: String,
    trim: true,
  },
  tags: [{
    type: String,
    trim: true,
  }],
  startedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  endedAt: {
    type: Date,
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  messageCount: {
    type: Number,
    default: 0,
  },
  totalResponseTime: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for common queries
ChatSessionSchema.index({ userId: 1, status: 1 });
ChatSessionSchema.index({ botType: 1, status: 1 });
ChatSessionSchema.index({ startedAt: -1 });
ChatSessionSchema.index({ lastMessageAt: -1 });
ChatSessionSchema.index({ 'escalationInfo.escalatedAt': 1 });

// Virtual for average response time
ChatSessionSchema.virtual('averageResponseTime').get(function() {
  if (this.messageCount === 0) return 0;
  return this.totalResponseTime / this.messageCount;
});

// Virtual for session duration
ChatSessionSchema.virtual('duration').get(function() {
  const endTime = this.endedAt || new Date();
  return endTime - this.startedAt;
});

// Virtual to populate messages
ChatSessionSchema.virtual('messages', {
  ref: 'ChatMessage',
  localField: 'sessionId',
  foreignField: 'sessionId',
  options: { sort: { timestamp: 1 } },
});

// Pre-save middleware to update lastMessageAt
ChatSessionSchema.pre('save', function(next) {
  if (this.isModified('messageCount') && this.messageCount > 0) {
    this.lastMessageAt = new Date();
  }
  next();
});

// Method to add context
ChatSessionSchema.methods.addContext = function(key, value) {
  const existingIndex = this.context.findIndex(item => item.key === key);
  if (existingIndex >= 0) {
    this.context[existingIndex].value = value;
    this.context[existingIndex].timestamp = new Date();
  } else {
    this.context.push({ key, value, timestamp: new Date() });
  }
  return this.save();
};

// Method to get context value
ChatSessionSchema.methods.getContext = function(key) {
  const item = this.context.find(item => item.key === key);
  return item ? item.value : null;
};

// Method to close session
ChatSessionSchema.methods.close = function(rating, feedback) {
  this.status = 'closed';
  this.endedAt = new Date();
  if (rating) this.satisfactionRating = rating;
  if (feedback) this.feedback = feedback;
  return this.save();
};

// Method to escalate
ChatSessionSchema.methods.escalate = function(reason, escalatedTo) {
  this.status = 'escalated';
  this.escalationInfo = {
    escalatedAt: new Date(),
    escalationReason: reason,
    escalatedTo: escalatedTo,
  };
  return this.save();
};

// Static method to find active sessions by user
ChatSessionSchema.statics.findActiveByUser = function(userId) {
  return this.find({ userId, status: 'active' }).sort({ lastMessageAt: -1 });
};

// Static method to find sessions needing closure (idle for too long)
ChatSessionSchema.statics.findIdleSessions = function(idleThresholdMinutes = 30) {
  const threshold = new Date(Date.now() - idleThresholdMinutes * 60 * 1000);
  return this.find({
    status: 'active',
    lastMessageAt: { $lt: threshold },
  });
};

// Static method to get analytics
ChatSessionSchema.statics.getAnalytics = async function(startDate, endDate, botType) {
  const matchStage = {
    startedAt: { $gte: startDate, $lte: endDate },
  };
  if (botType) matchStage.botType = botType;

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        activeSessions: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
        },
        closedSessions: {
          $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] },
        },
        escalatedSessions: {
          $sum: { $cond: [{ $eq: ['$status', 'escalated'] }, 1, 0] },
        },
        avgSatisfaction: { $avg: '$satisfactionRating' },
        avgDuration: { $avg: { $subtract: ['$endedAt', '$startedAt'] } },
        totalMessages: { $sum: '$messageCount' },
      },
    },
  ]);
};

const ChatSession = mongoose.model('ChatSession', ChatSessionSchema);

module.exports = ChatSession;
