/**
 * PaymentGatewayService
 * Multi-provider payment processing service
 * Supports 2C2P (Myanmar), Stripe (International), KBZPay, and WavePay
 */

const Stripe = require('stripe');
const crypto = require('crypto');
const axios = require('axios');

class PaymentGatewayService {
  constructor() {
    // Initialize Stripe
    this.stripe = process.env.STRIPE_SECRET_KEY
      ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
      : null;

    // 2C2P Configuration
    this.twoC2PConfig = {
      merchantId: process.env.TWOC2P_MERCHANT_ID,
      secretKey: process.env.TWOC2P_SECRET_KEY,
      apiUrl: process.env.TWOC2P_API_URL || 'https://demo2.2c2p.com/2C2PFrontend/PaymentAction/2.0',
      version: '3.0',
    };

    // KBZPay Configuration
    this.kbzPayConfig = {
      merchantId: process.env.KBZPAY_MERCHANT_ID,
      merchantKey: process.env.KBZPAY_MERCHANT_KEY,
      appId: process.env.KBZPAY_APP_ID,
      apiUrl: process.env.KBZPAY_API_URL || 'https://api.kbzpay.com/payment/gateway',
    };

    // WavePay Configuration
    this.wavePayConfig = {
      merchantId: process.env.WAVEPAY_MERCHANT_ID,
      apiKey: process.env.WAVEPAY_API_KEY,
      apiUrl: process.env.WAVEPAY_API_URL || 'https://api.wavemoney.io/v2',
    };

    // Webhook secrets
    this.webhookSecrets = {
      stripe: process.env.STRIPE_WEBHOOK_SECRET,
      twoc2p: process.env.TWOC2P_WEBHOOK_SECRET,
      kbzpay: process.env.KBZPAY_WEBHOOK_SECRET,
      wavepay: process.env.WAVEPAY_WEBHOOK_SECRET,
    };
  }

  // ==================== STRIPE ====================

  /**
   * Create Stripe Payment Intent
   * @param {Object} data - Payment data
   * @returns {Promise<Object>} Payment intent
   */
  async createStripePaymentIntent(data) {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    const { amount, currency = 'MMK', metadata = {}, customerId } = data;

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount), // Amount in smallest currency unit
        currency: currency.toLowerCase(),
        customer: customerId,
        metadata,
        automatic_payment_methods: { enabled: true },
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
      };
    } catch (error) {
      console.error('Stripe Payment Intent Error:', error);
      throw error;
    }
  }

  /**
   * Create Stripe customer
   * @param {Object} data - Customer data
   * @returns {Promise<Object>} Stripe customer
   */
  async createStripeCustomer(data) {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    const { email, name, phone, metadata = {} } = data;

    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        phone,
        metadata,
      });

      return {
        customerId: customer.id,
        email: customer.email,
      };
    } catch (error) {
      console.error('Stripe Customer Creation Error:', error);
      throw error;
    }
  }

  /**
   * Create Stripe subscription
   * @param {Object} data - Subscription data
   * @returns {Promise<Object>} Stripe subscription
   */
  async createStripeSubscription(data) {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    const { customerId, priceId, metadata = {}, trialDays = 0 } = data;

    try {
      const subscriptionData = {
        customer: customerId,
        items: [{ price: priceId }],
        metadata,
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      };

      if (trialDays > 0) {
        subscriptionData.trial_period_days = trialDays;
      }

      const subscription = await this.stripe.subscriptions.create(subscriptionData);

      return {
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      };
    } catch (error) {
      console.error('Stripe Subscription Error:', error);
      throw error;
    }
  }

  /**
   * Handle Stripe webhook
   * @param {string} payload - Raw request body
   * @param {string} signature - Stripe signature header
   * @returns {Promise<Object>} Webhook event
   */
  async handleStripeWebhook(payload, signature) {
    if (!this.stripe || !this.webhookSecrets.stripe) {
      throw new Error('Stripe webhook not configured');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecrets.stripe
      );

      return event;
    } catch (error) {
      console.error('Stripe Webhook Error:', error);
      throw error;
    }
  }

  // ==================== 2C2P (Myanmar) ====================

  /**
   * Create 2C2P payment request
   * @param {Object} data - Payment data
   * @returns {Promise<Object>} Payment request result
   */
  async createTwoC2PPayment(data) {
    const { amount, currency = 'MMK', invoiceNo, description, customerEmail } = data;

    const paymentRequest = {
      version: this.twoC2PConfig.version,
      merchant_id: this.twoC2PConfig.merchantId,
      payment_description: description,
      order_id: invoiceNo,
      invoice_no: invoiceNo,
      currency: currency,
      amount: amount.toFixed(2),
      customer_email: customerEmail,
      result_url_1: `${process.env.FRONTEND_URL}/payment/callback`,
      result_url_2: `${process.env.API_URL}/webhooks/2c2p`,
      payment_option: 'A', // All payment options
      request_3ds: 'Y',
      hash_value: '', // Will be calculated
    };

    // Generate hash
    paymentRequest.hash_value = this.generateTwoC2PHash(paymentRequest);

    try {
      const response = await axios.post(
        `${this.twoC2PConfig.apiUrl}/token`,
        paymentRequest,
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      return {
        paymentToken: response.data.paymentToken,
        webPaymentUrl: response.data.webPaymentUrl,
        invoiceNo,
      };
    } catch (error) {
      console.error('2C2P Payment Error:', error);
      throw error;
    }
  }

  /**
   * Generate 2C2P hash
   * @param {Object} params - Payment parameters
   * @returns {string} Hash value
   */
  generateTwoC2PHash(params) {
    const stringToHash = `${params.version}${params.merchant_id}${params.payment_description}${params.order_id}${params.invoice_no}${params.currency}${params.amount}${this.twoC2PConfig.secretKey}`;
    return crypto.createHash('sha256').update(stringToHash).digest('hex');
  }

  /**
   * Verify 2C2P response
   * @param {Object} response - 2C2P response
   * @returns {boolean} Verification result
   */
  verifyTwoC2PResponse(response) {
    const { hash_value, ...params } = response;
    const calculatedHash = this.generateTwoC2PHash(params);
    return hash_value === calculatedHash;
  }

  /**
   * Handle 2C2P webhook
   * @param {Object} payload - Webhook payload
   * @returns {Promise<Object>} Parsed webhook data
   */
  async handleTwoC2PWebhook(payload) {
    if (!this.verifyTwoC2PResponse(payload)) {
      throw new Error('Invalid 2C2P webhook signature');
    }

    return {
      transactionId: payload.transaction_ref,
      invoiceNo: payload.invoice_no,
      amount: parseFloat(payload.amount),
      currency: payload.currency,
      status: payload.status === '000' ? 'success' : 'failed',
      paymentMethod: payload.payment_channel,
      paidAt: new Date(),
    };
  }

  // ==================== KBZPay ====================

  /**
   * Create KBZPay payment request
   * @param {Object} data - Payment data
   * @returns {Promise<Object>} Payment request result
   */
  async createKBZPayPayment(data) {
    const { amount, orderId, description, notifyUrl } = data;

    const timestamp = Date.now();
    const nonceStr = crypto.randomBytes(16).toString('hex');

    const params = {
      appid: this.kbzPayConfig.appId,
      merch_code: this.kbzPayConfig.merchantId,
      merch_order_id: orderId,
      trade_type: 'PAY_BY_QRCODE',
      total_amount: amount,
      trans_currency: 'MMK',
      trade_no: orderId,
      notify_url: notifyUrl || `${process.env.API_URL}/webhooks/kbzpay`,
      timestamp: timestamp.toString(),
      nonce_str: nonceStr,
      body: description,
    };

    // Generate signature
    params.sign = this.generateKBZPaySignature(params);

    try {
      const response = await axios.post(
        `${this.kbzPayConfig.apiUrl}/uat/payment/gateway/precreate`,
        params,
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      return {
        prepayId: response.data.prepay_id,
        qrCode: response.data.code_url,
        orderId,
        amount,
      };
    } catch (error) {
      console.error('KBZPay Payment Error:', error);
      throw error;
    }
  }

  /**
   * Generate KBZPay signature
   * @param {Object} params - Payment parameters
   * @returns {string} Signature
   */
  generateKBZPaySignature(params) {
    const sortedKeys = Object.keys(params).sort();
    const stringToSign = sortedKeys
      .filter(key => params[key] !== '' && key !== 'sign')
      .map(key => `${key}=${params[key]}`)
      .join('&');

    const stringWithKey = `${stringToSign}&key=${this.kbzPayConfig.merchantKey}`;
    return crypto.createHash('md5').update(stringWithKey).digest('hex').toUpperCase();
  }

  /**
   * Verify KBZPay webhook
   * @param {Object} payload - Webhook payload
   * @returns {boolean} Verification result
   */
  verifyKBZPayWebhook(payload) {
    const { sign, ...params } = payload;
    const calculatedSign = this.generateKBZPaySignature(params);
    return sign === calculatedSign;
  }

  /**
   * Handle KBZPay webhook
   * @param {Object} payload - Webhook payload
   * @returns {Promise<Object>} Parsed webhook data
   */
  async handleKBZPayWebhook(payload) {
    if (!this.verifyKBZPayWebhook(payload)) {
      throw new Error('Invalid KBZPay webhook signature');
    }

    return {
      transactionId: payload.transaction_id,
      orderId: payload.merch_order_id,
      amount: parseFloat(payload.total_amount),
      currency: 'MMK',
      status: payload.trade_state === 'SUCCESS' ? 'success' : 'failed',
      paidAt: new Date(),
    };
  }

  // ==================== WavePay ====================

  /**
   * Create WavePay payment request
   * @param {Object} data - Payment data
   * @returns {Promise<Object>} Payment request result
   */
  async createWavePayPayment(data) {
    const { amount, orderId, description, customerPhone } = data;

    const payload = {
      merchantId: this.wavePayConfig.merchantId,
      orderId,
      amount,
      currency: 'MMK',
      description,
      customerPhone,
      callbackUrl: `${process.env.API_URL}/webhooks/wavepay`,
      timestamp: Date.now(),
    };

    // Generate signature
    payload.signature = this.generateWavePaySignature(payload);

    try {
      const response = await axios.post(
        `${this.wavePayConfig.apiUrl}/payments/create`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.wavePayConfig.apiKey}`,
          },
        }
      );

      return {
        paymentId: response.data.paymentId,
        paymentUrl: response.data.paymentUrl,
        orderId,
        amount,
      };
    } catch (error) {
      console.error('WavePay Payment Error:', error);
      throw error;
    }
  }

  /**
   * Generate WavePay signature
   * @param {Object} params - Payment parameters
   * @returns {string} Signature
   */
  generateWavePaySignature(params) {
    const stringToSign = `${params.merchantId}${params.orderId}${params.amount}${params.timestamp}${this.wavePayConfig.apiKey}`;
    return crypto.createHash('sha256').update(stringToSign).digest('hex');
  }

  /**
   * Handle WavePay webhook
   * @param {Object} payload - Webhook payload
   * @returns {Promise<Object>} Parsed webhook data
   */
  async handleWavePayWebhook(payload) {
    const { signature, ...params } = payload;
    const calculatedSignature = this.generateWavePaySignature(params);

    if (signature !== calculatedSignature) {
      throw new Error('Invalid WavePay webhook signature');
    }

    return {
      transactionId: payload.transactionId,
      orderId: payload.orderId,
      amount: parseFloat(payload.amount),
      currency: 'MMK',
      status: payload.status === 'SUCCESS' ? 'success' : 'failed',
      paidAt: new Date(),
    };
  }

  // ==================== PAYMENT METHODS ====================

  /**
   * Tokenize payment method
   * @param {string} provider - Payment provider
   * @param {Object} data - Tokenization data
   * @returns {Promise<Object>} Tokenized payment method
   */
  async tokenizePaymentMethod(provider, data) {
    switch (provider) {
      case 'stripe':
        return await this.tokenizeStripePaymentMethod(data);
      case 'twoc2p':
        return await this.tokenizeTwoC2PPaymentMethod(data);
      default:
        throw new Error(`Tokenization not supported for provider: ${provider}`);
    }
  }

  /**
   * Tokenize Stripe payment method
   * @param {Object} data - Card data
   * @returns {Promise<Object>} Tokenized card
   */
  async tokenizeStripePaymentMethod(data) {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    const { number, expMonth, expYear, cvc, customerId } = data;

    try {
      const paymentMethod = await this.stripe.paymentMethods.create({
        type: 'card',
        card: {
          number,
          exp_month: expMonth,
          exp_year: expYear,
          cvc,
        },
      });

      // Attach to customer if provided
      if (customerId) {
        await this.stripe.paymentMethods.attach(paymentMethod.id, {
          customer: customerId,
        });
      }

      return {
        paymentMethodId: paymentMethod.id,
        brand: paymentMethod.card.brand,
        last4: paymentMethod.card.last4,
        expMonth: paymentMethod.card.exp_month,
        expYear: paymentMethod.card.exp_year,
      };
    } catch (error) {
      console.error('Stripe Tokenization Error:', error);
      throw error;
    }
  }

  /**
   * Tokenize 2C2P payment method
   * @param {Object} data - Card data
   * @returns {Promise<Object>} Tokenized card
   */
  async tokenizeTwoC2PPaymentMethod(data) {
    // 2C2P tokenization implementation
    // This would integrate with 2C2P's tokenization API
    throw new Error('2C2P tokenization not yet implemented');
  }

  // ==================== UNIFIED INTERFACE ====================

  /**
   * Create payment for any provider
   * @param {string} provider - Payment provider
   * @param {Object} data - Payment data
   * @returns {Promise<Object>} Payment result
   */
  async createPayment(provider, data) {
    switch (provider.toLowerCase()) {
      case 'stripe':
        return await this.createStripePaymentIntent(data);
      case '2c2p':
      case 'twoc2p':
        return await this.createTwoC2PPayment(data);
      case 'kbzpay':
        return await this.createKBZPayPayment(data);
      case 'wavepay':
        return await this.createWavePayPayment(data);
      default:
        throw new Error(`Unsupported payment provider: ${provider}`);
    }
  }

  /**
   * Handle webhook for any provider
   * @param {string} provider - Payment provider
   * @param {Object} payload - Webhook payload
   * @param {Object} headers - Request headers
   * @returns {Promise<Object>} Parsed webhook data
   */
  async handleWebhook(provider, payload, headers = {}) {
    switch (provider.toLowerCase()) {
      case 'stripe':
        return await this.handleStripeWebhook(payload, headers['stripe-signature']);
      case '2c2p':
      case 'twoc2p':
        return await this.handleTwoC2PWebhook(payload);
      case 'kbzpay':
        return await this.handleKBZPayWebhook(payload);
      case 'wavepay':
        return await this.handleWavePayWebhook(payload);
      default:
        throw new Error(`Unsupported webhook provider: ${provider}`);
    }
  }

  /**
   * Get available payment methods for a region
   * @param {string} countryCode - Country code
   * @returns {Array} Available payment methods
   */
  getAvailablePaymentMethods(countryCode = 'MM') {
    const methods = {
      MM: [
        { id: 'kbzpay', name: 'KBZPay', type: 'mobile_wallet', icon: 'kbzpay' },
        { id: 'wavepay', name: 'WavePay', type: 'mobile_wallet', icon: 'wavepay' },
        { id: '2c2p', name: 'Credit/Debit Card', type: 'card', icon: 'card' },
        { id: 'stripe', name: 'International Card', type: 'card', icon: 'card' },
      ],
      default: [
        { id: 'stripe', name: 'Credit/Debit Card', type: 'card', icon: 'card' },
      ],
    };

    return methods[countryCode] || methods.default;
  }
}

// Export singleton instance
const paymentGatewayService = new PaymentGatewayService();
module.exports = PaymentGatewayService;
