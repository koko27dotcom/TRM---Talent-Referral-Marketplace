const APIKey = require('../models/APIKey');
const crypto = require('crypto');

/**
 * API Key Service
 * Handles generation, validation, and management of API keys
 */
class APIKeyService {
  /**
   * Generate a new API key
   */
  async generateKey(userId, options = {}) {
    const {
      name,
      description,
      companyId,
      permissions = ['jobs:read', 'referrals:read', 'companies:read'],
      scopes = ['public'],
      rateLimit,
      environment = 'production',
      ipWhitelist = [],
      referrerWhitelist = [],
      expiresAt,
      metadata = {}
    } = options;

    // Generate key with prefix based on environment
    const prefix = environment === 'production' ? 'trm_live_' : 'trm_test_';
    const key = `${prefix}${crypto.randomBytes(32).toString('hex')}`;

    const apiKey = new APIKey({
      key,
      name: name || `API Key ${new Date().toISOString()}`,
      description,
      user: userId,
      company: companyId,
      permissions,
      scopes,
      rateLimit: {
        requestsPerMinute: rateLimit?.requestsPerMinute || 60,
        requestsPerHour: rateLimit?.requestsPerHour || 1000,
        requestsPerDay: rateLimit?.requestsPerDay || 10000
      },
      environment,
      ipWhitelist,
      referrerWhitelist,
      expiresAt,
      metadata: {
        ...metadata,
        createdFromIP: metadata.ipAddress,
        userAgent: metadata.userAgent
      }
    });

    await apiKey.save();

    // Return key with the full key value (only shown once)
    return {
      id: apiKey._id,
      key, // Only returned on creation
      name: apiKey.name,
      description: apiKey.description,
      permissions: apiKey.permissions,
      scopes: apiKey.scopes,
      environment: apiKey.environment,
      createdAt: apiKey.createdAt,
      expiresAt: apiKey.expiresAt
    };
  }

  /**
   * Validate an API key
   */
  async validateKey(key) {
    if (!key) {
      return { valid: false, error: 'API key is required' };
    }

    // Check format
    const validPrefixes = ['trm_live_', 'trm_test_'];
    if (!validPrefixes.some(prefix => key.startsWith(prefix))) {
      return { valid: false, error: 'Invalid API key format' };
    }

    // Find key in database
    const apiKey = await APIKey.findByKey(key).populate('user company');

    if (!apiKey) {
      return { valid: false, error: 'Invalid or revoked API key' };
    }

    if (apiKey.isExpired) {
      return { valid: false, error: 'API key has expired' };
    }

    return {
      valid: true,
      apiKey,
      user: apiKey.user,
      company: apiKey.company
    };
  }

  /**
   * Get all API keys for a user
   */
  async getUserKeys(userId, includeRevoked = false) {
    const query = { user: userId };
    if (!includeRevoked) {
      query.isRevoked = false;
    }

    const keys = await APIKey.find(query)
      .select('-key') // Don't return full key
      .populate('company', 'name')
      .sort({ createdAt: -1 });

    return keys.map(key => ({
      id: key._id,
      name: key.name,
      description: key.description,
      permissions: key.permissions,
      scopes: key.scopes,
      environment: key.environment,
      isActive: key.isActive,
      isRevoked: key.isRevoked,
      usage: key.usage,
      keyPreview: `${key.key.substring(0, 12)}...`,
      company: key.company,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt,
      lastUsedAt: key.usage.lastUsedAt
    }));
  }

  /**
   * Get API key by ID
   */
  async getKeyById(keyId, userId) {
    const key = await APIKey.findOne({
      _id: keyId,
      user: userId
    }).populate('company', 'name');

    if (!key) {
      throw new Error('API key not found');
    }

    return {
      id: key._id,
      name: key.name,
      description: key.description,
      permissions: key.permissions,
      scopes: key.scopes,
      environment: key.environment,
      rateLimit: key.rateLimit,
      isActive: key.isActive,
      isRevoked: key.isRevoked,
      usage: key.usage,
      ipWhitelist: key.ipWhitelist,
      referrerWhitelist: key.referrerWhitelist,
      keyPreview: `${key.key.substring(0, 12)}...`,
      company: key.company,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt,
      lastRotatedAt: key.lastRotatedAt,
      lastUsedAt: key.usage.lastUsedAt
    };
  }

  /**
   * Update API key
   */
  async updateKey(keyId, userId, updates) {
    const allowedUpdates = [
      'name',
      'description',
      'permissions',
      'scopes',
      'rateLimit',
      'ipWhitelist',
      'referrerWhitelist',
      'isActive',
      'expiresAt'
    ];

    const updateData = {};
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        updateData[key] = updates[key];
      }
    }

    const key = await APIKey.findOneAndUpdate(
      { _id: keyId, user: userId, isRevoked: false },
      { $set: updateData },
      { new: true }
    );

    if (!key) {
      throw new Error('API key not found or has been revoked');
    }

    return this.getKeyById(keyId, userId);
  }

  /**
   * Revoke an API key
   */
  async revokeKey(keyId, userId, reason) {
    const key = await APIKey.findOne({
      _id: keyId,
      user: userId,
      isRevoked: false
    });

    if (!key) {
      throw new Error('API key not found or already revoked');
    }

    await key.revoke(reason);

    return {
      id: key._id,
      revokedAt: key.revokedAt,
      reason: key.revokedReason
    };
  }

  /**
   * Rotate an API key
   */
  async rotateKey(keyId, userId) {
    const key = await APIKey.findOne({
      _id: keyId,
      user: userId,
      isRevoked: false
    });

    if (!key) {
      throw new Error('API key not found or has been revoked');
    }

    const newKeyValue = await key.rotate();

    return {
      id: key._id,
      key: newKeyValue, // Only returned on rotation
      lastRotatedAt: key.lastRotatedAt
    };
  }

  /**
   * Get API key usage statistics
   */
  async getKeyUsage(keyId, userId, days = 30) {
    const key = await APIKey.findOne({
      _id: keyId,
      user: userId
    });

    if (!key) {
      throw new Error('API key not found');
    }

    const APILog = require('../models/APILog');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await APILog.aggregate([
      {
        $match: {
          apiKey: key._id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          requests: { $sum: 1 },
          avgResponseTime: { $avg: '$responseTime' },
          errors: {
            $sum: {
              $cond: [{ $gte: ['$statusCode', 400] }, 1, 0]
            }
          }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } }
    ]);

    const endpointStats = await APILog.aggregate([
      {
        $match: {
          apiKey: key._id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { method: '$method', path: '$path' },
          requests: { $sum: 1 },
          avgResponseTime: { $avg: '$responseTime' }
        }
      },
      { $sort: { requests: -1 } },
      { $limit: 10 }
    ]);

    return {
      keyId: key._id,
      totalRequests: key.usage.totalRequests,
      requestsThisMonth: key.usage.requestsThisMonth,
      lastUsedAt: key.usage.lastUsedAt,
      dailyStats: stats.map(s => ({
        date: `${s._id.year}-${String(s._id.month).padStart(2, '0')}-${String(s._id.day).padStart(2, '0')}`,
        requests: s.requests,
        avgResponseTime: Math.round(s.avgResponseTime || 0),
        errors: s.errors
      })),
      topEndpoints: endpointStats.map(e => ({
        method: e._id.method,
        path: e._id.path,
        requests: e.requests,
        avgResponseTime: Math.round(e.avgResponseTime || 0)
      }))
    };
  }

  /**
   * Regenerate monthly usage counters
   */
  async resetMonthlyUsage() {
    const result = await APIKey.updateMany(
      {},
      { $set: { 'usage.requestsThisMonth': 0 } }
    );

    return {
      updated: result.modifiedCount
    };
  }

  /**
   * Clean up expired keys
   */
  async cleanupExpiredKeys() {
    const result = await APIKey.updateMany(
      {
        expiresAt: { $lt: new Date() },
        isActive: true
      },
      {
        $set: {
          isActive: false,
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: 'Expired'
        }
      }
    );

    return {
      deactivated: result.modifiedCount
    };
  }

  /**
   * Get API key permissions reference
   */
  getPermissionsReference() {
    return {
      'jobs:read': 'Read job listings and details',
      'jobs:write': 'Create, update, and delete jobs',
      'referrals:read': 'Read referral data and status',
      'referrals:write': 'Create and manage referrals',
      'companies:read': 'Read company information',
      'companies:write': 'Update company profiles',
      'users:read': 'Read user profiles',
      'users:write': 'Update user profiles',
      'webhooks:read': 'Read webhook configurations',
      'webhooks:write': 'Manage webhooks',
      'admin:full': 'Full administrative access'
    };
  }

  /**
   * Validate permissions
   */
  validatePermissions(permissions) {
    const validPermissions = Object.keys(this.getPermissionsReference());
    const invalid = permissions.filter(p => !validPermissions.includes(p));
    
    if (invalid.length > 0) {
      throw new Error(`Invalid permissions: ${invalid.join(', ')}`);
    }
    
    return true;
  }
}

module.exports = new APIKeyService();
