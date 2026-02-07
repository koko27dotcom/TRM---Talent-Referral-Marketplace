/**
 * Partner Authentication Middleware
 * Validates partner access and attaches partner to request
 */

const Partner = require('../models/Partner.js');

/**
 * Middleware to validate partner authentication
 * Requires user to be authenticated first (use after requireAuth)
 */
const partnerAuth = async (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in to access partner features',
      });
    }

    // Find partner by user ID
    const partner = await Partner.findOne({
      userId: req.user._id,
      status: { $in: ['active', 'pending', 'under_review'] },
    });

    if (!partner) {
      return res.status(403).json({
        error: 'Partner access required',
        message: 'You do not have an active partner account. Please apply to become a partner.',
      });
    }

    // Check if partner is active for write operations
    if (req.method !== 'GET' && partner.status !== 'active') {
      return res.status(403).json({
        error: 'Partner account not active',
        message: `Your partner account is currently ${partner.status}. Please wait for approval.`,
      });
    }

    // Attach partner to request
    req.partner = partner;
    req.partnerId = partner.partnerId;

    next();
  } catch (error) {
    console.error('Partner auth middleware error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      message: 'An error occurred while verifying partner access',
    });
  }
};

/**
 * Middleware to require active partner status
 * Use for routes that require fully approved partner access
 */
const requireActivePartner = async (req, res, next) => {
  try {
    if (!req.partner) {
      return res.status(403).json({
        error: 'Partner access required',
        message: 'Partner information not found',
      });
    }

    if (req.partner.status !== 'active') {
      return res.status(403).json({
        error: 'Active partner status required',
        message: `Your partner account is currently ${req.partner.status}.`,
      });
    }

    next();
  } catch (error) {
    console.error('Require active partner middleware error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      message: 'An error occurred while verifying partner status',
    });
  }
};

/**
 * Middleware to check partner tier
 * @param {string[]} allowedTiers - Array of allowed tier names
 */
const requireTier = (allowedTiers) => {
  return async (req, res, next) => {
    try {
      if (!req.partner) {
        return res.status(403).json({
          error: 'Partner access required',
          message: 'Partner information not found',
        });
      }

      if (!allowedTiers.includes(req.partner.tier)) {
        return res.status(403).json({
          error: 'Insufficient tier',
          message: `This feature requires ${allowedTiers.join(' or ')} tier. Your current tier is ${req.partner.tier}.`,
        });
      }

      next();
    } catch (error) {
      console.error('Require tier middleware error:', error);
      return res.status(500).json({
        error: 'Authentication error',
        message: 'An error occurred while verifying partner tier',
      });
    }
  };
};

/**
 * Middleware to check white-label access
 * Requires Silver tier or higher
 */
const requireWhiteLabelAccess = async (req, res, next) => {
  try {
    if (!req.partner) {
      return res.status(403).json({
        error: 'Partner access required',
        message: 'Partner information not found',
      });
    }

    const eligibleTiers = ['silver', 'gold', 'platinum'];
    
    if (!eligibleTiers.includes(req.partner.tier)) {
      return res.status(403).json({
        error: 'White-label access required',
        message: 'White-label features require Silver tier or higher. Please upgrade your partner tier.',
      });
    }

    next();
  } catch (error) {
    console.error('Require white-label middleware error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      message: 'An error occurred while verifying white-label access',
    });
  }
};

/**
 * Middleware to check API access tier
 */
const requireApiAccess = async (req, res, next) => {
  try {
    if (!req.partner) {
      return res.status(403).json({
        error: 'Partner access required',
        message: 'Partner information not found',
      });
    }

    // All tiers have API access, but with different limits
    // This middleware can be extended for specific API features
    next();
  } catch (error) {
    console.error('Require API access middleware error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      message: 'An error occurred while verifying API access',
    });
  }
};

/**
 * Middleware to validate affiliate code
 * Used for public affiliate link tracking
 */
const validateAffiliateCode = async (req, res, next) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Affiliate code is required',
      });
    }

    const partner = await Partner.findOne({
      affiliateCode: code.toUpperCase(),
      status: 'active',
    });

    if (!partner) {
      return res.status(404).json({
        error: 'Invalid affiliate code',
        message: 'The affiliate code provided is not valid',
      });
    }

    req.affiliatePartner = partner;
    next();
  } catch (error) {
    console.error('Validate affiliate code middleware error:', error);
    return res.status(500).json({
      error: 'Validation error',
      message: 'An error occurred while validating affiliate code',
    });
  }
};

module.exports = partnerAuth;
