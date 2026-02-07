/**
 * Job Routes
 * Handles job posting, search, applications, and job management
 */

const express = require('express');
const { Job, Company, Application, AuditLog } = require('../models/index.js');
const { authenticate, optionalAuth } = require('../middleware/auth.js');
const { asyncHandler, ValidationError, NotFoundError, AuthorizationError, ConflictError } = require('../middleware/errorHandler.js');
const { requireCompanyAccess, requireJobManager, requireJobViewer } = require('../middleware/rbac.js');
const { PERMISSIONS } = require('../models/CompanyUser.js');

const router = express.Router();

/**
 * @route   GET /api/jobs
 * @desc    Get all jobs (with filters and search)
 * @access  Public
 */
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    search,
    location,
    type,
    category,
    salaryMin,
    salaryMax,
    company,
    isFeatured,
    isUrgent,
    sortBy = 'newest',
  } = req.query;
  
  // Build filters
  const filters = {};
  
  if (location) {
    filters['location.city'] = { $regex: location, $options: 'i' };
  }
  
  if (type) filters.type = type;
  if (category) filters.category = category;
  if (company) filters.companyId = company;
  if (isFeatured === 'true') filters.isFeatured = true;
  if (isUrgent === 'true') filters.isUrgent = true;
  
  if (salaryMin || salaryMax) {
    filters['salary.min'] = {};
    if (salaryMin) filters['salary.min'].$gte = parseInt(salaryMin);
    if (salaryMax) filters['salary.max'] = { $lte: parseInt(salaryMax) };
  }
  
  // Build sort
  let sort = {};
  switch (sortBy) {
    case 'salary':
      sort = { 'salary.max': -1 };
      break;
    case 'relevance':
      sort = { score: { $meta: 'textScore' } };
      break;
    case 'newest':
    default:
      sort = { publishedAt: -1 };
  }
  
  // Execute search or filtered query
  let jobs;
  let total;
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  if (search) {
    // Text search
    const searchResults = await Job.search(search, { limit: parseInt(limit), skip });
    jobs = searchResults;
    total = await Job.countDocuments({ $text: { $search: search }, status: 'active' });
  } else {
    // Filtered query
    [jobs, total] = await Promise.all([
      Job.findActiveJobs(filters, { sort, limit: parseInt(limit), skip }),
      Job.countDocuments({ status: 'active', ...filters }),
    ]);
  }
  
  res.json({
    success: true,
    data: {
      jobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
}));

/**
 * @route   GET /api/jobs/featured
 * @desc    Get featured jobs
 * @access  Public
 */
router.get('/featured', asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  
  const jobs = await Job.findFeatured({ limit: parseInt(limit) });
  
  res.json({
    success: true,
    data: { jobs },
  });
}));

/**
 * @route   GET /api/jobs/categories
 * @desc    Get job categories with counts
 * @access  Public
 */
router.get('/categories', asyncHandler(async (req, res) => {
  const categories = await Job.getCategories();
  
  res.json({
    success: true,
    data: { categories },
  });
}));

/**
 * @route   POST /api/jobs
 * @desc    Create a new job
 * @access  Private (Company Job Manager)
 */
router.post('/', authenticate, requireJobManager, asyncHandler(async (req, res) => {
  const {
    title,
    description,
    summary,
    location,
    type,
    category,
    department,
    experienceLevel,
    salary,
    requirements,
    responsibilities,
    benefits,
    skills,
    referralBonus,
    isFeatured,
    isUrgent,
    applicationSettings,
    expiresAt,
  } = req.body;
  
  // Validate required fields
  if (!title || !description || !location || !type || !referralBonus) {
    throw new ValidationError('Please provide all required fields: title, description, location, type, referralBonus');
  }
  
  const companyId = req.companyId;
  
  // Check if company can post jobs
  const company = await Company.findById(companyId);
  
  if (!company.canPostJobs) {
    throw new AuthorizationError('Company cannot post jobs. Check subscription or verification status.');
  }
  
  // Check job posting limit
  if (company.activeJobCount >= company.jobPostingLimit) {
    throw new ValidationError('Job posting limit reached. Please upgrade your plan.');
  }
  
  // Create job
  const job = await Job.create({
    title: title.trim(),
    description: description.trim(),
    summary,
    companyId,
    postedBy: req.user._id,
    location,
    type,
    category,
    department,
    experienceLevel,
    salary,
    requirements,
    responsibilities,
    benefits,
    skills,
    referralBonus: parseInt(referralBonus),
    isFeatured: isFeatured || false,
    isUrgent: isUrgent || false,
    applicationSettings,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    status: company.settings?.requireApproval ? 'pending' : 'active',
  });
  
  // Increment company job count
  await company.incrementJobCount();
  
  // Log job creation
  await AuditLog.logUserAction({
    user: req.user,
    action: 'job_created',
    entityType: 'job',
    entityId: job._id,
    entityName: job.title,
    description: `Job created: ${title}`,
    req,
    companyId,
    severity: 'info',
  });
  
  res.status(201).json({
    success: true,
    message: 'Job created successfully',
    data: { job },
  });
}));

/**
 * @route   GET /api/jobs/:id
 * @desc    Get job by ID
 * @access  Public
 */
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const job = await Job.findById(id)
    .populate('companyId', 'name slug logo description website')
    .populate('postedBy', 'name');
  
  if (!job) {
    throw new NotFoundError('Job');
  }
  
  // Increment view count (async, don't wait)
  job.incrementViews().catch(console.error);
  
  res.json({
    success: true,
    data: { job },
  });
}));

/**
 * @route   PUT /api/jobs/:id
 * @desc    Update job
 * @access  Private (Company Job Manager)
 */
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const job = await Job.findById(id);
  
  if (!job) {
    throw new NotFoundError('Job');
  }
  
  // Check permissions
  const hasPermission = await checkJobPermission(req.user, job, PERMISSIONS.WRITE_JOBS);
  if (!hasPermission) {
    throw new AuthorizationError();
  }
  
  const updateFields = [
    'title', 'description', 'summary', 'location', 'type', 'category',
    'department', 'experienceLevel', 'salary', 'requirements', 'responsibilities',
    'benefits', 'skills', 'referralBonus', 'isFeatured', 'isUrgent',
    'applicationSettings', 'expiresAt', 'metaTitle', 'metaDescription',
  ];
  
  updateFields.forEach(field => {
    if (req.body[field] !== undefined) {
      job[field] = req.body[field];
    }
  });
  
  await job.save();
  
  // Log update
  await AuditLog.logUserAction({
    user: req.user,
    action: 'job_updated',
    entityType: 'job',
    entityId: job._id,
    entityName: job.title,
    description: 'Job updated',
    req,
    companyId: job.companyId,
    severity: 'info',
  });
  
  res.json({
    success: true,
    message: 'Job updated successfully',
    data: { job },
  });
}));

/**
 * @route   DELETE /api/jobs/:id
 * @desc    Delete job (soft delete by closing)
 * @access  Private (Company Job Manager)
 */
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const job = await Job.findById(id);
  
  if (!job) {
    throw new NotFoundError('Job');
  }
  
  // Check permissions
  const hasPermission = await checkJobPermission(req.user, job, PERMISSIONS.DELETE_JOBS);
  if (!hasPermission) {
    throw new AuthorizationError();
  }
  
  // Close job instead of hard delete
  job.status = 'closed';
  await job.save();
  
  // Decrement company job count
  const company = await Company.findById(job.companyId);
  await company.decrementJobCount();
  
  // Log deletion
  await AuditLog.logUserAction({
    user: req.user,
    action: 'job_closed',
    entityType: 'job',
    entityId: job._id,
    entityName: job.title,
    description: 'Job closed',
    req,
    companyId: job.companyId,
    severity: 'info',
  });
  
  res.json({
    success: true,
    message: 'Job closed successfully',
  });
}));

/**
 * @route   PUT /api/jobs/:id/status
 * @desc    Update job status
 * @access  Private (Company Job Manager)
 */
router.put('/:id/status', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;
  
  if (!['active', 'paused', 'closed', 'filled'].includes(status)) {
    throw new ValidationError('Invalid status');
  }
  
  const job = await Job.findById(id);
  
  if (!job) {
    throw new NotFoundError('Job');
  }
  
  // Check permissions
  const hasPermission = await checkJobPermission(req.user, job, PERMISSIONS.WRITE_JOBS);
  if (!hasPermission) {
    throw new AuthorizationError();
  }
  
  const oldStatus = job.status;
  job.status = status;
  job.statusChangedBy = req.user._id;
  job.statusChangeReason = reason;
  
  if (status === 'filled') {
    job.filledAt = new Date();
  }
  
  await job.save();
  
  // Update company job count if status changed to/from active
  if (oldStatus === 'active' && status !== 'active') {
    const company = await Company.findById(job.companyId);
    await company.decrementJobCount();
  } else if (oldStatus !== 'active' && status === 'active') {
    const company = await Company.findById(job.companyId);
    await company.incrementJobCount();
  }
  
  // Log status change
  await AuditLog.logUserAction({
    user: req.user,
    action: 'job_closed',
    entityType: 'job',
    entityId: job._id,
    entityName: job.title,
    description: `Job status changed from ${oldStatus} to ${status}`,
    req,
    companyId: job.companyId,
    severity: 'info',
  });
  
  res.json({
    success: true,
    message: 'Job status updated successfully',
    data: { job },
  });
}));

/**
 * @route   POST /api/jobs/:id/apply
 * @desc    Apply to a job
 * @access  Private (Job Seeker)
 */
router.post('/:id/apply', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { fullName, email, phone, resumeUrl, coverLetter, answers, portfolioUrl, linkedInUrl } = req.body;
  
  // Validate required fields
  if (!fullName || !email) {
    throw new ValidationError('Please provide full name and email');
  }
  
  const job = await Job.findById(id);
  
  if (!job) {
    throw new NotFoundError('Job');
  }
  
  // Check if job is accepting applications
  if (!job.isAcceptingApplications()) {
    throw new ValidationError('This job is no longer accepting applications');
  }
  
  // Check if user has already applied
  const hasApplied = await Application.hasApplied(req.user._id, id);
  if (hasApplied) {
    throw new ConflictError('You have already applied for this job');
  }
  
  // Create application
  const application = await Application.create({
    jobId: id,
    applicantId: req.user._id,
    companyId: job.companyId,
    fullName: fullName.trim(),
    email: email.toLowerCase().trim(),
    phone,
    resumeUrl,
    coverLetter,
    portfolioUrl,
    linkedInUrl,
    answers,
    source: {
      type: 'direct',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    },
  });
  
  // Increment job application count
  await job.incrementApplications();
  
  // Log application
  await AuditLog.logUserAction({
    user: req.user,
    action: 'application_submitted',
    entityType: 'application',
    entityId: application._id,
    description: `Applied for job: ${job.title}`,
    req,
    companyId: job.companyId,
    severity: 'info',
  });
  
  res.status(201).json({
    success: true,
    message: 'Application submitted successfully',
    data: { application },
  });
}));

/**
 * @route   GET /api/jobs/:id/referrals
 * @desc    Get job referrals (company only)
 * @access  Private (Company Member)
 */
router.get('/:id/referrals', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, page = 1, limit = 20 } = req.query;
  
  const job = await Job.findById(id);
  
  if (!job) {
    throw new NotFoundError('Job');
  }
  
  // Check permissions
  const hasPermission = await checkJobPermission(req.user, job, PERMISSIONS.READ_REFERRALS);
  if (!hasPermission) {
    throw new AuthorizationError();
  }
  
  const Referral = (await import('../models/Referral.js')).default;
  
  const options = {
    status,
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { submittedAt: -1 },
  };
  
  const referrals = await Referral.findByJob(id, options);
  
  res.json({
    success: true,
    data: {
      referrals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
      },
    },
  });
}));

/**
 * @route   GET /api/jobs/:id/applications
 * @desc    Get job applications (company only)
 * @access  Private (Company Member)
 */
router.get('/:id/applications', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, page = 1, limit = 20 } = req.query;
  
  const job = await Job.findById(id);
  
  if (!job) {
    throw new NotFoundError('Job');
  }
  
  // Check permissions
  const hasPermission = await checkJobPermission(req.user, job, PERMISSIONS.READ_REFERRALS);
  if (!hasPermission) {
    throw new AuthorizationError();
  }
  
  const options = {
    status,
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { submittedAt: -1 },
  };
  
  const applications = await Application.findByJob(id, options);
  
  res.json({
    success: true,
    data: {
      applications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
      },
    },
  });
}));

// ==================== HELPER FUNCTIONS ====================

/**
 * Check if user has permission for a specific job
 * @param {Object} user - Current user
 * @param {Object} job - Job document
 * @param {string} permission - Required permission
 * @returns {Promise<boolean>}
 */
async function checkJobPermission(user, job, permission) {
  // Platform admins have all permissions
  if (user.role === 'platform_admin') {
    return true;
  }
  
  // Check if user is a company member with the required permission
  const CompanyUser = (await import('../models/CompanyUser.js')).default;
  
  const companyUser = await CompanyUser.findRelationship(user._id, job.companyId);
  
  if (!companyUser || !companyUser.isActive || companyUser.invitationStatus !== 'accepted') {
    return false;
  }
  
  return companyUser.hasPermission(permission);
}

module.exports = router;
