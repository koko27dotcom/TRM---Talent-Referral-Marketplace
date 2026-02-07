/**
 * OutreachAutomationService
 * Automated outreach service for WhatsApp and Email campaigns
 * Integrates with existing WhatsApp service and tracks engagement
 */

const OutreachCampaign = require('../models/OutreachCampaign.js');
const TalentPool = require('../models/TalentPool.js');
const { candidateEnrichmentService } = require('./candidateEnrichmentService.js');
const { AuditLog } = require('../models/index.js');

/**
 * Service class for automated outreach campaigns
 */
class OutreachAutomationService {
  constructor() {
    this.activeCampaigns = new Map();
    this.messageQueue = [];
    this.isProcessing = false;
    this.whatsappService = null;
  }

  /**
   * Set WhatsApp service reference
   */
  setWhatsAppService(service) {
    this.whatsappService = service;
  }

  /**
   * Send WhatsApp message
   */
  async sendWhatsAppMessage(phone, message, template = null) {
    if (!this.whatsappService) {
      throw new Error('WhatsApp service not configured');
    }

    try {
      // Format phone number
      const formattedPhone = this.formatPhoneNumber(phone);
      
      // Send via WhatsApp service
      const result = await this.whatsappService.sendMessage({
        to: formattedPhone,
        body: message,
        template: template,
      });

      return {
        success: true,
        messageId: result.messageId,
        status: 'sent',
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return {
        success: false,
        error: error.message,
        status: 'failed',
      };
    }
  }

  /**
   * Send Email message
   */
  async sendEmailMessage(email, subject, body, options = {}) {
    try {
      // This would integrate with your email service (SendGrid, AWS SES, etc.)
      // For now, returning a mock implementation
      
      // Example integration with SendGrid:
      // const sgMail = require('@sendgrid/mail');
      // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      // await sgMail.send({
      //   to: email,
      //   from: process.env.FROM_EMAIL,
      //   subject: subject,
      //   html: body,
      // });

      return {
        success: true,
        messageId: `email_${Date.now()}`,
        status: 'sent',
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error sending email:', error);
      return {
        success: false,
        error: error.message,
        status: 'failed',
      };
    }
  }

  /**
   * Format phone number for WhatsApp
   */
  formatPhoneNumber(phone) {
    if (!phone) return null;
    
    // Remove non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Add Myanmar country code if not present
    if (cleaned.startsWith('0')) {
      cleaned = '95' + cleaned.substring(1);
    }
    if (!cleaned.startsWith('95')) {
      cleaned = '95' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Personalize message with candidate data
   */
  personalizeMessage(template, candidate, job = null) {
    let message = template;
    
    // Replace variables
    const variables = {
      '{{name}}': candidate.name || 'there',
      '{{firstName}}': candidate.name?.split(' ')[0] || 'there',
      '{{currentTitle}}': candidate.currentTitle || '',
      '{{currentCompany}}': candidate.currentCompany || '',
      '{{skills}}': (candidate.skills || []).join(', '),
      '{{location}}': candidate.location?.city || '',
      '{{jobTitle}}': job?.title || 'exciting position',
      '{{companyName}}': job?.company || 'our company',
    };
    
    Object.entries(variables).forEach(([key, value]) => {
      message = message.replace(new RegExp(key, 'g'), value);
    });
    
    return message;
  }

  /**
   * Send single message to candidate
   */
  async sendSingleMessage(candidateId, messageData, userId) {
    const candidate = await TalentPool.findById(candidateId);
    if (!candidate) throw new Error('Candidate not found');

    const { channel, message, subject, template } = messageData;
    let result;

    // Personalize message
    const personalizedMessage = this.personalizeMessage(message, candidate);

    if (channel === 'whatsapp' && candidate.phone) {
      result = await this.sendWhatsAppMessage(candidate.phone, personalizedMessage, template);
    } else if (channel === 'email' && candidate.email) {
      result = await this.sendEmailMessage(candidate.email, subject, personalizedMessage);
    } else {
      throw new Error('Invalid channel or missing contact information');
    }

    // Update candidate contact history
    await candidate.addContactAttempt({
      channel: channel,
      type: 'initial',
      status: result.success ? 'sent' : 'failed',
      sentAt: new Date(),
      messageContent: personalizedMessage,
      metadata: {
        error: result.error,
      },
    });

    // Log audit
    await AuditLog.create({
      action: 'MESSAGE_SENT',
      entity: 'TalentPool',
      entityId: candidateId,
      userId: userId,
      details: { channel, success: result.success },
    });

    return result;
  }

  /**
   * Create and start campaign
   */
  async createCampaign(campaignData, userId) {
    const campaign = await OutreachCampaign.create({
      ...campaignData,
      createdBy: userId,
      status: 'draft',
    });

    // Find matching candidates
    const candidates = await this.findCandidatesForCampaign(campaign.targetFilter);
    
    // Add candidates to campaign
    await campaign.addRecipients(candidates.map(c => c._id));

    return campaign;
  }

  /**
   * Find candidates matching campaign filters
   */
  async findCandidatesForCampaign(filters) {
    const query = { isActive: true };

    if (filters.skills?.length > 0) {
      query.skills = { $in: filters.skills };
    }

    if (filters.experienceRange) {
      query.experienceYears = {
        $gte: filters.experienceRange.min || 0,
        $lte: filters.experienceRange.max || 50,
      };
    }

    if (filters.locations?.length > 0) {
      query['location.city'] = { $in: filters.locations };
    }

    if (filters.minHireProbability) {
      query.hireProbabilityScore = { $gte: filters.minHireProbability };
    }

    if (filters.contactStatus?.length > 0) {
      query.contactStatus = { $in: filters.contactStatus };
    }

    if (filters.sources?.length > 0) {
      query.source = { $in: filters.sources };
    }

    if (filters.neverContacted) {
      query.contactStatus = 'not_contacted';
    }

    if (filters.hasEmail) {
      query.email = { $exists: true, $ne: null };
    }

    if (filters.hasPhone) {
      query.phone = { $exists: true, $ne: null };
    }

    return TalentPool.find(query).limit(1000);
  }

  /**
   * Start campaign execution
   */
  async startCampaign(campaignId, userId) {
    const campaign = await OutreachCampaign.findById(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    if (campaign.status !== 'scheduled' && campaign.status !== 'draft') {
      throw new Error('Campaign cannot be started');
    }

    campaign.status = 'running';
    campaign.startedAt = new Date();
    await campaign.save();

    // Start sending process
    this.processCampaign(campaignId);

    return campaign;
  }

  /**
   * Process campaign batches
   */
  async processCampaign(campaignId) {
    const campaign = await OutreachCampaign.findById(campaignId)
      .populate('recipients.candidateId');
    
    if (!campaign || campaign.status !== 'running') return;

    this.activeCampaigns.set(campaignId, { startedAt: new Date() });

    try {
      const batchSize = campaign.sendingConfig?.batchSize || 50;
      const delayBetweenBatches = (campaign.sendingConfig?.delayBetweenBatches || 300) * 1000;

      while (campaign.status === 'running') {
        const pendingRecipients = campaign.getPendingRecipients(batchSize);
        
        if (pendingRecipients.length === 0) {
          // Campaign complete
          campaign.status = 'completed';
          campaign.completedAt = new Date();
          await campaign.save();
          break;
        }

        // Process batch
        await Promise.all(
          pendingRecipients.map(async (recipient) => {
            try {
              const candidate = recipient.candidateId;
              
              // Generate personalized message if needed
              let message = campaign.messageTemplate.body;
              if (campaign.messageTemplate.personalization) {
                message = await candidateEnrichmentService.generateOutreachMessage(
                  candidate,
                  campaign.targetJobId,
                  message
                );
              }

              // Send message
              let result;
              if (campaign.channel === 'whatsapp' && candidate.phone) {
                const personalizedMessage = this.personalizeMessage(message, candidate);
                result = await this.sendWhatsAppMessage(candidate.phone, personalizedMessage);
              } else if (campaign.channel === 'email' && candidate.email) {
                const personalizedMessage = this.personalizeMessage(message, candidate);
                result = await this.sendEmailMessage(
                  candidate.email,
                  campaign.messageTemplate.subject,
                  personalizedMessage
                );
              }

              // Update recipient status
              if (result) {
                await campaign.updateRecipientStatus(
                  candidate._id,
                  result.success ? 'sent' : 'failed',
                  { error: result.error }
                );

                // Update candidate contact history
                await candidate.addContactAttempt({
                  channel: campaign.channel,
                  type: 'initial',
                  status: result.success ? 'sent' : 'failed',
                  sentAt: new Date(),
                  campaignId: campaignId,
                  messageContent: message,
                });
              }
            } catch (error) {
              console.error('Error sending to recipient:', error);
              await campaign.updateRecipientStatus(
                recipient.candidateId._id,
                'failed',
                { error: error.message }
              );
            }
          })
        );

        // Save campaign progress
        await campaign.save();

        // Wait between batches
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));

        // Refresh campaign status
        const updatedCampaign = await OutreachCampaign.findById(campaignId);
        if (updatedCampaign.status !== 'running') break;
      }
    } catch (error) {
      console.error('Campaign processing error:', error);
      campaign.status = 'error';
      await campaign.save();
    } finally {
      this.activeCampaigns.delete(campaignId);
    }
  }

  /**
   * Pause campaign
   */
  async pauseCampaign(campaignId, userId) {
    const campaign = await OutreachCampaign.findById(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    if (campaign.status !== 'running') {
      throw new Error('Campaign is not running');
    }

    campaign.status = 'paused';
    await campaign.save();

    return campaign;
  }

  /**
   * Resume campaign
   */
  async resumeCampaign(campaignId, userId) {
    const campaign = await OutreachCampaign.findById(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    if (campaign.status !== 'paused') {
      throw new Error('Campaign is not paused');
    }

    campaign.status = 'running';
    await campaign.save();

    // Resume processing
    this.processCampaign(campaignId);

    return campaign;
  }

  /**
   * Cancel campaign
   */
  async cancelCampaign(campaignId, userId) {
    const campaign = await OutreachCampaign.findById(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    campaign.status = 'cancelled';
    await campaign.save();

    return campaign;
  }

  /**
   * Track message open
   */
  async trackOpen(campaignId, candidateId, metadata = {}) {
    const campaign = await OutreachCampaign.findById(campaignId);
    if (!campaign) return;

    await campaign.updateRecipientStatus(candidateId, 'opened', metadata);

    // Update candidate
    const candidate = await TalentPool.findById(candidateId);
    if (candidate) {
      const lastContact = candidate.contactHistory[candidate.contactHistory.length - 1];
      if (lastContact) {
        lastContact.metadata = { ...lastContact.metadata, openedAt: new Date(), ...metadata };
        await candidate.save();
      }
    }
  }

  /**
   * Track message click
   */
  async trackClick(campaignId, candidateId, metadata = {}) {
    const campaign = await OutreachCampaign.findById(campaignId);
    if (!campaign) return;

    await campaign.updateRecipientStatus(candidateId, 'clicked', metadata);
  }

  /**
   * Track message reply
   */
  async trackReply(campaignId, candidateId, content, metadata = {}) {
    const campaign = await OutreachCampaign.findById(campaignId);
    if (!campaign) return;

    // Analyze sentiment
    const sentiment = await this.analyzeSentiment(content);

    await campaign.updateRecipientStatus(candidateId, 'replied', {
      content,
      sentiment,
      ...metadata,
    });

    // Update candidate
    const candidate = await TalentPool.findById(candidateId);
    if (candidate) {
      candidate.contactStatus = 'responded';
      await candidate.save();
    }

    // Create task if configured
    if (campaign.automationRules?.createTaskOnReply) {
      // Integration with task management system
      console.log('Creating task for reply from candidate:', candidateId);
    }
  }

  /**
   * Analyze sentiment of reply
   */
  async analyzeSentiment(text) {
    try {
      // Simple keyword-based sentiment analysis
      const positiveWords = ['interested', 'yes', 'sure', 'definitely', 'absolutely', 'love', 'great', 'thanks'];
      const negativeWords = ['not interested', 'no', 'unsubscribe', 'stop', 'remove', 'never'];
      
      const lowerText = text.toLowerCase();
      
      const positiveCount = positiveWords.filter(w => lowerText.includes(w)).length;
      const negativeCount = negativeWords.filter(w => lowerText.includes(w)).length;
      
      if (negativeCount > positiveCount) return 'negative';
      if (positiveCount > negativeCount) return 'positive';
      return 'neutral';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Schedule follow-up messages
   */
  async scheduleFollowUps(campaignId) {
    const campaign = await OutreachCampaign.findById(campaignId);
    if (!campaign || !campaign.enableFollowUps) return;

    // This would integrate with a job queue (Bull, Agenda, etc.)
    // For now, just logging
    console.log('Scheduling follow-ups for campaign:', campaignId);
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(campaignId) {
    const campaign = await OutreachCampaign.findById(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    return {
      overview: {
        total: campaign.analytics.totalRecipients,
        sent: campaign.analytics.sentCount,
        delivered: campaign.analytics.deliveredCount,
        opened: campaign.analytics.openedCount,
        clicked: campaign.analytics.clickedCount,
        replied: campaign.analytics.repliedCount,
        converted: campaign.analytics.convertedCount,
      },
      rates: {
        delivery: campaign.analytics.deliveryRate,
        open: campaign.analytics.openRate,
        click: campaign.analytics.clickRate,
        reply: campaign.analytics.replyRate,
        conversion: campaign.analytics.conversionRate,
      },
      hourlyDistribution: campaign.analytics.hourlyDistribution,
      dailyDistribution: campaign.analytics.dailyDistribution,
    };
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(userId) {
    const stats = await OutreachCampaign.getStats(userId);
    
    return stats[0] || {
      total: 0,
      active: 0,
      completed: 0,
      totalSent: 0,
      totalOpened: 0,
      totalReplied: 0,
      avgOpenRate: 0,
      avgReplyRate: 0,
    };
  }
}

// Export singleton instance
const outreachAutomationService = new OutreachAutomationService();
module.exports = OutreachAutomationService;
