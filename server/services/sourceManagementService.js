/**
 * Source Management Service
 * Handles CRUD operations and management of scraping sources
 * Manages source configurations, health checks, and statistics
 */

const ScrapingSource = require('../models/ScrapingSource.js');
const ScrapingJob = require('../models/ScrapingJob.js');
const ScrapingLog = require('../models/ScrapingLog.js');
const AuditLog = require('../models/AuditLog.js');
const axios = require('axios');

class SourceManagementService {
  /**
   * Create a new scraping source
   */
  async createSource(sourceData, userId) {
    // Validate base URL
    if (sourceData.baseUrl) {
      try {
        new URL(sourceData.baseUrl);
      } catch {
        throw new Error('Invalid base URL format');
      }
    }

    // Check for duplicate name
    const existingSource = await ScrapingSource.findOne({
      name: { $regex: new RegExp(`^${sourceData.name}$`, 'i') },
    });

    if (existingSource) {
      throw new Error('A source with this name already exists');
    }

    const source = new ScrapingSource({
      ...sourceData,
      createdBy: userId,
      updatedBy: userId,
    });

    await source.save();

    await AuditLog.create({
      action: 'SCRAPING_SOURCE_CREATED',
      userId,
      entityType: 'ScrapingSource',
      entityId: source._id,
      details: { sourceName: source.name, type: source.type },
    });

    return source;
  }

  /**
   * Get all sources with filtering
   */
  async getSources(filters = {}, options = {}) {
    const query = {};

    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    if (filters.category) query.category = filters.category;
    if (filters.country) query.country = filters.country;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    if (filters.isEnabled !== undefined) query.isEnabled = filters.isEnabled;
    if (filters.tags) query.tags = { $in: filters.tags };
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
        { baseUrl: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 20;
    const sort = options.sort || { priority: -1, name: 1 };

    const [sources, total] = await Promise.all([
      ScrapingSource.find(query)
        .populate('createdBy', 'name email')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit),
      ScrapingSource.countDocuments(query),
    ]);

    return {
      sources,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get source by ID
   */
  async getSourceById(sourceId) {
    const source = await ScrapingSource.findById(sourceId)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!source) {
      throw new Error('Source not found');
    }

    return source;
  }

  /**
   * Update source
   */
  async updateSource(sourceId, updateData, userId) {
    const source = await ScrapingSource.findById(sourceId);
    if (!source) {
      throw new Error('Source not found');
    }

    // Track changes for audit
    const changes = [];
    Object.keys(updateData).forEach(key => {
      if (JSON.stringify(source[key]) !== JSON.stringify(updateData[key])) {
        changes.push({
          field: key,
          oldValue: source[key],
          newValue: updateData[key],
        });
      }
    });

    Object.assign(source, updateData);
    source.updatedBy = userId;
    await source.save();

    if (changes.length > 0) {
      await AuditLog.create({
        action: 'SCRAPING_SOURCE_UPDATED',
        userId,
        entityType: 'ScrapingSource',
        entityId: source._id,
        details: { changes },
      });
    }

    return source;
  }

  /**
   * Delete source
   */
  async deleteSource(sourceId, userId) {
    const source = await ScrapingSource.findById(sourceId);
    if (!source) {
      throw new Error('Source not found');
    }

    // Check if source is used in any jobs
    const jobsUsingSource = await ScrapingJob.countDocuments({
      'sources.sourceId': sourceId,
      status: { $in: ['pending', 'queued', 'running', 'paused'] },
    });

    if (jobsUsingSource > 0) {
      throw new Error('Cannot delete source that is used in active jobs');
    }

    await ScrapingSource.findByIdAndDelete(sourceId);

    await AuditLog.create({
      action: 'SCRAPING_SOURCE_DELETED',
      userId,
      entityType: 'ScrapingSource',
      entityId: sourceId,
      details: { sourceName: source.name },
    });

    return { success: true };
  }

  /**
   * Enable/disable source
   */
  async toggleSourceStatus(sourceId, enabled, userId) {
    const source = await ScrapingSource.findById(sourceId);
    if (!source) {
      throw new Error('Source not found');
    }

    await source.setEnabled(enabled);

    await AuditLog.create({
      action: enabled ? 'SCRAPING_SOURCE_ENABLED' : 'SCRAPING_SOURCE_DISABLED',
      userId,
      entityType: 'ScrapingSource',
      entityId: source._id,
    });

    return source;
  }

  /**
   * Add proxy to source
   */
  async addProxy(sourceId, proxyConfig, userId) {
    const source = await ScrapingSource.findById(sourceId);
    if (!source) {
      throw new Error('Source not found');
    }

    // Validate proxy config
    if (!proxyConfig.host || !proxyConfig.port) {
      throw new Error('Proxy host and port are required');
    }

    await source.addProxy(proxyConfig);

    await AuditLog.create({
      action: 'SCRAPING_SOURCE_PROXY_ADDED',
      userId,
      entityType: 'ScrapingSource',
      entityId: source._id,
      details: { proxyHost: proxyConfig.host },
    });

    return source;
  }

  /**
   * Remove proxy from source
   */
  async removeProxy(sourceId, proxyId, userId) {
    const source = await ScrapingSource.findById(sourceId);
    if (!source) {
      throw new Error('Source not found');
    }

    await source.removeProxy(proxyId);

    await AuditLog.create({
      action: 'SCRAPING_SOURCE_PROXY_REMOVED',
      userId,
      entityType: 'ScrapingSource',
      entityId: source._id,
      details: { proxyId },
    });

    return source;
  }

  /**
   * Test proxy connectivity
   */
  async testProxy(proxyConfig) {
    try {
      const proxyUrl = `${proxyConfig.protocol || 'http'}://${proxyConfig.host}:${proxyConfig.port}`;
      const startTime = Date.now();

      const response = await axios.get('https://httpbin.org/ip', {
        proxy: {
          host: proxyConfig.host,
          port: proxyConfig.port,
          auth: proxyConfig.username && proxyConfig.password ? {
            username: proxyConfig.username,
            password: proxyConfig.password,
          } : undefined,
        },
        timeout: 10000,
      });

      const responseTime = Date.now() - startTime;

      return {
        success: true,
        responseTime,
        ip: response.data.origin,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Test source connectivity
   */
  async testSource(sourceId) {
    const source = await ScrapingSource.findById(sourceId);
    if (!source) {
      throw new Error('Source not found');
    }

    const startTime = Date.now();
    let success = false;
    let errorMessage = null;
    let responseTime = 0;

    try {
      const proxy = source.getNextProxy();
      const axiosConfig = {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      };

      if (proxy) {
        axiosConfig.proxy = {
          host: proxy.host,
          port: proxy.port,
          auth: proxy.username && proxy.password ? {
            username: proxy.username,
            password: proxy.password,
          } : undefined,
        };
      }

      const response = await axios.get(source.baseUrl, axiosConfig);
      responseTime = Date.now() - startTime;
      success = response.status === 200;
    } catch (error) {
      errorMessage = error.message;
      responseTime = Date.now() - startTime;
    }

    // Update health check
    source.health.lastChecked = new Date();
    source.health.responseTime = responseTime;
    source.health.status = success ? 'healthy' : 'unhealthy';
    source.health.errorMessage = errorMessage;

    if (success) {
      source.health.consecutiveSuccesses += 1;
      source.health.consecutiveFailures = 0;
    } else {
      source.health.consecutiveFailures += 1;
      source.health.consecutiveSuccesses = 0;
    }

    await source.save();

    return {
      success,
      responseTime,
      errorMessage,
      health: source.health,
    };
  }

  /**
   * Get source statistics
   */
  async getSourceStatistics(sourceId, dateRange = {}) {
    const source = await ScrapingSource.findById(sourceId);
    if (!source) {
      throw new Error('Source not found');
    }

    const matchStage = { 'source.sourceId': source._id };
    if (dateRange.from || dateRange.to) {
      matchStage.createdAt = {};
      if (dateRange.from) matchStage.createdAt.$gte = new Date(dateRange.from);
      if (dateRange.to) matchStage.createdAt.$lte = new Date(dateRange.to);
    }

    const [jobsStats, logsStats, cvStats] = await Promise.all([
      // Jobs statistics
      ScrapingJob.aggregate([
        { $match: { 'sources.sourceId': source._id } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),

      // Logs statistics
      ScrapingLog.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
          },
        },
      ]),

      // CV statistics
      ScrapingLog.aggregate([
        { $match: { ...matchStage, type: 'success' } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return {
      source: {
        id: source._id,
        name: source.name,
        statistics: source.statistics,
        health: source.health,
      },
      jobs: jobsStats,
      logs: logsStats,
      dailyScrapes: cvStats,
    };
  }

  /**
   * Get overall statistics
   */
  async getOverallStatistics() {
    return ScrapingSource.getOverallStatistics();
  }

  /**
   * Get active sources
   */
  async getActiveSources() {
    return ScrapingSource.getActiveSources();
  }

  /**
   * Bulk update sources
   */
  async bulkUpdate(sourceIds, updateData, userId) {
    const results = {
      success: [],
      failed: [],
    };

    for (const sourceId of sourceIds) {
      try {
        await this.updateSource(sourceId, updateData, userId);
        results.success.push(sourceId);
      } catch (error) {
        results.failed.push({ sourceId, error: error.message });
      }
    }

    await AuditLog.create({
      action: 'SCRAPING_SOURCE_BULK_UPDATE',
      userId,
      entityType: 'ScrapingSource',
      details: { sourceIds, updateData, results },
    });

    return results;
  }

  /**
   * Reorder sources by priority
   */
  async reorderSources(sourceOrders, userId) {
    const updates = sourceOrders.map(({ sourceId, priority }) =>
      ScrapingSource.findByIdAndUpdate(sourceId, { priority })
    );

    await Promise.all(updates);

    await AuditLog.create({
      action: 'SCRAPING_SOURCE_REORDERED',
      userId,
      entityType: 'ScrapingSource',
      details: { sourceOrders },
    });

    return { success: true };
  }

  /**
   * Clone source
   */
  async cloneSource(sourceId, userId, overrides = {}) {
    const originalSource = await ScrapingSource.findById(sourceId);
    if (!originalSource) {
      throw new Error('Source not found');
    }

    const clonedData = {
      name: `${originalSource.name} (Copy)`,
      description: originalSource.description,
      type: originalSource.type,
      baseUrl: originalSource.baseUrl,
      category: originalSource.category,
      rateLimit: originalSource.rateLimit,
      config: originalSource.config,
      ...overrides,
    };

    return this.createSource(clonedData, userId);
  }

  /**
   * Get source categories
   */
  async getCategories() {
    const categories = await ScrapingSource.distinct('category');
    return categories;
  }

  /**
   * Get source types
   */
  async getTypes() {
    return ['job_portal', 'social_media', 'company_career', 'aggregator', 'api', 'custom'];
  }

  /**
   * Export source configuration
   */
  async exportConfiguration(sourceId) {
    const source = await ScrapingSource.findById(sourceId);
    if (!source) {
      throw new Error('Source not found');
    }

    // Remove sensitive data
    const exportData = source.toObject();
    delete exportData._id;
    delete exportData.createdBy;
    delete exportData.updatedBy;
    delete exportData.createdAt;
    delete exportData.updatedAt;
    delete exportData.__v;

    // Remove sensitive auth info
    if (exportData.auth) {
      delete exportData.auth.apiKey?.value;
      delete exportData.auth.oauth2?.clientSecret;
      delete exportData.auth.oauth2?.accessToken;
      delete exportData.auth.oauth2?.refreshToken;
      delete exportData.auth.basic?.password;
    }

    // Remove proxy passwords
    if (exportData.proxies) {
      exportData.proxies = exportData.proxies.map(p => {
        const { password, ...rest } = p;
        return rest;
      });
    }

    return exportData;
  }

  /**
   * Import source configuration
   */
  async importConfiguration(configData, userId) {
    // Validate required fields
    if (!configData.name || !configData.baseUrl) {
      throw new Error('Name and base URL are required');
    }

    // Check for existing source with same name
    const existingSource = await ScrapingSource.findOne({
      name: { $regex: new RegExp(`^${configData.name}$`, 'i') },
    });

    if (existingSource) {
      throw new Error('A source with this name already exists');
    }

    // Reset statistics
    configData.statistics = {
      totalScraped: 0,
      successfulScrapes: 0,
      failedScrapes: 0,
      successRate: 100,
    };

    configData.health = {
      status: 'unknown',
      lastChecked: null,
    };

    return this.createSource(configData, userId);
  }
}

module.exports = new SourceManagementService();