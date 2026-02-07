/**
 * ComplianceReport Model
 * Generates and stores compliance audit reports for GDPR, PDPA, SOC 2, and other frameworks
 * Supports automated compliance monitoring and reporting
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Report types
const REPORT_TYPES = {
  GDPR_AUDIT: 'gdpr_audit',
  PDPA_THAILAND_AUDIT: 'pdpa_thailand_audit',
  PDPA_SINGAPORE_AUDIT: 'pdpa_singapore_audit',
  MYANMAR_COMPLIANCE: 'myanmar_compliance',
  SOC2_TYPE_I: 'soc2_type_i',
  SOC2_TYPE_II: 'soc2_type_ii',
  ISO27001_AUDIT: 'iso27001_audit',
  DATA_INVENTORY: 'data_inventory',
  RETENTION_COMPLIANCE: 'retention_compliance',
  ACCESS_CONTROL_AUDIT: 'access_control_audit',
  SECURITY_ASSESSMENT: 'security_assessment',
  PRIVACY_IMPACT_ASSESSMENT: 'privacy_impact_assessment',
  CUSTOM: 'custom',
};

// Report status
const REPORT_STATUS = {
  PENDING: 'pending',
  GENERATING: 'generating',
  COMPLETED: 'completed',
  FAILED: 'failed',
  EXPIRED: 'expired',
};

// Finding severity
const FINDING_SEVERITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info',
};

// Finding status
const FINDING_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  ACCEPTED: 'accepted',
  FALSE_POSITIVE: 'false_positive',
};

// Control categories
const CONTROL_CATEGORIES = {
  ACCESS_CONTROL: 'access_control',
  DATA_PROTECTION: 'data_protection',
  INCIDENT_RESPONSE: 'incident_response',
  RISK_MANAGEMENT: 'risk_management',
  MONITORING: 'monitoring',
  ENCRYPTION: 'encryption',
  RETENTION: 'retention',
  CONSENT: 'consent',
  BREACH_NOTIFICATION: 'breach_notification',
  AUDIT_LOGGING: 'audit_logging',
};

// Finding schema
const FindingSchema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: Object.values(CONTROL_CATEGORIES),
    required: true,
  },
  severity: {
    type: String,
    enum: Object.values(FINDING_SEVERITY),
    required: true,
  },
  status: {
    type: String,
    enum: Object.values(FINDING_STATUS),
    default: FINDING_STATUS.OPEN,
  },
  controlReference: {
    type: String,
    // e.g., 'GDPR Article 32', 'SOC2 CC6.1'
  },
  affectedEntities: [{
    entityType: { type: String },
    entityId: { type: Schema.Types.ObjectId },
    entityName: { type: String },
  }],
  evidence: [{
    type: { type: String, enum: ['file', 'url', 'text', 'screenshot'] },
    content: { type: String },
    url: { type: String },
    capturedAt: { type: Date, default: Date.now },
  }],
  recommendation: {
    type: String,
  },
  remediation: {
    plan: { type: String },
    owner: { type: Schema.Types.ObjectId, ref: 'User' },
    dueDate: { type: Date },
    completedAt: { type: Date },
    notes: { type: String },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: true });

// Control assessment schema
const ControlAssessmentSchema = new Schema({
  controlId: {
    type: String,
    required: true,
  },
  controlName: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: Object.values(CONTROL_CATEGORIES),
    required: true,
  },
  framework: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  requirement: {
    type: String,
  },
  status: {
    type: String,
    enum: ['compliant', 'non_compliant', 'partially_compliant', 'not_applicable'],
    required: true,
  },
  evidence: [{
    type: { type: String },
    description: { type: String },
    location: { type: String },
  }],
  findings: [{
    type: Schema.Types.ObjectId,
    ref: 'ComplianceReport.findings',
  }],
  score: {
    type: Number,
    min: 0,
    max: 100,
  },
  testedAt: {
    type: Date,
  },
  testedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, { _id: true });

// Data subject rights request summary
const DSRRequestSummarySchema = new Schema({
  requestType: {
    type: String,
    enum: ['access', 'deletion', 'portability', 'correction', 'restriction'],
  },
  totalRequests: { type: Number, default: 0 },
  completedRequests: { type: Number, default: 0 },
  pendingRequests: { type: Number, default: 0 },
  overdueRequests: { type: Number, default: 0 },
  avgResponseTimeHours: { type: Number },
}, { _id: true });

// Main ComplianceReport Schema
const ComplianceReportSchema = new Schema({
  // Report identification
  reportId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Report name is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  type: {
    type: String,
    enum: Object.values(REPORT_TYPES),
    required: true,
    index: true,
  },
  
  // Report scope
  scope: {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
    },
    isGlobal: {
      type: Boolean,
      default: false,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    entities: [{
      entityType: { type: String },
      entityId: { type: Schema.Types.ObjectId },
    }],
  },
  
  // Report status
  status: {
    type: String,
    enum: Object.values(REPORT_STATUS),
    default: REPORT_STATUS.PENDING,
    index: true,
  },
  
  // Frameworks covered
  frameworks: [{
    name: { type: String, required: true },
    version: { type: String },
    controls: [{ type: String }],
  }],
  
  // Control assessments
  controlAssessments: [ControlAssessmentSchema],
  
  // Findings
  findings: [FindingSchema],
  
  // DSR summary (for GDPR/PDPA reports)
  dsrSummary: [DSRRequestSummarySchema],
  
  // Compliance scores
  scores: {
    overall: {
      type: Number,
      min: 0,
      max: 100,
    },
    byCategory: [{
      category: { type: String },
      score: { type: Number, min: 0, max: 100 },
      maxScore: { type: Number, min: 0, max: 100 },
    }],
    byFramework: [{
      framework: { type: String },
      score: { type: Number, min: 0, max: 100 },
      maxScore: { type: Number, min: 0, max: 100 },
    }],
  },
  
  // Statistics
  statistics: {
    totalControls: { type: Number, default: 0 },
    compliantControls: { type: Number, default: 0 },
    nonCompliantControls: { type: Number, default: 0 },
    partiallyCompliantControls: { type: Number, default: 0 },
    notApplicableControls: { type: Number, default: 0 },
    totalFindings: { type: Number, default: 0 },
    criticalFindings: { type: Number, default: 0 },
    highFindings: { type: Number, default: 0 },
    mediumFindings: { type: Number, default: 0 },
    lowFindings: { type: Number, default: 0 },
    openFindings: { type: Number, default: 0 },
    resolvedFindings: { type: Number, default: 0 },
  },
  
  // Report content
  content: {
    executiveSummary: { type: String },
    methodology: { type: String },
    scopeDescription: { type: String },
    limitations: { type: String },
    recommendations: [{ type: String }],
    attachments: [{
      name: { type: String },
      type: { type: String },
      url: { type: String },
      size: { type: Number },
    }],
  },
  
  // Generation details
  generation: {
    startedAt: { type: Date },
    completedAt: { type: Date },
    duration: { type: Number }, // in seconds
    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    automated: {
      type: Boolean,
      default: false,
    },
    error: {
      message: { type: String },
      stack: { type: String },
    },
  },
  
  // Review and approval
  review: {
    reviewer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: { type: Date },
    notes: { type: String },
    status: {
      type: String,
      enum: ['pending_review', 'approved', 'rejected', 'needs_revision'],
    },
  },
  
  // Distribution
  distribution: {
    recipients: [{
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      email: { type: String },
      sentAt: { type: Date },
      openedAt: { type: Date },
    }],
    downloadCount: { type: Number, default: 0 },
    lastDownloadedAt: { type: Date },
  },
  
  // Expiration
  expiresAt: {
    type: Date,
    index: true,
  },
  
  // Metadata
  tags: [{ type: String }],
  
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ==================== INDEXES ====================

ComplianceReportSchema.index({ type: 1, status: 1, createdAt: -1 });
ComplianceReportSchema.index({ 'scope.companyId': 1, createdAt: -1 });
ComplianceReportSchema.index({ reportId: 1 });
ComplianceReportSchema.index({ status: 1, expiresAt: 1 });

// ==================== VIRTUALS ====================

ComplianceReportSchema.virtual('complianceRate').get(function() {
  if (!this.statistics || this.statistics.totalControls === 0) return 0;
  return Math.round((this.statistics.compliantControls / this.statistics.totalControls) * 100);
});

ComplianceReportSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

ComplianceReportSchema.virtual('findingsBySeverity').get(function() {
  if (!this.findings) return {};
  
  return this.findings.reduce((acc, finding) => {
    acc[finding.severity] = (acc[finding.severity] || 0) + 1;
    return acc;
  }, {});
});

// ==================== STATIC METHODS ====================

/**
 * Generate unique report ID
 * @returns {string}
 */
ComplianceReportSchema.statics.generateReportId = function() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RPT-${timestamp}-${random}`;
};

/**
 * Create a new compliance report
 * @param {Object} data - Report data
 * @returns {Promise<Document>}
 */
ComplianceReportSchema.statics.createReport = async function(data) {
  const reportId = this.generateReportId();
  
  const report = await this.create({
    ...data,
    reportId,
    status: REPORT_STATUS.PENDING,
  });
  
  return report;
};

/**
 * Get reports by type
 * @param {string} type - Report type
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
ComplianceReportSchema.statics.getByType = function(type, options = {}) {
  const query = { type };
  
  if (options.companyId) {
    query['scope.companyId'] = options.companyId;
  }
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

/**
 * Get latest report by type
 * @param {string} type - Report type
 * @param {string} companyId - Company ID (optional)
 * @returns {Promise<Document|null>}
 */
ComplianceReportSchema.statics.getLatest = async function(type, companyId = null) {
  const query = { type, status: REPORT_STATUS.COMPLETED };
  
  if (companyId) {
    query['scope.companyId'] = companyId;
  }
  
  return this.findOne(query).sort({ createdAt: -1 });
};

/**
 * Get compliance trends
 * @param {string} type - Report type
 * @param {string} companyId - Company ID
 * @param {number} months - Number of months to look back
 * @returns {Promise<Array>}
 */
ComplianceReportSchema.statics.getTrends = async function(type, companyId, months = 12) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  
  return this.aggregate([
    {
      $match: {
        type,
        'scope.companyId': companyId ? new mongoose.Types.ObjectId(companyId) : null,
        status: REPORT_STATUS.COMPLETED,
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        avgScore: { $avg: '$scores.overall' },
        reportCount: { $sum: 1 },
        totalFindings: { $sum: '$statistics.totalFindings' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);
};

/**
 * Get open findings
 * @param {Object} filters - Filters
 * @returns {Promise<Array>}
 */
ComplianceReportSchema.statics.getOpenFindings = async function(filters = {}) {
  const query = {
    status: REPORT_STATUS.COMPLETED,
    'findings.status': { $in: [FINDING_STATUS.OPEN, FINDING_STATUS.IN_PROGRESS] },
  };
  
  if (filters.companyId) {
    query['scope.companyId'] = filters.companyId;
  }
  
  if (filters.severity) {
    query['findings.severity'] = filters.severity;
  }
  
  if (filters.category) {
    query['findings.category'] = filters.category;
  }
  
  const reports = await this.find(query, { findings: 1, reportId: 1, name: 1 });
  
  return reports.flatMap(report => 
    report.findings
      .filter(f => [FINDING_STATUS.OPEN, FINDING_STATUS.IN_PROGRESS].includes(f.status))
      .map(f => ({
        ...f.toObject(),
        reportId: report.reportId,
        reportName: report.name,
      }))
  );
};

// ==================== INSTANCE METHODS ====================

/**
 * Add a finding to the report
 * @param {Object} findingData - Finding data
 */
ComplianceReportSchema.methods.addFinding = async function(findingData) {
  const findingId = `FND-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  
  this.findings.push({
    ...findingData,
    id: findingId,
  });
  
  // Update statistics
  this.statistics.totalFindings += 1;
  this.statistics.openFindings += 1;
  
  switch (findingData.severity) {
    case 'critical':
      this.statistics.criticalFindings += 1;
      break;
    case 'high':
      this.statistics.highFindings += 1;
      break;
    case 'medium':
      this.statistics.mediumFindings += 1;
      break;
    case 'low':
      this.statistics.lowFindings += 1;
      break;
  }
  
  await this.save();
  return findingId;
};

/**
 * Update finding status
 * @param {string} findingId - Finding ID
 * @param {string} status - New status
 * @param {Object} updates - Additional updates
 */
ComplianceReportSchema.methods.updateFinding = async function(findingId, status, updates = {}) {
  const finding = this.findings.find(f => f.id === findingId);
  
  if (!finding) {
    throw new Error('Finding not found');
  }
  
  const oldStatus = finding.status;
  finding.status = status;
  
  if (updates.remediation) {
    finding.remediation = { ...finding.remediation, ...updates.remediation };
  }
  
  if (updates.notes) {
    finding.remediation.notes = updates.notes;
  }
  
  finding.updatedAt = new Date();
  
  // Update statistics
  if (oldStatus !== status) {
    if (oldStatus === FINDING_STATUS.OPEN || oldStatus === FINDING_STATUS.IN_PROGRESS) {
      this.statistics.openFindings -= 1;
    }
    if (status === FINDING_STATUS.RESOLVED) {
      this.statistics.resolvedFindings += 1;
    }
  }
  
  await this.save();
};

/**
 * Mark report as completed
 * @param {Object} results - Report results
 */
ComplianceReportSchema.methods.markCompleted = async function(results) {
  this.status = REPORT_STATUS.COMPLETED;
  this.generation.completedAt = new Date();
  
  if (this.generation.startedAt) {
    this.generation.duration = Math.round(
      (this.generation.completedAt - this.generation.startedAt) / 1000
    );
  }
  
  if (results.scores) {
    this.scores = results.scores;
  }
  
  if (results.statistics) {
    this.statistics = { ...this.statistics, ...results.statistics };
  }
  
  if (results.content) {
    this.content = { ...this.content, ...results.content };
  }
  
  await this.save();
};

/**
 * Mark report as failed
 * @param {Error} error - Error object
 */
ComplianceReportSchema.methods.markFailed = async function(error) {
  this.status = REPORT_STATUS.FAILED;
  this.generation.error = {
    message: error.message,
    stack: error.stack,
  };
  await this.save();
};

/**
 * Submit for review
 * @param {string} reviewerId - Reviewer user ID
 */
ComplianceReportSchema.methods.submitForReview = async function(reviewerId) {
  this.review.reviewer = reviewerId;
  this.review.status = 'pending_review';
  await this.save();
};

/**
 * Approve report
 * @param {string} reviewerId - Reviewer user ID
 * @param {string} notes - Review notes
 */
ComplianceReportSchema.methods.approve = async function(reviewerId, notes = '') {
  this.review.reviewer = reviewerId;
  this.review.reviewedAt = new Date();
  this.review.notes = notes;
  this.review.status = 'approved';
  await this.save();
};

/**
 * Record download
 * @param {string} userId - User who downloaded
 */
ComplianceReportSchema.methods.recordDownload = async function(userId) {
  this.distribution.downloadCount += 1;
  this.distribution.lastDownloadedAt = new Date();
  
  const existing = this.distribution.recipients.find(r => 
    r.userId && r.userId.toString() === userId
  );
  
  if (!existing) {
    this.distribution.recipients.push({
      userId,
      sentAt: new Date(),
    });
  }
  
  await this.save();
};

// Create and export the model
const ComplianceReport = mongoose.model('ComplianceReport', ComplianceReportSchema);

module.exports = ComplianceReport;
