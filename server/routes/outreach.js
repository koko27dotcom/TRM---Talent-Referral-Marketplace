/**
 * Outreach Routes
 * API endpoints for campaign management and message automation
 */

const express = require('express');
const OutreachCampaign = require('../models/OutreachCampaign.js');
const TalentPool = require('../models/TalentPool.js');
const { authenticate } = require('../middleware/auth.js');
const { requireRole } = require('../middleware/rbac.js');
const { asyncHandler, ValidationError, NotFoundError } = require('../middleware/errorHandler.js');
const { outreachAutomationService } = require('../services/outreachAutomationService.js');
const { candidateEnrichmentService } = require('../services/candidateEnrichmentService.js');

const router = express.Router();

/**
 * @route   GET /api/outreach/campaigns
 * @desc    List campaigns with filters and pagination
 * @access  Private (Recruiter, Admin)
 */
router.get('/campaigns', authenticate, requireRole(['corporate_recruiter', 'corporate_admin', 'platform_admin']), asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    channel,
    type,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  // Build query
  const query = {};

  if (status) query.status = status;
  if (channel) query.channel = channel;
  if (type) query.type = type;
  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }

  // Build sort
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Execute query
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [campaigns, total] = await Promise.all([
    OutreachCampaign.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'name email')
      .populate('targetJobId', 'title company'),
    OutreachCampaign.countDocuments(query),
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
}));

/**
 * @route   POST /api/outreach/campaigns
 * @desc    Create new campaign
 * @access  Private (Recruiter, Admin)
 */
router.post('/campaigns', authenticate, requireRole(['corporate_recruiter', 'corporate_admin', 'platform_admin']), asyncHandler(async (req, res) => {
  const campaignData = req.body;

  // Validate required fields
  if (!campaignData.name || !campaignData.channel) {
    throw new ValidationError('Campaign name and channel are required');
  }

  if (!campaignData.messageTemplate || !campaignData.messageTemplate.body) {
    throw new ValidationError('Message template is required');
  }

  // Create campaign with candidates
  const campaign = await outreachAutomationService.createCampaign(
    campaignData,
    req.user._id
  );

  res.status(201).json({
    success: true,
    data: campaign,
  });
}));

/**
 * @route   GET /api/outreach/campaigns/:id
 * @desc    Get campaign details
 * @access  Private (Recruiter, Admin)
 */
router.get('/campaigns/:id', authenticate, requireRole(['corporate_recruiter', 'corporate_admin', 'platform_admin']), asyncHandler(async (req, res) => {
  const campaign = await OutreachCampaign.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate('targetJobId', 'title company')
    .populate('recipients.candidateId', 'name email phone currentTitle currentCompany');

  if (!campaign) {
    throw new NotFoundError('Campaign not found');
  }

  res.json({
    success: true,
    data: campaign,
  });
}));

/**
 * @route   PUT /api/outreach/campaigns/:id
 * @desc    Update campaign
 * @access  Private (Recruiter, Admin)
 */
router.put('/campaigns/:id', authenticate, requireRole(['corporate_recruiter', 'corporate_admin', 'platform_admin']), asyncHandler(async (req, res) => {
  const campaign = await OutreachCampaign.findById(req.params.id);

  if (!campaign) {
    throw new NotFoundError('Campaign not found');
  }

  // Only allow updates for draft campaigns
  if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
    throw new ValidationError('Cannot update campaign that has already started');
  }

  const updatedCampaign = await OutreachCampaign.findByIdAndUpdate(
    req.params.id,
    {
      ...req.body,
      updatedBy: req.user._id,
    },
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    data: updatedCampaign,
  });
}));

/**
 * @route   POST /api/outreach/campaigns/:id/send
 * @desc    Start/sent campaign
 * @access  Private (Recruiter, Admin)
 */
router.post('/campaigns/:id/send', authenticate, requireRole(['corporate_recruiter', 'corporate_admin', 'platform_admin']), asyncHandler(async (req, res) => {
  const campaign = await outreachAutomationService.startCampaign(
    req.params.id,
    req.user._id
  );

  res.json({
    success: true,
    message: 'Campaign started successfully',
    data: campaign,
  });
}));

/**
 * @route   POST /api/outreach/campaigns/:id/pause
 * @desc    Pause running campaign
 * @access  Private (Recruiter, Admin)
 */
router.post('/campaigns/:id/pause', authenticate, requireRole(['corporate_recruiter', 'corporate_admin', 'platform_admin']), asyncHandler(async (req, res) => {
  const campaign = await outreachAutomationService.pauseCampaign(
    req.params.id,
    req.user._id
  );

  res.json({
    success: true,
    message: 'Campaign paused successfully',
    data: campaign,
  });
}));

/**
 * @route   POST /api/outreach/campaigns/:id/resume
 * @desc    Resume paused campaign
 * @access  Private (Recruiter, Admin)
 */
router.post('/campaigns/:id/resume', authenticate, requireRole(['corporate_recruiter', 'corporate_admin', 'platform_admin']), asyncHandler(async (req, res) => {
  const campaign = await outreachAutomationService.resumeCampaign(
    req.params.id,
    req.user._id
  );

  res.json({
    success: true,
    message: 'Campaign resumed successfully',
    data: campaign,
  });
}));

/**
 * @route   POST /api/outreach/campaigns/:id/cancel
 * @desc    Cancel campaign
 * @access  Private (Recruiter, Admin)
 */
router.post('/campaigns/:id/cancel', authenticate, requireRole(['corporate_recruiter', 'corporate_admin', 'platform_admin']), asyncHandler(async (req, res) => {
  const campaign = await outreachAutomationService.cancelCampaign(
    req.params.id,
    req.user._id
  );

  res.json({
    success: true,
    message: 'Campaign cancelled successfully',
    data: campaign,
  });
}));

/**
 * @route   GET /api/outreach/campaigns/:id/stats
 * @desc    Get campaign statistics
 * @access  Private (Recruiter, Admin)
 */
router.get('/campaigns/:id/stats', authenticate, requireRole(['corporate_recruiter', 'corporate_admin', 'platform_admin']), asyncHandler(async (req, res) => {
  const stats = await outreachAutomationService.getCampaignStats(req.params.id);

  res.json({
    success: true,
    data: stats,
  });
}));

/**
 * @route   DELETE /api/outreach/campaigns/:id
 * @desc    Delete campaign
 * @access  Private (Admin)
 */
router.delete('/campaigns/:id', authenticate, requireRole(['platform_admin']), asyncHandler(async (req, res) => {
  const campaign = await OutreachCampaign.findByIdAndDelete(req.params.id);

  if (!campaign) {
    throw new NotFoundError('Campaign not found');
  }

  res.json({
    success: true,
    message: 'Campaign deleted successfully',
  });
}));

/**
 * @route   POST /api/outreach/send-message
 * @desc    Send single message to candidate
 * @access  Private (Recruiter, Admin)
 */
router.post('/send-message', authenticate, requireRole(['corporate_recruiter', 'corporate_admin', 'platform_admin']), asyncHandler(async (req, res) => {
  const { candidateId, channel, message, subject, template } = req.body;

  if (!candidateId || !channel || !message) {
    throw new ValidationError('Candidate ID, channel, and message are required');
  }

  const result = await outreachAutomationService.sendSingleMessage(
    candidateId,
    { channel, message, subject, template },
    req.user._id
  );

  res.json({
    success: result.success,
    data: result,
  });
}));

/**
 * @route   POST /api/outreach/generate-message
 * @desc    Generate AI-powered outreach message
 * @access  Private (Recruiter, Admin)
 */
router.post('/generate-message', authenticate, requireRole(['corporate_recruiter', 'corporate_admin', 'platform_admin']), asyncHandler(async (req, res) => {
  const { candidateId, jobId, template } = req.body;

  if (!candidateId) {
    throw new ValidationError('Candidate ID is required');
  }

  const candidate = await TalentPool.findById(candidateId);
  if (!candidate) {
    throw new NotFoundError('Candidate not found');
  }

  let job = null;
  if (jobId) {
    const Job = (await import('../models/Job.js')).default;
    job = await Job.findById(jobId);
  }

  const message = await candidateEnrichmentService.generateOutreachMessage(
    candidate,
    job,
    template
  );

  res.json({
    success: true,
    data: { message },
  });
}));

/**
 * @route   GET /api/outreach/stats
 * @desc    Get overall outreach statistics
 * @access  Private (Recruiter, Admin)
 */
router.get('/stats', authenticate, requireRole(['corporate_recruiter', 'corporate_admin', 'platform_admin']), asyncHandler(async (req, res) => {
  const stats = await outreachAutomationService.getDashboardStats(req.user._id);

  // Get additional breakdowns
  const channelBreakdown = await OutreachCampaign.aggregate([
    { $match: { createdBy: req.user._id } },
    { $group: { _id: '$channel', count: { $sum: 1 }, totalSent: { $sum: '$analytics.sentCount' } } },
  ]);

  const statusBreakdown = await OutreachCampaign.aggregate([
    { $match: { createdBy: req.user._id } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const recentCampaigns = await OutreachCampaign.find({ createdBy: req.user._id })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('name status channel analytics.sentCount analytics.openRate createdAt');

  res.json({
    success: true,
    data: {
      overview: stats,
      channelBreakdown,
      statusBreakdown,
      recentCampaigns,
    },
  });
}));

/**
 * @route   POST /api/outreach/campaigns/:id/add-recipients
 * @desc    Add recipients to campaign
 * @access  Private (Recruiter, Admin)
 */
router.post('/campaigns/:id/add-recipients', authenticate, requireRole(['corporate_recruiter', 'corporate_admin', 'platform_admin']), asyncHandler(async (req, res) => {
  const { candidateIds } = req.body;

  if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
    throw new ValidationError('Candidate IDs array is required');
  }

  const campaign = await OutreachCampaign.findById(req.params.id);
  if (!campaign) {
    throw new NotFoundError('Campaign not found');
  }

  if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
    throw new ValidationError('Cannot add recipients to campaign that has already started');
  }

  await campaign.addRecipients(candidateIds);

  res.json({
    success: true,
    message: `${candidateIds.length} recipients added to campaign`,
    data: { recipientCount: campaign.recipientCount },
  });
}));

/**
 * @route   POST /api/outreach/campaigns/:id/remove-recipient
 * @desc    Remove recipient from campaign
 * @access  Private (Recruiter, Admin)
 */
router.post('/campaigns/:id/remove-recipient', authenticate, requireRole(['corporate_recruiter', 'corporate_admin', 'platform_admin']), asyncHandler(async (req, res) => {
  const { candidateId } = req.body;

  const campaign = await OutreachCampaign.findById(req.params.id);
  if (!campaign) {
    throw new NotFoundError('Campaign not found');
  }

  // Remove recipient
  campaign.recipients = campaign.recipients.filter(
    r => r.candidateId.toString() !== candidateId
  );
  campaign.recipientCount = campaign.recipients.length;
  campaign.analytics.totalRecipients = campaign.recipients.length;
  await campaign.save();

  res.json({
    success: true,
    message: 'Recipient removed from campaign',
  });
}));

/**
 * @route   POST /api/outreach/track/open
 * @desc    Track email/message open
 * @access  Public (Pixel tracking)
 */
router.get('/track/open', asyncHandler(async (req, res) => {
  const { campaign, candidate } = req.query;

  if (campaign && candidate) {
    await outreachAutomationService.trackOpen(campaign, candidate, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
    });
  }

  // Return 1x1 transparent pixel
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
}));

/**
 * @route   POST /api/outreach/track/click
 * @desc    Track link click
 * @access  Public
 */
router.get('/track/click', asyncHandler(async (req, res) => {
  const { campaign, candidate, url } = req.query;

  if (campaign && candidate) {
    await outreachAutomationService.trackClick(campaign, candidate, {
      url,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
    });
  }

  // Redirect to actual URL
  const redirectUrl = url || '/';
  res.redirect(redirectUrl);
}));

/**
 * @route   POST /api/outreach/track/reply
 * @desc    Track message reply (webhook)
 * @access  Public (Webhook)
 */
router.post('/track/reply', asyncHandler(async (req, res) => {
  const { campaignId, candidateId, content, channel } = req.body;

  if (campaignId && candidateId && content) {
    await outreachAutomationService.trackReply(campaignId, candidateId, content, {
      channel,
      receivedAt: new Date(),
    });
  }

  res.json({ success: true });
}));

/**
 * @route   GET /api/outreach/templates
 * @desc    Get message templates
 * @access  Private (Recruiter, Admin)
 */
router.get('/templates', authenticate, requireRole(['corporate_recruiter', 'corporate_admin', 'platform_admin']), asyncHandler(async (req, res) => {
  // Predefined templates
  const templates = [
    {
      id: 'initial_outreach',
      name: 'Initial Outreach',
      category: 'talent_sourcing',
      subject: 'Exciting opportunity at {{companyName}}',
      body: `Hi {{firstName}},

I came across your profile and was impressed by your experience in {{currentTitle}} at {{currentCompany}}.

I have an exciting opportunity at {{companyName}} for a {{jobTitle}} role that I think would be a great fit for your skills in {{skills}}.

Would you be open to a quick chat to learn more?

Best regards,
TRM Recruitment Team`,
    },
    {
      id: 'follow_up',
      name: 'Follow Up',
      category: 'follow_up',
      subject: 'Following up on {{jobTitle}} opportunity',
      body: `Hi {{firstName}},

I wanted to follow up on my previous message about the {{jobTitle}} role at {{companyName}}.

I understand you might be busy, but I didn't want you to miss out on this opportunity.

Let me know if you'd like to discuss further!

Best regards,
TRM Recruitment Team`,
    },
    {
      id: 'job_promotion',
      name: 'Job Promotion',
      category: 'job_promotion',
      subject: 'New {{jobTitle}} position - Perfect match for your skills',
      body: `Hi {{firstName}},

We just posted a new {{jobTitle}} position that matches your expertise in {{skills}}.

This role offers excellent growth opportunities and competitive compensation.

Interested in learning more? Reply to this message!

Best regards,
TRM Recruitment Team`,
    },
  ];

  res.json({
    success: true,
    data: templates,
  });
}));

module.exports = router;
