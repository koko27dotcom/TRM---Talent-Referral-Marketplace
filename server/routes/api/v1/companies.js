const express = require('express');
const router = express.Router();
const Company = require('../../../models/Company');
const Job = require('../../../models/Job');
const { apiAuth, requirePermission } = require('../../../middleware/apiAuth');
const { apiLogger } = require('../../../middleware/apiLogger');

// Apply API auth and logging
router.use(apiAuth);
router.use(apiLogger);

/**
 * @route   GET /api/v1/companies
 * @desc    List all companies with filtering
 * @access  Public (with API key)
 */
router.get('/', requirePermission('companies:read'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sort = '-createdAt',
      status = 'active',
      industry,
      size,
      location,
      verified,
      featured,
      search
    } = req.query;

    // Build query
    const query = { status };

    // Industry filter
    if (industry) {
      query.industry = industry;
    }

    // Company size filter
    if (size) {
      query.size = size;
    }

    // Location filter
    if (location) {
      query.$or = [
        { 'location.city': { $regex: location, $options: 'i' } },
        { 'location.country': { $regex: location, $options: 'i' } }
      ];
    }

    // Verified filter
    if (verified !== undefined) {
      query.isVerified = verified === 'true';
    }

    // Featured filter
    if (featured !== undefined) {
      query.isFeatured = featured === 'true';
    }

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const companies = await Company.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Company.countDocuments(query);

    // Format response
    const formattedCompanies = companies.map(company => ({
      id: company._id,
      name: company.name,
      slug: company.slug,
      description: company.description?.substring(0, 300) + (company.description?.length > 300 ? '...' : ''),
      logo: company.logo,
      website: company.website,
      industry: company.industry,
      size: company.size,
      location: company.location,
      isVerified: company.isVerified,
      isFeatured: company.isFeatured,
      socialLinks: company.socialLinks,
      createdAt: company.createdAt
    }));

    res.json({
      success: true,
      data: formattedCompanies,
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
    console.error('Error fetching companies:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to fetch companies',
        type: 'api_error'
      }
    });
  }
});

/**
 * @route   GET /api/v1/companies/:id
 * @desc    Get company details by ID or slug
 * @access  Public (with API key)
 */
router.get('/:id', requirePermission('companies:read'), async (req, res) => {
  try {
    const { id } = req.params;

    // Try to find by ID first, then by slug
    let company = await Company.findById(id).lean();

    if (!company) {
      company = await Company.findOne({ slug: id }).lean();
    }

    if (!company) {
      return res.status(404).json({
        error: {
          code: 'not_found',
          message: 'Company not found',
          type: 'not_found_error'
        }
      });
    }

    // Get job count
    const jobCount = await Job.countDocuments({
      company: company._id,
      status: 'active'
    });

    res.json({
      success: true,
      data: {
        id: company._id,
        name: company.name,
        slug: company.slug,
        description: company.description,
        logo: company.logo,
        coverImage: company.coverImage,
        website: company.website,
        industry: company.industry,
        size: company.size,
        founded: company.founded,
        location: company.location,
        address: company.address,
        isVerified: company.isVerified,
        isFeatured: company.isFeatured,
        socialLinks: company.socialLinks,
        culture: company.culture,
        benefits: company.benefits,
        techStack: company.techStack,
        stats: {
          activeJobs: jobCount
        },
        createdAt: company.createdAt,
        updatedAt: company.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to fetch company details',
        type: 'api_error'
      }
    });
  }
});

/**
 * @route   GET /api/v1/companies/:id/jobs
 * @desc    Get jobs for a specific company
 * @access  Public (with API key)
 */
router.get('/:id/jobs', requirePermission('jobs:read'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      page = 1,
      limit = 20,
      status = 'active'
    } = req.query;

    // Find company
    let company = await Company.findById(id);
    if (!company) {
      company = await Company.findOne({ slug: id });
    }

    if (!company) {
      return res.status(404).json({
        error: {
          code: 'not_found',
          message: 'Company not found',
          type: 'not_found_error'
        }
      });
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    // Get jobs
    const jobs = await Job.find({
      company: company._id,
      status
    })
      .sort('-createdAt')
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Job.countDocuments({
      company: company._id,
      status
    });

    res.json({
      success: true,
      data: jobs.map(job => ({
        id: job._id,
        title: job.title,
        slug: job.slug,
        location: job.location,
        jobType: job.jobType,
        experienceLevel: job.experienceLevel,
        salary: job.salary,
        skills: job.skills,
        description: job.description?.substring(0, 300) + (job.description?.length > 300 ? '...' : ''),
        isRemote: job.isRemote,
        isFeatured: job.isFeatured,
        referralBonus: job.referralBonus,
        referralBonusAmount: job.referralBonusAmount,
        expiresAt: job.expiresAt,
        createdAt: job.createdAt
      })),
      meta: {
        company: {
          id: company._id,
          name: company.name,
          slug: company.slug
        },
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
    console.error('Error fetching company jobs:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to fetch company jobs',
        type: 'api_error'
      }
    });
  }
});

/**
 * @route   POST /api/v1/companies
 * @desc    Create a new company
 * @access  Private (requires companies:write permission)
 */
router.post('/', requirePermission('companies:write'), async (req, res) => {
  try {
    const companyData = req.body;

    // Validate required fields
    if (!companyData.name) {
      return res.status(400).json({
        error: {
          code: 'validation_error',
          message: 'Company name is required',
          type: 'validation_error'
        }
      });
    }

    // Check for duplicate
    const existing = await Company.findOne({
      name: { $regex: new RegExp(`^${companyData.name}$`, 'i') }
    });

    if (existing) {
      return res.status(409).json({
        error: {
          code: 'duplicate_company',
          message: 'A company with this name already exists',
          type: 'conflict_error'
        }
      });
    }

    // Create company
    const company = new Company({
      ...companyData,
      status: 'active',
      createdBy: req.apiUser?._id
    });

    await company.save();

    res.status(201).json({
      success: true,
      data: {
        id: company._id,
        name: company.name,
        slug: company.slug,
        status: company.status,
        createdAt: company.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating company:', error);
    
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
        message: 'Failed to create company',
        type: 'api_error'
      }
    });
  }
});

/**
 * @route   PUT /api/v1/companies/:id
 * @desc    Update a company
 * @access  Private (requires companies:write permission)
 */
router.put('/:id', requirePermission('companies:write'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const company = await Company.findById(id);

    if (!company) {
      return res.status(404).json({
        error: {
          code: 'not_found',
          message: 'Company not found',
          type: 'not_found_error'
        }
      });
    }

    // Check ownership
    if (req.apiCompany && company._id.toString() !== req.apiCompany._id.toString()) {
      return res.status(403).json({
        error: {
          code: 'forbidden',
          message: 'You can only update your own company',
          type: 'authorization_error'
        }
      });
    }

    // Apply updates
    Object.keys(updates).forEach(key => {
      if (key !== '_id' && key !== 'createdBy') {
        company[key] = updates[key];
      }
    });

    company.updatedAt = new Date();
    await company.save();

    res.json({
      success: true,
      data: {
        id: company._id,
        name: company.name,
        slug: company.slug,
        updatedAt: company.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating company:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to update company',
        type: 'api_error'
      }
    });
  }
});

/**
 * @route   GET /api/v1/companies/industries
 * @desc    Get list of industries
 * @access  Public (with API key)
 */
router.get('/meta/industries', requirePermission('companies:read'), async (req, res) => {
  try {
    const industries = await Company.distinct('industry', { status: 'active' });

    res.json({
      success: true,
      data: industries.filter(i => i).sort()
    });
  } catch (error) {
    console.error('Error fetching industries:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to fetch industries',
        type: 'api_error'
      }
    });
  }
});

module.exports = router;
