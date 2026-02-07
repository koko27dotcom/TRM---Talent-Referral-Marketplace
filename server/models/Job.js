/**
 * Job Model
 * Represents job postings on the platform
 * Includes job details, requirements, referral settings, and application configuration
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Location schema
const LocationSchema = new Schema({
  type: {
    type: String,
    enum: ['onsite', 'remote', 'hybrid'],
    required: [true, 'Location type is required'],
  },
  city: {
    type: String,
    required: [true, 'City is required'],
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
}, { _id: false });

// Salary schema
const SalarySchema = new Schema({
  min: {
    type: Number,
    min: 0,
  },
  max: {
    type: Number,
    min: 0,
  },
  currency: {
    type: String,
    default: 'MMK',
    trim: true,
  },
  period: {
    type: String,
    enum: ['hourly', 'daily', 'monthly', 'yearly'],
    default: 'monthly',
  },
  isNegotiable: {
    type: Boolean,
    default: false,
  },
}, { _id: false });

// Custom question schema for applications
const CustomQuestionSchema = new Schema({
  question: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['text', 'textarea', 'select', 'multiselect', 'number', 'date', 'file'],
    required: true,
  },
  required: {
    type: Boolean,
    default: false,
  },
  options: [{
    type: String,
    trim: true,
  }],
  placeholder: {
    type: String,
    trim: true,
  },
}, { _id: true });

// Application settings schema
const ApplicationSettingsSchema = new Schema({
  requireResume: {
    type: Boolean,
    default: true,
  },
  requireCoverLetter: {
    type: Boolean,
    default: false,
  },
  customQuestions: [CustomQuestionSchema],
  deadline: {
    type: Date,
  },
  allowMultipleApplications: {
    type: Boolean,
    default: false,
  },
  autoReplyEnabled: {
    type: Boolean,
    default: true,
  },
  autoReplyMessage: {
    type: String,
    trim: true,
    default: 'Thank you for your application. We will review it and get back to you soon.',
  },
}, { _id: false });

// Stats schema
const StatsSchema = new Schema({
  views: {
    type: Number,
    default: 0,
    min: 0,
  },
  uniqueViews: {
    type: Number,
    default: 0,
    min: 0,
  },
  applications: {
    type: Number,
    default: 0,
    min: 0,
  },
  referrals: {
    type: Number,
    default: 0,
    min: 0,
  },
  hires: {
    type: Number,
    default: 0,
    min: 0,
  },
}, { _id: false });

// Main Job Schema
const JobSchema = new Schema({
  // Basic Information
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Job description is required'],
    trim: true,
  },
  summary: {
    type: String,
    trim: true,
    maxlength: [500, 'Summary cannot exceed 500 characters'],
  },
  
  // Company relationship
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company is required'],
    index: true,
  },
  postedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Posted by is required'],
  },
  
  // Location
  location: {
    type: LocationSchema,
    required: [true, 'Location is required'],
  },
  
  // Employment Details
  type: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'internship', 'freelance'],
    required: [true, 'Employment type is required'],
  },
  category: {
    type: String,
    trim: true,
    index: true,
  },
  department: {
    type: String,
    trim: true,
  },
  experienceLevel: {
    type: String,
    enum: ['entry', 'mid', 'senior', 'lead', 'executive'],
  },
  
  // Salary
  salary: {
    type: SalarySchema,
    default: () => ({}),
  },
  
  // Requirements
  requirements: [{
    type: String,
    trim: true,
  }],
  responsibilities: [{
    type: String,
    trim: true,
  }],
  benefits: [{
    type: String,
    trim: true,
  }],
  skills: [{
    type: String,
    trim: true,
  }],
  
  // Referral Settings
  referralBonus: {
    type: Number,
    required: [true, 'Referral bonus is required'],
    min: [0, 'Bonus cannot be negative'],
  },
  bonusCurrency: {
    type: String,
    default: 'MMK',
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'pending', 'active', 'paused', 'closed', 'filled'],
    default: 'draft',
    index: true,
  },
  statusChangedAt: {
    type: Date,
  },
  statusChangedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  statusChangeReason: {
    type: String,
    trim: true,
  },
  
  // Visibility
  isFeatured: {
    type: Boolean,
    default: false,
    index: true,
  },
  isUrgent: {
    type: Boolean,
    default: false,
    index: true,
  },
  featuredUntil: {
    type: Date,
  },
  
  // Featured Job Enhancement (Phase 2)
  featuredPriority: {
    type: Number,
    min: 1,
    max: 10,
    default: 10, // Lower = higher priority (1 = top priority)
    index: true,
  },
  featuredSlotId: {
    type: Schema.Types.ObjectId,
    ref: 'FeaturedJobSlot',
    index: true,
  },
  featuredMetrics: {
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
    clicks: {
      type: Number,
      default: 0,
      min: 0,
    },
    applications: {
      type: Number,
      default: 0,
      min: 0,
    },
    hires: {
      type: Number,
      default: 0,
      min: 0,
    },
    ctr: { // Click-through rate
      type: Number,
      default: 0,
    },
    conversionRate: { // Application rate
      type: Number,
      default: 0,
    },
  },
  featuredBidAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  featuredStartDate: {
    type: Date,
  },
  featuredEndDate: {
    type: Date,
  },
  
  // Application Settings
  applicationSettings: {
    type: ApplicationSettingsSchema,
    default: () => ({}),
  },
  
  // Statistics
  stats: {
    type: StatsSchema,
    default: () => ({}),
  },
  
  // SEO
  metaTitle: {
    type: String,
    trim: true,
    maxlength: [70, 'Meta title cannot exceed 70 characters'],
  },
  metaDescription: {
    type: String,
    trim: true,
    maxlength: [160, 'Meta description cannot exceed 160 characters'],
  },
  
  // Timestamps
  publishedAt: {
    type: Date,
    index: true,
  },
  expiresAt: {
    type: Date,
    index: true,
  },
  filledAt: {
    type: Date,
  },
  
  // Pricing Information
  pricingBreakdown: {
    basePrice: {
      type: Number,
      min: 0,
      default: 0,
    },
    baseAdjustments: [{
      type: {
        type: String,
        enum: ['category', 'featured', 'urgent', 'other'],
      },
      description: String,
      amount: Number,
      multiplier: Number,
    }],
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    subtotal: {
      type: Number,
      min: 0,
      default: 0,
    },
    surgePricing: {
      applied: {
        type: Boolean,
        default: false,
      },
      multipliers: [{
        type: {
          type: String,
          enum: ['urgency', 'weekend', 'holiday', 'high_demand'],
        },
        description: String,
        multiplier: Number,
      }],
      totalMultiplier: {
        type: Number,
        default: 1.0,
      },
      amount: {
        type: Number,
        default: 0,
      },
    },
    volumeDiscount: {
      tier: String,
      discount: {
        type: Number,
        default: 0,
      },
      amount: {
        type: Number,
        default: 0,
      },
    },
    dynamicRules: [{
      ruleId: {
        type: Schema.Types.ObjectId,
        ref: 'PricingRule',
      },
      name: String,
      type: String,
      adjustmentType: String,
      adjustmentValue: Number,
      amount: Number,
      previousPrice: Number,
      newPrice: Number,
    }],
    promotionalCode: {
      code: String,
      valid: Boolean,
      discountType: {
        type: String,
        enum: ['percentage', 'fixed_amount', 'free_service', 'credit'],
      },
      discountValue: Number,
      discountAmount: {
        type: Number,
        default: 0,
      },
    },
    finalPrice: {
      type: Number,
      min: 0,
      default: 0,
    },
    currency: {
      type: String,
      default: 'MMK',
    },
    calculatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  surgePricingApplied: {
    type: Boolean,
    default: false,
    index: true,
  },
  promotionalCodeUsed: {
    type: Schema.Types.ObjectId,
    ref: 'PromotionalCode',
    index: true,
  },
  
  // Billing Information
  billingRecordId: {
    type: Schema.Types.ObjectId,
    ref: 'BillingRecord',
  },
  paidAt: {
    type: Date,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded', 'waived'],
    default: 'pending',
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ==================== INDEXES ====================

JobSchema.index({ companyId: 1, status: 1 });
JobSchema.index({ status: 1, isFeatured: 1, publishedAt: -1 });
JobSchema.index({ status: 1, isFeatured: 1, featuredPriority: 1, publishedAt: -1 });
JobSchema.index({ status: 1, category: 1, publishedAt: -1 });
JobSchema.index({ title: 'text', description: 'text', summary: 'text' });
JobSchema.index({ 'location.city': 1, status: 1 });
JobSchema.index({ type: 1, status: 1 });
JobSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { status: 'closed' } });
JobSchema.index({ featuredEndDate: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { isFeatured: true } });

// ==================== VIRTUALS ====================

// Virtual for job URL
JobSchema.virtual('url').get(function() {
  return `/jobs/${this.slug || this._id}`;
});

// Virtual for formatted salary
JobSchema.virtual('formattedSalary').get(function() {
  if (!this.salary || (!this.salary.min && !this.salary.max)) {
    return 'Negotiable';
  }
  
  const currency = this.salary.currency || 'MMK';
  const period = this.salary.period || 'monthly';
  
  if (this.salary.min && this.salary.max) {
    return `${this.salary.min.toLocaleString()} - ${this.salary.max.toLocaleString()} ${currency}/${period}`;
  } else if (this.salary.min) {
    return `From ${this.salary.min.toLocaleString()} ${currency}/${period}`;
  } else {
    return `Up to ${this.salary.max.toLocaleString()} ${currency}/${period}`;
  }
});

// Virtual for days since posted
JobSchema.virtual('daysSincePosted').get(function() {
  if (!this.publishedAt) return null;
  const diffTime = Math.abs(new Date() - this.publishedAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for is active
JobSchema.virtual('isActive').get(function() {
  return this.status === 'active';
});

// Virtual for is expired
JobSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Virtual for is featured active
JobSchema.virtual('isFeaturedActive').get(function() {
  return this.isFeatured && this.featuredEndDate && this.featuredEndDate > new Date();
});

// Virtual for featured days remaining
JobSchema.virtual('featuredDaysRemaining').get(function() {
  if (!this.featuredEndDate || !this.isFeatured) return 0;
  const diffTime = this.featuredEndDate - new Date();
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
});

// ==================== MIDDLEWARE ====================

// Pre-save middleware to generate slug
JobSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('title')) {
    const baseSlug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // Check for existing slugs and append number if needed
    let slug = baseSlug;
    let counter = 1;
    
    while (await mongoose.model('Job').findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    this.slug = slug;
  }
  
  // Update publishedAt when status changes to active
  if (this.isModified('status') && this.status === 'active' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  // Update statusChangedAt when status changes
  if (this.isModified('status')) {
    this.statusChangedAt = new Date();
  }
  
  if (typeof next === 'function') next();
});

// ==================== INSTANCE METHODS ====================

/**
 * Increment view count
 * @returns {Promise<void>}
 */
JobSchema.methods.incrementViews = async function() {
  this.stats.views += 1;
  await this.save();
};

/**
 * Increment application count
 * @returns {Promise<void>}
 */
JobSchema.methods.incrementApplications = async function() {
  this.stats.applications += 1;
  await this.save();
};

/**
 * Increment referral count
 * @returns {Promise<void>}
 */
JobSchema.methods.incrementReferrals = async function() {
  this.stats.referrals += 1;
  await this.save();
};

/**
 * Mark job as filled
 * @param {string} userId - User who marked as filled
 * @returns {Promise<void>}
 */
JobSchema.methods.markAsFilled = async function(userId) {
  this.status = 'filled';
  this.filledAt = new Date();
  this.statusChangedBy = userId;
  await this.save();
};

/**
 * Check if job is accepting applications
 * @returns {boolean}
 */
JobSchema.methods.isAcceptingApplications = function() {
  if (this.status !== 'active') return false;
  if (this.expiresAt && this.expiresAt < new Date()) return false;
  if (this.applicationSettings.deadline && this.applicationSettings.deadline < new Date()) return false;
  return true;
};

// ==================== STATIC METHODS ====================

/**
 * Find job by slug
 * @param {string} slug - Job slug
 * @returns {Promise<Document|null>}
 */
JobSchema.statics.findBySlug = function(slug) {
  return this.findOne({ slug: slug.toLowerCase() });
};

/**
 * Find active jobs with filters
 * @param {Object} filters - Filter criteria
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
JobSchema.statics.findActiveJobs = function(filters = {}, options = {}) {
  const query = { status: 'active', ...filters };
  
  // Handle expiration
  query.$or = [
    { expiresAt: { $exists: false } },
    { expiresAt: { $gt: new Date() } },
  ];
  
  return this.find(query)
    .populate('companyId', 'name slug logo')
    .sort(options.sort || { isFeatured: -1, publishedAt: -1 })
    .limit(options.limit || 20)
    .skip(options.skip || 0);
};

/**
 * Search jobs by keyword
 * @param {string} keyword - Search keyword
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
JobSchema.statics.search = function(keyword, options = {}) {
  const query = {
    $text: { $search: keyword },
    status: 'active',
  };
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .populate('companyId', 'name slug logo')
    .sort({ score: { $meta: 'textScore' } })
    .limit(options.limit || 20)
    .skip(options.skip || 0);
};

/**
 * Find jobs by company
 * @param {string} companyId - Company ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
JobSchema.statics.findByCompany = function(companyId, options = {}) {
  const query = { companyId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

/**
 * Get featured jobs
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
JobSchema.statics.findFeatured = function(options = {}) {
  return this.find({
    status: 'active',
    isFeatured: true,
    $or: [
      { featuredUntil: { $exists: false } },
      { featuredUntil: { $gt: new Date() } },
      { featuredEndDate: { $exists: false } },
      { featuredEndDate: { $gt: new Date() } },
    ],
  })
    .populate('companyId', 'name slug logo')
    .sort(options.sort || { featuredPriority: 1, publishedAt: -1 })
    .limit(options.limit || 10);
};

/**
 * Get featured jobs for carousel (sorted by priority)
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
JobSchema.statics.findFeaturedForCarousel = function(options = {}) {
  return this.find({
    status: 'active',
    isFeatured: true,
    $or: [
      { featuredEndDate: { $exists: false } },
      { featuredEndDate: { $gt: new Date() } },
    ],
  })
    .populate('companyId', 'name slug logo industry')
    .sort({ featuredPriority: 1, featuredBidAmount: -1, publishedAt: -1 })
    .limit(options.limit || 10);
};

/**
 * Increment featured job views
 * @param {string} jobId - Job ID
 * @param {boolean} isUnique - Whether this is a unique view
 * @returns {Promise<void>}
 */
JobSchema.statics.incrementFeaturedViews = async function(jobId, isUnique = false) {
  const update = {
    $inc: { 'featuredMetrics.views': 1 },
  };
  
  if (isUnique) {
    update.$inc['featuredMetrics.uniqueViews'] = 1;
  }
  
  const job = await this.findByIdAndUpdate(jobId, update, { new: true });
  
  if (job && job.featuredMetrics.views > 0) {
    job.featuredMetrics.ctr = (job.featuredMetrics.clicks / job.featuredMetrics.views) * 100;
    await job.save();
  }
};

/**
 * Increment featured job clicks
 * @param {string} jobId - Job ID
 * @returns {Promise<void>}
 */
JobSchema.statics.incrementFeaturedClicks = async function(jobId) {
  const job = await this.findByIdAndUpdate(
    jobId,
    { $inc: { 'featuredMetrics.clicks': 1 } },
    { new: true }
  );
  
  if (job && job.featuredMetrics.views > 0) {
    job.featuredMetrics.ctr = (job.featuredMetrics.clicks / job.featuredMetrics.views) * 100;
    await job.save();
  }
};

/**
 * Increment featured job applications
 * @param {string} jobId - Job ID
 * @returns {Promise<void>}
 */
JobSchema.statics.incrementFeaturedApplications = async function(jobId) {
  const job = await this.findByIdAndUpdate(
    jobId,
    { $inc: { 'featuredMetrics.applications': 1 } },
    { new: true }
  );
  
  if (job && job.featuredMetrics.views > 0) {
    job.featuredMetrics.conversionRate = (job.featuredMetrics.applications / job.featuredMetrics.views) * 100;
    await job.save();
  }
};

/**
 * Set job as featured
 * @param {string} jobId - Job ID
 * @param {Object} featuredData - Featured job data
 * @returns {Promise<Object>}
 */
JobSchema.statics.setAsFeatured = async function(jobId, featuredData = {}) {
  const {
    priority = 10,
    slotId = null,
    bidAmount = 0,
    durationDays = 7,
  } = featuredData;
  
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + durationDays);
  
  const job = await this.findByIdAndUpdate(
    jobId,
    {
      $set: {
        isFeatured: true,
        featuredPriority: priority,
        featuredSlotId: slotId,
        featuredBidAmount: bidAmount,
        featuredStartDate: startDate,
        featuredEndDate: endDate,
        featuredUntil: endDate,
      },
    },
    { new: true }
  );
  
  return job;
};

/**
 * Remove featured status from job
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>}
 */
JobSchema.statics.removeFeaturedStatus = async function(jobId) {
  const job = await this.findByIdAndUpdate(
    jobId,
    {
      $set: {
        isFeatured: false,
        featuredPriority: 10,
      },
    },
    { new: true }
  );
  
  return job;
};

/**
 * Get featured job analytics
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>}
 */
JobSchema.statics.getFeaturedAnalytics = async function(jobId) {
  const job = await this.findById(jobId);
  if (!job) return null;
  
  return {
    jobId: job._id,
    title: job.title,
    isFeatured: job.isFeatured,
    featuredPriority: job.featuredPriority,
    featuredMetrics: job.featuredMetrics,
    featuredBidAmount: job.featuredBidAmount,
    featuredStartDate: job.featuredStartDate,
    featuredEndDate: job.featuredEndDate,
    featuredDaysRemaining: job.featuredDaysRemaining,
    roi: job.featuredBidAmount > 0
      ? ((job.featuredMetrics.applications * 50000) / job.featuredBidAmount * 100).toFixed(2)
      : 0,
  };
};

/**
 * Get job statistics
 * @param {Object} filters - Filter criteria
 * @returns {Promise<Object>}
 */
JobSchema.statics.getStats = async function(filters = {}) {
  const stats = await this.aggregate([
    { $match: filters },
    {
      $group: {
        _id: null,
        totalJobs: { $sum: 1 },
        activeJobs: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        totalViews: { $sum: '$stats.views' },
        totalApplications: { $sum: '$stats.applications' },
        totalReferrals: { $sum: '$stats.referrals' },
        totalHires: { $sum: '$stats.hires' },
      },
    },
  ]);
  
  return stats[0] || {
    totalJobs: 0,
    activeJobs: 0,
    totalViews: 0,
    totalApplications: 0,
    totalReferrals: 0,
    totalHires: 0,
  };
};

/**
 * Get jobs by category with count
 * @returns {Promise<Array>}
 */
JobSchema.statics.getCategories = async function() {
  return this.aggregate([
    { $match: { status: 'active', category: { $exists: true, $ne: null } } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
};

// Create and export the model
const Job = mongoose.model('Job', JobSchema);

module.exports = Job;
