/**
 * CV Scraping Routes
 * API endpoints for managing CV scraping operations
 */

const express = require('express');
const cvScrapingService = require('../services/cvScrapingService.js');
const { authenticate } = require('../middleware/auth.js');
const { asyncHandler, ValidationError } = require('../middleware/errorHandler.js');
const { requireAdmin } = require('../middleware/rbac.js');

const router = express.Router();

/**
 * @route   POST /api/cv-scraping/scrape
 * @desc    Trigger CV scraping for all sources
 * @access  Private (Admin only)
 */
router.post('/scrape', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { pageCount = 1 } = req.body;
  
  // Start scraping in background
  const result = await cvScrapingService.scrapeAllSources(parseInt(pageCount));
  
  res.json({
    success: true,
    message: 'CV scraping completed',
    data: result,
  });
}));

/**
 * @route   POST /api/cv-scraping/scrape/:source
 * @desc    Trigger CV scraping for specific source
 * @access  Private (Admin only)
 */
router.post('/scrape/:source', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { source } = req.params;
  const { pageCount = 1 } = req.body;
  
  if (!cvScrapingService.SCRAPING_SOURCES[source]) {
    throw new ValidationError(`Invalid source: ${source}`);
  }
  
  const result = await cvScrapingService.scrapeSource(source, parseInt(pageCount));
  
  res.json({
    success: true,
    message: `Scraping completed for ${source}`,
    data: result,
  });
}));

/**
 * @route   GET /api/cv-scraping/stats
 * @desc    Get CV scraping statistics
 * @access  Private (Admin only)
 */
router.get('/stats', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const stats = await cvScrapingService.getScrapingStats();
  
  res.json({
    success: true,
    data: stats,
  });
}));

/**
 * @route   GET /api/cv-scraping/sources
 * @desc    Get available scraping sources
 * @access  Private (Admin only)
 */
router.get('/sources', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const sources = Object.entries(cvScrapingService.SCRAPING_SOURCES).map(([key, config]) => ({
    key,
    name: config.name,
    baseUrl: config.baseUrl,
    enabled: config.enabled,
    rateLimit: config.rateLimit,
  }));
  
  res.json({
    success: true,
    data: sources,
  });
}));

/**
 * @route   POST /api/cv-scraping/enrich/:talentId
 * @desc    Enrich scraped CV data with AI
 * @access  Private (Admin only)
 */
router.post('/enrich/:talentId', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { talentId } = req.params;
  
  const talent = await cvScrapingService.enrichCVData(talentId);
  
  res.json({
    success: true,
    message: 'CV data enriched successfully',
    data: talent,
  });
}));

/**
 * @route   POST /api/cv-scraping/schedule
 * @desc    Schedule regular CV scraping
 * @access  Private (Admin only)
 */
router.post('/schedule', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { intervalHours = 24 } = req.body;
  
  cvScrapingService.scheduleScraping(parseInt(intervalHours));
  
  res.json({
    success: true,
    message: `CV scraping scheduled every ${intervalHours} hours`,
  });
}));

module.exports = router;
