/**
 * Pricing Routes
 * Handles pricing calculations, pricing rules management, and promotional codes
 * For both public pricing previews and admin pricing management
 */

const express = require('express');
const { authenticate } = require('../middleware/auth.js');
const { requireRole } = require('../middleware/rbac.js');
const {
  calculateJobPostingPrice,
  previewPricing,
  getVolumeDiscountInfo,
  applyPromotionalCode,
  initializeDefaultPricingRules,
} = require('../services/pricingEngine.js');
const { PricingRule, PromotionalCode, Job } = require('../models/index.js');
const mongoose = require('mongoose');

const router = express.Router();

// ==================== PUBLIC ROUTES ====================

/**
 * @route   GET /api/v1/pricing/calculate
 * @desc    Calculate price for a job posting
 * @access  Public/Private (optional auth for personalized pricing)
 * @query   category, isFeatured, isUrgent, quantity, promoCode
 */
router.get('/calculate', async (req, res) => {
  try {
    const {
      category,
      isFeatured,
      isUrgent,
      quantity = 1,
      promoCode,
    } = req.query;

    // Get company ID from authenticated user if available
    let companyId = null;
    let userId = null;
    
    if (req.headers.authorization) {
      try {
        // Note: In a real implementation, you'd decode the JWT here
        // For now, we'll accept companyId as a query param for testing
        companyId = req.query.companyId || null;
        userId = req.query.userId || null;
      } catch (error) {
        // Invalid token, proceed without personalization
      }
    }

    const pricing = await calculateJobPostingPrice({
      companyId,
      userId,
      category: category || null,
      isFeatured: isFeatured === 'true',
      isUrgent: isUrgent === 'true',
      quantity: parseInt(quantity, 10) || 1,
      promoCode: promoCode || null,
    });

    res.json({
      success: true,
      data: pricing,
    });
  } catch (error) {
    console.error('Error calculating price:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate price',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/v1/pricing/preview
 * @desc    Preview pricing with various options
 * @access  Public
 * @body    scenarios, companyId
 */
router.post('/preview', async (req, res) => {
  try {
    const { scenarios, companyId } = req.body;

    const preview = await previewPricing({
      companyId: companyId || null,
      scenarios: scenarios || [],
    });

    res.json(preview);
  } catch (error) {
    console.error('Error generating pricing preview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate pricing preview',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/pricing/volume-discounts
 * @desc    Get volume discount tiers and current company status
 * @access  Public (with optional auth for personalized info)
 */
router.get('/volume-discounts', async (req, res) => {
  try {
    const { companyId } = req.query;

    let volumeInfo = {
      allTiers: [
        { minJobs: 0, maxJobs: 4, discount: 0, label: 'Standard' },
        { minJobs: 5, maxJobs: 9, discount: 0.10, label: '5-9 Jobs (10% off)' },
        { minJobs: 10, maxJobs: 24, discount: 0.20, label: '10-24 Jobs (20% off)' },
        { minJobs: 25, maxJobs: 49, discount: 0.30, label: '25-49 Jobs (30% off)' },
        { minJobs: 50, maxJobs: null, discount: 0.40, label: '50+ Jobs (40% off)' },
      ],
    };

    if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
      const personalizedInfo = await getVolumeDiscountInfo(companyId);
      volumeInfo = { ...volumeInfo, ...personalizedInfo };
    }

    res.json({
      success: true,
      data: volumeInfo,
    });
  } catch (error) {
    console.error('Error fetching volume discounts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch volume discounts',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/v1/pricing/promo-codes/validate
 * @desc    Validate a promotional code
 * @access  Public
 * @body    code, amount, serviceType, category, companyId
 */
router.post('/promo-codes/validate', async (req, res) => {
  try {
    const {
      code,
      amount,
      serviceType = 'job_posting',
      category,
      companyId,
      userId,
      isNewUser,
      isFirstPurchase,
    } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Promotional code is required',
        code: 'MISSING_CODE',
      });
    }

    const result = await applyPromotionalCode({
      code,
      amount: parseFloat(amount) || 0,
      userId,
      companyId,
      serviceType,
      category,
      isNewUser,
      isFirstPurchase,
    });

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: result.error || 'Invalid promotional code',
        code: 'INVALID_CODE',
        data: result,
      });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error validating promo code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate promotional code',
      error: error.message,
    });
  }
});

// ==================== PROTECTED ROUTES ====================

/**
 * @route   GET /api/v1/pricing/my-volume-status
 * @desc    Get current user's company volume discount status
 * @access  Private (Corporate users)
 */
router.get('/my-volume-status', authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'This feature is only available for corporate users',
        code: 'CORPORATE_ONLY',
      });
    }

    const volumeInfo = await getVolumeDiscountInfo(companyId);

    res.json({
      success: true,
      data: volumeInfo,
    });
  } catch (error) {
    console.error('Error fetching volume status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch volume discount status',
      error: error.message,
    });
  }
});

// ==================== ADMIN ROUTES - PRICING RULES ====================

/**
 * @route   GET /api/v1/pricing/rules
 * @desc    List all pricing rules (admin)
 * @access  Private (Admin only)
 */
router.get('/rules', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      ruleType,
      isActive,
      sortBy = 'priority',
      sortOrder = 'desc',
    } = req.query;

    const query = {};
    if (ruleType) query.ruleType = ruleType;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [rules, total] = await Promise.all([
      PricingRule.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('exclusiveWith', 'name code')
        .populate('createdBy', 'name email')
        .lean(),
      PricingRule.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: rules,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching pricing rules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pricing rules',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/v1/pricing/rules
 * @desc    Create a new pricing rule (admin)
 * @access  Private (Admin only)
 */
router.post('/rules', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const ruleData = {
      ...req.body,
      createdBy: req.user._id,
    };

    const rule = await PricingRule.create(ruleData);

    res.status(201).json({
      success: true,
      data: rule,
      message: 'Pricing rule created successfully',
    });
  } catch (error) {
    console.error('Error creating pricing rule:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Pricing rule with this code already exists',
        code: 'DUPLICATE_CODE',
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create pricing rule',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/pricing/rules/:id
 * @desc    Get a specific pricing rule (admin)
 * @access  Private (Admin only)
 */
router.get('/rules/:id', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid rule ID',
        code: 'INVALID_ID',
      });
    }

    const rule = await PricingRule.findById(id)
      .populate('exclusiveWith', 'name code')
      .populate('createdBy', 'name email');

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Pricing rule not found',
        code: 'RULE_NOT_FOUND',
      });
    }

    res.json({
      success: true,
      data: rule,
    });
  } catch (error) {
    console.error('Error fetching pricing rule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pricing rule',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/v1/pricing/rules/:id
 * @desc    Update a pricing rule (admin)
 * @access  Private (Admin only)
 */
router.put('/rules/:id', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid rule ID',
        code: 'INVALID_ID',
      });
    }

    const rule = await PricingRule.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Pricing rule not found',
        code: 'RULE_NOT_FOUND',
      });
    }

    res.json({
      success: true,
      data: rule,
      message: 'Pricing rule updated successfully',
    });
  } catch (error) {
    console.error('Error updating pricing rule:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Pricing rule with this code already exists',
        code: 'DUPLICATE_CODE',
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update pricing rule',
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/v1/pricing/rules/:id
 * @desc    Delete a pricing rule (admin)
 * @access  Private (Admin only)
 */
router.delete('/rules/:id', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid rule ID',
        code: 'INVALID_ID',
      });
    }

    const rule = await PricingRule.findByIdAndDelete(id);

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Pricing rule not found',
        code: 'RULE_NOT_FOUND',
      });
    }

    res.json({
      success: true,
      message: 'Pricing rule deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting pricing rule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete pricing rule',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/v1/pricing/rules/initialize
 * @desc    Initialize default pricing rules (admin)
 * @access  Private (Admin only)
 */
router.post('/rules/initialize', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    await initializeDefaultPricingRules();

    res.json({
      success: true,
      message: 'Default pricing rules initialized successfully',
    });
  } catch (error) {
    console.error('Error initializing pricing rules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize pricing rules',
      error: error.message,
    });
  }
});

// ==================== ADMIN ROUTES - PROMO CODES ====================

/**
 * @route   GET /api/v1/pricing/promo-codes
 * @desc    List all promotional codes (admin)
 * @access  Private (Admin only)
 */
router.get('/promo-codes', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      isActive,
      campaignId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (campaignId) query.campaignId = campaignId;

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [codes, total] = await Promise.all([
      PromotionalCode.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('createdBy', 'name email')
        .select('-usageRecords -uniqueUsersUsed -uniqueCompaniesUsed')
        .lean(),
      PromotionalCode.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: codes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching promo codes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch promotional codes',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/v1/pricing/promo-codes
 * @desc    Create a new promotional code (admin)
 * @access  Private (Admin only)
 */
router.post('/promo-codes', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const codeData = {
      ...req.body,
      createdBy: req.user._id,
    };

    // Ensure code is uppercase
    if (codeData.code) {
      codeData.code = codeData.code.toUpperCase().trim();
    }

    const promoCode = await PromotionalCode.create(codeData);

    res.status(201).json({
      success: true,
      data: promoCode,
      message: 'Promotional code created successfully',
    });
  } catch (error) {
    console.error('Error creating promo code:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Promotional code already exists',
        code: 'DUPLICATE_CODE',
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create promotional code',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/pricing/promo-codes/:id
 * @desc    Get a specific promotional code with usage details (admin)
 * @access  Private (Admin only)
 */
router.get('/promo-codes/:id', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid promo code ID',
        code: 'INVALID_ID',
      });
    }

    const promoCode = await PromotionalCode.findById(id)
      .populate('createdBy', 'name email')
      .populate('usageRecords.userId', 'name email')
      .populate('usageRecords.companyId', 'name');

    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: 'Promotional code not found',
        code: 'CODE_NOT_FOUND',
      });
    }

    res.json({
      success: true,
      data: promoCode,
    });
  } catch (error) {
    console.error('Error fetching promo code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch promotional code',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/v1/pricing/promo-codes/:id
 * @desc    Update a promotional code (admin)
 * @access  Private (Admin only)
 */
router.put('/promo-codes/:id', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid promo code ID',
        code: 'INVALID_ID',
      });
    }

    const updateData = { ...req.body };
    
    // Don't allow changing the code
    delete updateData.code;
    delete updateData.usageRecords;
    delete updateData.usageCount;
    delete updateData.uniqueUsersUsed;
    delete updateData.uniqueCompaniesUsed;

    const promoCode = await PromotionalCode.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: 'Promotional code not found',
        code: 'CODE_NOT_FOUND',
      });
    }

    res.json({
      success: true,
      data: promoCode,
      message: 'Promotional code updated successfully',
    });
  } catch (error) {
    console.error('Error updating promo code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update promotional code',
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/v1/pricing/promo-codes/:id
 * @desc    Delete a promotional code (admin)
 * @access  Private (Admin only)
 */
router.delete('/promo-codes/:id', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid promo code ID',
        code: 'INVALID_ID',
      });
    }

    const promoCode = await PromotionalCode.findByIdAndDelete(id);

    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: 'Promotional code not found',
        code: 'CODE_NOT_FOUND',
      });
    }

    res.json({
      success: true,
      message: 'Promotional code deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting promo code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete promotional code',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/pricing/promo-codes/:id/usage
 * @desc    Get usage statistics for a promotional code (admin)
 * @access  Private (Admin only)
 */
router.get('/promo-codes/:id/usage', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid promo code ID',
        code: 'INVALID_ID',
      });
    }

    const promoCode = await PromotionalCode.findById(id)
      .select('usageCount usageLimits uniqueUsersUsed uniqueCompaniesUsed');

    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: 'Promotional code not found',
        code: 'CODE_NOT_FOUND',
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get paginated usage records
    const usageRecords = promoCode.usageRecords
      .sort((a, b) => b.usedAt - a.usedAt)
      .slice(skip, skip + parseInt(limit));

    // Calculate statistics
    const totalDiscountGiven = promoCode.usageRecords.reduce(
      (sum, record) => sum + (record.context?.discountAmount || 0),
      0
    );

    const stats = {
      totalUsage: promoCode.usageCount,
      totalLimit: promoCode.usageLimits.total,
      uniqueUsers: promoCode.uniqueUsersUsed.length,
      uniqueCompanies: promoCode.uniqueCompaniesUsed.length,
      totalDiscountGiven: Math.round(totalDiscountGiven * 100) / 100,
      remainingUses: promoCode.remainingUses,
    };

    res.json({
      success: true,
      data: {
        stats,
        usageRecords,
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: promoCode.usageRecords.length,
        pages: Math.ceil(promoCode.usageRecords.length / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching promo code usage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch usage statistics',
      error: error.message,
    });
  }
});

module.exports = router;
