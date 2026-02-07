/**
 * PartnerService
 * Core business logic for partner management
 * Handles partner onboarding, revenue sharing, tier management, and payouts
 */

const crypto = require('crypto');
const Partner = require('../models/Partner.js');
const PartnerProgram = require('../models/PartnerProgram.js');
const PartnerReferral = require('../models/PartnerReferral.js');
const User = require('../models/User.js');

/**
 * Service class for managing partner operations
 */
class PartnerService {
  /**
   * Generate unique partner ID
   * @returns {string} Unique partner ID
   */
  generatePartnerId() {
    return 'PRT-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  /**
   * Generate unique affiliate code
   * @returns {string} Unique affiliate code
   */
  generateAffiliateCode() {
    return 'AFF' + crypto.randomBytes(3).toString('hex').toUpperCase();
  }

  /**
   * Generate unique tracking code
   * @returns {string} Unique tracking code
   */
  generateTrackingCode() {
    return 'TRK-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  /**
   * Apply to become a partner
   * @param {string} userId - User ID applying
   * @param {Object} applicationData - Application details
   * @returns {Promise<Object>} Created partner application
   */
  async apply(userId, applicationData) {
    try {
      // Check if user already has a partner application
      const existingPartner = await Partner.findOne({ userId });
      if (existingPartner) {
        throw new Error('You already have a partner application');
      }

      // Get default partner program (Bronze)
      const defaultProgram = await PartnerProgram.getByTier('bronze');
      if (!defaultProgram) {
        throw new Error('Partner program configuration not found');
      }

      // Create partner application
      const partner = new Partner({
        partnerId: this.generatePartnerId(),
        name: applicationData.name,
        type: applicationData.type,
        status: 'pending',
        tier: 'bronze',
        userId,
        contactInfo: applicationData.contactInfo,
        companyDetails: applicationData.companyDetails,
        commissionRate: defaultProgram.commissionRate,
        revenueSharePercent: defaultProgram.commissionRate,
        applicationDetails: {
          howDidYouHear: applicationData.howDidYouHear,
          expectedReferrals: applicationData.expectedReferrals,
          targetIndustries: applicationData.targetIndustries,
          valueProposition: applicationData.valueProposition,
          experience: applicationData.experience,
          submittedAt: new Date(),
        },
      });

      await partner.save();

      return {
        success: true,
        partner,
        message: 'Partner application submitted successfully',
      };
    } catch (error) {
      console.error('Error submitting partner application:', error);
      throw error;
    }
  }

  /**
   * Review and approve/reject partner application
   * @param {string} partnerId - Partner ID
   * @param {string} adminId - Admin user ID
   * @param {string} decision - 'approve' or 'reject'
   * @param {Object} reviewData - Review details
   * @returns {Promise<Object>} Updated partner
   */
  async reviewApplication(partnerId, adminId, decision, reviewData = {}) {
    try {
      const partner = await Partner.findOne({ partnerId });
      if (!partner) {
        throw new Error('Partner not found');
      }

      if (partner.status !== 'pending' && partner.status !== 'under_review') {
        throw new Error('Partner application has already been processed');
      }

      if (decision === 'approve') {
        partner.status = 'active';
        partner.affiliateCode = this.generateAffiliateCode();
        partner.applicationDetails.reviewedAt = new Date();
        partner.applicationDetails.reviewedBy = adminId;
        partner.applicationDetails.notes = reviewData.notes;
        partner.activatedAt = new Date();
        partner.agreementAccepted = true;
        partner.agreementAcceptedAt = new Date();
        partner.agreementVersion = reviewData.agreementVersion || '1.0';
      } else {
        partner.status = 'suspended';
        partner.applicationDetails.reviewedAt = new Date();
        partner.applicationDetails.reviewedBy = adminId;
        partner.applicationDetails.notes = reviewData.notes;
        partner.applicationDetails.rejectionReason = reviewData.rejectionReason;
      }

      await partner.save();

      return {
        success: true,
        partner,
        message: decision === 'approve' 
          ? 'Partner application approved' 
          : 'Partner application rejected',
      };
    } catch (error) {
      console.error('Error reviewing partner application:', error);
      throw error;
    }
  }

  /**
   * Get partner dashboard data
   * @param {string} partnerId - Partner ID
   * @returns {Promise<Object>} Dashboard data
   */
  async getDashboard(partnerId) {
    try {
      const partner = await Partner.findOne({ partnerId })
        .populate('whiteLabelConfig', 'domain brandName deployment.status');

      if (!partner) {
        throw new Error('Partner not found');
      }

      // Get current tier requirements
      const currentProgram = await PartnerProgram.getByTier(partner.tier);
      const nextTier = this.getNextTier(partner.tier);
      const nextProgram = nextTier ? await PartnerProgram.getByTier(nextTier) : null;

      // Get referral stats
      const referralStats = await PartnerReferral.getPartnerStats(partner._id, {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      });

      // Calculate tier progress
      const tierProgress = nextProgram ? {
        currentTier: partner.tier,
        nextTier,
        referralsProgress: {
          current: partner.referralCount,
          required: nextProgram.requirements.minReferrals,
          percentage: Math.min(100, (partner.referralCount / nextProgram.requirements.minReferrals) * 100),
        },
        revenueProgress: {
          current: partner.totalRevenue,
          required: nextProgram.requirements.minRevenue,
          percentage: Math.min(100, (partner.totalRevenue / nextProgram.requirements.minRevenue) * 100),
        },
      } : null;

      return {
        success: true,
        partner: {
          partnerId: partner.partnerId,
          name: partner.name,
          type: partner.type,
          status: partner.status,
          tier: partner.tier,
          commissionRate: partner.commissionRate,
          affiliateCode: partner.affiliateCode,
        },
        revenue: {
          totalRevenue: partner.totalRevenue,
          totalPayout: partner.totalPayout,
          pendingPayout: partner.pendingPayout,
          availableBalance: partner.totalRevenue - partner.totalPayout,
          last30Days: partner.metrics.last30DaysRevenue,
        },
        referrals: referralStats,
        tierProgress,
        whiteLabel: partner.whiteLabelConfig,
        quickActions: [
          { label: 'Generate Affiliate Link', action: 'generate_link', icon: 'Link' },
          { label: 'View Reports', action: 'view_reports', icon: 'BarChart' },
          { label: 'Manage API Keys', action: 'manage_api', icon: 'Key' },
          { label: 'Configure White-Label', action: 'white_label', icon: 'Palette' },
        ],
      };
    } catch (error) {
      console.error('Error getting partner dashboard:', error);
      throw error;
    }
  }

  /**
   * Get next tier name
   * @param {string} currentTier - Current tier
   * @returns {string|null} Next tier name or null
   */
  getNextTier(currentTier) {
    const tiers = ['bronze', 'silver', 'gold', 'platinum'];
    const currentIndex = tiers.indexOf(currentTier);
    return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
  }

  /**
   * Create a referral tracking link
   * @param {string} partnerId - Partner ID
   * @param {Object} referralData - Referral details
   * @returns {Promise<Object>} Created referral tracking
   */
  async createReferral(partnerId, referralData) {
    try {
      const partner = await Partner.findOne({ partnerId });
      if (!partner) {
        throw new Error('Partner not found');
      }

      if (partner.status !== 'active') {
        throw new Error('Partner account is not active');
      }

      // Create tracking code
      const trackingCode = this.generateTrackingCode();

      // Create referral record
      const referral = new PartnerReferral({
        referralId: trackingCode,
        partnerId: partner._id,
        trackingCode,
        referredType: referralData.referredType,
        referredId: referralData.referredId,
        campaignId: referralData.campaignId,
        campaignName: referralData.campaignName,
        attribution: referralData.attribution || {},
        cookieId: referralData.cookieId,
        cookieExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      });

      await referral.save();

      // Generate affiliate link
      const affiliateLink = `${process.env.FRONTEND_URL}/ref/${partner.affiliateCode}?trk=${trackingCode}`;

      return {
        success: true,
        referral,
        affiliateLink,
        trackingCode,
        message: 'Referral tracking link created successfully',
      };
    } catch (error) {
      console.error('Error creating referral:', error);
      throw error;
    }
  }

  /**
   * Track a click on an affiliate link
   * @param {string} trackingCode - Tracking code
   * @param {Object} clickData - Click metadata
   * @returns {Promise<Object>} Updated referral
   */
  async trackClick(trackingCode, clickData) {
    try {
      const referral = await PartnerReferral.findOne({ trackingCode });
      if (!referral) {
        throw new Error('Invalid tracking code');
      }

      // Check if expired
      if (referral.checkExpiry()) {
        await referral.save();
        throw new Error('Referral link has expired');
      }

      // Record click
      await referral.recordClick({
        timestamp: new Date(),
        ipAddress: clickData.ipAddress,
        userAgent: clickData.userAgent,
        device: clickData.device,
        source: clickData.source,
      });

      return {
        success: true,
        referral,
        message: 'Click tracked successfully',
      };
    } catch (error) {
      console.error('Error tracking click:', error);
      throw error;
    }
  }

  /**
   * Record a conversion from a referral
   * @param {string} trackingCode - Tracking code
   * @param {Object} conversionData - Conversion details
   * @returns {Promise<Object>} Updated referral with commission
   */
  async recordConversion(trackingCode, conversionData) {
    try {
      const referral = await PartnerReferral.findOne({ trackingCode });
      if (!referral) {
        throw new Error('Invalid tracking code');
      }

      if (referral.status === 'converted') {
        throw new Error('Referral has already been converted');
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
      if (referral.referredType === 'company') {
        partner.conversionCount += 1;
      }
      await partner.addRevenue(conversionData.value);

      // Check for tier upgrade
      await this.checkTierUpgrade(partner);

      return {
        success: true,
        referral,
        commissionAmount: referral.commissionAmount,
        message: 'Conversion recorded successfully',
      };
    } catch (error) {
      console.error('Error recording conversion:', error);
      throw error;
    }
  }

  /**
   * Check and process tier upgrade
   * @param {Object} partner - Partner document
   * @returns {Promise<Object>} Upgrade result
   */
  async checkTierUpgrade(partner) {
    try {
      const nextTier = this.getNextTier(partner.tier);
      if (!nextTier) {
        return { upgraded: false, reason: 'Already at highest tier' };
      }

      const nextProgram = await PartnerProgram.getByTier(nextTier);
      if (!nextProgram) {
        return { upgraded: false, reason: 'Next tier program not found' };
      }

      // Check if requirements are met
      const requirementsCheck = nextProgram.checkRequirements(partner);
      
      if (requirementsCheck.met && nextProgram.autoUpgrade) {
        const oldTier = partner.tier;
        partner.tier = nextTier;
        partner.commissionRate = nextProgram.commissionRate;
        partner.revenueSharePercent = nextProgram.commissionRate;
        await partner.save();

        return {
          upgraded: true,
          oldTier,
          newTier: nextTier,
          message: `Congratulations! You've been upgraded to ${nextTier} tier`,
        };
      }

      return {
        upgraded: false,
        requirements: requirementsCheck.requirements,
      };
    } catch (error) {
      console.error('Error checking tier upgrade:', error);
      throw error;
    }
  }

  /**
   * Get partner earnings report
   * @param {string} partnerId - Partner ID
   * @param {Object} filters - Date filters
   * @returns {Promise<Object>} Earnings report
   */
  async getEarningsReport(partnerId, filters = {}) {
    try {
      const partner = await Partner.findOne({ partnerId });
      if (!partner) {
        throw new Error('Partner not found');
      }

      const dateRange = {
        startDate: filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: filters.endDate || new Date(),
      };

      // Get referrals in date range
      const referrals = await PartnerReferral.find({
        partnerId: partner._id,
        createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate },
      }).sort({ createdAt: -1 });

      // Calculate earnings by status
      const earnings = {
        total: 0,
        paid: 0,
        pending: 0,
        eligible: 0,
      };

      const conversions = [];

      referrals.forEach(ref => {
        if (ref.status === 'converted') {
          earnings.total += ref.commissionAmount;
          
          if (ref.payoutStatus === 'paid') {
            earnings.paid += ref.commissionAmount;
          } else if (ref.payoutStatus === 'eligible') {
            earnings.eligible += ref.commissionAmount;
          } else if (ref.payoutStatus === 'scheduled') {
            earnings.pending += ref.commissionAmount;
          }

          conversions.push({
            referralId: ref.referralId,
            referredType: ref.referredType,
            convertedAt: ref.convertedAt,
            commissionAmount: ref.commissionAmount,
            payoutStatus: ref.payoutStatus,
          });
        }
      });

      // Daily breakdown
      const dailyBreakdown = await PartnerReferral.aggregate([
        {
          $match: {
            partnerId: partner._id,
            status: 'converted',
            convertedAt: { $gte: dateRange.startDate, $lte: dateRange.endDate },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$convertedAt' } },
            count: { $sum: 1 },
            commission: { $sum: '$commissionAmount' },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      return {
        success: true,
        summary: earnings,
        conversions,
        dailyBreakdown,
        dateRange,
        totalReferrals: referrals.length,
        conversionCount: conversions.length,
      };
    } catch (error) {
      console.error('Error getting earnings report:', error);
      throw error;
    }
  }

  /**
   * Get partner referrals history
   * @param {string} partnerId - Partner ID
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>} Referrals list
   */
  async getReferrals(partnerId, filters = {}) {
    try {
      const partner = await Partner.findOne({ partnerId });
      if (!partner) {
        throw new Error('Partner not found');
      }

      const query = { partnerId: partner._id };

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.referredType) {
        query.referredType = filters.referredType;
      }

      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
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

      return {
        success: true,
        referrals,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error getting referrals:', error);
      throw error;
    }
  }

  /**
   * Process commission payout
   * @param {string} partnerId - Partner ID
   * @param {Object} payoutData - Payout details
   * @returns {Promise<Object>} Payout result
   */
  async processPayout(partnerId, payoutData) {
    try {
      const partner = await Partner.findOne({ partnerId });
      if (!partner) {
        throw new Error('Partner not found');
      }

      // Get eligible referrals
      const eligibleReferrals = await PartnerReferral.getPendingPayouts(partner._id);
      
      if (eligibleReferrals.length === 0) {
        throw new Error('No eligible referrals for payout');
      }

      const totalAmount = eligibleReferrals.reduce((sum, ref) => sum + ref.commissionAmount, 0);

      if (totalAmount <= 0) {
        throw new Error('No commission available for payout');
      }

      // Create payout record
      const payoutId = 'PAY-' + crypto.randomBytes(4).toString('hex').toUpperCase();

      // Process each referral
      for (const referral of eligibleReferrals) {
        await referral.processPayout({
          payoutId,
          amount: referral.commissionAmount,
          method: payoutData.method,
        });
      }

      // Update partner
      await partner.recordPayout(totalAmount);

      return {
        success: true,
        payoutId,
        amount: totalAmount,
        referralCount: eligibleReferrals.length,
        method: payoutData.method,
        message: 'Payout processed successfully',
      };
    } catch (error) {
      console.error('Error processing payout:', error);
      throw error;
    }
  }

  /**
   * Get all partner programs
   * @returns {Promise<Array>} List of partner programs
   */
  async getPartnerPrograms() {
    try {
      return await PartnerProgram.getAllTiers();
    } catch (error) {
      console.error('Error getting partner programs:', error);
      throw error;
    }
  }

  /**
   * Get partner leaderboard
   * @param {number} limit - Number of partners to return
   * @returns {Promise<Array>} Top partners
   */
  async getLeaderboard(limit = 10) {
    try {
      return await Partner.getLeaderboard(limit);
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      throw error;
    }
  }

  /**
   * Update partner profile
   * @param {string} partnerId - Partner ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated partner
   */
  async updateProfile(partnerId, updateData) {
    try {
      const partner = await Partner.findOne({ partnerId });
      if (!partner) {
        throw new Error('Partner not found');
      }

      // Only allow updating certain fields
      const allowedUpdates = ['contactInfo', 'companyDetails', 'notificationPreferences'];
      
      allowedUpdates.forEach(field => {
        if (updateData[field]) {
          partner[field] = { ...partner[field], ...updateData[field] };
        }
      });

      await partner.save();

      return {
        success: true,
        partner,
        message: 'Profile updated successfully',
      };
    } catch (error) {
      console.error('Error updating partner profile:', error);
      throw error;
    }
  }

  /**
   * Suspend partner account
   * @param {string} partnerId - Partner ID
   * @param {string} reason - Suspension reason
   * @returns {Promise<Object>} Result
   */
  async suspendPartner(partnerId, reason) {
    try {
      const partner = await Partner.findOne({ partnerId });
      if (!partner) {
        throw new Error('Partner not found');
      }

      partner.status = 'suspended';
      await partner.save();

      return {
        success: true,
        message: 'Partner account suspended',
        reason,
      };
    } catch (error) {
      console.error('Error suspending partner:', error);
      throw error;
    }
  }

  /**
   * Reactivate partner account
   * @param {string} partnerId - Partner ID
   * @returns {Promise<Object>} Result
   */
  async reactivatePartner(partnerId) {
    try {
      const partner = await Partner.findOne({ partnerId });
      if (!partner) {
        throw new Error('Partner not found');
      }

      partner.status = 'active';
      await partner.save();

      return {
        success: true,
        message: 'Partner account reactivated',
      };
    } catch (error) {
      console.error('Error reactivating partner:', error);
      throw error;
    }
  }
}

module.exports = new PartnerService();
