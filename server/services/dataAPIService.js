// const AnalyticsQuery = require('../models/AnalyticsQuery'); // Model doesn't exist yet
const { Job, Company, User, Application } = require('../models/index.js');
const crypto = require('crypto');

class DataAPIService {
  // Rate limits by tier
  static RATE_LIMITS = {
    free: { requestsPerMonth: 100, creditsPerRequest: 1 },
    pro: { requestsPerMonth: 10000, creditsPerRequest: 1 },
    enterprise: { requestsPerMonth: Infinity, creditsPerRequest: 1 }
  };

  // Execute data API query
  static async executeQuery(endpoint, queryParams, customerId, customerType, apiKeyId, tier = 'free') {
    const startTime = Date.now();
    
    try {
      // Check rate limit
      const rateLimitCheck = await this.checkRateLimit(customerId, customerType, tier);
      if (!rateLimitCheck.allowed) {
        throw new Error(`Rate limit exceeded. Resets on ${rateLimitCheck.resetDate}`);
      }

      // Execute query based on endpoint
      let result;
      switch (endpoint) {
        case 'jobs':
          result = await this.getJobsData(queryParams);
          break;
        case 'candidates':
          result = await this.getCandidatesData(queryParams);
          break;
        case 'salaries':
          result = await this.getSalariesData(queryParams);
          break;
        case 'skills':
          result = await this.getSkillsData(queryParams);
          break;
        case 'locations':
          result = await this.getLocationsData(queryParams);
          break;
        case 'companies':
          result = await this.getCompaniesData(queryParams);
          break;
        case 'industries':
          result = await this.getIndustriesData(queryParams);
          break;
        default:
          throw new Error(`Unknown endpoint: ${endpoint}`);
      }

      const executionTime = Date.now() - startTime;
      const creditsUsed = this.calculateCredits(endpoint, result);

      // Log query
      await this.logQuery({
        queryId: this.generateQueryId(),
        customerId,
        customerType,
        apiKeyId,
        endpoint,
        queryParams,
        resultSize: JSON.stringify(result).length,
        executionTime,
        creditsUsed,
        status: 'success'
      });

      return {
        data: result,
        meta: {
          executionTime,
          creditsUsed,
          remainingCredits: rateLimitCheck.remaining - creditsUsed,
          resultCount: Array.isArray(result) ? result.length : 1
        }
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Log failed query
      await this.logQuery({
        queryId: this.generateQueryId(),
        customerId,
        customerType,
        apiKeyId,
        endpoint,
        queryParams,
        executionTime,
        status: 'error',
        errorMessage: error.message
      });

      throw error;
    }
  }

  // Generate unique query ID
  static generateQueryId() {
    return 'QRY-' + crypto.randomBytes(6).toString('hex').toUpperCase();
  }

  // Check rate limit
  static async checkRateLimit(customerId, customerType, tier) {
    const limit = this.RATE_LIMITS[tier] || this.RATE_LIMITS.free;
    
    // Get current month's usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const usage = await AnalyticsQuery.aggregate([
      {
        $match: {
          customerId: new require('mongoose').Types.ObjectId(customerId),
          customerType,
          createdAt: { $gte: startOfMonth },
          status: 'success'
        }
      },
      {
        $group: {
          _id: null,
          totalCredits: { $sum: '$creditsUsed' }
        }
      }
    ]);

    const usedCredits = usage[0]?.totalCredits || 0;
    const remaining = limit.requestsPerMonth === Infinity ? Infinity : limit.requestsPerMonth - usedCredits;
    
    const resetDate = new Date();
    resetDate.setMonth(resetDate.getMonth() + 1);
    resetDate.setDate(1);
    
    return {
      allowed: remaining > 0,
      remaining,
      limit: limit.requestsPerMonth,
      resetDate
    };
  }

  // Calculate credits for query
  static calculateCredits(endpoint, result) {
    const baseCredits = 1;
    const sizeMultiplier = Math.ceil(JSON.stringify(result).length / 10000); // 1 credit per 10KB
    return baseCredits + sizeMultiplier;
  }

  // Log query
  static async logQuery(queryData) {
    try {
      const query = new AnalyticsQuery(queryData);
      await query.save();
    } catch (error) {
      console.error('Failed to log query:', error);
    }
  }

  // Get jobs data
  static async getJobsData(params) {
    const query = { status: 'active' };
    
    if (params.industry) {
      query.industry = params.industry;
    }
    
    if (params.location) {
      query.location = new RegExp(params.location, 'i');
    }
    
    if (params.experienceLevel) {
      query.experienceLevel = params.experienceLevel;
    }
    
    if (params.jobType) {
      query.type = params.jobType;
    }
    
    if (params.skills) {
      const skills = Array.isArray(params.skills) ? params.skills : [params.skills];
      query.skills = { $in: skills.map(s => new RegExp(s, 'i')) };
    }
    
    if (params.salaryMin || params.salaryMax) {
      query['salary.min'] = {};
      if (params.salaryMin) query['salary.min'].$gte = parseInt(params.salaryMin);
      if (params.salaryMax) query['salary.max'] = { $lte: parseInt(params.salaryMax) };
    }
    
    if (params.postedAfter) {
      query.createdAt = { $gte: new Date(params.postedAfter) };
    }

    const limit = Math.min(parseInt(params.limit) || 100, 1000);
    const skip = parseInt(params.skip) || 0;

    const jobs = await Job.find(query)
      .select('-__v -applications')
      .populate('companyId', 'name logo industry location')
      .sort(params.sortBy || { createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Anonymize data for free tier
    if (params.anonymize !== false) {
      return jobs.map(job => this.anonymizeJobData(job));
    }

    return jobs;
  }

  // Get candidates data (anonymized)
  static async getCandidatesData(params) {
    const query = { isActive: true, profileVisibility: 'public' };
    
    if (params.skills) {
      const skills = Array.isArray(params.skills) ? params.skills : [params.skills];
      query.skills = { $in: skills.map(s => new RegExp(s, 'i')) };
    }
    
    if (params.location) {
      query.location = new RegExp(params.location, 'i');
    }
    
    if (params.experienceMin || params.experienceMax) {
      query.yearsOfExperience = {};
      if (params.experienceMin) query.yearsOfExperience.$gte = parseInt(params.experienceMin);
      if (params.experienceMax) query.yearsOfExperience.$lte = parseInt(params.experienceMax);
    }

    const limit = Math.min(parseInt(params.limit) || 100, 500);
    const skip = parseInt(params.skip) || 0;

    const candidates = await User.find(query)
      .select('skills location yearsOfExperience preferredRoles industry expectedSalary')
      .sort(params.sortBy || { updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    // Always anonymize candidate data
    return candidates.map(candidate => this.anonymizeCandidateData(candidate));
  }

  // Get salaries data
  static async getSalariesData(params) {
    const matchStage = { status: 'active' };
    
    if (params.industry) {
      matchStage.industry = params.industry;
    }
    
    if (params.location) {
      matchStage.location = params.location;
    }
    
    if (params.experienceLevel) {
      matchStage.experienceLevel = params.experienceLevel;
    }

    const aggregation = await Job.aggregate([
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
            $avg: { $avg: ['$salary.min', '$salary.max'] }
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
      { $limit: parseInt(params.limit) || 100 }
    ]);

    return aggregation;
  }

  // Get skills data
  static async getSkillsData(params) {
    const matchStage = { status: 'active' };
    
    if (params.industry) {
      matchStage.industry = params.industry;
    }
    
    if (params.timeRange) {
      matchStage.createdAt = {
        $gte: new Date(params.timeRange.start),
        $lte: new Date(params.timeRange.end)
      };
    }

    const skillsData = await Job.aggregate([
      { $match: matchStage },
      { $unwind: '$skills' },
      {
        $group: {
          _id: '$skills',
          demand: { $sum: 1 },
          avgSalary: { $avg: { $avg: ['$salary.min', '$salary.max'] } },
          industries: { $addToSet: '$industry' }
        }
      },
      {
        $project: {
          skill: '$_id',
          demand: 1,
          avgSalary: { $round: ['$avgSalary', 0] },
          industryCount: { $size: '$industries' },
          industries: { $slice: ['$industries', 5] }
        }
      },
      { $sort: { demand: -1 } },
      { $limit: parseInt(params.limit) || 100 }
    ]);

    return skillsData;
  }

  // Get locations data
  static async getLocationsData(params) {
    const matchStage = { status: 'active' };
    
    if (params.industry) {
      matchStage.industry = params.industry;
    }

    const locationsData = await Job.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$location',
          jobCount: { $sum: 1 },
          avgSalary: { $avg: { $avg: ['$salary.min', '$salary.max'] } },
          companies: { $addToSet: '$companyId' },
          industries: { $addToSet: '$industry' }
        }
      },
      {
        $project: {
          location: '$_id',
          jobCount: 1,
          avgSalary: { $round: ['$avgSalary', 0] },
          companyCount: { $size: '$companies' },
          industries: { $size: '$industries' }
        }
      },
      { $sort: { jobCount: -1 } },
      { $limit: parseInt(params.limit) || 50 }
    ]);

    return locationsData;
  }

  // Get companies data
  static async getCompaniesData(params) {
    const query = { isActive: true };
    
    if (params.industry) {
      query.industry = params.industry;
    }
    
    if (params.location) {
      query.location = new RegExp(params.location, 'i');
    }
    
    if (params.size) {
      query.size = params.size;
    }

    const limit = Math.min(parseInt(params.limit) || 50, 200);
    const skip = parseInt(params.skip) || 0;

    const companies = await Company.find(query)
      .select('name industry location size website description')
      .sort(params.sortBy || { createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get job counts for each company
    const companiesWithJobs = await Promise.all(
      companies.map(async (company) => {
        const jobCount = await Job.countDocuments({ companyId: company._id, status: 'active' });
        return {
          ...company.toObject(),
          activeJobCount: jobCount
        };
      })
    );

    return companiesWithJobs;
  }

  // Get industries data
  static async getIndustriesData(params) {
    const matchStage = { status: 'active' };
    
    if (params.timeRange) {
      matchStage.createdAt = {
        $gte: new Date(params.timeRange.start),
        $lte: new Date(params.timeRange.end)
      };
    }

    const industriesData = await Job.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$industry',
          jobCount: { $sum: 1 },
          avgSalary: { $avg: { $avg: ['$salary.min', '$salary.max'] } },
          companies: { $addToSet: '$companyId' },
          locations: { $addToSet: '$location' }
        }
      },
      {
        $project: {
          industry: '$_id',
          jobCount: 1,
          avgSalary: { $round: ['$avgSalary', 0] },
          companyCount: { $size: '$companies' },
          locationCount: { $size: '$locations' }
        }
      },
      { $sort: { jobCount: -1 } }
    ]);

    return industriesData;
  }

  // Anonymize job data
  static anonymizeJobData(job) {
    const jobObj = job.toObject ? job.toObject() : job;
    
    // Remove sensitive fields
    delete jobObj.applications;
    delete jobObj.__v;
    
    // Anonymize company info slightly for free tier
    if (jobObj.companyId && typeof jobObj.companyId === 'object') {
      jobObj.company = {
        name: jobObj.companyId.name,
        industry: jobObj.companyId.industry,
        location: jobObj.companyId.location
      };
      delete jobObj.companyId;
    }
    
    return jobObj;
  }

  // Anonymize candidate data
  static anonymizeCandidateData(candidate) {
    const candidateObj = candidate.toObject ? candidate.toObject() : candidate;
    
    // Remove PII
    delete candidateObj._id;
    delete candidateObj.email;
    delete candidateObj.phone;
    delete candidateObj.firstName;
    delete candidateObj.lastName;
    delete candidateObj.__v;
    
    return candidateObj;
  }

  // Get API usage stats
  static async getUsageStats(customerId, customerType, period = '30d') {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        default:
          startDate.setDate(startDate.getDate() - 30);
      }

      const stats = await AnalyticsQuery.getCustomerStats(
        customerId,
        customerType,
        startDate,
        endDate
      );

      const endpointUsage = await AnalyticsQuery.aggregate([
        {
          $match: {
            customerId: new require('mongoose').Types.ObjectId(customerId),
            customerType,
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$endpoint',
            count: { $sum: 1 },
            avgExecutionTime: { $avg: '$executionTime' },
            totalCredits: { $sum: '$creditsUsed' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      return {
        period,
        summary: stats,
        endpointUsage,
        dailyUsage: await AnalyticsQuery.getUsageByPeriod(
          customerId,
          customerType,
          'daily',
          startDate,
          endDate
        )
      };
    } catch (error) {
      throw new Error(`Failed to get usage stats: ${error.message}`);
    }
  }

  // Get API documentation
  static getAPIDocumentation() {
    return {
      version: '1.0',
      baseUrl: '/api/data-api',
      endpoints: [
        {
          path: '/jobs',
          method: 'GET',
          description: 'Get job market data',
          parameters: [
            { name: 'industry', type: 'string', description: 'Filter by industry' },
            { name: 'location', type: 'string', description: 'Filter by location' },
            { name: 'experienceLevel', type: 'string', description: 'Filter by experience level' },
            { name: 'skills', type: 'array', description: 'Filter by required skills' },
            { name: 'salaryMin', type: 'number', description: 'Minimum salary' },
            { name: 'salaryMax', type: 'number', description: 'Maximum salary' },
            { name: 'limit', type: 'number', description: 'Results limit (max 1000)' },
            { name: 'skip', type: 'number', description: 'Results offset' }
          ]
        },
        {
          path: '/candidates',
          method: 'GET',
          description: 'Get anonymized candidate pool data',
          parameters: [
            { name: 'skills', type: 'array', description: 'Filter by skills' },
            { name: 'location', type: 'string', description: 'Filter by location' },
            { name: 'experienceMin', type: 'number', description: 'Minimum years of experience' },
            { name: 'experienceMax', type: 'number', description: 'Maximum years of experience' },
            { name: 'limit', type: 'number', description: 'Results limit (max 500)' }
          ]
        },
        {
          path: '/salaries',
          method: 'GET',
          description: 'Get salary benchmarks',
          parameters: [
            { name: 'industry', type: 'string', description: 'Filter by industry' },
            { name: 'location', type: 'string', description: 'Filter by location' },
            { name: 'experienceLevel', type: 'string', description: 'Filter by experience level' },
            { name: 'limit', type: 'number', description: 'Results limit' }
          ]
        },
        {
          path: '/skills',
          method: 'GET',
          description: 'Get skill analytics',
          parameters: [
            { name: 'industry', type: 'string', description: 'Filter by industry' },
            { name: 'timeRange', type: 'object', description: 'Time range filter' },
            { name: 'limit', type: 'number', description: 'Results limit' }
          ]
        },
        {
          path: '/locations',
          method: 'GET',
          description: 'Get location-based data',
          parameters: [
            { name: 'industry', type: 'string', description: 'Filter by industry' },
            { name: 'limit', type: 'number', description: 'Results limit' }
          ]
        }
      ],
      rateLimits: this.RATE_LIMITS,
      authentication: 'API Key required in header: X-API-Key'
    };
  }
}

module.exports = DataAPIService;
