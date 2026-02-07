/**
 * PayoutProvider Model
 * Stores payment provider configurations for Myanmar wallets and banks
 * Supports KBZPay, WavePay, CB Pay, and major Myanmar banks
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Provider type constants
const PROVIDER_TYPES = {
  KBZPAY: 'kbzpay',
  WAVEPAY: 'wavepay',
  CBPAY: 'cbpay',
  BANK_TRANSFER: 'bank_transfer',
};

// Provider status constants
const PROVIDER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  MAINTENANCE: 'maintenance',
  SUSPENDED: 'suspended',
};

// Myanmar banks list
const MYANMAR_BANKS = {
  KBZ: { name: 'Kanbawza Bank', code: 'KBZ', swift: 'KBZBMMMY' },
  CB: { name: 'Co-operative Bank', code: 'CB', swift: 'CPOBMMMY' },
  AYA: { name: 'Ayeyarwady Bank', code: 'AYA', swift: 'AYABMMMY' },
  YOMA: { name: 'Yoma Bank', code: 'YOMA', swift: 'YOMAMMMY' },
  AGD: { name: 'AGD Bank', code: 'AGD', swift: 'AGDBMMMY' },
  MAB: { name: 'Myanmar Apex Bank', code: 'MAB', swift: 'MABMMMMY' },
  MCB: { name: 'Myanmar Citizens Bank', code: 'MCB', swift: 'MCIZMMMY' },
  UAB: { name: 'United Amara Bank', code: 'UAB', swift: 'UABMMMMY' },
};

// Fee structure schema
const FeeStructureSchema = new Schema({
  type: {
    type: String,
    enum: ['percentage', 'fixed', 'tiered'],
    required: true,
  },
  percentage: {
    type: Number,
    min: 0,
    max: 100,
  },
  fixedAmount: {
    type: Number,
    min: 0,
  },
  tiers: [{
    minAmount: { type: Number, required: true },
    maxAmount: { type: Number },
    fee: { type: Number, required: true },
    feeType: { type: String, enum: ['percentage', 'fixed'], required: true },
  }],
  minFee: {
    type: Number,
    default: 0,
  },
  maxFee: {
    type: Number,
  },
}, { _id: false });

// API configuration schema
const ApiConfigSchema = new Schema({
  baseUrl: {
    type: String,
    required: true,
  },
  apiKey: {
    type: String,
    select: false, // Don't include in queries by default
  },
  apiSecret: {
    type: String,
    select: false,
  },
  merchantId: {
    type: String,
  },
  webhookSecret: {
    type: String,
    select: false,
  },
  timeout: {
    type: Number,
    default: 30000, // 30 seconds
  },
  retryAttempts: {
    type: Number,
    default: 3,
  },
}, { _id: false });

// Limits schema
const LimitsSchema = new Schema({
  minTransaction: {
    type: Number,
    default: 1000,
  },
  maxTransaction: {
    type: Number,
    default: 10000000, // 10 million MMK
  },
  dailyLimit: {
    type: Number,
    default: 50000000, // 50 million MMK
  },
  monthlyLimit: {
    type: Number,
    default: 500000000, // 500 million MMK
  },
}, { _id: false });

// Main PayoutProvider Schema
const PayoutProviderSchema = new Schema({
  // Provider identifier
  code: {
    type: String,
    required: [true, 'Provider code is required'],
    unique: true,
    trim: true,
    uppercase: true,
  },

  // Provider name
  name: {
    type: String,
    required: [true, 'Provider name is required'],
    trim: true,
  },

  // Provider type
  type: {
    type: String,
    enum: Object.values(PROVIDER_TYPES),
    required: true,
    index: true,
  },

  // Bank code (for bank transfers)
  bankCode: {
    type: String,
    enum: Object.keys(MYANMAR_BANKS),
  },

  // Display information
  displayName: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  logoUrl: {
    type: String,
    trim: true,
  },

  // Status
  status: {
    type: String,
    enum: Object.values(PROVIDER_STATUS),
    default: PROVIDER_STATUS.ACTIVE,
    index: true,
  },

  // Priority (for provider selection)
  priority: {
    type: Number,
    default: 0,
  },

  // Fee structure
  feeStructure: {
    type: FeeStructureSchema,
    required: true,
  },

  // API configuration
  apiConfig: {
    type: ApiConfigSchema,
  },

  // Transaction limits
  limits: {
    type: LimitsSchema,
    default: () => ({}),
  },

  // Processing settings
  processingSettings: {
    supportsInstant: {
      type: Boolean,
      default: false,
    },
    processingTime: {
      type: String,
      default: '1-3 business days',
    },
    requiresVerification: {
      type: Boolean,
      default: true,
    },
    supportsRecurring: {
      type: Boolean,
      default: false,
    },
    supportsBatch: {
      type: Boolean,
      default: true,
    },
  },

  // Required fields for this provider
  requiredFields: [{
    type: String,
    enum: ['phoneNumber', 'accountNumber', 'accountName', 'bankName', 'bankBranch', 'swiftCode', 'nrcNumber'],
  }],

  // Supported currencies
  supportedCurrencies: [{
    type: String,
    default: ['MMK'],
  }],

  // Webhook configuration
  webhookConfig: {
    enabled: {
      type: Boolean,
      default: false,
    },
    endpoint: {
      type: String,
    },
    events: [{
      type: String,
      enum: ['payment.success', 'payment.failed', 'payment.pending', 'payment.cancelled'],
    }],
  },

  // Statistics
  stats: {
    totalTransactions: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    successCount: {
      type: Number,
      default: 0,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
    lastTransactionAt: {
      type: Date,
    },
    averageProcessingTime: {
      type: Number, // in milliseconds
      default: 0,
    },
  },

  // Metadata
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ==================== INDEXES ====================

PayoutProviderSchema.index({ code: 1 }, { unique: true });
PayoutProviderSchema.index({ type: 1, status: 1 });
PayoutProviderSchema.index({ status: 1, priority: -1 });
PayoutProviderSchema.index({ bankCode: 1 });

// ==================== VIRTUALS ====================

// Virtual for success rate
PayoutProviderSchema.virtual('successRate').get(function() {
  const total = this.stats.successCount + this.stats.failureCount;
  if (total === 0) return 100;
  return Math.round((this.stats.successCount / total) * 100);
});

// Virtual for is active
PayoutProviderSchema.virtual('isActive').get(function() {
  return this.status === PROVIDER_STATUS.ACTIVE;
});

// Virtual for is wallet
PayoutProviderSchema.virtual('isWallet').get(function() {
  return [PROVIDER_TYPES.KBZPAY, PROVIDER_TYPES.WAVEPAY, PROVIDER_TYPES.CBPAY].includes(this.type);
});

// Virtual for is bank
PayoutProviderSchema.virtual('isBank').get(function() {
  return this.type === PROVIDER_TYPES.BANK_TRANSFER;
});

// ==================== INSTANCE METHODS ====================

/**
 * Calculate fee for amount
 * @param {number} amount - Transaction amount
 * @returns {number} Fee amount
 */
PayoutProviderSchema.methods.calculateFee = function(amount) {
  const feeStructure = this.feeStructure;
  let fee = 0;

  switch (feeStructure.type) {
    case 'percentage':
      fee = amount * (feeStructure.percentage / 100);
      break;
    case 'fixed':
      fee = feeStructure.fixedAmount;
      break;
    case 'tiered':
      const tier = feeStructure.tiers.find(t =>
        amount >= t.minAmount && (!t.maxAmount || amount <= t.maxAmount)
      );
      if (tier) {
        fee = tier.feeType === 'percentage'
          ? amount * (tier.fee / 100)
          : tier.fee;
      }
      break;
  }

  // Apply min/max limits
  if (feeStructure.minFee && fee < feeStructure.minFee) {
    fee = feeStructure.minFee;
  }
  if (feeStructure.maxFee && fee > feeStructure.maxFee) {
    fee = feeStructure.maxFee;
  }

  return Math.round(fee);
};

/**
 * Update statistics
 * @param {boolean} success - Whether transaction succeeded
 * @param {number} amount - Transaction amount
 * @param {number} processingTime - Processing time in ms
 * @returns {Promise<void>}
 */
PayoutProviderSchema.methods.updateStats = async function(success, amount, processingTime) {
  this.stats.totalTransactions++;
  this.stats.totalAmount += amount;
  this.stats.lastTransactionAt = new Date();

  if (success) {
    this.stats.successCount++;
  } else {
    this.stats.failureCount++;
  }

  // Update average processing time
  if (processingTime) {
    const currentAvg = this.stats.averageProcessingTime;
    const count = this.stats.totalTransactions;
    this.stats.averageProcessingTime =
      (currentAvg * (count - 1) + processingTime) / count;
  }

  await this.save();
};

/**
 * Activate provider
 * @returns {Promise<void>}
 */
PayoutProviderSchema.methods.activate = async function() {
  this.status = PROVIDER_STATUS.ACTIVE;
  await this.save();
};

/**
 * Deactivate provider
 * @returns {Promise<void>}
 */
PayoutProviderSchema.methods.deactivate = async function() {
  this.status = PROVIDER_STATUS.INACTIVE;
  await this.save();
};

/**
 * Set maintenance mode
 * @param {boolean} enabled - Enable/disable maintenance
 * @returns {Promise<void>}
 */
PayoutProviderSchema.methods.setMaintenance = async function(enabled) {
  this.status = enabled ? PROVIDER_STATUS.MAINTENANCE : PROVIDER_STATUS.ACTIVE;
  await this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Find active providers
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
PayoutProviderSchema.statics.findActive = function(options = {}) {
  const query = { status: PROVIDER_STATUS.ACTIVE };

  if (options.type) {
    query.type = options.type;
  }

  return this.find(query)
    .sort({ priority: -1, name: 1 })
    .limit(options.limit || 50);
};

/**
 * Find providers by type
 * @param {string} type - Provider type
 * @returns {Promise<Array>}
 */
PayoutProviderSchema.statics.findByType = function(type) {
  return this.find({ type, status: PROVIDER_STATUS.ACTIVE })
    .sort({ priority: -1 });
};

/**
 * Find wallet providers
 * @returns {Promise<Array>}
 */
PayoutProviderSchema.statics.findWallets = function() {
  return this.find({
    type: { $in: [PROVIDER_TYPES.KBZPAY, PROVIDER_TYPES.WAVEPAY, PROVIDER_TYPES.CBPAY] },
    status: PROVIDER_STATUS.ACTIVE,
  }).sort({ priority: -1 });
};

/**
 * Find bank providers
 * @returns {Promise<Array>}
 */
PayoutProviderSchema.statics.findBanks = function() {
  return this.find({
    type: PROVIDER_TYPES.BANK_TRANSFER,
    status: PROVIDER_STATUS.ACTIVE,
  }).sort({ priority: -1 });
};

/**
 * Get provider by code
 * @param {string} code - Provider code
 * @returns {Promise<Document|null>}
 */
PayoutProviderSchema.statics.findByCode = function(code) {
  return this.findOne({ code: code.toUpperCase() });
};

/**
 * Get all providers with stats
 * @returns {Promise<Array>}
 */
PayoutProviderSchema.statics.getAllWithStats = function() {
  return this.find().sort({ priority: -1, name: 1 });
};

/**
 * Initialize default providers
 * Creates default providers if they don't exist
 * @returns {Promise<void>}
 */
PayoutProviderSchema.statics.initializeDefaults = async function() {
  const defaultProviders = [
    {
      code: 'KBZPAY',
      name: 'KBZPay',
      type: PROVIDER_TYPES.KBZPAY,
      displayName: 'KBZPay',
      description: 'KBZ Bank mobile wallet - Myanmar\'s #1 wallet',
      priority: 10,
      feeStructure: {
        type: 'percentage',
        percentage: 1.5,
        minFee: 500,
        maxFee: 10000,
      },
      limits: {
        minTransaction: 1000,
        maxTransaction: 5000000,
        dailyLimit: 20000000,
      },
      processingSettings: {
        supportsInstant: true,
        processingTime: 'Instant - 5 minutes',
        requiresVerification: true,
        supportsRecurring: true,
        supportsBatch: true,
      },
      requiredFields: ['phoneNumber', 'accountName'],
      supportedCurrencies: ['MMK'],
    },
    {
      code: 'WAVEPAY',
      name: 'WavePay',
      type: PROVIDER_TYPES.WAVEPAY,
      displayName: 'WavePay',
      description: 'Wave Money mobile wallet - Myanmar\'s #2 wallet',
      priority: 9,
      feeStructure: {
        type: 'percentage',
        percentage: 1.5,
        minFee: 500,
        maxFee: 10000,
      },
      limits: {
        minTransaction: 1000,
        maxTransaction: 5000000,
        dailyLimit: 20000000,
      },
      processingSettings: {
        supportsInstant: true,
        processingTime: 'Instant - 5 minutes',
        requiresVerification: true,
        supportsRecurring: true,
        supportsBatch: true,
      },
      requiredFields: ['phoneNumber', 'accountName'],
      supportedCurrencies: ['MMK'],
    },
    {
      code: 'CBPAY',
      name: 'CB Pay',
      type: PROVIDER_TYPES.CBPAY,
      displayName: 'CB Pay',
      description: 'Co-operative Bank mobile wallet',
      priority: 8,
      feeStructure: {
        type: 'percentage',
        percentage: 1.5,
        minFee: 500,
        maxFee: 10000,
      },
      limits: {
        minTransaction: 1000,
        maxTransaction: 5000000,
        dailyLimit: 20000000,
      },
      processingSettings: {
        supportsInstant: true,
        processingTime: 'Instant - 5 minutes',
        requiresVerification: true,
        supportsRecurring: true,
        supportsBatch: true,
      },
      requiredFields: ['phoneNumber', 'accountName'],
      supportedCurrencies: ['MMK'],
    },
    {
      code: 'KBZ_BANK',
      name: 'KBZ Bank Transfer',
      type: PROVIDER_TYPES.BANK_TRANSFER,
      bankCode: 'KBZ',
      displayName: 'KBZ Bank',
      description: 'Direct bank transfer to KBZ Bank accounts',
      priority: 7,
      feeStructure: {
        type: 'fixed',
        fixedAmount: 2500,
      },
      limits: {
        minTransaction: 5000,
        maxTransaction: 100000000,
        dailyLimit: 500000000,
      },
      processingSettings: {
        supportsInstant: false,
        processingTime: '1-2 business days',
        requiresVerification: true,
        supportsRecurring: true,
        supportsBatch: true,
      },
      requiredFields: ['accountNumber', 'accountName', 'bankName'],
      supportedCurrencies: ['MMK'],
    },
    {
      code: 'CB_BANK',
      name: 'CB Bank Transfer',
      type: PROVIDER_TYPES.BANK_TRANSFER,
      bankCode: 'CB',
      displayName: 'CB Bank',
      description: 'Direct bank transfer to Co-operative Bank accounts',
      priority: 6,
      feeStructure: {
        type: 'fixed',
        fixedAmount: 2500,
      },
      limits: {
        minTransaction: 5000,
        maxTransaction: 100000000,
        dailyLimit: 500000000,
      },
      processingSettings: {
        supportsInstant: false,
        processingTime: '1-2 business days',
        requiresVerification: true,
        supportsRecurring: true,
        supportsBatch: true,
      },
      requiredFields: ['accountNumber', 'accountName', 'bankName'],
      supportedCurrencies: ['MMK'],
    },
    {
      code: 'AYA_BANK',
      name: 'AYA Bank Transfer',
      type: PROVIDER_TYPES.BANK_TRANSFER,
      bankCode: 'AYA',
      displayName: 'AYA Bank',
      description: 'Direct bank transfer to Ayeyarwady Bank accounts',
      priority: 5,
      feeStructure: {
        type: 'fixed',
        fixedAmount: 2500,
      },
      limits: {
        minTransaction: 5000,
        maxTransaction: 100000000,
        dailyLimit: 500000000,
      },
      processingSettings: {
        supportsInstant: false,
        processingTime: '1-2 business days',
        requiresVerification: true,
        supportsRecurring: true,
        supportsBatch: true,
      },
      requiredFields: ['accountNumber', 'accountName', 'bankName'],
      supportedCurrencies: ['MMK'],
    },
    {
      code: 'YOMA_BANK',
      name: 'Yoma Bank Transfer',
      type: PROVIDER_TYPES.BANK_TRANSFER,
      bankCode: 'YOMA',
      displayName: 'Yoma Bank',
      description: 'Direct bank transfer to Yoma Bank accounts',
      priority: 4,
      feeStructure: {
        type: 'fixed',
        fixedAmount: 2500,
      },
      limits: {
        minTransaction: 5000,
        maxTransaction: 100000000,
        dailyLimit: 500000000,
      },
      processingSettings: {
        supportsInstant: false,
        processingTime: '1-2 business days',
        requiresVerification: true,
        supportsRecurring: true,
        supportsBatch: true,
      },
      requiredFields: ['accountNumber', 'accountName', 'bankName'],
      supportedCurrencies: ['MMK'],
    },
  ];

  for (const providerData of defaultProviders) {
    await this.findOneAndUpdate(
      { code: providerData.code },
      providerData,
      { upsert: true, new: true }
    );
  }

  console.log('[PayoutProvider] Default providers initialized');
};

// Create and export the model
const PayoutProvider = mongoose.model('PayoutProvider', PayoutProviderSchema);

module.exports = PayoutProvider;
