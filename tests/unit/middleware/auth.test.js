/**
 * Auth Middleware Unit Tests
 * Tests for authentication and authorization middleware
 */

const jwt = require('jsonwebtoken');
const {
  authenticate,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  extractTokenFromHeader,
  requireRole,
} = require('../../../server/middleware/auth');
const { User } = require('../../../server/models');
const { userFactory } = require('../../factories');
const { createMockRequest, createMockResponse, createMockNext } = require('../../utils/test-helpers');

describe('Auth Middleware', () => {
  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      const user = await userFactory.create();
      const tokens = generateTokens(user);

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresIn).toBe(900);
    });

    it('should include user data in access token payload', async () => {
      const user = await userFactory.create({
        email: 'test@example.com',
        role: 'referrer',
        name: 'Test User',
      });
      const tokens = generateTokens(user);

      const decoded = jwt.verify(tokens.accessToken, process.env.JWT_ACCESS_SECRET);
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.role).toBe('referrer');
      expect(decoded.name).toBe('Test User');
    });

    it('should include companyId for corporate users', async () => {
      const company = await require('../../factories/company.factory').create();
      const user = await userFactory.create({
        role: 'corporate_admin',
        companyId: company._id,
      });
      const tokens = generateTokens(user);

      const decoded = jwt.verify(tokens.accessToken, process.env.JWT_ACCESS_SECRET);
      expect(decoded.companyId).toBe(company._id.toString());
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', async () => {
      const user = await userFactory.create();
      const tokens = generateTokens(user);

      const decoded = verifyAccessToken(tokens.accessToken);
      expect(decoded.sub).toBe(user._id.toString());
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyAccessToken('invalid_token')).toThrow();
    });

    it('should throw error for expired token', () => {
      const expiredToken = jwt.sign(
        { sub: '123', email: 'test@example.com' },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '-1s' }
      );

      expect(() => verifyAccessToken(expiredToken)).toThrow('jwt expired');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', async () => {
      const user = await userFactory.create();
      const tokens = generateTokens(user);

      const decoded = verifyRefreshToken(tokens.refreshToken);
      expect(decoded.sub).toBe(user._id.toString());
    });

    it('should throw error for invalid refresh token', () => {
      expect(() => verifyRefreshToken('invalid_token')).toThrow();
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from Authorization header', () => {
      const req = createMockRequest({
        headers: {
          authorization: 'Bearer test_token_123',
        },
      });

      const token = extractTokenFromHeader(req);
      expect(token).toBe('test_token_123');
    });

    it('should return null if no Authorization header', () => {
      const req = createMockRequest();

      const token = extractTokenFromHeader(req);
      expect(token).toBeNull();
    });

    it('should return null if header does not start with Bearer', () => {
      const req = createMockRequest({
        headers: {
          authorization: 'Basic test_token',
        },
      });

      const token = extractTokenFromHeader(req);
      expect(token).toBeNull();
    });
  });

  describe('authenticate middleware', () => {
    it('should authenticate valid token and set user', async () => {
      const user = await userFactory.create();
      const tokens = generateTokens(user);
      const req = createMockRequest({
        headers: {
          authorization: `Bearer ${tokens.accessToken}`,
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user._id.toString()).toBe(user._id.toString());
    });

    it('should return 401 if no token provided', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.data).toMatchObject({
        success: false,
        error: expect.objectContaining({
          code: 'AUTHENTICATION_ERROR',
        }),
      });
    });

    it('should return 401 for invalid token', async () => {
      const req = createMockRequest({
        headers: {
          authorization: 'Bearer invalid_token',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(res.statusCode).toBe(401);
    });

    it('should return 401 for expired token', async () => {
      const expiredToken = jwt.sign(
        { sub: '123', email: 'test@example.com' },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '-1s' }
      );

      const req = createMockRequest({
        headers: {
          authorization: `Bearer ${expiredToken}`,
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(res.statusCode).toBe(401);
    });

    it('should return 401 if user not found', async () => {
      const fakeUserId = '507f1f77bcf86cd799439011';
      const token = jwt.sign(
        { sub: fakeUserId, email: 'test@example.com', role: 'referrer' },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
      );

      const req = createMockRequest({
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(res.statusCode).toBe(401);
    });

    it('should return 401 if user is inactive', async () => {
      const user = await userFactory.create({ isActive: false });
      const tokens = generateTokens(user);
      const req = createMockRequest({
        headers: {
          authorization: `Bearer ${tokens.accessToken}`,
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(res.statusCode).toBe(401);
    });
  });

  describe('requireRole middleware', () => {
    it('should allow access for matching role', async () => {
      const user = await userFactory.create({ role: 'referrer' });
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireRole('referrer');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow access for multiple allowed roles', async () => {
      const user = await userFactory.create({ role: 'corporate_admin' });
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireRole(['referrer', 'corporate_admin']);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return 403 for non-matching role', async () => {
      const user = await userFactory.create({ role: 'referrer' });
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireRole('platform_admin');
      await middleware(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res.data).toMatchObject({
        success: false,
        error: expect.objectContaining({
          code: 'AUTHORIZATION_ERROR',
        }),
      });
    });

    it('should return 403 if no user in request', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireRole('referrer');
      await middleware(req, res, next);

      expect(res.statusCode).toBe(403);
    });

    it('should allow admin access to all roles', async () => {
      const user = await userFactory.create({ role: 'platform_admin' });
      const req = createMockRequest({ user });
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireRole('corporate_admin');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
