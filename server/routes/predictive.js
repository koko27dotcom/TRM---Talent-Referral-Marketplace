const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const PredictiveAnalyticsService = require('../services/predictiveAnalyticsService');

// Predict hire probability
router.post('/hire-probability', authenticate, async (req, res) => {
  try {
    const { candidateProfile, jobId } = req.body;

    if (!candidateProfile || !jobId) {
      return res.status(400).json({
        success: false,
        message: 'Candidate profile and job ID are required'
      });
    }

    const prediction = await PredictiveAnalyticsService.predictHireProbability(
      candidateProfile,
      jobId
    );
    
    res.json({
      success: true,
      data: prediction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Predict retention risk
router.post('/retention', authenticate, async (req, res) => {
  try {
    const { employeeData } = req.body;

    if (!employeeData) {
      return res.status(400).json({
        success: false,
        message: 'Employee data is required'
      });
    }

    const prediction = await PredictiveAnalyticsService.predictRetentionRisk(employeeData);
    
    res.json({
      success: true,
      data: prediction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Predict salary range
router.post('/salary', authenticate, async (req, res) => {
  try {
    const { role, experience, location, skills, companySize } = req.body;

    if (!role || !experience) {
      return res.status(400).json({
        success: false,
        message: 'Role and experience are required'
      });
    }

    const prediction = await PredictiveAnalyticsService.predictSalaryRange(
      role,
      experience,
      location,
      skills,
      companySize
    );
    
    res.json({
      success: true,
      data: prediction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Predict time-to-hire
router.post('/time-to-hire', authenticate, async (req, res) => {
  try {
    const { jobData } = req.body;

    if (!jobData) {
      return res.status(400).json({
        success: false,
        message: 'Job data is required'
      });
    }

    const prediction = await PredictiveAnalyticsService.predictTimeToHire(jobData);
    
    res.json({
      success: true,
      data: prediction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get all predictive models
router.get('/models', authenticate, async (req, res) => {
  try {
    const { type } = req.query;
    
    const options = {
      activeOnly: req.query.activeOnly === 'true',
      skip: req.query.skip ? parseInt(req.query.skip) : 0,
      limit: req.query.limit ? parseInt(req.query.limit) : 20
    };

    const models = await PredictiveAnalyticsService.getModels(type, options);
    
    res.json({
      success: true,
      data: models
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get model by ID
router.get('/models/:id', authenticate, async (req, res) => {
  try {
    const PredictiveModel = require('../models/PredictiveModel');
    const model = await PredictiveModel.findById(req.params.id);
    
    if (!model) {
      return res.status(404).json({
        success: false,
        message: 'Model not found'
      });
    }
    
    res.json({
      success: true,
      data: model
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get model performance comparison
router.get('/models/performance/:type', authenticate, async (req, res) => {
  try {
    const { type } = req.params;
    
    const performance = await PredictiveAnalyticsService.getModelPerformance(type);
    
    res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Admin: Create new model
router.post('/admin/models', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const model = await PredictiveAnalyticsService.createModel({
      ...req.body,
      createdBy: req.user._id
    });
    
    res.status(201).json({
      success: true,
      data: model
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Admin: Set default model
router.put('/admin/models/:id/set-default', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const model = await PredictiveAnalyticsService.setDefaultModel(req.params.id);
    
    res.json({
      success: true,
      data: model
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Admin: Update model
router.put('/admin/models/:id', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const PredictiveModel = require('../models/PredictiveModel');
    const model = await PredictiveModel.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    
    if (!model) {
      return res.status(404).json({
        success: false,
        message: 'Model not found'
      });
    }
    
    res.json({
      success: true,
      data: model
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Admin: Deactivate model
router.delete('/admin/models/:id', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const PredictiveModel = require('../models/PredictiveModel');
    const model = await PredictiveModel.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },
      { new: true }
    );
    
    if (!model) {
      return res.status(404).json({
        success: false,
        message: 'Model not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Model deactivated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
