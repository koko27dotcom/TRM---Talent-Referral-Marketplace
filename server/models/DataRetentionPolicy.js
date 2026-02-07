/**
 * DataRetentionPolicy Model
 * Defines data retention rules for GDPR, PDPA, and enterprise compliance
 * Supports automated data purging based on configurable policies
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Retention action types
const RETENTION_ACTIONS = {
  DELETE: 'delete',
  ANONYMIZE: 'anonymize',
  ARCHIVE: 'archive',
  NOTIFY: 'notify',
  REVIEW: 'review',
};

// Data categories
const DATA_CATEGORIES = {
  PERSONAL_DATA: 'personal_data',
  FINANCIAL_DATA: 'financial_data',
  COMMUNICATION_DATA: 'communication_data',
  ANALYTICS_DATA: 'analytics_data',
  LOG_DATA: 'log_data',
  BACKUP_DATA: 'backup_data',
  TEMPORARY_DATA: 'temporary_data',
  MARKETING_DATA: 'marketing_data',
  CONTRACT_DATA: 'contract_data',
  LEGAL_DATA: 'legal_data',
};

// Legal basis for retention
const LEGAL_BASIS = {
  CONSENT: 'consent',
  CONTRACT: 'contract',
  LEGAL_OBLIGATION: 'legal_obligation',
  VITAL_INTERESTS: 'vital_interests',
  PUBLIC_TASK: 'public_task',
  LEGITIMATE_INTERESTS: 'legitimate_interests',
};

// Compliance frameworks
const COMPLIANCE_FRAMEWORKS = {
  GDPR: 'gdpr',
  PDPA_THAILAND: 'pdpa_thailand',
  PDPA_SINGAPORE: 'pdpa_singapore',
  MYANMAR_LAW: 'myanmar_law',
  SOC2: 'soc2',
  ISO27001: 'iso27001',
  PCI_DSS: 'pci_dss',
};

// Retention rule schema
const RetentionRuleSchema = new Schema({
  dataCategory: {
    type: String,
    enum: Object.values(DATA_CATEGORIES),
    required: true,
  },
  entityType: {
    type: String,
    required: true,
    // e.g., 'User', 'Referral', 'Application', 'AuditLog'
  },
  fieldPattern: {
    type: String,
    default: '*', // Wildcard for all fields, or regex pattern
  },
  retentionPeriod: {
    value: { type: Number, required: true, min: 1 },
    unit: {
      type: String,
      enum: ['days', 'months', 'years'],
      required: true,
    },
  },
  legalBasis: {
    type: String,
    enum: Object.values(LEGAL_BASIS),
    required: true,
  },
  action: {
    type: String,
    enum: Object.values(RETENTION_ACTIONS),
    default: RETENTION_ACTIONS.DELETE,
  },
  actionConfig: {
    type: Schema.Types.Mixed,
    default: {},
    // Configuration specific to the action
    // e.g., { archiveLocation: 's3://archive/', compression: true }
  },
  conditions: [{
    field: { type: String },
    operator: {
      type: String,
      enum: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'exists', 'in', 'nin'],
    },
    value: { type: Schema.Types.Mixed },
  }],
  priority: {
    type: Number,
    default: 0,
    // Higher number = higher priority
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { _id: true });

// Compliance requirement schema
const ComplianceRequirementSchema = new Schema({
  framework: {
    type: String,
    enum: Object.values(COMPLIANCE_FRAMEWORKS),
    required: true,
  },
  requirement: {
    type: String,
    required: true,
  },
  article: {
    type: String,
    // e.g., 'GDPR Article 17' for right to erasure
  },
  description: {
    type: String,
  },
  minRetentionPeriod: {
    value: { type: Number },
    unit: { type: String, enum: ['days', 'months', 'years'] },
  },
  maxRetentionPeriod: {
    value: { type: Number },
    unit: { type: String, enum: ['days', 'months', 'years'] },
  },
}, { _id: true });

// Main DataRetentionPolicy Schema
const DataRetentionPolicySchema = new Schema({
  name: {
    type: String,
    required: [true, 'Policy name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  version: {
    type: String,
    default: '1.0.0',
  },
  
  // Policy scope
  scope: {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
      // null = global policy
    },
    isGlobal: {
      type: Boolean,
      default: false,
    },
    appliesTo: [{
      type: String,
      enum: ['all', 'users', 'referrers', 'companies', 'jobs', 'referrals', 'applications'],
    }],
  },
  
  // Retention rules
  rules: [RetentionRuleSchema],
  
  // Compliance requirements
  complianceRequirements: [ComplianceRequirementSchema],
  
  // Automation settings
  automation: {
    enabled: {
      type: Boolean,
      default: true,
    },
    schedule: {
      type: String,
      default: '0 2 * * *', // Daily at 2 AM
      // Cron expression
    },
    batchSize: {
      type: Number,
      default: 1000,
      // Number of records to process per batch
    },
    dryRun: {
      type: Boolean,
      default: false,
      // If true, only log what would be done without actually doing it
    },
    notifyBeforeDays: {
      type: Number,
      default: 30,
      // Notify users before data deletion
    },
  },
  
  // Exceptions
  exceptions: [{
    name: { type: String, required: true },
    description: { type: String },
    condition: {
      field: { type: String },
      operator: { type: String },
      value: { type: Schema.Types.Mixed },
    },
    retentionExtension: {
      value: { type: Number },
      unit: { type: String, enum: ['days', 'months', 'years'] },
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: { type: Date },
    expiresAt: { type: Date },
  }],
  
  // Policy status
  status: {
    type: String,
    enum: ['draft', 'active', 'archived', 'deprecated'],
    default: 'draft',
    index: true,
  },
  
  // Audit trail
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: { type: Date },
  
  // Timestamps
  effectiveFrom: {
    type: Date,
    default: Date.now,
  },
  effectiveUntil: {
    type: Date,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ==================== INDEXES ====================

DataRetentionPolicySchema.index({ 'scope.companyId': 1, status: 1 });
DataRetentionPolicySchema.index({ 'scope.isGlobal': 1, status: 1 });
DataRetentionPolicySchema.index({ status: 1, effectiveFrom: -1 });

// ==================== VIRTUALS ====================

DataRetentionPolicySchema.virtual('isActive').get(function() {
  return this.status === 'active' && 
         this.effectiveFrom <= new Date() &&
         (!this.effectiveUntil || this.effectiveUntil > new Date());
});

DataRetentionPolicySchema.virtual('ruleCount').get(function() {
  return this.rules?.length || 0;
});

// ==================== STATIC METHODS ====================

/**
 * Get active policies for a company
 * @param {string} companyId - Company ID
 * @returns {Promise<Array>}
 */
DataRetentionPolicySchema.statics.getActivePolicies = async function(companyId = null) {
  const now = new Date();
  
  const query = {
    status: 'active',
    effectiveFrom: { $lte: now },
    $or: [
      { effectiveUntil: { $exists: false } },
      { effectiveUntil: null },
      { effectiveUntil: { $gt: now } },
    ],
  };
  
  if (companyId) {
    query.$or = [
      { 'scope.isGlobal': true },
      { 'scope.companyId': companyId },
    ];
  } else {
    query['scope.isGlobal'] = true;
  }
  
  return this.find(query).sort({ 'scope.isGlobal': -1, createdAt: -1 });
};

/**
 * Get retention rule for data category
 * @param {string} dataCategory - Data category
 * @param {string} entityType - Entity type
 * @param {string} companyId - Company ID
 * @returns {Promise<Object|null>}
 */
DataRetentionPolicySchema.statics.getRuleForCategory = async function(dataCategory, entityType, companyId = null) {
  const policies = await this.getActivePolicies(companyId);
  
  for (const policy of policies) {
    const rule = policy.rules.find(r => 
      r.isActive &&
      r.dataCategory === dataCategory &&
      r.entityType === entityType
    );
    
    if (rule) return rule;
  }
  
  return null;
};

/**
 * Calculate retention date based on rule
 * @param {Object} rule - Retention rule
 * @param {Date} referenceDate - Reference date (e.g., createdAt)
 * @returns {Date}
 */
DataRetentionPolicySchema.statics.calculateRetentionDate = function(rule, referenceDate) {
  const date = new Date(referenceDate);
  const { value, unit } = rule.retentionPeriod;
  
  switch (unit) {
    case 'days':
      date.setDate(date.getDate() + value);
      break;
    case 'months':
      date.setMonth(date.getMonth() + value);
      break;
    case 'years':
      date.setFullYear(date.getFullYear() + value);
      break;
  }
  
  return date;
};

/**
 * Create default GDPR policy
 * @param {string} createdBy - User ID who creates the policy
 * @returns {Promise<Document>}
 */
DataRetentionPolicySchema.statics.createDefaultGDPRPolicy = async function(createdBy) {
  return this.create({
    name: 'GDPR Default Data Retention Policy',
    description: 'Default data retention policy compliant with EU GDPR regulations',
    version: '1.0.0',
    scope: {
      isGlobal: true,
      appliesTo: ['all'],
    },
    rules: [
      {
        dataCategory: DATA_CATEGORIES.PERSONAL_DATA,
        entityType: 'User',
        retentionPeriod: { value: 7, unit: 'years' },
        legalBasis: LEGAL_BASIS.LEGITIMATE_INTERESTS,
        action: RETENTION_ACTIONS.ANONYMIZE,
        priority: 100,
      },
      {
        dataCategory: DATA_CATEGORIES.FINANCIAL_DATA,
        entityType: 'PayoutRequest',
        retentionPeriod: { value: 7, unit: 'years' },
        legalBasis: LEGAL_BASIS.LEGAL_OBLIGATION,
        action: RETENTION_ACTIONS.ARCHIVE,
        priority: 90,
      },
      {
        dataCategory: DATA_CATEGORIES.COMMUNICATION_DATA,
        entityType: 'EmailLog',
        retentionPeriod: { value: 2, unit: 'years' },
        legalBasis: LEGAL_BASIS.CONSENT,
        action: RETENTION_ACTIONS.DELETE,
        priority: 50,
      },
      {
        dataCategory: DATA_CATEGORIES.LOG_DATA,
        entityType: 'AuditLog',
        retentionPeriod: { value: 1, unit: 'years' },
        legalBasis: LEGAL_BASIS.LEGITIMATE_INTERESTS,
        action: RETENTION_ACTIONS.DELETE,
        priority: 30,
      },
      {
        dataCategory: DATA_CATEGORIES.ANALYTICS_DATA,
        entityType: 'AnalyticsInsight',
        retentionPeriod: { value: 2, unit: 'years' },
        legalBasis: LEGAL_BASIS.LEGITIMATE_INTERESTS,
        action: RETENTION_ACTIONS.ANONYMIZE,
        priority: 40,
      },
      {
        dataCategory: DATA_CATEGORIES.TEMPORARY_DATA,
        entityType: 'Session',
        retentionPeriod: { value: 30, unit: 'days' },
        legalBasis: LEGAL_BASIS.LEGITIMATE_INTERESTS,
        action: RETENTION_ACTIONS.DELETE,
        priority: 10,
      },
    ],
    complianceRequirements: [
      {
        framework: COMPLIANCE_FRAMEWORKS.GDPR,
        requirement: 'Right to erasure (Article 17)',
        article: 'Article 17',
        description: 'Data subjects have the right to have their personal data erased',
      },
      {
        framework: COMPLIANCE_FRAMEWORKS.GDPR,
        requirement: 'Storage limitation (Article 5)',
        article: 'Article 5(1)(e)',
        description: 'Personal data must be kept in a form which permits identification of data subjects for no longer than necessary',
      },
    ],
    automation: {
      enabled: true,
      schedule: '0 2 * * *',
      batchSize: 1000,
      dryRun: false,
      notifyBeforeDays: 30,
    },
    status: 'active',
    createdBy,
    effectiveFrom: new Date(),
  });
};

/**
 * Create default PDPA (Thailand) policy
 * @param {string} createdBy - User ID who creates the policy
 * @returns {Promise<Document>}
 */
DataRetentionPolicySchema.statics.createDefaultPDPAThailandPolicy = async function(createdBy) {
  return this.create({
    name: 'PDPA Thailand Default Data Retention Policy',
    description: 'Default data retention policy compliant with Thailand PDPA',
    version: '1.0.0',
    scope: {
      isGlobal: true,
      appliesTo: ['all'],
    },
    rules: [
      {
        dataCategory: DATA_CATEGORIES.PERSONAL_DATA,
        entityType: 'User',
        retentionPeriod: { value: 10, unit: 'years' },
        legalBasis: LEGAL_BASIS.CONSENT,
        action: RETENTION_ACTIONS.DELETE,
        priority: 100,
      },
      {
        dataCategory: DATA_CATEGORIES.FINANCIAL_DATA,
        entityType: 'PayoutRequest',
        retentionPeriod: { value: 10, unit: 'years' },
        legalBasis: LEGAL_BASIS.LEGAL_OBLIGATION,
        action: RETENTION_ACTIONS.ARCHIVE,
        priority: 90,
      },
      {
        dataCategory: DATA_CATEGORIES.MARKETING_DATA,
        entityType: 'EmailCampaign',
        retentionPeriod: { value: 3, unit: 'years' },
        legalBasis: LEGAL_BASIS.CONSENT,
        action: RETENTION_ACTIONS.DELETE,
        priority: 50,
      },
    ],
    complianceRequirements: [
      {
        framework: COMPLIANCE_FRAMEWORKS.PDPA_THAILAND,
        requirement: 'Data retention limitation',
        article: 'Section 37',
        description: 'Personal data must not be retained longer than necessary for the purposes',
      },
    ],
    automation: {
      enabled: true,
      schedule: '0 2 * * *',
      batchSize: 1000,
      dryRun: false,
      notifyBeforeDays: 30,
    },
    status: 'active',
    createdBy,
    effectiveFrom: new Date(),
  });
};

// ==================== INSTANCE METHODS ====================

/**
 * Add a new retention rule
 * @param {Object} rule - Retention rule
 */
DataRetentionPolicySchema.methods.addRule = async function(rule) {
  this.rules.push(rule);
  await this.save();
};

/**
 * Update a retention rule
 * @param {string} ruleId - Rule ID
 * @param {Object} updates - Rule updates
 */
DataRetentionPolicySchema.methods.updateRule = async function(ruleId, updates) {
  const rule = this.rules.id(ruleId);
  if (rule) {
    Object.assign(rule, updates);
    await this.save();
  }
};

/**
 * Remove a retention rule
 * @param {string} ruleId - Rule ID
 */
DataRetentionPolicySchema.methods.removeRule = async function(ruleId) {
  this.rules.pull(ruleId);
  await this.save();
};

/**
 * Activate the policy
 * @param {string} approvedBy - User ID who approves
 */
DataRetentionPolicySchema.methods.activate = async function(approvedBy) {
  this.status = 'active';
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  await this.save();
};

/**
 * Archive the policy
 */
DataRetentionPolicySchema.methods.archive = async function() {
  this.status = 'archived';
  this.effectiveUntil = new Date();
  await this.save();
};

// Create and export the model
const DataRetentionPolicy = mongoose.model('DataRetentionPolicy', DataRetentionPolicySchema);

module.exports = DataRetentionPolicy;
