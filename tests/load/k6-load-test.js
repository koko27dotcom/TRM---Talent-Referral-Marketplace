/**
 * K6 Load Testing Script for TRM Referral Platform
 * Advanced load testing with realistic scenarios
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomIntBetween, randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');
const successfulLogins = new Counter('successful_logins');
const successfulReferrals = new Counter('successful_referrals');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 users
    { duration: '5m', target: 50 },   // Ramp up to 50 users
    { duration: '10m', target: 100 }, // Stay at 100 users
    { duration: '5m', target: 200 },  // Spike to 200 users
    { duration: '5m', target: 100 },  // Scale down
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% errors
    errors: ['rate<0.05'],            // Custom error rate threshold
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

// Test data
const TEST_USERS = [
  { email: 'loadtest1@example.com', password: 'LoadTest123!' },
  { email: 'loadtest2@example.com', password: 'LoadTest123!' },
  { email: 'loadtest3@example.com', password: 'LoadTest123!' },
];

export function setup() {
  // Setup: Create test data, authenticate, etc.
  const tokens = [];
  
  for (const user of TEST_USERS) {
    const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify(user), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (res.status === 200) {
      const body = JSON.parse(res.body);
      tokens.push(body.data.tokens.accessToken);
    }
  }
  
  return { tokens };
}

export default function (data) {
  const token = randomItem(data.tokens);
  
  group('Authentication', () => {
    const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
      email: randomItem(TEST_USERS).email,
      password: 'LoadTest123!',
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    const loginSuccess = check(loginRes, {
      'login status is 200': (r) => r.status === 200,
      'login has token': (r) => r.json('data.tokens.accessToken') !== undefined,
    });
    
    errorRate.add(!loginSuccess);
    apiLatency.add(loginRes.timings.duration);
    
    if (loginSuccess) {
      successfulLogins.add(1);
    }
    
    sleep(randomIntBetween(1, 3));
  });
  
  group('Referral Operations', () => {
    // Create referral
    const createRes = http.post(`${BASE_URL}/api/referrals`, JSON.stringify({
      jobId: `job-${randomIntBetween(1, 1000)}`,
      candidateName: `Candidate ${randomIntBetween(1, 10000)}`,
      candidateEmail: `candidate${randomIntBetween(1, 10000)}@example.com`,
      candidatePhone: `+959${randomIntBetween(100000000, 999999999)}`,
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    
    const createSuccess = check(createRes, {
      'create referral status is 201': (r) => r.status === 201,
      'create referral has id': (r) => r.json('data.referral._id') !== undefined,
    });
    
    errorRate.add(!createSuccess);
    apiLatency.add(createRes.timings.duration);
    
    if (createSuccess) {
      successfulReferrals.add(1);
    }
    
    sleep(randomIntBetween(1, 3));
    
    // Get referrals
    const listRes = http.get(`${BASE_URL}/api/referrals?page=1&limit=20`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    check(listRes, {
      'list referrals status is 200': (r) => r.status === 200,
      'list referrals returns array': (r) => Array.isArray(r.json('data.referrals')),
    });
    
    apiLatency.add(listRes.timings.duration);
    
    sleep(randomIntBetween(1, 3));
  });
  
  group('Job Browsing', () => {
    const jobsRes = http.get(`${BASE_URL}/api/jobs?page=${randomIntBetween(1, 5)}&limit=20`);
    
    check(jobsRes, {
      'jobs status is 200': (r) => r.status === 200,
      'jobs returns data': (r) => r.json('data.jobs') !== undefined,
    });
    
    apiLatency.add(jobsRes.timings.duration);
    
    sleep(randomIntBetween(2, 5));
  });
  
  group('Dashboard Data', () => {
    const statsRes = http.get(`${BASE_URL}/api/referrals/stats`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    check(statsRes, {
      'stats status is 200': (r) => r.status === 200,
      'stats has data': (r) => r.json('data.stats') !== undefined,
    });
    
    apiLatency.add(statsRes.timings.duration);
    
    const balanceRes = http.get(`${BASE_URL}/api/payments/balance`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    check(balanceRes, {
      'balance status is 200': (r) => r.status === 200,
    });
    
    apiLatency.add(balanceRes.timings.duration);
    
    sleep(randomIntBetween(1, 3));
  });
  
  group('Payment Operations', () => {
    const transactionsRes = http.get(`${BASE_URL}/api/payments/transactions?page=1&limit=10`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    check(transactionsRes, {
      'transactions status is 200': (r) => r.status === 200,
    });
    
    apiLatency.add(transactionsRes.timings.duration);
    
    sleep(randomIntBetween(1, 3));
  });
}

export function teardown(data) {
  // Cleanup: Remove test data, close connections, etc.
  console.log('Load test completed');
  console.log(`Successful logins: ${successfulLogins.name}`);
  console.log(`Successful referrals: ${successfulReferrals.name}`);
}
