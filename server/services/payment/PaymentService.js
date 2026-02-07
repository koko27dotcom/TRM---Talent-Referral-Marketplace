/**
 * PaymentService
 * Unified payment orchestrator that manages all payment providers
 * Handles deposits, withdrawals, refunds, and reconciliation
 */

const KBZPayProvider = require('./providers/KBZPayProvider');
const WavePayProvider = require('./providers/WavePayProvider');
const AYAPayProvider = require('./providers/AYAPayProvider');
const MMQRService = require('./MMQRService');
const PaymentTransaction = require('../../models/PaymentTransaction');
const PaymentMethod = require('../../models/PaymentMethod');
const { TRANSACTION_STATUS, TRANSACTION_TYPE, PAYMENT_PROVIDER } = require('../../models/PaymentTransaction');

class PaymentService {
  constructor(config = {}) {
    this.config = config;
    this.providers = new Map();
    this.mqrService = new MMQRService(config.mqr);
    
    // Initialize providers
    this.initializeProviders();
  }

  /**
   * Initialize all payment providers
   */
  initializeProviders() {
    // KBZPay
    if (process.env.KBZPAY_ENABLED !== 'false') {
      try {
        const kbzPayConfig = {
          merchantId: process.env.KBZPAY_MERCHANT_ID,
          merchantKey: process.env.KBZPAY_MERCHANT_KEY,
          appId: process.env.KBZPAY_APP_ID,
          apiUrl: process.env.KBZPAY_API_URL,
          environment: process.env.KBZPAY_ENVIRONMENT || 'sandbox',
          enabled: true
        };
        
        const kbzPay = new KBZPayProvider(kbzPayConfig);
        this.providers.set('kbzpay', kbzPay);
        console.log('✓ KBZPay provider initialized');
      } catch (error) {
        console.error('✗ KBZPay initialization failed:', error.message);
      }
    }

    // WavePay
    if (process.env.WAVEPAY_ENABLED !== 'false') {
      try {
        const wavePayConfig = {
          merchantId: process.env.WAVEPAY_MERCHANT_ID,
          apiKey: process.env.WAVEPAY_API_KEY,
          apiSecret: process.env.WAVEPAY_API_SECRET,
          apiUrl: process.env.WAVEPAY_API_URL,
          environment: process.env.WAVEPAY_ENVIRONMENT || 'sandbox',
          enabled: true
        };
        
        const wavePay = new WavePayProvider(wavePayConfig);
        this.providers.set('wavepay', wavePay);
        console.log('✓ WavePay provider initialized');
      } catch (error) {
        console.error('✗ WavePay initialization failed:', error.message);
      }
    }

    // AYA Pay
    if (process.env.AYAPAY_ENABLED !== 'false') {
      try {
        const ayaPayConfig = {
          merchantId: process.env.AYAPAY_MERCHANT_ID,
          apiKey: process.env.AYAPAY_API_KEY,
          apiSecret: process.env.AYAPAY_API_SECRET,
          terminalId: process.env.AYAPAY_TERMINAL_ID,
          apiUrl: process.env.AYAPAY_API_URL,
          environment: process.env.AYAPAY_ENVIRONMENT || 'sandbox',
          enabled: true
        };
        
        const ayaPay = new AYAPayProvider(ayaPayConfig);
        this.providers.set('ayapay', ayaPay);
        console.log('✓ AYA Pay provider initialized');
      } catch (error) {
        console.error('✗ AYA Pay initialization failed:', error.message);
      }
    }

    console.log(`✓ PaymentService initialized with ${this.providers.size} providers`);
  }

  /**
   * Get provider instance
   */
  getProvider(providerName) {
    const provider = this.providers.get(providerName.toLowerCase());
    if (!provider) {
      throw new Error(`Payment provider '${providerName}' not found or not enabled`);
    }
    return provider;
  }

  /**
   * Get all available providers
   */
  getAvailableProviders() {
    const available = [];
    this.providers.forEach((provider, name) => {
      available.push({
        name,
        displayName: provider.displayName,
        capabilities: provider.getCapabilities()
      });
    });
    return available;
  }

  /**
   * Create a deposit transaction
   */
  async createDeposit(params) {
    const {
      userId,
      amount,
      currency = 'MMK',
      provider: providerName,
      paymentMethodId,
      description,
      metadata = {},
      callbackUrl,
      successUrl,
      failureUrl,
      idempotencyKey
    } = params;

    // Validate amount
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }

    // Check idempotency
    if (idempotencyKey) {
      const existingTransaction = await PaymentTransaction.findOne({ idempotencyKey });
      if (existingTransaction) {
        return {
          success: true,
          transaction: existingTransaction,
          isDuplicate: true
        };
      }
    }

    // Get provider
    const provider = this.getProvider(providerName);

    // Generate order ID
    const orderId = `DEP${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Create transaction record
    const transaction = new PaymentTransaction({
      transactionNumber: PaymentTransaction.generateTransactionNumber(),
      orderId,
      type: TRANSACTION_TYPE.DEPOSIT,
      status: TRANSACTION_STATUS.PENDING,
      amount,
      currency,
      provider: providerName.toLowerCase(),
      userId,
      description: description || 'Deposit',
      metadata,
      callbackUrl,
      successUrl,
      failureUrl,
      idempotencyKey,
      initiatedAt: new Date()
    });

    await transaction.save();

    try {
      // Call provider
      const startTime = Date.now();
      const result = await provider.createDeposit({
        orderId,
        amount,
        currency,
        description: description || 'Deposit',
        callbackUrl: callbackUrl || `${process.env.API_URL}/webhooks/${providerName.toLowerCase()}`,
        metadata: {
          transactionId: transaction._id.toString(),
          userId: userId.toString(),
          ...metadata
        }
      });

      // Update transaction with provider response
      transaction.providerOrderId = result.providerOrderId;
      transaction.status = TRANSACTION_STATUS.INITIATED;
      
      if (result.qrCode) {
        transaction.qrCode = {
          data: result.qrCode,
          imageUrl: result.qrCode,
          expiryTime: result.expiryTime ? new Date(result.expiryTime) : null
        };
      }

      await transaction.addProviderResponse(
        { orderId, amount, currency },
        result.rawResponse,
        Date.now() - startTime,
        200
      );

      await transaction.save();

      return {
        success: true,
        transaction,
        paymentData: {
          qrCode: result.qrCode,
          qrImage: result.qrCode,
          paymentUrl: result.paymentUrl,
          deeplink: result.deeplink,
          orderId,
          expiryTime: result.expiryTime
        }
      };
    } catch (error) {
      // Update transaction as failed
      transaction.status = TRANSACTION_STATUS.FAILED;
      transaction.errorMessage = error.message;
      transaction.errorCode = error.code;
      transaction.failedAt = new Date();
      await transaction.save();

      throw error;
    }
  }

  /**
   * Create a withdrawal transaction
   */
  async createWithdrawal(params) {
    const {
      userId,
      amount,
      currency = 'MMK',
      provider: providerName,
      paymentMethodId,
      recipientPhone,
      recipientName,
      description,
      metadata = {},
      idempotencyKey
    } = params;

    // Validate amount
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }

    // Check idempotency
    if (idempotencyKey) {
      const existingTransaction = await PaymentTransaction.findOne({ idempotencyKey });
      if (existingTransaction) {
        return {
          success: true,
          transaction: existingTransaction,
          isDuplicate: true
        };
      }
    }

    // Get payment method if provided
    let paymentMethod = null;
    if (paymentMethodId) {
      paymentMethod = await PaymentMethod.findOne({
        methodId: paymentMethodId,
        userId,
        status: 'verified'
      });
      
      if (!paymentMethod) {
        throw new Error('Payment method not found or not verified');
      }
    }

    // Get provider
    const provider = this.getProvider(providerName);

    // Generate order ID
    const orderId = `WDR${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Create transaction record
    const transaction = new PaymentTransaction({
      transactionNumber: PaymentTransaction.generateTransactionNumber(),
      orderId,
      type: TRANSACTION_TYPE.WITHDRAWAL,
      status: TRANSACTION_STATUS.PENDING,
      amount,
      currency,
      provider: providerName.toLowerCase(),
      userId,
      recipientInfo: {
        phone: recipientPhone || paymentMethod?.mobileWallet?.phoneNumber,
        name: recipientName || paymentMethod?.mobileWallet?.accountName
      },
      description: description || 'Withdrawal',
      metadata,
      idempotencyKey,
      initiatedAt: new Date()
    });

    await transaction.save();

    try {
      // Call provider
      const startTime = Date.now();
      const result = await provider.createWithdrawal({
        orderId,
        amount,
        currency,
        recipientPhone: recipientPhone || paymentMethod?.mobileWallet?.phoneNumber,
        recipientName: recipientName || paymentMethod?.mobileWallet?.accountName,
        description: description || 'Withdrawal',
        metadata: {
          transactionId: transaction._id.toString(),
          userId: userId.toString(),
          ...metadata
        }
      });

      // Update transaction
      transaction.providerOrderId = result.providerOrderId;
      transaction.providerTransactionId = result.transactionId;
      transaction.status = TRANSACTION_STATUS.PROCESSING;
      transaction.recipientInfo.phone = result.recipientPhone || transaction.recipientInfo.phone;

      await transaction.addProviderResponse(
        { orderId, amount, currency },
        result.rawResponse,
        Date.now() - startTime,
        200
      );

      await transaction.save();

      // Update payment method usage
      if (paymentMethod) {
        await paymentMethod.recordUsage(amount, 'withdrawal');
      }

      return {
        success: true,
        transaction,
        withdrawalData: {
          transactionId: result.transactionId,
          orderId,
          status: 'processing',
          estimatedCompletion: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        }
      };
    } catch (error) {
      // Update transaction as failed
      transaction.status = TRANSACTION_STATUS.FAILED;
      transaction.errorMessage = error.message;
      transaction.errorCode = error.code;
      transaction.failedAt = new Date();
      await transaction.save();

      throw error;
    }
  }

  /**
   * Check transaction status
   */
  async checkStatus(transactionId) {
    const transaction = await PaymentTransaction.findById(transactionId);
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // If already in terminal state, return cached status
    if (['completed', 'failed', 'cancelled', 'refunded'].includes(transaction.status)) {
      return {
        success: true,
        transaction,
        isFinal: true
      };
    }

    // Get provider and check status
    const provider = this.getProvider(transaction.provider);
    
    try {
      const result = await provider.checkStatus(
        transaction.providerTransactionId,
        transaction.orderId
      );

      // Update transaction if status changed
      if (result.status !== transaction.status) {
        await transaction.updateStatus(result.status, {
          errorMessage: result.status === 'failed' ? result.rawResponse?.message : null
        });

        if (result.status === 'completed') {
          transaction.completedAt = result.paidAt || new Date();
          await transaction.save();
        }
      }

      return {
        success: true,
        transaction,
        providerStatus: result
      };
    } catch (error) {
      console.error('Status check error:', error);
      return {
        success: false,
        transaction,
        error: error.message
      };
    }
  }

  /**
   * Process refund
   */
  async processRefund(transactionId, amount, reason, processedBy = null) {
    const transaction = await PaymentTransaction.findById(transactionId);
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.type !== TRANSACTION_TYPE.DEPOSIT) {
      throw new Error('Only deposits can be refunded');
    }

    if (transaction.status !== TRANSACTION_STATUS.COMPLETED) {
      throw new Error('Only completed transactions can be refunded');
    }

    const remainingRefundable = transaction.amount - transaction.refundedAmount;
    if (amount > remainingRefundable) {
      throw new Error(`Maximum refundable amount is ${remainingRefundable}`);
    }

    // Get provider
    const provider = this.getProvider(transaction.provider);

    try {
      const result = await provider.cancel(
        transaction.providerTransactionId,
        transaction.orderId,
        amount,
        reason
      );

      // Add refund record
      await transaction.addRefund({
        refundId: result.refundId || `REF${Date.now()}`,
        amount,
        reason,
        status: result.status === 'refunded' ? 'completed' : 'pending',
        processedAt: new Date(),
        processedBy,
        providerRefundId: result.refundId
      });

      return {
        success: true,
        transaction,
        refund: result
      };
    } catch (error) {
      console.error('Refund error:', error);
      throw error;
    }
  }

  /**
   * Generate QR code for payment
   */
  async generateQRCode(params) {
    const { amount, currency = 'MMK', orderId, description, provider: providerName } = params;

    if (providerName && providerName !== 'unified') {
      // Provider-specific QR
      const provider = this.getProvider(providerName);
      return provider.generateQRCode({
        amount,
        currency,
        orderId,
        description
      });
    }

    // Unified MMQR
    return this.mqrService.generateUnifiedQRCode({
      amount,
      currency,
      orderId,
      description
    });
  }

  /**
   * Handle webhook from provider
   */
  async handleWebhook(providerName, payload, headers) {
    const provider = this.getProvider(providerName);

    // Verify webhook signature
    const signature = headers['x-signature'] || headers['signature'] || payload.sign;
    
    if (!provider.verifyWebhook(payload, signature, headers)) {
      throw new Error('Invalid webhook signature');
    }

    // Parse webhook data
    const webhookData = provider.parseWebhook(payload);

    // Find transaction
    const transaction = await PaymentTransaction.findOne({
      orderId: webhookData.orderId
    });

    if (!transaction) {
      console.warn(`Transaction not found for webhook: ${webhookData.orderId}`);
      return { success: false, error: 'Transaction not found' };
    }

    // Update transaction status
    if (webhookData.status !== transaction.status) {
      await transaction.updateStatus(webhookData.status);

      if (webhookData.status === 'completed') {
        transaction.completedAt = webhookData.paidAt;
        transaction.providerTransactionId = webhookData.transactionId;
        await transaction.save();
      }
    }

    return {
      success: true,
      transaction,
      webhookData
    };
  }

  /**
   * Get transaction statistics
   */
  async getStatistics(options = {}) {
    return PaymentTransaction.getStatistics(options);
  }

  /**
   * Reconcile pending transactions
   */
  async reconcileTransactions(options = {}) {
    const pendingTransactions = await PaymentTransaction.findPendingForReconciliation({
      before: options.before || new Date(Date.now() - 5 * 60 * 1000) // 5 minutes old
    });

    const results = {
      checked: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    for (const transaction of pendingTransactions) {
      results.checked++;
      
      try {
        const result = await this.checkStatus(transaction._id);
        
        if (result.success && result.transaction.status !== transaction.status) {
          results.updated++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          transactionId: transaction._id,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get provider health status
   */
  async getProviderHealth() {
    const health = [];
    
    for (const [name, provider] of this.providers) {
      try {
        const status = await provider.healthCheck();
        health.push(status);
      } catch (error) {
        health.push({
          provider: name,
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return health;
  }
}

// Export singleton instance
const paymentService = new PaymentService();
module.exports = paymentService;
module.exports.PaymentService = PaymentService;
