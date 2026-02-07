/**
 * Performance Verification Tests
 * Tests API response times, database query performance, and cache efficiency
 */

const request = require('supertest');
const app = require('../../server/server');
const { User, Job, Referral } = require('../../server/models');
const { userFactory, jobFactory, referralFactory } = require('../factories');
const cacheService = require('../../server/services/cacheService');

describe('Performance Verification', () => {
  let authToken;

  beforeAll(async () => {
    const user = await userFactory.createVerifiedReferrer();
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: 'TestPassword123!',
      });
    authToken = loginResponse.body.data.tokens.accessToken;
  });

  describe('API Response Times', () => {
    it('should respond to health check within 100ms', async () => {
      const start = Date.now();
      await request(app).get('/api/health').expect(200);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(100);
    });

    it('should respond to auth endpoints within 500ms', async () => {
      const start = Date.now();
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(500);
    });

    it('should respond to referral list within 300ms', async () => {
      const start = Date.now();
      await request(app)
        .get('/api/referrals')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(300);
    });

    it('should respond to job list within 200ms', async () => {
      const start = Date.now();
      await request(app)
        .get('/api/jobs?page=1&limit=20')
        .expect(200);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(200);
    });

    it('should respond to dashboard stats within 400ms', async () => {
      const start = Date.now();
      await request(app)
        .get('/api/referrals/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(400);
    });
  });

  describe('Database Query Performance', () => {
    beforeAll(async () => {
      // Seed database with test data
      const users = await Promise.all(
        Array.from({ length: 100 }, () => userFactory.create())
      );

      const jobs = await Promise.all(
        Array.from({ length: 50 }, () => jobFactory.create())
      );

      await Promise.all(
        Array.from({ length: 500 }, (_, i) =>
          referralFactory.create({
            referrerId: users[i % users.length]._id,
            jobId: jobs[i % jobs.length]._id,
          })
        )
      );
    });

    it('should query referrals with pagination efficiently', async () => {
      const start = Date.now();
      const referrals = await Referral.find()
        .limit(20)
        .skip(0)
        .populate('jobId', 'title')
        .lean();
      const duration = Date.now() - start;

      expect(referrals.length).toBe(20);
      expect(duration).toBeLessThan(100);
    });

    it('should query user with referrals efficiently', async () => {
      const user = await User.findOne();
      
      const start = Date.now();
      const referrals = await Referral.find({ referrerId: user._id })
        .limit(50)
        .lean();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50);
    });

    it('should aggregate referral stats efficiently', async () => {
      const start = Date.now();
      const stats = await Referral.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalEarnings: { $sum: '$earnings' },
          },
        },
      ]);
      const duration = Date.now() - start;

      expect(stats.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(200);
    });

    it('should use indexes for common queries', async () => {
      const user = await User.findOne();
      
      const explain = await Referral.find({ referrerId: user._id })
        .explain('executionStats');

      expect(explain.executionStats.totalDocsExamined).toBeLessThanOrEqual(
        explain.executionStats.nReturned * 2
      );
    });
  });

  describe('Cache Performance', () => {
    it('should serve cached data faster than database', async () => {
      const cacheKey = 'test:performance:data';
      const testData = { id: 1, data: 'test'.repeat(1000) };

      // First request - cache miss
      await cacheService.set(cacheKey, testData, 60);
      
      const cacheStart = Date.now();
      const cachedData = await cacheService.get(cacheKey);
      const cacheDuration = Date.now() - cacheStart;

      expect(cachedData).toEqual(testData);
      expect(cacheDuration).toBeLessThan(10); // Should be very fast
    });

    it('should handle cache-aside pattern efficiently', async () => {
      const cacheKey = 'test:cache-aside';
      let callCount = 0;

      const fetchData = async () => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate DB query
        return { data: 'expensive' };
      };

      // First call - should hit database
      const result1 = await cacheService.getOrSet(cacheKey, fetchData, 60);
      expect(callCount).toBe(1);

      // Second call - should hit cache
      const result2 = await cacheService.getOrSet(cacheKey, fetchData, 60);
      expect(callCount).toBe(1); // Should not call fetchData again
      expect(result2).toEqual(result1);
    });

    it('should handle high cache throughput', async () => {
      const operations = Array.from({ length: 1000 }, (_, i) =>
        cacheService.set(`perf:${i}`, { index: i }, 60)
      );

      const start = Date.now();
      await Promise.all(operations);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle concurrent reads efficiently', async () => {
      const requests = Array.from({ length: 50 }, () =>
        request(app)
          .get('/api/jobs?page=1&limit=20')
      );

      const start = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - start;

      const allSuccessful = responses.every(r => r.status === 200);
      expect(allSuccessful).toBe(true);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should handle mixed read/write operations', async () => {
      const operations = [
        ...Array.from({ length: 20 }, () =>
          request(app).get('/api/jobs?page=1&limit=20')
        ),
        ...Array.from({ length: 10 }, () =>
          request(app)
            .post('/api/referrals')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              jobId: '507f1f77bcf86cd799439011',
              candidateName: 'Concurrent Test',
              candidateEmail: `concurrent${Date.now()}@example.com`,
            })
        ),
      ];

      const start = Date.now();
      const responses = await Promise.all(operations);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(3000);
    });
  });

  describe('Memory Usage', () => {
    it('should not have memory leaks in repeated operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform operations multiple times
      for (let i = 0; i < 100; i++) {
        await request(app)
          .get('/api/jobs?page=1&limit=20')
          .expect(200);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      // Memory growth should be minimal (less than 50MB)
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
    });
  });
});
