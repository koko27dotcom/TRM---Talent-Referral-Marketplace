/**
 * User Model
 * Core user entity with support for multiple roles:
 * - platform_admin: Full system access
 * - corporate_admin: Company account management
 * - corporate_recruiter: Job posting and referral management
 * - corporate_viewer: Read-only company access
 * - referrer: Individual who makes referrals
 * - job_seeker: Candidate who applies to jobs
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const { Schema } = mongoose;

// Payment method schema for referrer profiles
const PaymentMethodSchema = new Schema({
  type: {
    type: String,
    enum: ['kbzpay', 'wavepay', 'bank_transfer'],
    required: true,
  },
  provider: {
    type: String,
    required: true,
    trim: true,
  },
  accountNumber: {
    type: String,
    required: true,
    trim: true,
  },
  accountName: {
    type: String,
    required: true,
    trim: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
}, { _id: true });

// KYC documents schema
const KYCDocumentsSchema = new Schema({
  nrcFront: {
    type: String,
    trim: true,
  },
  nrcBack: {
    type: String,
    trim: true,
  },
  selfie: {
    type: String,
    trim: true,
  },
}, { _id: false });

// Referrer profile schema
const ReferrerProfileSchema = new Schema({
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true,
  },
  totalEarnings: {
    type: Number,
    default: 0,
    min: 0,
  },
  availableBalance: {
    type: Number,
    default: 0,
    min: 0,
  },
  pendingBalance: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalReferrals: {
    type: Number,
    default: 0,
    min: 0,
  },
  successfulHires: {
    type: Number,
    default: 0,
    min: 0,
  },
  paymentMethods: [PaymentMethodSchema],
  kycStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'not_submitted'],
    default: 'not_submitted',
  },
  kycDocuments: {
    type: KYCDocumentsSchema,
    default: {},
  },
  kycSubmittedAt: {
    type: Date,
  },
  kycVerifiedAt: {
    type: Date,
  },
  
  // Viral tracking fields - Phase 1
  parentReferrerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  inviteCode: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  inviteCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  networkSize: {
    type: Number,
    default: 0, // Total downline size (direct + indirect)
    min: 0,
  },
  directReferrals: {
    type: Number,
    default: 0, // Users directly invited
    min: 0,
  },
  tierLevel: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze',
    index: true,
  },
  tierProgress: {
    type: Number,
    default: 0, // Percentage to next tier
    min: 0,
    max: 100,
  },
  tierUpgradedAt: {
    type: Date,
  },
  networkEarnings: {
    type: Number,
    default: 0, // Earnings from downline activity
    min: 0,
  },
  
  // WhatsApp integration
  whatsappNumber: {
    type: String,
    trim: true,
  },
  whatsappOptIn: {
    type: Boolean,
    default: false,
  },
  whatsappVerifiedAt: {
    type: Date,
  },
  
  // Email marketing preferences
  emailPreferences: {
    marketing: { type: Boolean, default: true },
    jobAlerts: { type: Boolean, default: true },
    referralUpdates: { type: Boolean, default: true },
    newsletter: { type: Boolean, default: true },
  },
  
  // Lead scoring
  leadScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  scoreFactors: {
    profileCompleteness: { type: Number, default: 0 },
    activityScore: { type: Number, default: 0 },
    referralQuality: { type: Number, default: 0 },
    engagementScore: { type: Number, default: 0 },
  },
}, { _id: false });

// Job seeker profile schema
const JobSeekerProfileSchema = new Schema({
  resume: {
    type: String,
    trim: true,
  },
  skills: [{
    type: String,
    trim: true,
  }],
  experience: {
    type: String,
    trim: true,
  },
  education: {
    type: String,
    trim: true,
  },
  portfolioUrl: {
    type: String,
    trim: true,
  },
  linkedInUrl: {
    type: String,
    trim: true,
  },
}, { _id: false });

// Main User Schema
const UserSchema = new Schema({
  // Authentication fields
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false, // Don't include password in queries by default
  },
  
  // Profile fields
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  phone: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s-()]{8,20}$/, 'Please enter a valid phone number'],
  },
  avatar: {
    type: String,
    trim: true,
  },
  
  // Role and type
  role: {
    type: String,
    enum: {
      values: ['platform_admin', 'corporate_admin', 'corporate_recruiter', 'corporate_viewer', 'referrer', 'job_seeker'],
      message: '{VALUE} is not a valid role',
    },
    required: [true, 'Role is required'],
    default: 'job_seeker',
  },
  
  // Role-specific profiles
  referrerProfile: {
    type: ReferrerProfileSchema,
    default: undefined,
  },
  jobseekerProfile: {
    type: JobSeekerProfileSchema,
    default: undefined,
  },
  
  // Account status
  status: {
    type: String,
    enum: ['active', 'suspended', 'deleted'],
    default: 'active',
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerifiedAt: {
    type: Date,
  },
  
  // Security
  loginAttempts: {
    type: Number,
    default: 0,
  },
  lockUntil: {
    type: Date,
  },
  passwordChangedAt: {
    type: Date,
  },
  passwordResetToken: {
    type: String,
    select: false,
  },
  passwordResetExpires: {
    type: Date,
    select: false,
  },
  
  // Timestamps
  lastLoginAt: {
    type: Date,
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ==================== INDEXES ====================

// Primary indexes for performance
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ 'referrerProfile.referralCode': 1 }, { unique: true, sparse: true });
UserSchema.index({ 'referrerProfile.inviteCode': 1 }, { unique: true, sparse: true });
UserSchema.index({ 'referrerProfile.parentReferrerId': 1 });
UserSchema.index({ 'referrerProfile.tierLevel': 1 });
UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ status: 1, createdAt: -1 });
UserSchema.index({ 'referrerProfile.kycStatus': 1 });
UserSchema.index({ 'referrerProfile.networkSize': -1 }); // For leaderboard

// ==================== VIRTUALS ====================

// Virtual for user's full profile based on role
UserSchema.virtual('profile').get(function() {
  if (this.role === 'referrer' && this.referrerProfile) {
    return this.referrerProfile;
  }
  if (this.role === 'job_seeker' && this.jobseekerProfile) {
    return this.jobseekerProfile;
  }
  return null;
});

// Virtual to check if account is locked
UserSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// ==================== MIDDLEWARE ====================

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
  // Only hash password if it's modified
  if (!this.isModified('password')) {
    if (typeof next === 'function') next();
    return;
  }
  
  try {
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    
    // Update passwordChangedAt if not new user
    if (!this.isNew) {
      this.passwordChangedAt = Date.now() - 1000; // Subtract 1s to ensure token is created after
    }
    
    if (typeof next === 'function') next();
  } catch (error) {
    if (typeof next === 'function') next(error);
  }
});

// Pre-save middleware to generate referral code for referrers
UserSchema.pre('save', async function(next) {
  if (this.isNew && this.role === 'referrer' && !this.referrerProfile?.referralCode) {
    // Generate unique referral code
    const code = generateReferralCode();
    const inviteCode = generateInviteCode();
    this.referrerProfile = {
      ...this.referrerProfile,
      referralCode: code,
      inviteCode: inviteCode,
    };
  }
  if (typeof next === 'function') next();
});

// ==================== INSTANCE METHODS ====================

/**
 * Compare candidate password with stored hash
 * @param {string} candidatePassword - Password to compare
 * @returns {Promise<boolean>} True if passwords match
 */
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Check if password was changed after JWT token was issued
 * @param {number} JWTTimestamp - JWT issued at timestamp
 * @returns {boolean} True if password was changed after token
 */
UserSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

/**
 * Increment login attempts and lock account if necessary
 * @returns {Promise<void>}
 */
UserSchema.methods.incrementLoginAttempts = async function() {
  // Reset if lock has expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 };
  }
  
  return this.updateOne(updates);
};

// ==================== STATIC METHODS ====================

/**
 * Find user by email
 * @param {string} email - User email
 * @returns {Promise<Document|null>} User document
 */
UserSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

/**
 * Find user by referral code
 * @param {string} code - Referral code
 * @returns {Promise<Document|null>} User document
 */
UserSchema.statics.findByReferralCode = function(code) {
  return this.findOne({ 'referrerProfile.referralCode': code.toUpperCase() });
};

/**
 * Find user by invite code
 * @param {string} code - Invite code
 * @returns {Promise<Document|null>} User document
 */
UserSchema.statics.findByInviteCode = function(code) {
  return this.findOne({ 'referrerProfile.inviteCode': code.toUpperCase() });
};

/**
 * Find referrers by parent referrer ID (direct downline)
 * @param {string} parentId - Parent referrer ID
 * @returns {Promise<Array>} Array of user documents
 */
UserSchema.statics.findByParentReferrer = function(parentId) {
  return this.find({ 'referrerProfile.parentReferrerId': parentId })
    .select('name email avatar referrerProfile.tierLevel referrerProfile.inviteCode referrerProfile.networkSize createdAt')
    .sort({ createdAt: -1 });
};

/**
 * Get leaderboard of top referrers by network size
 * @param {number} limit - Number of results
 * @returns {Promise<Array>} Array of top referrers
 */
UserSchema.statics.getLeaderboard = async function(limit = 20) {
  return this.find({ 
    role: 'referrer',
    'referrerProfile.networkSize': { $gt: 0 }
  })
    .select('name avatar referrerProfile.tierLevel referrerProfile.networkSize referrerProfile.directReferrals referrerProfile.networkEarnings')
    .sort({ 'referrerProfile.networkSize': -1 })
    .limit(limit);
};

/**
 * Find active users by role
 * @param {string} role - User role
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of user documents
 */
UserSchema.statics.findByRole = function(role, options = {}) {
  const query = { role, status: 'active' };
  return this.find(query)
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 100)
    .skip(options.skip || 0);
};

/**
 * Get referrer statistics
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Referrer statistics
 */
UserSchema.statics.getReferrerStats = async function(userId) {
  const user = await this.findById(userId).select('referrerProfile');
  if (!user || !user.referrerProfile) {
    return null;
  }
  
  return {
    totalEarnings: user.referrerProfile.totalEarnings,
    availableBalance: user.referrerProfile.availableBalance,
    pendingBalance: user.referrerProfile.pendingBalance,
    totalReferrals: user.referrerProfile.totalReferrals,
    successfulHires: user.referrerProfile.successfulHires,
    kycStatus: user.referrerProfile.kycStatus,
  };
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Generate unique referral code
 * @returns {string} Unique referral code
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
 * @returns {string} Unique invite code
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

// Create and export the model
const User = mongoose.model('User', UserSchema);

module.exports = User;
