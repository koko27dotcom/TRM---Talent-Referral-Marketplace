/**
 * Job Model Unit Tests
 * Tests for Job model validation, methods, and hooks
 */

const mongoose = require('mongoose');
const { Job, Company } = require('../../../server/models');
const { jobFactory, companyFactory } = require('../../factories');

describe('Job Model', () => {
  let testCompany;

  beforeEach(async () => {
    testCompany = await companyFactory.create();
  });

  describe('Schema Validation', () => {
    it('should create a valid job with required fields', async () => {
      const jobData = jobFactory.build({ companyId: testCompany._id });
      const job = await Job.create(jobData);

      expect(job).toBeDefined();
      expect(job.title).toBe(jobData.title);
      expect(job.companyId.toString()).toBe(testCompany._id.toString());
    });

    it('should require title field', async () => {
      const jobData = jobFactory.build({
        companyId: testCompany._id,
        title: undefined,
      });

      await expect(Job.create(jobData)).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('should require companyId field', async () => {
      const jobData = jobFactory.build({ companyId: undefined });

      await expect(Job.create(jobData)).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('should validate employment type', async () => {
      const jobData = jobFactory.build({
        companyId: testCompany._id,
        employmentType: 'invalid_type',
      });

      await expect(Job.create(jobData)).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('should validate experience level', async () => {
      const jobData = jobFactory.build({
        companyId: testCompany._id,
        experienceLevel: 'invalid_level',
      });

      await expect(Job.create(jobData)).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('should validate location type', async () => {
      const jobData = jobFactory.build({
        companyId: testCompany._id,
        location: { type: 'invalid_location' },
      });

      await expect(Job.create(jobData)).rejects.toThrow(mongoose.Error.ValidationError);
    });
  });

  describe('Salary Validation', () => {
    it('should accept valid salary range', async () => {
      const job = await jobFactory.createActive({
        companyId: testCompany._id,
        salary: {
          min: 500000,
          max: 1000000,
          currency: 'MMK',
          period: 'monthly',
        },
      });

      expect(job.salary.min).toBe(500000);
      expect(job.salary.max).toBe(1000000);
    });

    it('should validate salary currency', async () => {
      const jobData = jobFactory.build({
        companyId: testCompany._id,
        salary: {
          min: 500000,
          max: 1000000,
          currency: 'INVALID',
          period: 'monthly',
        },
      });

      await expect(Job.create(jobData)).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('should validate salary period', async () => {
      const jobData = jobFactory.build({
        companyId: testCompany._id,
        salary: {
          min: 500000,
          max: 1000000,
          currency: 'MMK',
          period: 'invalid_period',
        },
      });

      await expect(Job.create(jobData)).rejects.toThrow(mongoose.Error.ValidationError);
    });
  });

  describe('Referral Bonus', () => {
    it('should set default referral bonus', async () => {
      const job = await jobFactory.createActive({ companyId: testCompany._id });

      expect(job.referralBonus).toBeDefined();
      expect(job.referralBonus.amount).toBeGreaterThan(0);
      expect(job.referralBonus.currency).toBe('MMK');
    });

    it('should accept custom referral bonus', async () => {
      const job = await jobFactory.createActive({
        companyId: testCompany._id,
        referralBonus: {
          amount: 200000,
          currency: 'MMK',
        },
      });

      expect(job.referralBonus.amount).toBe(200000);
    });
  });

  describe('Status Management', () => {
    it('should default to active status', async () => {
      const job = await Job.create(jobFactory.build({ companyId: testCompany._id }));

      expect(job.status).toBe('active');
    });

    it('should validate status values', async () => {
      const jobData = jobFactory.build({
        companyId: testCompany._id,
        status: 'invalid_status',
      });

      await expect(Job.create(jobData)).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('should support draft status', async () => {
      const job = await jobFactory.create({
        companyId: testCompany._id,
        status: 'draft',
      });

      expect(job.status).toBe('draft');
      expect(job.isPublished).toBe(false);
    });

    it('should support expired status', async () => {
      const job = await jobFactory.createExpired({ companyId: testCompany._id });

      expect(job.status).toBe('expired');
    });
  });

  describe('Application Settings', () => {
    it('should have default application settings', async () => {
      const job = await jobFactory.createActive({ companyId: testCompany._id });

      expect(job.applicationSettings).toBeDefined();
      expect(job.applicationSettings.requireResume).toBe(true);
      expect(job.applicationSettings.allowMultipleApplications).toBe(false);
    });

    it('should support custom questions', async () => {
      const job = await jobFactory.createWithCustomQuestions({ companyId: testCompany._id });

      expect(job.applicationSettings.customQuestions).toHaveLength(3);
      expect(job.applicationSettings.customQuestions[0].question).toBeDefined();
    });

    it('should validate custom question types', async () => {
      const jobData = jobFactory.build({
        companyId: testCompany._id,
        applicationSettings: {
          customQuestions: [
            {
              question: 'Test question',
              type: 'invalid_type',
              required: true,
            },
          ],
        },
      });

      await expect(Job.create(jobData)).rejects.toThrow(mongoose.Error.ValidationError);
    });
  });

  describe('Instance Methods', () => {
    describe('isActive', () => {
      it('should return true for active jobs', async () => {
        const job = await jobFactory.createActive({ companyId: testCompany._id });

        expect(job.isActive()).toBe(true);
      });

      it('should return false for expired jobs', async () => {
        const job = await jobFactory.createExpired({ companyId: testCompany._id });

        expect(job.isActive()).toBe(false);
      });
    });

    describe('canApply', () => {
      it('should return true when deadline is in future', async () => {
        const job = await jobFactory.createActive({
          companyId: testCompany._id,
          applicationSettings: {
            deadline: new Date(Date.now() + 86400000),
          },
        });

        expect(job.canApply()).toBe(true);
      });

      it('should return false when deadline has passed', async () => {
        const job = await jobFactory.createExpired({ companyId: testCompany._id });

        expect(job.canApply()).toBe(false);
      });
    });

    describe('toJSON', () => {
      it('should include virtual id field', async () => {
        const job = await jobFactory.createActive({ companyId: testCompany._id });
        const jobJson = job.toJSON();

        expect(jobJson.id).toBeDefined();
        expect(jobJson.id).toBe(job._id.toString());
      });
    });
  });

  describe('Static Methods', () => {
    describe('findActive', () => {
      it('should return only active jobs', async () => {
        await jobFactory.createActive({ companyId: testCompany._id });
        await jobFactory.createExpired({ companyId: testCompany._id });

        const activeJobs = await Job.findActive();

        expect(activeJobs).toHaveLength(1);
        expect(activeJobs[0].status).toBe('active');
      });
    });

    describe('findByCompany', () => {
      it('should return jobs for specific company', async () => {
        const company2 = await companyFactory.create();
        await jobFactory.createActive({ companyId: testCompany._id });
        await jobFactory.createActive({ companyId: company2._id });

        const jobs = await Job.findByCompany(testCompany._id);

        expect(jobs).toHaveLength(1);
        expect(jobs[0].companyId.toString()).toBe(testCompany._id.toString());
      });
    });

    describe('search', () => {
      it('should search by title', async () => {
        await jobFactory.createActive({
          companyId: testCompany._id,
          title: 'Senior Software Engineer',
        });
        await jobFactory.createActive({
          companyId: testCompany._id,
          title: 'Marketing Manager',
        });

        const results = await Job.search({ query: 'Software' });

        expect(results).toHaveLength(1);
        expect(results[0].title).toContain('Software');
      });

      it('should filter by location', async () => {
        await jobFactory.createActive({
          companyId: testCompany._id,
          location: { city: 'Yangon', type: 'onsite' },
        });
        await jobFactory.createActive({
          companyId: testCompany._id,
          location: { city: 'Mandalay', type: 'onsite' },
        });

        const results = await Job.search({ city: 'Yangon' });

        expect(results).toHaveLength(1);
        expect(results[0].location.city).toBe('Yangon');
      });
    });
  });

  describe('Middleware/Hooks', () => {
    it('should update updatedAt on save', async () => {
      const job = await jobFactory.createActive({ companyId: testCompany._id });
      const originalUpdatedAt = job.updatedAt;

      await new Promise(resolve => setTimeout(resolve, 100));
      job.title = 'Updated Title';
      await job.save();

      expect(job.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });
});
