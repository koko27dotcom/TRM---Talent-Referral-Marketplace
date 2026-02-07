/**
 * WhatsApp Template Model
 * Manages WhatsApp Business API message templates
 * Supports both Burmese (Myanmar) and English languages
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Template component schema for WhatsApp Business API
const TemplateComponentSchema = new Schema({
  type: {
    type: String,
    enum: ['header', 'body', 'footer', 'buttons'],
    required: true,
  },
  format: {
    type: String,
    enum: ['text', 'image', 'video', 'document', 'location', null],
    default: null,
  },
  text: {
    type: String,
    trim: true,
  },
  example: {
    type: Schema.Types.Mixed,
  },
  buttons: [{
    type: {
      type: String,
      enum: ['quick_reply', 'url', 'phone_number', 'copy_code'],
    },
    text: {
      type: String,
      trim: true,
    },
    url: {
      type: String,
      trim: true,
    },
    phone_number: {
      type: String,
      trim: true,
    },
    code: {
      type: String,
      trim: true,
    },
  }],
}, { _id: false });

// Template language schema
const TemplateLanguageSchema = new Schema({
  code: {
    type: String,
    required: true,
    enum: ['en', 'my', 'en_US', 'my_MM'],
  },
  policy: {
    type: String,
    enum: ['deterministic', 'fallback'],
    default: 'deterministic',
  },
  components: [TemplateComponentSchema],
}, { _id: false });

// WhatsApp Template Status
const TEMPLATE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PAUSED: 'paused',
  PENDING_DELETION: 'pending_deletion',
  DELETED: 'deleted',
};

// Template category
const TEMPLATE_CATEGORY = {
  MARKETING: 'MARKETING',
  UTILITY: 'UTILITY',
  AUTHENTICATION: 'AUTHENTICATION',
};

// Template purpose/type
const TEMPLATE_TYPE = {
  WELCOME: 'welcome',
  REFERRAL_SUBMITTED: 'referral_submitted',
  REFERRAL_STATUS_UPDATE: 'referral_status_update',
  REFERRAL_HIRED: 'referral_hired',
  REFERRAL_PAID: 'referral_paid',
  JOB_ALERT: 'job_alert',
  APPLICATION_REMINDER: 'application_reminder',
  PAYOUT_NOTIFICATION: 'payout_notification',
  COMPANY_APPROVAL_REQUEST: 'company_approval_request',
  COMPANY_STATUS_UPDATE: 'company_status_update',
  OPT_IN_CONFIRMATION: 'opt_in_confirmation',
  OPT_OUT_CONFIRMATION: 'opt_out_confirmation',
  VERIFICATION_CODE: 'verification_code',
  NETWORK_INVITE: 'network_invite',
  TIER_UPGRADE: 'tier_upgrade',
  GENERAL_NOTIFICATION: 'general_notification',
};

// Main WhatsApp Template Schema
const WhatsAppTemplateSchema = new Schema({
  // Template identification
  name: {
    type: String,
    required: [true, 'Template name is required'],
    trim: true,
    maxlength: [512, 'Template name cannot exceed 512 characters'],
    match: [/^[a-z0-9_]+$/, 'Template name must be lowercase alphanumeric with underscores only'],
  },
  
  // Template type/purpose
  type: {
    type: String,
    enum: Object.values(TEMPLATE_TYPE),
    required: [true, 'Template type is required'],
    index: true,
  },
  
  // WhatsApp Business API template ID
  wabaTemplateId: {
    type: String,
    trim: true,
    index: true,
    sparse: true,
  },
  
  // Category for WhatsApp Business API
  category: {
    type: String,
    enum: Object.values(TEMPLATE_CATEGORY),
    default: TEMPLATE_CATEGORY.UTILITY,
  },
  
  // Language variants
  languages: {
    type: Map,
    of: TemplateLanguageSchema,
    default: new Map(),
  },
  
  // Template status
  status: {
    type: String,
    enum: Object.values(TEMPLATE_STATUS),
    default: TEMPLATE_STATUS.PENDING,
    index: true,
  },
  
  // Rejection reason (if rejected)
  rejectionReason: {
    type: String,
    trim: true,
  },
  
  // Quality rating from Meta
  qualityRating: {
    type: String,
    enum: ['green', 'yellow', 'red', null],
    default: null,
  },
  
  // Template variables (placeholders)
  variables: [{
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['text', 'currency', 'date_time', 'number', 'url'],
      default: 'text',
    },
    example: {
      type: String,
      trim: true,
    },
    required: {
      type: Boolean,
      default: true,
    },
  }],
  
  // Default language
  defaultLanguage: {
    type: String,
    enum: ['en', 'my'],
    default: 'en',
  },
  
  // Usage statistics
  usageStats: {
    sentCount: {
      type: Number,
      default: 0,
    },
    deliveredCount: {
      type: Number,
      default: 0,
    },
    readCount: {
      type: Number,
      default: 0,
    },
    lastUsedAt: {
      type: Date,
    },
  },
  
  // Is active/enabled
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  
  // Created by
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  
  // Meta API response
  metaResponse: {
    type: Schema.Types.Mixed,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ==================== INDEXES ====================

WhatsAppTemplateSchema.index({ name: 1 }, { unique: true });
WhatsAppTemplateSchema.index({ type: 1, status: 1 });
WhatsAppTemplateSchema.index({ wabaTemplateId: 1 }, { sparse: true });
WhatsAppTemplateSchema.index({ isActive: 1, status: 1 });

// ==================== VIRTUALS ====================

// Virtual for total usage count
WhatsAppTemplateSchema.virtual('totalUsage').get(function() {
  return this.usageStats?.sentCount || 0;
});

// Virtual for delivery rate
WhatsAppTemplateSchema.virtual('deliveryRate').get(function() {
  const sent = this.usageStats?.sentCount || 0;
  const delivered = this.usageStats?.deliveredCount || 0;
  return sent > 0 ? Math.round((delivered / sent) * 100) : 0;
});

// ==================== INSTANCE METHODS ====================

/**
 * Get template content for a specific language
 * @param {string} language - Language code (en, my)
 * @returns {Object|null}
 */
WhatsAppTemplateSchema.methods.getContent = function(language = 'en') {
  return this.languages.get(language) || this.languages.get(this.defaultLanguage);
};

/**
 * Get body text with variables replaced
 * @param {Object} variables - Variable values
 * @param {string} language - Language code
 * @returns {string}
 */
WhatsAppTemplateSchema.methods.renderBody = function(variables = {}, language = 'en') {
  const content = this.getContent(language);
  if (!content || !content.components) return '';
  
  const bodyComponent = content.components.find(c => c.type === 'body');
  if (!bodyComponent || !bodyComponent.text) return '';
  
  let text = bodyComponent.text;
  
  // Replace variables {{1}}, {{2}}, etc.
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    text = text.replace(new RegExp(placeholder, 'g'), value);
  });
  
  return text;
};

/**
 * Update usage statistics
 * @param {string} action - Action type (sent, delivered, read)
 */
WhatsAppTemplateSchema.methods.updateStats = async function(action) {
  const update = {
    'usageStats.lastUsedAt': new Date(),
  };
  
  switch (action) {
    case 'sent':
      update.$inc = { 'usageStats.sentCount': 1 };
      break;
    case 'delivered':
      update.$inc = { 'usageStats.deliveredCount': 1 };
      break;
    case 'read':
      update.$inc = { 'usageStats.readCount': 1 };
      break;
  }
  
  await this.updateOne(update);
};

/**
 * Check if template is approved and active
 * @returns {boolean}
 */
WhatsAppTemplateSchema.methods.isUsable = function() {
  return this.status === TEMPLATE_STATUS.APPROVED && this.isActive;
};

// ==================== STATIC METHODS ====================

/**
 * Find template by type
 * @param {string} type - Template type
 * @param {string} language - Preferred language
 * @returns {Promise<Document|null>}
 */
WhatsAppTemplateSchema.statics.findByType = function(type, language = 'en') {
  return this.findOne({
    type,
    status: TEMPLATE_STATUS.APPROVED,
    isActive: true,
  }).sort({ createdAt: -1 });
};

/**
 * Find template by name
 * @param {string} name - Template name
 * @returns {Promise<Document|null>}
 */
WhatsAppTemplateSchema.statics.findByName = function(name) {
  return this.findOne({ name: name.toLowerCase() });
};

/**
 * Get all active templates by type
 * @param {string} type - Template type
 * @returns {Promise<Array>}
 */
WhatsAppTemplateSchema.statics.findActiveByType = function(type) {
  return this.find({
    type,
    status: TEMPLATE_STATUS.APPROVED,
    isActive: true,
  }).sort({ createdAt: -1 });
};

/**
 * Create or update template
 * @param {Object} templateData - Template data
 * @returns {Promise<Document>}
 */
WhatsAppTemplateSchema.statics.upsert = async function(templateData) {
  const { name, ...updateData } = templateData;
  
  return this.findOneAndUpdate(
    { name: name.toLowerCase() },
    { $set: updateData },
    { upsert: true, new: true }
  );
};

// Create and export the model
const WhatsAppTemplate = mongoose.model('WhatsAppTemplate', WhatsAppTemplateSchema);

module.exports = WhatsAppTemplate;
module.exports.TEMPLATE_STATUS = TEMPLATE_STATUS;
module.exports.TEMPLATE_TYPE = TEMPLATE_TYPE;
module.exports.TEMPLATE_CATEGORY = TEMPLATE_CATEGORY;

