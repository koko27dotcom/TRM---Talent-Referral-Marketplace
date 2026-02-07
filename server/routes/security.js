/**
 * Security Routes
 * API endpoints for security management, logs, and monitoring
 * Accessible only by platform administrators
 */

const express = require('express');
const router = express.Router();
const { requireRole } = require('../middleware/auth.js');
const SecurityAudit = require('../models/SecurityAudit.js');
const {
  getRateLimitStatus,
  resetRateLimit,
} = require('../middleware/enhancedRateLimiter.js');
const {
  getSecurityStats,
  getRecentEvents,
} = require('../services/securityMonitoringService.js');

/**
 * @route GET /api/v1/security/stats
 * @desc Get security statistics and metrics
 * @access Private (Admin only)
 */
router.get('/stats', requireRole('platform_admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filters = {};
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    const stats = await getSecurityStats(filters);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching security stats:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to fetch security statistics',
      },
    });
  }
});

/**
 * @route GET /api/v1/security/events
 * @desc Get security events with filtering
 * @access Private (Admin only)
 */
router.get('/events', requireRole('platform_admin'), async (req, res) => {
  try {
    const {
      limit = 100,
      severity,
      eventType,
      startDate,
      endDate,
      userId,
      ipAddress,
    } = req.query;

    const query = {};

    if (severity) query.severity = severity;
    if (eventType) query.eventType = eventType;
    if (userId) query['actor.userId'] = userId;
    if (ipAddress) query['request.ipAddress'] = ipAddress;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const events = await SecurityAudit.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .populate('actor.userId', 'name email')
      .populate('investigation.assignedTo', 'name email')
      .populate('investigation.resolvedBy', 'name email');

    const total = await SecurityAudit.countDocuments(query);

    res.json({
      success: true,
      data: events,
      meta: {
        total,
        limit: parseInt(limit, 10),
      },
    });
  } catch (error) {
    console.error('Error fetching security events:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to fetch security events',
      },
    });
  }
});

/**
 * @route GET /api/v1/security/events/:id
 * @desc Get single security event details
 * @access Private (Admin only)
 */
router.get('/events/:id', requireRole('platform_admin'), async (req, res) => {
  try {
    const event = await SecurityAudit.findById(req.params.id)
      .populate('actor.userId', 'name email role')
      .populate('investigation.assignedTo', 'name email')
      .populate('investigation.resolvedBy', 'name email')
      .populate('relatedEvents');

    if (!event) {
      return res.status(404).json({
        error: {
          code: 'not_found',
          message: 'Security event not found',
        },
      });
    }

    res.json({
      success: true,
      data: event,
    });
  } catch (error) {
    console.error('Error fetching security event:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to fetch security event',
      },
    });
  }
});

/**
 * @route PATCH /api/v1/security/events/:id
 * @desc Update security event status
 * @access Private (Admin only)
 */
router.patch('/events/:id', requireRole('platform_admin'), async (req, res) => {
  try {
    const { status, notes, resolution } = req.body;
    const event = await SecurityAudit.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        error: {
          code: 'not_found',
          message: 'Security event not found',
        },
      });
    }

    if (status) {
      event.status = status;
    }

    if (notes) {
      event.investigation.notes = notes;
    }

    if (resolution) {
      event.investigation.resolution = resolution;
      event.investigation.resolvedAt = new Date();
      event.investigation.resolvedBy = req.user._id;
    }

    await event.save();

    res.json({
      success: true,
      data: event,
    });
  } catch (error) {
    console.error('Error updating security event:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to update security event',
      },
    });
  }
});

/**
 * @route GET /api/v1/security/suspicious
 * @desc Get suspicious activities
 * @access Private (Admin only)
 */
router.get('/suspicious', requireRole('platform_admin'), async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const events = await SecurityAudit.findSuspicious({ limit: parseInt(limit, 10) });

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error('Error fetching suspicious activities:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to fetch suspicious activities',
      },
    });
  }
});

/**
 * @route GET /api/v1/security/rate-limits
 * @desc Get rate limit status for an identifier
 * @access Private (Admin only)
 */
router.get('/rate-limits', requireRole('platform_admin'), async (req, res) => {
  try {
    const { identifier } = req.query;

    if (!identifier) {
      return res.status(400).json({
        error: {
          code: 'missing_identifier',
          message: 'Identifier is required',
        },
      });
    }

    const status = await getRateLimitStatus(identifier);

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Error fetching rate limit status:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to fetch rate limit status',
      },
    });
  }
});

/**
 * @route POST /api/v1/security/rate-limits/reset
 * @desc Reset rate limit for an identifier
 * @access Private (Admin only)
 */
router.post('/rate-limits/reset', requireRole('platform_admin'), async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({
        error: {
          code: 'missing_identifier',
          message: 'Identifier is required',
        },
      });
    }

    await resetRateLimit(identifier);

    // Log the action
    await SecurityAudit.logEvent({
      eventType: 'security_setting_changed',
      category: 'system',
      severity: 'medium',
      actor: {
        userId: req.user._id,
        email: req.user.email,
      },
      description: `Rate limit reset for ${identifier}`,
      details: { identifier },
    });

    res.json({
      success: true,
      message: 'Rate limit reset successfully',
    });
  } catch (error) {
    console.error('Error resetting rate limit:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to reset rate limit',
      },
    });
  }
});

/**
 * @route GET /api/v1/security/users/:userId/events
 * @desc Get security events for a specific user
 * @access Private (Admin only)
 */
router.get('/users/:userId/events', requireRole('platform_admin'), async (req, res) => {
  try {
    const { limit = 100, skip = 0 } = req.query;

    const events = await SecurityAudit.findByUser(req.params.userId, {
      limit: parseInt(limit, 10),
      skip: parseInt(skip, 10),
    });

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error('Error fetching user security events:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to fetch user security events',
      },
    });
  }
});

/**
 * @route GET /api/v1/security/ip/:ipAddress/events
 * @desc Get security events for a specific IP address
 * @access Private (Admin only)
 */
router.get('/ip/:ipAddress/events', requireRole('platform_admin'), async (req, res) => {
  try {
    const { limit = 100 } = req.query;

    const events = await SecurityAudit.findByIp(req.params.ipAddress, {
      limit: parseInt(limit, 10),
    });

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error('Error fetching IP security events:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to fetch IP security events',
      },
    });
  }
});

/**
 * @route POST /api/v1/security/block-ip
 * @desc Block an IP address
 * @access Private (Admin only)
 */
router.post('/block-ip', requireRole('platform_admin'), async (req, res) => {
  try {
    const { ipAddress, reason, duration = 24 * 60 * 60 * 1000 } = req.body;

    if (!ipAddress) {
      return res.status(400).json({
        error: {
          code: 'missing_ip',
          message: 'IP address is required',
        },
      });
    }

    // Log the block
    await SecurityAudit.logEvent({
      eventType: 'ip_blocked',
      category: 'network',
      severity: 'high',
      actor: {
        userId: req.user._id,
        email: req.user.email,
      },
      request: {
        ipAddress,
      },
      description: `IP address manually blocked: ${reason}`,
      details: { ipAddress, reason, duration },
    });

    res.json({
      success: true,
      message: `IP ${ipAddress} blocked successfully`,
    });
  } catch (error) {
    console.error('Error blocking IP:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to block IP address',
      },
    });
  }
});

/**
 * @route GET /api/v1/security/dashboard
 * @desc Get dashboard data for security overview
 * @access Private (Admin only)
 */
router.get('/dashboard', requireRole('platform_admin'), async (req, res) => {
  try {
    const now = new Date();
    const last24h = new Date(now - 24 * 60 * 60 * 1000);
    const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [
      totalEvents24h,
      criticalEvents,
      failedLogins24h,
      suspiciousEvents,
      eventsByType,
      eventsBySeverity,
    ] = await Promise.all([
      SecurityAudit.countDocuments({ createdAt: { $gte: last24h } }),
      SecurityAudit.countDocuments({ severity: 'critical', createdAt: { $gte: last24h } }),
      SecurityAudit.countDocuments({ eventType: 'login_failed', createdAt: { $gte: last24h } }),
      SecurityAudit.findSuspicious({ limit: 5 }),
      SecurityAudit.aggregate([
        { $match: { createdAt: { $gte: last7d } } },
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      SecurityAudit.aggregate([
        { $match: { createdAt: { $gte: last24h } } },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalEvents24h,
          criticalEvents,
          failedLogins24h,
        },
        recentSuspicious: suspiciousEvents,
        eventsByType,
        eventsBySeverity,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to fetch dashboard data',
      },
    });
  }
});

module.exports = router;
