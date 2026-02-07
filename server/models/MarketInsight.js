const mongoose = require('mongoose');

const marketInsightSchema = new mongoose.Schema({
  insightId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  category: {
    type: String,
    enum: ['hiring-trend', 'skill-demand', 'salary-trend', 'competitor', 'market-sentiment', 'industry-growth'],
    required: true
  },
  industry: {
    type: String,
    required: true
  },
  location: {
    country: String,
    state: String,
    city: String
  },
  timeRange: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    granularity: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
      default: 'monthly'
    }
  },
  dataPoints: {
    type: mongoose.Schema.Types.Mixed,
    description: 'Raw data points for the insight'
  },
  trends: [{
    metric: String,
    direction: {
      type: String,
      enum: ['up', 'down', 'stable']
    },
    percentage: Number,
    period: String,
    description: String
  }],
  predictions: [{
    metric: String,
    predictedValue: Number,
    confidenceInterval: {
      lower: Number,
      upper: Number
    },
    timeframe: String,
    description: String
  }],
  confidenceScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  sources: [{
    type: {
      type: String,
      enum: ['job-posting', 'application', 'user-profile', 'survey', 'external']
    },
    count: Number,
    description: String
  }],
  keyFindings: [{
    type: String
  }],
  recommendations: [{
    audience: String,
    action: String,
    priority: {
      type: String,
      enum: ['high', 'medium', 'low']
    }
  }],
  visualizations: [{
    type: {
      type: String,
      enum: ['line-chart', 'bar-chart', 'pie-chart', 'heatmap', 'treemap', 'gauge']
    },
    title: String,
    data: mongoose.Schema.Types.Mixed,
    config: mongoose.Schema.Types.Mixed
  }],
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: {
    type: Date
  },
  viewCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
marketInsightSchema.index({ category: 1, industry: 1 });
marketInsightSchema.index({ 'timeRange.startDate': 1, 'timeRange.endDate': 1 });
marketInsightSchema.index({ isPublished: 1, publishedAt: -1 });
marketInsightSchema.index({ location: 1 });
marketInsightSchema.index({ confidenceScore: -1 });

// Pre-save middleware
marketInsightSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  if (this.isPublished && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

// Method to increment view count
marketInsightSchema.methods.incrementViews = async function() {
  this.viewCount += 1;
  await this.save();
};

// Static method to get insights by category
marketInsightSchema.statics.getByCategory = function(category, options = {}) {
  const query = { isPublished: true };
  if (category !== 'all') {
    query.category = category;
  }
  
  return this.find(query)
    .sort(options.sortBy || { publishedAt: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 20);
};

// Static method to get insights by industry
marketInsightSchema.statics.getByIndustry = function(industry, options = {}) {
  return this.find({
    industry,
    isPublished: true
  })
    .sort(options.sortBy || { 'timeRange.endDate': -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 20);
};

// Static method to get latest insights
marketInsightSchema.statics.getLatest = function(limit = 10) {
  return this.find({ isPublished: true })
    .sort({ publishedAt: -1 })
    .limit(limit);
};

// Static method to get trending insights
marketInsightSchema.statics.getTrending = function(limit = 10) {
  return this.find({ isPublished: true })
    .sort({ viewCount: -1 })
    .limit(limit);
};

module.exports = mongoose.model('MarketInsight', marketInsightSchema);
