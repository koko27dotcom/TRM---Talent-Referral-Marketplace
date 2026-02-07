/**
 * Notification Routes
 * Handles notification management and delivery
 */

const express = require('express');
const { Notification } = require('../models/index.js');
const { authenticate } = require('../middleware/auth.js');
const { asyncHandler, ValidationError, NotFoundError } = require('../middleware/errorHandler.js');
const { requireAdmin } = require('../middleware/rbac.js');

const router = express.Router();

/**
 * @route   GET /api/notifications
 * @desc    Get current user's notifications
 * @access  Private
 */
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    isRead, 
    types,
    priority 
  } = req.query;
  
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    skip: (parseInt(page) - 1) * parseInt(limit),
  };
  
  // Build query
  if (isRead !== undefined) {
    options.isRead = isRead === 'true';
  }
  
  if (types) {
    options.types = types.split(',');
  }
  
  if (priority) {
    options.priority = priority;
  }
  
  const [notifications, count] = await Promise.all([
    Notification.getForUser(req.user._id, options),
    Notification.getCount(req.user._id, { types: options.types }),
  ]);
  
  res.json({
    success: true,
    data: {
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count.total,
        unread: count.unread,
        totalPages: Math.ceil(count.total / parseInt(limit)),
      },
    },
  });
}));

/**
 * @route   GET /api/notifications/unread
 * @desc    Get unread notifications count
 * @access  Private
 */
router.get('/unread', authenticate, asyncHandler(async (req, res) => {
  const { types } = req.query;
  
  const filters = {};
  if (types) {
    filters.types = types.split(',');
  }
  
  const count = await Notification.getCount(req.user._id, filters);
  
  res.json({
    success: true,
    data: {
      unread: count.unread,
      total: count.total,
    },
  });
}));

/**
 * @route   GET /api/notifications/:id
 * @desc    Get specific notification
 * @access  Private
 */
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const notification = await Notification.findOne({
    _id: id,
    userId: req.user._id,
  });
  
  if (!notification) {
    throw new NotFoundError('Notification');
  }
  
  res.json({
    success: true,
    data: { notification },
  });
}));

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.patch('/:id/read', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const notification = await Notification.findOne({
    _id: id,
    userId: req.user._id,
  });
  
  if (!notification) {
    throw new NotFoundError('Notification');
  }
  
  await notification.markAsRead();
  
  res.json({
    success: true,
    message: 'Notification marked as read',
    data: { notification },
  });
}));

/**
 * @route   PATCH /api/notifications/:id/unread
 * @desc    Mark notification as unread
 * @access  Private
 */
router.patch('/:id/unread', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const notification = await Notification.findOne({
    _id: id,
    userId: req.user._id,
  });
  
  if (!notification) {
    throw new NotFoundError('Notification');
  }
  
  await notification.markAsUnread();
  
  res.json({
    success: true,
    message: 'Notification marked as unread',
    data: { notification },
  });
}));

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.patch('/read-all', authenticate, asyncHandler(async (req, res) => {
  const { types } = req.query;
  
  const filters = {};
  if (types) {
    filters.types = types.split(',');
  }
  
  const result = await Notification.markAllAsRead(req.user._id, filters);
  
  res.json({
    success: true,
    message: `${result.modified} notifications marked as read`,
    data: { modified: result.modified },
  });
}));

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a notification
 * @access  Private
 */
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const notification = await Notification.findOne({
    _id: id,
    userId: req.user._id,
  });
  
  if (!notification) {
    throw new NotFoundError('Notification');
  }
  
  await notification.deleteOne();
  
  res.json({
    success: true,
    message: 'Notification deleted',
  });
}));

/**
 * @route   DELETE /api/notifications
 * @desc    Delete all read notifications
 * @access  Private
 */
router.delete('/', authenticate, asyncHandler(async (req, res) => {
  const result = await Notification.deleteMany({
    userId: req.user._id,
    isRead: true,
  });
  
  res.json({
    success: true,
    message: `${result.deletedCount} notifications deleted`,
    data: { deleted: result.deletedCount },
  });
}));

/**
 * @route   GET /api/notifications/preferences
 * @desc    Get notification preferences
 * @access  Private
 */
router.get('/preferences', authenticate, asyncHandler(async (req, res) => {
  // Get user with preferences
  const { User } = await import('../models/index.js');
  const user = await User.findById(req.user._id).select('notificationPreferences');
  
  // Default preferences if not set
  const defaultPreferences = {
    email: {
      referralUpdates: true,
      payoutUpdates: true,
      subscriptionUpdates: true,
      marketingEmails: false,
    },
    inApp: {
      referralUpdates: true,
      payoutUpdates: true,
      subscriptionUpdates: true,
      systemUpdates: true,
    },
    push: {
      referralUpdates: true,
      payoutUpdates: true,
      urgentOnly: false,
    },
  };
  
  res.json({
    success: true,
    data: {
      preferences: user?.notificationPreferences || defaultPreferences,
    },
  });
}));

/**
 * @route   PUT /api/notifications/preferences
 * @desc    Update notification preferences
 * @access  Private
 */
router.put('/preferences', authenticate, asyncHandler(async (req, res) => {
  const { email, inApp, push } = req.body;
  
  const { User } = await import('../models/index.js');
  
  const updateData = {};
  if (email) updateData['notificationPreferences.email'] = email;
  if (inApp) updateData['notificationPreferences.inApp'] = inApp;
  if (push) updateData['notificationPreferences.push'] = push;
  
  await User.findByIdAndUpdate(req.user._id, {
    $set: updateData,
  });
  
  res.json({
    success: true,
    message: 'Notification preferences updated',
  });
}));

// ==================== ADMIN ROUTES ====================

/**
 * @route   POST /api/notifications/admin/broadcast
 * @desc    Send broadcast notification to all users
 * @access  Private (Admin only)
 */
router.post('/admin/broadcast', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { title, message, type, priority = 'normal', channels = ['in_app'] } = req.body;
  
  if (!title || !message || !type) {
    throw new ValidationError('Title, message, and type are required');
  }
  
  const { User } = await import('../models/index.js');
  
  // Get all active users
  const users = await User.find({ status: 'active' }).select('_id');
  
  // Create notifications for all users
  const notifications = await Promise.all(
    users.map(user =>
      Notification.createNotification({
        userId: user._id,
        type,
        title,
        message,
        priority,
        channels,
        batchId: `broadcast-${Date.now()}`,
      })
    )
  );
  
  res.json({
    success: true,
    message: `Broadcast sent to ${notifications.length} users`,
    data: { sent: notifications.length },
  });
}));

/**
 * @route   POST /api/notifications/admin/send
 * @desc    Send notification to specific user
 * @access  Private (Admin only)
 */
router.post('/admin/send', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { userId, title, message, type, priority = 'normal', channels = ['in_app'] } = req.body;
  
  if (!userId || !title || !message || !type) {
    throw new ValidationError('User ID, title, message, and type are required');
  }
  
  const notification = await Notification.createNotification({
    userId,
    type,
    title,
    message,
    priority,
    channels,
  });
  
  res.json({
    success: true,
    message: 'Notification sent',
    data: { notification },
  });
}));

/**
 * @route   GET /api/notifications/admin/stats
 * @desc    Get notification statistics
 * @access  Private (Admin only)
 */
router.get('/admin/stats', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  const matchStage = {};
  
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }
  
  const stats = await Notification.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        readCount: {
          $sum: { $cond: ['$isRead', 1, 0] },
        },
      },
    },
    { $sort: { count: -1 } },
  ]);
  
  const totalStats = await Notification.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        read: { $sum: { $cond: ['$isRead', 1, 0] } },
        unread: { $sum: { $cond: ['$isRead', 0, 1] } },
      },
    },
  ]);
  
  res.json({
    success: true,
    data: {
      byType: stats,
      totals: totalStats[0] || { total: 0, read: 0, unread: 0 },
    },
  });
}));

/**
 * @route   DELETE /api/notifications/admin/cleanup
 * @desc    Clean up old notifications
 * @access  Private (Admin only)
 */
router.delete('/admin/cleanup', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  
  const result = await Notification.cleanup(parseInt(days));
  
  res.json({
    success: true,
    message: `${result.deleted} old notifications cleaned up`,
    data: { deleted: result.deleted },
  });
}));

module.exports = router;
