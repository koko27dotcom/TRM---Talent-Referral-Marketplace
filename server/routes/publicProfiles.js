/**
 * Public Profiles Routes
 * Handles public referrer profiles, reviews, and portfolio
 */

const express = require('express');
const PublicProfileService = require('../services/publicProfileService.js');
const { authenticate } = require('../middleware/auth.js');
const { asyncHandler, ValidationError, NotFoundError, ForbiddenError } = require('../middleware/errorHandler.js');

const router = express.Router();
const profileService = new PublicProfileService();

// ==================== PROFILE LISTINGS ====================

/**
 * @route   GET /api/profiles
 * @desc    List public profiles
 * @access  Public
 */
router.get('/', asyncHandler(async (req, res) => {
  const { limit = 20, skip = 0, sortBy } = req.query;
  
  const profiles = await profileService.listProfiles({
    limit: parseInt(limit),
    skip: parseInt(skip),
    sortBy,
  });
  
  res.json({
    success: true,
    data: profiles,
    pagination: {
      limit: parseInt(limit),
      skip: parseInt(skip),
    },
  });
}));

/**
 * @route   GET /api/profiles/featured
 * @desc    Get featured profiles
 * @access  Public
 */
router.get('/featured', asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  
  const profiles = await profileService.getFeaturedProfiles(parseInt(limit));
  
  res.json({
    success: true,
    data: profiles,
  });
}));

/**
 * @route   GET /api/profiles/top-referrers
 * @desc    Get top referrers
 * @access  Public
 */
router.get('/top-referrers', asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  
  const profiles = await profileService.getTopReferrers(parseInt(limit));
  
  res.json({
    success: true,
    data: profiles,
  });
}));

/**
 * @route   GET /api/profiles/search
 * @desc    Search profiles
 * @access  Public
 */
router.get('/search', asyncHandler(async (req, res) => {
  const { q, industries, expertise, availableForMentorship, limit = 20, skip = 0 } = req.query;
  
  if (!q) {
    throw new ValidationError('Search query is required');
  }
  
  const filters = {};
  if (industries) filters.industries = industries.split(',');
  if (expertise) filters.expertise = expertise.split(',');
  if (availableForMentorship === 'true') filters.availableForMentorship = true;
  
  const profiles = await profileService.searchProfiles(q, {
    limit: parseInt(limit),
    skip: parseInt(skip),
    filters,
  });
  
  res.json({
    success: true,
    data: profiles,
  });
}));

/**
 * @route   GET /api/profiles/industry/:industry
 * @desc    Get profiles by industry
 * @access  Public
 */
router.get('/industry/:industry', asyncHandler(async (req, res) => {
  const { industry } = req.params;
  const { limit = 20, skip = 0 } = req.query;
  
  const profiles = await profileService.getProfilesByIndustry(
    industry,
    parseInt(limit),
    parseInt(skip)
  );
  
  res.json({
    success: true,
    data: profiles,
  });
}));

// ==================== PROFILE MANAGEMENT ====================

/**
 * @route   GET /api/profiles/me
 * @desc    Get my public profile
 * @access  Private
 */
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const profile = await profileService.getProfileByUserId(req.user.id, req.user.id);
  
  res.json({
    success: true,
    data: profile,
  });
}));

/**
 * @route   PUT /api/profiles/me
 * @desc    Update my public profile
 * @access  Private
 */
router.put('/me', authenticate, asyncHandler(async (req, res) => {
  const updateData = req.body;
  
  const result = await profileService.updateMyProfile(req.user.id, updateData);
  
  res.json(result);
}));

/**
 * @route   POST /api/profiles/me
 * @desc    Create public profile
 * @access  Private
 */
router.post('/me', authenticate, asyncHandler(async (req, res) => {
  const profileData = req.body;
  
  const result = await profileService.createOrUpdateProfile(req.user.id, profileData);
  
  res.status(201).json(result);
}));

/**
 * @route   GET /api/profiles/:id
 * @desc    Get public profile by user ID
 * @access  Public
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user?.id;
  
  const profile = await profileService.getProfileByUserId(id, currentUserId);
  
  res.json({
    success: true,
    data: profile,
  });
}));

/**
 * @route   GET /api/profiles/slug/:slug
 * @desc    Get profile by slug
 * @access  Public
 */
router.get('/slug/:slug', asyncHandler(async (req, res) => {
  const { slug } = req.params;
  
  const profile = await profileService.getProfileBySlug(slug);
  
  res.json({
    success: true,
    data: profile,
  });
}));

// ==================== PORTFOLIO ====================

/**
 * @route   POST /api/profiles/me/portfolio
 * @desc    Add portfolio item
 * @access  Private
 */
router.post('/me/portfolio', authenticate, asyncHandler(async (req, res) => {
  const itemData = req.body;
  
  if (!itemData.title || !itemData.type) {
    throw new ValidationError('Title and type are required');
  }
  
  const result = await profileService.addPortfolioItem(req.user.id, itemData);
  
  res.status(201).json(result);
}));

/**
 * @route   PUT /api/profiles/me/portfolio/:itemId
 * @desc    Update portfolio item
 * @access  Private
 */
router.put('/me/portfolio/:itemId', authenticate, asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const updateData = req.body;
  
  const result = await profileService.updatePortfolioItem(req.user.id, itemId, updateData);
  
  res.json(result);
}));

/**
 * @route   DELETE /api/profiles/me/portfolio/:itemId
 * @desc    Remove portfolio item
 * @access  Private
 */
router.delete('/me/portfolio/:itemId', authenticate, asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  
  await profileService.removePortfolioItem(req.user.id, itemId);
  
  res.json({ success: true, message: 'Portfolio item removed' });
}));

// ==================== SKILLS ====================

/**
 * @route   POST /api/profiles/me/skills
 * @desc    Add skill
 * @access  Private
 */
router.post('/me/skills', authenticate, asyncHandler(async (req, res) => {
  const { name, level } = req.body;
  
  if (!name) {
    throw new ValidationError('Skill name is required');
  }
  
  const result = await profileService.addSkill(req.user.id, name, level);
  
  res.status(201).json(result);
}));

/**
 * @route   DELETE /api/profiles/me/skills/:skillName
 * @desc    Remove skill
 * @access  Private
 */
router.delete('/me/skills/:skillName', authenticate, asyncHandler(async (req, res) => {
  const { skillName } = req.params;
  
  await profileService.removeSkill(req.user.id, skillName);
  
  res.json({ success: true, message: 'Skill removed' });
}));

/**
 * @route   POST /api/profiles/:id/skills/:skillName/endorse
 * @desc    Endorse a skill
 * @access  Private
 */
router.post('/:id/skills/:skillName/endorse', authenticate, asyncHandler(async (req, res) => {
  const { id, skillName } = req.params;
  
  // Prevent self-endorsement
  if (id === req.user.id) {
    throw new ValidationError('Cannot endorse your own skills');
  }
  
  await profileService.endorseSkill(id, skillName, req.user.id);
  
  res.json({ success: true, message: 'Skill endorsed' });
}));

// ==================== REVIEWS ====================

/**
 * @route   GET /api/profiles/:id/reviews
 * @desc    Get reviews for user
 * @access  Public
 */
router.get('/:id/reviews', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { limit = 10, skip = 0, sortBy } = req.query;
  
  const reviews = await profileService.getReviewsForUser(id, {
    limit: parseInt(limit),
    skip: parseInt(skip),
    sortBy,
  });
  
  res.json({
    success: true,
    data: reviews,
  });
}));

/**
 * @route   POST /api/profiles/:id/review
 * @desc    Add review for user
 * @access  Private
 */
router.post('/:id/review', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, title, content, category, wouldRecommend, referrerDetails } = req.body;
  
  if (!rating || !title || !content || !category) {
    throw new ValidationError('Rating, title, content, and category are required');
  }
  
  if (rating < 1 || rating > 5) {
    throw new ValidationError('Rating must be between 1 and 5');
  }
  
  const result = await profileService.addReview(req.user.id, {
    revieweeId: id,
    revieweeType: 'user',
    rating,
    title,
    content,
    category,
    wouldRecommend,
    referrerDetails,
  });
  
  res.status(201).json(result);
}));

/**
 * @route   GET /api/profiles/me/reviews
 * @desc    Get reviews by me
 * @access  Private
 */
router.get('/me/reviews', authenticate, asyncHandler(async (req, res) => {
  const { limit = 10, skip = 0 } = req.query;
  
  const reviews = await profileService.getReviewsByUser(req.user.id, {
    limit: parseInt(limit),
    skip: parseInt(skip),
  });
  
  res.json({
    success: true,
    data: reviews,
  });
}));

/**
 * @route   POST /api/profiles/reviews/:reviewId/helpful
 * @desc    Vote review as helpful
 * @access  Private
 */
router.post('/reviews/:reviewId/helpful', authenticate, asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const { isHelpful = true } = req.body;
  
  const result = await profileService.voteReviewHelpful(reviewId, req.user.id, isHelpful);
  
  res.json(result);
}));

/**
 * @route   GET /api/profiles/:id/reviews/summary
 * @desc    Get review summary for user
 * @access  Public
 */
router.get('/:id/reviews/summary', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const summary = await profileService.getReviewSummary(id);
  
  res.json({
    success: true,
    data: summary,
  });
}));

// ==================== AVAILABILITY ====================

/**
 * @route   PUT /api/profiles/me/availability
 * @desc    Update availability
 * @access  Private
 */
router.put('/me/availability', authenticate, asyncHandler(async (req, res) => {
  const availabilityData = req.body;
  
  await profileService.updateAvailability(req.user.id, availabilityData);
  
  res.json({ success: true, message: 'Availability updated' });
}));

// ==================== STATISTICS ====================

/**
 * @route   POST /api/profiles/me/sync-stats
 * @desc    Sync statistics from referrals
 * @access  Private
 */
router.post('/me/sync-stats', authenticate, asyncHandler(async (req, res) => {
  await profileService.syncStatisticsFromReferrals(req.user.id);
  
  res.json({ success: true, message: 'Statistics synced' });
}));

// ==================== ADMIN FEATURES ====================

/**
 * @route   POST /api/profiles/:id/feature
 * @desc    Feature profile (Admin only)
 * @access  Private (Admin)
 */
router.post('/:id/feature', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'platform_admin') {
    throw new ForbiddenError('Admin access required');
  }
  
  const { id } = req.params;
  const { order, until } = req.body;
  
  await profileService.featureProfile(id, order || 0, until ? new Date(until) : null);
  
  res.json({ success: true, message: 'Profile featured' });
}));

/**
 * @route   POST /api/profiles/:id/unfeature
 * @desc    Unfeature profile (Admin only)
 * @access  Private (Admin)
 */
router.post('/:id/unfeature', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'platform_admin') {
    throw new ForbiddenError('Admin access required');
  }
  
  const { id } = req.params;
  
  await profileService.unfeatureProfile(id);
  
  res.json({ success: true, message: 'Profile unfeatured' });
}));

/**
 * @route   POST /api/profiles/:id/verify
 * @desc    Verify profile (Admin only)
 * @access  Private (Admin)
 */
router.post('/:id/verify', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'platform_admin') {
    throw new ForbiddenError('Admin access required');
  }
  
  const { id } = req.params;
  
  await profileService.verifyProfile(id);
  
  res.json({ success: true, message: 'Profile verified' });
}));

module.exports = router;