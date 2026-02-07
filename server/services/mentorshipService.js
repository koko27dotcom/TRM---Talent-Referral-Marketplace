/**
 * MentorshipService
 * Manages mentor/mentee matching, session scheduling, and progress tracking
 */

const {
  MentorshipMatch,
  MATCH_STATUS,
  SESSION_STATUS,
  GOAL_STATUS,
} = require('../models/MentorshipMatch.js');
const { PublicProfile } = require('../models/PublicProfile.js');
const NotificationService = require('./notificationService.js');

class MentorshipService {
  constructor() {
    this.notificationService = new NotificationService();
  }

  // ==================== MENTOR DISCOVERY ====================

  /**
   * Find available mentors
   */
  async findMentors(filters = {}, limit = 20, skip = 0) {
    try {
      const mentors = await PublicProfile.getAvailableMentors(filters, limit, skip);
      return mentors;
    } catch (error) {
      console.error('Error finding mentors:', error);
      throw error;
    }
  }

  /**
   * Search mentors
   */
  async searchMentors(query, filters = {}, limit = 20, skip = 0) {
    try {
      const searchResults = await PublicProfile.search(query, {
        limit,
        skip,
        filters: {
          ...filters,
          availableForMentorship: true,
        },
      });
      return searchResults;
    } catch (error) {
      console.error('Error searching mentors:', error);
      throw error;
    }
  }

  /**
   * Get mentor details
   */
  async getMentorDetails(mentorId) {
    try {
      const profile = await PublicProfile.findOne({
        userId: mentorId,
        'mentorship.isAvailable': true,
        isPublic: true,
      })
        .populate('userId', 'name email')
        .lean();

      if (!profile) {
        throw new Error('Mentor not found or not available');
      }

      // Get active mentorship count
      const activeMentorships = await MentorshipMatch.countDocuments({
        mentorId,
        status: MATCH_STATUS.ACTIVE,
      });

      return {
        ...profile,
        activeMentorships,
        isAcceptingMentees: activeMentorships < (profile.mentorship?.maxMentees || 3),
      };
    } catch (error) {
      console.error('Error getting mentor details:', error);
      throw error;
    }
  }

  // ==================== MENTORSHIP REQUESTS ====================

  /**
   * Request mentorship
   */
  async requestMentorship(mentorId, menteeId, requestData) {
    try {
      // Check if mentor exists and is available
      const mentorProfile = await PublicProfile.findOne({
        userId: mentorId,
        'mentorship.isAvailable': true,
      });

      if (!mentorProfile) {
        throw new Error('Mentor not found or not available');
      }

      // Check if mentor has capacity
      const activeMentorships = await MentorshipMatch.countDocuments({
        mentorId,
        status: MATCH_STATUS.ACTIVE,
      });

      if (activeMentorships >= mentorProfile.mentorship.maxMentees) {
        throw new Error('Mentor is currently at capacity');
      }

      // Check for existing match
      const existingMatch = await MentorshipMatch.findOne({
        mentorId,
        menteeId,
        status: { $in: [MATCH_STATUS.PENDING, MATCH_STATUS.ACTIVE] },
      });

      if (existingMatch) {
        throw new Error(existingMatch.status === MATCH_STATUS.PENDING
          ? 'Mentorship request already pending'
          : 'Active mentorship already exists');
      }

      // Create mentorship match
      const match = new MentorshipMatch({
        mentorId,
        menteeId,
        requestMessage: requestData.message,
        focusAreas: requestData.focusAreas || [],
        goals: requestData.goals?.map(goal => ({
          title: goal,
          status: GOAL_STATUS.ACTIVE,
          createdBy: menteeId,
        })) || [],
        expectedDuration: requestData.expectedDuration || 12,
        status: MATCH_STATUS.PENDING,
      });

      await match.save();

      // Notify mentor
      await this.notificationService.create({
        userId: mentorId,
        type: 'mentorship_request',
        title: 'New Mentorship Request',
        message: 'Someone has requested mentorship from you',
        data: { matchId: match._id, menteeId },
      });

      return {
        success: true,
        match: await MentorshipMatch.findById(match._id)
          .populate('menteeId', 'name avatar')
          .lean(),
      };
    } catch (error) {
      console.error('Error requesting mentorship:', error);
      throw error;
    }
  }

  /**
   * Accept mentorship request
   */
  async acceptMentorship(matchId, mentorId, responseMessage = '') {
    try {
      const match = await MentorshipMatch.findOne({
        _id: matchId,
        mentorId,
        status: MATCH_STATUS.PENDING,
      });

      if (!match) {
        throw new Error('Mentorship request not found');
      }

      match.accept(responseMessage);
      await match.save();

      // Update mentor's current mentees count
      await PublicProfile.updateOne(
        { userId: mentorId },
        { $inc: { 'mentorship.currentMentees': 1 } }
      );

      // Notify mentee
      await this.notificationService.create({
        userId: match.menteeId,
        type: 'mentorship_accepted',
        title: 'Mentorship Request Accepted!',
        message: 'Your mentorship request has been accepted',
        data: { matchId: match._id, mentorId },
      });

      return {
        success: true,
        match: await MentorshipMatch.findById(matchId)
          .populate('mentorId', 'name avatar')
          .populate('menteeId', 'name avatar')
          .lean(),
      };
    } catch (error) {
      console.error('Error accepting mentorship:', error);
      throw error;
    }
  }

  /**
   * Decline mentorship request
   */
  async declineMentorship(matchId, mentorId, responseMessage = '') {
    try {
      const match = await MentorshipMatch.findOne({
        _id: matchId,
        mentorId,
        status: MATCH_STATUS.PENDING,
      });

      if (!match) {
        throw new Error('Mentorship request not found');
      }

      match.decline(responseMessage);
      await match.save();

      // Notify mentee
      await this.notificationService.create({
        userId: match.menteeId,
        type: 'mentorship_declined',
        title: 'Mentorship Request Declined',
        message: 'Your mentorship request was not accepted at this time',
        data: { matchId: match._id, mentorId },
      });

      return { success: true };
    } catch (error) {
      console.error('Error declining mentorship:', error);
      throw error;
    }
  }

  // ==================== MENTORSHIP MANAGEMENT ====================

  /**
   * Get mentorship details
   */
  async getMentorshipDetails(matchId, userId) {
    try {
      const match = await MentorshipMatch.findById(matchId)
        .populate('mentorId', 'name avatar email')
        .populate('menteeId', 'name avatar email')
        .populate('goals.createdBy', 'name avatar')
        .populate('sessions.scheduledBy', 'name avatar')
        .populate('messages.senderId', 'name avatar');

      if (!match) {
        throw new Error('Mentorship not found');
      }

      // Verify user is part of this mentorship
      if (match.mentorId._id.toString() !== userId.toString() &&
          match.menteeId._id.toString() !== userId.toString()) {
        throw new Error('Unauthorized');
      }

      return match.toObject();
    } catch (error) {
      console.error('Error getting mentorship details:', error);
      throw error;
    }
  }

  /**
   * Get user's mentorships
   */
  async getUserMentorships(userId, role = null) {
    try {
      const mentorships = await MentorshipMatch.getActiveForUser(userId, role);
      return mentorships;
    } catch (error) {
      console.error('Error getting user mentorships:', error);
      throw error;
    }
  }

  /**
   * Get pending requests
   */
  async getPendingRequests(userId, asMentor = true) {
    try {
      const requests = await MentorshipMatch.getPendingRequests(userId, asMentor);
      return requests;
    } catch (error) {
      console.error('Error getting pending requests:', error);
      throw error;
    }
  }

  /**
   * Complete mentorship
   */
  async completeMentorship(matchId, userId) {
    try {
      const match = await MentorshipMatch.findOne({
        _id: matchId,
        $or: [{ mentorId: userId }, { menteeId: userId }],
        status: MATCH_STATUS.ACTIVE,
      });

      if (!match) {
        throw new Error('Active mentorship not found');
      }

      match.complete();
      await match.save();

      // Update mentor's current mentees count
      await PublicProfile.updateOne(
        { userId: match.mentorId },
        { $inc: { 'mentorship.currentMentees': -1 } }
      );

      // Notify other party
      const otherPartyId = match.mentorId.toString() === userId.toString()
        ? match.menteeId
        : match.mentorId;

      await this.notificationService.create({
        userId: otherPartyId,
        type: 'mentorship_completed',
        title: 'Mentorship Completed',
        message: 'Your mentorship program has been completed',
        data: { matchId },
      });

      return { success: true };
    } catch (error) {
      console.error('Error completing mentorship:', error);
      throw error;
    }
  }

  /**
   * Cancel mentorship
   */
  async cancelMentorship(matchId, userId, reason) {
    try {
      const match = await MentorshipMatch.findOne({
        _id: matchId,
        $or: [{ mentorId: userId }, { menteeId: userId }],
        status: { $in: [MATCH_STATUS.PENDING, MATCH_STATUS.ACTIVE] },
      });

      if (!match) {
        throw new Error('Mentorship not found');
      }

      match.cancel(reason, userId);
      await match.save();

      // If active, update mentor's count
      if (match.status === MATCH_STATUS.ACTIVE) {
        await PublicProfile.updateOne(
          { userId: match.mentorId },
          { $inc: { 'mentorship.currentMentees': -1 } }
        );
      }

      // Notify other party
      const otherPartyId = match.mentorId.toString() === userId.toString()
        ? match.menteeId
        : match.mentorId;

      await this.notificationService.create({
        userId: otherPartyId,
        type: 'mentorship_cancelled',
        title: 'Mentorship Cancelled',
        message: `The mentorship was cancelled. Reason: ${reason}`,
        data: { matchId, reason },
      });

      return { success: true };
    } catch (error) {
      console.error('Error cancelling mentorship:', error);
      throw error;
    }
  }

  // ==================== GOAL MANAGEMENT ====================

  /**
   * Add goal to mentorship
   */
  async addGoal(matchId, userId, goalData) {
    try {
      const match = await MentorshipMatch.findOne({
        _id: matchId,
        $or: [{ mentorId: userId }, { menteeId: userId }],
        status: MATCH_STATUS.ACTIVE,
      });

      if (!match) {
        throw new Error('Active mentorship not found');
      }

      const goal = match.addGoal(
        goalData.title,
        goalData.description,
        goalData.targetDate,
        userId
      );

      await match.save();

      // Notify other party
      const otherPartyId = match.mentorId.toString() === userId.toString()
        ? match.menteeId
        : match.mentorId;

      await this.notificationService.create({
        userId: otherPartyId,
        type: 'goal_added',
        title: 'New Goal Added',
        message: `A new goal was added: ${goalData.title}`,
        data: { matchId, goalId: goal._id },
      });

      return {
        success: true,
        goal,
      };
    } catch (error) {
      console.error('Error adding goal:', error);
      throw error;
    }
  }

  /**
   * Complete a goal
   */
  async completeGoal(matchId, goalId, userId) {
    try {
      const match = await MentorshipMatch.findOne({
        _id: matchId,
        $or: [{ mentorId: userId }, { menteeId: userId }],
        status: MATCH_STATUS.ACTIVE,
      });

      if (!match) {
        throw new Error('Active mentorship not found');
      }

      const success = match.completeGoal(goalId);
      if (!success) {
        throw new Error('Goal not found');
      }

      await match.save();

      // Notify other party
      const otherPartyId = match.mentorId.toString() === userId.toString()
        ? match.menteeId
        : match.mentorId;

      await this.notificationService.create({
        userId: otherPartyId,
        type: 'goal_completed',
        title: 'Goal Completed!',
        message: 'A goal has been marked as completed',
        data: { matchId, goalId },
      });

      return { success: true };
    } catch (error) {
      console.error('Error completing goal:', error);
      throw error;
    }
  }

  // ==================== SESSION MANAGEMENT ====================

  /**
   * Schedule a session
   */
  async scheduleSession(matchId, userId, sessionData) {
    try {
      const match = await MentorshipMatch.findOne({
        _id: matchId,
        $or: [{ mentorId: userId }, { menteeId: userId }],
        status: MATCH_STATUS.ACTIVE,
      });

      if (!match) {
        throw new Error('Active mentorship not found');
      }

      const session = match.scheduleSession({
        ...sessionData,
        scheduledBy: userId,
      });

      await match.save();

      // Notify other party
      const otherPartyId = match.mentorId.toString() === userId.toString()
        ? match.menteeId
        : match.mentorId;

      await this.notificationService.create({
        userId: otherPartyId,
        type: 'session_scheduled',
        title: 'New Session Scheduled',
        message: `A session has been scheduled for ${new Date(sessionData.scheduledAt).toLocaleDateString()}`,
        data: { matchId, sessionId: session._id },
      });

      return {
        success: true,
        session,
      };
    } catch (error) {
      console.error('Error scheduling session:', error);
      throw error;
    }
  }

  /**
   * Confirm a session
   */
  async confirmSession(matchId, sessionId, userId) {
    try {
      const match = await MentorshipMatch.findOne({
        _id: matchId,
        $or: [{ mentorId: userId }, { menteeId: userId }],
        status: MATCH_STATUS.ACTIVE,
      });

      if (!match) {
        throw new Error('Active mentorship not found');
      }

      const success = match.confirmSession(sessionId, userId);
      if (!success) {
        throw new Error('Session not found or already confirmed');
      }

      await match.save();

      return { success: true };
    } catch (error) {
      console.error('Error confirming session:', error);
      throw error;
    }
  }

  /**
   * Complete a session
   */
  async completeSession(matchId, sessionId, userId) {
    try {
      const match = await MentorshipMatch.findOne({
        _id: matchId,
        $or: [{ mentorId: userId }, { menteeId: userId }],
        status: MATCH_STATUS.ACTIVE,
      });

      if (!match) {
        throw new Error('Active mentorship not found');
      }

      const success = match.completeSession(sessionId);
      if (!success) {
        throw new Error('Session not found');
      }

      await match.save();

      return { success: true };
    } catch (error) {
      console.error('Error completing session:', error);
      throw error;
    }
  }

  // ==================== MESSAGING ====================

  /**
   * Send message in mentorship
   */
  async sendMessage(matchId, userId, content, attachments = []) {
    try {
      const match = await MentorshipMatch.findOne({
        _id: matchId,
        $or: [{ mentorId: userId }, { menteeId: userId }],
        status: { $in: [MATCH_STATUS.ACTIVE, MATCH_STATUS.PENDING] },
      });

      if (!match) {
        throw new Error('Mentorship not found');
      }

      const message = match.sendMessage(userId, content, attachments);
      await match.save();

      // Notify other party
      const otherPartyId = match.mentorId.toString() === userId.toString()
        ? match.menteeId
        : match.mentorId;

      await this.notificationService.create({
        userId: otherPartyId,
        type: 'mentorship_message',
        title: 'New Mentorship Message',
        message: 'You have a new message in your mentorship',
        data: { matchId, messageId: message._id },
      });

      return {
        success: true,
        message,
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(matchId, userId) {
    try {
      const match = await MentorshipMatch.findOne({
        _id: matchId,
        $or: [{ mentorId: userId }, { menteeId: userId }],
      });

      if (!match) {
        throw new Error('Mentorship not found');
      }

      match.markMessagesAsRead(userId);
      await match.save();

      return { success: true };
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  // ==================== RATING & FEEDBACK ====================

  /**
   * Submit mentorship rating
   */
  async submitRating(matchId, userId, rating, feedback) {
    try {
      const match = await MentorshipMatch.findOne({
        _id: matchId,
        $or: [{ mentorId: userId }, { menteeId: userId }],
        status: MATCH_STATUS.COMPLETED,
      });

      if (!match) {
        throw new Error('Completed mentorship not found');
      }

      const success = match.submitRating(userId, rating, feedback);
      if (!success) {
        throw new Error('Failed to submit rating');
      }

      await match.save();

      // If mentee rated, update mentor's public profile rating
      if (match.menteeId.toString() === userId.toString()) {
        await this.updateMentorRating(match.mentorId);
      }

      return { success: true };
    } catch (error) {
      console.error('Error submitting rating:', error);
      throw error;
    }
  }

  /**
   * Update mentor's rating based on all completed mentorships
   */
  async updateMentorRating(mentorId) {
    try {
      const completedMentorships = await MentorshipMatch.find({
        mentorId,
        status: MATCH_STATUS.COMPLETED,
        'rating.mentee.rating': { $exists: true },
      });

      if (completedMentorships.length === 0) return;

      const ratings = completedMentorships.map(m => m.rating.mentee.rating);
      const averageRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;

      await PublicProfile.updateOne(
        { userId: mentorId },
        { $set: { 'rating.average': Math.round(averageRating * 10) / 10 } }
      );
    } catch (error) {
      console.error('Error updating mentor rating:', error);
    }
  }

  // ==================== MENTOR PROFILE MANAGEMENT ====================

  /**
   * Enable mentorship on profile
   */
  async enableMentorship(userId, settings = {}) {
    try {
      const profile = await PublicProfile.findOne({ userId });

      if (!profile) {
        throw new Error('Public profile not found');
      }

      profile.enableMentorship(settings);
      await profile.save();

      return { success: true };
    } catch (error) {
      console.error('Error enabling mentorship:', error);
      throw error;
    }
  }

  /**
   * Disable mentorship on profile
   */
  async disableMentorship(userId) {
    try {
      const profile = await PublicProfile.findOne({ userId });

      if (!profile) {
        throw new Error('Public profile not found');
      }

      profile.disableMentorship();
      await profile.save();

      return { success: true };
    } catch (error) {
      console.error('Error disabling mentorship:', error);
      throw error;
    }
  }

  /**
   * Update mentorship settings
   */
  async updateMentorshipSettings(userId, settings) {
    try {
      const profile = await PublicProfile.findOne({ userId });

      if (!profile) {
        throw new Error('Public profile not found');
      }

      Object.assign(profile.mentorship, settings);
      await profile.save();

      return { success: true };
    } catch (error) {
      console.error('Error updating mentorship settings:', error);
      throw error;
    }
  }
}

module.exports = MentorshipService;