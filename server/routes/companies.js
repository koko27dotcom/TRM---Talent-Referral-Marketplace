/**
 * Company Routes
 * Handles company CRUD, team management, and company-specific operations
 */

const express = require('express');
const { Company, CompanyUser, User, Job, SubscriptionPlan, AuditLog } = require('../models/index.js');
const { authenticate } = require('../middleware/auth.js');
const { asyncHandler, ValidationError, NotFoundError, AuthorizationError, ConflictError } = require('../middleware/errorHandler.js');
const { requireAdmin, requireCorporateAdmin, requireCompanyAccess, requireCompanyAdmin } = require('../middleware/rbac.js');
const { PERMISSIONS } = require('../models/CompanyUser.js');

const router = express.Router();

/**
 * @route   GET /api/companies
 * @desc    Get all companies (with filters)
 * @access  Public (with optional auth for additional data)
 */
router.get('/', asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    industry, 
    verified,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;
  
  // Build query
  const query = { status: 'active' };
  
  if (industry) query.industry = industry;
  if (verified === 'true') query.verificationStatus = 'verified';
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }
  
  // Build sort
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
  
  // Execute query with pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const [companies, total] = await Promise.all([
    Company.find(query)
      .select('-settings -stats -currentSubscription')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Company.countDocuments(query),
  ]);
  
  res.json({
    success: true,
    data: {
      companies,
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
 * @route   POST /api/companies
 * @desc    Create a new company (admin only)
 * @access  Private (Admin)
 */
router.post('/', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { name, email, description, industry, companySize, website, address } = req.body;
  
  if (!name || !email) {
    throw new ValidationError('Please provide company name and email');
  }
  
  // Check if company with same email exists
  const existingCompany = await Company.findOne({ email: email.toLowerCase() });
  if (existingCompany) {
    throw new ConflictError('A company with this email already exists');
  }
  
  const company = await Company.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    description,
    industry,
    companySize,
    website,
    address,
    verificationStatus: 'verified', // Admin-created companies are auto-verified
    verifiedAt: new Date(),
    verifiedBy: req.user._id,
    createdBy: req.user._id,
  });
  
  // Log creation
  await AuditLog.logUserAction({
    user: req.user,
    action: 'company_created',
    entityType: 'company',
    entityId: company._id,
    entityName: company.name,
    description: 'Company created by admin',
    req,
    severity: 'info',
  });
  
  res.status(201).json({
    success: true,
    message: 'Company created successfully',
    data: { company },
  });
}));

/**
 * @route   GET /api/companies/:id
 * @desc    Get company by ID
 * @access  Public
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const company = await Company.findById(id);
  
  if (!company || company.status !== 'active') {
    throw new NotFoundError('Company');
  }
  
  res.json({
    success: true,
    data: { company },
  });
}));

/**
 * @route   PUT /api/companies/:id
 * @desc    Update company
 * @access  Private (Company Admin or Platform Admin)
 */
router.put('/:id', authenticate, requireCompanyAccess([PERMISSIONS.WRITE_COMPANY]), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { 
    name, 
    description, 
    industry, 
    companySize, 
    website, 
    phone, 
    address,
    logo,
    branding,
    settings,
  } = req.body;
  
  const company = await Company.findById(id);
  
  if (!company) {
    throw new NotFoundError('Company');
  }
  
  // Update fields
  if (name) company.name = name.trim();
  if (description !== undefined) company.description = description;
  if (industry) company.industry = industry;
  if (companySize) company.companySize = companySize;
  if (website !== undefined) company.website = website;
  if (phone !== undefined) company.phone = phone;
  if (address) company.address = { ...company.address, ...address };
  if (logo) company.logo = logo;
  if (branding) company.branding = { ...company.branding, ...branding };
  if (settings) company.settings = { ...company.settings, ...settings };
  
  await company.save();
  
  // Log update
  await AuditLog.logUserAction({
    user: req.user,
    action: 'company_updated',
    entityType: 'company',
    entityId: company._id,
    entityName: company.name,
    description: 'Company profile updated',
    req,
    companyId: company._id,
    severity: 'info',
  });
  
  res.json({
    success: true,
    message: 'Company updated successfully',
    data: { company },
  });
}));

/**
 * @route   DELETE /api/companies/:id
 * @desc    Delete company (soft delete)
 * @access  Private (Platform Admin)
 */
router.delete('/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const company = await Company.findById(id);
  
  if (!company) {
    throw new NotFoundError('Company');
  }
  
  // Soft delete
  company.status = 'deleted';
  await company.save();
  
  // Log deletion
  await AuditLog.logUserAction({
    user: req.user,
    action: 'company_deleted',
    entityType: 'company',
    entityId: company._id,
    entityName: company.name,
    description: 'Company deleted',
    req,
    severity: 'warning',
  });
  
  res.json({
    success: true,
    message: 'Company deleted successfully',
  });
}));

/**
 * @route   PUT /api/companies/:id/verify
 * @desc    Verify company (admin only)
 * @access  Private (Admin)
 */
router.put('/:id/verify', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  
  if (!['verified', 'rejected'].includes(status)) {
    throw new ValidationError('Status must be "verified" or "rejected"');
  }
  
  const company = await Company.findById(id);
  
  if (!company) {
    throw new NotFoundError('Company');
  }
  
  company.verificationStatus = status;
  company.verifiedAt = new Date();
  company.verifiedBy = req.user._id;
  company.verificationNotes = notes;
  
  await company.save();
  
  // Log verification
  await AuditLog.logUserAction({
    user: req.user,
    action: status === 'verified' ? 'company_verified' : 'company_rejected',
    entityType: 'company',
    entityId: company._id,
    entityName: company.name,
    description: `Company ${status}. Notes: ${notes || 'None'}`,
    req,
    severity: 'info',
  });
  
  res.json({
    success: true,
    message: `Company ${status} successfully`,
    data: { company },
  });
}));

/**
 * @route   GET /api/companies/:id/jobs
 * @desc    Get company's jobs
 * @access  Public
 */
router.get('/:id/jobs', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status = 'active', page = 1, limit = 20 } = req.query;
  
  const company = await Company.findById(id);
  
  if (!company || company.status !== 'active') {
    throw new NotFoundError('Company');
  }
  
  const options = {
    status,
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { publishedAt: -1 },
  };
  
  const jobs = await Job.findByCompany(id, options);
  
  res.json({
    success: true,
    data: {
      jobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
      },
    },
  });
}));

/**
 * @route   GET /api/companies/:id/team
 * @desc    Get company team members
 * @access  Private (Company Member)
 */
router.get('/:id/team', authenticate, requireCompanyAccess([PERMISSIONS.READ_COMPANY]), asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const members = await CompanyUser.findCompanyMembers(id, {
    invitationStatus: 'accepted',
  });
  
  res.json({
    success: true,
    data: { members },
  });
}));

/**
 * @route   POST /api/companies/:id/team
 * @desc    Invite team member
 * @access  Private (Company Admin)
 */
router.post('/:id/team', authenticate, requireCompanyAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { email, name, role, department, title } = req.body;
  
  if (!email || !name || !role) {
    throw new ValidationError('Please provide email, name, and role');
  }
  
  if (!['admin', 'recruiter', 'viewer'].includes(role)) {
    throw new ValidationError('Role must be admin, recruiter, or viewer');
  }
  
  // Check if user already exists
  let user = await User.findByEmail(email);
  
  if (user) {
    // Check if already a member
    const existingMember = await CompanyUser.findRelationship(user._id, id);
    if (existingMember) {
      throw new ConflictError('User is already a member of this company');
    }
  } else {
    // Create new user with corporate role
    const corporateRole = role === 'admin' ? 'corporate_admin' : 
                          role === 'recruiter' ? 'corporate_recruiter' : 'corporate_viewer';
    
    user = await User.create({
      email: email.toLowerCase().trim(),
      name: name.trim(),
      role: corporateRole,
      password: Math.random().toString(36).slice(-12), // Temporary password
      status: 'active',
    });
  }
  
  // Create company user relationship
  const companyUser = await CompanyUser.create({
    userId: user._id,
    companyId: id,
    role,
    department,
    title,
    invitedBy: req.user._id,
    invitedAt: new Date(),
    invitationStatus: 'pending',
  });
  
  // Log invitation
  await AuditLog.logUserAction({
    user: req.user,
    action: 'member_invited',
    entityType: 'company_user',
    entityId: companyUser._id,
    description: `Invited ${email} as ${role}`,
    req,
    companyId: id,
    severity: 'info',
  });
  
  res.status(201).json({
    success: true,
    message: 'Team member invited successfully',
    data: { member: companyUser },
  });
}));

/**
 * @route   DELETE /api/companies/:id/team/:userId
 * @desc    Remove team member
 * @access  Private (Company Admin)
 */
router.delete('/:id/team/:userId', authenticate, requireCompanyAdmin, asyncHandler(async (req, res) => {
  const { id, userId } = req.params;
  
  const companyUser = await CompanyUser.findRelationship(userId, id);
  
  if (!companyUser) {
    throw new NotFoundError('Team member');
  }
  
  // Cannot remove yourself
  if (userId === req.user._id.toString()) {
    throw new ValidationError('Cannot remove yourself. Transfer ownership first.');
  }
  
  await companyUser.deactivate(req.user._id);
  
  // Log removal
  await AuditLog.logUserAction({
    user: req.user,
    action: 'member_removed',
    entityType: 'company_user',
    entityId: companyUser._id,
    description: `Removed team member`,
    req,
    companyId: id,
    severity: 'warning',
  });
  
  res.json({
    success: true,
    message: 'Team member removed successfully',
  });
}));

/**
 * @route   GET /api/companies/:id/billing
 * @desc    Get company billing info
 * @access  Private (Company Admin)
 */
router.get('/:id/billing', authenticate, requireCompanyAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const company = await Company.findById(id).select('currentSubscription jobPostingLimit activeJobCount stats');
  
  if (!company) {
    throw new NotFoundError('Company');
  }
  
  // Get subscription plan details
  let plan = null;
  if (company.currentSubscription?.planId) {
    plan = await SubscriptionPlan.findById(company.currentSubscription.planId);
  }
  
  res.json({
    success: true,
    data: {
      subscription: company.currentSubscription,
      plan,
      limits: {
        jobPostingLimit: company.jobPostingLimit,
        activeJobCount: company.activeJobCount,
        remainingSlots: Math.max(0, company.jobPostingLimit - company.activeJobCount),
      },
      stats: company.stats,
    },
  });
}));

/**
 * @route   GET /api/companies/:id/analytics
 * @desc    Get company analytics
 * @access  Private (Company Member)
 */
router.get('/:id/analytics', authenticate, requireCompanyAccess([PERMISSIONS.READ_ANALYTICS]), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate } = req.query;
  
  const company = await Company.findById(id);
  
  if (!company) {
    throw new NotFoundError('Company');
  }
  
  // Get job stats
  const Job = (await import('../models/Job.js')).default;
  const Referral = (await import('../models/Referral.js')).default;
  
  const jobStats = await Job.getStats({ companyId: id });
  const referralStats = await Referral.getCompanyStats(id);
  
  // TODO: Add more detailed analytics with date filtering
  
  res.json({
    success: true,
    data: {
      overview: {
        totalJobs: jobStats.totalJobs,
        activeJobs: jobStats.activeJobs,
        totalReferrals: referralStats.totalReferrals,
        totalHires: referralStats.hired,
        totalSpent: referralStats.totalSpent,
      },
      jobStats,
      referralStats,
    },
  });
}));

module.exports = router;
