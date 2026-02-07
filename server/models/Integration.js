/**
 * Integration Model
 * Represents third-party integrations available in the marketplace
 * Includes job boards, HRIS, CRM, and ATS integrations
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Config field schema for setup forms (embedded)
const ConfigFieldSchema = new Schema({
  key: {
    type: String,
    required: true,
    trim: true,
  },
  label: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['text', 'password', 'email', 'url', 'number', 'select', 'multiselect', 'checkbox', 'toggle', 'textarea'],
    required: true,
  },
  description: {
    type: String,
    trim: true,
  },
  placeholder: {
    type: String,
    trim: true,
  },
  required: {
    type: Boolean,
    default: false,
  },
  defaultValue: {
    type: Schema.Types.Mixed,
  },
  options: [{
    label: String,
    value: Schema.Types.Mixed,
  }],
  validation: {
    pattern: String,
    min: Number,
    max: Number,
    minLength: Number,
    maxLength: Number,
  },
  order: {
    type: Number,
    default: 0,
  },
}, { _id: true });

// API endpoint schema (embedded)
const APIEndpointSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    required: true,
  },
  path: {
    type: String,
    required: true,
    trim: true,
  },
  parameters: [{
    name: String,
    type: String,
    required: Boolean,
    description: String,
  }],
  headers: [{
    key: String,
    value: String,
  }],
  requestBody: {
    type: Schema.Types.Mixed,
  },
  responseExample: {
    type: Schema.Types.Mixed,
  },
  isWebhook: {
    type: Boolean,
    default: false,
  },
}, { _id: true });

// Setup step schema (embedded)
const SetupStepSchema = new Schema({
  order: {
    type: Number,
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  instructions: {
    type: String,
    trim: true,
  },
  codeExample: {
    type: String,
  },
  imageUrl: {
    type: String,
  },
  videoUrl: {
    type: String,
  },
  required: {
    type: Boolean,
    default: true,
  },
}, { _id: true });

// Pricing tier schema (embedded)
const PricingTierSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  price: {
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'MMK',
    },
    billingPeriod: {
      type: String,
      enum: ['monthly', 'yearly', 'one_time', 'usage_based'],
      default: 'monthly',
    },
  },
  features: [{
    type: String,
  }],
  limits: {
    apiCalls: Number,
    records: Number,
    users: Number,
  },
  isPopular: {
    type: Boolean,
    default: false,
  },
}, { _id: true });

// Feature schema (embedded)
const FeatureSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  icon: {
    type: String,
  },
  category: {
    type: String,
    enum: ['sync', 'automation', 'analytics', 'management', 'communication'],
  },
}, { _id: true });

// Review schema (embedded)
const ReviewSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  title: {
    type: String,
    trim: true,
  },
  comment: {
    type: String,
    trim: true,
  },
  pros: [{
    type: String,
  }],
  cons: [{
    type: String,
  }],
  helpful: {
    type: Number,
    default: 0,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: true });

// Main Integration schema
const IntegrationSchema = new Schema({
  integrationId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Integration name is required'],
    trim: true,
    maxlength: [100, 'Integration name cannot exceed 100 characters'],
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: [150, 'Short description cannot exceed 150 characters'],
  },
  category: {
    type: String,
    enum: ['job-board', 'hris', 'crm', 'ats', 'analytics', 'communication', 'productivity', 'payment', 'other'],
    required: true,
    index: true,
  },
  subcategory: {
    type: String,
    trim: true,
  },
  provider: {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    supportUrl: {
      type: String,
      trim: true,
    },
    documentationUrl: {
      type: String,
      trim: true,
    },
    logo: {
      type: String,
    },
    icon: {
      type: String,
    },
  },
  features: [FeatureSchema],
  // Configuration schema for setup
  configSchema: [ConfigFieldSchema],
  // Setup guide
  setupGuide: {
    estimatedTime: {
      type: String,
      default: '15 minutes',
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'easy',
    },
    prerequisites: [{
      type: String,
    }],
    steps: [SetupStepSchema],
  },
  // API endpoints
  apiEndpoints: [APIEndpointSchema],
  // Webhook configuration
  webhooks: {
    supported: {
      type: Boolean,
      default: false,
    },
    events: [{
      type: String,
    }],
    documentation: {
      type: String,
    },
  },
  // Pricing
  pricing: {
    type: {
      type: String,
      enum: ['free', 'freemium', 'paid', 'enterprise'],
      default: 'free',
    },
    tiers: [PricingTierSchema],
    hasTrial: {
      type: Boolean,
      default: false,
    },
    trialDays: {
      type: Number,
      default: 14,
    },
  },
  // Stats
  stats: {
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    installCount: {
      type: Number,
      default: 0,
    },
    activeInstalls: {
      type: Number,
      default: 0,
    },
  },
  reviews: [ReviewSchema],
  // Compatibility
  compatibility: {
    platforms: [{
      type: String,
      enum: ['web', 'ios', 'android', 'desktop'],
    }],
    browsers: [{
      type: String,
    }],
    requirements: [{
      type: String,
    }],
  },
  // Data sync settings
  dataSync: {
    supported: {
      type: Boolean,
      default: false,
    },
    syncFrequency: {
      type: String,
      enum: ['realtime', 'hourly', 'daily', 'manual'],
      default: 'manual',
    },
    syncDirection: {
      type: String,
      enum: ['one_way', 'two_way'],
      default: 'one_way',
    },
    supportedEntities: [{
      type: String,
      enum: ['jobs', 'candidates', 'applications', 'companies', 'users', 'referrals', 'analytics'],
    }],
  },
  // Security
  security: {
    authentication: {
      type: [String],
      enum: ['api_key', 'oauth2', 'basic_auth', 'token', 'saml', 'none'],
    },
    encryption: {
      type: Boolean,
      default: true,
    },
    dataRetention: {
      type: String,
      default: '30_days',
    },
    gdprCompliant: {
      type: Boolean,
      default: false,
    },
    soc2Compliant: {
      type: Boolean,
      default: false,
    },
  },
  // Support
  support: {
    email: {
      type: String,
    },
    phone: {
      type: String,
    },
    chat: {
      type: Boolean,
      default: false,
    },
    documentation: {
      type: String,
    },
    community: {
      type: String,
    },
    responseTime: {
      type: String,
      default: '24 hours',
    },
  },
  // Tags
  tags: [{
    type: String,
    trim: true,
  }],
  // Status
  status: {
    type: String,
    enum: ['draft', 'pending_review', 'active', 'deprecated', 'suspended'],
    default: 'draft',
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  isPublic: {
    type: Boolean,
    default: true,
  },
  // Display order
  displayOrder: {
    type: Number,
    default: 0,
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  publishedAt: {
    type: Date,
  },
}, {
  timestamps: { createdAt: true, updatedAt: true },
});

// Indexes
IntegrationSchema.index({ category: 1, status: 1 });
IntegrationSchema.index({ slug: 1 });
IntegrationSchema.index({ 'provider.name': 1 });
IntegrationSchema.index({ tags: 1 });
IntegrationSchema.index({ isFeatured: 1, status: 1 });
IntegrationSchema.index({ 'stats.rating': -1 });
IntegrationSchema.index({ displayOrder: 1 });

// Text search index
IntegrationSchema.index({
  name: 'text',
  description: 'text',
  'provider.name': 'text',
  tags: 'text',
});

// Virtual for average rating calculation
IntegrationSchema.virtual('averageRating').get(function() {
  if (!this.reviews || this.reviews.length === 0) return 0;
  const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
  return Math.round((sum / this.reviews.length) * 10) / 10;
});

// Method to add a review
IntegrationSchema.methods.addReview = async function(userId, reviewData) {
  const existingReviewIndex = this.reviews.findIndex(
    r => r.userId.toString() === userId.toString()
  );

  if (existingReviewIndex >= 0) {
    // Update existing review
    this.reviews[existingReviewIndex] = {
      ...this.reviews[existingReviewIndex].toObject(),
      ...reviewData,
      updatedAt: new Date(),
    };
  } else {
    // Add new review
    this.reviews.push({
      userId,
      ...reviewData,
    });
    this.stats.reviewCount += 1;
  }

  // Recalculate rating
  const sum = this.reviews.reduce((acc, r) => acc + r.rating, 0);
  this.stats.rating = Math.round((sum / this.reviews.length) * 10) / 10;

  return this.save();
};

// Method to increment install count
IntegrationSchema.methods.incrementInstalls = async function() {
  this.stats.installCount += 1;
  this.stats.activeInstalls += 1;
  return this.save();
};

// Method to decrement active installs
IntegrationSchema.methods.decrementActiveInstalls = async function() {
  this.stats.activeInstalls = Math.max(0, this.stats.activeInstalls - 1);
  return this.save();
};

// Static method to find by category
IntegrationSchema.statics.findByCategory = function(category, filters = {}) {
  return this.find({ category, status: 'active', ...filters })
    .sort({ isFeatured: -1, displayOrder: 1, 'stats.rating': -1 });
};

// Static method to search integrations
IntegrationSchema.statics.search = function(query, filters = {}) {
  const searchCriteria = {
    status: 'active',
    ...filters,
    $or: [
      { $text: { $search: query } },
      { name: { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } },
    ],
  };

  return this.find(searchCriteria)
    .sort({ isFeatured: -1, 'stats.rating': -1 });
};

// Static method to get featured integrations
IntegrationSchema.statics.getFeatured = function(limit = 6) {
  return this.find({ isFeatured: true, status: 'active' })
    .sort({ displayOrder: 1, 'stats.rating': -1 })
    .limit(limit);
};

// Static method to get popular integrations
IntegrationSchema.statics.getPopular = function(limit = 10) {
  return this.find({ status: 'active' })
    .sort({ 'stats.installCount': -1, 'stats.rating': -1 })
    .limit(limit);
};

const Integration = mongoose.model('Integration', IntegrationSchema);

module.exports = Integration;
