/**
 * Workflow Execution Model
 * Tracks individual workflow executions with status, results, and logs
 * Part of the Auto-Followup Workflow Engine for TRM platform
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Execution Status
const EXECUTION_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  PAUSED: 'paused',
  RETRYING: 'retrying',
};

// Action Execution Status
const ACTION_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
  RETRYING: 'retrying',
  CANCELLED: 'cancelled',
};

// Entity Types
const ENTITY_TYPES = {
  USER: 'user',
  JOB: 'job',
  COMPANY: 'company',
  REFERRAL: 'referral',
  APPLICATION: 'application',
  SYSTEM: 'system',
};

// Action Result Schema
const ActionResultSchema = new Schema({
  actionId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  actionType: {
    type: String,
    required: true,
  },
  actionName: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: Object.values(ACTION_STATUS),
    default: ACTION_STATUS.PENDING,
  },
  startedAt: {
    type: Date,
  },
  completedAt: {
    type: Date,
  },
  durationMs: {
    type: Number,
    default: 0,
  },
  // Result details
  result: {
    success: {
      type: Boolean,
      default: false,
    },
    message: {
      type: String,
    },
    data: {
      type: Schema.Types.Mixed,
    },
    // For email actions
    emailLogId: {
      type: Schema.Types.ObjectId,
      ref: 'EmailLog',
    },
    // For WhatsApp actions
    whatsappMessageId: {
      type: Schema.Types.ObjectId,
      ref: 'WhatsAppMessage',
    },
    // For notification actions
    notificationId: {
      type: Schema.Types.ObjectId,
      ref: 'Notification',
    },
    // For webhook actions
    responseStatus: {
      type: Number,
    },
    responseBody: {
      type: Schema.Types.Mixed,
    },
  },
  // Error information
  error: {
    message: {
      type: String,
    },
    code: {
      type: String,
    },
    stack: {
      type: String,
    },
  },
  // Retry information
  retryCount: {
    type: Number,
    default: 0,
  },
  maxRetries: {
    type: Number,
    default: 3,
  },
  nextRetryAt: {
    type: Date,
  },
  // Execution logs
  logs: [{
    timestamp: {
      type: Date,
      default: Date.now,
    },
    level: {
      type: String,
      enum: ['debug', 'info', 'warn', 'error'],
      default: 'info',
    },
    message: {
      type: String,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  }],
}, { _id: true });

// Execution Log Entry Schema
const ExecutionLogSchema = new Schema({
  timestamp: {
    type: Date,
    default: Date.now,
  },
  level: {
    type: String,
    enum: ['debug', 'info', 'warn', 'error'],
    default: 'info',
  },
  message: {
    type: String,
    required: true,
  },
  source: {
    type: String, // e.g., 'workflow_engine', 'action_handler', 'condition_evaluator'
    trim: true,
  },
  metadata: {
    type: Schema.Types.Mixed,
  },
}, { _id: true });

// Main Workflow Execution Schema
const WorkflowExecutionSchema = new Schema({
  // Reference to workflow
  workflowId: {
    type: Schema.Types.ObjectId,
    ref: 'Workflow',
    required: true,
    index: true,
  },
  workflowName: {
    type: String,
    required: true,
  },
  // Execution trigger
  triggerType: {
    type: String,
    required: true,
  },
  triggeredBy: {
    type: String,
    enum: ['system', 'user', 'api', 'cron', 'webhook', 'event'],
    default: 'system',
  },
  triggeredByUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  // Target entity
  entityType: {
    type: String,
    enum: Object.values(ENTITY_TYPES),
    required: true,
  },
  entityId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  // Additional entity references for context
  relatedEntities: {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
    },
    referralId: {
      type: Schema.Types.ObjectId,
      ref: 'Referral',
    },
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
    },
  },
  // Execution status
  status: {
    type: String,
    enum: Object.values(EXECUTION_STATUS),
    default: EXECUTION_STATUS.PENDING,
    index: true,
  },
  // Execution timing
  scheduledAt: {
    type: Date,
    index: true,
  },
  startedAt: {
    type: Date,
  },
  completedAt: {
    type: Date,
  },
  nextScheduledAt: {
    type: Date,
    index: true,
  },
  // Execution duration in milliseconds
  durationMs: {
    type: Number,
    default: 0,
  },
  // Current action being executed
  currentActionIndex: {
    type: Number,
    default: 0,
  },
  // Action results
  actionResults: [ActionResultSchema],
  // Execution context (variables available during execution)
  context: {
    type: Schema.Types.Mixed,
    default: {},
  },
  // Input data that triggered the workflow
  inputData: {
    type: Schema.Types.Mixed,
    default: {},
  },
  // Execution logs
  logs: [ExecutionLogSchema],
  // Error information (for failed executions)
  error: {
    message: {
      type: String,
    },
    code: {
      type: String,
    },
    stack: {
      type: String,
    },
    actionIndex: {
      type: Number,
    },
  },
  // Cancellation info
  cancelledAt: {
    type: Date,
  },
  cancelledBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  cancellationReason: {
    type: String,
  },
  // Retry configuration
  retryConfig: {
    maxRetries: {
      type: Number,
      default: 3,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    retryDelayMinutes: {
      type: Number,
      default: 30,
    },
    nextRetryAt: {
      type: Date,
    },
  },
  // Execution priority (for queue ordering)
  priority: {
    type: Number,
    default: 5,
    min: 1,
    max: 10,
  },
  // Metadata
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Compound indexes for common queries
WorkflowExecutionSchema.index({ workflowId: 1, status: 1 });
WorkflowExecutionSchema.index({ entityType: 1, entityId: 1, status: 1 });
WorkflowExecutionSchema.index({ status: 1, scheduledAt: 1 });
WorkflowExecutionSchema.index({ status: 1, nextScheduledAt: 1 });
WorkflowExecutionSchema.index({ createdAt: -1 });
WorkflowExecutionSchema.index({ 'relatedEntities.userId': 1, createdAt: -1 });

// Virtual for progress percentage
WorkflowExecutionSchema.virtual('progress').get(function() {
  if (!this.actionResults || this.actionResults.length === 0) return 0;
  const completed = this.actionResults.filter(
    ar => ar.status === ACTION_STATUS.COMPLETED || ar.status === ACTION_STATUS.SKIPPED
  ).length;
  return Math.round((completed / this.actionResults.length) * 100);
});

// Virtual for success status
WorkflowExecutionSchema.virtual('isSuccessful').get(function() {
  return this.status === EXECUTION_STATUS.COMPLETED && 
         this.actionResults.every(ar => 
           ar.status === ACTION_STATUS.COMPLETED || ar.status === ACTION_STATUS.SKIPPED
         );
});

// Pre-save middleware to update timestamps
WorkflowExecutionSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === EXECUTION_STATUS.RUNNING && !this.startedAt) {
      this.startedAt = new Date();
    }
    if ([EXECUTION_STATUS.COMPLETED, EXECUTION_STATUS.FAILED, EXECUTION_STATUS.CANCELLED].includes(this.status)) {
      this.completedAt = new Date();
      if (this.startedAt) {
        this.durationMs = this.completedAt.getTime() - this.startedAt.getTime();
      }
    }
  }
  next();
});

// Instance method to add log entry
WorkflowExecutionSchema.methods.addLog = function(level, message, source = 'workflow_engine', metadata = {}) {
  this.logs.push({
    timestamp: new Date(),
    level,
    message,
    source,
    metadata,
  });
};

// Instance method to add action log
WorkflowExecutionSchema.methods.addActionLog = function(actionIndex, level, message, metadata = {}) {
  if (this.actionResults[actionIndex]) {
    this.actionResults[actionIndex].logs.push({
      timestamp: new Date(),
      level,
      message,
      metadata,
    });
  }
};

// Instance method to update action status
WorkflowExecutionSchema.methods.updateActionStatus = function(actionIndex, status, result = null, error = null) {
  if (!this.actionResults[actionIndex]) return;
  
  const actionResult = this.actionResults[actionIndex];
  actionResult.status = status;
  
  if (status === ACTION_STATUS.RUNNING && !actionResult.startedAt) {
    actionResult.startedAt = new Date();
  }
  
  if ([ACTION_STATUS.COMPLETED, ACTION_STATUS.FAILED, ACTION_STATUS.SKIPPED, ACTION_STATUS.CANCELLED].includes(status)) {
    actionResult.completedAt = new Date();
    if (actionResult.startedAt) {
      actionResult.durationMs = actionResult.completedAt.getTime() - actionResult.startedAt.getTime();
    }
  }
  
  if (result) {
    actionResult.result = { ...actionResult.result, ...result };
  }
  
  if (error) {
    actionResult.error = error;
  }
};

// Instance method to cancel execution
WorkflowExecutionSchema.methods.cancel = function(userId, reason) {
  this.status = EXECUTION_STATUS.CANCELLED;
  this.cancelledAt = new Date();
  this.cancelledBy = userId;
  this.cancellationReason = reason;
  
  // Cancel any pending actions
  this.actionResults.forEach(ar => {
    if (ar.status === ACTION_STATUS.PENDING || ar.status === ACTION_STATUS.RUNNING) {
      ar.status = ACTION_STATUS.CANCELLED;
      ar.completedAt = new Date();
    }
  });
  
  this.addLog('info', `Execution cancelled by user ${userId}. Reason: ${reason}`, 'workflow_engine');
};

// Static method to find pending executions
WorkflowExecutionSchema.statics.findPending = function(options = {}) {
  const { scheduledBefore = new Date(), limit = 100 } = options;
  
  return this.find({
    status: { $in: [EXECUTION_STATUS.PENDING, EXECUTION_STATUS.RETRYING] },
    $or: [
      { scheduledAt: { $lte: scheduledBefore } },
      { scheduledAt: null },
    ],
  })
    .sort({ priority: 1, scheduledAt: 1, createdAt: 1 })
    .limit(limit);
};

// Static method to find executions by entity
WorkflowExecutionSchema.statics.findByEntity = function(entityType, entityId, options = {}) {
  const { status, limit = 50, skip = 0 } = options;
  
  const query = { entityType, entityId };
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to find recent executions for a workflow
WorkflowExecutionSchema.statics.findRecentByWorkflow = function(workflowId, options = {}) {
  const { limit = 50, status } = options;
  
  const query = { workflowId };
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get execution statistics
WorkflowExecutionSchema.statics.getStatistics = async function(workflowId, dateRange = {}) {
  const { startDate, endDate } = dateRange;
  
  const matchStage = { workflowId: new mongoose.Types.ObjectId(workflowId) };
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgDuration: { $avg: '$durationMs' },
      },
    },
  ]);
  
  return stats.reduce((acc, stat) => {
    acc[stat._id] = {
      count: stat.count,
      avgDurationMs: Math.round(stat.avgDuration || 0),
    };
    return acc;
  }, {});
};

const WorkflowExecution = mongoose.model('WorkflowExecution', WorkflowExecutionSchema);

module.exports = WorkflowExecution;
module.exports.EXECUTION_STATUS = EXECUTION_STATUS;
module.exports.ACTION_STATUS = ACTION_STATUS;
module.exports.ENTITY_TYPES = ENTITY_TYPES;