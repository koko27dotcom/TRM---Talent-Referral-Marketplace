/**
 * Email Campaign Model
 * Represents marketing campaigns for email outreach
 * Tracks campaign metadata, targeting, scheduling, and performance metrics
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// A/B Test Variant Schema
const ABVariantSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  subject: {
    type: String,
    required: true,
    trim: true,
  },
  templateId: {
    type: Schema.Types.ObjectId,
    ref: 'EmailTemplate',
    required: true,
  },
  percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  // Performance metrics for this variant
  stats: {
    sent: { type: Number, default: 0 },
    delivered: { type: Number, default: 0 },
    opened: { type: Number, default: 0 },
    clicked: { type: Number, default: 0 },
    bounced: { type: Number, default: 0 },
    unsubscribed: { type: Number, default: 0 },
    complained: { type: Number, default: 0 },
  },
}, { _id: true });

// Campaign Schedule Schema
const CampaignScheduleSchema = new Schema({
  type: {
    type: String,
    enum: ['immediate', 'scheduled', 'recurring'],
    default: 'immediate',
  },
  scheduledAt: {
    type: Date,
    default: null,
  },
  timezone: {
    type: String,
    default: 'Asia/Yangon',
  },
  recurringConfig: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', null],
      default: null,
    },
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6,
      default: null,
    },
    dayOfMonth: {
      type: Number,
      min: 1,
      max: 31,
      default: null,
    },
    time: {
      type: String,
      default: '09:00',
    },
  },
}, { _id: false });

// Main Campaign Schema
const EmailCampaignSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000,
  },
  
  // Campaign Type
  type: {
    type: String,
    enum: ['broadcast', 'drip_sequence', 'transactional', 'automation'],
    default: 'broadcast',
  },
  
  // Campaign Status
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled', 'failed'],
    default: 'draft',
  },
  
  // Targeting
  segmentId: {
    type: Schema.Types.ObjectId,
    ref: 'UserSegment',
    default: null,
  },
  
  // Target user IDs (if not using segment)
  targetUserIds: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  
  // Email Content
  fromName: {
    type: String,
    required: true,
    default: 'TRM Jobs',
    trim: true,
  },
  fromEmail: {
    type: String,
    required: true,
    default: 'noreply@trmjobs.com',
    trim: true,
    lowercase: true,
  },
  replyTo: {
    type: String,
    trim: true,
    lowercase: true,
    default: null,
  },
  
  // Subject Line (can be personalized)
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  previewText: {
    type: String,
    trim: true,
    maxlength: 150,
  },
  
  // Template Reference
  templateId: {
    type: Schema.Types.ObjectId,
    ref: 'EmailTemplate',
    default: null,
  },
  
  // Custom HTML content (if not using template)
  customHtml: {
    type: String,
    default: null,
  },
  
  // A/B Testing
  abTesting: {
    enabled: {
      type: Boolean,
      default: false,
    },
    testPercentage: {
      type: Number,
      default: 20,
      min: 5,
      max: 50,
    },
    winningMetric: {
      type: String,
      enum: ['open_rate', 'click_rate'],
      default: 'open_rate',
    },
    testDuration: {
      type: Number,
      default: 4, // hours
      min: 1,
      max: 48,
    },
    variants: [ABVariantSchema],
    winnerVariantId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
  },
  
  // Scheduling
  schedule: CampaignScheduleSchema,
  
  // Campaign Goals
  goals: {
    targetOpenRate: {
      type: Number,
      default: 20,
    },
    targetClickRate: {
      type: Number,
      default: 3,
    },
    targetConversionRate: {
      type: Number,
      default: 1,
    },
  },
  
  // Campaign Statistics
  stats: {
    totalRecipients: { type: Number, default: 0 },
    sent: { type: Number, default: 0 },
    delivered: { type: Number, default: 0 },
    opened: { type: Number, default: 0 },
    uniqueOpens: { type: Number, default: 0 },
    clicked: { type: Number, default: 0 },
    uniqueClicks: { type: Number, default: 0 },
    bounced: { type: Number, default: 0 },
    unsubscribed: { type: Number, default: 0 },
    complained: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    
    // Calculated rates
    openRate: { type: Number, default: 0 },
    clickRate: { type: Number, default: 0 },
    bounceRate: { type: Number, default: 0 },
    unsubscribeRate: { type: Number, default: 0 },
  },
  
  // Send Progress
  progress: {
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    currentBatch: { type: Number, default: 0 },
    totalBatches: { type: Number, default: 0 },
  },
  
  // Related Sequence (for drip campaigns)
  sequenceId: {
    type: Schema.Types.ObjectId,
    ref: 'EmailSequence',
    default: null,
  },
  sequenceStep: {
    type: Number,
    default: null,
  },
  
  // Campaign Tags
  tags: [{
    type: String,
    trim: true,
    maxlength: 50,
  }],
  
  // Metadata
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    default: null,
  },
}, {
  timestamps: true,
});

// Indexes for common queries
EmailCampaignSchema.index({ status: 1, 'schedule.scheduledAt': 1 });
EmailCampaignSchema.index({ createdBy: 1, createdAt: -1 });
EmailCampaignSchema.index({ organizationId: 1 });
EmailCampaignSchema.index({ segmentId: 1 });
EmailCampaignSchema.index({ sequenceId: 1 });
EmailCampaignSchema.index({ tags: 1 });

// Virtual for campaign duration
EmailCampaignSchema.virtual('duration').get(function() {
  if (this.progress.startedAt && this.progress.completedAt) {
    return this.progress.completedAt - this.progress.startedAt;
  }
  return null;
});

// Method to update calculated rates
EmailCampaignSchema.methods.updateRates = function() {
  const delivered = this.stats.delivered || 1;
  this.stats.openRate = ((this.stats.uniqueOpens / delivered) * 100).toFixed(2);
  this.stats.clickRate = ((this.stats.uniqueClicks / delivered) * 100).toFixed(2);
  this.stats.bounceRate = ((this.stats.bounced / this.stats.sent) * 100).toFixed(2);
  this.stats.unsubscribeRate = ((this.stats.unsubscribed / delivered) * 100).toFixed(2);
};

// Method to check if campaign is editable
EmailCampaignSchema.methods.isEditable = function() {
  return ['draft', 'scheduled', 'paused'].includes(this.status);
};

// Method to get winning variant
EmailCampaignSchema.methods.getWinningVariant = function() {
  if (!this.abTesting.enabled || !this.abTesting.variants.length) {
    return null;
  }
  
  if (this.abTesting.winnerVariantId) {
    return this.abTesting.variants.find(v => v._id.equals(this.abTesting.winnerVariantId));
  }
  
  // Calculate winner based on metric
  const metric = this.abTesting.winningMetric;
  let bestVariant = null;
  let bestRate = -1;
  
  for (const variant of this.abTesting.variants) {
    const delivered = variant.stats.delivered || 1;
    const rate = metric === 'open_rate' 
      ? (variant.stats.opened / delivered) * 100
      : (variant.stats.clicked / delivered) * 100;
    
    if (rate > bestRate) {
      bestRate = rate;
      bestVariant = variant;
    }
  }
  
  return bestVariant;
};

const EmailCampaign = mongoose.model('EmailCampaign', EmailCampaignSchema);

module.exports = EmailCampaign;
