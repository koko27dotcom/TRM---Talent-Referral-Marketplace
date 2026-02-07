/**
 * Hire Probability Prediction Model
 * 
 * This module implements a simplified ML model for predicting candidate hire probability.
 * In production, this would use TensorFlow.js or call a Python microservice.
 */

class HireProbabilityModel {
  constructor() {
    this.modelVersion = '1.0.0';
    this.features = [
      'skillsMatch',
      'experienceMatch',
      'educationMatch',
      'locationMatch',
      'salaryFit',
      'applicationQuality'
    ];
    this.weights = {
      skillsMatch: 0.35,
      experienceMatch: 0.25,
      educationMatch: 0.10,
      locationMatch: 0.10,
      salaryFit: 0.15,
      applicationQuality: 0.05
    };
  }

  /**
   * Calculate hire probability score
   * @param {Object} features - Feature values
   * @returns {number} Probability score (0-100)
   */
  predict(features) {
    let score = 0;
    
    for (const [feature, weight] of Object.entries(this.weights)) {
      const value = features[feature] || 0;
      score += value * weight;
    }

    // Normalize to 0-100 range
    return Math.min(Math.max(score * 100, 0), 100);
  }

  /**
   * Get feature importance
   * @returns {Array} Feature importance rankings
   */
  getFeatureImportance() {
    return Object.entries(this.weights)
      .sort((a, b) => b[1] - a[1])
      .map(([feature, weight]) => ({
        feature,
        importance: weight,
        percentage: Math.round(weight * 100)
      }));
  }

  /**
   * Calculate confidence score based on feature completeness
   * @param {Object} features - Feature values
   * @returns {number} Confidence score (0-100)
   */
  calculateConfidence(features) {
    const definedFeatures = Object.values(features).filter(f => f !== undefined && f !== null).length;
    const totalFeatures = Object.keys(this.weights).length;
    return Math.round((definedFeatures / totalFeatures) * 100);
  }

  /**
   * Get prediction factors (positive/negative)
   * @param {Object} features - Feature values
   * @returns {Array} List of factors
   */
  getFactors(features) {
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

  /**
   * Train model with new data (simplified)
   * @param {Array} trainingData - Array of {features, label} objects
   * @returns {Object} Training results
   */
  train(trainingData) {
    // In a real implementation, this would use gradient descent or similar
    // For now, we just validate the data format
    
    if (!Array.isArray(trainingData) || trainingData.length === 0) {
      throw new Error('Training data must be a non-empty array');
    }

    const validSamples = trainingData.filter(sample => {
      return sample.features && typeof sample.label === 'number';
    });

    console.log(`Training on ${validSamples.length} samples`);

    // Simulate training
    return {
      samplesProcessed: validSamples.length,
      accuracy: 0.85, // Simulated accuracy
      loss: 0.15,
      epochs: 100
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

    let correct = 0;
    const predictions = [];

    for (const sample of testData) {
      const predicted = this.predict(sample.features);
      const actual = sample.label;
      
      // Consider prediction correct if within 10% of actual
      if (Math.abs(predicted - actual) <= 10) {
        correct++;
      }

      predictions.push({ predicted, actual });
    }

    const accuracy = correct / testData.length;

    return {
      accuracy,
      precision: accuracy, // Simplified
      recall: accuracy, // Simplified
      f1Score: accuracy, // Simplified
      totalSamples: testData.length,
      correctPredictions: correct
    };
  }

  /**
   * Export model to JSON
   * @returns {Object} Model data
   */
  export() {
    return {
      version: this.modelVersion,
      features: this.features,
      weights: this.weights,
      exportDate: new Date().toISOString()
    };
  }

  /**
   * Import model from JSON
   * @param {Object} modelData - Model data
   */
  import(modelData) {
    if (modelData.weights) {
      this.weights = modelData.weights;
    }
    if (modelData.version) {
      this.modelVersion = modelData.version;
    }
  }
}

module.exports = new HireProbabilityModel();
