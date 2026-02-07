/**
 * KYC Service
 * Handles KYC verification logic, document validation, OCR processing,
 * and Myanmar-specific validations (NRC, phone numbers)
 */

const path = require('path');
const crypto = require('crypto');
const fs = require('fs/promises');
const { KYCStatus, KYC_LEVELS, KYC_STATUS } = require('../models/KYCStatus.js');
const KYCDocument = require('../models/KYCDocument.js');
const { DOCUMENT_TYPES, DOCUMENT_STATUS, ALLOWED_FILE_TYPES } = require('../models/KYCDocument.js');
const { User } = require('../models/index.js');
const { sendNotification } = require('./notificationService.js');
const { NOTIFICATION_TYPES, NOTIFICATION_PRIORITY } = require('../models/Notification.js');

// File upload configuration
const UPLOAD_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: Object.keys(ALLOWED_FILE_TYPES),
  uploadDir: process.env.UPLOAD_DIR || './uploads/kyc',
};

// Myanmar state/region codes for NRC
const MYANMAR_STATE_REGIONS = {
  '1': 'Kachin',
  '2': 'Kayah',
  '3': 'Kayin',
  '4': 'Chin',
  '5': 'Sagaing',
  '6': 'Tanintharyi',
  '7': 'Bago',
  '8': 'Magway',
  '9': 'Mandalay',
  '10': 'Mon',
  '11': 'Rakhine',
  '12': 'Yangon',
  '13': 'Shan',
  '14': 'Ayeyarwady',
};

// NRC format patterns (Myanmar National Registration Card)
const NRC_PATTERNS = {
  // English format: 12/ABC(N)123456 or 12/ABC(N)1234567
  ENGLISH: /^\d{1,2}\/[A-Z]{3,6}\([A-Z]\)\d{6,7}$/,
  // Burmese format: ၁၂/အာဘီ(န)၁၂၃၄၅၆
  BURMESE: /^[၀-၉]{1,2}\/[\u1000-\u109F]+\([\u1000-\u109F]\)[၀-၉]{6,7}$/,
  // Mixed format variations
  MIXED: /^\d{1,2}\/[A-Za-z\u1000-\u109F]+\([A-Za-z\u1000-\u109F]\)\d{6,7}$/,
};

// Phone number patterns
const PHONE_PATTERNS = {
  // Myanmar mobile numbers
  MYANMAR: {
    // +95 9xx xxx xxx or 09xx xxx xxx
    MOBILE: /^(\+95|09)\s?9\d{8,9}$/,
    // Ooredoo, Telenor, MPT, Mytel patterns
    OOREDOO: /^(\+95|09)\s?9(9|7)\d{7,8}$/,
    TELENOR: /^(\+95|09)\s?9(6|7|5)\d{7,8}$/,
    MPT: /^(\+95|09)\s?(9|4|2|5|7|8)\d{7,8}$/,
    MYTEL: /^(\+95|09)\s?6\d{8}$/,
  },
};

/**
 * KYC Service class
 */
class KYCService {
  constructor() {
    this.ocrEngine = new MockOCREngine();
  }

  // ==================== USER KYC MANAGEMENT ====================

  /**
   * Initialize KYC status for a new user
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async initializeKYC(userId) {
    try {
      let kycStatus = await KYCStatus.findOne({ userId });
      
      if (!kycStatus) {
        kycStatus = await KYCStatus.create({
          userId,
          currentLevel: 0,
          targetLevel: 1,
          status: KYC_STATUS.NOT_STARTED,
          completedSteps: [],
        });
      }
      
      return kycStatus;
    } catch (error) {
      console.error('Error initializing KYC:', error);
      throw error;
    }
  }

  /**
   * Get user's KYC status with full details
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async getKYCStatus(userId) {
    try {
      const kycStatus = await KYCStatus.findOne({ userId })
        .populate('documents')
        .populate('reviewInfo.reviewedBy', 'name');
      
      if (!kycStatus) {
        return await this.initializeKYC(userId);
      }
      
      return kycStatus;
    } catch (error) {
      console.error('Error getting KYC status:', error);
      throw error;
    }
  }

  /**
   * Update target KYC level
   * @param {string} userId - User ID
   * @param {number} targetLevel - Target level (1-4)
   * @returns {Promise<Object>}
   */
  async setTargetLevel(userId, targetLevel) {
    if (targetLevel < 1 || targetLevel > 4) {
      throw new Error('Invalid target level. Must be between 1 and 4.');
    }
    
    const kycStatus = await KYCStatus.findOneAndUpdate(
      { userId },
      { 
        targetLevel,
        status: KYC_STATUS.IN_PROGRESS,
        lastActivityAt: new Date(),
      },
      { new: true, upsert: true }
    );
    
    return kycStatus;
  }

  // ==================== DOCUMENT UPLOAD & VALIDATION ====================

  /**
   * Validate file before upload
   * @param {Object} file - File object
   * @returns {Object}
   */
  validateFile(file) {
    const errors = [];
    
    // Check file exists
    if (!file || !file.buffer) {
      errors.push('No file provided');
      return { valid: false, errors };
    }
    
    // Check file size
    if (file.size > UPLOAD_CONFIG.maxFileSize) {
      errors.push(`File size exceeds maximum allowed (${UPLOAD_CONFIG.maxFileSize / 1024 / 1024}MB)`);
    }
    
    // Check mime type
    if (!UPLOAD_CONFIG.allowedTypes.includes(file.mimetype)) {
      errors.push(`Invalid file type. Allowed: ${UPLOAD_CONFIG.allowedTypes.join(', ')}`);
    }
    
    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = Object.values(ALLOWED_FILE_TYPES);
    if (!allowedExts.includes(ext)) {
      errors.push(`Invalid file extension. Allowed: ${allowedExts.join(', ')}`);
    }
    
    // Check for empty files
    if (file.size === 0) {
      errors.push('File is empty');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Save uploaded file to disk
   * @param {Object} file - File object
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async saveFile(file, userId) {
    try {
      // Ensure upload directory exists
      await fs.mkdir(UPLOAD_CONFIG.uploadDir, { recursive: true });
      
      // Generate unique filename
      const timestamp = Date.now();
      const random = crypto.randomBytes(8).toString('hex');
      const ext = ALLOWED_FILE_TYPES[file.mimetype] || path.extname(file.originalname);
      const storedName = `${userId}_${timestamp}_${random}${ext}`;
      const filePath = path.join(UPLOAD_CONFIG.uploadDir, storedName);
      
      // Calculate checksum
      const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');
      
      // Save file
      await fs.writeFile(filePath, file.buffer);
      
      return {
        originalName: file.originalname,
        storedName,
        path: filePath,
        mimeType: file.mimetype,
        extension: ext,
        size: file.size,
        checksum,
      };
    } catch (error) {
      console.error('Error saving file:', error);
      throw new Error('Failed to save file');
    }
  }

  /**
   * Upload KYC document
   * @param {string} userId - User ID
   * @param {Object} file - File object
   * @param {string} documentType - Type of document
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>}
   */
  async uploadDocument(userId, file, documentType, metadata = {}) {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
      }
      
      // Validate document type
      if (!Object.values(DOCUMENT_TYPES).includes(documentType)) {
        throw new Error(`Invalid document type: ${documentType}`);
      }
      
      // Get or create KYC status
      let kycStatus = await KYCStatus.findOne({ userId });
      if (!kycStatus) {
        kycStatus = await this.initializeKYC(userId);
      }
      
      // Save file
      const fileData = await this.saveFile(file, userId);
      
      // Create document record
      const document = await KYCDocument.create({
        userId,
        kycStatusId: kycStatus._id,
        documentType,
        status: DOCUMENT_STATUS.UPLOADED,
        file: fileData,
        metadata: {
          uploadSource: metadata.source || 'web',
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          custom: metadata.custom || {},
        },
      });
      
      // Add document to KYC status
      kycStatus.documents.push(document._id);
      await kycStatus.save();
      
      // Trigger async OCR processing
      this.processOCR(document._id).catch(console.error);
      
      return document;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  }

  /**
   * Get user's documents
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getUserDocuments(userId, options = {}) {
    return KYCDocument.findByUser(userId, options);
  }

  /**
   * Delete a document
   * @param {string} userId - User ID
   * @param {string} documentId - Document ID
   * @returns {Promise<boolean>}
   */
  async deleteDocument(userId, documentId) {
    const document = await KYCDocument.findOne({ _id: documentId, userId });
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    // Delete file from disk
    try {
      await fs.unlink(document.file.path);
    } catch (error) {
      console.warn('Could not delete file from disk:', error.message);
    }
    
    // Remove from KYC status
    await KYCStatus.updateOne(
      { userId },
      { $pull: { documents: documentId } }
    );
    
    // Delete document record
    await KYCDocument.deleteOne({ _id: documentId });
    
    return true;
  }

  // ==================== OCR PROCESSING ====================

  /**
   * Process OCR for a document
   * @param {string} documentId - Document ID
   * @returns {Promise<Object>}
   */
  async processOCR(documentId) {
    try {
      const document = await KYCDocument.findById(documentId);
      if (!document) {
        throw new Error('Document not found');
      }
      
      // Mark as processing
      await document.markProcessing();
      
      // Perform OCR based on document type
      let ocrResults;
      
      switch (document.documentType) {
        case DOCUMENT_TYPES.NRC_FRONT:
        case DOCUMENT_TYPES.NRC_BACK:
          ocrResults = await this.ocrEngine.processNRC(document);
          break;
        case DOCUMENT_TYPES.SELFIE:
          ocrResults = await this.ocrEngine.processSelfie(document);
          break;
        case DOCUMENT_TYPES.PASSPORT:
          ocrResults = await this.ocrEngine.processPassport(document);
          break;
        case DOCUMENT_TYPES.BUSINESS_REGISTRATION:
          ocrResults = await this.ocrEngine.processBusinessDoc(document);
          break;
        default:
          ocrResults = await this.ocrEngine.processGeneric(document);
      }
      
      // Update document with OCR results
      await document.updateOCRResults(ocrResults);
      
      // Update KYC status based on document type
      await this.updateKYCProgress(document);
      
      return ocrResults;
    } catch (error) {
      console.error('Error processing OCR:', error);
      
      // Update document status to reflect error
      await KYCDocument.findByIdAndUpdate(documentId, {
        status: DOCUMENT_STATUS.UPLOADED,
        'metadata.custom.ocrError': error.message,
      });
      
      throw error;
    }
  }

  /**
   * Update KYC progress based on document OCR results
   * @param {Object} document - KYCDocument instance
   */
  async updateKYCProgress(document) {
    const kycStatus = await KYCStatus.findById(document.kycStatusId);
    if (!kycStatus) return;
    
    const stepMap = {
      [DOCUMENT_TYPES.NRC_FRONT]: 'nrc_upload',
      [DOCUMENT_TYPES.NRC_BACK]: 'nrc_upload',
      [DOCUMENT_TYPES.SELFIE]: 'selfie_upload',
    };
    
    const stepName = stepMap[document.documentType];
    if (stepName) {
      await kycStatus.updateStep(stepName, 'completed', {
        documentId: document._id,
        ocrConfidence: document.ocrData?.confidence?.overall,
      });
    }
    
    // Check if NRC OCR was successful
    if ((document.documentType === DOCUMENT_TYPES.NRC_FRONT || 
         document.documentType === DOCUMENT_TYPES.NRC_BACK) &&
        document.ocrData?.extractedData?.nrcNumber) {
      await kycStatus.updateStep('nrc_ocr', 'completed', {
        nrcNumber: document.ocrData.extractedData.nrcNumber,
        confidence: document.ocrData.confidence?.overall,
      });
      
      // Update level2 data
      kycStatus.levelStatus.level2.nrcNumber = document.ocrData.extractedData.nrcNumber;
      kycStatus.levelStatus.level2.nrcStateRegion = document.ocrData.extractedData.nrcStateRegion;
      await kycStatus.save();
    }
  }

  // ==================== MYANMAR-SPECIFIC VALIDATIONS ====================

  /**
   * Validate Myanmar NRC number format
   * @param {string} nrcNumber - NRC number to validate
   * @returns {Object}
   */
  validateNRC(nrcNumber) {
    if (!nrcNumber) {
      return { valid: false, error: 'NRC number is required' };
    }
    
    const normalizedNRC = nrcNumber.trim().toUpperCase().replace(/\s/g, '');
    
    // Check English format
    if (NRC_PATTERNS.ENGLISH.test(normalizedNRC)) {
      return this.parseEnglishNRC(normalizedNRC);
    }
    
    // Check Burmese format
    if (NRC_PATTERNS.BURMESE.test(nrcNumber.trim())) {
      return this.parseBurmeseNRC(nrcNumber.trim());
    }
    
    return {
      valid: false,
      error: 'Invalid NRC format. Expected format: 12/ABC(N)123456 or Burmese equivalent',
      format: null,
    };
  }

  /**
   * Parse English format NRC
   * @param {string} nrcNumber - NRC number
   * @returns {Object}
   */
  parseEnglishNRC(nrcNumber) {
    // Format: 12/ABC(N)123456
    const parts = nrcNumber.match(/^(\d{1,2})\/([A-Z]{3,6})\(([A-Z])\)(\d{6,7})$/);
    
    if (!parts) {
      return { valid: false, error: 'Could not parse NRC number' };
    }
    
    const [, stateCode, district, type, number] = parts;
    const state = MYANMAR_STATE_REGIONS[stateCode];
    
    if (!state) {
      return { valid: false, error: `Invalid state/region code: ${stateCode}` };
    }
    
    // Validate NRC type
    const validTypes = ['N', 'E', 'P', 'A', 'F', 'T', 'G', 'C', 'H', 'Y', 'K', 'L', 'M'];
    if (!validTypes.includes(type)) {
      return { valid: false, error: `Invalid NRC type: ${type}` };
    }
    
    return {
      valid: true,
      format: 'english',
      stateCode,
      state,
      district,
      type,
      typeName: this.getNRCTypeName(type),
      number,
      fullNumber: nrcNumber,
    };
  }

  /**
   * Parse Burmese format NRC
   * @param {string} nrcNumber - NRC number in Burmese
   * @returns {Object}
   */
  parseBurmeseNRC(nrcNumber) {
    // This is a simplified parser - in production, you'd need more robust Burmese text handling
    return {
      valid: true,
      format: 'burmese',
      fullNumber: nrcNumber,
      note: 'Burmese NRC parsing requires specialized handling',
    };
  }

  /**
   * Get NRC type name
   * @param {string} type - NRC type code
   * @returns {string}
   */
  getNRCTypeName(type) {
    const typeNames = {
      'N': 'National',
      'E': 'Ethnic',
      'P': 'Permanent Resident',
      'A': 'Associate Citizen',
      'F': 'Foreigner',
      'T': 'Temporary',
      'G': 'Guest',
      'C': 'Citizen',
      'H': 'Holding',
      'Y': 'Naturalized',
      'K': 'Kayin',
      'L': 'Kachin',
      'M': 'Mon',
    };
    return typeNames[type] || 'Unknown';
  }

  /**
   * Validate Myanmar phone number
   * @param {string} phone - Phone number
   * @returns {Object}
   */
  validateMyanmarPhone(phone) {
    if (!phone) {
      return { valid: false, error: 'Phone number is required' };
    }
    
    // Normalize phone number
    let normalized = phone.trim().replace(/\s/g, '');
    
    // Remove +95 prefix for validation
    if (normalized.startsWith('+95')) {
      normalized = '0' + normalized.substring(3);
    }
    
    // Check Myanmar mobile pattern
    if (!PHONE_PATTERNS.MYANMAR.MOBILE.test(phone) && !PHONE_PATTERNS.MYANMAR.MOBILE.test(normalized)) {
      return {
        valid: false,
        error: 'Invalid Myanmar phone number format. Expected: +95 9xx xxx xxx or 09xx xxx xxx',
      };
    }
    
    // Determine operator
    let operator = 'Unknown';
    if (PHONE_PATTERNS.MYANMAR.OOREDOO.test(phone) || PHONE_PATTERNS.MYANMAR.OOREDOO.test(normalized)) {
      operator = 'Ooredoo';
    } else if (PHONE_PATTERNS.MYANMAR.TELENOR.test(phone) || PHONE_PATTERNS.MYANMAR.TELENOR.test(normalized)) {
      operator = 'Telenor';
    } else if (PHONE_PATTERNS.MYANMAR.MYTEL.test(phone) || PHONE_PATTERNS.MYANMAR.MYTEL.test(normalized)) {
      operator = 'Mytel';
    } else if (PHONE_PATTERNS.MYANMAR.MPT.test(phone) || PHONE_PATTERNS.MYANMAR.MPT.test(normalized)) {
      operator = 'MPT';
    }
    
    // Normalize to +95 format
    const internationalFormat = normalized.startsWith('0') 
      ? '+95' + normalized.substring(1) 
      : normalized;
    
    return {
      valid: true,
      original: phone,
      normalized,
      internationalFormat,
      operator,
    };
  }

  /**
   * Validate email format
   * @param {string} email - Email address
   * @returns {Object}
   */
  validateEmail(email) {
    if (!email) {
      return { valid: false, error: 'Email is required' };
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Invalid email format' };
    }
    
    return {
      valid: true,
      email: email.toLowerCase().trim(),
    };
  }

  // ==================== SELFIE MATCHING ====================

  /**
   * Match selfie with ID document
   * @param {string} selfieDocumentId - Selfie document ID
   * @param {string} idDocumentId - ID document ID
   * @returns {Promise<Object>}
   */
  async matchSelfie(selfieDocumentId, idDocumentId) {
    try {
      const selfieDoc = await KYCDocument.findById(selfieDocumentId);
      const idDoc = await KYCDocument.findById(idDocumentId);
      
      if (!selfieDoc || !idDoc) {
        throw new Error('Documents not found');
      }
      
      // Mock face matching (replace with actual face recognition API)
      const matchResult = await this.ocrEngine.matchFaces(selfieDoc, idDoc);
      
      // Update KYC status
      const kycStatus = await KYCStatus.findById(selfieDoc.kycStatusId);
      if (kycStatus) {
        await kycStatus.updateStep('selfie_matching', 
          matchResult.matched ? 'completed' : 'failed',
          { matchScore: matchResult.score }
        );
        
        if (matchResult.matched) {
          kycStatus.levelStatus.level2.selfieVerified = true;
          kycStatus.levelStatus.level2.selfieVerifiedAt = new Date();
          kycStatus.levelStatus.level2.selfieMatchScore = matchResult.score;
          await kycStatus.save();
        }
      }
      
      // Update selfie document with match info
      selfieDoc.relatedDocuments.push({
        documentId: idDocumentId,
        relationship: 'selfie_match',
        matchScore: matchResult.score,
      });
      await selfieDoc.save();
      
      return matchResult;
    } catch (error) {
      console.error('Error matching selfie:', error);
      throw error;
    }
  }

  // ==================== LEVEL PROGRESSION ====================

  /**
   * Check if user can progress to next level
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async checkLevelProgression(userId) {
    const kycStatus = await this.getKYCStatus(userId);
    const currentLevel = kycStatus.currentLevel;
    const targetLevel = kycStatus.targetLevel;
    
    if (currentLevel >= targetLevel) {
      return {
        canProgress: false,
        reason: 'Already at or above target level',
        currentLevel,
        targetLevel,
      };
    }
    
    const requirements = this.getLevelRequirements(targetLevel);
    const completedSteps = kycStatus.completedSteps.map(s => s.stepName);
    
    const missingRequirements = requirements.filter(
      req => !completedSteps.includes(req)
    );
    
    return {
      canProgress: missingRequirements.length === 0,
      missingRequirements,
      completedRequirements: requirements.filter(req => completedSteps.includes(req)),
      currentLevel,
      targetLevel,
    };
  }

  /**
   * Get requirements for a specific level
   * @param {number} level - Level number
   * @returns {Array}
   */
  getLevelRequirements(level) {
    const requirements = {
      1: ['phone_verification', 'email_verification'],
      2: ['nrc_upload', 'nrc_ocr', 'selfie_upload', 'selfie_matching'],
      3: ['address_verification', 'bank_verification'],
      4: ['business_registration', 'tin_verification'],
    };
    
    return requirements[level] || [];
  }

  /**
   * Submit KYC for review
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async submitForReview(userId) {
    const progression = await this.checkLevelProgression(userId);
    
    if (!progression.canProgress) {
      throw new Error(
        `Cannot submit for review. Missing requirements: ${progression.missingRequirements.join(', ')}`
      );
    }
    
    const kycStatus = await KYCStatus.findOne({ userId });
    await kycStatus.submitForReview();
    
    // Send notification to admins (in a real system)
    // await this.notifyAdminsNewKYCSubmission(userId, kycStatus);
    
    return kycStatus;
  }

  /**
   * Approve KYC (admin only)
   * @param {string} userId - User ID
   * @param {string} adminId - Admin user ID
   * @param {string} notes - Review notes
   * @returns {Promise<Object>}
   */
  async approveKYC(userId, adminId, notes = '') {
    const kycStatus = await KYCStatus.findOne({ userId });
    
    if (!kycStatus) {
      throw new Error('KYC status not found');
    }
    
    if (kycStatus.status !== KYC_STATUS.PENDING_REVIEW) {
      throw new Error('KYC is not pending review');
    }
    
    await kycStatus.approve(adminId, notes);
    
    // Update user KYC status
    await User.findByIdAndUpdate(userId, {
      'referrerProfile.kycStatus': 'verified',
      'referrerProfile.kycVerifiedAt': new Date(),
    });
    
    // Send notification to user
    await sendNotification({
      userId,
      type: NOTIFICATION_TYPES.KYC_VERIFIED,
      title: 'KYC Verification Approved',
      message: `Your KYC verification has been approved. You are now at Level ${kycStatus.currentLevel}.`,
      priority: NOTIFICATION_PRIORITY.HIGH,
    });
    
    return kycStatus;
  }

  /**
   * Reject KYC (admin only)
   * @param {string} userId - User ID
   * @param {string} adminId - Admin user ID
   * @param {Object} reason - Rejection reason
   * @returns {Promise<Object>}
   */
  async rejectKYC(userId, adminId, reason) {
    const kycStatus = await KYCStatus.findOne({ userId });
    
    if (!kycStatus) {
      throw new Error('KYC status not found');
    }
    
    await kycStatus.reject(reason, adminId);
    
    // Update user KYC status
    await User.findByIdAndUpdate(userId, {
      'referrerProfile.kycStatus': 'rejected',
    });
    
    // Send notification to user
    await sendNotification({
      userId,
      type: NOTIFICATION_TYPES.KYC_REJECTED,
      title: 'KYC Verification Rejected',
      message: `Your KYC verification was rejected. Reason: ${reason.message}`,
      priority: NOTIFICATION_PRIORITY.HIGH,
    });
    
    return kycStatus;
  }

  // ==================== ADMIN FUNCTIONS ====================

  /**
   * Get pending KYC reviews
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getPendingReviews(options = {}) {
    return KYCStatus.findPendingReviews(options);
  }

  /**
   * Get KYC statistics
   * @returns {Promise<Object>}
   */
  async getStatistics() {
    return KYCStatus.getStatistics();
  }

  /**
   * Search KYC records
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Array>}
   */
  async searchKYC(criteria) {
    const query = {};
    
    if (criteria.status) {
      query.status = criteria.status;
    }
    
    if (criteria.level) {
      query.currentLevel = criteria.level;
    }
    
    if (criteria.nrcNumber) {
      query['levelStatus.level2.nrcNumber'] = criteria.nrcNumber;
    }
    
    if (criteria.dateFrom || criteria.dateTo) {
      query.createdAt = {};
      if (criteria.dateFrom) query.createdAt.$gte = new Date(criteria.dateFrom);
      if (criteria.dateTo) query.createdAt.$lte = new Date(criteria.dateTo);
    }
    
    return KYCStatus.find(query)
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(criteria.limit || 100);
  }

  // ==================== VERIFICATION HELPERS ====================

  /**
   * Verify phone number with OTP
   * @param {string} userId - User ID
   * @param {string} phone - Phone number
   * @param {string} otp - OTP code
   * @returns {Promise<Object>}
   */
  async verifyPhone(userId, phone, otp) {
    // Validate phone format
    const phoneValidation = this.validateMyanmarPhone(phone);
    if (!phoneValidation.valid) {
      throw new Error(phoneValidation.error);
    }
    
    // In a real system, verify OTP against stored code
    // For now, mock verification
    const isValidOTP = otp === '123456'; // Mock OTP
    
    if (!isValidOTP) {
      throw new Error('Invalid OTP');
    }
    
    // Update user phone
    await User.findByIdAndUpdate(userId, { phone: phoneValidation.internationalFormat });
    
    // Update KYC status
    const kycStatus = await KYCStatus.findOneAndUpdate(
      { userId },
      {
        $set: {
          'levelStatus.level1.phoneVerified': true,
          'levelStatus.level1.phoneVerifiedAt': new Date(),
        },
      },
      { new: true, upsert: true }
    );
    
    await kycStatus.updateStep('phone_verification', 'completed', {
      phone: phoneValidation.internationalFormat,
    });
    
    return {
      verified: true,
      phone: phoneValidation.internationalFormat,
    };
  }

  /**
   * Verify email
   * @param {string} userId - User ID
   * @param {string} email - Email address
   * @returns {Promise<Object>}
   */
  async verifyEmail(userId, email) {
    // Validate email format
    const emailValidation = this.validateEmail(email);
    if (!emailValidation.valid) {
      throw new Error(emailValidation.error);
    }
    
    // Update KYC status
    const kycStatus = await KYCStatus.findOneAndUpdate(
      { userId },
      {
        $set: {
          'levelStatus.level1.emailVerified': true,
          'levelStatus.level1.emailVerifiedAt': new Date(),
        },
      },
      { new: true, upsert: true }
    );
    
    await kycStatus.updateStep('email_verification', 'completed', { email });
    
    // Check if Level 1 is complete
    if (kycStatus.levelStatus.level1.phoneVerified && 
        kycStatus.levelStatus.level1.emailVerified) {
      kycStatus.levelStatus.level1.status = KYC_STATUS.VERIFIED;
      kycStatus.levelStatus.level1.completedAt = new Date();
      kycStatus.currentLevel = 1;
      await kycStatus.save();
    }
    
    return { verified: true, email };
  }

  /**
   * Update address verification
   * @param {string} userId - User ID
   * @param {Object} addressData - Address details
   * @returns {Promise<Object>}
   */
  async updateAddress(userId, addressData) {
    const kycStatus = await KYCStatus.findOne({ userId });
    
    if (!kycStatus) {
      throw new Error('KYC status not found');
    }
    
    kycStatus.levelStatus.level3.addressDetails = {
      street: addressData.street,
      township: addressData.township,
      city: addressData.city,
      state: addressData.state,
      postalCode: addressData.postalCode,
      country: addressData.country || 'Myanmar',
    };
    kycStatus.levelStatus.level3.addressVerified = true;
    kycStatus.levelStatus.level3.addressVerifiedAt = new Date();
    
    await kycStatus.updateStep('address_verification', 'completed', addressData);
    await kycStatus.save();
    
    return kycStatus;
  }

  /**
   * Update bank verification
   * @param {string} userId - User ID
   * @param {Object} bankData - Bank details
   * @returns {Promise<Object>}
   */
  async updateBankDetails(userId, bankData) {
    const kycStatus = await KYCStatus.findOne({ userId });
    
    if (!kycStatus) {
      throw new Error('KYC status not found');
    }
    
    // Validate Myanmar bank account format (simplified)
    const bankValidation = this.validateMyanmarBankAccount(bankData.accountNumber, bankData.bankName);
    if (!bankValidation.valid) {
      throw new Error(bankValidation.error);
    }
    
    kycStatus.levelStatus.level3.bankDetails = {
      bankName: bankData.bankName,
      accountNumber: bankData.accountNumber,
      accountHolderName: bankData.accountHolderName,
      branch: bankData.branch,
    };
    kycStatus.levelStatus.level3.bankVerified = true;
    kycStatus.levelStatus.level3.bankVerifiedAt = new Date();
    
    // Check if Level 3 is complete
    if (kycStatus.levelStatus.level3.addressVerified && 
        kycStatus.levelStatus.level3.bankVerified) {
      kycStatus.levelStatus.level3.status = KYC_STATUS.VERIFIED;
      kycStatus.levelStatus.level3.completedAt = new Date();
      kycStatus.currentLevel = 3;
    }
    
    await kycStatus.updateStep('bank_verification', 'completed', bankData);
    await kycStatus.save();
    
    return kycStatus;
  }

  /**
   * Validate Myanmar bank account
   * @param {string} accountNumber - Account number
   * @param {string} bankName - Bank name
   * @returns {Object}
   */
  validateMyanmarBankAccount(accountNumber, bankName) {
    if (!accountNumber || accountNumber.length < 6) {
      return { valid: false, error: 'Invalid account number' };
    }
    
    const myanmarBanks = [
      'KBZ Bank',
      'CB Bank',
      'AYA Bank',
      'MAB Bank',
      'Yoma Bank',
      'UAB Bank',
      'AGD Bank',
      'Myanmar Apex Bank',
      'Shwe Rural and Urban Development Bank',
    ];
    
    if (bankName && !myanmarBanks.some(b => b.toLowerCase() === bankName.toLowerCase())) {
      // Not a strict validation - just a warning
      console.warn(`Unrecognized bank: ${bankName}`);
    }
    
    return { valid: true };
  }

  /**
   * Update business verification (Level 4)
   * @param {string} userId - User ID
   * @param {Object} businessData - Business details
   * @returns {Promise<Object>}
   */
  async updateBusinessDetails(userId, businessData) {
    const kycStatus = await KYCStatus.findOne({ userId });
    
    if (!kycStatus) {
      throw new Error('KYC status not found');
    }
    
    kycStatus.levelStatus.level4.businessType = businessData.businessType;
    kycStatus.levelStatus.level4.companyName = businessData.companyName;
    kycStatus.levelStatus.level4.businessRegistrationNumber = businessData.registrationNumber;
    kycStatus.levelStatus.level4.tinNumber = businessData.tinNumber;
    kycStatus.levelStatus.level4.businessRegistrationVerified = true;
    kycStatus.levelStatus.level4.businessRegistrationVerifiedAt = new Date();
    kycStatus.levelStatus.level4.tinVerified = true;
    kycStatus.levelStatus.level4.tinVerifiedAt = new Date();
    
    await kycStatus.updateStep('business_registration', 'completed', businessData);
    await kycStatus.updateStep('tin_verification', 'completed', { tin: businessData.tinNumber });
    await kycStatus.save();
    
    return kycStatus;
  }
}

// ==================== MOCK OCR ENGINE ====================

/**
 * Mock OCR Engine for development
 * Replace with actual OCR provider (Google Vision, AWS Textract, etc.)
 */
class MockOCREngine {
  async processNRC(document) {
    // Simulate processing delay
    await this.delay(1000);
    
    // Mock NRC data extraction
    return {
      rawText: 'REPUBLIC OF THE UNION OF MYANMAR\nNATIONAL REGISTRATION CARD\n\n12/ABC(N)123456\nName: John Doe\nFather: U Hla Doe\nDOB: 1990-01-01',
      extractedData: {
        nrcNumber: '12/ABC(N)123456',
        nrcStateRegion: 'Yangon',
        nrcType: 'N',
        name: 'John Doe',
        fatherName: 'U Hla Doe',
        dateOfBirth: new Date('1990-01-01'),
        nationality: 'Myanmar',
        confidence: 85,
      },
      confidence: {
        overall: 85,
        fields: [
          { field: 'nrcNumber', confidence: 95, value: '12/ABC(N)123456' },
          { field: 'name', confidence: 80, value: 'John Doe' },
          { field: 'fatherName', confidence: 75, value: 'U Hla Doe' },
        ],
      },
      engine: 'mock_tesseract',
      processingDuration: 1000,
    };
  }

  async processSelfie(document) {
    await this.delay(500);
    
    return {
      rawText: '',
      extractedData: {},
      confidence: {
        overall: 90,
        fields: [],
      },
      faceDetection: {
        detected: true,
        confidence: 95,
        faceCount: 1,
        quality: {
          brightness: 80,
          sharpness: 85,
          contrast: 75,
        },
      },
      engine: 'mock_face_api',
      processingDuration: 500,
    };
  }

  async processPassport(document) {
    await this.delay(1000);
    
    return {
      rawText: 'PASSPORT\nType: P\nCountry: MM\nPassport No: P12345678',
      extractedData: {
        passportNumber: 'P12345678',
        issuingCountry: 'MM',
        issueDate: new Date('2020-01-01'),
        expiryDate: new Date('2030-01-01'),
        confidence: 80,
      },
      confidence: {
        overall: 80,
        fields: [
          { field: 'passportNumber', confidence: 90, value: 'P12345678' },
        ],
      },
      engine: 'mock_tesseract',
      processingDuration: 1000,
    };
  }

  async processBusinessDoc(document) {
    await this.delay(1500);
    
    return {
      rawText: 'BUSINESS REGISTRATION\nCompany: ABC Co., Ltd.\nReg No: 123456789\nTIN: 123-456-789',
      extractedData: {
        businessName: 'ABC Co., Ltd.',
        registrationNumber: '123456789',
        tinNumber: '123-456-789',
        registeredDate: new Date('2020-01-01'),
        confidence: 75,
      },
      confidence: {
        overall: 75,
        fields: [
          { field: 'businessName', confidence: 80, value: 'ABC Co., Ltd.' },
          { field: 'registrationNumber', confidence: 70, value: '123456789' },
        ],
      },
      engine: 'mock_tesseract',
      processingDuration: 1500,
    };
  }

  async processGeneric(document) {
    await this.delay(500);
    
    return {
      rawText: 'Document processed',
      extractedData: {},
      confidence: {
        overall: 50,
        fields: [],
      },
      engine: 'mock_tesseract',
      processingDuration: 500,
    };
  }

  async matchFaces(selfieDoc, idDoc) {
    await this.delay(800);
    
    // Mock face matching with 85% confidence
    const score = 85 + Math.random() * 10;
    
    return {
      matched: score > 70,
      score: Math.round(score * 100) / 100,
      confidence: score,
      method: 'mock_face_recognition',
    };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create singleton instance
const kycService = new KYCService();

module.exports = kycService;
