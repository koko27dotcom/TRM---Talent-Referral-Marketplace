/**
 * WhatsApp Service
 * Handles WhatsApp Business API integration
 * Supports both real API calls and mock mode for development
 * Includes Viber and Telegram support for Myanmar market
 */

const axios = require('axios');
const crypto = require('crypto');
const WhatsAppTemplate = require('../models/WhatsAppTemplate.js');
const { TEMPLATE_STATUS, TEMPLATE_TYPE } = require('../models/WhatsAppTemplate.js');
const WhatsAppSession = require('../models/WhatsAppSession.js');
const { SESSION_STATUS, CONTEXT_TYPE, USER_TYPE } = require('../models/WhatsAppSession.js');
const WhatsAppMessage = require('../models/WhatsAppMessage.js');
const { MESSAGE_DIRECTION, MESSAGE_TYPE, MESSAGE_STATUS } = require('../models/WhatsAppMessage.js');
const { User, Referral, Job, Company } = require('../models/index.js');

// Platform types for multi-platform support
const PLATFORM = {
  WHATSAPP: 'whatsapp',
  VIBER: 'viber',
  TELEGRAM: 'telegram',
};

// Configuration
const config = {
  // WhatsApp Business API
  wabaApiVersion: process.env.WHATSAPP_API_VERSION || 'v18.0',
  wabaPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  wabaBusinessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
  wabaAccessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  
  // Viber API
  viberAuthToken: process.env.VIBER_AUTH_TOKEN,
  
  // Telegram Bot API
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  
  // Webhook
  webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
  webhookUrl: process.env.WHATSAPP_WEBHOOK_URL,
  
  // Settings
  mockMode: process.env.WHATSAPP_MOCK_MODE === 'true' || !process.env.WHATSAPP_ACCESS_TOKEN,
  defaultLanguage: process.env.WHATSAPP_DEFAULT_LANGUAGE || 'my',
  rateLimitPerMinute: parseInt(process.env.WHATSAPP_RATE_LIMIT) || 30,
  sessionExpiryHours: parseInt(process.env.WHATSAPP_SESSION_EXPIRY) || 24,
};

// Logger for mock mode
const mockLog = (action, data) => {
  if (config.mockMode) {
    console.log(`[WHATSAPP MOCK] ${action}:`, JSON.stringify(data, null, 2));
  }
};

// ==================== API CLIENT ====================

/**
 * Get WhatsApp Business API base URL
 */
const getWABAUrl = (endpoint) => {
  return `https://graph.facebook.com/${config.wabaApiVersion}/${endpoint}`;
};

/**
 * Make authenticated request to WhatsApp Business API
 */
const makeWABARequest = async (endpoint, method = 'GET', data = null) => {
  if (config.mockMode) {
    mockLog('API Request', { endpoint, method, data });
    return { success: true, mock: true };
  }
  
  try {
    const url = getWABAUrl(endpoint);
    const headers = {
      'Authorization': `Bearer ${config.wabaAccessToken}`,
      'Content-Type': 'application/json',
    };
    
    const response = await axios({
      method,
      url,
      headers,
      data,
    });
    
    return response.data;
  } catch (error) {
    console.error('WhatsApp API Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error?.message || 'WhatsApp API request failed');
  }
};

// ==================== PHONE NUMBER UTILITIES ====================

/**
 * Format phone number to international format
 * @param {string} phone - Phone number
 * @returns {string}
 */
const formatPhoneNumber = (phone) => {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove leading 0 and add Myanmar country code if needed
  if (cleaned.startsWith('0')) {
    cleaned = '95' + cleaned.substring(1);
  }
  
  // Add + if not present
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
};

/**
 * Validate Myanmar phone number
 * @param {string} phone - Phone number
 * @returns {boolean}
 */
const validateMyanmarPhone = (phone) => {
  const formatted = formatPhoneNumber(phone);
  // Myanmar numbers: +95 followed by 9 digits (starting with 9)
  return /^\+959\d{8,9}$/.test(formatted);
};

// ==================== SESSION MANAGEMENT ====================

/**
 * Get or create WhatsApp session
 * @param {string} phoneNumber - Phone number
 * @returns {Promise<Object>}
 */
const getOrCreateSession = async (phoneNumber) => {
  const formattedPhone = formatPhoneNumber(phoneNumber);
  
  let session = await WhatsAppSession.findOne({ phoneNumber: formattedPhone });
  
  if (!session) {
    session = await WhatsAppSession.create({
      phoneNumber: formattedPhone,
      status: SESSION_STATUS.ACTIVE,
    });
    
    // Try to link to existing user
    const user = await User.findOne({
      $or: [
        { phone: formattedPhone },
        { 'referrerProfile.whatsappNumber': formattedPhone },
      ],
    });
    
    if (user) {
      await session.linkToUser(user._id, user.role === 'referrer' ? USER_TYPE.REFERRER : USER_TYPE.JOB_SEEKER);
    }
  }
  
  // Extend session expiry on activity
  await session.extendExpiry(config.sessionExpiryHours);
  
  return session;
};

/**
 * Update session context
 * @param {string} phoneNumber - Phone number
 * @param {string} contextType - Context type
 * @param {Object} data - Context data
 */
const updateSessionContext = async (phoneNumber, contextType, data = {}) => {
  const formattedPhone = formatPhoneNumber(phoneNumber);
  const session = await getOrCreateSession(formattedPhone);
  await session.setContext(contextType, data);
  return session;
};

// ==================== MESSAGE SENDING ====================

/**
 * Send text message
 * @param {string} to - Recipient phone number
 * @param {string} text - Message text
 * @param {Object} options - Additional options
 * @returns {Promise<Object>}
 */
const sendTextMessage = async (to, text, options = {}) => {
  const formattedPhone = formatPhoneNumber(to);
  const session = await getOrCreateSession(formattedPhone);
  
  // Check opt-in
  if (!session.optIn.status && !options.skipOptInCheck) {
    throw new Error('User has not opted in to WhatsApp messages');
  }
  
  // Check rate limit
  if (session.isRateLimited()) {
    throw new Error('Rate limit exceeded');
  }
  
  const messageData = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formattedPhone.replace('+', ''),
    type: 'text',
    text: {
      body: text,
      preview_url: options.previewUrl || false,
    },
  };
  
  // Create message record
  const message = await WhatsAppMessage.createOutbound({
    sessionId: session._id,
    phoneNumber: formattedPhone,
    userId: session.userId,
    type: MESSAGE_TYPE.TEXT,
    content: { text },
    relatedTo: options.relatedTo,
  });
  
  try {
    if (!config.mockMode) {
      const response = await makeWABARequest(
        `${config.wabaPhoneNumberId}/messages`,
        'POST',
        messageData
      );
      
      message.wabaMessageId = response.messages?.[0]?.id;
      message.apiResponse = response;
      await message.updateStatus(MESSAGE_STATUS.SENT);
    } else {
      mockLog('Text Message', { to: formattedPhone, text });
      message.wabaMessageId = `mock_${Date.now()}`;
      await message.updateStatus(MESSAGE_STATUS.SENT);
      
      // Simulate delivery in mock mode
      setTimeout(async () => {
        await message.updateStatus(MESSAGE_STATUS.DELIVERED);
      }, 1000);
    }
    
    await session.updateLastContact('outbound');
    await session.incrementRateLimit();
    
    return {
      success: true,
      messageId: message._id,
      wabaMessageId: message.wabaMessageId,
    };
  } catch (error) {
    await message.updateStatus(MESSAGE_STATUS.FAILED, {
      errorCode: error.code,
      errorMessage: error.message,
    });
    throw error;
  }
};

/**
 * Send template message
 * @param {string} to - Recipient phone number
 * @param {string} templateName - Template name
 * @param {Object} params - Template parameters
 * @param {Object} options - Additional options
 * @returns {Promise<Object>}
 */
const sendTemplateMessage = async (to, templateName, params = {}, options = {}) => {
  const formattedPhone = formatPhoneNumber(to);
  const language = options.language || config.defaultLanguage;
  
  const session = await getOrCreateSession(formattedPhone);
  
  // Find template
  const template = await WhatsAppTemplate.findByName(templateName);
  if (!template) {
    throw new Error(`Template not found: ${templateName}`);
  }
  
  if (!template.isUsable() && !config.mockMode) {
    throw new Error(`Template is not approved or active: ${templateName}`);
  }
  
  const messageData = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formattedPhone.replace('+', ''),
    type: 'template',
    template: {
      name: template.wabaTemplateId || template.name,
      language: {
        code: language === 'my' ? 'my_MM' : 'en_US',
      },
      components: params.components || [],
    },
  };
  
  // Create message record
  const message = await WhatsAppMessage.createOutbound({
    sessionId: session._id,
    phoneNumber: formattedPhone,
    userId: session.userId,
    type: MESSAGE_TYPE.TEMPLATE,
    content: {
      templateName: template.name,
      templateLanguage: language,
      templateParams: params,
    },
    relatedTo: options.relatedTo,
  });
  
  try {
    if (!config.mockMode) {
      const response = await makeWABARequest(
        `${config.wabaPhoneNumberId}/messages`,
        'POST',
        messageData
      );
      
      message.wabaMessageId = response.messages?.[0]?.id;
      message.apiResponse = response;
      await message.updateStatus(MESSAGE_STATUS.SENT);
    } else {
      mockLog('Template Message', { to: formattedPhone, templateName, params });
      message.wabaMessageId = `mock_${Date.now()}`;
      await message.updateStatus(MESSAGE_STATUS.SENT);
      
      setTimeout(async () => {
        await message.updateStatus(MESSAGE_STATUS.DELIVERED);
      }, 1000);
    }
    
    // Update template stats
    await template.updateStats('sent');
    await session.updateLastContact('outbound');
    
    return {
      success: true,
      messageId: message._id,
      wabaMessageId: message.wabaMessageId,
    };
  } catch (error) {
    await message.updateStatus(MESSAGE_STATUS.FAILED, {
      errorCode: error.code,
      errorMessage: error.message,
    });
    throw error;
  }
};

/**
 * Send interactive message with buttons
 * @param {string} to - Recipient phone number
 * @param {Object} interactiveData - Interactive message data
 * @param {Object} options - Additional options
 * @returns {Promise<Object>}
 */
const sendInteractiveMessage = async (to, interactiveData, options = {}) => {
  const formattedPhone = formatPhoneNumber(to);
  const session = await getOrCreateSession(formattedPhone);
  
  if (!session.optIn.status && !options.skipOptInCheck) {
    throw new Error('User has not opted in to WhatsApp messages');
  }
  
  const messageData = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formattedPhone.replace('+', ''),
    type: 'interactive',
    interactive: interactiveData,
  };
  
  const message = await WhatsAppMessage.createOutbound({
    sessionId: session._id,
    phoneNumber: formattedPhone,
    userId: session.userId,
    type: MESSAGE_TYPE.INTERACTIVE,
    content: { interactive: interactiveData },
    relatedTo: options.relatedTo,
  });
  
  try {
    if (!config.mockMode) {
      const response = await makeWABARequest(
        `${config.wabaPhoneNumberId}/messages`,
        'POST',
        messageData
      );
      
      message.wabaMessageId = response.messages?.[0]?.id;
      await message.updateStatus(MESSAGE_STATUS.SENT);
    } else {
      mockLog('Interactive Message', { to: formattedPhone, interactiveData });
      message.wabaMessageId = `mock_${Date.now()}`;
      await message.updateStatus(MESSAGE_STATUS.SENT);
    }
    
    await session.updateLastContact('outbound');
    
    return {
      success: true,
      messageId: message._id,
      wabaMessageId: message.wabaMessageId,
    };
  } catch (error) {
    await message.updateStatus(MESSAGE_STATUS.FAILED, {
      errorCode: error.code,
      errorMessage: error.message,
    });
    throw error;
  }
};

// ==================== NOTIFICATION SENDING ====================

/**
 * Send welcome message
 * @param {string} phoneNumber - Phone number
 * @param {string} name - User name
 * @param {string} language - Language code
 */
const sendWelcomeMessage = async (phoneNumber, name, language = 'my') => {
  const text = language === 'my'
    ? `မင်္ဂလာပါ ${name}! TRM Referral Platform သို့ ကြိုဆိုပါသည်။ အကူအညီလိုအပ်ပါက "help" ဟုရိုက်ထည့်ပါ။`
    : `Welcome ${name} to TRM Referral Platform! Type "help" for assistance.`;
  
  return sendTextMessage(phoneNumber, text);
};

/**
 * Send referral status update
 * @param {string} phoneNumber - Phone number
 * @param {Object} referral - Referral data
 * @param {string} status - New status
 * @param {string} language - Language code
 */
const sendReferralStatusUpdate = async (phoneNumber, referral, status, language = 'my') => {
  const statusTranslations = {
    my: {
      submitted: 'တင်သွင်းပြီး',
      under_review: 'စစ်ဆေးနေသည်',
      shortlisted: 'ရွေးချယ်ခံရသည်',
      interview_scheduled: 'အင်တာဗျူးရက်သတ်မှတ်ပြီး',
      hired: 'ခန့်အပ်ခံရသည်',
      rejected: 'ငြင်းပယ်ခံရသည်',
      paid: 'ငွေပေးချေပြီး',
    },
    en: {
      submitted: 'Submitted',
      under_review: 'Under Review',
      shortlisted: 'Shortlisted',
      interview_scheduled: 'Interview Scheduled',
      hired: 'Hired',
      rejected: 'Rejected',
      paid: 'Paid',
    },
  };
  
  const statusText = statusTranslations[language]?.[status] || status;
  
  const text = language === 'my'
    ? `သင့်လွှဲပြောင်းခြင်း ${referral.code} ၏ အခြေအနေ - ${statusText}။ အသေးစိတ်ကြည့်ရှုရန်: ${process.env.FRONTEND_URL}/referrals/${referral.code}`
    : `Your referral ${referral.code} status: ${statusText}. View details: ${process.env.FRONTEND_URL}/referrals/${referral.code}`;
  
  return sendTextMessage(phoneNumber, text, {
    relatedTo: { entityType: 'referral', entityId: referral._id },
  });
};

/**
 * Send referral hired notification
 * @param {string} phoneNumber - Phone number
 * @param {Object} referral - Referral data
 * @param {string} language - Language code
 */
const sendReferralHiredNotification = async (phoneNumber, referral, language = 'my') => {
  const bonusAmount = referral.referrerPayout?.toLocaleString() || '0';
  
  const text = language === 'my'
    ? `🎉 ဂုဏ်ယူပါသည်! သင့်လွှဲပြောင်းခြင်း ${referral.code} သည် အောင်မြင်စွာ ခန့်အပ်ခံရပါသည်။ ဘောနပ်ငွေ ${bonusAmount} MMK ကို ရယူနိုင်ပါသည်။`
    : `🎉 Congratulations! Your referral ${referral.code} has been hired successfully. You can claim your bonus of ${bonusAmount} MMK.`;
  
  // Add interactive buttons for claiming payout
  const interactiveData = {
    type: 'button',
    body: { text },
    action: {
      buttons: [
        {
          type: 'reply',
          reply: {
            id: `claim_payout_${referral._id}`,
            title: language === 'my' ? 'ငွေထုတ်ယူရန်' : 'Claim Payout',
          },
        },
        {
          type: 'reply',
          reply: {
            id: `view_details_${referral._id}`,
            title: language === 'my' ? 'အသေးစိတ်' : 'View Details',
          },
        },
      ],
    },
  };
  
  return sendInteractiveMessage(phoneNumber, interactiveData, {
    relatedTo: { entityType: 'referral', entityId: referral._id },
  });
};

/**
 * Send payout notification
 * @param {string} phoneNumber - Phone number
 * @param {Object} payout - Payout data
 * @param {string} status - Payout status
 * @param {string} language - Language code
 */
const sendPayoutNotification = async (phoneNumber, payout, status, language = 'my') => {
  const amount = payout.amount?.toLocaleString() || '0';
  
  let text;
  if (status === 'paid') {
    text = language === 'my'
      ? `✅ သင့်ငွေထုတ်ယူခြင်း ${amount} MMK အား အောင်မြင်စွာ ပေးအပ်ပြီးပါပြီ။ လက်ခံသူ: ${payout.paymentMethod || 'N/A'}`
      : `✅ Your payout of ${amount} MMK has been successfully processed to ${payout.paymentMethod || 'your account'}.`;
  } else if (status === 'approved') {
    text = language === 'my'
      ? `သင့်ငွေထုတ်ယူခြင်း ${amount} MMK အား အတည်ပြုပြီးပါပြီ။ ၁-၂ ရက်အတွင်း ပေးအပ်ပါမည်။`
      : `Your payout request of ${amount} MMK has been approved. You will receive it within 1-2 business days.`;
  } else {
    text = language === 'my'
      ? `သင့်ငွေထုတ်ယူခြင်း ${amount} MMK ၏ အခြေအနေ - ${status}`
      : `Your payout of ${amount} MMK status: ${status}`;
  }
  
  return sendTextMessage(phoneNumber, text, {
    relatedTo: { entityType: 'payout', entityId: payout._id },
  });
};

/**
 * Send company approval request
 * @param {string} phoneNumber - Company admin phone
 * @param {Object} referral - Referral data
 * @param {string} language - Language code
 */
const sendCompanyApprovalRequest = async (phoneNumber, referral, language = 'my') => {
  const text = language === 'my'
    ? `သင့်လုပ်ငန်းသို့ လူနာတစ်ဦး၏ လွှဲပြောင်းခြင်း ရောက်ရှိပါသည်။ အတည်ပြုရန် သို့မဟုတ် ငြင်းပယ်ရန် အောက်ပါခလုတ်များကို နှိပ်ပါ။ Referral Code: ${referral.code}`
    : `A new referral has been submitted to your company. Please approve or reject. Referral Code: ${referral.code}`;
  
  const interactiveData = {
    type: 'button',
    body: { text },
    action: {
      buttons: [
        {
          type: 'reply',
          reply: {
            id: `approve_ref_${referral._id}`,
            title: language === 'my' ? 'အတည်ပြုရန်' : 'Approve',
          },
        },
        {
          type: 'reply',
          reply: {
            id: `reject_ref_${referral._id}`,
            title: language === 'my' ? 'ငြင်းပယ်ရန်' : 'Reject',
          },
        },
        {
          type: 'reply',
          reply: {
            id: `view_ref_${referral._id}`,
            title: language === 'my' ? 'ကြည့်ရှုရန်' : 'View',
          },
        },
      ],
    },
  };
  
  return sendInteractiveMessage(phoneNumber, interactiveData, {
    relatedTo: { entityType: 'referral', entityId: referral._id },
  });
};

/**
 * Send job alert
 * @param {string} phoneNumber - Phone number
 * @param {Object} job - Job data
 * @param {string} language - Language code
 */
const sendJobAlert = async (phoneNumber, job, language = 'my') => {
  const bonus = job.referralBonus?.toLocaleString() || '0';
  
  const text = language === 'my'
    ? `📢 အလုပ်အကိုင် အသစ်: ${job.title} at ${job.companyName}\nဘောနပ်: ${bonus} MMK\nအသေးစိတ်: ${process.env.FRONTEND_URL}/jobs/${job._id}`
    : `📢 New Job: ${job.title} at ${job.companyName}\nBonus: ${bonus} MMK\nDetails: ${process.env.FRONTEND_URL}/jobs/${job._id}`;
  
  const interactiveData = {
    type: 'button',
    body: { text },
    action: {
      buttons: [
        {
          type: 'reply',
          reply: {
            id: `refer_job_${job._id}`,
            title: language === 'my' ? 'လွှဲပြောင်းရန်' : 'Refer Now',
          },
        },
      ],
    },
  };
  
  return sendInteractiveMessage(phoneNumber, interactiveData, {
    relatedTo: { entityType: 'job', entityId: job._id },
  });
};

// ==================== WEBHOOK HANDLING ====================

/**
 * Verify webhook signature
 * @param {string} signature - X-Hub-Signature-256 header
 * @param {string} body - Raw request body
 * @returns {boolean}
 */
const verifyWebhookSignature = (signature, body) => {
  if (config.mockMode) return true;
  
  const expectedSignature = crypto
    .createHmac('sha256', config.webhookVerifyToken)
    .update(body, 'utf8')
    .digest('hex');
  
  return signature === `sha256=${expectedSignature}`;
};

/**
 * Process incoming webhook
 * @param {Object} payload - Webhook payload
 * @returns {Promise<Array>}
 */
const processWebhook = async (payload) => {
  const processed = [];
  
  if (!payload.entry) {
    return processed;
  }
  
  for (const entry of payload.entry) {
    for (const change of entry.changes || []) {
      if (change.value?.messages) {
        for (const message of change.value.messages) {
          const result = await processIncomingMessage(message, change.value);
          processed.push(result);
        }
      }
      
      // Handle message status updates
      if (change.value?.statuses) {
        for (const status of change.value.statuses) {
          await processMessageStatus(status);
        }
      }
    }
  }
  
  return processed;
};

/**
 * Process incoming message
 * @param {Object} message - Message data
 * @param {Object} context - Webhook context
 * @returns {Promise<Object>}
 */
const processIncomingMessage = async (message, context) => {
  const phoneNumber = formatPhoneNumber(message.from);
  const session = await getOrCreateSession(phoneNumber);
  
  // Determine message type and content
  let messageType = MESSAGE_TYPE.TEXT;
  let content = {};
  
  if (message.type === 'text') {
    messageType = MESSAGE_TYPE.TEXT;
    content.text = message.text?.body;
  } else if (message.type === 'interactive') {
    if (message.interactive?.type === 'button_reply') {
      messageType = MESSAGE_TYPE.BUTTON_REPLY;
      content.interactive = {
        type: 'button_reply',
        buttonReply: message.interactive.button_reply,
      };
    } else if (message.interactive?.type === 'list_reply') {
      messageType = MESSAGE_TYPE.LIST_REPLY;
      content.interactive = {
        type: 'list_reply',
        listReply: message.interactive.list_reply,
      };
    }
  } else if (message.type === 'image') {
    messageType = MESSAGE_TYPE.IMAGE;
    content.mediaId = message.image?.id;
    content.mimeType = message.image?.mime_type;
    content.caption = message.image?.caption;
  } else if (message.type === 'document') {
    messageType = MESSAGE_TYPE.DOCUMENT;
    content.mediaId = message.document?.id;
    content.fileName = message.document?.filename;
    content.mimeType = message.document?.mime_type;
    content.caption = message.document?.caption;
  }
  
  // Create message record
  const msg = await WhatsAppMessage.createInbound({
    wabaMessageId: message.id,
    sessionId: session._id,
    phoneNumber,
    userId: session.userId,
    type: messageType,
    content,
    context: message.context,
    webhookData: { message, context },
  });
  
  await session.updateLastContact('inbound');
  
  // Process the message intent
  await processMessageIntent(msg, session);
  
  return {
    messageId: msg._id,
    type: messageType,
    processed: true,
  };
};

/**
 * Process message status update
 * @param {Object} status - Status data
 */
const processMessageStatus = async (status) => {
  const message = await WhatsAppMessage.findOne({ wabaMessageId: status.id });
  
  if (!message) {
    console.warn(`Message not found for status update: ${status.id}`);
    return;
  }
  
  const statusMap = {
    sent: MESSAGE_STATUS.SENT,
    delivered: MESSAGE_STATUS.DELIVERED,
    read: MESSAGE_STATUS.READ,
    failed: MESSAGE_STATUS.FAILED,
  };
  
  const newStatus = statusMap[status.status];
  if (newStatus) {
    await message.updateStatus(newStatus, {
      errorCode: status.errors?.[0]?.code,
      errorMessage: status.errors?.[0]?.message,
    });
    
    // Update template stats if applicable
    if (message.type === MESSAGE_TYPE.TEMPLATE && newStatus === MESSAGE_STATUS.DELIVERED) {
      const template = await WhatsAppTemplate.findOne({ name: message.content.templateName });
      if (template) {
        await template.updateStats('delivered');
      }
    }
  }
};

/**
 * Process message intent and take action
 * @param {Object} message - WhatsAppMessage document
 * @param {Object} session - WhatsAppSession document
 */
const processMessageIntent = async (message, session) => {
  const text = message.content.text?.toLowerCase().trim() || '';
  const interactive = message.content.interactive;
  
  let intent = 'unknown';
  let actionTaken = null;
  let response = null;
  
  // Handle button replies
  if (interactive?.type === 'button_reply') {
    const buttonId = interactive.buttonReply.id;
    
    if (buttonId.startsWith('approve_ref_')) {
      const referralId = buttonId.replace('approve_ref_', '');
      actionTaken = await handleReferralApproval(referralId, session, true);
      intent = 'referral_approve';
    } else if (buttonId.startsWith('reject_ref_')) {
      const referralId = buttonId.replace('reject_ref_', '');
      actionTaken = await handleReferralApproval(referralId, session, false);
      intent = 'referral_reject';
    } else if (buttonId.startsWith('claim_payout_')) {
      const referralId = buttonId.replace('claim_payout_', '');
      actionTaken = await handlePayoutClaim(referralId, session);
      intent = 'payout_claim';
    } else if (buttonId.startsWith('view_details_') || buttonId.startsWith('view_ref_')) {
      const referralId = buttonId.replace(/^(view_details_|view_ref_)/, '');
      actionTaken = await handleViewReferral(referralId, session);
      intent = 'view_referral';
    } else if (buttonId.startsWith('refer_job_')) {
      const jobId = buttonId.replace('refer_job_', '');
      actionTaken = await handleJobReferral(jobId, session);
      intent = 'job_refer';
    }
  }
  
  // Handle text commands
  if (!actionTaken) {
    if (text === 'help' || text === 'မြန်မာ' || text === 'help') {
      response = session.language === 'my'
        ? `TRM Referral Platform - အကူအညီ\n\n1. "status" - သင့်လွှဲပြောင်းခြင်းများကြည့်ရန်\n2. "balance" - ငွေပေးချေမှုကြည့်ရန်\n3. "jobs" - အလုပ်အကိုင်များကြည့်ရန်\n4. "opt out" - မက်ဆေ့ချ်များရပ်ဆိုင်းရန်`
        : `TRM Referral Platform - Help\n\n1. "status" - View your referrals\n2. "balance" - Check payouts\n3. "jobs" - Browse jobs\n4. "opt out" - Stop messages`;
      intent = 'help';
    } else if (text === 'status' || text === 'အခြေအနေ') {
      actionTaken = await handleStatusCheck(session);
      intent = 'status_check';
    } else if (text === 'balance' || text === 'ငွေ') {
      actionTaken = await handleBalanceCheck(session);
      intent = 'balance_check';
    } else if (text === 'jobs' || text === 'အလုပ်') {
      actionTaken = await handleJobList(session);
      intent = 'job_list';
    } else if (text === 'opt out' || text === 'ရပ်ဆိုင်း') {
      await session.optOutUser();
      response = session.language === 'my'
        ? 'မက်ဆေ့ချ်များရပ်ဆိုင်းပြီးပါပြီ။ ပြန်လည်ချိတ်ဆက်လိုပါက "opt in" ဟုရိုက်ထည့်ပါ။'
        : 'You have opted out. Type "opt in" to re-subscribe.';
      intent = 'opt_out';
    } else if (text === 'opt in' || text === 'ချိတ်ဆက်ရန်') {
      await session.optInUser('whatsapp');
      response = session.language === 'my'
        ? 'မက်ဆေ့ချ်များပြန်လည်ချိတ်ဆက်ပြီးပါပြီ!'
        : 'You have opted back in!';
      intent = 'opt_in';
    } else if (text.startsWith('ref ') || text.startsWith('referral ')) {
      const code = text.split(' ')[1];
      actionTaken = await handleReferralLookup(code, session);
      intent = 'referral_lookup';
    }
  }
  
  // Send response if provided
  if (response) {
    await sendTextMessage(session.phoneNumber, response);
  }
  
  // Mark message as processed
  await message.markProcessed({
    processedBy: 'whatsapp_service',
    actionTaken,
    intent,
    confidence: 1.0,
  });
};

// ==================== ACTION HANDLERS ====================

/**
 * Handle referral approval/rejection
 */
const handleReferralApproval = async (referralId, session, approved) => {
  try {
    const ReferralModel = (await import('../models/Referral.js')).default;
    const referral = await ReferralModel.findById(referralId);
    
    if (!referral) {
      await sendTextMessage(
        session.phoneNumber,
        session.language === 'my' ? 'လွှဲပြောင်းခြင်းမတွေ့ပါ' : 'Referral not found'
      );
      return 'referral_not_found';
    }
    
    if (approved) {
      await referral.updateStatus('under_review', {
        changedBy: session.userId,
        changedByType: 'recruiter',
        notes: 'Approved via WhatsApp',
      });
      
      await sendTextMessage(
        session.phoneNumber,
        session.language === 'my'
          ? `လွှဲပြောင်းခြင်း ${referral.code} အား အတည်ပြုပြီးပါပြီ။`
          : `Referral ${referral.code} has been approved.`
      );
      
      // Notify referrer
      const referrer = await User.findById(referral.referrerId);
      if (referrer?.referrerProfile?.whatsappNumber) {
        await sendReferralStatusUpdate(
          referrer.referrerProfile.whatsappNumber,
          referral,
          'under_review',
          referrer.referrerProfile?.language || 'my'
        );
      }
      
      return 'referral_approved';
    } else {
      await referral.reject(session.userId, 'Rejected via WhatsApp');
      
      await sendTextMessage(
        session.phoneNumber,
        session.language === 'my'
          ? `လွှဲပြောင်းခြင်း ${referral.code} အား ငြင်းပယ်ပြီးပါပြီ။`
          : `Referral ${referral.code} has been rejected.`
      );
      
      return 'referral_rejected';
    }
  } catch (error) {
    console.error('Error handling referral approval:', error);
    await sendTextMessage(
      session.phoneNumber,
      session.language === 'my' ? 'အမှားတစ်ခုဖြစ်သွားပါသည်' : 'An error occurred'
    );
    return 'error';
  }
};

/**
 * Handle payout claim
 */
const handlePayoutClaim = async (referralId, session) => {
  try {
    const ReferralModel = (await import('../models/Referral.js')).default;
    const referral = await ReferralModel.findById(referralId);
    
    if (!referral || referral.status !== 'hired') {
      await sendTextMessage(
        session.phoneNumber,
        session.language === 'my'
          ? 'ဤလွှဲပြောင်းခြင်းအတွက် ငွေထုတ်ယူ၍မရပါ'
          : 'Cannot claim payout for this referral'
      );
      return 'payout_claim_failed';
    }
    
    await referral.requestPayout();
    
    await sendTextMessage(
      session.phoneNumber,
      session.language === 'my'
        ? `ငွေထုတ်ယူခြင်း တောင်းဆိုပြီးပါပြီ။ ဘောနပ် ${referral.referrerPayout?.toLocaleString()} MMK`
        : `Payout requested for bonus ${referral.referrerPayout?.toLocaleString()} MMK`
    );
    
    return 'payout_claimed';
  } catch (error) {
    console.error('Error handling payout claim:', error);
    await sendTextMessage(
      session.phoneNumber,
      session.language === 'my' ? 'အမှားတစ်ခုဖြစ်သွားပါသည်' : 'An error occurred'
    );
    return 'error';
  }
};

/**
 * Handle view referral
 */
const handleViewReferral = async (referralId, session) => {
  try {
    const ReferralModel = (await import('../models/Referral.js')).default;
    const referral = await ReferralModel.findById(referralId)
      .populate('jobId', 'title companyId')
      .populate('jobId.companyId', 'name');
    
    if (!referral) {
      await sendTextMessage(
        session.phoneNumber,
        session.language === 'my' ? 'လွှဲပြောင်းခြင်းမတွေ့ပါ' : 'Referral not found'
      );
      return 'referral_not_found';
    }
    
    const job = referral.jobId;
    const text = session.language === 'my'
      ? `လွှဲပြောင်းခြင်း: ${referral.code}\nအလုပ်: ${job?.title || 'N/A'}\nကုမ္ပဏီ: ${job?.companyId?.name || 'N/A'}\nအခြေအနေ: ${referral.status}\nဘောနပ်: ${referral.referrerPayout?.toLocaleString()} MMK`
      : `Referral: ${referral.code}\nJob: ${job?.title || 'N/A'}\nCompany: ${job?.companyId?.name || 'N/A'}\nStatus: ${referral.status}\nBonus: ${referral.referrerPayout?.toLocaleString()} MMK`;
    
    await sendTextMessage(session.phoneNumber, text);
    return 'referral_viewed';
  } catch (error) {
    console.error('Error viewing referral:', error);
    return 'error';
  }
};

/**
 * Handle job referral
 */
const handleJobReferral = async (jobId, session) => {
  await sendTextMessage(
    session.phoneNumber,
    session.language === 'my'
      ? `အလုပ်အကိုင္းအားလွှဲပြောင်းရန် ဤလင့်ခ်ကို အသုံးပြုပါ: ${process.env.FRONTEND_URL}/jobs/${jobId}/refer`
      : `To refer someone to this job, use this link: ${process.env.FRONTEND_URL}/jobs/${jobId}/refer`
  );
  return 'job_refer_link_sent';
};

/**
 * Handle status check
 */
const handleStatusCheck = async (session) => {
  if (!session.userId) {
    await sendTextMessage(
      session.phoneNumber,
      session.language === 'my'
        ? 'သင့်အကောင့်မတွေ့ပါ။ ဝဘ်ဆိုက်တွင်အရင်မှတ်ပုံတင်ပါ။'
        : 'Account not found. Please register on the website first.'
    );
    return 'user_not_found';
  }
  
  try {
    const ReferralModel = (await import('../models/Referral.js')).default;
    const stats = await ReferralModel.getReferrerStats(session.userId);
    
    const text = session.language === 'my'
      ? `သင့်လွှဲပြောင်းခြင်းများ:\nစုစုပေါင်း: ${stats.totalReferrals}\nခန့်အပ်ပြီး: ${stats.hired}\nစောင့်ဆိုင်းဆဲ: ${stats.pending}\nငွေပေးချေပြီး: ${stats.totalEarnings?.toLocaleString()} MMK`
      : `Your Referrals:\nTotal: ${stats.totalReferrals}\nHired: ${stats.hired}\nPending: ${stats.pending}\nEarned: ${stats.totalEarnings?.toLocaleString()} MMK`;
    
    await sendTextMessage(session.phoneNumber, text);
    return 'status_sent';
  } catch (error) {
    console.error('Error checking status:', error);
    return 'error';
  }
};

/**
 * Handle balance check
 */
const handleBalanceCheck = async (session) => {
  if (!session.userId) {
    await sendTextMessage(
      session.phoneNumber,
      session.language === 'my'
        ? 'သင့်အကောင့်မတွေ့ပါ။ ဝဘ်ဆိုက်တွင်အရင်မှတ်ပုံတင်ပါ။'
        : 'Account not found. Please register on the website first.'
    );
    return 'user_not_found';
  }
  
  try {
    const user = await User.findById(session.userId).select('referrerProfile');
    const profile = user?.referrerProfile;
    
    const text = session.language === 'my'
      ? `သင့်ငွေစာရင်း:\nရရှိနိုင်: ${profile?.availableBalance?.toLocaleString() || 0} MMK\nစောင့်ဆိုင်းဆဲ: ${profile?.pendingBalance?.toLocaleString() || 0} MMK\nစုစုပေါင်း: ${profile?.totalEarnings?.toLocaleString() || 0} MMK`
      : `Your Balance:\nAvailable: ${profile?.availableBalance?.toLocaleString() || 0} MMK\nPending: ${profile?.pendingBalance?.toLocaleString() || 0} MMK\nTotal Earned: ${profile?.totalEarnings?.toLocaleString() || 0} MMK`;
    
    await sendTextMessage(session.phoneNumber, text);
    return 'balance_sent';
  } catch (error) {
    console.error('Error checking balance:', error);
    return 'error';
  }
};

/**
 * Handle job list
 */
const handleJobList = async (session) => {
  try {
    const JobModel = (await import('../models/Job.js')).default;
    const jobs = await JobModel.find({ status: 'active' })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('companyId', 'name')
      .select('title referralBonus companyId');
    
    if (jobs.length === 0) {
      await sendTextMessage(
        session.phoneNumber,
        session.language === 'my' ? 'လက်ရှိအလုပ်အကိုင်များမရှိပါ' : 'No active jobs at the moment'
      );
      return 'no_jobs';
    }
    
    let text = session.language === 'my' ? 'လက်ရှိအလုပ်အကိုင်များ:\n\n' : 'Current Jobs:\n\n';
    
    jobs.forEach((job, index) => {
      text += `${index + 1}. ${job.title}\n   ${job.companyId?.name || 'N/A'} - ${job.referralBonus?.toLocaleString()} MMK\n   ${process.env.FRONTEND_URL}/jobs/${job._id}\n\n`;
    });
    
    await sendTextMessage(session.phoneNumber, text);
    return 'job_list_sent';
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return 'error';
  }
};

/**
 * Handle referral lookup
 */
const handleReferralLookup = async (code, session) => {
  try {
    const ReferralModel = (await import('../models/Referral.js')).default;
    const referral = await ReferralModel.findByCode(code);
    
    if (!referral) {
      await sendTextMessage(
        session.phoneNumber,
        session.language === 'my' ? 'လွှဲပြောင်းခြင်းကုဒ်မတွေ့ပါ' : 'Referral code not found'
      );
      return 'referral_not_found';
    }
    
    return await handleViewReferral(referral._id, session);
  } catch (error) {
    console.error('Error looking up referral:', error);
    return 'error';
  }
};

// ==================== TEMPLATE MANAGEMENT ====================

/**
 * Sync templates with WhatsApp Business API
 */
const syncTemplates = async () => {
  if (config.mockMode) {
    mockLog('Sync Templates', { message: 'Mock mode - no API call' });
    return { mock: true };
  }
  
  try {
    const response = await makeWABARequest(
      `${config.wabaBusinessAccountId}/message_templates`
    );
    
    // Update local templates with API status
    for (const template of response.data || []) {
      await WhatsAppTemplate.upsert({
        name: template.name,
        wabaTemplateId: template.id,
        status: template.status.toLowerCase(),
        category: template.category,
        qualityRating: template.quality_rating,
        metaResponse: template,
      });
    }
    
    return {
      success: true,
      synced: response.data?.length || 0,
    };
  } catch (error) {
    console.error('Error syncing templates:', error);
    throw error;
  }
};

/**
 * Create template on WhatsApp Business API
 */
const createTemplate = async (templateData) => {
  if (config.mockMode) {
    mockLog('Create Template', templateData);
    return { mock: true, id: `mock_${Date.now()}` };
  }
  
  try {
    const response = await makeWABARequest(
      `${config.wabaBusinessAccountId}/message_templates`,
      'POST',
      templateData
    );
    
    return {
      success: true,
      templateId: response.id,
    };
  } catch (error) {
    console.error('Error creating template:', error);
    throw error;
  }
};

// ==================== STATISTICS ====================

/**
 * Get WhatsApp service statistics
 */
const getStatistics = async () => {
  const [sessionStats, messageStats, templateStats] = await Promise.all([
    WhatsAppSession.getStats(),
    WhatsAppMessage.getStats(),
    WhatsAppTemplate.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          approved: {
            $sum: { $cond: [{ $eq: ['$status', TEMPLATE_STATUS.APPROVED] }, 1, 0] },
          },
          active: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] },
          },
        },
      },
    ]),
  ]);
  
  return {
    sessions: sessionStats[0] || {},
    messages: messageStats,
    templates: templateStats[0] || {},
    config: {
      mockMode: config.mockMode,
      defaultLanguage: config.defaultLanguage,
    },
  };
};

// ==================== EXPORTS ====================

module.exports = {
  sendTextMessage,
  sendTemplateMessage,
  sendInteractiveMessage,
  sendWelcomeMessage,
  sendReferralStatusUpdate,
  sendReferralHiredNotification,
  sendPayoutNotification,
  sendCompanyApprovalRequest,
  sendJobAlert,
  processWebhook,
  verifyWebhookSignature,
  getOrCreateSession,
  updateSessionContext,
  formatPhoneNumber,
  validateMyanmarPhone,
  syncTemplates,
  createTemplate,
  getStatistics,
  config,
  PLATFORM,
};
