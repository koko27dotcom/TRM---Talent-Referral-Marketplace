# TRM Referral Platform - Complete File Inventory

> **Document Type:** File Inventory & Codebase Reference  
> **Generated:** February 6, 2026  
> **Total Files:** 586 source files | 29 documentation files | 22 test files

---

## 📊 Inventory Summary

### File Count by Category

| Category | Count | Percentage |
|----------|-------|------------|
| **Backend (Server)** | 300+ | 51% |
| **Frontend (Web)** | 200+ | 34% |
| **Mobile App** | 60+ | 10% |
| **Tests** | 22 | 4% |
| **Documentation** | 29 | 5% |
| **Configuration** | 25+ | 4% |
| **Total** | **636+** | **100%** |

### File Count by Type

| Extension | Count | Purpose |
|-----------|-------|---------|
| `.js` | 350+ | JavaScript (Node.js backend) |
| `.ts` | 150+ | TypeScript (Frontend/Mobile) |
| `.tsx` | 80+ | React TypeScript components |
| `.json` | 30+ | Configuration files |
| `.md` | 29 | Documentation |
| `.yaml/.yml` | 15+ | Kubernetes/Docker configs |
| `.css` | 5+ | Stylesheets |
| **Total** | **659+** | |

---

## 📁 Directory Structure

```
myan-jobs/                          # Root Directory
│
├── 📄 Configuration Files
│   ├── .env                         # Environment variables
│   ├── .env.example                 # Environment template
│   ├── .gitignore                   # Git ignore rules
│   ├── package.json                 # NPM dependencies
│   ├── package-lock.json            # Locked dependencies
│   ├── tsconfig.json                # TypeScript config
│   ├── vite.config.ts               # Vite configuration
│   ├── jest.config.js               # Jest test config
│   ├── playwright.config.ts         # Playwright E2E config
│   ├── tailwind.config.js           # Tailwind CSS config
│   ├── postcss.config.js            # PostCSS config
│   ├── ecosystem.config.js          # PM2 config
│   ├── server.cjs                   # Server entry point
│   └── railway.json                 # Railway deployment config
│
├── 📁 docs/                         # Documentation (29 files)
│   ├── IMPLEMENTATION_GUIDE.md      # Implementation roadmap
│   ├── scaling.md                   # Scaling strategies
│   │
│   ├── 📁 api/                      # API Documentation
│   │   ├── authentication.md        # Auth documentation
│   │   ├── webhooks.md              # Webhook documentation
│   │   └── v1/
│   │       └── openapi.yaml         # OpenAPI specification
│   │
│   ├── 📁 deployment/               # Deployment Guides
│   │   ├── CLOUD_DEPLOYMENT.md      # Cloud deployment
│   │   ├── DEPLOYMENT_CHECKLISTS.md # Deployment checklists
│   │   └── PRODUCTION_DEPLOYMENT_GUIDE.md # Production guide
│   │
│   ├── 📁 guides/                   # User Guides
│   │   ├── admin-guide.md           # Admin guide
│   │   ├── company-guide.md         # Company guide
│   │   └── referrer-guide.md        # Referrer guide
│   │
│   ├── 📁 integration/              # Integration Docs
│   │   ├── INTEGRATION_TEST_REPORT.md
│   │   ├── PRE_DEPLOYMENT_CHECKLIST.md
│   │   └── TROUBLESHOOTING_GUIDE.md
│   │
│   ├── 📁 project-completion/       # Completion Docs
│   │   ├── COMPLETION_CHECKLIST.md  # Master checklist
│   │   ├── PROJECT_SUMMARY.md       # Project summary
│   │   ├── COMPLETION_CERTIFICATE.md # Certificate
│   │   ├── HANDOVER_DOCUMENTATION.md # Handover guide
│   │   ├── MAINTENANCE_GUIDE.md     # Maintenance guide
│   │   ├── EXECUTIVE_SUMMARY.md     # Executive summary
│   │   ├── FILE_INVENTORY.md        # This file
│   │   └── STATISTICS_SUMMARY.md    # Statistics
│   │
│   ├── 📁 security/                 # Security Docs
│   │   └── SECURITY_IMPLEMENTATION.md
│   │
│   ├── 📁 technical/                # Technical Docs
│   │   ├── architecture.md          # Architecture overview
│   │   ├── cv-scraping.md           # CV scraping docs
│   │   ├── database-schema.md       # Database schema
│   │   ├── deployment.md            # Deployment technical
│   │   ├── market-analysis.md       # Market analysis
│   │   ├── messaging-integration.md # Messaging docs
│   │   ├── payment-integration.md   # Payment docs
│   │   ├── performance-optimization.md
│   │   └── referral-academy.md      # Academy docs
│   │
│   └── 📁 testing/                  # Testing Docs
│       └── TESTING_GUIDE.md
│
├── 📁 server/                       # Backend (300+ files)
│   ├── server.js                    # Main server entry
│   │
│   ├── 📁 config/                   # Configuration (9 files)
│   │   ├── database.js              # Database connection
│   │   ├── databaseIndexes.js       # Index definitions
│   │   ├── databasePool.js          # Connection pooling
│   │   ├── performance.js           # Performance config
│   │   ├── redis.js                 # Redis connection
│   │   ├── redisCluster.js          # Redis cluster
│   │   └── security.js              # Security config
│   │
│   ├── 📁 controllers/              # Controllers (1 file)
│   │   └── adminController.js
│   │
│   ├── 📁 cron/                     # Cron Jobs (8 files)
│   │   ├── analyticsCron.js         # Analytics aggregation
│   │   ├── billingCron.js           # Billing cycle
│   │   ├── communityCron.js         # Community engagement
│   │   ├── leaderboardCron.js       # Leaderboard updates
│   │   ├── partnerCron.js           # Partner sync
│   │   ├── payoutCron.js            # Payout processing
│   │   ├── revenueCron.js           # Revenue calculation
│   │   └── workflowCron.js          # Workflow automation
│   │
│   ├── 📁 middleware/               # Middleware (7 files)
│   │   ├── apiSecurity.js           # API security
│   │   ├── compression.js           # Response compression
│   │   ├── ddosProtection.js        # DDoS protection
│   │   ├── inputValidation.js       # Input validation
│   │   ├── partnerAuth.js           # Partner auth
│   │   ├── payment.js               # Payment middleware
│   │   ├── rateLimiter.js           # Rate limiting
│   │   ├── securityIndex.js         # Security headers
│   │   └── sensitiveDataFilter.js   # Data filtering
│   │
│   ├── 📁 ml/                       # ML Models (3 files)
│   │   ├── hireProbabilityModel.js  # Hire prediction
│   │   ├── retentionModel.js        # User retention
│   │   └── salaryPredictionModel.js # Salary prediction
│   │
│   ├── 📁 models/                   # Database Models (70+)
│   │   ├── Achievement.js
│   │   ├── AnalyticsEvent.js
│   │   ├── AnalyticsInsight.js
│   │   ├── AnalyticsSession.js
│   │   ├── APIKey.js
│   │   ├── APILog.js
│   │   ├── APIToken.js
│   │   ├── Application.js
│   │   ├── AuditLog.js
│   │   ├── Badge.js
│   │   ├── BillingRecord.js
│   │   ├── BotConfiguration.js
│   │   ├── CandidateSource.js
│   │   ├── Challenge.js
│   │   ├── ChatAnalytics.js
│   │   ├── ChatIntent.js
│   │   ├── Comment.js
│   │   ├── CommunityGroup.js
│   │   ├── Company.js
│   │   ├── CompanyUser.js
│   │   ├── ComplianceReport.js
│   │   ├── Content.js
│   │   ├── CurrencyRate.js
│   │   ├── CVData.js
│   │   ├── DataPurchase.js
│   │   ├── DataQualityReport.js
│   │   ├── DataRetentionPolicy.js
│   │   ├── EmailCampaign.js
│   │   ├── EmailLog.js
│   │   ├── Event.js
│   │   ├── FailedAttempt.js
│   │   ├── GamificationProfile.js
│   │   ├── Job.js
│   │   ├── LeaderboardEntry.js
│   │   ├── LeadScore.js
│   │   ├── MarketInsight.js
│   │   ├── Notification.js
│   │   ├── Partner.js
│   │   ├── PartnerProgram.js
│   │   ├── PaymentMethod.js
│   │   ├── PaymentTransaction.js
│   │   ├── PayoutRequest.js
│   │   ├── PayoutTransaction.js
│   │   ├── PricingRule.js
│   │   ├── Referral.js
│   │   ├── Review.js
│   │   ├── SalaryBenchmark.js
│   │   ├── TierBenefits.js
│   │   ├── User.js
│   │   ├── WebhookDelivery.js
│   │   └── WhiteLabelConfig.js
│   │
│   ├── 📁 moderation/               # Content Moderation
│   │   └── contentModerator.js
│   │
│   ├── 📁 nlp/                      # NLP Services
│   │   ├── localNLP.js
│   │   └── openaiNLP.js
│   │
│   ├── 📁 routes/                   # API Routes (50+)
│   │   ├── academy.js
│   │   ├── adminScraping.js
│   │   ├── ai.js
│   │   ├── auth.js
│   │   ├── billing.js
│   │   ├── cache.js
│   │   ├── dataProducts.js
│   │   ├── dataRetention.js
│   │   ├── did.js
│   │   ├── emailMarketing.js
│   │   ├── events.js
│   │   ├── featuredJobs.js
│   │   ├── health.js
│   │   ├── kyc.js
│   │   ├── leaderboards.js
│   │   ├── marketIntelligence.js
│   │   ├── monitoring.js
│   │   ├── outreach.js
│   │   ├── partners.js
│   │   ├── payments.js
│   │   ├── payouts.js
│   │   ├── predictive.js
│   │   ├── referrals.js
│   │   ├── regions.js
│   │   ├── reviews.js
│   │   ├── security.js
│   │   ├── subscriptions.js
│   │   ├── tokens.js
│   │   └── whatsapp.js
│   │
│   ├── 📁 scripts/                  # Utility Scripts
│   │   ├── paymentStats.js
│   │   └── reconcilePayments.js
│   │
│   ├── 📁 seeders/                  # Database Seeders
│   │   ├── academySeeder.js
│   │   ├── index.js
│   │   ├── jobSeeder.js
│   │   ├── marketSeeder.js
│   │   └── userSeeder.js
│   │
│   ├── 📁 services/                 # Business Services (60+)
│   │   ├── academyService.js
│   │   ├── achievementService.js
│   │   ├── affiliateService.js
│   │   ├── alertingService.js
│   │   ├── apiKeyService.js
│   │   ├── apiRateLimitService.js
│   │   ├── apiService.js
│   │   ├── auditService.js
│   │   ├── authSecurityService.js
│   │   ├── badgeService.js
│   │   ├── billingEngine.js
│   │   ├── blockchainService.js
│   │   ├── cacheService.js
│   │   ├── cacheWarmingService.js
│   │   ├── candidateEnrichmentService.js
│   │   ├── challengeEngine.js
│   │   ├── chatbotService.js
│   │   ├── communityService.js
│   │   ├── complianceService.js
│   │   ├── connectionPool.js
│   │   ├── contentService.js
│   │   ├── currencyService.js
│   │   ├── cvExportService.js
│   │   ├── cvScrapingService.js
│   │   ├── dataAPIService.js
│   │   ├── databaseIndexService.js
│   │   ├── dataProductService.js
│   │   ├── dataProtectionService.js
│   │   ├── dataRetentionService.js
│   │   ├── dataValidationService.js
│   │   ├── decentralizedIdentityService.js
│   │   ├── emailMarketingService.js
│   │   ├── encryptionService.js
│   │   ├── enhancedCacheService.js
│   │   ├── enterpriseService.js
│   │   ├── eventService.js
│   │   ├── featuredJobService.js
│   │   ├── featureGateService.js
│   │   ├── gamificationService.js
│   │   ├── immutableReviewService.js
│   │   ├── insightEngine.js
│   │   ├── intentClassifier.js
│   │   ├── jobCacheService.js
│   │   ├── kycService.js
│   │   ├── leaderboardService.js
│   │   ├── leadScoreService.js
│   │   ├── localizationService.js
│   │   ├── marketAnalysisService.js
│   │   ├── marketDataCacheService.js
│   │   ├── marketIntelligenceService.js
│   │   ├── marketplaceService.js
│   │   ├── matchingEngine.js
│   │   ├── mentorshipService.js
│   │   ├── messagingService.js
│   │   ├── monitoringService.js
│   │   ├── nftService.js
│   │   ├── notificationService.js
│   │   ├── outreachAutomationService.js
│   │   ├── paginationService.js
│   │   ├── partnerService.js
│   │   ├── paymentGatewayService.js
│   │   ├── payoutProcessor.js
│   │   ├── payPerHireService.js
│   │   ├── performanceMonitor.js
│   │   ├── predictiveAnalyticsService.js
│   │   ├── pricingEngine.js
│   │   ├── publicProfileService.js
│   │   ├── queryOptimizationService.js
│   │   ├── queryOptimizer.js
│   │   ├── queueManagementService.js
│   │   ├── realtimeAnalyticsService.js
│   │   ├── referralCacheService.js
│   │   ├── referralNetworkService.js
│   │   ├── regionService.js
│   │   ├── reportBuilderService.js
│   │   ├── responseGenerator.js
│   │   ├── resumeOptimizer.js
│   │   ├── revenueCalculator.js
│   │   ├── scrapingAnalyticsService.js
│   │   ├── scrapingJobService.js
│   │   ├── securityMonitoringService.js
│   │   ├── securityService.js
│   │   ├── sequenceEngineService.js
│   │   ├── sessionCacheService.js
│   │   ├── smartContractService.js
│   │   ├── sourceManagementService.js
│   │   ├── subscriptionService.js
│   │   │
│   │   └── 📁 payment/              # Payment Services
│   │       ├── MMQRService.js
│   │       ├── PaymentService.js
│   │       └── 📁 providers/
│   │           ├── AYAPayProvider.js
│   │           ├── BasePaymentProvider.js
│   │           ├── KBZPayProvider.js
│   │           └── WavePayProvider.js
│   │
│   ├── 📁 uploads/                  # Upload storage
│   │
│   ├── 📁 utils/                    # Utility functions
│   │
│   └── 📁 webhooks/                 # Webhook handlers
│
├── 📁 src/                          # Frontend Web (200+ files)
│   ├── App.tsx                      # Main app component
│   ├── main.tsx                     # App entry point
│   ├── index.css                    # Global styles
│   ├── vite-env.d.ts                # Vite types
│   │
│   ├── 📁 components/               # React Components (50+)
│   │   ├── APIConsole.tsx
│   │   ├── BoostJobButton.tsx
│   │   ├── CacheManager.tsx
│   │   ├── CandidateDetailModal.tsx
│   │   ├── CandidateEnrichmentPanel.tsx
│   │   ├── CandidateHireProbability.tsx
│   │   ├── ConfettiEffect.tsx
│   │   ├── ContentPlatform.tsx
│   │   ├── FeaturedJobsCarousel.tsx
│   │   ├── FeatureGate.tsx
│   │   ├── GroupDetail.tsx
│   │   ├── HiringVelocityWidget.tsx
│   │   ├── InviteGenerator.tsx
│   │   ├── KYCDocumentUpload.tsx
│   │   ├── KYCStatusBadge.tsx
│   │   ├── KYCWizard.tsx
│   │   ├── LanguageSwitcher.tsx
│   │   ├── MarketIntelligenceDashboard.tsx
│   │   ├── MarketTrendsView.tsx
│   │   ├── MentorshipPanel.tsx
│   │   ├── MobileNav.tsx
│   │   ├── MonitoringDashboard.tsx
│   │   ├── NetworkDashboard.tsx
│   │   ├── NFTGallery.tsx
│   │   ├── NotificationsPanel.tsx
│   │   ├── OutreachManager.tsx
│   │   ├── PageTransition.tsx
│   │   ├── PayoutHistory.tsx
│   │   ├── PayoutRequestModal.tsx
│   │   ├── PayoutSettings.tsx
│   │   ├── PerformanceMetrics.tsx
│   │   ├── PricingCalculator.tsx
│   │   ├── PrivacyDashboard.tsx
│   │   ├── PublicProfileView.tsx
│   │   ├── ReferrerPerformancePredictor.tsx
│   │   ├── RegionSelector.tsx
│   │   ├── SalaryBenchmarkChart.tsx
│   │   ├── SecuritySettings.tsx
│   │   ├── SegmentBuilder.tsx
│   │   ├── SequenceBuilder.tsx
│   │   ├── TemplateEditor.tsx
│   │   ├── TierProgress.tsx
│   │   ├── UpgradeModal.tsx
│   │   ├── Web3Wallet.tsx
│   │   ├── WhatsAppOptIn.tsx
│   │   ├── WhatsAppSettings.tsx
│   │   ├── WhatsAppShareButton.tsx
│   │   │
│   │   └── 📁 ui/                   # UI Components
│   │       ├── alert.tsx
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── progress.tsx
│   │       ├── select.tsx
│   │       ├── skeleton.tsx
│   │       ├── switch.tsx
│   │       ├── tabs.tsx
│   │       └── textarea.tsx
│   │
│   ├── 📁 contexts/                 # React Contexts
│   │   ├── AuthContext.test.tsx
│   │   └── AuthContext.tsx
│   │
│   ├── 📁 hooks/                    # Custom Hooks
│   │   ├── index.ts
│   │   ├── useCampaigns.ts
│   │   ├── useInvite.ts
│   │   ├── useLeadScore.ts
│   │   ├── useNetwork.ts
│   │   ├── useTier.ts
│   │   ├── useToast.ts
│   │   ├── useWeb3.ts
│   │   └── useWhatsApp.ts
│   │
│   ├── 📁 i18n/                     # Internationalization
│   │   ├── i18n.ts
│   │   ├── index.ts
│   │   └── 📁 locales/
│   │       ├── en.json
│   │       ├── my.json
│   │       ├── th.json
│   │       └── vi.json
│   │
│   ├── 📁 lib/                      # Utilities
│   │   ├── api.test.ts
│   │   ├── api.ts
│   │   └── 📁 api/
│   │       └── adminScraping.ts
│   │
│   ├── 📁 pages/                    # Page Components
│   │   ├── ApiDocumentation.tsx
│   │   └── DeveloperPortal.tsx
│   │
│   ├── 📁 sections/                 # Section Components (40+)
│   │   ├── AcademyDashboard.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── AnalyticsAdminDashboard.tsx
│   │   ├── AnalyticsDashboard.tsx
│   │   ├── APIDocumentation.tsx
│   │   ├── APIKeyManager.tsx
│   │   ├── BillingDashboard.tsx
│   │   ├── CommunityFeed.tsx
│   │   ├── CorporateDashboard.tsx
│   │   ├── CurrencyManager.tsx
│   │   ├── Dashboard.tsx
│   │   ├── DatabaseOptimizer.tsx
│   │   ├── DataMarketplace.tsx
│   │   ├── DepositForm.tsx
│   │   ├── EmailCampaignManager.tsx
│   │   ├── EnterprisePortal.tsx
│   │   ├── EventManager.tsx
│   │   ├── FeaturedJobManager.tsx
│   │   ├── GamificationDashboard.tsx
│   │   ├── HeroSection.tsx
│   │   ├── InsightsDashboard.tsx
│   │   ├── JobDetail.tsx
│   │   ├── JobsSection.tsx
│   │   ├── KYCReviewDashboard.tsx
│   │   ├── LandingPage.tsx
│   │   ├── LeadScoreDashboard.tsx
│   │   ├── LocalizationManager.tsx
│   │   ├── Login.tsx
│   │   ├── MarketInsights.tsx
│   │   ├── Marketplace.tsx
│   │   ├── MessagingSettings.tsx
│   │   ├── Navigation.tsx
│   │   ├── PartnerPortal.tsx
│   │   ├── PaymentDashboard.tsx
│   │   ├── PaymentMethods.tsx
│   │   ├── PayoutDashboard.tsx
│   │   ├── PayoutQueueDashboard.tsx
│   │   ├── PerformanceAdminDashboard.tsx
│   │   ├── PostJob.tsx
│   │   ├── ReferralCard.tsx
│   │   ├── ReferralDashboard.tsx
│   │   ├── ReferralTracking.tsx
│   │   ├── RegionConfiguration.tsx
│   │   ├── Register.tsx
│   │   ├── ResumeOptimizer.tsx
│   │   ├── RevenueDashboard.tsx
│   │   ├── ScalingConfiguration.tsx
│   │   ├── ScrapingAdminLayout.tsx
│   │   ├── ScrapingDashboard.tsx
│   │   ├── SDKDownloads.tsx
│   │   ├── SecurityDashboard.tsx
│   │   ├── SubscriptionManager.tsx
│   │   ├── SubscriptionPlans.tsx
│   │   ├── TalentPoolDashboard.tsx
│   │   ├── TransactionHistory.tsx
│   │   ├── WebhookManager.tsx
│   │   └── WithdrawalForm.tsx
│   │
│   ├── 📁 services/                 # API Services
│   │   ├── gamificationApi.ts
│   │   ├── securityApi.ts
│   │   └── 📁 api/
│   │       ├── academyApi.ts
│   │       ├── marketApi.ts
│   │       ├── messagingApi.ts
│   │       └── paymentApi.ts
│   │
│   └── 📁 test/                     # Test Utilities
│       ├── setup.ts
│       ├── 📁 mocks/
│       │   ├── handlers.ts
│       │   └── server.ts
│       └── 📁 utils/
│           └── test-utils.tsx
│
├── 📁 mobile/                       # Mobile App (60+ files)
│   ├── .gitignore
│   ├── App.tsx
│   ├── app.json
│   ├── index.ts
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   │
│   ├── 📁 assets/                   # App Assets
│   │   ├── adaptive-icon.png
│   │   ├── favicon.png
│   │   ├── icon.png
│   │   └── splash-icon.png
│   │
│   └── 📁 src/
│       ├── 📁 components/           # Mobile Components
│       │   ├── FilterModal.tsx
│       │   ├── JobCard.tsx
│       │   ├── NotificationItem.tsx
│       │   ├── PayoutCard.tsx
│       │   ├── ReferralCard.tsx
│       │   └── SearchBar.tsx
│       │
│       ├── 📁 constants/            # App Constants
│       │   └── colors.ts
│       │
│       ├── 📁 locales/              # Translations
│       │   ├── en.json
│       │   └── my.json
│       │
│       ├── 📁 navigation/           # Navigation
│       │   ├── AppNavigator.tsx
│       │   ├── AuthNavigator.tsx
│       │   ├── JobsStackNavigator.tsx
│       │   ├── MainTabNavigator.tsx
│       │   └── ReferralsStackNavigator.tsx
│       │
│       ├── 📁 screens/              # Mobile Screens (22)
│       │   ├── AcademyScreen.tsx
│       │   ├── CourseDetailScreen.tsx
│       │   ├── CoursePlayerScreen.tsx
│       │   ├── CreateReferralScreen.tsx
│       │   ├── ForgotPasswordScreen.tsx
│       │   ├── JobDetailScreen.tsx
│       │   ├── JobsScreen.tsx
│       │   ├── KYCScreen.tsx
│       │   ├── LoadingScreen.tsx
│       │   ├── LoginScreen.tsx
│       │   ├── MarketInsightsScreen.tsx
│       │   ├── MessagingSettingsScreen.tsx
│       │   ├── NotificationsScreen.tsx
│       │   ├── PaymentMethodsScreen.tsx
│       │   ├── PayoutDetailScreen.tsx
│       │   ├── PayoutsScreen.tsx
│       │   ├── ProfileScreen.tsx
│       │   ├── ReferralDetailScreen.tsx
│       │   ├── ReferralsScreen.tsx
│       │   ├── RegisterScreen.tsx
│       │   ├── SalaryInsightsScreen.tsx
│       │   └── WithdrawalRequestScreen.tsx
│       │
│       ├── 📁 services/             # Mobile Services (15)
│       │   ├── academyService.ts
│       │   ├── api.ts
│       │   ├── authService.ts
│       │   ├── communityService.ts
│       │   ├── gamificationService.ts
│       │   ├── jobService.ts
│       │   ├── kycService.ts
│       │   ├── marketDataService.ts
│       │   ├── messagingService.ts
│       │   ├── notificationService.ts
│       │   ├── offlineService.ts
│       │   ├── paymentService.ts
│       │   ├── payoutService.ts
│       │   ├── referralService.ts
│       │   └── talentPoolService.ts
│       │
│       ├── 📁 store/                # State Management
│       │   ├── authStore.ts
│       │   ├── jobStore.ts
│       │   ├── notificationStore.ts
│       │   └── referralStore.ts
│       │
│       ├── 📁 types/                # TypeScript Types
│       │   └── index.ts
│       │
│       └── 📁 utils/                # Utilities
│
├── 📁 e2e/                          # E2E Tests
│   ├── auth.spec.ts
│   ├── global-setup.ts
│   ├── global-teardown.ts
│   ├── referral-flow.spec.ts
│   └── 📁 utils/
│       └── test-data.ts
│
├── 📁 docker/                       # Docker Config
│   ├── .dockerignore
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── nginx.conf
│
├── 📁 k8s/                          # Kubernetes Configs
│   ├── app-deployment.yaml
│   ├── configmap.yaml
│   ├── hpa.yaml
│   ├── ingress.yaml
│   ├── mongodb-deployment.yaml
│   ├── monitoring.yaml
│   ├── namespace.yaml
│   ├── redis-deployment.yaml
│   ├── secret.yaml
│   └── service.yaml
│
├── 📁 monitoring/                   # Monitoring Config
│   ├── alert-rules.yml
│   ├── docker-compose.monitoring.yml
│   └── prometheus.yml
│
├── 📁 nginx/                        # Nginx Config
│   └── trm-production.conf
│
├── 📁 plans/                        # Project Plans
│   └── referral-platform-specification.md
│
├── 📁 public/                       # Static Assets
│   ├── manifest.json
│   ├── trm-logo.png
│   └── trm-logo.svg
│
├── 📁 scripts/                      # Deployment Scripts
│   ├── deploy-verify.sh
│   ├── rollback.sh
│   └── setup-server.sh
│
└── 📁 sdk/                          # SDKs
    ├── 📁 javascript/
    │   ├── package.json
    │   ├── README.md
    │   └── trm.js
    │
    ├── 📁 php/
    │   ├── composer.json
    │   └── 📁 src/
    │       └── TRMClient.php
    │
    └── 📁 python/
        ├── setup.py
        └── 📁 trm_sdk/
            ├── __init__.py
            ├── client.py
            └── webhooks.py
```

---

## 📈 Detailed Statistics

### Backend Statistics

| Category | Count |
|----------|-------|
| Models | 70+ |
| Routes | 50+ |
| Services | 60+ |
| Middleware | 15+ |
| Cron Jobs | 8 |
| Config Files | 9 |
| Scripts | 10+ |

### Frontend Statistics

| Category | Count |
|----------|-------|
| Components | 50+ |
| Sections | 40+ |
| Hooks | 10+ |
| Contexts | 2 |
| API Clients | 5+ |
| Pages | 2 |

### Mobile Statistics

| Category | Count |
|----------|-------|
| Screens | 22 |
| Components | 6 |
| Services | 15 |
| Navigators | 5 |
| Stores | 4 |

### Documentation Statistics

| Category | Count |
|----------|-------|
| Technical Docs | 9 |
| Deployment Docs | 4 |
| User Guides | 3 |
| API Docs | 3 |
| Security Docs | 1 |
| Testing Docs | 1 |
| Integration Docs | 3 |
| Project Completion | 8 |

---

## 🔍 Key Files Reference

### Entry Points

| File | Purpose |
|------|---------|
| [`server/server.js`](server/server.js) | Backend entry point |
| [`src/main.tsx`](src/main.tsx) | Frontend entry point |
| [`mobile/index.ts`](mobile/index.ts) | Mobile entry point |

### Configuration

| File | Purpose |
|------|---------|
| [`package.json`](package.json) | NPM configuration |
| [`tsconfig.json`](tsconfig.json) | TypeScript configuration |
| [`vite.config.ts`](vite.config.ts) | Vite build configuration |
| [`jest.config.js`](jest.config.js) | Jest test configuration |
| [`tailwind.config.js`](tailwind.config.js) | Tailwind CSS configuration |

### Core Models

| File | Purpose |
|------|---------|
| [`server/models/User.js`](server/models/User.js) | User model |
| [`server/models/Company.js`](server/models/Company.js) | Company model |
| [`server/models/Job.js`](server/models/Job.js) | Job model |
| [`server/models/Referral.js`](server/models/Referral.js) | Referral model |
| [`server/models/PaymentTransaction.js`](server/models/PaymentTransaction.js) | Payment model |

### Core Services

| File | Purpose |
|------|---------|
| [`server/services/payment/PaymentService.js`](server/services/payment/PaymentService.js) | Payment processing |
| [`server/services/messagingService.js`](server/services/messagingService.js) | Messaging |
| [`server/services/referralNetworkService.js`](server/services/referralNetworkService.js) | Referral network |
| [`server/services/authSecurityService.js`](server/services/authSecurityService.js) | Authentication |

---

## 📋 File Checksum Verification

For integrity verification, the following files should be present:

### Critical Files Checklist

- [ ] `server/server.js`
- [ ] `src/App.tsx`
- [ ] `src/main.tsx`
- [ ] `mobile/App.tsx`
- [ ] `package.json`
- [ ] `README.md`
- [ ] `.env.example`
- [ ] `docker/Dockerfile`
- [ ] `k8s/app-deployment.yaml`
- [ ] `docs/IMPLEMENTATION_GUIDE.md`

---

## 📝 Inventory Maintenance

This inventory should be updated:
- After each major feature addition
- When file structure changes
- Before each release
- When new documentation is added

**Last Updated:** February 6, 2026  
**Next Review:** March 6, 2026

---

*This file inventory represents the complete codebase of the TRM Referral Platform as of February 6, 2026.*
