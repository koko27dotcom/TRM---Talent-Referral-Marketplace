/**
 * Performance Routes
 * API endpoints for cache statistics, monitoring, and management
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth.js');

// Import services
const enhancedCacheService = require('../services/enhancedCacheService.js');
const jobCacheService = require('../services/jobCacheService.js');
const userCacheService = require('../services/userCacheService.js');
const referralCacheService = require('../services/referralCacheService.js');
const marketDataCacheService = require('../services/marketDataCacheService.js');
const sessionCacheService = require('../services/sessionCacheService.js');
const cacheWarmingService = require('../services/cacheWarmingService.js');
const databaseIndexService = require('../services/databaseIndexService.js');
const queryOptimizationService = require('../services/queryOptimizationService.js');
const paginationService = require('../services/paginationService.js');

/**
 * @route GET /api/performance/health
 * @desc Get system health status
 * @access Private (Admin)
 */
router.get('/health', requireAuth, requireRole(['platform_admin']), async (req, res) => {
  try {
    const cacheHealth = await enhancedCacheService.healthCheck();
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      cache: cacheHealth,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/performance/cache/stats
 * @desc Get comprehensive cache statistics
 * @access Private (Admin)
 */
router.get('/cache/stats', requireAuth, requireRole(['platform_admin']), async (req, res) => {
  try {
    const stats = enhancedCacheService.getStats();
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/performance/cache/service/:service
 * @desc Get cache statistics for specific service
 * @access Private (Admin)
 */
router.get('/cache/service/:service', requireAuth, requireRole(['platform_admin']), async (req, res) => {
  try {
    const { service } = req.params;
    let stats;
    
    switch (service) {
      case 'job':
        stats = jobCacheService.getStats();
        break;
      case 'user':
        stats = userCacheService.getStats();
        break;
      case 'referral':
        stats = referralCacheService.getStats();
        break;
      case 'market':
        stats = marketDataCacheService.getStats();
        break;
      case 'session':
        stats = sessionCacheService.getStats();
        break;
      default:
        return res.status(400).json({ error: 'Unknown service' });
    }
    
    res.json({
      success: true,
      service,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /api/performance/cache/clear
 * @desc Clear all caches
 * @access Private (Admin)
 */
router.post('/cache/clear', requireAuth, requireRole(['platform_admin']), async (req, res) => {
  try {
    const { service } = req.body;
    
    if (service) {
      // Clear specific service cache
      switch (service) {
        case 'job':
          await jobCacheService.invalidateAllJobs();
          break;
        case 'user':
          await userCacheService.invalidateAllUsers();
          break;
        case 'referral':
          await referralCacheService.invalidateAllReferrals();
          break;
        case 'market':
          await marketDataCacheService.invalidateAll();
          break;
        default:
          return res.status(400).json({ error: 'Unknown service' });
      }
      
      res.json({
        success: true,
        message: `${service} cache cleared`,
      });
    } else {
      // Clear all caches
      await enhancedCacheService.clear();
      
      res.json({
        success: true,
        message: 'All caches cleared',
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /api/performance/cache/warm
 * @desc Trigger cache warming
 * @access Private (Admin)
 */
router.post('/cache/warm', requireAuth, requireRole(['platform_admin']), async (req, res) => {
  try {
    const { type, priority = 'normal' } = req.body;
    
    if (type) {
      const jobId = await cacheWarmingService.scheduleWarming(type, priority);
      
      res.json({
        success: true,
        jobId,
        message: `Cache warming scheduled for ${type}`,
      });
    } else {
      // Warm all caches
      const results = await cacheWarmingService.warmAll();
      
      res.json({
        success: true,
        data: results,
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/performance/cache/warming/stats
 * @desc Get cache warming statistics
 * @access Private (Admin)
 */
router.get('/cache/warming/stats', requireAuth, requireRole(['platform_admin']), async (req, res) => {
  try {
    const stats = cacheWarmingService.getStats();
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/performance/database/indexes
 * @desc Get database index information
 * @access Private (Admin)
 */
router.get('/database/indexes', requireAuth, requireRole(['platform_admin']), async (req, res) => {
  try {
    const stats = await databaseIndexService.getAllIndexStats();
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /api/performance/database/indexes/create
 * @desc Create all database indexes
 * @access Private (Admin)
 */
router.post('/database/indexes/create', requireAuth, requireRole(['platform_admin']), async (req, res) => {
  try {
    const results = await databaseIndexService.createAllIndexes();
    
    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/performance/database/indexes/health
 * @desc Get database index health report
 * @access Private (Admin)
 */
router.get('/database/indexes/health', requireAuth, requireRole(['platform_admin']), async (req, res) => {
  try {
    const report = await databaseIndexService.getHealthReport();
    
    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /api/performance/database/query/analyze
 * @desc Analyze a query execution plan
 * @access Private (Admin)
 */
router.post('/database/query/analyze', requireAuth, requireRole(['platform_admin']), async (req, res) => {
  try {
    const { model, query, sort } = req.body;
    
    const analysis = await databaseIndexService.analyzeQuery(model, query, sort);
    
    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/performance/queries/stats
 * @desc Get query optimization statistics
 * @access Private (Admin)
 */
router.get('/queries/stats', requireAuth, requireRole(['platform_admin']), async (req, res) => {
  try {
    const stats = queryOptimizationService.getStats();
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/performance/queries/slow
 * @desc Get slow queries
 * @access Private (Admin)
 */
router.get('/queries/slow', requireAuth, requireRole(['platform_admin']), async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const slowQueries = queryOptimizationService.getSlowQueries(parseInt(limit, 10));
    
    res.json({
      success: true,
      data: slowQueries,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /api/performance/queries/clear
 * @desc Clear query statistics
 * @access Private (Admin)
 */
router.post('/queries/clear', requireAuth, requireRole(['platform_admin']), async (req, res) => {
  try {
    queryOptimizationService.clearStats();
    
    res.json({
      success: true,
      message: 'Query statistics cleared',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/performance/sessions/count
 * @desc Get active session count
 * @access Private (Admin)
 */
router.get('/sessions/count', requireAuth, requireRole(['platform_admin']), async (req, res) => {
  try {
    const count = await sessionCacheService.getSessionCount();
    const activeCount = await sessionCacheService.getActiveUserCount();
    
    res.json({
      success: true,
      data: {
        totalSessions: count,
        activeUsers: activeCount,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /api/performance/sessions/cleanup
 * @desc Clean up expired sessions
 * @access Private (Admin)
 */
router.post('/sessions/cleanup', requireAuth, requireRole(['platform_admin']), async (req, res) => {
  try {
    const cleaned = await sessionCacheService.cleanupExpiredSessions();
    
    res.json({
      success: true,
      data: {
        cleanedSessions: cleaned,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/performance/config
 * @desc Get performance configuration
 * @access Private (Admin)
 */
router.get('/config', requireAuth, requireRole(['platform_admin']), async (req, res) => {
  try {
    const performanceConfig = require('../config/performance.js');
    
    // Return safe configuration (no sensitive data)
    res.json({
      success: true,
      data: {
        cache: {
          l1: performanceConfig.cache.l1,
          l2: {
            ttlSeconds: performanceConfig.cache.l2.ttlSeconds,
          },
          warming: performanceConfig.cache.warming,
        },
        query: performanceConfig.query,
        compression: {
          enabled: performanceConfig.compression.enabled,
        },
        features: performanceConfig.features,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
