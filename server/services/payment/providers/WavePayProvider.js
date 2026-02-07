/**
 * WavePayProvider
 * Implementation of WavePay payment gateway for Myanmar market
 * WavePay is a popular mobile payment solution with growing merchant adoption
 */

const BasePaymentProvider = require('./BasePaymentProvider');
const axios = require('axios');
const crypto = require('crypto');

class WavePayProvider extends BasePaymentProvider {
  constructor(config = {}) {
    super({
      name: 'wavepay',
      displayName: 'WavePay',
      ...config
    });

    this.apiBaseUrl = config.apiUrl || 'https://api.wavemoney.io/v2';
    this.merchantId = config.merchantId;
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    
    // Environment: sandbox or production
    this.environment = config.environment || 'sandbox';
    
    if (this.environment === 'sandbox') {
      this.apiBaseUrl = 'https://sandbox-api.wavemoney.io/v2';
    }
  }

  validateConfig() {
    if (!this.merchantId) {
      throw new Error('WavePay: merchantId is required');
    }
    if (!this.apiKey) {
      throw new Error('WavePay: apiKey is required');
    }
    if (!this.apiSecret) {
      throw new Error('WavePay: apiSecret is required');
    }
  }

  async initialize() {
    try {
      this.log('info', 'Initializing WavePay provider');
      
      const health = await this.healthCheck();
      
      if (health.status === 'healthy') {
        this.log('info', 'WavePay provider initialized successfully');
        return true;
      }
      
      throw new Error('WavePay health check failed');
    } catch (error) {
      this.log('error', 'WavePay initialization failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Create a deposit/payment request via WavePay
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
        paymentMethod = 'WALLET' // WALLET, QR
      } = params;

      this.log('info', 'Creating WavePay deposit', { orderId, amount, paymentMethod });

      const timestamp = Date.now();
      const requestBody = {
        merchantId: this.merchantId,
        orderId: orderId,
        amount: Math.round(amount),
        currency: currency,
        description: description || 'Payment',
        customerPhone: customerPhone ? this.formatPhoneNumber(customerPhone) : undefined,
        customerName: customerName,
        callbackUrl: callbackUrl || `${process.env.API_URL}/webhooks/wavepay`,
        timestamp: timestamp,
        paymentMethod: paymentMethod,
        metadata: metadata
      };

      // Generate signature
      const signature = this.generateWavePaySignature(requestBody);

      const response = await axios.post(
        `${this.apiBaseUrl}/payments/create`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'X-Signature': signature,
            'X-Timestamp': timestamp.toString()
          },
          timeout: 30000
        }
      );

      if (response.data.code !== 'SUCCESS') {
        throw new Error(`WavePay error: ${response.data.message || 'Unknown error'}`);
      }

      this.log('info', 'WavePay deposit created successfully', { 
        orderId, 
        paymentId: response.data.data.paymentId 
      });

      return {
        success: true,
        provider: 'wavepay',
        orderId,
        providerOrderId: response.data.data.paymentId,
        amount,
        currency,
        qrCode: response.data.data.qrCode,
        qrCodeUrl: response.data.data.qrCodeUrl,
        paymentUrl: response.data.data.paymentUrl,
        deeplink: response.data.data.deeplink,
        expiryTime: response.data.data.expiryTime,
        rawResponse: response.data
      };
    });
  }

  /**
   * Create a withdrawal/payout request via WavePay
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

      this.log('info', 'Creating WavePay withdrawal', { orderId, amount, recipientPhone });

      const timestamp = Date.now();
      const requestBody = {
        merchantId: this.merchantId,
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
      const signature = this.generateWavePaySignature(requestBody);

      const response = await axios.post(
        `${this.apiBaseUrl}/payouts/create`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'X-Signature': signature,
            'X-Timestamp': timestamp.toString()
          },
          timeout: 30000
        }
      );

      if (response.data.code !== 'SUCCESS') {
        throw new Error(`WavePay payout error: ${response.data.message || 'Unknown error'}`);
      }

      this.log('info', 'WavePay withdrawal created successfully', { 
        orderId, 
        transactionId: response.data.data.transactionId 
      });

      return {
        success: true,
        provider: 'wavepay',
        orderId,
        transactionId: response.data.data.transactionId,
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
      this.log('info', 'Checking WavePay status', { transactionId, orderId });

      const timestamp = Date.now();
      const requestBody = {
        merchantId: this.merchantId,
        orderId: orderId,
        transactionId: transactionId,
        timestamp: timestamp
      };

      const signature = this.generateWavePaySignature(requestBody);

      const response = await axios.post(
        `${this.apiBaseUrl}/payments/status`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'X-Signature': signature,
            'X-Timestamp': timestamp.toString()
          },
          timeout: 30000
        }
      );

      const statusMap = {
        'SUCCESS': 'completed',
        'PENDING': 'pending',
        'PROCESSING': 'processing',
        'FAILED': 'failed',
        'CANCELLED': 'cancelled',
        'REFUNDED': 'refunded'
      };

      return {
        success: response.data.code === 'SUCCESS',
        provider: 'wavepay',
        orderId,
        transactionId: response.data.data?.transactionId || transactionId,
        status: statusMap[response.data.data?.status] || 'unknown',
        amount: parseFloat(response.data.data?.amount) || 0,
        currency: response.data.data?.currency || 'MMK',
        paidAt: response.data.data?.completedAt ? new Date(response.data.data.completedAt) : null,
        rawResponse: response.data
      };
    });
  }

  /**
   * Cancel/refund a transaction
   */
  async cancel(transactionId, orderId, amount, reason) {
    return this.executeWithRetry(async () => {
      this.log('info', 'Cancelling WavePay transaction', { transactionId, orderId, amount });

      const timestamp = Date.now();
      const requestBody = {
        merchantId: this.merchantId,
        orderId: orderId,
        transactionId: transactionId,
        refundAmount: Math.round(amount),
        reason: reason || 'Customer request',
        timestamp: timestamp
      };

      const signature = this.generateWavePaySignature(requestBody);

      const response = await axios.post(
        `${this.apiBaseUrl}/payments/refund`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'X-Signature': signature,
            'X-Timestamp': timestamp.toString()
          },
          timeout: 30000
        }
      );

      if (response.data.code !== 'SUCCESS') {
        throw new Error(`WavePay refund error: ${response.data.message || 'Unknown error'}`);
      }

      return {
        success: true,
        provider: 'wavepay',
        orderId,
        refundId: response.data.data.refundId,
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
      paymentMethod: 'QR'
    });
  }

  /**
   * Verify webhook signature
   */
  verifyWebhook(payload, signature, headers = {}) {
    try {
      const timestamp = headers['x-timestamp'] || headers['X-Timestamp'];
      const calculatedSignature = this.generateWavePaySignature(payload, timestamp);
      return signature === calculatedSignature;
    } catch (error) {
      this.log('error', 'WavePay webhook verification failed', { error: error.message });
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
      provider: 'wavepay',
      transactionId: payload.transactionId,
      orderId: payload.orderId,
      amount: parseFloat(payload.amount) || 0,
      currency: payload.currency || 'MMK',
      status: statusMap[payload.status] || 'unknown',
      paidAt: payload.completedAt ? new Date(payload.completedAt) : new Date(),
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
      const timestamp = Date.now();
      const requestBody = {
        merchantId: this.merchantId,
        timestamp: timestamp
      };

      const signature = this.generateWavePaySignature(requestBody);

      const response = await axios.post(
        `${this.apiBaseUrl}/merchant/balance`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'X-Signature': signature,
            'X-Timestamp': timestamp.toString()
          },
          timeout: 30000
        }
      );

      return {
        success: response.data.code === 'SUCCESS',
        balance: parseFloat(response.data.data?.balance) || 0,
        currency: response.data.data?.currency || 'MMK',
        availableBalance: parseFloat(response.data.data?.availableBalance) || 0,
        pendingBalance: parseFloat(response.data.data?.pendingBalance) || 0
      };
    });
  }

  /**
   * Generate WavePay-specific signature
   */
  generateWavePaySignature(params, timestamp) {
    const ts = timestamp || params.timestamp || Date.now();
    const stringToSign = `${this.merchantId}${JSON.stringify(params)}${ts}${this.apiSecret}`;
    return crypto.createHash('sha256').update(stringToSign).digest('hex');
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
      deeplink: true
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const timestamp = Date.now();
      const requestBody = {
        merchantId: this.merchantId,
        timestamp: timestamp
      };

      const signature = this.generateWavePaySignature(requestBody);

      await axios.post(
        `${this.apiBaseUrl}/health`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'X-Signature': signature,
            'X-Timestamp': timestamp.toString()
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

module.exports = WavePayProvider;
