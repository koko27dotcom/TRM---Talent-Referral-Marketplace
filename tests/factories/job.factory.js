/**
 * Job Factory
 * Factory pattern for generating test job data
 */

const { faker } = require('@faker-js/faker');
const mongoose = require('mongoose');

/**
 * Job Factory Class
 */
class JobFactory {
  constructor() {
    this.employmentTypes = ['full_time', 'part_time', 'contract', 'freelance', 'internship'];
    this.experienceLevels = ['entry', 'junior', 'mid', 'senior', 'lead', 'executive'];
    this.locationTypes = ['onsite', 'remote', 'hybrid'];
    this.jobCategories = [
      'Software Development',
      'Data Science',
      'Product Management',
      'Design',
      'Marketing',
      'Sales',
      'Customer Support',
      'Human Resources',
      'Finance',
      'Operations',
    ];
    this.skills = [
      'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'MongoDB',
      'AWS', 'Docker', 'Kubernetes', 'TypeScript', 'GraphQL',
      'PostgreSQL', 'Redis', 'Git', 'CI/CD', 'Agile',
    ];

    this.defaultData = {
      title: '',
      description: '',
      requirements: [],
      responsibilities: [],
      location: {
        type: 'onsite',
        city: 'Yangon',
        state: '',
        country: 'Myanmar',
      },
      salary: {
        min: null,
        max: null,
        currency: 'MMK',
        period: 'monthly',
        isNegotiable: false,
      },
      employmentType: 'full_time',
      experienceLevel: 'mid',
      category: '',
      skills: [],
      benefits: [],
      referralBonus: {
        amount: 100000,
        currency: 'MMK',
      },
      status: 'active',
      isFeatured: false,
      isRemote: false,
      applicationSettings: {
        requireResume: true,
        requireCoverLetter: false,
        customQuestions: [],
        deadline: null,
        allowMultipleApplications: false,
      },
    };
  }

  /**
   * Build job data
   * @param {Object} overrides - Data to override defaults
   * @returns {Object}
   */
  build(overrides = {}) {
    const jobTitle = faker.person.jobTitle();
    const salaryMin = faker.number.int({ min: 300000, max: 1000000 });

    const data = {
      ...this.defaultData,
      title: jobTitle,
      description: this.generateJobDescription(jobTitle),
      requirements: this.generateRequirements(),
      responsibilities: this.generateResponsibilities(),
      location: {
        type: faker.helpers.arrayElement(this.locationTypes),
        city: faker.helpers.arrayElement(['Yangon', 'Mandalay', 'Naypyidaw']),
        state: '',
        country: 'Myanmar',
      },
      salary: {
        min: salaryMin,
        max: salaryMin + faker.number.int({ min: 200000, max: 1000000 }),
        currency: 'MMK',
        period: 'monthly',
        isNegotiable: faker.datatype.boolean(),
      },
      employmentType: faker.helpers.arrayElement(this.employmentTypes),
      experienceLevel: faker.helpers.arrayElement(this.experienceLevels),
      category: faker.helpers.arrayElement(this.jobCategories),
      skills: faker.helpers.arrayElements(this.skills, faker.number.int({ min: 3, max: 8 })),
      benefits: this.generateBenefits(),
      referralBonus: {
        amount: faker.number.int({ min: 50000, max: 500000 }),
        currency: 'MMK',
      },
      applicationSettings: {
        requireResume: true,
        requireCoverLetter: faker.datatype.boolean(),
        customQuestions: [],
        deadline: faker.date.future({ years: 1 }),
        allowMultipleApplications: false,
      },
    };

    return { ...data, ...overrides };
  }

  /**
   * Generate job description
   * @param {string} title - Job title
   * @returns {string}
   */
  generateJobDescription(title) {
    return `
      We are looking for a talented ${title} to join our growing team.

      ${faker.lorem.paragraphs(3)}

      About Us:
      ${faker.company.catchPhrase()}
      ${faker.lorem.paragraph()}

      What You'll Do:
      - ${faker.lorem.sentence()}
      - ${faker.lorem.sentence()}
      - ${faker.lorem.sentence()}

      What We're Looking For:
      - ${faker.lorem.sentence()}
      - ${faker.lorem.sentence()}
      - ${faker.lorem.sentence()}
    `.trim();
  }

  /**
   * Generate job requirements
   * @returns {Array<string>}
   */
  generateRequirements() {
    return [
      `${faker.number.int({ min: 1, max: 5 })}+ years of relevant experience`,
      `Bachelor's degree in ${faker.person.jobArea()} or related field`,
      `Strong proficiency in ${faker.helpers.arrayElement(this.skills)}`,
      `Experience with ${faker.helpers.arrayElement(this.skills)}`,
      'Excellent communication and teamwork skills',
    ];
  }

  /**
   * Generate job responsibilities
   * @returns {Array<string>}
   */
  generateResponsibilities() {
    return [
      faker.lorem.sentence(),
      faker.lorem.sentence(),
      faker.lorem.sentence(),
      faker.lorem.sentence(),
      faker.lorem.sentence(),
    ];
  }

  /**
   * Generate job benefits
   * @returns {Array<string>}
   */
  generateBenefits() {
    const benefits = [
      'Competitive salary',
      'Health insurance',
      'Professional development allowance',
      'Flexible working hours',
      'Remote work options',
      'Annual leave',
      'Performance bonuses',
      'Team building activities',
    ];
    return faker.helpers.arrayElements(benefits, faker.number.int({ min: 3, max: 6 }));
  }

  /**
   * Create a job in the database
   * @param {Object} overrides - Data to override defaults
   * @returns {Promise<Object>}
   */
  async create(overrides = {}) {
    const { Job, Company } = require('../../server/models');

    // Create company if not provided
    let companyId = overrides.companyId;
    if (!companyId) {
      const companyFactory = require('./company.factory');
      const company = await companyFactory.create();
      companyId = company._id;
    }

    const data = this.build({
      companyId,
      ...overrides,
    });

    const job = await Job.create(data);
    return job.toObject();
  }

  /**
   * Create multiple jobs
   * @param {number} count - Number of jobs to create
   * @param {Object} overrides - Data to override defaults
   * @returns {Promise<Array>}
   */
  async createMany(count, overrides = {}) {
    const jobs = [];
    for (let i = 0; i < count; i++) {
      jobs.push(await this.create(overrides));
    }
    return jobs;
  }

  /**
   * Create an active job
   * @param {Object} overrides - Data to override defaults
   * @returns {Promise<Object>}
   */
  async createActive(overrides = {}) {
    return this.create({
      status: 'active',
      ...overrides,
    });
  }

  /**
   * Create a featured job
   * @param {Object} overrides - Data to override defaults
   * @returns {Promise<Object>}
   */
  async createFeatured(overrides = {}) {
    return this.create({
      isFeatured: true,
      status: 'active',
      ...overrides,
    });
  }

  /**
   * Create a remote job
   * @param {Object} overrides - Data to override defaults
   * @returns {Promise<Object>}
   */
  async createRemote(overrides = {}) {
    return this.create({
      location: {
        type: 'remote',
        city: '',
        state: '',
        country: 'Myanmar',
      },
      isRemote: true,
      ...overrides,
    });
  }

  /**
   * Create a job with custom questions
   * @param {Object} overrides - Data to override defaults
   * @returns {Promise<Object>}
   */
  async createWithCustomQuestions(overrides = {}) {
    const customQuestions = [
      {
        question: 'Why are you interested in this position?',
        type: 'textarea',
        required: true,
      },
      {
        question: 'How many years of experience do you have?',
        type: 'number',
        required: true,
      },
      {
        question: 'What is your expected salary?',
        type: 'text',
        required: false,
      },
    ];

    return this.create({
      applicationSettings: {
        requireResume: true,
        requireCoverLetter: true,
        customQuestions,
        deadline: faker.date.future({ years: 1 }),
        allowMultipleApplications: false,
      },
      ...overrides,
    });
  }

  /**
   * Create an expired job
   * @param {Object} overrides - Data to override defaults
   * @returns {Promise<Object>}
   */
  async createExpired(overrides = {}) {
    return this.create({
      status: 'expired',
      applicationSettings: {
        requireResume: true,
        requireCoverLetter: false,
        customQuestions: [],
        deadline: faker.date.past(),
        allowMultipleApplications: false,
      },
      ...overrides,
    });
  }
}

// Export singleton instance
module.exports = new JobFactory();
module.exports.JobFactory = JobFactory;
