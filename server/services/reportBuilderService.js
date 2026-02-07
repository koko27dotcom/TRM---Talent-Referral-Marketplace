const Report = require('../models/Report');
const CustomReportRequest = require('../models/CustomReportRequest');
const DataProduct = require('../models/DataProduct');
const Job = require('../models/Job');
const Company = require('../models/Company');
const User = require('../models/User');
const Application = require('../models/Application');
const crypto = require('crypto');

class ReportBuilderService {
  // Generate unique report ID
  static generateReportId() {
    return 'RPT-' + crypto.randomBytes(6).toString('hex').toUpperCase();
  }

  // Generate unique request ID
  static generateRequestId() {
    return 'REQ-' + crypto.randomBytes(6).toString('hex').toUpperCase();
  }

  // Build custom report on-demand
  static async buildCustomReport(reportConfig) {
    try {
      const reportId = this.generateReportId();
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      const report = new Report({
        reportId,
        productId: reportConfig.productId,
        customerId: reportConfig.customerId,
        customerType: reportConfig.customerType,
        title: reportConfig.title,
        description: reportConfig.description,
        parameters: reportConfig.parameters,
        status: 'generating',
        generationProgress: 0,
        expiresAt
      });

      await report.save();

      // Start async report generation
      this.generateReportData(report, reportConfig).catch(error => {
        console.error('Report generation failed:', error);
        report.status = 'failed';
        report.generationError = error.message;
        report.save();
      });

      return report;
    } catch (error) {
      throw new Error(`Failed to build custom report: ${error.message}`);
    }
  }

  // Generate report data (async process)
  static async generateReportData(report, config) {
    try {
      // Aggregate data based on parameters
      const dataSnapshot = await this.aggregateData(config.parameters);
      
      report.dataSnapshot = dataSnapshot;
      report.generationProgress = 50;
      await report.save();

      // Generate file exports
      const fileUrls = await this.generateExports(report, dataSnapshot, config.formats);
      
      report.fileUrls = fileUrls;
      report.status = 'completed';
      report.generationProgress = 100;
      await report.save();

      return report;
    } catch (error) {
      throw error;
    }
  }

  // Aggregate data from multiple sources
  static async aggregateData(parameters) {
    const data = {
      jobs: null,
      companies: null,
      applications: null,
      users: null,
      salaryData: null,
      marketTrends: null
    };

    // Aggregate jobs data
    if (parameters.dataSources?.includes('job-postings')) {
      const jobQuery = {};
      
      if (parameters.industries?.length) {
        jobQuery.industry = { $in: parameters.industries };
      }
      
      if (parameters.locations?.length) {
        jobQuery.location = { $in: parameters.locations };
      }
      
      if (parameters.roles?.length) {
        jobQuery.title = { $in: parameters.roles.map(r => new RegExp(r, 'i')) };
      }
      
      if (parameters.dateRange) {
        jobQuery.createdAt = {
          $gte: parameters.dateRange.startDate,
          $lte: parameters.dateRange.endDate
        };
      }

      data.jobs = await Job.find(jobQuery)
        .select('-__v')
        .limit(10000);
    }

    // Aggregate applications data
    if (parameters.dataSources?.includes('applications')) {
      data.applications = await Application.find({
        createdAt: {
          $gte: parameters.dateRange?.startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          $lte: parameters.dateRange?.endDate || new Date()
        }
      }).select('-__v').limit(10000);
    }

    // Aggregate company data
    if (parameters.dataSources?.includes('company-data')) {
      data.companies = await Company.find({
        isActive: true
      }).select('-__v').limit(5000);
    }

    // Calculate salary statistics
    if (parameters.dataSources?.includes('salary-data')) {
      data.salaryData = await this.calculateSalaryStats(parameters);
    }

    return data;
  }

  // Calculate salary statistics
  static async calculateSalaryStats(parameters) {
    const matchStage = { status: 'active' };
    
    if (parameters.industries?.length) {
      matchStage.industry = { $in: parameters.industries };
    }
    
    if (parameters.locations?.length) {
      matchStage.location = { $in: parameters.locations };
    }

    const stats = await Job.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            industry: '$industry',
            experienceLevel: '$experienceLevel'
          },
          avgMinSalary: { $avg: '$salary.min' },
          avgMaxSalary: { $avg: '$salary.max' },
          medianSalary: { $median: '$salary.max' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    return stats;
  }

  // Generate file exports
  static async generateExports(report, dataSnapshot, formats = ['pdf']) {
    const fileUrls = {};

    for (const format of formats) {
      try {
        switch (format) {
          case 'pdf':
            fileUrls.pdf = await this.generatePDF(report, dataSnapshot);
            break;
          case 'excel':
            fileUrls.excel = await this.generateExcel(report, dataSnapshot);
            break;
          case 'csv':
            fileUrls.csv = await this.generateCSV(report, dataSnapshot);
            break;
          case 'json':
            fileUrls.json = await this.generateJSON(report, dataSnapshot);
            break;
        }
      } catch (error) {
        console.error(`Failed to generate ${format}:`, error);
      }
    }

    return fileUrls;
  }

  // Generate PDF report
  static async generatePDF(report, dataSnapshot) {
    // TODO: Implement PDF generation using puppeteer or similar
    // For now, return a placeholder URL
    return `/reports/${report.reportId}/report.pdf`;
  }

  // Generate Excel report
  static async generateExcel(report, dataSnapshot) {
    // TODO: Implement Excel generation using exceljs
    // For now, return a placeholder URL
    return `/reports/${report.reportId}/report.xlsx`;
  }

  // Generate CSV report
  static async generateCSV(report, dataSnapshot) {
    // TODO: Implement CSV generation
    // For now, return a placeholder URL
    return `/reports/${report.reportId}/report.csv`;
  }

  // Generate JSON report
  static async generateJSON(report, dataSnapshot) {
    // TODO: Implement JSON generation
    // For now, return a placeholder URL
    return `/reports/${report.reportId}/report.json`;
  }

  // Request custom report
  static async requestCustomReport(requestData) {
    try {
      const requestId = this.generateRequestId();

      const request = new CustomReportRequest({
        requestId,
        customerId: requestData.customerId,
        customerType: requestData.customerType,
        title: requestData.title,
        description: requestData.description,
        requirements: requestData.requirements,
        specifications: requestData.specifications,
        status: 'pending',
        priority: requestData.priority || 'medium',
        paymentStatus: 'pending-quote'
      });

      await request.save();

      return request;
    } catch (error) {
      throw new Error(`Failed to request custom report: ${error.message}`);
    }
  }

  // Get custom report request by ID
  static async getCustomReportRequest(requestId, customerId, customerType) {
    try {
      const request = await CustomReportRequest.findOne({
        _id: requestId,
        customerId,
        customerType
      }).populate('assignedAnalyst', 'firstName lastName email');

      if (!request) {
        throw new Error('Report request not found');
      }

      return request;
    } catch (error) {
      throw new Error(`Failed to get custom report request: ${error.message}`);
    }
  }

  // Get customer's custom report requests
  static async getCustomerRequests(customerId, customerType, options = {}) {
    try {
      return await CustomReportRequest.getCustomerRequests(customerId, customerType, options);
    } catch (error) {
      throw new Error(`Failed to get customer requests: ${error.message}`);
    }
  }

  // Update custom report request status
  static async updateRequestStatus(requestId, status, note, updatedBy) {
    try {
      const request = await CustomReportRequest.findById(requestId);
      
      if (!request) {
        throw new Error('Report request not found');
      }

      await request.updateStatus(status, note, updatedBy);
      
      return request;
    } catch (error) {
      throw new Error(`Failed to update request status: ${error.message}`);
    }
  }

  // Assign analyst to request
  static async assignAnalyst(requestId, analystId) {
    try {
      const request = await CustomReportRequest.findByIdAndUpdate(
        requestId,
        { 
          $set: { 
            assignedAnalyst: analystId,
            status: 'in-progress'
          }
        },
        { new: true }
      );

      if (!request) {
        throw new Error('Report request not found');
      }

      return request;
    } catch (error) {
      throw new Error(`Failed to assign analyst: ${error.message}`);
    }
  }

  // Quote custom report price
  static async quoteRequest(requestId, price, deliveryDate) {
    try {
      const request = await CustomReportRequest.findByIdAndUpdate(
        requestId,
        {
          $set: {
            'price.amount': price.amount,
            'price.currency': price.currency,
            'price.quotedAt': new Date(),
            'price.quoteExpiresAt': new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            deliveryDate,
            paymentStatus: 'quoted'
          }
        },
        { new: true }
      );

      if (!request) {
        throw new Error('Report request not found');
      }

      return request;
    } catch (error) {
      throw new Error(`Failed to quote request: ${error.message}`);
    }
  }

  // Schedule recurring report
  static async scheduleReport(scheduleConfig) {
    try {
      const reportId = this.generateReportId();
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      // Calculate next run date
      const nextRunAt = this.calculateNextRun(scheduleConfig.frequency);

      const report = new Report({
        reportId,
        productId: scheduleConfig.productId,
        customerId: scheduleConfig.customerId,
        customerType: scheduleConfig.customerType,
        title: scheduleConfig.title,
        description: scheduleConfig.description,
        parameters: scheduleConfig.parameters,
        isScheduled: true,
        scheduleConfig: {
          frequency: scheduleConfig.frequency,
          nextRunAt,
          isActive: true
        },
        status: 'generating',
        expiresAt
      });

      await report.save();

      return report;
    } catch (error) {
      throw new Error(`Failed to schedule report: ${error.message}`);
    }
  }

  // Calculate next run date
  static calculateNextRun(frequency) {
    const now = new Date();
    
    switch (frequency) {
      case 'daily':
        now.setDate(now.getDate() + 1);
        break;
      case 'weekly':
        now.setDate(now.getDate() + 7);
        break;
      case 'monthly':
        now.setMonth(now.getMonth() + 1);
        break;
      case 'quarterly':
        now.setMonth(now.getMonth() + 3);
        break;
      default:
        now.setMonth(now.getMonth() + 1);
    }
    
    return now;
  }

  // Get scheduled reports
  static async getScheduledReports(customerId, customerType) {
    try {
      return await Report.find({
        customerId,
        customerType,
        isScheduled: true,
        'scheduleConfig.isActive': true
      }).sort({ 'scheduleConfig.nextRunAt': 1 });
    } catch (error) {
      throw new Error(`Failed to get scheduled reports: ${error.message}`);
    }
  }

  // Cancel scheduled report
  static async cancelScheduledReport(reportId, customerId, customerType) {
    try {
      const report = await Report.findOneAndUpdate(
        {
          _id: reportId,
          customerId,
          customerType,
          isScheduled: true
        },
        {
          $set: { 'scheduleConfig.isActive': false }
        },
        { new: true }
      );

      if (!report) {
        throw new Error('Scheduled report not found');
      }

      return report;
    } catch (error) {
      throw new Error(`Failed to cancel scheduled report: ${error.message}`);
    }
  }

  // Get report by ID
  static async getReportById(reportId, customerId, customerType) {
    try {
      const report = await Report.findOne({
        _id: reportId,
        customerId,
        customerType
      }).populate('productId', 'name type');

      if (!report) {
        throw new Error('Report not found');
      }

      return report;
    } catch (error) {
      throw new Error(`Failed to get report: ${error.message}`);
    }
  }

  // Get customer's reports
  static async getCustomerReports(customerId, customerType, options = {}) {
    try {
      return await Report.getCustomerReports(customerId, customerType, options);
    } catch (error) {
      throw new Error(`Failed to get customer reports: ${error.message}`);
    }
  }

  // Download report
  static async downloadReport(reportId, format, customerId, customerType, ipAddress, userAgent) {
    try {
      const report = await Report.findOne({
        _id: reportId,
        customerId,
        customerType
      });

      if (!report) {
        throw new Error('Report not found');
      }

      if (!report.isAccessible()) {
        throw new Error('Report is not accessible or has expired');
      }

      if (!report.fileUrls[format]) {
        throw new Error(`Report not available in ${format} format`);
      }

      // Record download
      await report.recordDownload(ipAddress, userAgent);

      return {
        downloadUrl: report.fileUrls[format],
        fileName: `${report.title}.${format}`,
        downloadCount: report.downloadCount
      };
    } catch (error) {
      throw new Error(`Failed to download report: ${error.message}`);
    }
  }

  // Process scheduled reports (called by cron job)
  static async processScheduledReports() {
    try {
      const reportsToRun = await Report.getScheduledReportsToRun();
      
      for (const report of reportsToRun) {
        try {
          // Generate new report data
          await this.generateReportData(report, {
            parameters: report.parameters,
            formats: ['pdf', 'excel']
          });

          // Update next run date
          report.scheduleConfig.nextRunAt = this.calculateNextRun(report.scheduleConfig.frequency);
          report.scheduleConfig.lastRunAt = new Date();
          await report.save();
        } catch (error) {
          console.error(`Failed to process scheduled report ${report._id}:`, error);
        }
      }

      return { processed: reportsToRun.length };
    } catch (error) {
      throw new Error(`Failed to process scheduled reports: ${error.message}`);
    }
  }

  // Get report templates
  static async getReportTemplates() {
    try {
      // Return predefined report templates
      return [
        {
          id: 'salary-benchmark',
          name: 'Salary Benchmark Report',
          description: 'Compare salaries across industries and roles',
          defaultParams: {
            dataSources: ['job-postings', 'salary-data'],
            visualizations: ['charts', 'tables']
          }
        },
        {
          id: 'hiring-trends',
          name: 'Hiring Trends Report',
          description: 'Analyze hiring patterns and trends',
          defaultParams: {
            dataSources: ['job-postings', 'applications'],
            visualizations: ['charts', 'graphs']
          }
        },
        {
          id: 'skill-demand',
          name: 'Skill Demand Analysis',
          description: 'Track in-demand skills across industries',
          defaultParams: {
            dataSources: ['job-postings', 'user-profiles'],
            visualizations: ['charts', 'heatmaps']
          }
        },
        {
          id: 'market-overview',
          name: 'Market Overview Report',
          description: 'Comprehensive market analysis',
          defaultParams: {
            dataSources: ['job-postings', 'company-data', 'applications'],
            visualizations: ['charts', 'tables', 'infographics']
          }
        }
      ];
    } catch (error) {
      throw new Error(`Failed to get report templates: ${error.message}`);
    }
  }
}

module.exports = ReportBuilderService;
