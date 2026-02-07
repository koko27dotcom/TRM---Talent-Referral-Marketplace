/**
 * Matching Routes
 * API endpoints for job-candidate matching functionality
 */

const express = require('express');
const { authenticate } = require('../middleware/auth.js');
const { requireRole } = require('../middleware/rbac.js');
const { matchingEngine } = require('../services/matchingEngine.js');
const { MatchScore, Job, User } = require('../models/index.js');
const { asyncHandler, AppError } = require('../middleware/errorHandler.js');

const router = express.Router();

// ==================== PUBLIC ROUTES ====================

/**
 * @route   GET /api/v1/matching/health
 * @desc    Health check for matching service
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Matching service is running',
    timestamp: new Date().toISOString(),
  });
});

// ==================== PROTECTED ROUTES ====================

// Apply authentication to all routes below
router.use(authenticate);

/**
 * @route   POST /api/v1/matching/calculate
 * @desc    Calculate match score for a job-candidate pair
 * @access  Private (Corporate Recruiters, Admins, or Self)
 */
router.post('/calculate', asyncHandler(async (req, res) => {
  const { jobId, candidateId } = req.body;

  if (!jobId || !candidateId) {
    throw new AppError('Job ID and Candidate ID are required', 400);
  }

  // Check permissions
  const job = await Job.findById(jobId);
  if (!job) {
    throw new AppError('Job not found', 404);
  }

  const candidate = await User.findById(candidateId);
  if (!candidate) {
    throw new AppError('Candidate not found', 404);
  }

  // Allow if: corporate recruiter/admin for the company, or candidate checking themselves
  const isAuthorized =
    req.user.role === 'platform_admin' ||
    req.user.role === 'corporate_admin' ||
    req.user.role === 'corporate_recruiter' ||
    candidateId === req.user._id.toString();

  if (!isAuthorized) {
    throw new AppError('Not authorized to calculate match score', 403);
  }

  // Calculate match score
  const result = await matchingEngine.calculateMatchScore(jobId, candidateId);

  res.json({
    success: true,
    data: result,
  });
}));

/**
 * @route   GET /api/v1/matching/suggestions/:jobId
 * @desc    Get top 5 matching candidates for a job
 * @access  Private (Corporate Recruiters, Admins)
 */
router.get('/suggestions/:jobId', asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const { limit = 5, minScore = 0, recalculate = false } = req.query;

  // Check permissions
  const job = await Job.findById(jobId).populate('companyId');
  if (!job) {
    throw new AppError('Job not found', 404);
  }

  const isAuthorized =
    req.user.role === 'platform_admin' ||
    req.user.role === 'corporate_admin' ||
    req.user.role === 'corporate_recruiter';

  if (!isAuthorized) {
    throw new AppError('Not authorized to view candidate suggestions', 403);
  }

  // Get top candidates
  const suggestions = await matchingEngine.getTopCandidatesForJob(jobId, {
    limit: parseInt(limit),
    minScore: parseInt(minScore),
    recalculate: recalculate === 'true',
  });

  res.json({
    success: true,
    data: {
      job: {
        id: job._id,
        title: job.title,
        company: job.companyId,
      },
      suggestions,
      count: suggestions.length,
    },
  });
}));

/**
 * @route   GET /api/v1/matching/jobs-for-candidate/:userId
 * @desc    Get jobs that match a candidate
 * @access  Private (Self or Corporate Recruiters)
 */
router.get('/jobs-for-candidate/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { limit = 10, minScore = 0, recalculate = false } = req.query;

  // Check permissions
  const isAuthorized =
    req.user.role === 'platform_admin' ||
    req.user.role === 'corporate_admin' ||
    req.user.role === 'corporate_recruiter' ||
    userId === req.user._id.toString();

  if (!isAuthorized) {
    throw new AppError('Not authorized to view job matches', 403);
  }

  const candidate = await User.findById(userId);
  if (!candidate) {
    throw new AppError('Candidate not found', 404);
  }

  // Get top matching jobs
  const matches = await matchingEngine.getTopJobsForCandidate(userId, {
    limit: parseInt(limit),
    minScore: parseInt(minScore),
    recalculate: recalculate === 'true',
  });

  res.json({
    success: true,
    data: {
      candidate: {
        id: candidate._id,
        name: candidate.name,
      },
      matches,
      count: matches.length,
    },
  });
}));

/**
 * @route   GET /api/v1/matching/my-matches
 * @desc    Get jobs matching the current user (candidate)
 * @access  Private (Job Seekers)
 */
router.get('/my-matches', requireRole(['job_seeker']), asyncHandler(async (req, res) => {
  const { limit = 10, minScore = 0 } = req.query;

  const matches = await matchingEngine.getTopJobsForCandidate(req.user._id, {
    limit: parseInt(limit),
    minScore: parseInt(minScore),
  });

  res.json({
    success: true,
    data: {
      matches,
      count: matches.length,
    },
  });
}));

/**
 * @route   GET /api/v1/matching/referrer-suggestions
 * @desc    Get candidate suggestions for a referrer
 * @access  Private (Referrers)
 */
router.get('/referrer-suggestions', requireRole(['referrer']), asyncHandler(async (req, res) => {
  const { limit = 5, jobId = null } = req.query;

  const suggestions = await matchingEngine.getSuggestionsForReferrer(req.user._id, {
    limit: parseInt(limit),
    jobId,
  });

  res.json({
    success: true,
    data: {
      suggestions,
      count: suggestions.length,
    },
  });
}));

/**
 * @route   GET /api/v1/matching/job/:jobId/stats
 * @desc    Get match statistics for a job
 * @access  Private (Corporate Recruiters, Admins)
 */
router.get('/job/:jobId/stats', asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  const job = await Job.findById(jobId);
  if (!job) {
    throw new AppError('Job not found', 404);
  }

  const isAuthorized =
    req.user.role === 'platform_admin' ||
    req.user.role === 'corporate_admin' ||
    req.user.role === 'corporate_recruiter';

  if (!isAuthorized) {
    throw new AppError('Not authorized to view match statistics', 403);
  }

  const stats = await matchingEngine.getJobMatchStats(jobId);

  res.json({
    success: true,
    data: stats,
  });
}));

/**
 * @route   GET /api/v1/matching/candidate/:userId/stats
 * @desc    Get match statistics for a candidate
 * @access  Private (Self or Corporate Recruiters)
 */
router.get('/candidate/:userId/stats', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const isAuthorized =
    req.user.role === 'platform_admin' ||
    req.user.role === 'corporate_admin' ||
    req.user.role === 'corporate_recruiter' ||
    userId === req.user._id.toString();

  if (!isAuthorized) {
    throw new AppError('Not authorized to view match statistics', 403);
  }

  const stats = await matchingEngine.getCandidateMatchStats(userId);

  res.json({
    success: true,
    data: stats,
  });
}));

// ==================== ADMIN ROUTES ====================

/**
 * @route   POST /api/v1/matching/batch-calculate
 * @desc    Batch calculate match scores for a job
 * @access  Private (Admin only)
 */
router.post('/batch-calculate', requireRole(['platform_admin']), asyncHandler(async (req, res) => {
  const { jobId } = req.body;

  if (!jobId) {
    throw new AppError('Job ID is required', 400);
  }

  const job = await Job.findById(jobId);
  if (!job) {
    throw new AppError('Job not found', 404);
  }

  // Run batch calculation asynchronously
  const result = await matchingEngine.batchCalculateForJob(jobId);

  res.json({
    success: true,
    message: 'Batch calculation completed',
    data: result,
  });
}));

/**
 * @route   POST /api/v1/matching/notify-perfect-matches
 * @desc    Find and notify perfect matches
 * @access  Private (Admin only)
 */
router.post('/notify-perfect-matches', requireRole(['platform_admin']), asyncHandler(async (req, res) => {
  const { jobId } = req.body;

  const result = await matchingEngine.findAndNotifyPerfectMatches(jobId || null);

  res.json({
    success: true,
    message: `Notified ${result.notified.length} perfect matches`,
    data: result,
  });
}));

/**
 * @route   POST /api/v1/matching/send-suggestions
 * @desc    Send candidate suggestions to referrers
 * @access  Private (Admin only)
 */
router.post('/send-suggestions', requireRole(['platform_admin']), asyncHandler(async (req, res) => {
  const { referrerId, jobId } = req.body;

  if (!referrerId) {
    throw new AppError('Referrer ID is required', 400);
  }

  const referrer = await User.findById(referrerId);
  if (!referrer || referrer.role !== 'referrer') {
    throw new AppError('Referrer not found', 404);
  }

  const result = await matchingEngine.sendSuggestionsToReferrer(referrerId, jobId || null);

  res.json({
    success: true,
    message: `Sent ${result.sent} suggestions`,
    data: result,
  });
}));

/**
 * @route   POST /api/v1/matching/recalculate-all
 * @desc    Recalculate all match scores (maintenance)
 * @access  Private (Admin only)
 */
router.post('/recalculate-all', requireRole(['platform_admin']), asyncHandler(async (req, res) => {
  // Run recalculation asynchronously
  const result = await matchingEngine.recalculateAll();

  res.json({
    success: true,
    message: 'Recalculation completed',
    data: result,
  });
}));

/**
 * @route   GET /api/v1/matching/scores
 * @desc    Get all match scores (with filters)
 * @access  Private (Admin only)
 */
router.get('/scores', requireRole(['platform_admin']), asyncHandler(async (req, res) => {
  const { 
    jobId, 
    candidateId, 
    minScore = 0, 
    maxScore = 100,
    status,
    isPerfectMatch,
    limit = 50,
    page = 1,
  } = req.query;

  const query = {
    overallScore: { $gte: parseInt(minScore), $lte: parseInt(maxScore) },
  };

  if (jobId) query.jobId = jobId;
  if (candidateId) query.candidateId = candidateId;
  if (status) query.status = status;
  if (isPerfectMatch !== undefined) query.isPerfectMatch = isPerfectMatch === 'true';

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const scores = await MatchScore.find(query)
    .populate('jobId', 'title companyId')
    .populate('candidateId', 'name email avatar')
    .populate('companyId', 'name slug')
    .sort({ overallScore: -1 })
    .limit(parseInt(limit))
    .skip(skip);

  const total = await MatchScore.countDocuments(query);

  res.json({
    success: true,
    data: {
      scores,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    },
  });
}));

/**
 * @route   DELETE /api/v1/matching/scores/:id
 * @desc    Delete a match score
 * @access  Private (Admin only)
 */
router.delete('/scores/:id', requireRole(['platform_admin']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const score = await MatchScore.findById(id);
  if (!score) {
    throw new AppError('Match score not found', 404);
  }

  await score.deleteOne();

  res.json({
    success: true,
    message: 'Match score deleted successfully',
  });
}));

/**
 * @route   POST /api/v1/matching/cleanup-expired
 * @desc    Cleanup expired match scores
 * @access  Private (Admin only)
 */
router.post('/cleanup-expired', requireRole(['platform_admin']), asyncHandler(async (req, res) => {
  const result = await MatchScore.cleanupExpired();

  res.json({
    success: true,
    message: `Cleaned up ${result.deletedCount} expired match scores`,
    data: result,
  });
}));

// ==================== WEBHOOK ENDPOINTS ====================

/**
 * @route   POST /api/v1/matching/webhooks/job-posted
 * @desc    Webhook for new job posted - auto-calculate matches
 * @access  Private (Internal)
 */
router.post('/webhooks/job-posted', asyncHandler(async (req, res) => {
  const { jobId } = req.body;

  if (!jobId) {
    throw new AppError('Job ID is required', 400);
  }

  // Trigger batch calculation asynchronously
  matchingEngine.batchCalculateForJob(jobId)
    .then(result => {
      console.log(`Auto-calculated ${result.processed} matches for job ${jobId}`);
    })
    .catch(error => {
      console.error(`Error auto-calculating matches for job ${jobId}:`, error);
    });

  res.json({
    success: true,
    message: 'Match calculation triggered',
  });
}));

/**
 * @route   POST /api/v1/matching/webhooks/candidate-registered
 * @desc    Webhook for new candidate registered - auto-calculate matches
 * @access  Private (Internal)
 */
router.post('/webhooks/candidate-registered', asyncHandler(async (req, res) => {
  const { candidateId } = req.body;

  if (!candidateId) {
    throw new AppError('Candidate ID is required', 400);
  }

  // Trigger batch calculation asynchronously
  matchingEngine.batchCalculateForCandidate(candidateId)
    .then(async (result) => {
      console.log(`Auto-calculated ${result.processed} matches for candidate ${candidateId}`);
      
      // Check for perfect matches and send alerts
      if (result.perfectMatches > 0) {
        await matchingEngine.findAndNotifyPerfectMatches();
      }
    })
    .catch(error => {
      console.error(`Error auto-calculating matches for candidate ${candidateId}:`, error);
    });

  res.json({
    success: true,
    message: 'Match calculation triggered',
  });
}));

module.exports = router;
