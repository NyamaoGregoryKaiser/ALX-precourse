```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// Load credentials from a shared array (e.g., pre-registered users)
const users = new SharedArray('users', function () {
  return JSON.parse(open('../../users.json')).users; // assuming users.json has { "users": [...] }
});

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp up to 50 VUs over 30 seconds
    { duration: '1m', target: 50 },   // Stay at 50 VUs for 1 minute
    { duration: '30s', target: 0 },   // Ramp down to 0 VUs over 30 seconds
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should complete within 500ms
    http_req_failed: ['rate<0.01'],   // Error rate should be less than 1%
  },
};

export default function () {
  const user = users[__VU % users.length]; // Each virtual user gets a different user
  const BASE_URL = 'http://localhost:3000/v1'; // Replace with your actual API URL

  // 1. Login (once per VU or use a setup function for token reuse)
  const loginRes = http.post(`${BASE_URL}/auth/login`,
    JSON.stringify({ email: user.email, password: user.password }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'Login' }
    }
  );
  check(loginRes, { 'Login successful': (r) => r.status === 200 });
  const authToken = loginRes.json('tokens.access.token');

  if (!authToken) {
    console.error(`VU ${__VU}: Failed to get auth token for user ${user.email}`);
    return; // Stop if login fails
  }

  // 2. Get user accounts
  const accountsRes = http.get(`${BASE_URL}/accounts`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    tags: { name: 'GetAccounts' }
  });
  check(accountsRes, { 'Get accounts successful': (r) => r.status === 200 });
  const accounts = accountsRes.json();
  const sourceAccountId = accounts && accounts.length > 0 ? accounts[0].id : null;
  const destinationAccountId = accounts && accounts.length > 1 ? accounts[1].id : accounts[0].id; // For simplicity

  if (!sourceAccountId || !destinationAccountId) {
    console.error(`VU ${__VU}: User ${user.email} has no accounts for transactions.`);
    return;
  }

  // 3. Initiate a transaction
  const transactionPayload = {
    sourceAccountId: sourceAccountId,
    destinationAccountId: destinationAccountId,
    amount: Math.floor(Math.random() * 100) + 1, // Random amount between 1 and 100
    currency: 'USD',
    description: `K6 Load Test Payment ${__VU}-${__ITER}`,
  };
  const transactionRes = http.post(`${BASE_URL}/transactions`,
    JSON.stringify(transactionPayload),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      tags: { name: 'InitiateTransaction' }
    }
  );
  check(transactionRes, { 'Initiate transaction successful': (r) => r.status === 202 });

  sleep(1); // Think time
}
```