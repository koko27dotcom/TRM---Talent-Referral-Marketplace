/**
 * Content Routes
 * Handles blog posts, podcasts, videos, and content management
 */

const express = require('express');
const ContentService = require('../services/contentService.js');
const { authenticate } = require('../middleware/auth.js');
const { asyncHandler, ValidationError, NotFoundError, ForbiddenError } = require('../middleware/errorHandler.js');

const router = express.Router();
const contentService = new ContentService();

// ==================== CONTENT LISTINGS ====================

/**
 * @route   GET /api/content
 * @desc    List all content
 * @access  Public
 */
router.get('/', asyncHandler(async (req, res) => {
  const { type, category, limit = 20, skip = 0 } = req.query;
  
  let content;
  if (type) {
    content = await contentService.getContentByType(type, {
      limit: parseInt(limit),
      skip: parseInt(skip),
      category,
    });
  } else {
    content = await contentService.getLatestContent(null, parseInt(limit), parseInt(skip));
  }
  
  res.json({
    success: true,
    data: content,
    pagination: {
      limit: parseInt(limit),
      skip: parseInt(skip),
    },
  });
}));

/**
 * @route   GET /api/content/featured
 * @desc    Get featured content
 * @access  Public
 */
router.get('/featured', asyncHandler(async (req, res) => {
  const { type, limit = 5 } = req.query;
  
  const content = await contentService.getFeaturedContent(type, parseInt(limit));
  
  res.json({
    success: true,
    data: content,
  });
}));

/**
 * @route   GET /api/content/trending
 * @desc    Get trending content
 * @access  Public
 */
router.get('/trending', asyncHandler(async (req, res) => {
  const { type, limit = 10 } = req.query;
  
  const content = await contentService.getTrendingContent(type, parseInt(limit));
  
  res.json({
    success: true,
    data: content,
  });
}));

/**
 * @route   GET /api/content/blog
 * @desc    Get blog posts
 * @access  Public
 */
router.get('/blog', asyncHandler(async (req, res) => {
  const { category, limit = 20, skip = 0 } = req.query;
  
  const content = await contentService.getContentByType('blog', {
    limit: parseInt(limit),
    skip: parseInt(skip),
    category,
  });
  
  res.json({
    success: true,
    data: content,
  });
}));

/**
 * @route   GET /api/content/podcast
 * @desc    Get podcast episodes
 * @access  Public
 */
router.get('/podcast', asyncHandler(async (req, res) => {
  const { category, limit = 20, skip = 0 } = req.query;
  
  const content = await contentService.getContentByType('podcast', {
    limit: parseInt(limit),
    skip: parseInt(skip),
    category,
  });
  
  res.json({
    success: true,
    data: content,
  });
}));

/**
 * @route   GET /api/content/video
 * @desc    Get videos
 * @access  Public
 */
router.get('/video', asyncHandler(async (req, res) => {
  const { category, limit = 20, skip = 0 } = req.query;
  
  const content = await contentService.getContentByType('video', {
    limit: parseInt(limit),
    skip: parseInt(skip),
    category,
  });
  
  res.json({
    success: true,
    data: content,
  });
}));

/**
 * @route   GET /api/content/search
 * @desc    Search content
 * @access  Public
 */
router.get('/search', asyncHandler(async (req, res) => {
  const { q, type, category, limit = 20, skip = 0 } = req.query;
  
  if (!q) {
    throw new ValidationError('Search query is required');
  }
  
  const content = await contentService.searchContent(q, {
    limit: parseInt(limit),
    skip: parseInt(skip),
    type,
    category,
  });
  
  res.json({
    success: true,
    data: content,
  });
}));

// ==================== CONTENT MANAGEMENT ====================

/**
 * @route   POST /api/content
 * @desc    Create new content
 * @access  Private
 */
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const {
    title,
    description,
    type,
    category,
    content: contentBody,
    contentFormat,
    mediaUrl,
    thumbnail,
    tags,
    seoTitle,
    seoDescription,
  } = req.body;
  
  if (!title || !type || !category || !contentBody) {
    throw new ValidationError('Required fields: title, type, category, content');
  }
  
  const result = await contentService.createContent({
    title,
    description,
    type,
    category,
    content: contentBody,
    contentFormat: contentFormat || 'html',
    mediaUrl,
    thumbnail,
    tags,
    seoTitle,
    seoDescription,
  }, req.user.id);
  
  res.status(201).json(result);
}));

/**
 * @route   GET /api/content/:id
 * @desc    Get content details
 * @access  Public
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  
  const content = await contentService.getContentById(id, userId);
  
  res.json({
    success: true,
    data: content,
  });
}));

/**
 * @route   PUT /api/content/:id
 * @desc    Update content
 * @access  Private (Author)
 */
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  const isAdmin = req.user.role === 'platform_admin';
  
  const result = await contentService.updateContent(id, updateData, req.user.id, isAdmin);
  
  res.json(result);
}));

/**
 * @route   DELETE /api/content/:id
 * @desc    Delete content
 * @access  Private (Author)
 */
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.role === 'platform_admin';
  
  await contentService.deleteContent(id, req.user.id, isAdmin);
  
  res.json({ success: true, message: 'Content deleted successfully' });
}));

/**
 * @route   POST /api/content/:id/publish
 * @desc    Publish content
 * @access  Private (Author)
 */
router.post('/:id/publish', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await contentService.publishContent(id, req.user.id);
  
  res.json(result);
}));

/**
 * @route   POST /api/content/:id/schedule
 * @desc    Schedule content
 * @access  Private (Author)
 */
router.post('/:id/schedule', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { scheduledAt } = req.body;
  
  if (!scheduledAt) {
    throw new ValidationError('Scheduled date is required');
  }
  
  const result = await contentService.scheduleContent(id, req.user.id, new Date(scheduledAt));
  
  res.json(result);
}));

// ==================== ENGAGEMENT ====================

/**
 * @route   POST /api/content/:id/like
 * @desc    Like/unlike content
 * @access  Private
 */
router.post('/:id/like', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await contentService.toggleLike(id, req.user.id);
  
  res.json(result);
}));

/**
 * @route   POST /api/content/:id/comment
 * @desc    Comment on content
 * @access  Private
 */
router.post('/:id/comment', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content, parentId } = req.body;
  
  if (!content) {
    throw new ValidationError('Comment content is required');
  }
  
  const result = await contentService.addComment(id, req.user.id, { content, parentId });
  
  res.status(201).json(result);
}));

/**
 * @route   POST /api/content/:id/share
 * @desc    Share content
 * @access  Private
 */
router.post('/:id/share', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { platform } = req.body;
  
  const result = await contentService.shareContent(id, req.user.id, platform);
  
  res.json(result);
}));

/**
 * @route   GET /api/content/:id/related
 * @desc    Get related content
 * @access  Public
 */
router.get('/:id/related', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { limit = 5 } = req.query;
  
  const content = await contentService.getRelatedContent(id, parseInt(limit));
  
  res.json({
    success: true,
    data: content,
  });
}));

// ==================== AUTHOR CONTENT ====================

/**
 * @route   GET /api/content/author/:authorId
 * @desc    Get content by author
 * @access  Public
 */
router.get('/author/:authorId', asyncHandler(async (req, res) => {
  const { authorId } = req.params;
  const { limit = 20, skip = 0 } = req.query;
  
  const content = await contentService.getContentByAuthor(authorId, {
    limit: parseInt(limit),
    skip: parseInt(skip),
  });
  
  res.json({
    success: true,
    data: content,
  });
}));

// ==================== ANALYTICS ====================

/**
 * @route   GET /api/content/:id/analytics
 * @desc    Get content analytics
 * @access  Private (Author)
 */
router.get('/:id/analytics', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await contentService.getContentAnalytics(id, req.user.id);
  
  res.json(result);
}));

// ==================== NEWSLETTER ====================

/**
 * @route   GET /api/content/newsletter/generate
 * @desc    Generate newsletter content
 * @access  Private (Admin)
 */
router.get('/newsletter/generate', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'platform_admin') {
    throw new ForbiddenError('Admin access required');
  }
  
  const { limit, categories } = req.query;
  
  const result = await contentService.generateNewsletter({
    limit: limit ? parseInt(limit) : 5,
    categories: categories ? categories.split(',') : [],
  });
  
  res.json(result);
}));

// ==================== ADMIN FEATURES ====================

/**
 * @route   POST /api/content/:id/feature
 * @desc    Feature content (Admin only)
 * @access  Private (Admin)
 */
router.post('/:id/feature', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'platform_admin') {
    throw new ForbiddenError('Admin access required');
  }
  
  const { id } = req.params;
  const { order, until } = req.body;
  
  await contentService.featureContent(id, order || 0, until ? new Date(until) : null);
  
  res.json({ success: true, message: 'Content featured successfully' });
}));

/**
 * @route   POST /api/content/:id/unfeature
 * @desc    Unfeature content (Admin only)
 * @access  Private (Admin)
 */
router.post('/:id/unfeature', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'platform_admin') {
    throw new ForbiddenError('Admin access required');
  }
  
  const { id } = req.params;
  
  await contentService.unfeatureContent(id);
  
  res.json({ success: true, message: 'Content unfeatured successfully' });
}));

/**
 * @route   POST /api/content/:id/seo
 * @desc    Generate SEO metadata
 * @access  Private (Author)
 */
router.post('/:id/seo', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await contentService.generateSEOMetadata(id);
  
  res.json(result);
}));

module.exports = router;