const MarketInsight = require('../models/MarketInsight');
const Job = require('../models/Job');
const Company = require('../models/Company');
const Application = require('../models/Application');
const User = require('../models/User');
const crypto = require('crypto');

class MarketIntelligenceService {
  // Generate unique insight ID
  static generateInsightId() {
    return 'INS-' + crypto.randomBytes(6).toString('hex').toUpperCase();
  }

  // Analyze hiring trends
  static async analyzeHiringTrends(filters = {}) {
    try {
      const matchStage = {};
      
      if (filters.industries?.length) {
        matchStage.industry = { $in: filters.industries };
      }
      
      if (filters.locations?.length) {
        matchStage.location = { $in: filters.locations };
      }
      
      if (filters.dateRange) {
        matchStage.createdAt = {
          $gte: filters.dateRange.startDate,
          $lte: filters.dateRange.endDate
        };
      }

      // Aggregate job postings by month
      const monthlyTrends = await Job.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              industry: '$industry'
            },
            jobCount: { $sum: 1 },
            avgSalary: { $avg: { $avg: ['$salary.min', '$salary.max'] } },
            uniqueCompanies: { $addToSet: '$companyId' }
          }
        },
        {
          $project: {
            year: '$_id.year',
            month: '$_id.month',
            industry: '$_id.industry',
            jobCount: 1,
            avgSalary: { $round: ['$avgSalary', 0] },
            uniqueCompanyCount: { $size: '$uniqueCompanies' }
          }
        },
        { $sort: { year: 1, month: 1 } }
      ]);

      // Calculate trends
      const trends = this.calculateTrends(monthlyTrends);

      return {
        monthlyData: monthlyTrends,
        trends,
        summary: {
          totalJobs: monthlyTrends.reduce((sum, m) => sum + m.jobCount, 0),
          avgSalary: Math.round(monthlyTrends.reduce((sum, m) => sum + (m.avgSalary || 0), 0) / monthlyTrends.length) || 0,
          growthRate: trends.growthRate || 0
        }
      };
    } catch (error) {
      throw new Error(`Failed to analyze hiring trends: ${error.message}`);
    }
  }

  // Track skill demand over time
  static async analyzeSkillDemand(filters = {}) {
    try {
      const matchStage = { status: 'active' };
      
      if (filters.industries?.length) {
        matchStage.industry = { $in: filters.industries };
      }

      // Aggregate skills from job postings
      const skillDemand = await Job.aggregate([
        { $match: matchStage },
        { $unwind: '$skills' },
        {
          $group: {
            _id: {
              skill: '$skills',
              month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }
            },
            demand: { $sum: 1 },
            avgSalary: { $avg: { $avg: ['$salary.min', '$salary.max'] } }
          }
        },
        {
          $group: {
            _id: '$_id.skill',
            totalDemand: { $sum: '$demand' },
            monthlyTrend: {
              $push: {
                month: '$_id.month',
                demand: '$demand',
                avgSalary: '$avgSalary'
              }
            }
          }
        },
        { $sort: { totalDemand: -1 } },
        { $limit: 50 }
      ]);

      // Calculate trend direction for each skill
      const skillsWithTrends = skillDemand.map(skill => ({
        ...skill,
        trend: this.calculateSkillTrend(skill.monthlyTrend)
      }));

      return {
        topSkills: skillsWithTrends.slice(0, 20),
        risingSkills: skillsWithTrends.filter(s => s.trend === 'up').slice(0, 10),
        decliningSkills: skillsWithTrends.filter(s => s.trend === 'down').slice(0, 10)
      };
    } catch (error) {
      throw new Error(`Failed to analyze skill demand: ${error.message}`);
    }
  }

  // Calculate skill trend
  static calculateSkillTrend(monthlyData) {
    if (monthlyData.length < 2) return 'stable';
    
    const sorted = monthlyData.sort((a, b) => a.month.localeCompare(b.month));
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, m) => sum + m.demand, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, m) => sum + m.demand, 0) / secondHalf.length;
    
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    if (change > 20) return 'up';
    if (change < -20) return 'down';
    return 'stable';
  }

  // Salary benchmarking
  static async getSalaryBenchmarks(filters = {}) {
    try {
      const matchStage = { status: 'active' };
      
      if (filters.industries?.length) {
        matchStage.industry = { $in: filters.industries };
      }
      
      if (filters.locations?.length) {
        matchStage.location = { $in: filters.locations };
      }

      const benchmarks = await Job.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              industry: '$industry',
              role: '$title',
              experienceLevel: '$experienceLevel'
            },
            count: { $sum: 1 },
            minSalary: { $min: '$salary.min' },
            maxSalary: { $max: '$salary.max' },
            avgMinSalary: { $avg: '$salary.min' },
            avgMaxSalary: { $avg: '$salary.max' },
            medianSalary: {
              $median: { $avg: ['$salary.min', '$salary.max'] }
            }
          }
        },
        {
          $project: {
            industry: '$_id.industry',
            role: '$_id.role',
            experienceLevel: '$_id.experienceLevel',
            count: 1,
            salaryRange: {
              min: '$minSalary',
              max: '$maxSalary'
            },
            averageSalary: {
              min: { $round: ['$avgMinSalary', 0] },
              max: { $round: ['$avgMaxSalary', 0] }
            },
            median: { $round: ['$medianSalary', 0] }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 100 }
      ]);

      // Calculate percentiles
      const allSalaries = benchmarks.map(b => b.median).filter(s => s);
      const percentiles = this.calculatePercentiles(allSalaries);

      return {
        benchmarks,
        percentiles,
        summary: {
          totalJobs: benchmarks.reduce((sum, b) => sum + b.count, 0),
          avgMedianSalary: Math.round(allSalaries.reduce((sum, s) => sum + s, 0) / allSalaries.length) || 0
        }
      };
    } catch (error) {
      throw new Error(`Failed to get salary benchmarks: ${error.message}`);
    }
  }

  // Calculate percentiles
  static calculatePercentiles(values) {
    if (!values.length) return {};
    
    const sorted = values.sort((a, b) => a - b);
    
    const getPercentile = (p) => {
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      return sorted[Math.max(0, index)];
    };

    return {
      p10: getPercentile(10),
      p25: getPercentile(25),
      p50: getPercentile(50),
      p75: getPercentile(75),
      p90: getPercentile(90)
    };
  }

  // Competitor analysis
  static async analyzeCompetitors(companyId, filters = {}) {
    try {
      // Get company's industry and location
      const company = await Company.findById(companyId);
      if (!company) {
        throw new Error('Company not found');
      }

      const matchStage = {
        companyId: { $ne: companyId },
        industry: company.industry
      };

      if (filters.locations?.length) {
        matchStage.location = { $in: filters.locations };
      }

      // Get competitor job postings
      const competitorJobs = await Job.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$companyId',
            jobCount: { $sum: 1 },
            avgSalary: { $avg: { $avg: ['$salary.min', '$salary.max'] } },
            skills: { $addToSet: '$skills' },
            roles: { $addToSet: '$title' }
          }
        },
        {
          $lookup: {
            from: 'companies',
            localField: '_id',
            foreignField: '_id',
            as: 'companyInfo'
          }
        },
        { $unwind: '$companyInfo' },
        {
          $project: {
            companyId: '$_id',
            companyName: '$companyInfo.name',
            jobCount: 1,
            avgSalary: { $round: ['$avgSalary', 0] },
            skills: { $size: { $reduce: { input: '$skills', initialValue: [], in: { $setUnion: ['$$value', '$$this'] } } } },
            roles: { $size: '$roles' }
          }
        },
        { $sort: { jobCount: -1 } },
        { $limit: 10 }
      ]);

      // Get company's own stats
      const companyStats = await Job.aggregate([
        { $match: { companyId } },
        {
          $group: {
            _id: null,
            jobCount: { $sum: 1 },
            avgSalary: { $avg: { $avg: ['$salary.min', '$salary.max'] } },
            skills: { $addToSet: '$skills' }
          }
        }
      ]);

      return {
        companyStats: companyStats[0] || { jobCount: 0, avgSalary: 0 },
        competitors: competitorJobs,
        marketPosition: this.calculateMarketPosition(companyStats[0], competitorJobs)
      };
    } catch (error) {
      throw new Error(`Failed to analyze competitors: ${error.message}`);
    }
  }

  // Calculate market position
  static calculateMarketPosition(companyStats, competitors) {
    if (!companyStats || !competitors.length) {
      return { jobCountRank: null, salaryRank: null };
    }

    const sortedByJobs = [...competitors].sort((a, b) => b.jobCount - a.jobCount);
    const sortedBySalary = [...competitors].sort((a, b) => b.avgSalary - a.avgSalary);

    const jobCountRank = sortedByJobs.findIndex(c => c.jobCount < companyStats.jobCount) + 1;
    const salaryRank = sortedBySalary.findIndex(c => c.avgSalary < companyStats.avgSalary) + 1;

    return {
      jobCountRank: jobCountRank || competitors.length + 1,
      salaryRank: salaryRank || competitors.length + 1,
      totalCompetitors: competitors.length + 1
    };
  }

  // Generate market predictions
  static async generatePredictions(category, industry, timeRange) {
    try {
      // Get historical data
      const historicalData = await this.getHistoricalData(category, industry, timeRange);
      
      // Simple trend-based prediction (in real implementation, use ML models)
      const predictions = this.calculatePredictions(historicalData, category);

      return {
        category,
        industry,
        predictions,
        confidenceScore: this.calculateConfidenceScore(historicalData),
        generatedAt: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to generate predictions: ${error.message}`);
    }
  }

  // Get historical data for predictions
  static async getHistoricalData(category, industry, timeRange) {
    const matchStage = {
      industry,
      createdAt: {
        $gte: timeRange.startDate,
        $lte: timeRange.endDate
      }
    };

    switch (category) {
      case 'hiring-trend':
        return await Job.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ]);
      
      case 'salary-trend':
        return await Job.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
              avgSalary: { $avg: { $avg: ['$salary.min', '$salary.max'] } }
            }
          },
          { $sort: { _id: 1 } }
        ]);
      
      default:
        return [];
    }
  }

  // Calculate predictions based on trends
  static calculatePredictions(historicalData, category) {
    if (historicalData.length < 3) {
      return [];
    }

    const values = historicalData.map(d => d.count || d.avgSalary);
    const trend = this.calculateLinearTrend(values);
    
    const predictions = [];
    const lastDate = new Date(historicalData[historicalData.length - 1]._id + '-01');
    
    for (let i = 1; i <= 3; i++) {
      const nextDate = new Date(lastDate);
      nextDate.setMonth(nextDate.getMonth() + i);
      
      const predictedValue = values[values.length - 1] + (trend.slope * i);
      
      predictions.push({
        metric: category === 'hiring-trend' ? 'jobCount' : 'avgSalary',
        predictedValue: Math.round(predictedValue),
        confidenceInterval: {
          lower: Math.round(predictedValue * 0.9),
          upper: Math.round(predictedValue * 1.1)
        },
        timeframe: nextDate.toISOString().slice(0, 7),
        description: `Predicted ${category} for ${nextDate.toISOString().slice(0, 7)}`
      });
    }

    return predictions;
  }

  // Calculate linear trend
  static calculateLinearTrend(values) {
    const n = values.length;
    const sumX = values.reduce((sum, _, i) => sum + i, 0);
    const sumY = values.reduce((sum, v) => sum + v, 0);
    const sumXY = values.reduce((sum, v, i) => sum + i * v, 0);
    const sumXX = values.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  // Calculate confidence score
  static calculateConfidenceScore(historicalData) {
    if (historicalData.length < 6) return 50;
    if (historicalData.length < 12) return 65;
    if (historicalData.length < 24) return 80;
    return 90;
  }

  // Create market insight
  static async createInsight(insightData) {
    try {
      const insightId = this.generateInsightId();

      const insight = new MarketInsight({
        insightId,
        ...insightData,
        viewCount: 0,
        isPublished: false
      });

      await insight.save();
      return insight;
    } catch (error) {
      throw new Error(`Failed to create insight: ${error.message}`);
    }
  }

  // Get market insights
  static async getInsights(filters = {}, options = {}) {
    try {
      const query = { isPublished: true };

      if (filters.category) {
        query.category = filters.category;
      }

      if (filters.industry) {
        query.industry = filters.industry;
      }

      if (filters.location) {
        query['location.country'] = filters.location;
      }

      const sortOptions = {};
      if (options.sortBy === 'popular') {
        sortOptions.viewCount = -1;
      } else if (options.sortBy === 'recent') {
        sortOptions.publishedAt = -1;
      } else {
        sortOptions.confidenceScore = -1;
      }

      const insights = await MarketInsight.find(query)
        .sort(sortOptions)
        .skip(options.skip || 0)
        .limit(options.limit || 20);

      const total = await MarketInsight.countDocuments(query);

      return {
        insights,
        pagination: {
          total,
          page: Math.floor((options.skip || 0) / (options.limit || 20)) + 1,
          pages: Math.ceil(total / (options.limit || 20))
        }
      };
    } catch (error) {
      throw new Error(`Failed to get insights: ${error.message}`);
    }
  }

  // Get insight by ID
  static async getInsightById(insightId) {
    try {
      const insight = await MarketInsight.findById(insightId);
      
      if (!insight) {
        throw new Error('Insight not found');
      }

      // Increment view count
      await insight.incrementViews();

      return insight;
    } catch (error) {
      throw new Error(`Failed to get insight: ${error.message}`);
    }
  }

  // Get industry insights
  static async getIndustryInsights(industry) {
    try {
      const insights = await MarketInsight.getByIndustry(industry, { limit: 10 });
      
      // Get latest trends for this industry
      const trends = await this.analyzeHiringTrends({ industries: [industry] });
      
      // Get skill demand
      const skillDemand = await this.analyzeSkillDemand({ industries: [industry] });
      
      // Get salary benchmarks
      const salaryData = await this.getSalaryBenchmarks({ industries: [industry] });

      return {
        industry,
        insights,
        trends,
        skillDemand,
        salaryData
      };
    } catch (error) {
      throw new Error(`Failed to get industry insights: ${error.message}`);
    }
  }

  // Get trending insights
  static async getTrendingInsights(limit = 10) {
    try {
      return await MarketInsight.getTrending(limit);
    } catch (error) {
      throw new Error(`Failed to get trending insights: ${error.message}`);
    }
  }

  // Calculate trends from time-series data
  static calculateTrends(monthlyData) {
    if (monthlyData.length < 2) {
      return { growthRate: 0, trend: 'stable' };
    }

    const sorted = monthlyData.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    const firstValue = sorted[0].jobCount;
    const lastValue = sorted[sorted.length - 1].jobCount;
    
    const growthRate = ((lastValue - firstValue) / firstValue) * 100;
    
    let trend = 'stable';
    if (growthRate > 10) trend = 'up';
    if (growthRate < -10) trend = 'down';

    return {
      growthRate: Math.round(growthRate * 100) / 100,
      trend,
      firstPeriod: `${sorted[0].year}-${String(sorted[0].month).padStart(2, '0')}`,
      lastPeriod: `${sorted[sorted.length - 1].year}-${String(sorted[sorted.length - 1].month).padStart(2, '0')}`
    };
  }

  // Auto-generate insights (called by cron job)
  static async autoGenerateInsights() {
    try {
      const industries = await Job.distinct('industry');
      const generatedInsights = [];

      for (const industry of industries) {
        // Generate hiring trend insight
        const hiringTrend = await this.analyzeHiringTrends({ industries: [industry] });
        
        if (hiringTrend.summary.totalJobs > 10) {
          const insight = await this.createInsight({
            category: 'hiring-trend',
            industry,
            timeRange: {
              startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
              endDate: new Date()
            },
            dataPoints: hiringTrend.monthlyData,
            trends: [{
              metric: 'jobPostings',
              direction: hiringTrend.trends.trend,
              percentage: Math.abs(hiringTrend.trends.growthRate),
              period: `${hiringTrend.trends.firstPeriod} to ${hiringTrend.trends.lastPeriod}`,
              description: `Job postings have ${hiringTrend.trends.trend === 'up' ? 'increased' : 'decreased'} by ${Math.abs(hiringTrend.trends.growthRate).toFixed(1)}%`
            }],
            keyFindings: [
              `Total of ${hiringTrend.summary.totalJobs} jobs posted in the last 3 months`,
              `Average salary: ${hiringTrend.summary.avgSalary.toLocaleString()} MMK`,
              `Market trend: ${hiringTrend.trends.trend}`
            ],
            isPublished: true,
            publishedAt: new Date()
          });

          generatedInsights.push(insight);
        }
      }

      return { generated: generatedInsights.length };
    } catch (error) {
      throw new Error(`Failed to auto-generate insights: ${error.message}`);
    }
  }
}

module.exports = MarketIntelligenceService;
