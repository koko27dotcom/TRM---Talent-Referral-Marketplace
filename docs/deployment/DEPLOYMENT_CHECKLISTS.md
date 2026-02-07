# TRM Referral Platform - Deployment Checklists

This document contains comprehensive checklists for all stages of deployment.

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Day Checklist](#deployment-day-checklist)
3. [Post-Deployment Checklist](#post-deployment-checklist)
4. [Go-Live Checklist](#go-live-checklist)
5. [Security Checklist](#security-checklist)
6. [Performance Checklist](#performance-checklist)
7. [Disaster Recovery Checklist](#disaster-recovery-checklist)

---

## Pre-Deployment Checklist

### Infrastructure Requirements

#### Server Specifications
- [ ] Server provisioned with minimum 4 CPU cores
- [ ] Server has minimum 8 GB RAM (16 GB recommended)
- [ ] Server has minimum 100 GB SSD storage
- [ ] Operating system is Ubuntu 22.04 LTS or compatible
- [ ] Server timezone set to Asia/Rangoon (UTC+6:30)
- [ ] Server has static IP address
- [ ] Server has proper hostname configured

#### Network Configuration
- [ ] Firewall configured (UFW/iptables)
- [ ] SSH port configured (preferably non-standard)
- [ ] SSH key-based authentication enabled
- [ ] Password authentication disabled
- [ ] Required ports open:
  - [ ] 22 (SSH)
  - [ ] 80 (HTTP)
  - [ ] 443 (HTTPS)
  - [ ] 3000 (Application - if not behind reverse proxy)
- [ ] DDoS protection configured (Cloudflare/AWS Shield)

#### Domain & SSL
- [ ] Domain registered and configured
- [ ] DNS records configured:
  - [ ] A record for root domain
  - [ ] A record for www subdomain
  - [ ] A record for api subdomain
  - [ ] A record for admin subdomain
- [ ] SSL certificate obtained (Let's Encrypt or commercial)
- [ ] SSL certificate installed and configured
- [ ] Auto-renewal configured for SSL certificates
- [ ] SSL configuration tested (SSL Labs A+ rating)

### Dependencies Installation

#### Core Dependencies
- [ ] Node.js 18.x installed and verified
- [ ] npm 9.x or higher installed
- [ ] PM2 installed globally
- [ ] Git installed and configured

#### Database
- [ ] MongoDB 6.0+ installed
- [ ] MongoDB authentication enabled
- [ ] MongoDB admin user created
- [ ] MongoDB application user created
- [ ] MongoDB backup user created
- [ ] MongoDB replica set configured (for production)
- [ ] MongoDB indexes created

#### Cache & Queue
- [ ] Redis 7.0+ installed
- [ ] Redis password configured
- [ ] Redis persistence configured (AOF)
- [ ] Redis memory limits configured
- [ ] Redis eviction policy configured

#### Web Server
- [ ] Nginx installed
- [ ] Nginx configuration optimized
- [ ] Nginx rate limiting configured
- [ ] Nginx security headers configured
- [ ] Nginx gzip compression enabled
- [ ] Nginx SSL configuration tested

#### Security Tools
- [ ] Fail2Ban installed and configured
- [ ] Automatic security updates enabled
- [ ] Log monitoring configured
- [ ] Intrusion detection configured (optional)

### Third-Party Services

#### Communication Services
- [ ] SendGrid account created and verified
- [ ] SendGrid domain authenticated
- [ ] SendGrid API key generated
- [ ] Twilio account created (for SMS)
- [ ] Twilio phone number purchased
- [ ] Viber bot created
- [ ] Telegram bot created
- [ ] WhatsApp Business API configured (optional)

#### Storage Services
- [ ] AWS S3 bucket created
- [ ] S3 bucket CORS configured
- [ ] S3 bucket versioning enabled
- [ ] AWS IAM user created with S3 access
- [ ] CloudFront distribution configured (optional)

#### Payment Gateways
- [ ] KBZPay merchant account created
- [ ] KBZPay API credentials obtained
- [ ] KBZPay webhook URL configured
- [ ] WavePay merchant account created
- [ ] WavePay API credentials obtained
- [ ] WavePay webhook URL configured
- [ ] AYA Pay merchant account created
- [ ] AYA Pay API credentials obtained
- [ ] AYA Pay webhook URL configured

#### Monitoring & Analytics
- [ ] Sentry project created
- [ ] Sentry DSN configured
- [ ] Google Analytics account created
- [ ] Google Analytics tracking ID configured
- [ ] Datadog account created (optional)
- [ ] Datadog API key configured (optional)

### Application Configuration

#### Environment Variables
- [ ] `.env.production` file created
- [ ] All required environment variables set:
  - [ ] NODE_ENV=production
  - [ ] PORT=3000
  - [ ] API_URL configured
  - [ ] FRONTEND_URL configured
  - [ ] MONGODB_URI configured
  - [ ] REDIS_URL configured
  - [ ] JWT_SECRET set (min 32 characters)
  - [ ] JWT_REFRESH_SECRET set (min 32 characters)
  - [ ] ENCRYPTION_KEY set (32 characters)
  - [ ] CORS_ORIGIN configured
  - [ ] All third-party API keys configured
- [ ] Environment file permissions set to 600
- [ ] Environment file owned by root

#### Secrets Management
- [ ] Secrets management solution chosen
- [ ] Secrets migrated to secure storage
- [ ] Secret rotation policy defined
- [ ] Access controls configured for secrets

#### Feature Flags
- [ ] Feature flags configured for production
- [ ] Beta features disabled
- [ ] Experimental features disabled
- [ ] Production-only features enabled

### Security Configuration

#### Authentication & Authorization
- [ ] JWT secrets are strong (min 32 characters)
- [ ] JWT expiration times configured
- [ ] Password policy configured
- [ ] Rate limiting configured for auth endpoints
- [ ] Account lockout policy configured
- [ ] Session management configured

#### Data Protection
- [ ] Database encryption at rest enabled (if supported)
- [ ] Data encryption keys generated
- [ ] PII handling configured
- [ ] Data retention policy configured
- [ ] Backup encryption enabled

#### API Security
- [ ] API rate limiting configured
- [ ] CORS origins restricted
- [ ] Security headers configured
- [ ] Input validation enabled
- [ ] SQL injection protection enabled
- [ ] XSS protection enabled
- [ ] CSRF protection enabled

#### Infrastructure Security
- [ ] Server hardening completed
- [ ] Unnecessary services disabled
- [ ] Security patches applied
- [ ] Audit logging enabled
- [ ] File integrity monitoring configured (optional)

### Monitoring & Logging

#### Application Monitoring
- [ ] Health check endpoints implemented
- [ ] Application metrics exposed
- [ ] Error tracking configured (Sentry)
- [ ] Performance monitoring configured
- [ ] Uptime monitoring configured

#### Infrastructure Monitoring
- [ ] Server monitoring configured
- [ ] Database monitoring configured
- [ ] Redis monitoring configured
- [ ] Nginx monitoring configured
- [ ] Log aggregation configured

#### Alerting
- [ ] Alert rules defined
- [ ] Alert channels configured:
  - [ ] Email notifications
  - [ ] Slack notifications (optional)
  - [ ] PagerDuty integration (optional)
- [ ] On-call schedule established
- [ ] Escalation procedures defined

### Backup & Recovery

#### Backup Configuration
- [ ] Automated backup schedule configured
- [ ] Database backup script tested
- [ ] File backup script tested
- [ ] Backup storage configured (S3/other)
- [ ] Backup retention policy defined
- [ ] Backup encryption enabled

#### Recovery Procedures
- [ ] Database restore procedure documented
- [ ] File restore procedure documented
- [ ] Disaster recovery plan documented
- [ ] Recovery time objective (RTO) defined
- [ ] Recovery point objective (RPO) defined
- [ ] Recovery procedures tested

### Documentation

#### Technical Documentation
- [ ] Architecture documentation updated
- [ ] API documentation updated
- [ ] Database schema documented
- [ ] Environment variables documented
- [ ] Deployment procedures documented
- [ ] Rollback procedures documented

#### Operational Documentation
- [ ] Runbooks created for common issues
- [ ] Escalation procedures documented
- [ ] Contact information updated
- [ ] Vendor support contacts documented

---

## Deployment Day Checklist

### Pre-Deployment (T-2 Hours)

#### Communication
- [ ] Deployment window communicated to stakeholders
- [ ] Team notified of deployment start
- [ ] Support team on standby
- [ ] Rollback plan reviewed with team

#### Environment Preparation
- [ ] Production environment verified stable
- [ ] All services running normally
- [ ] Current version documented
- [ ] Database backup completed
- [ ] File backup completed

#### Code Preparation
- [ ] Code reviewed and approved
- [ ] All tests passing
- [ ] Version tagged in Git
- [ ] Release notes prepared
- [ ] Changelog updated

### Deployment Start (T-0)

#### Initial Checks
- [ ] Deploy to staging first (if applicable)
- [ ] Smoke tests passed on staging
- [ ] Monitoring dashboards open
- [ ] Log aggregation tool open
- [ ] Team communication channel active

#### Application Deployment
- [ ] Application code deployed
- [ ] Dependencies installed successfully
- [ ] Build completed without errors
- [ ] Environment variables configured
- [ ] Application started successfully

#### Database Deployment
- [ ] Database migrations run successfully
- [ ] Database indexes created/updated
- [ ] Database seeds executed (if needed)
- [ ] Database integrity verified

#### Service Deployment
- [ ] Background jobs started
- [ ] Cron jobs configured
- [ ] Queue workers started
- [ ] Webhook endpoints verified

### Post-Deployment Verification (T+15 Minutes)

#### Health Checks
- [ ] Basic health check passing
- [ ] Database connection verified
- [ ] Redis connection verified
- [ ] External service connections verified
- [ ] All health endpoints responding

#### Functional Testing
- [ ] User registration working
- [ ] User login working
- [ ] Password reset working
- [ ] Email delivery working
- [ ] SMS delivery working (if applicable)

#### API Testing
- [ ] Public API endpoints responding
- [ ] Authenticated API endpoints working
- [ ] API rate limiting working
- [ ] API documentation accessible

#### Frontend Testing
- [ ] Main website loading
- [ ] Admin panel accessible
- [ ] Static assets loading
- [ ] CDN working (if applicable)

### Extended Verification (T+1 Hour)

#### Performance Monitoring
- [ ] Response times within acceptable range
- [ ] Error rates within acceptable range
- [ ] CPU usage normal
- [ ] Memory usage normal
- [ ] Database performance normal

#### User Flow Testing
- [ ] Complete user registration flow
- [ ] Complete job posting flow
- [ ] Complete referral flow
- [ ] Complete payment flow
- [ ] Complete notification flow

#### Integration Testing
- [ ] Payment gateway integrations working
- [ ] Email service integration working
- [ ] SMS service integration working
- [ ] File upload working
- [ ] Third-party APIs responding

---

## Post-Deployment Checklist

### Immediate (0-2 Hours)

#### Monitoring
- [ ] Error rates monitored
- [ ] Response times monitored
- [ ] Server resources monitored
- [ ] Database performance monitored
- [ ] No critical alerts triggered

#### User Feedback
- [ ] Support channels monitored
- [ ] No user complaints received
- [ ] No critical bugs reported
- [ ] Social media monitored

#### Documentation
- [ ] Deployment log updated
- [ ] Issues encountered documented
- [ ] Configuration changes recorded
- [ ] Performance baseline established

### Short-term (2-24 Hours)

#### Stability Verification
- [ ] Application stable for 24 hours
- [ ] No memory leaks detected
- [ ] No unusual error patterns
- [ ] Database connections stable
- [ ] Background jobs completing successfully

#### Performance Validation
- [ ] Response times consistent
- [ ] Throughput meeting expectations
- [ ] Resource utilization optimized
- [ ] Cache hit rates acceptable

#### Security Verification
- [ ] No security alerts
- [ ] No suspicious activity detected
- [ ] Access logs reviewed
- [ ] Failed login attempts normal

### Long-term (1-7 Days)

#### Business Metrics
- [ ] User registration rate normal
- [ ] User engagement metrics normal
- [ ] Conversion rates maintained
- [ ] Revenue impact assessed

#### Technical Metrics
- [ ] Application performance stable
- [ ] Infrastructure costs within budget
- [ ] Backup jobs completing successfully
- [ ] Log rotation working

#### Documentation Updates
- [ ] Runbooks updated with new issues
- [ ] Architecture diagrams updated
- [ ] Configuration documentation updated
- [ ] Lessons learned documented

---

## Go-Live Checklist

### Final Verification

#### Technical Verification
- [ ] Production URL accessible from multiple locations
- [ ] SSL certificate valid and trusted
- [ ] All subdomains working:
  - [ ] www.myanjobs.com
  - [ ] api.myanjobs.com
  - [ ] admin.myanjobs.com
- [ ] Mobile responsiveness verified
- [ ] Cross-browser compatibility verified

#### Functional Verification
- [ ] User registration flow end-to-end tested
- [ ] User login flow end-to-end tested
- [ ] Job posting flow end-to-end tested
- [ ] Job application flow end-to-end tested
- [ ] Referral creation flow end-to-end tested
- [ ] Payment processing flow end-to-end tested
- [ ] Withdrawal flow end-to-end tested
- [ ] Notification delivery verified

#### Admin Verification
- [ ] Admin panel accessible
- [ ] Admin authentication working
- [ ] Dashboard loading correctly
- [ ] User management working
- [ ] Content management working
- [ ] Analytics displaying correctly

#### Integration Verification
- [ ] Payment gateways responding
- [ ] Email service delivering
- [ ] SMS service delivering
- [ ] Push notifications working
- [ ] File uploads working
- [ ] CDN delivering assets

### Communication

#### Internal Communication
- [ ] Development team notified
- [ ] Operations team notified
- [ ] Support team briefed
- [ ] Marketing team notified
- [ ] Management informed

#### External Communication
- [ ] Users notified (if applicable)
- [ ] Partners notified (if applicable)
- [ ] Social media announcement prepared
- [ ] Press release prepared (if applicable)

### Monitoring Setup

#### Active Monitoring
- [ ] Uptime monitoring active
- [ ] Performance monitoring active
- [ ] Error tracking active
- [ ] Business metrics tracking active

#### Alerting
- [ ] Critical alerts configured
- [ ] Warning alerts configured
- [ ] Alert channels tested
- [ ] On-call schedule active

---

## Security Checklist

### Pre-Deployment Security

#### Code Security
- [ ] Security audit completed
- [ ] Dependency vulnerabilities scanned
- [ ] Secrets scanning completed
- [ ] Static code analysis passed
- [ ] No hardcoded credentials

#### Infrastructure Security
- [ ] Server hardening completed
- [ ] Firewall rules reviewed
- [ ] Network segmentation verified
- [ ] DDoS protection enabled
- [ ] WAF configured (if applicable)

#### Application Security
- [ ] Authentication mechanisms reviewed
- [ ] Authorization rules verified
- [ ] Input validation implemented
- [ ] Output encoding implemented
- [ ] CSRF protection enabled
- [ ] XSS protection enabled
- [ ] SQL injection protection enabled

#### Data Security
- [ ] Encryption at rest enabled
- [ ] Encryption in transit enforced
- [ ] Key management configured
- [ ] Data classification applied
- [ ] PII handling compliant

### Post-Deployment Security

#### Security Monitoring
- [ ] Security logs being collected
- [ ] Failed authentication attempts monitored
- [ ] Unusual activity alerts configured
- [ ] Vulnerability scanning scheduled

#### Access Control
- [ ] Admin access reviewed
- [ ] Service accounts reviewed
- [ ] API keys rotated
- [ ] Passwords changed (initial deployment)

---

## Performance Checklist

### Pre-Deployment Performance

#### Load Testing
- [ ] Load tests completed
- [ ] Stress tests completed
- [ ] Spike tests completed
- [ ] Endurance tests completed
- [ ] Performance benchmarks established

#### Optimization
- [ ] Database queries optimized
- [ ] Indexes created
- [ ] Caching strategy implemented
- [ ] Static assets optimized
- [ ] CDN configured

#### Capacity Planning
- [ ] Expected load calculated
- [ ] Resource requirements determined
- [ ] Scaling policies defined
- [ ] Auto-scaling configured

### Post-Deployment Performance

#### Performance Monitoring
- [ ] Response times monitored
- [ ] Throughput monitored
- [ ] Error rates monitored
- [ ] Resource utilization monitored

#### Optimization Verification
- [ ] Cache hit rates acceptable
- [ ] Database query times acceptable
- [ ] Static asset delivery optimized
- [ ] API response times acceptable

---

## Disaster Recovery Checklist

### Backup Verification

#### Data Backup
- [ ] Database backups completing successfully
- [ ] File backups completing successfully
- [ ] Configuration backups completing successfully
- [ ] Backup integrity verified
- [ ] Backup restoration tested

#### Documentation
- [ ] Recovery procedures documented
- [ ] Contact list updated
- [ ] Escalation procedures documented
- [ ] Recovery time objectives defined

### Recovery Testing

#### Scenario Testing
- [ ] Database failure scenario tested
- [ ] Server failure scenario tested
- [ ] Network failure scenario tested
- [ ] Complete site failure scenario tested

#### Recovery Verification
- [ ] Recovery time meets RTO
- [ ] Data loss within RPO
- [ ] Applications functional after recovery
- [ ] Data integrity maintained

---

## Sign-Off

### Pre-Deployment Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Technical Lead | | | |
| DevOps Engineer | | | |
| Security Officer | | | |
| Product Owner | | | |

### Post-Deployment Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Technical Lead | | | |
| DevOps Engineer | | | |
| QA Lead | | | |
| Product Owner | | | |

### Go-Live Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| CTO | | | |
| Product Owner | | | |
| Operations Manager | | | |
| Security Officer | | | |

---

## Notes

### Deployment Notes

```
Date: _______________
Version: _______________
Deployed By: _______________

Issues Encountered:
_________________________________
_________________________________
_________________________________

Resolution:
_________________________________
_________________________________
_________________________________

Lessons Learned:
_________________________________
_________________________________
_________________________________
```

### Emergency Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| Primary On-Call | | | |
| Secondary On-Call | | | |
| Escalation Manager | | | |
| Database Admin | | | |
| Security Team | | | |

---

**Document Version**: 1.0  
**Last Updated**: 2024-01-01  
**Next Review**: 2024-04-01
