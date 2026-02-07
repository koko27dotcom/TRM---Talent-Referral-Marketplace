# TRM Referral Platform - Pre-Deployment Checklist

**Version:** 1.0.0  
**Date:** February 6, 2026  
**Status:** Production Ready

---

## Overview

This checklist must be completed before deploying the TRM Referral Platform to production. Each item must be verified and signed off by the responsible team member.

---

## 1. Code Quality & Testing

### 1.1 Unit Tests
- [ ] All unit tests passing (>90% coverage)
- [ ] Frontend unit tests passing
- [ ] Backend unit tests passing
- [ ] Mobile app unit tests passing

**Verification:**
```bash
npm run test:unit
npm run test:unit:frontend
```

**Sign-off:** _________________ Date: _______

### 1.2 Integration Tests
- [ ] API route integration tests passing
- [ ] Database integration tests passing
- [ ] Redis caching tests passing
- [ ] Queue processing tests passing
- [ ] Webhook integration tests passing

**Verification:**
```bash
npm run test:integration
```

**Sign-off:** _________________ Date: _______

### 1.3 End-to-End Tests
- [ ] Referral flow E2E tests passing
- [ ] Payment flow E2E tests passing
- [ ] Academy flow E2E tests passing
- [ ] Authentication flow E2E tests passing

**Verification:**
```bash
npm run test:e2e
```

**Sign-off:** _________________ Date: _______

### 1.4 Performance Tests
- [ ] Load testing completed (100+ concurrent users)
- [ ] API response times within SLA (<500ms p95)
- [ ] Database query performance verified
- [ ] Cache hit rate >80%

**Verification:**
```bash
npm run test:load
npm run test:performance
```

**Sign-off:** _________________ Date: _______

### 1.5 Security Tests
- [ ] Authentication security tests passing
- [ ] Authorization tests passing
- [ ] Input sanitization tests passing
- [ ] CORS configuration verified
- [ ] Security headers verified

**Verification:**
```bash
npm run test:security
npm run security:audit
```

**Sign-off:** _________________ Date: _______

---

## 2. Infrastructure

### 2.1 Database
- [ ] MongoDB cluster provisioned
- [ ] Database indexes created
- [ ] Backup procedures configured
- [ ] Monitoring enabled
- [ ] Connection pooling configured

**Verification:**
```bash
npm run db:indexes:verify
npm run db:backup:test
```

**Sign-off:** _________________ Date: _______

### 2.2 Caching
- [ ] Redis cluster provisioned
- [ ] Redis persistence configured
- [ ] Cache warming scripts ready
- [ ] Eviction policies configured

**Verification:**
```bash
npm run redis:status
npm run perf:cache:warm
```

**Sign-off:** _________________ Date: _______

### 2.3 Message Queue
- [ ] Bull queue workers configured
- [ ] Queue monitoring enabled
- [ ] Retry policies configured
- [ ] Dead letter queue set up

**Verification:**
```bash
npm run queue:status
```

**Sign-off:** _________________ Date: _______

### 2.4 Load Balancer
- [ ] Load balancer configured
- [ ] SSL certificates installed
- [ ] Health check endpoints configured
- [ ] Sticky sessions configured (if needed)

**Verification:**
```bash
curl https://api.myanjobs.com/api/health
curl https://api.myanjobs.com/api/health/ready
```

**Sign-off:** _________________ Date: _______

### 2.5 CDN
- [ ] CDN configured for static assets
- [ ] Cache rules configured
- [ ] SSL/TLS configured
- [ ] Origin health checks enabled

**Sign-off:** _________________ Date: _______

---

## 3. Security

### 3.1 Authentication & Authorization
- [ ] JWT secrets rotated
- [ ] Encryption keys generated
- [ ] API keys created for production
- [ ] OAuth credentials configured
- [ ] Session configuration reviewed

**Verification:**
```bash
npm run security:verify-keys
```

**Sign-off:** _________________ Date: _______

### 3.2 Payment Security
- [ ] Payment provider webhooks secured
- [ ] Webhook secrets configured
- [ ] PCI compliance verified (if applicable)
- [ ] Payment encryption enabled
- [ ] Fraud detection configured

**Verification:**
```bash
npm run payment:verify-security
```

**Sign-off:** _________________ Date: _______

### 3.3 Data Protection
- [ ] Data encryption at rest enabled
- [ ] Data encryption in transit enabled (TLS 1.3)
- [ ] PII handling procedures documented
- [ ] Data retention policies configured
- [ ] GDPR compliance verified

**Sign-off:** _________________ Date: _______

### 3.4 Network Security
- [ ] Firewall rules configured
- [ ] DDoS protection enabled
- [ ] IP whitelisting configured (if needed)
- [ ] VPN access configured for admin
- [ ] Security groups reviewed

**Sign-off:** _________________ Date: _______

---

## 4. Third-Party Integrations

### 4.1 Payment Providers
- [ ] KBZPay integration tested
- [ ] WavePay integration tested
- [ ] AYA Pay integration tested
- [ ] MMQR integration tested
- [ ] Webhook endpoints registered
- [ ] Callback URLs configured

**Verification:**
```bash
npm run payment:test:all
```

**Sign-off:** _________________ Date: _______

### 4.2 Messaging Services
- [ ] Viber bot configured
- [ ] Telegram bot configured
- [ ] Email service (SendGrid) configured
- [ ] SMS service configured
- [ ] Webhook endpoints registered

**Verification:**
```bash
npm run messaging:test:all
```

**Sign-off:** _________________ Date: _______

### 4.3 External APIs
- [ ] OpenAI API key configured
- [ ] Google Analytics configured
- [ ] Facebook Pixel configured
- [ ] Sentry DSN configured
- [ ] Monitoring tools configured

**Sign-off:** _________________ Date: _______

---

## 5. Monitoring & Alerting

### 5.1 Application Monitoring
- [ ] APM tool configured (Datadog/New Relic)
- [ ] Custom metrics defined
- [ ] Dashboards created
- [ ] Log aggregation configured
- [ ] Distributed tracing enabled

**Sign-off:** _________________ Date: _______

### 5.2 Infrastructure Monitoring
- [ ] Server metrics collection enabled
- [ ] Database monitoring enabled
- [ ] Redis monitoring enabled
- [ ] Network monitoring enabled
- [ ] Disk usage alerts configured

**Sign-off:** _________________ Date: _______

### 5.3 Business Metrics
- [ ] Referral conversion tracking
- [ ] Payment success rate tracking
- [ ] User engagement metrics
- [ ] Revenue tracking
- [ ] Academy completion rates

**Sign-off:** _________________ Date: _______

### 5.4 Alerting
- [ ] PagerDuty/Opsgenie integration
- [ ] Alert thresholds configured
- [ ] On-call rotation configured
- [ ] Escalation policies defined
- [ ] Alert channels verified (email, SMS, Slack)

**Verification:**
```bash
npm run alerts:test
```

**Sign-off:** _________________ Date: _______

---

## 6. Documentation

### 6.1 Technical Documentation
- [ ] API documentation updated
- [ ] Architecture diagrams current
- [ ] Database schema documented
- [ ] Deployment procedures documented
- [ ] Runbooks created

**Sign-off:** _________________ Date: _______

### 6.2 User Documentation
- [ ] User guides updated
- [ ] FAQ updated
- [ ] Video tutorials ready
- [ ] Help center content reviewed

**Sign-off:** _________________ Date: _______

### 6.3 Operational Documentation
- [ ] Troubleshooting guide ready
- [ ] Incident response procedures
- [ ] Rollback procedures documented
- [ ] Contact lists updated
- [ ] Escalation matrix defined

**Sign-off:** _________________ Date: _______

---

## 7. Environment Configuration

### 7.1 Environment Variables
- [ ] Production .env file created
- [ ] All required variables set
- [ ] Secrets stored in vault
- [ ] Configuration validated
- [ ] No hardcoded secrets in code

**Verification:**
```bash
npm run config:verify
```

**Sign-off:** _________________ Date: _______

### 7.2 Feature Flags
- [ ] Feature flags configured
- [ ] Gradual rollout plan defined
- [ ] Kill switches identified
- [ ] A/B test configuration ready

**Sign-off:** _________________ Date: _______

---

## 8. Data Migration

### 8.1 Database Migration
- [ ] Migration scripts tested
- [ ] Rollback scripts prepared
- [ ] Data validation scripts ready
- [ ] Migration window scheduled
- [ ] Downtime communicated

**Verification:**
```bash
npm run db:migrate:verify
```

**Sign-off:** _________________ Date: _______

### 8.2 Data Seeding
- [ ] Production data seeded
- [ ] Test accounts created
- [ ] Sample content loaded
- [ ] Admin accounts configured

**Sign-off:** _________________ Date: _______

---

## 9. Deployment Preparation

### 9.1 Build & Packaging
- [ ] Production build created
- [ ] Docker images built
- [ ] Images scanned for vulnerabilities
- [ ] Version tags applied
- [ ] Artifacts stored in registry

**Verification:**
```bash
docker build -t myanjobs-api:prod .
docker scan myanjobs-api:prod
```

**Sign-off:** _________________ Date: _______

### 9.2 Deployment Scripts
- [ ] Deployment scripts tested
- [ ] Blue/green deployment configured
- [ ] Canary deployment ready
- [ ] Rollback scripts tested
- [ ] Database migration scripts ready

**Verification:**
```bash
npm run deploy:staging
npm run deploy:rollback:test
```

**Sign-off:** _________________ Date: _______

---

## 10. Go-Live Preparation

### 10.1 Communication
- [ ] Stakeholders notified
- [ ] Users informed of maintenance window
- [ ] Support team briefed
- [ ] Status page prepared
- [ ] Social media announcements ready

**Sign-off:** _________________ Date: _______

### 10.2 Support Readiness
- [ ] Support team trained
- [ ] Escalation procedures reviewed
- [ ] Known issues documented
- [ ] Quick fixes prepared
- [ ] On-call schedule confirmed

**Sign-off:** _________________ Date: _______

### 10.3 Rollback Plan
- [ ] Rollback criteria defined
- [ ] Rollback procedure tested
- [ ] Rollback window defined (< 30 minutes)
- [ ] Data consistency checks defined
- [ ] Communication templates ready

**Sign-off:** _________________ Date: _______

---

## 11. Post-Deployment Verification

### 11.1 Smoke Tests
- [ ] Health checks passing
- [ ] Critical user flows working
- [ ] Payment processing working
- [ ] Notifications delivering
- [ ] Login/logout working

**Verification:**
```bash
npm run deploy:verify
```

**Sign-off:** _________________ Date: _______

### 11.2 Monitoring
- [ ] Error rates normal
- [ ] Response times within SLA
- [ ] All services healthy
- [ ] No critical alerts
- [ ] Business metrics tracking

**Sign-off:** _________________ Date: _______

---

## Final Approval

### Deployment Authorization

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | | | |
| Tech Lead | | | |
| QA Lead | | | |
| DevOps Lead | | | |
| Security Lead | | | |

### Deployment Window

**Scheduled Date:** _______________  
**Start Time:** _______________  
**Expected Duration:** _______________  
**Rollback Deadline:** _______________

### Notes

_____________________________________________  
_____________________________________________  
_____________________________________________

---

## Quick Reference

### Emergency Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| On-Call Engineer | | | |
| DevOps Lead | | | |
| Database Admin | | | |
| Security Lead | | | |
| Product Owner | | | |

### Important URLs

- **Production:** https://myanjobs.com
- **API:** https://api.myanjobs.com
- **Admin:** https://admin.myanjobs.com
- **Status Page:** https://status.myanjobs.com
- **Monitoring:** https://grafana.myanjobs.com

### Useful Commands

```bash
# Check deployment status
kubectl get pods -n production

# View logs
kubectl logs -f deployment/myanjobs-api -n production

# Scale deployment
kubectl scale deployment myanjobs-api --replicas=5 -n production

# Rollback
kubectl rollout undo deployment/myanjobs-api -n production

# Check health
curl https://api.myanjobs.com/api/health/deep
```

---

**Document Version:** 1.0.0  
**Last Updated:** February 6, 2026  
**Next Review:** Per deployment
