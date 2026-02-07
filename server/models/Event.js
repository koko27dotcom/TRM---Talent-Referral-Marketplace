/**
 * Event Model
 * Virtual and physical events for the community
 * Supports webinars, meetups, workshops, and conferences
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Event type constants
const EVENT_TYPES = {
  WEBINAR: 'webinar',
  MEETUP: 'meetup',
  WORKSHOP: 'workshop',
  CONFERENCE: 'conference',
  NETWORKING: 'networking',
  PANEL: 'panel',
  AMA: 'ama', // Ask Me Anything
};

// Event format constants
const EVENT_FORMATS = {
  VIRTUAL: 'virtual',
  PHYSICAL: 'physical',
  HYBRID: 'hybrid',
};

// Event status constants
const EVENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  POSTPONED: 'postponed',
};

// Attendee status constants
const ATTENDEE_STATUS = {
  REGISTERED: 'registered',
  CONFIRMED: 'confirmed',
  ATTENDED: 'attended',
  NO_SHOW: 'no_show',
  CANCELLED: 'cancelled',
};

// Location schema for physical/hybrid events
const LocationSchema = new Schema({
  venue: {
    type: String,
    required: true,
  },
  address: {
    street: String,
    city: String,
    region: String,
    country: String,
    postalCode: String,
  },
  coordinates: {
    lat: Number,
    lng: Number,
  },
  instructions: {
    type: String,
    maxlength: 1000,
  },
}, { _id: true });

// Virtual event details schema
const VirtualDetailsSchema = new Schema({
  platform: {
    type: String,
    enum: ['zoom', 'google_meet', 'microsoft_teams', 'custom', 'youtube', 'facebook'],
  },
  meetingUrl: {
    type: String,
  },
  meetingId: {
    type: String,
  },
  password: {
    type: String,
  },
  backupUrl: {
    type: String,
  },
  streamUrl: {
    type: String,
  },
}, { _id: true });

// Speaker schema
const SpeakerSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  name: {
    type: String,
    required: true,
  },
  title: {
    type: String,
  },
  company: {
    type: String,
  },
  bio: {
    type: String,
    maxlength: 1000,
  },
  avatar: {
    type: String,
  },
  socialLinks: {
    linkedin: String,
    twitter: String,
    website: String,
  },
  isGuest: {
    type: Boolean,
    default: false,
  },
}, { _id: true });

// Agenda item schema
const AgendaItemSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
  speakers: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  type: {
    type: String,
    enum: ['presentation', 'panel', 'break', 'networking', 'qna', 'workshop'],
    default: 'presentation',
  },
  order: {
    type: Number,
    default: 0,
  },
}, { _id: true });

// Attendee schema
const AttendeeSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: Object.values(ATTENDEE_STATUS),
    default: ATTENDEE_STATUS.REGISTERED,
  },
  registeredAt: {
    type: Date,
    default: Date.now,
  },
  checkedInAt: {
    type: Date,
  },
  checkedInBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      maxlength: 2000,
    },
    submittedAt: {
      type: Date,
    },
  },
  reminderSent: {
    type: Boolean,
    default: false,
  },
  calendarInviteSent: {
    type: Boolean,
    default: false,
  },
}, { _id: true });

// Waitlist entry schema
const WaitlistEntrySchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  position: {
    type: Number,
  },
  promotedAt: {
    type: Date,
  },
}, { _id: true });

// Event Schema
const EventSchema = new Schema({
  eventId: {
    type: String,
    unique: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    required: true,
    maxlength: 5000,
  },
  shortDescription: {
    type: String,
    maxlength: 300,
  },
  type: {
    type: String,
    enum: Object.values(EVENT_TYPES),
    required: true,
    index: true,
  },
  format: {
    type: String,
    enum: Object.values(EVENT_FORMATS),
    required: true,
    index: true,
  },
  // Location details
  location: LocationSchema,
  virtualDetails: VirtualDetailsSchema,
  // Timing
  startDate: {
    type: Date,
    required: true,
    index: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  timezone: {
    type: String,
    default: 'Asia/Yangon',
  },
  duration: {
    type: Number, // in minutes
  },
  // Capacity
  maxAttendees: {
    type: Number,
    default: 100,
  },
  attendees: [AttendeeSchema],
  waitlist: [WaitlistEntrySchema],
  // Content
  speakers: [SpeakerSchema],
  agenda: [AgendaItemSchema],
  // Recording
  recordingUrl: {
    type: String,
  },
  isRecorded: {
    type: Boolean,
    default: false,
  },
  recordingAvailableTo: {
    type: String,
    enum: ['all', 'attendees', 'none'],
    default: 'all',
  },
  // Organizer
  organizerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  coOrganizers: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
  },
  // Status
  status: {
    type: String,
    enum: Object.values(EVENT_STATUS),
    default: EVENT_STATUS.DRAFT,
    index: true,
  },
  // Visibility
  isPublic: {
    type: Boolean,
    default: true,
  },
  requireApproval: {
    type: Boolean,
    default: false,
  },
  // Categories and tags
  categories: [{
    type: String,
    trim: true,
    index: true,
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
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
  // Media
  coverImage: {
    type: String,
  },
  thumbnail: {
    type: String,
  },
  gallery: [{
    type: String,
  }],
  // Settings
  settings: {
    allowNetworking: {
      type: Boolean,
      default: true,
    },
    enableChat: {
      type: Boolean,
      default: true,
    },
    enableQnA: {
      type: Boolean,
      default: true,
    },
    enablePolls: {
      type: Boolean,
      default: false,
    },
    sendReminders: {
      type: Boolean,
      default: true,
    },
    reminderHours: [{
      type: Number,
      default: [24, 1], // 24 hours and 1 hour before
    }],
  },
  // Pricing (for paid events)
  pricing: {
    isFree: {
      type: Boolean,
      default: true,
    },
    amount: {
      type: Number,
    },
    currency: {
      type: String,
      default: 'MMK',
    },
    earlyBirdAmount: {
      type: Number,
    },
    earlyBirdDeadline: {
      type: Date,
    },
  },
  // Statistics
  statistics: {
    totalRegistrations: {
      type: Number,
      default: 0,
    },
    totalAttended: {
      type: Number,
      default: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
    },
    totalFeedback: {
      type: Number,
      default: 0,
    },
  },
  // SEO
  slug: {
    type: String,
    unique: true,
    sparse: true,
  },
}, {
  timestamps: true,
});

// Indexes for common queries
EventSchema.index({ status: 1, startDate: 1 });
EventSchema.index({ type: 1, status: 1, startDate: 1 });
EventSchema.index({ format: 1, status: 1, startDate: 1 });
EventSchema.index({ categories: 1, status: 1 });
EventSchema.index({ 'attendees.userId': 1, status: 1 });
EventSchema.index({ organizerId: 1, status: 1 });
EventSchema.index({ startDate: 1, endDate: 1 });
EventSchema.index({ title: 'text', description: 'text', tags: 'text' });

// Generate eventId and slug before saving
EventSchema.pre('save', async function(next) {
  if (!this.eventId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.eventId = `EVT${timestamp}${random}`;
  }
  
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 100);
  }
  
  // Calculate duration
  if (this.startDate && this.endDate) {
    this.duration = Math.round((this.endDate - this.startDate) / (1000 * 60));
  }
  
  // Update statistics
  this.statistics.totalRegistrations = this.attendees?.length || 0;
  this.statistics.totalAttended = this.attendees?.filter(a => a.status === ATTENDEE_STATUS.ATTENDED).length || 0;
  
  // Calculate average rating
  const feedbackRatings = this.attendees
    ?.filter(a => a.feedback?.rating)
    .map(a => a.feedback.rating);
  
  if (feedbackRatings?.length > 0) {
    this.statistics.averageRating = feedbackRatings.reduce((a, b) => a + b, 0) / feedbackRatings.length;
    this.statistics.totalFeedback = feedbackRatings.length;
  }
  
  next();
});

// Virtual for available spots
EventSchema.virtual('availableSpots').get(function() {
  const confirmedAttendees = this.attendees?.filter(
    a => a.status !== ATTENDEE_STATUS.CANCELLED
  ).length || 0;
  return Math.max(0, this.maxAttendees - confirmedAttendees);
});

// Virtual for is full
EventSchema.virtual('isFull').get(function() {
  return this.availableSpots === 0;
});

// Virtual for waitlist count
EventSchema.virtual('waitlistCount').get(function() {
  return this.waitlist?.length || 0;
});

// Method to check if user is registered
EventSchema.methods.isRegistered = function(userId) {
  return this.attendees.some(a => a.userId.toString() === userId.toString());
};

// Method to check if user is on waitlist
EventSchema.methods.isOnWaitlist = function(userId) {
  return this.waitlist.some(w => w.userId.toString() === userId.toString());
};

// Method to get attendee status
EventSchema.methods.getAttendeeStatus = function(userId) {
  const attendee = this.attendees.find(a => a.userId.toString() === userId.toString());
  return attendee?.status || null;
};

// Method to register attendee
EventSchema.methods.registerAttendee = function(userId) {
  if (this.isFull) {
    return { success: false, reason: 'event_full' };
  }
  
  if (this.isRegistered(userId)) {
    return { success: false, reason: 'already_registered' };
  }
  
  this.attendees.push({
    userId,
    status: this.requireApproval ? ATTENDEE_STATUS.REGISTERED : ATTENDEE_STATUS.CONFIRMED,
    registeredAt: new Date(),
  });
  
  return { success: true, status: this.attendees[this.attendees.length - 1].status };
};

// Method to cancel registration
EventSchema.methods.cancelRegistration = function(userId) {
  const attendee = this.attendees.find(a => a.userId.toString() === userId.toString());
  if (attendee) {
    attendee.status = ATTENDEE_STATUS.CANCELLED;
    
    // Promote from waitlist if available
    this.promoteFromWaitlist();
    
    return true;
  }
  return false;
};

// Method to add to waitlist
EventSchema.methods.addToWaitlist = function(userId) {
  if (this.isOnWaitlist(userId)) {
    return false;
  }
  
  this.waitlist.push({
    userId,
    position: this.waitlist.length + 1,
    joinedAt: new Date(),
  });
  
  return true;
};

// Method to promote from waitlist
EventSchema.methods.promoteFromWaitlist = function() {
  if (this.waitlist.length === 0 || this.availableSpots === 0) {
    return null;
  }
  
  const nextInLine = this.waitlist.shift();
  if (nextInLine) {
    this.attendees.push({
      userId: nextInLine.userId,
      status: ATTENDEE_STATUS.CONFIRMED,
      registeredAt: new Date(),
    });
    
    // Update positions
    this.waitlist.forEach((entry, index) => {
      entry.position = index + 1;
    });
    
    return nextInLine.userId;
  }
  return null;
};

// Method to check in attendee
EventSchema.methods.checkInAttendee = function(userId, checkedInBy) {
  const attendee = this.attendees.find(a => a.userId.toString() === userId.toString());
  if (attendee && attendee.status === ATTENDEE_STATUS.CONFIRMED) {
    attendee.status = ATTENDEE_STATUS.ATTENDED;
    attendee.checkedInAt = new Date();
    attendee.checkedInBy = checkedInBy;
    return true;
  }
  return false;
};

// Method to submit feedback
EventSchema.methods.submitFeedback = function(userId, rating, comment = '') {
  const attendee = this.attendees.find(a => a.userId.toString() === userId.toString());
  if (attendee && attendee.status === ATTENDEE_STATUS.ATTENDED) {
    attendee.feedback = {
      rating,
      comment,
      submittedAt: new Date(),
    };
    
    // Recalculate average rating
    const feedbackRatings = this.attendees
      .filter(a => a.feedback?.rating)
      .map(a => a.feedback.rating);
    
    if (feedbackRatings.length > 0) {
      this.statistics.averageRating = feedbackRatings.reduce((a, b) => a + b, 0) / feedbackRatings.length;
      this.statistics.totalFeedback = feedbackRatings.length;
    }
    
    return true;
  }
  return false;
};

// Static method to get upcoming events
EventSchema.statics.getUpcoming = async function(limit = 10, filters = {}) {
  const query = {
    status: { $in: [EVENT_STATUS.PUBLISHED, EVENT_STATUS.ONGOING] },
    startDate: { $gte: new Date() },
  };
  
  if (filters.type) query.type = filters.type;
  if (filters.format) query.format = filters.format;
  if (filters.category) query.categories = filters.category;
  
  return this.find(query)
    .sort({ startDate: 1 })
    .limit(limit)
    .populate('organizerId', 'name avatar')
    .populate('speakers.userId', 'name avatar')
    .lean();
};

// Static method to get events for user
EventSchema.statics.getUserEvents = async function(userId, status = null) {
  const query = {
    'attendees.userId': userId,
  };
  
  if (status) {
    query['attendees.status'] = status;
  }
  
  return this.find(query)
    .sort({ startDate: -1 })
    .populate('organizerId', 'name avatar')
    .lean();
};

// Static method to get events by organizer
EventSchema.statics.getOrganizerEvents = async function(organizerId, options = {}) {
  const { limit = 20, skip = 0 } = options;
  
  return this.find({ organizerId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

// Static method to search events
EventSchema.statics.search = async function(query, options = {}) {
  const { limit = 20, skip = 0, filters = {} } = options;
  
  const searchQuery = {
    status: { $in: [EVENT_STATUS.PUBLISHED, EVENT_STATUS.ONGOING] },
    $text: { $search: query },
  };
  
  if (filters.type) searchQuery.type = filters.type;
  if (filters.format) searchQuery.format = filters.format;
  
  return this.find(searchQuery, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' }, startDate: 1 })
    .skip(skip)
    .limit(limit)
    .populate('organizerId', 'name avatar')
    .lean();
};

const Event = mongoose.model('Event', EventSchema);

module.exports = Event;