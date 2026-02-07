/**
 * Company Model
 * Represents corporate clients on the platform
 * Includes subscription management, verification status, and company settings
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Address schema
const AddressSchema = new Schema({
  street: {
    type: String,
    trim: true,
  },
  city: {
    type: String,
    trim: true,
  },
  state: {
    type: String,
    trim: true,
  },
  country: {
    type: String,
    default: 'Myanmar',
    trim: true,
  },
  postalCode: {
    type: String,
    trim: true,
  },
}, { _id: false });

// Current subscription schema (embedded)
const CurrentSubscriptionSchema = new Schema({
  planId: {
    type: Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired', 'past_due'],
    default: 'active',
  },
  startedAt: {
    type: Date,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  autoRenew: {
    type: Boolean,
    default: true,
  },
}, { _id: false });

// Branding schema
const BrandingSchema = new Schema({
  primaryColor: {
    type: String,
    trim: true,
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color'],
  },
  secondaryColor: {
    type: String,
    trim: true,
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color'],
  },
  accentColor: {
    type: String,
    trim: true,
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color'],
  },
  bannerImage: {
    type: String,
    trim: true,
  },
  logo: {
    type: String,
    trim: true,
  },
  favicon: {
    type: String,
    trim: true,
  },
  customDomain: {
    type: String,
    trim: true,
    lowercase: true,
  },
  customCss: {
    type: String,
    trim: true,
  },
  companyFont: {
    type: String,
    trim: true,
  },
}, { _id: false });

// Settings schema
const SettingsSchema = new Schema({
  requireApproval: {
    type: Boolean,
    default: false,
  },
  defaultReferralBonus: {
    type: Number,
    default: 100000, // 100,000 MMK
    min: 0,
  },
  notificationPreferences: {
    emailOnNewReferral: {
      type: Boolean,
      default: true,
    },
    emailOnStatusChange: {
      type: Boolean,
      default: true,
    },
    emailOnNewApplication: {
      type: Boolean,
      default: true,
    },
    dailyDigest: {
      type: Boolean,
      default: false,
    },
  },
}, { _id: false });

// CRM Contact History schema
const ContactHistorySchema = new Schema({
  type: {
    type: String,
    enum: ['email', 'phone', 'whatsapp', 'meeting', 'video_call', 'note'],
    required: true,
  },
  direction: {
    type: String,
    enum: ['inbound', 'outbound'],
    default: 'outbound',
  },
  subject: {
    type: String,
    trim: true,
  },
  content: {
    type: String,
    trim: true,
  },
  contactPerson: {
    name: { type: String, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    role: { type: String, trim: true },
  },
  conductedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  conductedAt: {
    type: Date,
    default: Date.now,
  },
  outcome: {
    type: String,
    enum: ['successful', 'no_response', 'follow_up_needed', 'not_interested', 'converted', 'other'],
    default: 'other',
  },
  followUpDate: {
    type: Date,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, { _id: true });

// CRM Tags schema
const TagSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  color: {
    type: String,
    default: '#3B82F6',
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color'],
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
  addedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, { _id: true });

// CRM Follow-up Reminder schema
const FollowUpReminderSchema = new Schema({
  type: {
    type: String,
    enum: ['call', 'email', 'meeting', 'proposal', 'renewal', 'check_in'],
    required: true,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  notes: {
    type: String,
    trim: true,
  },
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'snoozed', 'cancelled'],
    default: 'pending',
  },
  completedAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: true });

// CRM Schema for sales tracking
const CRMSchema = new Schema({
  // Contact tracking
  lastContactDate: {
    type: Date,
  },
  lastContactType: {
    type: String,
    enum: ['email', 'phone', 'whatsapp', 'meeting', 'video_call', 'none'],
    default: 'none',
  },
  nextFollowUpDate: {
    type: Date,
  },
  
  // Contact history
  contactHistory: [ContactHistorySchema],
  
  // Follow-up reminders
  followUpReminders: [FollowUpReminderSchema],
  
  // Tags
  tags: [TagSchema],
  
  // Sales stage
  salesStage: {
    type: String,
    enum: ['prospect', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost', 'churned'],
    default: 'prospect',
  },
  
  // Lead source
  leadSource: {
    type: String,
    enum: ['organic', 'referral', 'whatsapp', 'facebook', 'linkedin', 'email_campaign', 'cold_outreach', 'event', 'other'],
    default: 'organic',
  },
  
  // Assigned sales rep
  assignedSalesRep: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  
  // Conversion probability (0-100)
  conversionProbability: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  
  // Estimated deal value
  estimatedDealValue: {
    type: Number,
    default: 0,
    min: 0,
  },
  
  // Expected close date
  expectedCloseDate: {
    type: Date,
  },
  
  // Notes
  internalNotes: {
    type: String,
    trim: true,
  },
  
  // WhatsApp engagement
  whatsappEngagement: {
    messagesReceived: { type: Number, default: 0 },
    messagesSent: { type: Number, default: 0 },
    lastMessageAt: { type: Date },
    optInStatus: { type: String, enum: ['opted_in', 'opted_out', 'pending'], default: 'pending' },
  },
}, { _id: false });

// Stats schema
const StatsSchema = new Schema({
  totalJobsPosted: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalHires: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalReferralSpend: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalSpent: {
    type: Number,
    default: 0,
    min: 0,
  },
  
  // Response time tracking (in hours)
  avgResponseTime: {
    type: Number,
    default: 0,
  },
  totalResponses: {
    type: Number,
    default: 0,
  },
  
  // Job posting frequency
  jobsPostedThisMonth: {
    type: Number,
    default: 0,
  },
  lastJobPostedAt: {
    type: Date,
  },
  
  // Enterprise stats
  apiCallsThisMonth: {
    type: Number,
    default: 0,
  },
  bulkJobsPosted: {
    type: Number,
    default: 0,
  },
  webhooksTriggered: {
    type: Number,
    default: 0,
  },
}, { _id: false });

// Main Company Schema
const CompanySchema = new Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [200, 'Company name cannot exceed 200 characters'],
  },
  slug: {
    type: String,
    required: [true, 'Company slug is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [5000, 'Description cannot exceed 5000 characters'],
  },
  logo: {
    type: String,
    trim: true,
  },
  website: {
    type: String,
    trim: true,
    match: [/^https?:\/\/.+/, 'Please enter a valid URL'],
  },
  industry: {
    type: String,
    trim: true,
  },
  companySize: {
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'],
  },
  
  // Contact Information
  email: {
    type: String,
    required: [true, 'Company email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
  },
  phone: {
    type: String,
    trim: true,
  },
  address: {
    type: AddressSchema,
    default: {},
  },
  
  // Business Registration
  registrationNumber: {
    type: String,
    trim: true,
  },
  taxId: {
    type: String,
    trim: true,
  },
  
  // Verification
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending',
  },
  verifiedAt: {
    type: Date,
  },
  verifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  verificationNotes: {
    type: String,
    trim: true,
  },
  
  // Subscription
  currentSubscription: {
    type: CurrentSubscriptionSchema,
    default: undefined,
  },
  
  // Limits
  jobPostingLimit: {
    type: Number,
    default: 5,
    min: 0,
  },
  activeJobCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  
  // Branding & Settings
  branding: {
    type: BrandingSchema,
    default: {},
  },
  settings: {
    type: SettingsSchema,
    default: () => ({}),
  },
  
  // Statistics
  stats: {
    type: StatsSchema,
    default: () => ({}),
  },
  
  // CRM Data
  crm: {
    type: CRMSchema,
    default: () => ({}),
  },
  
  // Lead Score (cached from LeadScore model)
  leadScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
    index: true,
  },
  
  // ==================== ENTERPRISE FIELDS ====================
  
  // Enterprise Plan
  enterprisePlan: {
    type: Schema.Types.ObjectId,
    ref: 'EnterprisePlan',
    index: true,
  },
  
  // Enterprise Features (enabled features array for granular control)
  enterpriseFeatures: [{
    type: String,
    enum: [
      'api_access',
      'bulk_posting',
      'custom_branding',
      'white_label',
      'custom_domain',
      'advanced_analytics',
      'dedicated_manager',
      'priority_support',
      'sso',
      'saml',
      'webhooks',
      'custom_integrations',
      'audit_logs',
      'approval_workflows',
      'competitor_insights',
    ],
  }],
  
  // Custom Branding (extends branding schema)
  customBranding: {
    enabled: {
      type: Boolean,
      default: false,
    },
    logo: {
      type: String,
      trim: true,
    },
    colors: {
      primary: {
        type: String,
        trim: true,
        match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color'],
      },
      secondary: {
        type: String,
        trim: true,
        match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color'],
      },
      accent: {
        type: String,
        trim: true,
        match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color'],
      },
    },
    domain: {
      type: String,
      trim: true,
      lowercase: true,
    },
    customCss: {
      type: String,
      trim: true,
    },
    favicon: {
      type: String,
      trim: true,
    },
  },
  
  // Account Manager (assigned enterprise manager)
  accountManager: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  
  // Team Members (array of CompanyUser references)
  teamMembers: [{
    type: Schema.Types.ObjectId,
    ref: 'CompanyUser',
  }],
  
  // API Access Configuration
  apiAccess: {
    enabled: {
      type: Boolean,
      default: false,
    },
    apiKeys: [{
      name: {
        type: String,
        required: true,
        trim: true,
      },
      key: {
        type: String,
        required: true,
        trim: true,
      },
      prefix: {
        type: String,
        trim: true,
      },
      permissions: [{
        type: String,
        enum: ['read:jobs', 'write:jobs', 'read:referrals', 'write:referrals', 'read:analytics', 'admin'],
      }],
      rateLimit: {
        type: Number,
        default: 1000, // requests per hour
      },
      lastUsedAt: {
        type: Date,
      },
      usageCount: {
        type: Number,
        default: 0,
      },
      expiresAt: {
        type: Date,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      isActive: {
        type: Boolean,
        default: true,
      },
    }],
    webhookUrl: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'Please enter a valid URL'],
    },
    webhookSecret: {
      type: String,
      trim: true,
    },
    webhookEvents: [{
      type: String,
      enum: [
        'job.created',
        'job.updated',
        'job.closed',
        'application.received',
        'referral.created',
        'referral.hired',
        'candidate.shortlisted',
        'candidate.rejected',
      ],
    }],
    webhookEnabled: {
      type: Boolean,
      default: false,
    },
    webhookLastError: {
      type: String,
      trim: true,
    },
    webhookLastSuccess: {
      type: Date,
    },
  },
  
  // SSO/SAML Configuration
  ssoConfig: {
    enabled: {
      type: Boolean,
      default: false,
    },
    provider: {
      type: String,
      enum: ['saml', 'oauth', 'openid', 'azure_ad', 'google_workspace', 'okta'],
    },
    // SAML Configuration
    saml: {
      entityId: {
        type: String,
        trim: true,
      },
      ssoUrl: {
        type: String,
        trim: true,
      },
      certificate: {
        type: String,
        trim: true,
      },
      metadataUrl: {
        type: String,
        trim: true,
      },
    },
    // OAuth Configuration
    oauth: {
      clientId: {
        type: String,
        trim: true,
      },
      clientSecret: {
        type: String,
        trim: true,
      },
      authorizationUrl: {
        type: String,
        trim: true,
      },
      tokenUrl: {
        type: String,
        trim: true,
      },
      scopes: [{
        type: String,
        trim: true,
      }],
    },
    // Attribute Mapping
    attributeMapping: {
      email: {
        type: String,
        default: 'email',
      },
      firstName: {
        type: String,
        default: 'firstName',
      },
      lastName: {
        type: String,
        default: 'lastName',
      },
      role: {
        type: String,
        default: 'role',
      },
      department: {
        type: String,
        default: 'department',
      },
    },
    // Domain restriction for SSO
    allowedDomains: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
    // Auto-provision users
    autoProvision: {
      type: Boolean,
      default: true,
    },
    // Default role for auto-provisioned users
    defaultRole: {
      type: String,
      enum: ['viewer', 'recruiter', 'hiring_manager', 'admin'],
      default: 'viewer',
    },
  },
  
  // Enterprise Status
  enterpriseStatus: {
    type: String,
    enum: ['none', 'trial', 'active', 'suspended', 'cancelled'],
    default: 'none',
  },
  
  // Enterprise Trial
  enterpriseTrial: {
    startedAt: {
      type: Date,
    },
    endsAt: {
      type: Date,
    },
    convertedAt: {
      type: Date,
    },
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'suspended', 'deleted'],
    default: 'active',
  },
  
  // Created by (initial admin)
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ==================== INDEXES ====================

CompanySchema.index({ slug: 1 }, { unique: true });
CompanySchema.index({ name: 'text', description: 'text' });
CompanySchema.index({ 'currentSubscription.status': 1 });
CompanySchema.index({ verificationStatus: 1 });
CompanySchema.index({ status: 1, industry: 1 });
CompanySchema.index({ createdAt: -1 });
CompanySchema.index({ leadScore: -1 });
CompanySchema.index({ 'crm.salesStage': 1, leadScore: -1 });
CompanySchema.index({ 'crm.lastContactDate': -1 });
CompanySchema.index({ 'crm.assignedSalesRep': 1 });
CompanySchema.index({ 'crm.nextFollowUpDate': 1 });
CompanySchema.index({ enterprisePlan: 1 });
CompanySchema.index({ enterpriseStatus: 1 });
CompanySchema.index({ accountManager: 1 });
CompanySchema.index({ 'apiAccess.enabled': 1 });
CompanySchema.index({ 'ssoConfig.enabled': 1 });

// ==================== VIRTUALS ====================

// Virtual for company URL
CompanySchema.virtual('url').get(function() {
  return `/companies/${this.slug}`;
});

// Virtual for remaining job slots
CompanySchema.virtual('remainingJobSlots').get(function() {
  return Math.max(0, this.jobPostingLimit - this.activeJobCount);
});

// Virtual for can post jobs
CompanySchema.virtual('canPostJobs').get(function() {
  return (
    this.status === 'active' &&
    this.verificationStatus === 'verified' &&
    this.currentSubscription?.status === 'active' &&
    this.activeJobCount < this.jobPostingLimit
  );
});

// Virtual for CRM days since last contact
CompanySchema.virtual('daysSinceLastContact').get(function() {
  if (!this.crm?.lastContactDate) return null;
  const diff = Date.now() - new Date(this.crm.lastContactDate).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

// Virtual for overdue follow-ups
CompanySchema.virtual('hasOverdueFollowUp').get(function() {
  if (!this.crm?.nextFollowUpDate) return false;
  return new Date(this.crm.nextFollowUpDate) < new Date();
});

// Virtual for pending reminders count
CompanySchema.virtual('pendingRemindersCount').get(function() {
  if (!this.crm?.followUpReminders) return 0;
  return this.crm.followUpReminders.filter(
    r => r.status === 'pending' && new Date(r.dueDate) >= new Date()
  ).length;
});

// ==================== MIDDLEWARE ====================

// Pre-save middleware to generate slug from name if not provided
CompanySchema.pre('save', function(next) {
  if (this.isNew && !this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  if (typeof next === 'function') {
    next();
  }
});

// ==================== INSTANCE METHODS ====================

/**
 * Check if company has active subscription
 * @returns {boolean}
 */
CompanySchema.methods.hasActiveSubscription = function() {
  return (
    this.currentSubscription &&
    this.currentSubscription.status === 'active' &&
    this.currentSubscription.expiresAt > new Date()
  );
};

/**
 * Increment active job count
 * @returns {Promise<void>}
 */
CompanySchema.methods.incrementJobCount = async function() {
  this.activeJobCount += 1;
  this.stats.totalJobsPosted += 1;
  await this.save();
};

/**
 * Decrement active job count
 * @returns {Promise<void>}
 */
CompanySchema.methods.decrementJobCount = async function() {
  if (this.activeJobCount > 0) {
    this.activeJobCount -= 1;
    await this.save();
  }
};

/**
 * Update stats after hire
 * @param {number} referralBonus - Bonus amount paid
 * @returns {Promise<void>}
 */
CompanySchema.methods.recordHire = async function(referralBonus = 0) {
  this.stats.totalHires += 1;
  this.stats.totalReferralSpend += referralBonus;
  this.stats.totalSpent += referralBonus + 50000; // Include per-hire fee
  await this.save();
};

/**
 * Add contact history entry
 * @param {Object} contactData - Contact data
 * @returns {Promise<void>}
 */
CompanySchema.methods.addContactHistory = async function(contactData) {
  if (!this.crm) {
    this.crm = {};
  }
  if (!this.crm.contactHistory) {
    this.crm.contactHistory = [];
  }
  
  this.crm.contactHistory.push(contactData);
  this.crm.lastContactDate = contactData.conductedAt || new Date();
  this.crm.lastContactType = contactData.type;
  
  await this.save();
};

/**
 * Add follow-up reminder
 * @param {Object} reminderData - Reminder data
 * @returns {Promise<void>}
 */
CompanySchema.methods.addFollowUpReminder = async function(reminderData) {
  if (!this.crm) {
    this.crm = {};
  }
  if (!this.crm.followUpReminders) {
    this.crm.followUpReminders = [];
  }
  
  this.crm.followUpReminders.push(reminderData);
  
  // Update next follow-up date if this is sooner
  if (!this.crm.nextFollowUpDate || new Date(reminderData.dueDate) < new Date(this.crm.nextFollowUpDate)) {
    this.crm.nextFollowUpDate = reminderData.dueDate;
  }
  
  await this.save();
};

/**
 * Complete a follow-up reminder
 * @param {string} reminderId - Reminder ID
 * @returns {Promise<boolean>}
 */
CompanySchema.methods.completeReminder = async function(reminderId) {
  if (!this.crm?.followUpReminders) return false;
  
  const reminder = this.crm.followUpReminders.id(reminderId);
  if (!reminder || reminder.status === 'completed') return false;
  
  reminder.status = 'completed';
  reminder.completedAt = new Date();
  
  // Update next follow-up date
  const pendingReminders = this.crm.followUpReminders.filter(
    r => r.status === 'pending' && new Date(r.dueDate) > new Date()
  );
  
  if (pendingReminders.length > 0) {
    this.crm.nextFollowUpDate = pendingReminders.sort(
      (a, b) => new Date(a.dueDate) - new Date(b.dueDate)
    )[0].dueDate;
  } else {
    this.crm.nextFollowUpDate = null;
  }
  
  await this.save();
  return true;
};

/**
 * Add tag to company
 * @param {Object} tagData - Tag data
 * @returns {Promise<void>}
 */
CompanySchema.methods.addTag = async function(tagData) {
  if (!this.crm) {
    this.crm = {};
  }
  if (!this.crm.tags) {
    this.crm.tags = [];
  }
  
  // Check if tag already exists
  const exists = this.crm.tags.some(t => t.name.toLowerCase() === tagData.name.toLowerCase());
  if (!exists) {
    this.crm.tags.push(tagData);
    await this.save();
  }
};

/**
 * Remove tag from company
 * @param {string} tagId - Tag ID
 * @returns {Promise<boolean>}
 */
CompanySchema.methods.removeTag = async function(tagId) {
  if (!this.crm?.tags) return false;
  
  const tag = this.crm.tags.id(tagId);
  if (!tag) return false;
  
  tag.remove();
  await this.save();
  return true;
};

/**
 * Update sales stage
 * @param {string} stage - New sales stage
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<void>}
 */
CompanySchema.methods.updateSalesStage = async function(stage, metadata = {}) {
  if (!this.crm) {
    this.crm = {};
  }
  
  const oldStage = this.crm.salesStage;
  this.crm.salesStage = stage;
  
  // Update conversion probability based on stage
  const stageProbabilities = {
    prospect: 10,
    qualified: 25,
    proposal: 50,
    negotiation: 75,
    closed_won: 100,
    closed_lost: 0,
    churned: 0,
  };
  
  this.crm.conversionProbability = stageProbabilities[stage] || 0;
  
  // Add contact history entry for stage change
  await this.addContactHistory({
    type: 'note',
    subject: `Stage changed from ${oldStage} to ${stage}`,
    content: metadata.notes || `Sales stage updated to ${stage}`,
    conductedBy: metadata.userId,
    outcome: stage === 'closed_won' ? 'converted' : 'other',
  });
};

/**
 * Update WhatsApp engagement
 * @param {string} type - 'received' or 'sent'
 * @returns {Promise<void>}
 */
CompanySchema.methods.updateWhatsAppEngagement = async function(type) {
  if (!this.crm) {
    this.crm = {};
  }
  if (!this.crm.whatsappEngagement) {
    this.crm.whatsappEngagement = {
      messagesReceived: 0,
      messagesSent: 0,
      optInStatus: 'pending',
    };
  }
  
  if (type === 'received') {
    this.crm.whatsappEngagement.messagesReceived += 1;
  } else if (type === 'sent') {
    this.crm.whatsappEngagement.messagesSent += 1;
  }
  
  this.crm.whatsappEngagement.lastMessageAt = new Date();
  await this.save();
};

/**
 * Update response time statistics
 * @param {number} responseTimeHours - Response time in hours
 * @returns {Promise<void>}
 */
CompanySchema.methods.updateResponseTime = async function(responseTimeHours) {
  const currentTotal = this.stats.avgResponseTime * this.stats.totalResponses;
  this.stats.totalResponses += 1;
  this.stats.avgResponseTime = (currentTotal + responseTimeHours) / this.stats.totalResponses;
  await this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Find company by slug
 * @param {string} slug - Company slug
 * @returns {Promise<Document|null>}
 */
CompanySchema.statics.findBySlug = function(slug) {
  return this.findOne({ slug: slug.toLowerCase() });
};

/**
 * Find active companies
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
CompanySchema.statics.findActive = function(options = {}) {
  const query = { status: 'active' };
  
  if (options.industry) {
    query.industry = options.industry;
  }
  
  if (options.verifiedOnly) {
    query.verificationStatus = 'verified';
  }
  
  return this.find(query)
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

/**
 * Search companies by name or description
 * @param {string} searchTerm - Search query
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
CompanySchema.statics.search = function(searchTerm, options = {}) {
  return this.find(
    { $text: { $search: searchTerm }, status: 'active' },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(options.limit || 20)
    .skip(options.skip || 0);
};

/**
 * Get companies with expiring subscriptions
 * @param {number} days - Number of days until expiration
 * @returns {Promise<Array>}
 */
CompanySchema.statics.findExpiringSubscriptions = function(days = 7) {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + days);
  
  return this.find({
    'currentSubscription.status': 'active',
    'currentSubscription.expiresAt': { $lte: expirationDate },
    'currentSubscription.autoRenew': false,
  });
};

/**
 * Get company statistics
 * @param {string} companyId - Company ID
 * @returns {Promise<Object>}
 */
CompanySchema.statics.getStats = async function(companyId) {
  const company = await this.findById(companyId).select('stats activeJobCount jobPostingLimit');
  if (!company) return null;
  
  return {
    ...company.stats.toObject(),
    activeJobs: company.activeJobCount,
    jobLimit: company.jobPostingLimit,
    remainingSlots: Math.max(0, company.jobPostingLimit - company.activeJobCount),
  };
};

// ==================== ENTERPRISE INSTANCE METHODS ====================

/**
 * Check if company has enterprise plan
 * @returns {boolean}
 */
CompanySchema.methods.hasEnterprisePlan = function() {
  return this.enterpriseStatus === 'active' || this.enterpriseStatus === 'trial';
};

/**
 * Check if company has specific enterprise feature
 * @param {string} feature - Feature name
 * @returns {boolean}
 */
CompanySchema.methods.hasEnterpriseFeature = function(feature) {
  return this.enterpriseFeatures.includes(feature);
};

/**
 * Generate new API key
 * @param {Object} keyData - API key data
 * @returns {Promise<Object>}
 */
CompanySchema.methods.generateApiKey = async function(keyData) {
  if (!this.apiAccess) {
    this.apiAccess = { enabled: true, apiKeys: [] };
  }
  
  const crypto = await import('crypto');
  const key = crypto.randomBytes(32).toString('hex');
  const prefix = `trm_${keyData.name.toLowerCase().replace(/\s+/g, '_')}_${crypto.randomBytes(4).toString('hex')}`;
  
  const apiKey = {
    name: keyData.name,
    key: key,
    prefix: prefix,
    permissions: keyData.permissions || ['read:jobs'],
    rateLimit: keyData.rateLimit || 1000,
    createdBy: keyData.createdBy,
    expiresAt: keyData.expiresAt,
    isActive: true,
    createdAt: new Date(),
    usageCount: 0,
  };
  
  this.apiAccess.apiKeys.push(apiKey);
  this.apiAccess.enabled = true;
  await this.save();
  
  return {
    ...apiKey,
    key: `${prefix}.${key}`, // Return full key only once
  };
};

/**
 * Revoke API key
 * @param {string} keyId - API key ID
 * @returns {Promise<boolean>}
 */
CompanySchema.methods.revokeApiKey = async function(keyId) {
  if (!this.apiAccess?.apiKeys) return false;
  
  const key = this.apiAccess.apiKeys.id(keyId);
  if (!key) return false;
  
  key.isActive = false;
  await this.save();
  return true;
};

/**
 * Update API key usage
 * @param {string} keyId - API key ID
 * @returns {Promise<void>}
 */
CompanySchema.methods.updateApiKeyUsage = async function(keyId) {
  if (!this.apiAccess?.apiKeys) return;
  
  const key = this.apiAccess.apiKeys.id(keyId);
  if (key) {
    key.usageCount += 1;
    key.lastUsedAt = new Date();
    await this.save();
  }
};

/**
 * Update webhook configuration
 * @param {Object} config - Webhook configuration
 * @returns {Promise<void>}
 */
CompanySchema.methods.updateWebhookConfig = async function(config) {
  if (!this.apiAccess) {
    this.apiAccess = {};
  }
  
  this.apiAccess.webhookUrl = config.webhookUrl;
  this.apiAccess.webhookSecret = config.webhookSecret;
  this.apiAccess.webhookEvents = config.webhookEvents || [];
  this.apiAccess.webhookEnabled = config.enabled !== false;
  
  await this.save();
};

/**
 * Update custom branding
 * @param {Object} branding - Branding configuration
 * @returns {Promise<void>}
 */
CompanySchema.methods.updateCustomBranding = async function(branding) {
  this.customBranding = {
    ...this.customBranding,
    ...branding,
    enabled: true,
  };
  await this.save();
};

/**
 * Update SSO configuration
 * @param {Object} ssoConfig - SSO configuration
 * @returns {Promise<void>}
 */
CompanySchema.methods.updateSsoConfig = async function(ssoConfig) {
  this.ssoConfig = {
    ...this.ssoConfig,
    ...ssoConfig,
  };
  await this.save();
};

/**
 * Add team member
 * @param {string} companyUserId - CompanyUser ID
 * @returns {Promise<void>}
 */
CompanySchema.methods.addTeamMember = async function(companyUserId) {
  if (!this.teamMembers.includes(companyUserId)) {
    this.teamMembers.push(companyUserId);
    await this.save();
  }
};

/**
 * Remove team member
 * @param {string} companyUserId - CompanyUser ID
 * @returns {Promise<boolean>}
 */
CompanySchema.methods.removeTeamMember = async function(companyUserId) {
  const index = this.teamMembers.indexOf(companyUserId);
  if (index > -1) {
    this.teamMembers.splice(index, 1);
    await this.save();
    return true;
  }
  return false;
};

/**
 * Start enterprise trial
 * @param {string} planId - Enterprise plan ID
 * @param {number} trialDays - Number of trial days
 * @returns {Promise<void>}
 */
CompanySchema.methods.startEnterpriseTrial = async function(planId, trialDays = 14) {
  this.enterprisePlan = planId;
  this.enterpriseStatus = 'trial';
  this.enterpriseTrial = {
    startedAt: new Date(),
    endsAt: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000),
  };
  await this.save();
};

/**
 * Convert trial to active subscription
 * @returns {Promise<void>}
 */
CompanySchema.methods.convertTrial = async function() {
  if (this.enterpriseStatus === 'trial') {
    this.enterpriseStatus = 'active';
    this.enterpriseTrial.convertedAt = new Date();
    await this.save();
  }
};

// ==================== ENTERPRISE STATIC METHODS ====================

/**
 * Find companies with enterprise plans
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
CompanySchema.statics.findEnterpriseCompanies = function(options = {}) {
  const query = {
    enterpriseStatus: { $in: ['active', 'trial'] },
  };
  
  if (options.planId) {
    query.enterprisePlan = options.planId;
  }
  
  if (options.accountManager) {
    query.accountManager = options.accountManager;
  }
  
  return this.find(query)
    .populate('enterprisePlan', 'name tier pricing')
    .populate('accountManager', 'name email')
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

/**
 * Find companies with API access enabled
 * @returns {Promise<Array>}
 */
CompanySchema.statics.findWithApiAccess = function() {
  return this.find({
    'apiAccess.enabled': true,
  }).select('name apiAccess enterprisePlan');
};

/**
 * Validate API key
 * @param {string} apiKey - API key to validate
 * @returns {Promise<Object|null>}
 */
CompanySchema.statics.validateApiKey = async function(apiKey) {
  const [prefix, key] = apiKey.split('.');
  if (!prefix || !key) return null;
  
  const company = await this.findOne({
    'apiAccess.enabled': true,
    'apiAccess.apiKeys': {
      $elemMatch: {
        prefix,
        key,
        isActive: true,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } },
        ],
      },
    },
  });
  
  if (!company) return null;
  
  const keyDoc = company.apiAccess.apiKeys.find(k => k.prefix === prefix && k.key === key);
  
  return {
    companyId: company._id,
    companyName: company.name,
    keyId: keyDoc._id,
    permissions: keyDoc.permissions,
    rateLimit: keyDoc.rateLimit,
  };
};

// Create and export the model
const Company = mongoose.model('Company', CompanySchema);

module.exports = Company;
