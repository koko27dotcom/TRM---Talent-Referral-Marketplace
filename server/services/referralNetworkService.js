/**
 * ReferralNetworkService
 * Core business logic for viral referral network operations
 * Handles network building, tier management, and commission calculations
 */

const { User, ReferralNetwork, TierBenefits, AuditLog } = require('../models/index.js');

/**
 * Service class for managing referral network operations
 */
class ReferralNetworkService {
  /**
   * Initialize a new referrer in the network
   * Called when a new referrer registers with an invite code
   * @param {string} userId - New user's ID
   * @param {string} inviteCode - Invite code used (optional)
   * @returns {Promise<Object>} Result with parent referrer info
   */
  async initializeReferrer(userId, inviteCode = null) {
    try {
      let parentReferrerId = null;
      
      // If invite code provided, find parent referrer
      if (inviteCode) {
        const parentReferrer = await User.findByInviteCode(inviteCode);
        if (parentReferrer) {
          parentReferrerId = parentReferrer._id;
          
          // Prevent self-referral
          if (parentReferrerId.toString() === userId.toString()) {
            throw new Error('Cannot use your own invite code');
          }
          
          // Check for circular reference
          const isCircular = await ReferralNetwork.isInDownline(userId, parentReferrerId);
          if (isCircular) {
            throw new Error('Invalid referral relationship');
          }
        }
      }
      
      // Add to network closure table
      await ReferralNetwork.addToNetwork(userId, parentReferrerId);
      
      // Update user's parent referrer
      if (parentReferrerId) {
        await User.findByIdAndUpdate(userId, {
          'referrerProfile.parentReferrerId': parentReferrerId,
        });
        
        // Update parent's direct referrals count
        await User.findByIdAndUpdate(parentReferrerId, {
          $inc: { 'referrerProfile.directReferrals': 1 },
        });
        
        // Update network sizes for all ancestors
        await this.updateAncestorNetworkSizes(parentReferrerId);
        
        // Log the referral
        await AuditLog.logUserAction({
          user: { _id: userId },
          action: 'referral_network_joined',
          entityType: 'referral_network',
          entityId: userId,
          description: `New referrer joined via invite code: ${inviteCode}`,
          severity: 'info',
        });
      }
      
      return {
        success: true,
        parentReferrerId,
        message: parentReferrerId 
          ? 'Successfully joined referral network' 
          : 'Referrer profile created',
      };
    } catch (error) {
      console.error('Error initializing referrer:', error);
      throw error;
    }
  }
  
  /**
   * Update network sizes for all ancestors of a user
   * @param {string} userId - User whose ancestors need updating
   */
  async updateAncestorNetworkSizes(userId) {
    const ancestors = await ReferralNetwork.getAncestors(userId);
    
    for (const ancestor of ancestors) {
      const stats = await ReferralNetwork.getNetworkStats(ancestor.ancestorId._id);
      
      await User.findByIdAndUpdate(ancestor.ancestorId._id, {
        'referrerProfile.networkSize': stats.totalNetworkSize,
      });
    }
  }
  
  /**
   * Get complete network information for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Network information
   */
  async getNetworkInfo(userId) {
    const [user, networkStats, directChildren, tierInfo] = await Promise.all([
      User.findById(userId).select('name email avatar referrerProfile'),
      ReferralNetwork.getNetworkStats(userId),
      ReferralNetwork.getDirectChildren(userId),
      this.getTierInfo(userId),
    ]);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        tierLevel: user.referrerProfile?.tierLevel || 'bronze',
        inviteCode: user.referrerProfile?.inviteCode,
      },
      stats: {
        directReferrals: user.referrerProfile?.directReferrals || 0,
        networkSize: user.referrerProfile?.networkSize || 0,
        networkEarnings: user.referrerProfile?.networkEarnings || 0,
        ...networkStats,
      },
      directChildren: directChildren.map(child => ({
        id: child._id,
        name: child.name,
        email: child.email,
        avatar: child.avatar,
        tierLevel: child.referrerProfile?.tierLevel || 'bronze',
        networkSize: child.referrerProfile?.networkSize || 0,
        joinedAt: child.createdAt,
      })),
      tier: tierInfo,
    };
  }
  
  /**
   * Get network tree for visualization
   * @param {string} userId - Root user ID
   * @param {number} maxDepth - Maximum depth to traverse
   * @returns {Promise<Object>} Tree structure
   */
  async getNetworkTree(userId, maxDepth = 3) {
    const tree = await ReferralNetwork.getNetworkTree(userId, maxDepth);
    return tree;
  }
  
  /**
   * Get tier information and progress for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Tier information
   */
  async getTierInfo(userId) {
    const user = await User.findById(userId).select('referrerProfile');
    
    if (!user || !user.referrerProfile) {
      throw new Error('User not found or not a referrer');
    }
    
    const profile = user.referrerProfile;
    
    const userStats = {
      directReferrals: profile.directReferrals || 0,
      networkSize: profile.networkSize || 0,
      totalEarnings: profile.totalEarnings || 0,
      successfulHires: profile.successfulHires || 0,
    };
    
    // Get tier progress
    const progress = await TierBenefits.getTierProgress(userStats);
    
    // Get current tier details
    const currentTier = await TierBenefits.getTier(progress.currentTier);
    
    // Get next tier details
    const nextTier = progress.nextTier 
      ? await TierBenefits.getTier(progress.nextTier)
      : null;
    
    return {
      current: {
        tier: progress.currentTier,
        name: progress.currentTierName,
        level: progress.currentTierLevel,
        color: currentTier?.color,
        gradient: currentTier?.gradient,
        icon: currentTier?.icon,
        benefits: currentTier?.benefits || [],
        commission: currentTier?.commission,
        payout: currentTier?.payout,
      },
      next: nextTier ? {
        tier: progress.nextTier,
        name: progress.nextTierName,
        requirements: progress.requirements,
      } : null,
      progress: progress.progress,
      stats: userStats,
    };
  }
  
  /**
   * Check and update user's tier based on their stats
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Tier update result
   */
  async checkAndUpdateTier(userId) {
    const user = await User.findById(userId).select('name email referrerProfile');
    
    if (!user || !user.referrerProfile) {
      throw new Error('User not found or not a referrer');
    }
    
    const profile = user.referrerProfile;
    
    const userStats = {
      directReferrals: profile.directReferrals || 0,
      networkSize: profile.networkSize || 0,
      totalEarnings: profile.totalEarnings || 0,
      successfulHires: profile.successfulHires || 0,
    };
    
    // Calculate what tier they should be
    const calculatedTier = await TierBenefits.calculateTier(userStats);
    const currentTier = profile.tierLevel || 'bronze';
    
    // If tier changed, update and return info
    if (calculatedTier !== currentTier) {
      const newTier = await TierBenefits.getTier(calculatedTier);
      
      // Update user's tier
      await User.findByIdAndUpdate(userId, {
        'referrerProfile.tierLevel': calculatedTier,
        'referrerProfile.tierUpgradedAt': new Date(),
        'referrerProfile.tierProgress': 100,
      });
      
      // Log tier upgrade
      await AuditLog.logUserAction({
        user: { _id: userId },
        action: 'tier_upgraded',
        entityType: 'user',
        entityId: userId,
        description: `Upgraded from ${currentTier} to ${calculatedTier}`,
        metadata: {
          previousTier: currentTier,
          newTier: calculatedTier,
          stats: userStats,
        },
        severity: 'info',
      });
      
      // Check for tier bonus
      const bonusBenefit = newTier?.benefits?.find(b => b.type === 'bonus_amount');
      if (bonusBenefit && bonusBenefit.numericValue > 0) {
        // Add bonus to available balance
        await User.findByIdAndUpdate(userId, {
          $inc: {
            'referrerProfile.availableBalance': bonusBenefit.numericValue,
            'referrerProfile.totalEarnings': bonusBenefit.numericValue,
          },
        });
      }
      
      return {
        upgraded: true,
        previousTier: currentTier,
        newTier: calculatedTier,
        newTierName: newTier?.name,
        bonus: bonusBenefit?.numericValue || 0,
      };
    }
    
    // Calculate progress to next tier
    const progress = await TierBenefits.getTierProgress(userStats);
    
    // Update tier progress
    await User.findByIdAndUpdate(userId, {
      'referrerProfile.tierProgress': progress.progress,
    });
    
    return {
      upgraded: false,
      currentTier,
      progress: progress.progress,
    };
  }
  
  /**
   * Process network commission when a referral is successful
   * @param {string} referrerId - Referrer who made the successful referral
   * @param {number} amount - Total referral bonus amount
   * @returns {Promise<Object>} Commission breakdown
   */
  async processNetworkCommission(referrerId, amount) {
    // Record earnings in network
    const commissionBreakdown = await ReferralNetwork.recordEarnings(referrerId, amount);
    
    // Update network earnings for all ancestors
    for (const commission of commissionBreakdown) {
      await User.findByIdAndUpdate(commission.ancestorId, {
        $inc: {
          'referrerProfile.networkEarnings': commission.amount,
          'referrerProfile.availableBalance': commission.amount,
        },
      });
    }
    
    return {
      totalDistributed: commissionBreakdown.reduce((sum, c) => sum + c.amount, 0),
      commissions: commissionBreakdown,
    };
  }
  
  /**
   * Get leaderboard of top referrers
   * @param {string} sortBy - Sort field (networkSize, earnings, referrals)
 * @param {number} limit - Number of results
   * @returns {Promise<Array>} Leaderboard entries
   */
  async getLeaderboard(sortBy = 'networkSize', limit = 20) {
    const sortFieldMap = {
      networkSize: 'referrerProfile.networkSize',
      earnings: 'referrerProfile.totalEarnings',
      referrals: 'referrerProfile.successfulHires',
    };
    
    const sortField = sortFieldMap[sortBy] || sortFieldMap.networkSize;
    
    const leaders = await User.find({
      role: 'referrer',
      status: 'active',
      [sortField]: { $gt: 0 },
    })
      .select('name avatar referrerProfile.tierLevel referrerProfile.networkSize referrerProfile.totalEarnings referrerProfile.successfulHires')
      .sort({ [sortField]: -1 })
      .limit(limit);
    
    return leaders.map((user, index) => ({
      rank: index + 1,
      id: user._id,
      name: user.name,
      avatar: user.avatar,
      tierLevel: user.referrerProfile?.tierLevel || 'bronze',
      networkSize: user.referrerProfile?.networkSize || 0,
      totalEarnings: user.referrerProfile?.totalEarnings || 0,
      successfulHires: user.referrerProfile?.successfulHires || 0,
    }));
  }
  
  /**
   * Generate invite link for a referrer
   * @param {string} userId - Referrer's user ID
   * @param {string} baseUrl - Base URL for invite link
   * @returns {Promise<Object>} Invite link information
   */
  async generateInviteLink(userId, baseUrl) {
    const user = await User.findById(userId).select('referrerProfile.inviteCode name');
    
    if (!user || !user.referrerProfile?.inviteCode) {
      throw new Error('User not found or not a referrer');
    }
    
    const inviteCode = user.referrerProfile.inviteCode;
    const inviteUrl = `${baseUrl}/register?ref=${inviteCode}`;
    
    return {
      inviteCode,
      inviteUrl,
      shareLinks: {
        whatsapp: `https://wa.me/?text=${encodeURIComponent(`Join me on TRM Referral and start earning! ${inviteUrl}`)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteUrl)}`,
        telegram: `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent('Join me on TRM Referral and start earning!')}`,
        copy: inviteUrl,
      },
    };
  }
  
  /**
   * Validate an invite code
   * @param {string} inviteCode - Code to validate
   * @returns {Promise<Object>} Validation result with referrer info
   */
  async validateInviteCode(inviteCode) {
    const referrer = await User.findByInviteCode(inviteCode);
    
    if (!referrer) {
      return { valid: false, message: 'Invalid invite code' };
    }
    
    if (referrer.status !== 'active') {
      return { valid: false, message: 'Referrer account is not active' };
    }
    
    return {
      valid: true,
      referrer: {
        id: referrer._id,
        name: referrer.name,
        tierLevel: referrer.referrerProfile?.tierLevel || 'bronze',
      },
    };
  }
  
  /**
   * Get all tiers with their benefits
   * @returns {Promise<Array>} All tiers
   */
  async getAllTiers() {
    return TierBenefits.getAllTiers();
  }
  
  /**
   * Initialize default tier benefits
   * Should be called on application startup
   * @returns {Promise<void>}
   */
  async initializeTiers() {
    await TierBenefits.initializeDefaultTiers();
  }
}

// Export singleton instance
module.exports = new ReferralNetworkService();
