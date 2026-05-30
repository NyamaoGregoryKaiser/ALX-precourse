import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// Load test configuration
export let options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp up to 50 concurrent users over 30 seconds
    { duration: '1m', target: 50 },   // Stay at 50 concurrent users for 1 minute
    { duration: '30s', target: 0 },   // Ramp down to 0 users over 30 seconds
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should complete within 500ms
    http_req_failed: ['rate<0.01'],    // Less than 1% of requests should fail
  },
};

// Data for users (e.g., pre-registered users with tokens)
const users = new SharedArray('users', function () {
  // In a real scenario, you'd load actual user credentials or pre-generated tokens
  // For simplicity, we'll hardcode a dummy token assuming 'user1' is logged in
  return [
    { email: 'testuser@example.com', token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Im1vY2stdXVpZC0xMjM0LWFmZ2giLCJlbWFpbCI6InRlc3R1c2VyQGV4YW1wbGUuY29tIiwicm9sZSI6InVzZXIiLCJpYXQiOjE2NzgwMDQ0MDAsImV4cCI6MTY3ODA5MDgwMH0.SomeDummyTokenForTesting' },
    // Add more users for realistic load
  ];
});

export default function () {
  const user = users[__VU % users.length]; // Pick a user for the current virtual user
  const API_BASE_URL = __ENV.API_BASE_URL || 'http://localhost:5000/api';

  // 1. Get user accounts
  let res = http.get(`${API_BASE_URL}/accounts`, {
    headers: {
      'Authorization': `Bearer ${user.token}`,
      'Content-Type': 'application/json',
    },
  });
  check(res, { 'get accounts status is 200': (r) => r.status === 200 });
  const accounts = res.json().accounts;
  let accountId = null;
  if (accounts && accounts.length > 0) {
    accountId = accounts[0].id;
  } else {
    console.error('No accounts found for user, skipping transaction tests.');
    return;
  }

  // Sleep for a short random duration to simulate user think time
  sleep(Math.random() * 2);

  // 2. Initiate a debit transaction (assuming an external payment)
  if (accountId) {
    res = http.post(
      `${API_BASE_URL}/transactions/initiate`,
      JSON.stringify({
        accountId: accountId,
        amount: Math.floor(Math.random() * 5000) + 100, // Random amount between 100 and 5100
        currency: 'NGN',
        type: 'debit',
        description: 'Load test payment',
        paymentMethodId: 'mock_card_token_loadtest', // This would be tokenized in real app
      }),
      {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    check(res, { 'initiate debit status is 201': (r) => r.status === 201 });
  }

  sleep(Math.random() * 2);

  // 3. Get transactions for an account
  if (accountId) {
    res = http.get(`${API_BASE_URL}/transactions/account/${accountId}`, {
      headers: {
        'Authorization': `Bearer ${user.token}`,
        'Content-Type': 'application/json',
      },
    });
    check(res, { 'get transactions status is 200': (r) => r.status === 200 });
  }

  sleep(Math.random() * 1);
}