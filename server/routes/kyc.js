/**
 * KYC Routes
 * API endpoints for Know Your Customer verification system
 */

const express = require('express');
const multer = require('multer');
const kycService = require('../services/kycService.js');
const { authenticate, requireAuth } = require('../middleware/auth.js');
const { requireRole } = require('../middleware/rbac.js');
const { asyncHandler, ValidationError, NotFoundError, ForbiddenError } = require('../middleware/errorHandler.js');
const { DOCUMENT_TYPES } = require('../models/KYCDocument.js');

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ValidationError(`Invalid file type. Allowed: ${allowedMimes.join(', ')}`), false);
    }
  },
});

// ==================== USER KYC ENDPOINTS ====================

/**
 * @route   GET /api/kyc/status
 * @desc    Get current user's KYC status
 * @access  Private
 */
router.get('/status', requireAuth, asyncHandler(async (req, res) => {
  const kycStatus = await kycService.getKYCStatus(req.user.sub);
  
  res.json({
    success: true,
    data: kycStatus,
  });
}));

/**
 * @route   POST /api/kyc/target-level
 * @desc    Set target KYC level
 * @access  Private
 */
router.post('/target-level', requireAuth, asyncHandler(async (req, res) => {
  const { targetLevel } = req.body;
  
  if (!targetLevel || targetLevel < 1 || targetLevel > 4) {
    throw new ValidationError('Target level must be between 1 and 4');
  }
  
  const kycStatus = await kycService.setTargetLevel(req.user.sub, targetLevel);
  
  res.json({
    success: true,
    message: `Target level set to ${targetLevel}`,
    data: kycStatus,
  });
}));

/**
 * @route   GET /api/kyc/progress
 * @desc    Check KYC level progression
 * @access  Private
 */
router.get('/progress', requireAuth, asyncHandler(async (req, res) => {
  const progression = await kycService.checkLevelProgression(req.user.sub);
  
  res.json({
    success: true,
    data: progression,
  });
}));

/**
 * @route   GET /api/kyc/requirements/:level
 * @desc    Get requirements for a specific KYC level
 * @access  Private
 */
router.get('/requirements/:level', requireAuth, asyncHandler(async (req, res) => {
  const level = parseInt(req.params.level);
  
  if (isNaN(level) || level < 1 || level > 4) {
    throw new ValidationError('Level must be between 1 and 4');
  }
  
  const requirements = kycService.getLevelRequirements(level);
  
  res.json({
    success: true,
    data: {
      level,
      requirements,
    },
  });
}));

// ==================== DOCUMENT UPLOAD ENDPOINTS ====================

/**
 * @route   POST /api/kyc/upload
 * @desc    Upload KYC document
 * @access  Private
 */
router.post('/upload', 
  requireAuth, 
  upload.single('document'),
  asyncHandler(async (req, res) => {
    const { documentType } = req.body;
    
    if (!documentType) {
      throw new ValidationError('Document type is required');
    }
    
    if (!Object.values(DOCUMENT_TYPES).includes(documentType)) {
      throw new ValidationError(`Invalid document type. Allowed: ${Object.values(DOCUMENT_TYPES).join(', ')}`);
    }
    
    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }
    
    const metadata = {
      source: 'web',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };
    
    const document = await kycService.uploadDocument(
      req.user.sub,
      req.file,
      documentType,
      metadata
    );
    
    res.json({
      success: true,
      message: 'Document uploaded successfully',
      data: document,
    });
  })
);

/**
 * @route   GET /api/kyc/documents
 * @desc    Get user's uploaded documents
 * @access  Private
 */
router.get('/documents', requireAuth, asyncHandler(async (req, res) => {
  const { documentType, status, limit = 50, skip = 0 } = req.query;
  
  const options = {
    documentType,
    status,
    limit: parseInt(limit),
    skip: parseInt(skip),
  };
  
  const documents = await kycService.getUserDocuments(req.user.sub, options);
  
  res.json({
    success: true,
    data: documents,
  });
}));

/**
 * @route   GET /api/kyc/documents/:id
 * @desc    Get specific document details
 * @access  Private
 */
router.get('/documents/:id', requireAuth, asyncHandler(async (req, res) => {
  const KYCDocument = (await import('../models/KYCDocument.js')).default;
  
  const document = await KYCDocument.findOne({
    _id: req.params.id,
    userId: req.user.sub,
  });
  
  if (!document) {
    throw new NotFoundError('Document not found');
  }
  
  res.json({
    success: true,
    data: document,
  });
}));

/**
 * @route   DELETE /api/kyc/documents/:id
 * @desc    Delete a document
 * @access  Private
 */
router.delete('/documents/:id', requireAuth, asyncHandler(async (req, res) => {
  await kycService.deleteDocument(req.user.sub, req.params.id);
  
  res.json({
    success: true,
    message: 'Document deleted successfully',
  });
}));

// ==================== VERIFICATION ENDPOINTS ====================

/**
 * @route   POST /api/kyc/verify/phone
 * @desc    Verify phone number with OTP
 * @access  Private
 */
router.post('/verify/phone', requireAuth, asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;
  
  if (!phone || !otp) {
    throw new ValidationError('Phone number and OTP are required');
  }
  
  const result = await kycService.verifyPhone(req.user.sub, phone, otp);
  
  res.json({
    success: true,
    message: 'Phone number verified successfully',
    data: result,
  });
}));

/**
 * @route   POST /api/kyc/verify/email
 * @desc    Verify email address
 * @access  Private
 */
router.post('/verify/email', requireAuth, asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    throw new ValidationError('Email is required');
  }
  
  const result = await kycService.verifyEmail(req.user.sub, email);
  
  res.json({
    success: true,
    message: 'Email verified successfully',
    data: result,
  });
}));

/**
 * @route   POST /api/kyc/verify/address
 * @desc    Update and verify address
 * @access  Private
 */
router.post('/verify/address', requireAuth, asyncHandler(async (req, res) => {
  const { street, township, city, state, postalCode } = req.body;
  
  if (!street || !township || !city || !state) {
    throw new ValidationError('Street, township, city, and state are required');
  }
  
  const addressData = {
    street,
    township,
    city,
    state,
    postalCode,
  };
  
  const kycStatus = await kycService.updateAddress(req.user.sub, addressData);
  
  res.json({
    success: true,
    message: 'Address verified successfully',
    data: kycStatus,
  });
}));

/**
 * @route   POST /api/kyc/verify/bank
 * @desc    Update and verify bank details
 * @access  Private
 */
router.post('/verify/bank', requireAuth, asyncHandler(async (req, res) => {
  const { bankName, accountNumber, accountHolderName, branch } = req.body;
  
  if (!bankName || !accountNumber || !accountHolderName) {
    throw new ValidationError('Bank name, account number, and account holder name are required');
  }
  
  const bankData = {
    bankName,
    accountNumber,
    accountHolderName,
    branch,
  };
  
  const kycStatus = await kycService.updateBankDetails(req.user.sub, bankData);
  
  res.json({
    success: true,
    message: 'Bank details verified successfully',
    data: kycStatus,
  });
}));

/**
 * @route   POST /api/kyc/verify/business
 * @desc    Update business details (Level 4)
 * @access  Private
 */
router.post('/verify/business', requireAuth, asyncHandler(async (req, res) => {
  const { businessType, companyName, registrationNumber, tinNumber } = req.body;
  
  if (!businessType || !companyName || !registrationNumber || !tinNumber) {
    throw new ValidationError('Business type, company name, registration number, and TIN are required');
  }
  
  const businessData = {
    businessType,
    companyName,
    registrationNumber,
    tinNumber,
  };
  
  const kycStatus = await kycService.updateBusinessDetails(req.user.sub, businessData);
  
  res.json({
    success: true,
    message: 'Business details verified successfully',
    data: kycStatus,
  });
}));

/**
 * @route   POST /api/kyc/verify/selfie-match
 * @desc    Match selfie with ID document
 * @access  Private
 */
router.post('/verify/selfie-match', requireAuth, asyncHandler(async (req, res) => {
  const { selfieDocumentId, idDocumentId } = req.body;
  
  if (!selfieDocumentId || !idDocumentId) {
    throw new ValidationError('Selfie document ID and ID document ID are required');
  }
  
  const result = await kycService.matchSelfie(selfieDocumentId, idDocumentId);
  
  res.json({
    success: true,
    message: result.matched ? 'Selfie matched successfully' : 'Selfie match failed',
    data: result,
  });
}));

/**
 * @route   POST /api/kyc/submit
 * @desc    Submit KYC for review
 * @access  Private
 */
router.post('/submit', requireAuth, asyncHandler(async (req, res) => {
  const kycStatus = await kycService.submitForReview(req.user.sub);
  
  res.json({
    success: true,
    message: 'KYC submitted for review successfully',
    data: kycStatus,
  });
}));

// ==================== VALIDATION ENDPOINTS ====================

/**
 * @route   POST /api/kyc/validate/nrc
 * @desc    Validate NRC number format
 * @access  Private
 */
router.post('/validate/nrc', requireAuth, asyncHandler(async (req, res) => {
  const { nrcNumber } = req.body;
  
  if (!nrcNumber) {
    throw new ValidationError('NRC number is required');
  }
  
  const result = kycService.validateNRC(nrcNumber);
  
  res.json({
    success: true,
    data: result,
  });
}));

/**
 * @route   POST /api/kyc/validate/phone
 * @desc    Validate Myanmar phone number
 * @access  Private
 */
router.post('/validate/phone', asyncHandler(async (req, res) => {
  const { phone } = req.body;
  
  if (!phone) {
    throw new ValidationError('Phone number is required');
  }
  
  const result = kycService.validateMyanmarPhone(phone);
  
  res.json({
    success: true,
    data: result,
  });
}));

/**
 * @route   POST /api/kyc/validate/email
 * @desc    Validate email format
 * @access  Private
 */
router.post('/validate/email', asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    throw new ValidationError('Email is required');
  }
  
  const result = kycService.validateEmail(email);
  
  res.json({
    success: true,
    data: result,
  });
}));

// ==================== ADMIN ENDPOINTS ====================

/**
 * @route   GET /api/kyc/admin/pending
 * @desc    Get pending KYC reviews (Admin only)
 * @access  Admin
 */
router.get('/admin/pending', 
  requireAuth, 
  requireRole('platform_admin'),
  asyncHandler(async (req, res) => {
    const { limit = 50, skip = 0, level } = req.query;
    
    const options = {
      limit: parseInt(limit),
      skip: parseInt(skip),
      level: level ? parseInt(level) : undefined,
    };
    
    const pendingReviews = await kycService.getPendingReviews(options);
    
    res.json({
      success: true,
      count: pendingReviews.length,
      data: pendingReviews,
    });
  })
);

/**
 * @route   GET /api/kyc/admin/statistics
 * @desc    Get KYC statistics (Admin only)
 * @access  Admin
 */
router.get('/admin/statistics', 
  requireAuth, 
  requireRole('platform_admin'),
  asyncHandler(async (req, res) => {
    const statistics = await kycService.getStatistics();
    
    res.json({
      success: true,
      data: statistics,
    });
  })
);

/**
 * @route   POST /api/kyc/admin/search
 * @desc    Search KYC records (Admin only)
 * @access  Admin
 */
router.post('/admin/search', 
  requireAuth, 
  requireRole('platform_admin'),
  asyncHandler(async (req, res) => {
    const { status, level, nrcNumber, dateFrom, dateTo, limit = 100 } = req.body;
    
    const criteria = {
      status,
      level,
      nrcNumber,
      dateFrom,
      dateTo,
      limit,
    };
    
    const results = await kycService.searchKYC(criteria);
    
    res.json({
      success: true,
      count: results.length,
      data: results,
    });
  })
);

/**
 * @route   GET /api/kyc/admin/user/:userId
 * @desc    Get specific user's KYC details (Admin only)
 * @access  Admin
 */
router.get('/admin/user/:userId', 
  requireAuth, 
  requireRole('platform_admin'),
  asyncHandler(async (req, res) => {
    const KYCStatus = (await import('../models/KYCStatus.js')).default;
    
    const kycStatus = await KYCStatus.findOne({ userId: req.params.userId })
      .populate('userId', 'name email phone role')
      .populate('documents')
      .populate('reviewInfo.reviewedBy', 'name');
    
    if (!kycStatus) {
      throw new NotFoundError('KYC status not found for this user');
    }
    
    res.json({
      success: true,
      data: kycStatus,
    });
  })
);

/**
 * @route   POST /api/kyc/admin/approve/:userId
 * @desc    Approve user's KYC (Admin only)
 * @access  Admin
 */
router.post('/admin/approve/:userId', 
  requireAuth, 
  requireRole('platform_admin'),
  asyncHandler(async (req, res) => {
    const { notes } = req.body;
    
    const kycStatus = await kycService.approveKYC(
      req.params.userId,
      req.user.sub,
      notes
    );
    
    res.json({
      success: true,
      message: 'KYC approved successfully',
      data: kycStatus,
    });
  })
);

/**
 * @route   POST /api/kyc/admin/reject/:userId
 * @desc    Reject user's KYC (Admin only)
 * @access  Admin
 */
router.post('/admin/reject/:userId', 
  requireAuth, 
  requireRole('platform_admin'),
  asyncHandler(async (req, res) => {
    const { code, message, field } = req.body;
    
    if (!code || !message) {
      throw new ValidationError('Rejection code and message are required');
    }
    
    const reason = {
      code,
      message,
      field,
    };
    
    const kycStatus = await kycService.rejectKYC(
      req.params.userId,
      req.user.sub,
      reason
    );
    
    res.json({
      success: true,
      message: 'KYC rejected successfully',
      data: kycStatus,
    });
  })
);

/**
 * @route   POST /api/kyc/admin/reprocess-ocr/:documentId
 * @desc    Reprocess OCR for a document (Admin only)
 * @access  Admin
 */
router.post('/admin/reprocess-ocr/:documentId', 
  requireAuth, 
  requireRole('platform_admin'),
  asyncHandler(async (req, res) => {
    const ocrResults = await kycService.processOCR(req.params.documentId);
    
    res.json({
      success: true,
      message: 'OCR reprocessing completed',
      data: ocrResults,
    });
  })
);

/**
 * @route   GET /api/kyc/admin/documents/pending-verification
 * @desc    Get documents pending verification (Admin only)
 * @access  Admin
 */
router.get('/admin/documents/pending-verification', 
  requireAuth, 
  requireRole('platform_admin'),
  asyncHandler(async (req, res) => {
    const KYCDocument = (await import('../models/KYCDocument.js')).default;
    
    const { limit = 50, skip = 0, documentType } = req.query;
    
    const options = {
      limit: parseInt(limit),
      skip: parseInt(skip),
      documentType,
    };
    
    const documents = await KYCDocument.findPendingVerification(options);
    
    res.json({
      success: true,
      count: documents.length,
      data: documents,
    });
  })
);

/**
 * @route   POST /api/kyc/admin/verify-document/:documentId
 * @desc    Manually verify a document (Admin only)
 * @access  Admin
 */
router.post('/admin/verify-document/:documentId', 
  requireAuth, 
  requireRole('platform_admin'),
  asyncHandler(async (req, res) => {
    const KYCDocument = (await import('../models/KYCDocument.js')).default;
    
    const { notes, validations } = req.body;
    
    const document = await KYCDocument.findById(req.params.documentId);
    
    if (!document) {
      throw new NotFoundError('Document not found');
    }
    
    await document.verify({
      method: 'manual',
      verifiedBy: req.user.sub,
      notes,
      validations: validations || [],
    });
    
    res.json({
      success: true,
      message: 'Document verified successfully',
      data: document,
    });
  })
);

module.exports = router;
