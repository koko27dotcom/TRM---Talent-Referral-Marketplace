/**
 * FeaturedJobService
 * Manages featured job slots, auction/bidding system, and performance tracking
 * Revenue generator for Phase 2 of TRM platform
 */

const { FeaturedJobSlot, Job, Company, BillingRecord } = require('../models/index.js');
const mongoose = require('mongoose');

// Myanmar timezone configuration
const MYANMAR_TIMEZONE = 'Asia/Yangon';

// Base pricing for featured slots
const SLOT_BASE_PRICING = {
  carousel: {
    basePrice: 25000, // MMK
    minBidIncrement: 5000,
    maxDurationDays: 14,
  },
  sidebar: {
    basePrice: 15000,
    minBidIncrement: 3000,
    maxDurationDays: 30,
  },
  banner: {
    basePrice: 50000,
    minBidIncrement: 10000,
    maxDurationDays: 7,
  },
  homepage_hero: {
    basePrice: 100000,
    minBidIncrement: 20000,
    maxDurationDays: 3,
  },
};

// Priority multipliers based on slot position
const POSITION_MULTIPLIERS = {
  1: 3.0,  // Hero position
  2: 2.5,
  3: 2.0,
  4: 1.8,
  5: 1.5,
  6: 1.3,
  7: 1.2,
  8: 1.1,
  9: 1.0,
  10: 1.0,
};

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
  };
  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(now);
  
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  
  return new Date(`${year}-${month}-${day}`);
}

/**
 * Calculate minimum bid for a slot position
 * @param {number} position - Slot position (1-10)
 * @param {string} slotType - Type of slot
 * @returns {number}
 */
function calculateMinimumBid(position, slotType = 'carousel') {
  const basePrice = SLOT_BASE_PRICING[slotType]?.basePrice || SLOT_BASE_PRICING.carousel.basePrice;
  const multiplier = POSITION_MULTIPLIERS[position] || 1.0;
  return Math.round(basePrice * multiplier);
}

/**
 * Get featured jobs for homepage carousel
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
async function getFeaturedJobsForCarousel(options = {}) {
  try {
    const { limit = 10, includeExpired = false } = options;
    
    // Get active featured slots
    const slots = await FeaturedJobSlot.getActiveSlots({
      slotType: 'carousel',
      limit,
    });
    
    // Get job details for each slot
    const featuredJobs = [];
    
    for (const slot of slots) {
      if (slot.jobId) {
        const job = await Job.findById(slot.jobId)
          .populate('companyId', 'name slug logo industry');
        
        if (job && job.status === 'active') {
          featuredJobs.push({
            slot: {
              id: slot._id,
              position: slot.slotPosition,
              bidAmount: slot.bidAmount,
              daysRemaining: slot.daysRemaining,
            },
            job: {
              id: job._id,
              title: job.title,
              slug: job.slug,
              location: job.location,
              type: job.type,
              salary: job.salary,
              category: job.category,
              company: job.companyId,
              referralBonus: job.referralBonus,
              featuredPriority: job.featuredPriority,
            },
          });
        }
      }
    }
    
    // Sort by position
    return featuredJobs.sort((a, b) => a.slot.position - b.slot.position);
  } catch (error) {
    console.error('Error getting featured jobs for carousel:', error);
    throw error;
  }
}

/**
 * Place job as featured (with payment processing)
 * @param {Object} options - Placement options
 * @returns {Promise<Object>}
 */
async function placeFeaturedJob(options) {
  const {
    jobId,
    companyId,
    slotPosition,
    bidAmount,
    durationDays = 7,
    slotType = 'carousel',
    userId,
  } = options;
  
  try {
    // Validate job exists and belongs to company
    const job = await Job.findOne({
      _id: jobId,
      companyId: companyId,
    });
    
    if (!job) {
      throw new Error('Job not found or does not belong to this company');
    }
    
    if (job.status !== 'active') {
      throw new Error('Job must be active to be featured');
    }
    
    // Check if slot is available
    const existingSlot = await FeaturedJobSlot.findOne({
      slotPosition,
      slotType,
      status: { $in: ['active', 'pending'] },
      endDate: { $gt: new Date() },
    });
    
    if (existingSlot) {
      // Slot is occupied, check if bid is higher
      if (bidAmount <= existingSlot.bidAmount) {
        throw new Error(`Bid must be higher than current bid of ${existingSlot.bidAmount} MMK`);
      }
      
      // Cancel existing slot if outbid
      await existingSlot.cancel(userId, 'Outbid by higher offer');
    }
    
    // Calculate minimum bid
    const minimumBid = calculateMinimumBid(slotPosition, slotType);
    
    if (bidAmount < minimumBid) {
      throw new Error(`Minimum bid for position ${slotPosition} is ${minimumBid} MMK`);
    }
    
    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);
    
    // Create featured slot
    const featuredSlot = new FeaturedJobSlot({
      slotPosition,
      slotType,
      slotName: `Position ${slotPosition}`,
      jobId,
      companyId,
      bidAmount,
      minimumBid,
      startDate,
      endDate,
      durationDays,
      status: 'pending',
      bidHistory: [{
        companyId,
        jobId,
        bidAmount,
        bidAt: new Date(),
        isWinning: true,
      }],
    });
    
    await featuredSlot.save();
    
    // Update job with featured status
    await Job.setAsFeatured(jobId, {
      priority: slotPosition,
      slotId: featuredSlot._id,
      bidAmount,
      durationDays,
    });
    
    // Create billing record for payment
    const billingRecord = new BillingRecord({
      companyId,
      invoiceNumber: `FJS-${Date.now()}`,
      items: [{
        description: `Featured Job Slot - Position ${slotPosition} (${durationDays} days)`,
        type: 'featured_listing',
        quantity: 1,
        unitPrice: bidAmount,
        amount: bidAmount,
        metadata: {
          slotId: featuredSlot._id,
          jobId,
          slotPosition,
          durationDays,
        },
      }],
      subtotal: bidAmount,
      taxAmount: 0,
      totalAmount: bidAmount,
      currency: 'MMK',
      status: 'pending',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });
    
    await billingRecord.save();
    
    // Link billing record to featured slot
    featuredSlot.billingRecordId = billingRecord._id;
    await featuredSlot.save();
    
    return {
      success: true,
      featuredSlot,
      billingRecord,
      message: 'Featured job placement created. Please complete payment to activate.',
    };
  } catch (error) {
    console.error('Error placing featured job:', error);
    throw error;
  }
}

/**
 * Bid on premium slot (auction-style)
 * @param {Object} options - Bid options
 * @returns {Promise<Object>}
 */
async function bidOnPremiumSlot(options) {
  const {
    slotPosition,
    jobId,
    companyId,
    bidAmount,
    userId,
    slotType = 'carousel',
  } = options;
  
  try {
    // Validate job
    const job = await Job.findOne({
      _id: jobId,
      companyId: companyId,
    });
    
    if (!job) {
      throw new Error('Job not found or does not belong to this company');
    }
    
    // Check minimum bid
    const minimumBid = calculateMinimumBid(slotPosition, slotType);
    
    // Find existing slot at this position
    const existingSlot = await FeaturedJobSlot.findOne({
      slotPosition,
      slotType,
      status: { $in: ['active', 'pending'] },
      endDate: { $gt: new Date() },
    });
    
    if (existingSlot) {
      // Check bid increment
      const minBidIncrement = SLOT_BASE_PRICING[slotType]?.minBidIncrement || 5000;
      const requiredBid = existingSlot.bidAmount + minBidIncrement;
      
      if (bidAmount < requiredBid) {
        throw new Error(`Bid must be at least ${requiredBid} MMK (${minBidIncrement} MMK above current bid)`);
      }
      
      // Place bid on existing slot
      const bidSuccess = await existingSlot.placeBid(companyId, jobId, bidAmount);
      
      if (!bidSuccess) {
        throw new Error('Failed to place bid. Please try a higher amount.');
      }
      
      // Update job with new featured status
      await Job.setAsFeatured(jobId, {
        priority: slotPosition,
        slotId: existingSlot._id,
        bidAmount,
        durationDays: existingSlot.durationDays,
      });
      
      // Cancel previous winner's slot
      const previousBids = existingSlot.bidHistory.filter(
        b => b.isWinning === false && b.companyId.toString() !== companyId.toString()
      );
      
      // Notify previous bidders (would be implemented with notification service)
      
      return {
        success: true,
        message: `Successfully placed bid of ${bidAmount} MMK for position ${slotPosition}`,
        slot: existingSlot,
        position: slotPosition,
      };
    } else {
      // No existing slot, create new one
      const durationDays = SLOT_BASE_PRICING[slotType]?.maxDurationDays || 7;
      
      const result = await placeFeaturedJob({
        jobId,
        companyId,
        slotPosition,
        bidAmount,
        durationDays,
        slotType,
        userId,
      });
      
      return {
        success: true,
        message: `Successfully secured position ${slotPosition} with bid of ${bidAmount} MMK`,
        ...result,
      };
    }
  } catch (error) {
    console.error('Error bidding on premium slot:', error);
    throw error;
  }
}

/**
 * Get available slots for bidding
 * @param {string} slotType - Type of slot
 * @returns {Promise<Array>}
 */
async function getAvailableSlots(slotType = 'carousel') {
  try {
    // Get all active slots
    const activeSlots = await FeaturedJobSlot.find({
      slotType,
      status: { $in: ['active', 'pending'] },
      endDate: { $gt: new Date() },
    }).select('slotPosition bidAmount');
    
    const occupiedPositions = activeSlots.map(s => ({
      position: s.slotPosition,
      currentBid: s.bidAmount,
      minimumNextBid: s.bidAmount + (SLOT_BASE_PRICING[slotType]?.minBidIncrement || 5000),
    }));
    
    const occupiedPositionNumbers = occupiedPositions.map(p => p.position);
    
    // Generate all positions 1-10 with availability info
    const allPositions = Array.from({ length: 10 }, (_, i) => {
      const position = i + 1;
      const occupied = occupiedPositions.find(p => p.position === position);
      
      return {
        position,
        isAvailable: !occupied,
        currentBid: occupied?.currentBid || 0,
        minimumBid: calculateMinimumBid(position, slotType),
        minimumNextBid: occupied?.minimumNextBid || calculateMinimumBid(position, slotType),
      };
    });
    
    return allPositions;
  } catch (error) {
    console.error('Error getting available slots:', error);
    throw error;
  }
}

/**
 * Get company's featured jobs
 * @param {string} companyId - Company ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
async function getCompanyFeaturedJobs(companyId, options = {}) {
  try {
    const slots = await FeaturedJobSlot.getByCompany(companyId, {
      status: options.status,
      limit: options.limit || 50,
    });
    
    return slots.map(slot => ({
      id: slot._id,
      position: slot.slotPosition,
      slotType: slot.slotType,
      job: slot.jobId,
      bidAmount: slot.bidAmount,
      status: slot.status,
      startDate: slot.startDate,
      endDate: slot.endDate,
      daysRemaining: slot.daysRemaining,
      metrics: slot.metrics,
      paymentStatus: slot.paymentStatus,
    }));
  } catch (error) {
    console.error('Error getting company featured jobs:', error);
    throw error;
  }
}

/**
 * Get performance analytics for a featured slot
 * @param {string} slotId - Featured slot ID
 * @param {string} companyId - Company ID (for verification)
 * @returns {Promise<Object>}
 */
async function getSlotPerformanceAnalytics(slotId, companyId) {
  try {
    const slot = await FeaturedJobSlot.findOne({
      _id: slotId,
      companyId,
    }).populate('jobId', 'title status');
    
    if (!slot) {
      throw new Error('Featured slot not found');
    }
    
    const analytics = await FeaturedJobSlot.getPerformanceAnalytics(slotId);
    
    // Calculate additional metrics
    const totalViews = slot.metrics.views;
    const totalClicks = slot.metrics.clicks;
    const totalApplications = slot.metrics.applications;
    
    return {
      ...analytics,
      ctr: totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(2) : 0,
      conversionRate: totalViews > 0 ? ((totalApplications / totalViews) * 100).toFixed(2) : 0,
      costPerClick: totalClicks > 0 ? (slot.bidAmount / totalClicks).toFixed(2) : 0,
      costPerApplication: totalApplications > 0 ? (slot.bidAmount / totalApplications).toFixed(2) : 0,
      jobDetails: slot.jobId,
    };
  } catch (error) {
    console.error('Error getting slot performance analytics:', error);
    throw error;
  }
}

/**
 * Cancel featured listing
 * @param {string} slotId - Featured slot ID
 * @param {string} companyId - Company ID
 * @param {string} userId - User ID
 * @param {string} reason - Cancellation reason
 * @returns {Promise<Object>}
 */
async function cancelFeaturedListing(slotId, companyId, userId, reason) {
  try {
    const slot = await FeaturedJobSlot.findOne({
      _id: slotId,
      companyId,
    });
    
    if (!slot) {
      throw new Error('Featured slot not found');
    }
    
    if (slot.status === 'cancelled' || slot.status === 'expired') {
      throw new Error('Featured slot is already cancelled or expired');
    }
    
    // Cancel the slot
    await slot.cancel(userId, reason);
    
    // Remove featured status from job
    await Job.findByIdAndUpdate(slot.jobId, {
      $set: {
        isFeatured: false,
        featuredPriority: 10,
        featuredSlotId: null,
      },
    });
    
    // Process refund if applicable (if cancelled within 24 hours)
    const hoursSinceStart = (new Date() - slot.startDate) / (1000 * 60 * 60);
    let refundAmount = 0;
    
    if (hoursSinceStart < 24 && slot.paymentStatus === 'paid') {
      refundAmount = slot.bidAmount;
      
      // Create refund billing record
      const refundRecord = new BillingRecord({
        companyId,
        invoiceNumber: `REF-${Date.now()}`,
        items: [{
          description: `Refund for cancelled featured slot - Position ${slot.slotPosition}`,
          type: 'refund',
          quantity: 1,
          unitPrice: -refundAmount,
          amount: -refundAmount,
          metadata: {
            originalSlotId: slot._id,
            cancellationReason: reason,
          },
        }],
        subtotal: -refundAmount,
        taxAmount: 0,
        totalAmount: -refundAmount,
        currency: 'MMK',
        status: 'pending',
      });
      
      await refundRecord.save();
    }
    
    return {
      success: true,
      message: 'Featured listing cancelled successfully',
      refundAmount,
      slot,
    };
  } catch (error) {
    console.error('Error cancelling featured listing:', error);
    throw error;
  }
}

/**
 * Approve featured job (admin)
 * @param {string} slotId - Featured slot ID
 * @param {string} adminUserId - Admin user ID
 * @returns {Promise<Object>}
 */
async function approveFeaturedJob(slotId, adminUserId) {
  try {
    const slot = await FeaturedJobSlot.findById(slotId);
    
    if (!slot) {
      throw new Error('Featured slot not found');
    }
    
    if (slot.status !== 'pending') {
      throw new Error('Featured slot is not in pending status');
    }
    
    // Approve the slot
    await slot.approve(adminUserId);
    
    // Update job to active featured status
    await Job.findByIdAndUpdate(slot.jobId, {
      $set: {
        isFeatured: true,
        featuredPriority: slot.slotPosition,
        featuredSlotId: slot._id,
        featuredStartDate: slot.startDate,
        featuredEndDate: slot.endDate,
      },
    });
    
    return {
      success: true,
      message: 'Featured job approved successfully',
      slot,
    };
  } catch (error) {
    console.error('Error approving featured job:', error);
    throw error;
  }
}

/**
 * Reject featured job (admin)
 * @param {string} slotId - Featured slot ID
 * @param {string} reason - Rejection reason
 * @returns {Promise<Object>}
 */
async function rejectFeaturedJob(slotId, reason) {
  try {
    const slot = await FeaturedJobSlot.findById(slotId);
    
    if (!slot) {
      throw new Error('Featured slot not found');
    }
    
    await slot.reject(reason);
    
    return {
      success: true,
      message: 'Featured job rejected',
      slot,
    };
  } catch (error) {
    console.error('Error rejecting featured job:', error);
    throw error;
  }
}

/**
 * Process payment for featured slot
 * @param {string} slotId - Featured slot ID
 * @param {Object} paymentDetails - Payment details
 * @returns {Promise<Object>}
 */
async function processFeaturedSlotPayment(slotId, paymentDetails) {
  try {
    const slot = await FeaturedJobSlot.findById(slotId);
    
    if (!slot) {
      throw new Error('Featured slot not found');
    }
    
    if (slot.paymentStatus === 'paid') {
      throw new Error('Payment already processed for this slot');
    }
    
    // Update billing record with payment
    if (slot.billingRecordId) {
      await BillingRecord.findByIdAndUpdate(slot.billingRecordId, {
        $set: {
          status: 'paid',
          paymentDetails: {
            method: paymentDetails.method,
            transactionId: paymentDetails.transactionId,
            paidAt: new Date(),
            paidBy: paymentDetails.userId,
          },
          paidAt: new Date(),
        },
      });
    }
    
    // Record payment on slot
    await slot.recordPayment(slot.billingRecordId);
    
    // If approved, activate the slot
    if (slot.isApproved) {
      slot.status = 'active';
      await slot.save();
      
      // Update job
      await Job.findByIdAndUpdate(slot.jobId, {
        $set: {
          isFeatured: true,
          featuredPriority: slot.slotPosition,
        },
      });
    }
    
    return {
      success: true,
      message: 'Payment processed successfully',
      slot,
    };
  } catch (error) {
    console.error('Error processing featured slot payment:', error);
    throw error;
  }
}

/**
 * Automatic rotation of featured jobs
 * Rotates jobs within the same priority level
 * @returns {Promise<number>} - Number of rotations performed
 */
async function rotateFeaturedJobs() {
  try {
    // Get all active featured slots grouped by position
    const slots = await FeaturedJobSlot.find({
      status: 'active',
      isAutoRotate: true,
      endDate: { $gt: new Date() },
    }).sort({ slotPosition: 1, rotationPriority: 1 });
    
    const rotationsByPosition = {};
    
    // Group slots by position
    slots.forEach(slot => {
      if (!rotationsByPosition[slot.slotPosition]) {
        rotationsByPosition[slot.slotPosition] = [];
      }
      rotationsByPosition[slot.slotPosition].push(slot);
    });
    
    let rotationCount = 0;
    
    // Rotate within each position
    for (const position in rotationsByPosition) {
      const positionSlots = rotationsByPosition[position];
      
      if (positionSlots.length > 1) {
        // Rotate priorities
        const firstPriority = positionSlots[0].rotationPriority;
        
        for (let i = 0; i < positionSlots.length - 1; i++) {
          positionSlots[i].rotationPriority = positionSlots[i + 1].rotationPriority;
        }
        
        positionSlots[positionSlots.length - 1].rotationPriority = firstPriority;
        
        // Save all
        await Promise.all(positionSlots.map(slot => slot.save()));
        rotationCount += positionSlots.length;
      }
    }
    
    return rotationCount;
  } catch (error) {
    console.error('Error rotating featured jobs:', error);
    throw error;
  }
}

/**
 * Track performance metrics for featured jobs
 * @param {string} slotId - Featured slot ID
 * @param {string} metricType - Type of metric (view, click, application, hire)
 * @returns {Promise<void>}
 */
async function trackFeaturedJobMetrics(slotId, metricType) {
  try {
    const slot = await FeaturedJobSlot.findById(slotId);
    
    if (!slot || slot.status !== 'active') {
      return;
    }
    
    switch (metricType) {
      case 'view':
        await slot.incrementViews(true);
        break;
      case 'click':
        await slot.incrementClicks();
        break;
      case 'application':
        await slot.incrementApplications();
        break;
      case 'hire':
        await slot.markAsHired();
        break;
      default:
        break;
    }
    
    // Also update job metrics
    const job = await Job.findById(slot.jobId);
    if (job) {
      switch (metricType) {
        case 'view':
          await Job.incrementFeaturedViews(job._id, true);
          break;
        case 'click':
          await Job.incrementFeaturedClicks(job._id);
          break;
        case 'application':
          await Job.incrementFeaturedApplications(job._id);
          break;
        default:
          break;
      }
    }
  } catch (error) {
    console.error('Error tracking featured job metrics:', error);
  }
}

/**
 * Get auction leaderboard for a position
 * @param {number} position - Slot position
 * @param {string} slotType - Type of slot
 * @returns {Promise<Array>}
 */
async function getAuctionLeaderboard(position, slotType = 'carousel') {
  try {
    const leaderboard = await FeaturedJobSlot.getAuctionLeaderboard(position);
    
    return leaderboard.map((entry, index) => ({
      rank: index + 1,
      company: entry.companyId,
      job: entry.jobId,
      bidAmount: entry.bidAmount,
      bidTime: entry.bidHistory[entry.bidHistory.length - 1]?.bidAt,
      isWinning: entry.bidHistory[entry.bidHistory.length - 1]?.isWinning || false,
    }));
  } catch (error) {
    console.error('Error getting auction leaderboard:', error);
    throw error;
  }
}

/**
 * Expire old featured slots
 * Should be called by cron job
 * @returns {Promise<number>}
 */
async function expireOldFeaturedSlots() {
  try {
    const expiredCount = await FeaturedJobSlot.expireOldSlots();
    
    // Also update jobs that have expired featured status
    const expiredSlots = await FeaturedJobSlot.find({
      status: 'expired',
      'jobId.isFeatured': true,
    });
    
    for (const slot of expiredSlots) {
      await Job.findByIdAndUpdate(slot.jobId, {
        $set: {
          isFeatured: false,
          featuredPriority: 10,
          featuredSlotId: null,
        },
      });
    }
    
    return expiredCount;
  } catch (error) {
    console.error('Error expiring old featured slots:', error);
    throw error;
  }
}

/**
 * Get featured slot pricing info
 * @returns {Object}
 */
function getFeaturedSlotPricingInfo() {
  return {
    slotTypes: SLOT_BASE_PRICING,
    positionMultipliers: POSITION_MULTIPLIERS,
    minimumBids: Array.from({ length: 10 }, (_, i) => ({
      position: i + 1,
      carousel: calculateMinimumBid(i + 1, 'carousel'),
      sidebar: calculateMinimumBid(i + 1, 'sidebar'),
      banner: calculateMinimumBid(i + 1, 'banner'),
      homepage_hero: calculateMinimumBid(i + 1, 'homepage_hero'),
    })),
  };
}

// Export all functions
module.exports = {
  getFeaturedJobsForCarousel,
  placeFeaturedJob,
  bidOnPremiumSlot,
  getAvailableSlots,
  getCompanyFeaturedJobs,
  getSlotPerformanceAnalytics,
  cancelFeaturedListing,
  approveFeaturedJob,
  rejectFeaturedJob,
  processFeaturedSlotPayment,
  rotateFeaturedJobs,
  trackFeaturedJobMetrics,
  getAuctionLeaderboard,
  expireOldFeaturedSlots,
  getFeaturedSlotPricingInfo,
  calculateMinimumBid,
  SLOT_BASE_PRICING,
  POSITION_MULTIPLIERS,
};
