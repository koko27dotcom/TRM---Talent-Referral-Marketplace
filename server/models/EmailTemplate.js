/**
 * Email Template Model
 * Reusable email templates with variable support
 * Supports both HTML and text versions, with multilingual support
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Template Variable Schema
const TemplateVariableSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  defaultValue: {
    type: String,
    default: '',
  },
  required: {
    type: Boolean,
    default: false,
  },
  type: {
    type: String,
    enum: ['string', 'number', 'date', 'url', 'boolean'],
    default: 'string',
  },
}, { _id: true });

// Template Version Schema (for version control)
const TemplateVersionSchema = new Schema({
  version: {
    type: Number,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  htmlContent: {
    type: String,
    required: true,
  },
  textContent: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  changeNotes: {
    type: String,
    trim: true,
  },
}, { _id: true });

// Main Email Template Schema
const EmailTemplateSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  
  // Unique identifier for programmatic access
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: /^[a-z0-9_-]+$/,
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  
  // Template Category
  category: {
    type: String,
    enum: [
      'welcome',
      'notification',
      'marketing',
      'transactional',
      'referral',
      'payout',
      're_engagement',
      'job_alert',
      'system',
      'custom',
    ],
    default: 'custom',
  },
  
  // Template Type
  type: {
    type: String,
    enum: ['html', 'text', 'mjml', 'markdown'],
    default: 'html',
  },
  
  // Subject Line
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  
  // Content
  htmlContent: {
    type: String,
    required: true,
  },
  textContent: {
    type: String,
    default: '',
  },
  
  // Variables that can be used in the template
  variables: [TemplateVariableSchema],
  
  // Predefined variables documentation
  variableExamples: {
    type: Map,
    of: String,
    default: {},
  },
  
  // Template Versions (for history)
  versions: [TemplateVersionSchema],
  currentVersion: {
    type: Number,
    default: 1,
  },
  
  // Multilingual Support
  translations: {
    type: Map,
    of: new Schema({
      subject: String,
      htmlContent: String,
      textContent: String,
    }, { _id: false }),
    default: {},
  },
  
  // Default Language
  defaultLanguage: {
    type: String,
    default: 'en',
    enum: ['en', 'my', 'both'],
  },
  
  // Template Settings
  settings: {
    // Auto-generate text version from HTML
    autoText: {
      type: Boolean,
      default: true,
    },
    // Include unsubscribe link
    includeUnsubscribe: {
      type: Boolean,
      default: true,
    },
    // Track opens
    trackOpens: {
      type: Boolean,
      default: true,
    },
    // Track clicks
    trackClicks: {
      type: Boolean,
      default: true,
    },
    // Inline CSS
    inlineCss: {
      type: Boolean,
      default: true,
    },
  },
  
  // Template Preview (thumbnail/screenshot URL)
  previewImage: {
    type: String,
    default: null,
  },
  
  // Template Status
  status: {
    type: String,
    enum: ['draft', 'active', 'archived'],
    default: 'draft',
  },
  
  // Usage Statistics
  usageStats: {
    timesUsed: { type: Number, default: 0 },
    lastUsedAt: { type: Date, default: null },
  },
  
  // Template Inheritance (for base templates)
  parentTemplateId: {
    type: Schema.Types.ObjectId,
    ref: 'EmailTemplate',
    default: null,
  },
  
  // Layout/Theme
  layout: {
    type: String,
    enum: ['default', 'minimal', 'newsletter', 'promotional', 'transactional'],
    default: 'default',
  },
  
  // Tags for organization
  tags: [{
    type: String,
    trim: true,
    maxlength: 50,
  }],
  
  // Metadata
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    default: null,
  },
}, {
  timestamps: true,
});

// Indexes
EmailTemplateSchema.index({ slug: 1 });
EmailTemplateSchema.index({ category: 1, status: 1 });
EmailTemplateSchema.index({ createdBy: 1 });
EmailTemplateSchema.index({ organizationId: 1 });
EmailTemplateSchema.index({ tags: 1 });

// Method to render template with variables
EmailTemplateSchema.methods.render = function(variables = {}, language = 'en') {
  let html = this.htmlContent;
  let text = this.textContent;
  let subject = this.subject;
  
  // Use translation if available
  if (language !== 'en' && this.translations.has(language)) {
    const translation = this.translations.get(language);
    html = translation.htmlContent || html;
    text = translation.textContent || text;
    subject = translation.subject || subject;
  }
  
  // Replace variables in content
  const replaceVariables = (content, vars) => {
    if (!content) return content;
    
    let result = content;
    
    // Handle {{variable}} syntax
    Object.entries(vars).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, value || '');
    });
    
    // Handle conditional blocks {{#if variable}}...{{/if}}
    result = result.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, varName, content) => {
      return vars[varName] ? content : '';
    });
    
    // Handle fallback for missing variables
    result = result.replace(/{{\s*(\w+)\s*\|\s*default:\s*"([^"]*)"\s*}}/g, (match, varName, defaultVal) => {
      return vars[varName] || defaultVal;
    });
    
    return result;
  };
  
  return {
    subject: replaceVariables(subject, variables),
    html: replaceVariables(html, variables),
    text: replaceVariables(text, variables),
  };
};

// Method to validate required variables
EmailTemplateSchema.methods.validateVariables = function(variables = {}) {
  const missing = [];
  
  for (const variable of this.variables) {
    if (variable.required && !variables[variable.name]) {
      missing.push(variable.name);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
};

// Method to create new version
EmailTemplateSchema.methods.createVersion = async function(createdBy, changeNotes = '') {
  const newVersion = {
    version: this.currentVersion + 1,
    subject: this.subject,
    htmlContent: this.htmlContent,
    textContent: this.textContent,
    createdBy,
    changeNotes,
  };
  
  this.versions.push(newVersion);
  this.currentVersion = newVersion.version;
  
  return this.save();
};

// Method to restore version
EmailTemplateSchema.methods.restoreVersion = async function(versionNumber) {
  const version = this.versions.find(v => v.version === versionNumber);
  if (!version) {
    throw new Error(`Version ${versionNumber} not found`);
  }
  
  this.subject = version.subject;
  this.htmlContent = version.htmlContent;
  this.textContent = version.textContent;
  
  return this.save();
};

// Static method to get template by slug
EmailTemplateSchema.statics.findBySlug = function(slug) {
  return this.findOne({ slug, status: { $ne: 'archived' } });
};

// Static method to get templates by category
EmailTemplateSchema.statics.findByCategory = function(category, options = {}) {
  const query = { category, status: { $ne: 'archived' } };
  
  if (options.organizationId) {
    query.$or = [
      { organizationId: options.organizationId },
      { organizationId: null },
    ];
  }
  
  return this.find(query).sort({ createdAt: -1 });
};

const EmailTemplate = mongoose.model('EmailTemplate', EmailTemplateSchema);

module.exports = EmailTemplate;
