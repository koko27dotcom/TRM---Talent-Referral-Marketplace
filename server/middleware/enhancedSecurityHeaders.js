/**
 * Enhanced Security Headers Middleware
 * Comprehensive security headers including CSP, HSTS, and modern security policies
 * Removes server fingerprinting and implements defense-in-depth
 */

const { securityHeaders } = require('../config/security.js');

/**
 * Build Content Security Policy header value
 * @param {Object} policy - CSP policy object
 * @returns {string} CSP header value
 */
const buildCSP = (policy) => {
  const directives = [];

  const directiveMap = {
    defaultSrc: 'default-src',
    scriptSrc: 'script-src',
    styleSrc: 'style-src',
    imgSrc: 'img-src',
    fontSrc: 'font-src',
    connectSrc: 'connect-src',
    mediaSrc: 'media-src',
    objectSrc: 'object-src',
    frameSrc: 'frame-src',
    frameAncestors: 'frame-ancestors',
    baseUri: 'base-uri',
    formAction: 'form-action',
    upgradeInsecureRequests: 'upgrade-insecure-requests',
  };

  for (const [key, value] of Object.entries(policy)) {
    if (value === null || value === undefined) continue;

    const directive = directiveMap[key] || key;

    if (Array.isArray(value)) {
      directives.push(`${directive} ${value.join(' ')}`);
    } else if (value === true) {
      directives.push(directive);
    }
  }

  return directives.join('; ');
};

/**
 * Build Permissions Policy header value
 * @param {Object} policy - Permissions policy object
 * @returns {string} Permissions-Policy header value
 */
const buildPermissionsPolicy = (policy) => {
  return Object.entries(policy)
    .map(([feature, allowlist]) => `${feature}=${allowlist}`)
    .join(', ');
};

/**
 * Generate nonce for inline scripts/styles
 * @returns {string} Cryptographic nonce
 */
const generateNonce = () => {
  return require('crypto').randomBytes(16).toString('base64');
};

/**
 * Enhanced security headers middleware
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware
 */
const enhancedSecurityHeaders = (options = {}) => {
  const config = { ...securityHeaders, ...options };

  return (req, res, next) => {
    // Generate nonce for this request
    const nonce = generateNonce();
    res.locals.cspNonce = nonce;

    // Strict Transport Security (HSTS)
    if (config.hsts) {
      let hstsValue = `max-age=${config.hsts.maxAge}`;
      if (config.hsts.includeSubDomains) {
        hstsValue += '; includeSubDomains';
      }
      if (config.hsts.preload) {
        hstsValue += '; preload';
      }
      res.setHeader('Strict-Transport-Security', hstsValue);
    }

    // Content Security Policy with nonce support
    if (config.csp) {
      const cspPolicy = { ...config.csp };

      // Add nonce to script-src and style-src
      if (cspPolicy.scriptSrc && !cspPolicy.scriptSrc.includes("'unsafe-inline'")) {
        cspPolicy.scriptSrc.push(`'nonce-${nonce}'`);
      }
      if (cspPolicy.styleSrc && !cspPolicy.styleSrc.includes("'unsafe-inline'")) {
        cspPolicy.styleSrc.push(`'nonce-${nonce}'`);
      }

      const cspValue = buildCSP(cspPolicy);
      res.setHeader('Content-Security-Policy', cspValue);

      // Also set X-Content-Security-Policy for older browsers
      res.setHeader('X-Content-Security-Policy', cspValue);
    }

    // X-Frame-Options (clickjacking protection)
    if (config.frameOptions) {
      res.setHeader('X-Frame-Options', config.frameOptions);
    }

    // X-Content-Type-Options (MIME sniffing protection)
    if (config.contentTypeOptions) {
      res.setHeader('X-Content-Type-Options', config.contentTypeOptions);
    }

    // X-XSS-Protection (legacy XSS protection)
    if (config.xssProtection) {
      res.setHeader('X-XSS-Protection', config.xssProtection);
    }

    // Referrer Policy
    if (config.referrerPolicy) {
      res.setHeader('Referrer-Policy', config.referrerPolicy);
    }

    // Permissions Policy (formerly Feature-Policy)
    if (config.permissionsPolicy) {
      const permissionsValue = buildPermissionsPolicy(config.permissionsPolicy);
      res.setHeader('Permissions-Policy', permissionsValue);
    }

    // Cross-Origin Embedder Policy
    if (config.crossOriginEmbedderPolicy) {
      res.setHeader('Cross-Origin-Embedder-Policy', config.crossOriginEmbedderPolicy);
    }

    // Cross-Origin Opener Policy
    if (config.crossOriginOpenerPolicy) {
      res.setHeader('Cross-Origin-Opener-Policy', config.crossOriginOpenerPolicy);
    }

    // Cross-Origin Resource Policy
    if (config.crossOriginResourcePolicy) {
      res.setHeader('Cross-Origin-Resource-Policy', config.crossOriginResourcePolicy);
    }

    // Remove server fingerprinting headers
    if (config.removePoweredBy) {
      res.removeHeader('X-Powered-By');
    }

    // Additional security headers
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    // Expect-CT (Certificate Transparency)
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Expect-CT', 'max-age=86400, enforce');
    }

    // Cache control for sensitive routes
    if (req.path.includes('/api/') || req.path.includes('/auth/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    next();
  };
};

/**
 * Report-only CSP middleware for testing
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware
 */
const cspReportOnly = (options = {}) => {
  const config = { ...securityHeaders, ...options };

  return (req, res, next) => {
    if (config.csp) {
      const cspValue = buildCSP(config.csp);
      res.setHeader('Content-Security-Policy-Report-Only', cspValue);
    }
    next();
  };
};

/**
 * Security headers for API responses
 * Minimal headers for API endpoints
 * @returns {Function} Express middleware
 */
const apiSecurityHeaders = () => {
  return (req, res, next) => {
    // Essential security headers for API
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Remove fingerprinting
    res.removeHeader('X-Powered-By');

    // API-specific cache control
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    next();
  };
};

/**
 * Security headers for static assets
 * Optimized for caching and CDN
 * @returns {Function} Express middleware
 */
const staticSecurityHeaders = () => {
  return (req, res, next) => {
    // Basic security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    // Remove fingerprinting
    res.removeHeader('X-Powered-By');

    // Allow caching for static assets
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }

    next();
  };
};

module.exports = {
  enhancedSecurityHeaders,
  cspReportOnly,
  apiSecurityHeaders,
  staticSecurityHeaders,
  buildCSP,
  generateNonce,
};
