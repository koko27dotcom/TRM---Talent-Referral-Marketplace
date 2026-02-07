/**
 * Input Validation Middleware
 * Comprehensive input validation and sanitization
 * Prevents SQL injection, XSS, NoSQL injection, and other attacks
 */

const { validation } = require('../config/security.js');

/**
 * SQL Injection detection patterns
 */
const SQL_INJECTION_PATTERNS = validation.sqlInjection.patterns;

/**
 * NoSQL Injection prohibited keys
 */
const NOSQL_PROHIBITED_KEYS = validation.nosqlInjection.prohibitedKeys;

/**
 * Common XSS patterns
 */
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /eval\s*\(/gi,
  /expression\s*\(/gi,
];

/**
 * Myanmar phone number patterns
 */
const MYANMAR_PHONE_PATTERNS = validation.phone.patterns.myanmar;

/**
 * Check for SQL injection attempts
 * @param {*} value - Value to check
 * @returns {boolean} True if SQL injection detected
 */
const detectSQLInjection = (value) => {
  if (typeof value !== 'string') return false;

  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(value));
};

/**
 * Check for XSS attempts
 * @param {*} value - Value to check
 * @returns {boolean} True if XSS detected
 */
const detectXSS = (value) => {
  if (typeof value !== 'string') return false;

  return XSS_PATTERNS.some(pattern => pattern.test(value));
};

/**
 * Check for NoSQL injection attempts
 * @param {*} obj - Object to check
 * @returns {boolean} True if NoSQL injection detected
 */
const detectNoSQLInjection = (obj, depth = 0) => {
  if (depth > validation.nosqlInjection.maxQueryDepth) {
    return true;
  }

  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  for (const key of Object.keys(obj)) {
    // Check for prohibited keys
    if (NOSQL_PROHIBITED_KEYS.includes(key)) {
      return true;
    }

    // Check nested objects
    if (typeof obj[key] === 'object') {
      if (detectNoSQLInjection(obj[key], depth + 1)) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Sanitize HTML content
 * @param {string} html - HTML content to sanitize
 * @returns {string} Sanitized content
 */
const sanitizeHTML = (html) => {
  if (typeof html !== 'string') return html;

  // Basic HTML sanitization
  return html
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Validate and sanitize string input
 * @param {string} value - Input value
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
const validateString = (value, options = {}) => {
  const {
    maxLength = validation.maxStringLength,
    minLength = 0,
    required = false,
    sanitize = true,
    allowHTML = false,
  } = options;

  if (value === undefined || value === null) {
    return {
      valid: !required,
      value: null,
      error: required ? 'Field is required' : null,
    };
  }

  let sanitized = String(value).trim();

  // Check length
  if (sanitized.length < minLength) {
    return {
      valid: false,
      value: sanitized,
      error: `Minimum length is ${minLength} characters`,
    };
  }

  if (sanitized.length > maxLength) {
    return {
      valid: false,
      value: sanitized,
      error: `Maximum length is ${maxLength} characters`,
    };
  }

  // Security checks
  if (detectSQLInjection(sanitized)) {
    return {
      valid: false,
      value: sanitized,
      error: 'Invalid characters detected',
      security: 'sql_injection',
    };
  }

  if (!allowHTML && detectXSS(sanitized)) {
    return {
      valid: false,
      value: sanitized,
      error: 'Invalid content detected',
      security: 'xss',
    };
  }

  // Sanitize if needed
  if (sanitize && !allowHTML) {
    sanitized = sanitizeHTML(sanitized);
  }

  return {
    valid: true,
    value: sanitized,
    error: null,
  };
};

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {Object} Validation result
 */
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { valid: false, value: null, error: 'Email is required' };
  }

  const normalized = email.toLowerCase().trim();

  if (normalized.length > validation.email.maxLength) {
    return { valid: false, value: normalized, error: 'Email too long' };
  }

  if (!validation.email.pattern.test(normalized)) {
    return { valid: false, value: normalized, error: 'Invalid email format' };
  }

  return { valid: true, value: normalized, error: null };
};

/**
 * Validate Myanmar phone number
 * @param {string} phone - Phone number to validate
 * @returns {Object} Validation result
 */
const validateMyanmarPhone = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, value: null, error: 'Phone number is required' };
  }

  // Remove spaces and dashes
  let normalized = phone.replace(/[\s\-]/g, '');

  // Check Myanmar patterns
  const isValid = MYANMAR_PHONE_PATTERNS.some(pattern => pattern.test(normalized));

  if (!isValid) {
    return { valid: false, value: normalized, error: 'Invalid Myanmar phone number format' };
  }

  // Convert to E.164 format
  if (normalized.startsWith('09')) {
    normalized = '+95' + normalized.substring(1);
  }

  return { valid: true, value: normalized, error: null };
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @param {Object} userInfo - User info to check against
 * @returns {Object} Validation result
 */
const validatePassword = (password, userInfo = {}) => {
  const config = validation.password;

  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }

  const errors = [];

  // Length checks
  if (password.length < config.minLength) {
    errors.push(`Password must be at least ${config.minLength} characters`);
  }

  if (password.length > config.maxLength) {
    errors.push(`Password must be no more than ${config.maxLength} characters`);
  }

  // Character requirements
  if (config.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (config.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (config.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (config.requireSpecialChars && !new RegExp(`[${config.specialChars.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]`).test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check against user info
  if (config.preventUserInfo) {
    const { email, name, username } = userInfo;
    const lowerPassword = password.toLowerCase();

    if (email && lowerPassword.includes(email.split('@')[0].toLowerCase())) {
      errors.push('Password cannot contain parts of your email');
    }

    if (name && lowerPassword.includes(name.toLowerCase())) {
      errors.push('Password cannot contain your name');
    }

    if (username && lowerPassword.includes(username.toLowerCase())) {
      errors.push('Password cannot contain your username');
    }
  }

  // Check common passwords (simplified)
  if (config.preventCommon) {
    const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
      errors.push('Password is too common');
    }
  }

  return {
    valid: errors.length === 0,
    error: errors.length > 0 ? errors.join('. ') : null,
    strength: calculatePasswordStrength(password),
  };
};

/**
 * Calculate password strength score
 * @param {string} password - Password to evaluate
 * @returns {Object} Strength assessment
 */
const calculatePasswordStrength = (password) => {
  let score = 0;
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numbers: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
    lengthBonus: password.length >= 12,
  };

  score = Object.values(checks).filter(Boolean).length;

  const levels = ['very_weak', 'weak', 'fair', 'good', 'strong', 'very_strong'];
  const level = levels[score] || 'very_weak';

  return { score, level, checks };
};

/**
 * Validate file upload
 * @param {Object} file - File object
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
const validateFileUpload = (file, options = {}) => {
  const {
    allowedTypes = Object.values(validation.fileUpload.allowedTypes).flat(),
    maxSize = validation.fileUpload.maxSize,
  } = options;

  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum of ${Math.round(maxSize / 1024 / 1024)}MB`,
    };
  }

  // Check MIME type
  if (!allowedTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: `File type ${file.mimetype} is not allowed`,
    };
  }

  return { valid: true, error: null };
};

/**
 * Deep validate and sanitize object
 * @param {Object} obj - Object to validate
 * @param {Object} schema - Validation schema
 * @returns {Object} Validation result
 */
const validateObject = (obj, schema) => {
  const errors = {};
  const sanitized = {};

  for (const [key, config] of Object.entries(schema)) {
    const value = obj[key];
    const {
      type = 'string',
      required = false,
      validate: customValidate,
      ...options
    } = config;

    if (value === undefined || value === null) {
      if (required) {
        errors[key] = 'Field is required';
      }
      continue;
    }

    let result;

    switch (type) {
      case 'string':
        result = validateString(value, options);
        break;
      case 'email':
        result = validateEmail(value);
        break;
      case 'phone':
        result = validateMyanmarPhone(value);
        break;
      case 'password':
        result = validatePassword(value, options.userInfo);
        break;
      case 'number':
        result = validateNumber(value, options);
        break;
      case 'array':
        result = validateArray(value, options);
        break;
      case 'object':
        result = validateObject(value, options.schema || {});
        break;
      default:
        result = { valid: true, value };
    }

    if (customValidate) {
      const customResult = customValidate(result.value);
      if (!customResult.valid) {
        result.valid = false;
        result.error = customResult.error;
      }
    }

    if (!result.valid) {
      errors[key] = result.error;
      if (result.security) {
        errors[key] = { message: result.error, security: result.security };
      }
    } else {
      sanitized[key] = result.value;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized,
  };
};

/**
 * Validate number
 * @param {*} value - Value to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
const validateNumber = (value, options = {}) => {
  const { min, max, integer = false } = options;

  let num = Number(value);

  if (isNaN(num)) {
    return { valid: false, error: 'Invalid number' };
  }

  if (integer && !Number.isInteger(num)) {
    return { valid: false, error: 'Must be an integer' };
  }

  if (min !== undefined && num < min) {
    return { valid: false, error: `Must be at least ${min}` };
  }

  if (max !== undefined && num > max) {
    return { valid: false, error: `Must be at most ${max}` };
  }

  return { valid: true, value: num };
};

/**
 * Validate array
 * @param {*} value - Value to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
const validateArray = (value, options = {}) => {
  const { maxLength = validation.maxArrayLength, itemType } = options;

  if (!Array.isArray(value)) {
    return { valid: false, error: 'Must be an array' };
  }

  if (value.length > maxLength) {
    return { valid: false, error: `Array too long (max ${maxLength})` };
  }

  // Validate items if type specified
  if (itemType) {
    const invalidItems = value.filter(item => typeof item !== itemType);
    if (invalidItems.length > 0) {
      return { valid: false, error: `All items must be ${itemType}` };
    }
  }

  return { valid: true, value };
};

/**
 * Request validation middleware factory
 * @param {Object} schema - Validation schema
 * @returns {Function} Express middleware
 */
const validateRequest = (schema) => {
  return (req, res, next) => {
    // Check for NoSQL injection in body
    if (detectNoSQLInjection(req.body)) {
      return res.status(400).json({
        error: {
          code: 'invalid_request',
          message: 'Invalid request format',
        },
      });
    }

    // Validate against schema
    const result = validateObject(req.body, schema);

    if (!result.valid) {
      return res.status(400).json({
        error: {
          code: 'validation_error',
          message: 'Request validation failed',
          details: result.errors,
        },
      });
    }

    // Attach sanitized data
    req.validatedBody = result.sanitized;

    next();
  };
};

/**
 * Query parameter validation middleware
 * @param {Object} schema - Validation schema
 * @returns {Function} Express middleware
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const result = validateObject(req.query, schema);

    if (!result.valid) {
      return res.status(400).json({
        error: {
          code: 'validation_error',
          message: 'Query validation failed',
          details: result.errors,
        },
      });
    }

    req.validatedQuery = result.sanitized;

    next();
  };
};

/**
 * Sanitize request body middleware
 * Removes potentially dangerous content from request body
 * @returns {Function} Express middleware
 */
const sanitizeRequestBody = () => {
  return (req, res, next) => {
    if (!req.body || typeof req.body !== 'object') {
      return next();
    }

    const sanitize = (obj) => {
      if (typeof obj === 'string') {
        return sanitizeHTML(obj);
      }

      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }

      if (typeof obj === 'object' && obj !== null) {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
          // Skip prohibited keys
          if (NOSQL_PROHIBITED_KEYS.includes(key)) {
            continue;
          }
          sanitized[key] = sanitize(value);
        }
        return sanitized;
      }

      return obj;
    };

    req.body = sanitize(req.body);

    next();
  };
};

module.exports = {
  detectSQLInjection,
  detectXSS,
  detectNoSQLInjection,
  sanitizeHTML,
  validateString,
  validateEmail,
  validateMyanmarPhone,
  validatePassword,
  calculatePasswordStrength,
  validateFileUpload,
  validateObject,
  validateNumber,
  validateArray,
  validateRequest,
  validateQuery,
  sanitizeRequestBody,
};
