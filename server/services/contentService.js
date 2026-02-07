/**
 * ContentService
 * Manages blog posts, podcasts, videos, and content publishing
 * Supports SEO optimization, media management, and analytics
 */

const { Content, CONTENT_TYPES, CONTENT_STATUS, CONTENT_CATEGORIES } = require('../models/Content.js');
const { Comment } = require('../models/Comment.js');
const { PublicProfile } = require('../models/PublicProfile.js');
const NotificationService = require('./notificationService.js');

class ContentService {
  constructor() {
    this.notificationService = new NotificationService();
  }

  // ==================== CONTENT CREATION ====================

  /**
   * Create new content
   */
  async createContent(contentData, authorId) {
    try {
      const content = new Content({
        ...contentData,
        authorId,
        status: CONTENT_STATUS.DRAFT,
        isPublished: false,
      });

      await content.save();

      return {
        success: true,
        content: await Content.findById(content._id)
          .populate('authorId', 'name avatar displayName')
          .lean(),
      };
    } catch (error) {
      console.error('Error creating content:', error);
      throw error;
    }
  }

  /**
   * Get content by ID
   */
  async getContentById(contentId, userId = null) {
    try {
      const content = await Content.findById(contentId)
        .populate('authorId', 'name avatar displayName bio')
        .populate('relatedContent', 'title slug thumbnail type')
        .lean();

      if (!content) {
        throw new Error('Content not found');
      }

      // Check if content is accessible
      if (content.status !== CONTENT_STATUS.PUBLISHED && 
          content.authorId._id.toString() !== userId?.toString()) {
        throw new Error('Content not available');
      }

      // Add view
      if (userId) {
        await Content.findByIdAndUpdate(contentId, {
          $addToSet: { uniqueViewers: userId },
          $inc: { views: 1 },
        });
      }

      // Get comments
      const comments = await Comment.find({
        postId: contentId,
        status: 'active',
      })
        .populate('authorId', 'name avatar')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      return {
        ...content,
        comments,
        isLiked: userId ? content.likes?.some(l => l.userId.toString() === userId.toString()) : false,
        likeCount: content.likes?.length || 0,
        commentCount: comments.length,
      };
    } catch (error) {
      console.error('Error getting content:', error);
      throw error;
    }
  }

  /**
   * Update content
   */
  async updateContent(contentId, updateData, userId, isAdmin = false) {
    try {
      const content = await Content.findById(contentId);

      if (!content) {
        throw new Error('Content not found');
      }

      // Check ownership
      if (!isAdmin && content.authorId.toString() !== userId.toString()) {
        throw new Error('Unauthorized to update this content');
      }

      // Store previous version
      if (content.content !== updateData.content) {
        content.previousVersions.push({
          content: content.content,
          updatedAt: new Date(),
          updatedBy: userId,
        });
        content.version += 1;
      }

      const updatedContent = await Content.findByIdAndUpdate(
        contentId,
        { ...updateData, isEdited: true },
        { new: true }
      )
        .populate('authorId', 'name avatar displayName')
        .lean();

      return {
        success: true,
        content: updatedContent,
      };
    } catch (error) {
      console.error('Error updating content:', error);
      throw error;
    }
  }

  /**
   * Delete content
   */
  async deleteContent(contentId, userId, isAdmin = false) {
    try {
      const content = await Content.findById(contentId);

      if (!content) {
        throw new Error('Content not found');
      }

      if (!isAdmin && content.authorId.toString() !== userId.toString()) {
        throw new Error('Unauthorized to delete this content');
      }

      await Content.findByIdAndUpdate(contentId, {
        status: CONTENT_STATUS.ARCHIVED,
        isPublished: false,
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting content:', error);
      throw error;
    }
  }

  // ==================== PUBLISHING ====================

  /**
   * Publish content
   */
  async publishContent(contentId, userId) {
    try {
      const content = await Content.findById(contentId);

      if (!content) {
        throw new Error('Content not found');
      }

      if (content.authorId.toString() !== userId.toString()) {
        throw new Error('Unauthorized');
      }

      content.publish();
      await content.save();

      // Update author profile stats
      await PublicProfile.updateOne(
        { userId },
        { $inc: { 'statistics.contentPublished': 1 } }
      );

      // Notify followers
      await this.notifyFollowersOfNewContent(content);

      return {
        success: true,
        content: await this.getContentById(contentId, userId),
      };
    } catch (error) {
      console.error('Error publishing content:', error);
      throw error;
    }
  }

  /**
   * Schedule content
   */
  async scheduleContent(contentId, userId, scheduledAt) {
    try {
      const content = await Content.findById(contentId);

      if (!content) {
        throw new Error('Content not found');
      }

      if (content.authorId.toString() !== userId.toString()) {
        throw new Error('Unauthorized');
      }

      content.schedule(scheduledAt);
      await content.save();

      return {
        success: true,
        content: await Content.findById(contentId).lean(),
      };
    } catch (error) {
      console.error('Error scheduling content:', error);
      throw error;
    }
  }

  /**
   * Publish scheduled content
   */
  async publishScheduledContent() {
    try {
      const scheduledContent = await Content.getScheduledForPublishing();

      for (const content of scheduledContent) {
        content.publish();
        await content.save();

        // Update author profile stats
        await PublicProfile.updateOne(
          { userId: content.authorId },
          { $inc: { 'statistics.contentPublished': 1 } }
        );

        // Notify followers
        await this.notifyFollowersOfNewContent(content);
      }

      return {
        success: true,
        publishedCount: scheduledContent.length,
      };
    } catch (error) {
      console.error('Error publishing scheduled content:', error);
      throw error;
    }
  }

  // ==================== LISTINGS ====================

  /**
   * Get featured content
   */
  async getFeaturedContent(type = null, limit = 5) {
    try {
      const content = await Content.getFeatured(type, limit);
      return content;
    } catch (error) {
      console.error('Error getting featured content:', error);
      throw error;
    }
  }

  /**
   * Get trending content
   */
  async getTrendingContent(type = null, limit = 10) {
    try {
      const content = await Content.getTrending(type, limit);
      return content;
    } catch (error) {
      console.error('Error getting trending content:', error);
      throw error;
    }
  }

  /**
   * Get latest content
   */
  async getLatestContent(type = null, limit = 20, skip = 0) {
    try {
      const content = await Content.getLatest(type, limit, skip);
      return content;
    } catch (error) {
      console.error('Error getting latest content:', error);
      throw error;
    }
  }

  /**
   * Get content by category
   */
  async getContentByCategory(category, options = {}) {
    try {
      const content = await Content.getByCategory(category, options);
      return content;
    } catch (error) {
      console.error('Error getting content by category:', error);
      throw error;
    }
  }

  /**
   * Get content by type (blog/podcast/video)
   */
  async getContentByType(type, options = {}) {
    try {
      const { limit = 20, skip = 0, category = null } = options;

      const query = {
        type,
        status: CONTENT_STATUS.PUBLISHED,
      };

      if (category) {
        query.category = category;
      }

      const content = await Content.find(query)
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('authorId', 'name avatar displayName')
        .lean();

      return content;
    } catch (error) {
      console.error('Error getting content by type:', error);
      throw error;
    }
  }

  /**
   * Get content by author
   */
  async getContentByAuthor(authorId, options = {}) {
    try {
      const content = await Content.getByAuthor(authorId, options);
      return content;
    } catch (error) {
      console.error('Error getting content by author:', error);
      throw error;
    }
  }

  /**
   * Get related content
   */
  async getRelatedContent(contentId, limit = 5) {
    try {
      const content = await Content.getRelated(contentId, limit);
      return content;
    } catch (error) {
      console.error('Error getting related content:', error);
      throw error;
    }
  }

  // ==================== SEARCH ====================

  /**
   * Search content
   */
  async searchContent(query, options = {}) {
    try {
      const content = await Content.search(query, options);
      return content;
    } catch (error) {
      console.error('Error searching content:', error);
      throw error;
    }
  }

  // ==================== ENGAGEMENT ====================

  /**
   * Like/unlike content
   */
  async toggleLike(contentId, userId) {
    try {
      const content = await Content.findById(contentId);

      if (!content) {
        throw new Error('Content not found');
      }

      const isLiked = content.isLikedBy(userId);

      if (isLiked) {
        content.removeLike(userId);
      } else {
        content.addLike(userId);

        // Notify author (if not self-like)
        if (content.authorId.toString() !== userId.toString()) {
          await this.notificationService.create({
            userId: content.authorId,
            type: 'content_liked',
            title: 'New Like on Your Content',
            message: 'Someone liked your content',
            data: { contentId, likedBy: userId },
          });
        }
      }

      await content.save();

      return {
        success: true,
        isLiked: !isLiked,
        likeCount: content.likeCount,
      };
    } catch (error) {
      console.error('Error toggling like:', error);
      throw error;
    }
  }

  /**
   * Add comment to content
   */
  async addComment(contentId, userId, commentData) {
    try {
      const content = await Content.findById(contentId);

      if (!content || content.status !== CONTENT_STATUS.PUBLISHED) {
        throw new Error('Content not found or not published');
      }

      const comment = new Comment({
        postId: contentId,
        authorId: userId,
        content: commentData.content,
        parentId: commentData.parentId || null,
        status: 'active',
      });

      await comment.save();

      // Update content with comment reference
      content.addComment(comment._id, userId);
      await content.save();

      // Notify content author
      if (content.authorId.toString() !== userId.toString()) {
        await this.notificationService.create({
          userId: content.authorId,
          type: 'content_commented',
          title: 'New Comment on Your Content',
          message: 'Someone commented on your content',
          data: { contentId, commentId: comment._id },
        });
      }

      return {
        success: true,
        comment: await Comment.findById(comment._id)
          .populate('authorId', 'name avatar')
          .lean(),
      };
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  /**
   * Share content
   */
  async shareContent(contentId, userId, platform = null) {
    try {
      const content = await Content.findById(contentId);

      if (!content) {
        throw new Error('Content not found');
      }

      content.incrementShares();
      await content.save();

      // Track share in analytics
      if (platform && content.analytics?.trafficSources) {
        const sourceMap = {
          facebook: 'social',
          twitter: 'social',
          linkedin: 'social',
          email: 'email',
          copy: 'direct',
        };
        const source = sourceMap[platform] || 'referral';
        content.analytics.trafficSources[source] += 1;
        await content.save();
      }

      return {
        success: true,
        shareCount: content.shares,
      };
    } catch (error) {
      console.error('Error sharing content:', error);
      throw error;
    }
  }

  // ==================== FEATURED CONTENT MANAGEMENT ====================

  /**
   * Feature content (admin only)
   */
  async featureContent(contentId, order = 0, until = null) {
    try {
      const content = await Content.findById(contentId);

      if (!content) {
        throw new Error('Content not found');
      }

      content.feature(order, until);
      await content.save();

      return { success: true };
    } catch (error) {
      console.error('Error featuring content:', error);
      throw error;
    }
  }

  /**
   * Unfeature content (admin only)
   */
  async unfeatureContent(contentId) {
    try {
      const content = await Content.findById(contentId);

      if (!content) {
        throw new Error('Content not found');
      }

      content.unfeature();
      await content.save();

      return { success: true };
    } catch (error) {
      console.error('Error unfeaturing content:', error);
      throw error;
    }
  }

  // ==================== SEO ====================

  /**
   * Generate SEO metadata for content
   */
  async generateSEOMetadata(contentId) {
    try {
      const content = await Content.findById(contentId);

      if (!content) {
        throw new Error('Content not found');
      }

      // Auto-generate SEO title if not set
      if (!content.seoTitle) {
        content.seoTitle = content.title.substring(0, 70);
      }

      // Auto-generate SEO description if not set
      if (!content.seoDescription) {
        // Strip HTML and truncate
        const plainText = content.content.replace(/<[^>]*>/g, '');
        content.seoDescription = plainText.substring(0, 157) + '...';
      }

      // Auto-generate keywords from tags and title
      if (!content.seoKeywords || content.seoKeywords.length === 0) {
        content.seoKeywords = [
          ...content.tags,
          ...content.title.toLowerCase().split(' ').filter(w => w.length > 3),
        ].slice(0, 10);
      }

      await content.save();

      return {
        success: true,
        seo: {
          title: content.seoTitle,
          description: content.seoDescription,
          keywords: content.seoKeywords,
        },
      };
    } catch (error) {
      console.error('Error generating SEO metadata:', error);
      throw error;
    }
  }

  // ==================== NEWSLETTER ====================

  /**
   * Generate newsletter content
   */
  async generateNewsletter(options = {}) {
    try {
      const { limit = 5, categories = [] } = options;

      const query = {
        status: CONTENT_STATUS.PUBLISHED,
        publishedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
      };

      if (categories.length > 0) {
        query.category = { $in: categories };
      }

      const recentContent = await Content.find(query)
        .sort({ engagementScore: -1 })
        .limit(limit)
        .populate('authorId', 'name avatar displayName')
        .lean();

      const featuredContent = await Content.getFeatured(null, 1);

      return {
        success: true,
        newsletter: {
          featured: featuredContent[0] || null,
          recent: recentContent,
          generatedAt: new Date(),
        },
      };
    } catch (error) {
      console.error('Error generating newsletter:', error);
      throw error;
    }
  }

  // ==================== ANALYTICS ====================

  /**
   * Get content analytics
   */
  async getContentAnalytics(contentId, userId) {
    try {
      const content = await Content.findById(contentId);

      if (!content) {
        throw new Error('Content not found');
      }

      if (content.authorId.toString() !== userId.toString()) {
        throw new Error('Unauthorized');
      }

      return {
        success: true,
        analytics: {
          views: content.views,
          uniqueViews: content.uniqueViewers?.length || 0,
          likes: content.likes?.length || 0,
          comments: content.comments?.length || 0,
          shares: content.shares,
          engagementScore: content.engagementScore,
          readingTime: content.readingTime,
          ...content.analytics,
        },
      };
    } catch (error) {
      console.error('Error getting content analytics:', error);
      throw error;
    }
  }

  /**
   * Update content analytics
   */
  async updateAnalytics(contentId, analyticsData) {
    try {
      await Content.findByIdAndUpdate(contentId, {
        $set: { analytics: analyticsData },
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating analytics:', error);
      throw error;
    }
  }

  // ==================== NOTIFICATIONS ====================

  /**
   * Notify followers of new content
   */
  async notifyFollowersOfNewContent(content) {
    try {
      // Get users interested in this category
      const interestedUsers = await PublicProfile.find({
        expertise: { $in: [content.category, ...content.tags] },
        isPublic: true,
      }).select('userId');

      for (const profile of interestedUsers.slice(0, 100)) { // Limit to 100 notifications
        await this.notificationService.create({
          userId: profile.userId,
          type: 'new_content',
          title: 'New Content Published',
          message: `Check out: ${content.title}`,
          data: { contentId: content._id, type: content.type },
        });
      }
    } catch (error) {
      console.error('Error notifying followers:', error);
    }
  }
}

module.exports = ContentService;