/**
 * Comment Model
 * Handles comments and threaded replies on community posts
 * Supports likes, accepted answers, and moderation
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Comment status constants
const COMMENT_STATUS = {
  ACTIVE: 'active',
  FLAGGED: 'flagged',
  REMOVED: 'removed',
  HIDDEN: 'hidden',
};

// Author type constants
const AUTHOR_TYPE = {
  USER: 'user',
  COMPANY: 'company',
};

// Like schema for comment likes
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

// Comment Schema
const CommentSchema = new Schema({
  commentId: {
    type: String,
    unique: true,
    index: true,
  },
  postId: {
    type: Schema.Types.ObjectId,
    ref: 'CommunityPost',
    required: true,
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
  content: {
    type: String,
    required: true,
    maxlength: 5000,
  },
  // For threaded replies
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'Comment',
    default: null,
    index: true,
  },
  // For nested replies tracking
  replyChain: [{
    type: Schema.Types.ObjectId,
    ref: 'Comment',
  }],
  depth: {
    type: Number,
    default: 0,
    max: 5, // Maximum nesting depth
  },
  likes: [LikeSchema],
  isAcceptedAnswer: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: Object.values(COMMENT_STATUS),
    default: COMMENT_STATUS.ACTIVE,
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
  // Mentions in comment
  mentions: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    username: String,
  }],
  // Edit history
  editHistory: [{
    content: String,
    editedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  isEdited: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Indexes for common queries
CommentSchema.index({ postId: 1, status: 1, createdAt: -1 });
CommentSchema.index({ postId: 1, parentId: 1, status: 1, createdAt: 1 });
CommentSchema.index({ authorId: 1, status: 1, createdAt: -1 });
CommentSchema.index({ isAcceptedAnswer: 1, postId: 1 });
CommentSchema.index({ content: 'text' });

// Generate commentId before saving
CommentSchema.pre('save', async function(next) {
  if (!this.commentId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.commentId = `COMM${timestamp}${random}`;
  }
  next();
});

// Virtual for like count
CommentSchema.virtual('likeCount').get(function() {
  return this.likes?.length || 0;
});

// Method to check if user liked the comment
CommentSchema.methods.isLikedBy = function(userId) {
  return this.likes.some(like => like.userId.toString() === userId.toString());
};

// Method to add like
CommentSchema.methods.addLike = function(userId) {
  if (!this.isLikedBy(userId)) {
    this.likes.push({ userId });
    return true;
  }
  return false;
};

// Method to remove like
CommentSchema.methods.removeLike = function(userId) {
  const index = this.likes.findIndex(like => like.userId.toString() === userId.toString());
  if (index > -1) {
    this.likes.splice(index, 1);
    return true;
  }
  return false;
};

// Method to mark as accepted answer
CommentSchema.methods.markAsAccepted = function() {
  this.isAcceptedAnswer = true;
};

// Method to unmark as accepted answer
CommentSchema.methods.unmarkAsAccepted = function() {
  this.isAcceptedAnswer = false;
};

// Method to edit comment
CommentSchema.methods.edit = function(newContent) {
  // Store previous content in history
  this.editHistory.push({
    content: this.content,
    editedAt: new Date(),
  });
  
  // Update content
  this.content = newContent;
  this.isEdited = true;
};

// Static method to get comments for a post with threaded structure
CommentSchema.statics.getThreadedComments = async function(postId, options = {}) {
  const { limit = 50, skip = 0, sortBy = 'createdAt', sortOrder = 'asc' } = options;
  
  const comments = await this.find({
    postId,
    status: { $in: [COMMENT_STATUS.ACTIVE, COMMENT_STATUS.FLAGGED] },
  })
    .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
    .skip(skip)
    .limit(limit)
    .populate('authorId', 'name avatar companyName')
    .lean();
  
  // Build threaded structure
  const commentMap = new Map();
  const rootComments = [];
  
  // First pass: create map and identify root comments
  comments.forEach(comment => {
    comment.replies = [];
    commentMap.set(comment._id.toString(), comment);
    
    if (!comment.parentId) {
      rootComments.push(comment);
    }
  });
  
  // Second pass: build reply chains
  comments.forEach(comment => {
    if (comment.parentId) {
      const parent = commentMap.get(comment.parentId.toString());
      if (parent) {
        parent.replies.push(comment);
      }
    }
  });
  
  // Sort root comments by accepted answer first, then by likes
  rootComments.sort((a, b) => {
    if (a.isAcceptedAnswer && !b.isAcceptedAnswer) return -1;
    if (!a.isAcceptedAnswer && b.isAcceptedAnswer) return 1;
    return (b.likes?.length || 0) - (a.likes?.length || 0);
  });
  
  return rootComments;
};

// Static method to get comment count for a post
CommentSchema.statics.getCommentCount = async function(postId) {
  return this.countDocuments({
    postId,
    status: { $in: [COMMENT_STATUS.ACTIVE, COMMENT_STATUS.FLAGGED] },
  });
};

// Static method to get user's comments
CommentSchema.statics.getUserComments = async function(userId, options = {}) {
  const { limit = 20, skip = 0 } = options;
  
  return this.find({
    authorId: userId,
    status: COMMENT_STATUS.ACTIVE,
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('postId', 'title postId')
    .lean();
};

const Comment = mongoose.model('Comment', CommentSchema);

module.exports = Comment;