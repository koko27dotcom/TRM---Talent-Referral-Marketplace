/**
 * User Factory
 * Factory pattern for generating test user data
 */

const { faker } = require('@faker-js/faker');
const bcrypt = require('bcryptjs');

/**
 * User Factory Class
 */
class UserFactory {
  constructor() {
    this.defaultData = {
      email: '',
      password: 'TestPassword123!',
      name: '',
      role: 'referrer',
      phone: '',
      isEmailVerified: true,
      isActive: true,
      avatar: null,
      preferences: {
        language: 'en',
        notifications: {
          email: true,
          sms: true,
          push: true,
        },
      },
    };
  }

  /**
   * Generate random referrer profile data
   * @returns {Object}
   */
  static generateReferrerProfile() {
    const timestamp = Date.now();
    return {
      referralCode: `REF${timestamp}`,
      inviteCode: `INV${timestamp}`,
      totalEarnings: faker.number.int({ min: 0, max: 1000000 }),
      availableBalance: faker.number.int({ min: 0, max: 500000 }),
      pendingBalance: faker.number.int({ min: 0, max: 200000 }),
      totalReferrals: faker.number.int({ min: 0, max: 50 }),
      successfulHires: faker.number.int({ min: 0, max: 20 }),
      kycStatus: faker.helpers.arrayElement(['pending', 'verified', 'rejected', 'not_submitted']),
      tierLevel: faker.helpers.arrayElement(['bronze', 'silver', 'gold', 'platinum']),
      tierProgress: faker.number.int({ min: 0, max: 100 }),
      paymentMethods: [],
      directReferrals: faker.number.int({ min: 0, max: 30 }),
      networkSize: faker.number.int({ min: 0, max: 100 }),
      networkEarnings: faker.number.int({ min: 0, max: 500000 }),
      inviteCount: faker.number.int({ min: 0, max: 20 }),
    };
  }

  /**
   * Generate random job seeker profile data
   * @returns {Object}
   */
  static generateJobSeekerProfile() {
    return {
      skills: faker.helpers.arrayElements(
        ['JavaScript', 'Python', 'React', 'Node.js', 'MongoDB', 'AWS', 'Docker', 'TypeScript'],
        faker.number.int({ min: 1, max: 5 })
      ),
      experience: [
        {
          company: faker.company.name(),
          title: faker.person.jobTitle(),
          startDate: faker.date.past({ years: 5 }),
          endDate: faker.date.recent(),
          current: faker.datatype.boolean(),
          description: faker.lorem.paragraph(),
        },
      ],
      education: [
        {
          institution: faker.company.name() + ' University',
          degree: faker.helpers.arrayElement(['Bachelor', 'Master', 'PhD']),
          field: faker.person.jobArea(),
          graduationYear: faker.number.int({ min: 2010, max: 2024 }),
        },
      ],
      resumeUrl: faker.internet.url(),
      linkedInUrl: `https://linkedin.com/in/${faker.internet.userName()}`,
      portfolioUrl: faker.internet.url(),
      expectedSalary: {
        min: faker.number.int({ min: 300000, max: 800000 }),
        max: faker.number.int({ min: 800000, max: 2000000 }),
        currency: 'MMK',
      },
      preferredLocations: ['Yangon', 'Mandalay'],
      preferredJobTypes: ['full_time', 'remote'],
    };
  }

  /**
   * Generate random corporate user profile data
   * @returns {Object}
   */
  static generateCorporateProfile() {
    return {
      department: faker.helpers.arrayElement(['HR', 'Engineering', 'Sales', 'Marketing']),
      title: faker.person.jobTitle(),
      permissions: ['read', 'write'],
      notificationPreferences: {
        newReferrals: true,
        statusUpdates: true,
        dailyDigest: false,
      },
    };
  }

  /**
   * Build user data
   * @param {Object} overrides - Data to override defaults
   * @returns {Object}
   */
  build(overrides = {}) {
    const data = {
      ...this.defaultData,
      email: faker.internet.email(),
      name: faker.person.fullName(),
      phone: `+959${faker.string.numeric(9)}`,
    };

    // Add role-specific profile
    if (overrides.role === 'referrer' || (!overrides.role && data.role === 'referrer')) {
      data.referrerProfile = UserFactory.generateReferrerProfile();
    } else if (overrides.role === 'job_seeker') {
      data.jobseekerProfile = UserFactory.generateJobSeekerProfile();
    } else if (overrides.role === 'corporate_admin' || overrides.role === 'corporate_recruiter') {
      data.corporateProfile = UserFactory.generateCorporateProfile();
    }

    return { ...data, ...overrides };
  }

  /**
   * Create a user in the database
   * @param {Object} overrides - Data to override defaults
   * @returns {Promise<Object>}
   */
  async create(overrides = {}) {
    const { User } = require('../../server/models');
    const data = this.build(overrides);

    // Hash password if provided
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    const user = await User.create(data);
    return user.toObject();
  }

  /**
   * Create multiple users
   * @param {number} count - Number of users to create
   * @param {Object} overrides - Data to override defaults
   * @returns {Promise<Array>}
   */
  async createMany(count, overrides = {}) {
    const users = [];
    for (let i = 0; i < count; i++) {
      users.push(await this.create(overrides));
    }
    return users;
  }

  /**
   * Create a verified referrer user
   * @param {Object} overrides - Data to override defaults
   * @returns {Promise<Object>}
   */
  async createVerifiedReferrer(overrides = {}) {
    return this.create({
      role: 'referrer',
      isEmailVerified: true,
      referrerProfile: {
        ...UserFactory.generateReferrerProfile(),
        kycStatus: 'verified',
        ...overrides.referrerProfile,
      },
      ...overrides,
    });
  }

  /**
   * Create an admin user
   * @param {Object} overrides - Data to override defaults
   * @returns {Promise<Object>}
   */
  async createAdmin(overrides = {}) {
    return this.create({
      role: 'platform_admin',
      isEmailVerified: true,
      ...overrides,
    });
  }

  /**
   * Create a corporate user with company
   * @param {Object} overrides - Data to override defaults
   * @returns {Promise<Object>}
   */
  async createCorporateUser(overrides = {}) {
    const { Company } = require('../../server/models');

    // Create company if not provided
    let companyId = overrides.companyId;
    if (!companyId) {
      const company = await require('./company.factory').create();
      companyId = company._id;
    }

    return this.create({
      role: 'corporate_admin',
      companyId,
      isEmailVerified: true,
      corporateProfile: UserFactory.generateCorporateProfile(),
      ...overrides,
    });
  }
}

// Export singleton instance
module.exports = new UserFactory();
module.exports.UserFactory = UserFactory;
