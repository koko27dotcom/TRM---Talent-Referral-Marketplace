/**
 * Company Factory
 * Factory pattern for generating test company data
 */

const { faker } = require('@faker-js/faker');

/**
 * Company Factory Class
 */
class CompanyFactory {
  constructor() {
    this.industries = [
      'Technology',
      'Finance',
      'Healthcare',
      'Education',
      'Manufacturing',
      'Retail',
      'Telecommunications',
      'Hospitality',
      'Construction',
      'Transportation',
    ];

    this.companySizes = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];

    this.defaultData = {
      name: '',
      email: '',
      phone: '',
      website: '',
      description: '',
      industry: '',
      size: '11-50',
      foundedYear: null,
      location: {
        city: 'Yangon',
        state: '',
        country: 'Myanmar',
        address: '',
        postalCode: '',
      },
      socialMedia: {
        linkedIn: '',
        facebook: '',
        twitter: '',
      },
      logo: '',
      coverImage: '',
      verificationStatus: 'verified',
      isActive: true,
      settings: {
        allowPublicProfile: true,
        showSalaryRanges: true,
        autoApproveReferrals: false,
      },
    };
  }

  /**
   * Build company data
   * @param {Object} overrides - Data to override defaults
   * @returns {Object}
   */
  build(overrides = {}) {
    const companyName = faker.company.name();

    const data = {
      ...this.defaultData,
      name: companyName,
      email: faker.internet.email({ firstName: companyName.replace(/\s+/g, '').toLowerCase() }),
      phone: `+959${faker.string.numeric(9)}`,
      website: faker.internet.url(),
      description: faker.company.catchPhrase() + '. ' + faker.lorem.paragraph(),
      industry: faker.helpers.arrayElement(this.industries),
      size: faker.helpers.arrayElement(this.companySizes),
      foundedYear: faker.number.int({ min: 1990, max: 2024 }),
      location: {
        city: faker.helpers.arrayElement(['Yangon', 'Mandalay', 'Naypyidaw']),
        state: '',
        country: 'Myanmar',
        address: faker.location.streetAddress(),
        postalCode: faker.string.numeric(5),
      },
      socialMedia: {
        linkedIn: `https://linkedin.com/company/${companyName.replace(/\s+/g, '-').toLowerCase()}`,
        facebook: `https://facebook.com/${companyName.replace(/\s+/g, '').toLowerCase()}`,
        twitter: `@${companyName.replace(/\s+/g, '')}`,
      },
      logo: faker.image.url(),
      coverImage: faker.image.url(),
    };

    return { ...data, ...overrides };
  }

  /**
   * Create a company in the database
   * @param {Object} overrides - Data to override defaults
   * @returns {Promise<Object>}
   */
  async create(overrides = {}) {
    const { Company } = require('../../server/models');
    const data = this.build(overrides);
    const company = await Company.create(data);
    return company.toObject();
  }

  /**
   * Create multiple companies
   * @param {number} count - Number of companies to create
   * @param {Object} overrides - Data to override defaults
   * @returns {Promise<Array>}
   */
  async createMany(count, overrides = {}) {
    const companies = [];
    for (let i = 0; i < count; i++) {
      companies.push(await this.create(overrides));
    }
    return companies;
  }

  /**
   * Create a verified company
   * @param {Object} overrides - Data to override defaults
   * @returns {Promise<Object>}
   */
  async createVerified(overrides = {}) {
    return this.create({
      verificationStatus: 'verified',
      isActive: true,
      ...overrides,
    });
  }

  /**
   * Create a pending verification company
   * @param {Object} overrides - Data to override defaults
   * @returns {Promise<Object>}
   */
  async createPending(overrides = {}) {
    return this.create({
      verificationStatus: 'pending',
      isActive: true,
      ...overrides,
    });
  }

  /**
   * Create a company with subscription
   * @param {Object} overrides - Data to override defaults
   * @returns {Promise<Object>}
   */
  async createWithSubscription(overrides = {}) {
    const company = await this.createVerified(overrides);

    // Create subscription
    const { Subscription, SubscriptionPlan } = require('../../server/models');

    let plan = await SubscriptionPlan.findOne({ code: 'professional' });
    if (!plan) {
      plan = await SubscriptionPlan.create({
        code: 'professional',
        name: 'Professional',
        description: 'Professional plan for companies',
        price: 99000,
        currency: 'MMK',
        billingCycle: 'monthly',
        features: {
          jobPostings: 10,
          featuredJobs: 2,
          resumeViews: 100,
          referralBonusMultiplier: 1.5,
        },
        isActive: true,
      });
    }

    const subscription = await Subscription.create({
      companyId: company._id,
      planId: plan._id,
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
    });

    return {
      ...company,
      subscription: subscription.toObject(),
    };
  }
}

// Export singleton instance
module.exports = new CompanyFactory();
module.exports.CompanyFactory = CompanyFactory;
