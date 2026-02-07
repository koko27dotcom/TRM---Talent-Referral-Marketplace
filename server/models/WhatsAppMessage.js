/**
 * WhatsApp Message Model
 * Stores all WhatsApp message history for audit and tracking
 * Tracks delivery status and message interactions
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Message direction
const MESSAGE_DIRECTION = {
  INBOUND: 'inbound',
  OUTBOUND: 'outbound',
};

// Message type
const MESSAGE_TYPE = {
  TEXT: 'text',
  TEMPLATE: 'template',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  DOCUMENT: 'document',
  LOCATION: 'location',
  CONTACT: 'contact',
  STICKER: 'sticker',
  INTERACTIVE: 'interactive',
  BUTTON_REPLY: 'button_reply',
  LIST_REPLY: 'list_reply',
  REACTION: 'reaction',
  UNKNOWN: 'unknown',
};

// Message status
const MESSAGE_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
  RECEIVED: 'received',
};

// Interactive message types
const INTERACTIVE_TYPE = {
  BUTTON_REPLY: 'button_reply',
  LIST_REPLY: 'list_reply',
};

// Message content schema (varies by type)
const MessageContentSchema = new Schema({
  // Text content
  text: {
    type: String,
    trim: true,
  },
  
  // Media content
  mediaUrl: {
    type: String,
    trim: true,
  },
  mediaId: {
    type: String,
    trim: true,
  },
  mediaType: {
    type: String,
    enum: ['image', 'video', 'audio', 'document', 'sticker'],
  },
  mimeType: {
    type: String,
    trim: true,
  },
  fileName: {
    type: String,
    trim: true,
  },
  fileSize: {
    type: Number,
  },
  caption: {
    type: String,
    trim: true,
  },
  
  // Template content
  templateName: {
    type: String,
    trim: true,
  },
  templateLanguage: {
    type: String,
    default: 'en',
  },
  templateParams: {
    type: Schema.Types.Mixed,
    default: {},
  },
  
  // Location content
  location: {
    latitude: Number,
    longitude: Number,
    name: String,
    address: String,
  },
  
  // Contact content
  contact: {
    name: {
      formatted_name: String,
      first_name: String,
      last_name: String,
    },
    phones: [{
      phone: String,
      type: String,
      wa_id: String,
    }],
    emails: [{
      email: String,
      type: String,
    }],
  },
  
  // Interactive content (button/list replies)
  interactive: {
    type: {
      type: String,
      enum: ['button_reply', 'list_reply'],
    },
    buttonReply: {
      id: String,
      title: String,
    },
    listReply: {
      id: String,
      title: String,
      description: String,
    },
  },
  
  // Reaction
  reaction: {
    messageId: String,
    emoji: String,
  },
}, { _id: false });

// Delivery tracking schema
const DeliveryTrackingSchema = new Schema({
  sentAt: {
    type: Date,
  },
  deliveredAt: {
    type: Date,
  },
  readAt: {
    type: Date,
  },
  failedAt: {
    type: Date,
  },
  errorCode: {
    type: String,
    trim: true,
  },
  errorMessage: {
    type: String,
    trim: true,
  },
}, { _id: false });

// Main WhatsApp Message Schema
const WhatsAppMessageSchema = new Schema({
  // Message identification
  messageId: {
    type: String,
    required: [true, 'Message ID is required'],
    unique: true,
    index: true,
  },
  
  // WhatsApp Business API message ID (from Meta)
  wabaMessageId: {
    type: String,
    trim: true,
    index: true,
    sparse: true,
  },
  
  // Session reference
  sessionId: {
    type: Schema.Types.ObjectId,
    ref: 'WhatsAppSession',
    required: true,
    index: true,
  },
  
  // Phone number
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    index: true,
  },
  
  // Associated user (if known)
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    sparse: true,
  },
  
  // Message direction
  direction: {
    type: String,
    enum: Object.values(MESSAGE_DIRECTION),
    required: true,
    index: true,
  },
  
  // Message type
  type: {
    type: String,
    enum: Object.values(MESSAGE_TYPE),
    required: true,
    index: true,
  },
  
  // Message content
  content: {
    type: MessageContentSchema,
    required: true,
  },
  
  // Message status
  status: {
    type: String,
    enum: Object.values(MESSAGE_STATUS),
    default: MESSAGE_STATUS.PENDING,
    index: true,
  },
  
  // Delivery tracking
  delivery: {
    type: DeliveryTrackingSchema,
    default: () => ({}),
  },
  
  // Related entities
  relatedTo: {
    entityType: {
      type: String,
      enum: ['referral', 'job', 'company', 'payout', 'user', 'template', null],
    },
    entityId: {
      type: Schema.Types.ObjectId,
    },
  },
  
  // Context (for replies)
  context: {
    messageId: {
      type: String,
      trim: true,
    },
    from: {
      type: String,
      trim: true,
    },
  },
  
  // Webhook data (raw data from Meta)
  webhookData: {
    type: Schema.Types.Mixed,
  },
  
  // API response (for outbound messages)
  apiResponse: {
    type: Schema.Types.Mixed,
  },
  
  // Processing metadata
  metadata: {
    processed: {
      type: Boolean,
      default: false,
    },
    processedAt: {
      type: Date,
    },
    processedBy: {
      type: String,
      trim: true,
    },
    actionTaken: {
      type: String,
      trim: true,
    },
    intent: {
      type: String,
      trim: true,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },
  },
  
  // Timestamps
  sentAt: {
    type: Date,
  },
  receivedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ==================== INDEXES ====================

WhatsAppMessageSchema.index({ messageId: 1 }, { unique: true });
WhatsAppMessageSchema.index({ sessionId: 1, createdAt: -1 });
WhatsAppMessageSchema.index({ phoneNumber: 1, createdAt: -1 });
WhatsAppMessageSchema.index({ userId: 1, createdAt: -1 });
WhatsAppMessageSchema.index({ direction: 1, status: 1 });
WhatsAppMessageSchema.index({ type: 1 });
WhatsAppMessageSchema.index({ 'relatedTo.entityType': 1, 'relatedTo.entityId': 1 });
WhatsAppMessageSchema.index({ createdAt: -1 });

// Compound index for conversation history
WhatsAppMessageSchema.index({ sessionId: 1, direction: 1, createdAt: -1 });

// ==================== VIRTUALS ====================

// Virtual for is delivered
WhatsAppMessageSchema.virtual('isDelivered').get(function() {
  return this.status === MESSAGE_STATUS.DELIVERED || this.status === MESSAGE_STATUS.READ;
});

// Virtual for is read
WhatsAppMessageSchema.virtual('isRead').get(function() {
  return this.status === MESSAGE_STATUS.READ;
});

// Virtual for delivery time (in seconds)
WhatsAppMessageSchema.virtual('deliveryTime').get(function() {
  if (!this.delivery.sentAt || !this.delivery.deliveredAt) return null;
  return Math.floor((this.delivery.deliveredAt - this.delivery.sentAt) / 1000);
});

// Virtual for read time (in seconds)
WhatsAppMessageSchema.virtual('readTime').get(function() {
  if (!this.delivery.deliveredAt || !this.delivery.readAt) return null;
  return Math.floor((this.delivery.readAt - this.delivery.deliveredAt) / 1000);
});

// ==================== INSTANCE METHODS ====================

/**
 * Update message status
 * @param {string} newStatus - New status
 * @param {Object} details - Additional details
 */
WhatsAppMessageSchema.methods.updateStatus = async function(newStatus, details = {}) {
  this.status = newStatus;
  
  const now = new Date();
  
  switch (newStatus) {
    case MESSAGE_STATUS.SENT:
      this.delivery.sentAt = now;
      this.sentAt = now;
      break;
    case MESSAGE_STATUS.DELIVERED:
      this.delivery.deliveredAt = now;
      break;
    case MESSAGE_STATUS.READ:
      this.delivery.readAt = now;
      break;
    case MESSAGE_STATUS.FAILED:
      this.delivery.failedAt = now;
      this.delivery.errorCode = details.errorCode;
      this.delivery.errorMessage = details.errorMessage;
      break;
  }
  
  await this.save();
};

/**
 * Mark as processed
 * @param {Object} processingInfo - Processing information
 */
WhatsAppMessageSchema.methods.markProcessed = async function(processingInfo = {}) {
  this.metadata.processed = true;
  this.metadata.processedAt = new Date();
  this.metadata.processedBy = processingInfo.processedBy;
  this.metadata.actionTaken = processingInfo.actionTaken;
  this.metadata.intent = processingInfo.intent;
  this.metadata.confidence = processingInfo.confidence;
  await this.save();
};

/**
 * Link to entity
 * @param {string} entityType - Entity type
 * @param {string} entityId - Entity ID
 */
WhatsAppMessageSchema.methods.linkToEntity = async function(entityType, entityId) {
  this.relatedTo = { entityType, entityId };
  await this.save();
};

/**
 * Get preview text (first 100 characters)
 * @returns {string}
 */
WhatsAppMessageSchema.methods.getPreview = function() {
  if (this.content.text) {
    return this.content.text.substring(0, 100) + (this.content.text.length > 100 ? '...' : '');
  }
  if (this.content.templateName) {
    return `[Template: ${this.content.templateName}]`;
  }
  if (this.content.mediaType) {
    return `[${this.content.mediaType.toUpperCase()}]`;
  }
  if (this.content.interactive) {
    return `[Interactive: ${this.content.interactive.type}]`;
  }
  return '[Unknown content]';
};

// ==================== STATIC METHODS ====================

/**
 * Create outbound message
 * @param {Object} data - Message data
 * @returns {Promise<Document>}
 */
WhatsAppMessageSchema.statics.createOutbound = async function(data) {
  const messageId = `out_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return this.create({
    messageId,
    direction: MESSAGE_DIRECTION.OUTBOUND,
    status: MESSAGE_STATUS.PENDING,
    ...data,
  });
};

/**
 * Create inbound message
 * @param {Object} data - Message data
 * @returns {Promise<Document>}
 */
WhatsAppMessageSchema.statics.createInbound = async function(data) {
  const messageId = data.wabaMessageId || `in_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return this.create({
    messageId,
    direction: MESSAGE_DIRECTION.INBOUND,
    status: MESSAGE_STATUS.RECEIVED,
    receivedAt: new Date(),
    ...data,
  });
};

/**
 * Find messages by session
 * @param {string} sessionId - Session ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
WhatsAppMessageSchema.statics.findBySession = function(sessionId, options = {}) {
  const query = { sessionId };
  
  if (options.direction) {
    query.direction = options.direction;
  }
  
  if (options.type) {
    query.type = options.type;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

/**
 * Find messages by phone number
 * @param {string} phoneNumber - Phone number
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
WhatsAppMessageSchema.statics.findByPhone = function(phoneNumber, options = {}) {
  return this.find({ phoneNumber })
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

/**
 * Find messages by user
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
WhatsAppMessageSchema.statics.findByUser = function(userId, options = {}) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

/**
 * Find unprocessed inbound messages
 * @returns {Promise<Array>}
 */
WhatsAppMessageSchema.statics.findUnprocessed = function() {
  return this.find({
    direction: MESSAGE_DIRECTION.INBOUND,
    'metadata.processed': false,
  }).sort({ createdAt: 1 });
};

/**
 * Get conversation history
 * @param {string} sessionId - Session ID
 * @param {number} limit - Number of messages
 * @returns {Promise<Array>}
 */
WhatsAppMessageSchema.statics.getConversation = async function(sessionId, limit = 50) {
  return this.find({ sessionId })
    .sort({ createdAt: 1 })
    .limit(limit)
    .select('-webhookData -apiResponse');
};

/**
 * Get message statistics
 * @param {Object} filters - Query filters
 * @returns {Promise<Object>}
 */
WhatsAppMessageSchema.statics.getStats = async function(filters = {}) {
  const matchStage = {};
  
  if (filters.startDate || filters.endDate) {
    matchStage.createdAt = {};
    if (filters.startDate) matchStage.createdAt.$gte = new Date(filters.startDate);
    if (filters.endDate) matchStage.createdAt.$lte = new Date(filters.endDate);
  }
  
  if (filters.phoneNumber) {
    matchStage.phoneNumber = filters.phoneNumber;
  }
  
  if (filters.userId) {
    matchStage.userId = new mongoose.Types.ObjectId(filters.userId);
  }
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalMessages: { $sum: 1 },
        inboundCount: {
          $sum: { $cond: [{ $eq: ['$direction', MESSAGE_DIRECTION.INBOUND] }, 1, 0] },
        },
        outboundCount: {
          $sum: { $cond: [{ $eq: ['$direction', MESSAGE_DIRECTION.OUTBOUND] }, 1, 0] },
        },
        deliveredCount: {
          $sum: { $cond: [{ $eq: ['$status', MESSAGE_STATUS.DELIVERED] }, 1, 0] },
        },
        readCount: {
          $sum: { $cond: [{ $eq: ['$status', MESSAGE_STATUS.READ] }, 1, 0] },
        },
        failedCount: {
          $sum: { $cond: [{ $eq: ['$status', MESSAGE_STATUS.FAILED] }, 1, 0] },
        },
        templateCount: {
          $sum: { $cond: [{ $eq: ['$type', MESSAGE_TYPE.TEMPLATE] }, 1, 0] },
        },
      },
    },
  ]);
  
  return stats[0] || {
    totalMessages: 0,
    inboundCount: 0,
    outboundCount: 0,
    deliveredCount: 0,
    readCount: 0,
    failedCount: 0,
    templateCount: 0,
  };
};

/**
 * Get delivery rate
 * @returns {Promise<number>}
 */
WhatsAppMessageSchema.statics.getDeliveryRate = async function() {
  const stats = await this.aggregate([
    { $match: { direction: MESSAGE_DIRECTION.OUTBOUND } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        delivered: {
          $sum: {
            $cond: [{ $in: ['$status', [MESSAGE_STATUS.DELIVERED, MESSAGE_STATUS.READ]] }, 1, 0],
          },
        },
      },
    },
  ]);
  
  if (!stats[0] || stats[0].total === 0) return 0;
  return Math.round((stats[0].delivered / stats[0].total) * 100);
};

// Create and export the model
const WhatsAppMessage = mongoose.model('WhatsAppMessage', WhatsAppMessageSchema);

module.exports = WhatsAppMessage;
module.exports.MESSAGE_DIRECTION = MESSAGE_DIRECTION;
module.exports.MESSAGE_TYPE = MESSAGE_TYPE;
module.exports.MESSAGE_STATUS = MESSAGE_STATUS;
module.exports.INTERACTIVE_TYPE = INTERACTIVE_TYPE;

