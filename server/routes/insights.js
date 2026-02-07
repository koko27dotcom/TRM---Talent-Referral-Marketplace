/**
 * Insights Routes
 * AI-powered analytics and prediction endpoints for the TRM platform
 * Provides predictive insights, market analysis, and data-driven recommendations
 */

const express = require('express');
const { authenticate } = require('../middleware/auth.js');
const { requireRole } = require('../middleware/rbac.js');
const { insightEngine } = require('../services/insightEngine.js');
const {
  AnalyticsInsight,
  SalaryBenchmark,
  MarketTrend,
  HiringVelocity,
  ReferrerPrediction,
} = require('../models/index.js');

const router = express.Router();

// Middleware
const requireAdmin = requireRole(['admin']);
const requireCorporate = requireRole(['admin', 'corporate_admin', 'corporate_recruiter']);

// ==================== SALARY BENCHMARKS ====================

/**
 * @route   GET /api/v1/insights/salary
 * @desc    Get salary benchmarks for role/location
 * @access  Public (with optional auth for premium features)
 */
router.get('/salary', async (req, res) => {
  try {
    const { 
      jobTitle, 
      experienceLevel, 
      location = 'Yangon', 
      skills,
      category,
    } = req.query;

    if (!jobTitle) {
      return res.status(400).json({
        success: false,
        message: 'Job title is required',
      });
    }

    const skillsArray = skills ? skills.split(',').map(s => s.trim()) : [];

    // Get salary benchmark from insight engine
    const benchmark = await insightEngine.getSalaryBenchmark(
      jobTitle,
      experienceLevel || 'mid',
      location,
      skillsArray
    );

    // Get comparison data
    const experienceProgression = await SalaryBenchmark.getExperienceProgression(jobTitle, location);
    
    // Get location comparison
    const locations = ['Yangon', 'Mandalay', 'Naypyitaw'];
    const locationComparison = await SalaryBenchmark.compareLocations(jobTitle, experienceLevel || 'mid', locations);

    res.json({
      success: true,
      data: {
        benchmark,
        experienceProgression,
        locationComparison,
        metadata: {
          generatedAt: new Date(),
          currency: 'MMK',
          period: 'monthly',
        },
      },
    });
  } catch (error) {
    console.error('Error fetching salary benchmark:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch salary benchmark',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/insights/salary/top-paying
 * @desc    Get top paying jobs
 * @access  Public
 */
router.get('/salary/top-paying', async (req, res) => {
  try {
    const { location, limit = 10 } = req.query;

    const topJobs = await SalaryBenchmark.getTopPayingJobs(location, parseInt(limit));

    res.json({
      success: true,
      data: {
        jobs: topJobs,
        location,
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error fetching top paying jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top paying jobs',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/insights/salary/market-overview
 * @desc    Get salary market overview
 * @access  Public
 */
router.get('/salary/market-overview', async (req, res) => {
  try {
    const { location } = req.query;

    const overview = await SalaryBenchmark.getMarketOverview(location);

    res.json({
      success: true,
      data: overview,
    });
  } catch (error) {
    console.error('Error fetching market overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch market overview',
      error: error.message,
    });
  }
});

// ==================== HIRING VELOCITY ====================

/**
 * @route   GET /api/v1/insights/hiring
 * @desc    Get hiring velocity predictions
 * @access  Corporate/Admin
 */
router.get('/hiring', authenticate, requireCorporate, async (req, res) => {
  try {
    const { jobId, companyId } = req.query;

    let predictions;

    if (jobId) {
      // Get prediction for specific job
      const prediction = await HiringVelocity.findForJob(jobId);
      
      if (!prediction) {
        // Generate new prediction
        const newPrediction = await insightEngine.predictHiringVelocity(jobId);
        return res.json({
          success: true,
          data: newPrediction,
        });
      }

      predictions = [prediction];
    } else if (companyId) {
      // Get all predictions for company
      predictions = await HiringVelocity.find({
        companyId,
        status: { $in: ['active', 'fulfilled'] },
      }).populate('jobId', 'title status');
    } else {
      return res.status(400).json({
        success: false,
        message: 'Job ID or Company ID is required',
      });
    }

    res.json({
      success: true,
      data: {
        predictions,
        count: predictions.length,
      },
    });
  } catch (error) {
    console.error('Error fetching hiring velocity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hiring velocity',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/v1/insights/hiring/predict
 * @desc    Generate hiring velocity prediction
 * @access  Corporate/Admin
 */
router.post('/hiring/predict', authenticate, requireCorporate, async (req, res) => {
  try {
    const { jobId } = req.body;

    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: 'Job ID is required',
      });
    }

    const prediction = await insightEngine.predictHiringVelocity(jobId);

    res.json({
      success: true,
      data: prediction,
    });
  } catch (error) {
    console.error('Error generating hiring prediction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate hiring prediction',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/insights/hiring/benchmarks
 * @desc    Get hiring velocity benchmarks
 * @access  Corporate/Admin
 */
router.get('/hiring/benchmarks', authenticate, requireCorporate, async (req, res) => {
  try {
    const { category, experienceLevel } = req.query;

    const benchmark = await HiringVelocity.getBenchmark(category || 'General', experienceLevel || 'mid');

    res.json({
      success: true,
      data: benchmark,
    });
  } catch (error) {
    console.error('Error fetching hiring benchmarks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hiring benchmarks',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/insights/hiring/overdue
 * @desc    Get overdue hiring predictions
 * @access  Admin
 */
router.get('/hiring/overdue', authenticate, requireAdmin, async (req, res) => {
  try {
    const overdue = await HiringVelocity.getOverdue();

    res.json({
      success: true,
      data: overdue,
      count: overdue.length,
    });
  } catch (error) {
    console.error('Error fetching overdue predictions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch overdue predictions',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/insights/hiring/upcoming
 * @desc    Get upcoming expected fills
 * @access  Corporate/Admin
 */
router.get('/hiring/upcoming', authenticate, requireCorporate, async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const upcoming = await HiringVelocity.getUpcomingFills(parseInt(days));

    res.json({
      success: true,
      data: upcoming,
      count: upcoming.length,
    });
  } catch (error) {
    console.error('Error fetching upcoming fills:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming fills',
      error: error.message,
    });
  }
});

// ==================== MARKET TRENDS ====================

/**
 * @route   GET /api/v1/insights/market
 * @desc    Get market trends
 * @access  Public
 */
router.get('/market', async (req, res) => {
  try {
    const { location, industry, period = 'monthly' } = req.query;

    const trends = await insightEngine.analyzeMarketTrends({
      location,
      industry,
      period,
    });

    res.json({
      success: true,
      data: trends,
    });
  } catch (error) {
    console.error('Error fetching market trends:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch market trends',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/insights/market/skills
 * @desc    Get top skills in demand
 * @access  Public
 */
router.get('/market/skills', async (req, res) => {
  try {
    const { location, industry, limit = 10 } = req.query;

    const skills = await MarketTrend.getTopSkills(location, industry, parseInt(limit));

    res.json({
      success: true,
      data: skills,
    });
  } catch (error) {
    console.error('Error fetching top skills:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top skills',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/insights/market/industries
 * @desc    Get industry comparison
 * @access  Public
 */
router.get('/market/industries', async (req, res) => {
  try {
    const industries = req.query.industries?.split(',') || 
      ['IT', 'Finance', 'Manufacturing', 'Retail', 'Healthcare', 'Education'];

    const comparison = await MarketTrend.getIndustryComparison(industries);

    res.json({
      success: true,
      data: comparison,
    });
  } catch (error) {
    console.error('Error fetching industry comparison:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch industry comparison',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/insights/market/locations
 * @desc    Get location comparison
 * @access  Public
 */
router.get('/market/locations', async (req, res) => {
  try {
    const locations = req.query.locations?.split(',') || 
      ['Yangon', 'Mandalay', 'Naypyitaw'];

    const comparison = await MarketTrend.getLocationComparison(locations);

    res.json({
      success: true,
      data: comparison,
    });
  } catch (error) {
    console.error('Error fetching location comparison:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch location comparison',
      error: error.message,
    });
  }
});

// ==================== REFERRER PREDICTIONS ====================

/**
 * @route   GET /api/v1/insights/referrers
 * @desc    Get referrer predictions
 * @access  Admin
 */
router.get('/referrers', authenticate, requireAdmin, async (req, res) => {
  try {
    const { type = 'success_prediction', limit = 50 } = req.query;

    const predictions = await ReferrerPrediction.findByType(type, {
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      data: predictions,
      count: predictions.length,
    });
  } catch (error) {
    console.error('Error fetching referrer predictions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch referrer predictions',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/insights/referrers/top-performers
 * @desc    Get top performing referrers
 * @access  Admin
 */
router.get('/referrers/top-performers', authenticate, requireAdmin, async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const topPerformers = await ReferrerPrediction.getTopPerformers(parseInt(limit));

    res.json({
      success: true,
      data: topPerformers,
    });
  } catch (error) {
    console.error('Error fetching top performers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top performers',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/insights/referrers/at-risk
 * @desc    Get at-risk referrers
 * @access  Admin
 */
router.get('/referrers/at-risk', authenticate, requireAdmin, async (req, res) => {
  try {
    const atRisk = await ReferrerPrediction.getAtRiskReferrers();

    res.json({
      success: true,
      data: atRisk,
      count: atRisk.length,
    });
  } catch (error) {
    console.error('Error fetching at-risk referrers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch at-risk referrers',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/insights/referrers/:id/predict
 * @desc    Get prediction for specific referrer
 * @access  Admin or referrer themselves
 */
router.get('/referrers/:id/predict', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Check permissions
    if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view this prediction',
      });
    }

    const prediction = await insightEngine.predictReferrerSuccess(id);

    res.json({
      success: true,
      data: prediction,
    });
  } catch (error) {
    console.error('Error generating referrer prediction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate referrer prediction',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/insights/referrers/leaderboard
 * @desc    Get referrer leaderboard
 * @access  Public
 */
router.get('/referrers/leaderboard', async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const rankings = await ReferrerPrediction.getRankings('monthly', parseInt(limit));

    res.json({
      success: true,
      data: rankings,
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboard',
      error: error.message,
    });
  }
});

// ==================== CANDIDATE PREDICTIONS ====================

/**
 * @route   GET /api/v1/insights/candidates/:id/hire-probability
 * @desc    Get candidate hire probability
 * @access  Corporate/Admin
 */
router.get('/candidates/:id/hire-probability', authenticate, requireCorporate, async (req, res) => {
  try {
    const { id } = req.params;
    const { jobId } = req.query;

    const prediction = await insightEngine.predictCandidateHireProbability(id, jobId);

    res.json({
      success: true,
      data: prediction,
    });
  } catch (error) {
    console.error('Error predicting hire probability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to predict hire probability',
      error: error.message,
    });
  }
});

// ==================== COMPANY CHURN PREDICTIONS ====================

/**
 * @route   GET /api/v1/insights/companies/:id/churn
 * @desc    Get company churn prediction
 * @access  Admin
 */
router.get('/companies/:id/churn', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const prediction = await insightEngine.predictCompanyChurn(id);

    res.json({
      success: true,
      data: prediction,
    });
  } catch (error) {
    console.error('Error predicting company churn:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to predict company churn',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/insights/companies/churn-risk
 * @desc    Get all companies with churn risk
 * @access  Admin
 */
router.get('/companies/churn-risk', authenticate, requireAdmin, async (req, res) => {
  try {
    const { threshold = 50 } = req.query;

    const insights = await AnalyticsInsight.find({
      type: 'company_churn_prediction',
      status: 'active',
      'prediction.probability': { $gte: parseInt(threshold) },
    }).populate('targetId', 'name email stats');

    res.json({
      success: true,
      data: insights,
      count: insights.length,
    });
  } catch (error) {
    console.error('Error fetching churn risk:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch churn risk',
      error: error.message,
    });
  }
});

// ==================== INSIGHT MANAGEMENT ====================

/**
 * @route   GET /api/v1/insights
 * @desc    Get all insights
 * @access  Admin
 */
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { type, targetType, status = 'active', limit = 50 } = req.query;

    const query = { status };
    if (type) query.type = type;
    if (targetType) query.targetType = targetType;

    const insights = await AnalyticsInsight.find(query)
      .sort({ generatedAt: -1 })
      .limit(parseInt(limit))
      .populate('targetId', 'name title email');

    res.json({
      success: true,
      data: insights,
      count: insights.length,
    });
  } catch (error) {
    console.error('Error fetching insights:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch insights',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/v1/insights/generate
 * @desc    Trigger insight generation
 * @access  Admin
 */
router.post('/generate', authenticate, requireAdmin, async (req, res) => {
  try {
    const { type, targetIds } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'Insight type is required',
      });
    }

    const results = [];

    switch (type) {
      case 'candidate_hire_prediction':
        if (targetIds && targetIds.length > 0) {
          for (const candidateId of targetIds) {
            const prediction = await insightEngine.predictCandidateHireProbability(candidateId);
            results.push(prediction);
          }
        }
        break;

      case 'referrer_success_prediction':
        if (targetIds && targetIds.length > 0) {
          for (const referrerId of targetIds) {
            const prediction = await insightEngine.predictReferrerSuccess(referrerId);
            results.push(prediction);
          }
        }
        break;

      case 'company_churn_prediction':
        if (targetIds && targetIds.length > 0) {
          for (const companyId of targetIds) {
            const prediction = await insightEngine.predictCompanyChurn(companyId);
            results.push(prediction);
          }
        }
        break;

      case 'market_trends':
        const trends = await insightEngine.analyzeMarketTrends();
        results.push(trends);
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid insight type',
        });
    }

    res.json({
      success: true,
      data: {
        generated: results.length,
        results,
      },
    });
  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate insights',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/insights/stats
 * @desc    Get insight engine statistics
 * @access  Admin
 */
router.get('/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const stats = await Promise.all([
      AnalyticsInsight.countDocuments({ status: 'active' }),
      AnalyticsInsight.countDocuments({ status: 'validated' }),
      HiringVelocity.countDocuments({ status: 'active' }),
      ReferrerPrediction.countDocuments({ status: 'active' }),
      HiringVelocity.getAccuracyStats(),
      ReferrerPrediction.getAccuracyStats(),
    ]);

    res.json({
      success: true,
      data: {
        insights: {
          active: stats[0],
          validated: stats[1],
        },
        hiringPredictions: {
          active: stats[2],
          accuracy: stats[4],
        },
        referrerPredictions: {
          active: stats[3],
          accuracy: stats[5],
        },
        engine: insightEngine.getStats(),
      },
    });
  } catch (error) {
    console.error('Error fetching insight stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch insight stats',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/v1/insights/:id/validate
 * @desc    Validate an insight
 * @access  Admin
 */
router.post('/:id/validate', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { actualOutcome, notes } = req.body;

    const insight = await AnalyticsInsight.findById(id);
    if (!insight) {
      return res.status(404).json({
        success: false,
        message: 'Insight not found',
      });
    }

    await insight.validateAccuracy({
      actualOutcome,
      validatedBy: req.user._id,
      notes,
    });

    res.json({
      success: true,
      data: insight,
    });
  } catch (error) {
    console.error('Error validating insight:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate insight',
      error: error.message,
    });
  }
});

module.exports = router;
