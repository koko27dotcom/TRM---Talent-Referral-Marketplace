/**
 * Events Routes
 * Handles event management, registration, and calendar integration
 */

const express = require('express');
const EventService = require('../services/eventService.js');
const { authenticate } = require('../middleware/auth.js');
const { asyncHandler, ValidationError, NotFoundError, ForbiddenError } = require('../middleware/errorHandler.js');

const router = express.Router();
const eventService = new EventService();

// ==================== EVENT LISTINGS ====================

/**
 * @route   GET /api/events
 * @desc    List events with filters
 * @access  Public
 */
router.get('/', asyncHandler(async (req, res) => {
  const { type, format, category, limit = 20, skip = 0 } = req.query;
  
  const filters = {};
  if (type) filters.type = type;
  if (format) filters.format = format;
  if (category) filters.category = category;
  
  const events = await eventService.getUpcomingEvents(filters, parseInt(limit), parseInt(skip));
  
  res.json({
    success: true,
    data: events,
    pagination: {
      limit: parseInt(limit),
      skip: parseInt(skip),
    },
  });
}));

/**
 * @route   GET /api/events/my-events
 * @desc    Get user's registered events
 * @access  Private
 */
router.get('/my-events', authenticate, asyncHandler(async (req, res) => {
  const { status } = req.query;
  
  const events = await eventService.getUserEvents(req.user.id, status);
  
  res.json({
    success: true,
    data: events,
  });
}));

/**
 * @route   GET /api/events/search
 * @desc    Search events
 * @access  Public
 */
router.get('/search', asyncHandler(async (req, res) => {
  const { q, type, format, limit = 20, skip = 0 } = req.query;
  
  if (!q) {
    throw new ValidationError('Search query is required');
  }
  
  const events = await eventService.searchEvents(q, {
    limit: parseInt(limit),
    skip: parseInt(skip),
    filters: { type, format },
  });
  
  res.json({
    success: true,
    data: events,
  });
}));

// ==================== EVENT MANAGEMENT ====================

/**
 * @route   POST /api/events
 * @desc    Create a new event
 * @access  Private
 */
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const {
    title,
    description,
    type,
    format,
    startDate,
    endDate,
    location,
    virtualDetails,
    maxAttendees,
    speakers,
    agenda,
    categories,
    tags,
    isPublic,
  } = req.body;
  
  if (!title || !description || !type || !format || !startDate || !endDate) {
    throw new ValidationError('Required fields: title, description, type, format, startDate, endDate');
  }
  
  const result = await eventService.createEvent({
    title,
    description,
    type,
    format,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    location,
    virtualDetails,
    maxAttendees: maxAttendees || 100,
    speakers,
    agenda,
    categories,
    tags,
    isPublic: isPublic !== false,
  }, req.user.id);
  
  res.status(201).json(result);
}));

/**
 * @route   GET /api/events/:id
 * @desc    Get event details
 * @access  Public
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  
  const event = await eventService.getEventById(id, userId);
  
  res.json({
    success: true,
    data: event,
  });
}));

/**
 * @route   PUT /api/events/:id
 * @desc    Update an event
 * @access  Private (Organizer)
 */
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  
  const result = await eventService.updateEvent(id, updateData, req.user.id);
  
  res.json(result);
}));

/**
 * @route   DELETE /api/events/:id
 * @desc    Cancel an event
 * @access  Private (Organizer)
 */
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  
  await eventService.cancelEvent(id, req.user.id, reason);
  
  res.json({ success: true, message: 'Event cancelled successfully' });
}));

/**
 * @route   POST /api/events/:id/publish
 * @desc    Publish an event
 * @access  Private (Organizer)
 */
router.post('/:id/publish', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await eventService.publishEvent(id, req.user.id);
  
  res.json(result);
}));

// ==================== REGISTRATION ====================

/**
 * @route   POST /api/events/:id/register
 * @desc    Register for an event
 * @access  Private
 */
router.post('/:id/register', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await eventService.registerForEvent(id, req.user.id);
  
  res.json(result);
}));

/**
 * @route   POST /api/events/:id/cancel
 * @desc    Cancel registration
 * @access  Private
 */
router.post('/:id/cancel', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  await eventService.cancelRegistration(id, req.user.id);
  
  res.json({ success: true, message: 'Registration cancelled successfully' });
}));

// ==================== ATTENDEE MANAGEMENT ====================

/**
 * @route   GET /api/events/:id/attendees
 * @desc    Get event attendees (Organizer only)
 * @access  Private
 */
router.get('/:id/attendees', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const { Event } = await import('../models/Event.js');
  const event = await Event.findById(id)
    .populate('attendees.userId', 'name email avatar')
    .populate('waitlist.userId', 'name email avatar');
  
  if (!event) {
    throw new NotFoundError('Event not found');
  }
  
  // Check if user is organizer or co-organizer
  const isOrganizer = event.organizerId.toString() === req.user.id.toString();
  const isCoOrganizer = event.coOrganizers?.some(
    coId => coId.toString() === req.user.id.toString()
  );
  
  if (!isOrganizer && !isCoOrganizer && req.user.role !== 'platform_admin') {
    throw new ForbiddenError('Only organizers can view attendee list');
  }
  
  res.json({
    success: true,
    data: {
      attendees: event.attendees,
      waitlist: event.waitlist,
      stats: {
        registered: event.attendees.filter(a => a.status !== 'cancelled').length,
        confirmed: event.attendees.filter(a => a.status === 'confirmed').length,
        attended: event.attendees.filter(a => a.status === 'attended').length,
        waitlistCount: event.waitlist.length,
      },
    },
  });
}));

/**
 * @route   POST /api/events/:id/check-in
 * @desc    Check in an attendee
 * @access  Private (Organizer)
 */
router.post('/:id/check-in', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { attendeeId } = req.body;
  
  if (!attendeeId) {
    throw new ValidationError('Attendee ID is required');
  }
  
  await eventService.checkInAttendee(id, attendeeId, req.user.id);
  
  res.json({ success: true, message: 'Attendee checked in successfully' });
}));

// ==================== CALENDAR INTEGRATION ====================

/**
 * @route   GET /api/events/:id/calendar
 * @desc    Get calendar invite (iCal)
 * @access  Private
 */
router.get('/:id/calendar', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const icalContent = await eventService.generateICal(id);
  
  res.setHeader('Content-Type', 'text/calendar');
  res.setHeader('Content-Disposition', `attachment; filename="event-${id}.ics"`);
  res.send(icalContent);
}));

// ==================== RECORDING ====================

/**
 * @route   POST /api/events/:id/recording
 * @desc    Add recording to event
 * @access  Private (Organizer)
 */
router.post('/:id/recording', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { recordingUrl } = req.body;
  
  if (!recordingUrl) {
    throw new ValidationError('Recording URL is required');
  }
  
  await eventService.addRecording(id, recordingUrl, req.user.id);
  
  res.json({ success: true, message: 'Recording added successfully' });
}));

// ==================== QR CODE ====================

/**
 * @route   GET /api/events/:id/qr
 * @desc    Get check-in QR code
 * @access  Private (Organizer)
 */
router.get('/:id/qr', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await eventService.generateCheckInQR(id);
  
  res.json({
    success: true,
    data: result,
  });
}));

// ==================== ORGANIZER EVENTS ====================

/**
 * @route   GET /api/events/organizer/my-events
 * @desc    Get events organized by current user
 * @access  Private
 */
router.get('/organizer/my-events', authenticate, asyncHandler(async (req, res) => {
  const { limit = 20, skip = 0 } = req.query;
  
  const events = await eventService.getOrganizerEvents(req.user.id, {
    limit: parseInt(limit),
    skip: parseInt(skip),
  });
  
  res.json({
    success: true,
    data: events,
  });
}));

module.exports = router;