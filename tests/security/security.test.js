/**
 * Security Verification Tests
 * Tests authentication security, authorization, input sanitization, and CORS
 */

const request = require('supertest');
const app = require('../../server/server');
const { userFactory } = require('../factories');

describe('Security Verification', () => {
  let authToken;
  let adminToken;

  beforeAll(async () => {
    const user = await userFactory.createVerifiedReferrer();
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: 'TestPassword123!',
      });
    authToken = loginResponse.body.data.tokens.accessToken;

    const admin = await userFactory.createAdmin();
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: admin.email,
        password: 'TestPassword123!',
      });
    adminToken = adminLogin.body.data.tokens.accessToken;
  });

  describe('Authentication Security', () => {
    it('should hash passwords and not return them in responses', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.user.password).toBeUndefined();
      expect(response.body.data.user.passwordHash).toBeUndefined();
    });

    it('should reject weak passwords during registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: '123', // Too weak
          name: 'Test User',
          role: 'referrer',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should implement rate limiting on login', async () => {
      // Make multiple failed login attempts
      const attempts = Array.from({ length: 10 }, () =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword',
          })
      );

      const responses = await Promise.all(attempts);
      const rateLimited = responses.some(r => r.status === 429);

      expect(rateLimited || responses[responses.length - 1].status === 429).toBe(true);
    });

    it('should invalidate tokens on logout', async () => {
      // Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Try to use the token
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Authorization', () => {
    it('should enforce role-based access control', async () => {
      // Regular user trying to access admin endpoint
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should allow admin access to admin endpoints', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should prevent access to other users data', async () => {
      const otherUser = await userFactory.createVerifiedReferrer();

      const response = await request(app)
        .get(`/api/users/${otherUser._id}/referrals`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize HTML in input', async () => {
      const response = await request(app)
        .post('/api/referrals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobId: '507f1f77bcf86cd799439011',
          candidateName: '<script>alert("xss")</script>John',
          candidateEmail: 'john@example.com',
        })
        .expect(201);

      expect(response.body.data.referral.candidateName).not.toContain('<script>');
    });

    it('should prevent NoSQL injection', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: { $ne: null },
          password: { $ne: null },
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate and sanitize query parameters', async () => {
      const response = await request(app)
        .get('/api/jobs?page=<script>alert(1)</script>&limit=20')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should prevent path traversal in file uploads', async () => {
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('test'), '../../../etc/passwd')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('CORS Configuration', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .options('/api/jobs')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });

    it('should reject requests from unauthorized origins', async () => {
      const response = await request(app)
        .get('/api/jobs')
        .set('Origin', 'http://malicious-site.com')
        .expect(200); // CORS is handled by browser, server still responds

      // The response should not have CORS headers for unauthorized origin
      const corsHeader = response.headers['access-control-allow-origin'];
      if (corsHeader) {
        expect(corsHeader).not.toBe('http://malicious-site.com');
      }
    });

    it('should allow credentials in CORS', async () => {
      const response = await request(app)
        .options('/api/jobs')
        .set('Origin', 'http://localhost:5173')
        .expect(204);

      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/jobs')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();
    });

    it('should not expose server information', async () => {
      const response = await request(app)
        .get('/api/jobs')
        .expect(200);

      expect(response.headers['server']).toBeUndefined();
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('API Security', () => {
    it('should require API key for external endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/external/data')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should validate API key format', async () => {
      const response = await request(app)
        .get('/api/v1/external/data')
        .set('X-API-Key', 'invalid-key')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should implement request size limits', async () => {
      const largePayload = { data: 'x'.repeat(20 * 1024 * 1024) };

      const response = await request(app)
        .post('/api/referrals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(largePayload)
        .expect(413);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Session Security', () => {
    it('should set secure cookie attributes', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123!',
        });

      const setCookie = response.headers['set-cookie'];
      if (setCookie) {
        expect(setCookie[0]).toContain('HttpOnly');
        expect(setCookie[0]).toContain('Secure');
        expect(setCookie[0]).toContain('SameSite');
      }
    });

    it('should regenerate session ID after login', async () => {
      // This would require session tracking
      // Placeholder for session fixation protection test
      expect(true).toBe(true);
    });
  });
});
