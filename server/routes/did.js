/**
 * DID (Decentralized Identity) Routes
 * Self-sovereign identity management
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const decentralizedIdentityService = require('../services/decentralizedIdentityService');
const logger = require('../utils/logger');

/**
 * @route POST /api/did/create
 * @desc Create a new decentralized identity
 * @access Private
 */
router.post('/create', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const options = req.body;

    const result = await decentralizedIdentityService.createDID(userId, options);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('DID creation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/did/me
 * @desc Get current user's identity
 * @access Private
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const identity = await decentralizedIdentityService.getIdentity(userId);

    res.json({
      success: true,
      data: identity
    });
  } catch (error) {
    logger.error('Failed to get identity:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/did/:id
 * @desc Get DID details by DID string
 * @access Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if it's a DID or user ID
    if (id.startsWith('did:')) {
      const didDocument = await decentralizedIdentityService.resolveDID(id);
      return res.json({
        success: true,
        data: didDocument
      });
    }

    // Otherwise treat as user ID
    const identity = await decentralizedIdentityService.getIdentity(id);

    res.json({
      success: true,
      data: identity
    });
  } catch (error) {
    logger.error('Failed to get DID:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/did/:id/resolve
 * @desc Resolve DID to DID document
 * @access Public
 */
router.get('/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const did = id.startsWith('did:') ? id : `did:trm:${id}`;

    const didDocument = await decentralizedIdentityService.resolveDID(did);

    res.json({
      success: true,
      data: didDocument
    });
  } catch (error) {
    logger.error('DID resolution failed:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/did/credential/issue
 * @desc Issue a verifiable credential
 * @access Private (Admin or authorized issuers)
 */
router.post('/credential/issue', authenticate, async (req, res) => {
  try {
    const issuerId = req.user.id;
    const { subjectId, type, claims, expiresIn, evidence } = req.body;

    if (!subjectId || !type || !claims) {
      return res.status(400).json({
        success: false,
        error: 'subjectId, type, and claims are required'
      });
    }

    const result = await decentralizedIdentityService.issueCredential(
      issuerId,
      subjectId,
      {
        type,
        claims,
        expiresIn,
        evidence
      }
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Credential issuance failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/did/credential/:credentialId
 * @desc Get credential details
 * @access Private
 */
router.get('/credential/:credentialId', authenticate, async (req, res) => {
  try {
    const { credentialId } = req.params;

    const credential = await decentralizedIdentityService.getCredential(credentialId);

    res.json({
      success: true,
      data: credential
    });
  } catch (error) {
    logger.error('Failed to get credential:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/did/credential/:credentialId/verify
 * @desc Verify a credential
 * @access Public
 */
router.post('/credential/:credentialId/verify', async (req, res) => {
  try {
    const { credentialId } = req.params;
    const { subjectId } = req.body;

    if (!subjectId) {
      return res.status(400).json({
        success: false,
        error: 'subjectId is required'
      });
    }

    const result = await decentralizedIdentityService.verifyCredential(
      credentialId,
      subjectId
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Credential verification failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/did/credential/:credentialId/revoke
 * @desc Revoke a credential
 * @access Private (Issuer only)
 */
router.post('/credential/:credentialId/revoke', authenticate, async (req, res) => {
  try {
    const issuerId = req.user.id;
    const { credentialId } = req.params;
    const { reason } = req.body;

    const result = await decentralizedIdentityService.revokeCredential(
      issuerId,
      credentialId,
      reason
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Credential revocation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/did/claim
 * @desc Add a claim to identity
 * @access Private
 */
router.post('/claim', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, value, evidence } = req.body;

    if (!type || !value) {
      return res.status(400).json({
        success: false,
        error: 'Type and value are required'
      });
    }

    const result = await decentralizedIdentityService.addClaim(userId, {
      type,
      value,
      evidence
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Claim addition failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/did/claim/:claimId/verify
 * @desc Verify a claim
 * @access Private (Admin or verifiers)
 */
router.post('/claim/:claimId/verify', authenticate, async (req, res) => {
  try {
    const verifierId = req.user.id;
    const { claimId } = req.params;
    const { userId, approved, proof, notes, issueCredential } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const result = await decentralizedIdentityService.verifyClaim(
      userId,
      claimId,
      verifierId,
      {
        approved,
        proof,
        notes,
        issueCredential
      }
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Claim verification failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/did/zk-proof
 * @desc Create a zero-knowledge proof
 * @access Private
 */
router.post('/zk-proof', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { attribute, condition, value } = req.body;

    if (!attribute || !condition || value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'attribute, condition, and value are required'
      });
    }

    const result = await decentralizedIdentityService.createZeroKnowledgeProof(
      userId,
      { attribute, condition, value }
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('ZK proof creation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/did/zk-proof/verify
 * @desc Verify a zero-knowledge proof
 * @access Public
 */
router.post('/zk-proof/verify', async (req, res) => {
  try {
    const { proofId, proofData } = req.body;

    if (!proofId || !proofData) {
      return res.status(400).json({
        success: false,
        error: 'proofId and proofData are required'
      });
    }

    const result = await decentralizedIdentityService.verifyZeroKnowledgeProof(
      proofId,
      proofData
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('ZK proof verification failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/did/qr-code
 * @desc Generate QR code for identity sharing
 * @access Private
 */
router.get('/qr-code', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const qrData = await decentralizedIdentityService.generateQRCode(userId);

    res.json({
      success: true,
      data: qrData
    });
  } catch (error) {
    logger.error('QR code generation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/did/recover
 * @desc Recover identity with new wallet
 * @access Private
 */
router.post('/recover', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { newWalletAddress, proofOfOwnership } = req.body;

    if (!newWalletAddress || !proofOfOwnership) {
      return res.status(400).json({
        success: false,
        error: 'newWalletAddress and proofOfOwnership are required'
      });
    }

    const result = await decentralizedIdentityService.recoverIdentity(userId, {
      newWalletAddress,
      proofOfOwnership
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Identity recovery failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/did/credentials/type/:type
 * @desc List credentials by type
 * @access Public
 */
router.get('/credentials/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { status, limit } = req.query;

    const credentials = await decentralizedIdentityService.listCredentialsByType(
      type,
      { status, limit: parseInt(limit) || 100 }
    );

    res.json({
      success: true,
      data: credentials
    });
  } catch (error) {
    logger.error('Failed to list credentials:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/did/stats
 * @desc Get identity statistics
 * @access Public
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await decentralizedIdentityService.getIdentityStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Failed to get identity stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
