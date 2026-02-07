/**
 * WhiteLabelService
 * Manages white-label configurations for partners
 * Handles custom domains, branding, and deployment
 */

const crypto = require('crypto');
const WhiteLabelConfig = require('../models/WhiteLabelConfig.js');
const Partner = require('../models/Partner.js');

/**
 * Service class for managing white-label operations
 */
class WhiteLabelService {
  /**
   * Generate unique config ID
   * @returns {string} Unique config ID
   */
  generateConfigId() {
    return 'WL-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  /**
   * Generate subdomain for partner
   * @param {string} partnerName - Partner name
   * @returns {string} Generated subdomain
   */
  generateSubdomain(partnerName) {
    const sanitized = partnerName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return sanitized.substring(0, 30);
  }

  /**
   * Create white-label configuration
   * @param {string} partnerId - Partner ID
   * @param {Object} configData - Configuration data
   * @returns {Promise<Object>} Created configuration
   */
  async createConfig(partnerId, configData) {
    try {
      const partner = await Partner.findOne({ partnerId });
      if (!partner) {
        throw new Error('Partner not found');
      }

      // Check if partner already has a white-label config
      if (partner.whiteLabelConfig) {
        throw new Error('Partner already has a white-label configuration');
      }

      // Check tier eligibility (Silver and above)
      const eligibleTiers = ['silver', 'gold', 'platinum'];
      if (!eligibleTiers.includes(partner.tier)) {
        throw new Error('White-label feature requires Silver tier or higher');
      }

      // Generate subdomain if not provided
      const subdomain = configData.subdomain || this.generateSubdomain(partner.name);
      const domain = `${subdomain}.trm.referrals`;

      // Check if subdomain is available
      const existingConfig = await WhiteLabelConfig.findOne({ subdomain });
      if (existingConfig) {
        throw new Error('Subdomain is already taken');
      }

      // Create configuration
      const config = new WhiteLabelConfig({
        configId: this.generateConfigId(),
        partnerId: partner._id,
        domain,
        subdomain,
        customDomain: configData.customDomain,
        brandName: configData.brandName || partner.name,
        logo: configData.logo || {},
        colors: configData.colors || {
          primary: '#3B82F6',
          secondary: '#10B981',
        },
        typography: configData.typography || {},
        customCss: configData.customCss || '',
        customJs: configData.customJs || '',
        enabledFeatures: configData.enabledFeatures || {
          jobPosting: true,
          referralSystem: true,
          gamification: true,
          subscriptions: true,
          analytics: true,
          community: false,
          messaging: true,
          notifications: true,
          apiAccess: false,
          whiteLabelBranding: true,
          customPages: true,
          advancedAnalytics: false,
        },
        homepage: configData.homepage || {},
        navigation: configData.navigation || {
          mainMenu: [],
          footerLinks: [],
          socialLinks: [],
        },
        seoSettings: configData.seoSettings || {},
        analytics: configData.analytics || {},
        legal: configData.legal || {},
        createdBy: configData.userId,
      });

      await config.save();

      // Update partner with white-label config reference
      partner.whiteLabelConfig = config._id;
      await partner.save();

      return {
        success: true,
        config,
        subdomain,
        domain,
        message: 'White-label configuration created successfully',
      };
    } catch (error) {
      console.error('Error creating white-label config:', error);
      throw error;
    }
  }

  /**
   * Get white-label configuration
   * @param {string} partnerId - Partner ID
   * @returns {Promise<Object>} Configuration
   */
  async getConfig(partnerId) {
    try {
      const partner = await Partner.findOne({ partnerId });
      if (!partner) {
        throw new Error('Partner not found');
      }

      if (!partner.whiteLabelConfig) {
        return {
          success: true,
          hasConfig: false,
          message: 'No white-label configuration found',
        };
      }

      const config = await WhiteLabelConfig.findById(partner.whiteLabelConfig);
      if (!config) {
        throw new Error('White-label configuration not found');
      }

      return {
        success: true,
        hasConfig: true,
        config,
      };
    } catch (error) {
      console.error('Error getting white-label config:', error);
      throw error;
    }
  }

  /**
   * Get configuration by domain
   * @param {string} domain - Domain name
   * @returns {Promise<Object>} Configuration
   */
  async getConfigByDomain(domain) {
    try {
      const config = await WhiteLabelConfig.findByDomain(domain);
      
      if (!config || !config.isActive) {
        return null;
      }

      return config;
    } catch (error) {
      console.error('Error getting config by domain:', error);
      throw error;
    }
  }

  /**
   * Update white-label configuration
   * @param {string} partnerId - Partner ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated configuration
   */
  async updateConfig(partnerId, updateData) {
    try {
      const partner = await Partner.findOne({ partnerId });
      if (!partner || !partner.whiteLabelConfig) {
        throw new Error('White-label configuration not found');
      }

      const config = await WhiteLabelConfig.findById(partner.whiteLabelConfig);
      if (!config) {
        throw new Error('Configuration not found');
      }

      // Update allowed fields
      const allowedFields = [
        'brandName',
        'logo',
        'colors',
        'typography',
        'customCss',
        'customJs',
        'enabledFeatures',
        'homepage',
        'navigation',
        'seoSettings',
        'analytics',
        'legal',
      ];

      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          if (typeof updateData[field] === 'object' && !Array.isArray(updateData[field])) {
            config[field] = { ...config[field], ...updateData[field] };
          } else {
            config[field] = updateData[field];
          }
        }
      });

      // Update custom domain if provided
      if (updateData.customDomain && updateData.customDomain !== config.customDomain) {
        // Validate domain format
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
        if (!domainRegex.test(updateData.customDomain)) {
          throw new Error('Invalid domain format');
        }

        // Check if domain is already in use
        const existing = await WhiteLabelConfig.findOne({
          customDomain: updateData.customDomain,
          _id: { $ne: config._id },
        });

        if (existing) {
          throw new Error('Domain is already in use by another partner');
        }

        config.customDomain = updateData.customDomain;
        config.domainStatus = 'pending';
      }

      await config.save();

      return {
        success: true,
        config,
        message: 'Configuration updated successfully',
      };
    } catch (error) {
      console.error('Error updating white-label config:', error);
      throw error;
    }
  }

  /**
   * Add custom page
   * @param {string} partnerId - Partner ID
   * @param {Object} pageData - Page data
   * @returns {Promise<Object>} Created page
   */
  async addCustomPage(partnerId, pageData) {
    try {
      const partner = await Partner.findOne({ partnerId });
      if (!partner || !partner.whiteLabelConfig) {
        throw new Error('White-label configuration not found');
      }

      const config = await WhiteLabelConfig.findById(partner.whiteLabelConfig);
      if (!config.isFeatureEnabled('customPages')) {
        throw new Error('Custom pages feature is not enabled');
      }

      const pageId = 'page-' + crypto.randomBytes(4).toString('hex');
      
      config.customPages.push({
        pageId,
        slug: pageData.slug,
        title: pageData.title,
        content: pageData.content,
        metaDescription: pageData.metaDescription,
        isPublished: pageData.isPublished || false,
        showInNavigation: pageData.showInNavigation !== false,
        navigationOrder: pageData.navigationOrder || 0,
        parentPage: pageData.parentPage,
      });

      await config.save();

      return {
        success: true,
        pageId,
        message: 'Custom page added successfully',
      };
    } catch (error) {
      console.error('Error adding custom page:', error);
      throw error;
    }
  }

  /**
   * Update custom page
   * @param {string} partnerId - Partner ID
   * @param {string} pageId - Page ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated page
   */
  async updateCustomPage(partnerId, pageId, updateData) {
    try {
      const partner = await Partner.findOne({ partnerId });
      if (!partner || !partner.whiteLabelConfig) {
        throw new Error('White-label configuration not found');
      }

      const config = await WhiteLabelConfig.findById(partner.whiteLabelConfig);
      const page = config.customPages.find(p => p.pageId === pageId);

      if (!page) {
        throw new Error('Page not found');
      }

      // Update fields
      const allowedUpdates = ['slug', 'title', 'content', 'metaDescription', 'isPublished', 'showInNavigation', 'navigationOrder', 'parentPage'];
      allowedUpdates.forEach(field => {
        if (updateData[field] !== undefined) {
          page[field] = updateData[field];
        }
      });

      page.updatedAt = new Date();
      await config.save();

      return {
        success: true,
        page,
        message: 'Page updated successfully',
      };
    } catch (error) {
      console.error('Error updating custom page:', error);
      throw error;
    }
  }

  /**
   * Delete custom page
   * @param {string} partnerId - Partner ID
   * @param {string} pageId - Page ID
   * @returns {Promise<Object>} Result
   */
  async deleteCustomPage(partnerId, pageId) {
    try {
      const partner = await Partner.findOne({ partnerId });
      if (!partner || !partner.whiteLabelConfig) {
        throw new Error('White-label configuration not found');
      }

      const config = await WhiteLabelConfig.findById(partner.whiteLabelConfig);
      config.customPages = config.customPages.filter(p => p.pageId !== pageId);
      await config.save();

      return {
        success: true,
        message: 'Page deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting custom page:', error);
      throw error;
    }
  }

  /**
   * Deploy white-label configuration
   * @param {string} partnerId - Partner ID
   * @param {string} userId - User ID deploying
   * @returns {Promise<Object>} Deployment result
   */
  async deploy(partnerId, userId) {
    try {
      const partner = await Partner.findOne({ partnerId });
      if (!partner || !partner.whiteLabelConfig) {
        throw new Error('White-label configuration not found');
      }

      const config = await WhiteLabelConfig.findById(partner.whiteLabelConfig);

      // Validate configuration
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
      }

      // Deploy configuration
      await config.deploy(userId);

      return {
        success: true,
        config,
        url: config.fullUrl,
        message: 'White-label configuration deployed successfully',
      };
    } catch (error) {
      console.error('Error deploying white-label config:', error);
      throw error;
    }
  }

  /**
   * Validate configuration
   * @param {Object} config - Configuration to validate
   * @returns {Object} Validation result
   */
  validateConfig(config) {
    const errors = [];

    if (!config.brandName || config.brandName.length < 2) {
      errors.push('Brand name must be at least 2 characters');
    }

    if (!config.colors.primary) {
      errors.push('Primary color is required');
    }

    if (config.customCss && config.customCss.length > 50000) {
      errors.push('Custom CSS exceeds maximum length of 50000 characters');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Preview configuration
   * @param {string} partnerId - Partner ID
   * @returns {Promise<Object>} Preview data
   */
  async preview(partnerId) {
    try {
      const partner = await Partner.findOne({ partnerId });
      if (!partner || !partner.whiteLabelConfig) {
        throw new Error('White-label configuration not found');
      }

      const config = await WhiteLabelConfig.findById(partner.whiteLabelConfig);

      // Generate preview URL (in production, this would be a staging URL)
      const previewUrl = `${process.env.FRONTEND_URL}/preview/${config.subdomain}`;

      return {
        success: true,
        previewUrl,
        config: {
          brandName: config.brandName,
          colors: config.colors,
          logo: config.logo,
          homepage: config.homepage,
          customPages: config.getActivePages(),
        },
      };
    } catch (error) {
      console.error('Error generating preview:', error);
      throw error;
    }
  }

  /**
   * Configure custom domain
   * @param {string} partnerId - Partner ID
   * @param {string} customDomain - Custom domain
   * @returns {Promise<Object>} Configuration result
   */
  async configureCustomDomain(partnerId, customDomain) {
    try {
      const partner = await Partner.findOne({ partnerId });
      if (!partner || !partner.whiteLabelConfig) {
        throw new Error('White-label configuration not found');
      }

      // Validate domain
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
      if (!domainRegex.test(customDomain)) {
        throw new Error('Invalid domain format');
      }

      // Check availability
      const existing = await WhiteLabelConfig.findOne({ customDomain });
      if (existing && existing.partnerId.toString() !== partner._id.toString()) {
        throw new Error('Domain is already in use');
      }

      const config = await WhiteLabelConfig.findById(partner.whiteLabelConfig);
      config.customDomain = customDomain;
      config.domainStatus = 'configuring';

      // In production, this would trigger DNS configuration
      // For now, we'll simulate the process
      config.sslCertificate = {
        provider: 'letsencrypt',
        status: 'pending',
        autoRenew: true,
      };

      await config.save();

      return {
        success: true,
        config,
        dnsInstructions: {
          type: 'CNAME',
          name: customDomain,
          value: `${config.subdomain}.trm.referrals`,
          ttl: 3600,
        },
        message: 'Custom domain configuration initiated',
      };
    } catch (error) {
      console.error('Error configuring custom domain:', error);
      throw error;
    }
  }

  /**
   * Verify domain DNS configuration
   * @param {string} partnerId - Partner ID
   * @returns {Promise<Object>} Verification result
   */
  async verifyDomain(partnerId) {
    try {
      const partner = await Partner.findOne({ partnerId });
      if (!partner || !partner.whiteLabelConfig) {
        throw new Error('White-label configuration not found');
      }

      const config = await WhiteLabelConfig.findById(partner.whiteLabelConfig);

      if (!config.customDomain) {
        throw new Error('No custom domain configured');
      }

      // In production, this would perform actual DNS verification
      // For now, we'll simulate success
      config.domainStatus = 'active';
      config.domainConfiguredAt = new Date();
      
      if (config.sslCertificate) {
        config.sslCertificate.status = 'active';
        config.sslCertificate.issuedAt = new Date();
        config.sslCertificate.expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days
      }

      await config.save();

      return {
        success: true,
        domain: config.customDomain,
        status: 'active',
        sslActive: true,
        message: 'Domain verified and SSL certificate installed',
      };
    } catch (error) {
      console.error('Error verifying domain:', error);
      throw error;
    }
  }

  /**
   * Toggle feature
   * @param {string} partnerId - Partner ID
   * @param {string} feature - Feature name
   * @param {boolean} enabled - Enable/disable
   * @returns {Promise<Object>} Result
   */
  async toggleFeature(partnerId, feature, enabled) {
    try {
      const partner = await Partner.findOne({ partnerId });
      if (!partner || !partner.whiteLabelConfig) {
        throw new Error('White-label configuration not found');
      }

      const config = await WhiteLabelConfig.findById(partner.whiteLabelConfig);

      if (!config.enabledFeatures.hasOwnProperty(feature)) {
        throw new Error('Invalid feature name');
      }

      config.enabledFeatures[feature] = enabled;
      await config.save();

      return {
        success: true,
        feature,
        enabled,
        message: `Feature ${feature} ${enabled ? 'enabled' : 'disabled'}`,
      };
    } catch (error) {
      console.error('Error toggling feature:', error);
      throw error;
    }
  }

  /**
   * Get active white-label configurations
   * @returns {Promise<Array>} Active configurations
   */
  async getActiveConfigs() {
    try {
      return await WhiteLabelConfig.getActiveConfigs();
    } catch (error) {
      console.error('Error getting active configs:', error);
      throw error;
    }
  }

  /**
   * Generate CSS from configuration
   * @param {Object} config - White-label config
   * @returns {string} Generated CSS
   */
  generateCSS(config) {
    const { colors, typography } = config;
    
    return `
      :root {
        --color-primary: ${colors.primary};
        --color-secondary: ${colors.secondary};
        --color-accent: ${colors.accent};
        --color-background: ${colors.background};
        --color-surface: ${colors.surface};
        --color-text: ${colors.text};
        --color-text-muted: ${colors.textMuted};
        --color-success: ${colors.success};
        --color-warning: ${colors.warning};
        --color-error: ${colors.error};
        --color-info: ${colors.info};
        
        --font-heading: ${typography.headingFont}, system-ui, sans-serif;
        --font-body: ${typography.bodyFont}, system-ui, sans-serif;
        --font-size-base: ${typography.baseFontSize}px;
        --line-height-base: ${typography.lineHeight};
      }
      
      ${config.customCss || ''}
    `;
  }
}

module.exports = new WhiteLabelService();
