/**
 * Content Moderator
 * Handles automated content moderation using pattern matching
 * Can be extended with ML-based moderation
 */

const { CommunityPost, POST_STATUS } = require('../models/CommunityPost.js');
const { Comment, COMMENT_STATUS } = require('../models/Comment.js');
const { Review, REVIEW_STATUS } = require('../models/Review.js');
const NotificationService = require('../services/notificationService.js');

// Moderation patterns for different types of violations
const MODERATION_PATTERNS = {
  // Spam patterns
  spam: {
    patterns: [
      /\b(buy now|click here|limited time|act now|order now|call now)\b/gi,
      /(https?:\/\/[^\s]+){3,}/g, // Multiple URLs
      /\b(viagra|cialis|casino|lottery|winner|prize|free money)\b/gi,
      /\b(weight loss|diet pill|work from home|earn \$\d+)/gi,
      /\$\d+\s*(per day|per hour|weekly|monthly)/gi,
    ],
    severity: 'medium',
    action: 'flag',
  },
  
  // Harassment patterns
  harassment: {
    patterns: [
      /\b(stupid|idiot|moron|loser|dumb|retard)\b/gi,
      /\b(shut up|get lost|go away|nobody cares)\b/gi,
      /\b(you suck|you're terrible|you're awful)\b/gi,
    ],
    severity: 'high',
    action: 'flag',
  },
  
  // Profanity patterns (mild)
  profanity: {
    patterns: [
      /\b(damn|hell|crap|ass|bastard|bloody)\b/gi,
    ],
    severity: 'low',
    action: 'warn',
  },
  
  // Discrimination patterns
  discrimination: {
    patterns: [
      /\b(racist|sexist|homophobic|discrimination)\b/gi,
      /\b(hate speech|bigot|prejudice)\b/gi,
    ],
    severity: 'high',
    action: 'flag',
  },
  
  // Personal information (PII)
  pii: {
    patterns: [
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Credit card
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
      /\b\d{3}-\d{3}-\d{4}\b/g, // Phone
    ],
    severity: 'high',
    action: 'flag',
  },
  
  // Off-topic (for job/community posts)
  offtopic: {
    patterns: [
      /\b(click here to win|subscribe to my channel|follow me on)\b/gi,
    ],
    severity: 'low',
    action: 'warn',
  },
};

class ContentModerator {
  constructor() {
    this.notificationService = new NotificationService();
    this.enabled = true;
  }

  /**
   * Moderate content and return results
   */
  moderate(content, options = {}) {
    if (!this.enabled || !content) {
      return {
        isFlagged: false,
        flags: [],
        severity: 'none',
        action: 'none',
      };
    }

    const flags = [];
    let highestSeverity = 'none';
    let recommendedAction = 'none';

    for (const [category, config] of Object.entries(MODERATION_PATTERNS)) {
      for (const pattern of config.patterns) {
        const matches = content.match(pattern);
        if (matches) {
          flags.push({
            category,
            severity: config.severity,
            matches: matches.slice(0, 5), // Limit stored matches
            pattern: pattern.toString(),
          });

          // Track highest severity
          if (this.getSeverityLevel(config.severity) > this.getSeverityLevel(highestSeverity)) {
            highestSeverity = config.severity;
            recommendedAction = config.action;
          }
        }
      }
    }

    return {
      isFlagged: flags.length > 0,
      flags,
      severity: highestSeverity,
      action: recommendedAction,
    };
  }

  /**
   * Get numeric severity level for comparison
   */
  getSeverityLevel(severity) {
    const levels = {
      none: 0,
      low: 1,
      medium: 2,
      high: 3,
    };
    return levels[severity] || 0;
  }

  /**
   * Moderate a post and update its status
   */
  async moderatePost(postId) {
    try {
      const post = await CommunityPost.findById(postId);
      if (!post) {
        throw new Error('Post not found');
      }

      const contentToModerate = `${post.title} ${post.content}`;
      const result = this.moderate(contentToModerate);

      if (result.isFlagged) {
        // Update post status based on severity
        if (result.severity === 'high') {
          post.status = POST_STATUS.FLAGGED;
        }

        // Add moderation flags
        post.moderationFlags.push({
          reason: `Auto-moderated: ${result.flags.map(f => f.category).join(', ')}`,
          flaggedBy: 'auto',
          flaggedAt: new Date(),
          details: result,
        });

        await post.save();

        // Notify user if high severity
        if (result.severity === 'high') {
          await this.notificationService.create({
            userId: post.authorId,
            type: 'content_flagged',
            title: 'Your Post Was Flagged',
            message: 'Your post was automatically flagged for review. Please review our community guidelines.',
            data: { postId: post._id },
          });
        }

        // Notify admins for high severity
        if (result.severity === 'high') {
          await this.notifyAdmins('post', postId, result);
        }
      }

      return result;
    } catch (error) {
      console.error('[ContentModerator] Error moderating post:', error);
      throw error;
    }
  }

  /**
   * Moderate a comment and update its status
   */
  async moderateComment(commentId) {
    try {
      const comment = await Comment.findById(commentId);
      if (!comment) {
        throw new Error('Comment not found');
      }

      const result = this.moderate(comment.content);

      if (result.isFlagged) {
        if (result.severity === 'high') {
          comment.status = COMMENT_STATUS.FLAGGED;
        }

        comment.moderationFlags.push({
          reason: `Auto-moderated: ${result.flags.map(f => f.category).join(', ')}`,
          flaggedBy: 'auto',
          flaggedAt: new Date(),
          details: result,
        });

        await comment.save();

        if (result.severity === 'high') {
          await this.notificationService.create({
            userId: comment.authorId,
            type: 'content_flagged',
            title: 'Your Comment Was Flagged',
            message: 'Your comment was automatically flagged for review.',
            data: { commentId: comment._id },
          });
        }
      }

      return result;
    } catch (error) {
      console.error('[ContentModerator] Error moderating comment:', error);
      throw error;
    }
  }

  /**
   * Moderate a review
   */
  async moderateReview(reviewId) {
    try {
      const review = await Review.findById(reviewId);
      if (!review) {
        throw new Error('Review not found');
      }

      const contentToModerate = `${review.title} ${review.content}`;
      const result = this.moderate(contentToModerate);

      if (result.isFlagged) {
        if (result.severity === 'high') {
          review.status = REVIEW_STATUS.FLAGGED;
        }

        review.moderationFlags.push({
          reason: `Auto-moderated: ${result.flags.map(f => f.category).join(', ')}`,
          flaggedBy: 'auto',
          flaggedAt: new Date(),
          details: result,
        });

        await review.save();
      }

      return result;
    } catch (error) {
      console.error('[ContentModerator] Error moderating review:', error);
      throw error;
    }
  }

  /**
   * Batch moderate multiple items
   */
  async batchModerate(contentIds, contentType) {
    const results = [];
    
    for (const id of contentIds) {
      try {
        let result;
        switch (contentType) {
          case 'post':
            result = await this.moderatePost(id);
            break;
          case 'comment':
            result = await this.moderateComment(id);
            break;
          case 'review':
            result = await this.moderateReview(id);
            break;
          default:
            throw new Error(`Unknown content type: ${contentType}`);
        }
        results.push({ id, result, success: true });
      } catch (error) {
        results.push({ id, error: error.message, success: false });
      }
    }

    return results;
  }

  /**
   * Get moderation statistics
   */
  async getStats(timeRange = 24) {
    try {
      const since = new Date(Date.now() - timeRange * 60 * 60 * 1000);

      const [postStats, commentStats, reviewStats] = await Promise.all([
        CommunityPost.aggregate([
          { $match: { 'moderationFlags.flaggedAt': { $gte: since } } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        Comment.aggregate([
          { $match: { 'moderationFlags.flaggedAt': { $gte: since } } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        Review.aggregate([
          { $match: { 'moderationFlags.flaggedAt': { $gte: since } } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
      ]);

      return {
        timeRange,
        posts: postStats,
        comments: commentStats,
        reviews: reviewStats,
        totalFlagged: postStats.reduce((sum, s) => sum + s.count, 0) +
                      commentStats.reduce((sum, s) => sum + s.count, 0) +
                      reviewStats.reduce((sum, s) => sum + s.count, 0),
      };
    } catch (error) {
      console.error('[ContentModerator] Error getting stats:', error);
      throw error;
    }
  }

  /**
   * Get flagged content for admin review
   */
  async getFlaggedContent(options = {}) {
    try {
      const { limit = 20, skip = 0, type = 'all' } = options;
      const results = { posts: [], comments: [], reviews: [] };

      if (type === 'all' || type === 'posts') {
        results.posts = await CommunityPost.find({
          status: POST_STATUS.FLAGGED,
        })
          .sort({ 'moderationFlags.flaggedAt': -1 })
          .skip(skip)
          .limit(limit)
          .populate('authorId', 'name email')
          .lean();
      }

      if (type === 'all' || type === 'comments') {
        results.comments = await Comment.find({
          status: COMMENT_STATUS.FLAGGED,
        })
          .sort({ 'moderationFlags.flaggedAt': -1 })
          .skip(skip)
          .limit(limit)
          .populate('authorId', 'name email')
          .populate('postId', 'title')
          .lean();
      }

      if (type === 'all' || type === 'reviews') {
        results.reviews = await Review.find({
          status: REVIEW_STATUS.FLAGGED,
        })
          .sort({ 'moderationFlags.flaggedAt': -1 })
          .skip(skip)
          .limit(limit)
          .populate('reviewerId', 'name email')
          .lean();
      }

      return results;
    } catch (error) {
      console.error('[ContentModerator] Error getting flagged content:', error);
      throw error;
    }
  }

  /**
   * Approve flagged content
   */
  async approveContent(contentId, contentType) {
    try {
      let Model, statusField;
      
      switch (contentType) {
        case 'post':
          Model = CommunityPost;
          statusField = POST_STATUS.ACTIVE;
          break;
        case 'comment':
          Model = Comment;
          statusField = COMMENT_STATUS.ACTIVE;
          break;
        case 'review':
          Model = Review;
          statusField = REVIEW_STATUS.PUBLISHED;
          break;
        default:
          throw new Error(`Unknown content type: ${contentType}`);
      }

      await Model.findByIdAndUpdate(contentId, {
        status: statusField,
        $push: {
          moderationFlags: {
            reason: 'Approved by admin',
            flaggedBy: 'admin',
            flaggedAt: new Date(),
          },
        },
      });

      return { success: true };
    } catch (error) {
      console.error('[ContentModerator] Error approving content:', error);
      throw error;
    }
  }

  /**
   * Remove content
   */
  async removeContent(contentId, contentType, reason) {
    try {
      let Model, statusField;
      
      switch (contentType) {
        case 'post':
          Model = CommunityPost;
          statusField = POST_STATUS.REMOVED;
          break;
        case 'comment':
          Model = Comment;
          statusField = COMMENT_STATUS.REMOVED;
          break;
        case 'review':
          Model = Review;
          statusField = REVIEW_STATUS.REMOVED;
          break;
        default:
          throw new Error(`Unknown content type: ${contentType}`);
      }

      const item = await Model.findByIdAndUpdate(contentId, {
        status: statusField,
        $push: {
          moderationFlags: {
            reason: `Removed: ${reason}`,
            flaggedBy: 'admin',
            flaggedAt: new Date(),
          },
        },
      });

      // Notify user
      if (item) {
        await this.notificationService.create({
          userId: item.authorId || item.reviewerId,
          type: 'content_removed',
          title: 'Your Content Was Removed',
          message: `Your ${contentType} was removed by a moderator. Reason: ${reason}`,
          data: { contentId, contentType, reason },
        });
      }

      return { success: true };
    } catch (error) {
      console.error('[ContentModerator] Error removing content:', error);
      throw error;
    }
  }

  /**
   * Notify admins of flagged content
   */
  async notifyAdmins(contentType, contentId, moderationResult) {
    try {
      // In a real implementation, this would notify all admins
      // For now, we log it
      console.log(`[ContentModerator] High severity ${contentType} flagged:`, {
        contentId,
        flags: moderationResult.flags,
      });
    } catch (error) {
      console.error('[ContentModerator] Error notifying admins:', error);
    }
  }

  /**
   * Enable/disable moderation
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    console.log(`[ContentModerator] Moderation ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Add custom moderation pattern
   */
  addPattern(category, pattern, severity = 'medium', action = 'flag') {
    if (!MODERATION_PATTERNS[category]) {
      MODERATION_PATTERNS[category] = {
        patterns: [],
        severity,
        action,
      };
    }
    MODERATION_PATTERNS[category].patterns.push(pattern);
  }
}

module.exports = ContentModerator;