/**
 * Talent Pool Routes
 * API endpoints for AI-powered talent sourcing and candidate management
 */

const express = require('express');
const TalentPool = require('../models/TalentPool.js');
const CandidateSource = require('../models/CandidateSource.js');
const { authenticate } = require('../middleware/auth.js');
const { requireRole } = require('../middleware/rbac.js');
const { asyncHandler, ValidationError, NotFoundError } = require('../middleware/errorHandler.js');
const { talentScraperService } = require('../services/talentScraperService.js');
const { candidateEnrichmentService } = require('../services/candidateEnrichmentService.js');

const router = express.Router();

/**
 * @route   GET /api/talent-pool/candidates
 * @desc    List candidates with filters, search, and pagination
 * @access  Private (Recruiter, Admin)
 */
router.get('/candidates', authenticate, requireRole(['corporate_recruiter', 'corporate_admin', 'platform_admin']), asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search,
    source,
    contactStatus,
    skills,
    minExperience,
    maxExperience,
    minHireScore,
    location,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  // Build query
  const query = { isActive: true };

  if (source) query.source = source;
  if (contactStatus) query.contactStatus = contactStatus;
  if (minHireScore) query.hireProbabilityScore = { $gte: parseInt(minHireScore) };
  if (location) query['location.city'] = { $regex: location, $options: 'i' };

  if (skills) {
    const skillArray = skills.split(',').map(s => s.trim());
    query.skills = { $in: skillArray };
  }

  if (minExperience || maxExperience) {
    query.experienceYears = {};
    if (minExperience) query.experienceYears.$gte = parseInt(minExperience);
    if (maxExperience) query.experienceYears.$lte = parseInt(maxExperience);
  }

  if (search) {
    query.$text = { $search: search };
  }

  // Build sort
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Execute query
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const [candidates, total] = await Promise.all([
    TalentPool.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-contactHistory.messageContent'),
    TalentPool.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      candidates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
}));

/**
 * @route   POST /api/talent-pool/candidates
 * @desc    Add candidate manually
 * @access  Private (Recruiter, Admin)
 */
router.post('/candidates', authenticate, requireRole(['corporate_recruiter', 'corporate_admin', 'platform_admin']), asyncHandler(async (req, res) => {
  const candidateData = req.body;

  // Validate required fields
  if (!candidateData.name) {
    throw new ValidationError('Candidate name is required');
  }

  // Check for duplicates
  const existing = await TalentPool.findOne({
    $or: [
      { email: candidateData.email },
      { phone: candidateData.phone },
      { profileUrl: candidateData.profileUrl },
    ].filter(Boolean),
  });

  if (existing) {
    throw new ValidationError('Candidate with this email, phone, or profile URL already exists');
  }

  const candidate = await TalentPool.create({
    ...candidateData,
    source: 'manual',
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    data: candidate,
  });
}));

/**
 * @route   GET /api/talent-pool/candidates/:id
 * @desc    Get candidate details
 * @access  Private (Recruiter, Admin)
 */
router.get('/candidates/:id', authenticate, requireRole(['corporate_recruiter', 'corporate_admin', 'platform_admin']), asyncHandler(async (req, res) => {
  const candidate = await TalentPool.findById(req.params.id)
    .populate('campaigns.campaignId', 'name status channel');

  if (!candidate) {
    throw new NotFoundError('Candidate not found');
  }

  res.json({
    success: true,
    data: candidate,
  });
}));

/**
 * @route   PUT /api/talent-pool/candidates/:id
 * @desc    Update candidate
 * @access  Private (Recruiter, Admin)
 */
router.put('/candidates/:id', authenticate, requireRole(['corporate_recruiter', 'corporate_admin', 'platform_admin']), asyncHandler(async (req, res) => {
  const candidate = await TalentPool.findByIdAndUpdate(
    req.params.id,
    {
      ...req.body,
      updatedBy: req.user._id,
      updatedAt: new Date(),
    },
    { new: true, runValidators: true }
  );

  if (!candidate) {
    throw new NotFoundError('Candidate not found');
  }

  res.json({
    success: true,
    data: candidate,
  });
}));

/**
 * @route   POST /api/talent-pool/candidates/:id/enrich
 * @desc    Enrich candidate with AI
 * @access  Private (Recruiter, Admin)
 */
router.post('/candidates/:id/enrich', authenticate, requireRole(['corporate_recruiter', 'corporate_admin', 'platform_admin']), asyncHandler(async (req, res) => {
  const result = await candidateEnrichmentService.enrichCandidate(
    req.params.id,
    req.user._id
  );

  res.json({
    success: true,
    data: result,
  });
}));

/**
 * @route   POST /api/talent-pool/candidates/batch-enrich
 * @desc    Batch enrich candidates with AI
 * @access  Private (Recruiter, Admin)
 */
router.post('/candidates/batch-enrich', authenticate, requireRole(['corporate_recruiter', 'corporate_admin', 'platform_admin']), asyncHandler(async (req, res) => {
  const { candidateIds } = req.body;

  if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
    throw new ValidationError('Candidate IDs array is required');
  }

  if (candidateIds.length > 100) {
    throw new ValidationError('Maximum 100 candidates can be enriched at once');
  }

  // Start batch enrichment (async)
  const results = await candidateEnrichmentService.batchEnrich(
    candidateIds,
    req.user._id,
    (progress) => {
      // Could emit WebSocket event here for real-time progress
      console.log('Enrichment progress:', progress);
    }
  );

  res.json({
    success: true,
    data: results,
  });
}));

/**
 * @route   DELETE /api/talent-pool/candidates/:id
 * @desc    Remove candidate (soft delete)
 * @access  Private (Recruiter, Admin)
 */
router.delete('/candidates/:id', authenticate, requireRole(['corporate_recruiter', 'corporate_admin', 'platform_admin']), asyncHandler(async (req, res) => {
  const candidate = await TalentPool.findByIdAndUpdate(
    req.params.id,
    { isActive: false, updatedBy: req.user._id },
    { new: true }
  );

  if (!candidate) {
    throw new NotFoundError('Candidate not found');
  }

  res.json({
    success: true,
    message: 'Candidate removed successfully',
  });
}));

/**
 * @route   GET /api/talent-pool/stats
 * @desc    Get dashboard statistics
 * @access  Private (Recruiter, Admin)
 */
router.get('/stats', authenticate, requireRole(['corporate_recruiter', 'corporate_admin', 'platform_admin']), asyncHandler(async (req, res) => {
  const stats = await TalentPool.getStats();
  
  // Get additional stats
  const sourceBreakdown = await TalentPool.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$source', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const statusBreakdown = await TalentPool.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$contactStatus', count: { $sum: 1 } } },
  ]);

  const topSkills = await TalentPool.aggregate([
    { $match: { isActive: true } },
    { $unwind: '$skills' },
    { $group: { _id: '$skills', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  const recentCandidates = await TalentPool.find({ isActive: true })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('name currentTitle source createdAt hireProbabilityScore');

  res.json({
    success: true,
    data: {
      overview: stats,
      sourceBreakdown,
      statusBreakdown,
      topSkills,
      recentCandidates,
    },
  });
}));

/**
 * @route   GET /api/talent-pool/sources
 * @desc    List candidate sources
 * @access  Private (Recruiter, Admin)
 */
router.get('/sources', authenticate, requireRole(['corporate_recruiter', 'corporate_admin', 'platform_admin']), asyncHandler(async (req, res) => {
  const { status, platform } = req.query;

  const query = {};
  if (status) query.status = status;
  if (platform) query.platform = platform;

  const sources = await CandidateSource.find(query)
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: sources,
  });
}));

/**
 * @route   POST /api/talent-pool/sources
 * @desc    Create new candidate source
 * @access  Private (Recruiter, Admin)
 */
router.post('/sources', authenticate, requireRole(['corporate_recruiter', 'corporate_admin', 'platform_admin']), asyncHandler(async (req, res) => {
  const sourceData = req.body;

  if (!sourceData.name || !sourceData.platform) {
    throw new ValidationError('Name and platform are required');
  }

  const source = await CandidateSource.create({
    ...sourceData,
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    data: source,
  });
}));

/**
 * @route   GET /api/talent-pool/sources/:id
 * @desc    Get source details
 * @access  Private (Recruiter, Admin)
 */
router.get('/sources/:id', authenticate, requireRole(['corporate_recruiter', 'corporate_admin', 'platform_admin']), asyncHandler(async (req, res) => {
  const source = await CandidateSource.findById(req.params.id)
    .populate('createdBy', 'name email');

  if (!source) {
    throw new NotFoundError('Source not found');
  }

  res.json({
    success: true,
    data: source,
  });
}));

/**
 * @route   POST /api/talent-pool/sources/:id/scrape
 * @desc    Trigger scrape for source
 * @access  Private (Recruiter, Admin)
 */
router.post('/sources/:id/scrape', authenticate, requireRole(['corporate_recruiter', 'corporate_admin', 'platform_admin']), asyncHandler(async (req, res) => {
  const source = await CandidateSource.findById(req.params.id);

  if (!source) {
    throw new NotFoundError('Source not found');
  }

  // Check if scrape is already running
  const activeStatus = talentScraperService.getActiveScrapeStatus(req.params.id);
  if (activeStatus) {
    throw new ValidationError('Scrape is already in progress for this source');
  }

  // Start scrape asynchronously
  talentScraperService.scrape(req.params.id, req.user._id)
    .catch(error => console.error('Scrape error:', error));

  res.json({
    success: true,
    message: 'Scrape started successfully',
    data: { startedAt: new Date() },
  });
}));

/**
 * @route   GET /api/talent-pool/sources/:id/scrape-status
 * @desc    Get scrape status for source
 * @access  Private (Recruiter, Admin)
 */
router.get('/sources/:id/scrape-status', authenticate, requireRole(['corporate_recruiter', 'corporate_admin', 'platform_admin']), asyncHandler(async (req, res) => {
  const source = await CandidateSource.findById(req.params.id);

  if (!source) {
    throw new NotFoundError('Source not found');
  }

  const activeStatus = talentScraperService.getActiveScrapeStatus(req.params.id);

  res.json({
    success: true,
    data: {
      isRunning: !!activeStatus,
      activeStatus,
      lastRun: source.lastRun,
      stats: source.stats,
    },
  });
}));

/**
 * @route   POST /api/talent-pool/sources/:id/stop-scrape
 * @desc    Stop active scrape
 * @access  Private (Recruiter, Admin)
 */
router.post('/sources/:id/stop-scrape', authenticate, requireRole(['corporate_recruiter', 'corporate_admin', 'platform_admin']), asyncHandler(async (req, res) => {
  const stopped = await talentScraperService.stopScrape(req.params.id);

  if (!stopped) {
    throw new ValidationError('No active scrape to stop');
  }

  res.json({
    success: true,
    message: 'Scrape stopped successfully',
  });
}));

/**
 * @route   PUT /api/talent-pool/sources/:id
 * @desc    Update source
 * @access  Private (Recruiter, Admin)
 */
router.put('/sources/:id', authenticate, requireRole(['corporate_recruiter', 'corporate_admin', 'platform_admin']), asyncHandler(async (req, res) => {
  const source = await CandidateSource.findByIdAndUpdate(
    req.params.id,
    {
      ...req.body,
      updatedBy: req.user._id,
    },
    { new: true, runValidators: true }
  );

  if (!source) {
    throw new NotFoundError('Source not found');
  }

  res.json({
    success: true,
    data: source,
  });
}));

/**
 * @route   DELETE /api/talent-pool/sources/:id
 * @desc    Delete source
 * @access  Private (Admin)
 */
router.delete('/sources/:id', authenticate, requireRole(['platform_admin']), asyncHandler(async (req, res) => {
  const source = await CandidateSource.findByIdAndDelete(req.params.id);

  if (!source) {
    throw new NotFoundError('Source not found');
  }

  res.json({
    success: true,
    message: 'Source deleted successfully',
  });
}));

/**
 * @route   POST /api/talent-pool/import
 * @desc    Import candidates from CSV/JSON
 * @access  Private (Recruiter, Admin)
 */
router.post('/import', authenticate, requireRole(['corporate_recruiter', 'corporate_admin', 'platform_admin']), asyncHandler(async (req, res) => {
  const { candidates, sourceId } = req.body;

  if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
    throw new ValidationError('Candidates array is required');
  }

  if (candidates.length > 1000) {
    throw new ValidationError('Maximum 1000 candidates can be imported at once');
  }

  const results = await talentScraperService.importCandidates(
    candidates,
    sourceId,
    req.user._id
  );

  res.json({
    success: true,
    data: results,
  });
}));

/**
 * @route   GET /api/talent-pool/high-probability
 * @desc    Get high probability candidates
 * @access  Private (Recruiter, Admin)
 */
router.get('/high-probability', authenticate, requireRole(['corporate_recruiter', 'corporate_admin', 'platform_admin']), asyncHandler(async (req, res) => {
  const { minScore = 70, limit = 50 } = req.query;

  const candidates = await TalentPool.findHighProbability(
    parseInt(minScore),
    parseInt(limit)
  );

  res.json({
    success: true,
    data: candidates,
  });
}));

/**
 * @route   POST /api/talent-pool/candidates/:id/match-jobs
 * @desc    Match candidate to jobs
 * @access  Private (Recruiter, Admin)
 */
router.post('/candidates/:id/match-jobs', authenticate, requireRole(['corporate_recruiter', 'corporate_admin', 'platform_admin']), asyncHandler(async (req, res) => {
  const matches = await candidateEnrichmentService.matchCandidatesToJobs(req.params.id);

  res.json({
    success: true,
    data: matches,
  });
}));

module.exports = router;
