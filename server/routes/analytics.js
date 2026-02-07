/**
 * Analytics Routes
 * Provides comprehensive revenue analytics endpoints for the TRM platform
 * Enables data-driven decisions through real-time and historical data
 */

const express = require('express');
const { authenticate } = require('../middleware/auth.js');
const { requireRole } = require('../middleware/rbac.js');
const { RevenueAnalytics } = require('../models/index.js');
const { revenueCalculator } = require('../services/revenueCalculator.js');

const router = express.Router();

// ==================== MIDDLEWARE ====================

/**
 * Ensure user is admin
 */
const requireAdmin = requireRole(['admin']);

// ==================== REVENUE OVERVIEW ====================

/**
 * @route   GET /api/v1/analytics/revenue/overview
 * @desc    Get revenue overview dashboard data
 * @access  Admin only
 */
router.get('/revenue/overview', authenticate, requireAdmin, async (req, res) => {
  try {
    const { period = 'daily', days = 30 } = req.query;
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get latest snapshot
    const latestSnapshot = await RevenueAnalytics.getLatestSnapshot(period);
    
    // Get historical data for trends
    const historicalData = await RevenueAnalytics.getSnapshotsInRange(
      period,
      startDate,
      endDate
    );

    // Calculate summary metrics
    const summary = await RevenueAnalytics.getRevenueByDateRange(startDate, endDate);

    res.json({
      success: true,
      data: {
        current: latestSnapshot || null,
        historical: historicalData,
        summary: {
          totalRevenue: summary.totalRevenue,
          avgMrr: summary.avgMrr,
          totalReferrals: summary.totalReferrals,
          successfulReferrals: summary.successfulReferrals,
          conversionRate: summary.totalReferrals > 0 
            ? (summary.successfulReferrals / summary.totalReferrals) * 100 
            : 0,
        },
        period,
        dateRange: {
          start: startDate,
          end: endDate,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching revenue overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue overview',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/analytics/revenue/mrr
 * @desc    Get MRR data with trends
 * @access  Admin only
 */
router.get('/revenue/mrr', authenticate, requireAdmin, async (req, res) => {
  try {
    const { months = 12 } = req.query;
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));

    // Get MRR snapshots
    const mrrData = await RevenueAnalytics.find({
      period: 'monthly',
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .select('date mrr arr mrrGrowth mrrBreakdown')
      .sort({ date: 1 });

    // Calculate current MRR
    const currentMrr = await revenueCalculator.calculateMRR();

    res.json({
      success: true,
      data: {
        current: currentMrr,
        historical: mrrData,
        trends: {
          growthRate: mrrData.length > 1 
            ? ((mrrData[mrrData.length - 1].mrr - mrrData[0].mrr) / mrrData[0].mrr) * 100 
            : 0,
          avgMrr: mrrData.length > 0 
            ? mrrData.reduce((sum, d) => sum + d.mrr, 0) / mrrData.length 
            : 0,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching MRR data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch MRR data',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/analytics/revenue/by-source
 * @desc    Get revenue breakdown by source
 * @access  Admin only
 */
router.get('/revenue/by-source', authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const revenueBySource = await revenueCalculator.calculateRevenueBySource(start, end);

    res.json({
      success: true,
      data: {
        breakdown: revenueBySource,
        total: revenueBySource.reduce((sum, item) => sum + item.amount, 0),
        dateRange: {
          start,
          end,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching revenue by source:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue by source',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/analytics/revenue/by-company
 * @desc    Get revenue per company
 * @access  Admin only
 */
router.get('/revenue/by-company', authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, limit = 20 } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const revenueByCompany = await revenueCalculator.calculateRevenueByCompany(
      start,
      end,
      parseInt(limit)
    );

    // Calculate totals
    const totalRevenue = revenueByCompany.reduce((sum, item) => sum + item.amount, 0);

    res.json({
      success: true,
      data: {
        companies: revenueByCompany,
        summary: {
          totalRevenue,
          companyCount: revenueByCompany.length,
          avgRevenue: revenueByCompany.length > 0 ? totalRevenue / revenueByCompany.length : 0,
        },
        dateRange: {
          start,
          end,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching revenue by company:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue by company',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/analytics/revenue/forecast
 * @desc    Get predictive revenue forecast
 * @access  Admin only
 */
router.get('/revenue/forecast', authenticate, requireAdmin, async (req, res) => {
  try {
    const { periods = 3, periodType = 'monthly' } = req.query;

    const forecast = await revenueCalculator.generateRevenueForecast(
      parseInt(periods),
      periodType
    );

    res.json({
      success: true,
      data: {
        forecast,
        periodType,
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error generating revenue forecast:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate revenue forecast',
      error: error.message,
    });
  }
});

// ==================== REFERRER METRICS ====================

/**
 * @route   GET /api/v1/analytics/referrers/activation
 * @desc    Get referrer activation rates
 * @access  Admin only
 */
router.get('/referrers/activation', authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const activationMetrics = await revenueCalculator.calculateReferrerActivation(start, end);

    // Get historical data for trends
    const historicalSnapshots = await RevenueAnalytics.find({
      period: 'daily',
      date: { $gte: start, $lte: end },
    })
      .select('date referrerMetrics')
      .sort({ date: 1 });

    res.json({
      success: true,
      data: {
        current: activationMetrics,
        historical: historicalSnapshots.map(s => ({
          date: s.date,
          ...s.referrerMetrics,
        })),
        dateRange: {
          start,
          end,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching referrer activation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch referrer activation metrics',
      error: error.message,
    });
  }
});

// ==================== HIRE METRICS ====================

/**
 * @route   GET /api/v1/analytics/hires/time-to-first
 * @desc    Get time-to-first-hire metrics
 * @access  Admin only
 */
router.get('/hires/time-to-first', authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const timeToFirstHire = await revenueCalculator.calculateTimeToFirstHire(start, end);

    res.json({
      success: true,
      data: {
        metrics: timeToFirstHire,
        dateRange: {
          start,
          end,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching time-to-first-hire:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch time-to-first-hire metrics',
      error: error.message,
    });
  }
});

// ==================== CONVERSION METRICS ====================

/**
 * @route   GET /api/v1/analytics/conversions/referral-to-hire
 * @desc    Get referral-to-hire conversion rates
 * @access  Admin only
 */
router.get('/conversions/referral-to-hire', authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const conversionRates = await revenueCalculator.calculateConversionRates(start, end);

    res.json({
      success: true,
      data: {
        rates: conversionRates,
        dateRange: {
          start,
          end,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching conversion rates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversion rates',
      error: error.message,
    });
  }
});

// ==================== COHORT ANALYSIS ====================

/**
 * @route   GET /api/v1/analytics/cohorts
 * @desc    Get cohort analysis data
 * @access  Admin only
 */
router.get('/cohorts', authenticate, requireAdmin, async (req, res) => {
  try {
    const { months = 12 } = req.query;

    const cohorts = await revenueCalculator.generateCohortAnalysis(parseInt(months));

    res.json({
      success: true,
      data: {
        cohorts,
        summary: {
          totalCohorts: cohorts.length,
          avgRetention: cohorts.length > 0
            ? cohorts.reduce((sum, c) => {
                const latestRetention = c.retentionRates[c.retentionRates.length - 1];
                return sum + (latestRetention ? latestRetention.rate : 0);
              }, 0) / cohorts.length
            : 0,
          avgLTV: cohorts.length > 0
            ? cohorts.reduce((sum, c) => sum + c.ltv, 0) / cohorts.length
            : 0,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching cohort analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cohort analysis',
      error: error.message,
    });
  }
});

// ==================== REPORTS ====================

/**
 * @route   GET /api/v1/analytics/reports/daily
 * @desc    Get daily revenue report
 * @access  Admin only
 */
router.get('/reports/daily', authenticate, requireAdmin, async (req, res) => {
  try {
    const { date } = req.query;
    const reportDate = date ? new Date(date) : new Date();

    // Get or generate daily snapshot
    let snapshot = await RevenueAnalytics.findOne({
      period: 'daily',
      date: {
        $gte: new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate()),
        $lt: new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate() + 1),
      },
    });

    if (!snapshot) {
      // Generate new snapshot
      snapshot = await revenueCalculator.generateSnapshot('daily', reportDate);
    }

    res.json({
      success: true,
      data: {
        report: snapshot,
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error generating daily report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate daily report',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/analytics/reports/weekly
 * @desc    Get weekly revenue report
 * @access  Admin only
 */
router.get('/reports/weekly', authenticate, requireAdmin, async (req, res) => {
  try {
    const { week } = req.query;
    const reportDate = week ? new Date(week) : new Date();

    // Get or generate weekly snapshot
    let snapshot = await RevenueAnalytics.findOne({
      period: 'weekly',
      date: {
        $gte: new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate()),
        $lt: new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate() + 7),
      },
    });

    if (!snapshot) {
      // Generate new snapshot
      snapshot = await revenueCalculator.generateSnapshot('weekly', reportDate);
    }

    res.json({
      success: true,
      data: {
        report: snapshot,
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error generating weekly report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate weekly report',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/v1/analytics/reports/export
 * @desc    Export reports for accounting
 * @access  Admin only
 */
router.post('/reports/export', authenticate, requireAdmin, async (req, res) => {
  try {
    const { 
      reportType = 'revenue', 
      format = 'json', 
      startDate, 
      endDate,
      includeMetrics = [],
    } = req.body;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    let exportData = {};

    // Gather data based on report type
    switch (reportType) {
      case 'revenue':
        exportData = {
          revenue: await revenueCalculator.calculateRevenueInRange(start, end),
          bySource: await revenueCalculator.calculateRevenueBySource(start, end),
          byCompany: await revenueCalculator.calculateRevenueByCompany(start, end, 100),
        };
        break;
      case 'mrr':
        exportData = {
          mrr: await revenueCalculator.calculateMRR(),
          historical: await RevenueAnalytics.find({
            period: 'monthly',
            date: { $gte: start, $lte: end },
          }).select('date mrr arr mrrGrowth'),
        };
        break;
      case 'full':
        exportData = {
          revenue: await revenueCalculator.calculateRevenueInRange(start, end),
          bySource: await revenueCalculator.calculateRevenueBySource(start, end),
          byCompany: await revenueCalculator.calculateRevenueByCompany(start, end, 100),
          mrr: await revenueCalculator.calculateMRR(),
          referrerMetrics: await revenueCalculator.calculateReferrerActivation(start, end),
          conversionRates: await revenueCalculator.calculateConversionRates(start, end),
          timeToFirstHire: await revenueCalculator.calculateTimeToFirstHire(start, end),
        };
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type',
        });
    }

    // Format response
    const report = {
      reportType,
      generatedAt: new Date(),
      dateRange: { start, end },
      data: exportData,
    };

    if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(exportData, reportType);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="trm-revenue-report-${Date.now()}.csv"`);
      return res.send(csv);
    }

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export report',
      error: error.message,
    });
  }
});

// ==================== REAL-TIME ENDPOINTS ====================

/**
 * @route   GET /api/v1/analytics/realtime
 * @desc    Get real-time analytics data
 * @access  Admin only
 */
router.get('/realtime', authenticate, requireAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      todayRevenue,
      currentMrr,
      activeSubscriptions,
      todayReferrals,
    ] = await Promise.all([
      revenueCalculator.calculateRevenueInRange(today, new Date()),
      revenueCalculator.calculateMRR(),
      RevenueAnalytics.countDocuments({ period: 'daily', date: { $gte: today } }),
      RevenueAnalytics.aggregate([
        { $match: { period: 'daily', date: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$referralMetrics.totalReferrals' } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        todayRevenue: todayRevenue.totalRevenue,
        currentMrr: currentMrr.mrr,
        activeSubscriptions: currentMrr.activeSubscriptions,
        todayReferrals: todayReferrals[0]?.total || 0,
        lastUpdated: new Date(),
      },
    });
  } catch (error) {
    console.error('Error fetching real-time analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch real-time analytics',
      error: error.message,
    });
  }
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Convert data to CSV format
 */
function convertToCSV(data, reportType) {
  let csv = '';
  
  if (reportType === 'revenue' && data.bySource) {
    csv = 'Source,Amount,Count,Percentage\n';
    data.bySource.forEach(item => {
      csv += `${item.source},${item.amount},${item.count},${item.percentage}\n`;
    });
  } else if (reportType === 'mrr' && data.historical) {
    csv = 'Date,MRR,ARR,MRR Growth\n';
    data.historical.forEach(item => {
      csv += `${item.date.toISOString()},${item.mrr},${item.arr},${item.mrrGrowth}\n`;
    });
  } else {
    // Generic JSON to CSV conversion
    csv = JSON.stringify(data, null, 2);
  }
  
  return csv;
}

// ==================== USER ANALYTICS ENDPOINTS ====================

/**
 * @route   GET /api/v1/analytics/users/overview
 * @desc    Get user overview stats (total, new, active)
 * @access  Admin only
 */
router.get('/users/overview', authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const [
      totalUsers,
      newUsers,
      activeUsers,
      usersByRole,
    ] = await Promise.all([
      User.countDocuments({ status: 'active' }),
      User.countDocuments({ createdAt: { $gte: start, $lte: end }, status: 'active' }),
      User.countDocuments({ lastLoginAt: { $gte: start }, status: 'active' }),
      User.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$role', count: { $sum: 1 } } },
        { $project: { role: '$_id', count: 1, _id: 0 } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        newUsers,
        activeUsers,
        usersByRole: usersByRole.reduce((acc, item) => {
          acc[item.role] = item.count;
          return acc;
        }, {}),
        dateRange: { start, end },
      },
    });
  } catch (error) {
    console.error('Error fetching user overview:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user overview', error: error.message });
  }
});

/**
 * @route   GET /api/v1/analytics/users/growth
 * @desc    Get user growth over time
 * @access  Admin only
 */
router.get('/users/growth', authenticate, requireAdmin, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const growthData = await User.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate }, status: 'active' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', newUsers: '$count', _id: 0 } },
    ]);

    res.json({ success: true, data: { growth: growthData, days: parseInt(days) } });
  } catch (error) {
    console.error('Error fetching user growth:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user growth', error: error.message });
  }
});

/**
 * @route   GET /api/v1/analytics/users/dau-mau
 * @desc    Get DAU/MAU metrics
 * @access  Admin only
 */
router.get('/users/dau-mau', authenticate, requireAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [dau, mau] = await Promise.all([
      User.countDocuments({ lastLoginAt: { $gte: today }, status: 'active' }),
      User.countDocuments({ lastLoginAt: { $gte: thirtyDaysAgo }, status: 'active' }),
    ]);

    const stickiness = mau > 0 ? (dau / mau) * 100 : 0;

    res.json({
      success: true,
      data: { dau, mau, stickiness: Math.round(stickiness * 100) / 100 },
    });
  } catch (error) {
    console.error('Error fetching DAU/MAU:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch DAU/MAU', error: error.message });
  }
});

/**
 * @route   GET /api/v1/analytics/users/retention
 * @desc    Get retention cohorts
 * @access  Admin only
 */
router.get('/users/retention', authenticate, requireAdmin, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const cohorts = await AnalyticsEvent.getRetentionCohorts({ days: parseInt(days) });
    res.json({ success: true, data: { cohorts } });
  } catch (error) {
    console.error('Error fetching retention cohorts:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch retention cohorts', error: error.message });
  }
});

/**
 * @route   GET /api/v1/analytics/users/geography
 * @desc    Get geographic distribution of users
 * @access  Admin only
 */
router.get('/users/geography', authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const geoData = await AnalyticsEvent.getGeographicDistribution({ startDate: start, endDate: end, limit: 20 });

    res.json({ success: true, data: { geography: geoData, dateRange: { start, end } } });
  } catch (error) {
    console.error('Error fetching geographic distribution:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch geographic distribution', error: error.message });
  }
});

/**
 * @route   GET /api/v1/analytics/users/devices
 * @desc    Get device breakdown
 * @access  Admin only
 */
router.get('/users/devices', authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const deviceData = await AnalyticsEvent.getDeviceBreakdown({ startDate: start, endDate: end });

    res.json({ success: true, data: { devices: deviceData, dateRange: { start, end } } });
  } catch (error) {
    console.error('Error fetching device breakdown:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch device breakdown', error: error.message });
  }
});

// ==================== SESSION ANALYTICS ENDPOINTS ====================

/**
 * @route   GET /api/v1/analytics/sessions/overview
 * @desc    Get session overview stats
 * @access  Admin only
 */
router.get('/sessions/overview', authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const metrics = await AnalyticsSession.getSessionMetrics({ startDate: start, endDate: end });

    res.json({ success: true, data: { ...metrics, dateRange: { start, end } } });
  } catch (error) {
    console.error('Error fetching session overview:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch session overview', error: error.message });
  }
});

/**
 * @route   GET /api/v1/analytics/sessions/duration
 * @desc    Get average session duration
 * @access  Admin only
 */
router.get('/sessions/duration', authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, groupBy } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const durationData = await AnalyticsSession.getAverageSessionDuration({
      startDate: start,
      endDate: end,
      groupBy: groupBy || null,
    });

    res.json({ success: true, data: { duration: durationData, dateRange: { start, end } } });
  } catch (error) {
    console.error('Error fetching session duration:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch session duration', error: error.message });
  }
});

/**
 * @route   GET /api/v1/analytics/sessions/bounce-rate
 * @desc    Get bounce rate
 * @access  Admin only
 */
router.get('/sessions/bounce-rate', authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, trafficSource } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const bounceData = await AnalyticsSession.getBounceRate({
      startDate: start,
      endDate: end,
      trafficSource: trafficSource || null,
    });

    res.json({ success: true, data: { bounceRate: bounceData, dateRange: { start, end } } });
  } catch (error) {
    console.error('Error fetching bounce rate:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch bounce rate', error: error.message });
  }
});

/**
 * @route   GET /api/v1/analytics/sessions/traffic-sources
 * @desc    Get traffic source breakdown
 * @access  Admin only
 */
router.get('/sessions/traffic-sources', authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const trafficData = await AnalyticsSession.getTrafficSources({ startDate: start, endDate: end });

    res.json({ success: true, data: { trafficSources: trafficData, dateRange: { start, end } } });
  } catch (error) {
    console.error('Error fetching traffic sources:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch traffic sources', error: error.message });
  }
});

/**
 * @route   GET /api/v1/analytics/sessions/pages
 * @desc    Get popular pages
 * @access  Admin only
 */
router.get('/sessions/pages', authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, limit = 20 } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const pageData = await AnalyticsSession.aggregate([
      { $match: { startedAt: { $gte: start, $lte: end } } },
      { $unwind: '$pagesVisited' },
      {
        $group: {
          _id: '$pagesVisited.path',
          views: { $sum: 1 },
          avgTimeOnPage: { $avg: '$pagesVisited.timeOnPage' },
        },
      },
      { $sort: { views: -1 } },
      { $limit: parseInt(limit) },
      { $project: { path: '$_id', views: 1, avgTimeOnPage: { $round: ['$avgTimeOnPage', 2] }, _id: 0 } },
    ]);

    res.json({ success: true, data: { pages: pageData, dateRange: { start, end } } });
  } catch (error) {
    console.error('Error fetching popular pages:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch popular pages', error: error.message });
  }
});

// ==================== EVENT ANALYTICS ENDPOINTS ====================

/**
 * @route   GET /api/v1/analytics/events/overview
 * @desc    Get event counts by type
 * @access  Admin only
 */
router.get('/events/overview', authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const eventCounts = await AnalyticsEvent.aggregate([
      { $match: { timestamp: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
        },
      },
      {
        $project: {
          eventType: '$_id',
          count: 1,
          uniqueUserCount: { $size: '$uniqueUsers' },
          _id: 0,
        },
      },
    ]);

    res.json({ success: true, data: { events: eventCounts, dateRange: { start, end } } });
  } catch (error) {
    console.error('Error fetching event overview:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch event overview', error: error.message });
  }
});

/**
 * @route   GET /api/v1/analytics/events/timeline
 * @desc    Get events over time
 * @access  Admin only
 */
router.get('/events/timeline', authenticate, requireAdmin, async (req, res) => {
  try {
    const { eventType, days = 30 } = req.query;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const timelineData = await AnalyticsEvent.getCountsByDate({
      eventType: eventType || null,
      days: parseInt(days),
    });

    res.json({ success: true, data: { timeline: timelineData, eventType, days: parseInt(days) } });
  } catch (error) {
    console.error('Error fetching event timeline:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch event timeline', error: error.message });
  }
});

/**
 * @route   GET /api/v1/analytics/events/top
 * @desc    Get top events
 * @access  Admin only
 */
router.get('/events/top', authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const topEvents = await AnalyticsEvent.getTopEvents({
      startDate: start,
      endDate: end,
      limit: parseInt(limit),
    });

    res.json({ success: true, data: { topEvents, dateRange: { start, end } } });
  } catch (error) {
    console.error('Error fetching top events:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch top events', error: error.message });
  }
});

/**
 * @route   GET /api/v1/analytics/events/funnel
 * @desc    Get funnel analysis
 * @access  Admin only
 */
router.get('/events/funnel', authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Default funnel steps for referral platform
    const steps = [
      { name: 'Page View', eventName: 'page_view' },
      { name: 'Job View', eventName: 'job_view' },
      { name: 'Referral Start', eventName: 'referral_start' },
      { name: 'Referral Submit', eventName: 'referral_submit' },
    ];

    const funnelData = await AnalyticsEvent.getFunnel(steps, { startDate: start, endDate: end });

    res.json({ success: true, data: { funnel: funnelData, dateRange: { start, end } } });
  } catch (error) {
    console.error('Error fetching funnel analysis:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch funnel analysis', error: error.message });
  }
});

/**
 * @route   POST /api/v1/analytics/events/track
 * @desc    Track new event (for client-side tracking)
 * @access  Public (with optional authentication)
 */
router.post('/events/track', authenticate, async (req, res) => {
  try {
    const {
      eventType,
      eventCategory,
      eventName,
      properties,
      sessionId,
      anonymousId,
      url,
      referrer,
    } = req.body;

    if (!eventType || !eventName) {
      return res.status(400).json({ success: false, message: 'eventType and eventName are required' });
    }

    const eventData = {
      userId: req.user?._id || null,
      anonymousId: anonymousId || null,
      sessionId: sessionId || `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType,
      eventCategory: eventCategory || 'custom_event',
      eventName,
      properties: properties || {},
      url: {
        current: url || req.headers.referer || null,
        referrer: referrer || req.headers.referer || null,
      },
      deviceInfo: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      },
      timestamp: new Date(),
    };

    const event = await AnalyticsEvent.track(eventData);

    res.json({ success: true, data: { eventId: event._id, tracked: true } });
  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({ success: false, message: 'Failed to track event', error: error.message });
  }
});

// ==================== REFERRAL ANALYTICS ENDPOINTS ====================

/**
 * @route   GET /api/v1/analytics/referrals/overview
 * @desc    Get referral overview
 * @access  Admin only
 */
router.get('/referrals/overview', authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const [
      totalReferrals,
      referralsByStatus,
      totalPayouts,
      avgTimeToHire,
    ] = await Promise.all([
      Referral.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      Referral.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $project: { status: '$_id', count: 1, _id: 0 } },
      ]),
      Referral.aggregate([
        { $match: { status: 'paid', paidAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: '$referrerPayout' } } },
      ]),
      Referral.aggregate([
        { $match: { status: 'hired', hiredAt: { $gte: start, $lte: end } } },
        {
          $project: {
            timeToHire: {
              $divide: [{ $subtract: ['$hiredAt', '$submittedAt'] }, 1000 * 60 * 60 * 24],
            },
          },
        },
        { $group: { _id: null, avgDays: { $avg: '$timeToHire' } } },
      ]),
    ]);

    const statusBreakdown = referralsByStatus.reduce((acc, item) => {
      acc[item.status] = item.count;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        totalReferrals,
        statusBreakdown,
        totalPayouts: totalPayouts[0]?.total || 0,
        avgTimeToHire: Math.round(avgTimeToHire[0]?.avgDays || 0),
        dateRange: { start, end },
      },
    });
  } catch (error) {
    console.error('Error fetching referral overview:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch referral overview', error: error.message });
  }
});

/**
 * @route   GET /api/v1/analytics/referrals/funnel
 * @desc    Get referral conversion funnel
 * @access  Admin only
 */
router.get('/referrals/funnel', authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const funnelStages = [
      { name: 'Submitted', status: 'submitted' },
      { name: 'Under Review', status: 'under_review' },
      { name: 'Shortlisted', status: 'shortlisted' },
      { name: 'Interview Scheduled', status: 'interview_scheduled' },
      { name: 'Interview Completed', status: 'interview_completed' },
      { name: 'Offer Extended', status: 'offer_extended' },
      { name: 'Hired', status: 'hired' },
      { name: 'Paid', status: 'paid' },
    ];

    const funnelData = [];
    let previousCount = null;

    for (const stage of funnelStages) {
      const count = await Referral.countDocuments({
        status: { $in: funnelStages.filter(s => s.name !== 'Submitted').map(s => s.status).concat(['submitted']) },
        createdAt: { $gte: start, $lte: end },
        ...(stage.status !== 'submitted' && {
          statusHistory: {
            $elemMatch: {
              status: stage.status,
              changedAt: { $gte: start, $lte: end },
            },
          },
        }),
      });

      const stageData = {
        stage: stage.name,
        count,
        conversionRate: previousCount ? ((count / previousCount) * 100).toFixed(2) : 100,
        dropOffRate: previousCount ? (((previousCount - count) / previousCount) * 100).toFixed(2) : 0,
      };

      funnelData.push(stageData);
      previousCount = count;
    }

    res.json({ success: true, data: { funnel: funnelData, dateRange: { start, end } } });
  } catch (error) {
    console.error('Error fetching referral funnel:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch referral funnel', error: error.message });
  }
});

/**
 * @route   GET /api/v1/analytics/referrals/top-referrers
 * @desc    Get top referrers
 * @access  Admin only
 */
router.get('/referrals/top-referrers', authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const topReferrers = await Referral.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: '$referrerId',
          totalReferrals: { $sum: 1 },
          successfulHires: {
            $sum: { $cond: [{ $in: ['$status', ['hired', 'payment_pending', 'paid']] }, 1, 0] },
          },
          totalEarnings: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$referrerPayout', 0] } },
        },
      },
      { $sort: { successfulHires: -1, totalReferrals: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'referrer',
        },
      },
      { $unwind: '$referrer' },
      {
        $project: {
          referrerId: '$_id',
          name: '$referrer.name',
          email: '$referrer.email',
          avatar: '$referrer.avatar',
          totalReferrals: 1,
          successfulHires: 1,
          totalEarnings: 1,
          conversionRate: {
            $round: [{ $multiply: [{ $divide: ['$successfulHires', { $max: ['$totalReferrals', 1] }] }, 100] }, 2],
          },
          _id: 0,
        },
      },
    ]);

    res.json({ success: true, data: { topReferrers, dateRange: { start, end } } });
  } catch (error) {
    console.error('Error fetching top referrers:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch top referrers', error: error.message });
  }
});

/**
 * @route   GET /api/v1/analytics/referrals/time-to-hire
 * @desc    Get time to hire metrics
 * @access  Admin only
 */
router.get('/referrals/time-to-hire', authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const timeMetrics = await Referral.aggregate([
      { $match: { status: 'hired', hiredAt: { $gte: start, $lte: end } } },
      {
        $project: {
          daysToHire: {
            $divide: [{ $subtract: ['$hiredAt', '$submittedAt'] }, 1000 * 60 * 60 * 24],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgDays: { $avg: '$daysToHire' },
          minDays: { $min: '$daysToHire' },
          maxDays: { $max: '$daysToHire' },
          medianDays: { $median: '$daysToHire' },
          totalHires: { $sum: 1 },
        },
      },
    ]);

    // Fallback for median calculation if not supported
    let medianDays = 0;
    if (timeMetrics.length > 0) {
      const allDays = await Referral.aggregate([
        { $match: { status: 'hired', hiredAt: { $gte: start, $lte: end } } },
        {
          $project: {
            daysToHire: {
              $divide: [{ $subtract: ['$hiredAt', '$submittedAt'] }, 1000 * 60 * 60 * 24],
            },
          },
        },
        { $sort: { daysToHire: 1 } },
        { $project: { _id: 0, daysToHire: 1 } },
      ]);

      const mid = Math.floor(allDays.length / 2);
      medianDays = allDays.length % 2 === 0
        ? (allDays[mid - 1].daysToHire + allDays[mid].daysToHire) / 2
        : allDays[mid].daysToHire;
    }

    const metrics = timeMetrics[0] || { avgDays: 0, minDays: 0, maxDays: 0, totalHires: 0 };

    res.json({
      success: true,
      data: {
        avgDays: Math.round(metrics.avgDays * 100) / 100,
        minDays: Math.round(metrics.minDays * 100) / 100,
        maxDays: Math.round(metrics.maxDays * 100) / 100,
        medianDays: Math.round(medianDays * 100) / 100,
        totalHires: metrics.totalHires,
        dateRange: { start, end },
      },
    });
  } catch (error) {
    console.error('Error fetching time to hire:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch time to hire', error: error.message });
  }
});

// ==================== JOB ANALYTICS ENDPOINTS ====================

/**
 * @route   GET /api/v1/analytics/jobs/overview
 * @desc    Get job posting overview
 * @access  Admin only
 */
router.get('/jobs/overview', authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const [
      totalJobs,
      jobsByStatus,
      totalViews,
      totalApplications,
      totalHires,
    ] = await Promise.all([
      Job.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      Job.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $project: { status: '$_id', count: 1, _id: 0 } },
      ]),
      Job.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: '$stats.views' } } },
      ]),
      Job.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: '$stats.applications' } } },
      ]),
      Job.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: '$stats.hires' } } },
      ]),
    ]);

    const statusBreakdown = jobsByStatus.reduce((acc, item) => {
      acc[item.status] = item.count;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        totalJobs,
        statusBreakdown,
        totalViews: totalViews[0]?.total || 0,
        totalApplications: totalApplications[0]?.total || 0,
        totalHires: totalHires[0]?.total || 0,
        dateRange: { start, end },
      },
    });
  } catch (error) {
    console.error('Error fetching job overview:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch job overview', error: error.message });
  }
});

/**
 * @route   GET /api/v1/analytics/jobs/trends
 * @desc    Get job posting trends
 * @access  Admin only
 */
router.get('/jobs/trends', authenticate, requireAdmin, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const trendsData = await Job.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          newJobs: { $sum: 1 },
          totalViews: { $sum: '$stats.views' },
          totalReferrals: { $sum: '$stats.referrals' },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', newJobs: 1, totalViews: 1, totalReferrals: 1, _id: 0 } },
    ]);

    res.json({ success: true, data: { trends: trendsData, days: parseInt(days) } });
  } catch (error) {
    console.error('Error fetching job trends:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch job trends', error: error.message });
  }
});

/**
 * @route   GET /api/v1/analytics/jobs/categories
 * @desc    Get jobs by category
 * @access  Admin only
 */
router.get('/jobs/categories', authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const categoryData = await Job.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end }, category: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$category',
          jobCount: { $sum: 1 },
          totalViews: { $sum: '$stats.views' },
          totalReferrals: { $sum: '$stats.referrals' },
          totalHires: { $sum: '$stats.hires' },
        },
      },
      { $sort: { jobCount: -1 } },
      {
        $project: {
          category: '$_id',
          jobCount: 1,
          totalViews: 1,
          totalReferrals: 1,
          totalHires: 1,
          conversionRate: {
            $round: [{ $multiply: [{ $divide: ['$totalHires', { $max: ['$totalReferrals', 1] }] }, 100] }, 2],
          },
          _id: 0,
        },
      },
    ]);

    res.json({ success: true, data: { categories: categoryData, dateRange: { start, end } } });
  } catch (error) {
    console.error('Error fetching job categories:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch job categories', error: error.message });
  }
});

/**
 * @route   GET /api/v1/analytics/jobs/fill-rates
 * @desc    Get fill rates by category
 * @access  Admin only
 */
router.get('/jobs/fill-rates', authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const fillRateData = await Job.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end }, category: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$category',
          totalJobs: { $sum: 1 },
          filledJobs: { $sum: { $cond: [{ $eq: ['$status', 'filled'] }, 1, 0] } },
          totalReferrals: { $sum: '$stats.referrals' },
          totalHires: { $sum: '$stats.hires' },
        },
      },
      {
        $project: {
          category: '$_id',
          totalJobs: 1,
          filledJobs: 1,
          totalReferrals: 1,
          totalHires: 1,
          fillRate: {
            $round: [{ $multiply: [{ $divide: ['$filledJobs', { $max: ['$totalJobs', 1] }] }, 100] }, 2],
          },
          referralToHireRate: {
            $round: [{ $multiply: [{ $divide: ['$totalHires', { $max: ['$totalReferrals', 1] }] }, 100] }, 2],
          },
          _id: 0,
        },
      },
      { $sort: { fillRate: -1 } },
    ]);

    res.json({ success: true, data: { fillRates: fillRateData, dateRange: { start, end } } });
  } catch (error) {
    console.error('Error fetching fill rates:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch fill rates', error: error.message });
  }
});

// ==================== REAL-TIME ENDPOINTS ====================

/**
 * @route   GET /api/v1/analytics/realtime/metrics
 * @desc    Get current real-time metrics
 * @access  Admin only
 */
router.get('/realtime/metrics', authenticate, requireAdmin, async (req, res) => {
  try {
    const metrics = await realtimeAnalyticsService.getLiveMetrics();
    res.json({ success: true, data: { metrics, timestamp: new Date().toISOString() } });
  } catch (error) {
    console.error('Error fetching real-time metrics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch real-time metrics', error: error.message });
  }
});

/**
 * @route   GET /api/v1/analytics/realtime/events
 * @desc    Get recent events (last 100)
 * @access  Admin only
 */
router.get('/realtime/events', authenticate, requireAdmin, async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const events = realtimeAnalyticsService.getRecentEvents(parseInt(limit));
    res.json({ success: true, data: { events, count: events.length } });
  } catch (error) {
    console.error('Error fetching recent events:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch recent events', error: error.message });
  }
});

/**
 * @route   GET /api/v1/analytics/realtime/active-users
 * @desc    Get currently active users
 * @access  Admin only
 */
router.get('/realtime/active-users', authenticate, requireAdmin, async (req, res) => {
  try {
    const [activeUserCount, onlineUsers] = await Promise.all([
      realtimeAnalyticsService.getActiveUsers(),
      realtimeAnalyticsService.getOnlineUsers(),
    ]);

    res.json({
      success: true,
      data: {
        activeUserCount,
        onlineUsers: onlineUsers.slice(0, 100), // Limit to first 100 for performance
        totalOnline: onlineUsers.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching active users:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch active users', error: error.message });
  }
});

// ==================== EXPORT ENDPOINTS ====================

/**
 * @route   GET /api/v1/analytics/export/users
 * @desc    Export user analytics
 * @access  Admin only
 */
router.get('/export/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const users = await User.find({
      createdAt: { $gte: start, $lte: end },
      status: 'active',
    })
      .select('name email role createdAt lastLoginAt referrerProfile.tierLevel referrerProfile.totalReferrals')
      .lean();

    const exportData = {
      exportType: 'users',
      generatedAt: new Date(),
      dateRange: { start, end },
      totalRecords: users.length,
      data: users,
    };

    if (format === 'csv') {
      const csv = convertToCSV(exportData.data, 'users');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="users-export-${Date.now()}.csv"`);
      return res.send(csv);
    }

    res.json({ success: true, data: exportData });
  } catch (error) {
    console.error('Error exporting users:', error);
    res.status(500).json({ success: false, message: 'Failed to export users', error: error.message });
  }
});

/**
 * @route   GET /api/v1/analytics/export/sessions
 * @desc    Export session analytics
 * @access  Admin only
 */
router.get('/export/sessions', authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const sessions = await AnalyticsSession.find({
      startedAt: { $gte: start, $lte: end },
    })
      .select('sessionId userId startedAt endedAt duration status deviceInfo.deviceType location.country metrics')
      .lean();

    const exportData = {
      exportType: 'sessions',
      generatedAt: new Date(),
      dateRange: { start, end },
      totalRecords: sessions.length,
      data: sessions,
    };

    if (format === 'csv') {
      const csv = convertToCSV(exportData.data, 'sessions');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="sessions-export-${Date.now()}.csv"`);
      return res.send(csv);
    }

    res.json({ success: true, data: exportData });
  } catch (error) {
    console.error('Error exporting sessions:', error);
    res.status(500).json({ success: false, message: 'Failed to export sessions', error: error.message });
  }
});

/**
 * @route   GET /api/v1/analytics/export/events
 * @desc    Export events
 * @access  Admin only
 */
router.get('/export/events', authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, eventType, format = 'json', limit = 10000 } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const query = { timestamp: { $gte: start, $lte: end } };
    if (eventType) query.eventType = eventType;

    const events = await AnalyticsEvent.find(query)
      .select('eventType eventName eventCategory userId sessionId timestamp deviceInfo.deviceType location.country')
      .limit(parseInt(limit))
      .lean();

    const exportData = {
      exportType: 'events',
      generatedAt: new Date(),
      dateRange: { start, end },
      totalRecords: events.length,
      data: events,
    };

    if (format === 'csv') {
      const csv = convertToCSV(exportData.data, 'events');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="events-export-${Date.now()}.csv"`);
      return res.send(csv);
    }

    res.json({ success: true, data: exportData });
  } catch (error) {
    console.error('Error exporting events:', error);
    res.status(500).json({ success: false, message: 'Failed to export events', error: error.message });
  }
});

module.exports = router;
