/**
 * Queue Management Service
 * Monitors and manages Bull queues for CV scraping
 * Handles job retry, cleanup, and queue statistics
 */

const Queue = require('bull');
const ScrapingJob = require('../models/ScrapingJob.js');
const ScrapingLog = require('../models/ScrapingLog.js');
const AuditLog = require('../models/AuditLog.js');

class QueueManagementService {
  constructor() {
    this.queues = new Map();
    this.initializeQueues();
  }

  /**
   * Initialize all queues
   */
  initializeQueues() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    // Main CV scraping queue
    this.queues.set('cv-scraping', new Queue('cv-scraping', redisUrl));
    
    // Data processing queue
    this.queues.set('data-processing', new Queue('data-processing', redisUrl));
    
    // Export queue
    this.queues.set('export', new Queue('export', redisUrl));
    
    // Validation queue
    this.queues.set('validation', new Queue('validation', redisUrl));

    // Setup event handlers for all queues
    this.queues.forEach((queue, name) => {
      this.setupQueueEventHandlers(queue, name);
    });
  }

  /**
   * Setup event handlers for a queue
   */
  setupQueueEventHandlers(queue, queueName) {
    queue.on('error', (error) => {
      console.error(`Queue ${queueName} error:`, error);
    });

    queue.on('stalled', (job) => {
      console.warn(`Job ${job.id} in queue ${queueName} has stalled`);
    });
  }

  /**
   * Get queue instance
   */
  getQueue(name) {
    const queue = this.queues.get(name);
    if (!queue) {
      throw new Error(`Queue '${name}' not found`);
    }
    return queue;
  }

  /**
   * Get all queue statuses
   */
  async getAllQueueStatuses() {
    const statuses = {};
    
    for (const [name, queue] of this.queues) {
      statuses[name] = await this.getQueueStatus(name);
    }
    
    return statuses;
  }

  /**
   * Get status for a specific queue
   */
  async getQueueStatus(queueName) {
    const queue = this.getQueue(queueName);
    
    const [
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused,
    ] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.getPausedCount(),
    ]);

    // Get job counts by state
    const jobCounts = await queue.getJobCounts();

    return {
      name: queueName,
      counts: {
        waiting,
        active,
        completed,
        failed,
        delayed,
        paused,
        total: waiting + active + completed + failed + delayed + paused,
      },
      jobCounts,
      isPaused: paused > 0,
    };
  }

  /**
   * Get jobs from a queue
   */
  async getQueueJobs(queueName, state, options = {}) {
    const queue = this.getQueue(queueName);
    const limit = parseInt(options.limit) || 50;
    const offset = parseInt(options.offset) || 0;

    let jobs;
    switch (state) {
      case 'waiting':
        jobs = await queue.getWaiting(offset, offset + limit - 1);
        break;
      case 'active':
        jobs = await queue.getActive(offset, offset + limit - 1);
        break;
      case 'completed':
        jobs = await queue.getCompleted(offset, offset + limit - 1);
        break;
      case 'failed':
        jobs = await queue.getFailed(offset, offset + limit - 1);
        break;
      case 'delayed':
        jobs = await queue.getDelayed(offset, offset + limit - 1);
        break;
      case 'paused':
        jobs = await queue.getPaused(offset, offset + limit - 1);
        break;
      default:
        throw new Error(`Invalid job state: ${state}`);
    }

    return jobs.map(job => ({
      id: job.id,
      name: job.name,
      data: job.data,
      opts: job.opts,
      progress: job.progress(),
      delay: job.delay,
      timestamp: job.timestamp,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      stacktrace: job.stacktrace,
      returnvalue: job.returnvalue,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    }));
  }

  /**
   * Get job details
   */
  async getJobDetails(queueName, jobId) {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);
    
    if (!job) {
      throw new Error('Job not found');
    }

    const state = await job.getState();
    
    return {
      id: job.id,
      name: job.name,
      data: job.data,
      opts: job.opts,
      progress: job.progress(),
      delay: job.delay,
      timestamp: job.timestamp,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      stacktrace: job.stacktrace,
      returnvalue: job.returnvalue,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      state,
    };
  }

  /**
   * Retry a failed job
   */
  async retryJob(queueName, jobId, userId) {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);
    
    if (!job) {
      throw new Error('Job not found');
    }

    const state = await job.getState();
    if (state !== 'failed') {
      throw new Error('Only failed jobs can be retried');
    }

    await job.retry();

    // Update corresponding ScrapingJob if applicable
    if (job.data.jobId) {
      await ScrapingJob.findByIdAndUpdate(job.data.jobId, {
        status: 'queued',
        'queue.attempts': job.attemptsMade + 1,
      });
    }

    await AuditLog.create({
      action: 'QUEUE_JOB_RETRIED',
      userId,
      entityType: 'QueueJob',
      entityId: jobId,
      details: { queueName, jobId },
    });

    return { success: true };
  }

  /**
   * Retry all failed jobs
   */
  async retryAllFailed(queueName, userId) {
    const queue = this.getQueue(queueName);
    const failedJobs = await queue.getFailed();
    
    const results = {
      total: failedJobs.length,
      retried: 0,
      failed: 0,
    };

    for (const job of failedJobs) {
      try {
        await job.retry();
        results.retried++;
      } catch (error) {
        results.failed++;
      }
    }

    await AuditLog.create({
      action: 'QUEUE_RETRY_ALL_FAILED',
      userId,
      entityType: 'Queue',
      details: { queueName, results },
    });

    return results;
  }

  /**
   * Remove a job from queue
   */
  async removeJob(queueName, jobId, userId) {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);
    
    if (!job) {
      throw new Error('Job not found');
    }

    await job.remove();

    // Update corresponding ScrapingJob if applicable
    if (job.data.jobId) {
      await ScrapingJob.findByIdAndUpdate(job.data.jobId, {
        status: 'cancelled',
        cancelledAt: new Date(),
      });
    }

    await AuditLog.create({
      action: 'QUEUE_JOB_REMOVED',
      userId,
      entityType: 'QueueJob',
      entityId: jobId,
      details: { queueName, jobId },
    });

    return { success: true };
  }

  /**
   * Clean queue (remove completed/failed jobs)
   */
  async cleanQueue(queueName, options = {}, userId) {
    const queue = this.getQueue(queueName);
    const { status = 'completed', gracePeriodMs = 86400000 } = options;

    let cleaned;
    switch (status) {
      case 'completed':
        cleaned = await queue.clean(gracePeriodMs, 'completed');
        break;
      case 'failed':
        cleaned = await queue.clean(gracePeriodMs, 'failed');
        break;
      case 'wait':
        cleaned = await queue.clean(gracePeriodMs, 'wait');
        break;
      case 'active':
        cleaned = await queue.clean(gracePeriodMs, 'active');
        break;
      case 'delayed':
        cleaned = await queue.clean(gracePeriodMs, 'delayed');
        break;
      case 'paused':
        cleaned = await queue.clean(gracePeriodMs, 'paused');
        break;
      case 'all':
        const results = await Promise.all([
          queue.clean(gracePeriodMs, 'completed'),
          queue.clean(gracePeriodMs, 'failed'),
          queue.clean(gracePeriodMs, 'wait'),
        ]);
        cleaned = results.flat();
        break;
      default:
        throw new Error(`Invalid status: ${status}`);
    }

    await AuditLog.create({
      action: 'QUEUE_CLEANED',
      userId,
      entityType: 'Queue',
      details: { queueName, status, gracePeriodMs, cleanedCount: cleaned.length },
    });

    return {
      cleaned: cleaned.length,
      jobs: cleaned.map(j => j.id),
    };
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName, userId) {
    const queue = this.getQueue(queueName);
    await queue.pause();

    await AuditLog.create({
      action: 'QUEUE_PAUSED',
      userId,
      entityType: 'Queue',
      details: { queueName },
    });

    return { success: true };
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName, userId) {
    const queue = this.getQueue(queueName);
    await queue.resume();

    await AuditLog.create({
      action: 'QUEUE_RESUMED',
      userId,
      entityType: 'Queue',
      details: { queueName },
    });

    return { success: true };
  }

  /**
   * Empty a queue (remove all waiting jobs)
   */
  async emptyQueue(queueName, userId) {
    const queue = this.getQueue(queueName);
    await queue.empty();

    await AuditLog.create({
      action: 'QUEUE_EMPTIED',
      userId,
      entityType: 'Queue',
      details: { queueName },
    });

    return { success: true };
  }

  /**
   * Get queue metrics
   */
  async getQueueMetrics(queueName, timeRange = {}) {
    const queue = this.getQueue(queueName);
    
    // Get completed jobs in time range
    const fromDate = timeRange.from ? new Date(timeRange.from) : new Date(Date.now() - 86400000);
    const toDate = timeRange.to ? new Date(timeRange.to) : new Date();

    const completedJobs = await queue.getCompleted();
    const failedJobs = await queue.getFailed();

    const filteredCompleted = completedJobs.filter(job => 
      job.finishedOn >= fromDate.getTime() && job.finishedOn <= toDate.getTime()
    );

    const filteredFailed = failedJobs.filter(job => 
      job.finishedOn >= fromDate.getTime() && job.finishedOn <= toDate.getTime()
    );

    // Calculate metrics
    const totalProcessed = filteredCompleted.length + filteredFailed.length;
    const successRate = totalProcessed > 0 
      ? Math.round((filteredCompleted.length / totalProcessed) * 100) 
      : 0;

    const avgProcessingTime = filteredCompleted.length > 0
      ? filteredCompleted.reduce((sum, job) => {
          const duration = job.finishedOn - job.processedOn;
          return sum + duration;
        }, 0) / filteredCompleted.length
      : 0;

    // Group by hour for chart data
    const hourlyData = {};
    [...filteredCompleted, ...filteredFailed].forEach(job => {
      const hour = new Date(job.finishedOn).toISOString().slice(0, 13) + ':00';
      if (!hourlyData[hour]) {
        hourlyData[hour] = { completed: 0, failed: 0 };
      }
      if (job.returnvalue) {
        hourlyData[hour].completed++;
      } else {
        hourlyData[hour].failed++;
      }
    });

    return {
      totalProcessed,
      completed: filteredCompleted.length,
      failed: filteredFailed.length,
      successRate,
      avgProcessingTime: Math.round(avgProcessingTime),
      hourlyData: Object.entries(hourlyData).map(([hour, data]) => ({
        hour,
        ...data,
      })),
    };
  }

  /**
   * Get failed job reasons
   */
  async getFailedJobReasons(queueName, limit = 10) {
    const queue = this.getQueue(queueName);
    const failedJobs = await queue.getFailed(0, limit - 1);

    const reasons = {};
    failedJobs.forEach(job => {
      const reason = job.failedReason || 'Unknown error';
      const key = reason.substring(0, 100); // Truncate long messages
      
      if (!reasons[key]) {
        reasons[key] = {
          message: reason,
          count: 0,
          jobs: [],
        };
      }
      reasons[key].count++;
      reasons[key].jobs.push(job.id);
    });

    return Object.values(reasons).sort((a, b) => b.count - a.count);
  }

  /**
   * Move job to delayed
   */
  async moveToDelayed(queueName, jobId, delayMs, userId) {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);
    
    if (!job) {
      throw new Error('Job not found');
    }

    await job.moveToDelayed(Date.now() + delayMs);

    await AuditLog.create({
      action: 'QUEUE_JOB_DELAYED',
      userId,
      entityType: 'QueueJob',
      entityId: jobId,
      details: { queueName, jobId, delayMs },
    });

    return { success: true };
  }

  /**
   * Promote delayed job
   */
  async promoteJob(queueName, jobId, userId) {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);
    
    if (!job) {
      throw new Error('Job not found');
    }

    await job.promote();

    await AuditLog.create({
      action: 'QUEUE_JOB_PROMOTED',
      userId,
      entityType: 'QueueJob',
      entityId: jobId,
      details: { queueName, jobId },
    });

    return { success: true };
  }

  /**
   * Get queue health status
   */
  async getQueueHealth() {
    const health = {
      overall: 'healthy',
      queues: {},
    };

    for (const [name, queue] of this.queues) {
      const status = await this.getQueueStatus(name);
      const failedRatio = status.counts.total > 0 
        ? status.counts.failed / status.counts.total 
        : 0;

      let queueHealth = 'healthy';
      if (failedRatio > 0.5) {
        queueHealth = 'critical';
        health.overall = 'critical';
      } else if (failedRatio > 0.2 || status.counts.failed > 100) {
        queueHealth = 'degraded';
        if (health.overall === 'healthy') {
          health.overall = 'degraded';
        }
      }

      health.queues[name] = {
        status: queueHealth,
        counts: status.counts,
        failedRatio: Math.round(failedRatio * 100),
      };
    }

    return health;
  }

  /**
   * Get worker status (if using separate workers)
   */
  async getWorkerStatus() {
    // This would integrate with your worker monitoring system
    // For now, return placeholder data
    return {
      totalWorkers: 4,
      activeWorkers: 3,
      idleWorkers: 1,
      workers: [
        { id: 'worker-1', status: 'active', currentJob: 'job-123', queue: 'cv-scraping' },
        { id: 'worker-2', status: 'active', currentJob: 'job-124', queue: 'cv-scraping' },
        { id: 'worker-3', status: 'active', currentJob: 'job-125', queue: 'data-processing' },
        { id: 'worker-4', status: 'idle', currentJob: null, queue: null },
      ],
    };
  }
}

module.exports = new QueueManagementService();