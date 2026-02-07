const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const MarketIntelligenceService = require('../services/marketIntelligenceService');

// Get hiring trends
router.get('/trends', async (req, res) => {
  try {
    const filters = {
      industries: req.query.industries ? req.query.industries.split(',') : undefined,
      locations: req.query.locations ? req.query.locations.split(',') : undefined,
      dateRange: req.query.startDate && req.query.endDate ? {
        startDate: new Date(req.query.startDate),
        endDate: new Date(req.query.endDate)
      } : undefined
    };

    const trends = await MarketIntelligenceService.analyzeHiringTrends(filters);
    
    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get skill demand
router.get('/skills', async (req, res) => {
  try {
    const filters = {
      industries: req.query.industries ? req.query.industries.split(',') : undefined,
      timeRange: req.query.timeRange
    };

    const skillDemand = await MarketIntelligenceService.analyzeSkillDemand(filters);
    
    res.json({
      success: true,
      data: skillDemand
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get salary benchmarks
router.get('/salaries', async (req, res) => {
  try {
    const filters = {
      industries: req.query.industries ? req.query.industries.split(',') : undefined,
      locations: req.query.locations ? req.query.locations.split(',') : undefined,
      experienceLevel: req.query.experienceLevel
    };

    const benchmarks = await MarketIntelligenceService.getSalaryBenchmarks(filters);
    
    res.json({
      success: true,
      data: benchmarks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get competitor analysis
router.get('/competitors', authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId || req.user._id;
    const filters = {
      locations: req.query.locations ? req.query.locations.split(',') : undefined
    };

    const analysis = await MarketIntelligenceService.analyzeCompetitors(companyId, filters);
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get market predictions
router.get('/predictions', async (req, res) => {
  try {
    const { category, industry } = req.query;
    
    if (!category || !industry) {
      return res.status(400).json({
        success: false,
        message: 'Category and industry are required'
      });
    }

    const timeRange = {
      startDate: req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      endDate: req.query.endDate ? new Date(req.query.endDate) : new Date()
    };

    const predictions = await MarketIntelligenceService.generatePredictions(
      category,
      industry,
      timeRange
    );
    
    res.json({
      success: true,
      data: predictions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get industry insights
router.get('/industries/:id', async (req, res) => {
  try {
    const insights = await MarketIntelligenceService.getIndustryInsights(req.params.id);
    
    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get all market insights
router.get('/insights', async (req, res) => {
  try {
    const filters = {
      category: req.query.category,
      industry: req.query.industry,
      location: req.query.location
    };

    const options = {
      sortBy: req.query.sortBy,
      skip: req.query.skip ? parseInt(req.query.skip) : 0,
      limit: req.query.limit ? parseInt(req.query.limit) : 20
    };

    const result = await MarketIntelligenceService.getInsights(filters, options);
    
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

// Get single insight
router.get('/insights/:id', async (req, res) => {
  try {
    const insight = await MarketIntelligenceService.getInsightById(req.params.id);
    
    res.json({
      success: true,
      data: insight
    });
  } catch (error) {
    res.status(error.message === 'Insight not found' ? 404 : 500).json({
      success: false,
      message: error.message
    });
  }
});

// Get trending insights
router.get('/insights/trending/list', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const insights = await MarketIntelligenceService.getTrendingInsights(limit);
    
    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Admin: Create market insight
router.post('/admin/insights', authenticate, async (req, res) => {
  try {
    // Check if user is admin or analyst
    if (!['admin', 'analyst'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Admin or analyst access required'
      });
    }

    const insight = await MarketIntelligenceService.createInsight({
      ...req.body,
      createdBy: req.user._id
    });
    
    res.status(201).json({
      success: true,
      data: insight
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Admin: Auto-generate insights
router.post('/admin/insights/generate', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const result = await MarketIntelligenceService.autoGenerateInsights();
    
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

module.exports = router;
