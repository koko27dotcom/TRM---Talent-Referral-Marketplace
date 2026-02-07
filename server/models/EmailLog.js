/**
 * Email Log Model
 * Tracks all email delivery events, opens, clicks, bounces, and unsubscribes
 * Provides comprehensive analytics for email campaigns
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Email Event Schema
const EmailEventSchema = new Schema({
  event: {
    type: String,
    enum: [
      'queued',
      'sent',
      'delivered',
      'opened',
      'clicked',
      'bounced',
      'dropped',
      'deferred',
      'processed',
      'unsubscribed',
      'complained',
      'failed',
      'retry',
    ],
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  ip: {
    type: String,
    default: null,
  },
  userAgent: {
    type: String,
    default: null,
  },
  // For click events
  url: {
    type: String,
    default: null,
  },
  linkId: {
    type: String,
    default: null,
  },
  // For bounce events
  bounceType: {
    type: String,
    enum: ['bounce', 'blocked', 'expired', 'deferred', null],
    default: null,
  },
  bounceReason: {
    type: String,
    default: null,
  },
  // For open events
  openCount: {
    type: Number,
    default: 1,
  },
  // Additional metadata
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {},
  },
}, { _id: true });

// Email Link Schema (for click tracking)
const EmailLinkSchema = new Schema({
  url: {
    type: String,
    required: true,
  },
  linkId: {
    type: String,
    required: true,
  },
  clicks: {
    type: Number,
    default: 0,
  },
  uniqueClicks: {
    type: Number,
    default: 0,
  },
  lastClickedAt: {
    type: Date,
    default: null,
  },
}, { _id: true });

// Main Email Log Schema
const EmailLogSchema = new Schema({
  // Unique message ID
  messageId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  
  // External provider message ID (SendGrid, etc.)
  providerMessageId: {
    type: String,
    default: null,
    index: true,
  },
  
  // Recipient Information
  recipient: {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      default: '',
    },
  },
  
  // Sender Information
  sender: {
    email: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      default: '',
    },
  },
  
  // Email Content Summary
  subject: {
    type: String,
    required: true,
  },
  preview: {
    type: String,
    default: '',
  },
  
  // Campaign/Sequence References
  campaignId: {
    type: Schema.Types.ObjectId,
    ref: 'EmailCampaign',
    default: null,
    index: true,
  },
  sequenceId: {
    type: Schema.Types.ObjectId,
    ref: 'EmailSequence',
    default: null,
    index: true,
  },
  sequenceStep: {
    type: Number,
    default: null,
  },
  templateId: {
    type: Schema.Types.ObjectId,
    ref: 'EmailTemplate',
    default: null,
  },
  
  // Email Type
  type: {
    type: String,
    enum: ['transactional', 'marketing', 'campaign', 'sequence', 'automation'],
    default: 'transactional',
  },
  
  // Category/Tag
  category: {
    type: String,
    default: 'general',
  },
  tags: [{
    type: String,
  }],
  
  // Current Status
  status: {
    type: String,
    enum: ['queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'unsubscribed', 'complained'],
    default: 'queued',
  },
  
  // Event History
  events: [EmailEventSchema],
  
  // Tracking Data
  tracking: {
    // Open tracking
    opened: {
      type: Boolean,
      default: false,
    },
    openedAt: {
      type: Date,
      default: null,
    },
    openCount: {
      type: Number,
      default: 0,
    },
    firstOpenAt: {
      type: Date,
      default: null,
    },
    lastOpenAt: {
      type: Date,
      default: null,
    },
    
    // Click tracking
    clicked: {
      type: Boolean,
      default: false,
    },
    clickedAt: {
      type: Date,
      default: null,
    },
    clickCount: {
      type: Number,
      default: 0,
    },
    firstClickAt: {
      type: Date,
      default: null,
    },
    lastClickAt: {
      type: Date,
      default: null,
    },
    links: [EmailLinkSchema],
    
    // Device/Location info from opens
    devices: [{
      type: String,
    }],
    locations: [{
      country: String,
      city: String,
      region: String,
    }],
  },
  
  // Delivery Information
  delivery: {
    sentAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    smtpId: {
      type: String,
      default: null,
    },
    response: {
      type: String,
      default: null,
    },
  },
  
  // Bounce Information
  bounce: {
    bounced: {
      type: Boolean,
      default: false,
    },
    bouncedAt: {
      type: Date,
      default: null,
    },
    type: {
      type: String,
      enum: ['soft', 'hard', null],
      default: null,
    },
    reason: {
      type: String,
      default: null,
    },
    code: {
      type: String,
      default: null,
    },
  },
  
  // Unsubscribe Information
  unsubscribe: {
    unsubscribed: {
      type: Boolean,
      default: false,
    },
    unsubscribedAt: {
      type: Date,
      default: null,
    },
    source: {
      type: String,
      enum: ['email_link', 'preference_center', 'api', null],
      default: null,
    },
    reason: {
      type: String,
      default: null,
    },
  },
  
  // Complaint/Spam Report
  complaint: {
    complained: {
      type: Boolean,
      default: false,
    },
    complainedAt: {
      type: Date,
      default: null,
    },
    type: {
      type: String,
      enum: ['spam', 'abuse', 'fraud', null],
      default: null,
    },
    feedbackId: {
      type: String,
      default: null,
    },
  },
  
  // A/B Test Information
  abTest: {
    variantId: {
      type: String,
      default: null,
    },
    variantName: {
      type: String,
      default: null,
    },
  },
  
  // Personalization Data Used
  personalization: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {},
  },
  
  // Error Information
  error: {
    message: {
      type: String,
      default: null,
    },
    code: {
      type: String,
      default: null,
    },
    stack: {
      type: String,
      default: null,
    },
  },
  
  // Organization
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    default: null,
  },
  
  // Metadata
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

// Indexes for common queries
EmailLogSchema.index({ 'recipient.userId': 1, createdAt: -1 });
EmailLogSchema.index({ 'recipient.email': 1, createdAt: -1 });
EmailLogSchema.index({ campaignId: 1, status: 1 });
EmailLogSchema.index({ sequenceId: 1, status: 1 });
EmailLogSchema.index({ templateId: 1 });
EmailLogSchema.index({ status: 1, createdAt: -1 });
EmailLogSchema.index({ type: 1, createdAt: -1 });
EmailLogSchema.index({ category: 1 });
EmailLogSchema.index({ 'tracking.opened': 1 });
EmailLogSchema.index({ 'tracking.clicked': 1 });
EmailLogSchema.index({ 'bounce.bounced': 1 });
EmailLogSchema.index({ 'unsubscribe.unsubscribed': 1 });
EmailLogSchema.index({ createdAt: -1 });

// Compound indexes for analytics
EmailLogSchema.index({ campaignId: 1, 'tracking.opened': 1, 'tracking.clicked': 1 });
EmailLogSchema.index({ organizationId: 1, createdAt: -1 });

// Method to record an event
EmailLogSchema.methods.recordEvent = function(eventType, data = {}) {
  const event = {
    event: eventType,
    timestamp: data.timestamp || new Date(),
    ip: data.ip || null,
    userAgent: data.userAgent || null,
    url: data.url || null,
    linkId: data.linkId || null,
    bounceType: data.bounceType || null,
    bounceReason: data.bounceReason || null,
    metadata: data.metadata || {},
  };
  
  this.events.push(event);
  
  // Update status based on event
  const statusMap = {
    queued: 'queued',
    sent: 'sent',
    delivered: 'delivered',
    opened: 'opened',
    clicked: 'clicked',
    bounced: 'bounced',
    dropped: 'failed',
    failed: 'failed',
    unsubscribed: 'unsubscribed',
    complained: 'complained',
  };
  
  if (statusMap[eventType]) {
    this.status = statusMap[eventType];
  }
  
  // Update tracking data
  if (eventType === 'opened') {
    this.tracking.opened = true;
    this.tracking.openCount += 1;
    if (!this.tracking.firstOpenAt) {
      this.tracking.firstOpenAt = event.timestamp;
    }
    this.tracking.lastOpenAt = event.timestamp;
    
    if (data.userAgent) {
      const device = this.parseDevice(data.userAgent);
      if (!this.tracking.devices.includes(device)) {
        this.tracking.devices.push(device);
      }
    }
    
    if (data.location) {
      const locationExists = this.tracking.locations.some(
        l => l.country === data.location.country && l.city === data.location.city
      );
      if (!locationExists) {
        this.tracking.locations.push(data.location);
      }
    }
  }
  
  if (eventType === 'clicked') {
    this.tracking.clicked = true;
    this.tracking.clickCount += 1;
    if (!this.tracking.firstClickAt) {
      this.tracking.firstClickAt = event.timestamp;
    }
    this.tracking.lastClickAt = event.timestamp;
    
    // Update link stats
    if (data.url && data.linkId) {
      let link = this.tracking.links.find(l => l.linkId === data.linkId);
      if (!link) {
        link = { url: data.url, linkId: data.linkId, clicks: 0, uniqueClicks: 0 };
        this.tracking.links.push(link);
      }
      link.clicks += 1;
      link.lastClickedAt = event.timestamp;
    }
  }
  
  if (eventType === 'delivered') {
    this.delivery.deliveredAt = event.timestamp;
  }
  
  if (eventType === 'sent') {
    this.delivery.sentAt = event.timestamp;
    this.delivery.attempts += 1;
  }
  
  if (eventType === 'bounced') {
    this.bounce.bounced = true;
    this.bounce.bouncedAt = event.timestamp;
    this.bounce.type = data.bounceType === 'bounce' ? 'hard' : 'soft';
    this.bounce.reason = data.bounceReason;
    this.bounce.code = data.code;
  }
  
  if (eventType === 'unsubscribed') {
    this.unsubscribe.unsubscribed = true;
    this.unsubscribe.unsubscribedAt = event.timestamp;
    this.unsubscribe.source = data.source || 'email_link';
    this.unsubscribe.reason = data.reason;
  }
  
  if (eventType === 'complained') {
    this.complaint.complained = true;
    this.complaint.complainedAt = event.timestamp;
    this.complaint.type = data.type;
    this.complaint.feedbackId = data.feedbackId;
  }
  
  if (eventType === 'failed') {
    this.error.message = data.message;
    this.error.code = data.code;
  }
  
  return this.save();
};

// Helper method to parse device from user agent
EmailLogSchema.methods.parseDevice = function(userAgent) {
  if (!userAgent) return 'unknown';
  
  if (/mobile|android|iphone|ipad|ipod/i.test(userAgent)) {
    if (/ipad/i.test(userAgent)) return 'tablet';
    return 'mobile';
  }
  if (/tablet|ipad/i.test(userAgent)) return 'tablet';
  return 'desktop';
};

// Method to get engagement score
EmailLogSchema.methods.getEngagementScore = function() {
  let score = 0;
  
  if (this.tracking.opened) score += 20;
  if (this.tracking.clicked) score += 50;
  if (this.tracking.openCount > 1) score += 10;
  if (this.tracking.clickCount > 1) score += 20;
  
  return Math.min(score, 100);
};

// Static method to get campaign stats
EmailLogSchema.statics.getCampaignStats = async function(campaignId) {
  const stats = await this.aggregate([
    { $match: { campaignId: new mongoose.Types.ObjectId(campaignId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        sent: { $sum: { $cond: [{ $in: ['$status', ['sent', 'delivered', 'opened', 'clicked']] }, 1, 0] } },
        delivered: { $sum: { $cond: [{ $in: ['$status', ['delivered', 'opened', 'clicked']] }, 1, 0] } },
        opened: { $sum: { $cond: ['$tracking.opened', 1, 0] } },
        uniqueOpens: { $sum: { $cond: ['$tracking.opened', 1, 0] } },
        clicked: { $sum: { $cond: ['$tracking.clicked', 1, 0] } },
        uniqueClicks: { $sum: { $cond: ['$tracking.clicked', 1, 0] } },
        bounced: { $sum: { $cond: [{ $eq: ['$status', 'bounced'] }, 1, 0] } },
        unsubscribed: { $sum: { $cond: ['$unsubscribe.unsubscribed', 1, 0] } },
        complained: { $sum: { $cond: ['$complaint.complained', 1, 0] } },
      },
    },
  ]);
  
  if (!stats.length) {
    return {
      total: 0,
      sent: 0,
      delivered: 0,
      opened: 0,
      uniqueOpens: 0,
      clicked: 0,
      uniqueClicks: 0,
      bounced: 0,
      unsubscribed: 0,
      complained: 0,
      openRate: 0,
      clickRate: 0,
      bounceRate: 0,
    };
  }
  
  const result = stats[0];
  delete result._id;
  
  // Calculate rates
  const delivered = result.delivered || 1;
  result.openRate = ((result.uniqueOpens / delivered) * 100).toFixed(2);
  result.clickRate = ((result.uniqueClicks / delivered) * 100).toFixed(2);
  result.bounceRate = ((result.bounced / result.total) * 100).toFixed(2);
  result.unsubscribeRate = ((result.unsubscribed / delivered) * 100).toFixed(2);
  
  return result;
};

// Static method to get user email history
EmailLogSchema.statics.getUserHistory = function(userId, options = {}) {
  const query = { 'recipient.userId': userId };
  
  if (options.startDate) {
    query.createdAt = { $gte: options.startDate };
  }
  
  if (options.endDate) {
    query.createdAt = { ...query.createdAt, $lte: options.endDate };
  }
  
  if (options.type) {
    query.type = options.type;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 100)
    .lean();
};

// Static method to get engagement report
EmailLogSchema.statics.getEngagementReport = async function(options = {}) {
  const matchStage = {};
  
  if (options.startDate || options.endDate) {
    matchStage.createdAt = {};
    if (options.startDate) matchStage.createdAt.$gte = options.startDate;
    if (options.endDate) matchStage.createdAt.$lte = options.endDate;
  }
  
  if (options.campaignId) {
    matchStage.campaignId = new mongoose.Types.ObjectId(options.campaignId);
  }
  
  if (options.organizationId) {
    matchStage.organizationId = new mongoose.Types.ObjectId(options.organizationId);
  }
  
  const report = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$recipient.userId',
        emailCount: { $sum: 1 },
        openCount: { $sum: '$tracking.openCount' },
        clickCount: { $sum: '$tracking.clickCount' },
        lastEmailAt: { $max: '$createdAt' },
        firstEmailAt: { $min: '$createdAt' },
        opened: { $max: { $cond: ['$tracking.opened', 1, 0] } },
        clicked: { $max: { $cond: ['$tracking.clicked', 1, 0] } },
      },
    },
    {
      $addFields: {
        openRate: { $multiply: [{ $divide: ['$openCount', '$emailCount'] }, 100] },
        clickRate: { $multiply: [{ $divide: ['$clickCount', '$emailCount'] }, 100] },
      },
    },
    { $sort: { emailCount: -1 } },
  ]);
  
  return report;
};

const EmailLog = mongoose.model('EmailLog', EmailLogSchema);

module.exports = EmailLog;
