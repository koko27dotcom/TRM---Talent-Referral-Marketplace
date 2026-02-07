const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const APIKey = require('../../../models/APIKey');
const User = require('../../../models/User');
const apiKeyService = require('../../../services/apiKeyService');
const { apiAuth, requirePermission } = require('../../../middleware/apiAuth');
const { apiLogger } = require('../../../middleware/apiLogger');

// Apply logging
router.use(apiLogger);

/**
 * @route   POST /api/v1/auth/apikey
 * @desc    Generate a new API key
 * @access  Private (requires authentication)
 */
router.post('/apikey', async (req, res) => {
  try {
    // This endpoint requires session authentication (not API key)
    // The regular auth middleware should be applied in the main router
    if (!req.user && !req.apiUser) {
      return res.status(401).json({
        error: {
          code: 'unauthorized',
          message: 'Authentication required. Please login to generate API keys.',
          type: 'authentication_error'
        }
      });
    }

    const userId = req.user?._id || req.apiUser?._id;
    const {
      name,
      description,
      permissions,
      companyId,
      environment = 'production',
      ipWhitelist,
      referrerWhitelist,
      expiresAt
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        error: {
          code: 'validation_error',
          message: 'API key name is required',
          type: 'validation_error'
        }
      });
    }

    // Validate permissions if provided
    if (permissions) {
      try {
        apiKeyService.validatePermissions(permissions);
      } catch (error) {
        return res.status(400).json({
          error: {
            code: 'invalid_permissions',
            message: error.message,
            type: 'validation_error'
          }
        });
      }
    }

    // Generate the API key
    const apiKey = await apiKeyService.generateKey(userId, {
      name,
      description,
      companyId,
      permissions: permissions || ['jobs:read', 'referrals:read', 'companies:read', 'users:read'],
      environment,
      ipWhitelist: ipWhitelist || [],
      referrerWhitelist: referrerWhitelist || [],
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      metadata: {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    res.status(201).json({
      success: true,
      data: apiKey,
      message: 'API key generated successfully. Store this key securely as it will not be shown again.'
    });
  } catch (error) {
    console.error('Error generating API key:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to generate API key',
        type: 'api_error'
      }
    });
  }
});

/**
 * @route   GET /api/v1/auth/apikeys
 * @desc    List all API keys for the authenticated user
 * @access  Private
 */
router.get('/apikeys', apiAuth, async (req, res) => {
  try {
    const { includeRevoked } = req.query;
    
    const keys = await apiKeyService.getUserKeys(
      req.apiUser._id,
      includeRevoked === 'true'
    );

    res.json({
      success: true,
      data: keys
    });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to fetch API keys',
        type: 'api_error'
      }
    });
  }
});

/**
 * @route   GET /api/v1/auth/apikeys/:id
 * @desc    Get specific API key details
 * @access  Private
 */
router.get('/apikeys/:id', apiAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const key = await apiKeyService.getKeyById(id, req.apiUser._id);

    res.json({
      success: true,
      data: key
    });
  } catch (error) {
    if (error.message === 'API key not found') {
      return res.status(404).json({
        error: {
          code: 'not_found',
          message: 'API key not found',
          type: 'not_found_error'
        }
      });
    }

    console.error('Error fetching API key:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to fetch API key',
        type: 'api_error'
      }
    });
  }
});

/**
 * @route   PUT /api/v1/auth/apikeys/:id
 * @desc    Update API key
 * @access  Private
 */
router.put('/apikeys/:id', apiAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const key = await apiKeyService.updateKey(id, req.apiUser._id, updates);

    res.json({
      success: true,
      data: key
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: {
          code: 'not_found',
          message: error.message,
          type: 'not_found_error'
        }
      });
    }

    console.error('Error updating API key:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to update API key',
        type: 'api_error'
      }
    });
  }
});

/**
 * @route   DELETE /api/v1/auth/apikeys/:id
 * @desc    Revoke an API key
 * @access  Private
 */
router.delete('/apikeys/:id', apiAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await apiKeyService.revokeKey(id, req.apiUser._id, reason);

    res.json({
      success: true,
      data: result,
      message: 'API key revoked successfully'
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: {
          code: 'not_found',
          message: error.message,
          type: 'not_found_error'
        }
      });
    }

    console.error('Error revoking API key:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to revoke API key',
        type: 'api_error'
      }
    });
  }
});

/**
 * @route   POST /api/v1/auth/apikeys/:id/rotate
 * @desc    Rotate API key (generate new key value)
 * @access  Private
 */
router.post('/apikeys/:id/rotate', apiAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await apiKeyService.rotateKey(id, req.apiUser._id);

    res.json({
      success: true,
      data: result,
      message: 'API key rotated successfully. The old key is no longer valid.'
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: {
          code: 'not_found',
          message: error.message,
          type: 'not_found_error'
        }
      });
    }

    console.error('Error rotating API key:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to rotate API key',
        type: 'api_error'
      }
    });
  }
});

/**
 * @route   GET /api/v1/auth/apikeys/:id/usage
 * @desc    Get API key usage statistics
 * @access  Private
 */
router.get('/apikeys/:id/usage', apiAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 30 } = req.query;

    const stats = await apiKeyService.getKeyUsage(
      id,
      req.apiUser._id,
      parseInt(days)
    );

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    if (error.message === 'API key not found') {
      return res.status(404).json({
        error: {
          code: 'not_found',
          message: 'API key not found',
          type: 'not_found_error'
        }
      });
    }

    console.error('Error fetching API key usage:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to fetch API key usage',
        type: 'api_error'
      }
    });
  }
});

/**
 * @route   GET /api/v1/auth/permissions
 * @desc    Get list of available permissions
 * @access  Public (with API key)
 */
router.get('/permissions', apiAuth, (req, res) => {
  const permissions = apiKeyService.getPermissionsReference();

  res.json({
    success: true,
    data: Object.entries(permissions).map(([key, description]) => ({
      key,
      description
    }))
  });
});

/**
 * @route   POST /api/v1/auth/verify
 * @desc    Verify an API key (test endpoint)
 * @access  Public (with API key)
 */
router.post('/verify', apiAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      valid: true,
      key: {
        id: req.apiKey._id,
        name: req.apiKey.name,
        permissions: req.apiKey.permissions,
        scopes: req.apiKey.scopes,
        environment: req.apiKey.environment
      },
      user: req.apiUser ? {
        id: req.apiUser._id,
        email: req.apiUser.email,
        name: `${req.apiUser.firstName} ${req.apiUser.lastName}`
      } : null,
      company: req.apiCompany ? {
        id: req.apiCompany._id,
        name: req.apiCompany.name
      } : null
    }
  });
});

module.exports = router;
