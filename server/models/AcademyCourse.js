/**
 * Academy Course Model
 * Educational content for Referral Academy module
 */

const mongoose = require('mongoose');

const CONTENT_TYPE = {
  VIDEO: 'video',
  ARTICLE: 'article',
  QUIZ: 'quiz',
  INTERACTIVE: 'interactive',
  PDF: 'pdf',
};

const DIFFICULTY_LEVEL = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
};

const COURSE_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
};

const academyCourseSchema = new mongoose.Schema({
  title: {
    en: { type: String, required: true },
    my: { type: String, required: true },
  },
  description: {
    en: { type: String, required: true },
    my: { type: String, required: true },
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  category: {
    type: String,
    required: true,
    enum: [
      'getting_started',
      'referral_strategies',
      'payment_system',
      'kyc_verification',
      'advanced_techniques',
      'success_stories',
      'platform_guide',
      'myanmar_market',
    ],
    index: true,
  },
  difficulty: {
    type: String,
    enum: Object.values(DIFFICULTY_LEVEL),
    default: DIFFICULTY_LEVEL.BEGINNER,
  },
  status: {
    type: String,
    enum: Object.values(COURSE_STATUS),
    default: COURSE_STATUS.DRAFT,
  },
  content: [{
    order: { type: Number, required: true },
    title: {
      en: { type: String, required: true },
      my: { type: String, required: true },
    },
    type: {
      type: String,
      enum: Object.values(CONTENT_TYPE),
      required: true,
    },
    content: {
      en: { type: String },
      my: { type: String },
    },
    videoUrl: { type: String },
    pdfUrl: { type: String },
    duration: { type: Number }, // in minutes
    quiz: [{
      question: {
        en: { type: String, required: true },
        my: { type: String, required: true },
      },
      options: [{
        en: { type: String, required: true },
        my: { type: String, required: true },
      }],
      correctAnswer: { type: Number, required: true },
      explanation: {
        en: { type: String },
        my: { type: String },
      },
    }],
    isRequired: { type: Boolean, default: true },
  }],
  thumbnailUrl: { type: String },
  estimatedDuration: { type: Number }, // total in minutes
  points: { type: Number, default: 0 }, // gamification points
  badgeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Badge' },
  prerequisites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AcademyCourse' }],
  tags: [{ type: String }],
  metadata: {
    author: { type: String },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    publishedAt: { type: Date },
    lastUpdatedAt: { type: Date },
    viewCount: { type: Number, default: 0 },
    completionCount: { type: Number, default: 0 },
  },
  isFeatured: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
}, {
  timestamps: true,
});

// Indexes
academyCourseSchema.index({ category: 1, status: 1 });
academyCourseSchema.index({ difficulty: 1, status: 1 });
academyCourseSchema.index({ tags: 1 });
academyCourseSchema.index({ isFeatured: 1, order: 1 });

// Methods
academyCourseSchema.methods.publish = async function() {
  this.status = COURSE_STATUS.PUBLISHED;
  this.metadata.publishedAt = new Date();
  return this.save();
};

academyCourseSchema.methods.archive = async function() {
  this.status = COURSE_STATUS.ARCHIVED;
  return this.save();
};

academyCourseSchema.methods.incrementViews = async function() {
  this.metadata.viewCount += 1;
  return this.save();
};

academyCourseSchema.methods.incrementCompletions = async function() {
  this.metadata.completionCount += 1;
  return this.save();
};

// Statics
academyCourseSchema.statics.findPublished = function(query = {}) {
  return this.find({ ...query, status: COURSE_STATUS.PUBLISHED });
};

academyCourseSchema.statics.findByCategory = function(category) {
  return this.findPublished({ category });
};

academyCourseSchema.statics.findFeatured = function() {
  return this.findPublished({ isFeatured: true }).sort({ order: 1 });
};

module.exports = mongoose.model('AcademyCourse', academyCourseSchema);
module.exports.CONTENT_TYPE = CONTENT_TYPE;
module.exports.DIFFICULTY_LEVEL = DIFFICULTY_LEVEL;
module.exports.COURSE_STATUS = COURSE_STATUS;
