/**
 * Billing Routes
 * API routes for managing billing, payments, and payment methods
 */

const express = require('express');
const { authenticate } = require('../middleware/auth.js');
const { requireRole } = require('../middleware/rbac.js');
const { billingEngine } = require('../services/billingEngine.js');
const { paymentGatewayService } = require('../services/paymentGatewayService.js');
const { BillingRecord, Company, User } = require('../models/index.js');

const router = express.Router();

// ==================== PAYMENT METHODS ====================

/**
 * @route GET /api/billing/payment-methods
 * @desc Get user's saved payment methods
 * @access Private
 */
router.get('/payment-methods', authenticate, async (req, res) => {
  try {
    const ownerId = req.user.companyId || req.user._id;
    const ownerType = req.user.companyId ? 'company' : 'user';

    const methods = await PaymentMethod.find({
      ownerId,
      ownerType,
      isActive: true,
    }).sort({ isDefault: -1, createdAt: -1 });

    res.json({
      success: true,
      data: methods,
    });
  } catch (error) {
    console.error('Get Payment Methods Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment methods',
    });
  }
});

/**
 * @route POST /api/billing/payment-methods
 * @desc Add a new payment method
 * @access Private
 */
router.post('/payment-methods', authenticate, async (req, res) => {
  try {
    const {
      type,
      provider,
      token,
      cardData,
      billingDetails,
      isDefault = false,
    } = req.body;

    const ownerId = req.user.companyId || req.user._id;
    const ownerType = req.user.companyId ? 'company' : 'user';

    // Tokenize payment method with provider
    let tokenizedMethod;
    if (provider === 'stripe' && cardData) {
      tokenizedMethod = await paymentGatewayService.tokenizeStripePaymentMethod({
        ...cardData,
        customerId: req.user.stripeCustomerId,
      });
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await PaymentMethod.updateMany(
        { ownerId, ownerType, isDefault: true },
        { isDefault: false }
      );
    }

    // Create payment method record
    const paymentMethod = await PaymentMethod.create({
      ownerId,
      ownerType,
      type,
      provider,
      providerPaymentMethodId: tokenizedMethod?.paymentMethodId || token,
      last4: tokenizedMethod?.last4 || cardData?.last4,
      expiryMonth: tokenizedMethod?.expMonth || cardData?.expMonth,
      expiryYear: tokenizedMethod?.expYear || cardData?.expYear,
      brand: tokenizedMethod?.brand || cardData?.brand,
      isDefault,
      billingDetails,
      isActive: true,
    });

    res.json({
      success: true,
      data: paymentMethod,
      message: 'Payment method added successfully',
    });
  } catch (error) {
    console.error('Add Payment Method Error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to add payment method',
    });
  }
});

/**
 * @route DELETE /api/billing/payment-methods/:id
 * @desc Remove a payment method
 * @access Private
 */
router.delete('/payment-methods/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.companyId || req.user._id;
    const ownerType = req.user.companyId ? 'company' : 'user';

    const paymentMethod = await PaymentMethod.findOneAndUpdate(
      { _id: id, ownerId, ownerType },
      { isActive: false },
      { new: true }
    );

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        error: 'Payment method not found',
      });
    }

    res.json({
      success: true,
      message: 'Payment method removed successfully',
    });
  } catch (error) {
    console.error('Remove Payment Method Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove payment method',
    });
  }
});

/**
 * @route PUT /api/billing/payment-methods/:id/default
 * @desc Set payment method as default
 * @access Private
 */
router.put('/payment-methods/:id/default', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.companyId || req.user._id;
    const ownerType = req.user.companyId ? 'company' : 'user';

    // Unset current default
    await PaymentMethod.updateMany(
      { ownerId, ownerType, isDefault: true },
      { isDefault: false }
    );

    // Set new default
    const paymentMethod = await PaymentMethod.findOneAndUpdate(
      { _id: id, ownerId, ownerType },
      { isDefault: true },
      { new: true }
    );

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        error: 'Payment method not found',
      });
    }

    res.json({
      success: true,
      data: paymentMethod,
      message: 'Default payment method updated',
    });
  } catch (error) {
    console.error('Set Default Payment Method Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update default payment method',
    });
  }
});

// ==================== PAYMENT PROCESSING ====================

/**
 * @route POST /api/billing/process-payment
 * @desc Process immediate payment
 * @access Private
 */
router.post('/process-payment', authenticate, async (req, res) => {
  try {
    const { invoiceId, paymentMethodId, provider = 'stripe' } = req.body;

    const invoice = await BillingRecord.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    // Get payment method details
    const paymentMethod = await PaymentMethod.findById(paymentMethodId);
    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        error: 'Payment method not found',
      });
    }

    // Process payment based on provider
    let paymentResult;
    if (provider === 'stripe') {
      const intent = await paymentGatewayService.createStripePaymentIntent({
        amount: invoice.amountDue * 100, // Convert to smallest unit
        currency: invoice.currency,
        metadata: {
          invoiceId: invoice._id.toString(),
          invoiceNumber: invoice.invoiceNumber,
        },
      });

      paymentResult = {
        clientSecret: intent.clientSecret,
        paymentIntentId: intent.paymentIntentId,
      };
    } else if (provider === '2c2p') {
      paymentResult = await paymentGatewayService.createTwoC2PPayment({
        amount: invoice.amountDue,
        currency: invoice.currency,
        invoiceNo: invoice.invoiceNumber,
        description: `Invoice ${invoice.invoiceNumber}`,
        customerEmail: req.user.email,
      });
    }

    res.json({
      success: true,
      data: {
        invoice,
        payment: paymentResult,
      },
    });
  } catch (error) {
    console.error('Process Payment Error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to process payment',
    });
  }
});

/**
 * @route POST /api/billing/confirm-payment
 * @desc Confirm payment completion
 * @access Private
 */
router.post('/confirm-payment', authenticate, async (req, res) => {
  try {
    const { invoiceId, transactionId, provider } = req.body;

    const result = await billingEngine.processPayment(invoiceId, {
      amount: 0, // Will be calculated from invoice
      paymentMethod: provider,
      transactionId,
      provider,
    });

    res.json({
      success: true,
      data: result,
      message: 'Payment confirmed successfully',
    });
  } catch (error) {
    console.error('Confirm Payment Error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to confirm payment',
    });
  }
});

// ==================== BILLING HISTORY ====================

/**
 * @route GET /api/billing/history
 * @desc Get billing history
 * @access Private
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const subscriberId = req.user.companyId || req.user._id;
    const subscriberType = req.user.companyId ? 'company' : 'user';
    const { page = 1, limit = 20, status } = req.query;

    const options = {
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
      status,
    };

    const history = await billingEngine.getCompanyBillingHistory(
      subscriberId,
      options
    );

    const total = await BillingRecord.countDocuments({
      companyId: subscriberType === 'company' ? subscriberId : null,
      userId: subscriberType === 'user' ? subscriberId : null,
      ...(status && { status }),
    });

    res.json({
      success: true,
      data: history,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get Billing History Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch billing history',
    });
  }
});

/**
 * @route POST /api/billing/retry
 * @desc Retry failed payment
 * @access Private
 */
router.post('/retry', authenticate, async (req, res) => {
  try {
    const { invoiceId, paymentMethodId } = req.body;

    const invoice = await BillingRecord.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    const result = await billingEngine.retryPayment(invoiceId, {
      amount: invoice.amountDue,
      paymentMethod: paymentMethodId,
    });

    res.json({
      success: true,
      data: result,
      message: 'Payment retry initiated',
    });
  } catch (error) {
    console.error('Retry Payment Error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to retry payment',
    });
  }
});

/**
 * @route GET /api/billing/upcoming
 * @desc Get upcoming charges
 * @access Private
 */
router.get('/upcoming', authenticate, async (req, res) => {
  try {
    const subscriberId = req.user.companyId || req.user._id;
    const subscriberType = req.user.companyId ? 'company' : 'user';

    const upcoming = await BillingRecord.find({
      companyId: subscriberType === 'company' ? subscriberId : null,
      userId: subscriberType === 'user' ? subscriberId : null,
      status: { $in: ['pending', 'draft'] },
      dueDate: { $gte: new Date() },
    })
      .sort({ dueDate: 1 })
      .limit(10);

    res.json({
      success: true,
      data: upcoming,
    });
  } catch (error) {
    console.error('Get Upcoming Charges Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch upcoming charges',
    });
  }
});

/**
 * @route GET /api/billing/summary
 * @desc Get billing summary
 * @access Private
 */
router.get('/summary', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filters = {};
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    const summary = await billingEngine.getBillingSummary(filters);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Get Billing Summary Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch billing summary',
    });
  }
});

// ==================== DISCOUNTS & PROMOS ====================

/**
 * @route POST /api/billing/apply-discount
 * @desc Apply discount to invoice
 * @access Private
 */
router.post('/apply-discount', authenticate, async (req, res) => {
  try {
    const { invoiceId, code, amount, percentage } = req.body;

    const invoice = await billingEngine.applyDiscount(invoiceId, {
      code,
      amount,
      percentage,
      reason: 'Promotional discount',
    });

    res.json({
      success: true,
      data: invoice,
      message: 'Discount applied successfully',
    });
  } catch (error) {
    console.error('Apply Discount Error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to apply discount',
    });
  }
});

// ==================== ADMIN ROUTES ====================

/**
 * @route GET /api/billing/admin/overdue
 * @desc Get overdue invoices (admin only)
 * @access Admin
 */
router.get('/admin/overdue', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { days = 0 } = req.query;

    const overdue = await billingEngine.getOverdueInvoices(parseInt(days));

    res.json({
      success: true,
      data: overdue,
    });
  } catch (error) {
    console.error('Get Overdue Invoices Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch overdue invoices',
    });
  }
});

/**
 * @route POST /api/billing/admin/process-dunning
 * @desc Process dunning for overdue invoices (admin only)
 * @access Admin
 */
router.post('/admin/process-dunning', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const processed = await billingEngine.processDunning();

    res.json({
      success: true,
      data: processed,
      message: `Processed ${processed.length} overdue invoices`,
    });
  } catch (error) {
    console.error('Process Dunning Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process dunning',
    });
  }
});

/**
 * @route POST /api/billing/admin/refund
 * @desc Process refund (admin only)
 * @access Admin
 */
router.post('/admin/refund', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { invoiceId, amount, reason } = req.body;

    const result = await billingEngine.processRefund(invoiceId, {
      amount,
      reason,
      processedBy: req.user._id,
    });

    res.json({
      success: true,
      data: result,
      message: 'Refund processed successfully',
    });
  } catch (error) {
    console.error('Process Refund Error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to process refund',
    });
  }
});

module.exports = router;
