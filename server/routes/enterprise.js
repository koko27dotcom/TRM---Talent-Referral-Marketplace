/**
 * Enterprise Routes
 * B2B enterprise portal API endpoints
 * Handles enterprise dashboard, team management, API keys, webhooks, and more
 */

const express = require('express');
const { authenticate } = require('../middleware/auth.js');
const { requireRole } = require('../middleware/rbac.js');
const { Company, EnterprisePlan, CompanyUser } = require('../models/index.js');
const {
  getEnterpriseDashboard,
  bulkPostJobs,
  generateApiKey,
  getApiKeys,
  revokeApiKey,
  getWebhookConfig,
  updateWebhookConfig,
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
} = require('../services/enterpriseService.js');

const router = express.Router();

// ==================== MIDDLEWARE ====================

/**
 * Middleware to check if company has enterprise plan
 */
const requireEnterprise = async (req, res, next) => {
  try {
    const companyUser = await CompanyUser.findOne({
      userId: req.user._id,
      isActive: true,
    });
    
    if (!companyUser) {
      return res.status(403).json({
        success: false,
        message: 'You are not associated with any company',
      });
    }
    
    const company = await Company.findById(companyUser.companyId);
    
    if (!company || !company.hasEnterprisePlan()) {
      return res.status(403).json({
        success: false,
        message: 'Enterprise plan required',
        upgradeUrl: '/enterprise/plans',
      });
    }
    
    req.company = company;
    req.companyUser = companyUser;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check specific enterprise feature
 */
const requireFeature = (feature) => {
  return async (req, res, next) => {
    try {
      if (!req.company.hasEnterpriseFeature(feature)) {
        return res.status(403).json({
          success: false,
          message: `Feature '${feature}' not available in your plan`,
          upgradeUrl: '/enterprise/plans',
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

// ==================== DASHBOARD ====================

/**
 * @route GET /api/v1/enterprise/dashboard
 * @desc Get enterprise dashboard data
 * @access Private (Enterprise)
 */
router.get('/dashboard', authenticate, requireEnterprise, async (req, res, next) => {
  try {
    const dashboard = await getEnterpriseDashboard(req.company._id);
    
    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    next(error);
  }
});

// ==================== ENTERPRISE PLANS ====================

/**
 * @route GET /api/v1/enterprise/plans
 * @desc List available enterprise plans
 * @access Private
 */
router.get('/plans', authenticate, async (req, res, next) => {
  try {
    const plans = await getEnterprisePlans();
    
    res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/enterprise/subscribe
 * @desc Subscribe to enterprise plan
 * @access Private (Company Admin)
 */
router.post('/subscribe', authenticate, requireRole(['admin', 'super_admin']), async (req, res, next) => {
  try {
    const { planId, startTrial, billingCycle } = req.body;
    
    const companyUser = await CompanyUser.findOne({
      userId: req.user._id,
      role: 'admin',
      isActive: true,
    });
    
    if (!companyUser) {
      return res.status(403).json({
        success: false,
        message: 'Company admin access required',
      });
    }
    
    const result = await subscribeToPlan(companyUser.companyId, planId, {
      startTrial,
      billingCycle,
    });
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// ==================== TEAM MANAGEMENT ====================

/**
 * @route GET /api/v1/enterprise/team
 * @desc Get team members
 * @access Private (Enterprise)
 */
router.get('/team', authenticate, requireEnterprise, async (req, res, next) => {
  try {
    const members = await getTeamMembers(req.company._id);
    
    res.json({
      success: true,
      data: members,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/enterprise/team
 * @desc Add team member
 * @access Private (Enterprise Admin)
 */
router.post('/team', authenticate, requireEnterprise, requireRole(['admin', 'super_admin']), async (req, res, next) => {
  try {
    const { name, email, role, permissions, department } = req.body;
    
    const member = await addTeamMember(req.company._id, {
      name,
      email,
      role,
      permissions,
      department,
    });
    
    res.status(201).json({
      success: true,
      message: 'Team member added successfully',
      data: member,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/v1/enterprise/team/:id
 * @desc Remove team member
 * @access Private (Enterprise Admin)
 */
router.delete('/team/:id', authenticate, requireEnterprise, requireRole(['admin', 'super_admin']), async (req, res, next) => {
  try {
    await removeTeamMember(req.company._id, req.params.id);
    
    res.json({
      success: true,
      message: 'Team member removed successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PATCH /api/v1/enterprise/team/:id
 * @desc Update team member
 * @access Private (Enterprise Admin)
 */
router.patch('/team/:id', authenticate, requireEnterprise, requireRole(['admin', 'super_admin']), async (req, res, next) => {
  try {
    const { role, permissions, department } = req.body;
    
    const member = await updateTeamMember(req.company._id, req.params.id, {
      role,
      permissions,
      department,
    });
    
    res.json({
      success: true,
      message: 'Team member updated successfully',
      data: member,
    });
  } catch (error) {
    next(error);
  }
});

// ==================== BULK JOB POSTING ====================

/**
 * @route POST /api/v1/enterprise/jobs/bulk
 * @desc Bulk job posting
 * @access Private (Enterprise)
 */
router.post('/jobs/bulk', authenticate, requireEnterprise, requireFeature('bulk_posting'), async (req, res, next) => {
  try {
    const { jobs, format, publishImmediately } = req.body;
    
    const result = await bulkPostJobs(req.company._id, jobs, format || 'json', {
      publishImmediately,
      postedBy: req.user._id,
    });
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// ==================== API KEYS ====================

/**
 * @route GET /api/v1/enterprise/api-keys
 * @desc Get API keys
 * @access Private (Enterprise)
 */
router.get('/api-keys', authenticate, requireEnterprise, requireFeature('api_access'), async (req, res, next) => {
  try {
    const keys = await getApiKeys(req.company._id);
    
    res.json({
      success: true,
      data: keys,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/enterprise/api-keys
 * @desc Generate new API key
 * @access Private (Enterprise Admin)
 */
router.post('/api-keys', authenticate, requireEnterprise, requireFeature('api_access'), requireRole(['admin', 'super_admin']), async (req, res, next) => {
  try {
    const { name, permissions, rateLimit, expiresAt } = req.body;
    
    const apiKey = await generateApiKey(req.company._id, {
      name,
      permissions,
      rateLimit,
      expiresAt,
      createdBy: req.user._id,
    });
    
    res.status(201).json({
      success: true,
      message: 'API key generated successfully',
      data: apiKey,
      warning: 'This is the only time you will see the full API key. Please copy it now.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/v1/enterprise/api-keys/:id
 * @desc Revoke API key
 * @access Private (Enterprise Admin)
 */
router.delete('/api-keys/:id', authenticate, requireEnterprise, requireFeature('api_access'), requireRole(['admin', 'super_admin']), async (req, res, next) => {
  try {
    await revokeApiKey(req.company._id, req.params.id);
    
    res.json({
      success: true,
      message: 'API key revoked successfully',
    });
  } catch (error) {
    next(error);
  }
});

// ==================== WEBHOOKS ====================

/**
 * @route GET /api/v1/enterprise/webhooks
 * @desc Get webhook configuration
 * @access Private (Enterprise)
 */
router.get('/webhooks', authenticate, requireEnterprise, requireFeature('webhooks'), async (req, res, next) => {
  try {
    const config = await getWebhookConfig(req.company._id);
    
    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/v1/enterprise/webhooks
 * @desc Update webhook configuration
 * @access Private (Enterprise Admin)
 */
router.put('/webhooks', authenticate, requireEnterprise, requireFeature('webhooks'), requireRole(['admin', 'super_admin']), async (req, res, next) => {
  try {
    const { webhookUrl, webhookSecret, webhookEvents, enabled } = req.body;
    
    const config = await updateWebhookConfig(req.company._id, {
      webhookUrl,
      webhookSecret,
      webhookEvents,
      enabled,
    });
    
    res.json({
      success: true,
      message: 'Webhook configuration updated',
      data: config,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/enterprise/webhooks/test
 * @desc Test webhook
 * @access Private (Enterprise Admin)
 */
router.post('/webhooks/test', authenticate, requireEnterprise, requireFeature('webhooks'), requireRole(['admin', 'super_admin']), async (req, res, next) => {
  try {
    const { sendWebhook } = await import('../services/enterpriseService.js');
    
    const result = await sendWebhook(req.company._id, 'test', {
      message: 'This is a test webhook from TRM Enterprise',
      timestamp: new Date().toISOString(),
    });
    
    res.json({
      success: result.sent,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// ==================== CUSTOM BRANDING ====================

/**
 * @route GET /api/v1/enterprise/branding
 * @desc Get custom branding
 * @access Private (Enterprise)
 */
router.get('/branding', authenticate, requireEnterprise, requireFeature('custom_branding'), async (req, res, next) => {
  try {
    const branding = await getCustomBranding(req.company._id);
    
    res.json({
      success: true,
      data: branding,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/v1/enterprise/branding
 * @desc Update custom branding
 * @access Private (Enterprise Admin)
 */
router.put('/branding', authenticate, requireEnterprise, requireFeature('custom_branding'), requireRole(['admin', 'super_admin']), async (req, res, next) => {
  try {
    const { logo, colors, domain, customCss, favicon } = req.body;
    
    const branding = await updateCustomBranding(req.company._id, {
      logo,
      colors,
      domain,
      customCss,
      favicon,
    });
    
    res.json({
      success: true,
      message: 'Custom branding updated',
      data: branding,
    });
  } catch (error) {
    next(error);
  }
});

// ==================== SSO/SAML ====================

/**
 * @route GET /api/v1/enterprise/sso
 * @desc Get SSO configuration
 * @access Private (Enterprise)
 */
router.get('/sso', authenticate, requireEnterprise, async (req, res, next) => {
  try {
    // Check for SSO or SAML feature
    if (!req.company.hasEnterpriseFeature('sso') && !req.company.hasEnterpriseFeature('saml')) {
      return res.status(403).json({
        success: false,
        message: 'SSO/SAML not available in your plan',
      });
    }
    
    const config = await getSsoConfig(req.company._id);
    
    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/v1/enterprise/sso
 * @desc Update SSO configuration
 * @access Private (Enterprise Admin)
 */
router.put('/sso', authenticate, requireEnterprise, requireRole(['admin', 'super_admin']), async (req, res, next) => {
  try {
    // Check for SSO or SAML feature
    if (!req.company.hasEnterpriseFeature('sso') && !req.company.hasEnterpriseFeature('saml')) {
      return res.status(403).json({
        success: false,
        message: 'SSO/SAML not available in your plan',
      });
    }
    
    const ssoData = req.body;
    const config = await updateSsoConfig(req.company._id, ssoData);
    
    res.json({
      success: true,
      message: 'SSO configuration updated',
      data: config,
    });
  } catch (error) {
    next(error);
  }
});

// ==================== ADVANCED REPORTS ====================

/**
 * @route GET /api/v1/enterprise/reports/advanced
 * @desc Get advanced analytics reports
 * @access Private (Enterprise)
 */
router.get('/reports/advanced', authenticate, requireEnterprise, requireFeature('advanced_analytics'), async (req, res, next) => {
  try {
    const { type, startDate, endDate } = req.query;
    
    const report = await getAdvancedReport(req.company._id, type, {
      start: startDate,
      end: endDate,
    });
    
    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
});

// ==================== SUPPORT ====================

/**
 * @route GET /api/v1/enterprise/support
 * @desc Get support contact information
 * @access Private (Enterprise)
 */
router.get('/support', authenticate, requireEnterprise, async (req, res, next) => {
  try {
    const support = await getSupportContact(req.company._id);
    
    res.json({
      success: true,
      data: support,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/enterprise/support/ticket
 * @desc Create support ticket
 * @access Private (Enterprise)
 */
router.post('/support/ticket', authenticate, requireEnterprise, async (req, res, next) => {
  try {
    const { subject, message, priority, category } = req.body;
    
    // TODO: Implement support ticket creation
    // This would integrate with a support system like Zendesk, Freshdesk, etc.
    
    res.json({
      success: true,
      message: 'Support ticket created',
      data: {
        ticketId: `ENT-${Date.now()}`,
        subject,
        priority,
        category,
        createdAt: new Date(),
        estimatedResponse: req.company.enterprisePlan?.support?.responseTimeHours || 24,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ==================== COMPANY STATUS ====================

/**
 * @route GET /api/v1/enterprise/status
 * @desc Check enterprise status for current user
 * @access Private
 */
router.get('/status', authenticate, async (req, res, next) => {
  try {
    const companyUser = await CompanyUser.findOne({
      userId: req.user._id,
      isActive: true,
    }).populate('companyId', 'enterpriseStatus enterprisePlan enterpriseFeatures enterpriseTrial');
    
    if (!companyUser || !companyUser.companyId) {
      return res.json({
        success: true,
        data: {
          hasEnterprise: false,
        },
      });
    }
    
    const company = companyUser.companyId;
    const plan = await EnterprisePlan.findById(company.enterprisePlan);
    
    res.json({
      success: true,
      data: {
        hasEnterprise: company.hasEnterprisePlan(),
        status: company.enterpriseStatus,
        plan: plan ? {
          id: plan._id,
          name: plan.name,
          tier: plan.tier,
        } : null,
        features: company.enterpriseFeatures,
        trial: company.enterpriseTrial,
        role: companyUser.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;