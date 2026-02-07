/**
 * CVData Model
 * Stores scraped CV/resume information with deduplication support
 * Optimized for 100K+ records with efficient indexing
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Contact information schema
const ContactInfoSchema = new Schema({
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    index: true,
    sparse: true,
  },
  phone: {
    type: String,
    trim: true,
    index: true,
    sparse: true,
  },
  alternativePhone: String,
  address: {
    street: String,
    city: String,
    state: String,
    country: {
      type: String,
      default: 'Myanmar',
    },
    postalCode: String,
  },
  socialLinks: {
    linkedin: String,
    github: String,
    portfolio: String,
    facebook: String,
    twitter: String,
    other: [String],
  },
  preferredContact: {
    type: String,
    enum: ['email', 'phone', 'whatsapp', 'linkedin', 'other'],
    default: 'email',
  },
}, { _id: false });

// Work experience schema
const WorkExperienceSchema = new Schema({
  company: {
    type: String,
    required: true,
    trim: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  department: String,
  location: String,
  startDate: Date,
  endDate: Date,
  isCurrent: {
    type: Boolean,
    default: false,
  },
  description: String,
  achievements: [String],
  skills: [String],
  employmentType: {
    type: String,
    enum: ['full_time', 'part_time', 'contract', 'freelance', 'internship', 'volunteer'],
  },
}, { _id: true });

// Education schema
const EducationSchema = new Schema({
  institution: {
    type: String,
    required: true,
    trim: true,
  },
  degree: {
    type: String,
    required: true,
    trim: true,
  },
  fieldOfStudy: String,
  location: String,
  startDate: Date,
  endDate: Date,
  isCurrent: {
    type: Boolean,
    default: false,
  },
  gpa: String,
  honors: [String],
  description: String,
}, { _id: true });

// Skills schema
const SkillsSchema = new Schema({
  technical: [{
    name: String,
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    },
    yearsOfExperience: Number,
    lastUsed: Date,
  }],
  soft: [String],
  languages: [{
    language: String,
    proficiency: {
      type: String,
      enum: ['basic', 'conversational', 'fluent', 'native'],
    },
  }],
  certifications: [{
    name: String,
    issuer: String,
    issueDate: Date,
    expiryDate: Date,
    credentialId: String,
    url: String,
  }],
  tools: [String],
  frameworks: [String],
  databases: [String],
  cloud: [String],
  methodologies: [String],
}, { _id: false });

// Project schema
const ProjectSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  description: String,
  url: String,
  startDate: Date,
  endDate: Date,
  isCurrent: {
    type: Boolean,
    default: false,
  },
  technologies: [String],
  role: String,
  teamSize: Number,
}, { _id: true });

// Source information schema
const SourceInfoSchema = new Schema({
  sourceId: {
    type: Schema.Types.ObjectId,
    ref: 'ScrapingSource',
    required: true,
  },
  sourceName: String,
  externalId: String, // ID from the source website
  profileUrl: String,
  scrapedAt: {
    type: Date,
    default: Date.now,
  },
  lastUpdatedAt: {
    type: Date,
    default: Date.now,
  },
  scrapeJobId: {
    type: Schema.Types.ObjectId,
    ref: 'ScrapingJob',
  },
  rawData: Schema.Types.Mixed,
}, { _id: false });

// Deduplication schema
const DeduplicationSchema = new Schema({
  hash: {
    type: String,
    index: true,
  },
  duplicateOf: {
    type: Schema.Types.ObjectId,
    ref: 'CVData',
  },
  duplicates: [{
    type: Schema.Types.ObjectId,
    ref: 'CVData',
  }],
  confidence: {
    type: Number,
    min: 0,
    max: 1,
  },
  matchFields: [String],
  lastCheckedAt: Date,
}, { _id: false });

// Data quality schema
const DataQualitySchema = new Schema({
  overallScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  completeness: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  accuracy: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  freshness: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  validationErrors: [{
    field: String,
    message: String,
    severity: {
      type: String,
      enum: ['info', 'warning', 'error', 'critical'],
    },
  }],
  lastValidatedAt: Date,
}, { _id: false });

// Enriched data schema
const EnrichedDataSchema = new Schema({
  extractedSkills: [{
    skill: String,
    confidence: Number,
    source: String,
  }],
  inferredExperience: {
    totalYears: Number,
    level: {
      type: String,
      enum: ['entry', 'junior', 'mid', 'senior', 'lead', 'executive'],
    },
    primaryIndustry: String,
    primaryFunction: String,
  },
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
    skillGaps: [String],
    recommendations: [String],
  },
  enrichmentDate: {
    type: Date,
    default: Date.now,
  },
  enrichmentVersion: String,
}, { _id: false });

// CV Data Schema
const CVDataSchema = new Schema({
  // Basic Information
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    index: true,
  },
  firstName: String,
  lastName: String,
  headline: {
    type: String,
    trim: true,
  },
  summary: {
    type: String,
    trim: true,
  },
  
  // Current Position
  currentTitle: String,
  currentCompany: String,
  currentLocation: String,
  
  // Contact Information
  contact: {
    type: ContactInfoSchema,
    default: () => ({}),
  },
  
  // Professional Information
  experience: [WorkExperienceSchema],
  education: [EducationSchema],
  skills: {
    type: SkillsSchema,
    default: () => ({}),
  },
  projects: [ProjectSchema],
  
  // Calculated Fields
  totalExperienceYears: {
    type: Number,
    min: 0,
  },
  experienceLevel: {
    type: String,
    enum: ['entry', 'junior', 'mid', 'senior', 'lead', 'executive'],
    index: true,
  },
  
  // Source Information
  source: {
    type: SourceInfoSchema,
    required: true,
  },
  
  // Additional Sources (for merged profiles)
  additionalSources: [SourceInfoSchema],
  
  // Deduplication
  deduplication: {
    type: DeduplicationSchema,
    default: () => ({}),
  },
  
  // Data Quality
  quality: {
    type: DataQualitySchema,
    default: () => ({}),
  },
  
  // Enriched Data
  enriched: {
    type: EnrichedDataSchema,
    default: () => ({}),
  },
  
  // Status
  status: {
    type: String,
    enum: ['new', 'processed', 'validated', 'enriched', 'contacted', 'converted', 'archived', 'duplicate'],
    default: 'new',
    index: true,
  },
  
  // Visibility
  isPublic: {
    type: Boolean,
    default: false,
  },
  isAnonymized: {
    type: Boolean,
    default: false,
  },
  
  // Search and Matching
  searchableText: {
    type: String,
    index: 'text',
  },
  keywords: [{
    type: String,
    index: true,
  }],
  
  // Metadata
  viewCount: {
    type: Number,
    default: 0,
  },
  downloadCount: {
    type: Number,
    default: 0,
  },
  lastViewedAt: Date,
  
  // Tags and Categories
  tags: [String],
  categories: [String],
  industries: [String],
  functions: [String],
  
  // Processing
  processingHistory: [{
    action: String,
    timestamp: { type: Date, default: Date.now },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    details: Schema.Types.Mixed,
  }],
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for efficient querying
CVDataSchema.index({ 'contact.email': 1 }, { sparse: true, unique: true });
CVDataSchema.index({ 'contact.phone': 1 }, { sparse: true });
CVDataSchema.index({ fullName: 'text', headline: 'text', summary: 'text' });
CVDataSchema.index({ keywords: 1 });
CVDataSchema.index({ status: 1, createdAt: -1 });
CVDataSchema.index({ experienceLevel: 1, 'skills.technical.name': 1 });
CVDataSchema.index({ 'source.sourceId': 1, 'source.scrapedAt': -1 });
CVDataSchema.index({ 'deduplication.hash': 1 });
CVDataSchema.index({ industries: 1 });
CVDataSchema.index({ functions: 1 });
CVDataSchema.index({ tags: 1 });
CVDataSchema.index({ totalExperienceYears: 1 });
CVDataSchema.index({ currentLocation: 1 });
CVDataSchema.index({ 'quality.overallScore': -1 });
CVDataSchema.index({ createdAt: -1 });

// Compound indexes
CVDataSchema.index({ status: 1, experienceLevel: 1, createdAt: -1 });
CVDataSchema.index({ 'source.sourceId': 1, status: 1 });

// Virtual for age of data
CVDataSchema.virtual('dataAge').get(function() {
  const now = new Date();
  const scraped = this.source?.scrapedAt || this.createdAt;
  return Math.floor((now - scraped) / (1000 * 60 * 60 * 24)); // days
});

// Virtual for isFresh
CVDataSchema.virtual('isFresh').get(function() {
  return this.dataAge <= 30; // Consider fresh if less than 30 days old
});

// Virtual for hasCompleteData
CVDataSchema.virtual('hasCompleteData').get(function() {
  return this.quality?.completeness >= 80;
});

// Pre-save middleware to generate searchable text and calculate experience
CVDataSchema.pre('save', function(next) {
  // Generate searchable text
  const textParts = [
    this.fullName,
    this.headline,
    this.summary,
    this.currentTitle,
    this.currentCompany,
    ...this.keywords || [],
    ...this.skills?.technical?.map(s => s.name) || [],
    ...this.skills?.soft || [],
  ];
  this.searchableText = textParts.filter(Boolean).join(' ');
  
  // Calculate total experience years
  if (this.experience && this.experience.length > 0) {
    let totalMonths = 0;
    this.experience.forEach(exp => {
      const start = exp.startDate;
      const end = exp.isCurrent ? new Date() : exp.endDate;
      if (start && end) {
        totalMonths += (end - start) / (1000 * 60 * 60 * 24 * 30);
      }
    });
    this.totalExperienceYears = Math.round(totalMonths / 12 * 10) / 10;
    
    // Determine experience level
    if (this.totalExperienceYears < 1) {
      this.experienceLevel = 'entry';
    } else if (this.totalExperienceYears < 3) {
      this.experienceLevel = 'junior';
    } else if (this.totalExperienceYears < 6) {
      this.experienceLevel = 'mid';
    } else if (this.totalExperienceYears < 10) {
      this.experienceLevel = 'senior';
    } else if (this.totalExperienceYears < 15) {
      this.experienceLevel = 'lead';
    } else {
      this.experienceLevel = 'executive';
    }
  }
  
  // Extract keywords from skills
  const allSkills = [
    ...(this.skills?.technical?.map(s => s.name) || []),
    ...(this.skills?.soft || []),
    ...(this.skills?.tools || []),
    ...(this.skills?.frameworks || []),
    ...(this.skills?.databases || []),
    ...(this.skills?.cloud || []),
  ];
  this.keywords = [...new Set(allSkills.map(s => s.toLowerCase()))];
  
  next();
});

// Method to mark as duplicate
CVDataSchema.methods.markAsDuplicate = async function(duplicateOfId, confidence, matchFields) {
  this.status = 'duplicate';
  this.deduplication.duplicateOf = duplicateOfId;
  this.deduplication.confidence = confidence;
  this.deduplication.matchFields = matchFields;
  this.deduplication.lastCheckedAt = new Date();
  return this.save();
};

// Method to merge with another CV
CVDataSchema.methods.mergeWith = async function(otherCVId) {
  const otherCV = await this.constructor.findById(otherCVId);
  if (!otherCV) throw new Error('CV not found');
  
  // Add other source to additional sources
  this.additionalSources.push(otherCV.source);
  this.additionalSources.push(...(otherCV.additionalSources || []));
  
  // Merge skills (union)
  const existingSkills = new Set(this.keywords);
  otherCV.keywords.forEach(skill => existingSkills.add(skill));
  this.keywords = Array.from(existingSkills);
  
  // Update last updated
  this.source.lastUpdatedAt = new Date();
  
  return this.save();
};

// Method to update quality score
CVDataSchema.methods.updateQualityScore = async function() {
  let completeness = 0;
  const fields = [
    { field: 'fullName', weight: 10 },
    { field: 'contact.email', weight: 15 },
    { field: 'contact.phone', weight: 10 },
    { field: 'headline', weight: 10 },
    { field: 'summary', weight: 10 },
    { field: 'experience', weight: 15, isArray: true },
    { field: 'education', weight: 10, isArray: true },
    { field: 'skills.technical', weight: 10, isArray: true },
    { field: 'currentTitle', weight: 5 },
    { field: 'currentCompany', weight: 5 },
  ];
  
  let totalWeight = 0;
  let filledWeight = 0;
  
  fields.forEach(({ field, weight, isArray }) => {
    totalWeight += weight;
    const value = field.split('.').reduce((obj, key) => obj?.[key], this);
    if (isArray) {
      if (value && value.length > 0) filledWeight += weight;
    } else {
      if (value) filledWeight += weight;
    }
  });
  
  completeness = Math.round((filledWeight / totalWeight) * 100);
  
  // Calculate freshness
  const daysOld = this.dataAge;
  const freshness = Math.max(0, 100 - (daysOld * 2)); // Decreases by 2% per day
  
  this.quality.completeness = completeness;
  this.quality.freshness = freshness;
  this.quality.overallScore = Math.round((completeness + freshness) / 2);
  this.quality.lastValidatedAt = new Date();
  
  return this.save();
};

// Static method to find duplicates
CVDataSchema.statics.findDuplicates = async function(cvId) {
  const cv = await this.findById(cvId);
  if (!cv) throw new Error('CV not found');
  
  const query = {
    _id: { $ne: cvId },
    status: { $ne: 'duplicate' },
    $or: [],
  };
  
  // Check email
  if (cv.contact?.email) {
    query.$or.push({ 'contact.email': cv.contact.email });
  }
  
  // Check phone
  if (cv.contact?.phone) {
    query.$or.push({ 'contact.phone': cv.contact.phone });
  }
  
  // Check name + current company combination
  if (cv.fullName && cv.currentCompany) {
    query.$or.push({
      fullName: { $regex: new RegExp(cv.fullName, 'i') },
      currentCompany: { $regex: new RegExp(cv.currentCompany, 'i') },
    });
  }
  
  if (query.$or.length === 0) return [];
  
  return this.find(query).limit(10);
};

// Static method to search CVs
CVDataSchema.statics.search = async function(query, options = {}) {
  const searchQuery = {};
  
  // Text search
  if (query.q) {
    searchQuery.$text = { $search: query.q };
  }
  
  // Filters
  if (query.status) searchQuery.status = query.status;
  if (query.experienceLevel) searchQuery.experienceLevel = query.experienceLevel;
  if (query.sourceId) searchQuery['source.sourceId'] = query.sourceId;
  if (query.location) searchQuery.currentLocation = { $regex: query.location, $options: 'i' };
  if (query.minExperience) searchQuery.totalExperienceYears = { $gte: query.minExperience };
  if (query.maxExperience) {
    searchQuery.totalExperienceYears = searchQuery.totalExperienceYears || {};
    searchQuery.totalExperienceYears.$lte = query.maxExperience;
  }
  if (query.skills) {
    const skills = Array.isArray(query.skills) ? query.skills : [query.skills];
    searchQuery.keywords = { $in: skills.map(s => s.toLowerCase()) };
  }
  if (query.industries) {
    searchQuery.industries = { $in: Array.isArray(query.industries) ? query.industries : [query.industries] };
  }
  
  // Quality filter
  if (query.minQuality) {
    searchQuery['quality.overallScore'] = { $gte: query.minQuality };
  }
  
  // Date range
  if (query.dateFrom || query.dateTo) {
    searchQuery['source.scrapedAt'] = {};
    if (query.dateFrom) searchQuery['source.scrapedAt'].$gte = new Date(query.dateFrom);
    if (query.dateTo) searchQuery['source.scrapedAt'].$lte = new Date(query.dateTo);
  }
  
  let cursor = this.find(searchQuery);
  
  // Sorting
  if (query.sortBy) {
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    cursor = cursor.sort({ [query.sortBy]: sortOrder });
  } else {
    cursor = cursor.sort({ createdAt: -1 });
  }
  
  // Pagination
  const page = parseInt(options.page) || 1;
  const limit = parseInt(options.limit) || 20;
  cursor = cursor.skip((page - 1) * limit).limit(limit);
  
  const [data, total] = await Promise.all([
    cursor.exec(),
    this.countDocuments(searchQuery),
  ]);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

// Static method to get statistics
CVDataSchema.statics.getStatistics = async function(dateRange = {}) {
  const matchStage = {};
  if (dateRange.from || dateRange.to) {
    matchStage.createdAt = {};
    if (dateRange.from) matchStage.createdAt.$gte = new Date(dateRange.from);
    if (dateRange.to) matchStage.createdAt.$lte = new Date(dateRange.to);
  }
  
  const [statusStats, levelStats, sourceStats, dailyStats] = await Promise.all([
    // Status statistics
    this.aggregate([
      { $match: matchStage },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    
    // Experience level statistics
    this.aggregate([
      { $match: matchStage },
      { $group: { _id: '$experienceLevel', count: { $sum: 1 } } },
    ]),
    
    // Source statistics
    this.aggregate([
      { $match: matchStage },
      { $group: { _id: '$source.sourceId', count: { $sum: 1 } } },
    ]),
    
    // Daily statistics
    this.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);
  
  return {
    status: statusStats,
    experienceLevel: levelStats,
    source: sourceStats,
    daily: dailyStats,
    total: await this.countDocuments(matchStage),
  };
};

const CVData = mongoose.model('CVData', CVDataSchema);

module.exports = CVData;