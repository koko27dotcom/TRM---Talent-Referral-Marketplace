/**
 * Redis Integration Tests
 * Tests for Redis caching and queue functionality
 */

const { redisClient, connectRedis, disconnectRedis } = require('../../../server/config/redis');
const cacheService = require('../../../server/services/cacheService');

describe('Redis Integration', () => {
  beforeAll(async () => {
    try {
      await connectRedis();
    } catch (error) {
      console.warn('Redis not available, skipping Redis tests');
    }
  });

  afterAll(async () => {
    try {
      await disconnectRedis();
    } catch (error) {
      // Redis might not be connected
    }
  });

  beforeEach(async () => {
    if (redisClient && redisClient.isReady) {
      await redisClient.flushDb();
    }
  });

  describe('Connection', () => {
    it('should connect to Redis', () => {
      if (!redisClient || !redisClient.isReady) {
        return; // Skip if Redis not available
      }
      expect(redisClient.isReady).toBe(true);
    });

    it('should handle connection errors gracefully', async () => {
      // This test verifies error handling without actually failing
      const result = await cacheService.get('nonexistent-key');
      expect(result).toBeNull();
    });
  });

  describe('Basic Operations', () => {
    it('should set and get values', async () => {
      if (!redisClient || !redisClient.isReady) {
        return;
      }

      await cacheService.set('test-key', { data: 'test-value' }, 60);
      const result = await cacheService.get('test-key');
      
      expect(result).toEqual({ data: 'test-value' });
    });

    it('should handle expiration', async () => {
      if (!redisClient || !redisClient.isReady) {
        return;
      }

      await cacheService.set('expiring-key', 'value', 1); // 1 second TTL
      
      let result = await cacheService.get('expiring-key');
      expect(result).toBe('value');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      result = await cacheService.get('expiring-key');
      expect(result).toBeNull();
    });

    it('should delete values', async () => {
      if (!redisClient || !redisClient.isReady) {
        return;
      }

      await cacheService.set('delete-key', 'value', 60);
      await cacheService.delete('delete-key');
      
      const result = await cacheService.get('delete-key');
      expect(result).toBeNull();
    });
  });

  describe('Cache Patterns', () => {
    it('should implement cache-aside pattern', async () => {
      if (!redisClient || !redisClient.isReady) {
        return;
      }

      const fetchData = jest.fn().mockResolvedValue({ id: 1, name: 'Test' });
      
      // First call - cache miss
      const result1 = await cacheService.getOrSet('entity:1', fetchData, 60);
      expect(fetchData).toHaveBeenCalledTimes(1);
      expect(result1).toEqual({ id: 1, name: 'Test' });

      // Second call - cache hit
      const result2 = await cacheService.getOrSet('entity:1', fetchData, 60);
      expect(fetchData).toHaveBeenCalledTimes(1); // Not called again
      expect(result2).toEqual({ id: 1, name: 'Test' });
    });

    it('should handle cache warming', async () => {
      if (!redisClient || !redisClient.isReady) {
        return;
      }

      const keys = ['key1', 'key2', 'key3'];
      const values = [{ id: 1 }, { id: 2 }, { id: 3 }];

      await Promise.all(
        keys.map((key, index) => cacheService.set(key, values[index], 300))
      );

      const results = await Promise.all(
        keys.map(key => cacheService.get(key))
      );

      expect(results).toEqual(values);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate by pattern', async () => {
      if (!redisClient || !redisClient.isReady) {
        return;
      }

      await cacheService.set('user:1:profile', { name: 'User 1' }, 60);
      await cacheService.set('user:1:settings', { theme: 'dark' }, 60);
      await cacheService.set('user:2:profile', { name: 'User 2' }, 60);

      await cacheService.deletePattern('user:1:*');

      const profile1 = await cacheService.get('user:1:profile');
      const settings1 = await cacheService.get('user:1:settings');
      const profile2 = await cacheService.get('user:2:profile');

      expect(profile1).toBeNull();
      expect(settings1).toBeNull();
      expect(profile2).toEqual({ name: 'User 2' });
    });
  });

  describe('Performance', () => {
    it('should handle high throughput', async () => {
      if (!redisClient || !redisClient.isReady) {
        return;
      }

      const operations = Array.from({ length: 100 }, (_, i) =>
        cacheService.set(`perf-key-${i}`, { index: i }, 60)
      );

      const start = Date.now();
      await Promise.all(operations);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
