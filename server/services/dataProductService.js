const DataProduct = require('../models/DataProduct');
const DataPurchase = require('../models/DataPurchase');
const Report = require('../models/Report');
const crypto = require('crypto');

class DataProductService {
  // Generate unique product ID
  static generateProductId() {
    return 'PROD-' + crypto.randomBytes(6).toString('hex').toUpperCase();
  }

  // Generate unique purchase ID
  static generatePurchaseId() {
    return 'PUR-' + crypto.randomBytes(6).toString('hex').toUpperCase();
  }

  // Generate unique report ID
  static generateReportId() {
    return 'RPT-' + crypto.randomBytes(6).toString('hex').toUpperCase();
  }

  // Create new data product
  static async createProduct(productData) {
    try {
      const productId = this.generateProductId();
      
      const product = new DataProduct({
        productId,
        ...productData,
        salesCount: 0,
        rating: { average: 0, count: 0 },
        reviews: []
      });

      await product.save();
      return product;
    } catch (error) {
      throw new Error(`Failed to create data product: ${error.message}`);
    }
  }

  // Get all data products with filtering
  static async getProducts(filters = {}, options = {}) {
    try {
      const query = { isActive: true };

      if (filters.type) {
        query.type = filters.type;
      }

      if (filters.category && filters.category !== 'all') {
        query.category = filters.category;
      }

      if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        query.price = {};
        if (filters.minPrice !== undefined) {
          query.price.$gte = filters.minPrice;
        }
        if (filters.maxPrice !== undefined) {
          query.price.$lte = filters.maxPrice;
        }
      }

      if (filters.tags && filters.tags.length > 0) {
        query.tags = { $in: filters.tags };
      }

      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } },
          { tags: { $in: [new RegExp(filters.search, 'i')] } }
        ];
      }

      const sortOptions = {};
      if (options.sortBy) {
        const [field, order] = options.sortBy.split(':');
        sortOptions[field] = order === 'desc' ? -1 : 1;
      } else {
        sortOptions.isFeatured = -1;
        sortOptions.createdAt = -1;
      }

      const products = await DataProduct.find(query)
        .sort(sortOptions)
        .skip(options.skip || 0)
        .limit(options.limit || 20);

      const total = await DataProduct.countDocuments(query);

      return {
        products,
        pagination: {
          total,
          page: Math.floor((options.skip || 0) / (options.limit || 20)) + 1,
          pages: Math.ceil(total / (options.limit || 20))
        }
      };
    } catch (error) {
      throw new Error(`Failed to get products: ${error.message}`);
    }
  }

  // Get single product by ID
  static async getProductById(productId) {
    try {
      const product = await DataProduct.findById(productId)
        .populate('relatedProducts', 'productId name price rating type');
      
      if (!product) {
        throw new Error('Product not found');
      }

      return product;
    } catch (error) {
      throw new Error(`Failed to get product: ${error.message}`);
    }
  }

  // Get product preview/sample data
  static async getProductPreview(productId) {
    try {
      const product = await DataProduct.findById(productId);
      
      if (!product) {
        throw new Error('Product not found');
      }

      return {
        productId: product.productId,
        name: product.name,
        type: product.type,
        sampleData: product.sampleData,
        previewUrl: product.previewUrl,
        previewImages: product.previewImages,
        specifications: product.specifications,
        features: product.features
      };
    } catch (error) {
      throw new Error(`Failed to get product preview: ${error.message}`);
    }
  }

  // Purchase a data product
  static async purchaseProduct(productId, customerId, customerType, paymentMethod) {
    try {
      const product = await DataProduct.findById(productId);
      
      if (!product) {
        throw new Error('Product not found');
      }

      if (!product.isActive) {
        throw new Error('Product is not available for purchase');
      }

      // Check if customer already has active access
      const existingPurchase = await DataPurchase.getActiveProductAccess(
        customerId,
        customerType,
        productId
      );

      if (existingPurchase) {
        throw new Error('You already have active access to this product');
      }

      // Calculate expiration date
      const accessExpiresAt = new Date();
      if (product.accessType === 'subscription') {
        switch (product.subscriptionPeriod) {
          case 'monthly':
            accessExpiresAt.setMonth(accessExpiresAt.getMonth() + 1);
            break;
          case 'quarterly':
            accessExpiresAt.setMonth(accessExpiresAt.getMonth() + 3);
            break;
          case 'yearly':
            accessExpiresAt.setFullYear(accessExpiresAt.getFullYear() + 1);
            break;
          default:
            accessExpiresAt.setMonth(accessExpiresAt.getMonth() + 1);
        }
      } else {
        // One-time purchase - valid for 1 year
        accessExpiresAt.setFullYear(accessExpiresAt.getFullYear() + 1);
      }

      const purchase = new DataPurchase({
        purchaseId: this.generatePurchaseId(),
        customerId,
        customerType,
        productId,
        amount: product.price,
        currency: product.currency,
        paymentStatus: 'pending',
        paymentMethod,
        accessGranted: false,
        accessExpiresAt,
        downloadsRemaining: 10
      });

      await purchase.save();

      return {
        purchase,
        product: {
          name: product.name,
          price: product.price,
          currency: product.currency,
          accessType: product.accessType
        }
      };
    } catch (error) {
      throw new Error(`Failed to purchase product: ${error.message}`);
    }
  }

  // Complete purchase and grant access
  static async completePurchase(purchaseId, paymentDetails) {
    try {
      const purchase = await DataPurchase.findById(purchaseId)
        .populate('productId');

      if (!purchase) {
        throw new Error('Purchase not found');
      }

      purchase.paymentStatus = 'completed';
      purchase.paymentDetails = {
        ...paymentDetails,
        paidAt: new Date()
      };
      purchase.accessGranted = true;
      purchase.accessGrantedAt = new Date();

      await purchase.save();

      // Increment product sales count
      await DataProduct.findByIdAndUpdate(purchase.productId._id, {
        $inc: { salesCount: 1 }
      });

      // Generate report for one-time products
      if (purchase.productId.accessType === 'one-time') {
        await this.generateReport(purchase);
      }

      return purchase;
    } catch (error) {
      throw new Error(`Failed to complete purchase: ${error.message}`);
    }
  }

  // Generate report for purchased product
  static async generateReport(purchase) {
    try {
      const reportId = this.generateReportId();
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      const report = new Report({
        reportId,
        productId: purchase.productId._id,
        customerId: purchase.customerId,
        customerType: purchase.customerType,
        title: `${purchase.productId.name} - Report`,
        description: `Generated report for ${purchase.productId.name}`,
        parameters: purchase.productId.dataRange,
        status: 'generating',
        expiresAt
      });

      await report.save();

      // TODO: Trigger async report generation
      // This would typically be handled by a background job

      return report;
    } catch (error) {
      console.error('Failed to generate report:', error);
      // Don't throw - report generation failure shouldn't break purchase flow
    }
  }

  // Get customer's purchased products
  static async getCustomerPurchases(customerId, customerType, options = {}) {
    try {
      return await DataPurchase.getCustomerPurchases(customerId, customerType, options);
    } catch (error) {
      throw new Error(`Failed to get customer purchases: ${error.message}`);
    }
  }

  // Get download URL for purchased product
  static async getDownloadUrl(purchaseId, format, customerId, customerType) {
    try {
      const purchase = await DataPurchase.findOne({
        _id: purchaseId,
        customerId,
        customerType
      }).populate('productId');

      if (!purchase) {
        throw new Error('Purchase not found');
      }

      if (!purchase.isAccessValid()) {
        throw new Error('Access has expired or download limit reached');
      }

      // Generate download token
      const token = await purchase.generateDownloadToken(format);

      return {
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        format,
        downloadsRemaining: purchase.downloadsRemaining - 1
      };
    } catch (error) {
      throw new Error(`Failed to get download URL: ${error.message}`);
    }
  }

  // Record download
  static async recordDownload(purchaseId, format, ipAddress, userAgent) {
    try {
      const purchase = await DataPurchase.findById(purchaseId);
      
      if (!purchase) {
        throw new Error('Purchase not found');
      }

      await purchase.recordDownload(format, ipAddress, userAgent);
      
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to record download: ${error.message}`);
    }
  }

  // Get product categories
  static async getCategories() {
    try {
      const categories = await DataProduct.distinct('category', { isActive: true });
      const types = await DataProduct.distinct('type', { isActive: true });
      
      return {
        categories,
        types,
        priceRange: await this.getPriceRange()
      };
    } catch (error) {
      throw new Error(`Failed to get categories: ${error.message}`);
    }
  }

  // Get price range
  static async getPriceRange() {
    try {
      const result = await DataProduct.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            min: { $min: '$price' },
            max: { $max: '$price' }
          }
        }
      ]);

      return result[0] || { min: 0, max: 0 };
    } catch (error) {
      throw new Error(`Failed to get price range: ${error.message}`);
    }
  }

  // Get product recommendations
  static async getRecommendations(productId, customerId, customerType, limit = 4) {
    try {
      const product = await DataProduct.findById(productId);
      
      if (!product) {
        throw new Error('Product not found');
      }

      // Get customer's purchase history
      const customerPurchases = await DataPurchase.find({
        customerId,
        customerType,
        paymentStatus: 'completed'
      }).select('productId');

      const purchasedProductIds = customerPurchases.map(p => p.productId.toString());

      // Find related products
      const recommendations = await DataProduct.find({
        _id: { $ne: productId, $nin: purchasedProductIds },
        isActive: true,
        $or: [
          { category: product.category },
          { type: product.type },
          { tags: { $in: product.tags } }
        ]
      })
        .sort({ salesCount: -1, 'rating.average': -1 })
        .limit(limit);

      return recommendations;
    } catch (error) {
      throw new Error(`Failed to get recommendations: ${error.message}`);
    }
  }

  // Get featured products
  static async getFeaturedProducts(limit = 6) {
    try {
      return await DataProduct.getFeatured(limit);
    } catch (error) {
      throw new Error(`Failed to get featured products: ${error.message}`);
    }
  }

  // Update product
  static async updateProduct(productId, updateData) {
    try {
      const product = await DataProduct.findByIdAndUpdate(
        productId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!product) {
        throw new Error('Product not found');
      }

      return product;
    } catch (error) {
      throw new Error(`Failed to update product: ${error.message}`);
    }
  }

  // Delete product (soft delete)
  static async deleteProduct(productId) {
    try {
      const product = await DataProduct.findByIdAndUpdate(
        productId,
        { $set: { isActive: false } },
        { new: true }
      );

      if (!product) {
        throw new Error('Product not found');
      }

      return { success: true };
    } catch (error) {
      throw new Error(`Failed to delete product: ${error.message}`);
    }
  }

  // Add product review
  static async addReview(productId, userId, rating, comment) {
    try {
      const product = await DataProduct.findById(productId);
      
      if (!product) {
        throw new Error('Product not found');
      }

      // Check if user already reviewed
      const existingReview = product.reviews.find(
        r => r.userId.toString() === userId.toString()
      );

      if (existingReview) {
        throw new Error('You have already reviewed this product');
      }

      await product.addReview(userId, rating, comment);
      
      return product;
    } catch (error) {
      throw new Error(`Failed to add review: ${error.message}`);
    }
  }

  // Get purchase statistics
  static async getPurchaseStats(startDate, endDate) {
    try {
      return await DataPurchase.getPurchaseStats(startDate, endDate);
    } catch (error) {
      throw new Error(`Failed to get purchase stats: ${error.message}`);
    }
  }
}

module.exports = DataProductService;
