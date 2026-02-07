const express = require('express');
const router = express.Router();
const Referral = require('../../../models/Referral');
const Job = require('../../../models/Job');
const User = require('../../../models/User');
const { apiAuth, requirePermission } = require('../../../middleware/apiAuth');
const { apiLogger } = require('../../../middleware/apiLogger');
const webhookService = require('../../../services/webhookService');

// Apply API auth and logging
router.use(apiAuth);
router.use(apiLogger);

/**
 * @route   GET /api/v1/referrals
 * @desc    List referrals with filtering
 * @access  Private (requires referrals:read permission)
 */
router.get('/', requirePermission('referrals:read'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sort = '-createdAt',
      status,
      job,
      company,
      referrer,
      candidate,
      startDate,
      endDate
    } = req.query;

    // Build query
    const query = {};

    // Apply filters based on API key permissions and ownership
    if (!req.apiKey.hasPermission('admin:full')) {
      if (req.apiCompany) {
        // Company API key - only see referrals for their jobs
        const companyJobs = await Job.find({ company: req.apiCompany._id }).select('_id');
        query.job = { $in: companyJobs.map(j => j._id) };
      } else if (req.apiUser) {
        // User API key - see their referrals as referrer or candidate
        query.$or = [
          { referrer: req.apiUser._id },
          { 'candidate.email': req.apiUser.email }
        ];
      }
    }

    // Status filter
    if (status) {
      query.status = status;
    }

    // Job filter
    if (job) {
      query.job = job;
    }

    // Date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const referrals = await Referral.find(query)
      .populate('job', 'title company slug')
      .populate('referrer', 'firstName lastName email')
      .populate('company', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Referral.countDocuments(query);

    // Format response
    const formattedReferrals = referrals.map(ref => ({
      id: ref._id,
      job: ref.job,
      company: ref.company,
      referrer: ref.referrer ? {
        id: ref.referrer._id,
        name: `${ref.referrer.firstName} ${ref.referrer.lastName}`,
        email: ref.referrer.email
      } : null,
      candidate: {
        name: ref.candidate?.name,
        email: ref.candidate?.email,
        phone: ref.candidate?.phone,
        resume: ref.candidate?.resume ? true : false
      },
      status: ref.status,
      statusHistory: ref.statusHistory?.map(h => ({
        status: h.status,
        changedAt: h.changedAt,
        notes: h.notes
      })) || [],
      referralBonus: ref.referralBonus,
      payoutStatus: ref.payoutStatus,
      notes: ref.notes,
      matchScore: ref.matchScore,
      createdAt: ref.createdAt,
      updatedAt: ref.updatedAt
    }));

    res.json({
      success: true,
      data: formattedReferrals,
      meta: {
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
          hasMore: pageNum * limitNum < total
        }
      }
    });
  } catch (error) {
    console.error('Error fetching referrals:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to fetch referrals',
        type: 'api_error'
      }
    });
  }
});

/**
 * @route   GET /api/v1/referrals/:id
 * @desc    Get referral details
 * @access  Private (requires referrals:read permission)
 */
router.get('/:id', requirePermission('referrals:read'), async (req, res) => {
  try {
    const { id } = req.params;

    const referral = await Referral.findById(id)
      .populate('job', 'title company slug description')
      .populate('referrer', 'firstName lastName email')
      .populate('company', 'name slug')
      .lean();

    if (!referral) {
      return res.status(404).json({
        error: {
          code: 'not_found',
          message: 'Referral not found',
          type: 'not_found_error'
        }
      });
    }

    // Check permissions
    if (!req.apiKey.hasPermission('admin:full')) {
      const hasAccess = await checkReferralAccess(referral, req);
      if (!hasAccess) {
        return res.status(403).json({
          error: {
            code: 'forbidden',
            message: 'You do not have permission to view this referral',
            type: 'authorization_error'
          }
        });
      }
    }

    res.json({
      success: true,
      data: {
        id: referral._id,
        job: referral.job,
        company: referral.company,
        referrer: referral.referrer ? {
          id: referral.referrer._id,
          name: `${referral.referrer.firstName} ${referral.referrer.lastName}`,
          email: referral.referrer.email
        } : null,
        candidate: referral.candidate,
        status: referral.status,
        statusHistory: referral.statusHistory || [],
        referralBonus: referral.referralBonus,
        payoutStatus: referral.payoutStatus,
        payoutDetails: referral.payoutDetails,
        notes: referral.notes,
        matchScore: referral.matchScore,
        screeningNotes: referral.screeningNotes,
        interviewNotes: referral.interviewNotes,
        createdAt: referral.createdAt,
        updatedAt: referral.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching referral:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to fetch referral details',
        type: 'api_error'
      }
    });
  }
});

/**
 * @route   POST /api/v1/referrals
 * @desc    Create a new referral
 * @access  Private (requires referrals:write permission)
 */
router.post('/', requirePermission('referrals:write'), async (req, res) => {
  try {
    const {
      jobId,
      candidate,
      notes,
      relationship
    } = req.body;

    // Validate required fields
    if (!jobId || !candidate || !candidate.email) {
      return res.status(400).json({
        error: {
          code: 'validation_error',
          message: 'Job ID and candidate email are required',
          type: 'validation_error'
        }
      });
    }

    // Verify job exists and is active
    const job = await Job.findById(jobId).populate('company');
    if (!job) {
      return res.status(404).json({
        error: {
          code: 'not_found',
          message: 'Job not found',
          type: 'not_found_error'
        }
      });
    }

    if (job.status !== 'active') {
      return res.status(400).json({
        error: {
          code: 'invalid_job',
          message: 'This job is no longer accepting referrals',
          type: 'validation_error'
        }
      });
    }

    // Check for duplicate referral
    const existingReferral = await Referral.findOne({
      job: jobId,
      'candidate.email': candidate.email.toLowerCase(),
      status: { $nin: ['rejected', 'withdrawn'] }
    });

    if (existingReferral) {
      return res.status(409).json({
        error: {
          code: 'duplicate_referral',
          message: 'A referral for this candidate already exists for this job',
          type: 'conflict_error',
          existingReferralId: existingReferral._id
        }
      });
    }

    // Create referral
    const referral = new Referral({
      job: jobId,
      company: job.company._id,
      referrer: req.apiUser?._id,
      candidate: {
        name: candidate.name,
        email: candidate.email.toLowerCase(),
        phone: candidate.phone,
        resume: candidate.resume,
        linkedin: candidate.linkedin,
        portfolio: candidate.portfolio
      },
      notes,
      relationship,
      status: 'submitted',
      statusHistory: [{
        status: 'submitted',
        changedAt: new Date(),
        changedBy: req.apiUser?._id,
        notes: 'Referral submitted via API'
      }],
      referralBonus: job.referralBonusAmount || 0,
      source: 'api'
    });

    await referral.save();

    // Trigger webhook
    await webhookService.triggerEvent('referral.created', {
      referral_id: referral._id,
      job_id: job._id,
      company_id: job.company._id,
      candidate_email: candidate.email,
      status: referral.status,
      created_at: referral.createdAt
    });

    res.status(201).json({
      success: true,
      data: {
        id: referral._id,
        job: {
          id: job._id,
          title: job.title
        },
        company: {
          id: job.company._id,
          name: job.company.name
        },
        candidate: {
          name: candidate.name,
          email: candidate.email
        },
        status: referral.status,
        referralBonus: referral.referralBonus,
        createdAt: referral.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating referral:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to create referral',
        type: 'api_error'
      }
    });
  }
});

/**
 * @route   PATCH /api/v1/referrals/:id/status
 * @desc    Update referral status
 * @access  Private (requires referrals:write permission)
 */
router.patch('/:id/status', requirePermission('referrals:write'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = [
      'submitted', 'screening', 'interview_scheduled', 'interviewing',
      'offer_pending', 'hired', 'rejected', 'withdrawn'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: {
          code: 'invalid_status',
          message: `Invalid status. Valid statuses: ${validStatuses.join(', ')}`,
          type: 'validation_error'
        }
      });
    }

    const referral = await Referral.findById(id);

    if (!referral) {
      return res.status(404).json({
        error: {
          code: 'not_found',
          message: 'Referral not found',
          type: 'not_found_error'
        }
      });
    }

    // Check permissions for company-owned referrals
    if (req.apiCompany && referral.company.toString() !== req.apiCompany._id.toString()) {
      return res.status(403).json({
        error: {
          code: 'forbidden',
          message: 'You can only update referrals for your own company',
          type: 'authorization_error'
        }
      });
    }

    const previousStatus = referral.status;
    referral.status = status;
    referral.statusHistory.push({
      status,
      previousStatus,
      changedAt: new Date(),
      changedBy: req.apiUser?._id,
      notes
    });

    await referral.save();

    // Trigger webhook
    await webhookService.triggerEvent('referral.status_changed', {
      referral_id: referral._id,
      previous_status: previousStatus,
      new_status: status,
      changed_at: new Date().toISOString()
    });

    // Trigger specific status webhook
    const statusEventMap = {
      'hired': 'referral.hired',
      'rejected': 'referral.rejected',
      'interview_scheduled': 'referral.interview_scheduled'
    };

    if (statusEventMap[status]) {
      await webhookService.triggerEvent(statusEventMap[status], {
        referral_id: referral._id,
        job_id: referral.job,
        company_id: referral.company,
        candidate_email: referral.candidate?.email,
        status: status
      });
    }

    res.json({
      success: true,
      data: {
        id: referral._id,
        status: referral.status,
        previousStatus,
        updatedAt: referral.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating referral status:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to update referral status',
        type: 'api_error'
      }
    });
  }
});

/**
 * @route   GET /api/v1/referrals/:id/tracking
 * @desc    Get referral tracking/timeline
 * @access  Private (requires referrals:read permission)
 */
router.get('/:id/tracking', requirePermission('referrals:read'), async (req, res) => {
  try {
    const { id } = req.params;

    const referral = await Referral.findById(id)
      .populate('statusHistory.changedBy', 'firstName lastName')
      .lean();

    if (!referral) {
      return res.status(404).json({
        error: {
          code: 'not_found',
          message: 'Referral not found',
          type: 'not_found_error'
        }
      });
    }

    // Check permissions
    if (!req.apiKey.hasPermission('admin:full')) {
      const hasAccess = await checkReferralAccess(referral, req);
      if (!hasAccess) {
        return res.status(403).json({
          error: {
            code: 'forbidden',
            message: 'You do not have permission to view this referral',
            type: 'authorization_error'
          }
        });
      }
    }

    const timeline = referral.statusHistory.map(h => ({
      status: h.status,
      previousStatus: h.previousStatus,
      changedAt: h.changedAt,
      changedBy: h.changedBy ? {
        id: h.changedBy._id,
        name: `${h.changedBy.firstName} ${h.changedBy.lastName}`
      } : null,
      notes: h.notes
    }));

    res.json({
      success: true,
      data: {
        referralId: referral._id,
        currentStatus: referral.status,
        timeline,
        totalStages: timeline.length,
        daysInProcess: Math.floor(
          (Date.now() - new Date(referral.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        )
      }
    });
  } catch (error) {
    console.error('Error fetching referral tracking:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to fetch referral tracking',
        type: 'api_error'
      }
    });
  }
});

/**
 * Helper function to check referral access
 */
async function checkReferralAccess(referral, req) {
  if (req.apiCompany) {
    return referral.company.toString() === req.apiCompany._id.toString();
  }
  
  if (req.apiUser) {
    return (
      referral.referrer?.toString() === req.apiUser._id.toString() ||
      referral.candidate?.email === req.apiUser.email
    );
  }
  
  return false;
}

module.exports = router;
