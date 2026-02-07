/**
 * WhatsApp Routes
 * Handles WhatsApp Business API webhooks and messaging endpoints
 */

const express = require('express');
const whatsappService = require('../services/whatsappService.js');
const WhatsAppTemplate = require('../models/WhatsAppTemplate.js');
const { TEMPLATE_TYPE, TEMPLATE_STATUS } = require('../models/WhatsAppTemplate.js');
const WhatsAppSession = require('../models/WhatsAppSession.js');
const { SESSION_STATUS } = require('../models/WhatsAppSession.js');
const WhatsAppMessage = require('../models/WhatsAppMessage.js');
const { User } = require('../models/index.js');
const { authenticate } = require('../middleware/auth.js');
const { asyncHandler, ValidationError, NotFoundError, AuthorizationError } = require('../middleware/errorHandler.js');
const { requireAdmin } = require('../middleware/rbac.js');

const router = express.Router();

// ==================== WEBHOOK ENDPOINTS ====================

/**
 * @route   GET /api/whatsapp/webhook
 * @desc    Verify webhook (for Meta verification)
 * @access  Public
 */
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  // Verify token
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  
  if (mode === 'subscribe' && token === verifyToken) {
    console.log('Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    console.error('Webhook verification failed');
    res.sendStatus(403);
  }
});

/**
 * @route   POST /api/whatsapp/webhook
 * @desc    Receive webhook events from WhatsApp
 * @access  Public (secured by signature verification)
 */
router.post('/webhook', express.raw({ type: 'application/json' }), asyncHandler(async (req, res) => {
  // Verify signature if not in mock mode
  const signature = req.headers['x-hub-signature-256'];
  
  if (!whatsappService.config.mockMode) {
    const isValid = whatsappService.verifyWebhookSignature(signature, req.body);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return res.sendStatus(403);
    }
  }
  
  // Parse body if it's a buffer
  const payload = Buffer.isBuffer(req.body) ? JSON.parse(req.body) : req.body;
  
  console.log('Received webhook:', JSON.stringify(payload, null, 2));
  
  // Process webhook asynchronously
  res.sendStatus(200);
  
  // Process the webhook after sending response
  try {
    const results = await whatsappService.processWebhook(payload);
    console.log('Webhook processed:', results);
  } catch (error) {
    console.error('Error processing webhook:', error);
  }
}));

// ==================== MESSAGE SENDING ENDPOINTS ====================

/**
 * @route   POST /api/whatsapp/send
 * @desc    Send a WhatsApp message
 * @access  Private (Admin only)
 */
router.post('/send', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { phoneNumber, message, type = 'text', templateName, templateParams } = req.body;
  
  if (!phoneNumber) {
    throw new ValidationError('Phone number is required');
  }
  
  if (type === 'text' && !message) {
    throw new ValidationError('Message text is required');
  }
  
  if (type === 'template' && !templateName) {
    throw new ValidationError('Template name is required');
  }
  
  let result;
  
  switch (type) {
    case 'text':
      result = await whatsappService.sendTextMessage(phoneNumber, message);
      break;
    case 'template':
      result = await whatsappService.sendTemplateMessage(phoneNumber, templateName, templateParams || {});
      break;
    default:
      throw new ValidationError(`Invalid message type: ${type}`);
  }
  
  res.json({
    success: true,
    data: result,
  });
}));

/**
 * @route   POST /api/whatsapp/send-template
 * @desc    Send a template message
 * @access  Private (Admin only)
 */
router.post('/send-template', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { phoneNumber, templateName, language = 'my', params = {} } = req.body;
  
  if (!phoneNumber || !templateName) {
    throw new ValidationError('Phone number and template name are required');
  }
  
  const result = await whatsappService.sendTemplateMessage(phoneNumber, templateName, params, { language });
  
  res.json({
    success: true,
    data: result,
  });
}));

/**
 * @route   POST /api/whatsapp/broadcast
 * @desc    Send message to multiple users
 * @access  Private (Admin only)
 */
router.post('/broadcast', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { phoneNumbers, message, templateName, templateParams } = req.body;
  
  if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
    throw new ValidationError('Phone numbers array is required');
  }
  
  if (!message && !templateName) {
    throw new ValidationError('Either message or templateName is required');
  }
  
  const results = {
    successful: [],
    failed: [],
  };
  
  // Process in batches to avoid rate limiting
  const batchSize = 10;
  for (let i = 0; i < phoneNumbers.length; i += batchSize) {
    const batch = phoneNumbers.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map(async (phone) => {
        try {
          let result;
          if (templateName) {
            result = await whatsappService.sendTemplateMessage(phone, templateName, templateParams || {});
          } else {
            result = await whatsappService.sendTextMessage(phone, message);
          }
          results.successful.push({ phone, messageId: result.messageId });
        } catch (error) {
          results.failed.push({ phone, error: error.message });
        }
      })
    );
    
    // Small delay between batches
    if (i + batchSize < phoneNumbers.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  res.json({
    success: true,
    data: {
      total: phoneNumbers.length,
      successful: results.successful.length,
      failed: results.failed.length,
      results,
    },
  });
}));

// ==================== OPT-IN MANAGEMENT ====================

/**
 * @route   POST /api/whatsapp/opt-in
 * @desc    Opt in to WhatsApp messages
 * @access  Private
 */
router.post('/opt-in', authenticate, asyncHandler(async (req, res) => {
  const { phoneNumber } = req.body;
  const userId = req.user._id;
  
  const phone = phoneNumber || req.user.referrerProfile?.whatsappNumber || req.user.phone;
  
  if (!phone) {
    throw new ValidationError('Phone number is required');
  }
  
  const formattedPhone = whatsappService.formatPhoneNumber(phone);
  
  // Get or create session
  const session = await whatsappService.getOrCreateSession(formattedPhone);
  
  // Opt in
  await session.optInUser('web');
  
  // Link to user
  await session.linkToUser(userId, req.user.role === 'referrer' ? 'referrer' : 'job_seeker');
  
  // Update user's WhatsApp number if provided
  if (phoneNumber && req.user.role === 'referrer') {
    await User.findByIdAndUpdate(userId, {
      'referrerProfile.whatsappNumber': formattedPhone,
      'referrerProfile.whatsappOptIn': true,
      'referrerProfile.whatsappVerifiedAt': new Date(),
    });
  }
  
  // Send welcome message
  await whatsappService.sendWelcomeMessage(formattedPhone, req.user.name, session.language);
  
  res.json({
    success: true,
    message: 'Successfully opted in to WhatsApp messages',
    data: {
      phoneNumber: formattedPhone,
      sessionId: session._id,
    },
  });
}));

/**
 * @route   POST /api/whatsapp/opt-out
 * @desc    Opt out of WhatsApp messages
 * @access  Private
 */
router.post('/opt-out', authenticate, asyncHandler(async (req, res) => {
  const { phoneNumber } = req.body;
  
  const phone = phoneNumber || req.user.referrerProfile?.whatsappNumber || req.user.phone;
  
  if (!phone) {
    throw new ValidationError('Phone number is required');
  }
  
  const formattedPhone = whatsappService.formatPhoneNumber(phone);
  
  // Find session
  const session = await WhatsAppSession.findOne({ phoneNumber: formattedPhone });
  
  if (!session) {
    throw new NotFoundError('WhatsApp session not found');
  }
  
  // Opt out
  await session.optOutUser();
  
  // Update user
  if (req.user.role === 'referrer') {
    await User.findByIdAndUpdate(req.user._id, {
      'referrerProfile.whatsappOptIn': false,
    });
  }
  
  res.json({
    success: true,
    message: 'Successfully opted out of WhatsApp messages',
  });
}));

/**
 * @route   GET /api/whatsapp/opt-in-status
 * @desc    Check opt-in status
 * @access  Private
 */
router.get('/opt-in-status', authenticate, asyncHandler(async (req, res) => {
  const phone = req.user.referrerProfile?.whatsappNumber || req.user.phone;
  
  if (!phone) {
    return res.json({
      success: true,
      data: {
        optedIn: false,
        phoneNumber: null,
      },
    });
  }
  
  const formattedPhone = whatsappService.formatPhoneNumber(phone);
  const session = await WhatsAppSession.findOne({ phoneNumber: formattedPhone });
  
  res.json({
    success: true,
    data: {
      optedIn: session?.optIn?.status || false,
      phoneNumber: formattedPhone,
      optedInAt: session?.optIn?.optedInAt,
      language: session?.language,
    },
  });
}));

// ==================== TEMPLATE MANAGEMENT ====================

/**
 * @route   GET /api/whatsapp/templates
 * @desc    Get all WhatsApp templates
 * @access  Private (Admin only)
 */
router.get('/templates', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { status, type, isActive } = req.query;
  
  const filter = {};
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  
  const templates = await WhatsAppTemplate.find(filter)
    .sort({ createdAt: -1 })
    .select('-metaResponse');
  
  res.json({
    success: true,
    data: templates,
  });
}));

/**
 * @route   GET /api/whatsapp/templates/:id
 * @desc    Get template by ID
 * @access  Private (Admin only)
 */
router.get('/templates/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const template = await WhatsAppTemplate.findById(req.params.id);
  
  if (!template) {
    throw new NotFoundError('Template');
  }
  
  res.json({
    success: true,
    data: template,
  });
}));

/**
 * @route   POST /api/whatsapp/templates
 * @desc    Create new template
 * @access  Private (Admin only)
 */
router.post('/templates', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { name, type, category, languages, variables } = req.body;
  
  if (!name || !type) {
    throw new ValidationError('Name and type are required');
  }
  
  // Validate template name format
  if (!/^[a-z0-9_]+$/.test(name)) {
    throw new ValidationError('Template name must be lowercase alphanumeric with underscores only');
  }
  
  const template = await WhatsAppTemplate.create({
    name: name.toLowerCase(),
    type,
    category: category || 'UTILITY',
    languages: new Map(Object.entries(languages || {})),
    variables: variables || [],
    createdBy: req.user._id,
  });
  
  // Try to create on WhatsApp API if not in mock mode
  if (!whatsappService.config.mockMode) {
    try {
      const result = await whatsappService.createTemplate({
        name: template.name,
        category: template.category,
        language: template.defaultLanguage === 'my' ? 'my_MM' : 'en_US',
        components: languages[template.defaultLanguage]?.components || [],
      });
      
      template.wabaTemplateId = result.templateId;
      await template.save();
    } catch (error) {
      console.error('Error creating template on WhatsApp API:', error);
      // Don't fail, template is saved locally
    }
  }
  
  res.status(201).json({
    success: true,
    data: template,
  });
}));

/**
 * @route   PUT /api/whatsapp/templates/:id
 * @desc    Update template
 * @access  Private (Admin only)
 */
router.put('/templates/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { languages, variables, isActive, defaultLanguage } = req.body;
  
  const template = await WhatsAppTemplate.findById(req.params.id);
  
  if (!template) {
    throw new NotFoundError('Template');
  }
  
  if (languages) {
    template.languages = new Map(Object.entries(languages));
  }
  if (variables) template.variables = variables;
  if (isActive !== undefined) template.isActive = isActive;
  if (defaultLanguage) template.defaultLanguage = defaultLanguage;
  
  await template.save();
  
  res.json({
    success: true,
    data: template,
  });
}));

/**
 * @route   DELETE /api/whatsapp/templates/:id
 * @desc    Delete template
 * @access  Private (Admin only)
 */
router.delete('/templates/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const template = await WhatsAppTemplate.findById(req.params.id);
  
  if (!template) {
    throw new NotFoundError('Template');
  }
  
  template.isActive = false;
  template.status = TEMPLATE_STATUS.PENDING_DELETION;
  await template.save();
  
  res.json({
    success: true,
    message: 'Template marked for deletion',
  });
}));

/**
 * @route   POST /api/whatsapp/templates/sync
 * @desc    Sync templates with WhatsApp Business API
 * @access  Private (Admin only)
 */
router.post('/templates/sync', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const result = await whatsappService.syncTemplates();
  
  res.json({
    success: true,
    data: result,
  });
}));

// ==================== INTERACTIVE MESSAGES ====================

/**
 * @route   POST /api/whatsapp/interactive
 * @desc    Send interactive message with buttons
 * @access  Private (Admin only)
 */
router.post('/interactive', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { phoneNumber, body, buttons, type = 'button' } = req.body;
  
  if (!phoneNumber || !body || !buttons) {
    throw new ValidationError('Phone number, body, and buttons are required');
  }
  
  const interactiveData = {
    type,
    body: { text: body },
    action: {
      buttons: buttons.map((btn, index) => ({
        type: 'reply',
        reply: {
          id: btn.id || `btn_${index}`,
          title: btn.title,
        },
      })),
    },
  };
  
  const result = await whatsappService.sendInteractiveMessage(phoneNumber, interactiveData);
  
  res.json({
    success: true,
    data: result,
  });
}));

// ==================== SESSION MANAGEMENT ====================

/**
 * @route   GET /api/whatsapp/sessions
 * @desc    Get all WhatsApp sessions
 * @access  Private (Admin only)
 */
router.get('/sessions', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  
  const filter = {};
  if (status) filter.status = status;
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const [sessions, total] = await Promise.all([
    WhatsAppSession.find(filter)
      .sort({ 'stats.lastContactAt': -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'name email'),
    WhatsAppSession.countDocuments(filter),
  ]);
  
  res.json({
    success: true,
    data: sessions,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
}));

/**
 * @route   GET /api/whatsapp/sessions/:id
 * @desc    Get session by ID
 * @access  Private (Admin only)
 */
router.get('/sessions/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const session = await WhatsAppSession.findById(req.params.id)
    .populate('userId', 'name email phone');
  
  if (!session) {
    throw new NotFoundError('Session');
  }
  
  // Get recent messages
  const messages = await WhatsAppMessage.findBySession(session._id, { limit: 20 });
  
  res.json({
    success: true,
    data: {
      session,
      messages,
    },
  });
}));

/**
 * @route   POST /api/whatsapp/sessions/:id/close
 * @desc    Close a session
 * @access  Private (Admin only)
 */
router.post('/sessions/:id/close', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { reason } = req.body;
  
  const session = await WhatsAppSession.findById(req.params.id);
  
  if (!session) {
    throw new NotFoundError('Session');
  }
  
  await session.close(reason || 'admin_closed');
  
  res.json({
    success: true,
    message: 'Session closed successfully',
  });
}));

// ==================== MESSAGE HISTORY ====================

/**
 * @route   GET /api/whatsapp/messages
 * @desc    Get message history
 * @access  Private (Admin only)
 */
router.get('/messages', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { phoneNumber, sessionId, direction, page = 1, limit = 50 } = req.query;
  
  const filter = {};
  if (phoneNumber) filter.phoneNumber = whatsappService.formatPhoneNumber(phoneNumber);
  if (sessionId) filter.sessionId = sessionId;
  if (direction) filter.direction = direction;
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const [messages, total] = await Promise.all([
    WhatsAppMessage.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'name email')
      .select('-webhookData -apiResponse'),
    WhatsAppMessage.countDocuments(filter),
  ]);
  
  res.json({
    success: true,
    data: messages,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
}));

/**
 * @route   GET /api/whatsapp/messages/:id
 * @desc    Get message by ID
 * @access  Private (Admin only)
 */
router.get('/messages/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const message = await WhatsAppMessage.findById(req.params.id)
    .populate('userId', 'name email')
    .populate('sessionId');
  
  if (!message) {
    throw new NotFoundError('Message');
  }
  
  res.json({
    success: true,
    data: message,
  });
}));

// ==================== USER MESSAGES ====================

/**
 * @route   GET /api/whatsapp/my-messages
 * @desc    Get current user's WhatsApp messages
 * @access  Private
 */
router.get('/my-messages', authenticate, asyncHandler(async (req, res) => {
  const phone = req.user.referrerProfile?.whatsappNumber || req.user.phone;
  
  if (!phone) {
    return res.json({
      success: true,
      data: [],
    });
  }
  
  const formattedPhone = whatsappService.formatPhoneNumber(phone);
  const messages = await WhatsAppMessage.findByPhone(formattedPhone, { limit: 50 });
  
  res.json({
    success: true,
    data: messages,
  });
}));

/**
 * @route   GET /api/whatsapp/my-conversation
 * @desc    Get current user's conversation history
 * @access  Private
 */
router.get('/my-conversation', authenticate, asyncHandler(async (req, res) => {
  const phone = req.user.referrerProfile?.whatsappNumber || req.user.phone;
  
  if (!phone) {
    return res.json({
      success: true,
      data: [],
    });
  }
  
  const formattedPhone = whatsappService.formatPhoneNumber(phone);
  const session = await WhatsAppSession.findOne({ phoneNumber: formattedPhone });
  
  if (!session) {
    return res.json({
      success: true,
      data: [],
    });
  }
  
  const messages = await WhatsAppMessage.getConversation(session._id, 100);
  
  res.json({
    success: true,
    data: messages,
  });
}));

// ==================== STATISTICS ====================

/**
 * @route   GET /api/whatsapp/stats
 * @desc    Get WhatsApp statistics
 * @access  Private (Admin only)
 */
router.get('/stats', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const stats = await whatsappService.getStatistics();
  
  res.json({
    success: true,
    data: stats,
  });
}));

/**
 * @route   GET /api/whatsapp/dashboard
 * @desc    Get dashboard data
 * @access  Private (Admin only)
 */
router.get('/dashboard', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const [
    sessionStats,
    messageStats,
    templateStats,
    recentSessions,
    recentMessages,
  ] = await Promise.all([
    WhatsAppSession.getStats(),
    WhatsAppMessage.getStats({ startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }),
    WhatsAppTemplate.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          approved: {
            $sum: { $cond: [{ $eq: ['$status', TEMPLATE_STATUS.APPROVED] }, 1, 0] },
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', TEMPLATE_STATUS.PENDING] }, 1, 0] },
          },
        },
      },
    ]),
    WhatsAppSession.find()
      .sort({ 'stats.lastContactAt': -1 })
      .limit(10)
      .populate('userId', 'name email'),
    WhatsAppMessage.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('userId', 'name email')
      .select('-webhookData -apiResponse'),
  ]);
  
  res.json({
    success: true,
    data: {
      sessions: sessionStats[0] || {},
      messages: messageStats,
      templates: templateStats[0] || {},
      recentSessions,
      recentMessages,
    },
  });
}));

// ==================== UTILITY ENDPOINTS ====================

/**
 * @route   POST /api/whatsapp/validate-phone
 * @desc    Validate Myanmar phone number
 * @access  Public
 */
router.post('/validate-phone', asyncHandler(async (req, res) => {
  const { phoneNumber } = req.body;
  
  if (!phoneNumber) {
    throw new ValidationError('Phone number is required');
  }
  
  const isValid = whatsappService.validateMyanmarPhone(phoneNumber);
  const formatted = whatsappService.formatPhoneNumber(phoneNumber);
  
  res.json({
    success: true,
    data: {
      isValid,
      formatted,
      original: phoneNumber,
    },
  });
}));

/**
 * @route   GET /api/whatsapp/config
 * @desc    Get WhatsApp configuration (safe values only)
 * @access  Private (Admin only)
 */
router.get('/config', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      mockMode: whatsappService.config.mockMode,
      defaultLanguage: whatsappService.config.defaultLanguage,
      apiVersion: whatsappService.config.wabaApiVersion,
    },
  });
}));

module.exports = router;
