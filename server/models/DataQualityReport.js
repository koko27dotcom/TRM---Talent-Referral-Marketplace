/**
 * DataQualityReport Model
 * Tracks data quality metrics for scraped CVs
 * Provides comprehensive quality analysis and reporting
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Field quality metrics schema
const FieldQualitySchema = new Schema({
  field: {
    type: String,
    required: true,
  },
  totalRecords: {
    type: Number,
    default: 0,
  },
  filledRecords: {
    type: Number,
    default: 0,
  },
  emptyRecords: {
    type: Number,
    default: 0,
  },
  validRecords: {
    type: Number,
    default: 0,
  },
  invalidRecords: {
    type: Number,
    default: 0,
  },
  completeness: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  accuracy: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  commonErrors: [{
    error: String,
    count: Number,
    examples: [String],
  }],
}, { _id: true });

// Source quality metrics schema
const SourceQualitySchema = new Schema({
  sourceId: {
    type: Schema.Types.ObjectId,
    ref: 'ScrapingSource',
    required: true,
  },
  sourceName: String,
  totalRecords: {
    type: Number,
    default: 0,
  },
  qualityScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  completeness: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  accuracy: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  freshness: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  duplicateRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  errorRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  fieldMetrics: [FieldQualitySchema],
}, { _id: true });

// Quality issue schema
const QualityIssueSchema = new Schema({
  type: {
    type: String,
    enum: [
      'missing_required_field',
      'invalid_format',
      'inconsistent_data',
      'duplicate_entry',
      'outdated_data',
      'incomplete_extraction',
      'parsing_error',
      'validation_failed',
      'data_corruption',
      'other',
    ],
    required: true,
  },
  severity: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low', 'info'],
    required: true,
  },
  field: String,
  description: {
    type: String,
    required: true,
  },
  affectedRecords: {
    type: Number,
    default: 0,
  },
  examples: [{
    recordId: Schema.Types.ObjectId,
    currentValue: Schema.Types.Mixed,
    expectedValue: Schema.Types.Mixed,
    issue: String,
  }],
  suggestedFix: String,
  autoFixable: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'wont_fix'],
    default: 'open',
  },
  resolvedAt: Date,
  resolvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, { _id: true });

// Trend data schema
const TrendDataSchema = new Schema({
  date: {
    type: Date,
    required: true,
  },
  overallScore: Number,
  completeness: Number,
  accuracy: Number,
  freshness: Number,
  newRecords: Number,
  updatedRecords: Number,
  fixedIssues: Number,
  newIssues: Number,
}, { _id: false });

// Data Quality Report Schema
const DataQualityReportSchema = new Schema({
  // Report Information
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: String,
  type: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'custom', 'realtime'],
    required: true,
  },
  
  // Scope
  scope: {
    sourceIds: [{
      type: Schema.Types.ObjectId,
      ref: 'ScrapingSource',
    }],
    dateRange: {
      from: Date,
      to: Date,
    },
    filters: {
      type: Map,
      of: Schema.Types.Mixed,
    },
  },
  
  // Overall Metrics
  overall: {
    totalRecords: {
      type: Number,
      default: 0,
    },
    qualityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    completeness: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    accuracy: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    freshness: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    consistency: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    validity: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
  },
  
  // Source Breakdown
  sources: [SourceQualitySchema],
  
  // Field Breakdown
  fields: [FieldQualitySchema],
  
  // Quality Issues
  issues: [QualityIssueSchema],
  
  // Issue Summary
  issueSummary: {
    total: {
      type: Number,
      default: 0,
    },
    critical: {
      type: Number,
      default: 0,
    },
    high: {
      type: Number,
      default: 0,
    },
    medium: {
      type: Number,
      default: 0,
    },
    low: {
      type: Number,
      default: 0,
    },
    open: {
      type: Number,
      default: 0,
    },
    resolved: {
      type: Number,
      default: 0,
    },
    autoFixable: {
      type: Number,
      default: 0,
    },
  },
  
  // Trend Data
  trends: [TrendDataSchema],
  
  // Deduplication Metrics
  deduplication: {
    totalDuplicates: {
      type: Number,
      default: 0,
    },
    duplicateRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    mergedRecords: {
      type: Number,
      default: 0,
    },
    deletedRecords: {
      type: Number,
      default: 0,
    },
  },
  
  // Data Distribution
  distribution: {
    byExperienceLevel: [{
      level: String,
      count: Number,
      avgQuality: Number,
    }],
    byIndustry: [{
      industry: String,
      count: Number,
      avgQuality: Number,
    }],
    byLocation: [{
      location: String,
      count: Number,
      avgQuality: Number,
    }],
    byDate: [{
      date: Date,
      count: Number,
      avgQuality: Number,
    }],
  },
  
  // Recommendations
  recommendations: [{
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
    },
    category: {
      type: String,
      enum: ['data_quality', 'scraping', 'validation', 'enrichment', 'storage', 'other'],
    },
    title: String,
    description: String,
    expectedImpact: String,
    effort: {
      type: String,
      enum: ['low', 'medium', 'high'],
    },
    actionItems: [String],
  }],
  
  // Report Status
  status: {
    type: String,
    enum: ['generating', 'completed', 'failed', 'scheduled'],
    default: 'generating',
  },
  
  // Generation Info
  generatedAt: {
    type: Date,
    default: Date.now,
  },
  generatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  generationDuration: Number, // in seconds
  
  // Comparison with previous report
  comparison: {
    previousReportId: {
      type: Schema.Types.ObjectId,
      ref: 'DataQualityReport',
    },
    qualityChange: Number,
    completenessChange: Number,
    accuracyChange: Number,
    issuesResolved: Number,
    issuesIntroduced: Number,
  },
  
  // Metadata
  tags: [String],
  notes: String,
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
DataQualityReportSchema.index({ type: 1, generatedAt: -1 });
DataQualityReportSchema.index({ status: 1 });
DataQualityReportSchema.index({ 'scope.sourceIds': 1 });
DataQualityReportSchema.index({ 'scope.dateRange.from': 1, 'scope.dateRange.to': 1 });
DataQualityReportSchema.index({ tags: 1 });
DataQualityReportSchema.index({ generatedBy: 1 });

// Virtual for issue count by severity
DataQualityReportSchema.virtual('criticalIssues').get(function() {
  return this.issues.filter(i => i.severity === 'critical' && i.status === 'open').length;
});

DataQualityReportSchema.virtual('highIssues').get(function() {
  return this.issues.filter(i => i.severity === 'high' && i.status === 'open').length;
});

// Method to add issue
DataQualityReportSchema.methods.addIssue = async function(issueData) {
  this.issues.push(issueData);
  this.issueSummary.total += 1;
  this.issueSummary[issueData.severity] += 1;
  this.issueSummary.open += 1;
  if (issueData.autoFixable) {
    this.issueSummary.autoFixable += 1;
  }
  return this.save();
};

// Method to resolve issue
DataQualityReportSchema.methods.resolveIssue = async function(issueId, userId) {
  const issue = this.issues.id(issueId);
  if (!issue) throw new Error('Issue not found');
  
  if (issue.status === 'open') {
    this.issueSummary.open -= 1;
    this.issueSummary.resolved += 1;
  }
  
  issue.status = 'resolved';
  issue.resolvedAt = new Date();
  issue.resolvedBy = userId;
  
  return this.save();
};

// Method to update overall metrics
DataQualityReportSchema.methods.updateOverallMetrics = async function() {
  // Calculate weighted averages from sources
  if (this.sources.length > 0) {
    const totalRecords = this.sources.reduce((sum, s) => sum + s.totalRecords, 0);
    
    this.overall.totalRecords = totalRecords;
    this.overall.qualityScore = this.weightedAverage(this.sources, 'qualityScore', 'totalRecords');
    this.overall.completeness = this.weightedAverage(this.sources, 'completeness', 'totalRecords');
    this.overall.accuracy = this.weightedAverage(this.sources, 'accuracy', 'totalRecords');
    this.overall.freshness = this.weightedAverage(this.sources, 'freshness', 'totalRecords');
  }
  
  // Calculate from fields
  if (this.fields.length > 0) {
    this.overall.validity = this.fields.reduce((sum, f) => sum + f.accuracy, 0) / this.fields.length;
  }
  
  return this.save();
};

// Helper method for weighted average
DataQualityReportSchema.methods.weightedAverage = function(items, valueField, weightField) {
  if (items.length === 0) return 0;
  
  const totalWeight = items.reduce((sum, item) => sum + (item[weightField] || 0), 0);
  if (totalWeight === 0) return 0;
  
  const weightedSum = items.reduce((sum, item) => sum + (item[valueField] || 0) * (item[weightField] || 0), 0);
  return Math.round((weightedSum / totalWeight) * 100) / 100;
};

// Static method to generate report
DataQualityReportSchema.statics.generate = async function(options = {}) {
  const report = new this({
    name: options.name || `Quality Report ${new Date().toISOString()}`,
    type: options.type || 'custom',
    description: options.description,
    scope: {
      sourceIds: options.sourceIds || [],
      dateRange: options.dateRange || {},
      filters: options.filters || {},
    },
    generatedBy: options.userId,
    status: 'generating',
  });
  
  await report.save();
  
  // Start generation process (would be done by a worker in production)
  // This is a placeholder for the actual generation logic
  
  return report;
};

// Static method to get latest report
DataQualityReportSchema.statics.getLatest = async function(type = 'daily') {
  return this.findOne({ type, status: 'completed' })
    .sort({ generatedAt: -1 });
};

// Static method to compare reports
DataQualityReportSchema.statics.compare = async function(reportId1, reportId2) {
  const [report1, report2] = await Promise.all([
    this.findById(reportId1),
    this.findById(reportId2),
  ]);
  
  if (!report1 || !report2) {
    throw new Error('One or both reports not found');
  }
  
  return {
    qualityChange: report1.overall.qualityScore - report2.overall.qualityScore,
    completenessChange: report1.overall.completeness - report2.overall.completeness,
    accuracyChange: report1.overall.accuracy - report2.overall.accuracy,
    freshnessChange: report1.overall.freshness - report2.overall.freshness,
    recordChange: report1.overall.totalRecords - report2.overall.totalRecords,
    issueChange: report1.issueSummary.total - report2.issueSummary.total,
  };
};

// Static method to get quality trends
DataQualityReportSchema.statics.getTrends = async function(days = 30, sourceIds = []) {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  
  const matchStage = {
    generatedAt: { $gte: fromDate },
    status: 'completed',
  };
  
  if (sourceIds.length > 0) {
    matchStage['scope.sourceIds'] = { $in: sourceIds.map(id => new mongoose.Types.ObjectId(id)) };
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$generatedAt' } },
        avgQuality: { $avg: '$overall.qualityScore' },
        avgCompleteness: { $avg: '$overall.completeness' },
        avgAccuracy: { $avg: '$overall.accuracy' },
        totalRecords: { $sum: '$overall.totalRecords' },
        totalIssues: { $sum: '$issueSummary.total' },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

const DataQualityReport = mongoose.model('DataQualityReport', DataQualityReportSchema);

module.exports = DataQualityReport;