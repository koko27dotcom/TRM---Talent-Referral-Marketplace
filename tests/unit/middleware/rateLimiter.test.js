/**
 * Rate Limiter Middleware Unit Tests
 * Tests for rate limiting functionality
 */

const rateLimiter = require('../../../server/middleware/enhancedRateLimiter');
const { createMockRequest, createMockResponse, createMockNext } = require('../../utils/test-helpers');
const { redisClient } = require('../../../server/config/redis');

jest.mock('../../../server/config/redis');

describe('Rate Limiter Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisClient.get = jest.fn().mockResolvedValue(null);
    redisClient.setex = jest.fn().mockResolvedValue('OK');
    redisClient.incr = jest.fn().mockResolvedValue(1);
    redisClient.ttl = jest.fn().mockResolvedValue(900);
  });

  describe('Standard Rate Limiter', () => {
    it('should allow request within rate limit', async () => {
      const req = createMockRequest({
        ip: '127.0.0.1',
        path: '/api/test',
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = rateLimiter({
        windowMs: 900000,
        max: 100,
      });

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });

    it('should block request exceeding rate limit', async () => {
      redisClient.incr = jest.fn().mockResolvedValue(101);

      const req = createMockRequest({
        ip: '127.0.0.1',
        path: '/api/test',
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = rateLimiter({
        windowMs: 900000,
        max: 100,
      });

      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(429);
      expect(res.data).toMatchObject({
        error: expect.objectContaining({
          code: 'RATE_LIMIT_EXCEEDED',
        }),
      });
    });

    it('should set rate limit headers', async () => {
      redisClient.incr = jest.fn().mockResolvedValue(50);
      redisClient.ttl = jest.fn().mockResolvedValue(450);

      const req = createMockRequest({
        ip: '127.0.0.1',
        path: '/api/test',
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = rateLimiter({
        windowMs: 900000,
        max: 100,
      });

      await middleware(req, res, next);

      expect(res.headers['X-RateLimit-Limit']).toBe('100');
      expect(res.headers['X-RateLimit-Remaining']).toBe('50');
      expect(res.headers['X-RateLimit-Reset']).toBeDefined();
    });
  });

  describe('Authenticated Rate Limiter', () => {
    it('should use user ID for authenticated users', async () => {
      const req = createMockRequest({
        user: { _id: 'user123' },
        ip: '127.0.0.1',
        path: '/api/test',
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = rateLimiter({
        windowMs: 900000,
        max: 1000,
        keyGenerator: (req) => req.user?._id || req.ip,
      });

      await middleware(req, res, next);

      expect(redisClient.incr).toHaveBeenCalledWith(expect.stringContaining('user123'));
    });

    it('should use IP for unauthenticated users', async () => {
      const req = createMockRequest({
        ip: '192.168.1.1',
        path: '/api/test',
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = rateLimiter({
        windowMs: 900000,
        max: 100,
        keyGenerator: (req) => req.user?._id || req.ip,
      });

      await middleware(req, res, next);

      expect(redisClient.incr).toHaveBeenCalledWith(expect.stringContaining('192.168.1.1'));
    });
  });

  describe('Skip Rate Limiting', () => {
    it('should skip rate limiting for whitelisted IPs', async () => {
      const req = createMockRequest({
        ip: '10.0.0.1',
        path: '/api/test',
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = rateLimiter({
        windowMs: 900000,
        max: 100,
        skip: (req) => req.ip.startsWith('10.0.0.'),
      });

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(redisClient.incr).not.toHaveBeenCalled();
    });

    it('should skip rate limiting for specific paths', async () => {
      const req = createMockRequest({
        ip: '127.0.0.1',
        path: '/health',
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = rateLimiter({
        windowMs: 900000,
        max: 100,
        skip: (req) => req.path === '/health',
      });

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(redisClient.incr).not.toHaveBeenCalled();
    });
  });

  describe('Custom Handler', () => {
    it('should use custom handler when provided', async () => {
      redisClient.incr = jest.fn().mockResolvedValue(101);
      const customHandler = jest.fn();

      const req = createMockRequest({
        ip: '127.0.0.1',
        path: '/api/test',
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = rateLimiter({
        windowMs: 900000,
        max: 100,
        handler: customHandler,
      });

      await middleware(req, res, next);

      expect(customHandler).toHaveBeenCalledWith(req, res, next, expect.any(Object));
    });
  });

  describe('Redis Connection Errors', () => {
    it('should allow request when Redis is unavailable', async () => {
      redisClient.incr = jest.fn().mockRejectedValue(new Error('Redis connection failed'));

      const req = createMockRequest({
        ip: '127.0.0.1',
        path: '/api/test',
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = rateLimiter({
        windowMs: 900000,
        max: 100,
      });

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Different Window Sizes', () => {
    it('should handle short window (per second)', async () => {
      const req = createMockRequest({
        ip: '127.0.0.1',
        path: '/api/test',
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = rateLimiter({
        windowMs: 1000,
        max: 10,
      });

      await middleware(req, res, next);

      expect(redisClient.setex).toHaveBeenCalledWith(
        expect.any(String),
        1,
        1
      );
    });

    it('should handle long window (per day)', async () => {
      const req = createMockRequest({
        ip: '127.0.0.1',
        path: '/api/test',
      });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = rateLimiter({
        windowMs: 24 * 60 * 60 * 1000,
        max: 10000,
      });

      await middleware(req, res, next);

      expect(redisClient.setex).toHaveBeenCalledWith(
        expect.any(String),
        86400,
        1
      );
    });
  });
});
