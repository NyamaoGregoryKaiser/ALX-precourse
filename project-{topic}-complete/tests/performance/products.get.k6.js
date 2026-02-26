import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

// Environment variable for API_BASE_URL (e.g., http://localhost:3000/api/v1)
const API_BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000/api/v1';

// Custom metric to count failed checks
const errorCounter = new Counter('errors');

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Warm-up stage: ramp up to 20 users over 30s
    { duration: '1m', target: 50 },  // Steady-state load: 50 concurrent users for 1 minute
    { duration: '30s', target: 0 },  // Ramp-down stage: ramp down to 0 users over 30s
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'], // http errors should be less than 1%
    http_req_duration: ['p(95)<200'], // 95% of requests should be below 200ms
    errors: ['count<10'], // Total errors from custom check should be less than 10
  },
  vus_max: 100, // Maximum virtual users to prevent overwhelming the test client
};

export default function () {
  const url = `${API_BASE_URL}/products`;
  const res = http.get(url);

  // Check if the request was successful and response body is an array
  const checkResult = check(res, {
    'status is 200': (r) => r.status === 200,
    'response body is array': (r) => Array.isArray(r.json()),
  });

  // If any check fails, increment our custom error counter
  if (!checkResult) {
    errorCounter.add(1);
  }

  // Simulate user reading data before making another request
  sleep(1);
}

// To run this test:
// 1. Ensure k6 is installed: `brew install k6` or `choco install k6`
// 2. Set the API_BASE_URL environment variable if different: `API_BASE_URL=http://your-server-ip:3000/api/v1 k6 run products.get.k6.js`
// 3. Or just `k6 run products.get.k6.js` if running locally with default port.