/**
 * Authentication Routes
 * Handles user registration, login, logout, token refresh, and password management
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { User, Company, CompanyUser, AuditLog } = require('../models/index.js');
const { authenticate, generateTokens, generateEmailVerificationToken, generatePasswordResetToken, verifyPasswordResetToken, refreshToken: refreshTokenHandler } = require('../middleware/auth.js');
const { asyncHandler, ValidationError, AuthenticationError, ConflictError, NotFoundError } = require('../middleware/errorHandler.js');
const { requireRole } = require('../middleware/rbac.js');
const referralNetworkService = require('../services/referralNetworkService.js');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', asyncHandler(async (req, res) => {
  const { email, password, name, role, phone, companyName, inviteCode } = req.body;
  
  // Validate required fields
  if (!email || !password || !name || !role) {
    throw new ValidationError('Please provide all required fields: email, password, name, role');
  }
  
  // Validate role
  const validRoles = ['referrer', 'job_seeker', 'corporate_admin'];
  if (!validRoles.includes(role)) {
    throw new ValidationError(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
  }
  
  // Check if user already exists
  const existingUser = await User.findByEmail(email);
  if (existingUser) {
    throw new ConflictError('An account with this email already exists');
  }
  
  // Validate invite code if provided (for referrers)
  let parentReferrerId = null;
  if (inviteCode && role === 'referrer') {
    const validation = await referralNetworkService.validateInviteCode(inviteCode);
    if (!validation.valid) {
      throw new ValidationError(validation.message);
    }
    parentReferrerId = validation.referrer.id;
  }
  
  // Create user data
  const userData = {
    email: email.toLowerCase().trim(),
    password,
    name: name.trim(),
    role,
    phone: phone?.trim(),
  };
  
  // Initialize role-specific profiles
  if (role === 'referrer') {
    userData.referrerProfile = {
      referralCode: generateReferralCode(),
      inviteCode: generateInviteCode(),
      totalEarnings: 0,
      availableBalance: 0,
      pendingBalance: 0,
      totalReferrals: 0,
      successfulHires: 0,
      kycStatus: 'not_submitted',
      tierLevel: 'bronze',
      tierProgress: 0,
      directReferrals: 0,
      networkSize: 0,
      networkEarnings: 0,
      inviteCount: 0,
      ...(parentReferrerId && { parentReferrerId }),
    };
  } else if (role === 'job_seeker') {
    userData.jobseekerProfile = {
      skills: [],
    };
  }
  
  // Create user
  const user = await User.create(userData);
  
  // Initialize referral network for referrers
  if (role === 'referrer') {
    await referralNetworkService.initializeReferrer(user._id, inviteCode);
  }
  
  // If corporate admin, create company
  let company = null;
  if (role === 'corporate_admin' && companyName) {
    company = await Company.create({
      name: companyName.trim(),
      email: email.toLowerCase().trim(),
      verificationStatus: 'pending',
      createdBy: user._id,
    });
    
    // Create company user relationship
    await CompanyUser.create({
      userId: user._id,
      companyId: company._id,
      role: 'admin',
      invitationStatus: 'accepted',
      acceptedAt: new Date(),
    });
  }
  
  // Generate tokens
  const tokens = generateTokens(user);
  
  // Log registration
  await AuditLog.logUserAction({
    user,
    action: 'user_created',
    entityType: 'user',
    entityId: user._id,
    entityName: user.name,
    description: `New user registered with role: ${role}`,
    req,
    severity: 'info',
  });
  
  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        ...(company && { company: { id: company._id, name: company.name } }),
      },
      tokens,
    },
  });
}));

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get tokens
 * @access  Public
 */
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  // Validate input
  if (!email || !password) {
    throw new ValidationError('Please provide email and password');
  }
  
  // Find user with password
  const user = await User.findByEmail(email).select('+password');
  
  if (!user) {
    console.warn('[Auth/Login] User not found for email:', email);
    throw new AuthenticationError('Invalid email or password');
  }
  
  // Check if account is locked
  if (user.isLocked) {
    throw new AuthenticationError('Account is temporarily locked. Please try again later.');
  }
  
  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  
  if (!isPasswordValid) {
    // Increment login attempts
    await user.incrementLoginAttempts();
    console.warn('[Auth/Login] Invalid password for email:', email);
    throw new AuthenticationError('Invalid email or password');
  }
  
  // Check if account is active
  if (user.status !== 'active') {
    console.warn('[Auth/Login] Inactive account:', email, 'status:', user.status);
    throw new AuthenticationError('Account is not active. Please contact support.');
  }
  
  // Reset login attempts on successful login
  if (user.loginAttempts > 0) {
    await user.updateOne({ $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } });
  }
  
  // Update last login
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });
  
  // Get company info for corporate users
  let companyInfo = null;
  if (['corporate_admin', 'corporate_recruiter', 'corporate_viewer'].includes(user.role)) {
    const companyUser = await CompanyUser.findOne({
      userId: user._id,
      isActive: true,
      invitationStatus: 'accepted',
    }).populate('companyId', 'name slug logo');
    
    if (companyUser) {
      companyInfo = {
        id: companyUser.companyId._id,
        name: companyUser.companyId.name,
        slug: companyUser.companyId.slug,
        logo: companyUser.companyId.logo,
        role: companyUser.role,
      };
    }
  }
  
  // Generate tokens
  const tokens = generateTokens(user);
  
  // Log login
  await AuditLog.logUserAction({
    user,
    action: 'login',
    entityType: 'user',
    entityId: user._id,
    description: 'User logged in',
    req,
    severity: 'info',
  });
  
  console.info('[Auth/Login] Success:', email, 'userId:', user._id);
  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        ...(user.referrerProfile && {
          referralCode: user.referrerProfile.referralCode,
          kycStatus: user.referrerProfile.kycStatus,
        }),
        ...(companyInfo && { company: companyInfo }),
      },
      tokens,
    },
  });
}));

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  // Log logout
  await AuditLog.logUserAction({
    user: req.user,
    action: 'logout',
    entityType: 'user',
    entityId: req.user._id,
    description: 'User logged out',
    req,
    severity: 'info',
  });
  
  res.json({
    success: true,
    message: 'Logout successful',
  });
}));

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public (requires refresh token)
 */
router.post('/refresh', refreshTokenHandler);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  // Get company info for corporate users
  let companyInfo = null;
  if (['corporate_admin', 'corporate_recruiter', 'corporate_viewer'].includes(user.role)) {
    const companyUser = await CompanyUser.findOne({
      userId: user._id,
      isActive: true,
      invitationStatus: 'accepted',
    }).populate('companyId', 'name slug logo verificationStatus');
    
    if (companyUser) {
      companyInfo = {
        id: companyUser.companyId._id,
        name: companyUser.companyId.name,
        slug: companyUser.companyId.slug,
        logo: companyUser.companyId.logo,
        verificationStatus: companyUser.companyId.verificationStatus,
        role: companyUser.role,
      };
    }
  }
  
  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        status: user.status,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        ...(user.referrerProfile && {
          referrerProfile: {
            referralCode: user.referrerProfile.referralCode,
            totalEarnings: user.referrerProfile.totalEarnings,
            availableBalance: user.referrerProfile.availableBalance,
            pendingBalance: user.referrerProfile.pendingBalance,
            totalReferrals: user.referrerProfile.totalReferrals,
            successfulHires: user.referrerProfile.successfulHires,
            kycStatus: user.referrerProfile.kycStatus,
          },
        }),
        ...(user.jobseekerProfile && {
          jobseekerProfile: user.jobseekerProfile,
        }),
        ...(companyInfo && { company: companyInfo }),
      },
    },
  });
}));

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    throw new ValidationError('Please provide your email address');
  }
  
  const user = await User.findByEmail(email);
  
  // Always return success to prevent email enumeration
  if (!user) {
    return res.json({
      success: true,
      message: 'If an account exists with this email, you will receive password reset instructions.',
    });
  }
  
  // Generate reset token
  const resetToken = generatePasswordResetToken(user._id);
  
  // Save reset token to user (in a real app, you'd save hashed token)
  user.passwordResetToken = resetToken;
  user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  await user.save({ validateBeforeSave: false });
  
  // TODO: Send email with reset link
  // In development, return the token
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
  
  res.json({
    success: true,
    message: 'If an account exists with this email, you will receive password reset instructions.',
    ...(process.env.NODE_ENV === 'development' && {
      devInfo: {
        resetToken,
        resetUrl,
      },
    }),
  });
}));

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password using token
 * @access  Public
 */
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  
  if (!token || !password) {
    throw new ValidationError('Please provide reset token and new password');
  }
  
  if (password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters long');
  }
  
  // Verify token
  let decoded;
  try {
    decoded = verifyPasswordResetToken(token);
  } catch (error) {
    throw new AuthenticationError('Invalid or expired reset token');
  }
  
  // Find user
  const user = await User.findById(decoded.sub).select('+passwordResetToken +passwordResetExpires');
  
  if (!user || user.passwordResetExpires < Date.now()) {
    throw new AuthenticationError('Invalid or expired reset token');
  }
  
  // Update password
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.passwordChangedAt = Date.now();
  await user.save();
  
  // Log password reset
  await AuditLog.logUserAction({
    user,
    action: 'password_reset',
    entityType: 'user',
    entityId: user._id,
    description: 'Password reset completed',
    req,
    severity: 'warning',
  });
  
  res.json({
    success: true,
    message: 'Password reset successful. Please log in with your new password.',
  });
}));

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change password (authenticated)
 * @access  Private
 */
router.put('/change-password', authenticate, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    throw new ValidationError('Please provide current password and new password');
  }
  
  if (newPassword.length < 8) {
    throw new ValidationError('New password must be at least 8 characters long');
  }
  
  // Get user with password
  const user = await User.findById(req.user._id).select('+password');
  
  // Verify current password
  const isValid = await user.comparePassword(currentPassword);
  if (!isValid) {
    throw new AuthenticationError('Current password is incorrect');
  }
  
  // Update password
  user.password = newPassword;
  user.passwordChangedAt = Date.now();
  await user.save();
  
  // Log password change
  await AuditLog.logUserAction({
    user,
    action: 'password_changed',
    entityType: 'user',
    entityId: user._id,
    description: 'Password changed',
    req,
    severity: 'warning',
  });
  
  res.json({
    success: true,
    message: 'Password changed successfully. Please log in again.',
  });
}));

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email address
 * @access  Public
 */
router.post('/verify-email', asyncHandler(async (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    throw new ValidationError('Verification token is required');
  }
  
  // TODO: Implement email verification logic
  // This is a placeholder for the email verification flow
  
  res.json({
    success: true,
    message: 'Email verified successfully',
  });
}));

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend verification email
 * @access  Private
 */
router.post('/resend-verification', authenticate, asyncHandler(async (req, res) => {
  const user = req.user;
  
  if (user.emailVerified) {
    return res.json({
      success: true,
      message: 'Email is already verified',
    });
  }
  
  const verificationToken = generateEmailVerificationToken(user._id);
  
  // TODO: Send verification email
  
  res.json({
    success: true,
    message: 'Verification email sent',
    ...(process.env.NODE_ENV === 'development' && {
      devInfo: { verificationToken },
    }),
  });
}));

// ==================== HELPER FUNCTIONS ====================

/**
 * Generate unique referral code
 * @returns {string}
 */
function generateReferralCode() {
  const prefix = 'SAR';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${code}`;
}

/**
 * Generate unique invite code for viral referrals
 * @returns {string}
 */
function generateInviteCode() {
  const prefix = 'REF';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${code}`;
}

module.exports = router;
