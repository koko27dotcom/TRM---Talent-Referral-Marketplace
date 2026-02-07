/**
 * Currency Routes
 * Handles currency conversion, exchange rates, formatting, and rate management
 */

const express = require('express');
const currencyService = require('../services/currencyService.js');
const { authenticate } = require('../middleware/auth.js');
const { requireRole } = require('../middleware/rbac.js');
const { asyncHandler, ValidationError, NotFoundError } = require('../middleware/errorHandler.js');

const router = express.Router();

/**
 * @route   GET /api/currency/rates
 * @desc    Get all exchange rates
 * @access  Public
 */
router.get('/rates', asyncHandler(async (req, res) => {
  const { base = currencyService.baseCurrency } = req.query;

  const rates = await currencyService.getRates(base);

  res.json({
    success: true,
    data: {
      base: base.toUpperCase(),
      rates,
      timestamp: new Date(),
    },
  });
}));

/**
 * @route   GET /api/currency/rate/:from/:to
 * @desc    Get specific exchange rate
 * @access  Public
 */
router.get('/rate/:from/:to', asyncHandler(async (req, res) => {
  const { from, to } = req.params;

  const rateData = await currencyService.getRate(from, to);

  if (!rateData) {
    throw new NotFoundError(`Exchange rate not found for ${from.toUpperCase()} to ${to.toUpperCase()}`);
  }

  res.json({
    success: true,
    data: rateData,
  });
}));

/**
 * @route   POST /api/currency/convert
 * @desc    Convert amount between currencies
 * @access  Public
 */
router.post('/convert', asyncHandler(async (req, res) => {
  const { amount, from, to } = req.body;

  // Validate required fields
  if (amount === undefined || !from || !to) {
    throw new ValidationError('Missing required fields: amount, from, to');
  }

  if (typeof amount !== 'number' || amount < 0) {
    throw new ValidationError('Amount must be a positive number');
  }

  const result = await currencyService.convert(amount, from, to);

  res.json({
    success: true,
    data: result,
  });
}));

/**
 * @route   GET /api/currency/supported
 * @desc    Get supported currencies
 * @access  Public
 */
router.get('/supported', asyncHandler(async (req, res) => {
  const currencies = currencyService.getSupportedCurrencies();

  res.json({
    success: true,
    data: currencies,
  });
}));

/**
 * @route   GET /api/currency/format
 * @desc    Format amount for display
 * @access  Public
 */
router.get('/format', asyncHandler(async (req, res) => {
  const { amount, currency, locale = 'en' } = req.query;

  if (amount === undefined || !currency) {
    throw new ValidationError('Missing required query parameters: amount, currency');
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount)) {
    throw new ValidationError('Amount must be a valid number');
  }

  const formatted = currencyService.formatAmount(parsedAmount, currency, locale);

  res.json({
    success: true,
    data: {
      originalAmount: parsedAmount,
      currency: currency.toUpperCase(),
      locale,
      formatted,
    },
  });
}));

/**
 * @route   POST /api/currency/sync
 * @desc    Sync rates from external API (admin only)
 * @access  Private (Admin)
 */
router.post('/sync',
  authenticate,
  requireRole(['platform_admin']),
  asyncHandler(async (req, res) => {
    const result = await currencyService.syncRates();

    res.json({
      success: true,
      data: result,
      message: `Rate sync completed. Success: ${result.success.length}, Failed: ${result.failed.length}`,
    });
  })
);

/**
 * @route   GET /api/currency/stale
 * @desc    Get stale rates (admin only)
 * @access  Private (Admin)
 */
router.get('/stale',
  authenticate,
  requireRole(['platform_admin']),
  asyncHandler(async (req, res) => {
    const { threshold = 120 } = req.query;
    const thresholdMinutes = parseInt(threshold, 10);

    if (isNaN(thresholdMinutes) || thresholdMinutes < 1) {
      throw new ValidationError('Threshold must be a positive number (minutes)');
    }

    const staleRates = await currencyService.getStaleRates(thresholdMinutes);

    res.json({
      success: true,
      data: {
        thresholdMinutes,
        count: staleRates.length,
        rates: staleRates,
      },
    });
  })
);

/**
 * @route   GET /api/currency/info/:code
 * @desc    Get currency information
 * @access  Public
 */
router.get('/info/:code', asyncHandler(async (req, res) => {
  const { code } = req.params;
  const info = currencyService.getCurrencyInfo(code);

  if (!info) {
    throw new NotFoundError(`Currency not supported: ${code}`);
  }

  res.json({
    success: true,
    data: info,
  });
}));

/**
 * @route   POST /api/currency/convert-multiple
 * @desc    Convert multiple amounts at once
 * @access  Public
 */
router.post('/convert-multiple', asyncHandler(async (req, res) => {
  const { amounts, from, to } = req.body;

  if (!Array.isArray(amounts) || amounts.length === 0) {
    throw new ValidationError('amounts must be a non-empty array');
  }

  if (!from || !to) {
    throw new ValidationError('Missing required fields: from, to');
  }

  const results = await currencyService.convertMultiple(amounts, from, to);

  res.json({
    success: true,
    data: results,
  });
}));

module.exports = router;
