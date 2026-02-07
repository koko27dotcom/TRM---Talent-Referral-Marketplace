/**
 * Plugin Model
 * Represents marketplace plugins that extend platform functionality
 * Includes plugin management, versioning, and developer revenue sharing
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Version schema for plugin versions (embedded)
const VersionSchema = new Schema({
  version: {
    type: String,
    required: true,
    trim: true,
  },
  changelog: {
    type: String,
    required: true,
  },
  downloadUrl: {
    type: String,
    required: true,
  },
  minPlatformVersion: {
    type: String,
  },
  maxPlatformVersion: {
    type: String,
  },
  fileSize: {
    type: Number, // in bytes
  },
  checksum: {
    type: String,
  },
  isStable: {
    type: Boolean,
    default: true,
  },
  isPrerelease: {
    type: Boolean,
    default: false,
  },
  releaseDate: {
    type: Date,
    default: Date.now,
  },
  deprecated: {
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
}, { _id: true });

// Screenshot/Gallery schema (embedded)
const ScreenshotSchema = new Schema({
  url: {
    type: String,
    required: true,
  },
  caption: {
    type: String,
    trim: true,
  },
  order: {
    type: Number,
    default: 0,
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
  version: {
    type: String,
    trim: true,
  },
  helpful: {
    type: Number,
    default: 0,
  },
  isVerifiedPurchase: {
    type: Boolean,
    default: false,
  },
  isDeveloperResponse: {
    type: Boolean,
    default: false,
  },
  developerResponse: {
    comment: String,
    respondedAt: Date,
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

// Installation record schema (embedded)
const InstallationSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
  },
  version: {
    type: String,
    required: true,
  },
  installedAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  config: {
    type: Schema.Types.Mixed,
    default: {},
  },
  lastUsedAt: {
    type: Date,
  },
}, { _id: true });

// Developer/Publisher schema (embedded)
const DeveloperSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
  },
  website: {
    type: String,
    trim: true,
  },
  logo: {
    type: String,
  },
  bio: {
    type: String,
    trim: true,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  totalPlugins: {
    type: Number,
    default: 0,
  },
  totalDownloads: {
    type: Number,
    default: 0,
  },
}, { _id: false });

// Pricing tier schema (embedded)
const PricingSchema = new Schema({
  type: {
    type: String,
    enum: ['free', 'paid', 'subscription', 'freemium'],
    default: 'free',
  },
  price: {
    type: Number,
    default: 0,
  },
  currency: {
    type: String,
    default: 'MMK',
  },
  billingPeriod: {
    type: String,
    enum: ['one_time', 'monthly', 'yearly'],
    default: 'one_time',
  },
  trialDays: {
    type: Number,
    default: 0,
  },
  hasFreeVersion: {
    type: Boolean,
    default: false,
  },
  freeVersionLimitations: [{
    type: String,
  }],
}, { _id: false });

// Revenue share schema (embedded)
const RevenueShareSchema = new Schema({
  developerPercent: {
    type: Number,
    default: 70,
    min: 0,
    max: 100,
  },
  platformPercent: {
    type: Number,
    default: 30,
    min: 0,
    max: 100,
  },
  partnerPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  totalRevenue: {
    type: Number,
    default: 0,
  },
  developerEarnings: {
    type: Number,
    default: 0,
  },
  platformEarnings: {
    type: Number,
    default: 0,
  },
}, { _id: false });

// Main Plugin schema
const PluginSchema = new Schema({
  pluginId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  name: {
    type: String,
    required: [true, 'Plugin name is required'],
    trim: true,
    maxlength: [100, 'Plugin name cannot exceed 100 characters'],
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: [200, 'Short description cannot exceed 200 characters'],
  },
  // Versioning
  version: {
    type: String,
    required: true,
    trim: true,
  },
  versions: [VersionSchema],
  // Category
  category: {
    type: String,
    enum: ['analytics', 'automation', 'communication', 'crm', 'customization', 'integration', 'marketing', 'productivity', 'reporting', 'security', 'other'],
    required: true,
    index: true,
  },
  subcategory: {
    type: String,
    trim: true,
  },
  tags: [{
    type: String,
    trim: true,
  }],
  // Developer info
  author: {
    type: DeveloperSchema,
    required: true,
  },
  // Features
  features: [FeatureSchema],
  // Media
  icon: {
    type: String,
  },
  banner: {
    type: String,
  },
  screenshots: [ScreenshotSchema],
  videoUrl: {
    type: String,
  },
  demoUrl: {
    type: String,
  },
  // Documentation
  documentationUrl: {
    type: String,
  },
  supportUrl: {
    type: String,
  },
  repositoryUrl: {
    type: String,
  },
  // Installation
  installationUrl: {
    type: String,
  },
  installationInstructions: {
    type: String,
  },
  requirements: [{
    type: String,
  }],
  compatibleWith: [{
    platform: String,
    minVersion: String,
    maxVersion: String,
  }],
  // Pricing
  pricing: {
    type: PricingSchema,
    default: () => ({}),
  },
  // Revenue sharing
  revenueShare: {
    type: RevenueShareSchema,
    default: () => ({}),
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
    downloads: {
      type: Number,
      default: 0,
    },
    activeInstalls: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
  },
  reviews: [ReviewSchema],
  installations: [InstallationSchema],
  // Status
  status: {
    type: String,
    enum: ['draft', 'pending_review', 'approved', 'published', 'suspended', 'deprecated', 'removed'],
    default: 'draft',
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  isPublic: {
    type: Boolean,
    default: true,
  },
  // Review status
  reviewStatus: {
    submittedAt: {
      type: Date,
    },
    reviewedAt: {
      type: Date,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: String,
    },
    securityChecked: {
      type: Boolean,
      default: false,
    },
    codeReviewed: {
      type: Boolean,
      default: false,
    },
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
  publishedAt: {
    type: Date,
  },
  lastUpdatedAt: {
    type: Date,
  },
}, {
  timestamps: { createdAt: true, updatedAt: true },
});

// Indexes
PluginSchema.index({ category: 1, status: 1 });
PluginSchema.index({ slug: 1 });
PluginSchema.index({ tags: 1 });
PluginSchema.index({ isFeatured: 1, status: 1 });
PluginSchema.index({ isVerified: 1, status: 1 });
PluginSchema.index({ 'stats.rating': -1 });
PluginSchema.index({ 'stats.downloads': -1 });
PluginSchema.index({ 'author.userId': 1 });
PluginSchema.index({ displayOrder: 1 });

// Text search index
PluginSchema.index({
  name: 'text',
  description: 'text',
  tags: 'text',
  'author.name': 'text',
});

// Virtual for average rating calculation
PluginSchema.virtual('averageRating').get(function() {
  if (!this.reviews || this.reviews.length === 0) return 0;
  const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
  return Math.round((sum / this.reviews.length) * 10) / 10;
});

// Virtual for latest version
PluginSchema.virtual('latestVersion').get(function() {
  if (!this.versions || this.versions.length === 0) return this.version;
  const sorted = [...this.versions].sort((a, b) => 
    new Date(b.releaseDate) - new Date(a.releaseDate)
  );
  return sorted[0]?.version || this.version;
});

// Method to add a review
PluginSchema.methods.addReview = async function(userId, reviewData) {
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

// Method to record installation
PluginSchema.methods.recordInstallation = async function(userId, companyId, version) {
  const existingInstall = this.installations.find(
    i => i.userId.toString() === userId.toString()
  );

  if (existingInstall) {
    existingInstall.version = version;
    existingInstall.updatedAt = new Date();
    existingInstall.isActive = true;
  } else {
    this.installations.push({
      userId,
      companyId,
      version,
    });
    this.stats.activeInstalls += 1;
  }

  this.stats.downloads += 1;
  this.lastUpdatedAt = new Date();

  return this.save();
};

// Method to record uninstallation
PluginSchema.methods.recordUninstallation = async function(userId) {
  const install = this.installations.find(
    i => i.userId.toString() === userId.toString()
  );

  if (install) {
    install.isActive = false;
    install.updatedAt = new Date();
    this.stats.activeInstalls = Math.max(0, this.stats.activeInstalls - 1);
    return this.save();
  }

  return this;
};

// Method to add version
PluginSchema.methods.addVersion = async function(versionData) {
  this.versions.push(versionData);
  this.version = versionData.version;
  this.lastUpdatedAt = new Date();
  return this.save();
};

// Method to record sale/revenue
PluginSchema.methods.recordRevenue = async function(amount) {
  this.revenueShare.totalRevenue += amount;
  this.revenueShare.developerEarnings += amount * (this.revenueShare.developerPercent / 100);
  this.revenueShare.platformEarnings += amount * (this.revenueShare.platformPercent / 100);
  return this.save();
};

// Method to increment views
PluginSchema.methods.incrementViews = async function() {
  this.stats.views += 1;
  return this.save();
};

// Static method to find by category
PluginSchema.statics.findByCategory = function(category, filters = {}) {
  return this.find({ category, status: 'published', ...filters })
    .sort({ isFeatured: -1, 'stats.rating': -1, 'stats.downloads': -1 });
};

// Static method to search plugins
PluginSchema.statics.search = function(query, filters = {}) {
  const searchCriteria = {
    status: 'published',
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

// Static method to get featured plugins
PluginSchema.statics.getFeatured = function(limit = 6) {
  return this.find({ isFeatured: true, status: 'published' })
    .sort({ displayOrder: 1, 'stats.rating': -1 })
    .limit(limit);
};

// Static method to get popular plugins
PluginSchema.statics.getPopular = function(limit = 10) {
  return this.find({ status: 'published' })
    .sort({ 'stats.downloads': -1, 'stats.rating': -1 })
    .limit(limit);
};

// Static method to get plugins by developer
PluginSchema.statics.getByDeveloper = function(userId) {
  return this.find({ 'author.userId': userId })
    .sort({ createdAt: -1 });
};

// Static method to get developer stats
PluginSchema.statics.getDeveloperStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { 'author.userId': new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalPlugins: { $sum: 1 },
        publishedPlugins: {
          $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] },
        },
        totalDownloads: { $sum: '$stats.downloads' },
        totalActiveInstalls: { $sum: '$stats.activeInstalls' },
        totalRevenue: { $sum: '$revenueShare.developerEarnings' },
        averageRating: { $avg: '$stats.rating' },
      },
    },
  ]);

  return stats[0] || {
    totalPlugins: 0,
    publishedPlugins: 0,
    totalDownloads: 0,
    totalActiveInstalls: 0,
    totalRevenue: 0,
    averageRating: 0,
  };
};

const Plugin = mongoose.model('Plugin', PluginSchema);

module.exports = Plugin;
