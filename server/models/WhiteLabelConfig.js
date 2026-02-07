/**
 * WhiteLabelConfig Model
 * Manages white-label configurations for partners
 * Allows partners to customize the platform with their branding
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// SEO settings schema (embedded)
const SEOSettingsSchema = new Schema({
  title: {
    type: String,
    trim: true,
    maxlength: 70,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 160,
  },
  keywords: [{
    type: String,
    trim: true,
  }],
  ogImage: {
    type: String,
  },
  twitterCard: {
    type: String,
    enum: ['summary', 'summary_large_image', 'app', 'player'],
    default: 'summary_large_image',
  },
  favicon: {
    type: String,
  },
  robots: {
    type: String,
    default: 'index, follow',
  },
  canonicalUrl: {
    type: String,
    trim: true,
  },
  structuredData: {
    type: Schema.Types.Mixed,
  },
}, { _id: false });

// Custom page schema (embedded)
const CustomPageSchema = new Schema({
  pageId: {
    type: String,
    required: true,
  },
  slug: {
    type: String,
    required: true,
    trim: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    type: String,
    required: true,
  },
  metaDescription: {
    type: String,
    trim: true,
  },
  isPublished: {
    type: Boolean,
    default: false,
  },
  showInNavigation: {
    type: Boolean,
    default: true,
  },
  navigationOrder: {
    type: Number,
    default: 0,
  },
  parentPage: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: true });

// Email template schema (embedded)
const EmailTemplateSchema = new Schema({
  templateId: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  htmlContent: {
    type: String,
    required: true,
  },
  textContent: {
    type: String,
  },
  fromName: {
    type: String,
  },
  fromEmail: {
    type: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { _id: true });

// SSL certificate schema (embedded)
const SSLCertificateSchema = new Schema({
  provider: {
    type: String,
    enum: ['letsencrypt', 'custom', 'cloudflare'],
    default: 'letsencrypt',
  },
  certificate: {
    type: String,
  },
  privateKey: {
    type: String,
  },
  chain: {
    type: String,
  },
  issuedAt: {
    type: Date,
  },
  expiresAt: {
    type: Date,
  },
  autoRenew: {
    type: Boolean,
    default: true,
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'expired', 'error'],
    default: 'pending',
  },
  lastCheckedAt: {
    type: Date,
  },
}, { _id: false });

// Analytics configuration schema (embedded)
const AnalyticsConfigSchema = new Schema({
  googleAnalyticsId: {
    type: String,
    trim: true,
  },
  googleTagManagerId: {
    type: String,
    trim: true,
  },
  facebookPixelId: {
    type: String,
    trim: true,
  },
  hotjarId: {
    type: String,
    trim: true,
  },
  mixpanelToken: {
    type: String,
    trim: true,
  },
  customScripts: [{
    name: String,
    script: String,
    placement: {
      type: String,
      enum: ['head', 'body_start', 'body_end'],
      default: 'head',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  }],
}, { _id: false });

// Main WhiteLabelConfig schema
const WhiteLabelConfigSchema = new Schema({
  configId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  partnerId: {
    type: Schema.Types.ObjectId,
    ref: 'Partner',
    required: true,
    index: true,
  },
  // Domain configuration
  domain: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  subdomain: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true,
  },
  customDomain: {
    type: String,
    trim: true,
    lowercase: true,
  },
  domainStatus: {
    type: String,
    enum: ['pending', 'configuring', 'active', 'error', 'suspended'],
    default: 'pending',
  },
  domainConfiguredAt: {
    type: Date,
  },
  // Branding
  brandName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  logo: {
    light: {
      type: String, // URL to light logo
    },
    dark: {
      type: String, // URL to dark logo
    },
    favicon: {
      type: String,
    },
    appleTouchIcon: {
      type: String,
    },
  },
  // Colors
  colors: {
    primary: {
      type: String,
      default: '#3B82F6',
    },
    secondary: {
      type: String,
      default: '#10B981',
    },
    accent: {
      type: String,
      default: '#F59E0B',
    },
    background: {
      type: String,
      default: '#FFFFFF',
    },
    surface: {
      type: String,
      default: '#F3F4F6',
    },
    text: {
      type: String,
      default: '#1F2937',
    },
    textMuted: {
      type: String,
      default: '#6B7280',
    },
    success: {
      type: String,
      default: '#10B981',
    },
    warning: {
      type: String,
      default: '#F59E0B',
    },
    error: {
      type: String,
      default: '#EF4444',
    },
    info: {
      type: String,
      default: '#3B82F6',
    },
  },
  // Typography
  typography: {
    headingFont: {
      type: String,
      default: 'Inter',
    },
    bodyFont: {
      type: String,
      default: 'Inter',
    },
    baseFontSize: {
      type: Number,
      default: 16,
    },
    lineHeight: {
      type: Number,
      default: 1.5,
    },
  },
  // Custom CSS
  customCss: {
    type: String,
    maxlength: 50000,
  },
  customJs: {
    type: String,
    maxlength: 50000,
  },
  // Feature toggles
  enabledFeatures: {
    jobPosting: {
      type: Boolean,
      default: true,
    },
    referralSystem: {
      type: Boolean,
      default: true,
    },
    gamification: {
      type: Boolean,
      default: true,
    },
    subscriptions: {
      type: Boolean,
      default: true,
    },
    analytics: {
      type: Boolean,
      default: true,
    },
    community: {
      type: Boolean,
      default: false,
    },
    messaging: {
      type: Boolean,
      default: true,
    },
    notifications: {
      type: Boolean,
      default: true,
    },
    apiAccess: {
      type: Boolean,
      default: false,
    },
    whiteLabelBranding: {
      type: Boolean,
      default: true,
    },
    customPages: {
      type: Boolean,
      default: true,
    },
    advancedAnalytics: {
      type: Boolean,
      default: false,
    },
  },
  // Homepage configuration
  homepage: {
    heroTitle: {
      type: String,
      default: 'Find Your Dream Job',
    },
    heroSubtitle: {
      type: String,
      default: 'Connect with top employers and opportunities',
    },
    heroBackground: {
      type: String,
    },
    heroVideo: {
      type: String,
    },
    showStats: {
      type: Boolean,
      default: true,
    },
    showTestimonials: {
      type: Boolean,
      default: true,
    },
    showFeaturedJobs: {
      type: Boolean,
      default: true,
    },
    showPartners: {
      type: Boolean,
      default: false,
    },
    customSections: [{
      order: Number,
      type: {
        type: String,
        enum: ['content', 'features', 'testimonials', 'stats', 'cta', 'custom'],
      },
      title: String,
      content: String,
      isActive: {
        type: Boolean,
        default: true,
      },
    }],
  },
  // Custom pages
  customPages: [CustomPageSchema],
  // Email templates
  emailTemplates: [EmailTemplateSchema],
  // Navigation
  navigation: {
    mainMenu: [{
      label: String,
      url: String,
      icon: String,
      order: Number,
      isExternal: {
        type: Boolean,
        default: false,
      },
      children: [{
        label: String,
        url: String,
        icon: String,
        order: Number,
      }],
    }],
    footerLinks: [{
      label: String,
      url: String,
      section: String,
      order: Number,
    }],
    socialLinks: [{
      platform: {
        type: String,
        enum: ['facebook', 'twitter', 'linkedin', 'instagram', 'youtube', 'github', 'custom'],
      },
      url: String,
      icon: String,
    }],
  },
  // SEO
  seoSettings: {
    type: SEOSettingsSchema,
    default: () => ({}),
  },
  // Analytics
  analytics: {
    type: AnalyticsConfigSchema,
    default: () => ({}),
  },
  // SSL Certificate
  sslCertificate: {
    type: SSLCertificateSchema,
    default: () => ({}),
  },
  // Terms and legal
  legal: {
    termsOfService: {
      type: String,
    },
    privacyPolicy: {
      type: String,
    },
    cookiePolicy: {
      type: String,
    },
    customLegalPages: [{
      title: String,
      slug: String,
      content: String,
    }],
  },
  // Deployment
  deployment: {
    status: {
      type: String,
      enum: ['draft', 'pending', 'deploying', 'active', 'failed', 'suspended'],
      default: 'draft',
    },
    lastDeployedAt: {
      type: Date,
    },
    lastDeployedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    deploymentVersion: {
      type: Number,
      default: 0,
    },
    cdnUrl: {
      type: String,
    },
  },
  // Status
  isActive: {
    type: Boolean,
    default: true,
  },
  isPublic: {
    type: Boolean,
    default: true,
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: { createdAt: true, updatedAt: true },
});

// Indexes
WhiteLabelConfigSchema.index({ partnerId: 1, isActive: 1 });
WhiteLabelConfigSchema.index({ domain: 1 });
WhiteLabelConfigSchema.index({ subdomain: 1 });
WhiteLabelConfigSchema.index({ 'deployment.status': 1 });

// Virtual for full URL
WhiteLabelConfigSchema.virtual('fullUrl').get(function() {
  if (this.customDomain) {
    return `https://${this.customDomain}`;
  }
  if (this.subdomain) {
    return `https://${this.subdomain}.trm.referrals`;
  }
  return `https://${this.domain}`;
});

// Method to get active custom pages
WhiteLabelConfigSchema.methods.getActivePages = function() {
  return this.customPages.filter(page => page.isPublished);
};

// Method to get feature status
WhiteLabelConfigSchema.methods.isFeatureEnabled = function(featureName) {
  return this.enabledFeatures[featureName] === true;
};

// Method to deploy configuration
WhiteLabelConfigSchema.methods.deploy = async function(userId) {
  this.deployment.status = 'deploying';
  this.deployment.lastDeployedAt = new Date();
  this.deployment.lastDeployedBy = userId;
  this.deployment.deploymentVersion += 1;
  
  // Simulate deployment process
  // In production, this would trigger actual deployment
  this.deployment.status = 'active';
  
  return this.save();
};

// Static method to find by domain
WhiteLabelConfigSchema.statics.findByDomain = function(domain) {
  return this.findOne({ 
    $or: [
      { domain: domain.toLowerCase() },
      { subdomain: domain.toLowerCase() },
      { customDomain: domain.toLowerCase() },
    ],
    isActive: true,
  }).populate('partnerId');
};

// Static method to get active configs
WhiteLabelConfigSchema.statics.getActiveConfigs = function() {
  return this.find({ isActive: true, 'deployment.status': 'active' });
};

const WhiteLabelConfig = mongoose.model('WhiteLabelConfig', WhiteLabelConfigSchema);

module.exports = WhiteLabelConfig;
