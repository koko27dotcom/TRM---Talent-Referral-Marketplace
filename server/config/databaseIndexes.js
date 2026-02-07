/**
 * Database Index Definitions
 * Comprehensive index configuration for all MongoDB collections
 * Optimized for TRM Referral Platform query patterns
 */

/**
 * Index definitions for User collection
 */
const UserIndexes = [
  // Primary lookup indexes
  { fields: { email: 1 }, options: { unique: true, name: 'email_unique' } },
  { fields: { phone: 1 }, options: { sparse: true, name: 'phone_sparse' } },
  
  // Role-based queries
  { fields: { role: 1 }, options: { name: 'role' } },
  { fields: { role: 1, status: 1 }, options: { name: 'role_status' } },
  
  // Referrer profile indexes
  { fields: { 'referrerProfile.referralCode': 1 }, options: { unique: true, sparse: true, name: 'referral_code_unique' } },
  { fields: { 'referrerProfile.kycStatus': 1 }, options: { name: 'kyc_status' } },
  { fields: { 'referrerProfile.totalEarnings': -1 }, options: { name: 'referrer_earnings' } },
  { fields: { 'referrerProfile.totalReferrals': -1 }, options: { name: 'referrer_referrals' } },
  
  // Sorting and filtering
  { fields: { createdAt: -1 }, options: { name: 'created_at_desc' } },
  { fields: { updatedAt: -1 }, options: { name: 'updated_at_desc' } },
  { fields: { lastLoginAt: -1 }, options: { name: 'last_login_desc' } },
  
  // Compound indexes for common queries
  { fields: { role: 1, createdAt: -1 }, options: { name: 'role_created_at' } },
  { fields: { role: 1, status: 1, createdAt: -1 }, options: { name: 'role_status_created_at' } },
  { fields: { 'referrerProfile.kycStatus': 1, createdAt: -1 }, options: { name: 'kyc_status_created_at' } },
  
  // Text search
  { fields: { firstName: 'text', lastName: 'text', email: 'text' }, options: { name: 'user_text_search' } },
];

/**
 * Index definitions for Job collection
 */
const JobIndexes = [
  // Relationship indexes
  { fields: { companyId: 1 }, options: { name: 'company_id' } },
  { fields: { companyId: 1, status: 1 }, options: { name: 'company_status' } },
  { fields: { companyId: 1, status: 1, createdAt: -1 }, options: { name: 'company_status_created_at' } },
  
  // Status and visibility
  { fields: { status: 1 }, options: { name: 'status' } },
  { fields: { status: 1, createdAt: -1 }, options: { name: 'status_created_at' } },
  { fields: { status: 1, featured: 1, createdAt: -1 }, options: { name: 'status_featured_created_at' } },
  
  // Location-based queries
  { fields: { 'location.city': 1 }, options: { name: 'location_city' } },
  { fields: { 'location.country': 1 }, options: { name: 'location_country' } },
  { fields: { 'location.type': 1 }, options: { name: 'location_type' } },
  { fields: { 'location.city': 1, status: 1 }, options: { name: 'location_city_status' } },
  
  // Category and type
  { fields: { category: 1 }, options: { name: 'category' } },
  { fields: { category: 1, status: 1 }, options: { name: 'category_status' } },
  { fields: { jobType: 1 }, options: { name: 'job_type' } },
  { fields: { experienceLevel: 1 }, options: { name: 'experience_level' } },
  
  // Salary range queries
  { fields: { 'salary.min': 1, 'salary.max': 1 }, options: { name: 'salary_range' } },
  { fields: { 'salary.currency': 1 }, options: { name: 'salary_currency' } },
  
  // Featured and promoted jobs
  { fields: { featured: 1, featuredUntil: 1 }, options: { name: 'featured_until' } },
  { fields: { featured: 1, createdAt: -1 }, options: { name: 'featured_created_at' } },
  
  // Skills and tags
  { fields: { skills: 1 }, options: { name: 'skills' } },
  { fields: { tags: 1 }, options: { name: 'tags' } },
  
  // Date-based queries
  { fields: { createdAt: -1 }, options: { name: 'created_at_desc' } },
  { fields: { updatedAt: -1 }, options: { name: 'updated_at_desc' } },
  { fields: { expiresAt: 1 }, options: { name: 'expires_at' } },
  
  // Compound indexes for job search
  { fields: { status: 1, 'location.city': 1, category: 1, createdAt: -1 }, options: { name: 'search_compound' } },
  { fields: { status: 1, category: 1, 'salary.min': 1 }, options: { name: 'category_salary' } },
  
  // Text search
  { fields: { title: 'text', description: 'text', requirements: 'text' }, options: { name: 'job_text_search', weights: { title: 10, description: 5, requirements: 3 } } },
  
  // TTL index for expired jobs
  { fields: { expiresAt: 1 }, options: { expireAfterSeconds: 0, name: 'ttl_expires_at' } },
];

/**
 * Index definitions for Referral collection
 */
const ReferralIndexes = [
  // Primary relationship indexes
  { fields: { referrerId: 1 }, options: { name: 'referrer_id' } },
  { fields: { jobId: 1 }, options: { name: 'job_id' } },
  { fields: { companyId: 1 }, options: { name: 'company_id' } },
  { fields: { candidateId: 1 }, options: { sparse: true, name: 'candidate_id' } },
  
  // Status-based queries
  { fields: { status: 1 }, options: { name: 'status' } },
  { fields: { status: 1, createdAt: -1 }, options: { name: 'status_created_at' } },
  
  // Compound indexes for common queries
  { fields: { referrerId: 1, status: 1 }, options: { name: 'referrer_status' } },
  { fields: { referrerId: 1, status: 1, createdAt: -1 }, options: { name: 'referrer_status_created_at' } },
  { fields: { jobId: 1, status: 1 }, options: { name: 'job_status' } },
  { fields: { companyId: 1, status: 1 }, options: { name: 'company_status' } },
  { fields: { companyId: 1, status: 1, createdAt: -1 }, options: { name: 'company_status_created_at' } },
  
  // Referral code lookup
  { fields: { referralCode: 1 }, options: { unique: true, sparse: true, name: 'referral_code_unique' } },
  
  // Email lookup for deduplication
  { fields: { 'referredPerson.email': 1 }, options: { name: 'referred_email' } },
  { fields: { 'referredPerson.phone': 1 }, options: { sparse: true, name: 'referred_phone' } },
  
  // Payout tracking
  { fields: { referrerId: 1, payoutStatus: 1 }, options: { name: 'referrer_payout_status' } },
  { fields: { payoutStatus: 1, createdAt: -1 }, options: { name: 'payout_status_created_at' } },
  
  // Date-based queries
  { fields: { createdAt: -1 }, options: { name: 'created_at_desc' } },
  { fields: { updatedAt: -1 }, options: { name: 'updated_at_desc' } },
  { fields: { hiredAt: -1 }, options: { sparse: true, name: 'hired_at_desc' } },
  
  // Source tracking
  { fields: { 'source.channel': 1 }, options: { name: 'source_channel' } },
  { fields: { 'source.utmSource': 1 }, options: { sparse: true, name: 'utm_source' } },
];

/**
 * Index definitions for Application collection
 */
const ApplicationIndexes = [
  // Relationship indexes
  { fields: { jobId: 1 }, options: { name: 'job_id' } },
  { fields: { applicantId: 1 }, options: { name: 'applicant_id' } },
  { fields: { companyId: 1 }, options: { name: 'company_id' } },
  
  // Status and workflow
  { fields: { status: 1 }, options: { name: 'status' } },
  { fields: { status: 1, createdAt: -1 }, options: { name: 'status_created_at' } },
  
  // Compound indexes
  { fields: { jobId: 1, applicantId: 1 }, options: { unique: true, name: 'job_applicant_unique' } },
  { fields: { applicantId: 1, status: 1 }, options: { name: 'applicant_status' } },
  { fields: { companyId: 1, status: 1, createdAt: -1 }, options: { name: 'company_status_created_at' } },
  
  // Date-based queries
  { fields: { createdAt: -1 }, options: { name: 'created_at_desc' } },
  { fields: { updatedAt: -1 }, options: { name: 'updated_at_desc' } },
  
  // Email lookup
  { fields: { email: 1 }, options: { name: 'email' } },
];

/**
 * Index definitions for CVData collection
 */
const CVDataIndexes = [
  // Contact info indexes
  { fields: { 'contactInfo.email': 1 }, options: { sparse: true, name: 'contact_email' } },
  { fields: { 'contactInfo.phone': 1 }, options: { sparse: true, name: 'contact_phone' } },
  { fields: { userId: 1 }, options: { sparse: true, name: 'user_id' } },
  
  // Skills and experience
  { fields: { skills: 1 }, options: { name: 'skills' } },
  { fields: { 'workExperience.company': 1 }, options: { name: 'work_company' } },
  { fields: { 'workExperience.title': 1 }, options: { name: 'work_title' } },
  { fields: { 'education.institution': 1 }, options: { name: 'education_institution' } },
  { fields: { 'education.degree': 1 }, options: { name: 'education_degree' } },
  
  // Location
  { fields: { 'contactInfo.address.city': 1 }, options: { name: 'address_city' } },
  { fields: { 'contactInfo.address.country': 1 }, options: { name: 'address_country' } },
  
  // Date-based
  { fields: { createdAt: -1 }, options: { name: 'created_at_desc' } },
  { fields: { parsedAt: -1 }, options: { name: 'parsed_at_desc' } },
  { fields: { lastAnalyzedAt: -1 }, options: { sparse: true, name: 'last_analyzed_at' } },
  
  // Compound indexes
  { fields: { 'contactInfo.email': 1, 'contactInfo.phone': 1 }, options: { name: 'contact_email_phone' } },
  { fields: { skills: 1, 'workExperience.years': -1 }, options: { name: 'skills_experience' } },
  
  // Text search
  { fields: { skills: 'text', 'workExperience.description': 'text', 'summary': 'text' }, options: { name: 'cv_text_search', weights: { skills: 10, summary: 5, 'workExperience.description': 3 } } },
  
  // Deduplication
  { fields: { 'metadata.hash': 1 }, options: { sparse: true, name: 'metadata_hash' } },
  { fields: { 'metadata.source': 1, createdAt: -1 }, options: { name: 'source_created_at' } },
];

/**
 * Index definitions for Company collection
 */
const CompanyIndexes = [
  // Primary lookups
  { fields: { slug: 1 }, options: { unique: true, name: 'slug_unique' } },
  { fields: { email: 1 }, options: { sparse: true, name: 'email' } },
  
  // Status and visibility
  { fields: { status: 1 }, options: { name: 'status' } },
  { fields: { status: 1, createdAt: -1 }, options: { name: 'status_created_at' } },
  { fields: { featured: 1, createdAt: -1 }, options: { name: 'featured_created_at' } },
  
  // Industry and location
  { fields: { industry: 1 }, options: { name: 'industry' } },
  { fields: { industry: 1, status: 1 }, options: { name: 'industry_status' } },
  { fields: { 'location.city': 1 }, options: { name: 'location_city' } },
  { fields: { 'location.country': 1 }, options: { name: 'location_country' } },
  
  // Size and type
  { fields: { size: 1 }, options: { name: 'size' } },
  { fields: { type: 1 }, options: { name: 'type' } },
  
  // Date-based
  { fields: { createdAt: -1 }, options: { name: 'created_at_desc' } },
  { fields: { updatedAt: -1 }, options: { name: 'updated_at_desc' } },
  
  // Text search
  { fields: { name: 'text', description: 'text', 'location.city': 'text' }, options: { name: 'company_text_search', weights: { name: 10, description: 5, 'location.city': 2 } } },
];

/**
 * Index definitions for PaymentTransaction collection
 */
const PaymentTransactionIndexes = [
  // User and relationship indexes
  { fields: { userId: 1 }, options: { name: 'user_id' } },
  { fields: { userId: 1, status: 1, createdAt: -1 }, options: { name: 'user_status_created_at' } },
  { fields: { userId: 1, type: 1, createdAt: -1 }, options: { name: 'user_type_created_at' } },
  
  // Status and type
  { fields: { status: 1 }, options: { name: 'status' } },
  { fields: { type: 1 }, options: { name: 'type' } },
  { fields: { status: 1, type: 1 }, options: { name: 'status_type' } },
  { fields: { status: 1, createdAt: -1 }, options: { name: 'status_created_at' } },
  
  // Provider tracking
  { fields: { provider: 1 }, options: { name: 'provider' } },
  { fields: { provider: 1, status: 1 }, options: { name: 'provider_status' } },
  { fields: { provider: 1, externalId: 1 }, options: { sparse: true, name: 'provider_external_id' } },
  
  // Reference numbers
  { fields: { reference: 1 }, options: { unique: true, sparse: true, name: 'reference_unique' } },
  { fields: { externalReference: 1 }, options: { sparse: true, name: 'external_reference' } },
  
  // Referral and job tracking
  { fields: { referralId: 1 }, options: { sparse: true, name: 'referral_id' } },
  { fields: { jobId: 1 }, options: { sparse: true, name: 'job_id' } },
  
  // Date-based queries
  { fields: { createdAt: -1 }, options: { name: 'created_at_desc' } },
  { fields: { completedAt: -1 }, options: { sparse: true, name: 'completed_at_desc' } },
  { fields: { createdAt: 1 }, options: { name: 'created_at_asc' } },
  
  // Amount queries
  { fields: { amount: 1 }, options: { name: 'amount' } },
  { fields: { currency: 1 }, options: { name: 'currency' } },
];

/**
 * Index definitions for ChatMessage collection
 */
const ChatMessageIndexes = [
  // Session and user indexes
  { fields: { sessionId: 1 }, options: { name: 'session_id' } },
  { fields: { sessionId: 1, createdAt: -1 }, options: { name: 'session_created_at' } },
  { fields: { userId: 1 }, options: { sparse: true, name: 'user_id' } },
  { fields: { userId: 1, createdAt: -1 }, options: { name: 'user_created_at' } },
  
  // Message type and status
  { fields: { type: 1 }, options: { name: 'type' } },
  { fields: { sender: 1 }, options: { name: 'sender' } },
  { fields: { 'intent.name': 1 }, options: { sparse: true, name: 'intent_name' } },
  
  // Date-based
  { fields: { createdAt: -1 }, options: { name: 'created_at_desc' } },
  
  // TTL for old messages (optional, based on retention policy)
  // { fields: { createdAt: 1 }, options: { expireAfterSeconds: 7776000, name: 'ttl_90_days' } },
];

/**
 * Index definitions for Notification collection
 */
const NotificationIndexes = [
  // User indexes
  { fields: { userId: 1 }, options: { name: 'user_id' } },
  { fields: { userId: 1, read: 1, createdAt: -1 }, options: { name: 'user_read_created_at' } },
  { fields: { userId: 1, createdAt: -1 }, options: { name: 'user_created_at' } },
  
  // Status and type
  { fields: { read: 1 }, options: { name: 'read' } },
  { fields: { type: 1 }, options: { name: 'type' } },
  { fields: { priority: 1 }, options: { name: 'priority' } },
  
  // Related entity
  { fields: { 'relatedEntity.type': 1, 'relatedEntity.id': 1 }, options: { name: 'related_entity' } },
  
  // Date-based
  { fields: { createdAt: -1 }, options: { name: 'created_at_desc' } },
  
  // TTL for old notifications
  { fields: { expiresAt: 1 }, options: { expireAfterSeconds: 0, name: 'ttl_expires_at' } },
];

/**
 * Index definitions for AuditLog collection
 */
const AuditLogIndexes = [
  // User and action indexes
  { fields: { userId: 1 }, options: { name: 'user_id' } },
  { fields: { userId: 1, createdAt: -1 }, options: { name: 'user_created_at' } },
  { fields: { action: 1 }, options: { name: 'action' } },
  { fields: { action: 1, createdAt: -1 }, options: { name: 'action_created_at' } },
  
  // Entity tracking
  { fields: { entityType: 1 }, options: { name: 'entity_type' } },
  { fields: { entityType: 1, entityId: 1 }, options: { name: 'entity_type_id' } },
  { fields: { entityType: 1, action: 1, createdAt: -1 }, options: { name: 'entity_action_created_at' } },
  
  // IP and session
  { fields: { ipAddress: 1 }, options: { name: 'ip_address' } },
  { fields: { sessionId: 1 }, options: { sparse: true, name: 'session_id' } },
  
  // Date-based
  { fields: { createdAt: -1 }, options: { name: 'created_at_desc' } },
  { fields: { createdAt: 1 }, options: { name: 'created_at_ttl' } }, // For TTL
  
  // TTL for audit logs (30 days)
  { fields: { createdAt: 1 }, options: { expireAfterSeconds: 2592000, name: 'ttl_30_days' } },
];

/**
 * Index definitions for Session/Token collections
 */
const SessionIndexes = [
  // Token lookups
  { fields: { token: 1 }, options: { unique: true, name: 'token_unique' } },
  { fields: { refreshToken: 1 }, options: { unique: true, sparse: true, name: 'refresh_token_unique' } },
  
  // User sessions
  { fields: { userId: 1 }, options: { name: 'user_id' } },
  { fields: { userId: 1, createdAt: -1 }, options: { name: 'user_created_at' } },
  
  // Status and type
  { fields: { status: 1 }, options: { name: 'status' } },
  { fields: { type: 1 }, options: { name: 'type' } },
  
  // Device tracking
  { fields: { 'device.id': 1 }, options: { sparse: true, name: 'device_id' } },
  
  // Date-based
  { fields: { createdAt: -1 }, options: { name: 'created_at_desc' } },
  { fields: { lastActivityAt: -1 }, options: { name: 'last_activity_desc' } },
  
  // TTL for expired sessions
  { fields: { expiresAt: 1 }, options: { expireAfterSeconds: 0, name: 'ttl_expires_at' } },
];

/**
 * Export all index definitions
 */
module.exports = {
  UserIndexes,
  JobIndexes,
  ReferralIndexes,
  ApplicationIndexes,
  CVDataIndexes,
  CompanyIndexes,
  PaymentTransactionIndexes,
  ChatMessageIndexes,
  NotificationIndexes,
  AuditLogIndexes,
  SessionIndexes,
  
  // Helper to get all indexes for a model
  getIndexesForModel(modelName) {
    const indexMap = {
      User: UserIndexes,
      Job: JobIndexes,
      Referral: ReferralIndexes,
      Application: ApplicationIndexes,
      CVData: CVDataIndexes,
      Company: CompanyIndexes,
      PaymentTransaction: PaymentTransactionIndexes,
      ChatMessage: ChatMessageIndexes,
      Notification: NotificationIndexes,
      AuditLog: AuditLogIndexes,
      Session: SessionIndexes,
    };
    
    return indexMap[modelName] || [];
  },
  
  // Get all index definitions
  getAllIndexes() {
    return {
      User: UserIndexes,
      Job: JobIndexes,
      Referral: ReferralIndexes,
      Application: ApplicationIndexes,
      CVData: CVDataIndexes,
      Company: CompanyIndexes,
      PaymentTransaction: PaymentTransactionIndexes,
      ChatMessage: ChatMessageIndexes,
      Notification: NotificationIndexes,
      AuditLog: AuditLogIndexes,
      Session: SessionIndexes,
    };
  },
};