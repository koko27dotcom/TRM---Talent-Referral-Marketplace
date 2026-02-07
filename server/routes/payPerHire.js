/**
 * Pay-Per-Hire Routes
 * API routes for managing pay-per-hire transactions and billing
 */

const express = require('express');
const { authenticate } = require('../middleware/auth.js');
const { requireRole } = require('../middleware/rbac.js');
const { payPerHireService } = require('../services/payPerHireService.js');
const { billingEngine } = require('../services/billingEngine.js');
const { PayPerHireTransaction } = require('../models/index.js');

const router = express.Router();

/**
 * @route GET /api/pay-per-hire/transactions
 * @desc Get pay-per-hire transactions for company
 * @access Private (Company)
 */
router.get('/transactions', authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        error: 'Only companies can access pay-per-hire transactions',
      });
    }

    const { page = 1, limit = 20, status, startDate, endDate } = req.query;

    const options = {
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
      status,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    };

    const transactions = await payPerHireService.getCompanyTransactions(
      companyId,
      options
    );

    const total = await PayPerHireTransaction.countDocuments({
      companyId,
      ...(status && { status }),
      ...(startDate && { hiredAt: { $gte: new Date(startDate) } }),
      ...(endDate && { hiredAt: { $lte: new Date(endDate) } }),
    });

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get Transactions Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions',
    });
  }
});

/**
 * @route GET /api/pay-per-hire/calculator
 * @desc Calculate estimated pay-per-hire fee
 * @access Private
 */
router.get('/calculator', authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId || req.user._id;
    const { salary } = req.query;

    if (!salary) {
      return res.status(400).json({
        success: false,
        error: 'Salary is required',
      });
    }

    const estimate = await payPerHireService.calculateEstimate(
      companyId,
      parseFloat(salary)
    );

    // Get tier comparison
    const tierComparison = payPerHireService.getTierCalculator(parseFloat(salary));

    res.json({
      success: true,
      data: {
        estimate,
        tierComparison,
      },
    });
  } catch (error) {
    console.error('Calculate Estimate Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate estimate',
    });
  }
});

/**
 * @route POST /api/pay-per-hire/setup
 * @desc Setup pay-per-hire billing for company
 * @access Private (Company)
 */
router.post('/setup', authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        error: 'Only companies can setup pay-per-hire billing',
      });
    }

    const { customRate, billingPreferences } = req.body;

    const result = await payPerHireService.setupPayPerHire(companyId, {
      customRate,
      billingPreferences,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Setup Pay-Per-Hire Error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to setup pay-per-hire billing',
    });
  }
});

/**
 * @route GET /api/pay-per-hire/summary
 * @desc Get pay-per-hire summary for company
 * @access Private (Company)
 */
router.get('/summary', authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        error: 'Only companies can access pay-per-hire summary',
      });
    }

    const { startDate, endDate } = req.query;

    const filters = {};
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    const summary = await payPerHireService.getCompanySummary(companyId, filters);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Get Summary Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch summary',
    });
  }
});

/**
 * @route POST /api/pay-per-hire/transactions/:id/invoice
 * @desc Generate invoice for a transaction
 * @access Private (Company)
 */
router.post('/transactions/:id/invoice', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        error: 'Only companies can generate invoices',
      });
    }

    // Verify transaction belongs to company
    const transaction = await PayPerHireTransaction.findOne({
      _id: id,
      companyId,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
      });
    }

    if (transaction.invoiceId) {
      return res.status(400).json({
        success: false,
        error: 'Invoice already generated for this transaction',
      });
    }

    const result = await payPerHireService.generateInvoice(id);

    res.json({
      success: true,
      data: result,
      message: 'Invoice generated successfully',
    });
  } catch (error) {
    console.error('Generate Invoice Error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to generate invoice',
    });
  }
});

/**
 * @route GET /api/pay-per-hire/rate
 * @desc Get current pay-per-hire rate for company
 * @access Private (Company)
 */
router.get('/rate', authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        error: 'Only companies can access pay-per-hire rate',
      });
    }

    const rate = await payPerHireService.getCompanyRate(companyId);

    res.json({
      success: true,
      data: {
        rate,
        percentage: `${rate}%`,
      },
    });
  } catch (error) {
    console.error('Get Rate Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rate',
    });
  }
});

// ==================== ADMIN ROUTES ====================

/**
 * @route GET /api/pay-per-hire/admin/transactions
 * @desc Get all pay-per-hire transactions (admin only)
 * @access Admin
 */
router.get('/admin/transactions', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 50, status, companyId } = req.query;

    const query = {};
    if (status) query.status = status;
    if (companyId) query.companyId = companyId;

    const transactions = await PayPerHireTransaction.find(query)
      .populate('companyId', 'name email')
      .populate('jobId', 'title')
      .sort({ hiredAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await PayPerHireTransaction.countDocuments(query);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get All Transactions Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions',
    });
  }
});

/**
 * @route GET /api/pay-per-hire/admin/stats
 * @desc Get platform-wide pay-per-hire statistics (admin only)
 * @access Admin
 */
router.get('/admin/stats', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filters = {};
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    const stats = await payPerHireService.getPlatformStats(filters);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get Platform Stats Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch platform statistics',
    });
  }
});

/**
 * @route POST /api/pay-per-hire/admin/transactions
 * @desc Create pay-per-hire transaction manually (admin only)
 * @access Admin
 */
router.post('/admin/transactions', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const {
      companyId,
      jobId,
      hireId,
      candidateId,
      candidateSalary,
      hiredAt,
    } = req.body;

    const result = await payPerHireService.createTransaction({
      companyId,
      jobId,
      hireId,
      candidateId,
      candidateSalary,
      hiredAt,
    });

    res.json({
      success: true,
      data: result,
      message: 'Transaction created successfully',
    });
  } catch (error) {
    console.error('Create Transaction Error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create transaction',
    });
  }
});

/**
 * @route PUT /api/pay-per-hire/admin/transactions/:id/status
 * @desc Update transaction status (admin only)
 * @access Admin
 */
router.put('/admin/transactions/:id/status', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const transaction = await PayPerHireTransaction.findById(id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
      });
    }

    switch (status) {
      case 'paid':
        await payPerHireService.markAsPaid(id, {
          invoiceId: transaction.invoiceId,
          paidAt: new Date(),
        });
        break;
      case 'failed':
        await payPerHireService.markAsFailed(id, reason);
        break;
      default:
        transaction.status = status;
        await transaction.save();
    }

    res.json({
      success: true,
      data: transaction,
      message: 'Transaction status updated',
    });
  } catch (error) {
    console.error('Update Transaction Status Error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update status',
    });
  }
});

/**
 * @route POST /api/pay-per-hire/admin/generate-invoices
 * @desc Generate invoices for pending transactions (admin only)
 * @access Admin
 */
router.post('/admin/generate-invoices', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const pendingTransactions = await payPerHireService.getPendingTransactions();
    const results = [];

    for (const transaction of pendingTransactions) {
      try {
        const result = await payPerHireService.generateInvoice(transaction._id);
        results.push({
          transactionId: transaction._id,
          success: true,
          invoiceId: result.invoice._id,
        });
      } catch (error) {
        results.push({
          transactionId: transaction._id,
          success: false,
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      data: {
        processed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      },
    });
  } catch (error) {
    console.error('Generate Invoices Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate invoices',
    });
  }
});

module.exports = router;
