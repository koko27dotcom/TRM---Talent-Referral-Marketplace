/**
 * QueryOptimizer Service
 * MongoDB query optimization and performance monitoring for enterprise-scale TRM platform
 * Features: Query analysis, index management, performance tracking, optimization recommendations
 */

const mongoose = require('mongoose');
const cacheService = require('./cacheService.js');

// Configuration
const CONFIG = {
  // Performance thresholds (in milliseconds)
  SLOW_QUERY_THRESHOLD: parseInt(process.env.SLOW_QUERY_THRESHOLD, 10) || 100,
  VERY_SLOW_QUERY_THRESHOLD: parseInt(process.env.VERY_SLOW_QUERY_THRESHOLD, 10) || 500,
  
  // Query result limits
  DEFAULT_PAGE_SIZE: parseInt(process.env.DEFAULT_PAGE_SIZE, 10) || 20,
  MAX_PAGE_SIZE: parseInt(process.env.MAX_PAGE_SIZE, 10) || 100,
  CURSOR_PAGE_SIZE: parseInt(process.env.CURSOR_PAGE_SIZE, 10) || 50,
  
  // Statistics tracking
  MAX_QUERY_HISTORY: parseInt(process.env.MAX_QUERY_HISTORY, 10) || 10000,
  QUERY_STATS_WINDOW_MS: parseInt(process.env.QUERY_STATS_WINDOW_MS, 10) || 24 * 60 * 60 * 1000, // 24 hours
  
  // Index recommendations
  MIN_QUERY_COUNT_FOR_INDEX: parseInt(process.env.MIN_QUERY_COUNT_FOR_INDEX, 10) || 10,
  INDEX_USAGE_THRESHOLD: parseFloat(process.env.INDEX_USAGE_THRESHOLD) || 0.1,
  
  // Caching hints
  CACHEABLE_QUERY_THRESHOLD_MS: parseInt(process.env.CACHEABLE_QUERY_THRESHOLD_MS, 10) || 50,
};

/**
 * Query execution tracker
 * Tracks query performance and patterns
 */
class QueryTracker {
  constructor() {
    this.queries = new Map(); // queryId -> query info
    this.slowQueries = []; // Array of slow query records
    this.stats = {
      totalQueries: 0,
      totalExecutionTime: 0,
      slowQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
    this.patterns = new Map(); // query pattern -> pattern stats
    this.indexUsage = new Map(); // index name -> usage stats
  }

  /**
   * Generate unique query ID
   * @param {string} modelName - Model name
   * @param {Object} query - Query object
   * @returns {string} Query ID
   */
  generateQueryId(modelName, query) {
    const queryStr = JSON.stringify(query);
    return `${modelName}:${Buffer.from(queryStr).toString('base64').substring(0, 16)}`;
  }

  /**
   * Extract query pattern for analysis
   * @param {Object} query - Query object
   * @returns {string} Query pattern
   */
  extractPattern(query) {
    const fields = Object.keys(query).sort();
    return fields.join(',');
  }

  /**
   * Start tracking a query
   * @param {string} queryId - Query ID
   * @param {string} modelName - Model name
   * @param {Object} query - Query object
   * @param {Object} metadata - Additional metadata
   */
  startQuery(queryId, modelName, query, metadata = {}) {
    this.queries.set(queryId, {
      id: queryId,
      modelName,
      query,
      startTime: Date.now(),
      metadata,
    });
  }

  /**
   * End tracking a query
   * @param {string} queryId - Query ID
   * @param {number} duration - Execution duration in ms
   * @param {Object} result - Query result info
   * @returns {Object} Query record
   */
  endQuery(queryId, duration, result = {}) {
    const queryInfo = this.queries.get(queryId);
    if (!queryInfo) return null;

    const record = {
      ...queryInfo,
      duration,
      endTime: Date.now(),
      documentCount: result.documentCount || 0,
      indexUsed: result.indexUsed || null,
      stage: result.stage || 'UNKNOWN',
      isSlow: duration > CONFIG.SLOW_QUERY_THRESHOLD,
      isVerySlow: duration > CONFIG.VERY_SLOW_QUERY_THRESHOLD,
    };

    // Update stats
    this.stats.totalQueries++;
    this.stats.totalExecutionTime += duration;

    if (record.isSlow) {
      this.stats.slowQueries++;
      this.slowQueries.push(record);
      
      // Keep only recent slow queries
      const cutoff = Date.now() - CONFIG.QUERY_STATS_WINDOW_MS;
      this.slowQueries = this.slowQueries.filter(q => q.startTime > cutoff);
    }

    // Update pattern stats
    const pattern = this.extractPattern(queryInfo.query);
    if (!this.patterns.has(pattern)) {
      this.patterns.set(pattern, {
        pattern,
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        maxDuration: 0,
        lastSeen: null,
      });
    }
    const patternStats = this.patterns.get(pattern);
    patternStats.count++;
    patternStats.totalDuration += duration;
    patternStats.avgDuration = patternStats.totalDuration / patternStats.count;
    patternStats.maxDuration = Math.max(patternStats.maxDuration, duration);
    patternStats.lastSeen = Date.now();

    // Clean up
    this.queries.delete(queryId);

    return record;
  }

  /**
   * Get slow queries
   * @param {number} threshold - Duration threshold in ms
   * @param {number} limit - Maximum number of results
   * @returns {Array} Slow queries
   */
  getSlowQueries(threshold = CONFIG.SLOW_QUERY_THRESHOLD, limit = 100) {
    return this.slowQueries
      .filter(q => q.duration >= threshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Get query statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const avgDuration = this.stats.totalQueries > 0 
      ? this.stats.totalExecutionTime / this.stats.totalQueries 
      : 0;

    // Get top patterns by count
    const topPatterns = Array.from(this.patterns.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Get slowest patterns
    const slowestPatterns = Array.from(this.patterns.values())
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 10);

    return {
      ...this.stats,
      avgDuration,
      slowQueryRate: this.stats.totalQueries > 0 
        ? this.stats.slowQueries / this.stats.totalQueries 
        : 0,
      topPatterns,
      slowestPatterns,
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.queries.clear();
    this.slowQueries = [];
    this.stats = {
      totalQueries: 0,
      totalExecutionTime: 0,
      slowQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
    this.patterns.clear();
  }
}

/**
 * Index manager for database indexes
 */
class IndexManager {
  constructor() {
    this.recommendedIndexes = new Map();
    this.createdIndexes = new Map();
    this.indexHistory = [];
  }

  /**
   * Analyze queries and suggest indexes
   * @param {mongoose.Model} model - Mongoose model
   * @param {Array} queries - Array of query objects
   * @returns {Array} Suggested indexes
   */
  async suggestIndexes(model, queries) {
    const suggestions = [];
    const modelName = model.modelName || model.name;

    // Get existing indexes
    const existingIndexes = await this.getIndexes(model);
    const existingKeys = existingIndexes.map(idx => 
      Object.keys(idx.key).sort().join(',')
    );

    // Analyze query patterns
    const fieldUsage = new Map();

    for (const query of queries) {
      const fields = this.extractQueryFields(query);
      
      for (const field of fields) {
        if (!fieldUsage.has(field)) {
          fieldUsage.set(field, { count: 0, queries: [] });
        }
        const usage = fieldUsage.get(field);
        usage.count++;
        if (!usage.queries.includes(JSON.stringify(query))) {
          usage.queries.push(JSON.stringify(query));
        }
      }
    }

    // Sort by usage count
    const sortedFields = Array.from(fieldUsage.entries())
      .sort((a, b) => b[1].count - a[1].count);

    // Suggest single-field indexes for frequently used fields
    for (const [field, usage] of sortedFields) {
      if (usage.count >= CONFIG.MIN_QUERY_COUNT_FOR_INDEX) {
        const indexKey = field;
        
        if (!existingKeys.includes(indexKey)) {
          suggestions.push({
            fields: { [field]: 1 },
            name: `${field}_1`,
            reason: `Used in ${usage.count} queries`,
            impact: 'medium',
            queries: usage.queries.slice(0, 3),
          });
        }
      }
    }

    // Suggest compound indexes for common field combinations
    const compoundSuggestions = this.suggestCompoundIndexes(queries, existingKeys);
    suggestions.push(...compoundSuggestions);

    // Store recommendations
    this.recommendedIndexes.set(modelName, suggestions);

    return suggestions;
  }

  /**
   * Extract fields from a query object
   * @param {Object} query - Query object
   * @param {string} prefix - Field prefix for nested objects
   * @returns {Array} Field names
   */
  extractQueryFields(query, prefix = '') {
    const fields = [];
    
    for (const [key, value] of Object.entries(query)) {
      if (key.startsWith('$')) continue; // Skip operators
      
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Check if it's an operator object
        const hasOperators = Object.keys(value).some(k => k.startsWith('$'));
        if (hasOperators) {
          fields.push(fullKey);
        } else {
          // Nested object
          fields.push(...this.extractQueryFields(value, fullKey));
        }
      } else {
        fields.push(fullKey);
      }
    }
    
    return fields;
  }

  /**
   * Suggest compound indexes
   * @param {Array} queries - Query objects
   * @param {Array} existingKeys - Existing index keys
   * @returns {Array} Compound index suggestions
   */
  suggestCompoundIndexes(queries, existingKeys) {
    const suggestions = [];
    const fieldCombinations = new Map();

    // Find common field combinations
    for (const query of queries) {
      const fields = this.extractQueryFields(query).sort();
      if (fields.length >= 2 && fields.length <= 4) {
        const combo = fields.join(',');
        if (!fieldCombinations.has(combo)) {
          fieldCombinations.set(combo, { count: 0, fields });
        }
        fieldCombinations.get(combo).count++;
      }
    }

    // Suggest indexes for common combinations
    for (const [combo, data] of fieldCombinations) {
      if (data.count >= CONFIG.MIN_QUERY_COUNT_FOR_INDEX && !existingKeys.includes(combo)) {
        const indexFields = {};
        data.fields.forEach(f => { indexFields[f] = 1; });
        
        suggestions.push({
          fields: indexFields,
          name: data.fields.join('_') + '_1',
          reason: `Common combination used in ${data.count} queries`,
          impact: 'high',
          fieldCount: data.fields.length,
        });
      }
    }

    return suggestions;
  }

  /**
   * Create an index on a model
   * @param {mongoose.Model} model - Mongoose model
   * @param {Object} fields - Index fields
   * @param {Object} options - Index options
   * @returns {Promise<Object>} Creation result
   */
  async createIndex(model, fields, options = {}) {
    const modelName = model.modelName || model.name;
    const indexName = options.name || Object.keys(fields).join('_') + '_1';

    try {
      const startTime = Date.now();
      await model.collection.createIndex(fields, options);
      const duration = Date.now() - startTime;

      const record = {
        modelName,
        indexName,
        fields,
        options,
        createdAt: new Date(),
        duration,
      };

      this.createdIndexes.set(`${modelName}.${indexName}`, record);
      this.indexHistory.push(record);

      return {
        success: true,
        modelName,
        indexName,
        duration,
      };
    } catch (error) {
      return {
        success: false,
        modelName,
        indexName,
        error: error.message,
      };
    }
  }

  /**
   * Drop an index from a model
   * @param {mongoose.Model} model - Mongoose model
   * @param {string} indexName - Index name
   * @returns {Promise<Object>} Drop result
   */
  async dropIndex(model, indexName) {
    const modelName = model.modelName || model.name;

    try {
      await model.collection.dropIndex(indexName);
      
      const key = `${modelName}.${indexName}`;
      this.createdIndexes.delete(key);

      return {
        success: true,
        modelName,
        indexName,
      };
    } catch (error) {
      return {
        success: false,
        modelName,
        indexName,
        error: error.message,
      };
    }
  }

  /**
   * Get all indexes for a model
   * @param {mongoose.Model} model - Mongoose model
   * @returns {Promise<Array>} Index information
   */
  async getIndexes(model) {
    try {
      const indexes = await model.collection.indexes();
      return indexes.map(idx => ({
        name: idx.name,
        key: idx.key,
        unique: idx.unique || false,
        sparse: idx.sparse || false,
        background: idx.background || false,
      }));
    } catch (error) {
      console.error('Error getting indexes:', error);
      return [];
    }
  }
}

/**
 * Query optimizer service
 */
class QueryOptimizer {
  constructor() {
    this.tracker = new QueryTracker();
    this.indexManager = new IndexManager();
  }

  /**
   * Analyze a query for performance issues
   * @param {mongoose.Model} model - Mongoose model
   * @param {Object} query - Query object
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeQuery(model, query, options = {}) {
    const modelName = model.modelName || model.name;
    const queryId = this.tracker.generateQueryId(modelName, query);
    
    const analysis = {
      queryId,
      modelName,
      query,
      timestamp: new Date(),
      issues: [],
      recommendations: [],
      indexSuggestions: [],
      estimatedCost: 'unknown',
    };

    // Check for common issues
    
    // 1. No index hint
    const hasIndexHint = options.hint || query.$hint;
    if (!hasIndexHint) {
      analysis.recommendations.push({
        type: 'index_hint',
        message: 'Consider adding an index hint for better performance',
        severity: 'low',
      });
    }

    // 2. Large result set potential
    if (options.limit === undefined || options.limit > CONFIG.MAX_PAGE_SIZE) {
      analysis.issues.push({
        type: 'large_result_set',
        message: `Query may return large result sets. Consider adding limit (max: ${CONFIG.MAX_PAGE_SIZE})`,
        severity: 'medium',
      });
    }

    // 3. Missing query filters
    const filterCount = Object.keys(query).filter(k => !k.startsWith('$')).length;
    if (filterCount === 0) {
      analysis.issues.push({
        type: 'no_filters',
        message: 'Query has no filters - will scan entire collection',
        severity: 'high',
      });
    }

    // 4. Check for $where or $expr (slow operators)
    const queryStr = JSON.stringify(query);
    if (queryStr.includes('$where')) {
      analysis.issues.push({
        type: 'slow_operator',
        message: 'Query uses $where which is slow and should be avoided',
        severity: 'high',
      });
    }

    // 5. Regex without index
    if (queryStr.includes('$regex') && !hasIndexHint) {
      analysis.issues.push({
        type: 'regex_without_index',
        message: 'Query uses regex without index hint - may cause collection scan',
        severity: 'medium',
      });
    }

    // 6. N+1 query pattern detection
    if (options.populate && !options.populate.$limit) {
      analysis.issues.push({
        type: 'potential_n_plus_1',
        message: 'Population without limit may cause N+1 query issues',
        severity: 'medium',
      });
    }

    // Get index suggestions
    analysis.indexSuggestions = await this.indexManager.suggestIndexes(model, [query]);

    // Check if query is cacheable
    analysis.cacheHint = this.getCacheHint(query, options);

    return analysis;
  }

  /**
   * Get cache hint for a query
   * @param {Object} query - Query object
   * @param {Object} options - Query options
   * @returns {Object} Cache hint
   */
  getCacheHint(query, options = {}) {
    const hint = {
      cacheable: false,
      reason: '',
      ttl: 0,
      key: null,
    };

    // Queries with specific IDs are cacheable
    if (query._id || query.id) {
      hint.cacheable = true;
      hint.reason = 'Single document lookup by ID';
      hint.ttl = 300; // 5 minutes
      hint.key = `doc:${query._id || query.id}`;
      return hint;
    }

    // Static filters (no time-based fields) are cacheable
    const queryStr = JSON.stringify(query);
    const hasTimeFields = /createdAt|updatedAt|date|time/i.test(queryStr);
    const hasRandom = /\$random|\$sample/i.test(queryStr);

    if (!hasTimeFields && !hasRandom && options.sort) {
      hint.cacheable = true;
      hint.reason = 'Static query with sorting';
      hint.ttl = 60; // 1 minute
      hint.key = `list:${Buffer.from(queryStr).toString('base64').substring(0, 32)}`;
    }

    return hint;
  }

  /**
   * Build an optimized query with pagination
   * @param {mongoose.Model} model - Mongoose model
   * @param {Object} filters - Query filters
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Query result with metadata
   */
  async buildOptimizedQuery(model, filters = {}, options = {}) {
    const modelName = model.modelName || model.name;
    const startTime = Date.now();

    // Normalize pagination
    const page = Math.max(1, parseInt(options.page, 10) || 1);
    const limit = Math.min(
      CONFIG.MAX_PAGE_SIZE,
      Math.max(1, parseInt(options.limit, 10) || CONFIG.DEFAULT_PAGE_SIZE)
    );
    const skip = (page - 1) * limit;

    // Build query
    let queryBuilder = model.find(filters);

    // Apply select
    if (options.select) {
      queryBuilder = queryBuilder.select(options.select);
    }

    // Apply populate with optimization
    if (options.populate) {
      const populateOptions = Array.isArray(options.populate) 
        ? options.populate 
        : [options.populate];
      
      for (const pop of populateOptions) {
        if (typeof pop === 'string') {
          queryBuilder = queryBuilder.populate(pop);
        } else {
          // Add limit to prevent N+1
          const optimizedPop = {
            ...pop,
            options: {
              ...pop.options,
              limit: pop.options?.limit || 100,
            },
          };
          queryBuilder = queryBuilder.populate(optimizedPop);
        }
      }
    }

    // Apply sorting
    if (options.sort) {
      queryBuilder = queryBuilder.sort(options.sort);
    } else {
      // Default sort by _id for consistent pagination
      queryBuilder = queryBuilder.sort({ _id: -1 });
    }

    // Apply pagination
    queryBuilder = queryBuilder.skip(skip).limit(limit);

    // Apply lean for better performance if not populating deeply
    if (options.lean !== false) {
      queryBuilder = queryBuilder.lean();
    }

    // Execute query
    const queryId = this.tracker.generateQueryId(modelName, filters);
    this.tracker.startQuery(queryId, modelName, filters, { page, limit });

    try {
      const [documents, totalCount] = await Promise.all([
        queryBuilder.exec(),
        model.countDocuments(filters),
      ]);

      const duration = Date.now() - startTime;

      // Track execution
      this.tracker.endQuery(queryId, duration, {
        documentCount: documents.length,
      });

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        data: documents,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage,
          hasPrevPage,
          nextPage: hasNextPage ? page + 1 : null,
          prevPage: hasPrevPage ? page - 1 : null,
        },
        performance: {
          duration,
          isSlow: duration > CONFIG.SLOW_QUERY_THRESHOLD,
        },
      };
    } catch (error) {
      this.tracker.endQuery(queryId, Date.now() - startTime, { error: true });
      throw error;
    }
  }

  /**
   * Build cursor-based paginated query (for large datasets)
   * @param {mongoose.Model} model - Mongoose model
   * @param {Object} filters - Query filters
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Query result with cursor
   */
  async buildCursorQuery(model, filters = {}, options = {}) {
    const modelName = model.modelName || model.name;
    const startTime = Date.now();

    const limit = Math.min(
      CONFIG.MAX_PAGE_SIZE,
      Math.max(1, parseInt(options.limit, 10) || CONFIG.CURSOR_PAGE_SIZE)
    );

    // Build cursor filter
    let cursorFilter = { ...filters };
    if (options.cursor) {
      try {
        const cursorData = JSON.parse(Buffer.from(options.cursor, 'base64').toString());
        cursorFilter = {
          ...cursorFilter,
          _id: { $lt: cursorData.id },
        };
      } catch (e) {
        // Invalid cursor, ignore
      }
    }

    // Build query
    let queryBuilder = model.find(cursorFilter)
      .sort({ _id: -1 })
      .limit(limit + 1); // Get one extra to check for next page

    if (options.select) {
      queryBuilder = queryBuilder.select(options.select);
    }

    if (options.lean !== false) {
      queryBuilder = queryBuilder.lean();
    }

    // Execute
    const queryId = this.tracker.generateQueryId(modelName, cursorFilter);
    this.tracker.startQuery(queryId, modelName, cursorFilter, { cursor: true, limit });

    try {
      const documents = await queryBuilder.exec();
      const duration = Date.now() - startTime;

      // Check if there's a next page
      const hasNextPage = documents.length > limit;
      const results = hasNextPage ? documents.slice(0, limit) : documents;

      // Generate next cursor
      let nextCursor = null;
      if (hasNextPage && results.length > 0) {
        const lastDoc = results[results.length - 1];
        const cursorData = { id: lastDoc._id.toString() };
        nextCursor = Buffer.from(JSON.stringify(cursorData)).toString('base64');
      }

      this.tracker.endQuery(queryId, duration, {
        documentCount: results.length,
      });

      return {
        data: results,
        pagination: {
          limit,
          hasNextPage,
          nextCursor,
        },
        performance: {
          duration,
          isSlow: duration > CONFIG.SLOW_QUERY_THRESHOLD,
        },
      };
    } catch (error) {
      this.tracker.endQuery(queryId, Date.now() - startTime, { error: true });
      throw error;
    }
  }

  /**
   * Get MongoDB explain plan for a query
   * @param {mongoose.Model} model - Mongoose model
   * @param {Object} query - Query object
   * @returns {Promise<Object>} Explain plan
   */
  async explainQuery(model, query) {
    try {
      const explanation = await model.find(query).explain('executionStats');
      
      return {
        queryPlanner: explanation.queryPlanner,
        executionStats: {
          executionSuccess: explanation.executionStats.executionSuccess,
          nReturned: explanation.executionStats.nReturned,
          executionTimeMillis: explanation.executionStats.executionTimeMillis,
          totalDocsExamined: explanation.executionStats.totalDocsExamined,
          totalKeysExamined: explanation.executionStats.totalKeysExamined,
          stage: explanation.executionStats.stage,
        },
        indexUsage: explanation.queryPlanner.winningPlan.inputStage || explanation.queryPlanner.winningPlan,
      };
    } catch (error) {
      return {
        error: error.message,
      };
    }
  }

  /**
   * Track query execution
   * @param {string} queryId - Query ID
   * @param {number} duration - Execution duration in ms
   * @param {Object} metadata - Additional metadata
   */
  trackQueryExecution(queryId, duration, metadata = {}) {
    return this.tracker.endQuery(queryId, duration, metadata);
  }

  /**
   * Get slow queries
   * @param {number} threshold - Duration threshold in ms
   * @returns {Array} Slow queries
   */
  getSlowQueries(threshold = CONFIG.SLOW_QUERY_THRESHOLD) {
    return this.tracker.getSlowQueries(threshold);
  }

  /**
   * Get query statistics
   * @returns {Object} Statistics
   */
  getQueryStats() {
    return this.tracker.getStats();
  }

  /**
   * Optimize aggregation pipeline
   * @param {Array} pipeline - Aggregation pipeline
   * @returns {Object} Optimized pipeline with recommendations
   */
  optimizeAggregation(pipeline) {
    const optimized = [...pipeline];
    const recommendations = [];

    // 1. Move $match stages early
    const matchIndices = optimized
      .map((stage, i) => ({ stage, index: i }))
      .filter(({ stage }) => stage.$match)
      .map(({ index }) => index);

    if (matchIndices.length > 0 && matchIndices[0] > 0) {
      recommendations.push({
        type: 'match_early',
        message: 'Move $match stages to the beginning of the pipeline',
        severity: 'high',
      });
    }

    // 2. Check for $lookup without index hints
    const lookupStages = optimized.filter(stage => stage.$lookup);
    if (lookupStages.length > 0) {
      recommendations.push({
        type: 'lookup_optimization',
        message: `Found ${lookupStages.length} $lookup stage(s). Ensure foreign fields are indexed.`,
        severity: 'medium',
      });
    }

    // 3. Check for $group without preceding $match
    const groupIndices = optimized
      .map((stage, i) => ({ stage, index: i }))
      .filter(({ stage }) => stage.$group)
      .map(({ index }) => index);

    for (const groupIndex of groupIndices) {
      const hasPrecedingMatch = optimized
        .slice(0, groupIndex)
        .some(stage => stage.$match);
      
      if (!hasPrecedingMatch) {
        recommendations.push({
          type: 'group_without_match',
          message: 'Consider adding a $match stage before $group to reduce data volume',
          severity: 'medium',
          stageIndex: groupIndex,
        });
      }
    }

    // 4. Check for multiple $sort stages
    const sortCount = optimized.filter(stage => stage.$sort).length;
    if (sortCount > 1) {
      recommendations.push({
        type: 'multiple_sorts',
        message: 'Multiple $sort stages detected. Consider consolidating.',
        severity: 'low',
      });
    }

    // 5. Check for $skip without $limit
    const skipIndices = optimized
      .map((stage, i) => ({ stage, index: i }))
      .filter(({ stage }) => stage.$skip)
      .map(({ index }) => index);

    for (const skipIndex of skipIndices) {
      const hasFollowingLimit = optimized
        .slice(skipIndex + 1)
        .some(stage => stage.$limit);
      
      if (!hasFollowingLimit) {
        recommendations.push({
          type: 'skip_without_limit',
          message: '$skip without following $limit can cause performance issues',
          severity: 'medium',
          stageIndex: skipIndex,
        });
      }
    }

    return {
      originalPipeline: pipeline,
      optimizedPipeline: optimized,
      recommendations,
      stageCount: optimized.length,
    };
  }

  /**
   * Create an index on a model
   * @param {mongoose.Model} model - Mongoose model
   * @param {Object} fields - Index fields
   * @param {Object} options - Index options
   * @returns {Promise<Object>} Creation result
   */
  async createIndex(model, fields, options = {}) {
    return this.indexManager.createIndex(model, fields, options);
  }

  /**
   * Drop an index from a model
   * @param {mongoose.Model} model - Mongoose model
   * @param {string} indexName - Index name
   * @returns {Promise<Object>} Drop result
   */
  async dropIndex(model, indexName) {
    return this.indexManager.dropIndex(model, indexName);
  }

  /**
   * Get all indexes for a model
   * @param {mongoose.Model} model - Mongoose model
   * @returns {Promise<Array>} Index information
   */
  async getIndexes(model) {
    return this.indexManager.getIndexes(model);
  }

  /**
   * Suggest indexes based on query patterns
   * @param {mongoose.Model} model - Mongoose model
   * @param {Array} queries - Query objects
   * @returns {Promise<Array>} Index suggestions
   */
  async suggestIndexes(model, queries) {
    return this.indexManager.suggestIndexes(model, queries);
  }

  /**
   * Analyze collection statistics
   * @param {mongoose.Model} model - Mongoose model
   * @returns {Promise<Object>} Collection statistics
   */
  async analyzeCollectionStats(model) {
    try {
      const stats = await model.collection.stats();
      const indexes = await this.getIndexes(model);

      return {
        collectionName: stats.ns,
        documentCount: stats.count,
        size: {
          data: stats.size,
          storage: stats.storageSize,
          index: stats.totalIndexSize,
          avgDocument: stats.avgObjSize,
        },
        indexes: indexes.map(idx => ({
          name: idx.name,
          size: stats.indexSizes?.[idx.name] || 0,
          key: idx.key,
        })),
        fragmentation: stats.storageSize > 0 
          ? ((stats.storageSize - stats.size) / stats.storageSize * 100).toFixed(2)
          : 0,
        capped: stats.capped,
        nindexes: stats.nindexes,
      };
    } catch (error) {
      return {
        error: error.message,
      };
    }
  }

  /**
   * Get optimization recommendations for a model
   * @param {mongoose.Model} model - Mongoose model
   * @returns {Promise<Object>} Recommendations
   */
  async getOptimizationRecommendations(model) {
    const recommendations = [];
    
    // Get collection stats
    const stats = await this.analyzeCollectionStats(model);
    
    if (stats.error) {
      return { error: stats.error };
    }

    // Check for missing _id index (should never happen, but good to check)
    const hasIdIndex = stats.indexes.some(idx => idx.name === '_id_');
    if (!hasIdIndex) {
      recommendations.push({
        type: 'critical',
        message: 'Missing _id index - this should not happen!',
        action: 'immediate_attention',
      });
    }

    // Check index ratio
    const indexRatio = stats.size.index / stats.size.data;
    if (indexRatio > 1) {
      recommendations.push({
        type: 'index_size',
        message: `Index size (${(stats.size.index / 1024 / 1024).toFixed(2)}MB) is larger than data size. Consider removing unused indexes.`,
        action: 'review_indexes',
      });
    }

    // Check for high fragmentation
    if (parseFloat(stats.fragmentation) > 20) {
      recommendations.push({
        type: 'fragmentation',
        message: `Collection fragmentation is ${stats.fragmentation}%. Consider compacting.`,
        action: 'compact_collection',
      });
    }

    // Check document count vs index count
    if (stats.documentCount > 100000 && stats.nindexes < 3) {
      recommendations.push({
        type: 'missing_indexes',
        message: `Large collection (${stats.documentCount} docs) has only ${stats.nindexes} indexes. Consider adding more indexes.`,
        action: 'analyze_queries',
      });
    }

    return {
      modelName: model.modelName || model.name,
      stats,
      recommendations,
      timestamp: new Date(),
    };
  }

  /**
   * Reset all statistics
   */
  resetStats() {
    this.tracker.resetStats();
  }
}

// Export singleton instance
const queryOptimizer = new QueryOptimizer();
module.exports = queryOptimizer;
