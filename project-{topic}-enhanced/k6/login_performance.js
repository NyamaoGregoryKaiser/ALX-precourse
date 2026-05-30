import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Simulate 20 users for 30 seconds (warm-up)
    { duration: '1m', target: 50 },  // Ramp up to 50 users over 1 minute
    { duration: '30s', target: 20 }, // Ramp down to 20 users for 30 seconds
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'], // 95% of requests should complete within 500ms
    'http_req_failed': ['rate<0.01'],    // Error rate should be less than 1%
  },
};

export default function () {
  const url = 'http://localhost:5000/v1/auth/login';
  const payload = JSON.stringify({
    email: 'testadmin@example.com', // Use a dedicated test user
    password: 'password123',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(url, payload, params);

  check(res, {
    'is status 200': (r) => r.status === 200,
    'has access token': (r) => r.json() && r.json().tokens && r.json().tokens.access && r.json().tokens.access.token !== '',
  });

  sleep(1); // Simulate user think time between requests
}