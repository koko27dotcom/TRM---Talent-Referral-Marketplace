/**
 * APIService
 * Manages API keys, authentication, and usage tracking for partners
 * Handles rate limiting and API documentation
 */

const crypto = require('crypto');
const APIToken = require('../models/APIToken.js');
const Partner = require('../models/Partner.js');

/**
 * Service class for managing API operations
 */
class APIService {
  /**
   * Generate unique token ID
   * @returns {string} Unique token ID
   */
  generateTokenId() {
    return 'TKN-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  /**
   * Generate API key
   * @returns {Object} Key and hash
   */
  generateApiKey() {
    const key = 'trm_' + crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    const prefix = key.substring(0, 12);
    
    return { key, hash, prefix };
  }

  /**
   * Create API token for partner
   * @param {string} partnerId - Partner ID
   * @param {Object} tokenData - Token configuration
   * @returns {Promise<Object>} Created token
   */
  async createToken(partnerId, tokenData) {
    try {
      const partner = await Partner.findOne({ partnerId });
      if (!partner) {
        throw new Error('Partner not found');
      }

      if (partner.status !== 'active') {
        throw new Error('Partner account is not active');
      }

      // Check tier for API access
      const tierLimits = {
        bronze: { maxKeys: 2 },
        silver: { maxKeys: 5 },
        gold: { maxKeys: 10 },
        platinum: { maxKeys: 50 },
      };

      const limit = tierLimits[partner.tier] || tierLimits.bronze;
      const activeKeys = partner.apiKeys.filter(k => k.isActive).length;

      if (activeKeys >= limit.maxKeys) {
        throw new Error(`Maximum ${limit.maxKeys} API keys allowed for ${partner.tier} tier`);
      }

      // Generate key
      const { key, hash, prefix } = this.generateApiKey();

      // Determine rate limits based on tier
      const rateLimits = this.getTierRateLimits(partner.tier);

      // Create token
      const token = new APIToken({
        tokenId: this.generateTokenId(),
        partnerId: partner._id,
        userId: tokenData.userId,
        name: tokenData.name,
        tokenHash: hash,
        tokenPrefix: prefix,
        scopes: tokenData.scopes || ['read'],
        rateLimit: {
          ...rateLimits,
          ...tokenData.rateLimit,
        },
        expiresAt: tokenData.expiresAt,
        environment: tokenData.environment || 'production',
        webhookUrl: tokenData.webhookUrl,
        webhookEvents: tokenData.webhookEvents || [],
        ipWhitelist: tokenData.ipWhitelist || [],
        ipBlacklist: tokenData.ipBlacklist || [],
        metadata: tokenData.metadata || {},
        createdBy: tokenData.userId,
      });

      await token.save();

      // Add to partner's apiKeys array
      partner.apiKeys.push({
        keyId: token.tokenId,
        name: token.name,
        keyHash: hash,
        scopes: token.scopes,
        rateLimit: token.rateLimit,
        isActive: true,
        createdAt: new Date(),
      });
      await partner.save();

      return {
        success: true,
        token: {
          id: token.tokenId,
          name: token.name,
          key, // Only returned once!
          prefix,
          scopes: token.scopes,
          expiresAt: token.expiresAt,
          environment: token.environment,
        },
        message: 'API key created successfully. Please save the key - it will not be shown again.',
      };
    } catch (error) {
      console.error('Error creating API token:', error);
      throw error;
    }
  }

  /**
   * Get rate limits for tier
   * @param {string} tier - Partner tier
   * @returns {Object} Rate limits
   */
  getTierRateLimits(tier) {
    const limits = {
      bronze: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
        requestsPerMonth: 100000,
      },
      silver: {
        requestsPerMinute: 120,
        requestsPerHour: 5000,
        requestsPerDay: 50000,
        requestsPerMonth: 500000,
      },
      gold: {
        requestsPerMinute: 300,
        requestsPerHour: 20000,
        requestsPerDay: 200000,
        requestsPerMonth: 2000000,
      },
      platinum: {
        requestsPerMinute: 1000,
        requestsPerHour: 100000,
        requestsPerDay: 1000000,
        requestsPerMonth: 10000000,
      },
    };

    return limits[tier] || limits.bronze;
  }

  /**
   * Get API tokens for partner
   * @param {string} partnerId - Partner ID
   * @returns {Promise<Object>} Tokens list
   */
  async getTokens(partnerId) {
    try {
      const partner = await Partner.findOne({ partnerId });
      if (!partner) {
        throw new Error('Partner not found');
      }

      const tokens = await APIToken.getPartnerTokens(partner._id);

      // Sanitize for response (don't include hashes)
      const sanitizedTokens = tokens.map(token => ({
        id: token.tokenId,
        name: token.name,
        prefix: token.tokenPrefix,
        scopes: token.scopes,
        rateLimit: token.rateLimit,
        usageCount: token.usageCount,
        lastUsedAt: token.lastUsedAt,
        expiresAt: token.expiresAt,
        status: token.status,
        environment: token.environment,
        createdAt: token.createdAt,
      }));

      return {
        success: true,
        tokens: sanitizedTokens,
      };
    } catch (error) {
      console.error('Error getting API tokens:', error);
      throw error;
    }
  }

  /**
   * Revoke API token
   * @param {string} partnerId - Partner ID
   * @param {string} tokenId - Token ID
   * @param {string} userId - User revoking
   * @param {string} reason - Revocation reason
   * @returns {Promise<Object>} Result
   */
  async revokeToken(partnerId, tokenId, userId, reason) {
    try {
      const partner = await Partner.findOne({ partnerId });
      if (!partner) {
        throw new Error('Partner not found');
      }

      const token = await APIToken.findOne({ tokenId, partnerId: partner._id });
      if (!token) {
        throw new Error('Token not found');
      }

      await token.revoke(userId, reason);

      // Update partner's apiKeys array
      const keyIndex = partner.apiKeys.findIndex(k => k.keyId === tokenId);
      if (keyIndex >= 0) {
        partner.apiKeys[keyIndex].isActive = false;
        await partner.save();
      }

      return {
        success: true,
        message: 'API token revoked successfully',
      };
    } catch (error) {
      console.error('Error revoking API token:', error);
      throw error;
    }
  }

  /**
   * Validate API key
   * @param {string} apiKey - API key to validate
   * @param {Object} requestData - Request metadata
   * @returns {Promise<Object>} Validation result
   */
  async validateKey(apiKey, requestData = {}) {
    try {
      if (!apiKey || !apiKey.startsWith('trm_')) {
        return { valid: false, error: 'Invalid API key format' };
      }

      // Hash the key
      const hash = crypto.createHash('sha256').update(apiKey).digest('hex');

      // Find token
      const token = await APIToken.findByTokenHash(hash);
      if (!token) {
        return { valid: false, error: 'Invalid API key' };
      }

      // Validate token status
      const validation = token.validateToken();
      if (!validation.valid) {
        return { valid: false, error: validation.reason };
      }

      // Check IP restrictions
      if (requestData.ipAddress && !token.isIpAllowed(requestData.ipAddress)) {
        return { valid: false, error: 'IP address not allowed' };
      }

      // Check rate limits
      const rateLimitCheck = token.checkRateLimit();
      if (!rateLimitCheck.allowed) {
        return { valid: false, error: 'Rate limit exceeded' };
      }

      return {
        valid: true,
        token: {
          id: token.tokenId,
          partnerId: token.partnerId,
          scopes: token.scopes,
          environment: token.environment,
        },
        rateLimits: rateLimitCheck.limits,
      };
    } catch (error) {
      console.error('Error validating API key:', error);
      return { valid: false, error: 'Validation error' };
    }
  }

  /**
   * Record API usage
   * @param {string} tokenId - Token ID
   * @param {Object} usageData - Usage details
   * @returns {Promise<Object>} Result
   */
  async recordUsage(tokenId, usageData) {
    try {
      const token = await APIToken.findOne({ tokenId });
      if (!token) {
        return { success: false, error: 'Token not found' };
      }

      // Record usage
      await token.recordUsage({
        endpoint: usageData.endpoint,
        method: usageData.method,
        statusCode: usageData.statusCode,
        responseTime: usageData.responseTime,
        ipAddress: usageData.ipAddress,
        userAgent: usageData.userAgent,
        requestSize: usageData.requestSize,
        responseSize: usageData.responseSize,
      });

      // Increment rate limit
      await token.incrementRateLimit();

      return { success: true };
    } catch (error) {
      console.error('Error recording API usage:', error);
      throw error;
    }
  }

  /**
   * Get API usage stats
   * @param {string} partnerId - Partner ID
   * @param {Object} dateRange - Date range
   * @returns {Promise<Object>} Usage stats
   */
  async getUsageStats(partnerId, dateRange = {}) {
    try {
      const partner = await Partner.findOne({ partnerId });
      if (!partner) {
        throw new Error('Partner not found');
      }

      const stats = await APIToken.getUsageStats(partner._id, dateRange);

      // Get per-token stats
      const tokens = await APIToken.find({ partnerId: partner._id });
      const tokenStats = tokens.map(token => ({
        id: token.tokenId,
        name: token.name,
        usageCount: token.usageCount,
        lastUsedAt: token.lastUsedAt,
        lastUsedEndpoint: token.lastUsedEndpoint,
      }));

      return {
        success: true,
        stats,
        tokens: tokenStats,
      };
    } catch (error) {
      console.error('Error getting usage stats:', error);
      throw error;
    }
  }

  /**
   * Check scope permission
   * @param {Array} tokenScopes - Token scopes
   * @param {string} requiredScope - Required scope
   * @returns {boolean} Has permission
   */
  hasScope(tokenScopes, requiredScope) {
    // Admin scope has all permissions
    if (tokenScopes.includes('admin')) {
      return true;
    }

    // Check exact match
    if (tokenScopes.includes(requiredScope)) {
      return true;
    }

    // Check base scope (e.g., 'jobs:read' matches 'jobs')
    const baseScope = requiredScope.split(':')[0];
    if (tokenScopes.includes(baseScope)) {
      return true;
    }

    // Check write implies read
    if (requiredScope.endsWith(':read')) {
      const writeScope = requiredScope.replace(':read', ':write');
      if (tokenScopes.includes(writeScope)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get API documentation
   * @returns {Promise<Object>} API documentation
   */
  async getDocumentation() {
    try {
      const documentation = {
        version: '1.0.0',
        baseUrl: `${process.env.API_URL || 'https://api.trm.referrals'}/v1`,
        authentication: {
          type: 'Bearer',
          header: 'Authorization',
          format: 'Bearer {api_key}',
          description: 'Include your API key in the Authorization header',
        },
        rateLimiting: {
          headers: {
            'X-RateLimit-Limit': 'Request limit for the current window',
            'X-RateLimit-Remaining': 'Remaining requests in current window',
            'X-RateLimit-Reset': 'Timestamp when the window resets',
          },
        },
        endpoints: [
          {
            group: 'Jobs',
            description: 'Manage job postings',
            endpoints: [
              {
                method: 'GET',
                path: '/jobs',
                description: 'List all jobs',
                scopes: ['jobs:read', 'read'],
                parameters: [
                  { name: 'page', type: 'integer', description: 'Page number' },
                  { name: 'limit', type: 'integer', description: 'Items per page' },
                  { name: 'status', type: 'string', description: 'Job status filter' },
                ],
              },
              {
                method: 'POST',
                path: '/jobs',
                description: 'Create a new job',
                scopes: ['jobs:write', 'write'],
                body: {
                  title: 'string (required)',
                  description: 'string (required)',
                  company: 'string (required)',
                  location: 'string',
                  salary: 'object',
                },
              },
              {
                method: 'GET',
                path: '/jobs/:id',
                description: 'Get job details',
                scopes: ['jobs:read', 'read'],
              },
              {
                method: 'PUT',
                path: '/jobs/:id',
                description: 'Update job',
                scopes: ['jobs:write', 'write'],
              },
              {
                method: 'DELETE',
                path: '/jobs/:id',
                description: 'Delete job',
                scopes: ['jobs:write', 'write', 'delete'],
              },
            ],
          },
          {
            group: 'Referrals',
            description: 'Manage referrals',
            endpoints: [
              {
                method: 'GET',
                path: '/referrals',
                description: 'List referrals',
                scopes: ['referrals:read', 'read'],
              },
              {
                method: 'POST',
                path: '/referrals',
                description: 'Submit referral',
                scopes: ['referrals:write', 'write'],
              },
              {
                method: 'GET',
                path: '/referrals/:id',
                description: 'Get referral details',
                scopes: ['referrals:read', 'read'],
              },
            ],
          },
          {
            group: 'Companies',
            description: 'Manage companies',
            endpoints: [
              {
                method: 'GET',
                path: '/companies',
                description: 'List companies',
                scopes: ['companies:read', 'read'],
              },
              {
                method: 'GET',
                path: '/companies/:id',
                description: 'Get company details',
                scopes: ['companies:read', 'read'],
              },
            ],
          },
          {
            group: 'Analytics',
            description: 'Access analytics data',
            endpoints: [
              {
                method: 'GET',
                path: '/analytics/overview',
                description: 'Get overview metrics',
                scopes: ['analytics:read', 'read'],
              },
              {
                method: 'GET',
                path: '/analytics/jobs',
                description: 'Get job analytics',
                scopes: ['analytics:read', 'read'],
              },
              {
                method: 'GET',
                path: '/analytics/referrals',
                description: 'Get referral analytics',
                scopes: ['analytics:read', 'read'],
              },
            ],
          },
          {
            group: 'Webhooks',
            description: 'Manage webhooks',
            endpoints: [
              {
                method: 'POST',
                path: '/webhooks',
                description: 'Register webhook',
                scopes: ['webhooks:write', 'write'],
              },
              {
                method: 'GET',
                path: '/webhooks',
                description: 'List webhooks',
                scopes: ['webhooks:read', 'read'],
              },
              {
                method: 'DELETE',
                path: '/webhooks/:id',
                description: 'Delete webhook',
                scopes: ['webhooks:write', 'write', 'delete'],
              },
            ],
          },
        ],
        webhooks: {
          description: 'Receive real-time event notifications',
          events: [
            { name: 'job.created', description: 'New job posted' },
            { name: 'job.updated', description: 'Job updated' },
            { name: 'referral.submitted', description: 'New referral submitted' },
            { name: 'referral.status_changed', description: 'Referral status changed' },
            { name: 'company.registered', description: 'New company registered' },
          ],
          signature: {
            header: 'X-Webhook-Signature',
            algorithm: 'HMAC-SHA256',
            description: 'Verify webhook authenticity using your webhook secret',
          },
        },
        sdks: [
          { name: 'JavaScript', url: '/sdk/javascript', package: 'npm install @trm/api' },
          { name: 'Python', url: '/sdk/python', package: 'pip install trm-api' },
          { name: 'PHP', url: '/sdk/php', package: 'composer require trm/api' },
        ],
        errors: [
          { code: 400, message: 'Bad Request', description: 'Invalid request format' },
          { code: 401, message: 'Unauthorized', description: 'Invalid or missing API key' },
          { code: 403, message: 'Forbidden', description: 'Insufficient permissions' },
          { code: 404, message: 'Not Found', description: 'Resource not found' },
          { code: 429, message: 'Too Many Requests', description: 'Rate limit exceeded' },
          { code: 500, message: 'Internal Server Error', description: 'Server error' },
        ],
      };

      return {
        success: true,
        documentation,
      };
    } catch (error) {
      console.error('Error getting API documentation:', error);
      throw error;
    }
  }

  /**
   * Get code examples
   * @param {string} language - Programming language
   * @returns {Promise<Object>} Code examples
   */
  async getCodeExamples(language = 'javascript') {
    try {
      const examples = {
        javascript: {
          initialization: `import { TRMClient } from '@trm/api';

const client = new TRMClient({
  apiKey: 'your_api_key_here',
  environment: 'production' // or 'sandbox'
});`,
          listJobs: `// List all jobs
const jobs = await client.jobs.list({
  page: 1,
  limit: 20,
  status: 'active'
});

console.log(jobs.data);`,
          createJob: `// Create a new job
const job = await client.jobs.create({
  title: 'Senior Software Engineer',
  description: 'We are looking for...',
  company: 'Tech Corp',
  location: 'Yangon',
  salary: {
    min: 2000000,
    max: 4000000,
    currency: 'MMK'
  }
});

console.log(job.id);`,
          webhooks: `// Handle webhook
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  
  // Verify signature
  const isValid = client.webhooks.verifySignature(
    req.body,
    signature,
    'your_webhook_secret'
  );
  
  if (isValid) {
    console.log('Event:', req.body.event);
    console.log('Data:', req.body.data);
  }
  
  res.sendStatus(200);
});`,
        },
        python: {
          initialization: `from trm_api import TRMClient

client = TRMClient(
    api_key='your_api_key_here',
    environment='production'
)`,
          listJobs: `# List all jobs
jobs = client.jobs.list(
    page=1,
    limit=20,
    status='active'
)

print(jobs.data)`,
          createJob: `# Create a new job
job = client.jobs.create(
    title='Senior Software Engineer',
    description='We are looking for...',
    company='Tech Corp',
    location='Yangon',
    salary={
        'min': 2000000,
        'max': 4000000,
        'currency': 'MMK'
    }
)

print(job.id)`,
        },
        php: {
          initialization: `<?php
require_once 'vendor/autoload.php';

use TRM\\Client;

$client = new Client([
    'api_key' => 'your_api_key_here',
    'environment' => 'production'
]);`,
          listJobs: `<?php
// List all jobs
$jobs = $client->jobs->list([
    'page' => 1,
    'limit' => 20,
    'status' => 'active'
]);

print_r($jobs->data);`,
        },
        curl: {
          authentication: `curl -X GET \\
  https://api.trm.referrals/v1/jobs \\
  -H 'Authorization: Bearer your_api_key_here'`,
          listJobs: `curl -X GET \\
  'https://api.trm.referrals/v1/jobs?page=1&limit=20' \\
  -H 'Authorization: Bearer your_api_key_here'`,
          createJob: `curl -X POST \\
  https://api.trm.referrals/v1/jobs \\
  -H 'Authorization: Bearer your_api_key_here' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "title": "Senior Software Engineer",
    "description": "We are looking for...",
    "company": "Tech Corp",
    "location": "Yangon"
  }'`,
        },
      };

      return {
        success: true,
        language,
        examples: examples[language] || examples.javascript,
      };
    } catch (error) {
      console.error('Error getting code examples:', error);
      throw error;
    }
  }

  /**
   * Rotate API key
   * @param {string} partnerId - Partner ID
   * @param {string} tokenId - Token ID to rotate
   * @param {string} userId - User rotating
   * @returns {Promise<Object>} New key
   */
  async rotateKey(partnerId, tokenId, userId) {
    try {
      const partner = await Partner.findOne({ partnerId });
      if (!partner) {
        throw new Error('Partner not found');
      }

      const oldToken = await APIToken.findOne({ tokenId, partnerId: partner._id });
      if (!oldToken) {
        throw new Error('Token not found');
      }

      // Revoke old token
      await oldToken.revoke(userId, 'Key rotation');

      // Create new token with same settings
      const { key, hash, prefix } = this.generateApiKey();

      const newToken = new APIToken({
        tokenId: this.generateTokenId(),
        partnerId: partner._id,
        userId,
        name: `${oldToken.name} (Rotated)`,
        tokenHash: hash,
        tokenPrefix: prefix,
        scopes: oldToken.scopes,
        rateLimit: oldToken.rateLimit,
        environment: oldToken.environment,
        webhookUrl: oldToken.webhookUrl,
        webhookEvents: oldToken.webhookEvents,
        createdBy: userId,
      });

      await newToken.save();

      return {
        success: true,
        token: {
          id: newToken.tokenId,
          name: newToken.name,
          key, // Only returned once!
          prefix,
          scopes: newToken.scopes,
        },
        message: 'API key rotated successfully. Old key has been revoked.',
      };
    } catch (error) {
      console.error('Error rotating API key:', error);
      throw error;
    }
  }
}

module.exports = new APIService();
