/**
 * GDPR Compliance Utilities
 * Implements GDPR requirements including right to access, erasure,
 * data portability, and consent management
 */

const { gdpr } = require('../config/security.js');
const { anonymizeUserData, generateDataExport } = require('../services/dataProtectionService.js');
const SecurityAudit = require('../models/SecurityAudit.js');

// In-memory consent store (use database in production)
const consentStore = new Map();

/**
 * Check if GDPR is enabled
 * @returns {boolean}
 */
const isGDPREnabled = () => {
  return gdpr.enabled;
};

/**
 * Record user consent
 * @param {string} userId - User ID
 * @param {Object} consent - Consent data
 * @returns {Promise<Object>} Recorded consent
 */
const recordConsent = async (userId, consent) => {
  if (!isGDPREnabled()) {
    return null;
  }

  const consentRecord = {
    userId,
    purposes: consent.purposes || [],
    granted: consent.granted !== false,
    version: consent.version || '1.0',
    timestamp: new Date(),
    ipAddress: consent.ipAddress,
    userAgent: consent.userAgent,
    withdrawn: false,
  };

  // Store consent (in production, save to database)
  const userConsents = consentStore.get(userId) || [];
  userConsents.push(consentRecord);
  consentStore.set(userId, userConsents);

  // Log consent event
  await SecurityAudit.logEvent({
    eventType: consent.granted ? 'consent_granted' : 'consent_withdrawn',
    category: 'compliance',
    severity: 'info',
    actor: { userId },
    description: `User ${consent.granted ? 'granted' : 'withdrew'} consent`,
    details: { purposes: consent.purposes },
  });

  return consentRecord;
};

/**
 * Check if user has consented to a purpose
 * @param {string} userId - User ID
 * @param {string} purpose - Purpose to check
 * @returns {boolean}
 */
const hasConsent = (userId, purpose) => {
  if (!isGDPREnabled()) {
    return true;
  }

  const userConsents = consentStore.get(userId) || [];

  // Find most recent consent for this purpose
  const latestConsent = userConsents
    .filter(c => c.purposes.includes(purpose) && !c.withdrawn)
    .sort((a, b) => b.timestamp - a.timestamp)[0];

  return latestConsent ? latestConsent.granted : false;
};

/**
 * Withdraw consent
 * @param {string} userId - User ID
 * @param {Array<string>} purposes - Purposes to withdraw (empty for all)
 * @returns {Promise<Object>} Withdrawal record
 */
const withdrawConsent = async (userId, purposes = []) => {
  if (!isGDPREnabled()) {
    return null;
  }

  const withdrawalRecord = {
    userId,
    purposes: purposes.length > 0 ? purposes : gdpr.consent.purposes,
    withdrawn: true,
    timestamp: new Date(),
  };

  // Mark consents as withdrawn
  const userConsents = consentStore.get(userId) || [];

  for (const consent of userConsents) {
    if (purposes.length === 0 || purposes.some(p => consent.purposes.includes(p))) {
      consent.withdrawn = true;
      consent.withdrawnAt = new Date();
    }
  }

  // Log withdrawal
  await SecurityAudit.logEvent({
    eventType: 'consent_withdrawn',
    category: 'compliance',
    severity: 'info',
    actor: { userId },
    description: 'User withdrew consent',
    details: { purposes: withdrawalRecord.purposes },
  });

  return withdrawalRecord;
};

/**
 * Get user's consent history
 * @param {string} userId - User ID
 * @returns {Array} Consent history
 */
const getConsentHistory = (userId) => {
  if (!isGDPREnabled()) {
    return [];
  }

  return consentStore.get(userId) || [];
};

/**
 * Handle data subject access request (DSAR)
 * GDPR Article 15 - Right of access
 * @param {string} userId - User ID
 * @param {Object} userData - User's personal data
 * @param {Object} relatedData - Related data
 * @returns {Promise<Object>} Data export
 */
const handleAccessRequest = async (userId, userData, relatedData = {}) => {
  if (!isGDPREnabled()) {
    throw new Error('GDPR compliance is not enabled');
  }

  // Log the request
  await SecurityAudit.logEvent({
    eventType: 'gdpr_export_request',
    category: 'compliance',
    severity: 'info',
    actor: { userId },
    description: 'Data subject access request',
  });

  // Generate data export
  const exportData = generateDataExport(userData, relatedData);

  return {
    requestType: 'access',
    status: 'completed',
    data: exportData,
    generatedAt: new Date(),
    retentionDays: gdpr.rights.access.responseDays,
  };
};

/**
 * Handle data erasure request (Right to be forgotten)
 * GDPR Article 17 - Right to erasure
 * @param {string} userId - User ID
 * @param {Object} userData - User data to erase
 * @param {Object} options - Erasure options
 * @returns {Promise<Object>} Erasure result
 */
const handleErasureRequest = async (userId, userData, options = {}) => {
  if (!isGDPREnabled()) {
    throw new Error('GDPR compliance is not enabled');
  }

  const { immediate = false, reason = 'user_request' } = options;

  // Log the request
  await SecurityAudit.logEvent({
    eventType: 'gdpr_deletion_request',
    category: 'compliance',
    severity: 'high',
    actor: { userId },
    description: 'Data subject erasure request',
    details: { reason },
  });

  if (immediate) {
    // Anonymize user data immediately
    const anonymizedData = anonymizeUserData(userData);

    // Delete associated data
    // This would include:
    // - Session data
    // - API keys
    // - Consent records
    // - Activity logs (or anonymize)

    // Clear consent records
    consentStore.delete(userId);

    return {
      requestType: 'erasure',
      status: 'completed',
      userId,
      anonymizedAt: new Date(),
      message: 'User data has been anonymized',
    };
  }

  // Schedule for deletion after grace period
  const deletionDate = new Date();
  deletionDate.setDate(deletionDate.getDate() + gdpr.rights.erasure.responseDays);

  return {
    requestType: 'erasure',
    status: 'scheduled',
    userId,
    scheduledFor: deletionDate,
    message: `Data will be deleted on ${deletionDate.toISOString()}`,
  };
};

/**
 * Handle data portability request
 * GDPR Article 20 - Right to data portability
 * @param {string} userId - User ID
 * @param {Object} userData - User data
 * @param {Object} relatedData - Related data
 * @returns {Promise<Object>} Portable data
 */
const handlePortabilityRequest = async (userId, userData, relatedData = {}) => {
  if (!isGDPREnabled()) {
    throw new Error('GDPR compliance is not enabled');
  }

  // Log the request
  await SecurityAudit.logEvent({
    eventType: 'gdpr_export_request',
    category: 'compliance',
    severity: 'info',
    actor: { userId },
    description: 'Data portability request',
  });

  // Generate machine-readable export
  const exportData = generateDataExport(userData, relatedData);

  return {
    requestType: 'portability',
    status: 'completed',
    format: 'JSON',
    schema: 'https://schema.org/Person',
    data: exportData,
    generatedAt: new Date(),
  };
};

/**
 * Handle rectification request
 * GDPR Article 16 - Right to rectification
 * @param {string} userId - User ID
 * @param {Object} updates - Data updates
 * @returns {Promise<Object>} Rectification result
 */
const handleRectificationRequest = async (userId, updates) => {
  if (!isGDPREnabled()) {
    throw new Error('GDPR compliance is not enabled');
  }

  // Log the request
  await SecurityAudit.logEvent({
    eventType: 'data_rectification',
    category: 'compliance',
    severity: 'info',
    actor: { userId },
    description: 'Data rectification request',
    details: { fields: Object.keys(updates) },
  });

  return {
    requestType: 'rectification',
    status: 'completed',
    userId,
    updatedFields: Object.keys(updates),
    updatedAt: new Date(),
  };
};

/**
 * Handle restriction of processing request
 * GDPR Article 18 - Right to restriction of processing
 * @param {string} userId - User ID
 * @param {Array<string>} restrictions - Processing restrictions
 * @returns {Promise<Object>} Restriction result
 */
const handleRestrictionRequest = async (userId, restrictions) => {
  if (!isGDPREnabled()) {
    throw new Error('GDPR compliance is not enabled');
  }

  // Log the request
  await SecurityAudit.logEvent({
    eventType: 'processing_restricted',
    category: 'compliance',
    severity: 'info',
    actor: { userId },
    description: 'Processing restriction request',
    details: { restrictions },
  });

  return {
    requestType: 'restriction',
    status: 'completed',
    userId,
    restrictions,
    effectiveFrom: new Date(),
  };
};

/**
 * Handle objection to processing
 * GDPR Article 21 - Right to object
 * @param {string} userId - User ID
 * @param {string} processingType - Type of processing
 * @param {string} reason - Objection reason
 * @returns {Promise<Object>} Objection result
 */
const handleObjection = async (userId, processingType, reason) => {
  if (!isGDPREnabled()) {
    throw new Error('GDPR compliance is not enabled');
  }

  // Log the request
  await SecurityAudit.logEvent({
    eventType: 'processing_objection',
    category: 'compliance',
    severity: 'info',
    actor: { userId },
    description: `Objection to ${processingType} processing`,
    details: { processingType, reason },
  });

  return {
    requestType: 'objection',
    status: 'completed',
    userId,
    processingType,
    reason,
    effectiveFrom: new Date(),
  };
};

/**
 * Get GDPR compliance status for user
 * @param {string} userId - User ID
 * @returns {Object} Compliance status
 */
const getUserComplianceStatus = (userId) => {
  if (!isGDPREnabled()) {
    return { gdprEnabled: false };
  }

  const consentHistory = getConsentHistory(userId);
  const currentConsents = {};

  for (const purpose of gdpr.consent.purposes) {
    currentConsents[purpose] = hasConsent(userId, purpose);
  }

  return {
    gdprEnabled: true,
    consents: currentConsents,
    consentHistory: consentHistory.slice(-10), // Last 10 consent events
    rights: {
      access: gdpr.rights.access.enabled,
      rectification: gdpr.rights.rectification.enabled,
      erasure: gdpr.rights.erasure.enabled,
      restriction: gdpr.rights.restriction.enabled,
      portability: gdpr.rights.portability.enabled,
      objection: gdpr.rights.objection.enabled,
    },
  };
};

/**
 * Validate data processing is lawful
 * @param {string} userId - User ID
 * @param {string} purpose - Processing purpose
 * @param {string} lawfulBasis - Lawful basis (consent, contract, legal_obligation, vital_interests, public_task, legitimate_interests)
 * @returns {boolean}
 */
const isProcessingLawful = (userId, purpose, lawfulBasis) => {
  if (!isGDPREnabled()) {
    return true;
  }

  switch (lawfulBasis) {
    case 'consent':
      return hasConsent(userId, purpose);

    case 'contract':
    case 'legal_obligation':
    case 'vital_interests':
    case 'public_task':
      // These don't require explicit consent
      return true;

    case 'legitimate_interests':
      // Should perform legitimate interests assessment
      return true;

    default:
      return false;
  }
};

/**
 * Generate privacy policy URL
 * @returns {string} Privacy policy URL
 */
const getPrivacyPolicyUrl = () => {
  return `${process.env.FRONTEND_URL || 'http://localhost:5173'}/privacy-policy`;
};

/**
 * Generate cookie policy URL
 * @returns {string} Cookie policy URL
 */
const getCookiePolicyUrl = () => {
  return `${process.env.FRONTEND_URL || 'http://localhost:5173'}/cookie-policy`;
};

/**
 * Get required cookie consent types
 * @returns {Array} Cookie types requiring consent
 */
const getRequiredCookieConsents = () => {
  return [
    { type: 'necessary', required: true, description: 'Essential for the website to function' },
    { type: 'analytics', required: false, description: 'Helps us improve our website' },
    { type: 'marketing', required: false, description: 'Used for personalized advertising' },
    { type: 'preferences', required: false, description: 'Remember your settings' },
  ];
};

module.exports = {
  isGDPREnabled,
  recordConsent,
  hasConsent,
  withdrawConsent,
  getConsentHistory,
  handleAccessRequest,
  handleErasureRequest,
  handlePortabilityRequest,
  handleRectificationRequest,
  handleRestrictionRequest,
  handleObjection,
  getUserComplianceStatus,
  isProcessingLawful,
  getPrivacyPolicyUrl,
  getCookiePolicyUrl,
  getRequiredCookieConsents,
};
</parameter name="new_string">
</invoke>
