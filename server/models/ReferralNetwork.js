/**
 * ReferralNetwork Model
 * Closure table pattern for tracking multi-level referral relationships
 * Enables efficient querying of entire downline/upline trees
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * ReferralNetwork Schema
 * Stores ancestor-descendant relationships for fast tree traversal
 * Each row represents a path from ancestor to descendant
 */
const ReferralNetworkSchema = new Schema({
  // The ancestor (upline) user
  ancestorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // The descendant (downline) user
  descendantId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // Depth level (0 = self, 1 = direct child, 2 = grandchild, etc.)
  depth: {
    type: Number,
    required: true,
    min: 0,
    index: true,
  },
  
  // Commission percentage earned by ancestor from descendant's activity
  commissionPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  
  // Total earnings from this relationship
  totalEarnings: {
    type: Number,
    default: 0,
    min: 0,
  },
  
  // When the relationship was established
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false, // We only need createdAt
});

// ==================== COMPOUND INDEXES ====================

// Primary lookup indexes
ReferralNetworkSchema.index({ ancestorId: 1, depth: 1 });
ReferralNetworkSchema.index({ descendantId: 1, depth: 1 });
ReferralNetworkSchema.index({ ancestorId: 1, descendantId: 1 }, { unique: true });

// ==================== STATIC METHODS ====================

/**
 * Add a new user to the referral network
 * Creates closure table entries for the new user and all their ancestors
 * @param {string} userId - New user's ID
 * @param {string} parentId - Parent referrer's ID (null for root)
 * @returns {Promise<void>}
 */
ReferralNetworkSchema.statics.addToNetwork = async function(userId, parentId = null) {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      // Add self-reference (depth 0)
      await this.create([{
        ancestorId: userId,
        descendantId: userId,
        depth: 0,
        commissionPercent: 0,
      }], { session });
      
      if (parentId) {
        // Get all ancestors of the parent
        const parentAncestors = await this.find({
          descendantId: parentId,
        }).session(session);
        
        // Create entries for all ancestors
        const newEntries = parentAncestors.map(ancestor => ({
          ancestorId: ancestor.ancestorId,
          descendantId: userId,
          depth: ancestor.depth + 1,
          commissionPercent: calculateCommissionPercent(ancestor.depth + 1),
        }));
        
        if (newEntries.length > 0) {
          await this.insertMany(newEntries, { session });
        }
      }
    });
  } finally {
    await session.endSession();
  }
};

/**
 * Get all descendants (downline) of a user
 * @param {string} userId - User ID
 * @param {number} maxDepth - Maximum depth to traverse (null for all)
 * @returns {Promise<Array>} Array of network entries with user details
 */
ReferralNetworkSchema.statics.getDescendants = async function(userId, maxDepth = null) {
  const query = {
    ancestorId: userId,
    depth: { $gt: 0 }, // Exclude self
  };
  
  if (maxDepth !== null) {
    query.depth.$lte = maxDepth;
  }
  
  return this.find(query)
    .populate('descendantId', 'name email avatar referrerProfile.tierLevel createdAt')
    .sort({ depth: 1, createdAt: -1 });
};

/**
 * Get all ancestors (upline) of a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of network entries with user details
 */
ReferralNetworkSchema.statics.getAncestors = async function(userId) {
  return this.find({
    descendantId: userId,
    depth: { $gt: 0 }, // Exclude self
  })
    .populate('ancestorId', 'name email avatar referrerProfile.tierLevel')
    .sort({ depth: 1 });
};

/**
 * Get direct children (depth 1) of a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of user documents
 */
ReferralNetworkSchema.statics.getDirectChildren = async function(userId) {
  const entries = await this.find({
    ancestorId: userId,
    depth: 1,
  }).populate('descendantId', 'name email avatar referrerProfile.tierLevel referrerProfile.inviteCode referrerProfile.networkSize createdAt');
  
  return entries.map(entry => entry.descendantId);
};

/**
 * Get network statistics for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Network statistics
 */
ReferralNetworkSchema.statics.getNetworkStats = async function(userId) {
  const [directCount, totalCount, totalEarnings] = await Promise.all([
    this.countDocuments({ ancestorId: userId, depth: 1 }),
    this.countDocuments({ ancestorId: userId, depth: { $gt: 0 } }),
    this.aggregate([
      { $match: { ancestorId: new mongoose.Types.ObjectId(userId), depth: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$totalEarnings' } } },
    ]),
  ]);
  
  // Get breakdown by depth
  const depthBreakdown = await this.aggregate([
    { $match: { ancestorId: new mongoose.Types.ObjectId(userId), depth: { $gt: 0 } } },
    { $group: { _id: '$depth', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  
  return {
    directReferrals: directCount,
    totalNetworkSize: totalCount,
    totalEarnings: totalEarnings[0]?.total || 0,
    depthBreakdown: depthBreakdown.reduce((acc, item) => {
      acc[`level${item._id}`] = item.count;
      return acc;
    }, {}),
  };
};

/**
 * Record earnings from a descendant's activity
 * @param {string} descendantId - Descendant who generated the earnings
 * @param {number} amount - Total amount earned
 * @returns {Promise<void>}
 */
ReferralNetworkSchema.statics.recordEarnings = async function(descendantId, amount) {
  // Get all ancestors who should receive commission
  const ancestors = await this.find({
    descendantId,
    depth: { $gt: 0 },
    commissionPercent: { $gt: 0 },
  });
  
  const updates = ancestors.map(ancestor => {
    const commission = amount * (ancestor.commissionPercent / 100);
    return this.updateOne(
      { _id: ancestor._id },
      { $inc: { totalEarnings: commission } }
    );
  });
  
  await Promise.all(updates);
  
  // Return commission breakdown for notification/logging
  return ancestors.map(ancestor => ({
    ancestorId: ancestor.ancestorId,
    commissionPercent: ancestor.commissionPercent,
    amount: amount * (ancestor.commissionPercent / 100),
  }));
};

/**
 * Check if a user is in another user's downline (prevent circular references)
 * @param {string} ancestorId - Potential ancestor
 * @param {string} descendantId - Potential descendant
 * @returns {Promise<boolean>} True if descendant is in ancestor's downline
 */
ReferralNetworkSchema.statics.isInDownline = async function(ancestorId, descendantId) {
  const exists = await this.exists({
    ancestorId,
    descendantId,
    depth: { $gt: 0 },
  });
  return !!exists;
};

/**
 * Get the full network tree for visualization
 * @param {string} userId - Root user ID
 * @param {number} maxDepth - Maximum depth to traverse
 * @returns {Promise<Object>} Tree structure
 */
ReferralNetworkSchema.statics.getNetworkTree = async function(userId, maxDepth = 3) {
  const descendants = await this.getDescendants(userId, maxDepth);
  
  // Build tree structure
  const tree = {
    id: userId,
    children: [],
  };
  
  const nodeMap = new Map();
  nodeMap.set(userId.toString(), tree);
  
  // Group by depth for efficient tree building
  const byDepth = descendants.reduce((acc, entry) => {
    const depth = entry.depth;
    if (!acc[depth]) acc[depth] = [];
    acc[depth].push(entry);
    return acc;
  }, {});
  
  // Build tree level by level
  for (let depth = 1; depth <= maxDepth; depth++) {
    const entries = byDepth[depth] || [];
    
    for (const entry of entries) {
      const node = {
        id: entry.descendantId._id.toString(),
        user: entry.descendantId,
        depth: entry.depth,
        commissionPercent: entry.commissionPercent,
        totalEarnings: entry.totalEarnings,
        children: [],
      };
      
      nodeMap.set(entry.descendantId._id.toString(), node);
      
      // Find parent and add to children
      // Parent is the ancestor at depth - 1
      const parentEntry = descendants.find(d => 
        d.descendantId._id.toString() === entry.descendantId._id.toString() &&
        d.depth === depth - 1
      );
      
      if (parentEntry) {
        const parent = nodeMap.get(parentEntry.ancestorId.toString());
        if (parent) {
          parent.children.push(node);
        }
      }
    }
  }
  
  return tree;
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Calculate commission percentage based on depth
 * Level 1 (direct): 5%, Level 2: 3%, Level 3: 2%, Level 4+: 1%
 * @param {number} depth - Depth level
 * @returns {number} Commission percentage
 */
function calculateCommissionPercent(depth) {
  switch (depth) {
    case 1: return 5;  // Direct referral
    case 2: return 3;  // Level 2
    case 3: return 2;  // Level 3
    default: return 1; // Level 4+
  }
}

// Create and export the model
const ReferralNetwork = mongoose.model('ReferralNetwork', ReferralNetworkSchema);

module.exports = ReferralNetwork;
