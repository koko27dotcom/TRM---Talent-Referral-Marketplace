/**
 * PaymentMethod Model
 * Stores user's payment methods (wallets, bank accounts) for withdrawals and deposits
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// Payment method type constants
const PAYMENT_METHOD_TYPE = {
  KBZPAY: 'kbzpay',
  WAVEPAY: 'wavepay',
  AYAPAY: 'ayapay',
  MPU: 'mpu',
  BANK_TRANSFER: 'bank_transfer',
  STRIPE_CARD: 'stripe_card',
  CASH: 'cash'
};

// Payment method status constants
const PAYMENT_METHOD_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING_VERIFICATION: 'pending_verification',
  VERIFIED: 'verified',
  FAILED_VERIFICATION: 'failed_verification',
  EXPIRED: 'expired',
  BLOCKED: 'blocked'
};

// Myanmar bank codes
const MYANMAR_BANKS = {
  KBZ: { name: 'Kanbawza Bank', code: 'KBZ', swift: 'KBZBMMMY' },
  AYA: { name: 'AYA Bank', code: 'AYA', swift: 'AYABMMMY' },
  CB: { name: 'CB Bank', code: 'CB', swift: 'CPOBMMMY' },
  YOMA: { name: 'Yoma Bank', code: 'YOMA', swift: 'YOMAMMMY' },
  AGD: { name: 'AGD Bank', code: 'AGD', swift: 'AGDBMMMY' },
  MAB: { name: 'Myanmar Apex Bank', code: 'MAB', swift: 'MYAEMMMY' },
  UAB: { name: 'United Amara Bank', code: 'UAB', swift: 'UABMMMMY' },
  MOB: { name: 'Myanmar Oriental Bank', code: 'MOB', swift: 'MYOBMMMY' },
  MICB: { name: 'Myawaddy Bank', code: 'MICB', swift: 'MYWMEMMY' },
  CHB: { name: 'Construction & Housing Development Bank', code: 'CHB', swift: 'CHBDMMMY' },
  INNWA: { name: 'Innwa Bank', code: 'INNWA', swift: 'INNWMYMM' },
  SMEB: { name: 'Small & Medium Enterprise Development Bank', code: 'SMEB', swift: 'SMEBMMMY' },
  NDB: { name: 'Naypyitaw Development Bank', code: 'NDB', swift: 'NAYPMMMY' },
  MEB: { name: 'Myanmar Economic Bank', code: 'MEB', swift: 'MYEBMMMY' },
  MFTB: { name: 'Myanmar Foreign Trade Bank', code: 'MFTB', swift: 'MYFBMMMY' },
  MICB_BANK: { name: 'Myanmar Investment & Commercial Bank', code: 'MICB_BANK', swift: 'MYICMMMY' }
};

// Bank account schema
const BankAccountSchema = new Schema({
  bankCode: {
    type: String,
    required: true,
    enum: Object.keys(MYANMAR_BANKS),
    uppercase: true
  },
  bankName: {
    type: String,
    required: true
  },
  accountNumber: {
    type: String,
    required: true,
    trim: true
  },
  accountHolderName: {
    type: String,
    required: true,
    trim: true
  },
  branchCode: {
    type: String,
    default: null,
    trim: true
  },
  branchName: {
    type: String,
    default: null,
    trim: true
  },
  swiftCode: {
    type: String,
    default: null,
    trim: true
  }
}, { _id: false });

// Mobile wallet schema
const MobileWalletSchema = new Schema({
  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },
  accountName: {
    type: String,
    required: true,
    trim: true
  },
  walletId: {
    type: String,
    default: null,
    trim: true
  },
  verifiedAt: {
    type: Date,
    default: null
  }
}, { _id: false });

// Card schema
const CardSchema = new Schema({
  brand: {
    type: String,
    default: null,
    trim: true
  },
  last4: {
    type: String,
    default: null,
    trim: true
  },
  expMonth: {
    type: Number,
    default: null
  },
  expYear: {
    type: Number,
    default: null
  },
  fingerprint: {
    type: String,
    default: null,
    trim: true
  },
  country: {
    type: String,
    default: null,
    trim: true
  },
  funding: {
    type: String,
    enum: ['credit', 'debit', 'prepaid', 'unknown'],
    default: 'unknown'
  },
  threeDSecure: {
    type: Boolean,
    default: false
  }
}, { _id: false });

// Verification attempt schema
const VerificationAttemptSchema = new Schema({
  attemptedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    required: true
  },
  method: {
    type: String,
    default: null
  },
  otpCode: {
    type: String,
    default: null
  },
  errorMessage: {
    type: String,
    default: null
  },
  ipAddress: {
    type: String,
    default: null
  }
}, { _id: true });

// Main PaymentMethod Schema
const PaymentMethodSchema = new Schema({
  // User reference
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Method identification
  methodId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  // Method type and status
  type: {
    type: String,
    enum: Object.values(PAYMENT_METHOD_TYPE),
    required: true
  },
  
  status: {
    type: String,
    enum: Object.values(PAYMENT_METHOD_STATUS),
    default: PAYMENT_METHOD_STATUS.PENDING_VERIFICATION
  },

  // Display information
  nickname: {
    type: String,
    default: null,
    trim: true
  },
  
  displayName: {
    type: String,
    required: true,
    trim: true
  },

  // Type-specific details
  bankAccount: {
    type: BankAccountSchema,
    default: null
  },
  
  mobileWallet: {
    type: MobileWalletSchema,
    default: null
  },
  
  card: {
    type: CardSchema,
    default: null
  },

  // Provider-specific data
  providerData: {
    type: Schema.Types.Mixed,
    default: {}
  },
  
  providerToken: {
    type: String,
    default: null
  },

  // Preferences
  isDefault: {
    type: Boolean,
    default: false
  },
  
  isPrimary: {
    type: Boolean,
    default: false
  },
  
  canDeposit: {
    type: Boolean,
    default: true
  },
  
  canWithdraw: {
    type: Boolean,
    default: true
  },

  // Verification
  verifiedAt: {
    type: Date,
    default: null
  },
  
  verificationAttempts: [VerificationAttemptSchema],
  
  verificationExpiry: {
    type: Date,
    default: null
  },

  // Usage tracking
  usageCount: {
    type: Number,
    default: 0
  },
  
  lastUsedAt: {
    type: Date,
    default: null
  },
  
  totalDeposited: {
    type: Number,
    default: 0
  },
  
  totalWithdrawn: {
    type: Number,
    default: 0
  },

  // Limits
  dailyLimit: {
    type: Number,
    default: null
  },
  
  monthlyLimit: {
    type: Number,
    default: null
  },
  
  transactionLimit: {
    type: Number,
    default: null
  },

  // Expiry
  expiresAt: {
    type: Date,
    default: null
  },

  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false
  },
  
  deletedAt: {
    type: Date,
    default: null
  },
  
  deletedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Audit
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  ipAddress: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  collection: 'payment_methods'
});

// Indexes
PaymentMethodSchema.index({ userId: 1, status: 1 });
PaymentMethodSchema.index({ userId: 1, isDefault: 1 });
PaymentMethodSchema.index({ userId: 1, type: 1 });
PaymentMethodSchema.index({ 'mobileWallet.phoneNumber': 1 });
PaymentMethodSchema.index({ 'bankAccount.accountNumber': 1, 'bankAccount.bankCode': 1 });
PaymentMethodSchema.index({ status: 1, verifiedAt: 1 });

// Pre-save middleware to set display name
PaymentMethodSchema.pre('save', function(next) {
  if (this.isModified('nickname') || this.isModified('type') || !this.displayName) {
    if (this.nickname) {
      this.displayName = this.nickname;
    } else {
      const typeNames = {
        [PAYMENT_METHOD_TYPE.KBZPAY]: 'KBZPay',
        [PAYMENT_METHOD_TYPE.WAVEPAY]: 'WavePay',
        [PAYMENT_METHOD_TYPE.AYAPAY]: 'AYA Pay',
        [PAYMENT_METHOD_TYPE.MPU]: 'MPU',
        [PAYMENT_METHOD_TYPE.BANK_TRANSFER]: 'Bank Transfer',
        [PAYMENT_METHOD_TYPE.STRIPE_CARD]: 'Card',
        [PAYMENT_METHOD_TYPE.CASH]: 'Cash'
      };
      
      this.displayName = typeNames[this.type] || this.type;
      
      // Add account/phone suffix
      if (this.mobileWallet?.phoneNumber) {
        const masked = this.maskPhoneNumber(this.mobileWallet.phoneNumber);
        this.displayName += ` (${masked})`;
      } else if (this.bankAccount?.accountNumber) {
        const masked = this.maskAccountNumber(this.bankAccount.accountNumber);
        this.displayName += ` (${masked})`;
      } else if (this.card?.last4) {
        this.displayName += ` (••••${this.card.last4})`;
      }
    }
  }
  next();
});

// Instance methods

/**
 * Verify this payment method
 */
PaymentMethodSchema.methods.verify = async function(method = 'auto', ipAddress = null) {
  this.status = PAYMENT_METHOD_STATUS.VERIFIED;
  this.verifiedAt = new Date();
  
  this.verificationAttempts.push({
    status: 'success',
    method,
    ipAddress
  });
  
  return this.save();
};

/**
 * Record failed verification attempt
 */
PaymentMethodSchema.methods.recordFailedVerification = async function(errorMessage, ipAddress = null) {
  this.verificationAttempts.push({
    status: 'failed',
    errorMessage,
    ipAddress
  });
  
  // If too many failures, mark as failed
  const recentFailures = this.verificationAttempts
    .filter(a => a.status === 'failed')
    .slice(-3);
  
  if (recentFailures.length >= 3) {
    this.status = PAYMENT_METHOD_STATUS.FAILED_VERIFICATION;
  }
  
  return this.save();
};

/**
 * Record usage
 */
PaymentMethodSchema.methods.recordUsage = async function(amount, type = 'deposit') {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  
  if (type === 'deposit') {
    this.totalDeposited += amount;
  } else if (type === 'withdrawal') {
    this.totalWithdrawn += amount;
  }
  
  return this.save();
};

/**
 * Soft delete
 */
PaymentMethodSchema.methods.softDelete = async function(deletedBy = null) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  this.status = PAYMENT_METHOD_STATUS.INACTIVE;
  
  return this.save();
};

/**
 * Check if method can be used for transaction
 */
PaymentMethodSchema.methods.canUse = function(amount, type = 'deposit') {
  if (this.isDeleted) return { canUse: false, reason: 'Method has been deleted' };
  if (this.status !== PAYMENT_METHOD_STATUS.VERIFIED) {
    return { canUse: false, reason: 'Method not verified' };
  }
  
  if (type === 'deposit' && !this.canDeposit) {
    return { canUse: false, reason: 'Method cannot be used for deposits' };
  }
  
  if (type === 'withdrawal' && !this.canWithdraw) {
    return { canUse: false, reason: 'Method cannot be used for withdrawals' };
  }
  
  if (this.transactionLimit && amount > this.transactionLimit) {
    return { canUse: false, reason: 'Amount exceeds transaction limit' };
  }
  
  if (this.expiresAt && new Date() > this.expiresAt) {
    return { canUse: false, reason: 'Method has expired' };
  }
  
  return { canUse: true };
};

/**
 * Mask phone number for display
 */
PaymentMethodSchema.methods.maskPhoneNumber = function(phoneNumber) {
  if (!phoneNumber) return '';
  const cleaned = phoneNumber.replace(/\D/g, '');
  if (cleaned.length < 7) return phoneNumber;
  return cleaned.substring(0, 3) + '••••' + cleaned.substring(cleaned.length - 3);
};

/**
 * Mask account number for display
 */
PaymentMethodSchema.methods.maskAccountNumber = function(accountNumber) {
  if (!accountNumber) return '';
  if (accountNumber.length < 4) return accountNumber;
  return '••••' + accountNumber.substring(accountNumber.length - 4);
};

// Static methods

/**
 * Find payment methods by user
 */
PaymentMethodSchema.statics.findByUser = function(userId, options = {}) {
  const query = { userId, isDeleted: false };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.type) {
    query.type = options.type;
  }
  
  return this.find(query).sort({ isDefault: -1, createdAt: -1 });
};

/**
 * Get default payment method for user
 */
PaymentMethodSchema.statics.getDefaultForUser = async function(userId, type = null) {
  const query = { 
    userId, 
    isDeleted: false, 
    isDefault: true,
    status: PAYMENT_METHOD_STATUS.VERIFIED
  };
  
  if (type) {
    query.type = type;
  }
  
  return this.findOne(query);
};

/**
 * Set default payment method
 */
PaymentMethodSchema.statics.setDefault = async function(methodId, userId) {
  // Remove default from other methods
  await this.updateMany(
    { userId, isDefault: true },
    { $set: { isDefault: false } }
  );
  
  // Set new default
  return this.findOneAndUpdate(
    { methodId, userId },
    { $set: { isDefault: true } },
    { new: true }
  );
};

/**
 * Check if phone number is already registered
 */
PaymentMethodSchema.statics.isPhoneRegistered = async function(phoneNumber, excludeUserId = null) {
  const query = {
    'mobileWallet.phoneNumber': phoneNumber,
    isDeleted: false,
    status: { $in: [PAYMENT_METHOD_STATUS.VERIFIED, PAYMENT_METHOD_STATUS.PENDING_VERIFICATION] }
  };
  
  if (excludeUserId) {
    query.userId = { $ne: excludeUserId };
  }
  
  const count = await this.countDocuments(query);
  return count > 0;
};

/**
 * Generate unique method ID
 */
PaymentMethodSchema.statics.generateMethodId = function() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PM${timestamp}${random}`;
};

// Create and export model
const PaymentMethod = mongoose.model('PaymentMethod', PaymentMethodSchema);

module.exports = PaymentMethod;
module.exports.PAYMENT_METHOD_TYPE = PAYMENT_METHOD_TYPE;
module.exports.PAYMENT_METHOD_STATUS = PAYMENT_METHOD_STATUS;
module.exports.MYANMAR_BANKS = MYANMAR_BANKS;
