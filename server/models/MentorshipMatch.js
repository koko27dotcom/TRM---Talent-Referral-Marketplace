/**
 * MentorshipMatch Model
 * Manages mentorship connections between mentors and mentees
 * Supports goal tracking, session scheduling, and progress monitoring
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Match status constants
const MATCH_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ON_HOLD: 'on_hold',
};

// Session status constants
const SESSION_STATUS = {
  SCHEDULED: 'scheduled',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
};

// Goal status constants
const GOAL_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
};

// Goal schema
const GoalSchema = new Schema({
  title: {
    type: String,
    required: true,
    maxlength: 200,
  },
  description: {
    type: String,
    maxlength: 1000,
  },
  status: {
    type: String,
    enum: Object.values(GOAL_STATUS),
    default: GOAL_STATUS.ACTIVE,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  targetDate: {
    type: Date,
  },
  completedAt: {
    type: Date,
  },
  milestones: [{
    title: String,
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: Date,
  }],
}, { _id: true });

// Session schema
const SessionSchema = new Schema({
  sessionId: {
    type: String,
    unique: true,
  },
  title: {
    type: String,
    required: true,
    maxlength: 200,
  },
  description: {
    type: String,
    maxlength: 1000,
  },
  scheduledAt: {
    type: Date,
    required: true,
  },
  duration: {
    type: Number, // in minutes
    default: 60,
  },
  status: {
    type: String,
    enum: Object.values(SESSION_STATUS),
    default: SESSION_STATUS.SCHEDULED,
  },
  format: {
    type: String,
    enum: ['video', 'audio', 'in_person'],
    default: 'video',
  },
  meetingLink: {
    type: String,
  },
  location: {
    type: String,
  },
  notes: {
    type: String,
    maxlength: 2000,
  },
  agenda: [{
    type: String,
  }],
  scheduledBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  confirmedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  completedAt: {
    type: Date,
  },
  rating: {
    mentor: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      feedback: String,
    },
    mentee: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      feedback: String,
    },
  },
}, { _id: true });

// Message schema
const MessageSchema = new Schema({
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000,
  },
  attachments: [{
    type: String,
    name: String,
  }],
  sentAt: {
    type: Date,
    default: Date.now,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: {
    type: Date,
  },
}, { _id: true });

// Mentorship Match Schema
const MentorshipMatchSchema = new Schema({
  matchId: {
    type: String,
    unique: true,
    index: true,
  },
  mentorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  menteeId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: Object.values(MATCH_STATUS),
    default: MATCH_STATUS.PENDING,
    index: true,
  },
  // Request details
  requestMessage: {
    type: String,
    maxlength: 1000,
  },
  requestDate: {
    type: Date,
    default: Date.now,
  },
  responseDate: {
    type: Date,
  },
  responseMessage: {
    type: String,
    maxlength: 1000,
  },
  // Program dates
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
  },
  expectedDuration: {
    type: Number, // in weeks
    default: 12,
  },
  // Goals and tracking
  goals: [GoalSchema],
  sessions: [SessionSchema],
  messages: [MessageSchema],
  // Focus areas
  focusAreas: [{
    type: String,
    trim: true,
  }],
  // Skills being developed
  skills: [{
    name: String,
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
    },
  }],
  // Progress tracking
  progress: {
    overall: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    milestones: [{
      title: String,
      isCompleted: Boolean,
      completedAt: Date,
    }],
  },
  // Final rating and feedback
  rating: {
    mentor: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      feedback: {
        type: String,
        maxlength: 2000,
      },
      submittedAt: {
        type: Date,
      },
    },
    mentee: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      feedback: {
        type: String,
        maxlength: 2000,
      },
      submittedAt: {
        type: Date,
      },
    },
  },
  // Payment (for paid mentorship)
  payment: {
    isPaid: {
      type: Boolean,
      default: false,
    },
    amount: {
      type: Number,
    },
    currency: {
      type: String,
      default: 'MMK',
    },
    sessionsIncluded: {
      type: Number,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'failed'],
    },
    paidAt: {
      type: Date,
    },
  },
  // Statistics
  statistics: {
    totalSessions: {
      type: Number,
      default: 0,
    },
    completedSessions: {
      type: Number,
      default: 0,
    },
    totalMessages: {
      type: Number,
      default: 0,
    },
    goalsCompleted: {
      type: Number,
      default: 0,
    },
    totalDuration: {
      type: Number, // in minutes
      default: 0,
    },
  },
  // Cancellation reason
  cancellation: {
    reason: {
      type: String,
      maxlength: 1000,
    },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    cancelledAt: {
      type: Date,
    },
  },
}, {
  timestamps: true,
});

// Indexes for common queries
MentorshipMatchSchema.index({ mentorId: 1, status: 1 });
MentorshipMatchSchema.index({ menteeId: 1, status: 1 });
MentorshipMatchSchema.index({ status: 1, createdAt: -1 });
MentorshipMatchSchema.index({ mentorId: 1, menteeId: 1 }, { unique: true });

// Generate matchId before saving
MentorshipMatchSchema.pre('save', async function(next) {
  if (!this.matchId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.matchId = `MTR${timestamp}${random}`;
  }
  
  // Generate session IDs
  this.sessions.forEach(session => {
    if (!session.sessionId) {
      const sessTimestamp = Date.now().toString(36).toUpperCase();
      const sessRandom = Math.random().toString(36).substring(2, 4).toUpperCase();
      session.sessionId = `SES${sessTimestamp}${sessRandom}`;
    }
  });
  
  // Update statistics
  this.statistics.totalSessions = this.sessions.length;
  this.statistics.completedSessions = this.sessions.filter(s => s.status === SESSION_STATUS.COMPLETED).length;
  this.statistics.totalMessages = this.messages.length;
  this.statistics.goalsCompleted = this.goals.filter(g => g.status === GOAL_STATUS.COMPLETED).length;
  this.statistics.totalDuration = this.sessions
    .filter(s => s.status === SESSION_STATUS.COMPLETED)
    .reduce((total, s) => total + (s.duration || 0), 0);
  
  // Calculate progress
  if (this.goals.length > 0) {
    const completedGoals = this.goals.filter(g => g.status === GOAL_STATUS.COMPLETED).length;
    this.progress.overall = Math.round((completedGoals / this.goals.length) * 100);
    this.progress.lastUpdated = new Date();
  }
  
  next();
});

// Virtual for average session rating
MentorshipMatchSchema.virtual('averageSessionRating').get(function() {
  const ratedSessions = this.sessions.filter(s => s.rating?.mentee?.rating);
  if (ratedSessions.length === 0) return 0;
  
  const totalRating = ratedSessions.reduce((sum, s) => sum + s.rating.mentee.rating, 0);
  return totalRating / ratedSessions.length;
});

// Virtual for next session
MentorshipMatchSchema.virtual('nextSession').get(function() {
  const now = new Date();
  return this.sessions
    .filter(s => s.status === SESSION_STATUS.SCHEDULED && s.scheduledAt > now)
    .sort((a, b) => a.scheduledAt - b.scheduledAt)[0];
});

// Virtual for unread messages count
MentorshipMatchSchema.virtual('unreadMessagesCount').get(function() {
  return this.messages.filter(m => !m.isRead).length;
});

// Method to accept mentorship request
MentorshipMatchSchema.methods.accept = function(responseMessage = '') {
  if (this.status !== MATCH_STATUS.PENDING) {
    return false;
  }
  
  this.status = MATCH_STATUS.ACTIVE;
  this.startDate = new Date();
  this.responseDate = new Date();
  this.responseMessage = responseMessage;
  
  // Calculate end date based on expected duration
  if (this.expectedDuration) {
    this.endDate = new Date();
    this.endDate.setDate(this.endDate.getDate() + (this.expectedDuration * 7));
  }
  
  return true;
};

// Method to decline mentorship request
MentorshipMatchSchema.methods.decline = function(responseMessage = '') {
  if (this.status !== MATCH_STATUS.PENDING) {
    return false;
  }
  
  this.status = MATCH_STATUS.CANCELLED;
  this.responseDate = new Date();
  this.responseMessage = responseMessage;
  
  return true;
};

// Method to complete mentorship
MentorshipMatchSchema.methods.complete = function() {
  if (this.status !== MATCH_STATUS.ACTIVE) {
    return false;
  }
  
  this.status = MATCH_STATUS.COMPLETED;
  this.endDate = new Date();
  
  return true;
};

// Method to cancel mentorship
MentorshipMatchSchema.methods.cancel = function(reason, cancelledBy) {
  if (![MATCH_STATUS.PENDING, MATCH_STATUS.ACTIVE].includes(this.status)) {
    return false;
  }
  
  this.status = MATCH_STATUS.CANCELLED;
  this.cancellation = {
    reason,
    cancelledBy,
    cancelledAt: new Date(),
  };
  
  return true;
};

// Method to add goal
MentorshipMatchSchema.methods.addGoal = function(title, description, targetDate, createdBy) {
  this.goals.push({
    title,
    description,
    targetDate,
    createdBy,
    status: GOAL_STATUS.ACTIVE,
    createdAt: new Date(),
  });
  
  return this.goals[this.goals.length - 1];
};

// Method to complete goal
MentorshipMatchSchema.methods.completeGoal = function(goalId) {
  const goal = this.goals.id(goalId);
  if (goal) {
    goal.status = GOAL_STATUS.COMPLETED;
    goal.completedAt = new Date();
    return true;
  }
  return false;
};

// Method to schedule session
MentorshipMatchSchema.methods.scheduleSession = function(sessionData) {
  this.sessions.push({
    ...sessionData,
    status: SESSION_STATUS.SCHEDULED,
  });
  
  return this.sessions[this.sessions.length - 1];
};

// Method to confirm session
MentorshipMatchSchema.methods.confirmSession = function(sessionId, confirmedBy) {
  const session = this.sessions.find(s => s._id.toString() === sessionId.toString());
  if (session && session.status === SESSION_STATUS.SCHEDULED) {
    session.status = SESSION_STATUS.CONFIRMED;
    session.confirmedBy = confirmedBy;
    return true;
  }
  return false;
};

// Method to complete session
MentorshipMatchSchema.methods.completeSession = function(sessionId) {
  const session = this.sessions.find(s => s._id.toString() === sessionId.toString());
  if (session && [SESSION_STATUS.SCHEDULED, SESSION_STATUS.CONFIRMED].includes(session.status)) {
    session.status = SESSION_STATUS.COMPLETED;
    session.completedAt = new Date();
    return true;
  }
  return false;
};

// Method to send message
MentorshipMatchSchema.methods.sendMessage = function(senderId, content, attachments = []) {
  this.messages.push({
    senderId,
    content,
    attachments,
    sentAt: new Date(),
    isRead: false,
  });
  
  return this.messages[this.messages.length - 1];
};

// Method to mark messages as read
MentorshipMatchSchema.methods.markMessagesAsRead = function(userId) {
  this.messages.forEach(message => {
    if (message.senderId.toString() !== userId.toString() && !message.isRead) {
      message.isRead = true;
      message.readAt = new Date();
    }
  });
};

// Method to submit final rating
MentorshipMatchSchema.methods.submitRating = function(userId, rating, feedback) {
  const isMentor = this.mentorId.toString() === userId.toString();
  const isMentee = this.menteeId.toString() === userId.toString();
  
  if (!isMentor && !isMentee) {
    return false;
  }
  
  const ratingData = {
    rating,
    feedback,
    submittedAt: new Date(),
  };
  
  if (isMentor) {
    this.rating.mentor = ratingData;
  } else {
    this.rating.mentee = ratingData;
  }
  
  return true;
};

// Static method to get active mentorships for user
MentorshipMatchSchema.statics.getActiveForUser = async function(userId, role = null) {
  const query = {
    status: MATCH_STATUS.ACTIVE,
    $or: [
      { mentorId: userId },
      { menteeId: userId },
    ],
  };
  
  if (role === 'mentor') {
    query.mentorId = userId;
    delete query.$or;
  } else if (role === 'mentee') {
    query.menteeId = userId;
    delete query.$or;
  }
  
  return this.find(query)
    .sort({ startDate: -1 })
    .populate('mentorId', 'name avatar')
    .populate('menteeId', 'name avatar')
    .lean();
};

// Static method to get pending requests
MentorshipMatchSchema.statics.getPendingRequests = async function(userId, asMentor = true) {
  const query = {
    status: MATCH_STATUS.PENDING,
  };
  
  if (asMentor) {
    query.mentorId = userId;
  } else {
    query.menteeId = userId;
  }
  
  return this.find(query)
    .sort({ requestDate: -1 })
    .populate(asMentor ? 'menteeId' : 'mentorId', 'name avatar')
    .lean();
};

// Static method to get mentorship history
MentorshipMatchSchema.statics.getHistory = async function(userId) {
  return this.find({
    $or: [
      { mentorId: userId },
      { menteeId: userId },
    ],
    status: { $in: [MATCH_STATUS.COMPLETED, MATCH_STATUS.CANCELLED] },
  })
    .sort({ endDate: -1 })
    .populate('mentorId', 'name avatar')
    .populate('menteeId', 'name avatar')
    .lean();
};

const MentorshipMatch = mongoose.model('MentorshipMatch', MentorshipMatchSchema);

module.exports = MentorshipMatch;