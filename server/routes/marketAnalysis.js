/**
 * Market Analysis Routes
 * API endpoints for market trends, salary surveys, and job market analysis
 */

const express = require('express');
const marketAnalysisService = require('../services/marketAnalysisService.js');
const { authenticate } = require('../middleware/auth.js');
const { asyncHandler, ValidationError } = require('../middleware/errorHandler.js');
const { requireAdmin } = require('../middleware/rbac.js');

const router = express.Router();

// ==================== MARKET TRENDS ====================

/**
 * @route   GET /api/market/trends
 * @desc    Get market trends
 * @access  Public
 */
router.get('/trends', asyncHandler(async (req, res) => {
  const { industry, timeframe, region } = req.query;
  
  const trends = await marketAnalysisService.getMarketTrends({
    industry,
    timeframe,
    region,
  });
  
  res.json({
    success: true,
    data: trends,
  });
}));

// ==================== SALARY DATA ====================

/**
 * @route   GET /api/market/salary/benchmarks
 * @desc    Get salary benchmarks
 * @access  Public
 */
router.get('/salary/benchmarks', asyncHandler(async (req, res) => {
  const { jobTitle, location, experienceLevel, industry } = req.query;
  
  const benchmarks = await marketAnalysisService.getSalaryBenchmarks({
    jobTitle,
    location,
    experienceLevel,
    industry,
  });
  
  res.json({
    success: true,
    data: benchmarks,
  });
}));

/**
 * @route   GET /api/market/salary/stats
 * @desc    Get salary statistics for a role
 * @access  Public
 */
router.get('/salary/stats', asyncHandler(async (req, res) => {
  const { jobTitle, location } = req.query;
  
  if (!jobTitle) {
    throw new ValidationError('Job title is required');
  }
  
  const stats = await marketAnalysisService.getSalaryStats(jobTitle, location);
  
  res.json({
    success: true,
    data: stats,
  });
}));

/**
 * @route   POST /api/market/salary/survey
 * @desc    Submit salary survey
 * @access  Private
 */
router.post('/salary/survey', authenticate, asyncHandler(async (req, res) => {
  const surveyData = req.body;
  
  if (!surveyData.jobTitle || !surveyData.currentSalary) {
    throw new ValidationError('Job title and current salary are required');
  }
  
  const benchmark = await marketAnalysisService.conductSalarySurvey(surveyData);
  
  res.json({
    success: true,
    message: 'Survey submitted successfully',
    data: benchmark,
  });
}));

/**
 * @route   POST /api/market/salary/predict
 * @desc    Get salary prediction
 * @access  Public
 */
router.post('/salary/predict', asyncHandler(async (req, res) => {
  const { jobTitle, experienceYears, location, skills } = req.body;
  
  if (!jobTitle || experienceYears === undefined) {
    throw new ValidationError('Job title and experience years are required');
  }
  
  const prediction = await marketAnalysisService.getSalaryPrediction(
    jobTitle,
    experienceYears,
    location,
    skills
  );
  
  res.json({
    success: true,
    data: prediction,
  });
}));

// ==================== JOB MARKET ====================

/**
 * @route   GET /api/market/jobs/overview
 * @desc    Get job market overview
 * @access  Public
 */
router.get('/jobs/overview', asyncHandler(async (req, res) => {
  const { region } = req.query;
  
  const overview = await marketAnalysisService.getJobMarketOverview(region);
  
  res.json({
    success: true,
    data: overview,
  });
}));

/**
 * @route   GET /api/market/jobs/top-paying
 * @desc    Get top paying jobs
 * @access  Public
 */
router.get('/jobs/top-paying', asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  
  const jobs = await marketAnalysisService.getTopPayingJobs(parseInt(limit));
  
  res.json({
    success: true,
    data: jobs,
  });
}));

/**
 * @route   GET /api/market/jobs/in-demand-skills
 * @desc    Get in-demand skills
 * @access  Public
 */
router.get('/jobs/in-demand-skills', asyncHandler(async (req, res) => {
  const { limit = 20 } = req.query;
  
  const skills = await marketAnalysisService.getInDemandSkills(parseInt(limit));
  
  res.json({
    success: true,
    data: skills,
  });
}));

/**
 * @route   GET /api/market/jobs/industry-comparison
 * @desc    Get industry comparison
 * @access  Public
 */
router.get('/jobs/industry-comparison', asyncHandler(async (req, res) => {
  const industries = await marketAnalysisService.getIndustryComparison();
  
  res.json({
    success: true,
    data: industries,
  });
}));

// ==================== HIRING VELOCITY ====================

/**
 * @route   GET /api/market/hiring-velocity
 * @desc    Get hiring velocity data
 * @access  Public
 */
router.get('/hiring-velocity', asyncHandler(async (req, res) => {
  const { companyId, industry, timeframe } = req.query;
  
  const velocity = await marketAnalysisService.getHiringVelocity({
    companyId,
    industry,
    timeframe,
  });
  
  res.json({
    success: true,
    data: velocity,
  });
}));

// ==================== REPORTS ====================

/**
 * @route   POST /api/market/report
 * @desc    Generate comprehensive market report
 * @access  Public
 */
router.post('/report', asyncHandler(async (req, res) => {
  const { industry, region, timeframe } = req.body;
  
  const report = await marketAnalysisService.generateMarketReport({
    industry,
    region,
    timeframe,
  });
  
  res.json({
    success: true,
    data: report,
  });
}));

/**
 * @route   GET /api/market/report/download
 * @desc    Download market report as PDF
 * @access  Private
 */
router.get('/report/download', authenticate, asyncHandler(async (req, res) => {
  const { industry, region, timeframe } = req.query;
  
  const report = await marketAnalysisService.generateMarketReport({
    industry,
    region,
    timeframe,
  });
  
  // In production, this would generate a PDF
  // For now, return JSON with header suggesting download
  res.setHeader('Content-Disposition', 'attachment; filename="market-report.json"');
  res.setHeader('Content-Type', 'application/json');
  res.json(report);
}));

// ==================== ADMIN ENDPOINTS ====================

/**
 * @route   POST /api/market/admin/trends
 * @desc    Add market trend data (admin)
 * @access  Private (Admin only)
 */
router.post('/admin/trends', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const MarketTrend = require('../models/MarketTrend.js');
  
  const trend = await MarketTrend.create(req.body);
  
  res.status(201).json({
    success: true,
    message: 'Market trend added',
    data: trend,
  });
}));

/**
 * @route   POST /api/market/admin/salary-benchmark
 * @desc    Add salary benchmark (admin)
 * @access  Private (Admin only)
 */
router.post('/admin/salary-benchmark', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const SalaryBenchmark = require('../models/SalaryBenchmark.js');
  
  const benchmark = await SalaryBenchmark.create(req.body);
  
  res.status(201).json({
    success: true,
    message: 'Salary benchmark added',
    data: benchmark,
  });
}));

module.exports = router;
