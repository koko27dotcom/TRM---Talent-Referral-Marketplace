const express = require('express');
const router = express.Router();

// Import route modules
const jobsRouter = require('./jobs');
const referralsRouter = require('./referrals');
const companiesRouter = require('./companies');
const usersRouter = require('./users');
const authRouter = require('./auth');
const webhooksRouter = require('./webhooks');

// Mount routes
router.use('/jobs', jobsRouter);
router.use('/referrals', referralsRouter);
router.use('/companies', companiesRouter);
router.use('/users', usersRouter);
router.use('/auth', authRouter);
router.use('/webhooks', webhooksRouter);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'TRM API',
    version: '1.0.0',
    description: 'The Referral Marketplace API - Build on the TRM platform',
    documentation: '/docs/api',
    endpoints: {
      jobs: '/api/v1/jobs',
      referrals: '/api/v1/referrals',
      companies: '/api/v1/companies',
      users: '/api/v1/users',
      auth: '/api/v1/auth',
      webhooks: '/api/v1/webhooks'
    },
    features: [
      'RESTful API design',
      'API key authentication',
      'Rate limiting with headers',
      'Webhook events',
      'Pagination',
      'Filtering and sorting'
    ],
    support: {
      email: 'api-support@trm.com',
      docs: 'https://docs.trm.com/api',
      status: 'https://status.trm.com'
    }
  });
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

module.exports = router;
