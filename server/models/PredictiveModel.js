const mongoose = require('mongoose');

const predictiveModelSchema = new mongoose.Schema({
  modelId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String
  },
  type: {
    type: String,
    enum: ['hire-probability', 'retention', 'salary', 'time-to-hire', 'candidate-quality', 'job-success'],
    required: true
  },
  version: {
    type: String,
    required: true,
    default: '1.0.0'
  },
  trainingDataRange: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    recordCount: {
      type: Number,
      required: true
    }
  },
  accuracy: {
    overall: {
      type: Number,
      min: 0,
      max: 100
    },
    precision: Number,
    recall: Number,
    f1Score: Number,
    mae: Number, // Mean Absolute Error for regression
    rmse: Number // Root Mean Square Error for regression
  },
  performanceMetrics: {
    trainingTime: Number, // in seconds
    inferenceTime: Number, // in milliseconds
    memoryUsage: Number, // in MB
    modelSize: Number // in MB
  },
  features: [{
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['numeric', 'categorical', 'text', 'boolean', 'date']
    },
    importance: {
      type: Number,
      min: 0,
      max: 100
    },
    description: String
  }],
  modelPath: {
    type: String,
    required: true
  },
  modelFormat: {
    type: String,
    enum: ['tensorflow', 'pytorch', 'sklearn', 'onnx', 'json'],
    default: 'json'
  },
  hyperparameters: {
    type: mongoose.Schema.Types.Mixed
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  lastTrainedAt: {
    type: Date,
    required: true
  },
  trainingHistory: [{
    version: String,
    trainedAt: Date,
    accuracy: Number,
    trainingDataCount: Number,
    changes: String
  }],
  usageStats: {
    totalPredictions: {
      type: Number,
      default: 0
    },
    lastUsedAt: Date,
    averageResponseTime: Number
  },
  validationResults: {
    confusionMatrix: mongoose.Schema.Types.Mixed,
    rocCurve: mongoose.Schema.Types.Mixed,
    featureImportance: [{
      feature: String,
      importance: Number
    }]
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
predictiveModelSchema.index({ type: 1, isActive: 1 });
predictiveModelSchema.index({ isDefault: 1 });
predictiveModelSchema.index({ 'accuracy.overall': -1 });
predictiveModelSchema.index({ lastTrainedAt: -1 });

// Pre-save middleware
predictiveModelSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to record prediction usage
predictiveModelSchema.methods.recordUsage = async function(responseTime) {
  this.usageStats.totalPredictions += 1;
  this.usageStats.lastUsedAt = new Date();
  
  // Update average response time using moving average
  if (this.usageStats.averageResponseTime) {
    this.usageStats.averageResponseTime = 
      (this.usageStats.averageResponseTime * (this.usageStats.totalPredictions - 1) + responseTime) / 
      this.usageStats.totalPredictions;
  } else {
    this.usageStats.averageResponseTime = responseTime;
  }
  
  await this.save();
};

// Method to add training history entry
predictiveModelSchema.methods.addTrainingHistory = async function(changes) {
  this.trainingHistory.push({
    version: this.version,
    trainedAt: this.lastTrainedAt,
    accuracy: this.accuracy.overall,
    trainingDataCount: this.trainingDataRange.recordCount,
    changes
  });
  await this.save();
};

// Static method to get active model by type
predictiveModelSchema.statics.getActiveModel = function(type) {
  return this.findOne({
    type,
    isActive: true,
    isDefault: true
  }).sort({ lastTrainedAt: -1 });
};

// Static method to get all models by type
predictiveModelSchema.statics.getModelsByType = function(type, options = {}) {
  const query = { type };
  
  if (options.activeOnly) {
    query.isActive = true;
  }
  
  return this.find(query)
    .sort(options.sortBy || { lastTrainedAt: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 20);
};

// Static method to get model performance comparison
predictiveModelSchema.statics.getPerformanceComparison = async function(type) {
  const models = await this.find({ type, isActive: true })
    .select('name version accuracy.overall lastTrainedAt usageStats.totalPredictions')
    .sort({ 'accuracy.overall': -1 });
  
  return models;
};

// Static method to set default model
predictiveModelSchema.statics.setDefaultModel = async function(modelId) {
  const model = await this.findById(modelId);
  if (!model) {
    throw new Error('Model not found');
  }
  
  // Unset current default for this type
  await this.updateMany(
    { type: model.type, isDefault: true },
    { $set: { isDefault: false } }
  );
  
  // Set new default
  model.isDefault = true;
  await model.save();
  
  return model;
};

module.exports = mongoose.model('PredictiveModel', predictiveModelSchema);
