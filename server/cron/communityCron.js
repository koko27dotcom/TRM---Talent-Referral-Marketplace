/**
 * Community Cron Jobs
 * Handles trending calculation, digest emails, and scheduled tasks
 */

const { CommunityPost, POST_STATUS } = require('../models/CommunityPost.js');
const { Content, CONTENT_STATUS } = require('../models/Content.js');
const { Event, EVENT_STATUS } = require('../models/Event.js');
const { PublicProfile } = require('../models/PublicProfile.js');
const NotificationService = require('../services/notificationService.js');

class CommunityCron {
  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Calculate trending scores for all posts
   * Runs every hour
   */
  async calculateTrendingScores() {
    try {
      console.log('[CommunityCron] Calculating trending scores...');
      
      const posts = await CommunityPost.find({
        status: POST_STATUS.ACTIVE,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
      });

      let updatedCount = 0;
      for (const post of posts) {
        const newScore = post.calculateEngagementScore();
        if (newScore !== post.engagementScore) {
          post.engagementScore = newScore;
          await post.save();
          updatedCount++;
        }
      }

      console.log(`[CommunityCron] Updated ${updatedCount} post scores`);
      return { success: true, updatedCount };
    } catch (error) {
      console.error('[CommunityCron] Error calculating trending scores:', error);
      throw error;
    }
  }

  /**
   * Send daily digest emails to users
   * Runs once daily
   */
  async sendDailyDigest() {
    try {
      console.log('[CommunityCron] Sending daily digests...');
      
      // Get trending posts from last 24 hours
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const trendingPosts = await CommunityPost.find({
        status: POST_STATUS.ACTIVE,
        createdAt: { $gte: yesterday },
      })
        .sort({ engagementScore: -1 })
        .limit(5)
        .populate('authorId', 'name')
        .lean();

      // Get upcoming events
      const upcomingEvents = await Event.find({
        status: EVENT_STATUS.PUBLISHED,
        startDate: { $gte: new Date(), $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      })
        .sort({ startDate: 1 })
        .limit(3)
        .lean();

      // Get new content
      const newContent = await Content.find({
        status: CONTENT_STATUS.PUBLISHED,
        publishedAt: { $gte: yesterday },
      })
        .sort({ publishedAt: -1 })
        .limit(3)
        .populate('authorId', 'name')
        .lean();

      // Get active users who want digests
      const activeUsers = await PublicProfile.find({
        isPublic: true,
        'statistics.lastActiveAt': { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      }).select('userId');

      let sentCount = 0;
      for (const user of activeUsers) {
        // Send in-app notification for digest
        await this.notificationService.create({
          userId: user.userId,
          type: 'daily_digest',
          title: 'Your Daily Community Digest',
          message: `Check out ${trendingPosts.length} trending posts and ${upcomingEvents.length} upcoming events`,
          data: {
            trendingPosts: trendingPosts.map(p => p._id),
            upcomingEvents: upcomingEvents.map(e => e._id),
            newContent: newContent.map(c => c._id),
          },
        });
        sentCount++;
      }

      console.log(`[CommunityCron] Sent ${sentCount} daily digests`);
      return { success: true, sentCount };
    } catch (error) {
      console.error('[CommunityCron] Error sending daily digests:', error);
      throw error;
    }
  }

  /**
   * Publish scheduled content
   * Runs every 15 minutes
   */
  async publishScheduledContent() {
    try {
      console.log('[CommunityCron] Publishing scheduled content...');
      
      const scheduledContent = await Content.find({
        status: 'scheduled',
        scheduledAt: { $lte: new Date() },
      });

      let publishedCount = 0;
      for (const content of scheduledContent) {
        content.publish();
        await content.save();
        
        // Update author stats
        await PublicProfile.updateOne(
          { userId: content.authorId },
          { $inc: { 'statistics.contentPublished': 1 } }
        );
        
        publishedCount++;
      }

      console.log(`[CommunityCron] Published ${publishedCount} scheduled items`);
      return { success: true, publishedCount };
    } catch (error) {
      console.error('[CommunityCron] Error publishing scheduled content:', error);
      throw error;
    }
  }

  /**
   * Clean up old/archived content
   * Runs weekly
   */
  async cleanupOldContent() {
    try {
      console.log('[CommunityCron] Cleaning up old content...');
      
      const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
      
      // Archive posts older than 6 months with no activity
      const oldPostsResult = await CommunityPost.updateMany(
        {
          status: POST_STATUS.ACTIVE,
          lastActivityAt: { $lte: sixMonthsAgo },
          isPinned: false,
          isFeatured: false,
        },
        { status: 'archived' }
      );

      // Archive old content
      const oldContentResult = await Content.updateMany(
        {
          status: CONTENT_STATUS.PUBLISHED,
          publishedAt: { $lte: sixMonthsAgo },
          isFeatured: false,
        },
        { status: 'archived' }
      );

      console.log(`[CommunityCron] Archived ${oldPostsResult.modifiedCount} posts and ${oldContentResult.modifiedCount} content items`);
      return {
        success: true,
        postsArchived: oldPostsResult.modifiedCount,
        contentArchived: oldContentResult.modifiedCount,
      };
    } catch (error) {
      console.error('[CommunityCron] Error cleaning up old content:', error);
      throw error;
    }
  }

  /**
   * Update featured content (rotate weekly)
   * Runs weekly
   */
  async rotateFeaturedContent() {
    try {
      console.log('[CommunityCron] Rotating featured content...');
      
      // Unfeature expired content
      await Content.updateMany(
        {
          isFeatured: true,
          featuredUntil: { $lte: new Date() },
        },
        {
          isFeatured: false,
          featuredOrder: 0,
          featuredUntil: null,
        }
      );

      // Get top trending content to feature
      const trendingContent = await Content.find({
        status: CONTENT_STATUS.PUBLISHED,
        isFeatured: false,
        publishedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      })
        .sort({ engagementScore: -1 })
        .limit(3);

      // Feature new content
      for (let i = 0; i < trendingContent.length; i++) {
        trendingContent[i].feature(i + 1, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
        await trendingContent[i].save();
      }

      console.log(`[CommunityCron] Featured ${trendingContent.length} new items`);
      return { success: true, featuredCount: trendingContent.length };
    } catch (error) {
      console.error('[CommunityCron] Error rotating featured content:', error);
      throw error;
    }
  }

  /**
   * Send event reminders
   * Runs every hour
   */
  async sendEventReminders() {
    try {
      console.log('[CommunityCron] Sending event reminders...');
      
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      // Find events starting in 24 hours
      const upcomingEvents = await Event.find({
        status: EVENT_STATUS.PUBLISHED,
        startDate: {
          $gte: tomorrow,
          $lte: new Date(tomorrow.getTime() + 60 * 60 * 1000), // 1 hour window
        },
        'settings.sendReminders': true,
      }).populate('attendees.userId', 'name');

      let reminderCount = 0;
      for (const event of upcomingEvents) {
        for (const attendee of event.attendees) {
          if (attendee.status === 'confirmed' && !attendee.reminderSent) {
            await this.notificationService.create({
              userId: attendee.userId,
              type: 'event_reminder',
              title: `Reminder: ${event.title}`,
              message: 'Your event starts in 24 hours',
              data: { eventId: event._id },
            });
            
            attendee.reminderSent = true;
            reminderCount++;
          }
        }
        await event.save();
      }

      console.log(`[CommunityCron] Sent ${reminderCount} event reminders`);
      return { success: true, reminderCount };
    } catch (error) {
      console.error('[CommunityCron] Error sending event reminders:', error);
      throw error;
    }
  }

  /**
   * Update user engagement stats
   * Runs daily
   */
  async updateEngagementStats() {
    try {
      console.log('[CommunityCron] Updating engagement stats...');
      
      // Update profile view counts, etc.
      const activeProfiles = await PublicProfile.find({
        isPublic: true,
      });

      let updatedCount = 0;
      for (const profile of activeProfiles) {
        // Recalculate any dynamic stats
        const referralSuccessRate = profile.statistics.totalReferrals > 0
          ? Math.round((profile.statistics.successfulHires / profile.statistics.totalReferrals) * 100)
          : 0;
        
        if (profile.statistics.referralSuccessRate !== referralSuccessRate) {
          profile.statistics.referralSuccessRate = referralSuccessRate;
          await profile.save();
          updatedCount++;
        }
      }

      console.log(`[CommunityCron] Updated ${updatedCount} profile stats`);
      return { success: true, updatedCount };
    } catch (error) {
      console.error('[CommunityCron] Error updating engagement stats:', error);
      throw error;
    }
  }

  /**
   * Run all cron jobs (for manual execution)
   */
  async runAll() {
    console.log('[CommunityCron] Running all community cron jobs...');
    
    const results = {
      trending: await this.calculateTrendingScores(),
      scheduled: await this.publishScheduledContent(),
      reminders: await this.sendEventReminders(),
    };

    console.log('[CommunityCron] All jobs completed:', results);
    return results;
  }
}

module.exports = CommunityCron;