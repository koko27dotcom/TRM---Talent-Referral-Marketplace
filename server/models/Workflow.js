/**
 * Workflow Model
 * Defines automated follow-up workflows with triggers, conditions, and actions
 * Part of the Auto-Followup Workflow Engine for TRM platform
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Workflow Trigger Types
const TRIGGER_TYPES = {
  CANDIDATE_APPLIED_INCOMPLETE: 'candidate_applied_incomplete',
  COMPANY_NO_REFERRALS: 'company_no_referrals',
  REFERRER_PENDING_REFERRALS: 'referrer_pending_referrals',
  REFERRER_INACTIVE: 'referrer_inactive',
  REFERRAL_STATUS_CHANGED: 'referral_status_changed',
  SCHEDULED: 'scheduled',
  MANUAL: 'manual',
  EVENT: 'event',
};

// Workflow Status
const WORKFLOW_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  DRAFT: 'draft',
  ARCHIVED: 'archived',
};

// Action Types
const ACTION_TYPES = {
  SEND_EMAIL: 'send_email',
  SEND_WHATSAPP: 'send_whatsapp',
  SEND_NOTIFICATION: 'send_notification',
  UPDATE_STATUS: 'update_status',
  WEBHOOK: 'webhook',
  DELAY: 'delay',
  CONDITION: 'condition',
};

// Condition Operators
const CONDITION_OPERATORS = {
  EQUALS: 'equals',
  NOT_EQUALS: 'not_equals',
  GREATER_THAN: 'greater_than',
  LESS_THAN: 'less_than',
  GREATER_THAN_OR_EQUAL: 'greater_than_or_equal',
  LESS_THAN_OR_EQUAL: 'less_than_or_equal',
  CONTAINS: 'contains',
  NOT_CONTAINS: 'not_contains',
  EXISTS: 'exists',
  NOT_EXISTS: 'not_exists',
  IN: 'in',
  NOT_IN: 'not_in',
};

// Condition Schema
const ConditionSchema = new Schema({
  field: {
    type: String,
    required: true,
    trim: true,
  },
  operator: {
    type: String,
    enum: Object.values(CONDITION_OPERATORS),
    required: true,
  },
  value: {
    type: Schema.Types.Mixed,
  },
  valueType: {
    type: String,
    enum: ['string', 'number', 'boolean', 'date', 'array', 'null'],
    default: 'string',
  },
}, { _id: true });

// Action Schema
const ActionSchema = new Schema({
  type: {
    type: String,
    enum: Object.values(ACTION_TYPES),
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  // For send_email action
  emailTemplateId: {
    type: Schema.Types.ObjectId,
    ref: 'EmailTemplate',
  },
  emailSubject: {
    type: String,
    trim: true,
  },
  emailBody: {
    type: String,
  },
  // For send_whatsapp action
  whatsappTemplateId: {
    type: Schema.Types.ObjectId,
    ref: 'WhatsAppTemplate',
  },
  whatsappTemplateName: {
    type: String,
    trim: true,
  },
  whatsappLanguage: {
    type: String,
    default: 'en',
  },
  // For send_notification action
  notificationType: {
    type: String,
    trim: true,
  },
  notificationTitle: {
    type: String,
    trim: true,
  },
  notificationMessage: {
    type: String,
    trim: true,
  },
  notificationPriority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
  },
  // For update_status action
  statusField: {
    type: String,
    trim: true,
  },
  statusValue: {
    type: Schema.Types.Mixed,
  },
  // For webhook action
  webhookUrl: {
    type: String,
    trim: true,
  },
  webhookMethod: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    default: 'POST',
  },
  webhookHeaders: {
    type: Schema.Types.Mixed,
    default: {},
  },
  webhookBody: {
    type: Schema.Types.Mixed,
    default: {},
  },
  // For delay action
  delayHours: {
    type: Number,
    min: 0,
  },
  delayMinutes: {
    type: Number,
    min: 0,
    max: 59,
  },
  // For condition action
  conditions: [ConditionSchema],
  conditionLogic: {
    type: String,
    enum: ['and', 'or'],
    default: 'and',
  },
  trueActions: [Schema.Types.Mixed], // Nested actions (stored as ObjectIds or embedded)
  falseActions: [Schema.Types.Mixed],
  // General settings
  enabled: {
    type: Boolean,
    default: true,
  },
  retryCount: {
    type: Number,
    default: 3,
    min: 0,
    max: 5,
  },
  retryDelayMinutes: {
    type: Number,
    default: 30,
    min: 5,
  },
  // Template variables for personalization
  templateVariables: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, { _id: true });

// Schedule Configuration Schema (for scheduled triggers)
const ScheduleConfigSchema = new Schema({
  frequency: {
    type: String,
    enum: ['once', 'hourly', 'daily', 'weekly', 'monthly', 'custom'],
    required: true,
  },
  // For custom cron expressions
  cronExpression: {
    type: String,
    trim: true,
  },
  // For specific times
  timeOfDay: {
    type: String, // HH:mm format
    trim: true,
  },
  // For weekly/monthly
  dayOfWeek: {
    type: Number, // 0-6 (Sunday-Saturday)
    min: 0,
    max: 6,
  },
  dayOfMonth: {
    type: Number, // 1-31
    min: 1,
    max: 31,
  },
  timezone: {
    type: String,
    default: 'Asia/Yangon',
  },
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
  },
}, { _id: false });

// Target Audience Schema
const TargetAudienceSchema = new Schema({
  userTypes: [{
    type: String,
    enum: ['job_seeker', 'referrer', 'corporate_admin', 'corporate_recruiter', 'platform_admin'],
  }],
  userSegments: [{
    type: Schema.Types.ObjectId,
    ref: 'UserSegment',
  }],
  // Filters for dynamic targeting
  filters: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, { _id: false });

// Main Workflow Schema
const WorkflowSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Workflow name is required'],
    trim: true,
    maxlength: [200, 'Name cannot exceed 200 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },
  // Workflow categorization
  category: {
    type: String,
    enum: ['candidate_engagement', 'referrer_engagement', 'company_engagement', 'referral_management', 'system'],
    required: true,
  },
  // Trigger configuration
  trigger: {
    type: {
      type: String,
      enum: Object.values(TRIGGER_TYPES),
      required: true,
    },
    // Additional trigger-specific configuration
    config: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  // Schedule configuration (for scheduled triggers)
  schedule: {
    type: ScheduleConfigSchema,
    default: null,
  },
  // Entry conditions (must be met to enter workflow)
  entryConditions: [ConditionSchema],
  entryConditionLogic: {
    type: String,
    enum: ['and', 'or'],
    default: 'and',
  },
  // Actions to execute
  actions: [ActionSchema],
  // Target audience
  targetAudience: {
    type: TargetAudienceSchema,
    default: () => ({}),
  },
  // Workflow status
  status: {
    type: String,
    enum: Object.values(WORKFLOW_STATUS),
    default: WORKFLOW_STATUS.DRAFT,
  },
  // Execution settings
  settings: {
    maxExecutionsPerEntity: {
      type: Number,
      default: 0, // 0 = unlimited
      min: 0,
    },
    cooldownHours: {
      type: Number,
      default: 24, // Minimum hours between re-executions
      min: 0,
    },
    allowReEntry: {
      type: Boolean,
      default: false,
    },
    executeOnWeekends: {
      type: Boolean,
      default: true,
    },
    executeOnHolidays: {
      type: Boolean,
      default: true,
    },
    priority: {
      type: Number,
      default: 5, // 1-10, lower = higher priority
      min: 1,
      max: 10,
    },
  },
  // Statistics
  stats: {
    totalExecutions: {
      type: Number,
      default: 0,
    },
    successfulExecutions: {
      type: Number,
      default: 0,
    },
    failedExecutions: {
      type: Number,
      default: 0,
    },
    lastExecutedAt: {
      type: Date,
    },
    lastExecutionStatus: {
      type: String,
      enum: ['success', 'failed', 'partial', null],
      default: null,
    },
  },
  // Metadata
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for efficient queries
WorkflowSchema.index({ status: 1, 'trigger.type': 1 });
WorkflowSchema.index({ category: 1, status: 1 });
WorkflowSchema.index({ createdAt: -1 });
WorkflowSchema.index({ 'stats.lastExecutedAt': -1 });

// Virtual for success rate
WorkflowSchema.virtual('successRate').get(function() {
  if (this.stats.totalExecutions === 0) return 0;
  return Math.round((this.stats.successfulExecutions / this.stats.totalExecutions) * 100);
});

// Pre-save middleware to validate trigger-specific configuration
WorkflowSchema.pre('save', function(next) {
  // Validate schedule configuration for scheduled triggers
  if (this.trigger.type === TRIGGER_TYPES.SCHEDULED && !this.schedule) {
    return next(new Error('Schedule configuration is required for scheduled triggers'));
  }
  
  // Validate actions exist
  if (!this.actions || this.actions.length === 0) {
    return next(new Error('At least one action is required'));
  }
  
  next();
});

// Static method to find active workflows by trigger type
WorkflowSchema.statics.findActiveByTrigger = function(triggerType) {
  return this.find({
    status: WORKFLOW_STATUS.ACTIVE,
    'trigger.type': triggerType,
  }).sort({ 'settings.priority': 1, createdAt: -1 });
};

// Static method to find workflows by category
WorkflowSchema.statics.findByCategory = function(category, status = WORKFLOW_STATUS.ACTIVE) {
  return this.find({
    category,
    status,
  }).sort({ 'settings.priority': 1 });
};

// Instance method to check if workflow can execute for an entity
WorkflowSchema.methods.canExecuteForEntity = function(entityId, lastExecutionAt) {
  // Check max executions limit
  if (this.settings.maxExecutionsPerEntity > 0) {
    // This would need to be checked against WorkflowExecution collection
    // Return true for now, actual check done in execution service
  }
  
  // Check cooldown period
  if (lastExecutionAt && this.settings.cooldownHours > 0) {
    const cooldownEnd = new Date(lastExecutionAt.getTime() + (this.settings.cooldownHours * 60 * 60 * 1000));
    if (new Date() < cooldownEnd) {
      return false;
    }
  }
  
  return true;
};

// Instance method to increment execution stats
WorkflowSchema.methods.incrementStats = async function(status) {
  this.stats.totalExecutions += 1;
  this.stats.lastExecutedAt = new Date();
  this.stats.lastExecutionStatus = status;
  
  if (status === 'success') {
    this.stats.successfulExecutions += 1;
  } else if (status === 'failed') {
    this.stats.failedExecutions += 1;
  }
  
  await this.save();
};

const Workflow = mongoose.model('Workflow', WorkflowSchema);

module.exports = Workflow;
module.exports.TRIGGER_TYPES = TRIGGER_TYPES;
module.exports.WORKFLOW_STATUS = WORKFLOW_STATUS;
module.exports.ACTION_TYPES = ACTION_TYPES;
module.exports.CONDITION_OPERATORS = CONDITION_OPERATORS;