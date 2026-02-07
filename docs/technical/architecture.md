# TRM Platform - Technical Architecture

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend Architecture](#backend-architecture)
5. [Database Architecture](#database-architecture)
6. [AI/ML Components](#aiml-components)
7. [Security Architecture](#security-architecture)
8. [Integration Architecture](#integration-architecture)
9. [Scalability & Performance](#scalability--performance)
10. [Monitoring & Observability](#monitoring--observability)

---

## Overview

### Platform Purpose

TRM (Talent Referral Marketplace) is a comprehensive referral-based hiring platform built for the Myanmar market. It connects:
- **Referrers**: Individuals who recommend candidates
- **Companies**: Organizations seeking talent
- **Candidates**: Job seekers
- **Admins**: Platform administrators

### Key Features

- Multi-role user system with RBAC
- AI-powered resume optimization (Moonshot AI/Kimi)
- Gamification and referral network
- Myanmar payment gateway integration
- Real-time notifications
- Analytics and reporting
- Mobile applications

### Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose ODM) |
| Cache | Redis |
| Queue | Bull (Redis-based) |
| AI | Moonshot AI (Kimi), OpenAI |
| Auth | JWT, bcrypt |
| File Storage | AWS S3 / Local |
| Payments | KBZPay, WavePay, CB Pay |
| Notifications | SendGrid, Twilio, WebSockets |

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Web App    │  │  Mobile App  │  │   Admin Dashboard    │  │
│  │   (React)    │  │(React Native)│  │      (React)         │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
└─────────┼─────────────────┼─────────────────────┼──────────────┘
          │                 │                     │
          └─────────────────┼─────────────────────┘
                            │ HTTPS/HTTP2
┌───────────────────────────▼─────────────────────────────────────┐
│                      API GATEWAY LAYER                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Nginx / Load Balancer                  │  │
│  │  - SSL Termination  - Rate Limiting  - Request Routing   │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                     APPLICATION LAYER                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Express.js API Server (Node.js)              │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │  │
│  │  │   Routes    │ │ Middleware  │ │  Controllers        │ │  │
│  │  │  (/api/v1)  │ │  (Auth,     │ │  (Business Logic)   │ │  │
│  │  │             │ │  Validation)│ │                     │ │  │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼──────┐  ┌────────▼────────┐  ┌──────▼──────┐
│  DATA LAYER  │  │  SERVICE LAYER  │  │  JOB QUEUE  │
│  ┌────────┐  │  │  ┌───────────┐  │  │  ┌──────┐  │
│  │MongoDB │  │  │  │  AI Svc   │  │  │  │ Bull │  │
│  │        │  │  │  │ Payment   │  │  │  │Redis │  │
│  └────────┘  │  │  │ Notification│  │  │  └──────┘  │
│  ┌────────┐  │  │  │ Analytics │  │  │             │
│  │ Redis  │  │  │  └───────────┘  │  │             │
│  │(Cache) │  │  │                 │  │             │
│  └────────┘  │  │                 │  │             │
└──────────────┘  └─────────────────┘  └─────────────┘
```

### Request Flow

```
1. Client Request
   ↓
2. Nginx (SSL, Rate Limiting)
   ↓
3. Express Server
   ↓
4. Middleware Stack
   - Security Headers
   - CORS
   - Body Parser
   - Authentication (JWT)
   - Authorization (RBAC)
   - Rate Limiting
   ↓
5. Route Handler
   ↓
6. Controller
   - Business Logic
   - Service Calls
   - Database Queries
   ↓
7. Response
   ↓
8. Client
```

### Microservices Considerations

Current: Monolithic architecture
Future: Potential decomposition into:
- **Auth Service**: Authentication and authorization
- **Job Service**: Job posting and management
- **Referral Service**: Referral workflow
- **Payment Service**: Billing and payouts
- **Notification Service**: Multi-channel notifications
- **AI Service**: Resume optimization and matching

---

## Frontend Architecture

### Web Application (React)

#### Project Structure
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── forms/          # Form components
│   └── layout/         # Layout components
├── sections/           # Page sections
│   ├── Login.tsx
│   ├── Marketplace.tsx
│   ├── BillingDashboard.tsx
│   └── ...
├── contexts/           # React contexts
│   ├── AuthContext.tsx
│   └── ThemeContext.tsx
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
│   └── utils.ts
├── services/           # API services
├── types/              # TypeScript types
└── styles/             # Global styles
```

#### State Management

**Local State**: React `useState` for component-level state

**Global State**: 
- React Context for auth, theme, notifications
- No Redux (simplified with Context + hooks)

**Server State**: 
- TanStack Query (React Query) for API data
- Caching and synchronization

#### Key Libraries

| Library | Purpose |
|---------|---------|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool |
| Tailwind CSS | Styling |
| shadcn/ui | Component library |
| Framer Motion | Animations |
| React Router | Routing |
| Axios | HTTP client |
| Recharts | Charts |

#### Component Architecture

**Atomic Design Principles**:
- Atoms: Button, Input, Label
- Molecules: FormField, SearchBar
- Organisms: JobCard, ReferralTable
- Templates: Page layouts
- Pages: Complete views

### Mobile Application

**Framework**: React Native (Expo)

**Structure**:
```
mobile/
├── src/
│   ├── components/     # Reusable components
│   ├── screens/        # Screen components
│   ├── navigation/     # Navigation config
│   ├── services/       # API services
│   ├── store/          # State management (Zustand)
│   ├── constants/      # App constants
│   └── utils/          # Utilities
├── assets/             # Images, fonts
└── App.tsx            # Entry point
```

---

## Backend Architecture

### Express.js Application Structure

```
server/
├── server.js           # Application entry point
├── config/             # Configuration
│   └── database.js     # MongoDB connection
├── routes/             # API routes
│   ├── auth.js
│   ├── jobs.js
│   ├── referrals.js
│   ├── companies.js
│   ├── users.js
│   ├── admin.js
│   ├── payouts.js
│   ├── subscriptions.js
│   ├── ai.js
│   └── ...
├── controllers/        # Route controllers
│   └── adminController.js
├── middleware/         # Express middleware
│   ├── auth.js         # JWT authentication
│   ├── rbac.js         # Role-based access
│   ├── rateLimiter.js  # Rate limiting
│   ├── errorHandler.js # Error handling
│   └── ...
├── models/             # Mongoose models
│   ├── User.js
│   ├── Job.js
│   ├── Referral.js
│   ├── Company.js
│   └── ...
├── services/           # Business logic
│   ├── resumeOptimizer.js
│   ├── notificationService.js
│   ├── paymentGatewayService.js
│   └── ...
├── cron/               # Scheduled jobs
│   ├── payoutCron.js
│   ├── billingCron.js
│   └── ...
├── ml/                 # ML models
│   ├── hireProbabilityModel.js
│   └── salaryPredictionModel.js
└── webhooks/           # Webhook handlers
    ├── stripe.js
    └── 2c2p.js
```

### Middleware Stack

```javascript
// Request Processing Order
app.use(securityHeaders());    // Security headers
app.use(cors());               // CORS handling
app.use(compression());        // Gzip compression
app.use(express.json());       // Body parsing
app.use(requestLogger());      // Request logging
app.use(rateLimiter());        // Rate limiting
app.use(authenticate());       // JWT validation (selective)
app.use(authorize());          // RBAC (selective)
app.use(validateRequest());    // Input validation
app.use(routes);               // Route handlers
app.use(errorHandler());       // Error handling
```

### Authentication Flow

```
1. User Login
   POST /api/auth/login
   ↓
2. Validate Credentials
   - Check email exists
   - Verify password (bcrypt)
   ↓
3. Generate Tokens
   - Access Token (JWT, 15 min)
   - Refresh Token (JWT, 7 days)
   ↓
4. Return Tokens
   ↓
5. Client Stores Tokens
   - Access: Memory
   - Refresh: HttpOnly cookie
   ↓
6. Subsequent Requests
   - Include Access Token in Header
   - Refresh when expired
```

### RBAC (Role-Based Access Control)

**Roles Hierarchy**:
```
platform_admin
├── corporate_admin
│   ├── corporate_recruiter
│   └── corporate_viewer
├── referrer
└── job_seeker
```

**Permission Format**: `action:resource`
- `read:jobs` - View jobs
- `write:jobs` - Create/edit jobs
- `admin:users` - Full user management

---

## Database Architecture

### MongoDB Design

**Database**: `saramart-referral`

#### Collections Overview

| Collection | Purpose | Key Indexes |
|------------|---------|-------------|
| `users` | User accounts | email, role, referrerProfile.referralCode |
| `companies` | Company profiles | slug, verificationStatus |
| `jobs` | Job postings | companyId+status, text search |
| `referrals` | Referral records | code, referrerId, jobId |
| `applications` | Direct applications | jobId, applicantId |
| `subscriptions` | Subscription records | companyId, status |
| `payoutrequests` | Payout requests | referrerId, status |
| `billingrecords` | Invoices | companyId, status |
| `auditlogs` | Activity logs | userId, entityType, createdAt (TTL) |

#### Key Schema Patterns

**Referral Document**:
```javascript
{
  _id: ObjectId,
  code: String,              // Unique referral code
  jobId: ObjectId,           // Reference to Job
  referrerId: ObjectId,      // Reference to User
  referredPerson: {
    name: String,
    email: String,
    phone: String,
    resumeUrl: String
  },
  status: String,            // Enum of statuses
  statusHistory: [{
    status: String,
    changedBy: ObjectId,
    changedAt: Date,
    notes: String
  }],
  referralBonus: Number,
  platformCommission: Number,
  referrerPayout: Number,
  payout: {
    status: String,
    requestedAt: Date,
    paidAt: Date
  },
  submittedAt: Date,
  hiredAt: Date
}
```

**User Document**:
```javascript
{
  _id: ObjectId,
  email: String,             // Unique, indexed
  password: String,          // Bcrypt hashed
  name: String,
  role: String,              // Enum: referrer, job_seeker, etc.
  referrerProfile: {
    referralCode: String,    // Unique
    totalEarnings: Number,
    availableBalance: Number,
    kycStatus: String,
    tierLevel: String
  },
  status: String,
  createdAt: Date
}
```

### Data Relationships

```
User ||--o{ Referral : makes
User ||--o{ Application : submits
User ||--o{ CompanyUser : belongs_to
User ||--o{ PayoutRequest : requests

Company ||--o{ CompanyUser : has
Company ||--o{ Job : posts
Company ||--o{ Subscription : has
Company ||--o{ BillingRecord : generates

Job ||--o{ Referral : receives
Job ||--o{ Application : receives

Referral ||--o{ Payout : generates
```

### Indexing Strategy

**Critical Indexes**:
```javascript
// Users
users.createIndex({ email: 1 }, { unique: true })
users.createIndex({ "referrerProfile.referralCode": 1 }, { unique: true, sparse: true })
users.createIndex({ role: 1, status: 1 })

// Jobs
jobs.createIndex({ companyId: 1, status: 1 })
jobs.createIndex({ status: 1, isFeatured: 1, createdAt: -1 })
jobs.createIndex({ title: 'text', description: 'text' })

// Referrals
referrals.createIndex({ code: 1 }, { unique: true })
referrals.createIndex({ referrerId: 1, status: 1 })
referrals.createIndex({ jobId: 1, status: 1 })

// Audit Logs (TTL)
auditLogs.createIndex({ createdAt: -1 }, { expireAfterSeconds: 2592000 })
```

### Caching Strategy

**Redis Cache Keys**:
- `job:{id}` - Job details (TTL: 1 hour)
- `jobs:featured` - Featured jobs list (TTL: 15 min)
- `user:{id}` - User profile (TTL: 30 min)
- `company:{id}` - Company details (TTL: 1 hour)
- `analytics:{type}:{period}` - Analytics data (TTL: 1 hour)

---

## AI/ML Components

### Resume Optimizer Service

**Provider**: Moonshot AI (Kimi)

**Architecture**:
```
Client Upload
    ↓
PDF Parser (pdf-parse)
    ↓
Text Extraction
    ↓
AI Analysis (Moonshot API)
    ↓
Optimization Suggestions
    ↓
Markdown Generation
    ↓
Response to Client
```

**Key Features**:
- Resume text extraction from PDF
- Content analysis and scoring
- Job description matching
- Optimization recommendations
- Formatted output generation

### Matching Algorithm

**Candidate-Job Matching**:
```javascript
// Factors considered
const matchFactors = {
  skillsMatch: 0.35,        // Keyword matching
  experienceMatch: 0.25,    // Years alignment
  locationMatch: 0.15,      // Location preference
  salaryMatch: 0.15,        // Salary alignment
  educationMatch: 0.10      // Education level
};
```

**Implementation**:
- TF-IDF for skill matching
- Weighted scoring algorithm
- Machine learning for ranking
- Continuous improvement from hire data

### ML Models

**Hire Probability Model**:
- Predicts likelihood of hire
- Trained on historical referral data
- Features: candidate profile, job fit, referrer history

**Salary Prediction Model**:
- Suggests competitive salaries
- Based on market data
- Factors: role, experience, location, industry

---

## Security Architecture

### Authentication & Authorization

**JWT Implementation**:
```javascript
// Token Structure
{
  header: { alg: "HS256", typ: "JWT" },
  payload: {
    sub: "user_id",
    role: "referrer",
    companyId: "company_id",
    permissions: ["read:jobs", "write:referrals"],
    iat: 1234567890,
    exp: 1234571490
  }
}
```

**Security Measures**:
- Short-lived access tokens (15 min)
- Refresh token rotation
- HttpOnly cookies for refresh tokens
- CSRF protection
- Rate limiting per user/IP

### Data Protection

**Encryption**:
- At Rest: MongoDB encryption
- In Transit: TLS 1.3
- Sensitive Fields: Application-level encryption
  - Payment details
  - NRC numbers
  - Bank account info

**Password Security**:
- bcrypt with salt rounds: 12
- Minimum password requirements
- Password history (prevent reuse)

### API Security

**Rate Limiting**:
```javascript
// Standard tier
windowMs: 15 * 60 * 1000,  // 15 minutes
max: 100  // requests per window

// Enterprise tier
windowMs: 15 * 60 * 1000,
max: 1000
```

**Input Validation**:
- Joi/Zod schemas
- Sanitization (prevent XSS)
- SQL/NoSQL injection prevention
- File upload restrictions

### Infrastructure Security

- **DDoS Protection**: Cloudflare/AWS Shield
- **WAF**: Web Application Firewall rules
- **VPC**: Private network for databases
- **Security Groups**: Restricted port access

---

## Integration Architecture

### Payment Gateways

**Myanmar Payment Providers**:

| Provider | Integration | Webhook |
|----------|-------------|---------|
| KBZPay | REST API | ✅ |
| WavePay | REST API | ✅ |
| CB Pay | REST API | ✅ |
| Bank Transfer | Manual | ❌ |

**Payment Flow**:
```
1. Initiate Payment
   ↓
2. Redirect to Provider
   ↓
3. User Completes Payment
   ↓
4. Provider Webhook
   ↓
5. Verify Payment
   ↓
6. Update Account
   ↓
7. Send Confirmation
```

### Notification Services

**Email (SendGrid)**:
- Transactional emails
- Marketing campaigns
- Digest summaries

**SMS (Twilio)**:
- OTP verification
- Important alerts
- Payout notifications

**Push Notifications**:
- Web Push (service workers)
- Mobile push (Firebase)

**WebSockets**:
- Real-time notifications
- Chat functionality
- Live updates

### Third-Party Services

| Service | Purpose |
|---------|---------|
| AWS S3 | File storage |
| Cloudflare | CDN, DNS, Security |
| SendGrid | Email delivery |
| Twilio | SMS delivery |
| Moonshot AI | Resume optimization |
| Stripe | International payments |

---

## Scalability & Performance

### Horizontal Scaling

**Load Balancing**:
- Nginx as reverse proxy
- Round-robin distribution
- Health checks
- Auto-scaling groups

**Database Scaling**:
- MongoDB replica sets
- Read replicas for analytics
- Sharding (future consideration)

**Caching Layers**:
- Redis for session storage
- Application caching
- CDN for static assets

### Performance Optimization

**Database**:
- Query optimization
- Proper indexing
- Connection pooling
- Query result caching

**API**:
- Response compression (gzip)
- Pagination
- Field selection
- Batch operations

**Frontend**:
- Code splitting
- Lazy loading
- Image optimization
- Service worker caching

### Capacity Planning

**Current Capacity**:
- 10,000 concurrent users
- 100 requests/second
- 1TB data storage

**Scaling Triggers**:
- CPU > 70% for 5 minutes
- Memory > 80%
- Response time > 500ms
- Error rate > 1%

---

## Monitoring & Observability

### Logging

**Structured Logging**:
```javascript
{
  timestamp: "2026-02-04T09:30:00Z",
  level: "info",
  message: "Referral created",
  context: {
    userId: "...",
    referralId: "...",
    jobId: "..."
  },
  requestId: "uuid",
  duration: 150
}
```

**Log Levels**:
- ERROR: Application errors
- WARN: Warning conditions
- INFO: General information
- DEBUG: Detailed debugging

### Metrics

**Application Metrics**:
- Request rate
- Response time (p50, p95, p99)
- Error rate
- Active connections

**Business Metrics**:
- New registrations
- Referral submissions
- Successful hires
- Revenue

**Infrastructure Metrics**:
- CPU usage
- Memory usage
- Disk I/O
- Network traffic

### Alerting

**Alert Conditions**:
- Error rate > 5%
- Response time > 2s
- Database connections > 80%
- Disk space < 20%
- Payment failures > 10%

**Notification Channels**:
- Email
- Slack
- PagerDuty (critical)

### Health Checks

**Endpoint**: `GET /api/v1/health`

```json
{
  "status": "healthy",
  "timestamp": "2026-02-04T09:30:00Z",
  "checks": {
    "database": "connected",
    "redis": "connected",
    "payments": "operational"
  }
}
```

---

## Deployment Architecture

### Environment Strategy

| Environment | Purpose | Data |
|-------------|---------|------|
| Local | Development | Mock/Sample |
| Staging | Testing | Anonymized production |
| Production | Live | Real data |

### Containerization

**Docker**:
```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 5000
CMD ["node", "dist/server.js"]
```

### Orchestration

**Kubernetes** (Future):
- Deployment manifests
- Service definitions
- ConfigMaps and Secrets
- Horizontal Pod Autoscaler

**Current: Docker Compose**
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
    depends_on:
      - mongodb
      - redis
  
  mongodb:
    image: mongo:6
    volumes:
      - mongo_data:/data/db
  
  redis:
    image: redis:7-alpine
```

---

## Disaster Recovery

### Backup Strategy

**Database**:
- Daily automated backups
- Point-in-time recovery
- Cross-region replication
- 30-day retention

**File Storage**:
- S3 versioning enabled
- Cross-region replication
- Lifecycle policies

### Recovery Objectives

- **RPO (Recovery Point Objective)**: 1 hour
- **RTO (Recovery Time Objective)**: 4 hours

### Failover Procedures

1. **Detection**: Automated monitoring
2. **Notification**: Alert team
3. **Assessment**: Determine scope
4. **Failover**: Switch to standby
5. **Verification**: Confirm functionality
6. **Communication**: Notify users
7. **Root Cause**: Post-incident analysis

---

*Last Updated: February 2026*

*© 2026 TRM Platform. All rights reserved.*
