/**
 * Queue (Bull) Integration Tests
 * Tests for job queue processing
 */

const Queue = require('bull');
const { createMockQueue, cleanupQueues } = require('../../utils/test-helpers');

describe('Queue Integration', () => {
  let testQueue;

  beforeEach(async () => {
    testQueue = createMockQueue('test-queue');
  });

  afterEach(async () => {
    await cleanupQueues();
  });

  describe('Job Processing', () => {
    it('should process a job successfully', async () => {
      const processor = jest.fn().mockResolvedValue({ success: true });
      testQueue.process(processor);

      const job = await testQueue.add({ data: 'test' });
      
      // Wait for job to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(processor).toHaveBeenCalledWith(
        expect.objectContaining({ data: { data: 'test' } }),
        expect.anything()
      );
    });

    it('should handle job failures', async () => {
      const processor = jest.fn().mockRejectedValue(new Error('Job failed'));
      testQueue.process(processor);

      const job = await testQueue.add({ data: 'test' });
      
      await new Promise(resolve => setTimeout(resolve, 100));

      const failedJobs = await testQueue.getFailed();
      expect(failedJobs.length).toBeGreaterThan(0);
    });

    it('should retry failed jobs', async () => {
      let attempts = 0;
      const processor = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return { success: true };
      });

      testQueue.process(processor);

      await testQueue.add({ data: 'test' }, { attempts: 3, backoff: 100 });
      
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(attempts).toBe(3);
    });
  });

  describe('Job Scheduling', () => {
    it('should schedule delayed jobs', async () => {
      const processor = jest.fn().mockResolvedValue({ success: true });
      testQueue.process(processor);

      const delay = 200;
      await testQueue.add({ data: 'delayed' }, { delay });

      // Job should not be processed immediately
      expect(processor).not.toHaveBeenCalled();

      // Wait for delay
      await new Promise(resolve => setTimeout(resolve, delay + 100));

      expect(processor).toHaveBeenCalled();
    });

    it('should handle job priorities', async () => {
      const processedJobs = [];
      const processor = jest.fn().mockImplementation((job) => {
        processedJobs.push(job.data.priority);
        return Promise.resolve({ success: true });
      });

      testQueue.process(processor);

      // Add jobs with different priorities
      await testQueue.add({ priority: 'low' }, { priority: 3 });
      await testQueue.add({ priority: 'high' }, { priority: 1 });
      await testQueue.add({ priority: 'medium' }, { priority: 2 });

      await new Promise(resolve => setTimeout(resolve, 200));

      // High priority should be processed first
      expect(processedJobs[0]).toBe('high');
    });
  });

  describe('Queue Events', () => {
    it('should emit completed event', async () => {
      const completedHandler = jest.fn();
      testQueue.on('completed', completedHandler);

      testQueue.process(() => Promise.resolve({ result: 'success' }));
      await testQueue.add({ data: 'test' });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(completedHandler).toHaveBeenCalled();
    });

    it('should emit failed event', async () => {
      const failedHandler = jest.fn();
      testQueue.on('failed', failedHandler);

      testQueue.process(() => Promise.reject(new Error('Failed')));
      await testQueue.add({ data: 'test' });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(failedHandler).toHaveBeenCalled();
    });
  });

  describe('Rate Limiting', () => {
    it('should respect rate limits', async () => {
      const processedCount = { count: 0 };
      const processor = jest.fn().mockImplementation(() => {
        processedCount.count++;
        return Promise.resolve({ success: true });
      });

      testQueue.process(processor);
      testQueue.limiter = { max: 2, duration: 1000 };

      // Add multiple jobs
      for (let i = 0; i < 5; i++) {
        await testQueue.add({ index: i });
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      // Should only process 2 jobs in the first second
      expect(processedCount.count).toBeLessThanOrEqual(2);
    });
  });
});
