const express = require('express');
const router = express.Router();
const Job = require('../../../models/Job');
const Company = require('../../../models/Company');
const { apiAuth, requirePermission } = require('../../../middleware/apiAuth');
const { apiLogger } = require('../../../middleware/apiLogger');

// Apply API auth and logging to all routes
router.use(apiAuth);
router.use(apiLogger);

/**
 * @route   GET /api/v1/jobs
 * @desc    List all jobs with filtering and pagination
 * @access  Public (with API key)
 */
router.get('/', requirePermission('jobs:read'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sort = '-createdAt',
      status = 'active',
      company,
      location,
      jobType,
      experienceLevel,
      salaryMin,
      salaryMax,
      skills,
      remote,
      featured,
      search
    } = req.query;

    // Build query
    const query = { status };

    // Company filter
    if (company) {
      query.company = company;
    }

    // Location filter
    if (location) {
      query.$or = [
        { location: { $regex: location, $options: 'i' } },
        { 'location.city': { $regex: location, $options: 'i' } },
        { 'location.country': { $regex: location, $options: 'i' } }
      ];
    }

    // Job type filter
    if (jobType) {
      query.jobType = jobType;
    }

    // Experience level filter
    if (experienceLevel) {
      query.experienceLevel = experienceLevel;
    }

    // Salary range filter
    if (salaryMin || salaryMax) {
      query.$and = query.$and || [];
      if (salaryMin) {
        query.$and.push({ 'salary.max': { $gte: parseInt(salaryMin) } });
      }
      if (salaryMax) {
        query.$and.push({ 'salary.min': { $lte: parseInt(salaryMax) } });
      }
    }

    // Skills filter
    if (skills) {
      const skillsArray = skills.split(',').map(s => s.trim());
      query.skills = { $in: skillsArray };
    }

    // Remote filter
    if (remote !== undefined) {
      query.isRemote = remote === 'true';
    }

    // Featured filter
    if (featured !== undefined) {
      query.isFeatured = featured === 'true';
    }

    // Search filter
    if (search) {
      query.$text = { $search: search };
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100); // Max 100 per page
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const jobs = await Job.find(query)
      .populate('company', 'name logo slug')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count
    const total = await Job.countDocuments(query);

    // Format response
    const formattedJobs = jobs.map(job => ({
      id: job._id,
      title: job.title,
      slug: job.slug,
      company: job.company,
      location: job.location,
      jobType: job.jobType,
      experienceLevel: job.experienceLevel,
      salary: job.salary,
      skills: job.skills,
      description: job.description?.substring(0, 500) + (job.description?.length > 500 ? '...' : ''),
      requirements: job.requirements,
      benefits: job.benefits,
      isRemote: job.isRemote,
      isFeatured: job.isFeatured,
      referralBonus: job.referralBonus,
      applicationUrl: job.applicationUrl,
      expiresAt: job.expiresAt,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    }));

    res.json({
      success: true,
      data: formattedJobs,
      meta: {
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
          hasMore: pageNum * limitNum < total
        }
      }
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to fetch jobs',
        type: 'api_error'
      }
    });
  }
});

/**
 * @route   GET /api/v1/jobs/:id
 * @desc    Get job details by ID or slug
 * @access  Public (with API key)
 */
router.get('/:id', requirePermission('jobs:read'), async (req, res) => {
  try {
    const { id } = req.params;

    // Try to find by ID first, then by slug
    let job = await Job.findById(id)
      .populate('company', 'name logo slug description website location')
      .lean();

    if (!job) {
      job = await Job.findOne({ slug: id })
        .populate('company', 'name logo slug description website location')
        .lean();
    }

    if (!job) {
      return res.status(404).json({
        error: {
          code: 'not_found',
          message: 'Job not found',
          type: 'not_found_error'
        }
      });
    }

    // Check if job is active
    if (job.status !== 'active' && !req.apiKey.hasPermission('jobs:write')) {
      return res.status(404).json({
        error: {
          code: 'not_found',
          message: 'Job not found or no longer active',
          type: 'not_found_error'
        }
      });
    }

    res.json({
      success: true,
      data: {
        id: job._id,
        title: job.title,
        slug: job.slug,
        company: job.company,
        location: job.location,
        jobType: job.jobType,
        experienceLevel: job.experienceLevel,
        employmentType: job.employmentType,
        salary: job.salary,
        currency: job.currency,
        skills: job.skills,
        description: job.description,
        requirements: job.requirements,
        responsibilities: job.responsibilities,
        benefits: job.benefits,
        isRemote: job.isRemote,
        isFeatured: job.isFeatured,
        referralBonus: job.referralBonus,
        referralBonusAmount: job.referralBonusAmount,
        applicationUrl: job.applicationUrl,
        applicationInstructions: job.applicationInstructions,
        department: job.department,
        expiresAt: job.expiresAt,
        publishedAt: job.publishedAt,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to fetch job details',
        type: 'api_error'
      }
    });
  }
});

/**
 * @route   POST /api/v1/jobs
 * @desc    Create a new job
 * @access  Private (requires jobs:write permission)
 */
router.post('/', requirePermission('jobs:write'), async (req, res) => {
  try {
    const jobData = req.body;

    // Validate required fields
    const requiredFields = ['title', 'company', 'description'];
    const missingFields = requiredFields.filter(field => !jobData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: {
          code: 'validation_error',
          message: `Missing required fields: ${missingFields.join(', ')}`,
          type: 'validation_error',
          details: missingFields.map(field => ({
            field,
            message: `${field} is required`
          }))
        }
      });
    }

    // Verify company exists and user has access
    const company = await Company.findById(jobData.company);
    if (!company) {
      return res.status(404).json({
        error: {
          code: 'not_found',
          message: 'Company not found',
          type: 'not_found_error'
        }
      });
    }

    // Check if user can post jobs for this company
    if (req.apiCompany && req.apiCompany._id.toString() !== jobData.company) {
      return res.status(403).json({
        error: {
          code: 'forbidden',
          message: 'You can only create jobs for your own company',
          type: 'authorization_error'
        }
      });
    }

    // Create job
    const job = new Job({
      ...jobData,
      status: jobData.status || 'active',
      createdBy: req.apiUser._id
    });

    await job.save();

    res.status(201).json({
      success: true,
      data: {
        id: job._id,
        title: job.title,
        slug: job.slug,
        company: job.company,
        status: job.status,
        createdAt: job.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating job:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: {
          code: 'validation_error',
          message: 'Validation failed',
          type: 'validation_error',
          details: Object.values(error.errors).map(e => ({
            field: e.path,
            message: e.message
          }))
        }
      });
    }

    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to create job',
        type: 'api_error'
      }
    });
  }
});

/**
 * @route   PUT /api/v1/jobs/:id
 * @desc    Update a job
 * @access  Private (requires jobs:write permission)
 */
router.put('/:id', requirePermission('jobs:write'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({
        error: {
          code: 'not_found',
          message: 'Job not found',
          type: 'not_found_error'
        }
      });
    }

    // Check ownership
    if (req.apiCompany && job.company.toString() !== req.apiCompany._id.toString()) {
      return res.status(403).json({
        error: {
          code: 'forbidden',
          message: 'You can only update jobs for your own company',
          type: 'authorization_error'
        }
      });
    }

    // Apply updates
    Object.keys(updates).forEach(key => {
      if (key !== '_id' && key !== 'createdBy') {
        job[key] = updates[key];
      }
    });

    job.updatedAt = new Date();
    await job.save();

    res.json({
      success: true,
      data: {
        id: job._id,
        title: job.title,
        slug: job.slug,
        status: job.status,
        updatedAt: job.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to update job',
        type: 'api_error'
      }
    });
  }
});

/**
 * @route   DELETE /api/v1/jobs/:id
 * @desc    Delete (close) a job
 * @access  Private (requires jobs:write permission)
 */
router.delete('/:id', requirePermission('jobs:write'), async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({
        error: {
          code: 'not_found',
          message: 'Job not found',
          type: 'not_found_error'
        }
      });
    }

    // Check ownership
    if (req.apiCompany && job.company.toString() !== req.apiCompany._id.toString()) {
      return res.status(403).json({
        error: {
          code: 'forbidden',
          message: 'You can only delete jobs for your own company',
          type: 'authorization_error'
        }
      });
    }

    // Soft delete by closing the job
    job.status = 'closed';
    job.closedAt = new Date();
    job.closedBy = req.apiUser._id;
    await job.save();

    res.json({
      success: true,
      data: {
        id: job._id,
        status: job.status,
        closedAt: job.closedAt
      }
    });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to delete job',
        type: 'api_error'
      }
    });
  }
});

/**
 * @route   GET /api/v1/jobs/:id/related
 * @desc    Get related jobs
 * @access  Public (with API key)
 */
router.get('/:id/related', requirePermission('jobs:read'), async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 5 } = req.query;

    const job = await Job.findById(id).lean();

    if (!job) {
      return res.status(404).json({
        error: {
          code: 'not_found',
          message: 'Job not found',
          type: 'not_found_error'
        }
      });
    }

    // Find related jobs based on skills and job type
    const relatedJobs = await Job.find({
      _id: { $ne: id },
      status: 'active',
      $or: [
        { skills: { $in: job.skills } },
        { jobType: job.jobType },
        { company: job.company }
      ]
    })
      .populate('company', 'name logo slug')
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: relatedJobs.map(j => ({
        id: j._id,
        title: j.title,
        slug: j.slug,
        company: j.company,
        location: j.location,
        jobType: j.jobType,
        referralBonus: j.referralBonus
      }))
    });
  } catch (error) {
    console.error('Error fetching related jobs:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to fetch related jobs',
        type: 'api_error'
      }
    });
  }
});

module.exports = router;
