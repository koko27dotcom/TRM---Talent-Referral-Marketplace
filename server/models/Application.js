/**
 * Application Model
 * Represents direct job applications from job seekers
 * Tracks application status and related information
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Custom answer schema
const CustomAnswerSchema = new Schema({
  questionId: {
    type: String,
    required: true,
  },
  question: {
    type: String,
    required: true,
  },
  answer: {
    type: String,
    required: true,
  },
}, { _id: false });

// Status history schema
const StatusHistorySchema = new Schema({
  status: {
    type: String,
    required: true,
  },
  changedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  changedAt: {
    type: Date,
    default: Date.now,
  },
  notes: {
    type: String,
    trim: true,
  },
}, { _id: true });

// Application status constants
const APPLICATION_STATUS = {
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  SHORTLISTED: 'shortlisted',
  INTERVIEW_SCHEDULED: 'interview_scheduled',
  INTERVIEW_COMPLETED: 'interview_completed',
  OFFER_EXTENDED: 'offer_extended',
  HIRED: 'hired',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
};

// Main Application Schema
const ApplicationSchema = new Schema({
  // Relationships
  jobId: {
    type: Schema.Types.ObjectId,
    ref: 'Job',
    required: [true, 'Job is required'],
    index: true,
  },
  applicantId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Applicant is required'],
    index: true,
  },
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company is required'],
    index: true,
  },
  
  // Application details
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  resumeUrl: {
    type: String,
    trim: true,
  },
  coverLetter: {
    type: String,
    trim: true,
  },
  
  // Portfolio and links
  portfolioUrl: {
    type: String,
    trim: true,
  },
  linkedInUrl: {
    type: String,
    trim: true,
  },
  githubUrl: {
    type: String,
    trim: true,
  },
  
  // Custom question answers
  answers: [CustomAnswerSchema],
  
  // Status
  status: {
    type: String,
    enum: Object.values(APPLICATION_STATUS),
    default: APPLICATION_STATUS.SUBMITTED,
    index: true,
  },
  
  // Status history
  statusHistory: [StatusHistorySchema],
  
  // Source tracking
  source: {
    type: {
      type: String,
      enum: ['direct', 'job_board', 'company_website', 'referral', 'social_media', 'other'],
      default: 'direct',
    },
    referrerCode: {
      type: String,
      trim: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
  },
  
  // Review information
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewedAt: {
    type: Date,
  },
  reviewNotes: {
    type: String,
    trim: true,
  },
  
  // Rating (1-5 stars)
  rating: {
    type: Number,
    min: 1,
    max: 5,
  },
  
  // Tags for organization
  tags: [{
    type: String,
    trim: true,
  }],
  
  // Important dates
  submittedAt: {
    type: Date,
    default: Date.now,
  },
  shortlistedAt: {
    type: Date,
  },
  interviewScheduledAt: {
    type: Date,
  },
  hiredAt: {
    type: Date,
  },
  rejectedAt: {
    type: Date,
  },
  withdrawnAt: {
    type: Date,
  },
  
  // Withdrawal
  withdrawnBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  withdrawalReason: {
    type: String,
    trim: true,
  },
  
  // Rejection
  rejectionReason: {
    type: String,
    trim: true,
  },
  
  // Notifications
  notificationsSent: {
    applicationReceived: {
      type: Boolean,
      default: false,
    },
    statusUpdate: {
      type: Boolean,
      default: false,
    },
    interviewReminder: {
      type: Boolean,
      default: false,
    },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ==================== INDEXES ====================

ApplicationSchema.index({ jobId: 1, status: 1 });
ApplicationSchema.index({ applicantId: 1, status: 1 });
ApplicationSchema.index({ companyId: 1, status: 1 });
ApplicationSchema.index({ jobId: 1, applicantId: 1 }, { unique: true }); // Prevent duplicate applications
ApplicationSchema.index({ submittedAt: -1 });
ApplicationSchema.index({ email: 1 });

// ==================== VIRTUALS ====================

// Virtual for days since submission
ApplicationSchema.virtual('daysSinceSubmitted').get(function() {
  const diffTime = Math.abs(new Date() - this.submittedAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for is active
ApplicationSchema.virtual('isActive').get(function() {
  return !['rejected', 'withdrawn', 'hired'].includes(this.status);
});

// Virtual for full application status
ApplicationSchema.virtual('applicationStatus').get(function() {
  const statusLabels = {
    [APPLICATION_STATUS.SUBMITTED]: 'Application Submitted',
    [APPLICATION_STATUS.UNDER_REVIEW]: 'Under Review',
    [APPLICATION_STATUS.SHORTLISTED]: 'Shortlisted',
    [APPLICATION_STATUS.INTERVIEW_SCHEDULED]: 'Interview Scheduled',
    [APPLICATION_STATUS.INTERVIEW_COMPLETED]: 'Interview Completed',
    [APPLICATION_STATUS.OFFER_EXTENDED]: 'Offer Extended',
    [APPLICATION_STATUS.HIRED]: 'Hired',
    [APPLICATION_STATUS.REJECTED]: 'Not Selected',
    [APPLICATION_STATUS.WITHDRAWN]: 'Withdrawn',
  };
  return statusLabels[this.status] || this.status;
});

// ==================== MIDDLEWARE ====================

// Pre-save middleware to initialize status history
ApplicationSchema.pre('save', async function(next) {
  if (this.isNew) {
    this.statusHistory.push({
      status: this.status,
      changedAt: this.submittedAt,
      notes: 'Application submitted',
    });
    
    // Populate companyId from job if not set
    if (!this.companyId && this.jobId) {
      const Job = mongoose.model('Job');
      const job = await Job.findById(this.jobId).select('companyId');
      if (job) {
        this.companyId = job.companyId;
      }
    }
  }
  next();
});

// ==================== INSTANCE METHODS ====================

/**
 * Update application status
 * @param {string} newStatus - New status
 * @param {Object} options - Update options
 * @returns {Promise<void>}
 */
ApplicationSchema.methods.updateStatus = async function(newStatus, options = {}) {
  const { changedBy, notes } = options;
  
  const oldStatus = this.status;
  this.status = newStatus;
  
  // Add to status history
  this.statusHistory.push({
    status: newStatus,
    changedBy,
    changedAt: new Date(),
    notes,
  });
  
  // Update timestamp fields
  const timestampField = `${newStatus}At`;
  if (this[timestampField] !== undefined) {
    this[timestampField] = new Date();
  }
  
  // Update reviewer info if under review
  if (newStatus === APPLICATION_STATUS.UNDER_REVIEW && changedBy) {
    this.reviewedBy = changedBy;
    this.reviewedAt = new Date();
  }
  
  await this.save();
  
  return {
    oldStatus,
    newStatus,
    changedAt: new Date(),
  };
};

/**
 * Withdraw application
 * @param {string} userId - User withdrawing
 * @param {string} reason - Withdrawal reason
 * @returns {Promise<void>}
 */
ApplicationSchema.methods.withdraw = async function(userId, reason) {
  this.withdrawnBy = userId;
  this.withdrawalReason = reason;
  await this.updateStatus(APPLICATION_STATUS.WITHDRAWN, {
    changedBy: userId,
    notes: reason,
  });
};

/**
 * Reject application
 * @param {string} userId - User rejecting
 * @param {string} reason - Rejection reason
 * @returns {Promise<void>}
 */
ApplicationSchema.methods.reject = async function(userId, reason) {
  this.rejectionReason = reason;
  await this.updateStatus(APPLICATION_STATUS.REJECTED, {
    changedBy: userId,
    notes: reason,
  });
};

/**
 * Rate application
 * @param {number} rating - Rating (1-5)
 * @returns {Promise<void>}
 */
ApplicationSchema.methods.setRating = async function(rating) {
  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }
  this.rating = rating;
  await this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Find applications by applicant
 * @param {string} applicantId - Applicant user ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
ApplicationSchema.statics.findByApplicant = function(applicantId, options = {}) {
  const query = { applicantId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .populate('jobId', 'title companyId slug status')
    .populate('jobId.companyId', 'name slug logo')
    .populate('companyId', 'name slug logo')
    .sort(options.sort || { submittedAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

/**
 * Find applications by job
 * @param {string} jobId - Job ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
ApplicationSchema.statics.findByJob = function(jobId, options = {}) {
  const query = { jobId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .populate('applicantId', 'name email avatar phone')
    .sort(options.sort || { submittedAt: -1 });
};

/**
 * Find applications by company
 * @param {string} companyId - Company ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
ApplicationSchema.statics.findByCompany = function(companyId, options = {}) {
  const query = { companyId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .populate('jobId', 'title slug')
    .populate('applicantId', 'name email avatar')
    .sort(options.sort || { submittedAt: -1 })
    .limit(options.limit || 100)
    .skip(options.skip || 0);
};

/**
 * Check if user has already applied to job
 * @param {string} applicantId - Applicant user ID
 * @param {string} jobId - Job ID
 * @returns {Promise<boolean>}
 */
ApplicationSchema.statics.hasApplied = async function(applicantId, jobId) {
  const application = await this.findOne({ applicantId, jobId });
  return !!application;
};

/**
 * Get application statistics for a job
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>}
 */
ApplicationSchema.statics.getJobStats = async function(jobId) {
  const stats = await this.aggregate([
    { $match: { jobId: new mongoose.Types.ObjectId(jobId) } },
    {
      $group: {
        _id: null,
        totalApplications: { $sum: 1 },
        byStatus: {
          $push: '$status',
        },
      },
    },
  ]);
  
  if (!stats[0]) {
    return {
      totalApplications: 0,
      submitted: 0,
      underReview: 0,
      shortlisted: 0,
      interviewScheduled: 0,
      interviewCompleted: 0,
      offerExtended: 0,
      hired: 0,
      rejected: 0,
      withdrawn: 0,
    };
  }
  
  const statusCounts = stats[0].byStatus.reduce((acc, status) => {
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  
  return {
    totalApplications: stats[0].totalApplications,
    submitted: statusCounts[APPLICATION_STATUS.SUBMITTED] || 0,
    underReview: statusCounts[APPLICATION_STATUS.UNDER_REVIEW] || 0,
    shortlisted: statusCounts[APPLICATION_STATUS.SHORTLISTED] || 0,
    interviewScheduled: statusCounts[APPLICATION_STATUS.INTERVIEW_SCHEDULED] || 0,
    interviewCompleted: statusCounts[APPLICATION_STATUS.INTERVIEW_COMPLETED] || 0,
    offerExtended: statusCounts[APPLICATION_STATUS.OFFER_EXTENDED] || 0,
    hired: statusCounts[APPLICATION_STATUS.HIRED] || 0,
    rejected: statusCounts[APPLICATION_STATUS.REJECTED] || 0,
    withdrawn: statusCounts[APPLICATION_STATUS.WITHDRAWN] || 0,
  };
};

/**
 * Get applicant statistics
 * @param {string} applicantId - Applicant user ID
 * @returns {Promise<Object>}
 */
ApplicationSchema.statics.getApplicantStats = async function(applicantId) {
  const stats = await this.aggregate([
    { $match: { applicantId: new mongoose.Types.ObjectId(applicantId) } },
    {
      $group: {
        _id: null,
        totalApplications: { $sum: 1 },
        active: {
          $sum: {
            $cond: [{ $in: ['$status', ['submitted', 'under_review', 'shortlisted', 'interview_scheduled', 'interview_completed', 'offer_extended']] }, 1, 0],
          },
        },
        hired: { $sum: { $cond: [{ $eq: ['$status', 'hired'] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
        withdrawn: { $sum: { $cond: [{ $eq: ['$status', 'withdrawn'] }, 1, 0] } },
      },
    },
  ]);
  
  return stats[0] || {
    totalApplications: 0,
    active: 0,
    hired: 0,
    rejected: 0,
    withdrawn: 0,
  };
};

// Create and export the model
const Application = mongoose.model('Application', ApplicationSchema);

module.exports = Application;
