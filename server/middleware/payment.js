/**
 * Payment Middleware
 * Validation, idempotency, and security middleware for payment operations
 */

const crypto = require('crypto');
const PaymentTransaction = require('../models/PaymentTransaction');
const PaymentMethod = require('../models/PaymentMethod');

// In-memory store for idempotency keys (use Redis in production)
const idempotencyStore = new Map();
const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Validate deposit request
 */
const validateDeposit = (req, res, next) => {
  const { amount, provider, currency } = req.body;
  const errors = [];

  // Validate amount
  if (amount === undefined || amount === null) {
    errors.push('Amount is required');
  } else {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      errors.push('Amount must be a positive number');
    }
    if (numAmount > 100000000) { // 100 million MMK max
      errors.push('Amount exceeds maximum limit');
    }
  }

  // Validate provider
  const validProviders = ['kbzpay', 'wavepay', 'ayapay', 'stripe', 'twoc2p'];
  if (!provider) {
    errors.push('Payment provider is required');
  } else if (!validProviders.includes(provider.toLowerCase())) {
    errors.push(`Invalid provider. Must be one of: ${validProviders.join(', ')}`);
  }

  // Validate currency
  const validCurrencies = ['MMK', 'USD', 'THB', 'SGD'];
  if (currency && !validCurrencies.includes(currency.toUpperCase())) {
    errors.push(`Invalid currency. Must be one of: ${validCurrencies.join(', ')}`);
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }

  // Normalize values
  req.body.amount = parseFloat(amount);
  req.body.provider = provider.toLowerCase();
  if (currency) req.body.currency = currency.toUpperCase();

  next();
};

/**
 * Validate withdrawal request
 */
const validateWithdrawal = async (req, res, next) => {
  const { amount, provider, paymentMethodId, recipientPhone, currency } = req.body;
  const errors = [];

  // Validate amount
  if (amount === undefined || amount === null) {
    errors.push('Amount is required');
  } else {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      errors.push('Amount must be a positive number');
    }
    if (numAmount < 1000) { // Minimum 1000 MMK
      errors.push('Minimum withdrawal amount is 1,000 MMK');
    }
    if (numAmount > 10000000) { // 10 million MMK max per withdrawal
      errors.push('Amount exceeds maximum withdrawal limit');
    }
  }

  // Validate provider
  const validProviders = ['kbzpay', 'wavepay', 'ayapay', 'bank_transfer'];
  if (!provider) {
    errors.push('Payment provider is required');
  } else if (!validProviders.includes(provider.toLowerCase())) {
    errors.push(`Invalid provider. Must be one of: ${validProviders.join(', ')}`);
  }

  // Validate recipient
  if (!paymentMethodId && !recipientPhone) {
    errors.push('Either paymentMethodId or recipientPhone is required');
  }

  // Validate phone number if provided
  if (recipientPhone) {
    const phoneRegex = /^(09|959|\+959)[0-9]{7,9}$/;
    if (!phoneRegex.test(recipientPhone)) {
      errors.push('Invalid Myanmar phone number format');
    }
  }

  // Validate payment method if provided
  if (paymentMethodId) {
    try {
      const method = await PaymentMethod.findOne({
        methodId: paymentMethodId,
        userId: req.user._id,
        isDeleted: false
      });

      if (!method) {
        errors.push('Payment method not found');
      } else if (method.status !== 'verified') {
        errors.push('Payment method is not verified');
      } else {
        // Check if method can be used for withdrawal
        const canUse = method.canUse(parseFloat(amount), 'withdrawal');
        if (!canUse.canUse) {
          errors.push(canUse.reason);
        }
      }
    } catch (error) {
      errors.push('Error validating payment method');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }

  // Normalize values
  req.body.amount = parseFloat(amount);
  req.body.provider = provider.toLowerCase();
  if (currency) req.body.currency = currency.toUpperCase();

  next();
};

/**
 * Idempotency key middleware
 * Prevents duplicate transactions
 */
const idempotencyMiddleware = async (req, res, next) => {
  const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotencyKey;

  if (!idempotencyKey) {
    // Generate one if not provided
    req.body.idempotencyKey = `${req.user._id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return next();
  }

  // Check in-memory store first
  const cached = idempotencyStore.get(idempotencyKey);
  if (cached) {
    if (Date.now() - cached.timestamp > IDEMPOTENCY_TTL) {
      idempotencyStore.delete(idempotencyKey);
    } else {
      return res.status(409).json({
        success: false,
        error: 'Duplicate request',
        message: 'This request has already been processed',
        data: cached.response
      });
    }
  }

  // Check database for existing transaction
  try {
    const existingTransaction = await PaymentTransaction.findOne({ idempotencyKey });
    
    if (existingTransaction) {
      // Store in memory for faster future checks
      idempotencyStore.set(idempotencyKey, {
        timestamp: Date.now(),
        response: { transaction: existingTransaction }
      });

      return res.status(409).json({
        success: false,
        error: 'Duplicate request',
        message: 'A transaction with this idempotency key already exists',
        data: { transaction: existingTransaction }
      });
    }
  } catch (error) {
    console.error('Idempotency check error:', error);
  }

  // Store the response after successful completion
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (body.success) {
      idempotencyStore.set(idempotencyKey, {
        timestamp: Date.now(),
        response: body
      });
    }
    return originalJson(body);
  };

  next();
};

/**
 * Rate limiting for payment operations
 */
const paymentRateLimit = (options = {}) => {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes
  const maxRequests = options.max || 10;

  const requests = new Map();

  return (req, res, next) => {
    const userId = req.user._id.toString();
    const now = Date.now();

    if (!requests.has(userId)) {
      requests.set(userId, []);
    }

    const userRequests = requests.get(userId);
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: `Maximum ${maxRequests} payment requests allowed per ${windowMs / 60000} minutes`,
        retryAfter: Math.ceil((validRequests[0] + windowMs - now) / 1000)
      });
    }

    validRequests.push(now);
    requests.set(userId, validRequests);

    next();
  };
};

/**
 * Fraud detection middleware
 * Basic checks for suspicious activity
 */
const fraudDetection = async (req, res, next) => {
  const userId = req.user._id;
  const { amount, provider } = req.body;

  try {
    // Check for rapid successive transactions
    const recentTransactions = await PaymentTransaction.countDocuments({
      userId,
      createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }, // Last 5 minutes
      status: { $in: ['pending', 'processing', 'initiated'] }
    });

    if (recentTransactions >= 5) {
      return res.status(429).json({
        success: false,
        error: 'Too many pending transactions',
        message: 'Please wait for pending transactions to complete'
      });
    }

    // Check daily volume
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dailyStats = await PaymentTransaction.aggregate([
      {
        $match: {
          userId,
          createdAt: { $gte: today },
          status: { $in: ['completed', 'pending', 'processing'] }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const dailyTotal = dailyStats[0]?.totalAmount || 0;
    const dailyLimit = 50000000; // 50 million MMK daily limit

    if (dailyTotal + parseFloat(amount) > dailyLimit) {
      return res.status(400).json({
        success: false,
        error: 'Daily limit exceeded',
        message: `Daily transaction limit of ${dailyLimit} MMK would be exceeded`
      });
    }

    // Check for suspicious patterns (e.g., round numbers)
    const numAmount = parseFloat(amount);
    if (numAmount > 10000000 && numAmount % 1000000 === 0) {
      // Log for review but don't block
      console.warn(`Suspicious transaction pattern detected: User ${userId}, Amount ${amount}`);
    }

    next();
  } catch (error) {
    console.error('Fraud detection error:', error);
    // Don't block on fraud detection errors
    next();
  }
};

/**
 * Verify webhook signature
 */
const verifyWebhookSignature = (provider) => {
  return (req, res, next) => {
    try {
      const signature = req.headers['x-signature'] || 
                       req.headers['signature'] || 
                       req.query.signature;
      
      const timestamp = req.headers['x-timestamp'] || req.headers['timestamp'];
      
      if (!signature) {
        return res.status(401).json({
          success: false,
          error: 'Missing signature'
        });
      }

      // Verify timestamp is within 5 minutes
      if (timestamp) {
        const requestTime = parseInt(timestamp);
        const now = Date.now();
        if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
          return res.status(401).json({
            success: false,
            error: 'Request timestamp too old'
          });
        }
      }

      // Provider-specific verification is handled in the service
      req.webhookVerified = true;
      next();
    } catch (error) {
      console.error('Webhook verification error:', error);
      return res.status(401).json({
        success: false,
        error: 'Webhook verification failed'
      });
    }
  };
};

/**
 * Sanitize payment data for logging
 */
const sanitizePaymentData = (req, res, next) => {
  const sensitiveFields = ['pin', 'cvv', 'cardNumber', 'password', 'secret', 'apiKey'];
  
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof value === 'object') {
        sanitized[key] = sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  // Store sanitized version for logging
  req.sanitizedBody = sanitize(req.body);
  
  next();
};

/**
 * Validate payment method creation
 */
const validatePaymentMethod = async (req, res, next) => {
  const { type, mobileWallet, bankAccount } = req.body;
  const errors = [];

  const validTypes = ['kbzpay', 'wavepay', 'ayapay', 'bank_transfer', 'stripe_card'];
  
  if (!type) {
    errors.push('Payment method type is required');
  } else if (!validTypes.includes(type.toLowerCase())) {
    errors.push(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
  }

  // Validate mobile wallet
  if (['kbzpay', 'wavepay', 'ayapay'].includes(type?.toLowerCase())) {
    if (!mobileWallet?.phoneNumber) {
      errors.push('Phone number is required for mobile wallet');
    } else {
      const phoneRegex = /^(09|959|\+959)[0-9]{7,9}$/;
      if (!phoneRegex.test(mobileWallet.phoneNumber)) {
        errors.push('Invalid Myanmar phone number format');
      }
    }

    if (!mobileWallet?.accountName) {
      errors.push('Account name is required for mobile wallet');
    }
  }

  // Validate bank account
  if (type?.toLowerCase() === 'bank_transfer') {
    if (!bankAccount?.bankCode) {
      errors.push('Bank code is required');
    }
    if (!bankAccount?.accountNumber) {
      errors.push('Account number is required');
    }
    if (!bankAccount?.accountHolderName) {
      errors.push('Account holder name is required');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

/**
 * Clean up old idempotency keys periodically
 */
const cleanupIdempotencyKeys = () => {
  const now = Date.now();
  for (const [key, value] of idempotencyStore.entries()) {
    if (now - value.timestamp > IDEMPOTENCY_TTL) {
      idempotencyStore.delete(key);
    }
  }
};

// Run cleanup every hour
setInterval(cleanupIdempotencyKeys, 60 * 60 * 1000);

module.exports = {
  validateDeposit,
  validateWithdrawal,
  idempotencyMiddleware,
  paymentRateLimit,
  fraudDetection,
  verifyWebhookSignature,
  sanitizePaymentData,
  validatePaymentMethod
};
