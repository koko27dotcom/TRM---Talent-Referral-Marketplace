/**
 * NFT Service
 * Handles NFT badge minting, transfers, metadata management (IPFS)
 * Collection management and marketplace integration
 */

const { ethers } = require('ethers');
const NFTBadge = require('../models/NFTBadge');
const SmartContract = require('../models/SmartContract');
const BlockchainTransaction = require('../models/BlockchainTransaction');
const User = require('../models/User');
const blockchainService = require('./blockchainService');
const smartContractService = require('./smartContractService');
const logger = require('../utils/logger');

// IPFS client would be initialized here
// const ipfsClient = create({ url: process.env.IPFS_API_URL });

// NFT Rarity configurations
const RARITY_CONFIG = {
  common: { weight: 50, color: '#9CA3AF', multiplier: 1 },
  rare: { weight: 30, color: '#3B82F6', multiplier: 2 },
  epic: { weight: 15, color: '#8B5CF6', multiplier: 5 },
  legendary: { weight: 5, color: '#F59E0B', multiplier: 10 }
};

// NFT Categories
const NFT_CATEGORIES = {
  achievement: 'Achievement Badges',
  referral: 'Referral Rewards',
  milestone: 'Milestone Markers',
  special: 'Special Editions'
};

// ERC-721 ABI for NFT operations
const ERC721_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function tokenURI(uint256) view returns (string)',
  'function balanceOf(address) view returns (uint256)',
  'function ownerOf(uint256) view returns (address)',
  'function safeMint(address to, string memory uri)',
  'function mint(address to, uint256 tokenId)',
  'function safeTransferFrom(address from, address to, uint256 tokenId)',
  'function transferFrom(address from, address to, uint256 tokenId)',
  'function approve(address to, uint256 tokenId)',
  'function setApprovalForAll(address operator, bool approved)',
  'function isApprovedForAll(address owner, address operator) view returns (bool)',
  'function getApproved(uint256 tokenId) view returns (address)',
  'function burn(uint256 tokenId)',
  'function totalSupply() view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)',
  'event ApprovalForAll(address indexed owner, address indexed operator, bool approved)'
];

class NFTService {
  constructor() {
    this.ipfsGateway = process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs';
    this.contractCache = new Map();
  }

  /**
   * Generate unique badge ID
   */
  generateBadgeId() {
    return `NFT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Generate unique token ID
   */
  generateTokenId() {
    return Math.floor(Math.random() * 1000000000) + Date.now();
  }

  /**
   * Upload metadata to IPFS
   */
  async uploadMetadataToIPFS(metadata) {
    try {
      // In production, this would upload to IPFS
      // const result = await ipfsClient.add(JSON.stringify(metadata));
      // return `${this.ipfsGateway}/${result.path}`;
      
      // For development, return a mock URI
      const mockHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(metadata)));
      return `${this.ipfsGateway}/${mockHash.slice(2, 50)}`;
    } catch (error) {
      logger.error('IPFS upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload image to IPFS
   */
  async uploadImageToIPFS(imageBuffer, filename) {
    try {
      // In production, this would upload to IPFS
      // const result = await ipfsClient.add({ path: filename, content: imageBuffer });
      // return `${this.ipfsGateway}/${result.path}`;
      
      // For development, return a mock URI
      const mockHash = ethers.keccak256(imageBuffer);
      return `${this.ipfsGateway}/${mockHash.slice(2, 50)}`;
    } catch (error) {
      logger.error('Image upload failed:', error);
      throw error;
    }
  }

  /**
   * Create NFT metadata
   */
  createMetadata(badgeData) {
    const {
      name,
      description,
      imageUrl,
      rarity,
      category,
      attributes = []
    } = badgeData;

    return {
      name,
      description,
      image: imageUrl,
      external_url: `${process.env.FRONTEND_URL}/nfts/`,
      attributes: [
        {
          trait_type: 'Rarity',
          value: rarity,
          display_type: 'string'
        },
        {
          trait_type: 'Category',
          value: category,
          display_type: 'string'
        },
        ...attributes
      ],
      properties: {
        rarity: {
          level: rarity,
          color: RARITY_CONFIG[rarity]?.color || '#9CA3AF'
        },
        category,
        created_at: new Date().toISOString()
      }
    };
  }

  /**
   * Mint NFT badge
   */
  async mintBadge(mintData) {
    try {
      const {
        userId,
        ownerAddress,
        name,
        description,
        imageUrl,
        rarity = 'common',
        category = 'achievement',
        transferable = true,
        attributes = [],
        network = 'polygon',
        contractId = null
      } = mintData;

      // Validate rarity and category
      if (!RARITY_CONFIG[rarity]) {
        throw new Error(`Invalid rarity: ${rarity}`);
      }
      if (!NFT_CATEGORIES[category]) {
        throw new Error(`Invalid category: ${category}`);
      }

      const badgeId = this.generateBadgeId();
      const tokenId = this.generateTokenId();

      // Get or create NFT contract
      let contract;
      if (contractId) {
        contract = await SmartContract.findOne({ contractId });
      } else {
        contract = await SmartContract.findOne({ 
          type: 'nft',
          network,
          status: 'active'
        });
      }

      if (!contract) {
        throw new Error('NFT contract not found');
      }

      // Create and upload metadata
      const metadata = this.createMetadata({
        name,
        description,
        imageUrl,
        rarity,
        category,
        attributes
      });

      const metadataUri = await this.uploadMetadataToIPFS(metadata);

      // Load contract instance
      const contractInstance = await smartContractService.loadContract(
        contract.contractId,
        network,
        true
      );

      // Mint NFT
      logger.info(`Minting NFT badge ${badgeId} for ${ownerAddress}...`);
      
      const mintTx = await contractInstance.safeMint(ownerAddress, metadataUri);
      const receipt = await mintTx.wait();

      // Create badge record
      const badge = new NFTBadge({
        badgeId,
        tokenId: tokenId.toString(),
        contractAddress: contract.contractAddress,
        ownerAddress: ownerAddress.toLowerCase(),
        metadataUri,
        name,
        description,
        imageUrl,
        rarity,
        category,
        mintedAt: new Date(),
        mintTxHash: mintTx.hash,
        transferable,
        network,
        attributes
      });

      await badge.save();

      // Record transaction
      await BlockchainTransaction.create({
        txId: `TX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        txHash: mintTx.hash,
        contractId: contract.contractId,
        network,
        fromAddress: await contractInstance.runner.getAddress(),
        toAddress: ownerAddress,
        value: '0',
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: receipt.effectiveGasPrice?.toString(),
        status: 'confirmed',
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        confirmations: 1,
        purpose: 'nft-mint',
        relatedId: badgeId,
        metadata: {
          badgeId,
          tokenId,
          name,
          rarity,
          category
        }
      });

      // Update user's NFT count
      await User.findByIdAndUpdate(userId, {
        $inc: { nftCount: 1 },
        $push: {
          nfts: {
            badgeId,
            tokenId,
            name,
            imageUrl,
            rarity,
            mintedAt: new Date()
          }
        }
      });

      logger.info(`NFT badge ${badgeId} minted successfully`);

      return {
        badgeId,
        tokenId,
        txHash: mintTx.hash,
        metadataUri,
        ownerAddress,
        network
      };
    } catch (error) {
      logger.error('NFT minting failed:', error);
      throw error;
    }
  }

  /**
   * Transfer NFT
   */
  async transferBadge(badgeId, fromAddress, toAddress, options = {}) {
    try {
      const badge = await NFTBadge.findOne({ badgeId });
      
      if (!badge) {
        throw new Error('Badge not found');
      }

      if (!badge.transferable) {
        throw new Error('This badge is non-transferable (soulbound)');
      }

      if (badge.ownerAddress.toLowerCase() !== fromAddress.toLowerCase()) {
        throw new Error('Not the owner of this badge');
      }

      const contract = await SmartContract.findOne({
        contractAddress: badge.contractAddress
      });

      if (!contract) {
        throw new Error('Contract not found');
      }

      // Load contract instance
      const contractInstance = await smartContractService.loadContract(
        contract.contractId,
        badge.network,
        true
      );

      // Execute transfer
      const transferTx = await contractInstance.safeTransferFrom(
        fromAddress,
        toAddress,
        badge.tokenId
      );

      const receipt = await transferTx.wait();

      // Update badge record
      badge.ownerAddress = toAddress.toLowerCase();
      badge.updatedAt = new Date();
      await badge.save();

      // Record transaction
      await BlockchainTransaction.create({
        txId: `TX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        txHash: transferTx.hash,
        contractId: contract.contractId,
        network: badge.network,
        fromAddress,
        toAddress,
        value: '0',
        gasUsed: receipt.gasUsed.toString(),
        status: 'confirmed',
        purpose: 'nft-transfer',
        relatedId: badgeId
      });

      logger.info(`NFT badge ${badgeId} transferred to ${toAddress}`);

      return {
        badgeId,
        fromAddress,
        toAddress,
        txHash: transferTx.hash
      };
    } catch (error) {
      logger.error('NFT transfer failed:', error);
      throw error;
    }
  }

  /**
   * Burn NFT
   */
  async burnBadge(badgeId, ownerAddress) {
    try {
      const badge = await NFTBadge.findOne({ badgeId });
      
      if (!badge) {
        throw new Error('Badge not found');
      }

      if (badge.ownerAddress.toLowerCase() !== ownerAddress.toLowerCase()) {
        throw new Error('Not the owner of this badge');
      }

      const contract = await SmartContract.findOne({
        contractAddress: badge.contractAddress
      });

      // Load contract instance
      const contractInstance = await smartContractService.loadContract(
        contract.contractId,
        badge.network,
        true
      );

      // Execute burn
      const burnTx = await contractInstance.burn(badge.tokenId);
      const receipt = await burnTx.wait();

      // Update badge record
      badge.status = 'burned';
      badge.burnedAt = new Date();
      badge.burnTxHash = burnTx.hash;
      await badge.save();

      logger.info(`NFT badge ${badgeId} burned`);

      return {
        badgeId,
        txHash: burnTx.hash
      };
    } catch (error) {
      logger.error('NFT burn failed:', error);
      throw error;
    }
  }

  /**
   * Get NFT details
   */
  async getBadgeDetails(badgeId) {
    try {
      const badge = await NFTBadge.findOne({ badgeId });
      
      if (!badge) {
        throw new Error('Badge not found');
      }

      // Get on-chain data
      const contract = await SmartContract.findOne({
        contractAddress: badge.contractAddress
      });

      const contractInstance = await smartContractService.loadContract(
        contract.contractId,
        badge.network,
        false
      );

      // Verify ownership on-chain
      let currentOwner;
      try {
        currentOwner = await contractInstance.ownerOf(badge.tokenId);
      } catch (e) {
        currentOwner = null; // Token might be burned
      }

      // Get token URI
      let tokenUri;
      try {
        tokenUri = await contractInstance.tokenURI(badge.tokenId);
      } catch (e) {
        tokenUri = badge.metadataUri;
      }

      return {
        ...badge.toObject(),
        currentOwner,
        tokenUri,
        explorerUrl: blockchainService.getExplorerUrl(
          badge.network,
          badge.contractAddress,
          'address'
        ),
        isOwnerMatch: currentOwner?.toLowerCase() === badge.ownerAddress.toLowerCase()
      };
    } catch (error) {
      logger.error('Failed to get badge details:', error);
      throw error;
    }
  }

  /**
   * Get user's NFTs
   */
  async getUserBadges(ownerAddress, filters = {}) {
    try {
      const query = { ownerAddress: ownerAddress.toLowerCase() };
      
      if (filters.rarity) query.rarity = filters.rarity;
      if (filters.category) query.category = filters.category;
      if (filters.network) query.network = filters.network;
      if (filters.status) query.status = filters.status;

      const badges = await NFTBadge
        .find(query)
        .sort({ mintedAt: -1 })
        .select('-__v');

      // Group by rarity for statistics
      const stats = {
        total: badges.length,
        byRarity: {},
        byCategory: {}
      };

      badges.forEach(badge => {
        stats.byRarity[badge.rarity] = (stats.byRarity[badge.rarity] || 0) + 1;
        stats.byCategory[badge.category] = (stats.byCategory[badge.category] || 0) + 1;
      });

      return {
        badges,
        stats,
        address: ownerAddress
      };
    } catch (error) {
      logger.error('Failed to get user badges:', error);
      throw error;
    }
  }

  /**
   * Get NFT collection statistics
   */
  async getCollectionStats(contractId) {
    try {
      const contract = await SmartContract.findOne({ contractId });
      
      if (!contract) {
        throw new Error('Contract not found');
      }

      const stats = await NFTBadge.aggregate([
        { $match: { contractAddress: contract.contractAddress } },
        {
          $group: {
            _id: null,
            totalMinted: { $sum: 1 },
            byRarity: {
              $push: '$rarity'
            },
            byCategory: {
              $push: '$category'
            },
            uniqueOwners: { $addToSet: '$ownerAddress' }
          }
        },
        {
          $project: {
            totalMinted: 1,
            uniqueOwners: { $size: '$uniqueOwners' }
          }
        }
      ]);

      const rarityDistribution = await NFTBadge.aggregate([
        { $match: { contractAddress: contract.contractAddress } },
        {
          $group: {
            _id: '$rarity',
            count: { $sum: 1 }
          }
        }
      ]);

      const categoryDistribution = await NFTBadge.aggregate([
        { $match: { contractAddress: contract.contractAddress } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        }
      ]);

      return {
        contractId,
        contractAddress: contract.contractAddress,
        totalMinted: stats[0]?.totalMinted || 0,
        uniqueOwners: stats[0]?.uniqueOwners || 0,
        rarityDistribution: rarityDistribution.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        categoryDistribution: categoryDistribution.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      };
    } catch (error) {
      logger.error('Failed to get collection stats:', error);
      throw error;
    }
  }

  /**
   * Award badge to user (for gamification integration)
   */
  async awardBadge(userId, badgeType, metadata = {}) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.walletAddress) {
        throw new Error('User has no connected wallet');
      }

      // Define badge templates
      const badgeTemplates = {
        first_referral: {
          name: 'First Referral',
          description: 'Made your first successful referral',
          rarity: 'common',
          category: 'referral'
        },
        referral_master: {
          name: 'Referral Master',
          description: 'Referred 10+ candidates',
          rarity: 'rare',
          category: 'referral'
        },
        hiring_hero: {
          name: 'Hiring Hero',
          description: 'Successfully hired 5+ candidates',
          rarity: 'epic',
          category: 'achievement'
        },
        top_recruiter: {
          name: 'Top Recruiter',
          description: 'Ranked #1 on the leaderboard',
          rarity: 'legendary',
          category: 'achievement'
        },
        early_adopter: {
          name: 'Early Adopter',
          description: 'Joined during platform launch',
          rarity: 'epic',
          category: 'special'
        },
        community_champion: {
          name: 'Community Champion',
          description: 'Active community contributor',
          rarity: 'rare',
          category: 'special'
        }
      };

      const template = badgeTemplates[badgeType];
      
      if (!template) {
        throw new Error(`Unknown badge type: ${badgeType}`);
      }

      // Check if user already has this badge
      const existingBadge = await NFTBadge.findOne({
        ownerAddress: user.walletAddress.toLowerCase(),
        name: template.name
      });

      if (existingBadge) {
        return {
          success: false,
          message: 'User already has this badge',
          badgeId: existingBadge.badgeId
        };
      }

      // Generate badge image URL (would be generated dynamically)
      const imageUrl = `${process.env.FRONTEND_URL}/assets/badges/${badgeType}.png`;

      // Mint badge
      const result = await this.mintBadge({
        userId,
        ownerAddress: user.walletAddress,
        name: template.name,
        description: template.description,
        imageUrl,
        rarity: template.rarity,
        category: template.category,
        transferable: false, // Achievement badges are soulbound
        attributes: metadata.attributes || []
      });

      return {
        success: true,
        ...result
      };
    } catch (error) {
      logger.error('Failed to award badge:', error);
      throw error;
    }
  }

  /**
   * List all collections
   */
  async listCollections() {
    try {
      const contracts = await SmartContract.find({
        type: 'nft',
        status: 'active'
      }).select('-abi -bytecode');

      const collections = await Promise.all(
        contracts.map(async (contract) => {
          const stats = await this.getCollectionStats(contract.contractId);
          return {
            ...contract.toObject(),
            stats
          };
        })
      );

      return collections;
    } catch (error) {
      logger.error('Failed to list collections:', error);
      throw error;
    }
  }

  /**
   * Verify badge authenticity
   */
  async verifyBadge(badgeId) {
    try {
      const badge = await NFTBadge.findOne({ badgeId });
      
      if (!badge) {
        return {
          valid: false,
          reason: 'Badge not found in database'
        };
      }

      // Get on-chain data
      const contract = await SmartContract.findOne({
        contractAddress: badge.contractAddress
      });

      if (!contract) {
        return {
          valid: false,
          reason: 'Contract not found'
        };
      }

      const contractInstance = await smartContractService.loadContract(
        contract.contractId,
        badge.network,
        false
      );

      // Verify token exists and ownership matches
      try {
        const owner = await contractInstance.ownerOf(badge.tokenId);
        const tokenUri = await contractInstance.tokenURI(badge.tokenId);

        const isValid = owner.toLowerCase() === badge.ownerAddress.toLowerCase();

        return {
          valid: isValid,
          badgeId,
          tokenId: badge.tokenId,
          owner,
          expectedOwner: badge.ownerAddress,
          tokenUri,
          metadataUri: badge.metadataUri,
          contractAddress: badge.contractAddress,
          network: badge.network,
          mintTxHash: badge.mintTxHash,
          explorerUrl: blockchainService.getExplorerUrl(
            badge.network,
            badge.contractAddress,
            'address'
          )
        };
      } catch (e) {
        return {
          valid: false,
          reason: 'Token not found on-chain (may be burned)',
          badgeId
        };
      }
    } catch (error) {
      logger.error('Badge verification failed:', error);
      return {
        valid: false,
        reason: error.message
      };
    }
  }

  /**
   * Get badge leaderboard
   */
  async getLeaderboard(limit = 100) {
    try {
      const leaderboard = await NFTBadge.aggregate([
        {
          $group: {
            _id: '$ownerAddress',
            totalBadges: { $sum: 1 },
            legendaryCount: {
              $sum: { $cond: [{ $eq: ['$rarity', 'legendary'] }, 1, 0] }
            },
            epicCount: {
              $sum: { $cond: [{ $eq: ['$rarity', 'epic'] }, 1, 0] }
            },
            rareCount: {
              $sum: { $cond: [{ $eq: ['$rarity', 'rare'] }, 1, 0] }
            },
            badges: {
              $push: {
                badgeId: '$badgeId',
                name: '$name',
                rarity: '$rarity',
                imageUrl: '$imageUrl'
              }
            }
          }
        },
        {
          $addFields: {
            score: {
              $add: [
                { $multiply: ['$legendaryCount', 100] },
                { $multiply: ['$epicCount', 50] },
                { $multiply: ['$rareCount', 20] },
                '$totalBadges'
              ]
            }
          }
        },
        { $sort: { score: -1 } },
        { $limit: limit }
      ]);

      return leaderboard;
    } catch (error) {
      logger.error('Failed to get badge leaderboard:', error);
      throw error;
    }
  }
}

module.exports = new NFTService();
