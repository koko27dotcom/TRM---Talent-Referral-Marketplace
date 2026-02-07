/**
 * CommunityPost Model
 * Forum posts and discussions for the community platform
 * Supports multiple categories, attachments, and engagement metrics
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Post category constants
const POST_CATEGORIES = {
  DISCUSSION: 'discussion',
  QUESTION: 'question',
  SUCCESS_STORY: 'success-story',
  TIP: 'tip',
  INTRODUCTION: 'introduction',
  JOB: 'job',
};

// Post status constants
const POST_STATUS = {
  ACTIVE: 'active',
  FLAGGED: 'flagged',
  REMOVED: 'removed',
  UNDER_REVIEW: 'under_review',
};

// Author type constants
const AUTHOR_TYPE = {
  USER: 'user',
  COMPANY: 'company',
};

// Attachment schema for post attachments
const AttachmentSchema = new Schema({
  type: {
    type: String,
    enum: ['image', 'video', 'document', 'link'],
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    trim: true,
  },
  size: {
    type: Number, // in bytes
  },
  mimeType: {
    type: String,
  },
  thumbnail: {
    type: String, // for videos
  },
}, { _id: true });

// Like schema for tracking likes
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

// Comment reference schema (actual comments stored in Comment model)
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

// Community Post Schema
const CommunityPostSchema = new Schema({
  postId: {
    type: String,
    unique: true,
    index: true,
  },
  authorId: {
    type: Schema.Types.ObjectId,
    refPath: 'authorType',
    required: true,
    index: true,
  },
  authorType: {
    type: String,
    enum: Object.values(AUTHOR_TYPE),
    default: AUTHOR_TYPE.USER,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300,
  },
  content: {
    type: String,
    required: true,
    maxlength: 10000,
  },
  category: {
    type: String,
    enum: Object.values(POST_CATEGORIES),
    default: POST_CATEGORIES.DISCUSSION,
    index: true,
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 30,
  }],
  attachments: [AttachmentSchema],
  likes: [LikeSchema],
  comments: [CommentReferenceSchema],
  views: {
    type: Number,
    default: 0,
  },
  uniqueViewers: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  isPinned: {
    type: Boolean,
    default: false,
    index: true,
  },
  isFeatured: {
    type: Boolean,
    default: false,
    index: true,
  },
  status: {
    type: String,
    enum: Object.values(POST_STATUS),
    default: POST_STATUS.ACTIVE,
    index: true,
  },
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
  groupId: {
    type: Schema.Types.ObjectId,
    ref: 'CommunityGroup',
    index: true,
  },
  // SEO and sharing
  slug: {
    type: String,
    unique: true,
    sparse: true,
  },
  metaDescription: {
    type: String,
    maxlength: 160,
  },
  // Engagement scoring for trending
  engagementScore: {
    type: Number,
    default: 0,
    index: true,
  },
  lastActivityAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: true,
});

// Indexes for common queries
CommunityPostSchema.index({ category: 1, status: 1, createdAt: -1 });
CommunityPostSchema.index({ tags: 1, status: 1 });
CommunityPostSchema.index({ authorId: 1, status: 1, createdAt: -1 });
CommunityPostSchema.index({ groupId: 1, status: 1, createdAt: -1 });
CommunityPostSchema.index({ isPinned: -1, isFeatured: -1, engagementScore: -1 });
CommunityPostSchema.index({ title: 'text', content: 'text', tags: 'text' });

// Generate postId before saving
CommunityPostSchema.pre('save', async function(next) {
  if (!this.postId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.postId = `POST${timestamp}${random}`;
  }
  
  // Generate slug from title
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 100);
  }
  
  next();
});

// Virtual for like count
CommunityPostSchema.virtual('likeCount').get(function() {
  return this.likes?.length || 0;
});

// Virtual for comment count
CommunityPostSchema.virtual('commentCount').get(function() {
  return this.comments?.length || 0;
});

// Method to check if user liked the post
CommunityPostSchema.methods.isLikedBy = function(userId) {
  return this.likes.some(like => like.userId.toString() === userId.toString());
};

// Method to add like
CommunityPostSchema.methods.addLike = function(userId) {
  if (!this.isLikedBy(userId)) {
    this.likes.push({ userId });
    this.engagementScore = this.calculateEngagementScore();
    return true;
  }
  return false;
};

// Method to remove like
CommunityPostSchema.methods.removeLike = function(userId) {
  const index = this.likes.findIndex(like => like.userId.toString() === userId.toString());
  if (index > -1) {
    this.likes.splice(index, 1);
    this.engagementScore = this.calculateEngagementScore();
    return true;
  }
  return false;
};

// Method to add view
CommunityPostSchema.methods.addView = function(userId) {
  this.views += 1;
  if (userId && !this.uniqueViewers.includes(userId)) {
    this.uniqueViewers.push(userId);
  }
  this.engagementScore = this.calculateEngagementScore();
};

// Method to add comment reference
CommunityPostSchema.methods.addComment = function(commentId, authorId) {
  this.comments.push({
    commentId,
    authorId,
    createdAt: new Date(),
  });
  this.lastActivityAt = new Date();
  this.engagementScore = this.calculateEngagementScore();
};

// Method to calculate engagement score
CommunityPostSchema.methods.calculateEngagementScore = function() {
  const likesWeight = 1;
  const commentsWeight = 3;
  const viewsWeight = 0.1;
  const recencyWeight = 2;
  
  const likesScore = (this.likes?.length || 0) * likesWeight;
  const commentsScore = (this.comments?.length || 0) * commentsWeight;
  const viewsScore = (this.views || 0) * viewsWeight;
  
  // Recency bonus (higher for newer posts)
  const hoursSinceCreated = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60);
  const recencyScore = Math.max(0, (168 - hoursSinceCreated) / 168) * 100 * recencyWeight;
  
  return Math.round(likesScore + commentsScore + viewsScore + recencyScore);
};

// Static method to get trending posts
CommunityPostSchema.statics.getTrending = async function(limit = 10, category = null) {
  const query = { status: POST_STATUS.ACTIVE };
  if (category) {
    query.category = category;
  }
  
  return this.find(query)
    .sort({ engagementScore: -1, createdAt: -1 })
    .limit(limit)
    .populate('authorId', 'name avatar companyName')
    .lean();
};

// Static method to get personalized feed
CommunityPostSchema.statics.getPersonalizedFeed = async function(userId, interests = [], limit = 20, skip = 0) {
  const query = {
    status: POST_STATUS.ACTIVE,
    $or: [
      { category: { $in: interests } },
      { tags: { $in: interests } },
      { authorId: { $ne: userId } }, // Exclude user's own posts
    ],
  };
  
  return this.find(query)
    .sort({ isPinned: -1, engagementScore: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('authorId', 'name avatar companyName')
    .lean();
};

const CommunityPost = mongoose.model('CommunityPost', CommunityPostSchema);

module.exports = CommunityPost;