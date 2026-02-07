/**
 * Localization Routes
 * Handles translation management, import/export, and namespace operations
 */

const express = require('express');
const localizationService = require('../services/localizationService.js');
const { authenticate } = require('../middleware/auth.js');
const { requireRole } = require('../middleware/rbac.js');
const { asyncHandler, ValidationError, NotFoundError } = require('../middleware/errorHandler.js');

const router = express.Router();

/**
 * @route   GET /api/localization/translations/:language
 * @desc    Get all translations for a language
 * @access  Public
 */
router.get('/translations/:language', asyncHandler(async (req, res) => {
  const { language } = req.params;
  const { namespace } = req.query;

  if (!localizationService.isLanguageSupported(language)) {
    throw new ValidationError(`Unsupported language: ${language}`);
  }

  const translations = await localizationService.getTranslationsByLanguage(language, namespace);

  res.json({
    success: true,
    data: {
      language,
      namespace: namespace || 'all',
      translations,
    },
  });
}));

/**
 * @route   GET /api/localization/translation/:key
 * @desc    Get single translation
 * @access  Public
 */
router.get('/translation/:key', asyncHandler(async (req, res) => {
  const { key } = req.params;
  const { language, namespace = 'common' } = req.query;

  const targetLanguage = language || localizationService.defaultLanguage;

  if (!localizationService.isLanguageSupported(targetLanguage)) {
    throw new ValidationError(`Unsupported language: ${targetLanguage}`);
  }

  const translation = await localizationService.getTranslation(key, targetLanguage, namespace);

  res.json({
    success: true,
    data: {
      key,
      language: targetLanguage,
      namespace,
      value: translation,
    },
  });
}));

/**
 * @route   POST /api/localization/translation
 * @desc    Create/update translation (admin only)
 * @access  Private (Admin)
 */
router.post('/translation',
  authenticate,
  requireRole(['platform_admin']),
  asyncHandler(async (req, res) => {
    const { key, language, value, namespace = 'common', section = 'general', description = '' } = req.body;

    // Validate required fields
    if (!key || !language || value === undefined) {
      throw new ValidationError('Missing required fields: key, language, value');
    }

    if (!localizationService.isLanguageSupported(language)) {
      throw new ValidationError(`Unsupported language: ${language}`);
    }

    const result = await localizationService.setTranslation(
      key,
      language,
      value,
      req.userId,
      { namespace, section, description }
    );

    res.json({
      success: true,
      data: result,
      message: 'Translation saved successfully',
    });
  })
);

/**
 * @route   POST /api/localization/bulk
 * @desc    Bulk update translations (admin only)
 * @access  Private (Admin)
 */
router.post('/bulk',
  authenticate,
  requireRole(['platform_admin']),
  asyncHandler(async (req, res) => {
    const { translations } = req.body;

    if (!Array.isArray(translations) || translations.length === 0) {
      throw new ValidationError('translations array is required and must not be empty');
    }

    const result = await localizationService.bulkSetTranslations(translations, req.userId);

    res.json({
      success: true,
      data: result,
      message: `Bulk update completed: ${result.success} succeeded, ${result.failed} failed`,
    });
  })
);

/**
 * @route   GET /api/localization/namespaces
 * @desc    Get all namespaces
 * @access  Public
 */
router.get('/namespaces', asyncHandler(async (req, res) => {
  const namespaces = await localizationService.getNamespaces();

  res.json({
    success: true,
    data: namespaces,
  });
}));

/**
 * @route   GET /api/localization/completion
 * @desc    Get translation completion status (admin only)
 * @access  Private (Admin)
 */
router.get('/completion',
  authenticate,
  requireRole(['platform_admin']),
  asyncHandler(async (req, res) => {
    const status = await localizationService.getCompletionStatus();

    res.json({
      success: true,
      data: status,
    });
  })
);

/**
 * @route   GET /api/localization/export
 * @desc    Export translations (admin only)
 * @access  Private (Admin)
 */
router.get('/export',
  authenticate,
  requireRole(['platform_admin']),
  asyncHandler(async (req, res) => {
    const { format = 'json', language, namespace } = req.query;

    const validFormats = ['json', 'csv', 'nested'];
    if (!validFormats.includes(format.toLowerCase())) {
      throw new ValidationError(`Invalid format. Must be one of: ${validFormats.join(', ')}`);
    }

    const exported = await localizationService.exportTranslations(format, language, namespace);

    if (format.toLowerCase() === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="translations${language ? `-${language}` : ''}.csv"`);
      res.send(exported);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="translations${language ? `-${language}` : ''}.json"`);
      res.json({
        success: true,
        data: exported,
      });
    }
  })
);

/**
 * @route   POST /api/localization/import
 * @desc    Import translations (admin only)
 * @access  Private (Admin)
 */
router.post('/import',
  authenticate,
  requireRole(['platform_admin']),
  asyncHandler(async (req, res) => {
    const { data, format = 'json', namespace = 'common', overwrite = false } = req.body;

    if (!data) {
      throw new ValidationError('data is required for import');
    }

    const validFormats = ['json', 'csv'];
    if (!validFormats.includes(format.toLowerCase())) {
      throw new ValidationError(`Invalid format. Must be one of: ${validFormats.join(', ')}`);
    }

    const result = await localizationService.importTranslations(data, req.userId, {
      format,
      namespace,
      overwrite,
    });

    res.json({
      success: true,
      data: result,
      message: `Import completed: ${result.imported} imported, ${result.updated} updated, ${result.skipped} skipped, ${result.errors.length} errors`,
    });
  })
);

/**
 * @route   GET /api/localization/languages
 * @desc    Get supported languages
 * @access  Public
 */
router.get('/languages', asyncHandler(async (req, res) => {
  const languages = localizationService.getSupportedLanguages();

  res.json({
    success: true,
    data: languages,
  });
}));

module.exports = router;
