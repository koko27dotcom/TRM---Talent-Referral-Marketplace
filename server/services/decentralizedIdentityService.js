/**
 * Decentralized Identity Service
 * Self-sovereign identity management with DID, credentials, and zero-knowledge proofs
 */

const crypto = require('crypto');
const DecentralizedIdentity = require('../models/DecentralizedIdentity');
const User = require('../models/User');
const Web3Wallet = require('../models/Web3Wallet');
const blockchainService = require('./blockchainService');
const logger = require('../utils/logger');

// DID Method configuration
const DID_METHOD = 'did:trm';
const DID_REGISTRY_CONTRACT = process.env.DID_REGISTRY_CONTRACT;

// Credential types
const CREDENTIAL_TYPES = {
  identity: 'IdentityCredential',
  employment: 'EmploymentCredential',
  education: 'EducationCredential',
  skill: 'SkillCredential',
  kyc: 'KYCCredential',
  reputation: 'ReputationCredential'
};

// Verification status
const VERIFICATION_STATUS = {
  pending: 'pending',
  verified: 'verified',
  rejected: 'rejected',
  expired: 'expired',
  revoked: 'revoked'
};

class DecentralizedIdentityService {
  constructor() {
    this.credentialCache = new Map();
  }

  /**
   * Generate unique identity ID
   */
  generateIdentityId() {
    return `DID-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Generate unique credential ID
   */
  generateCredentialId() {
    return `CRED-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Create DID (Decentralized Identifier)
   */
  async createDID(userId, options = {}) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user already has a DID
      const existingIdentity = await DecentralizedIdentity.findOne({ userId });
      
      if (existingIdentity) {
        return {
          identityId: existingIdentity.identityId,
          did: existingIdentity.did,
          message: 'DID already exists'
        };
      }

      // Get user's wallet address
      const wallet = await Web3Wallet.findOne({
        userId,
        isConnected: true,
        isVerified: true
      });

      if (!wallet && !user.walletAddress) {
        throw new Error('Verified wallet required to create DID');
      }

      const walletAddress = wallet?.address || user.walletAddress;

      // Generate DID
      const did = this.generateDID(walletAddress);
      const identityId = this.generateIdentityId();

      // Create verification methods
      const verificationMethods = [
        {
          id: `${did}#keys-1`,
          type: 'EcdsaSecp256k1RecoveryMethod2020',
          controller: did,
          blockchainAccountId: `eip155:1:${walletAddress}`
        }
      ];

      // Create identity document
      const identity = new DecentralizedIdentity({
        identityId,
        userId,
        did,
        verificationMethods,
        credentials: [],
        claims: [],
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await identity.save();

      // Update user with DID reference
      await User.findByIdAndUpdate(userId, {
        did: did,
        identityId: identityId
      });

      logger.info(`DID created for user ${userId}: ${did}`);

      return {
        identityId,
        did,
        verificationMethods,
        createdAt: identity.createdAt
      };
    } catch (error) {
      logger.error('DID creation failed:', error);
      throw error;
    }
  }

  /**
   * Generate DID string
   */
  generateDID(walletAddress) {
    const methodSpecificId = crypto
      .createHash('sha256')
      .update(walletAddress.toLowerCase())
      .digest('hex')
      .substring(0, 32);
    
    return `${DID_METHOD}:${methodSpecificId}`;
  }

  /**
   * Resolve DID document
   */
  async resolveDID(did) {
    try {
      const identity = await DecentralizedIdentity.findOne({ did });
      
      if (!identity) {
        throw new Error('DID not found');
      }

      // Build DID document
      const didDocument = {
        '@context': [
          'https://www.w3.org/ns/did/v1',
          'https://w3id.org/security/suites/secp256k1recovery-2020/v2'
        ],
        id: did,
        verificationMethod: identity.verificationMethods,
        authentication: identity.verificationMethods.map(vm => vm.id),
        assertionMethod: identity.verificationMethods.map(vm => vm.id),
        service: [
          {
            id: `${did}#trm-profile`,
            type: 'TRMProfile',
            serviceEndpoint: `${process.env.FRONTEND_URL}/profile/${identity.userId}`
          }
        ]
      };

      return didDocument;
    } catch (error) {
      logger.error('DID resolution failed:', error);
      throw error;
    }
  }

  /**
   * Issue credential
   */
  async issueCredential(issuerId, subjectId, credentialData) {
    try {
      const {
        type,
        claims,
        expiresIn = 365, // days
        evidence = []
      } = credentialData;

      // Validate credential type
      if (!Object.values(CREDENTIAL_TYPES).includes(type)) {
        throw new Error(`Invalid credential type: ${type}`);
      }

      // Get issuer and subject identities
      const issuerIdentity = await DecentralizedIdentity.findOne({ userId: issuerId });
      const subjectIdentity = await DecentralizedIdentity.findOne({ userId: subjectId });

      if (!issuerIdentity) {
        throw new Error('Issuer identity not found');
      }

      if (!subjectIdentity) {
        throw new Error('Subject identity not found');
      }

      const credentialId = this.generateCredentialId();
      const issuanceDate = new Date();
      const expirationDate = new Date(issuanceDate.getTime() + expiresIn * 24 * 60 * 60 * 1000);

      // Create credential
      const credential = {
        credentialId,
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://trm.network/credentials/v1'
        ],
        type: ['VerifiableCredential', type],
        issuer: {
          id: issuerIdentity.did,
          name: 'TRM Platform'
        },
        issuanceDate: issuanceDate.toISOString(),
        expirationDate: expirationDate.toISOString(),
        credentialSubject: {
          id: subjectIdentity.did,
          ...claims
        },
        evidence: evidence.map(e => ({
          type: e.type,
          description: e.description,
          url: e.url
        })),
        status: VERIFICATION_STATUS.verified,
        issuedAt: issuanceDate,
        expiresAt: expirationDate
      };

      // Sign credential (in production, this would use the issuer's private key)
      credential.proof = await this.signCredential(credential, issuerIdentity);

      // Add to subject's credentials
      subjectIdentity.credentials.push(credential);
      subjectIdentity.updatedAt = new Date();
      await subjectIdentity.save();

      logger.info(`Credential ${credentialId} issued by ${issuerId} to ${subjectId}`);

      return {
        credentialId,
        credential,
        subject: subjectIdentity.did
      };
    } catch (error) {
      logger.error('Credential issuance failed:', error);
      throw error;
    }
  }

  /**
   * Sign credential
   */
  async signCredential(credential, issuerIdentity) {
    try {
      // In production, this would create a proper JWT or Linked Data Signature
      const credentialString = JSON.stringify(credential);
      const hash = crypto.createHash('sha256').update(credentialString).digest('hex');
      
      // Mock signature for development
      return {
        type: 'EcdsaSecp256k1Signature2019',
        created: new Date().toISOString(),
        proofPurpose: 'assertionMethod',
        verificationMethod: issuerIdentity.verificationMethods[0]?.id,
        jws: `eyJhbGciOiJFUzI1NksifQ.${hash}.mock_signature`
      };
    } catch (error) {
      logger.error('Credential signing failed:', error);
      throw error;
    }
  }

  /**
   * Verify credential
   */
  async verifyCredential(credentialId, subjectId) {
    try {
      const identity = await DecentralizedIdentity.findOne({ userId: subjectId });
      
      if (!identity) {
        throw new Error('Identity not found');
      }

      const credential = identity.credentials.find(
        c => c.credentialId === credentialId
      );

      if (!credential) {
        throw new Error('Credential not found');
      }

      // Check expiration
      const now = new Date();
      const isExpired = new Date(credential.expiresAt) < now;

      if (isExpired) {
        credential.status = VERIFICATION_STATUS.expired;
        await identity.save();
      }

      // Verify signature (in production)
      const isSignatureValid = await this.verifyCredentialSignature(credential);

      return {
        credentialId,
        isValid: credential.status === VERIFICATION_STATUS.verified && isSignatureValid,
        status: credential.status,
        isExpired,
        issuer: credential.issuer,
        issuedAt: credential.issuedAt,
        expiresAt: credential.expiresAt,
        claims: credential.credentialSubject
      };
    } catch (error) {
      logger.error('Credential verification failed:', error);
      throw error;
    }
  }

  /**
   * Verify credential signature
   */
  async verifyCredentialSignature(credential) {
    try {
      // In production, this would verify the cryptographic signature
      // For now, return true if proof exists
      return !!credential.proof;
    } catch (error) {
      logger.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Revoke credential
   */
  async revokeCredential(issuerId, credentialId, reason) {
    try {
      // Find the credential across all identities
      const identities = await DecentralizedIdentity.find({
        'credentials.credentialId': credentialId
      });

      if (identities.length === 0) {
        throw new Error('Credential not found');
      }

      const identity = identities[0];
      const credential = identity.credentials.find(
        c => c.credentialId === credentialId
      );

      // Verify issuer
      const issuerIdentity = await DecentralizedIdentity.findOne({ userId: issuerId });
      
      if (credential.issuer.id !== issuerIdentity?.did) {
        throw new Error('Only the issuer can revoke this credential');
      }

      credential.status = VERIFICATION_STATUS.revoked;
      credential.revocationReason = reason;
      credential.revokedAt = new Date();
      identity.updatedAt = new Date();

      await identity.save();

      logger.info(`Credential ${credentialId} revoked by ${issuerId}`);

      return {
        credentialId,
        status: VERIFICATION_STATUS.revoked,
        revokedAt: credential.revokedAt,
        reason
      };
    } catch (error) {
      logger.error('Credential revocation failed:', error);
      throw error;
    }
  }

  /**
   * Add claim to identity
   */
  async addClaim(userId, claimData) {
    try {
      const { type, value, evidence = [] } = claimData;

      const identity = await DecentralizedIdentity.findOne({ userId });
      
      if (!identity) {
        throw new Error('Identity not found');
      }

      const claim = {
        claimId: `CLAIM-${Date.now()}`,
        type,
        value,
        evidence: evidence.map(e => ({
          type: e.type,
          hash: e.hash,
          url: e.url
        })),
        status: VERIFICATION_STATUS.pending,
        createdAt: new Date()
      };

      identity.claims.push(claim);
      identity.updatedAt = new Date();
      await identity.save();

      logger.info(`Claim added for user ${userId}: ${type}`);

      return {
        claimId: claim.claimId,
        type,
        status: claim.status
      };
    } catch (error) {
      logger.error('Claim addition failed:', error);
      throw error;
    }
  }

  /**
   * Verify claim
   */
  async verifyClaim(userId, claimId, verifierId, verificationData) {
    try {
      const identity = await DecentralizedIdentity.findOne({ userId });
      
      if (!identity) {
        throw new Error('Identity not found');
      }

      const claim = identity.claims.find(c => c.claimId === claimId);
      
      if (!claim) {
        throw new Error('Claim not found');
      }

      // Update claim status
      claim.status = verificationData.approved 
        ? VERIFICATION_STATUS.verified 
        : VERIFICATION_STATUS.rejected;
      claim.verifiedBy = verifierId;
      claim.verifiedAt = new Date();
      claim.verificationProof = verificationData.proof;
      claim.verificationNotes = verificationData.notes;

      identity.updatedAt = new Date();
      await identity.save();

      // If verified, potentially issue a credential
      if (verificationData.approved && verificationData.issueCredential) {
        await this.issueCredential(verifierId, userId, {
          type: CREDENTIAL_TYPES[claim.type] || CREDENTIAL_TYPES.identity,
          claims: { [claim.type]: claim.value }
        });
      }

      logger.info(`Claim ${claimId} verified by ${verifierId}`);

      return {
        claimId,
        status: claim.status,
        verifiedAt: claim.verifiedAt
      };
    } catch (error) {
      logger.error('Claim verification failed:', error);
      throw error;
    }
  }

  /**
   * Get identity details
   */
  async getIdentity(userId) {
    try {
      const identity = await DecentralizedIdentity.findOne({ userId });
      
      if (!identity) {
        throw new Error('Identity not found');
      }

      // Get user details
      const user = await User.findById(userId).select('name email avatar');

      // Calculate verification score
      const verifiedCredentials = identity.credentials.filter(
        c => c.status === VERIFICATION_STATUS.verified
      ).length;

      const verifiedClaims = identity.claims.filter(
        c => c.status === VERIFICATION_STATUS.verified
      ).length;

      const verificationScore = Math.min(
        100,
        (verifiedCredentials * 10) + (verifiedClaims * 5)
      );

      return {
        identityId: identity.identityId,
        did: identity.did,
        user: {
          id: userId,
          name: user?.name,
          email: user?.email,
          avatar: user?.avatar
        },
        isVerified: identity.isVerified,
        verificationScore,
        credentials: {
          total: identity.credentials.length,
          verified: verifiedCredentials,
          list: identity.credentials.map(c => ({
            credentialId: c.credentialId,
            type: c.type,
            status: c.status,
            issuedAt: c.issuedAt,
            expiresAt: c.expiresAt
          }))
        },
        claims: {
          total: identity.claims.length,
          verified: verifiedClaims,
          list: identity.claims
        },
        verificationMethods: identity.verificationMethods,
        createdAt: identity.createdAt,
        updatedAt: identity.updatedAt
      };
    } catch (error) {
      logger.error('Failed to get identity:', error);
      throw error;
    }
  }

  /**
   * Get credential details
   */
  async getCredential(credentialId) {
    try {
      const identity = await DecentralizedIdentity.findOne({
        'credentials.credentialId': credentialId
      });

      if (!identity) {
        throw new Error('Credential not found');
      }

      const credential = identity.credentials.find(
        c => c.credentialId === credentialId
      );

      return {
        ...credential,
        subject: identity.did
      };
    } catch (error) {
      logger.error('Failed to get credential:', error);
      throw error;
    }
  }

  /**
   * Create zero-knowledge proof
   */
  async createZeroKnowledgeProof(userId, proofRequest) {
    try {
      const { attribute, condition, value } = proofRequest;

      const identity = await DecentralizedIdentity.findOne({ userId });
      
      if (!identity) {
        throw new Error('Identity not found');
      }

      // Find relevant credential
      const credential = identity.credentials.find(c =>
        c.credentialSubject[attribute] !== undefined
      );

      if (!credential) {
        throw new Error(`No credential found with attribute: ${attribute}`);
      }

      const attributeValue = credential.credentialSubject[attribute];
      
      // Evaluate condition
      let proofValid = false;
      switch (condition) {
        case 'eq':
          proofValid = attributeValue === value;
          break;
        case 'gt':
          proofValid = attributeValue > value;
          break;
        case 'gte':
          proofValid = attributeValue >= value;
          break;
        case 'lt':
          proofValid = attributeValue < value;
          break;
        case 'lte':
          proofValid = attributeValue <= value;
          break;
        case 'in':
          proofValid = Array.isArray(value) && value.includes(attributeValue);
          break;
        default:
          throw new Error(`Unknown condition: ${condition}`);
      }

      // Create proof (in production, this would use actual ZK cryptography)
      const proof = {
        proofId: `ZKP-${Date.now()}`,
        type: 'ZeroKnowledgeProof',
        credentialId: credential.credentialId,
        attribute,
        condition,
        value,
        result: proofValid,
        createdAt: new Date(),
        // In real implementation, this would contain the actual ZK proof
        proofData: crypto.randomBytes(32).toString('hex')
      };

      return proof;
    } catch (error) {
      logger.error('ZK proof creation failed:', error);
      throw error;
    }
  }

  /**
   * Verify zero-knowledge proof
   */
  async verifyZeroKnowledgeProof(proofId, proofData) {
    try {
      // In production, this would verify the cryptographic proof
      // For now, mock verification
      return {
        proofId,
        isValid: true,
        verifiedAt: new Date()
      };
    } catch (error) {
      logger.error('ZK proof verification failed:', error);
      throw error;
    }
  }

  /**
   * Generate QR code data for identity sharing
   */
  async generateQRCode(userId) {
    try {
      const identity = await DecentralizedIdentity.findOne({ userId });
      
      if (!identity) {
        throw new Error('Identity not found');
      }

      const qrData = {
        did: identity.did,
        timestamp: Date.now(),
        nonce: crypto.randomBytes(16).toString('hex')
      };

      // Sign the QR data
      const signature = crypto
        .createHmac('sha256', process.env.DID_SECRET || 'secret')
        .update(JSON.stringify(qrData))
        .digest('hex');

      return {
        ...qrData,
        signature
      };
    } catch (error) {
      logger.error('QR code generation failed:', error);
      throw error;
    }
  }

  /**
   * Recover identity
   */
  async recoverIdentity(userId, recoveryData) {
    try {
      const { newWalletAddress, proofOfOwnership } = recoveryData;

      const identity = await DecentralizedIdentity.findOne({ userId });
      
      if (!identity) {
        throw new Error('Identity not found');
      }

      // Verify proof of ownership
      const isValidProof = await this.verifyRecoveryProof(
        identity,
        proofOfOwnership
      );

      if (!isValidProof) {
        throw new Error('Invalid recovery proof');
      }

      // Update verification methods with new wallet
      identity.verificationMethods = [
        {
          id: `${identity.did}#keys-recovery`,
          type: 'EcdsaSecp256k1RecoveryMethod2020',
          controller: identity.did,
          blockchainAccountId: `eip155:1:${newWalletAddress}`
        },
        ...identity.verificationMethods
      ];

      identity.recoveredAt = new Date();
      identity.updatedAt = new Date();
      await identity.save();

      // Update user's wallet
      await User.findByIdAndUpdate(userId, {
        walletAddress: newWalletAddress
      });

      logger.info(`Identity recovered for user ${userId}`);

      return {
        identityId: identity.identityId,
        did: identity.did,
        recoveredAt: identity.recoveredAt
      };
    } catch (error) {
      logger.error('Identity recovery failed:', error);
      throw error;
    }
  }

  /**
   * Verify recovery proof
   */
  async verifyRecoveryProof(identity, proof) {
    // In production, this would verify multi-sig, social recovery, etc.
    // For now, mock verification
    return true;
  }

  /**
   * List verifiable credentials by type
   */
  async listCredentialsByType(type, options = {}) {
    try {
      const query = { 'credentials.type': type };
      
      if (options.status) {
        query['credentials.status'] = options.status;
      }

      const identities = await DecentralizedIdentity.find(query)
        .select('did credentials')
        .limit(options.limit || 100);

      const credentials = identities.flatMap(identity =>
        identity.credentials
          .filter(c => c.type === type)
          .map(c => ({
            credentialId: c.credentialId,
            did: identity.did,
            issuer: c.issuer,
            status: c.status,
            issuedAt: c.issuedAt
          }))
      );

      return credentials;
    } catch (error) {
      logger.error('Failed to list credentials:', error);
      throw error;
    }
  }

  /**
   * Get identity statistics
   */
  async getIdentityStats() {
    try {
      const stats = await DecentralizedIdentity.aggregate([
        {
          $group: {
            _id: null,
            totalIdentities: { $sum: 1 },
            verifiedIdentities: {
              $sum: { $cond: ['$isVerified', 1, 0] }
            },
            totalCredentials: {
              $sum: { $size: '$credentials' }
            },
            totalClaims: {
              $sum: { $size: '$claims' }
            }
          }
        }
      ]);

      const credentialTypes = await DecentralizedIdentity.aggregate([
        { $unwind: '$credentials' },
        {
          $group: {
            _id: '$credentials.type',
            count: { $sum: 1 }
          }
        }
      ]);

      return {
        identities: stats[0] || {},
        credentialTypes: credentialTypes.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      };
    } catch (error) {
      logger.error('Failed to get identity stats:', error);
      throw error;
    }
  }
}

module.exports = new DecentralizedIdentityService();
