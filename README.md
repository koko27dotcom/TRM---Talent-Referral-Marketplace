# TRM (Talent Referral Marketplace) Platform

<p align="center">
  <img src="public/trm-logo.svg" alt="TRM Logo" width="180"/>
</p>

<p align="center">
  <strong>🌏 Myanmar's Premier AI-Powered Referral Hiring Platform</strong>
</p>

<p align="center">
  <a href="#-overview">Overview</a> •
  <a href="#-key-features">Features</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-documentation">Documentation</a> •
  <a href="#-contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18.x-339933?logo=node.js&logoColor=white" alt="Node.js 18"/>
  <img src="https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=black" alt="React 18"/>
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5"/>
  <img src="https://img.shields.io/badge/MongoDB-6.x-47A248?logo=mongodb&logoColor=white" alt="MongoDB 6"/>
  <img src="https://img.shields.io/badge/Redis-7.x-DC382D?logo=redis&logoColor=white" alt="Redis 7"/>
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white" alt="Docker"/>
  <img src="https://img.shields.io/badge/Kubernetes-Supported-326CE5?logo=kubernetes&logoColor=white" alt="Kubernetes"/>
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="License: MIT"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Viber-Integration-8B5CF6?logo=viber&logoColor=white" alt="Viber"/>
  <img src="https://img.shields.io/badge/Telegram-Integration-26A5E4?logo=telegram&logoColor=white" alt="Telegram"/>
  <img src="https://img.shields.io/badge/KBZPay-Payment-FFD700" alt="KBZPay"/>
  <img src="https://img.shields.io/badge/WavePay-Payment-00BFFF" alt="WavePay"/>
</p>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Technology Stack](#-tech-stack)
- [Architecture Overview](#-architecture)
- [Quick Start Guide](#-quick-start)
- [Project Structure](#-project-structure)
- [Development Guide](#-development-guide)
- [Deployment](#-deployment)
- [API Documentation](#-api-documentation)
- [Contributing](#-contributing)
- [Support & Resources](#-support--resources)
- [License](#-license)
- [Acknowledgments](#-acknowledgments)

---

## 🎯 Overview

TRM (Talent Referral Marketplace) is a comprehensive referral-based hiring platform built specifically for the **Myanmar market**. It connects talented job seekers with companies through a network of professional referrers, leveraging AI-powered resume optimization and gamification to create a unique hiring ecosystem.

### 🌟 Value Proposition

| Stakeholder | Benefit |
|-------------|---------|
| **Referrers** | Earn 85% of referral bonuses by connecting candidates with opportunities |
| **Companies** | Access pre-vetted candidates through trusted referral networks |
| **Job Seekers** | Get their resumes optimized by AI and referred by professionals |
| **Platform** | Facilitate hiring while earning 15% commission on successful referrals |

### 🎯 Target Market

- **Primary Market**: Myanmar (Myanmar Kyat - MMK)
- **User Base**: 99% Viber/Telegram penetration
- **Payment Methods**: KBZPay, WavePay, AYA Pay, MMQR
- **Language Support**: English & Myanmar (Burmese)

### 🏆 Key Highlights

- 🌏 **Myanmar-Focused**: Localized for Myanmar market with native payment integrations
- 🤖 **AI-Powered**: Resume optimization using Moonshot AI (Kimi)
- 💰 **Fair Compensation**: Transparent referral bonus system (85% to referrers)
- 🎮 **Gamified**: Points, badges, and tier system for engagement
- 🔒 **Secure**: Enterprise-grade security with KYC verification
- 📱 **Mobile-First**: Responsive web and native mobile apps
- 💬 **Messaging Integration**: Viber & Telegram bot integration
- 📊 **Market Intelligence**: 100K CV database with salary insights

---

## ✨ Key Features

### 💬 Messaging Integration (Viber & Telegram)

Seamless communication through Myanmar's most popular messaging platforms:

- **Viber Integration**: 99% market penetration in Myanmar
  - Interactive keyboard buttons
  - Broadcast messaging
  - Webhook events handling
  - Rich media support

- **Telegram Integration**: Growing popularity
  - HTML formatted messages
  - Inline keyboards
  - Callback queries
  - Channel broadcasting

- **WhatsApp (Legacy)**: International users support

📖 [Messaging Integration Docs](docs/technical/messaging-integration.md)

### 🎓 Referral Academy

Educational platform to help users maximize their referral success:

- 📚 **Structured Courses**: Getting started, referral strategies, payment mechanisms
- 🎯 **Interactive Quizzes**: Test knowledge and earn points
- 🏆 **Certificates**: Earn upon course completion
- 🎮 **Gamification**: Points, badges, and leaderboards
- 🌐 **Bilingual**: English and Myanmar language support
- 📈 **Progress Tracking**: Track learning journey

📖 [Referral Academy Docs](docs/technical/referral-academy.md)

### 📄 CV Scraping (100K CVs)

Comprehensive talent pool building through automated CV collection:

- **Multi-Source Scraping**: JobNet Myanmar, Jobs in Yangon, Myanmar Jobs DB, CareerJet
- **AI-Powered Enrichment**: Skill categorization, experience calculation, salary estimation
- **Duplicate Detection**: Prevents duplicate entries, updates existing profiles
- **Scheduled Operations**: Automated daily scraping with background processing
- **Data Quality**: Validation and verification systems

📖 [CV Scraping Docs](docs/technical/cv-scraping.md)

### 📊 Market Analysis & Salary Insights

Data-driven insights for informed decision making:

- 📈 **Market Trends**: Track job market trends over time
- 💰 **Salary Benchmarks**: Compare salaries across roles and industries
- 🎯 **Skill Analysis**: Identify in-demand skills
- 🏭 **Industry Comparison**: Compare different industries
- 📋 **Salary Surveys**: Collect and analyze salary data
- 🔮 **AI Predictions**: Salary prediction models

📖 [Market Analysis Docs](docs/technical/market-analysis.md)

### 💳 Payment Integration (KBZPay, WavePay, AYA Pay, MMQR)

Comprehensive Myanmar payment gateway integration:

| Provider | Features | Status |
|----------|----------|--------|
| **KBZPay** | QR payments, app deep links, MD5 signatures | ✅ Active |
| **WavePay** | Wallet transfers, SHA256 signatures | ✅ Active |
| **AYA Pay** | Banking-grade, HMAC-SHA256 | ✅ Active |
| **MMQR** | Unified QR standard, EMVCo compliant | ✅ Active |

- **Deposit & Withdrawal**: Full transaction lifecycle management
- **QR Code Generation**: In-person payment support
- **Webhook Handling**: Real-time transaction updates
- **Reconciliation**: Automated payment reconciliation
- **Multi-Currency**: MMK primary, USD support

📖 [Payment Integration Docs](docs/technical/payment-integration.md)

### 👥 Community Engagement

Build and nurture the referrer community:

- **Community Groups**: Topic-based discussion groups
- **Forums**: Q&A and knowledge sharing
- **Events**: Virtual and in-person meetups
- **Mentorship**: Experienced referrer guidance
- **Success Stories**: Share and celebrate wins

### 🎮 Gamification

Engaging reward system to motivate platform participation:

- **Points System**: Earn points for referrals, academy completion, community participation
- **Badge System**: Achievement badges for milestones
- **Tier System**: Bronze → Silver → Gold → Platinum → Diamond
- **Leaderboards**: Weekly and monthly rankings
- **Challenges**: Special events with bonus rewards
- **Streaks**: Daily/weekly activity bonuses

### 📈 Analytics Dashboard

Comprehensive insights for all user types:

**For Referrers:**
- Referral success rates
- Earnings tracking
- Performance trends
- Skill gap analysis

**For Companies:**
- Hiring funnel analytics
- Time-to-hire metrics
- Source effectiveness
- ROI calculations

**For Admins:**
- Platform-wide statistics
- Revenue analytics
- User growth metrics
- System health monitoring

### 📱 Mobile App

Native mobile experience with React Native:

- **iOS & Android**: Cross-platform support
- **Push Notifications**: Real-time updates
- **Offline Support**: Limited offline functionality
- **Biometric Auth**: Fingerprint/Face ID
- **Camera Integration**: Document scanning for KYC

---

## 🛠 Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.x | UI Framework |
| **TypeScript** | 5.x | Type Safety |
| **Vite** | 5.x | Build Tool |
| **Tailwind CSS** | 3.x | Styling |
| **shadcn/ui** | Latest | Component Library |
| **Framer Motion** | 11.x | Animations |
| **Recharts** | 2.x | Data Visualization |
| **TanStack Query** | 5.x | Server State Management |
| **React Router** | 6.x | Routing |
| **Axios** | 1.x | HTTP Client |
| **Zod** | 3.x | Schema Validation |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18.x | Runtime |
| **Express.js** | 4.x | Web Framework |
| **MongoDB** | 6.x | Primary Database |
| **Mongoose** | 8.x | ODM |
| **Redis** | 7.x | Cache & Sessions |
| **Bull** | 4.x | Job Queue |
| **JWT** | 9.x | Authentication |
| **bcrypt** | 5.x | Password Hashing |
| **Winston** | 3.x | Logging |
| **Joi** | 17.x | Validation |

### Mobile

| Technology | Version | Purpose |
|------------|---------|---------|
| **React Native** | 0.73+ | Mobile Framework |
| **Expo** | 50+ | Development Platform |
| **Zustand** | 4.x | State Management |
| **React Navigation** | 6.x | Navigation |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| **Docker** | Containerization |
| **Docker Compose** | Local Development |
| **Kubernetes** | Orchestration |
| **Nginx** | Reverse Proxy |
| **Prometheus** | Metrics Collection |
| **Grafana** | Monitoring Dashboard |

### Third-Party Services

| Service | Purpose |
|---------|---------|
| **Moonshot AI (Kimi)** | Resume optimization |
| **SendGrid** | Email delivery |
| **Twilio** | SMS notifications |
| **AWS S3** | File storage |
| **KBZPay API** | Payment processing |
| **WavePay API** | Payment processing |
| **Viber Bot API** | Messaging |
| **Telegram Bot API** | Messaging |

---

## 🏗 Architecture

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

### Security Architecture

- **Authentication**: JWT with refresh tokens
- **Authorization**: Role-Based Access Control (RBAC)
- **Encryption**: AES-256 for sensitive data
- **HTTPS**: TLS 1.3 for all communications
- **Rate Limiting**: Request throttling per IP/user
- **Input Validation**: Joi/Zod schema validation
- **CORS**: Configured for specific origins
- **Security Headers**: Helmet.js protection

📖 [Detailed Architecture Docs](docs/technical/architecture.md)
📖 [Security Implementation](docs/security/SECURITY_IMPLEMENTATION.md)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: 18.x or higher
- **MongoDB**: 6.0 or higher
- **Redis**: 7.0 or higher
- **Git**: Latest version
- **Docker** (optional): For containerized setup

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/your-org/trm-platform.git
cd trm-platform
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Environment Setup

```bash
cp .env.example .env
```

Edit `.env` file with your configuration:

```bash
# Required
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/trm-platform
JWT_ACCESS_SECRET=your-secret-key-min-32-characters
JWT_REFRESH_SECRET=your-refresh-secret-min-32-characters

# Optional (for full features)
MOONSHOT_API_KEY=your-moonshot-api-key
KBZPAY_MERCHANT_ID=your-kbzpay-merchant-id
VIBER_AUTH_TOKEN=your-viber-token
TELEGRAM_BOT_TOKEN=your-telegram-token
```

#### 4. Database Setup

Start MongoDB and Redis:

```bash
# Using Docker (recommended)
docker-compose -f docker/docker-compose.yml up -d mongodb redis

# Or using local installations
mongod --dbpath /path/to/data
redis-server
```

#### 5. Seed Database

```bash
npm run seed
```

This creates:
- Default admin user (admin@trm.com / admin123)
- Sample companies and jobs
- Market analysis data
- Academy courses

#### 6. Run the Application

**Development Mode (Frontend + Backend):**

```bash
# Terminal 1 - Backend
npm run server:dev

# Terminal 2 - Frontend
npm run dev
```

**Production Mode:**

```bash
npm run build
npm start
```

#### 7. Access the Application

- **Web App**: http://localhost:5173
- **API**: http://localhost:5000/api/v1
- **Admin Dashboard**: http://localhost:5173/admin

### Docker Setup (Recommended)

```bash
# Start all services
docker-compose -f docker/docker-compose.yml up -d

# View logs
docker-compose -f docker/docker-compose.yml logs -f

# Stop services
docker-compose -f docker/docker-compose.yml down
```

---

## 📁 Project Structure

```
trm-platform/
├── 📂 server/                    # Backend application
│   ├── 📂 config/               # Configuration files
│   │   ├── database.js          # MongoDB connection
│   │   ├── redis.js             # Redis configuration
│   │   └── performance.js       # Performance settings
│   ├── 📂 controllers/          # Route controllers
│   │   ├── authController.js
│   │   ├── jobController.js
│   │   ├── referralController.js
│   │   └── adminController.js
│   ├── 📂 models/               # Mongoose models
│   │   ├── User.js
│   │   ├── Job.js
│   │   ├── Referral.js
│   │   └── PaymentTransaction.js
│   ├── 📂 routes/               # API routes
│   │   ├── auth.js
│   │   ├── jobs.js
│   │   ├── referrals.js
│   │   └── payments.js
│   ├── 📂 services/             # Business logic
│   │   ├── payment/
│   │   │   ├── PaymentService.js
│   │   │   └── providers/
│   │   ├── aiService.js
│   │   └── messagingService.js
│   ├── 📂 middleware/           # Express middleware
│   │   ├── auth.js
│   │   ├── rateLimiter.js
│   │   └── validation.js
│   ├── 📂 cron/                 # Scheduled jobs
│   ├── 📂 seeders/              # Database seeders
│   ├── 📂 scripts/              # Utility scripts
│   └── server.js                # Entry point
│
├── 📂 src/                      # Frontend application
│   ├── 📂 components/           # React components
│   │   ├── ui/                  # shadcn/ui components
│   │   ├── forms/               # Form components
│   │   └── layout/              # Layout components
│   ├── 📂 sections/             # Page sections
│   │   ├── Login.tsx
│   │   ├── Marketplace.tsx
│   │   ├── PaymentDashboard.tsx
│   │   └── AdminDashboard.tsx
│   ├── 📂 contexts/             # React contexts
│   ├── 📂 hooks/                # Custom hooks
│   ├── 📂 services/             # API services
│   ├── 📂 types/                # TypeScript types
│   ├── 📂 lib/                  # Utilities
│   └── App.tsx                  # Main app component
│
├── 📂 mobile/                   # React Native app
│   ├── 📂 src/
│   │   ├── components/
│   │   ├── screens/
│   │   ├── navigation/
│   │   └── services/
│   └── App.tsx
│
├── 📂 docs/                     # Documentation
│   ├── 📂 technical/            # Technical docs
│   ├── 📂 deployment/           # Deployment guides
│   ├── 📂 api/                  # API documentation
│   ├── 📂 guides/               # User guides
│   └── 📂 security/             # Security docs
│
├── 📂 docker/                   # Docker configuration
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── nginx.conf
│
├── 📂 k8s/                      # Kubernetes manifests
│   ├── app-deployment.yaml
│   ├── mongodb-deployment.yaml
│   └── ingress.yaml
│
├── 📂 sdk/                      # Client SDKs
│   ├── javascript/
│   ├── python/
│   └── php/
│
├── 📂 monitoring/               # Monitoring config
│   ├── prometheus.yml
│   └── alert-rules.yml
│
├── 📂 scripts/                  # Deployment scripts
├── 📂 e2e/                      # E2E tests
├── 📂 tests/                    # Unit & integration tests
├── package.json
├── README.md
└── .env.example
```

---

## 💻 Development Guide

### Available Scripts

#### Development

```bash
npm run dev              # Start frontend dev server
npm run server:dev       # Start backend with nodemon
npm run start            # Start production server
```

#### Database

```bash
npm run seed             # Seed all data
npm run seed:users       # Seed users only
npm run seed:jobs        # Seed jobs only
npm run seed:market      # Seed market data
npm run seed:academy     # Seed academy courses
npm run seed:clear       # Clear all data
```

#### Testing

```bash
npm run test             # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage
npm run test:unit        # Run unit tests only
npm run test:integration # Run integration tests
npm run test:e2e         # Run E2E tests
npm run test:e2e:ui      # Run E2E tests with UI
```

#### Code Quality

```bash
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run format           # Format with Prettier
npm run typecheck        # TypeScript type checking
```

#### Performance

```bash
npm run perf:cache:clear    # Clear Redis cache
npm run perf:cache:stats    # View cache statistics
npm run perf:cache:warm     # Warm cache
npm run db:indexes:create   # Create database indexes
npm run db:indexes:health   # Check index health
```

#### Payments

```bash
npm run payment:reconcile   # Reconcile payments
npm run payment:stats       # View payment statistics
```

#### Security

```bash
npm run security:audit      # Run security audit
npm run security:rotate-keys # Rotate encryption keys
```

### Code Style & Conventions

- **ESLint**: Standard configuration with TypeScript support
- **Prettier**: Consistent code formatting
- **Conventional Commits**: Structured commit messages
- **Branch Naming**: `feature/`, `bugfix/`, `hotfix/` prefixes

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/your-feature-name
```

---

## 🚢 Deployment

### Quick Deployment

#### Using Docker Compose

```bash
docker-compose -f docker/docker-compose.yml up -d
```

#### Using Kubernetes

```bash
kubectl apply -f k8s/
```

### Deployment Environments

| Environment | URL | Purpose |
|-------------|-----|---------|
| Development | http://localhost:5173 | Local development |
| Staging | https://staging.trm.com | Pre-production testing |
| Production | https://app.trm.com | Live application |

### Environment Variables

Key environment variables for production:

```bash
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://...
REDIS_URL=redis://...
JWT_ACCESS_SECRET=<strong-secret>
JWT_REFRESH_SECRET=<strong-secret>

# Payment Providers
KBZPAY_MERCHANT_ID=...
KBZPAY_API_KEY=...
WAVEPAY_MERCHANT_ID=...
WAVEPAY_API_KEY=...

# Third-party Services
MOONSHOT_API_KEY=...
SENDGRID_API_KEY=...
AWS_ACCESS_KEY_ID=...
```

📖 [Detailed Deployment Guide](docs/deployment/PRODUCTION_DEPLOYMENT_GUIDE.md)
📖 [Deployment Checklists](docs/deployment/DEPLOYMENT_CHECKLISTS.md)

---

## 📚 API Documentation

### Base URL

```
Development: http://localhost:5000/api/v1
Production:  https://api.trm.com/v1
```

### Authentication

All API requests require authentication using JWT tokens:

```bash
# Obtain token
POST /api/v1/auth/login

# Use token in requests
Authorization: Bearer <your-jwt-token>
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login` | POST | User login |
| `/auth/register` | POST | User registration |
| `/auth/refresh` | POST | Refresh token |
| `/jobs` | GET | List all jobs |
| `/jobs` | POST | Create new job |
| `/jobs/:id` | GET | Get job details |
| `/referrals` | GET | List referrals |
| `/referrals` | POST | Submit referral |
| `/payments/deposit` | POST | Create deposit |
| `/payments/withdrawal` | POST | Create withdrawal |
| `/users/profile` | GET | Get user profile |
| `/analytics/dashboard` | GET | Get analytics |

### API Keys (Enterprise)

Enterprise clients can use API keys:

```bash
X-API-Key: trm_live_abc123...
```

📖 [Full API Documentation](docs/api/v1/openapi.yaml)
📖 [Authentication Guide](docs/api/authentication.md)
📖 [Webhook Documentation](docs/api/webhooks.md)

---

## 🤝 Contributing

We welcome contributions from the community! Please read our contributing guidelines before submitting PRs.

### How to Contribute

1. **Fork the Repository**
   ```bash
   git clone https://github.com/your-org/trm-platform.git
   ```

2. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes**
   - Follow code style guidelines
   - Write tests for new features
   - Update documentation

4. **Submit PR**
   - Fill out PR template
   - Link related issues
   - Request review

### Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help newcomers get started
- Respect different viewpoints

### Pull Request Process

1. Ensure tests pass
2. Update documentation
3. Add changelog entry
4. Request review from maintainers
5. Address feedback
6. Merge after approval

---

## 📖 Documentation

### Technical Documentation

- [Architecture Overview](docs/technical/architecture.md)
- [Database Schema](docs/technical/database-schema.md)
- [Payment Integration](docs/technical/payment-integration.md)
- [Messaging Integration](docs/technical/messaging-integration.md)
- [CV Scraping](docs/technical/cv-scraping.md)
- [Market Analysis](docs/technical/market-analysis.md)
- [Referral Academy](docs/technical/referral-academy.md)
- [Performance Optimization](docs/technical/performance-optimization.md)

### User Guides

- [Admin Guide](docs/guides/admin-guide.md)
- [Company Guide](docs/guides/company-guide.md)
- [Referrer Guide](docs/guides/referrer-guide.md)

### Deployment & Operations

- [Production Deployment Guide](docs/deployment/PRODUCTION_DEPLOYMENT_GUIDE.md)
- [Cloud Deployment](docs/deployment/CLOUD_DEPLOYMENT.md)
- [Deployment Checklists](docs/deployment/DEPLOYMENT_CHECKLISTS.md)

### Security & Testing

- [Security Implementation](docs/security/SECURITY_IMPLEMENTATION.md)
- [Testing Guide](docs/testing/TESTING_GUIDE.md)
- [Troubleshooting](docs/integration/TROUBLESHOOTING_GUIDE.md)

---

## 🆘 Support & Resources

### Getting Help

- 📧 **Email**: support@trm.com
- 💬 **Viber**: @trmsupport
- 💬 **Telegram**: @trm_support_bot
- 📚 **Documentation**: https://docs.trm.com
- 🐛 **Issue Tracker**: https://github.com/your-org/trm-platform/issues

### Troubleshooting

Common issues and solutions:

**MongoDB Connection Error:**
```bash
# Ensure MongoDB is running
sudo systemctl start mongod
# Or using Docker
docker-compose up -d mongodb
```

**Redis Connection Error:**
```bash
# Ensure Redis is running
redis-server
# Or using Docker
docker-compose up -d redis
```

**Port Already in Use:**
```bash
# Find and kill process
lsof -ti:5000 | xargs kill -9
```

📖 [Full Troubleshooting Guide](docs/integration/TROUBLESHOOTING_GUIDE.md)

### Community

- 🌟 **GitHub Discussions**: Share ideas and ask questions
- 💼 **LinkedIn**: Follow for updates
- 🐦 **Twitter**: @trm_platform

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024 TRM Platform

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

## 🙏 Acknowledgments

### Team

- **Core Development Team**: Building the platform
- **Design Team**: UI/UX excellence
- **QA Team**: Ensuring quality
- **DevOps Team**: Infrastructure and deployment

### Technology Partners

- **Moonshot AI**: AI-powered resume optimization
- **KBZPay**: Payment gateway integration
- **WavePay**: Mobile payment solutions
- **Viber**: Messaging platform
- **Telegram**: Bot platform

### Myanmar-Specific Adaptations

This platform is specifically designed for the Myanmar market with:

- 🇲🇲 **Local Payment Methods**: KBZPay, WavePay, AYA Pay, MMQR
- 💬 **Messaging Integration**: Viber (99% penetration) and Telegram
- 🌐 **Bilingual Support**: English and Myanmar (Burmese)
- 💰 **Local Currency**: Myanmar Kyat (MMK) as primary currency
- 📱 **Mobile-First**: Optimized for Myanmar's mobile-heavy usage
- 🏦 **KYC Compliance**: Adapted for Myanmar regulatory requirements

### Open Source

Built with amazing open-source technologies:
- React, Node.js, MongoDB, Redis
- Express.js, Tailwind CSS, shadcn/ui
- And many more...

---

<p align="center">
  <strong>Made with ❤️ for Myanmar</strong>
</p>

<p align="center">
  <a href="https://trm.com">Website</a> •
  <a href="https://docs.trm.com">Documentation</a> •
  <a href="https://status.trm.com">Status</a>
</p>
