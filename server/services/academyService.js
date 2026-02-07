/**
 * Academy Service
 * Manages Referral Academy educational content and user progress
 */

const AcademyCourse = require('../models/AcademyCourse.js');
const AcademyProgress = require('../models/AcademyProgress.js');
const { User } = require('../models/index.js');
const gamificationService = require('./gamificationService.js');

/**
 * Get all published courses
 */
const getAllCourses = async (filters = {}) => {
  const query = { status: 'published' };
  
  if (filters.category) query.category = filters.category;
  if (filters.difficulty) query.difficulty = filters.difficulty;
  if (filters.search) {
    query.$or = [
      { 'title.en': { $regex: filters.search, $options: 'i' } },
      { 'title.my': { $regex: filters.search, $options: 'i' } },
      { tags: { $in: [new RegExp(filters.search, 'i')] } },
    ];
  }
  
  const courses = await AcademyCourse.find(query)
    .sort({ isFeatured: -1, order: 1, createdAt: -1 })
    .select('-content.quiz');
  
  return courses;
};

/**
 * Get course by ID or slug
 */
const getCourse = async (identifier, userId = null) => {
  const query = identifier.match(/^[0-9a-fA-F]{24}$/)
    ? { _id: identifier }
    : { slug: identifier };
  
  const course = await AcademyCourse.findOne(query);
  
  if (!course) {
    throw new Error('Course not found');
  }
  
  // Increment view count
  await course.incrementViews();
  
  // Get user progress if userId provided
  let progress = null;
  if (userId) {
    progress = await AcademyProgress.findOne({
      userId,
      courseId: course._id,
    });
  }
  
  return {
    course,
    progress,
  };
};

/**
 * Get featured courses
 */
const getFeaturedCourses = async () => {
  return await AcademyCourse.findFeatured();
};

/**
 * Get courses by category
 */
const getCoursesByCategory = async (category) => {
  return await AcademyCourse.findByCategory(category);
};

/**
 * Get course categories with counts
 */
const getCategories = async () => {
  const categories = await AcademyCourse.aggregate([
    { $match: { status: 'published' } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);
  
  const categoryLabels = {
    getting_started: { en: 'Getting Started', my: 'စတင်အသုံးပြုခြင်း' },
    referral_strategies: { en: 'Referral Strategies', my: 'လွှဲပြောင်းခြင်းနည်းလမ်းများ' },
    payment_system: { en: 'Payment System', my: 'ငွေပေးချေမှုစနစ်' },
    kyc_verification: { en: 'KYC Verification', my: 'KYC အတည်ပြုခြင်း' },
    advanced_techniques: { en: 'Advanced Techniques', my: 'အဆင့်မြင့်နည်းလမ်းများ' },
    success_stories: { en: 'Success Stories', my: 'အောင်မြင်မှုအကြောင်းများ' },
    platform_guide: { en: 'Platform Guide', my: 'ပလက်ဖောင်းလမ်းညွှန်' },
    myanmar_market: { en: 'Myanmar Market', my: 'မြန်မာဈေးကွက်' },
  };
  
  return categories.map(cat => ({
    id: cat._id,
    label: categoryLabels[cat._id] || { en: cat._id, my: cat._id },
    count: cat.count,
  }));
};

/**
 * Start a course for a user
 */
const startCourse = async (userId, courseId) => {
  let progress = await AcademyProgress.findOne({ userId, courseId });
  
  if (!progress) {
    const course = await AcademyCourse.findById(courseId);
    if (!course) {
      throw new Error('Course not found');
    }
    
    progress = await AcademyProgress.create({
      userId,
      courseId,
      status: 'in_progress',
      startedAt: new Date(),
      lastAccessedAt: new Date(),
      progress: {
        currentSection: 0,
        completedSections: [],
        totalSections: course.content.length,
        percentage: 0,
      },
    });
  } else if (progress.status === 'not_started') {
    await progress.start();
  }
  
  return progress;
};

/**
 * Update course progress
 */
const updateProgress = async (userId, courseId, sectionIndex, completed = false) => {
  let progress = await AcademyProgress.findOne({ userId, courseId });
  
  if (!progress) {
    progress = await startCourse(userId, courseId);
  }
  
  await progress.updateProgress(sectionIndex, completed);
  
  // Check if course completed
  if (progress.status === 'completed' && !progress.certificateIssued) {
    await issueCertificate(userId, courseId);
  }
  
  return progress;
};

/**
 * Submit quiz answers
 */
const submitQuiz = async (userId, courseId, sectionIndex, answers) => {
  const course = await AcademyCourse.findById(courseId);
  if (!course) {
    throw new Error('Course not found');
  }
  
  const section = course.content[sectionIndex];
  if (!section || !section.quiz || section.quiz.length === 0) {
    throw new Error('Quiz not found for this section');
  }
  
  // Calculate score
  let correctCount = 0;
  section.quiz.forEach((question, index) => {
    if (answers[index] === question.correctAnswer) {
      correctCount++;
    }
  });
  
  const score = correctCount;
  const totalQuestions = section.quiz.length;
  const percentage = (score / totalQuestions) * 100;
  const passed = percentage >= 70; // 70% passing grade
  
  // Save quiz result
  let progress = await AcademyProgress.findOne({ userId, courseId });
  if (!progress) {
    progress = await startCourse(userId, courseId);
  }
  
  await progress.addQuizResult(sectionIndex, score, totalQuestions, answers, passed);
  
  // If passed, mark section as completed
  if (passed) {
    await updateProgress(userId, courseId, sectionIndex, true);
  }
  
  return {
    score,
    totalQuestions,
    percentage,
    passed,
    correctAnswers: section.quiz.map((q, i) => ({
      questionIndex: i,
      correctAnswer: q.correctAnswer,
      userAnswer: answers[i],
      isCorrect: answers[i] === q.correctAnswer,
      explanation: q.explanation,
    })),
  };
};

/**
 * Issue certificate for completed course
 */
const issueCertificate = async (userId, courseId) => {
  const progress = await AcademyProgress.findOne({ userId, courseId });
  const course = await AcademyCourse.findById(courseId);
  const user = await User.findById(userId);
  
  if (!progress || progress.status !== 'completed') {
    throw new Error('Course not completed');
  }
  
  // Generate certificate URL (in production, this would generate a PDF)
  const certificateId = `${userId}_${courseId}_${Date.now()}`;
  const certificateUrl = `${process.env.FRONTEND_URL}/academy/certificates/${certificateId}`;
  
  progress.certificateIssued = true;
  progress.certificateUrl = certificateUrl;
  await progress.save();
  
  // Award badge if associated
  if (course.badgeId) {
    await gamificationService.awardBadge(userId, course.badgeId);
  }
  
  // Award points
  await gamificationService.addPoints(userId, progress.pointsEarned, 'course_completion', {
    courseId: course._id,
    courseName: course.title.en,
  });
  
  // Increment course completion count
  await course.incrementCompletions();
  
  return {
    certificateId,
    certificateUrl,
    courseName: course.title,
    completedAt: progress.completedAt,
  };
};

/**
 * Get user's course progress
 */
const getUserProgress = async (userId) => {
  const progress = await AcademyProgress.findByUser(userId);
  const stats = await AcademyProgress.getUserStats(userId);
  
  return {
    progress,
    stats,
  };
};

/**
 * Get user's current course
 */
const getCurrentCourse = async (userId) => {
  const progress = await AcademyProgress.findOne({
    userId,
    status: 'in_progress',
  })
    .sort({ lastAccessedAt: -1 })
    .populate('courseId');
  
  return progress;
};

/**
 * Add course feedback
 */
const addFeedback = async (userId, courseId, rating, feedback) => {
  const progress = await AcademyProgress.findOne({ userId, courseId });
  
  if (!progress) {
    throw new Error('Course progress not found');
  }
  
  progress.rating = rating;
  progress.feedback = feedback;
  await progress.save();
  
  return progress;
};

/**
 * Get academy statistics
 */
const getAcademyStats = async () => {
  const [
    totalCourses,
    totalEnrollments,
    totalCompletions,
    averageRating,
  ] = await Promise.all([
    AcademyCourse.countDocuments({ status: 'published' }),
    AcademyProgress.countDocuments(),
    AcademyProgress.countDocuments({ status: 'completed' }),
    AcademyProgress.aggregate([
      { $match: { rating: { $exists: true } } },
      { $group: { _id: null, avg: { $avg: '$rating' } } },
    ]),
  ]);
  
  return {
    totalCourses,
    totalEnrollments,
    totalCompletions,
    completionRate: totalEnrollments > 0 ? (totalCompletions / totalEnrollments) * 100 : 0,
    averageRating: averageRating[0]?.avg || 0,
  };
};

/**
 * Get recommended courses for user
 */
const getRecommendedCourses = async (userId) => {
  // Get user's completed courses
  const userProgress = await AcademyProgress.find({ userId });
  const completedCourseIds = userProgress
    .filter(p => p.status === 'completed')
    .map(p => p.courseId.toString());
  
  // Get user's in-progress courses
  const inProgressCourseIds = userProgress
    .filter(p => p.status === 'in_progress')
    .map(p => p.courseId.toString());
  
  // Find recommended courses
  const recommendations = await AcademyCourse.find({
    status: 'published',
    _id: { $nin: [...completedCourseIds, ...inProgressCourseIds] },
  })
    .sort({ isFeatured: -1, 'metadata.completionCount': -1 })
    .limit(5);
  
  return recommendations;
};

/**
 * Search courses
 */
const searchCourses = async (query, language = 'en') => {
  const searchField = `title.${language}`;
  const descriptionField = `description.${language}`;
  
  const courses = await AcademyCourse.find({
    status: 'published',
    $or: [
      { [searchField]: { $regex: query, $options: 'i' } },
      { [descriptionField]: { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } },
    ],
  }).limit(20);
  
  return courses;
};

/**
 * Create new course (admin only)
 */
const createCourse = async (courseData) => {
  const course = await AcademyCourse.create(courseData);
  return course;
};

/**
 * Update course (admin only)
 */
const updateCourse = async (courseId, updateData) => {
  const course = await AcademyCourse.findByIdAndUpdate(
    courseId,
    { ...updateData, 'metadata.lastUpdatedAt': new Date() },
    { new: true }
  );
  
  if (!course) {
    throw new Error('Course not found');
  }
  
  return course;
};

/**
 * Delete course (admin only)
 */
const deleteCourse = async (courseId) => {
  const course = await AcademyCourse.findById(courseId);
  
  if (!course) {
    throw new Error('Course not found');
  }
  
  await course.archive();
  return { success: true };
};

/**
 * Get leaderboard
 */
const getLeaderboard = async (limit = 10) => {
  return await AcademyProgress.getLeaderboard(limit);
};

module.exports = {
  // Course management
  getAllCourses,
  getCourse,
  getFeaturedCourses,
  getCoursesByCategory,
  getCategories,
  createCourse,
  updateCourse,
  deleteCourse,
  searchCourses,
  
  // Progress tracking
  startCourse,
  updateProgress,
  submitQuiz,
  issueCertificate,
  getUserProgress,
  getCurrentCourse,
  addFeedback,
  
  // Statistics
  getAcademyStats,
  getRecommendedCourses,
  getLeaderboard,
};
