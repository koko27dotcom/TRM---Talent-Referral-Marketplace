/**
 * Scraping Analytics Service
 * Provides comprehensive analytics and reporting for CV scraping operations
 */

const ScrapingJob = require('../models/ScrapingJob.js');
const ScrapingSource = require('../models/ScrapingSource.js');
const ScrapingLog = require('../models/ScrapingLog.js');
const CVData = require('../models/CVData.js');

class ScrapingAnalyticsService {
  /**
   * Get dashboard overview statistics
   */
  async getDashboardOverview(dateRange = {}) {
    const fromDate = dateRange.from ? new Date(dateRange.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = dateRange.to ? new Date(dateRange.to) : new Date();

    const [
      jobStats,
      sourceStats,
      cvStats,
      recentJobs,
      queueStats,
    ] = await Promise.all([
      this.getJobStatistics(fromDate, toDate),
      this.getSourceStatistics(fromDate, toDate),
      this.getCVStatistics(fromDate, toDate),
      this.getRecentJobs(5),
      this.getQueueOverview(),
    ]);

    return {
      summary: {
        totalJobs: jobStats.total,
        activeJobs: jobStats.active,
        completedJobs: jobStats.completed,
        failedJobs: jobStats.failed,
        totalCVs: cvStats.total,
        newCVsToday: cvStats.today,
        totalSources: sourceStats.total,
        activeSources: sourceStats.active,
        avgSuccessRate: jobStats.avgSuccessRate,
      },
      jobs: jobStats,
      sources: sourceStats,
      cvs: cvStats,
      recentJobs,
      queue: queueStats,
    };
  }

  /**
   * Get job statistics
   */
  async getJobStatistics(fromDate, toDate) {
    const [totalJobs, statusBreakdown, successRate, dailyTrends] = await Promise.all([
      ScrapingJob.countDocuments({
        createdAt: { $gte: fromDate, $lte: toDate },
      }),
      ScrapingJob.aggregate([
        {
          $match: {
            createdAt: { $gte: fromDate, $lte: toDate },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      ScrapingJob.aggregate([
        {
          $match: {
            createdAt: { $gte: fromDate, $lte: toDate },
            status: { $in: ['completed', 'failed'] },
          },
        },
        {
          $group: {
            _id: null,
            avgSuccessRate: {
              $avg: {
                $cond: [
                  { $gt: ['$statistics.totalProcessed', 0] },
                  {
                    $multiply: [
                      { $divide: ['$statistics.successful', '$statistics.totalProcessed'] },
                      100,
                    ],
                  },
                  0,
                ],
              },
            },
          },
        },
      ]),
      ScrapingJob.aggregate([
        {
          $match: {
            createdAt: { $gte: fromDate, $lte: toDate },
          },
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              status: '$status',
            },
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: '$_id.date',
            statuses: {
              $push: {
                status: '$_id.status',
                count: '$count',
              },
            },
            total: { $sum: '$count' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const statusMap = statusBreakdown.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    return {
      total: totalJobs,
      active: statusMap.running || 0 + statusMap.paused || 0 + statusMap.queued || 0,
      completed: statusMap.completed || 0,
      failed: statusMap.failed || 0,
      pending: statusMap.pending || 0,
      cancelled: statusMap.cancelled || 0,
      avgSuccessRate: Math.round(successRate[0]?.avgSuccessRate || 0),
      statusBreakdown,
      dailyTrends: dailyTrends.map(day => ({
        date: day._id,
        total: day.total,
        ...day.statuses.reduce((acc, s) => {
          acc[s.status] = s.count;
          return acc;
        }, {}),
      })),
    };
  }

  /**
   * Get source statistics
   */
  async getSourceStatistics(fromDate, toDate) {
    const [totalSources, activeSources, sourceBreakdown, topSources] = await Promise.all([
      ScrapingSource.countDocuments(),
      ScrapingSource.countDocuments({
        isActive: true,
        isEnabled: true,
        status: 'active',
      }),
      ScrapingSource.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      ScrapingSource.find()
        .sort({ 'statistics.totalScraped': -1 })
        .limit(10)
        .select('name statistics successRate'),
    ]);

    return {
      total: totalSources,
      active: activeSources,
      breakdown: sourceBreakdown,
      topSources: topSources.map(s => ({
        id: s._id,
        name: s.name,
        totalScraped: s.statistics?.totalScraped || 0,
        successRate: s.statistics?.successRate || 0,
      })),
    };
  }

  /**
   * Get CV statistics
   */
  async getCVStatistics(fromDate, toDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalCVs,
      newCVsToday,
      statusBreakdown,
      experienceBreakdown,
      sourceBreakdown,
      dailyTrends,
      qualityDistribution,
    ] = await Promise.all([
      CVData.countDocuments(),
      CVData.countDocuments({ createdAt: { $gte: today } }),
      CVData.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      CVData.aggregate([
        {
          $group: {
            _id: '$experienceLevel',
            count: { $sum: 1 },
          },
        },
      ]),
      CVData.aggregate([
        {
          $group: {
            _id: '$source.sourceId',
            count: { $sum: 1 },
          },
        },
      ]),
      CVData.aggregate([
        {
          $match: {
            createdAt: { $gte: fromDate, $lte: toDate },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      CVData.aggregate([
        {
          $bucket: {
            groupBy: '$quality.overallScore',
            boundaries: [0, 20, 40, 60, 80, 100],
            default: 'unknown',
            output: {
              count: { $sum: 1 },
            },
          },
        },
      ]),
    ]);

    return {
      total: totalCVs,
      today: newCVsToday,
      statusBreakdown,
      experienceBreakdown,
      sourceBreakdown,
      dailyTrends: dailyTrends.map(d => ({ date: d._id, count: d.count })),
      qualityDistribution: qualityDistribution.map(q => ({
        range: q._id === 'unknown' ? 'Unknown' : `${q._id}-${q._id + 20}`,
        count: q.count,
      })),
    };
  }

  /**
   * Get recent jobs
   */
  async getRecentJobs(limit = 5) {
    return ScrapingJob.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sources.sourceId', 'name')
      .populate('createdBy', 'name')
      .select('name status type statistics progress createdAt');
  }

  /**
   * Get queue overview
   */
  async getQueueOverview() {
    // This would integrate with queue management service
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    };
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(dateRange = {}) {
    const fromDate = dateRange.from ? new Date(dateRange.from) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const toDate = dateRange.to ? new Date(dateRange.to) : new Date();

    const [avgResponseTime, throughput, errorRate] = await Promise.all([
      ScrapingLog.aggregate([
        {
          $match: {
            timestamp: { $gte: fromDate, $lte: toDate },
            'performance.totalDuration': { $exists: true },
          },
        },
        {
          $group: {
            _id: '$operation',
            avgDuration: { $avg: '$performance.totalDuration' },
            minDuration: { $min: '$performance.totalDuration' },
            maxDuration: { $max: '$performance.totalDuration' },
            p95: {
              $percentile: {
                p: [0.95],
                input: '$performance.totalDuration',
              },
            },
          },
        },
      ]),
      ScrapingJob.aggregate([
        {
          $match: {
            createdAt: { $gte: fromDate, $lte: toDate },
            status: 'completed',
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            cvsPerHour: {
              $avg: {
                $divide: [
                  '$statistics.successful',
                  { $divide: ['$actualDuration', 3600] },
                ],
              },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      ScrapingLog.aggregate([
        {
          $match: {
            timestamp: { $gte: fromDate, $lte: toDate },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            total: { $sum: 1 },
            errors: {
              $sum: { $cond: [{ $in: ['$level', ['error', 'fatal']] }, 1, 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return {
      responseTime: avgResponseTime,
      throughput: throughput.map(t => ({
        date: t._id,
        cvsPerHour: Math.round(t.cvsPerHour || 0),
      })),
      errorRate: errorRate.map(e => ({
        date: e._id,
        rate: e.total > 0 ? Math.round((e.errors / e.total) * 100) : 0,
      })),
    };
  }

  /**
   * Get data quality trends
   */
  async getQualityTrends(days = 30) {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    return CVData.aggregate([
      {
        $match: {
          createdAt: { $gte: fromDate },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          },
          avgQuality: { $avg: '$quality.overallScore' },
          avgCompleteness: { $avg: '$quality.completeness' },
          avgAccuracy: { $avg: '$quality.accuracy' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);
  }

  /**
   * Get hourly distribution
   */
  async getHourlyDistribution(dateRange = {}) {
    const fromDate = dateRange.from ? new Date(dateRange.from) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const toDate = dateRange.to ? new Date(dateRange.to) : new Date();

    return ScrapingJob.aggregate([
      {
        $match: {
          createdAt: { $gte: fromDate, $lte: toDate },
        },
      },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 },
          successful: { $sum: '$statistics.successful' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  /**
   * Get source comparison
   */
  async getSourceComparison(sourceIds, dateRange = {}) {
    const fromDate = dateRange.from ? new Date(dateRange.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = dateRange.to ? new Date(dateRange.to) : new Date();

    const sources = await ScrapingSource.find({
      _id: { $in: sourceIds },
    }).select('name statistics');

    const comparison = await Promise.all(
      sources.map(async (source) => {
        const logs = await ScrapingLog.aggregate([
          {
            $match: {
              sourceId: source._id,
              timestamp: { $gte: fromDate, $lte: toDate },
            },
          },
          {
            $group: {
              _id: '$type',
              count: { $sum: 1 },
            },
          },
        ]);

        return {
          sourceId: source._id,
          name: source.name,
          totalScraped: source.statistics?.totalScraped || 0,
          successRate: source.statistics?.successRate || 0,
          logs: logs.reduce((acc, log) => {
            acc[log._id] = log.count;
            return acc;
          }, {}),
        };
      })
    );

    return comparison;
  }

  /**
   * Get error analysis
   */
  async getErrorAnalysis(dateRange = {}) {
    const fromDate = dateRange.from ? new Date(dateRange.from) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const toDate = dateRange.to ? new Date(dateRange.to) : new Date();

    const [errorTypes, errorTrends, topErrors] = await Promise.all([
      ScrapingLog.aggregate([
        {
          $match: {
            timestamp: { $gte: fromDate, $lte: toDate },
            level: { $in: ['error', 'fatal'] },
          },
        },
        {
          $group: {
            _id: '$error.type',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
      ScrapingLog.aggregate([
        {
          $match: {
            timestamp: { $gte: fromDate, $lte: toDate },
            level: { $in: ['error', 'fatal'] },
          },
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
              type: '$error.type',
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.date': 1 } },
      ]),
      ScrapingLog.find({
        timestamp: { $gte: fromDate, $lte: toDate },
        level: { $in: ['error', 'fatal'] },
      })
        .sort({ timestamp: -1 })
        .limit(20)
        .select('error message timestamp operation'),
    ]);

    return {
      errorTypes,
      errorTrends,
      topErrors,
    };
  }

  /**
   * Generate custom report
   */
  async generateReport(reportConfig) {
    const { metrics, dateRange, filters } = reportConfig;
    const results = {};

    for (const metric of metrics) {
      switch (metric) {
        case 'jobs':
          results.jobs = await this.getJobStatistics(
            new Date(dateRange.from),
            new Date(dateRange.to)
          );
          break;
        case 'sources':
          results.sources = await this.getSourceStatistics(
            new Date(dateRange.from),
            new Date(dateRange.to)
          );
          break;
        case 'cvs':
          results.cvs = await this.getCVStatistics(
            new Date(dateRange.from),
            new Date(dateRange.to)
          );
          break;
        case 'performance':
          results.performance = await this.getPerformanceMetrics(dateRange);
          break;
        case 'quality':
          results.quality = await this.getQualityTrends();
          break;
        case 'errors':
          results.errors = await this.getErrorAnalysis(dateRange);
          break;
      }
    }

    return results;
  }
}

module.exports = new ScrapingAnalyticsService();