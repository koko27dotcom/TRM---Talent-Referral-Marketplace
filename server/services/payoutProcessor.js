/**
 * Payout Processor Service
 * Multi-provider payout processing with support for Myanmar wallets and banks
 * Handles KBZPay, WavePay, CB Pay, and major Myanmar banks (KBZ, CB, AYA, Yoma, AGD, MAB)
 * Features: Automated scheduling, retry logic, reconciliation, real-time tracking
 */

const {
  PayoutRequest,
  PayoutBatch,
  PayoutProvider,
  PayoutTransaction,
  User,
  AuditLog,
} = require('../models/index.js');
const { PAYOUT_STATUS } = require('../models/PayoutRequest.js');
const { BATCH_STATUS, BATCH_TYPE } = require('../models/PayoutBatch.js');
const { TRANSACTION_STATUS } = require('../models/PayoutTransaction.js');
const { PROVIDER_STATUS, PROVIDER_TYPES } = require('../models/PayoutProvider.js');
const { sendPayoutNotification } = require('./notificationService.js');

// ==================== MOCK PROVIDER IMPLEMENTATIONS ====================

/**
 * Mock KBZPay Provider
 * Simulates KBZPay API integration
 */
class KBZPayProvider {
  constructor(config) {
    this.name = 'KBZPay';
    this.code = 'KBZPAY';
    this.config = config;
  }

  async processPayment(paymentDetails) {
    // Simulate API call delay
    await this.delay(500 + Math.random() * 1000);

    // Simulate occasional failures (2% failure rate)
    if (Math.random() < 0.02) {
      return {
        success: false,
        errorCode: 'KBZ_ERROR_001',
        errorMessage: 'Insufficient wallet balance or account restricted',
      };
    }

    // Simulate successful payment
    return {
      success: true,
      transactionId: `KBZ${Date.now()}${Math.floor(Math.random() * 10000)}`,
      reference: `REF${Math.floor(Math.random() * 1000000)}`,
      processedAt: new Date(),
    };
  }

  async verifyAccount(accountDetails) {
    await this.delay(300);

    // Validate Myanmar phone number format
    const phoneRegex = /^09[0-9]{7,9}$/;
    if (!phoneRegex.test(accountDetails.phoneNumber)) {
      return {
        valid: false,
        error: 'Invalid phone number format. Must be 09xxxxxxxxx',
      };
    }

    return {
      valid: true,
      accountName: accountDetails.accountName,
      phoneNumber: accountDetails.phoneNumber,
    };
  }

  async getBalance() {
    await this.delay(200);
    return {
      available: 50000000, // 50 million MMK
      currency: 'MMK',
    };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Mock WavePay Provider
 * Simulates WavePay API integration
 */
class WavePayProvider {
  constructor(config) {
    this.name = 'WavePay';
    this.code = 'WAVEPAY';
    this.config = config;
  }

  async processPayment(paymentDetails) {
    await this.delay(500 + Math.random() * 1000);

    // Simulate occasional failures (3% failure rate)
    if (Math.random() < 0.03) {
      return {
        success: false,
        errorCode: 'WAVE_ERROR_002',
        errorMessage: 'Transaction limit exceeded or wallet not verified',
      };
    }

    return {
      success: true,
      transactionId: `WAV${Date.now()}${Math.floor(Math.random() * 10000)}`,
      reference: `REF${Math.floor(Math.random() * 1000000)}`,
      processedAt: new Date(),
    };
  }

  async verifyAccount(accountDetails) {
    await this.delay(300);

    const phoneRegex = /^09[0-9]{7,9}$/;
    if (!phoneRegex.test(accountDetails.phoneNumber)) {
      return {
        valid: false,
        error: 'Invalid phone number format. Must be 09xxxxxxxxx',
      };
    }

    return {
      valid: true,
      accountName: accountDetails.accountName,
      phoneNumber: accountDetails.phoneNumber,
    };
  }

  async getBalance() {
    await this.delay(200);
    return {
      available: 30000000, // 30 million MMK
      currency: 'MMK',
    };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Mock CB Pay Provider
 * Simulates CB Pay API integration
 */
class CBPayProvider {
  constructor(config) {
    this.name = 'CB Pay';
    this.code = 'CBPAY';
    this.config = config;
  }

  async processPayment(paymentDetails) {
    await this.delay(600 + Math.random() * 1000);

    // Simulate occasional failures (2.5% failure rate)
    if (Math.random() < 0.025) {
      return {
        success: false,
        errorCode: 'CB_ERROR_003',
        errorMessage: 'Account not found or service temporarily unavailable',
      };
    }

    return {
      success: true,
      transactionId: `CB${Date.now()}${Math.floor(Math.random() * 10000)}`,
      reference: `REF${Math.floor(Math.random() * 1000000)}`,
      processedAt: new Date(),
    };
  }

  async verifyAccount(accountDetails) {
    await this.delay(300);

    const phoneRegex = /^09[0-9]{7,9}$/;
    if (!phoneRegex.test(accountDetails.phoneNumber)) {
      return {
        valid: false,
        error: 'Invalid phone number format. Must be 09xxxxxxxxx',
      };
    }

    return {
      valid: true,
      accountName: accountDetails.accountName,
      phoneNumber: accountDetails.phoneNumber,
    };
  }

  async getBalance() {
    await this.delay(200);
    return {
      available: 25000000, // 25 million MMK
      currency: 'MMK',
    };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Mock Bank Transfer Provider
 * Simulates bank transfer API integration
 */
class BankTransferProvider {
  constructor(config, bankCode) {
    this.name = `${bankCode} Bank Transfer`;
    this.code = `${bankCode}_BANK`;
    this.bankCode = bankCode;
    this.config = config;
  }

  async processPayment(paymentDetails) {
    await this.delay(1000 + Math.random() * 2000);

    // Simulate occasional failures (5% failure rate for bank transfers)
    if (Math.random() < 0.05) {
      return {
        success: false,
        errorCode: 'BANK_ERROR_004',
        errorMessage: 'Invalid account number or bank system maintenance',
      };
    }

    return {
      success: true,
      transactionId: `BANK${this.bankCode}${Date.now()}${Math.floor(Math.random() * 10000)}`,
      reference: `REF${Math.floor(Math.random() * 1000000)}`,
      processedAt: new Date(),
      estimatedArrival: new Date(Date.now() + 24 * 60 * 60 * 1000), // Next business day
    };
  }

  async verifyAccount(accountDetails) {
    await this.delay(500);

    // Basic account number validation
    if (!accountDetails.accountNumber || accountDetails.accountNumber.length < 6) {
      return {
        valid: false,
        error: 'Invalid account number',
      };
    }

    return {
      valid: true,
      accountName: accountDetails.accountName,
      accountNumber: accountDetails.accountNumber,
      bankName: accountDetails.bankName,
    };
  }

  async getBalance() {
    await this.delay(300);
    return {
      available: 100000000, // 100 million MMK
      currency: 'MMK',
    };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ==================== PAYOUT PROCESSOR CLASS ====================

class PayoutProcessor {
  constructor() {
    this.providers = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the payout processor
   * Load providers from database and create provider instances
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize default providers in database
      await PayoutProvider.initializeDefaults();

      // Load active providers
      const providers = await PayoutProvider.findActive();

      for (const provider of providers) {
        this.registerProvider(provider);
      }

      this.initialized = true;
      console.log(`[PayoutProcessor] Initialized with ${this.providers.size} providers`);
    } catch (error) {
      console.error('[PayoutProcessor] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Register a provider instance
   * @param {Object} providerConfig - Provider configuration from database
   */
  registerProvider(providerConfig) {
    let providerInstance;

    switch (providerConfig.type) {
      case PROVIDER_TYPES.KBZPAY:
        providerInstance = new KBZPayProvider(providerConfig.apiConfig);
        break;
      case PROVIDER_TYPES.WAVEPAY:
        providerInstance = new WavePayProvider(providerConfig.apiConfig);
        break;
      case PROVIDER_TYPES.CBPAY:
        providerInstance = new CBPayProvider(providerConfig.apiConfig);
        break;
      case PROVIDER_TYPES.BANK_TRANSFER:
        providerInstance = new BankTransferProvider(
          providerConfig.apiConfig,
          providerConfig.bankCode
        );
        break;
      default:
        console.warn(`[PayoutProcessor] Unknown provider type: ${providerConfig.type}`);
        return;
    }

    this.providers.set(providerConfig.code, {
      instance: providerInstance,
      config: providerConfig,
    });

    console.log(`[PayoutProcessor] Registered provider: ${providerConfig.code}`);
  }

  /**
   * Get provider instance
   * @param {string} providerCode - Provider code
   * @returns {Object|null}
   */
  getProvider(providerCode) {
    return this.providers.get(providerCode) || null;
  }

  /**
   * Process individual payout
   * @param {string} payoutRequestId - Payout request ID
   * @param {Object} options - Processing options
   * @returns {Promise<Object>}
   */
  async processPayout(payoutRequestId, options = {}) {
    try {
      // Get payout request
      const payoutRequest = await PayoutRequest.findById(payoutRequestId)
        .populate('referrerId', 'name email phone referrerProfile');

      if (!payoutRequest) {
        throw new Error('Payout request not found');
      }

      if (payoutRequest.status !== PAYOUT_STATUS.APPROVED) {
        throw new Error(`Payout request must be approved before processing. Current status: ${payoutRequest.status}`);
      }

      // Determine provider
      const providerCode = options.providerCode || this.getProviderCodeFromPaymentMethod(payoutRequest.paymentMethod);
      const provider = this.getProvider(providerCode);

      if (!provider) {
        throw new Error(`Provider not found: ${providerCode}`);
      }

      // Calculate fee
      const fee = provider.config.calculateFee(payoutRequest.amount);

      // Create transaction record
      const transaction = await PayoutTransaction.createTransaction({
        payoutRequestId: payoutRequest._id,
        referrerId: payoutRequest.referrerId._id,
        providerId: provider.config._id,
        providerCode: provider.config.code,
        amount: payoutRequest.amount,
        fee,
        currency: payoutRequest.currency,
        paymentDetails: payoutRequest.paymentMethod,
        maxRetries: options.maxRetries || 3,
      });

      // Update payout request status
      await payoutRequest.startProcessing(options.processedBy);

      // Initiate transaction
      await transaction.initiate();

      // Process payment
      const result = await this.executePayment(provider, payoutRequest, transaction);

      if (result.success) {
        // Mark as completed
        await transaction.markCompleted(result.transactionId);
        await payoutRequest.markAsPaid({
          transactionId: result.transactionId,
          notes: `Processed via ${provider.config.name}`,
        });

        // Update user balance
        await User.findByIdAndUpdate(payoutRequest.referrerId._id, {
          $inc: {
            'referrerProfile.pendingBalance': -payoutRequest.amount,
            'referrerProfile.totalEarnings': payoutRequest.amount,
          },
        });

        // Update provider stats
        await provider.config.updateStats(true, payoutRequest.amount, result.processingTime);

        // Send notification
        await sendPayoutNotification(
          payoutRequest.referrerId._id,
          payoutRequest._id,
          'paid',
          {
            amount: payoutRequest.amount,
            requestNumber: payoutRequest.requestNumber,
            transactionId: result.transactionId,
          }
        );

        // Log audit
        await AuditLog.logUserAction({
          user: options.processedBy ? { _id: options.processedBy } : null,
          action: 'payout_processed',
          entityType: 'payout_request',
          entityId: payoutRequest._id,
          description: `Payout ${payoutRequest.requestNumber} processed successfully via ${provider.config.name}`,
          changes: [
            { field: 'status', oldValue: PAYOUT_STATUS.PROCESSING, newValue: PAYOUT_STATUS.PAID },
            { field: 'transactionId', oldValue: null, newValue: result.transactionId },
          ],
        });

        return {
          success: true,
          transaction,
          payoutRequest,
          provider: provider.config.name,
        };
      } else {
        // Mark as failed
        await transaction.markFailed(result.errorCode, result.errorMessage, true);

        // Update payout request
        payoutRequest.status = PAYOUT_STATUS.APPROVED; // Reset to approved for retry
        payoutRequest.processingHistory.push({
          status: 'failed',
          changedAt: new Date(),
          notes: `Failed: ${result.errorMessage}`,
        });
        await payoutRequest.save();

        // Update provider stats
        await provider.config.updateStats(false, payoutRequest.amount, result.processingTime);

        return {
          success: false,
          error: result.errorMessage,
          errorCode: result.errorCode,
          transaction,
          canRetry: transaction.canRetry,
        };
      }
    } catch (error) {
      console.error('[PayoutProcessor] Process payout error:', error);
      throw error;
    }
  }

  /**
   * Execute payment with provider
   * @param {Object} provider - Provider instance
   * @param {Object} payoutRequest - Payout request
   * @param {Object} transaction - Transaction record
   * @returns {Promise<Object>}
   */
  async executePayment(provider, payoutRequest, transaction) {
    const startTime = Date.now();

    try {
      await transaction.markProcessing();

      const paymentDetails = {
        amount: payoutRequest.amount,
        currency: payoutRequest.currency,
        reference: transaction.transactionNumber,
        ...payoutRequest.paymentMethod,
      };

      const result = await provider.instance.processPayment(paymentDetails);

      const processingTime = Date.now() - startTime;

      // Add provider response to transaction
      await transaction.addProviderResponse(
        paymentDetails,
        result,
        processingTime
      );

      return {
        ...result,
        processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      return {
        success: false,
        errorCode: 'PROCESSOR_ERROR',
        errorMessage: error.message,
        processingTime,
      };
    }
  }

  /**
   * Process batch payouts
   * @param {string} batchId - Batch ID
   * @returns {Promise<Object>}
   */
  async processBatch(batchId) {
    try {
      const batch = await PayoutBatch.findById(batchId);
      if (!batch) {
        throw new Error('Batch not found');
      }

      if (batch.status !== BATCH_STATUS.PENDING) {
        throw new Error(`Batch is not pending. Current status: ${batch.status}`);
      }

      // Start batch processing
      await batch.startProcessing();

      const provider = batch.providerId ? this.getProvider(batch.providerId.code) : null;
      if (!provider && batch.providerId) {
        await batch.fail('Provider not found');
        throw new Error(`Provider not found: ${batch.providerId.code}`);
      }

      // Process payouts in parallel or sequential based on config
      const processPayoutItem = async (payoutItem) => {
        try {
          const payoutRequest = await PayoutRequest.findById(payoutItem.payoutRequestId);
          if (!payoutRequest) {
            await batch.updatePayoutStatus(payoutItem.payoutRequestId, 'failed', {
              errorMessage: 'Payout request not found',
            });
            return { success: false, error: 'Payout request not found' };
          }

          const result = await this.processPayout(payoutRequest._id, {
            processedBy: batch.createdBy,
          });

          if (result.success) {
            await batch.updatePayoutStatus(payoutItem.payoutRequestId, 'completed', {
              transactionId: result.transaction.providerTransactionId,
            });
            return { success: true };
          } else {
            await batch.updatePayoutStatus(payoutItem.payoutRequestId, 'failed', {
              errorMessage: result.error,
            });
            return { success: false, error: result.error };
          }
        } catch (error) {
          await batch.updatePayoutStatus(payoutItem.payoutRequestId, 'failed', {
            errorMessage: error.message,
          });
          await batch.addError(payoutItem.payoutRequestId, error.message);
          return { success: false, error: error.message };
        }
      };

      // Process payouts
      const batchSize = batch.config.batchSize || 10;
      const results = [];

      for (let i = 0; i < batch.payouts.length; i += batchSize) {
        const chunk = batch.payouts.slice(i, i + batchSize);

        if (batch.config.parallelProcessing) {
          const chunkResults = await Promise.all(chunk.map(processPayoutItem));
          results.push(...chunkResults);
        } else {
          for (const payout of chunk) {
            const result = await processPayoutItem(payout);
            results.push(result);
          }
        }
      }

      // Update batch status based on results
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      if (failureCount === 0) {
        await batch.complete();
      } else if (successCount === 0) {
        await batch.fail('All payouts failed');
      } else {
        await batch.markPartial();
      }

      return {
        success: failureCount === 0,
        batch,
        summary: {
          total: results.length,
          success: successCount,
          failed: failureCount,
        },
      };
    } catch (error) {
      console.error('[PayoutProcessor] Process batch error:', error);
      throw error;
    }
  }

  /**
   * Retry failed transaction
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<Object>}
   */
  async retryTransaction(transactionId) {
    try {
      const transaction = await PayoutTransaction.findById(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (!transaction.canRetry) {
        throw new Error('Transaction cannot be retried');
      }

      await transaction.retry();

      const payoutRequest = await PayoutRequest.findById(transaction.payoutRequestId);
      const provider = this.getProvider(transaction.providerCode);

      const result = await this.executePayment(provider, payoutRequest, transaction);

      if (result.success) {
        await transaction.markCompleted(result.transactionId);
        await payoutRequest.markAsPaid({
          transactionId: result.transactionId,
          notes: `Retry successful via ${provider.config.name}`,
        });

        return {
          success: true,
          transaction,
        };
      } else {
        await transaction.markFailed(result.errorCode, result.errorMessage, true);
        return {
          success: false,
          error: result.errorMessage,
          canRetry: transaction.canRetry,
        };
      }
    } catch (error) {
      console.error('[PayoutProcessor] Retry transaction error:', error);
      throw error;
    }
  }

  /**
   * Get provider code from payment method
   * @param {Object} paymentMethod - Payment method details
   * @returns {string}
   */
  getProviderCodeFromPaymentMethod(paymentMethod) {
    const typeMap = {
      'kbzpay': 'KBZPAY',
      'wavepay': 'WAVEPAY',
      'cbpay': 'CBPAY',
      'bank_transfer': `${paymentMethod.bankName?.toUpperCase()}_BANK`,
    };

    return typeMap[paymentMethod.type] || 'KBZPAY';
  }

  /**
   * Verify payment account
   * @param {string} providerCode - Provider code
   * @param {Object} accountDetails - Account details
   * @returns {Promise<Object>}
   */
  async verifyAccount(providerCode, accountDetails) {
    const provider = this.getProvider(providerCode);
    if (!provider) {
      throw new Error(`Provider not found: ${providerCode}`);
    }

    return await provider.instance.verifyAccount(accountDetails);
  }

  /**
   * Get provider balance
   * @param {string} providerCode - Provider code
   * @returns {Promise<Object>}
   */
  async getProviderBalance(providerCode) {
    const provider = this.getProvider(providerCode);
    if (!provider) {
      throw new Error(`Provider not found: ${providerCode}`);
    }

    return await provider.instance.getBalance();
  }

  /**
   * Get all provider statuses
   * @returns {Promise<Array>}
   */
  async getProviderStatuses() {
    const providers = await PayoutProvider.findActive();
    const statuses = [];

    for (const provider of providers) {
      try {
        const balance = await this.getProviderBalance(provider.code);
        statuses.push({
          code: provider.code,
          name: provider.name,
          status: provider.status,
          balance: balance.available,
          currency: balance.currency,
          isActive: provider.isActive,
        });
      } catch (error) {
        statuses.push({
          code: provider.code,
          name: provider.name,
          status: 'error',
          error: error.message,
          isActive: false,
        });
      }
    }

    return statuses;
  }

  /**
   * Create scheduled batch
   * @param {Object} options - Batch options
   * @returns {Promise<Object>}
   */
  async createScheduledBatch(options = {}) {
    try {
      // Find approved payouts ready for processing
      const query = {
        status: PAYOUT_STATUS.APPROVED,
      };

      if (options.minAmount) {
        query.amount = { $gte: options.minAmount };
      }

      if (options.maxAmount) {
        query.amount = { ...query.amount, $lte: options.maxAmount };
      }

      const payouts = await PayoutRequest.find(query)
        .limit(options.limit || 100);

      if (payouts.length === 0) {
        return { success: true, message: 'No payouts ready for batch processing', batch: null };
      }

      // Create batch
      const batch = await PayoutBatch.createBatch(payouts, {
        type: options.type || BATCH_TYPE.SCHEDULED,
        providerId: options.providerId,
        scheduledAt: options.scheduledAt,
        createdBy: options.createdBy,
        config: options.config,
        notes: options.notes,
      });

      // Update payout requests to batch status
      for (const payout of payouts) {
        payout.status = PAYOUT_STATUS.PROCESSING;
        payout.processingHistory.push({
          status: 'batched',
          changedAt: new Date(),
          notes: `Added to batch ${batch.batchNumber}`,
        });
        await payout.save();
      }

      return {
        success: true,
        batch,
        count: payouts.length,
      };
    } catch (error) {
      console.error('[PayoutProcessor] Create scheduled batch error:', error);
      throw error;
    }
  }

  /**
   * Process scheduled batches
   * Processes batches that are ready for processing
   * @returns {Promise<Object>}
   */
  async processScheduledBatches() {
    try {
      const batches = await PayoutBatch.findReadyForProcessing();
      const results = [];

      for (const batch of batches) {
        try {
          const result = await this.processBatch(batch._id);
          results.push({
            batchId: batch._id,
            batchNumber: batch.batchNumber,
            ...result,
          });
        } catch (error) {
          results.push({
            batchId: batch._id,
            batchNumber: batch.batchNumber,
            success: false,
            error: error.message,
          });
        }
      }

      return {
        success: true,
        processed: results.length,
        results,
      };
    } catch (error) {
      console.error('[PayoutProcessor] Process scheduled batches error:', error);
      throw error;
    }
  }

  /**
   * Retry failed transactions
   * Processes transactions that are ready for retry
   * @returns {Promise<Object>}
   */
  async retryFailedTransactions() {
    try {
      const transactions = await PayoutTransaction.findReadyForRetry();
      const results = [];

      for (const transaction of transactions) {
        try {
          const result = await this.retryTransaction(transaction._id);
          results.push({
            transactionId: transaction._id,
            transactionNumber: transaction.transactionNumber,
            ...result,
          });
        } catch (error) {
          results.push({
            transactionId: transaction._id,
            transactionNumber: transaction.transactionNumber,
            success: false,
            error: error.message,
          });
        }
      }

      return {
        success: true,
        retried: results.length,
        results,
      };
    } catch (error) {
      console.error('[PayoutProcessor] Retry failed transactions error:', error);
      throw error;
    }
  }

  /**
   * Get reconciliation report
   * @param {Object} filters - Date filters
   * @returns {Promise<Object>}
   */
  async getReconciliationReport(filters = {}) {
    try {
      const transactionStats = await PayoutTransaction.getStats(filters);
      const providerStats = await PayoutTransaction.getProviderStats(filters);
      const unreconciled = await PayoutTransaction.findUnreconciled({ limit: 100 });

      return {
        success: true,
        summary: transactionStats,
        byProvider: providerStats,
        unreconciled: {
          count: unreconciled.length,
          transactions: unreconciled,
        },
      };
    } catch (error) {
      console.error('[PayoutProcessor] Get reconciliation report error:', error);
      throw error;
    }
  }

  /**
   * Handle webhook from provider
   * @param {string} providerCode - Provider code
   * @param {Object} payload - Webhook payload
   * @returns {Promise<Object>}
   */
  async handleWebhook(providerCode, payload) {
    try {
      // Find transaction by provider transaction ID
      const transaction = await PayoutTransaction.findOne({
        providerTransactionId: payload.transactionId,
      });

      if (!transaction) {
        return { success: false, error: 'Transaction not found' };
      }

      await transaction.updateFromWebhook(payload);

      // Update payout request if transaction is completed or failed
      const payoutRequest = await PayoutRequest.findById(transaction.payoutRequestId);
      if (payoutRequest) {
        if (transaction.status === TRANSACTION_STATUS.COMPLETED) {
          await payoutRequest.markAsPaid({
            transactionId: transaction.providerTransactionId,
            notes: 'Updated via webhook',
          });
        } else if (transaction.status === TRANSACTION_STATUS.FAILED) {
          payoutRequest.status = PAYOUT_STATUS.APPROVED;
          payoutRequest.processingHistory.push({
            status: 'failed',
            changedAt: new Date(),
            notes: `Failed via webhook: ${payload.errorMessage || 'Unknown error'}`,
          });
          await payoutRequest.save();
        }
      }

      return { success: true, transaction };
    } catch (error) {
      console.error('[PayoutProcessor] Handle webhook error:', error);
      throw error;
    }
  }
}

// Create singleton instance
const payoutProcessor = new PayoutProcessor();

module.exports = payoutProcessor;

// Export individual functions for convenience
const initializePayoutProcessor = () => payoutProcessor.initialize();
const processPayout = (payoutRequestId, options) => payoutProcessor.processPayout(payoutRequestId, options);
const processBatch = (batchId) => payoutProcessor.processBatch(batchId);
const retryTransaction = (transactionId) => payoutProcessor.retryTransaction(transactionId);
const createScheduledBatch = (options) => payoutProcessor.createScheduledBatch(options);
const processScheduledBatches = () => payoutProcessor.processScheduledBatches();
const retryFailedTransactions = () => payoutProcessor.retryFailedTransactions();
const getReconciliationReport = (filters) => payoutProcessor.getReconciliationReport(filters);
const handleWebhook = (providerCode, payload) => payoutProcessor.handleWebhook(providerCode, payload);
const getProviderStatuses = () => payoutProcessor.getProviderStatuses();
const verifyAccount = (providerCode, accountDetails) => payoutProcessor.verifyAccount(providerCode, accountDetails);
