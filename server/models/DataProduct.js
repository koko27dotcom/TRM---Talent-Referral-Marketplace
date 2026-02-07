const mongoose = require('mongoose');

const dataProductSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['salary-report', 'market-intelligence', 'custom-report', 'data-api'],
    required: true
  },
  category: {
    type: String,
    enum: ['industry', 'role', 'location', 'skill', 'general'],
    default: 'general'
  },
  subcategory: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    enum: ['MMK', 'USD'],
    default: 'MMK'
  },
  accessType: {
    type: String,
    enum: ['one-time', 'subscription'],
    default: 'one-time'
  },
  subscriptionPeriod: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    required: function() {
      return this.accessType === 'subscription';
    }
  },
  dataRange: {
    startDate: Date,
    endDate: Date,
    industries: [String],
    locations: [String],
    roles: [String]
  },
  sampleData: {
    type: mongoose.Schema.Types.Mixed,
    description: 'Sample data for preview'
  },
  previewUrl: {
    type: String
  },
  previewImages: [{
    type: String
  }],
  fileFormats: [{
    type: String,
    enum: ['pdf', 'excel', 'csv', 'json', 'api']
  }],
  features: [{
    type: String
  }],
  specifications: {
    pages: Number,
    dataPoints: Number,
    charts: Number,
    updateFrequency: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  salesCount: {
    type: Number,
    default: 0
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  reviews: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [{
    type: String
  }],
  relatedProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DataProduct'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for efficient querying
dataProductSchema.index({ type: 1, category: 1 });
dataProductSchema.index({ price: 1 });
dataProductSchema.index({ isActive: 1, isFeatured: 1 });
dataProductSchema.index({ tags: 1 });
dataProductSchema.index({ 'rating.average': -1 });

// Pre-save middleware to update updatedAt
dataProductSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to add a review
dataProductSchema.methods.addReview = async function(userId, rating, comment) {
  this.reviews.push({ userId, rating, comment });
  
  // Recalculate average rating
  const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
  this.rating.average = totalRating / this.reviews.length;
  this.rating.count = this.reviews.length;
  
  await this.save();
};

// Static method to get featured products
dataProductSchema.statics.getFeatured = function(limit = 6) {
  return this.find({ isActive: true, isFeatured: true })
    .sort({ salesCount: -1, 'rating.average': -1 })
    .limit(limit);
};

// Static method to get products by category
dataProductSchema.statics.getByCategory = function(category, options = {}) {
  const query = { isActive: true };
  if (category !== 'all') {
    query.category = category;
  }
  
  return this.find(query)
    .sort(options.sortBy || { createdAt: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 20);
};

module.exports = mongoose.model('DataProduct', dataProductSchema);
