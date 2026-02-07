/**
 * Data Validation Service
 * Validates and cleans scraped CV data
 * Provides quality scoring and data enrichment
 */

const CVData = require('../models/CVData.js');
const DataQualityReport = require('../models/DataQualityReport.js');
const ScrapingLog = require('../models/ScrapingLog.js');
const AuditLog = require('../models/AuditLog.js');

class DataValidationService {
  constructor() {
    this.validationRules = this.initializeValidationRules();
  }

  /**
   * Initialize validation rules
   */
  initializeValidationRules() {
    return {
      email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: 'Invalid email format',
      },
      phone: {
        required: false,
        pattern: /^[\d\s\-\+\(\)]+$/,
        message: 'Invalid phone number format',
      },
      name: {
        required: true,
        minLength: 2,
        maxLength: 100,
        message: 'Name must be between 2 and 100 characters',
      },
      experience: {
        required: false,
        validate: (exp) => {
          if (!exp || exp.length === 0) return true;
          return exp.every(e => e.company && e.title);
        },
        message: 'Each experience entry must have company and title',
      },
    };
  }

  /**
   * Validate a single CV record
   */
  async validateCV(cvId) {
    const cv = await CVData.findById(cvId);
    if (!cv) {
      throw new Error('CV not found');
    }

    const validationResults = {
      passed: true,
      score: 0,
      checks: [],
      errors: [],
      warnings: [],
    };

    // Validate required fields
    const requiredChecks = [
      { field: 'fullName', value: cv.fullName, rule: this.validationRules.name },
      { field: 'email', value: cv.contact?.email, rule: this.validationRules.email },
      { field: 'phone', value: cv.contact?.phone, rule: this.validationRules.phone },
    ];

    for (const check of requiredChecks) {
      const result = this.validateField(check.field, check.value, check.rule);
      validationResults.checks.push(result);
      
      if (!result.passed) {
        validationResults.passed = false;
        if (check.rule.required) {
          validationResults.errors.push(result.message);
        } else {
          validationResults.warnings.push(result.message);
        }
      }
    }

    // Validate experience
    if (cv.experience && cv.experience.length > 0) {
      const expResult = this.validationRules.experience.validate(cv.experience);
      validationResults.checks.push({
        field: 'experience',
        passed: expResult,
        message: expResult ? 'Valid' : this.validationRules.experience.message,
      });
      if (!expResult) {
        validationResults.warnings.push(this.validationRules.experience.message);
      }
    }

    // Calculate completeness score
    const completenessScore = this.calculateCompletenessScore(cv);
    validationResults.score = completenessScore;

    // Update CV with validation results
    cv.quality.completeness = completenessScore;
    cv.quality.validationErrors = validationResults.errors.map(e => ({
      field: 'general',
      message: e,
      severity: 'error',
    }));
    cv.quality.lastValidatedAt = new Date();
    await cv.save();

    return validationResults;
  }

  /**
   * Validate a single field
   */
  validateField(fieldName, value, rule) {
    // Check required
    if (rule.required && (!value || value.trim() === '')) {
      return {
        field: fieldName,
        passed: false,
        message: `${fieldName} is required`,
        severity: 'error',
      };
    }

    // If not required and empty, it's valid
    if (!value || value.trim() === '') {
      return {
        field: fieldName,
        passed: true,
        message: 'Optional field is empty',
        severity: 'info',
      };
    }

    // Check pattern
    if (rule.pattern && !rule.pattern.test(value)) {
      return {
        field: fieldName,
        passed: false,
        message: rule.message,
        severity: 'error',
      };
    }

    // Check length
    if (rule.minLength && value.length < rule.minLength) {
      return {
        field: fieldName,
        passed: false,
        message: `${fieldName} is too short (min ${rule.minLength})`,
        severity: 'error',
      };
    }

    if (rule.maxLength && value.length > rule.maxLength) {
      return {
        field: fieldName,
        passed: false,
        message: `${fieldName} is too long (max ${rule.maxLength})`,
        severity: 'warning',
      };
    }

    return {
      field: fieldName,
      passed: true,
      message: 'Valid',
      severity: 'info',
    };
  }

  /**
   * Calculate completeness score
   */
  calculateCompletenessScore(cv) {
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

    for (const { field, weight, isArray } of fields) {
      totalWeight += weight;
      const value = field.split('.').reduce((obj, key) => obj?.[key], cv.toObject());
      
      if (isArray) {
        if (value && Array.isArray(value) && value.length > 0) {
          filledWeight += weight;
        }
      } else {
        if (value && String(value).trim() !== '') {
          filledWeight += weight;
        }
      }
    }

    return Math.round((filledWeight / totalWeight) * 100);
  }

  /**
   * Bulk validate CVs
   */
  async bulkValidate(query = {}, options = {}) {
    const batchSize = options.batchSize || 100;
    const cursor = CVData.find(query).cursor();
    
    const results = {
      total: 0,
      valid: 0,
      invalid: 0,
      errors: [],
    };

    let batch = [];
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      batch.push(doc);
      
      if (batch.length >= batchSize) {
        const batchResults = await this.processValidationBatch(batch);
        results.total += batchResults.total;
        results.valid += batchResults.valid;
        results.invalid += batchResults.invalid;
        results.errors.push(...batchResults.errors);
        batch = [];
      }
    }

    // Process remaining batch
    if (batch.length > 0) {
      const batchResults = await this.processValidationBatch(batch);
      results.total += batchResults.total;
      results.valid += batchResults.valid;
      results.invalid += batchResults.invalid;
      results.errors.push(...batchResults.errors);
    }

    return results;
  }

  /**
   * Process a batch of validations
   */
  async processValidationBatch(cvs) {
    const results = {
      total: cvs.length,
      valid: 0,
      invalid: 0,
      errors: [],
    };

    for (const cv of cvs) {
      try {
        const validation = await this.validateCV(cv._id);
        if (validation.passed) {
          results.valid++;
        } else {
          results.invalid++;
        }
      } catch (error) {
        results.invalid++;
        results.errors.push({ cvId: cv._id, error: error.message });
      }
    }

    return results;
  }

  /**
   * Clean and normalize data
   */
  async cleanData(cvId) {
    const cv = await CVData.findById(cvId);
    if (!cv) {
      throw new Error('CV not found');
    }

    const changes = [];

    // Clean email
    if (cv.contact?.email) {
      const cleanedEmail = cv.contact.email.toLowerCase().trim();
      if (cleanedEmail !== cv.contact.email) {
        changes.push({ field: 'email', old: cv.contact.email, new: cleanedEmail });
        cv.contact.email = cleanedEmail;
      }
    }

    // Clean phone
    if (cv.contact?.phone) {
      const cleanedPhone = cv.contact.phone.replace(/\s+/g, '').trim();
      if (cleanedPhone !== cv.contact.phone) {
        changes.push({ field: 'phone', old: cv.contact.phone, new: cleanedPhone });
        cv.contact.phone = cleanedPhone;
      }
    }

    // Clean name
    if (cv.fullName) {
      const cleanedName = cv.fullName.replace(/\s+/g, ' ').trim();
      if (cleanedName !== cv.fullName) {
        changes.push({ field: 'fullName', old: cv.fullName, new: cleanedName });
        cv.fullName = cleanedName;
      }
    }

    // Remove empty arrays
    if (cv.experience && cv.experience.length === 0) {
      cv.experience = undefined;
      changes.push({ field: 'experience', action: 'removed_empty' });
    }

    if (changes.length > 0) {
      cv.processingHistory.push({
        action: 'data_cleaned',
        timestamp: new Date(),
        details: { changes },
      });
      await cv.save();
    }

    return {
      cvId: cv._id,
      cleaned: changes.length > 0,
      changes,
    };
  }

  /**
   * Find and mark duplicates
   */
  async findDuplicates(options = {}) {
    const matchFields = options.matchFields || ['contact.email', 'contact.phone'];
    const threshold = options.threshold || 0.9;

    // Find potential duplicates based on email
    const duplicates = await CVData.aggregate([
      {
        $match: {
          'contact.email': { $exists: true, $ne: null },
          status: { $ne: 'duplicate' },
        },
      },
      {
        $group: {
          _id: '$contact.email',
          count: { $sum: 1 },
          docs: { $push: '$$ROOT' },
        },
      },
      {
        $match: {
          count: { $gt: 1 },
        },
      },
    ]);

    const results = [];
    for (const group of duplicates) {
      const primary = group.docs[0];
      for (let i = 1; i < group.docs.length; i++) {
        const duplicate = group.docs[i];
        await this.markAsDuplicate(duplicate._id, primary._id, 1.0, ['email']);
        results.push({
          primary: primary._id,
          duplicate: duplicate._id,
          confidence: 1.0,
          matchFields: ['email'],
        });
      }
    }

    return {
      groupsFound: duplicates.length,
      duplicatesMarked: results.length,
      results,
    };
  }

  /**
   * Mark CV as duplicate
   */
  async markAsDuplicate(cvId, duplicateOfId, confidence, matchFields) {
    const cv = await CVData.findById(cvId);
    if (!cv) {
      throw new Error('CV not found');
    }

    await cv.markAsDuplicate(duplicateOfId, confidence, matchFields);

    await AuditLog.create({
      action: 'CV_MARKED_DUPLICATE',
      entityType: 'CVData',
      entityId: cvId,
      details: { duplicateOfId, confidence, matchFields },
    });

    return { success: true };
  }

  /**
   * Merge duplicate CVs
   */
  async mergeDuplicates(primaryId, duplicateIds, userId) {
    const primary = await CVData.findById(primaryId);
    if (!primary) {
      throw new Error('Primary CV not found');
    }

    const results = {
      merged: [],
      failed: [],
    };

    for (const duplicateId of duplicateIds) {
      try {
        await primary.mergeWith(duplicateId);
        results.merged.push(duplicateId);
      } catch (error) {
        results.failed.push({ id: duplicateId, error: error.message });
      }
    }

    await AuditLog.create({
      action: 'CV_DUPLICATES_MERGED',
      userId,
      entityType: 'CVData',
      entityId: primaryId,
      details: { duplicateIds, results },
    });

    return results;
  }

  /**
   * Generate quality report
   */
  async generateQualityReport(options = {}) {
    const { sourceIds, dateRange } = options;

    const matchStage = {};
    if (sourceIds) matchStage['source.sourceId'] = { $in: sourceIds };
    if (dateRange) {
      matchStage.createdAt = {};
      if (dateRange.from) matchStage.createdAt.$gte = new Date(dateRange.from);
      if (dateRange.to) matchStage.createdAt.$lte = new Date(dateRange.to);
    }

    const stats = await CVData.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avgQuality: { $avg: '$quality.overallScore' },
          avgCompleteness: { $avg: '$quality.completeness' },
          withEmail: {
            $sum: { $cond: [{ $ifNull: ['$contact.email', false] }, 1, 0] },
          },
          withPhone: {
            $sum: { $cond: [{ $ifNull: ['$contact.phone', false] }, 1, 0] },
          },
          withExperience: {
            $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ['$experience', []] } }, 0] }, 1, 0] },
          },
          withEducation: {
            $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ['$education', []] } }, 0] }, 1, 0] },
          },
        },
      },
    ]);

    return stats[0] || {
      total: 0,
      avgQuality: 0,
      avgCompleteness: 0,
      withEmail: 0,
      withPhone: 0,
      withExperience: 0,
      withEducation: 0,
    };
  }

  /**
   * Get validation statistics
   */
  async getValidationStatistics() {
    const [total, validated, withErrors, byStatus] = await Promise.all([
      CVData.countDocuments(),
      CVData.countDocuments({ 'quality.lastValidatedAt': { $exists: true } }),
      CVData.countDocuments({ 'quality.validationErrors.0': { $exists: true } }),
      CVData.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    return {
      total,
      validated,
      withErrors,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };
  }
}

module.exports = new DataValidationService();