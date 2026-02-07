const express = require('express');
const router = express.Router();
const Webhook = require('../../../models/Webhook');
const WebhookDelivery = require('../../../models/WebhookDelivery');
const webhookService = require('../../../services/webhookService');
const { apiAuth, requirePermission } = require('../../../middleware/apiAuth');
const { apiLogger } = require('../../../middleware/apiLogger');

// Apply API auth and logging
router.use(apiAuth);
router.use(apiLogger);

/**
 * @route   GET /api/v1/webhooks
 * @desc    List all webhooks for the authenticated user/company
 * @access  Private (requires webhooks:read permission)
 */
router.get('/', requirePermission('webhooks:read'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      companyId
    } = req.query;

    const options = {};
    if (status) options.status = status;
    if (companyId) options.companyId = companyId;
    else if (req.apiCompany) options.companyId = req.apiCompany._id;

    const webhooks = await webhookService.getUserWebhooks(req.apiUser._id, options);

    res.json({
      success: true,
      data: webhooks
    });
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to fetch webhooks',
        type: 'api_error'
      }
    });
  }
});

/**
 * @route   POST /api/v1/webhooks
 * @desc    Register a new webhook
 * @access  Private (requires webhooks:write permission)
 */
router.post('/', requirePermission('webhooks:write'), async (req, res) => {
  try {
    const {
      name,
      description,
      url,
      events,
      headers,
      secret,
      verifySSL,
      retryConfig,
      eventFilters
    } = req.body;

    // Validate required fields
    if (!name || !url || !events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        error: {
          code: 'validation_error',
          message: 'Name, URL, and at least one event are required',
          type: 'validation_error'
        }
      });
    }

    // Validate URL
    try {
      webhookService.validateUrl(url);
    } catch (error) {
      return res.status(400).json({
        error: {
          code: 'invalid_url',
          message: error.message,
          type: 'validation_error'
        }
      });
    }

    // Validate events
    try {
      webhookService.validateEvents(events);
    } catch (error) {
      return res.status(400).json({
        error: {
          code: 'invalid_events',
          message: error.message,
          type: 'validation_error'
        }
      });
    }

    // Create webhook
    const webhook = await webhookService.registerWebhook(req.apiUser._id, {
      name,
      description,
      url,
      events,
      companyId: req.apiCompany?._id,
      apiKeyId: req.apiKey?._id,
      headers,
      secret,
      verifySSL,
      retryConfig,
      eventFilters
    });

    res.status(201).json({
      success: true,
      data: webhook,
      message: 'Webhook registered successfully. Store the secret securely as it will not be shown again.'
    });
  } catch (error) {
    console.error('Error registering webhook:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to register webhook',
        type: 'api_error'
      }
    });
  }
});

/**
 * @route   GET /api/v1/webhooks/:id
 * @desc    Get webhook details
 * @access  Private (requires webhooks:read permission)
 */
router.get('/:id', requirePermission('webhooks:read'), async (req, res) => {
  try {
    const { id } = req.params;

    const webhook = await Webhook.findOne({
      _id: id,
      user: req.apiUser._id
    }).populate('company', 'name slug');

    if (!webhook) {
      return res.status(404).json({
        error: {
          code: 'not_found',
          message: 'Webhook not found',
          type: 'not_found_error'
        }
      });
    }

    res.json({
      success: true,
      data: {
        id: webhook._id,
        name: webhook.name,
        description: webhook.description,
        url: webhook.url,
        events: webhook.events,
        status: webhook.status,
        health: webhook.health,
        successRate: webhook.successRate,
        headers: Object.fromEntries(webhook.headers || new Map()),
        verifySSL: webhook.verifySSL,
        retryConfig: webhook.retryConfig,
        eventFilters: webhook.eventFilters,
        company: webhook.company,
        createdAt: webhook.createdAt,
        updatedAt: webhook.updatedAt,
        lastError: webhook.lastError
      }
    });
  } catch (error) {
    console.error('Error fetching webhook:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to fetch webhook',
        type: 'api_error'
      }
    });
  }
});

/**
 * @route   PUT /api/v1/webhooks/:id
 * @desc    Update a webhook
 * @access  Private (requires webhooks:write permission)
 */
router.put('/:id', requirePermission('webhooks:write'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const webhook = await Webhook.findOne({
      _id: id,
      user: req.apiUser._id
    });

    if (!webhook) {
      return res.status(404).json({
        error: {
          code: 'not_found',
          message: 'Webhook not found',
          type: 'not_found_error'
        }
      });
    }

    // Validate URL if provided
    if (updates.url) {
      try {
        webhookService.validateUrl(updates.url);
      } catch (error) {
        return res.status(400).json({
          error: {
            code: 'invalid_url',
            message: error.message,
            type: 'validation_error'
          }
        });
      }
    }

    // Validate events if provided
    if (updates.events) {
      try {
        webhookService.validateEvents(updates.events);
      } catch (error) {
        return res.status(400).json({
          error: {
            code: 'invalid_events',
            message: error.message,
            type: 'validation_error'
          }
        });
      }
    }

    // Apply updates
    const allowedFields = [
      'name', 'description', 'url', 'events', 'headers',
      'verifySSL', 'retryConfig', 'eventFilters', 'status'
    ];

    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        webhook[field] = updates[field];
      }
    });

    webhook.updatedAt = new Date();
    await webhook.save();

    res.json({
      success: true,
      data: {
        id: webhook._id,
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        status: webhook.status,
        updatedAt: webhook.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating webhook:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to update webhook',
        type: 'api_error'
      }
    });
  }
});

/**
 * @route   DELETE /api/v1/webhooks/:id
 * @desc    Delete a webhook
 * @access  Private (requires webhooks:write permission)
 */
router.delete('/:id', requirePermission('webhooks:write'), async (req, res) => {
  try {
    const { id } = req.params;

    const webhook = await Webhook.findOneAndDelete({
      _id: id,
      user: req.apiUser._id
    });

    if (!webhook) {
      return res.status(404).json({
        error: {
          code: 'not_found',
          message: 'Webhook not found',
          type: 'not_found_error'
        }
      });
    }

    res.json({
      success: true,
      data: {
        id: webhook._id,
        deleted: true
      }
    });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to delete webhook',
        type: 'api_error'
      }
    });
  }
});

/**
 * @route   POST /api/v1/webhooks/:id/test
 * @desc    Send a test event to webhook
 * @access  Private (requires webhooks:write permission)
 */
router.post('/:id/test', requirePermission('webhooks:write'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await webhookService.sendTestEvent(id, req.apiUser._id);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error.message === 'Webhook not found') {
      return res.status(404).json({
        error: {
          code: 'not_found',
          message: 'Webhook not found',
          type: 'not_found_error'
        }
      });
    }

    console.error('Error testing webhook:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to send test event',
        type: 'api_error'
      }
    });
  }
});

/**
 * @route   GET /api/v1/webhooks/:id/deliveries
 * @desc    Get webhook delivery history
 * @access  Private (requires webhooks:read permission)
 */
router.get('/:id/deliveries', requirePermission('webhooks:read'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, event, limit = 50, skip = 0 } = req.query;

    // Verify webhook ownership
    const webhook = await Webhook.findOne({
      _id: id,
      user: req.apiUser._id
    });

    if (!webhook) {
      return res.status(404).json({
        error: {
          code: 'not_found',
          message: 'Webhook not found',
          type: 'not_found_error'
        }
      });
    }

    const deliveries = await webhookService.getDeliveries(id, {
      status,
      event,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });

    res.json({
      success: true,
      data: deliveries.map(d => ({
        id: d._id,
        deliveryId: d.deliveryId,
        event: d.event,
        status: d.status,
        attempts: d.attempts.length,
        createdAt: d.createdAt,
        completedAt: d.completedAt
      }))
    });
  } catch (error) {
    console.error('Error fetching webhook deliveries:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to fetch webhook deliveries',
        type: 'api_error'
      }
    });
  }
});

/**
 * @route   GET /api/v1/webhooks/:id/deliveries/:deliveryId
 * @desc    Get specific delivery details
 * @access  Private (requires webhooks:read permission)
 */
router.get('/:id/deliveries/:deliveryId', requirePermission('webhooks:read'), async (req, res) => {
  try {
    const { id, deliveryId } = req.params;

    // Verify webhook ownership
    const webhook = await Webhook.findOne({
      _id: id,
      user: req.apiUser._id
    });

    if (!webhook) {
      return res.status(404).json({
        error: {
          code: 'not_found',
          message: 'Webhook not found',
          type: 'not_found_error'
        }
      });
    }

    const delivery = await WebhookDelivery.findOne({
      deliveryId,
      webhook: id
    });

    if (!delivery) {
      return res.status(404).json({
        error: {
          code: 'not_found',
          message: 'Delivery not found',
          type: 'not_found_error'
        }
      });
    }

    res.json({
      success: true,
      data: {
        id: delivery._id,
        deliveryId: delivery.deliveryId,
        event: delivery.event,
        status: delivery.status,
        payload: delivery.payload,
        attempts: delivery.attempts,
        createdAt: delivery.createdAt,
        completedAt: delivery.completedAt,
        result: delivery.result
      }
    });
  } catch (error) {
    console.error('Error fetching delivery:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to fetch delivery details',
        type: 'api_error'
      }
    });
  }
});

/**
 * @route   GET /api/v1/webhooks/events
 * @desc    Get list of available webhook events
 * @access  Public (with API key)
 */
router.get('/events/list', requirePermission('webhooks:read'), (req, res) => {
  const events = {
    referral: {
      description: 'Referral lifecycle events',
      events: [
        { name: 'referral.created', description: 'Triggered when a new referral is created' },
        { name: 'referral.updated', description: 'Triggered when a referral is updated' },
        { name: 'referral.status_changed', description: 'Triggered when referral status changes' },
        { name: 'referral.submitted', description: 'Triggered when referral is submitted' },
        { name: 'referral.hired', description: 'Triggered when candidate is hired' },
        { name: 'referral.rejected', description: 'Triggered when candidate is rejected' }
      ]
    },
    job: {
      description: 'Job posting events',
      events: [
        { name: 'job.published', description: 'Triggered when a job is published' },
        { name: 'job.updated', description: 'Triggered when a job is updated' },
        { name: 'job.closed', description: 'Triggered when a job is closed' }
      ]
    },
    payout: {
      description: 'Payout events',
      events: [
        { name: 'payout.completed', description: 'Triggered when a payout is completed' },
        { name: 'payout.failed', description: 'Triggered when a payout fails' }
      ]
    },
    user: {
      description: 'User events',
      events: [
        { name: 'user.verified', description: 'Triggered when a user is verified' }
      ]
    }
  };

  res.json({
    success: true,
    data: events
  });
});

module.exports = router;
