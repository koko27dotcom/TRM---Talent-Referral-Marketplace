/**
 * Messaging Routes
 * Handles Viber, Telegram, and WhatsApp messaging endpoints
 * Primary focus on Viber and Telegram for Myanmar market
 */

const express = require('express');
const messagingService = require('../services/messagingService.js');
const { User } = require('../models/index.js');
const { authenticate } = require('../middleware/auth.js');
const { asyncHandler, ValidationError, NotFoundError } = require('../middleware/errorHandler.js');
const { requireAdmin } = require('../middleware/rbac.js');

const router = express.Router();

// ==================== WEBHOOK ENDPOINTS ====================

/**
 * @route   POST /api/messaging/viber/webhook
 * @desc    Receive Viber webhook events
 * @access  Public
 */
router.post('/viber/webhook', express.json(), asyncHandler(async (req, res) => {
  console.log('Viber webhook received:', JSON.stringify(req.body, null, 2));
  
  // Process webhook asynchronously
  res.sendStatus(200);
  
  try {
    const result = await messagingService.processViberWebhook(req.body);
    console.log('Viber webhook processed:', result);
  } catch (error) {
    console.error('Error processing Viber webhook:', error);
  }
}));

/**
 * @route   POST /api/messaging/telegram/webhook
 * @desc    Receive Telegram webhook events
 * @access  Public
 */
router.post('/telegram/webhook', express.json(), asyncHandler(async (req, res) => {
  console.log('Telegram webhook received:', JSON.stringify(req.body, null, 2));
  
  // Process webhook asynchronously
  res.sendStatus(200);
  
  try {
    const result = await messagingService.processTelegramWebhook(req.body);
    console.log('Telegram webhook processed:', result);
  } catch (error) {
    console.error('Error processing Telegram webhook:', error);
  }
}));

// ==================== WEBHOOK SETUP ====================

/**
 * @route   POST /api/messaging/viber/setup-webhook
 * @desc    Set Viber webhook URL
 * @access  Private (Admin only)
 */
router.post('/viber/setup-webhook', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { url } = req.body;
  
  const result = await messagingService.setViberWebhook(url);
  
  res.json({
    success: true,
    data: result,
  });
}));

/**
 * @route   POST /api/messaging/telegram/setup-webhook
 * @desc    Set Telegram webhook URL
 * @access  Private (Admin only)
 */
router.post('/telegram/setup-webhook', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { url } = req.body;
  
  const result = await messagingService.setTelegramWebhook(url);
  
  res.json({
    success: true,
    data: result,
  });
}));

/**
 * @route   POST /api/messaging/telegram/delete-webhook
 * @desc    Delete Telegram webhook
 * @access  Private (Admin only)
 */
router.post('/telegram/delete-webhook', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const result = await messagingService.deleteTelegramWebhook();
  
  res.json({
    success: true,
    data: result,
  });
}));

// ==================== MESSAGE SENDING ====================

/**
 * @route   POST /api/messaging/send
 * @desc    Send message to user on their preferred platform
 * @access  Private (Admin only)
 */
router.post('/send', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { userId, message, platform } = req.body;
  
  if (!userId || !message) {
    throw new ValidationError('User ID and message are required');
  }
  
  const result = await messagingService.sendMessage(userId, message, { platform });
  
  res.json({
    success: true,
    data: result,
  });
}));

/**
 * @route   POST /api/messaging/viber/send
 * @desc    Send Viber message
 * @access  Private (Admin only)
 */
router.post('/viber/send', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { userId, message, keyboard } = req.body;
  
  if (!userId || !message) {
    throw new ValidationError('User ID and message are required');
  }
  
  let result;
  if (keyboard && keyboard.length > 0) {
    result = await messagingService.sendViberKeyboard(userId, message, keyboard);
  } else {
    result = await messagingService.sendViberMessage(userId, message);
  }
  
  res.json({
    success: true,
    data: result,
  });
}));

/**
 * @route   POST /api/messaging/telegram/send
 * @desc    Send Telegram message
 * @access  Private (Admin only)
 */
router.post('/telegram/send', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { chatId, message, keyboard, parseMode } = req.body;
  
  if (!chatId || !message) {
    throw new ValidationError('Chat ID and message are required');
  }
  
  let result;
  if (keyboard && keyboard.length > 0) {
    result = await messagingService.sendTelegramKeyboard(chatId, message, keyboard, { parseMode });
  } else {
    result = await messagingService.sendTelegramMessage(chatId, message, { parseMode });
  }
  
  res.json({
    success: true,
    data: result,
  });
}));

/**
 * @route   POST /api/messaging/broadcast
 * @desc    Broadcast message to multiple users
 * @access  Private (Admin only)
 */
router.post('/broadcast', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { userIds, message, platform } = req.body;
  
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    throw new ValidationError('User IDs array is required');
  }
  
  if (!message) {
    throw new ValidationError('Message is required');
  }
  
  const results = {
    successful: [],
    failed: [],
  };
  
  // Process in batches
  const batchSize = 10;
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map(async (userId) => {
        try {
          const result = await messagingService.sendMessage(userId, message, { platform });
          results.successful.push({ userId, messageId: result.messageId });
        } catch (error) {
          results.failed.push({ userId, error: error.message });
        }
      })
    );
    
    // Delay between batches
    if (i + batchSize < userIds.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  res.json({
    success: true,
    data: {
      total: userIds.length,
      successful: results.successful.length,
      failed: results.failed.length,
      results,
    },
  });
}));

// ==================== USER PREFERENCES ====================

/**
 * @route   POST /api/messaging/connect
 * @desc    Connect messaging platform to user account
 * @access  Private
 */
router.post('/connect', authenticate, asyncHandler(async (req, res) => {
  const { platform, platformUserId } = req.body;
  
  if (!platform || !platformUserId) {
    throw new ValidationError('Platform and platform user ID are required');
  }
  
  if (!['viber', 'telegram', 'whatsapp'].includes(platform)) {
    throw new ValidationError('Invalid platform. Must be viber, telegram, or whatsapp');
  }
  
  // Update user preferences
  await User.findByIdAndUpdate(req.user._id, {
    $set: {
      'messagingPreferences.preferredPlatform': platform,
      'messagingPreferences.platformUserId': platformUserId,
      'messagingPreferences.optedIn': true,
      'messagingPreferences.connectedAt': new Date(),
    },
  });
  
  // Send welcome message
  await messagingService.sendWelcomeMessage(req.user._id, req.user.name, req.user.language || 'my');
  
  res.json({
    success: true,
    message: `Successfully connected ${platform}`,
    data: {
      platform,
      platformUserId,
    },
  });
}));

/**
 * @route   DELETE /api/messaging/disconnect
 * @desc    Disconnect messaging platform
 * @access  Private
 */
router.delete('/disconnect', authenticate, asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $set: {
      'messagingPreferences.optedIn': false,
      'messagingPreferences.disconnectedAt': new Date(),
    },
  });
  
  res.json({
    success: true,
    message: 'Messaging platform disconnected',
  });
}));

/**
 * @route   GET /api/messaging/preferences
 * @desc    Get user's messaging preferences
 * @access  Private
 */
router.get('/preferences', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('messagingPreferences');
  
  res.json({
    success: true,
    data: user.messagingPreferences || {
      optedIn: false,
      preferredPlatform: null,
    },
  });
}));

/**
 * @route   PUT /api/messaging/preferences
 * @desc    Update messaging preferences
 * @access  Private
 */
router.put('/preferences', authenticate, asyncHandler(async (req, res) => {
  const { preferredPlatform, notificationTypes } = req.body;
  
  const updateData = {};
  if (preferredPlatform) updateData['messagingPreferences.preferredPlatform'] = preferredPlatform;
  if (notificationTypes) updateData['messagingPreferences.notificationTypes'] = notificationTypes;
  
  await User.findByIdAndUpdate(req.user._id, { $set: updateData });
  
  res.json({
    success: true,
    message: 'Preferences updated',
  });
}));

// ==================== NOTIFICATIONS ====================

/**
 * @route   POST /api/messaging/notify/referral-status
 * @desc    Send referral status notification
 * @access  Private
 */
router.post('/notify/referral-status', authenticate, asyncHandler(async (req, res) => {
  const { referralId, status } = req.body;
  
  if (!referralId || !status) {
    throw new ValidationError('Referral ID and status are required');
  }
  
  const Referral = require('../models/Referral.js');
  const referral = await Referral.findById(referralId).populate('referrerId');
  
  if (!referral) {
    throw new NotFoundError('Referral');
  }
  
  const user = referral.referrerId;
  if (!user?.messagingPreferences?.optedIn) {
    return res.json({
      success: false,
      message: 'User has not opted in to messaging notifications',
    });
  }
  
  const result = await messagingService.sendReferralStatusUpdate(
    user._id,
    referral,
    status,
    user.language || 'my'
  );
  
  res.json({
    success: true,
    data: result,
  });
}));

/**
 * @route   POST /api/messaging/notify/payout
 * @desc    Send payout notification
 * @access  Private
 */
router.post('/notify/payout', authenticate, asyncHandler(async (req, res) => {
  const { payoutId, status } = req.body;
  
  if (!payoutId || !status) {
    throw new ValidationError('Payout ID and status are required');
  }
  
  const PayoutRequest = require('../models/PayoutRequest.js');
  const payout = await PayoutRequest.findById(payoutId).populate('userId');
  
  if (!payout) {
    throw new NotFoundError('Payout');
  }
  
  const user = payout.userId;
  if (!user?.messagingPreferences?.optedIn) {
    return res.json({
      success: false,
      message: 'User has not opted in to messaging notifications',
    });
  }
  
  const result = await messagingService.sendPayoutNotification(
    user._id,
    payout,
    status,
    user.language || 'my'
  );
  
  res.json({
    success: true,
    data: result,
  });
}));

/**
 * @route   POST /api/messaging/notify/job-alert
 * @desc    Send job alert to users
 * @access  Private (Admin only)
 */
router.post('/notify/job-alert', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { jobId, userIds } = req.body;
  
  if (!jobId) {
    throw new ValidationError('Job ID is required');
  }
  
  const Job = require('../models/Job.js');
  const job = await Job.findById(jobId).populate('companyId', 'name');
  
  if (!job) {
    throw new NotFoundError('Job');
  }
  
  // If specific users provided, send to them; otherwise find interested users
  let targetUsers;
  if (userIds && userIds.length > 0) {
    targetUsers = await User.find({
      _id: { $in: userIds },
      'messagingPreferences.optedIn': true,
    });
  } else {
    // Find referrers who might be interested
    targetUsers = await User.find({
      role: 'referrer',
      'messagingPreferences.optedIn': true,
    }).limit(100);
  }
  
  const results = {
    successful: [],
    failed: [],
  };
  
  for (const user of targetUsers) {
    try {
      const result = await messagingService.sendJobAlert(
        user._id,
        {
          title: job.title,
          companyName: job.companyId?.name,
          referralBonus: job.referralBonus,
        },
        user.language || 'my'
      );
      results.successful.push({ userId: user._id, messageId: result.messageId });
    } catch (error) {
      results.failed.push({ userId: user._id, error: error.message });
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  res.json({
    success: true,
    data: {
      total: targetUsers.length,
      successful: results.successful.length,
      failed: results.failed.length,
      results,
    },
  });
}));

// ==================== STATISTICS ====================

/**
 * @route   GET /api/messaging/stats
 * @desc    Get messaging statistics
 * @access  Private (Admin only)
 */
router.get('/stats', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  // Count users by platform
  const platformStats = await User.aggregate([
    {
      $match: {
        'messagingPreferences.optedIn': true,
      },
    },
    {
      $group: {
        _id: '$messagingPreferences.preferredPlatform',
        count: { $sum: 1 },
      },
    },
  ]);
  
  // Count total opted-in users
  const totalOptedIn = await User.countDocuments({
    'messagingPreferences.optedIn': true,
  });
  
  res.json({
    success: true,
    data: {
      totalOptedIn,
      platformBreakdown: platformStats.reduce((acc, stat) => {
        acc[stat._id || 'unknown'] = stat.count;
        return acc;
      }, {}),
      mockMode: messagingService.config.mockMode,
    },
  });
}));

/**
 * @route   GET /api/messaging/config
 * @desc    Get messaging configuration (safe values)
 * @access  Private (Admin only)
 */
router.get('/config', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      mockMode: messagingService.config.mockMode,
      defaultLanguage: messagingService.config.defaultLanguage,
      platforms: ['viber', 'telegram', 'whatsapp'],
      primaryPlatforms: ['viber', 'telegram'],
    },
  });
}));

module.exports = router;

module.exports = router;
