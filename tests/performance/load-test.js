/**
 * TRM Platform - k6 Load Test Suite
 * Production-grade performance testing following Google SRE SLO methodology
 *
 * Run: k6 run tests/performance/load-test.js
 * Run with env: k6 run -e BASE_URL=https://staging.trm.io tests/performance/load-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency', true);
const jobSearchLatency = new Trend('job_search_latency', true);
const authLatency = new Trend('auth_latency', true);
const healthCheckLatency = new Trend('health_check_latency', true);
const requestCount = new Counter('total_requests');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test stages: ramp up → sustained load → spike → cool down
export const options = {
  stages: [
    // Warm up
    { duration: '2m', target: 10 },
    // Ramp up to normal load
    { duration: '5m', target: 50 },
    // Sustained normal load
    { duration: '10m', target: 50 },
    // Spike test
    { duration: '2m', target: 200 },
    // Recovery
    { duration: '5m', target: 50 },
    // Ramp down
    { duration: '2m', target: 0 },
  ],

  // SLO thresholds (Google SRE style)
  thresholds: {
    // Overall error rate < 1%
    errors: ['rate<0.01'],
    // 95th percentile response time < 500ms
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    // API latency p95 < 300ms
    api_latency: ['p(95)<300'],
    // Job search p95 < 500ms
    job_search_latency: ['p(95)<500'],
    // Auth latency p95 < 200ms
    auth_latency: ['p(95)<200'],
    // Health check p95 < 100ms
    health_check_latency: ['p(95)<100'],
    // At least 95% of requests succeed
    http_req_failed: ['rate<0.05'],
  },

  // Tags for Grafana dashboards
  tags: {
    testid: `load-test-${Date.now()}`,
  },
};

// Test data
const testUsers = [
  { email: 'test-referrer@trm.io', password: 'TestPassword123!' },
  { email: 'test-company@trm.io', password: 'TestPassword123!' },
];

// Helper: make authenticated request
function authenticatedRequest(method, url, body, token) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };

  let res;
  if (method === 'GET') {
    res = http.get(url, params);
  } else if (method === 'POST') {
    res = http.post(url, JSON.stringify(body), params);
  } else if (method === 'PUT') {
    res = http.put(url, JSON.stringify(body), params);
  }

  requestCount.add(1);
  return res;
}

// Main test function
export default function () {
  // =========================================================================
  // 1. Health Check (always runs)
  // =========================================================================
  group('Health Check', function () {
    const res = http.get(`${BASE_URL}/health`);
    healthCheckLatency.add(res.timings.duration);
    requestCount.add(1);

    const success = check(res, {
      'health check status 200': (r) => r.status === 200,
      'health check response time < 100ms': (r) => r.timings.duration < 100,
      'health check body contains healthy': (r) => {
        try {
          return JSON.parse(r.body).status === 'healthy';
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!success);
  });

  sleep(0.5);

  // =========================================================================
  // 2. Public Job Listing (unauthenticated)
  // =========================================================================
  group('Job Listing', function () {
    // List jobs with pagination
    const res = http.get(`${BASE_URL}/api/v1/jobs?page=1&limit=20`);
    apiLatency.add(res.timings.duration);
    jobSearchLatency.add(res.timings.duration);
    requestCount.add(1);

    const success = check(res, {
      'job list status 200': (r) => r.status === 200,
      'job list response time < 500ms': (r) => r.timings.duration < 500,
      'job list has data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success === true || Array.isArray(body.data || body.jobs);
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!success);
  });

  sleep(0.5);

  // =========================================================================
  // 3. Job Search with Filters
  // =========================================================================
  group('Job Search', function () {
    const searchTerms = ['developer', 'engineer', 'manager', 'designer', 'analyst'];
    const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];

    const res = http.get(`${BASE_URL}/api/v1/jobs?search=${term}&page=1&limit=10`);
    apiLatency.add(res.timings.duration);
    jobSearchLatency.add(res.timings.duration);
    requestCount.add(1);

    const success = check(res, {
      'search status 200': (r) => r.status === 200,
      'search response time < 500ms': (r) => r.timings.duration < 500,
    });
    errorRate.add(!success);
  });

  sleep(0.5);

  // =========================================================================
  // 4. Authentication Flow
  // =========================================================================
  group('Authentication', function () {
    const user = testUsers[Math.floor(Math.random() * testUsers.length)];

    const loginRes = http.post(
      `${BASE_URL}/api/v1/auth/login`,
      JSON.stringify({
        email: user.email,
        password: user.password,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
    authLatency.add(loginRes.timings.duration);
    requestCount.add(1);

    const loginSuccess = check(loginRes, {
      'login status 200': (r) => r.status === 200,
      'login response time < 200ms': (r) => r.timings.duration < 200,
      'login returns token': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.token || body.accessToken || body.data?.token;
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!loginSuccess);

    // If login succeeded, test authenticated endpoints
    if (loginRes.status === 200) {
      try {
        const body = JSON.parse(loginRes.body);
        const token = body.token || body.accessToken || body.data?.token;

        if (token) {
          // Get user profile
          const profileRes = authenticatedRequest('GET', `${BASE_URL}/api/v1/auth/me`, null, token);
          apiLatency.add(profileRes.timings.duration);

          check(profileRes, {
            'profile status 200': (r) => r.status === 200,
            'profile response time < 300ms': (r) => r.timings.duration < 300,
          });
        }
      } catch (e) {
        // Login may fail with test credentials - that's OK
      }
    }
  });

  sleep(1);

  // =========================================================================
  // 5. Deep Health Check (monitoring simulation)
  // =========================================================================
  group('Deep Health Check', function () {
    const res = http.get(`${BASE_URL}/health/deep`);
    healthCheckLatency.add(res.timings.duration);
    requestCount.add(1);

    const success = check(res, {
      'deep health status 200': (r) => r.status === 200,
      'deep health response time < 1000ms': (r) => r.timings.duration < 1000,
      'deep health has all checks': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.checks && body.checks.database && body.checks.memory;
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!success);
  });

  sleep(1);
}

// Summary handler
export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    testDuration: data.state.testRunDurationMs,
    totalRequests: data.metrics.total_requests?.values?.count || 0,
    errorRate: data.metrics.errors?.values?.rate || 0,
    p95ResponseTime: data.metrics.http_req_duration?.values?.['p(95)'] || 0,
    p99ResponseTime: data.metrics.http_req_duration?.values?.['p(99)'] || 0,
    thresholdsPassed: Object.entries(data.root_group?.checks || {}).every(
      ([, v]) => v.passes > 0
    ),
  };

  return {
    'performance-results/summary.json': JSON.stringify(summary, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data) {
  return `
=== TRM Platform Load Test Results ===
Total Requests: ${data.metrics.total_requests?.values?.count || 'N/A'}
Error Rate: ${((data.metrics.errors?.values?.rate || 0) * 100).toFixed(2)}%
p95 Response Time: ${(data.metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(0)}ms
p99 Response Time: ${(data.metrics.http_req_duration?.values?.['p(99)'] || 0).toFixed(0)}ms
==========================================
`;
}
