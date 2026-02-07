/**
 * Notification Service
 * Centralized service for sending notifications across multiple channels
 * Handles in-app, email, SMS, and push notifications
 */

const Notification = require('../models/Notification.js');
const {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITY,
  NOTIFICATION_CHANNELS
} = require('../models/Notification.js');
const { User } = require('../models/index.js');

// Import notification templates
const { 
  getEmailTemplate, 
  getInAppTemplate,
  getSMSTemplate 
} = require('../utils/notificationTemplates.js');

/**
 * Send notification to a user
 * @param {Object} options - Notification options
 * @returns {Promise<Object>}
 */
const sendNotification = async (options) => {
  const {
    userId,
    type,
    title,
    message,
    priority = NOTIFICATION_PRIORITY.NORMAL,
    channels = [NOTIFICATION_CHANNELS.IN_APP],
    relatedEntity = null,
    actions = [],
    deepLink = null,
    metadata = {},
    data = {}, // Template data
  } = options;

  try {
    // Get user details for email/SMS
    const user = await User.findById(userId).select('email phone name notificationPreferences');
    
    if (!user) {
      throw new Error('User not found');
    }

    // Get templates based on notification type
    const templates = getNotificationTemplates(type, data);

    // Create in-app notification
    const notification = await Notification.createNotification({
      userId,
      type,
      title: title || templates.inApp.title,
      message: message || templates.inApp.message,
      priority,
      channels,
      relatedEntity,
      actions: actions.length > 0 ? actions : templates.inApp.actions,
      deepLink: deepLink || templates.inApp.deepLink,
      metadata: { ...metadata, ...data },
    });

    // Send to additional channels
    const deliveryResults = {
      inApp: true,
      email: false,
      sms: false,
      push: false,
    };

    // Send email if requested and user has email enabled
    if (channels.includes(NOTIFICATION_CHANNELS.EMAIL) && 
        user.notificationPreferences?.email !== false) {
      deliveryResults.email = await sendEmail(user, type, templates.email, data);
      if (deliveryResults.email) {
        await notification.updateEmailStatus('sent');
      }
    }

    // Send SMS if requested and user has phone
    if (channels.includes(NOTIFICATION_CHANNELS.SMS) && user.phone) {
      deliveryResults.sms = await sendSMS(user, templates.sms);
    }

    // Send push notification if requested
    if (channels.includes(NOTIFICATION_CHANNELS.PUSH)) {
      deliveryResults.push = await sendPush(user, type, templates.push);
    }

    return {
      success: true,
      notification,
      delivery: deliveryResults,
    };
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};

/**
 * Send notification to multiple users
 * @param {Array} userIds - Array of user IDs
 * @param {Object} options - Notification options
 * @returns {Promise<Object>}
 */
const sendBulkNotification = async (userIds, options) => {
  const results = {
    successful: [],
    failed: [],
  };

  await Promise.all(
    userIds.map(async (userId) => {
      try {
        const result = await sendNotification({ ...options, userId });
        results.successful.push({ userId, notificationId: result.notification._id });
      } catch (error) {
        results.failed.push({ userId, error: error.message });
      }
    })
  );

  return results;
};

/**
 * Send referral-related notification
 * @param {string} userId - User ID
 * @param {string} referralId - Referral ID
 * @param {string} status - Referral status
 * @param {Object} data - Additional data
 * @returns {Promise<Object>}
 */
const sendReferralNotification = async (userId, referralId, status, data = {}) => {
  let type, priority, channels;

  switch (status) {
    case 'submitted':
      type = NOTIFICATION_TYPES.REFERRAL_SUBMITTED;
      priority = NOTIFICATION_PRIORITY.NORMAL;
      channels = [NOTIFICATION_CHANNELS.IN_APP];
      break;
    case 'hired':
      type = NOTIFICATION_TYPES.REFERRAL_HIRED;
      priority = NOTIFICATION_PRIORITY.HIGH;
      channels = [NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.EMAIL];
      break;
    case 'paid':
      type = NOTIFICATION_TYPES.REFERRAL_PAID;
      priority = NOTIFICATION_PRIORITY.HIGH;
      channels = [NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.EMAIL];
      break;
    default:
      type = NOTIFICATION_TYPES.REFERRAL_STATUS_CHANGED;
      priority = NOTIFICATION_PRIORITY.NORMAL;
      channels = [NOTIFICATION_CHANNELS.IN_APP];
  }

  return sendNotification({
    userId,
    type,
    priority,
    channels,
    relatedEntity: { type: 'referral', id: referralId },
    data: { ...data, referralId, status },
  });
};

/**
 * Send payout-related notification
 * @param {string} userId - User ID
 * @param {string} payoutId - Payout ID
 * @param {string} status - Payout status
 * @param {Object} data - Additional data
 * @returns {Promise<Object>}
 */
const sendPayoutNotification = async (userId, payoutId, status, data = {}) => {
  let type, priority, channels;

  switch (status) {
    case 'requested':
      type = NOTIFICATION_TYPES.PAYOUT_REQUESTED;
      priority = NOTIFICATION_PRIORITY.NORMAL;
      channels = [NOTIFICATION_CHANNELS.IN_APP];
      break;
    case 'approved':
      type = NOTIFICATION_TYPES.PAYOUT_APPROVED;
      priority = NOTIFICATION_PRIORITY.NORMAL;
      channels = [NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.EMAIL];
      break;
    case 'processing':
      type = NOTIFICATION_TYPES.PAYOUT_PROCESSING;
      priority = NOTIFICATION_PRIORITY.NORMAL;
      channels = [NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.EMAIL];
      break;
    case 'paid':
      type = NOTIFICATION_TYPES.PAYOUT_PAID;
      priority = NOTIFICATION_PRIORITY.HIGH;
      channels = [NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.EMAIL, NOTIFICATION_CHANNELS.SMS];
      break;
    case 'rejected':
      type = NOTIFICATION_TYPES.PAYOUT_REJECTED;
      priority = NOTIFICATION_PRIORITY.HIGH;
      channels = [NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.EMAIL];
      break;
    case 'cancelled':
      type = NOTIFICATION_TYPES.PAYOUT_CANCELLED;
      priority = NOTIFICATION_PRIORITY.NORMAL;
      channels = [NOTIFICATION_CHANNELS.IN_APP];
      break;
    default:
      return null;
  }

  return sendNotification({
    userId,
    type,
    priority,
    channels,
    relatedEntity: { type: 'payout', id: payoutId },
    data: { ...data, payoutId, status },
  });
};

/**
 * Send subscription-related notification
 * @param {string} userId - User ID
 * @param {string} subscriptionId - Subscription ID
 * @param {string} event - Subscription event
 * @param {Object} data - Additional data
 * @returns {Promise<Object>}
 */
const sendSubscriptionNotification = async (userId, subscriptionId, event, data = {}) => {
  let type, priority, channels;

  switch (event) {
    case 'created':
      type = NOTIFICATION_TYPES.SUBSCRIPTION_CREATED;
      priority = NOTIFICATION_PRIORITY.NORMAL;
      channels = [NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.EMAIL];
      break;
    case 'renewed':
      type = NOTIFICATION_TYPES.SUBSCRIPTION_RENEWED;
      priority = NOTIFICATION_PRIORITY.NORMAL;
      channels = [NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.EMAIL];
      break;
    case 'expiring':
      type = NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRING;
      priority = NOTIFICATION_PRIORITY.HIGH;
      channels = [NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.EMAIL];
      break;
    case 'expired':
      type = NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRED;
      priority = NOTIFICATION_PRIORITY.URGENT;
      channels = [NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.EMAIL];
      break;
    case 'cancelled':
      type = NOTIFICATION_TYPES.SUBSCRIPTION_CANCELLED;
      priority = NOTIFICATION_PRIORITY.NORMAL;
      channels = [NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.EMAIL];
      break;
    default:
      return null;
  }

  return sendNotification({
    userId,
    type,
    priority,
    channels,
    relatedEntity: { type: 'subscription', id: subscriptionId },
    data: { ...data, subscriptionId, event },
  });
};

/**
 * Send admin notification
 * @param {string} type - Notification type
 * @param {Object} data - Notification data
 * @returns {Promise<Object>}
 */
const sendAdminNotification = async (type, data = {}) => {
  // Get all admin users
  const admins = await User.find({ role: 'platform_admin', status: 'active' }).select('_id');
  
  if (admins.length === 0) {
    console.warn('No admin users found for notification');
    return { sent: 0 };
  }

  const results = await sendBulkNotification(
    admins.map(admin => admin._id),
    {
      type,
      priority: NOTIFICATION_PRIORITY.HIGH,
      channels: [NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.EMAIL],
      data,
    }
  );

  return { sent: results.successful.length, failed: results.failed.length };
};

/**
 * Send welcome notification to new user
 * @param {string} userId - User ID
 * @param {Object} data - User data
 * @returns {Promise<Object>}
 */
const sendWelcomeNotification = async (userId, data = {}) => {
  return sendNotification({
    userId,
    type: NOTIFICATION_TYPES.WELCOME,
    priority: NOTIFICATION_PRIORITY.NORMAL,
    channels: [NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.EMAIL],
    data,
  });
};

/**
 * Send KYC verification notification
 * @param {string} userId - User ID
 * @param {boolean} approved - Whether KYC was approved
 * @param {string} reason - Rejection reason (if applicable)
 * @returns {Promise<Object>}
 */
const sendKYCNotification = async (userId, approved, reason = '') => {
  const type = approved ? NOTIFICATION_TYPES.KYC_VERIFIED : NOTIFICATION_TYPES.KYC_REJECTED;
  
  return sendNotification({
    userId,
    type,
    priority: NOTIFICATION_PRIORITY.HIGH,
    channels: [NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.EMAIL],
    data: { approved, reason },
  });
};

// ==================== PRIVATE HELPER FUNCTIONS ====================

/**
 * Get notification templates for a type
 * @param {string} type - Notification type
 * @param {Object} data - Template data
 * @returns {Object}
 */
function getNotificationTemplates(type, data) {
  return {
    inApp: getInAppTemplate(type, data),
    email: getEmailTemplate(type, data),
    sms: getSMSTemplate(type, data),
    push: getInAppTemplate(type, data), // Push uses same format as in-app
  };
}

/**
 * Send email notification
 * @param {Object} user - User object
 * @param {string} type - Notification type
 * @param {Object} template - Email template
 * @param {Object} data - Template data
 * @returns {Promise<boolean>}
 */
async function sendEmail(user, type, template, data) {
  try {
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    // For now, just log the email
    console.log('Sending email to:', user.email);
    console.log('Subject:', template.subject);
    console.log('Body:', template.html);
    
    // Placeholder for actual email sending
    // await emailService.send({
    //   to: user.email,
    //   subject: template.subject,
    //   html: template.html,
    //   text: template.text,
    // });
    
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Send SMS notification
 * @param {Object} user - User object
 * @param {Object} template - SMS template
 * @returns {Promise<boolean>}
 */
async function sendSMS(user, template) {
  try {
    if (!user.phone) {
      return false;
    }
    
    // TODO: Integrate with SMS service (Twilio, etc.)
    console.log('Sending SMS to:', user.phone);
    console.log('Message:', template.message);
    
    // Placeholder for actual SMS sending
    // await smsService.send({
    //   to: user.phone,
    //   message: template.message,
    // });
    
    return true;
  } catch (error) {
    console.error('Error sending SMS:', error);
    return false;
  }
}

/**
 * Send push notification
 * @param {Object} user - User object
 * @param {string} type - Notification type
 * @param {Object} template - Push template
 * @returns {Promise<boolean>}
 */
async function sendPush(user, type, template) {
  try {
    // TODO: Integrate with push notification service (Firebase, OneSignal, etc.)
    console.log('Sending push notification to user:', user._id);
    console.log('Title:', template.title);
    console.log('Body:', template.body);
    
    // Placeholder for actual push sending
    // await pushService.send({
    //   userId: user._id,
    //   title: template.title,
    //   body: template.body,
    //   data: template.data,
    // });
    
    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

// Export service functions
// Re-export constants from Notification model for convenience

module.exports = {
  sendNotification,
  sendBulkNotification,
  sendReferralNotification,
  sendPayoutNotification,
  sendSubscriptionNotification,
  sendAdminNotification,
  sendWelcomeNotification,
  sendKYCNotification,
};
