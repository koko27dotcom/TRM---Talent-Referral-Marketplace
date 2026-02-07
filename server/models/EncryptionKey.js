/**
 * EncryptionKey Model
 * Manages encryption keys for data at rest encryption
 * Supports key rotation, versioning, and secure key storage
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Key types
const KEY_TYPES = {
  DATA_ENCRYPTION: 'data_encryption',
  FIELD_ENCRYPTION: 'field_encryption',
  BACKUP_ENCRYPTION: 'backup_encryption',
  FILE_ENCRYPTION: 'file_encryption',
  COMMUNICATION_ENCRYPTION: 'communication_encryption',
  SIGNING: 'signing',
  TOKEN_ENCRYPTION: 'token_encryption',
};

// Key algorithms
const KEY_ALGORITHMS = {
  AES_256_GCM: 'aes-256-gcm',
  AES_256_CBC: 'aes-256-cbc',
  RSA_2048: 'rsa-2048',
  RSA_4096: 'rsa-4096',
  ECDH_P256: 'ecdh-p256',
  ECDH_P384: 'ecdh-p384',
};

// Key status
const KEY_STATUS = {
  ACTIVE: 'active',
  ROTATING: 'rotating',
  DEPRECATED: 'deprecated',
  COMPROMISED: 'compromised',
  REVOKED: 'revoked',
  ARCHIVED: 'archived',
};

// Key usage
const KEY_USAGE = {
  ENCRYPT_DECRYPT: 'encrypt_decrypt',
  SIGN_VERIFY: 'sign_verify',
  WRAP_UNWRAP: 'wrap_unwrap',
};

// Key metadata schema
const KeyMetadataSchema = new Schema({
  purpose: {
    type: String,
    required: true,
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
  },
  dataTypes: [{
    type: String,
    // e.g., 'pii', 'financial', 'health', 'credentials'
  }],
  fields: [{
    entity: { type: String },
    field: { type: String },
  }],
}, { _id: false });

// Key rotation schema
const KeyRotationSchema = new Schema({
  previousKeyId: {
    type: Schema.Types.ObjectId,
    ref: 'EncryptionKey',
  },
  nextKeyId: {
    type: Schema.Types.ObjectId,
    ref: 'EncryptionKey',
  },
  rotatedAt: {
    type: Date,
  },
  rotatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  reason: {
    type: String,
  },
  reencryptionStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed'],
    default: 'pending',
  },
  reencryptionProgress: {
    totalRecords: { type: Number, default: 0 },
    processedRecords: { type: Number, default: 0 },
    failedRecords: { type: Number, default: 0 },
  },
}, { _id: false });

// Key access log schema
const KeyAccessLogSchema = new Schema({
  action: {
    type: String,
    enum: ['created', 'accessed', 'rotated', 'revoked', 'compromised', 'deleted'],
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  ipAddress: { type: String },
  userAgent: { type: String },
  success: { type: Boolean, default: true },
  reason: { type: String },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, { _id: true });

// Main EncryptionKey Schema
const EncryptionKeySchema = new Schema({
  // Key identification
  keyId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  version: {
    type: Number,
    default: 1,
  },
  
  // Key type and algorithm
  keyType: {
    type: String,
    enum: Object.values(KEY_TYPES),
    required: true,
    index: true,
  },
  algorithm: {
    type: String,
    enum: Object.values(KEY_ALGORITHMS),
    required: true,
  },
  keySize: {
    type: Number,
    required: true,
    // e.g., 256 for AES-256, 2048 for RSA-2048
  },
  usage: {
    type: String,
    enum: Object.values(KEY_USAGE),
    required: true,
  },
  
  // Encrypted key material (stored encrypted with master key)
  // In production, this should reference a KMS or HSM
  keyMaterial: {
    encryptedKey: {
      type: String,
      required: true,
    },
    iv: {
      type: String,
      required: true,
    },
    authTag: {
      type: String,
    },
    wrappedBy: {
      type: String,
      required: true,
      // Reference to the master key or KMS key ID
    },
    format: {
      type: String,
      enum: ['raw', 'pkcs8', 'spki', 'jwk'],
      default: 'raw',
    },
  },
  
  // Key fingerprint for verification
  fingerprint: {
    type: String,
    required: true,
    index: true,
  },
  
  // Key status
  status: {
    type: String,
    enum: Object.values(KEY_STATUS),
    default: KEY_STATUS.ACTIVE,
    index: true,
  },
  
  // Key metadata
  metadata: {
    type: KeyMetadataSchema,
    default: {},
  },
  
  // Rotation information
  rotation: {
    type: KeyRotationSchema,
    default: undefined,
  },
  
  // Lifecycle dates
  createdAt: {
    type: Date,
    default: Date.now,
  },
  activatedAt: {
    type: Date,
  },
  expiresAt: {
    type: Date,
    index: true,
  },
  deprecatedAt: {
    type: Date,
  },
  revokedAt: {
    type: Date,
  },
  
  // Rotation schedule
  rotationSchedule: {
    enabled: {
      type: Boolean,
      default: true,
    },
    intervalDays: {
      type: Number,
      default: 90, // 90 days default rotation
    },
    lastRotatedAt: {
      type: Date,
    },
    nextRotationAt: {
      type: Date,
      index: true,
    },
    autoRotate: {
      type: Boolean,
      default: false,
    },
  },
  
  // Usage tracking
  usage: {
    encryptCount: { type: Number, default: 0 },
    decryptCount: { type: Number, default: 0 },
    lastUsedAt: { type: Date },
    lastEncryptAt: { type: Date },
    lastDecryptAt: { type: Date },
  },
  
  // Access control
  accessControl: {
    allowedRoles: [{
      type: String,
    }],
    allowedServices: [{
      type: String,
    }],
    requireMFA: {
      type: Boolean,
      default: true,
    },
  },
  
  // Audit log
  accessLog: [KeyAccessLogSchema],
  
  // Created by
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: { createdAt: true, updatedAt: true },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ==================== INDEXES ====================

EncryptionKeySchema.index({ keyType: 1, status: 1 });
EncryptionKeySchema.index({ 'metadata.companyId': 1, keyType: 1 });
EncryptionKeySchema.index({ status: 1, 'rotationSchedule.nextRotationAt': 1 });
EncryptionKeySchema.index({ fingerprint: 1 });

// ==================== VIRTUALS ====================

EncryptionKeySchema.virtual('isActive').get(function() {
  return this.status === KEY_STATUS.ACTIVE;
});

EncryptionKeySchema.virtual('needsRotation').get(function() {
  if (!this.rotationSchedule.enabled) return false;
  if (!this.rotationSchedule.nextRotationAt) return false;
  return this.rotationSchedule.nextRotationAt <= new Date();
});

EncryptionKeySchema.virtual('age').get(function() {
  return Date.now() - this.createdAt.getTime();
});

EncryptionKeySchema.virtual('totalUsage').get(function() {
  return (this.usage?.encryptCount || 0) + (this.usage?.decryptCount || 0);
});

// ==================== STATIC METHODS ====================

/**
 * Generate unique key ID
 * @param {string} keyType - Type of key
 * @returns {string}
 */
EncryptionKeySchema.statics.generateKeyId = function(keyType) {
  const prefix = keyType.toUpperCase().replace(/_/g, '');
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Get active key for type
 * @param {string} keyType - Key type
 * @param {string} companyId - Company ID (optional)
 * @returns {Promise<Document|null>}
 */
EncryptionKeySchema.statics.getActiveKey = async function(keyType, companyId = null) {
  const query = {
    keyType,
    status: KEY_STATUS.ACTIVE,
  };
  
  if (companyId) {
    query['metadata.companyId'] = companyId;
  }
  
  return this.findOne(query).sort({ version: -1 });
};

/**
 * Get all active keys
 * @param {Object} filters - Filters
 * @returns {Promise<Array>}
 */
EncryptionKeySchema.statics.getAllActiveKeys = function(filters = {}) {
  const query = { status: KEY_STATUS.ACTIVE };
  
  if (filters.keyType) {
    query.keyType = filters.keyType;
  }
  
  if (filters.companyId) {
    query['metadata.companyId'] = filters.companyId;
  }
  
  return this.find(query).sort({ keyType: 1, version: -1 });
};

/**
 * Get keys needing rotation
 * @returns {Promise<Array>}
 */
EncryptionKeySchema.statics.getKeysNeedingRotation = function() {
  return this.find({
    status: KEY_STATUS.ACTIVE,
    'rotationSchedule.enabled': true,
    'rotationSchedule.nextRotationAt': { $lte: new Date() },
  });
};

/**
 * Create a new encryption key
 * @param {Object} data - Key data
 * @returns {Promise<Document>}
 */
EncryptionKeySchema.statics.createKey = async function(data) {
  const keyId = this.generateKeyId(data.keyType);
  
  // Calculate next rotation date
  const nextRotationAt = new Date();
  nextRotationAt.setDate(
    nextRotationAt.getDate() + (data.rotationSchedule?.intervalDays || 90)
  );
  
  const key = await this.create({
    ...data,
    keyId,
    activatedAt: new Date(),
    rotationSchedule: {
      enabled: true,
      intervalDays: 90,
      autoRotate: false,
      ...data.rotationSchedule,
      nextRotationAt,
    },
  });
  
  // Log key creation
  await key.logAccess('created', data.createdBy, 'Key created');
  
  return key;
};

/**
 * Rotate a key
 * @param {string} keyId - Key ID to rotate
 * @param {string} userId - User performing rotation
 * @param {string} reason - Rotation reason
 * @returns {Promise<Document>} New key
 */
EncryptionKeySchema.statics.rotateKey = async function(keyId, userId, reason = '') {
  const oldKey = await this.findOne({ keyId });
  
  if (!oldKey) {
    throw new Error('Key not found');
  }
  
  if (oldKey.status !== KEY_STATUS.ACTIVE) {
    throw new Error('Can only rotate active keys');
  }
  
  // Mark old key as rotating
  oldKey.status = KEY_STATUS.ROTATING;
  oldKey.deprecatedAt = new Date();
  await oldKey.save();
  
  // Create new key with incremented version
  const newKeyData = {
    keyType: oldKey.keyType,
    algorithm: oldKey.algorithm,
    keySize: oldKey.keySize,
    usage: oldKey.usage,
    keyMaterial: oldKey.keyMaterial, // In production, generate new key material
    fingerprint: oldKey.fingerprint, // In production, generate new fingerprint
    metadata: oldKey.metadata,
    version: oldKey.version + 1,
    rotationSchedule: oldKey.rotationSchedule,
    accessControl: oldKey.accessControl,
    createdBy: userId,
  };
  
  const newKey = await this.createKey(newKeyData);
  
  // Update rotation info on both keys
  oldKey.rotation = {
    nextKeyId: newKey._id,
    rotatedAt: new Date(),
    rotatedBy: userId,
    reason,
    reencryptionStatus: 'pending',
  };
  await oldKey.save();
  
  newKey.rotation = {
    previousKeyId: oldKey._id,
  };
  await newKey.save();
  
  // Log rotation
  await oldKey.logAccess('rotated', userId, `Rotated to ${newKey.keyId}: ${reason}`);
  await newKey.logAccess('created', userId, `Created as rotation of ${oldKey.keyId}`);
  
  return newKey;
};

// ==================== INSTANCE METHODS ====================

/**
 * Log key access
 * @param {string} action - Access action
 * @param {string} userId - User ID
 * @param {string} reason - Access reason
 * @param {Object} context - Additional context
 */
EncryptionKeySchema.methods.logAccess = async function(action, userId, reason = '', context = {}) {
  this.accessLog.push({
    action,
    userId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    reason,
    timestamp: new Date(),
  });
  
  await this.save();
};

/**
 * Record encryption operation
 * @param {string} userId - User performing operation
 */
EncryptionKeySchema.methods.recordEncrypt = async function(userId) {
  this.usage.encryptCount += 1;
  this.usage.lastUsedAt = new Date();
  this.usage.lastEncryptAt = new Date();
  await this.save();
};

/**
 * Record decryption operation
 * @param {string} userId - User performing operation
 */
EncryptionKeySchema.methods.recordDecrypt = async function(userId) {
  this.usage.decryptCount += 1;
  this.usage.lastUsedAt = new Date();
  this.usage.lastDecryptAt = new Date();
  await this.save();
};

/**
 * Mark key as compromised
 * @param {string} userId - User reporting compromise
 * @param {string} reason - Compromise reason
 */
EncryptionKeySchema.methods.markCompromised = async function(userId, reason) {
  this.status = KEY_STATUS.COMPROMISED;
  this.revokedAt = new Date();
  await this.save();
  
  await this.logAccess('compromised', userId, reason);
  
  // Trigger immediate rotation
  await this.constructor.rotateKey(this.keyId, userId, `Security incident: ${reason}`);
};

/**
 * Revoke key
 * @param {string} userId - User revoking
 * @param {string} reason - Revocation reason
 */
EncryptionKeySchema.methods.revoke = async function(userId, reason) {
  this.status = KEY_STATUS.REVOKED;
  this.revokedAt = new Date();
  await this.save();
  
  await this.logAccess('revoked', userId, reason);
};

/**
 * Archive key
 * @param {string} userId - User archiving
 */
EncryptionKeySchema.methods.archive = async function(userId) {
  this.status = KEY_STATUS.ARCHIVED;
  await this.save();
  
  await this.logAccess('deleted', userId, 'Key archived');
};

/**
 * Update reencryption progress
 * @param {number} processed - Records processed
 * @param {number} failed - Records failed
 * @param {number} total - Total records
 */
EncryptionKeySchema.methods.updateReencryptionProgress = async function(processed, failed, total) {
  if (!this.rotation) {
    this.rotation = {};
  }
  
  this.rotation.reencryptionProgress = {
    processedRecords: processed,
    failedRecords: failed,
    totalRecords: total,
  };
  
  if (processed >= total) {
    this.rotation.reencryptionStatus = failed > 0 ? 'failed' : 'completed';
  } else {
    this.rotation.reencryptionStatus = 'in_progress';
  }
  
  await this.save();
};

/**
 * Check if user can access key
 * @param {Object} user - User object
 * @param {string} service - Service name
 * @returns {boolean}
 */
EncryptionKeySchema.methods.canAccess = function(user, service = null) {
  // Check if key is active
  if (this.status !== KEY_STATUS.ACTIVE) {
    return false;
  }
  
  // Check role-based access
  if (this.accessControl.allowedRoles.length > 0) {
    if (!this.accessControl.allowedRoles.includes(user.role)) {
      return false;
    }
  }
  
  // Check service-based access
  if (service && this.accessControl.allowedServices.length > 0) {
    if (!this.accessControl.allowedServices.includes(service)) {
      return false;
    }
  }
  
  return true;
};

// Create and export the model
const EncryptionKey = mongoose.model('EncryptionKey', EncryptionKeySchema);

module.exports = EncryptionKey;
