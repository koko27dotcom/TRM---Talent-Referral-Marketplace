# Performance Optimization Guide

## Overview

This document describes the comprehensive performance optimization implementation for the TRM Referral Platform. The system is designed to handle 100K+ CVs, real-time messaging, payments, and ensure a fast user experience.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Optimization](#database-optimization)
3. [Caching Strategy](#caching-strategy)
4. [Query Optimization](#query-optimization)
5. [API Response Optimization](#api-response-optimization)
6. [Monitoring & Profiling](#monitoring--profiling)
7. [Configuration](#configuration)
8. [Best Practices](#best-practices)

## Architecture Overview

### Multi-Layer Caching Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Browser Cache│  │ Service Worker│  │  CDN Cache   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │Compression   │  │  Rate Limit  │  │ Response Cache│      │
│  │  (gzip/br)   │  │              │  │   (ETag)     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   L1 Cache   │  │   L2 Cache   │  │  Query Opt   │      │
│  │ (In-Memory)  │  │   (Redis)    │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   MongoDB    │  │    Redis     │  │  Read Replicas│      │
│  │  (Primary)   │  │   (Cluster)  │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Database Optimization

### Index Strategy

The platform uses a comprehensive indexing strategy optimized for common query patterns:

#### User Collection Indexes
- `email` - Unique index for authentication
- `role` - For role-based queries
- `referrerProfile.referralCode` - Unique sparse index
- `referrerProfile.kycStatus` - For KYC processing
- `createdAt` - For sorting and TTL
- Compound: `role + createdAt` - For admin queries

#### Job Collection Indexes
- `companyId` - For company job listings
- `status` - For active job filtering
- `location.city` - For location-based search
- `category` - For category filtering
- Compound: `status + createdAt` - For job feeds
- Text: `title + description` - For full-text search
- TTL: `expiresAt` - Automatic job expiration

#### Referral Collection Indexes
- `referrerId` - For user referral lists
- `jobId` - For job referral tracking
- `companyId` - For company analytics
- `status` - For status-based filtering
- Compound: `companyId + status + createdAt` - For company dashboards

### Connection Pooling

```javascript
const connectionOptions = {
  minPoolSize: 10,
  maxPoolSize: 100,
  maxIdleTimeMS: 60000,
  waitQueueTimeoutMS: 5000,
};
```

### Read Replicas

Configure read preference for read-heavy operations:

```javascript
// For analytics and reporting
const readPreference = 'secondaryPreferred';

// For real-time data
const readPreference = 'primary';
```

## Caching Strategy

### L1 Cache (In-Memory)

- **Size**: 10,000 keys / 64MB
- **TTL**: 60 seconds (hot data)
- **Eviction**: LRU (Least Recently Used)
- **Use Cases**:
  - User sessions
  - Hot job listings
  - Frequent queries

### L2 Cache (Redis)

- **Type**: Redis Cluster (production)
- **TTL Strategy**:
  - Session: 2 hours
  - User profile: 30 minutes
  - Job listings: 10 minutes
  - Market data: 1 hour
  - Static data: 24 hours

### Cache Key Naming Convention

```
trm:{type}:{identifier}:{suffix}

Examples:
- trm:job:12345
- trm:user:67890:profile
- trm:session:abc123
- trm:api:GET:/api/jobs:q:a1b2c3d4
```

### Cache Invalidation Patterns

#### Tag-Based Invalidation
```javascript
// Set with tags
await cache.set(key, data, {
  ttl: 300,
  tags: ['jobs', 'job:12345', 'company:789']
});

// Invalidate by tag
await cache.deleteByTag('company:789');
```

#### Write-Through Pattern
```javascript
// Update database and cache
const result = await cache.writeThrough(
  key,
  newData,
  async (data) => await db.update(data),
  { ttl: 300, tags: ['jobs'] }
);
```

#### Write-Behind Pattern
```javascript
// Update cache immediately, queue DB update
await cache.writeBehind(
  key,
  newData,
  async (k, v) => await queue.add('db-update', { key: k, value: v }),
  { ttl: 300 }
);
```

## Query Optimization

### Pagination Strategies

#### Offset-Based (Small Datasets)
```javascript
// Good for: < 10,000 records
const result = await paginationService.paginate(
  Job,
  { status: 'active' },
  { page: 1, limit: 20, sort: { createdAt: -1 } }
);
```

#### Cursor-Based (Large Datasets)
```javascript
// Good for: > 10,000 records
const result = await paginationService.cursorPaginate(
  Job,
  { status: 'active' },
  { cursor: lastCursor, limit: 50 }
);
```

#### Keyset Pagination (Real-time)
```javascript
// Good for: Real-time feeds
const result = await paginationService.keysetPaginate(
  Job,
  { status: 'active' },
  { lastValue: lastDate, lastId: lastId, limit: 50 }
);
```

### Field Projection

```javascript
// Select only needed fields
const jobs = await Job.find(query)
  .select('title company location salary')
  .lean();
```

### Query Hints

```javascript
// Force index usage
const jobs = await Job.find(query)
  .hint({ status: 1, createdAt: -1 })
  .maxTimeMS(5000);
```

## API Response Optimization

### Compression

Automatic compression for responses > 1KB:

```javascript
// Brotli (preferred)
Accept-Encoding: br

// Gzip (fallback)
Accept-Encoding: gzip
```

### ETag Support

```javascript
// Request
GET /api/jobs/123
If-None-Match: "abc123"

// Response (not modified)
HTTP/1.1 304 Not Modified

// Response (modified)
HTTP/1.1 200 OK
ETag: "def456"
Content-Type: application/json
```

### Partial Response

```javascript
// Request specific fields
GET /api/jobs/123?fields=title,company,salary

// Response
{
  "title": "Software Engineer",
  "company": "Tech Corp",
  "salary": { "min": 50000, "max": 80000 }
}
```

## Monitoring & Profiling

### Cache Statistics

```javascript
// Get cache stats
const stats = enhancedCacheService.getStats();

{
  "l1": {
    "hits": 15000,
    "misses": 5000,
    "hitRate": "75.00%",
    "size": 8500
  },
  "l2": {
    "hits": 4000,
    "misses": 1000,
    "isConnected": true
  },
  "overall": {
    "hitRate": "79.00%"
  }
}
```

### Query Performance

```javascript
// Get slow queries
const slowQueries = queryOptimizationService.getSlowQueries(10);

// Get query stats
const stats = queryOptimizationService.getStats();
```

### Performance Endpoints

| Endpoint | Description | Access |
|----------|-------------|--------|
| `GET /api/performance/health` | System health | Admin |
| `GET /api/performance/cache/stats` | Cache statistics | Admin |
| `POST /api/performance/cache/clear` | Clear caches | Admin |
| `POST /api/performance/cache/warm` | Warm caches | Admin |
| `GET /api/performance/database/indexes` | Index stats | Admin |
| `GET /api/performance/queries/slow` | Slow queries | Admin |

## Configuration

### Environment Variables

```bash
# Database
DB_POOL_SIZE=50
DB_MIN_POOL_SIZE=10
DB_MAX_POOL_SIZE=100
DB_READ_PREFERENCE=secondaryPreferred

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_CLUSTER_ENABLED=true
REDIS_CLUSTER_NODES=node1:6379,node2:6379,node3:6379

# Cache
CACHE_L1_ENABLED=true
CACHE_L1_MAX_SIZE=10000
CACHE_L2_ENABLED=true
CACHE_L2_TTL_DEFAULT=300
CACHE_WARMING_ENABLED=true

# Performance
SLOW_QUERY_THRESHOLD_MS=100
SLOW_REQUEST_THRESHOLD_MS=1000
PAGINATION_DEFAULT_SIZE=20
PAGINATION_MAX_SIZE=100
```

### Feature Flags

```javascript
const features = {
  enableQueryCache: true,
  enableResponseCache: true,
  enableCompression: true,
  enableRateLimiting: true,
  enablePerformanceMonitoring: true,
};
```

## Best Practices

### 1. Cache-First Approach

Always check cache before database:

```javascript
const job = await jobCacheService.getOrFetchJob(
  jobId,
  async () => await Job.findById(jobId)
);
```

### 2. Batch Operations

Use batch operations for multiple items:

```javascript
const users = await userCacheService.getUsersBatch(userIds);
```

### 3. Proper Invalidation

Invalidate caches on data changes:

```javascript
// After job update
await jobCacheService.deleteJob(jobId);
await jobCacheService.invalidateJobRelated(jobId);
```

### 4. Streaming Large Datasets

Use streaming for large exports:

```javascript
for await (const doc of queryOptimizationService.batchProcess(
  CVData,
  query,
  100
)) {
  // Process document
}
```

### 5. Circuit Breaker

The cache service includes circuit breaker pattern:

```javascript
// Automatically falls back to L1 if L2 fails
const data = await enhancedCacheService.get(key);
```

### 6. Distributed Locking

Use locks for critical operations:

```javascript
await enhancedCacheService.withLock(
  `payout:${userId}`,
  async () => {
    // Critical section
    await processPayout(userId, amount);
  },
  30 // TTL seconds
);
```

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| API Response Time (p95) | < 200ms | TBD |
| Cache Hit Rate | > 80% | TBD |
| Database Query Time (p95) | < 50ms | TBD |
| Page Load Time | < 2s | TBD |
| Concurrent Users | 10,000+ | TBD |

## Troubleshooting

### High Cache Miss Rate

1. Check TTL settings
2. Verify cache warming is enabled
3. Review cache key patterns
4. Check for premature invalidation

### Slow Queries

1. Review index usage with `explain()`
2. Check for missing indexes
3. Optimize query patterns
4. Consider read replicas

### Memory Issues

1. Reduce L1 cache size
2. Lower TTL values
3. Enable compression
4. Monitor for memory leaks

## Migration Guide

### From Existing Cache

```javascript
// Old
const cache = require('./cacheService');

// New
const cache = require('./enhancedCacheService');
await cache.initialize();
```

### Database Index Creation

```bash
# Create all indexes
npm run db:indexes:create

# Check index health
npm run db:indexes:health
```

---

For more information, see:
- [API Documentation](../api/)
- [Database Schema](./database-schema.md)
- [Deployment Guide](./deployment.md)