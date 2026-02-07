/**
 * Encryption Service
 * Handles data encryption/decryption using AES-256
 * Supports field-level encryption for PII and key rotation
 */

const crypto = require('crypto');
const { EncryptionKey, KEY_TYPES, KEY_STATUS } = require('../models/EncryptionKey.js');

// Encryption configuration
const ENCRYPTION_CONFIG = {
  algorithm: 'aes-256-gcm',
  ivLength: 16,
  authTagLength: 16,
  keyLength: 32,
};

// Master key from environment (in production, use KMS/HSM)
const MASTER_KEY = process.env.ENCRYPTION_MASTER_KEY || crypto.randomBytes(32).toString('hex');

/**
 * Derive encryption key from master key
 * @param {string} salt - Salt for key derivation
 * @returns {Buffer}
 */
const deriveKey = (salt) => {
  return crypto.pbkdf2Sync(MASTER_KEY, salt, 100000, ENCRYPTION_CONFIG.keyLength, 'sha256');
};

/**
 * Generate random IV
 * @returns {Buffer}
 */
const generateIV = () => {
  return crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);
};

/**
 * Encrypt data using AES-256-GCM
 * @param {string} data - Data to encrypt
 * @param {string} keyId - Encryption key ID (optional)
 * @returns {Object} Encrypted data with metadata
 */
const encrypt = async (data, keyId = null) => {
  try {
    if (!data) return null;
    
    // Get or create encryption key
    let key;
    if (keyId) {
      key = await EncryptionKey.findOne({ keyId });
    } else {
      key = await EncryptionKey.getActiveKey(KEY_TYPES.DATA_ENCRYPTION);
    }
    
    if (!key) {
      // Create default key if none exists
      key = await EncryptionKey.createKey({
        keyType: KEY_TYPES.DATA_ENCRYPTION,
        algorithm: ENCRYPTION_CONFIG.algorithm,
        keySize: 256,
        usage: 'encrypt_decrypt',
        keyMaterial: {
          encryptedKey: crypto.randomBytes(32).toString('base64'),
          iv: generateIV().toString('base64'),
          wrappedBy: 'master-key',
        },
        fingerprint: crypto.randomBytes(16).toString('hex'),
        createdBy: null, // System generated
      });
    }
    
    // Generate IV
    const iv = generateIV();
    
    // Derive encryption key
    const salt = crypto.randomBytes(16);
    const derivedKey = deriveKey(salt);
    
    // Create cipher
    const cipher = crypto.createCipheriv(
      ENCRYPTION_CONFIG.algorithm,
      derivedKey,
      iv,
      { authTagLength: ENCRYPTION_CONFIG.authTagLength }
    );
    
    // Encrypt data
    let encrypted = cipher.update(String(data), 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Get authentication tag
    const authTag = cipher.getAuthTag();
    
    // Record usage
    await key.recordEncrypt();
    
    return {
      encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      salt: salt.toString('base64'),
      keyId: key.keyId,
      algorithm: ENCRYPTION_CONFIG.algorithm,
      version: key.version,
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt data using AES-256-GCM
 * @param {Object} encryptedData - Encrypted data object
 * @returns {string} Decrypted data
 */
const decrypt = async (encryptedData) => {
  try {
    if (!encryptedData || !encryptedData.encrypted) return null;
    
    const { encrypted, iv, authTag, salt, keyId } = encryptedData;
    
    // Get encryption key
    const key = await EncryptionKey.findOne({ keyId });
    if (!key) {
      throw new Error('Encryption key not found');
    }
    
    // Check key status
    if (key.status === KEY_STATUS.REVOKED || key.status === KEY_STATUS.COMPROMISED) {
      throw new Error('Encryption key is no longer valid');
    }
    
    // Derive key
    const derivedKey = deriveKey(Buffer.from(salt, 'base64'));
    
    // Create decipher
    const decipher = crypto.createDecipheriv(
      ENCRYPTION_CONFIG.algorithm,
      derivedKey,
      Buffer.from(iv, 'base64'),
      { authTagLength: ENCRYPTION_CONFIG.authTagLength }
    );
    
    // Set auth tag
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));
    
    // Decrypt
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    // Record usage
    await key.recordDecrypt();
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};

/**
 * Encrypt a specific field in an object
 * @param {Object} obj - Object containing field to encrypt
 * @param {string} fieldPath - Path to field (e.g., 'user.email')
 * @param {string} keyId - Encryption key ID
 * @returns {Object} Object with encrypted field
 */
const encryptField = async (obj, fieldPath, keyId = null) => {
  const keys = fieldPath.split('.');
  let current = obj;
  
  // Navigate to parent of target field
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) return obj;
    current = current[keys[i]];
  }
  
  const targetKey = keys[keys.length - 1];
  
  if (current[targetKey] !== undefined && current[targetKey] !== null) {
    const encrypted = await encrypt(current[targetKey], keyId);
    current[targetKey] = {
      __encrypted: true,
      ...encrypted,
    };
  }
  
  return obj;
};

/**
 * Decrypt a specific field in an object
 * @param {Object} obj - Object containing encrypted field
 * @param {string} fieldPath - Path to field
 * @returns {Object} Object with decrypted field
 */
const decryptField = async (obj, fieldPath) => {
  const keys = fieldPath.split('.');
  let current = obj;
  
  // Navigate to parent of target field
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) return obj;
    current = current[keys[i]];
  }
  
  const targetKey = keys[keys.length - 1];
  
  if (current[targetKey] && current[targetKey].__encrypted) {
    const decrypted = await decrypt(current[targetKey]);
    current[targetKey] = decrypted;
  }
  
  return obj;
};

/**
 * Encrypt multiple fields in an object
 * @param {Object} obj - Object to encrypt
 * @param {Array<string>} fields - Array of field paths
 * @param {string} keyId - Encryption key ID
 * @returns {Object} Object with encrypted fields
 */
const encryptFields = async (obj, fields, keyId = null) => {
  let result = { ...obj };
  
  for (const field of fields) {
    result = await encryptField(result, field, keyId);
  }
  
  return result;
};

/**
 * Decrypt multiple fields in an object
 * @param {Object} obj - Object with encrypted fields
 * @param {Array<string>} fields - Array of field paths
 * @returns {Object} Object with decrypted fields
 */
const decryptFields = async (obj, fields) => {
  let result = { ...obj };
  
  for (const field of fields) {
    result = await decryptField(result, field);
  }
  
  return result;
};

/**
 * Hash data using SHA-256 (one-way)
 * @param {string} data - Data to hash
 * @returns {string} Hashed value
 */
const hash = (data) => {
  return crypto.createHash('sha256').update(String(data)).digest('hex');
};

/**
 * Hash data with salt
 * @param {string} data - Data to hash
 * @param {string} salt - Salt value
 * @returns {string} Hashed value
 */
const hashWithSalt = (data, salt) => {
  return crypto.pbkdf2Sync(String(data), salt, 100000, 64, 'sha512').toString('hex');
};

/**
 * Generate secure random string
 * @param {number} length - Length of string
 * @returns {string}
 */
const generateRandomString = (length = 32) => {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
};

/**
 * Generate UUID v4
 * @returns {string}
 */
const generateUUID = () => {
  return crypto.randomUUID();
};

/**
 * Compare data with hash (timing-safe)
 * @param {string} data - Original data
 * @param {string} hash - Hash to compare
 * @param {string} salt - Salt used for hashing
 * @returns {boolean}
 */
const compareHash = (data, hash, salt) => {
  const computedHash = hashWithSalt(data, salt);
  return crypto.timingSafeEqual(
    Buffer.from(computedHash),
    Buffer.from(hash)
  );
};

/**
 * Encrypt file content
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} keyId - Encryption key ID
 * @returns {Object} Encrypted file data
 */
const encryptFile = async (fileBuffer, keyId = null) => {
  try {
    const key = keyId 
      ? await EncryptionKey.findOne({ keyId })
      : await EncryptionKey.getActiveKey(KEY_TYPES.FILE_ENCRYPTION);
    
    if (!key) {
      throw new Error('Encryption key not found');
    }
    
    const iv = generateIV();
    const salt = crypto.randomBytes(16);
    const derivedKey = deriveKey(salt);
    
    const cipher = crypto.createCipheriv(
      ENCRYPTION_CONFIG.algorithm,
      derivedKey,
      iv,
      { authTagLength: ENCRYPTION_CONFIG.authTagLength }
    );
    
    const encrypted = Buffer.concat([
      cipher.update(fileBuffer),
      cipher.final(),
    ]);
    
    const authTag = cipher.getAuthTag();
    
    await key.recordEncrypt();
    
    return {
      data: encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      salt: salt.toString('base64'),
      keyId: key.keyId,
      originalName: null, // Set by caller
      mimeType: null, // Set by caller
    };
  } catch (error) {
    console.error('File encryption error:', error);
    throw new Error('Failed to encrypt file');
  }
};

/**
 * Decrypt file content
 * @param {Object} encryptedFile - Encrypted file object
 * @returns {Buffer} Decrypted file buffer
 */
const decryptFile = async (encryptedFile) => {
  try {
    const { data, iv, authTag, salt, keyId } = encryptedFile;
    
    const key = await EncryptionKey.findOne({ keyId });
    if (!key) {
      throw new Error('Encryption key not found');
    }
    
    const derivedKey = deriveKey(Buffer.from(salt, 'base64'));
    
    const decipher = crypto.createDecipheriv(
      ENCRYPTION_CONFIG.algorithm,
      derivedKey,
      Buffer.from(iv, 'base64'),
      { authTagLength: ENCRYPTION_CONFIG.authTagLength }
    );
    
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));
    
    const decrypted = Buffer.concat([
      decipher.update(data),
      decipher.final(),
    ]);
    
    await key.recordDecrypt();
    
    return decrypted;
  } catch (error) {
    console.error('File decryption error:', error);
    throw new Error('Failed to decrypt file');
  }
};

/**
 * Rotate encryption key and re-encrypt data
 * @param {string} oldKeyId - Old key ID
 * @param {string} userId - User performing rotation
 * @returns {Promise<Object>} New key
 */
const rotateKey = async (oldKeyId, userId) => {
  try {
    const newKey = await EncryptionKey.rotateKey(oldKeyId, userId, 'Scheduled key rotation');
    return newKey;
  } catch (error) {
    console.error('Key rotation error:', error);
    throw new Error('Failed to rotate encryption key');
  }
};

/**
 * Get encryption statistics
 * @returns {Promise<Object>}
 */
const getEncryptionStats = async () => {
  const keys = await EncryptionKey.find();
  
  return {
    totalKeys: keys.length,
    activeKeys: keys.filter(k => k.status === KEY_STATUS.ACTIVE).length,
    keysNeedingRotation: keys.filter(k => k.needsRotation).length,
    totalEncryptions: keys.reduce((sum, k) => sum + (k.usage?.encryptCount || 0), 0),
    totalDecryptions: keys.reduce((sum, k) => sum + (k.usage?.decryptCount || 0), 0),
    byType: keys.reduce((acc, k) => {
      acc[k.keyType] = (acc[k.keyType] || 0) + 1;
      return acc;
    }, {}),
  };
};

/**
 * PII fields configuration for automatic encryption
 */
const PII_FIELDS = {
  User: [
    'email',
    'phone',
    'name',
    'referrerProfile.paymentMethods.accountNumber',
    'referrerProfile.paymentMethods.accountName',
  ],
  Company: [
    'email',
    'phone',
    'billingEmail',
    'taxId',
  ],
  Referral: [
    'candidateEmail',
    'candidatePhone',
    'candidateName',
  ],
  Application: [
    'email',
    'phone',
    'name',
    'resumeUrl',
  ],
  PayoutRequest: [
    'paymentDetails.accountNumber',
    'paymentDetails.accountName',
  ],
};

/**
 * Automatically encrypt PII fields in a document
 * @param {Object} doc - Mongoose document
 * @param {string} modelName - Model name
 * @returns {Promise<Object>} Document with encrypted PII
 */
const encryptPII = async (doc, modelName) => {
  const fields = PII_FIELDS[modelName];
  if (!fields) return doc;
  
  return encryptFields(doc, fields);
};

/**
 * Automatically decrypt PII fields in a document
 * @param {Object} doc - Mongoose document
 * @param {string} modelName - Model name
 * @returns {Promise<Object>} Document with decrypted PII
 */
const decryptPII = async (doc, modelName) => {
  const fields = PII_FIELDS[modelName];
  if (!fields) return doc;
  
  return decryptFields(doc, fields);
};

module.exports = {
  encrypt,
  decrypt,
  encryptField,
  decryptField,
  encryptFields,
  decryptFields,
  hash,
  hashWithSalt,
  generateRandomString,
  generateUUID,
  compareHash,
  encryptFile,
  decryptFile,
  rotateKey,
  getEncryptionStats,
  encryptPII,
  decryptPII,
  PII_FIELDS,
};
