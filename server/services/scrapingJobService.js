/**
 * Scraping Job Management Service
 * Handles CRUD operations and lifecycle management for scraping jobs
 * Integrates with Bull queue for background processing
 */

const Queue = require('bull');
const ScrapingJob = require('../models/ScrapingJob.js');
const ScrapingSource = require('../models/ScrapingSource.js');
const ScrapingLog = require('../models/ScrapingLog.js');
const CVData = require('../models/CVData.js');
const AuditLog = require('../models/AuditLog.js');

// Initialize Bull queue
const scrapingQueue = new Queue('cv-scraping', process.env.REDIS_URL || 'redis://localhost:6379');

class ScrapingJobService {
  constructor() {
    this.queue = scrapingQueue;
    this.setupQueueHandlers();
  }

  /**
   * Setup Bull queue event handlers
   */
  setupQueueHandlers() {
    this.queue.on('completed', async (job, result) => {
      await this.handleJobCompletion(job.id, result);
    });

    this.queue.on('failed', async (job, err) => {
      await this.handleJobFailure(job.id, err);
    });

    this.queue.on('progress', async (job, progress) => {
      await this.handleJobProgress(job.id, progress);
    });
  }

  /**
   * Create a new scraping job
   */
  async createJob(jobData, userId) {
    // Validate sources
    if (jobData.sources && jobData.sources.length > 0) {
      const sourceIds = jobData.sources.map(s => s.sourceId);
      const sources = await ScrapingSource.find({
        _id: { $in: sourceIds },
        isActive: true,
        isEnabled: true,
      });

      if (sources.length !== sourceIds.length) {
        throw new Error('One or more sources are invalid or inactive');
      }
    }

    // Create job document
    const job = new ScrapingJob({
      ...jobData,
      createdBy: userId,
      status: jobData.schedule?.isScheduled ? 'pending' : 'queued',
    });

    await job.save();

    // Log audit event
    await AuditLog.create({
      action: 'SCRAPING_JOB_CREATED',
      userId,
      entityType: 'ScrapingJob',
      entityId: job._id,
      details: { jobName: job.name, type: job.type },
    });

    // If not scheduled, add to queue immediately
    if (!jobData.schedule?.isScheduled) {
      await this.addToQueue(job);
    }

    return job;
  }

  /**
   * Add job to Bull queue
   */
  async addToQueue(job) {
    const queueJob = await this.queue.add(
      {
        jobId: job._id.toString(),
        type: job.type,
        sources: job.sources,
        config: job.config,
        filters: job.filters,
      },
      {
        priority: this.getPriorityValue(job.priority),
        attempts: job.queue.maxAttempts,
        backoff: {
          type: 'exponential',
          delay: job.config.retryDelay,
        },
        timeout: job.config.timeout * 1000,
        removeOnComplete: false,
        removeOnFail: false,
      }
    );

    // Update job with queue info
    job.status = 'queued';
    job.queue.jobId = queueJob.id.toString();
    await job.save();

    return queueJob;
  }

  /**
   * Get priority value for queue
   */
  getPriorityValue(priority) {
    const priorities = {
      low: 5,
      normal: 3,
      high: 2,
      critical: 1,
    };
    return priorities[priority] || 3;
  }

  /**
   * Get all scraping jobs with filtering
   */
  async getJobs(filters = {}, options = {}) {
    const query = {};

    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    if (filters.priority) query.priority = filters.priority;
    if (filters.createdBy) query.createdBy = filters.createdBy;
    if (filters.tags) query.tags = { $in: filters.tags };
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }
    if (filters.dateRange) {
      query.createdAt = {};
      if (filters.dateRange.from) query.createdAt.$gte = new Date(filters.dateRange.from);
      if (filters.dateRange.to) query.createdAt.$lte = new Date(filters.dateRange.to);
    }

    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 20;
    const sort = options.sort || { createdAt: -1 };

    const [jobs, total] = await Promise.all([
      ScrapingJob.find(query)
        .populate('sources.sourceId', 'name type baseUrl')
        .populate('createdBy', 'name email')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit),
      ScrapingJob.countDocuments(query),
    ]);

    return {
      jobs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get job by ID with details
   */
  async getJobById(jobId) {
    const job = await ScrapingJob.findById(jobId)
      .populate('sources.sourceId')
      .populate('createdBy', 'name email')
      .populate('startedBy', 'name email')
      .populate('cancelledBy', 'name email');

    if (!job) {
      throw new Error('Job not found');
    }

    // Get queue job status if exists
    if (job.queue.jobId) {
      const queueJob = await this.queue.getJob(job.queue.jobId);
      if (queueJob) {
        job.queueStatus = await queueJob.getState();
      }
    }

    return job;
  }

  /**
   * Update scraping job
   */
  async updateJob(jobId, updateData, userId) {
    const job = await ScrapingJob.findById(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    // Cannot update running or completed jobs
    if (['running', 'completed'].includes(job.status)) {
      throw new Error(`Cannot update ${job.status} job`);
    }

    // Track changes for audit
    const changes = [];
    Object.keys(updateData).forEach(key => {
      if (JSON.stringify(job[key]) !== JSON.stringify(updateData[key])) {
        changes.push({
          field: key,
          oldValue: job[key],
          newValue: updateData[key],
        });
      }
    });

    Object.assign(job, updateData);
    await job.save();

    // Log audit
    if (changes.length > 0) {
      await AuditLog.create({
        action: 'SCRAPING_JOB_UPDATED',
        userId,
        entityType: 'ScrapingJob',
        entityId: job._id,
        details: { changes },
      });
    }

    return job;
  }

  /**
   * Delete scraping job
   */
  async deleteJob(jobId, userId) {
    const job = await ScrapingJob.findById(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    // Cannot delete running jobs
    if (job.status === 'running') {
      throw new Error('Cannot delete running job. Please cancel it first.');
    }

    // Remove from queue if queued
    if (job.queue.jobId && ['queued', 'pending'].includes(job.status)) {
      const queueJob = await this.queue.getJob(job.queue.jobId);
      if (queueJob) {
        await queueJob.remove();
      }
    }

    await ScrapingJob.findByIdAndDelete(jobId);

    // Log audit
    await AuditLog.create({
      action: 'SCRAPING_JOB_DELETED',
      userId,
      entityType: 'ScrapingJob',
      entityId: jobId,
      details: { jobName: job.name },
    });

    return { success: true };
  }

  /**
   * Start a pending job
   */
  async startJob(jobId, userId) {
    const job = await ScrapingJob.findById(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    if (!['pending', 'paused'].includes(job.status)) {
      throw new Error(`Cannot start job with status: ${job.status}`);
    }

    if (job.status === 'paused') {
      return this.resumeJob(jobId, userId);
    }

    await this.addToQueue(job);

    job.startedBy = userId;
    job.startedAt = new Date();
    await job.save();

    await AuditLog.create({
      action: 'SCRAPING_JOB_STARTED',
      userId,
      entityType: 'ScrapingJob',
      entityId: job._id,
    });

    return job;
  }

  /**
   * Pause a running job
   */
  async pauseJob(jobId, userId) {
    const job = await ScrapingJob.findById(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    await job.pause(userId);

    // Pause queue job if exists
    if (job.queue.jobId) {
      const queueJob = await this.queue.getJob(job.queue.jobId);
      if (queueJob) {
        // Bull doesn't have a direct pause, we handle this in the processor
        await queueJob.update({ paused: true });
      }
    }

    await AuditLog.create({
      action: 'SCRAPING_JOB_PAUSED',
      userId,
      entityType: 'ScrapingJob',
      entityId: job._id,
    });

    return job;
  }

  /**
   * Resume a paused job
   */
  async resumeJob(jobId, userId) {
    const job = await ScrapingJob.findById(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    await job.resume(userId);

    // Resume queue job if exists
    if (job.queue.jobId) {
      const queueJob = await this.queue.getJob(job.queue.jobId);
      if (queueJob) {
        await queueJob.update({ paused: false });
      }
    }

    await AuditLog.create({
      action: 'SCRAPING_JOB_RESUMED',
      userId,
      entityType: 'ScrapingJob',
      entityId: job._id,
    });

    return job;
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId, userId) {
    const job = await ScrapingJob.findById(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    await job.cancel(userId);

    // Remove from queue
    if (job.queue.jobId) {
      const queueJob = await this.queue.getJob(job.queue.jobId);
      if (queueJob) {
        await queueJob.remove();
      }
    }

    await AuditLog.create({
      action: 'SCRAPING_JOB_CANCELLED',
      userId,
      entityType: 'ScrapingJob',
      entityId: job._id,
    });

    return job;
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId, userId) {
    const job = await ScrapingJob.findById(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    if (job.status !== 'failed') {
      throw new Error('Only failed jobs can be retried');
    }

    // Reset job status
    job.status = 'queued';
    job.errors = [];
    job.statistics = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      duplicates: 0,
    };
    job.progress = {
      currentPage: 0,
      totalPages: 0,
      percentage: 0,
    };

    await this.addToQueue(job);
    await job.save();

    await AuditLog.create({
      action: 'SCRAPING_JOB_RETRIED',
      userId,
      entityType: 'ScrapingJob',
      entityId: job._id,
    });

    return job;
  }

  /**
   * Bulk operations on jobs
   */
  async bulkOperation(operation, jobIds, userId) {
    const results = {
      success: [],
      failed: [],
    };

    for (const jobId of jobIds) {
      try {
        switch (operation) {
          case 'pause':
            await this.pauseJob(jobId, userId);
            break;
          case 'resume':
            await this.resumeJob(jobId, userId);
            break;
          case 'cancel':
            await this.cancelJob(jobId, userId);
            break;
          case 'retry':
            await this.retryJob(jobId, userId);
            break;
          case 'delete':
            await this.deleteJob(jobId, userId);
            break;
          default:
            throw new Error(`Unknown operation: ${operation}`);
        }
        results.success.push(jobId);
      } catch (error) {
        results.failed.push({ jobId, error: error.message });
      }
    }

    await AuditLog.create({
      action: 'SCRAPING_JOB_BULK_ACTION',
      userId,
      entityType: 'ScrapingJob',
      details: { operation, jobIds, results },
    });

    return results;
  }

  /**
   * Get job statistics
   */
  async getStatistics(dateRange = {}) {
    return ScrapingJob.getStatistics(dateRange);
  }

  /**
   * Get active jobs
   */
  async getActiveJobs() {
    return ScrapingJob.getActiveJobs()
      .populate('sources.sourceId', 'name')
      .populate('createdBy', 'name');
  }

  /**
   * Get scheduled jobs
   */
  async getScheduledJobs() {
    return ScrapingJob.getScheduledJobs()
      .populate('sources.sourceId', 'name')
      .populate('createdBy', 'name');
  }

  /**
   * Handle job completion
   */
  async handleJobCompletion(queueJobId, result) {
    const job = await ScrapingJob.findOne({ 'queue.jobId': queueJobId.toString() });
    if (!job) return;

    job.status = 'completed';
    job.completedAt = new Date();
    job.actualDuration = Math.round((job.completedAt - job.startedAt) / 1000);
    
    if (result) {
      job.statistics = { ...job.statistics, ...result.statistics };
    }

    await job.save();

    // Send notifications if configured
    if (job.notifications.onComplete && job.notifications.emailRecipients.length > 0) {
      // TODO: Send email notification
    }
  }

  /**
   * Handle job failure
   */
  async handleJobFailure(queueJobId, error) {
    const job = await ScrapingJob.findOne({ 'queue.jobId': queueJobId.toString() });
    if (!job) return;

    job.status = 'failed';
    job.errors.push({
      errorType: 'job_failure',
      sampleMessage: error.message,
      lastOccurred: new Date(),
    });

    await job.save();

    // Send error notifications
    if (job.notifications.onError && job.notifications.emailRecipients.length > 0) {
      // TODO: Send error notification
    }
  }

  /**
   * Handle job progress updates
   */
  async handleJobProgress(queueJobId, progress) {
    const job = await ScrapingJob.findOne({ 'queue.jobId': queueJobId.toString() });
    if (!job) return;

    await job.updateProgress({
      percentage: progress,
      lastActivity: new Date(),
    });
  }

  /**
   * Clone a job
   */
  async cloneJob(jobId, userId, overrides = {}) {
    const originalJob = await ScrapingJob.findById(jobId);
    if (!originalJob) {
      throw new Error('Job not found');
    }

    const clonedData = {
      name: `${originalJob.name} (Copy)`,
      description: originalJob.description,
      type: originalJob.type,
      priority: originalJob.priority,
      sources: originalJob.sources,
      config: originalJob.config,
      filters: originalJob.filters,
      schedule: { isScheduled: false },
      ...overrides,
    };

    return this.createJob(clonedData, userId);
  }

  /**
   * Get job logs
   */
  async getJobLogs(jobId, options = {}) {
    return ScrapingLog.getByJob(jobId, options);
  }

  /**
   * Get queue status
   */
  async getQueueStatus() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }
}

module.exports = new ScrapingJobService();