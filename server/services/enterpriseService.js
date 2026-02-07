/**
 * Enterprise Service
 * Handles all B2B enterprise functionality including:
 * - Dashboard data aggregation
 * - Bulk job posting
 * - API key management
 * - Webhook handling
 * - Team management
 * - Custom branding
 * - SSO/SAML integration
 */

const { Company, EnterprisePlan, CompanyUser, Job, User, Application, Referral, BillingRecord } = require('../models/index.js');
const crypto = require('crypto');

// ==================== DASHBOARD DATA ====================

/**
 * Get enterprise dashboard data
 * @param {string} companyId - Company ID
 * @returns {Promise<Object>}
 */
const getEnterpriseDashboard = async (companyId) => {
  const company = await Company.findById(companyId)
    .populate('enterprisePlan', 'name tier pricing features')
    .populate('accountManager', 'name email phone avatar')
    .populate({
      path: 'teamMembers',
      populate: {
        path: 'userId',
        select: 'name email avatar',
      },
    });

  if (!company) {
    throw new Error('Company not found');
  }

  // Get job statistics
  const jobStats = await Job.aggregate([
    { $match: { companyId: company._id } },
    {
      $group: {
        _id: null,
        totalJobs: { $sum: 1 },
        activeJobs: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        totalViews: { $sum: '$views' },
        totalApplications: { $sum: '$applicationCount' },
      },
    },
  ]);

  // Get referral statistics
  const referralStats = await Referral.aggregate([
    { $match: { companyId: company._id } },
    {
      $group: {
        _id: null,
        totalReferrals: { $sum: 1 },
        hired: { $sum: { $cond: [{ $eq: ['$status', 'hired'] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $in: ['$status', ['new', 'screening', 'interview']] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
        totalSpent: { $sum: { $cond: [{ $eq: ['$status', 'hired'] }, '$bonusAmount', 0] } },
      },
    },
  ]);

  // Get recent billing
  const recentBilling = await BillingRecord.find({ companyId: company._id })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('invoiceNumber total status createdAt');

  // Get API usage stats
  const apiUsage = company.apiAccess?.apiKeys?.reduce((acc, key) => {
    acc.totalCalls += key.usageCount || 0;
    acc.activeKeys += key.isActive ? 1 : 0;
    return acc;
  }, { totalCalls: 0, activeKeys: 0 }) || { totalCalls: 0, activeKeys: 0 };

  return {
    company: {
      id: company._id,
      name: company.name,
      logo: company.logo,
      enterpriseStatus: company.enterpriseStatus,
      enterpriseTrial: company.enterpriseTrial,
    },
    plan: company.enterprisePlan,
    accountManager: company.accountManager,
    stats: {
      jobs: jobStats[0] || { totalJobs: 0, activeJobs: 0, totalViews: 0, totalApplications: 0 },
      referrals: referralStats[0] || { totalReferrals: 0, hired: 0, pending: 0, rejected: 0, totalSpent: 0 },
      api: apiUsage,
    },
    features: company.enterpriseFeatures,
    apiAccess: company.apiAccess,
    customBranding: company.customBranding,
    ssoConfig: company.ssoConfig,
    teamSize: company.teamMembers?.length || 0,
    recentBilling,
  };
};

// ==================== BULK JOB POSTING ====================

/**
 * Parse CSV data for bulk job posting
 * @param {string} csvData - CSV content
 * @returns {Array<Object>}
 */
const parseCSV = (csvData) => {
  const lines = csvData.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || '';
    });
    return obj;
  });
};

/**
 * Validate job data
 * @param {Object} jobData - Job data to validate
 * @returns {Object}
 */
const validateJobData = (jobData) => {
  const errors = [];
  
  if (!jobData.title || jobData.title.length < 3) {
    errors.push('Job title is required (min 3 characters)');
  }
  
  if (!jobData.description || jobData.description.length < 50) {
    errors.push('Job description is required (min 50 characters)');
  }
  
  if (!jobData.location) {
    errors.push('Location is required');
  }
  
  if (!jobData.employmentType || !['full-time', 'part-time', 'contract', 'internship'].includes(jobData.employmentType)) {
    errors.push('Valid employment type is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Bulk post jobs from CSV or JSON
 * @param {string} companyId - Company ID
 * @param {Array<Object>|string} jobsData - Jobs data (array or CSV string)
 * @param {string} format - 'csv' or 'json'
 * @param {Object} options - Processing options
 * @returns {Promise<Object>}
 */
const bulkPostJobs = async (companyId, jobsData, format = 'json', options = {}) => {
  const company = await Company.findById(companyId);
  
  if (!company) {
    throw new Error('Company not found');
  }
  
  // Check if company has bulk posting feature
  if (!company.hasEnterpriseFeature('bulk_posting')) {
    throw new Error('Bulk posting feature not available for your plan');
  }
  
  // Parse data if CSV
  let jobs = jobsData;
  if (format === 'csv') {
    jobs = parseCSV(jobsData);
  }
  
  const results = {
    total: jobs.length,
    successful: 0,
    failed: 0,
    errors: [],
    jobs: [],
  };
  
  // Process each job
  for (let i = 0; i < jobs.length; i++) {
    const jobData = jobs[i];
    
    try {
      // Validate job data
      const validation = validateJobData(jobData);
      if (!validation.isValid) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          job: jobData.title || `Job ${i + 1}`,
          errors: validation.errors,
        });
        continue;
      }
      
      // Create job
      const job = new Job({
        companyId: company._id,
        title: jobData.title,
        description: jobData.description,
        requirements: jobData.requirements?.split('\n') || [],
        responsibilities: jobData.responsibilities?.split('\n') || [],
        location: jobData.location,
        employmentType: jobData.employmentType,
        salary: {
          min: parseInt(jobData.salaryMin) || 0,
          max: parseInt(jobData.salaryMax) || 0,
          currency: jobData.salaryCurrency || 'MMK',
          period: jobData.salaryPeriod || 'monthly',
        },
        department: jobData.department,
        experienceLevel: jobData.experienceLevel || 'mid',
        skills: jobData.skills?.split(',').map(s => s.trim()) || [],
        benefits: jobData.benefits?.split('\n') || [],
        referralBonus: parseInt(jobData.referralBonus) || company.settings?.defaultReferralBonus || 100000,
        status: options.publishImmediately ? 'active' : 'draft',
        postedBy: options.postedBy,
      });
      
      await job.save();
      
      // Update company stats
      await company.incrementJobCount();
      
      results.successful++;
      results.jobs.push({
        id: job._id,
        title: job.title,
        status: job.status,
      });
    } catch (error) {
      results.failed++;
      results.errors.push({
        row: i + 1,
        job: jobData.title || `Job ${i + 1}`,
        errors: [error.message],
      });
    }
  }
  
  // Update bulk jobs posted stat
  company.stats.bulkJobsPosted += results.successful;
  await company.save();
  
  return results;
};

// ==================== API KEY MANAGEMENT ====================

/**
 * Generate new API key
 * @param {string} companyId - Company ID
 * @param {Object} keyData - Key configuration
 * @returns {Promise<Object>}
 */
const generateApiKey = async (companyId, keyData) => {
  const company = await Company.findById(companyId);
  
  if (!company) {
    throw new Error('Company not found');
  }
  
  if (!company.hasEnterpriseFeature('api_access')) {
    throw new Error('API access not available for your plan');
  }
  
  // Check API key limit
  const activeKeys = company.apiAccess?.apiKeys?.filter(k => k.isActive)?.length || 0;
  const maxKeys = company.enterprisePlan?.features?.apiRateLimit > 5000 ? 10 : 5;
  
  if (activeKeys >= maxKeys) {
    throw new Error(`Maximum ${maxKeys} API keys allowed. Please revoke unused keys.`);
  }
  
  const apiKey = await company.generateApiKey({
    name: keyData.name,
    permissions: keyData.permissions || ['read:jobs'],
    rateLimit: keyData.rateLimit || 1000,
    createdBy: keyData.createdBy,
    expiresAt: keyData.expiresAt,
  });
  
  return apiKey;
};

/**
 * Get API keys for company
 * @param {string} companyId - Company ID
 * @returns {Promise<Array>}
 */
const getApiKeys = async (companyId) => {
  const company = await Company.findById(companyId).select('apiAccess.apiKeys');
  
  if (!company || !company.apiAccess?.apiKeys) {
    return [];
  }
  
  return company.apiAccess.apiKeys.map(key => ({
    id: key._id,
    name: key.name,
    prefix: key.prefix,
    permissions: key.permissions,
    rateLimit: key.rateLimit,
    usageCount: key.usageCount,
    lastUsedAt: key.lastUsedAt,
    createdAt: key.createdAt,
    expiresAt: key.expiresAt,
    isActive: key.isActive,
    createdBy: key.createdBy,
  }));
};

/**
 * Revoke API key
 * @param {string} companyId - Company ID
 * @param {string} keyId - Key ID
 * @returns {Promise<boolean>}
 */
const revokeApiKey = async (companyId, keyId) => {
  const company = await Company.findById(companyId);
  
  if (!company) {
    throw new Error('Company not found');
  }
  
  return await company.revokeApiKey(keyId);
};

// ==================== WEBHOOK MANAGEMENT ====================

/**
 * Get webhook configuration
 * @param {string} companyId - Company ID
 * @returns {Promise<Object>}
 */
const getWebhookConfig = async (companyId) => {
  const company = await Company.findById(companyId).select('apiAccess');
  
  if (!company) {
    throw new Error('Company not found');
  }
  
  return {
    enabled: company.apiAccess?.webhookEnabled || false,
    url: company.apiAccess?.webhookUrl || '',
    secret: company.apiAccess?.webhookSecret ? '••••••••' : '',
    events: company.apiAccess?.webhookEvents || [],
    lastSuccess: company.apiAccess?.webhookLastSuccess,
    lastError: company.apiAccess?.webhookLastError,
  };
};

/**
 * Update webhook configuration
 * @param {string} companyId - Company ID
 * @param {Object} config - Webhook configuration
 * @returns {Promise<Object>}
 */
const updateWebhookConfig = async (companyId, config) => {
  const company = await Company.findById(companyId);
  
  if (!company) {
    throw new Error('Company not found');
  }
  
  if (!company.hasEnterpriseFeature('webhooks')) {
    throw new Error('Webhook feature not available for your plan');
  }
  
  // Generate webhook secret if not provided
  if (!config.webhookSecret && config.enabled) {
    config.webhookSecret = crypto.randomBytes(32).toString('hex');
  }
  
  await company.updateWebhookConfig({
    webhookUrl: config.webhookUrl,
    webhookSecret: config.webhookSecret,
    webhookEvents: config.webhookEvents,
    enabled: config.enabled,
  });
  
  return {
    enabled: config.enabled,
    url: config.webhookUrl,
    secret: config.webhookSecret ? `${config.webhookSecret.substring(0, 8)}...` : null,
    events: config.webhookEvents,
  };
};

/**
 * Send webhook event
 * @param {string} companyId - Company ID
 * @param {string} event - Event type
 * @param {Object} payload - Event payload
 * @returns {Promise<Object>}
 */
const sendWebhook = async (companyId, event, payload) => {
  const company = await Company.findById(companyId).select('apiAccess name');
  
  if (!company || !company.apiAccess?.webhookEnabled || !company.apiAccess?.webhookUrl) {
    return { sent: false, reason: 'Webhook not configured' };
  }
  
  // Check if event is subscribed
  if (!company.apiAccess.webhookEvents.includes(event)) {
    return { sent: false, reason: 'Event not subscribed' };
  }
  
  const timestamp = Date.now();
  const signature = crypto
    .createHmac('sha256', company.apiAccess.webhookSecret)
    .update(`${timestamp}.${JSON.stringify(payload)}`)
    .digest('hex');
  
  const webhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    company: {
      id: company._id,
      name: company.name,
    },
    data: payload,
  };
  
  try {
    const response = await fetch(company.apiAccess.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': timestamp.toString(),
        'X-Webhook-Event': event,
        'User-Agent': 'TRM-Enterprise-Webhook/1.0',
      },
      body: JSON.stringify(webhookPayload),
      timeout: 30000,
    });
    
    if (response.ok) {
      company.apiAccess.webhookLastSuccess = new Date();
      await company.save();
      
      return {
        sent: true,
        status: response.status,
        timestamp: new Date(),
      };
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    company.apiAccess.webhookLastError = error.message;
    await company.save();
    
    return {
      sent: false,
      error: error.message,
      timestamp: new Date(),
    };
  }
};

// ==================== TEAM MANAGEMENT ====================

/**
 * Get team members
 * @param {string} companyId - Company ID
 * @returns {Promise<Array>}
 */
const getTeamMembers = async (companyId) => {
  const companyUsers = await CompanyUser.find({ companyId })
    .populate('userId', 'name email avatar phone')
    .sort({ createdAt: -1 });
  
  return companyUsers.map(cu => ({
    id: cu._id,
    userId: cu.userId?._id,
    name: cu.userId?.name,
    email: cu.userId?.email,
    avatar: cu.userId?.avatar,
    phone: cu.userId?.phone,
    role: cu.role,
    permissions: cu.permissions,
    department: cu.department,
    isActive: cu.isActive,
    joinedAt: cu.joinedAt,
    lastActiveAt: cu.lastActiveAt,
  }));
};

/**
 * Add team member
 * @param {string} companyId - Company ID
 * @param {Object} memberData - Member data
 * @returns {Promise<Object>}
 */
const addTeamMember = async (companyId, memberData) => {
  const company = await Company.findById(companyId);
  
  if (!company) {
    throw new Error('Company not found');
  }
  
  // Check team size limit
  const currentTeamSize = await CompanyUser.countDocuments({ companyId, isActive: true });
  const maxUsers = company.enterprisePlan?.userLimits?.maxUsers || 10;
  
  if (maxUsers !== -1 && currentTeamSize >= maxUsers) {
    throw new Error(`Team size limit (${maxUsers}) reached. Upgrade your plan.`);
  }
  
  // Check if user exists
  let user = await User.findOne({ email: memberData.email });
  
  if (!user) {
    // Create new user
    user = new User({
      name: memberData.name,
      email: memberData.email,
      role: 'employer',
      status: 'pending',
    });
    await user.save();
  }
  
  // Check if already a team member
  const existingMember = await CompanyUser.findOne({
    companyId,
    userId: user._id,
  });
  
  if (existingMember) {
    throw new Error('User is already a team member');
  }
  
  // Create company user relationship
  const companyUser = new CompanyUser({
    companyId,
    userId: user._id,
    role: memberData.role || 'recruiter',
    permissions: memberData.permissions || [],
    department: memberData.department,
    joinedAt: new Date(),
    isActive: true,
  });
  
  await companyUser.save();
  
  // Add to company's team members
  await company.addTeamMember(companyUser._id);
  
  return {
    id: companyUser._id,
    userId: user._id,
    name: user.name,
    email: user.email,
    role: companyUser.role,
    permissions: companyUser.permissions,
    department: companyUser.department,
    isActive: companyUser.isActive,
    joinedAt: companyUser.joinedAt,
  };
};

/**
 * Remove team member
 * @param {string} companyId - Company ID
 * @param {string} memberId - CompanyUser ID
 * @returns {Promise<boolean>}
 */
const removeTeamMember = async (companyId, memberId) => {
  const companyUser = await CompanyUser.findOne({
    _id: memberId,
    companyId,
  });
  
  if (!companyUser) {
    throw new Error('Team member not found');
  }
  
  // Prevent removing the last admin
  if (companyUser.role === 'admin') {
    const adminCount = await CompanyUser.countDocuments({
      companyId,
      role: 'admin',
      isActive: true,
    });
    
    if (adminCount <= 1) {
      throw new Error('Cannot remove the last admin');
    }
  }
  
  companyUser.isActive = false;
  companyUser.leftAt = new Date();
  await companyUser.save();
  
  // Remove from company's team members
  const company = await Company.findById(companyId);
  await company.removeTeamMember(memberId);
  
  return true;
};

/**
 * Update team member role
 * @param {string} companyId - Company ID
 * @param {string} memberId - CompanyUser ID
 * @param {Object} updateData - Update data
 * @returns {Promise<Object>}
 */
const updateTeamMember = async (companyId, memberId, updateData) => {
  const companyUser = await CompanyUser.findOne({
    _id: memberId,
    companyId,
  }).populate('userId', 'name email');
  
  if (!companyUser) {
    throw new Error('Team member not found');
  }
  
  if (updateData.role) {
    companyUser.role = updateData.role;
  }
  
  if (updateData.permissions) {
    companyUser.permissions = updateData.permissions;
  }
  
  if (updateData.department) {
    companyUser.department = updateData.department;
  }
  
  await companyUser.save();
  
  return {
    id: companyUser._id,
    name: companyUser.userId.name,
    email: companyUser.userId.email,
    role: companyUser.role,
    permissions: companyUser.permissions,
    department: companyUser.department,
  };
};

// ==================== CUSTOM BRANDING ====================

/**
 * Get custom branding
 * @param {string} companyId - Company ID
 * @returns {Promise<Object>}
 */
const getCustomBranding = async (companyId) => {
  const company = await Company.findById(companyId).select('customBranding name');
  
  if (!company) {
    throw new Error('Company not found');
  }
  
  return {
    enabled: company.customBranding?.enabled || false,
    logo: company.customBranding?.logo || '',
    colors: company.customBranding?.colors || {
      primary: '#3B82F6',
      secondary: '#10B981',
      accent: '#F59E0B',
    },
    domain: company.customBranding?.domain || '',
    customCss: company.customBranding?.customCss || '',
    favicon: company.customBranding?.favicon || '',
  };
};

/**
 * Update custom branding
 * @param {string} companyId - Company ID
 * @param {Object} brandingData - Branding data
 * @returns {Promise<Object>}
 */
const updateCustomBranding = async (companyId, brandingData) => {
  const company = await Company.findById(companyId);
  
  if (!company) {
    throw new Error('Company not found');
  }
  
  if (!company.hasEnterpriseFeature('custom_branding')) {
    throw new Error('Custom branding not available for your plan');
  }
  
  await company.updateCustomBranding({
    logo: brandingData.logo,
    colors: brandingData.colors,
    domain: brandingData.domain,
    customCss: brandingData.customCss,
    favicon: brandingData.favicon,
  });
  
  return {
    enabled: true,
    logo: brandingData.logo,
    colors: brandingData.colors,
    domain: brandingData.domain,
    customCss: brandingData.customCss,
    favicon: brandingData.favicon,
  };
};

// ==================== SSO/SAML INTEGRATION ====================

/**
 * Get SSO configuration
 * @param {string} companyId - Company ID
 * @returns {Promise<Object>}
 */
const getSsoConfig = async (companyId) => {
  const company = await Company.findById(companyId).select('ssoConfig name');
  
  if (!company) {
    throw new Error('Company not found');
  }
  
  return {
    enabled: company.ssoConfig?.enabled || false,
    provider: company.ssoConfig?.provider || '',
    saml: {
      entityId: company.ssoConfig?.saml?.entityId || '',
      ssoUrl: company.ssoConfig?.saml?.ssoUrl || '',
      metadataUrl: company.ssoConfig?.saml?.metadataUrl || '',
      // Don't return certificate for security
      hasCertificate: !!company.ssoConfig?.saml?.certificate,
    },
    oauth: {
      clientId: company.ssoConfig?.oauth?.clientId || '',
      authorizationUrl: company.ssoConfig?.oauth?.authorizationUrl || '',
      scopes: company.ssoConfig?.oauth?.scopes || [],
      // Don't return client secret
      hasClientSecret: !!company.ssoConfig?.oauth?.clientSecret,
    },
    attributeMapping: company.ssoConfig?.attributeMapping || {
      email: 'email',
      firstName: 'firstName',
      lastName: 'lastName',
      role: 'role',
      department: 'department',
    },
    allowedDomains: company.ssoConfig?.allowedDomains || [],
    autoProvision: company.ssoConfig?.autoProvision || false,
    defaultRole: company.ssoConfig?.defaultRole || 'viewer',
  };
};

/**
 * Update SSO configuration
 * @param {string} companyId - Company ID
 * @param {Object} ssoData - SSO configuration
 * @returns {Promise<Object>}
 */
const updateSsoConfig = async (companyId, ssoData) => {
  const company = await Company.findById(companyId);
  
  if (!company) {
    throw new Error('Company not found');
  }
  
  if (!company.hasEnterpriseFeature('sso') && !company.hasEnterpriseFeature('saml')) {
    throw new Error('SSO/SAML not available for your plan');
  }
  
  await company.updateSsoConfig({
    enabled: ssoData.enabled,
    provider: ssoData.provider,
    saml: ssoData.saml,
    oauth: ssoData.oauth,
    attributeMapping: ssoData.attributeMapping,
    allowedDomains: ssoData.allowedDomains,
    autoProvision: ssoData.autoProvision,
    defaultRole: ssoData.defaultRole,
  });
  
  return getSsoConfig(companyId);
};

// ==================== ENTERPRISE PLANS ====================

/**
 * Get all enterprise plans
 * @returns {Promise<Array>}
 */
const getEnterprisePlans = async () => {
  const plans = await EnterprisePlan.find({
    isActive: true,
    isPublic: true,
  }).sort({ displayOrder: 1 });
  
  return plans.map(plan => ({
    id: plan._id,
    name: plan.name,
    slug: plan.slug,
    tier: plan.tier,
    description: plan.description,
    shortDescription: plan.shortDescription,
    pricing: plan.pricing,
    userLimits: plan.userLimits,
    jobLimits: plan.jobLimits,
    storageLimitGB: plan.storageLimitGB,
    features: plan.features,
    support: plan.support,
    highlights: plan.highlights,
    popular: plan.popular,
    trialDays: plan.trialDays,
    customConfiguration: plan.customConfiguration,
    yearlySavings: plan.yearlySavings,
  }));
};

/**
 * Subscribe to enterprise plan
 * @param {string} companyId - Company ID
 * @param {string} planId - Plan ID
 * @param {Object} subscriptionData - Subscription data
 * @returns {Promise<Object>}
 */
const subscribeToPlan = async (companyId, planId, subscriptionData) => {
  const company = await Company.findById(companyId);
  const plan = await EnterprisePlan.findById(planId);
  
  if (!company) {
    throw new Error('Company not found');
  }
  
  if (!plan) {
    throw new Error('Plan not found');
  }
  
  // Check if contact sales required
  if (plan.customConfiguration.contactSales) {
    return {
      requiresContact: true,
      message: 'Please contact our sales team to subscribe to this plan',
      salesEmail: 'sales@trm.com',
    };
  }
  
  // Start trial if requested
  if (subscriptionData.startTrial) {
    await company.startEnterpriseTrial(planId, plan.trialDays);
    
    return {
      success: true,
      status: 'trial',
      trialEndsAt: company.enterpriseTrial.endsAt,
      plan: {
        id: plan._id,
        name: plan.name,
        tier: plan.tier,
      },
    };
  }
  
  // Activate subscription
  company.enterprisePlan = planId;
  company.enterpriseStatus = 'active';
  company.enterpriseFeatures = Object.keys(plan.features).filter(
    key => plan.features[key] === true
  );
  
  await company.save();
  
  return {
    success: true,
    status: 'active',
    plan: {
      id: plan._id,
      name: plan.name,
      tier: plan.tier,
    },
  };
};

// ==================== ADVANCED REPORTS ====================

/**
 * Get advanced analytics report
 * @param {string} companyId - Company ID
 * @param {string} reportType - Report type
 * @param {Object} dateRange - Date range
 * @returns {Promise<Object>}
 */
const getAdvancedReport = async (companyId, reportType, dateRange = {}) => {
  const company = await Company.findById(companyId);
  
  if (!company) {
    throw new Error('Company not found');
  }
  
  if (!company.hasEnterpriseFeature('advanced_analytics')) {
    throw new Error('Advanced analytics not available for your plan');
  }
  
  const startDate = dateRange.start ? new Date(dateRange.start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = dateRange.end ? new Date(dateRange.end) : new Date();
  
  switch (reportType) {
    case 'hiring-funnel':
      return getHiringFunnelReport(companyId, startDate, endDate);
    case 'referral-performance':
      return getReferralPerformanceReport(companyId, startDate, endDate);
    case 'time-to-hire':
      return getTimeToHireReport(companyId, startDate, endDate);
    case 'source-effectiveness':
      return getSourceEffectivenessReport(companyId, startDate, endDate);
    default:
      throw new Error('Unknown report type');
  }
};

/**
 * Get hiring funnel report
 */
const getHiringFunnelReport = async (companyId, startDate, endDate) => {
  const pipeline = [
    {
      $match: {
        companyId: companyId,
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ];
  
  const results = await Application.aggregate(pipeline);
  
  const funnel = {
    applied: 0,
    screening: 0,
    interview: 0,
    offer: 0,
    hired: 0,
    rejected: 0,
  };
  
  results.forEach(r => {
    funnel[r._id] = r.count;
  });
  
  return {
    type: 'hiring-funnel',
    period: { start: startDate, end: endDate },
    data: funnel,
    conversionRates: {
      applicationToScreening: funnel.applied > 0 ? (funnel.screening / funnel.applied * 100).toFixed(2) : 0,
      screeningToInterview: funnel.screening > 0 ? (funnel.interview / funnel.screening * 100).toFixed(2) : 0,
      interviewToOffer: funnel.interview > 0 ? (funnel.offer / funnel.interview * 100).toFixed(2) : 0,
      offerToHire: funnel.offer > 0 ? (funnel.hired / funnel.offer * 100).toFixed(2) : 0,
    },
  };
};

/**
 * Get referral performance report
 */
const getReferralPerformanceReport = async (companyId, startDate, endDate) => {
  const referrals = await Referral.aggregate([
    {
      $match: {
        companyId: companyId,
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$referrerId',
        totalReferrals: { $sum: 1 },
        hired: { $sum: { $cond: [{ $eq: ['$status', 'hired'] }, 1, 0] } },
        totalBonus: { $sum: { $cond: [{ $eq: ['$status', 'hired'] }, '$bonusAmount', 0] } },
      },
    },
    { $sort: { totalReferrals: -1 } },
    { $limit: 10 },
  ]);
  
  return {
    type: 'referral-performance',
    period: { start: startDate, end: endDate },
    topReferrers: referrals,
  };
};

/**
 * Get time to hire report
 */
const getTimeToHireReport = async (companyId, startDate, endDate) => {
  const referrals = await Referral.find({
    companyId,
    status: 'hired',
    hiredAt: { $gte: startDate, $lte: endDate },
  }).select('createdAt hiredAt');
  
  const timesToHire = referrals.map(r => {
    const days = (new Date(r.hiredAt) - new Date(r.createdAt)) / (1000 * 60 * 60 * 24);
    return days;
  });
  
  const avg = timesToHire.reduce((a, b) => a + b, 0) / timesToHire.length;
  const min = Math.min(...timesToHire);
  const max = Math.max(...timesToHire);
  
  return {
    type: 'time-to-hire',
    period: { start: startDate, end: endDate },
    data: {
      average: avg.toFixed(2),
      minimum: min.toFixed(2),
      maximum: max.toFixed(2),
      totalHires: referrals.length,
    },
  };
};

/**
 * Get source effectiveness report
 */
const getSourceEffectivenessReport = async (companyId, startDate, endDate) => {
  const sources = await Referral.aggregate([
    {
      $match: {
        companyId: companyId,
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$source',
        total: { $sum: 1 },
        hired: { $sum: { $cond: [{ $eq: ['$status', 'hired'] }, 1, 0] } },
      },
    },
  ]);
  
  return {
    type: 'source-effectiveness',
    period: { start: startDate, end: endDate },
    sources: sources.map(s => ({
      source: s._id || 'unknown',
      total: s.total,
      hired: s.hired,
      conversionRate: s.total > 0 ? ((s.hired / s.total) * 100).toFixed(2) : 0,
    })),
  };
};

// ==================== SUPPORT ====================

/**
 * Get support contact information
 * @param {string} companyId - Company ID
 * @returns {Promise<Object>}
 */
const getSupportContact = async (companyId) => {
  const company = await Company.findById(companyId)
    .populate('enterprisePlan', 'support')
    .populate('accountManager', 'name email phone avatar');
  
  if (!company) {
    throw new Error('Company not found');
  }
  
  const supportLevel = company.enterprisePlan?.support?.level || 'standard';
  
  return {
    level: supportLevel,
    responseTime: company.enterprisePlan?.support?.responseTimeHours || 48,
    channels: company.enterprisePlan?.support?.supportChannels || ['email'],
    availability: company.enterprisePlan?.support?.availability || 'business_hours',
    accountManager: company.accountManager,
    supportEmail: supportLevel === 'dedicated' ? 'enterprise-support@trm.com' : 'support@trm.com',
    supportPhone: supportLevel === 'dedicated' ? '+95-1-234-5678' : null,
    documentationUrl: 'https://docs.trm.com/enterprise',
    apiDocsUrl: 'https://docs.trm.com/api',
  };
};

module.exports = {
  getEnterpriseDashboard,
  bulkPostJobs,
  generateApiKey,
  getApiKeys,
  revokeApiKey,
  getWebhookConfig,
  updateWebhookConfig,
  sendWebhook,
  getTeamMembers,
  addTeamMember,
  removeTeamMember,
  updateTeamMember,
  getCustomBranding,
  updateCustomBranding,
  getSsoConfig,
  updateSsoConfig,
  getEnterprisePlans,
  subscribeToPlan,
  getAdvancedReport,
  getSupportContact,
};