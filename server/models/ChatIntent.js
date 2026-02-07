/**
 * ChatIntent Model
 * Represents intent definitions for the chatbot NLP system
 * Stores training phrases, responses, and action configurations
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Training phrase schema
const TrainingPhraseSchema = new Schema({
  phrase: {
    type: String,
    required: true,
    trim: true,
  },
  language: {
    type: String,
    enum: ['en', 'my', 'both'],
    default: 'en',
  },
  entities: [{
    name: String,
    value: String,
    startIndex: Number,
    endIndex: Number,
  }],
  addedAt: {
    type: Date,
    default: Date.now,
  },
  usageCount: {
    type: Number,
    default: 0,
  },
}, { _id: true });

// Response template schema
const ResponseTemplateSchema = new Schema({
  template: {
    type: String,
    required: true,
    trim: true,
  },
  language: {
    type: String,
    enum: ['en', 'my', 'both'],
    default: 'en',
  },
  type: {
    type: String,
    enum: ['text', 'rich', 'card', 'list', 'suggestion', 'image', 'custom'],
    default: 'text',
  },
  variations: [{
    type: String,
    trim: true,
  }],
  conditions: {
    userType: [String],
    context: Schema.Types.Mixed,
  },
  priority: {
    type: Number,
    default: 0,
  },
}, { _id: true });

// Action configuration schema
const ActionConfigSchema = new Schema({
  type: {
    type: String,
    required: true,
    enum: ['navigate', 'api_call', 'show_data', 'open_modal', 'schedule', 'escalate', 'suggest', 'form', 'none'],
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: String,
  parameters: [{
    name: String,
    type: {
      type: String,
      enum: ['string', 'number', 'boolean', 'array', 'object', 'entity'],
    },
    required: Boolean,
    defaultValue: Schema.Types.Mixed,
    entityMapping: String,
  }],
  endpoint: String,
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  },
  headers: Schema.Types.Mixed,
  payload: Schema.Types.Mixed,
  successMessage: String,
  errorMessage: String,
}, { _id: true });

// Required entity schema
const RequiredEntitySchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['system', 'custom'],
    default: 'custom',
  },
  required: {
    type: Boolean,
    default: true,
  },
  promptMessage: {
    type: String,
    trim: true,
  },
  validation: {
    type: {
      type: String,
      enum: ['regex', 'range', 'enum', 'custom'],
    },
    rule: String,
    errorMessage: String,
  },
}, { _id: false });

// Context configuration schema
const ContextConfigSchema = new Schema({
  inputContexts: [{
    name: String,
    required: Boolean,
    lifespan: {
      type: Number,
      default: 5,
    },
  }],
  outputContexts: [{
    name: String,
    lifespan: {
      type: Number,
      default: 5,
    },
    parameters: Schema.Types.Mixed,
  }],
}, { _id: false });

// Main ChatIntent schema
const ChatIntentSchema = new Schema({
  intentId: {
    type: String,
    required: [true, 'Intent ID is required'],
    unique: true,
    index: true,
    trim: true,
  },
  name: {
    type: String,
    required: [true, 'Intent name is required'],
    trim: true,
    index: true,
  },
  displayName: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  category: {
    type: String,
    enum: ['referral', 'job', 'payment', 'support', 'general', 'greeting', 'goodbye', 'help', 'smalltalk', 'fallback'],
    required: true,
    index: true,
  },
  subcategory: {
    type: String,
    trim: true,
    index: true,
  },
  botTypes: [{
    type: String,
    enum: ['recruiter', 'referrer', 'candidate', 'admin', 'general'],
    index: true,
  }],
  trainingPhrases: {
    type: [TrainingPhraseSchema],
    default: [],
  },
  responses: {
    type: [ResponseTemplateSchema],
    default: [],
  },
  actions: {
    type: [ActionConfigSchema],
    default: [],
  },
  requiredEntities: {
    type: [RequiredEntitySchema],
    default: [],
  },
  contextConfig: {
    type: ContextConfigSchema,
    default: () => ({}),
  },
  priority: {
    type: Number,
    default: 0,
    index: true,
  },
  confidenceThreshold: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.7,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  isSystem: {
    type: Boolean,
    default: false,
  },
  parentIntent: {
    type: String,
    trim: true,
  },
  followUpIntents: [{
    type: String,
    trim: true,
  }],
  events: [{
    name: String,
    trigger: String,
  }],
  metadata: {
    author: String,
    source: String,
    version: {
      type: Number,
      default: 1,
    },
    tags: [String],
    notes: String,
  },
  analytics: {
    triggeredCount: {
      type: Number,
      default: 0,
    },
    avgConfidence: {
      type: Number,
      default: 0,
    },
    lastTriggeredAt: Date,
    successRate: {
      type: Number,
      default: 0,
    },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
ChatIntentSchema.index({ category: 1, isActive: 1 });
ChatIntentSchema.index({ botTypes: 1, isActive: 1 });
ChatIntentSchema.index({ priority: -1 });
ChatIntentSchema.index({ 'trainingPhrases.phrase': 'text' });
ChatIntentSchema.index({ name: 'text', description: 'text' });

// Virtual for training phrase count
ChatIntentSchema.virtual('trainingPhraseCount').get(function() {
  return this.trainingPhrases.length;
});

// Virtual for response count
ChatIntentSchema.virtual('responseCount').get(function() {
  return this.responses.length;
});

// Pre-save middleware
ChatIntentSchema.pre('save', function(next) {
  if (!this.displayName) {
    this.displayName = this.name;
  }
  if (!this.intentId) {
    this.intentId = `intent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

// Method to add training phrase
ChatIntentSchema.methods.addTrainingPhrase = function(phrase, language = 'en', entities = []) {
  this.trainingPhrases.push({
    phrase,
    language,
    entities,
    addedAt: new Date(),
  });
  return this.save();
};

// Method to add response
ChatIntentSchema.methods.addResponse = function(template, options = {}) {
  const { language = 'en', type = 'text', variations = [], priority = 0 } = options;
  this.responses.push({
    template,
    language,
    type,
    variations,
    priority,
  });
  return this.save();
};

// Method to get random response
ChatIntentSchema.methods.getRandomResponse = function(language = 'en', userType = null) {
  let eligibleResponses = this.responses.filter(r => 
    r.language === language || r.language === 'both'
  );
  
  if (userType && eligibleResponses.length > 0) {
    const filteredByUserType = eligibleResponses.filter(r => 
      !r.conditions?.userType || r.conditions.userType.includes(userType)
    );
    if (filteredByUserType.length > 0) {
      eligibleResponses = filteredByUserType;
    }
  }
  
  if (eligibleResponses.length === 0) return null;
  
  // Sort by priority
  eligibleResponses.sort((a, b) => b.priority - a.priority);
  
  // Return highest priority or random from top tier
  const topPriority = eligibleResponses[0].priority;
  const topResponses = eligibleResponses.filter(r => r.priority === topPriority);
  const selected = topResponses[Math.floor(Math.random() * topResponses.length)];
  
  // Include variations
  const allOptions = [selected.template, ...(selected.variations || [])];
  return allOptions[Math.floor(Math.random() * allOptions.length)];
};

// Method to update analytics
ChatIntentSchema.methods.recordTrigger = function(confidence) {
  this.analytics.triggeredCount += 1;
  this.analytics.lastTriggeredAt = new Date();
  
  // Update rolling average confidence
  const currentAvg = this.analytics.avgConfidence;
  const count = this.analytics.triggeredCount;
  this.analytics.avgConfidence = ((currentAvg * (count - 1)) + confidence) / count;
  
  return this.save();
};

// Static method to find by category
ChatIntentSchema.statics.findByCategory = function(category, botType) {
  const query = { category, isActive: true };
  if (botType) query.botTypes = botType;
  return this.find(query).sort({ priority: -1 });
};

// Static method to find matching intent
ChatIntentSchema.statics.findMatchingIntent = async function(text, botType, language = 'en') {
  // Search in training phrases using text search
  const intents = await this.find({
    isActive: true,
    botTypes: botType,
    $text: { $search: text },
  }, { score: { $meta: 'textScore' } })
  .sort({ score: { $meta: 'textScore' } })
  .limit(5);
  
  // Also check for exact phrase matches
  const exactMatch = await this.findOne({
    isActive: true,
    botTypes: botType,
    'trainingPhrases.phrase': { $regex: new RegExp(text, 'i') },
  });
  
  if (exactMatch) {
    return { intent: exactMatch, confidence: 1, matchType: 'exact' };
  }
  
  if (intents.length > 0) {
    const score = intents[0].score || 0;
    const normalizedConfidence = Math.min(score / 10, 1); // Normalize score
    return { intent: intents[0], confidence: normalizedConfidence, matchType: 'fuzzy' };
  }
  
  return null;
};

// Static method to get intent statistics
ChatIntentSchema.statics.getStatistics = async function() {
  return this.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        activeCount: {
          $sum: { $cond: ['$isActive', 1, 0] },
        },
        totalTrainingPhrases: { $sum: { $size: '$trainingPhrases' } },
        avgConfidence: { $avg: '$analytics.avgConfidence' },
        totalTriggers: { $sum: '$analytics.triggeredCount' },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

// Static method to get fallback intent
ChatIntentSchema.statics.getFallbackIntent = function(botType) {
  return this.findOne({
    category: 'fallback',
    isActive: true,
    botTypes: { $in: [botType, 'general'] },
  }).sort({ priority: -1 });
};

// Static method to get greeting intent
ChatIntentSchema.statics.getGreetingIntent = function(botType) {
  return this.findOne({
    category: 'greeting',
    isActive: true,
    botTypes: { $in: [botType, 'general'] },
  }).sort({ priority: -1 });
};

const ChatIntent = mongoose.model('ChatIntent', ChatIntentSchema);

module.exports = ChatIntent;
