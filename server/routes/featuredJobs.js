/**
 * Featured Jobs Routes
 * Handles featured job listings, auction/bidding, and management
 * Revenue generator for Phase 2 of TRM platform
 */

const express = require('express');
const { FeaturedJobSlot, Job } = require('../models/index.js');
const { authenticate, optionalAuth } = require('../middleware/auth.js');
const { requireRole } = require('../middleware/rbac.js');
const { asyncHandler, ValidationError, NotFoundError, AuthorizationError } = require('../middleware/errorHandler.js');
const {
  getFeaturedJobsForCarousel,
  placeFeaturedJob,
  bidOnPremiumSlot,
  getAvailableSlots,
  getCompanyFeaturedJobs,
  getSlotPerformanceAnalytics,
  cancelFeaturedListing,
  approveFeaturedJob,
  rejectFeaturedJob,
  processFeaturedSlotPayment,
  getAuctionLeaderboard,
  getFeaturedSlotPricingInfo,
} = require('../services/featuredJobService.js');

const router = express.Router();

/**
 * @route   GET /api/v1/featured-jobs
 * @desc    Get active featured jobs for homepage carousel (public)
 * @access  Public
 */
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const { limit = 10, slotType = 'carousel' } = req.query;
  
  const featuredJobs = await getFeaturedJobsForCarousel({
    limit: parseInt(limit),
    slotType,
  });
  
  res.json({
    success: true,
    data: {
      featuredJobs,
      count: featuredJobs.length,
    },
  });
}));

/**
 * @route   GET /api/v1/featured-jobs/slots
 * @desc    Get available slots for bidding (company)
 * @access  Private (Company)
 */
router.get('/slots', authenticate, requireRole(['company', 'company_admin', 'company_manager']), asyncHandler(async (req, res) => {
  const { slotType = 'carousel' } = req.query;
  
  const availableSlots = await getAvailableSlots(slotType);
  const pricingInfo = getFeaturedSlotPricingInfo();
  
  res.json({
    success: true,
    data: {
      slots: availableSlots,
      pricing: pricingInfo,
    },
  });
}));

/**
 * @route   GET /api/v1/featured-jobs/pricing
 * @desc    Get featured slot pricing information
 * @access  Public
 */
router.get('/pricing', asyncHandler(async (req, res) => {
  const pricingInfo = getFeaturedSlotPricingInfo();
  
  res.json({
    success: true,
    data: pricingInfo,
  });
}));

/**
 * @route   POST /api/v1/featured-jobs/place
 * @desc    Place job as featured (company)
 * @access  Private (Company)
 */
router.post('/place', authenticate, requireRole(['company', 'company_admin', 'company_manager']), asyncHandler(async (req, res) => {
  const {
    jobId,
    slotPosition,
    bidAmount,
    durationDays = 7,
    slotType = 'carousel',
  } = req.body;
  
  // Validate required fields
  if (!jobId || !slotPosition || !bidAmount) {
    throw new ValidationError('Job ID, slot position, and bid amount are required');
  }
  
  const companyId = req.user.companyId || req.user._id;
  
  const result = await placeFeaturedJob({
    jobId,
    companyId,
    slotPosition: parseInt(slotPosition),
    bidAmount: parseInt(bidAmount),
    durationDays: parseInt(durationDays),
    slotType,
    userId: req.user._id,
  });
  
  res.status(201).json({
    success: true,
    message: result.message,
    data: {
      featuredSlot: result.featuredSlot,
      billingRecord: result.billingRecord,
    },
  });
}));

/**
 * @route   POST /api/v1/featured-jobs/bid
 * @desc    Bid on premium slot (company)
 * @access  Private (Company)
 */
router.post('/bid', authenticate, requireRole(['company', 'company_admin', 'company_manager']), asyncHandler(async (req, res) => {
  const {
    slotPosition,
    jobId,
    bidAmount,
    slotType = 'carousel',
  } = req.body;
  
  // Validate required fields
  if (!slotPosition || !jobId || !bidAmount) {
    throw new ValidationError('Slot position, job ID, and bid amount are required');
  }
  
  const companyId = req.user.companyId || req.user._id;
  
  const result = await bidOnPremiumSlot({
    slotPosition: parseInt(slotPosition),
    jobId,
    companyId,
    bidAmount: parseInt(bidAmount),
    userId: req.user._id,
    slotType,
  });
  
  res.json({
    success: true,
    message: result.message,
    data: {
      slot: result.slot || result.featuredSlot,
      position: result.position,
    },
  });
}));

/**
 * @route   GET /api/v1/featured-jobs/my
 * @desc    Get company's featured jobs (company)
 * @access  Private (Company)
 */
router.get('/my', authenticate, requireRole(['company', 'company_admin', 'company_manager']), asyncHandler(async (req, res) => {
  const { status, limit = 50 } = req.query;
  
  const companyId = req.user.companyId || req.user._id;
  
  const featuredJobs = await getCompanyFeaturedJobs(companyId, {
    status,
    limit: parseInt(limit),
  });
  
  res.json({
    success: true,
    data: {
      featuredJobs,
      count: featuredJobs.length,
    },
  });
}));

/**
 * @route   GET /api/v1/featured-jobs/:id/performance
 * @desc    Get performance analytics for a featured slot (company)
 * @access  Private (Company)
 */
router.get('/:id/performance', authenticate, requireRole(['company', 'company_admin', 'company_manager']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const companyId = req.user.companyId || req.user._id;
  
  const analytics = await getSlotPerformanceAnalytics(id, companyId);
  
  res.json({
    success: true,
    data: analytics,
  });
}));

/**
 * @route   PUT /api/v1/featured-jobs/:id/cancel
 * @desc    Cancel featured listing (company)
 * @access  Private (Company)
 */
router.put('/:id/cancel', authenticate, requireRole(['company', 'company_admin', 'company_manager']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  
  const companyId = req.user.companyId || req.user._id;
  
  const result = await cancelFeaturedListing(id, companyId, req.user._id, reason || 'Cancelled by user');
  
  res.json({
    success: true,
    message: result.message,
    data: {
      refundAmount: result.refundAmount,
      slot: result.slot,
    },
  });
}));

/**
 * @route   POST /api/v1/featured-jobs/:id/pay
 * @desc    Process payment for featured slot (company)
 * @access  Private (Company)
 */
router.post('/:id/pay', authenticate, requireRole(['company', 'company_admin', 'company_manager']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { method, transactionId } = req.body;
  
  if (!method || !transactionId) {
    throw new ValidationError('Payment method and transaction ID are required');
  }
  
  const result = await processFeaturedSlotPayment(id, {
    method,
    transactionId,
    userId: req.user._id,
  });
  
  res.json({
    success: true,
    message: result.message,
    data: {
      slot: result.slot,
    },
  });
}));

/**
 * @route   GET /api/v1/featured-jobs/auction/:position
 * @desc    Get auction leaderboard for a position
 * @access  Public
 */
router.get('/auction/:position', asyncHandler(async (req, res) => {
  const { position } = req.params;
  const { slotType = 'carousel' } = req.query;
  
  const leaderboard = await getAuctionLeaderboard(parseInt(position), slotType);
  
  res.json({
    success: true,
    data: {
      position: parseInt(position),
      leaderboard,
    },
  });
}));

// ==================== ADMIN ROUTES ====================

/**
 * @route   GET /api/v1/featured-jobs/admin/all
 * @desc    Admin management - get all featured jobs
 * @access  Private (Admin)
 */
router.get('/admin/all', authenticate, requireRole(['admin']), asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 50 } = req.query;
  
  const query = {};
  if (status) {
    query.status = status;
  }
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const [featuredSlots, total] = await Promise.all([
    FeaturedJobSlot.find(query)
      .populate('jobId', 'title companyId status')
      .populate('companyId', 'name slug logo')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip),
    FeaturedJobSlot.countDocuments(query),
  ]);
  
  res.json({
    success: true,
    data: {
      featuredSlots,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
}));

/**
 * @route   PUT /api/v1/featured-jobs/admin/:id/approve
 * @desc    Approve featured job (admin)
 * @access  Private (Admin)
 */
router.put('/admin/:id/approve', authenticate, requireRole(['admin']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await approveFeaturedJob(id, req.user._id);
  
  res.json({
    success: true,
    message: result.message,
    data: {
      slot: result.slot,
    },
  });
}));

/**
 * @route   PUT /api/v1/featured-jobs/admin/:id/reject
 * @desc    Reject featured job (admin)
 * @access  Private (Admin)
 */
router.put('/admin/:id/reject', authenticate, requireRole(['admin']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  
  const result = await rejectFeaturedJob(id, reason || 'Rejected by admin');
  
  res.json({
    success: true,
    message: result.message,
    data: {
      slot: result.slot,
    },
  });
}));

/**
 * @route   GET /api/v1/featured-jobs/admin/stats
 * @desc    Get featured jobs statistics (admin)
 * @access  Private (Admin)
 */
router.get('/admin/stats', authenticate, requireRole(['admin']), asyncHandler(async (req, res) => {
  const stats = await FeaturedJobSlot.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$bidAmount' },
      },
    },
  ]);
  
  const totalMetrics = await FeaturedJobSlot.aggregate([
    {
      $group: {
        _id: null,
        totalViews: { $sum: '$metrics.views' },
        totalClicks: { $sum: '$metrics.clicks' },
        totalApplications: { $sum: '$metrics.applications' },
        totalHires: { $sum: '$metrics.hires' },
        totalRevenue: { $sum: '$bidAmount' },
      },
    },
  ]);
  
  res.json({
    success: true,
    data: {
      statusBreakdown: stats,
      totalMetrics: totalMetrics[0] || {
        totalViews: 0,
        totalClicks: 0,
        totalApplications: 0,
        totalHires: 0,
        totalRevenue: 0,
      },
    },
  });
}));

// Track featured job view
router.post('/:id/track/view', optionalAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const slot = await FeaturedJobSlot.findById(id);
  
  if (slot && slot.status === 'active') {
    await slot.incrementViews(true);
    
    // Also track on job
    if (slot.jobId) {
      await Job.incrementFeaturedViews(slot.jobId, true);
    }
  }
  
  res.json({ success: true });
}));

// Track featured job click
router.post('/:id/track/click', optionalAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const slot = await FeaturedJobSlot.findById(id);
  
  if (slot && slot.status === 'active') {
    await slot.incrementClicks();
    
    // Also track on job
    if (slot.jobId) {
      await Job.incrementFeaturedClicks(slot.jobId);
    }
  }
  
  res.json({ success: true });
}));

module.exports = router;
