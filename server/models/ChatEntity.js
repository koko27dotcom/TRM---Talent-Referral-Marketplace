/**
 * ChatEntity Model
 * Represents entity definitions for entity extraction in chatbot NLP
 * Stores entity values, synonyms, and extraction patterns
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Entity value schema
const EntityValueSchema = new Schema({
  value: {
    type: String,
    required: true,
    trim: true,
  },
  synonyms: [{
    type: String,
    trim: true,
  }],
  language: {
    type: String,
    enum: ['en', 'my', 'both'],
    default: 'en',
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, { _id: true });

// Extraction pattern schema
const ExtractionPatternSchema = new Schema({
  pattern: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['regex', 'keyword', 'nlp', 'composite'],
    required: true,
  },
  priority: {
    type: Number,
    default: 0,
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.8,
  },
  examples: [String],
}, { _id: true });

// Validation rule schema
const ValidationRuleSchema = new Schema({
  type: {
    type: String,
    enum: ['required', 'format', 'range', 'enum', 'custom'],
    required: true,
  },
  rule: Schema.Types.Mixed,
  errorMessage: {
    type: String,
    trim: true,
  },
}, { _id: false });

// Main ChatEntity schema
const ChatEntitySchema = new Schema({
  entityId: {
    type: String,
    required: [true, 'Entity ID is required'],
    unique: true,
    index: true,
    trim: true,
  },
  name: {
    type: String,
    required: [true, 'Entity name is required'],
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
  type: {
    type: String,
    enum: ['system', 'custom', 'composite', 'enum', 'regex'],
    required: true,
    index: true,
  },
  dataType: {
    type: String,
    enum: ['string', 'number', 'date', 'boolean', 'location', 'email', 'phone', 'url', 'list'],
    default: 'string',
  },
  values: {
    type: [EntityValueSchema],
    default: [],
  },
  patterns: {
    type: [ExtractionPatternSchema],
    default: [],
  },
  validationRules: {
    type: [ValidationRuleSchema],
    default: [],
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
  isList: {
    type: Boolean,
    default: false,
  },
  allowFuzzyMatch: {
    type: Boolean,
    default: true,
  },
  fuzzyMatchThreshold: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.8,
  },
  parentEntity: {
    type: String,
    trim: true,
  },
  childEntities: [{
    type: String,
    trim: true,
  }],
  botTypes: [{
    type: String,
    enum: ['recruiter', 'referrer', 'candidate', 'admin', 'general'],
    index: true,
  }],
  category: {
    type: String,
    enum: ['job', 'skill', 'location', 'company', 'person', 'date', 'number', 'contact', 'general'],
    default: 'general',
    index: true,
  },
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
    extractionCount: {
      type: Number,
      default: 0,
    },
    avgConfidence: {
      type: Number,
      default: 0,
    },
    lastExtractedAt: Date,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
ChatEntitySchema.index({ type: 1, isActive: 1 });
ChatEntitySchema.index({ category: 1, isActive: 1 });
ChatEntitySchema.index({ botTypes: 1, isActive: 1 });
ChatEntitySchema.index({ 'values.value': 'text', 'values.synonyms': 'text' });
ChatEntitySchema.index({ name: 'text', description: 'text' });

// Pre-save middleware
ChatEntitySchema.pre('save', function(next) {
  if (!this.displayName) {
    this.displayName = this.name;
  }
  if (!this.entityId) {
    this.entityId = `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

// Virtual for value count
ChatEntitySchema.virtual('valueCount').get(function() {
  return this.values.length;
});

// Virtual for pattern count
ChatEntitySchema.virtual('patternCount').get(function() {
  return this.patterns.length;
});

// Method to add value
ChatEntitySchema.methods.addValue = function(value, synonyms = [], language = 'en', metadata = {}) {
  this.values.push({
    value,
    synonyms,
    language,
    metadata,
  });
  return this.save();
};

// Method to add pattern
ChatEntitySchema.methods.addPattern = function(pattern, type, options = {}) {
  const { priority = 0, confidence = 0.8, examples = [] } = options;
  this.patterns.push({
    pattern,
    type,
    priority,
    confidence,
    examples,
  });
  return this.save();
};

// Method to extract entity from text
ChatEntitySchema.methods.extract = function(text) {
  const results = [];
  
  // Try pattern matching
  for (const pattern of this.patterns) {
    if (pattern.type === 'regex') {
      try {
        const regex = new RegExp(pattern.pattern, 'gi');
        let match;
        while ((match = regex.exec(text)) !== null) {
          results.push({
            value: match[0],
            normalizedValue: match[1] || match[0],
            type: this.name,
            confidence: pattern.confidence,
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            source: 'regex',
          });
        }
      } catch (e) {
        console.error(`Invalid regex pattern for entity ${this.name}:`, e);
      }
    }
  }
  
  // Try value matching
  for (const valueObj of this.values) {
    const searchTerms = [valueObj.value, ...(valueObj.synonyms || [])];
    
    for (const term of searchTerms) {
      const index = text.toLowerCase().indexOf(term.toLowerCase());
      if (index !== -1) {
        results.push({
          value: term,
          normalizedValue: valueObj.value,
          type: this.name,
          confidence: 1,
          startIndex: index,
          endIndex: index + term.length,
          source: 'value',
        });
      }
    }
  }
  
  return results;
};

// Method to update analytics
ChatEntitySchema.methods.recordExtraction = function(confidence) {
  this.analytics.extractionCount += 1;
  this.analytics.lastExtractedAt = new Date();
  
  const currentAvg = this.analytics.avgConfidence;
  const count = this.analytics.extractionCount;
  this.analytics.avgConfidence = ((currentAvg * (count - 1)) + confidence) / count;
  
  return this.save();
};

// Static method to find by category
ChatEntitySchema.statics.findByCategory = function(category, botType) {
  const query = { category, isActive: true };
  if (botType) query.botTypes = botType;
  return this.find(query);
};

// Static method to find by type
ChatEntitySchema.statics.findByType = function(type, botType) {
  const query = { type, isActive: true };
  if (botType) query.botTypes = botType;
  return this.find(query);
};

// Static method to extract all entities from text
ChatEntitySchema.statics.extractAll = async function(text, botType) {
  const entities = await this.find({
    isActive: true,
    $or: [
      { botTypes: botType },
      { botTypes: 'general' },
      { botTypes: { $size: 0 } },
    ],
  });
  
  const allExtractions = [];
  
  for (const entity of entities) {
    const extractions = entity.extract(text);
    allExtractions.push(...extractions);
  }
  
  // Sort by confidence and remove duplicates
  allExtractions.sort((a, b) => b.confidence - a.confidence);
  
  // Remove overlapping extractions
  const filtered = [];
  for (const extraction of allExtractions) {
    const overlaps = filtered.some(e => 
      (extraction.startIndex < e.endIndex && extraction.endIndex > e.startIndex)
    );
    if (!overlaps) {
      filtered.push(extraction);
    }
  }
  
  return filtered;
};

// Static method to get system entities
ChatEntitySchema.statics.getSystemEntities = function() {
  return this.find({ type: 'system', isActive: true });
};

// Static method to initialize system entities
ChatEntitySchema.statics.initializeSystemEntities = async function() {
  const systemEntities = [
    {
      name: 'date',
      displayName: 'Date',
      type: 'system',
      dataType: 'date',
      category: 'date',
      patterns: [
        { pattern: '\\b(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})\\b', type: 'regex', confidence: 0.9 },
        { pattern: '\\b(today|tomorrow|yesterday|next week|last week)\\b', type: 'regex', confidence: 0.95 },
        { pattern: '\\b(January|February|March|April|May|June|July|August|September|October|November|December)\\s+\\d{1,2}(st|nd|rd|th)?\\b', type: 'regex', confidence: 0.9 },
      ],
    },
    {
      name: 'time',
      displayName: 'Time',
      type: 'system',
      dataType: 'string',
      category: 'date',
      patterns: [
        { pattern: '\\b(\\d{1,2}:\\d{2}\\s*(AM|PM|am|pm)?)\\b', type: 'regex', confidence: 0.95 },
        { pattern: '\\b(morning|afternoon|evening|night|noon|midnight)\\b', type: 'regex', confidence: 0.85 },
      ],
    },
    {
      name: 'email',
      displayName: 'Email Address',
      type: 'system',
      dataType: 'email',
      category: 'contact',
      patterns: [
        { pattern: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b', type: 'regex', confidence: 0.99 },
      ],
    },
    {
      name: 'phone',
      displayName: 'Phone Number',
      type: 'system',
      dataType: 'phone',
      category: 'contact',
      patterns: [
        { pattern: '\\b(?:\\+?95|0)?[\\s.-]?(?:9\\d{1}|7\\d{1})[\\s.-]?\\d{3}[\\s.-]?\\d{3,4}\\b', type: 'regex', confidence: 0.95 },
        { pattern: '\\b\\+?[1-9]\\d{1,14}\\b', type: 'regex', confidence: 0.9 },
      ],
    },
    {
      name: 'number',
      displayName: 'Number',
      type: 'system',
      dataType: 'number',
      category: 'number',
      patterns: [
        { pattern: '\\b\\d+(?:,\\d{3})*(?:\\.\\d+)?\\b', type: 'regex', confidence: 0.95 },
        { pattern: '\\b(one|two|three|four|five|six|seven|eight|nine|ten)\\b', type: 'regex', confidence: 0.85 },
      ],
    },
    {
      name: 'currency',
      displayName: 'Currency Amount',
      type: 'system',
      dataType: 'number',
      category: 'number',
      patterns: [
        { pattern: '\\b(?:MMK|USD|\$|Ks|K)[\\s.]?(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\b', type: 'regex', confidence: 0.95 },
        { pattern: '\\b(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(?:MMK|USD|\$|Ks|K)\\b', type: 'regex', confidence: 0.95 },
      ],
    },
    {
      name: 'location',
      displayName: 'Location',
      type: 'system',
      dataType: 'location',
      category: 'location',
      patterns: [
        { pattern: '\\b(in|at|from|to)\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*)\\b', type: 'regex', confidence: 0.8 },
      ],
      values: [
        { value: 'Yangon', synonyms: ['Rangoon', 'Yangon City'], language: 'en' },
        { value: 'Mandalay', synonyms: ['Mandalay City'], language: 'en' },
        { value: 'Naypyidaw', synonyms: ['Nay Pyi Taw', 'Naypyitaw', 'Capital'], language: 'en' },
        { value: 'Myanmar', synonyms: ['Burma', 'Republic of the Union of Myanmar'], language: 'en' },
      ],
    },
    {
      name: 'job_title',
      displayName: 'Job Title',
      type: 'system',
      dataType: 'string',
      category: 'job',
      patterns: [
        { pattern: '\\b(Developer|Engineer|Manager|Designer|Analyst|Consultant|Director|Specialist|Coordinator)\\b', type: 'regex', confidence: 0.85 },
        { pattern: '\\b(Senior|Junior|Lead|Principal|Staff)\\s+([A-Za-z]+)\\b', type: 'regex', confidence: 0.8 },
      ],
      values: [
        { value: 'Software Developer', synonyms: ['Programmer', 'Coder', 'Software Engineer'], language: 'en' },
        { value: 'Project Manager', synonyms: ['PM'], language: 'en' },
        { value: 'Data Analyst', synonyms: ['Data Scientist', 'Business Analyst'], language: 'en' },
        { value: 'UI/UX Designer', synonyms: ['Designer', 'UI Designer', 'UX Designer'], language: 'en' },
        { value: 'Marketing Manager', synonyms: ['Marketing Director'], language: 'en' },
        { value: 'Sales Representative', synonyms: ['Salesperson', 'Sales Executive'], language: 'en' },
        { value: 'HR Manager', synonyms: ['Human Resources Manager', 'HR Director'], language: 'en' },
      ],
    },
    {
      name: 'skill',
      displayName: 'Skill',
      type: 'system',
      dataType: 'string',
      category: 'skill',
      values: [
        { value: 'JavaScript', synonyms: ['JS', 'ECMAScript'], language: 'en' },
        { value: 'Python', synonyms: ['Py'], language: 'en' },
        { value: 'React', synonyms: ['ReactJS', 'React.js'], language: 'en' },
        { value: 'Node.js', synonyms: ['Node', 'NodeJS'], language: 'en' },
        { value: 'Java', synonyms: [], language: 'en' },
        { value: 'SQL', synonyms: ['MySQL', 'PostgreSQL', 'Database'], language: 'en' },
        { value: 'AWS', synonyms: ['Amazon Web Services', 'Cloud'], language: 'en' },
        { value: 'Project Management', synonyms: ['PM'], language: 'en' },
        { value: 'Communication', synonyms: [], language: 'en' },
        { value: 'Leadership', synonyms: [], language: 'en' },
      ],
    },
    {
      name: 'experience_level',
      displayName: 'Experience Level',
      type: 'system',
      dataType: 'string',
      category: 'job',
      values: [
        { value: 'Entry Level', synonyms: ['Junior', 'Fresh Graduate', '0-1 years', 'No experience'], language: 'en' },
        { value: 'Mid Level', synonyms: ['Intermediate', '2-5 years'], language: 'en' },
        { value: 'Senior Level', synonyms: ['Senior', '5+ years', 'Experienced'], language: 'en' },
        { value: 'Manager', synonyms: ['Management', 'Team Lead'], language: 'en' },
        { value: 'Executive', synonyms: ['Director', 'VP', 'C-Level', 'C-Suite'], language: 'en' },
      ],
    },
  ];
  
  for (const entityData of systemEntities) {
    await this.findOneAndUpdate(
      { name: entityData.name, type: 'system' },
      { ...entityData, isSystem: true, isActive: true },
      { upsert: true, new: true }
    );
  }
  
  console.log('System entities initialized');
};

const ChatEntity = mongoose.model('ChatEntity', ChatEntitySchema);

module.exports = ChatEntity;
