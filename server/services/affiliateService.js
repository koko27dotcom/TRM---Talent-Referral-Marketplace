/**
 * AffiliateService
 * Manages affiliate links, tracking, and commission calculations
 * Supports multi-level affiliate marketing
 */

const crypto = require('crypto');
const Partner = require('../models/Partner.js');
const PartnerReferral = require('../models/PartnerReferral.js');

/**
 * Service class for managing affiliate operations
 */
class AffiliateService {
  /**
   * Generate unique link ID
   * @returns {string} Unique link ID
   */
  generateLinkId() {
    return 'LNK-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  /**
   * Generate tracking code
   * @returns {string} Tracking code
   */
  generateTrackingCode() {
    return 'TRK-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  /**
   * Create affiliate link
   * @param {string} partnerId - Partner ID
   * @param {Object} linkData - Link configuration
   * @returns {Promise<Object>} Created link
   */
  async createLink(partnerId, linkData) {
    try {
      const partner = await Partner.findOne({ partnerId });
      if (!partner) {
        throw new Error('Partner not found');
      }

      if (partner.status !== 'active') {
        throw new Error('Partner account is not active');
      }

      const trackingCode = this.generateTrackingCode();
      
      // Build affiliate URL
      let affiliateUrl = `${process.env.FRONTEND_URL}/ref/${partner.affiliateCode}`;
      
      // Add tracking parameters
      const params = new URLSearchParams();
      params.append('trk', trackingCode);
      
      if (linkData.source) params.append('utm_source', linkData.source);
      if (linkData.medium) params.append('utm_medium', linkData.medium);
      if (linkData.campaign) params.append('utm_campaign', linkData.campaign);
      if (linkData.content) params.append('utm_content', linkData.content);
      if (linkData.landingPage) params.append('redirect', linkData.landingPage);

      affiliateUrl += '?' + params.toString();

      // Create referral record
      const referral = new PartnerReferral({
        referralId: trackingCode,
        partnerId: partner._id,
        trackingCode,
        referredType: linkData.referredType || 'referrer',
        campaignId: linkData.campaignId,
        campaignName: linkData.campaignName,
        attribution: {
          source: linkData.source,
          medium: linkData.medium,
          campaign: linkData.campaign,
          content: linkData.content,
          landingPage: linkData.landingPage,
        },
        expiresAt: linkData.expiresAt || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      });

      await referral.save();

      return {
        success: true,
        link: {
          id: trackingCode,
          url: affiliateUrl,
          trackingCode,
          shortUrl: null, // Could integrate with URL shortener
        },
        referral,
        message: 'Affiliate link created successfully',
      };
    } catch (error) {
      console.error('Error creating affiliate link:', error);
      throw error;
    }
  }

  /**
   * Get affiliate links for partner
   * @param {string} partnerId - Partner ID
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>} Links list
   */
  async getLinks(partnerId, filters = {}) {
    try {
      const partner = await Partner.findOne({ partnerId });
      if (!partner) {
        throw new Error('Partner not found');
      }

      const query = { partnerId: partner._id };

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.campaignId) {
        query.campaignId = filters.campaignId;
      }

      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const skip = (page - 1) * limit;

      const [referrals, total] = await Promise.all([
        PartnerReferral.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        PartnerReferral.countDocuments(query),
      ]);

      // Build link URLs
      const links = referrals.map(ref => ({
        id: ref.referralId,
        trackingCode: ref.trackingCode,
        url: `${process.env.FRONTEND_URL}/ref/${partner.affiliateCode}?trk=${ref.trackingCode}`,
        status: ref.status,
        clicks: ref.clickCount,
        createdAt: ref.createdAt,
        expiresAt: ref.expiresAt,
        campaignName: ref.campaignName,
        referredType: ref.referredType,
      }));

      return {
        success: true,
        links,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error getting affiliate links:', error);
      throw error;
    }
  }

  /**
   * Track click on affiliate link
   * @param {string} trackingCode - Tracking code
   * @param {Object} clickData - Click metadata
   * @returns {Promise<Object>} Tracking result
   */
  async trackClick(trackingCode, clickData) {
    try {
      const referral = await PartnerReferral.findOne({ trackingCode });
      if (!referral) {
        return { success: false, error: 'Invalid tracking code' };
      }

      // Check if expired
      if (referral.checkExpiry()) {
        await referral.save();
        return { success: false, error: 'Link has expired' };
      }

      // Record click
      await referral.recordClick({
        timestamp: new Date(),
        ipAddress: clickData.ipAddress,
        userAgent: clickData.userAgent,
        device: clickData.device,
        source: clickData.source,
      });

      // Set cookie data for attribution
      const cookieData = {
        trackingCode,
        partnerId: referral.partnerId,
        expiresAt: referral.expiresAt,
      };

      return {
        success: true,
        referralId: referral.referralId,
        partnerId: referral.partnerId,
        cookieData,
      };
    } catch (error) {
      console.error('Error tracking click:', error);
      throw error;
    }
  }

  /**
   * Track conversion
   * @param {string} trackingCode - Tracking code
   * @param {Object} conversionData - Conversion details
   * @returns {Promise<Object>} Conversion result
   */
  async trackConversion(trackingCode, conversionData) {
    try {
      const referral = await PartnerReferral.findOne({ trackingCode });
      if (!referral) {
        throw new Error('Invalid tracking code');
      }

      if (referral.status === 'converted') {
        throw new Error('Referral already converted');
      }

      // Get partner for commission rate
      const partner = await Partner.findById(referral.partnerId);
      if (!partner || partner.status !== 'active') {
        throw new Error('Partner not found or inactive');
      }

      // Mark as converted
      await referral.markConverted({
        value: conversionData.value,
        referredDetails: conversionData.referredDetails,
        commissionRate: partner.commissionRate,
      });

      // Update partner stats
      partner.referralCount += 1;
      await partner.addRevenue(conversionData.value);

      return {
        success: true,
        referralId: referral.referralId,
        commissionAmount: referral.commissionAmount,
        message: 'Conversion tracked successfully',
      };
    } catch (error) {
      console.error('Error tracking conversion:', error);
      throw error;
    }
  }

  /**
   * Get affiliate statistics
   * @param {string} partnerId - Partner ID
   * @param {Object} dateRange - Date range filters
   * @returns {Promise<Object>} Statistics
   */
  async getStats(partnerId, dateRange = {}) {
    try {
      const partner = await Partner.findOne({ partnerId });
      if (!partner) {
        throw new Error('Partner not found');
      }

      const startDate = dateRange.startDate 
        ? new Date(dateRange.startDate) 
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = dateRange.endDate 
        ? new Date(dateRange.endDate) 
        : new Date();

      // Get stats from PartnerReferral
      const stats = await PartnerReferral.getPartnerStats(partner._id, {
        startDate,
        endDate,
      });

      // Get daily breakdown
      const dailyStats = await PartnerReferral.aggregate([
        {
          $match: {
            partnerId: partner._id,
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            clicks: { $sum: '$clickCount' },
            conversions: {
              $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] },
            },
            commission: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'converted'] },
                  '$commissionAmount',
                  0,
                ],
              },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      // Calculate conversion rate
      const conversionRate = stats.totalClicks > 0
        ? (stats.converted / stats.totalClicks) * 100
        : 0;

      // Get top performing links
      const topLinks = await PartnerReferral.find({
        partnerId: partner._id,
        status: 'converted',
      })
        .sort({ commissionAmount: -1 })
        .limit(5)
        .select('trackingCode commissionAmount clickCount campaignName')
        .lean();

      return {
        success: true,
        summary: {
          ...stats,
          conversionRate: Math.round(conversionRate * 100) / 100,
          averageCommission: stats.converted > 0
            ? Math.round((stats.totalCommission / stats.converted) * 100) / 100
            : 0,
        },
        dailyStats,
        topLinks,
        dateRange: { startDate, endDate },
      };
    } catch (error) {
      console.error('Error getting affiliate stats:', error);
      throw error;
    }
  }

  /**
   * Get conversion history
   * @param {string} partnerId - Partner ID
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>} Conversions list
   */
  async getConversions(partnerId, filters = {}) {
    try {
      const partner = await Partner.findOne({ partnerId });
      if (!partner) {
        throw new Error('Partner not found');
      }

      const query = {
        partnerId: partner._id,
        status: 'converted',
      };

      if (filters.startDate || filters.endDate) {
        query.convertedAt = {};
        if (filters.startDate) query.convertedAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.convertedAt.$lte = new Date(filters.endDate);
      }

      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const skip = (page - 1) * limit;

      const [conversions, total] = await Promise.all([
        PartnerReferral.find(query)
          .sort({ convertedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        PartnerReferral.countDocuments(query),
      ]);

      return {
        success: true,
        conversions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error getting conversions:', error);
      throw error;
    }
  }

  /**
   * Get commission report
   * @param {string} partnerId - Partner ID
   * @param {Object} filters - Report filters
   * @returns {Promise<Object>} Commission report
   */
  async getCommissionReport(partnerId, filters = {}) {
    try {
      const partner = await Partner.findOne({ partnerId });
      if (!partner) {
        throw new Error('Partner not found');
      }

      const startDate = filters.startDate 
        ? new Date(filters.startDate) 
        : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const endDate = filters.endDate 
        ? new Date(filters.endDate) 
        : new Date();

      // Get all conversions in date range
      const conversions = await PartnerReferral.find({
        partnerId: partner._id,
        status: 'converted',
        convertedAt: { $gte: startDate, $lte: endDate },
      }).sort({ convertedAt: -1 });

      // Calculate totals by status
      const summary = {
        totalCommission: 0,
        paidCommission: 0,
        pendingCommission: 0,
        eligibleCommission: 0,
      };

      conversions.forEach(conv => {
        summary.totalCommission += conv.commissionAmount;
        
        switch (conv.payoutStatus) {
          case 'paid':
            summary.paidCommission += conv.commissionAmount;
            break;
          case 'scheduled':
            summary.pendingCommission += conv.commissionAmount;
            break;
          case 'eligible':
            summary.eligibleCommission += conv.commissionAmount;
            break;
        }
      });

      // Monthly breakdown
      const monthlyBreakdown = await PartnerReferral.aggregate([
        {
          $match: {
            partnerId: partner._id,
            status: 'converted',
            convertedAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$convertedAt' } },
            conversions: { $sum: 1 },
            totalCommission: { $sum: '$commissionAmount' },
            paidCommission: {
              $sum: {
                $cond: [
                  { $eq: ['$payoutStatus', 'paid'] },
                  '$commissionAmount',
                  0,
                ],
              },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      return {
        success: true,
        summary,
        monthlyBreakdown,
        conversions: conversions.slice(0, 50), // Last 50 conversions
        dateRange: { startDate, endDate },
      };
    } catch (error) {
      console.error('Error getting commission report:', error);
      throw error;
    }
  }

  /**
   * Create multi-level affiliate link
   * @param {string} partnerId - Partner ID
   * @param {string} parentReferralId - Parent referral ID (for multi-level)
   * @param {Object} linkData - Link configuration
   * @returns {Promise<Object>} Created link
   */
  async createMultiLevelLink(partnerId, parentReferralId, linkData) {
    try {
      const partner = await Partner.findOne({ partnerId });
      if (!partner) {
        throw new Error('Partner not found');
      }

      // Get parent referral
      const parentReferral = await PartnerReferral.findById(parentReferralId);
      if (!parentReferral) {
        throw new Error('Parent referral not found');
      }

      // Create child referral
      const trackingCode = this.generateTrackingCode();
      
      const referral = new PartnerReferral({
        referralId: trackingCode,
        partnerId: partner._id,
        trackingCode,
        referredType: linkData.referredType || 'referrer',
        parentReferralId: parentReferral._id,
        level: (parentReferral.level || 1) + 1,
        campaignId: linkData.campaignId,
        campaignName: linkData.campaignName,
        attribution: {
          source: linkData.source,
          medium: linkData.medium,
          campaign: linkData.campaign,
        },
      });

      await referral.save();

      return {
        success: true,
        link: {
          id: trackingCode,
          url: `${process.env.FRONTEND_URL}/ref/${partner.affiliateCode}?trk=${trackingCode}`,
          trackingCode,
          level: referral.level,
        },
        referral,
        message: 'Multi-level affiliate link created successfully',
      };
    } catch (error) {
      console.error('Error creating multi-level link:', error);
      throw error;
    }
  }

  /**
   * Get marketing materials
   * @param {string} partnerId - Partner ID
   * @returns {Promise<Object>} Marketing materials
   */
  async getMarketingMaterials(partnerId) {
    try {
      const partner = await Partner.findOne({ partnerId });
      if (!partner) {
        throw new Error('Partner not found');
      }

      // Get current tier program
      const program = await PartnerProgram.getByTier(partner.tier);

      return {
        success: true,
        materials: program?.marketingMaterials || [],
        affiliateCode: partner.affiliateCode,
        customLandingPage: partner.customLandingPage,
        suggestedMessages: [
          {
            type: 'social',
            content: `Join me on TRM Referrals - the best platform for job referrals! Use my link: ${process.env.FRONTEND_URL}/ref/${partner.affiliateCode}`,
          },
          {
            type: 'email',
            subject: 'Earn money with job referrals',
            content: `Hi,\n\nI wanted to share an amazing opportunity with you. TRM Referrals connects job seekers with referrers and companies.\n\nJoin using my link: ${process.env.FRONTEND_URL}/ref/${partner.affiliateCode}\n\nBest regards,`,
          },
        ],
      };
    } catch (error) {
      console.error('Error getting marketing materials:', error);
      throw error;
    }
  }

  /**
   * Validate cookie and get attribution
   * @param {string} cookieId - Cookie ID
   * @returns {Promise<Object>} Attribution data
   */
  async validateCookie(cookieId) {
    try {
      const referral = await PartnerReferral.findOne({ cookieId });
      if (!referral) {
        return { valid: false };
      }

      // Check if expired
      if (referral.cookieExpiry && new Date() > referral.cookieExpiry) {
        return { valid: false, reason: 'expired' };
      }

      return {
        valid: true,
        partnerId: referral.partnerId,
        trackingCode: referral.trackingCode,
        referralId: referral.referralId,
      };
    } catch (error) {
      console.error('Error validating cookie:', error);
      throw error;
    }
  }
}

module.exports = new AffiliateService();
