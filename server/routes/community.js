/**
 * Community Routes
 * Handles community posts, comments, groups, and feed
 */

const express = require('express');
const CommunityService = require('../services/communityService.js');
const { authenticate } = require('../middleware/auth.js');
const { asyncHandler, ValidationError, NotFoundError, ForbiddenError } = require('../middleware/errorHandler.js');

const router = express.Router();
const communityService = new CommunityService();

// ==================== FEED ROUTES ====================

/**
 * @route   GET /api/community/feed
 * @desc    Get personalized feed
 * @access  Private
 */
router.get('/feed', authenticate, asyncHandler(async (req, res) => {
  const { limit = 20, skip = 0 } = req.query;
  
  const feed = await communityService.getPersonalizedFeed(req.user.id, {
    limit: parseInt(limit),
    skip: parseInt(skip),
  });
  
  res.json({
    success: true,
    data: feed,
    pagination: {
      limit: parseInt(limit),
      skip: parseInt(skip),
    },
  });
}));

/**
 * @route   GET /api/community/trending
 * @desc    Get trending posts
 * @access  Public
 */
router.get('/trending', asyncHandler(async (req, res) => {
  const { category, limit = 10 } = req.query;
  
  const posts = await communityService.getTrending(category, parseInt(limit));
  
  res.json({
    success: true,
    data: posts,
  });
}));

// ==================== POST ROUTES ====================

/**
 * @route   GET /api/community/posts
 * @desc    List posts with filters
 * @access  Public
 */
router.get('/posts', asyncHandler(async (req, res) => {
  const { category, limit = 20, skip = 0, groupId } = req.query;
  
  let posts;
  if (category) {
    posts = await communityService.getPostsByCategory(category, {
      limit: parseInt(limit),
      skip: parseInt(skip),
    });
  } else {
    // Get all posts
    const { CommunityPost, POST_STATUS } = await import('../models/CommunityPost.js');
    const query = { status: POST_STATUS.ACTIVE };
    if (groupId) query.groupId = groupId;
    
    posts = await CommunityPost.find(query)
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .populate('authorId', 'name avatar companyName displayName')
      .lean();
  }
  
  res.json({
    success: true,
    data: posts,
    pagination: {
      limit: parseInt(limit),
      skip: parseInt(skip),
    },
  });
}));

/**
 * @route   POST /api/community/posts
 * @desc    Create a new post
 * @access  Private
 */
router.post('/posts', authenticate, asyncHandler(async (req, res) => {
  const { title, content, category, tags, groupId, attachments } = req.body;
  
  if (!title || !content) {
    throw new ValidationError('Title and content are required');
  }
  
  const result = await communityService.createPost(
    { title, content, category, tags, groupId, attachments },
    req.user.id,
    req.user.role === 'company' ? 'company' : 'user'
  );
  
  res.status(201).json(result);
}));

/**
 * @route   GET /api/community/posts/:id
 * @desc    Get post details
 * @access  Public
 */
router.get('/posts/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  
  const post = await communityService.getPostById(id, userId);
  
  res.json({
    success: true,
    data: post,
  });
}));

/**
 * @route   PUT /api/community/posts/:id
 * @desc    Update a post
 * @access  Private
 */
router.put('/posts/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  
  const result = await communityService.updatePost(id, updateData, req.user.id);
  
  res.json(result);
}));

/**
 * @route   DELETE /api/community/posts/:id
 * @desc    Delete a post
 * @access  Private
 */
router.delete('/posts/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.role === 'platform_admin';
  
  await communityService.deletePost(id, req.user.id, isAdmin);
  
  res.json({ success: true, message: 'Post deleted successfully' });
}));

/**
 * @route   POST /api/community/posts/:id/like
 * @desc    Like/unlike a post
 * @access  Private
 */
router.post('/posts/:id/like', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await communityService.togglePostLike(id, req.user.id);
  
  res.json(result);
}));

// ==================== COMMENT ROUTES ====================

/**
 * @route   GET /api/community/posts/:id/comments
 * @desc    Get comments for a post
 * @access  Public
 */
router.get('/posts/:id/comments', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { limit = 50, skip = 0 } = req.query;
  
  const comments = await communityService.getComments(id, {
    limit: parseInt(limit),
    skip: parseInt(skip),
  });
  
  res.json({
    success: true,
    data: comments,
  });
}));

/**
 * @route   POST /api/community/posts/:id/comment
 * @desc    Add a comment to a post
 * @access  Private
 */
router.post('/posts/:id/comment', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content, parentId } = req.body;
  
  if (!content) {
    throw new ValidationError('Comment content is required');
  }
  
  const result = await communityService.addComment(
    id,
    { content, parentId },
    req.user.id,
    req.user.role === 'company' ? 'company' : 'user'
  );
  
  res.status(201).json(result);
}));

/**
 * @route   PUT /api/community/comments/:id
 * @desc    Update a comment
 * @access  Private
 */
router.put('/comments/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  
  if (!content) {
    throw new ValidationError('Content is required');
  }
  
  const result = await communityService.updateComment(id, content, req.user.id);
  
  res.json(result);
}));

/**
 * @route   DELETE /api/community/comments/:id
 * @desc    Delete a comment
 * @access  Private
 */
router.delete('/comments/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.role === 'platform_admin';
  
  await communityService.deleteComment(id, req.user.id, isAdmin);
  
  res.json({ success: true, message: 'Comment deleted successfully' });
}));

/**
 * @route   POST /api/community/comments/:id/like
 * @desc    Like/unlike a comment
 * @access  Private
 */
router.post('/comments/:id/like', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await communityService.toggleCommentLike(id, req.user.id);
  
  res.json(result);
}));

/**
 * @route   POST /api/community/comments/:id/accept
 * @desc    Mark comment as accepted answer
 * @access  Private
 */
router.post('/comments/:id/accept', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  await communityService.acceptAnswer(id, req.user.id);
  
  res.json({ success: true, message: 'Answer accepted' });
}));

// ==================== GROUP ROUTES ====================

/**
 * @route   GET /api/community/groups
 * @desc    List groups
 * @access  Public
 */
router.get('/groups', asyncHandler(async (req, res) => {
  const { category, limit = 20, skip = 0 } = req.query;
  
  const { CommunityGroup, GROUP_STATUS } = await import('../models/CommunityGroup.js');
  
  const query = { status: GROUP_STATUS.ACTIVE };
  if (category) query.category = category;
  
  const groups = await CommunityGroup.find(query)
    .sort({ memberCount: -1, createdAt: -1 })
    .skip(parseInt(skip))
    .limit(parseInt(limit))
    .select('-membershipRequests')
    .lean();
  
  res.json({
    success: true,
    data: groups,
  });
}));

/**
 * @route   POST /api/community/groups
 * @desc    Create a new group
 * @access  Private
 */
router.post('/groups', authenticate, asyncHandler(async (req, res) => {
  const { name, description, category, isPrivate, tags } = req.body;
  
  if (!name || !category) {
    throw new ValidationError('Name and category are required');
  }
  
  const result = await communityService.createGroup(
    { name, description, category, isPrivate, tags },
    req.user.id
  );
  
  res.status(201).json(result);
}));

/**
 * @route   GET /api/community/groups/:id
 * @desc    Get group details
 * @access  Public
 */
router.get('/groups/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const group = await communityService.getGroupById(id, req.user?.id);
  
  res.json({
    success: true,
    data: group,
  });
}));

/**
 * @route   POST /api/community/groups/:id/join
 * @desc    Join a group
 * @access  Private
 */
router.post('/groups/:id/join', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await communityService.joinGroup(id, req.user.id);
  
  res.json(result);
}));

/**
 * @route   POST /api/community/groups/:id/leave
 * @desc    Leave a group
 * @access  Private
 */
router.post('/groups/:id/leave', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  await communityService.leaveGroup(id, req.user.id);
  
  res.json({ success: true, message: 'Left group successfully' });
}));

/**
 * @route   POST /api/community/groups/:id/moderators
 * @desc    Add moderator to group
 * @access  Private (Group Admin)
 */
router.post('/groups/:id/moderators', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId, permissions } = req.body;
  
  const { CommunityGroup } = await import('../models/CommunityGroup.js');
  const group = await CommunityGroup.findById(id);
  
  if (!group) {
    throw new NotFoundError('Group not found');
  }
  
  if (!group.isAdmin(req.user.id)) {
    throw new ForbiddenError('Only group admins can add moderators');
  }
  
  group.addModerator(userId, req.user.id, permissions);
  await group.save();
  
  res.json({ success: true, message: 'Moderator added successfully' });
}));

// ==================== SEARCH ROUTES ====================

/**
 * @route   GET /api/community/search
 * @desc    Search posts and groups
 * @access  Public
 */
router.get('/search', asyncHandler(async (req, res) => {
  const { q, type = 'all', limit = 20, skip = 0 } = req.query;
  
  if (!q) {
    throw new ValidationError('Search query is required');
  }
  
  const results = await communityService.search(q, {
    type,
    limit: parseInt(limit),
    skip: parseInt(skip),
  });
  
  res.json({
    success: true,
    data: results,
  });
}));

// ==================== MODERATION ROUTES (Admin) ====================

/**
 * @route   POST /api/community/moderate/flag
 * @desc    Flag content for review
 * @access  Private
 */
router.post('/moderate/flag', authenticate, asyncHandler(async (req, res) => {
  const { contentId, contentType, reason } = req.body;
  
  if (!contentId || !contentType || !reason) {
    throw new ValidationError('Content ID, type, and reason are required');
  }
  
  await communityService.flagContent(contentId, contentType, reason, 'user', {
    flaggedByUser: req.user.id,
  });
  
  res.json({ success: true, message: 'Content flagged for review' });
}));

/**
 * @route   POST /api/community/moderate/approve
 * @desc    Approve flagged content (Admin only)
 * @access  Private (Admin)
 */
router.post('/moderate/approve', authenticate, asyncHandler(async (req, res) => {
  const { contentId, contentType } = req.body;
  
  if (req.user.role !== 'platform_admin') {
    throw new ForbiddenError('Admin access required');
  }
  
  await communityService.approveContent(contentId, contentType);
  
  res.json({ success: true, message: 'Content approved' });
}));

/**
 * @route   POST /api/community/moderate/remove
 * @desc    Remove content (Admin only)
 * @access  Private (Admin)
 */
router.post('/moderate/remove', authenticate, asyncHandler(async (req, res) => {
  const { contentId, contentType, reason } = req.body;
  
  if (req.user.role !== 'platform_admin') {
    throw new ForbiddenError('Admin access required');
  }
  
  await communityService.removeContent(contentId, contentType, reason);
  
  res.json({ success: true, message: 'Content removed' });
}));

module.exports = router;