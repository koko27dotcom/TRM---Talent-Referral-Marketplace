/**
 * Compliance Routes
 * API routes for GDPR data export, right to be forgotten, and compliance management
 */

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.js');
const { validateBody, validateQuery } = require('../middleware/requestValidator.js');
const complianceService = require('../services/complianceService.js');
const auditService = require('../services/auditService.js');
const ComplianceReport = require('../models/ComplianceReport.js');
const User = require('../models/User.js');
const Application = require('../models/Application.js');
const Referral = require('../models/Referral.js');
const PayoutRequest = require('../models/PayoutRequest.js');
const AuditLog = require('../models/AuditLog.js');
const Notification = require('../models/Notification.js');

const router = express.Router();

/**
 * @route POST /api/compliance/data-export
 * @desc Request GDPR data export (right to data portability)
 * @access Private
 */
router.post(
  '/data-export',
  authenticate,
  validateBody({
    format: { type: 'string', required: true, enum: ['json', 'csv', 'xml'] },
    dataTypes: { type: 'array' },
    reason: { type: 'string', max: 500 },
  }),
  async (req, res, next) => {
    try {
      const { format, dataTypes, reason } = req.validatedBody;
      
      // Check for recent export requests
      const recentExport = await ComplianceReport.findOne({
        type: 'data_export',
        'metadata.userId': req.user._id,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      });
      
      if (recentExport) {
        return res.status(429).json({
          success: false,
          message: 'You can only request one data export per 24 hours',
          nextAvailable: new Date(recentExport.createdAt.getTime() + 24 * 60 * 60 * 1000),
        });
      }
      
      // Create export request
      const exportRequest = await complianceService.createDataExportRequest(
        req.user._id,
        format,
        dataTypes || ['all'],
        reason
      );
      
      // Log the request
      await auditService.logSecurityEvent(
        'DATA_EXPORT_REQUESTED',
        req.user._id,
        'medium',
        { format, dataTypes },
        req
      );
      
      // Start async export process
      complianceService.processDataExport(exportRequest._id).catch(console.error);
      
      res.status(202).json({
        success: true,
        message: 'Data export request received. You will be notified when it\'s ready.',
        data: {
          requestId: exportRequest._id,
          status: exportRequest.status,
          estimatedCompletion: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/compliance/data-export/requests
 * @desc Get user's data export requests
 * @access Private
 */
router.get(
  '/data-export/requests',
  authenticate,
  async (req, res, next) => {
    try {
      const requests = await ComplianceReport.find({
        type: 'data_export',
        'metadata.userId': req.user._id,
      })
        .sort({ createdAt: -1 })
        .select('status createdAt completedAt metadata.format metadata.dataTypes')
        .lean();
      
      res.json({
        success: true,
        data: requests,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/compliance/data-export/:id/download
 * @desc Download data export file
 * @access Private
 */
router.get(
  '/data-export/:id/download',
  authenticate,
  async (req, res, next) => {
    try {
      const exportRequest = await ComplianceReport.findOne({
        _id: req.params.id,
        type: 'data_export',
        'metadata.userId': req.user._id,
        status: 'completed',
      });
      
      if (!exportRequest) {
        return res.status(404).json({
          success: false,
          message: 'Export not found or not ready',
        });
      }
      
      // Check if download link is still valid
      const expiresAt = new Date(exportRequest.metadata.expiresAt);
      if (expiresAt < new Date()) {
        return res.status(410).json({
          success: false,
          message: 'Download link has expired. Please request a new export.',
        });
      }
      
      // Log download
      await auditService.logSecurityEvent(
        'DATA_EXPORT_DOWNLOADED',
        req.user._id,
        'medium',
        { exportId: exportRequest._id },
        req
      );
      
      // Return download URL or file
      res.json({
        success: true,
        data: {
          downloadUrl: exportRequest.metadata.downloadUrl,
          expiresAt: exportRequest.metadata.expiresAt,
          fileSize: exportRequest.metadata.fileSize,
          format: exportRequest.metadata.format,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/compliance/right-to-be-forgotten
 * @desc Request account deletion (right to be forgotten)
 * @access Private
 */
router.post(
  '/right-to-be-forgotten',
  authenticate,
  validateBody({
    reason: { type: 'string', max: 1000 },
    confirmation: { type: 'string', required: true },
    password: { type: 'string', required: true },
  }),
  async (req, res, next) => {
    try {
      const { reason, confirmation, password } = req.validatedBody;
      
      // Verify confirmation text
      if (confirmation !== 'DELETE MY ACCOUNT') {
        return res.status(400).json({
          success: false,
          message: 'Invalid confirmation text',
        });
      }
      
      // Verify password
      const user = await User.findById(req.user._id).select('+password');
      const isMatch = await user.comparePassword(password);
      
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid password',
        });
      }
      
      // Check for pending deletion requests
      const pendingRequest = await ComplianceReport.findOne({
        type: 'deletion_request',
        'metadata.userId': req.user._id,
        status: { $in: ['pending', 'in_progress'] },
      });
      
      if (pendingRequest) {
        return res.status(409).json({
          success: false,
          message: 'You already have a pending deletion request',
          data: {
            requestId: pendingRequest._id,
            status: pendingRequest.status,
            requestedAt: pendingRequest.createdAt,
          },
        });
      }
      
      // Create deletion request
      const deletionRequest = await complianceService.createDeletionRequest(
        req.user._id,
        reason
      );
      
      // Log the request
      await auditService.logSecurityEvent(
        'DELETION_REQUESTED',
        req.user._id,
        'high',
        { reason },
        req
      );
      
      res.status(202).json({
        success: true,
        message: 'Account deletion request received. Your account will be deleted within 30 days.',
        data: {
          requestId: deletionRequest._id,
          status: deletionRequest.status,
          scheduledDeletionDate: deletionRequest.metadata.scheduledDeletionDate,
          gracePeriodDays: 30,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/compliance/right-to-be-forgotten/:id/cancel
 * @desc Cancel pending deletion request
 * @access Private
 */
router.post(
  '/right-to-be-forgotten/:id/cancel',
  authenticate,
  async (req, res, next) => {
    try {
      const deletionRequest = await ComplianceReport.findOne({
        _id: req.params.id,
        type: 'deletion_request',
        'metadata.userId': req.user._id,
        status: { $in: ['pending', 'in_progress'] },
      });
      
      if (!deletionRequest) {
        return res.status(404).json({
          success: false,
          message: 'Deletion request not found or already processed',
        });
      }
      
      // Cancel the request
      deletionRequest.status = 'cancelled';
      deletionRequest.metadata.cancelledAt = new Date();
      deletionRequest.metadata.cancelledBy = req.user._id;
      await deletionRequest.save();
      
      // Log cancellation
      await auditService.logSecurityEvent(
        'DELETION_CANCELLED',
        req.user._id,
        'medium',
        { requestId: deletionRequest._id },
        req
      );
      
      res.json({
        success: true,
        message: 'Deletion request cancelled successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/compliance/privacy-data
 * @desc Get all privacy-related data for the user
 * @access Private
 */
router.get(
  '/privacy-data',
  authenticate,
  async (req, res, next) => {
    try {
      const userId = req.user._id;
      
      // Gather all user data
      const [
        user,
        applications,
        referrals,
        payouts,
        auditLogs,
        notifications,
        consentHistory,
      ] = await Promise.all([
        User.findById(userId).select('-password -__v').lean(),
        Application.find({ userId }).lean(),
        Referral.find({ referrerId: userId }).lean(),
        PayoutRequest.find({ userId }).lean(),
        AuditLog.find({ userId }).sort({ createdAt: -1 }).limit(100).lean(),
        Notification.find({ userId }).sort({ createdAt: -1 }).limit(50).lean(),
        complianceService.getConsentHistory(userId),
      ]);
      
      const privacyData = {
        profile: user,
        applications: applications.length,
        referrals: referrals.length,
        payouts: payouts.length,
        auditLogs: auditLogs.length,
        notifications: notifications.length,
        consentHistory,
        dataCategories: {
          personal: ['profile'],
          professional: ['applications', 'referrals'],
          financial: ['payouts'],
          activity: ['auditLogs', 'notifications'],
        },
      };
      
      res.json({
        success: true,
        data: privacyData,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/compliance/consent
 * @desc Get user's consent status
 * @access Private
 */
router.get(
  '/consent',
  authenticate,
  async (req, res, next) => {
    try {
      const consent = await complianceService.getUserConsent(req.user._id);
      
      res.json({
        success: true,
        data: consent,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/compliance/consent
 * @desc Update user consent
 * @access Private
 */
router.post(
  '/consent',
  authenticate,
  validateBody({
    marketing: { type: 'boolean' },
    analytics: { type: 'boolean' },
    thirdParty: { type: 'boolean' },
  }),
  async (req, res, next) => {
    try {
      const { marketing, analytics, thirdParty } = req.validatedBody;
      
      const consent = await complianceService.updateUserConsent(
        req.user._id,
        {
          marketing,
          analytics,
          thirdParty,
        },
        req
      );
      
      res.json({
        success: true,
        message: 'Consent preferences updated',
        data: consent,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/compliance/consent/withdraw
 * @desc Withdraw all consent
 * @access Private
 */
router.post(
  '/consent/withdraw',
  authenticate,
  validateBody({
    reason: { type: 'string', max: 500 },
  }),
  async (req, res, next) => {
    try {
      const { reason } = req.validatedBody;
      
      const consent = await complianceService.withdrawConsent(
        req.user._id,
        reason,
        req
      );
      
      res.json({
        success: true,
        message: 'All consent withdrawn successfully',
        data: consent,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/compliance/data-breach
 * @desc Get data breach notifications for user
 * @access Private
 */
router.get(
  '/data-breach',
  authenticate,
  async (req, res, next) => {
    try {
      const breaches = await ComplianceReport.find({
        type: 'data_breach',
        'metadata.affectedUsers': req.user._id,
        status: 'published',
      })
        .sort({ createdAt: -1 })
        .select('title description severity createdAt metadata')
        .lean();
      
      res.json({
        success: true,
        data: breaches,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/compliance/reports
 * @desc Get compliance reports (admin only)
 * @access Private - Admin
 */
router.get(
  '/reports',
  authenticate,
  authorize(['admin', 'compliance_officer']),
  validateQuery({
    page: { type: 'number', min: 1 },
    limit: { type: 'number', min: 1, max: 100 },
    type: { type: 'string' },
    status: { type: 'string' },
  }),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery || req.query;
      
      const page = parseInt(query.page) || 1;
      const limit = parseInt(query.limit) || 50;
      const skip = (page - 1) * limit;
      
      const filter = {};
      if (query.type) filter.type = query.type;
      if (query.status) filter.status = query.status;
      
      const [reports, total] = await Promise.all([
        ComplianceReport.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        ComplianceReport.countDocuments(filter),
      ]);
      
      res.json({
        success: true,
        data: reports,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/compliance/reports
 * @desc Create compliance report (admin only)
 * @access Private - Admin
 */
router.post(
  '/reports',
  authenticate,
  authorize(['admin', 'compliance_officer']),
  validateBody({
    type: { type: 'string', required: true },
    title: { type: 'string', required: true, max: 200 },
    description: { type: 'string', max: 5000 },
    framework: { type: 'string' },
    findings: { type: 'array' },
    recommendations: { type: 'array' },
  }),
  async (req, res, next) => {
    try {
      const report = await ComplianceReport.create({
        ...req.validatedBody,
        generatedBy: req.user._id,
        status: 'draft',
      });
      
      await auditService.logAdminAction(
        req.user._id,
        'CREATE_COMPLIANCE_REPORT',
        'ComplianceReport',
        report._id,
        { type: report.type },
        req
      );
      
      res.status(201).json({
        success: true,
        message: 'Compliance report created',
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/compliance/stats
 * @desc Get compliance statistics (admin only)
 * @access Private - Admin
 */
router.get(
  '/stats',
  authenticate,
  authorize(['admin', 'compliance_officer']),
  async (req, res, next) => {
    try {
      const stats = await complianceService.getComplianceStats();
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/compliance/regulations
 * @desc Get supported regulations info
 * @access Public
 */
router.get(
  '/regulations',
  async (req, res, next) => {
    try {
      const regulations = [
        {
          code: 'GDPR',
          name: 'General Data Protection Regulation',
          region: 'EU',
          description: 'Comprehensive EU data protection law',
          rights: [
            'Right to access',
            'Right to rectification',
            'Right to erasure',
            'Right to data portability',
            'Right to object',
          ],
        },
        {
          code: 'PDPA_TH',
          name: 'Personal Data Protection Act (Thailand)',
          region: 'Thailand',
          description: 'Thailand\'s data protection law',
          rights: [
            'Right to access',
            'Right to rectification',
            'Right to erasure',
            'Right to data portability',
            'Right to object',
            'Right to restrict processing',
          ],
        },
        {
          code: 'PDPA_SG',
          name: 'Personal Data Protection Act (Singapore)',
          region: 'Singapore',
          description: 'Singapore\'s data protection law',
          rights: [
            'Right to access',
            'Right to rectification',
            'Right to erasure',
            'Right to data portability',
            'Right to object',
          ],
        },
        {
          code: 'LOCAL_MM',
          name: 'Myanmar Data Protection Regulations',
          region: 'Myanmar',
          description: 'Local Myanmar data protection requirements',
          rights: [
            'Right to access',
            'Right to rectification',
            'Right to erasure',
          ],
        },
      ];
      
      res.json({
        success: true,
        data: regulations,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/compliance/contact-dpo
 * @desc Contact Data Protection Officer
 * @access Private
 */
router.post(
  '/contact-dpo',
  authenticate,
  validateBody({
    subject: { type: 'string', required: true, max: 200 },
    message: { type: 'string', required: true, max: 5000 },
    category: { type: 'string', required: true, enum: ['access', 'deletion', 'correction', 'complaint', 'other'] },
  }),
  async (req, res, next) => {
    try {
      const { subject, message, category } = req.validatedBody;
      
      // Create DPO request
      const dpoRequest = await ComplianceReport.create({
        type: 'dpo_request',
        title: subject,
        description: message,
        framework: category,
        status: 'open',
        generatedBy: req.user._id,
        metadata: {
          userId: req.user._id,
          category,
        },
      });
      
      // Log the request
      await auditService.logSecurityEvent(
        'DPO_CONTACT',
        req.user._id,
        'medium',
        { category, requestId: dpoRequest._id },
        req
      );
      
      res.status(201).json({
        success: true,
        message: 'Your request has been sent to our Data Protection Officer',
        data: {
          requestId: dpoRequest._id,
          responseTime: 'We aim to respond within 30 days',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
