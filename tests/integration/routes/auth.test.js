/**
 * Auth Routes Integration Tests
 * Tests for authentication API endpoints
 */

const request = require('supertest');
const app = require('../../../server/server');
const { User } = require('../../../server/models');
const { userFactory } = require('../../factories');

describe('Auth Routes', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new referrer user', async () => {
      const userData = {
        email: 'newreferrer@example.com',
        password: 'StrongPassword123!',
        name: 'New Referrer',
        role: 'referrer',
        phone: '+959123456789',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.tokens).toBeDefined();
      expect(response.body.data.tokens.accessToken).toBeDefined();
    });

    it('should register a new job seeker', async () => {
      const userData = {
        email: 'jobseeker@example.com',
        password: 'StrongPassword123!',
        name: 'Job Seeker',
        role: 'job_seeker',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.data.user.role).toBe('job_seeker');
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'StrongPassword123!',
        name: 'Test User',
        role: 'referrer',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'weak',
        name: 'Test User',
        role: 'referrer',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject duplicate email registration', async () => {
      const existingUser = await userFactory.create({ email: 'existing@example.com' });

      const userData = {
        email: 'existing@example.com',
        password: 'StrongPassword123!',
        name: 'Test User',
        role: 'referrer',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
    });

    it('should validate invite code for referrer registration', async () => {
      const referrer = await userFactory.createVerifiedReferrer();

      const userData = {
        email: 'newuser@example.com',
        password: 'StrongPassword123!',
        name: 'New User',
        role: 'referrer',
        inviteCode: referrer.referrerProfile.inviteCode,
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const password = 'TestPassword123!';
      const user = await userFactory.create({ password });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(user.email);
      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.body.data.tokens.refreshToken).toBeDefined();
    });

    it('should reject login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject login with invalid password', async () => {
      const user = await userFactory.create({ password: 'CorrectPassword123!' });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject login for inactive user', async () => {
      const password = 'TestPassword123!';
      const user = await userFactory.create({
        password,
        isActive: false,
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject login for unverified email', async () => {
      const password = 'TestPassword123!';
      const user = await userFactory.create({
        password,
        isEmailVerified: false,
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const user = await userFactory.create();
      const { generateTokens } = require('../../../server/middleware/auth');
      const tokens = generateTokens(user);

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: tokens.refreshToken,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid_token',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject expired refresh token', async () => {
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { sub: '123' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '-1s' }
      );

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: expiredToken,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout authenticated user', async () => {
      const user = await userFactory.create();
      const { generateTokens } = require('../../../server/middleware/auth');
      const tokens = generateTokens(user);

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject logout without authentication', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should send password reset email for existing user', async () => {
      const user = await userFactory.create();

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: user.email,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return success even for non-existent email (security)', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      const user = await userFactory.create();
      const { generatePasswordResetToken } = require('../../../server/middleware/auth');
      const resetToken = generatePasswordResetToken(user);

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: 'NewPassword123!',
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify new password works
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'NewPassword123!',
        });

      expect(loginResponse.body.success).toBe(true);
    });

    it('should reject invalid reset token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid_token',
          password: 'NewPassword123!',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject weak new password', async () => {
      const user = await userFactory.create();
      const { generatePasswordResetToken } = require('../../../server/middleware/auth');
      const resetToken = generatePasswordResetToken(user);

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: 'weak',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user profile', async () => {
      const user = await userFactory.create();
      const { generateTokens } = require('../../../server/middleware/auth');
      const tokens = generateTokens(user);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(user.email);
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/auth/me', () => {
    it('should update user profile', async () => {
      const user = await userFactory.create();
      const { generateTokens } = require('../../../server/middleware/auth');
      const tokens = generateTokens(user);

      const response = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          name: 'Updated Name',
          phone: '+959987654321',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.name).toBe('Updated Name');
    });

    it('should reject update with invalid data', async () => {
      const user = await userFactory.create();
      const { generateTokens } = require('../../../server/middleware/auth');
      const tokens = generateTokens(user);

      const response = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          email: 'invalid-email',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
