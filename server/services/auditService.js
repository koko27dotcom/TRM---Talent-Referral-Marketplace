/**
 * Audit Service
 * Enhanced audit logging for security and compliance
 * Integrates with existing AuditLog model and adds security-specific logging
 */

const AuditLog = require('../models/AuditLog.js');
const { AUDIT_ACTIONS, ENTITY_TYPES } = require('../models/AuditLog.js');
const { SecurityAudit, SECURITY_EVENT_TYPES, SEVERITY_LEVELS } = require('../models/SecurityAudit.js');

// Audit configuration
const AUDIT_CONFIG = {
  // Actions that should always be logged
  criticalActions: [
    AUDIT_ACTIONS.LOGIN,
    AUDIT_ACTIONS.LOGIN_FAILED,
    AUDIT_ACTIONS.PASSWORD_CHANGED,
    AUDIT_ACTIONS.PASSWORD_RESET,
    AUDIT_ACTIONS.USER_CREATED,
    AUDIT_ACTIONS.USER_DELETED,
    AUDIT_ACTIONS.PERMISSION_DENIED,
  ],
  // Entity types that require detailed logging
  sensitiveEntities: [
    ENTITY_TYPES.USER,
    ENTITY_TYPES.COMPANY,
    ENTITY_TYPES.BILLING_RECORD,
    ENTITY_TYPES.PAYOUT_REQUEST,
  ],
  // Maximum log retention in days (configurable per environment)
  retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS) || 365,
};

/**
 * Log a user action
 * @param {Object} options - Logging options
 * @returns {Promise<Object>}
 */
const logAction = async (options) => {
  const {
    user,
    action,
    entityType,
    entityId,
    entityName,
    changes,
    description,
    req,
    companyId,
    severity = 'info',
    metadata = {},
  } = options;
  
  try {
    const logEntry = await AuditLog.logUserAction({
      user,
      action,
      entityType,
      entityId,
      entityName,
      changes,
      description,
      req,
      companyId,
      severity,
    });
    
    // Also log to SecurityAudit if it's a security-related action
    if (isSecurityAction(action)) {
      await SecurityAudit.logEvent({
        eventType: mapToSecurityEventType(action),
        category: getActionCategory(action),
        severity: mapSeverity(severity),
        actor: {
          userId: user?._id,
          userType: user?.role || 'anonymous',
          email: user?.email,
          name: user?.name,
          companyId,
        },
        target: {
          entityType,
          entityId,
          entityName,
        },
        request: req ? {
          ipAddress: req.ip,
          userAgent: req.headers?.['user-agent'],
          method: req.method,
          path: req.originalUrl,
        } : undefined,
        description: description || `${action} on ${entityType}`,
        details: { ...metadata, changes },
      });
    }
    
    return logEntry;
  } catch (error) {
    console.error('Audit logging error:', error);
    // Don't throw - audit failures shouldn't break the application
    return null;
  }
};

/**
 * Log data access
 * @param {Object} options - Access logging options
 * @returns {Promise<Object>}
 */
const logDataAccess = async (options) => {
  const {
    user,
    entityType,
    entityId,
    accessType, // 'read', 'write', 'delete'
    fields, // Array of fields accessed
    req,
    companyId,
  } = options;
  
  const description = `${accessType.toUpperCase()} access to ${entityType}`;
  
  return logAction({
    user,
    action: `data_${accessType}`,
    entityType,
    entityId,
    description,
    req,
    companyId,
    severity: accessType === 'delete' ? 'warning' : 'info',
    metadata: { fields, accessType },
  });
};

/**
 * Log authentication event
 * @param {Object} options - Auth logging options
 * @returns {Promise<Object>}
 */
const logAuth = async (options) => {
  const {
    event,
    user,
    success,
    failureReason,
    req,
    metadata = {},
  } = options;
  
  const action = success ? event : `${event}_failed`;
  const severity = success ? 'info' : 'warning';
  
  // Log to AuditLog
  await logAction({
    user,
    action,
    entityType: ENTITY_TYPES.USER,
    entityId: user?._id,
    description: success 
      ? `${event} successful` 
      : `${event} failed: ${failureReason}`,
    req,
    severity,
    metadata: { success, failureReason, ...metadata },
  });
  
  // Log to SecurityAudit
  const securityEventType = success 
    ? SECURITY_EVENT_TYPES.LOGIN_SUCCESS 
    : SECURITY_EVENT_TYPES.LOGIN_FAILED;
  
  await SecurityAudit.logAuth({
    eventType: securityEventType,
    user,
    req,
    success,
    failureReason,
    metadata,
  });
};

/**
 * Log permission denied
 * @param {Object} options - Permission denied options
 * @returns {Promise<Object>}
 */
const logPermissionDenied = async (options) => {
  const {
    user,
    resource,
    requiredPermission,
    req,
  } = options;
  
  await logAction({
    user,
    action: AUDIT_ACTIONS.PERMISSION_DENIED,
    entityType: resource?.type || ENTITY_TYPES.SYSTEM,
    entityId: resource?.id,
    description: `Permission denied: ${requiredPermission}`,
    req,
    severity: 'warning',
    metadata: { requiredPermission, resource },
  });
  
  await SecurityAudit.logAccess({
    eventType: SECURITY_EVENT_TYPES.ACCESS_DENIED,
    user,
    resource,
    req,
    denied: true,
    reason: `Missing permission: ${requiredPermission}`,
  });
};

/**
 * Log API access
 * @param {Object} options - API access options
 * @returns {Promise<Object>}
 */
const logApiAccess = async (options) => {
  const {
    apiKey,
    endpoint,
    method,
    statusCode,
    responseTime,
    ipAddress,
  } = options;
  
  return AuditLog.log({
    action: 'api_access',
    actionCategory: 'api',
    entityType: ENTITY_TYPES.SYSTEM,
    description: `API ${method} ${endpoint} - ${statusCode}`,
    ipAddress,
    metadata: {
      apiKeyId: apiKey?._id,
      endpoint,
      method,
      statusCode,
      responseTime,
    },
    severity: statusCode >= 400 ? 'warning' : 'info',
  });
};

/**
 * Log data export
 * @param {Object} options - Export options
 * @returns {Promise<Object>}
 */
const logDataExport = async (options) => {
  const {
    user,
    exportType,
    entityType,
    recordCount,
    format,
    req,
  } = options;
  
  await logAction({
    user,
    action: AUDIT_ACTIONS.EXPORT_GENERATED,
    entityType,
    description: `Data export: ${exportType} (${recordCount} records)`,
    req,
    severity: 'info',
    metadata: { exportType, recordCount, format },
  });
  
  await SecurityAudit.logEvent({
    eventType: SECURITY_EVENT_TYPES.DATA_EXPORT,
    category: 'data_access',
    severity: SEVERITY_LEVELS.INFO,
    actor: { userId: user?._id, email: user?.email },
    description: `Data export performed: ${exportType}`,
    details: { exportType, recordCount, format },
  });
};

/**
 * Log bulk action
 * @param {Object} options - Bulk action options
 * @returns {Promise<Object>}
 */
const logBulkAction = async (options) => {
  const {
    user,
    action,
    entityType,
    affectedCount,
    criteria,
    req,
  } = options;
  
  return logAction({
    user,
    action: AUDIT_ACTIONS.BULK_ACTION,
    entityType,
    description: `Bulk ${action} on ${affectedCount} ${entityType}(s)`,
    req,
    severity: 'warning',
    metadata: { action, affectedCount, criteria },
  });
};

/**
 * Get audit trail for an entity
 * @param {string} entityType - Entity type
 * @param {string} entityId - Entity ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
const getEntityAuditTrail = async (entityType, entityId, options = {}) => {
  return AuditLog.findByEntity(entityType, entityId, options);
};

/**
 * Get user activity log
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
const getUserActivityLog = async (userId, options = {}) => {
  return AuditLog.findByUser(userId, options);
};

/**
 * Get company audit log
 * @param {string} companyId - Company ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
const getCompanyAuditLog = async (companyId, options = {}) => {
  return AuditLog.findByCompany(companyId, options);
};

/**
 * Search audit logs
 * @param {string} searchTerm - Search term
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
const searchAuditLogs = async (searchTerm, options = {}) => {
  return AuditLog.search(searchTerm, options);
};

/**
 * Get audit statistics
 * @param {Object} filters - Date filters
 * @returns {Promise<Object>}
 */
const getAuditStats = async (filters = {}) => {
  return AuditLog.getStats(filters);
};

/**
 * Get security events
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
const getSecurityEvents = async (options = {}) => {
  return SecurityAudit.findSuspicious(options);
};

/**
 * Get combined audit and security log
 * @param {Object} options - Query options
 * @returns {Promise<Object>}
 */
const getCombinedLog = async (options = {}) => {
  const { userId, companyId, startDate, endDate, limit = 100 } = options;
  
  // Get audit logs
  const auditQuery = {};
  if (userId) auditQuery.userId = userId;
  if (companyId) auditQuery.companyId = companyId;
  if (startDate || endDate) {
    auditQuery.createdAt = {};
    if (startDate) auditQuery.createdAt.$gte = startDate;
    if (endDate) auditQuery.createdAt.$lte = endDate;
  }
  
  const auditLogs = await AuditLog.find(auditQuery)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  
  // Get security events
  const securityQuery = {};
  if (userId) securityQuery['actor.userId'] = userId;
  if (companyId) securityQuery['actor.companyId'] = companyId;
  if (startDate || endDate) {
    securityQuery.createdAt = {};
    if (startDate) securityQuery.createdAt.$gte = startDate;
    if (endDate) securityQuery.createdAt.$lte = endDate;
  }
  
  const securityEvents = await SecurityAudit.find(securityQuery)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  
  // Combine and sort
  const combined = [
    ...auditLogs.map(log => ({ ...log, source: 'audit' })),
    ...securityEvents.map(event => ({ ...event, source: 'security' })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  return combined.slice(0, limit);
};

/**
 * Check if action is security-related
 * @param {string} action - Action name
 * @returns {boolean}
 */
const isSecurityAction = (action) => {
  const securityActions = [
    AUDIT_ACTIONS.LOGIN,
    AUDIT_ACTIONS.LOGIN_FAILED,
    AUDIT_ACTIONS.LOGOUT,
    AUDIT_ACTIONS.PASSWORD_CHANGED,
    AUDIT_ACTIONS.PASSWORD_RESET,
    AUDIT_ACTIONS.USER_CREATED,
    AUDIT_ACTIONS.USER_DELETED,
    AUDIT_ACTIONS.USER_SUSPENDED,
    AUDIT_ACTIONS.PERMISSION_DENIED,
  ];
  
  return securityActions.includes(action);
};

/**
 * Map audit action to security event type
 * @param {string} action - Audit action
 * @returns {string}
 */
const mapToSecurityEventType = (action) => {
  const mapping = {
    [AUDIT_ACTIONS.LOGIN]: SECURITY_EVENT_TYPES.LOGIN_SUCCESS,
    [AUDIT_ACTIONS.LOGIN_FAILED]: SECURITY_EVENT_TYPES.LOGIN_FAILED,
    [AUDIT_ACTIONS.LOGOUT]: SECURITY_EVENT_TYPES.LOGOUT,
    [AUDIT_ACTIONS.PASSWORD_CHANGED]: SECURITY_EVENT_TYPES.PASSWORD_CHANGED,
    [AUDIT_ACTIONS.PASSWORD_RESET]: SECURITY_EVENT_TYPES.PASSWORD_RESET_COMPLETED,
    [AUDIT_ACTIONS.PERMISSION_DENIED]: SECURITY_EVENT_TYPES.ACCESS_DENIED,
  };
  
  return mapping[action] || SECURITY_EVENT_TYPES.SYSTEM_ALERT;
};

/**
 * Get action category
 * @param {string} action - Action name
 * @returns {string}
 */
const getActionCategory = (action) => {
  if (action.includes('login') || action.includes('logout') || action.includes('password')) {
    return 'authentication';
  }
  if (action.includes('permission') || action.includes('access')) {
    return 'authorization';
  }
  if (action.includes('user') || action.includes('company')) {
    return 'data_access';
  }
  return 'system';
};

/**
 * Map severity level
 * @param {string} severity - Audit severity
 * @returns {string}
 */
const mapSeverity = (severity) => {
  const mapping = {
    'info': SEVERITY_LEVELS.INFO,
    'warning': SEVERITY_LEVELS.MEDIUM,
    'error': SEVERITY_LEVELS.HIGH,
    'critical': SEVERITY_LEVELS.CRITICAL,
  };
  
  return mapping[severity] || SEVERITY_LEVELS.INFO;
};

/**
 * Purge old audit logs
 * @param {number} days - Days to retain
 * @returns {Promise<Object>}
 */
const purgeOldLogs = async (days = AUDIT_CONFIG.retentionDays) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const auditResult = await AuditLog.deleteMany({
    createdAt: { $lt: cutoffDate },
    severity: { $nin: ['error', 'critical'] },
  });
  
  const securityResult = await SecurityAudit.deleteMany({
    createdAt: { $lt: cutoffDate },
    severity: { $nin: [SEVERITY_LEVELS.HIGH, SEVERITY_LEVELS.CRITICAL] },
  });
  
  return {
    auditLogsDeleted: auditResult.deletedCount,
    securityEventsDeleted: securityResult.deletedCount,
    cutoffDate,
  };
};

/**
 * Export audit logs
 * @param {Object} filters - Export filters
 * @returns {Promise<Object>}
 */
const exportAuditLogs = async (filters = {}) => {
  const { startDate, endDate, entityType, userId } = filters;
  
  const query = {};
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) query.createdAt.$lte = endDate;
  }
  if (entityType) query.entityType = entityType;
  if (userId) query.userId = userId;
  
  const logs = await AuditLog.find(query)
    .sort({ createdAt: -1 })
    .lean();
  
  return {
    exportDate: new Date().toISOString(),
    recordCount: logs.length,
    filters,
    logs,
  };
};

module.exports = {
  logAction,
  logDataAccess,
  logAuth,
  logPermissionDenied,
  logApiAccess,
  logDataExport,
  logBulkAction,
  getEntityAuditTrail,
  getUserActivityLog,
  getCompanyAuditLog,
  searchAuditLogs,
  getAuditStats,
  getSecurityEvents,
  getCombinedLog,
  purgeOldLogs,
  exportAuditLogs,
};
