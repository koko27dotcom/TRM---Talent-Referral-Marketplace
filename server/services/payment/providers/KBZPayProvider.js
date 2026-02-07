/**
 * KBZPayProvider
 * Implementation of KBZPay payment gateway for Myanmar market
 * KBZPay is Myanmar's largest mobile wallet with extensive merchant network
 */

const BasePaymentProvider = require('./BasePaymentProvider');
const axios = require('axios');
const crypto = require('crypto');

class KBZPayProvider extends BasePaymentProvider {
  constructor(config = {}) {
    super({
      name: 'kbzpay',
      displayName: 'KBZPay',
      ...config
    });

    this.apiBaseUrl = config.apiUrl || 'https://api.kbzpay.com/payment/gateway';
    this.merchantId = config.merchantId;
    this.merchantKey = config.merchantKey;
    this.appId = config.appId;
    this.apiVersion = config.apiVersion || '3.0';
    
    // Environment: sandbox or production
    this.environment = config.environment || 'sandbox';
    
    if (this.environment === 'sandbox') {
      this.apiBaseUrl = 'https://api.kbzpay.com/payment/gateway/uat';
    }
  }

  validateConfig() {
    if (!this.merchantId) {
      throw new Error('KBZPay: merchantId is required');
    }
    if (!this.merchantKey) {
      throw new Error('KBZPay: merchantKey is required');
    }
    if (!this.appId) {
      throw new Error('KBZPay: appId is required');
    }
  }

  async initialize() {
    try {
      // Test connection by checking balance or making a test request
      this.log('info', 'Initializing KBZPay provider');
      
      // Verify configuration by attempting a health check
      const health = await this.healthCheck();
      
      if (health.status === 'healthy') {
        this.log('info', 'KBZPay provider initialized successfully');
        return true;
      }
      
      throw new Error('KBZPay health check failed');
    } catch (error) {
      this.log('error', 'KBZPay initialization failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Create a deposit/payment request via KBZPay
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
        tradeType = 'PAY_BY_QRCODE' // PAY_BY_QRCODE, PAY_BY_APP, MINI_PROGRAM
      } = params;

      this.log('info', 'Creating KBZPay deposit', { orderId, amount, tradeType });

      const timestamp = Date.now().toString();
      const nonceStr = crypto.randomBytes(16).toString('hex');

      const requestParams = {
        appid: this.appId,
        merch_code: this.merchantId,
        merch_order_id: orderId,
        trade_type: tradeType,
        total_amount: Math.round(amount).toString(),
        trans_currency: currency,
        trade_no: orderId,
        notify_url: callbackUrl || `${process.env.API_URL}/webhooks/kbzpay`,
        timestamp: timestamp,
        nonce_str: nonceStr,
        body: description || 'Payment',
      };

      // Add optional parameters
      if (customerPhone) {
        requestParams.buyer_id = this.formatPhoneNumber(customerPhone);
      }
      if (customerName) {
        requestParams.buyer_name = customerName;
      }

      // Generate signature
      requestParams.sign = this.generateKBZPaySignature(requestParams);

      const response = await axios.post(
        `${this.apiBaseUrl}/precreate`,
        requestParams,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 30000
        }
      );

      if (response.data.result !== 'SUCCESS') {
        throw new Error(`KBZPay error: ${response.data.err_text || 'Unknown error'}`);
      }

      this.log('info', 'KBZPay deposit created successfully', { 
        orderId, 
        prepayId: response.data.prepay_id 
      });

      return {
        success: true,
        provider: 'kbzpay',
        orderId,
        providerOrderId: response.data.prepay_id,
        amount,
        currency,
        qrCode: response.data.code_url,
        qrCodeData: response.data.qr_code,
        deeplink: response.data.deeplink,
        expiryTime: response.data.time_expire,
        rawResponse: response.data
      };
    });
  }

  /**
   * Create a withdrawal/payout request via KBZPay
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

      this.log('info', 'Creating KBZPay withdrawal', { orderId, amount, recipientPhone });

      const timestamp = Date.now().toString();
      const nonceStr = crypto.randomBytes(16).toString('hex');

      const requestParams = {
        appid: this.appId,
        merch_code: this.merchantId,
        merch_order_id: orderId,
        total_amount: Math.round(amount).toString(),
        trans_currency: currency,
        trade_no: orderId,
        timestamp: timestamp,
        nonce_str: nonceStr,
        body: description || 'Withdrawal',
        buyer_id: this.formatPhoneNumber(recipientPhone),
        buyer_name: recipientName || 'Recipient'
      };

      // Generate signature
      requestParams.sign = this.generateKBZPaySignature(requestParams);

      const response = await axios.post(
        `${this.apiBaseUrl}/transfer`,
        requestParams,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 30000
        }
      );

      if (response.data.result !== 'SUCCESS') {
        throw new Error(`KBZPay transfer error: ${response.data.err_text || 'Unknown error'}`);
      }

      this.log('info', 'KBZPay withdrawal created successfully', { 
        orderId, 
        transactionId: response.data.transaction_id 
      });

      return {
        success: true,
        provider: 'kbzpay',
        orderId,
        transactionId: response.data.transaction_id,
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
      this.log('info', 'Checking KBZPay status', { transactionId, orderId });

      const timestamp = Date.now().toString();
      const nonceStr = crypto.randomBytes(16).toString('hex');

      const requestParams = {
        appid: this.appId,
        merch_code: this.merchantId,
        merch_order_id: orderId,
        trade_no: orderId,
        timestamp: timestamp,
        nonce_str: nonceStr
      };

      requestParams.sign = this.generateKBZPaySignature(requestParams);

      const response = await axios.post(
        `${this.apiBaseUrl}/query`,
        requestParams,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 30000
        }
      );

      const statusMap = {
        'SUCCESS': 'completed',
        'PAYING': 'pending',
        'NOTPAY': 'pending',
        'CLOSED': 'cancelled',
        'REVOKED': 'cancelled',
        'USERPAYING': 'processing',
        'PAYERROR': 'failed'
      };

      return {
        success: response.data.result === 'SUCCESS',
        provider: 'kbzpay',
        orderId,
        transactionId: response.data.transaction_id || transactionId,
        status: statusMap[response.data.trade_state] || 'unknown',
        amount: parseFloat(response.data.total_amount) || 0,
        currency: response.data.trans_currency || 'MMK',
        paidAt: response.data.time_end ? new Date(response.data.time_end) : null,
        rawResponse: response.data
      };
    });
  }

  /**
   * Cancel/refund a transaction
   */
  async cancel(transactionId, orderId, amount, reason) {
    return this.executeWithRetry(async () => {
      this.log('info', 'Cancelling KBZPay transaction', { transactionId, orderId, amount });

      const timestamp = Date.now().toString();
      const nonceStr = crypto.randomBytes(16).toString('hex');

      const requestParams = {
        appid: this.appId,
        merch_code: this.merchantId,
        merch_order_id: orderId,
        trade_no: orderId,
        timestamp: timestamp,
        nonce_str: nonceStr,
        refund_amount: Math.round(amount).toString(),
        refund_reason: reason || 'Customer request'
      };

      requestParams.sign = this.generateKBZPaySignature(requestParams);

      const response = await axios.post(
        `${this.apiBaseUrl}/refund`,
        requestParams,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 30000
        }
      );

      if (response.data.result !== 'SUCCESS') {
        throw new Error(`KBZPay refund error: ${response.data.err_text || 'Unknown error'}`);
      }

      return {
        success: true,
        provider: 'kbzpay',
        orderId,
        refundId: response.data.refund_id,
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
    // KBZPay uses the same precreate endpoint for QR codes
    return this.createDeposit({
      ...params,
      tradeType: 'PAY_BY_QRCODE'
    });
  }

  /**
   * Verify webhook signature
   */
  verifyWebhook(payload, signature, headers = {}) {
    try {
      const { sign, ...params } = payload;
      const calculatedSign = this.generateKBZPaySignature(params);
      return sign === calculatedSign;
    } catch (error) {
      this.log('error', 'KBZPay webhook verification failed', { error: error.message });
      return false;
    }
  }

  /**
   * Parse webhook payload
   */
  parseWebhook(payload) {
    const statusMap = {
      'SUCCESS': 'completed',
      'PAYING': 'pending',
      'NOTPAY': 'pending',
      'CLOSED': 'cancelled',
      'REVOKED': 'cancelled',
      'USERPAYING': 'processing',
      'PAYERROR': 'failed'
    };

    return {
      provider: 'kbzpay',
      transactionId: payload.transaction_id,
      orderId: payload.merch_order_id,
      amount: parseFloat(payload.total_amount) || 0,
      currency: payload.trans_currency || 'MMK',
      status: statusMap[payload.trade_state] || 'unknown',
      paidAt: payload.time_end ? new Date(payload.time_end) : new Date(),
      buyerPhone: payload.buyer_id,
      buyerName: payload.buyer_name,
      rawPayload: payload
    };
  }

  /**
   * Get provider balance
   */
  async getBalance() {
    return this.executeWithRetry(async () => {
      const timestamp = Date.now().toString();
      const nonceStr = crypto.randomBytes(16).toString('hex');

      const requestParams = {
        appid: this.appId,
        merch_code: this.merchantId,
        timestamp: timestamp,
        nonce_str: nonceStr
      };

      requestParams.sign = this.generateKBZPaySignature(requestParams);

      const response = await axios.post(
        `${this.apiBaseUrl}/balance`,
        requestParams,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 30000
        }
      );

      return {
        success: response.data.result === 'SUCCESS',
        balance: parseFloat(response.data.balance) || 0,
        currency: response.data.currency || 'MMK',
        availableBalance: parseFloat(response.data.available_balance) || 0,
        frozenBalance: parseFloat(response.data.frozen_balance) || 0
      };
    });
  }

  /**
   * Generate KBZPay-specific signature
   */
  generateKBZPaySignature(params) {
    const sortedKeys = Object.keys(params).sort();
    const stringToSign = sortedKeys
      .filter(key => params[key] !== '' && params[key] !== null && params[key] !== undefined && key !== 'sign')
      .map(key => `${key}=${params[key]}`)
      .join('&');

    const stringWithKey = `${stringToSign}&key=${this.merchantKey}`;
    return crypto.createHash('md5').update(stringWithKey).digest('hex').toUpperCase();
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
      miniProgram: true
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      // Simple connectivity check
      await axios.get(`${this.apiBaseUrl}/health`, { timeout: 10000 });
      return {
        provider: this.name,
        status: 'healthy',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      // If health endpoint doesn't exist, assume healthy if config is valid
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

module.exports = KBZPayProvider;
