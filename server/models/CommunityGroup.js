/**
 * CommunityGroup Model
 * User groups for community organization
 * Supports different categories, privacy settings, and moderation
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Group category constants
const GROUP_CATEGORIES = {
  INDUSTRY: 'industry',
  ROLE: 'role',
  LOCATION: 'location',
  INTEREST: 'interest',
  COMPANY: 'company',
  SKILL: 'skill',
};

// Group status constants
const GROUP_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  ARCHIVED: 'archived',
};

// Member role constants
const MEMBER_ROLES = {
  MEMBER: 'member',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
};

// Membership request status
const MEMBERSHIP_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

// Member schema
const MemberSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    enum: Object.values(MEMBER_ROLES),
    default: MEMBER_ROLES.MEMBER,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  joinedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  lastActivityAt: {
    type: Date,
    default: Date.now,
  },
  notificationsEnabled: {
    type: Boolean,
    default: true,
  },
}, { _id: true });

// Moderator schema
const ModeratorSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  appointedAt: {
    type: Date,
    default: Date.now,
  },
  appointedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  permissions: [{
    type: String,
    enum: ['approve_posts', 'remove_posts', 'ban_users', 'edit_group', 'manage_members'],
  }],
}, { _id: true });

// Rule schema
const RuleSchema = new Schema({
  title: {
    type: String,
    required: true,
    maxlength: 100,
  },
  description: {
    type: String,
    maxlength: 500,
  },
  order: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: true });

// Membership request schema
const MembershipRequestSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  message: {
    type: String,
    maxlength: 500,
  },
  status: {
    type: String,
    enum: Object.values(MEMBERSHIP_STATUS),
    default: MEMBERSHIP_STATUS.PENDING,
  },
  requestedAt: {
    type: Date,
    default: Date.now,
  },
  reviewedAt: {
    type: Date,
  },
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewNote: {
    type: String,
  },
}, { _id: true });

// Community Group Schema
const CommunityGroupSchema = new Schema({
  groupId: {
    type: String,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    index: true,
  },
  description: {
    type: String,
    maxlength: 2000,
  },
  shortDescription: {
    type: String,
    maxlength: 200,
  },
  category: {
    type: String,
    enum: Object.values(GROUP_CATEGORIES),
    required: true,
    index: true,
  },
  subcategory: {
    type: String,
    trim: true,
    index: true,
  },
  creatorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  members: [MemberSchema],
  moderators: [ModeratorSchema],
  rules: [RuleSchema],
  membershipRequests: [MembershipRequestSchema],
  isPrivate: {
    type: Boolean,
    default: false,
    index: true,
  },
  requiresApproval: {
    type: Boolean,
    default: false,
  },
  memberCount: {
    type: Number,
    default: 0,
  },
  postsCount: {
    type: Number,
    default: 0,
  },
  coverImage: {
    type: String,
  },
  avatar: {
    type: String,
  },
  status: {
    type: String,
    enum: Object.values(GROUP_STATUS),
    default: GROUP_STATUS.ACTIVE,
    index: true,
  },
  // Tags for discovery
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 30,
  }],
  // Location for location-based groups
  location: {
    city: String,
    region: String,
    country: String,
  },
  // Settings
  settings: {
    allowPostsByMembers: {
      type: Boolean,
      default: true,
    },
    requirePostApproval: {
      type: Boolean,
      default: false,
    },
    allowFileUploads: {
      type: Boolean,
      default: true,
    },
    welcomeMessage: {
      type: String,
      maxlength: 1000,
    },
  },
  // Statistics
  statistics: {
    totalPosts: {
      type: Number,
      default: 0,
    },
    totalComments: {
      type: Number,
      default: 0,
    },
    weeklyActiveMembers: {
      type: Number,
      default: 0,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
  },
  // SEO
  slug: {
    type: String,
    unique: true,
    sparse: true,
  },
}, {
  timestamps: true,
});

// Indexes for common queries
CommunityGroupSchema.index({ category: 1, status: 1, memberCount: -1 });
CommunityGroupSchema.index({ isPrivate: 1, status: 1, category: 1 });
CommunityGroupSchema.index({ tags: 1, status: 1 });
CommunityGroupSchema.index({ 'location.city': 1, status: 1 });
CommunityGroupSchema.index({ name: 'text', description: 'text', tags: 'text' });
CommunityGroupSchema.index({ memberCount: -1, createdAt: -1 });

// Generate groupId and slug before saving
CommunityGroupSchema.pre('save', async function(next) {
  if (!this.groupId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.groupId = `GRP${timestamp}${random}`;
  }
  
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 100);
  }
  
  // Update member count
  this.memberCount = this.members?.length || 0;
  
  next();
});

// Virtual for active members count
CommunityGroupSchema.virtual('activeMembersCount').get(function() {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return this.members?.filter(m => m.lastActivityAt >= oneWeekAgo).length || 0;
});

// Method to check if user is member
CommunityGroupSchema.methods.isMember = function(userId) {
  return this.members.some(member => member.userId.toString() === userId.toString());
};

// Method to check if user is moderator
CommunityGroupSchema.methods.isModerator = function(userId) {
  return this.moderators.some(mod => mod.userId.toString() === userId.toString()) ||
         this.creatorId.toString() === userId.toString();
};

// Method to check if user is admin
CommunityGroupSchema.methods.isAdmin = function(userId) {
  const member = this.members.find(m => m.userId.toString() === userId.toString());
  return member?.role === MEMBER_ROLES.ADMIN || this.creatorId.toString() === userId.toString();
};

// Method to add member
CommunityGroupSchema.methods.addMember = function(userId, joinedBy = null) {
  if (!this.isMember(userId)) {
    this.members.push({
      userId,
      joinedBy,
      joinedAt: new Date(),
    });
    this.memberCount = this.members.length;
    return true;
  }
  return false;
};

// Method to remove member
CommunityGroupSchema.methods.removeMember = function(userId) {
  const index = this.members.findIndex(m => m.userId.toString() === userId.toString());
  if (index > -1) {
    this.members.splice(index, 1);
    this.memberCount = this.members.length;
    
    // Also remove from moderators if applicable
    const modIndex = this.moderators.findIndex(m => m.userId.toString() === userId.toString());
    if (modIndex > -1) {
      this.moderators.splice(modIndex, 1);
    }
    
    return true;
  }
  return false;
};

// Method to add moderator
CommunityGroupSchema.methods.addModerator = function(userId, appointedBy, permissions = []) {
  if (this.isMember(userId) && !this.isModerator(userId)) {
    this.moderators.push({
      userId,
      appointedBy,
      appointedAt: new Date(),
      permissions: permissions.length > 0 ? permissions : ['approve_posts', 'remove_posts'],
    });
    
    // Update member role
    const member = this.members.find(m => m.userId.toString() === userId.toString());
    if (member) {
      member.role = MEMBER_ROLES.MODERATOR;
    }
    
    return true;
  }
  return false;
};

// Method to remove moderator
CommunityGroupSchema.methods.removeModerator = function(userId) {
  const index = this.moderators.findIndex(m => m.userId.toString() === userId.toString());
  if (index > -1) {
    this.moderators.splice(index, 1);
    
    // Update member role
    const member = this.members.find(m => m.userId.toString() === userId.toString());
    if (member) {
      member.role = MEMBER_ROLES.MEMBER;
    }
    
    return true;
  }
  return false;
};

// Method to request membership
CommunityGroupSchema.methods.requestMembership = function(userId, message = '') {
  if (!this.isMember(userId)) {
    const existingRequest = this.membershipRequests.find(
      r => r.userId.toString() === userId.toString() && r.status === MEMBERSHIP_STATUS.PENDING
    );
    
    if (!existingRequest) {
      this.membershipRequests.push({
        userId,
        message,
        status: MEMBERSHIP_STATUS.PENDING,
        requestedAt: new Date(),
      });
      return true;
    }
  }
  return false;
};

// Method to approve membership request
CommunityGroupSchema.methods.approveMembershipRequest = function(requestId, reviewedBy, note = '') {
  const request = this.membershipRequests.id(requestId);
  if (request && request.status === MEMBERSHIP_STATUS.PENDING) {
    request.status = MEMBERSHIP_STATUS.APPROVED;
    request.reviewedAt = new Date();
    request.reviewedBy = reviewedBy;
    request.reviewNote = note;
    
    this.addMember(request.userId, reviewedBy);
    return true;
  }
  return false;
};

// Method to reject membership request
CommunityGroupSchema.methods.rejectMembershipRequest = function(requestId, reviewedBy, note = '') {
  const request = this.membershipRequests.id(requestId);
  if (request && request.status === MEMBERSHIP_STATUS.PENDING) {
    request.status = MEMBERSHIP_STATUS.REJECTED;
    request.reviewedAt = new Date();
    request.reviewedBy = reviewedBy;
    request.reviewNote = note;
    return true;
  }
  return false;
};

// Method to update member activity
CommunityGroupSchema.methods.updateMemberActivity = function(userId) {
  const member = this.members.find(m => m.userId.toString() === userId.toString());
  if (member) {
    member.lastActivityAt = new Date();
    this.statistics.lastActivityAt = new Date();
    return true;
  }
  return false;
};

// Method to increment posts count
CommunityGroupSchema.methods.incrementPostsCount = function() {
  this.postsCount += 1;
  this.statistics.totalPosts += 1;
  this.statistics.lastActivityAt = new Date();
};

// Static method to get popular groups
CommunityGroupSchema.statics.getPopular = async function(limit = 10, category = null) {
  const query = { status: GROUP_STATUS.ACTIVE, isPrivate: false };
  if (category) {
    query.category = category;
  }
  
  return this.find(query)
    .sort({ memberCount: -1, createdAt: -1 })
    .limit(limit)
    .select('-membershipRequests')
    .lean();
};

// Static method to get recommended groups for user
CommunityGroupSchema.statics.getRecommended = async function(userId, interests = [], limit = 10) {
  const userGroups = await this.find({
    'members.userId': userId,
  }).select('_id');
  
  const userGroupIds = userGroups.map(g => g._id);
  
  return this.find({
    _id: { $nin: userGroupIds },
    status: GROUP_STATUS.ACTIVE,
    isPrivate: false,
    $or: [
      { category: { $in: interests } },
      { tags: { $in: interests } },
    ],
  })
    .sort({ memberCount: -1 })
    .limit(limit)
    .select('-membershipRequests -members')
    .lean();
};

// Static method to search groups
CommunityGroupSchema.statics.search = async function(query, options = {}) {
  const { limit = 20, skip = 0, category = null } = options;
  
  const searchQuery = {
    status: GROUP_STATUS.ACTIVE,
    isPrivate: false,
    $text: { $search: query },
  };
  
  if (category) {
    searchQuery.category = category;
  }
  
  return this.find(searchQuery, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' }, memberCount: -1 })
    .skip(skip)
    .limit(limit)
    .select('-membershipRequests')
    .lean();
};

const CommunityGroup = mongoose.model('CommunityGroup', CommunityGroupSchema);

module.exports = CommunityGroup;