/**
 * Leaderboard Cron Jobs
 * Scheduled tasks for updating leaderboards and managing gamification
 */

const cron = require('node-cron');
const leaderboardService = require('../services/leaderboardService.js');
const challengeEngine = require('../services/challengeEngine.js');
const gamificationService = require('../services/gamificationService.js');
const badgeService = require('../services/badgeService.js');
const achievementService = require('../services/achievementService.js');

class LeaderboardCron {
  constructor() {
    this.jobs = [];
  }

  /**
   * Initialize all cron jobs
   */
  init() {
    // Update weekly leaderboards every Monday at 00:00
    this.schedule('0 0 * * 1', this.updateWeeklyLeaderboards.bind(this), 'Weekly Leaderboard Update');
    
    // Update monthly leaderboards on the 1st of every month at 00:00
    this.schedule('0 0 1 * *', this.updateMonthlyLeaderboards.bind(this), 'Monthly Leaderboard Update');
    
    // Update all-time leaderboards daily at 01:00
    this.schedule('0 1 * * *', this.updateAllTimeLeaderboards.bind(this), 'All-Time Leaderboard Update');
    
    // Create daily challenges every day at 00:00
    this.schedule('0 0 * * *', this.createDailyChallenges.bind(this), 'Daily Challenge Creation');
    
    // Create weekly challenges every Monday at 00:05
    this.schedule('5 0 * * 1', this.createWeeklyChallenges.bind(this), 'Weekly Challenge Creation');
    
    // Clean up expired challenges daily at 02:00
    this.schedule('0 2 * * *', this.cleanupExpiredChallenges.bind(this), 'Challenge Cleanup');
    
    // Archive old leaderboard entries monthly
    this.schedule('0 3 1 * *', this.archiveOldLeaderboards.bind(this), 'Leaderboard Archive');
    
    // Initialize gamification data on startup (once)
    this.initializeGamification();
    
    console.log('Leaderboard cron jobs initialized');
  }

  /**
   * Schedule a cron job
   */
  schedule(cronExpression, task, name) {
    const job = cron.schedule(cronExpression, async () => {
      console.log(`[${new Date().toISOString()}] Running: ${name}`);
      try {
        await task();
        console.log(`[${new Date().toISOString()}] Completed: ${name}`);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in ${name}:`, error);
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Yangon', // Myanmar timezone
    });
    
    this.jobs.push({ name, job });
  }

  /**
   * Update weekly leaderboards
   */
  async updateWeeklyLeaderboards() {
    const categories = ['referrer', 'hiring', 'network', 'earnings', 'streak'];
    
    for (const category of categories) {
      await leaderboardService.updateRankings('weekly', category);
    }
    
    console.log('Weekly leaderboards updated');
  }

  /**
   * Update monthly leaderboards
   */
  async updateMonthlyLeaderboards() {
    const categories = ['referrer', 'hiring', 'network', 'earnings', 'streak'];
    
    for (const category of categories) {
      await leaderboardService.updateRankings('monthly', category);
    }
    
    console.log('Monthly leaderboards updated');
  }

  /**
   * Update all-time leaderboards
   */
  async updateAllTimeLeaderboards() {
    const categories = ['referrer', 'hiring', 'network', 'earnings', 'streak'];
    
    for (const category of categories) {
      await leaderboardService.updateRankings('all-time', category);
    }
    
    console.log('All-time leaderboards updated');
  }

  /**
   * Create daily challenges
   */
  async createDailyChallenges() {
    const challenges = await challengeEngine.createDailyChallenges();
    console.log(`Created ${challenges.length} daily challenges`);
  }

  /**
   * Create weekly challenges
   */
  async createWeeklyChallenges() {
    const challenges = await challengeEngine.createWeeklyChallenges();
    console.log(`Created ${challenges.length} weekly challenges`);
  }

  /**
   * Clean up expired challenges
   */
  async cleanupExpiredChallenges() {
    const deactivated = await challengeEngine.cleanupExpired();
    console.log(`Deactivated ${deactivated} expired challenges`);
  }

  /**
   * Archive old leaderboard entries
   */
  async archiveOldLeaderboards() {
    const result = await leaderboardService.archiveOldLeaderboards(90);
    console.log(`Archived ${result.archived} old leaderboard entries`);
  }

  /**
   * Initialize gamification data
   */
  async initializeGamification() {
    try {
      console.log('Initializing gamification data...');
      
      // Initialize badges
      await badgeService.initializeBadges();
      
      // Initialize achievements
      await achievementService.initializeAchievements();
      
      // Initialize challenges
      await challengeEngine.initialize();
      
      console.log('Gamification data initialized');
    } catch (error) {
      console.error('Error initializing gamification data:', error);
    }
  }

  /**
   * Stop all cron jobs
   */
  stop() {
    this.jobs.forEach(({ name, job }) => {
      job.stop();
      console.log(`Stopped cron job: ${name}`);
    });
    this.jobs = [];
  }

  /**
   * Get job status
   */
  getStatus() {
    return this.jobs.map(({ name }) => ({
      name,
      running: true,
    }));
  }
}

// Export singleton instance
const leaderboardCron = new LeaderboardCron();
module.exports = leaderboardCron;
