/**
 * Invoice Routes
 * API routes for managing invoices
 */

const express = require('express');
const { authenticate } = require('../middleware/auth.js');
const { requireRole } = require('../middleware/rbac.js');
const { billingEngine } = require('../services/billingEngine.js');
const { BillingRecord } = require('../models/index.js');

const router = express.Router();

/**
 * @route GET /api/invoices
 * @desc List invoices for current user/company
 * @access Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const subscriberId = req.user.companyId || req.user._id;
    const subscriberType = req.user.companyId ? 'company' : 'user';
    const { page = 1, limit = 20, status, startDate, endDate } = req.query;

    const query = {
      companyId: subscriberType === 'company' ? subscriberId : null,
      userId: subscriberType === 'user' ? subscriberId : null,
    };

    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const invoices = await BillingRecord.find(query)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await BillingRecord.countDocuments(query);

    res.json({
      success: true,
      data: invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get Invoices Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch invoices',
    });
  }
});

/**
 * @route GET /api/invoices/:id
 * @desc Get invoice details
 * @access Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const subscriberId = req.user.companyId || req.user._id;

    const invoice = await BillingRecord.findOne({
      _id: id,
      $or: [
        { companyId: subscriberId },
        { userId: subscriberId },
      ],
    }).populate('subscriptionId', 'planId currentPeriodStart currentPeriodEnd');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error('Get Invoice Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch invoice',
    });
  }
});

/**
 * @route GET /api/invoices/:id/pdf
 * @desc Download invoice PDF
 * @access Private
 */
router.get('/:id/pdf', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const subscriberId = req.user.companyId || req.user._id;

    const invoice = await BillingRecord.findOne({
      _id: id,
      $or: [
        { companyId: subscriberId },
        { userId: subscriberId },
      ],
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    const pdfResult = await billingEngine.generateInvoicePDF(id);

    // In a real implementation, this would stream the PDF
    // For now, return the URL
    res.json({
      success: true,
      data: {
        downloadUrl: pdfResult.pdfUrl,
        invoiceNumber: invoice.invoiceNumber,
      },
    });
  } catch (error) {
    console.error('Download Invoice PDF Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate PDF',
    });
  }
});

/**
 * @route POST /api/invoices/:id/pay
 * @desc Pay an invoice
 * @access Private
 */
router.post('/:id/pay', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethodId, provider = 'stripe' } = req.body;
    const subscriberId = req.user.companyId || req.user._id;

    const invoice = await BillingRecord.findOne({
      _id: id,
      $or: [
        { companyId: subscriberId },
        { userId: subscriberId },
      ],
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({
        success: false,
        error: 'Invoice is already paid',
      });
    }

    // Process payment
    const result = await billingEngine.processPayment(id, {
      amount: invoice.amountDue,
      paymentMethod: paymentMethodId,
      provider,
      transactionId: null, // Will be set after payment confirmation
    });

    res.json({
      success: true,
      data: result,
      message: 'Payment processed successfully',
    });
  } catch (error) {
    console.error('Pay Invoice Error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to process payment',
    });
  }
});

/**
 * @route POST /api/invoices/:id/void
 * @desc Void an invoice (admin only)
 * @access Admin
 */
router.post('/:id/void', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const invoice = await BillingRecord.findById(id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({
        success: false,
        error: 'Cannot void a paid invoice. Use refund instead.',
      });
    }

    invoice.status = 'void';
    invoice.voidReason = reason;
    invoice.voidedAt = new Date();
    invoice.voidedBy = req.user._id;

    await invoice.save();

    res.json({
      success: true,
      data: invoice,
      message: 'Invoice voided successfully',
    });
  } catch (error) {
    console.error('Void Invoice Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to void invoice',
    });
  }
});

module.exports = router;
