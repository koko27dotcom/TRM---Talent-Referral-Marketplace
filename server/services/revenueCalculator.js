/**
 * RevenueCalculator Service
 * Handles real-time revenue calculations, MRR tracking, and predictive analytics
 * Provides comprehensive financial analytics for the TRM platform
 */

const {
  BillingRecord,
  Subscription,
  Job,
  Referral,
  Application,
  Company,
  User,
  PayoutRequest,
  RevenueAnalytics,
} = require('../models/index.js');

class RevenueCalculator {
  constructor() {
    this.currency = 'MMK';
  }

  // ==================== REAL-TIME REVENUE CALCULATIONS ====================

  /**
   * Calculate total revenue for a specific date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Revenue summary
   */
  async calculateRevenueInRange(startDate, endDate) {
    try {
      // Get all paid billing records in range
      const billingRecords = await BillingRecord.find({
        status: { $in: ['paid', 'partial'] },
        'payment.paidAt': {
          $gte: startDate,
          $lte: endDate,
        },
      });

      const totalRevenue = billingRecords.reduce((sum, record) => sum + record.amountPaid, 0);

      // Calculate by source
      const revenueBySource = await this.calculateRevenueBySource(startDate, endDate);

      return {
        totalRevenue,
        billingRecordCount: billingRecords.length,
        revenueBySource,
        startDate,
        endDate,
      };
    } catch (error) {
      console.error('Error calculating revenue in range:', error);
      throw error;
    }
  }

  /**
   * Calculate revenue breakdown by source
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Revenue by source
   */
  async calculateRevenueBySource(startDate, endDate) {
    try {
      const billingRecords = await BillingRecord.find({
        status: { $in: ['paid', 'partial'] },
        'payment.paidAt': {
          $gte: startDate,
          $lte: endDate,
        },
      });

      const sourceMap = new Map();

      billingRecords.forEach(record => {
        record.items.forEach(item => {
          const source = this.mapItemTypeToSource(item.type);
          const current = sourceMap.get(source) || { amount: 0, count: 0 };
          sourceMap.set(source, {
            amount: current.amount + item.amount,
            count: current.count + 1,
          });
        });
      });

      // Calculate percentages
      const totalAmount = Array.from(sourceMap.values()).reduce((sum, val) => sum + val.amount, 0);

      return Array.from(sourceMap.entries()).map(([source, data]) => ({
        source,
        amount: data.amount,
        count: data.count,
        percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      })).sort((a, b) => b.amount - a.amount);
    } catch (error) {
      console.error('Error calculating revenue by source:', error);
      throw error;
    }
  }

  /**
   * Map billing item type to revenue source
   */
  mapItemTypeToSource(itemType) {
    const mapping = {
      subscription: 'subscriptions',
      per_hire_fee: 'per_hire_fees',
      overage: 'overage',
      upgrade: 'subscriptions',
      proration: 'subscriptions',
      refund: 'other',
      other: 'other',
    };
    return mapping[itemType] || 'other';
  }

  /**
   * Calculate revenue per company
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Number} limit - Number of top companies to return
   * @returns {Promise<Array>} Revenue by company
   */
  async calculateRevenueByCompany(startDate, endDate, limit = 10) {
    try {
      const revenueByCompany = await BillingRecord.aggregate([
        {
          $match: {
            status: { $in: ['paid', 'partial'] },
            'payment.paidAt': {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },
        {
          $group: {
            _id: '$companyId',
            amount: { $sum: '$amountPaid' },
            recordCount: { $sum: 1 },
          },
        },
        {
          $sort: { amount: -1 },
        },
        {
          $limit: limit,
        },
        {
          $lookup: {
            from: 'companies',
            localField: '_id',
            foreignField: '_id',
            as: 'company',
          },
        },
        {
          $unwind: '$company',
        },
        {
          $project: {
            companyId: '$_id',
            companyName: '$company.name',
            amount: 1,
            recordCount: 1,
          },
        },
      ]);

      // Get job counts for each company
      for (const company of revenueByCompany) {
        const jobCount = await Job.countDocuments({
          companyId: company.companyId,
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        });
        company.jobCount = jobCount;
      }

      return revenueByCompany;
    } catch (error) {
      console.error('Error calculating revenue by company:', error);
      throw error;
    }
  }

  // ==================== MRR CALCULATIONS ====================

  /**
   * Calculate current MRR (Monthly Recurring Revenue)
   * @returns {Promise<Object>} MRR data
   */
  async calculateMRR() {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Get all active subscriptions
      const activeSubscriptions = await Subscription.find({
        status: 'active',
        currentPeriodEnd: { $gte: now },
      });

      let totalMrr = 0;
      let newMrr = 0;
      let expansionMrr = 0;
      let contractionMrr = 0;
      let churnedMrr = 0;
      let reactivationMrr = 0;

      // Calculate base MRR from active subscriptions
      activeSubscriptions.forEach(sub => {
        const monthlyAmount = this.normalizeToMonthly(sub.price, sub.billingCycle);
        totalMrr += monthlyAmount;
      });

      // Calculate MRR movements for the current month
      const monthlyBillingRecords = await BillingRecord.find({
        status: { $in: ['paid', 'partial'] },
        'payment.paidAt': {
          $gte: startOfMonth,
          $lte: endOfMonth,
        },
      }).populate('subscriptionId');

      monthlyBillingRecords.forEach(record => {
        record.items.forEach(item => {
          const monthlyAmount = this.normalizeToMonthly(item.amount, 'monthly');
          
          switch (item.type) {
            case 'subscription':
              // Check if this is a new subscription or renewal
              if (record.subscriptionId && this.isNewSubscription(record.subscriptionId, startOfMonth)) {
                newMrr += monthlyAmount;
              }
              break;
            case 'upgrade':
              expansionMrr += monthlyAmount;
              break;
            case 'proration':
              // Determine if expansion or contraction based on amount
              if (item.amount > 0) {
                expansionMrr += monthlyAmount;
              } else {
                contractionMrr += Math.abs(monthlyAmount);
              }
              break;
          }
        });
      });

      // Calculate churned MRR from cancelled subscriptions
      const cancelledThisMonth = await Subscription.find({
        status: 'cancelled',
        cancelledAt: {
          $gte: startOfMonth,
          $lte: endOfMonth,
        },
      });

      cancelledThisMonth.forEach(sub => {
        churnedMrr += this.normalizeToMonthly(sub.price, sub.billingCycle);
      });

      // Calculate ARR
      const arr = totalMrr * 12;

      // Calculate net MRR growth
      const netMrrGrowth = newMrr + expansionMrr - contractionMrr - churnedMrr + reactivationMrr;

      return {
        mrr: totalMrr,
        arr,
        netMrrGrowth,
        breakdown: {
          newMrr,
          expansionMrr,
          contractionMrr,
          churnedMrr,
          reactivationMrr,
        },
        activeSubscriptions: activeSubscriptions.length,
        calculatedAt: new Date(),
      };
    } catch (error) {
      console.error('Error calculating MRR:', error);
      throw error;
    }
  }

  /**
   * Normalize subscription amount to monthly equivalent
   */
  normalizeToMonthly(amount, billingCycle) {
    switch (billingCycle) {
      case 'yearly':
        return amount / 12;
      case 'quarterly':
        return amount / 3;
      case 'monthly':
      default:
        return amount;
    }
  }

  /**
   * Check if subscription is new (created within the period)
   */
  isNewSubscription(subscription, periodStart) {
    const createdAt = new Date(subscription.createdAt);
    return createdAt >= periodStart;
  }

  // ==================== REVENUE PER METRICS ====================

  /**
   * Calculate revenue per job posting
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Revenue per job metrics
   */
  async calculateRevenuePerJob(startDate, endDate) {
    try {
      const totalRevenue = await this.calculateRevenueInRange(startDate, endDate);
      
      const jobsPosted = await Job.countDocuments({
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      });

      const filledJobs = await Job.countDocuments({
        status: 'filled',
        filledAt: {
          $gte: startDate,
          $lte: endDate,
        },
      });

      return {
        totalJobsPosted: jobsPosted,
        filledJobs,
        totalRevenue: totalRevenue.totalRevenue,
        revenuePerJob: jobsPosted > 0 ? totalRevenue.totalRevenue / jobsPosted : 0,
        revenuePerFilledJob: filledJobs > 0 ? totalRevenue.totalRevenue / filledJobs : 0,
        fillRate: jobsPosted > 0 ? (filledJobs / jobsPosted) * 100 : 0,
      };
    } catch (error) {
      console.error('Error calculating revenue per job:', error);
      throw error;
    }
  }

  /**
   * Calculate revenue per company
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Revenue per company metrics
   */
  async calculateRevenuePerCompany(startDate, endDate) {
    try {
      const totalRevenue = await this.calculateRevenueInRange(startDate, endDate);
      
      const activeCompanies = await Company.countDocuments({
        status: 'active',
      });

      const payingCompanies = await BillingRecord.distinct('companyId', {
        status: { $in: ['paid', 'partial'] },
        'payment.paidAt': {
          $gte: startDate,
          $lte: endDate,
        },
      });

      return {
        totalCompanies: activeCompanies,
        payingCompanies: payingCompanies.length,
        totalRevenue: totalRevenue.totalRevenue,
        revenuePerCompany: activeCompanies > 0 ? totalRevenue.totalRevenue / activeCompanies : 0,
        revenuePerPayingCompany: payingCompanies.length > 0 ? totalRevenue.totalRevenue / payingCompanies.length : 0,
        conversionRate: activeCompanies > 0 ? (payingCompanies.length / activeCompanies) * 100 : 0,
      };
    } catch (error) {
      console.error('Error calculating revenue per company:', error);
      throw error;
    }
  }

  // ==================== REFERRER METRICS ====================

  /**
   * Calculate referrer activation metrics
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Referrer activation metrics
   */
  async calculateReferrerActivation(startDate, endDate) {
    try {
      // Total referrers (users who have made at least one referral)
      const totalReferrers = await Referral.distinct('referrerId');
      
      // Active referrers (made a referral in the period)
      const activeReferrers = await Referral.distinct('referrerId', {
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      });

      // New referrers (first referral in the period)
      const allReferrals = await Referral.find().sort({ createdAt: 1 });
      const referrerFirstReferral = new Map();
      
      allReferrals.forEach(referral => {
        const referrerId = referral.referrerId.toString();
        if (!referrerFirstReferral.has(referrerId)) {
          referrerFirstReferral.set(referrerId, referral.createdAt);
        }
      });

      let newReferrers = 0;
      referrerFirstReferral.forEach((firstReferralDate, referrerId) => {
        if (firstReferralDate >= startDate && firstReferralDate <= endDate) {
          newReferrers++;
        }
      });

      // Calculate average referrals per referrer
      const totalReferrals = await Referral.countDocuments({
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      });

      const avgReferralsPerReferrer = activeReferrers.length > 0 
        ? totalReferrals / activeReferrers.length 
        : 0;

      return {
        totalReferrers: totalReferrers.length,
        activeReferrers: activeReferrers.length,
        newReferrers,
        activationRate: totalReferrers.length > 0 
          ? (activeReferrers.length / totalReferrers.length) * 100 
          : 0,
        avgReferralsPerReferrer,
        totalReferrals,
      };
    } catch (error) {
      console.error('Error calculating referrer activation:', error);
      throw error;
    }
  }

  // ==================== TIME-TO-FIRST-HIRE METRICS ====================

  /**
   * Calculate time-to-first-hire metrics
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Time-to-first-hire metrics
   */
  async calculateTimeToFirstHire(startDate, endDate) {
    try {
      // Find all successful hires in the period
      const successfulHires = await Referral.find({
        status: 'hired',
        'statusHistory': {
          $elemMatch: {
            status: 'hired',
            changedAt: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },
      }).populate('jobId');

      const daysToHire = [];

      for (const hire of successfulHires) {
        const jobPostedDate = hire.jobId?.createdAt;
        const hireDate = hire.statusHistory.find(h => h.status === 'hired')?.changedAt;
        
        if (jobPostedDate && hireDate) {
          const days = Math.ceil((hireDate - jobPostedDate) / (1000 * 60 * 60 * 24));
          daysToHire.push(days);
        }
      }

      if (daysToHire.length === 0) {
        return {
          avgDaysToFirstHire: 0,
          medianDaysToFirstHire: 0,
          minDaysToFirstHire: 0,
          maxDaysToFirstHire: 0,
          hiresThisPeriod: 0,
        };
      }

      // Calculate statistics
      const sorted = daysToHire.sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);
      const avg = sum / sorted.length;
      const median = sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];

      return {
        avgDaysToFirstHire: Math.round(avg),
        medianDaysToFirstHire: Math.round(median),
        minDaysToFirstHire: sorted[0],
        maxDaysToFirstHire: sorted[sorted.length - 1],
        hiresThisPeriod: sorted.length,
      };
    } catch (error) {
      console.error('Error calculating time to first hire:', error);
      throw error;
    }
  }

  // ==================== CONVERSION RATE CALCULATIONS ====================

  /**
   * Calculate conversion rates
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Conversion rates
   */
  async calculateConversionRates(startDate, endDate) {
    try {
      // Referral to Application
      const totalReferrals = await Referral.countDocuments({
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      });

      const referralsWithApplications = await Referral.countDocuments({
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
        status: { $in: ['applied', 'screening', 'interview', 'offer', 'hired'] },
      });

      // Application to Interview
      const totalApplications = await Application.countDocuments({
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      });

      const applicationsToInterview = await Application.countDocuments({
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
        status: { $in: ['interview', 'offer', 'hired'] },
      });

      // Interview to Hire
      const totalInterviews = await Application.countDocuments({
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
        status: { $in: ['interview', 'offer', 'hired'] },
      });

      const interviewsToHire = await Application.countDocuments({
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
        status: 'hired',
      });

      // Referral to Hire
      const referralsToHire = await Referral.countDocuments({
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
        status: 'hired',
      });

      // Job Post to Hire
      const totalJobs = await Job.countDocuments({
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      });

      const jobsFilled = await Job.countDocuments({
        status: 'filled',
        filledAt: {
          $gte: startDate,
          $lte: endDate,
        },
      });

      return {
        referralToApplication: totalReferrals > 0 ? (referralsWithApplications / totalReferrals) * 100 : 0,
        applicationToInterview: totalApplications > 0 ? (applicationsToInterview / totalApplications) * 100 : 0,
        interviewToHire: totalInterviews > 0 ? (interviewsToHire / totalInterviews) * 100 : 0,
        referralToHire: totalReferrals > 0 ? (referralsToHire / totalReferrals) * 100 : 0,
        jobPostToHire: totalJobs > 0 ? (jobsFilled / totalJobs) * 100 : 0,
        rawCounts: {
          totalReferrals,
          referralsWithApplications,
          totalApplications,
          applicationsToInterview,
          totalInterviews,
          interviewsToHire,
          referralsToHire,
          totalJobs,
          jobsFilled,
        },
      };
    } catch (error) {
      console.error('Error calculating conversion rates:', error);
      throw error;
    }
  }

  // ==================== COHORT ANALYSIS ====================

  /**
   * Generate cohort analysis
   * @param {Number} months - Number of months to analyze
   * @returns {Promise<Array>} Cohort data
   */
  async generateCohortAnalysis(months = 12) {
    try {
      const cohorts = [];
      const now = new Date();

      for (let i = 0; i < months; i++) {
        const cohortMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const cohortMonthStr = cohortMonth.toISOString().slice(0, 7); // YYYY-MM

        // Find companies that started in this cohort month
        const cohortCompanies = await Company.find({
          createdAt: {
            $gte: cohortMonth,
            $lt: new Date(cohortMonth.getFullYear(), cohortMonth.getMonth() + 1, 1),
          },
        });

        const cohortSize = cohortCompanies.length;
        if (cohortSize === 0) continue;

        const cohortCompanyIds = cohortCompanies.map(c => c._id);
        const retentionRates = [];
        const revenue = [];

        // Calculate retention and revenue for each subsequent month
        for (let j = 0; j <= i; j++) {
          const monthStart = new Date(cohortMonth.getFullYear(), cohortMonth.getMonth() + j, 1);
          const monthEnd = new Date(cohortMonth.getFullYear(), cohortMonth.getMonth() + j + 1, 0);

          // Active companies (made a payment or have active subscription)
          const activeCompanies = await BillingRecord.distinct('companyId', {
            companyId: { $in: cohortCompanyIds },
            status: { $in: ['paid', 'partial'] },
            'payment.paidAt': {
              $gte: monthStart,
              $lte: monthEnd,
            },
          });

          const retentionRate = (activeCompanies.length / cohortSize) * 100;
          retentionRates.push({
            month: j,
            rate: retentionRate,
            activeCount: activeCompanies.length,
          });

          // Revenue from this cohort in this month
          const monthRevenue = await BillingRecord.aggregate([
            {
              $match: {
                companyId: { $in: cohortCompanyIds },
                status: { $in: ['paid', 'partial'] },
                'payment.paidAt': {
                  $gte: monthStart,
                  $lte: monthEnd,
                },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: '$amountPaid' },
              },
            },
          ]);

          revenue.push({
            month: j,
            amount: monthRevenue[0]?.total || 0,
          });
        }

        // Calculate LTV (sum of all revenue from this cohort)
        const totalRevenue = revenue.reduce((sum, r) => sum + r.amount, 0);
        const ltv = totalRevenue / cohortSize;

        cohorts.push({
          cohortMonth: cohortMonthStr,
          cohortSize,
          retentionRates,
          revenue,
          ltv,
        });
      }

      return cohorts.reverse();
    } catch (error) {
      console.error('Error generating cohort analysis:', error);
      throw error;
    }
  }

  // ==================== PREDICTIVE ANALYTICS ====================

  /**
   * Generate revenue forecast
   * @param {Number} periods - Number of periods to forecast
   * @param {String} periodType - 'monthly' or 'weekly'
   * @returns {Promise<Array>} Forecast data
   */
  async generateRevenueForecast(periods = 3, periodType = 'monthly') {
    try {
      // Get historical data
      const historicalData = await RevenueAnalytics.find({
        period: periodType === 'monthly' ? 'monthly' : 'weekly',
      })
        .sort({ date: -1 })
        .limit(12)
        .select('totalRevenue date');

      const revenues = historicalData.map(d => d.totalRevenue).reverse();
      
      if (revenues.length < 3) {
        // Not enough data, return simple projection
        const currentMrr = await this.calculateMRR();
        return this.generateSimpleForecast(currentMrr.mrr, periods, periodType);
      }

      // Calculate growth rate using linear regression
      const growthRate = this.calculateGrowthRate(revenues);
      
      // Calculate average and standard deviation for confidence intervals
      const avgRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length;
      const variance = revenues.reduce((sum, r) => sum + Math.pow(r - avgRevenue, 2), 0) / revenues.length;
      const stdDev = Math.sqrt(variance);

      // Generate forecast
      const forecast = [];
      const lastRevenue = revenues[revenues.length - 1];
      const now = new Date();

      for (let i = 1; i <= periods; i++) {
        const predictedRevenue = lastRevenue * Math.pow(1 + growthRate, i);
        
        let period;
        if (periodType === 'monthly') {
          period = new Date(now.getFullYear(), now.getMonth() + i, 1).toISOString().slice(0, 7);
        } else {
          const weekStart = new Date(now);
          weekStart.setDate(weekStart.getDate() + (i * 7));
          period = weekStart.toISOString().slice(0, 10);
        }

        forecast.push({
          period,
          predictedRevenue: Math.round(predictedRevenue),
          confidenceInterval: {
            lower: Math.round(predictedRevenue - (stdDev * 1.96)),
            upper: Math.round(predictedRevenue + (stdDev * 1.96)),
          },
          growthRate: growthRate * 100,
        });
      }

      return forecast;
    } catch (error) {
      console.error('Error generating revenue forecast:', error);
      throw error;
    }
  }

  /**
   * Calculate growth rate from historical data
   */
  calculateGrowthRate(revenues) {
    if (revenues.length < 2) return 0;
    
    // Calculate month-over-month growth rates
    const growthRates = [];
    for (let i = 1; i < revenues.length; i++) {
      if (revenues[i - 1] > 0) {
        growthRates.push((revenues[i] - revenues[i - 1]) / revenues[i - 1]);
      }
    }

    if (growthRates.length === 0) return 0;

    // Return average growth rate
    return growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
  }

  /**
   * Generate simple forecast when insufficient historical data
   */
  generateSimpleForecast(currentMrr, periods, periodType) {
    const forecast = [];
    const now = new Date();
    const periodRevenue = periodType === 'monthly' ? currentMrr : currentMrr / 4;

    for (let i = 1; i <= periods; i++) {
      let period;
      if (periodType === 'monthly') {
        period = new Date(now.getFullYear(), now.getMonth() + i, 1).toISOString().slice(0, 7);
      } else {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() + (i * 7));
        period = weekStart.toISOString().slice(0, 10);
      }

      forecast.push({
        period,
        predictedRevenue: Math.round(periodRevenue),
        confidenceInterval: {
          lower: Math.round(periodRevenue * 0.8),
          upper: Math.round(periodRevenue * 1.2),
        },
        growthRate: 0,
      });
    }

    return forecast;
  }

  // ==================== SNAPSHOT GENERATION ====================

  /**
   * Generate a complete revenue analytics snapshot
   * @param {String} period - 'daily', 'weekly', 'monthly'
   * @param {Date} date - Snapshot date
   * @returns {Promise<Object>} Complete analytics snapshot
   */
  async generateSnapshot(period = 'daily', date = new Date()) {
    try {
      const { startDate, endDate } = this.getPeriodRange(period, date);
      
      // Calculate all metrics
      const [
        revenue,
        revenueBySource,
        revenueByCompany,
        mrrData,
        referrerMetrics,
        timeToFirstHire,
        conversionRates,
        jobMetrics,
        subscriptionMetrics,
        referralMetrics,
        cohorts,
        forecast,
      ] = await Promise.all([
        this.calculateRevenueInRange(startDate, endDate),
        this.calculateRevenueBySource(startDate, endDate),
        this.calculateRevenueByCompany(startDate, endDate, 10),
        this.calculateMRR(),
        this.calculateReferrerActivation(startDate, endDate),
        this.calculateTimeToFirstHire(startDate, endDate),
        this.calculateConversionRates(startDate, endDate),
        this.calculateRevenuePerJob(startDate, endDate),
        this.calculateSubscriptionMetrics(startDate, endDate),
        this.calculateReferralMetrics(startDate, endDate),
        period === 'monthly' ? this.generateCohortAnalysis(6) : [],
        this.generateRevenueForecast(3, period === 'daily' ? 'weekly' : 'monthly'),
      ]);

      // Get previous period for growth calculation
      const prevPeriodRange = this.getPreviousPeriodRange(period, date);
      const prevRevenue = await this.calculateRevenueInRange(
        prevPeriodRange.startDate,
        prevPeriodRange.endDate
      );

      const revenueGrowth = revenue.totalRevenue - prevRevenue.totalRevenue;
      const revenueGrowthPercentage = prevRevenue.totalRevenue > 0
        ? (revenueGrowth / prevRevenue.totalRevenue) * 100
        : 0;

      const snapshot = {
        period,
        date,
        periodStart: startDate,
        periodEnd: endDate,
        totalRevenue: revenue.totalRevenue,
        previousPeriodRevenue: prevRevenue.totalRevenue,
        revenueGrowth,
        revenueGrowthPercentage,
        mrr: mrrData.mrr,
        arr: mrrData.arr,
        mrrGrowth: mrrData.netMrrGrowth,
        mrrBreakdown: mrrData.breakdown,
        revenueBySource,
        revenueByCompany,
        topCompaniesByRevenue: revenueByCompany.slice(0, 5),
        referrerMetrics,
        timeToFirstHire,
        conversionRates,
        jobMetrics,
        subscriptionMetrics,
        referralMetrics,
        cohorts,
        forecast,
        isFinal: period !== 'daily',
        calculatedAt: new Date(),
      };

      // Save snapshot to database
      await RevenueAnalytics.create(snapshot);

      return snapshot;
    } catch (error) {
      console.error('Error generating snapshot:', error);
      throw error;
    }
  }

  /**
   * Calculate subscription metrics
   */
  async calculateSubscriptionMetrics(startDate, endDate) {
    try {
      const activeSubscriptions = await Subscription.countDocuments({
        status: 'active',
      });

      const newSubscriptions = await Subscription.countDocuments({
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      });

      const cancelledSubscriptions = await Subscription.countDocuments({
        status: 'cancelled',
        cancelledAt: {
          $gte: startDate,
          $lte: endDate,
        },
      });

      const totalSubscriptions = await Subscription.countDocuments();
      const churnRate = totalSubscriptions > 0 
        ? (cancelledSubscriptions / totalSubscriptions) * 100 
        : 0;

      // Calculate ARPU
      const mrrData = await this.calculateMRR();
      const avgRevenuePerUser = activeSubscriptions > 0 
        ? mrrData.mrr / activeSubscriptions 
        : 0;

      return {
        activeSubscriptions,
        newSubscriptions,
        cancelledSubscriptions,
        churnRate,
        avgRevenuePerUser,
      };
    } catch (error) {
      console.error('Error calculating subscription metrics:', error);
      throw error;
    }
  }

  /**
   * Calculate referral metrics
   */
  async calculateReferralMetrics(startDate, endDate) {
    try {
      const totalReferrals = await Referral.countDocuments({
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      });

      const successfulReferrals = await Referral.countDocuments({
        status: 'hired',
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      });

      const payouts = await PayoutRequest.find({
        status: 'paid',
        'payment.paidAt': {
          $gte: startDate,
          $lte: endDate,
        },
      });

      const totalPayouts = payouts.reduce((sum, p) => sum + p.amount, 0);
      const avgPayoutAmount = payouts.length > 0 ? totalPayouts / payouts.length : 0;

      return {
        totalReferrals,
        successfulReferrals,
        totalPayouts,
        avgPayoutAmount,
      };
    } catch (error) {
      console.error('Error calculating referral metrics:', error);
      throw error;
    }
  }

  /**
   * Get period date range
   */
  getPeriodRange(period, date) {
    const d = new Date(date);
    let startDate, endDate;

    switch (period) {
      case 'daily':
        startDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
        endDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
        break;
      case 'weekly':
        const dayOfWeek = d.getDay();
        startDate = new Date(d);
        startDate.setDate(d.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'monthly':
        startDate = new Date(d.getFullYear(), d.getMonth(), 1);
        endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'yearly':
        startDate = new Date(d.getFullYear(), 0, 1);
        endDate = new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      default:
        startDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
        endDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
    }

    return { startDate, endDate };
  }

  /**
   * Get previous period range
   */
  getPreviousPeriodRange(period, date) {
    const d = new Date(date);
    let prevDate;

    switch (period) {
      case 'daily':
        prevDate = new Date(d);
        prevDate.setDate(d.getDate() - 1);
        break;
      case 'weekly':
        prevDate = new Date(d);
        prevDate.setDate(d.getDate() - 7);
        break;
      case 'monthly':
        prevDate = new Date(d);
        prevDate.setMonth(d.getMonth() - 1);
        break;
      case 'yearly':
        prevDate = new Date(d);
        prevDate.setFullYear(d.getFullYear() - 1);
        break;
      default:
        prevDate = new Date(d);
        prevDate.setDate(d.getDate() - 1);
    }

    return this.getPeriodRange(period, prevDate);
  }
}

// Export singleton instance
const revenueCalculator = new RevenueCalculator();
module.exports = RevenueCalculator;
