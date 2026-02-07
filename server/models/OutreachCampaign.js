/**
 * OutreachCampaign Model
 * Manages outreach sequences and campaign analytics
 * Tracks message delivery, opens, clicks, and conversions
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Message template schema
const MessageTemplateSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  subject: String, // For email
  body: {
    type: String,
    required: true,
  },
  variables: [{
    name: String,
    defaultValue: String,
    required: Boolean,
  }],
  personalization: {
    tone: {
      type: String,
      enum: ['professional', 'friendly', 'casual', 'formal'],
      default: 'professional',
    },
    includeEmoji: {
      type: Boolean,
      default: false,
    },
    signature: String,
  },
}, { _id: true });

// Follow-up sequence schema
const FollowUpSequenceSchema = new Schema({
  order: {
    type: Number,
    required: true,
  },
  delayDays: {
    type: Number,
    required: true,
    min: 0,
  },
  delayHours: {
    type: Number,
    default: 0,
    min: 0,
    max: 23,
  },
  template: MessageTemplateSchema,
  condition: {
    type: String,
    enum: ['always', 'if_no_reply', 'if_not_opened', 'if_not_clicked'],
    default: 'if_no_reply',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { _id: true });

// Target filter schema
const TargetFilterSchema = new Schema({
  // Basic filters
  skills: [String],
  experienceRange: {
    min: Number,
    max: Number,
  },
  locations: [String],
  currentCompanies: [String],
  excludeCompanies: [String],
  jobTitles: [String],
  
  // AI Score filters
  minHireProbability: {
    type: Number,
    min: 0,
    max: 100,
  },
  minEngagementScore: {
    type: Number,
    min: 0,
    max: 100,
  },
  
  // Status filters
  contactStatus: [{
    type: String,
    enum: ['not_contacted', 'contacted', 'responded', 'engaged', 'not_interested'],
  }],
  sources: [{
    type: String,
    enum: ['linkedin', 'facebook', 'job.com.mm', 'manual', 'import', 'referral'],
  }],
  
  // Date filters
  addedAfter: Date,
  addedBefore: Date,
  lastContactBefore: Date,
  neverContacted: Boolean,
  
  // Advanced filters
  tags: [String],
  salaryRange: {
    min: Number,
    max: Number,
  },
  hasEmail: Boolean,
  hasPhone: Boolean,
}, { _id: false });

// Campaign recipient schema
const CampaignRecipientSchema = new Schema({
  candidateId: {
    type: Schema.Types.ObjectId,
    ref: 'TalentPool',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed', 'opted_out', 'converted'],
    default: 'pending',
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
  sentAt: Date,
  deliveredAt: Date,
  openedAt: Date,
  clickedAt: Date,
  repliedAt: Date,
  convertedAt: Date,
  
  // Message tracking
  messageHistory: [{
    type: {
      type: String,
      enum: ['initial', 'follow_up_1', 'follow_up_2', 'follow_up_3'],
    },
    sentAt: Date,
    status: String,
    messageContent: String,
  }],
  
  // Personalization data
  personalizedMessage: String,
  variables: Schema.Types.Mixed,
  
  // Engagement metrics
  openCount: {
    type: Number,
    default: 0,
  },
  clickCount: {
    type: Number,
    default: 0,
  },
  
  // Response data
  responseContent: String,
  responseSentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative', 'unknown'],
  },
  
  // Error tracking
  errorMessage: String,
  retryCount: {
    type: Number,
    default: 0,
  },
}, { _id: true });

// A/B Test variant schema
const ABTestVariantSchema = new Schema({
  name: String,
  template: MessageTemplateSchema,
  weight: {
    type: Number,
    default: 50,
    min: 0,
    max: 100,
  },
  recipientCount: {
    type: Number,
    default: 0,
  },
  metrics: {
    opens: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    replies: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
  },
}, { _id: true });

// Campaign analytics schema
const CampaignAnalyticsSchema = new Schema({
  // Overall stats
  totalRecipients: {
    type: Number,
    default: 0,
  },
  sentCount: {
    type: Number,
    default: 0,
  },
  deliveredCount: {
    type: Number,
    default: 0,
  },
  openedCount: {
    type: Number,
    default: 0,
  },
  clickedCount: {
    type: Number,
    default: 0,
  },
  repliedCount: {
    type: Number,
    default: 0,
  },
  bouncedCount: {
    type: Number,
    default: 0,
  },
  failedCount: {
    type: Number,
    default: 0,
  },
  convertedCount: {
    type: Number,
    default: 0,
  },
  optedOutCount: {
    type: Number,
    default: 0,
  },
  
  // Calculated rates
  deliveryRate: Number,
  openRate: Number,
  clickRate: Number,
  replyRate: Number,
  conversionRate: Number,
  bounceRate: Number,
  
  // Time-based analytics
  hourlyDistribution: [{
    hour: Number,
    opens: Number,
    clicks: Number,
  }],
  dailyDistribution: [{
    date: Date,
    opens: Number,
    clicks: Number,
    replies: Number,
  }],
  
  // Device/Client analytics
  deviceBreakdown: {
    mobile: Number,
    desktop: Number,
    tablet: Number,
    unknown: Number,
  },
  
  // Last updated
  lastUpdatedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

// Outreach Campaign Schema
const OutreachCampaignSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Campaign name is required'],
    trim: true,
    index: true,
  },
  description: {
    type: String,
    trim: true,
  },
  
  // Campaign Type
  type: {
    type: String,
    enum: ['talent_sourcing', 'job_promotion', 're_engagement', 'nurture', 'event_invite'],
    default: 'talent_sourcing',
  },
  
  // Channel Configuration
  channel: {
    type: String,
    enum: ['whatsapp', 'email', 'sms', 'linkedin', 'multi'],
    required: true,
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
  },
  
  // Targeting
  targetFilter: TargetFilterSchema,
  targetJobId: {
    type: Schema.Types.ObjectId,
    ref: 'Job',
  },
  
  // Message Template
  messageTemplate: MessageTemplateSchema,
  
  // Follow-up Sequence
  followUpSequence: [FollowUpSequenceSchema],
  enableFollowUps: {
    type: Boolean,
    default: true,
  },
  
  // A/B Testing
  abTesting: {
    isEnabled: {
      type: Boolean,
      default: false,
    },
    variants: [ABTestVariantSchema],
    winningVariant: String,
    confidenceLevel: Number,
  },
  
  // Scheduling
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled'],
    default: 'draft',
    index: true,
  },
  scheduledAt: Date,
  startedAt: Date,
  completedAt: Date,
  
  // Sending Configuration
  sendingConfig: {
    batchSize: {
      type: Number,
      default: 50,
    },
    delayBetweenBatches: {
      type: Number,
      default: 300, // 5 minutes
    },
    dailyLimit: {
      type: Number,
      default: 500,
    },
    sendOnWeekends: {
      type: Boolean,
      default: false,
    },
    optimalTimeSending: {
      type: Boolean,
      default: true,
    },
    timezone: {
      type: String,
      default: 'Asia/Yangon',
    },
  },
  
  // Recipients
  recipients: [CampaignRecipientSchema],
  recipientCount: {
    type: Number,
    default: 0,
  },
  
  // Analytics
  analytics: {
    type: CampaignAnalyticsSchema,
    default: () => ({}),
  },
  
  // Automation Rules
  automationRules: {
    autoReplyEnabled: {
      type: Boolean,
      default: true,
    },
    autoReplyTemplate: String,
    assignToRecruiter: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    createTaskOnReply: {
      type: Boolean,
      default: true,
    },
  },
  
  // Metadata
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  tags: [{
    type: String,
    trim: true,
  }],
}, {
  timestamps: true,
});

// Indexes
OutreachCampaignSchema.index({ status: 1, scheduledAt: 1 });
OutreachCampaignSchema.index({ createdBy: 1, status: 1 });
OutreachCampaignSchema.index({ type: 1, channel: 1 });
OutreachCampaignSchema.index({ 'recipients.candidateId': 1 });
OutreachCampaignSchema.index({ createdAt: -1 });

// Virtual for progress
OutreachCampaignSchema.virtual('progress').get(function() {
  if (!this.recipients || this.recipients.length === 0) return 0;
  const sent = this.recipients.filter(r => ['sent', 'delivered', 'opened', 'clicked', 'replied'].includes(r.status)).length;
  return Math.round((sent / this.recipients.length) * 100);
});

// Virtual for isActive
OutreachCampaignSchema.virtual('isActive').get(function() {
  return ['scheduled', 'running'].includes(this.status);
});

// Pre-save middleware
OutreachCampaignSchema.pre('save', function(next) {
  // Update recipient count
  if (this.recipients) {
    this.recipientCount = this.recipients.length;
  }
  
  // Calculate analytics rates
  if (this.analytics && this.analytics.totalRecipients > 0) {
    const a = this.analytics;
    a.deliveryRate = Math.round((a.deliveredCount / a.sentCount) * 100) || 0;
    a.openRate = Math.round((a.openedCount / a.deliveredCount) * 100) || 0;
    a.clickRate = Math.round((a.clickedCount / a.deliveredCount) * 100) || 0;
    a.replyRate = Math.round((a.repliedCount / a.deliveredCount) * 100) || 0;
    a.conversionRate = Math.round((a.convertedCount / a.deliveredCount) * 100) || 0;
    a.bounceRate = Math.round((a.bouncedCount / a.sentCount) * 100) || 0;
  }
  
  next();
});

// Static methods
OutreachCampaignSchema.statics.findActive = function() {
  return this.find({ status: { $in: ['scheduled', 'running'] } });
};

OutreachCampaignSchema.statics.findScheduledToRun = function() {
  return this.find({
    status: 'scheduled',
    scheduledAt: { $lte: new Date() },
  });
};

OutreachCampaignSchema.statics.getStats = async function(userId) {
  const match = userId ? { createdBy: userId } : {};
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: {
          $sum: { $cond: [{ $in: ['$status', ['scheduled', 'running']] }, 1, 0] },
        },
        completed: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
        },
        totalSent: { $sum: '$analytics.sentCount' },
        totalOpened: { $sum: '$analytics.openedCount' },
        totalReplied: { $sum: '$analytics.repliedCount' },
        totalConverted: { $sum: '$analytics.convertedCount' },
        avgOpenRate: { $avg: '$analytics.openRate' },
        avgReplyRate: { $avg: '$analytics.replyRate' },
        avgConversionRate: { $avg: '$analytics.conversionRate' },
      },
    },
  ]);
};

// Instance methods
OutreachCampaignSchema.methods.addRecipients = function(candidateIds) {
  const newRecipients = candidateIds.map(id => ({
    candidateId: id,
    status: 'pending',
    addedAt: new Date(),
  }));
  
  this.recipients.push(...newRecipients);
  this.recipientCount = this.recipients.length;
  this.analytics.totalRecipients = this.recipients.length;
  
  return this.save();
};

OutreachCampaignSchema.methods.updateRecipientStatus = function(candidateId, status, metadata = {}) {
  const recipient = this.recipients.find(r => r.candidateId.toString() === candidateId.toString());
  if (!recipient) return null;
  
  const oldStatus = recipient.status;
  recipient.status = status;
  
  // Update timestamps based on status
  const now = new Date();
  switch (status) {
    case 'sent':
      recipient.sentAt = now;
      this.analytics.sentCount += 1;
      break;
    case 'delivered':
      recipient.deliveredAt = now;
      this.analytics.deliveredCount += 1;
      break;
    case 'opened':
      recipient.openedAt = now;
      recipient.openCount += 1;
      this.analytics.openedCount += 1;
      break;
    case 'clicked':
      recipient.clickedAt = now;
      recipient.clickCount += 1;
      this.analytics.clickedCount += 1;
      break;
    case 'replied':
      recipient.repliedAt = now;
      recipient.responseContent = metadata.content;
      recipient.responseSentiment = metadata.sentiment;
      this.analytics.repliedCount += 1;
      break;
    case 'converted':
      recipient.convertedAt = now;
      this.analytics.convertedCount += 1;
      break;
    case 'bounced':
      this.analytics.bouncedCount += 1;
      break;
    case 'failed':
      recipient.errorMessage = metadata.error;
      recipient.retryCount += 1;
      this.analytics.failedCount += 1;
      break;
  }
  
  this.analytics.lastUpdatedAt = now;
  return this.save();
};

OutreachCampaignSchema.methods.getPendingRecipients = function(limit = 50) {
  return this.recipients
    .filter(r => r.status === 'pending' && r.retryCount < 3)
    .slice(0, limit);
};

OutreachCampaignSchema.methods.calculateOptimalSendTime = function() {
  // Analyze historical data to find optimal send times
  const hourlyData = this.analytics.hourlyDistribution || [];
  if (hourlyData.length === 0) return 9; // Default to 9 AM
  
  const bestHour = hourlyData.reduce((best, current) => {
    return (current.opens > best.opens) ? current : best;
  }, hourlyData[0]);
  
  return bestHour.hour;
};

const OutreachCampaign = mongoose.model('OutreachCampaign', OutreachCampaignSchema);

module.exports = OutreachCampaign;
