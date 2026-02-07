# TRM Referral Platform - Troubleshooting Guide

**Version:** 1.0.0  
**Last Updated:** February 6, 2026

---

## Table of Contents

1. [Quick Diagnostics](#1-quick-diagnostics)
2. [Common Issues](#2-common-issues)
3. [Database Issues](#3-database-issues)
4. [Payment Issues](#4-payment-issues)
5. [Performance Issues](#5-performance-issues)
6. [Security Issues](#6-security-issues)
7. [Third-Party Integration Issues](#7-third-party-integration-issues)
8. [Emergency Procedures](#8-emergency-procedures)

---

## 1. Quick Diagnostics

### 1.1 Health Check Commands

```bash
# Check application health
curl https://api.myanjobs.com/api/health

# Check readiness (includes DB, Redis)
curl https://api.myanjobs.com/api/health/ready

# Check deep health (includes performance metrics)
curl https://api.myanjobs.com/api/health/deep

# Check Kubernetes liveness
curl https://api.myanjobs.com/api/health/live
```

### 1.2 Log Locations

```bash
# Application logs
kubectl logs -f deployment/myanjobs-api -n production

# Database logs
kubectl logs -f statefulset/mongodb -n production

# Redis logs
kubectl logs -f statefulset/redis -n production

# Payment service logs
kubectl logs -f deployment/payment-worker -n production
```

### 1.3 Common Diagnostic Queries

```bash
# Check database connection
npm run db:status

# Check Redis connection
npm run redis:status

# Check queue status
npm run queue:status

# Check payment reconciliation
npm run payment:reconcile
```

---

## 2. Common Issues

### 2.1 Application Won't Start

**Symptoms:**
- Service fails to start
- Error in startup logs
- Health check returns 503

**Diagnosis:**
```bash
# Check environment variables
node -e "console.log(process.env.NODE_ENV)"

# Verify database connection
node -e "require('./server/config/database').connectDatabase()"

# Check port availability
lsof -i :3000
```

**Solutions:**

1. **Missing Environment Variables**
   ```bash
   # Check required variables
   ./scripts/verify-env.sh
   
   # Copy from example
   cp .env.example .env
   # Edit .env with actual values
   ```

2. **Database Connection Failed**
   - Verify MongoDB URI format
   - Check network connectivity
   - Verify credentials
   - Check MongoDB server status

3. **Port Already in Use**
   ```bash
   # Find and kill process
   kill $(lsof -t -i:3000)
   
   # Or change port
   PORT=3001 npm start
   ```

### 2.2 High Error Rate

**Symptoms:**
- Error rate > 5%
- Multiple 500 errors
- Users reporting issues

**Diagnosis:**
```bash
# Check recent errors
npm run logs:errors -- --last=1h

# Check error distribution
npm run logs:analyze

# Check database performance
npm run db:performance
```

**Solutions:**

1. **Database Connection Pool Exhausted**
   ```javascript
   // Increase pool size in config/database.js
   maxPoolSize: 20  // Increase from 10
   ```

2. **Memory Issues**
   ```bash
   # Check memory usage
   npm run monitor:memory
   
   # Restart with more memory
   NODE_OPTIONS="--max-old-space-size=4096" npm start
   ```

3. **External Service Down**
   - Check payment provider status
   - Verify messaging service connectivity
   - Check webhook delivery status

---

## 3. Database Issues

### 3.1 Slow Queries

**Symptoms:**
- API response times > 1s
- Database CPU high
- Query timeout errors

**Diagnosis:**
```bash
# Get slow queries
npm run db:slow-queries

# Check index usage
npm run db:indexes:health

# Analyze query performance
npm run db:explain "db.referrals.find({status: 'pending'})"
```

**Solutions:**

1. **Missing Indexes**
   ```bash
   # Create recommended indexes
   npm run db:indexes:create
   
   # Verify indexes
   npm run db:indexes:verify
   ```

2. **Query Optimization**
   ```javascript
   // Add pagination
   .limit(20).skip(page * 20)
   
   // Use projection
   .select('field1 field2')
   
   // Use lean() for read-only
   .lean()
   ```

### 3.2 Connection Issues

**Symptoms:**
- "MongoNetworkError" in logs
- Intermittent connection failures
- "Topology was destroyed" errors

**Solutions:**

1. **Connection String Issues**
   ```bash
   # Test connection
   mongosh "mongodb+srv://user:pass@cluster.mongodb.net/test"
   ```

2. **Firewall/Network Issues**
   ```bash
   # Test connectivity
   telnet cluster.mongodb.net 27017
   
   # Check DNS resolution
   nslookup cluster.mongodb.net
   ```

3. **Connection Pool Settings**
   ```javascript
   // config/database.js
   maxPoolSize: 20,
   serverSelectionTimeoutMS: 5000,
   socketTimeoutMS: 45000,
   ```

### 3.3 Data Corruption

**Symptoms:**
- Invalid data errors
- Referential integrity issues
- Missing records

**Recovery:**

1. **Restore from Backup**
   ```bash
   # List available backups
   npm run backup:list
   
   # Restore specific backup
   npm run backup:restore -- --date=2026-02-05
   ```

2. **Data Repair**
   ```bash
   # Run data integrity check
   npm run db:repair
   
   # Fix orphaned records
   npm run db:cleanup
   ```

---

## 4. Payment Issues

### 4.1 Payment Not Processing

**Symptoms:**
- Payments stuck in "pending"
- Webhooks not received
- Balance not updating

**Diagnosis:**
```bash
# Check payment status
npm run payment:status -- --transactionId=xxx

# Check webhook logs
npm run logs:webhooks -- --provider=kbz_pay

# Reconcile payments
npm run payment:reconcile
```

**Solutions:**

1. **Webhook Issues**
   ```bash
   # Check webhook endpoint
   curl -X POST https://api.myanjobs.com/api/payments/webhook/kbz_pay \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   
   # Verify webhook secret
   npm run payment:verify-webhook -- --provider=kbz_pay
   ```

2. **Provider API Issues**
   - Check provider status page
   - Verify API credentials
   - Check rate limits

3. **Manual Reconciliation**
   ```bash
   # Reconcile specific date range
   npm run payment:reconcile -- --start=2026-02-01 --end=2026-02-06
   ```

### 4.2 Duplicate Payments

**Symptoms:**
- Multiple transactions for same payment
- User charged twice
- Balance incorrect

**Solution:**

1. **Check Idempotency**
   ```javascript
   // Verify idempotency key handling
   const existing = await PaymentTransaction.findOne({
     idempotencyKey: key,
   });
   ```

2. **Refund Duplicate**
   ```bash
   # Process refund
   npm run payment:refund -- --transactionId=xxx
   ```

### 4.3 Withdrawal Failures

**Symptoms:**
- Withdrawals stuck in processing
- User reports missing funds
- Provider errors

**Diagnosis:**
```bash
# Check withdrawal queue
npm run queue:status -- --queue=withdrawals

# Check provider logs
npm run logs:payments -- --type=withdrawal
```

**Solutions:**

1. **Retry Failed Withdrawals**
   ```bash
   npm run payment:retry-failed
   ```

2. **Manual Payout**
   ```bash
   npm run payment:manual-payout -- --userId=xxx --amount=50000
   ```

---

## 5. Performance Issues

### 5.1 High Response Times

**Symptoms:**
- API responses > 500ms
- User complaints about slowness
- Timeout errors

**Diagnosis:**
```bash
# Check response times
npm run perf:response-times

# Check slow queries
npm run db:slow-queries

# Check cache hit rate
npm run perf:cache:stats
```

**Solutions:**

1. **Enable Caching**
   ```bash
   # Warm cache
   npm run perf:cache:warm
   
   # Clear and rebuild cache
   npm run perf:cache:clear && npm run perf:cache:warm
   ```

2. **Database Optimization**
   ```bash
   # Create missing indexes
   npm run db:indexes:create
   
   # Analyze query performance
   npm run db:analyze
   ```

3. **Scale Resources**
   ```bash
   # Scale horizontally
   kubectl scale deployment myanjobs-api --replicas=5
   
   # Increase memory
   kubectl set resources deployment myanjobs-api --limits=memory=2Gi
   ```

### 5.2 Memory Leaks

**Symptoms:**
- Memory usage increasing over time
- OOM kills
- Performance degrading

**Diagnosis:**
```bash
# Monitor memory
npm run monitor:memory -- --interval=60

# Heap dump analysis
npm run perf:heap:snapshot
```

**Solutions:**

1. **Restart Application**
   ```bash
   kubectl rollout restart deployment/myanjobs-api
   ```

2. **Enable Garbage Collection**
   ```bash
   NODE_OPTIONS="--expose-gc" npm start
   ```

---

## 6. Security Issues

### 6.1 Suspicious Activity

**Symptoms:**
- Unusual traffic patterns
- Multiple failed logins
- Unexpected API calls

**Response:**

1. **Check Logs**
   ```bash
   # Check failed logins
   npm run logs:auth -- --status=failed
   
   # Check rate limit violations
   npm run logs:rate-limits
   ```

2. **Block IP Address**
   ```bash
   # Add to blocklist
   npm run security:block-ip -- --ip=xxx.xxx.xxx.xxx
   ```

3. **Enable Enhanced Monitoring**
   ```bash
   # Enable security audit logging
   npm run security:audit:enable
   ```

### 6.2 Potential Data Breach

**Response:**

1. **Immediate Actions**
   - Rotate all API keys
   - Force password resets
   - Enable 2FA requirement
   - Review access logs

2. **Investigation**
   ```bash
   # Security audit
   npm run security:audit
   
   # Check data access
   npm run logs:data-access -- --last=24h
   ```

---

## 7. Third-Party Integration Issues

### 7.1 Payment Provider Down

**Symptoms:**
- All payments failing
- Webhook timeouts
- Provider status page shows outage

**Response:**

1. **Enable Fallback Provider**
   ```bash
   # Switch to backup provider
   npm run payment:switch-provider -- --to=wave_pay
   ```

2. **Queue Payments**
   ```bash
   # Enable payment queueing
   npm run payment:queue-mode -- --enable
   ```

### 7.2 Messaging Service Issues

**Symptoms:**
- Notifications not sending
- OTP delays
- Webhook failures

**Solutions:**

1. **Check Provider Status**
   - Viber: https://status.viber.com
   - Telegram: https://status.telegram.org

2. **Switch Provider**
   ```bash
   npm run messaging:switch -- --provider=telegram
   ```

---

## 8. Emergency Procedures

### 8.1 Production Outage

**Immediate Response:**

1. **Assess Impact**
   ```bash
   # Check health
   curl https://api.myanjobs.com/api/health/deep
   
   # Check error rate
   npm run monitor:error-rate
   ```

2. **Enable Maintenance Mode**
   ```bash
   npm run maintenance:enable -- --message="We're experiencing technical difficulties"
   ```

3. **Rollback Deployment**
   ```bash
   # Rollback to previous version
   kubectl rollout undo deployment/myanjobs-api
   ```

4. **Notify Stakeholders**
   - Post status update
   - Notify on-call team
   - Update status page

### 8.2 Data Loss

**Recovery:**

1. **Stop All Writes**
   ```bash
   npm run maintenance:enable
   ```

2. **Restore from Backup**
   ```bash
   npm run backup:restore -- --date=latest
   ```

3. **Verify Data Integrity**
   ```bash
   npm run db:verify
   ```

### 8.3 Security Incident

**Response:**

1. **Isolate Affected Systems**
   ```bash
   # Block suspicious IPs
   npm run security:block-ip -- --ip=xxx.xxx.xxx.xxx
   
   # Revoke compromised tokens
   npm run security:revoke-tokens -- --userId=xxx
   ```

2. **Preserve Evidence**
   ```bash
   # Export logs
   npm run logs:export -- --start=2026-02-06T00:00:00Z --output=incident-logs.json
   ```

3. **Contact Security Team**
   - security@myanjobs.com
   - On-call: +95-xxx-xxx-xxxx

---

## Contact Information

| Team | Contact | Hours |
|------|---------|-------|
| DevOps | devops@myanjobs.com | 24/7 |
| Security | security@myanjobs.com | 24/7 |
| Database | dba@myanjobs.com | Business hours |
| Payments | payments@myanjobs.com | Business hours |

## External Resources

- **Status Page:** https://status.myanjobs.com
- **Documentation:** https://docs.myanjobs.com
- **API Reference:** https://api-docs.myanjobs.com
- **Support:** https://support.myanjobs.com

---

**Document Version:** 1.0.0  
**Last Updated:** February 6, 2026  
**Next Review:** March 6, 2026
