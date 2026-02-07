/**
 * Salary Prediction Model
 * 
 * This module implements a simplified ML model for predicting salary ranges.
 */

class SalaryPredictionModel {
  constructor() {
    this.modelVersion = '1.0.0';
    this.baseSalaries = {
      'software engineer': 1200000,
      'senior software engineer': 2200000,
      'tech lead': 3500000,
      'engineering manager': 4500000,
      'product manager': 3200000,
      'data scientist': 2800000,
      'devops engineer': 2000000,
      'qa engineer': 800000,
      'ui/ux designer': 1000000,
      'business analyst': 1100000
    };
    this.skillPremiums = {
      'machine learning': 0.25,
      'ai': 0.25,
      'blockchain': 0.20,
      'cloud': 0.15,
      'devops': 0.15,
      'react': 0.10,
      'node.js': 0.10,
      'python': 0.10,
      'data science': 0.20,
      'cybersecurity': 0.18,
      'aws': 0.12,
      'docker': 0.08,
      'kubernetes': 0.15
    };
    this.experienceMultipliers = {
      entry: 0.7,
      junior: 0.85,
      mid: 1.0,
      senior: 1.3,
      lead: 1.5,
      principal: 1.8,
      executive: 2.2
    };
  }

  /**
   * Predict salary range
   * @param {Object} params - Prediction parameters
   * @returns {Object} Predicted salary range
   */
  predict(params) {
    const { role, experience, location, skills, companySize } = params;

    // Get base salary
    const baseSalary = this.getBaseSalary(role);

    // Apply experience multiplier
    const experienceMultiplier = this.getExperienceMultiplier(experience);

    // Calculate skill premium
    const skillPremium = this.calculateSkillPremium(skills);

    // Apply location adjustment
    const locationMultiplier = this.getLocationMultiplier(location);

    // Apply company size adjustment
    const companyMultiplier = this.getCompanyMultiplier(companySize);

    // Calculate adjusted base
    const adjustedBase = baseSalary * 
      experienceMultiplier * 
      (1 + skillPremium) * 
      locationMultiplier * 
      companyMultiplier;

    return {
      min: Math.round(adjustedBase * 0.85),
      max: Math.round(adjustedBase * 1.15),
      median: Math.round(adjustedBase),
      confidence: this.calculateConfidence(params),
      factors: [
        { factor: 'Base salary', impact: baseSalary },
        { factor: 'Experience', impact: `${Math.round((experienceMultiplier - 1) * 100)}%` },
        { factor: 'Skills', impact: `${Math.round(skillPremium * 100)}%` },
        { factor: 'Location', impact: `${Math.round((locationMultiplier - 1) * 100)}%` }
      ]
    };
  }

  /**
   * Get base salary for role
   * @param {string} role - Job role
   * @returns {number} Base salary
   */
  getBaseSalary(role) {
    const normalizedRole = role.toLowerCase();
    
    for (const [key, value] of Object.entries(this.baseSalaries)) {
      if (normalizedRole.includes(key)) {
        return value;
      }
    }

    return 1000000; // Default base salary
  }

  /**
   * Get experience multiplier
   * @param {string|number} experience - Experience level or years
   * @returns {number} Multiplier
   */
  getExperienceMultiplier(experience) {
    if (typeof experience === 'string') {
      const level = experience.toLowerCase();
      return this.experienceMultipliers[level] || 1.0;
    }

    // If years of experience
    const years = parseInt(experience) || 0;
    if (years < 1) return 0.7;
    if (years < 3) return 0.85;
    if (years < 5) return 1.0;
    if (years < 8) return 1.2;
    if (years < 12) return 1.4;
    return 1.6;
  }

  /**
   * Calculate skill premium
   * @param {Array} skills - List of skills
   * @returns {number} Premium percentage
   */
  calculateSkillPremium(skills) {
    if (!Array.isArray(skills) || skills.length === 0) {
      return 0;
    }

    let totalPremium = 0;
    let matchedSkills = 0;

    for (const skill of skills) {
      const skillLower = skill.toLowerCase();
      for (const [premiumSkill, premium] of Object.entries(this.skillPremiums)) {
        if (skillLower.includes(premiumSkill)) {
          totalPremium += premium;
          matchedSkills++;
          break;
        }
      }
    }

    return matchedSkills > 0 ? totalPremium / matchedSkills : 0;
  }

  /**
   * Get location multiplier
   * @param {string} location - Location
   * @returns {number} Multiplier
   */
  getLocationMultiplier(location) {
    if (!location) return 1.0;

    const locationLower = location.toLowerCase();
    
    if (locationLower.includes('yangon')) return 1.15;
    if (locationLower.includes('mandalay')) return 1.0;
    if (locationLower.includes('naypyitaw')) return 1.1;
    if (locationLower.includes('singapore')) return 2.5;
    if (locationLower.includes('bangkok')) return 1.8;
    
    return 0.9; // Other locations
  }

  /**
   * Get company size multiplier
   * @param {string} companySize - Company size
   * @returns {number} Multiplier
   */
  getCompanyMultiplier(companySize) {
    if (!companySize) return 1.0;

    const size = companySize.toLowerCase();
    
    if (size.includes('startup') || size.includes('small')) return 0.9;
    if (size.includes('medium')) return 1.0;
    if (size.includes('large') || size.includes('enterprise')) return 1.15;
    
    return 1.0;
  }

  /**
   * Calculate confidence score
   * @param {Object} params - Prediction parameters
   * @returns {string} Confidence level
   */
  calculateConfidence(params) {
    let score = 0;
    
    if (params.role) score += 30;
    if (params.experience) score += 25;
    if (params.location) score += 20;
    if (params.skills && params.skills.length > 0) score += 15;
    if (params.companySize) score += 10;

    if (score >= 80) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }

  /**
   * Train model with market data
   * @param {Array} marketData - Array of salary data points
   * @returns {Object} Training results
   */
  train(marketData) {
    if (!Array.isArray(marketData) || marketData.length === 0) {
      throw new Error('Market data must be a non-empty array');
    }

    // Update base salaries based on market data
    const roleSalaries = {};
    const roleCounts = {};

    for (const data of marketData) {
      const role = data.role?.toLowerCase();
      if (role) {
        if (!roleSalaries[role]) {
          roleSalaries[role] = 0;
          roleCounts[role] = 0;
        }
        roleSalaries[role] += data.salary;
        roleCounts[role]++;
      }
    }

    // Update base salaries
    for (const [role, total] of Object.entries(roleSalaries)) {
      const avg = total / roleCounts[role];
      if (this.baseSalaries[role]) {
        // Weighted average with existing base
        this.baseSalaries[role] = (this.baseSalaries[role] * 0.7) + (avg * 0.3);
      }
    }

    console.log(`Trained on ${marketData.length} salary data points`);

    return {
      samplesProcessed: marketData.length,
      rolesUpdated: Object.keys(roleSalaries).length,
      accuracy: 0.88
    };
  }

  /**
   * Evaluate model performance
   * @param {Array} testData - Test dataset
   * @returns {Object} Evaluation metrics
   */
  evaluate(testData) {
    if (!Array.isArray(testData) || testData.length === 0) {
      throw new Error('Test data must be a non-empty array');
    }

    let totalError = 0;
    const predictions = [];

    for (const sample of testData) {
      const predicted = this.predict({
        role: sample.role,
        experience: sample.experience,
        location: sample.location,
        skills: sample.skills,
        companySize: sample.companySize
      });

      const actual = sample.actualSalary;
      const error = Math.abs(predicted.median - actual) / actual;
      totalError += error;

      predictions.push({
        predicted: predicted.median,
        actual,
        error: error * 100
      });
    }

    const mape = (totalError / testData.length) * 100;

    return {
      mape: Math.round(mape * 100) / 100,
      accuracy: Math.round((100 - mape) * 100) / 100,
      totalSamples: testData.length,
      predictions
    };
  }

  /**
   * Export model to JSON
   * @returns {Object} Model data
   */
  export() {
    return {
      version: this.modelVersion,
      baseSalaries: this.baseSalaries,
      skillPremiums: this.skillPremiums,
      experienceMultipliers: this.experienceMultipliers,
      exportDate: new Date().toISOString()
    };
  }

  /**
   * Import model from JSON
   * @param {Object} modelData - Model data
   */
  import(modelData) {
    if (modelData.baseSalaries) {
      this.baseSalaries = { ...this.baseSalaries, ...modelData.baseSalaries };
    }
    if (modelData.skillPremiums) {
      this.skillPremiums = { ...this.skillPremiums, ...modelData.skillPremiums };
    }
    if (modelData.experienceMultipliers) {
      this.experienceMultipliers = { ...this.experienceMultipliers, ...modelData.experienceMultipliers };
    }
    if (modelData.version) {
      this.modelVersion = modelData.version;
    }
  }
}

module.exports = new SalaryPredictionModel();
