/**
 * Query Optimization Service
 * MongoDB query optimization utilities and performance monitoring
 */

const mongoose = require('mongoose');
const performanceConfig = require('../config/performance.js');

const { query: config } = performanceConfig;

/**
 * Query Optimization Service
 */
class QueryOptimizationService {
  constructor() {
    this.slowQueries = [];
    this.queryStats = new Map();
    this.maxHistory = config.MAX_QUERY_HISTORY;
  }
  
  /**
   * Build optimized query with pagination
   */
  buildPaginatedQuery(model, baseQuery = {}, options = {}) {
    const {
      page = 1,
      limit = config.pagination.defaultPageSize,
      sort = { createdAt: -1 },
      select = null,
      populate = null,
    } = options;
    
    const skip = (page - 1) * limit;
    
    let query = model.find(baseQuery);
    
    // Apply field selection
    if (select) {
      query = query.select(select);
    }
    
    // Apply sorting
    query = query.sort(sort);
    
    // Apply pagination
    query = query.skip(skip).limit(limit);
    
    // Apply population
    if (populate) {
      if (Array.isArray(populate)) {
        populate.forEach(p => query = query.populate(p));
      } else {
        query = query.populate(populate);
      }
    }
    
    // Set max execution time
    query = query.maxTimeMS(config.limits.defaultTimeoutMs);
    
    return query;
  }
  
  /**
   * Execute optimized query with monitoring
   */
  async execute(query, context = {}) {
    const startTime = Date.now();
    const queryId = this.generateQueryId();
    
    try {
      const result = await query;
      const duration = Date.now() - startTime;
      
      // Track query performance
      this.trackQuery(queryId, duration, context);
      
      // Log slow queries
      if (duration > config.thresholds.slowQueryMs) {
        this.logSlowQuery(query, duration, context);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.trackQuery(queryId, duration, context, error);
      throw error;
    }
  }
  
  /**
   * Execute aggregation with optimization
   */
  async aggregate(model, pipeline, options = {}) {
    const startTime = Date.now();
    const { allowDiskUse = true, maxTimeMS = config.limits.defaultTimeoutMs } = options;
    
    // Add optimization hints
    const optimizedPipeline = this.optimizePipeline(pipeline);
    
    try {
      const result = await model.aggregate(optimizedPipeline)
        .allowDiskUse(allowDiskUse)
        .maxTimeMS(maxTimeMS);
      
      const duration = Date.now() - startTime;
      
      if (duration > config.thresholds.slowQueryMs) {
        this.logSlowQuery({ pipeline: optimizedPipeline }, duration, { type: 'aggregation' });
      }
      
      return result;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Optimize aggregation pipeline
   */
  optimizePipeline(pipeline) {
    const optimized = [...pipeline];
    
    // Move $match stages early
    const matchStages = optimized.filter(stage => stage.$match);
    const otherStages = optimized.filter(stage => !stage.$match);
    
    // Reorder: match stages first, then others
    return [...matchStages, ...otherStages];
  }
  
  /**
   * Build search query with text index
   */
  buildSearchQuery(searchText, fields = []) {
    if (!searchText) return {};
    
    // Use text search if available
    if (fields.length === 0) {
      return { $text: { $search: searchText } };
    }
    
    // Build regex search for multiple fields
    const orConditions = fields.map(field => ({
      [field]: { $regex: searchText, $options: 'i' },
    }));
    
    return { $or: orConditions };
  }
  
  /**
   * Build date range query
   */
  buildDateRangeQuery(field, startDate, endDate) {
    const query = {};
    
    if (startDate || endDate) {
      query[field] = {};
      if (startDate) query[field].$gte = new Date(startDate);
      if (endDate) query[field].$lte = new Date(endDate);
    }
    
    return query;
  }
  
  /**
   * Build array query (for tags, categories, etc.)
   */
  buildArrayQuery(field, values, operator = 'in') {
    if (!values || values.length === 0) return {};
    
    const valueArray = Array.isArray(values) ? values : [values];
    
    switch (operator) {
      case 'in':
        return { [field]: { $in: valueArray } };
      case 'all':
        return { [field]: { $all: valueArray } };
      case 'nin':
        return { [field]: { $nin: valueArray } };
      default:
        return { [field]: { $in: valueArray } };
    }
  }
  
  /**
   * Build range query
   */
  buildRangeQuery(field, min, max) {
    const query = {};
    
    if (min !== undefined || max !== undefined) {
      query[field] = {};
      if (min !== undefined) query[field].$gte = min;
      if (max !== undefined) query[field].$lte = max;
    }
    
    return query;
  }
  
  /**
   * Combine multiple queries with AND
   */
  combineQueries(...queries) {
    const andConditions = queries.filter(q => Object.keys(q).length > 0);
    
    if (andConditions.length === 0) return {};
    if (andConditions.length === 1) return andConditions[0];
    
    return { $and: andConditions };
  }
  
  /**
   * Project fields for optimal response size
   */
  buildProjection(fields, include = true) {
    const projection = {};
    
    if (Array.isArray(fields)) {
      fields.forEach(field => {
        projection[field] = include ? 1 : 0;
      });
    } else if (typeof fields === 'object') {
      Object.assign(projection, fields);
    }
    
    // Always exclude sensitive fields
    projection.password = 0;
    projection.__v = 0;
    
    return projection;
  }
  
  /**
   * Generate query ID
   */
  generateQueryId() {
    return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Track query performance
   */
  trackQuery(queryId, duration, context, error = null) {
    const stat = {
      queryId,
      duration,
      context,
      error: error ? error.message : null,
      timestamp: Date.now(),
    };
    
    this.queryStats.set(queryId, stat);
    
    // Maintain max history
    if (this.queryStats.size > this.maxHistory) {
      const oldestKey = this.queryStats.keys().next().value;
      this.queryStats.delete(oldestKey);
    }
  }
  
  /**
   * Log slow query
   */
  logSlowQuery(query, duration, context) {
    const slowQuery = {
      query: query.toString ? query.toString() : JSON.stringify(query),
      duration,
      context,
      timestamp: new Date(),
    };
    
    this.slowQueries.push(slowQuery);
    
    // Keep only recent slow queries
    if (this.slowQueries.length > 100) {
      this.slowQueries.shift();
    }
    
    // Log to console
    console.warn(`[Slow Query] ${duration}ms - ${context.model || 'Unknown'}`, {
      duration,
      context,
    });
  }
  
  /**
   * Get query statistics
   */
  getStats() {
    const queries = Array.from(this.queryStats.values());
    const totalQueries = queries.length;
    
    if (totalQueries === 0) {
      return {
        totalQueries: 0,
        avgDuration: 0,
        maxDuration: 0,
        slowQueries: 0,
      };
    }
    
    const durations = queries.map(q => q.duration);
    const slowQueryCount = queries.filter(q => q.duration > config.thresholds.slowQueryMs).length;
    
    return {
      totalQueries,
      avgDuration: durations.reduce((a, b) => a + b, 0) / totalQueries,
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations),
      slowQueries: slowQueryCount,
      slowQueryRate: (slowQueryCount / totalQueries) * 100,
    };
  }
  
  /**
   * Get slow queries
   */
  getSlowQueries(limit = 10) {
    return this.slowQueries
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }
  
  /**
   * Explain query execution plan
   */
  async explainQuery(model, query, options = {}) {
    try {
      const explainResult = await model.find(query).explain('executionStats');
      
      return {
        stage: explainResult.queryPlanner.winningPlan.stage,
        indexUsed: explainResult.queryPlanner.winningPlan.inputStage?.indexName,
        executionTimeMillis: explainResult.executionStats.executionTimeMillis,
        totalDocsExamined: explainResult.executionStats.totalDocsExamined,
        totalKeysExamined: explainResult.executionStats.totalKeysExamined,
        nReturned: explainResult.executionStats.nReturned,
        executionStages: explainResult.executionStats.executionStages,
      };
    } catch (error) {
      return { error: error.message };
    }
  }
  
  /**
   * Batch process large datasets
   */
  async *batchProcess(model, query, batchSize = 100) {
    let skip = 0;
    let hasMore = true;
    
    while (hasMore) {
      const batch = await model
        .find(query)
        .skip(skip)
        .limit(batchSize)
        .lean();
      
      if (batch.length === 0) {
        hasMore = false;
        break;
      }
      
      for (const doc of batch) {
        yield doc;
      }
      
      skip += batchSize;
      hasMore = batch.length === batchSize;
    }
  }
  
  /**
   * Clear statistics
   */
  clearStats() {
    this.queryStats.clear();
    this.slowQueries = [];
  }
}

// Create singleton instance
const queryOptimizationService = new QueryOptimizationService();

module.exports = queryOptimizationService;