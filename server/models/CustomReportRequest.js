const mongoose = require('mongoose');

const customReportRequestSchema = new mongoose.Schema({
  requestId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'customerType'
  },
  customerType: {
    type: String,
    enum: ['User', 'Company'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String
  },
  requirements: {
    objectives: [{
      type: String
    }],
    keyQuestions: [{
      type: String
    }],
    targetAudience: String,
    useCase: String
  },
  specifications: {
    dataSources: [{
      type: String,
      enum: ['job-postings', 'applications', 'user-profiles', 'company-data', 'salary-data', 'market-trends', 'external']
    }],
    industries: [{
      type: String
    }],
    locations: [{
      country: String,
      state: String,
      city: String
    }],
    roles: [{
      type: String
    }],
    skills: [{
      type: String
    }],
    dateRange: {
      startDate: Date,
      endDate: Date
    },
    formats: [{
      type: String,
      enum: ['pdf', 'excel', 'csv', 'json', 'dashboard']
    }],
    visualizations: [{
      type: String,
      enum: ['tables', 'charts', 'graphs', 'maps', 'infographics']
    }],
    specialRequirements: String
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'review', 'completed', 'delivered', 'cancelled'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  assignedAnalyst: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  price: {
    amount: {
      type: Number,
      min: 0
    },
    currency: {
      type: String,
      enum: ['MMK', 'USD'],
      default: 'MMK'
    },
    quotedAt: Date,
    quoteExpiresAt: Date
  },
  paymentStatus: {
    type: String,
    enum: ['pending-quote', 'quoted', 'awaiting-payment', 'paid', 'refunded'],
    default: 'pending-quote'
  },
  deliveryDate: {
    type: Date
  },
  actualDeliveryDate: {
    type: Date
  },
  deliverables: [{
    type: {
      type: String,
      enum: ['report', 'presentation', 'dashboard', 'raw-data', 'summary']
    },
    name: String,
    description: String,
    fileUrl: String,
    fileSize: Number,
    uploadedAt: Date
  }],
  timeline: [{
    status: String,
    note: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  notes: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: String,
    isInternal: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    submittedAt: Date
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

// Indexes
customReportRequestSchema.index({ customerId: 1, customerType: 1 });
customReportRequestSchema.index({ status: 1 });
customReportRequestSchema.index({ assignedAnalyst: 1 });
customReportRequestSchema.index({ priority: 1, createdAt: 1 });
customReportRequestSchema.index({ createdAt: -1 });

// Pre-save middleware
customReportRequestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to update status with timeline entry
customReportRequestSchema.methods.updateStatus = async function(newStatus, note, updatedBy) {
  const oldStatus = this.status;
  this.status = newStatus;
  
  this.timeline.push({
    status: newStatus,
    note: note || `Status changed from ${oldStatus} to ${newStatus}`,
    updatedBy,
    updatedAt: new Date()
  });
  
  if (newStatus === 'delivered') {
    this.actualDeliveryDate = new Date();
  }
  
  await this.save();
};

// Method to add note
customReportRequestSchema.methods.addNote = async function(author, content, isInternal = false) {
  this.notes.push({
    author,
    content,
    isInternal,
    createdAt: new Date()
  });
  await this.save();
};

// Method to submit feedback
customReportRequestSchema.methods.submitFeedback = async function(rating, comment) {
  this.feedback = {
    rating,
    comment,
    submittedAt: new Date()
  };
  await this.save();
};

// Method to add deliverable
customReportRequestSchema.methods.addDeliverable = async function(type, name, description, fileUrl, fileSize) {
  this.deliverables.push({
    type,
    name,
    description,
    fileUrl,
    fileSize,
    uploadedAt: new Date()
  });
  await this.save();
};

// Static method to get customer requests
customReportRequestSchema.statics.getCustomerRequests = function(customerId, customerType, options = {}) {
  const query = { customerId, customerType };
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .populate('assignedAnalyst', 'firstName lastName email')
    .sort(options.sortBy || { createdAt: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 20);
};

// Static method to get pending requests for analysts
customReportRequestSchema.statics.getPendingRequests = function(options = {}) {
  return this.find({
    status: { $in: ['pending', 'in-progress'] }
  })
    .populate('customerId', 'name email companyName')
    .sort({ priority: -1, createdAt: 1 })
    .skip(options.skip || 0)
    .limit(options.limit || 20);
};

// Static method to get requests by analyst
customReportRequestSchema.statics.getAnalystRequests = function(analystId, options = {}) {
  const query = { assignedAnalyst: analystId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .sort(options.sortBy || { priority: -1, createdAt: 1 })
    .skip(options.skip || 0)
    .limit(options.limit || 20);
};

module.exports = mongoose.model('CustomReportRequest', customReportRequestSchema);
