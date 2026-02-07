/**
 * MatchingEngine Service
 * AI-powered job-candidate matching algorithm
 * Calculates compatibility ratings based on multiple factors
 */

const { User, Job, MatchScore, Referral, Application, ReferralNetwork } = require('../models/index.js');
const { sendNotification } = require('./notificationService.js');
const { NOTIFICATION_TYPES, NOTIFICATION_PRIORITY, NOTIFICATION_CHANNELS } = require('../models/Notification.js');

// Default weights for scoring factors
const DEFAULT_WEIGHTS = {
  skills: 0.30,
  experience: 0.25,
  location: 0.15,
  salary: 0.15,
  candidateQuality: 0.10,
  referrerNetwork: 0.05,
};

// Experience level mapping (years)
const EXPERIENCE_LEVELS = {
  entry: { min: 0, max: 2 },
  mid: { min: 2, max: 5 },
  senior: { min: 5, max: 10 },
  lead: { min: 8, max: 15 },
  executive: { min: 10, max: 50 },
};

// Tier quality multipliers
const TIER_MULTIPLIERS = {
  bronze: 1.0,
  silver: 1.1,
  gold: 1.2,
  platinum: 1.3,
};

/**
 * MatchingEngine Service Class
 */
class MatchingEngine {
  constructor() {
    this.weights = { ...DEFAULT_WEIGHTS };
  }

  /**
   * Set custom weights for scoring
   * @param {Object} weights - Custom weights
   */
  setWeights(weights) {
    this.weights = { ...this.weights, ...weights };
    // Normalize weights to ensure they sum to 1
    const total = Object.values(this.weights).reduce((sum, w) => sum + w, 0);
    if (total !== 1) {
      Object.keys(this.weights).forEach(key => {
        this.weights[key] = this.weights[key] / total;
      });
    }
  }

  /**
   * Calculate match score for a job-candidate pair
   * @param {string} jobId - Job ID
   * @param {string} candidateId - Candidate ID
   * @returns {Promise<Object>} Match score result
   */
  async calculateMatchScore(jobId, candidateId) {
    try {
      // Fetch job and candidate data
      const [job, candidate] = await Promise.all([
        Job.findById(jobId).populate('companyId', 'name'),
        User.findById(candidateId),
      ]);

      if (!job) {
        throw new Error('Job not found');
      }

      if (!candidate) {
        throw new Error('Candidate not found');
      }

      // Calculate individual factor scores
      const factorScores = await this.calculateFactorScores(job, candidate);

      // Calculate overall score
      const overallScore = this.calculateOverallScore(factorScores);

      // Prepare match score data
      const matchScoreData = {
        jobId: job._id,
        candidateId: candidate._id,
        companyId: job.companyId._id || job.companyId,
        overallScore: Math.round(overallScore),
        isPerfectMatch: overallScore >= 90,
        factorScores: {
          skillsMatch: Math.round(factorScores.skills),
          experienceMatch: Math.round(factorScores.experience),
          locationMatch: Math.round(factorScores.location),
          salaryMatch: Math.round(factorScores.salary),
          candidateQuality: Math.round(factorScores.candidateQuality),
          referrerNetworkQuality: Math.round(factorScores.referrerNetwork),
        },
        weights: {
          skillsWeight: this.weights.skills,
          experienceWeight: this.weights.experience,
          locationWeight: this.weights.location,
          salaryWeight: this.weights.salary,
          candidateQualityWeight: this.weights.candidateQuality,
          referrerNetworkWeight: this.weights.referrerNetwork,
        },
        matchedSkills: factorScores.matchedSkills,
        missingSkills: factorScores.missingSkills,
        skillMatchPercentage: factorScores.skillMatchPercentage,
        candidateQualitySnapshot: factorScores.candidateQualitySnapshot,
        jobRequirementsSnapshot: {
          requiredSkills: job.skills || [],
          experienceLevel: job.experienceLevel,
          locationType: job.location?.type,
          salaryMin: job.salary?.min,
          salaryMax: job.salary?.max,
        },
        algorithmVersion: '1.0.0',
        calculatedAt: new Date(),
      };

      // Save or update match score
      const matchScore = await MatchScore.getOrCreate(jobId, candidateId, matchScoreData);

      return {
        success: true,
        matchScore: matchScore,
        factorScores: matchScoreData.factorScores,
        overallScore: matchScoreData.overallScore,
        isPerfectMatch: matchScoreData.isPerfectMatch,
      };
    } catch (error) {
      console.error('Error calculating match score:', error);
      throw error;
    }
  }

  /**
   * Calculate individual factor scores
   * @param {Object} job - Job document
   * @param {Object} candidate - Candidate document
   * @returns {Promise<Object>} Factor scores
   */
  async calculateFactorScores(job, candidate) {
    const [
      skillsScore,
      experienceScore,
      locationScore,
      salaryScore,
      candidateQualityScore,
      referrerNetworkScore,
    ] = await Promise.all([
      this.calculateSkillsMatch(job, candidate),
      this.calculateExperienceMatch(job, candidate),
      this.calculateLocationMatch(job, candidate),
      this.calculateSalaryMatch(job, candidate),
      this.calculateCandidateQuality(candidate),
      this.calculateReferrerNetworkQuality(candidate),
    ]);

    return {
      skills: skillsScore.score,
      matchedSkills: skillsScore.matched,
      missingSkills: skillsScore.missing,
      skillMatchPercentage: skillsScore.percentage,
      experience: experienceScore,
      location: locationScore,
      salary: salaryScore,
      candidateQuality: candidateQualityScore.overall,
      candidateQualitySnapshot: candidateQualityScore.snapshot,
      referrerNetwork: referrerNetworkScore,
    };
  }

  /**
   * Calculate skills match score
   * @param {Object} job - Job document
   * @param {Object} candidate - Candidate document
   * @returns {Object} Skills match result
   */
  calculateSkillsMatch(job, candidate) {
    const jobSkills = (job.skills || []).map(s => s.toLowerCase().trim());
    const candidateSkills = (candidate.jobseekerProfile?.skills || []).map(s => s.toLowerCase().trim());

    if (jobSkills.length === 0) {
      return { score: 100, matched: [], missing: [], percentage: 100 };
    }

    if (candidateSkills.length === 0) {
      return { score: 0, matched: [], missing: jobSkills, percentage: 0 };
    }

    const matched = [];
    const missing = [];

    jobSkills.forEach(skill => {
      // Check for exact match or partial match
      const hasMatch = candidateSkills.some(cs => 
        cs === skill || cs.includes(skill) || skill.includes(cs)
      );
      
      if (hasMatch) {
        matched.push(skill);
      } else {
        missing.push(skill);
      }
    });

    const percentage = (matched.length / jobSkills.length) * 100;
    
    // Score calculation with bonus for exceeding requirements
    let score = percentage;
    const extraSkills = candidateSkills.filter(cs => 
      !jobSkills.some(js => js === cs || cs.includes(js) || js.includes(cs))
    );
    
    // Bonus for additional relevant skills (up to 10 points)
    const bonus = Math.min(extraSkills.length * 2, 10);
    score = Math.min(score + bonus, 100);

    return {
      score,
      matched,
      missing,
      percentage,
      extraSkills,
    };
  }

  /**
   * Calculate experience level match
   * @param {Object} job - Job document
   * @param {Object} candidate - Candidate document
   * @returns {number} Experience match score
   */
  calculateExperienceMatch(job, candidate) {
    const jobLevel = job.experienceLevel;
    const candidateExperience = candidate.jobseekerProfile?.experience || '';

    if (!jobLevel) {
      return 100; // No requirement specified
    }

    // Parse years of experience from candidate profile
    const yearsMatch = candidateExperience.match(/(\d+)\+?\s*(?:years?|yrs?)/i);
    const candidateYears = yearsMatch ? parseInt(yearsMatch[1]) : 0;

    const requiredRange = EXPERIENCE_LEVELS[jobLevel];
    if (!requiredRange) {
      return 100;
    }

    // Calculate match based on years
    if (candidateYears >= requiredRange.min && candidateYears <= requiredRange.max) {
      return 100;
    } else if (candidateYears > requiredRange.max) {
      // Overqualified - slight penalty but still good
      return 85;
    } else if (candidateYears >= requiredRange.min - 1) {
      // Close to requirement
      return 75;
    } else if (candidateYears >= requiredRange.min - 2) {
      // Somewhat close
      return 50;
    } else {
      // Far from requirement
      return Math.max(20, (candidateYears / requiredRange.min) * 50);
    }
  }

  /**
   * Calculate location match score
   * @param {Object} job - Job document
   * @param {Object} candidate - Candidate document
   * @returns {number} Location match score
   */
  calculateLocationMatch(job, candidate) {
    const jobLocation = job.location;
    
    if (!jobLocation) {
      return 100;
    }

    // Remote jobs match everyone
    if (jobLocation.type === 'remote') {
      return 100;
    }

    // For now, return a neutral score since we don't have candidate location data
    // This can be enhanced with candidate location preferences
    if (jobLocation.type === 'hybrid') {
      return 80;
    }

    // Onsite jobs require location match (placeholder logic)
    return 60;
  }

  /**
   * Calculate salary match score
   * @param {Object} job - Job document
   * @param {Object} candidate - Candidate document
   * @returns {number} Salary match score
   */
  calculateSalaryMatch(job, candidate) {
    const jobSalary = job.salary;
    
    if (!jobSalary || (!jobSalary.min && !jobSalary.max)) {
      return 100; // No salary specified
    }

    // For now, return neutral score since we don't have candidate salary expectations
    // This can be enhanced with candidate salary preferences
    return 70;
  }

  /**
   * Calculate candidate quality score
   * @param {Object} candidate - Candidate document
   * @returns {Object} Quality score and snapshot
   */
  async calculateCandidateQuality(candidate) {
    const profile = candidate.jobseekerProfile || {};
    const referrerProfile = candidate.referrerProfile || {};

    // Profile completeness (0-100)
    const profileCompleteness = this.calculateProfileCompleteness(candidate);

    // Past success rate
    const totalReferrals = referrerProfile.totalReferrals || 0;
    const successfulHires = referrerProfile.successfulHires || 0;
    const pastSuccessRate = totalReferrals > 0 
      ? (successfulHires / totalReferrals) * 100 
      : 50; // Neutral for new candidates

    // Calculate overall quality score
    const overall = Math.round(
      (profileCompleteness * 0.4) + 
      (pastSuccessRate * 0.4) + 
      (this.getTierScore(referrerProfile.tierLevel) * 0.2)
    );

    return {
      overall,
      snapshot: {
        profileCompleteness,
        pastSuccessRate: Math.round(pastSuccessRate),
        totalReferrals,
        successfulHires,
        referrerTier: referrerProfile.tierLevel || 'bronze',
        networkSize: referrerProfile.networkSize || 0,
      },
    };
  }

  /**
   * Calculate profile completeness percentage
   * @param {Object} candidate - Candidate document
   * @returns {number} Completeness percentage
   */
  calculateProfileCompleteness(candidate) {
    const profile = candidate.jobseekerProfile || {};
    
    const fields = [
      { name: 'resume', weight: 20 },
      { name: 'skills', weight: 25, check: () => (profile.skills || []).length > 0 },
      { name: 'experience', weight: 20 },
      { name: 'education', weight: 15 },
      { name: 'portfolioUrl', weight: 10 },
      { name: 'linkedInUrl', weight: 10 },
    ];

    let completeness = 0;
    fields.forEach(field => {
      if (field.check) {
        if (field.check()) completeness += field.weight;
      } else if (profile[field.name]) {
        completeness += field.weight;
      }
    });

    return Math.min(completeness, 100);
  }

  /**
   * Get tier quality score
   * @param {string} tier - Tier level
   * @returns {number} Tier score
   */
  getTierScore(tier) {
    const tierScores = {
      bronze: 50,
      silver: 65,
      gold: 80,
      platinum: 95,
    };
    return tierScores[tier] || 50;
  }

  /**
   * Calculate referrer network quality score
   * @param {Object} candidate - Candidate document
   * @returns {number} Network quality score
   */
  async calculateReferrerNetworkQuality(candidate) {
    const referrerProfile = candidate.referrerProfile;
    
    if (!referrerProfile) {
      return 50; // Neutral score for non-referrers
    }

    const tier = referrerProfile.tierLevel || 'bronze';
    const networkSize = referrerProfile.networkSize || 0;
    const directReferrals = referrerProfile.directReferrals || 0;

    // Base score from tier
    let score = this.getTierScore(tier);

    // Bonus for network size
    if (networkSize >= 100) score += 15;
    else if (networkSize >= 50) score += 10;
    else if (networkSize >= 20) score += 5;

    // Bonus for direct referrals
    if (directReferrals >= 20) score += 10;
    else if (directReferrals >= 10) score += 5;
    else if (directReferrals >= 5) score += 2;

    return Math.min(score, 100);
  }

  /**
   * Calculate overall match score from factor scores
   * @param {Object} factorScores - Individual factor scores
   * @returns {number} Overall score (0-100)
   */
  calculateOverallScore(factorScores) {
    const weightedScore = 
      (factorScores.skills * this.weights.skills) +
      (factorScores.experience * this.weights.experience) +
      (factorScores.location * this.weights.location) +
      (factorScores.salary * this.weights.salary) +
      (factorScores.candidateQuality * this.weights.candidateQuality) +
      (factorScores.referrerNetwork * this.weights.referrerNetwork);

    return Math.min(Math.round(weightedScore), 100);
  }

  /**
   * Get top matching candidates for a job
   * @param {string} jobId - Job ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Top candidates
   */
  async getTopCandidatesForJob(jobId, options = {}) {
    const { limit = 5, minScore = 0, recalculate = false } = options;

    try {
      // Optionally recalculate scores for all candidates
      if (recalculate) {
        await this.batchCalculateForJob(jobId);
      }

      // Get top candidates from database
      const topMatches = await MatchScore.findTopCandidatesForJob(jobId, limit, minScore);

      return topMatches.map(match => ({
        candidate: match.candidateId,
        matchScore: match.overallScore,
        isPerfectMatch: match.isPerfectMatch,
        factorScores: match.factorScores,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        skillMatchPercentage: match.skillMatchPercentage,
        matchQuality: match.matchQuality,
      }));
    } catch (error) {
      console.error('Error getting top candidates:', error);
      throw error;
    }
  }

  /**
   * Get top matching jobs for a candidate
   * @param {string} candidateId - Candidate ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Top jobs
   */
  async getTopJobsForCandidate(candidateId, options = {}) {
    const { limit = 10, minScore = 0, recalculate = false } = options;

    try {
      // Optionally recalculate scores for all active jobs
      if (recalculate) {
        await this.batchCalculateForCandidate(candidateId);
      }

      // Get top jobs from database
      const topMatches = await MatchScore.findTopJobsForCandidate(candidateId, limit, minScore);

      return topMatches.map(match => ({
        job: match.jobId,
        company: match.companyId,
        matchScore: match.overallScore,
        isPerfectMatch: match.isPerfectMatch,
        factorScores: match.factorScores,
        matchedSkills: match.matchedSkills,
        matchQuality: match.matchQuality,
      }));
    } catch (error) {
      console.error('Error getting top jobs:', error);
      throw error;
    }
  }

  /**
   * Get suggestions for a referrer
   * @param {string} referrerId - Referrer ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Suggested candidates
   */
  async getSuggestionsForReferrer(referrerId, options = {}) {
    const { limit = 5, jobId = null } = options;

    try {
      // Get referrer's network
      const network = await ReferralNetwork.getDownline(referrerId, 2);
      const networkIds = network.map(n => n.descendantId._id.toString());

      // Find high-quality candidates in referrer's network
      const suggestions = await MatchScore.findSuggestionsForReferrer(referrerId, {
        limit,
        minScore: 60,
        jobId,
      });

      // Enhance suggestions with network info
      return suggestions.map(match => ({
        candidate: match.candidateId,
        job: match.jobId,
        company: match.companyId,
        matchScore: match.overallScore,
        isPerfectMatch: match.isPerfectMatch,
        factorScores: match.factorScores,
        inNetwork: networkIds.includes(match.candidateId._id.toString()),
        networkDistance: network.find(n => 
          n.descendantId._id.toString() === match.candidateId._id.toString()
        )?.depth || null,
        potentialBonus: match.jobId.referralBonus,
      }));
    } catch (error) {
      console.error('Error getting referrer suggestions:', error);
      throw error;
    }
  }

  /**
   * Find and notify perfect matches
   * @param {string} jobId - Job ID (optional)
   * @returns {Promise<Object>} Notification results
   */
  async findAndNotifyPerfectMatches(jobId = null) {
    try {
      const perfectMatches = await MatchScore.findUnnotifiedPerfectMatches(jobId);
      const results = {
        notified: [],
        failed: [],
      };

      for (const match of perfectMatches) {
        try {
          // Send instant match alert
          await this.sendInstantMatchAlert(match);
          
          // Mark as notified
          await match.addNotification('instant_match_alert');
          
          results.notified.push({
            matchId: match._id,
            candidateId: match.candidateId._id,
            jobId: match.jobId._id,
            score: match.overallScore,
          });
        } catch (error) {
          results.failed.push({
            matchId: match._id,
            error: error.message,
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error finding and notifying perfect matches:', error);
      throw error;
    }
  }

  /**
   * Send instant match alert notification
   * @param {Object} match - MatchScore document
   * @returns {Promise<void>}
   */
  async sendInstantMatchAlert(match) {
    const { candidateId, jobId, companyId, overallScore } = match;

    // Notify candidate
    await sendNotification({
      userId: candidateId._id,
      type: 'INSTANT_MATCH',
      title: '🎯 Perfect Job Match Found!',
      message: `You're a ${overallScore}% match for ${jobId.title} at ${companyId.name}!`,
      priority: NOTIFICATION_PRIORITY.HIGH,
      channels: [NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.EMAIL],
      relatedEntity: { type: 'match', id: match._id },
      deepLink: `/jobs/${jobId._id}`,
      data: {
        matchScore: overallScore,
        jobTitle: jobId.title,
        companyName: companyId.name,
        matchedSkills: match.matchedSkills,
      },
    });

    // Notify job poster/recruiters
    const recruiters = await User.find({
      role: { $in: ['corporate_recruiter', 'corporate_admin'] },
      status: 'active',
    }).select('_id');

    for (const recruiter of recruiters) {
      await sendNotification({
        userId: recruiter._id,
        type: 'PERFECT_CANDIDATE',
        title: '⭐ Perfect Candidate Found!',
        message: `${candidateId.name} is a ${overallScore}% match for ${jobId.title}`,
        priority: NOTIFICATION_PRIORITY.HIGH,
        channels: [NOTIFICATION_CHANNELS.IN_APP],
        relatedEntity: { type: 'match', id: match._id },
        deepLink: `/candidates/${candidateId._id}`,
        data: {
          matchScore: overallScore,
          candidateName: candidateId.name,
          jobTitle: jobId.title,
        },
      });
    }
  }

  /**
   * Send suggestions to referrer
   * @param {string} referrerId - Referrer ID
   * @param {string} jobId - Job ID (optional)
   * @returns {Promise<Object>} Results
   */
  async sendSuggestionsToReferrer(referrerId, jobId = null) {
    try {
      const suggestions = await this.getSuggestionsForReferrer(referrerId, { 
        limit: 5, 
        jobId 
      });

      if (suggestions.length === 0) {
        return { sent: 0, message: 'No suggestions available' };
      }

      // Group by job
      const byJob = suggestions.reduce((acc, s) => {
        const key = s.job._id.toString();
        if (!acc[key]) acc[key] = [];
        acc[key].push(s);
        return acc;
      }, {});

      // Send notification
      const jobCount = Object.keys(byJob).length;
      const candidateCount = suggestions.length;

      await sendNotification({
        userId: referrerId,
        type: 'CANDIDATE_SUGGESTIONS',
        title: '💡 Candidate Suggestions for You',
        message: `We found ${candidateCount} high-quality candidates matching your jobs.`,
        priority: NOTIFICATION_PRIORITY.NORMAL,
        channels: [NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.EMAIL],
        data: {
          suggestions: suggestions.map(s => ({
            candidateName: s.candidate.name,
            jobTitle: s.job.title,
            matchScore: s.matchScore,
            potentialBonus: s.potentialBonus,
          })),
        },
      });

      // Mark suggestions as notified
      for (const suggestion of suggestions) {
        const matchScore = await MatchScore.findOne({
          jobId: suggestion.job._id,
          candidateId: suggestion.candidate._id,
        });
        if (matchScore) {
          await matchScore.addNotification('suggestion_to_referrer', referrerId);
        }
      }

      return {
        sent: candidateCount,
        jobs: jobCount,
        suggestions,
      };
    } catch (error) {
      console.error('Error sending suggestions to referrer:', error);
      throw error;
    }
  }

  /**
   * Batch calculate match scores for a job
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Calculation results
   */
  async batchCalculateForJob(jobId) {
    try {
      // Get job details
      const job = await Job.findById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      // Get all active candidates
      const candidates = await User.find({
        role: 'job_seeker',
        status: 'active',
      }).select('_id');

      const results = {
        processed: 0,
        perfectMatches: 0,
        errors: [],
      };

      // Calculate scores in batches
      const batchSize = 50;
      for (let i = 0; i < candidates.length; i += batchSize) {
        const batch = candidates.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (candidate) => {
          try {
            const result = await this.calculateMatchScore(jobId, candidate._id);
            results.processed++;
            
            if (result.isPerfectMatch) {
              results.perfectMatches++;
            }
          } catch (error) {
            results.errors.push({
              candidateId: candidate._id,
              error: error.message,
            });
          }
        }));
      }

      return results;
    } catch (error) {
      console.error('Error in batch calculation:', error);
      throw error;
    }
  }

  /**
   * Batch calculate match scores for a candidate
   * @param {string} candidateId - Candidate ID
   * @returns {Promise<Object>} Calculation results
   */
  async batchCalculateForCandidate(candidateId) {
    try {
      // Get candidate details
      const candidate = await User.findById(candidateId);
      if (!candidate) {
        throw new Error('Candidate not found');
      }

      // Get all active jobs
      const jobs = await Job.find({
        status: 'active',
      }).select('_id');

      const results = {
        processed: 0,
        perfectMatches: 0,
        errors: [],
      };

      // Calculate scores in batches
      const batchSize = 50;
      for (let i = 0; i < jobs.length; i += batchSize) {
        const batch = jobs.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (job) => {
          try {
            const result = await this.calculateMatchScore(job._id, candidateId);
            results.processed++;
            
            if (result.isPerfectMatch) {
              results.perfectMatches++;
            }
          } catch (error) {
            results.errors.push({
              jobId: job._id,
              error: error.message,
            });
          }
        }));
      }

      return results;
    } catch (error) {
      console.error('Error in batch calculation:', error);
      throw error;
    }
  }

  /**
   * Get match statistics for a job
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Statistics
   */
  async getJobMatchStats(jobId) {
    return MatchScore.getJobMatchStats(jobId);
  }

  /**
   * Get candidate's match statistics
   * @param {string} candidateId - Candidate ID
   * @returns {Promise<Object>} Statistics
   */
  async getCandidateMatchStats(candidateId) {
    return MatchScore.getCandidateMatchStats(candidateId);
  }

  /**
   * Recalculate all match scores (maintenance)
   * @returns {Promise<Object>} Results
   */
  async recalculateAll() {
    try {
      // Get all active jobs
      const jobs = await Job.find({ status: 'active' }).select('_id');
      
      const results = {
        jobsProcessed: 0,
        totalMatches: 0,
        perfectMatches: 0,
        errors: [],
      };

      for (const job of jobs) {
        try {
          const batchResult = await this.batchCalculateForJob(job._id);
          results.jobsProcessed++;
          results.totalMatches += batchResult.processed;
          results.perfectMatches += batchResult.perfectMatches;
          results.errors.push(...batchResult.errors);
        } catch (error) {
          results.errors.push({
            jobId: job._id,
            error: error.message,
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error recalculating all scores:', error);
      throw error;
    }
  }
}

// Export singleton instance
const matchingEngine = new MatchingEngine();

// Export individual functions for convenience
const calculateMatchScore = (jobId, candidateId) => 
  matchingEngine.calculateMatchScore(jobId, candidateId);

const getTopCandidatesForJob = (jobId, options) => 
  matchingEngine.getTopCandidatesForJob(jobId, options);

const getTopJobsForCandidate = (candidateId, options) => 
  matchingEngine.getTopJobsForCandidate(candidateId, options);

const getSuggestionsForReferrer = (referrerId, options) => 
  matchingEngine.getSuggestionsForReferrer(referrerId, options);

const findAndNotifyPerfectMatches = (jobId) => 
  matchingEngine.findAndNotifyPerfectMatches(jobId);

const sendSuggestionsToReferrer = (referrerId, jobId) => 
  matchingEngine.sendSuggestionsToReferrer(referrerId, jobId);

module.exports = matchingEngine;
