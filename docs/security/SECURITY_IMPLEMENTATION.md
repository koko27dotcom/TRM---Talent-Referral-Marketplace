# Security Audit & Rate Limiting Implementation

This document describes the comprehensive security implementation for the TRM Referral Platform.

## Overview

The security system provides enterprise-grade protection including:

- **Enhanced Rate Limiting** - Tiered, Redis-backed sliding window rate limiting
- **Security Headers** - Comprehensive CSP, HSTS, and modern security policies
- **Input Validation** - SQL injection, XSS, and NoSQL injection prevention
- **Authentication Security** - Brute force protection, suspicious login detection
- **API Security** - Request signing, replay protection, IP filtering
- **Data Protection** - PII encryption, data masking, GDPR compliance
- **Monitoring & Alerting** - Real-time security event logging and alerting
- **DDoS Protection** - Connection limits, slowloris protection, geographic blocking

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Layer                           │
├─────────────────────────────────────────────────────────────┤
│  DDoS Protection → Rate Limiting → Security Headers        │
│         ↓              ↓                ↓                  │
│  Input Validation → Auth Security → API Security           │
│         ↓              ↓                ↓                  │
│  Data Protection → Monitoring → Alerting                   │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Enhanced Rate Limiter (`server/middleware/enhancedRateLimiter.js`)

**Features:**
- Tiered rate limits (anonymous, authenticated, premium, admin, internal)
- Endpoint-specific limits (auth, API, scraping, payments)
- Redis-backed sliding window algorithm
- Custom rate limit headers
- Distributed rate limiting support

**Usage:**
```javascript
const { rateLimiters, dynamicRateLimiter } = require('./middleware/enhancedRateLimiter');

// Apply to specific routes
app.use('/api/auth/login', rateLimiters.auth);
app.use('/api/', dynamicRateLimiter);
```

**Configuration:**
```javascript
// server/config/security.js
rateLimit: {
  tiers: {
    anonymous: { windowMs: 60000, maxRequests: 30 },
    authenticated: { windowMs: 60000, maxRequests: 100 },
    premium: { windowMs: 60000, maxRequests: 300 },
    admin: { windowMs: 60000, maxRequests: 500 },
  }
}
```

### 2. Security Headers (`server/middleware/enhancedSecurityHeaders.js`)

**Features:**
- Strict Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options, X-Content-Type-Options
- Referrer-Policy, Permissions-Policy
- Cross-Origin policies
- Server fingerprinting removal

**Usage:**
```javascript
const { enhancedSecurityHeaders } = require('./middleware/enhancedSecurityHeaders');

app.use(enhancedSecurityHeaders());
```

### 3. Input Validation (`server/middleware/inputValidation.js`)

**Features:**
- SQL injection pattern detection
- XSS prevention and HTML sanitization
- NoSQL injection protection
- Myanmar phone number validation
- Password strength validation
- File upload validation

**Usage:**
```javascript
const { validateRequest, sanitizeRequestBody } = require('./middleware/inputValidation');

// Sanitize all requests
app.use(sanitizeRequestBody());

// Validate specific routes
app.post('/api/register', validateRequest({
  email: { type: 'email', required: true },
  password: { type: 'password', required: true },
  phone: { type: 'phone', required: true },
}), handler);
```

### 4. Authentication Security (`server/services/authSecurityService.js`)

**Features:**
- Brute force protection with account lockout
- Suspicious login detection
- Device fingerprinting
- Session management
- JWT token rotation
- TOTP/2FA support

**Usage:**
```javascript
const authSecurity = require('./services/authSecurityService');

// Record failed attempt
await authSecurity.recordFailedAttempt(email, { ip, userAgent });

// Check account lock
const lockStatus = await authSecurity.checkAccountLock(email);

// Detect suspicious login
const suspicion = await authSecurity.detectSuspiciousLogin(user, context);
```

### 5. API Security (`server/middleware/apiSecurity.js`)

**Features:**
- API key validation with scopes
- Request signing (HMAC)
- Replay attack protection
- Webhook signature validation
- IP whitelist/blacklist
- API versioning

**Usage:**
```javascript
const { requireApiKey, validateRequestSignature } = require('./middleware/apiSecurity');

// Protect API routes
app.use('/api/data', requireApiKey(['read', 'write']));
app.use('/api/sensitive', validateRequestSignature());
```

### 6. Data Protection (`server/services/dataProtectionService.js`)

**Features:**
- AES-256-GCM encryption for PII
- Data masking for logs
- Pseudonymization
- GDPR data export
- Data anonymization

**Usage:**
```javascript
const dataProtection = require('./services/dataProtectionService');

// Encrypt sensitive fields
const encrypted = dataProtection.encryptFields(userData);

// Mask data for display
const masked = dataProtection.maskData(phoneNumber, 'phone');

// Sanitize for logging
const safe = dataProtection.sanitizeForLogging(data);
```

### 7. Security Monitoring (`server/services/securityMonitoringService.js`)

**Features:**
- Security event logging
- Slack/email/webhook alerting
- Anomaly detection
- Failed login tracking
- Real-time dashboard

**Usage:**
```javascript
const monitoring = require('./services/securityMonitoringService');

// Log security event
await monitoring.logSecurityEvent({
  eventType: 'suspicious_activity',
  severity: 'high',
  description: 'Multiple failed login attempts',
});

// Initialize monitoring
monitoring.initializeMonitoring();
```

### 8. DDoS Protection (`server/middleware/ddosProtection.js`)

**Features:**
- Request size limits
- Connection limits per IP
- Slowloris protection
- Geographic blocking
- Challenge-response (proof-of-work)

**Usage:**
```javascript
const { ddosProtection } = require('./middleware/ddosProtection');

app.use(ddosProtection());
```

### 9. GDPR Compliance (`server/utils/gdprCompliance.js`)

**Features:**
- Consent management
- Right to access/erasure/portability
- Data processing records
- Privacy policy helpers

**Usage:**
```javascript
const gdpr = require('./utils/gdprCompliance');

// Record consent
await gdpr.recordConsent(userId, {
  purposes: ['marketing', 'analytics'],
  granted: true,
});

// Handle data export
const export = await gdpr.handleAccessRequest(userId, userData);
```

## Security Routes

The security dashboard API is available at `/api/v1/security`:

- `GET /security/stats` - Security statistics
- `GET /security/events` - Security events with filtering
- `GET /security/events/:id` - Single event details
- `PATCH /security/events/:id` - Update event status
- `GET /security/suspicious` - Suspicious activities
- `GET /security/rate-limits` - Rate limit status
- `POST /security/rate-limits/reset` - Reset rate limit
- `GET /security/dashboard` - Dashboard data

## React Components

### SecurityDashboard

Located at `src/sections/SecurityDashboard.tsx`

Features:
- Real-time security metrics
- Event filtering and search
- Suspicious activity monitoring
- Event detail modal
- Status management

### Security API Client

Located at `src/services/securityApi.ts`

Provides TypeScript interfaces and API methods for security operations.

## Configuration

### Environment Variables

```bash
# Security
ENCRYPTION_KEY=your-32-byte-hex-key
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
PASSWORD_PEPPER=your-pepper

# Rate Limiting
REDIS_URL=redis://localhost:6379
RATE_LIMIT_SKIP_IPS=127.0.0.1,::1

# Alerting
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
SECURITY_ALERT_EMAILS=security@example.com
SECURITY_WEBHOOK_URL=https://your-webhook.com/security

# DDoS
BLOCKED_COUNTRIES=XX,YY
ALLOWED_COUNTRIES=MM,SG

# GDPR
GDPR_ENABLED=true
```

## Best Practices

1. **Always use parameterized queries** to prevent SQL injection
2. **Validate all user input** using the validation middleware
3. **Encrypt sensitive data** before storing in database
4. **Log security events** for audit trails
5. **Use HTTPS** in production with HSTS
6. **Implement proper CORS** policies
7. **Regularly rotate** API keys and encryption keys
8. **Monitor rate limits** and adjust based on traffic patterns

## Testing

Run security tests:

```bash
# Test rate limiting
npm run test:security:rate-limit

# Test input validation
npm run test:security:validation

# Test authentication security
npm run test:security:auth
```

## Monitoring

Monitor these key metrics:

- Failed login attempts per hour
- Rate limit hits per endpoint
- Suspicious activity alerts
- DDoS mitigation triggers
- Encryption key rotation status

## Support

For security issues or questions:
- Security Team: security@trm-platform.com
- Documentation: https://docs.trm-platform.com/security
- Incident Response: https://status.trm-platform.com
