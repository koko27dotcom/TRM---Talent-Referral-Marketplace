/**
 * Authentication Middleware
 * JWT-based authentication with access and refresh tokens
 * Includes token verification, user loading, and security checks
 */

const jwt = require('jsonwebtoken');
const { User } = require('../models/index.js');

// Re-export requireRole from rbac.js for backward compatibility
const { requireRole } = require('./rbac.js');
module.exports.requireRole = requireRole;

// Token configuration
const JWT_CONFIG = {
  accessTokenSecret: process.env.JWT_ACCESS_SECRET || 'your-access-secret-key-change-in-production',
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production',
  accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
};

/**
 * Generate JWT access token
 * @param {Object} payload - Token payload
 * @returns {string} JWT token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, JWT_CONFIG.accessTokenSecret, {
    expiresIn: JWT_CONFIG.accessTokenExpiry,
  });
};

/**
 * Generate JWT refresh token
 * @param {Object} payload - Token payload
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_CONFIG.refreshTokenSecret, {
    expiresIn: JWT_CONFIG.refreshTokenExpiry,
  });
};

/**
 * Generate both access and refresh tokens
 * @param {Object} user - User object
 * @returns {Object} Object containing accessToken and refreshToken
 */
const generateTokens = (user) => {
  const payload = {
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
    name: user.name,
  };
  
  // Add companyId for corporate users
  if (user.companyId) {
    payload.companyId = user.companyId.toString();
  }
  
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken({ sub: user._id.toString() });
  
  return {
    accessToken,
    refreshToken,
    expiresIn: 900, // 15 minutes in seconds
  };
};

/**
 * Verify access token
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, JWT_CONFIG.accessTokenSecret);
};

/**
 * Verify refresh token
 * @param {string} token - JWT refresh token
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, JWT_CONFIG.refreshTokenSecret);
};

/**
 * Extract token from request headers
 * @param {Object} req - Express request object
 * @returns {string|null} JWT token or null
 */
const extractTokenFromHeader = (req) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7); // Remove 'Bearer ' prefix
};

/**
 * Extract token from cookies
 * @param {Object} req - Express request object
 * @returns {string|null} JWT token or null
 */
const extractTokenFromCookie = (req) => {
  return req.cookies?.accessToken || null;
};

/**
 * Main authentication middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Extract token from header or cookie
    let token = extractTokenFromHeader(req) || extractTokenFromCookie(req);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a valid token.',
        code: 'NO_TOKEN',
      });
    }
    
    // Verify token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired. Please refresh your token.',
          code: 'TOKEN_EXPIRED',
        });
      }
      
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please authenticate again.',
        code: 'INVALID_TOKEN',
      });
    }
    
    // Load user from database
    const user = await User.findById(decoded.sub).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Please authenticate again.',
        code: 'USER_NOT_FOUND',
      });
    }
    
    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Account is not active. Please contact support.',
        code: 'ACCOUNT_INACTIVE',
      });
    }
    
    // Check if password was changed after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        success: false,
        message: 'Password recently changed. Please log in again.',
        code: 'PASSWORD_CHANGED',
      });
    }
    
    // Attach user and token info to request
    req.user = user;
    req.token = decoded;
    req.userId = user._id.toString();
    
    // Update last login if it's been more than an hour
    if (!user.lastLoginAt || (new Date() - user.lastLoginAt) > 60 * 60 * 1000) {
      user.lastLoginAt = new Date();
      await user.save({ validateBeforeSave: false });
    }
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error. Please try again.',
      code: 'AUTH_ERROR',
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req) || extractTokenFromCookie(req);
    
    if (!token) {
      return next();
    }
    
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.sub).select('-password');
    
    if (user && user.status === 'active') {
      req.user = user;
      req.token = decoded;
      req.userId = user._id.toString();
    }
    
    next();
  } catch (error) {
    // Silently continue without user
    next();
  }
};

/**
 * Refresh token middleware
 * Issues new access token using refresh token
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required.',
        code: 'NO_REFRESH_TOKEN',
      });
    }
    
    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token. Please log in again.',
        code: 'INVALID_REFRESH_TOKEN',
      });
    }
    
    // Load user
    const user = await User.findById(decoded.sub).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found.',
        code: 'USER_NOT_FOUND',
      });
    }
    
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Account is not active.',
        code: 'ACCOUNT_INACTIVE',
      });
    }
    
    // Generate new tokens
    const tokens = generateTokens(user);
    
    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      },
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    next(error);
  }
};

/**
 * Verify email token middleware
 * For email verification flows
 */
const verifyEmailToken = (token) => {
  const secret = process.env.JWT_EMAIL_SECRET || 'email-verification-secret';
  return jwt.verify(token, secret);
};

/**
 * Generate email verification token
 * @param {string} userId - User ID
 * @returns {string} Verification token
 */
const generateEmailVerificationToken = (userId) => {
  const secret = process.env.JWT_EMAIL_SECRET || 'email-verification-secret';
  return jwt.sign({ sub: userId, purpose: 'email_verification' }, secret, {
    expiresIn: '24h',
  });
};

/**
 * Generate password reset token
 * @param {string} userId - User ID
 * @returns {string} Reset token
 */
const generatePasswordResetToken = (userId) => {
  const secret = process.env.JWT_RESET_SECRET || 'password-reset-secret';
  return jwt.sign({ sub: userId, purpose: 'password_reset' }, secret, {
    expiresIn: '1h',
  });
};

/**
 * Verify password reset token
 * @param {string} token - Reset token
 * @returns {Object} Decoded token
 */
const verifyPasswordResetToken = (token) => {
  const secret = process.env.JWT_RESET_SECRET || 'password-reset-secret';
  return jwt.verify(token, secret);
};

// Alias for authenticate - used in some routes
const requireAuth = authenticate;

module.exports = {
  authenticate,
  requireAuth,
  optionalAuth,
  refreshToken,
  generateTokens,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  extractTokenFromHeader,
  extractTokenFromCookie,
  generateEmailVerificationToken,
  verifyEmailToken,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  requireRole,
};
