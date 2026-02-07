/**
 * Job Cache Service
 * Specialized caching for job listings and search results
 * Optimized for high-traffic job discovery features
 */

const enhancedCacheService = require('./enhancedCacheService.js');
const { keyHelpers } = require('../config/redis.js');
const performanceConfig = require('../config/performance.js');

const { cache: config } = performanceConfig;

/**
 * Job Cache Service
 */
class JobCacheService {
  constructor() {
    this.TTL = config.l2.ttlSeconds.job;
    this.TAGS = {
      JOB: 'job',
      JOB_LIST: 'job:list',
      JOB_SEARCH: 'job:search',
      JOB_FEATURED: 'job:featured',
      JOB_COMPANY: 'job:company',
      JOB_CATEGORY: 'job:category',
      JOB_LOCATION: 'job:location',
      JOB_SALARY: 'job:salary',
    };
  }
  
  /**
   * Generate cache key for job
   */
  _getJobKey(jobId) {
    return keyHelpers.job(jobId);
  }
  
  /**
   * Generate cache key for job list
   */
  _getJobListKey(filters = {}) {
    const filterHash = this._hashFilters(filters);
    return keyHelpers.create(config.keyPrefix.job, 'list', filterHash);
  }
  
  /**
   * Generate cache key for search results
   */
  _getSearchKey(query, filters = {}) {
    const filterHash = this._hashFilters({ query, ...filters });
    return keyHelpers.create(config.keyPrefix.job, 'search', filterHash);
  }
  
  /**
   * Generate cache key for featured jobs
   */
  _getFeaturedKey(category = 'all') {
    return keyHelpers.create(config.keyPrefix.job, 'featured', category);
  }
  
  /**
   * Generate cache key for company jobs
   */
  _getCompanyJobsKey(companyId, filters = {}) {
    const filterHash = this._hashFilters(filters);
    return keyHelpers.create(config.keyPrefix.job, 'company', companyId, filterHash);
  }
  
  /**
   * Hash filters for cache key
   */
  _hashFilters(filters) {
    const sorted = Object.keys(filters)
      .sort()
      .reduce((acc, key) => {
        acc[key] = filters[key];
        return acc;
      }, {});
    
    return Buffer.from(JSON.stringify(sorted)).toString('base64').substring(0, 16);
  }
  
  /**
   * Get job by ID
   */
  async getJob(jobId) {
    const key = this._getJobKey(jobId);
    return enhancedCacheService.get(key);
  }
  
  /**
   * Cache job
   */
  async setJob(jobId, jobData) {
    const key = this._getJobKey(jobId);
    return enhancedCacheService.set(key, jobData, {
      ttl: this.TTL,
      tags: [this.TAGS.JOB, `${this.TAGS.JOB}:${jobId}`],
    });
  }
  
  /**
   * Delete job from cache
   */
  async deleteJob(jobId) {
    const key = this._getJobKey(jobId);
    await enhancedCacheService.delete(key);
    
    // Invalidate related caches
    await this.invalidateJobRelated(jobId);
  }
  
  /**
   * Get job list with filters
   */
  async getJobList(filters = {}) {
    const key = this._getJobListKey(filters);
    return enhancedCacheService.get(key);
  }
  
  /**
   * Cache job list
   */
  async setJobList(filters, jobs, pagination) {
    const key = this._getJobListKey(filters);
    const data = { jobs, pagination, cachedAt: Date.now() };
    
    return enhancedCacheService.set(key, data, {
      ttl: this.TTL,
      tags: [this.TAGS.JOB_LIST, this.TAGS.JOB],
    });
  }
  
  /**
   * Get search results
   */
  async getSearchResults(query, filters = {}) {
    const key = this._getSearchKey(query, filters);
    return enhancedCacheService.get(key);
  }
  
  /**
   * Cache search results
   */
  async setSearchResults(query, filters, results) {
    const key = this._getSearchKey(query, filters);
    const data = { ...results, cachedAt: Date.now() };
    
    return enhancedCacheService.set(key, data, {
      ttl: config.l2.ttlSeconds.short, // Shorter TTL for search
      tags: [this.TAGS.JOB_SEARCH, this.TAGS.JOB],
    });
  }
  
  /**
   * Get featured jobs
   */
  async getFeaturedJobs(category = 'all') {
    const key = this._getFeaturedKey(category);
    return enhancedCacheService.get(key);
  }
  
  /**
   * Cache featured jobs
   */
  async setFeaturedJobs(category, jobs) {
    const key = this._getFeaturedKey(category);
    const data = { jobs, cachedAt: Date.now() };
    
    return enhancedCacheService.set(key, data, {
      ttl: config.l2.ttlSeconds.medium,
      tags: [this.TAGS.JOB_FEATURED, this.TAGS.JOB],
    });
  }
  
  /**
   * Get company jobs
   */
  async getCompanyJobs(companyId, filters = {}) {
    const key = this._getCompanyJobsKey(companyId, filters);
    return enhancedCacheService.get(key);
  }
  
  /**
   * Cache company jobs
   */
  async setCompanyJobs(companyId, filters, jobs, pagination) {
    const key = this._getCompanyJobsKey(companyId, filters);
    const data = { jobs, pagination, cachedAt: Date.now() };
    
    return enhancedCacheService.set(key, data, {
      ttl: this.TTL,
      tags: [this.TAGS.JOB_COMPANY, `${this.TAGS.JOB_COMPANY}:${companyId}`, this.TAGS.JOB],
    });
  }
  
  /**
   * Get or fetch job (cache-aside)
   */
  async getOrFetchJob(jobId, fetchFn) {
    const cached = await this.getJob(jobId);
    if (cached) return cached;
    
    const job = await fetchFn();
    if (job) {
      await this.setJob(jobId, job);
    }
    return job;
  }
  
  /**
   * Get or fetch job list (cache-aside)
   */
  async getOrFetchJobList(filters, fetchFn) {
    const cached = await this.getJobList(filters);
    if (cached) return cached;
    
    const result = await fetchFn();
    if (result) {
      await this.setJobList(filters, result.jobs, result.pagination);
    }
    return result;
  }
  
  /**
   * Get or fetch search results (cache-aside)
   */
  async getOrFetchSearchResults(query, filters, fetchFn) {
    const cached = await this.getSearchResults(query, filters);
    if (cached) return cached;
    
    const result = await fetchFn();
    if (result) {
      await this.setSearchResults(query, filters, result);
    }
    return result;
  }
  
  /**
   * Invalidate job cache
   */
  async invalidateJob(jobId) {
    await enhancedCacheService.deleteByTag(`${this.TAGS.JOB}:${jobId}`);
  }
  
  /**
   * Invalidate job-related caches
   */
  async invalidateJobRelated(jobId) {
    // Get job data to find related tags
    const job = await this.getJob(jobId);
    
    const tagsToInvalidate = [
      this.TAGS.JOB_LIST,
      this.TAGS.JOB_SEARCH,
      this.TAGS.JOB_FEATURED,
    ];
    
    if (job) {
      if (job.companyId) {
        tagsToInvalidate.push(`${this.TAGS.JOB_COMPANY}:${job.companyId}`);
      }
      if (job.category) {
        tagsToInvalidate.push(`${this.TAGS.JOB_CATEGORY}:${job.category}`);
      }
      if (job.location?.city) {
        tagsToInvalidate.push(`${this.TAGS.JOB_LOCATION}:${job.location.city}`);
      }
    }
    
    // Invalidate all related tags
    for (const tag of tagsToInvalidate) {
      await enhancedCacheService.deleteByTag(tag);
    }
  }
  
  /**
   * Invalidate all job caches
   */
  async invalidateAllJobs() {
    await enhancedCacheService.deleteByTag(this.TAGS.JOB);
  }
  
  /**
   * Invalidate company jobs
   */
  async invalidateCompanyJobs(companyId) {
    await enhancedCacheService.deleteByTag(`${this.TAGS.JOB_COMPANY}:${companyId}`);
  }
  
  /**
   * Warm cache with popular jobs
   */
  async warmCache(popularJobsFetcher, options = {}) {
    const { limit = 100, categories = [] } = options;
    
    try {
      // Fetch popular jobs
      const popularJobs = await popularJobsFetcher(limit);
      
      // Cache individual jobs
      for (const job of popularJobs) {
        await this.setJob(job._id || job.id, job);
      }
      
      // Cache by category
      for (const category of categories) {
        const categoryJobs = popularJobs.filter(j => j.category === category);
        if (categoryJobs.length > 0) {
          await this.setJobList({ category }, categoryJobs, {
            total: categoryJobs.length,
            page: 1,
            pages: 1,
          });
        }
      }
      
      console.log(`[JobCacheService] Warming complete: ${popularJobs.length} jobs cached`);
      return popularJobs.length;
    } catch (error) {
      console.error('[JobCacheService] Cache warming failed:', error.message);
      return 0;
    }
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    return enhancedCacheService.getStats();
  }
  
  /**
   * Preload jobs for anticipated queries
   */
  async preloadJobs(jobIds) {
    const results = await Promise.allSettled(
      jobIds.map(id => this.getJob(id))
    );
    
    const misses = jobIds.filter((_, i) => results[i].value === null);
    return {
      total: jobIds.length,
      hits: jobIds.length - misses.length,
      misses: misses.length,
      missedIds: misses,
    };
  }
  
  /**
   * Cache job view count (for trending)
   */
  async incrementJobView(jobId) {
    const key = keyHelpers.create(config.keyPrefix.stats, 'job:views', jobId);
    
    try {
      await enhancedCacheService.circuitBreaker.execute(async () => {
        const client = enhancedCacheService.l2;
        if (client) {
          await client.incr(key);
          await client.expire(key, 86400); // 24 hours
        }
      });
    } catch (error) {
      // Silent fail for stats
    }
  }
  
  /**
   * Get trending jobs based on view count
   */
  async getTrendingJobs(limit = 10) {
    const pattern = keyHelpers.create(config.keyPrefix.stats, 'job:views', '*');
    
    try {
      const client = enhancedCacheService.l2;
      if (!client) return [];
      
      const keys = await client.keys(pattern);
      if (keys.length === 0) return [];
      
      const values = await client.mget(...keys);
      const jobViews = keys.map((key, i) => ({
        jobId: key.split(':').pop(),
        views: parseInt(values[i], 10) || 0,
      }));
      
      return jobViews
        .sort((a, b) => b.views - a.views)
        .slice(0, limit);
    } catch (error) {
      return [];
    }
  }
}

// Create singleton instance
const jobCacheService = new JobCacheService();

module.exports = jobCacheService;