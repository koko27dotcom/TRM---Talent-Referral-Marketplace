const express = require('express');
const router = express.Router();
const User = require('../../../models/User');
const Referral = require('../../../models/Referral');
const { apiAuth, requirePermission } = require('../../../middleware/apiAuth');
const { apiLogger } = require('../../../middleware/apiLogger');

// Apply API auth and logging
router.use(apiAuth);
router.use(apiLogger);

/**
 * @route   GET /api/v1/users/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', requirePermission('users:read'), async (req, res) => {
  try {
    const user = await User.findById(req.apiUser._id)
      .populate('company', 'name slug logo')
      .lean();

    if (!user) {
      return res.status(404).json({
        error: {
          code: 'not_found',
          message: 'User not found',
          type: 'not_found_error'
        }
      });
    }

    // Get referral stats
    const referralStats = await Referral.aggregate([
      {
        $match: { referrer: user._id }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const stats = {
      totalReferrals: 0,
      submitted: 0,
      hired: 0,
      rejected: 0,
      pending: 0
    };

    referralStats.forEach(s => {
      stats.totalReferrals += s.count;
      if (s._id === 'hired') stats.hired = s.count;
      else if (s._id === 'rejected') stats.rejected = s.count;
      else if (['submitted', 'screening'].includes(s._id)) stats.submitted += s.count;
      else stats.pending += s.count;
    });

    res.json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`,
        avatar: user.avatar,
        phone: user.phone,
        location: user.location,
        title: user.title,
        bio: user.bio,
        skills: user.skills,
        linkedin: user.linkedin,
        website: user.website,
        isVerified: user.isVerified,
        isEmailVerified: user.isEmailVerified,
        company: user.company,
        preferences: user.preferences,
        stats,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to fetch user profile',
        type: 'api_error'
      }
    });
  }
});

/**
 * @route   PUT /api/v1/users/me
 * @desc    Update current user profile
 * @access  Private (requires users:write permission)
 */
router.put('/me', requirePermission('users:write'), async (req, res) => {
  try {
    const updates = req.body;
    const allowedFields = [
      'firstName',
      'lastName',
      'phone',
      'location',
      'title',
      'bio',
      'skills',
      'linkedin',
      'website',
      'preferences'
    ];

    // Filter allowed fields
    const filteredUpdates = {};
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.apiUser._id,
      { $set: filteredUpdates },
      { new: true, runValidators: true }
    ).populate('company', 'name slug logo');

    res.json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`,
        avatar: user.avatar,
        phone: user.phone,
        location: user.location,
        title: user.title,
        bio: user.bio,
        skills: user.skills,
        linkedin: user.linkedin,
        website: user.website,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: {
          code: 'validation_error',
          message: 'Validation failed',
          type: 'validation_error',
          details: Object.values(error.errors).map(e => ({
            field: e.path,
            message: e.message
          }))
        }
      });
    }

    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to update user profile',
        type: 'api_error'
      }
    });
  }
});

/**
 * @route   GET /api/v1/users/me/referrals
 * @desc    Get current user's referrals
 * @access  Private
 */
router.get('/me/referrals', requirePermission('referrals:read'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status
    } = req.query;

    const query = { referrer: req.apiUser._id };
    if (status) query.status = status;

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    const referrals = await Referral.find(query)
      .populate('job', 'title company slug')
      .populate('company', 'name slug')
      .sort('-createdAt')
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Referral.countDocuments(query);

    res.json({
      success: true,
      data: referrals.map(ref => ({
        id: ref._id,
        job: ref.job,
        company: ref.company,
        candidate: {
          name: ref.candidate?.name,
          email: ref.candidate?.email
        },
        status: ref.status,
        referralBonus: ref.referralBonus,
        payoutStatus: ref.payoutStatus,
        createdAt: ref.createdAt
      })),
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
    console.error('Error fetching user referrals:', error);
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
 * @route   GET /api/v1/users/me/stats
 * @desc    Get current user's statistics
 * @access  Private
 */
router.get('/me/stats', requirePermission('users:read'), async (req, res) => {
  try {
    const userId = req.apiUser._id;

    // Referral stats
    const referralStats = await Referral.aggregate([
      { $match: { referrer: userId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          hired: {
            $sum: { $cond: [{ $eq: ['$status', 'hired'] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          },
          pending: {
            $sum: {
              $cond: [
                { $in: ['$status', ['submitted', 'screening', 'interview_scheduled', 'interviewing']] },
                1,
                0
              ]
            }
          },
          totalEarnings: {
            $sum: {
              $cond: [
                { $eq: ['$payoutStatus', 'completed'] },
                '$referralBonus',
                0
              ]
            }
          }
        }
      }
    ]);

    const stats = referralStats[0] || {
      total: 0,
      hired: 0,
      rejected: 0,
      pending: 0,
      totalEarnings: 0
    };

    // Monthly stats
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyStats = await Referral.aggregate([
      {
        $match: {
          referrer: userId,
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          referrals: { $sum: 1 },
          hired: {
            $sum: { $cond: [{ $eq: ['$status', 'hired'] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        referrals: {
          total: stats.total,
          hired: stats.hired,
          rejected: stats.rejected,
          pending: stats.pending,
          successRate: stats.total > 0 ? Math.round((stats.hired / stats.total) * 100) : 0
        },
        earnings: {
          total: stats.totalEarnings,
          currency: 'USD'
        },
        monthly: monthlyStats.map(m => ({
          month: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
          referrals: m.referrals,
          hired: m.hired
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to fetch user statistics',
        type: 'api_error'
      }
    });
  }
});

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get public user profile
 * @access  Public (with API key)
 */
router.get('/:id', requirePermission('users:read'), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select('firstName lastName avatar title bio skills linkedin website company isVerified')
      .populate('company', 'name slug logo')
      .lean();

    if (!user) {
      return res.status(404).json({
        error: {
          code: 'not_found',
          message: 'User not found',
          type: 'not_found_error'
        }
      });
    }

    // Get public referral stats
    const referralStats = await Referral.aggregate([
      { $match: { referrer: user._id, status: 'hired' } },
      { $count: 'hiredCount' }
    ]);

    res.json({
      success: true,
      data: {
        id: user._id,
        fullName: `${user.firstName} ${user.lastName}`,
        avatar: user.avatar,
        title: user.title,
        bio: user.bio,
        skills: user.skills,
        linkedin: user.linkedin,
        website: user.website,
        company: user.company,
        isVerified: user.isVerified,
        stats: {
          successfulReferrals: referralStats[0]?.hiredCount || 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Failed to fetch user profile',
        type: 'api_error'
      }
    });
  }
});

module.exports = router;
