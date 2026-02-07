/**
 * Email Sequence Model
 * Drip sequence configuration for automated email campaigns
 * Supports time-based triggers, conditional logic, and A/B testing
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Sequence Step Schema
const SequenceStepSchema = new Schema({
  stepNumber: {
    type: Number,
    required: true,
    min: 1,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  
  // Trigger Configuration
  trigger: {
    type: {
      type: String,
      enum: ['time_delay', 'event', 'condition', 'manual'],
      default: 'time_delay',
    },
    // For time_delay trigger
    delay: {
      value: {
        type: Number,
        default: 1,
        min: 0,
      },
      unit: {
        type: String,
        enum: ['minutes', 'hours', 'days', 'weeks'],
        default: 'days',
      },
    },
    // For event trigger
    eventName: {
      type: String,
      default: null,
    },
    eventData: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
    // For condition trigger
    condition: {
      field: String,
      operator: {
        type: String,
        enum: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'exists', 'not_exists'],
      },
      value: Schema.Types.Mixed,
    },
  },
  
  // Email Content
  templateId: {
    type: Schema.Types.ObjectId,
    ref: 'EmailTemplate',
    required: true,
  },
  
  // Override template settings for this step
  overrides: {
    subject: {
      type: String,
      default: null,
    },
    fromName: {
      type: String,
      default: null,
    },
    fromEmail: {
      type: String,
      default: null,
    },
  },
  
  // Conditional sending logic
  sendConditions: [{
    field: {
      type: String,
      required: true,
    },
    operator: {
      type: String,
      enum: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'in', 'not_in', 'exists', 'not_exists'],
      required: true,
    },
    value: Schema.Types.Mixed,
  }],
  
  // Skip conditions (if true, skip this step)
  skipConditions: [{
    field: {
      type: String,
      required: true,
    },
    operator: {
      type: String,
      enum: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'in', 'not_in', 'exists', 'not_exists'],
      required: true,
    },
    value: Schema.Types.Mixed,
  }],
  
  // A/B Testing for this step
  abTesting: {
    enabled: {
      type: Boolean,
      default: false,
    },
    variants: [{
      name: String,
      templateId: {
        type: Schema.Types.ObjectId,
        ref: 'EmailTemplate',
      },
      percentage: Number,
      subject: String,
    }],
  },
  
  // Step Statistics
  stats: {
    entered: { type: Number, default: 0 },
    sent: { type: Number, default: 0 },
    opened: { type: Number, default: 0 },
    clicked: { type: Number, default: 0 },
    bounced: { type: Number, default: 0 },
    unsubscribed: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
  },
  
  // Is this step active?
  isActive: {
    type: Boolean,
    default: true,
  },
}, { _id: true });

// Sequence Enrollment Schema (tracks users in sequence)
const SequenceEnrollmentSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  currentStep: {
    type: Number,
    default: 1,
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'cancelled', 'bounced', 'unsubscribed'],
    default: 'active',
  },
  enrolledAt: {
    type: Date,
    default: Date.now,
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  lastStepAt: {
    type: Date,
    default: Date.now,
  },
  nextStepAt: {
    type: Date,
    default: null,
  },
  // Context data for personalization
  context: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {},
  },
  // Step history
  stepHistory: [{
    stepNumber: Number,
    sentAt: Date,
    emailLogId: {
      type: Schema.Types.ObjectId,
      ref: 'EmailLog',
    },
    openedAt: Date,
    clickedAt: Date,
    status: {
      type: String,
      enum: ['sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'],
    },
  }],
  // Source of enrollment
  source: {
    type: String,
    enum: ['manual', 'automation', 'api', 'trigger'],
    default: 'manual',
  },
  // A/B test variant assigned
  assignedVariant: {
    type: Map,
    of: String,
    default: {},
  },
}, { _id: true });

// Exit Condition Schema
const ExitConditionSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  field: {
    type: String,
    required: true,
  },
  operator: {
    type: String,
    enum: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'in', 'not_in', 'exists', 'not_exists'],
    required: true,
  },
  value: Schema.Types.Mixed,
  exitMessage: {
    type: String,
    default: '',
  },
}, { _id: true });

// Main Email Sequence Schema
const EmailSequenceSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000,
  },
  
  // Unique identifier
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: /^[a-z0-9_-]+$/,
  },
  
  // Sequence Type
  type: {
    type: String,
    enum: [
      'candidate_followup',
      'referrer_reengagement',
      'company_activation',
      'referrer_weekly_reminder',
      'welcome_series',
      'onboarding',
      'nurture',
      'reactivation',
      'custom',
    ],
    default: 'custom',
  },
  
  // Sequence Status
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'archived'],
    default: 'draft',
  },
  
  // Steps in the sequence
  steps: [SequenceStepSchema],
  
  // Exit conditions (remove user from sequence)
  exitConditions: [ExitConditionSchema],
  
  // Enrollment Settings
  enrollment: {
    // How users enter this sequence
    trigger: {
      type: {
        type: String,
        enum: ['manual', 'event', 'segment', 'api', 'signup'],
        default: 'manual',
      },
      // For event trigger
      eventName: String,
      eventData: {
        type: Map,
        of: Schema.Types.Mixed,
        default: {},
      },
      // For segment trigger
      segmentId: {
        type: Schema.Types.ObjectId,
        ref: 'UserSegment',
        default: null,
      },
    },
    // Allow multiple enrollments per user
    allowReEnrollment: {
      type: Boolean,
      default: false,
    },
    // Cooldown period before re-enrollment (days)
    reEnrollmentCooldown: {
      type: Number,
      default: 30,
    },
    // Maximum times a user can be enrolled
    maxEnrollments: {
      type: Number,
      default: null,
    },
  },
  
  // Current Enrollments
  enrollments: [SequenceEnrollmentSchema],
  
  // Enrollment Statistics
  stats: {
    totalEnrollments: { type: Number, default: 0 },
    activeEnrollments: { type: Number, default: 0 },
    completedEnrollments: { type: Number, default: 0 },
    cancelledEnrollments: { type: Number, default: 0 },
    totalEmailsSent: { type: Number, default: 0 },
    averageCompletionTime: { type: Number, default: 0 }, // in hours
  },
  
  // Sequence Settings
  settings: {
    // Send emails on specific days only
    sendDays: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    }],
    // Send between specific hours
    sendWindow: {
      start: {
        type: String,
        default: '09:00',
      },
      end: {
        type: String,
        default: '17:00',
      },
      timezone: {
        type: String,
        default: 'Asia/Yangon',
      },
    },
    // Respect user timezone
    respectUserTimezone: {
      type: Boolean,
      default: false,
    },
    // Pause on holidays
    pauseOnHolidays: {
      type: Boolean,
      default: false,
    },
    // Holiday list
    holidays: [Date],
  },
  
  // Goals
  goals: {
    primaryGoal: {
      type: String,
      enum: ['engagement', 'conversion', 'retention', 'activation', 'revenue'],
      default: 'engagement',
    },
    targetConversionRate: {
      type: Number,
      default: 5,
    },
    conversionEvent: {
      type: String,
      default: null,
    },
  },
  
  // Tags
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

// Indexes
EmailSequenceSchema.index({ slug: 1 });
EmailSequenceSchema.index({ status: 1, type: 1 });
EmailSequenceSchema.index({ 'enrollments.userId': 1 });
EmailSequenceSchema.index({ 'enrollments.status': 1, 'enrollments.nextStepAt': 1 });
EmailSequenceSchema.index({ createdBy: 1 });
EmailSequenceSchema.index({ organizationId: 1 });

// Method to enroll a user
EmailSequenceSchema.methods.enrollUser = async function(userId, context = {}, source = 'manual') {
  // Check if user is already enrolled
  const existingEnrollment = this.enrollments.find(
    e => e.userId.toString() === userId.toString() && ['active', 'paused'].includes(e.status)
  );
  
  if (existingEnrollment && !this.enrollment.allowReEnrollment) {
    throw new Error('User is already enrolled in this sequence');
  }
  
  // Check re-enrollment cooldown
  if (existingEnrollment) {
    const lastEnrollment = this.enrollments
      .filter(e => e.userId.toString() === userId.toString())
      .sort((a, b) => b.enrolledAt - a.enrolledAt)[0];
    
    if (lastEnrollment) {
      const daysSince = (Date.now() - lastEnrollment.completedAt || lastEnrollment.enrolledAt) / (1000 * 60 * 60 * 24);
      if (daysSince < this.enrollment.reEnrollmentCooldown) {
        throw new Error(`Re-enrollment cooldown period not met. Wait ${Math.ceil(this.enrollment.reEnrollmentCooldown - daysSince)} days.`);
      }
    }
    
    // Cancel existing enrollment
    existingEnrollment.status = 'cancelled';
  }
  
  // Create new enrollment
  const enrollment = {
    userId,
    currentStep: 1,
    status: 'active',
    enrolledAt: new Date(),
    startedAt: new Date(),
    context,
    source,
    nextStepAt: this.calculateNextStepTime(1),
  };
  
  this.enrollments.push(enrollment);
  this.stats.totalEnrollments += 1;
  this.stats.activeEnrollments += 1;
  
  await this.save();
  return enrollment;
};

// Method to calculate next step time
EmailSequenceSchema.methods.calculateNextStepTime = function(stepNumber) {
  const step = this.steps.find(s => s.stepNumber === stepNumber);
  if (!step || step.trigger.type !== 'time_delay') {
    return null;
  }
  
  const { value, unit } = step.trigger.delay;
  const multipliers = {
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
    weeks: 7 * 24 * 60 * 60 * 1000,
  };
  
  return new Date(Date.now() + value * multipliers[unit]);
};

// Method to advance user to next step
EmailSequenceSchema.methods.advanceUser = async function(userId) {
  const enrollment = this.enrollments.find(
    e => e.userId.toString() === userId.toString() && e.status === 'active'
  );
  
  if (!enrollment) {
    throw new Error('Active enrollment not found');
  }
  
  const nextStepNumber = enrollment.currentStep + 1;
  const nextStep = this.steps.find(s => s.stepNumber === nextStepNumber);
  
  if (!nextStep) {
    // Sequence completed
    enrollment.status = 'completed';
    enrollment.completedAt = new Date();
    this.stats.activeEnrollments -= 1;
    this.stats.completedEnrollments += 1;
  } else {
    enrollment.currentStep = nextStepNumber;
    enrollment.lastStepAt = new Date();
    enrollment.nextStepAt = this.calculateNextStepTime(nextStepNumber);
  }
  
  await this.save();
  return enrollment;
};

// Method to check exit conditions
EmailSequenceSchema.methods.checkExitConditions = function(context) {
  for (const condition of this.exitConditions) {
    const fieldValue = context[condition.field];
    let shouldExit = false;
    
    switch (condition.operator) {
      case 'equals':
        shouldExit = fieldValue === condition.value;
        break;
      case 'not_equals':
        shouldExit = fieldValue !== condition.value;
        break;
      case 'contains':
        shouldExit = String(fieldValue).includes(condition.value);
        break;
      case 'greater_than':
        shouldExit = Number(fieldValue) > Number(condition.value);
        break;
      case 'less_than':
        shouldExit = Number(fieldValue) < Number(condition.value);
        break;
      case 'exists':
        shouldExit = fieldValue !== undefined && fieldValue !== null;
        break;
      case 'not_exists':
        shouldExit = fieldValue === undefined || fieldValue === null;
        break;
      default:
        break;
    }
    
    if (shouldExit) {
      return {
        shouldExit: true,
        reason: condition.exitMessage || `Exit condition met: ${condition.name}`,
      };
    }
  }
  
  return { shouldExit: false };
};

// Method to evaluate conditions
EmailSequenceSchema.methods.evaluateConditions = function(conditions, context) {
  if (!conditions || conditions.length === 0) {
    return true;
  }
  
  return conditions.every(condition => {
    const fieldValue = context[condition.field];
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'contains':
        return String(fieldValue).includes(condition.value);
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      case 'not_exists':
        return fieldValue === undefined || fieldValue === null;
      default:
        return false;
    }
  });
};

// Static method to get active sequences
EmailSequenceSchema.statics.getActiveSequences = function() {
  return this.find({ status: 'active' });
};

// Static method to get sequences ready for processing
EmailSequenceSchema.statics.getSequencesForProcessing = function() {
  return this.find({
    status: 'active',
    'enrollments.status': 'active',
    'enrollments.nextStepAt': { $lte: new Date() },
  });
};

const EmailSequence = mongoose.model('EmailSequence', EmailSequenceSchema);

module.exports = EmailSequence;
