/**
 * Workflow Engine Service
 * Core service for executing automated follow-up workflows
 * Part of the Auto-Followup Workflow Engine for TRM platform
 */

const mongoose = require('mongoose');
const axios = require('axios');
const Workflow = require('../models/Workflow.js');
const { 
  TRIGGER_TYPES, 
  WORKFLOW_STATUS, 
  ACTION_TYPES,
  CONDITION_OPERATORS 
} = require('../models/Workflow.js');
const WorkflowExecution = require('../models/WorkflowExecution.js');
const { 
  EXECUTION_STATUS, 
  ACTION_STATUS,
  ENTITY_TYPES 
} = require('../models/WorkflowExecution.js');
const { 
  User, 
  Job, 
  Company, 
  Referral, 
  Application,
  EmailTemplate,
  WhatsAppTemplate,
  EmailLog,
  WhatsAppMessage,
  Notification
} = require('../models/index.js');
const { sendEmail } = require('./emailMarketingService.js');
const { sendTemplateMessage, formatPhoneNumber } = require('./whatsappService.js');
const notificationService = require('./notificationService.js');
const sendAppNotification = notificationService.sendNotification;

// ==================== PREDEFINED WORKFLOWS ====================

/**
 * Predefined workflow configurations
 * These are the standard auto-followup workflows for TRM platform
 */
const PREDEFINED_WORKFLOWS = {
  // 1. Candidate Applied but Not Completed
  CANDIDATE_INCOMPLETE_APPLICATION: {
    name: 'Candidate Incomplete Application Follow-up',
    description: 'Follow up with candidates who started but did not complete their application',
    category: 'candidate_engagement',
    trigger: {
      type: TRIGGER_TYPES.CANDIDATE_APPLIED_INCOMPLETE,
      config: {
        incompleteAfter: 24, // hours
      },
    },
    actions: [
      {
        type: ACTION_TYPES.DELAY,
        config: { hours: 24 },
      },
      {
        type: ACTION_TYPES.CONDITION,
        config: {
          field: 'application.status',
          operator: CONDITION_OPERATORS.EQUALS,
          value: 'incomplete',
        },
        onTrue: [
          {
            type: ACTION_TYPES.SEND_EMAIL,
            config: {
              template: 'candidate_incomplete_reminder',
              subject: 'Complete Your Application - We\'re Waiting!',
            },
          },
        ],
      },
    ],
  },

  // 2. Company Has No Referrals
  COMPANY_NO_REFERRALS: {
    name: 'Company No Referrals Follow-up',
    description: 'Encourage companies to start posting jobs when they have no referrals',
    category: 'company_engagement',
    trigger: {
      type: TRIGGER_TYPES.COMPANY_NO_REFERRALS,
      config: {
        daysWithoutReferrals: 7,
      },
    },
    actions: [
      {
        type: ACTION_TYPES.DELAY,
        config: { days: 7 },
      },
      {
        type: ACTION_TYPES.SEND_EMAIL,
        config: {
          template: 'company_no_referrals',
          subject: 'Start Hiring with Referrals - It\'s Free!',
        },
      },
    ],
  },

  // 3. Referrer Has Pending Referrals
  REFERRER_PENDING_REFERRALS: {
    name: 'Referrer Pending Referrals Reminder',
    description: 'Remind referrers about their pending referrals',
    category: 'referrer_engagement',
    trigger: {
      type: TRIGGER_TYPES.REFERRER_PENDING_REFERRALS,
      config: {
        pendingAfter: 48, // hours
      },
    },
    actions: [
      {
        type: ACTION_TYPES.DELAY,
        config: { hours: 48 },
      },
      {
        type: ACTION_TYPES.SEND_WHATSAPP,
        config: {
          template: 'referrer_pending_reminder',
        },
      },
    ],
  },

  // 4. Referrer Inactive
  REFERRER_INACTIVE: {
    name: 'Referrer Re-engagement',
    description: 'Re-engage referrers who haven\'t been active',
    category: 'referrer_engagement',
    trigger: {
      type: TRIGGER_TYPES.REFERRER_INACTIVE,
      config: {
        inactiveAfter: 30, // days
      },
    },
    actions: [
      {
        type: ACTION_TYPES.DELAY,
        config: { days: 30 },
      },
      {
        type: ACTION_TYPES.SEND_EMAIL,
        config: {
          template: 'referrer_reengagement',
          subject: 'We Miss You! New Jobs Available',
        },
      },
    ],
  },
};

// ==================== WORKFLOW EXECUTION ====================

/**
 * Trigger a workflow based on an event
 * @param {string} triggerType - Type of trigger
 * @param {Object} context - Context data (user, job, referral, etc.)
 * @returns {Promise<Object>} Created workflow execution
 */
const triggerWorkflow = async (triggerType, context) => {
  try {
    // Find active workflows matching this trigger
    const workflows = await Workflow.find({
      'trigger.type': triggerType,
      status: WORKFLOW_STATUS.ACTIVE,
    });

    const executions = [];

    for (const workflow of workflows) {
      // Check if trigger conditions are met
      const shouldTrigger = await evaluateTriggerConditions(workflow.trigger, context);
      
      if (shouldTrigger) {
        // Create workflow execution
        const execution = await WorkflowExecution.create({
          workflowId: workflow._id,
          triggerType,
          context,
          status: EXECUTION_STATUS.PENDING,
          scheduledAt: calculateScheduleTime(workflow.actions[0]),
        });

        executions.push(execution);
      }
    }

    return executions;
  } catch (error) {
    console.error('[WorkflowEngine] Error triggering workflow:', error);
    throw error;
  }
};

/**
 * Execute a pending workflow
 * @param {string} executionId - Workflow execution ID
 * @returns {Promise<Object>} Execution result
 */
const executeWorkflow = async (executionId) => {
  try {
    const execution = await WorkflowExecution.findById(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    // Update status to running
    execution.status = EXECUTION_STATUS.RUNNING;
    execution.startedAt = new Date();
    await execution.save();

    // Get workflow
    const workflow = await Workflow.findById(execution.workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${execution.workflowId}`);
    }

    // Execute actions
    for (let i = 0; i < workflow.actions.length; i++) {
      const action = workflow.actions[i];
      const actionResult = await executeAction(action, execution.context, execution);
      
      execution.actionResults.push(actionResult);
      
      if (actionResult.status === ACTION_STATUS.FAILED) {
        execution.status = EXECUTION_STATUS.FAILED;
        execution.error = actionResult.error;
        await execution.save();
        return execution;
      }

      // Handle condition branches
      if (action.type === ACTION_TYPES.CONDITION) {
        const conditionMet = actionResult.result;
        const branch = conditionMet ? action.onTrue : action.onFalse;
        
        if (branch && branch.length > 0) {
          for (const branchAction of branch) {
            const branchResult = await executeAction(branchAction, execution.context, execution);
            execution.actionResults.push(branchResult);
          }
        }
      }
    }

    // Mark as completed
    execution.status = EXECUTION_STATUS.COMPLETED;
    execution.completedAt = new Date();
    await execution.save();

    return execution;
  } catch (error) {
    console.error('[WorkflowEngine] Error executing workflow:', error);
    
    // Update execution with error
    await WorkflowExecution.findByIdAndUpdate(executionId, {
      status: EXECUTION_STATUS.FAILED,
      error: error.message,
      completedAt: new Date(),
    });

    throw error;
  }
};

/**
 * Execute a single action
 * @param {Object} action - Action configuration
 * @param {Object} context - Execution context
 * @param {Object} execution - Workflow execution
 * @returns {Promise<Object>} Action result
 */
const executeAction = async (action, context, execution) => {
  const actionResult = {
    actionId: new mongoose.Types.ObjectId(),
    actionType: action.type,
    status: ACTION_STATUS.PENDING,
    startedAt: new Date(),
  };

  try {
    switch (action.type) {
      case ACTION_TYPES.SEND_EMAIL:
        await executeSendEmail(action.config, context);
        actionResult.status = ACTION_STATUS.COMPLETED;
        break;

      case ACTION_TYPES.SEND_WHATSAPP:
        await executeSendWhatsApp(action.config, context);
        actionResult.status = ACTION_STATUS.COMPLETED;
        break;

      case ACTION_TYPES.SEND_NOTIFICATION:
        await executeSendNotification(action.config, context);
        actionResult.status = ACTION_STATUS.COMPLETED;
        break;

      case ACTION_TYPES.UPDATE_STATUS:
        await executeUpdateStatus(action.config, context);
        actionResult.status = ACTION_STATUS.COMPLETED;
        break;

      case ACTION_TYPES.WEBHOOK:
        await executeWebhook(action.config, context);
        actionResult.status = ACTION_STATUS.COMPLETED;
        break;

      case ACTION_TYPES.DELAY:
        await executeDelay(action.config);
        actionResult.status = ACTION_STATUS.COMPLETED;
        break;

      case ACTION_TYPES.CONDITION:
        const conditionResult = await evaluateCondition(action.config, context);
        actionResult.status = ACTION_STATUS.COMPLETED;
        actionResult.result = conditionResult;
        break;

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  } catch (error) {
    actionResult.status = ACTION_STATUS.FAILED;
    actionResult.error = error.message;
    console.error(`[WorkflowEngine] Action failed: ${action.type}`, error);
  }

  actionResult.completedAt = new Date();
  return actionResult;
};

// ==================== ACTION EXECUTORS ====================

/**
 * Execute send email action
 * @param {Object} config - Action configuration
 * @param {Object} context - Execution context
 */
const executeSendEmail = async (config, context) => {
  const { template, subject, to } = config;
  
  // Resolve recipient
  const recipientEmail = to || context.user?.email;
  if (!recipientEmail) {
    throw new Error('No recipient email found');
  }

  // Get email template
  const emailTemplate = await EmailTemplate.findOne({ code: template });
  if (!emailTemplate) {
    throw new Error(`Email template not found: ${template}`);
  }

  // Send email
  await sendEmail({
    to: recipientEmail,
    subject: subject || emailTemplate.subject,
    html: emailTemplate.body,
    variables: context,
  });
};

/**
 * Execute send WhatsApp action
 * @param {Object} config - Action configuration
 * @param {Object} context - Execution context
 */
const executeSendWhatsApp = async (config, context) => {
  const { template, to } = config;
  
  // Resolve recipient
  const recipientPhone = to || context.user?.phone;
  if (!recipientPhone) {
    throw new Error('No recipient phone found');
  }

  // Get WhatsApp template
  const waTemplate = await WhatsAppTemplate.findOne({ code: template });
  if (!waTemplate) {
    throw new Error(`WhatsApp template not found: ${template}`);
  }

  // Send message
  await sendTemplateMessage({
    phone: recipientPhone,
    template: waTemplate,
    variables: context,
  });
};

/**
 * Execute send notification action
 * @param {Object} config - Action configuration
 * @param {Object} context - Execution context
 */
const executeSendNotification = async (config, context) => {
  const { type, title, message, to } = config;
  
  // Resolve recipient
  const recipientId = to || context.user?._id;
  if (!recipientId) {
    throw new Error('No recipient found');
  }

  // Send notification
  await sendAppNotification({
    userId: recipientId,
    type: type || 'workflow',
    title,
    message,
    data: context,
  });
};

/**
 * Execute update status action
 * @param {Object} config - Action configuration
 * @param {Object} context - Execution context
 */
const executeUpdateStatus = async (config, context) => {
  const { entityType, entityId, status, field } = config;
  
  let entity;
  switch (entityType) {
    case ENTITY_TYPES.REFERRAL:
      entity = await Referral.findById(entityId || context.referral?._id);
      break;
    case ENTITY_TYPES.APPLICATION:
      entity = await Application.findById(entityId || context.application?._id);
      break;
    case ENTITY_TYPES.JOB:
      entity = await Job.findById(entityId || context.job?._id);
      break;
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }

  if (!entity) {
    throw new Error(`Entity not found: ${entityType}`);
  }

  if (field) {
    entity[field] = status;
  } else {
    entity.status = status;
  }
  
  await entity.save();
};

/**
 * Execute webhook action
 * @param {Object} config - Action configuration
 * @param {Object} context - Execution context
 */
const executeWebhook = async (config, context) => {
  const { url, method, headers, payload } = config;
  
  await axios({
    url,
    method: method || 'POST',
    headers: headers || {},
    data: payload || context,
  });
};

/**
 * Execute delay action
 * @param {Object} config - Action configuration
 */
const executeDelay = async (config) => {
  const { hours, days, minutes } = config;
  const delayMs = (days || 0) * 24 * 60 * 60 * 1000 + 
                  (hours || 0) * 60 * 60 * 1000 + 
                  (minutes || 0) * 60 * 1000;
  
  await new Promise(resolve => setTimeout(resolve, delayMs));
};

// ==================== CONDITION EVALUATION ====================

/**
 * Evaluate trigger conditions
 * @param {Object} trigger - Trigger configuration
 * @param {Object} context - Execution context
 * @returns {Promise<boolean>} Whether conditions are met
 */
const evaluateTriggerConditions = async (trigger, context) => {
  // For now, always trigger. Can be extended with complex conditions
  return true;
};

/**
 * Evaluate a condition
 * @param {Object} config - Condition configuration
 * @param {Object} context - Execution context
 * @returns {Promise<boolean>} Evaluation result
 */
const evaluateCondition = async (config, context) => {
  const { field, operator, value } = config;
  
  // Resolve field value from context
  const fieldValue = resolveField(field, context);
  
  switch (operator) {
    case CONDITION_OPERATORS.EQUALS:
      return fieldValue === value;
    case CONDITION_OPERATORS.NOT_EQUALS:
      return fieldValue !== value;
    case CONDITION_OPERATORS.GREATER_THAN:
      return fieldValue > value;
    case CONDITION_OPERATORS.LESS_THAN:
      return fieldValue < value;
    case CONDITION_OPERATORS.GREATER_THAN_OR_EQUAL:
      return fieldValue >= value;
    case CONDITION_OPERATORS.LESS_THAN_OR_EQUAL:
      return fieldValue <= value;
    case CONDITION_OPERATORS.CONTAINS:
      return String(fieldValue).includes(value);
    default:
      throw new Error(`Unknown operator: ${operator}`);
  }
};

/**
 * Resolve a field value from context
 * @param {string} field - Field path (e.g., 'user.name')
 * @param {Object} context - Execution context
 * @returns {any} Field value
 */
const resolveField = (field, context) => {
  const parts = field.split('.');
  let value = context;
  
  for (const part of parts) {
    value = value?.[part];
  }
  
  return value;
};

/**
 * Calculate schedule time for an action
 * @param {Object} action - Action configuration
 * @returns {Date} Scheduled time
 */
const calculateScheduleTime = (action) => {
  const now = new Date();
  
  if (action.type === ACTION_TYPES.DELAY) {
    const { hours, days, minutes } = action.config;
    const delayMs = (days || 0) * 24 * 60 * 60 * 1000 + 
                    (hours || 0) * 60 * 60 * 1000 + 
                    (minutes || 0) * 60 * 1000;
    return new Date(now.getTime() + delayMs);
  }
  
  return now;
};

// ==================== PREDEFINED WORKFLOW INITIALIZATION ====================

/**
 * Initialize predefined workflows in the database
 * Creates workflows if they don't exist
 */
const initializePredefinedWorkflows = async () => {
  try {
    for (const [key, config] of Object.entries(PREDEFINED_WORKFLOWS)) {
      const existing = await Workflow.findOne({ name: config.name });
      
      if (!existing) {
        await Workflow.create({
          ...config,
          isPredefined: true,
          predefinedKey: key,
          status: WORKFLOW_STATUS.ACTIVE,
        });
        console.log(`[WorkflowEngine] Created predefined workflow: ${config.name}`);
      }
    }
  } catch (error) {
    console.error('[WorkflowEngine] Error initializing predefined workflows:', error);
  }
};

// ==================== EXPORTS ====================

module.exports = {
  triggerWorkflow,
  executeWorkflow,
  initializePredefinedWorkflows,
  PREDEFINED_WORKFLOWS,
};
