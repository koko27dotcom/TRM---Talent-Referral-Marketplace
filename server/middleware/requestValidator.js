/**
 * Request Validator Middleware
 * Input validation and sanitization for security
 * Prevents injection attacks and ensures data integrity
 */

const { ValidationError } = require('./errorHandler.js');
const securityService = require('../services/securityService.js');

// Validation patterns
const PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s\-\(\)]{8,20}$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  objectId: /^[0-9a-f]{24}$/i,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  safeString: /^[\w\s\-\.\,\@\+]+$/,
  url: /^https?:\/\/.+/,
};

// Maximum lengths for fields
const MAX_LENGTHS = {
  email: 254,
  name: 100,
  title: 200,
  description: 5000,
  password: 128,
  phone: 20,
  address: 500,
  message: 10000,
};

/**
 * Sanitize string input
 * @param {string} value - Value to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string}
 */
const sanitizeString = (value, options = {}) => {
  if (value === null || value === undefined) {
    return value;
  }
  
  const { trim = true, lowercase = false, uppercase = false, escapeHtml = true } = options;
  
  let sanitized = String(value);
  
  if (trim) {
    sanitized = sanitized.trim();
  }
  
  if (lowercase) {
    sanitized = sanitized.toLowerCase();
  }
  
  if (uppercase) {
    sanitized = sanitized.toUpperCase();
  }
  
  if (escapeHtml) {
    sanitized = sanitized
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#x27;');
  }
  
  return sanitized;
};

/**
 * Validate email
 * @param {string} email - Email to validate
 * @returns {Object}
 */
const validateEmail = (email) => {
  const sanitized = sanitizeString(email, { lowercase: true, trim: true });
  
  if (!sanitized) {
    return { valid: false, error: 'Email is required' };
  }
  
  if (sanitized.length > MAX_LENGTHS.email) {
    return { valid: false, error: 'Email is too long' };
  }
  
  if (!PATTERNS.email.test(sanitized)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  return { valid: true, value: sanitized };
};

/**
 * Validate password
 * @param {string} password - Password to validate
 * @returns {Object}
 */
const validatePassword = (password) => {
  if (!password) {
    return { valid: false, error: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  
  if (password.length > MAX_LENGTHS.password) {
    return { valid: false, error: 'Password is too long' };
  }
  
  // Check complexity
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  
  if (!hasUppercase || !hasLowercase || !hasNumber) {
    return {
      valid: false,
      error: 'Password must contain uppercase, lowercase, and number',
    };
  }
  
  return { valid: true, value: password };
};

/**
 * Validate phone number
 * @param {string} phone - Phone to validate
 * @returns {Object}
 */
const validatePhone = (phone) => {
  const sanitized = sanitizeString(phone, { trim: true });
  
  if (!sanitized) {
    return { valid: false, error: 'Phone number is required' };
  }
  
  if (sanitized.length > MAX_LENGTHS.phone) {
    return { valid: false, error: 'Phone number is too long' };
  }
  
  if (!PATTERNS.phone.test(sanitized)) {
    return { valid: false, error: 'Invalid phone number format' };
  }
  
  return { valid: true, value: sanitized };
};

/**
 * Validate MongoDB ObjectId
 * @param {string} id - ID to validate
 * @returns {Object}
 */
const validateObjectId = (id) => {
  if (!id) {
    return { valid: false, error: 'ID is required' };
  }
  
  if (!PATTERNS.objectId.test(id)) {
    return { valid: false, error: 'Invalid ID format' };
  }
  
  return { valid: true, value: id };
};

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {Object}
 */
const validateURL = (url) => {
  const sanitized = sanitizeString(url, { trim: true });
  
  if (!sanitized) {
    return { valid: false, error: 'URL is required' };
  }
  
  if (!PATTERNS.url.test(sanitized)) {
    return { valid: false, error: 'Invalid URL format' };
  }
  
  // Additional security check - prevent javascript: URLs
  if (sanitized.toLowerCase().startsWith('javascript:')) {
    return { valid: false, error: 'Invalid URL protocol' };
  }
  
  return { valid: true, value: sanitized };
};

/**
 * Validate string length
 * @param {string} value - Value to validate
 * @param {Object} options - Validation options
 * @returns {Object}
 */
const validateLength = (value, options = {}) => {
  const { min = 0, max = Infinity, field = 'Field' } = options;
  
  if (!value && min > 0) {
    return { valid: false, error: `${field} is required` };
  }
  
  const length = String(value).length;
  
  if (length < min) {
    return { valid: false, error: `${field} must be at least ${min} characters` };
  }
  
  if (length > max) {
    return { valid: false, error: `${field} must be at most ${max} characters` };
  }
  
  return { valid: true, value };
};

/**
 * Check for injection attacks
 * @param {Object} data - Data to check
 * @returns {Object}
 */
const checkInjection = (data) => {
  const issues = [];
  
  const checkValue = (value, path) => {
    if (typeof value === 'string') {
      // Check for SQL injection
      if (securityService.detectSQLInjection(value)) {
        issues.push({ path, type: 'sql_injection', value: value.slice(0, 50) });
      }
      
      // Check for XSS
      if (securityService.detectXSS(value)) {
        issues.push({ path, type: 'xss', value: value.slice(0, 50) });
      }
      
      // Check for NoSQL injection
      if (value.includes('$ne') || value.includes('$gt') || value.includes('$where')) {
        issues.push({ path, type: 'nosql_injection', value: value.slice(0, 50) });
      }
    } else if (typeof value === 'object' && value !== null) {
      for (const [key, val] of Object.entries(value)) {
        checkValue(val, path ? `${path}.${key}` : key);
      }
    }
  };
  
  checkValue(data, '');
  
  return {
    safe: issues.length === 0,
    issues,
  };
};

/**
 * Validate request body against schema
 * @param {Object} schema - Validation schema
 * @returns {Function} Express middleware
 */
const validateBody = (schema) => {
  return (req, res, next) => {
    try {
      const errors = [];
      const sanitized = {};
      
      for (const [field, rules] of Object.entries(schema)) {
        const value = req.body[field];
        
        // Check required
        if (rules.required && (value === undefined || value === null || value === '')) {
          errors.push({ field, message: `${field} is required` });
          continue;
        }
        
        // Skip validation if not required and empty
        if (!value && !rules.required) {
          continue;
        }
        
        // Type validation
        if (rules.type && value !== undefined) {
          if (rules.type === 'email') {
            const result = validateEmail(value);
            if (!result.valid) {
              errors.push({ field, message: result.error });
            } else {
              sanitized[field] = result.value;
            }
          } else if (rules.type === 'password') {
            const result = validatePassword(value);
            if (!result.valid) {
              errors.push({ field, message: result.error });
            } else {
              sanitized[field] = result.value;
            }
          } else if (rules.type === 'phone') {
            const result = validatePhone(value);
            if (!result.valid) {
              errors.push({ field, message: result.error });
            } else {
              sanitized[field] = result.value;
            }
          } else if (rules.type === 'url') {
            const result = validateURL(value);
            if (!result.valid) {
              errors.push({ field, message: result.error });
            } else {
              sanitized[field] = result.value;
            }
          } else if (rules.type === 'string') {
            const result = validateLength(value, {
              min: rules.min,
              max: rules.max || MAX_LENGTHS[field] || Infinity,
              field,
            });
            if (!result.valid) {
              errors.push({ field, message: result.error });
            } else {
              sanitized[field] = sanitizeString(value, rules.sanitize);
            }
          } else if (rules.type === 'number') {
            const num = Number(value);
            if (isNaN(num)) {
              errors.push({ field, message: `${field} must be a number` });
            } else if (rules.min !== undefined && num < rules.min) {
              errors.push({ field, message: `${field} must be at least ${rules.min}` });
            } else if (rules.max !== undefined && num > rules.max) {
              errors.push({ field, message: `${field} must be at most ${rules.max}` });
            } else {
              sanitized[field] = num;
            }
          } else if (rules.type === 'boolean') {
            sanitized[field] = Boolean(value);
          } else if (rules.type === 'array') {
            if (!Array.isArray(value)) {
              errors.push({ field, message: `${field} must be an array` });
            } else {
              sanitized[field] = value;
            }
          } else if (rules.type === 'object') {
            if (typeof value !== 'object' || value === null) {
              errors.push({ field, message: `${field} must be an object` });
            } else {
              sanitized[field] = value;
            }
          }
        } else {
          sanitized[field] = value;
        }
        
        // Pattern validation
        if (rules.pattern && value) {
          if (!rules.pattern.test(value)) {
            errors.push({ field, message: rules.patternMessage || `${field} format is invalid` });
          }
        }
        
        // Enum validation
        if (rules.enum && value) {
          if (!rules.enum.includes(value)) {
            errors.push({ field, message: `${field} must be one of: ${rules.enum.join(', ')}` });
          }
        }
      }
      
      // Check for injection attacks
      const injectionCheck = checkInjection(req.body);
      if (!injectionCheck.safe) {
        for (const issue of injectionCheck.issues) {
          errors.push({
            field: issue.path,
            message: `Potential ${issue.type.replace('_', ' ')} detected`,
          });
        }
      }
      
      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }
      
      // Attach sanitized body
      req.validatedBody = sanitized;
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Validate request parameters
 * @param {Object} schema - Validation schema
 * @returns {Function} Express middleware
 */
const validateParams = (schema) => {
  return (req, res, next) => {
    try {
      const errors = [];
      
      for (const [param, rules] of Object.entries(schema)) {
        const value = req.params[param];
        
        if (rules.required && !value) {
          errors.push({ param, message: `${param} is required` });
          continue;
        }
        
        if (value && rules.type === 'objectId') {
          const result = validateObjectId(value);
          if (!result.valid) {
            errors.push({ param, message: result.error });
          }
        }
        
        if (value && rules.type === 'uuid') {
          if (!PATTERNS.uuid.test(value)) {
            errors.push({ param, message: 'Invalid UUID format' });
          }
        }
      }
      
      if (errors.length > 0) {
        throw new ValidationError('Invalid parameters', errors);
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Validate query parameters
 * @param {Object} schema - Validation schema
 * @returns {Function} Express middleware
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      const errors = [];
      const sanitized = {};
      
      for (const [param, rules] of Object.entries(schema)) {
        let value = req.query[param];
        
        // Handle arrays in query
        if (rules.type === 'array' && typeof value === 'string') {
          value = value.split(',');
        }
        
        if (rules.required && (value === undefined || value === null || value === '')) {
          errors.push({ param, message: `${param} is required` });
          continue;
        }
        
        if (!value && !rules.required) {
          continue;
        }
        
        // Type coercion and validation
        if (rules.type === 'number' && value) {
          const num = Number(value);
          if (isNaN(num)) {
            errors.push({ param, message: `${param} must be a number` });
          } else {
            sanitized[param] = num;
          }
        } else if (rules.type === 'boolean' && value) {
          sanitized[param] = value === 'true' || value === '1';
        } else if (rules.type === 'date' && value) {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            errors.push({ param, message: `${param} must be a valid date` });
          } else {
            sanitized[param] = date;
          }
        } else {
          sanitized[param] = value;
        }
        
        // Range validation for numbers
        if (rules.type === 'number' && sanitized[param] !== undefined) {
          if (rules.min !== undefined && sanitized[param] < rules.min) {
            errors.push({ param, message: `${param} must be at least ${rules.min}` });
          }
          if (rules.max !== undefined && sanitized[param] > rules.max) {
            errors.push({ param, message: `${param} must be at most ${rules.max}` });
          }
        }
      }
      
      if (errors.length > 0) {
        throw new ValidationError('Invalid query parameters', errors);
      }
      
      req.validatedQuery = sanitized;
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Sanitize all string inputs in request
 * @returns {Function} Express middleware
 */
const sanitizeRequest = () => {
  return (req, res, next) => {
    // Sanitize body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    
    // Sanitize query
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }
    
    // Sanitize params
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }
    
    next();
  };
};

/**
 * Recursively sanitize object values
 * @param {Object} obj - Object to sanitize
 * @returns {Object}
 */
const sanitizeObject = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(item => 
      typeof item === 'object' && item !== null 
        ? sanitizeObject(item) 
        : sanitizeValue(item)
    );
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = sanitizeValue(value);
    }
  }
  
  return sanitized;
};

/**
 * Sanitize a single value
 * @param {*} value - Value to sanitize
 * @returns {*}
 */
const sanitizeValue = (value) => {
  if (typeof value === 'string') {
    return sanitizeString(value);
  }
  return value;
};

module.exports = {
  sanitizeString,
  validateEmail,
  validatePassword,
  validatePhone,
  validateObjectId,
  validateURL,
  validateLength,
  checkInjection,
  validateBody,
  validateParams,
  validateQuery,
  sanitizeRequest,
  PATTERNS,
  MAX_LENGTHS,
};
