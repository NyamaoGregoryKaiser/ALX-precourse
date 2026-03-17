```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// Configuration for the performance test
export const options = {
  // A moderate load profile to simulate a small number of concurrent users
  scenarios: {
    smoke_test: {
      executor: 'constant-vus',
      vus: 5, // 5 virtual users
      duration: '30s', // for 30 seconds
      tags: { scenario: 'smoke' },
      exec: 'testProductEndpoints', // Function to execute
    },
    load_test: {
      executor: 'ramping-vus', // Gradually increase users
      startVUs: 0,
      stages: [
        { duration: '1m', target: 20 }, // Ramp up to 20 VUs over 1 minute
        { duration: '2m', target: 20 }, // Stay at 20 VUs for 2 minutes
        { duration: '1m', target: 0 },  // Ramp down to 0 VUs over 1 minute
      ],
      tags: { scenario: 'load' },
      exec: 'testProductEndpoints', // Function to execute
    },
    stress_test: {
      executor: 'ramping-vus', // More aggressive ramp-up
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 }, // Ramp up to 50 VUs
        { duration: '2m', target: 80 }, // Ramp up further to 80 VUs (stress point)
        { duration: '1m', target: 0 },  // Ramp down
      ],
      tags: { scenario: 'stress' },
      exec: 'testProductEndpoints', // Function to execute
    },
  },
  thresholds: {
    // Global HTTP request duration should be below 200ms for 95% of requests
    'http_req_duration': ['p(95)<200'],
    // 99% of checks should pass
    'checks': ['rate>0.99'],
    // No more than 1% HTTP errors (4xx, 5xx)
    'http_req_failed': ['rate<0.01'],
  },
};

// Base URL for the API
const BASE_URL = 'http://localhost:5000/api/v1'; // Adjust if your backend is on a different host/port

// Prepare data outside the `test` function using SharedArray for efficiency
// This avoids re-reading data for every VU or iteration
const productsData = new SharedArray('products', function () {
  // In a real scenario, you would fetch actual product IDs from a running system
  // or use a predefined list. For simplicity, using mock IDs.
  return [
    "1a2b3c4d-5e6f-7890-abcd-ef1234567890", // Example UUID, replace with actual product IDs from your DB
    "0f9e8d7c-6b5a-4321-fedc-ba9876543210",
    "a1b2c3d4-e5f6-7890-1234-567890abcdef"
  ];
});

// Main test function that each virtual user will execute
export function testProductEndpoints() {
  // Test: Get all products (public, cached endpoint)
  let res = http.get(`${BASE_URL}/products`);
  check(res, {
    'GET /products status is 200': (r) => r.status === 200,
    'GET /products has products': (r) => r.json('data.products') && r.json('data.products').length > 0,
  });
  sleep(0.5); // Simulate user thinking time

  // Test: Get a single product by ID (public, cached endpoint)
  if (productsData.length > 0) {
    const randomProduct = productsData[Math.floor(Math.random() * productsData.length)];
    res = http.get(`${BASE_URL}/products/${randomProduct}`);
    check(res, {
      'GET /products/:id status is 200': (r) => r.status === 200,
      'GET /products/:id has data': (r) => r.json('data') !== null,
    });
    sleep(0.5);
  }

  // To test authenticated endpoints, you would need to:
  // 1. Log in a user to get an access token.
  // 2. Pass this token in the Authorization header for subsequent requests.
  // This can be complex for many VUs, often involving separate login scripts
  // or pre-generated tokens.

  // Example of an authenticated GET request (conceptual - requires valid token)
  // const authToken = 'YOUR_VALID_JWT_TOKEN'; // In a real test, dynamically get this
  // if (authToken) {
  //   const authHeaders = {
  //     headers: {
  //       Authorization: `Bearer ${authToken}`,
  //     },
  //   };
  //   res = http.get(`${BASE_URL}/users`, authHeaders);
  //   check(res, {
  //     'GET /users (authenticated) status is 200': (r) => r.status === 200,
  //   });
  //   sleep(0.5);
  // } else {
  //   console.warn('Skipping authenticated tests: No JWT token provided.');
  // }
}

// You can add more functions for different test scenarios or user flows
// export function authenticatedUserFlow() { /* ... */ }
```