/**
 * Partner Cron Jobs
 * Scheduled tasks for partner operations
 * Handles commission calculations, tier upgrades, and reports
 */

const Partner = require('../models/Partner.js');
const PartnerReferral = require('../models/PartnerReferral.js');
const PartnerProgram = require('../models/PartnerProgram.js');
const APIToken = require('../models/APIToken.js');
const WhiteLabelConfig = require('../models/WhiteLabelConfig.js');

/**
 * Process tier upgrades for eligible partners
 * Runs daily
 */
const processTierUpgrades = async () => {
  console.log('[PartnerCron] Processing tier upgrades...');
  
  try {
    const partners = await Partner.find({
      status: 'active',
      tier: { $in: ['bronze', 'silver', 'gold'] },
    });

    let upgradedCount = 0;

    for (const partner of partners) {
      try {
        const tiers = ['bronze', 'silver', 'gold', 'platinum'];
        const currentIndex = tiers.indexOf(partner.tier);
        const nextTier = tiers[currentIndex + 1];

        if (!nextTier) continue;

        const nextProgram = await PartnerProgram.getByTier(nextTier);
        if (!nextProgram || !nextProgram.autoUpgrade) continue;

        const requirementsCheck = nextProgram.checkRequirements(partner);
        
        if (requirementsCheck.met) {
          const oldTier = partner.tier;
          partner.tier = nextTier;
          partner.commissionRate = nextProgram.commissionRate;
          partner.revenueSharePercent = nextProgram.commissionRate;
          await partner.save();

          upgradedCount++;
          console.log(`[PartnerCron] Upgraded partner ${partner.partnerId} from ${oldTier} to ${nextTier}`);
        }
      } catch (error) {
        console.error(`[PartnerCron] Error processing tier upgrade for ${partner.partnerId}:`, error);
      }
    }

    console.log(`[PartnerCron] Tier upgrades completed. ${upgradedCount} partners upgraded.`);
    return { success: true, upgradedCount };
  } catch (error) {
    console.error('[PartnerCron] Error processing tier upgrades:', error);
    throw error;
  }
};

/**
 * Calculate pending commissions
 * Runs hourly
 */
const calculateCommissions = async () => {
  console.log('[PartnerCron] Calculating commissions...');
  
  try {
    const pendingReferrals = await PartnerReferral.find({
      status: 'converted',
      commissionAmount: 0,
    }).populate('partnerId');

    let calculatedCount = 0;

    for (const referral of pendingReferrals) {
      try {
        const partner = referral.partnerId;
        if (!partner || partner.status !== 'active') continue;

        await referral.calculateCommission(partner.commissionRate);
        await referral.save();
        await partner.addRevenue(referral.conversionValue);

        calculatedCount++;
      } catch (error) {
        console.error(`[PartnerCron] Error calculating commission for ${referral.referralId}:`, error);
      }
    }

    console.log(`[PartnerCron] Commission calculation completed. ${calculatedCount} referrals processed.`);
    return { success: true, calculatedCount };
  } catch (error) {
    console.error('[PartnerCron] Error calculating commissions:', error);
    throw error;
  }
};

/**
 * Process expired referrals
 * Runs daily
 */
const processExpiredReferrals = async () => {
  console.log('[PartnerCron] Processing expired referrals...');
  
  try {
    const now = new Date();
    
    const expiredReferrals = await PartnerReferral.find({
      status: { $nin: ['converted', 'expired', 'rejected'] },
      expiresAt: { $lt: now },
    });

    let expiredCount = 0;

    for (const referral of expiredReferrals) {
      try {
        referral.status = 'expired';
        referral.statusHistory.push({
          status: 'expired',
          notes: 'Referral link expired automatically',
        });
        await referral.save();
        expiredCount++;
      } catch (error) {
        console.error(`[PartnerCron] Error processing expired referral ${referral.referralId}:`, error);
      }
    }

    console.log(`[PartnerCron] Expired referrals processed. ${expiredCount} referrals marked as expired.`);
    return { success: true, expiredCount };
  } catch (error) {
    console.error('[PartnerCron] Error processing expired referrals:', error);
    throw error;
  }
};

/**
 * Update partner metrics
 * Runs daily
 */
const updatePartnerMetrics = async () => {
  console.log('[PartnerCron] Updating partner metrics...');
  
  try {
    const partners = await Partner.find({ status: 'active' });
    let updatedCount = 0;

    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);
    const yearAgo = new Date(now - 365 * 24 * 60 * 60 * 1000);

    for (const partner of partners) {
      try {
        const stats30Days = await PartnerReferral.getPartnerStats(partner._id, {
          startDate: thirtyDaysAgo,
          endDate: now,
        });

        const stats90Days = await PartnerReferral.getPartnerStats(partner._id, {
          startDate: ninetyDaysAgo,
          endDate: now,
        });

        const statsYear = await PartnerReferral.getPartnerStats(partner._id, {
          startDate: yearAgo,
          endDate: now,
        });

        partner.metrics.last30DaysRevenue = stats30Days.totalCommission || 0;
        partner.metrics.last90DaysRevenue = stats90Days.totalCommission || 0;
        partner.metrics.last12MonthsRevenue = statsYear.totalCommission || 0;
        partner.metrics.averageCommission = stats30Days.converted > 0
          ? stats30Days.totalCommission / stats30Days.converted
          : 0;
        partner.metrics.conversionRate = stats30Days.totalReferrals > 0
          ? (stats30Days.converted / stats30Days.totalReferrals) * 100
          : 0;

        await partner.save();
        updatedCount++;
      } catch (error) {
        console.error(`[PartnerCron] Error updating metrics for ${partner.partnerId}:`, error);
      }
    }

    console.log(`[PartnerCron] Partner metrics updated. ${updatedCount} partners processed.`);
    return { success: true, updatedCount };
  } catch (error) {
    console.error('[PartnerCron] Error updating partner metrics:', error);
    throw error;
  }
};

/**
 * Clean up expired API tokens
 * Runs daily
 */
const cleanupExpiredTokens = async () => {
  console.log('[PartnerCron] Cleaning up expired API tokens...');
  
  try {
    const now = new Date();
    
    const result = await APIToken.updateMany(
      {
        status: 'active',
        expiresAt: { $lt: now },
      },
      {
        $set: { status: 'expired' },
      }
    );

    console.log(`[PartnerCron] Expired tokens cleanup completed. ${result.modifiedCount} tokens updated.`);
    return { success: true, expiredCount: result.modifiedCount };
  } catch (error) {
    console.error('[PartnerCron] Error cleaning up expired tokens:', error);
    throw error;
  }
};

/**
 * Reset API rate limit windows
 * Runs every minute
 */
const resetRateLimitWindows = async () => {
  try {
    const now = new Date();
    
    const tokens = await APIToken.find({
      'rateLimitWindows.resetAt': { $lt: now },
    });

    for (const token of tokens) {
      try {
        token.rateLimitWindows = token.rateLimitWindows.map(window => {
          if (window.resetAt < now) {
            const resetAt = new Date(now);
            switch (window.window) {
              case 'minute':
                resetAt.setMinutes(resetAt.getMinutes() + 1);
                break;
              case 'hour':
                resetAt.setHours(resetAt.getHours() + 1);
                break;
              case 'day':
                resetAt.setDate(resetAt.getDate() + 1);
                break;
              case 'month':
                resetAt.setMonth(resetAt.getMonth() + 1);
                break;
            }
            return { ...window, used: 0, resetAt };
          }
          return window;
        });

        await token.save();
      } catch (error) {
        console.error(`[PartnerCron] Error resetting rate limits for ${token.tokenId}:`, error);
      }
    }

    return { success: true, processedCount: tokens.length };
  } catch (error) {
    console.error('[PartnerCron] Error resetting rate limit windows:', error);
    throw error;
  }
};

/**
 * Generate partner reports
 * Runs weekly (Mondays)
 */
const generatePartnerReports = async () => {
  console.log('[PartnerCron] Generating partner reports...');
  
  try {
    const partners = await Partner.find({ status: 'active' });
    const reports = [];

    const now = new Date();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    for (const partner of partners) {
      try {
        const stats = await PartnerReferral.getPartnerStats(partner._id, {
          startDate: weekAgo,
          endDate: now,
        });

        if (stats.totalReferrals > 0 || stats.totalCommission > 0) {
          const report = {
            partnerId: partner.partnerId,
            period: { start: weekAgo, end: now },
            referrals: stats.totalReferrals,
            clicks: stats.totalClicks,
            conversions: stats.converted,
            commission: stats.totalCommission,
            pendingPayout: stats.pendingCommission,
          };

          reports.push(report);

          if (partner.notificationPreferences?.emailOnCommission) {
            console.log(`[PartnerCron] Report generated for ${partner.partnerId}`);
          }
        }
      } catch (error) {
        console.error(`[PartnerCron] Error generating report for ${partner.partnerId}:`, error);
      }
    }

    console.log(`[PartnerCron] Partner reports generated. ${reports.length} reports created.`);
    return { success: true, reportCount: reports.length, reports };
  } catch (error) {
    console.error('[PartnerCron] Error generating partner reports:', error);
    throw error;
  }
};

/**
 * Check SSL certificate expiry
 * Runs daily
 */
const checkSSLCertificates = async () => {
  console.log('[PartnerCron] Checking SSL certificates...');
  
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now + 30 * 24 * 60 * 60 * 1000);

    const configs = await WhiteLabelConfig.find({
      'sslCertificate.expiresAt': { $lt: thirtyDaysFromNow },
      'sslCertificate.autoRenew': true,
    });

    let renewedCount = 0;

    for (const config of configs) {
      try {
        console.log(`[PartnerCron] SSL certificate for ${config.customDomain} needs renewal`);
        
        if (config.sslCertificate) {
          config.sslCertificate.expiresAt = new Date(now + 90 * 24 * 60 * 60 * 1000);
          config.sslCertificate.lastCheckedAt = now;
          await config.save();
          renewedCount++;
        }
      } catch (error) {
        console.error(`[PartnerCron] Error checking SSL for ${config.configId}:`, error);
      }
    }

    console.log(`[PartnerCron] SSL certificate check completed. ${renewedCount} certificates renewed.`);
    return { success: true, renewedCount };
  } catch (error) {
    console.error('[PartnerCron] Error checking SSL certificates:', error);
    throw error;
  }
};

/**
 * Cleanup old usage history
 * Runs monthly
 */
const cleanupUsageHistory = async () => {
  console.log('[PartnerCron] Cleaning up old usage history...');
  
  try {
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const tokens = await APIToken.find({
      'usageHistory.timestamp': { $lt: threeMonthsAgo },
    });

    let cleanedCount = 0;

    for (const token of tokens) {
      try {
        token.usageHistory = token.usageHistory.filter(
          record => record.timestamp > threeMonthsAgo
        );
        await token.save();
        cleanedCount++;
      } catch (error) {
        console.error(`[PartnerCron] Error cleaning usage history for ${token.tokenId}:`, error);
      }
    }

    console.log(`[PartnerCron] Usage history cleanup completed. ${cleanedCount} tokens cleaned.`);
    return { success: true, cleanedCount };
  } catch (error) {
    console.error('[PartnerCron] Error cleaning up usage history:', error);
    throw error;
  }
};

/**
 * Initialize all cron jobs
 * @param {Object} scheduler - Cron scheduler instance
 */
const initializePartnerCronJobs = (scheduler) => {
  console.log('[PartnerCron] Initializing partner cron jobs...');

  // Daily jobs
  scheduler.schedule('0 0 * * *', processTierUpgrades);
  scheduler.schedule('0 1 * * *', processExpiredReferrals);
  scheduler.schedule('0 2 * * *', updatePartnerMetrics);
  scheduler.schedule('0 3 * * *', cleanupExpiredTokens);
  scheduler.schedule('0 4 * * *', checkSSLCertificates);

  // Hourly jobs
  scheduler.schedule('0 * * * *', calculateCommissions);

  // Every minute
  scheduler.schedule('* * * * *', resetRateLimitWindows);

  // Weekly (Mondays at 9 AM)
  scheduler.schedule('0 9 * * 1', generatePartnerReports);

  // Monthly (1st of month at 5 AM)
  scheduler.schedule('0 5 1 * *', cleanupUsageHistory);

  console.log('[PartnerCron] Partner cron jobs initialized successfully');
};

module.exports = {
  processTierUpgrades,
  calculateCommissions,
  processExpiredReferrals,
  updatePartnerMetrics,
  cleanupExpiredTokens,
  resetRateLimitWindows,
  generatePartnerReports,
  checkSSLCertificates,
  cleanupUsageHistory,
  initializePartnerCronJobs,
};
