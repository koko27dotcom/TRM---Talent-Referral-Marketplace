/**
 * Review Model
 * Ratings and reviews for referrers, companies, and jobs
 * Supports helpful votes and moderation
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Review category constants
const REVIEW_CATEGORIES = {
  REFERRER: 'referrer',
  COMPANY: 'company',
  JOB: 'job',
  MENTOR: 'mentor',
  EVENT: 'event',
};

// Review status constants
const REVIEW_STATUS = {
  PENDING: 'pending',
  PUBLISHED: 'published',
  FLAGGED: 'flagged',
  REMOVED: 'removed',
  UNDER_REVIEW: 'under_review',
};

// Reviewee type constants
const REVIEWEE_TYPE = {
  USER: 'user',
  COMPANY: 'company',
  JOB: 'job',
  EVENT: 'event',
};

// Helpful vote schema
const HelpfulVoteSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isHelpful: {
    type: Boolean,
    required: true,
  },
  votedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: true });

// Aspect rating schema (for detailed reviews)
const AspectRatingSchema = new Schema({
  aspect: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
}, { _id: true });

// Review Schema
const ReviewSchema = new Schema({
  reviewId: {
    type: String,
    unique: true,
    index: true,
  },
  reviewerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  revieweeId: {
    type: Schema.Types.ObjectId,
    refPath: 'revieweeType',
    required: true,
    index: true,
  },
  revieweeType: {
    type: String,
    enum: Object.values(REVIEWEE_TYPE),
    required: true,
  },
  // Review content
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000,
  },
  // Category-specific details
  category: {
    type: String,
    enum: Object.values(REVIEW_CATEGORIES),
    required: true,
    index: true,
  },
  // Detailed ratings (optional)
  aspectRatings: [AspectRatingSchema],
  // Referrer-specific fields
  referrerDetails: {
    referralId: {
      type: Schema.Types.ObjectId,
      ref: 'Referral',
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
    },
    wasHired: {
      type: Boolean,
    },
    responseTime: {
      type: Number, // in hours
    },
    communication: {
      type: Number,
      min: 1,
      max: 5,
    },
    professionalism: {
      type: Number,
      min: 1,
      max: 5,
    },
  },
  // Company-specific fields
  companyDetails: {
    hiringProcess: {
      type: Number,
      min: 1,
      max: 5,
    },
    workEnvironment: {
      type: Number,
      min: 1,
      max: 5,
    },
    compensation: {
      type: Number,
      min: 1,
      max: 5,
    },
    workLifeBalance: {
      type: Number,
      min: 1,
      max: 5,
    },
    careerGrowth: {
      type: Number,
      min: 1,
      max: 5,
    },
    isCurrentEmployee: {
      type: Boolean,
    },
    employmentPeriod: {
      startDate: Date,
      endDate: Date,
    },
  },
  // Job-specific fields
  jobDetails: {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
    },
    applicationExperience: {
      type: Number,
      min: 1,
      max: 5,
    },
    interviewProcess: {
      type: Number,
      min: 1,
      max: 5,
    },
    gotOffer: {
      type: Boolean,
    },
    acceptedOffer: {
      type: Boolean,
    },
  },
  // Mentorship-specific fields
  mentorshipDetails: {
    matchId: {
      type: Schema.Types.ObjectId,
      ref: 'MentorshipMatch',
    },
    knowledgeSharing: {
      type: Number,
      min: 1,
      max: 5,
    },
    availability: {
      type: Number,
      min: 1,
      max: 5,
    },
    guidanceQuality: {
      type: Number,
      min: 1,
      max: 5,
    },
  },
  // Event-specific fields
  eventDetails: {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
    },
    organization: {
      type: Number,
      min: 1,
      max: 5,
    },
    contentQuality: {
      type: Number,
      min: 1,
      max: 5,
    },
    networking: {
      type: Number,
      min: 1,
      max: 5,
    },
    attended: {
      type: Boolean,
    },
  },
  // Engagement
  helpfulVotes: [HelpfulVoteSchema],
  // Status
  status: {
    type: String,
    enum: Object.values(REVIEW_STATUS),
    default: REVIEW_STATUS.PUBLISHED,
    index: true,
  },
  // Moderation
  moderationFlags: [{
    reason: String,
    flaggedBy: {
      type: String,
      enum: ['auto', 'user', 'admin'],
    },
    flaggedAt: {
      type: Date,
      default: Date.now,
    },
    details: Schema.Types.Mixed,
  }],
  // Verification
  isVerified: {
    type: Boolean,
    default: false,
  },
  verifiedAt: {
    type: Date,
  },
  // Would recommend
  wouldRecommend: {
    type: Boolean,
  },
  // Edit history
  isEdited: {
    type: Boolean,
    default: false,
  },
  editHistory: [{
    content: String,
    rating: Number,
    editedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  // Response from reviewee
  response: {
    content: {
      type: String,
      maxlength: 2000,
    },
    respondedAt: {
      type: Date,
    },
    respondedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
}, {
  timestamps: true,
});

// Indexes for common queries
ReviewSchema.index({ revieweeId: 1, revieweeType: 1, status: 1, createdAt: -1 });
ReviewSchema.index({ reviewerId: 1, status: 1, createdAt: -1 });
ReviewSchema.index({ category: 1, status: 1, rating: -1 });
ReviewSchema.index({ status: 1, isVerified: 1, createdAt: -1 });
ReviewSchema.index({ title: 'text', content: 'text' });

// Generate reviewId before saving
ReviewSchema.pre('save', async function(next) {
  if (!this.reviewId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.reviewId = `REV${timestamp}${random}`;
  }
  next();
});

// Virtual for helpful count
ReviewSchema.virtual('helpfulCount').get(function() {
  return this.helpfulVotes?.filter(v => v.isHelpful).length || 0;
});

// Virtual for not helpful count
ReviewSchema.virtual('notHelpfulCount').get(function() {
  return this.helpfulVotes?.filter(v => !v.isHelpful).length || 0;
});

// Virtual for net helpful score
ReviewSchema.virtual('netHelpfulScore').get(function() {
  return this.helpfulCount - this.notHelpfulCount;
});

// Method to check if user voted
ReviewSchema.methods.hasUserVoted = function(userId) {
  return this.helpfulVotes.some(vote => vote.userId.toString() === userId.toString());
};

// Method to get user's vote
ReviewSchema.methods.getUserVote = function(userId) {
  return this.helpfulVotes.find(vote => vote.userId.toString() === userId.toString());
};

// Method to vote helpful
ReviewSchema.methods.voteHelpful = function(userId, isHelpful = true) {
  const existingVote = this.getUserVote(userId);
  
  if (existingVote) {
    // Update existing vote
    existingVote.isHelpful = isHelpful;
    existingVote.votedAt = new Date();
  } else {
    // Add new vote
    this.helpfulVotes.push({
      userId,
      isHelpful,
      votedAt: new Date(),
    });
  }
  
  return true;
};

// Method to remove vote
ReviewSchema.methods.removeVote = function(userId) {
  const index = this.helpfulVotes.findIndex(vote => vote.userId.toString() === userId.toString());
  if (index > -1) {
    this.helpfulVotes.splice(index, 1);
    return true;
  }
  return false;
};

// Method to edit review
ReviewSchema.methods.edit = function(newContent, newRating = null) {
  // Store previous version
  this.editHistory.push({
    content: this.content,
    rating: this.rating,
    editedAt: new Date(),
  });
  
  // Update content
  this.content = newContent;
  if (newRating !== null) {
    this.rating = newRating;
  }
  
  this.isEdited = true;
  this.status = REVIEW_STATUS.UNDER_REVIEW; // Require re-approval after edit
  
  return true;
};

// Method to add response
ReviewSchema.methods.addResponse = function(content, respondedBy) {
  this.response = {
    content,
    respondedAt: new Date(),
    respondedBy,
  };
  return true;
};

// Method to verify review
ReviewSchema.methods.verify = function() {
  this.isVerified = true;
  this.verifiedAt = new Date();
  this.status = REVIEW_STATUS.PUBLISHED;
  return true;
};

// Method to flag review
ReviewSchema.methods.flag = function(reason, flaggedBy, details = {}) {
  this.moderationFlags.push({
    reason,
    flaggedBy,
    flaggedAt: new Date(),
    details,
  });
  
  // Auto-flag if multiple flags
  if (this.moderationFlags.length >= 3) {
    this.status = REVIEW_STATUS.FLAGGED;
  }
  
  return true;
};

// Static method to get reviews for reviewee
ReviewSchema.statics.getForReviewee = async function(revieweeId, options = {}) {
  const { limit = 10, skip = 0, sortBy = 'createdAt', sortOrder = 'desc' } = options;
  
  return this.find({
    revieweeId,
    status: { $in: [REVIEW_STATUS.PUBLISHED, REVIEW_STATUS.UNDER_REVIEW] },
  })
    .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
    .skip(skip)
    .limit(limit)
    .populate('reviewerId', 'name avatar')
    .lean();
};

// Static method to get reviews by reviewer
ReviewSchema.statics.getByReviewer = async function(reviewerId, options = {}) {
  const { limit = 10, skip = 0 } = options;
  
  return this.find({
    reviewerId,
    status: { $ne: REVIEW_STATUS.REMOVED },
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('revieweeId', 'name companyName displayName title')
    .lean();
};

// Static method to get average rating for reviewee
ReviewSchema.statics.getAverageRating = async function(revieweeId, revieweeType = null) {
  const matchStage = { revieweeId: new mongoose.Types.ObjectId(revieweeId) };
  
  if (revieweeType) {
    matchStage.revieweeType = revieweeType;
  }
  
  matchStage.status = REVIEW_STATUS.PUBLISHED;
  
  const result = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        ratingBreakdown: {
          $push: '$rating',
        },
      },
    },
  ]);
  
  if (result.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    };
  }
  
  // Calculate breakdown
  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  result[0].ratingBreakdown.forEach(rating => {
    breakdown[rating] = (breakdown[rating] || 0) + 1;
  });
  
  return {
    averageRating: Math.round(result[0].averageRating * 10) / 10,
    totalReviews: result[0].totalReviews,
    ratingBreakdown: breakdown,
  };
};

// Static method to get recent reviews
ReviewSchema.statics.getRecent = async function(limit = 10, category = null) {
  const query = {
    status: REVIEW_STATUS.PUBLISHED,
  };
  
  if (category) {
    query.category = category;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('reviewerId', 'name avatar')
    .populate('revieweeId', 'name companyName displayName')
    .lean();
};

// Static method to get reviews awaiting verification
ReviewSchema.statics.getPendingVerification = async function(limit = 20, skip = 0) {
  return this.find({
    status: REVIEW_STATUS.PENDING,
    isVerified: false,
  })
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit)
    .populate('reviewerId', 'name email')
    .populate('revieweeId', 'name companyName displayName')
    .lean();
};

// Static method to get flagged reviews
ReviewSchema.statics.getFlagged = async function(limit = 20, skip = 0) {
  return this.find({
    status: REVIEW_STATUS.FLAGGED,
  })
    .sort({ 'moderationFlags.flaggedAt': -1 })
    .skip(skip)
    .limit(limit)
    .populate('reviewerId', 'name email')
    .populate('revieweeId', 'name companyName displayName')
    .lean();
};

const Review = mongoose.model('Review', ReviewSchema);

module.exports = Review;