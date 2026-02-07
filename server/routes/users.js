/**
 * User Routes
 * Handles user management, profile updates, and user-specific operations
 */

const express = require('express');
const { User, Referral, Application, AuditLog } = require('../models/index.js');
const { authenticate } = require('../middleware/auth.js');
const { asyncHandler, ValidationError, NotFoundError, AuthorizationError } = require('../middleware/errorHandler.js');
const { requireAdmin, requireOwnerOrAdmin, isReferralOwner, isApplicationOwner } = require('../middleware/rbac.js');

const router = express.Router();

/**
 * @route   GET /api/users
 * @desc    Get all users (admin only)
 * @access  Private (Admin)
 */
router.get('/', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    role, 
    status = 'active',
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;
  
  // Build query
  const query = {};
  
  if (role) query.role = role;
  if (status) query.status = status;
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  
  // Build sort
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
  
  // Execute query with pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const [users, total] = await Promise.all([
    User.find(query)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
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
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
}));

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin or Owner)
 */
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check permissions
  if (req.user.role !== 'platform_admin' && req.user._id.toString() !== id) {
    throw new AuthorizationError();
  }
  
  const user = await User.findById(id).select('-password');
  
  if (!user) {
    throw new NotFoundError('User');
  }
  
  res.json({
    success: true,
    data: { user },
  });
}));

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private (Admin or Owner)
 */
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, phone, avatar, status } = req.body;
  
  // Check permissions
  const isAdmin = req.user.role === 'platform_admin';
  const isOwner = req.user._id.toString() === id;
  
  if (!isAdmin && !isOwner) {
    throw new AuthorizationError();
  }
  
  // Only admins can update status
  if (status && !isAdmin) {
    throw new AuthorizationError('Only admins can update user status');
  }
  
  const user = await User.findById(id);
  
  if (!user) {
    throw new NotFoundError('User');
  }
  
  // Update fields
  if (name) user.name = name.trim();
  if (phone !== undefined) user.phone = phone ? phone.trim() : undefined;
  if (avatar) user.avatar = avatar.trim();
  if (status && isAdmin) user.status = status;
  
  await user.save();
  
  // Log update
  await AuditLog.logUserAction({
    user: req.user,
    action: 'user_updated',
    entityType: 'user',
    entityId: user._id,
    entityName: user.name,
    description: `User profile updated`,
    req,
    severity: 'info',
  });
  
  res.json({
    success: true,
    message: 'User updated successfully',
    data: { user },
  });
}));

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (soft delete)
 * @access  Private (Admin or Owner)
 */
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check permissions
  const isAdmin = req.user.role === 'platform_admin';
  const isOwner = req.user._id.toString() === id;
  
  if (!isAdmin && !isOwner) {
    throw new AuthorizationError();
  }
  
  const user = await User.findById(id);
  
  if (!user) {
    throw new NotFoundError('User');
  }
  
  // Soft delete
  user.status = 'deleted';
  await user.save();
  
  // Log deletion
  await AuditLog.logUserAction({
    user: req.user,
    action: 'user_deleted',
    entityType: 'user',
    entityId: user._id,
    entityName: user.name,
    description: `User account deleted`,
    req,
    severity: 'warning',
  });
  
  res.json({
    success: true,
    message: 'User deleted successfully',
  });
}));

/**
 * @route   PUT /api/users/:id/profile
 * @desc    Update user profile (role-specific)
 * @access  Private (Owner)
 */
router.put('/:id/profile', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Only owner can update their profile
  if (req.user._id.toString() !== id) {
    throw new AuthorizationError();
  }
  
  const user = await User.findById(id);
  
  if (!user) {
    throw new NotFoundError('User');
  }
  
  // Update based on role
  if (user.role === 'referrer' && req.body.referrerProfile) {
    const { paymentMethods } = req.body.referrerProfile;
    
    if (paymentMethods) {
      user.referrerProfile.paymentMethods = paymentMethods;
    }
  }
  
  if (user.role === 'job_seeker' && req.body.jobseekerProfile) {
    const { skills, experience, education, portfolioUrl, linkedInUrl } = req.body.jobseekerProfile;
    
    if (!user.jobseekerProfile) {
      user.jobseekerProfile = {};
    }
    
    if (skills) user.jobseekerProfile.skills = skills;
    if (experience) user.jobseekerProfile.experience = experience;
    if (education) user.jobseekerProfile.education = education;
    if (portfolioUrl) user.jobseekerProfile.portfolioUrl = portfolioUrl;
    if (linkedInUrl) user.jobseekerProfile.linkedInUrl = linkedInUrl;
  }
  
  await user.save();
  
  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { user },
  });
}));

/**
 * @route   POST /api/users/:id/kyc
 * @desc    Submit KYC documents
 * @access  Private (Referrer only)
 */
router.post('/:id/kyc', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nrcFront, nrcBack, selfie } = req.body;
  
  // Only owner can submit KYC
  if (req.user._id.toString() !== id) {
    throw new AuthorizationError();
  }
  
  const user = await User.findById(id);
  
  if (!user) {
    throw new NotFoundError('User');
  }
  
  if (user.role !== 'referrer') {
    throw new ValidationError('KYC is only required for referrers');
  }
  
  // Validate required documents
  if (!nrcFront || !nrcBack || !selfie) {
    throw new ValidationError('Please provide all required KYC documents: NRC front, NRC back, and selfie');
  }
  
  // Update KYC status
  user.referrerProfile.kycDocuments = {
    nrcFront,
    nrcBack,
    selfie,
  };
  user.referrerProfile.kycStatus = 'pending';
  user.referrerProfile.kycSubmittedAt = new Date();
  
  await user.save();
  
  // Log KYC submission
  await AuditLog.logUserAction({
    user: req.user,
    action: 'kyc_submitted',
    entityType: 'user',
    entityId: user._id,
    description: 'KYC documents submitted for verification',
    req,
    severity: 'info',
  });
  
  res.json({
    success: true,
    message: 'KYC documents submitted successfully. Verification is pending.',
    data: {
      kycStatus: user.referrerProfile.kycStatus,
      submittedAt: user.referrerProfile.kycSubmittedAt,
    },
  });
}));

/**
 * @route   PUT /api/users/:id/kyc
 * @desc    Update KYC status (admin only)
 * @access  Private (Admin)
 */
router.put('/:id/kyc', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  
  if (!['verified', 'rejected'].includes(status)) {
    throw new ValidationError('Status must be either "verified" or "rejected"');
  }
  
  const user = await User.findById(id);
  
  if (!user) {
    throw new NotFoundError('User');
  }
  
  if (user.role !== 'referrer') {
    throw new ValidationError('User is not a referrer');
  }
  
  user.referrerProfile.kycStatus = status;
  user.referrerProfile.kycVerifiedAt = new Date();
  
  await user.save();
  
  // Log KYC decision
  await AuditLog.logUserAction({
    user: req.user,
    action: status === 'verified' ? 'kyc_verified' : 'kyc_rejected',
    entityType: 'user',
    entityId: user._id,
    entityName: user.name,
    description: `KYC ${status}. Notes: ${notes || 'None'}`,
    req,
    severity: 'info',
  });
  
  res.json({
    success: true,
    message: `KYC ${status} successfully`,
    data: {
      kycStatus: user.referrerProfile.kycStatus,
      verifiedAt: user.referrerProfile.kycVerifiedAt,
    },
  });
}));

/**
 * @route   GET /api/users/:id/referrals
 * @desc    Get user's referrals
 * @access  Private (Owner or Admin)
 */
router.get('/:id/referrals', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, page = 1, limit = 20 } = req.query;
  
  // Check permissions
  if (req.user.role !== 'platform_admin' && req.user._id.toString() !== id) {
    throw new AuthorizationError();
  }
  
  const user = await User.findById(id);
  
  if (!user) {
    throw new NotFoundError('User');
  }
  
  if (user.role !== 'referrer') {
    return res.json({
      success: true,
      data: {
        referrals: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      },
    });
  }
  
  // Build query options
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { submittedAt: -1 },
  };
  
  if (status) {
    options.status = status;
  }
  
  const referrals = await Referral.findByReferrer(id, options);
  const stats = await Referral.getReferrerStats(id);
  
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
 * @route   GET /api/users/:id/applications
 * @desc    Get user's job applications
 * @access  Private (Owner or Admin)
 */
router.get('/:id/applications', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, page = 1, limit = 20 } = req.query;
  
  // Check permissions
  if (req.user.role !== 'platform_admin' && req.user._id.toString() !== id) {
    throw new AuthorizationError();
  }
  
  const user = await User.findById(id);
  
  if (!user) {
    throw new NotFoundError('User');
  }
  
  // Build query options
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { submittedAt: -1 },
  };
  
  if (status) {
    options.status = status;
  }
  
  const applications = await Application.findByApplicant(id, options);
  const stats = await Application.getApplicantStats(id);
  
  res.json({
    success: true,
    data: {
      applications,
      stats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
      },
    },
  });
}));

/**
 * @route   GET /api/users/:id/stats
 * @desc    Get user statistics
 * @access  Private (Owner or Admin)
 */
router.get('/:id/stats', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check permissions
  if (req.user.role !== 'platform_admin' && req.user._id.toString() !== id) {
    throw new AuthorizationError();
  }
  
  const user = await User.findById(id).select('role referrerProfile');
  
  if (!user) {
    throw new NotFoundError('User');
  }
  
  let stats = {};
  
  if (user.role === 'referrer') {
    const referralStats = await Referral.getReferrerStats(id);
    stats = {
      ...referralStats,
      kycStatus: user.referrerProfile?.kycStatus,
    };
  } else if (user.role === 'job_seeker') {
    stats = await Application.getApplicantStats(id);
  }
  
  res.json({
    success: true,
    data: { stats },
  });
}));

/**
 * @route   GET /api/users/:id/activity
 * @desc    Get user activity log
 * @access  Private (Owner or Admin)
 */
router.get('/:id/activity', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 50 } = req.query;
  
  // Check permissions
  if (req.user.role !== 'platform_admin' && req.user._id.toString() !== id) {
    throw new AuthorizationError();
  }
  
  const logs = await AuditLog.findByUser(id, {
    limit: parseInt(limit),
    skip: (parseInt(page) - 1) * parseInt(limit),
  });
  
  res.json({
    success: true,
    data: {
      activity: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
      },
    },
  });
}));

module.exports = router;
