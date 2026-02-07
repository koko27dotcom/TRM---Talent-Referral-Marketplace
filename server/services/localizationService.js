/**
 * LocalizationService
 * Core business logic for internationalization and translation management
 * Handles translation CRUD operations, caching, import/export, and utilities
 */

const Localization = require('../models/Localization.js');

/**
 * Cache entry with TTL support
 * @typedef {Object} CacheEntry
 * @property {*} value - Cached value
 * @property {number} expiresAt - Timestamp when cache expires
 */

/**
 * Service class for managing localization and translations
 */
class LocalizationService {
  constructor() {
    /** @type {Map<string, CacheEntry>} In-memory cache for translations */
    this.cache = new Map();
    /** @type {number} Default TTL in milliseconds (5 minutes) */
    this.defaultTTL = 5 * 60 * 1000;
    /** @type {Array<string>} Supported languages */
    this.supportedLanguages = ['en', 'my', 'th', 'vi', 'zh', 'ms', 'ta'];
    /** @type {string} Default language for fallback */
    this.defaultLanguage = 'en';
  }

  // ==================== CACHE MANAGEMENT ====================

  /**
   * Get value from cache
   * @private
   * @param {string} key - Cache key
   * @returns {*} Cached value or null if expired/not found
   */
  _getFromCache(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }

  /**
   * Set value in cache with TTL
   * @private
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} [ttl] - TTL in milliseconds
   */
  _setCache(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * Generate cache key
   * @private
   * @param {...string} parts - Key parts
   * @returns {string} Cache key
   */
  _cacheKey(...parts) {
    return parts.join(':');
  }

  /**
   * Clear all cached translations
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Preload common translations into cache
   * @returns {Promise<void>}
   */
  async warmCache() {
    try {
      // Preload common namespace for all supported languages
      for (const language of this.supportedLanguages) {
        await this.getTranslationsByLanguage(language, 'common');
      }
      
      // Preload auth namespace
      for (const language of this.supportedLanguages) {
        await this.getTranslationsByLanguage(language, 'auth');
      }
      
      console.log('Localization cache warmed successfully');
    } catch (error) {
      console.error('Error warming localization cache:', error);
    }
  }

  // ==================== TRANSLATION MANAGEMENT ====================

  /**
   * Get a single translation by key
   * @param {string} key - Translation key (supports nested keys like "nav.home.title")
   * @param {string} language - Language code
   * @param {string} [namespace='common'] - Translation namespace
   * @returns {Promise<string>} Translation value or default value if not found
   */
  async getTranslation(key, language, namespace = 'common') {
    try {
      const cacheKey = this._cacheKey('translation', key, language, namespace);
      const cached = this._getFromCache(cacheKey);
      if (cached !== null) return cached;

      // Handle nested keys (e.g., "nav.home.title")
      const keyParts = key.split('.');
      const mainKey = keyParts[0];
      
      const localization = await Localization.findOne({
        key: mainKey,
        namespace,
        isActive: true,
      });

      if (!localization) {
        // Try to find with full key as-is
        const fullKeyLocalization = await Localization.findOne({
          key,
          namespace,
          isActive: true,
        });
        
        if (fullKeyLocalization) {
          const value = fullKeyLocalization.getTranslation(language);
          this._setCache(cacheKey, value);
          return value;
        }
        
        return key; // Return key as fallback
      }

      let value = localization.getTranslation(language);
      
      // If nested, try to traverse
      if (keyParts.length > 1) {
        try {
          const parsed = JSON.parse(value);
          let current = parsed;
          for (let i = 1; i < keyParts.length; i++) {
            if (current && typeof current === 'object' && keyParts[i] in current) {
              current = current[keyParts[i]];
            } else {
              current = null;
              break;
            }
          }
          if (current !== null && typeof current === 'string') {
            value = current;
          }
        } catch {
          // Not JSON, use value as-is
        }
      }

      this._setCache(cacheKey, value);
      return value;
    } catch (error) {
      console.error('Error getting translation:', error);
      return key;
    }
  }

  /**
   * Get all translations for a specific language
   * @param {string} language - Language code
   * @param {string} [namespace=null] - Optional namespace filter
   * @returns {Promise<Object>} Object with translation keys and values
   */
  async getTranslationsByLanguage(language, namespace = null) {
    try {
      const cacheKey = this._cacheKey('translations', language, namespace || 'all');
      const cached = this._getFromCache(cacheKey);
      if (cached !== null) return cached;

      const translations = await Localization.getTranslationsByLanguage(language, namespace);
      
      this._setCache(cacheKey, translations);
      return translations;
    } catch (error) {
      console.error('Error getting translations by language:', error);
      return {};
    }
  }

  /**
   * Get all translations organized by language and namespace
   * @returns {Promise<Object>} All translations organized by language and namespace
   */
  async getAllTranslations() {
    try {
      const cacheKey = this._cacheKey('all-translations');
      const cached = this._getFromCache(cacheKey);
      if (cached !== null) return cached;

      const translations = await Localization.getAllTranslations();
      
      this._setCache(cacheKey, translations, 10 * 60 * 1000); // 10 min TTL
      return translations;
    } catch (error) {
      console.error('Error getting all translations:', error);
      return {};
    }
  }

  /**
   * Set or update a single translation
   * @param {string} key - Translation key
   * @param {string} language - Language code
   * @param {string} value - Translation value
   * @param {string} [userId=null] - User ID making the change
   * @param {Object} [options={}] - Additional options
   * @param {string} [options.namespace='common'] - Translation namespace
   * @param {string} [options.section='general'] - Section for organization
   * @param {string} [options.description=''] - Description of usage
   * @returns {Promise<Object>} Result of the operation
   */
  async setTranslation(key, language, value, userId = null, options = {}) {
    try {
      const { namespace = 'common', section = 'general', description = '' } = options;
      
      let localization = await Localization.findOne({ key, namespace });
      
      if (!localization) {
        // Create new localization entry
        localization = new Localization({
          key,
          namespace,
          section,
          description,
          defaultValue: value,
          translations: [],
        });
      }

      localization.setTranslation(language, value, userId);
      
      if (userId) {
        localization.updatedBy = userId;
      }
      
      await localization.save();
      
      // Clear relevant cache entries
      this.clearCache();
      
      return {
        success: true,
        key,
        language,
        value,
        namespace,
      };
    } catch (error) {
      console.error('Error setting translation:', error);
      throw error;
    }
  }

  /**
   * Bulk update translations
   * @param {Array<Object>} translations - Array of translation objects
   * @param {string} [userId=null] - User ID making the changes
   * @returns {Promise<Object>} Result with success count and errors
   */
  async bulkSetTranslations(translations, userId = null) {
    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    try {
      for (const trans of translations) {
        try {
          const { key, language, value, namespace = 'common', ...options } = trans;
          await this.setTranslation(key, language, value, userId, { namespace, ...options });
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            key: trans.key,
            language: trans.language,
            error: error.message,
          });
        }
      }
      
      // Clear cache after bulk operation
      this.clearCache();
      
      return results;
    } catch (error) {
      console.error('Error in bulk set translations:', error);
      throw error;
    }
  }

  // ==================== NAMESPACE MANAGEMENT ====================

  /**
   * Get all available namespaces
   * @returns {Promise<Array<string>>} Array of namespace names
   */
  async getNamespaces() {
    try {
      const cacheKey = this._cacheKey('namespaces');
      const cached = this._getFromCache(cacheKey);
      if (cached !== null) return cached;

      const namespaces = await Localization.distinct('namespace', { isActive: true });
      
      this._setCache(cacheKey, namespaces, 30 * 60 * 1000); // 30 min TTL
      return namespaces;
    } catch (error) {
      console.error('Error getting namespaces:', error);
      return ['common'];
    }
  }

  /**
   * Get all translation keys in a namespace
   * @param {string} namespace - Namespace to query
   * @returns {Promise<Array<Object>>} Array of key objects with metadata
   */
  async getKeysByNamespace(namespace) {
    try {
      const cacheKey = this._cacheKey('keys', namespace);
      const cached = this._getFromCache(cacheKey);
      if (cached !== null) return cached;

      const keys = await Localization.find({
        namespace,
        isActive: true,
      })
        .select('key section description defaultValue variables priority platform')
        .sort({ section: 1, key: 1 })
        .lean();

      const result = keys.map(k => ({
        key: k.key,
        section: k.section,
        description: k.description,
        defaultValue: k.defaultValue,
        variables: k.variables,
        priority: k.priority,
        platform: k.platform,
      }));
      
      this._setCache(cacheKey, result, 10 * 60 * 1000); // 10 min TTL
      return result;
    } catch (error) {
      console.error('Error getting keys by namespace:', error);
      return [];
    }
  }

  // ==================== TRANSLATION UTILITIES ====================

  /**
   * Interpolate variables in translation text
   * @param {string} text - Translation text with placeholders (e.g., "Hello {{name}}")
   * @param {Object} variables - Object with variable values
   * @returns {string} Interpolated text
   */
  interpolate(text, variables = {}) {
    if (!text || typeof text !== 'string') return text;
    
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      if (key in variables) {
        return String(variables[key]);
      }
      return match;
    });
  }

  /**
   * Get translation completion status for all languages
   * @returns {Promise<Object>} Completion percentage for each language
   */
  async getCompletionStatus() {
    try {
      const cacheKey = this._cacheKey('completion-status');
      const cached = this._getFromCache(cacheKey);
      if (cached !== null) return cached;

      const status = await Localization.getCompletionStatus();
      
      this._setCache(cacheKey, status, 5 * 60 * 1000); // 5 min TTL
      return status;
    } catch (error) {
      console.error('Error getting completion status:', error);
      return {};
    }
  }

  /**
   * Export translations in specified format
   * @param {string} [format='json'] - Export format ('json', 'csv', 'nested')
   * @param {string} [language=null] - Specific language to export (null for all)
   * @param {string} [namespace=null] - Specific namespace to export (null for all)
   * @returns {Promise<Object|string>} Exported translations
   */
  async exportTranslations(format = 'json', language = null, namespace = null) {
    try {
      let query = { isActive: true };
      if (namespace) {
        query.namespace = namespace;
      }

      const localizations = await Localization.find(query).lean();

      switch (format.toLowerCase()) {
        case 'csv':
          return this._exportToCSV(localizations, language);
        
        case 'nested':
          return this._exportToNestedJSON(localizations, language);
        
        case 'json':
        default:
          return this._exportToFlatJSON(localizations, language);
      }
    } catch (error) {
      console.error('Error exporting translations:', error);
      throw error;
    }
  }

  /**
   * Export to flat JSON format
   * @private
   * @param {Array} localizations - Localization documents
   * @param {string} [language=null] - Specific language
   * @returns {Object} Flat JSON structure
   */
  _exportToFlatJSON(localizations, language = null) {
    const result = {};

    for (const loc of localizations) {
      if (language) {
        const trans = loc.translations.find(t => t.language === language);
        result[loc.key] = trans ? trans.value : loc.defaultValue;
      } else {
        result[loc.key] = {
          defaultValue: loc.defaultValue,
          ...loc.translations.reduce((acc, t) => {
            acc[t.language] = t.value;
            return acc;
          }, {}),
        };
      }
    }

    return result;
  }

  /**
   * Export to nested JSON format (grouped by namespace)
   * @private
   * @param {Array} localizations - Localization documents
   * @param {string} [language=null] - Specific language
   * @returns {Object} Nested JSON structure
   */
  _exportToNestedJSON(localizations, language = null) {
    const result = {};

    for (const loc of localizations) {
      if (!result[loc.namespace]) {
        result[loc.namespace] = {};
      }

      if (language) {
        const trans = loc.translations.find(t => t.language === language);
        result[loc.namespace][loc.key] = trans ? trans.value : loc.defaultValue;
      } else {
        result[loc.namespace][loc.key] = {
          defaultValue: loc.defaultValue,
          ...loc.translations.reduce((acc, t) => {
            acc[t.language] = t.value;
            return acc;
          }, {}),
        };
      }
    }

    return result;
  }

  /**
   * Export to CSV format
   * @private
   * @param {Array} localizations - Localization documents
   * @param {string} [language=null] - Specific language
   * @returns {string} CSV string
   */
  _exportToCSV(localizations, language = null) {
    const headers = ['key', 'namespace', 'section', 'description', 'defaultValue'];
    
    if (language) {
      headers.push(language);
    } else {
      headers.push(...this.supportedLanguages);
    }

    let csv = headers.join(',') + '\n';

    for (const loc of localizations) {
      const row = [
        this._escapeCSV(loc.key),
        this._escapeCSV(loc.namespace),
        this._escapeCSV(loc.section),
        this._escapeCSV(loc.description || ''),
        this._escapeCSV(loc.defaultValue),
      ];

      if (language) {
        const trans = loc.translations.find(t => t.language === language);
        row.push(this._escapeCSV(trans ? trans.value : ''));
      } else {
        for (const lang of this.supportedLanguages) {
          const trans = loc.translations.find(t => t.language === lang);
          row.push(this._escapeCSV(trans ? trans.value : ''));
        }
      }

      csv += row.join(',') + '\n';
    }

    return csv;
  }

  /**
   * Escape CSV value
   * @private
   * @param {string} value - Value to escape
   * @returns {string} Escaped value
   */
  _escapeCSV(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  /**
   * Import translations from JSON or CSV data
   * @param {Object|string} data - Data to import (JSON object or CSV string)
   * @param {string} [userId=null] - User ID making the import
   * @param {Object} [options={}] - Import options
   * @param {string} [options.format='json'] - Data format ('json' or 'csv')
   * @param {string} [options.namespace='common'] - Default namespace for new keys
   * @param {boolean} [options.overwrite=false] - Whether to overwrite existing translations
   * @returns {Promise<Object>} Import result
   */
  async importTranslations(data, userId = null, options = {}) {
    const { format = 'json', namespace = 'common', overwrite = false } = options;
    
    try {
      let translations = [];

      if (format.toLowerCase() === 'csv') {
        translations = this._parseCSV(data, namespace);
      } else {
        translations = this._parseJSON(data, namespace);
      }

      const results = {
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: [],
      };

      for (const trans of translations) {
        try {
          const existing = await Localization.findOne({
            key: trans.key,
            namespace: trans.namespace,
          });

          if (existing && !overwrite) {
            results.skipped++;
            continue;
          }

          if (existing) {
            // Update existing
            for (const [lang, value] of Object.entries(trans.translations)) {
              existing.setTranslation(lang, value, userId);
            }
            if (userId) existing.updatedBy = userId;
            await existing.save();
            results.updated++;
          } else {
            // Create new
            const newLoc = new Localization({
              key: trans.key,
              namespace: trans.namespace,
              section: trans.section || 'general',
              description: trans.description || '',
              defaultValue: trans.defaultValue || trans.translations[this.defaultLanguage] || '',
              translations: Object.entries(trans.translations).map(([lang, value]) => ({
                language: lang,
                value,
                updatedBy: userId,
                updatedAt: new Date(),
              })),
              createdBy: userId,
              updatedBy: userId,
            });
            await newLoc.save();
            results.imported++;
          }
        } catch (error) {
          results.errors.push({
            key: trans.key,
            error: error.message,
          });
        }
      }

      // Clear cache after import
      this.clearCache();

      return results;
    } catch (error) {
      console.error('Error importing translations:', error);
      throw error;
    }
  }

  /**
   * Parse JSON import data
   * @private
   * @param {Object} data - JSON data
   * @param {string} defaultNamespace - Default namespace
   * @returns {Array} Parsed translations
   */
  _parseJSON(data, defaultNamespace) {
    const translations = [];

    // Handle nested format: { namespace: { key: { language: value } } }
    for (const [nsOrKey, value] of Object.entries(data)) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        // Check if it's a namespace level
        const firstValue = Object.values(value)[0];
        if (typeof firstValue === 'object' && !Array.isArray(firstValue)) {
          // Nested by namespace
          for (const [key, langData] of Object.entries(value)) {
            if (typeof langData === 'string') {
              // Simple format: { namespace: { key: value } }
              translations.push({
                key,
                namespace: nsOrKey,
                translations: { [this.defaultLanguage]: langData },
                defaultValue: langData,
              });
            } else {
              // Full format with languages
              translations.push({
                key,
                namespace: nsOrKey,
                translations: langData,
                defaultValue: langData[this.defaultLanguage] || Object.values(langData)[0],
              });
            }
          }
        } else {
          // Flat format: { key: { language: value } }
          translations.push({
            key: nsOrKey,
            namespace: defaultNamespace,
            translations: value,
            defaultValue: value[this.defaultLanguage] || Object.values(value)[0],
          });
        }
      }
    }

    return translations;
  }

  /**
   * Parse CSV import data
   * @private
   * @param {string} csv - CSV string
   * @param {string} defaultNamespace - Default namespace
   * @returns {Array} Parsed translations
   */
  _parseCSV(csv, defaultNamespace) {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = this._parseCSVLine(lines[0]);
    const translations = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this._parseCSVLine(lines[i]);
      const row = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      const transObj = {
        key: row.key,
        namespace: row.namespace || defaultNamespace,
        section: row.section || 'general',
        description: row.description || '',
        defaultValue: row.defaultValue || '',
        translations: {},
      };

      // Extract language columns
      for (const lang of this.supportedLanguages) {
        if (row[lang]) {
          transObj.translations[lang] = row[lang];
        }
      }

      translations.push(transObj);
    }

    return translations;
  }

  /**
   * Parse a single CSV line
   * @private
   * @param {string} line - CSV line
   * @returns {Array} Parsed values
   */
  _parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim());
    return values;
  }

  /**
   * Get supported languages list
   * @returns {Array<Object>} Array of language objects with code and name
   */
  getSupportedLanguages() {
    const languageNames = {
      en: 'English',
      my: 'Myanmar (Burmese)',
      th: 'Thai',
      vi: 'Vietnamese',
      zh: 'Chinese',
      ms: 'Malay',
      ta: 'Tamil',
    };

    return this.supportedLanguages.map(code => ({
      code,
      name: languageNames[code] || code,
    }));
  }

  /**
   * Check if a language is supported
   * @param {string} language - Language code to check
   * @returns {boolean} Whether the language is supported
   */
  isLanguageSupported(language) {
    return this.supportedLanguages.includes(language);
  }

  /**
   * Get translation with interpolation
   * @param {string} key - Translation key
   * @param {string} language - Language code
   * @param {Object} [variables={}] - Variables to interpolate
   * @param {string} [namespace='common'] - Translation namespace
   * @returns {Promise<string>} Translated and interpolated text
   */
  async t(key, language, variables = {}, namespace = 'common') {
    const translation = await this.getTranslation(key, language, namespace);
    return this.interpolate(translation, variables);
  }
}

// Export singleton instance
module.exports = new LocalizationService();
