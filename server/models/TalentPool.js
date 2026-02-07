/**
 * TalentPool Model
 * Stores potential candidates for proactive talent sourcing
 * Supports 100,000+ candidates with efficient indexing
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Enriched data schema for AI-generated insights
const EnrichedDataSchema = new Schema({
  extractedSkills: [{
    skill: String,
    confidence: Number,
    source: String,
  }],
  estimatedSalary: {
    min: Number,
    max: Number,
    currency: { type: String, default: 'MMK' },
    confidence: Number,
  },
  marketComparison: {
    percentile: Number,
    marketAverage: Number,
  },
  aiInsights: {
    strengths: [String],
    potentialRoles: [String],
    careerTrajectory: String,
    availabilityLikelihood: Number,
  },
  enrichmentDate: {
    type: Date,
    default: Date.now,
  },
  enrichmentVersion: String,
}, { _id: true });

// Contact attempt history
const ContactHistorySchema = new Schema({
  channel: {
    type: String,
    enum: ['whatsapp', 'email', 'phone', 'linkedin'],
    required: true,
  },
  type: {
    type: String,
    enum: ['initial', 'follow_up_1', 'follow_up_2', 'follow_up_3', 're_engagement'],
    required: true,
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'replied', 'failed', 'bounced'],
    default: 'sent',
  },
  sentAt: {
    type: Date,
    default: Date.now,
  },
  respondedAt: Date,
  messageContent: String,
  campaignId: {
    type: Schema.Types.ObjectId,
    ref: 'OutreachCampaign',
  },
  metadata: {
    openedAt: Date,
    clickedAt: Date,
    ipAddress: String,
    userAgent: String,
  },
}, { _id: true });

// Talent Pool Candidate Schema
const TalentPoolSchema = new Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Candidate name is required'],
    trim: true,
    index: true,
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    sparse: true,
    index: true,
  },
  phone: {
    type: String,
    trim: true,
    index: true,
  },
  
  // Source Information
  source: {
    type: String,
    enum: ['linkedin', 'facebook', 'job.com.mm', 'manual', 'import', 'referral', 'scraper'],
    required: true,
    index: true,
  },
  sourceId: {
    type: Schema.Types.ObjectId,
    ref: 'CandidateSource',
    index: true,
  },
  profileUrl: {
    type: String,
    trim: true,
  },
  sourceReference: {
    type: String,
    trim: true,
  },
  
  // Professional Information
  currentTitle: {
    type: String,
    trim: true,
    index: true,
  },
  currentCompany: {
    type: String,
    trim: true,
    index: true,
  },
  experienceYears: {
    type: Number,
    min: 0,
    max: 50,
    index: true,
  },
  skills: [{
    type: String,
    trim: true,
    index: true,
  }],
  
  // Location
  location: {
    city: String,
    region: String,
    country: { type: String, default: 'Myanmar' },
    coordinates: {
      lat: Number,
      lng: Number,
    },
  },
  
  // Salary Expectations
  salaryExpectation: {
    min: Number,
    max: Number,
    currency: { type: String, default: 'MMK' },
    negotiable: { type: Boolean, default: true },
  },
  
  // AI-Generated Scores
  hireProbabilityScore: {
    type: Number,
    min: 0,
    max: 100,
    index: true,
  },
  engagementScore: {
    type: Number,
    min: 0,
    max: 100,
  },
  skillMatchScore: {
    type: Number,
    min: 0,
    max: 100,
  },
  
  // Contact Status
  contactStatus: {
    type: String,
    enum: ['not_contacted', 'contacted', 'responded', 'engaged', 'not_interested', 'hired', 'blacklisted'],
    default: 'not_contacted',
    index: true,
  },
  contactPreference: {
    preferredChannel: {
      type: String,
      enum: ['whatsapp', 'email', 'phone', 'linkedin'],
    },
    preferredTime: String,
    doNotContact: { type: Boolean, default: false },
  },
  
  // Enrichment Data
  enrichedData: EnrichedDataSchema,
  
  // Contact History
  contactHistory: [ContactHistorySchema],
  
  // Campaign Associations
  campaigns: [{
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: 'OutreachCampaign',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'opted_out'],
      default: 'active',
    },
  }],
  
  // Tags and Notes
  tags: [{
    type: String,
    trim: true,
    index: true,
  }],
  notes: {
    type: String,
    trim: true,
  },
  
  // Matching
  matchedJobs: [{
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
    },
    matchScore: Number,
    matchedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  
  // GDPR/Privacy
  consentGiven: {
    type: Boolean,
    default: false,
  },
  consentDate: Date,
  dataRetentionDate: Date,
  
  // Metadata
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Compound indexes for common queries
TalentPoolSchema.index({ source: 1, contactStatus: 1 });
TalentPoolSchema.index({ skills: 1, hireProbabilityScore: -1 });
TalentPoolSchema.index({ location: 1, experienceYears: 1 });
TalentPoolSchema.index({ 'location.city': 1, contactStatus: 1 });
TalentPoolSchema.index({ createdAt: -1 });
TalentPoolSchema.index({ tags: 1 });
TalentPoolSchema.index({ 
  name: 'text', 
  currentTitle: 'text', 
  currentCompany: 'text',
  skills: 'text' 
});

// Virtual for full location
TalentPoolSchema.virtual('fullLocation').get(function() {
  const parts = [this.location?.city, this.location?.region, this.location?.country].filter(Boolean);
  return parts.join(', ');
});

// Virtual for last contact
TalentPoolSchema.virtual('lastContact').get(function() {
  if (!this.contactHistory || this.contactHistory.length === 0) return null;
  return this.contactHistory[this.contactHistory.length - 1];
});

// Virtual for response rate
TalentPoolSchema.virtual('responseRate').get(function() {
  if (!this.contactHistory || this.contactHistory.length === 0) return 0;
  const responses = this.contactHistory.filter(h => h.status === 'replied').length;
  return Math.round((responses / this.contactHistory.length) * 100);
});

// Pre-save middleware
TalentPoolSchema.pre('save', function(next) {
  // Update data retention date (2 years from creation)
  if (this.isNew && !this.dataRetentionDate) {
    this.dataRetentionDate = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000);
  }
  next();
});

// Static methods
TalentPoolSchema.statics.findBySkills = function(skills, options = {}) {
  const query = { skills: { $in: skills }, isActive: true };
  if (options.minScore) {
    query.hireProbabilityScore = { $gte: options.minScore };
  }
  return this.find(query).sort({ hireProbabilityScore: -1 }).limit(options.limit || 100);
};

TalentPoolSchema.statics.findHighProbability = function(minScore = 70, limit = 100) {
  return this.find({ 
    hireProbabilityScore: { $gte: minScore }, 
    contactStatus: { $in: ['not_contacted', 'responded'] },
    isActive: true 
  })
  .sort({ hireProbabilityScore: -1 })
  .limit(limit);
};

TalentPoolSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        bySource: { $push: '$source' },
        byStatus: { $push: '$contactStatus' },
        avgHireScore: { $avg: '$hireProbabilityScore' },
        thisMonth: {
          $sum: {
            $cond: [
              { $gte: ['$createdAt', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] },
              1,
              0
            ]
          }
        }
      }
    }
  ]);
  
  return stats[0] || { total: 0, avgHireScore: 0, thisMonth: 0 };
};

// Instance methods
TalentPoolSchema.methods.addContactAttempt = function(attemptData) {
  this.contactHistory.push(attemptData);
  
  // Update contact status based on attempt
  if (attemptData.status === 'replied') {
    this.contactStatus = 'responded';
  } else if (attemptData.status === 'sent' && this.contactStatus === 'not_contacted') {
    this.contactStatus = 'contacted';
  }
  
  return this.save();
};

TalentPoolSchema.methods.enrich = function(enrichmentData) {
  this.enrichedData = {
    ...this.enrichedData,
    ...enrichmentData,
    enrichmentDate: new Date(),
  };
  return this.save();
};

const TalentPool = mongoose.model('TalentPool', TalentPoolSchema);

module.exports = TalentPool;
