/**
 * Data Retention Service
 * Handles automated data purging based on retention policies
 * Supports GDPR, PDPA compliance with configurable retention rules
 */

const { User, Company, Referral, Application, AuditLog } = require('../models/index.js');
const { DataRetentionPolicy, RETENTION_ACTIONS, DATA_CATEGORIES } = require('../models/DataRetentionPolicy.js');
const { SecurityAudit, SECURITY_EVENT_TYPES, SEVERITY_LEVELS } = require('../models/SecurityAudit.js');
const encryptionService = require('./encryptionService.js');

// Processing configuration
const PROCESSING_CONFIG = {
  batchSize: 1000,
  maxProcessingTime: 30 * 60 * 1000, // 30 minutes
  notificationDaysBefore: 30,
};

/**
 * Process data retention for all active policies
 * @returns {Promise<Object>}
 */
const processRetention = async () => {
  const startTime = Date.now();
  const results = {
    policiesProcessed: 0,
    recordsAnalyzed: 0,
    recordsDeleted: 0,
    recordsAnonymized: 0,
    recordsArchived: 0,
    errors: [],
  };
  
  try {
    // Get all active policies
    const policies = await DataRetentionPolicy.getActivePolicies();
    
    for (const policy of policies) {
      if (Date.now() - startTime > PROCESSING_CONFIG.maxProcessingTime) {
        console.log('Retention processing time limit reached');
        break;
      }
      
      const policyResult = await processPolicy(policy);
      
      results.policiesProcessed++;
      results.recordsAnalyzed += policyResult.analyzed;
      results.recordsDeleted += policyResult.deleted;
      results.recordsAnonymized += policyResult.anonymized;
      results.recordsArchived += policyResult.archived;
      results.errors.push(...policyResult.errors);
    }
    
    // Log completion
    await SecurityAudit.logEvent({
      eventType: SECURITY_EVENT_TYPES.DATA_RETENTION_POLICY_APPLIED,
      category: 'compliance',
      severity: SEVERITY_LEVELS.INFO,
      description: 'Data retention processing completed',
      details: results,
    });
    
    return {
      success: true,
      ...results,
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    console.error('Retention processing error:', error);
    
    await SecurityAudit.logEvent({
      eventType: SECURITY_EVENT_TYPES.DATA_RETENTION_POLICY_APPLIED,
      category: 'compliance',
      severity: SEVERITY_LEVELS.ERROR,
      description: 'Data retention processing failed',
      details: { error: error.message },
    });
    
    throw error;
  }
};

/**
 * Process a single retention policy
 * @param {Object} policy - DataRetentionPolicy document
 * @returns {Promise<Object>}
 */
const processPolicy = async (policy) => {
  const result = {
    analyzed: 0,
    deleted: 0,
    anonymized: 0,
    archived: 0,
    errors: [],
  };
  
  // Sort rules by priority (highest first)
  const sortedRules = policy.rules
    .filter(rule => rule.isActive)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  
  for (const rule of sortedRules) {
    try {
      const ruleResult = await processRule(rule, policy);
      
      result.analyzed += ruleResult.analyzed;
      result.deleted += ruleResult.deleted;
      result.anonymized += ruleResult.anonymized;
      result.archived += ruleResult.archived;
    } catch (error) {
      result.errors.push({
        rule: rule._id,
        error: error.message,
      });
    }
  }
  
  return result;
};

/**
 * Process a single retention rule
 * @param {Object} rule - Retention rule
 * @param {Object} policy - Parent policy
 * @returns {Promise<Object>}
 */
const processRule = async (rule, policy) => {
  const result = {
    analyzed: 0,
    deleted: 0,
    anonymized: 0,
    archived: 0,
  };
  
  // Calculate cutoff date
  const cutoffDate = DataRetentionPolicy.calculateRetentionDate(rule, new Date());
  
  // Get model based on entity type
  const Model = getModelForEntityType(rule.entityType);
  if (!Model) {
    throw new Error(`Unknown entity type: ${rule.entityType}`);
  }
  
  // Build query
  const query = {
    createdAt: { $lte: cutoffDate },
  };
  
  // Add conditions from rule
  if (rule.conditions && rule.conditions.length > 0) {
    for (const condition of rule.conditions) {
      const mongoOperator = getMongoOperator(condition.operator);
      query[condition.field] = { [mongoOperator]: condition.value };
    }
  }
  
  // Process in batches
  let hasMore = true;
  
  while (hasMore) {
    const records = await Model.find(query)
      .limit(PROCESSING_CONFIG.batchSize)
      .select('_id createdAt');
    
    if (records.length === 0) {
      hasMore = false;
      break;
    }
    
    result.analyzed += records.length;
    
    // Apply retention action
    for (const record of records) {
      try {
        await applyRetentionAction(record, rule, Model);
        
        switch (rule.action) {
          case RETENTION_ACTIONS.DELETE:
            result.deleted++;
            break;
          case RETENTION_ACTIONS.ANONYMIZE:
            result.anonymized++;
            break;
          case RETENTION_ACTIONS.ARCHIVE:
            result.archived++;
            break;
        }
      } catch (error) {
        console.error(`Failed to process record ${record._id}:`, error);
      }
    }
    
    // Check if there are more records
    hasMore = records.length === PROCESSING_CONFIG.batchSize;
  }
  
  return result;
};

/**
 * Apply retention action to a record
 * @param {Object} record - Database record
 * @param {Object} rule - Retention rule
 * @param {Object} Model - Mongoose model
 */
const applyRetentionAction = async (record, rule, Model) => {
  switch (rule.action) {
    case RETENTION_ACTIONS.DELETE:
      await deleteRecord(record, Model);
      break;
    case RETENTION_ACTIONS.ANONYMIZE:
      await anonymizeRecord(record, rule, Model);
      break;
    case RETENTION_ACTIONS.ARCHIVE:
      await archiveRecord(record, rule, Model);
      break;
    case RETENTION_ACTIONS.NOTIFY:
      await notifyBeforeDeletion(record, rule);
      break;
    case RETENTION_ACTIONS.REVIEW:
      await flagForReview(record, rule);
      break;
    default:
      throw new Error(`Unknown retention action: ${rule.action}`);
  }
};

/**
 * Delete a record
 * @param {Object} record - Record to delete
 * @param {Object} Model - Mongoose model
 */
const deleteRecord = async (record, Model) => {
  // Use soft delete if available, otherwise hard delete
  if (record.status !== undefined) {
    record.status = 'deleted';
    record.deletedAt = new Date();
    await record.save();
  } else {
    await Model.deleteOne({ _id: record._id });
  }
};

/**
 * Anonymize a record
 * @param {Object} record - Record to anonymize
 * @param {Object} rule - Retention rule
 * @param {Object} Model - Mongoose model
 */
const anonymizeRecord = async (record, rule, Model) => {
  const anonymizedData = {};
  
  // Anonymize fields based on pattern
  if (rule.fieldPattern === '*') {
    // Anonymize all PII fields
    const piiFields = getPIIFieldsForModel(Model.modelName);
    for (const field of piiFields) {
      if (record[field] !== undefined) {
        anonymizedData[field] = '[REDACTED]';
      }
    }
  }
  
  // Mark as anonymized
  anonymizedData._anonymized = true;
  anonymizedData._anonymizedAt = new Date();
  
  await Model.updateOne(
    { _id: record._id },
    { $set: anonymizedData }
  );
};

/**
 * Archive a record
 * @param {Object} record - Record to archive
 * @param {Object} rule - Retention rule
 * @param {Object} Model - Mongoose model
 */
const archiveRecord = async (record, rule, Model) => {
  // In production, this would move data to cold storage
  // For now, just mark as archived
  await Model.updateOne(
    { _id: record._id },
    {
      $set: {
        _archived: true,
        _archivedAt: new Date(),
        _archiveLocation: rule.actionConfig?.archiveLocation || 'default',
      },
    }
  );
};

/**
 * Notify before deletion
 * @param {Object} record - Record
 * @param {Object} rule - Retention rule
 */
const notifyBeforeDeletion = async (record, rule) => {
  // This would send notification to user before deletion
  // Implementation depends on notification service
  console.log(`Would notify about upcoming deletion of ${record._id}`);
};

/**
 * Flag record for manual review
 * @param {Object} record - Record
 * @param {Object} rule - Retention rule
 */
const flagForReview = async (record, rule) => {
  await record.constructor.updateOne(
    { _id: record._id },
    {
      $set: {
        _retentionReviewRequired: true,
        _retentionReviewReason: rule.description,
      },
    }
  );
};

/**
 * Get Mongoose model for entity type
 * @param {string} entityType - Entity type
 * @returns {Object|null}
 */
const getModelForEntityType = (entityType) => {
  const modelMap = {
    'User': User,
    'Company': Company,
    'Referral': Referral,
    'Application': Application,
    'AuditLog': AuditLog,
  };
  
  return modelMap[entityType] || null;
};

/**
 * Get MongoDB operator from condition operator
 * @param {string} operator - Condition operator
 * @returns {string}
 */
const getMongoOperator = (operator) => {
  const operatorMap = {
    'eq': '$eq',
    'ne': '$ne',
    'gt': '$gt',
    'gte': '$gte',
    'lt': '$lt',
    'lte': '$lte',
    'exists': '$exists',
    'in': '$in',
    'nin': '$nin',
  };
  
  return operatorMap[operator] || '$eq';
};

/**
 * Get PII fields for a model
 * @param {string} modelName - Model name
 * @returns {Array<string>}
 */
const getPIIFieldsForModel = (modelName) => {
  const piiFieldMap = {
    'User': ['email', 'name', 'phone'],
    'Company': ['email', 'phone', 'billingEmail'],
    'Referral': ['candidateEmail', 'candidatePhone', 'candidateName'],
    'Application': ['email', 'phone', 'name'],
  };
  
  return piiFieldMap[modelName] || [];
};

/**
 * Get retention statistics
 * @param {Object} filters - Filters
 * @returns {Promise<Object>}
 */
const getRetentionStats = async (filters = {}) => {
  const stats = {
    activePolicies: 0,
    totalRules: 0,
    recordsByAction: {
      delete: 0,
      anonymize: 0,
      archive: 0,
      notify: 0,
    },
    upcomingDeletions: 0,
  };
  
  // Count active policies
  stats.activePolicies = await DataRetentionPolicy.countDocuments({
    status: 'active',
  });
  
  // Get policy with most rules
  const policyWithMostRules = await DataRetentionPolicy.findOne({
    status: 'active',
  }).sort({ 'rules.length': -1 });
  
  if (policyWithMostRules) {
    stats.totalRules = policyWithMostRules.rules.length;
  }
  
  // Count records pending deletion (simplified)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  // This would need to be customized based on actual data
  stats.upcomingDeletions = await AuditLog.countDocuments({
    createdAt: { $lte: thirtyDaysFromNow },
  });
  
  return stats;
};

/**
 * Preview what would be deleted by a policy
 * @param {string} policyId - Policy ID
 * @returns {Promise<Object>}
 */
const previewRetention = async (policyId) => {
  const policy = await DataRetentionPolicy.findById(policyId);
  if (!policy) {
    throw new Error('Policy not found');
  }
  
  const preview = {
    policyName: policy.name,
    rules: [],
    totalRecords: 0,
  };
  
  for (const rule of policy.rules.filter(r => r.isActive)) {
    const Model = getModelForEntityType(rule.entityType);
    if (!Model) continue;
    
    const cutoffDate = DataRetentionPolicy.calculateRetentionDate(rule, new Date());
    
    const count = await Model.countDocuments({
      createdAt: { $lte: cutoffDate },
    });
    
    preview.rules.push({
      dataCategory: rule.dataCategory,
      entityType: rule.entityType,
      action: rule.action,
      cutoffDate,
      affectedRecords: count,
    });
    
    preview.totalRecords += count;
  }
  
  return preview;
};

/**
 * Check if a user's data is subject to retention
 * @param {string} userId - User ID
 * @returns {Promise<Object>}
 */
const checkUserDataRetention = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  const policies = await DataRetentionPolicy.getActivePolicies(user.companyId);
  const applicableRules = [];
  
  for (const policy of policies) {
    for (const rule of policy.rules.filter(r => r.isActive)) {
      if (rule.entityType === 'User') {
        const retentionDate = DataRetentionPolicy.calculateRetentionDate(rule, user.createdAt);
        
        applicableRules.push({
          policyName: policy.name,
          dataCategory: rule.dataCategory,
          action: rule.action,
          retentionDate,
          daysUntilAction: Math.ceil((retentionDate - Date.now()) / (1000 * 60 * 60 * 24)),
        });
      }
    }
  }
  
  return {
    userId,
    applicableRules,
    earliestAction: applicableRules.length > 0
      ? applicableRules.sort((a, b) => a.retentionDate - b.retentionDate)[0]
      : null,
  };
};

/**
 * Initialize default retention policies
 * @param {string} createdBy - User ID creating policies
 * @returns {Promise<Object>}
 */
const initializeDefaultPolicies = async (createdBy) => {
  const results = {
    created: [],
    errors: [],
  };
  
  try {
    // Create GDPR policy
    const gdprPolicy = await DataRetentionPolicy.createDefaultGDPRPolicy(createdBy);
    results.created.push(gdprPolicy.name);
  } catch (error) {
    results.errors.push({ policy: 'GDPR', error: error.message });
  }
  
  try {
    // Create PDPA Thailand policy
    const pdpaPolicy = await DataRetentionPolicy.createDefaultPDPAThailandPolicy(createdBy);
    results.created.push(pdpaPolicy.name);
  } catch (error) {
    results.errors.push({ policy: 'PDPA Thailand', error: error.message });
  }
  
  return results;
};

module.exports = {
  processRetention,
  getRetentionStats,
  previewRetention,
  checkUserDataRetention,
  initializeDefaultPolicies,
  RETENTION_ACTIONS,
  DATA_CATEGORIES,
};
