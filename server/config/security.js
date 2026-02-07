/**
 * Security Configuration
 * Centralized security settings for the TRM Referral Platform
 * Includes rate limits, CSP, validation rules, and security policies
 */

const crypto = require('crypto');

// Environment-based configuration
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Rate Limiting Configuration
 * Tiered rate limits for different user types and endpoints
 */
const rateLimitConfig = {
  // User tier definitions
  tiers: {
    anonymous: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30,
      description: 'Unauthenticated users',
    },
    authenticated: {
      windowMs: 60 * 1000,
      maxRequests: 100,
      description: 'Standard authenticated users',
    },
    premium: {
      windowMs: 60 * 1000,
      maxRequests: 300,
      description: 'Premium subscribers',
    },
    admin: {
      windowMs: 60 * 1000,
      maxRequests: 500,
      description: 'Administrators',
    },
    internal: {
      windowMs: 60 * 1000,
      maxRequests: 1000,
      description: 'Internal services',
      skipLimit: true, // Bypass rate limiting
    },
  },

  // Endpoint-specific limits
  endpoints: {
    // Authentication endpoints
    auth: {
      login: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 attempts per 15 min
      register: { windowMs: 60 * 60 * 1000, maxRequests: 3 }, // 3 per hour
      forgotPassword: { windowMs: 60 * 60 * 1000, maxRequests: 3 },
      resetPassword: { windowMs: 60 * 60 * 1000, maxRequests: 5 },
      verifyEmail: { windowMs: 60 * 60 * 1000, maxRequests: 10 },
      refreshToken: { windowMs: 60 * 1000, maxRequests: 10 },
    },
    // API endpoints
    api: {
      default: { windowMs: 60 * 1000, maxRequests: 100 },
      search: { windowMs: 60 * 1000, maxRequests: 30 },
      export: { windowMs: 5 * 60 * 1000, maxRequests: 5 },
      bulk: { windowMs: 5 * 60 * 1000, maxRequests: 10 },
    },
    // Scraping endpoints
    scraping: {
      default: { windowMs: 60 * 1000, maxRequests: 10 },
      cvUpload: { windowMs: 5 * 60 * 1000, maxRequests: 5 },
    },
    // Payment endpoints
    payments: {
      create: { windowMs: 60 * 1000, maxRequests: 5 },
      confirm: { windowMs: 60 * 1000, maxRequests: 10 },
      webhook: { windowMs: 60 * 1000, maxRequests: 100 },
    },
    // Webhook endpoints
    webhooks: {
      default: { windowMs: 60 * 1000, maxRequests: 1000 },
    },
  },

  // Redis configuration for distributed rate limiting
  redis: {
    enabled: !!process.env.REDIS_URL,
    url: process.env.REDIS_URL,
    keyPrefix: 'ratelimit:',
    windowMs: 60 * 1000,
  },

  // Custom headers
  headers: {
    limit: 'X-RateLimit-Limit',
    remaining: 'X-RateLimit-Remaining',
    reset: 'X-RateLimit-Reset',
    retryAfter: 'Retry-After',
    tier: 'X-RateLimit-Tier',
  },

  // Skip conditions
  skip: {
    internalIPs: process.env.RATE_LIMIT_SKIP_IPS?.split(',') || ['127.0.0.1', '::1'],
    apiKeys: process.env.RATE_LIMIT_SKIP_API_KEYS?.split(',') || [],
    userAgents: ['health-check', 'uptime-monitor'],
  },
};

/**
 * Content Security Policy Configuration
 */
const cspConfig = {
  defaultSrc: ["'self'"],
  scriptSrc: [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    'https://js.stripe.com',
    'https://checkout.stripe.com',
    'https://www.google-analytics.com',
    'https://www.googletagmanager.com',
  ],
  styleSrc: [
    "'self'",
    "'unsafe-inline'",
    'https://fonts.googleapis.com',
    'https://checkout.stripe.com',
  ],
  imgSrc: [
    "'self'",
    'data:',
    'blob:',
    'https:',
    'https://*.stripe.com',
    'https://www.google-analytics.com',
  ],
  fontSrc: [
    "'self'",
    'https://fonts.gstatic.com',
    'data:',
  ],
  connectSrc: [
    "'self'",
    'https://api.stripe.com',
    'https://checkout.stripe.com',
    'https://www.google-analytics.com',
    process.env.VITE_API_URL || 'http://localhost:3001',
    process.env.VITE_WS_URL || 'ws://localhost:3001',
  ],
  mediaSrc: ["'self'"],
  objectSrc: ["'none'"],
  frameSrc: [
    "'self'",
    'https://js.stripe.com',
    'https://checkout.stripe.com',
    'https://hooks.stripe.com',
  ],
  frameAncestors: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  upgradeInsecureRequests: isProduction ? [] : null,
};

/**
 * Security Headers Configuration
 */
const securityHeadersConfig = {
  // Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },

  // Content Security Policy
  csp: cspConfig,

  // Frame Options
  frameOptions: 'DENY',

  // Content Type Options
  contentTypeOptions: 'nosniff',

  // XSS Protection
  xssProtection: '1; mode=block',

  // Referrer Policy
  referrerPolicy: 'strict-origin-when-cross-origin',

  // Permissions Policy
  permissionsPolicy: {
    'accelerometer': '()',
    'camera': '()',
    'geolocation': '(self)',
    'gyroscope': '()',
    'magnetometer': '()',
    'microphone': '()',
    'payment': '(self)',
    'usb': '()',
    'vr': '()',
  },

  // Cross-Origin Policies
  crossOriginEmbedderPolicy: 'require-corp',
  crossOriginOpenerPolicy: 'same-origin',
  crossOriginResourcePolicy: 'cross-origin',

  // Remove server fingerprinting
  removePoweredBy: true,
  removeServer: true,
};

/**
 * Input Validation Configuration
 */
const validationConfig = {
  // Request size limits
  maxBodySize: '10mb',
  maxJsonDepth: 10,
  maxArrayLength: 1000,
  maxStringLength: 10000,

  // Email validation
  email: {
    pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    maxLength: 254,
    normalize: true,
    checkDisposable: true,
  },

  // Myanmar phone number validation
  phone: {
    patterns: {
      myanmar: [
        /^09[456789]\d{7,8}$/, // MPT, Ooredoo, Telenor, Mytel
        /^09[12]\d{7,8}$/, // MEC, MPT
        /^\+959[456789]\d{7,8}$/,
        /^\+959[12]\d{7,8}$/,
      ],
    },
    normalize: true,
    format: 'e164',
  },

  // Password policy
  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
    preventCommon: true,
    preventUserInfo: true,
    maxAge: 90, // days
    historyCount: 5,
  },

  // File upload validation
  fileUpload: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: {
      images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      csv: ['text/csv', 'application/vnd.ms-excel'],
    },
    scanContent: true,
    quarantineUnknown: true,
  },

  // SQL Injection prevention
  sqlInjection: {
    enabled: true,
    patterns: [
      /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
      /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
      /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
      /((\%27)|(\'))union/i,
      /exec(\s|\+)+(s|x)p\w+/i,
      /UNION\s+SELECT/i,
      /INSERT\s+INTO/i,
      /DELETE\s+FROM/i,
      /DROP\s+TABLE/i,
    ],
    blockLevel: 'high', // high, medium, low
  },

  // XSS prevention
  xss: {
    enabled: true,
    sanitizeHtml: true,
    allowedTags: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li'],
    allowedAttributes: {
      '*': ['class'],
      'a': ['href', 'title', 'target'],
    },
    stripUnknown: true,
  },

  // NoSQL Injection prevention
  nosqlInjection: {
    enabled: true,
    prohibitedKeys: ['$where', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin', '$regex', '$options'],
    maxQueryDepth: 5,
  },
};

/**
 * Authentication Security Configuration
 */
const authSecurityConfig = {
  // JWT Configuration
  jwt: {
    accessTokenSecret: process.env.JWT_ACCESS_SECRET || crypto.randomBytes(64).toString('hex'),
    refreshTokenSecret: process.env.JWT_REFRESH_SECRET || crypto.randomBytes(64).toString('hex'),
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
    algorithm: 'HS256',
    issuer: 'trm-referral-platform',
    audience: 'trm-api',
  },

  // Bcrypt Configuration
  bcrypt: {
    rounds: isProduction ? 12 : 10,
    pepper: process.env.PASSWORD_PEPPER,
  },

  // Brute Force Protection
  bruteForce: {
    enabled: true,
    maxAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    progressiveDelay: true,
    resetAfter: 24 * 60 * 60 * 1000, // 24 hours
    trackBy: ['ip', 'username', 'device'],
  },

  // Session Configuration
  session: {
    maxConcurrent: 5,
    absoluteTimeout: 24 * 60 * 60 * 1000, // 24 hours
    idleTimeout: 30 * 60 * 1000, // 30 minutes
    rotateTokens: true,
    bindToIp: isProduction,
    bindToDevice: true,
  },

  // Suspicious Login Detection
  suspiciousLogin: {
    enabled: true,
    checkGeoAnomaly: true,
    checkTimeAnomaly: true,
    checkDeviceAnomaly: true,
    checkVelocity: true,
    velocityThreshold: 5, // logins per hour
    newDeviceNotification: true,
    impossibleTravel: true,
    impossibleTravelThreshold: 500, // km/h
  },

  // 2FA/TOTP Configuration
  totp: {
    enabled: true,
    issuer: 'TRM Referral Platform',
    digits: 6,
    step: 30, // seconds
    window: 1, // allowed time drift
    backupCodes: 10,
  },

  // Device Fingerprinting
  deviceFingerprint: {
    enabled: true,
    factors: ['userAgent', 'screenResolution', 'timezone', 'language', 'fonts', 'canvas'],
    trustDuration: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
};

/**
 * API Security Configuration
 */
const apiSecurityConfig = {
  // API Key Configuration
  apiKey: {
    prefix: 'trm_live_',
    testPrefix: 'trm_test_',
    length: 48,
    rotationDays: 90,
    maxKeysPerUser: 5,
    scopes: ['read', 'write', 'admin', 'webhook'],
  },

  // Request Signing
  requestSigning: {
    enabled: true,
    algorithm: 'sha256',
    header: 'X-Signature',
    timestampHeader: 'X-Timestamp',
    maxAge: 300, // 5 minutes
    clockSkew: 60, // 1 minute
  },

  // Webhook Security
  webhook: {
    signatureHeader: 'X-Webhook-Signature',
    timestampHeader: 'X-Webhook-Timestamp',
    secretLength: 32,
    maxRetries: 5,
    retryDelay: 1000,
    timeout: 30000,
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-API-Key',
      'X-Signature',
      'X-Timestamp',
      'X-Request-ID',
    ],
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'X-Request-ID',
      'X-Total-Count',
      'X-Page-Count',
    ],
    maxAge: 86400,
  },

  // IP Whitelist/Blacklist
  ipFilter: {
    whitelist: process.env.IP_WHITELIST?.split(',') || [],
    blacklist: process.env.IP_BLACKLIST?.split(',') || [],
    geoBlock: process.env.GEO_BLOCK_LIST?.split(',') || [],
    geoAllow: process.env.GEO_ALLOW_LIST?.split(',') || [],
  },

  // API Versioning
  versioning: {
    current: 'v1',
    supported: ['v1'],
    deprecated: [],
    sunsetDays: 90,
  },
};

/**
 * Data Protection Configuration
 */
const dataProtectionConfig = {
  // Encryption
  encryption: {
    algorithm: 'aes-256-gcm',
    keyRotationDays: 90,
    fields: [
      'nrcNumber',
      'phoneNumber',
      'bankAccount',
      'taxId',
      'passportNumber',
    ],
  },

  // Data Masking
  masking: {
    enabled: true,
    rules: {
      email: { showFirst: 2, showLast: 2, mask: '***' },
      phone: { showFirst: 3, showLast: 2, mask: '***' },
      nrc: { showFirst: 0, showLast: 4, mask: '****' },
      bankAccount: { showFirst: 0, showLast: 4, mask: '****' },
      creditCard: { showFirst: 0, showLast: 4, mask: '****' },
    },
  },

  // Data Retention
  dataRetention: {
    userActivity: 365, // days
    auditLogs: 2555, // 7 years
    securityLogs: 2555,
    sessionLogs: 90,
    failedAttempts: 365,
    deletedUsers: 30, // grace period before permanent deletion
  },

  // PII Fields
  piiFields: [
    'email',
    'phone',
    'nrcNumber',
    'passportNumber',
    'dateOfBirth',
    'address',
    'bankAccount',
    'taxId',
    'emergencyContact',
  ],
};

/**
 * DDoS Protection Configuration
 */
const ddosConfig = {
  enabled: true,

  // Request size limits
  requestSize: {
    maxBodySize: '10mb',
    maxHeaderSize: 8192, // 8KB
    maxUrlLength: 2048,
  },

  // Connection limits
  connections: {
    maxPerIp: 100,
    maxConcurrent: 50,
    windowMs: 60 * 1000,
  },

  // Slowloris protection
  slowloris: {
    enabled: true,
    timeout: 5000, // 5 seconds
    maxHeaders: 50,
    maxHeaderLength: 8192,
  },

  // Geographic blocking
  geoBlocking: {
    enabled: false,
    blockedCountries: process.env.BLOCKED_COUNTRIES?.split(',') || [],
    allowedCountries: process.env.ALLOWED_COUNTRIES?.split(',') || [],
    defaultAllow: true,
  },

  // Challenge-response
  challenge: {
    enabled: true,
    threshold: 100, // requests per minute
    duration: 5 * 60 * 1000, // 5 minutes
    difficulty: 4, // proof-of-work difficulty
  },

  // Rate limiting for DDoS
  rateLimit: {
    windowMs: 60 * 1000,
    maxRequests: 1000,
    skipSuccessfulRequests: false,
  },
};

/**
 * Monitoring & Alerting Configuration
 */
const monitoringConfig = {
  // Security Event Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json',
    destination: process.env.LOG_DESTINATION || 'console',
    includeStackTrace: isDevelopment,
    sensitiveFields: ['password', 'token', 'secret', 'creditCard', 'cvv'],
  },

  // Alerting
  alerting: {
    enabled: true,
    channels: {
      email: {
        enabled: true,
        recipients: process.env.SECURITY_ALERT_EMAILS?.split(',') || [],
        severity: ['critical', 'high'],
      },
      slack: {
        enabled: !!process.env.SLACK_WEBHOOK_URL,
        webhook: process.env.SLACK_WEBHOOK_URL,
        severity: ['critical', 'high', 'medium'],
      },
      webhook: {
        enabled: !!process.env.SECURITY_WEBHOOK_URL,
        url: process.env.SECURITY_WEBHOOK_URL,
        severity: ['critical'],
      },
    },
    throttle: {
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxAlerts: 10,
    },
  },

  // Anomaly Detection
  anomalyDetection: {
    enabled: true,
    baselineWindow: 7 * 24 * 60 * 60 * 1000, // 7 days
    sensitivity: 2.5, // standard deviations
    minSamples: 100,
    checkInterval: 5 * 60 * 1000, // 5 minutes
  },

  // Failed Login Tracking
  failedLoginTracking: {
    enabled: true,
    alertThreshold: 10,
    blockThreshold: 20,
    windowMs: 15 * 60 * 1000,
  },
};

/**
 * GDPR Compliance Configuration
 */
const gdprConfig = {
  enabled: true,

  // Data Subject Rights
  rights: {
    access: { enabled: true, responseDays: 30 },
    rectification: { enabled: true, responseDays: 30 },
    erasure: { enabled: true, responseDays: 30 },
    restriction: { enabled: true, responseDays: 30 },
    portability: { enabled: true, responseDays: 30 },
    objection: { enabled: true, responseDays: 30 },
  },

  // Consent Management
  consent: {
    required: true,
    granular: true,
    withdrawable: true,
    versioned: true,
    purposes: [
      'marketing',
      'analytics',
      'third_party_sharing',
      'personalization',
    ],
  },

  // Data Processing Records
  processingRecords: {
    enabled: true,
    retention: 2555, // 7 years
  },

  // Breach Notification
  breachNotification: {
    enabled: true,
    supervisoryAuthorityHours: 72,
    dataSubjectHours: 72,
  },
};

/**
 * Export all configurations
 */
module.exports = {
  isProduction,
  isDevelopment,
  rateLimit: rateLimitConfig,
  securityHeaders: securityHeadersConfig,
  validation: validationConfig,
  auth: authSecurityConfig,
  api: apiSecurityConfig,
  dataProtection: dataProtectionConfig,
  ddos: ddosConfig,
  monitoring: monitoringConfig,
  gdpr: gdprConfig,

  // Helper function to get full CSP string
  getCSPString: () => {
    const csp = cspConfig;
    const directives = [];

    for (const [key, value] of Object.entries(csp)) {
      if (value === null) continue;
      const directive = key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
      if (Array.isArray(value)) {
        directives.push(`${directive} ${value.join(' ')}`);
      } else if (value === true) {
        directives.push(directive);
      }
    }

    return directives.join('; ');
  },
};
