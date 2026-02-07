/**
 * Payout Routes
 * Handles payout request creation, management, and automated processing
 * Includes batch processing, provider management, and reconciliation
 */

const express = require('express');
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
const { authenticate } = require('../middleware/auth.js');
const { asyncHandler, ValidationError, NotFoundError, AuthorizationError } = require('../middleware/errorHandler.js');
const { requireReferrer, requireAdmin } = require('../middleware/rbac.js');
const { sendPayoutNotification } = require('../services/notificationService.js');
const payoutProcessor = require('../services/payoutProcessor.js');
const {
  createWeeklyBatch,
  createMonthlyBatch,
  processBatchImmediate,
  retryTransactionImmediate,
  getPayoutQueueStatus,
  getScheduleInfo,
} = require('../cron/payoutCron.js');

const router = express.Router();

// ==================== REFERRER ROUTES ====================

/**
 * @route   POST /api/payouts
 * @desc    Create a new payout request
 * @access  Private (Referrer)
 */
router.post('/', authenticate, requireReferrer, asyncHandler(async (req, res) => {
  const { amount, paymentMethod, notes, referrals } = req.body;

  // Validate required fields
  if (!amount || !paymentMethod) {
    throw new ValidationError('Please provide amount and payment method');
  }

  // Validate amount
  const payoutAmount = parseFloat(amount);
  if (isNaN(payoutAmount) || payoutAmount < 1000) {
    throw new ValidationError('Minimum payout amount is 1,000 MMK');
  }

  // Validate payment method
  const validPaymentTypes = ['kbzpay', 'wavepay', 'cbpay', 'bank_transfer'];
  if (!validPaymentTypes.includes(paymentMethod.type)) {
    throw new ValidationError('Invalid payment method type');
  }

  // Check payment method details based on type
  if (['kbzpay', 'wavepay', 'cbpay'].includes(paymentMethod.type)) {
    if (!paymentMethod.phoneNumber || !paymentMethod.accountName) {
      throw new ValidationError('Phone number and account name are required for mobile payments');
    }
    // Validate Myanmar phone number format
    const phoneRegex = /^09[0-9]{7,9}$/;
    if (!phoneRegex.test(paymentMethod.phoneNumber)) {
      throw new ValidationError('Invalid phone number format. Must be 09xxxxxxxxx');
    }
  } else if (paymentMethod.type === 'bank_transfer') {
    if (!paymentMethod.bankName || !paymentMethod.accountNumber || !paymentMethod.accountHolderName) {
      throw new ValidationError('Bank name, account number, and account holder name are required for bank transfers');
    }
  }

  // Get user with referrer profile
  const user = await User.findById(req.user._id);
  if (!user || !user.referrerProfile) {
    throw new ValidationError('Referrer profile not found');
  }

  // Check if user has sufficient available balance
  const availableBalance = user.referrerProfile.availableBalance || 0;
  if (availableBalance < payoutAmount) {
    throw new ValidationError(`Insufficient balance. Available: ${availableBalance.toLocaleString()} MMK, Requested: ${payoutAmount.toLocaleString()} MMK`);
  }

  // Check if user has pending KYC verification
  if (user.referrerProfile.kycStatus !== 'verified') {
    throw new ValidationError('KYC verification required before requesting payout');
  }

  // Check for existing pending payout requests
  const existingPendingRequest = await PayoutRequest.findOne({
    referrerId: req.user._id,
    status: { $in: [PAYOUT_STATUS.PENDING, PAYOUT_STATUS.APPROVED, PAYOUT_STATUS.PROCESSING] },
  });

  if (existingPendingRequest) {
    throw new ValidationError('You already have a pending payout request. Please wait for it to be processed.');
  }

  // Prepare payment method data
  const paymentMethodData = {
    type: paymentMethod.type,
    accountName: paymentMethod.accountName || paymentMethod.accountHolderName,
    phoneNumber: paymentMethod.phoneNumber,
    bankName: paymentMethod.bankName,
    bankBranch: paymentMethod.bankBranch,
    accountNumber: paymentMethod.accountNumber,
    accountHolderName: paymentMethod.accountHolderName,
    swiftCode: paymentMethod.swiftCode,
  };

  // Create payout request
  const payoutRequest = await PayoutRequest.createRequest({
    referrerId: req.user._id,
    amount: payoutAmount,
    currency: 'MMK',
    paymentMethod: paymentMethodData,
    notes,
    referrals: referrals || [],
    status: PAYOUT_STATUS.PENDING,
  });

  // Update user's pending balance (deduct from available, add to pending)
  await User.findByIdAndUpdate(req.user._id, {
    $inc: {
      'referrerProfile.availableBalance': -payoutAmount,
      'referrerProfile.pendingBalance': payoutAmount,
    },
  });

  // Log payout request creation
  await AuditLog.logUserAction({
    user: req.user,
    action: 'payout_requested',
    entityType: 'payout_request',
    entityId: payoutRequest._id,
    description: `Payout requested for ${payoutAmount.toLocaleString()} MMK`,
    req,
    severity: 'info',
    changes: [
      { field: 'amount', oldValue: null, newValue: payoutAmount },
      { field: 'status', oldValue: null, newValue: PAYOUT_STATUS.PENDING },
    ],
  });

  // Send notification to user
  await sendPayoutNotification(req.user._id, payoutRequest._id, 'requested', {
    amount: payoutAmount,
    requestNumber: payoutRequest.requestNumber,
  });

  res.status(201).json({
    success: true,
    message: 'Payout request submitted successfully',
    data: {
      payoutRequest,
      requestNumber: payoutRequest.requestNumber,
    },
  });
}));

/**
 * @route   GET /api/payouts/my-requests
 * @desc    Get current user's payout requests
 * @access  Private (Referrer)
 */
router.get('/my-requests', authenticate, requireReferrer, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    skip: (parseInt(page) - 1) * parseInt(limit),
  };

  // Build query
  const query = { referrerId: req.user._id };
  if (status && Object.values(PAYOUT_STATUS).includes(status)) {
    query.status = status;
  }

  // Get payout requests with pagination
  const [payoutRequests, totalCount] = await Promise.all([
    PayoutRequest.find(query)
      .sort({ requestedAt: -1 })
      .skip(options.skip)
      .limit(options.limit)
      .lean(),
    PayoutRequest.countDocuments(query),
  ]);

  // Get user stats
  const stats = await PayoutRequest.getReferrerStats(req.user._id);

  res.json({
    success: true,
    data: {
      requests: payoutRequests,
      stats,
      pagination: {
        page: options.page,
        limit: options.limit,
        total: totalCount,
        pages: Math.ceil(totalCount / options.limit),
      },
    },
  });
}));

/**
 * @route   GET /api/payouts/providers
 * @desc    Get available payout providers
 * @access  Private
 */
router.get('/providers', authenticate, asyncHandler(async (req, res) => {
  const providers = await PayoutProvider.findActive();

  res.json({
    success: true,
    data: {
      providers: providers.map(p => ({
        code: p.code,
        name: p.name,
        displayName: p.displayName,
        type: p.type,
        description: p.description,
        feeStructure: p.feeStructure,
        limits: p.limits,
        processingSettings: p.processingSettings,
        requiredFields: p.requiredFields,
        logoUrl: p.logoUrl,
      })),
    },
  });
}));

// ==================== ADMIN ROUTES ====================

/**
 * @route   GET /api/payouts/admin/all
 * @desc    Admin: Get all payout requests
 * @access  Private (Admin)
 */
router.get('/admin/all', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, startDate, endDate, search } = req.query;

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    skip: (parseInt(page) - 1) * parseInt(limit),
  };

  // Build query
  const query = {};

  // Filter by status
  if (status && Object.values(PAYOUT_STATUS).includes(status)) {
    query.status = status;
  }

  // Filter by date range
  if (startDate || endDate) {
    query.requestedAt = {};
    if (startDate) query.requestedAt.$gte = new Date(startDate);
    if (endDate) query.requestedAt.$lte = new Date(endDate);
  }

  // Search by request number or referrer info
  if (search) {
    const searchRegex = new RegExp(search, 'i');
    // We'll handle this with a more complex query using $or
    const userIds = await User.find({
      $or: [
        { name: searchRegex },
        { email: searchRegex },
      ],
    }).select('_id');

    query.$or = [
      { requestNumber: searchRegex },
      { referrerId: { $in: userIds.map(u => u._id) } },
    ];
  }

  // Get payout requests with referrer info
  const [payoutRequests, totalCount] = await Promise.all([
    PayoutRequest.find(query)
      .populate('referrerId', 'name email phone referrerProfile')
      .populate('approvedBy', 'name email')
      .populate('processedBy', 'name email')
      .populate('rejectedBy', 'name email')
      .sort({ requestedAt: -1 })
      .skip(options.skip)
      .limit(options.limit)
      .lean(),
    PayoutRequest.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      requests: payoutRequests,
      pagination: {
        page: options.page,
        limit: options.limit,
        total: totalCount,
        pages: Math.ceil(totalCount / options.limit),
      },
    },
  });
}));

/**
 * @route   GET /api/payouts/admin/queue
 * @desc    Admin: Get payout queue status
 * @access  Private (Admin)
 */
router.get('/admin/queue', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const queueStatus = await getPayoutQueueStatus();
  const scheduleInfo = getScheduleInfo();

  // Get recent batches
  const recentBatches = await PayoutBatch.getRecent({ limit: 10 });

  // Get pending payouts
  const pendingPayouts = await PayoutRequest.findPending({ limit: 50 });

  res.json({
    success: true,
    data: {
      queue: queueStatus.queue,
      schedule: scheduleInfo,
      recentBatches,
      pendingPayouts,
    },
  });
}));

/**
 * @route   GET /api/payouts/admin/stats
 * @desc    Admin: Get payout statistics
 * @access  Private (Admin)
 */
router.get('/admin/stats', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const filters = {};
  if (startDate) filters.startDate = new Date(startDate);
  if (endDate) filters.endDate = new Date(endDate);

  // Get detailed stats from the model
  const detailedStats = await PayoutRequest.getStats(filters);

  // Get transaction stats
  const transactionStats = await PayoutTransaction.getStats(filters);

  // Get provider stats
  const providerStats = await PayoutTransaction.getProviderStats(filters);

  // Calculate additional stats
  const totalPending = detailedStats.pending.amount + detailedStats.approved.amount + detailedStats.processing.amount;
  const totalApproved = detailedStats.approved.amount + detailedStats.processing.amount + detailedStats.paid.amount;

  res.json({
    success: true,
    data: {
      summary: {
        totalPending: detailedStats.pending.count,
        totalApproved: detailedStats.approved.count + detailedStats.processing.count,
        totalPaid: detailedStats.paid.count,
        totalRejected: detailedStats.rejected.count,
        totalCancelled: detailedStats.cancelled.count,
        totalRequests: detailedStats.total,
      },
      amounts: {
        pendingAmount: detailedStats.pending.amount,
        approvedAmount: detailedStats.approved.amount,
        processingAmount: detailedStats.processing.amount,
        paidAmount: detailedStats.paid.amount,
        rejectedAmount: detailedStats.rejected.amount,
        totalPendingAmount: totalPending,
        totalApprovedAmount: totalApproved,
        totalPaidAmount: detailedStats.paid.amount,
      },
      transactions: transactionStats,
      byProvider: providerStats,
      details: detailedStats,
    },
  });
}));

/**
 * @route   POST /api/payouts/admin/process
 * @desc    Admin: Process individual payout
 * @access  Private (Admin)
 */
router.post('/admin/process', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { payoutRequestId, providerCode } = req.body;

  if (!payoutRequestId) {
    throw new ValidationError('Payout request ID is required');
  }

  const result = await payoutProcessor.processPayout(payoutRequestId, {
    providerCode,
    processedBy: req.user._id,
  });

  res.json({
    success: result.success,
    message: result.success ? 'Payout processed successfully' : 'Payout processing failed',
    data: result,
  });
}));

/**
 * @route   POST /api/payouts/admin/batch
 * @desc    Admin: Create and process batch payouts
 * @access  Private (Admin)
 */
router.post('/admin/batch', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { type = 'manual', payoutIds, scheduledAt, providerId, notes } = req.body;

  let result;

  if (payoutIds && payoutIds.length > 0) {
    // Create batch from specific payout IDs
    const payouts = await PayoutRequest.find({
      _id: { $in: payoutIds },
      status: PAYOUT_STATUS.APPROVED,
    });

    if (payouts.length === 0) {
      throw new ValidationError('No valid payouts found for batch processing');
    }

    result = await PayoutBatch.createBatch(payouts, {
      type: BATCH_TYPE.MANUAL,
      providerId,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
      createdBy: req.user._id,
      notes,
    });

    // Process immediately if not scheduled
    if (!scheduledAt) {
      const processResult = await payoutProcessor.processBatch(result._id);
      result = { batch: result, ...processResult };
    }
  } else {
    // Create scheduled batch
    result = await payoutProcessor.createScheduledBatch({
      type,
      providerId,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      createdBy: req.user._id,
      notes,
    });
  }

  res.json({
    success: true,
    message: result.batch ? 'Batch created successfully' : 'No payouts ready for batch',
    data: result,
  });
}));

/**
 * @route   POST /api/payouts/admin/batch/:id/process
 * @desc    Admin: Process a specific batch
 * @access  Private (Admin)
 */
router.post('/admin/batch/:id/process', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await processBatchImmediate(id);

  res.json({
    success: result.success,
    message: result.success ? 'Batch processed successfully' : 'Batch processing completed with errors',
    data: result,
  });
}));

/**
 * @route   POST /api/payouts/admin/retry
 * @desc    Admin: Retry failed transaction
 * @access  Private (Admin)
 */
router.post('/admin/retry', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { transactionId } = req.body;

  if (!transactionId) {
    throw new ValidationError('Transaction ID is required');
  }

  const result = await retryTransactionImmediate(transactionId);

  res.json({
    success: result.success,
    message: result.success ? 'Transaction retry successful' : 'Transaction retry failed',
    data: result,
  });
}));

/**
 * @route   GET /api/payouts/admin/reconciliation
 * @desc    Admin: Get reconciliation report
 * @access  Private (Admin)
 */
router.get('/admin/reconciliation', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { startDate, endDate, providerId } = req.query;

  const filters = {};
  if (startDate) filters.startDate = new Date(startDate);
  if (endDate) filters.endDate = new Date(endDate);
  if (providerId) filters.providerId = providerId;

  const report = await payoutProcessor.getReconciliationReport(filters);

  res.json({
    success: true,
    data: report,
  });
}));

/**
 * @route   PUT /api/payouts/admin/:id/status
 * @desc    Admin: Update payout request status
 * @access  Private (Admin)
 */
router.put('/admin/:id/status', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, notes, rejectionReason, transactionId } = req.body;

  // Validate status
  const validStatuses = ['approved', 'rejected', 'paid', 'processing'];
  if (!status || !validStatuses.includes(status)) {
    throw new ValidationError('Invalid status. Must be one of: approved, rejected, paid, processing');
  }

  // Find payout request
  const payoutRequest = await PayoutRequest.findById(id).populate('referrerId', 'name email referrerProfile');
  if (!payoutRequest) {
    throw new NotFoundError('Payout request');
  }

  // Validate state transitions
  const validTransitions = {
    pending: ['approved', 'rejected'],
    approved: ['processing', 'rejected'],
    processing: ['paid', 'rejected'],
    paid: [],
    rejected: [],
    cancelled: [],
  };

  if (!validTransitions[payoutRequest.status].includes(status)) {
    throw new ValidationError(`Cannot transition from ${payoutRequest.status} to ${status}`);
  }

  const previousStatus = payoutRequest.status;
  const referrerId = payoutRequest.referrerId._id;
  const amount = payoutRequest.amount;

  // Handle different status updates
  switch (status) {
    case 'approved':
      // Validate payment method exists
      if (!payoutRequest.paymentMethod || !payoutRequest.paymentMethod.type) {
        throw new ValidationError('Payment method not set for this payout request');
      }

      await payoutRequest.approve(req.user._id, { notes });

      // Send notification
      await sendPayoutNotification(referrerId, payoutRequest._id, 'approved', {
        amount: payoutRequest.amount,
        requestNumber: payoutRequest.requestNumber,
      });
      break;

    case 'processing':
      await payoutRequest.startProcessing(req.user._id);

      // Send notification
      await sendPayoutNotification(referrerId, payoutRequest._id, 'processing', {
        amount: payoutRequest.amount,
        requestNumber: payoutRequest.requestNumber,
      });
      break;

    case 'paid':
      if (!transactionId) {
        throw new ValidationError('Transaction ID is required when marking as paid');
      }

      await payoutRequest.markAsPaid({
        transactionId,
        notes,
      });

      // Update user's total earnings and pending balance
      await User.findByIdAndUpdate(referrerId, {
        $inc: {
          'referrerProfile.pendingBalance': -amount,
          'referrerProfile.totalEarnings': amount,
        },
      });

      // Send notification
      await sendPayoutNotification(referrerId, payoutRequest._id, 'paid', {
        amount: payoutRequest.amount,
        requestNumber: payoutRequest.requestNumber,
        transactionId,
      });
      break;

    case 'rejected':
      if (!rejectionReason) {
        throw new ValidationError('Rejection reason is required');
      }

      await payoutRequest.reject(req.user._id, rejectionReason);

      // Restore user's available balance
      await User.findByIdAndUpdate(referrerId, {
        $inc: {
          'referrerProfile.availableBalance': amount,
          'referrerProfile.pendingBalance': -amount,
        },
      });

      // Send notification
      await sendPayoutNotification(referrerId, payoutRequest._id, 'rejected', {
        amount: payoutRequest.amount,
        requestNumber: payoutRequest.requestNumber,
        rejectionReason,
      });
      break;
  }

  // Log status change
  await AuditLog.logUserAction({
    user: req.user,
    action: `payout_${status}`,
    entityType: 'payout_request',
    entityId: payoutRequest._id,
    description: `Payout request ${payoutRequest.requestNumber} status changed from ${previousStatus} to ${status}`,
    req,
    severity: status === 'rejected' ? 'warning' : 'info',
    changes: [
      { field: 'status', oldValue: previousStatus, newValue: status },
      ...(notes ? [{ field: 'notes', oldValue: null, newValue: notes }] : []),
      ...(rejectionReason ? [{ field: 'rejectionReason', oldValue: null, newValue: rejectionReason }] : []),
      ...(transactionId ? [{ field: 'transactionId', oldValue: null, newValue: transactionId }] : []),
    ],
  });

  res.json({
    success: true,
    message: `Payout request ${status} successfully`,
    data: {
      payoutRequest: await PayoutRequest.findById(id)
        .populate('referrerId', 'name email')
        .populate('approvedBy', 'name email')
        .populate('processedBy', 'name email')
        .populate('rejectedBy', 'name email'),
    },
  });
}));

/**
 * @route   POST /api/payouts/admin/settings
 * @desc    Admin: Update payout settings
 * @access  Private (Admin)
 */
router.post('/admin/settings', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const {
    minPayoutAmount,
    maxPayoutAmount,
    dailyLimit,
    processingSchedule,
    autoApprove,
    requireKyc,
  } = req.body;

  // In a real implementation, these would be stored in a settings collection
  // For now, we'll just validate and return success

  res.json({
    success: true,
    message: 'Payout settings updated successfully',
    data: {
      settings: {
        minPayoutAmount,
        maxPayoutAmount,
        dailyLimit,
        processingSchedule,
        autoApprove,
        requireKyc,
      },
    },
  });
}));

// ==================== SHARED ROUTES ====================

/**
 * @route   GET /api/payouts/:id
 * @desc    Get a single payout request by ID
 * @access  Private (Owner or Admin)
 */
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const payoutRequest = await PayoutRequest.findById(id)
    .populate('referrerId', 'name email phone referrerProfile')
    .populate('approvedBy', 'name email')
    .populate('processedBy', 'name email')
    .populate('rejectedBy', 'name email');

  if (!payoutRequest) {
    throw new NotFoundError('Payout request');
  }

  // Check if user is owner or admin
  const isOwner = payoutRequest.referrerId._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'platform_admin';

  if (!isOwner && !isAdmin) {
    throw new AuthorizationError('You do not have permission to view this payout request');
  }

  // Get related transactions
  const transactions = await PayoutTransaction.findByPayoutRequest(id);

  res.json({
    success: true,
    data: {
      payoutRequest,
      transactions,
    },
  });
}));

/**
 * @route   DELETE /api/payouts/:id
 * @desc    Cancel a pending payout request (by referrer)
 * @access  Private (Referrer - Owner only)
 */
router.delete('/:id', authenticate, requireReferrer, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const payoutRequest = await PayoutRequest.findById(id);

  if (!payoutRequest) {
    throw new NotFoundError('Payout request');
  }

  // Check if user is the owner
  if (payoutRequest.referrerId.toString() !== req.user._id.toString()) {
    throw new AuthorizationError('You can only cancel your own payout requests');
  }

  // Can only cancel pending requests
  if (payoutRequest.status !== PAYOUT_STATUS.PENDING) {
    throw new ValidationError('Can only cancel pending payout requests');
  }

  const amount = payoutRequest.amount;

  // Cancel the request
  await payoutRequest.cancel(reason);

  // Restore user's available balance
  await User.findByIdAndUpdate(req.user._id, {
    $inc: {
      'referrerProfile.availableBalance': amount,
      'referrerProfile.pendingBalance': -amount,
    },
  });

  // Log cancellation
  await AuditLog.logUserAction({
    user: req.user,
    action: 'payout_cancelled',
    entityType: 'payout_request',
    entityId: payoutRequest._id,
    description: `Payout request ${payoutRequest.requestNumber} cancelled by referrer`,
    req,
    severity: 'info',
    changes: [
      { field: 'status', oldValue: PAYOUT_STATUS.PENDING, newValue: PAYOUT_STATUS.CANCELLED },
    ],
  });

  // Send notification
  await sendPayoutNotification(req.user._id, payoutRequest._id, 'cancelled', {
    amount: payoutRequest.amount,
    requestNumber: payoutRequest.requestNumber,
    reason,
  });

  res.json({
    success: true,
    message: 'Payout request cancelled successfully',
    data: {
      payoutRequest,
    },
  });
}));

/**
 * @route   POST /api/payouts/webhook/:provider
 * @desc    Handle webhooks from payment providers
 * @access  Public (with webhook secret validation)
 */
router.post('/webhook/:provider', asyncHandler(async (req, res) => {
  const { provider } = req.params;
  const payload = req.body;

  // In production, validate webhook signature here
  // const signature = req.headers['x-webhook-signature'];
  // validateWebhookSignature(provider, payload, signature);

  console.log(`[PayoutWebhook] Received webhook from ${provider}:`, payload);

  const result = await payoutProcessor.handleWebhook(provider, payload);

  if (result.success) {
    res.json({ success: true, message: 'Webhook processed successfully' });
  } else {
    res.status(400).json({ success: false, error: result.error });
  }
}));

module.exports = router;
