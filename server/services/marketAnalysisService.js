/**
 * Market Analysis Service
 * Provides market trends, salary surveys, and job market analysis
 */

const { MarketTrend, SalaryBenchmark, HiringVelocity, Job, Company } = require('../models/index.js');

/**
 * Get market trends
 */
const getMarketTrends = async (options = {}) => {
  const { industry, timeframe = '30d', region } = options;
  
  const query = {};
  if (industry) query.industry = industry;
  if (region) query.region = region;
  
  // Calculate date range
  const days = parseInt(timeframe);
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  query.date = { $gte: startDate };
  
  const trends = await MarketTrend.find(query)
    .sort({ date: -1 })
    .limit(100);
  
  return trends;
};

/**
 * Get salary benchmarks
 */
const getSalaryBenchmarks = async (options = {}) => {
  const { jobTitle, location, experienceLevel, industry } = options;
  
  const query = {};
  if (jobTitle) query.jobTitle = { $regex: jobTitle, $options: 'i' };
  if (location) query.location = location;
  if (experienceLevel) query.experienceLevel = experienceLevel;
  if (industry) query.industry = industry;
  
  const benchmarks = await SalaryBenchmark.find(query)
    .sort({ updatedAt: -1 });
  
  return benchmarks;
};

/**
 * Get salary statistics for a specific role
 */
const getSalaryStats = async (jobTitle, location = null) => {
  const matchStage = {
    jobTitle: { $regex: jobTitle, $options: 'i' },
  };
  if (location) matchStage.location = location;
  
  const stats = await SalaryBenchmark.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        avgSalary: { $avg: '$medianSalary' },
        minSalary: { $min: '$minSalary' },
        maxSalary: { $max: '$maxSalary' },
        count: { $sum: 1 },
      },
    },
  ]);
  
  return stats[0] || null;
};

/**
 * Get hiring velocity
 */
const getHiringVelocity = async (options = {}) => {
  const { companyId, industry, timeframe = '30d' } = options;
  
  const query = {};
  if (companyId) query.companyId = companyId;
  if (industry) query.industry = industry;
  
  const days = parseInt(timeframe);
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  query.date = { $gte: startDate };
  
  const velocity = await HiringVelocity.find(query)
    .sort({ date: -1 })
    .populate('companyId', 'name');
  
  return velocity;
};

/**
 * Get job market overview
 */
const getJobMarketOverview = async (region = null) => {
  const query = { status: 'active' };
  if (region) query.location = region;
  
  const [
    totalJobs,
    jobsByCategory,
    jobsByLocation,
    avgReferralBonus,
    newJobsThisWeek,
  ] = await Promise.all([
    Job.countDocuments(query),
    Job.aggregate([
      { $match: query },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    Job.aggregate([
      { $match: query },
      { $group: { _id: '$location', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    Job.aggregate([
      { $match: query },
      { $group: { _id: null, avg: { $avg: '$referralBonus' } } },
    ]),
    Job.countDocuments({
      ...query,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    }),
  ]);
  
  return {
    totalJobs,
    jobsByCategory: jobsByCategory.map(j => ({ category: j._id, count: j.count })),
    jobsByLocation: jobsByLocation.map(j => ({ location: j._id, count: j.count })),
    avgReferralBonus: avgReferralBonus[0]?.avg || 0,
    newJobsThisWeek,
  };
};

/**
 * Get top paying jobs
 */
const getTopPayingJobs = async (limit = 10) => {
  const jobs = await Job.find({ status: 'active' })
    .sort({ referralBonus: -1 })
    .limit(limit)
    .populate('companyId', 'name logo')
    .select('title referralBonus location companyId');
  
  return jobs;
};

/**
 * Get in-demand skills
 */
const getInDemandSkills = async (limit = 20) => {
  const skills = await Job.aggregate([
    { $match: { status: 'active' } },
    { $unwind: '$requiredSkills' },
    {
      $group: {
        _id: '$requiredSkills',
        count: { $sum: 1 },
        avgBonus: { $avg: '$referralBonus' },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);
  
  return skills.map(s => ({
    skill: s._id,
    jobCount: s.count,
    avgReferralBonus: Math.round(s.avgBonus),
  }));
};

/**
 * Get industry comparison
 */
const getIndustryComparison = async () => {
  const industries = await Job.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: '$industry',
        jobCount: { $sum: 1 },
        avgBonus: { $avg: '$referralBonus' },
        avgSalary: { $avg: '$salary.max' },
      },
    },
    { $sort: { jobCount: -1 } },
  ]);
  
  return industries.map(i => ({
    industry: i._id || 'Other',
    jobCount: i.jobCount,
    avgReferralBonus: Math.round(i.avgBonus),
    avgSalary: Math.round(i.avgSalary),
  }));
};

/**
 * Conduct salary survey
 */
const conductSalarySurvey = async (surveyData) => {
  const {
    jobTitle,
    location,
    experienceYears,
    currentSalary,
    industry,
    companySize,
  } = surveyData;
  
  // Find or create benchmark
  let benchmark = await SalaryBenchmark.findOne({
    jobTitle: { $regex: `^${jobTitle}$`, $options: 'i' },
    location,
    experienceLevel: getExperienceLevel(experienceYears),
  });
  
  if (!benchmark) {
    benchmark = await SalaryBenchmark.create({
      jobTitle,
      location,
      experienceLevel: getExperienceLevel(experienceYears),
      industry,
      minSalary: currentSalary,
      maxSalary: currentSalary,
      medianSalary: currentSalary,
      sampleSize: 1,
    });
  } else {
    // Update benchmark with new data point
    const newSampleSize = benchmark.sampleSize + 1;
    benchmark.medianSalary = 
      (benchmark.medianSalary * benchmark.sampleSize + currentSalary) / newSampleSize;
    benchmark.minSalary = Math.min(benchmark.minSalary, currentSalary);
    benchmark.maxSalary = Math.max(benchmark.maxSalary, currentSalary);
    benchmark.sampleSize = newSampleSize;
    await benchmark.save();
  }
  
  return benchmark;
};

/**
 * Get experience level from years
 */
const getExperienceLevel = (years) => {
  if (years < 2) return 'entry';
  if (years < 5) return 'mid';
  return 'senior';
};

/**
 * Generate market report
 */
const generateMarketReport = async (options = {}) => {
  const { industry, region, timeframe = '30d' } = options;
  
  const [
    marketTrends,
    salaryBenchmarks,
    hiringVelocity,
    jobMarketOverview,
    topPayingJobs,
    inDemandSkills,
    industryComparison,
  ] = await Promise.all([
    getMarketTrends({ industry, timeframe, region }),
    getSalaryBenchmarks({ industry }),
    getHiringVelocity({ industry, timeframe }),
    getJobMarketOverview(region),
    getTopPayingJobs(10),
    getInDemandSkills(20),
    getIndustryComparison(),
  ]);
  
  return {
    generatedAt: new Date(),
    parameters: { industry, region, timeframe },
    summary: {
      totalJobs: jobMarketOverview.totalJobs,
      newJobsThisWeek: jobMarketOverview.newJobsThisWeek,
      avgReferralBonus: jobMarketOverview.avgReferralBonus,
    },
    marketTrends,
    salaryBenchmarks,
    hiringVelocity,
    jobMarketOverview,
    topPayingJobs,
    inDemandSkills,
    industryComparison,
  };
};

/**
 * Get salary prediction
 */
const getSalaryPrediction = async (jobTitle, experienceYears, location, skills = []) => {
  // Get similar roles
  const similarRoles = await SalaryBenchmark.find({
    jobTitle: { $regex: jobTitle, $options: 'i' },
    location,
  });
  
  if (similarRoles.length === 0) {
    return null;
  }
  
  // Calculate base salary from similar roles
  const baseSalary = similarRoles.reduce((sum, role) => sum + role.medianSalary, 0) / similarRoles.length;
  
  // Adjust for experience
  const experienceMultiplier = 1 + (experienceYears * 0.05);
  
  // Adjust for skills
  const skillBonus = skills.length * 25000; // 25K MMK per skill
  
  const predictedSalary = (baseSalary * experienceMultiplier) + skillBonus;
  
  return {
    predictedSalary: Math.round(predictedSalary),
    baseSalary: Math.round(baseSalary),
    experienceAdjustment: Math.round(baseSalary * (experienceMultiplier - 1)),
    skillBonus,
    confidence: similarRoles.length > 5 ? 'high' : 'medium',
    basedOn: similarRoles.length,
  };
};

module.exports = {
  // Market trends
  getMarketTrends,
  
  // Salary data
  getSalaryBenchmarks,
  getSalaryStats,
  conductSalarySurvey,
  getSalaryPrediction,
  
  // Hiring data
  getHiringVelocity,
  
  // Job market
  getJobMarketOverview,
  getTopPayingJobs,
  getInDemandSkills,
  getIndustryComparison,
  
  // Reports
  generateMarketReport,
};
