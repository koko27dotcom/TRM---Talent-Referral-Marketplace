/**
 * Marketplace Routes
 * API endpoints for plugin and integration marketplace
 */

const express = require('express');
const marketplaceService = require('../services/marketplaceService.js');
const { requireAuth } = require('../middleware/auth.js');

const router = express.Router();

/**
 * @route GET /api/marketplace/plugins
 * @desc List available plugins
 * @access Public
 */
router.get('/plugins', async (req, res, next) => {
  try {
    const result = await marketplaceService.getPlugins(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/marketplace/plugins/featured
 * @desc Get featured plugins
 * @access Public
 */
router.get('/plugins/featured', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    const plugins = await marketplaceService.getFeatured();
    res.json({ success: true, plugins: plugins.plugins });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/marketplace/plugins/popular
 * @desc Get popular plugins
 * @access Public
 */
router.get('/plugins/popular', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const plugins = await marketplaceService.getPopular(limit);
    res.json({ success: true, plugins: plugins.plugins });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/marketplace/plugins/categories
 * @desc Get plugin categories
 * @access Public
 */
router.get('/plugins/categories', async (req, res, next) => {
  try {
    const result = await marketplaceService.getCategories();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/marketplace/plugins/search
 * @desc Search plugins
 * @access Public
 */
router.get('/plugins/search', async (req, res, next) => {
  try {
    const { q, ...filters } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    const result = await marketplaceService.search(q, filters);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/marketplace/plugins/:id
 * @desc Get plugin details
 * @access Public
 */
router.get('/plugins/:id', async (req, res, next) => {
  try {
    const userId = req.user?._id || null;
    const result = await marketplaceService.getPlugin(req.params.id, userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/marketplace/plugins/:id/install
 * @desc Install plugin
 * @access Private
 */
router.post('/plugins/:id/install', requireAuth, async (req, res, next) => {
  try {
    const { companyId } = req.body;
    const result = await marketplaceService.installPlugin(
      req.params.id,
      req.user._id,
      companyId
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/marketplace/plugins/:id/uninstall
 * @desc Uninstall plugin
 * @access Private
 */
router.delete('/plugins/:id/uninstall', requireAuth, async (req, res, next) => {
  try {
    const result = await marketplaceService.uninstallPlugin(
      req.params.id,
      req.user._id
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/marketplace/plugins/:id/review
 * @desc Add plugin review
 * @access Private
 */
router.post('/plugins/:id/review', requireAuth, async (req, res, next) => {
  try {
    const result = await marketplaceService.addReview(
      req.params.id,
      req.user._id,
      req.body
    );
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/marketplace/plugins/my-plugins
 * @desc Get user's installed plugins
 * @access Private
 */
router.get('/plugins/my-plugins', requireAuth, async (req, res, next) => {
  try {
    const Plugin = (await import('../models/Plugin.js')).default;
    const plugins = await Plugin.find({
      'installations.userId': req.user._id,
      'installations.isActive': true,
    }).select('pluginId name icon version author stats');

    res.json({ success: true, plugins });
  } catch (error) {
    next(error);
  }
});

// Developer routes

/**
 * @route POST /api/marketplace/plugins
 * @desc Create new plugin (Developer)
 * @access Private
 */
router.post('/plugins', requireAuth, async (req, res, next) => {
  try {
    const result = await marketplaceService.createPlugin(req.user._id, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/marketplace/plugins/:id
 * @desc Update plugin (Developer)
 * @access Private
 */
router.put('/plugins/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await marketplaceService.updatePlugin(
      req.params.id,
      req.user._id,
      req.body
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/marketplace/plugins/:id/versions
 * @desc Add plugin version (Developer)
 * @access Private
 */
router.post('/plugins/:id/versions', requireAuth, async (req, res, next) => {
  try {
    const result = await marketplaceService.addVersion(
      req.params.id,
      req.user._id,
      req.body
    );
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/marketplace/plugins/:id/submit
 * @desc Submit plugin for review (Developer)
 * @access Private
 */
router.post('/plugins/:id/submit', requireAuth, async (req, res, next) => {
  try {
    const result = await marketplaceService.submitForReview(
      req.params.id,
      req.user._id
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/marketplace/developer/stats
 * @desc Get developer statistics
 * @access Private
 */
router.get('/developer/stats', requireAuth, async (req, res, next) => {
  try {
    const result = await marketplaceService.getDeveloperStats(req.user._id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/marketplace/developer/plugins
 * @desc Get developer's plugins
 * @access Private
 */
router.get('/developer/plugins', requireAuth, async (req, res, next) => {
  try {
    const Plugin = (await import('../models/Plugin.js')).default;
    const plugins = await Plugin.getByDeveloper(req.user._id);
    res.json({ success: true, plugins });
  } catch (error) {
    next(error);
  }
});

// Integration routes

/**
 * @route GET /api/marketplace/integrations
 * @desc List available integrations
 * @access Public
 */
router.get('/integrations', async (req, res, next) => {
  try {
    const result = await marketplaceService.getIntegrations(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/marketplace/integrations/featured
 * @desc Get featured integrations
 * @access Public
 */
router.get('/integrations/featured', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    const integrations = await marketplaceService.getFeatured();
    res.json({ success: true, integrations: integrations.integrations });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/marketplace/integrations/:id
 * @desc Get integration details
 * @access Public
 */
router.get('/integrations/:id', async (req, res, next) => {
  try {
    const result = await marketplaceService.getIntegration(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/marketplace/integrations/:id/connect
 * @desc Connect integration
 * @access Private
 */
router.post('/integrations/:id/connect', requireAuth, async (req, res, next) => {
  try {
    const Integration = (await import('../models/Integration.js')).default;
    const integration = await Integration.findOne({
      $or: [
        { integrationId: req.params.id },
        { slug: req.params.id },
      ],
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Store connection in user's integrations
    // This would typically involve OAuth or API key setup
    res.json({
      success: true,
      message: 'Integration connection initiated',
      integration: {
        id: integration.integrationId,
        name: integration.name,
        setupRequired: true,
        configSchema: integration.configSchema,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/marketplace/featured
 * @desc Get all featured items
 * @access Public
 */
router.get('/featured', async (req, res, next) => {
  try {
    const result = await marketplaceService.getFeatured();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/marketplace/search
 * @desc Search marketplace
 * @access Public
 */
router.get('/search', async (req, res, next) => {
  try {
    const { q, ...filters } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    const result = await marketplaceService.search(q, filters);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
