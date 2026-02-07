/**
 * Test Helpers
 * Utility functions for testing
 */

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, Company, Job, Referral, Application } = require('../../server/models');

/**
 * Generate a JWT token for testing
 * @param {Object} payload - Token payload
 * @param {string} type - Token type (access or refresh)
 * @returns {string}
 */
const generateTestToken = (payload, type = 'access') => {
  const secret = type === 'access'
    ? process.env.JWT_ACCESS_SECRET
    : process.env.JWT_REFRESH_SECRET;
  const expiresIn = type === 'access' ? '15m' : '7d';

  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Create a test user
 * @param {Object} overrides - Override default user data
 * @returns {Promise<Object>}
 */
const createTestUser = async (overrides = {}) => {
  const defaultData = {
    email: `test_${Date.now()}@example.com`,
    password: 'TestPassword123!',
    name: 'Test User',
    role: 'referrer',
    phone: '+959123456789',
    isEmailVerified: true,
    isActive: true,
  };

  const userData = { ...defaultData, ...overrides };

  // Hash password
  if (userData.password) {
    userData.password = await bcrypt.hash(userData.password, 10);
  }

  // Add role-specific profiles
  if (userData.role === 'referrer' && !userData.referrerProfile) {
    userData.referrerProfile = {
      referralCode: `REF${Date.now()}`,
      inviteCode: `INV${Date.now()}`,
      totalEarnings: 0,
      availableBalance: 0,
      pendingBalance: 0,
      totalReferrals: 0,
      successfulHires: 0,
      kycStatus: 'verified',
      tierLevel: 'bronze',
    };
  }

  if (userData.role === 'job_seeker' && !userData.jobseekerProfile) {
    userData.jobseekerProfile = {
      skills: [],
      experience: [],
    };
  }

  const user = await User.create(userData);
  return user.toObject();
};

/**
 * Create a test company
 * @param {Object} overrides - Override default company data
 * @returns {Promise<Object>}
 */
const createTestCompany = async (overrides = {}) => {
  const defaultData = {
    name: `Test Company ${Date.now()}`,
    email: `company_${Date.now()}@example.com`,
    phone: '+959987654321',
    website: 'https://example.com',
    description: 'A test company for testing purposes',
    industry: 'Technology',
    size: '11-50',
    location: {
      city: 'Yangon',
      country: 'Myanmar',
    },
    verificationStatus: 'verified',
    isActive: true,
  };

  const companyData = { ...defaultData, ...overrides };
  const company = await Company.create(companyData);
  return company.toObject();
};

/**
 * Create a test job
 * @param {Object} overrides - Override default job data
 * @returns {Promise<Object>}
 */
const createTestJob = async (overrides = {}) => {
  // Create company if not provided
  let companyId = overrides.companyId;
  if (!companyId) {
    const company = await createTestCompany();
    companyId = company._id;
  }

  const defaultData = {
    title: `Test Job ${Date.now()}`,
    companyId,
    description: 'This is a test job posting',
    requirements: ['JavaScript', 'Node.js', 'React'],
    responsibilities: ['Develop features', 'Write tests', 'Code review'],
    location: {
      type: 'onsite',
      city: 'Yangon',
      country: 'Myanmar',
    },
    salary: {
      min: 500000,
      max: 1000000,
      currency: 'MMK',
      period: 'monthly',
    },
    employmentType: 'full_time',
    experienceLevel: 'mid',
    referralBonus: {
      amount: 100000,
      currency: 'MMK',
    },
    status: 'active',
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  };

  const jobData = { ...defaultData, ...overrides };
  const job = await Job.create(jobData);
  return job.toObject();
};

/**
 * Create a test referral
 * @param {Object} overrides - Override default referral data
 * @returns {Promise<Object>}
 */
const createTestReferral = async (overrides = {}) => {
  // Create referrer if not provided
  let referrerId = overrides.referrerId;
  if (!referrerId) {
    const referrer = await createTestUser({ role: 'referrer' });
    referrerId = referrer._id;
  }

  // Create job if not provided
  let jobId = overrides.jobId;
  if (!jobId) {
    const job = await createTestJob();
    jobId = job._id;
  }

  const defaultData = {
    referrerId,
    jobId,
    referredPerson: {
      name: 'John Doe',
      email: `candidate_${Date.now()}@example.com`,
      phone: '+959123456789',
      currentCompany: 'Current Company',
      currentTitle: 'Software Engineer',
      yearsOfExperience: 3,
    },
    status: 'submitted',
    notes: 'Test referral notes',
  };

  const referralData = { ...defaultData, ...overrides };
  const referral = await Referral.create(referralData);
  return referral.toObject();
};

/**
 * Create a test application
 * @param {Object} overrides - Override default application data
 * @returns {Promise<Object>}
 */
const createTestApplication = async (overrides = {}) => {
  // Create job if not provided
  let jobId = overrides.jobId;
  if (!jobId) {
    const job = await createTestJob();
    jobId = job._id;
  }

  const defaultData = {
    jobId,
    applicantName: 'Jane Doe',
    applicantEmail: `applicant_${Date.now()}@example.com`,
    applicantPhone: '+959987654321',
    resumeUrl: 'https://example.com/resume.pdf',
    coverLetter: 'I am interested in this position',
    status: 'pending',
    source: 'direct',
  };

  const applicationData = { ...defaultData, ...overrides };
  const application = await Application.create(applicationData);
  return application.toObject();
};

/**
 * Create authenticated request headers
 * @param {Object} user - User object
 * @returns {Object}
 */
const createAuthHeaders = (user) => {
  const token = generateTestToken({
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
    name: user.name,
  });

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

/**
 * Create admin authenticated request headers
 * @param {Object} overrides - Override default admin data
 * @returns {Promise<Object>}
 */
const createAdminAuthHeaders = async (overrides = {}) => {
  const admin = await createTestUser({
    role: 'platform_admin',
    ...overrides,
  });

  return createAuthHeaders(admin);
};

/**
 * Create corporate user authenticated request headers
 * @param {Object} overrides - Override default corporate user data
 * @returns {Promise<Object>}
 */
const createCorporateAuthHeaders = async (overrides = {}) => {
  const company = await createTestCompany();
  const corporateUser = await createTestUser({
    role: 'corporate_admin',
    companyId: company._id,
    ...overrides,
  });

  return {
    headers: createAuthHeaders(corporateUser),
    user: corporateUser,
    company,
  };
};

/**
 * Mock request object for testing middleware
 * @param {Object} overrides - Override default request data
 * @returns {Object}
 */
const createMockRequest = (overrides = {}) => {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    cookies: {},
    user: null,
    ip: '127.0.0.1',
    method: 'GET',
    url: '/',
    ...overrides,
  };
};

/**
 * Mock response object for testing middleware
 * @returns {Object}
 */
const createMockResponse = () => {
  const res = {
    statusCode: 200,
    headers: {},
    cookies: {},
    data: null,

    status(code) {
      this.statusCode = code;
      return this;
    },

    json(data) {
      this.data = data;
      return this;
    },

    send(data) {
      this.data = data;
      return this;
    },

    setHeader(key, value) {
      this.headers[key] = value;
      return this;
    },

    cookie(name, value, options = {}) {
      this.cookies[name] = { value, options };
      return this;
    },

    clearCookie(name) {
      delete this.cookies[name];
      return this;
    },

    redirect(url) {
      this.redirectUrl = url;
      return this;
    },
  };

  return res;
};

/**
 * Mock next function for testing middleware
 * @returns {Function}
 */
const createMockNext = () => {
  return jest.fn();
};

/**
 * Wait for a specified duration
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate random test data
 */
const generateTestData = {
  email: () => `test_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`,
  phone: () => `+959${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`,
  string: (length = 10) => Math.random().toString(36).substring(2, 2 + length),
  number: (min = 0, max = 1000) => Math.floor(Math.random() * (max - min + 1)) + min,
  objectId: () => new mongoose.Types.ObjectId(),
  date: (daysFromNow = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date;
  },
};

/**
 * Clean up test data
 */
const cleanupTestData = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

module.exports = {
  generateTestToken,
  createTestUser,
  createTestCompany,
  createTestJob,
  createTestReferral,
  createTestApplication,
  createAuthHeaders,
  createAdminAuthHeaders,
  createCorporateAuthHeaders,
  createMockRequest,
  createMockResponse,
  createMockNext,
  wait,
  generateTestData,
  cleanupTestData,
};
