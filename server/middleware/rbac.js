/**
 * Role-Based Access Control (RBAC) Middleware
 * Implements permission-based authorization for different user roles
 * Supports role hierarchy and custom permissions
 */

const CompanyUser = require('../models/CompanyUser.js');
const { PERMISSIONS } = require('../models/CompanyUser.js');

// Role hierarchy - higher roles inherit lower role permissions
const ROLE_HIERARCHY = {
  platform_admin: ['platform_admin', 'corporate_admin', 'corporate_recruiter', 'corporate_viewer', 'referrer', 'job_seeker'],
  corporate_admin: ['corporate_admin', 'corporate_recruiter', 'corporate_viewer'],
  corporate_recruiter: ['corporate_recruiter'],
  corporate_viewer: ['corporate_viewer'],
  referrer: ['referrer'],
  job_seeker: ['job_seeker'],
};

// Role-based permission mappings
const ROLE_PERMISSIONS = {
  platform_admin: [
    // All permissions
    'admin:*',
    'read:*',
    'write:*',
    'delete:*',
    'manage:*',
  ],
  corporate_admin: [
    PERMISSIONS.READ_JOBS,
    PERMISSIONS.WRITE_JOBS,
    PERMISSIONS.DELETE_JOBS,
    PERMISSIONS.READ_REFERRALS,
    PERMISSIONS.WRITE_REFERRALS,
    PERMISSIONS.READ_COMPANY,
    PERMISSIONS.WRITE_COMPANY,
    PERMISSIONS.MANAGE_TEAM,
    PERMISSIONS.READ_BILLING,
    PERMISSIONS.WRITE_BILLING,
    PERMISSIONS.READ_ANALYTICS,
  ],
  corporate_recruiter: [
    PERMISSIONS.READ_JOBS,
    PERMISSIONS.WRITE_JOBS,
    PERMISSIONS.READ_REFERRALS,
    PERMISSIONS.WRITE_REFERRALS,
    PERMISSIONS.READ_COMPANY,
    PERMISSIONS.READ_ANALYTICS,
  ],
  corporate_viewer: [
    PERMISSIONS.READ_JOBS,
    PERMISSIONS.READ_REFERRALS,
    PERMISSIONS.READ_COMPANY,
    PERMISSIONS.READ_ANALYTICS,
  ],
  referrer: [
    'read:public_jobs',
    'write:referrals',
    'read:own_referrals',
    'read:own_analytics',
    'write:payout_requests',
  ],
  job_seeker: [
    'read:public_jobs',
    'write:applications',
    'read:own_applications',
  ],
};

/**
 * Check if user has required role
 * @param {string} userRole - User's role
 * @param {string|Array} requiredRoles - Required role(s)
 * @returns {boolean}
 */
const hasRole = (userRole, requiredRoles) => {
  if (!userRole) return false;
  
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  
  // Check direct role match
  if (roles.includes(userRole)) return true;
  
  // Check role hierarchy
  const inheritedRoles = ROLE_HIERARCHY[userRole] || [];
  return roles.some(role => inheritedRoles.includes(role));
};

/**
 * Check if user has required permission
 * @param {string} userRole - User's role
 * @param {string|Array} requiredPermissions - Required permission(s)
 * @param {Array} customPermissions - User's custom permissions
 * @returns {boolean}
 */
const hasPermission = (userRole, requiredPermissions, customPermissions = []) => {
  if (!userRole) return false;
  
  // Platform admin has all permissions
  if (userRole === 'platform_admin') return true;
  
  const permissions = Array.isArray(requiredPermissions) 
    ? requiredPermissions 
    : [requiredPermissions];
  
  // Get user's permissions
  const userPermissions = [
    ...(ROLE_PERMISSIONS[userRole] || []),
    ...customPermissions,
  ];
  
  // Check for wildcard permissions
  if (userPermissions.includes('admin:*') || userPermissions.includes('manage:*')) {
    return true;
  }
  
  // Check each required permission
  return permissions.every(permission => {
    // Direct permission match
    if (userPermissions.includes(permission)) return true;
    
    // Check wildcard permissions (e.g., 'read:*' matches 'read:jobs')
    const [action] = permission.split(':');
    if (userPermissions.includes(`${action}:*`)) return true;
    if (userPermissions.includes('*:*')) return true;
    
    return false;
  });
};

/**
 * Middleware to check if user has required role(s)
 * @param {string|Array} roles - Required role(s)
 * @returns {Function} Express middleware
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }
    
    const userRole = req.user.role;
    
    if (!hasRole(userRole, roles)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions. Required role: ' + (Array.isArray(roles) ? roles.join(', ') : roles),
        code: 'FORBIDDEN',
      });
    }
    
    next();
  };
};

/**
 * Middleware to check if user has required permission(s)
 * @param {string|Array} permissions - Required permission(s)
 * @returns {Function} Express middleware
 */
const requirePermission = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }
    
    const userRole = req.user.role;
    const customPermissions = req.user.customPermissions || [];
    
    if (!hasPermission(userRole, permissions, customPermissions)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'FORBIDDEN',
      });
    }
    
    next();
  };
};

/**
 * Middleware to check if user is a platform admin
 */
const requireAdmin = requireRole('platform_admin');

/**
 * Middleware to check if user is a corporate user (admin, recruiter, or viewer)
 */
const requireCorporate = requireRole(['corporate_admin', 'corporate_recruiter', 'corporate_viewer']);

/**
 * Middleware to check if user is a corporate admin
 */
const requireCorporateAdmin = requireRole('corporate_admin');

/**
 * Middleware to check if user is a referrer
 */
const requireReferrer = requireRole('referrer');

/**
 * Middleware to check if user is a job seeker
 */
const requireJobSeeker = requireRole('job_seeker');

/**
 * Middleware to check if user owns the resource or is an admin
 * @param {Function} getResourceOwnerId - Function to extract owner ID from request
 * @returns {Function} Express middleware
 */
const requireOwnerOrAdmin = (getResourceOwnerId) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }
    
    // Platform admins can access any resource
    if (req.user.role === 'platform_admin') {
      return next();
    }
    
    try {
      const ownerId = await getResourceOwnerId(req);
      
      if (ownerId && ownerId.toString() === req.user._id.toString()) {
        return next();
      }
      
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource',
        code: 'FORBIDDEN',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error checking resource ownership',
        code: 'INTERNAL_ERROR',
      });
    }
  };
};

/**
 * Middleware to check company membership and permissions
 * Attaches company context to request if user is a member
 * @param {string|Array} requiredPermissions - Required permission(s) within company
 * @returns {Function} Express middleware
 */
const requireCompanyAccess = (requiredPermissions = []) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }
    
    // Platform admins bypass company checks
    if (req.user.role === 'platform_admin') {
      req.isPlatformAdmin = true;
      return next();
    }
    
    const companyId = req.params.companyId || req.body.companyId || req.query.companyId;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required',
        code: 'COMPANY_ID_REQUIRED',
      });
    }
    
    try {
      // Check if user is a member of the company
      const companyUser = await CompanyUser.findRelationship(req.user._id, companyId);
      
      if (!companyUser || !companyUser.isActive) {
        return res.status(403).json({
          success: false,
          message: 'You are not a member of this company',
          code: 'NOT_COMPANY_MEMBER',
        });
      }
      
      if (companyUser.invitationStatus !== 'accepted') {
        return res.status(403).json({
          success: false,
          message: 'Please accept your company invitation first',
          code: 'INVITATION_PENDING',
        });
      }
      
      // Check permissions if specified
      if (requiredPermissions.length > 0) {
        const permissions = Array.isArray(requiredPermissions) 
          ? requiredPermissions 
          : [requiredPermissions];
        
        const hasRequiredPermission = permissions.some(perm => companyUser.hasPermission(perm));
        
        if (!hasRequiredPermission) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to perform this action',
            code: 'INSUFFICIENT_COMPANY_PERMISSIONS',
          });
        }
      }
      
      // Attach company context to request
      req.companyId = companyId;
      req.companyRole = companyUser.role;
      req.companyPermissions = companyUser.effectivePermissions;
      req.companyUser = companyUser;
      
      next();
    } catch (error) {
      console.error('Company access check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking company access',
        code: 'INTERNAL_ERROR',
      });
    }
  };
};

/**
 * Middleware to check if user can manage company (admin only)
 */
const requireCompanyAdmin = requireCompanyAccess([PERMISSIONS.MANAGE_TEAM, PERMISSIONS.WRITE_COMPANY]);

/**
 * Middleware to check if user can post/edit jobs
 */
const requireJobManager = requireCompanyAccess([PERMISSIONS.WRITE_JOBS]);

/**
 * Middleware to check if user can view jobs
 */
const requireJobViewer = requireCompanyAccess([PERMISSIONS.READ_JOBS]);

/**
 * Middleware to check if user can manage referrals
 */
const requireReferralManager = requireCompanyAccess([PERMISSIONS.WRITE_REFERRALS]);

/**
 * Middleware to check if user can view referrals
 */
const requireReferralViewer = requireCompanyAccess([PERMISSIONS.READ_REFERRALS]);

/**
 * Middleware to check if user can view billing
 */
const requireBillingViewer = requireCompanyAccess([PERMISSIONS.READ_BILLING]);

/**
 * Middleware to check if user can manage billing
 */
const requireBillingManager = requireCompanyAccess([PERMISSIONS.WRITE_BILLING]);

/**
 * Middleware factory to check resource ownership within company context
 * @param {Function} getResourceCompanyId - Function to extract company ID from request
 * @returns {Function} Express middleware
 */
const requireCompanyResourceAccess = (getResourceCompanyId) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }
    
    // Platform admins bypass checks
    if (req.user.role === 'platform_admin') {
      return next();
    }
    
    try {
      const resourceCompanyId = await getResourceCompanyId(req);
      
      if (!resourceCompanyId) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found',
          code: 'RESOURCE_NOT_FOUND',
        });
      }
      
      // Check if user is member of the company that owns the resource
      const companyUser = await CompanyUser.findRelationship(req.user._id, resourceCompanyId);
      
      if (!companyUser || !companyUser.isActive || companyUser.invitationStatus !== 'accepted') {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this resource',
          code: 'FORBIDDEN',
        });
      }
      
      // Attach company context
      req.companyId = resourceCompanyId;
      req.companyRole = companyUser.role;
      req.companyPermissions = companyUser.effectivePermissions;
      
      next();
    } catch (error) {
      console.error('Company resource access error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking resource access',
        code: 'INTERNAL_ERROR',
      });
    }
  };
};

/**
 * Check if user is the referrer who created a referral
 * @param {Object} req - Express request
 * @returns {boolean}
 */
const isReferralOwner = async (req) => {
  const { Referral } = await import('../models/index.js');
  const referral = await Referral.findById(req.params.id);
  
  if (!referral) return false;
  
  return referral.referrerId.toString() === req.user._id.toString();
};

/**
 * Check if user is the applicant who created an application
 * @param {Object} req - Express request
 * @returns {boolean}
 */
const isApplicationOwner = async (req) => {
  const { Application } = await import('../models/index.js');
  const application = await Application.findById(req.params.id);
  
  if (!application) return false;
  
  return application.applicantId.toString() === req.user._id.toString();
};

module.exports = {
  requireRole,
  requirePermission,
  requireAdmin,
  requireCorporate,
  requireCorporateAdmin,
  requireReferrer,
  requireJobSeeker,
  requireOwnerOrAdmin,
  requireCompanyAccess,
  requireCompanyAdmin,
  requireJobManager,
  requireJobViewer,
  requireReferralManager,
  requireReferralViewer,
  requireBillingViewer,
  requireBillingManager,
  requireCompanyResourceAccess,
  isReferralOwner,
  isApplicationOwner,
  hasRole,
  hasPermission,
  ROLE_PERMISSIONS,
  ROLE_HIERARCHY,
};
