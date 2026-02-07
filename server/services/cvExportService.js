/**
 * CV Export Service
 * Handles export of scraped CV data in various formats
 * Supports CSV, JSON, and Excel formats
 */

const CVData = require('../models/CVData.js');
const AuditLog = require('../models/AuditLog.js');
const fs = require('fs');
const path = require('path');
const Queue = require('bull');

// Initialize export queue
const exportQueue = new Queue('cv-export', process.env.REDIS_URL || 'redis://localhost:6379');

class CVExportService {
  constructor() {
    this.exportDir = path.join(process.cwd(), 'exports');
    this.ensureExportDir();
    this.setupQueueProcessor();
  }

  ensureExportDir() {
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
  }

  setupQueueProcessor() {
    exportQueue.process(async (job) => {
      const { exportId, format, query, options, userId } = job.data;
      try {
        await this.performExport(exportId, format, query, options, userId, job);
        return { success: true, exportId };
      } catch (error) {
        throw error;
      }
    });
  }

  async createExport(exportConfig, userId) {
    const { format, query, options = {} } = exportConfig;
    const validFormats = ['csv', 'json', 'excel'];
    if (!validFormats.includes(format)) {
      throw new Error(`Invalid format. Must be one of: ${validFormats.join(', ')}`);
    }

    const exportId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const estimatedCount = await this.estimateExportCount(query);
    
    if (estimatedCount <= 1000 && !options.background) {
      return this.performExport(exportId, format, query, options, userId);
    }

    const job = await exportQueue.add({
      exportId, format, query, options, userId,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    return {
      exportId,
      status: 'processing',
      jobId: job.id,
      estimatedCount,
      message: 'Export is being processed in the background',
    };
  }

  async estimateExportCount(query) {
    return CVData.countDocuments(this.buildQuery(query));
  }

  buildQuery(query = {}) {
    const mongoQuery = {};
    if (query.status) mongoQuery.status = query.status;
    if (query.sourceId) mongoQuery['source.sourceId'] = query.sourceId;
    if (query.experienceLevel) mongoQuery.experienceLevel = query.experienceLevel;
    if (query.dateFrom || query.dateTo) {
      mongoQuery.createdAt = {};
      if (query.dateFrom) mongoQuery.createdAt.$gte = new Date(query.dateFrom);
      if (query.dateTo) mongoQuery.createdAt.$lte = new Date(query.dateTo);
    }
    if (query.skills && query.skills.length > 0) {
      mongoQuery.keywords = { $in: query.skills.map(s => s.toLowerCase()) };
    }
    if (query.minQuality) {
      mongoQuery['quality.overallScore'] = { $gte: query.minQuality };
    }
    return mongoQuery;
  }

  async performExport(exportId, format, query, options, userId, queueJob = null) {
    const mongoQuery = this.buildQuery(query);
    const filename = `${exportId}.${format === 'excel' ? 'xlsx' : format}`;
    const filepath = path.join(this.exportDir, filename);

    const cursor = CVData.find(mongoQuery).populate('source.sourceId', 'name').cursor();
    let processedCount = 0;

    try {
      if (format === 'csv') {
        processedCount = await this.exportToCSV(cursor, filepath, queueJob);
      } else if (format === 'json') {
        processedCount = await this.exportToJSON(cursor, filepath, options.pretty, queueJob);
      } else if (format === 'excel') {
        processedCount = await this.exportToCSV(cursor, filepath.replace('.xlsx', '.csv'), queueJob);
      }

      await AuditLog.create({
        action: 'CV_EXPORT_COMPLETED',
        userId,
        entityType: 'CVExport',
        entityId: exportId,
        details: { format, count: processedCount, filename, query },
      });

      return {
        exportId,
        status: 'completed',
        format,
        count: processedCount,
        filename,
        filepath,
        downloadUrl: `/api/exports/${filename}`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };
    } catch (error) {
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      throw error;
    }
  }

  async exportToCSV(cursor, filepath, queueJob) {
    const writeStream = fs.createWriteStream(filepath);
    const headers = ['ID', 'Full Name', 'Email', 'Phone', 'Headline', 'Current Title', 'Current Company', 'Location', 'Experience Years', 'Experience Level', 'Source', 'Quality Score', 'Status', 'Skills', 'Created At'];
    writeStream.write(headers.join(',') + '\n');
    
    let count = 0;
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      const row = [
        doc._id.toString(),
        this.escapeCSV(doc.fullName),
        this.escapeCSV(doc.contact?.email),
        this.escapeCSV(doc.contact?.phone),
        this.escapeCSV(doc.headline),
        this.escapeCSV(doc.currentTitle),
        this.escapeCSV(doc.currentCompany),
        this.escapeCSV(doc.currentLocation),
        doc.totalExperienceYears || '',
        doc.experienceLevel || '',
        this.escapeCSV(doc.source?.sourceName),
        doc.quality?.overallScore || '',
        doc.status,
        this.escapeCSV(doc.keywords?.join('; ')),
        doc.createdAt?.toISOString(),
      ];
      writeStream.write(row.join(',') + '\n');
      count++;
      if (queueJob && count % 1000 === 0) {
        await queueJob.progress(Math.min((count / queueJob.data.estimatedCount) * 100, 99));
      }
    }

    writeStream.end();
    return new Promise((resolve, reject) => {
      writeStream.on('finish', () => resolve(count));
      writeStream.on('error', reject);
    });
  }

  escapeCSV(value) {
    if (value == null) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  async exportToJSON(cursor, filepath, pretty = false, queueJob) {
    const writeStream = fs.createWriteStream(filepath);
    writeStream.write(pretty ? '[\n' : '[');
    let first = true;
    let count = 0;

    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      if (!first) writeStream.write(pretty ? ',\n' : ',');
      const json = pretty ? JSON.stringify(doc.toObject(), null, 2) : JSON.stringify(doc.toObject());
      writeStream.write(json);
      first = false;
      count++;
      if (queueJob && count % 1000 === 0) {
        await queueJob.progress(Math.min((count / queueJob.data.estimatedCount) * 100, 99));
      }
    }

    writeStream.write(pretty ? '\n]' : ']');
    writeStream.end();

    return new Promise((resolve, reject) => {
      writeStream.on('finish', () => resolve(count));
      writeStream.on('error', reject);
    });
  }

  async getExportStatus(exportId) {
    const files = fs.readdirSync(this.exportDir);
    const matchingFile = files.find(f => f.startsWith(exportId));

    if (matchingFile) {
      const filepath = path.join(this.exportDir, matchingFile);
      const stats = fs.statSync(filepath);
      return {
        exportId,
        status: 'completed',
        filename: matchingFile,
        size: stats.size,
        createdAt: stats.birthtime,
        downloadUrl: `/api/exports/${matchingFile}`,
      };
    }

    const jobs = await exportQueue.getJobs(['active', 'waiting', 'delayed']);
    const job = jobs.find(j => j.data.exportId === exportId);

    if (job) {
      return {
        exportId,
        status: 'processing',
        progress: await job.progress(),
        queuePosition: jobs.indexOf(job),
      };
    }

    return { exportId, status: 'not_found' };
  }

  async listExports(options = {}) {
    const files = fs.readdirSync(this.exportDir);
    const exports = files
      .filter(f => f.startsWith('export_'))
      .map(f => {
        const stats = fs.statSync(path.join(this.exportDir, f));
        return {
          filename: f,
          size: stats.size,
          createdAt: stats.birthtime,
          downloadUrl: `/api/exports/${f}`,
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);

    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 20;

    return {
      exports: exports.slice((page - 1) * limit, page * limit),
      pagination: {
        page,
        limit,
        total: exports.length,
        pages: Math.ceil(exports.length / limit),
      },
    };
  }

  async deleteExport(filename, userId) {
    const filepath = path.join(this.exportDir, filename);
    if (!fs.existsSync(filepath)) {
      throw new Error('Export file not found');
    }
    fs.unlinkSync(filepath);
    await AuditLog.create({
      action: 'CV_EXPORT_DELETED',
      userId,
      entityType: 'CVExport',
      details: { filename },
    });
    return { success: true };
  }
}

module.exports = new CVExportService();