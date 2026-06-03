```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

// Custom metric for failed checks
const errorCounter = new Counter('errors');

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Warm-up: 20 VUs for 30 seconds
    { duration: '1m', target: 50 },  // Load: 50 VUs for 1 minute
    { duration: '30s', target: 0 },  // Cool-down: ramp down to 0 VUs in 30 seconds
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% HTTP request failures
    errors: ['count<10'],             // Less than 10 total errors across all checks
  },
  ext: {
    loadimpact: {
      projectID: 123456, // Replace with your k6 Cloud project ID
      name: 'Payment Processing API Load Test',
    },
  },
};

const BASE_URL = 'http://localhost:5000/api/v1'; // Adjust if running in Docker network
const ADMIN_EMAIL = 'admin@test.com'; // Use a test user for load testing
const ADMIN_PASSWORD = 'testpassword';

// Variable to store token for subsequent requests
let AUTH_TOKEN = null;

// Function to log in and get a new token
function login() {
  const loginRes = http.post(`${BASE_URL}/auth/login`,
    JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(loginRes, {
    'login successful': (resp) => resp.status === 200 && resp.json().token !== undefined,
  });
  if (loginRes.status !== 200) {
    errorCounter.add(1);
    console.error(`Login failed: ${loginRes.status} ${loginRes.body}`);
    return null;
  }
  return loginRes.json().token;
}

export default function () {
  // Only login once per VU for typical API tests
  if (__VU === 1 && AUTH_TOKEN === null) {
    AUTH_TOKEN = login();
    if (!AUTH_TOKEN) {
      sleep(10); // Wait before retrying login on next iteration
      return;
    }
  }

  // Define headers for authenticated requests
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  };

  // --- Test Case 1: Fetch all transactions (as admin) ---
  let getTransactionsRes = http.get(`${BASE_URL}/transactions`, params);
  check(getTransactionsRes, {
    'GET /transactions status is 200': (r) => r.status === 200,
    'GET /transactions has transactions': (r) => r.json().data.transactions.length > 0,
  }) || errorCounter.add(1);
  sleep(1);

  // --- Test Case 2: Create a new transaction (simulated) ---
  const createTxnPayload = {
    amount: (Math.random() * 100).toFixed(2), // Random amount
    currency: 'USD',
    description: 'Load test payment',
    merchantId: 'a_valid_merchant_id_from_db_seed', // Replace with a valid ID from your seed data
    cardHolderName: 'K6 User',
    cardNumber: '4242424242420000', // Use a mock card that succeeds
    expiryMonth: 12,
    expiryYear: 2025,
    cvv: '123',
  };
  let createTxnRes = http.post(`${BASE_URL}/transactions`, JSON.stringify(createTxnPayload), params);
  check(createTxnRes, {
    'POST /transactions status is 201': (r) => r.status === 201,
    'POST /transactions returns transaction ID': (r) => r.json().data.transaction.id !== undefined,
  }) || errorCounter.add(1);
  sleep(1);

  // You can add more test cases here, e.g.:
  // - Get a specific transaction
  // - (Less frequent) Refund a transaction
  // - User registration (less frequent for load testing, more for soak)

  sleep(Math.random() * 3); // Simulate random user think time
}
```