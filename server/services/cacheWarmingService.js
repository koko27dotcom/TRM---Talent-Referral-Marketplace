/**
 * Cache Warming Service
 * Proactively populates cache with frequently accessed data
 * Improves response times for hot data
 */

const jobCacheService = require('./jobCacheService.js');
const userCacheService = require('./userCacheService.js');
const referralCacheService = require('./referralCacheService.js');
const marketDataCacheService = require('./marketDataCacheService.js');
const enhancedCacheService = require('./enhancedCacheService.js');
const performanceConfig = require('../config/performance.js');

const { cache: config } = performanceConfig;

/**
 * Cache Warming Service
 */
class CacheWarmingService {
  constructor() {
    this.isRunning = false;
    this.warmingJobs = new Map();
    this.stats = {
      totalWarmed: 0,
      lastRun: null,
      runsCompleted: 0,
      errors: 0,
    };
  }
  
  /**
   * Initialize warming service
   */
  async initialize() {
    if (!config.warming.enabled) {
      console.log('[CacheWarmingService] Cache warming disabled');
      return;
    }
    
    console.log('[CacheWarmingService] Initialized');
    
    // Start scheduled warming
    this.startScheduledWarming();
  }
  
  /**
   * Start scheduled cache warming
   */
  startScheduledWarming() {
    setInterval(async () => {
      if (!this.isRunning) {
        await this.warmAll();
      }
    }, config.warming.intervalMs);
    
    console.log(`[CacheWarmingService] Scheduled warming every ${config.warming.intervalMs}ms`);
  }
  
  /**
   * Warm all cache types
   */
  async warmAll(options = {}) {
    if (this.isRunning) {
      console.log('[CacheWarmingService] Warming already in progress');
      return;
    }
    
    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      console.log('[CacheWarmingService] Starting cache warming...');
      
      const results = await Promise.allSettled([
        this.warmJobs(options.jobs),
        this.warmUsers(options.users),
        this.warmReferrals(options.referrals),
        this.warmMarketData(options.marketData),
        this.warmSessions(options.sessions),
      ]);
      
      const summary = {
        jobs: results[0].status === 'fulfilled' ? results[0].value : 0,
        users: results[1].status === 'fulfilled' ? results[1].value : 0,
        referrals: results[2].status === 'fulfilled' ? results[2].value : 0,
        marketData: results[3].status === 'fulfilled' ? results[3].value : 0,
        sessions: results[4].status === 'fulfilled' ? results[4].value : 0,
      };
      
      const totalWarmed = Object.values(summary).reduce((a, b) => a + b, 0);
      const duration = Date.now() - startTime;
      
      this.stats.totalWarmed += totalWarmed;
      this.stats.lastRun = new Date();
      this.stats.runsCompleted++;
      
      console.log(`[CacheWarmingService] Warming complete: ${totalWarmed} items in ${duration}ms`, summary);
      
      return summary;
    } catch (error) {
      this.stats.errors++;
      console.error('[CacheWarmingService] Warming failed:', error.message);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }
  
  /**
   * Warm job cache
   */
  async warmJobs(options = {}) {
    const { 
      fetcher,
      featuredLimit = 20,
      recentLimit = 50,
      popularLimit = 30,
    } = options;
    
    if (!fetcher) {
      console.log('[CacheWarmingService] No job fetcher provided');
      return 0;
    }
    
    let warmed = 0;
    
    try {
      // Warm featured jobs
      const featuredJobs = await fetcher.getFeatured(featuredLimit);
      for (const job of featuredJobs) {
        await jobCacheService.setJob(job._id || job.id, job);
        warmed++;
      }
      
      // Warm recent jobs
      const recentJobs = await fetcher.getRecent(recentLimit);
      for (const job of recentJobs) {
        await jobCacheService.setJob(job._id || job.id, job);
        warmed++;
      }
      
      // Warm popular jobs
      const popularJobs = await fetcher.getPopular(popularLimit);
      for (const job of popularJobs) {
        await jobCacheService.setJob(job._id || job.id, job);
        warmed++;
      }
      
      // Cache featured list
      await jobCacheService.setFeaturedJobs('all', featuredJobs);
      
      console.log(`[CacheWarmingService] Warmed ${warmed} jobs`);
      return warmed;
    } catch (error) {
      console.error('[CacheWarmingService] Job warming failed:', error.message);
      return warmed;
    }
  }
  
  /**
   * Warm user cache
   */
  async warmUsers(options = {}) {
    const {
      fetcher,
      activeLimit = 100,
      referrerLimit = 50,
    } = options;
    
    if (!fetcher) {
      console.log('[CacheWarmingService] No user fetcher provided');
      return 0;
    }
    
    let warmed = 0;
    
    try {
      // Warm active users
      const activeUsers = await fetcher.getActive(activeLimit);
      for (const user of activeUsers) {
        await userCacheService.setUser(user._id || user.id, user);
        warmed++;
      }
      
      // Warm referrer profiles
      const referrers = await fetcher.getTopReferrers(referrerLimit);
      for (const referrer of referrers) {
        await userCacheService.setReferrerProfile(referrer._id || referrer.id, referrer);
        warmed++;
      }
      
      console.log(`[CacheWarmingService] Warmed ${warmed} users`);
      return warmed;
    } catch (error) {
      console.error('[CacheWarmingService] User warming failed:', error.message);
      return warmed;
    }
  }
  
  /**
   * Warm referral cache
   */
  async warmReferrals(options = {}) {
    const {
      fetcher,
      activeLimit = 50,
      pendingLimit = 50,
    } = options;
    
    if (!fetcher) {
      console.log('[CacheWarmingService] No referral fetcher provided');
      return 0;
    }
    
    let warmed = 0;
    
    try {
      // Warm active referrals
      const activeReferrals = await fetcher.getActive(activeLimit);
      for (const referral of activeReferrals) {
        await referralCacheService.setReferral(referral._id || referral.id, referral);
        warmed++;
      }
      
      // Warm pending referrals
      const pendingReferrals = await fetcher.getPending(pendingLimit);
      for (const referral of pendingReferrals) {
        await referralCacheService.setReferral(referral._id || referral.id, referral);
        warmed++;
      }
      
      // Warm leaderboard
      const leaderboard = await fetcher.getLeaderboard('monthly');
      await referralCacheService.setLeaderboard('monthly', 'earnings', leaderboard);
      
      console.log(`[CacheWarmingService] Warmed ${warmed} referrals`);
      return warmed;
    } catch (error) {
      console.error('[CacheWarmingService] Referral warming failed:', error.message);
      return warmed;
    }
  }
  
  /**
   * Warm market data cache
   */
  async warmMarketData(options = {}) {
    const {
      fetcher,
      popularRoles = [],
      popularLocations = [],
      popularSkills = [],
    } = options;
    
    if (!fetcher) {
      console.log('[CacheWarmingService] No market data fetcher provided');
      return 0;
    }
    
    let warmed = 0;
    
    try {
      // Warm salary data
      for (const role of popularRoles.slice(0, 10)) {
        for (const location of popularLocations.slice(0, 3)) {
          const salaryData = await fetcher.getSalaryData(role, location);
          if (salaryData) {
            await marketDataCacheService.setSalaryData(role, location, null, salaryData);
            warmed++;
          }
        }
      }
      
      // Warm skill demand
      for (const skill of popularSkills.slice(0, 10)) {
        const demandData = await fetcher.getSkillDemand(skill);
        if (demandData) {
          await marketDataCacheService.setSkillDemand(skill, null, demandData);
          warmed++;
        }
      }
      
      // Warm trends
      const trends = await fetcher.getTrends('jobs', '30d');
      await marketDataCacheService.setTrends('jobs', '30d', trends);
      warmed++;
      
      console.log(`[CacheWarmingService] Warmed ${warmed} market data items`);
      return warmed;
    } catch (error) {
      console.error('[CacheWarmingService] Market data warming failed:', error.message);
      return warmed;
    }
  }
  
  /**
   * Warm session cache
   */
  async warmSessions(options = {}) {
    const { fetcher, activeLimit = 100 } = options;
    
    if (!fetcher) {
      console.log('[CacheWarmingService] No session fetcher provided');
      return 0;
    }
    
    let warmed = 0;
    
    try {
      const activeSessions = await fetcher.getActive(activeLimit);
      for (const session of activeSessions) {
        const sessionCacheService = require('./sessionCacheService.js');
        await sessionCacheService.createSession(session.id, session);
        warmed++;
      }
      
      console.log(`[CacheWarmingService] Warmed ${warmed} sessions`);
      return warmed;
    } catch (error) {
      console.error('[CacheWarmingService] Session warming failed:', error.message);
      return warmed;
    }
  }
  
  /**
   * Warm specific entity by ID
   */
  async warmEntity(type, id, fetcher) {
    try {
      let data;
      
      switch (type) {
        case 'job':
          data = await fetcher.getJob(id);
          if (data) await jobCacheService.setJob(id, data);
          break;
        case 'user':
          data = await fetcher.getUser(id);
          if (data) await userCacheService.setUser(id, data);
          break;
        case 'referral':
          data = await fetcher.getReferral(id);
          if (data) await referralCacheService.setReferral(id, data);
          break;
        default:
          throw new Error(`Unknown entity type: ${type}`);
      }
      
      return data !== null;
    } catch (error) {
      console.error(`[CacheWarmingService] Failed to warm ${type}:${id}:`, error.message);
      return false;
    }
  }
  
  /**
   * Preload related entities
   */
  async preloadRelated(type, id, fetcher) {
    const warmed = [];
    
    try {
      switch (type) {
        case 'job': {
          const job = await fetcher.getJob(id);
          if (job) {
            // Preload company
            if (job.companyId) {
              const company = await fetcher.getCompany(job.companyId);
              if (company) warmed.push({ type: 'company', id: job.companyId });
            }
            // Preload related jobs
            const related = await fetcher.getRelatedJobs(id, 5);
            for (const relatedJob of related) {
              await jobCacheService.setJob(relatedJob._id || relatedJob.id, relatedJob);
              warmed.push({ type: 'job', id: relatedJob._id || relatedJob.id });
            }
          }
          break;
        }
        case 'referral': {
          const referral = await fetcher.getReferral(id);
          if (referral) {
            // Preload job
            if (referral.jobId) {
              const job = await fetcher.getJob(referral.jobId);
              if (job) {
                await jobCacheService.setJob(referral.jobId, job);
                warmed.push({ type: 'job', id: referral.jobId });
              }
            }
            // Preload referrer
            if (referral.referrerId) {
              const user = await fetcher.getUser(referral.referrerId);
              if (user) {
                await userCacheService.setUser(referral.referrerId, user);
                warmed.push({ type: 'user', id: referral.referrerId });
              }
            }
          }
          break;
        }
      }
      
      return warmed;
    } catch (error) {
      console.error(`[CacheWarmingService] Failed to preload related for ${type}:${id}:`, error.message);
      return warmed;
    }
  }
  
  /**
   * Get warming statistics
   */
  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      warmingJobs: Array.from(this.warmingJobs.keys()),
    };
  }
  
  /**
   * Stop all warming jobs
   */
  async stop() {
    this.warmingJobs.clear();
    this.isRunning = false;
    console.log('[CacheWarmingService] Stopped all warming jobs');
  }
  
  /**
   * Schedule on-demand warming
   */
  async scheduleWarming(type, priority = 'normal') {
    const jobId = `${type}_${Date.now()}`;
    
    this.warmingJobs.set(jobId, {
      type,
      priority,
      scheduledAt: Date.now(),
      status: 'pending',
    });
    
    // Process based on priority
    if (priority === 'high' && !this.isRunning) {
      await this.warmAll();
    }
    
    return jobId;
  }
}

// Create singleton instance
const cacheWarmingService = new CacheWarmingService();

module.exports = cacheWarmingService;