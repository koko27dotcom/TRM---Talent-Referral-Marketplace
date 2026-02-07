/**
 * Admin Controller
 * "God Mode" dashboard controller for platform administration
 * Provides comprehensive admin dashboard stats, user management, and payout processing
 */

const mongoose = require('mongoose');
const {
  User,
  Company,
  Job,
  Referral,
  PayoutRequest,
  BillingRecord,
  AuditLog,
  Subscription,
} = require('../models/index.js');
const { PAYOUT_STATUS } = require('../models/PayoutRequest.js');
const { asyncHandler, ValidationError, NotFoundError } = require('../middleware/errorHandler.js');

/**
 * Get comprehensive admin dashboard statistics
 * @route GET /api/v1/admin/dashboard
 * @access Private (Admin)
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  const { period = '30d' } = req.query;
  
  // Calculate date range based on period
  const now = new Date();
  const periodMap = {
    '24h': 1,
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365,
  };
  const days = periodMap[period] || 30;
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  
  // Run all aggregations in parallel for performance
  const [
    userStats,
    companyStats,
    jobStats,
    referralStats,
    payoutStats,
    billingStats,
    recentActivity,
    pendingPayouts,
  ] = await Promise.all([
    // User statistics
    User.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          referrers: { $sum: { $cond: [{ $eq: ['$role', 'referrer'] }, 1, 0] } },
          companies: { $sum: { $cond: [{ $in: ['$role', ['corporate_admin', 'corporate_recruiter']] }, 1, 0] } },
          newThisPeriod: {
            $sum: { $cond: [{ $gte: ['$createdAt', startDate] }, 1, 0] },
          },
        },
      },
    ]),
    
    // Company statistics
    Company.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          verified: { $sum: { $cond: [{ $eq: ['$verificationStatus', 'verified'] }, 1, 0] } },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          newThisPeriod: {
            $sum: { $cond: [{ $gte: ['$createdAt', startDate] }, 1, 0] },
          },
        },
      },
    ]),
    
    // Job statistics
    Job.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          totalReferralBonus: { $sum: '$referralBonus' },
          newThisPeriod: {
            $sum: { $cond: [{ $gte: ['$createdAt', startDate] }, 1, 0] },
          },
        },
      },
    ]),
    
    // Referral statistics
    Referral.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          hired: { $sum: { $cond: [{ $eq: ['$status', 'hired'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] } },
          inProgress: {
            $sum: {
              $cond: [
                { $in: ['$status', ['under_review', 'shortlisted', 'interview_scheduled', 'interview_completed', 'offer_extended']] },
                1,
                0,
              ],
            },
          },
          totalReferrerPayout: { $sum: '$referrerPayout' },
          totalPlatformCommission: { $sum: '$platformCommission' },
          newThisPeriod: {
            $sum: { $cond: [{ $gte: ['$submittedAt', startDate] }, 1, 0] },
          },
        },
      },
    ]),
    
    // Payout statistics
    PayoutRequest.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', PAYOUT_STATUS.PENDING] }, 1, 0] } },
          approved: { $sum: { $cond: [{ $eq: ['$status', PAYOUT_STATUS.APPROVED] }, 1, 0] } },
          paid: { $sum: { $cond: [{ $eq: ['$status', PAYOUT_STATUS.PAID] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', PAYOUT_STATUS.REJECTED] }, 1, 0] } },
          totalPaidAmount: {
            $sum: { $cond: [{ $eq: ['$status', PAYOUT_STATUS.PAID] }, '$amount', 0] },
          },
          totalPendingAmount: {
            $sum: {
              $cond: [
                { $in: ['$status', [PAYOUT_STATUS.PENDING, PAYOUT_STATUS.APPROVED, PAYOUT_STATUS.PROCESSING]] },
                '$amount',
                0,
              ],
            },
          },
        },
      },
    ]),
    
    // Billing statistics
    BillingRecord.aggregate([
      {
        $match: { status: { $in: ['paid', 'pending'] } },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          paidRevenue: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$totalAmount', 0] } },
          pendingRevenue: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$totalAmount', 0] } },
          totalInvoices: { $sum: 1 },
          paidInvoices: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
        },
      },
    ]),
    
    // Recent activity (audit logs)
    AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('user', 'name email')
      .populate('companyId', 'name'),
    
    // Pending payouts with referrer details
    PayoutRequest.find({ status: PAYOUT_STATUS.PENDING })
      .sort({ requestedAt: 1 })
      .limit(10)
      .populate('referrerId', 'name email phone referrerProfile'),
  ]);
  
  // Calculate conversion rate
  const referralData = referralStats[0] || { total: 0, hired: 0 };
  const conversionRate = referralData.total > 0 
    ? ((referralData.hired / referralData.total) * 100).toFixed(2)
    : 0;
  
  // Calculate average time to hire
  const hiredReferrals = await Referral.find({ 
    status: 'hired',
    hiredAt: { $ne: null },
    submittedAt: { $ne: null },
  }).limit(100);
  
  let avgTimeToHire = 0;
  if (hiredReferrals.length > 0) {
    const totalDays = hiredReferrals.reduce((sum, r) => {
      const days = Math.ceil((new Date(r.hiredAt) - new Date(r.submittedAt)) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);
    avgTimeToHire = Math.round(totalDays / hiredReferrals.length);
  }
  
  res.json({
    success: true,
    data: {
      period,
      kpis: {
        // Financial KPIs
        totalRevenue: billingStats[0]?.totalRevenue || 0,
        paidRevenue: billingStats[0]?.paidRevenue || 0,
        pendingRevenue: billingStats[0]?.pendingRevenue || 0,
        totalPaidReferrals: payoutStats[0]?.totalPaidAmount || 0,
        pendingPayouts: payoutStats[0]?.totalPendingAmount || 0,
        totalPlatformFees: referralStats[0]?.totalPlatformCommission || 0,
        
        // User KPIs
        totalUsers: userStats[0]?.total || 0,
        activeUsers: userStats[0]?.active || 0,
        newUsersThisPeriod: userStats[0]?.newThisPeriod || 0,
        totalReferrers: userStats[0]?.referrers || 0,
        totalCorporateUsers: userStats[0]?.companies || 0,
        
        // Company KPIs
        totalCompanies: companyStats[0]?.total || 0,
        verifiedCompanies: companyStats[0]?.verified || 0,
        newCompaniesThisPeriod: companyStats[0]?.newThisPeriod || 0,
        
        // Job KPIs
        totalJobs: jobStats[0]?.total || 0,
        activeJobs: jobStats[0]?.active || 0,
        newJobsThisPeriod: jobStats[0]?.newThisPeriod || 0,
        totalReferralPool: jobStats[0]?.totalReferralBonus || 0,
        
        // Referral KPIs
        totalReferrals: referralStats[0]?.total || 0,
        hiredReferrals: referralStats[0]?.hired || 0,
        pendingReferrals: referralStats[0]?.pending || 0,
        inProgressReferrals: referralStats[0]?.inProgress || 0,
        newReferralsThisPeriod: referralStats[0]?.newThisPeriod || 0,
        conversionRate: parseFloat(conversionRate),
        avgTimeToHire,
        totalReferrerPayouts: referralStats[0]?.totalReferrerPayout || 0,
        
        // Payout KPIs
        totalPayoutRequests: payoutStats[0]?.total || 0,
        pendingPayoutCount: payoutStats[0]?.pending || 0,
        approvedPayoutCount: payoutStats[0]?.approved || 0,
        paidPayoutCount: payoutStats[0]?.paid || 0,
        rejectedPayoutCount: payoutStats[0]?.rejected || 0,
      },
      pendingPayouts: pendingPayouts.map(p => ({
        id: p._id,
        requestNumber: p.requestNumber,
        referrer: {
          id: p.referrerId?._id,
          name: p.referrerId?.name,
          email: p.referrerId?.email,
          phone: p.referrerId?.phone,
        },
        amount: p.amount,
        currency: p.currency,
        paymentMethod: p.paymentMethod,
        requestedAt: p.requestedAt,
        daysPending: Math.ceil((new Date() - new Date(p.requestedAt)) / (1000 * 60 * 60 * 24)),
      })),
      recentActivity: recentActivity.map(log => ({
        id: log._id,
        action: log.action,
        description: log.description,
        user: log.user ? { name: log.user.name, email: log.user.email } : null,
        company: log.companyId ? { name: log.companyId.name } : null,
        severity: log.severity,
        timestamp: log.createdAt,
      })),
      alerts: generateAlerts({
        pendingPayouts: payoutStats[0]?.pending || 0,
        pendingRevenue: billingStats[0]?.pendingRevenue || 0,
        avgTimeToHire,
        conversionRate: parseFloat(conversionRate),
      }),
    },
  });
});

/**
 * Generate system alerts based on metrics
 */
function generateAlerts(metrics) {
  const alerts = [];
  
  if (metrics.pendingPayouts > 10) {
    alerts.push({
      type: 'warning',
      category: 'payouts',
      message: `High number of pending payouts: ${metrics.pendingPayouts} requests awaiting processing`,
      severity: 'high',
    });
  }
  
  if (metrics.pendingRevenue > 10000000) {
    alerts.push({
      type: 'info',
      category: 'billing',
      message: `Outstanding revenue: ${(metrics.pendingRevenue / 1000000).toFixed(2)}M MMK pending payment`,
      severity: 'medium',
    });
  }
  
  if (metrics.avgTimeToHire > 45) {
    alerts.push({
      type: 'warning',
      category: 'performance',
      message: `Average time to hire is ${metrics.avgTimeToHire} days - above target of 45 days`,
      severity: 'medium',
    });
  }
  
  if (metrics.conversionRate < 20) {
    alerts.push({
      type: 'warning',
      category: 'performance',
      message: `Low conversion rate: ${metrics.conversionRate}% - review hiring process`,
      severity: 'high',
    });
  }
  
  return alerts;
}

/**
 * Get detailed pending payouts list
 * @route GET /api/v1/admin/payouts/pending
 * @access Private (Admin)
 */
const getPendingPayouts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, status = PAYOUT_STATUS.PENDING } = req.query;
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const query = status === 'all' 
    ? { status: { $in: [PAYOUT_STATUS.PENDING, PAYOUT_STATUS.APPROVED] } }
    : { status };
  
  const [payouts, total] = await Promise.all([
    PayoutRequest.find(query)
      .populate('referrerId', 'name email phone referrerProfile')
      .sort({ requestedAt: 1 })
      .skip(skip)
      .limit(parseInt(limit)),
    PayoutRequest.countDocuments(query),
  ]);
  
  res.json({
    success: true,
    data: {
      payouts: payouts.map(p => ({
        id: p._id,
        requestNumber: p.requestNumber,
        referrer: {
          id: p.referrerId?._id,
          name: p.referrerId?.name,
          email: p.referrerId?.email,
          phone: p.referrerId?.phone,
          kycStatus: p.referrerId?.referrerProfile?.kycStatus,
          availableBalance: p.referrerId?.referrerProfile?.availableBalance,
        },
        amount: p.amount,
        currency: p.currency,
        paymentMethod: p.paymentMethod,
        status: p.status,
        referrals: p.referrals,
        requestedAt: p.requestedAt,
        approvedAt: p.approvedAt,
        paidAt: p.paidAt,
        notes: p.notes,
        adminNotes: p.adminNotes,
        daysPending: Math.ceil((new Date() - new Date(p.requestedAt)) / (1000 * 60 * 60 * 24)),
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

/**
 * Batch process payouts
 * @route POST /api/v1/admin/payouts/process
 * @access Private (Admin)
 */
const batchProcessPayouts = asyncHandler(async (req, res) => {
  const { payoutIds, action, paymentInfo = {} } = req.body;
  
  if (!payoutIds || !Array.isArray(payoutIds) || payoutIds.length === 0) {
    throw new ValidationError('Please provide an array of payout IDs');
  }
  
  if (!action || !['approve', 'reject', 'mark_paid'].includes(action)) {
    throw new ValidationError('Invalid action. Must be approve, reject, or mark_paid');
  }
  
  const results = {
    processed: [],
    failed: [],
    totalProcessed: 0,
    totalAmount: 0,
  };
  
  // Process each payout
  for (const payoutId of payoutIds) {
    try {
      const payout = await PayoutRequest.findById(payoutId)
        .populate('referrerId', 'name email referrerProfile');
      
      if (!payout) {
        results.failed.push({ id: payoutId, error: 'Payout not found' });
        continue;
      }
      
      switch (action) {
        case 'approve':
          if (payout.status !== PAYOUT_STATUS.PENDING) {
            results.failed.push({ id: payoutId, error: `Cannot approve payout in ${payout.status} status` });
            continue;
          }
          await payout.approve(req.user._id, { notes: paymentInfo.notes || 'Batch approved' });
          results.processed.push({
            id: payoutId,
            requestNumber: payout.requestNumber,
            amount: payout.amount,
            action: 'approved',
          });
          results.totalAmount += payout.amount;
          break;
          
        case 'reject':
          if (![PAYOUT_STATUS.PENDING, PAYOUT_STATUS.APPROVED].includes(payout.status)) {
            results.failed.push({ id: payoutId, error: `Cannot reject payout in ${payout.status} status` });
            continue;
          }
          await payout.reject(req.user._id, paymentInfo.reason || 'Batch rejected');
          results.processed.push({
            id: payoutId,
            requestNumber: payout.requestNumber,
            amount: payout.amount,
            action: 'rejected',
          });
          break;
          
        case 'mark_paid':
          if (payout.status !== PAYOUT_STATUS.APPROVED && payout.status !== PAYOUT_STATUS.PROCESSING) {
            results.failed.push({ id: payoutId, error: `Payout must be approved or processing to mark as paid. Current status: ${payout.status}` });
            continue;
          }
          
          // Start processing if not already
          if (payout.status === PAYOUT_STATUS.APPROVED) {
            await payout.startProcessing(req.user._id);
          }
          
          // Mark as paid
          await payout.markAsPaid({
            transactionId: paymentInfo.transactionId || `BATCH-${Date.now()}`,
            receiptUrl: paymentInfo.receiptUrl,
            notes: paymentInfo.notes || 'Batch payment processed',
          });
          
          // Update referrer's available balance
          const referrer = await User.findById(payout.referrerId);
          if (referrer && referrer.referrerProfile) {
            referrer.referrerProfile.availableBalance -= payout.amount;
            referrer.referrerProfile.totalEarnings += payout.amount;
            await referrer.save();
          }
          
          results.processed.push({
            id: payoutId,
            requestNumber: payout.requestNumber,
            amount: payout.amount,
            action: 'paid',
            transactionId: paymentInfo.transactionId || `BATCH-${Date.now()}`,
          });
          results.totalAmount += payout.amount;
          break;
      }
      
      results.totalProcessed++;
      
    } catch (error) {
      results.failed.push({ id: payoutId, error: error.message });
    }
  }
  
  // Log batch action
  await AuditLog.logUserAction({
    user: req.user,
    action: `batch_payout_${action}`,
    entityType: 'payout',
    description: `Batch ${action} executed on ${results.totalProcessed} payouts totaling ${results.totalAmount.toLocaleString()} MMK`,
    req,
    severity: results.failed.length > 0 ? 'warning' : 'info',
    metadata: {
      action,
      totalProcessed: results.totalProcessed,
      totalFailed: results.failed.length,
      totalAmount: results.totalAmount,
    },
  });
  
  res.json({
    success: true,
    message: `Batch ${action} completed`,
    data: results,
  });
});

/**
 * Get all users with optional filtering
 * @route GET /api/v1/admin/users
 * @access Private (Admin)
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 50, 
    search, 
    role, 
    status = 'active',
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;
  
  const query = {};
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  
  if (role) query.role = role;
  if (status) query.status = status;
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  
  const [users, total] = await Promise.all([
    User.find(query)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit)),
    User.countDocuments(query),
  ]);
  
  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

/**
 * Get all companies with optional filtering
 * @route GET /api/v1/admin/companies
 * @access Private (Admin)
 */
const getAllCompanies = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    search,
    status,
    verificationStatus,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;
  
  const query = {};
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  
  if (status) query.status = status;
  if (verificationStatus) query.verificationStatus = verificationStatus;
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  
  const [companies, total] = await Promise.all([
    Company.find(query)
      .populate('subscriptionId', 'plan status')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit)),
    Company.countDocuments(query),
  ]);
  
  res.json({
    success: true,
    data: {
      companies,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

/**
 * Get platform revenue analytics
 * @route GET /api/v1/admin/revenue
 * @access Private (Admin)
 */
const getRevenueAnalytics = asyncHandler(async (req, res) => {
  const { period = '30d', groupBy = 'day' } = req.query;
  
  const now = new Date();
  const days = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }[period] || 30;
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  
  const groupFormat = groupBy === 'month' 
    ? { $dateToString: { format: '%Y-%m', date: '$createdAt' } }
    : { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
  
  const [revenueData, subscriptionRevenue] = await Promise.all([
    // Billing revenue
    BillingRecord.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: 'paid',
        },
      },
      {
        $group: {
          _id: groupFormat,
          total: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    
    // Platform commission from referrals
    Referral.aggregate([
      {
        $match: {
          hiredAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: groupFormat,
          commission: { $sum: '$platformCommission' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);
  
  res.json({
    success: true,
    data: {
      period,
      groupBy,
      revenueByPeriod: revenueData,
      commissionByPeriod: subscriptionRevenue,
    },
  });
});

/**
 * Update user status (suspend/activate)
 * @route PATCH /api/v1/admin/users/:id/status
 * @access Private (Admin)
 */
const updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;
  
  if (!['active', 'suspended'].includes(status)) {
    throw new ValidationError('Status must be active or suspended');
  }
  
  const user = await User.findById(id);
  if (!user) {
    throw new NotFoundError('User');
  }
  
  user.status = status;
  await user.save();
  
  await AuditLog.logUserAction({
    user: req.user,
    action: `user_${status}`,
    entityType: 'user',
    entityId: user._id,
    description: `User ${user.email} ${status}. Reason: ${reason || 'Not provided'}`,
    req,
    severity: status === 'suspended' ? 'warning' : 'info',
    metadata: { previousStatus: user.status, reason },
  });
  
  res.json({
    success: true,
    message: `User ${status} successfully`,
    data: { user: { id: user._id, name: user.name, email: user.email, status: user.status } },
  });
});

module.exports = {
  getDashboardStats,
  getPendingPayouts,
  batchProcessPayouts,
  getAllUsers,
  getAllCompanies,
  getRevenueAnalytics,
  updateUserStatus,
};
