/**
 * PublicProfileService
 * Manages public referrer profiles, reviews, and portfolio
 */

const { PublicProfile, AVAILABILITY_STATUS } = require('../models/PublicProfile.js');
const { Review, REVIEW_CATEGORIES } = require('../models/Review.js');
const { Referral } = require('../models/Referral.js');
const NotificationService = require('./notificationService.js');

class PublicProfileService {
  constructor() {
    this.notificationService = new NotificationService();
  }

  // ==================== PROFILE MANAGEMENT ====================

  /**
   * Create or update public profile
   */
  async createOrUpdateProfile(userId, profileData) {
    try {
      let profile = await PublicProfile.findOne({ userId });

      if (profile) {
        // Update existing profile
        Object.assign(profile, profileData);
        await profile.save();
      } else {
        // Create new profile
        profile = new PublicProfile({
          userId,
          ...profileData,
          statistics: {
            memberSince: new Date(),
            lastActiveAt: new Date(),
          },
        });
        await profile.save();
      }

      return {
        success: true,
        profile: await PublicProfile.findById(profile._id)
          .populate('userId', 'name email')
          .lean(),
      };
    } catch (error) {
      console.error('Error creating/updating profile:', error);
      throw error;
    }
  }

  /**
   * Get public profile by user ID
   */
  async getProfileByUserId(userId, currentUserId = null) {
    try {
      const profile = await PublicProfile.getByUserId(userId);

      if (!profile) {
        throw new Error('Profile not found');
      }

      // Check visibility
      if (!profile.isPublic && userId.toString() !== currentUserId?.toString()) {
        throw new Error('Profile is private');
      }

      // Increment view count
      if (currentUserId && currentUserId.toString() !== userId.toString()) {
        await PublicProfile.updateOne(
          { userId },
          { $inc: { 'statistics.profileViews': 1 } }
        );
      }

      return profile;
    } catch (error) {
      console.error('Error getting profile:', error);
      throw error;
    }
  }

  /**
   * Get profile by slug
   */
  async getProfileBySlug(slug) {
    try {
      const profile = await PublicProfile.findOne({ slug, isPublic: true })
        .populate('userId', 'name email')
        .lean();

      if (!profile) {
        throw new Error('Profile not found');
      }

      return profile;
    } catch (error) {
      console.error('Error getting profile by slug:', error);
      throw error;
    }
  }

  /**
   * Update my profile
   */
  async updateMyProfile(userId, updateData) {
    try {
      const profile = await PublicProfile.findOne({ userId });

      if (!profile) {
        // Create profile if doesn't exist
        return await this.createOrUpdateProfile(userId, updateData);
      }

      Object.assign(profile, updateData);
      profile.statistics.lastActiveAt = new Date();
      await profile.save();

      return {
        success: true,
        profile: await PublicProfile.findById(profile._id)
          .populate('userId', 'name email')
          .lean(),
      };
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  // ==================== PROFILE LISTINGS ====================

  /**
   * List public profiles
   */
  async listProfiles(options = {}) {
    try {
      const { limit = 20, skip = 0, sortBy = 'rating.average' } = options;

      const profiles = await PublicProfile.find({ isPublic: true })
        .sort({ [sortBy]: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name avatar')
        .lean();

      return profiles;
    } catch (error) {
      console.error('Error listing profiles:', error);
      throw error;
    }
  }

  /**
   * Get featured profiles
   */
  async getFeaturedProfiles(limit = 10) {
    try {
      const profiles = await PublicProfile.getFeatured(limit);
      return profiles;
    } catch (error) {
      console.error('Error getting featured profiles:', error);
      throw error;
    }
  }

  /**
   * Get top referrers
   */
  async getTopReferrers(limit = 10) {
    try {
      const profiles = await PublicProfile.getTopReferrers(limit);
      return profiles;
    } catch (error) {
      console.error('Error getting top referrers:', error);
      throw error;
    }
  }

  /**
   * Search profiles
   */
  async searchProfiles(query, options = {}) {
    try {
      const profiles = await PublicProfile.search(query, options);
      return profiles;
    } catch (error) {
      console.error('Error searching profiles:', error);
      throw error;
    }
  }

  /**
   * Get profiles by industry
   */
  async getProfilesByIndustry(industry, limit = 20, skip = 0) {
    try {
      const profiles = await PublicProfile.getByIndustry(industry, limit, skip);
      return profiles;
    } catch (error) {
      console.error('Error getting profiles by industry:', error);
      throw error;
    }
  }

  // ==================== PORTFOLIO MANAGEMENT ====================

  /**
   * Add portfolio item
   */
  async addPortfolioItem(userId, itemData) {
    try {
      const profile = await PublicProfile.findOne({ userId });

      if (!profile) {
        throw new Error('Profile not found');
      }

      const item = profile.addPortfolioItem(itemData);
      await profile.save();

      return {
        success: true,
        item,
      };
    } catch (error) {
      console.error('Error adding portfolio item:', error);
      throw error;
    }
  }

  /**
   * Update portfolio item
   */
  async updatePortfolioItem(userId, itemId, updateData) {
    try {
      const profile = await PublicProfile.findOne({ userId });

      if (!profile) {
        throw new Error('Profile not found');
      }

      const item = profile.portfolio.id(itemId);
      if (!item) {
        throw new Error('Portfolio item not found');
      }

      Object.assign(item, updateData);
      await profile.save();

      return {
        success: true,
        item,
      };
    } catch (error) {
      console.error('Error updating portfolio item:', error);
      throw error;
    }
  }

  /**
   * Remove portfolio item
   */
  async removePortfolioItem(userId, itemId) {
    try {
      const profile = await PublicProfile.findOne({ userId });

      if (!profile) {
        throw new Error('Profile not found');
      }

      const success = profile.removePortfolioItem(itemId);
      if (!success) {
        throw new Error('Portfolio item not found');
      }

      await profile.save();

      return { success: true };
    } catch (error) {
      console.error('Error removing portfolio item:', error);
      throw error;
    }
  }

  // ==================== SKILLS MANAGEMENT ====================

  /**
   * Add skill
   */
  async addSkill(userId, skillName, level = 'intermediate') {
    try {
      const profile = await PublicProfile.findOne({ userId });

      if (!profile) {
        throw new Error('Profile not found');
      }

      const skill = profile.addSkill(skillName, level);
      await profile.save();

      return {
        success: true,
        skill,
      };
    } catch (error) {
      console.error('Error adding skill:', error);
      throw error;
    }
  }

  /**
   * Remove skill
   */
  async removeSkill(userId, skillName) {
    try {
      const profile = await PublicProfile.findOne({ userId });

      if (!profile) {
        throw new Error('Profile not found');
      }

      profile.skills = profile.skills.filter(
        s => s.name.toLowerCase() !== skillName.toLowerCase()
      );
      await profile.save();

      return { success: true };
    } catch (error) {
      console.error('Error removing skill:', error);
      throw error;
    }
  }

  /**
   * Endorse skill
   */
  async endorseSkill(profileUserId, skillName, endorsedByUserId) {
    try {
      const profile = await PublicProfile.findOne({ userId: profileUserId });

      if (!profile) {
        throw new Error('Profile not found');
      }

      const success = profile.endorseSkill(skillName);
      if (!success) {
        throw new Error('Skill not found');
      }

      await profile.save();

      // Notify profile owner
      await this.notificationService.create({
        userId: profileUserId,
        type: 'skill_endorsed',
        title: 'Skill Endorsed',
        message: `Someone endorsed your skill: ${skillName}`,
        data: { skillName, endorsedBy: endorsedByUserId },
      });

      return { success: true };
    } catch (error) {
      console.error('Error endorsing skill:', error);
      throw error;
    }
  }

  // ==================== REVIEWS ====================

  /**
   * Add review
   */
  async addReview(reviewerId, reviewData) {
    try {
      // Check if reviewer can review (e.g., had a successful referral)
      const canReview = await this.canReview(reviewerId, reviewData.revieweeId, reviewData.category);
      
      if (!canReview.allowed) {
        throw new Error(canReview.reason);
      }

      const review = new Review({
        reviewerId,
        revieweeId: reviewData.revieweeId,
        revieweeType: reviewData.revieweeType,
        rating: reviewData.rating,
        title: reviewData.title,
        content: reviewData.content,
        category: reviewData.category,
        wouldRecommend: reviewData.wouldRecommend,
        // Add category-specific details
        ...(reviewData.category === REVIEW_CATEGORIES.REFERRER && {
          referrerDetails: reviewData.referrerDetails,
        }),
        ...(reviewData.category === REVIEW_CATEGORIES.COMPANY && {
          companyDetails: reviewData.companyDetails,
        }),
        ...(reviewData.category === REVIEW_CATEGORIES.JOB && {
          jobDetails: reviewData.jobDetails,
        }),
      });

      await review.save();

      // Add review reference to profile
      if (reviewData.revieweeType === 'user') {
        const profile = await PublicProfile.findOne({ userId: reviewData.revieweeId });
        if (profile) {
          profile.addReview(review._id, reviewerId, reviewData.rating);
          await profile.save();
        }
      }

      // Notify reviewee
      await this.notificationService.create({
        userId: reviewData.revieweeId,
        type: 'new_review',
        title: 'New Review Received',
        message: 'Someone left a review for you',
        data: { reviewId: review._id, rating: reviewData.rating },
      });

      return {
        success: true,
        review: await Review.findById(review._id)
          .populate('reviewerId', 'name avatar')
          .lean(),
      };
    } catch (error) {
      console.error('Error adding review:', error);
      throw error;
    }
  }

  /**
   * Check if user can review
   */
  async canReview(reviewerId, revieweeId, category) {
    try {
      // Prevent self-review
      if (reviewerId.toString() === revieweeId.toString()) {
        return { allowed: false, reason: 'Cannot review yourself' };
      }

      // Check for existing review
      const existingReview = await Review.findOne({
        reviewerId,
        revieweeId,
        category,
      });

      if (existingReview) {
        return { allowed: false, reason: 'You have already reviewed this' };
      }

      // For referrer reviews, check if they had a successful referral
      if (category === REVIEW_CATEGORIES.REFERRER) {
        const referral = await Referral.findOne({
          referrerId: revieweeId,
          candidateId: reviewerId,
          status: 'hired',
        });

        if (!referral) {
          return { allowed: false, reason: 'Can only review after a successful hire' };
        }
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking review eligibility:', error);
      return { allowed: false, reason: 'Error checking eligibility' };
    }
  }

  /**
   * Get reviews for user
   */
  async getReviewsForUser(userId, options = {}) {
    try {
      const reviews = await Review.getForReviewee(userId, options);
      return reviews;
    } catch (error) {
      console.error('Error getting reviews:', error);
      throw error;
    }
  }

  /**
   * Get reviews by user
   */
  async getReviewsByUser(userId, options = {}) {
    try {
      const reviews = await Review.getByReviewer(userId, options);
      return reviews;
    } catch (error) {
      console.error('Error getting reviews by user:', error);
      throw error;
    }
  }

  /**
   * Vote review as helpful
   */
  async voteReviewHelpful(reviewId, userId, isHelpful = true) {
    try {
      const review = await Review.findById(reviewId);

      if (!review) {
        throw new Error('Review not found');
      }

      review.voteHelpful(userId, isHelpful);
      await review.save();

      return {
        success: true,
        helpfulCount: review.helpfulCount,
        notHelpfulCount: review.notHelpfulCount,
      };
    } catch (error) {
      console.error('Error voting review:', error);
      throw error;
    }
  }

  /**
   * Get review summary for user
   */
  async getReviewSummary(userId) {
    try {
      const summary = await Review.getAverageRating(userId, 'user');
      return summary;
    } catch (error) {
      console.error('Error getting review summary:', error);
      throw error;
    }
  }

  // ==================== AVAILABILITY ====================

  /**
   * Update availability
   */
  async updateAvailability(userId, availabilityData) {
    try {
      const profile = await PublicProfile.findOne({ userId });

      if (!profile) {
        throw new Error('Profile not found');
      }

      profile.availability = {
        ...profile.availability,
        ...availabilityData,
      };
      await profile.save();

      return { success: true };
    } catch (error) {
      console.error('Error updating availability:', error);
      throw error;
    }
  }

  // ==================== STATISTICS ====================

  /**
   * Update profile statistics
   */
  async updateStatistics(userId, updates) {
    try {
      const profile = await PublicProfile.findOne({ userId });

      if (!profile) {
        throw new Error('Profile not found');
      }

      profile.updateStatistics(updates);
      await profile.save();

      return { success: true };
    } catch (error) {
      console.error('Error updating statistics:', error);
      throw error;
    }
  }

  /**
   * Sync statistics from referrals
   */
  async syncStatisticsFromReferrals(userId) {
    try {
      // Get referral stats
      const referralStats = await Referral.aggregate([
        { $match: { referrerId: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            totalReferrals: { $sum: 1 },
            successfulHires: {
              $sum: { $cond: [{ $eq: ['$status', 'hired'] }, 1, 0] },
            },
            totalEarnings: {
              $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$rewardAmount', 0] },
            },
          },
        },
      ]);

      if (referralStats.length > 0) {
        const stats = referralStats[0];
        await PublicProfile.updateOne(
          { userId },
          {
            $set: {
              'statistics.totalReferrals': stats.totalReferrals,
              'statistics.successfulHires': stats.successfulHires,
              'statistics.totalEarnings': stats.totalEarnings,
            },
          }
        );
      }

      return { success: true };
    } catch (error) {
      console.error('Error syncing statistics:', error);
      throw error;
    }
  }

  // ==================== ADMIN FEATURES ====================

  /**
   * Feature profile (admin only)
   */
  async featureProfile(userId, order = 0, until = null) {
    try {
      const profile = await PublicProfile.findOne({ userId });

      if (!profile) {
        throw new Error('Profile not found');
      }

      profile.feature(order, until);
      await profile.save();

      return { success: true };
    } catch (error) {
      console.error('Error featuring profile:', error);
      throw error;
    }
  }

  /**
   * Unfeature profile (admin only)
   */
  async unfeatureProfile(userId) {
    try {
      const profile = await PublicProfile.findOne({ userId });

      if (!profile) {
        throw new Error('Profile not found');
      }

      profile.unfeature();
      await profile.save();

      return { success: true };
    } catch (error) {
      console.error('Error unfeaturing profile:', error);
      throw error;
    }
  }

  /**
   * Verify profile (admin only)
   */
  async verifyProfile(userId) {
    try {
      await PublicProfile.updateOne(
        { userId },
        {
          $set: {
            isVerified: true,
            verifiedAt: new Date(),
          },
        }
      );

      return { success: true };
    } catch (error) {
      console.error('Error verifying profile:', error);
      throw error;
    }
  }
}

module.exports = PublicProfileService;