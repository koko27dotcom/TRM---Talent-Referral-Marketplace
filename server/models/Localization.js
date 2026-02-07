/**
 * Localization Model
 * Stores translations for all UI text with support for multiple languages
 * Used for i18n management and admin translation dashboard
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Translation value schema for a specific language
const TranslationValueSchema = new Schema({
  language: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  value: {
    type: String,
    required: true,
    trim: true,
  },
  isApproved: {
    type: Boolean,
    default: false,
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

// Main localization schema
const LocalizationSchema = new Schema({
  // Unique key for the translation (e.g., "nav.home", "auth.login.title")
  key: {
    type: String,
    required: true,
    trim: true,
    index: true,
    unique: true,
  },
  
  // Namespace for organizing translations (e.g., "common", "auth", "jobs")
  namespace: {
    type: String,
    required: true,
    trim: true,
    index: true,
    default: 'common',
  },
  
  // Section/category for UI organization
  section: {
    type: String,
    required: true,
    trim: true,
    index: true,
    default: 'general',
  },
  
  // Description of where this translation is used
  description: {
    type: String,
    trim: true,
  },
  
  // Platform context (web, mobile, email, etc.)
  platform: {
    type: String,
    enum: ['web', 'mobile', 'email', 'sms', 'api', 'all'],
    default: 'all',
    index: true,
  },
  
  // Translations for each language
  translations: [TranslationValueSchema],
  
  // Default/fallback value (usually English)
  defaultValue: {
    type: String,
    required: true,
    trim: true,
  },
  
  // Variable placeholders (e.g., ["name", "count"])
  variables: [{
    type: String,
    trim: true,
  }],
  
  // Maximum character length for UI constraints
  maxLength: {
    type: Number,
    default: null,
  },
  
  // Whether this translation is active
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  
  // Priority for translation completion tracking
  priority: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium',
  },
  
  // Metadata
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Compound indexes for efficient queries
LocalizationSchema.index({ namespace: 1, section: 1 });
LocalizationSchema.index({ platform: 1, isActive: 1 });
LocalizationSchema.index({ namespace: 1, key: 1 });

// Static method to get translations for a specific language
LocalizationSchema.statics.getTranslationsByLanguage = async function(language, namespace = null) {
  const query = { isActive: true };
  if (namespace) {
    query.namespace = namespace;
  }
  
  const localizations = await this.find(query).lean();
  
  const translations = {};
  localizations.forEach(loc => {
    const translation = loc.translations.find(t => t.language === language);
    translations[loc.key] = translation ? translation.value : loc.defaultValue;
  });
  
  return translations;
};

// Static method to get all translations organized by language
LocalizationSchema.statics.getAllTranslations = async function() {
  const localizations = await this.find({ isActive: true }).lean();
  
  const result = {};
  localizations.forEach(loc => {
    loc.translations.forEach(trans => {
      if (!result[trans.language]) {
        result[trans.language] = {};
      }
      if (!result[trans.language][loc.namespace]) {
        result[trans.language][loc.namespace] = {};
      }
      result[trans.language][loc.namespace][loc.key] = trans.value;
    });
  });
  
  return result;
};

// Static method to get translation completion status
LocalizationSchema.statics.getCompletionStatus = async function() {
  const languages = ['en', 'my', 'th', 'vi', 'zh', 'ms', 'ta'];
  const totalKeys = await this.countDocuments({ isActive: true });
  
  const status = {};
  for (const lang of languages) {
    const translated = await this.countDocuments({
      isActive: true,
      'translations.language': lang,
      'translations.isApproved': true,
    });
    status[lang] = {
      total: totalKeys,
      translated: translated,
      percentage: totalKeys > 0 ? Math.round((translated / totalKeys) * 100) : 0,
    };
  }
  
  return status;
};

// Instance method to get translation for a specific language
LocalizationSchema.methods.getTranslation = function(language) {
  const translation = this.translations.find(t => t.language === language);
  return translation ? translation.value : this.defaultValue;
};

// Instance method to set translation for a specific language
LocalizationSchema.methods.setTranslation = function(language, value, userId = null) {
  const existingIndex = this.translations.findIndex(t => t.language === language);
  
  const translationData = {
    language,
    value,
    updatedAt: new Date(),
    updatedBy: userId,
    isApproved: false,
  };
  
  if (existingIndex >= 0) {
    this.translations[existingIndex] = translationData;
  } else {
    this.translations.push(translationData);
  }
};

const Localization = mongoose.model('Localization', LocalizationSchema);

module.exports = Localization;
