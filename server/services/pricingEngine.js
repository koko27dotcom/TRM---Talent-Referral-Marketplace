/**
 * PricingEngine Service
 * Centralized pricing calculation for the TRM platform
 * Handles surge pricing, volume discounts, category-based pricing, and promotional codes
 */

const { PricingRule, PromotionalCode, Job, Company, Subscription } = require('../models/index.js');
const mongoose = require('mongoose');

// Myanmar timezone configuration
const MYANMAR_TIMEZONE = 'Asia/Yangon';

// Base pricing configuration
const BASE_PRICING = {
  jobPosting: {
    basePrice: 50000, // MMK - base price for a standard job posting
    currency: 'MMK',
  },
  featuredListing: {
    basePrice: 25000, // MMK - additional cost for featured listing
    currency: 'MMK',
  },
  urgentListing: {
    basePrice: 30000, // MMK - additional cost for urgent listing
    currency: 'MMK',
  },
};

// Category-based pricing tiers
const CATEGORY_TIERS = {
  'Technology': { multiplier: 1.3, tier: 'high_demand' },
  'IT': { multiplier: 1.3, tier: 'high_demand' },
  'Software': { multiplier: 1.3, tier: 'high_demand' },
  'Executive': { multiplier: 1.3, tier: 'high_demand' },
  'Management': { multiplier: 1.2, tier: 'premium' },
  'Finance': { multiplier: 1.2, tier: 'premium' },
  'Healthcare': { multiplier: 1.15, tier: 'premium' },
  'Engineering': { multiplier: 1.15, tier: 'premium' },
  'Sales': { multiplier: 1.0, tier: 'standard' },
  'Marketing': { multiplier: 1.0, tier: 'standard' },
  'Customer Service': { multiplier: 0.9, tier: 'standard' },
  'Administrative': { multiplier: 0.9, tier: 'standard' },
  'default': { multiplier: 1.0, tier: 'standard' },
};

// Volume discount tiers
const VOLUME_DISCOUNTS = [
  { minJobs: 0, maxJobs: 4, discount: 0, label: 'Standard' },
  { minJobs: 5, maxJobs: 9, discount: 0.10, label: '5-9 Jobs (10% off)' },
  { minJobs: 10, maxJobs: 24, discount: 0.20, label: '10-24 Jobs (20% off)' },
  { minJobs: 25, maxJobs: 49, discount: 0.30, label: '25-49 Jobs (30% off)' },
  { minJobs: 50, maxJobs: null, discount: 0.40, label: '50+ Jobs (40% off)' },
];

// Surge pricing configuration
const SURGE_PRICING = {
  urgency: {
    multiplier: 2.0,
    description: 'Urgent (48hr fill)',
  },
  weekend: {
    multiplier: 1.5,
    description: 'Weekend posting',
  },
  holiday: {
    multiplier: 1.5,
    description: 'Holiday posting',
  },
  highDemand: {
    multiplier: 1.3,
    description: 'High-demand category',
  },
};

// Myanmar public holidays (2024-2025)
const MYANMAR_HOLIDAYS = [
  '2024-01-04', // Independence Day
  '2024-02-12', // Union Day
  '2024-03-02', // Peasants\' Day
  '2024-03-24', // Full Moon Day of Tabaung
  '2024-03-27', // Armed Forces Day
  '2024-04-13', // Thingyan (Water Festival) - Start
  '2024-04-14', // Thingyan
  '2024-04-15', // Thingyan
  '2024-04-16', // Thingyan - End
  '2024-04-17', // Myanmar New Year
  '2024-05-01', // Labour Day
  '2024-05-22', // Full Moon Day of Kasong
  '2024-07-20', // Martyr\'s Day
  '2024-07-21', // Full Moon Day of Waso
  '2024-10-17', // Full Moon Day of Thadingyut
  '2024-11-15', // Full Moon Day of Tazaungmone
  '2024-11-23', // National Day
  '2024-12-25', // Christmas Day
  '2025-01-04', // Independence Day
  '2025-02-12', // Union Day
  '2025-03-02', // Peasants\' Day
  '2025-03-13', // Full Moon Day of Tabaung
  '2025-03-27', // Armed Forces Day
  '2025-04-13', // Thingyan (Water Festival)
  '2025-04-14', // Thingyan
  '2025-04-15', // Thingyan
  '2025-04-16', // Thingyan
  '2025-04-17', // Myanmar New Year
  '2025-05-01', // Labour Day
  '2025-05-11', // Full Moon Day of Kasong
  '2025-07-19', // Martyr\'s Day
  '2025-07-20', // Full Moon Day of Waso
];

/**
 * Get current date in Myanmar timezone
 * @returns {Date}
 */
function getMyanmarDate() {
  const now = new Date();
  const options = { 
    timeZone: MYANMAR_TIMEZONE, 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    weekday: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(now);
  
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  const weekday = parseInt(parts.find(p => p.type === 'weekday').value, 10);
  const hour = parts.find(p => p.type === 'hour').value;
  const minute = parts.find(p => p.type === 'minute').value;
  
  return {
    date: new Date(`${year}-${month}-${day}`),
    dateString: `${year}-${month}-${day}`,
    weekday, // 1 = Monday, 7 = Sunday
    isWeekend: weekday === 7 || weekday === 1, // Sunday or Saturday in some locales, adjusted below
    time: `${hour}:${minute}`,
    raw: now,
  };
}

/**
 * Check if today is a weekend in Myanmar
 * @returns {boolean}
 */
function isWeekend() {
  const myanmarDate = getMyanmarDate();
  // In Myanmar, weekend is typically Saturday (7) and Sunday (1) in some Intl formats
  // Adjust based on actual Myanmar weekend (Saturday and Sunday)
  const day = myanmarDate.date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

/**
 * Check if today is a Myanmar public holiday
 * @returns {boolean}
 */
function isHoliday() {
  const myanmarDate = getMyanmarDate();
  return MYANMAR_HOLIDAYS.includes(myanmarDate.dateString);
}

/**
 * Get category pricing tier
 * @param {string} category - Job category
 * @returns {Object}
 */
function getCategoryTier(category) {
  if (!category) return CATEGORY_TIERS.default;
  
  const normalizedCategory = category.trim();
  return CATEGORY_TIERS[normalizedCategory] || CATEGORY_TIERS.default;
}

/**
 * Get volume discount tier for a company
 * @param {string} companyId - Company ID
 * @param {number} additionalJobs - Additional jobs being posted
 * @returns {Object}
 */
async function getVolumeDiscountTier(companyId, additionalJobs = 0) {
  if (!companyId) return VOLUME_DISCOUNTS[0];
  
  try {
    // Count active jobs posted by this company in the current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const jobCount = await Job.countDocuments({
      companyId: new mongoose.Types.ObjectId(companyId),
      status: { $in: ['active', 'published'] },
      createdAt: { $gte: startOfMonth },
    });
    
    const totalJobs = jobCount + additionalJobs;
    
    // Find applicable tier
    const tier = VOLUME_DISCOUNTS.find(t => 
      totalJobs >= t.minJobs && (t.maxJobs === null || totalJobs <= t.maxJobs)
    );
    
    return tier || VOLUME_DISCOUNTS[0];
  } catch (error) {
    console.error('Error calculating volume discount:', error);
    return VOLUME_DISCOUNTS[0];
  }
}

/**
 * Calculate base price for job posting
 * @param {Object} options - Job options
 * @returns {Object}
 */
function calculateBasePrice(options = {}) {
  const { 
    isFeatured = false, 
    isUrgent = false,
    category = null,
  } = options;
  
  let basePrice = BASE_PRICING.jobPosting.basePrice;
  const breakdown = {
    basePrice,
    adjustments: [],
  };
  
  // Category-based pricing
  const categoryTier = getCategoryTier(category);
  if (categoryTier.multiplier !== 1.0) {
    const categoryAdjustment = Math.round(basePrice * (categoryTier.multiplier - 1));
    basePrice += categoryAdjustment;
    breakdown.adjustments.push({
      type: 'category',
      description: `${category} (${categoryTier.tier})`,
      multiplier: categoryTier.multiplier,
      amount: categoryAdjustment,
    });
  }
  
  // Featured listing
  if (isFeatured) {
    breakdown.adjustments.push({
      type: 'featured',
      description: 'Featured listing',
      amount: BASE_PRICING.featuredListing.basePrice,
    });
    basePrice += BASE_PRICING.featuredListing.basePrice;
  }
  
  // Urgent listing
  if (isUrgent) {
    breakdown.adjustments.push({
      type: 'urgent',
      description: 'Urgent listing (48hr)',
      amount: BASE_PRICING.urgentListing.basePrice,
    });
    basePrice += BASE_PRICING.urgentListing.basePrice;
  }
  
  breakdown.currentPrice = basePrice;
  
  return {
    basePrice: BASE_PRICING.jobPosting.basePrice,
    adjustedBasePrice: basePrice,
    breakdown,
    currency: BASE_PRICING.jobPosting.currency,
  };
}

/**
 * Calculate surge pricing multipliers
 * @param {Object} options - Job options
 * @returns {Object}
 */
function calculateSurgePricing(options = {}) {
  const { isUrgent = false, category = null } = options;
  const multipliers = [];
  let totalMultiplier = 1.0;
  
  // Urgency surge
  if (isUrgent) {
    multipliers.push({
      type: 'urgency',
      description: SURGE_PRICING.urgency.description,
      multiplier: SURGE_PRICING.urgency.multiplier,
    });
    totalMultiplier *= SURGE_PRICING.urgency.multiplier;
  }
  
  // Weekend surge
  if (isWeekend()) {
    multipliers.push({
      type: 'weekend',
      description: SURGE_PRICING.weekend.description,
      multiplier: SURGE_PRICING.weekend.multiplier,
    });
    totalMultiplier *= SURGE_PRICING.weekend.multiplier;
  }
  
  // Holiday surge
  if (isHoliday()) {
    multipliers.push({
      type: 'holiday',
      description: SURGE_PRICING.holiday.description,
      multiplier: SURGE_PRICING.holiday.multiplier,
    });
    totalMultiplier *= SURGE_PRICING.holiday.multiplier;
  }
  
  // High-demand category surge
  const categoryTier = getCategoryTier(category);
  if (categoryTier.tier === 'high_demand') {
    multipliers.push({
      type: 'high_demand',
      description: SURGE_PRICING.highDemand.description,
      multiplier: SURGE_PRICING.highDemand.multiplier,
    });
    totalMultiplier *= SURGE_PRICING.highDemand.multiplier;
  }
  
  return {
    multipliers,
    totalMultiplier: Math.round(totalMultiplier * 100) / 100,
    surgePricingApplied: multipliers.length > 0,
  };
}

/**
 * Calculate pricing for a job posting
 * @param {Object} options - Pricing options
 * @returns {Object}
 */
async function calculateJobPostingPrice(options = {}) {
  const {
    companyId = null,
    category = null,
    isFeatured = false,
    isUrgent = false,
    promoCode = null,
    quantity = 1,
    userId = null,
  } = options;
  
  // Calculate base price
  const basePricing = calculateBasePrice({ isFeatured, isUrgent, category });
  let subtotal = basePricing.adjustedBasePrice * quantity;
  
  // Calculate surge pricing
  const surgePricing = calculateSurgePricing({ isUrgent, category });
  let priceAfterSurge = subtotal * surgePricing.totalMultiplier;
  
  // Calculate volume discount
  const volumeTier = await getVolumeDiscountTier(companyId, quantity);
  const volumeDiscountAmount = Math.round(priceAfterSurge * volumeTier.discount);
  let priceAfterVolumeDiscount = priceAfterSurge - volumeDiscountAmount;
  
  // Apply dynamic pricing rules from database
  const dynamicRules = await applyDynamicPricingRules({
    type: 'job_posting',
    category,
    isUrgent,
    isFeatured,
    companyId,
    basePrice: priceAfterVolumeDiscount,
  });
  
  let priceAfterDynamicRules = dynamicRules.finalPrice;
  
  // Apply promotional code
  let promoCodeDiscount = { valid: false, discountAmount: 0 };
  if (promoCode) {
    promoCodeDiscount = await applyPromotionalCode({
      code: promoCode,
      amount: priceAfterDynamicRules,
      userId,
      companyId,
      serviceType: 'job_posting',
      category,
    });
    
    if (promoCodeDiscount.valid) {
      priceAfterDynamicRules -= promoCodeDiscount.discountAmount;
    }
  }
  
  // Final price (ensure it's not negative)
  const finalPrice = Math.max(0, Math.round(priceAfterDynamicRules));
  
  // Build detailed breakdown
  const breakdown = {
    basePrice: basePricing.basePrice,
    baseAdjustments: basePricing.breakdown.adjustments,
    quantity,
    subtotal: Math.round(subtotal),
    surgePricing: {
      applied: surgePricing.surgePricingApplied,
      multipliers: surgePricing.multipliers,
      totalMultiplier: surgePricing.totalMultiplier,
      amount: Math.round(priceAfterSurge - subtotal),
    },
    volumeDiscount: {
      tier: volumeTier.label,
      discount: volumeTier.discount,
      amount: volumeDiscountAmount,
    },
    dynamicRules: dynamicRules.appliedRules,
    promotionalCode: promoCodeDiscount.valid ? {
      code: promoCode,
      ...promoCodeDiscount,
    } : null,
    finalPrice,
    currency: BASE_PRICING.jobPosting.currency,
  };
  
  return {
    success: true,
    breakdown,
    finalPrice,
    currency: BASE_PRICING.jobPosting.currency,
    surgePricingApplied: surgePricing.surgePricingApplied,
    promoCodeApplied: promoCodeDiscount.valid,
  };
}

/**
 * Apply dynamic pricing rules from database
 * @param {Object} context - Pricing context
 * @returns {Object}
 */
async function applyDynamicPricingRules(context) {
  try {
    const applicableRules = await PricingRule.findApplicableRules(context);
    
    let currentPrice = context.basePrice;
    const appliedRules = [];
    const appliedRuleIds = [];
    
    for (const ruleData of applicableRules) {
      const rule = new PricingRule(ruleData);
      
      // Check if this rule is exclusive with any already applied rule
      const isExclusive = rule.exclusiveWith.some(id => 
        appliedRuleIds.some(appliedId => appliedId.toString() === id.toString())
      );
      
      if (isExclusive) {
        continue;
      }
      
      // Calculate adjustment
      const adjustment = rule.calculateAdjustment(currentPrice, context);
      
      appliedRules.push({
        ruleId: rule._id,
        name: rule.name,
        type: rule.ruleType,
        adjustmentType: adjustment.type,
        adjustmentValue: adjustment.value,
        amount: Math.round(adjustment.amount),
        previousPrice: Math.round(currentPrice),
        newPrice: Math.round(adjustment.finalPrice),
      });
      
      currentPrice = adjustment.finalPrice;
      appliedRuleIds.push(rule._id);
      
      // If rule is not stackable, stop here
      if (!rule.stackable) {
        break;
      }
    }
    
    return {
      appliedRules,
      finalPrice: Math.max(0, Math.round(currentPrice)),
      rulesApplied: appliedRules.length,
    };
  } catch (error) {
    console.error('Error applying dynamic pricing rules:', error);
    return {
      appliedRules: [],
      finalPrice: context.basePrice,
      rulesApplied: 0,
    };
  }
}

/**
 * Apply promotional code
 * @param {Object} options - Promo code options
 * @returns {Object}
 */
async function applyPromotionalCode(options) {
  const { code, amount, userId, companyId, serviceType, category } = options;
  
  try {
    const promoCode = await PromotionalCode.findByCode(code);
    
    if (!promoCode) {
      return {
        valid: false,
        error: 'Invalid promotional code',
        discountAmount: 0,
      };
    }
    
    // Validate for user
    const validation = await promoCode.validateForUser(userId, companyId, {
      serviceType,
      category,
      amount,
    });
    
    if (!validation.valid) {
      return {
        valid: false,
        error: validation.errors.join(', '),
        discountAmount: 0,
      };
    }
    
    // Calculate discount
    const discount = promoCode.calculateDiscount(amount);
    
    return {
      valid: true,
      code: promoCode.code,
      discountType: discount.discountType,
      discountValue: discount.discountValue,
      discountAmount: discount.discountAmount,
      finalAmount: discount.finalAmount,
      currency: discount.currency,
    };
  } catch (error) {
    console.error('Error applying promotional code:', error);
    return {
      valid: false,
      error: 'Error validating promotional code',
      discountAmount: 0,
    };
  }
}

/**
 * Preview pricing with various options
 * @param {Object} options - Preview options
 * @returns {Object}
 */
async function previewPricing(options = {}) {
  const {
    companyId = null,
    scenarios = [],
  } = options;
  
  const results = [];
  
  // Default scenarios if none provided
  const defaultScenarios = [
    { name: 'Standard Job', category: null, isFeatured: false, isUrgent: false },
    { name: 'Featured Job', category: null, isFeatured: true, isUrgent: false },
    { name: 'Urgent Job', category: null, isFeatured: false, isUrgent: true },
    { name: 'Tech Job', category: 'Technology', isFeatured: false, isUrgent: false },
    { name: 'Featured Tech Job', category: 'Technology', isFeatured: true, isUrgent: false },
    { name: 'Urgent Tech Job', category: 'Technology', isFeatured: false, isUrgent: true },
  ];
  
  const scenariosToRun = scenarios.length > 0 ? scenarios : defaultScenarios;
  
  for (const scenario of scenariosToRun) {
    const pricing = await calculateJobPostingPrice({
      companyId,
      ...scenario,
    });
    
    results.push({
      scenario: scenario.name || `${scenario.category || 'Standard'} Job`,
      ...pricing,
    });
  }
  
  return {
    success: true,
    scenarios: results,
    volumeDiscountTiers: VOLUME_DISCOUNTS,
    surgePricingRules: SURGE_PRICING,
    categoryTiers: CATEGORY_TIERS,
  };
}

/**
 * Get volume discount information
 * @param {string} companyId - Company ID
 * @returns {Object}
 */
async function getVolumeDiscountInfo(companyId) {
  const currentTier = await getVolumeDiscountTier(companyId, 0);
  const currentIndex = VOLUME_DISCOUNTS.findIndex(t => t.label === currentTier.label);
  const nextTier = currentIndex < VOLUME_DISCOUNTS.length - 1 ? VOLUME_DISCOUNTS[currentIndex + 1] : null;
  
  let jobsNeededForNextTier = 0;
  if (nextTier) {
    const jobCount = await Job.countDocuments({
      companyId: new mongoose.Types.ObjectId(companyId),
      status: { $in: ['active', 'published'] },
      createdAt: { $gte: new Date(new Date().setDate(1)) },
    });
    jobsNeededForNextTier = nextTier.minJobs - jobCount;
  }
  
  return {
    currentTier,
    nextTier,
    jobsNeededForNextTier: Math.max(0, jobsNeededForNextTier),
    allTiers: VOLUME_DISCOUNTS,
  };
}

/**
 * Record pricing breakdown on job document
 * @param {string} jobId - Job ID
 * @param {Object} pricingBreakdown - Pricing breakdown
 * @param {string} promoCodeId - Promotional code ID (if used)
 * @returns {Object}
 */
async function recordJobPricing(jobId, pricingBreakdown, promoCodeId = null) {
  try {
    const update = {
      pricingBreakdown,
      surgePricingApplied: pricingBreakdown.surgePricing?.applied || false,
    };
    
    if (promoCodeId) {
      update.promotionalCodeUsed = promoCodeId;
    }
    
    const job = await Job.findByIdAndUpdate(
      jobId,
      { $set: update },
      { new: true }
    );
    
    return {
      success: true,
      job,
    };
  } catch (error) {
    console.error('Error recording job pricing:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Initialize default pricing rules
 * Creates default surge pricing and volume discount rules if they don't exist
 */
async function initializeDefaultPricingRules() {
  try {
    const existingRules = await PricingRule.countDocuments();
    
    if (existingRules > 0) {
      console.log('Pricing rules already initialized');
      return;
    }
    
    const defaultRules = [
      {
        name: 'Urgent Job Surge Pricing',
        description: '2x pricing for jobs requiring fill within 48 hours',
        code: 'SURGE_URGENT',
        ruleType: 'surge_pricing',
        conditions: [
          { type: 'urgency', operator: 'equals', value: true },
        ],
        adjustmentType: 'multiplier',
        adjustmentValue: 2.0,
        appliesTo: { jobPostings: true, subscriptions: false, featuredListings: false },
        priority: 90,
        stackable: true,
        isActive: true,
      },
      {
        name: 'Weekend Posting Surge',
        description: '1.5x pricing for jobs posted on weekends',
        code: 'SURGE_WEEKEND',
        ruleType: 'time_based',
        conditions: [],
        timeWindow: {
          daysOfWeek: [0, 6], // Sunday and Saturday
          timezone: MYANMAR_TIMEZONE,
        },
        adjustmentType: 'multiplier',
        adjustmentValue: 1.5,
        appliesTo: { jobPostings: true, subscriptions: false, featuredListings: false },
        priority: 80,
        stackable: true,
        isActive: true,
      },
      {
        name: 'High-Demand Category Pricing',
        description: '1.3x pricing for Technology and Executive roles',
        code: 'CATEGORY_HIGH_DEMAND',
        ruleType: 'category_pricing',
        conditions: [
          { type: 'category', operator: 'in', value: ['Technology', 'IT', 'Software', 'Executive'] },
        ],
        adjustmentType: 'multiplier',
        adjustmentValue: 1.3,
        appliesTo: { jobPostings: true, subscriptions: false, featuredListings: false },
        priority: 70,
        stackable: true,
        isActive: true,
      },
      {
        name: 'Volume Discount - 5-9 Jobs',
        description: '10% discount for posting 5-9 jobs',
        code: 'VOL_5_9',
        ruleType: 'volume_discount',
        conditions: [
          { type: 'volume', operator: 'between', value: 5, value2: 9 },
        ],
        adjustmentType: 'percentage',
        adjustmentValue: -10,
        appliesTo: { jobPostings: true, subscriptions: false, featuredListings: false },
        priority: 60,
        stackable: true,
        isActive: true,
      },
      {
        name: 'Volume Discount - 10+ Jobs',
        description: '20% discount for posting 10 or more jobs',
        code: 'VOL_10_PLUS',
        ruleType: 'volume_discount',
        conditions: [
          { type: 'volume', operator: 'greater_than', value: 9 },
        ],
        adjustmentType: 'percentage',
        adjustmentValue: -20,
        appliesTo: { jobPostings: true, subscriptions: false, featuredListings: false },
        priority: 60,
        stackable: true,
        isActive: true,
      },
    ];
    
    for (const ruleData of defaultRules) {
      await PricingRule.create(ruleData);
    }
    
    console.log(`Created ${defaultRules.length} default pricing rules`);
  } catch (error) {
    console.error('Error initializing default pricing rules:', error);
  }
}

// Export all functions
module.exports = {
  calculateJobPostingPrice,
  calculateBasePrice,
  calculateSurgePricing,
  applyPromotionalCode,
  previewPricing,
  getVolumeDiscountInfo,
  recordJobPricing,
  initializeDefaultPricingRules,
  getVolumeDiscountTier,
  applyDynamicPricingRules,
  isWeekend,
  isHoliday,
  getCategoryTier,
  BASE_PRICING,
  VOLUME_DISCOUNTS,
  SURGE_PRICING,
  CATEGORY_TIERS,
  MYANMAR_HOLIDAYS,
  MYANMAR_TIMEZONE,
};
