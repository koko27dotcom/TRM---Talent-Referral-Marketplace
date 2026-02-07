/**
 * ChatMessage Model
 * Represents individual messages in chat conversations
 * Tracks message content, intent, entities, and metadata
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Entity extraction schema
const ExtractedEntitySchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  value: {
    type: Schema.Types.Mixed,
    required: true,
  },
  type: {
    type: String,
    enum: ['system', 'custom', 'location', 'date', 'number', 'person', 'organization', 'skill', 'job_title', 'salary'],
    required: true,
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 1,
  },
  startIndex: Number,
  endIndex: Number,
}, { _id: false });

// Action schema for bot actions
const ActionSchema = new Schema({
  type: {
    type: String,
    required: true,
    enum: ['navigate', 'open_modal', 'api_call', 'show_data', 'suggest', 'schedule', 'escalate', 'close', 'none'],
  },
  payload: {
    type: Schema.Types.Mixed,
    default: {},
  },
  label: {
    type: String,
    trim: true,
  },
  executed: {
    type: Boolean,
    default: false,
  },
  executedAt: Date,
}, { _id: false });

// Quick reply schema
const QuickReplySchema = new Schema({
  label: {
    type: String,
    required: true,
    trim: true,
  },
  value: {
    type: String,
    required: true,
    trim: true,
  },
  action: {
    type: String,
    enum: ['send_message', 'open_url', 'trigger_intent', 'show_form', 'none'],
    default: 'send_message',
  },
  icon: String,
}, { _id: false });

// Attachment schema
const AttachmentSchema = new Schema({
  type: {
    type: String,
    required: true,
    enum: ['image', 'document', 'video', 'audio', 'file', 'location', 'contact'],
  },
  url: {
    type: String,
    required: true,
    trim: true,
  },
  name: {
    type: String,
    trim: true,
  },
  size: Number,
  mimeType: String,
  thumbnailUrl: String,
  duration: Number,
  width: Number,
  height: Number,
}, { _id: false });

// Sentiment analysis schema
const SentimentSchema = new Schema({
  label: {
    type: String,
    enum: ['positive', 'negative', 'neutral', 'mixed'],
    required: true,
  },
  score: {
    type: Number,
    min: -1,
    max: 1,
    required: true,
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 1,
  },
}, { _id: false });

// Main ChatMessage schema
const ChatMessageSchema = new Schema({
  messageId: {
    type: String,
    required: [true, 'Message ID is required'],
    unique: true,
    index: true,
    trim: true,
  },
  sessionId: {
    type: String,
    required: [true, 'Session ID is required'],
    index: true,
    trim: true,
  },
  senderType: {
    type: String,
    enum: ['user', 'bot', 'system', 'agent'],
    required: [true, 'Sender type is required'],
    index: true,
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    sparse: true,
  },
  botType: {
    type: String,
    enum: ['recruiter', 'referrer', 'candidate', 'admin', 'general', 'system'],
    index: true,
  },
  message: {
    type: {
      text: {
        type: String,
        required: true,
        trim: true,
      },
      language: {
        type: String,
        enum: ['en', 'my', 'unknown'],
        default: 'unknown',
      },
      translatedText: String,
      originalText: String,
    },
    required: true,
  },
  intent: {
    name: {
      type: String,
      trim: true,
      index: true,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },
    category: {
      type: String,
      enum: ['referral', 'job', 'payment', 'support', 'general', 'greeting', 'goodbye', 'help', 'fallback'],
    },
    alternativeIntents: [{
      name: String,
      confidence: Number,
    }],
  },
  entities: {
    type: [ExtractedEntitySchema],
    default: [],
  },
  sentiment: {
    type: SentimentSchema,
  },
  actions: {
    type: [ActionSchema],
    default: [],
  },
  quickReplies: {
    type: [QuickReplySchema],
    default: [],
  },
  attachments: {
    type: [AttachmentSchema],
    default: [],
  },
  metadata: {
    processingTime: Number,
    modelUsed: String,
    source: {
      type: String,
      enum: ['web', 'mobile', 'whatsapp', 'api', 'widget'],
      default: 'web',
    },
    isFallback: {
      type: Boolean,
      default: false,
    },
    isEscalation: {
      type: Boolean,
      default: false,
    },
    customData: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  replyTo: {
    messageId: String,
    text: String,
  },
  edited: {
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: Date,
    originalText: String,
  },
  deleted: {
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  readAt: Date,
  deliveredAt: Date,
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Compound indexes for common queries
ChatMessageSchema.index({ sessionId: 1, timestamp: 1 });
ChatMessageSchema.index({ senderId: 1, timestamp: -1 });
ChatMessageSchema.index({ 'intent.name': 1, timestamp: -1 });
ChatMessageSchema.index({ senderType: 1, timestamp: -1 });
ChatMessageSchema.index({ timestamp: -1 });

// Text index for searching messages
ChatMessageSchema.index({ 'message.text': 'text' });

// Virtual for formatted timestamp
ChatMessageSchema.virtual('formattedTime').get(function() {
  return this.timestamp.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
});

// Virtual for message age
ChatMessageSchema.virtual('age').get(function() {
  return Date.now() - this.timestamp.getTime();
});

// Pre-save middleware to ensure messageId
ChatMessageSchema.pre('save', function(next) {
  if (!this.messageId) {
    this.messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

// Method to mark as read
ChatMessageSchema.methods.markAsRead = function() {
  if (!this.readAt) {
    this.readAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to mark as delivered
ChatMessageSchema.methods.markAsDelivered = function() {
  if (!this.deliveredAt) {
    this.deliveredAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to edit message
ChatMessageSchema.methods.edit = function(newText) {
  this.edited.originalText = this.message.text;
  this.message.text = newText;
  this.edited.isEdited = true;
  this.edited.editedAt = new Date();
  return this.save();
};

// Method to soft delete
ChatMessageSchema.methods.softDelete = function(userId) {
  this.deleted.isDeleted = true;
  this.deleted.deletedAt = new Date();
  this.deleted.deletedBy = userId;
  return this.save();
};

// Method to execute action
ChatMessageSchema.methods.executeAction = function(actionIndex) {
  if (this.actions[actionIndex] && !this.actions[actionIndex].executed) {
    this.actions[actionIndex].executed = true;
    this.actions[actionIndex].executedAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Static method to get messages by session
ChatMessageSchema.statics.getBySession = function(sessionId, options = {}) {
  const { limit = 50, before, after } = options;
  const query = { sessionId };
  
  if (before) query.timestamp = { ...query.timestamp, $lt: new Date(before) };
  if (after) query.timestamp = { ...query.timestamp, $gt: new Date(after) };
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .sort({ timestamp: 1 });
};

// Static method to get unread count
ChatMessageSchema.statics.getUnreadCount = function(sessionId, senderType) {
  return this.countDocuments({
    sessionId,
    senderType: { $ne: senderType },
    readAt: { $exists: false },
  });
};

// Static method to search messages
ChatMessageSchema.statics.search = function(query, options = {}) {
  const { sessionId, senderType, startDate, endDate, limit = 20 } = options;
  const searchQuery = { $text: { $search: query } };
  
  if (sessionId) searchQuery.sessionId = sessionId;
  if (senderType) searchQuery.senderType = senderType;
  if (startDate || endDate) {
    searchQuery.timestamp = {};
    if (startDate) searchQuery.timestamp.$gte = new Date(startDate);
    if (endDate) searchQuery.timestamp.$lte = new Date(endDate);
  }
  
  return this.find(searchQuery, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit);
};

// Static method to get conversation analytics
ChatMessageSchema.statics.getAnalytics = async function(startDate, endDate, botType) {
  const matchStage = {
    timestamp: { $gte: startDate, $lte: endDate },
  };
  if (botType) matchStage.botType = botType;

  const results = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalMessages: { $sum: 1 },
        userMessages: {
          $sum: { $cond: [{ $eq: ['$senderType', 'user'] }, 1, 0] },
        },
        botMessages: {
          $sum: { $cond: [{ $eq: ['$senderType', 'bot'] }, 1, 0] },
        },
        avgConfidence: { $avg: '$intent.confidence' },
        fallbackCount: {
          $sum: { $cond: ['$metadata.isFallback', 1, 0] },
        },
        escalationCount: {
          $sum: { $cond: ['$metadata.isEscalation', 1, 0] },
        },
        avgProcessingTime: { $avg: '$metadata.processingTime' },
      },
    },
  ]);

  return results[0] || {};
};

// Static method to get intent distribution
ChatMessageSchema.statics.getIntentDistribution = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate },
        'intent.name': { $exists: true },
      },
    },
    {
      $group: {
        _id: '$intent.name',
        count: { $sum: 1 },
        avgConfidence: { $avg: '$intent.confidence' },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

const ChatMessage = mongoose.model('ChatMessage', ChatMessageSchema);

module.exports = ChatMessage;
