/**
 * User Segment Model
 * Dynamic user segmentation for targeted email campaigns
 * Supports complex filtering criteria based on user attributes and behavior
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Segment Condition Schema
const SegmentConditionSchema = new Schema({
  field: {
    type: String,
    required: true,
    trim: true,
  },
  operator: {
    type: String,
    enum: [
      'equals',
      'not_equals',
      'contains',
      'not_contains',
      'starts_with',
      'ends_with',
      'greater_than',
      'less_than',
      'greater_than_or_equal',
      'less_than_or_equal',
      'in',
      'not_in',
      'between',
      'exists',
      'not_exists',
      'is_empty',
      'is_not_empty',
    ],
    required: true,
  },
  value: Schema.Types.Mixed,
  value2: Schema.Types.Mixed, // For between operator
  
  // For related model queries
  relatedModel: {
    type: String,
    default: null,
  },
  relatedField: {
    type: String,
    default: null,
  },
  aggregation: {
    type: String,
    enum: [null, 'count', 'sum', 'avg', 'min', 'max', 'exists'],
    default: null,
  },
}, { _id: true });

// Segment Group Schema (for AND/OR logic)
const SegmentGroupSchema = new Schema({
  operator: {
    type: String,
    enum: ['AND', 'OR'],
    default: 'AND',
  },
  conditions: [SegmentConditionSchema],
}, { _id: true });

// Segment Rule Schema
const SegmentRuleSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  groups: [SegmentGroupSchema],
  // Match type between groups
  matchType: {
    type: String,
    enum: ['all', 'any'],
    default: 'all',
  },
}, { _id: false });

// Segment Member Schema (cached members)
const SegmentMemberSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
  // Why this user matches
  matchReason: {
    type: String,
    default: '',
  },
  // Last activity that triggered inclusion
  lastActivityAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: true });

// Main User Segment Schema
const UserSegmentSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  
  // Unique identifier
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: /^[a-z0-9_-]+$/,
  },
  
  // Segment Category
  category: {
    type: String,
    enum: [
      'role_based',
      'activity_based',
      'tier_based',
      'company_based',
      'behavioral',
      'engagement',
      'demographic',
      'custom',
    ],
    default: 'custom',
  },
  
  // Segment Type
  type: {
    type: String,
    enum: ['dynamic', 'static', 'combined'],
    default: 'dynamic',
  },
  
  // Filtering Rules
  rules: SegmentRuleSchema,
  
  // Predefined Segment (system segments)
  isSystem: {
    type: Boolean,
    default: false,
  },
  
  // System segment identifier
  systemKey: {
    type: String,
    default: null,
  },
  
  // Cached Members (for static segments or performance)
  members: [SegmentMemberSchema],
  
  // Member Statistics
  stats: {
    totalMembers: { type: Number, default: 0 },
    lastCalculatedAt: { type: Date, default: null },
    calculationDuration: { type: Number, default: 0 }, // in ms
  },
  
  // Auto-refresh settings (for dynamic segments)
  autoRefresh: {
    enabled: {
      type: Boolean,
      default: true,
    },
    interval: {
      type: String,
      enum: ['hourly', 'daily', 'weekly', 'manual'],
      default: 'daily',
    },
    lastRefreshedAt: {
      type: Date,
      default: null,
    },
    nextRefreshAt: {
      type: Date,
      default: null,
    },
  },
  
  // Combined Segment References (for type: 'combined')
  combinedSegments: [{
    segmentId: {
      type: Schema.Types.ObjectId,
      ref: 'UserSegment',
    },
    operator: {
      type: String,
      enum: ['include', 'exclude'],
      default: 'include',
    },
  }],
  
  // Exclusion Rules (users to exclude)
  exclusions: {
    userIds: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    emails: [{
      type: String,
      lowercase: true,
    }],
    domains: [{
      type: String,
      lowercase: true,
    }],
  },
  
  // Segment Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active',
  },
  
  // Usage Statistics
  usageStats: {
    timesUsed: { type: Number, default: 0 },
    lastUsedAt: { type: Date, default: null },
    campaignsUsed: [{
      type: Schema.Types.ObjectId,
      ref: 'EmailCampaign',
    }],
  },
  
  // Tags
  tags: [{
    type: String,
    trim: true,
    maxlength: 50,
  }],
  
  // Metadata
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    default: null,
  },
}, {
  timestamps: true,
});

// Indexes
UserSegmentSchema.index({ slug: 1 });
UserSegmentSchema.index({ category: 1, status: 1 });
UserSegmentSchema.index({ type: 1 });
UserSegmentSchema.index({ 'members.userId': 1 });
UserSegmentSchema.index({ isSystem: 1, systemKey: 1 });
UserSegmentSchema.index({ createdBy: 1 });
UserSegmentSchema.index({ organizationId: 1 });

// Predefined Segment Definitions (for system segments)
UserSegmentSchema.statics.PREDEFINED_SEGMENTS = {
  // Role-based segments
  all_referrers: {
    name: 'All Referrers',
    category: 'role_based',
    rules: {
      name: 'Referrer Role',
      groups: [{
        operator: 'AND',
        conditions: [{
          field: 'role',
          operator: 'equals',
          value: 'referrer',
        }],
      }],
    },
  },
  all_companies: {
    name: 'All Companies',
    category: 'role_based',
    rules: {
      name: 'Company Users',
      groups: [{
        operator: 'AND',
        conditions: [{
          field: 'role',
          operator: 'in',
          value: ['corporate_admin', 'corporate_recruiter', 'corporate_viewer'],
        }],
      }],
    },
  },
  all_jobseekers: {
    name: 'All Job Seekers',
    category: 'role_based',
    rules: {
      name: 'Job Seeker Role',
      groups: [{
        operator: 'AND',
        conditions: [{
          field: 'role',
          operator: 'equals',
          value: 'job_seeker',
        }],
      }],
    },
  },
  
  // Tier-based segments
  bronze_referrers: {
    name: 'Bronze Referrers',
    category: 'tier_based',
    rules: {
      name: 'Bronze Tier',
      groups: [{
        operator: 'AND',
        conditions: [
          { field: 'role', operator: 'equals', value: 'referrer' },
          { field: 'tier', operator: 'equals', value: 'bronze' },
        ],
      }],
    },
  },
  silver_referrers: {
    name: 'Silver Referrers',
    category: 'tier_based',
    rules: {
      name: 'Silver Tier',
      groups: [{
        operator: 'AND',
        conditions: [
          { field: 'role', operator: 'equals', value: 'referrer' },
          { field: 'tier', operator: 'equals', value: 'silver' },
        ],
      }],
    },
  },
  gold_referrers: {
    name: 'Gold Referrers',
    category: 'tier_based',
    rules: {
      name: 'Gold Tier',
      groups: [{
        operator: 'AND',
        conditions: [
          { field: 'role', operator: 'equals', value: 'referrer' },
          { field: 'tier', operator: 'equals', value: 'gold' },
        ],
      }],
    },
  },
  platinum_referrers: {
    name: 'Platinum Referrers',
    category: 'tier_based',
    rules: {
      name: 'Platinum Tier',
      groups: [{
        operator: 'AND',
        conditions: [
          { field: 'role', operator: 'equals', value: 'referrer' },
          { field: 'tier', operator: 'equals', value: 'platinum' },
        ],
      }],
    },
  },
  
  // Activity-based segments
  active_referrers: {
    name: 'Active Referrers',
    category: 'activity_based',
    rules: {
      name: 'Active in Last 30 Days',
      groups: [{
        operator: 'AND',
        conditions: [
          { field: 'role', operator: 'equals', value: 'referrer' },
          { field: 'lastActiveAt', operator: 'greater_than', value: '{{date:-30}}' },
        ],
      }],
    },
  },
  dormant_referrers: {
    name: 'Dormant Referrers',
    category: 'activity_based',
    rules: {
      name: 'Inactive for 30+ Days',
      groups: [{
        operator: 'AND',
        conditions: [
          { field: 'role', operator: 'equals', value: 'referrer' },
          { field: 'lastActiveAt', operator: 'less_than', value: '{{date:-30}}' },
        ],
      }],
    },
  },
  new_referrers: {
    name: 'New Referrers',
    category: 'activity_based',
    rules: {
      name: 'Joined in Last 7 Days',
      groups: [{
        operator: 'AND',
        conditions: [
          { field: 'role', operator: 'equals', value: 'referrer' },
          { field: 'createdAt', operator: 'greater_than', value: '{{date:-7}}' },
        ],
      }],
    },
  },
  
  // Engagement segments
  high_engagement: {
    name: 'High Engagement Users',
    category: 'engagement',
    rules: {
      name: 'High Email Engagement',
      groups: [{
        operator: 'AND',
        conditions: [
          { field: 'emailEngagementScore', operator: 'greater_than_or_equal', value: 70 },
        ],
      }],
    },
  },
  low_engagement: {
    name: 'Low Engagement Users',
    category: 'engagement',
    rules: {
      name: 'Low Email Engagement',
      groups: [{
        operator: 'AND',
        conditions: [
          { field: 'emailEngagementScore', operator: 'less_than', value: 30 },
        ],
      }],
    },
  },
  
  // Behavioral segments
  has_referrals: {
    name: 'Users with Referrals',
    category: 'behavioral',
    rules: {
      name: 'Has Made Referrals',
      groups: [{
        operator: 'AND',
        conditions: [{
          field: 'referralCount',
          operator: 'greater_than',
          value: 0,
          relatedModel: 'Referral',
          aggregation: 'count',
        }],
      }],
    },
  },
  no_referrals: {
    name: 'Users without Referrals',
    category: 'behavioral',
    rules: {
      name: 'No Referrals Made',
      groups: [{
        operator: 'AND',
        conditions: [
          { field: 'role', operator: 'equals', value: 'referrer' },
          { field: 'referralCount', operator: 'equals', value: 0 },
        ],
      }],
    },
  },
  has_earnings: {
    name: 'Users with Earnings',
    category: 'behavioral',
    rules: {
      name: 'Has Earned Commission',
      groups: [{
        operator: 'AND',
        conditions: [
          { field: 'totalEarnings', operator: 'greater_than', value: 0 },
        ],
      }],
    },
  },
};

// Method to build MongoDB query from rules
UserSegmentSchema.methods.buildQuery = function() {
  const buildConditionQuery = (condition) => {
    const query = {};
    
    // Handle special date values
    let value = condition.value;
    if (typeof value === 'string' && value.startsWith('{{date:')) {
      const days = parseInt(value.match(/{{date:([-\d]+)}}/)[1]);
      value = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }
    
    switch (condition.operator) {
      case 'equals':
        query[condition.field] = value;
        break;
      case 'not_equals':
        query[condition.field] = { $ne: value };
        break;
      case 'contains':
        query[condition.field] = { $regex: value, $options: 'i' };
        break;
      case 'not_contains':
        query[condition.field] = { $not: { $regex: value, $options: 'i' } };
        break;
      case 'starts_with':
        query[condition.field] = { $regex: `^${value}`, $options: 'i' };
        break;
      case 'ends_with':
        query[condition.field] = { $regex: `${value}$`, $options: 'i' };
        break;
      case 'greater_than':
        query[condition.field] = { $gt: value };
        break;
      case 'less_than':
        query[condition.field] = { $lt: value };
        break;
      case 'greater_than_or_equal':
        query[condition.field] = { $gte: value };
        break;
      case 'less_than_or_equal':
        query[condition.field] = { $lte: value };
        break;
      case 'in':
        query[condition.field] = { $in: Array.isArray(value) ? value : [value] };
        break;
      case 'not_in':
        query[condition.field] = { $nin: Array.isArray(value) ? value : [value] };
        break;
      case 'between':
        query[condition.field] = { $gte: value, $lte: condition.value2 };
        break;
      case 'exists':
        query[condition.field] = { $exists: true, $ne: null };
        break;
      case 'not_exists':
        query[condition.field] = { $exists: false };
        break;
      case 'is_empty':
        query[condition.field] = { $in: [null, '', []] };
        break;
      case 'is_not_empty':
        query[condition.field] = { $nin: [null, '', []] };
        break;
      default:
        break;
    }
    
    return query;
  };
  
  const buildGroupQuery = (group) => {
    const conditions = group.conditions.map(buildConditionQuery);
    
    if (group.operator === 'AND') {
      return conditions.length === 1 ? conditions[0] : { $and: conditions };
    } else {
      return conditions.length === 1 ? conditions[0] : { $or: conditions };
    }
  };
  
  if (!this.rules || !this.rules.groups || this.rules.groups.length === 0) {
    return {};
  }
  
  const groups = this.rules.groups.map(buildGroupQuery);
  
  if (this.rules.matchType === 'any') {
    return groups.length === 1 ? groups[0] : { $or: groups };
  } else {
    return groups.length === 1 ? groups[0] : { $and: groups };
  }
};

// Method to check if a user matches this segment
UserSegmentSchema.methods.matchesUser = function(user) {
  const evaluateCondition = (condition, userData) => {
    const fieldValue = userData[condition.field];
    let value = condition.value;
    
    // Handle date placeholders
    if (typeof value === 'string' && value.startsWith('{{date:')) {
      const days = parseInt(value.match(/{{date:([-\d]+)}}/)[1]);
      value = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === value;
      case 'not_equals':
        return fieldValue !== value;
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
      case 'not_contains':
        return !String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
      case 'starts_with':
        return String(fieldValue).toLowerCase().startsWith(String(value).toLowerCase());
      case 'ends_with':
        return String(fieldValue).toLowerCase().endsWith(String(value).toLowerCase());
      case 'greater_than':
        return Number(fieldValue) > Number(value);
      case 'less_than':
        return Number(fieldValue) < Number(value);
      case 'greater_than_or_equal':
        return Number(fieldValue) >= Number(value);
      case 'less_than_or_equal':
        return Number(fieldValue) <= Number(value);
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(value) && !value.includes(fieldValue);
      case 'between':
        return Number(fieldValue) >= Number(value) && Number(fieldValue) <= Number(condition.value2);
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      case 'not_exists':
        return fieldValue === undefined || fieldValue === null;
      case 'is_empty':
        return fieldValue === null || fieldValue === '' || (Array.isArray(fieldValue) && fieldValue.length === 0);
      case 'is_not_empty':
        return fieldValue !== null && fieldValue !== '' && (!Array.isArray(fieldValue) || fieldValue.length > 0);
      default:
        return false;
    }
  };
  
  const evaluateGroup = (group, userData) => {
    const results = group.conditions.map(c => evaluateCondition(c, userData));
    return group.operator === 'AND' ? results.every(Boolean) : results.some(Boolean);
  };
  
  if (!this.rules || !this.rules.groups) {
    return true;
  }
  
  const groupResults = this.rules.groups.map(g => evaluateGroup(g, user));
  return this.rules.matchType === 'any' ? groupResults.some(Boolean) : groupResults.every(Boolean);
};

// Method to refresh segment members
UserSegmentSchema.methods.refreshMembers = async function(UserModel) {
  const startTime = Date.now();
  
  if (this.type === 'static') {
    // Static segments don't auto-refresh
    return this.members;
  }
  
  const query = this.buildQuery();
  const users = await UserModel.find(query).select('_id').lean();
  
  // Update members
  const newMembers = users.map(u => ({
    userId: u._id,
    addedAt: new Date(),
  }));
  
  this.members = newMembers;
  this.stats.totalMembers = newMembers.length;
  this.stats.lastCalculatedAt = new Date();
  this.stats.calculationDuration = Date.now() - startTime;
  this.autoRefresh.lastRefreshedAt = new Date();
  
  // Set next refresh time
  const intervals = {
    hourly: 60 * 60 * 1000,
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
  };
  
  if (this.autoRefresh.enabled && intervals[this.autoRefresh.interval]) {
    this.autoRefresh.nextRefreshAt = new Date(Date.now() + intervals[this.autoRefresh.interval]);
  }
  
  await this.save();
  return newMembers;
};

// Static method to create system segments
UserSegmentSchema.statics.createSystemSegments = async function() {
  const segments = [];
  
  for (const [key, config] of Object.entries(this.PREDEFINED_SEGMENTS)) {
    const existing = await this.findOne({ systemKey: key });
    if (!existing) {
      const segment = new this({
        name: config.name,
        slug: key,
        category: config.category,
        type: 'dynamic',
        isSystem: true,
        systemKey: key,
        rules: config.rules,
        status: 'active',
        createdBy: null, // System created
      });
      await segment.save();
      segments.push(segment);
    }
  }
  
  return segments;
};

// Static method to get segment by system key
UserSegmentSchema.statics.findBySystemKey = function(key) {
  return this.findOne({ systemKey: key, isSystem: true });
};

const UserSegment = mongoose.model('UserSegment', UserSegmentSchema);

module.exports = UserSegment;
