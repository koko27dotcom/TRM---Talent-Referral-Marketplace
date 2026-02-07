/**
 * Referral Factory
 * Factory pattern for generating test referral data
 */

const { faker } = require('@faker-js/faker');
const mongoose = require('mongoose');

/**
 * Referral Factory Class
 */
class ReferralFactory {
  constructor() {
    this.statuses = [
      'submitted',
      'under_review',
      'shortlisted',
      'interview_scheduled',
      'interview_completed',
      'offer_extended',
      'offer_accepted',
      'hired',
      'rejected',
      'withdrawn',
    ];

    this.rejectionReasons = [
      'Not qualified',
      'Position filled',
      'Better candidate selected',
      'Candidate withdrew',
      'Failed background check',
      'Salary expectations too high',
    ];
  }

  /**
   * Generate referred person data
   * @returns {Object}
   */
  generateReferredPerson() {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    return {
      name: `${firstName} ${lastName}`,
      email: faker.internet.email({ firstName, lastName }),
      phone: `+959${faker.string.numeric(9)}`,
      resumeUrl: faker.internet.url(),
      linkedInUrl: `https://linkedin.com/in/${firstName.toLowerCase()}${lastName.toLowerCase()}`,
      currentCompany: faker.company.name(),
      currentTitle: faker.person.jobTitle(),
      yearsOfExperience: faker.number.int({ min: 0, max: 20 }),
    };
  }

  /**
   * Generate source tracking data
   * @returns {Object}
   */
  generateSourceTracking() {
    return {
      channel: faker.helpers.arrayElement(['direct', 'facebook', 'linkedin', 'whatsapp', 'email', 'telegram', 'other']),
      ipAddress: faker.internet.ipv4(),
      userAgent: faker.internet.userAgent(),
      referrerUrl: faker.internet.url(),
      utmSource: faker.helpers.arrayElement(['google', 'facebook', 'linkedin', null]),
      utmMedium: faker.helpers.arrayElement(['cpc', 'organic', 'social', 'email', null]),
      utmCampaign: faker.helpers.arrayElement(['summer_hiring', 'referral_program', null]),
    };
  }

  /**
   * Generate status history
   * @param {string} currentStatus - Current status
   * @returns {Array<Object>}
   */
  generateStatusHistory(currentStatus) {
    const history = [];
    const statusIndex = this.statuses.indexOf(currentStatus);

    for (let i = 0; i <= statusIndex; i++) {
      history.push({
        status: this.statuses[i],
        changedBy: new mongoose.Types.ObjectId(),
        changedByType: faker.helpers.arrayElement(['system', 'referrer', 'recruiter', 'admin']),
        changedAt: faker.date.recent({ days: 30 - i }),
        notes: faker.lorem.sentence(),
      });
    }

    return history;
  }

  /**
   * Build referral data
   * @param {Object} overrides - Data to override defaults
   * @returns {Object}
   */
  build(overrides = {}) {
    const status = overrides.status || faker.helpers.arrayElement(this.statuses);

    const data = {
      referrerId: new mongoose.Types.ObjectId(),
      jobId: new mongoose.Types.ObjectId(),
      referredPerson: this.generateReferredPerson(),
      status,
      statusHistory: this.generateStatusHistory(status),
      notes: faker.lorem.paragraph(),
      source: this.generateSourceTracking(),
      isPaid: status === 'hired',
      paidAt: status === 'hired' ? faker.date.recent() : null,
      paidAmount: status === 'hired' ? faker.number.int({ min: 50000, max: 500000 }) : null,
      rejectionReason: status === 'rejected' ? faker.helpers.arrayElement(this.rejectionReasons) : null,
      withdrawnAt: status === 'withdrawn' ? faker.date.recent() : null,
      withdrawnBy: status === 'withdrawn' ? 'referrer' : null,
      createdAt: faker.date.recent({ days: 30 }),
      updatedAt: faker.date.recent(),
    };

    return { ...data, ...overrides };
  }

  /**
   * Create a referral in the database
   * @param {Object} overrides - Data to override defaults
   * @returns {Promise<Object>}
   */
  async create(overrides = {}) {
    const { Referral, User, Job } = require('../../server/models');

    // Create referrer if not provided
    let referrerId = overrides.referrerId;
    if (!referrerId) {
      const userFactory = require('./user.factory');
      const referrer = await userFactory.create({ role: 'referrer' });
      referrerId = referrer._id;
    }

    // Create job if not provided
    let jobId = overrides.jobId;
    if (!jobId) {
      const jobFactory = require('./job.factory');
      const job = await jobFactory.create();
      jobId = job._id;
    }

    const data = this.build({
      referrerId,
      jobId,
      ...overrides,
    });

    const referral = await Referral.create(data);
    return referral.toObject();
  }

  /**
   * Create multiple referrals
   * @param {number} count - Number of referrals to create
   * @param {Object} overrides - Data to override defaults
   * @returns {Promise<Array>}
   */
  async createMany(count, overrides = {}) {
    const referrals = [];
    for (let i = 0; i < count; i++) {
      referrals.push(await this.create(overrides));
    }
    return referrals;
  }

  /**
   * Create a submitted referral
   * @param {Object} overrides - Data to override defaults
   * @returns {Promise<Object>}
   */
  async createSubmitted(overrides = {}) {
    return this.create({
      status: 'submitted',
      ...overrides,
    });
  }

  /**
   * Create a hired referral (completed)
   * @param {Object} overrides - Data to override defaults
   * @returns {Promise<Object>}
   */
  async createHired(overrides = {}) {
    const paidAmount = faker.number.int({ min: 50000, max: 500000 });

    return this.create({
      status: 'hired',
      isPaid: true,
      paidAt: faker.date.recent(),
      paidAmount,
      ...overrides,
    });
  }

  /**
   * Create a rejected referral
   * @param {Object} overrides - Data to override defaults
   * @returns {Promise<Object>}
   */
  async createRejected(overrides = {}) {
    return this.create({
      status: 'rejected',
      rejectionReason: faker.helpers.arrayElement(this.rejectionReasons),
      ...overrides,
    });
  }

  /**
   * Create referrals for a specific referrer
   * @param {string} referrerId - Referrer ID
   * @param {number} count - Number of referrals to create
   * @param {Object} overrides - Data to override defaults
   * @returns {Promise<Array>}
   */
  async createForReferrer(referrerId, count, overrides = {}) {
    return this.createMany(count, {
      referrerId,
      ...overrides,
    });
  }

  /**
   * Create referrals for a specific job
   * @param {string} jobId - Job ID
   * @param {number} count - Number of referrals to create
   * @param {Object} overrides - Data to override defaults
   * @returns {Promise<Array>}
   */
  async createForJob(jobId, count, overrides = {}) {
    return this.createMany(count, {
      jobId,
      ...overrides,
    });
  }
}

// Export singleton instance
module.exports = new ReferralFactory();
module.exports.ReferralFactory = ReferralFactory;
