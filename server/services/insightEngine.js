/**
 * InsightEngine Service
 * AI-powered analytics and prediction engine for TRM platform
 * Provides predictive analytics, market insights, and data-driven recommendations
 */

const {
  User,
  Company,
  Job,
  Application,
  Referral,
  AnalyticsInsight,
  SalaryBenchmark,
  MarketTrend,
  HiringVelocity,
  ReferrerPrediction,
} = require('../models/index.js');

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map();

class InsightEngine {
  constructor() {
    this.modelVersion = '1.0.0';
  }

  // ==================== CACHE UTILITIES ====================

  getCacheKey(prefix, params) {
    return `${prefix}:${JSON.stringify(params)}`;
  }

  getFromCache(key) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    cache.delete(key);
    return null;
  }

  setCache(key, data) {
    cache.set(key, { data, timestamp: Date.now() });
  }

  clearCache() {
    cache.clear();
  }

  // ==================== CANDIDATE HIRE PREDICTION ====================

  /**
   * Predict candidate hire probability
   * @param {string} candidateId - Candidate user ID
   * @param {string} jobId - Job ID (optional)
   * @returns {Promise<Object>} Prediction result
   */
  async predictCandidateHireProbability(candidateId, jobId = null) {
    const cacheKey = this.getCacheKey('hire_prediction', { candidateId, jobId });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Get candidate data
      const candidate = await User.findById(candidateId);
      if (!candidate || candidate.role !== 'job_seeker') {
        throw new Error('Candidate not found');
      }

      // Get candidate's application history
      const applications = await Application.find({ applicantId: candidateId });
      const referrals = await Referral.find({ referredUserId: candidateId });

      // Calculate base factors
      const factors = [];
      let baseScore = 50; // Start at neutral

      // Factor 1: Profile completeness
      const profileScore = this.calculateProfileScore(candidate);
      factors.push({
        factor: 'profile_completeness',
        weight: 0.2,
        value: profileScore,
        impact: profileScore > 70 ? 'positive' : profileScore < 40 ? 'negative' : 'neutral',
      });
      baseScore += (profileScore - 50) * 0.2;

      // Factor 2: Application history
      const appHistoryScore = this.calculateApplicationHistoryScore(applications);
      factors.push({
        factor: 'application_history',
        weight: 0.25,
        value: appHistoryScore,
        impact: appHistoryScore > 60 ? 'positive' : appHistoryScore < 30 ? 'negative' : 'neutral',
      });
      baseScore += (appHistoryScore - 50) * 0.25;

      // Factor 3: Skills match (if job specified)
      let skillsScore = 50;
      if (jobId) {
        const job = await Job.findById(jobId);
        if (job) {
          skillsScore = this.calculateSkillsMatchScore(candidate, job);
          factors.push({
            factor: 'skills_match',
            weight: 0.3,
            value: skillsScore,
            impact: skillsScore > 70 ? 'positive' : skillsScore < 40 ? 'negative' : 'neutral',
          });
          baseScore += (skillsScore - 50) * 0.3;
        }
      }

      // Factor 4: Engagement level
      const engagementScore = this.calculateEngagementScore(candidate, applications);
      factors.push({
        factor: 'engagement_level',
        weight: 0.15,
        value: engagementScore,
        impact: engagementScore > 60 ? 'positive' : engagementScore < 30 ? 'negative' : 'neutral',
      });
      baseScore += (engagementScore - 50) * 0.15;

      // Factor 5: Referral quality
      const referralScore = this.calculateReferralQualityScore(referrals);
      factors.push({
        factor: 'referral_quality',
        weight: 0.1,
        value: referralScore,
        impact: referralScore > 60 ? 'positive' : referralScore < 30 ? 'negative' : 'neutral',
      });
      baseScore += (referralScore - 50) * 0.1;

      // Normalize score to 0-100 range
      const finalScore = Math.max(0, Math.min(100, Math.round(baseScore)));
      const confidence = this.calculateConfidence(factors);

      const result = {
        candidateId,
        jobId,
        probability: finalScore,
        confidence,
        classification: this.classifyHireProbability(finalScore),
        factors: factors.sort((a, b) => b.weight - a.weight),
        recommendation: this.generateHireRecommendation(finalScore, factors),
        modelVersion: this.modelVersion,
      };

      // Store insight
      await this.storeInsight('candidate_hire_prediction', candidateId, 'candidate', result);

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error predicting hire probability:', error);
      throw error;
    }
  }

  calculateProfileScore(candidate) {
    let score = 0;
    const profile = candidate.jobseekerProfile || {};

    if (profile.resume) score += 20;
    if (profile.skills?.length > 0) score += Math.min(20, profile.skills.length * 4);
    if (profile.experience) score += 15;
    if (profile.education) score += 15;
    if (profile.portfolioUrl) score += 10;
    if (profile.linkedInUrl) score += 10;
    if (candidate.phone) score += 10;

    return score;
  }

  calculateApplicationHistoryScore(applications) {
    if (!applications.length) return 50;

    const total = applications.length;
    const hired = applications.filter(a => a.status === 'hired').length;
    const shortlisted = applications.filter(a => ['shortlisted', 'interview_scheduled', 'interview_completed', 'offer_extended'].includes(a.status)).length;
    const rejected = applications.filter(a => a.status === 'rejected').length;

    let score = 50;
    score += (hired / total) * 40; // +40 for all hired
    score += (shortlisted / total) * 20; // +20 for all shortlisted
    score -= (rejected / total) * 20; // -20 for all rejected

    return Math.max(0, Math.min(100, score));
  }

  calculateSkillsMatchScore(candidate, job) {
    const candidateSkills = candidate.jobseekerProfile?.skills || [];
    const jobSkills = job.skills || [];

    if (!jobSkills.length) return 50;
    if (!candidateSkills.length) return 30;

    const matchedSkills = jobSkills.filter(js => 
      candidateSkills.some(cs => cs.toLowerCase().includes(js.toLowerCase()))
    );

    return Math.round((matchedSkills.length / jobSkills.length) * 100);
  }

  calculateEngagementScore(candidate, applications) {
    let score = 50;

    // Recent activity bonus
    const recentApps = applications.filter(a => 
      new Date(a.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    score += Math.min(30, recentApps.length * 5);

    // Application quality (completed applications)
    const completedApps = applications.filter(a => 
      !['withdrawn', 'rejected'].includes(a.status)
    );
    score += (completedApps.length / Math.max(1, applications.length)) * 20;

    return Math.min(100, score);
  }

  calculateReferralQualityScore(referrals) {
    if (!referrals.length) return 50;

    const successful = referrals.filter(r => 
      ['hired', 'payment_pending', 'paid'].includes(r.status)
    ).length;

    return Math.round((successful / referrals.length) * 100);
  }

  classifyHireProbability(score) {
    if (score >= 80) return 'high_probability';
    if (score >= 60) return 'good_probability';
    if (score >= 40) return 'moderate_probability';
    if (score >= 20) return 'low_probability';
    return 'very_low_probability';
  }

  generateHireRecommendation(score, factors) {
    if (score >= 80) return 'Strong candidate - prioritize for interview';
    if (score >= 60) return 'Good candidate - recommend for screening';
    if (score >= 40) return 'Moderate fit - consider for relevant roles';
    
    // Find weakest factor
    const weakFactor = factors
      .filter(f => f.impact === 'negative')
      .sort((a, b) => a.value - b.value)[0];
    
    if (weakFactor?.factor === 'profile_completeness') {
      return 'Candidate should complete their profile to improve chances';
    }
    if (weakFactor?.factor === 'skills_match') {
      return 'Skills do not align well with this role';
    }
    
    return 'Consider other candidates for this role';
  }

  // ==================== SALARY BENCHMARKING ====================

  /**
   * Get salary benchmark for role
   * @param {string} jobTitle - Job title
   * @param {string} experienceLevel - Experience level
   * @param {string} location - Location
   * @param {Array<string>} skills - Skills
   * @returns {Promise<Object>} Salary benchmark
   */
  async getSalaryBenchmark(jobTitle, experienceLevel, location, skills = []) {
    const cacheKey = this.getCacheKey('salary_benchmark', { jobTitle, experienceLevel, location });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Try to find existing benchmark
      let benchmark = await SalaryBenchmark.findBenchmark({
        jobTitle,
        experienceLevel,
        location,
      });

      // If no benchmark exists, generate one
      if (!benchmark) {
        benchmark = await this.generateSalaryBenchmark(jobTitle, experienceLevel, location);
      }

      // Calculate adjusted salary for skills
      const adjustedSalary = benchmark.calculateAdjustedSalary(skills);

      const result = {
        jobTitle,
        experienceLevel,
        location,
        currency: benchmark.currency,
        period: benchmark.period,
        baseSalary: {
          min: benchmark.salary.min,
          max: benchmark.salary.max,
          median: benchmark.salary.median,
          average: benchmark.salary.average,
        },
        adjustedSalary,
        skillsPremiums: benchmark.skillsPremiums.filter(sp => 
          skills.some(s => s.toLowerCase() === sp.skill.toLowerCase())
        ),
        trend: benchmark.trend,
        sampleSize: benchmark.sampleSize,
        confidence: benchmark.confidenceLevel,
        lastUpdated: benchmark.lastUpdated,
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error getting salary benchmark:', error);
      throw error;
    }
  }

  async generateSalaryBenchmark(jobTitle, experienceLevel, location) {
    // Get similar jobs for salary data
    const similarJobs = await Job.find({
      $or: [
        { title: { $regex: jobTitle, $options: 'i' } },
        { category: { $regex: jobTitle, $options: 'i' } },
      ],
      'salary.max': { $exists: true, $gt: 0 },
    }).limit(50);

    if (!similarJobs.length) {
      // Return default benchmark based on experience level
      return this.getDefaultSalaryBenchmark(experienceLevel, location);
    }

    const salaries = similarJobs.map(j => j.salary.max).filter(s => s > 0);
    const min = Math.min(...salaries);
    const max = Math.max(...salaries);
    const median = this.calculateMedian(salaries);
    const average = Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length);

    // Myanmar-specific salary ranges based on experience
    const experienceMultipliers = {
      entry: 0.6,
      junior: 0.8,
      mid: 1.0,
      senior: 1.5,
      executive: 2.5,
    };

    const multiplier = experienceMultipliers[experienceLevel] || 1.0;
    const locationMultiplier = this.getLocationMultiplier(location);

    const benchmark = await SalaryBenchmark.create({
      jobTitle,
      jobCategory: similarJobs[0]?.category || 'General',
      experienceLevel,
      location: {
        city: location,
        country: 'Myanmar',
      },
      salary: {
        min: Math.round(min * multiplier * locationMultiplier),
        max: Math.round(max * multiplier * locationMultiplier),
        median: Math.round(median * multiplier * locationMultiplier),
        average: Math.round(average * multiplier * locationMultiplier),
      },
      sampleSize: similarJobs.length,
      dataQuality: similarJobs.length > 20 ? 80 : similarJobs.length > 10 ? 60 : 40,
      confidenceLevel: similarJobs.length > 20 ? 'high' : similarJobs.length > 10 ? 'medium' : 'low',
      isAIGenerated: true,
    });

    return benchmark;
  }

  getDefaultSalaryBenchmark(experienceLevel, location) {
    // Default Myanmar salary ranges in MMK (monthly)
    const baseRanges = {
      entry: { min: 200000, max: 400000, median: 300000 },
      junior: { min: 350000, max: 600000, median: 450000 },
      mid: { min: 500000, max: 1000000, median: 700000 },
      senior: { min: 800000, max: 2000000, median: 1200000 },
      executive: { min: 1500000, max: 5000000, median: 2500000 },
    };

    const locationMultipliers = {
      'Yangon': 1.2,
      'Mandalay': 1.0,
      'Naypyitaw': 1.1,
    };

    const base = baseRanges[experienceLevel] || baseRanges.mid;
    const multiplier = locationMultipliers[location] || 0.9;

    return {
      jobTitle: 'General',
      jobCategory: 'General',
      experienceLevel,
      location: { city: location, country: 'Myanmar' },
      salary: {
        min: Math.round(base.min * multiplier),
        max: Math.round(base.max * multiplier),
        median: Math.round(base.median * multiplier),
        average: Math.round(base.median * multiplier),
      },
      currency: 'MMK',
      period: 'monthly',
      sampleSize: 0,
      dataQuality: 30,
      confidenceLevel: 'low',
      calculateAdjustedSalary: (skills) => ({
        baseMin: Math.round(base.min * multiplier),
        baseMax: Math.round(base.max * multiplier),
        baseMedian: Math.round(base.median * multiplier),
        adjustment: 0,
        adjustedMin: Math.round(base.min * multiplier),
        adjustedMax: Math.round(base.max * multiplier),
        adjustedMedian: Math.round(base.median * multiplier),
      }),
    };
  }

  getLocationMultiplier(location) {
    const multipliers = {
      'Yangon': 1.2,
      'Mandalay': 1.0,
      'Naypyitaw': 1.1,
      'Mawlamyine': 0.85,
      'Taunggyi': 0.8,
    };
    return multipliers[location] || 0.9;
  }

  // ==================== HIRING VELOCITY PREDICTION ====================

  /**
   * Predict hiring velocity for a job
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Velocity prediction
   */
  async predictHiringVelocity(jobId) {
    const cacheKey = this.getCacheKey('hiring_velocity', { jobId });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const job = await Job.findById(jobId).populate('companyId');
      if (!job) throw new Error('Job not found');

      // Get company history
      const companyHistory = await HiringVelocity.find({
        companyId: job.companyId._id,
        status: 'fulfilled',
      });

      // Get similar jobs history
      const similarJobs = await HiringVelocity.find({
        'jobCharacteristics.category': job.category,
        'jobCharacteristics.experienceLevel': job.experienceLevel,
        status: 'fulfilled',
      }).limit(20);

      // Calculate base estimate
      let baseDays = 30; // Default 30 days

      if (companyHistory.length > 0) {
        const avgDays = companyHistory.reduce((sum, h) => sum + h.actualOutcome.actualDays, 0) / companyHistory.length;
        baseDays = avgDays;
      } else if (similarJobs.length > 0) {
        const avgDays = similarJobs.reduce((sum, h) => sum + h.actualOutcome.actualDays, 0) / similarJobs.length;
        baseDays = avgDays;
      }

      // Calculate factors
      const factors = [];

      // Factor 1: Salary competitiveness
      const salaryFactor = await this.calculateSalaryFactor(job);
      factors.push(salaryFactor);
      baseDays += salaryFactor.daysImpact;

      // Factor 2: Skill rarity
      const skillFactor = this.calculateSkillFactor(job);
      factors.push(skillFactor);
      baseDays += skillFactor.daysImpact;

      // Factor 3: Location
      const locationFactor = this.calculateLocationFactor(job);
      factors.push(locationFactor);
      baseDays += locationFactor.daysImpact;

      // Factor 4: Experience level
      const experienceFactor = this.calculateExperienceFactor(job);
      factors.push(experienceFactor);
      baseDays += experienceFactor.daysImpact;

      // Factor 5: Market conditions
      const marketFactor = await this.calculateMarketFactor(job);
      factors.push(marketFactor);
      baseDays += marketFactor.daysImpact;

      // Calculate confidence
      const confidence = this.calculateVelocityConfidence(companyHistory.length, similarJobs.length);

      // Ensure minimum 7 days
      const estimatedDays = Math.max(7, Math.round(baseDays));

      const result = {
        jobId,
        prediction: {
          estimatedDays,
          minDays: Math.round(estimatedDays * 0.7),
          maxDays: Math.round(estimatedDays * 1.5),
          confidence,
          factors: factors.sort((a, b) => Math.abs(b.daysImpact) - Math.abs(a.daysImpact)),
        },
        timeline: this.breakdownTimeline(estimatedDays),
        marketContext: {
          location: job.location?.city,
          marketConditions: marketFactor.impact === 'positive' ? 'favorable' : marketFactor.impact === 'negative' ? 'challenging' : 'neutral',
        },
        expectedFillDate: new Date(Date.now() + estimatedDays * 24 * 60 * 60 * 1000),
        modelVersion: this.modelVersion,
      };

      // Store prediction
      await HiringVelocity.create({
        jobId,
        companyId: job.companyId._id,
        jobCharacteristics: {
          title: job.title,
          category: job.category,
          experienceLevel: job.experienceLevel,
          location: job.location,
          salaryRange: job.salary,
          skills: job.skills,
        },
        prediction: result.prediction,
        timeline: result.timeline,
        marketContext: result.marketContext,
        expectedFillDate: result.expectedFillDate,
      });

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error predicting hiring velocity:', error);
      throw error;
    }
  }

  async calculateSalaryFactor(job) {
    const benchmark = await SalaryBenchmark.findBenchmark({
      jobTitle: job.title,
      experienceLevel: job.experienceLevel,
      location: job.location?.city,
    });

    if (!benchmark || !job.salary?.max) {
      return { factor: 'salary_competitiveness', impact: 'neutral', weight: 0.2, daysImpact: 0, description: 'Salary data unavailable' };
    }

    const ratio = job.salary.max / benchmark.salary.median;
    
    if (ratio >= 1.2) {
      return { factor: 'salary_competitiveness', impact: 'positive', weight: 0.2, daysImpact: -5, description: 'Above-market salary' };
    }
    if (ratio >= 0.9) {
      return { factor: 'salary_competitiveness', impact: 'neutral', weight: 0.2, daysImpact: 0, description: 'Market-rate salary' };
    }
    if (ratio >= 0.8) {
      return { factor: 'salary_competitiveness', impact: 'negative', weight: 0.2, daysImpact: 5, description: 'Below-market salary' };
    }
    return { factor: 'salary_competitiveness', impact: 'negative', weight: 0.2, daysImpact: 10, description: 'Significantly below-market salary' };
  }

  calculateSkillFactor(job) {
    const skills = job.skills || [];
    const rareSkills = ['AI', 'Machine Learning', 'Blockchain', 'DevOps', 'Cybersecurity', 'Data Science'];
    
    const rareCount = skills.filter(s => 
      rareSkills.some(rs => s.toLowerCase().includes(rs.toLowerCase()))
    ).length;

    if (rareCount >= 3) {
      return { factor: 'skill_rarity', impact: 'negative', weight: 0.25, daysImpact: 15, description: 'Multiple rare skills required' };
    }
    if (rareCount >= 1) {
      return { factor: 'skill_rarity', impact: 'negative', weight: 0.25, daysImpact: 7, description: 'Rare skills required' };
    }
    return { factor: 'skill_rarity', impact: 'neutral', weight: 0.25, daysImpact: 0, description: 'Common skills' };
  }

  calculateLocationFactor(job) {
    const city = job.location?.city;
    const majorCities = ['Yangon', 'Mandalay', 'Naypyitaw'];
    
    if (majorCities.includes(city)) {
      return { factor: 'location_constraint', impact: 'positive', weight: 0.15, daysImpact: -3, description: 'Major talent hub' };
    }
    return { factor: 'location_constraint', impact: 'negative', weight: 0.15, daysImpact: 5, description: 'Smaller talent pool' };
  }

  calculateExperienceFactor(job) {
    const level = job.experienceLevel;
    
    const impactMap = {
      entry: { impact: 'positive', daysImpact: -5, description: 'Large entry-level talent pool' },
      junior: { impact: 'positive', daysImpact: -3, description: 'Good junior talent availability' },
      mid: { impact: 'neutral', daysImpact: 0, description: 'Moderate mid-level availability' },
      senior: { impact: 'negative', daysImpact: 7, description: 'Limited senior talent' },
      executive: { impact: 'negative', daysImpact: 15, description: 'Very limited executive talent' },
    };

    const impact = impactMap[level] || impactMap.mid;
    return { factor: 'experience_requirement', impact: impact.impact, weight: 0.2, daysImpact: impact.daysImpact, description: impact.description };
  }

  async calculateMarketFactor(job) {
    const trend = await MarketTrend.getLatest('job_volume', { 'location.city': job.location?.city });
    
    if (!trend) {
      return { factor: 'market_conditions', impact: 'neutral', weight: 0.2, daysImpact: 0, description: 'Market data unavailable' };
    }

    if (trend.analysis.trend === 'strong_growth') {
      return { factor: 'market_conditions', impact: 'negative', weight: 0.2, daysImpact: 5, description: 'High competition for talent' };
    }
    if (trend.analysis.trend === 'decline') {
      return { factor: 'market_conditions', impact: 'positive', weight: 0.2, daysImpact: -5, description: 'More available talent' };
    }
    return { factor: 'market_conditions', impact: 'neutral', weight: 0.2, daysImpact: 0, description: 'Stable market conditions' };
  }

  calculateVelocityConfidence(companyHistoryCount, similarJobsCount) {
    let confidence = 50;
    confidence += Math.min(30, companyHistoryCount * 5);
    confidence += Math.min(20, similarJobsCount * 2);
    return Math.min(95, confidence);
  }

  breakdownTimeline(totalDays) {
    return {
      sourcingDays: Math.round(totalDays * 0.3),
      screeningDays: Math.round(totalDays * 0.2),
      interviewDays: Math.round(totalDays * 0.3),
      decisionDays: Math.round(totalDays * 0.1),
      offerDays: Math.round(totalDays * 0.1),
    };
  }

  // ==================== REFERRER SUCCESS PREDICTION ====================

  /**
   * Predict referrer success
   * @param {string} referrerId - Referrer user ID
   * @returns {Promise<Object>} Success prediction
   */
  async predictReferrerSuccess(referrerId) {
    const cacheKey = this.getCacheKey('referrer_success', { referrerId });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const referrer = await User.findById(referrerId);
      if (!referrer || referrer.role !== 'referrer') {
        throw new Error('Referrer not found');
      }

      const profile = referrer.referrerProfile;
      
      // Get historical data
      const referrals = await Referral.find({ referrerId });
      const historicalPredictions = await ReferrerPrediction.findForReferrer(referrerId);

      // Calculate metrics
      const metrics = {
        totalReferrals: profile.totalReferrals,
        successfulReferrals: profile.successfulHires,
        conversionRate: profile.totalReferrals > 0 ? (profile.successfulHires / profile.totalReferrals) * 100 : 0,
        totalEarnings: profile.totalEarnings,
        networkSize: profile.networkSize,
        directReferrals: profile.directReferrals,
        tierLevel: profile.tierLevel,
        avgReferralQuality: this.calculateAvgReferralQuality(referrals),
        responseTime: await this.calculateResponseTime(referrerId),
        activityScore: this.calculateActivityScore(referrer, referrals),
        engagementRate: this.calculateEngagementRate(referrals),
      };

      // Calculate factors
      const factors = [];
      let baseScore = 50;

      // Conversion rate factor
      const conversionScore = Math.min(100, metrics.conversionRate * 5); // Scale up
      factors.push({
        factor: 'conversion_rate',
        score: conversionScore,
        weight: 0.3,
        impact: conversionScore > 60 ? 'positive' : conversionScore < 30 ? 'negative' : 'neutral',
        description: `${metrics.conversionRate.toFixed(1)}% conversion rate`,
      });
      baseScore += (conversionScore - 50) * 0.3;

      // Network size factor
      const networkScore = Math.min(100, metrics.networkSize * 5);
      factors.push({
        factor: 'network_size',
        score: networkScore,
        weight: 0.2,
        impact: networkScore > 50 ? 'positive' : networkScore < 20 ? 'negative' : 'neutral',
        description: `${metrics.networkSize} network connections`,
      });
      baseScore += (networkScore - 50) * 0.2;

      // Activity score factor
      factors.push({
        factor: 'activity_level',
        score: metrics.activityScore,
        weight: 0.2,
        impact: metrics.activityScore > 60 ? 'positive' : metrics.activityScore < 30 ? 'negative' : 'neutral',
        description: 'Based on referral frequency',
      });
      baseScore += (metrics.activityScore - 50) * 0.2;

      // Tier level factor
      const tierScores = { bronze: 25, silver: 50, gold: 75, platinum: 100 };
      const tierScore = tierScores[metrics.tierLevel] || 25;
      factors.push({
        factor: 'tier_level',
        score: tierScore,
        weight: 0.15,
        impact: tierScore > 50 ? 'positive' : 'neutral',
        description: `${metrics.tierLevel} tier`,
      });
      baseScore += (tierScore - 50) * 0.15;

      // Engagement factor
      factors.push({
        factor: 'engagement_rate',
        score: metrics.engagementRate,
        weight: 0.15,
        impact: metrics.engagementRate > 60 ? 'positive' : metrics.engagementRate < 30 ? 'negative' : 'neutral',
        description: 'Follow-up and communication rate',
      });
      baseScore += (metrics.engagementRate - 50) * 0.15;

      const finalScore = Math.max(0, Math.min(100, Math.round(baseScore)));
      const classification = this.classifyReferrerPerformance(finalScore);

      // Generate forecasts
      const forecasts = {
        nextMonthReferrals: Math.round((finalScore / 100) * 3),
        nextMonthEarnings: Math.round((finalScore / 100) * 150000),
        projectedNetworkSize: Math.round(metrics.networkSize * 1.1),
      };

      const result = {
        referrerId,
        type: 'success_prediction',
        prediction: {
          score: finalScore,
          probability: finalScore,
          confidence: this.calculateConfidence(factors),
          factors: factors.sort((a, b) => b.weight - a.weight),
        },
        metrics,
        classification,
        forecasts,
        recommendations: this.generateReferrerRecommendations(metrics, factors),
        riskAssessment: this.assessReferrerRisk(metrics),
      };

      // Store prediction
      await ReferrerPrediction.upsertPrediction(referrerId, 'success_prediction', {
        prediction: result.prediction,
        metrics: result.metrics,
        classification: result.classification,
        forecasts: result.forecasts,
        recommendations: result.recommendations,
        riskAssessment: result.riskAssessment,
      });

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error predicting referrer success:', error);
      throw error;
    }
  }

  calculateAvgReferralQuality(referrals) {
    if (!referrals.length) return 50;
    
    const scoredReferrals = referrals.filter(r => r.rating);
    if (!scoredReferrals.length) return 50;
    
    const avgRating = scoredReferrals.reduce((sum, r) => sum + r.rating, 0) / scoredReferrals.length;
    return (avgRating / 5) * 100;
  }

  async calculateResponseTime(referrerId) {
    // Simplified - would track actual response times
    return 24; // Default 24 hours
  }

  calculateActivityScore(referrer, referrals) {
    let score = 50;
    
    // Recent referrals
    const recentReferrals = referrals.filter(r => 
      new Date(r.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    score += Math.min(30, recentReferrals.length * 10);
    
    // Total referral volume
    score += Math.min(20, referrals.length * 2);
    
    return Math.min(100, score);
  }

  calculateEngagementRate(referrals) {
    if (!referrals.length) return 50;
    
    // Referrals with status updates (engaged)
    const engaged = referrals.filter(r => 
      r.statusHistory && r.statusHistory.length > 1
    ).length;
    
    return (engaged / referrals.length) * 100;
  }

  classifyReferrerPerformance(score) {
    if (score >= 85) return 'top_performer';
    if (score >= 70) return 'high_performer';
    if (score >= 50) return 'average';
    if (score >= 30) return 'below_average';
    return 'at_risk';
  }

  generateReferrerRecommendations(metrics, factors) {
    const recommendations = [];
    
    if (metrics.conversionRate < 20) {
      recommendations.push('Focus on quality over quantity - ensure candidates match job requirements');
    }
    
    if (metrics.networkSize < 20) {
      recommendations.push('Expand your network by inviting more professionals');
    }
    
    if (metrics.activityScore < 50) {
      recommendations.push('Check for new job opportunities more frequently');
    }
    
    if (metrics.engagementRate < 40) {
      recommendations.push('Follow up with your referrals to track their progress');
    }
    
    return recommendations;
  }

  assessReferrerRisk(metrics) {
    let riskLevel = 'low';
    const factors = [];
    let churnRisk = 0;
    
    if (metrics.activityScore < 30) {
      factors.push('Low activity level');
      churnRisk += 30;
    }
    
    if (metrics.conversionRate < 10 && metrics.totalReferrals > 5) {
      factors.push('Poor conversion rate');
      churnRisk += 20;
    }
    
    if (metrics.engagementRate < 20) {
      factors.push('Low engagement');
      churnRisk += 25;
    }
    
    if (churnRisk > 50) riskLevel = 'high';
    else if (churnRisk > 30) riskLevel = 'medium';
    
    return { level: riskLevel, factors, churnRisk: Math.min(100, churnRisk) };
  }

  // ==================== COMPANY CHURN PREDICTION ====================

  /**
   * Predict company churn risk
   * @param {string} companyId - Company ID
   * @returns {Promise<Object>} Churn prediction
   */
  async predictCompanyChurn(companyId) {
    const cacheKey = this.getCacheKey('churn_prediction', { companyId });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const company = await Company.findById(companyId);
      if (!company) throw new Error('Company not found');

      // Get company metrics
      const jobs = await Job.find({ companyId });
      const referrals = await Referral.find({ companyId });
      
      // Calculate factors
      const factors = [];
      let churnRisk = 30; // Base 30% risk

      // Factor 1: Job posting frequency
      const recentJobs = jobs.filter(j => 
        new Date(j.createdAt) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      );
      const jobFrequency = recentJobs.length;
      
      if (jobFrequency === 0) {
        factors.push({ factor: 'job_activity', weight: 0.3, impact: 'negative', description: 'No recent job postings' });
        churnRisk += 25;
      } else if (jobFrequency < 3) {
        factors.push({ factor: 'job_activity', weight: 0.3, impact: 'neutral', description: 'Low job posting frequency' });
        churnRisk += 10;
      } else {
        factors.push({ factor: 'job_activity', weight: 0.3, impact: 'positive', description: 'Active job postings' });
        churnRisk -= 10;
      }

      // Factor 2: Subscription status
      const hasActiveSub = company.currentSubscription?.status === 'active';
      if (!hasActiveSub) {
        factors.push({ factor: 'subscription_status', weight: 0.25, impact: 'negative', description: 'No active subscription' });
        churnRisk += 20;
      } else {
        factors.push({ factor: 'subscription_status', weight: 0.25, impact: 'positive', description: 'Active subscription' });
        churnRisk -= 5;
      }

      // Factor 3: Hiring success
      const filledJobs = jobs.filter(j => j.status === 'filled').length;
      const fillRate = jobs.length > 0 ? (filledJobs / jobs.length) * 100 : 0;
      
      if (fillRate < 20 && jobs.length > 5) {
        factors.push({ factor: 'hiring_success', weight: 0.25, impact: 'negative', description: 'Low job fill rate' });
        churnRisk += 15;
      } else if (fillRate > 50) {
        factors.push({ factor: 'hiring_success', weight: 0.25, impact: 'positive', description: 'Good hiring success' });
        churnRisk -= 10;
      }

      // Factor 4: Engagement
      const recentReferrals = referrals.filter(r => 
        new Date(r.createdAt) > new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
      );
      if (recentReferrals.length === 0 && jobs.length > 0) {
        factors.push({ factor: 'platform_engagement', weight: 0.2, impact: 'negative', description: 'No recent referrals' });
        churnRisk += 10;
      }

      churnRisk = Math.max(0, Math.min(100, churnRisk));

      const result = {
        companyId,
        churnRisk,
        riskLevel: churnRisk > 70 ? 'high' : churnRisk > 40 ? 'medium' : 'low',
        factors,
        metrics: {
          totalJobs: jobs.length,
          recentJobs: recentJobs.length,
          fillRate,
          hasActiveSubscription: hasActiveSub,
          recentReferrals: recentReferrals.length,
        },
        recommendations: this.generateChurnRecommendations(churnRisk, factors),
        modelVersion: this.modelVersion,
      };

      // Store insight
      await this.storeInsight('company_churn_prediction', companyId, 'company', {
        prediction: { value: churnRisk > 50, probability: churnRisk, confidence: 70 },
        riskLevel: result.riskLevel,
        factors,
      });

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error predicting company churn:', error);
      throw error;
    }
  }

  generateChurnRecommendations(churnRisk, factors) {
    const recommendations = [];
    
    if (churnRisk > 70) {
      recommendations.push('Immediate outreach recommended - schedule account review call');
    }
    
    const jobFactor = factors.find(f => f.factor === 'job_activity');
    if (jobFactor?.impact === 'negative') {
      recommendations.push('Encourage job postings with promotional incentives');
    }
    
    const subFactor = factors.find(f => f.factor === 'subscription_status');
    if (subFactor?.impact === 'negative') {
      recommendations.push('Offer subscription renewal discount');
    }
    
    const hiringFactor = factors.find(f => f.factor === 'hiring_success');
    if (hiringFactor?.impact === 'negative') {
      recommendations.push('Provide recruitment strategy consultation');
    }
    
    return recommendations;
  }

  // ==================== MARKET TRENDS ANALYSIS ====================

  /**
   * Analyze market trends
   * @param {Object} filters - Analysis filters
   * @returns {Promise<Object>} Market trends
   */
  async analyzeMarketTrends(filters = {}) {
    const { location, industry, period = 'monthly' } = filters;
    
    const cacheKey = this.getCacheKey('market_trends', filters);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Get latest market trend
      const trend = await MarketTrend.getLatest('job_volume', { location, industry });
      
      if (!trend) {
        // Generate new trend snapshot
        return this.generateMarketTrendSnapshot(filters);
      }

      // Get skill demands
      const topSkills = await MarketTrend.getTopSkills(location, industry, 10);
      
      // Get industry comparison
      const industries = ['IT', 'Finance', 'Manufacturing', 'Retail', 'Healthcare', 'Education'];
      const industryComparison = await MarketTrend.getIndustryComparison(industries);

      const result = {
        period: trend.period,
        periodStart: trend.periodStart,
        periodEnd: trend.periodEnd,
        location,
        industry,
        metrics: trend.metrics,
        analysis: trend.analysis,
        topSkills,
        industryComparison,
        predictions: trend.predictions,
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error analyzing market trends:', error);
      throw error;
    }
  }

  async generateMarketTrendSnapshot(filters) {
    const { location, industry } = filters;
    
    // Aggregate job data
    const jobQuery = { status: 'active' };
    if (location) jobQuery['location.city'] = location;
    if (industry) jobQuery.category = industry;
    
    const jobs = await Job.find(jobQuery);
    const applications = await Application.find({
      jobId: { $in: jobs.map(j => j._id) },
    });

    // Calculate metrics
    const metrics = {
      totalJobs: jobs.length,
      activeJobs: jobs.filter(j => j.status === 'active').length,
      totalApplications: applications.length,
      avgApplicationsPerJob: jobs.length > 0 ? applications.length / jobs.length : 0,
    };

    // Extract top skills
    const skillCounts = {};
    jobs.forEach(job => {
      (job.skills || []).forEach(skill => {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      });
    });
    
    const topSkills = Object.entries(skillCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skill, count]) => ({
        skill,
        demandScore: Math.min(100, count * 10),
        jobCount: count,
      }));

    return {
      period: 'monthly',
      periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      periodEnd: new Date(),
      location,
      industry,
      metrics,
      topSkills,
      analysis: {
        trend: metrics.totalJobs > 50 ? 'growth' : 'stable',
        growthRate: 0,
        confidence: 60,
      },
      isGenerated: true,
    };
  }

  // ==================== INSIGHT GENERATION ====================

  /**
   * Store insight
   * @param {string} type - Insight type
   * @param {string} targetId - Target ID
   * @param {string} targetType - Target type
   * @param {Object} data - Insight data
   * @returns {Promise<Object>} Created insight
   */
  async storeInsight(type, targetId, targetType, data) {
    try {
      const insight = await AnalyticsInsight.create({
        type,
        targetId,
        targetType,
        prediction: data.prediction || { value: data.probability || data.score, confidence: data.confidence || 70, factors: data.factors || [] },
        title: this.generateInsightTitle(type, data),
        description: data.recommendation || data.description || '',
        recommendation: data.recommendation || '',
        riskLevel: data.riskLevel,
        modelVersion: this.modelVersion,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });
      
      return insight;
    } catch (error) {
      console.error('Error storing insight:', error);
      // Don't throw - insight storage is non-critical
      return null;
    }
  }

  generateInsightTitle(type, data) {
    const titles = {
      candidate_hire_prediction: `Hire Probability: ${data.classification?.replace(/_/g, ' ')}`,
      company_churn_prediction: `Churn Risk: ${data.riskLevel}`,
      salary_benchmark: 'Salary Benchmark Analysis',
      hiring_velocity: 'Hiring Timeline Prediction',
      referrer_success_prediction: 'Referrer Performance Prediction',
    };
    return titles[type] || 'AI Insight';
  }

  // ==================== UTILITY METHODS ====================

  calculateConfidence(factors) {
    // Higher confidence with more factors and positive impacts
    const factorCount = factors.length;
    const positiveFactors = factors.filter(f => f.impact === 'positive').length;
    
    let confidence = 50;
    confidence += factorCount * 5;
    confidence += positiveFactors * 5;
    
    return Math.min(95, confidence);
  }

  calculateMedian(values) {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Get engine statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      cacheSize: cache.size,
      modelVersion: this.modelVersion,
      cacheTtl: CACHE_TTL,
    };
  }

  /**
   * Clear all caches
   */
  clearAllCaches() {
    this.clearCache();
  }
}

// Export singleton instance
const insightEngine = new InsightEngine();
module.exports = InsightEngine;
