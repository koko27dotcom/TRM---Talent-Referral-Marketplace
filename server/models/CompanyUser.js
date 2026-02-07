/**
 * CompanyUser Model
 * Represents the relationship between users and companies (team members)
 * Maps users to companies with specific roles and permissions
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Permission constants
const PERMISSIONS = {
  // Job permissions
  READ_JOBS: 'read:jobs',
  WRITE_JOBS: 'write:jobs',
  DELETE_JOBS: 'delete:jobs',
  
  // Referral permissions
  READ_REFERRALS: 'read:referrals',
  WRITE_REFERRALS: 'write:referrals',
  
  // Company permissions
  READ_COMPANY: 'read:company',
  WRITE_COMPANY: 'write:company',
  MANAGE_TEAM: 'manage:team',
  
  // Billing permissions
  READ_BILLING: 'read:billing',
  WRITE_BILLING: 'write:billing',
  
  // Analytics permissions
  READ_ANALYTICS: 'read:analytics',
};

// Role to permissions mapping
const ROLE_PERMISSIONS = {
  admin: [
    PERMISSIONS.READ_JOBS,
    PERMISSIONS.WRITE_JOBS,
    PERMISSIONS.DELETE_JOBS,
    PERMISSIONS.READ_REFERRALS,
    PERMISSIONS.WRITE_REFERRALS,
    PERMISSIONS.READ_COMPANY,
    PERMISSIONS.WRITE_COMPANY,
    PERMISSIONS.MANAGE_TEAM,
    PERMISSIONS.READ_BILLING,
    PERMISSIONS.WRITE_BILLING,
    PERMISSIONS.READ_ANALYTICS,
  ],
  recruiter: [
    PERMISSIONS.READ_JOBS,
    PERMISSIONS.WRITE_JOBS,
    PERMISSIONS.READ_REFERRALS,
    PERMISSIONS.WRITE_REFERRALS,
    PERMISSIONS.READ_COMPANY,
    PERMISSIONS.READ_ANALYTICS,
  ],
  viewer: [
    PERMISSIONS.READ_JOBS,
    PERMISSIONS.READ_REFERRALS,
    PERMISSIONS.READ_COMPANY,
    PERMISSIONS.READ_ANALYTICS,
  ],
};

// Main CompanyUser Schema
const CompanyUserSchema = new Schema({
  // Relationships
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true,
  },
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company ID is required'],
    index: true,
  },
  
  // Role within company
  role: {
    type: String,
    enum: ['admin', 'recruiter', 'viewer'],
    required: [true, 'Role is required'],
    default: 'viewer',
  },
  
  // Custom permissions (optional override)
  permissions: [{
    type: String,
    enum: Object.values(PERMISSIONS),
  }],
  
  // Department/Team
  department: {
    type: String,
    trim: true,
  },
  title: {
    type: String,
    trim: true,
  },
  
  // Invitation tracking
  invitedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  invitedAt: {
    type: Date,
    default: Date.now,
  },
  invitationToken: {
    type: String,
    select: false,
  },
  invitationExpires: {
    type: Date,
    select: false,
  },
  
  // Acceptance status
  invitationStatus: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending',
  },
  acceptedAt: {
    type: Date,
  },
  declinedAt: {
    type: Date,
  },
  declineReason: {
    type: String,
    trim: true,
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
  },
  deactivatedAt: {
    type: Date,
  },
  deactivatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ==================== INDEXES ====================

// Compound index to ensure unique user-company relationship
CompanyUserSchema.index({ userId: 1, companyId: 1 }, { unique: true });
CompanyUserSchema.index({ companyId: 1, role: 1 });
CompanyUserSchema.index({ companyId: 1, invitationStatus: 1 });
CompanyUserSchema.index({ userId: 1, isActive: 1 });

// ==================== VIRTUALS ====================

// Virtual for effective permissions (role-based + custom)
CompanyUserSchema.virtual('effectivePermissions').get(function() {
  const rolePerms = ROLE_PERMISSIONS[this.role] || [];
  const customPerms = this.permissions || [];
  return [...new Set([...rolePerms, ...customPerms])];
});

// Virtual for display name
CompanyUserSchema.virtual('displayRole').get(function() {
  const displayNames = {
    admin: 'Administrator',
    recruiter: 'Recruiter',
    viewer: 'Viewer',
  };
  return displayNames[this.role] || this.role;
});

// ==================== MIDDLEWARE ====================

// Pre-save middleware to update timestamps on status change
CompanyUserSchema.pre('save', function(next) {
  if (this.isModified('invitationStatus')) {
    if (this.invitationStatus === 'accepted' && !this.acceptedAt) {
      this.acceptedAt = new Date();
    }
    if (this.invitationStatus === 'declined' && !this.declinedAt) {
      this.declinedAt = new Date();
    }
  }
  next();
});

// ==================== INSTANCE METHODS ====================

/**
 * Check if user has specific permission
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
CompanyUserSchema.methods.hasPermission = function(permission) {
  const effectivePerms = this.effectivePermissions || ROLE_PERMISSIONS[this.role] || [];
  return effectivePerms.includes(permission);
};

/**
 * Check if user has any of the specified permissions
 * @param {Array<string>} permissions - Permissions to check
 * @returns {boolean}
 */
CompanyUserSchema.methods.hasAnyPermission = function(permissions) {
  return permissions.some(perm => this.hasPermission(perm));
};

/**
 * Check if user has all specified permissions
 * @param {Array<string>} permissions - Permissions to check
 * @returns {boolean}
 */
CompanyUserSchema.methods.hasAllPermissions = function(permissions) {
  return permissions.every(perm => this.hasPermission(perm));
};

/**
 * Accept invitation
 * @returns {Promise<void>}
 */
CompanyUserSchema.methods.acceptInvitation = async function() {
  this.invitationStatus = 'accepted';
  this.acceptedAt = new Date();
  this.invitationToken = undefined;
  this.invitationExpires = undefined;
  await this.save();
};

/**
 * Decline invitation
 * @param {string} reason - Optional decline reason
 * @returns {Promise<void>}
 */
CompanyUserSchema.methods.declineInvitation = async function(reason) {
  this.invitationStatus = 'declined';
  this.declinedAt = new Date();
  if (reason) {
    this.declineReason = reason;
  }
  await this.save();
};

/**
 * Deactivate team member
 * @param {string} deactivatedByUserId - User ID who deactivated
 * @returns {Promise<void>}
 */
CompanyUserSchema.methods.deactivate = async function(deactivatedByUserId) {
  this.isActive = false;
  this.deactivatedAt = new Date();
  this.deactivatedBy = deactivatedByUserId;
  await this.save();
};

/**
 * Reactivate team member
 * @returns {Promise<void>}
 */
CompanyUserSchema.methods.reactivate = async function() {
  this.isActive = true;
  this.deactivatedAt = undefined;
  this.deactivatedBy = undefined;
  await this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Find company-user relationship
 * @param {string} userId - User ID
 * @param {string} companyId - Company ID
 * @returns {Promise<Document|null>}
 */
CompanyUserSchema.statics.findRelationship = function(userId, companyId) {
  return this.findOne({ userId, companyId });
};

/**
 * Find all companies for a user
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
CompanyUserSchema.statics.findUserCompanies = function(userId, options = {}) {
  const query = { userId, isActive: true };
  
  if (options.invitationStatus) {
    query.invitationStatus = options.invitationStatus;
  }
  
  return this.find(query)
    .populate('companyId', 'name slug logo status')
    .sort(options.sort || { createdAt: -1 });
};

/**
 * Find all team members for a company
 * @param {string} companyId - Company ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
CompanyUserSchema.statics.findCompanyMembers = function(companyId, options = {}) {
  const query = { companyId, isActive: true };
  
  if (options.role) {
    query.role = options.role;
  }
  
  if (options.invitationStatus) {
    query.invitationStatus = options.invitationStatus;
  }
  
  return this.find(query)
    .populate('userId', 'name email avatar phone')
    .populate('invitedBy', 'name email')
    .sort(options.sort || { createdAt: -1 });
};

/**
 * Check if user is member of company
 * @param {string} userId - User ID
 * @param {string} companyId - Company ID
 * @returns {Promise<boolean>}
 */
CompanyUserSchema.statics.isMember = async function(userId, companyId) {
  const relationship = await this.findOne({
    userId,
    companyId,
    isActive: true,
    invitationStatus: 'accepted',
  });
  return !!relationship;
};

/**
 * Get user's role in company
 * @param {string} userId - User ID
 * @param {string} companyId - Company ID
 * @returns {Promise<string|null>}
 */
CompanyUserSchema.statics.getUserRole = async function(userId, companyId) {
  const relationship = await this.findOne({
    userId,
    companyId,
    isActive: true,
    invitationStatus: 'accepted',
  });
  return relationship ? relationship.role : null;
};

/**
 * Get pending invitations for user
 * @param {string} userId - User ID
 * @returns {Promise<Array>}
 */
CompanyUserSchema.statics.getPendingInvitations = function(userId) {
  return this.find({
    userId,
    invitationStatus: 'pending',
    isActive: true,
  }).populate('companyId', 'name slug logo');
};

/**
 * Count members by role
 * @param {string} companyId - Company ID
 * @returns {Promise<Object>}
 */
CompanyUserSchema.statics.countByRole = async function(companyId) {
  const counts = await this.aggregate([
    { $match: { companyId: new mongoose.Types.ObjectId(companyId), isActive: true, invitationStatus: 'accepted' } },
    { $group: { _id: '$role', count: { $sum: 1 } } },
  ]);
  
  const result = { admin: 0, recruiter: 0, viewer: 0 };
  counts.forEach(item => {
    result[item._id] = item.count;
  });
  return result;
};

// Create and export the model
const CompanyUser = mongoose.model('CompanyUser', CompanyUserSchema);

module.exports = CompanyUser;
module.exports.PERMISSIONS = PERMISSIONS;
