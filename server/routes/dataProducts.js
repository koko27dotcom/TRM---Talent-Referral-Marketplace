const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const DataProductService = require('../services/dataProductService');

// Get all data products
router.get('/', async (req, res) => {
  try {
    const filters = {
      type: req.query.type,
      category: req.query.category,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined,
      tags: req.query.tags ? req.query.tags.split(',') : undefined,
      search: req.query.search
    };

    const options = {
      sortBy: req.query.sortBy,
      skip: req.query.skip ? parseInt(req.query.skip) : 0,
      limit: req.query.limit ? parseInt(req.query.limit) : 20
    };

    const result = await DataProductService.getProducts(filters, options);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get product categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await DataProductService.getCategories();
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get featured products
router.get('/featured', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 6;
    const products = await DataProductService.getFeaturedProducts(limit);
    
    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get my purchased products
router.get('/my-purchases', authenticate, async (req, res) => {
  try {
    const customerId = req.user._id;
    const customerType = req.user.role === 'company' ? 'Company' : 'User';
    
    const options = {
      status: req.query.status,
      activeOnly: req.query.activeOnly === 'true',
      skip: req.query.skip ? parseInt(req.query.skip) : 0,
      limit: req.query.limit ? parseInt(req.query.limit) : 20
    };

    const purchases = await DataProductService.getCustomerPurchases(
      customerId,
      customerType,
      options
    );
    
    res.json({
      success: true,
      data: purchases
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await DataProductService.getProductById(req.params.id);
    
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(error.message === 'Product not found' ? 404 : 500).json({
      success: false,
      message: error.message
    });
  }
});

// Get product preview
router.get('/:id/preview', async (req, res) => {
  try {
    const preview = await DataProductService.getProductPreview(req.params.id);
    
    res.json({
      success: true,
      data: preview
    });
  } catch (error) {
    res.status(error.message === 'Product not found' ? 404 : 500).json({
      success: false,
      message: error.message
    });
  }
});

// Get product recommendations
router.get('/:id/recommendations', authenticate, async (req, res) => {
  try {
    const customerId = req.user._id;
    const customerType = req.user.role === 'company' ? 'Company' : 'User';
    const limit = req.query.limit ? parseInt(req.query.limit) : 4;
    
    const recommendations = await DataProductService.getRecommendations(
      req.params.id,
      customerId,
      customerType,
      limit
    );
    
    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Purchase product
router.post('/:id/purchase', authenticate, async (req, res) => {
  try {
    const customerId = req.user._id;
    const customerType = req.user.role === 'company' ? 'Company' : 'User';
    const { paymentMethod } = req.body;

    const result = await DataProductService.purchaseProduct(
      req.params.id,
      customerId,
      customerType,
      paymentMethod
    );
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Get download URL
router.get('/:id/download', authenticate, async (req, res) => {
  try {
    const customerId = req.user._id;
    const customerType = req.user.role === 'company' ? 'Company' : 'User';
    const { purchaseId, format } = req.query;

    if (!purchaseId || !format) {
      return res.status(400).json({
        success: false,
        message: 'Purchase ID and format are required'
      });
    }

    const downloadInfo = await DataProductService.getDownloadUrl(
      purchaseId,
      format,
      customerId,
      customerType
    );
    
    res.json({
      success: true,
      data: downloadInfo
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Record download
router.post('/:id/download', authenticate, async (req, res) => {
  try {
    const { purchaseId, format } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    await DataProductService.recordDownload(purchaseId, format, ipAddress, userAgent);
    
    res.json({
      success: true,
      message: 'Download recorded'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Add product review
router.post('/:id/reviews', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const product = await DataProductService.addReview(
      req.params.id,
      userId,
      rating,
      comment
    );
    
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Admin: Create product
router.post('/', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const product = await DataProductService.createProduct({
      ...req.body,
      createdBy: req.user._id
    });
    
    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Admin: Update product
router.put('/:id', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const product = await DataProductService.updateProduct(req.params.id, req.body);
    
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(error.message === 'Product not found' ? 404 : 400).json({
      success: false,
      message: error.message
    });
  }
});

// Admin: Delete product
router.delete('/:id', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    await DataProductService.deleteProduct(req.params.id);
    
    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(error.message === 'Product not found' ? 404 : 500).json({
      success: false,
      message: error.message
    });
  }
});

// Admin: Get purchase statistics
router.get('/admin/stats', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    const stats = await DataProductService.getPurchaseStats(startDate, endDate);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
