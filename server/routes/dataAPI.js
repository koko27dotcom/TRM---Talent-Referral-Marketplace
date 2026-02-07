const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.js');
const DataAPIService = require('../services/dataAPIService.js');

// Middleware to get customer tier from API key or subscription
const getCustomerTier = async (req, res, next) => {
  // In production, this would check the API key or subscription tier
  // For now, default to 'free' or use user's subscription
  req.customerTier = req.user?.subscriptionTier || 'free';
  next();
};

// Get jobs data
router.get('/jobs', authenticate, getCustomerTier, async (req, res) => {
  try {
    const result = await DataAPIService.executeQuery(
      'jobs',
      req.query,
      req.user._id,
      req.user.role === 'company' ? 'Company' : 'User',
      req.apiKeyId,
      req.customerTier
    );
    
    res.json({
      success: true,
      data: result.data,
      meta: result.meta
    });
  } catch (error) {
    if (error.message.includes('Rate limit exceeded')) {
      return res.status(429).json({
        success: false,
        message: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get candidates data (anonymized)
router.get('/candidates', authenticate, getCustomerTier, async (req, res) => {
  try {
    const result = await DataAPIService.executeQuery(
      'candidates',
      req.query,
      req.user._id,
      req.user.role === 'company' ? 'Company' : 'User',
      req.apiKeyId,
      req.customerTier
    );
    
    res.json({
      success: true,
      data: result.data,
      meta: result.meta
    });
  } catch (error) {
    if (error.message.includes('Rate limit exceeded')) {
      return res.status(429).json({
        success: false,
        message: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get salaries data
router.get('/salaries', authenticate, getCustomerTier, async (req, res) => {
  try {
    const result = await DataAPIService.executeQuery(
      'salaries',
      req.query,
      req.user._id,
      req.user.role === 'company' ? 'Company' : 'User',
      req.apiKeyId,
      req.customerTier
    );
    
    res.json({
      success: true,
      data: result.data,
      meta: result.meta
    });
  } catch (error) {
    if (error.message.includes('Rate limit exceeded')) {
      return res.status(429).json({
        success: false,
        message: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get skills data
router.get('/skills', authenticate, getCustomerTier, async (req, res) => {
  try {
    const result = await DataAPIService.executeQuery(
      'skills',
      req.query,
      req.user._id,
      req.user.role === 'company' ? 'Company' : 'User',
      req.apiKeyId,
      req.customerTier
    );
    
    res.json({
      success: true,
      data: result.data,
      meta: result.meta
    });
  } catch (error) {
    if (error.message.includes('Rate limit exceeded')) {
      return res.status(429).json({
        success: false,
        message: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get locations data
router.get('/locations', authenticate, getCustomerTier, async (req, res) => {
  try {
    const result = await DataAPIService.executeQuery(
      'locations',
      req.query,
      req.user._id,
      req.user.role === 'company' ? 'Company' : 'User',
      req.apiKeyId,
      req.customerTier
    );
    
    res.json({
      success: true,
      data: result.data,
      meta: result.meta
    });
  } catch (error) {
    if (error.message.includes('Rate limit exceeded')) {
      return res.status(429).json({
        success: false,
        message: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get companies data
router.get('/companies', authenticate, getCustomerTier, async (req, res) => {
  try {
    const result = await DataAPIService.executeQuery(
      'companies',
      req.query,
      req.user._id,
      req.user.role === 'company' ? 'Company' : 'User',
      req.apiKeyId,
      req.customerTier
    );
    
    res.json({
      success: true,
      data: result.data,
      meta: result.meta
    });
  } catch (error) {
    if (error.message.includes('Rate limit exceeded')) {
      return res.status(429).json({
        success: false,
        message: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get industries data
router.get('/industries', authenticate, getCustomerTier, async (req, res) => {
  try {
    const result = await DataAPIService.executeQuery(
      'industries',
      req.query,
      req.user._id,
      req.user.role === 'company' ? 'Company' : 'User',
      req.apiKeyId,
      req.customerTier
    );
    
    res.json({
      success: true,
      data: result.data,
      meta: result.meta
    });
  } catch (error) {
    if (error.message.includes('Rate limit exceeded')) {
      return res.status(429).json({
        success: false,
        message: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get API usage stats
router.get('/usage', authenticate, async (req, res) => {
  try {
    const customerId = req.user._id;
    const customerType = req.user.role === 'company' ? 'Company' : 'User';
    const period = req.query.period || '30d';

    const stats = await DataAPIService.getUsageStats(customerId, customerType, period);
    
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

// Get API documentation
router.get('/docs', async (req, res) => {
  try {
    const docs = DataAPIService.getAPIDocumentation();
    
    res.json({
      success: true,
      data: docs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get rate limits
router.get('/limits', authenticate, async (req, res) => {
  try {
    const tier = req.user.subscriptionTier || 'free';
    const limits = DataAPIService.RATE_LIMITS[tier] || DataAPIService.RATE_LIMITS.free;
    
    res.json({
      success: true,
      data: {
        tier,
        limits
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
