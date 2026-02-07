/**
 * User Model Unit Tests
 * Tests for User model validation, methods, and hooks
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User } = require('../../../server/models');
const { userFactory } = require('../../factories');

describe('User Model', () => {
  describe('Schema Validation', () => {
    it('should create a valid user with required fields', async () => {
      const userData = userFactory.build();
      const user = await User.create(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
      expect(user.role).toBe(userData.role);
    });

    it('should require email field', async () => {
      const userData = userFactory.build({ email: undefined });

      await expect(User.create(userData)).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('should require password field', async () => {
      const userData = userFactory.build({ password: undefined });

      await expect(User.create(userData)).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('should require name field', async () => {
      const userData = userFactory.build({ name: undefined });

      await expect(User.create(userData)).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('should require valid role', async () => {
      const userData = userFactory.build({ role: 'invalid_role' });

      await expect(User.create(userData)).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('should enforce unique email constraint', async () => {
      const userData = userFactory.build();
      await User.create(userData);

      await expect(User.create(userData)).rejects.toThrow(/duplicate key/);
    });

    it('should normalize email to lowercase', async () => {
      const userData = userFactory.build({ email: 'Test@Example.COM' });
      const user = await User.create(userData);

      expect(user.email).toBe('test@example.com');
    });

    it('should trim whitespace from name', async () => {
      const userData = userFactory.build({ name: '  John Doe  ' });
      const user = await User.create(userData);

      expect(user.name).toBe('John Doe');
    });
  });

  describe('Password Hashing', () => {
    it('should hash password before saving', async () => {
      const plainPassword = 'TestPassword123!';
      const userData = userFactory.build({ password: plainPassword });
      const user = await User.create(userData);

      expect(user.password).not.toBe(plainPassword);
      expect(user.password.startsWith('$2')).toBe(true);
    });

    it('should not rehash password if not modified', async () => {
      const user = await userFactory.create();
      const originalPassword = user.password;

      user.name = 'Updated Name';
      await user.save();

      expect(user.password).toBe(originalPassword);
    });
  });

  describe('Instance Methods', () => {
    describe('comparePassword', () => {
      it('should return true for correct password', async () => {
        const plainPassword = 'TestPassword123!';
        const user = await userFactory.create({ password: plainPassword });

        const isMatch = await user.comparePassword(plainPassword);
        expect(isMatch).toBe(true);
      });

      it('should return false for incorrect password', async () => {
        const user = await userFactory.create({ password: 'CorrectPassword123!' });

        const isMatch = await user.comparePassword('WrongPassword123!');
        expect(isMatch).toBe(false);
      });
    });

    describe('toJSON', () => {
      it('should not include password in JSON output', async () => {
        const user = await userFactory.create();
        const userJson = user.toJSON();

        expect(userJson.password).toBeUndefined();
      });

      it('should include id field', async () => {
        const user = await userFactory.create();
        const userJson = user.toJSON();

        expect(userJson.id).toBeDefined();
        expect(userJson.id).toBe(user._id.toString());
      });
    });

    describe('getPublicProfile', () => {
      it('should return public profile without sensitive data', async () => {
        const user = await userFactory.create();
        const publicProfile = user.getPublicProfile();

        expect(publicProfile.id).toBeDefined();
        expect(publicProfile.name).toBeDefined();
        expect(publicProfile.email).toBeDefined();
        expect(publicProfile.password).toBeUndefined();
        expect(publicProfile.__v).toBeUndefined();
      });
    });
  });

  describe('Static Methods', () => {
    describe('findByEmail', () => {
      it('should find user by email (case insensitive)', async () => {
        const user = await userFactory.create({ email: 'test@example.com' });

        const found = await User.findByEmail('TEST@EXAMPLE.COM');
        expect(found).toBeDefined();
        expect(found._id.toString()).toBe(user._id.toString());
      });

      it('should return null for non-existent email', async () => {
        const found = await User.findByEmail('nonexistent@example.com');
        expect(found).toBeNull();
      });
    });

    describe('findByReferralCode', () => {
      it('should find referrer by referral code', async () => {
        const user = await userFactory.createVerifiedReferrer({
          referrerProfile: {
            referralCode: 'REF12345',
          },
        });

        const found = await User.findByReferralCode('REF12345');
        expect(found).toBeDefined();
        expect(found._id.toString()).toBe(user._id.toString());
      });
    });
  });

  describe('Role-Specific Profiles', () => {
    describe('Referrer Profile', () => {
      it('should create user with referrer profile', async () => {
        const user = await userFactory.createVerifiedReferrer();

        expect(user.referrerProfile).toBeDefined();
        expect(user.referrerProfile.referralCode).toBeDefined();
        expect(user.referrerProfile.kycStatus).toBeDefined();
      });

      it('should validate referrer profile fields', async () => {
        const userData = userFactory.build({
          role: 'referrer',
          referrerProfile: {
            kycStatus: 'invalid_status',
          },
        });

        await expect(User.create(userData)).rejects.toThrow(mongoose.Error.ValidationError);
      });
    });

    describe('Job Seeker Profile', () => {
      it('should create user with job seeker profile', async () => {
        const user = await userFactory.create({
          role: 'job_seeker',
          jobseekerProfile: {
            skills: ['JavaScript', 'React'],
          },
        });

        expect(user.jobseekerProfile).toBeDefined();
        expect(user.jobseekerProfile.skills).toContain('JavaScript');
      });
    });

    describe('Corporate Profile', () => {
      it('should create user with corporate profile', async () => {
        const company = await require('../../factories/company.factory').create();
        const user = await userFactory.create({
          role: 'corporate_admin',
          companyId: company._id,
          corporateProfile: {
            department: 'HR',
            title: 'Manager',
          },
        });

        expect(user.corporateProfile).toBeDefined();
        expect(user.companyId.toString()).toBe(company._id.toString());
      });
    });
  });

  describe('Virtual Fields', () => {
    it('should compute fullName virtual field', async () => {
      const user = await userFactory.create({ name: 'John Doe' });

      expect(user.fullName).toBe('John Doe');
    });

    it('should compute initials virtual field', async () => {
      const user = await userFactory.create({ name: 'John Michael Doe' });

      expect(user.initials).toBe('JD');
    });
  });

  describe('Timestamps', () => {
    it('should set createdAt on creation', async () => {
      const user = await userFactory.create();

      expect(user.createdAt).toBeDefined();
      expect(user.createdAt instanceof Date).toBe(true);
    });

    it('should set updatedAt on update', async () => {
      const user = await userFactory.create();
      const originalUpdatedAt = user.updatedAt;

      await new Promise(resolve => setTimeout(resolve, 100));
      user.name = 'Updated Name';
      await user.save();

      expect(user.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });
});
