/**
 * Revenue Cron Job
 * Scheduled execution of revenue analytics calculations
 * Runs daily for snapshots, weekly for reports, and updates MRR
 * Part of the Revenue Analytics Dashboard for TRM platform
 */

const cron = require('node-cron');
const { revenueCalculator } = require('../services/revenueCalculator.js');
const RevenueAnalytics = require('../models/RevenueAnalytics.js');

// Active cron job storage
let dailyRevenueJob = null;
let weeklyReportJob = null;
let mrrUpdateJob = null;

/**
 * Initialize revenue analytics cron jobs
 */
const initializeRevenueCron = () => {
  // Daily revenue calculation - runs at 1:00 AM every day
  dailyRevenueJob = cron.schedule('0 1 * * *', async () => {
    console.log('[RevenueCron] Starting daily revenue calculation...');
    await calculateDailyRevenue();
  }, {
    scheduled: true,
    timezone: 'Asia/Yangon',
  });

  // Weekly report generation - runs at 2:00 AM every Monday
  weeklyReportJob = cron.schedule('0 2 * * 1', async () => {
    console.log('[RevenueCron] Starting weekly report generation...');
    await generateWeeklyReport();
  }, {
    scheduled: true,
    timezone: 'Asia/Yangon',
  });

  // MRR update - runs at 3:00 AM on the 1st of every month
  mrrUpdateJob = cron.schedule('0 3 1 * *', async () => {
    console.log('[RevenueCron] Starting monthly MRR update...');
    await updateMonthlyMRR();
  }, {
    scheduled: true,
    timezone: 'Asia/Yangon',
  });

  console.log('[RevenueCron] Revenue analytics cron jobs initialized');
  console.log('[RevenueCron] - Daily snapshots: 1:00 AM');
  console.log('[RevenueCron] - Weekly reports: Monday 2:00 AM');
  console.log('[RevenueCron] - Monthly MRR: 1st of month 3:00 AM');
};

/**
 * Stop revenue analytics cron jobs
 */
const stopRevenueCron = () => {
  if (dailyRevenueJob) {
    dailyRevenueJob.stop();
    console.log('[RevenueCron] Daily revenue job stopped');
  }
  if (weeklyReportJob) {
    weeklyReportJob.stop();
    console.log('[RevenueCron] Weekly report job stopped');
  }
  if (mrrUpdateJob) {
    mrrUpdateJob.stop();
    console.log('[RevenueCron] MRR update job stopped');
  }
};

/**
 * Calculate daily revenue snapshot
 * Creates a comprehensive analytics snapshot for the previous day
 */
const calculateDailyRevenue = async () => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    console.log(`[RevenueCron] Calculating daily revenue for ${yesterday.toISOString().split('T')[0]}...`);

    // Check if snapshot already exists
    const existingSnapshot = await RevenueAnalytics.findOne({
      period: 'daily',
      date: {
        $gte: yesterday,
        $lt: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000),
      },
    });

    if (existingSnapshot) {
      console.log('[RevenueCron] Daily snapshot already exists, skipping...');
      return existingSnapshot;
    }

    // Generate new snapshot
    const snapshot = await revenueCalculator.generateSnapshot('daily', yesterday);
    
    console.log(`[RevenueCron] Daily revenue calculated: ${snapshot.totalRevenue} MMK`);
    console.log(`[RevenueCron] MRR: ${snapshot.mrr} MMK`);
    console.log(`[RevenueCron] Active subscriptions: ${snapshot.subscriptionMetrics?.activeSubscriptions || 0}`);

    return snapshot;
  } catch (error) {
    console.error('[RevenueCron] Error calculating daily revenue:', error);
    throw error;
  }
};

/**
 * Generate weekly revenue report
 * Creates a comprehensive weekly analytics snapshot
 */
const generateWeeklyReport = async () => {
  try {
    // Get the previous week
    const now = new Date();
    const lastWeek = new Date(now);
    lastWeek.setDate(now.getDate() - 7);
    
    // Find the start of the previous week (Sunday)
    const dayOfWeek = lastWeek.getDay();
    const weekStart = new Date(lastWeek);
    weekStart.setDate(lastWeek.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);

    console.log(`[RevenueCron] Generating weekly report for week starting ${weekStart.toISOString().split('T')[0]}...`);

    // Check if weekly snapshot already exists
    const existingSnapshot = await RevenueAnalytics.findOne({
      period: 'weekly',
      periodStart: weekStart,
    });

    if (existingSnapshot) {
      console.log('[RevenueCron] Weekly snapshot already exists, updating...');
    }

    // Generate weekly snapshot
    const snapshot = await revenueCalculator.generateSnapshot('weekly', weekStart);

    console.log(`[RevenueCron] Weekly report generated: ${snapshot.totalRevenue} MMK`);
    console.log(`[RevenueCron] Week-over-week growth: ${snapshot.revenueGrowthPercentage.toFixed(2)}%`);

    return snapshot;
  } catch (error) {
    console.error('[RevenueCron] Error generating weekly report:', error);
    throw error;
  }
};

/**
 * Update monthly MRR
 * Creates a comprehensive monthly analytics snapshot
 */
const updateMonthlyMRR = async () => {
  try {
    // Get the previous month
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    console.log(`[RevenueCron] Updating MRR for ${lastMonth.toISOString().slice(0, 7)}...`);

    // Check if monthly snapshot already exists
    const existingSnapshot = await RevenueAnalytics.findOne({
      period: 'monthly',
      date: {
        $gte: lastMonth,
        $lt: new Date(now.getFullYear(), now.getMonth(), 1),
      },
    });

    if (existingSnapshot) {
      console.log('[RevenueCron] Monthly snapshot already exists, updating...');
    }

    // Generate monthly snapshot with cohort analysis
    const snapshot = await revenueCalculator.generateSnapshot('monthly', lastMonth);

    // Mark as final
    snapshot.isFinal = true;
    await snapshot.save();

    console.log(`[RevenueCron] Monthly MRR updated: ${snapshot.mrr} MMK`);
    console.log(`[RevenueCron] ARR: ${snapshot.arr} MMK`);
    console.log(`[RevenueCron] Month-over-month growth: ${snapshot.revenueGrowthPercentage.toFixed(2)}%`);
    console.log(`[RevenueCron] Churn rate: ${snapshot.subscriptionMetrics?.churnRate?.toFixed(2) || 0}%`);

    return snapshot;
  } catch (error) {
    console.error('[RevenueCron] Error updating monthly MRR:', error);
    throw error;
  }
};

/**
 * Manually trigger revenue calculation for a specific date
 * @param {String} period - 'daily', 'weekly', 'monthly'
 * @param {Date} date - The date to calculate for
 */
const triggerRevenueCalculation = async (period = 'daily', date = new Date()) => {
  try {
    console.log(`[RevenueCron] Manually triggering ${period} revenue calculation for ${date.toISOString()}...`);
    
    const snapshot = await revenueCalculator.generateSnapshot(period, date);
    
    console.log(`[RevenueCron] Manual calculation complete: ${snapshot.totalRevenue} MMK`);
    
    return snapshot;
  } catch (error) {
    console.error('[RevenueCron] Error in manual revenue calculation:', error);
    throw error;
  }
};

/**
 * Get cron job status
 * @returns {Object} Status of all cron jobs
 */
const getRevenueCronStatus = () => {
  return {
    dailyRevenueJob: dailyRevenueJob ? 'running' : 'stopped',
    weeklyReportJob: weeklyReportJob ? 'running' : 'stopped',
    mrrUpdateJob: mrrUpdateJob ? 'running' : 'stopped',
    lastCheck: new Date().toISOString(),
  };
};

/**
 * Backfill missing snapshots
 * Generates snapshots for dates that don't have them
 * @param {String} period - 'daily', 'weekly', 'monthly'
 * @param {Date} startDate - Start date for backfill
 * @param {Date} endDate - End date for backfill
 */
const backfillSnapshots = async (period = 'daily', startDate, endDate = new Date()) => {
  try {
    console.log(`[RevenueCron] Backfilling ${period} snapshots from ${startDate.toISOString()} to ${endDate.toISOString()}...`);
    
    const snapshots = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      // Check if snapshot exists
      const { startDate: periodStart, endDate: periodEnd } = revenueCalculator.getPeriodRange(period, currentDate);
      
      const existing = await RevenueAnalytics.findOne({
        period,
        periodStart,
      });

      if (!existing) {
        try {
          const snapshot = await revenueCalculator.generateSnapshot(period, currentDate);
          snapshots.push(snapshot);
          console.log(`[RevenueCron] Generated ${period} snapshot for ${periodStart.toISOString().split('T')[0]}`);
        } catch (err) {
          console.error(`[RevenueCron] Error generating snapshot for ${periodStart.toISOString()}:`, err.message);
        }
      }

      // Move to next period
      switch (period) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        default:
          currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    console.log(`[RevenueCron] Backfill complete. Generated ${snapshots.length} snapshots.`);
    return snapshots;
  } catch (error) {
    console.error('[RevenueCron] Error in backfill:', error);
    throw error;
  }
};

module.exports = {
  initializeRevenueCron,
  stopRevenueCron,
  calculateDailyRevenue,
  generateWeeklyReport,
  updateMonthlyMRR,
  triggerRevenueCalculation,
  getRevenueCronStatus,
  backfillSnapshots,
};
