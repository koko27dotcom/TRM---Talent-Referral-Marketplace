# TRM Platform - Incident Response Runbook

**Version:** 1.0  
**Last Updated:** February 7, 2026  
**On-Call Rotation:** PagerDuty Schedule `trm-oncall`

---

## Severity Levels

| Level | Description | Response Time | Example |
|-------|-------------|---------------|---------|
| **SEV1** | Complete outage, all users affected | 15 min | Site down, DB corruption |
| **SEV2** | Major feature broken, >50% users affected | 30 min | Payments failing, auth broken |
| **SEV3** | Minor feature broken, <50% users affected | 2 hours | Search slow, email delays |
| **SEV4** | Cosmetic/minor issue | Next business day | UI glitch, typo |

---

## Incident Response Procedure

### 1. Detection & Triage (0-5 min)

```bash
# Check overall health
curl https://api.trm.io/health/deep | jq .

# Check pod status
kubectl get pods -n trm
kubectl get events -n trm --sort-by='.lastTimestamp' | tail -20

# Check recent deployments
kubectl rollout history deployment/trm-app -n trm
```

### 2. Communication (5-10 min)

- Post in `#incidents` Slack channel
- Update status page
- Notify stakeholders for SEV1/SEV2

### 3. Diagnosis & Resolution

---

## Common Incidents

### 🔴 Application Not Responding (SEV1)

**Symptoms:** 5xx errors, health check failing, pods in CrashLoopBackOff

**Diagnosis:**
```bash
# Check pod logs
kubectl logs -n trm -l app.kubernetes.io/name=trm --tail=100

# Check pod status
kubectl describe pod -n trm -l app.kubernetes.io/name=trm

# Check resource usage
kubectl top pods -n trm

# Check events
kubectl get events -n trm --sort-by='.lastTimestamp'
```

**Resolution:**
```bash
# Option 1: Restart pods
kubectl rollout restart deployment/trm-app -n trm

# Option 2: Rollback to previous version
kubectl rollout undo deployment/trm-app -n trm

# Option 3: Scale up
kubectl scale deployment/trm-app -n trm --replicas=5
```

---

### 🔴 Database Connection Failure (SEV1)

**Symptoms:** "MongoDB Connection Error" in logs, health check shows database unhealthy

**Diagnosis:**
```bash
# Check MongoDB pods
kubectl get pods -n trm -l app.kubernetes.io/name=mongodb

# Check MongoDB logs
kubectl logs -n trm mongodb-0 --tail=50

# Check replica set status
kubectl exec -n trm mongodb-0 -- mongosh --eval "rs.status()"

# Check connection count
kubectl exec -n trm mongodb-0 -- mongosh --eval "db.serverStatus().connections"
```

**Resolution:**
```bash
# Option 1: Restart MongoDB primary
kubectl delete pod mongodb-0 -n trm

# Option 2: Force replica set reconfiguration
kubectl exec -n trm mongodb-0 -- mongosh --eval "rs.reconfig(rs.conf(), {force: true})"

# Option 3: Restore from backup (last resort)
npm run backup:restore -- --list
npm run backup:restore -- --backup <latest-backup-name>
```

---

### 🟡 High Latency (SEV2)

**Symptoms:** p95 response time > 500ms, slow API responses

**Diagnosis:**
```bash
# Check slow queries
npm run monitor:queries:slow

# Check Redis cache hit rate
kubectl exec -n trm redis-0 -- redis-cli INFO stats | grep keyspace

# Check CPU/Memory
kubectl top pods -n trm

# Check HPA status
kubectl get hpa -n trm
```

**Resolution:**
```bash
# Option 1: Scale up
kubectl scale deployment/trm-app -n trm --replicas=10

# Option 2: Clear cache
npm run perf:cache:clear

# Option 3: Warm cache
npm run perf:cache:warm

# Option 4: Check and rebuild indexes
npm run db:indexes:health
npm run db:indexes:create
```

---

### 🟡 Redis Connection Failure (SEV2)

**Symptoms:** Cache misses, slow responses, "Redis connection error" in logs

**Diagnosis:**
```bash
# Check Redis pods
kubectl get pods -n trm -l app.kubernetes.io/name=redis

# Check Redis logs
kubectl logs -n trm redis-0 --tail=50

# Check Redis memory
kubectl exec -n trm redis-0 -- redis-cli INFO memory
```

**Resolution:**
```bash
# Option 1: Restart Redis
kubectl delete pod redis-0 -n trm

# Option 2: Flush cache (if memory full)
kubectl exec -n trm redis-0 -- redis-cli FLUSHDB

# Note: App should gracefully degrade without Redis
```

---

### 🟡 Payment Processing Failure (SEV2)

**Symptoms:** Payment webhooks failing, users can't complete payments

**Diagnosis:**
```bash
# Check payment logs
kubectl logs -n trm -l app.kubernetes.io/name=trm --tail=100 | grep -i payment

# Check Stripe webhook status
# Visit: https://dashboard.stripe.com/webhooks

# Check payment reconciliation
npm run payment:stats
```

**Resolution:**
```bash
# Option 1: Retry failed webhooks from Stripe dashboard
# Option 2: Run payment reconciliation
npm run payment:reconcile

# Option 3: Check and update Stripe webhook secret
kubectl get secret trm-app-secrets -n trm -o jsonpath='{.data.STRIPE_WEBHOOK_SECRET}' | base64 -d
```

---

### 🟢 High Memory Usage (SEV3)

**Symptoms:** OOMKilled pods, memory usage > 80%

**Diagnosis:**
```bash
# Check memory usage
kubectl top pods -n trm --sort-by=memory

# Check for memory leaks
kubectl exec -n trm <pod-name> -- node -e "console.log(process.memoryUsage())"

# Check VPA recommendations
kubectl get vpa -n trm -o yaml
```

**Resolution:**
```bash
# Option 1: Restart affected pods
kubectl delete pod <pod-name> -n trm

# Option 2: Increase memory limits
kubectl edit deployment/trm-app -n trm
# Increase resources.limits.memory

# Option 3: Scale horizontally
kubectl scale deployment/trm-app -n trm --replicas=5
```

---

## Post-Incident

### Checklist
- [ ] Incident resolved and verified
- [ ] Status page updated
- [ ] Stakeholders notified
- [ ] Timeline documented
- [ ] Root cause identified
- [ ] Post-mortem scheduled (within 48 hours for SEV1/SEV2)
- [ ] Action items created in Jira/Linear
- [ ] Monitoring/alerting improved to catch earlier

### Post-Mortem Template

```markdown
## Incident Post-Mortem: [Title]

**Date:** YYYY-MM-DD
**Severity:** SEV1/2/3/4
**Duration:** X hours Y minutes
**Impact:** Description of user impact

### Timeline
- HH:MM - Incident detected
- HH:MM - On-call engineer paged
- HH:MM - Root cause identified
- HH:MM - Fix deployed
- HH:MM - Incident resolved

### Root Cause
[Description]

### Resolution
[What was done to fix it]

### Action Items
- [ ] [Action 1] - Owner - Due Date
- [ ] [Action 2] - Owner - Due Date

### Lessons Learned
- What went well
- What could be improved
```

---

## Emergency Contacts

| Role | Contact | Escalation |
|------|---------|------------|
| On-Call Engineer | PagerDuty `trm-oncall` | Auto-escalates after 15 min |
| Engineering Lead | PagerDuty `trm-eng-lead` | SEV1 only |
| CTO | PagerDuty `trm-cto` | SEV1 after 30 min |
| AWS Support | Enterprise Support | Infrastructure issues |
| MongoDB Atlas | Atlas Support | Database issues |

---

## Useful Commands Quick Reference

```bash
# Cluster health
kubectl get nodes
kubectl top nodes
kubectl get pods -A | grep -v Running

# Application
kubectl logs -n trm -l app.kubernetes.io/name=trm -f --tail=50
kubectl exec -n trm <pod> -- curl localhost:3000/health/deep

# Database
kubectl exec -n trm mongodb-0 -- mongosh --eval "rs.status()"
kubectl exec -n trm mongodb-0 -- mongosh --eval "db.serverStatus()"

# Redis
kubectl exec -n trm redis-0 -- redis-cli INFO
kubectl exec -n trm redis-0 -- redis-cli DBSIZE

# Rollback
kubectl rollout undo deployment/trm-app -n trm
kubectl rollout status deployment/trm-app -n trm
```
