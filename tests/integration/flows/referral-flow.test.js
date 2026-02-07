/**
 * End-to-End Referral Flow Integration Tests
 * Tests complete referral lifecycle from creation to payout
 */

const request = require('supertest');
const app = require('../../../server/server');
const { User, Job, Referral, PaymentTransaction } = require('../../../server/models');
const { userFactory, jobFactory } = require('../../factories');

describe('Referral Flow Integration', () => {
  let referrerToken;
  let companyToken;
  let adminToken;
  let referrer;
  let company;
  let job;

  beforeEach(async () => {
    // Create users with different roles
    referrer = await userFactory.createVerifiedReferrer();
    company = await userFactory.createVerifiedCompany();
    const admin = await userFactory.createAdmin();

    // Get auth tokens
    const referrerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: referrer.email, password: 'TestPassword123!' });
    referrerToken = referrerLogin.body.data.tokens.accessToken;

    const companyLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: company.email, password: 'TestPassword123!' });
    companyToken = companyLogin.body.data.tokens.accessToken;

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'TestPassword123!' });
    adminToken = adminLogin.body.data.tokens.accessToken;

    // Create a job
    const jobResponse = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        title: 'Senior Software Engineer',
        company: company.companyProfile.companyName,
        description: 'Looking for experienced developer',
        requirements: ['5+ years experience', 'Node.js expertise'],
        salary: { min: 1000000, max: 2000000, currency: 'MMK' },
        location: 'Yangon',
        type: 'full_time',
        referralBonus: 150000,
      });
    job = jobResponse.body.data.job;
  });

  describe('Complete Referral Lifecycle', () => {
    it('should complete full referral flow from submission to hire', async () => {
      // Step 1: Create referral
      const createResponse = await request(app)
        .post('/api/referrals')
        .set('Authorization', `Bearer ${referrerToken}`)
        .send({
          jobId: job._id,
          candidateName: 'John Doe',
          candidateEmail: 'john@example.com',
          candidatePhone: '+959123456789',
          candidateResume: 'https://example.com/resume.pdf',
          notes: 'Strong candidate with relevant experience',
        })
        .expect(201);

      const referralId = createResponse.body.data.referral._id;
      expect(createResponse.body.data.referral.status).toBe('submitted');

      // Step 2: Company reviews referral
      await request(app)
        .patch(`/api/referrals/${referralId}/status`)
        .set('Authorization', `Bearer ${companyToken}`)
        .send({ status: 'under_review' })
        .expect(200);

      // Step 3: Schedule interview
      await request(app)
        .patch(`/api/referrals/${referralId}/status`)
        .set('Authorization', `Bearer ${companyToken}`)
        .send({ status: 'interview_scheduled' })
        .expect(200);

      // Step 4: Interview completed
      await request(app)
        .patch(`/api/referrals/${referralId}/status`)
        .set('Authorization', `Bearer ${companyToken}`)
        .send({ status: 'interview_completed' })
        .expect(200);

      // Step 5: Offer extended
      await request(app)
        .patch(`/api/referrals/${referralId}/status`)
        .set('Authorization', `Bearer ${companyToken}`)
        .send({ status: 'offer_extended' })
        .expect(200);

      // Step 6: Candidate hired
      const hireResponse = await request(app)
        .patch(`/api/referrals/${referralId}/status`)
        .set('Authorization', `Bearer ${companyToken}`)
        .send({ status: 'hired' })
        .expect(200);

      expect(hireResponse.body.data.referral.status).toBe('hired');

      // Step 7: Verify referrer earnings
      const referrerData = await User.findById(referrer._id);
      expect(referrerData.pendingBalance).toBeGreaterThan(0);
    });

    it('should handle referral rejection flow', async () => {
      // Create referral
      const createResponse = await request(app)
        .post('/api/referrals')
        .set('Authorization', `Bearer ${referrerToken}`)
        .send({
          jobId: job._id,
          candidateName: 'Jane Doe',
          candidateEmail: 'jane@example.com',
          candidatePhone: '+959987654321',
        })
        .expect(201);

      const referralId = createResponse.body.data.referral._id;

      // Reject referral
      const rejectResponse = await request(app)
        .patch(`/api/referrals/${referralId}/status`)
        .set('Authorization', `Bearer ${companyToken}`)
        .send({
          status: 'rejected',
          rejectionReason: 'Not enough experience',
        })
        .expect(200);

      expect(rejectResponse.body.data.referral.status).toBe('rejected');
      expect(rejectResponse.body.data.referral.rejectionReason).toBe('Not enough experience');

      // Verify no earnings
      const referrerData = await User.findById(referrer._id);
      expect(referrerData.pendingBalance).toBe(0);
    });

    it('should track referral status history', async () => {
      const createResponse = await request(app)
        .post('/api/referrals')
        .set('Authorization', `Bearer ${referrerToken}`)
        .send({
          jobId: job._id,
          candidateName: 'Test Candidate',
          candidateEmail: 'test@example.com',
          candidatePhone: '+959111111111',
        })
        .expect(201);

      const referralId = createResponse.body.data.referral._id;

      // Update status multiple times
      const statuses = ['under_review', 'interview_scheduled', 'interview_completed'];
      for (const status of statuses) {
        await request(app)
          .patch(`/api/referrals/${referralId}/status`)
          .set('Authorization', `Bearer ${companyToken}`)
          .send({ status })
          .expect(200);
      }

      // Get referral and check history
      const getResponse = await request(app)
        .get(`/api/referrals/${referralId}`)
        .set('Authorization', `Bearer ${referrerToken}`)
        .expect(200);

      expect(getResponse.body.data.referral.statusHistory.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Multi-level Referral Network', () => {
    it('should track network referrals', async () => {
      // Create a second level referrer using first referrer's invite code
      const secondLevelReferrer = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'second@example.com',
          password: 'StrongPassword123!',
          name: 'Second Level Referrer',
          role: 'referrer',
          inviteCode: referrer.referrerProfile.inviteCode,
        })
        .expect(201);

      const secondLevelToken = secondLevelReferrer.body.data.tokens.accessToken;

      // Second level referrer creates a referral
      const referralResponse = await request(app)
        .post('/api/referrals')
        .set('Authorization', `Bearer ${secondLevelToken}`)
        .send({
          jobId: job._id,
          candidateName: 'Network Candidate',
          candidateEmail: 'network@example.com',
          candidatePhone: '+959222222222',
        })
        .expect(201);

      expect(referralResponse.body.data.referral._id).toBeDefined();

      // Verify first referrer gets network bonus on hire
      const referralId = referralResponse.body.data.referral._id;

      await request(app)
        .patch(`/api/referrals/${referralId}/status`)
        .set('Authorization', `Bearer ${companyToken}`)
        .send({ status: 'hired' })
        .expect(200);

      // Check network earnings
      const firstReferrerData = await User.findById(referrer._id);
      expect(firstReferrerData.referrerProfile.networkEarnings).toBeGreaterThan(0);
    });
  });

  describe('Referral Notifications', () => {
    it('should send notifications on status changes', async () => {
      const createResponse = await request(app)
        .post('/api/referrals')
        .set('Authorization', `Bearer ${referrerToken}`)
        .send({
          jobId: job._id,
          candidateName: 'Notify Candidate',
          candidateEmail: 'notify@example.com',
          candidatePhone: '+959333333333',
        })
        .expect(201);

      const referralId = createResponse.body.data.referral._id;

      // Status change should trigger notification
      await request(app)
        .patch(`/api/referrals/${referralId}/status`)
        .set('Authorization', `Bearer ${companyToken}`)
        .send({ status: 'interview_scheduled' })
        .expect(200);

      // Verify notification was created
      const notificationsResponse = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${referrerToken}`)
        .expect(200);

      const hasReferralNotification = notificationsResponse.body.data.notifications.some(
        n => n.type === 'referral_status_update'
      );
      expect(hasReferralNotification).toBe(true);
    });
  });
});
