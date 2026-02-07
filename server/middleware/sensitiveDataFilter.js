/**
 * Sensitive Data Filter Middleware
 * Filters sensitive data from logs and responses
 * Prevents accidental exposure of PII, credentials, and other sensitive information
 */

const securityService = require('../services/securityService.js');

// Default sensitive fields to filter
const DEFAULT_SENSITIVE_FIELDS = [
  // Authentication
  'password',
  'passwordConfirmation',
  'currentPassword',
  'newPassword',
  'token',
  'refreshToken',
  'accessToken',
  'authToken',
  'apiKey',
  'apiSecret',
  'secret',
  'jwt',
  'sessionId',
  
  // Personal Information
  'ssn',
  'socialSecurityNumber',
  'nationalId',
  'passportNumber',
  'dob',
  'dateOfBirth',
  
  // Financial
  'creditCard',
  'cardNumber',
  'cvv',
  'cvc',
  'bankAccount',
  'accountNumber',
  'routingNumber',
  'iban',
  'swift',
  
  // Contact (optional, depending on requirements)
  'phone',
  'email',
  
  // Internal
  'internalNotes',
  'adminNotes',
];

// Fields to completely remove (not just mask)
const FIELDS_TO_REMOVE = [
  'password',
  'passwordConfirmation',
  'currentPassword',
  'newPassword',
  'cvv',
  'cvc',
];

/**
 * Mask sensitive value
 * @param {string} value - Value to mask
 * @param {Object} options - Masking options
 * @returns {string}
 */
const maskValue = (value, options = {}) => {
  const { maskChar = '*', showFirst = 0, showLast = 4 } = options;
  
  if (!value || typeof value !== 'string') {
    return value;
  }
  
  const str = String(value);
  
  if (str.length <= showFirst + showLast) {
    return maskChar.repeat(str.length);
  }
  
  const first = str.slice(0, showFirst);
  const last = str.slice(-showLast);
  const middle = maskChar.repeat(Math.min(str.length - showFirst - showLast, 10));
  
  return `${first}${middle}${last}`;
};

/**
 * Filter sensitive fields from object
 * @param {Object} obj - Object to filter
 * @param {Array<string>} sensitiveFields - Fields to filter
 * @param {Object} options - Filter options
 * @returns {Object}
 */
const filterSensitiveData = (obj, sensitiveFields = DEFAULT_SENSITIVE_FIELDS, options = {}) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  const { mask = true, remove = false } = options;
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => filterSensitiveData(item, sensitiveFields, options));
  }
  
  // Handle objects
  const filtered = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveFields.some(field => 
      lowerKey === field.toLowerCase() ||
      lowerKey.includes(field.toLowerCase())
    );
    
    if (isSensitive) {
      // Check if field should be removed entirely
      if (remove || FIELDS_TO_REMOVE.some(field => lowerKey.includes(field.toLowerCase()))) {
        filtered[key] = '[REMOVED]';
      } else if (mask) {
        // Mask the value
        if (typeof value === 'string') {
          filtered[key] = maskValue(value);
        } else {
          filtered[key] = '[FILTERED]';
        }
      } else {
        filtered[key] = '[FILTERED]';
      }
    } else if (value && typeof value === 'object') {
      // Recursively filter nested objects
      filtered[key] = filterSensitiveData(value, sensitiveFields, options);
    } else {
      filtered[key] = value;
    }
  }
  
  return filtered;
};

/**
 * Express middleware to filter sensitive data from request body
 * @param {Object} options - Filter options
 * @returns {Function}
 */
const filterRequestBody = (options = {}) => {
  const { fields = DEFAULT_SENSITIVE_FIELDS, logOnly = false } = options;
  
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      // Store original body for processing if needed
      req.originalBody = { ...req.body };
      
      // Filter for logging
      req.filteredBody = filterSensitiveData(req.body, fields, { mask: true });
      
      // Optionally filter the actual request body
      if (!logOnly) {
        // Sanitize input fields
        for (const field of fields) {
          if (req.body[field] && typeof req.body[field] === 'string') {
            req.body[field] = securityService.sanitizeInput(req.body[field]);
          }
        }
      }
    }
    
    next();
  };
};

/**
 * Express middleware to filter sensitive data from response
 * @param {Object} options - Filter options
 * @returns {Function}
 */
const filterResponse = (options = {}) => {
  const { fields = DEFAULT_SENSITIVE_FIELDS } = options;
  
  return (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);
    
    // Override json method
    res.json = (data) => {
      if (data && typeof data === 'object') {
        // Filter sensitive data from response
        const filtered = filterSensitiveData(data, fields, { mask: true });
        return originalJson(filtered);
      }
      
      return originalJson(data);
    };
    
    next();
  };
};

/**
 * Express middleware to filter sensitive data from query parameters
 * @param {Object} options - Filter options
 * @returns {Function}
 */
const filterQueryParams = (options = {}) => {
  const { fields = DEFAULT_SENSITIVE_FIELDS } = options;
  
  return (req, res, next) => {
    if (req.query && typeof req.query === 'object') {
      req.filteredQuery = filterSensitiveData(req.query, fields, { mask: true });
    }
    
    next();
  };
};

/**
 * Express middleware to filter sensitive data from headers
 * @param {Object} options - Filter options
 * @returns {Function}
 */
const filterHeaders = (options = {}) => {
  const { fields = ['authorization', 'cookie', 'x-api-key'] } = options;
  
  return (req, res, next) => {
    if (req.headers && typeof req.headers === 'object') {
      req.filteredHeaders = filterSensitiveData(req.headers, fields, { mask: true });
    }
    
    next();
  };
};

/**
 * Create a sanitized log object
 * @param {Object} req - Express request object
 * @returns {Object}
 */
const createSanitizedLog = (req) => {
  return {
    method: req.method,
    path: req.originalUrl || req.url,
    query: req.filteredQuery || filterSensitiveData(req.query),
    body: req.filteredBody || filterSensitiveData(req.body),
    headers: req.filteredHeaders || filterSensitiveData(req.headers, ['authorization', 'cookie']),
    ip: req.ip,
    userAgent: req.headers?.['user-agent'],
    userId: req.user?._id,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Filter error messages for sensitive data
 * @param {Error} error - Error object
 * @returns {Error}
 */
const filterError = (error) => {
  if (!error || !error.message) {
    return error;
  }
  
  let filteredMessage = error.message;
  
  // Filter out common sensitive patterns
  const sensitivePatterns = [
    /password[=:]\s*\S+/gi,
    /token[=:]\s*\S+/gi,
    /api[_-]?key[=:]\s*\S+/gi,
    /secret[=:]\s*\S+/gi,
  ];
  
  for (const pattern of sensitivePatterns) {
    filteredMessage = filteredMessage.replace(pattern, '[FILTERED]');
  }
  
  // Create new error with filtered message
  const filteredError = new Error(filteredMessage);
  filteredError.stack = error.stack;
  filteredError.statusCode = error.statusCode;
  filteredError.code = error.code;
  
  return filteredError;
};

/**
 * Comprehensive data filtering middleware
 * Combines all filtering middlewares
 * @param {Object} options - Filter options
 * @returns {Function}
 */
const sensitiveDataFilter = (options = {}) => {
  const {
    filterBody = true,
    filterQuery = true,
    filterResponse: filterRes = true,
    filterHeader = true,
    customFields = [],
  } = options;
  
  const fields = [...DEFAULT_SENSITIVE_FIELDS, ...customFields];
  
  return (req, res, next) => {
    // Filter request body
    if (filterBody && req.body) {
      req.filteredBody = filterSensitiveData(req.body, fields);
    }
    
    // Filter query params
    if (filterQuery && req.query) {
      req.filteredQuery = filterSensitiveData(req.query, fields);
    }
    
    // Filter headers
    if (filterHeader && req.headers) {
      req.filteredHeaders = filterSensitiveData(
        req.headers,
        ['authorization', 'cookie', 'x-api-key', ...customFields]
      );
    }
    
    // Filter response
    if (filterRes) {
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        if (data && typeof data === 'object') {
          const filtered = filterSensitiveData(data, fields);
          return originalJson(filtered);
        }
        return originalJson(data);
      };
    }
    
    next();
  };
};

module.exports = {
  filterSensitiveData,
  filterRequestBody,
  filterResponse,
  filterQueryParams,
  filterHeaders,
  createSanitizedLog,
  filterError,
  sensitiveDataFilter,
  DEFAULT_SENSITIVE_FIELDS,
};
