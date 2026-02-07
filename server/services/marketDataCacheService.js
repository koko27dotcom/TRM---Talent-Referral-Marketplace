/**
 * Market Data Cache Service
 * Specialized caching for market insights, trends, and analytics
 * Optimized for data-heavy market analysis features
 */

const enhancedCacheService = require('./enhancedCacheService.js');
const { keyHelpers } = require('../config/redis.js');
const performanceConfig = require('../config/performance.js');

const { cache: config } = performanceConfig;

/**
 * Market Data Cache Service
 */
class MarketDataCacheService {
  constructor() {
    this.TTL = config.l2.ttlSeconds.market;
    this.STATIC_TTL = config.l2.ttlSeconds.static;
    
    this.TAGS = {
      MARKET: 'market',
      MARKET_INSIGHT: 'market:insight',
      MARKET_TREND: 'market:trend',
      MARKET_SALARY: 'market:salary',
      MARKET_DEMAND: 'market:demand',
      MARKET_SKILL: 'market:skill',
      MARKET_LOCATION: 'market:location',
      MARKET_INDUSTRY: 'market:industry',
      MARKET_REPORT: 'market:report',
      MARKET_BENCHMARK: 'market:benchmark',
    };
  }
  
  /**
   * Generate cache key for market insight
   */
  _getInsightKey(insightId) {
    return keyHelpers.marketData('insight', insightId);
  }
  
  /**
   * Generate cache key for market trends
   */
  _getTrendKey(category, timeframe) {
    return keyHelpers.marketData('trend', `${category}:${timeframe}`);
  }
  
  /**
   * Generate cache key for salary data
   */
  _getSalaryKey(role, location, experience) {
    const parts = [role, location, experience].filter(Boolean);
    return keyHelpers.marketData('salary', parts.join(':'));
  }
  
  /**
   * Generate cache key for skill demand
   */
  _getSkillDemandKey(skill, location) {
    return keyHelpers.marketData('skill', `${skill}:${location || 'global'}`);
  }
  
  /**
   * Generate cache key for location data
   */
  _getLocationKey(location, dataType) {
    return keyHelpers.marketData('location', `${location}:${dataType}`);
  }
  
  /**
   * Generate cache key for industry data
   */
  _getIndustryKey(industry, dataType) {
    return keyHelpers.marketData('industry', `${industry}:${dataType}`);
  }
  
  /**
   * Generate cache key for market report
   */
  _getReportKey(reportType, params = {}) {
    const paramHash = this._hashParams(params);
    return keyHelpers.marketData('report', `${reportType}:${paramHash}`);
  }
  
  /**
   * Generate cache key for benchmark data
   */
  _getBenchmarkKey(benchmarkType, companyId) {
    return keyHelpers.marketData('benchmark', `${benchmarkType}:${companyId}`);
  }
  
  /**
   * Hash parameters for cache key
   */
  _hashParams(params) {
    const sorted = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {});
    
    return Buffer.from(JSON.stringify(sorted)).toString('base64').substring(0, 16);
  }
  
  /**
   * Get market insight
   */
  async getInsight(insightId) {
    const key = this._getInsightKey(insightId);
    return enhancedCacheService.get(key);
  }
  
  /**
   * Cache market insight
   */
  async setInsight(insightId, insightData) {
    const key = this._getInsightKey(insightId);
    return enhancedCacheService.set(key, insightData, {
      ttl: this.TTL,
      tags: [this.TAGS.MARKET_INSIGHT, this.TAGS.MARKET],
    });
  }
  
  /**
   * Get market trends
   */
  async getTrends(category, timeframe) {
    const key = this._getTrendKey(category, timeframe);
    return enhancedCacheService.get(key);
  }
  
  /**
   * Cache market trends
   */
  async setTrends(category, timeframe, trends) {
    const key = this._getTrendKey(category, timeframe);
    const data = { trends, cachedAt: Date.now(), timeframe };
    
    return enhancedCacheService.set(key, data, {
      ttl: this.TTL,
      tags: [this.TAGS.MARKET_TREND, this.TAGS.MARKET],
    });
  }
  
  /**
   * Get salary data
   */
  async getSalaryData(role, location, experience) {
    const key = this._getSalaryKey(role, location, experience);
    return enhancedCacheService.get(key);
  }
  
  /**
   * Cache salary data
   */
  async setSalaryData(role, location, experience, salaryData) {
    const key = this._getSalaryKey(role, location, experience);
    
    return enhancedCacheService.set(key, salaryData, {
      ttl: this.STATIC_TTL,
      tags: [this.TAGS.MARKET_SALARY, this.TAGS.MARKET],
    });
  }
  
  /**
   * Get skill demand data
   */
  async getSkillDemand(skill, location) {
    const key = this._getSkillDemandKey(skill, location);
    return enhancedCacheService.get(key);
  }
  
  /**
   * Cache skill demand data
   */
  async setSkillDemand(skill, location, demandData) {
    const key = this._getSkillDemandKey(skill, location);
    
    return enhancedCacheService.set(key, demandData, {
      ttl: this.TTL,
      tags: [this.TAGS.MARKET_SKILL, this.TAGS.MARKET],
    });
  }
  
  /**
   * Get location market data
   */
  async getLocationData(location, dataType) {
    const key = this._getLocationKey(location, dataType);
    return enhancedCacheService.get(key);
  }
  
  /**
   * Cache location market data
   */
  async setLocationData(location, dataType, data) {
    const key = this._getLocationKey(location, dataType);
    
    return enhancedCacheService.set(key, data, {
      ttl: this.TTL,
      tags: [this.TAGS.MARKET_LOCATION, this.TAGS.MARKET],
    });
  }
  
  /**
   * Get industry data
   */
  async getIndustryData(industry, dataType) {
    const key = this._getIndustryKey(industry, dataType);
    return enhancedCacheService.get(key);
  }
  
  /**
   * Cache industry data
   */
  async setIndustryData(industry, dataType, data) {
    const key = this._getIndustryKey(industry, dataType);
    
    return enhancedCacheService.set(key, data, {
      ttl: this.TTL,
      tags: [this.TAGS.MARKET_INDUSTRY, this.TAGS.MARKET],
    });
  }
  
  /**
   * Get market report
   */
  async getReport(reportType, params) {
    const key = this._getReportKey(reportType, params);
    return enhancedCacheService.get(key);
  }
  
  /**
   * Cache market report
   */
  async setReport(reportType, params, report) {
    const key = this._getReportKey(reportType, params);
    const data = { report, cachedAt: Date.now(), params };
    
    return enhancedCacheService.set(key, data, {
      ttl: this.STATIC_TTL,
      tags: [this.TAGS.MARKET_REPORT, this.TAGS.MARKET],
    });
  }
  
  /**
   * Get benchmark data
   */
  async getBenchmark(benchmarkType, companyId) {
    const key = this._getBenchmarkKey(benchmarkType, companyId);
    return enhancedCacheService.get(key);
  }
  
  /**
   * Cache benchmark data
   */
  async setBenchmark(benchmarkType, companyId, benchmark) {
    const key = this._getBenchmarkKey(benchmarkType, companyId);
    
    return enhancedCacheService.set(key, benchmark, {
      ttl: this.TTL,
      tags: [this.TAGS.MARKET_BENCHMARK, this.TAGS.MARKET],
    });
  }
  
  /**
   * Get or fetch insight (cache-aside)
   */
  async getOrFetchInsight(insightId, fetchFn) {
    const cached = await this.getInsight(insightId);
    if (cached) return cached;
    
    const insight = await fetchFn();
    if (insight) {
      await this.setInsight(insightId, insight);
    }
    return insight;
  }
  
  /**
   * Get or fetch trends (cache-aside)
   */
  async getOrFetchTrends(category, timeframe, fetchFn) {
    const cached = await this.getTrends(category, timeframe);
    if (cached) return cached;
    
    const trends = await fetchFn();
    if (trends) {
      await this.setTrends(category, timeframe, trends);
    }
    return trends;
  }
  
  /**
   * Get or fetch salary data (cache-aside)
   */
  async getOrFetchSalaryData(role, location, experience, fetchFn) {
    const cached = await this.getSalaryData(role, location, experience);
    if (cached) return cached;
    
    const salary = await fetchFn();
    if (salary) {
      await this.setSalaryData(role, location, experience, salary);
    }
    return salary;
  }
  
  /**
   * Invalidate market data by tag
   */
  async invalidateByTag(tag) {
    await enhancedCacheService.deleteByTag(tag);
  }
  
  /**
   * Invalidate all market data
   */
  async invalidateAll() {
    await enhancedCacheService.deleteByTag(this.TAGS.MARKET);
  }
  
  /**
   * Invalidate insights
   */
  async invalidateInsights() {
    await enhancedCacheService.deleteByTag(this.TAGS.MARKET_INSIGHT);
  }
  
  /**
   * Invalidate trends
   */
  async invalidateTrends() {
    await enhancedCacheService.deleteByTag(this.TAGS.MARKET_TREND);
  }
  
  /**
   * Invalidate salary data
   */
  async invalidateSalaryData() {
    await enhancedCacheService.deleteByTag(this.TAGS.MARKET_SALARY);
  }
  
  /**
   * Batch get salary data for multiple roles
   */
  async getSalaryDataBatch(roles, location, experience) {
    const results = await Promise.allSettled(
      roles.map(role => this.getSalaryData(role, location, experience))
    );
    
    return roles.map((role, i) => ({
      role,
      data: results[i].status === 'fulfilled' ? results[i].value : null,
      found: results[i].status === 'fulfilled' && results[i].value !== null,
    }));
  }
  
  /**
   * Cache aggregated market stats
   */
  async setAggregatedStats(statsType, stats, metadata = {}) {
    const key = keyHelpers.marketData('aggregated', statsType);
    const data = { stats, metadata, cachedAt: Date.now() };
    
    return enhancedCacheService.set(key, data, {
      ttl: this.TTL,
      tags: [this.TAGS.MARKET, `market:aggregated:${statsType}`],
    });
  }
  
  /**
   * Get aggregated market stats
   */
  async getAggregatedStats(statsType) {
    const key = keyHelpers.marketData('aggregated', statsType);
    return enhancedCacheService.get(key);
  }
  
  /**
   * Track market data access for analytics
   */
  async trackAccess(dataType, identifier) {
    const key = keyHelpers.create(config.keyPrefix.stats, 'market', 'access', dataType);
    
    try {
      const client = enhancedCacheService.l2;
      if (!client) return;
      
      await client.zincrby(key, 1, identifier);
      await client.expire(key, 86400); // 24 hours
    } catch (error) {
      // Silent fail
    }
  }
  
  /**
   * Get popular market data queries
   */
  async getPopularQueries(dataType, limit = 10) {
    const key = keyHelpers.create(config.keyPrefix.stats, 'market', 'access', dataType);
    
    try {
      const client = enhancedCacheService.l2;
      if (!client) return [];
      
      const results = await client.zrevrange(key, 0, limit - 1, 'WITHSCORES');
      const queries = [];
      
      for (let i = 0; i < results.length; i += 2) {
        queries.push({
          query: results[i],
          count: parseInt(results[i + 1], 10),
        });
      }
      
      return queries;
    } catch (error) {
      return [];
    }
  }
  
  /**
   * Warm cache with popular market data
   */
  async warmCache(dataFetcher, options = {}) {
    const { 
      popularRoles = [],
      popularLocations = [],
      popularSkills = [],
      popularIndustries = [],
    } = options;
    
    let cachedCount = 0;
    
    try {
      // Warm salary data for popular roles
      for (const role of popularRoles) {
        for (const location of popularLocations.slice(0, 3)) {
          const salaryData = await dataFetcher.getSalaryData(role, location);
          if (salaryData) {
            await this.setSalaryData(role, location, null, salaryData);
            cachedCount++;
          }
        }
      }
      
      // Warm skill demand data
      for (const skill of popularSkills) {
        const demandData = await dataFetcher.getSkillDemand(skill);
        if (demandData) {
          await this.setSkillDemand(skill, null, demandData);
          cachedCount++;
        }
      }
      
      // Warm industry data
      for (const industry of popularIndustries) {
        const industryData = await dataFetcher.getIndustryData(industry);
        if (industryData) {
          await this.setIndustryData(industry, 'overview', industryData);
          cachedCount++;
        }
      }
      
      console.log(`[MarketDataCacheService] Warming complete: ${cachedCount} items cached`);
      return cachedCount;
    } catch (error) {
      console.error('[MarketDataCacheService] Cache warming failed:', error.message);
      return 0;
    }
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    return enhancedCacheService.getStats();
  }
}

// Create singleton instance
const marketDataCacheService = new MarketDataCacheService();

module.exports = marketDataCacheService;