/**
 * Content Model
 * Blog posts, podcasts, and video content for the platform
 * Supports SEO, media management, and content scheduling
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Content type constants
const CONTENT_TYPES = {
  BLOG: 'blog',
  PODCAST: 'podcast',
  VIDEO: 'video',
  NEWSLETTER: 'newsletter',
  GUIDE: 'guide',
  CASE_STUDY: 'case_study',
};

// Content status constants
const CONTENT_STATUS = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
  UNDER_REVIEW: 'under_review',
};

// Content category constants
const CONTENT_CATEGORIES = {
  CAREER_ADVICE: 'career_advice',
  INTERVIEW_TIPS: 'interview_tips',
  RESUME_GUIDE: 'resume_guide',
  INDUSTRY_INSIGHTS: 'industry_insights',
  REFERRAL_STRATEGY: 'referral_strategy',
  SUCCESS_STORIES: 'success_stories',
  PLATFORM_UPDATES: 'platform_updates',
  MARKET_TRENDS: 'market_trends',
  SKILL_DEVELOPMENT: 'skill_development',
  WORKPLACE_CULTURE: 'workplace_culture',
};

// Like schema
const LikeSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: true });

// Comment reference schema
const CommentReferenceSchema = new Schema({
  commentId: {
    type: Schema.Types.ObjectId,
    ref: 'Comment',
    required: true,
  },
  authorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  createdAt: {
    type: Date,
  },
}, { _id: true });

// Content section schema for structured content
const ContentSectionSchema = new Schema({
  type: {
    type: String,
    enum: ['text', 'heading', 'image', 'video', 'quote', 'code', 'list', 'embed'],
    required: true,
  },
  content: {
    type: String,
  },
  metadata: {
    type: Schema.Types.Mixed,
  },
  order: {
    type: Number,
    default: 0,
  },
}, { _id: true });

// Content Schema
const ContentSchema = new Schema({
  contentId: {
    type: String,
    unique: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300,
  },
  description: {
    type: String,
    maxlength: 500,
  },
  type: {
    type: String,
    enum: Object.values(CONTENT_TYPES),
    required: true,
    index: true,
  },
  category: {
    type: String,
    enum: Object.values(CONTENT_CATEGORIES),
    required: true,
    index: true,
  },
  authorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  // Content body - can be HTML, markdown, or structured sections
  content: {
    type: String,
    required: true,
  },
  contentFormat: {
    type: String,
    enum: ['html', 'markdown', 'structured'],
    default: 'html',
  },
  sections: [ContentSectionSchema],
  // Media
  mediaUrl: {
    type: String,
  },
  thumbnail: {
    type: String,
  },
  coverImage: {
    type: String,
  },
  gallery: [{
    url: String,
    caption: String,
    alt: String,
  }],
  // For podcasts/videos
  duration: {
    type: Number, // in seconds
  },
  transcript: {
    type: String,
  },
  // Tags
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 30,
  }],
  // SEO
  seoTitle: {
    type: String,
    maxlength: 70,
  },
  seoDescription: {
    type: String,
    maxlength: 160,
  },
  seoKeywords: [{
    type: String,
  }],
  slug: {
    type: String,
    unique: true,
    sparse: true,
  },
  canonicalUrl: {
    type: String,
  },
  // Engagement
  views: {
    type: Number,
    default: 0,
  },
  uniqueViewers: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  likes: [LikeSchema],
  comments: [CommentReferenceSchema],
  shares: {
    type: Number,
    default: 0,
  },
  // Publishing
  isPublished: {
    type: Boolean,
    default: false,
    index: true,
  },
  publishedAt: {
    type: Date,
    index: true,
  },
  scheduledAt: {
    type: Date,
  },
  status: {
    type: String,
    enum: Object.values(CONTENT_STATUS),
    default: CONTENT_STATUS.DRAFT,
    index: true,
  },
  // Featured content
  isFeatured: {
    type: Boolean,
    default: false,
    index: true,
  },
  featuredOrder: {
    type: Number,
    default: 0,
  },
  featuredUntil: {
    type: Date,
  },
  // Series/Collection
  seriesId: {
    type: Schema.Types.ObjectId,
    ref: 'ContentSeries',
  },
  seriesOrder: {
    type: Number,
  },
  // Related content
  relatedContent: [{
    type: Schema.Types.ObjectId,
    ref: 'Content',
  }],
  // Target audience
  targetAudience: {
    experienceLevels: [{
      type: String,
      enum: ['entry', 'mid', 'senior', 'executive'],
    }],
    industries: [String],
    roles: [String],
  },
  // Reading time (for blogs)
  readingTime: {
    type: Number, // in minutes
  },
  // Difficulty level
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
  },
  // Analytics
  analytics: {
    avgTimeOnPage: {
      type: Number, // in seconds
      default: 0,
    },
    bounceRate: {
      type: Number,
      default: 0,
    },
    scrollDepth: {
      type: Number,
      default: 0,
    },
    trafficSources: {
      direct: { type: Number, default: 0 },
      search: { type: Number, default: 0 },
      social: { type: Number, default: 0 },
      referral: { type: Number, default: 0 },
      email: { type: Number, default: 0 },
    },
  },
  // Engagement score for trending
  engagementScore: {
    type: Number,
    default: 0,
    index: true,
  },
  // Versioning
  version: {
    type: Number,
    default: 1,
  },
  previousVersions: [{
    content: String,
    updatedAt: Date,
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  }],
}, {
  timestamps: true,
});

// Indexes for common queries
ContentSchema.index({ type: 1, status: 1, publishedAt: -1 });
ContentSchema.index({ category: 1, status: 1, publishedAt: -1 });
ContentSchema.index({ authorId: 1, status: 1, createdAt: -1 });
ContentSchema.index({ tags: 1, status: 1 });
ContentSchema.index({ isFeatured: 1, featuredOrder: 1 });
ContentSchema.index({ seriesId: 1, seriesOrder: 1 });
ContentSchema.index({ title: 'text', content: 'text', tags: 'text', seoKeywords: 'text' });
ContentSchema.index({ engagementScore: -1, publishedAt: -1 });

// Generate contentId and slug before saving
ContentSchema.pre('save', async function(next) {
  if (!this.contentId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.contentId = `CNT${timestamp}${random}`;
  }
  
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 100);
  }
  
  // Calculate reading time for blog posts
  if (this.type === CONTENT_TYPES.BLOG && this.content) {
    const wordsPerMinute = 200;
    const wordCount = this.content.split(/\s+/).length;
    this.readingTime = Math.ceil(wordCount / wordsPerMinute);
  }
  
  // Calculate engagement score
  this.engagementScore = this.calculateEngagementScore();
  
  next();
});

// Virtual for like count
ContentSchema.virtual('likeCount').get(function() {
  return this.likes?.length || 0;
});

// Virtual for comment count
ContentSchema.virtual('commentCount').get(function() {
  return this.comments?.length || 0;
});

// Virtual for unique view count
ContentSchema.virtual('uniqueViewCount').get(function() {
  return this.uniqueViewers?.length || 0;
});

// Method to check if user liked the content
ContentSchema.methods.isLikedBy = function(userId) {
  return this.likes.some(like => like.userId.toString() === userId.toString());
};

// Method to add like
ContentSchema.methods.addLike = function(userId) {
  if (!this.isLikedBy(userId)) {
    this.likes.push({ userId });
    this.engagementScore = this.calculateEngagementScore();
    return true;
  }
  return false;
};

// Method to remove like
ContentSchema.methods.removeLike = function(userId) {
  const index = this.likes.findIndex(like => like.userId.toString() === userId.toString());
  if (index > -1) {
    this.likes.splice(index, 1);
    this.engagementScore = this.calculateEngagementScore();
    return true;
  }
  return false;
};

// Method to add view
ContentSchema.methods.addView = function(userId) {
  this.views += 1;
  if (userId && !this.uniqueViewers.includes(userId)) {
    this.uniqueViewers.push(userId);
  }
  this.engagementScore = this.calculateEngagementScore();
};

// Method to add comment reference
ContentSchema.methods.addComment = function(commentId, authorId) {
  this.comments.push({
    commentId,
    authorId,
    createdAt: new Date(),
  });
  this.engagementScore = this.calculateEngagementScore();
};

// Method to increment shares
ContentSchema.methods.incrementShares = function() {
  this.shares += 1;
  this.engagementScore = this.calculateEngagementScore();
};

// Method to calculate engagement score
ContentSchema.methods.calculateEngagementScore = function() {
  const likesWeight = 2;
  const commentsWeight = 4;
  const viewsWeight = 0.05;
  const sharesWeight = 5;
  const recencyWeight = 3;
  
  const likesScore = (this.likes?.length || 0) * likesWeight;
  const commentsScore = (this.comments?.length || 0) * commentsWeight;
  const viewsScore = (this.views || 0) * viewsWeight;
  const sharesScore = (this.shares || 0) * sharesWeight;
  
  // Recency bonus
  const publishDate = this.publishedAt || this.createdAt;
  const daysSincePublished = (Date.now() - publishDate.getTime()) / (1000 * 60 * 60 * 24);
  const recencyScore = Math.max(0, (30 - daysSincePublished) / 30) * 100 * recencyWeight;
  
  return Math.round(likesScore + commentsScore + viewsScore + sharesScore + recencyScore);
};

// Method to publish content
ContentSchema.methods.publish = function() {
  if (this.status === CONTENT_STATUS.PUBLISHED) {
    return false;
  }
  
  this.status = CONTENT_STATUS.PUBLISHED;
  this.isPublished = true;
  this.publishedAt = new Date();
  
  return true;
};

// Method to schedule content
ContentSchema.methods.schedule = function(scheduledDate) {
  this.status = CONTENT_STATUS.SCHEDULED;
  this.scheduledAt = scheduledDate;
  
  return true;
};

// Method to archive content
ContentSchema.methods.archive = function() {
  this.status = CONTENT_STATUS.ARCHIVED;
  this.isPublished = false;
  this.isFeatured = false;
  
  return true;
};

// Method to feature content
ContentSchema.methods.feature = function(order = 0, until = null) {
  this.isFeatured = true;
  this.featuredOrder = order;
  if (until) {
    this.featuredUntil = until;
  }
  
  return true;
};

// Method to unfeature content
ContentSchema.methods.unfeature = function() {
  this.isFeatured = false;
  this.featuredOrder = 0;
  this.featuredUntil = null;
  
  return true;
};

// Static method to get featured content
ContentSchema.statics.getFeatured = async function(type = null, limit = 5) {
  const query = {
    isFeatured: true,
    status: CONTENT_STATUS.PUBLISHED,
    $or: [
      { featuredUntil: { $exists: false } },
      { featuredUntil: { $gte: new Date() } },
    ],
  };
  
  if (type) {
    query.type = type;
  }
  
  return this.find(query)
    .sort({ featuredOrder: 1, publishedAt: -1 })
    .limit(limit)
    .populate('authorId', 'name avatar')
    .lean();
};

// Static method to get trending content
ContentSchema.statics.getTrending = async function(type = null, limit = 10) {
  const query = {
    status: CONTENT_STATUS.PUBLISHED,
    publishedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
  };
  
  if (type) {
    query.type = type;
  }
  
  return this.find(query)
    .sort({ engagementScore: -1, publishedAt: -1 })
    .limit(limit)
    .populate('authorId', 'name avatar')
    .lean();
};

// Static method to get latest content
ContentSchema.statics.getLatest = async function(type = null, limit = 10, skip = 0) {
  const query = {
    status: CONTENT_STATUS.PUBLISHED,
  };
  
  if (type) {
    query.type = type;
  }
  
  return this.find(query)
    .sort({ publishedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('authorId', 'name avatar')
    .lean();
};

// Static method to get content by category
ContentSchema.statics.getByCategory = async function(category, options = {}) {
  const { limit = 10, skip = 0, type = null } = options;
  
  const query = {
    category,
    status: CONTENT_STATUS.PUBLISHED,
  };
  
  if (type) {
    query.type = type;
  }
  
  return this.find(query)
    .sort({ publishedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('authorId', 'name avatar')
    .lean();
};

// Static method to search content
ContentSchema.statics.search = async function(query, options = {}) {
  const { limit = 20, skip = 0, type = null, category = null } = options;
  
  const searchQuery = {
    status: CONTENT_STATUS.PUBLISHED,
    $text: { $search: query },
  };
  
  if (type) searchQuery.type = type;
  if (category) searchQuery.category = category;
  
  return this.find(searchQuery, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' }, publishedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('authorId', 'name avatar')
    .lean();
};

// Static method to get related content
ContentSchema.statics.getRelated = async function(contentId, limit = 5) {
  const content = await this.findById(contentId);
  if (!content) return [];
  
  return this.find({
    _id: { $ne: contentId },
    status: CONTENT_STATUS.PUBLISHED,
    $or: [
      { category: content.category },
      { tags: { $in: content.tags } },
      { authorId: content.authorId },
    ],
  })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .populate('authorId', 'name avatar')
    .lean();
};

// Static method to get content by author
ContentSchema.statics.getByAuthor = async function(authorId, options = {}) {
  const { limit = 10, skip = 0, status = CONTENT_STATUS.PUBLISHED } = options;
  
  return this.find({
    authorId,
    status,
  })
    .sort({ publishedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

// Static method to get scheduled content that needs publishing
ContentSchema.statics.getScheduledForPublishing = async function() {
  return this.find({
    status: CONTENT_STATUS.SCHEDULED,
    scheduledAt: { $lte: new Date() },
  }).lean();
};

const Content = mongoose.model('Content', ContentSchema);

module.exports = Content;