const Webhook = require('../models/Webhook');
const WebhookDelivery = require('../models/WebhookDelivery');
const axios = require('axios');

/**
 * Webhook Service
 * Handles webhook delivery, retries, and management
 */
class WebhookService {
  constructor() {
    this.deliveryQueue = [];
    this.isProcessing = false;
  }

  /**
   * Register a new webhook
   */
  async registerWebhook(userId, data) {
    const {
      name,
      description,
      url,
      events,
      companyId,
      apiKeyId,
      headers = {},
      secret,
      verifySSL = true,
      retryConfig,
      eventFilters
    } = data;

    // Validate URL
    this.validateUrl(url);

    // Validate events
    this.validateEvents(events);

    // Generate secret if not provided
    const webhookSecret = secret || Webhook.generateSecret();

    const webhook = new Webhook({
      name,
      description,
      url,
      events,
      user: userId,
      company: companyId,
      apiKey: apiKeyId,
      headers,
      secret: webhookSecret,
      verifySSL,
      retryConfig: {
        maxRetries: retryConfig?.maxRetries || 5,
        initialDelay: retryConfig?.initialDelay || 1000,
        maxDelay: retryConfig?.maxDelay || 3600000,
        backoffMultiplier: retryConfig?.backoffMultiplier || 2,
        retryOnTimeout: retryConfig?.retryOnTimeout !== false,
        retryOnStatusCodes: retryConfig?.retryOnStatusCodes || [408, 409, 429, 500, 502, 503, 504]
      },
      eventFilters: eventFilters || {}
    });

    await webhook.save();

    return {
      id: webhook._id,
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      secret: webhookSecret, // Only returned on creation
      status: webhook.status,
      createdAt: webhook.createdAt
    };
  }

  /**
   * Trigger a webhook event
   */
  async triggerEvent(eventName, payload, options = {}) {
    const { filters = {}, source } = options;

    // Find all active webhooks subscribed to this event
    const webhooks = await Webhook.findForEvent(eventName, {
      ...filters,
      status: 'active'
    });

    const deliveries = [];

    for (const webhook of webhooks) {
      // Check event filters
      if (!this.matchesFilters(webhook, payload)) {
        continue;
      }

      // Create delivery record
      const delivery = await WebhookDelivery.createDelivery(webhook, eventName, {
        event: eventName,
        data: payload,
        created_at: new Date().toISOString(),
        source: source || 'api'
      });

      // Queue for delivery
      this.queueDelivery(delivery, webhook);
      deliveries.push(delivery);
    }

    return deliveries;
  }

  /**
   * Deliver webhook immediately
   */
  async deliverWebhook(delivery, webhook) {
    const attemptNumber = delivery.currentAttempt + 1;
    const startTime = Date.now();

    // Generate signature
    const { timestamp, signature } = webhook.generateSignature(delivery.payload);

    // Prepare request
    const requestConfig = {
      method: webhook.method || 'POST',
      url: webhook.url,
      headers: {
        'Content-Type': 'application/json',
        'X-TRM-Event': delivery.event,
        'X-TRM-Delivery': delivery.deliveryId,
        'X-TRM-Signature': signature,
        'X-TRM-Timestamp': timestamp.toString(),
        'X-TRM-Attempt': attemptNumber.toString(),
        'User-Agent': 'TRM-Webhook/1.0',
        ...Object.fromEntries(webhook.headers || new Map())
      },
      data: delivery.payload,
      timeout: webhook.timeout || 30000,
      validateStatus: () => true // Don't throw on error status
    };

    // SSL verification
    if (!webhook.verifySSL) {
      requestConfig.httpsAgent = new (require('https').Agent)({
        rejectUnauthorized: false
      });
    }

    try {
      // Record attempt start
      await delivery.addAttempt({
        attemptNumber,
        status: 'in_progress',
        startedAt: new Date(),
        request: {
          method: requestConfig.method,
          url: requestConfig.url,
          headers: requestConfig.headers,
          body: delivery.payload
        }
      });

      // Make request
      const response = await axios(requestConfig);
      const duration = Date.now() - startTime;

      // Check if successful
      const isSuccess = response.status >= 200 && response.status < 300;

      if (isSuccess) {
        await delivery.markSuccess({
          statusCode: response.status,
          headers: response.headers,
          body: response.data,
          size: JSON.stringify(response.data).length
        });

        await webhook.recordSuccess(duration);

        return {
          success: true,
          statusCode: response.status,
          duration
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorData = {
        message: error.message,
        code: error.code,
        type: error.name,
        statusCode: error.response?.status
      };

      // Determine if should retry
      const shouldRetry = this.shouldRetry(error, webhook, attemptNumber);

      if (shouldRetry) {
        const delay = this.calculateRetryDelay(webhook, attemptNumber);
        await delivery.scheduleRetry(delay);
        
        // Update last attempt
        if (delivery.attempts.length > 0) {
          const lastAttempt = delivery.attempts[delivery.attempts.length - 1];
          lastAttempt.willRetry = true;
          lastAttempt.nextRetryAt = new Date(Date.now() + delay);
          await delivery.save();
        }
      } else {
        await delivery.markFailed(errorData);
        await webhook.recordFailure(error, error.response?.status);
      }

      return {
        success: false,
        error: errorData,
        willRetry: shouldRetry
      };
    }
  }

  /**
   * Queue a delivery for processing
   */
  queueDelivery(delivery, webhook) {
    this.deliveryQueue.push({ delivery, webhook });
    this.processQueue();
  }

  /**
   * Process delivery queue
   */
  async processQueue() {
    if (this.isProcessing || this.deliveryQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.deliveryQueue.length > 0) {
      const { delivery, webhook } = this.deliveryQueue.shift();
      await this.deliverWebhook(delivery, webhook);
    }

    this.isProcessing = false;
  }

  /**
   * Process pending retries
   */
  async processRetries() {
    const pendingDeliveries = await WebhookDelivery.getPendingDeliveries(100);

    for (const delivery of pendingDeliveries) {
      const webhook = await Webhook.findById(delivery.webhook);
      
      if (!webhook || webhook.status !== 'active') {
        continue;
      }

      await this.deliverWebhook(delivery, webhook);
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(webhook, attemptNumber) {
    const config = webhook.retryConfig;
    const delay = config.initialDelay * Math.pow(config.backoffMultiplier, attemptNumber - 1);
    return Math.min(delay, config.maxDelay);
  }

  /**
   * Determine if delivery should be retried
   */
  shouldRetry(error, webhook, attemptNumber) {
    if (attemptNumber >= webhook.retryConfig.maxRetries) {
      return false;
    }

    // Check if timeout and should retry on timeout
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return webhook.retryConfig.retryOnTimeout;
    }

    // Check status code
    const statusCode = error.response?.status;
    if (statusCode) {
      return webhook.retryConfig.retryOnStatusCodes.includes(statusCode);
    }

    // Network errors should be retried
    const networkErrors = ['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN'];
    if (networkErrors.includes(error.code)) {
      return true;
    }

    return false;
  }

  /**
   * Check if payload matches webhook filters
   */
  matchesFilters(webhook, payload) {
    const filters = webhook.eventFilters;

    if (!filters) return true;

    // Check job filter
    if (filters.jobs?.length > 0) {
      const jobId = payload.job_id || payload.job?._id;
      if (jobId && !filters.jobs.includes(jobId)) {
        return false;
      }
    }

    // Check company filter
    if (filters.companies?.length > 0) {
      const companyId = payload.company_id || payload.company?._id;
      if (companyId && !filters.companies.includes(companyId)) {
        return false;
      }
    }

    // Check status filter
    if (filters.statuses?.length > 0) {
      const status = payload.status;
      if (status && !filters.statuses.includes(status)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate webhook URL
   */
  validateUrl(url) {
    try {
      const parsed = new URL(url);
      
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('URL must use HTTP or HTTPS protocol');
      }

      // Block localhost and private IPs in production
      if (process.env.NODE_ENV === 'production') {
        const hostname = parsed.hostname;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          throw new Error('Localhost URLs are not allowed in production');
        }

        // Check for private IP ranges
        const privateRanges = [
          /^10\./,
          /^172\.(1[6-9]|2[0-9]|3[01])\./,
          /^192\.168\./,
          /^127\./
        ];

        if (privateRanges.some(range => range.test(hostname))) {
          throw new Error('Private IP addresses are not allowed in production');
        }
      }

      return true;
    } catch (error) {
      throw new Error(`Invalid webhook URL: ${error.message}`);
    }
  }

  /**
   * Validate event names
   */
  validateEvents(events) {
    const validEvents = [
      'referral.created', 'referral.updated', 'referral.status_changed',
      'referral.submitted', 'referral.screened', 'referral.interview_scheduled',
      'referral.interview_completed', 'referral.offered', 'referral.hired', 'referral.rejected',
      'job.published', 'job.updated', 'job.closed', 'job.expired', 'job.featured',
      'company.updated', 'company.verified',
      'user.verified', 'user.profile_updated',
      'payout.requested', 'payout.approved', 'payout.completed', 'payout.failed',
      'application.received', 'application.status_changed',
      'network.member_joined', 'network.referral_made',
      'system.test', 'system.maintenance', 'system.rate_limit_warning'
    ];

    const invalid = events.filter(e => !validEvents.includes(e) && e !== '*');
    if (invalid.length > 0) {
      throw new Error(`Invalid events: ${invalid.join(', ')}`);
    }

    return true;
  }

  /**
   * Get webhooks for user
   */
  async getUserWebhooks(userId, options = {}) {
    const query = { user: userId };
    
    if (options.status) {
      query.status = options.status;
    }

    if (options.companyId) {
      query.company = options.companyId;
    }

    const webhooks = await Webhook.find(query)
      .populate('company', 'name')
      .sort({ createdAt: -1 });

    return webhooks.map(w => ({
      id: w._id,
      name: w.name,
      url: w.url,
      events: w.events,
      status: w.status,
      health: w.health,
      successRate: w.successRate,
      company: w.company,
      createdAt: w.createdAt,
      lastDeliveryAt: w.health.lastDeliveryAt
    }));
  }

  /**
   * Get webhook deliveries
   */
  async getDeliveries(webhookId, options = {}) {
    const query = { webhook: webhookId };

    if (options.status) {
      query.status = options.status;
    }

    if (options.event) {
      query.event = options.event;
    }

    const deliveries = await WebhookDelivery.find(query)
      .sort({ createdAt: -1 })
      .limit(options.limit || 50)
      .skip(options.skip || 0);

    return deliveries;
  }

  /**
   * Send test event
   */
  async sendTestEvent(webhookId, userId) {
    const webhook = await Webhook.findOne({ _id: webhookId, user: userId });
    
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    const testPayload = {
      event: 'system.test',
      data: {
        message: 'This is a test event',
        timestamp: new Date().toISOString()
      }
    };

    const delivery = await WebhookDelivery.createDelivery(webhook, 'system.test', testPayload);
    const result = await this.deliverWebhook(delivery, webhook);

    return {
      deliveryId: delivery.deliveryId,
      success: result.success,
      statusCode: result.statusCode,
      duration: result.duration
    };
  }
}

module.exports = new WebhookService();
