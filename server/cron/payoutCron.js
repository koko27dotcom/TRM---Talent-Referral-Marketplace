/**
 * Payout Cron Job
 * Automated payout processing with scheduling and retry logic
 * Runs daily for scheduled payouts, hourly for retry attempts
 * Part of the Automated Payout Processing System for TRM platform
 */

const cron = require('node-cron');
const payoutProcessor = require('../services/payoutProcessor.js');
const PayoutBatch = require('../models/PayoutBatch.js');
const PayoutTransaction = require('../models/PayoutTransaction.js');

// Active cron job storage
let dailyPayoutJob = null;
let hourlyRetryJob = null;
let hourlyBatchJob = null;

/**
 * Initialize payout processing cron jobs
 */
const initializePayoutCron = () => {
  // Initialize payout processor
  payoutProcessor.initialize().catch(error => {
    console.error('[PayoutCron] Failed to initialize payout processor:', error);
  });

  // Daily scheduled payouts - runs at 9:00 AM every day
  dailyPayoutJob = cron.schedule('0 9 * * *', async () => {
    console.log('[PayoutCron] Starting daily scheduled payout processing...');
    await processDailyPayouts();
  }, {
    scheduled: true,
    timezone: 'Asia/Yangon',
  });

  // Hourly retry attempts - runs every hour
  hourlyRetryJob = cron.schedule('0 * * * *', async () => {
    console.log('[PayoutCron] Processing retry attempts...');
    await processRetryAttempts();
  }, {
    scheduled: true,
    timezone: 'Asia/Yangon',
  });

  // Hourly batch processing - runs every hour at 30 minutes
  hourlyBatchJob = cron.schedule('30 * * * *', async () => {
    console.log('[PayoutCron] Processing scheduled batches...');
    await processScheduledBatches();
  }, {
    scheduled: true,
    timezone: 'Asia/Yangon',
  });

  console.log('[PayoutCron] Payout processing cron jobs initialized');
  console.log('[PayoutCron] - Daily payouts: 9:00 AM Asia/Yangon');
  console.log('[PayoutCron] - Retry attempts: Every hour');
  console.log('[PayoutCron] - Batch processing: Every hour at :30');
};

/**
 * Stop payout cron jobs
 */
const stopPayoutCron = () => {
  if (dailyPayoutJob) {
    dailyPayoutJob.stop();
    console.log('[PayoutCron] Daily payout job stopped');
  }
  if (hourlyRetryJob) {
    hourlyRetryJob.stop();
    console.log('[PayoutCron] Hourly retry job stopped');
  }
  if (hourlyBatchJob) {
    hourlyBatchJob.stop();
    console.log('[PayoutCron] Hourly batch job stopped');
  }
};

/**
 * Process daily scheduled payouts
 * Creates batches for approved payouts and processes them
 */
async function processDailyPayouts() {
  try {
    console.log('[PayoutCron] Creating daily payout batch...');

    // Create batch for approved payouts
    const result = await payoutProcessor.createScheduledBatch({
      type: 'daily',
      notes: 'Automated daily payout batch',
    });

    if (result.batch) {
      console.log(`[PayoutCron] Created batch ${result.batch.batchNumber} with ${result.count} payouts`);

      // Process the batch immediately
      const processResult = await payoutProcessor.processBatch(result.batch._id);

      console.log(`[PayoutCron] Batch processing complete:`, {
        batchNumber: result.batch.batchNumber,
        total: processResult.summary?.total || 0,
        success: processResult.summary?.success || 0,
        failed: processResult.summary?.failed || 0,
      });
    } else {
      console.log('[PayoutCron] No payouts ready for daily processing');
    }
  } catch (error) {
    console.error('[PayoutCron] Daily payout processing error:', error);
  }
}

/**
 * Process retry attempts for failed transactions
 * Uses exponential backoff (1hr, 4hr, 12hr delays)
 */
async function processRetryAttempts() {
  try {
    const result = await payoutProcessor.retryFailedTransactions();

    if (result.retried > 0) {
      console.log(`[PayoutCron] Retried ${result.retried} failed transactions`);

      // Log results
      const successful = result.results.filter(r => r.success).length;
      const failed = result.results.filter(r => !r.success).length;

      console.log(`[PayoutCron] Retry results: ${successful} successful, ${failed} failed`);
    }
  } catch (error) {
    console.error('[PayoutCron] Retry processing error:', error);
  }
}

/**
 * Process scheduled batches
 * Processes batches that are ready for processing
 */
async function processScheduledBatches() {
  try {
    const result = await payoutProcessor.processScheduledBatches();

    if (result.processed > 0) {
      console.log(`[PayoutCron] Processed ${result.processed} scheduled batches`);

      // Log individual batch results
      result.results.forEach(batchResult => {
        console.log(`[PayoutCron] Batch ${batchResult.batchNumber}:`, {
          success: batchResult.success,
          total: batchResult.summary?.total || 0,
          successCount: batchResult.summary?.success || 0,
          failedCount: batchResult.summary?.failed || 0,
        });
      });
    }
  } catch (error) {
    console.error('[PayoutCron] Batch processing error:', error);
  }
}

/**
 * Create weekly payout batch manually
 * Can be called from admin interface
 * @param {Object} options - Batch options
 * @returns {Promise<Object>}
 */
const createWeeklyBatch = async (options = {}) => {
  try {
    const result = await payoutProcessor.createScheduledBatch({
      type: 'weekly',
      ...options,
      notes: options.notes || 'Weekly payout batch',
    });

    console.log(`[PayoutCron] Created weekly batch ${result.batch?.batchNumber || 'N/A'}`);
    return result;
  } catch (error) {
    console.error('[PayoutCron] Create weekly batch error:', error);
    throw error;
  }
};

/**
 * Create monthly payout batch manually
 * Can be called from admin interface
 * @param {Object} options - Batch options
 * @returns {Promise<Object>}
 */
const createMonthlyBatch = async (options = {}) => {
  try {
    const result = await payoutProcessor.createScheduledBatch({
      type: 'monthly',
      ...options,
      notes: options.notes || 'Monthly payout batch',
    });

    console.log(`[PayoutCron] Created monthly batch ${result.batch?.batchNumber || 'N/A'}`);
    return result;
  } catch (error) {
    console.error('[PayoutCron] Create monthly batch error:', error);
    throw error;
  }
};

/**
 * Process a specific batch immediately
 * Can be called from admin interface
 * @param {string} batchId - Batch ID
 * @returns {Promise<Object>}
 */
const processBatchImmediate = async (batchId) => {
  try {
    console.log(`[PayoutCron] Processing batch ${batchId} immediately...`);
    const result = await payoutProcessor.processBatch(batchId);
    console.log(`[PayoutCron] Batch ${batchId} processed:`, result.summary);
    return result;
  } catch (error) {
    console.error(`[PayoutCron] Process batch ${batchId} error:`, error);
    throw error;
  }
};

/**
 * Retry a specific transaction immediately
 * Can be called from admin interface
 * @param {string} transactionId - Transaction ID
 * @returns {Promise<Object>}
 */
const retryTransactionImmediate = async (transactionId) => {
  try {
    console.log(`[PayoutCron] Retrying transaction ${transactionId}...`);
    const result = await payoutProcessor.retryTransaction(transactionId);
    console.log(`[PayoutCron] Transaction ${transactionId} retry:`, result.success ? 'success' : 'failed');
    return result;
  } catch (error) {
    console.error(`[PayoutCron] Retry transaction ${transactionId} error:`, error);
    throw error;
  }
};

/**
 * Get payout queue status
 * Returns current status of payout processing queue
 * @returns {Promise<Object>}
 */
const getPayoutQueueStatus = async () => {
  try {
    const [
      pendingBatches,
      processingBatches,
      pendingTransactions,
      failedTransactions,
      readyForRetry,
    ] = await Promise.all([
      PayoutBatch.countDocuments({ status: 'pending' }),
      PayoutBatch.countDocuments({ status: 'processing' }),
      PayoutTransaction.countDocuments({ status: 'pending' }),
      PayoutTransaction.countDocuments({ status: 'failed' }),
      PayoutTransaction.countDocuments({
        status: 'failed',
        retryCount: { $lt: 3 },
        nextRetryAt: { $lte: new Date() },
      }),
    ]);

    return {
      success: true,
      queue: {
        pendingBatches,
        processingBatches,
        pendingTransactions,
        failedTransactions,
        readyForRetry,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[PayoutCron] Get queue status error:', error);
    throw error;
  }
};

/**
 * Get next scheduled run times
 * @returns {Object}
 */
const getScheduleInfo = () => {
  const now = new Date();
  const timezone = 'Asia/Yangon';

  // Calculate next run times (simplified)
  const nextDaily = new Date(now);
  nextDaily.setHours(9, 0, 0, 0);
  if (nextDaily <= now) {
    nextDaily.setDate(nextDaily.getDate() + 1);
  }

  const nextHourly = new Date(now);
  nextHourly.setHours(nextHourly.getHours() + 1, 0, 0, 0);

  const nextBatch = new Date(now);
  nextBatch.setHours(nextBatch.getHours() + 1, 30, 0, 0);
  if (nextBatch <= now) {
    nextBatch.setHours(nextBatch.getHours() + 1);
  }

  return {
    dailyPayouts: {
      schedule: '0 9 * * *',
      nextRun: nextDaily.toISOString(),
      timezone,
    },
    retryAttempts: {
      schedule: '0 * * * *',
      nextRun: nextHourly.toISOString(),
      timezone,
    },
    batchProcessing: {
      schedule: '30 * * * *',
      nextRun: nextBatch.toISOString(),
      timezone,
    },
  };
};

module.exports = {
  initializePayoutCron,
  stopPayoutCron,
  createWeeklyBatch,
  createMonthlyBatch,
  processBatchImmediate,
  retryTransactionImmediate,
  getPayoutQueueStatus,
  getScheduleInfo,
};
