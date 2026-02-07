/**
 * Data Retention Routes
 * API routes for managing data retention policies
 */

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.js');
const { validateBody, validateQuery, validateParams } = require('../middleware/requestValidator.js');
const dataRetentionService = require('../services/dataRetentionService.js');
const auditService = require('../services/auditService.js');
const DataRetentionPolicy = require('../models/DataRetentionPolicy.js');

const router = express.Router();

/**
 * @route GET /api/data-retention/policies
 * @desc Get all data retention policies
 * @access Private - Admin
 */
router.get(
  '/policies',
  authenticate,
  authorize(['admin', 'compliance_officer', 'data_protection_officer']),
  validateQuery({
    page: { type: 'number', min: 1 },
    limit: { type: 'number', min: 1, max: 100 },
    dataType: { type: 'string' },
    status: { type: 'string' },
    jurisdiction: { type: 'string' },
  }),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery || req.query;
      
      const page = parseInt(query.page) || 1;
      const limit = parseInt(query.limit) || 50;
      const skip = (page - 1) * limit;
      
      const filter = {};
      if (query.dataType) filter.dataType = query.dataType;
      if (query.status) filter.status = query.status;
      if (query.jurisdiction) filter.jurisdiction = query.jurisdiction;
      
      const [policies, total] = await Promise.all([
        DataRetentionPolicy.find(filter)
          .sort({ dataType: 1 })
          .skip(skip)
          .limit(limit)
          .populate('createdBy', 'name email')
          .populate('updatedBy', 'name email')
          .lean(),
        DataRetentionPolicy.countDocuments(filter),
      ]);
      
      res.json({
        success: true,
        data: policies,
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
 * @route GET /api/data-retention/policies/:id
 * @desc Get single data retention policy
 * @access Private - Admin
 */
router.get(
  '/policies/:id',
  authenticate,
  authorize(['admin', 'compliance_officer', 'data_protection_officer']),
  validateParams({
    id: { type: 'objectId', required: true },
  }),
  async (req, res, next) => {
    try {
      const policy = await DataRetentionPolicy.findById(req.params.id)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .lean();
      
      if (!policy) {
        return res.status(404).json({
          success: false,
          message: 'Policy not found',
        });
      }
      
      res.json({
        success: true,
        data: policy,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/data-retention/policies
 * @desc Create new data retention policy
 * @access Private - Admin
 */
router.post(
  '/policies',
  authenticate,
  authorize(['admin', 'compliance_officer']),
  validateBody({
    dataType: { type: 'string', required: true, max: 100 },
    description: { type: 'string', max: 1000 },
    retentionPeriod: { type: 'number', required: true, min: 1 },
    retentionUnit: { type: 'string', required: true, enum: ['days', 'months', 'years'] },
    legalBasis: { type: 'string', required: true, max: 500 },
    jurisdiction: { type: 'string', max: 100 },
    legalRequirements: { type: 'array' },
    purgeAction: { type: 'string', enum: ['delete', 'anonymize', 'archive'] },
    archiveLocation: { type: 'string', max: 500 },
    notificationDays: { type: 'number', min: 0 },
    requiresApproval: { type: 'boolean' },
    exceptions: { type: 'array' },
  }),
  async (req, res, next) => {
    try {
      const policyData = {
        ...req.validatedBody,
        createdBy: req.user._id,
        status: 'active',
      };
      
      const policy = await DataRetentionPolicy.create(policyData);
      
      await auditService.logAdminAction(
        req.user._id,
        'CREATE_RETENTION_POLICY',
        'DataRetentionPolicy',
        policy._id,
        { dataType: policy.dataType, retentionPeriod: policy.retentionPeriod },
        req
      );
      
      res.status(201).json({
        success: true,
        message: 'Data retention policy created',
        data: policy,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route PUT /api/data-retention/policies/:id
 * @desc Update data retention policy
 * @access Private - Admin
 */
router.put(
  '/policies/:id',
  authenticate,
  authorize(['admin', 'compliance_officer']),
  validateParams({
    id: { type: 'objectId', required: true },
  }),
  validateBody({
    description: { type: 'string', max: 1000 },
    retentionPeriod: { type: 'number', min: 1 },
    retentionUnit: { type: 'string', enum: ['days', 'months', 'years'] },
    legalBasis: { type: 'string', max: 500 },
    jurisdiction: { type: 'string', max: 100 },
    legalRequirements: { type: 'array' },
    purgeAction: { type: 'string', enum: ['delete', 'anonymize', 'archive'] },
    archiveLocation: { type: 'string', max: 500 },
    notificationDays: { type: 'number', min: 0 },
    requiresApproval: { type: 'boolean' },
    exceptions: { type: 'array' },
    status: { type: 'string', enum: ['active', 'inactive', 'deprecated'] },
  }),
  async (req, res, next) => {
    try {
      const policy = await DataRetentionPolicy.findById(req.params.id);
      
      if (!policy) {
        return res.status(404).json({
          success: false,
          message: 'Policy not found',
        });
      }
      
      // Update fields
      Object.assign(policy, req.validatedBody, {
        updatedBy: req.user._id,
        updatedAt: new Date(),
      });
      
      await policy.save();
      
      await auditService.logAdminAction(
        req.user._id,
        'UPDATE_RETENTION_POLICY',
        'DataRetentionPolicy',
        policy._id,
        { changes: req.validatedBody },
        req
      );
      
      res.json({
        success: true,
        message: 'Data retention policy updated',
        data: policy,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route DELETE /api/data-retention/policies/:id
 * @desc Delete data retention policy
 * @access Private - Admin
 */
router.delete(
  '/policies/:id',
  authenticate,
  authorize(['admin']),
  validateParams({
    id: { type: 'objectId', required: true },
  }),
  async (req, res, next) => {
    try {
      const policy = await DataRetentionPolicy.findById(req.params.id);
      
      if (!policy) {
        return res.status(404).json({
          success: false,
          message: 'Policy not found',
        });
      }
      
      // Soft delete by marking as deprecated
      policy.status = 'deprecated';
      policy.updatedBy = req.user._id;
      policy.updatedAt = new Date();
      await policy.save();
      
      await auditService.logAdminAction(
        req.user._id,
        'DELETE_RETENTION_POLICY',
        'DataRetentionPolicy',
        policy._id,
        { dataType: policy.dataType },
        req
      );
      
      res.json({
        success: true,
        message: 'Data retention policy deleted',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/data-retention/policies/:id/activate
 * @desc Activate a policy
 * @access Private - Admin
 */
router.post(
  '/policies/:id/activate',
  authenticate,
  authorize(['admin', 'compliance_officer']),
  validateParams({
    id: { type: 'objectId', required: true },
  }),
  async (req, res, next) => {
    try {
      const policy = await DataRetentionPolicy.findById(req.params.id);
      
      if (!policy) {
        return res.status(404).json({
          success: false,
          message: 'Policy not found',
        });
      }
      
      policy.status = 'active';
      policy.updatedBy = req.user._id;
      policy.updatedAt = new Date();
      await policy.save();
      
      await auditService.logAdminAction(
        req.user._id,
        'ACTIVATE_RETENTION_POLICY',
        'DataRetentionPolicy',
        policy._id,
        {},
        req
      );
      
      res.json({
        success: true,
        message: 'Policy activated',
        data: policy,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/data-retention/policies/:id/deactivate
 * @desc Deactivate a policy
 * @access Private - Admin
 */
router.post(
  '/policies/:id/deactivate',
  authenticate,
  authorize(['admin', 'compliance_officer']),
  validateParams({
    id: { type: 'objectId', required: true },
  }),
  async (req, res, next) => {
    try {
      const policy = await DataRetentionPolicy.findById(req.params.id);
      
      if (!policy) {
        return res.status(404).json({
          success: false,
          message: 'Policy not found',
        });
      }
      
      policy.status = 'inactive';
      policy.updatedBy = req.user._id;
      policy.updatedAt = new Date();
      await policy.save();
      
      await auditService.logAdminAction(
        req.user._id,
        'DEACTIVATE_RETENTION_POLICY',
        'DataRetentionPolicy',
        policy._id,
        {},
        req
      );
      
      res.json({
        success: true,
        message: 'Policy deactivated',
        data: policy,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/data-retention/execution-logs
 * @desc Get data retention execution logs
 * @access Private - Admin
 */
router.get(
  '/execution-logs',
  authenticate,
  authorize(['admin', 'compliance_officer', 'data_protection_officer']),
  validateQuery({
    page: { type: 'number', min: 1 },
    limit: { type: 'number', min: 1, max: 100 },
    policyId: { type: 'string' },
    status: { type: 'string' },
    startDate: { type: 'date' },
    endDate: { type: 'date' },
  }),
  async (req, res, next) => {
    try {
      const query = req.validatedQuery || req.query;
      
      const page = parseInt(query.page) || 1;
      const limit = parseInt(query.limit) || 50;
      const skip = (page - 1) * limit;
      
      const filter = {};
      if (query.policyId) filter.policyId = query.policyId;
      if (query.status) filter.status = query.status;
      if (query.startDate || query.endDate) {
        filter.executedAt = {};
        if (query.startDate) filter.executedAt.$gte = new Date(query.startDate);
        if (query.endDate) filter.executedAt.$lte = new Date(query.endDate);
      }
      
      const logs = await dataRetentionService.getExecutionLogs(filter, skip, limit);
      const total = await dataRetentionService.countExecutionLogs(filter);
      
      res.json({
        success: true,
        data: logs,
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
 * @route POST /api/data-retention/execute
 * @desc Manually trigger data retention execution
 * @access Private - Admin
 */
router.post(
  '/execute',
  authenticate,
  authorize(['admin', 'data_protection_officer']),
  validateBody({
    policyId: { type: 'string' },
    dryRun: { type: 'boolean' },
  }),
  async (req, res, next) => {
    try {
      const { policyId, dryRun = true } = req.validatedBody;
      
      await auditService.logAdminAction(
        req.user._id,
        'MANUAL_RETENTION_EXECUTION',
        'DataRetention',
        null,
        { policyId, dryRun },
        req
      );
      
      if (dryRun) {
        // Run in dry-run mode
        const results = await dataRetentionService.executeDryRun(policyId);
        
        return res.json({
          success: true,
          message: 'Dry run completed',
          data: {
            mode: 'dry_run',
            recordsAffected: results.length,
            sample: results.slice(0, 10),
          },
        });
      }
      
      // Execute actual retention
      const jobId = await dataRetentionService.executeRetention(policyId);
      
      res.status(202).json({
        success: true,
        message: 'Data retention execution started',
        data: {
          jobId,
          status: 'running',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/data-retention/stats
 * @desc Get data retention statistics
 * @access Private - Admin
 */
router.get(
  '/stats',
  authenticate,
  authorize(['admin', 'compliance_officer', 'data_protection_officer']),
  async (req, res, next) => {
    try {
      const stats = await dataRetentionService.getRetentionStats();
      
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
 * @route GET /api/data-retention/data-types
 * @desc Get available data types for retention policies
 * @access Private - Admin
 */
router.get(
  '/data-types',
  authenticate,
  authorize(['admin', 'compliance_officer', 'data_protection_officer']),
  async (req, res, next) => {
    try {
      const dataTypes = [
        { value: 'user_accounts', label: 'User Accounts', description: 'User registration and profile data' },
        { value: 'applications', label: 'Job Applications', description: 'Job application submissions' },
        { value: 'referrals', label: 'Referrals', description: 'Referral records and history' },
        { value: 'payouts', label: 'Payout Requests', description: 'Payment and payout records' },
        { value: 'audit_logs', label: 'Audit Logs', description: 'System audit logs' },
        { value: 'security_logs', label: 'Security Logs', description: 'Security event logs' },
        { value: 'email_logs', label: 'Email Logs', description: 'Email communication logs' },
        { value: 'notifications', label: 'Notifications', description: 'User notification history' },
        { value: 'kyc_documents', label: 'KYC Documents', description: 'KYC verification documents' },
        { value: 'api_logs', label: 'API Logs', description: 'API request logs' },
        { value: 'webhook_logs', label: 'Webhook Logs', description: 'Webhook delivery logs' },
        { value: 'analytics', label: 'Analytics Data', description: 'Analytics and tracking data' },
        { value: 'chat_messages', label: 'Chat Messages', description: 'User chat and message history' },
        { value: 'support_tickets', label: 'Support Tickets', description: 'Customer support tickets' },
      ];
      
      res.json({
        success: true,
        data: dataTypes,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/data-retention/legal-bases
 * @desc Get available legal bases for retention
 * @access Private - Admin
 */
router.get(
  '/legal-bases',
  authenticate,
  authorize(['admin', 'compliance_officer', 'data_protection_officer']),
  async (req, res, next) => {
    try {
      const legalBases = [
        { value: 'consent', label: 'Consent', description: 'Data subject has given consent' },
        { value: 'contract', label: 'Contract', description: 'Necessary for contract performance' },
        { value: 'legal_obligation', label: 'Legal Obligation', description: 'Required by law' },
        { value: 'vital_interests', label: 'Vital Interests', description: 'Protect vital interests' },
        { value: 'public_task', label: 'Public Task', description: 'Public interest or official authority' },
        { value: 'legitimate_interests', label: 'Legitimate Interests', description: 'Legitimate interests pursued' },
        { value: 'tax_records', label: 'Tax Records', description: 'Tax and accounting requirements' },
        { value: 'employment_law', label: 'Employment Law', description: 'Employment law requirements' },
        { value: 'fraud_prevention', label: 'Fraud Prevention', description: 'Fraud prevention and security' },
        { value: 'dispute_resolution', label: 'Dispute Resolution', description: 'Legal claims and disputes' },
      ];
      
      res.json({
        success: true,
        data: legalBases,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/data-retention/compliance-report
 * @desc Generate compliance report for data retention
 * @access Private - Admin
 */
router.get(
  '/compliance-report',
  authenticate,
  authorize(['admin', 'compliance_officer', 'data_protection_officer']),
  async (req, res, next) => {
    try {
      const report = await dataRetentionService.generateComplianceReport();
      
      await auditService.logAdminAction(
        req.user._id,
        'GENERATE_RETENTION_REPORT',
        'DataRetention',
        null,
        {},
        req
      );
      
      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/data-retention/bulk-update
 * @desc Bulk update retention policies
 * @access Private - Admin
 */
router.post(
  '/bulk-update',
  authenticate,
  authorize(['admin']),
  validateBody({
    policyIds: { type: 'array', required: true },
    updates: { type: 'object', required: true },
  }),
  async (req, res, next) => {
    try {
      const { policyIds, updates } = req.validatedBody;
      
      const result = await DataRetentionPolicy.updateMany(
        { _id: { $in: policyIds } },
        {
          $set: {
            ...updates,
            updatedBy: req.user._id,
            updatedAt: new Date(),
          },
        }
      );
      
      await auditService.logAdminAction(
        req.user._id,
        'BULK_UPDATE_RETENTION_POLICIES',
        'DataRetentionPolicy',
        null,
        { policyCount: policyIds.length, updates },
        req
      );
      
      res.json({
        success: true,
        message: `${result.modifiedCount} policies updated`,
        data: {
          matched: result.matchedCount,
          modified: result.modifiedCount,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
