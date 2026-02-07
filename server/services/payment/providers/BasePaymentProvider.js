/**
 * BasePaymentProvider
 * Abstract base class for all payment providers in the Myanmar market
 * Defines the contract that all payment providers must implement
 */

class BasePaymentProvider {
  constructor(config = {}) {
    this.name = config.name || 'base';
    this.displayName = config.displayName || 'Base Provider';
    this.config = config;
    this.isEnabled = config.enabled !== false;
    
    // Retry configuration
    this.retryConfig = {
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      retryMultiplier: config.retryMultiplier || 2,
      ...config.retryConfig
    };

    // Rate limiting
    this.rateLimitConfig = {
      requestsPerSecond: config.requestsPerSecond || 10,
      requestsPerMinute: config.requestsPerMinute || 100,
      ...config.rateLimitConfig
    };

    // Validate configuration
    this.validateConfig();
  }

  /**
   * Validate provider configuration
   * @throws {Error} If configuration is invalid
   */
  validateConfig() {
    throw new Error('validateConfig() must be implemented by subclass');
  }

  /**
   * Initialize the provider
   * @returns {Promise<boolean>} Initialization success
   */
  async initialize() {
    throw new Error('initialize() must be implemented by subclass');
  }

  /**
   * Create a deposit/payment request
   * @param {Object} params - Deposit parameters
   * @param {string} params.orderId - Unique order ID
   * @param {number} params.amount - Amount to deposit
   * @param {string} params.currency - Currency code (default: MMK)
   * @param {string} params.description - Payment description
   * @param {string} params.customerPhone - Customer phone number
   * @param {string} params.customerName - Customer name
   * @param {string} params.callbackUrl - Webhook callback URL
   * @param {Object} params.metadata - Additional metadata
   * @returns {Promise<Object>} Payment request result
   */
  async createDeposit(params) {
    throw new Error('createDeposit() must be implemented by subclass');
  }

  /**
   * Create a withdrawal/payout request
   * @param {Object} params - Withdrawal parameters
   * @param {string} params.orderId - Unique order ID
   * @param {number} params.amount - Amount to withdraw
   * @param {string} params.currency - Currency code (default: MMK)
   * @param {string} params.recipientPhone - Recipient phone number
   * @param {string} params.recipientName - Recipient name
   * @param {string} params.description - Withdrawal description
   * @param {Object} params.metadata - Additional metadata
   * @returns {Promise<Object>} Withdrawal request result
   */
  async createWithdrawal(params) {
    throw new Error('createWithdrawal() must be implemented by subclass');
  }

  /**
   * Check payment/transaction status
   * @param {string} transactionId - Provider transaction ID
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Transaction status
   */
  async checkStatus(transactionId, orderId) {
    throw new Error('checkStatus() must be implemented by subclass');
  }

  /**
   * Cancel/refund a transaction
   * @param {string} transactionId - Provider transaction ID
   * @param {string} orderId - Order ID
   * @param {number} amount - Amount to refund (partial refund support)
   * @param {string} reason - Refund reason
   * @returns {Promise<Object>} Refund result
   */
  async cancel(transactionId, orderId, amount, reason) {
    throw new Error('cancel() must be implemented by subclass');
  }

  /**
   * Generate QR code for in-person payments
   * @param {Object} params - QR code parameters
   * @param {number} params.amount - Amount
   * @param {string} params.orderId - Order ID
   * @param {string} params.description - Description
   * @returns {Promise<Object>} QR code data
   */
  async generateQRCode(params) {
    throw new Error('generateQRCode() must be implemented by subclass');
  }

  /**
   * Verify webhook signature
   * @param {Object} payload - Webhook payload
   * @param {string} signature - Signature from headers
   * @param {Object} headers - All request headers
   * @returns {boolean} Verification result
   */
  verifyWebhook(payload, signature, headers = {}) {
    throw new Error('verifyWebhook() must be implemented by subclass');
  }

  /**
   * Parse webhook payload
   * @param {Object} payload - Raw webhook payload
   * @returns {Object} Normalized webhook data
   */
  parseWebhook(payload) {
    throw new Error('parseWebhook() must be implemented by subclass');
  }

  /**
   * Get provider balance
   * @returns {Promise<Object>} Balance information
   */
  async getBalance() {
    throw new Error('getBalance() must be implemented by subclass');
  }

  /**
   * Validate phone number format for this provider
   * @param {string} phoneNumber - Phone number to validate
   * @returns {boolean} Validation result
   */
  validatePhoneNumber(phoneNumber) {
    // Myanmar phone number validation
    const myanmarPhoneRegex = /^(09|959|\+959)[0-9]{7,9}$/;
    return myanmarPhoneRegex.test(phoneNumber);
  }

  /**
   * Format phone number to provider-specific format
   * @param {string} phoneNumber - Raw phone number
   * @returns {string} Formatted phone number
   */
  formatPhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Handle Myanmar numbers
    if (cleaned.startsWith('959')) {
      return cleaned;
    } else if (cleaned.startsWith('09')) {
      return '95' + cleaned.substring(1);
    } else if (cleaned.startsWith('+959')) {
      return cleaned.substring(1);
    }
    
    return cleaned;
  }

  /**
   * Generate idempotency key
   * @param {string} prefix - Key prefix
   * @returns {string} Unique idempotency key
   */
  generateIdempotencyKey(prefix = '') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 11);
    return `${prefix}${prefix ? '_' : ''}${timestamp}_${random}`;
  }

  /**
   * Generate signature for API requests
   * @param {Object} params - Parameters to sign
   * @param {string} secret - Secret key
   * @param {string} algorithm - Hash algorithm (default: sha256)
   * @returns {string} Generated signature
   */
  generateSignature(params, secret, algorithm = 'sha256') {
    const crypto = require('crypto');
    
    // Sort keys alphabetically
    const sortedKeys = Object.keys(params).sort();
    
    // Build string to sign
    const stringToSign = sortedKeys
      .filter(key => params[key] !== '' && params[key] !== null && params[key] !== undefined && key !== 'sign')
      .map(key => `${key}=${params[key]}`)
      .join('&');

    // Add secret
    const stringWithSecret = `${stringToSign}&key=${secret}`;

    // Generate hash
    const hash = crypto.createHash(algorithm).update(stringWithSecret).digest('hex');
    
    return algorithm === 'md5' ? hash.toUpperCase() : hash;
  }

  /**
   * Execute with retry logic
   * @param {Function} operation - Async operation to execute
   * @param {Object} options - Retry options
   * @returns {Promise<any>} Operation result
   */
  async executeWithRetry(operation, options = {}) {
    const maxRetries = options.maxRetries || this.retryConfig.maxRetries;
    const retryDelay = options.retryDelay || this.retryConfig.retryDelay;
    const retryMultiplier = options.retryMultiplier || this.retryConfig.retryMultiplier;
    
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          throw error;
        }
        
        if (attempt < maxRetries) {
          const delay = retryDelay * Math.pow(retryMultiplier, attempt - 1);
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Check if error is non-retryable
   * @param {Error} error - Error to check
   * @returns {boolean} True if error should not be retried
   */
  isNonRetryableError(error) {
    const nonRetryableCodes = [
      'INVALID_AMOUNT',
      'INVALID_PHONE',
      'INSUFFICIENT_BALANCE',
      'ACCOUNT_BLOCKED',
      'INVALID_CREDENTIALS',
      'UNAUTHORIZED',
      'FORBIDDEN'
    ];
    
    return nonRetryableCodes.some(code => 
      error.message?.includes(code) || 
      error.code === code
    );
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log transaction for audit trail
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  log(level, message, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      provider: this.name,
      level,
      message,
      ...data
    };
    
    // Use console for now, can be replaced with proper logger
    console.log(`[${logEntry.timestamp}] [${this.name.toUpperCase()}] [${level}] ${message}`, data);
    
    return logEntry;
  }

  /**
   * Get provider capabilities
   * @returns {Object} Provider capabilities
   */
  getCapabilities() {
    return {
      deposits: false,
      withdrawals: false,
      qrCode: false,
      refunds: false,
      partialRefunds: false,
      webhookVerification: false,
      balanceCheck: false,
      ...this.getProviderCapabilities()
    };
  }

  /**
   * Get provider-specific capabilities
   * Override in subclass
   * @returns {Object} Provider-specific capabilities
   */
  getProviderCapabilities() {
    return {};
  }

  /**
   * Get provider configuration (sanitized for logging)
   * @returns {Object} Sanitized configuration
   */
  getSanitizedConfig() {
    const sensitiveKeys = ['apiKey', 'secretKey', 'merchantKey', 'privateKey', 'password', 'token'];
    const sanitized = { ...this.config };
    
    sensitiveKeys.forEach(key => {
      if (sanitized[key]) {
        sanitized[key] = '***REDACTED***';
      }
    });
    
    return sanitized;
  }

  /**
   * Health check for provider
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    return {
      provider: this.name,
      status: 'unknown',
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = BasePaymentProvider;
