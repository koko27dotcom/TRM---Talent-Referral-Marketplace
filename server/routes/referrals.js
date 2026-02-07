/**
 * Referral Routes
 * Handles referral submission, tracking, and management
 */

const express = require('express');
const { Referral, Job, Company, User, AuditLog, Subscription } = require('../models/index.js');
const { authenticate, optionalAuth } = require('../middleware/auth.js');
const { asyncHandler, ValidationError, NotFoundError, AuthorizationError, ConflictError } = require('../middleware/errorHandler.js');
const { requireReferrer, requireReferralManager, requireAdmin } = require('../middleware/rbac.js');
const { PERMISSIONS } = require('../models/CompanyUser.js');

const router = express.Router();

// Twilio configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const twilioEnabled = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER;

/**
 * Send jackpot SMS notification to referrer when their referral is hired
 * @param {Object} referrer - User object of the referrer
 * @param {Object} referral - Referral object
 */
async function sendJackpotSMS(referrer, referral) {
  if (!twilioEnabled) {
    console.log('📱 Twilio not configured. Jackpot SMS would be sent to:', referrer.phone);
    console.log(`   Message: Congratulations! Your referral was hired! You earned ${referral.referrerPayout.toLocaleString()} MMK.`);
    return;
  }
  
  try {
    const twilio = require('twilio');
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    
    // Format phone number (ensure it has + prefix for international)
    let phoneNumber = referrer.phone;
    if (!phoneNumber.startsWith('+')) {
      // Assume Myanmar number if no country code
      phoneNumber = '+95' + phoneNumber.replace(/^0/, '');
    }
    
    const message = await client.messages.create({
      body: `🎉 Congratulations ${referrer.name}! Your referral was successfully hired! You've earned ${referral.referrerPayout.toLocaleString()} MMK. The amount has been added to your pending balance. - TRM Referral Platform`,
      from: TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });
    
    console.log(`📱 Jackpot SMS sent to ${referrer.phone}. SID: ${message.sid}`);
  } catch (error) {
    console.error('Error sending jackpot SMS:', error);
    throw error;
  }
}

/**
 * @route   GET /api/referrals
 * @desc    Get current user's referrals (referrer only)
 * @access  Private (Referrer)
 */
router.get('/', authenticate, requireReferrer, asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { submittedAt: -1 },
  };
  
  if (status) {
    options.status = status;
  }
  
  const [referrals, stats] = await Promise.all([
    Referral.findByReferrer(req.user._id, options),
    Referral.getReferrerStats(req.user._id),
  ]);
  
  res.json({
    success: true,
    data: {
      referrals,
      stats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
      },
    },
  });
}));

/**
 * @route   GET /api/referrals/my-stats
 * @desc    Get referrer statistics
 * @access  Private (Referrer)
 */
router.get('/my-stats', authenticate, requireReferrer, asyncHandler(async (req, res) => {
  const stats = await Referral.getReferrerStats(req.user._id);
  
  // Get user balance info
  const user = await User.findById(req.user._id).select('referrerProfile');
  
  res.json({
    success: true,
    data: {
      ...stats,
      availableBalance: user.referrerProfile?.availableBalance || 0,
      pendingBalance: user.referrerProfile?.pendingBalance || 0,
      totalEarnings: user.referrerProfile?.totalEarnings || 0,
    },
  });
}));

/**
 * @route   POST /api/referrals
 * @desc    Submit a new referral
 * @access  Private (Referrer)
 */
router.post('/', authenticate, requireReferrer, asyncHandler(async (req, res) => {
  const { 
    jobId, 
    referredPerson, 
    referrerNotes,
    source,
  } = req.body;
  
  // Validate required fields
  if (!jobId || !referredPerson || !referredPerson.name || !referredPerson.email) {
    throw new ValidationError('Please provide jobId and referred person details (name, email)');
  }
  
  // Check if job exists and is active
  const job = await Job.findById(jobId);
  
  if (!job) {
    throw new NotFoundError('Job');
  }
  
  if (!job.isAcceptingApplications()) {
    throw new ValidationError('This job is no longer accepting referrals');
  }
  
  // Check if company is verified
  const company = await Company.findById(job.companyId);
  if (company.verificationStatus !== 'verified') {
    throw new ValidationError('Cannot refer to unverified company');
  }
  
  // Generate unique referral code
  let code;
  let isUnique = false;
  while (!isUnique) {
    code = Referral.generateCode();
    const existing = await Referral.findByCode(code);
    if (!existing) {
      isUnique = true;
    }
  }
  
  // Calculate financials
  const referralBonus = job.referralBonus;
  const platformCommission = referralBonus * 0.15; // 15%
  const referrerPayout = referralBonus * 0.85; // 85%
  
  // Create referral
  const referral = await Referral.create({
    code,
    jobId,
    referrerId: req.user._id,
    referredPerson: {
      name: referredPerson.name.trim(),
      email: referredPerson.email.toLowerCase().trim(),
      phone: referredPerson.phone,
      resumeUrl: referredPerson.resumeUrl,
      linkedInUrl: referredPerson.linkedInUrl,
      currentCompany: referredPerson.currentCompany,
      currentTitle: referredPerson.currentTitle,
      yearsOfExperience: referredPerson.yearsOfExperience,
    },
    source: {
      channel: source?.channel || 'direct',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      referrerUrl: source?.referrerUrl,
      utmSource: source?.utmSource,
      utmMedium: source?.utmMedium,
      utmCampaign: source?.utmCampaign,
    },
    referralBonus,
    platformCommission,
    referrerPayout,
    referrerNotes,
  });
  
  // Increment job referral count
  await job.incrementReferrals();
  
  // Update referrer stats
  await User.findByIdAndUpdate(req.user._id, {
    $inc: { 'referrerProfile.totalReferrals': 1 },
  });
  
  // Log referral submission
  await AuditLog.logUserAction({
    user: req.user,
    action: 'referral_submitted',
    entityType: 'referral',
    entityId: referral._id,
    description: `Referral submitted for job: ${job.title}`,
    req,
    companyId: job.companyId,
    severity: 'info',
  });
  
  res.status(201).json({
    success: true,
    message: 'Referral submitted successfully',
    data: {
      referral,
      referralLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/referrals/track/${code}`,
      code,
    },
  });
}));

/**
 * @route   GET /api/referrals/:code
 * @desc    Get referral by code
 * @access  Private (Referrer who owns it, or Company Member)
 */
router.get('/:code', authenticate, asyncHandler(async (req, res) => {
  const { code } = req.params;
  
  const referral = await Referral.findByCode(code)
    .populate('jobId', 'title companyId slug')
    .populate('jobId.companyId', 'name slug logo')
    .populate('referrerId', 'name email avatar');
  
  if (!referral) {
    throw new NotFoundError('Referral');
  }
  
  // Check permissions
  const isReferrer = referral.referrerId._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'platform_admin';
  
  let isCompanyMember = false;
  if (!isReferrer && !isAdmin) {
    const CompanyUser = (await import('../models/CompanyUser.js')).default;
    isCompanyMember = await CompanyUser.isMember(req.user._id, referral.jobId.companyId._id);
  }
  
  if (!isReferrer && !isAdmin && !isCompanyMember) {
    throw new AuthorizationError();
  }
  
  res.json({
    success: true,
    data: { referral },
  });
}));

/**
 * @route   GET /api/referrals/track/:code
 * @desc    Public tracking for referral (limited info)
 * @access  Public
 */
router.get('/track/:code', asyncHandler(async (req, res) => {
  const { code } = req.params;
  
  const referral = await Referral.findByCode(code)
    .populate('jobId', 'title companyId')
    .populate('jobId.companyId', 'name slug logo')
    .select('-referredPerson.email -referredPerson.phone -internalNotes -source.ipAddress');
  
  if (!referral) {
    throw new NotFoundError('Referral');
  }
  
  // Return limited info for public tracking
  res.json({
    success: true,
    data: {
      code: referral.code,
      status: referral.status,
      job: referral.jobId,
      submittedAt: referral.submittedAt,
      statusHistory: referral.statusHistory.map(h => ({
        status: h.status,
        changedAt: h.changedAt,
        notes: h.notes,
      })),
      daysSinceSubmitted: referral.daysSinceSubmitted,
    },
  });
}));

/**
 * @route   PUT /api/referrals/:id/status
 * @desc    Update referral status (company only)
 * @access  Private (Company Recruiter)
 */
router.put('/:id/status', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  
  if (!status) {
    throw new ValidationError('Status is required');
  }
  
  const referral = await Referral.findById(id);
  
  if (!referral) {
    throw new NotFoundError('Referral');
  }
  
  // Check permissions
  const hasPermission = await checkReferralPermission(req.user, referral, PERMISSIONS.WRITE_REFERRALS);
  if (!hasPermission) {
    throw new AuthorizationError();
  }
  
  // Update status
  await referral.updateStatus(status, {
    changedBy: req.user._id,
    changedByType: 'recruiter',
    notes,
  });
  
  // If hired, update referrer's pending balance and send jackpot SMS notification
  if (status === 'hired') {
    await User.findByIdAndUpdate(referral.referrerId, {
      $inc: {
        'referrerProfile.pendingBalance': referral.referrerPayout,
        'referrerProfile.successfulHires': 1,
      },
    });
    
    // Send jackpot SMS notification to referrer
    try {
      const referrer = await User.findById(referral.referrerId);
      if (referrer && referrer.phone) {
        await sendJackpotSMS(referrer, referral);
      }
    } catch (smsError) {
      console.error('Error sending jackpot SMS:', smsError);
      // Don't fail the status update if SMS fails
    }
  }
  
  // Refer to Unlock: Award bonus AI credit when referral reaches interview_scheduled
  if (status === 'interview_scheduled') {
    try {
      // Find referrer's active subscription
      const subscription = await Subscription.findOne({
        userId: referral.referrerId,
        status: { $in: ['active', 'trialing'] },
      });
      
      if (subscription) {
        // Increment bonus AI credits
        subscription.usage.bonusAiCredits = (subscription.usage.bonusAiCredits || 0) + 1;
        await subscription.save();
        
        console.log(`🎉 Refer to Unlock: Awarded 1 bonus AI credit to user ${referral.referrerId} for referral ${referral.code} reaching interview_scheduled`);
        
        // Create notification for the referrer
        // Note: Notification would be sent via notification service
      }
    } catch (error) {
      console.error('Error awarding bonus AI credit:', error);
      // Don't fail the status update if bonus credit fails
    }
  }
  
  // Log status change
  await AuditLog.logUserAction({
    user: req.user,
    action: 'referral_status_changed',
    entityType: 'referral',
    entityId: referral._id,
    description: `Referral status updated to ${status}`,
    req,
    companyId: referral.jobId.companyId,
    severity: 'info',
  });
  
  res.json({
    success: true,
    message: 'Referral status updated successfully',
    data: { referral },
  });
}));

/**
 * @route   POST /api/referrals/:id/notes
 * @desc    Add internal notes to referral (company only)
 * @access  Private (Company Member)
 */
router.post('/:id/notes', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  
  if (!notes) {
    throw new ValidationError('Notes are required');
  }
  
  const referral = await Referral.findById(id);
  
  if (!referral) {
    throw new NotFoundError('Referral');
  }
  
  // Check permissions
  const hasPermission = await checkReferralPermission(req.user, referral, PERMISSIONS.READ_REFERRALS);
  if (!hasPermission) {
    throw new AuthorizationError();
  }
  
  referral.internalNotes = notes;
  await referral.save();
  
  res.json({
    success: true,
    message: 'Notes added successfully',
    data: { referral },
  });
}));

/**
 * @route   POST /api/referrals/:id/withdraw
 * @desc    Withdraw referral (referrer only)
 * @access  Private (Referrer who owns it)
 */
router.post('/:id/withdraw', authenticate, requireReferrer, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  
  const referral = await Referral.findById(id);
  
  if (!referral) {
    throw new NotFoundError('Referral');
  }
  
  // Check ownership
  if (referral.referrerId.toString() !== req.user._id.toString()) {
    throw new AuthorizationError();
  }
  
  // Can only withdraw if not already hired, rejected, or paid
  if (['hired', 'rejected', 'paid', 'payment_pending'].includes(referral.status)) {
    throw new ValidationError(`Cannot withdraw referral in ${referral.status} status`);
  }
  
  await referral.withdraw(req.user._id, reason);
  
  // Log withdrawal
  await AuditLog.logUserAction({
    user: req.user,
    action: 'referral_withdrawn',
    entityType: 'referral',
    entityId: referral._id,
    description: `Referral withdrawn. Reason: ${reason || 'Not provided'}`,
    req,
    severity: 'info',
  });
  
  res.json({
    success: true,
    message: 'Referral withdrawn successfully',
    data: { referral },
  });
}));

/**
 * @route   GET /api/referrals/admin/all
 * @desc    Get all referrals (admin only)
 * @access  Private (Admin)
 */
router.get('/admin/all', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 50 } = req.query;
  
  const query = {};
  if (status) query.status = status;
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const [referrals, total] = await Promise.all([
    Referral.find(query)
      .populate('jobId', 'title companyId')
      .populate('jobId.companyId', 'name slug')
      .populate('referrerId', 'name email')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Referral.countDocuments(query),
  ]);
  
  res.json({
    success: true,
    data: {
      referrals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
}));

// ==================== HELPER FUNCTIONS ====================

/**
 * Check if user has permission for a specific referral
 * @param {Object} user - Current user
 * @param {Object} referral - Referral document
 * @param {string} permission - Required permission
 * @returns {Promise<boolean>}
 */
async function checkReferralPermission(user, referral, permission) {
  // Platform admins have all permissions
  if (user.role === 'platform_admin') {
    return true;
  }
  
  // Get job to find company
  const job = await Job.findById(referral.jobId);
  if (!job) return false;
  
  // Check if user is a company member with the required permission
  const CompanyUser = (await import('../models/CompanyUser.js')).default;
  
  const companyUser = await CompanyUser.findRelationship(user._id, job.companyId);
  
  if (!companyUser || !companyUser.isActive || companyUser.invitationStatus !== 'accepted') {
    return false;
  }
  
  return companyUser.hasPermission(permission);
}

module.exports = router;
