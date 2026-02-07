/**
 * Factories Index
 * Central export for all test data factories
 */

const userFactory = require('./user.factory');
const companyFactory = require('./company.factory');
const jobFactory = require('./job.factory');
const referralFactory = require('./referral.factory');

module.exports = {
  userFactory,
  companyFactory,
  jobFactory,
  referralFactory,
};
