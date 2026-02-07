/**
 * Security Headers Middleware
 * Sets comprehensive security headers for enterprise-grade protection
 * Includes HSTS, CSP, X-Frame-Options, and other security headers
 */

/**
 * Default Content Security Policy
 * Restricts resources that can be loaded
 */
const defaultCSP = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'https:'],
  'font-src': ["'self'"],
  'connect-src': ["'self'"],
  'media-src': ["'self'"],
  'object-src': ["'none'"],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
};

/**
 * Build CSP header string from policy object
 * @param {Object} policy - CSP policy object
 * @returns {string}
 */
const buildCSP = (policy) => {
  return Object.entries(policy)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
};

/**
 * Security headers middleware factory
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware
 */
const securityHeaders = (options = {}) => {
  const {
    // HSTS options
    hsts = {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    // CSP options
    csp = defaultCSP,
    // Frame options
    frameOptions = 'DENY',
    // Content type options
    contentTypeOptions = 'nosniff',
    // XSS protection
    xssProtection = '1; mode=block',
    // Referrer policy
    referrerPolicy = 'strict-origin-when-cross-origin',
    // Permissions policy
    permissionsPolicy = {
      'geolocation': '()',
      'microphone': '()',
      'camera': '()',
      'payment': '()',
      'usb': '()',
      'magnetometer': '()',
      'gyroscope': '()',
    },
  } = options;

  return (req, res, next) => {
    // Strict Transport Security (HSTS)
    if (hsts) {
      let hstsValue = `max-age=${hsts.maxAge}`;
      if (hsts.includeSubDomains) {
        hstsValue += '; includeSubDomains';
      }
      if (hsts.preload) {
        hstsValue += '; preload';
      }
      res.setHeader('Strict-Transport-Security', hstsValue);
    }

    // Content Security Policy
    if (csp) {
      const cspValue = typeof csp === 'object' ? buildCSP(csp) : csp;
      res.setHeader('Content-Security-Policy', cspValue);
    }

    // X-Frame-Options
    if (frameOptions) {
      res.setHeader('X-Frame-Options', frameOptions);
    }

    // X-Content-Type-Options
    if (contentTypeOptions) {
      res.setHeader('X-Content-Type-Options', contentTypeOptions);
    }

    // X-XSS-Protection
    if (xssProtection) {
      res.setHeader('X-XSS-Protection', xssProtection);
    }

    // Referrer-Policy
    if (referrerPolicy) {
      res.setHeader('Referrer-Policy', referrerPolicy);
    }

    // Permissions-Policy
    if (permissionsPolicy) {
      const permissionsValue = Object.entries(permissionsPolicy)
        .map(([feature, allowlist]) => `${feature}=${allowlist}`)
        .join(', ');
      res.setHeader('Permissions-Policy', permissionsValue);
    }

    // Additional security headers
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    // Remove headers that leak information
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');

    next();
  };
};

/**
 * API-specific security headers (more permissive for API endpoints)
 */
const apiSecurityHeaders = securityHeaders({
  csp: null, // Disable CSP for API
  frameOptions: null, // Disable frame options for API
});

/**
 * Static file security headers
 */
const staticSecurityHeaders = securityHeaders({
  csp: {
    ...defaultCSP,
    'script-src': ["'self'"],
    'style-src': ["'self'", "'unsafe-inline'"],
  },
});

/**
 * Report-only CSP middleware (for testing CSP before enforcement)
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware
 */
const cspReportOnly = (options = {}) => {
  const { csp = defaultCSP, reportUri = '/api/security/csp-report' } = options;

  return (req, res, next) => {
    const cspValue = typeof csp === 'object' ? buildCSP(csp) : csp;
    const reportValue = `${cspValue}; report-uri ${reportUri}`;
    res.setHeader('Content-Security-Policy-Report-Only', reportValue);
    next();
  };
};

/**
 * CORS preflight security headers
 * @returns {Function} Express middleware
 */
const corsSecurityHeaders = () => {
  return (req, res, next) => {
    // Additional CORS-related security headers
    res.setHeader('Timing-Allow-Origin', '*');
    
    // Prevent caching of sensitive data
    if (req.method === 'GET' && req.path.includes('/api/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    next();
  };
};

module.exports = {
  securityHeaders,
  apiSecurityHeaders,
  staticSecurityHeaders,
  cspReportOnly,
  corsSecurityHeaders,
};
