/**
 * Email Marketing Routes
 * API endpoints for campaigns, templates, sequences, segments, and email operations
 */

const express = require('express');
const { authenticate } = require('../middleware/auth.js');
const { requireRole } = require('../middleware/rbac.js');
const {
  EmailCampaign,
  EmailTemplate,
  EmailSequence,
  UserSegment,
  EmailLog,
  User,
} = require('../models/index.js');
const {
  sendEmail,
  queueEmail,
  sendBroadcast,
  getEmailStats,
  getSuppressionList,
  isEmailSuppressed,
  addToSuppressionList,
  removeFromSuppressionList,
  verifyUnsubscribeToken,
  getServiceStatus,
} = require('../services/emailMarketingService.js');
const {
  enrollInSequence,
  unenrollFromSequence,
  getSequenceStats,
  createPredefinedSequences,
} = require('../services/sequenceEngineService.js');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   GET /api/email/status
 * @desc    Get email service status
 * @access  Private (Admin)
 */
router.get('/status', requireRole(['platform_admin']), async (req, res) => {
  try {
    const status = getServiceStatus();
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/email/send
 * @desc    Send a single email
 * @access  Private (Admin, Corporate Admin)
 */
router.post('/send', requireRole(['platform_admin', 'corporate_admin']), async (req, res) => {
  try {
    const {
      to,
      toName,
      subject,
      html,
      templateId,
      variables,
      from,
      fromName,
      replyTo,
      trackOpens,
      trackClicks,
    } = req.body;
    
    if (!to || (!html && !templateId)) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email and content (html or templateId) are required',
      });
    }
    
    const result = await sendEmail({
      to,
      toName,
      subject,
      html,
      templateId,
      variables,
      from,
      fromName,
      replyTo,
      trackOpens,
      trackClicks,
      type: 'transactional',
    });
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/email/queue
 * @desc    Queue an email for background sending
 * @access  Private (Admin, Corporate Admin)
 */
router.post('/queue', requireRole(['platform_admin', 'corporate_admin']), async (req, res) => {
  try {
    const { emailData, delay, priority } = req.body;
    
    const result = await queueEmail({
      ...emailData,
      delay,
      priority,
    });
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/email/broadcast
 * @desc    Send broadcast to segment or user list
 * @access  Private (Admin, Corporate Admin)
 */
router.post('/broadcast', requireRole(['platform_admin', 'corporate_admin']), async (req, res) => {
  try {
    const { campaignId, segmentId, userIds, batchSize, throttleMs } = req.body;
    
    if (!campaignId) {
      return res.status(400).json({
        success: false,
        message: 'Campaign ID is required',
      });
    }
    
    const result = await sendBroadcast({
      campaignId,
      segmentId,
      userIds,
      batchSize,
      throttleMs,
    });
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/email/stats
 * @desc    Get email statistics
 * @access  Private (Admin, Corporate Admin)
 */
router.get('/stats', requireRole(['platform_admin', 'corporate_admin']), async (req, res) => {
  try {
    const { startDate, endDate, campaignId, organizationId } = req.query;
    
    const stats = await getEmailStats({
      startDate,
      endDate,
      campaignId,
      organizationId,
    });
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/email/logs
 * @desc    Get email logs with filtering
 * @access  Private (Admin, Corporate Admin)
 */
router.get('/logs', requireRole(['platform_admin', 'corporate_admin']), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      type,
      campaignId,
      userId,
      email,
      startDate,
      endDate,
    } = req.query;
    
    const query = {};
    
    if (status) query.status = status;
    if (type) query.type = type;
    if (campaignId) query.campaignId = campaignId;
    if (userId) query['recipient.userId'] = userId;
    if (email) query['recipient.email'] = new RegExp(email, 'i');
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    // Corporate users can only see their organization's emails
    if (req.user.role.startsWith('corporate_')) {
      const userCompany = await User.findById(req.user._id).select('company');
      if (userCompany?.company) {
        query.organizationId = userCompany.company;
      }
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [logs, total] = await Promise.all([
      EmailLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('recipient.userId', 'name email')
        .populate('campaignId', 'name')
        .lean(),
      EmailLog.countDocuments(query),
    ]);
    
    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/email/logs/:id
 * @desc    Get single email log details
 * @access  Private (Admin, Corporate Admin)
 */
router.get('/logs/:id', requireRole(['platform_admin', 'corporate_admin']), async (req, res) => {
  try {
    const log = await EmailLog.findById(req.params.id)
      .populate('recipient.userId', 'name email')
      .populate('campaignId', 'name')
      .populate('sequenceId', 'name')
      .populate('templateId', 'name');
    
    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Email log not found',
      });
    }
    
    res.json({
      success: true,
      data: log,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/email/suppression
 * @desc    Get suppression list
 * @access  Private (Admin)
 */
router.get('/suppression', requireRole(['platform_admin']), async (req, res) => {
  try {
    const list = await getSuppressionList();
    
    res.json({
      success: true,
      data: list,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/email/suppression
 * @desc    Add email to suppression list
 * @access  Private (Admin)
 */
router.post('/suppression', requireRole(['platform_admin']), async (req, res) => {
  try {
    const { email, reason } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }
    
    const result = await addToSuppressionList(email, reason);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   DELETE /api/email/suppression/:email
 * @desc    Remove email from suppression list
 * @access  Private (Admin)
 */
router.delete('/suppression/:email', requireRole(['platform_admin']), async (req, res) => {
  try {
    const result = await removeFromSuppressionList(req.params.email);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/email/suppression/check/:email
 * @desc    Check if email is suppressed
 * @access  Private (Admin, Corporate Admin)
 */
router.get('/suppression/check/:email', requireRole(['platform_admin', 'corporate_admin']), async (req, res) => {
  try {
    const isSuppressed = await isEmailSuppressed(req.params.email);
    
    res.json({
      success: true,
      data: { email: req.params.email, isSuppressed },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==================== CAMPAIGN ROUTES ====================

/**
 * @route   GET /api/campaigns
 * @desc    Get all campaigns
 * @access  Private (Admin, Corporate Admin)
 */
router.get('/campaigns', requireRole(['platform_admin', 'corporate_admin']), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type, search } = req.query;
    
    const query = {};
    
    if (status) query.status = status;
    if (type) query.type = type;
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
      ];
    }
    
    // Corporate users only see their organization's campaigns
    if (req.user.role.startsWith('corporate_')) {
      const userCompany = await User.findById(req.user._id).select('company');
      if (userCompany?.company) {
        query.organizationId = userCompany.company;
      }
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [campaigns, total] = await Promise.all([
      EmailCampaign.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('segmentId', 'name')
        .populate('templateId', 'name')
        .populate('createdBy', 'name')
        .lean(),
      EmailCampaign.countDocuments(query),
    ]);
    
    res.json({
      success: true,
      data: {
        campaigns,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/campaigns
 * @desc    Create a new campaign
 * @access  Private (Admin, Corporate Admin)
 */
router.post('/campaigns', requireRole(['platform_admin', 'corporate_admin']), async (req, res) => {
  try {
    const campaignData = {
      ...req.body,
      createdBy: req.user._id,
    };
    
    // Set organization for corporate users
    if (req.user.role.startsWith('corporate_')) {
      const userCompany = await User.findById(req.user._id).select('company');
      if (userCompany?.company) {
        campaignData.organizationId = userCompany.company;
      }
    }
    
    const campaign = new EmailCampaign(campaignData);
    await campaign.save();
    
    res.status(201).json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/campaigns/:id
 * @desc    Get campaign by ID
 * @access  Private (Admin, Corporate Admin)
 */
router.get('/campaigns/:id', requireRole(['platform_admin', 'corporate_admin']), async (req, res) => {
  try {
    const campaign = await EmailCampaign.findById(req.params.id)
      .populate('segmentId')
      .populate('templateId')
      .populate('sequenceId')
      .populate('createdBy', 'name email');
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }
    
    res.json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   PUT /api/campaigns/:id
 * @desc    Update campaign
 * @access  Private (Admin, Corporate Admin)
 */
router.put('/campaigns/:id', requireRole(['platform_admin', 'corporate_admin']), async (req, res) => {
  try {
    const campaign = await EmailCampaign.findById(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }
    
    if (!campaign.isEditable()) {
      return res.status(400).json({
        success: false,
        message: 'Campaign cannot be edited in current status',
      });
    }
    
    Object.assign(campaign, req.body);
    await campaign.save();
    
    res.json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   DELETE /api/campaigns/:id
 * @desc    Delete campaign
 * @access  Private (Admin, Corporate Admin)
 */
router.delete('/campaigns/:id', requireRole(['platform_admin', 'corporate_admin']), async (req, res) => {
  try {
    const campaign = await EmailCampaign.findById(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }
    
    if (campaign.status === 'sending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete campaign while sending',
      });
    }
    
    await campaign.deleteOne();
    
    res.json({
      success: true,
      message: 'Campaign deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/campaigns/:id/send
 * @desc    Start sending campaign
 * @access  Private (Admin, Corporate Admin)
 */
router.post('/campaigns/:id/send', requireRole(['platform_admin', 'corporate_admin']), async (req, res) => {
  try {
    const { batchSize, throttleMs } = req.body;
    
    const result = await sendBroadcast({
      campaignId: req.params.id,
      batchSize,
      throttleMs,
    });
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/campaigns/:id/stats
 * @desc    Get campaign statistics
 * @access  Private (Admin, Corporate Admin)
 */
router.get('/campaigns/:id/stats', requireRole(['platform_admin', 'corporate_admin']), async (req, res) => {
  try {
    const stats = await EmailLog.getCampaignStats(req.params.id);
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==================== TEMPLATE ROUTES ====================

/**
 * @route   GET /api/templates
 * @desc    Get all templates
 * @access  Private (Admin, Corporate Admin)
 */
router.get('/templates', requireRole(['platform_admin', 'corporate_admin']), async (req, res) => {
  try {
    const { page = 1, limit = 20, category, status, search } = req.query;
    
    const query = {};
    
    if (category) query.category = category;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { slug: new RegExp(search, 'i') },
      ];
    }
    
    // Corporate users see system templates + their own
    if (req.user.role.startsWith('corporate_')) {
      const userCompany = await User.findById(req.user._id).select('company');
      query.$or = [
        { organizationId: null },
        { organizationId: userCompany?.company },
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [templates, total] = await Promise.all([
      EmailTemplate.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('createdBy', 'name')
        .lean(),
      EmailTemplate.countDocuments(query),
    ]);
    
    res.json({
      success: true,
      data: {
        templates,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/templates
 * @desc    Create a new template
 * @access  Private (Admin, Corporate Admin)
 */
router.post('/templates', requireRole(['platform_admin', 'corporate_admin']), async (req, res) => {
  try {
    const templateData = {
      ...req.body,
      createdBy: req.user._id,
    };
    
    // Set organization for corporate users
    if (req.user.role.startsWith('corporate_')) {
      const userCompany = await User.findById(req.user._id).select('company');
      if (userCompany?.company) {
        templateData.organizationId = userCompany.company;
      }
    }
    
    const template = new EmailTemplate(templateData);
    await template.save();
    
    res.status(201).json({
      success: true,
      data: template,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/templates/:id
 * @desc    Get template by ID
 * @access  Private (Admin, Corporate Admin)
 */
router.get('/templates/:id', requireRole(['platform_admin', 'corporate_admin']), async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id)
      .populate('createdBy', 'name email');
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }
    
    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/templates/slug/:slug
 * @desc    Get template by slug
 * @access  Private (Admin, Corporate Admin)
 */
router.get('/templates/slug/:slug', requireRole(['platform_admin', 'corporate_admin']), async (req, res) => {
  try {
    const template = await EmailTemplate.findBySlug(req.params.slug);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }
    
    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   PUT /api/templates/:id
 * @desc    Update template
 * @access  Private (Admin, Corporate Admin)
 */
router.put('/templates/:id', requireRole(['platform_admin', 'corporate_admin']), async (req, res) => {
  try {
    const template = await EmailTemplate.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }
    
    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   DELETE /api/templates/:id
 * @desc    Delete template
 * @access  Private (Admin, Corporate Admin)
 */
router.delete('/templates/:id', requireRole(['platform_admin', 'corporate_admin']), async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }
    
    await template.deleteOne();
    
    res.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/templates/:id/render
 * @desc    Render template with variables
 * @access  Private (Admin, Corporate Admin)
 */
router.post('/templates/:id/render', requireRole(['platform_admin', 'corporate_admin']), async (req, res) => {
  try {
    const { variables, language } = req.body;
    
    const template = await EmailTemplate.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }
    
    const rendered = template.render(variables, language);
    
    res.json({
      success: true,
      data: rendered,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==================== SEQUENCE ROUTES ====================

/**
 * @route   GET /api/sequences
 * @desc    Get all sequences
 * @access  Private (Admin, Corporate Admin)
 */
router.get('/sequences', requireRole(['platform_admin', 'corporate_admin']), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type, search } = req.query;
    
    const query = {};
    
    if (status) query.status = status;
    if (type) query.type = type;
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { slug: new RegExp(search, 'i') },
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [sequences, total] = await Promise.all([
      EmailSequence.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('createdBy', 'name')
        .lean(),
      EmailSequence.countDocuments(query),
    ]);
    
    res.json({
      success: true,
      data: {
        sequences,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/sequences
 * @desc    Create a new sequence
 * @access  Private (Admin, Corporate Admin)
 */
router.post('/sequences', requireRole(['platform_admin', 'corporate_admin']), async (req, res) => {
  try {
    const sequenceData = {
      ...req.body,
      createdBy: req.user._id,
    };
    
    const sequence = new EmailSequence(sequenceData);
    await sequence.save();
    
    res.status(201).json({
      success: true,
      data: sequence,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/sequences/:id
 * @desc    Get sequence by ID
 * @access  Private (Admin, Corporate Admin)
 */
router.get('/sequences/:id', requireRole(['platform_admin', 'corporate_admin']), async (req, res) => {
  try {
    const sequence = await EmailSequence.findById(req.params.id)
      .populate('steps.templateId', 'name subject')
      .populate('createdBy', 'name email');
    
    if (!sequence) {
      return res.status(404).json({
        success: false,
        message: 'Sequence not found',
      });
    }
    
    res.json({
      success: true,
      data: sequence,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   PUT /api/sequences/:id
 * @desc    Update sequence
 * @access  Private (Admin, Corporate Admin)
 */
router.put('/sequences/:id', requireRole(['platform_admin', 'corporate_admin']), async (req, res) => {
  try {
    const sequence = await EmailSequence.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!sequence) {
      return res.status(404).json({
        success: false,
        message: 'Sequence not found',
      });
    }
    
    res.json({
      success: true,
      data: sequence,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   DELETE /api/sequences/:id
 * @desc    Delete sequence
 * @access  Private (Admin, Corporate Admin)
 */
router.delete('/sequences/:id', requireRole(['platform_admin', 'corporate_admin']), async (req, res) => {
  try {
    const sequence = await EmailSequence.findById(req.params.id);
    
    if (!sequence) {
      return res.status(404).json({
        success: false,
        message: 'Sequence not found',
      });
    }
    
    await sequence.deleteOne();
    
    res.json({
      success: true,
      message: 'Sequence deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/sequences/:id/enroll
 * @desc    Enroll user in sequence
 * @access  Private (Admin, Corporate Admin)
 */
router.post('/sequences/:id/enroll', requireRole(['platform_admin', 'corporate_admin']), async (req, res) => {
  try {
    const { userId, context } = req.body;
    
    const result = await enrollInSequence(req.params.id, userId, context, 'manual');
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/sequences/:id/unenroll
 * @desc    Unenroll user from sequence
 * @access  Private (Admin, Corporate Admin)
 */
router.post('/sequences/:id/unenroll', requireRole(['platform_admin', 'corporate_admin']), async (req, res) => {
  try {
    const { userId, reason } = req.body;
    
    const result = await unenrollFromSequence(req.params.id, userId, reason);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/sequences/:id/stats
 * @desc    Get sequence statistics
 * @access  Private (Admin, Corporate Admin)
 */
router.get('/sequences/:id/stats', requireRole(['platform_admin', 'corporate_admin']), async (req, res) => {
  try {
    const stats = await getSequenceStats(req.params.id);
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/sequences/initialize
 * @desc    Initialize predefined sequences
 * @access  Private (Admin)
 */
router.post('/sequences/initialize', requireRole(['platform_admin']), async (req, res) => {
  try {
    const sequences = await createPredefinedSequences();
    
    res.json({
      success: true,
      data: {
        created: sequences.length,
        sequences,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==================== SEGMENT ROUTES ====================

/**
 * @route   GET /api/segments
 * @desc    Get all segments
 * @access  Private (Admin, Corporate Admin)
 */
router.get('/segments', requireRole(['platform_admin', 'corporate_admin']), async (req, res) => {
  try {
    const { page = 1, limit = 20, category, type, search } = req.query;
    
    const query = {};
    
    if (category) query.category = category;
    if (type) query.type = type;
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { slug: new RegExp(search, 'i') },
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [segments, total] = await Promise.all([
      UserSegment.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('createdBy', 'name')
        .lean(),
      UserSegment.countDocuments(query),
    ]);
    
    res.json({
      success: true,
      data: {
        segments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/segments
 * @desc    Create a new segment
 * @access  Private (Admin, Corporate Admin)
 */
router.post('/segments', requireRole(['platform_admin', 'corporate_admin']), async (req, res) => {
  try {
    const segmentData = {
      ...req.body,
      createdBy: req.user._id,
    };
    
    const segment = new UserSegment(segmentData);
    await segment.save();
    
    res.status(201).json({
      success: true,
      data: segment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/segments/:id
 * @desc    Get segment by ID
 * @access  Private (Admin, Corporate Admin)
 */
router.get('/segments/:id', requireRole(['platform_admin', 'corporate_admin']), async (req, res) => {
  try {
    const segment = await UserSegment.findById(req.params.id)
      .populate('createdBy', 'name email');
    
    if (!segment) {
      return res.status(404).json({
        success: false,
        message: 'Segment not found',
      });
    }
    
    res.json({
      success: true,
      data: segment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   PUT /api/segments/:id
 * @desc    Update segment
 * @access  Private (Admin, Corporate Admin)
 */
router.put('/segments/:id', requireRole(['platform_admin', 'corporate_admin']), async (req, res) => {
  try {
    const segment = await UserSegment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!segment) {
      return res.status(404).json({
        success: false,
        message: 'Segment not found',
      });
    }
    
    res.json({
      success: true,
      data: segment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   DELETE /api/segments/:id
 * @desc    Delete segment
 * @access  Private (Admin, Corporate Admin)
 */
router.delete('/segments/:id', requireRole(['platform_admin', 'corporate_admin']), async (req, res) => {
  try {
    const segment = await UserSegment.findById(req.params.id);
    
    if (!segment) {
      return res.status(404).json({
        success: false,
        message: 'Segment not found',
      });
    }
    
    await segment.deleteOne();
    
    res.json({
      success: true,
      message: 'Segment deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/segments/:id/refresh
 * @desc    Refresh segment members
 * @access  Private (Admin, Corporate Admin)
 */
router.post('/segments/:id/refresh', requireRole(['platform_admin', 'corporate_admin']), async (req, res) => {
  try {
    const segment = await UserSegment.findById(req.params.id);
    
    if (!segment) {
      return res.status(404).json({
        success: false,
        message: 'Segment not found',
      });
    }
    
    const members = await segment.refreshMembers(User);
    
    res.json({
      success: true,
      data: {
        totalMembers: members.length,
        segment,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/segments/:id/preview
 * @desc    Preview segment members (without saving)
 * @access  Private (Admin, Corporate Admin)
 */
router.post('/segments/:id/preview', requireRole(['platform_admin', 'corporate_admin']), async (req, res) => {
  try {
    const segment = await UserSegment.findById(req.params.id);
    
    if (!segment) {
      return res.status(404).json({
        success: false,
        message: 'Segment not found',
      });
    }
    
    const query = segment.buildQuery();
    const users = await User.find(query)
      .select('name email role tier createdAt lastActiveAt')
      .limit(100)
      .lean();
    
    res.json({
      success: true,
      data: {
        totalMatching: users.length,
        preview: users.slice(0, 20),
        query,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/segments/predefined
 * @desc    Get predefined segment definitions
 * @access  Private (Admin, Corporate Admin)
 */
router.get('/segments/predefined/list', requireRole(['platform_admin', 'corporate_admin']), async (req, res) => {
  try {
    const definitions = UserSegment.PREDEFINED_SEGMENTS;
    
    res.json({
      success: true,
      data: definitions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/segments/initialize
 * @desc    Initialize predefined segments
 * @access  Private (Admin)
 */
router.post('/segments/initialize', requireRole(['platform_admin']), async (req, res) => {
  try {
    const segments = await UserSegment.createSystemSegments();
    
    res.json({
      success: true,
      data: {
        created: segments.length,
        segments,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==================== TRACKING ROUTES (Public) ====================

/**
 * @route   GET /api/email/track/open/:messageId
 * @desc    Track email open
 * @access  Public
 */
router.get('/track/open/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const emailLog = await EmailLog.findOne({ messageId });
    if (emailLog) {
      await emailLog.recordEvent('opened', {
        timestamp: new Date(),
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }
    
    // Return 1x1 transparent pixel
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
  } catch (error) {
    // Still return pixel even if tracking fails
    res.setHeader('Content-Type', 'image/gif');
    res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
  }
});

/**
 * @route   GET /api/email/track/click/:messageId
 * @desc    Track email click and redirect
 * @access  Public
 */
router.get('/track/click/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { url, lid } = req.query;
    
    if (!url) {
      return res.status(400).send('Missing URL parameter');
    }
    
    const decodedUrl = decodeURIComponent(url);
    
    const emailLog = await EmailLog.findOne({ messageId });
    if (emailLog) {
      await emailLog.recordEvent('clicked', {
        timestamp: new Date(),
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        url: decodedUrl,
        linkId: lid,
      });
    }
    
    // Redirect to original URL
    res.redirect(decodedUrl);
  } catch (error) {
    // Try to redirect anyway
    const { url } = req.query;
    if (url) {
      res.redirect(decodeURIComponent(url));
    } else {
      res.status(500).send('Error processing click');
    }
  }
});

/**
 * @route   GET /api/email/unsubscribe
 * @desc    Handle unsubscribe
 * @access  Public
 */
router.get('/unsubscribe', async (req, res) => {
  try {
    const { token, uid, cid } = req.query;
    
    if (!token || !uid) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters',
      });
    }
    
    const user = await User.findById(uid);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    
    // Verify token
    const isValid = verifyUnsubscribeToken(uid, user.email, token);
    if (!isValid) {
      return res.status(403).json({
        success: false,
        message: 'Invalid unsubscribe token',
      });
    }
    
    // Add to suppression list
    await addToSuppressionList(user.email, 'unsubscribe');
    
    // Update user preferences
    user.notificationPreferences = user.notificationPreferences || {};
    user.notificationPreferences.email = false;
    user.notificationPreferences.marketingEmails = false;
    await user.save();
    
    res.json({
      success: true,
      message: 'You have been successfully unsubscribed',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==================== WEBHOOK ROUTES ====================

/**
 * @route   POST /api/email/webhook/sendgrid
 * @desc    Handle SendGrid webhook events
 * @access  Public (with signature verification in production)
 */
router.post('/webhook/sendgrid', async (req, res) => {
  try {
    const events = req.body;
    
    // In production, verify webhook signature here
    
    const { handleWebhookEvents } = await import('../services/emailMarketingService.js');
    await handleWebhookEvents(events);
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error');
  }
});

module.exports = router;
