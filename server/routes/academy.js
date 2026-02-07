/**
 * Academy Routes
 * API endpoints for Referral Academy educational content
 */

const express = require('express');
const academyService = require('../services/academyService.js');
const { authenticate } = require('../middleware/auth.js');
const { asyncHandler, ValidationError, NotFoundError } = require('../middleware/errorHandler.js');
const { requireAdmin } = require('../middleware/rbac.js');

const router = express.Router();

// ==================== PUBLIC ENDPOINTS ====================

/**
 * @route   GET /api/academy/courses
 * @desc    Get all published courses
 * @access  Public
 */
router.get('/courses', asyncHandler(async (req, res) => {
  const { category, difficulty, search } = req.query;
  
  const courses = await academyService.getAllCourses({
    category,
    difficulty,
    search,
  });
  
  res.json({
    success: true,
    data: courses,
  });
}));

/**
 * @route   GET /api/academy/courses/featured
 * @desc    Get featured courses
 * @access  Public
 */
router.get('/courses/featured', asyncHandler(async (req, res) => {
  const courses = await academyService.getFeaturedCourses();
  
  res.json({
    success: true,
    data: courses,
  });
}));

/**
 * @route   GET /api/academy/courses/categories
 * @desc    Get course categories with counts
 * @access  Public
 */
router.get('/courses/categories', asyncHandler(async (req, res) => {
  const categories = await academyService.getCategories();
  
  res.json({
    success: true,
    data: categories,
  });
}));

/**
 * @route   GET /api/academy/courses/search
 * @desc    Search courses
 * @access  Public
 */
router.get('/courses/search', asyncHandler(async (req, res) => {
  const { q, language = 'en' } = req.query;
  
  if (!q) {
    throw new ValidationError('Search query is required');
  }
  
  const courses = await academyService.searchCourses(q, language);
  
  res.json({
    success: true,
    data: courses,
  });
}));

/**
 * @route   GET /api/academy/courses/:identifier
 * @desc    Get course by ID or slug
 * @access  Public
 */
router.get('/courses/:identifier', asyncHandler(async (req, res) => {
  const { identifier } = req.params;
  const userId = req.user?._id || null;
  
  const result = await academyService.getCourse(identifier, userId);
  
  res.json({
    success: true,
    data: result,
  });
}));

/**
 * @route   GET /api/academy/leaderboard
 * @desc    Get academy leaderboard
 * @access  Public
 */
router.get('/leaderboard', asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  
  const leaderboard = await academyService.getLeaderboard(parseInt(limit));
  
  res.json({
    success: true,
    data: leaderboard,
  });
}));

/**
 * @route   GET /api/academy/stats
 * @desc    Get academy statistics
 * @access  Public
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const stats = await academyService.getAcademyStats();
  
  res.json({
    success: true,
    data: stats,
  });
}));

// ==================== PROTECTED ENDPOINTS ====================

/**
 * @route   POST /api/academy/courses/:courseId/start
 * @desc    Start a course
 * @access  Private
 */
router.post('/courses/:courseId/start', authenticate, asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const userId = req.user._id;
  
  const progress = await academyService.startCourse(userId, courseId);
  
  res.json({
    success: true,
    message: 'Course started successfully',
    data: progress,
  });
}));

/**
 * @route   POST /api/academy/courses/:courseId/progress
 * @desc    Update course progress
 * @access  Private
 */
router.post('/courses/:courseId/progress', authenticate, asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { sectionIndex, completed } = req.body;
  const userId = req.user._id;
  
  if (sectionIndex === undefined) {
    throw new ValidationError('Section index is required');
  }
  
  const progress = await academyService.updateProgress(
    userId,
    courseId,
    parseInt(sectionIndex),
    completed
  );
  
  res.json({
    success: true,
    data: progress,
  });
}));

/**
 * @route   POST /api/academy/courses/:courseId/quiz/:sectionIndex
 * @desc    Submit quiz answers
 * @access  Private
 */
router.post('/courses/:courseId/quiz/:sectionIndex', authenticate, asyncHandler(async (req, res) => {
  const { courseId, sectionIndex } = req.params;
  const { answers } = req.body;
  const userId = req.user._id;
  
  if (!answers || !Array.isArray(answers)) {
    throw new ValidationError('Answers array is required');
  }
  
  const result = await academyService.submitQuiz(
    userId,
    courseId,
    parseInt(sectionIndex),
    answers
  );
  
  res.json({
    success: true,
    data: result,
  });
}));

/**
 * @route   POST /api/academy/courses/:courseId/feedback
 * @desc    Add course feedback
 * @access  Private
 */
router.post('/courses/:courseId/feedback', authenticate, asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { rating, feedback } = req.body;
  const userId = req.user._id;
  
  if (!rating || rating < 1 || rating > 5) {
    throw new ValidationError('Rating must be between 1 and 5');
  }
  
  const progress = await academyService.addFeedback(userId, courseId, rating, feedback);
  
  res.json({
    success: true,
    message: 'Feedback submitted successfully',
    data: progress,
  });
}));

/**
 * @route   GET /api/academy/my-progress
 * @desc    Get user's course progress
 * @access  Private
 */
router.get('/my-progress', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user._id;
  
  const result = await academyService.getUserProgress(userId);
  
  res.json({
    success: true,
    data: result,
  });
}));

/**
 * @route   GET /api/academy/my-current-course
 * @desc    Get user's current in-progress course
 * @access  Private
 */
router.get('/my-current-course', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user._id;
  
  const progress = await academyService.getCurrentCourse(userId);
  
  res.json({
    success: true,
    data: progress,
  });
}));

/**
 * @route   GET /api/academy/recommended
 * @desc    Get recommended courses for user
 * @access  Private
 */
router.get('/recommended', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user._id;
  
  const courses = await academyService.getRecommendedCourses(userId);
  
  res.json({
    success: true,
    data: courses,
  });
}));

/**
 * @route   GET /api/academy/certificates
 * @desc    Get user's certificates
 * @access  Private
 */
router.get('/certificates', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user._id;
  
  const AcademyProgress = require('../models/AcademyProgress.js');
  const certificates = await AcademyProgress.find({
    userId,
    certificateIssued: true,
  })
    .populate('courseId', 'title slug')
    .select('courseId certificateUrl completedAt pointsEarned');
  
  res.json({
    success: true,
    data: certificates,
  });
}));

// ==================== ADMIN ENDPOINTS ====================

/**
 * @route   POST /api/academy/courses
 * @desc    Create new course
 * @access  Private (Admin only)
 */
router.post('/courses', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const course = await academyService.createCourse(req.body);
  
  res.status(201).json({
    success: true,
    message: 'Course created successfully',
    data: course,
  });
}));

/**
 * @route   PUT /api/academy/courses/:courseId
 * @desc    Update course
 * @access  Private (Admin only)
 */
router.put('/courses/:courseId', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  
  const course = await academyService.updateCourse(courseId, req.body);
  
  res.json({
    success: true,
    message: 'Course updated successfully',
    data: course,
  });
}));

/**
 * @route   DELETE /api/academy/courses/:courseId
 * @desc    Archive course
 * @access  Private (Admin only)
 */
router.delete('/courses/:courseId', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  
  await academyService.deleteCourse(courseId);
  
  res.json({
    success: true,
    message: 'Course archived successfully',
  });
}));

/**
 * @route   POST /api/academy/courses/:courseId/publish
 * @desc    Publish course
 * @access  Private (Admin only)
 */
router.post('/courses/:courseId/publish', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  
  const AcademyCourse = require('../models/AcademyCourse.js');
  const course = await AcademyCourse.findById(courseId);
  
  if (!course) {
    throw new NotFoundError('Course');
  }
  
  await course.publish();
  
  res.json({
    success: true,
    message: 'Course published successfully',
    data: course,
  });
}));

/**
 * @route   GET /api/academy/admin/stats
 * @desc    Get detailed admin statistics
 * @access  Private (Admin only)
 */
router.get('/admin/stats', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const AcademyProgress = require('../models/AcademyProgress.js');
  const AcademyCourse = require('../models/AcademyCourse.js');
  
  const [
    totalCourses,
    totalEnrollments,
    totalCompletions,
    recentEnrollments,
    popularCourses,
  ] = await Promise.all([
    AcademyCourse.countDocuments(),
    AcademyProgress.countDocuments(),
    AcademyProgress.countDocuments({ status: 'completed' }),
    AcademyProgress.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('userId', 'name email')
      .populate('courseId', 'title'),
    AcademyCourse.find({ status: 'published' })
      .sort({ 'metadata.completionCount': -1 })
      .limit(5)
      .select('title metadata.completionCount metadata.viewCount'),
  ]);
  
  res.json({
    success: true,
    data: {
      totalCourses,
      totalEnrollments,
      totalCompletions,
      completionRate: totalEnrollments > 0 ? (totalCompletions / totalEnrollments) * 100 : 0,
      recentEnrollments,
      popularCourses,
    },
  });
}));

module.exports = router;
