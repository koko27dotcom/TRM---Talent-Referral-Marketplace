/**
 * MarketplaceService
 * Manages plugins and integrations marketplace
 * Handles plugin versioning, installation, and revenue sharing
 */

const crypto = require('crypto');
const Plugin = require('../models/Plugin.js');
const Integration = require('../models/Integration.js');
const User = require('../models/User.js');

/**
 * Service class for managing marketplace operations
 */
class MarketplaceService {
  /**
   * Generate unique plugin ID
   * @returns {string} Unique plugin ID
   */
  generatePluginId() {
    return 'PLG-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  /**
   * Generate unique integration ID
   * @returns {string} Unique integration ID
   */
  generateIntegrationId() {
    return 'INT-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  /**
   * Create a new plugin
   * @param {string} userId - Developer user ID
   * @param {Object} pluginData - Plugin data
   * @returns {Promise<Object>} Created plugin
   */
  async createPlugin(userId, pluginData) {
    try {
      // Get user info for author
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate slug
      const slug = this.generateSlug(pluginData.name);

      // Check if slug is unique
      const existing = await Plugin.findOne({ slug });
      if (existing) {
        throw new Error('A plugin with this name already exists');
      }

      const plugin = new Plugin({
        pluginId: this.generatePluginId(),
        slug,
        name: pluginData.name,
        description: pluginData.description,
        shortDescription: pluginData.shortDescription,
        version: pluginData.version || '1.0.0',
        category: pluginData.category,
        subcategory: pluginData.subcategory,
        tags: pluginData.tags || [],
        author: {
          userId: user._id,
          name: pluginData.authorName || user.name,
          email: user.email,
          website: pluginData.authorWebsite,
          logo: pluginData.authorLogo,
          bio: pluginData.authorBio,
        },
        features: pluginData.features || [],
        icon: pluginData.icon,
        banner: pluginData.banner,
        screenshots: pluginData.screenshots || [],
        videoUrl: pluginData.videoUrl,
        demoUrl: pluginData.demoUrl,
        documentationUrl: pluginData.documentationUrl,
        supportUrl: pluginData.supportUrl,
        repositoryUrl: pluginData.repositoryUrl,
        installationUrl: pluginData.installationUrl,
        installationInstructions: pluginData.installationInstructions,
        requirements: pluginData.requirements || [],
        compatibleWith: pluginData.compatibleWith || [],
        pricing: pluginData.pricing || { type: 'free', price: 0 },
        revenueShare: pluginData.revenueShare || {
          developerPercent: 70,
          platformPercent: 30,
        },
        status: 'draft',
      });

      await plugin.save();

      return {
        success: true,
        plugin,
        message: 'Plugin created successfully',
      };
    } catch (error) {
      console.error('Error creating plugin:', error);
      throw error;
    }
  }

  /**
   * Generate URL-friendly slug
   * @param {string} name - Plugin name
   * @returns {string} Slug
   */
  generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Get plugins list
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>} Plugins list
   */
  async getPlugins(filters = {}) {
    try {
      const query = { status: 'published' };

      if (filters.category) {
        query.category = filters.category;
      }

      if (filters.featured) {
        query.isFeatured = true;
      }

      if (filters.verified) {
        query.isVerified = true;
      }

      if (filters.price === 'free') {
        query['pricing.type'] = 'free';
      } else if (filters.price === 'paid') {
        query['pricing.type'] = { $in: ['paid', 'subscription', 'freemium'] };
      }

      if (filters.tags) {
        query.tags = { $in: filters.tags.split(',') };
      }

      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const skip = (page - 1) * limit;

      let sortOption = {};
      switch (filters.sort) {
        case 'popular':
          sortOption = { 'stats.downloads': -1 };
          break;
        case 'rating':
          sortOption = { 'stats.rating': -1 };
          break;
        case 'newest':
          sortOption = { publishedAt: -1 };
          break;
        case 'price_asc':
          sortOption = { 'pricing.price': 1 };
          break;
        case 'price_desc':
          sortOption = { 'pricing.price': -1 };
          break;
        default:
          sortOption = { isFeatured: -1, displayOrder: 1, 'stats.rating': -1 };
      }

      const [plugins, total] = await Promise.all([
        Plugin.find(query)
          .select('-installations -reviews')
          .sort(sortOption)
          .skip(skip)
          .limit(limit)
          .lean(),
        Plugin.countDocuments(query),
      ]);

      return {
        success: true,
        plugins,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error getting plugins:', error);
      throw error;
    }
  }

  /**
   * Get plugin details
   * @param {string} pluginId - Plugin ID or slug
   * @param {string} userId - Optional user ID for checking installation
   * @returns {Promise<Object>} Plugin details
   */
  async getPlugin(pluginId, userId = null) {
    try {
      const query = pluginId.startsWith('PLG-') 
        ? { pluginId } 
        : { slug: pluginId };

      const plugin = await Plugin.findOne(query);
      if (!plugin) {
        throw new Error('Plugin not found');
      }

      // Increment views
      await plugin.incrementViews();

      // Check if user has installed
      let isInstalled = false;
      let userInstallation = null;
      if (userId) {
        userInstallation = plugin.installations.find(
          i => i.userId.toString() === userId
        );
        isInstalled = !!userInstallation;
      }

      return {
        success: true,
        plugin: {
          ...plugin.toObject(),
          isInstalled,
          userVersion: userInstallation?.version || null,
        },
      };
    } catch (error) {
      console.error('Error getting plugin:', error);
      throw error;
    }
  }

  /**
   * Install plugin
   * @param {string} pluginId - Plugin ID
   * @param {string} userId - User ID
   * @param {string} companyId - Company ID (optional)
   * @returns {Promise<Object>} Installation result
   */
  async installPlugin(pluginId, userId, companyId = null) {
    try {
      const plugin = await Plugin.findOne({ pluginId });
      if (!plugin) {
        throw new Error('Plugin not found');
      }

      if (plugin.status !== 'published') {
        throw new Error('Plugin is not available for installation');
      }

      // Check if already installed
      const existingInstall = plugin.installations.find(
        i => i.userId.toString() === userId
      );

      if (existingInstall) {
        throw new Error('Plugin is already installed');
      }

      // Record installation
      await plugin.recordInstallation(userId, companyId, plugin.version);

      return {
        success: true,
        plugin: {
          pluginId: plugin.pluginId,
          name: plugin.name,
          version: plugin.version,
        },
        message: 'Plugin installed successfully',
      };
    } catch (error) {
      console.error('Error installing plugin:', error);
      throw error;
    }
  }

  /**
   * Uninstall plugin
   * @param {string} pluginId - Plugin ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Uninstallation result
   */
  async uninstallPlugin(pluginId, userId) {
    try {
      const plugin = await Plugin.findOne({ pluginId });
      if (!plugin) {
        throw new Error('Plugin not found');
      }

      await plugin.recordUninstallation(userId);

      return {
        success: true,
        message: 'Plugin uninstalled successfully',
      };
    } catch (error) {
      console.error('Error uninstalling plugin:', error);
      throw error;
    }
  }

  /**
   * Add plugin review
   * @param {string} pluginId - Plugin ID
   * @param {string} userId - User ID
   * @param {Object} reviewData - Review data
   * @returns {Promise<Object>} Review result
   */
  async addReview(pluginId, userId, reviewData) {
    try {
      const plugin = await Plugin.findOne({ pluginId });
      if (!plugin) {
        throw new Error('Plugin not found');
      }

      // Check if user has installed the plugin
      const hasInstalled = plugin.installations.some(
        i => i.userId.toString() === userId
      );

      await plugin.addReview(userId, {
        ...reviewData,
        isVerifiedPurchase: hasInstalled,
        version: reviewData.version || plugin.version,
      });

      return {
        success: true,
        rating: plugin.stats.rating,
        reviewCount: plugin.stats.reviewCount,
        message: 'Review added successfully',
      };
    } catch (error) {
      console.error('Error adding review:', error);
      throw error;
    }
  }

  /**
   * Update plugin
   * @param {string} pluginId - Plugin ID
   * @param {string} userId - Developer user ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated plugin
   */
  async updatePlugin(pluginId, userId, updateData) {
    try {
      const plugin = await Plugin.findOne({ pluginId });
      if (!plugin) {
        throw new Error('Plugin not found');
      }

      // Verify ownership
      if (plugin.author.userId.toString() !== userId) {
        throw new Error('You do not have permission to update this plugin');
      }

      // Update allowed fields
      const allowedFields = [
        'description', 'shortDescription', 'features', 'icon', 'banner',
        'screenshots', 'videoUrl', 'demoUrl', 'documentationUrl',
        'supportUrl', 'installationInstructions', 'requirements',
        'compatibleWith', 'pricing', 'tags', 'subcategory',
      ];

      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          plugin[field] = updateData[field];
        }
      });

      await plugin.save();

      return {
        success: true,
        plugin,
        message: 'Plugin updated successfully',
      };
    } catch (error) {
      console.error('Error updating plugin:', error);
      throw error;
    }
  }

  /**
   * Add plugin version
   * @param {string} pluginId - Plugin ID
   * @param {string} userId - Developer user ID
   * @param {Object} versionData - Version data
   * @returns {Promise<Object>} Result
   */
  async addVersion(pluginId, userId, versionData) {
    try {
      const plugin = await Plugin.findOne({ pluginId });
      if (!plugin) {
        throw new Error('Plugin not found');
      }

      // Verify ownership
      if (plugin.author.userId.toString() !== userId) {
        throw new Error('You do not have permission to update this plugin');
      }

      await plugin.addVersion({
        version: versionData.version,
        changelog: versionData.changelog,
        downloadUrl: versionData.downloadUrl,
        minPlatformVersion: versionData.minPlatformVersion,
        maxPlatformVersion: versionData.maxPlatformVersion,
        fileSize: versionData.fileSize,
        checksum: versionData.checksum,
        isStable: versionData.isStable !== false,
        isPrerelease: versionData.isPrerelease || false,
      });

      return {
        success: true,
        version: versionData.version,
        message: 'Version added successfully',
      };
    } catch (error) {
      console.error('Error adding version:', error);
      throw error;
    }
  }

  /**
   * Get integrations list
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>} Integrations list
   */
  async getIntegrations(filters = {}) {
    try {
      const query = { status: 'active' };

      if (filters.category) {
        query.category = filters.category;
      }

      if (filters.featured) {
        query.isFeatured = true;
      }

      if (filters.verified) {
        query.isVerified = true;
      }

      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const skip = (page - 1) * limit;

      const [integrations, total] = await Promise.all([
        Integration.find(query)
          .sort({ isFeatured: -1, displayOrder: 1, 'stats.rating': -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Integration.countDocuments(query),
      ]);

      return {
        success: true,
        integrations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error getting integrations:', error);
      throw error;
    }
  }

  /**
   * Get integration details
   * @param {string} integrationId - Integration ID or slug
   * @returns {Promise<Object>} Integration details
   */
  async getIntegration(integrationId) {
    try {
      const query = integrationId.startsWith('INT-')
        ? { integrationId }
        : { slug: integrationId };

      const integration = await Integration.findOne(query);
      if (!integration) {
        throw new Error('Integration not found');
      }

      return {
        success: true,
        integration,
      };
    } catch (error) {
      console.error('Error getting integration:', error);
      throw error;
    }
  }

  /**
   * Search marketplace
   * @param {string} query - Search query
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>} Search results
   */
  async search(query, filters = {}) {
    try {
      if (!query || query.length < 2) {
        throw new Error('Search query must be at least 2 characters');
      }

      const [plugins, integrations] = await Promise.all([
        Plugin.search(query, { status: 'published', ...filters }),
        Integration.search(query, { status: 'active', ...filters }),
      ]);

      return {
        success: true,
        query,
        results: {
          plugins: plugins.slice(0, 10),
          integrations: integrations.slice(0, 10),
          total: plugins.length + integrations.length,
        },
      };
    } catch (error) {
      console.error('Error searching marketplace:', error);
      throw error;
    }
  }

  /**
   * Get featured items
   * @returns {Promise<Object>} Featured plugins and integrations
   */
  async getFeatured() {
    try {
      const [plugins, integrations] = await Promise.all([
        Plugin.getFeatured(6),
        Integration.getFeatured(6),
      ]);

      return {
        success: true,
        plugins,
        integrations,
      };
    } catch (error) {
      console.error('Error getting featured items:', error);
      throw error;
    }
  }

  /**
   * Get popular items
   * @param {number} limit - Number of items
   * @returns {Promise<Object>} Popular plugins and integrations
   */
  async getPopular(limit = 10) {
    try {
      const [plugins, integrations] = await Promise.all([
        Plugin.getPopular(limit),
        Integration.getPopular(limit),
      ]);

      return {
        success: true,
        plugins,
        integrations,
      };
    } catch (error) {
      console.error('Error getting popular items:', error);
      throw error;
    }
  }

  /**
   * Get categories
   * @returns {Promise<Object>} Categories
   */
  async getCategories() {
    try {
      const pluginCategories = await Plugin.distinct('category', { status: 'published' });
      const integrationCategories = await Integration.distinct('category', { status: 'active' });

      return {
        success: true,
        categories: {
          plugins: pluginCategories,
          integrations: integrationCategories,
        },
      };
    } catch (error) {
      console.error('Error getting categories:', error);
      throw error;
    }
  }

  /**
   * Get developer stats
   * @param {string} userId - Developer user ID
   * @returns {Promise<Object>} Developer statistics
   */
  async getDeveloperStats(userId) {
    try {
      const stats = await Plugin.getDeveloperStats(userId);
      const plugins = await Plugin.getByDeveloper(userId);

      return {
        success: true,
        stats,
        plugins: plugins.map(p => ({
          pluginId: p.pluginId,
          name: p.name,
          status: p.status,
          stats: p.stats,
          revenueShare: p.revenueShare,
        })),
      };
    } catch (error) {
      console.error('Error getting developer stats:', error);
      throw error;
    }
  }

  /**
   * Submit plugin for review
   * @param {string} pluginId - Plugin ID
   * @param {string} userId - Developer user ID
   * @returns {Promise<Object>} Result
   */
  async submitForReview(pluginId, userId) {
    try {
      const plugin = await Plugin.findOne({ pluginId });
      if (!plugin) {
        throw new Error('Plugin not found');
      }

      if (plugin.author.userId.toString() !== userId) {
        throw new Error('You do not have permission to submit this plugin');
      }

      if (plugin.status !== 'draft') {
        throw new Error('Plugin is not in draft status');
      }

      plugin.status = 'pending_review';
      plugin.reviewStatus.submittedAt = new Date();
      await plugin.save();

      return {
        success: true,
        message: 'Plugin submitted for review',
      };
    } catch (error) {
      console.error('Error submitting for review:', error);
      throw error;
    }
  }

  /**
   * Record plugin sale/revenue
   * @param {string} pluginId - Plugin ID
   * @param {number} amount - Sale amount
   * @returns {Promise<Object>} Result
   */
  async recordSale(pluginId, amount) {
    try {
      const plugin = await Plugin.findOne({ pluginId });
      if (!plugin) {
        throw new Error('Plugin not found');
      }

      await plugin.recordRevenue(amount);

      return {
        success: true,
        revenueRecorded: amount,
        developerEarnings: amount * (plugin.revenueShare.developerPercent / 100),
      };
    } catch (error) {
      console.error('Error recording sale:', error);
      throw error;
    }
  }
}

module.exports = new MarketplaceService();
