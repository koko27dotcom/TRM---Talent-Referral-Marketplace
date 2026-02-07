/**
 * KYC Document Model
 * Stores uploaded documents for KYC verification
 * Supports multiple document types with OCR metadata
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Document types
const DOCUMENT_TYPES = {
  NRC_FRONT: 'nrc_front',
  NRC_BACK: 'nrc_back',
  SELFIE: 'selfie',
  PASSPORT: 'passport',
  DRIVERS_LICENSE: 'drivers_license',
  UTILITY_BILL: 'utility_bill',
  BANK_STATEMENT: 'bank_statement',
  BUSINESS_REGISTRATION: 'business_registration',
  TIN_CERTIFICATE: 'tin_certificate',
  ADDRESS_PROOF: 'address_proof',
  OTHER: 'other',
};

// Document status
const DOCUMENT_STATUS = {
  UPLOADED: 'uploaded',
  PROCESSING: 'processing',
  OCR_COMPLETED: 'ocr_completed',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
};

// File types
const ALLOWED_FILE_TYPES = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

// OCR extracted data schema
const OCRDataSchema = new Schema({
  // Raw OCR text
  rawText: {
    type: String,
  },
  
  // Structured data extracted from OCR
  extractedData: {
    // For NRC
    nrcNumber: String,
    nrcStateRegion: String,
    nrcType: String, // N, E, P, etc.
    name: String,
    fatherName: String,
    dateOfBirth: Date,
    nationality: String,
    address: String,
    
    // For Passport
    passportNumber: String,
    issuingCountry: String,
    issueDate: Date,
    expiryDate: Date,
    
    // For Business docs
    businessName: String,
    registrationNumber: String,
    tinNumber: String,
    registeredDate: Date,
    
    // Generic
    documentNumber: String,
    confidence: Number,
  },
  
  // OCR confidence scores
  confidence: {
    overall: {
      type: Number,
      min: 0,
      max: 100,
    },
    fields: [{
      field: String,
      confidence: Number,
      value: String,
    }],
  },
  
  // OCR engine used
  engine: {
    type: String,
    enum: ['tesseract', 'google_vision', 'aws_textract', 'azure_form', 'manual'],
    default: 'tesseract',
  },
  
  // Processing metadata
  processedAt: Date,
  processingDuration: Number, // milliseconds
  
  // Face detection (for selfies)
  faceDetection: {
    detected: Boolean,
    confidence: Number,
    faceCount: Number,
    quality: {
      brightness: Number,
      sharpness: Number,
      contrast: Number,
    },
  },
}, { _id: false });

// Document verification schema
const VerificationSchema = new Schema({
  // Verification status
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'verified', 'rejected'],
    default: 'pending',
  },
  
  // Verification method
  method: {
    type: String,
    enum: ['automated', 'manual', 'hybrid'],
    default: 'automated',
  },
  
  // Verified by (admin user if manual)
  verifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  
  // Verification timestamp
  verifiedAt: Date,
  
  // Verification notes
  notes: String,
  
  // Validation results
  validations: [{
    check: String,
    passed: Boolean,
    message: String,
    confidence: Number,
  }],
  
  // Fraud detection
  fraudCheck: {
    score: {
      type: Number,
      min: 0,
      max: 100,
    },
    flags: [String],
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
    },
  },
}, { _id: false });

// Main KYC Document Schema
const KYCDocumentSchema = new Schema({
  // Document owner
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true,
  },
  
  // Associated KYC status record
  kycStatusId: {
    type: Schema.Types.ObjectId,
    ref: 'KYCStatus',
    index: true,
  },
  
  // Document type
  documentType: {
    type: String,
    enum: Object.values(DOCUMENT_TYPES),
    required: [true, 'Document type is required'],
    index: true,
  },
  
  // Document status
  status: {
    type: String,
    enum: Object.values(DOCUMENT_STATUS),
    default: DOCUMENT_STATUS.UPLOADED,
    index: true,
  },
  
  // File information
  file: {
    originalName: {
      type: String,
      required: true,
    },
    storedName: {
      type: String,
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    url: {
      type: String,
    },
    mimeType: {
      type: String,
      required: true,
      enum: Object.keys(ALLOWED_FILE_TYPES),
    },
    extension: {
      type: String,
      required: true,
    },
    size: {
      type: Number, // bytes
      required: true,
    },
    dimensions: {
      width: Number,
      height: Number,
    },
    checksum: {
      type: String, // SHA-256 hash for integrity
    },
  },
  
  // OCR data
  ocrData: {
    type: OCRDataSchema,
    default: null,
  },
  
  // Verification details
  verification: {
    type: VerificationSchema,
    default: null,
  },
  
  // Document metadata
  metadata: {
    // Upload context
    uploadSource: {
      type: String,
      enum: ['web', 'mobile_app', 'api', 'admin'],
      default: 'web',
    },
    ipAddress: String,
    userAgent: String,
    deviceId: String,
    
    // Geolocation (if available)
    geolocation: {
      country: String,
      region: String,
      city: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    
    // Language detected
    language: {
      type: String,
      default: 'my', // Burmese default for Myanmar
    },
    
    // Custom metadata
    custom: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  
  // Document expiry
  documentExpiry: {
    expiryDate: Date,
    isExpired: {
      type: Boolean,
      default: false,
    },
    notifiedAt: Date,
  },
  
  // Related documents (e.g., selfie matched with NRC)
  relatedDocuments: [{
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'KYCDocument',
    },
    relationship: {
      type: String,
      enum: ['selfie_match', 'nrc_pair', 'supporting_doc', 'previous_version'],
    },
    matchScore: Number,
  }],
  
  // Version control
  version: {
    type: Number,
    default: 1,
  },
  previousVersion: {
    type: Schema.Types.ObjectId,
    ref: 'KYCDocument',
  },
  
  // Rejection details
  rejection: {
    reason: String,
    code: String,
    rejectedAt: Date,
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    retryAllowed: {
      type: Boolean,
      default: true,
    },
  },
  
  // Tags for organization
  tags: [{
    type: String,
    trim: true,
  }],
  
  // Notes
  notes: String,
}, {
  timestamps: true,
});

// Indexes for common queries
KYCDocumentSchema.index({ userId: 1, documentType: 1 });
KYCDocumentSchema.index({ userId: 1, status: 1 });
KYCDocumentSchema.index({ kycStatusId: 1 });
KYCDocumentSchema.index({ status: 1, documentType: 1 });
KYCDocumentSchema.index({ createdAt: -1 });
KYCDocumentSchema.index({ 'ocrData.extractedData.nrcNumber': 1 });
KYCDocumentSchema.index({ 'ocrData.extractedData.documentNumber': 1 });

// Instance methods

/**
 * Mark document as processing
 */
KYCDocumentSchema.methods.markProcessing = async function() {
  this.status = DOCUMENT_STATUS.PROCESSING;
  return this.save();
};

/**
 * Update with OCR results
 * @param {Object} ocrResults - OCR processing results
 */
KYCDocumentSchema.methods.updateOCRResults = async function(ocrResults) {
  this.ocrData = {
    ...ocrResults,
    processedAt: new Date(),
  };
  this.status = DOCUMENT_STATUS.OCR_COMPLETED;
  return this.save();
};

/**
 * Verify document
 * @param {Object} verificationData - Verification details
 */
KYCDocumentSchema.methods.verify = async function(verificationData) {
  this.verification = {
    ...verificationData,
    status: 'verified',
    verifiedAt: new Date(),
  };
  this.status = DOCUMENT_STATUS.VERIFIED;
  return this.save();
};

/**
 * Reject document
 * @param {Object} rejectionData - Rejection details
 */
KYCDocumentSchema.methods.reject = async function(rejectionData) {
  this.rejection = {
    ...rejectionData,
    rejectedAt: new Date(),
  };
  this.status = DOCUMENT_STATUS.REJECTED;
  return this.save();
};

/**
 * Check if document is an image
 * @returns {boolean}
 */
KYCDocumentSchema.methods.isImage = function() {
  return this.file.mimeType.startsWith('image/');
};

/**
 * Check if document is a PDF
 * @returns {boolean}
 */
KYCDocumentSchema.methods.isPDF = function() {
  return this.file.mimeType === 'application/pdf';
};

/**
 * Get file size in human readable format
 * @returns {string}
 */
KYCDocumentSchema.methods.getHumanReadableSize = function() {
  const bytes = this.file.size;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

// Static methods

/**
 * Find documents by user
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
KYCDocumentSchema.statics.findByUser = function(userId, options = {}) {
  const { documentType, status, limit = 50, skip = 0 } = options;
  
  const query = { userId };
  if (documentType) query.documentType = documentType;
  if (status) query.status = status;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

/**
 * Find documents pending OCR processing
 * @param {number} limit - Maximum documents to return
 * @returns {Promise<Array>}
 */
KYCDocumentSchema.statics.findPendingOCR = function(limit = 100) {
  return this.find({
    status: DOCUMENT_STATUS.UPLOADED,
    documentType: { $in: [DOCUMENT_TYPES.NRC_FRONT, DOCUMENT_TYPES.NRC_BACK, DOCUMENT_TYPES.PASSPORT] },
  })
    .sort({ createdAt: 1 })
    .limit(limit);
};

/**
 * Find documents pending verification
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
KYCDocumentSchema.statics.findPendingVerification = function(options = {}) {
  const { limit = 50, skip = 0, documentType } = options;
  
  const query = { status: DOCUMENT_STATUS.OCR_COMPLETED };
  if (documentType) query.documentType = documentType;
  
  return this.find(query)
    .populate('userId', 'name email')
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit);
};

/**
 * Check if user has document of specific type
 * @param {string} userId - User ID
 * @param {string} documentType - Document type
 * @returns {Promise<boolean>}
 */
KYCDocumentSchema.statics.hasDocument = async function(userId, documentType) {
  const count = await this.countDocuments({
    userId,
    documentType,
    status: { $in: [DOCUMENT_STATUS.OCR_COMPLETED, DOCUMENT_STATUS.VERIFIED] },
  });
  return count > 0;
};

/**
 * Get document statistics
 * @returns {Promise<Object>}
 */
KYCDocumentSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        byStatus: {
          $push: '$status',
        },
        byType: {
          $push: '$documentType',
        },
        totalSize: { $sum: '$file.size' },
      },
    },
  ]);
  
  if (!stats.length) {
    return {
      total: 0,
      byStatus: {},
      byType: {},
      totalSize: 0,
    };
  }
  
  const result = stats[0];
  
  // Count by status
  const byStatus = result.byStatus.reduce((acc, status) => {
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  
  // Count by type
  const byType = result.byType.reduce((acc, type) => {
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  
  return {
    total: result.total,
    byStatus,
    byType,
    totalSize: result.totalSize,
    totalSizeHuman: formatBytes(result.totalSize),
  };
};

/**
 * Find potential duplicate documents
 * @param {string} userId - User ID to exclude
 * @param {string} documentNumber - Document number to check
 * @returns {Promise<Array>}
 */
KYCDocumentSchema.statics.findPotentialDuplicates = function(userId, documentNumber) {
  return this.find({
    userId: { $ne: userId },
    $or: [
      { 'ocrData.extractedData.nrcNumber': documentNumber },
      { 'ocrData.extractedData.passportNumber': documentNumber },
      { 'ocrData.extractedData.documentNumber': documentNumber },
    ],
  }).populate('userId', 'name email');
};

// Helper function to format bytes
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Pre-save middleware
KYCDocumentSchema.pre('save', function(next) {
  // Set file extension from mime type if not set
  if (this.file.mimeType && !this.file.extension) {
    this.file.extension = ALLOWED_FILE_TYPES[this.file.mimeType] || '';
  }
  
  // Check document expiry
  if (this.documentExpiry?.expiryDate && !this.documentExpiry.isExpired) {
    if (new Date() > this.documentExpiry.expiryDate) {
      this.documentExpiry.isExpired = true;
      this.status = DOCUMENT_STATUS.EXPIRED;
    }
  }
  
  next();
});

const KYCDocument = mongoose.model('KYCDocument', KYCDocumentSchema);

module.exports = KYCDocument;
module.exports.DOCUMENT_TYPES = DOCUMENT_TYPES;
module.exports.DOCUMENT_STATUS = DOCUMENT_STATUS;
module.exports.ALLOWED_FILE_TYPES = ALLOWED_FILE_TYPES;
