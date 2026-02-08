/**
 * Prometheus Metrics Middleware
 * Collects HTTP request metrics for Prometheus scraping
 * Following Google SRE Four Golden Signals: Latency, Traffic, Errors, Saturation
 */

// In-memory metrics store (lightweight, no external dependency)
const metrics = {
  httpRequestsTotal: {},
  httpRequestDuration: [],
  httpRequestsInFlight: 0,
  processStartTime: Date.now() / 1000,
  nodeVersion: process.version,
};

// Histogram buckets (in seconds)
const DURATION_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

/**
 * Record HTTP request metrics
 */
function recordRequest(method, route, statusCode, duration) {
  // Increment request counter
  const key = `${method}:${route}:${statusCode}`;
  metrics.httpRequestsTotal[key] = (metrics.httpRequestsTotal[key] || 0) + 1;

  // Record duration for histogram
  metrics.httpRequestDuration.push({
    method,
    route,
    statusCode,
    duration,
    timestamp: Date.now(),
  });

  // Keep only last 10000 entries to prevent memory leak
  if (metrics.httpRequestDuration.length > 10000) {
    metrics.httpRequestDuration = metrics.httpRequestDuration.slice(-5000);
  }
}

/**
 * Express middleware to collect metrics
 */
function metricsMiddleware() {
  return (req, res, next) => {
    const startTime = process.hrtime.bigint();
    metrics.httpRequestsInFlight++;

    // Capture response finish
    const originalEnd = res.end;
    res.end = function (...args) {
      metrics.httpRequestsInFlight--;

      try {
        const endTime = process.hrtime.bigint();
        const durationNs = Number(endTime - startTime);
        const durationSeconds = durationNs / 1e9;

        // Normalize route to prevent high cardinality
        const route = normalizeRoute(req.route?.path || req.path || req.url || req.originalUrl);

        recordRequest(req.method, route, res.statusCode, durationSeconds);
      } catch (error) {
        console.warn('[Metrics] Failed to record request metrics:', error?.message || error);
      }

      originalEnd.apply(this, args);
    };

    next();
  };
}

/**
 * Normalize route to prevent high cardinality metrics
 * e.g., /api/v1/jobs/507f1f77bcf86cd799439011 → /api/v1/jobs/:id
 */
function normalizeRoute(pathValue) {
  if (!pathValue) {
    return 'unknown';
  }
  const path = typeof pathValue === 'string' ? pathValue : String(pathValue);
  return path
    .replace(/\/[0-9a-fA-F]{24}/g, '/:id') // MongoDB ObjectIDs
    .replace(/\/\d+/g, '/:id') // Numeric IDs
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '/:uuid') // UUIDs
    .replace(/\?.*$/, ''); // Remove query strings
}

/**
 * Calculate histogram buckets
 */
function calculateHistogram(durations, buckets) {
  const result = {};
  for (const bucket of buckets) {
    result[bucket] = durations.filter((d) => d <= bucket).length;
  }
  result['+Inf'] = durations.length;
  return result;
}

/**
 * Generate Prometheus-format metrics output
 */
function generateMetrics() {
  const lines = [];
  const now = Date.now();

  // =========================================================================
  // 1. HTTP Request Total (Counter)
  // =========================================================================
  lines.push('# HELP http_requests_total Total number of HTTP requests');
  lines.push('# TYPE http_requests_total counter');
  for (const [key, count] of Object.entries(metrics.httpRequestsTotal)) {
    const [method, route, status] = key.split(':');
    lines.push(
      `http_requests_total{method="${method}",route="${route}",status="${status}"} ${count}`
    );
  }

  // =========================================================================
  // 2. HTTP Request Duration (Histogram)
  // =========================================================================
  lines.push('');
  lines.push('# HELP http_request_duration_seconds HTTP request duration in seconds');
  lines.push('# TYPE http_request_duration_seconds histogram');

  // Group durations by method+route
  const durationsByRoute = {};
  for (const entry of metrics.httpRequestDuration) {
    const key = `${entry.method}:${entry.route}`;
    if (!durationsByRoute[key]) durationsByRoute[key] = [];
    durationsByRoute[key].push(entry.duration);
  }

  for (const [key, durations] of Object.entries(durationsByRoute)) {
    const [method, route] = key.split(':');
    const histogram = calculateHistogram(durations, DURATION_BUCKETS);

    for (const [bucket, count] of Object.entries(histogram)) {
      const le = bucket === '+Inf' ? '+Inf' : bucket;
      lines.push(
        `http_request_duration_seconds_bucket{method="${method}",route="${route}",le="${le}"} ${count}`
      );
    }

    const sum = durations.reduce((a, b) => a + b, 0);
    lines.push(
      `http_request_duration_seconds_sum{method="${method}",route="${route}"} ${sum.toFixed(6)}`
    );
    lines.push(
      `http_request_duration_seconds_count{method="${method}",route="${route}"} ${durations.length}`
    );
  }

  // =========================================================================
  // 3. HTTP Requests In Flight (Gauge)
  // =========================================================================
  lines.push('');
  lines.push('# HELP http_requests_in_flight Current number of HTTP requests being processed');
  lines.push('# TYPE http_requests_in_flight gauge');
  lines.push(`http_requests_in_flight ${metrics.httpRequestsInFlight}`);

  // =========================================================================
  // 4. Process Metrics
  // =========================================================================
  const memUsage = process.memoryUsage();

  lines.push('');
  lines.push('# HELP process_resident_memory_bytes Resident memory size in bytes');
  lines.push('# TYPE process_resident_memory_bytes gauge');
  lines.push(`process_resident_memory_bytes ${memUsage.rss}`);

  lines.push('');
  lines.push('# HELP process_heap_bytes Process heap size in bytes');
  lines.push('# TYPE process_heap_bytes gauge');
  lines.push(`process_heap_bytes{type="used"} ${memUsage.heapUsed}`);
  lines.push(`process_heap_bytes{type="total"} ${memUsage.heapTotal}`);

  lines.push('');
  lines.push('# HELP process_start_time_seconds Start time of the process since unix epoch');
  lines.push('# TYPE process_start_time_seconds gauge');
  lines.push(`process_start_time_seconds ${metrics.processStartTime}`);

  lines.push('');
  lines.push('# HELP process_uptime_seconds Process uptime in seconds');
  lines.push('# TYPE process_uptime_seconds gauge');
  lines.push(`process_uptime_seconds ${process.uptime()}`);

  lines.push('');
  lines.push('# HELP nodejs_active_handles Number of active handles');
  lines.push('# TYPE nodejs_active_handles gauge');
  lines.push(`nodejs_active_handles ${process._getActiveHandles?.()?.length || 0}`);

  lines.push('');
  lines.push('# HELP nodejs_active_requests Number of active requests');
  lines.push('# TYPE nodejs_active_requests gauge');
  lines.push(`nodejs_active_requests ${process._getActiveRequests?.()?.length || 0}`);

  lines.push('');
  lines.push(`# HELP nodejs_version_info Node.js version`);
  lines.push(`# TYPE nodejs_version_info gauge`);
  lines.push(`nodejs_version_info{version="${process.version}"} 1`);

  return lines.join('\n');
}

/**
 * Metrics endpoint handler
 */
function metricsEndpoint() {
  return (req, res) => {
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(generateMetrics());
  };
}

module.exports = {
  metricsMiddleware,
  metricsEndpoint,
  generateMetrics,
  recordRequest,
};
