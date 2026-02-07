/**
 * Data Protection Service
 * Handles PII encryption, data masking, and secure data handling
 * Implements GDPR compliance helpers and data anonymization
 */

const crypto = require('crypto');
const { dataProtection } = require('../config/security.js');

// Encryption key management
let encryptionKey = null;

/**
 * Initialize encryption key
 * In production, this should use a KMS or secure key management
 */
const initializeEncryptionKey = () => {
  if (encryptionKey) return encryptionKey;

  const keyEnv = process.env.ENCRYPTION_KEY;
  if (keyEnv) {
    // Use provided key (should be 32 bytes for AES-256)
    encryptionKey = Buffer.from(keyEnv, 'hex');
  } else {
    // Generate a temporary key (not recommended for production)
    console.warn('No ENCRYPTION_KEY provided, generating temporary key');
    encryptionKey = crypto.randomBytes(32);
  }

  return encryptionKey;
};

/**
 * Encrypt sensitive data
 * @param {string} text - Data to encrypt
 * @returns {string} Encrypted data (format: iv:authTag:ciphertext)
 */
const encrypt = (text) => {
  if (!text) return text;

  const key = initializeEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Return format: iv:authTag:ciphertext
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

/**
 * Decrypt sensitive data
 * @param {string} encryptedData - Encrypted data (format: iv:authTag:ciphertext)
 * @returns {string} Decrypted data
 */
const decrypt = (encryptedData) => {
  if (!encryptedData || !encryptedData.includes(':')) return encryptedData;

  try {
    const key = initializeEncryptionKey();
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error.message);
    return null;
  }
};

/**
 * Encrypt object fields
 * @param {Object} obj - Object to encrypt
 * @param {Array<string>} fields - Fields to encrypt
 * @returns {Object} Object with encrypted fields
 */
const encryptFields = (obj, fields = dataProtection.encryption.fields) => {
  if (!obj || typeof obj !== 'object') return obj;

  const encrypted = { ...obj };

  for (const field of fields) {
    if (encrypted[field] && typeof encrypted[field] === 'string') {
      encrypted[field] = encrypt(encrypted[field]);
      encrypted[`${field}Encrypted`] = true;
    }
  }

  return encrypted;
};

/**
 * Decrypt object fields
 * @param {Object} obj - Object to decrypt
 * @param {Array<string>} fields - Fields to decrypt
 * @returns {Object} Object with decrypted fields
 */
const decryptFields = (obj, fields = dataProtection.encryption.fields) => {
  if (!obj || typeof obj !== 'object') return obj;

  const decrypted = { ...obj };

  for (const field of fields) {
    if (decrypted[field] && decrypted[`${field}Encrypted`]) {
      const decryptedValue = decrypt(decrypted[field]);
      if (decryptedValue !== null) {
        decrypted[field] = decryptedValue;
        delete decrypted[`${field}Encrypted`];
      }
    }
  }

  return decrypted;
};

/**
 * Mask sensitive data
 * @param {string} value - Value to mask
 * @param {string} type - Type of data (email, phone, nrc, etc.)
 * @returns {string} Masked value
 */
const maskData = (value, type) => {
  if (!value || typeof value !== 'string') return value;

  const rules = dataProtection.masking.rules[type];
  if (!rules) return value;

  const { showFirst, showLast, mask } = rules;

  if (value.length <= showFirst + showLast) {
    return mask.repeat(value.length);
  }

  const first = value.slice(0, showFirst);
  const last = value.slice(-showLast);
  const middleLength = value.length - showFirst - showLast;

  return `${first}${mask.repeat(Math.min(middleLength, mask.length * 3))}${last}`;
};

/**
 * Mask object fields
 * @param {Object} obj - Object to mask
 * @param {Array<string>} fields - Fields to mask
 * @returns {Object} Object with masked fields
 */
const maskObjectFields = (obj, fields = Object.keys(dataProtection.masking.rules)) => {
  if (!obj || typeof obj !== 'object') return obj;

  const masked = { ...obj };

  for (const field of fields) {
    if (masked[field] && typeof masked[field] === 'string') {
      // Determine type from field name
      let type = field.toLowerCase();
      if (type.includes('email')) type = 'email';
      else if (type.includes('phone')) type = 'phone';
      else if (type.includes('nrc')) type = 'nrc';
      else if (type.includes('bank') || type.includes('account')) type = 'bankAccount';
      else if (type.includes('card')) type = 'creditCard';

      if (dataProtection.masking.rules[type]) {
        masked[field] = maskData(masked[field], type);
      }
    }
  }

  return masked;
};

/**
 * Mask sensitive fields in logs
 * @param {Object} obj - Object to sanitize for logging
 * @returns {Object} Sanitized object
 */
const sanitizeForLogging = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  const sensitiveFields = dataProtection.piiFields;
  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Check if field is sensitive
    const isSensitive = sensitiveFields.some(field =>
      lowerKey.includes(field.toLowerCase())
    );

    if (isSensitive && typeof value === 'string') {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLogging(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Hash data for pseudonymization
 * @param {string} data - Data to hash
 * @returns {string} SHA-256 hash
 */
const pseudonymize = (data) => {
  if (!data) return data;
  return crypto.createHash('sha256').update(String(data)).digest('hex');
};

/**
 * Anonymize user data for GDPR right to erasure
 * @param {Object} userData - User data to anonymize
 * @returns {Object} Anonymized data
 */
const anonymizeUserData = (userData) => {
  if (!userData || typeof userData !== 'object') return userData;

  const anonymized = { ...userData };
  const piiFields = dataProtection.piiFields;

  // Replace PII with anonymized values
  for (const field of piiFields) {
    if (anonymized[field]) {
      if (field === 'email') {
        anonymized[field] = `anonymized_${pseudonymize(anonymized.id || anonymized._id)}@deleted.local`;
      } else if (field === 'phone') {
        anonymized[field] = '00000000000';
      } else if (typeof anonymized[field] === 'string') {
        anonymized[field] = '[ANONYMIZED]';
      }
    }
  }

  // Mark as anonymized
  anonymized.anonymized = true;
  anonymized.anonymizedAt = new Date();

  return anonymized;
};

/**
 * Generate data export for GDPR data portability
 * @param {Object} userData - User data
 * @param {Object} relatedData - Related data (referrals, applications, etc.)
 * @returns {Object} Formatted export
 */
const generateDataExport = (userData, relatedData = {}) => {
  const exportData = {
    exportDate: new Date().toISOString(),
    format: 'JSON',
    version: '1.0',
    user: {
      id: userData._id || userData.id,
      email: userData.email,
      name: userData.name,
      phone: userData.phone,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
    },
    profile: {
      role: userData.role,
      companyId: userData.companyId,
      referrerProfile: userData.referrerProfile,
      jobSeekerProfile: userData.jobSeekerProfile,
    },
    activity: {
      lastLoginAt: userData.lastLoginAt,
      lastLoginLocation: userData.lastLoginLocation,
      loginCount: userData.loginCount,
    },
    ...relatedData,
  };

  return exportData;
};

/**
 * Check if data contains PII
 * @param {*} data - Data to check
 * @returns {boolean}
 */
const containsPII = (data) => {
  if (typeof data === 'string') {
    const piiPatterns = [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{16}\b/, // Credit card
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b09\d{7,9}\b/, // Myanmar phone
    ];

    return piiPatterns.some(pattern => pattern.test(data));
  }

  if (typeof data === 'object' && data !== null) {
    return Object.values(data).some(value => containsPII(value));
  }

  return false;
};

/**
 * Securely compare strings (timing-safe)
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean}
 */
const secureCompare = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

/**
 * Generate secure random token
 * @param {number} length - Token length in bytes
 * @returns {string} Hex-encoded token
 */
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Rotate encryption key
 * Re-encrypts all encrypted fields with new key
 * @param {Buffer} newKey - New encryption key
 * @returns {Promise<boolean>}
 */
const rotateEncryptionKey = async (newKey) => {
  // This would be implemented to re-encrypt all data
  // For now, just update the key
  encryptionKey = newKey;
  return true;
};

/**
 * Data retention policy check
 * @param {Date} createdAt - Creation date
 * @param {string} dataType - Type of data
 * @returns {boolean} True if data should be retained
 */
const shouldRetainData = (createdAt, dataType) => {
  const retentionDays = dataProtection.dataRetention[dataType];
  if (!retentionDays) return true;

  const retentionDate = new Date(createdAt);
  retentionDate.setDate(retentionDate.getDate() + retentionDays);

  return retentionDate > new Date();
};

module.exports = {
  encrypt,
  decrypt,
  encryptFields,
  decryptFields,
  maskData,
  maskObjectFields,
  sanitizeForLogging,
  pseudonymize,
  anonymizeUserData,
  generateDataExport,
  containsPII,
  secureCompare,
  generateSecureToken,
  rotateEncryptionKey,
  shouldRetainData,
};
