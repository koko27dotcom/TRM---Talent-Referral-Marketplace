/**
 * Messaging Service
 * Unified messaging service supporting Viber, Telegram, and WhatsApp
 * Primary focus on Viber and Telegram for Myanmar market (99% user base)
 */

const axios = require('axios');
const crypto = require('crypto');
const { User, Referral, Job } = require('../models/index.js');

// Platform types
const PLATFORM = {
  VIBER: 'viber',
  TELEGRAM: 'telegram',
  WHATSAPP: 'whatsapp',
};

// Configuration
const config = {
  // Viber API
  viberAuthToken: process.env.VIBER_AUTH_TOKEN,
  viberWebhookUrl: process.env.VIBER_WEBHOOK_URL,
  
  // Telegram Bot API
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  telegramWebhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
  
  // WhatsApp (kept for backward compatibility)
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  
  // Settings
  mockMode: process.env.MESSAGING_MOCK_MODE === 'true' || 
            (!process.env.VIBER_AUTH_TOKEN && !process.env.TELEGRAM_BOT_TOKEN),
  defaultLanguage: process.env.MESSAGING_DEFAULT_LANGUAGE || 'my',
  rateLimitPerMinute: parseInt(process.env.MESSAGING_RATE_LIMIT) || 30,
};

// Logger for mock mode
const mockLog = (platform, action, data) => {
  if (config.mockMode) {
    console.log(`[${platform.toUpperCase()} MOCK] ${action}:`, JSON.stringify(data, null, 2));
  }
};

// ==================== VIBER API ====================

/**
 * Send message via Viber API
 */
const sendViberMessage = async (userId, message, options = {}) => {
  if (config.mockMode) {
    mockLog('viber', 'Send Message', { userId, message });
    return { success: true, mock: true, messageId: `viber_mock_${Date.now()}` };
  }

  try {
    const response = await axios.post('https://chatapi.viber.com/pa/send_message', {
      auth_token: config.viberAuthToken,
      receiver: userId,
      type: 'text',
      text: message,
      sender: {
        name: 'TRM Referral Platform',
      },
    });

    return {
      success: true,
      messageId: response.data.message_token,
    };
  } catch (error) {
    console.error('Viber API Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.status_message || 'Viber API request failed');
  }
};

/**
 * Send Viber keyboard message (interactive buttons)
 */
const sendViberKeyboard = async (userId, text, buttons, options = {}) => {
  if (config.mockMode) {
    mockLog('viber', 'Send Keyboard', { userId, text, buttons });
    return { success: true, mock: true, messageId: `viber_mock_${Date.now()}` };
  }

  const keyboard = {
    Type: 'keyboard',
    DefaultHeight: false,
    Buttons: buttons.map((btn, index) => ({
      ActionType: 'reply',
      ActionBody: btn.action || `btn_${index}`,
      Text: btn.text,
      TextSize: 'regular',
    })),
  };

  try {
    const response = await axios.post('https://chatapi.viber.com/pa/send_message', {
      auth_token: config.viberAuthToken,
      receiver: userId,
      type: 'text',
      text: text,
      keyboard: keyboard,
      sender: {
        name: 'TRM Referral Platform',
      },
    });

    return {
      success: true,
      messageId: response.data.message_token,
    };
  } catch (error) {
    console.error('Viber Keyboard Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.status_message || 'Viber API request failed');
  }
};

/**
 * Broadcast message to multiple Viber users
 */
const broadcastViberMessage = async (userIds, message) => {
  if (config.mockMode) {
    mockLog('viber', 'Broadcast', { userCount: userIds.length, message });
    return { success: true, mock: true, sent: userIds.length };
  }

  try {
    const response = await axios.post('https://chatapi.viber.com/pa/broadcast_message', {
      auth_token: config.viberAuthToken,
      receiver: userIds,
      type: 'text',
      text: message,
      sender: {
        name: 'TRM Referral Platform',
      },
    });

    return {
      success: true,
      sent: userIds.length,
    };
  } catch (error) {
    console.error('Viber Broadcast Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.status_message || 'Viber broadcast failed');
  }
};

/**
 * Set Viber webhook
 */
const setViberWebhook = async (url) => {
  if (config.mockMode) {
    mockLog('viber', 'Set Webhook', { url });
    return { success: true, mock: true };
  }

  try {
    const response = await axios.post('https://chatapi.viber.com/pa/set_webhook', {
      auth_token: config.viberAuthToken,
      url: url || config.viberWebhookUrl,
      event_types: ['delivered', 'seen', 'failed', 'subscribed', 'unsubscribed', 'conversation_started'],
    });

    return {
      success: true,
      status: response.data.status,
    };
  } catch (error) {
    console.error('Viber Webhook Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.status_message || 'Failed to set Viber webhook');
  }
};

// ==================== TELEGRAM API ====================

/**
 * Send message via Telegram Bot API
 */
const sendTelegramMessage = async (chatId, text, options = {}) => {
  if (config.mockMode) {
    mockLog('telegram', 'Send Message', { chatId, text });
    return { success: true, mock: true, messageId: `telegram_mock_${Date.now()}` };
  }

  try {
    const response = await axios.post(`https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`, {
      chat_id: chatId,
      text: text,
      parse_mode: options.parseMode || 'HTML',
      disable_web_page_preview: options.disablePreview || false,
      reply_markup: options.replyMarkup || undefined,
    });

    return {
      success: true,
      messageId: response.data.result.message_id,
    };
  } catch (error) {
    console.error('Telegram API Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.description || 'Telegram API request failed');
  }
};

/**
 * Send Telegram message with inline keyboard
 */
const sendTelegramKeyboard = async (chatId, text, buttons, options = {}) => {
  if (config.mockMode) {
    mockLog('telegram', 'Send Keyboard', { chatId, text, buttons });
    return { success: true, mock: true, messageId: `telegram_mock_${Date.now()}` };
  }

  const inlineKeyboard = {
    inline_keyboard: buttons.map(row => 
      row.map(btn => ({
        text: btn.text,
        callback_data: btn.callbackData || btn.action,
        url: btn.url || undefined,
      }))
    ),
  };

  try {
    const response = await axios.post(`https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`, {
      chat_id: chatId,
      text: text,
      parse_mode: options.parseMode || 'HTML',
      reply_markup: JSON.stringify(inlineKeyboard),
    });

    return {
      success: true,
      messageId: response.data.result.message_id,
    };
  } catch (error) {
    console.error('Telegram Keyboard Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.description || 'Telegram API request failed');
  }
};

/**
 * Send Telegram broadcast
 */
const broadcastTelegramMessage = async (chatIds, text) => {
  const results = { successful: [], failed: [] };

  for (const chatId of chatIds) {
    try {
      const result = await sendTelegramMessage(chatId, text);
      results.successful.push({ chatId, messageId: result.messageId });
    } catch (error) {
      results.failed.push({ chatId, error: error.message });
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
};

/**
 * Set Telegram webhook
 */
const setTelegramWebhook = async (url) => {
  if (config.mockMode) {
    mockLog('telegram', 'Set Webhook', { url });
    return { success: true, mock: true };
  }

  try {
    const response = await axios.post(`https://api.telegram.org/bot${config.telegramBotToken}/setWebhook`, {
      url: url || config.telegramWebhookUrl,
      allowed_updates: ['message', 'callback_query', 'inline_query'],
    });

    return {
      success: response.data.ok,
      description: response.data.description,
    };
  } catch (error) {
    console.error('Telegram Webhook Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.description || 'Failed to set Telegram webhook');
  }
};

/**
 * Delete Telegram webhook
 */
const deleteTelegramWebhook = async () => {
  if (config.mockMode) {
    mockLog('telegram', 'Delete Webhook', {});
    return { success: true, mock: true };
  }

  try {
    const response = await axios.post(`https://api.telegram.org/bot${config.telegramBotToken}/deleteWebhook`);
    return {
      success: response.data.ok,
      description: response.data.description,
    };
  } catch (error) {
    console.error('Telegram Delete Webhook Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.description || 'Failed to delete Telegram webhook');
  }
};

// ==================== UNIFIED MESSAGING ====================

/**
 * Send message to user on their preferred platform
 */
const sendMessage = async (userId, message, options = {}) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const platform = user.messagingPreferences?.preferredPlatform || PLATFORM.VIBER;
  const platformUserId = user.messagingPreferences?.platformUserId;

  if (!platformUserId) {
    throw new Error('User has no messaging platform connected');
  }

  switch (platform) {
    case PLATFORM.VIBER:
      return sendViberMessage(platformUserId, message, options);
    case PLATFORM.TELEGRAM:
      return sendTelegramMessage(platformUserId, message, options);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
};

/**
 * Send referral status update
 */
const sendReferralStatusUpdate = async (userId, referral, status, language = 'my') => {
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
    ? `📋 သင့်လွှဲပြောင်းခြင်း အခြေအနေ\n\nကုဒ်: ${referral.code}\nအခြေအနေ: ${statusText}\n\nအသေးစိတ်ကြည့်ရှုရန် ဝဘ်ဆိုက်သို့ ဝင်ရောက်ပါ။`
    : `📋 Your Referral Status\n\nCode: ${referral.code}\nStatus: ${statusText}\n\nVisit the website for details.`;

  return sendMessage(userId, text);
};

/**
 * Send payout notification
 */
const sendPayoutNotification = async (userId, payout, status, language = 'my') => {
  const amount = payout.amount?.toLocaleString() || '0';

  let text;
  if (status === 'paid') {
    text = language === 'my'
      ? `💰 ငွေထုတ်ယူခြင်း ပြီးစီး!\n\nပမာဏ: ${amount} MMK\nအခြေအနေ: ပေးအပ်ပြီးပါပြီ\n\nသင့်အကောင့်သို့ ငွေလွှဲပြီးပါပြီ။`
      : `💰 Payout Completed!\n\nAmount: ${amount} MMK\nStatus: Paid\n\nFunds have been transferred to your account.`;
  } else if (status === 'approved') {
    text = language === 'my'
      ? `⏳ ငွေထုတ်ယူခြင်း အတည်ပြုပြီး\n\nပမာဏ: ${amount} MMK\nအခြေအနေ: အတည်ပြုပြီး\n\n၁-၂ ရက်အတွင်း ပေးအပ်ပါမည်။`
      : `⏳ Payout Approved\n\nAmount: ${amount} MMK\nStatus: Approved\n\nWill be processed within 1-2 business days.`;
  } else {
    text = language === 'my'
      ? `📝 ငွေထုတ်ယူခြင်း အခြေအနေ\n\nပမာဏ: ${amount} MMK\nအခြေအနေ: ${status}`
      : `📝 Payout Status\n\nAmount: ${amount} MMK\nStatus: ${status}`;
  }

  return sendMessage(userId, text);
};

/**
 * Send welcome message
 */
const sendWelcomeMessage = async (userId, name, language = 'my') => {
  const text = language === 'my'
    ? `🎉 ကြိုဆိုပါသည် ${name}!\n\nTRM Referral Platform သို့ ချိတ်ဆက်ပြီးပါပြီ။\n\n📚 လွှဲပြောင်းခြင်းနည်းလမ်းများလေ့လာရန် /academy ဟုရိုက်ထည့်ပါ\n❓ အကူအညီလိုအပ်ပါက /help ဟုရိုက်ထည့်ပါ`
    : `🎉 Welcome ${name}!\n\nYou're now connected to TRM Referral Platform.\n\n📚 Type /academy to learn referral strategies\n❓ Type /help for assistance`;

  return sendMessage(userId, text);
};

/**
 * Send job alert
 */
const sendJobAlert = async (userId, job, language = 'my') => {
  const bonus = job.referralBonus?.toLocaleString() || '0';

  const text = language === 'my'
    ? `📢 အလုပ်အကိုင် အသစ်!\n\n${job.title}\n${job.companyName || 'ကုမ္ပဏီ'}\n\n💰 ဘောနပ်: ${bonus} MMK\n\nလွှဲပြောင်းရန် ဝဘ်ဆိုက်သို့ ဝင်ရောက်ပါ။`
    : `📢 New Job Alert!\n\n${job.title}\n${job.companyName || 'Company'}\n\n💰 Bonus: ${bonus} MMK\n\nVisit the website to refer.`;

  return sendMessage(userId, text);
};

// ==================== WEBHOOK HANDLERS ====================

/**
 * Process Viber webhook
 */
const processViberWebhook = async (payload) => {
  const { event, message, user, context, message_token } = payload;

  console.log('Viber webhook received:', { event, user: user?.id });

  // Handle different event types
  switch (event) {
    case 'message':
      return await processViberMessage(message, user);
    case 'subscribed':
      return await handleViberSubscribed(user);
    case 'unsubscribed':
      return await handleViberUnsubscribed(user);
    case 'conversation_started':
      return await handleViberConversationStarted(user, context);
    default:
      return { handled: false, event };
  }
};

/**
 * Process incoming Viber message
 */
const processViberMessage = async (message, user) => {
  const text = message.text?.toLowerCase().trim() || '';
  const userId = user.id;

  // Find or create user
  let dbUser = await User.findOne({ 'messagingPreferences.platformUserId': userId });

  // Handle commands
  if (text === '/start' || text === 'hello' || text === 'ဟယ်လို') {
    if (dbUser) {
      await sendViberMessage(userId, `ကြိုဆိုပါသည် ${dbUser.name}! TRM Referral Platform သို့ ချိတ်ဆက်ပြီးပါပြီ။`);
    } else {
      await sendViberMessage(userId, 'ကြိုဆိုပါသည်! ဝဘ်ဆိုက်တွင်အရင်မှတ်ပုံတင်ပြီး Viber ချိတ်ဆက်ပါ။');
    }
    return { handled: true, command: 'start' };
  }

  if (text === '/help' || text === 'help' || text === 'အကူအညီ') {
    const helpText = `📱 TRM Referral Platform - အကူအညီ\n\n/status - သင့်လွှဲပြောင်းခြင်းများကြည့်ရန်\n/balance - ငွေပေးချေမှုကြည့်ရန်\n/academy - လွှဲပြောင်းခြင်းနည်းလမ်းများလေ့လာရန်\n/jobs - အလုပ်အကိုင်များကြည့်ရန်\n/contact - ဆက်သွယ်ရန်`;
    await sendViberMessage(userId, helpText);
    return { handled: true, command: 'help' };
  }

  if (text === '/academy' || text === 'academy' || text === 'အကယ်ဒမီ') {
    await sendViberMessage(userId, '📚 Referral Academy သို့ ဝင်ရောက်ရန်: https://trm.referral/academy\n\nသင်ခန်းစာများ:\n• လွှဲပြောင်းခြင်း အခြေခံ\n• ကောင်းမွန်သောလွှဲပြောင်းခြင်း\n• ငွေပေးချေမှုစနစ်');
    return { handled: true, command: 'academy' };
  }

  if (text === '/status' || text === 'status' || text === 'အခြေအနေ') {
    if (!dbUser) {
      await sendViberMessage(userId, 'သင့်အကောင့်မတွေ့ပါ။ ဝဘ်ဆိုက်တွင်အရင်မှတ်ပုံတင်ပါ။');
      return { handled: true, command: 'status' };
    }
    
    const Referral = require('../models/Referral.js');
    const stats = await Referral.getReferrerStats(dbUser._id);
    
    const statusText = `📊 သင့်လွှဲပြောင်းခြင်းများ:\n\nစုစုပေါင်း: ${stats.totalReferrals}\nခန့်အပ်ပြီး: ${stats.hired}\nစောင့်ဆိုင်းဆဲ: ${stats.pending}\nငွေပေးချေပြီး: ${stats.totalEarnings?.toLocaleString() || 0} MMK`;
    await sendViberMessage(userId, statusText);
    return { handled: true, command: 'status' };
  }

  if (text === '/balance' || text === 'balance' || text === 'ငွေ') {
    if (!dbUser) {
      await sendViberMessage(userId, 'သင့်အကောင့်မတွေ့ပါ။ ဝဘ်ဆိုက်တွင်အရင်မှတ်ပုံတင်ပါ။');
      return { handled: true, command: 'balance' };
    }
    
    const profile = dbUser.referrerProfile;
    const balanceText = `💰 သင့်ငွေစာရင်း:\n\nရရှိနိုင်: ${profile?.availableBalance?.toLocaleString() || 0} MMK\nစောင့်ဆိုင်းဆဲ: ${profile?.pendingBalance?.toLocaleString() || 0} MMK\nစုစုပေါင်း: ${profile?.totalEarnings?.toLocaleString() || 0} MMK`;
    await sendViberMessage(userId, balanceText);
    return { handled: true, command: 'balance' };
  }

  if (text === '/jobs' || text === 'jobs' || text === 'အလုပ်') {
    const Job = require('../models/Job.js');
    const jobs = await Job.find({ status: 'active' })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('companyId', 'name');
    
    if (jobs.length === 0) {
      await sendViberMessage(userId, 'လက်ရှိအလုပ်အကိုင်များမရှိပါ');
      return { handled: true, command: 'jobs' };
    }
    
    let jobsText = '📋 လက်ရှိအလုပ်အကိုင်များ:\n\n';
    jobs.forEach((job, index) => {
      jobsText += `${index + 1}. ${job.title}\n   ${job.companyId?.name || 'N/A'} - ${job.referralBonus?.toLocaleString()} MMK\n\n`;
    });
    jobsText += 'အသေးစိတ်ကြည့်ရှုရန်: https://trm.referral/jobs';
    
    await sendViberMessage(userId, jobsText);
    return { handled: true, command: 'jobs' };
  }

  // Default response
  await sendViberMessage(userId, 'နားမလည်ပါ။ အကူအညီလိုအပ်ပါက /help ဟုရိုက်ထည့်ပါ။');
  return { handled: true, command: 'unknown' };
};

/**
 * Handle Viber subscription
 */
const handleViberSubscribed = async (user) => {
  console.log('Viber user subscribed:', user.id);
  return { handled: true, event: 'subscribed' };
};

/**
 * Handle Viber unsubscription
 */
const handleViberUnsubscribed = async (user) => {
  console.log('Viber user unsubscribed:', user.id);
  
  // Update user preferences
  await User.updateOne(
    { 'messagingPreferences.platformUserId': user.id },
    { $set: { 'messagingPreferences.optedIn': false } }
  );
  
  return { handled: true, event: 'unsubscribed' };
};

/**
 * Handle Viber conversation started
 */
const handleViberConversationStarted = async (user, context) => {
  console.log('Viber conversation started:', user.id);
  
  // Send welcome message
  await sendViberMessage(user.id, 'ကြိုဆိုပါသည် TRM Referral Platform သို့! အကူအညီလိုအပ်ပါက /help ဟုရိုက်ထည့်ပါ။');
  
  return { handled: true, event: 'conversation_started' };
};

/**
 * Process Telegram webhook
 */
const processTelegramWebhook = async (payload) => {
  const { message, callback_query, inline_query } = payload;

  console.log('Telegram webhook received:', { 
    message: message?.text, 
    callback: callback_query?.data 
  });

  if (message) {
    return await processTelegramMessage(message);
  }

  if (callback_query) {
    return await processTelegramCallback(callback_query);
  }

  return { handled: false };
};

/**
 * Process Telegram message
 */
const processTelegramMessage = async (message) => {
  const chatId = message.chat.id;
  const text = message.text?.toLowerCase().trim() || '';
  const username = message.from?.username;
  const firstName = message.from?.first_name;

  // Find or create user
  let dbUser = await User.findOne({ 'messagingPreferences.platformUserId': chatId.toString() });

  // Handle commands
  if (text === '/start') {
    const welcomeText = dbUser 
      ? `🎉 ကြိုဆိုပါသည် ${dbUser.name}!\n\nTRM Referral Platform မှ ချိတ်ဆက်ပြီးပါပြီ။\n\n📚 /academy - လွှဲပြောင်းခြင်းနည်းလမ်းများ\n📊 /status - သင့်လွှဲပြောင်းခြင်းများ\n💰 /balance - ငွေစာရင်း\n📋 /jobs - အလုပ်အကိုင်များ`
      : `🎉 ကြိုဆိုပါသည်!\n\nTRM Referral Platform မှ ချိတ်ဆက်ပြီးပါပြီ။\n\nဝဘ်ဆိုဒ်တွင် အကောင့်ဖွင့်ပြီး Telegram ချိတ်ဆက်ပါ: https://trm.referral/register`;
    
    await sendTelegramMessage(chatId, welcomeText);
    return { handled: true, command: 'start' };
  }

  if (text === '/help') {
    const helpText = `📱 <b>TRM Referral Platform - အကူအညီ</b>\n\n📚 /academy - လွှဲပြောင်းခြင်းနည်းလမ်းများ\n📊 /status - သင့်လွှဲပြောင်းခြင်းများ\n💰 /balance - ငွေစာရင်း\n📋 /jobs - အလုပ်အကိုင်များ\n📞 /contact - ဆက်သွယ်ရန်\n❓ /faq - အမေးအဖြေများ`;
    await sendTelegramMessage(chatId, helpText, { parseMode: 'HTML' });
    return { handled: true, command: 'help' };
  }

  if (text === '/academy') {
    const academyText = `📚 <b>Referral Academy</b>\n\nသင်ခန်းစာများ:\n\n1️⃣ <b>လွှဲပြောင်းခြင်း အခြေခံ</b>\n   • ကောင်းမွန်သောလွှဲပြောင်းခြင်း၏ အရည်အသွေးများ\n   • ကုမ္ပဏီများနှင့် ဆက်ဆံရေး\n\n2️⃣ <b>အကျိုးအမြတ် Maximization</b>\n   • ဘောနပ် တွက်ချက်ခြင်း\n   • ငွေထုတ်ယူခြင်း လမ်းညွှန်\n\n3️⃣ <b>အောင်မြင်မှုနည်းလမ်းများ</b>\n   • ထိရောက်သောလွှဲပြောင်းခြင်း\n   • ကွန်ရက်တည်ဆောက်ခြင်း\n\n<a href="https://trm.referral/academy">အသေးစိတ်ဖတ်ရှုရန်</a>`;
    
    await sendTelegramMessage(chatId, academyText, { parseMode: 'HTML' });
    return { handled: true, command: 'academy' };
  }

  if (text === '/status') {
    if (!dbUser) {
      await sendTelegramMessage(chatId, '⚠️ သင့်အကောင့်မတွေ့ပါ။ ဝဘ်ဆိုက်တွင်အရင်မှတ်ပုံတင်ပါ။');
      return { handled: true, command: 'status' };
    }
    
    const Referral = require('../models/Referral.js');
    const stats = await Referral.getReferrerStats(dbUser._id);
    
    const statusText = `📊 <b>သင့်လွှဲပြောင်းခြင်းများ</b>\n\n📋 စုစုပေါင်း: ${stats.totalReferrals}\n✅ ခန့်အပ်ပြီး: ${stats.hired}\n⏳ စောင့်ဆိုင်းဆဲ: ${stats.pending}\n💰 ငွေပေးချေပြီး: ${stats.totalEarnings?.toLocaleString() || 0} MMK`;
    
    await sendTelegramMessage(chatId, statusText, { parseMode: 'HTML' });
    return { handled: true, command: 'status' };
  }

  if (text === '/balance') {
    if (!dbUser) {
      await sendTelegramMessage(chatId, '⚠️ သင့်အကောင့်မတွေ့ပါ။ ဝဘ်ဆိုက်တွင်အရင်မှတ်ပုံတင်ပါ။');
      return { handled: true, command: 'balance' };
    }
    
    const profile = dbUser.referrerProfile;
    const balanceText = `💰 <b>သင့်ငွေစာရင်း</b>\n\n✅ ရရှိနိုင်: ${profile?.availableBalance?.toLocaleString() || 0} MMK\n⏳ စောင့်ဆိုင်းဆဲ: ${profile?.pendingBalance?.toLocaleString() || 0} MMK\n📊 စုစုပေါင်း: ${profile?.totalEarnings?.toLocaleString() || 0} MMK\n\n<a href="https://trm.referral/payouts">ငွေထုတ်ယူရန်</a>`;
    
    await sendTelegramMessage(chatId, balanceText, { parseMode: 'HTML' });
    return { handled: true, command: 'balance' };
  }

  if (text === '/jobs') {
    const Job = require('../models/Job.js');
    const jobs = await Job.find({ status: 'active' })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('companyId', 'name');
    
    if (jobs.length === 0) {
      await sendTelegramMessage(chatId, '📭 လက်ရှိအလုပ်အကိုင်များမရှိပါ');
      return { handled: true, command: 'jobs' };
    }
    
    let jobsText = '📋 <b>လက်ရှိအလုပ်အကိုင်များ</b>\n\n';
    jobs.forEach((job, index) => {
      jobsText += `${index + 1}. <b>${job.title}</b>\n   🏢 ${job.companyId?.name || 'N/A'}\n   💰 ${job.referralBonus?.toLocaleString()} MMK\n\n`;
    });
    jobsText += '<a href="https://trm.referral/jobs">အားလုံးကြည့်ရှုရန်</a>';
    
    await sendTelegramMessage(chatId, jobsText, { parseMode: 'HTML' });
    return { handled: true, command: 'jobs' };
  }

  if (text === '/contact') {
    await sendTelegramMessage(chatId, '📞 <b>ဆက်သွယ်ရန်</b>\n\n📧 Email: support@trm.referral\n📱 Phone: +95 9 XXX XXX XXX\n\nအကူအညီလိုအပ်ပါက အထက်ပါလိပ်စာများသို့ ဆက်သွယ်နိုင်ပါသည်။');
    return { handled: true, command: 'contact' };
  }

  // Default response
  await sendTelegramMessage(chatId, '❓ နားမလည်ပါ။ အကူအညီလိုအပ်ပါက /help ဟုရိုက်ထည့်ပါ။');
  return { handled: true, command: 'unknown' };
};

/**
 * Process Telegram callback query
 */
const processTelegramCallback = async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  // Answer the callback query to remove loading state
  if (!config.mockMode) {
    await axios.post(`https://api.telegram.org/bot${config.telegramBotToken}/answerCallbackQuery`, {
      callback_query_id: callbackQuery.id,
    });
  }

  // Handle different callback actions
  if (data.startsWith('claim_payout_')) {
    const referralId = data.replace('claim_payout_', '');
    await sendTelegramMessage(chatId, `ငွေထုတ်ယူခြင်း တောင်းဆိုနေပါသည်... ဝဘ်ဆိုက်သို့ ဝင်ရောက်ပါ။`);
    return { handled: true, action: 'claim_payout' };
  }

  if (data.startsWith('view_referral_')) {
    const referralId = data.replace('view_referral_', '');
    await sendTelegramMessage(chatId, `လွှဲပြောင်းခြင်း အသေးစိတ်ကြည့်ရှုရန်: https://trm.referral/referrals/${referralId}`);
    return { handled: true, action: 'view_referral' };
  }

  return { handled: false };
};

// ==================== EXPORTS ====================

module.exports = {
  // Platform constants
  PLATFORM,
  
  // Viber methods
  sendViberMessage,
  sendViberKeyboard,
  broadcastViberMessage,
  setViberWebhook,
  processViberWebhook,
  
  // Telegram methods
  sendTelegramMessage,
  sendTelegramKeyboard,
  broadcastTelegramMessage,
  setTelegramWebhook,
  deleteTelegramWebhook,
  processTelegramWebhook,
  
  // Unified methods
  sendMessage,
  sendReferralStatusUpdate,
  sendPayoutNotification,
  sendWelcomeMessage,
  sendJobAlert,
  
  // Config
  config,
};
