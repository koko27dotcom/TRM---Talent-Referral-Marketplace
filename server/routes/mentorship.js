/**
 * Mentorship Routes
 * Handles mentorship matching, sessions, and messaging
 */

const express = require('express');
const MentorshipService = require('../services/mentorshipService.js');
const { authenticate } = require('../middleware/auth.js');
const { asyncHandler, ValidationError, NotFoundError, ForbiddenError } = require('../middleware/errorHandler.js');

const router = express.Router();
const mentorshipService = new MentorshipService();

// ==================== MENTOR DISCOVERY ====================

/**
 * @route   GET /api/mentorship/mentors
 * @desc    Find available mentors
 * @access  Public
 */
router.get('/mentors', asyncHandler(async (req, res) => {
  const {
    expertise,
    industries,
    maxRate,
    location,
    limit = 20,
    skip = 0,
  } = req.query;
  
  const filters = {};
  if (expertise) filters.expertise = expertise.split(',');
  if (industries) filters.industries = industries.split(',');
  if (maxRate) filters.maxRate = parseInt(maxRate);
  if (location) filters.location = location;
  
  const mentors = await mentorshipService.findMentors(filters, parseInt(limit), parseInt(skip));
  
  res.json({
    success: true,
    data: mentors,
  });
}));

/**
 * @route   GET /api/mentorship/mentors/search
 * @desc    Search mentors
 * @access  Public
 */
router.get('/mentors/search', asyncHandler(async (req, res) => {
  const { q, expertise, industries, maxRate, limit = 20, skip = 0 } = req.query;
  
  if (!q) {
    throw new ValidationError('Search query is required');
  }
  
  const filters = {};
  if (expertise) filters.expertise = expertise.split(',');
  if (industries) filters.industries = industries.split(',');
  if (maxRate) filters.maxRate = parseInt(maxRate);
  
  const mentors = await mentorshipService.searchMentors(q, filters, parseInt(limit), parseInt(skip));
  
  res.json({
    success: true,
    data: mentors,
  });
}));

/**
 * @route   GET /api/mentorship/mentors/:id
 * @desc    Get mentor details
 * @access  Public
 */
router.get('/mentors/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const mentor = await mentorshipService.getMentorDetails(id);
  
  res.json({
    success: true,
    data: mentor,
  });
}));

// ==================== MENTORSHIP REQUESTS ====================

/**
 * @route   POST /api/mentorship/request
 * @desc    Request mentorship
 * @access  Private
 */
router.post('/request', authenticate, asyncHandler(async (req, res) => {
  const { mentorId, message, focusAreas, goals, expectedDuration } = req.body;
  
  if (!mentorId) {
    throw new ValidationError('Mentor ID is required');
  }
  
  // Prevent self-mentorship
  if (mentorId === req.user.id) {
    throw new ValidationError('Cannot request mentorship from yourself');
  }
  
  const result = await mentorshipService.requestMentorship(
    mentorId,
    req.user.id,
    {
      message,
      focusAreas: focusAreas || [],
      goals: goals || [],
      expectedDuration: expectedDuration || 12,
    }
  );
  
  res.status(201).json(result);
}));

/**
 * @route   GET /api/mentorship/requests
 * @desc    Get my mentorship requests
 * @access  Private
 */
router.get('/requests', authenticate, asyncHandler(async (req, res) => {
  const { asMentor = 'false' } = req.query;
  
  const requests = await mentorshipService.getPendingRequests(
    req.user.id,
    asMentor === 'true'
  );
  
  res.json({
    success: true,
    data: requests,
  });
}));

/**
 * @route   POST /api/mentorship/requests/:id/accept
 * @desc    Accept mentorship request
 * @access  Private (Mentor)
 */
router.post('/requests/:id/accept', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { responseMessage } = req.body;
  
  const result = await mentorshipService.acceptMentorship(id, req.user.id, responseMessage);
  
  res.json(result);
}));

/**
 * @route   POST /api/mentorship/requests/:id/decline
 * @desc    Decline mentorship request
 * @access  Private (Mentor)
 */
router.post('/requests/:id/decline', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { responseMessage } = req.body;
  
  await mentorshipService.declineMentorship(id, req.user.id, responseMessage);
  
  res.json({ success: true, message: 'Request declined' });
}));

// ==================== ACTIVE MENTORSHIPS ====================

/**
 * @route   GET /api/mentorship/matches
 * @desc    Get my mentorship matches
 * @access  Private
 */
router.get('/matches', authenticate, asyncHandler(async (req, res) => {
  const { role } = req.query;
  
  const matches = await mentorshipService.getUserMentorships(req.user.id, role);
  
  res.json({
    success: true,
    data: matches,
  });
}));

/**
 * @route   GET /api/mentorship/matches/:id
 * @desc    Get mentorship details
 * @access  Private (Participant)
 */
router.get('/matches/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const match = await mentorshipService.getMentorshipDetails(id, req.user.id);
  
  res.json({
    success: true,
    data: match,
  });
}));

/**
 * @route   POST /api/mentorship/matches/:id/complete
 * @desc    Complete mentorship
 * @access  Private (Participant)
 */
router.post('/matches/:id/complete', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  await mentorshipService.completeMentorship(id, req.user.id);
  
  res.json({ success: true, message: 'Mentorship completed' });
}));

/**
 * @route   POST /api/mentorship/matches/:id/cancel
 * @desc    Cancel mentorship
 * @access  Private (Participant)
 */
router.post('/matches/:id/cancel', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  
  await mentorshipService.cancelMentorship(id, req.user.id, reason);
  
  res.json({ success: true, message: 'Mentorship cancelled' });
}));

// ==================== GOALS ====================

/**
 * @route   POST /api/mentorship/matches/:id/goals
 * @desc    Add goal to mentorship
 * @access  Private (Participant)
 */
router.post('/matches/:id/goals', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, targetDate } = req.body;
  
  if (!title) {
    throw new ValidationError('Goal title is required');
  }
  
  const result = await mentorshipService.addGoal(id, req.user.id, {
    title,
    description,
    targetDate: targetDate ? new Date(targetDate) : null,
  });
  
  res.status(201).json(result);
}));

/**
 * @route   POST /api/mentorship/matches/:id/goals/:goalId/complete
 * @desc    Complete a goal
 * @access  Private (Participant)
 */
router.post('/matches/:id/goals/:goalId/complete', authenticate, asyncHandler(async (req, res) => {
  const { id, goalId } = req.params;
  
  await mentorshipService.completeGoal(id, goalId, req.user.id);
  
  res.json({ success: true, message: 'Goal marked as completed' });
}));

// ==================== SESSIONS ====================

/**
 * @route   POST /api/mentorship/matches/:id/sessions
 * @desc    Schedule a session
 * @access  Private (Participant)
 */
router.post('/matches/:id/sessions', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, scheduledAt, duration, format, meetingLink } = req.body;
  
  if (!title || !scheduledAt) {
    throw new ValidationError('Title and scheduled date are required');
  }
  
  const result = await mentorshipService.scheduleSession(id, req.user.id, {
    title,
    description,
    scheduledAt: new Date(scheduledAt),
    duration: duration || 60,
    format: format || 'video',
    meetingLink,
  });
  
  res.status(201).json(result);
}));

/**
 * @route   POST /api/mentorship/matches/:id/sessions/:sessionId/confirm
 * @desc    Confirm a session
 * @access  Private (Participant)
 */
router.post('/matches/:id/sessions/:sessionId/confirm', authenticate, asyncHandler(async (req, res) => {
  const { id, sessionId } = req.params;
  
  await mentorshipService.confirmSession(id, sessionId, req.user.id);
  
  res.json({ success: true, message: 'Session confirmed' });
}));

/**
 * @route   POST /api/mentorship/matches/:id/sessions/:sessionId/complete
 * @desc    Complete a session
 * @access  Private (Participant)
 */
router.post('/matches/:id/sessions/:sessionId/complete', authenticate, asyncHandler(async (req, res) => {
  const { id, sessionId } = req.params;
  
  await mentorshipService.completeSession(id, sessionId, req.user.id);
  
  res.json({ success: true, message: 'Session completed' });
}));

// ==================== MESSAGING ====================

/**
 * @route   POST /api/mentorship/matches/:id/message
 * @desc    Send message in mentorship
 * @access  Private (Participant)
 */
router.post('/matches/:id/message', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content, attachments } = req.body;
  
  if (!content) {
    throw new ValidationError('Message content is required');
  }
  
  const result = await mentorshipService.sendMessage(id, req.user.id, content, attachments);
  
  res.status(201).json(result);
}));

/**
 * @route   POST /api/mentorship/matches/:id/messages/read
 * @desc    Mark messages as read
 * @access  Private (Participant)
 */
router.post('/matches/:id/messages/read', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  await mentorshipService.markMessagesAsRead(id, req.user.id);
  
  res.json({ success: true, message: 'Messages marked as read' });
}));

// ==================== RATING ====================

/**
 * @route   POST /api/mentorship/matches/:id/rate
 * @desc    Rate mentorship
 * @access  Private (Participant)
 */
router.post('/matches/:id/rate', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, feedback } = req.body;
  
  if (!rating || rating < 1 || rating > 5) {
    throw new ValidationError('Rating must be between 1 and 5');
  }
  
  await mentorshipService.submitRating(id, req.user.id, rating, feedback);
  
  res.json({ success: true, message: 'Rating submitted successfully' });
}));

// ==================== MENTOR PROFILE MANAGEMENT ====================

/**
 * @route   POST /api/mentorship/profile/enable
 * @desc    Enable mentorship on profile
 * @access  Private
 */
router.post('/profile/enable', authenticate, asyncHandler(async (req, res) => {
  const {
    rate,
    sessionDuration,
    maxMentees,
    topics,
    approach,
    expectations,
    availabilitySlots,
  } = req.body;
  
  await mentorshipService.enableMentorship(req.user.id, {
    rate,
    sessionDuration,
    maxMentees,
    topics,
    approach,
    expectations,
    availabilitySlots,
  });
  
  res.json({ success: true, message: 'Mentorship enabled' });
}));

/**
 * @route   POST /api/mentorship/profile/disable
 * @desc    Disable mentorship on profile
 * @access  Private
 */
router.post('/profile/disable', authenticate, asyncHandler(async (req, res) => {
  await mentorshipService.disableMentorship(req.user.id);
  
  res.json({ success: true, message: 'Mentorship disabled' });
}));

/**
 * @route   PUT /api/mentorship/profile/settings
 * @desc    Update mentorship settings
 * @access  Private
 */
router.put('/profile/settings', authenticate, asyncHandler(async (req, res) => {
  const settings = req.body;
  
  await mentorshipService.updateMentorshipSettings(req.user.id, settings);
  
  res.json({ success: true, message: 'Settings updated' });
}));

module.exports = router;