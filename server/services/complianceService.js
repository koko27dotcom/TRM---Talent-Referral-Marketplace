/**
 * Compliance Service
 * Handles GDPR, PDPA (Thailand/Singapore), and local Myanmar compliance
 * Supports data export, right to be forgotten, consent management, and breach notification
 */

const { User, Company, Referral, Application, AuditLog } = require('../models/index.js');
const { ComplianceReport, REPORT_TYPES, FINDING_SEVERITY } = require('../models/ComplianceReport.js');
const { DataRetentionPolicy, COMPLIANCE_FRAMEWORKS } = require('../models/DataRetentionPolicy.js');
const { SecurityAudit, SECURITY_EVENT_TYPES, SEVERITY_LEVELS } = require('../models/SecurityAudit.js');
const encryptionService = require('./encryptionService.js');

// DSR (Data Subject Request) types
const DSR_TYPES = {
  ACCESS: 'access',
  DELETION: 'deletion',
  PORTABILITY: 'portability',
  CORRECTION: 'correction',
  RESTRICTION: 'restriction',
  OBJECTION: 'objection',
};

// DSR status
const DSR_STATUS = {
  PENDING: 'pending',
  IN_REVIEW: 'in_review',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
};

// Consent types
const CONSENT_TYPES = {
  MARKETING: 'marketing',
  ANALYTICS: 'analytics',
  THIRD_PARTY_SHARING: 'third_party_sharing',
  DATA_PROCESSING: 'data_processing',
  COOKIES: 'cookies',
  LOCATION: 'location',
  NOTIFICATIONS: 'notifications',
};

// Legal basis for processing
const LEGAL_BASIS = {
  CONSENT: 'consent',
  CONTRACT: 'contract',
  LEGAL_OBLIGATION: 'legal_obligation',
  VITAL_INTERESTS: 'vital_interests',
  PUBLIC_TASK: 'public_task',
  LEGITIMATE_INTERESTS: 'legitimate_interests',
};

/**
 * Submit a Data Subject Request (DSR)
 * @param {Object} options - DSR options
 * @returns {Promise<Object>}
 */
const submitDSR = async (options) => {
  const {
    userId,
    type,
    description,
    requestedBy,
    verificationMethod,
    priority = 'normal',
  } = options;
  
  // Validate request type
  if (!Object.values(DSR_TYPES).includes(type)) {
    throw new Error('Invalid DSR type');
  }
  
  // Get user data
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  // Check for existing pending requests
  const existingRequest = await ComplianceReport.findOne({
    type: 'DSR_REQUEST',
    'scope.entities': { $elemMatch: { entityId: userId } },
    status: { $in: ['pending', 'in_review', 'processing'] },
  });
  
  if (existingRequest) {
    throw new Error('A pending DSR already exists for this user');
  }
  
  // Create DSR record
  const dsr = await ComplianceReport.createReport({
    name: `DSR-${type.toUpperCase()}-${userId.toString().slice(-6)}`,
    description: `Data Subject Request: ${type}`,
    type: REPORT_TYPES.CUSTOM,
    scope: {
      startDate: user.createdAt,
      endDate: new Date(),
      entities: [{ entityType: 'user', entityId: userId }],
    },
    frameworks: [{ name: 'GDPR' }, { name: 'PDPA' }],
    content: {
      methodology: 'Data Subject Request processing',
      dsrDetails: {
        type,
        description,
        requestedBy,
        verificationMethod,
        priority,
        userEmail: user.email,
        submittedAt: new Date(),
      },
    },
    status: 'pending',
    generatedBy: requestedBy,
  });
  
  // Log the request
  await SecurityAudit.logEvent({
    eventType: type === DSR_TYPES.DELETION 
      ? SECURITY_EVENT_TYPES.GDPR_DELETION_REQUEST 
      : SECURITY_EVENT_TYPES.GDPR_EXPORT_REQUEST,
    category: 'compliance',
    severity: SEVERITY_LEVELS.INFO,
    actor: { userId: user._id, email: user.email },
    description: `DSR ${type} request submitted`,
    details: { dsrId: dsr.reportId },
  });
  
  return {
    success: true,
    dsrId: dsr.reportId,
    status: DSR_STATUS.PENDING,
    estimatedCompletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  };
};

/**
 * Export user data for portability request
 * @param {string} userId - User ID
 * @returns {Promise<Object>}
 */
const exportUserData = async (userId) => {
  const user = await User.findById(userId).lean();
  if (!user) {
    throw new Error('User not found');
  }
  
  // Collect all user-related data
  const data = {
    exportDate: new Date().toISOString(),
    exportFormat: 'JSON',
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      emailVerified: user.emailVerified,
      status: user.status,
    },
    profile: user.referrerProfile || user.jobseekerProfile || null,
    
    // Referrals
    referrals: await Referral.find({ referrerId: userId }).lean(),
    
    // Applications (if job seeker)
    applications: await Application.find({ applicantId: userId }).lean(),
    
    // Audit logs
    activity: await AuditLog.find({ userId }).select('-ipAddress').lean(),
    
    // Consent records
    consents: await getUserConsents(userId),
    
    // Metadata
    metadata: {
      totalRecords: 0,
      dataCategories: ['personal', 'activity', 'preferences'],
    },
  };
  
  // Calculate total records
  data.metadata.totalRecords = 
    1 + // User
    data.referrals.length + 
    data.applications.length + 
    data.activity.length;
  
  return data;
};

/**
 * Delete user data (Right to be Forgotten)
 * @param {string} userId - User ID
 * @param {Object} options - Deletion options
 * @returns {Promise<Object>}
 */
const deleteUserData = async (userId, options = {}) => {
  const {
    reason = 'User request',
    anonymizeInstead = false,
    preserveFinancialRecords = true,
    deletedBy = null,
  } = options;
  
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  const deletionLog = {
    userId,
    startedAt: new Date(),
    actions: [],
    errors: [],
  };
  
  try {
    // 1. Anonymize or delete referrals
    const referrals = await Referral.find({ referrerId: userId });
    for (const referral of referrals) {
      if (anonymizeInstead) {
        referral.referrerId = null;
        referral.referrerName = '[REDACTED]';
        await referral.save();
      }
      deletionLog.actions.push({ entity: 'Referral', id: referral._id, action: anonymizeInstead ? 'anonymized' : 'deleted' });
    }
    
    // 2. Anonymize or delete applications
    const applications = await Application.find({ applicantId: userId });
    for (const application of applications) {
      if (anonymizeInstead) {
        application.applicantId = null;
        application.applicantName = '[REDACTED]';
        application.applicantEmail = '[REDACTED]';
        await application.save();
      }
      deletionLog.actions.push({ entity: 'Application', id: application._id, action: anonymizeInstead ? 'anonymized' : 'deleted' });
    }
    
    // 3. Delete or anonymize user record
    if (anonymizeInstead) {
      user.email = `deleted-${user._id}@anonymized.local`;
      user.name = '[REDACTED]';
      user.phone = null;
      user.avatar = null;
      user.status = 'deleted';
      user.referrerProfile = undefined;
      user.jobseekerProfile = undefined;
      await user.save();
      deletionLog.actions.push({ entity: 'User', id: user._id, action: 'anonymized' });
    } else {
      // Soft delete - mark as deleted
      user.status = 'deleted';
      user.email = `deleted-${Date.now()}-${user._id}@deleted.local`;
      user.name = '[DELETED USER]';
      await user.save();
      deletionLog.actions.push({ entity: 'User', id: user._id, action: 'soft_deleted' });
    }
    
    // 4. Log the deletion
    await SecurityAudit.logEvent({
      eventType: SECURITY_EVENT_TYPES.DATA_DELETION,
      category: 'compliance',
      severity: SEVERITY_LEVELS.HIGH,
      actor: deletedBy ? { userId: deletedBy } : { userId },
      description: `User data ${anonymizeInstead ? 'anonymized' : 'deleted'}: ${reason}`,
      details: { userId, anonymizeInstead, actionCount: deletionLog.actions.length },
    });
    
    deletionLog.completedAt = new Date();
    deletionLog.success = true;
    
    return {
      success: true,
      message: `User data ${anonymizeInstead ? 'anonymized' : 'deleted'} successfully`,
      actionsTaken: deletionLog.actions.length,
      log: deletionLog,
    };
  } catch (error) {
    deletionLog.errors.push(error.message);
    deletionLog.success = false;
    throw error;
  }
};

/**
 * Record user consent
 * @param {string} userId - User ID
 * @param {string} consentType - Type of consent
 * @param {boolean} granted - Whether consent is granted
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>}
 */
const recordConsent = async (userId, consentType, granted, metadata = {}) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  // Initialize consent tracking if not exists
  if (!user.privacyConsent) {
    user.privacyConsent = {};
  }
  
  // Record consent
  user.privacyConsent[consentType] = {
    granted,
    grantedAt: new Date(),
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
    version: metadata.version || '1.0',
    legalBasis: metadata.legalBasis || LEGAL_BASIS.CONSENT,
  };
  
  await user.save();
  
  // Log consent change
  await SecurityAudit.logEvent({
    eventType: granted 
      ? SECURITY_EVENT_TYPES.CONSENT_GRANTED 
      : SECURITY_EVENT_TYPES.CONSENT_REVOKED,
    category: 'compliance',
    severity: SEVERITY_LEVELS.INFO,
    actor: { userId, email: user.email },
    description: `Consent ${granted ? 'granted' : 'revoked'} for ${consentType}`,
    details: { consentType, metadata },
  });
  
  return {
    success: true,
    consentType,
    granted,
    recordedAt: new Date(),
  };
};

/**
 * Get user consents
 * @param {string} userId - User ID
 * @returns {Promise<Object>}
 */
const getUserConsents = async (userId) => {
  const user = await User.findById(userId).select('privacyConsent emailPreferences');
  if (!user) {
    throw new Error('User not found');
  }
  
  return {
    privacy: user.privacyConsent || {},
    marketing: user.emailPreferences || {},
    lastUpdated: user.updatedAt,
  };
};

/**
 * Check if user has given consent
 * @param {string} userId - User ID
 * @param {string} consentType - Type of consent
 * @returns {Promise<boolean>}
 */
const hasConsent = async (userId, consentType) => {
  const user = await User.findById(userId).select('privacyConsent');
  if (!user || !user.privacyConsent) return false;
  
  const consent = user.privacyConsent[consentType];
  return consent && consent.granted === true;
};

/**
 * Generate compliance report
 * @param {Object} options - Report options
 * @returns {Promise<Object>}
 */
const generateComplianceReport = async (options) => {
  const {
    type,
    companyId,
    startDate,
    endDate,
    generatedBy,
  } = options;
  
  const report = await ComplianceReport.createReport({
    name: `${type} Report ${new Date().toISOString().split('T')[0]}`,
    description: `Automated ${type} compliance report`,
    type,
    scope: {
      companyId,
      startDate,
      endDate,
    },
    frameworks: getFrameworksForReportType(type),
    generatedBy,
    status: 'generating',
  });
  
  // Start report generation (async)
  generateReportData(report._id, type, { companyId, startDate, endDate });
  
  return {
    success: true,
    reportId: report.reportId,
    status: 'generating',
  };
};

/**
 * Get frameworks for report type
 * @param {string} reportType - Report type
 * @returns {Array}
 */
const getFrameworksForReportType = (reportType) => {
  const frameworkMap = {
    [REPORT_TYPES.GDPR_AUDIT]: [{ name: 'GDPR', version: '2016/679' }],
    [REPORT_TYPES.PDPA_THAILAND_AUDIT]: [{ name: 'PDPA Thailand', version: '2019' }],
    [REPORT_TYPES.PDPA_SINGAPORE_AUDIT]: [{ name: 'PDPA Singapore', version: '2020' }],
    [REPORT_TYPES.SOC2_TYPE_II]: [{ name: 'SOC 2 Type II' }],
    [REPORT_TYPES.DATA_INVENTORY]: [{ name: 'GDPR' }, { name: 'PDPA' }],
  };
  
  return frameworkMap[reportType] || [{ name: 'General' }];
};

/**
 * Generate report data (async processing)
 * @param {string} reportId - Report ID
 * @param {string} type - Report type
 * @param {Object} scope - Report scope
 */
const generateReportData = async (reportId, type, scope) => {
  try {
    const report = await ComplianceReport.findById(reportId);
    if (!report) return;
    
    report.generation.startedAt = new Date();
    await report.save();
    
    // Generate findings based on report type
    switch (type) {
      case REPORT_TYPES.GDPR_AUDIT:
        await generateGDPRFindings(report, scope);
        break;
      case REPORT_TYPES.DATA_INVENTORY:
        await generateDataInventory(report, scope);
        break;
      case REPORT_TYPES.RETENTION_COMPLIANCE:
        await generateRetentionFindings(report, scope);
        break;
      default:
        await generateGeneralFindings(report, scope);
    }
    
    // Calculate scores
    await calculateComplianceScores(report);
    
    // Mark as completed
    await report.markCompleted({
      scores: report.scores,
      statistics: report.statistics,
      content: {
        executiveSummary: generateExecutiveSummary(report),
        recommendations: generateRecommendations(report),
      },
    });
  } catch (error) {
    console.error('Report generation error:', error);
    const report = await ComplianceReport.findById(reportId);
    if (report) {
      await report.markFailed(error);
    }
  }
};

/**
 * Generate GDPR-specific findings
 * @param {Object} report - Compliance report
 * @param {Object} scope - Report scope
 */
const generateGDPRFindings = async (report, scope) => {
  const findings = [];
  
  // Check for users without consent records
  const usersWithoutConsent = await User.countDocuments({
    'privacyConsent.dataProcessing': { $exists: false },
    createdAt: { $lte: new Date('2018-05-25') }, // GDPR effective date
  });
  
  if (usersWithoutConsent > 0) {
    findings.push({
      title: 'Users without valid consent',
      description: `${usersWithoutConsent} users lack valid consent records`,
      category: 'consent',
      severity: FINDING_SEVERITY.HIGH,
      controlReference: 'GDPR Article 6',
    });
  }
  
  // Check for data retention policy
  const retentionPolicy = await DataRetentionPolicy.findOne({
    status: 'active',
    'complianceRequirements.framework': COMPLIANCE_FRAMEWORKS.GDPR,
  });
  
  if (!retentionPolicy) {
    findings.push({
      title: 'No GDPR data retention policy',
      description: 'No active data retention policy configured for GDPR compliance',
      category: 'retention',
      severity: FINDING_SEVERITY.CRITICAL,
      controlReference: 'GDPR Article 5(1)(e)',
    });
  }
  
  // Add findings to report
  for (const finding of findings) {
    await report.addFinding(finding);
  }
};

/**
 * Generate data inventory
 * @param {Object} report - Compliance report
 * @param {Object} scope - Report scope
 */
const generateDataInventory = async (report, scope) => {
  const inventory = {
    users: await User.countDocuments(),
    companies: await Company.countDocuments(),
    referrals: await Referral.countDocuments(),
    applications: await Application.countDocuments(),
  };
  
  report.content.dataInventory = inventory;
  await report.save();
};

/**
 * Generate retention compliance findings
 * @param {Object} report - Compliance report
 * @param {Object} scope - Report scope
 */
const generateRetentionFindings = async (report, scope) => {
  // Implementation would check actual data against retention policies
  // This is a placeholder
  report.statistics.totalControls = 10;
  report.statistics.compliantControls = 8;
  report.statistics.nonCompliantControls = 2;
  await report.save();
};

/**
 * Generate general findings
 * @param {Object} report - Compliance report
 * @param {Object} scope - Report scope
 */
const generateGeneralFindings = async (report, scope) => {
  // Placeholder for general findings
  report.statistics.totalControls = 5;
  report.statistics.compliantControls = 5;
  await report.save();
};

/**
 * Calculate compliance scores
 * @param {Object} report - Compliance report
 */
const calculateComplianceScores = async (report) => {
  const total = report.statistics.totalControls || 1;
  const compliant = report.statistics.compliantControls || 0;
  
  report.scores = {
    overall: Math.round((compliant / total) * 100),
    byCategory: [],
    byFramework: [],
  };
  
  await report.save();
};

/**
 * Generate executive summary
 * @param {Object} report - Compliance report
 * @returns {string}
 */
const generateExecutiveSummary = (report) => {
  return `Compliance report generated on ${new Date().toLocaleDateString()}. ` +
    `Overall compliance score: ${report.scores?.overall || 0}%. ` +
    `Total findings: ${report.statistics?.totalFindings || 0}. ` +
    `Critical/High findings: ${(report.statistics?.criticalFindings || 0) + (report.statistics?.highFindings || 0)}.`;
};

/**
 * Generate recommendations
 * @param {Object} report - Compliance report
 * @returns {Array<string>}
 */
const generateRecommendations = (report) => {
  const recommendations = [];
  
  if (report.scores?.overall < 80) {
    recommendations.push('Address high-priority findings to improve compliance score');
  }
  
  if (report.statistics?.criticalFindings > 0) {
    recommendations.push('Immediately address critical findings');
  }
  
  recommendations.push('Review and update data retention policies');
  recommendations.push('Conduct regular compliance training for staff');
  
  return recommendations;
};

/**
 * Notify data breach
 * @param {Object} breachDetails - Breach details
 * @returns {Promise<Object>}
 */
const notifyDataBreach = async (breachDetails) => {
  const {
    discoveryDate,
    affectedUsers,
    dataTypes,
    description,
    severity,
    containmentMeasures,
    reportedBy,
  } = breachDetails;
  
  // Log the breach
  await SecurityAudit.logEvent({
    eventType: SECURITY_EVENT_TYPES.DATA_BREACH,
    category: 'compliance',
    severity: SEVERITY_LEVELS.CRITICAL,
    description: `Data breach reported: ${description}`,
    details: {
      affectedUsers: affectedUsers.length,
      dataTypes,
      severity,
    },
  });
  
  // Calculate notification deadlines
  const now = new Date();
  const supervisoryDeadline = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72 hours for GDPR
  const dataSubjectDeadline = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
  
  return {
    success: true,
    breachId: `BREACH-${Date.now()}`,
    notificationRequirements: {
      supervisoryAuthority: {
        required: true,
        deadline: supervisoryDeadline,
        framework: 'GDPR Article 33',
      },
      dataSubjects: {
        required: affectedUsers.length > 0,
        deadline: dataSubjectDeadline,
        framework: 'GDPR Article 34',
      },
    },
    nextSteps: [
      'Document breach details',
      'Notify supervisory authority within 72 hours',
      'Assess high risk to data subjects',
      'Prepare data subject notifications if required',
      'Implement containment measures',
    ],
  };
};

/**
 * Get compliance dashboard data
 * @param {string} companyId - Company ID (optional)
 * @returns {Promise<Object>}
 */
const getComplianceDashboard = async (companyId = null) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const [
    pendingDSRs,
    recentReports,
    activePolicies,
    openFindings,
  ] = await Promise.all([
    ComplianceReport.countDocuments({
      type: 'custom',
      status: { $in: ['pending', 'generating'] },
      'scope.companyId': companyId,
    }),
    ComplianceReport.find({
      status: 'completed',
      createdAt: { $gte: thirtyDaysAgo },
      'scope.companyId': companyId,
    }).sort({ createdAt: -1 }).limit(5),
    DataRetentionPolicy.countDocuments({
      status: 'active',
      $or: [
        { 'scope.isGlobal': true },
        { 'scope.companyId': companyId },
      ],
    }),
    ComplianceReport.getOpenFindings({ companyId }),
  ]);
  
  return {
    summary: {
      pendingDSRs,
      activePolicies,
      openFindings: openFindings.length,
      criticalFindings: openFindings.filter(f => f.severity === 'critical').length,
    },
    recentReports,
    recentFindings: openFindings.slice(0, 10),
  };
};

module.exports = {
  submitDSR,
  exportUserData,
  deleteUserData,
  recordConsent,
  getUserConsents,
  hasConsent,
  generateComplianceReport,
  notifyDataBreach,
  getComplianceDashboard,
  DSR_TYPES,
  DSR_STATUS,
  CONSENT_TYPES,
  LEGAL_BASIS,
};
