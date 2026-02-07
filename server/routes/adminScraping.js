/**
 * Admin Scraping Routes
 * Comprehensive API endpoints for CV scraping management
 * Includes job management, source management, queue monitoring, analytics, and exports
 */

const express = require('express');
const { authenticate } = require('../middleware/auth.js');
const { requireAdmin } = require('../middleware/rbac.js');
const { asyncHandler, ValidationError } = require('../middleware/errorHandler.js');

// Services
const scrapingJobService = require('../services/scrapingJobService.js');
const sourceManagementService = require('../services/sourceManagementService.js');
const queueManagementService = require('../services/queueManagementService.js');
const scrapingAnalyticsService = require('../services/scrapingAnalyticsService.js');
const cvExportService = require('../services/cvExportService.js');
const dataValidationService = require('../services/dataValidationService.js');

const router = express.Router();

// Apply authentication and admin requirement to all routes
router.use(authenticate);
router.use(requireAdmin);

// ============================================================================
// SCRAPING JOBS ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/scraping/jobs
 * @desc    Get all scraping jobs with filtering
 * @access  Private (Admin)
 */
router.get('/jobs', asyncHandler(async (req, res) => {
  const filters = {
    status: req.query.status,
    type: req.query.type,
    priority: req.query.priority,
    search: req.query.search,
    tags: req.query.tags ? req.query.tags.split(',') : undefined,
    dateRange: req.query.dateFrom || req.query.dateTo ? {
      from: req.query.dateFrom,
      to: req.query.dateTo,
    } : undefined,
  };

  const options = {
    page: req.query.page,
    limit: req.query.limit,
    sort: req.query.sort,
  };

  const result = await scrapingJobService.getJobs(filters, options);

  res.json({
    success: true,
    data: result.jobs,
    pagination: result.pagination,
  });
}));

/**
 * @route   POST /api/admin/scraping/jobs
 * @desc    Create a new scraping job
 * @access  Private (Admin)
 */
router.post('/jobs', asyncHandler(async (req, res) => {
  const jobData = req.body;
  const userId = req.user._id;

  const job = await scrapingJobService.createJob(jobData, userId);

  res.status(201).json({
    success: true,
    message: 'Scraping job created successfully',
    data: job,
  });
}));

/**
 * @route   GET /api/admin/scraping/jobs/:id
 * @desc    Get scraping job by ID
 * @access  Private (Admin)
 */
router.get('/jobs/:id', asyncHandler(async (req, res) => {
  const job = await scrapingJobService.getJobById(req.params.id);

  res.json({
    success: true,
    data: job,
  });
}));

/**
 * @route   PATCH /api/admin/scraping/jobs/:id
 * @desc    Update scraping job
 * @access  Private (Admin)
 */
router.patch('/jobs/:id', asyncHandler(async (req, res) => {
  const job = await scrapingJobService.updateJob(
    req.params.id,
    req.body,
    req.user._id
  );

  res.json({
    success: true,
    message: 'Scraping job updated successfully',
    data: job,
  });
}));

/**
 * @route   DELETE /api/admin/scraping/jobs/:id
 * @desc    Delete scraping job
 * @access  Private (Admin)
 */
router.delete('/jobs/:id', asyncHandler(async (req, res) => {
  await scrapingJobService.deleteJob(req.params.id, req.user._id);

  res.json({
    success: true,
    message: 'Scraping job deleted successfully',
  });
}));

/**
 * @route   POST /api/admin/scraping/jobs/:id/start
 * @desc    Start a scraping job
 * @access  Private (Admin)
 */
router.post('/jobs/:id/start', asyncHandler(async (req, res) => {
  const job = await scrapingJobService.startJob(req.params.id, req.user._id);

  res.json({
    success: true,
    message: 'Scraping job started successfully',
    data: job,
  });
}));

/**
 * @route   POST /api/admin/scraping/jobs/:id/pause
 * @desc    Pause a scraping job
 * @access  Private (Admin)
 */
router.post('/jobs/:id/pause', asyncHandler(async (req, res) => {
  const job = await scrapingJobService.pauseJob(req.params.id, req.user._id);

  res.json({
    success: true,
    message: 'Scraping job paused successfully',
    data: job,
  });
}));

/**
 * @route   POST /api/admin/scraping/jobs/:id/resume
 * @desc    Resume a paused scraping job
 * @access  Private (Admin)
 */
router.post('/jobs/:id/resume', asyncHandler(async (req, res) => {
  const job = await scrapingJobService.resumeJob(req.params.id, req.user._id);

  res.json({
    success: true,
    message: 'Scraping job resumed successfully',
    data: job,
  });
}));

/**
 * @route   POST /api/admin/scraping/jobs/:id/cancel
 * @desc    Cancel a scraping job
 * @access  Private (Admin)
 */
router.post('/jobs/:id/cancel', asyncHandler(async (req, res) => {
  const job = await scrapingJobService.cancelJob(req.params.id, req.user._id);

  res.json({
    success: true,
    message: 'Scraping job cancelled successfully',
    data: job,
  });
}));

/**
 * @route   POST /api/admin/scraping/jobs/:id/retry
 * @desc    Retry a failed scraping job
 * @access  Private (Admin)
 */
router.post('/jobs/:id/retry', asyncHandler(async (req, res) => {
  const job = await scrapingJobService.retryJob(req.params.id, req.user._id);

  res.json({
    success: true,
    message: 'Scraping job retry initiated',
    data: job,
  });
}));

/**
 * @route   POST /api/admin/scraping/jobs/:id/clone
 * @desc    Clone a scraping job
 * @access  Private (Admin)
 */
router.post('/jobs/:id/clone', asyncHandler(async (req, res) => {
  const job = await scrapingJobService.cloneJob(
    req.params.id,
    req.user._id,
    req.body
  );

  res.json({
    success: true,
    message: 'Scraping job cloned successfully',
    data: job,
  });
}));

/**
 * @route   GET /api/admin/scraping/jobs/:id/logs
 * @desc    Get logs for a scraping job
 * @access  Private (Admin)
 */
router.get('/jobs/:id/logs', asyncHandler(async (req, res) => {
  const options = {
    type: req.query.type,
    level: req.query.level,
    operation: req.query.operation,
    limit: parseInt(req.query.limit) || 100,
    skip: parseInt(req.query.skip) || 0,
  };

  const logs = await scrapingJobService.getJobLogs(req.params.id, options);

  res.json({
    success: true,
    data: logs,
  });
}));

/**
 * @route   POST /api/admin/scraping/jobs/bulk
 * @desc    Perform bulk operations on jobs
 * @access  Private (Admin)
 */
router.post('/jobs/bulk', asyncHandler(async (req, res) => {
  const { operation, jobIds } = req.body;

  if (!operation || !jobIds || !Array.isArray(jobIds)) {
    throw new ValidationError('Operation and jobIds array are required');
  }

  const results = await scrapingJobService.bulkOperation(
    operation,
    jobIds,
    req.user._id
  );

  res.json({
    success: true,
    message: `Bulk ${operation} completed`,
    data: results,
  });
}));

/**
 * @route   GET /api/admin/scraping/jobs/stats/overview
 * @desc    Get job statistics overview
 * @access  Private (Admin)
 */
router.get('/jobs/stats/overview', asyncHandler(async (req, res) => {
  const dateRange = req.query.dateFrom || req.query.dateTo ? {
    from: req.query.dateFrom,
    to: req.query.dateTo,
  } : undefined;

  const stats = await scrapingJobService.getStatistics(dateRange);

  res.json({
    success: true,
    data: stats,
  });
}));

/**
 * @route   GET /api/admin/scraping/jobs/active
 * @desc    Get active jobs
 * @access  Private (Admin)
 */
router.get('/jobs/active', asyncHandler(async (req, res) => {
  const jobs = await scrapingJobService.getActiveJobs();

  res.json({
    success: true,
    data: jobs,
  });
}));

/**
 * @route   GET /api/admin/scraping/jobs/scheduled
 * @desc    Get scheduled jobs
 * @access  Private (Admin)
 */
router.get('/jobs/scheduled', asyncHandler(async (req, res) => {
  const jobs = await scrapingJobService.getScheduledJobs();

  res.json({
    success: true,
    data: jobs,
  });
}));

// ============================================================================
// SOURCES ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/scraping/sources
 * @desc    Get all scraping sources
 * @access  Private (Admin)
 */
router.get('/sources', asyncHandler(async (req, res) => {
  const filters = {
    status: req.query.status,
    type: req.query.type,
    category: req.query.category,
    isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
    search: req.query.search,
  };

  const options = {
    page: req.query.page,
    limit: req.query.limit,
  };

  const result = await sourceManagementService.getSources(filters, options);

  res.json({
    success: true,
    data: result.sources,
    pagination: result.pagination,
  });
}));

/**
 * @route   POST /api/admin/scraping/sources
 * @desc    Create a new scraping source
 * @access  Private (Admin)
 */
router.post('/sources', asyncHandler(async (req, res) => {
  const source = await sourceManagementService.createSource(
    req.body,
    req.user._id
  );

  res.status(201).json({
    success: true,
    message: 'Scraping source created successfully',
    data: source,
  });
}));

/**
 * @route   GET /api/admin/scraping/sources/:id
 * @desc    Get scraping source by ID
 * @access  Private (Admin)
 */
router.get('/sources/:id', asyncHandler(async (req, res) => {
  const source = await sourceManagementService.getSourceById(req.params.id);

  res.json({
    success: true,
    data: source,
  });
}));

/**
 * @route   PATCH /api/admin/scraping/sources/:id
 * @desc    Update scraping source
 * @access  Private (Admin)
 */
router.patch('/sources/:id', asyncHandler(async (req, res) => {
  const source = await sourceManagementService.updateSource(
    req.params.id,
    req.body,
    req.user._id
  );

  res.json({
    success: true,
    message: 'Scraping source updated successfully',
    data: source,
  });
}));

/**
 * @route   DELETE /api/admin/scraping/sources/:id
 * @desc    Delete scraping source
 * @access  Private (Admin)
 */
router.delete('/sources/:id', asyncHandler(async (req, res) => {
  await sourceManagementService.deleteSource(req.params.id, req.user._id);

  res.json({
    success: true,
    message: 'Scraping source deleted successfully',
  });
}));

/**
 * @route   POST /api/admin/scraping/sources/:id/toggle
 * @desc    Enable/disable scraping source
 * @access  Private (Admin)
 */
router.post('/sources/:id/toggle', asyncHandler(async (req, res) => {
  const { enabled } = req.body;
  const source = await sourceManagementService.toggleSourceStatus(
    req.params.id,
    enabled,
    req.user._id
  );

  res.json({
    success: true,
    message: `Scraping source ${enabled ? 'enabled' : 'disabled'} successfully`,
    data: source,
  });
}));

/**
 * @route   POST /api/admin/scraping/sources/:id/test
 * @desc    Test source connectivity
 * @access  Private (Admin)
 */
router.post('/sources/:id/test', asyncHandler(async (req, res) => {
  const result = await sourceManagementService.testSource(req.params.id);

  res.json({
    success: true,
    data: result,
  });
}));

/**
 * @route   GET /api/admin/scraping/sources/:id/stats
 * @desc    Get source statistics
 * @access  Private (Admin)
 */
router.get('/sources/:id/stats', asyncHandler(async (req, res) => {
  const dateRange = req.query.dateFrom || req.query.dateTo ? {
    from: req.query.dateFrom,
    to: req.query.dateTo,
  } : undefined;

  const stats = await sourceManagementService.getSourceStatistics(
    req.params.id,
    dateRange
  );

  res.json({
    success: true,
    data: stats,
  });
}));

/**
 * @route   POST /api/admin/scraping/sources/:id/proxies
 * @desc    Add proxy to source
 * @access  Private (Admin)
 */
router.post('/sources/:id/proxies', asyncHandler(async (req, res) => {
  const source = await sourceManagementService.addProxy(
    req.params.id,
    req.body,
    req.user._id
  );

  res.json({
    success: true,
    message: 'Proxy added successfully',
    data: source,
  });
}));

/**
 * @route   DELETE /api/admin/scraping/sources/:id/proxies/:proxyId
 * @desc    Remove proxy from source
 * @access  Private (Admin)
 */
router.delete('/sources/:id/proxies/:proxyId', asyncHandler(async (req, res) => {
  const source = await sourceManagementService.removeProxy(
    req.params.id,
    req.params.proxyId,
    req.user._id
  );

  res.json({
    success: true,
    message: 'Proxy removed successfully',
    data: source,
  });
}));

/**
 * @route   POST /api/admin/scraping/sources/test-proxy
 * @desc    Test proxy connectivity
 * @access  Private (Admin)
 */
router.post('/sources/test-proxy', asyncHandler(async (req, res) => {
  const result = await sourceManagementService.testProxy(req.body);

  res.json({
    success: true,
    data: result,
  });
}));

/**
 * @route   GET /api/admin/scraping/sources/active/list
 * @desc    Get active sources
 * @access  Private (Admin)
 */
router.get('/sources/active/list', asyncHandler(async (req, res) => {
  const sources = await sourceManagementService.getActiveSources();

  res.json({
    success: true,
    data: sources,
  });
}));

/**
 * @route   GET /api/admin/scraping/sources/types
 * @desc    Get available source types
 * @access  Private (Admin)
 */
router.get('/sources/types', asyncHandler(async (req, res) => {
  const types = await sourceManagementService.getTypes();

  res.json({
    success: true,
    data: types,
  });
}));

/**
 * @route   GET /api/admin/scraping/sources/categories
 * @desc    Get available source categories
 * @access  Private (Admin)
 */
router.get('/sources/categories', asyncHandler(async (req, res) => {
  const categories = await sourceManagementService.getCategories();

  res.json({
    success: true,
    data: categories,
  });
}));

// ============================================================================
// QUEUE ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/scraping/queues
 * @desc    Get all queue statuses
 * @access  Private (Admin)
 */
router.get('/queues', asyncHandler(async (req, res) => {
  const statuses = await queueManagementService.getAllQueueStatuses();

  res.json({
    success: true,
    data: statuses,
  });
}));

/**
 * @route   GET /api/admin/scraping/queues/:name
 * @desc    Get specific queue status
 * @access  Private (Admin)
 */
router.get('/queues/:name', asyncHandler(async (req, res) => {
  const status = await queueManagementService.getQueueStatus(req.params.name);

  res.json({
    success: true,
    data: status,
  });
}));

/**
 * @route   GET /api/admin/scraping/queues/:name/jobs/:state
 * @desc    Get jobs from queue by state
 * @access  Private (Admin)
 */
router.get('/queues/:name/jobs/:state', asyncHandler(async (req, res) => {
  const options = {
    limit: parseInt(req.query.limit) || 50,
    offset: parseInt(req.query.offset) || 0,
  };

  const jobs = await queueManagementService.getQueueJobs(
    req.params.name,
    req.params.state,
    options
  );

  res.json({
    success: true,
    data: jobs,
  });
}));

/**
 * @route   GET /api/admin/scraping/queues/:name/jobs/details/:jobId
 * @desc    Get job details
 * @access  Private (Admin)
 */
router.get('/queues/:name/jobs/details/:jobId', asyncHandler(async (req, res) => {
  const job = await queueManagementService.getJobDetails(
    req.params.name,
    req.params.jobId
  );

  res.json({
    success: true,
    data: job,
  });
}));

/**
 * @route   POST /api/admin/scraping/queues/:name/jobs/:jobId/retry
 * @desc    Retry a failed job
 * @access  Private (Admin)
 */
router.post('/queues/:name/jobs/:jobId/retry', asyncHandler(async (req, res) => {
  await queueManagementService.retryJob(
    req.params.name,
    req.params.jobId,
    req.user._id
  );

  res.json({
    success: true,
    message: 'Job retry initiated',
  });
}));

/**
 * @route   POST /api/admin/scraping/queues/:name/retry-all
 * @desc    Retry all failed jobs
 * @access  Private (Admin)
 */
router.post('/queues/:name/retry-all', asyncHandler(async (req, res) => {
  const results = await queueManagementService.retryAllFailed(
    req.params.name,
    req.user._id
  );

  res.json({
    success: true,
    message: 'Retry all failed jobs initiated',
    data: results,
  });
}));

/**
 * @route   DELETE /api/admin/scraping/queues/:name/jobs/:jobId
 * @desc    Remove job from queue
 * @access  Private (Admin)
 */
router.delete('/queues/:name/jobs/:jobId', asyncHandler(async (req, res) => {
  await queueManagementService.removeJob(
    req.params.name,
    req.params.jobId,
    req.user._id
  );

  res.json({
    success: true,
    message: 'Job removed from queue',
  });
}));

/**
 * @route   POST /api/admin/scraping/queues/:name/clean
 * @desc    Clean queue (remove completed/failed jobs)
 * @access  Private (Admin)
 */
router.post('/queues/:name/clean', asyncHandler(async (req, res) => {
  const options = {
    status: req.body.status || 'completed',
    gracePeriodMs: req.body.gracePeriodMs || 86400000,
  };

  const result = await queueManagementService.cleanQueue(
    req.params.name,
    options,
    req.user._id
  );

  res.json({
    success: true,
    message: 'Queue cleaned successfully',
    data: result,
  });
}));

/**
 * @route   POST /api/admin/scraping/queues/:name/pause
 * @desc    Pause queue
 * @access  Private (Admin)
 */
router.post('/queues/:name/pause', asyncHandler(async (req, res) => {
  await queueManagementService.pauseQueue(req.params.name, req.user._id);

  res.json({
    success: true,
    message: 'Queue paused successfully',
  });
}));

/**
 * @route   POST /api/admin/scraping/queues/:name/resume
 * @desc    Resume queue
 * @access  Private (Admin)
 */
router.post('/queues/:name/resume', asyncHandler(async (req, res) => {
  await queueManagementService.resumeQueue(req.params.name, req.user._id);

  res.json({
    success: true,
    message: 'Queue resumed successfully',
  });
}));

/**
 * @route   POST /api/admin/scraping/queues/:name/empty
 * @desc    Empty queue (remove all waiting jobs)
 * @access  Private (Admin)
 */
router.post('/queues/:name/empty', asyncHandler(async (req, res) => {
  await queueManagementService.emptyQueue(req.params.name, req.user._id);

  res.json({
    success: true,
    message: 'Queue emptied successfully',
  });
}));

/**
 * @route   GET /api/admin/scraping/queues/:name/metrics
 * @desc    Get queue metrics
 * @access  Private (Admin)
 */
router.get('/queues/:name/metrics', asyncHandler(async (req, res) => {
  const dateRange = req.query.dateFrom || req.query.dateTo ? {
    from: req.query.dateFrom,
    to: req.query.dateTo,
  } : undefined;

  const metrics = await queueManagementService.getQueueMetrics(
    req.params.name,
    dateRange
  );

  res.json({
    success: true,
    data: metrics,
  });
}));

/**
 * @route   GET /api/admin/scraping/queues/:name/failed-reasons
 * @desc    Get failed job reasons
 * @access  Private (Admin)
 */
router.get('/queues/:name/failed-reasons', asyncHandler(async (req, res) => {
  const reasons = await queueManagementService.getFailedJobReasons(
    req.params.name,
    parseInt(req.query.limit) || 10
  );

  res.json({
    success: true,
    data: reasons,
  });
}));

/**
 * @route   GET /api/admin/scraping/queues/health
 * @desc    Get queue health status
 * @access  Private (Admin)
 */
router.get('/queues/health', asyncHandler(async (req, res) => {
  const health = await queueManagementService.getQueueHealth();

  res.json({
    success: true,
    data: health,
  });
}));

// ============================================================================
// ANALYTICS ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/scraping/analytics/dashboard
 * @desc    Get dashboard overview
 * @access  Private (Admin)
 */
router.get('/analytics/dashboard', asyncHandler(async (req, res) => {
  const dateRange = req.query.dateFrom || req.query.dateTo ? {
    from: req.query.dateFrom,
    to: req.query.dateTo,
  } : undefined;

  const overview = await scrapingAnalyticsService.getDashboardOverview(dateRange);

  res.json({
    success: true,
    data: overview,
  });
}));

/**
 * @route   GET /api/admin/scraping/analytics/jobs
 * @desc    Get job analytics
 * @access  Private (Admin)
 */
router.get('/analytics/jobs', asyncHandler(async (req, res) => {
  const fromDate = req.query.dateFrom
    ? new Date(req.query.dateFrom)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate = req.query.dateTo ? new Date(req.query.dateTo) : new Date();

  const stats = await scrapingAnalyticsService.getJobStatistics(fromDate, toDate);

  res.json({
    success: true,
    data: stats,
  });
}));

/**
 * @route   GET /api/admin/scraping/analytics/sources
 * @desc    Get source analytics
 * @access  Private (Admin)
 */
router.get('/analytics/sources', asyncHandler(async (req, res) => {
  const fromDate = req.query.dateFrom
    ? new Date(req.query.dateFrom)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate = req.query.dateTo ? new Date(req.query.dateTo) : new Date();

  const stats = await scrapingAnalyticsService.getSourceStatistics(fromDate, toDate);

  res.json({
    success: true,
    data: stats,
  });
}));

/**
 * @route   GET /api/admin/scraping/analytics/cvs
 * @desc    Get CV analytics
 * @access  Private (Admin)
 */
router.get('/analytics/cvs', asyncHandler(async (req, res) => {
  const fromDate = req.query.dateFrom
    ? new Date(req.query.dateFrom)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate = req.query.dateTo ? new Date(req.query.dateTo) : new Date();

  const stats = await scrapingAnalyticsService.getCVStatistics(fromDate, toDate);

  res.json({
    success: true,
    data: stats,
  });
}));

/**
 * @route   GET /api/admin/scraping/analytics/performance
 * @desc    Get performance metrics
 * @access  Private (Admin)
 */
router.get('/analytics/performance', asyncHandler(async (req, res) => {
  const dateRange = req.query.dateFrom || req.query.dateTo ? {
    from: req.query.dateFrom,
    to: req.query.dateTo,
  } : undefined;

  const metrics = await scrapingAnalyticsService.getPerformanceMetrics(dateRange);

  res.json({
    success: true,
    data: metrics,
  });
}));

/**
 * @route   GET /api/admin/scraping/analytics/quality-trends
 * @desc    Get quality trends
 * @access  Private (Admin)
 */
router.get('/analytics/quality-trends', asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const trends = await scrapingAnalyticsService.getQualityTrends(days);

  res.json({
    success: true,
    data: trends,
  });
}));

/**
 * @route   GET /api/admin/scraping/analytics/hourly
 * @desc    Get hourly distribution
 * @access  Private (Admin)
 */
router.get('/analytics/hourly', asyncHandler(async (req, res) => {
  const dateRange = req.query.dateFrom || req.query.dateTo ? {
    from: req.query.dateFrom,
    to: req.query.dateTo,
  } : undefined;

  const distribution = await scrapingAnalyticsService.getHourlyDistribution(dateRange);

  res.json({
    success: true,
    data: distribution,
  });
}));

/**
 * @route   POST /api/admin/scraping/analytics/compare-sources
 * @desc    Compare sources
 * @access  Private (Admin)
 */
router.post('/analytics/compare-sources', asyncHandler(async (req, res) => {
  const { sourceIds } = req.body;
  const dateRange = req.query.dateFrom || req.query.dateTo ? {
    from: req.query.dateFrom,
    to: req.query.dateTo,
  } : undefined;

  const comparison = await scrapingAnalyticsService.getSourceComparison(
    sourceIds,
    dateRange
  );

  res.json({
    success: true,
    data: comparison,
  });
}));

/**
 * @route   GET /api/admin/scraping/analytics/errors
 * @desc    Get error analysis
 * @access  Private (Admin)
 */
router.get('/analytics/errors', asyncHandler(async (req, res) => {
  const dateRange = req.query.dateFrom || req.query.dateTo ? {
    from: req.query.dateFrom,
    to: req.query.dateTo,
  } : undefined;

  const errors = await scrapingAnalyticsService.getErrorAnalysis(dateRange);

  res.json({
    success: true,
    data: errors,
  });
}));

/**
 * @route   POST /api/admin/scraping/analytics/report
 * @desc    Generate custom report
 * @access  Private (Admin)
 */
router.post('/analytics/report', asyncHandler(async (req, res) => {
  const report = await scrapingAnalyticsService.generateReport(req.body);

  res.json({
    success: true,
    data: report,
  });
}));

// ============================================================================
// EXPORT ROUTES
// ============================================================================

/**
 * @route   POST /api/admin/scraping/exports
 * @desc    Create export
 * @access  Private (Admin)
 */
router.post('/exports', asyncHandler(async (req, res) => {
  const result = await cvExportService.createExport(req.body, req.user._id);

  res.status(result.status === 'completed' ? 200 : 202).json({
    success: true,
    message: result.status === 'completed'
      ? 'Export completed'
      : 'Export is being processed',
    data: result,
  });
}));

/**
 * @route   GET /api/admin/scraping/exports
 * @desc    List exports
 * @access  Private (Admin)
 */
router.get('/exports', asyncHandler(async (req, res) => {
  const options = {
    page: req.query.page,
    limit: req.query.limit,
  };

  const result = await cvExportService.listExports(options);

  res.json({
    success: true,
    data: result.exports,
    pagination: result.pagination,
  });
}));

/**
 * @route   GET /api/admin/scraping/exports/:id/status
 * @desc    Get export status
 * @access  Private (Admin)
 */
router.get('/exports/:id/status', asyncHandler(async (req, res) => {
  const status = await cvExportService.getExportStatus(req.params.id);

  res.json({
    success: true,
    data: status,
  });
}));

/**
 * @route   DELETE /api/admin/scraping/exports/:filename
 * @desc    Delete export
 * @access  Private (Admin)
 */
router.delete('/exports/:filename', asyncHandler(async (req, res) => {
  await cvExportService.deleteExport(req.params.filename, req.user._id);

  res.json({
    success: true,
    message: 'Export deleted successfully',
  });
}));

// ============================================================================
// DATA VALIDATION ROUTES
// ============================================================================

/**
 * @route   POST /api/admin/scraping/validation/validate/:cvId
 * @desc    Validate a single CV
 * @access  Private (Admin)
 */
router.post('/validation/validate/:cvId', asyncHandler(async (req, res) => {
  const result = await dataValidationService.validateCV(req.params.cvId);

  res.json({
    success: true,
    data: result,
  });
}));

/**
 * @route   POST /api/admin/scraping/validation/bulk
 * @desc    Bulk validate CVs
 * @access  Private (Admin)
 */
router.post('/validation/bulk', asyncHandler(async (req, res) => {
  const { query, options } = req.body;
  const result = await dataValidationService.bulkValidate(query, options);

  res.json({
    success: true,
    data: result,
  });
}));

/**
 * @route   POST /api/admin/scraping/validation/clean/:cvId
 * @desc    Clean a single CV
 * @access  Private (Admin)
 */
router.post('/validation/clean/:cvId', asyncHandler(async (req, res) => {
  const result = await dataValidationService.cleanData(req.params.cvId);

  res.json({
    success: true,
    data: result,
  });
}));

/**
 * @route   POST /api/admin/scraping/validation/find-duplicates
 * @desc    Find duplicate CVs
 * @access  Private (Admin)
 */
router.post('/validation/find-duplicates', asyncHandler(async (req, res) => {
  const result = await dataValidationService.findDuplicates(req.body);

  res.json({
    success: true,
    data: result,
  });
}));

/**
 * @route   POST /api/admin/scraping/validation/merge-duplicates
 * @desc    Merge duplicate CVs
 * @access  Private (Admin)
 */
router.post('/validation/merge-duplicates', asyncHandler(async (req, res) => {
  const { primaryId, duplicateIds } = req.body;
  const result = await dataValidationService.mergeDuplicates(
    primaryId,
    duplicateIds,
    req.user._id
  );

  res.json({
    success: true,
    data: result,
  });
}));

/**
 * @route   GET /api/admin/scraping/validation/statistics
 * @desc    Get validation statistics
 * @access  Private (Admin)
 */
router.get('/validation/statistics', asyncHandler(async (req, res) => {
  const stats = await dataValidationService.getValidationStatistics();

  res.json({
    success: true,
    data: stats,
  });
}));

/**
 * @route   POST /api/admin/scraping/validation/quality-report
 * @desc    Generate quality report
 * @access  Private (Admin)
 */
router.post('/validation/quality-report', asyncHandler(async (req, res) => {
  const report = await dataValidationService.generateQualityReport(req.body);

  res.json({
    success: true,
    data: report,
  });
}));

module.exports = router;