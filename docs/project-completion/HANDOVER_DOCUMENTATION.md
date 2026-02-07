# TRM Referral Platform - Handover Documentation

> **Document Type:** Handover / Knowledge Transfer  
> **Version:** 1.0  
> **Date:** February 6, 2026  
> **Classification:** Internal - Confidential

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Access & Credentials](#access--credentials)
4. [Architecture Deep Dive](#architecture-deep-dive)
5. [Third-Party Integrations](#third-party-integrations)
6. [Deployment Procedures](#deployment-procedures)
7. [Monitoring & Alerting](#monitoring--alerting)
8. [Backup & Recovery](#backup--recovery)
9. [Known Issues & Limitations](#known-issues--limitations)
10. [Troubleshooting Guide](#troubleshooting-guide)
11. [Contact Information](#contact-information)
12. [Appendices](#appendices)

---

## 🎯 Executive Summary

This document provides comprehensive handover information for the TRM (Talent Referral Marketplace) Platform. It contains all necessary information for the operations team to maintain, monitor, and troubleshoot the system in production.

### Project Handover Status

| Component | Status | Notes |
|-----------|--------|-------|
| Source Code | ✅ Complete | All repositories transferred |
| Documentation | ✅ Complete | 29 documents provided |
| Credentials | ⏳ Pending | See secure handover section |
| Training | ⏳ Pending | Schedule knowledge transfer sessions |
| Support Transition | ⏳ Pending | 30-day support period agreed |

---

## 🏗️ System Overview

### Application Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           TRM PLATFORM                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        FRONTEND LAYER                            │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │   │
│  │  │   Web App    │  │  Mobile App  │  │    Messaging Bots    │   │   │
│  │  │   (React)    │  │(React Native)│  │ (Viber/Telegram)     │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                         API LAYER                                │   │
│  │                    Express.js + Node.js                          │   │
│  │  ┌──────────┬──────────┬──────────┬──────────┬──────────────┐   │   │
│  │  │   Auth   │   Jobs   │ Referrals│ Payments │   Academy    │   │   │
│  │  │  Module  │  Module  │  Module  │  Module  │   Module     │   │   │
│  │  └──────────┴──────────┴──────────┴──────────┴──────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                       SERVICE LAYER                              │   │
│  │  ┌──────────┬──────────┬──────────┬──────────┬──────────────┐   │   │
│  │  │ Payment  │ Messaging│ Referral │   KYC    │  Analytics   │   │   │
│  │  │ Service  │ Service  │ Service  │ Service  │   Service    │   │   │
│  │  └──────────┴──────────┴──────────┴──────────┴──────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        DATA LAYER                                │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │   │
│  │  │    MongoDB      │  │     Redis       │  │   File Store    │  │   │
│  │  │   (Primary DB)  │  │ (Cache/Queue)   │  │    (S3/Local)   │  │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Frontend | React | 18.x | Web UI |
| Frontend | TypeScript | 5.x | Type safety |
| Frontend | Tailwind CSS | 3.x | Styling |
| Mobile | React Native | Latest | Mobile apps |
| Backend | Node.js | 18.x | Runtime |
| Backend | Express.js | 5.x | Web framework |
| Database | MongoDB | 6.x | Primary database |
| Cache | Redis | 7.x | Caching & sessions |
| AI/ML | OpenAI/Moonshot | Latest | Resume optimization |
| Queue | Bull | Latest | Job processing |

---

## 🔐 Access & Credentials

### 🔒 SECURE HANDOVER REQUIRED

> **IMPORTANT:** All sensitive credentials must be handed over securely through an encrypted channel or password manager. Do NOT include actual credentials in this document.

### Required Access

| System | Access Type | Location | Status |
|--------|-------------|----------|--------|
| Source Code Repository | GitHub/GitLab | [Repository URL] | ⏳ |
| Production Servers | SSH/Key | [Server IPs] | ⏳ |
| Database | Connection String | MongoDB Atlas | ⏳ |
| Redis | Connection String | Redis Cloud | ⏳ |
| Cloud Infrastructure | IAM/Console | AWS/GCP/Azure | ⏳ |
| Payment Gateways | API Keys | KBZPay, WavePay, AYA Pay | ⏳ |
| Messaging Services | Bot Tokens | Viber, Telegram | ⏳ |
| Email Service | API Key | SendGrid | ⏳ |
| SMS Service | API Key | Twilio | ⏳ |
| Monitoring | Dashboard | Grafana/Prometheus | ⏳ |
| SSL Certificates | Certificate Files | Let's Encrypt | ⏳ |

### Environment Variables Template

```bash
# Database
MONGODB_URI=mongodb+srv://[username]:[password]@[cluster]/trm?retryWrites=true&w=majority
MONGODB_DB_NAME=trm_production

# Redis
REDIS_URL=redis://[username]:[password]@[host]:[port]
REDIS_PASSWORD=[password]

# JWT
JWT_SECRET=[256-bit-secret]
JWT_REFRESH_SECRET=[256-bit-secret]
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Payment Providers
KBZPAY_MERCHANT_ID=[merchant_id]
KBZPAY_API_KEY=[api_key]
KBZPAY_SECRET_KEY=[secret_key]

WAVEPAY_MERCHANT_ID=[merchant_id]
WAVEPAY_API_KEY=[api_key]
WAVEPAY_SECRET_KEY=[secret_key]

AYAPAY_MERCHANT_ID=[merchant_id]
AYAPAY_API_KEY=[api_key]
AYAPAY_SECRET_KEY=[secret_key]

# Messaging
VIBER_BOT_TOKEN=[bot_token]
VIBER_WEBHOOK_URL=https://api.trm-platform.com/webhooks/viber

TELEGRAM_BOT_TOKEN=[bot_token]
TELEGRAM_WEBHOOK_URL=https://api.trm-platform.com/webhooks/telegram

# Email
SENDGRID_API_KEY=[api_key]
SENDGRID_FROM_EMAIL=noreply@trm-platform.com

# SMS
TWILIO_ACCOUNT_SID=[account_sid]
TWILIO_AUTH_TOKEN=[auth_token]
TWILIO_PHONE_NUMBER=[phone_number]

# AI/ML
OPENAI_API_KEY=[api_key]
MOONSHOT_API_KEY=[api_key]

# Cloud Storage
AWS_ACCESS_KEY_ID=[access_key]
AWS_SECRET_ACCESS_KEY=[secret_key]
AWS_S3_BUCKET=trm-platform-uploads
AWS_REGION=ap-southeast-1

# Security
ENCRYPTION_KEY=[256-bit-key]
HMAC_SECRET=[secret]
```

---

## 🏛️ Architecture Deep Dive

### Database Schema Overview

#### Core Collections

| Collection | Purpose | Key Indexes |
|------------|---------|-------------|
| users | User accounts | email, role, status |
| companies | Company profiles | name, industry, status |
| jobs | Job postings | companyId, status, location |
| referrals | Referral records | jobId, referrerId, status |
| payments | Payment transactions | userId, status, type |
| payouts | Payout requests | userId, status |
| cvs | CV/Resume data | email, phone, skills |
| notifications | User notifications | userId, read, createdAt |
| audits | Audit logs | userId, action, timestamp |

#### Data Flow Diagram

```
User Action → API Route → Controller → Service → Model → Database
                                    ↓
                              Event/Queue
                                    ↓
                              Webhook/Notification
```

### Service Architecture

#### Core Services

| Service | Responsibility | Dependencies |
|---------|---------------|--------------|
| AuthService | Authentication & authorization | User model, JWT, Redis |
| PaymentService | Payment processing | Payment providers, Transaction model |
| ReferralService | Referral lifecycle | Job model, User model, Notification |
| MessagingService | Message routing | Viber, Telegram, Email, SMS |
| KYCService | Identity verification | KYC model, Document storage |
| AnalyticsService | Data analytics | All models, Aggregation |

### API Structure

#### RESTful Endpoints

```
/api/v1/auth/*          - Authentication
/api/v1/users/*         - User management
/api/v1/companies/*     - Company management
/api/v1/jobs/*          - Job operations
/api/v1/referrals/*     - Referral operations
/api/v1/payments/*      - Payment operations
/api/v1/payouts/*       - Payout operations
/api/v1/kyc/*           - KYC operations
/api/v1/academy/*       - Academy operations
/api/v1/market/*        - Market intelligence
/api/v1/admin/*         - Admin operations
/api/v1/webhooks/*      - Webhook handlers
```

---

## 🔌 Third-Party Integrations

### Payment Providers

#### KBZPay
- **Environment:** Production
- **API Endpoint:** https://api.kbzpay.com/payment/gateway
- **Webhook URL:** https://api.trm-platform.com/webhooks/kbzpay
- **Contact:** [KBZPay Support]
- **Documentation:** [KBZPay API Docs]

#### WavePay
- **Environment:** Production
- **API Endpoint:** https://api.wavepay.com/v1
- **Webhook URL:** https://api.trm-platform.com/webhooks/wavepay
- **Contact:** [WavePay Support]
- **Documentation:** [WavePay API Docs]

#### AYA Pay
- **Environment:** Production
- **API Endpoint:** https://api.ayapay.com/v2
- **Webhook URL:** https://api.trm-platform.com/webhooks/ayapay
- **Contact:** [AYA Pay Support]
- **Documentation:** [AYA Pay API Docs]

### Messaging Services

#### Viber
- **Bot Name:** TRM Platform Bot
- **Bot URL:** [Viber Bot Link]
- **Webhook URL:** https://api.trm-platform.com/webhooks/viber
- **Admin Panel:** [Viber Admin URL]

#### Telegram
- **Bot Name:** @TRMPlatformBot
- **Bot URL:** https://t.me/TRMPlatformBot
- **Webhook URL:** https://api.trm-platform.com/webhooks/telegram
- **Admin:** @BotFather

#### SendGrid
- **Account:** [SendGrid Account]
- **API Key Location:** Environment variables
- **Templates:** Configured in SendGrid dashboard
- **Analytics:** Available in SendGrid console

### AI/ML Services

#### Moonshot AI (Kimi)
- **API Endpoint:** https://api.moonshot.cn/v1
- **Use Cases:** Resume optimization, job matching
- **Rate Limits:** [Document limits]
- **Fallback:** OpenAI API

---

## 🚀 Deployment Procedures

### Deployment Environments

| Environment | URL | Purpose |
|-------------|-----|---------|
| Development | http://localhost:3000 | Local development |
| Staging | https://staging.trm-platform.com | Pre-production testing |
| Production | https://trm-platform.com | Live application |

### Deployment Process

#### 1. Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Code review completed
- [ ] Security scan passed
- [ ] Database migrations prepared
- [ ] Environment variables updated
- [ ] Backup created
- [ ] Rollback plan documented

#### 2. Deployment Steps

```bash
# 1. Build application
npm run build

# 2. Run database migrations
npm run db:migrate

# 3. Deploy to staging
kubectl apply -f k8s/ --namespace=staging

# 4. Run smoke tests
npm run test:smoke

# 5. Deploy to production
kubectl apply -f k8s/ --namespace=production

# 6. Verify deployment
kubectl rollout status deployment/trm-app

# 7. Run health checks
curl https://trm-platform.com/api/health
```

#### 3. Post-Deployment Verification

- [ ] Application responding correctly
- [ ] Database connections active
- [ ] Redis connections active
- [ ] External integrations working
- [ ] Monitoring alerts configured
- [ ] Logs flowing correctly

### Rollback Procedure

```bash
# 1. Identify previous stable version
kubectl rollout history deployment/trm-app

# 2. Rollback to previous version
kubectl rollout undo deployment/trm-app

# 3. Verify rollback
curl https://trm-platform.com/api/health

# 4. Notify team
# Send notification to #deployments channel
```

---

## 📊 Monitoring & Alerting

### Monitoring Stack

| Component | Tool | URL | Purpose |
|-----------|------|-----|---------|
| Metrics | Prometheus | http://prometheus.trm-platform.com | Data collection |
| Visualization | Grafana | http://grafana.trm-platform.com | Dashboards |
| Logging | Loki | Integrated in Grafana | Log aggregation |
| APM | Jaeger | http://jaeger.trm-platform.com | Distributed tracing |
| Uptime | UptimeRobot | [Dashboard URL] | External monitoring |

### Key Metrics

#### Application Metrics
- Request rate (requests/second)
- Response time (p50, p95, p99)
- Error rate (%)
- Active connections
- Queue depth

#### Infrastructure Metrics
- CPU usage (%)
- Memory usage (%)
- Disk usage (%)
- Network I/O
- Database connections

#### Business Metrics
- User registrations
- Job postings
- Referral submissions
- Payment transactions
- Payout requests

### Alerting Rules

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| High Error Rate | > 5% for 5m | Critical | Page on-call |
| High Response Time | p95 > 500ms for 10m | Warning | Notify team |
| Database Connection Pool | > 80% for 5m | Critical | Page on-call |
| Disk Space | > 85% | Warning | Notify team |
| Payment Failures | > 10% for 5m | Critical | Page on-call |

### Dashboard URLs

- **Application Dashboard:** http://grafana.trm-platform.com/d/app
- **Infrastructure Dashboard:** http://grafana.trm-platform.com/d/infra
- **Business Dashboard:** http://grafana.trm-platform.com/d/business
- **Payment Dashboard:** http://grafana.trm-platform.com/d/payments

---

## 💾 Backup & Recovery

### Backup Strategy

#### Database Backups

| Type | Frequency | Retention | Method |
|------|-----------|-----------|--------|
| Full Backup | Daily | 30 days | mongodump |
| Incremental | Hourly | 7 days | Oplog |
| Point-in-Time | Continuous | 7 days | Atlas |

#### File Backups

| Type | Frequency | Retention | Method |
|------|-----------|-----------|--------|
| User Uploads | Real-time | 90 days | S3 versioning |
| Configurations | On change | Forever | Git |
| Logs | Daily | 30 days | S3 lifecycle |

### Backup Commands

```bash
# MongoDB Backup
mongodump --uri="$MONGODB_URI" --out=/backups/$(date +%Y%m%d)

# Upload to S3
aws s3 sync /backups/$(date +%Y%m%d) s3://trm-backups/mongodb/$(date +%Y%m%d)

# Verify backup
aws s3 ls s3://trm-backups/mongodb/$(date +%Y%m%d)
```

### Recovery Procedures

#### Database Recovery

```bash
# 1. Download backup
aws s3 sync s3://trm-backups/mongodb/20260101 /restore/

# 2. Restore database
mongorestore --uri="$MONGODB_URI" /restore/

# 3. Verify data
mongo "$MONGODB_URI" --eval "db.stats()"
```

#### Application Recovery

```bash
# 1. Rollback deployment
kubectl rollout undo deployment/trm-app

# 2. Verify health
curl https://trm-platform.com/api/health

# 3. Check logs
kubectl logs -f deployment/trm-app
```

### Disaster Recovery Plan

| Scenario | RTO | RPO | Procedure |
|----------|-----|-----|-----------|
| Database Corruption | 1 hour | 1 hour | Restore from backup |
| Complete Data Center Loss | 4 hours | 1 hour | Failover to DR site |
| Application Failure | 15 min | 0 | Rollback deployment |
| Security Breach | 2 hours | 0 | Isolate, restore, patch |

---

## ⚠️ Known Issues & Limitations

### Current Limitations

| Issue | Impact | Workaround | Planned Fix |
|-------|--------|------------|-------------|
| KBZPay webhook delays | Payment status updates may lag 1-2 min | Polling fallback | Q2 2026 |
| CV parsing accuracy | 95% accuracy for Myanmar formats | Manual review | Q1 2026 |
| Mobile app offline sync | Limited to last 100 records | Pagination | Q1 2026 |
| Report generation | Large reports timeout > 30s | Async processing | Q2 2026 |

### Technical Debt

| Item | Priority | Effort | Notes |
|------|----------|--------|-------|
| Refactor payment service | Medium | 2 weeks | Split into smaller services |
| Optimize database queries | High | 1 week | Add missing indexes |
| Update dependencies | Medium | 3 days | Security patches |
| Improve test coverage | Medium | 2 weeks | Target 90% |

### Deprecated Features

| Feature | Status | Replacement | Removal Date |
|---------|--------|-------------|--------------|
| Legacy auth endpoint | Deprecated | /api/v1/auth/* | 2026-06-01 |
| Old payout API | Deprecated | /api/v1/payouts/* | 2026-03-01 |

---

## 🔧 Troubleshooting Guide

### Common Issues

#### 1. Application Won't Start

**Symptoms:**
- Container crashes on startup
- Health check failures
- Connection errors

**Diagnosis:**
```bash
# Check logs
kubectl logs deployment/trm-app --tail=100

# Check environment variables
kubectl exec deployment/trm-app -- env | grep -E "(MONGODB|REDIS|JWT)"

# Check resource usage
kubectl top pods
```

**Resolution:**
1. Verify environment variables are set
2. Check database connectivity
3. Verify Redis connectivity
4. Check for port conflicts
5. Review recent code changes

#### 2. Database Connection Issues

**Symptoms:**
- Timeout errors
- Connection pool exhausted
- Slow queries

**Diagnosis:**
```bash
# Check connection pool status
mongo "$MONGODB_URI" --eval "db.serverStatus().connections"

# Check slow queries
mongo "$MONGODB_URI" --eval "db.currentOp({\"secs_running\":{\"$gt\":5}})"

# Check replica set status
mongo "$MONGODB_URI" --eval "rs.status()"
```

**Resolution:**
1. Increase connection pool size
2. Add missing database indexes
3. Kill long-running queries
4. Scale database resources

#### 3. Payment Processing Failures

**Symptoms:**
- Payment timeouts
- Webhook failures
- Transaction mismatches

**Diagnosis:**
```bash
# Check payment service logs
kubectl logs deployment/trm-app -c app | grep -i payment

# Verify webhook endpoints
curl -X POST https://api.trm-platform.com/webhooks/kbzpay -d "{}"

# Check payment provider status
# Visit provider status pages
```

**Resolution:**
1. Verify API keys are valid
2. Check webhook URL accessibility
3. Review payment provider status
4. Run reconciliation script: `npm run payment:reconcile`

#### 4. High Memory Usage

**Symptoms:**
- OOM kills
- Slow response times
- Garbage collection pauses

**Diagnosis:**
```bash
# Check memory usage
kubectl top pods

# Heap dump analysis
node --heapsnapshot-near-heap-limit=3 server.js

# Memory profiling
clinic doctor -- node server.js
```

**Resolution:**
1. Increase container memory limits
2. Optimize memory-intensive operations
3. Review for memory leaks
4. Implement caching strategies

### Emergency Contacts

| Issue Type | Contact | Method | Response Time |
|------------|---------|--------|---------------|
| Critical Outage | On-call Engineer | PagerDuty | 15 minutes |
| Security Incident | Security Team | Email/Phone | 30 minutes |
| Payment Issues | Finance Team | Email | 1 hour |
| Data Issues | DBA Team | Email | 2 hours |

---

## 📞 Contact Information

### Development Team

| Role | Name | Email | Phone |
|------|------|-------|-------|
| Project Manager | [Name] | [email] | [phone] |
| Technical Lead | [Name] | [email] | [phone] |
| DevOps Lead | [Name] | [email] | [phone] |
| QA Lead | [Name] | [email] | [phone] |

### Operations Team

| Role | Name | Email | Phone |
|------|------|-------|-------|
| Operations Manager | [Name] | [email] | [phone] |
| System Administrator | [Name] | [email] | [phone] |
| Database Administrator | [Name] | [email] | [phone] |

### Third-Party Support

| Service | Provider | Support URL | Phone |
|---------|----------|-------------|-------|
| MongoDB Atlas | MongoDB | support.mongodb.com | - |
| Redis Cloud | Redis Labs | support.redislabs.com | - |
| AWS | Amazon | aws.amazon.com/support | - |
| SendGrid | Twilio | support.sendgrid.com | - |
| KBZPay | KBZ Bank | [Support URL] | [Phone] |
| WavePay | Wave Money | [Support URL] | [Phone] |

### Escalation Path

1. **Level 1:** Operations Team (First Response)
2. **Level 2:** Technical Lead (Complex Issues)
3. **Level 3:** Development Team (Code Changes)
4. **Level 4:** External Vendors (Third-party Issues)

---

## 📎 Appendices

### Appendix A: File Locations

| Resource | Path | Description |
|----------|------|-------------|
| Source Code | `/server/` | Backend code |
| Frontend | `/src/` | React application |
| Mobile | `/mobile/` | Mobile application |
| Documentation | `/docs/` | All documentation |
| Tests | `/tests/`, `/e2e/` | Test suites |
| Configs | `/k8s/`, `/docker/` | Deployment configs |
| Scripts | `/scripts/` | Utility scripts |

### Appendix B: Useful Commands

```bash
# Application
npm start              # Start production server
npm run dev            # Start development server
npm run build          # Build frontend
npm test               # Run tests

# Database
npm run seed           # Seed database
npm run db:indexes     # Create indexes
npm run db:migrate     # Run migrations

# Maintenance
npm run security:audit     # Security audit
npm run payment:reconcile  # Reconcile payments
npm run perf:cache:clear   # Clear cache

# Deployment
kubectl apply -f k8s/              # Deploy to Kubernetes
kubectl logs -f deployment/trm-app # View logs
kubectl exec -it deployment/trm-app -- /bin/sh  # Shell access
```

### Appendix C: Scheduled Jobs

| Job | Schedule | Command | Purpose |
|-----|----------|---------|---------|
| Analytics | Hourly | analyticsCron.js | Process events |
| Billing | Daily | billingCron.js | Generate invoices |
| Payouts | Daily | payoutCron.js | Process payouts |
| Leaderboard | Hourly | leaderboardCron.js | Update rankings |
| Backup | Daily | backup.sh | Database backup |

### Appendix D: Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-02-06 | 1.0.0 | Initial production release | Dev Team |

---

## ✅ Handover Checklist

### Pre-Handover

- [ ] All documentation completed
- [ ] Code repositories transferred
- [ ] Credentials securely shared
- [ ] Environment setup documented
- [ ] Runbooks created

### Knowledge Transfer Sessions

- [ ] Architecture overview (2 hours)
- [ ] Deployment walkthrough (2 hours)
- [ ] Troubleshooting session (2 hours)
- [ ] Security review (1 hour)
- [ ] Q&A session (2 hours)

### Post-Handover Support

- [ ] 30-day support period agreed
- [ ] Support SLA defined
- [ ] Escalation process documented
- [ ] Handover sign-off completed

---

## 📝 Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Handing Over (Dev) | _________________ | _________________ | _______ |
| Handing Over (Ops) | _________________ | _________________ | _______ |
| Receiving (Ops) | _________________ | _________________ | _______ |
| Receiving (Management) | _________________ | _________________ | _______ |
| Witness | _________________ | _________________ | _______ |

---

**Document Control:**
- Version: 1.0
- Last Updated: February 6, 2026
- Next Review: March 6, 2026
- Owner: Operations Team

---

*This document contains sensitive information. Handle according to company data classification policies.*
