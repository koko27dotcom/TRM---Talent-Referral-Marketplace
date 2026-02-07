/**
 * Cache Management Routes
 * Admin-only cache management endpoints for TRM
 * Features: Cache statistics, health checks, flush, invalidation, key listing
 */

const express = require('express');
const cacheService = require('../services/cacheService.js');
const { asyncHandler } = require('../middleware/errorHandler.js');
const { authenticate } = require('../middleware/auth.js');
const { requireAdmin } = require('../middleware/rbac.js');

const router = express.Router();

// Apply authentication and admin authorization to all cache routes
router.use(authenticate);
router.use(requireAdmin);

/**
 * @route   GET /api/cache/stats
 * @desc    Get cache statistics (L1, L2, hit rates)
 * @access  Admin only
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const stats = cacheService.getStats();

  res.json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      overall: stats.overall,
      l1: {
        ...stats.l1,
        hitRate: `${(stats.l1.hitRate * 100).toFixed(2)}%`,
        missRate: `${(stats.l1.missRate * 100).toFixed(2)}%`,
        memoryUsageMB: (stats.l1.totalSize / 1024 / 1024).toFixed(2),
      },
      l2: {
        ...stats.l2,
        hitRate: `${(stats.l2.hitRate * 100).toFixed(2)}%`,
        missRate: `${(stats.l2.missRate * 100).toFixed(2)}%`,
      },
    },
  });
}));

/**
 * @route   GET /api/cache/health
 * @desc    Get cache health status
 * @access  Admin only
 */
router.get('/health', asyncHandler(async (req, res) => {
  const health = cacheService.getHealth();
  const stats = cacheService.getStats();

  res.json({
    success: true,
    data: {
      ...health,
      l1: {
        ...health.l1,
        hitRate: stats.l1.hitRate,
        missRate: stats.l1.missRate,
      },
      l2: {
        ...health.l2,
        hitRate: stats.l2.hitRate,
        missRate: stats.l2.missRate,
      },
    },
  });
}));

/**
 * @route   POST /api/cache/flush
 * @desc    Flush all caches (L1 and L2)
 * @access  Admin only
 */
router.post('/flush', asyncHandler(async (req, res) => {
  const { confirm } = req.body;

  // Require explicit confirmation
  if (!confirm || confirm !== 'flush-all-cache') {
    return res.status(400).json({
      success: false,
      message: 'Please confirm cache flush by sending confirm: "flush-all-cache"',
      code: 'CONFIRMATION_REQUIRED',
    });
  }

  const startTime = Date.now();
  const result = await cacheService.flush();

  // Reset statistics after flush
  cacheService.resetStats();

  res.json({
    success: true,
    message: 'All caches flushed successfully',
    data: {
      flushed: result,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    },
  });
}));

/**
 * @route   POST /api/cache/invalidate
 * @desc    Invalidate cache by key or pattern
 * @access  Admin only
 */
router.post('/invalidate', asyncHandler(async (req, res) => {
  const { key, pattern, tag } = req.body;

  if (!key && !pattern && !tag) {
    return res.status(400).json({
      success: false,
      message: 'Please provide key, pattern, or tag to invalidate',
      code: 'INVALIDATION_TARGET_REQUIRED',
    });
  }

  const startTime = Date.now();
  let result;
  let invalidationType;

  if (tag) {
    // Invalidate by tag
    result = await cacheService.invalidateByTag(tag);
    invalidationType = 'tag';
  } else if (key) {
    // Invalidate single key
    const deleted = await cacheService.delete(key);
    result = { l1: deleted ? 1 : 0, l2: deleted ? 1 : 0 };
    invalidationType = 'key';
  } else if (pattern) {
    // Invalidate by pattern
    result = await cacheService.invalidateByPattern(pattern);
    invalidationType = 'pattern';
  }

  res.json({
    success: true,
    message: `Cache invalidated by ${invalidationType}`,
    data: {
      type: invalidationType,
      target: key || pattern || tag,
      invalidated: result,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    },
  });
}));

/**
 * @route   GET /api/cache/keys
 * @desc    List cache keys (L1 only, with pagination)
 * @access  Admin only
 */
router.get('/keys', asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 50, 
    pattern,
    type,
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

  // Get keys from L1 cache (L2 doesn't support scanning all keys efficiently)
  const l1Cache = cacheService.l1;
  let keys = Array.from(l1Cache.cache.keys());

  // Filter by pattern if provided
  if (pattern) {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    keys = keys.filter(key => regex.test(key));
  }

  // Filter by type (prefix) if provided
  if (type) {
    keys = keys.filter(key => key.startsWith(`${type}:`));
  }

  const total = keys.length;
  const startIndex = (pageNum - 1) * limitNum;
  const endIndex = startIndex + limitNum;
  const paginatedKeys = keys.slice(startIndex, endIndex);

  // Get metadata for each key
  const keyDetails = paginatedKeys.map(key => {
    const entry = l1Cache.cache.get(key);
    return {
      key,
      createdAt: new Date(entry.createdAt).toISOString(),
      expiresAt: new Date(entry.expiresAt).toISOString(),
      size: entry.size,
      accessCount: entry.accessCount,
      tags: Array.from(entry.tags),
      isExpired: entry.isExpired(),
    };
  });

  res.json({
    success: true,
    data: {
      keys: keyDetails,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: endIndex < total,
        hasPrevPage: pageNum > 1,
      },
      filters: {
        pattern: pattern || null,
        type: type || null,
      },
      timestamp: new Date().toISOString(),
    },
  });
}));

module.exports = router;

