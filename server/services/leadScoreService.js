/**
 * LeadScoreService
 * Core business logic for lead scoring algorithms
 * Calculates scores for candidates and companies
 * Handles real-time and background score calculations
 */

const { LeadScore, ReferrerQuality, Company, User, Job, Referral } = require('../models/index.js');

/**
 * Service class for managing lead scoring operations
 */
class LeadScoreService {
  constructor() {
    // Score cache (in-memory, 1 hour TTL)
    this.scoreCache = new Map();
    this.cacheTTL = 60 * 60 * 1000; // 1 hour
    
    // Alert thresholds
    this.HOT_LEAD_THRESHOLD = 80;
    this.WARM_LEAD_THRESHOLD = 50;
    
    // Background job queue (using setTimeout for now, Redis later)
    this.jobQueue = [];
    this.isProcessing = false;
  }

  // ==================== CANDIDATE SCORING ====================

  /**
   * Calculate candidate lead score (0-100)
   * @param {string} candidateId - Candidate user ID
   * @returns {Promise<Object>} Score breakdown and total
   */
  async calculateCandidateScore(candidateId) {
    try {
      // Fetch candidate data
      const candidate = await User.findById(candidateId);
      if (!candidate || candidate.role !== 'job_seeker') {
        throw new Error('Candidate not found');
      }

      const factors = {
        profileCompleteness: 0,
        experienceMatch: 0,
        skillsMatch: 0,
        referrerQuality: 0,
        pastSuccessRate: 0,
      };

      // 1. Profile Completeness (20 points)
      factors.profileCompleteness = this._calculateProfileCompleteness(candidate);

      // 2. Experience Match (25 points)
      factors.experienceMatch = this._calculateExperienceMatch(candidate);

      // 3. Skills Match (25 points)
      factors.skillsMatch = this._calculateSkillsMatch(candidate);

      // 4. Referrer Quality (15 points)
      factors.referrerQuality = await this._calculateReferrerQualityForCandidate(candidateId);

      // 5. Past Success Rate (15 points)
      factors.pastSuccessRate = await this._calculatePastSuccessRate(candidateId);

      // Calculate total score
      const totalScore = Object.values(factors).reduce((sum, val) => sum + val, 0);

      return {
        totalScore: Math.min(100, Math.round(totalScore)),
        factors,
        conversionProbability: this._predictConversionProbability(factors, 'candidate'),
      };
    } catch (error) {
      console.error('Error calculating candidate score:', error);
      throw error;
    }
  }

  /**
   * Calculate profile completeness score (0-20)
   * @private
   */
  _calculateProfileCompleteness(candidate) {
    const profile = candidate.jobseekerProfile || {};
    let score = 0;

    // Basic info (5 points)
    if (candidate.name) score += 2;
    if (candidate.email) score += 2;
    if (candidate.phone) score += 1;

    // Profile details (10 points)
    if (profile.resume) score += 3;
    if (profile.skills?.length > 0) score += 3;
    if (profile.experience) score += 2;
    if (profile.education) score += 2;

    // Additional info (5 points)
    if (profile.portfolioUrl) score += 2;
    if (profile.linkedInUrl) score += 2;
    if (candidate.avatar) score += 1;

    return Math.min(20, score);
  }

  /**
   * Calculate experience match score (0-25)
   * @private
   */
  _calculateExperienceMatch(candidate) {
    const profile = candidate.jobseekerProfile || {};
    let score = 0;

    // Years of experience (15 points)
    const experienceText = profile.experience || '';
    const yearsMatch = experienceText.match(/(\d+)\+?\s*years?/i);
    if (yearsMatch) {
      const years = parseInt(yearsMatch[1]);
      if (years >= 5) score += 15;
      else if (years >= 3) score += 12;
      else if (years >= 1) score += 8;
      else score += 5;
    } else if (experienceText.length > 50) {
      score += 5; // Some experience mentioned
    }

    // Experience quality (10 points)
    if (experienceText.length > 200) score += 5;
    if (experienceText.includes('senior') || experienceText.includes('lead')) score += 3;
    if (experienceText.includes('manager')) score += 2;

    return Math.min(25, score);
  }

  /**
   * Calculate skills match score (0-25)
   * @private
   */
  _calculateSkillsMatch(candidate) {
    const skills = candidate.jobseekerProfile?.skills || [];
    let score = 0;

    // Number of skills (15 points)
    if (skills.length >= 10) score += 15;
    else if (skills.length >= 5) score += 10;
    else if (skills.length >= 3) score += 5;
    else if (skills.length > 0) score += 2;

    // Skill diversity (10 points) - check for different categories
    const skillCategories = this._categorizeSkills(skills);
    if (skillCategories.length >= 4) score += 10;
    else if (skillCategories.length >= 3) score += 7;
    else if (skillCategories.length >= 2) score += 4;
    else if (skillCategories.length >= 1) score += 2;

    return Math.min(25, score);
  }

  /**
   * Categorize skills into groups
   * @private
   */
  _categorizeSkills(skills) {
    const categories = new Set();
    const skillLower = skills.map(s => s.toLowerCase());

    // Programming languages
    if (skillLower.some(s => ['javascript', 'python', 'java', 'c++', 'c#', 'go', 'rust'].includes(s))) {
      categories.add('programming');
    }
    // Web technologies
    if (skillLower.some(s => ['react', 'vue', 'angular', 'html', 'css', 'node'].includes(s))) {
      categories.add('web');
    }
    // Data/AI
    if (skillLower.some(s => ['sql', 'machine learning', 'data analysis', 'python', 'tensorflow'].includes(s))) {
      categories.add('data');
    }
    // Management
    if (skillLower.some(s => ['management', 'leadership', 'agile', 'scrum'].includes(s))) {
      categories.add('management');
    }
    // Design
    if (skillLower.some(s => ['ui', 'ux', 'figma', 'design', 'photoshop'].includes(s))) {
      categories.add('design');
    }

    return Array.from(categories);
  }

  /**
   * Calculate referrer quality for candidate (0-15)
   * @private
   */
  async _calculateReferrerQualityForCandidate(candidateId) {
    try {
      // Check if candidate was referred by high-quality referrer
      const referrals = await Referral.find({ 'referredPerson.email': candidate.email });
      if (referrals.length === 0) return 5; // Base score for organic candidates

      let totalQuality = 0;
      for (const referral of referrals) {
        const referrerQuality = await ReferrerQuality.findOne({ userId: referral.referrerId });
        if (referrerQuality) {
          totalQuality += referrerQuality.qualityScore;
        }
      }

      const avgQuality = totalQuality / referrals.length;
      // Scale 0-100 quality score to 0-15
      return Math.min(15, Math.round((avgQuality / 100) * 15));
    } catch (error) {
      console.error('Error calculating referrer quality:', error);
      return 5;
    }
  }

  /**
   * Calculate past success rate for candidate (0-15)
   * @private
   */
  async _calculatePastSuccessRate(candidateId) {
    try {
      // Check candidate's application history
      const applications = await Referral.find({ referredUserId: candidateId });
      if (applications.length === 0) return 5; // Base score

      const successful = applications.filter(a => 
        ['hired', 'paid'].includes(a.status)
      ).length;

      const successRate = (successful / applications.length) * 100;
      
      // Scale to 0-15
      if (successRate >= 50) return 15;
      if (successRate >= 25) return 10;
      if (successRate >= 10) return 7;
      return 5;
    } catch (error) {
      console.error('Error calculating past success rate:', error);
      return 5;
    }
  }

  // ==================== COMPANY SCORING ====================

  /**
   * Calculate company lead score (0-100)
   * @param {string} companyId - Company ID
   * @returns {Promise<Object>} Score breakdown and total
   */
  async calculateCompanyScore(companyId) {
    try {
      // Fetch company data
      const company = await Company.findById(companyId);
      if (!company) {
        throw new Error('Company not found');
      }

      const factors = {
        jobPostingFrequency: 0,
        referralBonusSize: 0,
        responseTime: 0,
        payoutHistory: 0,
        subscriptionTier: 0,
        engagementScore: 0,
        whatsappEngagement: 0,
      };

      // 1. Job Posting Frequency (20 points)
      factors.jobPostingFrequency = this._calculateJobPostingFrequency(company);

      // 2. Referral Bonus Size (20 points)
      factors.referralBonusSize = await this._calculateReferralBonusSize(companyId);

      // 3. Response Time (20 points)
      factors.responseTime = this._calculateResponseTimeScore(company);

      // 4. Payout History (20 points)
      factors.payoutHistory = this._calculatePayoutHistory(company);

      // 5. Subscription Tier (20 points)
      factors.subscriptionTier = this._calculateSubscriptionTier(company);

      // Additional: Engagement Score (bonus up to 10)
      factors.engagementScore = this._calculateEngagementScore(company);

      // Additional: WhatsApp Engagement (bonus up to 10)
      factors.whatsappEngagement = this._calculateWhatsAppEngagement(company);

      // Calculate total score (capped at 100)
      const rawScore = Object.values(factors).reduce((sum, val) => sum + val, 0);
      const totalScore = Math.min(100, Math.round(rawScore));

      return {
        totalScore,
        factors,
        conversionProbability: this._predictConversionProbability(factors, 'company'),
        predictedValue: this._predictCompanyValue(company, factors),
      };
    } catch (error) {
      console.error('Error calculating company score:', error);
      throw error;
    }
  }

  /**
   * Calculate job posting frequency score (0-20)
   * @private
   */
  _calculateJobPostingFrequency(company) {
    const totalJobs = company.stats?.totalJobsPosted || 0;
    const jobsThisMonth = company.stats?.jobsPostedThisMonth || 0;
    let score = 0;

    // Total jobs posted (10 points)
    if (totalJobs >= 20) score += 10;
    else if (totalJobs >= 10) score += 8;
    else if (totalJobs >= 5) score += 5;
    else if (totalJobs >= 1) score += 2;

    // Recent activity (10 points)
    if (jobsThisMonth >= 3) score += 10;
    else if (jobsThisMonth >= 1) score += 7;
    else {
      // Check if posted within last 3 months
      const lastJobAt = company.stats?.lastJobPostedAt;
      if (lastJobAt) {
        const monthsSince = (Date.now() - new Date(lastJobAt).getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (monthsSince <= 3) score += 5;
        else if (monthsSince <= 6) score += 2;
      }
    }

    return Math.min(20, score);
  }

  /**
   * Calculate referral bonus size score (0-20)
   * @private
   */
  async _calculateReferralBonusSize(companyId) {
    try {
      // Get recent jobs and their bonus offers
      const jobs = await Job.find({ companyId })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('referralBonus');

      if (jobs.length === 0) return 5;

      const avgBonus = jobs.reduce((sum, j) => sum + (j.referralBonus || 0), 0) / jobs.length;

      // Score based on average bonus (in MMK)
      if (avgBonus >= 500000) return 20; // 500k+
      if (avgBonus >= 300000) return 17; // 300k+
      if (avgBonus >= 200000) return 14; // 200k+
      if (avgBonus >= 100000) return 10; // 100k+
      if (avgBonus >= 50000) return 7;   // 50k+
      return 5;
    } catch (error) {
      console.error('Error calculating referral bonus size:', error);
      return 5;
    }
  }

  /**
   * Calculate response time score (0-20)
   * @private
   */
  _calculateResponseTimeScore(company) {
    const avgResponseTime = company.stats?.avgResponseTime || 0;
    const totalResponses = company.stats?.totalResponses || 0;

    // If no responses yet, give neutral score
    if (totalResponses === 0) return 10;

    // Lower response time is better (in hours)
    if (avgResponseTime <= 24) return 20;      // Within 1 day
    if (avgResponseTime <= 48) return 17;      // Within 2 days
    if (avgResponseTime <= 72) return 14;      // Within 3 days
    if (avgResponseTime <= 168) return 10;     // Within 1 week
    if (avgResponseTime <= 336) return 5;      // Within 2 weeks
    return 2;                                   // More than 2 weeks
  }

  /**
   * Calculate payout history score (0-20)
   * @private
   */
  _calculatePayoutHistory(company) {
    const totalHires = company.stats?.totalHires || 0;
    const totalSpent = company.stats?.totalReferralSpend || 0;
    let score = 0;

    // Number of successful hires (10 points)
    if (totalHires >= 10) score += 10;
    else if (totalHires >= 5) score += 8;
    else if (totalHires >= 3) score += 6;
    else if (totalHires >= 1) score += 4;

    // Total amount spent (10 points)
    if (totalSpent >= 5000000) score += 10;      // 5M+ MMK
    else if (totalSpent >= 2000000) score += 8;  // 2M+ MMK
    else if (totalSpent >= 1000000) score += 6;  // 1M+ MMK
    else if (totalSpent >= 500000) score += 4;   // 500k+ MMK
    else if (totalSpent >= 100000) score += 2;   // 100k+ MMK

    return Math.min(20, score);
  }

  /**
   * Calculate subscription tier score (0-20)
   * @private
   */
  _calculateSubscriptionTier(company) {
    const subscription = company.currentSubscription;
    if (!subscription || subscription.status !== 'active') {
      return 5; // Base score for no active subscription
    }

    // This would ideally check the plan tier
    // For now, use job posting limit as proxy
    const limit = company.jobPostingLimit || 5;

    if (limit >= 50) return 20;  // Enterprise
    if (limit >= 20) return 17;  // Business
    if (limit >= 10) return 14;  // Professional
    if (limit >= 5) return 10;   // Starter
    return 7;
  }

  /**
   * Calculate engagement score (0-10 bonus)
   * @private
   */
  _calculateEngagementScore(company) {
    let score = 0;

    // Verification status
    if (company.verificationStatus === 'verified') score += 3;

    // Profile completeness
    if (company.logo) score += 1;
    if (company.description?.length > 100) score += 1;
    if (company.website) score += 1;

    // Active jobs
    if (company.activeJobCount > 0) score += 2;

    // Recent activity
    const lastJobAt = company.stats?.lastJobPostedAt;
    if (lastJobAt) {
      const daysSince = (Date.now() - new Date(lastJobAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince <= 30) score += 2;
    }

    return Math.min(10, score);
  }

  /**
   * Calculate WhatsApp engagement score (0-10 bonus)
   * @private
   */
  _calculateWhatsAppEngagement(company) {
    const wa = company.crm?.whatsappEngagement;
    if (!wa) return 0;

    let score = 0;

    // Opt-in status
    if (wa.optInStatus === 'opted_in') score += 3;

    // Message activity
    const totalMessages = (wa.messagesReceived || 0) + (wa.messagesSent || 0);
    if (totalMessages >= 20) score += 4;
    else if (totalMessages >= 10) score += 3;
    else if (totalMessages >= 5) score += 2;
    else if (totalMessages > 0) score += 1;

    // Recent engagement
    if (wa.lastMessageAt) {
      const daysSince = (Date.now() - new Date(wa.lastMessageAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince <= 7) score += 3;
      else if (daysSince <= 30) score += 1;
    }

    return Math.min(10, score);
  }

  // ==================== PREDICTION METHODS ====================

  /**
   * Predict conversion probability based on score factors
   * @private
   */
  _predictConversionProbability(factors, type) {
    let probability = 0;

    if (type === 'company') {
      // Weight factors for company conversion prediction
      probability += (factors.jobPostingFrequency / 20) * 0.25;
      probability += (factors.referralBonusSize / 20) * 0.20;
      probability += (factors.responseTime / 20) * 0.20;
      probability += (factors.payoutHistory / 20) * 0.20;
      probability += (factors.subscriptionTier / 20) * 0.15;
    } else {
      // Weight factors for candidate conversion prediction
      probability += (factors.profileCompleteness / 20) * 0.25;
      probability += (factors.experienceMatch / 25) * 0.25;
      probability += (factors.skillsMatch / 25) * 0.25;
      probability += (factors.referrerQuality / 15) * 0.15;
      probability += (factors.pastSuccessRate / 15) * 0.10;
    }

    return Math.min(100, Math.round(probability * 100));
  }

  /**
   * Predict company value (estimated revenue)
   * @private
   */
  _predictCompanyValue(company, factors) {
    const baseValue = 50000; // Base MMK value
    
    // Factor multipliers
    const postingMultiplier = factors.jobPostingFrequency / 20;
    const bonusMultiplier = factors.referralBonusSize / 20;
    const tierMultiplier = factors.subscriptionTier / 20;
    
    const estimatedValue = baseValue * (1 + postingMultiplier + bonusMultiplier + tierMultiplier);
    
    return Math.round(estimatedValue);
  }

  // ==================== SCORE MANAGEMENT ====================

  /**
   * Get or calculate lead score for an entity
   * @param {string} entityType - 'candidate' or 'company'
   * @param {string} entityId - Entity ID
   * @param {boolean} forceRecalculate - Force recalculation even if cache valid
   * @returns {Promise<Object>}
   */
  async getLeadScore(entityType, entityId, forceRecalculate = false) {
    const cacheKey = `${entityType}:${entityId}`;
    
    // Check cache
    if (!forceRecalculate) {
      const cached = this._getCachedScore(cacheKey);
      if (cached) return cached;
      
      // Check database cache
      const leadScore = await LeadScore.findOne({ entityType, entityId });
      if (leadScore && leadScore.isCacheValid()) {
        this._setCachedScore(cacheKey, leadScore);
        return leadScore;
      }
    }

    // Calculate new score
    let scoreData;
    if (entityType === 'candidate') {
      scoreData = await this.calculateCandidateScore(entityId);
    } else if (entityType === 'company') {
      scoreData = await this.calculateCompanyScore(entityId);
    } else {
      throw new Error('Invalid entity type');
    }

    // Save to database
    const leadScore = await LeadScore.findOrCreate(entityType, entityId);
    await leadScore.updateScore(scoreData.totalScore, scoreData.factors, 'Score calculated');
    
    // Update conversion probability
    leadScore.conversionProbability = scoreData.conversionProbability;
    if (entityType === 'company') {
      leadScore.predictedValue = scoreData.predictedValue;
    }
    await leadScore.save();

    // Update company's cached lead score
    if (entityType === 'company') {
      await Company.findByIdAndUpdate(entityId, { leadScore: scoreData.totalScore });
    }

    // Check for high-value alerts
    await this._checkForAlerts(entityType, entityId, leadScore);

    // Cache result
    this._setCachedScore(cacheKey, leadScore);

    return leadScore;
  }

  /**
   * Queue background score calculation
   * @param {string} entityType - 'candidate' or 'company'
   * @param {string} entityId - Entity ID
   */
  queueScoreCalculation(entityType, entityId) {
    this.jobQueue.push({ entityType, entityId, timestamp: Date.now() });
    this._processQueue();
  }

  /**
   * Process background job queue
   * @private
   */
  async _processQueue() {
    if (this.isProcessing || this.jobQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.jobQueue.length > 0) {
      const job = this.jobQueue.shift();
      
      try {
        // Use setTimeout for non-blocking processing
        await new Promise(resolve => setTimeout(resolve, 100));
        await this.getLeadScore(job.entityType, job.entityId, true);
      } catch (error) {
        console.error(`Error processing score calculation for ${job.entityType}:${job.entityId}:`, error);
      }
    }
    
    this.isProcessing = false;
  }

  /**
   * Check and generate alerts for high-value leads
   * @private
   */
  async _checkForAlerts(entityType, entityId, leadScore) {
    if (leadScore.totalScore >= this.HOT_LEAD_THRESHOLD && entityType === 'company') {
      const existingAlert = leadScore.alerts.find(
        a => a.type === 'hot_lead' && !a.dismissedAt && !a.acknowledgedAt
      );
      
      if (!existingAlert) {
        const company = await Company.findById(entityId).select('name');
        await leadScore.addAlert({
          type: 'hot_lead',
          priority: leadScore.totalScore >= 90 ? 'urgent' : 'high',
          message: `Hot lead alert: ${company?.name || 'Company'} scored ${leadScore.totalScore}/100`,
          metadata: {
            score: leadScore.totalScore,
            companyId: entityId,
            companyName: company?.name,
          },
        });
      }
    }
  }

  // ==================== CACHE MANAGEMENT ====================

  /**
   * Get cached score
   * @private
   */
  _getCachedScore(key) {
    const cached = this.scoreCache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.scoreCache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Set cached score
   * @private
   */
  _setCachedScore(key, data) {
    this.scoreCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear score cache
   */
  clearCache() {
    this.scoreCache.clear();
  }

  // ==================== DASHBOARD DATA ====================

  /**
   * Get dashboard data for sales team
   * @returns {Promise<Object>}
   */
  async getDashboardData() {
    try {
      const [
        hotCompanies,
        totalCompanies,
        avgScore,
        recentAlerts,
        companiesByStage,
        pendingFollowUps,
      ] = await Promise.all([
        LeadScore.countDocuments({ 
          entityType: 'company', 
          totalScore: { $gte: this.HOT_LEAD_THRESHOLD },
          status: 'active',
        }),
        Company.countDocuments({ status: 'active' }),
        LeadScore.aggregate([
          { $match: { entityType: 'company', status: 'active' } },
          { $group: { _id: null, avgScore: { $avg: '$totalScore' } } },
        ]),
        LeadScore.aggregate([
          { $match: { entityType: 'company' } },
          { $unwind: '$alerts' },
          { $match: { 'alerts.dismissedAt': { $exists: false }, 'alerts.acknowledgedAt': { $exists: false } } },
          { $sort: { 'alerts.triggeredAt': -1 } },
          { $limit: 10 },
        ]),
        Company.aggregate([
          { $match: { status: 'active' } },
          { $group: { _id: '$crm.salesStage', count: { $sum: 1 } } },
        ]),
        Company.countDocuments({
          status: 'active',
          'crm.nextFollowUpDate': { $lte: new Date() },
        }),
      ]);

      return {
        summary: {
          hotCompanies,
          totalCompanies,
          avgScore: Math.round(avgScore[0]?.avgScore || 0),
          pendingFollowUps,
        },
        alerts: recentAlerts.map(a => ({
          id: a.alerts._id,
          type: a.alerts.type,
          priority: a.alerts.priority,
          message: a.alerts.message,
          triggeredAt: a.alerts.triggeredAt,
          entityId: a.entityId,
        })),
        pipeline: companiesByStage.reduce((acc, stage) => {
          acc[stage._id || 'prospect'] = stage.count;
          return acc;
        }, {}),
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      throw error;
    }
  }

  /**
   * Get prioritized company list
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getPrioritizedCompanies(options = {}) {
    const {
      limit = 20,
      minScore = 0,
      salesStage,
      assignedTo,
      sortBy = 'score',
    } = options;

    const query = {
      status: 'active',
      leadScore: { $gte: minScore },
    };

    if (salesStage) {
      query['crm.salesStage'] = salesStage;
    }

    if (assignedTo) {
      query['crm.assignedSalesRep'] = assignedTo;
    }

    let sort = {};
    if (sortBy === 'score') sort = { leadScore: -1 };
    else if (sortBy === 'recent') sort = { 'crm.lastContactDate': -1 };
    else if (sortBy === 'followUp') sort = { 'crm.nextFollowUpDate': 1 };

    const companies = await Company.find(query)
      .select('name slug industry leadScore crm stats currentSubscription')
      .sort(sort)
      .limit(limit)
      .lean();

    return companies.map(company => ({
      ...company,
      priority: this._calculatePriority(company),
      daysSinceLastContact: company.crm?.lastContactDate 
        ? Math.floor((Date.now() - new Date(company.crm.lastContactDate).getTime()) / (1000 * 60 * 60 * 24))
        : null,
    }));
  }

  /**
   * Calculate priority label for a company
   * @private
   */
  _calculatePriority(company) {
    const score = company.leadScore || 0;
    
    if (score >= 90) return { label: 'Critical', color: 'red', value: 5 };
    if (score >= 80) return { label: 'High', color: 'orange', value: 4 };
    if (score >= 60) return { label: 'Medium', color: 'yellow', value: 3 };
    if (score >= 40) return { label: 'Low', color: 'blue', value: 2 };
    return { label: 'Minimal', color: 'gray', value: 1 };
  }

  /**
   * Get active alerts
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getAlerts(options = {}) {
    const { type, priority, acknowledged = false, limit = 50 } = options;

    const matchStage = {
      entityType: 'company',
    };

    if (type) matchStage['alerts.type'] = type;
    if (priority) matchStage['alerts.priority'] = priority;

    const pipeline = [
      { $match: matchStage },
      { $unwind: '$alerts' },
    ];

    if (!acknowledged) {
      pipeline.push({
        $match: {
          'alerts.dismissedAt': { $exists: false },
          'alerts.acknowledgedAt': { $exists: false },
        },
      });
    }

    pipeline.push(
      { $sort: { 'alerts.triggeredAt': -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'companies',
          localField: 'entityId',
          foreignField: '_id',
          as: 'company',
        },
      },
      {
        $project: {
          id: '$alerts._id',
          type: '$alerts.type',
          priority: '$alerts.priority',
          message: '$alerts.message',
          triggeredAt: '$alerts.triggeredAt',
          entityId: '$entityId',
          companyName: { $arrayElemAt: ['$company.name', 0] },
          companySlug: { $arrayElemAt: ['$company.slug', 0] },
        },
      }
    );

    return LeadScore.aggregate(pipeline);
  }

  /**
   * Recalculate all scores (for batch operations)
   * @param {string} entityType - 'candidate' or 'company' or 'all'
   * @returns {Promise<Object>}
   */
  async recalculateAllScores(entityType = 'all') {
    const results = {
      processed: 0,
      errors: 0,
    };

    if (entityType === 'all' || entityType === 'company') {
      const companies = await Company.find({ status: 'active' }).select('_id');
      
      for (const company of companies) {
        try {
          await this.getLeadScore('company', company._id, true);
          results.processed++;
        } catch (error) {
          console.error(`Error recalculating score for company ${company._id}:`, error);
          results.errors++;
        }
      }
    }

    if (entityType === 'all' || entityType === 'candidate') {
      const candidates = await User.find({ role: 'job_seeker', status: 'active' }).select('_id');
      
      for (const candidate of candidates) {
        try {
          await this.getLeadScore('candidate', candidate._id, true);
          results.processed++;
        } catch (error) {
          console.error(`Error recalculating score for candidate ${candidate._id}:`, error);
          results.errors++;
        }
      }
    }

    return results;
  }
}

// Export singleton instance
const leadScoreService = new LeadScoreService();
module.exports = leadScoreService;
