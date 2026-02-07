/**
 * Email Marketing Service
 * Comprehensive service for email campaigns, templates, sequences, and delivery
 * Integrates with SendGrid (or mock mode for development)
 */

const sgMail = require('@sendgrid/mail');
const Queue = require('bull');
const crypto = require('crypto');
const { User, EmailCampaign, EmailTemplate, EmailSequence, UserSegment, EmailLog } = require('../models/index.js');

// Configure SendGrid API Key
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@trmjobs.com';
const SENDGRID_FROM_NAME = process.env.SENDGRID_FROM_NAME || 'TRM Jobs';
const IS_MOCK_MODE = !SENDGRID_API_KEY || process.env.EMAIL_MOCK_MODE === 'true';

// Initialize SendGrid if not in mock mode
if (!IS_MOCK_MODE && SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

// Email Queue for background processing
const emailQueue = new Queue('email-sending', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

// Rate limiting configuration
const RATE_LIMIT = {
  maxPerMinute: 100,
  currentCount: 0,
  resetTime: Date.now() + 60000,
};

/**
 * Check and update rate limit
 * @returns {boolean} Whether we can send more emails
 */
const checkRateLimit = () => {
  const now = Date.now();
  
  // Reset counter if minute has passed
  if (now >= RATE_LIMIT.resetTime) {
    RATE_LIMIT.currentCount = 0;
    RATE_LIMIT.resetTime = now + 60000;
  }
  
  if (RATE_LIMIT.currentCount >= RATE_LIMIT.maxPerMinute) {
    return false;
  }
  
  RATE_LIMIT.currentCount++;
  return true;
};

/**
 * Generate unique message ID
 * @returns {string} Unique message ID
 */
const generateMessageId = () => {
  return `trm-${crypto.randomUUID()}`;
};

/**
 * Generate tracking pixel URL
 * @param {string} messageId - Email message ID
 * @returns {string} Tracking URL
 */
const getTrackingPixelUrl = (messageId) => {
  const baseUrl = process.env.API_URL || 'https://api.trmjobs.com';
  return `${baseUrl}/api/email/track/open/${messageId}`;
};

/**
 * Generate click tracking URL
 * @param {string} messageId - Email message ID
 * @param {string} originalUrl - Original URL
 * @param {string} linkId - Link identifier
 * @returns {string} Tracking URL
 */
const getClickTrackingUrl = (messageId, originalUrl, linkId) => {
  const baseUrl = process.env.API_URL || 'https://api.trmjobs.com';
  const encodedUrl = encodeURIComponent(originalUrl);
  return `${baseUrl}/api/email/track/click/${messageId}?url=${encodedUrl}&lid=${linkId}`;
};

/**
 * Generate unsubscribe URL
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @param {string} campaignId - Campaign ID (optional)
 * @returns {string} Unsubscribe URL
 */
const getUnsubscribeUrl = (userId, email, campaignId = null) => {
  const baseUrl = process.env.APP_URL || 'https://trmjobs.com';
  const token = generateUnsubscribeToken(userId, email);
  let url = `${baseUrl}/unsubscribe?token=${token}&uid=${userId}`;
  if (campaignId) {
    url += `&cid=${campaignId}`;
  }
  return url;
};

/**
 * Generate unsubscribe token
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @returns {string} Unsubscribe token
 */
const generateUnsubscribeToken = (userId, email) => {
  const secret = process.env.JWT_SECRET || 'trm-secret-key';
  return crypto
    .createHmac('sha256', secret)
    .update(`${userId}:${email}`)
    .digest('hex');
};

/**
 * Verify unsubscribe token
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @param {string} token - Token to verify
 * @returns {boolean} Whether token is valid
 */
const verifyUnsubscribeToken = (userId, email, token) => {
  const expectedToken = generateUnsubscribeToken(userId, email);
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(expectedToken)
  );
};

/**
 * Process template variables and add tracking
 * @param {string} html - HTML content
 * @param {Object} variables - Template variables
 * @param {Object} tracking - Tracking configuration
 * @returns {string} Processed HTML
 */
const processTemplate = (html, variables = {}, tracking = {}) => {
  let processed = html;
  
  // Replace variables
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    processed = processed.replace(regex, value || '');
  });
  
  // Add tracking pixel if enabled
  if (tracking.enabled && tracking.messageId) {
    const pixelUrl = getTrackingPixelUrl(tracking.messageId);
    const pixel = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;" />`;
    
    // Insert before closing body tag or at the end
    if (processed.includes('</body>')) {
      processed = processed.replace('</body>', `${pixel}</body>`);
    } else {
      processed += pixel;
    }
  }
  
  // Add click tracking to links if enabled
  if (tracking.enabled && tracking.messageId && tracking.trackClicks) {
    const linkRegex = /<a\s+([^>]*)href=["']([^"']+)["']([^>]*)>/gi;
    let linkIndex = 0;
    
    processed = processed.replace(linkRegex, (match, preAttrs, url, postAttrs) => {
      // Skip unsubscribe and mailto links
      if (url.includes('unsubscribe') || url.startsWith('mailto:') || url.startsWith('#')) {
        return match;
      }
      
      const linkId = `l${linkIndex++}`;
      const trackingUrl = getClickTrackingUrl(tracking.messageId, url, linkId);
      return `<a ${preAttrs}href="${trackingUrl}"${postAttrs} data-original-url="${url}">`;
    });
  }
  
  // Add unsubscribe link placeholder replacement
  if (variables.unsubscribeUrl) {
    processed = processed.replace(/{{unsubscribeUrl}}/g, variables.unsubscribeUrl);
  }
  
  return processed;
};

/**
 * Send single email
 * @param {Object} options - Email options
 * @returns {Promise<Object>} Send result
 */
const sendEmail = async (options) => {
  const {
    to,
    toName = '',
    from = SENDGRID_FROM_EMAIL,
    fromName = SENDGRID_FROM_NAME,
    replyTo = null,
    subject,
    html,
    text = null,
    templateId = null,
    variables = {},
    attachments = [],
    categories = [],
    campaignId = null,
    sequenceId = null,
    sequenceStep = null,
    userId = null,
    trackOpens = true,
    trackClicks = true,
    type = 'transactional',
  } = options;
  
  try {
    // Check rate limit
    if (!checkRateLimit()) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    
    // Generate message ID
    const messageId = generateMessageId();
    
    // Get template if templateId provided
    let emailHtml = html;
    let emailText = text;
    let emailSubject = subject;
    
    if (templateId) {
      const template = await EmailTemplate.findById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }
      
      const rendered = template.render(variables);
      emailHtml = rendered.html;
      emailText = rendered.text;
      emailSubject = rendered.subject;
    }
    
    // Add unsubscribe link to variables
    const unsubscribeUrl = getUnsubscribeUrl(userId, to, campaignId);
    const enrichedVariables = {
      ...variables,
      unsubscribeUrl,
      currentYear: new Date().getFullYear(),
    };
    
    // Process template with tracking
    emailHtml = processTemplate(emailHtml, enrichedVariables, {
      enabled: trackOpens,
      messageId,
      trackClicks,
    });
    
    // Generate text version if not provided
    if (!emailText && emailHtml) {
      emailText = emailHtml
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 500);
    }
    
    // Create email log entry
    const emailLog = await EmailLog.create({
      messageId,
      recipient: {
        userId,
        email: to,
        name: toName,
      },
      sender: {
        email: from,
        name: fromName,
      },
      subject: emailSubject,
      preview: emailText?.substring(0, 150) || '',
      campaignId,
      sequenceId,
      sequenceStep,
      templateId,
      type,
      category: categories[0] || 'general',
      tags: categories,
      status: 'queued',
      personalization: enrichedVariables,
    });
    
    // Send email via SendGrid or mock
    if (IS_MOCK_MODE) {
      console.log(`[MOCK EMAIL] To: ${to}, Subject: ${emailSubject}`);
      
      // Simulate success
      await emailLog.recordEvent('sent', { timestamp: new Date() });
      await emailLog.recordEvent('delivered', { timestamp: new Date() });
      
      return {
        success: true,
        messageId,
        mock: true,
        logId: emailLog._id,
      };
    }
    
    // Prepare SendGrid message
    const msg = {
      to: { email: to, name: toName },
      from: { email: from, name: fromName },
      subject: emailSubject,
      html: emailHtml,
      text: emailText,
      customArgs: {
        messageId,
        campaignId: campaignId?.toString() || '',
        userId: userId?.toString() || '',
      },
      categories: categories.length > 0 ? categories : ['general'],
      trackingSettings: {
        clickTracking: { enable: trackClicks },
        openTracking: { enable: trackOpens },
      },
    };
    
    if (replyTo) {
      msg.replyTo = replyTo;
    }
    
    if (attachments.length > 0) {
      msg.attachments = attachments.map(att => ({
        content: att.content,
        filename: att.filename,
        type: att.type,
        disposition: 'attachment',
      }));
    }
    
    // Send via SendGrid
    const response = await sgMail.send(msg);
    
    // Update email log
    const providerMessageId = response[0]?.headers['x-message-id'];
    emailLog.providerMessageId = providerMessageId;
    await emailLog.recordEvent('sent', { 
      timestamp: new Date(),
      response: providerMessageId,
    });
    
    return {
      success: true,
      messageId,
      providerMessageId,
      logId: emailLog._id,
    };
    
  } catch (error) {
    console.error('Error sending email:', error);
    
    // Log failure if we have a message ID
    if (messageId) {
      await EmailLog.findOneAndUpdate(
        { messageId },
        {
          $set: {
            status: 'failed',
            'error.message': error.message,
            'error.code': error.code,
          },
        }
      );
    }
    
    throw error;
  }
};

/**
 * Queue email for background sending
 * @param {Object} options - Email options
 * @returns {Promise<Object>} Job reference
 */
const queueEmail = async (options) => {
  const job = await emailQueue.add('send-email', options, {
    delay: options.delay || 0,
    priority: options.priority || 5,
  });
  
  return {
    success: true,
    jobId: job.id,
  };
};

/**
 * Send broadcast email to segment
 * @param {Object} options - Broadcast options
 * @returns {Promise<Object>} Broadcast result
 */
const sendBroadcast = async (options) => {
  const {
    campaignId,
    segmentId,
    userIds = [],
    batchSize = 50,
    throttleMs = 1000,
  } = options;
  
  try {
    // Get campaign details
    const campaign = await EmailCampaign.findById(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    
    // Get target users
    let targetUsers = [];
    
    if (segmentId) {
      const segment = await UserSegment.findById(segmentId).populate('members.userId');
      if (segment) {
        targetUsers = segment.members.map(m => m.userId).filter(Boolean);
      }
    } else if (userIds.length > 0) {
      targetUsers = await User.find({ _id: { $in: userIds } });
    }
    
    if (targetUsers.length === 0) {
      throw new Error('No target users found');
    }
    
    // Update campaign status
    campaign.status = 'sending';
    campaign.stats.totalRecipients = targetUsers.length;
    campaign.progress.startedAt = new Date();
    campaign.progress.totalBatches = Math.ceil(targetUsers.length / batchSize);
    await campaign.save();
    
    // Queue emails in batches
    const batches = [];
    for (let i = 0; i < targetUsers.length; i += batchSize) {
      batches.push(targetUsers.slice(i, i + batchSize));
    }
    
    let processedCount = 0;
    
    for (const batch of batches) {
      const jobs = batch.map(user => ({
        name: 'send-campaign-email',
        data: {
          campaignId: campaign._id.toString(),
          userId: user._id.toString(),
          email: user.email,
          name: user.name,
        },
        opts: {
          delay: processedCount * 100, // Stagger sends
        },
      }));
      
      await emailQueue.addBulk(jobs);
      processedCount += batch.length;
      
      // Update progress
      campaign.progress.currentBatch++;
      await campaign.save();
      
      // Throttle
      await new Promise(resolve => setTimeout(resolve, throttleMs));
    }
    
    return {
      success: true,
      campaignId,
      totalRecipients: targetUsers.length,
      batches: batches.length,
    };
    
  } catch (error) {
    console.error('Error sending broadcast:', error);
    
    // Update campaign status to failed
    if (campaignId) {
      await EmailCampaign.findByIdAndUpdate(campaignId, {
        status: 'failed',
      });
    }
    
    throw error;
  }
};

/**
 * Process email queue job
 */
emailQueue.process('send-email', async (job) => {
  return sendEmail(job.data);
});

emailQueue.process('send-campaign-email', async (job) => {
  const { campaignId, userId, email, name } = job.data;
  
  try {
    const campaign = await EmailCampaign.findById(campaignId).populate('templateId');
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    
    // Get user data for personalization
    const user = await User.findById(userId);
    
    // Prepare variables
    const variables = {
      name: name || user?.name || 'there',
      email: email,
      ...campaign.personalization,
    };
    
    // Send email
    const result = await sendEmail({
      to: email,
      toName: name,
      from: campaign.fromEmail,
      fromName: campaign.fromName,
      replyTo: campaign.replyTo,
      subject: campaign.subject,
      templateId: campaign.templateId?._id,
      html: campaign.customHtml,
      variables,
      campaignId,
      userId,
      type: 'campaign',
      categories: [campaign.type, campaign.category].filter(Boolean),
    });
    
    // Update campaign stats
    await EmailCampaign.findByIdAndUpdate(campaignId, {
      $inc: { 'stats.sent': 1 },
    });
    
    return result;
    
  } catch (error) {
    console.error(`Error sending campaign email to ${email}:`, error);
    
    // Update campaign failed count
    await EmailCampaign.findByIdAndUpdate(campaignId, {
      $inc: { 'stats.failed': 1 },
    });
    
    throw error;
  }
});

/**
 * Handle SendGrid webhook events
 * @param {Array} events - Webhook events
 */
const handleWebhookEvents = async (events) => {
  for (const event of events) {
    try {
      const messageId = event.messageId || event.trm_message_id;
      
      if (!messageId) {
        console.warn('Webhook event missing message ID:', event);
        continue;
      }
      
      const emailLog = await EmailLog.findOne({ messageId });
      if (!emailLog) {
        console.warn('Email log not found for message:', messageId);
        continue;
      }
      
      const eventData = {
        timestamp: new Date(event.timestamp * 1000),
        ip: event.ip,
        userAgent: event.useragent,
        url: event.url,
        linkId: event.linkId,
        bounceType: event.event === 'bounce' ? event.type : null,
        bounceReason: event.reason,
        code: event.status,
        source: event.type,
        type: event.type,
        feedbackId: event.feedbackId,
        metadata: event,
      };
      
      await emailLog.recordEvent(event.event, eventData);
      
      // Update campaign stats if applicable
      if (emailLog.campaignId) {
        const updateField = {
          delivered: 'stats.delivered',
          open: 'stats.opened',
          click: 'stats.clicked',
          bounce: 'stats.bounced',
          unsubscribe: 'stats.unsubscribed',
          spamreport: 'stats.complained',
        }[event.event];
        
        if (updateField) {
          await EmailCampaign.findByIdAndUpdate(emailLog.campaignId, {
            $inc: { [updateField]: 1 },
          });
        }
      }
      
    } catch (error) {
      console.error('Error processing webhook event:', error);
    }
  }
};

/**
 * Get email statistics
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Statistics
 */
const getEmailStats = async (options = {}) => {
  const { startDate, endDate, campaignId, organizationId } = options;
  
  const matchStage = {};
  
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }
  
  if (campaignId) {
    matchStage.campaignId = new mongoose.Types.ObjectId(campaignId);
  }
  
  if (organizationId) {
    matchStage.organizationId = new mongoose.Types.ObjectId(organizationId);
  }
  
  const stats = await EmailLog.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        sent: { $sum: { $cond: [{ $in: ['$status', ['sent', 'delivered', 'opened', 'clicked']] }, 1, 0] } },
        delivered: { $sum: { $cond: [{ $in: ['$status', ['delivered', 'opened', 'clicked']] }, 1, 0] } },
        opened: { $sum: { $cond: ['$tracking.opened', 1, 0] } },
        clicked: { $sum: { $cond: ['$tracking.clicked', 1, 0] } },
        bounced: { $sum: { $cond: [{ $eq: ['$status', 'bounced'] }, 1, 0] } },
        unsubscribed: { $sum: { $cond: ['$unsubscribe.unsubscribed', 1, 0] } },
        complained: { $sum: { $cond: ['$complaint.complained', 1, 0] } },
      },
    },
  ]);
  
  const result = stats[0] || {
    total: 0,
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
    unsubscribed: 0,
    complained: 0,
  };
  
  delete result._id;
  
  // Calculate rates
  const delivered = result.delivered || 1;
  result.openRate = ((result.opened / delivered) * 100).toFixed(2);
  result.clickRate = ((result.clicked / delivered) * 100).toFixed(2);
  result.bounceRate = ((result.bounced / result.total) * 100).toFixed(2);
  result.unsubscribeRate = ((result.unsubscribed / delivered) * 100).toFixed(2);
  result.complaintRate = ((result.complained / delivered) * 100).toFixed(2);
  
  return result;
};

/**
 * Get suppression list (bounced, unsubscribed, complained)
 * @returns {Promise<Array>} Suppression list
 */
const getSuppressionList = async () => {
  const suppressed = await EmailLog.aggregate([
    {
      $match: {
        $or: [
          { 'bounce.bounced': true },
          { 'unsubscribe.unsubscribed': true },
          { 'complaint.complained': true },
        ],
      },
    },
    {
      $group: {
        _id: '$recipient.email',
        email: { $first: '$recipient.email' },
        userId: { $first: '$recipient.userId' },
        reasons: {
          $addToSet: {
            $cond: [
              '$bounce.bounced',
              'bounced',
              {
                $cond: [
                  '$unsubscribe.unsubscribed',
                  'unsubscribed',
                  'complained',
                ],
              },
            ],
          },
        },
        lastIncident: { $max: '$createdAt' },
      },
    },
    {
      $project: {
        _id: 0,
        email: 1,
        userId: 1,
        reasons: 1,
        lastIncident: 1,
      },
    },
  ]);
  
  return suppressed;
};

/**
 * Check if email is suppressed
 * @param {string} email - Email to check
 * @returns {Promise<boolean>} Whether email is suppressed
 */
const isEmailSuppressed = async (email) => {
  const suppressed = await EmailLog.findOne({
    'recipient.email': email.toLowerCase(),
    $or: [
      { 'bounce.bounced': true, 'bounce.type': 'hard' },
      { 'unsubscribe.unsubscribed': true },
      { 'complaint.complained': true },
    ],
  });
  
  return !!suppressed;
};

/**
 * Add email to suppression list manually
 * @param {string} email - Email to suppress
 * @param {string} reason - Reason for suppression
 * @returns {Promise<Object>} Result
 */
const addToSuppressionList = async (email, reason = 'manual') => {
  // Create a log entry for the suppression
  await EmailLog.create({
    messageId: `suppress-${Date.now()}`,
    recipient: { email: email.toLowerCase() },
    subject: 'Suppressed',
    status: reason === 'bounce' ? 'bounced' : 'unsubscribed',
    unsubscribe: {
      unsubscribed: reason === 'unsubscribe',
      unsubscribedAt: new Date(),
      source: 'manual',
      reason,
    },
    bounce: {
      bounced: reason === 'bounce',
      bouncedAt: new Date(),
      type: 'hard',
      reason: 'Manual suppression',
    },
  });
  
  return { success: true, email, reason };
};

/**
 * Remove email from suppression list
 * @param {string} email - Email to remove
 * @returns {Promise<Object>} Result
 */
const removeFromSuppressionList = async (email) => {
  // Note: In a real system, you might want to keep a record
  // but mark as removed. For now, we'll just update the logs.
  await EmailLog.updateMany(
    { 'recipient.email': email.toLowerCase() },
    {
      $set: {
        'unsubscribe.unsubscribed': false,
        'bounce.bounced': false,
      },
    }
  );
  
  return { success: true, email };
};

/**
 * Get service status
 * @returns {Object} Service status
 */
const getServiceStatus = () => {
  return {
    mockMode: IS_MOCK_MODE,
    sendgridConfigured: !!SENDGRID_API_KEY,
    fromEmail: SENDGRID_FROM_EMAIL,
    fromName: SENDGRID_FROM_NAME,
    queueStatus: {
      waiting: emailQueue.getWaitingCount(),
      active: emailQueue.getActiveCount(),
      completed: emailQueue.getCompletedCount(),
      failed: emailQueue.getFailedCount(),
    },
    rateLimit: {
      maxPerMinute: RATE_LIMIT.maxPerMinute,
      currentCount: RATE_LIMIT.currentCount,
      resetTime: RATE_LIMIT.resetTime,
    },
  };
};

module.exports = {
  sendEmail,
  queueEmail,
  sendBroadcast,
  handleWebhookEvents,
  getEmailStats,
  getSuppressionList,
  isEmailSuppressed,
  addToSuppressionList,
  removeFromSuppressionList,
  verifyUnsubscribeToken,
  getServiceStatus,
};
