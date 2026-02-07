/**
 * PublicProfile Model
 * Public referrer profiles for discovery and networking
 * Includes portfolio, reviews, and mentorship availability
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Availability constants
const AVAILABILITY_STATUS = {
  AVAILABLE: 'available',
  BUSY: 'busy',
  NOT_AVAILABLE: 'not_available',
  OPEN_TO_OPPORTUNITIES: 'open_to_opportunities',
};

// Portfolio item schema
const PortfolioItemSchema = new Schema({
  title: {
    type: String,
    required: true,
    maxlength: 200,
  },
  description: {
    type: String,
    maxlength: 1000,
  },
  type: {
    type: String,
    enum: ['project', 'certification', 'achievement', 'publication', 'case_study'],
    required: true,
  },
  url: {
    type: String,
  },
  thumbnail: {
    type: String,
  },
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
  },
  isOngoing: {
    type: Boolean,
    default: false,
  },
  skills: [{
    type: String,
  }],
  order: {
    type: Number,
    default: 0,
  },
}, { _id: true });

// Social links schema
const SocialLinksSchema = new Schema({
  linkedin: {
    type: String,
  },
  github: {
    type: String,
  },
  twitter: {
    type: String,
  },
  website: {
    type: String,
  },
  portfolio: {
    type: String,
  },
  blog: {
    type: String,
  },
}, { _id: true });

// Review reference schema
const ReviewReferenceSchema = new Schema({
  reviewId: {
    type: Schema.Types.ObjectId,
    ref: 'Review',
    required: true,
  },
  reviewerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  rating: {
    type: Number,
  },
  createdAt: {
    type: Date,
  },
}, { _id: true });

// Availability slot schema
const AvailabilitySlotSchema = new Schema({
  dayOfWeek: {
    type: Number, // 0 = Sunday, 6 = Saturday
    min: 0,
    max: 6,
    required: true,
  },
  startTime: {
    type: String, // HH:mm format
    required: true,
  },
  endTime: {
    type: String, // HH:mm format
    required: true,
  },
  timezone: {
    type: String,
    default: 'Asia/Yangon',
  },
  isRecurring: {
    type: Boolean,
    default: true,
  },
}, { _id: true });

// Mentorship settings schema
const MentorshipSettingsSchema = new Schema({
  isAvailable: {
    type: Boolean,
    default: false,
  },
  rate: {
    type: Number, // per hour, 0 = free
    default: 0,
  },
  currency: {
    type: String,
    default: 'MMK',
  },
  sessionDuration: {
    type: Number, // in minutes
    default: 60,
  },
  maxMentees: {
    type: Number,
    default: 3,
  },
  currentMentees: {
    type: Number,
    default: 0,
  },
  topics: [{
    type: String,
  }],
  approach: {
    type: String,
    maxlength: 1000,
  },
  expectations: {
    type: String,
    maxlength: 1000,
  },
  availabilitySlots: [AvailabilitySlotSchema],
}, { _id: true });

// Statistics schema
const StatisticsSchema = new Schema({
  totalReferrals: {
    type: Number,
    default: 0,
  },
  successfulHires: {
    type: Number,
    default: 0,
  },
  referralSuccessRate: {
    type: Number,
    default: 0,
  },
  totalEarnings: {
    type: Number,
    default: 0,
  },
  averageResponseTime: {
    type: Number, // in hours
    default: 0,
  },
  memberSince: {
    type: Date,
  },
  lastActiveAt: {
    type: Date,
    default: Date.now,
  },
  profileViews: {
    type: Number,
    default: 0,
  },
  contentPublished: {
    type: Number,
    default: 0,
  },
  eventsAttended: {
    type: Number,
    default: 0,
  },
  groupsJoined: {
    type: Number,
    default: 0,
  },
}, { _id: false });

// Public Profile Schema
const PublicProfileSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  profileId: {
    type: String,
    unique: true,
    index: true,
  },
  // Basic info
  displayName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  headline: {
    type: String,
    maxlength: 150,
  },
  bio: {
    type: String,
    maxlength: 2000,
  },
  avatar: {
    type: String,
  },
  coverImage: {
    type: String,
  },
  // Location
  location: {
    city: {
      type: String,
    },
    region: {
      type: String,
    },
    country: {
      type: String,
      default: 'Myanmar',
    },
    timezone: {
      type: String,
      default: 'Asia/Yangon',
    },
    isRemote: {
      type: Boolean,
      default: false,
    },
  },
  // Professional info
  expertise: [{
    type: String,
    trim: true,
  }],
  industries: [{
    type: String,
    trim: true,
  }],
  languages: [{
    name: {
      type: String,
      required: true,
    },
    proficiency: {
      type: String,
      enum: ['basic', 'conversational', 'fluent', 'native'],
      default: 'conversational',
    },
  }],
  experience: {
    years: {
      type: Number,
      min: 0,
    },
    level: {
      type: String,
      enum: ['entry', 'mid', 'senior', 'executive', 'expert'],
    },
    currentRole: {
      title: String,
      company: String,
    },
  },
  // Skills
  skills: [{
    name: {
      type: String,
      required: true,
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    },
    endorsements: {
      type: Number,
      default: 0,
    },
  }],
  // Portfolio
  portfolio: [PortfolioItemSchema],
  // Social links
  socialLinks: SocialLinksSchema,
  // Reviews
  reviews: [ReviewReferenceSchema],
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    count: {
      type: Number,
      default: 0,
    },
    breakdown: {
      5: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      1: { type: Number, default: 0 },
    },
  },
  // Availability
  availability: {
    status: {
      type: String,
      enum: Object.values(AVAILABILITY_STATUS),
      default: AVAILABILITY_STATUS.AVAILABLE,
    },
    nextAvailable: {
      type: Date,
    },
    note: {
      type: String,
      maxlength: 500,
    },
  },
  // Mentorship
  mentorship: MentorshipSettingsSchema,
  // Statistics
  statistics: StatisticsSchema,
  // Visibility settings
  visibility: {
    isPublic: {
      type: Boolean,
      default: true,
    },
    showEmail: {
      type: Boolean,
      default: false,
    },
    showPhone: {
      type: Boolean,
      default: false,
    },
    allowMessages: {
      type: Boolean,
      default: true,
    },
    allowMentorshipRequests: {
      type: Boolean,
      default: true,
    },
  },
  // SEO
  slug: {
    type: String,
    unique: true,
    sparse: true,
  },
  // Verification
  isVerified: {
    type: Boolean,
    default: false,
  },
  verifiedAt: {
    type: Date,
  },
  // Featured profile
  isFeatured: {
    type: Boolean,
    default: false,
  },
  featuredOrder: {
    type: Number,
    default: 0,
  },
  featuredUntil: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Indexes for common queries
PublicProfileSchema.index({ isPublic: 1, 'rating.average': -1 });
PublicProfileSchema.index({ industries: 1, isPublic: 1 });
PublicProfileSchema.index({ expertise: 1, isPublic: 1 });
PublicProfileSchema.index({ 'location.city': 1, isPublic: 1 });
PublicProfileSchema.index({ 'mentorship.isAvailable': 1, isPublic: 1 });
PublicProfileSchema.index({ isFeatured: 1, featuredOrder: 1 });
PublicProfileSchema.index({ displayName: 'text', bio: 'text', headline: 'text', expertise: 'text' });

// Generate profileId and slug before saving
PublicProfileSchema.pre('save', async function(next) {
  if (!this.profileId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.profileId = `PUB${timestamp}${random}`;
  }
  
  if (!this.slug && this.displayName) {
    this.slug = this.displayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 100);
  }
  
  // Calculate referral success rate
  if (this.statistics.totalReferrals > 0) {
    this.statistics.referralSuccessRate = Math.round(
      (this.statistics.successfulHires / this.statistics.totalReferrals) * 100
    );
  }
  
  next();
});

// Virtual for total endorsements
PublicProfileSchema.virtual('totalEndorsements').get(function() {
  return this.skills?.reduce((total, skill) => total + (skill.endorsements || 0), 0) || 0;
});

// Method to add review
PublicProfileSchema.methods.addReview = function(reviewId, reviewerId, rating) {
  this.reviews.push({
    reviewId,
    reviewerId,
    rating,
    createdAt: new Date(),
  });
  
  // Update rating breakdown
  this.rating.breakdown[rating] = (this.rating.breakdown[rating] || 0) + 1;
  this.rating.count = this.reviews.length;
  
  // Recalculate average
  const totalRating = this.reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
  this.rating.average = Math.round((totalRating / this.rating.count) * 10) / 10;
  
  return true;
};

// Method to remove review
PublicProfileSchema.methods.removeReview = function(reviewId) {
  const reviewIndex = this.reviews.findIndex(r => r.reviewId.toString() === reviewId.toString());
  if (reviewIndex === -1) return false;
  
  const review = this.reviews[reviewIndex];
  
  // Update rating breakdown
  if (this.rating.breakdown[review.rating] > 0) {
    this.rating.breakdown[review.rating]--;
  }
  
  // Remove review
  this.reviews.splice(reviewIndex, 1);
  this.rating.count = this.reviews.length;
  
  // Recalculate average
  if (this.rating.count > 0) {
    const totalRating = this.reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
    this.rating.average = Math.round((totalRating / this.rating.count) * 10) / 10;
  } else {
    this.rating.average = 0;
  }
  
  return true;
};

// Method to add portfolio item
PublicProfileSchema.methods.addPortfolioItem = function(itemData) {
  this.portfolio.push({
    ...itemData,
    order: this.portfolio.length,
  });
  
  return this.portfolio[this.portfolio.length - 1];
};

// Method to remove portfolio item
PublicProfileSchema.methods.removePortfolioItem = function(itemId) {
  const index = this.portfolio.findIndex(p => p._id.toString() === itemId.toString());
  if (index > -1) {
    this.portfolio.splice(index, 1);
    return true;
  }
  return false;
};

// Method to add skill
PublicProfileSchema.methods.addSkill = function(name, level = 'intermediate') {
  const existingSkill = this.skills.find(s => s.name.toLowerCase() === name.toLowerCase());
  if (existingSkill) {
    existingSkill.level = level;
    return existingSkill;
  }
  
  this.skills.push({ name, level, endorsements: 0 });
  return this.skills[this.skills.length - 1];
};

// Method to endorse skill
PublicProfileSchema.methods.endorseSkill = function(skillName) {
  const skill = this.skills.find(s => s.name.toLowerCase() === skillName.toLowerCase());
  if (skill) {
    skill.endorsements += 1;
    return true;
  }
  return false;
};

// Method to update statistics
PublicProfileSchema.methods.updateStatistics = function(updates) {
  Object.assign(this.statistics, updates);
  this.statistics.lastActiveAt = new Date();
  
  // Recalculate success rate
  if (this.statistics.totalReferrals > 0) {
    this.statistics.referralSuccessRate = Math.round(
      (this.statistics.successfulHires / this.statistics.totalReferrals) * 100
    );
  }
};

// Method to increment profile views
PublicProfileSchema.methods.incrementViews = function() {
  this.statistics.profileViews += 1;
  this.statistics.lastActiveAt = new Date();
};

// Method to enable mentorship
PublicProfileSchema.methods.enableMentorship = function(settings = {}) {
  this.mentorship.isAvailable = true;
  Object.assign(this.mentorship, settings);
};

// Method to disable mentorship
PublicProfileSchema.methods.disableMentorship = function() {
  this.mentorship.isAvailable = false;
};

// Method to feature profile
PublicProfileSchema.methods.feature = function(order = 0, until = null) {
  this.isFeatured = true;
  this.featuredOrder = order;
  if (until) {
    this.featuredUntil = until;
  }
};

// Method to unfeature profile
PublicProfileSchema.methods.unfeature = function() {
  this.isFeatured = false;
  this.featuredOrder = 0;
  this.featuredUntil = null;
};

// Static method to get featured profiles
PublicProfileSchema.statics.getFeatured = async function(limit = 10) {
  return this.find({
    isFeatured: true,
    isPublic: true,
    $or: [
      { featuredUntil: { $exists: false } },
      { featuredUntil: { $gte: new Date() } },
    ],
  })
    .sort({ featuredOrder: 1, 'rating.average': -1 })
    .limit(limit)
    .populate('userId', 'name email')
    .lean();
};

// Static method to get top referrers
PublicProfileSchema.statics.getTopReferrers = async function(limit = 10) {
  return this.find({
    isPublic: true,
    'statistics.totalReferrals': { $gt: 0 },
  })
    .sort({ 'statistics.successfulHires': -1, 'rating.average': -1 })
    .limit(limit)
    .populate('userId', 'name email')
    .lean();
};

// Static method to get available mentors
PublicProfileSchema.statics.getAvailableMentors = async function(filters = {}, limit = 20, skip = 0) {
  const query = {
    isPublic: true,
    'mentorship.isAvailable': true,
  };
  
  if (filters.expertise) {
    query.expertise = { $in: filters.expertise };
  }
  
  if (filters.industries) {
    query.industries = { $in: filters.industries };
  }
  
  if (filters.maxRate !== undefined) {
    query['mentorship.rate'] = { $lte: filters.maxRate };
  }
  
  if (filters.location) {
    query['location.city'] = filters.location;
  }
  
  return this.find(query)
    .sort({ 'rating.average': -1, 'mentorship.currentMentees': 1 })
    .skip(skip)
    .limit(limit)
    .populate('userId', 'name email')
    .lean();
};

// Static method to search profiles
PublicProfileSchema.statics.search = async function(query, options = {}) {
  const { limit = 20, skip = 0, filters = {} } = options;
  
  const searchQuery = {
    isPublic: true,
    $text: { $search: query },
  };
  
  if (filters.industries) {
    searchQuery.industries = { $in: filters.industries };
  }
  
  if (filters.expertise) {
    searchQuery.expertise = { $in: filters.expertise };
  }
  
  if (filters.availableForMentorship) {
    searchQuery['mentorship.isAvailable'] = true;
  }
  
  return this.find(searchQuery, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' }, 'rating.average': -1 })
    .skip(skip)
    .limit(limit)
    .populate('userId', 'name email')
    .lean();
};

// Static method to get profiles by industry
PublicProfileSchema.statics.getByIndustry = async function(industry, limit = 20, skip = 0) {
  return this.find({
    isPublic: true,
    industries: industry,
  })
    .sort({ 'rating.average': -1, 'statistics.successfulHires': -1 })
    .skip(skip)
    .limit(limit)
    .populate('userId', 'name email')
    .lean();
};

// Static method to get profile by user ID
PublicProfileSchema.statics.getByUserId = async function(userId) {
  return this.findOne({ userId })
    .populate('userId', 'name email phone')
    .lean();
};

const PublicProfile = mongoose.model('PublicProfile', PublicProfileSchema);

module.exports = PublicProfile;