/**
 * Error Handling Integration Tests
 * Tests error scenarios and error boundaries
 */

const request = require('supertest');
const app = require('../../server/server');
const { userFactory } = require('../factories');

describe('Error Handling Integration', () => {
  let authToken;

  beforeEach(async () => {
    const user = await userFactory.createVerifiedReferrer();
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: 'TestPassword123!',
      });
    authToken = loginResponse.body.data.tokens.accessToken;
  });

  describe('Validation Errors', () => {
    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/referrals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(Array.isArray(response.body.errors)).toBe(true);
    });

    it('should handle invalid data types', async () => {
      const response = await request(app)
        .post('/api/referrals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobId: 'invalid-id',
          candidateName: 12345, // Should be string
          candidateEmail: 'not-an-email',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle string length violations', async () => {
      const response = await request(app)
        .post('/api/referrals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobId: '507f1f77bcf86cd799439011',
          candidateName: 'A', // Too short
          candidateEmail: 'test@example.com',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Authentication Errors', () => {
    it('should reject requests without token', async () => {
      const response = await request(app)
        .get('/api/referrals')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('authentication');
    });

    it('should reject invalid tokens', async () => {
      const response = await request(app)
        .get('/api/referrals')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject expired tokens', async () => {
      // Create a token that appears expired
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.4AdcjSOP6g9xJ2y0r8Z7q9X1y2Z3a4b5c6d7e8f9g0h';

      const response = await request(app)
        .get('/api/referrals')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/referrals')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Authorization Errors', () => {
    it('should reject access to other user resources', async () => {
      const otherUser = await userFactory.createVerifiedReferrer();

      const response = await request(app)
        .get(`/api/users/${otherUser._id}/private-data`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should reject admin-only endpoints for regular users', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Not Found Errors', () => {
    it('should handle non-existent resources', async () => {
      const response = await request(app)
        .get('/api/referrals/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should handle non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/non-existent-endpoint')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting Errors', () => {
    it('should handle rate limit exceeded', async () => {
      // Make many requests quickly
      const requests = Array.from({ length: 150 }, () =>
        request(app)
          .get('/api/referrals')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);

      expect(rateLimited).toBe(true);
    });
  });

  describe('Payload Errors', () => {
    it('should handle payload too large', async () => {
      const largePayload = {
        data: 'x'.repeat(20 * 1024 * 1024), // 20MB
      };

      const response = await request(app)
        .post('/api/referrals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(largePayload)
        .expect(413);

      expect(response.body.success).toBe(false);
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/referrals')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{"invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Database Errors', () => {
    it('should handle duplicate key errors gracefully', async () => {
      // Create first referral
      await request(app)
        .post('/api/referrals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobId: '507f1f77bcf86cd799439011',
          candidateName: 'John Doe',
          candidateEmail: 'john@example.com',
        });

      // Try to create duplicate
      const response = await request(app)
        .post('/api/referrals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobId: '507f1f77bcf86cd799439011',
          candidateName: 'John Doe',
          candidateEmail: 'john@example.com',
        })
        .expect(409);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error format', async () => {
      const response = await request(app)
        .get('/api/referrals')
        .expect(401);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body.success).toBe(false);
      expect(typeof response.body.message).toBe('string');
    });

    it('should include error codes when applicable', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body).toHaveProperty('code');
      expect(response.body.code).toBeDefined();
    });

    it('should include request ID for tracing', async () => {
      const response = await request(app)
        .get('/api/referrals')
        .expect(401);

      expect(response.headers['x-request-id']).toBeDefined();
    });
  });
});
