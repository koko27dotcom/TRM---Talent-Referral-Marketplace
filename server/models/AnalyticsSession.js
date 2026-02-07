/**
 * AnalyticsSession Model
 * Tracks user sessions for comprehensive analytics
 * Supports session tracking, conversion analysis, and user journey mapping
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Session status
const SESSION_STATUS = {
  ACTIVE: 'active',
  ENDED: 'ended',
  EXPIRED: 'expired',
  CONVERTED: 'converted',
};

// Traffic sources
const TRAFFIC_SOURCES = {
  DIRECT: 'direct',
  ORGANIC: 'organic',
  REFERRAL: 'referral',
  SOCIAL: 'social',
  EMAIL: 'email',
  PAID: 'paid',
  AFFILIATE: 'affiliate',
  DISPLAY: 'display',
  UNKNOWN: 'unknown',
};

// Device types
const DEVICE_TYPES = {
  DESKTOP: 'desktop',
  MOBILE: 'mobile',
  TABLET: 'tablet',
  UNKNOWN: 'unknown',
};

// Analytics Session Schema
const AnalyticsSessionSchema = new Schema({
  // Session identification
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
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

  // Session timing
  startedAt: {
    type: Date,
    default: Date.now,
    required: true,
    index: true,
  },
  endedAt: {
    type: Date,
    default: null,
  },
  duration: {
    type: Number, // in seconds
    default: 0,
  },
  lastActivityAt: {
    type: Date,
    default: Date.now,
    index: true,
  },

  // Session status
  status: {
    type: String,
    enum: Object.values(SESSION_STATUS),
    default: SESSION_STATUS.ACTIVE,
    index: true,
  },

  // Session source (UTM parameters)
  source: {
    utmSource: {
      type: String,
      default: null,
      index: true,
    },
    utmMedium: {
      type: String,
      default: null,
      index: true,
    },
    utmCampaign: {
      type: String,
      default: null,
      index: true,
    },
    utmTerm: {
      type: String,
      default: null,
    },
    utmContent: {
      type: String,
      default: null,
    },
    referrer: {
      type: String,
      default: null,
    },
    landingPage: {
      type: String,
      default: null,
    },
    trafficSource: {
      type: String,
      enum: Object.values(TRAFFIC_SOURCES),
      default: TRAFFIC_SOURCES.UNKNOWN,
      index: true,
    },
  },

  // Device and browser information
  deviceInfo: {
    userAgent: {
      type: String,
      default: null,
    },
    ipAddress: {
      type: String,
      default: null,
      index: true,
    },
    deviceType: {
      type: String,
      enum: Object.values(DEVICE_TYPES),
      default: DEVICE_TYPES.UNKNOWN,
      index: true,
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

  // Session metrics
  metrics: {
    pageViews: {
      type: Number,
      default: 0,
    },
    events: {
      type: Number,
      default: 0,
    },
    clicks: {
      type: Number,
      default: 0,
    },
    conversions: {
      type: Number,
      default: 0,
    },
    engagementScore: {
      type: Number,
      default: 0,
    },
  },

  // Session journey (pages visited)
  pagesVisited: [{
    path: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    timeOnPage: {
      type: Number, // in seconds
      default: 0,
    },
    referrer: {
      type: String,
      default: null,
    },
  }],

  // Session outcome
  outcome: {
    converted: {
      type: Boolean,
      default: false,
      index: true,
    },
    conversionType: {
      type: String,
      default: null,
    },
    conversionValue: {
      type: Number,
      default: 0,
    },
    conversionEventId: {
      type: Schema.Types.ObjectId,
      ref: 'AnalyticsEvent',
      default: null,
    },
    convertedAt: {
      type: Date,
      default: null,
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

  // Metadata for extensibility
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },

}, {
  timestamps: true,
});

// Compound indexes for efficient querying
AnalyticsSessionSchema.index({ userId: 1, startedAt: -1 });
AnalyticsSessionSchema.index({ status: 1, startedAt: -1 });
AnalyticsSessionSchema.index({ 'source.trafficSource': 1, startedAt: -1 });
AnalyticsSessionSchema.index({ 'source.utmSource': 1, startedAt: -1 });
AnalyticsSessionSchema.index({ 'source.utmCampaign': 1, startedAt: -1 });
AnalyticsSessionSchema.index({ 'deviceInfo.deviceType': 1, startedAt: -1 });
AnalyticsSessionSchema.index({ 'location.country': 1, startedAt: -1 });
AnalyticsSessionSchema.index({ 'outcome.converted': 1, startedAt: -1 });
AnalyticsSessionSchema.index({ 'abTest.experimentId': 1, startedAt: -1 });
AnalyticsSessionSchema.index({ startedAt: -1 });
AnalyticsSessionSchema.index({ lastActivityAt: -1 });

// TTL index for data retention (1 year = 365 days)
AnalyticsSessionSchema.index({ startedAt: 1 }, { expireAfterSeconds: 31536000 });

// Instance Methods

// Get session summary
AnalyticsSessionSchema.methods.getSummary = function() {
  return {
    id: this._id,
    sessionId: this.sessionId,
    userId: this.userId,
    status: this.status,
    startedAt: this.startedAt,
    endedAt: this.endedAt,
    duration: this.duration,
    metrics: this.metrics,
    converted: this.outcome.converted,
    pageCount: this.pagesVisited.length,
  };
};

// Update last activity
AnalyticsSessionSchema.methods.updateActivity = async function() {
  this.lastActivityAt = new Date();
  await this.save();
  return this;
};

// Add page to journey
AnalyticsSessionSchema.methods.addPage = async function(pageData) {
  // Update time on previous page if exists
  if (this.pagesVisited.length > 0) {
    const lastPage = this.pagesVisited[this.pagesVisited.length - 1];
    const timeOnPage = Math.floor((new Date() - lastPage.timestamp) / 1000);
    lastPage.timeOnPage = timeOnPage;
  }

  this.pagesVisited.push({
    path: pageData.path,
    title: pageData.title,
    timestamp: new Date(),
    referrer: pageData.referrer || null,
  });

  this.metrics.pageViews += 1;
  this.lastActivityAt = new Date();

  await this.save();
  return this;
};

// Record conversion
AnalyticsSessionSchema.methods.recordConversion = async function(conversionData) {
  this.outcome.converted = true;
  this.outcome.conversionType = conversionData.type || null;
  this.outcome.conversionValue = conversionData.value || 0;
  this.outcome.conversionEventId = conversionData.eventId || null;
  this.outcome.convertedAt = new Date();
  this.status = SESSION_STATUS.CONVERTED;
  this.metrics.conversions += 1;

  await this.save();
  return this;
};

// Static Methods

// Start a new session
AnalyticsSessionSchema.statics.startSession = async function(sessionData) {
  const session = new this({
    sessionId: sessionData.sessionId,
    userId: sessionData.userId || null,
    anonymousId: sessionData.anonymousId || null,
    startedAt: new Date(),
    lastActivityAt: new Date(),
    status: SESSION_STATUS.ACTIVE,
    source: {
      utmSource: sessionData.utmSource || null,
      utmMedium: sessionData.utmMedium || null,
      utmCampaign: sessionData.utmCampaign || null,
      utmTerm: sessionData.utmTerm || null,
      utmContent: sessionData.utmContent || null,
      referrer: sessionData.referrer || null,
      landingPage: sessionData.landingPage || null,
      trafficSource: sessionData.trafficSource || TRAFFIC_SOURCES.UNKNOWN,
    },
    deviceInfo: {
      userAgent: sessionData.userAgent || null,
      ipAddress: sessionData.ipAddress || null,
      deviceType: sessionData.deviceType || DEVICE_TYPES.UNKNOWN,
      browser: {
        name: sessionData.browserName || null,
        version: sessionData.browserVersion || null,
      },
      os: {
        name: sessionData.osName || null,
        version: sessionData.osVersion || null,
      },
      screenResolution: {
        width: sessionData.screenWidth || null,
        height: sessionData.screenHeight || null,
      },
    },
    location: {
      country: sessionData.country || null,
      countryCode: sessionData.countryCode || null,
      region: sessionData.region || null,
      city: sessionData.city || null,
      postalCode: sessionData.postalCode || null,
      coordinates: {
        latitude: sessionData.latitude || null,
        longitude: sessionData.longitude || null,
      },
      timezone: sessionData.timezone || null,
    },
    abTest: {
      experimentId: sessionData.experimentId || null,
      variantId: sessionData.variantId || null,
      experimentName: sessionData.experimentName || null,
    },
  });

  await session.save();
  return session;
};

// End a session and calculate duration
AnalyticsSessionSchema.statics.endSession = async function(sessionId) {
  const session = await this.findOne({ sessionId });

  if (!session) {
    throw new Error('Session not found');
  }

  const endedAt = new Date();
  const duration = Math.floor((endedAt - session.startedAt) / 1000);

  session.endedAt = endedAt;
  session.duration = duration;

  if (session.status !== SESSION_STATUS.CONVERTED) {
    session.status = SESSION_STATUS.ENDED;
  }

  // Calculate engagement score
  session.metrics.engagementScore = calculateEngagementScore(session);

  await session.save();
  return session;
};

// Get currently active sessions
AnalyticsSessionSchema.statics.getActiveSessions = async function(options = {}) {
  const { limit = 100, skip = 0, minutesInactive = 30 } = options;

  const cutoffTime = new Date(Date.now() - minutesInactive * 60 * 1000);

  return this.find({
    status: SESSION_STATUS.ACTIVE,
    lastActivityAt: { $gte: cutoffTime },
  })
    .sort({ lastActivityAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

// Get sessions by user
AnalyticsSessionSchema.statics.getByUser = async function(userId, options = {}) {
  const { limit = 50, skip = 0, startDate = null, endDate = null } = options;

  const query = { userId };

  if (startDate || endDate) {
    query.startedAt = {};
    if (startDate) query.startedAt.$gte = startDate;
    if (endDate) query.startedAt.$lte = endDate;
  }

  return this.find(query)
    .sort({ startedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

// Get aggregated session metrics
AnalyticsSessionSchema.statics.getSessionMetrics = async function(options = {}) {
  const { startDate = null, endDate = null } = options;

  const matchStage = {};

  if (startDate || endDate) {
    matchStage.startedAt = {};
    if (startDate) matchStage.startedAt.$gte = startDate;
    if (endDate) matchStage.startedAt.$lte = endDate;
  }

  const results = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        avgDuration: { $avg: '$duration' },
        totalPageViews: { $sum: '$metrics.pageViews' },
        totalEvents: { $sum: '$metrics.events' },
        totalConversions: { $sum: '$metrics.conversions' },
        convertedSessions: {
          $sum: { $cond: ['$outcome.converted', 1, 0] },
        },
        avgEngagementScore: { $avg: '$metrics.engagementScore' },
      },
    },
    {
      $project: {
        totalSessions: 1,
        uniqueUserCount: { $size: '$uniqueUsers' },
        avgDuration: { $round: ['$avgDuration', 2] },
        totalPageViews: 1,
        totalEvents: 1,
        totalConversions: 1,
        convertedSessions: 1,
        conversionRate: {
          $round: [
            { $multiply: [{ $divide: ['$convertedSessions', '$totalSessions'] }, 100] },
            2,
          ],
        },
        avgEngagementScore: { $round: ['$avgEngagementScore', 2] },
        avgPagesPerSession: {
          $round: [{ $divide: ['$totalPageViews', '$totalSessions'] }, 2],
        },
      },
    },
  ]);

  return results[0] || {
    totalSessions: 0,
    uniqueUserCount: 0,
    avgDuration: 0,
    totalPageViews: 0,
    totalEvents: 0,
    totalConversions: 0,
    convertedSessions: 0,
    conversionRate: 0,
    avgEngagementScore: 0,
    avgPagesPerSession: 0,
  };
};

// Get breakdown of traffic sources
AnalyticsSessionSchema.statics.getTrafficSources = async function(options = {}) {
  const { startDate = null, endDate = null } = options;

  const matchStage = {};

  if (startDate || endDate) {
    matchStage.startedAt = {};
    if (startDate) matchStage.startedAt.$gte = startDate;
    if (endDate) matchStage.startedAt.$lte = endDate;
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$source.trafficSource',
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        avgDuration: { $avg: '$duration' },
        convertedSessions: {
          $sum: { $cond: ['$outcome.converted', 1, 0] },
        },
      },
    },
    {
      $project: {
        trafficSource: '$_id',
        count: 1,
        uniqueUserCount: { $size: '$uniqueUsers' },
        avgDuration: { $round: ['$avgDuration', 2] },
        convertedSessions: 1,
        conversionRate: {
          $round: [
            { $multiply: [{ $divide: ['$convertedSessions', '$count'] }, 100] },
            2,
          ],
        },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

// Calculate session conversion rate
AnalyticsSessionSchema.statics.getConversionRate = async function(options = {}) {
  const { startDate = null, endDate = null, trafficSource = null } = options;

  const matchStage = {};

  if (startDate || endDate) {
    matchStage.startedAt = {};
    if (startDate) matchStage.startedAt.$gte = startDate;
    if (endDate) matchStage.startedAt.$lte = endDate;
  }

  if (trafficSource) {
    matchStage['source.trafficSource'] = trafficSource;
  }

  const results = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        convertedSessions: {
          $sum: { $cond: ['$outcome.converted', 1, 0] },
        },
        totalConversionValue: { $sum: '$outcome.conversionValue' },
      },
    },
    {
      $project: {
        totalSessions: 1,
        convertedSessions: 1,
        conversionRate: {
          $round: [
            { $multiply: [{ $divide: ['$convertedSessions', '$totalSessions'] }, 100] },
            2,
          ],
        },
        totalConversionValue: 1,
        avgConversionValue: {
          $cond: [
            { $gt: ['$convertedSessions', 0] },
            { $round: [{ $divide: ['$totalConversionValue', '$convertedSessions'] }, 2] },
            0,
          ],
        },
      },
    },
  ]);

  return results[0] || {
    totalSessions: 0,
    convertedSessions: 0,
    conversionRate: 0,
    totalConversionValue: 0,
    avgConversionValue: 0,
  };
};

// Get average session duration statistics
AnalyticsSessionSchema.statics.getAverageSessionDuration = async function(options = {}) {
  const { startDate = null, endDate = null, groupBy = null } = options;

  const matchStage = {};

  if (startDate || endDate) {
    matchStage.startedAt = {};
    if (startDate) matchStage.startedAt.$gte = startDate;
    if (endDate) matchStage.startedAt.$lte = endDate;
  }

  const groupStage = {
    _id: groupBy ? `$${groupBy}` : null,
    avgDuration: { $avg: '$duration' },
    minDuration: { $min: '$duration' },
    maxDuration: { $max: '$duration' },
    totalSessions: { $sum: 1 },
  };

  const results = await this.aggregate([
    { $match: matchStage },
    { $group: groupStage },
    {
      $project: {
        group: '$_id',
        avgDuration: { $round: ['$avgDuration', 2] },
        minDuration: 1,
        maxDuration: 1,
        totalSessions: 1,
      },
    },
    { $sort: { avgDuration: -1 } },
  ]);

  if (!groupBy) {
    return results[0] || { avgDuration: 0, minDuration: 0, maxDuration: 0, totalSessions: 0 };
  }

  return results;
};

// Calculate bounce rate
AnalyticsSessionSchema.statics.getBounceRate = async function(options = {}) {
  const { startDate = null, endDate = null, trafficSource = null } = options;

  const matchStage = {};

  if (startDate || endDate) {
    matchStage.startedAt = {};
    if (startDate) matchStage.startedAt.$gte = startDate;
    if (endDate) matchStage.startedAt.$lte = endDate;
  }

  if (trafficSource) {
    matchStage['source.trafficSource'] = trafficSource;
  }

  const results = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        bouncedSessions: {
          $sum: { $cond: [{ $eq: [{ $size: '$pagesVisited' }, 1] }, 1, 0] },
        },
      },
    },
    {
      $project: {
        totalSessions: 1,
        bouncedSessions: 1,
        bounceRate: {
          $round: [
            { $multiply: [{ $divide: ['$bouncedSessions', '$totalSessions'] }, 100] },
            2,
          ],
        },
      },
    },
  ]);

  return results[0] || { totalSessions: 0, bouncedSessions: 0, bounceRate: 0 };
};

// Get average pages per session
AnalyticsSessionSchema.statics.getPagesPerSession = async function(options = {}) {
  const { startDate = null, endDate = null, groupBy = null } = options;

  const matchStage = {};

  if (startDate || endDate) {
    matchStage.startedAt = {};
    if (startDate) matchStage.startedAt.$gte = startDate;
    if (endDate) matchStage.startedAt.$lte = endDate;
  }

  const groupStage = {
    _id: groupBy ? `$${groupBy}` : null,
    avgPages: { $avg: { $size: '$pagesVisited' } },
    totalSessions: { $sum: 1 },
    totalPageViews: { $sum: '$metrics.pageViews' },
  };

  const results = await this.aggregate([
    { $match: matchStage },
    { $group: groupStage },
    {
      $project: {
        group: '$_id',
        avgPages: { $round: ['$avgPages', 2] },
        totalSessions: 1,
        totalPageViews: 1,
      },
    },
    { $sort: { avgPages: -1 } },
  ]);

  if (!groupBy) {
    return results[0] || { avgPages: 0, totalSessions: 0, totalPageViews: 0 };
  }

  return results;
};

// Manual cleanup utility for expired sessions
AnalyticsSessionSchema.statics.cleanupExpiredSessions = async function(maxInactiveMinutes = 30) {
  const cutoffTime = new Date(Date.now() - maxInactiveMinutes * 60 * 1000);

  const sessions = await this.find({
    status: SESSION_STATUS.ACTIVE,
    lastActivityAt: { $lt: cutoffTime },
  });

  const updatePromises = sessions.map(async (session) => {
    session.status = SESSION_STATUS.EXPIRED;
    session.endedAt = session.lastActivityAt;
    session.duration = Math.floor((session.lastActivityAt - session.startedAt) / 1000);
    session.metrics.engagementScore = calculateEngagementScore(session);
    return session.save();
  });

  await Promise.all(updatePromises);

  return {
    cleanedCount: sessions.length,
    sessions: sessions.map(s => s.sessionId),
  };
};

// Helper function to calculate engagement score
function calculateEngagementScore(session) {
  let score = 0;

  // Duration score (0-40 points)
  if (session.duration > 0) {
    score += Math.min(40, (session.duration / 300) * 40); // 5 minutes = max score
  }

  // Page views score (0-30 points)
  if (session.metrics.pageViews > 0) {
    score += Math.min(30, session.metrics.pageViews * 5);
  }

  // Events score (0-20 points)
  if (session.metrics.events > 0) {
    score += Math.min(20, session.metrics.events * 2);
  }

  // Conversion bonus (10 points)
  if (session.outcome.converted) {
    score += 10;
  }

  return Math.round(score);
}

const AnalyticsSession = mongoose.model('AnalyticsSession', AnalyticsSessionSchema);

module.exports = AnalyticsSession;
module.exports.SESSION_STATUS = SESSION_STATUS;
module.exports.TRAFFIC_SOURCES = TRAFFIC_SOURCES;
module.exports.DEVICE_TYPES = DEVICE_TYPES;
