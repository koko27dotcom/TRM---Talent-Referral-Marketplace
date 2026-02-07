# TRM Referral Platform - Maintenance Guide

> **Document Type:** Operations & Maintenance  
> **Version:** 1.0  
> **Date:** February 6, 2026  
> **Audience:** Operations Team, System Administrators

---

## 📋 Table of Contents

1. [Introduction](#introduction)
2. [Daily Maintenance Tasks](#daily-maintenance-tasks)
3. [Weekly Maintenance Tasks](#weekly-maintenance-tasks)
4. [Monthly Maintenance Tasks](#monthly-maintenance-tasks)
5. [Quarterly Maintenance Tasks](#quarterly-maintenance-tasks)
6. [Monitoring Procedures](#monitoring-procedures)
7. [Backup Verification](#backup-verification)
8. [Security Maintenance](#security-maintenance)
9. [Performance Optimization](#performance-optimization)
10. [Incident Response](#incident-response)
11. [Maintenance Windows](#maintenance-windows)
12. [Emergency Procedures](#emergency-procedures)

---

## 🎯 Introduction

This guide provides comprehensive maintenance procedures for the TRM Referral Platform. Follow these procedures to ensure the platform remains secure, performant, and reliable.

### Maintenance Philosophy

- **Proactive:** Prevent issues before they occur
- **Scheduled:** Perform maintenance during low-traffic windows
- **Documented:** Record all maintenance activities
- **Tested:** Verify all changes in staging first

---

## 📅 Daily Maintenance Tasks

### Morning Checks (09:00 AM)

#### 1. System Health Check

```bash
#!/bin/bash
# daily-health-check.sh

echo "=== TRM Daily Health Check ==="
echo "Date: $(date)"

# Check application health
echo "Checking application health..."
curl -s https://api.trm-platform.com/health | jq .

# Check database connections
echo "Checking database connections..."
kubectl exec -it deployment/mongodb -- mongosh --eval "db.serverStatus().connections"

# Check Redis
echo "Checking Redis..."
redis-cli -u $REDIS_URL ping

# Check error rates
echo "Checking error rates (last 1 hour)..."
# Query Prometheus for error rate

# Check disk space
echo "Checking disk space..."
kubectl exec -it deployment/trm-app -- df -h

echo "=== Health Check Complete ==="
```

**Expected Results:**
- Application: HTTP 200, status "healthy"
- Database: Connections < 80% of max
- Redis: PONG response
- Error rate: < 1%
- Disk usage: < 80%

#### 2. Log Review

```bash
# Review error logs from last 24 hours
echo "Error count by service (last 24h):"
kubectl logs --since=24h deployment/trm-app | grep -i error | wc -l

# Review payment failures
echo "Payment failures (last 24h):"
kubectl logs --since=24h deployment/trm-app | grep -i "payment.*fail" | wc -l

# Review security events
echo "Security events (last 24h):"
kubectl logs --since=24h deployment/trm-app | grep -i "security\|unauthorized\|blocked" | wc -l
```

#### 3. Business Metrics Review

| Metric | Normal Range | Action if Outside Range |
|--------|--------------|------------------------|
| User Registrations | 50-200/day | Investigate if < 20 or > 500 |
| Job Postings | 10-50/day | Investigate if < 5 or > 100 |
| Referrals | 20-100/day | Investigate if < 10 or > 200 |
| Payments | 10-50/day | Investigate if < 5 or > 100 |
| Error Rate | < 1% | Investigate if > 2% |

### Evening Checks (06:00 PM)

#### 4. Backup Verification

```bash
# Verify last night's backup
echo "Checking backup status..."
aws s3 ls s3://trm-backups/mongodb/$(date +%Y%m%d) --recursive | tail -5

# Check backup size
echo "Backup size:"
aws s3 ls s3://trm-backups/mongodb/$(date +%Y%m%d) --recursive --human-readable --summarize
```

#### 5. Cron Job Status

```bash
# Check cron job execution
echo "Cron job status (last 24h):"
kubectl logs --since=24h deployment/trm-app | grep -i "cron\|scheduled" | tail -20
```

---

## 📅 Weekly Maintenance Tasks

### Monday: Security Review

#### 1. Security Log Analysis

```bash
# Failed login attempts
echo "Failed login attempts (last 7 days):"
kubectl logs --since=168h deployment/trm-app | grep -i "login.*fail\|auth.*fail" | wc -l

# Suspicious activities
echo "Suspicious activities:"
kubectl logs --since=168h deployment/trm-app | grep -i "suspicious\|attack\|injection" | head -20

# Rate limiting events
echo "Rate limiting events:"
kubectl logs --since=168h deployment/trm-app | grep -i "rate.*limit\|too.*many.*request" | wc -l
```

#### 2. SSL Certificate Check

```bash
# Check SSL certificate expiration
echo "SSL Certificate Expiry:"
echo | openssl s_client -servername trm-platform.com -connect trm-platform.com:443 2>/dev/null | openssl x509 -noout -dates

# Alert if expiring within 30 days
EXPIRY=$(echo | openssl s_client -servername trm-platform.com -connect trm-platform.com:443 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
NOW_EPOCH=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_EPOCH - $NOW_EPOCH) / 86400 ))

if [ $DAYS_UNTIL_EXPIRY -lt 30 ]; then
    echo "WARNING: SSL certificate expires in $DAYS_UNTIL_EXPIRY days!"
fi
```

### Wednesday: Performance Review

#### 1. Database Performance

```bash
# Check slow queries
echo "Top 10 slow queries (last 7 days):"
mongosh "$MONGODB_URI" --eval "
db.system.profile.find().sort({ts:-1}).limit(10).forEach(printjson)
"

# Check index usage
echo "Index usage statistics:"
mongosh "$MONGODB_URI" --eval "
db.collectionName.aggregate([
  {\$indexStats: {}},
  {\$sort: {accesses.ops: -1}}
])
"

# Check collection sizes
echo "Collection sizes:"
mongosh "$MONGODB_URI" --eval "
db.getCollectionNames().forEach(function(collection) {
  var stats = db[collection].stats();
  print(collection + ': ' + (stats.size / 1024 / 1024).toFixed(2) + ' MB');
});
"
```

#### 2. Cache Performance

```bash
# Redis memory usage
echo "Redis memory usage:"
redis-cli -u $REDIS_URL INFO memory | grep used_memory_human

# Cache hit rate
echo "Cache statistics:"
redis-cli -u $REDIS_URL INFO stats | grep -E "keyspace_hits|keyspace_misses"

# Calculate hit rate
HITS=$(redis-cli -u $REDIS_URL INFO stats | grep keyspace_hits | cut -d: -f2)
MISSES=$(redis-cli -u $REDIS_URL INFO stats | grep keyspace_misses | cut -d: -f2)
if [ $((HITS + MISSES)) -gt 0 ]; then
  HIT_RATE=$(echo "scale=2; $HITS / ($HITS + $MISSES) * 100" | bc)
  echo "Cache hit rate: ${HIT_RATE}%"
fi
```

### Friday: Dependency Review

#### 1. Dependency Updates Check

```bash
# Check for outdated npm packages
echo "Outdated npm packages:"
npm outdated

# Check for security vulnerabilities
echo "Security audit:"
npm audit --audit-level=moderate

# Check for major version updates
echo "Major version updates available:"
npm outdated | grep -E "^\S+\s+\S+\s+\S+\s+[0-9]+\." || echo "No major updates"
```

---

## 📅 Monthly Maintenance Tasks

### Week 1: Full System Review

#### 1. Capacity Planning

```bash
# Database growth rate
echo "Database growth (last 30 days):"
mongosh "$MONGODB_URI" --eval "
var stats = db.stats();
print('Data size: ' + (stats.dataSize / 1024 / 1024 / 1024).toFixed(2) + ' GB');
print('Storage size: ' + (stats.storageSize / 1024 / 1024 / 1024).toFixed(2) + ' GB');
print('Index size: ' + (stats.indexSize / 1024 / 1024 / 1024).toFixed(2) + ' GB');
"

# Project growth for next quarter
# Current growth rate ~10% per month
# Recommend scaling if > 70% capacity
```

#### 2. User Activity Analysis

```bash
# Monthly active users
echo "Monthly Active Users (MAU):"
mongosh "$MONGODB_URI" --eval "
db.users.countDocuments({
  lastLogin: {\$gte: new Date(Date.now() - 30*24*60*60*1000)}
})
"

# New registrations
echo "New registrations (last 30 days):"
mongosh "$MONGODB_URI" --eval "
db.users.countDocuments({
  createdAt: {\$gte: new Date(Date.now() - 30*24*60*60*1000)}
})
"

# Churned users
echo "Churned users (inactive > 60 days):"
mongosh "$MONGODB_URI" --eval "
db.users.countDocuments({
  lastLogin: {\$lt: new Date(Date.now() - 60*24*60*60*1000)}
})
"
```

### Week 2: Security Maintenance

#### 1. Access Review

```bash
# List all admin users
echo "Admin users:"
mongosh "$MONGODB_URI" --eval "
db.users.find({role: 'admin'}, {email: 1, lastLogin: 1, createdAt: 1}).forEach(printjson)
"

# Check for inactive admin accounts
echo "Inactive admin accounts (> 90 days):"
mongosh "$MONGODB_URI" --eval "
db.users.find({
  role: 'admin',
  lastLogin: {\$lt: new Date(Date.now() - 90*24*60*60*1000)}
}).forEach(printjson)
"

# Review API keys
echo "Active API keys:"
mongosh "$MONGODB_URI" --eval "
db.apikeys.find({isActive: true}, {name: 1, createdAt: 1, lastUsed: 1}).forEach(printjson)
"
```

#### 2. Encryption Key Rotation

```bash
# Rotate encryption keys (quarterly)
echo "Rotating encryption keys..."
npm run security:rotate-keys

# Verify rotation
echo "Verifying key rotation..."
# Check that new keys are being used
```

### Week 3: Documentation Review

#### 1. Update Runbooks

- Review and update troubleshooting procedures
- Document any new issues encountered
- Update contact information
- Review and update escalation procedures

#### 2. Review Monitoring Dashboards

- Verify all alerts are functioning
- Update alert thresholds if needed
- Add new metrics if required
- Review and update SLOs/SLIs

### Week 4: Disaster Recovery Test

#### 1. Backup Restoration Test

```bash
# Test database restoration
echo "Testing database restoration..."

# Create test restore
mongorestore --uri="$MONGODB_URI_TEST" --drop /backups/$(date +%Y%m%d)

# Verify data integrity
echo "Verifying restored data..."
mongosh "$MONGODB_URI_TEST" --eval "db.stats()"

# Run test queries
echo "Running test queries..."
mongosh "$MONGODB_URI_TEST" --eval "db.users.countDocuments()"
```

#### 2. Failover Test

```bash
# Test application failover
echo "Testing application failover..."

# Simulate pod failure
kubectl delete pod -l app=trm-app --grace-period=0

# Verify new pod starts
kubectl rollout status deployment/trm-app

# Verify application health
curl -s https://api.trm-platform.com/health | jq .
```

---

## 📅 Quarterly Maintenance Tasks

### Q1: Architecture Review

#### 1. Technical Debt Assessment

Review and prioritize technical debt items:
- Code refactoring needs
- Dependency updates
- Performance optimizations
- Security improvements

#### 2. Scaling Review

- Review current capacity vs. growth projections
- Plan infrastructure scaling
- Update auto-scaling policies
- Review cost optimization opportunities

### Q2: Security Audit

#### 1. Penetration Testing

- Schedule external penetration test
- Review findings
- Implement remediation
- Re-test vulnerabilities

#### 2. Compliance Review

- Review data privacy compliance
- Update privacy policy if needed
- Review data retention policies
- Audit data access logs

### Q3: Performance Optimization

#### 1. Database Optimization

```bash
# Analyze query performance
echo "Analyzing query performance..."
mongosh "$MONGODB_URI" --eval "
db.currentOp({\'secs_running\': {\$gt: 1}})
"

# Review and add indexes
echo "Reviewing index usage..."
npm run db:indexes:health

# Compact collections if needed
echo "Compacting collections..."
mongosh "$MONGODB_URI" --eval "
db.getCollectionNames().forEach(function(c) {
  if (db[c].stats().storageSize > 1024*1024*1024) {
    print('Compacting: ' + c);
    db.runCommand({compact: c});
  }
});
"
```

#### 2. Application Optimization

- Review and optimize slow API endpoints
- Optimize frontend bundle size
- Review and update caching strategies
- Optimize database queries

### Q4: Disaster Recovery Drill

#### 1. Full DR Test

- Simulate complete datacenter failure
- Test failover to DR site
- Verify RTO/RPO targets
- Document lessons learned

#### 2. Business Continuity Review

- Update business continuity plan
- Review and update contact lists
- Test communication procedures
- Update recovery procedures

---

## 📊 Monitoring Procedures

### Key Metrics Dashboard

Access dashboards at:
- Application: http://grafana.trm-platform.com/d/app
- Infrastructure: http://grafana.trm-platform.com/d/infra
- Business: http://grafana.trm-platform.com/d/business

### Alert Response

| Severity | Response Time | Action |
|----------|---------------|--------|
| Critical | 15 minutes | Page on-call engineer |
| High | 30 minutes | Notify team lead |
| Medium | 2 hours | Create ticket |
| Low | 24 hours | Review in next standup |

### Log Analysis

```bash
# Search logs for specific error
echo "Searching for error pattern..."
kubectl logs --since=24h deployment/trm-app | grep -i "error_pattern"

# Export logs for analysis
echo "Exporting logs..."
kubectl logs --since=24h deployment/trm-app > /tmp/trm-logs-$(date +%Y%m%d).log

# Analyze log patterns
echo "Top error patterns:"
grep -oE "Error: [^ ]+" /tmp/trm-logs-$(date +%Y%m%d).log | sort | uniq -c | sort -rn | head -10
```

---

## 💾 Backup Verification

### Daily Backup Check

```bash
#!/bin/bash
# backup-verification.sh

BACKUP_DATE=$(date +%Y%m%d)
BACKUP_PATH="s3://trm-backups/mongodb/$BACKUP_DATE"

echo "Verifying backup for $BACKUP_DATE..."

# Check backup exists
if aws s3 ls $BACKUP_PATH > /dev/null 2>&1; then
    echo "✓ Backup exists"
else
    echo "✗ Backup missing!"
    exit 1
fi

# Check backup size
SIZE=$(aws s3 ls $BACKUP_PATH --recursive --summarize | grep "Total Size" | awk '{print $3}')
if [ $SIZE -gt 1000000 ]; then
    echo "✓ Backup size valid ($SIZE bytes)"
else
    echo "✗ Backup size suspicious ($SIZE bytes)"
    exit 1
fi

# Test restore to staging (weekly)
if [ $(date +%u) -eq 7 ]; then
    echo "Testing restore to staging..."
    # Restore to staging and verify
fi

echo "Backup verification complete"
```

---

## 🔒 Security Maintenance

### Daily Security Tasks

- Review security alerts
- Check failed login attempts
- Monitor for suspicious activities
- Verify WAF rules

### Weekly Security Tasks

- Review access logs
- Check for new vulnerabilities
- Update threat intelligence
- Review firewall rules

### Monthly Security Tasks

- Review user access permissions
- Audit API key usage
- Update security policies
- Review incident reports

### Security Incident Response

```bash
# Isolate compromised component
kubectl scale deployment trm-app --replicas=0

# Capture forensic data
kubectl logs deployment/trm-app --previous > /tmp/incident-logs-$(date +%Y%m%d-%H%M).log

# Notify security team
curl -X POST $SECURITY_WEBHOOK -d '{"severity":"critical","message":"Security incident detected"}'
```

---

## ⚡ Performance Optimization

### Database Optimization

```bash
# Identify slow queries
echo "Slow queries (top 10):"
mongosh "$MONGODB_URI" --eval "
db.system.profile.find().sort({millis:-1}).limit(10).forEach(function(q) {
  print(q.ns + ': ' + q.millis + 'ms');
  printjson(q.command);
})
"

# Add missing indexes
echo "Adding recommended indexes..."
npm run db:indexes:create

# Update query optimizer
echo "Updating query optimizer..."
npm run monitor:queries:stats
```

### Cache Optimization

```bash
# Clear stale cache
echo "Clearing stale cache..."
npm run perf:cache:clear

# Warm cache
echo "Warming cache..."
npm run perf:cache:warm

# Monitor cache performance
echo "Cache statistics:"
npm run perf:cache:stats
```

---

## 🚨 Incident Response

### Incident Classification

| Severity | Definition | Examples |
|----------|------------|----------|
| P1 - Critical | Complete outage | Database down, all services unavailable |
| P2 - High | Major functionality impaired | Payment processing down, auth failures |
| P3 - Medium | Minor functionality impaired | Slow performance, non-critical features down |
| P4 - Low | No immediate impact | Warnings, cosmetic issues |

### Incident Response Procedure

1. **Detect:** Monitoring alert or user report
2. **Assess:** Determine severity and impact
3. **Respond:** Execute appropriate runbook
4. **Communicate:** Notify stakeholders
5. **Resolve:** Fix the issue
6. **Review:** Post-incident review

### Communication Templates

#### P1 Incident Notification

```
🚨 CRITICAL INCIDENT 🚨

Service: TRM Platform
Impact: Complete outage
Started: [TIME]
Status: Investigating

We are aware of an issue affecting the TRM Platform. 
Our team is investigating and will provide updates every 15 minutes.

Next update: [TIME + 15 min]
```

---

## 🕐 Maintenance Windows

### Scheduled Maintenance

| Window | Frequency | Duration | Activities |
|--------|-----------|----------|------------|
| Sunday 02:00-04:00 | Weekly | 2 hours | Patches, updates |
| First Sunday | Monthly | 4 hours | Major updates |
| Quarterly | Quarterly | 8 hours | Major releases |

### Maintenance Notification

**Advance Notice:**
- Weekly: 48 hours
- Monthly: 1 week
- Quarterly: 2 weeks

### Maintenance Checklist

- [ ] Notify users in advance
- [ ] Prepare rollback plan
- [ ] Verify backups
- [ ] Execute maintenance
- [ ] Verify functionality
- [ ] Notify users of completion

---

## 📋 Maintenance Log Template

```
Date: [YYYY-MM-DD]
Performed By: [Name]
Type: [Daily/Weekly/Monthly/Quarterly]

Tasks Completed:
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

Issues Found:
- Issue 1: [Description] - [Resolution]

Next Actions:
- [ ] Action 1
- [ ] Action 2

Notes:
[Additional notes]
```

---

## 📞 Emergency Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| On-call Engineer | [Name] | [Phone] | [Email] |
| Team Lead | [Name] | [Phone] | [Email] |
| Security Team | [Name] | [Phone] | [Email] |
| Infrastructure | [Name] | [Phone] | [Email] |

---

## ✅ Maintenance Checklist Summary

### Daily
- [ ] System health check
- [ ] Log review
- [ ] Business metrics review
- [ ] Backup verification

### Weekly
- [ ] Security log analysis
- [ ] SSL certificate check
- [ ] Database performance review
- [ ] Cache performance review
- [ ] Dependency update check

### Monthly
- [ ] Capacity planning review
- [ ] User activity analysis
- [ ] Access review
- [ ] Documentation update
- [ ] Backup restoration test

### Quarterly
- [ ] Architecture review
- [ ] Security audit
- [ ] Performance optimization
- [ ] Disaster recovery drill
- [ ] Business continuity review

---

**Document Control:**
- Version: 1.0
- Last Updated: February 6, 2026
- Next Review: March 6, 2026
- Owner: Operations Team

---

*This guide should be reviewed and updated monthly to ensure accuracy and completeness.*
