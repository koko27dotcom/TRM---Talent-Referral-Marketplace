/**
 * Region Routes
 * Handles region management, detection, configuration, and user preferences
 */

const express = require('express');
const regionService = require('../services/regionService.js');
const { authenticate } = require('../middleware/auth.js');
const { requireRole } = require('../middleware/rbac.js');
const { asyncHandler, ValidationError, NotFoundError } = require('../middleware/errorHandler.js');

const router = express.Router();

/**
 * @route   GET /api/regions
 * @desc    Get all active regions
 * @access  Public
 */
router.get('/', asyncHandler(async (req, res) => {
  const regions = await regionService.getActiveRegions();

  res.json({
    success: true,
    data: regions,
  });
}));

/**
 * @route   GET /api/regions/detect
 * @desc    Detect region from request
 * @access  Public
 */
router.get('/detect', asyncHandler(async (req, res) => {
  const detection = await regionService.detectRegionFromRequest(req);

  res.json({
    success: true,
    data: detection,
  });
}));

/**
 * @route   GET /api/regions/:code
 * @desc    Get region configuration
 * @access  Public
 */
router.get('/:code', asyncHandler(async (req, res) => {
  const { code } = req.params;
  const config = await regionService.getRegionConfig(code);

  if (!config) {
    throw new NotFoundError(`Region not found: ${code}`);
  }

  res.json({
    success: true,
    data: config,
  });
}));

/**
 * @route   GET /api/regions/:code/languages
 * @desc    Get supported languages for a region
 * @access  Public
 */
router.get('/:code/languages', asyncHandler(async (req, res) => {
  const { code } = req.params;
  const languages = await regionService.getSupportedLanguages(code);

  res.json({
    success: true,
    data: {
      region: code.toUpperCase(),
      languages,
    },
  });
}));

/**
 * @route   GET /api/regions/:code/payment-providers
 * @desc    Get payment providers for a region
 * @access  Public
 */
router.get('/:code/payment-providers', asyncHandler(async (req, res) => {
  const { code } = req.params;
  const { currency } = req.query;

  const providers = await regionService.getPaymentProviders(code, currency);

  res.json({
    success: true,
    data: {
      region: code.toUpperCase(),
      currency: currency || 'all',
      providers,
    },
  });
}));

/**
 * @route   GET /api/regions/:code/settings
 * @desc    Get regional settings for frontend
 * @access  Public
 */
router.get('/:code/settings', asyncHandler(async (req, res) => {
  const { code } = req.params;
  const settings = await regionService.getRegionalSettings(code);

  if (!settings) {
    throw new NotFoundError(`Region settings not found: ${code}`);
  }

  res.json({
    success: true,
    data: settings,
  });
}));

/**
 * @route   POST /api/regions
 * @desc    Create region (admin only)
 * @access  Private (Admin)
 */
router.post('/',
  authenticate,
  requireRole(['platform_admin']),
  asyncHandler(async (req, res) => {
    const {
      code,
      name,
      localName,
      defaultCurrency,
      supportedCurrencies,
      timezone,
      languages,
      dateFormat,
      timeFormat,
      numberFormat,
      phoneFormat,
      features,
      compliance,
      paymentProviders,
      referralLimits,
      status = 'active',
    } = req.body;

    // Validate required fields
    if (!code || !name || !defaultCurrency || !timezone) {
      throw new ValidationError('Missing required fields: code, name, defaultCurrency, timezone');
    }

    const configData = {
      code,
      name,
      localName,
      defaultCurrency,
      supportedCurrencies,
      timezone,
      languages,
      dateFormat,
      timeFormat,
      numberFormat,
      phoneFormat,
      features,
      compliance,
      paymentProviders,
      referralLimits,
      status,
    };

    const region = await regionService.createRegionConfig(configData);

    res.status(201).json({
      success: true,
      data: region,
      message: 'Region created successfully',
    });
  })
);

/**
 * @route   PUT /api/regions/:code
 * @desc    Update region (admin only)
 * @access  Private (Admin)
 */
router.put('/:code',
  authenticate,
  requireRole(['platform_admin']),
  asyncHandler(async (req, res) => {
    const { code } = req.params;
    const updates = req.body;

    // Prevent changing the code
    if (updates.code) {
      delete updates.code;
    }

    const region = await regionService.updateRegionConfig(code, updates);

    res.json({
      success: true,
      data: region,
      message: 'Region updated successfully',
    });
  })
);

/**
 * @route   PUT /api/user/region
 * @desc    Update user's region preference (authenticated)
 * @access  Private
 */
router.put('/user/region',
  authenticate,
  asyncHandler(async (req, res) => {
    const { regionCode } = req.body;

    if (!regionCode) {
      throw new ValidationError('regionCode is required');
    }

    const result = await regionService.setUserRegion(req.userId, regionCode);

    res.json({
      success: true,
      data: result,
      message: 'Region preference updated successfully',
    });
  })
);

module.exports = router;
