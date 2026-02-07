/**
 * Database Index Service
 * Manages MongoDB indexes for optimal query performance
 * Includes index creation, monitoring, and optimization
 */

const mongoose = require('mongoose');
const performanceConfig = require('../config/performance.js');

/**
 * Index definitions for all models
 */
const INDEX_DEFINITIONS = {
  // User model indexes
  User: [
    { fields: { email: 1 }, options: { unique: true } },
    { fields: { role: 1 }, options: {} },
    { fields: { 'referrerProfile.referralCode': 1 }, options: { unique: true, sparse: true } },
    { fields: { 'referrerProfile.kycStatus': 1 }, options: {} },
    { fields: { createdAt: -1 }, options: {} },
    { fields: { lastLoginAt: -1 }, options: {} },
    { fields: { role: 1, createdAt: -1 }, options: {} },
    { fields: { 'referrerProfile.totalEarnings': -1 }, options: {} },
  ],
  
  // Job model indexes
  Job: [
    { fields: { companyId: 1 }, options: {} },
    { fields: { status: 1 }, options: {} },
    { fields: { 'location.city': 1 }, options: {} },
    { fields: { category: 1 }, options: {} },
    { fields: { createdAt: -1 }, options: {} },
    { fields: { featured: 1, createdAt: -1 }, options: {} },
    { fields: { status: 1, createdAt: -1 }, options: {} },
    { fields: { companyId: 1, status: 1 }, options: {} },
    { fields: { category: 1, status: 1, createdAt: -1 }, options: {} },
    { fields: { 'location.city': 1, status: 1 }, options: {} },
    { fields: { title: 'text', description: 'text' }, options: { name: 'job_text_search' } },
    { fields: { tags: 1 }, options: {} },
    { fields: { 'salary.min': 1, 'salary.max': 1 }, options: {} },
    { fields: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } }, // TTL index
  ],
  
  // Referral model indexes
  Referral: [
    { fields: { referrerId: 1 }, options: {} },
    { fields: { jobId: 1 }, options: {} },
    { fields: { companyId: 1 }, options: {} },
    { fields: { status: 1 }, options: {} },
    { fields: { createdAt: -1 }, options: {} },
    { fields: { referrerId: 1, status: 1 }, options: {} },
    { fields: { jobId: 1, status: 1 }, options: {} },
    { fields: { companyId: 1, status: 1, createdAt: -1 }, options: {} },
    { fields: { 'referredPerson.email': 1 }, options: {} },
    { fields: { referrerId: 1, createdAt: -1 }, options: {} },
  ],
  
  // Application model indexes
  Application: [
    { fields: { jobId: 1 }, options: {} },
    { fields: { applicantId: 1 }, options: {} },
    { fields: { companyId: 1 }, options: {} },
    { fields: { status: 1 }, options: {} },
    { fields: { createdAt: -1 }, options: {} },
    { fields: { jobId: 1, applicantId: 1 }, options: { unique: true } },
    { fields: { applicantId: 1, status: 1 }, options: {} },
    { fields: { companyId: 1, status: 1, createdAt: -1 }, options: {} },
  ],
  
  // CVData model indexes
  CVData: [
    { fields: { 'contactInfo.email': 1 }, options: { sparse: true } },
    { fields: { 'contactInfo.phone': 1 }, options: { sparse: true } },
    { fields: { userId: 1 }, options: { sparse: true } },
    { fields: { skills: 1 }, options: {} },
    { fields: { 'workExperience.company': 1 }, options: {} },
    { fields: { 'workExperience.title': 1 }, options: {} },
    { fields: { 'education.institution': 1 }, options: {} },
    { fields: { createdAt: -1 }, options: {} },
    { fields: { parsedAt: -1 }, options: {} },
    { fields: { 'contactInfo.email': 1, 'contactInfo.phone': 1 }, options: {} },
    { fields: { skills: 'text', 'workExperience.description': 'text' }, options: { name: 'cv_text_search' } },
  ],
  
  // Company model indexes
  Company: [
    { fields: { slug: 1 }, options: { unique: true } },
    { fields: { status: 1 }, options: {} },
    { fields: { industry: 1 }, options: {} },
    { fields: { 'location.city': 1 }, options: {} },
    { fields: { createdAt: -1 }, options: {} },
    { fields: { featured: 1, createdAt: -1 }, options: {} },
    { fields: { name: 'text', description: 'text' }, options: { name: 'company_text_search' } },
  ],
  
  // PaymentTransaction model indexes
  PaymentTransaction: [
    { fields: { userId: 1 }, options: {} },
    { fields: { status: 1 }, options: {} },
    { fields: { type: 1 }, options: {} },
    { fields: { provider: 1 }, options: {} },
    { fields: { createdAt: -1 }, options: {} },
    { fields: { userId: 1, status: 1, createdAt: -1 }, options: {} },
    { fields: { reference: 1 }, options: { unique: true, sparse: true } },
    { fields: { externalId: 1 }, options: { sparse: true } },
  ],
  
  // ChatMessage model indexes
  ChatMessage: [
    { fields: { sessionId: 1 }, options: {} },
    { fields: { userId: 1 }, options: {} },
    { fields: { createdAt: -1 }, options: {} },
    { fields: { sessionId: 1, createdAt: -1 }, options: {} },
    { fields: { 'intent.name': 1 }, options: {} },
  ],
  
  // Notification model indexes
  Notification: [
    { fields: { userId: 1 }, options: {} },
    { fields: { read: 1 }, options: {} },
    { fields: { createdAt: -1 }, options: {} },
    { fields: { userId: 1, read: 1, createdAt: -1 }, options: {} },
    { fields: { type: 1 }, options: {} },
    { fields: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } }, // TTL index
  ],
  
  // AuditLog model indexes
  AuditLog: [
    { fields: { userId: 1 }, options: {} },
    { fields: { action: 1 }, options: {} },
    { fields: { entityType: 1 }, options: {} },
    { fields: { createdAt: -1 }, options: {} },
    { fields: { userId: 1, createdAt: -1 }, options: {} },
    { fields: { createdAt: 1 }, options: { expireAfterSeconds: 2592000 } }, // 30 days TTL
  ],
  
  // Session/Token indexes (TTL)
  APIToken: [
    { fields: { token: 1 }, options: { unique: true } },
    { fields: { userId: 1 }, options: {} },
    { fields: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
  ],
  
  FailedAttempt: [
    { fields: { identifier: 1 }, options: {} },
    { fields: { createdAt: 1 }, options: { expireAfterSeconds: 3600 } }, // 1 hour TTL
  ],
};

/**
 * Database Index Service
 */
class DatabaseIndexService {
  constructor() {
    this.indexStatus = new Map();
    this.indexStats = new Map();
  }
  
  /**
   * Create all defined indexes
   */
  async createAllIndexes() {
    const results = [];
    
    for (const [modelName, indexes] of Object.entries(INDEX_DEFINITIONS)) {
      try {
        const model = mongoose.models[modelName];
        if (!model) {
          console.warn(`[DatabaseIndexService] Model ${modelName} not found`);
          continue;
        }
        
        const result = await this.createIndexesForModel(model, indexes);
        results.push({ model: modelName, ...result });
      } catch (error) {
        console.error(`[DatabaseIndexService] Failed to create indexes for ${modelName}:`, error.message);
        results.push({ model: modelName, error: error.message });
      }
    }
    
    return results;
  }
  
  /**
   * Create indexes for a specific model
   */
  async createIndexesForModel(model, indexes) {
    const created = [];
    const errors = [];
    
    for (const indexDef of indexes) {
      try {
        await model.collection.createIndex(indexDef.fields, indexDef.options);
        created.push({
          fields: indexDef.fields,
          name: indexDef.options.name || this.generateIndexName(indexDef.fields),
        });
      } catch (error) {
        errors.push({
          fields: indexDef.fields,
          error: error.message,
        });
      }
    }
    
    return { created, errors, total: indexes.length };
  }
  
  /**
   * Generate index name from fields
   */
  generateIndexName(fields) {
    return Object.entries(fields)
      .map(([key, value]) => {
        const suffix = value === 1 ? '1' : value === -1 ? '-1' : 'text';
        return `${key}_${suffix}`;
      })
      .join('_');
  }
  
  /**
   * Get index statistics for a model
   */
  async getIndexStats(modelName) {
    try {
      const model = mongoose.models[modelName];
      if (!model) return null;
      
      const stats = await model.collection.stats();
      const indexes = await model.collection.indexes();
      
      return {
        model: modelName,
        totalIndexes: indexes.length,
        totalSize: stats.totalIndexSize,
        avgIndexSize: stats.avgObjSize,
        indexes: indexes.map(idx => ({
          name: idx.name,
          key: idx.key,
          size: idx.size || 0,
          usage: idx.accesses || { ops: 0, since: null },
        })),
      };
    } catch (error) {
      return { model: modelName, error: error.message };
    }
  }
  
  /**
   * Get all index statistics
   */
  async getAllIndexStats() {
    const stats = [];
    
    for (const modelName of Object.keys(mongoose.models)) {
      const modelStats = await this.getIndexStats(modelName);
      if (modelStats) {
        stats.push(modelStats);
      }
    }
    
    return stats;
  }
  
  /**
   * Analyze query and suggest indexes
   */
  async analyzeQuery(modelName, query, sort = {}) {
    try {
      const model = mongoose.models[modelName];
      if (!model) return null;
      
      // Get query explain plan
      const explain = await model.find(query).sort(sort).explain('executionStats');
      
      const analysis = {
        model: modelName,
        query,
        sort,
        executionTimeMillis: explain.executionStats.executionTimeMillis,
        totalDocsExamined: explain.executionStats.totalDocsExamined,
        totalKeysExamined: explain.executionStats.totalKeysExamined,
        nReturned: explain.executionStats.nReturned,
        stage: explain.queryPlanner.winningPlan.stage,
        indexUsed: explain.queryPlanner.winningPlan.inputStage?.indexName || null,
        suggestions: [],
      };
      
      // Generate suggestions
      if (analysis.executionTimeMillis > 100) {
        analysis.suggestions.push({
          type: 'slow_query',
          message: `Query took ${analysis.executionTimeMillis}ms. Consider adding an index.`,
        });
      }
      
      if (analysis.totalDocsExamined > analysis.nReturned * 10) {
        analysis.suggestions.push({
          type: 'inefficient_scan',
          message: `Examined ${analysis.totalDocsExamined} docs for ${analysis.nReturned} results.`,
          recommendedIndex: { ...query, ...sort },
        });
      }
      
      if (!analysis.indexUsed && Object.keys(query).length > 0) {
        analysis.suggestions.push({
          type: 'missing_index',
          message: 'No index used for this query.',
          recommendedIndex: { ...query, ...sort },
        });
      }
      
      return analysis;
    } catch (error) {
      return { model: modelName, error: error.message };
    }
  }
  
  /**
   * Drop unused indexes
   */
  async dropUnusedIndexes(modelName, minDaysUnused = 30) {
    try {
      const model = mongoose.models[modelName];
      if (!model) return null;
      
      const indexes = await model.collection.indexes();
      const dropped = [];
      
      for (const index of indexes) {
        // Skip _id index
        if (index.name === '_id_') continue;
        
        // Check if index has been used
        const accesses = index.accesses?.ops || 0;
        const since = index.accesses?.since ? new Date(index.accesses.since) : null;
        
        if (accesses === 0 && since) {
          const daysSince = (Date.now() - since.getTime()) / (1000 * 60 * 60 * 24);
          
          if (daysSince > minDaysUnused) {
            await model.collection.dropIndex(index.name);
            dropped.push({
              name: index.name,
              unusedForDays: Math.floor(daysSince),
            });
          }
        }
      }
      
      return { model: modelName, dropped };
    } catch (error) {
      return { model: modelName, error: error.message };
    }
  }
  
  /**
   * Rebuild index
   */
  async rebuildIndex(modelName, indexName) {
    try {
      const model = mongoose.models[modelName];
      if (!model) return null;
      
      await model.collection.reIndex(indexName);
      
      return { model: modelName, index: indexName, rebuilt: true };
    } catch (error) {
      return { model: modelName, index: indexName, error: error.message };
    }
  }
  
  /**
   * Verify indexes exist
   */
  async verifyIndexes() {
    const results = [];
    
    for (const [modelName, expectedIndexes] of Object.entries(INDEX_DEFINITIONS)) {
      try {
        const model = mongoose.models[modelName];
        if (!model) continue;
        
        const existingIndexes = await model.collection.indexes();
        const existingNames = new Set(existingIndexes.map(idx => idx.name));
        
        const missing = [];
        for (const expected of expectedIndexes) {
          const expectedName = expected.options.name || this.generateIndexName(expected.fields);
          if (!existingNames.has(expectedName)) {
            missing.push(expectedName);
          }
        }
        
        results.push({
          model: modelName,
          totalExpected: expectedIndexes.length,
          totalExisting: existingIndexes.length,
          missing,
          healthy: missing.length === 0,
        });
      } catch (error) {
        results.push({
          model: modelName,
          error: error.message,
        });
      }
    }
    
    return results;
  }
  
  /**
   * Get index health report
   */
  async getHealthReport() {
    const stats = await this.getAllIndexStats();
    const verification = await this.verifyIndexes();
    
    const totalIndexes = stats.reduce((sum, s) => sum + (s.totalIndexes || 0), 0);
    const totalSize = stats.reduce((sum, s) => sum + (s.totalSize || 0), 0);
    const unhealthyModels = verification.filter(v => !v.healthy);
    
    return {
      summary: {
        totalModels: stats.length,
        totalIndexes,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        healthyModels: verification.length - unhealthyModels.length,
        unhealthyModels: unhealthyModels.length,
      },
      details: {
        stats,
        verification,
      },
    };
  }
}

// Create singleton instance
const databaseIndexService = new DatabaseIndexService();

module.exports = {
  DatabaseIndexService,
  databaseIndexService,
  INDEX_DEFINITIONS,
};