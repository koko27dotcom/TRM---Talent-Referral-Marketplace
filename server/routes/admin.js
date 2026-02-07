/**
 * Admin Routes
 * "God Mode" API routes for platform administration
 * Provides secure endpoints for dashboard, user management, and payout processing
 */

const express = require('express');
const { authenticate } = require('../middleware/auth.js');
const { requireAdmin } = require('../middleware/rbac.js');
const { asyncHandler } = require('../middleware/errorHandler.js');
const {
  getDashboardStats,
  getPendingPayouts,
  batchProcessPayouts,
  getAllUsers,
  getAllCompanies,
  getRevenueAnalytics,
  updateUserStatus,
} = require('../controllers/adminController.js');

const router = express.Router();

// Apply authentication and admin requirement to all routes
router.use(authenticate);
router.use(requireAdmin);

/**
 * @route   GET /api/v1/admin/dashboard
 * @desc    Get comprehensive admin dashboard statistics
 * @access  Private (Admin)
 * @query   period - Time period for stats (24h, 7d, 30d, 90d, 1y)
 */
router.get('/dashboard', asyncHandler(getDashboardStats));

/**
 * @route   GET /api/v1/admin/payouts/pending
 * @desc    Get detailed pending payouts list
 * @access  Private (Admin)
 * @query   page - Page number
 * @query   limit - Items per page
 * @query   status - Filter by status (pending, approved, all)
 */
router.get('/payouts/pending', asyncHandler(getPendingPayouts));

/**
 * @route   POST /api/v1/admin/payouts/process
 * @desc    Batch process payouts (approve/reject/mark_paid)
 * @access  Private (Admin)
 * @body    payoutIds - Array of payout IDs to process
 * @body    action - Action to perform (approve, reject, mark_paid)
 * @body    paymentInfo - Optional payment details for mark_paid action
 */
router.post('/payouts/process', asyncHandler(batchProcessPayouts));

/**
 * @route   GET /api/v1/admin/users
 * @desc    Get all users with optional filtering
 * @access  Private (Admin)
 * @query   page - Page number
 * @query   limit - Items per page
 * @query   search - Search by name or email
 * @query   role - Filter by role
 * @query   status - Filter by status
 * @query   sortBy - Sort field
 * @query   sortOrder - Sort direction (asc/desc)
 */
router.get('/users', asyncHandler(getAllUsers));

/**
 * @route   PATCH /api/v1/admin/users/:id/status
 * @desc    Update user status (suspend/activate)
 * @access  Private (Admin)
 * @param   id - User ID
 * @body    status - New status (active/suspended)
 * @body    reason - Reason for status change
 */
router.patch('/users/:id/status', asyncHandler(updateUserStatus));

/**
 * @route   GET /api/v1/admin/companies
 * @desc    Get all companies with optional filtering
 * @access  Private (Admin)
 * @query   page - Page number
 * @query   limit - Items per page
 * @query   search - Search by name or email
 * @query   status - Filter by status
 * @query   verificationStatus - Filter by verification status
 */
router.get('/companies', asyncHandler(getAllCompanies));

/**
 * @route   GET /api/v1/admin/revenue
 * @desc    Get platform revenue analytics
 * @access  Private (Admin)
 * @query   period - Time period (7d, 30d, 90d, 1y)
 * @query   groupBy - Group by day or month
 */
router.get('/revenue', asyncHandler(getRevenueAnalytics));

/**
 * @route   GET /api/v1/admin/health
 * @desc    Get system health status
 * @access  Private (Admin)
 */
router.get('/health', asyncHandler(async (req, res) => {
  const mongoose = require('mongoose');
  
  // Check database connection
  const dbState = mongoose.connection.readyState;
  const dbStatus = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  }[dbState] || 'unknown';
  
  // Get memory usage
  const memUsage = process.memoryUsage();
  
  // Get uptime
  const uptime = process.uptime();
  
  res.json({
    success: true,
    data: {
      status: dbStatus === 'connected' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        host: mongoose.connection.host || 'unknown',
        name: mongoose.connection.name || 'unknown',
      },
      system: {
        uptime: Math.floor(uptime),
        uptimeFormatted: formatUptime(uptime),
        memory: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          rss: Math.round(memUsage.rss / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024),
        },
        nodeVersion: process.version,
        platform: process.platform,
      },
    },
  });
}));

/**
 * Format uptime in human-readable format
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(days + 'd');
  if (hours > 0) parts.push(hours + 'h');
  if (minutes > 0) parts.push(minutes + 'm');
  if (secs > 0 || parts.length === 0) parts.push(secs + 's');
  
  return parts.join(' ');
}

/**
 * @route   POST /api/v1/admin/jobs/import
 * @desc    Import jobs from JSON or CSV file
 * @access  Private (Admin)
 * @body    jobs - Array of job objects or CSV data
 * @body    format - 'json' or 'csv'
 * @body    options - Import options (skipDuplicates, defaultStatus, etc.)
 */
router.post('/jobs/import', asyncHandler(async (req, res) => {
  const { jobs, format = 'json', options = {} } = req.body;
  
  if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Jobs array is required and must not be empty',
    });
  }
  
  const {
    skipDuplicates = true,
    defaultStatus = 'active',
    defaultCompanyId,
    validateOnly = false,
  } = options;
  
  const results = {
    total: jobs.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    jobs: [],
  };
  
  // Find admin user for postedBy
  const User = require('../models/User.js');
  let adminUser = await User.findOne({ role: 'admin' });
  
  if (!adminUser) {
    return res.status(500).json({
      success: false,
      message: 'No admin user found to assign as job poster',
    });
  }
  
  // Process each job
  for (let i = 0; i < jobs.length; i++) {
    const jobData = jobs[i];
    
    try {
      // Validate required fields
      if (!jobData.title) {
        throw new Error('Job title is required');
      }
      
      if (!jobData.companyId && !defaultCompanyId) {
        throw new Error('Company ID is required (or provide defaultCompanyId)');
      }
      
      // Check for duplicates if skipDuplicates is enabled
      if (skipDuplicates && jobData.title) {
        const existingJob = await Job.findOne({
          title: jobData.title,
          companyId: jobData.companyId || defaultCompanyId,
        });
        
        if (existingJob) {
          results.skipped++;
          continue;
        }
      }
      
      // Prepare job data
      const jobToCreate = {
        title: jobData.title,
        description: jobData.description || '',
        requirements: Array.isArray(jobData.requirements) ? jobData.requirements : [],
        responsibilities: Array.isArray(jobData.responsibilities) ? jobData.responsibilities : [],
        benefits: Array.isArray(jobData.benefits) ? jobData.benefits : [],
        companyId: jobData.companyId || defaultCompanyId,
        postedBy: adminUser._id,
        location: {
          type: jobData.location?.type || 'onsite',
          city: jobData.location?.city || 'Yangon',
          country: jobData.location?.country || 'Myanmar',
        },
        type: jobData.employmentType || jobData.type || 'full-time',
        category: jobData.category || 'General',
        salary: {
          min: jobData.salary?.min || 0,
          max: jobData.salary?.max || 0,
          currency: jobData.salary?.currency || 'MMK',
          period: jobData.salary?.period || 'monthly',
          isNegotiable: jobData.salary?.isNegotiable ?? true,
        },
        referralBonus: jobData.referralBonus || 100000,
        status: jobData.status || defaultStatus,
        isFeatured: jobData.isFeatured || false,
        isUrgent: jobData.isUrgent || false,
        slug: `${jobData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}-${i}`,
        publishedAt: new Date(),
      };
      
      if (validateOnly) {
        // Just validate, don't create
        results.jobs.push({
          index: i,
          title: jobData.title,
          valid: true,
          data: jobToCreate,
        });
      } else {
        // Create the job
        const job = await Job.create(jobToCreate);
        results.created++;
        results.jobs.push({
          index: i,
          id: job._id,
          title: job.title,
          status: 'created',
        });
      }
    } catch (error) {
      results.errors.push({
        index: i,
        title: jobData.title || `Job #${i + 1}`,
        error: error.message,
      });
    }
  }
  
  // Log the import action
  const AuditLog = require('../models/AuditLog.js');
  await AuditLog.logUserAction({
    user: req.user,
    action: validateOnly ? 'jobs_import_validated' : 'jobs_imported',
    entityType: 'jobs',
    description: `${validateOnly ? 'Validated' : 'Imported'} ${results.created} jobs (${results.errors.length} errors)`,
    req,
    metadata: {
      total: results.total,
      created: results.created,
      skipped: results.skipped,
      errors: results.errors.length,
      format,
    },
  });
  
  res.json({
    success: true,
    message: validateOnly
      ? `Validation complete: ${results.total} jobs processed`
      : `Import complete: ${results.created} jobs created, ${results.skipped} skipped, ${results.errors.length} errors`,
    data: results,
  });
}));

/**
 * @route   POST /api/v1/admin/jobs/import/validate
 * @desc    Validate jobs data without importing
 * @access  Private (Admin)
 */
router.post('/jobs/import/validate', asyncHandler(async (req, res) => {
  const { jobs, format = 'json' } = req.body;
  
  if (!jobs || !Array.isArray(jobs)) {
    return res.status(400).json({
      success: false,
      message: 'Jobs array is required',
    });
  }
  
  const validationResults = {
    total: jobs.length,
    valid: 0,
    invalid: 0,
    errors: [],
  };
  
  const requiredFields = ['title'];
  
  jobs.forEach((job, index) => {
    const jobErrors = [];
    
    // Check required fields
    requiredFields.forEach(field => {
      if (!job[field]) {
        jobErrors.push(`${field} is required`);
      }
    });
    
    // Validate salary if provided
    if (job.salary) {
      if (job.salary.min && typeof job.salary.min !== 'number') {
        jobErrors.push('salary.min must be a number');
      }
      if (job.salary.max && typeof job.salary.max !== 'number') {
        jobErrors.push('salary.max must be a number');
      }
    }
    
    // Validate referral bonus
    if (job.referralBonus && typeof job.referralBonus !== 'number') {
      jobErrors.push('referralBonus must be a number');
    }
    
    if (jobErrors.length > 0) {
      validationResults.invalid++;
      validationResults.errors.push({
        index,
        title: job.title || `Job #${index + 1}`,
        errors: jobErrors,
      });
    } else {
      validationResults.valid++;
    }
  });
  
  res.json({
    success: true,
    data: validationResults,
  });
}));

/**
 * @route   GET /api/v1/admin/jobs/import/template
 * @desc    Get JSON template for job import
 * @access  Private (Admin)
 */
router.get('/jobs/import/template', asyncHandler(async (req, res) => {
  const template = {
    description: 'Job Import Template',
    notes: [
      'All jobs must have a title',
      'companyId or defaultCompanyId is required',
      'salary.min and salary.max should be numbers (MMK)',
      'referralBonus should be a number (MMK)',
      'employmentType options: full-time, part-time, contract, internship, freelance',
      'location.type options: onsite, remote, hybrid',
    ],
    example: {
      title: 'Software Developer',
      description: 'We are looking for a skilled developer...',
      requirements: ['3+ years experience', 'JavaScript proficiency'],
      responsibilities: ['Develop features', 'Fix bugs'],
      benefits: ['Health insurance', 'Flexible hours'],
      companyId: 'company_id_here',
      location: {
        type: 'onsite',
        city: 'Yangon',
        country: 'Myanmar',
      },
      employmentType: 'full-time',
      category: 'Technology',
      salary: {
        min: 500000,
        max: 1000000,
        currency: 'MMK',
        period: 'monthly',
        isNegotiable: true,
      },
      referralBonus: 150000,
      status: 'active',
      isFeatured: false,
      isUrgent: false,
    },
  };
  
  res.json({
    success: true,
    data: template,
  });
}));

module.exports = router;
