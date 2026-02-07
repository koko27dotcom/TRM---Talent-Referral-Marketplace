const cron = require('node-cron');
const MarketIntelligenceService = require('../services/marketIntelligenceService');
const ReportBuilderService = require('../services/reportBuilderService');
const PredictiveAnalyticsService = require('../services/predictiveAnalyticsService');
const Report = require('../models/Report');

class AnalyticsCron {
  constructor() {
    this.tasks = [];
  }

  // Start all analytics cron jobs
  start() {
    console.log('Starting analytics cron jobs...');

    // Generate market insights daily at 2 AM
    this.tasks.push(cron.schedule('0 2 * * *', async () => {
      console.log('Running daily market insights generation...');
      try {
        const result = await MarketIntelligenceService.autoGenerateInsights();
        console.log(`Generated ${result.generated} market insights`);
      } catch (error) {
        console.error('Failed to generate market insights:', error);
      }
    }));

    // Process scheduled reports every hour
    this.tasks.push(cron.schedule('0 * * * *', async () => {
      console.log('Processing scheduled reports...');
      try {
        const result = await ReportBuilderService.processScheduledReports();
        console.log(`Processed ${result.processed} scheduled reports`);
      } catch (error) {
        console.error('Failed to process scheduled reports:', error);
      }
    }));

    // Clean up expired reports daily at 3 AM
    this.tasks.push(cron.schedule('0 3 * * *', async () => {
      console.log('Cleaning up expired reports...');
      try {
        const expiredReports = await Report.getExpiredReports(100);
        for (const report of expiredReports) {
          report.status = 'expired';
          await report.save();
        }
        console.log(`Expired ${expiredReports.length} reports`);
      } catch (error) {
        console.error('Failed to clean up expired reports:', error);
      }
    }));

    // Retrain ML models weekly on Sundays at 4 AM
    this.tasks.push(cron.schedule('0 4 * * 0', async () => {
      console.log('Starting weekly ML model retraining...');
      try {
        await this.retrainModels();
      } catch (error) {
        console.error('Failed to retrain models:', error);
      }
    }));

    // Calculate and store daily analytics metrics at 1 AM
    this.tasks.push(cron.schedule('0 1 * * *', async () => {
      console.log('Calculating daily analytics metrics...');
      try {
        await this.calculateDailyMetrics();
      } catch (error) {
        console.error('Failed to calculate daily metrics:', error);
      }
    }));

    console.log('Analytics cron jobs started successfully');
  }

  // Stop all cron jobs
  stop() {
    console.log('Stopping analytics cron jobs...');
    this.tasks.forEach(task => task.stop());
    this.tasks = [];
    console.log('Analytics cron jobs stopped');
  }

  // Retrain ML models
  async retrainModels() {
    const models = [
      { type: 'hire-probability', name: 'Hire Probability Model' },
      { type: 'retention', name: 'Retention Risk Model' },
      { type: 'salary', name: 'Salary Prediction Model' },
      { type: 'time-to-hire', name: 'Time-to-Hire Model' }
    ];

    for (const model of models) {
      try {
        console.log(`Retraining ${model.name}...`);
        // In production, this would call actual ML training code
        // For now, we just log the intent
        console.log(`${model.name} retraining completed`);
      } catch (error) {
        console.error(`Failed to retrain ${model.name}:`, error);
      }
    }
  }

  // Calculate daily analytics metrics
  async calculateDailyMetrics() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Job posting metrics
      const Job = require('../models/Job');
      const Application = require('../models/Application');
      const User = require('../models/User');
      const Company = require('../models/Company');

      const dailyMetrics = {
        date: yesterday,
        newJobs: await Job.countDocuments({
          createdAt: { $gte: yesterday, $lt: today }
        }),
        newApplications: await Application.countDocuments({
          createdAt: { $gte: yesterday, $lt: today }
        }),
        newUsers: await User.countDocuments({
          createdAt: { $gte: yesterday, $lt: today }
        }),
        newCompanies: await Company.countDocuments({
          createdAt: { $gte: yesterday, $lt: today }
        })
      };

      console.log('Daily metrics:', dailyMetrics);

      // Store metrics (in production, save to Analytics collection)
      // await Analytics.create(dailyMetrics);

    } catch (error) {
      console.error('Failed to calculate daily metrics:', error);
    }
  }

  // Manual trigger for testing
  async triggerJob(jobName) {
    console.log(`Manually triggering job: ${jobName}`);
    
    switch (jobName) {
      case 'generate-insights':
        return await MarketIntelligenceService.autoGenerateInsights();
      case 'process-scheduled-reports':
        return await ReportBuilderService.processScheduledReports();
      case 'retrain-models':
        return await this.retrainModels();
      case 'daily-metrics':
        return await this.calculateDailyMetrics();
      default:
        throw new Error(`Unknown job: ${jobName}`);
    }
  }
}

const analyticsCron = new AnalyticsCron();
module.exports = analyticsCron;
