/**
 * Referral Routes Integration Tests
 * Tests for referral API endpoints
 */

const request = require('supertest');
const app = require('../../../server/server');
const { Referral, Job, User } = require('../../../server/models');
const { userFactory, jobFactory, referralFactory } = require('../../factories');

describe('Referral Routes', () => {
  let authToken;
  let referrer;
  let job;

  beforeEach(async () => {
    // Create a verified referrer and get auth token
    referrer = await userFactory.createVerifiedReferrer();
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: referrer.email,
        password: 'TestPassword123!',
      });
    authToken = loginResponse.body.data.tokens.accessToken;

    // Create a job
    job = await jobFactory.create();
  });

  describe('POST /api/referrals', () => {
    it('should create a new referral', async () => {
      const referralData = {
        jobId: job._id.toString(),
        candidateName: 'John Doe',
        candidateEmail: 'john@example.com',
        candidatePhone: '+959123456789',
        candidateResume: 'https://example.com/resume.pdf',
        notes: 'Strong candidate for this role',
      };

      const response = await request(app)
        .post('/api/referrals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(referralData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.referral).toBeDefined();
      expect(response.body.data.referral.candidateName).toBe(referralData.candidateName);
      expect(response.body.data.referral.status).toBe('submitted');
    });

    it('should reject referral without required fields', async () => {
      const response = await request(app)
        .post('/api/referrals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ jobId: job._id.toString() })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject referral with invalid job ID', async () => {
      const response = await request(app)
        .post('/api/referrals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobId: 'invalid-job-id',
          candidateName: 'John Doe',
          candidateEmail: 'john@example.com',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject referral without authentication', async () => {
      const response = await request(app)
        .post('/api/referrals')
        .send({
          jobId: job._id.toString(),
          candidateName: 'John Doe',
          candidateEmail: 'john@example.com',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/referrals', () => {
    it('should get all referrals for authenticated user', async () => {
      // Create some referrals
      await referralFactory.create({ referrerId: referrer._id });
      await referralFactory.create({ referrerId: referrer._id });

      const response = await request(app)
        .get('/api/referrals')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.referrals)).toBe(true);
      expect(response.body.data.referrals.length).toBeGreaterThanOrEqual(2);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/referrals?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should filter by status', async () => {
      await referralFactory.create({ referrerId: referrer._id, status: 'submitted' });
      await referralFactory.create({ referrerId: referrer._id, status: 'hired' });

      const response = await request(app)
        .get('/api/referrals?status=submitted')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.referrals.every(r => r.status === 'submitted')).toBe(true);
    });
  });

  describe('GET /api/referrals/:id', () => {
    it('should get a specific referral', async () => {
      const referral = await referralFactory.create({ referrerId: referrer._id });

      const response = await request(app)
        .get(`/api/referrals/${referral._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.referral._id.toString()).toBe(referral._id.toString());
    });

    it('should return 404 for non-existent referral', async () => {
      const response = await request(app)
        .get('/api/referrals/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/referrals/:id/status', () => {
    it('should update referral status', async () => {
      const referral = await referralFactory.create({ 
        referrerId: referrer._id,
        status: 'submitted'
      });

      const response = await request(app)
        .patch(`/api/referrals/${referral._id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'interview_scheduled' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.referral.status).toBe('interview_scheduled');
    });

    it('should track status history', async () => {
      const referral = await referralFactory.create({ 
        referrerId: referrer._id,
        status: 'submitted'
      });

      await request(app)
        .patch(`/api/referrals/${referral._id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'interview_scheduled' })
        .expect(200);

      const updatedReferral = await Referral.findById(referral._id);
      expect(updatedReferral.statusHistory.length).toBeGreaterThan(0);
    });
  });

  describe('DELETE /api/referrals/:id', () => {
    it('should delete a referral', async () => {
      const referral = await referralFactory.create({ referrerId: referrer._id });

      const response = await request(app)
        .delete(`/api/referrals/${referral._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      const deletedReferral = await Referral.findById(referral._id);
      expect(deletedReferral).toBeNull();
    });

    it('should not allow deleting referrals not owned by user', async () => {
      const otherUser = await userFactory.createVerifiedReferrer();
      const referral = await referralFactory.create({ referrerId: otherUser._id });

      const response = await request(app)
        .delete(`/api/referrals/${referral._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/referrals/stats', () => {
    it('should get referral statistics', async () => {
      await referralFactory.create({ referrerId: referrer._id, status: 'hired' });
      await referralFactory.create({ referrerId: referrer._id, status: 'submitted' });
      await referralFactory.create({ referrerId: referrer._id, status: 'rejected' });

      const response = await request(app)
        .get('/api/referrals/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toBeDefined();
      expect(response.body.data.stats.totalReferrals).toBeGreaterThanOrEqual(3);
    });
  });
});
