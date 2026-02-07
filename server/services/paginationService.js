/**
 * Pagination Service
 * Advanced pagination utilities for large datasets
 * Supports cursor-based and offset-based pagination with optimization
 */

const mongoose = require('mongoose');
const performanceConfig = require('../config/performance.js');

const { query: config } = performanceConfig;

/**
 * Pagination Service
 */
class PaginationService {
  constructor() {
    this.DEFAULT_PAGE_SIZE = config.pagination.defaultPageSize;
    this.MAX_PAGE_SIZE = config.pagination.maxPageSize;
    this.CURSOR_PAGE_SIZE = config.pagination.cursorPageSize;
  }
  
  /**
   * Validate and normalize pagination parameters
   */
  normalizeParams(options = {}) {
    const page = Math.max(1, parseInt(options.page, 10) || 1);
    const limit = Math.min(
      this.MAX_PAGE_SIZE,
      Math.max(1, parseInt(options.limit, 10) || this.DEFAULT_PAGE_SIZE)
    );
    const skip = (page - 1) * limit;
    
    return {
      page,
      limit,
      skip,
      sort: options.sort || { createdAt: -1 },
      fields: options.fields || null,
    };
  }
  
  /**
   * Offset-based pagination (traditional)
   * Best for: Small datasets, random access to pages
   */
  async paginate(model, query = {}, options = {}) {
    const params = this.normalizeParams(options);
    const { page, limit, skip, sort, fields } = params;
    
    // Build query with pagination
    let dbQuery = model.find(query);
    
    // Apply field selection
    if (fields) {
      dbQuery = dbQuery.select(fields);
    }
    
    // Apply sorting
    dbQuery = dbQuery.sort(sort);
    
    // Apply pagination
    dbQuery = dbQuery.skip(skip).limit(limit);
    
    // Execute query and count in parallel
    const [docs, total] = await Promise.all([
      dbQuery.exec(),
      model.countDocuments(query),
    ]);
    
    const totalPages = Math.ceil(total / limit);
    
    return {
      data: docs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        nextPage: page < totalPages ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null,
      },
    };
  }
  
  /**
   * Cursor-based pagination (optimized for large datasets)
   * Best for: Large datasets, real-time data, infinite scroll
   */
  async cursorPaginate(model, query = {}, options = {}) {
    const limit = Math.min(
      this.MAX_PAGE_SIZE,
      Math.max(1, parseInt(options.limit, 10) || this.CURSOR_PAGE_SIZE)
    );
    const sort = options.sort || { createdAt: -1 };
    const cursor = options.cursor || null;
    const sortField = Object.keys(sort)[0];
    const sortDirection = sort[sortField];
    
    // Build query with cursor
    let dbQuery = { ...query };
    
    if (cursor) {
      const decodedCursor = this.decodeCursor(cursor);
      if (decodedCursor) {
        const cursorValue = decodedCursor[sortField];
        const cursorOperator = sortDirection === -1 ? '$lt' : '$gt';
        
        dbQuery = {
          ...dbQuery,
          [sortField]: { [cursorOperator]: cursorValue },
        };
      }
    }
    
    // Execute query
    let dbOperation = model.find(dbQuery)
      .sort(sort)
      .limit(limit + 1); // Get one extra to check if there's more
    
    if (options.fields) {
      dbOperation = dbOperation.select(options.fields);
    }
    
    const docs = await dbOperation.exec();
    
    // Check if there's more data
    const hasMore = docs.length > limit;
    const data = hasMore ? docs.slice(0, limit) : docs;
    
    // Generate next cursor
    let nextCursor = null;
    if (hasMore && data.length > 0) {
      const lastDoc = data[data.length - 1];
      nextCursor = this.encodeCursor({
        [sortField]: lastDoc[sortField],
        _id: lastDoc._id,
      });
    }
    
    return {
      data,
      pagination: {
        limit,
        hasMore,
        nextCursor,
        totalReturned: data.length,
      },
    };
  }
  
  /**
   * Keyset pagination (for stable ordering)
   * Best for: Large datasets with unique sort fields
   */
  async keysetPaginate(model, query = {}, options = {}) {
    const limit = Math.min(
      this.MAX_PAGE_SIZE,
      Math.max(1, parseInt(options.limit, 10) || this.CURSOR_PAGE_SIZE)
    );
    const sort = options.sort || { _id: -1 };
    const lastValue = options.lastValue || null;
    const lastId = options.lastId || null;
    const sortField = Object.keys(sort)[0];
    const sortDirection = sort[sortField];
    
    // Build query with keyset
    let dbQuery = { ...query };
    
    if (lastValue && lastId) {
      const cursorOperator = sortDirection === -1 ? '$lt' : '$gt';
      
      dbQuery = {
        ...dbQuery,
        $or: [
          { [sortField]: { [cursorOperator]: lastValue } },
          {
            [sortField]: lastValue,
            _id: { [cursorOperator]: lastId },
          },
        ],
      };
    }
    
    // Execute query
    let dbOperation = model.find(dbQuery)
      .sort({ [sortField]: sortDirection, _id: sortDirection })
      .limit(limit + 1);
    
    if (options.fields) {
      dbOperation = dbOperation.select(options.fields);
    }
    
    const docs = await dbOperation.exec();
    
    // Check if there's more data
    const hasMore = docs.length > limit;
    const data = hasMore ? docs.slice(0, limit) : docs;
    
    // Get next keyset values
    let nextLastValue = null;
    let nextLastId = null;
    if (hasMore && data.length > 0) {
      const lastDoc = data[data.length - 1];
      nextLastValue = lastDoc[sortField];
      nextLastId = lastDoc._id;
    }
    
    return {
      data,
      pagination: {
        limit,
        hasMore,
        nextLastValue,
        nextLastId,
        totalReturned: data.length,
      },
    };
  }
  
  /**
   * Search pagination with highlighting
   */
  async searchPaginate(model, searchQuery, options = {}) {
    const params = this.normalizeParams(options);
    const { page, limit, skip, fields } = params;
    
    // Build search aggregation
    const pipeline = [
      { $match: searchQuery },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            ...(fields ? [{ $project: fields }] : []),
          ],
          total: [{ $count: 'count' }],
        },
      },
    ];
    
    const result = await model.aggregate(pipeline);
    const data = result[0].data;
    const total = result[0].total[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);
    
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }
  
  /**
   * Aggregate pagination for complex queries
   */
  async aggregatePaginate(model, pipeline, options = {}) {
    const params = this.normalizeParams(options);
    const { page, limit, skip } = params;
    
    // Add pagination stages
    const paginatedPipeline = [
      ...pipeline,
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          total: [{ $count: 'count' }],
        },
      },
    ];
    
    const result = await model.aggregate(paginatedPipeline);
    const data = result[0].data;
    const total = result[0].total[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);
    
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }
  
  /**
   * Stream large datasets
   */
  async *streamPaginate(model, query = {}, options = {}) {
    const batchSize = options.batchSize || 100;
    let skip = 0;
    let hasMore = true;
    
    while (hasMore) {
      const docs = await model
        .find(query)
        .sort(options.sort || { createdAt: -1 })
        .skip(skip)
        .limit(batchSize)
        .exec();
      
      if (docs.length === 0) {
        hasMore = false;
        break;
      }
      
      for (const doc of docs) {
        yield doc;
      }
      
      skip += batchSize;
      hasMore = docs.length === batchSize;
    }
  }
  
  /**
   * Encode cursor
   */
  encodeCursor(data) {
    const json = JSON.stringify(data);
    return Buffer.from(json).toString('base64url');
  }
  
  /**
   * Decode cursor
   */
  decodeCursor(cursor) {
    try {
      const json = Buffer.from(cursor, 'base64url').toString('utf8');
      return JSON.parse(json);
    } catch {
      return null;
    }
  }
  
  /**
   * Create pagination metadata for response
   */
  createMetadata(pagination, baseUrl, queryParams = {}) {
    const { page, limit, total, totalPages } = pagination;
    
    const buildUrl = (p) => {
      const params = new URLSearchParams({ ...queryParams, page: p, limit });
      return `${baseUrl}?${params.toString()}`;
    };
    
    return {
      self: buildUrl(page),
      first: buildUrl(1),
      last: buildUrl(totalPages),
      next: pagination.hasNextPage ? buildUrl(page + 1) : null,
      prev: pagination.hasPrevPage ? buildUrl(page - 1) : null,
    };
  }
  
  /**
   * Optimize query for pagination
   */
  optimizeQuery(query, options = {}) {
    const optimized = { ...query };
    
    // Add index hints if specified
    if (options.hint) {
      optimized.$hint = options.hint;
    }
    
    // Add query timeout
    if (options.maxTimeMS) {
      optimized.maxTimeMS = options.maxTimeMS;
    }
    
    // Use covered queries when possible
    if (options.covered && options.fields) {
      // Ensure _id is included if needed
      if (!options.fields._id) {
        options.fields._id = 0;
      }
    }
    
    return optimized;
  }
  
  /**
   * Get pagination recommendations
   */
  getRecommendations(totalCount) {
    const recommendations = {
      useCursor: false,
      useKeyset: false,
      suggestedPageSize: this.DEFAULT_PAGE_SIZE,
    };
    
    if (totalCount > 10000) {
      recommendations.useCursor = true;
      recommendations.suggestedPageSize = this.CURSOR_PAGE_SIZE;
    }
    
    if (totalCount > 100000) {
      recommendations.useKeyset = true;
      recommendations.useCursor = false;
    }
    
    return recommendations;
  }
}

// Create singleton instance
const paginationService = new PaginationService();

module.exports = paginationService;