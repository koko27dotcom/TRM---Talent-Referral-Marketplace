/**
 * AnalyticsEvent Model
 * Tracks all user actions and events for comprehensive analytics
 * Supports event tracking, A/B testing, and user behavior analysis
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Event types
const EVENT_TYPES = {
  PAGE_VIEW: 'page_view',
  CLICK: 'click',
  CONVERSION: 'conversion',
  ERROR: 'error',
  CUSTOM_EVENT: 'custom_event',
};

// Event categories
const EVENT_CATEGORIES = {
  USER_ACTION: 'user_action',
  SYSTEM: 'system',
  REFERRAL: 'referral',
  JOB: 'job',
  PAYMENT: 'payment',
  ENGAGEMENT: 'engagement',
};

// Device types
const DEVICE_TYPES = {
  DESKTOP: 'desktop',
  MOBILE: 'mobile',
  TABLET: 'tablet',
  UNKNOWN: 'unknown',
};

// Platform types
const PLATFORMS = {
  WEB: 'web',
  MOBILE_APP: 'mobile_app',
  API: 'api',
  WIDGET: 'widget',
  SDK: 'sdk',
};

// Analytics Event Schema
const AnalyticsEventSchema = new Schema({
  // User identification
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  anonymousId: {
    type: String,
    default: null,
    index: true,
  },
  sessionId: {
    type: String,
    required: true,
    index: true,
  },

  // Event classification
  eventType: {
    type: String,
    enum: Object.values(EVENT_TYPES),
    required: true,
    index: true,
  },
  eventCategory: {
    type: String,
    enum: Object.values(EVENT_CATEGORIES),
    required: true,
    index: true,
  },
  eventName: {
    type: String,
    required: true,
    index: true,
  },

  // Event properties (flexible metadata)
  properties: {
    type: Schema.Types.Mixed,
    default: {},
  },

  // Related entities
  relatedEntities: {
    referralId: {
      type: Schema.Types.ObjectId,
      ref: 'Referral',
      default: null,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      default: null,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
    },
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
      default: null,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'PaymentTransaction',
      default: null,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },

  // Device and browser information
  deviceInfo: {
    userAgent: {
      type: String,
      default: null,
    },
    deviceType: {
      type: String,
      enum: Object.values(DEVICE_TYPES),
      default: DEVICE_TYPES.UNKNOWN,
    },
    browser: {
      name: {
        type: String,
        default: null,
      },
      version: {
        type: String,
        default: null,
      },
    },
    os: {
      name: {
        type: String,
        default: null,
      },
      version: {
        type: String,
        default: null,
      },
    },
    screenResolution: {
      width: {
        type: Number,
        default: null,
      },
      height: {
        type: Number,
        default: null,
      },
    },
  },

  // Network information
  ipAddress: {
    type: String,
    default: null,
    index: true,
  },

  // Geographic location
  location: {
    country: {
      type: String,
      default: null,
      index: true,
    },
    countryCode: {
      type: String,
      default: null,
    },
    region: {
      type: String,
      default: null,
    },
    city: {
      type: String,
      default: null,
    },
    postalCode: {
      type: String,
      default: null,
    },
    coordinates: {
      latitude: {
        type: Number,
        default: null,
      },
      longitude: {
        type: Number,
        default: null,
      },
    },
    timezone: {
      type: String,
      default: null,
    },
  },

  // URL information
  url: {
    current: {
      type: String,
      default: null,
    },
    referrer: {
      type: String,
      default: null,
    },
    path: {
      type: String,
      default: null,
    },
    queryParams: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },

  // A/B Testing
  abTest: {
    experimentId: {
      type: String,
      default: null,
      index: true,
    },
    variantId: {
      type: String,
      default: null,
    },
    experimentName: {
      type: String,
      default: null,
    },
  },

  // Platform context
  platform: {
    type: String,
    enum: Object.values(PLATFORMS),
    default: PLATFORMS.WEB,
    index: true,
  },
  appVersion: {
    type: String,
    default: null,
  },

  // Performance metrics (for page_view events)
  performance: {
    loadTime: {
      type: Number,
      default: null,
    },
    domContentLoaded: {
      type: Number,
      default: null,
    },
    firstPaint: {
      type: Number,
      default: null,
    },
    firstContentfulPaint: {
      type: Number,
      default: null,
    },
  },

  // Error details (for error events)
  errorDetails: {
    message: {
      type: String,
      default: null,
    },
    stack: {
      type: String,
      default: null,
    },
    code: {
      type: String,
      default: null,
    },
    component: {
      type: String,
      default: null,
    },
  },

  // UTM parameters for campaign tracking
  utm: {
    source: {
      type: String,
      default: null,
    },
    medium: {
      type: String,
      default: null,
    },
    campaign: {
      type: String,
      default: null,
    },
    term: {
      type: String,
      default: null,
    },
    content: {
      type: String,
      default: null,
    },
  },

  // Timestamp (for TTL and querying)
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },

  // Metadata for extensibility
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },

}, {
  timestamps: true,
});

// Compound indexes for efficient querying
AnalyticsEventSchema.index({ userId: 1, timestamp: -1 });
AnalyticsEventSchema.index({ sessionId: 1, timestamp: -1 });
AnalyticsEventSchema.index({ eventType: 1, timestamp: -1 });
AnalyticsEventSchema.index({ eventCategory: 1, timestamp: -1 });
AnalyticsEventSchema.index({ eventName: 1, timestamp: -1 });
AnalyticsEventSchema.index({ 'relatedEntities.referralId': 1, timestamp: -1 });
AnalyticsEventSchema.index({ 'relatedEntities.jobId': 1, timestamp: -1 });
AnalyticsEventSchema.index({ 'relatedEntities.companyId': 1, timestamp: -1 });
AnalyticsEventSchema.index({ 'abTest.experimentId': 1, timestamp: -1 });
AnalyticsEventSchema.index({ location: '2dsphere' });
AnalyticsEventSchema.index({ 'location.country': 1, timestamp: -1 });
AnalyticsEventSchema.index({ platform: 1, timestamp: -1 });
AnalyticsEventSchema.index({ 'deviceInfo.deviceType': 1, timestamp: -1 });
AnalyticsEventSchema.index({ timestamp: -1 });

// TTL index for data retention (2 years = 730 days)
AnalyticsEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 });

// Instance Methods

// Get event summary
AnalyticsEventSchema.methods.getSummary = function() {
  return {
    id: this._id,
    eventType: this.eventType,
    eventCategory: this.eventCategory,
    eventName: this.eventName,
    userId: this.userId,
    sessionId: this.sessionId,
    timestamp: this.timestamp,
    platform: this.platform,
  };
};

// Static Methods

// Track event
AnalyticsEventSchema.statics.track = async function(data) {
  const event = new this(data);
  await event.save();
  return event;
};

// Track multiple events (batch)
AnalyticsEventSchema.statics.trackBatch = async function(events) {
  return this.insertMany(events, { ordered: false });
};

// Get events by user
AnalyticsEventSchema.statics.getByUser = async function(userId, options = {}) {
  const { limit = 100, skip = 0, eventTypes = null, startDate = null, endDate = null } = options;

  const query = { userId };

  if (eventTypes && eventTypes.length > 0) {
    query.eventType = { $in: eventTypes };
  }

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = startDate;
    if (endDate) query.timestamp.$lte = endDate;
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

// Get events by session
AnalyticsEventSchema.statics.getBySession = async function(sessionId, options = {}) {
  const { limit = 100, skip = 0 } = options;

  return this.find({ sessionId })
    .sort({ timestamp: 1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

// Get events by type
AnalyticsEventSchema.statics.getByType = async function(eventType, options = {}) {
  const { limit = 100, skip = 0, startDate = null, endDate = null } = options;

  const query = { eventType };

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = startDate;
    if (endDate) query.timestamp.$lte = endDate;
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

// Get funnel analysis
AnalyticsEventSchema.statics.getFunnel = async function(steps, options = {}) {
  const { startDate, endDate, userFilter = {} } = options;

  const results = [];
  let previousUsers = null;

  for (const step of steps) {
    const matchStage = {
      eventName: step.eventName,
      ...userFilter,
    };

    if (startDate || endDate) {
      matchStage.timestamp = {};
      if (startDate) matchStage.timestamp.$gte = startDate;
      if (endDate) matchStage.timestamp.$lte = endDate;
    }

    if (previousUsers !== null) {
      matchStage.userId = { $in: previousUsers };
    }

    const users = await this.distinct('userId', matchStage);

    results.push({
      step: step.name,
      eventName: step.eventName,
      count: users.length,
      users: users,
    });

    previousUsers = users;
  }

  // Calculate conversion rates
  for (let i = 1; i < results.length; i++) {
    results[i].conversionRate = results[i - 1].count > 0
      ? (results[i].count / results[i - 1].count) * 100
      : 0;
    results[i].dropOffRate = 100 - results[i].conversionRate;
  }

  return results;
};

// Get A/B test results
AnalyticsEventSchema.statics.getABTestResults = async function(experimentId, options = {}) {
  const { eventName = null, startDate = null, endDate = null } = options;

  const matchStage = { 'abTest.experimentId': experimentId };

  if (eventName) {
    matchStage.eventName = eventName;
  }

  if (startDate || endDate) {
    matchStage.timestamp = {};
    if (startDate) matchStage.timestamp.$gte = startDate;
    if (endDate) matchStage.timestamp.$lte = endDate;
  }

  const results = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$abTest.variantId',
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
      },
    },
    {
      $project: {
        variantId: '$_id',
        count: 1,
        uniqueUserCount: { $size: '$uniqueUsers' },
      },
    },
  ]);

  return results;
};

// Get event counts by date
AnalyticsEventSchema.statics.getCountsByDate = async function(options = {}) {
  const { eventType = null, eventName = null, days = 30 } = options;

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const matchStage = {
    timestamp: { $gte: startDate, $lte: endDate },
  };

  if (eventType) matchStage.eventType = eventType;
  if (eventName) matchStage.eventName = eventName;

  const results = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' },
        },
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
      },
    },
    {
      $project: {
        date: {
          $dateFromParts: {
            year: '$_id.year',
            month: '$_id.month',
            day: '$_id.day',
          },
        },
        count: 1,
        uniqueUserCount: { $size: '$uniqueUsers' },
      },
    },
    { $sort: { date: 1 } },
  ]);

  return results;
};

// Get top events
AnalyticsEventSchema.statics.getTopEvents = async function(options = {}) {
  const { limit = 10, startDate = null, endDate = null } = options;

  const matchStage = {};

  if (startDate || endDate) {
    matchStage.timestamp = {};
    if (startDate) matchStage.timestamp.$gte = startDate;
    if (endDate) matchStage.timestamp.$lte = endDate;
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$eventName',
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
      },
    },
    {
      $project: {
        eventName: '$_id',
        count: 1,
        uniqueUserCount: { $size: '$uniqueUsers' },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);
};

// Get user journey
AnalyticsEventSchema.statics.getUserJourney = async function(userId, options = {}) {
  const { limit = 100, startDate = null, endDate = null } = options;

  const query = { userId };

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = startDate;
    if (endDate) query.timestamp.$lte = endDate;
  }

  return this.find(query)
    .sort({ timestamp: 1 })
    .limit(limit)
    .select('eventName eventType eventCategory timestamp sessionId url properties')
    .lean();
};

// Get real-time analytics (last N minutes)
AnalyticsEventSchema.statics.getRealTimeStats = async function(minutes = 5) {
  const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);

  const [totalEvents, uniqueUsers, eventsByType] = await Promise.all([
    this.countDocuments({ timestamp: { $gte: cutoffTime } }),
    this.distinct('userId', { timestamp: { $gte: cutoffTime } }),
    this.aggregate([
      { $match: { timestamp: { $gte: cutoffTime } } },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  return {
    totalEvents,
    uniqueUsers: uniqueUsers.length,
    eventsPerMinute: Math.round(totalEvents / minutes),
    eventsByType: eventsByType.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    timeWindow: `${minutes} minutes`,
  };
};

// Get geographic distribution
AnalyticsEventSchema.statics.getGeographicDistribution = async function(options = {}) {
  const { startDate = null, endDate = null, limit = 20 } = options;

  const matchStage = {};

  if (startDate || endDate) {
    matchStage.timestamp = {};
    if (startDate) matchStage.timestamp.$gte = startDate;
    if (endDate) matchStage.timestamp.$lte = endDate;
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$location.country',
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        cities: { $addToSet: '$location.city' },
      },
    },
    {
      $project: {
        country: '$_id',
        count: 1,
        uniqueUserCount: { $size: '$uniqueUsers' },
        cityCount: { $size: '$cities' },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);
};

// Get device breakdown
AnalyticsEventSchema.statics.getDeviceBreakdown = async function(options = {}) {
  const { startDate = null, endDate = null } = options;

  const matchStage = {};

  if (startDate || endDate) {
    matchStage.timestamp = {};
    if (startDate) matchStage.timestamp.$gte = startDate;
    if (endDate) matchStage.timestamp.$lte = endDate;
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$deviceInfo.deviceType',
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
      },
    },
    {
      $project: {
        deviceType: '$_id',
        count: 1,
        uniqueUserCount: { $size: '$uniqueUsers' },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

// Clean up old events (manual cleanup if needed)
AnalyticsEventSchema.statics.cleanupOldEvents = async function(olderThanDays = 730) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const result = await this.deleteMany({
    timestamp: { $lt: cutoffDate },
  });

  return result.deletedCount;
};

// Get retention cohort analysis
AnalyticsEventSchema.statics.getRetentionCohorts = async function(options = {}) {
  const { days = 30 } = options;

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get users who first appeared in each day
  const cohorts = await this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate },
        userId: { $ne: null },
      },
    },
    {
      $group: {
        _id: '$userId',
        firstSeen: { $min: '$timestamp' },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$firstSeen' },
          month: { $month: '$firstSeen' },
          day: { $dayOfMonth: '$firstSeen' },
        },
        users: { $addToSet: '$_id' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
  ]);

  return cohorts.map(cohort => ({
    date: new Date(cohort._id.year, cohort._id.month - 1, cohort._id.day),
    userCount: cohort.count,
    users: cohort.users,
  }));
};

const AnalyticsEvent = mongoose.model('AnalyticsEvent', AnalyticsEventSchema);

module.exports = AnalyticsEvent;
module.exports.EVENT_TYPES = EVENT_TYPES;
module.exports.EVENT_CATEGORIES = EVENT_CATEGORIES;
module.exports.DEVICE_TYPES = DEVICE_TYPES;
module.exports.PLATFORMS = PLATFORMS;
