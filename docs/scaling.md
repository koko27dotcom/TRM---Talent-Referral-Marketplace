# TRM Performance & Scalability Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture Overview](#architecture-overview)
3. [Caching Strategy](#caching-strategy)
4. [Database Optimization](#database-optimization)
5. [Monitoring & Alerting](#monitoring--alerting)
6. [Docker Deployment](#docker-deployment)
7. [Kubernetes Deployment](#kubernetes-deployment)
8. [Performance Benchmarks](#performance-benchmarks)
9. [Scaling Procedures](#scaling-procedures)
10. [Troubleshooting](#troubleshooting)
11. [Best Practices](#best-practices)

---

## Overview

The TRM (Talent Referral Marketplace) platform is designed for high performance and horizontal scalability. This document outlines the architecture, strategies, and procedures for scaling the platform to handle millions of users, thousands of concurrent requests, and terabytes of data.

### Key Capabilities

- **Horizontal Scaling**: Auto-scaling from 3 to 20+ application instances
- **Multi-Layer Caching**: L1 (In-Memory) + L2 (Redis) cache architecture
- **Database Optimization**: Connection pooling, query optimization, indexing
- **High Availability**: 99.9% uptime target with redundant components
- **Performance**: Sub-100ms API response times for cached data

### Scaling Metrics

| Metric | Target | Maximum |
|--------|--------|---------|
| Concurrent Users | 10,000 | 100,000 |
| Requests/Second | 1,000 | 10,000 |
| API Response Time (p95) | < 200ms | < 500ms |
| Database Connections | 500 | 2,000 |
| Cache Hit Rate | > 85% | > 95% |

---

## Architecture Overview

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Load Balancer (NGINX)                           │
│                    SSL Termination, Rate Limiting, Compression               │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
           ┌────────▼────────┐  ┌──────▼──────┐  ┌────────▼────────┐
           │   TRM App Pod   │  │  TRM App    │  │   TRM App Pod   │
           │     (Pod 1)     │  │   Pod 2     │  │     (Pod N)     │
           │  ┌───────────┐  │  │ ┌─────────┐ │  │  ┌───────────┐  │
           │  │  L1 Cache │  │  │ │L1 Cache │ │  │  │  L1 Cache │  │
           │  │ (In-Mem)  │  │  │(In-Mem)   │ │  │  │ (In-Mem)  │  │
           │  └───────────┘  │  │ └─────────┘ │  │  └───────────┘  │
           └────────┬────────┘  └──────┬──────┘  └────────┬────────┘
                    │                  │                  │
                    └──────────────────┼──────────────────┘
                                       │
                              ┌────────▼────────┐
                              │  L2 Cache       │
                              │  (Redis Cluster)│
                              │  ┌───────────┐  │
                              │  │  Master   │  │
                              │  │  Replica  │  │
                              │  │  Replica  │  │
                              │  └───────────┘  │
                              └────────┬────────┘
                                       │
                              ┌────────▼────────┐
                              │   MongoDB       │
                              │  Replica Set    │
                              │  ┌───────────┐  │
                              │  │  Primary  │  │
                              │  │ Secondary │  │
                              │  │ Secondary │  │
                              │  └───────────┘  │
                              └─────────────────┘
```

### Multi-Layer Caching Strategy

The platform implements a three-tier caching architecture:

1. **L1 Cache (In-Memory)**: Per-instance local cache for hot data
   - Maximum 10,000 keys per instance
   - 50MB memory limit per instance
   - Sub-millisecond access times

2. **L2 Cache (Redis)**: Distributed cache for warm data
   - Shared across all application instances
   - Persistent storage with AOF
   - Circuit breaker for resilience

3. **L3 Cache (CDN)**: Static asset caching (configured separately)

### Database Optimization Features

- **Connection Pooling**: 10-50 connections per application instance
- **Read Preferences**: PrimaryPreferred for read scaling
- **Write Concern**: Majority for data durability
- **Indexing Strategy**: Compound indexes for common queries
- **Slow Query Detection**: Automatic profiling for queries > 100ms

### Connection Pooling

```javascript
// MongoDB Connection Options (server/config/database.js)
const connectionOptions = {
  maxPoolSize: 10,              // Maximum connections per instance
  minPoolSize: 5,               // Minimum maintained connections
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  heartbeatFrequencyMS: 10000,
};
```

### Auto-Scaling Capabilities

The platform supports both horizontal and vertical scaling:

- **Horizontal Pod Autoscaler (HPA)**: Scales based on CPU (70%), Memory (80%), and RPS (1000)
- **Vertical Pod Autoscaler (VPA)**: Adjusts resource requests/limits automatically
- **Cluster Autoscaler**: Provisions additional nodes when needed

---

## Caching Strategy

### L1 (In-Memory) Cache

The L1 cache is implemented in [`server/services/cacheService.js`](server/services/cacheService.js:71) using an LRU (Least Recently Used) eviction policy.

#### Features

- **LRU Eviction**: Automatically removes least recently used items when limits are reached
- **TTL Support**: Time-based expiration for all entries
- **Tag-Based Invalidation**: Group related cache entries for bulk invalidation
- **Size Tracking**: Monitors memory usage to prevent OOM errors

#### Configuration

```javascript
// Environment Variables
CACHE_L1_TTL=60              // Default TTL: 60 seconds
CACHE_L1_MAX_KEYS=10000      // Maximum keys per instance
CACHE_L1_MAX_SIZE_MB=50      // Maximum memory usage (50MB)
```

#### Usage Example

```javascript
import cacheService from './services/cacheService.js';

// Cache user data
await cacheService.cacheUser(userId, userData, { ttl: 1800 });

// Retrieve cached data
const user = await cacheService.getUser(userId);

// Invalidate user cache
await cacheService.invalidateUser(userId);
```

### L2 (Redis) Cache

The L2 cache provides distributed caching across all application instances.

#### Features

- **Circuit Breaker**: Prevents cascading failures when Redis is unavailable
- **Automatic Reconnection**: Retries connection with exponential backoff
- **Data Persistence**: AOF (Append-Only File) for durability
- **Clustering Support**: Redis Cluster for horizontal scaling

#### Configuration

```javascript
// Environment Variables
REDIS_HOST=redis             // Redis hostname
REDIS_PORT=6379              // Redis port
REDIS_PASSWORD=secret        // Redis password
REDIS_DB=0                   // Redis database number

// Circuit Breaker Configuration
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_RESET_TIMEOUT=30000
```

#### Circuit Breaker States

| State | Description | Behavior |
|-------|-------------|----------|
| CLOSED | Normal operation | All requests go to Redis |
| OPEN | Failure threshold reached | Requests bypass Redis, use L1 only |
| HALF_OPEN | Testing recovery | Limited requests to test Redis health |

### Cache Key Patterns

```
user:{userId}                    # User profile data
session:{sessionId}              # Session data
jobs:{filter}                    # Job listings
referrals:{userId}               # User referrals
api:{endpoint}                   # API response cache
```

### Cache Invalidation Strategies

1. **Time-Based (TTL)**: Automatic expiration after configured time
2. **Tag-Based**: Invalidate all entries with a specific tag
3. **Pattern-Based**: Invalidate keys matching a pattern (e.g., `user:*`)
4. **Event-Driven**: Invalidate on data mutations

```javascript
// Tag-based invalidation
await cacheService.invalidateByTag('user:12345');

// Pattern-based invalidation
await cacheService.invalidateByPattern('jobs:*');

// Complete cache flush (emergency only)
await cacheService.flush();
```

### Cache Statistics

Access cache performance metrics via the health endpoint:

```bash
curl http://localhost:3000/api/health/cache
```

Response:
```json
{
  "overall": {
    "totalHits": 15000,
    "totalMisses": 2500,
    "hitRate": 0.857,
    "l1HitRate": 0.65,
    "l2HitRate": 0.35
  },
  "l1": {
    "keyCount": 8500,
    "memoryUsage": 42000000,
    "hitRate": 0.92
  },
  "l2": {
    "connected": true,
    "hitRate": 0.78
  }
}
```

---

## Database Optimization

### Query Optimization Features

The platform includes several query optimization strategies:

#### 1. Index Management

Key indexes for common queries:

```javascript
// User collection indexes
{ email: 1 }                      // Unique, for login
{ 'referrerProfile.inviteCode': 1 } // Sparse, for referral lookups
{ 'referrerProfile.parentReferrerId': 1 } // For network queries

// Job collection indexes
{ status: 1, createdAt: -1 }      // For job listings
{ companyId: 1, status: 1 }       // For company job queries
{ 'location.city': 1, 'location.country': 1 } // For location filtering

// Referral collection indexes
{ referrerId: 1, status: 1 }      // For user referral lists
{ jobId: 1, status: 1 }           // For job referral analytics
```

#### 2. Connection Pooling Configuration

```javascript
// MongoDB Connection Options
const connectionOptions = {
  maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE, 10) || 50,
  minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE, 10) || 10,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  writeConcern: 'majority',
  readPreference: 'primaryPreferred',
};
```

#### 3. Slow Query Detection

MongoDB profiling is enabled for slow queries (> 100ms):

```javascript
// Enable profiling in MongoDB
rs.initiate({
  // ... replica set config
});

// Set profiling level
db.setProfilingLevel(1, { slowms: 100 });
```

Monitor slow queries:

```bash
# View slow queries
mongosh --eval "db.system.profile.find().sort({ ts: -1 }).limit(10)"
```

### Database Scaling Strategies

#### Vertical Scaling

- Increase CPU and memory for MongoDB pods
- Use faster storage (SSD/NVMe)
- Increase WiredTiger cache size

#### Horizontal Scaling

- **Read Scaling**: Add secondary nodes for read operations
- **Sharding**: Partition data across multiple replica sets
- **Zone Sharding**: Geographic data distribution

---

## Monitoring & Alerting

### Performance Metrics Collection

The platform exposes metrics via Prometheus endpoints:

#### Application Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `http_requests_total` | Counter | Total HTTP requests |
| `http_request_duration_seconds` | Histogram | Request latency |
| `trm_cache_hits_total` | Counter | Cache hit count |
| `trm_cache_misses_total` | Counter | Cache miss count |
| `trm_database_connection_errors_total` | Counter | DB connection errors |

#### Infrastructure Metrics

| Metric | Source | Description |
|--------|--------|-------------|
| `container_cpu_usage_seconds_total` | cAdvisor | CPU usage |
| `container_memory_working_set_bytes` | cAdvisor | Memory usage |
| `mongodb_connections` | MongoDB Exporter | Active connections |
| `redis_memory_used_bytes` | Redis Exporter | Redis memory usage |

### Health Checks

Health check endpoints are available at:

```
GET /health          # Liveness probe
GET /ready           # Readiness probe
GET /api/health      # Detailed health status
GET /metrics         # Prometheus metrics
```

### Alert Rules

#### Critical Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| TRMHighErrorRate | Error rate > 5% for 5m | Page on-call |
| TRMPodCrashLooping | Pod restarting continuously | Page on-call |
| TRMPodNotReady | Pod not ready for 5m | Page on-call |
| TRMDatabaseConnectionErrors | DB connection errors | Page on-call |

#### Warning Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| TRMHighLatency | p95 latency > 2s | Slack notification |
| TRMHighMemoryUsage | Memory > 85% | Slack notification |
| TRMHighCPUUsage | CPU > 80% | Slack notification |
| TRMHPAAtMax | HPA at max replicas for 15m | Slack notification |

### DataDog/New Relic Integration

#### DataDog Agent Configuration

```yaml
# datadog-agent.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: datadog-agent
spec:
  template:
    spec:
      containers:
        - name: datadog-agent
          image: datadog/agent:latest
          env:
            - name: DD_API_KEY
              valueFrom:
                secretKeyRef:
                  name: datadog-secret
                  key: api-key
            - name: DD_APM_ENABLED
              value: "true"
            - name: DD_LOGS_ENABLED
              value: "true"
```

#### Custom Metrics

```javascript
// Send custom metrics to DataDog
import { StatsD } from 'node-statsd';

const client = new StatsD({
  host: 'datadog-agent',
  port: 8125,
  prefix: 'trm.'
});

// Record business metrics
client.increment('referral.created');
client.timing('payout.processing_time', duration);
client.gauge('active_users', count);
```

---

## Docker Deployment

### Multi-Stage Build Process

The [`docker/Dockerfile`](docker/Dockerfile:1) uses a multi-stage build for optimized image size:

```dockerfile
# Stage 1: Dependencies
FROM node:18-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --include=dev

# Stage 2: Build
FROM node:18-alpine AS build
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production
FROM node:18-alpine AS production
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
COPY --from=build /app/dist ./dist
COPY server ./server
USER nodejs
EXPOSE 3000
CMD ["node", "server.cjs"]
```

### Build Commands

```bash
# Build the Docker image
docker build -f docker/Dockerfile -t trm/platform:latest .

# Build for specific stage
docker build --target production -t trm/platform:latest .

# Tag with version
docker tag trm/platform:latest trm/platform:v1.0.0
```

### Service Orchestration

The [`docker/docker-compose.yml`](docker/docker-compose.yml:1) defines the complete stack:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    volumes:
      - mongodb_data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]

  redis:
    image: redis:7.0-alpine
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  trm-app:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    depends_on:
      mongodb:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
```

### Environment Configuration

Create a `.env` file for Docker deployment:

```bash
# Database
MONGODB_URI=mongodb://admin:changeme@mongodb:27017/trm?authSource=admin

# Cache
REDIS_URL=redis://:changeme@redis:6379

# Application
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Security
JWT_SECRET=your-super-secret-jwt-key
API_KEY_SECRET=your-api-key-secret
```

### Scaling with Docker Compose

#### Horizontal Scaling

```bash
# Scale application instances
docker-compose up -d --scale trm-app=3

# With load balancer
docker-compose -f docker-compose.yml -f docker-compose.scale.yml up -d
```

#### Docker Compose Override for Scaling

```yaml
# docker-compose.scale.yml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - trm-app

  trm-app:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 1G
```

---

## Kubernetes Deployment

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Kubernetes Cluster                                 │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Ingress Controller                           │   │
│  │                    (NGINX / Traefik / Ambassador)                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────▼─────────────────────────────────────┐   │
│  │                           trm Namespace                              │   │
│  │                                                                       │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │   │
│  │  │   trm-app    │  │   trm-app    │  │   trm-app    │                │   │
│  │  │   Pod 1      │  │   Pod 2      │  │   Pod N      │  (HPA: 3-20)   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                │   │
│  │                                                                       │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │   │
│  │  │                     MongoDB StatefulSet                          │  │   │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │  │   │
│  │  │  │ Primary  │  │Secondary │  │Secondary │  (3 replicas)        │  │   │
│  │  │  └──────────┘  └──────────┘  └──────────┘                      │  │   │
│  │  └─────────────────────────────────────────────────────────────────┘  │   │
│  │                                                                       │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │   │
│  │  │                     Redis Deployment                             │  │   │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │  │   │
│  │  │  │  Master  │  │ Replica  │  │ Replica  │  (3 replicas)        │  │   │
│  │  │  └──────────┘  └──────────┘  └──────────┘                      │  │   │
│  │  └─────────────────────────────────────────────────────────────────┘  │   │
│  │                                                                       │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │   │
│  │  │  ConfigMap   │  │    Secret    │  │   Service    │                │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                │   │
│  │                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Overview

| Component | File | Purpose |
|-----------|------|---------|
| Namespace | [`k8s/namespace.yaml`](k8s/namespace.yaml:1) | Logical isolation |
| ConfigMap | [`k8s/configmap.yaml`](k8s/configmap.yaml:1) | Non-sensitive configuration |
| Secret | [`k8s/secret.yaml`](k8s/secret.yaml:1) | Sensitive credentials |
| Deployment | [`k8s/app-deployment.yaml`](k8s/app-deployment.yaml:1) | Application pods |
| Service | [`k8s/service.yaml`](k8s/service.yaml:1) | Service discovery |
| Ingress | [`k8s/ingress.yaml`](k8s/ingress.yaml:1) | External access |
| HPA | [`k8s/hpa.yaml`](k8s/hpa.yaml:1) | Auto-scaling |
| MongoDB | [`k8s/mongodb-deployment.yaml`](k8s/mongodb-deployment.yaml:1) | Database |
| Redis | [`k8s/redis-deployment.yaml`](k8s/redis-deployment.yaml:1) | Cache |
| Monitoring | [`k8s/monitoring.yaml`](k8s/monitoring.yaml:1) | Metrics & alerts |

### Deployment Instructions

#### 1. Create Namespace

```bash
kubectl apply -f k8s/namespace.yaml
```

#### 2. Deploy Configurations

```bash
# Apply configurations in order
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/mongodb-deployment.yaml
kubectl apply -f k8s/redis-deployment.yaml
kubectl apply -f k8s/app-deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa.yaml
kubectl apply -f k8s/monitoring.yaml
```

#### 3. Verify Deployment

```bash
# Check pod status
kubectl get pods -n trm

# Check services
kubectl get svc -n trm

# Check ingress
kubectl get ingress -n trm

# View logs
kubectl logs -n trm -l app.kubernetes.io/component=app
```

### Auto-Scaling Configuration

#### Horizontal Pod Autoscaler (HPA)

The [`k8s/hpa.yaml`](k8s/hpa.yaml:1) defines auto-scaling rules:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: trm-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: trm-app
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "1000"
```

#### Scaling Behavior

```yaml
behavior:
  scaleUp:
    stabilizationWindowSeconds: 0
    policies:
      - type: Percent
        value: 100
        periodSeconds: 15
      - type: Pods
        value: 4
        periodSeconds: 15
  scaleDown:
    stabilizationWindowSeconds: 300
    policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

### High Availability Setup

#### Pod Anti-Affinity

Ensures pods are distributed across nodes:

```yaml
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchExpressions:
              - key: app.kubernetes.io/name
                operator: In
                values:
                  - trm
          topologyKey: kubernetes.io/hostname
```

#### Resource Requests and Limits

```yaml
resources:
  requests:
    cpu: "500m"
    memory: "1Gi"
  limits:
    cpu: "2000m"
    memory: "4Gi"
```

#### Health Probes

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: http
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /ready
    port: http
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3

startupProbe:
  httpGet:
    path: /health
    port: http
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 30
```

---

## Performance Benchmarks

### Target Metrics

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| API Response Time (p50) | < 50ms | < 100ms | > 200ms |
| API Response Time (p95) | < 100ms | < 200ms | > 500ms |
| API Response Time (p99) | < 200ms | < 500ms | > 1000ms |
| Throughput | 1000 RPS | 500 RPS | < 100 RPS |
| Error Rate | < 0.1% | < 1% | > 5% |
| Cache Hit Rate | > 90% | > 80% | < 70% |
| Database Query Time | < 10ms | < 50ms | > 100ms |

### Load Testing Guidelines

#### Using k6

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up
    { duration: '5m', target: 100 },   // Steady state
    { duration: '2m', target: 200 },   // Ramp up
    { duration: '5m', target: 200 },   // Steady state
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get('https://api.trm.io/api/jobs');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
  sleep(1);
}
```

Run the test:

```bash
k6 run load-test.js
```

#### Using Artillery

```yaml
# artillery-test.yml
config:
  target: 'https://api.trm.io'
  phases:
    - duration: 60
      arrivalRate: 10
    - duration: 120
      arrivalRate: 50
    - duration: 60
      arrivalRate: 100
scenarios:
  - name: "Browse Jobs"
    requests:
      - get:
          url: "/api/jobs"
      - get:
          url: "/api/jobs/{{ $randomInt(1, 1000) }}"
```

Run the test:

```bash
artillery run artillery-test.yml
```

### Optimization Targets

| Area | Current | Target | Action |
|------|---------|--------|--------|
| Cache Hit Rate | 85% | 95% | Increase TTL, better invalidation |
| DB Query Time | 25ms | 10ms | Add indexes, optimize queries |
| API Response | 150ms | 100ms | Enable compression, optimize serialization |
| Memory Usage | 70% | 60% | Optimize data structures |

---

## Scaling Procedures

### Horizontal Scaling

#### Application Scaling

```bash
# Manual scaling
kubectl scale deployment trm-app --replicas=5 -n trm

# Verify scaling
kubectl get pods -n trm

# Check HPA status
kubectl get hpa -n trm
```

#### Auto-Scaling Configuration

```bash
# Edit HPA configuration
kubectl edit hpa trm-app-hpa -n trm

# Or apply new configuration
kubectl apply -f k8s/hpa.yaml
```

### Vertical Scaling

#### Increase Pod Resources

```bash
# Edit deployment
kubectl edit deployment trm-app -n trm
```

Update resource section:

```yaml
resources:
  requests:
    cpu: "1000m"      # Increase from 500m
    memory: "2Gi"     # Increase from 1Gi
  limits:
    cpu: "4000m"      # Increase from 2000m
    memory: "8Gi"     # Increase from 4Gi
```

### Database Scaling

#### Add MongoDB Secondary

```bash
# Scale MongoDB StatefulSet
kubectl scale statefulset mongodb --replicas=5 -n trm
```

#### Increase Storage

```bash
# Expand PVC (requires StorageClass support)
kubectl patch pvc mongodb-data-mongodb-0 -n trm -p '{"spec":{"resources":{"requests":{"storage":"100Gi"}}}}'
```

### Cache Scaling

#### Scale Redis

```bash
# For Redis Cluster mode
kubectl scale deployment redis --replicas=3 -n trm
```

#### Increase Redis Memory

```bash
# Edit Redis deployment
kubectl edit deployment redis -n trm
```

Update resource limits:

```yaml
resources:
  requests:
    memory: "2Gi"
  limits:
    memory: "4Gi"
```

### Emergency Procedures

#### High Traffic Surge

1. **Immediate Actions**:
   ```bash
   # Scale up immediately
   kubectl scale deployment trm-app --replicas=10 -n trm
   
   # Enable emergency caching
   kubectl set env deployment/trm-app CACHE_L1_TTL=300 -n trm
   ```

2. **Monitor Metrics**:
   ```bash
   # Watch pod metrics
   kubectl top pods -n trm
   
   # Check HPA status
   kubectl get hpa -n trm -w
   ```

#### Database Overload

1. **Enable Read Preference**:
   ```bash
   kubectl set env deployment/trm-app MONGODB_READ_PREFERENCE=secondaryPreferred -n trm
   ```

2. **Scale Database**:
   ```bash
   kubectl scale statefulset mongodb --replicas=5 -n trm
   ```

#### Cache Failure

1. **Bypass Redis** (emergency only):
   ```bash
   kubectl set env deployment/trm-app REDIS_HOST=localhost -n trm
   ```

2. **Restart Redis**:
   ```bash
   kubectl rollout restart deployment/redis -n trm
   ```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. High Memory Usage

**Symptoms**: Pods getting OOMKilled

**Diagnosis**:
```bash
# Check memory usage
kubectl top pods -n trm

# Check OOM events
kubectl describe pod <pod-name> -n trm | grep -A 5 "Last State"
```

**Solutions**:
- Increase memory limits
- Reduce cache size
- Enable memory profiling

```bash
# Increase memory limit
kubectl patch deployment trm-app -n trm -p '{"spec":{"template":{"spec":{"containers":[{"name":"trm-app","resources":{"limits":{"memory":"8Gi"}}}]}}}}'
```

#### 2. Slow API Responses

**Symptoms**: High response times, timeouts

**Diagnosis**:
```bash
# Check slow requests
kubectl logs -n trm -l app.kubernetes.io/component=app | grep "SLOW REQUEST"

# Check database performance
kubectl exec -it mongodb-0 -n trm -- mongosh --eval "db.currentOp()"
```

**Solutions**:
- Check cache hit rate
- Optimize database queries
- Scale application pods

#### 3. Database Connection Issues

**Symptoms**: Connection timeouts, pool exhausted

**Diagnosis**:
```bash
# Check connection count
kubectl exec -it mongodb-0 -n trm -- mongosh --eval "db.serverStatus().connections"
```

**Solutions**:
- Increase connection pool size
- Check for connection leaks
- Scale database

```bash
# Increase pool size
kubectl set env deployment/trm-app MONGODB_MAX_POOL_SIZE=100 -n trm
```

### Performance Degradation Diagnosis

#### Step 1: Check Application Metrics

```bash
# Get Prometheus metrics
curl http://<pod-ip>:9090/metrics

# Check cache statistics
curl http://<pod-ip>:3000/api/health/cache
```

#### Step 2: Analyze Database Performance

```bash
# Enter MongoDB pod
kubectl exec -it mongodb-0 -n trm -- mongosh

# Check slow queries
db.system.profile.find().sort({ ts: -1 }).limit(10)

# Check index usage
db.jobs.explain("executionStats").find({ status: "active" })
```

#### Step 3: Review Logs

```bash
# Application logs
kubectl logs -n trm -l app.kubernetes.io/component=app --tail=100

# Previous container logs (if restarted)
kubectl logs -n trm -l app.kubernetes.io/component=app --previous
```

### Cache Issues

#### Redis Connection Failures

**Symptoms**: Cache misses increasing, L2 unavailable

**Diagnosis**:
```bash
# Check Redis health
kubectl exec -it redis-0 -n trm -- redis-cli ping

# Check Redis logs
kubectl logs -n trm -l app.kubernetes.io/component=cache
```

**Solutions**:
```bash
# Restart Redis
kubectl rollout restart deployment/redis -n trm

# Check circuit breaker status
curl http://<pod-ip>:3000/api/health/cache | jq '.l2.circuitBreaker'
```

#### Cache Invalidation Issues

**Symptoms**: Stale data, cache inconsistencies

**Solutions**:
```bash
# Flush cache (emergency)
kubectl exec -it <pod-name> -n trm -- curl -X POST http://localhost:3000/api/admin/cache/flush

# Invalidate by pattern
kubectl exec -it <pod-name> -n trm -- curl -X POST http://localhost:3000/api/admin/cache/invalidate -d '{"pattern": "jobs:*"}'
```

### Database Connection Issues

#### Connection Pool Exhaustion

**Symptoms**: "Connection pool exhausted" errors

**Diagnosis**:
```bash
# Check active connections
kubectl exec -it mongodb-0 -n trm -- mongosh --eval "db.serverStatus().connections.current"
```

**Solutions**:
1. Increase pool size
2. Check for connection leaks
3. Implement connection timeout

```javascript
// Add to database.js
const connectionOptions = {
  maxPoolSize: 100,
  minPoolSize: 20,
  maxIdleTimeMS: 30000,
  waitQueueTimeoutMS: 5000,
};
```

---

## Best Practices

### Caching Best Practices

1. **Cache Key Design**:
   - Use consistent naming conventions
   - Include version in key for schema changes
   - Hash long keys to prevent memory issues

2. **TTL Strategy**:
   - Hot data: 1-5 minutes
   - Warm data: 10-30 minutes
   - Cold data: 1-24 hours
   - Session data: Match session timeout

3. **Invalidation**:
   - Use tag-based invalidation for related data
   - Implement cache warming for critical data
   - Monitor cache hit rates

4. **Avoid Cache Stampede**:
   ```javascript
   // Use cache-aside pattern with locking
   const value = await cacheService.getOrSet(key, async () => {
     return await fetchFromDatabase();
   }, { ttl: 300 });
   ```

### Query Optimization Tips

1. **Use Indexes Effectively**:
   ```javascript
   // Compound index for common queries
   db.jobs.createIndex({ status: 1, createdAt: -1 });
   
   // Text index for search
   db.jobs.createIndex({ title: "text", description: "text" });
   ```

2. **Limit Result Sets**:
   ```javascript
   // Always paginate
   const jobs = await Job.find({ status: 'active' })
     .limit(20)
     .skip((page - 1) * 20)
     .sort({ createdAt: -1 });
   ```

3. **Project Only Needed Fields**:
   ```javascript
   // Select specific fields
   const users = await User.find({}, { name: 1, email: 1 });
   ```

4. **Use Aggregation for Complex Queries**:
   ```javascript
   // Efficient aggregation
   const stats = await Referral.aggregate([
     { $match: { status: 'completed' } },
     { $group: { _id: '$referrerId', count: { $sum: 1 } } },
     { $sort: { count: -1 } },
     { $limit: 10 }
   ]);
   ```

### Monitoring Recommendations

1. **Key Metrics to Track**:
   - Request rate and latency (p50, p95, p99)
   - Error rate by endpoint
   - Cache hit/miss rates
   - Database query performance
   - Resource utilization (CPU, memory, disk)

2. **Dashboard Setup**:
   ```yaml
   # Grafana dashboard config
   apiVersion: 1
   providers:
     - name: 'TRM Dashboards'
       folder: 'TRM'
       type: file
       options:
         path: /var/lib/grafana/dashboards/trm
   ```

3. **Alerting Rules**:
   - Page for: Error rate > 5%, Service down
   - Notify for: Latency > 2s, High resource usage
   - Log for: Slow queries, Cache misses

4. **Log Aggregation**:
   ```yaml
   # Fluentd configuration
   <source>
     @type kubernetes
     @id kubernetes
   </source>
   
   <match trm.**>
     @type elasticsearch
     host elasticsearch
     port 9200
     index_name trm-logs
   </match>
   ```

### Security Considerations

1. **Network Policies**:
   ```yaml
   apiVersion: networking.k8s.io/v1
   kind: NetworkPolicy
   metadata:
     name: trm-network-policy
     namespace: trm
   spec:
     podSelector:
       matchLabels:
         app.kubernetes.io/name: trm
     policyTypes:
       - Ingress
       - Egress
     ingress:
       - from:
           - namespaceSelector:
               matchLabels:
                 name: ingress-nginx
         ports:
           - protocol: TCP
             port: 3000
   ```

2. **Resource Quotas**:
   ```yaml
   apiVersion: v1
   kind: ResourceQuota
   metadata:
     name: trm-quota
     namespace: trm
   spec:
     hard:
       requests.cpu: "20"
       requests.memory: 40Gi
       limits.cpu: "40"
       limits.memory: 80Gi
       pods: "30"
   ```

3. **Security Context**:
   ```yaml
   securityContext:
     runAsNonRoot: true
     runAsUser: 1001
     fsGroup: 1001
     seccompProfile:
       type: RuntimeDefault
   ```

4. **Secrets Management**:
   - Use Kubernetes Secrets for sensitive data
   - Enable encryption at rest for Secrets
   - Rotate secrets regularly
   - Use external secret management (Vault, AWS Secrets Manager) for production

---

## Appendix

### Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | development | Application environment |
| `PORT` | 3000 | Application port |
| `MONGODB_URI` | - | MongoDB connection string |
| `MONGODB_MAX_POOL_SIZE` | 50 | Max DB connections |
| `REDIS_URL` | - | Redis connection string |
| `CACHE_L1_TTL` | 60 | L1 cache TTL (seconds) |
| `CACHE_L2_TTL` | 300 | L2 cache TTL (seconds) |
| `LOG_LEVEL` | info | Logging level |
| `SLOW_REQUEST_THRESHOLD` | 1000 | Slow request threshold (ms) |

### Useful Commands

```bash
# Port forward for local debugging
kubectl port-forward -n trm svc/trm-app 3000:80

# Execute command in pod
kubectl exec -it -n trm deployment/trm-app -- /bin/sh

# View resource usage
kubectl top nodes
kubectl top pods -n trm

# Check events
kubectl get events -n trm --sort-by='.lastTimestamp'

# Rollback deployment
kubectl rollout undo deployment/trm-app -n trm

# Check rollout status
kubectl rollout status deployment/trm-app -n trm
```

### Related Documentation

- [API Documentation](api/v1/openapi.yaml)
- [Authentication](api/authentication.md)
- [Webhooks](api/webhooks.md)
- [Phase 1 Technical Architecture](../plans/phase1-technical-architecture.md)
