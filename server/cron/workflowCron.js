/**
 * Workflow Cron Job
 * Scheduled execution of pending workflow executions
 * Runs every hour to check and execute scheduled workflows
 * Part of the Auto-Followup Workflow Engine for TRM platform
 */

const cron = require('node-cron');
const WorkflowExecution = require('../models/WorkflowExecution.js');
const { EXECUTION_STATUS } = require('../models/WorkflowExecution.js');
const Workflow = require('../models/Workflow.js');
const { WORKFLOW_STATUS, TRIGGER_TYPES } = require('../models/Workflow.js');
const { 
  User, 
  Job, 
  Company, 
  Referral, 
  Application 
} = require('../models/index.js');
const { 
  triggerWorkflow, 
  executeWorkflow,
  initializePredefinedWorkflows 
} = require('../services/workflowEngine.js');

// Active cron job storage
let workflowCronJob = null;
let triggerCheckJob = null;

/**
 * Initialize workflow cron jobs
 */
const initializeWorkflowCron = () => {
  // Main job: Process pending executions every hour
  workflowCronJob = cron.schedule('0 * * * *', async () => {
    console.log('[WorkflowCron] Processing scheduled workflow executions...');
    await processScheduledExecutions();
  });

  // Trigger check job: Check for new triggers every 15 minutes
  triggerCheckJob = cron.schedule('*/15 * * * *', async () => {
    console.log('[WorkflowCron] Checking workflow triggers...');
    await checkWorkflowTriggers();
  });

  console.log('[WorkflowCron] Workflow cron jobs initialized');
};

/**
 * Stop workflow cron jobs
 */
const stopWorkflowCron = () => {
  if (workflowCronJob) {
    workflowCronJob.stop();
    console.log('[WorkflowCron] Main cron job stopped');
  }
  if (triggerCheckJob) {
    triggerCheckJob.stop();
    console.log('[WorkflowCron] Trigger check job stopped');
  }
};

/**
 * Process scheduled pending executions
 * Finds and executes workflows that are due
 */
const processScheduledExecutions = async () => {
  try {
    // Find pending executions that are scheduled to run now or in the past
    const now = new Date();
    const executions = await WorkflowExecution.findPending({
      scheduledBefore: now,
      limit: 100,
    });

    console.log(`[WorkflowCron] Found ${executions.length} pending executions`);

    for (const execution of executions) {
      try {
        console.log(`[WorkflowCron] Executing workflow: ${execution.workflowName} (${execution._id})`);
        await executeWorkflow(execution._id);
        console.log(`[WorkflowCron] Execution completed: ${execution._id}`);
      } catch (error) {
        console.error(`[WorkflowCron] Execution failed: ${execution._id}`, error);
        
        // Update retry information
        execution.retryConfig.retryCount += 1;
        if (execution.retryConfig.retryCount < execution.retryConfig.maxRetries) {
          execution.retryConfig.nextRetryAt = new Date(
            Date.now() + (execution.retryConfig.retryDelayMinutes * 60 * 1000)
          );
          execution.status = EXECUTION_STATUS.RETRYING;
          execution.scheduledAt = execution.retryConfig.nextRetryAt;
          execution.addLog('warn', `Execution failed, scheduling retry ${execution.retryConfig.retryCount}/${execution.retryConfig.maxRetries}`, 'workflow_cron');
        } else {
          execution.status = EXECUTION_STATUS.FAILED;
          execution.error = {
            message: error.message,
            code: error.code || 'EXECUTION_ERROR',
          };
          execution.addLog('error', `Execution failed after ${execution.retryConfig.maxRetries} retries`, 'workflow_cron');
        }
        await execution.save();
      }
    }

    return {
      processed: executions.length,
      timestamp: now,
    };
  } catch (error) {
    console.error('[WorkflowCron] Error processing scheduled executions:', error);
    throw error;
  }
};

/**
 * Check for workflow triggers
 * Automatically triggers workflows based on various conditions
 */
const checkWorkflowTriggers = async () => {
  try {
    const results = {
      candidateIncomplete: 0,
      companyNoReferrals: 0,
      referrerPending: 0,
      referrerInactive: 0,
    };

    // 1. Check for candidate incomplete applications
    results.candidateIncomplete = await checkCandidateIncompleteApplications();

    // 2. Check for companies with no referrals
    results.companyNoReferrals = await checkCompanyNoReferrals();

    // 3. Check for referrers with pending referrals
    results.referrerPending = await checkReferrerPendingReferrals();

    // 4. Check for inactive referrers
    results.referrerInactive = await checkInactiveReferrers();

    console.log('[WorkflowCron] Trigger check results:', results);

    return results;
  } catch (error) {
    console.error('[WorkflowCron] Error checking triggers:', error);
    throw error;
  }
};

/**
 * Check for incomplete applications and trigger workflow
 */
const checkCandidateIncompleteApplications = async () => {
  try {
    // Find applications that are incomplete and older than 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const incompleteApplications = await Application.find({
      status: 'started',
      createdAt: { 
        $lte: thirtyMinutesAgo,
        $gte: twentyFourHoursAgo, // Within last 24 hours
      },
      'customFields.incompleteWorkflowTriggered': { $ne: true },
    }).limit(50);

    let triggered = 0;

    for (const application of incompleteApplications) {
      try {
        // Check if already has a pending/completed execution for this workflow
        const existingExecution = await WorkflowExecution.findOne({
          'trigger.type': TRIGGER_TYPES.CANDIDATE_APPLIED_INCOMPLETE,
          entityType: 'application',
          entityId: application._id,
          status: { $in: [EXECUTION_STATUS.PENDING, EXECUTION_STATUS.RUNNING, EXECUTION_STATUS.COMPLETED] },
        });

        if (!existingExecution) {
          const result = await triggerWorkflow(
            TRIGGER_TYPES.CANDIDATE_APPLIED_INCOMPLETE,
            {
              entityType: 'application',
              entityId: application._id,
              inputData: { application },
            }
          );

          if (result.success) {
            triggered++;
            // Mark as triggered
            application.customFields = application.customFields || {};
            application.customFields.incompleteWorkflowTriggered = true;
            await application.save();
          }
        }
      } catch (error) {
        console.error(`[WorkflowCron] Error triggering incomplete workflow for application ${application._id}:`, error);
      }
    }

    return triggered;
  } catch (error) {
    console.error('[WorkflowCron] Error checking incomplete applications:', error);
    return 0;
  }
};

/**
 * Check for companies with no referrals and trigger workflow
 */
const checkCompanyNoReferrals = async () => {
  try {
    // Find jobs that are active, posted 3+ days ago, with no referrals
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const jobsWithNoReferrals = await Job.find({
      status: 'active',
      createdAt: { 
        $lte: threeDaysAgo,
        $gte: sevenDaysAgo,
      },
      referralCount: 0,
      'stats.noReferralWorkflowTriggered': { $ne: true },
    }).limit(30);

    let triggered = 0;

    for (const job of jobsWithNoReferrals) {
      try {
        // Check if already triggered
        const existingExecution = await WorkflowExecution.findOne({
          'trigger.type': TRIGGER_TYPES.COMPANY_NO_REFERRALS,
          entityType: 'job',
          entityId: job._id,
          status: { $in: [EXECUTION_STATUS.PENDING, EXECUTION_STATUS.RUNNING, EXECUTION_STATUS.COMPLETED] },
        });

        if (!existingExecution) {
          const result = await triggerWorkflow(
            TRIGGER_TYPES.COMPANY_NO_REFERRALS,
            {
              entityType: 'job',
              entityId: job._id,
              inputData: { job },
            }
          );

          if (result.success) {
            triggered++;
            // Mark as triggered
            job.stats = job.stats || {};
            job.stats.noReferralWorkflowTriggered = true;
            await job.save();
          }
        }
      } catch (error) {
        console.error(`[WorkflowCron] Error triggering no-referral workflow for job ${job._id}:`, error);
      }
    }

    return triggered;
  } catch (error) {
    console.error('[WorkflowCron] Error checking companies with no referrals:', error);
    return 0;
  }
};

/**
 * Check for referrers with pending referrals
 */
const checkReferrerPendingReferrals = async () => {
  try {
    // Find referrers with pending referrals
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const referrersWithPending = await Referral.aggregate([
      {
        $match: {
          status: { $in: ['submitted', 'under_review'] },
          updatedAt: { $lte: oneWeekAgo },
        },
      },
      {
        $group: {
          _id: '$referrerId',
          pendingCount: { $sum: 1 },
        },
      },
      {
        $match: {
          pendingCount: { $gte: 1 },
        },
      },
    ]);

    let triggered = 0;

    for (const referrer of referrersWithPending) {
      try {
        // Check if already triggered this week
        const existingExecution = await WorkflowExecution.findOne({
          'trigger.type': TRIGGER_TYPES.REFERRER_PENDING_REFERRALS,
          entityType: 'user',
          entityId: referrer._id,
          createdAt: { $gte: oneWeekAgo },
        });

        if (!existingExecution) {
          const result = await triggerWorkflow(
            TRIGGER_TYPES.REFERRER_PENDING_REFERRALS,
            {
              entityType: 'user',
              entityId: referrer._id,
              inputData: { pendingCount: referrer.pendingCount },
            }
          );

          if (result.success) {
            triggered++;
          }
        }
      } catch (error) {
        console.error(`[WorkflowCron] Error triggering pending referral workflow for referrer ${referrer._id}:`, error);
      }
    }

    return triggered;
  } catch (error) {
    console.error('[WorkflowCron] Error checking referrers with pending referrals:', error);
    return 0;
  }
};

/**
 * Check for inactive referrers
 */
const checkInactiveReferrers = async () => {
  try {
    // Find referrers inactive for 14+ days
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const inactiveReferrers = await User.find({
      role: 'referrer',
      lastActiveAt: { $lte: fourteenDaysAgo },
      'stats.reengagementWorkflowTriggered': { $ne: true },
    }).limit(50);

    let triggered = 0;

    for (const referrer of inactiveReferrers) {
      try {
        // Check if already triggered
        const existingExecution = await WorkflowExecution.findOne({
          'trigger.type': TRIGGER_TYPES.REFERRER_INACTIVE,
          entityType: 'user',
          entityId: referrer._id,
          status: { $in: [EXECUTION_STATUS.PENDING, EXECUTION_STATUS.RUNNING, EXECUTION_STATUS.COMPLETED] },
        });

        if (!existingExecution) {
          const result = await triggerWorkflow(
            TRIGGER_TYPES.REFERRER_INACTIVE,
            {
              entityType: 'user',
              entityId: referrer._id,
              inputData: { daysInactive: Math.floor((Date.now() - referrer.lastActiveAt.getTime()) / (24 * 60 * 60 * 1000)) },
            }
          );

          if (result.success) {
            triggered++;
            // Mark as triggered
            referrer.stats = referrer.stats || {};
            referrer.stats.reengagementWorkflowTriggered = true;
            await referrer.save();
          }
        }
      } catch (error) {
        console.error(`[WorkflowCron] Error triggering inactive workflow for referrer ${referrer._id}:`, error);
      }
    }

    return triggered;
  } catch (error) {
    console.error('[WorkflowCron] Error checking inactive referrers:', error);
    return 0;
  }
};

/**
 * Manual trigger function for testing/admin use
 */
const manualTriggerCheck = async () => {
  console.log('[WorkflowCron] Manual trigger check initiated');
  return await checkWorkflowTriggers();
};

/**
 * Get cron job status
 */
const getCronStatus = () => {
  return {
    mainJobRunning: workflowCronJob !== null,
    triggerCheckRunning: triggerCheckJob !== null,
    timestamp: new Date(),
  };
};

module.exports = {
  initializeWorkflowCron,
  stopWorkflowCron,
  processScheduledExecutions,
  checkWorkflowTriggers,
  manualTriggerCheck,
  getCronStatus,
};
