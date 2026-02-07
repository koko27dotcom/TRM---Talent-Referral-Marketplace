const PredictiveModel = require('../models/PredictiveModel');
const Job = require('../models/Job');
const User = require('../models/User');
const Application = require('../models/Application');
const Company = require('../models/Company');
const crypto = require('crypto');

class PredictiveAnalyticsService {
  // Generate unique model ID
  static generateModelId() {
    return 'MDL-' + crypto.randomBytes(6).toString('hex').toUpperCase();
  }

  // Predict candidate hire probability
  static async predictHireProbability(candidateProfile, jobId) {
    try {
      const startTime = Date.now();
      
      // Get job details
      const job = await Job.findById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      // Calculate feature scores
      const features = this.calculateHireProbabilityFeatures(candidateProfile, job);
      
      // Get active model
      const model = await PredictiveModel.getActiveModel('hire-probability');
      
      // Calculate probability score (simplified - in production use actual ML model)
      const probability = this.calculateHireProbabilityScore(features);
      
      // Record model usage
      if (model) {
        await model.recordUsage(Date.now() - startTime);
      }

      return {
        probability: Math.round(probability * 100) / 100,
        confidence: this.calculateConfidence(features),
        features,
        factors: this.getHireProbabilityFactors(features),
        modelVersion: model?.version || '1.0.0'
      };
    } catch (error) {
      throw new Error(`Failed to predict hire probability: ${error.message}`);
    }
  }

  // Calculate hire probability features
  static calculateHireProbabilityFeatures(candidate, job) {
    const features = {
      skillsMatch: 0,
      experienceMatch: 0,
      educationMatch: 0,
      locationMatch: 0,
      salaryFit: 0,
      applicationQuality: 0
    };

    // Skills match
    if (candidate.skills && job.skills) {
      const candidateSkills = candidate.skills.map(s => s.toLowerCase());
      const jobSkills = job.skills.map(s => s.toLowerCase());
      const matchedSkills = jobSkills.filter(s => candidateSkills.includes(s));
      features.skillsMatch = matchedSkills.length / jobSkills.length;
    }

    // Experience match
    if (candidate.experience && job.experienceLevel) {
      const expYears = this.parseExperienceYears(candidate.experience);
      features.experienceMatch = this.calculateExperienceFit(expYears, job.experienceLevel);
    }

    // Location match
    if (candidate.location && job.location) {
      features.locationMatch = candidate.location.toLowerCase() === job.location.toLowerCase() ? 1 : 0.5;
    }

    // Salary fit
    if (candidate.expectedSalary && job.salary) {
      const expected = candidate.expectedSalary;
      const jobMax = job.salary.max;
      const jobMin = job.salary.min;
      
      if (expected >= jobMin && expected <= jobMax) {
        features.salaryFit = 1;
      } else if (expected < jobMin) {
        features.salaryFit = 0.8;
      } else {
        features.salaryFit = Math.max(0, 1 - (expected - jobMax) / jobMax);
      }
    }

    // Application quality (based on completeness)
    if (candidate.profileCompleteness) {
      features.applicationQuality = candidate.profileCompleteness / 100;
    }

    return features;
  }

  // Calculate hire probability score
  static calculateHireProbabilityScore(features) {
    const weights = {
      skillsMatch: 0.35,
      experienceMatch: 0.25,
      educationMatch: 0.10,
      locationMatch: 0.10,
      salaryFit: 0.15,
      applicationQuality: 0.05
    };

    let score = 0;
    for (const [feature, weight] of Object.entries(weights)) {
      score += (features[feature] || 0) * weight;
    }

    return Math.min(Math.max(score * 100, 0), 100);
  }

  // Get hire probability factors
  static getHireProbabilityFactors(features) {
    const factors = [];

    if (features.skillsMatch > 0.8) {
      factors.push({ type: 'positive', factor: 'Strong skills match', impact: 'high' });
    } else if (features.skillsMatch < 0.4) {
      factors.push({ type: 'negative', factor: 'Limited skills match', impact: 'high' });
    }

    if (features.experienceMatch > 0.8) {
      factors.push({ type: 'positive', factor: 'Experience level matches requirements', impact: 'medium' });
    }

    if (features.salaryFit > 0.9) {
      factors.push({ type: 'positive', factor: 'Salary expectations align', impact: 'medium' });
    } else if (features.salaryFit < 0.5) {
      factors.push({ type: 'negative', factor: 'Salary expectations may not align', impact: 'medium' });
    }

    if (features.locationMatch === 1) {
      factors.push({ type: 'positive', factor: 'Location matches', impact: 'low' });
    }

    return factors;
  }

  // Predict employee retention risk
  static async predictRetentionRisk(employeeData) {
    try {
      const startTime = Date.now();
      
      // Calculate feature scores
      const features = this.calculateRetentionFeatures(employeeData);
      
      // Get active model
      const model = await PredictiveModel.getActiveModel('retention');
      
      // Calculate risk score
      const riskScore = this.calculateRetentionRiskScore(features);
      
      // Record model usage
      if (model) {
        await model.recordUsage(Date.now() - startTime);
      }

      return {
        riskScore: Math.round(riskScore * 100) / 100,
        riskLevel: this.getRiskLevel(riskScore),
        confidence: this.calculateConfidence(features),
        features,
        factors: this.getRetentionFactors(features),
        recommendations: this.getRetentionRecommendations(features),
        modelVersion: model?.version || '1.0.0'
      };
    } catch (error) {
      throw new Error(`Failed to predict retention risk: ${error.message}`);
    }
  }

  // Calculate retention features
  static calculateRetentionFeatures(employee) {
    const features = {
      tenure: 0,
      performanceScore: 0,
      salaryCompetitiveness: 0,
      promotionVelocity: 0,
      engagementScore: 0,
      marketOpportunity: 0
    };

    // Tenure (normalized to 0-1, higher is better)
    if (employee.joinDate) {
      const tenureMonths = (Date.now() - new Date(employee.joinDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
      features.tenure = Math.min(tenureMonths / 24, 1); // Normalize to 2 years
    }

    // Performance score
    if (employee.performanceRating) {
      features.performanceScore = employee.performanceRating / 5;
    }

    // Salary competitiveness
    if (employee.currentSalary && employee.marketSalary) {
      features.salaryCompetitiveness = employee.currentSalary / employee.marketSalary;
    }

    // Promotion velocity
    if (employee.lastPromotionDate && employee.joinDate) {
      const monthsSincePromotion = (Date.now() - new Date(employee.lastPromotionDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
      const totalTenure = (Date.now() - new Date(employee.joinDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
      features.promotionVelocity = totalTenure > 0 ? monthsSincePromotion / totalTenure : 0;
    }

    // Engagement score
    if (employee.engagementMetrics) {
      features.engagementScore = employee.engagementMetrics.overall / 100;
    }

    // Market opportunity (based on skills demand)
    if (employee.skills) {
      features.marketOpportunity = this.calculateMarketOpportunity(employee.skills);
    }

    return features;
  }

  // Calculate retention risk score
  static calculateRetentionRiskScore(features) {
    const riskFactors = {
      tenure: 1 - features.tenure, // Lower tenure = higher risk
      performanceScore: 1 - features.performanceScore, // Lower performance = higher risk
      salaryCompetitiveness: Math.max(0, 1 - features.salaryCompetitiveness), // Lower salary = higher risk
      promotionVelocity: features.promotionVelocity > 0.8 ? 0.3 : 0, // Stagnation risk
      engagementScore: 1 - features.engagementScore, // Lower engagement = higher risk
      marketOpportunity: features.marketOpportunity // Higher opportunity = higher risk
    };

    const weights = {
      tenure: 0.20,
      performanceScore: 0.15,
      salaryCompetitiveness: 0.25,
      promotionVelocity: 0.15,
      engagementScore: 0.15,
      marketOpportunity: 0.10
    };

    let riskScore = 0;
    for (const [factor, weight] of Object.entries(weights)) {
      riskScore += (riskFactors[factor] || 0) * weight;
    }

    return Math.min(Math.max(riskScore * 100, 0), 100);
  }

  // Get risk level
  static getRiskLevel(riskScore) {
    if (riskScore >= 70) return 'high';
    if (riskScore >= 40) return 'medium';
    return 'low';
  }

  // Get retention factors
  static getRetentionFactors(features) {
    const factors = [];

    if (features.salaryCompetitiveness < 0.9) {
      factors.push({ type: 'risk', factor: 'Below market salary', impact: 'high' });
    }

    if (features.engagementScore < 0.5) {
      factors.push({ type: 'risk', factor: 'Low engagement', impact: 'high' });
    }

    if (features.tenure < 0.3) {
      factors.push({ type: 'risk', factor: 'New employee (high flight risk)', impact: 'medium' });
    }

    if (features.promotionVelocity > 0.8) {
      factors.push({ type: 'risk', factor: 'Long time since last promotion', impact: 'medium' });
    }

    if (features.marketOpportunity > 0.7) {
      factors.push({ type: 'risk', factor: 'High market demand for skills', impact: 'medium' });
    }

    return factors;
  }

  // Get retention recommendations
  static getRetentionRecommendations(features) {
    const recommendations = [];

    if (features.salaryCompetitiveness < 0.9) {
      recommendations.push({
        priority: 'high',
        action: 'Salary review recommended',
        description: 'Current salary is below market rate'
      });
    }

    if (features.engagementScore < 0.5) {
      recommendations.push({
        priority: 'high',
        action: 'Engagement intervention',
        description: 'Schedule 1:1 to understand concerns'
      });
    }

    if (features.promotionVelocity > 0.8) {
      recommendations.push({
        priority: 'medium',
        action: 'Career development discussion',
        description: 'Discuss growth opportunities and promotion timeline'
      });
    }

    return recommendations;
  }

  // Predict salary range
  static async predictSalaryRange(role, experience, location, skills, companySize) {
    try {
      const startTime = Date.now();
      
      // Get market data for similar roles
      const marketData = await this.getSalaryMarketData(role, experience, location, companySize);
      
      // Calculate skill premiums
      const skillPremium = this.calculateSkillPremium(skills);
      
      // Get active model
      const model = await PredictiveModel.getActiveModel('salary');
      
      // Calculate predicted range
      const prediction = this.calculateSalaryPrediction(marketData, skillPremium, experience);
      
      // Record model usage
      if (model) {
        await model.recordUsage(Date.now() - startTime);
      }

      return {
        predictedRange: {
          min: Math.round(prediction.min),
          max: Math.round(prediction.max),
          median: Math.round(prediction.median)
        },
        confidence: prediction.confidence,
        marketComparison: {
          percentile25: marketData.p25,
          percentile50: marketData.p50,
          percentile75: marketData.p75
        },
        skillPremium: Math.round(skillPremium * 100),
        factors: prediction.factors,
        modelVersion: model?.version || '1.0.0'
      };
    } catch (error) {
      throw new Error(`Failed to predict salary range: ${error.message}`);
    }
  }

  // Get salary market data
  static async getSalaryMarketData(role, experience, location, companySize) {
    const matchStage = {
      status: 'active',
      title: new RegExp(role, 'i')
    };

    if (location) {
      matchStage.location = location;
    }

    const salaries = await Job.aggregate([
      { $match: matchStage },
      {
        $project: {
          avgSalary: { $avg: ['$salary.min', '$salary.max'] }
        }
      },
      { $sort: { avgSalary: 1 } }
    ]);

    const salaryValues = salaries.map(s => s.avgSalary).filter(s => s);
    
    return {
      p25: this.getPercentile(salaryValues, 25),
      p50: this.getPercentile(salaryValues, 50),
      p75: this.getPercentile(salaryValues, 75),
      p90: this.getPercentile(salaryValues, 90),
      count: salaryValues.length
    };
  }

  // Calculate skill premium
  static calculateSkillPremium(skills) {
    const premiumSkills = {
      'machine learning': 0.25,
      'ai': 0.25,
      'blockchain': 0.20,
      'cloud': 0.15,
      'devops': 0.15,
      'react': 0.10,
      'node.js': 0.10,
      'python': 0.10,
      'data science': 0.20,
      'cybersecurity': 0.18
    };

    let totalPremium = 0;
    let matchedSkills = 0;

    for (const skill of skills || []) {
      const skillLower = skill.toLowerCase();
      for (const [premiumSkill, premium] of Object.entries(premiumSkills)) {
        if (skillLower.includes(premiumSkill)) {
          totalPremium += premium;
          matchedSkills++;
          break;
        }
      }
    }

    return matchedSkills > 0 ? totalPremium / matchedSkills : 0;
  }

  // Calculate salary prediction
  static calculateSalaryPrediction(marketData, skillPremium, experience) {
    const baseSalary = marketData.p50 || 500000;
    const experienceMultiplier = this.getExperienceMultiplier(experience);
    
    const adjustedBase = baseSalary * experienceMultiplier * (1 + skillPremium);
    
    return {
      min: adjustedBase * 0.85,
      max: adjustedBase * 1.15,
      median: adjustedBase,
      confidence: marketData.count > 20 ? 'high' : marketData.count > 10 ? 'medium' : 'low',
      factors: [
        { factor: 'Market median', impact: baseSalary },
        { factor: 'Experience multiplier', impact: `${Math.round((experienceMultiplier - 1) * 100)}%` },
        { factor: 'Skill premium', impact: `${Math.round(skillPremium * 100)}%` }
      ]
    };
  }

  // Get experience multiplier
  static getExperienceMultiplier(experience) {
    const years = this.parseExperienceYears(experience);
    
    if (years < 1) return 0.7;
    if (years < 3) return 0.85;
    if (years < 5) return 1.0;
    if (years < 8) return 1.2;
    if (years < 12) return 1.4;
    return 1.6;
  }

  // Predict time-to-hire
  static async predictTimeToHire(jobData) {
    try {
      const startTime = Date.now();
      
      // Get historical time-to-hire data for similar roles
      const historicalData = await this.getHistoricalTimeToHire(jobData);
      
      // Calculate factors
      const factors = this.calculateTimeToHireFactors(jobData);
      
      // Get active model
      const model = await PredictiveModel.getActiveModel('time-to-hire');
      
      // Calculate prediction
      const prediction = this.calculateTimeToHirePrediction(historicalData, factors);
      
      // Record model usage
      if (model) {
        await model.recordUsage(Date.now() - startTime);
      }

      return {
        predictedDays: Math.round(prediction.days),
        range: {
          min: Math.round(prediction.days * 0.7),
          max: Math.round(prediction.days * 1.3)
        },
        confidence: prediction.confidence,
        factors: prediction.factors,
        historicalAverage: historicalData.average,
        modelVersion: model?.version || '1.0.0'
      };
    } catch (error) {
      throw new Error(`Failed to predict time-to-hire: ${error.message}`);
    }
  }

  // Get historical time-to-hire data
  static async getHistoricalTimeToHire(jobData) {
    const matchStage = {
      status: 'filled'
    };

    if (jobData.industry) {
      matchStage.industry = jobData.industry;
    }

    if (jobData.experienceLevel) {
      matchStage.experienceLevel = jobData.experienceLevel;
    }

    // This would typically query a TimeToHire model or calculate from job filled dates
    // For now, return sample data
    return {
      average: 30,
      median: 28,
      count: 100
    };
  }

  // Calculate time-to-hire factors
  static calculateTimeToHireFactors(jobData) {
    return {
      roleSeniority: this.getSeniorityFactor(jobData.experienceLevel),
      skillRarity: this.calculateSkillRarity(jobData.skills),
      locationFactor: this.getLocationFactor(jobData.location),
      salaryCompetitiveness: jobData.salaryCompetitiveness || 1.0,
      marketConditions: 1.0 // Would be based on current market data
    };
  }

  // Calculate time-to-hire prediction
  static calculateTimeToHirePrediction(historicalData, factors) {
    let baseDays = historicalData.average || 30;
    
    // Apply factor adjustments
    baseDays *= factors.roleSeniority;
    baseDays *= factors.skillRarity;
    baseDays *= factors.locationFactor;
    baseDays /= factors.salaryCompetitiveness;
    
    return {
      days: baseDays,
      confidence: historicalData.count > 50 ? 'high' : historicalData.count > 20 ? 'medium' : 'low',
      factors: [
        { factor: 'Role seniority', impact: `${Math.round((factors.roleSeniority - 1) * 100)}%` },
        { factor: 'Skill rarity', impact: `${Math.round((factors.skillRarity - 1) * 100)}%` },
        { factor: 'Location', impact: `${Math.round((factors.locationFactor - 1) * 100)}%` },
        { factor: 'Salary competitiveness', impact: `${Math.round((1 - factors.salaryCompetitiveness) * 100)}%` }
      ]
    };
  }

  // Helper methods
  static parseExperienceYears(experience) {
    if (typeof experience === 'number') return experience;
    if (typeof experience === 'string') {
      const match = experience.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    }
    return 0;
  }

  static calculateExperienceFit(candidateYears, requiredLevel) {
    const levelMap = {
      'entry': { min: 0, max: 2 },
      'mid': { min: 2, max: 5 },
      'senior': { min: 5, max: 10 },
      'lead': { min: 8, max: 15 },
      'executive': { min: 10, max: 100 }
    };

    const range = levelMap[requiredLevel.toLowerCase()];
    if (!range) return 0.5;

    if (candidateYears >= range.min && candidateYears <= range.max) {
      return 1;
    } else if (candidateYears > range.max) {
      return 0.8;
    } else {
      return Math.max(0, candidateYears / range.min);
    }
  }

  static calculateMarketOpportunity(skills) {
    // Simplified - would query actual market demand data
    return 0.5;
  }

  static getSeniorityFactor(experienceLevel) {
    const factors = {
      'entry': 0.7,
      'mid': 1.0,
      'senior': 1.3,
      'lead': 1.5,
      'executive': 2.0
    };
    return factors[experienceLevel?.toLowerCase()] || 1.0;
  }

  static calculateSkillRarity(skills) {
    // Simplified - would query actual skill rarity data
    return 1.0;
  }

  static getLocationFactor(location) {
    // Simplified - would query actual location data
    return 1.0;
  }

  static calculateConfidence(features) {
    const definedFeatures = Object.values(features).filter(f => f !== undefined && f !== null).length;
    const totalFeatures = Object.keys(features).length;
    return Math.round((definedFeatures / totalFeatures) * 100);
  }

  static getPercentile(values, percentile) {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  // Model management methods
  static async createModel(modelData) {
    try {
      const modelId = this.generateModelId();
      
      const model = new PredictiveModel({
        modelId,
        ...modelData,
        usageStats: {
          totalPredictions: 0
        }
      });

      await model.save();
      return model;
    } catch (error) {
      throw new Error(`Failed to create model: ${error.message}`);
    }
  }

  static async getModels(type, options = {}) {
    try {
      return await PredictiveModel.getModelsByType(type, options);
    } catch (error) {
      throw new Error(`Failed to get models: ${error.message}`);
    }
  }

  static async setDefaultModel(modelId) {
    try {
      return await PredictiveModel.setDefaultModel(modelId);
    } catch (error) {
      throw new Error(`Failed to set default model: ${error.message}`);
    }
  }

  static async getModelPerformance(type) {
    try {
      return await PredictiveModel.getPerformanceComparison(type);
    } catch (error) {
      throw new Error(`Failed to get model performance: ${error.message}`);
    }
  }
}

module.exports = PredictiveAnalyticsService;
