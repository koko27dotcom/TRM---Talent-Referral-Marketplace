const mongoose = require('mongoose');

const dataPurchaseSchema = new mongoose.Schema({
  purchaseId: {
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
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DataProduct',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    enum: ['MMK', 'USD'],
    default: 'MMK'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'disputed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['credit-card', 'bank-transfer', 'mobile-money', 'wallet', 'crypto'],
    required: function() {
      return this.paymentStatus === 'completed';
    }
  },
  paymentDetails: {
    transactionId: String,
    gateway: String,
    paidAt: Date,
    receiptUrl: String
  },
  accessGranted: {
    type: Boolean,
    default: false
  },
  accessGrantedAt: {
    type: Date
  },
  accessExpiresAt: {
    type: Date,
    required: true
  },
  downloadTokens: [{
    token: {
      type: String,
      required: true
    },
    format: {
      type: String,
      enum: ['pdf', 'excel', 'csv', 'json']
    },
    used: {
      type: Boolean,
      default: false
    },
    usedAt: Date,
    expiresAt: {
      type: Date,
      required: true
    }
  }],
  downloadsRemaining: {
    type: Number,
    default: 10
  },
  totalDownloads: {
    type: Number,
    default: 0
  },
  downloadHistory: [{
    downloadedAt: {
      type: Date,
      default: Date.now
    },
    format: String,
    ipAddress: String,
    userAgent: String
  }],
  refundReason: {
    type: String
  },
  refundAmount: {
    type: Number
  },
  refundAt: {
    type: Date
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
dataPurchaseSchema.index({ customerId: 1, customerType: 1 });
dataPurchaseSchema.index({ productId: 1 });
dataPurchaseSchema.index({ paymentStatus: 1 });
dataPurchaseSchema.index({ accessExpiresAt: 1 });
dataPurchaseSchema.index({ createdAt: -1 });

// Method to grant access
dataPurchaseSchema.methods.grantAccess = async function() {
  this.accessGranted = true;
  this.accessGrantedAt = new Date();
  this.paymentStatus = 'completed';
  await this.save();
};

// Method to record download
dataPurchaseSchema.methods.recordDownload = async function(format, ipAddress, userAgent) {
  this.totalDownloads += 1;
  this.downloadsRemaining = Math.max(0, this.downloadsRemaining - 1);
  this.downloadHistory.push({
    downloadedAt: new Date(),
    format,
    ipAddress,
    userAgent
  });
  await this.save();
};

// Method to check if access is valid
dataPurchaseSchema.methods.isAccessValid = function() {
  return this.accessGranted && 
         this.accessExpiresAt > new Date() && 
         this.paymentStatus === 'completed' &&
         this.downloadsRemaining > 0;
};

// Method to generate download token
dataPurchaseSchema.methods.generateDownloadToken = async function(format) {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // Token valid for 24 hours
  
  this.downloadTokens.push({
    token,
    format,
    expiresAt
  });
  
  await this.save();
  return token;
};

// Static method to get customer purchases
dataPurchaseSchema.statics.getCustomerPurchases = function(customerId, customerType, options = {}) {
  const query = { customerId, customerType };
  
  if (options.status) {
    query.paymentStatus = options.status;
  }
  
  if (options.activeOnly) {
    query.accessGranted = true;
    query.accessExpiresAt = { $gt: new Date() };
  }
  
  return this.find(query)
    .populate('productId', 'name type category price')
    .sort(options.sortBy || { createdAt: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 20);
};

// Static method to get active purchases for a product
dataPurchaseSchema.statics.getActiveProductAccess = function(customerId, customerType, productId) {
  return this.findOne({
    customerId,
    customerType,
    productId,
    accessGranted: true,
    accessExpiresAt: { $gt: new Date() },
    paymentStatus: 'completed'
  });
};

// Static method to get purchase statistics
dataPurchaseSchema.statics.getPurchaseStats = async function(startDate, endDate) {
  const stats = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        paymentStatus: 'completed'
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        totalPurchases: { $sum: 1 },
        avgOrderValue: { $avg: '$amount' }
      }
    }
  ]);
  
  return stats[0] || { totalRevenue: 0, totalPurchases: 0, avgOrderValue: 0 };
};

module.exports = mongoose.model('DataPurchase', dataPurchaseSchema);
