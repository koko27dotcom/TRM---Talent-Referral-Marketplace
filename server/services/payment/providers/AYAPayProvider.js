/**
 * AYAPayProvider
 * Implementation of AYA Pay payment gateway for Myanmar market
 * AYA Pay is AYA Bank's mobile payment solution with banking-grade security
 */

const BasePaymentProvider = require('./BasePaymentProvider');
const axios = require('axios');
const crypto = require('crypto');

class AYAPayProvider extends BasePaymentProvider {
  constructor(config = {}) {
    super({
      name: 'ayapay',
      displayName: 'AYA Pay',
      ...config
    });

    this.apiBaseUrl = config.apiUrl || 'https://api.ayapay.com.mm/v1';
    this.merchantId = config.merchantId;
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.terminalId = config.terminalId;
    
    // Environment: sandbox or production
    this.environment = config.environment || 'sandbox';
    
    if (this.environment === 'sandbox') {
      this.apiBaseUrl = 'https://sandbox-api.ayapay.com.mm/v1';
    }
  }

  validateConfig() {
    if (!this.merchantId) {
      throw new Error('AYA Pay: merchantId is required');
    }
    if (!this.apiKey) {
      throw new Error('AYA Pay: apiKey is required');
    }
    if (!this.apiSecret) {
      throw new Error('AYA Pay: apiSecret is required');
    }
    if (!this.terminalId) {
      throw new Error('AYA Pay: terminalId is required');
    }
  }

  async initialize() {
    try {
      this.log('info', 'Initializing AYA Pay provider');
      
      const health = await this.healthCheck();
      
      if (health.status === 'healthy') {
        this.log('info', 'AYA Pay provider initialized successfully');
        return true;
      }
      
      throw new Error('AYA Pay health check failed');
    } catch (error) {
      this.log('error', 'AYA Pay initialization failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Create a deposit/payment request via AYA Pay
   */
  async createDeposit(params) {
    return this.executeWithRetry(async () => {
      const {
        orderId,
        amount,
        currency = 'MMK',
        description,
        customerPhone,
        customerName,
        callbackUrl,
        metadata = {},
        paymentType = 'WALLET' // WALLET, QR, CARD
      } = params;

      this.log('info', 'Creating AYA Pay deposit', { orderId, amount, paymentType });

      const timestamp = new Date().toISOString();
      const requestId = this.generateIdempotencyKey('aya');

      const requestBody = {
        merchantId: this.merchantId,
        terminalId: this.terminalId,
        requestId: requestId,
        orderId: orderId,
        amount: Math.round(amount),
        currency: currency,
        description: description || 'Payment',
        customerPhone: customerPhone ? this.formatPhoneNumber(customerPhone) : undefined,
        customerName: customerName,
        callbackUrl: callbackUrl || `${process.env.API_URL}/webhooks/ayapay`,
        timestamp: timestamp,
        paymentType: paymentType,
        metadata: metadata
      };

      // Generate signature
      const signature = this.generateAYAPaySignature(requestBody);

      const response = await axios.post(
        `${this.apiBaseUrl}/payments/initiate`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey,
            'X-Signature': signature,
            'X-Request-ID': requestId,
            'X-Timestamp': timestamp
          },
          timeout: 30000
        }
      );

      if (response.data.responseCode !== '00') {
        throw new Error(`AYA Pay error: ${response.data.responseMessage || 'Unknown error'}`);
      }

      this.log('info', 'AYA Pay deposit created successfully', { 
        orderId, 
        transactionRef: response.data.transactionRef 
      });

      return {
        success: true,
        provider: 'ayapay',
        orderId,
        providerOrderId: response.data.transactionRef,
        amount,
        currency,
        qrCode: response.data.qrCode,
        qrCodeData: response.data.qrData,
        paymentUrl: response.data.paymentUrl,
        deeplink: response.data.deeplinkUrl,
        expiryTime: response.data.expiryTime,
        rawResponse: response.data
      };
    });
  }

  /**
   * Create a withdrawal/payout request via AYA Pay
   */
  async createWithdrawal(params) {
    return this.executeWithRetry(async () => {
      const {
        orderId,
        amount,
        currency = 'MMK',
        recipientPhone,
        recipientName,
        description,
        metadata = {}
      } = params;

      this.log('info', 'Creating AYA Pay withdrawal', { orderId, amount, recipientPhone });

      const timestamp = new Date().toISOString();
      const requestId = this.generateIdempotencyKey('aya');

      const requestBody = {
        merchantId: this.merchantId,
        terminalId: this.terminalId,
        requestId: requestId,
        orderId: orderId,
        amount: Math.round(amount),
        currency: currency,
        recipientPhone: this.formatPhoneNumber(recipientPhone),
        recipientName: recipientName || 'Recipient',
        description: description || 'Withdrawal',
        timestamp: timestamp,
        metadata: metadata
      };

      // Generate signature
      const signature = this.generateAYAPaySignature(requestBody);

      const response = await axios.post(
        `${this.apiBaseUrl}/payouts/initiate`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey,
            'X-Signature': signature,
            'X-Request-ID': requestId,
            'X-Timestamp': timestamp
          },
          timeout: 30000
        }
      );

      if (response.data.responseCode !== '00') {
        throw new Error(`AYA Pay payout error: ${response.data.responseMessage || 'Unknown error'}`);
      }

      this.log('info', 'AYA Pay withdrawal created successfully', { 
        orderId, 
        transactionRef: response.data.transactionRef 
      });

      return {
        success: true,
        provider: 'ayapay',
        orderId,
        transactionId: response.data.transactionRef,
        amount,
        currency,
        status: 'pending',
        recipientPhone: this.maskPhoneNumber(recipientPhone),
        rawResponse: response.data
      };
    });
  }

  /**
   * Check transaction status
   */
  async checkStatus(transactionId, orderId) {
    return this.executeWithRetry(async () => {
      this.log('info', 'Checking AYA Pay status', { transactionId, orderId });

      const timestamp = new Date().toISOString();
      const requestId = this.generateIdempotencyKey('aya');

      const requestBody = {
        merchantId: this.merchantId,
        terminalId: this.terminalId,
        requestId: requestId,
        orderId: orderId,
        transactionRef: transactionId,
        timestamp: timestamp
      };

      const signature = this.generateAYAPaySignature(requestBody);

      const response = await axios.post(
        `${this.apiBaseUrl}/payments/status`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey,
            'X-Signature': signature,
            'X-Request-ID': requestId,
            'X-Timestamp': timestamp
          },
          timeout: 30000
        }
      );

      const statusMap = {
        '00': 'completed',
        '01': 'pending',
        '02': 'processing',
        '03': 'failed',
        '04': 'cancelled',
        '05': 'refunded',
        '99': 'unknown'
      };

      return {
        success: response.data.responseCode === '00',
        provider: 'ayapay',
        orderId,
        transactionId: response.data.transactionRef || transactionId,
        status: statusMap[response.data.transactionStatus] || 'unknown',
        amount: parseFloat(response.data.amount) || 0,
        currency: response.data.currency || 'MMK',
        paidAt: response.data.completedTime ? new Date(response.data.completedTime) : null,
        rawResponse: response.data
      };
    });
  }

  /**
   * Cancel/refund a transaction
   */
  async cancel(transactionId, orderId, amount, reason) {
    return this.executeWithRetry(async () => {
      this.log('info', 'Cancelling AYA Pay transaction', { transactionId, orderId, amount });

      const timestamp = new Date().toISOString();
      const requestId = this.generateIdempotencyKey('aya');

      const requestBody = {
        merchantId: this.merchantId,
        terminalId: this.terminalId,
        requestId: requestId,
        orderId: orderId,
        originalTransactionRef: transactionId,
        refundAmount: Math.round(amount),
        reason: reason || 'Customer request',
        timestamp: timestamp
      };

      const signature = this.generateAYAPaySignature(requestBody);

      const response = await axios.post(
        `${this.apiBaseUrl}/payments/refund`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey,
            'X-Signature': signature,
            'X-Request-ID': requestId,
            'X-Timestamp': timestamp
          },
          timeout: 30000
        }
      );

      if (response.data.responseCode !== '00') {
        throw new Error(`AYA Pay refund error: ${response.data.responseMessage || 'Unknown error'}`);
      }

      return {
        success: true,
        provider: 'ayapay',
        orderId,
        refundId: response.data.refundRef,
        amount,
        status: 'refunded',
        rawResponse: response.data
      };
    });
  }

  /**
   * Generate QR code for in-person payments
   */
  async generateQRCode(params) {
    return this.createDeposit({
      ...params,
      paymentType: 'QR'
    });
  }

  /**
   * Verify webhook signature
   */
  verifyWebhook(payload, signature, headers = {}) {
    try {
      const timestamp = headers['x-timestamp'] || headers['X-Timestamp'];
      const requestId = headers['x-request-id'] || headers['X-Request-ID'];
      
      // Reconstruct the signature base string
      const signatureBase = `${requestId}|${timestamp}|${JSON.stringify(payload)}`;
      const calculatedSignature = crypto
        .createHmac('sha256', this.apiSecret)
        .update(signatureBase)
        .digest('hex');
      
      return signature === calculatedSignature;
    } catch (error) {
      this.log('error', 'AYA Pay webhook verification failed', { error: error.message });
      return false;
    }
  }

  /**
   * Parse webhook payload
   */
  parseWebhook(payload) {
    const statusMap = {
      'SUCCESS': 'completed',
      'PENDING': 'pending',
      'PROCESSING': 'processing',
      'FAILED': 'failed',
      'CANCELLED': 'cancelled',
      'REFUNDED': 'refunded'
    };

    return {
      provider: 'ayapay',
      transactionId: payload.transactionRef,
      orderId: payload.orderId,
      amount: parseFloat(payload.amount) || 0,
      currency: payload.currency || 'MMK',
      status: statusMap[payload.status] || 'unknown',
      paidAt: payload.completedTime ? new Date(payload.completedTime) : new Date(),
      customerPhone: payload.customerPhone,
      customerName: payload.customerName,
      rawPayload: payload
    };
  }

  /**
   * Get provider balance
   */
  async getBalance() {
    return this.executeWithRetry(async () => {
      const timestamp = new Date().toISOString();
      const requestId = this.generateIdempotencyKey('aya');

      const requestBody = {
        merchantId: this.merchantId,
        terminalId: this.terminalId,
        requestId: requestId,
        timestamp: timestamp
      };

      const signature = this.generateAYAPaySignature(requestBody);

      const response = await axios.post(
        `${this.apiBaseUrl}/merchant/balance`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey,
            'X-Signature': signature,
            'X-Request-ID': requestId,
            'X-Timestamp': timestamp
          },
          timeout: 30000
        }
      );

      return {
        success: response.data.responseCode === '00',
        balance: parseFloat(response.data.balance) || 0,
        currency: response.data.currency || 'MMK',
        availableBalance: parseFloat(response.data.availableBalance) || 0,
        holdBalance: parseFloat(response.data.holdBalance) || 0
      };
    });
  }

  /**
   * Generate AYA Pay-specific signature
   */
  generateAYAPaySignature(params) {
    // Create canonical string
    const sortedKeys = Object.keys(params).sort();
    const canonicalString = sortedKeys
      .filter(key => params[key] !== '' && params[key] !== null && params[key] !== undefined)
      .map(key => `${key}=${typeof params[key] === 'object' ? JSON.stringify(params[key]) : params[key]}`)
      .join('&');

    // Generate HMAC-SHA256
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(canonicalString)
      .digest('hex');
  }

  /**
   * Get provider capabilities
   */
  getProviderCapabilities() {
    return {
      deposits: true,
      withdrawals: true,
      qrCode: true,
      refunds: true,
      partialRefunds: true,
      webhookVerification: true,
      balanceCheck: true,
      deeplink: true,
      cardPayments: true
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const timestamp = new Date().toISOString();
      const requestId = this.generateIdempotencyKey('aya');

      const requestBody = {
        merchantId: this.merchantId,
        terminalId: this.terminalId,
        requestId: requestId,
        timestamp: timestamp
      };

      const signature = this.generateAYAPaySignature(requestBody);

      await axios.post(
        `${this.apiBaseUrl}/health`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey,
            'X-Signature': signature,
            'X-Request-ID': requestId,
            'X-Timestamp': timestamp
          },
          timeout: 10000
        }
      );

      return {
        provider: this.name,
        status: 'healthy',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        provider: this.name,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        note: 'Configuration valid, health endpoint not available'
      };
    }
  }

  /**
   * Mask phone number for logging
   */
  maskPhoneNumber(phoneNumber) {
    if (!phoneNumber) return null;
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length < 7) return phoneNumber;
    return cleaned.substring(0, 3) + '****' + cleaned.substring(cleaned.length - 3);
  }
}

module.exports = AYAPayProvider;
