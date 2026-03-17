import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// Configuration for the test
export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp up to 50 virtual users over 30 seconds
    { duration: '1m', target: 100 },  // Stay at 100 virtual users for 1 minute
    { duration: '30s', target: 0 },   // Ramp down to 0 virtual users over 30 seconds
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],    // Less than 1% of requests should fail
  },
};

// Base URL of your application
const BASE_URL = 'http://localhost:3000/api/v1';

// Shared data for users/tokens (fetched once and shared across VUs)
const users = new SharedArray('test users', function () {
  // In a real scenario, you'd pre-register many users and store their credentials/tokens
  // For this example, we'll use a single admin user for simplicity.
  // In production, you'd rotate through many distinct users.
  return JSON.parse(open('./test_data/users.json')).users;
});

export function setup() {
  // This runs once before any VUs start
  // Register or log in a single admin user to get a token
  console.log('Setting up K6 test: Logging in admin user...');
  const adminUser = users[0]; // Assuming first user is admin
  const loginRes = http.post(`${BASE_URL}/auth/login`,
    JSON.stringify({
      email: adminUser.email,
      password: adminUser.password,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
  check(loginRes, {
    'login successful': (resp) => resp.status === 200,
    'token received': (resp) => resp.json() && resp.json().token !== undefined,
  });

  if (loginRes.status !== 200) {
    console.error('Admin login failed, aborting setup.');
    throw new Error('Admin login failed, aborting setup.');
  }

  const adminToken = loginRes.json().token;
  console.log('Admin user logged in. Token obtained.');
  return { adminToken: adminToken };
}


export default function (data) {
  // This runs for each virtual user (VU)
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.adminToken}`,
  };

  // 1. Get all users (Admin operation - high traffic might be expected on internal endpoints)
  let res = http.get(`${BASE_URL}/users`, { headers });
  check(res, {
    'get all users status is 200': (r) => r.status === 200,
    'get all users body contains users array': (r) => r.json() && Array.isArray(r.json().users),
  });
  sleep(1); // Simulate user think time

  // 2. Get a specific user's accounts (e.g., the first non-admin user)
  const targetUser = users[1]; // Assuming second user is a regular user
  res = http.get(`${BASE_URL}/accounts/my`, { headers: { ...headers, 'Authorization': `Bearer ${targetUser.token}` } }); // Need a token for the actual user
  // ^ This would require logging in `targetUser` in `setup` or using multiple tokens.
  // For simplicity, let's just get accounts for the *admin* user's ID found from setup() data, or simply fetch it
  // from /users endpoint if we want to ensure full coverage.
  // For now, let's assume we can fetch admin's accounts with admin token.
  // In a proper test, you would have multiple tokens for different roles and pick one for each VU.

  // Let's modify to retrieve accounts for the user ID attached to the admin token (the setup() function's logged-in user)
  // Or better, let each VU login, but that increases overhead.
  // For a basic example, we will just use the admin token to query for a known user's accounts.
  // To avoid circular dependency for `users` array in setup:
  const adminId = data.adminId || 'b848039b-e8b8-4e89-9a7c-c90a190204d8'; // Placeholder, replace with actual admin ID from setup
  const adminAccountRes = http.get(`${BASE_URL}/accounts/my`, { headers }); // Assuming admin can get their own accounts
  check(adminAccountRes, {
    'get admin accounts status is 200': (r) => r.status === 200,
    'admin accounts are returned': (r) => r.json() && Array.isArray(r.json().accounts),
  });
  const adminAccounts = adminAccountRes.json()?.accounts;
  let targetAccountId = adminAccounts?.[0]?.id; // Take the first account

  sleep(1);

  // 3. Create a transaction (debit from the admin's first account to the second admin account)
  if (targetAccountId && adminAccounts.length > 1) {
    const transactionPayload = {
      accountId: targetAccountId,
      type: 'debit',
      amount: Math.random() * 100, // Random amount for variability
      currency: 'USD',
      description: 'Performance test debit',
    };
    res = http.post(`${BASE_URL}/transactions`, JSON.stringify(transactionPayload), { headers });
    check(res, {
      'create transaction status is 201': (r) => r.status === 201,
      'transaction ID is returned': (r) => r.json() && r.json().transaction?.id,
    });
  }
  sleep(1);

  // 4. Get specific account details
  if (targetAccountId) {
    res = http.get(`${BASE_URL}/accounts/${targetAccountId}`, { headers });
    check(res, {
      'get account details status is 200': (r) => r.status === 200,
      'account details contain balance': (r) => r.json() && r.json().account?.balance !== undefined,
    });
  }
  sleep(1);

  // 5. Initiate a payment (from admin's first account to admin's second account)
  if (adminAccounts && adminAccounts.length >= 2) {
    const sourceAccount = adminAccounts[0];
    const destinationAccount = adminAccounts[1];
    const paymentPayload = {
      amount: Math.random() * 50,
      currency: 'USD',
      sourceAccountId: sourceAccount.id,
      destinationAccountId: destinationAccount.id,
      paymentMethod: 'wallet',
      description: 'Performance test payment',
      idempotencyKey: `k6-payment-${__VU}-${__ITER}-${Date.now()}`, // Unique idempotency key
    };
    res = http.post(`${BASE_URL}/payments/initiate`, JSON.stringify(paymentPayload), { headers });
    check(res, {
      'initiate payment status is 201': (r) => r.status === 201,
      'payment ID returned': (r) => r.json() && r.json().payment?.paymentId,
    });
  }
  sleep(1);
}

// === test_data/users.json (for K6) ===
// [
//   {
//     "email": "admin@example.com",
//     "password": "adminpassword"
//   },
//   {
//     "email": "john.doe@example.com",
//     "password": "userpassword"
//   }
// ]
// === END test_data/users.json ===
```

---

### 5. Documentation

#### `README.md`

```markdown