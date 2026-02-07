/**
 * Lead Scoring Routes
 * API endpoints for lead scoring, company prioritization, and CRM operations
 */

const express = require('express');
const { LeadScore, Company, User } = require('../models/index.js');
const { leadScoreService } = require('../services/leadScoreService.js');
const { authenticate } = require('../middleware/auth.js');
const { asyncHandler, ValidationError, NotFoundError, AuthorizationError } = require('../middleware/errorHandler.js');
const { requireAdmin } = require('../middleware/rbac.js');

const router = express.Router();

// ==================== CANDIDATE SCORE ROUTES ====================

/**
 * @route   GET /api/leads/candidates/:id/score
 * @desc    Get lead score for a candidate
 * @access  Private (Admin or Sales)
 */
router.get('/candidates/:id/score', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { refresh } = req.query;

  // Check permissions (admin or sales role)
  if (!['platform_admin', 'corporate_admin'].includes(req.user.role)) {
    throw new AuthorizationError('Insufficient permissions');
  }

  const leadScore = await leadScoreService.getLeadScore(
    'candidate',
    id,
    refresh === 'true'
  );

  res.json({
    success: true,
    data: leadScore,
  });
}));

// ==================== COMPANY SCORE ROUTES ====================

/**
 * @route   GET /api/leads/companies/:id/score
 * @desc    Get lead score for a company
 * @access  Private (Admin or Sales)
 */
router.get('/companies/:id/score', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { refresh } = req.query;

  // Check permissions
  if (!['platform_admin', 'corporate_admin'].includes(req.user.role)) {
    throw new AuthorizationError('Insufficient permissions');
  }

  const leadScore = await leadScoreService.getLeadScore(
    'company',
    id,
    refresh === 'true'
  );

  res.json({
    success: true,
    data: leadScore,
  });
}));

/**
 * @route   GET /api/leads/companies/priority
 * @desc    Get prioritized company list
 * @access  Private (Admin or Sales)
 */
router.get('/companies/priority', authenticate, asyncHandler(async (req, res) => {
  const {
    limit = 20,
    minScore = 0,
    salesStage,
    assignedTo,
    sortBy = 'score',
  } = req.query;

  // Check permissions
  if (!['platform_admin', 'corporate_admin'].includes(req.user.role)) {
    throw new AuthorizationError('Insufficient permissions');
  }

  const companies = await leadScoreService.getPrioritizedCompanies({
    limit: parseInt(limit),
    minScore: parseInt(minScore),
    salesStage,
    assignedTo,
    sortBy,
  });

  res.json({
    success: true,
    data: {
      companies,
      count: companies.length,
    },
  });
}));

// ==================== DASHBOARD ROUTES ====================

/**
 * @route   GET /api/leads/dashboard
 * @desc    Get sales dashboard data
 * @access  Private (Admin or Sales)
 */
router.get('/dashboard', authenticate, asyncHandler(async (req, res) => {
  // Check permissions
  if (!['platform_admin', 'corporate_admin'].includes(req.user.role)) {
    throw new AuthorizationError('Insufficient permissions');
  }

  const dashboardData = await leadScoreService.getDashboardData();

  res.json({
    success: true,
    data: dashboardData,
  });
}));

// ==================== ALERT ROUTES ====================

/**
 * @route   GET /api/leads/alerts
 * @desc    Get high-value alerts
 * @access  Private (Admin or Sales)
 */
router.get('/alerts', authenticate, asyncHandler(async (req, res) => {
  const {
    type,
    priority,
    acknowledged = 'false',
    limit = 50,
  } = req.query;

  // Check permissions
  if (!['platform_admin', 'corporate_admin'].includes(req.user.role)) {
    throw new AuthorizationError('Insufficient permissions');
  }

  const alerts = await leadScoreService.getAlerts({
    type,
    priority,
    acknowledged: acknowledged === 'true',
    limit: parseInt(limit),
  });

  res.json({
    success: true,
    data: {
      alerts,
      count: alerts.length,
    },
  });
}));

/**
 * @route   POST /api/leads/alerts/:alertId/acknowledge
 * @desc    Acknowledge an alert
 * @access  Private (Admin or Sales)
 */
router.post('/alerts/:alertId/acknowledge', authenticate, asyncHandler(async (req, res) => {
  const { alertId } = req.params;
  const { entityId } = req.body;

  if (!entityId) {
    throw new ValidationError('Entity ID is required');
  }

  // Check permissions
  if (!['platform_admin', 'corporate_admin'].includes(req.user.role)) {
    throw new AuthorizationError('Insufficient permissions');
  }

  const leadScore = await LeadScore.findOne({ entityId });
  if (!leadScore) {
    throw new NotFoundError('Lead score not found');
  }

  const acknowledged = await leadScore.acknowledgeAlert(alertId, req.user._id);

  if (!acknowledged) {
    throw new ValidationError('Alert not found or already acknowledged');
  }

  res.json({
    success: true,
    message: 'Alert acknowledged successfully',
  });
}));

/**
 * @route   POST /api/leads/alerts/:alertId/dismiss
 * @desc    Dismiss an alert
 * @access  Private (Admin or Sales)
 */
router.post('/alerts/:alertId/dismiss', authenticate, asyncHandler(async (req, res) => {
  const { alertId } = req.params;
  const { entityId } = req.body;

  if (!entityId) {
    throw new ValidationError('Entity ID is required');
  }

  // Check permissions
  if (!['platform_admin', 'corporate_admin'].includes(req.user.role)) {
    throw new AuthorizationError('Insufficient permissions');
  }

  const leadScore = await LeadScore.findOne({ entityId });
  if (!leadScore) {
    throw new NotFoundError('Lead score not found');
  }

  const dismissed = await leadScore.dismissAlert(alertId);

  if (!dismissed) {
    throw new ValidationError('Alert not found or already dismissed');
  }

  res.json({
    success: true,
    message: 'Alert dismissed successfully',
  });
}));

// ==================== CALCULATION ROUTES ====================

/**
 * @route   POST /api/leads/calculate
 * @desc    Trigger score calculation for an entity
 * @access  Private (Admin)
 */
router.post('/calculate', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.body;

  if (!entityType || !entityId) {
    throw new ValidationError('Entity type and ID are required');
  }

  if (!['candidate', 'company'].includes(entityType)) {
    throw new ValidationError('Invalid entity type');
  }

  // Queue for background processing
  leadScoreService.queueScoreCalculation(entityType, entityId);

  res.json({
    success: true,
    message: 'Score calculation queued',
    data: {
      entityType,
      entityId,
      status: 'queued',
    },
  });
}));

/**
 * @route   POST /api/leads/calculate-all
 * @desc    Recalculate all scores
 * @access  Private (Admin)
 */
router.post('/calculate-all', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { entityType = 'all' } = req.body;

  // Run in background
  setTimeout(async () => {
    try {
      const results = await leadScoreService.recalculateAllScores(entityType);
      console.log('Score recalculation completed:', results);
    } catch (error) {
      console.error('Error in batch score recalculation:', error);
    }
  }, 100);

  res.json({
    success: true,
    message: 'Batch score recalculation started',
    data: {
      entityType,
      status: 'processing',
    },
  });
}));

// ==================== CRM ROUTES ====================

/**
 * @route   POST /api/leads/companies/:id/contact
 * @desc    Add contact history entry
 * @access  Private (Admin or Sales)
 */
router.post('/companies/:id/contact', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    type,
    direction = 'outbound',
    subject,
    content,
    contactPerson,
    outcome,
    followUpDate,
  } = req.body;

  if (!type) {
    throw new ValidationError('Contact type is required');
  }

  // Check permissions
  if (!['platform_admin', 'corporate_admin'].includes(req.user.role)) {
    throw new AuthorizationError('Insufficient permissions');
  }

  const company = await Company.findById(id);
  if (!company) {
    throw new NotFoundError('Company not found');
  }

  await company.addContactHistory({
    type,
    direction,
    subject,
    content,
    contactPerson,
    outcome,
    followUpDate,
    conductedBy: req.user._id,
  });

  // If follow-up date provided, create reminder
  if (followUpDate) {
    await company.addFollowUpReminder({
      type: 'check_in',
      dueDate: followUpDate,
      priority: 'medium',
      notes: `Follow-up from ${type} contact`,
      assignedTo: req.user._id,
    });
  }

  res.json({
    success: true,
    message: 'Contact history added successfully',
    data: {
      lastContactDate: company.crm.lastContactDate,
      lastContactType: company.crm.lastContactType,
    },
  });
}));

/**
 * @route   POST /api/leads/companies/:id/reminders
 * @desc    Add follow-up reminder
 * @access  Private (Admin or Sales)
 */
router.post('/companies/:id/reminders', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    type,
    dueDate,
    priority = 'medium',
    notes,
    assignedTo,
  } = req.body;

  if (!type || !dueDate) {
    throw new ValidationError('Type and due date are required');
  }

  // Check permissions
  if (!['platform_admin', 'corporate_admin'].includes(req.user.role)) {
    throw new AuthorizationError('Insufficient permissions');
  }

  const company = await Company.findById(id);
  if (!company) {
    throw new NotFoundError('Company not found');
  }

  await company.addFollowUpReminder({
    type,
    dueDate,
    priority,
    notes,
    assignedTo: assignedTo || req.user._id,
  });

  res.json({
    success: true,
    message: 'Reminder added successfully',
    data: {
      nextFollowUpDate: company.crm.nextFollowUpDate,
    },
  });
}));

/**
 * @route   PATCH /api/leads/companies/:id/reminders/:reminderId/complete
 * @desc    Complete a follow-up reminder
 * @access  Private (Admin or Sales)
 */
router.patch('/companies/:id/reminders/:reminderId/complete', authenticate, asyncHandler(async (req, res) => {
  const { id, reminderId } = req.params;

  // Check permissions
  if (!['platform_admin', 'corporate_admin'].includes(req.user.role)) {
    throw new AuthorizationError('Insufficient permissions');
  }

  const company = await Company.findById(id);
  if (!company) {
    throw new NotFoundError('Company not found');
  }

  const completed = await company.completeReminder(reminderId);

  if (!completed) {
    throw new NotFoundError('Reminder not found or already completed');
  }

  res.json({
    success: true,
    message: 'Reminder marked as completed',
  });
}));

/**
 * @route   POST /api/leads/companies/:id/tags
 * @desc    Add tag to company
 * @access  Private (Admin or Sales)
 */
router.post('/companies/:id/tags', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, color = '#3B82F6' } = req.body;

  if (!name) {
    throw new ValidationError('Tag name is required');
  }

  // Check permissions
  if (!['platform_admin', 'corporate_admin'].includes(req.user.role)) {
    throw new AuthorizationError('Insufficient permissions');
  }

  const company = await Company.findById(id);
  if (!company) {
    throw new NotFoundError('Company not found');
  }

  await company.addTag({
    name,
    color,
    addedBy: req.user._id,
  });

  res.json({
    success: true,
    message: 'Tag added successfully',
    data: {
      tags: company.crm.tags,
    },
  });
}));

/**
 * @route   DELETE /api/leads/companies/:id/tags/:tagId
 * @desc    Remove tag from company
 * @access  Private (Admin or Sales)
 */
router.delete('/companies/:id/tags/:tagId', authenticate, asyncHandler(async (req, res) => {
  const { id, tagId } = req.params;

  // Check permissions
  if (!['platform_admin', 'corporate_admin'].includes(req.user.role)) {
    throw new AuthorizationError('Insufficient permissions');
  }

  const company = await Company.findById(id);
  if (!company) {
    throw new NotFoundError('Company not found');
  }

  const removed = await company.removeTag(tagId);

  if (!removed) {
    throw new NotFoundError('Tag not found');
  }

  res.json({
    success: true,
    message: 'Tag removed successfully',
  });
}));

/**
 * @route   PATCH /api/leads/companies/:id/sales-stage
 * @desc    Update company sales stage
 * @access  Private (Admin or Sales)
 */
router.patch('/companies/:id/sales-stage', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { stage, notes } = req.body;

  if (!stage) {
    throw new ValidationError('Sales stage is required');
  }

  const validStages = ['prospect', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost', 'churned'];
  if (!validStages.includes(stage)) {
    throw new ValidationError('Invalid sales stage');
  }

  // Check permissions
  if (!['platform_admin', 'corporate_admin'].includes(req.user.role)) {
    throw new AuthorizationError('Insufficient permissions');
  }

  const company = await Company.findById(id);
  if (!company) {
    throw new NotFoundError('Company not found');
  }

  await company.updateSalesStage(stage, {
    userId: req.user._id,
    notes,
  });

  res.json({
    success: true,
    message: 'Sales stage updated successfully',
    data: {
      salesStage: company.crm.salesStage,
      conversionProbability: company.crm.conversionProbability,
    },
  });
}));

/**
 * @route   PATCH /api/leads/companies/:id/assign
 * @desc    Assign company to sales rep
 * @access  Private (Admin)
 */
router.patch('/companies/:id/assign', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { salesRepId } = req.body;

  if (!salesRepId) {
    throw new ValidationError('Sales rep ID is required');
  }

  const company = await Company.findById(id);
  if (!company) {
    throw new NotFoundError('Company not found');
  }

  // Verify sales rep exists
  const salesRep = await User.findById(salesRepId);
  if (!salesRep) {
    throw new NotFoundError('Sales rep not found');
  }

  if (!company.crm) {
    company.crm = {};
  }
  company.crm.assignedSalesRep = salesRepId;
  await company.save();

  res.json({
    success: true,
    message: 'Company assigned successfully',
    data: {
      assignedSalesRep: salesRepId,
      salesRepName: salesRep.name,
    },
  });
}));

// ==================== STATS ROUTES ====================

/**
 * @route   GET /api/leads/stats/overview
 * @desc    Get lead scoring statistics overview
 * @access  Private (Admin)
 */
router.get('/stats/overview', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const stats = await Promise.all([
    // Total lead scores by entity type
    LeadScore.aggregate([
      { $group: { _id: '$entityType', count: { $sum: 1 }, avgScore: { $avg: '$totalScore' } } },
    ]),
    // Score distribution
    LeadScore.aggregate([
      { $match: { entityType: 'company' } },
      {
        $bucket: {
          groupBy: '$totalScore',
          boundaries: [0, 20, 40, 60, 80, 100],
          default: 'Other',
          output: { count: { $sum: 1 } },
        },
      },
    ]),
    // Active alerts count
    LeadScore.aggregate([
      { $unwind: '$alerts' },
      {
        $match: {
          'alerts.dismissedAt': { $exists: false },
          'alerts.acknowledgedAt': { $exists: false },
        },
      },
      { $group: { _id: '$alerts.type', count: { $sum: 1 } } },
    ]),
    // Companies by sales stage
    Company.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$crm.salesStage', count: { $sum: 1 } } },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      byEntityType: stats[0],
      scoreDistribution: stats[1],
      activeAlerts: stats[2],
      pipelineStages: stats[3],
    },
  });
}));

module.exports = router;
