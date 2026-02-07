const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reportId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DataProduct',
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'customerType'
  },
  customerType: {
    type: String,
    enum: ['User', 'Company'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String
  },
  parameters: {
    type: mongoose.Schema.Types.Mixed,
    description: 'Report generation parameters'
  },
  dataSnapshot: {
    type: mongoose.Schema.Types.Mixed,
    description: 'Snapshot of data used to generate report'
  },
  fileUrls: {
    pdf: String,
    excel: String,
    csv: String,
    json: String
  },
  fileSizes: {
    pdf: Number,
    excel: Number,
    csv: Number,
    json: Number
  },
  status: {
    type: String,
    enum: ['generating', 'completed', 'failed', 'expired'],
    default: 'generating'
  },
  generationProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  generationError: {
    type: String
  },
  expiresAt: {
    type: Date,
    required: true
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  lastDownloadedAt: {
    type: Date
  },
  downloadHistory: [{
    downloadedAt: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String
  }],
  isScheduled: {
    type: Boolean,
    default: false
  },
  scheduleConfig: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly']
    },
    nextRunAt: Date,
    lastRunAt: Date,
    isActive: {
      type: Boolean,
      default: true
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
reportSchema.index({ customerId: 1, customerType: 1 });
reportSchema.index({ productId: 1 });
reportSchema.index({ status: 1 });
reportSchema.index({ expiresAt: 1 });
reportSchema.index({ 'scheduleConfig.isActive': 1, 'scheduleConfig.nextRunAt': 1 });

// Pre-save middleware
reportSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to record download
reportSchema.methods.recordDownload = async function(ipAddress, userAgent) {
  this.downloadCount += 1;
  this.lastDownloadedAt = new Date();
  this.downloadHistory.push({
    downloadedAt: new Date(),
    ipAddress,
    userAgent
  });
  await this.save();
};

// Method to check if report is accessible
reportSchema.methods.isAccessible = function() {
  return this.status === 'completed' && this.expiresAt > new Date();
};

// Static method to get customer reports
reportSchema.statics.getCustomerReports = function(customerId, customerType, options = {}) {
  const query = { customerId, customerType };
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .populate('productId', 'name type category')
    .sort(options.sortBy || { createdAt: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 20);
};

// Static method to get expired reports for cleanup
reportSchema.statics.getExpiredReports = function(batchSize = 100) {
  return this.find({
    expiresAt: { $lt: new Date() },
    status: { $ne: 'expired' }
  }).limit(batchSize);
};

// Static method to get scheduled reports to run
reportSchema.statics.getScheduledReportsToRun = function() {
  return this.find({
    isScheduled: true,
    'scheduleConfig.isActive': true,
    'scheduleConfig.nextRunAt': { $lte: new Date() }
  });
};

module.exports = mongoose.model('Report', reportSchema);
