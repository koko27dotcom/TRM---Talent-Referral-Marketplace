/**
 * Utility Helpers
 * Common utility functions used across the application
 */

/**
 * Generate a random string
 * @param {number} length - Length of the string
 * @param {string} chars - Characters to use
 * @returns {string}
 */
const generateRandomString = (length = 10, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') => {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Generate a unique code with prefix
 * @param {string} prefix - Code prefix
 * @param {number} length - Length of random part
 * @returns {string}
 */
const generateCode = (prefix, length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return `${prefix}-${generateRandomString(length, chars)}`;
};

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @returns {string}
 */
const formatCurrency = (amount, currency = 'MMK') => {
  return `${amount.toLocaleString()} ${currency}`;
};

/**
 * Format date to local string
 * @param {Date|string} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string}
 */
const formatDate = (date, options = {}) => {
  const d = new Date(date);
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };
  return d.toLocaleDateString('en-US', defaultOptions);
};

/**
 * Format date time to local string
 * @param {Date|string} date - Date to format
 * @returns {string}
 */
const formatDateTime = (date) => {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Calculate time difference in human readable format
 * @param {Date|string} date - Date to compare
 * @returns {string}
 */
const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' years ago';
  
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' months ago';
  
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days ago';
  
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours ago';
  
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' minutes ago';
  
  return 'Just now';
};

/**
 * Sanitize string for safe use
 * @param {string} str - String to sanitize
 * @returns {string}
 */
const sanitizeString = (str) => {
  if (!str) return '';
  return str
    .trim()
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/&/g, '&')
    .replace(/"/g, '"')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Create URL-friendly slug
 * @param {string} text - Text to slugify
 * @returns {string}
 */
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with -
    .replace(/&/g, '-and-')      // Replace & with 'and'
    .replace(/[^\w\-]+/g, '')    // Remove all non-word characters
    .replace(/\-\-+/g, '-');     // Replace multiple - with single -
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

/**
 * Validate Myanmar phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean}
 */
const isValidMyanmarPhone = (phone) => {
  // Myanmar phone numbers: +95 9xxx xxx xxx or 09xxx xxx xxx
  const re = /^(\+95|09)\d{8,10}$/;
  return re.test(phone.replace(/\s/g, ''));
};

/**
 * Mask sensitive data (e.g., phone number, account number)
 * @param {string} data - Data to mask
 * @param {number} visibleStart - Characters to show at start
 * @param {number} visibleEnd - Characters to show at end
 * @returns {string}
 */
const maskSensitiveData = (data, visibleStart = 3, visibleEnd = 3) => {
  if (!data || data.length <= visibleStart + visibleEnd) return data;
  
  const start = data.substring(0, visibleStart);
  const end = data.substring(data.length - visibleEnd);
  const masked = '*'.repeat(data.length - visibleStart - visibleEnd);
  
  return `${start}${masked}${end}`;
};

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object}
 */
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Pick specific keys from an object
 * @param {Object} obj - Source object
 * @param {Array} keys - Keys to pick
 * @returns {Object}
 */
const pick = (obj, keys) => {
  return keys.reduce((acc, key) => {
    if (obj.hasOwnProperty(key)) {
      acc[key] = obj[key];
    }
    return acc;
  }, {});
};

/**
 * Omit specific keys from an object
 * @param {Object} obj - Source object
 * @param {Array} keys - Keys to omit
 * @returns {Object}
 */
const omit = (obj, keys) => {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
};

/**
 * Paginate array
 * @param {Array} array - Array to paginate
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Object}
 */
const paginateArray = (array, page = 1, limit = 10) => {
  const start = (page - 1) * limit;
  const end = start + limit;
  
  return {
    data: array.slice(start, end),
    pagination: {
      page,
      limit,
      total: array.length,
      totalPages: Math.ceil(array.length / limit),
    },
  };
};

/**
 * Calculate percentage
 * @param {number} value - Current value
 * @param {number} total - Total value
 * @param {number} decimals - Decimal places
 * @returns {number}
 */
const calculatePercentage = (value, total, decimals = 2) => {
  if (total === 0) return 0;
  return parseFloat(((value / total) * 100).toFixed(decimals));
};

/**
 * Round number to nearest integer or specific decimal places
 * @param {number} num - Number to round
 * @param {number} decimals - Decimal places
 * @returns {number}
 */
const round = (num, decimals = 0) => {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
};

/**
 * Generate a random number between min and max
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number}
 */
const randomNumber = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Delay execution (async)
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise}
 */
const delay = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Retry an async function
 * @param {Function} fn - Function to retry
 * @param {number} retries - Number of retries
 * @param {number} delayMs - Delay between retries
 * @returns {Promise}
 */
const retry = async (fn, retries = 3, delayMs = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await delay(delayMs);
    return retry(fn, retries - 1, delayMs);
  }
};

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function}
 */
const debounce = (func, wait = 300) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Limit in milliseconds
 * @returns {Function}
 */
const throttle = (func, limit = 300) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Group array of objects by key
 * @param {Array} array - Array to group
 * @param {string} key - Key to group by
 * @returns {Object}
 */
const groupBy = (array, key) => {
  return array.reduce((acc, item) => {
    const group = item[key];
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {});
};

/**
 * Sort array of objects by key
 * @param {Array} array - Array to sort
 * @param {string} key - Key to sort by
 * @param {string} order - 'asc' or 'desc'
 * @returns {Array}
 */
const sortBy = (array, key, order = 'asc') => {
  return [...array].sort((a, b) => {
    if (a[key] < b[key]) return order === 'asc' ? -1 : 1;
    if (a[key] > b[key]) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

/**
 * Remove duplicates from array
 * @param {Array} array - Array to deduplicate
 * @param {string} key - Optional key for object arrays
 * @returns {Array}
 */
const unique = (array, key = null) => {
  if (key) {
    const seen = new Set();
    return array.filter(item => {
      const val = item[key];
      if (seen.has(val)) return false;
      seen.add(val);
      return true;
    });
  }
  return [...new Set(array)];
};

/**
 * Chunk array into smaller arrays
 * @param {Array} array - Array to chunk
 * @param {number} size - Chunk size
 * @returns {Array}
 */
const chunk = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

/**
 * Parse JSON safely
 * @param {string} json - JSON string to parse
 * @param {*} defaultValue - Default value if parsing fails
 * @returns {*}
 */
const safeJsonParse = (json, defaultValue = null) => {
  try {
    return JSON.parse(json);
  } catch (e) {
    return defaultValue;
  }
};

/**
 * Stringify JSON safely
 * @param {*} value - Value to stringify
 * @param {string} defaultValue - Default value if stringification fails
 * @returns {string}
 */
const safeJsonStringify = (value, defaultValue = '{}') => {
  try {
    return JSON.stringify(value);
  } catch (e) {
    return defaultValue;
  }
};

/**
 * Convert object to query string
 * @param {Object} params - Object to convert
 * @returns {string}
 */
const toQueryString = (params) => {
  return Object.keys(params)
    .filter(key => params[key] !== undefined && params[key] !== null)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
};

/**
 * Parse query string to object
 * @param {string} queryString - Query string to parse
 * @returns {Object}
 */
const parseQueryString = (queryString) => {
  const params = new URLSearchParams(queryString);
  const result = {};
  for (const [key, value] of params) {
    result[key] = value;
  }
  return result;
};

/**
 * Get file extension from filename
 * @param {string} filename - Filename
 * @returns {string}
 */
const getFileExtension = (filename) => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

/**
 * Generate a secure filename
 * @param {string} originalName - Original filename
 * @returns {string}
 */
const generateSecureFilename = (originalName) => {
  const ext = getFileExtension(originalName);
  const timestamp = Date.now();
  const random = generateRandomString(8);
  return `${timestamp}-${random}.${ext}`;
};

/**
 * Convert bytes to human readable format
 * @param {number} bytes - Bytes to convert
 * @param {number} decimals - Decimal places
 * @returns {string}
 */
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
};

module.exports = {
  generateRandomString,
  generateCode,
  formatCurrency,
  formatDate,
  formatDateTime,
  timeAgo,
  sanitizeString,
  slugify,
  isValidEmail,
  isValidMyanmarPhone,
  maskSensitiveData,
  deepClone,
  pick,
  omit,
  paginateArray,
  calculatePercentage,
  round,
  randomNumber,
  delay,
  retry,
  debounce,
  throttle,
  groupBy,
  sortBy,
  unique,
  chunk,
  safeJsonParse,
  safeJsonStringify,
  toQueryString,
  parseQueryString,
  getFileExtension,
  generateSecureFilename,
  formatBytes,
};
