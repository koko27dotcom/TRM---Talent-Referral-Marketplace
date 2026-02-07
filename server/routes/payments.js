/**
 * Payment Routes
 * API endpoints for payment operations
 */

const express = require('express');
const router = express.Router();
const paymentService = require('../services/payment/PaymentService');
const PaymentTransaction = require('../models/PaymentTransaction');
const PaymentMethod = require('../models/PaymentMethod');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// ==================== DEPOSIT ROUTES ====================

/**
 * @route POST /api/v1/payments/deposit
 * @desc Create a new deposit
 * @access Private
 */
router.post('/deposit', authenticate, async (req, res) => {
  try {
    const {
      amount,
      currency = 'MMK',
      provider,
      description,
      metadata,
      callbackUrl,
      successUrl,
      failureUrl,
      idempotencyKey
    } = req.body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount',
        message: 'Amount must be greater than 0'
      });
    }

    if (!provider) {
      return res.status(400).json({
        success: false,
        error: 'Provider required',
        message: 'Payment provider is required'
      });
    }

    const result = await paymentService.createDeposit({
      userId: req.user._id,
      amount,
      currency,
      provider,
      description,
      metadata,
      callbackUrl,
      successUrl,
      failureUrl,
      idempotencyKey: idempotencyKey || `${req.user._id}_${Date.now()}`
    });

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Deposit creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Deposit failed',
      message: error.message
    });
  }
});

/**
 * @route POST /api/v1/payments/withdrawal
 * @desc Create a new withdrawal
 * @access Private
 */
router.post('/withdrawal', authenticate, async (req, res) => {
  try {
    const {
      amount,
      currency = 'MMK',
      provider,
      paymentMethodId,
      recipientPhone,
      recipientName,
      description,
      metadata,
      idempotencyKey
    } = req.body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount',
        message: 'Amount must be greater than 0'
      });
    }

    if (!provider) {
      return res.status(400).json({
        success: false,
        error: 'Provider required',
        message: 'Payment provider is required'
      });
    }

    if (!paymentMethodId && !recipientPhone) {
      return res.status(400).json({
        success: false,
        error: 'Recipient required',
        message: 'Payment method or recipient phone is required'
      });
    }

    const result = await paymentService.createWithdrawal({
      userId: req.user._id,
      amount,
      currency,
      provider,
      paymentMethodId,
      recipientPhone,
      recipientName,
      description,
      metadata,
      idempotencyKey: idempotencyKey || `${req.user._id}_${Date.now()}`
    });

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Withdrawal creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Withdrawal failed',
      message: error.message
    });
  }
});

// ==================== TRANSACTION ROUTES ====================

/**
 * @route GET /api/v1/payments/transactions
 * @desc Get user's transactions
 * @access Private
 */
router.get('/transactions', authenticate, async (req, res) => {
  try {
    const {
      status,
      type,
      provider,
      startDate,
      endDate,
      limit = 50,
      skip = 0
    } = req.query;

    const query = { userId: req.user._id };

    if (status) query.status = status;
    if (type) query.type = type;
    if (provider) query.provider = provider;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const transactions = await PaymentTransaction.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await PaymentTransaction.countDocuments(query);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip),
          hasMore: total > parseInt(skip) + parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions',
      message: error.message
    });
  }
});

/**
 * @route GET /api/v1/payments/transactions/:id
 * @desc Get transaction details
 * @access Private
 */
router.get('/transactions/:id', authenticate, async (req, res) => {
  try {
    const transaction = await PaymentTransaction.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction',
      message: error.message
    });
  }
});

/**
 * @route GET /api/v1/payments/transactions/:id/status
 * @desc Check transaction status
 * @access Private
 */
router.get('/transactions/:id/status', authenticate, async (req, res) => {
  try {
    const transaction = await PaymentTransaction.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // Check status with provider if pending
    if (['pending', 'processing', 'initiated'].includes(transaction.status)) {
      const result = await paymentService.checkStatus(transaction._id);
      return res.json({
        success: true,
        data: {
          transaction: result.transaction,
          isFinal: result.isFinal || false
        }
      });
    }

    res.json({
      success: true,
      data: {
        transaction,
        isFinal: true
      }
    });
  } catch (error) {
    console.error('Check status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check status',
      message: error.message
    });
  }
});

// ==================== PAYMENT METHODS ROUTES ====================

/**
 * @route GET /api/v1/payments/methods
 * @desc Get user's payment methods
 * @access Private
 */
router.get('/methods', authenticate, async (req, res) => {
  try {
    const { status, type } = req.query;
    
    const methods = await PaymentMethod.findByUser(req.user._id, {
      status,
      type
    });

    res.json({
      success: true,
      data: methods
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment methods',
      message: error.message
    });
  }
});

/**
 * @route POST /api/v1/payments/methods
 * @desc Add a new payment method
 * @access Private
 */
router.post('/methods', authenticate, async (req, res) => {
  try {
    const {
      type,
      nickname,
      mobileWallet,
      bankAccount,
      isDefault
    } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Type required',
        message: 'Payment method type is required'
      });
    }

    // Check for duplicate phone numbers
    if (mobileWallet?.phoneNumber) {
      const isRegistered = await PaymentMethod.isPhoneRegistered(
        mobileWallet.phoneNumber,
        req.user._id
      );
      
      if (isRegistered) {
        return res.status(409).json({
          success: false,
          error: 'Phone already registered',
          message: 'This phone number is already registered to another account'
        });
      }
    }

    // If setting as default, remove default from others
    if (isDefault) {
      await PaymentMethod.updateMany(
        { userId: req.user._id, isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    const paymentMethod = new PaymentMethod({
      userId: req.user._id,
      methodId: PaymentMethod.generateMethodId(),
      type,
      nickname,
      mobileWallet,
      bankAccount,
      isDefault: isDefault || false,
      status: 'pending_verification',
      ipAddress: req.ip
    });

    await paymentMethod.save();

    res.status(201).json({
      success: true,
      data: paymentMethod
    });
  } catch (error) {
    console.error('Add payment method error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add payment method',
      message: error.message
    });
  }
});

/**
 * @route PUT /api/v1/payments/methods/:id/default
 * @desc Set payment method as default
 * @access Private
 */
router.put('/methods/:id/default', authenticate, async (req, res) => {
  try {
    const method = await PaymentMethod.setDefault(req.params.id, req.user._id);

    if (!method) {
      return res.status(404).json({
        success: false,
        error: 'Payment method not found'
      });
    }

    res.json({
      success: true,
      data: method
    });
  } catch (error) {
    console.error('Set default error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set default',
      message: error.message
    });
  }
});

/**
 * @route DELETE /api/v1/payments/methods/:id
 * @desc Delete a payment method
 * @access Private
 */
router.delete('/methods/:id', authenticate, async (req, res) => {
  try {
    const method = await PaymentMethod.findOne({
      methodId: req.params.id,
      userId: req.user._id
    });

    if (!method) {
      return res.status(404).json({
        success: false,
        error: 'Payment method not found'
      });
    }

    await method.softDelete(req.user._id);

    res.json({
      success: true,
      message: 'Payment method deleted successfully'
    });
  } catch (error) {
    console.error('Delete payment method error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete payment method',
      message: error.message
    });
  }
});

// ==================== QR CODE ROUTES ====================

/**
 * @route POST /api/v1/payments/qr-code
 * @desc Generate QR code for payment
 * @access Private
 */
router.post('/qr-code', authenticate, async (req, res) => {
  try {
    const { amount, currency, orderId, description, provider } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }

    const result = await paymentService.generateQRCode({
      amount,
      currency: currency || 'MMK',
      orderId: orderId || `QR${Date.now()}`,
      description,
      provider
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('QR code generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate QR code',
      message: error.message
    });
  }
});

// ==================== PROVIDER ROUTES ====================

/**
 * @route GET /api/v1/payments/providers
 * @desc Get available payment providers
 * @access Public
 */
router.get('/providers', async (req, res) => {
  try {
    const providers = paymentService.getAvailableProviders();

    res.json({
      success: true,
      data: providers
    });
  } catch (error) {
    console.error('Get providers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch providers',
      message: error.message
    });
  }
});

/**
 * @route GET /api/v1/payments/providers/health
 * @desc Get provider health status
 * @access Private (Admin)
 */
router.get('/providers/health', authenticate, requireRole('platform_admin'), async (req, res) => {
  try {
    const health = await paymentService.getProviderHealth();

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Provider health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check provider health',
      message: error.message
    });
  }
});

// ==================== WEBHOOK ROUTES ====================

/**
 * @route POST /api/v1/payments/webhooks/:provider
 * @desc Handle webhooks from payment providers
 * @access Public (with signature verification)
 */
router.post('/webhooks/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const payload = req.body;
    const headers = req.headers;

    console.log(`Received webhook from ${provider}:`, payload);

    const result = await paymentService.handleWebhook(provider, payload, headers);

    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Webhook processing failed',
      message: error.message
    });
  }
});

// ==================== ADMIN ROUTES ====================

/**
 * @route GET /api/v1/payments/admin/transactions
 * @desc Get all transactions (admin)
 * @access Private (Admin)
 */
router.get('/admin/transactions', authenticate, requireRole('platform_admin'), async (req, res) => {
  try {
    const {
      status,
      type,
      provider,
      startDate,
      endDate,
      limit = 100,
      skip = 0
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (type) query.type = type;
    if (provider) query.provider = provider;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const transactions = await PaymentTransaction.find(query)
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await PaymentTransaction.countDocuments(query);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip)
        }
      }
    });
  } catch (error) {
    console.error('Admin get transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions',
      message: error.message
    });
  }
});

/**
 * @route POST /api/v1/payments/admin/refund
 * @desc Process refund (admin)
 * @access Private (Admin)
 */
router.post('/admin/refund', authenticate, requireRole('platform_admin'), async (req, res) => {
  try {
    const { transactionId, amount, reason } = req.body;

    if (!transactionId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Transaction ID and amount are required'
      });
    }

    const result = await paymentService.processRefund(
      transactionId,
      amount,
      reason,
      req.user._id
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({
      success: false,
      error: 'Refund failed',
      message: error.message
    });
  }
});

/**
 * @route POST /api/v1/payments/admin/reconcile
 * @desc Reconcile pending transactions
 * @access Private (Admin)
 */
router.post('/admin/reconcile', authenticate, requireRole('platform_admin'), async (req, res) => {
  try {
    const result = await paymentService.reconcileTransactions(req.body);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Reconciliation error:', error);
    res.status(500).json({
      success: false,
      error: 'Reconciliation failed',
      message: error.message
    });
  }
});

/**
 * @route GET /api/v1/payments/admin/statistics
 * @desc Get payment statistics
 * @access Private (Admin)
 */
router.get('/admin/statistics', authenticate, requireRole('platform_admin'), async (req, res) => {
  try {
    const { startDate, endDate, provider, type } = req.query;

    const stats = await paymentService.getStatistics({
      startDate,
      endDate,
      provider,
      type
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
      message: error.message
    });
  }
});

module.exports = router;
