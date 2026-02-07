/**
 * Region Configuration Model
 * Stores regional settings for each supported country/region
 * Includes timezone, currency, compliance, and payment provider configurations
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Compliance requirement schema
const ComplianceRequirementSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  description: {
    type: String,
    trim: true,
  },
  isRequired: {
    type: Boolean,
    default: true,
  },
  documentTypes: [{
    type: String,
    trim: true,
  }],
  verificationSteps: [{
    type: String,
    trim: true,
  }],
}, { _id: true });

// Payment provider configuration schema
const PaymentProviderConfigSchema = new Schema({
  provider: {
    type: String,
    required: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  supportedCurrencies: [{
    type: String,
    trim: true,
  }],
  supportedMethods: [{
    type: String,
    enum: ['mobile_wallet', 'bank_transfer', 'card', 'cash'],
  }],
  minAmount: {
    type: Number,
    default: 0,
  },
  maxAmount: {
    type: Number,
    default: null,
  },
  fees: {
    percentage: {
      type: Number,
      default: 0,
    },
    fixed: {
      type: Number,
      default: 0,
    },
  },
  processingTime: {
    type: String,
    trim: true,
  },
  config: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, { _id: true });

// Language configuration schema
const LanguageConfigSchema = new Schema({
  code: {
    type: String,
    required: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  nativeName: {
    type: String,
    required: true,
    trim: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  rtl: {
    type: Boolean,
    default: false,
  },
  flag: {
    type: String,
    trim: true,
  },
}, { _id: false });

// Main region configuration schema
const RegionConfigSchema = new Schema({
  // Region code (ISO 3166-1 alpha-2)
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  
  // Region name
  name: {
    type: String,
    required: true,
    trim: true,
  },
  
  // Local name
  localName: {
    type: String,
    trim: true,
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'preparing', 'inactive', 'suspended'],
    default: 'preparing',
    index: true,
  },
  
  // Default currency
  defaultCurrency: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
  },
  
  // Supported currencies
  supportedCurrencies: [{
    type: String,
    trim: true,
    uppercase: true,
  }],
  
  // Timezone
  timezone: {
    type: String,
    required: true,
    trim: true,
  },
  
  // Date format
  dateFormat: {
    type: String,
    default: 'DD/MM/YYYY',
  },
  
  // Time format
  timeFormat: {
    type: String,
    default: '24h',
    enum: ['12h', '24h'],
  },
  
  // Number format
  numberFormat: {
    decimalSeparator: {
      type: String,
      default: '.',
    },
    thousandSeparator: {
      type: String,
      default: ',',
    },
    currencyPosition: {
      type: String,
      enum: ['before', 'after'],
      default: 'before',
    },
  },
  
  // Supported languages
  languages: [LanguageConfigSchema],
  
  // Compliance requirements
  compliance: [ComplianceRequirementSchema],
  
  // Payment providers
  paymentProviders: [PaymentProviderConfigSchema],
  
  // Phone format
  phoneFormat: {
    countryCode: {
      type: String,
      required: true,
      trim: true,
    },
    pattern: {
      type: String,
      trim: true,
    },
    example: {
      type: String,
      trim: true,
    },
  },
  
  // Address format
  addressFormat: {
    fields: [{
      name: String,
      required: Boolean,
      type: String,
    }],
    postalCodeRequired: {
      type: Boolean,
      default: true,
    },
  },
  
  // Tax configuration
  taxConfig: {
    enabled: {
      type: Boolean,
      default: false,
    },
    name: {
      type: String,
      trim: true,
    },
    rate: {
      type: Number,
      default: 0,
    },
    registrationRequired: {
      type: Boolean,
      default: false,
    },
  },
  
  // KYC configuration
  kycConfig: {
    required: {
      type: Boolean,
      default: true,
    },
    minimumAge: {
      type: Number,
      default: 18,
    },
    documentTypes: [{
      type: String,
      trim: true,
    }],
    verificationMethods: [{
      type: String,
      enum: ['manual', 'automated', 'hybrid'],
    }],
  },
  
  // Feature flags for this region
  features: {
    referrals: {
      type: Boolean,
      default: true,
    },
    payouts: {
      type: Boolean,
      default: true,
    },
    kyc: {
      type: Boolean,
      default: true,
    },
    whatsapp: {
      type: Boolean,
      default: false,
    },
    emailMarketing: {
      type: Boolean,
      default: true,
    },
    subscriptions: {
      type: Boolean,
      default: true,
    },
    enterprise: {
      type: Boolean,
      default: false,
    },
  },
  
  // Referral limits
  referralLimits: {
    maxPayoutAmount: {
      type: Number,
      default: null,
    },
    minPayoutAmount: {
      type: Number,
      default: 0,
    },
    dailyReferralLimit: {
      type: Number,
      default: null,
    },
  },
  
  // Launch date
  launchDate: {
    type: Date,
  },
  
  // Metadata
  notes: {
    type: String,
    trim: true,
  },
  
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Static method to get active regions
RegionConfigSchema.statics.getActiveRegions = async function() {
  return await this.find({ status: 'active' }).lean();
};

// Static method to get region by code
RegionConfigSchema.statics.getByCode = async function(code) {
  return await this.findOne({ code: code.toUpperCase() }).lean();
};

// Static method to get default language for region
RegionConfigSchema.statics.getDefaultLanguage = async function(code) {
  const region = await this.findOne({ code: code.toUpperCase() }).lean();
  if (!region) return null;
  
  const defaultLang = region.languages.find(l => l.isDefault);
  return defaultLang || region.languages[0];
};

// Static method to get supported payment providers for region
RegionConfigSchema.statics.getPaymentProviders = async function(code, currency = null) {
  const region = await this.findOne({ code: code.toUpperCase() }).lean();
  if (!region) return [];
  
  let providers = region.paymentProviders.filter(p => p.isActive);
  
  if (currency) {
    providers = providers.filter(p => 
      p.supportedCurrencies.includes(currency.toUpperCase())
    );
  }
  
  return providers;
};

// Instance method to check if feature is enabled
RegionConfigSchema.methods.isFeatureEnabled = function(feature) {
  return this.features[feature] === true;
};

// Instance method to get active languages
RegionConfigSchema.methods.getActiveLanguages = function() {
  return this.languages.filter(l => l.isActive);
};

const RegionConfig = mongoose.model('RegionConfig', RegionConfigSchema);

module.exports = RegionConfig;
