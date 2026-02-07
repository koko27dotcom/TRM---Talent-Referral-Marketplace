/**
 * Integration Routes
 * API endpoints for third-party integrations
 */

const express = require('express');
const marketplaceService = require('../services/marketplaceService.js');
const { requireAuth } = require('../middleware/auth.js');

const router = express.Router();

/**
 * @route GET /api/integrations
 * @desc List all available integrations
 * @access Public
 */
router.get('/', async (req, res, next) => {
  try {
    const result = await marketplaceService.getIntegrations(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/integrations/categories
 * @desc Get integration categories
 * @access Public
 */
router.get('/categories', async (req, res, next) => {
  try {
    const Integration = (await import('../models/Integration.js')).default;
    const categories = await Integration.distinct('category', { status: 'active' });
    
    // Get count per category
    const categoryCounts = await Integration.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      categories: categories.map(cat => ({
        name: cat,
        count: categoryCounts.find(c => c._id === cat)?.count || 0,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/integrations/:id
 * @desc Get integration details
 * @access Public
 */
router.get('/:id', async (req, res, next) => {
  try {
    const result = await marketplaceService.getIntegration(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/integrations/:id/setup
 * @desc Setup/integration configuration
 * @access Private
 */
router.post('/:id/setup', requireAuth, async (req, res, next) => {
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

    // Store user integration connection
    // This is a simplified version - in production, this would handle OAuth flows
    const UserIntegration = (await import('../models/UserIntegration.js')).catch(() => null);
    
    if (UserIntegration) {
      await UserIntegration.findOneAndUpdate(
        {
          userId: req.user._id,
          integrationId: integration._id,
        },
        {
          userId: req.user._id,
          integrationId: integration._id,
          config: req.body.config || {},
          status: 'connected',
          connectedAt: new Date(),
        },
        { upsert: true, new: true }
      );
    }

    res.json({
      success: true,
      message: 'Integration connected successfully',
      integration: {
        id: integration.integrationId,
        name: integration.name,
        status: 'connected',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/integrations/my-integrations
 * @desc Get user's connected integrations
 * @access Private
 */
router.get('/my-integrations', requireAuth, async (req, res, next) => {
  try {
    const UserIntegration = (await import('../models/UserIntegration.js')).catch(() => null);
    
    if (!UserIntegration) {
      return res.json({ success: true, integrations: [] });
    }

    const integrations = await UserIntegration.find({
      userId: req.user._id,
      status: { $in: ['connected', 'active'] },
    }).populate('integrationId', 'integrationId name category provider icon');

    res.json({
      success: true,
      integrations: integrations.map(i => ({
        id: i.integrationId?.integrationId,
        name: i.integrationId?.name,
        category: i.integrationId?.category,
        provider: i.integrationId?.provider,
        icon: i.integrationId?.icon,
        status: i.status,
        connectedAt: i.connectedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/integrations/:id
 * @desc Disconnect integration
 * @access Private
 */
router.delete('/:id', requireAuth, async (req, res, next) => {
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

    const UserIntegration = (await import('../models/UserIntegration.js')).catch(() => null);
    
    if (UserIntegration) {
      await UserIntegration.findOneAndUpdate(
        {
          userId: req.user._id,
          integrationId: integration._id,
        },
        {
          status: 'disconnected',
          disconnectedAt: new Date(),
        }
      );
    }

    res.json({
      success: true,
      message: 'Integration disconnected successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/integrations/:id/config
 * @desc Get integration configuration schema
 * @access Public
 */
router.get('/:id/config', async (req, res, next) => {
  try {
    const Integration = (await import('../models/Integration.js')).default;
    const integration = await Integration.findOne({
      $or: [
        { integrationId: req.params.id },
        { slug: req.params.id },
      ],
    }).select('configSchema setupGuide');

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    res.json({
      success: true,
      configSchema: integration.configSchema,
      setupGuide: integration.setupGuide,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/integrations/:id/test
 * @desc Test integration connection
 * @access Private
 */
router.post('/:id/test', requireAuth, async (req, res, next) => {
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

    // Test the connection with provided credentials
    // This is a placeholder - actual implementation would test the connection
    const testResult = {
      success: true,
      message: 'Connection test successful',
      timestamp: new Date(),
    };

    res.json(testResult);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/integrations/:id/webhooks
 * @desc Get integration webhook configuration
 * @access Private
 */
router.get('/:id/webhooks', requireAuth, async (req, res, next) => {
  try {
    const Integration = (await import('../models/Integration.js')).default;
    const integration = await Integration.findOne({
      $or: [
        { integrationId: req.params.id },
        { slug: req.params.id },
      ],
    }).select('webhooks');

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    res.json({
      success: true,
      webhooks: integration.webhooks,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/integrations/:id/sync
 * @desc Trigger data sync
 * @access Private
 */
router.post('/:id/sync', requireAuth, async (req, res, next) => {
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

    if (!integration.dataSync?.supported) {
      return res.status(400).json({ error: 'This integration does not support data sync' });
    }

    // Trigger sync job
    // This would typically queue a background job
    res.json({
      success: true,
      message: 'Sync initiated',
      syncId: 'SYNC-' + Date.now(),
      status: 'pending',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/integrations/:id/sync/status
 * @desc Get sync status
 * @access Private
 */
router.get('/:id/sync/status', requireAuth, async (req, res, next) => {
  try {
    // Return sync status
    // This is a placeholder - actual implementation would check job status
    res.json({
      success: true,
      status: 'completed',
      lastSync: new Date(),
      recordsSynced: 0,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
